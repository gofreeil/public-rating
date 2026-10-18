// ============================================================
// /admin/users/[id] — הפרופיל המלא של משתמש (סופר-אדמין), כמו בקהילה
// בשכונה: פרטים, תפקיד וחסימה, ומה שהוא עשה באתר — דירוגים, הצעות
// מדורגים ופרסומות.
// ============================================================

import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getUserById } from '$lib/server/db';
import { listAllReviews, listOfficials, listPendingOfficials } from '$lib/server/rating';
import { listForOwner } from '$lib/server/ads';
import { displayRole, OWNER_EMAIL, userAdminActions } from '$lib/server/adminUsers';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    requireSuperAdmin(session);

    const id = event.params.id;
    const user = await getUserById(id, event.cookies.get('strapi_jwt')).catch(() => undefined);
    if (!user) error(404, 'המשתמש לא נמצא');

    const [reviews, officials, pending, ads] = await Promise.all([
        listAllReviews().catch(() => []),
        listOfficials().catch(() => []),
        listPendingOfficials().catch(() => []),
        listForOwner(id).catch(() => []),
    ]);
    const nameOf = new Map(officials.map((o) => [o.id, o.name]));

    return {
        isMe: id === (session?.user?.id ?? ''),
        isOwner: user.email?.trim().toLowerCase() === OWNER_EMAIL,
        user: {
            id: user.id,
            name: user.name,
            nickname: user.nickname,
            email: user.email,
            phone: user.phone,
            city: user.city,
            neighborhood: user.neighborhood,
            avatar_url: user.avatar_url,
            provider: user.provider,
            role: displayRole(user.role),
            banned: user.banned,
            created_at: user.created_at,
        },
        reviews: reviews
            .filter((r) => r.user_id === id)
            .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
            .map((r) => ({
                id: r.id,
                officialId: r.official_id,
                officialName: nameOf.get(r.official_id) ?? 'מדורג שהוסר',
                overall: r.overall,
                text: r.text,
                anonymous: r.anonymous,
                updated_at: r.updated_at,
            })),
        suggestions: pending
            .filter((o) => o.suggested_by === id)
            .map((o) => ({ id: o.id, name: o.name, position: o.position })),
        ads: ads.map((a) => ({ id: a.id, title: a.title, status: a.status, expiresAt: a.expiresAt })),
    };
};

export const actions: Actions = userAdminActions;
