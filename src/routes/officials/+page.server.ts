// ============================================================
// /officials — אינדקס מלא של כל המדורגים
//
// הלוחות מרנדרים רק עשרה כרטיסים ל-HTML הראשוני; השאר נחשפים ב-$state
// בצד לקוח ולעולם לא מגיעים לזחלן. הדף הזה הוא הרשימה המלאה, שטוחה,
// בלי אינטראקטיביות — כל מדורג מקבל קישור פנימי אחד לפחות.
// ============================================================

import { getRatedOfficials } from '$lib/server/rating';
import { GROUPS, type GroupKey } from '$lib/rating/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const officials = await getRatedOfficials();

        const groups = GROUPS.map((g) => ({
            key: g.key as GroupKey,
            title: g.title,
            icon: g.icon,
            route: g.route,
            officials: officials
                .filter((o) => o.group === g.key)
                .map((o) => ({
                    id: o.id,
                    name: o.name,
                    position: o.position,
                    org: o.org,
                    count: o.stats.count,
                    average: o.stats.average,
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'he')),
        })).filter((g) => g.officials.length > 0);

        return {
            groups,
            total: officials.length,
            totalRated: officials.filter((o) => o.stats.count > 0).length,
        };
    } catch (e) {
        console.warn('[officials index] load failed:', e instanceof Error ? e.message : e);
        return { groups: [], total: 0, totalRated: 0 };
    }
};
