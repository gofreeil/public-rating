// ============================================================
// ads.ts - מאגר הפרסומות המקומיות (category pr_ad ב-/api/pr-items)
//
// מודעה = שורה אחת: label=כותרת, description=שורת משנה,
// user_id=המפרסם, status1=pending/active/rejected/deleted,
// extra_fields=כל השאר. אין content-type חדש ב-Strapi.
//
// שלוש החלטות שכדאי להכיר לפני שנוגעים:
//
// 1. הבעלים נשמר גם בעמודה העליונה user_id ולא רק ב-extra_fields,
//    ולכן "המודעות שלי" הוא סינון בצד Strapi ולא סריקה בזיכרון.
// 2. status1 במסד הוא 'active' ובאפליקציה 'approved'. שורה בלי
//    status1 מוכר — למשל כזו שנוצרה ידנית — נופלת ל-pending, כלומר
//    לתור האישורים, ולא לאוויר.
// 3. הקאש והמונים הם מצב ברמת התהליך. בפריסה serverless כל למבדה
//    מחזיקה עותק משלה, ולכן ה-TTL קצר בכוונה (15ש') — זו השהיית
//    הראייה הגרועה ביותר אחרי אישור. מתאים למדדי פרסום; לעולם לא
//    לשימוש טרנזקציוני.
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import { normalizeGradientId } from '$lib/ads/gradients';
import { DEFAULT_PLAN_DAYS, normalizePlanDays } from '$lib/ads/plans';
import {
    clamp,
    dataUriBytes,
    landingBytes,
    normalizeLanding,
    safeDataImage,
    safeEmail,
} from '$lib/ads/sanitize';
import {
    AD_CATEGORY,
    type AdCardStyle,
    type AdPayment,
    type AdStatus,
    type ApprovedAdPublic,
    type PendingAdBrief,
    type PublicAd,
    type SubmittedAd,
} from '$lib/ads/types';

const ITEMS = '/api/pr-items';
const DAY_MS = 24 * 60 * 60 * 1000;

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
// ---- קאש ----
// ============================================================

const TTL_MS = 15_000;
let approvedCache: { at: number; data: ApprovedAdPublic[] } | null = null;
/** הרשימה התקינה האחרונה — מוגשת כשה-Strapi נופל, כדי שמודעה בתשלום
 *  לא תיעלם מהטור בגלל 502 חולף. עדיף "מעט מיושן" על "אין מודעות". */
let lastGoodApproved: ApprovedAdPublic[] = [];

export function invalidateAdsCache(): void {
    approvedCache = null;
}

// ============================================================
// ---- מיפוי ----
// ============================================================

function ef(item: StrapiItem): Record<string, unknown> {
    return item.extra_fields && typeof item.extra_fields === 'object' ? item.extra_fields : {};
}

/** status1 של המסד → סטטוס האפליקציה. לא מוכר ⇒ pending (לא עולה לאוויר) */
function fromItemStatus(raw: string | null): AdStatus {
    if (raw === 'active') return 'approved';
    if (raw === 'rejected') return 'rejected';
    return 'pending';
}

function toItemStatus(status: AdStatus): string {
    return status === 'approved' ? 'active' : status;
}

function normalizeStyle(raw: unknown): Partial<AdCardStyle> {
    const s = (raw ?? {}) as Record<string, unknown>;
    const num = (v: unknown, min: number, max: number): number | undefined => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
    };
    const out: Partial<AdCardStyle> = {};
    if (typeof s.title_color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.title_color)) {
        out.title_color = s.title_color;
    }
    const ty = num(s.title_offset_y, -200, 200);
    if (ty !== undefined) out.title_offset_y = ty;
    const dh = num(s.diag_height, 0, 100);
    if (dh !== undefined) out.diag_height = dh;
    if (s.logo_shape === 'circle' || s.logo_shape === 'square') out.logo_shape = s.logo_shape;
    if (s.logo_position === 'top' || s.logo_position === 'bottom') out.logo_position = s.logo_position;
    const ix = num(s.image_x, -100, 100);
    if (ix !== undefined) out.image_x = ix;
    const iy = num(s.image_y, -100, 100);
    if (iy !== undefined) out.image_y = iy;
    return out;
}

