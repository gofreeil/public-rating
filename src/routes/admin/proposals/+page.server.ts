// ============================================================
// /admin/proposals - ניהול מרחב ההצעות (צוות הניהול — אדמין ומעלה)
// אישור/דחייה, סטטוס, קישור מדורגים ועדכוני ציר זמן
// ============================================================

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isAdmin, requireAdmin } from '$lib/server/auth';
import {
    listPendingProposals,
    listProposals,
    listOfficials,
    updateProposal,
    softDeleteRatingItem,
} from '$lib/server/rating';
import { proposalStatusOf, type CivicProposal, type Official } from '$lib/rating/types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (!isAdmin(session)) redirect(303, '/');

    let pending: CivicProposal[] = [];
    let proposals: CivicProposal[] = [];
    let officials: Pick<Official, 'id' | 'name' | 'position'>[] = [];

    try {
        pending = await listPendingProposals();
    } catch (e) {
        console.warn('[admin/proposals] listPendingProposals failed:', e);
    }
    try {
        proposals = await listProposals();
    } catch (e) {
        console.warn('[admin/proposals] listProposals failed:', e);
    }
    try {
        officials = (await listOfficials()).map((o) => ({
            id: o.id,
            name: o.name,
            position: o.position,
        }));
    } catch (e) {
        console.warn('[admin/proposals] listOfficials failed:', e);
    }

    return { pending, proposals, officials };
};

export const actions: Actions = {
    // אישור הצעה — עולה למרחב הציבורי
    approve: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה הצעה' });

        try {
            await updateProposal(id, { approved: true });
            return { success: true, message: 'ההצעה אושרה — היא גלויה עכשיו במרחב' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    // דחיית הצעה (הסרה רכה)
    reject: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה הצעה' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'ההצעה נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // עדכון הצעה קיימת: סטטוס, מדורגים מקושרים, עדכון חדש בציר הזמן
    update: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה הצעה' });

        const status = proposalStatusOf(String(fd.get('status') ?? ''));
        const officialIds = String(fd.get('official_ids') ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const addUpdate = String(fd.get('add_update') ?? '').trim().slice(0, 500);

        try {
            await updateProposal(id, { status, officialIds, addUpdate });
            return { success: true, message: 'ההצעה עודכנה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הסרת הצעה מפורסמת (הסרה רכה)
    remove: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה הצעה' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'ההצעה הוסרה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהסרה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
