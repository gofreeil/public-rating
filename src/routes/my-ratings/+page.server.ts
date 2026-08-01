// ============================================================
// /my-ratings — האזור האישי של המדרג
//
// /profile ירש 1400 שורות מאתר הקהילה ואין בו מילה על דירוג: משתמש לא
// יכול היה לראות מה דירג, לחזור לערוך או להסיר, ולא לדעת מה עלה בגורל
// המדורג שהציע.
// ============================================================

import { fail, redirect } from '@sveltejs/kit';
import {
    getRatedOfficials,
    listAllReviews,
    listPendingOfficials,
    softDeleteRatingItem,
} from '$lib/server/rating';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const meId = session?.user?.id;
    if (!meId) redirect(303, '/login?redirect=/my-ratings');

    try {
        const [officials, reviews, pending] = await Promise.all([
            getRatedOfficials(),
            listAllReviews(),
            listPendingOfficials().catch(() => []),
        ]);

        const byId = new Map(officials.map((o) => [o.id, o]));

        const mine = reviews
            .filter((r) => r.user_id === meId && byId.has(r.official_id))
            .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
            .map((r) => {
                const o = byId.get(r.official_id)!;
                return {
                    reviewId: r.id,
                    scores: r.scores,
                    overall: r.overall,
                    text: r.text,
                    anonymous: r.anonymous,
                    helpfulCount: r.helpful_by.length,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    official: {
                        id: o.id,
                        name: o.name,
                        position: o.position,
                        org: o.org,
                        image: o.image,
                        group: o.group,
                        // הציון הציבורי — כדי שאפשר יהיה להשוות "אני מול הציבור"
                        publicAverage: o.stats.average,
                        publicCount: o.stats.count,
                    },
                };
            });

        // הצעות שהמשתמש שלח וטרם אושרו
        const mySuggestions = pending
            .filter((o) => o.suggested_by === meId)
            .map((o) => ({ id: o.id, name: o.name, position: o.position, group: o.group }));

        const avgGiven = mine.length
            ? mine.reduce((sum, m) => sum + m.overall, 0) / mine.length
            : null;

        return { mine, mySuggestions, avgGiven, name: session?.user?.name ?? '' };
    } catch (e) {
        console.warn('[my-ratings] load failed:', e instanceof Error ? e.message : e);
        return { mine: [], mySuggestions: [], avgGiven: null, name: session?.user?.name ?? '' };
    }
};

export const actions: Actions = {
    // הסרת דירוג משלי — הבעלות נאכפת מול הדירוגים של המשתמש עצמו
    delete_review: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        const meId = session?.user?.id;
        if (!meId) return fail(401, { error: 'יש להתחבר' });

        const fd = await event.request.formData();
        const reviewId = String(fd.get('review_id') ?? '');
        if (!reviewId) return fail(400, { error: 'דירוג לא נמצא' });

        let owned = false;
        try {
            owned = (await listAllReviews()).some((r) => r.id === reviewId && r.user_id === meId);
        } catch {
            return fail(503, { error: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע' });
        }
        if (!owned) return fail(403, { error: 'אין הרשאה למחוק דירוג זה' });

        try {
            await softDeleteRatingItem(reviewId, meId);
        } catch (e) {
            console.error('[my-ratings] delete failed:', e);
            return fail(500, { error: 'שגיאה במחיקה — נסו שוב' });
        }

        return { success: true, message: 'הדירוג הוסר' };
    },
};
