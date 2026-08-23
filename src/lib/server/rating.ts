// ============================================================
// rating.ts - שכבת הנתונים של הדירוג הציבורי (Strapi items)
//
// pr_official: label=שם, description=רקע, extra_fields={group, position, org, approved, suggested_by}
// pr_review:   label=<official documentId>, description=טקסט, user_id=מדרג,
//              extra_fields={scores, reviewer_name, anonymous, helpful_by}
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import { CRITERIA, sanitizeScores, type Scores } from '$lib/rating/criteria';
import { overallOf, rankOfficials } from '$lib/rating/aggregate';
import {
    COMMENT_CATEGORY,
    INQUIRY_CATEGORY,
    OFFICIAL_CATEGORY,
    PROPOSAL_CATEGORY,
    REPORT_CATEGORY,
    REVIEW_CATEGORY,
    SURVEY_CATEGORY,
    SYNC_CATEGORY,
    groupByKey,
    promiseStatusOf,
    proposalStatusOf,
    type CivicProposal,
    type ContentReport,
    type GroupKey,
    type KnessetRecord,
    type Official,
    type OfficialComment,
    type OfficialInquiry,
    type OfficialPromise,
    type ProposalStatus,
    type ProposalUpdate,
    type RatedOfficial,
    type ReportReason,
    type Review,
    type ShakufData,
    type SurveyResults,
} from '$lib/rating/types';

// אוסף מבודד לאתר הדירוג הציבורי.
// בעבר האתר כתב לאוסף /api/items המשותף עם "קהילה בשכונה" — מה שניפח שם את
// מונה "פרטים במפה" ל-183. הדירוג הוא מוצר נפרד ולכן קיבל collection משלו.
// ההעברה בוצעה ע"י scripts/migrate-to-pr-items.mjs
const ITEMS = '/api/pr-items';

interface StrapiItem {
    id: number;
    documentId: string;
    label: string;
    category: string;
    description: string | null;
    user_id: string | null;
    extra_fields: Record<string, unknown> | null;
    status1: string | null;
    createdAt: string;
    updatedAt: string;
}

// ============================================================
// ---- Cache (SWR פשוט בזיכרון — Vercel serverless: פר-אינסטנס) ----
// ============================================================

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
    const data = await fetcher();
    cache.set(key, { at: Date.now(), data });
    return data;
}

/** כל כתיבה חייבת לנקות את הקאש כדי שהמשתמש יראה את הדירוג שלו מיד */
export function invalidateRating(): void {
    cache.clear();
}

// ============================================================
// ---- Mappers ----
// ============================================================

function ef(item: StrapiItem): Record<string, unknown> {
    return item.extra_fields && typeof item.extra_fields === 'object' ? item.extra_fields : {};
}

/** מחרוזת בטוחה מ-extra_fields (כל טיפוס אחר → ריק) */
function str(v: unknown): string {
    return typeof v === 'string' ? v : '';
}

/** מערך מחרוזות בטוח מ-extra_fields (מסנן איברים שאינם מחרוזת) */
function strArr(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [];
}

function parsePromises(v: unknown): OfficialPromise[] {
    if (!Array.isArray(v)) return [];
    return v
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
        .map((p) => ({ text: str(p.text).trim(), status: promiseStatusOf(str(p.status)) }))
        .filter((p) => p.text);
}

function parseUpdates(v: unknown): ProposalUpdate[] {
    if (!Array.isArray(v)) return [];
    return v
        .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object')
        .map((u) => ({ date: str(u.date), text: str(u.text).trim() }))
        .filter((u) => u.text);
}

function num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function parseBills(v: unknown, limit: number) {
    if (!Array.isArray(v)) return [];
    return v
        .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object')
        .map((b) => ({ name: str(b.name).trim(), status: str(b.status).trim(), date: str(b.date) }))
        .filter((b) => b.name)
        .slice(0, limit);
}

function parseQueries(v: unknown, limit: number) {
    if (!Array.isArray(v)) return [];
    return v
        .filter((q): q is Record<string, unknown> => Boolean(q) && typeof q === 'object')
        .map((q) => ({ name: str(q.name).trim(), submitted: str(q.submitted), replied: str(q.replied) }))
        .filter((q) => q.name)
        .slice(0, limit);
}

