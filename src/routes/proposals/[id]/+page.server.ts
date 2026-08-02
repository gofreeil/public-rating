// ============================================================
// דף הצעה אזרחית — צפייה, תמיכה ומחיקה
// ============================================================

import { error, fail } from '@sveltejs/kit';
import { getProposal, listOfficials, softDeleteRatingItem, toggleSupportProposal } from '$lib/server/rating';
import { toPublicProposal } from '$lib/rating/aggregate';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { Official } from '$lib/rating/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let proposal;
    try {
        proposal = await getProposal(event.params.id);
    } catch (e) {
        console.warn('[proposals/id] getProposal failed:', e instanceof Error ? e.message : e);
        throw error(503, 'המערכת עמוסה כרגע — נסו לרענן בעוד רגע');
    }
    if (!proposal) throw error(404, 'ההצעה לא נמצאה');

    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}
    const meId = session?.user?.id ?? null;
    const isAdmin = session?.user?.role === 'super_admin';

    // הצעה ממתינה גלויה רק למציע ולאדמין — לציבור היא לא קיימת
    if (!proposal.approved && !isAdmin && proposal.user_id !== meId) {
        throw error(404, 'ההצעה לא נמצאה');
    }

    // המדורגים המקושרים — מהאינדקס שכבר בקאש; נפילה משאירה רשימה ריקה
    let linked: Pick<Official, 'id' | 'name' | 'position' | 'image'>[] = [];
    if (proposal.official_ids.length) {
        try {
            const officials = await listOfficials();
            linked = officials
                .filter((o) => proposal.official_ids.includes(o.id))
                .map((o) => ({ id: o.id, name: o.name, position: o.position, image: o.image }));
        } catch {}
    }

    return {
        proposal: toPublicProposal(proposal, meId),
        pending: !proposal.approved,
        linked,
        loggedIn: Boolean(meId),
        isAdmin,
    };
};

export const actions: Actions = {
    // תמיכה/ביטול תמיכה — משתמשים מחוברים בלבד
    support: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי לתמוך' });
        if (!allowAction(event, 'join', session.user.id)) return fail(429, { error: TOO_MANY });

        let ok = false;
        try {
            ok = await toggleSupportProposal(event.params.id, session.user.id);
        } catch (e) {
            console.error('[proposals] toggleSupport failed:', e);
            return fail(500, { error: 'שגיאה בתמיכה — נסו שוב' });
        }
        if (!ok) return fail(400, { error: 'לא ניתן לתמוך בהצעה הזו' });

        return { supported: true };
    },

    // מחיקת הצעה — סופר-אדמין או המציע עצמו
    delete_proposal: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר' });

        let proposal;
        try {
            proposal = await getProposal(event.params.id);
        } catch {}
        if (!proposal) return fail(404, { error: 'ההצעה לא נמצאה' });

        const isAdmin = session.user.role === 'super_admin';
        if (!isAdmin && proposal.user_id !== session.user.id) {
            return fail(403, { error: 'אין הרשאה למחוק הצעה זו' });
        }

        try {
            await softDeleteRatingItem(event.params.id, session.user.id);
        } catch (e) {
            console.error('[proposals] delete failed:', e);
            return fail(500, { error: 'שגיאה במחיקה — נסו שוב' });
        }

        return { deleted: true };
    },
};
