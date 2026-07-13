// ============================================================
// /admin/officials - ניהול מדורגים (סופר-אדמין בלבד)
// הוספה ידנית, אישור/דחיית הצעות משתמשים, עריכה והסרה
// ============================================================

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import {
    listPendingOfficials,
    getRatedOfficials,
    createOfficial,
    updateOfficial,
    softDeleteRatingItem,
} from '$lib/server/rating';
import { groupByKey, type GroupKey, type Official, type RatedOfficial } from '$lib/rating/types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') redirect(303, '/');

    let pending: Official[] = [];
    let officials: RatedOfficial[] = [];

    try {
        pending = await listPendingOfficials();
    } catch (e) {
        console.warn('[admin/officials] listPendingOfficials failed:', e);
    }
    try {
        officials = await getRatedOfficials();
    } catch (e) {
        console.warn('[admin/officials] getRatedOfficials failed:', e);
    }

    return { pending, officials };
};

export const actions: Actions = {
    // הוספת מדורג חדש (מאושר מיד)
    create: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const name = String(fd.get('name') ?? '').trim();
        const group = String(fd.get('group') ?? '');
        const position = String(fd.get('position') ?? '').trim();
        const org = String(fd.get('org') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const image = String(fd.get('image') ?? '').trim();

        if (!name) return fail(400, { error: 'חסר שם המדורג' });
        if (!groupByKey(group)) return fail(400, { error: 'קבוצה לא תקינה' });

        try {
            await createOfficial({ name, group: group as GroupKey, position, org, bio, image }, { approved: true });
            return { success: true, message: `"${name}" נוסף למדורגים` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהוספה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // אישור הצעת משתמש
    approve: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await updateOfficial(id, { approved: true });
            return { success: true, message: 'ההצעה אושרה — המדורג עלה ללוח' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    // דחיית הצעת משתמש (הסרה רכה)
    reject: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'ההצעה נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // עריכת פרטי מדורג קיים
    update: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        const name = String(fd.get('name') ?? '').trim();
        const position = String(fd.get('position') ?? '').trim();
        const org = String(fd.get('org') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const image = String(fd.get('image') ?? '').trim();

        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });
        if (!name) return fail(400, { error: 'חסר שם המדורג' });

        try {
            await updateOfficial(id, { name, position, org, bio, image });
            return { success: true, message: `"${name}" עודכן` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הסרת מדורג (הסרה רכה)
    remove: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'המדורג הוסר' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהסרה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
