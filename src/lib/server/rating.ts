// ============================================================
// rating.ts - שכבת הנתונים של הדירוג הציבורי (Strapi items)
//
// pr_official: label=שם, description=רקע, extra_fields={group, position, org, approved, suggested_by}
// pr_review:   label=<official documentId>, description=טקסט, user_id=מדרג,
//              extra_fields={scores, reviewer_name, anonymous, helpful_by}
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import { sanitizeScores, type Scores } from '$lib/rating/criteria';
import { overallOf, rankOfficials } from '$lib/rating/aggregate';
import {
    COMMENT_CATEGORY,
    OFFICIAL_CATEGORY,
    REVIEW_CATEGORY,
    groupByKey,
    type GroupKey,
    type Official,
    type OfficialComment,
    type RatedOfficial,
    type Review,
} from '$lib/rating/types';

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

function mapOfficial(item: StrapiItem): Official {
    const x = ef(item);
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

// ============================================================
// ---- קריאה ----
// ============================================================

async function fetchByCategory(category: string): Promise<StrapiItem[]> {
    // עמוד יחיד מוגבל ל-1000 ב-Strapi — לולאת עמודים כדי שהסטטיסטיקה לא תיחתך בשקט
    const PAGE = 1000;
    const all: StrapiItem[] = [];
    for (let start = 0; ; start += PAGE) {
        const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
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
        res = await strapiGet<{ data: StrapiItem }>(`/api/items/${encodeURIComponent(id)}`);
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
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
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
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
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
        const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${encodeURIComponent(officialId)}`);
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
    await strapiPost('/api/items', {
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
        res = await strapiGet<{ data: StrapiItem }>(`/api/items/${encodeURIComponent(id)}`);
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
    const existing = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
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
        await strapiPut(`/api/items/${prev.documentId}`, {
            data: { description: input.text, extra_fields: extra, status1: 'active' },
        });
    } else {
        await strapiPost('/api/items', {
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
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]': REVIEW_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[user_id][$eq]': userId,
        'filters[status1][$eq]': 'active',
        'pagination[limit]': '1',
    });
    const row = res.data?.[0];
    return row ? mapReview(row) : undefined;
}

/** סימון/ביטול "מועיל" על ביקורת */
export async function toggleHelpful(reviewId: string, userId: string): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${reviewId}`);
    const item = res.data;
    if (!item || item.category !== REVIEW_CATEGORY) return;
    const x = ef(item);
    const set = new Set(Array.isArray(x.helpful_by) ? (x.helpful_by as string[]) : []);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    await strapiPut(`/api/items/${reviewId}`, {
        data: { extra_fields: { ...x, helpful_by: [...set] } },
    });
    invalidateRating();
}

export interface OfficialInput {
    name: string;
    group: GroupKey;
    position: string;
    org: string;
    bio: string;
    image?: string;
}

/** יצירת מדורג — אדמין (approved) או הצעת משתמש (ממתינה לאישור) */
export async function createOfficial(
    input: OfficialInput,
    opts: { approved: boolean; suggestedBy?: string },
): Promise<string> {
    const res = await strapiPost<{ data: StrapiItem }>('/api/items', {
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

export async function updateOfficial(
    id: string,
    input: Partial<OfficialInput> & { approved?: boolean; officialUserId?: string | null },
): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${id}`);
    const item = res.data;
    if (!item || item.category !== OFFICIAL_CATEGORY) throw new Error('מדורג לא נמצא');
    const x = ef(item);
    await strapiPut(`/api/items/${id}`, {
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
            },
        },
    });
    invalidateRating();
}

/** הסרה רכה (status1=deleted) — למדורג או לביקורת */
export async function softDeleteRatingItem(id: string, byAdmin: string): Promise<void> {
    await strapiPut(`/api/items/${id}`, {
        data: { status1: 'deleted', contact: `[הוסר ע"י: ${byAdmin}]` },
    });
    invalidateRating();
}
