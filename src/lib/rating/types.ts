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
export const REPORT_CATEGORY = 'pr_report';
export const INQUIRY_CATEGORY = 'pr_inquiry';
export const PROPOSAL_CATEGORY = 'pr_proposal';
export const SURVEY_CATEGORY = 'pr_survey';
export const SYNC_CATEGORY = 'pr_sync';

// ---- קבוצות (לוחות הדירוג) ----

export type GroupKey = 'knesset' | 'judges' | 'public_servants';

export interface Group {
    key: GroupKey;
    /** נתיב הלוח באתר */
    route: string;
    title: string;
    singular: string;
    icon: string;
    /** תמונת הבאנר בכרטיס הקטגוריה בדף הבית (נתיב ב-static) */
    photo: string;
    /** תווית שדה הארגון בטפסים (סיעה / ערכאה / משרד) */
    orgLabel: string;
    /** תפקידים מוצעים בטופס הוספה */
    positions: string[];
    /** תיאור קצר לכרטיס הקטגוריה בדף הבית */
    blurb: string;
    /** המצבה הארצית של הקבוצה — מספר קבוע לתצוגה בכרטיס הקטגוריה */
    tally: string;
}

export const GROUPS: Group[] = [
    {
        key: 'knesset',
        route: '/knesset',
        title: 'חברי כנסת ושרים',
        singular: 'חבר כנסת',
        icon: '🏛️',
        photo: '/images/groups/knesset.jpg',
        orgLabel: 'סיעה / מפלגה',
        positions: ['חבר כנסת', 'שר', 'ראש הממשלה', 'יו"ר הכנסת', 'ראש האופוזיציה'],
        blurb: 'נבחרי הציבור בכנסת ובממשלה — חקיקה, תקציב וביצוע',
        tally: '120 חברי כנסת',
    },
    {
        key: 'judges',
        route: '/judges',
        title: 'שופטים',
        singular: 'שופט',
        icon: '⚖️',
        photo: '/images/groups/judges.jpg',
        orgLabel: 'ערכאה / בית משפט',
        positions: ['נשיא בית המשפט העליון', 'שופט עליון', 'שופט מחוזי', 'שופט שלום', 'רשם'],
        blurb: 'הרשות השופטת — הכרעות, זמני טיפול והגינות דיונית',
        tally: 'כ-750 שופטים',
    },
    {
        key: 'public_servants',
        route: '/public-servants',
        title: 'עובדי ציבור',
        singular: 'עובד ציבור',
        icon: '🏢',
        photo: '/images/groups/public-servants.jpg',
        orgLabel: 'משרד / רשות',
        positions: ['מנכ"ל משרד', 'יועץ', 'נציב', 'מבקר', 'ראש רשות', 'פקיד בכיר'],
        blurb: 'הפקידות הבכירה והרשויות — שירות, תקנים ושקיפות',
        tally: 'כ-80 אלף עובדי מדינה',
    },
];

export function groupByKey(key: string | undefined | null): Group | undefined {
    return GROUPS.find((g) => g.key === key);
}

/** מקסימום מדורגים בהשוואה (/compare) — מעבר לזה העמודות צרות מדי בנייד */
export const MAX_COMPARE = 4;

// ---- עובד/נבחר ציבור ----

/** פרטי קשר רשמיים של המדורג (לשכה/ציבורי — לא פרטי). ריק = לא ידוע */
export interface OfficialContacts {
    email: string;
    phone: string;
    whatsapp: string;
    facebook: string;
    website: string;
}

export const EMPTY_CONTACTS: OfficialContacts = {
    email: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    website: '',
};

export type PromiseStatus = 'kept' | 'in_progress' | 'broken' | 'unknown';

export const PROMISE_STATUSES: { key: PromiseStatus; label: string; icon: string }[] = [
    { key: 'kept', label: 'קוימה', icon: '✅' },
    { key: 'in_progress', label: 'בתהליך', icon: '⏳' },
    { key: 'broken', label: 'הופרה', icon: '❌' },
    { key: 'unknown', label: 'טרם נבחנה', icon: '❔' },
];

