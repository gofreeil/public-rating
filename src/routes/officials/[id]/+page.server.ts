// ============================================================
// דף פרופיל מדורג — טעינה + פעולות: דירוג (upsert), "מועיל", מחיקה
// ============================================================

import { error, fail } from '@sveltejs/kit';
import { CRITERIA, sanitizeScores } from '$lib/rating/criteria';
import { computeStats, toMyReview, toPublicComment, toPublicReview } from '$lib/rating/aggregate';
import type { OfficialComment, Review } from '$lib/rating/types';
import {
    getOfficial,
    getReviewsFor,
    getMyReview,
    upsertReview,
    toggleHelpful,
    softDeleteRatingItem,
    getCommentsFor,
    getOfficialOwnerUserId,
    addComment,
    getComment,
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

    let comments: OfficialComment[] = [];
    try {
        comments = await getCommentsFor(official.id);
    } catch {
        comments = [];
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

    // האם המשתמש המחובר הוא חשבון הדמות עצמה? (ההשוואה בשרת — המזהה לא נחשף)
    let isOfficialUser = false;
    if (meId) {
        try {
            isOfficialUser = (await getOfficialOwnerUserId(official.id)) === meId;
        } catch {}
    }

    return {
        official,
        // צורה ציבורית בלבד — user_id (שעלול להכיל אימייל) ושם של מדרג אנונימי לא עוזבים את השרת
        reviews: reviews.map((r) => toPublicReview(r, meId)),
        comments: comments.map((c) => toPublicComment(c, meId)),
        stats: computeStats(reviews),
        // גם הדירוג "שלי" עובר ניקוי — helpful_by שבתוכו הוא רשימת מזהים של אחרים
        myReview: myReview ? toMyReview(myReview) : null,
        isAdmin: session?.user?.role === 'super_admin',
        isOfficialUser,
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

        let ok = false;
        try {
            ok = await toggleHelpful(reviewId, session.user.id, event.params.id);
        } catch (e) {
            console.error('[rating] toggleHelpful failed:', e);
            return fail(500, { error: 'שגיאה בסימון — נסו שוב' });
        }
        if (!ok) return fail(400, { error: 'לא ניתן לסמן את הדירוג הזה כמועיל' });

        return { helpful: true };
    },

    // תגובה על דירוג — משתמשים רשומים בלבד; תגובת חשבון הדמות מסומנת כרשמית
    comment: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { commentError: 'יש להתחבר כדי להגיב' });

        const fd = await event.request.formData();
        const reviewId = fd.get('review_id')?.toString() ?? '';
        const text = (fd.get('comment_text')?.toString() ?? '').trim().slice(0, 1000);
        if (!reviewId) return fail(400, { commentError: 'הדירוג לא נמצא' });
        if (text.length < 2) return fail(400, { commentError: 'תגובה קצרה מדי' });

        // התגובה נקשרת רק לדירוג פעיל של המדורג הזה — לא לשרשורי-רפאים
        let reviewExists = false;
        try {
            reviewExists = (await getReviewsFor(event.params.id)).some((r) => r.id === reviewId);
        } catch {
            return fail(503, { commentError: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע' });
        }
        if (!reviewExists) return fail(404, { commentError: 'הדירוג לא נמצא או שהוסר' });

        let officialReply = false;
        try {
            officialReply = (await getOfficialOwnerUserId(event.params.id)) === session.user.id;
        } catch {}

        try {
            await addComment({
                officialId: event.params.id,
                reviewId,
                userId: session.user.id,
                commenterName: session.user.name ?? 'אזרח/ית',
                text,
                officialReply,
            });
        } catch (e) {
            console.error('[rating] addComment failed:', e);
            return fail(500, { commentError: 'שגיאה בשמירת התגובה — נסו שוב בעוד רגע' });
        }

        return { commentSuccess: true };
    },

    // מחיקת תגובה — סופר-אדמין או כותב התגובה בלבד
    delete_comment: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { commentError: 'יש להתחבר' });

        const fd = await event.request.formData();
        const commentId = fd.get('comment_id')?.toString() ?? '';
        if (!commentId) return fail(400, { commentError: 'התגובה לא נמצאה' });

        let comment;
        try {
            comment = await getComment(commentId);
        } catch {}
        if (!comment || comment.official_id !== event.params.id) {
            return fail(404, { commentError: 'התגובה לא נמצאה' });
        }

        const isAdmin = session.user.role === 'super_admin';
        if (!isAdmin && comment.user_id !== session.user.id) {
            return fail(403, { commentError: 'אין הרשאה למחוק תגובה זו' });
        }

        try {
            await softDeleteRatingItem(commentId, session.user.id);
        } catch (e) {
            console.error('[rating] delete comment failed:', e);
            return fail(500, { commentError: 'שגיאה במחיקה — נסו שוב' });
        }

        return { commentDeleted: true };
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
