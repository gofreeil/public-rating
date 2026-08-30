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
import { imageStamp, decodeDataImage } from './inlineImage.js';
import { MAX_AD_TOTAL_BYTES } from '$lib/ads/adImage';
import { normalizeGradientId } from '$lib/ads/gradients';
import { DEFAULT_PLAN_DAYS, normalizePlanDays } from '$lib/ads/plans';
import { AD_SLOTS } from '$lib/ads/slots';
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
    // מיקום חופשי של הלוגו תקף רק כששני הצירים קיימים — אחרת נופלים לעוגן
    const lx = num(s.logo_x, 0, 100);
    const ly = num(s.logo_y, 0, 100);
    if (lx !== undefined && ly !== undefined) {
        out.logo_x = lx;
        out.logo_y = ly;
    }
    const ix = num(s.image_x, -50, 50);
    if (ix !== undefined) out.image_x = ix;
    const iy = num(s.image_y, -50, 50);
    if (iy !== undefined) out.image_y = iy;
    const iz = num(s.image_zoom, 0.5, 4);
    if (iz !== undefined) out.image_zoom = iz;
    return out;
}

function mapAd(item: StrapiItem): SubmittedAd {
    const x = ef(item);
    const payment = ((): AdPayment => {
        const p = String(x.payment ?? '');
        return p === 'paid' || p === 'owner' ? p : 'pending';
    })();
    const logo = safeDataImage(x.logo);
    const mainImage = safeDataImage(x.main_image);
    const landing = normalizeLanding(x.landing);

    return {
        id: item.documentId,
        status: fromItemStatus(item.status1),
        title: clamp(item.label, 35),
        subtitle: clamp(item.description, 70),
        hoverText: clamp(x.hover_text, 90),
        cta: clamp(x.cta, 30) || 'לפרטים',
        gradientId: normalizeGradientId(x.gradient_id),
        logo,
        mainImage,
        // כל תמונות המודעה נכנסות לחותם: כולן מוגשות מ-/api/ad-image עם אותו
        // ?v=, ולכן החלפת אחת מהן חייבת להחליף אותו - אחרת קאש ה-immutable
        // יחזיק ישנה
        imgVersion: imageStamp(logo, mainImage, landing.image, ...landing.products.map((p) => p.image)),
        style: normalizeStyle(x.style),
        landing,

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
        // מיקום ידני שנקבע במסך הניהול (החלפת מקום בין משבצות)
        slotOrder: typeof x.slot_order === 'number' ? x.slot_order : undefined,
        paused: x.paused === true,
        pausedDaysLeft: typeof x.paused_days_left === 'number' ? x.paused_days_left : undefined,
        // מפרסם חוזר: הקישור לגרסה הקודמת ולמי שהחליפה אותה
        replacesAdId: typeof x.replaces_ad_id === 'string' ? x.replaces_ad_id : undefined,
        replacesTitle: typeof x.replaces_title === 'string' ? clamp(x.replaces_title, 35) : undefined,
        supersededBy: typeof x.superseded_by === 'string' ? x.superseded_by : undefined,
    };
}

/** סדר המשבצות: קודם מי שקיבל מיקום ידני, אחריו לפי סדר הרכישה */
export function bySlotOrder(a: { slotOrder?: number }, b: { slotOrder?: number }): number {
    return (a.slotOrder ?? Number.MAX_SAFE_INTEGER) - (b.slotOrder ?? Number.MAX_SAFE_INTEGER);
}

/** מודעה פגה? (ריק = ללא תפוגה, למשל מודעה שטרם אושרה) */
export function isExpired(ad: SubmittedAd, now = Date.now()): boolean {
    if (!ad.expiresAt) return false;
    const t = new Date(ad.expiresAt).getTime();
    return Number.isFinite(t) && t < now;
}

