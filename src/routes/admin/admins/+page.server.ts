// ============================================================
// /admin/admins — ניהול אדמינים (סופר-אדמין בלבד), כמו בגמ"ח הארצי.
//
// ההבדל מהגמ"ח: כאן התפקיד יושב על רשומת המשתמש עצמה (role) ולא
// ברשימה נפרדת של מזהים — לכן מוסיפים אדמין מתוך המשתמשים הרשומים,
// וההרשאה נכנסת לתוקף בהתחברות/רענון הסשן הבא שלו.
// ============================================================

import type { Actions, PageServerLoad } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getAllUsers } from '$lib/server/db';
import { displayRole, OWNER_EMAIL, userAdminActions } from '$lib/server/adminUsers';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    requireSuperAdmin(session);

    const users = await getAllUsers(event.cookies.get('strapi_jwt')).catch((e) => {
        console.warn('[admin/admins] getAllUsers failed:', e instanceof Error ? e.message : e);
        return null;
    });

    const admins = (users ?? [])
        .map((u) => ({
            id: u.id,
            name: u.name ?? '',
            email: u.email ?? '',
            phone: u.phone ?? '',
            avatar_url: u.avatar_url,
            role: displayRole(u.role),
            owner: u.email?.trim().toLowerCase() === OWNER_EMAIL,
        }))
        .filter((u) => u.role !== 'user' || u.owner)
        // סופר-אדמינים קודם, ואז לפי שם
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, 'he') : a.role === 'super_admin' ? -1 : 1));

    return {
        backendUnavailable: users === null,
        currentUserId: session?.user?.id ?? '',
        admins,
    };
};

// מינוי, שינוי תפקיד והסרה (= חזרה ל"משתמש") — כולם setRole עם אותן הגנות
export const actions: Actions = { setRole: userAdminActions.setRole };
