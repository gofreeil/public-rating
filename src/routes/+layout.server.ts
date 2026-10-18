import type { LayoutServerLoad } from './$types';
import { getUserById } from '$lib/server/db';
import { adminRoleOf } from '$lib/server/auth';
import { getAdminPending } from '$lib/server/adminPanel';

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

    // תפקיד הניהול + מה שממתין לטיפול — לבועה האדומה על תמונת הפרופיל
    // בהאדר ולפאנל שבאזור האישי. רק לאדמין, ומקאש קצר (adminPanel).
    const adminRole = adminRoleOf(session);
    const pendingCount = adminRole
        ? await getAdminPending().then((p) => p.total).catch(() => 0)
        : 0;

    return { session, layoutUser, adminRole, pendingCount };
};