/** רזומת הכנסת מ-extra_fields — בלי person_id הנתון חסר משמעות ולא מוצג */
function parseKnessetRecord(v: unknown): KnessetRecord | null {
    if (!v || typeof v !== 'object') return null;
    const r = v as Record<string, unknown>;
    const personId = num(r.person_id);
    if (!personId) return null;
    const bills = (r.bills && typeof r.bills === 'object' ? r.bills : {}) as Record<string, unknown>;
    const mq = r.ministry_queries;
    const mqObj = (mq && typeof mq === 'object' ? mq : null) as Record<string, unknown> | null;
    return {
        person_id: personId,
        knesset_num: num(r.knesset_num),
        knessets: Array.isArray(r.knessets) ? r.knessets.map(num).filter(Boolean) : [],
        roles: Array.isArray(r.roles)
            ? r.roles
                  .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
                  .map((x) => ({ title: str(x.title).trim(), from: str(x.from), to: str(x.to) || null }))
                  .filter((x) => x.title)
            : [],
        bills: {
            lead: num(bills.lead),
            cosigned: num(bills.cosigned),
            passed: num(bills.passed),
            in_progress: num(bills.in_progress),
            stopped: num(bills.stopped),
            merged: num(bills.merged),
        },
        queries: num(r.queries),
        agenda: num(r.agenda),
        ministry_queries:
            mqObj && str(mqObj.ministry).trim()
                ? {
                      ministry: str(mqObj.ministry).trim(),
                      total: num(mqObj.total),
                      answered: num(mqObj.answered),
                      late: num(mqObj.late),
                      recent: parseQueries(mqObj.recent, 8),
                  }
                : null,
        email: str(r.email).trim(),
        passed_bills: parseBills(r.passed_bills, 60),
        active_bills: parseBills(r.active_bills, 20),
        recent_queries: parseQueries(r.recent_queries, 20),
        recent_agenda: strArr(r.recent_agenda).slice(0, 12),
        synced_at: str(r.synced_at),
    };
}

/** נתוני שקוף מ-extra_fields — בלי שלושת שדות החובה הנתון לא מוצג */
function parseShakuf(v: unknown): ShakufData | null {
    if (!v || typeof v !== 'object') return null;
    const s = v as Record<string, unknown>;
    const ministry = str(s.ministry).trim();
    const summary = str(s.summary).trim();
    const report_url = str(s.report_url).trim();
    if (!ministry || !summary || !report_url.startsWith('https://')) return null;
    return { ministry, summary, report_url, source_date: str(s.source_date), synced_at: str(s.synced_at) };
}

function mapOfficial(item: StrapiItem): Official {
    const x = ef(item);
    const contacts = (x.contacts && typeof x.contacts === 'object' ? x.contacts : {}) as Record<
        string,
        unknown
    >;
    const attendance = Number(x.attendance_score);
    return {
        id: item.documentId,
        name: item.label ?? '',
        group: (groupByKey(String(x.group)) ? (x.group as GroupKey) : 'public_servants'),
        position: typeof x.position === 'string' ? x.position : '',
        org: typeof x.org === 'string' ? x.org : '',
        bio: item.description ?? '',
        image: typeof x.image === 'string' ? x.image : '',
        approved: x.approved !== false,
        suggested_by: typeof x.suggested_by === 'string' ? x.suggested_by : null,
        created_at: item.createdAt ?? '',
        contacts: {
            email: str(contacts.email),
            phone: str(contacts.phone),
            whatsapp: str(contacts.whatsapp),
            facebook: str(contacts.facebook),
            website: str(contacts.website),
        },
        verified: x.verified === true,
        platform_url: str(x.platform_url),
        annual_report_url: str(x.annual_report_url),
        promises: parsePromises(x.promises),
        specialties: strArr(x.specialties),
        attendance_score:
            Number.isFinite(attendance) && x.attendance_score !== null && x.attendance_score !== ''
                ? Math.min(100, Math.max(0, Math.round(attendance)))
                : null,
        shakuf: parseShakuf(x.shakuf),
        knesset_record: parseKnessetRecord(x.knesset_record),
    };
}

function mapReview(item: StrapiItem): Review {
    const x = ef(item);
    const scores = sanitizeScores(x.scores);
    return {
        id: item.documentId,
        official_id: item.label ?? '',
        user_id: item.user_id ?? null,
        text: item.description ?? '',
        scores,
        overall: overallOf(scores),
        reviewer_name: typeof x.reviewer_name === 'string' ? x.reviewer_name : '',
        anonymous: x.anonymous === true,
        helpful_by: Array.isArray(x.helpful_by) ? x.helpful_by.filter((v): v is string => typeof v === 'string') : [],
        created_at: item.createdAt ?? '',
        updated_at: item.updatedAt ?? item.createdAt ?? '',
    };
}

function mapComment(item: StrapiItem): OfficialComment {
    const x = ef(item);
    return {
        id: item.documentId,
        official_id: item.label ?? '',
        review_id: typeof x.review_id === 'string' ? x.review_id : '',
        user_id: item.user_id ?? null,
        text: item.description ?? '',
        commenter_name: typeof x.commenter_name === 'string' ? x.commenter_name : '',
        official_reply: x.official_reply === true,
        created_at: item.createdAt ?? '',
    };
}

function mapInquiry(item: StrapiItem): OfficialInquiry {
    const x = ef(item);
    return {
        id: item.documentId,
        official_id: item.label ?? '',
        user_id: item.user_id ?? null,
        text: item.description ?? '',
        author_name: str(x.author_name),
        anonymous: x.anonymous === true,
        joined_by: strArr(x.joined_by),
        reply_text: str(x.reply_text),
        replied_at: str(x.replied_at) || null,
        created_at: item.createdAt ?? '',
    };
}

