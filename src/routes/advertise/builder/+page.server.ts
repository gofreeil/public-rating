// ============================================================
// /advertise/builder — עיצוב הפרסומת ושליחתה לאישור.
// דורש התחברות: בלי חשבון אין דרך לנהל את המודעה אחר כך.
// ============================================================

import { redirect } from '@sveltejs/kit';
import { adPlans } from '$lib/ads/plans';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    if (!session?.user?.id) {
        redirect(303, `/login?redirect=${encodeURIComponent('/advertise/builder')}`);
    }

    return { plans: adPlans, name: session.user.name ?? '' };
};
