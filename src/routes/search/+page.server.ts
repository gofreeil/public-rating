// ============================================================
// /search?q= — חיפוש מדורגים
//
// החליף את חיפוש פריטי השכונה שנשאר מאתר הקהילה: תיבת החיפוש שבכותרת
// מופיעה בכל דף באתר, והפנתה לחיפוש שאין לו שום קשר לדירוג.
//
// הסינון בשרת ולא בלקוח, כדי שקישור ל-?q= יחזיר תוצאות כבר ב-HTML הראשוני.
// ============================================================

import { getRatedOfficials } from '$lib/server/rating';
import { heMatches } from '$lib/rating/heSearch';
import { groupByKey } from '$lib/rating/types';
import type { PageServerLoad } from './$types';

const MAX_RESULTS = 60;

export const load: PageServerLoad = async ({ url }) => {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
    if (!q) return { q: '', results: [], total: 0 };

    try {
        const officials = await getRatedOfficials();
        const matched = officials.filter((o) => heMatches(q, o.name, o.position, o.org));

        return {
            q,
            total: matched.length,
            results: matched.slice(0, MAX_RESULTS).map((o) => {
                const g = groupByKey(o.group);
                return {
                    id: o.id,
                    name: o.name,
                    position: o.position,
                    org: o.org,
                    image: o.image,
                    groupTitle: g?.title ?? '',
                    groupIcon: g?.icon ?? '',
                    groupRoute: g?.route ?? '/',
                    count: o.stats.count,
                    average: o.stats.average,
                };
            }),
        };
    } catch (e) {
        console.warn('[search] load failed:', e instanceof Error ? e.message : e);
        return { q, results: [], total: 0 };
    }
};