function mapProposal(item: StrapiItem): CivicProposal {
    const x = ef(item);
    return {
        id: item.documentId,
        title: item.label ?? '',
        text: item.description ?? '',
        user_id: item.user_id ?? null,
        proposer_name: str(x.proposer_name),
        anonymous: x.anonymous === true,
        pros: strArr(x.pros),
        cons: strArr(x.cons),
        status: proposalStatusOf(str(x.status)),
        approved: x.approved !== false,
        supporters: strArr(x.supporters),
        official_ids: strArr(x.official_ids),
        updates: parseUpdates(x.updates),
        created_at: item.createdAt ?? '',
    };
}

// ============================================================
// ---- קריאה ----
// ============================================================

async function fetchByCategory(category: string): Promise<StrapiItem[]> {
    // עמוד יחיד מוגבל ל-1000 ב-Strapi — לולאת עמודים כדי שהסטטיסטיקה לא תיחתך בשקט
    const PAGE = 1000;
    const all: StrapiItem[] = [];
    for (let start = 0; ; start += PAGE) {
        const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
            'filters[category][$eq]': category,
            'filters[status1][$eq]': 'active',
            'sort': 'createdAt:desc',
            'pagination[start]': String(start),
            'pagination[limit]': String(PAGE),
        });
        const page = res.data ?? [];
        all.push(...page);
        if (page.length < PAGE) return all;
    }
}

/** כל המדורגים המאושרים */
export async function listOfficials(): Promise<Official[]> {
    return cached('officials', async () =>
        (await fetchByCategory(OFFICIAL_CATEGORY)).map(mapOfficial).filter((o) => o.approved),
    );
}

/** הצעות משתמשים שממתינות לאישור (לאדמין) */
export async function listPendingOfficials(): Promise<Official[]> {
    return (await fetchByCategory(OFFICIAL_CATEGORY)).map(mapOfficial).filter((o) => !o.approved);
}

/** כמו listOfficials אבל בלי קאש — לבדיקת כפילויות בזמן-אמת (הצעת מדורג) */
export async function listOfficialsFresh(): Promise<Official[]> {
    return (await fetchByCategory(OFFICIAL_CATEGORY)).map(mapOfficial).filter((o) => o.approved);
}

/** כל הדירוגים בפלטפורמה (תקפים בלבד — עם ציון) */
export async function listAllReviews(): Promise<Review[]> {
    return cached('reviews', async () =>
        (await fetchByCategory(REVIEW_CATEGORY)).map(mapReview).filter((r) => r.overall > 0),
    );
}

/** לוחות: כל המדורגים + סטטיסטיקה, ממוינים בדירוג הוגן */
export async function getRatedOfficials(): Promise<RatedOfficial[]> {
    const [officials, reviews] = await Promise.all([listOfficials(), listAllReviews()]);
    return rankOfficials(officials, reviews);
}

/**
 * מדורג בודד — מאושר בלבד (הצעה ממתינה אינה נגישה/ניתנת לדירוג עד אישור אדמין).
 * 404 מ-Strapi ⇒ undefined; תקלה אחרת (נפילת באקאנד) מוזרקת הלאה כדי לא להפוך ל-404 כוזב.
 */
export async function getOfficial(id: string): Promise<Official | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    if (!res.data || res.data.category !== OFFICIAL_CATEGORY || res.data.status1 !== 'active') return undefined;
    const official = mapOfficial(res.data);
    return official.approved ? official : undefined;
}

/** דירוגים של מדורג בודד — טרי (בלי קאש), חדש למעלה */
export async function getReviewsFor(officialId: string): Promise<Review[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': REVIEW_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[status1][$eq]': 'active',
        'sort': 'createdAt:desc',
        'pagination[limit]': '1000',
    });
    return (res.data ?? []).map(mapReview).filter((r) => r.overall > 0);
}

/** כל התגובות בדף מדורג — שליפה אחת (label=המדורג), ישן ראשון בתוך שרשור */
export async function getCommentsFor(officialId: string): Promise<OfficialComment[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': COMMENT_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[status1][$eq]': 'active',
        'sort': 'createdAt:asc',
        'pagination[limit]': '1000',
    });
    return (res.data ?? []).map(mapComment).filter((c) => c.review_id && c.text);
}

/**
 * user_id של חשבון הדמות המדורגת (extra_fields.official_user_id) — שרת בלבד!
 * לעולם לא נשלח לדפדפן: עלול להכיל אימייל.
 */
