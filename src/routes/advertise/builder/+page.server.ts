// ============================================================
// /advertise/builder — עיצוב הפרסומת ושליחתה לאישור.
// דורש התחברות: בלי חשבון אין דרך לנהל את המודעה אחר כך.
//
// ?edit=<id> — עריכת פרסומת קיימת (של המפרסם עצמו, או כל פרסומת לאדמין,
// כולל כרטיסים שהופצו מקהילה בשכונה). כל השדות נטענים כאן, כולל התמונות
// כ-data URI ו-adStyle, כדי שהשמירה (PUT /api/ads/[id]) לא תאבד דבר.
// ============================================================

import { redirect } from '@sveltejs/kit';
import { adPlans } from '$lib/ads/plans';
import { isAdmin } from '$lib/server/auth';
import { getAd } from '$lib/server/ads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    if (!session?.user?.id) {
        redirect(303, `/login?redirect=${encodeURIComponent(event.url.pathname + event.url.search)}`);
    }

    const editId = event.url.searchParams.get('edit') ?? '';
    let editAd = null;
    if (editId) {
        try {
            const ad = await getAd(editId);
            if (ad && (ad.ownerId === session.user.id || isAdmin(session))) {
                editAd = {
                    id: ad.id,
                    title: ad.title,
                    subtitle: ad.subtitle,
                    hoverText: ad.hoverText,
                    cta: ad.cta,
                    gradientId: ad.gradientId,
                    logo: ad.logo,
                    mainImage: ad.mainImage,
                    adStyle: ad.adStyle,
                    mainImageFit: ad.mainImageFit,
                    shop: ad.shop === true,
                    landing: ad.landing,
                };
            }
        } catch (e) {
            console.warn('[advertise/builder] edit load failed:', e instanceof Error ? e.message : e);
        }
    }

    return { plans: adPlans, name: session.user.name ?? '', editAd, editMissing: Boolean(editId) && !editAd };
};
