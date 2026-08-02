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
// בכלל: נשמר מזהה, וה-CSS נבחר כאן.
// ============================================================

export interface AdGradient {
    id: string;
    label: string;
    css: string;
    /** צבע טקסט קריא מעל הגרדיאנט */
    ink: string;
}

export const AD_GRADIENTS: AdGradient[] = [
    { id: 'amber', label: 'ענבר', css: 'linear-gradient(135deg, #f59e0b, #ea580c)', ink: '#ffffff' },
    { id: 'blue', label: 'כחול', css: 'linear-gradient(135deg, #2563eb, #4f46e5)', ink: '#ffffff' },
    { id: 'violet', label: 'סגול', css: 'linear-gradient(135deg, #7c3aed, #c026d3)', ink: '#ffffff' },
    { id: 'emerald', label: 'ירוק', css: 'linear-gradient(135deg, #059669, #10b981)', ink: '#ffffff' },
    { id: 'rose', label: 'ורוד', css: 'linear-gradient(135deg, #e11d48, #f43f5e)', ink: '#ffffff' },
    { id: 'cyan', label: 'תכלת', css: 'linear-gradient(135deg, #0891b2, #06b6d4)', ink: '#ffffff' },
    { id: 'slate', label: 'גרפיט', css: 'linear-gradient(135deg, #334155, #64748b)', ink: '#ffffff' },
    { id: 'sunset', label: 'שקיעה', css: 'linear-gradient(135deg, #f43f5e, #f59e0b)', ink: '#ffffff' },
    { id: 'ocean', label: 'ים', css: 'linear-gradient(135deg, #0ea5e9, #6366f1)', ink: '#ffffff' },
    { id: 'gold', label: 'זהב', css: 'linear-gradient(135deg, #ca8a04, #facc15)', ink: '#1f2937' },
];

export const DEFAULT_GRADIENT_ID = 'amber';

export function normalizeGradientId(value: unknown): string {
    const id = String(value ?? '');
    return AD_GRADIENTS.some((g) => g.id === id) ? id : DEFAULT_GRADIENT_ID;
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