export async function getOfficialOwnerUserId(officialId: string): Promise<string | null> {
    try {
        const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(officialId)}`);
        if (!res.data || res.data.category !== OFFICIAL_CATEGORY) return null;
        const v = ef(res.data).official_user_id;
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    } catch {
        return null;
    }
}

// ============================================================
// ---- כתיבה ----
// ============================================================

export interface AddCommentInput {
    officialId: string;
    reviewId: string;
    userId: string;
    commenterName: string;
    text: string;
    officialReply: boolean;
}

/** תגובה על דירוג — משתמשים רשומים בלבד (נאכף ב-action) */
export async function addComment(input: AddCommentInput): Promise<void> {
    await strapiPost(ITEMS, {
        data: {
            category: COMMENT_CATEGORY,
            label: input.officialId,
            description: input.text,
            user_id: input.userId,
            extra_fields: {
                review_id: input.reviewId,
                commenter_name: input.commenterName,
                official_reply: input.officialReply,
            },
            icon: '💬',
            color: 'blue',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
}

/** תגובה בודדת — לאימות בעלות לפני מחיקה */
export async function getComment(id: string): Promise<OfficialComment | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    if (!res.data || res.data.category !== COMMENT_CATEGORY || res.data.status1 !== 'active') return undefined;
    return mapComment(res.data);
}

export interface UpsertReviewInput {
    officialId: string;
    userId: string;
    reviewerName: string;
    scores: Scores;
    text: string;
    anonymous: boolean;
}

/** דירוג אחד למשתמש למדורג: קיים → עדכון, אחרת יצירה */
export async function upsertReview(input: UpsertReviewInput): Promise<void> {
    // רק דירוג פעיל — דירוג שהוסר ע"י אדמין לא "קם לתחייה" בעדכון הבא של המשתמש
    const existing = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': REVIEW_CATEGORY,
        'filters[label][$eq]': input.officialId,
        'filters[user_id][$eq]': input.userId,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    const prev = existing.data?.[0];
    const extra = {
        scores: input.scores,
        reviewer_name: input.reviewerName,
        anonymous: input.anonymous,
        helpful_by: prev ? (ef(prev).helpful_by ?? []) : [],
    };
    if (prev) {
        await strapiPut(`${ITEMS}/${prev.documentId}`, {
            data: { description: input.text, extra_fields: extra, status1: 'active' },
        });
    } else {
        await strapiPost(ITEMS, {
            data: {
                category: REVIEW_CATEGORY,
                label: input.officialId,
                description: input.text,
                user_id: input.userId,
                extra_fields: extra,
                icon: '⭐',
                color: 'amber',
                status1: 'active',
                publishedAt: new Date().toISOString(),
            },
        });
    }
    invalidateRating();
}

/** הדירוג הקיים של משתמש עבור מדורג (לעריכה חוזרת בטופס) */
export async function getMyReview(officialId: string, userId: string): Promise<Review | undefined> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': REVIEW_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[user_id][$eq]': userId,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    const row = res.data?.[0];
    return row ? mapReview(row) : undefined;
}

/**
 * סימון/ביטול "מועיל" על ביקורת.
 * הביקורת חייבת להיות פעילה ולהשתייך למדורג שבכתובת — אחרת אפשר היה לנפח
 * מונה של ביקורת שהוסרה או של מדורג אחר לגמרי בשליחת מזהה שרירותי.
 * החזרה: האם הפעולה בוצעה.
 */
export async function toggleHelpful(
    reviewId: string,
    userId: string,
    officialId: string,
): Promise<boolean> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(reviewId)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return false;
        throw e;
    }
    const item = res.data;
    if (!item || item.category !== REVIEW_CATEGORY) return false;
    if (item.status1 !== 'active' || item.label !== officialId) return false;
    // סימון עצמי אינו אות אמון של הציבור
    if (item.user_id && item.user_id === userId) return false;

    const x = ef(item);
    const set = new Set(Array.isArray(x.helpful_by) ? (x.helpful_by as string[]) : []);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: { extra_fields: { ...x, helpful_by: [...set] } },
    });
    invalidateRating();
    return true;
}

export interface OfficialInput {
    name: string;
    group: GroupKey;
    position: string;
    org: string;
    bio: string;
    image?: string;
    /** PersonID מה-OData של הכנסת — מזהה יציב להתאמה בסנכרונים הבאים */
    knessetPersonId?: number;
}

/** יצירת מדורג — אדמין (approved) או הצעת משתמש (ממתינה לאישור) */
export async function createOfficial(
    input: OfficialInput,
    opts: { approved: boolean; suggestedBy?: string },
): Promise<string> {
    const res = await strapiPost<{ data: StrapiItem }>(ITEMS, {
        data: {
            category: OFFICIAL_CATEGORY,
            label: input.name,
            description: input.bio,
            user_id: opts.suggestedBy ?? null,
            extra_fields: {
                group: input.group,
                position: input.position,
                org: input.org,
                ...(input.image ? { image: input.image } : {}),
                ...(input.knessetPersonId ? { knesset_person_id: input.knessetPersonId } : {}),
                approved: opts.approved,
                ...(opts.suggestedBy ? { suggested_by: opts.suggestedBy } : {}),
            },
            icon: groupByKey(input.group)?.icon ?? '🏛️',
            color: 'blue',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
    invalidateRating();
    return res.data.documentId;
}

/** שדות הפרופיל המלא — כולם אופציונליים; undefined = ללא שינוי */
export interface OfficialProfileInput {
    contacts?: { email: string; phone: string; whatsapp: string; facebook: string; website: string };
    verified?: boolean;
    platformUrl?: string;
    annualReportUrl?: string;
    promises?: OfficialPromise[];
    specialties?: string[];
    /** null = מחיקת הנתון */
    attendanceScore?: number | null;
}

export async function updateOfficial(
    id: string,
    input: Partial<OfficialInput> &
        OfficialProfileInput & { approved?: boolean; officialUserId?: string | null },
): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${id}`);
    const item = res.data;
    if (!item || item.category !== OFFICIAL_CATEGORY) throw new Error('מדורג לא נמצא');
    const x = ef(item);
    await strapiPut(`${ITEMS}/${id}`, {
        data: {
            ...(input.name !== undefined ? { label: input.name } : {}),
            ...(input.bio !== undefined ? { description: input.bio } : {}),
            extra_fields: {
                ...x,
                ...(input.group !== undefined ? { group: input.group } : {}),
                ...(input.position !== undefined ? { position: input.position } : {}),
                ...(input.org !== undefined ? { org: input.org } : {}),
                ...(input.image !== undefined ? { image: input.image } : {}),
                ...(input.approved !== undefined ? { approved: input.approved } : {}),
                // null = ניתוק חשבון הדמות; undefined = ללא שינוי
                ...(input.officialUserId !== undefined
                    ? { official_user_id: input.officialUserId }
                    : {}),
                // ---- פרופיל מלא ----
                ...(input.contacts !== undefined ? { contacts: input.contacts } : {}),
                ...(input.verified !== undefined ? { verified: input.verified } : {}),
                ...(input.platformUrl !== undefined ? { platform_url: input.platformUrl } : {}),
                ...(input.annualReportUrl !== undefined
                    ? { annual_report_url: input.annualReportUrl }
                    : {}),
                ...(input.promises !== undefined ? { promises: input.promises } : {}),
                ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
                ...(input.attendanceScore !== undefined
                    ? { attendance_score: input.attendanceScore }
                    : {}),
            },
        },
    });
    invalidateRating();
}

