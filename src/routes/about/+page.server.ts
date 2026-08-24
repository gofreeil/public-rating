// ============================================================
// אודות — סקר "מה הכי חשוב לך?" (הצבעה על חשיבות המדדים)
// יושב כאן ולא בדף הבית: המקום שבו מוסבר מה כל מדד אומר
// ============================================================

import { fail } from '@sveltejs/kit';
import { getMySurveyVote, getSurveyResults, upsertSurveyVote } from '$lib/server/rating';
import type { SurveyResults } from '$lib/rating/types';
import { CRITERIA, sanitizeScores, type Scores } from '$lib/rating/criteria';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { Actions, PageServerLoad } from './$types';

function emptySurvey(): SurveyResults {
    const importance = {} as SurveyResults['importance'];
    for (const c of CRITERIA) importance[c.key] = null;
    return { count: 0, importance };
}

export const load: PageServerLoad = async (event) => {
    // ההצבעה האישית נטענת לצד התוצאות הציבוריות; כל כשל → ברירת מחדל, לא 500
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}
    const meId = session?.user?.id ?? null;

    let survey = emptySurvey();
    try {
        survey = await getSurveyResults();
    } catch {}

    let mySurveyVote: Scores | null = null;
    if (meId) {
        try {
            mySurveyVote = await getMySurveyVote(meId);
        } catch {}
    }

    return { survey, mySurveyVote, loggedIn: Boolean(meId) };
};

export const actions: Actions = {
    // הצבעה בסקר החשיבות — אחת למשתמש, עדכון חוזר מותר
    survey: async (event) => {
        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { surveyError: 'יש להתחבר כדי להצביע בסקר' });
        if (!allowAction(event, 'survey', session.user.id)) {
            return fail(429, { surveyError: TOO_MANY });
        }

        const fd = await event.request.formData();
        const raw: Record<string, unknown> = {};
        for (const c of CRITERIA) raw[c.key] = fd.get(c.key)?.toString();
        const importance = sanitizeScores(raw);
        if (!Object.keys(importance).length) {
            return fail(400, { surveyError: 'דרגו לפחות מדד אחד' });
        }

        try {
            await upsertSurveyVote(session.user.id, importance);
        } catch (e) {
            console.error('[about] upsertSurveyVote failed:', e);
            return fail(500, { surveyError: 'שגיאה בשמירת ההצבעה — נסו שוב בעוד רגע' });
        }

        return { surveySuccess: true };
    },
};