// ============================================================
// הגשת תמונות המודעה ככתובת, לא כ-base64 בתוך הנתונים
// ------------------------------------------------------------
// התמונות שמורות כ-data:image/...;base64 בתוך הרשומה. כשהן עברו כמות שהן
// בתוך /api/ads/approved ודף הנחיתה, אותם בייטים יצאו מהשרת מחדש בכל
// צפייה בלי שום קאש - הדפוס שבאתרי-האח שרף את מכסת ה-Fast Origin
// Transfer של Vercel. במקום זה מוחזרת כתובת ל-/api/ad-image/<id>/<kind>,
// והתמונה נשמרת בקאש immutable של הדפדפן ושל הקצה.
// ============================================================

/** logo/main = כרטיס הטור; landing/product-<n> = דף הנחיתה */
export type AdImageKind = 'logo' | 'main' | 'landing' | `product-${number}`;

export function isAdImageKind(v: string | undefined): v is AdImageKind {
    if (!v) return false;
    return v === 'logo' || v === 'main' || v === 'landing' || /^product-\d+$/.test(v);
}

function pickImage(ad: SubmittedAd, kind: AdImageKind): string {
    if (kind === 'logo') return ad.logo;
    if (kind === 'main') return ad.mainImage;
    if (kind === 'landing') return ad.landing.image;
    const idx = Number(kind.slice('product-'.length));
    return ad.landing.products[idx]?.image ?? '';
}

/** ריק נשאר ריק (הצרכן בודק אמת/שקר); ערך שאינו data: עובר כמות שהוא */
export function adImageUrl(ad: SubmittedAd, kind: AdImageKind): string {
    const raw = pickImage(ad, kind);
    if (!raw) return '';
    if (!raw.startsWith('data:')) return raw;
    return `/api/ad-image/${ad.id}/${kind}?v=${ad.imgVersion}`;
}

/**
 * הבייטים עצמם, לנתיב שמגיש אותם. getAd ישיר (לא רשימת האוויר) כדי שגם
 * דף נחיתה של מודעה מושהית לא יישבר; מאושרות בלבד - תמונות של ממתינה/
 * נדחית לא נחשפות דרך ניחוש מזהה.
 */
export async function getApprovedAdImage(
    id: string,
    kind: AdImageKind,
): Promise<{ mime: string; bytes: ArrayBuffer } | null> {
    const ad = await getAd(id);
    if (!ad || ad.status !== 'approved') return null;
    return decodeDataImage(pickImage(ad, kind));
}

/** הצורה שמותר לשלוח לטור הימני — בלי שום זהות, והתמונות ככתובת */
export function toApprovedPublic(ad: SubmittedAd): ApprovedAdPublic {
    return {
        id: ad.id,
        title: ad.title,
        subtitle: ad.subtitle,
        hoverText: ad.hoverText,
        cta: ad.cta,
        gradientId: ad.gradientId,
        logo: adImageUrl(ad, 'logo'),
        mainImage: adImageUrl(ad, 'main'),
        style: ad.style,
    };
}

/**
 * הצורה שמותר לשלוח לדף הנחיתה הציבורי.
 * זו הנקודה שמונעת את הדליפה שקיימת במקור: שם נשלח האובייקט המלא,
 * כך שהאימייל של המפרסם ושל האדמין שאישר נכנסו ל-HTML של דף שנשמר
 * בקאש ציבורי. גם תמונות דף הנחיתה עוברות כאן ככתובת.
 */