// ============================================================
// ---- דיווחים על תוכן ----
// ============================================================

function mapReport(item: StrapiItem): ContentReport {
    const x = ef(item);
    return {
        id: item.documentId,
        target_id: item.label ?? '',
        target_type: x.target_type === 'comment' || x.target_type === 'official' ? x.target_type : 'review',
        official_id: typeof x.official_id === 'string' ? x.official_id : '',
        official_name: typeof x.official_name === 'string' ? x.official_name : '',
        reason: (typeof x.reason === 'string' ? x.reason : 'other') as ReportReason,
        details: item.description ?? '',
        reporter_contact: typeof x.reporter_contact === 'string' ? x.reporter_contact : '',
        snapshot: typeof x.snapshot === 'string' ? x.snapshot : '',
        status: x.status === 'handled' ? 'handled' : 'pending',
        created_at: item.createdAt ?? '',
    };
}

export interface ReportInput {
    targetId: string;
    targetType: 'review' | 'comment' | 'official';
    officialId: string;
    officialName: string;
    reason: ReportReason;
    details: string;
    reporterContact: string;
    /** התוכן המדווח כפי שהיה — נשמר כדי שהדיווח יישאר מובן גם אחרי מחיקה */
    snapshot: string;
    /** מזהה המדווח אם היה מחובר; אורח מדווח בלי מזהה */
    userId: string | null;
}

/** דיווח על תוכן פוגעני — פתוח גם לאורחים (זו הכתיבה היחידה שכך) */
export async function createReport(input: ReportInput): Promise<void> {
    await strapiPost(ITEMS, {
        data: {
            category: REPORT_CATEGORY,
            label: input.targetId,
            description: input.details.slice(0, 1000),
            user_id: input.userId,
            extra_fields: {
                target_type: input.targetType,
                official_id: input.officialId,
                official_name: input.officialName,
                reason: input.reason,
                reporter_contact: input.reporterContact.slice(0, 200),
                snapshot: input.snapshot.slice(0, 1000),
                status: 'pending',
            },
            icon: '🚩',
            color: 'red',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
    // הדיווחים אינם בקאש הציבורי — אין מה לנקות
}

/** כל הדיווחים (לאדמין) — חדש ראשון */
export async function listReports(): Promise<ContentReport[]> {
    return (await fetchByCategory(REPORT_CATEGORY)).map(mapReport);
}

/** סימון דיווח כטופל — הדיווח נשמר לתיעוד ולא נמחק */
export async function markReportHandled(id: string): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    const item = res.data;
    if (!item || item.category !== REPORT_CATEGORY) throw new Error('דיווח לא נמצא');
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: { extra_fields: { ...ef(item), status: 'handled' } },
    });
}

/** הסרה רכה (status1=deleted) — למדורג או לביקורת */
export async function softDeleteRatingItem(id: string, byAdmin: string): Promise<void> {
    await strapiPut(`${ITEMS}/${id}`, {
        data: { status1: 'deleted', contact: `[הוסר ע"י: ${byAdmin}]` },
    });
    invalidateRating();
}

// ============================================================
// ---- פניות ציבור למדורגים ----
// ============================================================

/** כל הפניות בדף מדורג — שליפה אחת (label=המדורג), חדש ראשון */
export async function getInquiriesFor(officialId: string): Promise<OfficialInquiry[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': INQUIRY_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[status1][$eq]': 'active',
        'sort': 'createdAt:desc',
        'pagination[limit]': '1000',
    });
    return (res.data ?? []).map(mapInquiry).filter((i) => i.text);
}

export interface AddInquiryInput {
    officialId: string;
    userId: string;
    authorName: string;
    text: string;
    anonymous: boolean;
}

