// ============================================================
// דף פרופיל מדורג — טעינה + פעולות: דירוג (upsert), "מועיל", מחיקה
// ============================================================

import { error, fail } from '@sveltejs/kit';
import { isAdmin as isSiteAdmin } from '$lib/server/auth';
import { CRITERIA, sanitizeScores } from '$lib/rating/criteria';
import {
    computeStats,
    toMyReview,
    toPublicComment,
    toPublicInquiry,
    toPublicReview,
} from '$lib/rating/aggregate';
import { TOO_FAST, TOO_MANY, allowAction, botCheck } from '$lib/server/rateLimit';
import {
    REPORT_REASONS,
    type OfficialComment,
    type OfficialInquiry,
    type ReportReason,
    type Review,
} from '$lib/rating/types';
import {
    createReport,
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
    addInquiry,
    getInquiriesFor,
    getInquiry,
    toggleJoinInquiry,
    replyToInquiry,
} from '$lib/server/rating';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    // getOfficial מבחין בין 404 אמיתי לבין תקלת באקאנד ומזריק את השנייה הלאה,
    // כדי לא להפוך נפילה זמנית ל-404 כוזב שגוגל יוריד מהאינדקס. כאן מתרגמים
    // אותה ל-503 עם הודעה מובנת, במקום מסך שגיאה כללי.
    let official;
    try {
        official = await getOfficial(event.params.id);
    } catch (e) {
        console.warn('[officials/id] getOfficial failed:', e instanceof Error ? e.message : e);
        throw error(503, 'המערכת עמוסה כרגע — נסו לרענן בעוד רגע');
    }
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

    let inquiries: OfficialInquiry[] = [];
    try {
        inquiries = await getInquiriesFor(official.id);
    } catch {
        inquiries = [];
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

    // חותם "מגיב לפניות" — מועד המענה הרשמי האחרון, נגזר מהפניות עצמן
    const lastResponseAt =
        inquiries
            .map((i) => i.replied_at)
            .filter((d): d is string => Boolean(d))
            .sort()
            .at(-1) ?? null;

    return {
        official,
        // צורה ציבורית בלבד — user_id (שעלול להכיל אימייל) ושם של מדרג אנונימי לא עוזבים את השרת
        reviews: reviews.map((r) => toPublicReview(r, meId)),
        comments: comments.map((c) => toPublicComment(c, meId)),
        inquiries: inquiries.map((i) => toPublicInquiry(i, meId)),
        lastResponseAt,
        stats: computeStats(reviews),
        // גם הדירוג "שלי" עובר ניקוי — helpful_by שבתוכו הוא רשימת מזהים של אחרים
        myReview: myReview ? toMyReview(myReview) : null,
        isAdmin: isSiteAdmin(session),
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
        if (!allowAction(event, 'rate', session.user.id)) return fail(429, { error: TOO_MANY });

        const fd = await event.request.formData();

        const bot = botCheck(fd);
        // מלכודת: מאשרים לבוט "הצלחה" בלי לכתוב — כך הוא לא מנסה שוב אחרת
        if (bot.trap) return { success: true };
        if (bot.tooFast) return fail(400, { error: TOO_FAST });

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
        // כל סימון מנקה את הקאש — בלי תקרה, לולאת סימונים הופכת למחולל עומס
        if (!allowAction(event, 'helpful', session.user.id)) return fail(429, { error: TOO_MANY });

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
        if (!allowAction(event, 'comment', session.user.id)) return fail(429, { commentError: TOO_MANY });

        const fd = await event.request.formData();

        const bot = botCheck(fd);
        if (bot.trap) return { commentSuccess: true };
        if (bot.tooFast) return fail(400, { commentError: TOO_FAST });

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

        const isAdmin = isSiteAdmin(session);
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

    // דיווח על תוכן פוגעני — הכתיבה היחידה הפתוחה גם לאורח:
    // מי שנפגע מתוכן עליו לא בהכרח מחזיק חשבון באתר.
    report: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        const meId = session?.user?.id ?? null;

        if (!allowAction(event, 'report', meId)) return fail(429, { reportError: TOO_MANY });

        const fd = await event.request.formData();
        const bot = botCheck(fd);
        if (bot.trap) return { reportSuccess: true };

        const targetId = fd.get('target_id')?.toString() ?? '';
        const targetType = fd.get('target_type')?.toString() === 'comment' ? 'comment' : 'review';
        const reason = (fd.get('reason')?.toString() ?? '') as ReportReason;
        const details = (fd.get('details')?.toString() ?? '').trim().slice(0, 1000);
        const contact = (fd.get('contact')?.toString() ?? '').trim().slice(0, 200);

        if (!targetId) return fail(400, { reportError: 'התוכן המדווח לא נמצא' });
        if (!REPORT_REASONS.some((r) => r.key === reason)) {
            return fail(400, { reportError: 'יש לבחור סיבת דיווח' });
        }

        // אימות שהתוכן קיים ושייך למדורג שבכתובת, ושמירת עותק שלו:
        // הדיווח חייב להישאר מובן גם אם התוכן נמחק לפני הטיפול
        let snapshot = '';
        try {
            if (targetType === 'review') {
                const r = (await getReviewsFor(event.params.id)).find((x) => x.id === targetId);
                if (!r) return fail(404, { reportError: 'הדירוג לא נמצא או שכבר הוסר' });
                snapshot = r.text;
            } else {
                const c = (await getCommentsFor(event.params.id)).find((x) => x.id === targetId);
                if (!c) return fail(404, { reportError: 'התגובה לא נמצאה או שכבר הוסרה' });
                snapshot = c.text;
            }
        } catch {
            return fail(503, { reportError: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע' });
        }

        let officialName = '';
        try {
            officialName = (await getOfficial(event.params.id))?.name ?? '';
        } catch {}

        try {
            await createReport({
                targetId,
                targetType,
                officialId: event.params.id,
                officialName,
                reason,
                details,
                reporterContact: contact,
                snapshot,
                userId: meId,
            });
        } catch (e) {
            console.error('[rating] createReport failed:', e);
            return fail(500, { reportError: 'שגיאה בשליחת הדיווח — נסו שוב בעוד רגע' });
        }

        return { reportSuccess: true };
    },

    // פנייה ציבורית חדשה — משתמשים רשומים בלבד
    inquire: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { inquiryError: 'יש להתחבר כדי לפנות' });
        if (!allowAction(event, 'inquire', session.user.id)) {
            return fail(429, { inquiryError: TOO_MANY });
        }

        const fd = await event.request.formData();
        const bot = botCheck(fd);
        if (bot.trap) return { inquirySuccess: true };
        if (bot.tooFast) return fail(400, { inquiryError: TOO_FAST });

        const text = (fd.get('inquiry_text')?.toString() ?? '').trim().slice(0, 1000);
        if (text.length < 10) {
            return fail(400, { inquiryError: 'פנייה קצרה מדי — פרטו את הבקשה (לפחות 10 תווים)' });
        }
        const anonymous = Boolean(fd.get('anonymous'));

        // פנייה רק למדורג קיים ומאושר
        let official;
        try {
            official = await getOfficial(event.params.id);
        } catch {
            return fail(503, { inquiryError: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע' });
        }
        if (!official) return fail(404, { inquiryError: 'המדורג לא נמצא או שטרם אושר' });

        try {
            await addInquiry({
                officialId: event.params.id,
                userId: session.user.id,
                authorName: session.user.name ?? 'אזרח/ית',
                text,
                anonymous,
            });
        } catch (e) {
            console.error('[rating] addInquiry failed:', e);
            return fail(500, { inquiryError: 'שגיאה בשליחת הפנייה — נסו שוב בעוד רגע' });
        }

        return { inquirySuccess: true };
    },

    // הצטרפות/ביטול הצטרפות לפנייה ציבורית
    join_inquiry: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { inquiryError: 'יש להתחבר כדי להצטרף לפנייה' });
        if (!allowAction(event, 'join', session.user.id)) {
            return fail(429, { inquiryError: TOO_MANY });
        }

        const fd = await event.request.formData();
        const inquiryId = fd.get('inquiry_id')?.toString() ?? '';
        if (!inquiryId) return fail(400, { inquiryError: 'הפנייה לא נמצאה' });

        let ok = false;
        try {
            ok = await toggleJoinInquiry(inquiryId, session.user.id, event.params.id);
        } catch (e) {
            console.error('[rating] toggleJoinInquiry failed:', e);
            return fail(500, { inquiryError: 'שגיאה בהצטרפות — נסו שוב' });
        }
        if (!ok) return fail(400, { inquiryError: 'לא ניתן להצטרף לפנייה הזו' });

        return { joined: true };
    },

    // מענה רשמי לפנייה — חשבון הדמות המדורגת בלבד
    reply_inquiry: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { inquiryError: 'יש להתחבר' });
        if (!allowAction(event, 'inquiryReply', session.user.id)) {
            return fail(429, { inquiryError: TOO_MANY });
        }

        // רק חשבון הדמות עונה רשמית — גם אדמין לא מפרסם מענה בשם המדורג
        let isOwner = false;
        try {
            isOwner = (await getOfficialOwnerUserId(event.params.id)) === session.user.id;
        } catch {}
        if (!isOwner) return fail(403, { inquiryError: 'רק חשבון הדמות המדורגת עונה על פניות' });

        const fd = await event.request.formData();
        const inquiryId = fd.get('inquiry_id')?.toString() ?? '';
        const replyText = (fd.get('reply_text')?.toString() ?? '').trim().slice(0, 2000);
        if (!inquiryId) return fail(400, { inquiryError: 'הפנייה לא נמצאה' });
        if (replyText.length < 2) return fail(400, { inquiryError: 'המענה קצר מדי' });

        let ok = false;
        try {
            ok = await replyToInquiry(inquiryId, event.params.id, replyText);
        } catch (e) {
            console.error('[rating] replyToInquiry failed:', e);
            return fail(500, { inquiryError: 'שגיאה בפרסום המענה — נסו שוב' });
        }
        if (!ok) return fail(400, { inquiryError: 'לא ניתן לענות על הפנייה הזו' });

        return { inquiryReplied: true };
    },

    // מחיקת פנייה — סופר-אדמין או הפונה עצמו
    delete_inquiry: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { inquiryError: 'יש להתחבר' });

        const fd = await event.request.formData();
        const inquiryId = fd.get('inquiry_id')?.toString() ?? '';
        if (!inquiryId) return fail(400, { inquiryError: 'הפנייה לא נמצאה' });

        let inquiry;
        try {
            inquiry = await getInquiry(inquiryId);
        } catch {}
        if (!inquiry || inquiry.official_id !== event.params.id) {
            return fail(404, { inquiryError: 'הפנייה לא נמצאה' });
        }

        const isAdmin = isSiteAdmin(session);
        if (!isAdmin && inquiry.user_id !== session.user.id) {
            return fail(403, { inquiryError: 'אין הרשאה למחוק פנייה זו' });
        }

        try {
            await softDeleteRatingItem(inquiryId, session.user.id);
        } catch (e) {
            console.error('[rating] delete inquiry failed:', e);
            return fail(500, { inquiryError: 'שגיאה במחיקה — נסו שוב' });
        }

        return { inquiryDeleted: true };
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

        const isAdmin = isSiteAdmin(session);
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
