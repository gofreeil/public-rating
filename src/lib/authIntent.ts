// "הבקשה הראשונה" של מי שנשלח להירשם/להתחבר באמצע פעולה.
//
// אורח שלוחץ על פעולה שדורשת חשבון נשלח להתחברות עם יעד חזרה. בסיום ההרשמה/התחברות
// הוא נוחת ביעד עם ?welcome=..., ומסך הפתיחה (WelcomeScreen) מציג:
// "השלמת את ההרשמה! כעת תועבר לבקשתך הראשונה — <תיאור>" ונסגר אל הבקשה עצמה.
// תיאור יש רק ליעדים שהם פעולה; דף הבית, דפי עיון והאזור האישי אינם "בקשה".
// פעולה בתוך דף רגיל (דירוג, פנייה, הצבעה בסקר) מסומנת ביעד ב-?intent=.

export const INTENT_PARAM = 'intent';

const INTENTS: Record<string, string> = {
    rate: 'דירוג נבחר/ת הציבור',
    inquiry: 'שליחת פנייה לנבחר/ת הציבור',
    survey: 'הצבעה על סדר החשיבות',
};

const ROUTE_LABELS: Array<[RegExp, string]> = [
    [/^\/officials\/[^/]+\/gratitude$/, 'כתיבת הכרת הטוב'],
    [/^\/suggest$/, 'הצעת נבחר/ת לדירוג'],
    [/^\/my-ratings$/, 'הדירוגים שלי'],
    [/^\/advertise\/manage(\/|$)/, 'ניהול המודעות שלך'],
    [/^\/advertise(\/|$)/, 'בניית מודעה'],
    [/^\/admin(\/|$)/, 'ממשק הניהול'],
];

/** נתיב + intent, למשל withIntent('/officials/7', 'rate') → '/officials/7?intent=rate' */
export function withIntent(path: string, intent: string): string {
    const u = new URL(path, 'http://x');
    u.searchParams.set(INTENT_PARAM, intent);
    return `${u.pathname}${u.search}${u.hash}`;
}

/** תיאור הבקשה לפי נתיב היעד (כולל query), או null כשהיעד אינו בקשה */
export function describeReturn(pathAndSearch: string): string | null {
    let url: URL;
    try { url = new URL(pathAndSearch, 'http://x'); } catch { return null; }
    const intent = url.searchParams.get(INTENT_PARAM);
    if (intent && INTENTS[intent]) return INTENTS[intent];
    const path = url.pathname.replace(/\/+$/, '') || '/';
    for (const [re, label] of ROUTE_LABELS) if (re.test(path)) return label;
    return null;
}
