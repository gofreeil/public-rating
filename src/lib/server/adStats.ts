// ============================================================
// adStats.ts - צבירת מדדי הפרסומות.
//
// אחסון: שורה בודדת (category pr_ad_stats) שב-extra_fields.ad_stats
// שלה יושב עץ המונים של כל המודעות. המפתחות קצרים (i/c/v/l) ומפת
// הימים נגזמת ל-60 יום — לא קוסמטיקה, אלא כדי שהשורה היחידה תישאר
// מתחת לתקרת ה-1MB של Strapi.
//
// מגבלה שחשוב שתהיה מודעת: הצבירה היא בזיכרון התהליך. בפריסה
// serverless מונים שטרם נשטפו הולכים לאיבוד בכיבוי מופע, והשורה
// היחידה היא last-write-wins בין למבדות מקבילות. מקובל למדדי פרסום —
// לעולם לא לשימוש טרנזקציוני. אם יידרשו מספרים אמינים, יש לעבור
// לשורת מדדים לכל מודעה כך שכותבים מקבילים נוגעים במסמכים שונים.
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import { AD_STATS_CATEGORY } from '$lib/ads/types';
import type { AdMetric } from '$lib/ads/adTrack';

const ITEMS = '/api/pr-items';
const KEEP_DAYS = 60;

/** i=חשיפות, c=קליקים, v=צפיות בנחיתה, l=פניות */
type Counter = { i: number; c: number; v: number; l: number };
type AdEntry = { t: Counter; d: Record<string, Counter> };
type StatsTree = Record<string, AdEntry>;

const FIELD: Record<AdMetric, keyof Counter> = {
    impressions: 'i',
    clicks: 'c',
    landing: 'v',
    leads: 'l',
};

export interface AdStatRow {
    impressions: number;
    clicks: number;
    landing: number;
    leads: number;
    ctr: number;
}

// ---- מצב בזיכרון ----
const pending: StatsTree = {};
let pendingCount = 0;
let lastFlush = 0;
let statsItemId: string | null = null;

const FLUSH_THRESHOLD = 10;
const FLUSH_INTERVAL_MS = 20_000;

function emptyCounter(): Counter {
    return { i: 0, c: 0, v: 0, l: 0 };
}

function entryOf(tree: StatsTree, id: string): AdEntry {
    if (!tree[id]) tree[id] = { t: emptyCounter(), d: {} };
    if (!tree[id].t) tree[id].t = emptyCounter();
    if (!tree[id].d) tree[id].d = {};
    return tree[id];
}

/** מפתח היום נחתם ברגע האירוע — שטיפה שחוצה חצות לא תשייך לתאריך הלא נכון */
function dayKey(now = new Date()): string {
    return now.toISOString().slice(0, 10);
}

function addTo(tree: StatsTree, id: string, metric: AdMetric, day: string): void {
    const entry = entryOf(tree, id);
    const field = FIELD[metric];
    entry.t[field] = (entry.t[field] ?? 0) + 1;
    if (!entry.d[day]) entry.d[day] = emptyCounter();
    entry.d[day][field] = (entry.d[day][field] ?? 0) + 1;
}

/** גיזום מפת הימים — הסכומים הכוללים ב-t לעולם אינם נגזמים */
function prune(tree: StatsTree): void {
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const id of Object.keys(tree)) {
        const days = tree[id]?.d ?? {};
        for (const day of Object.keys(days)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < cutoff) delete days[day];
        }
    }
}

async function loadStatsRow(): Promise<{ id: string; tree: StatsTree } | null> {
    try {
        const res = await strapiGet<{ data: { documentId: string; extra_fields: Record<string, unknown> | null }[] }>(
            ITEMS,
            {
                'filters[category][$eq]': AD_STATS_CATEGORY,
                'pagination[limit]': '1',
            },
        );
        const row = res.data?.[0];
        if (!row) return null;
        statsItemId = row.documentId;
        const raw = row.extra_fields?.ad_stats;
        return { id: row.documentId, tree: (raw && typeof raw === 'object' ? raw : {}) as StatsTree };
    } catch (e) {
        console.warn('[ads] stats load failed:', e instanceof Error ? e.message : e);
        return null;
    }
}

async function flush(): Promise<void> {
    if (!pendingCount) return;
    const batch: StatsTree = JSON.parse(JSON.stringify(pending));
    for (const k of Object.keys(pending)) delete pending[k];
    pendingCount = 0;
    lastFlush = Date.now();

    try {
        const existing = await loadStatsRow();
        const tree: StatsTree = existing?.tree ?? {};

        for (const [id, entry] of Object.entries(batch)) {
            const target = entryOf(tree, id);
            for (const f of ['i', 'c', 'v', 'l'] as (keyof Counter)[]) {
                target.t[f] = (target.t[f] ?? 0) + (entry.t?.[f] ?? 0);
            }
            for (const [day, counter] of Object.entries(entry.d ?? {})) {
                if (!target.d[day]) target.d[day] = emptyCounter();
                for (const f of ['i', 'c', 'v', 'l'] as (keyof Counter)[]) {
                    target.d[day][f] = (target.d[day][f] ?? 0) + (counter[f] ?? 0);
                }
            }
        }
        prune(tree);

        if (existing) {
            await strapiPut(`${ITEMS}/${existing.id}`, { data: { extra_fields: { ad_stats: tree } } });
        } else {
            const res = await strapiPost<{ data: { documentId: string } }>(ITEMS, {
                data: {
                    category: AD_STATS_CATEGORY,
                    label: 'pr-ad-stats',
                    description: '[SYSTEM] מדדי פרסומות — דירוג ציבורי',
                    icon: '📊',
                    color: 'blue',
                    status1: 'active',
                    extra_fields: { ad_stats: tree },
                    publishedAt: new Date().toISOString(),
                },
            });
            statsItemId = res.data.documentId;
        }
    } catch (e) {
        console.warn('[ads] stats flush failed:', e instanceof Error ? e.message : e);
    }
}

/**
 * קליטת אירועים. הכתיבה ל-Strapi נדחית — הקריאה חוזרת מיד כדי שנקודת
 * הקצה של המדידה לא תמתין לרשת.
 */
export function recordAdEvents(events: { id: string; metric: AdMetric }[]): void {
    const day = dayKey();
    for (const e of events) {
        if (!e.id || !FIELD[e.metric]) continue;
        addTo(pending, e.id, e.metric, day);
        pendingCount++;
    }
    if (pendingCount >= FLUSH_THRESHOLD || Date.now() - lastFlush > FLUSH_INTERVAL_MS) {
        void flush();
    }
}

/** מדדים לתצוגה — מאוחדים עם מה שטרם נשטף, כדי שהאדמין לא יראה אפסים */
export async function getAdStats(ids: string[]): Promise<Record<string, AdStatRow>> {
    const out: Record<string, AdStatRow> = {};
    if (!ids.length) return out;

    let tree: StatsTree = {};
    try {
        tree = (await loadStatsRow())?.tree ?? {};
    } catch {
        tree = {};
    }

    for (const id of ids) {
        const stored = tree[id]?.t ?? emptyCounter();
        const buffered = pending[id]?.t ?? emptyCounter();
        const impressions = (stored.i ?? 0) + (buffered.i ?? 0);
        const clicks = (stored.c ?? 0) + (buffered.c ?? 0);
        out[id] = {
            impressions,
            clicks,
            landing: (stored.v ?? 0) + (buffered.v ?? 0),
            leads: (stored.l ?? 0) + (buffered.l ?? 0),
            ctr: impressions > 0 ? clicks / impressions : 0,
        };
    }
    return out;
}

export { statsItemId };
