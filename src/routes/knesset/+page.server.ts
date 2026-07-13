import { getRatedOfficials } from '$lib/server/rating';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const all = await getRatedOfficials();
        return { officials: all.filter((o) => o.group === 'knesset') };
    } catch {
        // עמידות: תקלת Strapi → לוח ריק במקום 500
        return { officials: [] };
    }
};
