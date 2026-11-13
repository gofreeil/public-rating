// ============================================================
// adDraft.ts — המפתחות המשותפים של טיוטת הפרסומת (דירוג ציבורי)
// ------------------------------------------------------------
// אותו מודול כמו בקהילה בשכונה (src/lib/adDraft.ts שם), בגרסה של האתר
// הזה: הטיוטה חיה ב-localStorage ושלושה מקומות נוגעים בה — מחירון
// (/advertise), הבילדר (/advertise/builder) ועורך דף הנחיתה
// (/advertise/builder/landing). המפתחות כאן במקום אחד כדי שלא יתפזרו
// כמחרוזות.
//
// מה שאין כאן בכוונה: כוונת "משבצת נוספת" ועריכה-במקום של כרטיסי מוצר —
// השרת של האתר הזה מזהה מפרסם חוזר לפי זהות, ועריכה ישירה היא PUT.
// ============================================================

/** הטיוטה עצמה - כל השדות שהמפרסם מילא בבילדר */
export const AD_DRAFT_KEY = 'pr_ad_builder_draft_v1';

/** חותמת ISO של הרגע שבו הפרסומת נשלחה לאישור מהטיוטה הזו */
export const AD_SUBMITTED_KEY = 'pr_ad_builder_submitted_v1';

/** הפרסומת הספציפית שנערכת עכשיו (?edit=<id>) - השליחה היא PUT אליה */
export const AD_EDIT_TARGET_KEY = 'pr_ad_builder_edit_target_v1';

/** המסלול שנבחר במחירון (ימים) - מפתח הגישה לבילדר ובסיס "תרוץ עד" */
export const AD_PLAN_KEY = 'pr_ad_plan_days';
/** ISO של רגע בחירת המסלול */
export const AD_PLAN_AT_KEY = 'pr_ad_plan_at';

/** ניקוי הטיוטה כולה - התחלת פרסומת חדשה מדף חלק */
export function clearAdDraft(): void {
    try { localStorage.removeItem(AD_DRAFT_KEY); } catch { /* ignore */ }
}

export function setAdEditTarget(id: string): void {
    try { localStorage.setItem(AD_EDIT_TARGET_KEY, id); } catch { /* ignore */ }
}

export function getAdEditTarget(): string | null {
    try { return localStorage.getItem(AD_EDIT_TARGET_KEY) || null; } catch { return null; }
}

export function clearAdEditTarget(): void {
    try { localStorage.removeItem(AD_EDIT_TARGET_KEY); } catch { /* ignore */ }
}

/** המסלול שנבחר במחירון, או null כשלא נבחר (הערך עצמו מנורמל בשרת) */
export function getAdPlanDays(): number | null {
    try {
        const n = Number(localStorage.getItem(AD_PLAN_KEY));
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch { return null; }
}

export function setAdPlanDays(days: number): void {
    try {
        localStorage.setItem(AD_PLAN_KEY, String(days));
        localStorage.setItem(AD_PLAN_AT_KEY, new Date().toISOString());
    } catch { /* ignore */ }
}

export function clearAdPlan(): void {
    try {
        localStorage.removeItem(AD_PLAN_KEY);
        localStorage.removeItem(AD_PLAN_AT_KEY);
    } catch { /* ignore */ }
}

/** נקרא אחרי שליחה מוצלחת: מכאן והלאה אין מה לנדנד למפרסם */
export function markAdSubmitted(): void {
    try { localStorage.setItem(AD_SUBMITTED_KEY, new Date().toISOString()); } catch { /* ignore */ }
}

/** נקרא כשהמפרסם באמת עורך משהו אחרי השליחה - הטיוטה שוב "בעבודה" */
export function clearAdSubmitted(): void {
    try { localStorage.removeItem(AD_SUBMITTED_KEY); } catch { /* ignore */ }
}

/** האם הטיוטה שעל המסך כבר נשלחה לאישור ולא נערכה מאז */
export function isAdSubmitted(): boolean {
    try { return Boolean(localStorage.getItem(AD_SUBMITTED_KEY)); } catch { return false; }
}
