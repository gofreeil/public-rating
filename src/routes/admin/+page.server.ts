import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin, requireAdmin, isSuperAdmin } from '$lib/server/auth';
import { getAllUsers, getUserById, banUser, unbanUser, setUserRole, getAllItems, adminDeleteItem } from '$lib/server/db';

// הפאנל פתוח לכל אדמין (מודרציית תוכן); רשימת המשתמשים ומינוי תפקידים —
// למנהל הראשי בלבד, ולכן המשתמשים בכלל לא נשלחים לאדמין רגיל.

const OWNER_EMAIL = 'yahavanter@gmail.com';
const ASSIGNABLE = ['user', 'rating_admin', 'super_admin'];

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    requireAdmin(session);
    const superAdmin = isSuperAdmin(session);

    const jwt = event.cookies.get('strapi_jwt');

    let users: Awaited<ReturnType<typeof getAllUsers>> = [];
    let items: Awaited<ReturnType<typeof getAllItems>> = [];

    if (superAdmin) {
        try {
            users = await getAllUsers(jwt);
        } catch (e) {
            console.warn('[admin] getAllUsers failed:', e);
        }
    }

    try {
        items = await getAllItems();
    } catch (e) {
        console.warn('[admin] getAllItems failed:', e);
    }

    return {
        // ערך ישן ממינויים קודמים (neighborhood_admin) מוצג ומטופל כאדמין האתר
        users: users.map((u) => (u.role === 'neighborhood_admin' ? { ...u, role: 'rating_admin' as const } : u)),
        items,
        superAdmin,
        currentUserId: session?.user?.id ?? '',
    };
};

export const actions: Actions = {
    ban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });
        if (userId === (session?.user?.id ?? '')) {
            return fail(400, { error: 'אי אפשר לחסום את עצמך' });
        }
        const target = await getUserById(userId);
        if (target?.email?.trim().toLowerCase() === OWNER_EMAIL) {
            return fail(400, { error: 'אי אפשר לחסום את בעל האתר' });
        }

        try {
            await banUser(userId);
            return { success: true, message: `משתמש ${userId} נחסם` };
        } catch (e) {
            return fail(500, { error: `שגיאה בחסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await unbanUser(userId);
            return { success: true, message: `חסימת ${userId} בוטלה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בביטול חסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    setRole: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        const role = formData.get('role') as string;

        if (!userId || !ASSIGNABLE.includes(role)) return fail(400, { error: 'בקשה לא תקינה' });

        // הגנות: לא משנים את עצמך (נעילה-עצמית בטעות) ולא את בעל האתר
        if (userId === (session?.user?.id ?? '')) {
            return fail(400, { error: 'אי אפשר לשנות את התפקיד של עצמך' });
        }
        const target = await getUserById(userId);
        if (!target) return fail(404, { error: 'המשתמש לא נמצא' });
        if (target.email?.trim().toLowerCase() === OWNER_EMAIL) {
            return fail(400, { error: 'אי אפשר לשנות את בעל האתר' });
        }

        try {
            await setUserRole(userId, role);
            const labels: Record<string, string> = {
                super_admin: 'מונה למנהל ראשי',
                rating_admin: 'מונה לאדמין האתר',
                user: 'הוסר מתפקיד ניהולי',
            };
            return { success: true, message: `${target.name ?? userId} — ${labels[role]}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון תפקיד: ${e instanceof Error ? e.message : e}` });
        }
    },

    deleteItem: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const itemId = formData.get('itemId') as string;
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });

        try {
            await adminDeleteItem(itemId, session?.user?.id ?? 'admin');
            return { success: true, message: 'הפריט נמחק' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
