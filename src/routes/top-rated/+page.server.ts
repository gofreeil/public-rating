// ============================================================
// מצטייני הציבור — לוח ההוקרה (פודיום, עשירייה, לפי קטגוריה, תחתית)
// ============================================================

import { getRatedOfficials } from '$lib/server/rating';
import { GROUPS, type RatedOfficial } from '$lib/rating/types';
import type { PageServerLoad } from './$types';

/** סף זכאות לפרס: לפחות 3 דירוגים כדי שדירוג בודד לא יקפיץ לצמרת */
const AWARD_MIN_REVIEWS = 3;

export const load: PageServerLoad = async () => {
    let all: RatedOfficial[] = [];
    try {
        all = await getRatedOfficials();
    } catch (e) {
        console.warn('[top-rated] getRatedOfficials failed:', e instanceof Error ? e.message : e);
    }

    // ממוינים כבר בדירוג הוגן (משוקלל) — מדורגים בלבד
    const rated = all.filter((o) => o.stats.count > 0);
    const eligible = rated.filter((o) => o.stats.count >= AWARD_MIN_REVIEWS);

    // זכאים תחילה; אם אין 3 זכאים — משלימים ממדורגים כדי שעדיין יהיה פודיום.
    // העשירייה באותו סדר בדיוק, אחרת מקום 1 בפודיום ומקום 1 ברשימה יתפצלו.
    const eligibleIds = new Set(eligible.map((o) => o.id));
    const ordered = [...eligible, ...rated.filter((o) => !eligibleIds.has(o.id))];
    const top3 = ordered.slice(0, 3);
    const top10 = ordered.slice(0, 10);

    const perGroup = GROUPS.map((g) => ({
        key: g.key,
        title: g.title,
        icon: g.icon,
        route: g.route,
        top: rated.filter((o) => o.group === g.key).slice(0, 3),
    }));

    // תחתית הדירוג — רק כשיש מספיק זכאים, ולעולם לא מי שכבר על הפודיום
    const top3Ids = new Set(top3.map((o) => o.id));
    const bottom3 =
        eligible.length >= 6
            ? [...eligible]
                  .filter((o) => !top3Ids.has(o.id))
                  .sort((a, b) => a.stats.weighted - b.stats.weighted)
                  .slice(0, 3)
            : [];

    return { top3, top10, perGroup, bottom3, minReviews: AWARD_MIN_REVIEWS };
};
