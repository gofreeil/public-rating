import { handle as authHandle } from './auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

/**
 * אחרי auth - אם המשתמש מחובר ויש לו strapiJwt בסשן אך אין cookie,
 * נשמור את ה-JWT ב-HttpOnly cookie (ל-7 ימים).
 * מאפשר לכל שרת-אקשן לקרוא את הטוקן מה-cookie ולשלוח ל-Strapi.
 */
/** בדיקת חסימה - אם המשתמש banned מפנים לדף חסימה */
const checkBanned: Handle = async ({ event, resolve }) => {
    // לא חוסם את דף החסימה עצמו, login, ו-API של auth
    const path = event.url.pathname;
    if (path === '/banned' || path.startsWith('/api/auth') || path === '/login') {
        return resolve(event);
    }
    try {
        const session = await event.locals.auth();
        if (session?.user?.banned) {
            return new Response(null, {
                status: 302,
                headers: { location: '/banned' },
            });
        }
    } catch { /* ignore */ }
    return resolve(event);
};

const setStrApiCookie: Handle = async ({ event, resolve }) => {
    if (!event.cookies.get('strapi_jwt')) {
        try {
            const session = await event.locals.auth();
            const jwt = (session?.user as { strapiJwt?: string } | undefined)?.strapiJwt;
            if (jwt) {
                event.cookies.set('strapi_jwt', jwt, {
                    httpOnly: true,
                    secure:   process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path:     '/',
                    maxAge:   60 * 60 * 24 * 7,
                });
            }
        } catch { /* ignore - session unavailable */ }
    }
    return resolve(event);
};

/**
 * נתיב תמונות המודעות - ציבורי לחלוטין ולא תלוי-משתמש, ולכן עוקף את
 * שרשרת ה-auth: @auth/sveltekit מוסיף Set-Cookie לתשובות, ו-Vercel לעולם
 * לא שומר בקאש הקצה תשובה שנושאת עוגייה. בלי העקיפה ה-CDN היה מחזיר MISS
 * בכל בקשת תמונה והבייטים היו יוצאים מה-origin מחדש בכל פעם (נמדד ואומת
 * באתרי-האח).
 */
const PUBLIC_IMAGE_PATH = /^\/api\/ad-image\/[^/]+\/[^/]+$/;

// נתיבי סריקה של בוטים (וורדפרס/PHP/קבצי סודות) — לאתר הזה אין אף אחד מהם. בלי הקיצור כל
// ניסיון כזה מרנדר את דף ה-404 המלא (כולל ה-layout) ועולה זמן CPU; עונים בשורה אחת, ו-s-maxage
// נותן ל-CDN של Vercel לזכור את התשובה כך שחזרה על אותו נתיב לא מגיעה לפונקציה.
const JUNK_PATH =
    /\.(?:php\d*|aspx?|jsp|cgi)$|^\/(?:wp-[^/]*|wordpress|phpmyadmin|cgi-bin|\.env[^/]*|\.git|\.aws|\.ssh)(?:\/|$)/i;

// עוגיית הסשן של Auth.js (גם בגרסה המאובטחת __Secure-, וגם כשהיא מפוצלת ל-.0/.1)
const SESSION_COOKIE = /(?:^|;\s*)[^=;\s]*session-token[^=;]*=/;

/**
 * מבקר בלי עוגיית סשן הוא אנונימי בהכרח, ו-Auth.js היה מחזיר לו null בכל מקרה — אבל רק אחרי
 * שבנה את כל ההגדרות מחדש (וזה קורה בכל בקשה, גם של בוטים). בלי עוגייה — null מיד.
 * רץ אחרי authHandle, כך שנתיבי /auth/* (התחברות) ממשיכים להיות מטופלים כרגיל.
 */
const skipAuthWhenAnonymous: Handle = async ({ event, resolve }) => {
    if (!SESSION_COOKIE.test(event.request.headers.get('cookie') ?? '')) {
        (event.locals as unknown as Record<string, unknown>).auth = async () => null;
    }
    return resolve(event);
};

/**
 * עוטפים את ה-handle של Auth ב-try/catch.
 * אם ה-JWT קיים בעוגייה אבל לא תקין (למשל AUTH_SECRET שונה),
 * @auth/sveltekit עלול לזרוק - ואז כל הדפים מקבלים 500.
 * הפתרון: אם handle זורק, נמשיך ב-resolve רגיל (משתמש אנונימי).
 */
export const handle: Handle = async ({ event, resolve }) => {
    if (event.request.method === 'GET' && JUNK_PATH.test(event.url.pathname)) {
        return new Response('Not found', {
            status: 404,
            headers: {
                'content-type': 'text/plain; charset=utf-8',
                'cache-control': 'public, s-maxage=86400',
            },
        });
    }
    if (PUBLIC_IMAGE_PATH.test(event.url.pathname)) {
        (event.locals as unknown as Record<string, unknown>).auth = async () => null;
        return await resolve(event);
    }
    try {
        return await sequence(authHandle, skipAuthWhenAnonymous, checkBanned, setStrApiCookie)({ event, resolve });
    } catch (err) {
        console.warn('[hooks] auth handle threw - continuing anonymously:', err);
        return await resolve(event);
    }
};
