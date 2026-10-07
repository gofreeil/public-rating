// ============================================================
// opinion.ts (server) - אירועי כוכב "דעת הציבור" שמגיעים מאתרי הרשת
// ראה src/lib/rating/opinion.ts לכללים ולחישוב הכוכב.
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import { invalidateRating, listOfficials } from './rating';
import { OFFICIAL_CATEGORY, groupByKey } from '$lib/rating/types';
import { heNormalize } from '$lib/rating/heSearch';
import {
    OPINION_CATEGORY,
    OPINION_REASONS,
    computeOpinionStar,
    type OpinionEvent,
    type OpinionReason,
    type OpinionStar,
} from '$lib/rating/opinion';

// אותו אוסף כמו ב-rating.ts
const ITEMS = '/api/pr-items';
/** חברי מועצה הם עובדי ציבור */
const COUNCIL_GROUP = 'public_servants';
const COUNCIL_POSITION = 'חבר מועצה';

interface RawItem {
    documentId: string;
    label: string | null;
    description: string | null;
    extra_fields: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

const ef = (i: RawItem): Record<string, unknown> =>
    i.extra_fields && typeof i.extra_fields === 'object' ? i.extra_fields : {};
const s = (v: unknown): string => (typeof v === 'string' ? v : '');

function mapEvent(item: RawItem): OpinionEvent {
    const x = ef(item);
    const reason = (s(x.reason) in OPINION_REASONS ? x.reason : 'no_answer') as OpinionReason;
    const days = Number(x.days);
    return {
        id: item.documentId,
        official_id: item.label ?? '',
        source: s(x.source),
        source_ref: s(x.source_ref),
        source_url: s(x.source_url),
        title: item.description ?? '',
        outcome: OPINION_REASONS[reason].outcome,
        reason,
        days: Number.isFinite(days) ? days : null,
        sent_at: s(x.sent_at) || null,
        responded_at: s(x.responded_at) || null,
        created_at: item.createdAt ?? '',
        updated_at: item.updatedAt ?? '',
    };
}

async function rawOpinionFor(officialId: string): Promise<RawItem[]> {
    const res = await strapiGet<{ data: RawItem[] }>(ITEMS, {
        'filters[category][$eq]': OPINION_CATEGORY,
        'filters[label][$eq]': officialId,
        'filters[status1][$eq]': 'active',
        'sort': 'updatedAt:desc',
        'pagination[limit]': '1000',
    });
    return res.data ?? [];
}

/** כל אירועי דעת הציבור של מדורג, חדש ראשון */
export async function getOpinionFor(officialId: string): Promise<OpinionEvent[]> {
    return (await rawOpinionFor(officialId)).map(mapEvent);
}

export async function getOpinionStar(officialId: string): Promise<OpinionStar> {
    return computeOpinionStar(await getOpinionFor(officialId));
}

// ---- שינויים אחרונים (לבאנר באתר המקור) ----

export interface RecentOpinionChange {
    officialId: string;
    name: string;
    position: string;
    org: string;
    title: string;
    outcome: OpinionEvent['outcome'];
    reason: OpinionReason;
    reasonLabel: string;
    days: number | null;
    sourceUrl: string;
    /** מתי הכוכב הושפע (קליטה/עדכון האירוע) */
    at: string;
    /** הכוכב הנוכחי של המדורג, מכל האירועים שלו */
    star: OpinionStar;
}

/**
 * האירועים האחרונים ממקור אחד (חדש ראשון), עם שם המדורג והכוכב הנוכחי שלו.
 * ציבורי: אותם נתונים שמוצגים בפרופיל המדורג.
 */
export async function listRecentOpinion(
    source: string,
    sinceDays: number,
    limit: number,
): Promise<RecentOpinionChange[]> {
    const res = await strapiGet<{ data: RawItem[] }>(ITEMS, {
        'filters[category][$eq]': OPINION_CATEGORY,
        'filters[status1][$eq]': 'active',
        'sort': 'updatedAt:desc',
        'pagination[limit]': '1000',
    });
    const events = (res.data ?? []).map(mapEvent).filter((e) => e.source === source);

    const byOfficial = new Map<string, OpinionEvent[]>();
    for (const e of events) byOfficial.set(e.official_id, [...(byOfficial.get(e.official_id) ?? []), e]);

    const officials = new Map((await listOfficials()).map((o) => [o.id, o]));
    const since = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

    return events
        .filter((e) => Date.parse(e.updated_at) >= since && officials.has(e.official_id))
        .slice(0, limit)
        .map((e) => {
            const o = officials.get(e.official_id)!;
            return {
                officialId: o.id,
                name: o.name,
                position: o.position,
                org: o.org,
                title: e.title,
                outcome: e.outcome,
                reason: e.reason,
                reasonLabel: OPINION_REASONS[e.reason].label,
                days: e.days,
                sourceUrl: e.source_url,
                at: e.updated_at,
                star: computeOpinionStar(byOfficial.get(e.official_id) ?? []),
            };
        });
}

// ---- איתור/יצירת המדורג ----

export interface ExternalOfficial {
    /** מזהה הנציג באתר המקור */
    externalId: string;
    name: string;
    role: string;
    city: string;
}

async function allOfficialItems(): Promise<RawItem[]> {
    const all: RawItem[] = [];
    for (let start = 0; ; start += 1000) {
        const res = await strapiGet<{ data: RawItem[] }>(ITEMS, {
            'filters[category][$eq]': OFFICIAL_CATEGORY,
            'filters[status1][$eq]': 'active',
            'pagination[start]': String(start),
            'pagination[limit]': '1000',
        });
        const page = res.data ?? [];
        all.push(...page);
        if (page.length < 1000) return all;
    }
}

/**
 * המדורג של נציג מאתר חיצוני: קודם לפי הקישור השמור (external_ids), אחר כך
 * לפי שם בקבוצת עובדי הציבור (עדיפות למי שהעיר מופיעה ברשות שלו), ואם אין —
 * נוצר פרופיל חדש ומאושר. ההתאמה נשמרת כדי שהפעם הבאה תהיה חד-משמעית.
 */
async function resolveOfficial(source: string, o: ExternalOfficial): Promise<{ id: string; created: boolean }> {
    const items = await allOfficialItems();
    const ext = (i: RawItem) => {
        const ids = ef(i).external_ids;
        return ids && typeof ids === 'object' ? (ids as Record<string, unknown>)[source] : undefined;
    };

    const linked = items.find((i) => ext(i) === o.externalId);
    if (linked) return { id: linked.documentId, created: false };

    const target = heNormalize(o.name);
    const city = heNormalize(o.city);
    const sameName = items.filter(
        (i) => s(ef(i).group) === COUNCIL_GROUP && heNormalize(i.label ?? '') === target && !ext(i),
    );
    const inCity = city ? sameName.filter((i) => heNormalize(s(ef(i).org)).includes(city)) : [];
    const match = inCity.length === 1 ? inCity[0] : sameName.length === 1 ? sameName[0] : null;

    if (match) {
        const x = ef(match);
        const ids = x.external_ids && typeof x.external_ids === 'object' ? x.external_ids : {};
        await strapiPut(`${ITEMS}/${match.documentId}`, {
            data: { extra_fields: { ...x, external_ids: { ...ids, [source]: o.externalId } } },
        });
        return { id: match.documentId, created: false };
    }

    const res = await strapiPost<{ data: RawItem }>(ITEMS, {
        data: {
            category: OFFICIAL_CATEGORY,
            label: o.name,
            description: '',
            user_id: null,
            extra_fields: {
                group: COUNCIL_GROUP,
                position: o.role || COUNCIL_POSITION,
                org: o.city ? `מועצת העיר ${o.city}` : '',
                approved: true,
                external_ids: { [source]: o.externalId },
            },
            icon: groupByKey(COUNCIL_GROUP)?.icon ?? '🏢',
            color: 'blue',
            status1: 'active',
            publishedAt: new Date().toISOString(),
        },
    });
    return { id: res.data.documentId, created: true };
}

// ---- רישום אירוע ----

export interface RecordOpinionInput {
    source: string;
    sourceRef: string;
    sourceUrl: string;
    title: string;
    reason: OpinionReason;
    days: number | null;
    sentAt: string | null;
    respondedAt: string | null;
    official: ExternalOfficial;
}

/** רישום (או עדכון, לפי source+sourceRef) של אירוע — מחזיר את המדורג והכוכב המעודכן */
export async function recordOpinion(
    input: RecordOpinionInput,
): Promise<{ officialId: string; created: boolean; star: OpinionStar }> {
    const { id: officialId, created } = await resolveOfficial(input.source, input.official);

    const fields = {
        source: input.source,
        source_ref: input.sourceRef,
        source_url: input.sourceUrl,
        outcome: OPINION_REASONS[input.reason].outcome,
        reason: input.reason,
        days: input.days,
        sent_at: input.sentAt,
        responded_at: input.respondedAt,
    };

    const existing = (await rawOpinionFor(officialId)).find(
        (i) => s(ef(i).source) === input.source && s(ef(i).source_ref) === input.sourceRef,
    );
    if (existing) {
        await strapiPut(`${ITEMS}/${existing.documentId}`, {
            data: { description: input.title, extra_fields: fields },
        });
    } else {
        await strapiPost(ITEMS, {
            data: {
                category: OPINION_CATEGORY,
                label: officialId,
                description: input.title,
                user_id: null,
                extra_fields: fields,
                icon: '📣',
                color: fields.outcome === 'positive' ? 'green' : 'red',
                status1: 'active',
                publishedAt: new Date().toISOString(),
            },
        });
    }

    invalidateRating();
    return { officialId, created, star: await getOpinionStar(officialId) };
}
