// ============================================================
// opinion.ts - כוכב "דעת הציבור"
//
// כוכב נפרד מחמשת המדדים, שנבנה רק מהטיפול בפניות ציבור שנשלחו לנציג
// דרך אתר "מבקר רשויות המדינה" (criticism.gofreeil.com) ושמודרטור העיר
// שלח לכאן: מענה בזמן סביר → חיובי; ללא מענה / באיחור / לא הולם → שלילי.
//
// pr_opinion: label=<official documentId>, description=כותרת הפנייה,
//             extra_fields={source, source_ref, source_url, outcome, reason,
//                           days, sent_at, responded_at}
// ============================================================

export const OPINION_CATEGORY = 'pr_opinion';

export type OpinionOutcome = 'positive' | 'negative';
export type OpinionReason = 'on_time' | 'late' | 'no_answer' | 'inappropriate';

export const OPINION_REASONS: Record<OpinionReason, { label: string; outcome: OpinionOutcome }> = {
    on_time: { label: 'טופלה בזמן סביר', outcome: 'positive' },
    late: { label: 'מענה באיחור', outcome: 'negative' },
    no_answer: { label: 'ללא מענה', outcome: 'negative' },
    inappropriate: { label: 'מענה לא הולם', outcome: 'negative' },
};

export function isOpinionReason(v: unknown): v is OpinionReason {
    return typeof v === 'string' && v in OPINION_REASONS;
}

export interface OpinionEvent {
    id: string;
    official_id: string;
    source: string;
    /** מזהה הפנייה באתר המקור — שליחה חוזרת מעדכנת ולא נספרת פעמיים */
    source_ref: string;
    source_url: string;
    title: string;
    outcome: OpinionOutcome;
    reason: OpinionReason;
    days: number | null;
    sent_at: string | null;
    responded_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface OpinionStar {
    /** 1-5; null = טרם התקבלו פניות */
    score: number | null;
    positive: number;
    negative: number;
    count: number;
}

/**
 * ציון 1-5 מיחס הפניות שטופלו כראוי, עם החלקת לפלס (+1/+2): פנייה בודדת
 * לא מקפיצה ל-5 או מפילה ל-1 — בלי פניות הנקודה הניטרלית היא 3.
 */
export function computeOpinionStar(events: Pick<OpinionEvent, 'outcome'>[]): OpinionStar {
    const positive = events.filter((e) => e.outcome === 'positive').length;
    const count = events.length;
    const negative = count - positive;
    if (count === 0) return { score: null, positive, negative, count };
    const score = 1 + (4 * (positive + 1)) / (count + 2);
    return { score: Math.round(score * 100) / 100, positive, negative, count };
}