/** פנייה ציבורית חדשה — משתמשים רשומים בלבד (נאכף ב-action) */
export async function addInquiry(input: AddInquiryInput): Promise<void> {
    await strapiPost(ITEMS, {
        data: {
            category: INQUIRY_CATEGORY,
            label: input.officialId,
            description: input.text,
            user_id: input.userId,
            extra_fields: {
                author_name: input.authorName,
                anonymous: input.anonymous,
                joined_by: [],
                reply_text: '',
                replied_at: null,
            },
            icon: '📨',
            color: 'blue',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
}

/** פנייה בודדת — לאימות בעלות לפני מחיקה */
export async function getInquiry(id: string): Promise<OfficialInquiry | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    if (!res.data || res.data.category !== INQUIRY_CATEGORY || res.data.status1 !== 'active') {
        return undefined;
    }
    return mapInquiry(res.data);
}

/**
 * הצטרפות/ביטול הצטרפות לפנייה ציבורית.
 * הפנייה חייבת להיות פעילה ושייכת למדורג שבכתובת; הפונה עצמו כבר נספר.
 */
export async function toggleJoinInquiry(
    inquiryId: string,
    userId: string,
    officialId: string,
): Promise<boolean> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(inquiryId)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return false;
        throw e;
    }
    const item = res.data;
    if (!item || item.category !== INQUIRY_CATEGORY) return false;
    if (item.status1 !== 'active' || item.label !== officialId) return false;
    // הפונה כבר נמנה עם הפנייה — הצטרפות עצמית מנפחת את המונה
    if (item.user_id && item.user_id === userId) return false;

    const x = ef(item);
    const set = new Set(strArr(x.joined_by));
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: { extra_fields: { ...x, joined_by: [...set] } },
    });
    return true;
}

/**
 * מענה רשמי לפנייה — רק חשבון הדמות (נאכף ב-action).
 * מענה חוזר מעדכן את הטקסט; replied_at נשמר מהמענה הראשון.
 */
export async function replyToInquiry(
    inquiryId: string,
    officialId: string,
    replyText: string,
): Promise<boolean> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(inquiryId)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return false;
        throw e;
    }
    const item = res.data;
    if (!item || item.category !== INQUIRY_CATEGORY) return false;
    if (item.status1 !== 'active' || item.label !== officialId) return false;

    const x = ef(item);
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: {
            extra_fields: {
                ...x,
                reply_text: replyText,
                replied_at: str(x.replied_at) || new Date().toISOString(),
            },
        },
    });
    return true;
}

// ============================================================
// ---- מרחב ההצעות האזרחיות ----
// ============================================================

/** כל ההצעות המאושרות — חדש ראשון */
export async function listProposals(): Promise<CivicProposal[]> {
    return cached('proposals', async () =>
        (await fetchByCategory(PROPOSAL_CATEGORY)).map(mapProposal).filter((p) => p.approved),
    );
}

/** הצעות שממתינות לאישור אדמין */
export async function listPendingProposals(): Promise<CivicProposal[]> {
    return (await fetchByCategory(PROPOSAL_CATEGORY)).map(mapProposal).filter((p) => !p.approved);
}

/** הצעה בודדת (גם ממתינה — הנתיב מחליט אם להציג לפי בעלות/אדמין) */
export async function getProposal(id: string): Promise<CivicProposal | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    if (!res.data || res.data.category !== PROPOSAL_CATEGORY || res.data.status1 !== 'active') {
        return undefined;
    }
    return mapProposal(res.data);
}

export interface CreateProposalInput {
    title: string;
    text: string;
    pros: string[];
    cons: string[];
    userId: string;
    proposerName: string;
    anonymous: boolean;
}

/** הגשת הצעה — נכנסת כממתינה לאישור אדמין; מחזירה documentId */
export async function createProposal(input: CreateProposalInput): Promise<string> {
    const res = await strapiPost<{ data: StrapiItem }>(ITEMS, {
        data: {
            category: PROPOSAL_CATEGORY,
            label: input.title,
            description: input.text,
            user_id: input.userId,
            extra_fields: {
                proposer_name: input.proposerName,
                anonymous: input.anonymous,
                pros: input.pros,
                cons: input.cons,
                status: 'discussion',
                approved: false,
                supporters: [],
                official_ids: [],
                updates: [],
            },
            icon: '📜',
            color: 'purple',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
    invalidateRating();
    return res.data.documentId;
}

/** תמיכה/ביטול תמיכה בהצעה מאושרת */
export async function toggleSupportProposal(proposalId: string, userId: string): Promise<boolean> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(proposalId)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return false;
        throw e;
    }
    const item = res.data;
    if (!item || item.category !== PROPOSAL_CATEGORY || item.status1 !== 'active') return false;
    const x = ef(item);
    if (x.approved === false) return false;

    const set = new Set(strArr(x.supporters));
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: { extra_fields: { ...x, supporters: [...set] } },
    });
    invalidateRating();
    return true;
}

