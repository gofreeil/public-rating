// ============================================================
// plans.ts - מסלולי הפרסום: תקופה ומחיר, בתשלום מראש.
//
// מקור אמת יחיד לכל מי שנוגע במחיר — דף הפרסום, הבילדר, ה-API,
// מאגר המודעות ומסך האישור — כדי שלא יהיו שני מחירונים באתר.
// שינוי מחיר או תקופה נעשה כאן בלבד.
//
// שימו לב: days הוא גם הערך שנשמר ב-Strapi. הסרת מסלול מהרשימה
// גורמת לשורות קיימות עם אותו ערך ליפול לברירת המחדל.
// ============================================================

export interface AdPlan {
    /** אורך הפרסום בימים — גם המפתח הנשמר */
    days: number;
    /** תווית קצרה לכפתור */
    label: string;
    /** הניסוח המלא לשורת המחירון */
    title: string;
    /** מחיר בשקלים לכל התקופה */
    price: number;
}

export const adPlans: AdPlan[] = [
    { days: 7, label: 'שבוע', title: 'פרסום לשבוע', price: 50 },
    { days: 30, label: '30 יום', title: 'פרסום ל-30 יום', price: 130 },
    { days: 90, label: 'רבעון', title: 'פרסום לרבעון', price: 350 },
    { days: 180, label: 'חצי שנה', title: 'פרסום לחצי שנה', price: 600 },
    { days: 365, label: 'שנה', title: 'פרסום לכל השנה', price: 1000 },
];

export const DEFAULT_PLAN_DAYS = 30;

/** כל ערך שמגיע מבחוץ (דפדפן / Strapi / טופס) מצטמצם לאחד המסלולים */
export function normalizePlanDays(value: unknown): number {
    const days = Number(value);
    return adPlans.some((p) => p.days === days) ? days : DEFAULT_PLAN_DAYS;
}

export function planFor(value: unknown): AdPlan {
    const days = normalizePlanDays(value);
    return adPlans.find((p) => p.days === days) as AdPlan;
}

export function planLabel(value: unknown): string {
    return planFor(value).label;
}

export function planLabelWithPrice(value: unknown): string {
    const p = planFor(value);
    return `${p.title} — ₪${p.price}`;
}
