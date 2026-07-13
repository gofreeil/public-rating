// ============================================================
// criteria.ts - חמשת מדדי הדירוג של הפלטפורמה
// כל דירוג של עובד/נבחר ציבור נבחן בחמישה מדדים (1-5 כוכבים)
// ============================================================

export type CriterionKey = 'timeliness' | 'contribution' | 'vision' | 'merit' | 'transparency';

export interface Criterion {
    key: CriterionKey;
    icon: string;
    /** כותרת מלאה */
    label: string;
    /** תווית קצרה (לצ'יפים ולעמודות) */
    short: string;
    /** הסבר למשתמש המדרג */
    description: string;
}

export const CRITERIA: Criterion[] = [
    {
        key: 'timeliness',
        icon: '⏱️',
        label: 'עמידה בזמנים ובתקנים',
        short: 'זמנים ותקנים',
        description: 'עמידה בזמנים ובתקנים המקצועיים של התפקיד',
    },
    {
        key: 'contribution',
        icon: '🛡️',
        label: 'תרומה לעם',
        short: 'תרומה לעם',
        description: 'תרומה לכלכלה, לביטחון ולחירות הציבור',
    },
    {
        key: 'vision',
        icon: '🔭',
        label: 'ראיית המציאות',
        short: 'ראיית המציאות',
        description: 'הערכות ותחזיות שהתבררו כנכונות במבחן הזמן',
    },
    {
        key: 'merit',
        icon: '🎯',
        label: 'ניתוח סוגיות לגופו של עניין',
        short: 'לגופו של עניין',
        description: 'מנתח כל סוגיה לגופו של עניין — ללא משוא פנים ושיקולים זרים',
    },
    {
        key: 'transparency',
        icon: '🤝',
        label: 'שקיפות וקשב לציבור',
        short: 'שקיפות וקשב',
        description: 'שקיפות, אוזן קשבת ושיתוף פעולה עם רכזי השכונות',
    },
];

/** ציוני משתמש בודד: מדד → 1-5 (מדד שלא דורג = חסר) */
export type Scores = Partial<Record<CriterionKey, number>>;

export function criterionByKey(key: string): Criterion | undefined {
    return CRITERIA.find((c) => c.key === key);
}

/** ניקוי ואימות ציונים גולמיים מטופס/DB — משאיר רק מדדים חוקיים בטווח 1-5 */
export function sanitizeScores(raw: unknown): Scores {
    const out: Scores = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const c of CRITERIA) {
        const v = Number((raw as Record<string, unknown>)[c.key]);
        if (Number.isFinite(v) && v >= 1 && v <= 5) out[c.key] = Math.round(v);
    }
    return out;
}