/** עדכון הצעה ע"י אדמין: אישור, סטטוס, קישור מדורגים, עדכון בציר הזמן */
export async function updateProposal(
    id: string,
    input: {
        approved?: boolean;
        status?: ProposalStatus;
        officialIds?: string[];
        addUpdate?: string;
    },
): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    const item = res.data;
    if (!item || item.category !== PROPOSAL_CATEGORY) throw new Error('הצעה לא נמצאה');
    const x = ef(item);
    const updates = parseUpdates(x.updates);
    if (input.addUpdate?.trim()) {
        updates.push({ date: new Date().toISOString(), text: input.addUpdate.trim() });
    }
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: {
            extra_fields: {
                ...x,
                ...(input.approved !== undefined ? { approved: input.approved } : {}),
                ...(input.status !== undefined ? { status: input.status } : {}),
                ...(input.officialIds !== undefined ? { official_ids: input.officialIds } : {}),
                updates,
            },
        },
    });
    invalidateRating();
}

// ============================================================
// ---- סקר "מה הכי חשוב לך?" ----
// ============================================================

/** ההצבעה של המשתמש בסקר החשיבות (label קבוע — סקר אחד) */
const SURVEY_LABEL = 'criteria_importance';

export async function getMySurveyVote(userId: string): Promise<Scores | null> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': SURVEY_CATEGORY,
        'filters[label][$eq]': SURVEY_LABEL,
        'filters[user_id][$eq]': userId,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    const row = res.data?.[0];
    if (!row) return null;
    const scores = sanitizeScores(ef(row).importance);
    return Object.keys(scores).length ? scores : null;
}

/** הצבעה בסקר — אחת למשתמש (upsert) */
export async function upsertSurveyVote(userId: string, importance: Scores): Promise<void> {
    const existing = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': SURVEY_CATEGORY,
        'filters[label][$eq]': SURVEY_LABEL,
        'filters[user_id][$eq]': userId,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    const prev = existing.data?.[0];
    if (prev) {
        await strapiPut(`${ITEMS}/${prev.documentId}`, {
            data: { extra_fields: { ...ef(prev), importance } },
        });
    } else {
        await strapiPost(ITEMS, {
            data: {
                category: SURVEY_CATEGORY,
                label: SURVEY_LABEL,
                description: '',
                user_id: userId,
                extra_fields: { importance },
                icon: '📊',
                color: 'blue',
                status1: 'active',
                publishedAt: new Date().toISOString(),
            },
        });
    }
    invalidateRating();
}

// ============================================================
// ---- סנכרון נתונים חיצוני (כנסת + שקוף) — ראו knessetSync.ts ----
// ============================================================

/** צורת מדורג מינימלית לצורכי השוואה בסנכרון — טרייה, כולל לא-מאושרים */
export interface SyncOfficialRow {
    id: string;
    name: string;
    group: GroupKey;
    position: string;
    org: string;
    bio: string;
    approved: boolean;
    knessetPersonId: number | null;
    shakuf: ShakufData | null;
    knessetRecord: KnessetRecord | null;
}

export async function listOfficialsForSync(): Promise<SyncOfficialRow[]> {
    return (await fetchByCategory(OFFICIAL_CATEGORY)).map((item) => {
        const o = mapOfficial(item);
        const pid = Number(ef(item).knesset_person_id);
        return {
            id: o.id,
            name: o.name,
            group: o.group,
            position: o.position,
            org: o.org,
            bio: o.bio,
            approved: o.approved,
            knessetPersonId: Number.isInteger(pid) && pid > 0 ? pid : null,
            shakuf: o.shakuf,
            knessetRecord: o.knesset_record,
        };
    });
}

/** עדכון עדין מהסנכרון — נוגע רק בשדות שהמקור החיצוני אחראי עליהם */
export interface OfficialSyncPatch {
    position?: string;
    org?: string;
    bio?: string;
    /** הצעת משתמש שהתבררה כמכהן/ת — מאושרת אוטומטית */
    approved?: boolean;
    knessetPersonId?: number;
    /** null = ניקוי הנתון (המשרד כבר לא בידי המדורג) */
    shakuf?: ShakufData | null;
    knessetRecord?: KnessetRecord | null;
}

export async function applyOfficialSync(id: string, patch: OfficialSyncPatch): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    const item = res.data;
    if (!item || item.category !== OFFICIAL_CATEGORY) throw new Error('מדורג לא נמצא');
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: {
            ...(patch.bio !== undefined ? { description: patch.bio } : {}),
            extra_fields: {
                ...ef(item),
                ...(patch.position !== undefined ? { position: patch.position } : {}),
                ...(patch.org !== undefined ? { org: patch.org } : {}),
                ...(patch.approved !== undefined ? { approved: patch.approved } : {}),
                ...(patch.knessetPersonId !== undefined
                    ? { knesset_person_id: patch.knessetPersonId }
                    : {}),
                ...(patch.shakuf !== undefined ? { shakuf: patch.shakuf } : {}),
                ...(patch.knessetRecord !== undefined ? { knesset_record: patch.knessetRecord } : {}),
            },
        },
    });
    // invalidateRating() נקרא פעם אחת בסוף הסנכרון, לא על כל כתיבה
}

