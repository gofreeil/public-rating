// ============================================================
// /advertise/manage — הפרסומות שלי: סטטוס, מדדים ותוקף.
// ============================================================

import { redirect } from '@sveltejs/kit';
import { isExpired, listForOwner } from '$lib/server/ads';
import { getAdStats, type AdStatRow } from '$lib/server/adStats';
import type { SubmittedAd } from '$lib/ads/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const userId = session?.user?.id;
    if (!userId) {
        redirect(303, `/login?redirect=${encodeURIComponent('/advertise/manage')}`);
    }

    let ads: SubmittedAd[] = [];
    try {
        ads = await listForOwner(userId);
    } catch (e) {
        console.warn('[advertise/manage] listForOwner failed:', e instanceof Error ? e.message : e);
    }

    let stats: Record<string, AdStatRow> = {};
    try {
        stats = await getAdStats(ads.map((a) => a.id));
    } catch {
        stats = {};
    }

    const now = Date.now();
    return {
        sent: event.url.searchParams.get('sent') === '1',
        ads: ads.map((ad) => ({
            id: ad.id,
            title: ad.title,
            subtitle: ad.subtitle,
            gradientId: ad.gradientId,
            mainImage: ad.mainImage,
            status: ad.status,
            expired: isExpired(ad, now),
            expiresAt: ad.expiresAt,
            daysLeft: ad.expiresAt
                ? Math.ceil((new Date(ad.expiresAt).getTime() - now) / 86_400_000)
                : 0,
            rejectionReason: ad.rejectionReason,
            requestedDurationDays: ad.requestedDurationDays,
            submittedAt: ad.submittedAt,
            stats: stats[ad.id] ?? { impressions: 0, clicks: 0, landing: 0, leads: 0, ctr: 0 },
        })),
    };
};
