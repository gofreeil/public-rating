// ============================================================
// דף הבית — נתוני דירוג רזים: מובילים, טעוני שיפור, ביקורות אחרונות
// (סקר "מה הכי חשוב לך?" עבר לעמוד האודות, לצד ההסבר על המדדים)
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

        // קומת ההדליינס — כותרת אחת מכל דף באתר, דינמית היכן שיש נתונים
        const headlines: { href: string; tag: string; text: string }[] = [];
        for (const g of GROUPS) {
            const top = rated.find((o) => o.group === g.key);
            headlines.push({
                href: g.route,
                tag: `${g.icon} ${g.title}`,
                text: top
                    ? `בראש הלוח: ${top.name}${top.position ? ` (${top.position})` : ''} — ${top.stats.average?.toFixed(1)}★ מתוך ${top.stats.count} דירוגים`
                    : g.blurb,
            });
        }
        if (rated[0]) {
            headlines.push({
                href: '/top-rated',
                tag: '🏆 המצטיינים',
                text: `${rated[0].name} בפסגת הדירוג הארצי — לטבלה המלאה`,
            });
        }
        headlines.push({
            href: '/compare',
            tag: '⚖️ השוואה',
            text: 'ראש בראש: משווים שני מדורגים זה מול זה בכל המדדים',
        });
        if (recentReviews[0]) {
            const r = recentReviews[0];
            const quote = r.text.length > 80 ? `${r.text.slice(0, 80)}…` : r.text;
            headlines.push({
                href: `/officials/${r.official.id}`,
                tag: '📝 ביקורת אחרונה',
                text: `על ${r.official.name}: "${quote}"`,
            });
        }
        headlines.push({
            href: '/suggest',
            tag: '💡 הצעת מדורג',
            text: 'חסרה לכם דמות בלוחות? הציעו אותה לדירוג הציבור',
        });
        headlines.push({
            href: '/about',
            tag: '🎯 החזון',
            text: '"חברה אחראית בודקת שהחתול לא שומר על השמנת"',
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
            headlines,
            showcase,
            recentReviews,
            groupCounts,
            searchIndex,
        };
    } catch (e) {
        console.warn('[home] load failed:', e instanceof Error ? e.message : e);
        return {
            stats: { officialCount: 0, reviewCount: 0 },
            headlines: [] as { href: string; tag: string; text: string }[],
            showcase: [],
            recentReviews: [],
            groupCounts: emptyGroupCounts(),
            searchIndex: [],
        };
    }
};
