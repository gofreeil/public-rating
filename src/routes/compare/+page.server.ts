// ============================================================
// /compare — השוואת מדורגים זה מול זה לפי חמשת המדדים
// הבחירה חיה ב-?ids= כדי שאפשר יהיה לשתף השוואה בקישור.
//
// השרת מחזיר אינדקס אחד עם הציונים; הבחירה עצמה מחושבת בצד לקוח
// כדי שהחלפת מדורג תהיה מיידית ובלי סבב לשרת.
// ============================================================

import { getRatedOfficials } from '$lib/server/rating';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const officials = await getRatedOfficials();
        return {
            index: officials.map((o) => ({
                id: o.id,
                name: o.name,
                position: o.position,
                org: o.org,
                image: o.image,
                group: o.group,
                count: o.stats.count,
                average: o.stats.average,
                perCriterion: o.stats.perCriterion,
            })),
        };
    } catch (e) {
        console.warn('[compare] load failed:', e instanceof Error ? e.message : e);
        return { index: [] };
    }
};
