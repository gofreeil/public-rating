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
 * עוטפים את ה-handle של Auth ב-try/catch.
 * אם ה-JWT קיים בעוגייה אבל לא תקין (למשל AUTH_SECRET שונה),
 * @auth/sveltekit עלול לזרוק - ואז כל הדפים מקבלים 500.
 * הפתרון: אם handle זורק, נמשיך ב-resolve רגיל (משתמש אנונימי).
 */
export const handle: Handle = async ({ event, resolve }) => {
    try {
        return await sequence(authHandle, checkBanned, setStrApiCookie)({ event, resolve });
    } catch (err) {
        console.warn('[hooks] auth handle threw - continuing anonymously:', err);
        return await resolve(event);
    }
};
