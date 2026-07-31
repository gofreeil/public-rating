// ============================================================
// aggregate.ts - חישובי דירוג טהורים (ללא IO)
// ============================================================

import { CRITERIA, type CriterionKey, type Scores } from './criteria';
import type {
    MyReview,
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

/**
 * הדירוג של המשתמש עצמו, לטעינת טופס העריכה.
 * גם דירוג "שלי" חייב ניקוי: helpful_by מכיל מזהים של מי שסימן אותו כמועיל —
 * משתמשים אחרים, שמזהה שלהם עלול להיות `credentials_<אימייל>`.
 */
export function toMyReview(r: Review): MyReview {
    return {
        id: r.id,
        text: r.text,
        scores: r.scores,
        overall: r.overall,
        anonymous: r.anonymous,
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

// ============================================================
// ---- מדד הסכמה: עד כמה הציבור מאוחד בדעתו על המדורג ----
// ============================================================

/** מספר הדירוגים שמתחתיו הציון עדיין לא נחשב מבוסס (זהה לסף הפרסים) */
export const RELIABLE_MIN = 3;

export type ConsensusLevel = 'insufficient' | 'consensus' | 'mixed' | 'polarized';

export interface Consensus {
    level: ConsensusLevel;
    /** סטיית תקן של הציונים (0 = כולם נתנו אותו ציון) */
    sd: number;
    label: string;
    detail: string;
}

/**
 * מחושב מההתפלגות שכבר קיימת — בלי שליפה נוספת.
 * ההבחנה החשובה לאזרח: ציון 3 שכולם הסכימו עליו אינו אותו דבר כמו ציון 3
 * שחציו אחדות וחציו אחדים. הראשון הוא הערכה, השני הוא קיטוב.
 */
export function consensusOf(
    distribution: readonly [number, number, number, number, number],
    count: number,
): Consensus {
    if (count < RELIABLE_MIN) {
        return {
            level: 'insufficient',
            sd: 0,
            label: 'טרם מבוסס',
            detail: `נדרשים ${RELIABLE_MIN} דירוגים לפחות כדי שהציון ייחשב מבוסס`,
        };
    }

    let sum = 0;
    for (let i = 0; i < 5; i++) sum += (i + 1) * distribution[i];
    const mean = sum / count;

    let varSum = 0;
    for (let i = 0; i < 5; i++) varSum += distribution[i] * (i + 1 - mean) ** 2;
    const sd = Math.sqrt(varSum / count);

    // דו-קוטבי: משקל ניכר בשני הקצוות בו-זמנית — הסימן המובהק למחלוקת ציבורית
    const lowShare = distribution[0] / count;
    const highShare = distribution[4] / count;
    if (lowShare >= 0.25 && highShare >= 0.25) {
        return {
            level: 'polarized',
            sd,
            label: 'דעות חלוקות',
            detail: `${Math.round(lowShare * 100)}% דירגו נמוך מאוד ו-${Math.round(highShare * 100)}% דירגו גבוה מאוד`,
        };
    }

    if (sd < 0.85) {
        return {
            level: 'consensus',
            sd,
            label: 'הסכמה רחבה',
            detail: 'רוב המדרגים נתנו ציונים קרובים זה לזה',
        };
    }

    return {
        level: 'mixed',
        sd,
        label: 'דעות מגוונות',
        detail: 'הציונים מתפרסים על טווח רחב',
    };
}

/** עיצוב ציון לתצוגה: 4.3 / "—" */
export function fmtScore(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return '—';
    return (Math.round(v * 10) / 10).toFixed(1);
}
