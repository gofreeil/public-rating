import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { adminRoleOf } from '$lib/server/auth';
import { emptyPending, getAdminPending } from '$lib/server/adminPanel';

// שומר על כל המסלולים תחת /admin — רק אדמין/סופר-אדמין נכנס (כמו בגמ"ח
// הארצי). כל דף וכל action ממשיכים לבדוק הרשאה בעצמם — כלל 3 ב-CLAUDE.md.
export const load: LayoutServerLoad = async ({ locals, url }) => {
    let session = null;
    try {
        session = await locals.auth();
    } catch {}
    if (!session?.user) redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);

    const role = adminRoleOf(session);
    if (!role) error(403, 'אין לך הרשאת גישה לפאנל הניהול');

    return {
        admin: {
            name: session.user.name ?? '',
            email: session.user.email ?? '',
            role,
        },
        // מוני "ממתין לטיפול" לבועות שבסרגל הניווט
        pending: await getAdminPending().catch(() => emptyPending()),
    };
};
