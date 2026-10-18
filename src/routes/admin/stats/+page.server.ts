// ============================================================
// /admin/stats — סטטיסטיקה (סופר-אדמין בלבד), כמו בקהילה בשכונה:
// מוני על, נרשמים ודירוגים לפי חודש, פילוח המדורגים, ולוח המכוונים
// של השרת. כל מקור נטען בנפרד — כשל באחד לא מפיל את הדף.
// ============================================================

import type { PageServerLoad } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getAllUsers } from '$lib/server/db';
import { listAllReviews, listOfficials, listProposals } from '$lib/server/rating';
import { listApproved } from '$lib/server/ads';
import { getServerHealth } from '$lib/server/serverHealth';
import { GROUPS } from '$lib/rating/types';

type MonthCount = { month: string; count: number };

/** ספירה לפי "YYYY-MM" מתוך תאריכי ISO */
function byMonth(dates: string[]): MonthCount[] {
    const m = new Map<string, number>();
    for (const d of dates) {
        const key = (d || '').slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(key)) m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort().map(([month, count]) => ({ month, count }));
}

export const load: PageServerLoad = async (event) => {
    requireSuperAdmin(await event.locals.auth());

    const [users, reviews, officials, proposals, liveAds, serverHealth] = await Promise.all([
        getAllUsers(event.cookies.get('strapi_jwt')).catch(() => []),
        listAllReviews().catch(() => []),
        listOfficials().catch(() => []),
        listProposals().catch(() => []),
        listApproved().catch(() => []),
        getServerHealth(),
    ]);

    const groupOf = new Map(officials.map((o) => [o.id, o.group]));
    const monthKey = new Date().toISOString().slice(0, 7);
    const raters = new Set(reviews.map((r) => r.user_id).filter(Boolean));
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.overall, 0) / reviews.length : null;

    return {
        totals: {
            users: users.length,
            usersThisMonth: users.filter((u) => (u.created_at || '').startsWith(monthKey)).length,
            reviews: reviews.length,
            reviewsThisMonth: reviews.filter((r) => (r.created_at || '').startsWith(monthKey)).length,
            raters: raters.size,
            avgScore: avg,
            officials: officials.length,
            proposals: proposals.length,
            liveAds: liveAds.length,
        },
        registrations: byMonth(users.map((u) => u.created_at)),
        reviewsByMonth: byMonth(reviews.map((r) => r.created_at)),
        groups: GROUPS.map((g) => ({
            key: g.key,
            icon: g.icon,
            title: g.title,
            officials: officials.filter((o) => o.group === g.key).length,
            reviews: reviews.filter((r) => groupOf.get(r.official_id) === g.key).length,
        })),
        serverHealth,
    };
};