export function promiseStatusOf(key: string | undefined | null): PromiseStatus {
    return PROMISE_STATUSES.some((s) => s.key === key) ? (key as PromiseStatus) : 'unknown';
}

/** הבטחה פומבית של המדורג — בסיס למעקב "הבטיח מול קיים" */
export interface OfficialPromise {
    text: string;
    status: PromiseStatus;
}

/**
 * מדד המיניסטרמטר של "שקוף" (shakuf.co.il) — הערכת ביצועי המשרד שבראשות
 * המדורג. נשמר סיכום קצר + קישור לדו"ח המלא, תמיד עם ייחוס למקור.
 * מתעדכן בסנכרון האדמין (knessetSync); null = אין מדד למשרד הזה.
 */
export interface ShakufData {
    /** שם המשרד כפי שמופיע בשקוף ("משרד התחבורה") */
    ministry: string;
    /** משפט הסיכום ("ארבעה מתוך חמישה מדדים קיבלו ציון 'נכשל'") */
    summary: string;
    /** קישור לדו"ח המלא באתר שקוף */
    report_url: string;
    /** מועד העדכון האחרון של העמוד בשקוף (ISO) */
    source_date: string;
    /** מועד הסנכרון לאתר (ISO) */
    synced_at: string;
}

/** תפקיד בציר הזמן של הקדנציה (מ-KNS_PersonToPosition) */
export interface RecordRole {
    /** "חבר הכנסת" · "שר החקלאות וביטחון המזון" · "חבר/ת סיעה" */
    title: string;
    /** תאריך תחילת הכהונה בתפקיד (ISO, יום בלבד) */
    from: string;
    /** תאריך סיום; null = מכהן/ת */
    to: string | null;
}

/** מאזן החקיקה בקדנציה — הצעות שהמדורג יזם כיוזם ראשי */
export interface RecordBills {
    /** סה"כ הצעות חוק כיוזם ראשי */
    lead: number;
    /** הצעות שהוא חתום עליהן אך אינו היוזם */
    cosigned: number;
    /** התקבלו בקריאה שלישית — הפכו לחוק */
    passed: number;
    /** בהליכי חקיקה כרגע */
    in_progress: number;
    /** נעצרו או נדחו */
    stopped: number;
    /** מוזגו עם הצעה אחרת */
    merged: number;
}

/** פריט חקיקה בודד ברזומה */
export interface RecordBill {
    name: string;
    /** תיאור הסטטוס מהכנסת ("הכנה לקריאה שנייה ושלישית") */
    status: string;
    /** תאריך פרסום ברשומות — לחוקים שעברו */
    date: string;
}

/** שאילתה בודדת: מתי הוגשה ומתי נענתה בפועל */
export interface RecordQuery {
    name: string;
    submitted: string;
    /** ריק = טרם נענתה */
    replied: string;
}

/** פיקוח על המשרד שבראשות המדורג — שאילתות שהופנו אליו */
export interface RecordMinistryQueries {
    ministry: string;
    total: number;
    answered: number;
    /** נענו אחרי המועד שנקבע */
    late: number;
    /** האחרונות שהופנו למשרד — כולל אלה שטרם נענו */
    recent: RecordQuery[];
}

/**
 * רזומה פרלמנטרית מהקדנציה — נבנית מה-OData הרשמי של הכנסת בסנכרון האדמין.
 * כל שדה הוא ספירה מנתוני מקור, לא פרשנות.
 */