function mapAd(item: StrapiItem): SubmittedAd {
    const x = ef(item);
    const payment = ((): AdPayment => {
        const p = String(x.payment ?? '');
        return p === 'paid' || p === 'owner' ? p : 'pending';
    })();

    return {
        id: item.documentId,
        status: fromItemStatus(item.status1),
        title: clamp(item.label, 35),
        subtitle: clamp(item.description, 70),
        hoverText: clamp(x.hover_text, 90),
        cta: clamp(x.cta, 30) || 'לפרטים',
        gradientId: normalizeGradientId(x.gradient_id),
        logo: safeDataImage(x.logo),
        mainImage: safeDataImage(x.main_image),
        style: normalizeStyle(x.style),
        landing: normalizeLanding(x.landing),

        ownerId: item.user_id ?? null,
        submittedByName: clamp((x.submitted_by as Record<string, unknown>)?.name, 60),
        contactEmail: safeEmail(x.contact_email),
        decidedBy: clamp(x.decided_by, 120),

        submittedAt: String(x.submitted_at ?? item.createdAt ?? ''),
        editedAt: String(x.edited_at ?? ''),
        decidedAt: String(x.decided_at ?? ''),
        expiresAt: String(x.expires_at ?? ''),
        durationDays: normalizePlanDays(x.duration_days),
        requestedDurationDays: normalizePlanDays(x.requested_duration_days),
        rejectionReason: clamp(x.rejection_reason, 300),
        payment,
        bytes: Number.isFinite(Number(x.bytes)) ? Number(x.bytes) : 0,
    };
}

/** מודעה פגה? (ריק = ללא תפוגה, למשל מודעה שטרם אושרה) */
export function isExpired(ad: SubmittedAd, now = Date.now()): boolean {
    if (!ad.expiresAt) return false;
    const t = new Date(ad.expiresAt).getTime();
    return Number.isFinite(t) && t < now;
}

/** הצורה שמותר לשלוח לטור הימני — בלי שום זהות */
export function toApprovedPublic(ad: SubmittedAd): ApprovedAdPublic {
    return {
        id: ad.id,
        title: ad.title,
        subtitle: ad.subtitle,
        hoverText: ad.hoverText,
        cta: ad.cta,
        gradientId: ad.gradientId,
        logo: ad.logo,
        mainImage: ad.mainImage,
        style: ad.style,
    };
}

/**
 * הצורה שמותר לשלוח לדף הנחיתה הציבורי.
 * זו הנקודה שמונעת את הדליפה שקיימת במקור: שם נשלח האובייקט המלא,
 * כך שהאימייל של המפרסם ושל האדמין שאישר נכנסו ל-HTML של דף שנשמר
 * בקאש ציבורי.
 */
export function toPublicAd(ad: SubmittedAd): PublicAd {
    return { ...toApprovedPublic(ad), landing: ad.landing };
}

// ============================================================
// ---- קריאה ----
// ============================================================

async function fetchAds(params: Record<string, string>): Promise<StrapiItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>(ITEMS, {
        'filters[category][$eq]': AD_CATEGORY,
        ...params,
    });
    return res.data ?? [];
}

/**
 * המודעות שעל האוויר. הסדר עולה בכוונה: מיקום המשבצת הוא סדר הרכישה,
 * כך שמודעה חדשה תופסת את המשבצת הפנויה הבאה במקום לדחוף כל מפרסם
 * קיים מספר אחד למטה.
 */
export async function listApproved(): Promise<ApprovedAdPublic[]> {
    const hit = approvedCache;
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

    let rows: StrapiItem[];
    try {
        rows = await fetchAds({
            'filters[status1][$eq]': 'active',
            sort: 'createdAt:asc',
            'pagination[limit]': '25',
        });
    } catch (e) {
        console.warn('[ads] listApproved failed, serving last good:', e instanceof Error ? e.message : e);
        return lastGoodApproved;
    }

    const now = Date.now();
    const data = rows
        .map(mapAd)
        .filter((ad) => !isExpired(ad, now))
        .map(toApprovedPublic);

    approvedCache = { at: now, data };
    lastGoodApproved = data;
    return data;
}

