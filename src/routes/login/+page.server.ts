import { redirect, fail } from '@sveltejs/kit';
import { getUserByEmail } from '$lib/server/db';
import { strapiLogin } from '$lib/server/strapiClient';
import { oauthEnabled } from '../../auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (session?.user) {
        const redirectTo = event.url.searchParams.get('redirect') ?? '/';
        throw redirect(302, redirectTo);
    }

    return {
        oauth: oauthEnabled,
        redirectTo:  event.url.searchParams.get('redirect') ?? '/',
        error:       event.url.searchParams.get('error') ?? null,
        registered:  event.url.searchParams.get('registered') === '1',
    };
};

export const actions: Actions = {
    /**
     * שלב 1: בדיקת אימייל+סיסמה בשרת (validation + Strapi JWT cookie).
     * אם הכל תקין, מחזיר { success: true } -
     * ואז הקליינט קורא ל-signIn('credentials') של Auth.js.
     */
    credentials: async (event) => {
        const { cookies } = event;
        const formData   = await event.request.formData();
        const email      = (formData.get('email')    as string)?.trim().toLowerCase();
        const password   = formData.get('password')  as string;

        if (!email || !password) {
            return fail(400, { error: 'יש למלא אימייל וסיסמה' });
        }

        // בדיקה אם המשתמש קיים
        const existingUser = await getUserByEmail(email);
        if (!existingUser) {
            return fail(401, { error: 'אימייל זה לא רשום. האם ברצונך להירשם?' });
        }
        if (existingUser.provider !== 'credentials') {
            return fail(401, { error: `חשבון זה מחובר דרך ${existingUser.provider}. התחבר עם הכפתור המתאים.` });
        }

        // קבלת Strapi JWT ושמירה ב-HTTP-only cookie
        try {
            const { jwt } = await strapiLogin(email, password);
            cookies.set('strapi_jwt', jwt, {
                httpOnly: true,
                secure:   process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path:     '/',
                maxAge:   60 * 60 * 24 * 7, // 7 ימים
            });
        } catch {
            return fail(401, { error: 'סיסמה שגויה. נסה שוב.' });
        }

        // הצלחה - הקליינט ימשיך עם signIn של Auth.js
        return { success: true };
    },
};