export function toPublicAd(ad: SubmittedAd): PublicAd {
    return {
        ...toApprovedPublic(ad),
        landing: {
            ...ad.landing,
            image: adImageUrl(ad, 'landing'),
            products: ad.landing.products.map((p, i) => ({
                ...p,
                image: p.image ? adImageUrl(ad, `product-${i}`) : '',
            })),
        },
    };
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
        // מודעה מושהית יורדת מהאוויר ושומרת את הימים שנותרו לה
        .filter((ad) => !ad.paused)
        // מיקום ידני שנקבע במסך הניהול גובר על סדר הרכישה
        .sort(bySlotOrder)
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

/** תקרת משקל לשורה: מעליה Strapi (koa-body, 1MB לבקשה) מחזיר שגיאה גנרית.
 *  מקור האמת ב-$lib/ads/adImage — אותו מספר שהבילדר מציג וחוסם לפיו. */
export const MAX_AD_BYTES = MAX_AD_TOTAL_BYTES;

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

/** תוצאת השליחה — כולל מה שההתראה לאדמינים צריכה לדעת על מפרסם חוזר */
export interface SubmitAdResult {
    id: string;
    /** כותרת המודעה הקודמת של אותו מפרסם; ריק = מפרסם חדש */
    replacesTitle: string;
    /** האם אותה קודמת באמת על האתר (ורק אז האישור מחליף אותה) */
    replacesLive: boolean;
}

// ============================================================
// מפרסם חוזר: זיהוי גרסה מעודכנת של מודעה קיימת
// ------------------------------------------------------------
// בבילדר אין "עריכה" של רשומה קיימת — מפרסם ששב לשפר את המודעה שלו
// שולח רשומה חדשה. בלי הקישור שכאן ההתראה לאדמינים נוסחה כבקשה חדשה,
// ואישור שלה הוסיף מודעה שנייה לאותו מפרסם במקום להחליף את הישנה.
// ============================================================

/** טלפון ישראלי מנורמל להשוואה: ספרות בלבד, 972 → 0 */
function normPhone(raw: string | undefined | null): string {
    const digits = (raw ?? '').replace(/\D/g, '').replace(/^972/, '0');
    return digits.length >= 9 ? digits : '';
}

type AdvertiserIdentity = {
    ownerId?: string | null;
    contactEmail?: string;
    landing?: { email?: string; phone?: string };
};

/** מפתחות הזהות של מפרסם — מזהה משתמש, אימייל ופרטי הקשר שבדף הנחיתה */
function identityKeys(ad: AdvertiserIdentity): string[] {
    const keys: string[] = [];
    if (ad.ownerId) keys.push(`id:${ad.ownerId}`);
    const email = (ad.contactEmail || ad.landing?.email || '').trim().toLowerCase();
    if (email) keys.push(`email:${email}`);
    const phone = normPhone(ad.landing?.phone);
    if (phone) keys.push(`phone:${phone}`);
    return keys;
}

function sameAdvertiser(a: AdvertiserIdentity, b: AdvertiserIdentity): boolean {
    const keysB = new Set(identityKeys(b));
    return identityKeys(a).some((k) => keysB.has(k));
}

const byNewest = (a: SubmittedAd, b: SubmittedAd) =>
    Date.parse(b.submittedAt || '') - Date.parse(a.submittedAt || '');

/**
 * מה כבר יש למפרסם הזה: target = המודעה שהשליחה החדשה היא גרסה מעודכנת
 * שלה (מאושרת → ממתינה → נדחתה), stalePending = כל בקשותיו הממתינות,
 * שהשליחה החדשה מייתרת. כשל כאן לא מפיל שליחה.
 */
async function findPredecessors(
    identity: AdvertiserIdentity,
): Promise<{ target: SubmittedAd | null; stalePending: SubmittedAd[] }> {
    let all: SubmittedAd[];
    try {
        all = await listAllForAdmin();
    } catch (e) {
        console.warn('[ads] findPredecessors failed:', e instanceof Error ? e.message : e);
        return { target: null, stalePending: [] };
    }
    const mine = all.filter((a) => !a.supersededBy && sameAdvertiser(a, identity));
    const live = mine.filter((a) => a.status === 'approved').sort(byNewest);
    const stalePending = mine.filter((a) => a.status === 'pending').sort(byNewest);
    const past = mine.filter((a) => a.status === 'rejected').sort(byNewest);
    return { target: live[0] ?? stalePending[0] ?? past[0] ?? null, stalePending };
}

/**
 * מוציא גרסה ישנה מהמחזור אחרי שגרסה מעודכנת נכנסה במקומה. הסטטוס
 * 'rejected' הוא הארכיון — המודעה יורדת מהאוויר ומהתור אבל נשארת במסך
 * הניהול עם הסיבה, ואפשר להחזיר אותה. שום דבר לא נמחק.
 */
async function supersedeAd(oldId: string, newAdId: string, decidedBy: string, reason: string): Promise<void> {
    await mergeExtra(
        oldId,
        {
            decided_at: new Date().toISOString(),
            decided_by: clamp(decidedBy, 120),
            rejection_reason: reason,
            superseded_by: newAdId,
        },
        { status1: 'rejected' },
    );
}

/** יצירת מודעה חדשה — נכנסת תמיד כ-pending */
export async function submitAd(input: SubmitAdInput): Promise<SubmitAdResult> {
    const landing = normalizeLanding(input.landing);
    const logo = safeDataImage(input.logo);
    const mainImage = safeDataImage(input.mainImage);

    const bytes = dataUriBytes(logo) + dataUriBytes(mainImage) + landingBytes(landing);
    if (bytes > MAX_AD_BYTES) throw new AdTooLargeError(bytes);

    // מפרסם חוזר: מחפשים לפני היצירה, כדי שהרשומה החדשה עצמה לא תיספר
    const { target: predecessor, stalePending } = await findPredecessors({
        ownerId: input.ownerId,
        contactEmail: input.contactEmail,
        landing,
    });

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
                // קישור לגרסה הקודמת של אותו מפרסם: ההתראה מדברת על עדכון,
                // והאישור מחליף את הישנה במקום להוסיף מודעה שנייה לידה
                ...(predecessor
                    ? { replaces_ad_id: predecessor.id, replaces_title: predecessor.title }
                    : {}),
            },
            publishedAt: new Date().toISOString(),
        },
    });

    invalidateAdsCache();
    const id = res.data.documentId;

    // בקשות ממתינות קודמות של אותו מפרסם יורדות מהתור: האדמין אמור לראות
    // בקשה אחת לכל מפרסם — האחרונה — ולא שתי בקשות שנראות כפולות.
    // מודעה מאושרת נשארת באוויר עד שהחדשה תאושר, אחרת המשבצת נשארת ריקה.
    for (const stale of stalePending) {
        try {
            await supersedeAd(stale.id, id, 'system', 'הוחלפה בגרסה מעודכנת שהמפרסם שלח');
        } catch (e) {
            console.warn('[ads] retire pending predecessor failed:', e instanceof Error ? e.message : e);
        }
    }

    return {
        id,
        replacesTitle: predecessor?.title ?? '',
        replacesLive: predecessor?.status === 'approved',
    };
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

