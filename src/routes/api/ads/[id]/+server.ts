// ============================================================
// PUT /api/ads/[id] — עריכת תוכן בידי בעל המודעה.
//
// הסטטוס, התוקף, המסלול והתשלום אינם נגעים כאן: מפרסם עורך תוכן,
// לא את תנאי הפרסום שלו.
//
// הבעלות היא השוואת מחרוזת אחת מול העמודה user_id. באתר המקור נדרש
// לשם כך מודול שלם שמייצר מפתחות בעלות בכמה פורמטים, מפני ששם הבעלים
// נשמר רק בתוך ה-JSON.
//
// מגבלה ידועה ומכוונת: עריכה של מודעה שכבר אושרה אינה מחזירה אותה
// לתור האישורים, כדי לא להוריד מפרסם משלם מהאוויר. במסך הניהול היא
// מסומנת בתג "נערכה אחרי האישור".
// ============================================================

import { json } from '@sveltejs/kit';
import { AdTooLargeError, getAd, updateAdContent } from '$lib/server/ads';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const userId = session?.user?.id;
    if (!userId) return json({ ok: false, error: 'יש להתחבר' }, { status: 401 });
    if (!allowAction(event, 'adEdit', userId)) {
        return json({ ok: false, error: TOO_MANY }, { status: 429 });
    }

    let ad;
    try {
        ad = await getAd(event.params.id);
    } catch {
        return json({ ok: false, error: 'המערכת עמוסה כרגע' }, { status: 502 });
    }
    if (!ad) return json({ ok: false, error: 'הפרסומת לא נמצאה' }, { status: 404 });

    const isAdmin = session?.user?.role === 'super_admin';
    if (ad.ownerId !== userId && !isAdmin) {
        return json({ ok: false, error: 'אין הרשאה לערוך פרסומת זו' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ ok: false, error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const title = String(body.title ?? '').trim();
    if (!title) return json({ ok: false, error: 'חסרה כותרת' }, { status: 400 });

    try {
        await updateAdContent(event.params.id, {
            title,
            subtitle: String(body.subtitle ?? ''),
            hoverText: String(body.hoverText ?? ''),
            cta: String(body.cta ?? ''),
            gradientId: String(body.gradientId ?? ''),
            logo: String(body.logo ?? ''),
            mainImage: String(body.mainImage ?? ''),
            style: body.style,
            landing: body.landing,
        });
        return json({ ok: true });
    } catch (e) {
        if (e instanceof AdTooLargeError) {
            return json({ ok: false, error: e.message }, { status: 400 });
        }
        console.error('[ads] update failed:', e);
        return json({ ok: false, error: 'שגיאה בשמירה — נסו שוב' }, { status: 502 });
    }
};
