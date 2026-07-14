// ============================================================
// דף הבית — נתוני דירוג רזים: מובילים, טעוני שיפור, ביקורות אחרונות
// ============================================================

import { getRatedOfficials, listAllReviews } from '$lib/server/rating';
import { GROUPS, type GroupKey } from '$lib/rating/types';
import type { PageServerLoad } from './$types';

function emptyGroupCounts(): Record<GroupKey, number> {
    const out = {} as Record<GroupKey, number>;
    for (const g of GROUPS) out[g.key] = 0;
    return out;
}

export const load: PageServerLoad = async () => {
    try {
        const [officials, reviews] = await Promise.all([getRatedOfficials(), listAllReviews()]);

        // officials כבר ממוינים בדירוג הוגן (משוקלל יורד, לא-מדורגים בסוף)
        const rated = officials.filter((o) => o.stats.count > 0);

        // שלושת המובילים ושלושת הנמוכים בכל קטגוריה.
        // תחתית רק מסף 3 דירוגים — לא מכתירים "נמוך ביותר" על סמך כוכב בודד.
        const showcase = GROUPS.map((g) => {
            const groupRated = rated.filter((o) => o.group === g.key);
            const top = groupRated.slice(0, 3);
            const topIds = new Set(top.map((o) => o.id));
            const bottom = groupRated
                .filter((o) => o.stats.count >= 3 && !topIds.has(o.id))
                .sort((a, b) => a.stats.weighted - b.stats.weighted)
                .slice(0, 3); // הנמוך ביותר ראשון
            return { key: g.key, top, bottom };
        }).filter((s) => s.top.length > 0);

        const byId = new Map(officials.map((o) => [o.id, o]));
        const recentReviews = reviews
            .filter((r) => r.text.trim().length > 0 && byId.has(r.official_id))
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 6)
            .map((r) => {
                const o = byId.get(r.official_id)!;
                return {
                    id: r.id,
                    text: r.text,
                    overall: r.overall,
                    // שם מדרג אנונימי לא עוזב את השרת (הסתרה בתצוגה בלבד אינה מספיקה)
                    reviewer_name: r.anonymous ? '' : r.reviewer_name,
                    anonymous: r.anonymous,
                    created_at: r.created_at,
                    official: { id: o.id, name: o.name, position: o.position },
                };
            });

        const groupCounts = emptyGroupCounts();
        for (const o of officials) groupCounts[o.group] = (groupCounts[o.group] ?? 0) + 1;

        // אינדקס רזה לחיפוש בצד לקוח — לא שולחים את כל האובייקטים
        const searchIndex = officials.map((o) => ({
            id: o.id,
            name: o.name,
            position: o.position,
            org: o.org,
            image: o.image,
        }));

        return {
            stats: { officialCount: officials.length, reviewCount: reviews.length },
            showcase,
            recentReviews,
            groupCounts,
            searchIndex,
        };
    } catch (e) {
        console.warn('[home] load failed:', e instanceof Error ? e.message : e);
        return {
            stats: { officialCount: 0, reviewCount: 0 },
            showcase: [],
            recentReviews: [],
            groupCounts: emptyGroupCounts(),
            searchIndex: [],
        };
    }
};