/**
 * אישור ופרסום. גרסה מעודכנת של מפרסם קיים נכנסת *במקום* הישנה: אותה
 * משבצת ואותו תאריך סיום, ומיד אחרי האישור הישנה יורדת מהאוויר.
 * keepPrevious הוא המקרה ההפוך — מפרסם שבאמת רוצה שתי מודעות במקביל.
 * מחזיר את כותרת המודעה שהוחלפה, כדי שהאדמין יראה מה ירד.
 */
export async function approveAd(
    id: string,
    opts: { durationDays: unknown; decidedBy: string; keepPrevious?: boolean },
): Promise<{ replacedTitle: string }> {
    const current = await getAd(id);
    const replacesId = current?.replacesAdId ?? '';
    const predecessor = replacesId && !opts.keepPrevious ? await getAd(replacesId) : undefined;
    const replacing =
        predecessor && predecessor.status === 'approved' && !predecessor.supersededBy
            ? predecessor
            : null;

    const days = normalizePlanDays(opts.durationDays);
    // התקופה שהמפרסם כבר שילם עליה ממשיכה כרגיל: אותו תאריך פקיעה, לא
    // ספירה חדשה. שדרוג המודעה לא מאריך ולא מקצר את הזמן שנותר לה.
    const inheritedExpiry =
        replacing && !replacing.paused && replacing.expiresAt &&
        Date.parse(replacing.expiresAt) > Date.now()
            ? replacing.expiresAt
            : '';
    await mergeExtra(
        id,
        {
            decided_at: new Date().toISOString(),
            decided_by: clamp(opts.decidedBy, 120),
            duration_days: inheritedExpiry ? replacing!.durationDays : days,
            expires_at: inheritedExpiry || new Date(Date.now() + days * DAY_MS).toISOString(),
            rejection_reason: '',
            // המשבצת בטור עוברת לגרסה החדשה, אחרת היא קופצת לסוף הרשימה
            ...(replacing && typeof replacing.slotOrder === 'number'
                ? { slot_order: replacing.slotOrder }
                : {}),
        },
        { status1: 'active' },
    );

    // סדר הפעולות מכוון: קודם החדשה עולה, רק אחר-כך הישנה יורדת. כשל כאן
    // משאיר את שתיהן באוויר (מצב שהאדמין רואה ומתקן) — עדיף מלהוריד את
    // הישנה ואז להיכשל בהעלאת החדשה ולהשאיר את המפרסם בלי מודעה.
    if (replacing) {
        try {
            await supersedeAd(replacing.id, id, opts.decidedBy, 'הוחלפה בגרסה מעודכנת שאישרת');
            return { replacedTitle: replacing.title };
        } catch (e) {
            console.warn('[ads] supersede on approve failed:', e instanceof Error ? e.message : e);
        }
    }
    return { replacedTitle: '' };
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

/**
 * הורדת מודעה מהאוויר בלי למחוק אותה — חוזרת לממתינה והתוקף מתאפס,
 * כך שהמשבצת מתפנה מיד ואפשר להחזיר אותה באישור מחדש.
 */
export async function unapproveAd(id: string, byAdmin: string): Promise<void> {
    await mergeExtra(
        id,
        {
            decided_at: '',
            decided_by: clamp(byAdmin, 120),
            expires_at: '',
            rejection_reason: '',
        },
        { status1: 'pending' },
    );
}

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 730;

/** מנרמל קלט ימים מהטופס לטווח שפוי (הקציבה הידנית אינה כבולה למסלולים) */
export function normalizeDurationDays(raw: unknown): number {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return DEFAULT_PLAN_DAYS;
    return Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, n));
}

