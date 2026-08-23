// ============================================================
// דף הכרת הטוב של מדורג — מילים טובות פומביות, טקסט חופשי בלבד.
// התאום החיובי של דיווח ההתנהלות: אותה כניסה מדף הפרופיל, הפוך בסימן.
// ============================================================

import { error, fail } from '@sveltejs/kit';
import { isAdmin as isSiteAdmin } from '$lib/server/auth';
import { toPublicGratitude } from '$lib/rating/aggregate';
import { TOO_FAST, TOO_MANY, allowAction, botCheck } from '$lib/server/rateLimit';
import type { GratitudeNote } from '$lib/rating/types';
import {
    addGratitude,
    getGratitude,
    getGratitudeFor,
    getOfficial,
    softDeleteRatingItem,
} from '$lib/server/rating';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    let official;
    try {
        official = await getOfficial(event.params.id);
    } catch (e) {
        console.warn('[gratitude] getOfficial failed:', e instanceof Error ? e.message : e);
        throw error(503, 'המערכת עמוסה כרגע — נסו לרענן בעוד רגע');
    }
    if (!official) throw error(404, 'המדורג לא נמצא');

    let notes: GratitudeNote[] = [];
    try {
        notes = await getGratitudeFor(official.id);
    } catch {
        notes = [];
    }

    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}
    const meId = session?.user?.id ?? null;

    return {
        official,
        // צורה ציבורית בלבד — user_id (שעלול להכיל אימייל) לא עוזב את השרת
        notes: notes.map((n) => toPublicGratitude(n, meId)),
        isAdmin: isSiteAdmin(session),
        loggedIn: meId !== null,
    };
};

/** כל וריאנטי ה-fail/ההצלחה מחזירים אותה צורה — אחרת ה-ActionData מתפצל */
const EMPTY = { text: '' };

export const actions: Actions = {
    // מילה טובה חדשה — משתמשים רשומים בלבד, כדי שמאחורי כל מילה יעמוד אדם
    thank: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { gratitudeError: 'יש להתחבר כדי לכתוב', values: EMPTY });
        if (!allowAction(event, 'gratitude', session.user.id)) {
            return fail(429, { gratitudeError: TOO_MANY, values: EMPTY });
        }

        const fd = await event.request.formData();
        const bot = botCheck(fd);
        if (bot.trap) return { gratitudeSuccess: true, values: EMPTY };
        if (bot.tooFast) return fail(400, { gratitudeError: TOO_FAST, values: EMPTY });

        const text = (fd.get('text')?.toString() ?? '').trim().slice(0, 1000);
        if (text.length < 10) {
            return fail(400, { gratitudeError: 'קצר מדי — כתבו לפחות 10 תווים', values: { text } });
        }
        const anonymous = Boolean(fd.get('anonymous'));

        // כתיבה רק על מדורג קיים ומאושר
        let official;
        try {
            official = await getOfficial(event.params.id);
        } catch {
            return fail(503, { gratitudeError: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע', values: { text } });
        }
        if (!official) return fail(404, { gratitudeError: 'המדורג לא נמצא או שטרם אושר', values: { text } });

        try {
            await addGratitude({
                officialId: event.params.id,
                userId: session.user.id,
                authorName: session.user.name ?? 'אזרח/ית',
                text,
                anonymous,
            });
        } catch (e) {
            console.error('[rating] addGratitude failed:', e);
            return fail(500, { gratitudeError: 'שגיאה בשליחה — נסו שוב בעוד רגע', values: { text } });
        }

        return { gratitudeSuccess: true, values: EMPTY };
    },

    // מחיקה — הכותב עצמו או אדמין
    delete_gratitude: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { gratitudeError: 'יש להתחבר', values: EMPTY });

        const fd = await event.request.formData();
        const id = fd.get('gratitude_id')?.toString() ?? '';
        if (!id) return fail(400, { gratitudeError: 'הפריט לא נמצא', values: EMPTY });

        let note;
        try {
            note = await getGratitude(id);
        } catch {
            return fail(503, { gratitudeError: 'המערכת עמוסה כרגע — נסו שוב בעוד רגע', values: EMPTY });
        }
        if (!note || note.official_id !== event.params.id) {
            return fail(404, { gratitudeError: 'הפריט לא נמצא או שכבר הוסר', values: EMPTY });
        }
        if (!isSiteAdmin(session) && note.user_id !== session.user.id) {
            return fail(403, { gratitudeError: 'אין הרשאה למחוק פריט זה', values: EMPTY });
        }

        try {
            await softDeleteRatingItem(id, session.user.id);
        } catch (e) {
            console.error('[rating] delete gratitude failed:', e);
            return fail(500, { gratitudeError: 'שגיאה במחיקה — נסו שוב', values: EMPTY });
        }

        return { gratitudeDeleted: true, values: EMPTY };
    },
};