export interface KnessetRecord {
    /** PersonID בכנסת — לאימות מול המקור */
    person_id: number;
    /** מספר הכנסת שאליה מתייחסים הנתונים */
    knesset_num: number;
    /** מספרי הכנסות שבהן כיהן/ה כח"כ (ותק) */
    knessets: number[];
    /** ציר הזמן של התפקידים בקדנציה הנוכחית */
    roles: RecordRole[];
    bills: RecordBills;
    /** שאילתות שהגיש/ה */
    queries: number;
    /** הצעות לסדר היום שהגיש/ה */
    agenda: number;
    /** רק לשרים — הפיקוח על המשרד */
    ministry_queries: RecordMinistryQueries | null;
    /** דוא"ל הלשכה הרשמי מאתר הכנסת */
    email: string;
    /** ההצעות שהתקבלו בקריאה שלישית — הרשימה המלאה */
    passed_bills: RecordBill[];
    /** ההצעות שנמצאות בהליכי חקיקה — האחרונות שעודכנו */
    active_bills: RecordBill[];
    /** השאילתות האחרונות שהגיש/ה */
    recent_queries: RecordQuery[];
    /** נושאי ההצעות לסדר היום האחרונות */
    recent_agenda: string[];
    synced_at: string;
}

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
    // ---- פרופיל מלא ----
    /** פרטי קשר רשמיים (דוא"ל לשכה, טלפון, רשתות) */
    contacts: OfficialContacts;
    /** הפרופיל אומת ע"י צוות האתר (זהות, תפקיד ופרטי קשר) */
    verified: boolean;
    /** קישור למצע / להתחייבויות פומביות */
    platform_url: string;
    /** קישור לדין וחשבון שנתי שפרסם המדורג */
    annual_report_url: string;
    /** הבטחות פומביות במעקב */
    promises: OfficialPromise[];
    /** תחומי עיסוק והתמחות */
    specialties: string[];
    /** אחוז נוכחות בדיונים/הצבעות (0-100, מנתונים רשמיים); null = אין נתון */
    attendance_score: number | null;
    /** מדד המיניסטרמטר של שקוף למשרד שבראשות המדורג; null = אין */
    shakuf: ShakufData | null;
    /** רזומה פרלמנטרית מה-OData של הכנסת; null = טרם נמשכה (או לא ח"כ) */
    knesset_record: KnessetRecord | null;
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

/**
 * הדירוג של המשתמש המחובר, לטעינת טופס העריכה.
 * בלי user_id ובעיקר בלי helpful_by — מערך זה מכיל מזהים של משתמשים *אחרים*
 * (מי שסימן "מועיל"), ומזהה של חשבון סיסמה הוא `credentials_<אימייל>`.
 */
export interface MyReview {
    id: string;
    text: string;
    scores: Scores;
    overall: number;
    anonymous: boolean;
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

// ---- דיווח על תוכן פוגעני ----

export type ReportReason =
    | 'defamation'
    | 'wrong_person'
    | 'spam'
    | 'abusive'
    // דיווח על התנהלות המדורג עצמו (לא על תוכן באתר)
    | 'breach_of_trust'
    | 'corruption'
    | 'abuse_of_power'
    | 'offensive_conduct'
    | 'other';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
    { key: 'defamation', label: 'לשון הרע או השמצה' },
    { key: 'wrong_person', label: 'זיהוי שגוי — לא מדובר במדורג' },
    { key: 'spam', label: 'ספאם או פרסומת' },
    { key: 'abusive', label: 'שפה פוגענית או הסתה' },
    { key: 'other', label: 'אחר' },
];

/** סיבות לדיווח על התנהלות המדורג עצמו — הפרת אמונים והתנהלות פוגענית */
export const MISCONDUCT_REASONS: { key: ReportReason; label: string }[] = [
    { key: 'breach_of_trust', label: 'הפרת אמונים או ניגוד עניינים' },
    { key: 'corruption', label: 'שחיתות, שוחד או טובות הנאה' },
    { key: 'abuse_of_power', label: 'ניצול לרעה של הסמכות או הפעלת לחץ' },
    { key: 'offensive_conduct', label: 'התנהלות פוגענית, הטרדה או השפלה' },
    { key: 'other', label: 'אחר' },
];

export function reportReasonLabel(key: string): string {
    return (
        REPORT_REASONS.find((r) => r.key === key)?.label ??
        MISCONDUCT_REASONS.find((r) => r.key === key)?.label ??
        'אחר'
    );
}