/**
 * קוצב למודעה תקופה חדשה. התקופה נספרת מיום האישור, ולכן קציבה קצרה
 * מהזמן שכבר רץ מורידה את המודעה מהאוויר מיד — וזו המשמעות של "לקצוב".
 * בשונה מ-extendAd שמוסיף זמן על הקיים.
 */
export async function setAdDuration(
    id: string,
    days: number,
): Promise<{ title: string; expiresAt: string; daysLeft: number } | null> {
    const ad = await getAd(id);
    if (!ad) return null;
    const from = ad.decidedAt || ad.submittedAt || new Date().toISOString();
    const expires = new Date(new Date(from).getTime() + days * DAY_MS);
    await mergeExtra(id, { duration_days: days, expires_at: expires.toISOString() });
    return {
        title: ad.title,
        expiresAt: expires.toISOString(),
        daysLeft: Math.ceil((expires.getTime() - Date.now()) / DAY_MS),
    };
}

/**
 * קובע תאריך תפוגה שרירותי (מחלון הקציבה). המשך (duration_days) נגזר
 * ממנו ביחס ליום האישור, כדי שהתצוגה תמשיך להציג משך עקבי.
 */
export async function setAdExpiry(
    id: string,
    expiresIso: string,
): Promise<{ title: string; expiresAt: string; daysLeft: number } | null> {
    const ad = await getAd(id);
    if (!ad) return null;
    const expires = new Date(expiresIso);
    if (isNaN(expires.getTime())) return null;
    const from = ad.decidedAt || ad.submittedAt || new Date().toISOString();
    const days = Math.max(0, Math.ceil((expires.getTime() - Date.parse(from)) / DAY_MS));
    await mergeExtra(id, { duration_days: days, expires_at: expires.toISOString() });
    return {
        title: ad.title,
        expiresAt: expires.toISOString(),
        daysLeft: Math.ceil((expires.getTime() - Date.now()) / DAY_MS),
    };
}

