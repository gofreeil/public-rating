// ============================================================
// דף פרופיל מדורג — טעינה + פעולות: דירוג (upsert), "מועיל", מחיקה
// ============================================================

import { error, fail } from '@sveltejs/kit';
import { CRITERIA, sanitizeScores } from '$lib/rating/criteria';
import { computeStats, toPublicReview } from '$lib/rating/aggregate';
import type { Review } from '$lib/rating/types';
import {
    getOfficial,
    getReviewsFor,
    getMyReview,
    upsertReview,
    toggleHelpful,
    softDeleteRatingItem,
} from '$lib/server/rating';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    const official = await getOfficial(event.params.id);
    if (!official) throw error(404, 'המדורג לא נמצא');

    let reviews: Review[] = [];
    try {
        reviews = await getReviewsFor(official.id);
    } catch {
        reviews = [];
    }

    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    let myReview: Review | null = null;
    if (session?.user?.id) {
        try {
            myReview = (await getMyReview(official.id, session.user.id)) ?? null;
        } catch {}
    }

    const meId = session?.user?.id ?? null;
    return {
        official,
        // צורה ציבורית בלבד — user_id (שעלול להכיל אימייל) ושם של מדרג אנונימי לא עוזבים את השרת
        reviews: reviews.map((r) => toPublicReview(r, meId)),
        stats: computeStats(reviews),
        myReview,
        isAdmin: session?.user?.role === 'super_admin',
        me: meId ? { id: meId, name: session?.user?.name ?? '' } : null,
    };
};

export const actions: Actions = {
    // פרסום/עדכון דירוג — אחד לכל משתמש למדורג
    rate: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי לדרג' });

        const fd = await event.request.formData();
        const raw: Record<string, unknown> = {};
        for (const c of CRITERIA) raw[c.key] = fd.get(c.key)?.toString();
        const scores = sanitizeScores(raw);
        if (!Object.keys(scores).length) return fail(400, { error: 'יש לדרג לפחות מדד אחד' });

        const text = (fd.get('text')?.toString() ?? '').trim().slice(0, 2000);
        const anonymous = Boolean(fd.get('anonymous'));

        // דירוג רק על מדורג קיים ומאושר — חוסם דירוגי-רפאים והצעות שטרם אושרו
        let official;
        try {
            official = await getOfficial(event.params.id);
        } catch {
            return fail(503, { error: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע' });
        }
        if (!official) return fail(404, { error: 'המדורג לא נמצא או שטרם אושר' });

        try {
            await upsertReview({
                officialId: event.params.id,
                userId: session.user.id,
                reviewerName: session.user.name ?? 'אזרח/ית',
                scores,
                text,
                anonymous,
            });
        } catch (e) {
            console.error('[rating] upsertReview failed:', e);
            return fail(500, { error: 'שגיאה בשמירת הדירוג — נסו שוב בעוד רגע' });
        }

        return { success: true };
    },

    // סימון/ביטול "מועיל" על ביקורת
    helpful: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי לסמן מועיל' });

        const fd = await event.request.formData();
        const reviewId = fd.get('review_id')?.toString() ?? '';
        if (!reviewId) return fail(400, { error: 'דירוג לא נמצא' });

        try {
            await toggleHelpful(reviewId, session.user.id);
        } catch (e) {
            console.error('[rating] toggleHelpful failed:', e);
            return fail(500, { error: 'שגיאה בסימון — נסו שוב' });
        }

        return { helpful: true };
    },

    // מחיקה רכה — סופר-אדמין או בעל הדירוג בלבד
    delete_review: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר' });

        const fd = await event.request.formData();
        const reviewId = fd.get('review_id')?.toString() ?? '';
        if (!reviewId) return fail(400, { error: 'דירוג לא נמצא' });

        let review: Review | undefined;
        try {
            review = (await getReviewsFor(event.params.id)).find((r) => r.id === reviewId);
        } catch {}
        if (!review) return fail(404, { error: 'הדירוג לא נמצא' });

        const isAdmin = session.user.role === 'super_admin';
        if (!isAdmin && review.user_id !== session.user.id) {
            return fail(403, { error: 'אין הרשאה למחוק דירוג זה' });
        }

        try {
            await softDeleteRatingItem(reviewId, session.user.id);
        } catch (e) {
            console.error('[rating] delete review failed:', e);
            return fail(500, { error: 'שגיאה במחיקה — נסו שוב' });
        }

        return { deleted: true };
    },
};
