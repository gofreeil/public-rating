// ============================================================
// rateLimit.ts - הגבלת קצב וזיהוי בוטים בסיסי לפעולות כתיבה
//
// אתר דירוג של נבחרי ציבור הוא היעד הקלאסי להצפה מתואמת: בלי הגבלה,
// סקריפט אחד יכול לפרסם מאות דירוגים בדקה ולהזיז מיקום בלוח. השקלול
// הבייסיאני ממתן מניפולציה אבל לא מונע אותה.
//
// המימוש בזיכרון ולכן פר-אינסטנס: הוא עוצר סקריפט תמים ומעלה את המחיר
// לתוקף, אבל אינו תחליף להגבלה ברמת ה-CDN/פרוקסי.
// ============================================================

import type { RequestEvent } from '@sveltejs/kit';

interface Bucket {
    /** חותמות זמן של הבקשות בחלון הנוכחי */
    hits: number[];
}

const buckets = new Map<string, Bucket>();

/** ניקוי עצל — רץ אחת לכמה קריאות כדי שהמפה לא תגדל ללא גבול */
let opsSinceSweep = 0;
const SWEEP_EVERY = 500;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

function sweep(now: number): void {
    for (const [key, bucket] of buckets) {
        if (!bucket.hits.length || now - bucket.hits[bucket.hits.length - 1] > MAX_WINDOW_MS) {
            buckets.delete(key);
        }
    }
}

/**
 * מזהה יציב למגביל: משתמש מחובר לפי מזהה החשבון, אורח לפי כתובת IP.
 * מזהה המשתמש עדיף — הוא שורד החלפת IP ואינו מעניש רשת משותפת.
 */
export function clientKey(event: RequestEvent, userId?: string | null): string {
    if (userId) return `u:${userId}`;
    try {
        return `ip:${event.getClientAddress()}`;
    } catch {
        return 'ip:unknown';
    }
}

/**
 * חלון מתגלגל: מותר `max` פעולות בכל `windowMs`.
 * מחזיר true כשהפעולה מותרת, false כשיש לחסום.
 */
export function allow(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    if (++opsSinceSweep >= SWEEP_EVERY) {
        opsSinceSweep = 0;
        sweep(now);
    }

    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length >= max) {
        buckets.set(key, bucket);
        return false;
    }
    bucket.hits.push(now);
    buckets.set(key, bucket);
    return true;
}

const HOUR = 60 * 60 * 1000;

/** תקרות לפי סוג פעולה — נדיבות למשתמש אמיתי, חונקות לסקריפט */
export const LIMITS = {
    rate: { max: 12, windowMs: HOUR },
    comment: { max: 20, windowMs: HOUR },
    helpful: { max: 60, windowMs: HOUR },
    suggest: { max: 5, windowMs: HOUR },
    report: { max: 10, windowMs: HOUR },
    /** שליחת דוא"ל ליעד שהמבקש בחר — התקרה החשובה ביותר, פתוח לאנונימי */
    orderEmail: { max: 3, windowMs: HOUR },
    /** פנייה ציבורית למדורג */
    inquire: { max: 5, windowMs: HOUR },
    /** מילת הכרת הטוב על מדורג */
    gratitude: { max: 10, windowMs: HOUR },
    /** הצטרפות לפנייה / תמיכה בהצעה — פעולות מונה קלות */
    join: { max: 60, windowMs: HOUR },
    /** מענה רשמי לפנייה (חשבון הדמות) */
    inquiryReply: { max: 30, windowMs: HOUR },
    /** הגשת הצעה אזרחית למרחב ההצעות */
    propose: { max: 3, windowMs: HOUR },
    /** הצבעה בסקר החשיבות (upsert — עדכון חוזר לגיטימי) */
    survey: { max: 10, windowMs: HOUR },
    /** מדידת פרסומות — נדיב בכוונה: חוסם לולאה מתוסרטת, לא גולש אמיתי */
    adTrack: { max: 120, windowMs: HOUR },
    /** שליחת פרסומת חדשה — כתיבה כבדה (תמונות מוטבעות) */
    adSubmit: { max: 3, windowMs: HOUR },
    /** עריכת פרסומת קיימת בידי בעליה */
    adEdit: { max: 10, windowMs: HOUR },
} as const;

export type LimitName = keyof typeof LIMITS;

/** בדיקה נוחה: allowAction(event, 'rate', userId) */
export function allowAction(
    event: RequestEvent,
    name: LimitName,
    userId?: string | null,
): boolean {
    const { max, windowMs } = LIMITS[name];
    return allow(`${name}:${clientKey(event, userId)}`, max, windowMs);
}

export const TOO_MANY = 'יותר מדי פעולות בזמן קצר — נסו שוב בעוד כמה דקות';

// ============================================================
// ---- זיהוי בוטים בטופס ----
// ============================================================

/** שם שדה הדבש — נראה כמו שדה אמיתי לבוט, מוסתר מהמשתמש */
export const HONEYPOT_FIELD = 'website';
/** חותמת הזמן שבה הטופס הוצג — מילוי מיידי מסגיר אוטומציה */
export const RENDERED_AT_FIELD = 'rendered_at';
/** מתחת לזה אדם לא הספיק לקרוא חמישה מדדים ולנסח נימוק */
const MIN_FILL_MS = 2500;

export interface BotCheck {
    /** שדה הדבש מולא — מקבלים את הבקשה בשקט ולא כותבים כלום */
    trap: boolean;
    /** הטופס נשלח מהר מדי מכדי שאדם מילא אותו */
    tooFast: boolean;
}

export function botCheck(form: FormData): BotCheck {
    const trap = String(form.get(HONEYPOT_FIELD) ?? '').trim().length > 0;

    const rendered = Number(form.get(RENDERED_AT_FIELD));
    // חסר או לא תקין — לא חוסמים (משתמש עם JS מושבת, שעון מוזר)
    const tooFast = Number.isFinite(rendered) && rendered > 0 && Date.now() - rendered < MIN_FILL_MS;

    return { trap, tooFast };
}

export const TOO_FAST = 'הטופס נשלח מהר מדי — בדקו את הפרטים ושלחו שוב';