/**
 * השהיה: המודעה יורדת מהאוויר אבל שומרת את הימים שנותרו לה. בשונה
 * מהורדה לממתינות — המפרסם לא מפסיד ימים ששילם עליהם.
 */
export async function pauseAd(id: string): Promise<{ title: string; daysLeft: number } | null> {
    const ad = await getAd(id);
    if (!ad) return null;
    if (ad.paused) return { title: ad.title, daysLeft: ad.pausedDaysLeft ?? 0 };
    const daysLeft = ad.expiresAt
        ? Math.max(0, Math.ceil((new Date(ad.expiresAt).getTime() - Date.now()) / DAY_MS))
        : normalizePlanDays(ad.durationDays);
    await mergeExtra(id, { paused: true, paused_days_left: daysLeft });
    return { title: ad.title, daysLeft };
}

/** המשך אחרי השהיה: הימים שנשמרו נספרים מחדש מהיום. */
export async function resumeAd(
    id: string,
): Promise<{ title: string; expiresAt: string; daysLeft: number } | null> {
    const ad = await getAd(id);
    if (!ad) return null;
    const daysLeft = ad.pausedDaysLeft ?? normalizePlanDays(ad.durationDays);
    const expires = new Date(Date.now() + daysLeft * DAY_MS);
    await mergeExtra(
        id,
        { paused: false, paused_days_left: null, expires_at: expires.toISOString() },
        { status1: 'active' },
    );
    return { title: ad.title, expiresAt: expires.toISOString(), daysLeft };
}

// ============================================================
// לוח המקומות המספרי של הטור (1..AD_SLOTS.length)
// ------------------------------------------------------------
// המיקום נשמר ב-extra_fields.slot_order (0-based) — אין עמודה ייעודית,
// ואותה עמודת json כבר נושאת את כל שאר שדות המודעה. המספר קבוע למודעה
// גם דרך השהיה ופקיעה — כשהיא חוזרת לאוויר היא חוזרת לאותו מקום.
// ============================================================

/** כל המאושרות בסדר התצוגה של הטור: מיקום שמור גובר, אחריו ותיק→חדש */
function approvedInDisplayOrder(all: SubmittedAd[]): SubmittedAd[] {
    return (
        all
            .filter((a) => a.status === 'approved')
            // listAllForAdmin מחזיר חדש→ותיק; סדר המשבצות הוא ותיק→חדש
            .slice()
            .reverse()
            .sort(bySlotOrder)
    );
}

/**
 * המספר האפקטיבי של כל מודעה מאושרת (0-based). מי שכבר נקבע לה מספר —
 * שומרת עליו (בהתנגשות, הראשונה בסדר התצוגה גוברת); מי שאין לה מקבלת
 * את המספר הפנוי הנמוך ביותר, לפי סדר התצוגה הנוכחי. כך מודעות ותיקות
 * בלי מספר מקבלות בדיוק את מקומן של היום — ההקצאה הראשונה לא מזיזה כלום.
 */
function computeSlots(all: SubmittedAd[]): Map<string, number> {
    const display = approvedInDisplayOrder(all);
    const bySlot = new Map<string, number>();
    const taken = new Set<number>();
    for (const ad of display) {
        if (typeof ad.slotOrder === 'number' && ad.slotOrder >= 0 && !taken.has(ad.slotOrder)) {
            bySlot.set(ad.id, ad.slotOrder);
            taken.add(ad.slotOrder);
        }
    }
    let next = 0;
    for (const ad of display) {
        if (bySlot.has(ad.id)) continue;
        while (taken.has(next)) next++;
        bySlot.set(ad.id, next);
        taken.add(next);
    }
    return bySlot;
}

