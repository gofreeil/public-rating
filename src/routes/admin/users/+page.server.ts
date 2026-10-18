// ============================================================
// /admin/users — רשימת המשתמשים (סופר-אדמין בלבד), כמו בקהילה בשכונה:
// חיפוש, סינון לפי תפקיד, חסימה, מינוי תפקיד וכניסה לפרופיל המלא.
// ============================================================

import type { Actions, PageServerLoad } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getAllUsers } from '$lib/server/db';
import { listAllReviews } from '$lib/server/rating';
import { displayRole, userAdminActions } from '$lib/server/adminUsers';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    requireSuperAdmin(session);

    const [users, reviews] = await Promise.all([
        getAllUsers(event.cookies.get('strapi_jwt')).catch((e) => {
            console.warn('[admin/users] getAllUsers failed:', e instanceof Error ? e.message : e);
            return null;
        }),
        listAllReviews().catch(() => []),
    ]);

    // כמה דירוגים פרסם כל משתמש — עמודה שימושית לזיהוי מדרגים פעילים
    const reviewCount = new Map<string, number>();
    for (const r of reviews) {
        if (r.user_id) reviewCount.set(r.user_id, (reviewCount.get(r.user_id) ?? 0) + 1);
    }

    return {
        backendUnavailable: users === null,
        currentUserId: session?.user?.id ?? '',
        users: (users ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            city: u.city,
            avatar_url: u.avatar_url,
            provider: u.provider,
            role: displayRole(u.role),
            banned: u.banned,
            created_at: u.created_at,
            reviews: reviewCount.get(u.id) ?? 0,
        })),
    };
};

export const actions: Actions = userAdminActions;