/** מודעה בודדת — הצורה המלאה. הקורא אחראי להקרין לפני שליחה לדפדפן. */
export async function getAd(id: string): Promise<SubmittedAd | undefined> {
    let res: { data: StrapiItem };
    try {
        res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    } catch (e) {
        if (String(e).includes('→ 404')) return undefined;
        throw e;
    }
    if (!res.data || res.data.category !== AD_CATEGORY) return undefined;
    if (res.data.status1 === 'deleted') return undefined;
    return mapAd(res.data);
}

/** כל המודעות לניהול — כולל ממתינות ודחויות, בלי מוסרות */
export async function listAllForAdmin(): Promise<SubmittedAd[]> {
    const rows = await fetchAds({
        'filters[status1][$ne]': 'deleted',
        sort: 'createdAt:desc',
        'pagination[limit]': '100',
    });
    return rows.map(mapAd);
}

/**
 * מונה הממתינות לתג במסך הניהול.
 * ה-fields מצמצם את השליפה: התמונות יושבות ב-extra_fields, ומשיכתן
 * בשביל מספר בודד היא מאות KB בכל טעינת דף.
 */
export async function countPending(): Promise<number> {
    try {
        const rows = await fetchAds({
            'filters[status1][$eq]': 'pending',
            'fields[0]': 'label',
            'fields[1]': 'status1',
            'pagination[limit]': '100',
        });
        return rows.length;
    } catch {
        return 0;
    }
}

/** תור האישורים בצורה מקוצרת */
export async function listPendingBrief(): Promise<PendingAdBrief[]> {
    const rows = await fetchAds({
        'filters[status1][$eq]': 'pending',
        'fields[0]': 'label',
        'fields[1]': 'status1',
        'fields[2]': 'createdAt',
        sort: 'createdAt:asc',
        'pagination[limit]': '100',
    });
    return rows.map((r) => ({ id: r.documentId, title: r.label ?? '', submittedAt: r.createdAt }));
}

/** המודעות של מפרסם — סינון בצד Strapi דרך העמודה user_id */
export async function listForOwner(userId: string): Promise<SubmittedAd[]> {
    if (!userId) return [];
    const rows = await fetchAds({
        'filters[user_id][$eq]': userId,
        'filters[status1][$ne]': 'deleted',
        sort: 'createdAt:desc',
        'pagination[limit]': '50',
    });
    return rows.map(mapAd);
}

// ============================================================
// ---- כתיבה ----
// ============================================================

/** תקרת משקל לשורה: מעליה Strapi (koa-body, 1MB לבקשה) מחזיר שגיאה גנרית */
export const MAX_AD_BYTES = 600 * 1024;

export interface SubmitAdInput {
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    gradientId: string;
    logo: string;
    mainImage: string;
    style: unknown;
    landing: unknown;
    requestedDurationDays: unknown;
    ownerId: string;
    ownerName: string;
    contactEmail: string;
    /** נקבע בשרת בלבד — לעולם לא מגוף הבקשה */
    payment: AdPayment;
}

export class AdTooLargeError extends Error {
    constructor(public bytes: number) {
        super(`הפרסומת כבדה מדי (${Math.round(bytes / 1024)}KB)`);
    }
}

/** יצירת מודעה חדשה — נכנסת תמיד כ-pending */
export async function submitAd(input: SubmitAdInput): Promise<string> {
    const landing = normalizeLanding(input.landing);
    const logo = safeDataImage(input.logo);
    const mainImage = safeDataImage(input.mainImage);

    const bytes = dataUriBytes(logo) + dataUriBytes(mainImage) + landingBytes(landing);
    if (bytes > MAX_AD_BYTES) throw new AdTooLargeError(bytes);

    const res = await strapiPost<{ data: StrapiItem }>(ITEMS, {
        data: {
            category: AD_CATEGORY,
            label: clamp(input.title, 35),
            description: clamp(input.subtitle, 70),
            user_id: input.ownerId,
            status1: 'pending',
            icon: '📢',
            color: 'amber',
            extra_fields: {
                hover_text: clamp(input.hoverText, 90),
                cta: clamp(input.cta, 30) || 'לפרטים',
                gradient_id: normalizeGradientId(input.gradientId),
                logo,
                main_image: mainImage,
                style: normalizeStyle(input.style),
                landing,
                submitted_by: { name: clamp(input.ownerName, 60) },
                contact_email: safeEmail(input.contactEmail),
                submitted_at: new Date().toISOString(),
                requested_duration_days: normalizePlanDays(input.requestedDurationDays),
                payment: input.payment,
                bytes,
            },
            publishedAt: new Date().toISOString(),
        },
    });

    invalidateAdsCache();
    return res.data.documentId;
}