/** מספרי המקומות לתצוגה (1-based) — למסך הניהול שמציג "מקום N מתוך 16" */
export function computeAdSlots(all: SubmittedAd[]): Map<string, number> {
    return new Map([...computeSlots(all)].map(([id, s]) => [id, s + 1]));
}

/**
 * מקבע במסד מספר מקום לכל מודעה מאושרת שעדיין אין לה (או שהמספר השמור
 * מתנגש). כותב רק את מי שהשתנה — בהקצאה הראשונה זו כל הרשימה, ומכאן
 * והלאה כלום. רץ בפעולות ניהול בלבד, לא בנתיבי קריאה.
 */
async function ensureSlotsPersisted(all: SubmittedAd[]): Promise<Map<string, number>> {
    const slots = computeSlots(all);
    // סדרתי בכוונה — mergeExtra עושה GET+PUT לכל מודעה, והרשומות כבדות
    // (תמונות data-URI); מקבילי היה חונק את השרת בבת אחת.
    for (const ad of approvedInDisplayOrder(all)) {
        if (ad.slotOrder !== slots.get(ad.id)) {
            await mergeExtra(ad.id, { slot_order: slots.get(ad.id)! });
        }
    }
    return slots;
}

/**
 * מזיזה מודעה מקום אחד למעלה/למטה בלוח: מחליפה מספרים עם השכנה *שבאוויר*
 * בלבד — מושהית/פגה שומרת את המספר שלה ואינה זזה, ושאר המודעות נשארות
 * במקומן (בלי מספור-מחדש דוחס).
 * מחזירה null אם המודעה לא באוויר או שהיא כבר בקצה הטור.
 */
export async function moveApprovedAd(
    id: string,
    direction: 'up' | 'down',
): Promise<{ title: string; position: number; total: number } | null> {
    const all = await listAllForAdmin();
    const slots = await ensureSlotsPersisted(all);
    const now = Date.now();
    const live = all
        .filter((a) => a.status === 'approved' && !isExpired(a, now) && !a.paused)
        .sort((a, b) => (slots.get(a.id) ?? 0) - (slots.get(b.id) ?? 0));
    const from = live.findIndex((a) => a.id === id);
    if (from === -1) return null;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= live.length) return null;

    const moved = live[from];
    const other = live[to];
    const movedSlot = slots.get(moved.id)!;
    const otherSlot = slots.get(other.id)!;
    await mergeExtra(moved.id, { slot_order: otherSlot });
    await mergeExtra(other.id, { slot_order: movedSlot });
    return { title: moved.title, position: otherSlot + 1, total: AD_SLOTS.length };
}

/**
 * מציבה מודעה מאושרת במקום מספרי מסוים בלוח (1..16). מקום תפוס — השתיים
 * מתחלפות זו בזו; שאר המודעות לא זזות. המספר נשאר קבוע למודעה גם דרך
 * השהיה ופקיעה — כשהיא חוזרת לאוויר היא חוזרת לאותו מקום.
 */
export async function setAdSlot(
    id: string,
    requested: number,
): Promise<{ title: string; slot: number; swappedTitle?: string; swappedSlot?: number } | null> {
    const n = Math.round(Number(requested));
    if (!Number.isFinite(n)) return null;
    const target = Math.min(AD_SLOTS.length, Math.max(1, n)) - 1;

    const all = await listAllForAdmin();
    const ad = all.find((a) => a.id === id && a.status === 'approved');
    if (!ad) return null;
    const slots = await ensureSlotsPersisted(all);
    const cur = slots.get(id) ?? 0;
    if (cur === target) return { title: ad.title, slot: target + 1 };

    const occupant =
        all.find((a) => a.id !== id && a.status === 'approved' && slots.get(a.id) === target) ??
        null;
    await mergeExtra(ad.id, { slot_order: target });
    if (occupant) await mergeExtra(occupant.id, { slot_order: cur });
    return {
        title: ad.title,
        slot: target + 1,
        ...(occupant ? { swappedTitle: occupant.title, swappedSlot: cur + 1 } : {}),
    };
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
