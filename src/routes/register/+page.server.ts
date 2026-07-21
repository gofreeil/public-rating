import { redirect, fail } from '@sveltejs/kit';
import { registerWithCredentials } from '$lib/server/db';
import { strapiRegister } from '$lib/server/strapiClient';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user) throw redirect(302, '/');
    return {};
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const formData        = await request.formData();
        const username        = (formData.get('username')       as string)?.trim();
        const email           = (formData.get('email')          as string)?.trim().toLowerCase();
        const password        = formData.get('password')        as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!username || !email || !password) {
            return fail(400, { error: 'יש למלא את כל השדות', username, email });
        }
        if (password.length < 6) {
            return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים', username, email });
        }
        if (password !== confirmPassword) {
            return fail(400, { error: 'הסיסמאות אינן תואמות', username, email });
        }

        // 1. יצירת משתמש ב-Strapi users-permissions → קבלת JWT
        let strapiJwt: string | null = null;
        try {
            const { jwt } = await strapiRegister(username, email, password);
            strapiJwt = jwt;
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('Email already taken') || msg.includes('400') || msg.includes('email')) {
                return fail(409, { error: 'אימייל זה כבר רשום. נסה להתחבר.', username, email });
            }
            console.error('[register] strapi error:', msg);
            return fail(500, { error: 'שגיאה בהרשמה. נסה שוב.', username, email });
        }

        // 2. יצירת רשומת פרופיל ב-community-users
        try {
            await registerWithCredentials(username, email, password);
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('Email already taken')) {
                return fail(409, { error: 'אימייל זה כבר רשום. נסה להתחבר.', username, email });
            }
            console.warn('[register] community-users failed:', msg);
        }

        // 3. שמירת Strapi JWT ב-HTTP-only cookie
        if (strapiJwt) {
            cookies.set('strapi_jwt', strapiJwt, {
                httpOnly: true,
                secure:   process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path:     '/',
                maxAge:   60 * 60 * 24 * 7, // 7 ימים
            });
        }

        // welcome=new מפעיל את מסך "ברוכים המצטרפים" עם רשת האתרים אחרי ההתחברות
        // הראשונה — נשתל ביעד ה-redirect שעמוד ההתחברות מעביר כ-callbackUrl.
        throw redirect(302, `/login?registered=1&redirect=${encodeURIComponent('/?welcome=new')}`);
    },
};
