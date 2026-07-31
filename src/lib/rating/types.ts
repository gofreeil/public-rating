// ============================================================
// types.ts - מודל הנתונים של פלטפורמת הדירוג הציבורי
//
// אחסון: פריטי Strapi המשותף (items) עם קטגוריות ייעודיות:
//   pr_official — עובד/נבחר ציבור (label=שם, extra_fields=פרטי תפקיד)
//   pr_review   — דירוג של משתמש (label=id של המדורג ← ניתן לסינון מדויק)
// ============================================================

import type { CriterionKey, Scores } from './criteria';

export const OFFICIAL_CATEGORY = 'pr_official';
export const REVIEW_CATEGORY = 'pr_review';
export const COMMENT_CATEGORY = 'pr_comment';

// ---- קבוצות (לוחות הדירוג) ----

export type GroupKey = 'knesset' | 'judges' | 'public_servants';

export interface Group {
    key: GroupKey;
    /** נתיב הלוח באתר */
    route: string;
    title: string;
    singular: string;
    icon: string;
    /** תווית שדה הארגון בטפסים (סיעה / ערכאה / משרד) */
    orgLabel: string;
    /** תפקידים מוצעים בטופס הוספה */
    positions: string[];
    /** תיאור קצר לכרטיס הקטגוריה בדף הבית */
    blurb: string;
}

export const GROUPS: Group[] = [
    {
        key: 'knesset',
        route: '/knesset',
        title: 'חברי כנסת ושרים',
        singular: 'חבר כנסת',
        icon: '🏛️',
        orgLabel: 'סיעה / מפלגה',
        positions: ['חבר כנסת', 'שר', 'ראש הממשלה', 'יו"ר הכנסת', 'ראש האופוזיציה'],
        blurb: 'נבחרי הציבור בכנסת ובממשלה — חקיקה, תקציב וביצוע',
    },
    {
        key: 'judges',
        route: '/judges',
        title: 'שופטים',
        singular: 'שופט',
        icon: '⚖️',
        orgLabel: 'ערכאה / בית משפט',
        positions: ['נשיא בית המשפט העליון', 'שופט עליון', 'שופט מחוזי', 'שופט שלום', 'רשם'],
        blurb: 'הרשות השופטת — הכרעות, זמני טיפול והגינות דיונית',
    },
    {
        key: 'public_servants',
        route: '/public-servants',
        title: 'עובדי ציבור',
        singular: 'עובד ציבור',
        icon: '🏢',
        orgLabel: 'משרד / רשות',
        positions: ['מנכ"ל משרד', 'יועץ', 'נציב', 'מבקר', 'ראש רשות', 'פקיד בכיר'],
        blurb: 'הפקידות הבכירה והרשויות — שירות, תקנים ושקיפות',
    },
];

export function groupByKey(key: string | undefined | null): Group | undefined {
    return GROUPS.find((g) => g.key === key);
}

/** מקסימום מדורגים בהשוואה (/compare) — מעבר לזה העמודות צרות מדי בנייד */
export const MAX_COMPARE = 4;

// ---- עובד/נבחר ציבור ----

export interface Official {
    /** documentId ב-Strapi */
    id: string;
    name: string;
    group: GroupKey;
    /** תפקיד, למשל "שופט עליון" */
    position: string;
    /** סיעה / ערכאה / משרד */
    org: string;
    /** רקע קצר (אופציונלי) */
    bio: string;
    /** URL תמונת פנים אמיתית (ויקיפדיה/אתר הכנסת); ריק = אווטאר ראשי-תיבות */
    image: string;
    /** הצעות משתמשים ממתינות לאישור אדמין (approved=false) */
    approved: boolean;
    suggested_by: string | null;
    created_at: string;
}

// ---- דירוג (ביקורת של משתמש בודד) ----

export interface Review {
    /** documentId ב-Strapi */
    id: string;
    /** documentId של המדורג (נשמר ב-label לסינון מדויק) */
    official_id: string;
    user_id: string | null;
    /** טקסט חופשי (אופציונלי) */
    text: string;
    scores: Scores;
    /** ממוצע המדדים שדורגו (1-5) */
    overall: number;
    reviewer_name: string;
    anonymous: boolean;
    /** מזהי משתמשים שסימנו "מועיל" */
    helpful_by: string[];
    created_at: string;
    updated_at: string;
}

/**
 * צורת ביקורת בטוחה לשליחה לדפדפן — בלי user_id (שעלול להכיל אימייל),
 * בלי helpful_by גולמי ובלי שם כשהביקורת אנונימית.
 */
export interface PublicReview {
    id: string;
    text: string;
    scores: Scores;
    overall: number;
    anonymous: boolean;
    reviewer_name: string;
    helpfulCount: number;
    markedHelpfulByMe: boolean;
    /** הביקורת של המשתמש המחובר (מאפשר מחיקה עצמית) */
    mine: boolean;
    created_at: string;
}

// ---- תגובה על דירוג ----

export interface OfficialComment {
    /** documentId ב-Strapi */
    id: string;
    /** documentId של המדורג (label — שליפה אחת לכל תגובות הדף) */
    official_id: string;
    /** documentId של הדירוג שעליו הגיבו */
    review_id: string;
    user_id: string | null;
    text: string;
    commenter_name: string;
    /** תגובה של חשבון הדמות המדורגת עצמה (מסומנת כרשמית) */
    official_reply: boolean;
    created_at: string;
}

/** צורת תגובה בטוחה לדפדפן — בלי user_id */
export interface PublicComment {
    id: string;
    review_id: string;
    text: string;
    commenter_name: string;
    official_reply: boolean;
    /** התגובה של המשתמש המחובר (מאפשרת מחיקה עצמית) */
    mine: boolean;
    created_at: string;
}

// ---- סטטיסטיקה מצטברת ----

export interface OfficialStats {
    count: number;
    /** ממוצע כללי (null כשאין דירוגים) */
    average: number | null;
    /** ציון משוקלל לדירוג הוגן בלוחות (בייסיאני, IMDb-style) */
    weighted: number;
    perCriterion: Record<CriterionKey, number | null>;
    /** התפלגות: אינדקס 0 = כוכב 1 ... אינדקס 4 = 5 כוכבים */
    distribution: [number, number, number, number, number];
}

export interface RatedOfficial extends Official {
    stats: OfficialStats;
}