export interface ContentReport {
    /** documentId ב-Strapi */
    id: string;
    /** documentId של הפריט המדווח (ביקורת, תגובה או המדורג עצמו) */
    target_id: string;
    target_type: 'review' | 'comment' | 'official';
    /** המדורג שבדף שלו נמצא התוכן — לניווט מהאדמין */
    official_id: string;
    official_name: string;
    reason: ReportReason;
    details: string;
    /** דוא"ל למעקב — אופציונלי, גם אורח יכול לדווח */
    reporter_contact: string;
    /** התוכן המדווח כפי שהיה בעת הדיווח — שורד מחיקה של המקור */
    snapshot: string;
    status: 'pending' | 'handled';
    created_at: string;
}

// ---- פנייה ציבורית למדורג ----

export interface OfficialInquiry {
    /** documentId ב-Strapi */
    id: string;
    /** documentId של המדורג (label — שליפה אחת לדף) */
    official_id: string;
    user_id: string | null;
    text: string;
    author_name: string;
    anonymous: boolean;
    /** מזהי משתמשים שהצטרפו לפנייה */
    joined_by: string[];
    /** מענה של חשבון הדמות; ריק = טרם נענתה */
    reply_text: string;
    replied_at: string | null;
    created_at: string;
}

/** צורת פנייה בטוחה לדפדפן — בלי user_id ובלי joined_by גולמי */
export interface PublicInquiry {
    id: string;
    text: string;
    author_name: string;
    anonymous: boolean;
    joinCount: number;
    joinedByMe: boolean;
    mine: boolean;
    reply_text: string;
    replied_at: string | null;
    created_at: string;
}

// ---- הצעה אזרחית (מרחב ההצעות) ----

export type ProposalStatus = 'discussion' | 'submitted' | 'adopted' | 'closed';

export const PROPOSAL_STATUSES: { key: ProposalStatus; label: string; icon: string }[] = [
    { key: 'discussion', label: 'בדיון ציבורי', icon: '💬' },
    { key: 'submitted', label: 'הוגשה לגורם רשמי', icon: '📨' },
    { key: 'adopted', label: 'אומצה', icon: '✅' },
    { key: 'closed', label: 'הדיון הסתיים', icon: '🗄️' },
];

export function proposalStatusOf(key: string | undefined | null): ProposalStatus {
    return PROPOSAL_STATUSES.some((s) => s.key === key) ? (key as ProposalStatus) : 'discussion';
}

export function proposalStatusLabel(key: ProposalStatus): { label: string; icon: string } {
    const s = PROPOSAL_STATUSES.find((x) => x.key === key);
    return s ? { label: s.label, icon: s.icon } : { label: 'בדיון ציבורי', icon: '💬' };
}

/** עדכון בציר הזמן של הצעה (נוסף ע"י אדמין) */
export interface ProposalUpdate {
    date: string;
    text: string;
}

export interface CivicProposal {
    /** documentId ב-Strapi */
    id: string;
    title: string;
    text: string;
    user_id: string | null;
    proposer_name: string;
    anonymous: boolean;
    /** נימוקים בעד / נגד — שורות טקסט */
    pros: string[];
    cons: string[];
    status: ProposalStatus;
    /** הצעות ממתינות לאישור אדמין לפני פרסום (approved=false) */
    approved: boolean;
    /** מזהי משתמשים שתמכו */
    supporters: string[];
    /** מדורגים שקשורים להצעה (מקדמים/רלוונטיים) */
    official_ids: string[];
    updates: ProposalUpdate[];
    created_at: string;
}

/** צורת הצעה בטוחה לדפדפן — בלי user_id ובלי supporters גולמי */
export interface PublicProposal {
    id: string;
    title: string;
    text: string;
    proposer_name: string;
    anonymous: boolean;
    pros: string[];
    cons: string[];
    status: ProposalStatus;
    supportCount: number;
    supportedByMe: boolean;
    mine: boolean;
    official_ids: string[];
    updates: ProposalUpdate[];
    created_at: string;
}

// ---- סקר "מה הכי חשוב לך?" ----

/** תוצאות מצטברות: ממוצע חשיבות 1-5 לכל מדד + מספר משתתפים */
export interface SurveyResults {
    count: number;
    importance: Record<CriterionKey, number | null>;
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