/** מדורג בודד לרענון רזומה — בלי לשלוף את כל הרשימה */
export async function getOfficialForSync(id: string): Promise<SyncOfficialRow | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    const item = res.data;
    if (!item || item.category !== OFFICIAL_CATEGORY || item.status1 !== 'active') return undefined;
    const o = mapOfficial(item);
    const pid = Number(ef(item).knesset_person_id);
    return {
        id: o.id,
        name: o.name,
        group: o.group,
        position: o.position,
        org: o.org,
        bio: o.bio,
        approved: o.approved,
        knessetPersonId: Number.isInteger(pid) && pid > 0 ? pid : null,
        shakuf: o.shakuf,
        knessetRecord: o.knesset_record,
    };
}

/** יומן הסנכרון האחרון — נשמר כרשומה אחת (upsert) לתצוגה באדמין */
export interface SyncLog {
    ran_at: string;
    ran_by: string;
    roster_count: number;
    added: string[];
    updated: string[];
    departed: string[];
    shakuf_applied: string[];
    errors: string[];
}

/** ריצת הרזומות האחרונה — נשמרת בשדה נפרד כדי שלא תידרס ע"י סנכרון המצבת */
export interface RecordSyncLog {
    ran_at: string;
    ran_by: string;
    /** כמה רזומות עודכנו בריצה */
    done: number;
    /** כמה עוד ממתינות (טרם נמשכו או ישנות) */
    remaining: number;
    errors: string[];
}

const SYNC_LOG_LABEL = 'knesset_sync';

function parseSyncLog(v: unknown): SyncLog | null {
    if (!v || typeof v !== 'object') return null;
    const s = v as Record<string, unknown>;
    if (!str(s.ran_at)) return null;
    return {
        ran_at: str(s.ran_at),
        ran_by: str(s.ran_by),
        roster_count: Number(s.roster_count) || 0,
        added: strArr(s.added),
        updated: strArr(s.updated),
        departed: strArr(s.departed),
        shakuf_applied: strArr(s.shakuf_applied),
        errors: strArr(s.errors),
    };
}

function parseRecordLog(v: unknown): RecordSyncLog | null {
    if (!v || typeof v !== 'object') return null;
    const s = v as Record<string, unknown>;
    if (!str(s.ran_at)) return null;
    return {
        ran_at: str(s.ran_at),
        ran_by: str(s.ran_by),
        done: num(s.done),
        remaining: num(s.remaining),
        errors: strArr(s.errors),
    };
}

async function findSyncItem(): Promise<StrapiItem | undefined> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': SYNC_CATEGORY,
        'filters[label][$eq]': SYNC_LOG_LABEL,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    return res.data?.[0];
}

export async function getSyncLog(): Promise<{ roster: SyncLog | null; records: RecordSyncLog | null }> {
    const row = await findSyncItem();
    if (!row) return { roster: null, records: null };
    const x = ef(row);
    return { roster: parseSyncLog(x.log), records: parseRecordLog(x.record_log) };
}

export async function saveSyncLog(log: SyncLog): Promise<void> {
    const prev = await findSyncItem();
    if (prev) {
        await strapiPut(`${ITEMS}/${prev.documentId}`, {
            data: { extra_fields: { ...ef(prev), log } },
        });
    } else {
        await strapiPost(ITEMS, {
            data: {
                category: SYNC_CATEGORY,
                label: SYNC_LOG_LABEL,
                description: 'יומן סנכרון הנתונים החיצוני (כנסת + שקוף)',
                extra_fields: { log },
                icon: '🔄',
                color: 'blue',
                status1: 'active',
                publishedAt: new Date().toISOString(),
            },
        });
    }
}

/** יומן ריצת הרזומות — נשמר לצד יומן המצבת באותה רשומה */
export async function saveRecordLog(log: RecordSyncLog): Promise<void> {
    const prev = await findSyncItem();
    if (prev) {
        await strapiPut(`${ITEMS}/${prev.documentId}`, {
            data: { extra_fields: { ...ef(prev), record_log: log } },
        });
    } else {
        await strapiPost(ITEMS, {
            data: {
                category: SYNC_CATEGORY,
                label: SYNC_LOG_LABEL,
                description: 'יומן סנכרון הנתונים החיצוני (כנסת + שקוף)',
                extra_fields: { record_log: log },
                icon: '🔄',
                color: 'blue',
                status1: 'active',
                publishedAt: new Date().toISOString(),
            },
        });
    }
}

/** תוצאות הסקר המצטברות — ממוצע חשיבות לכל מדד */
export async function getSurveyResults(): Promise<SurveyResults> {
    return cached('survey', async () => {
        const rows = (await fetchByCategory(SURVEY_CATEGORY)).filter(
            (r) => r.label === SURVEY_LABEL,
        );
        const importance = {} as SurveyResults['importance'];
        let count = 0;
        const sums = new Map<string, { sum: number; n: number }>();
        for (const row of rows) {
            const scores = sanitizeScores(ef(row).importance);
            if (!Object.keys(scores).length) continue;
            count++;
            for (const [key, val] of Object.entries(scores)) {
                const s = sums.get(key) ?? { sum: 0, n: 0 };
                s.sum += val;
                s.n++;
                sums.set(key, s);
            }
        }
        for (const c of CRITERIA) {
            const s = sums.get(c.key);
            importance[c.key] = s && s.n > 0 ? s.sum / s.n : null;
        }
        return { count, importance };
    });
}
