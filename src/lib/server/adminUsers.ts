// ============================================================
// adminUsers.ts — פעולות הניהול על משתמשים (סופר-אדמין), משותפות
// לרשימת המשתמשים, לדף המשתמש ולמסך ניהול האדמינים.
//
// הגנות קבועות: לא נוגעים בעצמך (נעילה-עצמית בטעות) ולא בבעל האתר.
// ============================================================

import { fail, type ActionFailure, type RequestEvent } from '@sveltejs/kit';
import { requireSuperAdmin } from './auth';
import { invalidateAdminCounts } from './adminPanel';
import { banUser, getUserById, setUserRole, unbanUser, type DbUser } from './db';

export const OWNER_EMAIL = 'yahavanter@gmail.com';
export const ASSIGNABLE_ROLES = ['user', 'rating_admin', 'super_admin'] as const;

const ROLE_MESSAGES: Record<string, string> = {
    super_admin: 'מונה לסופר-אדמין',
    rating_admin: 'מונה לאדמין',
    user: 'הוסר מתפקיד ניהולי',
};

/** ערך ישן ממינויים קודמים (neighborhood_admin) מוצג ומטופל כאדמין האתר */
export function displayRole(role: string): 'user' | 'rating_admin' | 'super_admin' {
    if (role === 'super_admin') return 'super_admin';
    if (role === 'rating_admin' || role === 'neighborhood_admin') return 'rating_admin';
    return 'user';
}

type Guarded =
    | { error: ActionFailure<{ error: string }>; target?: undefined }
    | { error?: undefined; target: DbUser };

async function guard(event: RequestEvent, userId: string): Promise<Guarded> {
    const session = await event.locals.auth();
    requireSuperAdmin(session);
    if (!userId) return { error: fail(400, { error: 'חסר מזהה משתמש' }) };
    if (userId === (session?.user?.id ?? '')) {
        return { error: fail(400, { error: 'אי אפשר לבצע את הפעולה על עצמך' }) };
    }
    const target = await getUserById(userId).catch(() => undefined);
    if (!target) return { error: fail(404, { error: 'המשתמש לא נמצא' }) };
    if (target.email?.trim().toLowerCase() === OWNER_EMAIL) {
        return { error: fail(400, { error: 'אי אפשר לשנות את בעל האתר' }) };
    }
    return { target };
}

/** actions משותפים: ban / unban / setRole — כל אחד מאמת סופר-אדמין בעצמו */
export const userAdminActions = {
    ban: async (event: RequestEvent) => {
        const userId = String((await event.request.formData()).get('userId') ?? '');
        const g = await guard(event, userId);
        if (g.error) return g.error;
        try {
            await banUser(userId);
            return { success: true, message: `${g.target.name ?? userId} נחסם` };
        } catch (e) {
            return fail(500, { error: `שגיאה בחסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unban: async (event: RequestEvent) => {
        const userId = String((await event.request.formData()).get('userId') ?? '');
        const g = await guard(event, userId);
        if (g.error) return g.error;
        try {
            await unbanUser(userId);
            return { success: true, message: `החסימה של ${g.target.name ?? userId} בוטלה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בביטול חסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    setRole: async (event: RequestEvent) => {
        const fd = await event.request.formData();
        const userId = String(fd.get('userId') ?? '');
        const role = String(fd.get('role') ?? '');
        if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
            return fail(400, { error: 'תפקיד לא תקין' });
        }
        const g = await guard(event, userId);
        if (g.error) return g.error;
        try {
            await setUserRole(userId, role);
            invalidateAdminCounts();
            return { success: true, message: `${g.target.name ?? userId} — ${ROLE_MESSAGES[role]}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון תפקיד: ${e instanceof Error ? e.message : e}` });
        }
    },
};
