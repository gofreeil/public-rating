// ============================================================
// /advertise/builder/landing — עורך דף הנחיתה (שלב ב' של הסטודיו).
// דורש התחברות, כמו הבילדר: בלי חשבון אין דרך לנהל את המודעה אחר כך.
// ============================================================

import { redirect } from '@sveltejs/kit';
import { adPlans } from '$lib/ads/plans';
import { isSuperAdmin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    if (!session?.user?.id) {
        redirect(303, `/login?redirect=${encodeURIComponent(event.url.pathname + event.url.search)}`);
    }

    return {
        plans: adPlans,
        layoutUser: { email: session.user.email ?? null, phone: null, nickname: session.user.name ?? null },
        isSuperAdmin: isSuperAdmin(session),
    };
};