/**
 * מיזוג לתוך extra_fields.
 * Strapi PUT מחליף את עמודת ה-JSON כולה, ולכן חובה לקרוא לפני שכותבים.
 * אין נעילה: אישור אדמין שמתרחש בדיוק בזמן עריכה של המפרסם עלול לדרוס
 * שדות. סביר באתר עם אדמין יחיד — אבל זה תיעוד, לא תאונה.
 */
async function mergeExtra(
    id: string,
    patch: Record<string, unknown>,
    top: Record<string, unknown> = {},
): Promise<void> {
    const res = await strapiGet<{ data: StrapiItem }>(`${ITEMS}/${encodeURIComponent(id)}`);
    const item = res.data;
    if (!item || item.category !== AD_CATEGORY) throw new Error('הפרסומת לא נמצאה');
    await strapiPut(`${ITEMS}/${item.documentId}`, {
        data: { ...top, extra_fields: { ...ef(item), ...patch } },
    });
    invalidateAdsCache();
}

/** עריכת תוכן בידי המפרסם — סטטוס, תוקף, מסלול ותשלום אינם נגעים */
export async function updateAdContent(
    id: string,
    patch: {
        title: string;
        subtitle: string;
        hoverText: string;
        cta: string;
        gradientId: string;
        logo: string;
        mainImage: string;
        style: unknown;
        landing: unknown;
    },
): Promise<void> {
    const landing = normalizeLanding(patch.landing);
    const logo = safeDataImage(patch.logo);
    const mainImage = safeDataImage(patch.mainImage);
    const bytes = dataUriBytes(logo) + dataUriBytes(mainImage) + landingBytes(landing);
    if (bytes > MAX_AD_BYTES) throw new AdTooLargeError(bytes);

    await mergeExtra(
        id,
        {
            hover_text: clamp(patch.hoverText, 90),
            cta: clamp(patch.cta, 30) || 'לפרטים',
            gradient_id: normalizeGradientId(patch.gradientId),
            logo,
            main_image: mainImage,
            style: normalizeStyle(patch.style),
            landing,
            edited_at: new Date().toISOString(),
            bytes,
        },
        { label: clamp(patch.title, 35), description: clamp(patch.subtitle, 70) },
    );
}

export async function approveAd(
    id: string,
    opts: { durationDays: unknown; decidedBy: string },
): Promise<void> {
    const days = normalizePlanDays(opts.durationDays);
    await mergeExtra(
        id,
        {
            decided_at: new Date().toISOString(),
            decided_by: clamp(opts.decidedBy, 120),
            duration_days: days,
            expires_at: new Date(Date.now() + days * DAY_MS).toISOString(),
            rejection_reason: '',
        },
        { status1: 'active' },
    );
}

export async function rejectAd(
    id: string,
    opts: { reason: string; decidedBy: string },
): Promise<void> {
    await mergeExtra(
        id,
        {
            decided_at: new Date().toISOString(),
            decided_by: clamp(opts.decidedBy, 120),
            rejection_reason: clamp(opts.reason, 300),
        },
        { status1: 'rejected' },
    );
}

/**
 * הסרה רכה. strapiClient של האתר הזה אינו מייצא DELETE, ובכל מקרה
 * הסרה רכה עקבית עם softDeleteRatingItem שבשכבת הדירוג.
 */
export async function removeAd(id: string, byAdmin: string): Promise<void> {
    await mergeExtra(id, { decided_by: clamp(byAdmin, 120) }, { status1: 'deleted' });
}

/** הארכה ידנית של מודעה קיימת */
export async function extendAd(id: string, durationDays: unknown): Promise<void> {
    const days = normalizePlanDays(durationDays);
    const ad = await getAd(id);
    const base = ad && ad.expiresAt && !isExpired(ad) ? new Date(ad.expiresAt).getTime() : Date.now();
    await mergeExtra(id, {
        duration_days: days,
        expires_at: new Date(base + days * DAY_MS).toISOString(),
    });
}

export { DEFAULT_PLAN_DAYS };
