import type { LayoutServerLoad } from './$types';
import { getUserById } from '$lib/server/db';

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // טעינת פרטי משתמש מלאים לתצוגה בדרואר
    let layoutUser = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            layoutUser = await getUserById(session.user.id as string, jwt);
        } catch { /* שקט */ }
    }

    return { session, layoutUser };
};
