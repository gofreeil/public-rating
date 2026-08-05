// ============================================================
// POST /api/ads/submit — שליחת מודעה חדשה מהבילדר.
//
// ארבעה הבדלים מהמקור, כולם מכוונים:
// 1. חובה להיות מחובר. במקור השליחה אנונימית — וזו לא תכונה אלא מלכודת:
//    הדשבורד מזהה בעלות לפי המשלוח, כך שמודעה ששולחה בלי חשבון אינה
//    ניתנת לניהול לעולם. בנוסף זו הייתה נקודת כתיבה לא-מאומתת אל אותו
//    אוסף שבו יושבים המדורגים והדירוגים.
// 2. תקרת קצב (3 לשעה).
// 3. תקרת גודל אמיתית בשרת, לא רק בדפדפן.
// 4. payment נקבע בשרת בלבד. במקור היה קוד-סוד שהמשלוח יכול היה לשלוח
//    כדי לסמן את עצמו כמשולם; כאן סופר-אדמין מקבל 'owner' אוטומטית,
//    וכל השאר 'pending' עד שהאדמין מאשר.
// ============================================================

import { json } from '@sveltejs/kit';
import { AdTooLargeError, submitAd } from '$lib/server/ads';
import { notifyAdminsNewAd } from '$lib/server/adsNotify';
import { normalizePlanDays } from '$lib/ads/plans';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const userId = session?.user?.id;
    if (!userId) {
        return json(
            { ok: false, error: 'יש להתחבר כדי לשלוח פרסומת', login: '/login?redirect=/advertise/builder' },
            { status: 401 },
        );
    }
    if (!allowAction(event, 'adSubmit', userId)) {
        return json({ ok: false, error: TOO_MANY }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ ok: false, error: 'נתונים לא תקינים' }, { status: 400 });
    }

    // שדה דבש ייעודי: שם השדה הכללי הוא 'website', וכאן זה שדה אמיתי
    // שהמפרסם ממלא — שימוש חוזר בו היה דוחה כל מפרסם עם אתר.
    if (String(body.company_url ?? '').trim()) return json({ ok: true, id: '' });

    const title = String(body.title ?? '').trim();
    if (!title) return json({ ok: false, error: 'חסרה כותרת לפרסומת' }, { status: 400 });

    try {
        const id = await submitAd({
            title,
            subtitle: String(body.subtitle ?? ''),
            hoverText: String(body.hoverText ?? ''),
            cta: String(body.cta ?? ''),
            gradientId: String(body.gradientId ?? ''),
            logo: String(body.logo ?? ''),
            mainImage: String(body.mainImage ?? ''),
            style: body.style,
            landing: body.landing,
            requestedDurationDays: body.requestedDurationDays,
            ownerId: userId,
            ownerName: session?.user?.name ?? '',
            contactEmail: session?.user?.email ?? '',
            payment: session?.user?.role === 'super_admin' ? 'owner' : 'pending',
        });
        // התראה לאדמינים — בלעדיה הפרסומת נשמרה כ"ממתינה לאישור" בשקט
        // מוחלט, ואיש לא ידע עליה עד שמישהו נכנס במקרה ל-/admin/ads.
        // best-effort: לעולם לא מפילה את ההגשה עצמה.
        await notifyAdminsNewAd({
            adTitle: title,
            advertiserName: session?.user?.name ?? '',
            advertiserEmail: session?.user?.email ?? '',
            durationDays: normalizePlanDays(body.requestedDurationDays),
            payment: session?.user?.role === 'super_admin' ? 'owner' : 'pending',
        });
        return json({ ok: true, id });
    } catch (e) {
        if (e instanceof AdTooLargeError) {
            return json({ ok: false, error: e.message }, { status: 400 });
        }
        // רשת ביטחון: אם בכל זאת עברנו את תקרת koa-body של Strapi (~1MB
        // לבקשה), שהמפרסם יקבל הנחיה שאפשר לפעול לפיה ולא "שגיאה בשליחה"
        if (e instanceof Error && e.message.includes('→ 413')) {
            return json({ ok: false, error: 'התמונות כבדות מדי — הקטינו תמונה ונסו שוב' }, { status: 413 });
        }
        console.error('[ads] submit failed:', e);
        return json({ ok: false, error: 'שגיאה בשליחה — נסו שוב בעוד רגע' }, { status: 502 });
    }
};
