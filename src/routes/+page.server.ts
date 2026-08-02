// ============================================================
// דף הבית — נתוני דירוג רזים: מובילים, טעוני שיפור, ביקורות אחרונות
// + סקר "מה הכי חשוב לך?" (הצבעה על חשיבות המדדים)
// ============================================================

import { fail } from '@sveltejs/kit';
import {
    getMySurveyVote,
    getRatedOfficials,
    getSurveyResults,
    listAllReviews,
    upsertSurveyVote,
} from '$lib/server/rating';
import { GROUPS, type GroupKey, type SurveyResults } from '$lib/rating/types';
import { CRITERIA, sanitizeScores, type Scores } from '$lib/rating/criteria';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { Actions, PageServerLoad } from './$types';

function emptyGroupCounts(): Record<GroupKey, number> {
    const out = {} as Record<GroupKey, number>;
    for (const g of GROUPS) out[g.key] = 0;
    return out;
}

function emptySurvey(): SurveyResults {
    const importance = {} as SurveyResults['importance'];
    for (const c of CRITERIA) importance[c.key] = null;
    return { count: 0, importance };
}

export const load: PageServerLoad = async (event) => {
    // הסקר אישי (הצבעה קודמת) — נטען לצד הנתונים הציבוריים; כל כשל → ברירת מחדל
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

    const surveyData = { survey, mySurveyVote, loggedIn: Boolean(meId) };

    try {
        const [officials, reviews] = await Promise.all([getRatedOfficials(), listAllReviews()]);

        // officials כבר ממוינים בדירוג הוגן (משוקלל יורד, לא-מדורגים בסוף)
        const rated = officials.filter((o) => o.stats.count > 0);

        // שלושת המובילים ושלושת הנמוכים בכל קטגוריה.
        // תחתית רק מסף 3 דירוגים — לא מכתירים "נמוך ביותר" על סמך כוכב בודד.
        const showcase = GROUPS.map((g) => {
            const groupRated = rated.filter((o) => o.group === g.key);
            const top = groupRated.slice(0, 3);
            const topIds = new Set(top.map((o) => o.id));
            const bottom = groupRated
                .filter((o) => o.stats.count >= 3 && !topIds.has(o.id))
                .sort((a, b) => a.stats.weighted - b.stats.weighted)
                .slice(0, 3); // הנמוך ביותר ראשון
            return { key: g.key, top, bottom };
        }).filter((s) => s.top.length > 0);

        const byId = new Map(officials.map((o) => [o.id, o]));
        const recentReviews = reviews
            .filter((r) => r.text.trim().length > 0 && byId.has(r.official_id))
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 6)
            .map((r) => {
                const o = byId.get(r.official_id)!;
                return {
                    id: r.id,
                    text: r.text,
                    overall: r.overall,
                    // שם מדרג אנונימי לא עוזב את השרת (הסתרה בתצוגה בלבד אינה מספיקה)
                    reviewer_name: r.anonymous ? '' : r.reviewer_name,
                    anonymous: r.anonymous,
                    created_at: r.created_at,
                    official: { id: o.id, name: o.name, position: o.position },
                };
            });

        const groupCounts = emptyGroupCounts();
        for (const o of officials) groupCounts[o.group] = (groupCounts[o.group] ?? 0) + 1;

        // אינדקס רזה לחיפוש בצד לקוח — לא שולחים את כל האובייקטים
        const searchIndex = officials.map((o) => ({
            id: o.id,
            name: o.name,
            position: o.position,
            org: o.org,
            image: o.image,
        }));

        return {
            stats: { officialCount: officials.length, reviewCount: reviews.length },
            showcase,
            recentReviews,
            groupCounts,
            searchIndex,
            ...surveyData,
        };
    } catch (e) {
        console.warn('[home] load failed:', e instanceof Error ? e.message : e);
        return {
            stats: { officialCount: 0, reviewCount: 0 },
            showcase: [],
            recentReviews: [],
            groupCounts: emptyGroupCounts(),
            searchIndex: [],
            ...surveyData,
        };
    }
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
            console.error('[home] upsertSurveyVote failed:', e);
            return fail(500, { surveyError: 'שגיאה בשמירת ההצבעה — נסו שוב בעוד רגע' });
        }

        return { surveySuccess: true };
    },
};
