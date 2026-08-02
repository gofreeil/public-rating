// ============================================================
// types.ts - מודל הנתונים של הפרסומות המקומיות
//
// מודעה נשמרת כשורה באוסף המשותף /api/pr-items תחת קטגוריה pr_ad,
// באותה קונבנציה של pr_official / pr_review: label / description /
// user_id / extra_fields / status1. אין content-type חדש ב-Strapi.
//
// העיקרון שמנחה את הקובץ: מודעה נכתבת בידי מפרסם, כלומר כל שדה כאן
// הוא קלט לא-אמין. ההפרדה בין SubmittedAd (צורת השרת, כוללת זהות
// המפרסם) לבין PublicAd / ApprovedAdPublic (מה שמותר לשלוח לדפדפן)
// היא הגבול שמונע דליפת אימיילים לדף שנשמר בקאש ציבורי.
// ============================================================

export const AD_CATEGORY = 'pr_ad';
export const AD_STATS_CATEGORY = 'pr_ad_stats';

/** במסד: pending / active / rejected / deleted. באפליקציה approved במקום active. */
export type AdStatus = 'pending' | 'approved' | 'rejected';

/** תשלום: נקבע בשרת בלבד — לעולם לא מגוף הבקשה */
export type AdPayment = 'pending' | 'paid' | 'owner';

export interface AdProduct {
    id: number;
    name: string;
    price: string;
    /** data:image/... בלבד */
    image: string;
    description: string;
}

/** תוכן דף הנחיתה המקומי (/ads/[id]) */
export interface AdLanding {
    headline: string;
    pitch: string;
    extended: string;
    image: string;
    /** בדיוק שלושה — normalizeLanding מבטיח */
    advantages: [string, string, string];
    uniqueness: string;
    phone: string;
    whatsapp: string;
    /** כתובת http(s) מאומתת, או '' */
    website: string;
    email: string;
    address: string;
    hours: string;
    products: AdProduct[];
}

/** עיצוב הכרטיס בטור הימני — נשמר, בניגוד לגמ"ח ששמר אותו ב-localStorage בלבד */
export interface AdCardStyle {
    title_color: string;
    /** הזזת הכותרת אנכית, באחוזים מגובה הכרטיס */
    title_offset_y: number;
    /** גובה הפס האלכסוני התחתון, באחוזים */
    diag_height: number;
    logo_shape: 'circle' | 'square';
    logo_position: 'top' | 'bottom';
    /** מיקום התמונה בתוך המסגרת, באחוזים (-50..50) */
    image_x: number;
    image_y: number;
    /** זום התמונה (1 = מלא מסגרת) */
    image_zoom: number;
}

/** ברירות המחדל של עיצוב הכרטיס — מקור אמת יחיד לעורך ולתצוגה */
export const DEFAULT_CARD_STYLE: AdCardStyle = {
    title_color: '#ffffff',
    title_offset_y: 0,
    diag_height: 0,
    logo_shape: 'circle',
    logo_position: 'top',
    image_x: 0,
    image_y: 0,
    image_zoom: 1,
};

/** הצורה המלאה בשרת — כוללת שדות שלעולם לא עוזבים אותו */
export interface SubmittedAd {
    /** documentId — מזהה ציבורי, מופיע ב-/ads/[id] ובמפתחות המדדים */
    id: string;
    status: AdStatus;
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    /** מזהה מתוך רשימת הפריסטים הסגורה — לא ערך CSS */
    gradientId: string;
    logo: string;
    mainImage: string;
    style: Partial<AdCardStyle>;
    landing: AdLanding;

    // ---- זהות ותפעול: שרת בלבד ----
    /** user_id של המפרסם (עמודה עליונה, מאפשרת סינון בצד Strapi) */
    ownerId: string | null;
    /** שם תצוגה בלבד. האימייל יושב ב-contactEmail ולא נשלח לדפדפן. */
    submittedByName: string;
    contactEmail: string;
    decidedBy: string;

    submittedAt: string;
    editedAt: string;
    decidedAt: string;
    expiresAt: string;
    durationDays: number;
    requestedDurationDays: number;
    rejectionReason: string;
    payment: AdPayment;
    /** סך הבייטים של כל ה-data URI בשורה — נחתם בכתיבה */
    bytes: number;
}

/** מה שהטור הימני ופרסומת הנייד מקבלים — בלי שום זהות */
export interface ApprovedAdPublic {
    id: string;
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    gradientId: string;
    logo: string;
    mainImage: string;
    style: Partial<AdCardStyle>;
}

/** מה שדף הנחיתה הציבורי מקבל — תוכן בלבד */
export interface PublicAd extends ApprovedAdPublic {
    landing: AdLanding;
}

/** שורה מקוצרת לתור האישורים — בלי extra_fields, כדי לא לגרור תמונות */
export interface PendingAdBrief {
    id: string;
    title: string;
    submittedAt: string;
}

/** ברירת מחדל לדף נחיתה ריק — כל קורא יכול להניח שכל מפתח קיים */
export function emptyLanding(): AdLanding {
    return {
        headline: '',
        pitch: '',
        extended: '',
        image: '',
        advantages: ['', '', ''],
        uniqueness: '',
        phone: '',
        whatsapp: '',
        website: '',
        email: '',
        address: '',
        hours: '',
        products: [],
    };
}
