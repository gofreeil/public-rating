// ============================================================
// aggregate.ts - חישובי דירוג טהורים (ללא IO)
// ============================================================

import { CRITERIA, type CriterionKey, type Scores } from './criteria';
import type {
    Official,
    OfficialComment,
    OfficialStats,
    PublicComment,
    PublicReview,
    RatedOfficial,
    Review,
} from './types';

/**
 * מינימום דירוגים "וירטואלי" לשקלול בייסיאני (נוסחת IMDb):
 * WR = (v/(v+m))·R + (m/(v+m))·C
 * מונע ממדורג עם דירוג-5 בודד לעקוף מדורג עם ממוצע 4.8 על 40 דירוגים.
 */
const BAYES_M = 3;
/** ציון פריור ניטרלי כשאין מספיק דירוגים */
const BAYES_PRIOR = 3;

/** ממוצע המדדים שדורגו בביקורת בודדת (1-5) */
export function overallOf(scores: Scores): number {
    const vals = CRITERIA.map((c) => scores[c.key]).filter(
        (v): v is number => typeof v === 'number' && v >= 1 && v <= 5,
    );
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function weightedScore(average: number | null, count: number, prior = BAYES_PRIOR): number {
    if (average === null || count === 0) return 0;
    return (count / (count + BAYES_M)) * average + (BAYES_M / (count + BAYES_M)) * prior;
}

export function computeStats(reviews: Review[], prior = BAYES_PRIOR): OfficialStats {
    const count = reviews.length;
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const perCriterion = {} as Record<CriterionKey, number | null>;

    let overallSum = 0;
    for (const r of reviews) {
        overallSum += r.overall;
        const bucket = Math.min(5, Math.max(1, Math.round(r.overall))) - 1;
        distribution[bucket]++;
    }
    const average = count ? overallSum / count : null;

    for (const c of CRITERIA) {
        const vals = reviews
            .map((r) => r.scores[c.key])
            .filter((v): v is number => typeof v === 'number');
        perCriterion[c.key] = vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : null;
    }

    return { count, average, weighted: weightedScore(average, count, prior), perCriterion, distribution };
}

/** ממוצע כלל-פלטפורמי — משמש כפריור לשקלול ההוגן */
export function globalAverage(reviews: Review[]): number {
    if (!reviews.length) return BAYES_PRIOR;
    return reviews.reduce((a, r) => a + r.overall, 0) / reviews.length;
}

/**
 * חיבור מדורגים לדירוגים + מיון הוגן:
 * מדורגים עם דירוגים — לפי ציון משוקלל יורד; ללא דירוגים — בסוף, לפי שם.
 */
export function rankOfficials(officials: Official[], reviews: Review[]): RatedOfficial[] {
    const prior = globalAverage(reviews);
    const byOfficial = new Map<string, Review[]>();
    for (const r of reviews) {
        const list = byOfficial.get(r.official_id);
        if (list) list.push(r);
        else byOfficial.set(r.official_id, [r]);
    }
    return officials
        .map((o) => ({ ...o, stats: computeStats(byOfficial.get(o.id) ?? [], prior) }))
        .sort((a, b) => {
            if (a.stats.count && !b.stats.count) return -1;
            if (!a.stats.count && b.stats.count) return 1;
            if (a.stats.weighted !== b.stats.weighted) return b.stats.weighted - a.stats.weighted;
            if (a.stats.count !== b.stats.count) return b.stats.count - a.stats.count;
            return a.name.localeCompare(b.name, 'he');
        });
}

/**
 * המרת ביקורת גולמית לצורה בטוחה לדפדפן: בלי user_id/helpful_by,
 * ושם המדרג מוסתר בשרת (לא רק בתצוגה) כשהביקורת אנונימית.
 */
export function toPublicReview(r: Review, meId: string | null): PublicReview {
    return {
        id: r.id,
        text: r.text,
        scores: r.scores,
        overall: r.overall,
        anonymous: r.anonymous,
        reviewer_name: r.anonymous ? '' : r.reviewer_name,
        helpfulCount: r.helpful_by.length,
        markedHelpfulByMe: meId ? r.helpful_by.includes(meId) : false,
        mine: meId ? r.user_id === meId : false,
        created_at: r.created_at,
    };
}

/** המרת תגובה גולמית לצורה בטוחה לדפדפן — user_id (שעלול להכיל אימייל) נשאר בשרת */
export function toPublicComment(c: OfficialComment, meId: string | null): PublicComment {
    return {
        id: c.id,
        review_id: c.review_id,
        text: c.text,
        commenter_name: c.commenter_name,
        official_reply: c.official_reply,
        mine: meId ? c.user_id === meId : false,
        created_at: c.created_at,
    };
}

/** עיצוב ציון לתצוגה: 4.3 / "—" */
export function fmtScore(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return '—';
    return (Math.round(v * 10) / 10).toFixed(1);
}
