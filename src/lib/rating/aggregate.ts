// ============================================================
// aggregate.ts - חישובי דירוג טהורים (ללא IO)
// ============================================================

import { CRITERIA, type CriterionKey, type Scores } from './criteria';
import { leaderOrder } from './leaders';
import type {
    CivicProposal,
    GratitudeNote,
    MyReview,
    Official,
    OfficialComment,
    OfficialInquiry,
    OfficialStats,
    PublicComment,
    PublicGratitude,
    PublicInquiry,
    PublicProposal,
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

/**
 * דעיכת דירוגים ישנים: מחצית המשקל אחרי שנה, רבע אחרי שנתיים.
 * מדורג נמדד על ההווה — ביקורת מלפני שלוש שנים אינה שווה לביקורת מהחודש.
 * הדעיכה חלה רק על הציון המשוקלל (סדר הלוחות); הממוצע המוצג נשאר פשוט.
 */
const DECAY_HALF_LIFE_MS = 365 * 24 * 60 * 60 * 1000;

export function decayWeight(createdAt: string, now: number): number {
    const t = new Date(createdAt).getTime();
    if (!Number.isFinite(t) || t >= now) return 1;
    return 0.5 ** ((now - t) / DECAY_HALF_LIFE_MS);
}

export function computeStats(reviews: Review[], prior = BAYES_PRIOR, now = Date.now()): OfficialStats {
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

    // הציון המשוקלל נבנה מממוצע דועך ומספירה אפקטיבית (סכום המשקלים):
    // דירוג ישן תורם פחות גם לציון וגם לביטחון שהשקלול מייחס לו
    let decayedSum = 0;
    let effectiveCount = 0;
    for (const r of reviews) {
        const w = decayWeight(r.created_at, now);
        decayedSum += w * r.overall;
        effectiveCount += w;
    }
    const decayedAverage = effectiveCount > 0 ? decayedSum / effectiveCount : null;

    return {
        count,
        average,
        weighted: weightedScore(decayedAverage, effectiveCount, prior),
        perCriterion,
        distribution,
    };
}

/** ממוצע כלל-פלטפורמי — משמש כפריור לשקלול ההוגן */
export function globalAverage(reviews: Review[]): number {
    if (!reviews.length) return BAYES_PRIOR;
    return reviews.reduce((a, r) => a + r.overall, 0) / reviews.length;
}

/**
 * חיבור מדורגים לדירוגים + מיון הוגן:
 * מדורגים עם דירוגים — לפי ציון משוקלל יורד; ללא דירוגים — בסוף, ראשי
 * המפלגות תחילה (אחרת המסך הראשון הוא סתם תחילת הא-ב) ואז לפי שם.
 */
export function rankOfficials(officials: Official[], reviews: Review[]): RatedOfficial[] {
    const prior = globalAverage(reviews);
    // נקודת זמן אחת לכל הדירוג — שכל המדורגים יידעכו מאותו רגע
    const now = Date.now();
    const byOfficial = new Map<string, Review[]>();
    for (const r of reviews) {
        const list = byOfficial.get(r.official_id);
        if (list) list.push(r);
        else byOfficial.set(r.official_id, [r]);
    }
    return officials
        .map((o) => ({ ...o, stats: computeStats(byOfficial.get(o.id) ?? [], prior, now) }))
        .sort((a, b) => {
            if (a.stats.count && !b.stats.count) return -1;
            if (!a.stats.count && b.stats.count) return 1;
            if (a.stats.weighted !== b.stats.weighted) return b.stats.weighted - a.stats.weighted;
            if (a.stats.count !== b.stats.count) return b.stats.count - a.stats.count;
            if (!a.stats.count && a.group === 'knesset' && b.group === 'knesset') {
                const la = leaderOrder(a.name);
                const lb = leaderOrder(b.name);
                if (la !== lb) return la - lb;
            }
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

/**
 * המרת פנייה ציבורית לצורה בטוחה לדפדפן — user_id ו-joined_by (מזהים של
 * משתמשים אחרים, שעלולים להכיל אימייל) נשארים בשרת; שם פונה אנונימי מוסתר.
 */
export function toPublicInquiry(i: OfficialInquiry, meId: string | null): PublicInquiry {
    return {
        id: i.id,
        text: i.text,
        author_name: i.anonymous ? '' : i.author_name,
        anonymous: i.anonymous,
        joinCount: i.joined_by.length,
        joinedByMe: meId ? i.joined_by.includes(meId) : false,
        mine: meId ? i.user_id === meId : false,
        reply_text: i.reply_text,
        replied_at: i.replied_at,
        created_at: i.created_at,
    };
}

/** המרת הכרת הטוב לצורה בטוחה לדפדפן — user_id נשאר בשרת, שם אנונימי מוסתר */
export function toPublicGratitude(g: GratitudeNote, meId: string | null): PublicGratitude {
    return {
        id: g.id,
        text: g.text,
        author_name: g.anonymous ? '' : g.author_name,
        anonymous: g.anonymous,
        mine: meId ? g.user_id === meId : false,
        created_at: g.created_at,
    };
}

/** המרת הצעה אזרחית לצורה בטוחה לדפדפן — user_id ו-supporters נשארים בשרת */
export function toPublicProposal(p: CivicProposal, meId: string | null): PublicProposal {
    return {
        id: p.id,
        title: p.title,
        text: p.text,
        proposer_name: p.anonymous ? '' : p.proposer_name,
        anonymous: p.anonymous,
        pros: p.pros,
        cons: p.cons,
        status: p.status,
        supportCount: p.supporters.length,
        supportedByMe: meId ? p.supporters.includes(meId) : false,
        mine: meId ? p.user_id === meId : false,
        official_ids: p.official_ids,
        updates: p.updates,
        created_at: p.created_at,
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

// ============================================================
// ---- מגמה לאורך זמן ----
// ============================================================

export interface TrendPoint {
    /** תחילת החודש, ISO — למפתח יציב ול-<time> */
    iso: string;
    /** תווית קצרה לציר: "8/26" */
    label: string;
    avg: number;
    count: number;
}

export interface Trend {
    points: TrendPoint[];
    /** ההפרש בין ממוצע המחצית המאוחרת לממוצע המוקדמת */
    delta: number;
    direction: 'up' | 'down' | 'flat';
}

/** מתחת לזה כל "מגמה" היא רעש, לא אות */
const TREND_MIN_REVIEWS = 5;
/** שינוי קטן מזה נחשב יציבות */
const TREND_EPSILON = 0.25;

/**
 * ממוצע חודשי + כיוון. עד היום created_at של דירוג לא שימש לשום חישוב:
 * דירוג משנתיים אחורה נספר בדיוק כמו דירוג של היום, ולא הייתה שום דרך
 * לראות אם מדורג משתפר או מידרדר.
 */
export function ratingTrend(
    reviews: readonly { created_at: string; overall: number }[],
    maxMonths = 12,
): Trend {
    const valid = reviews
        .map((r) => ({ t: new Date(r.created_at).getTime(), overall: r.overall }))
        .filter((r) => Number.isFinite(r.t) && r.overall > 0)
        .sort((a, b) => a.t - b.t);

    if (valid.length < TREND_MIN_REVIEWS) return { points: [], delta: 0, direction: 'flat' };

    const buckets = new Map<string, { sum: number; count: number; t: number }>();
    for (const r of valid) {
        const d = new Date(r.t);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const b = buckets.get(key);
        if (b) {
            b.sum += r.overall;
            b.count++;
        } else {
            buckets.set(key, { sum: r.overall, count: 1, t: Date.UTC(d.getFullYear(), d.getMonth(), 1) });
        }
    }

    const points: TrendPoint[] = [...buckets.entries()]
        .sort((a, b) => a[1].t - b[1].t)
        .slice(-maxMonths)
        .map(([key, b]) => {
            const [year, month] = key.split('-');
            return {
                iso: new Date(b.t).toISOString(),
                label: `${Number(month)}/${year.slice(2)}`,
                avg: b.sum / b.count,
                count: b.count,
            };
        });

    if (points.length < 2) return { points: [], delta: 0, direction: 'flat' };

    // מחצית מוקדמת מול מאוחרת — עמיד יותר מהשוואת נקודת קצה אחת לשנייה
    const mid = Math.floor(valid.length / 2);
    const early = valid.slice(0, mid);
    const late = valid.slice(valid.length - mid);
    const avgOf = (xs: typeof valid) => xs.reduce((s, r) => s + r.overall, 0) / xs.length;
    const delta = avgOf(late) - avgOf(early);

    return {
        points,
        delta,
        direction: delta > TREND_EPSILON ? 'up' : delta < -TREND_EPSILON ? 'down' : 'flat',
    };
}

/** עיצוב ציון לתצוגה: 4.3 / "—" */
export function fmtScore(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return '—';
    return (Math.round(v * 10) / 10).toFixed(1);
}
