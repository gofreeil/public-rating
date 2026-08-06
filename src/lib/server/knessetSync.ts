// ============================================================
// knessetSync.ts — סנכרון נתונים חיצוני, מופעל בכפתור מ-/admin/officials
//
// מקור 1: ה-OData הרשמי של הכנסת (knesset.gov.il/Odata) — אותו מקור
//   שמזין את עמוד "כל חברי הכנסת המכהנים" באתר הכנסת. עדיף על גירוד
//   העמוד עצמו: העמוד הוא אפליקציית JS ריקה ב-HTML, וה-OData מתועד ויציב.
// מקור 2: "מיניסטרמטר" של שקוף — מדד ביצועי שרי הממשלה. נקרא דרך
//   ה-WP REST API (wp-json) שמחזיר JSON יציב, לא דרך ה-HTML של התבנית.
//
// עקרונות בטיחות:
//   הכנסת = מקור אמת לתפקיד/סיעה/מצבת המכהנים. שדות שאדמין מילא ידנית
//   (תמונה, פרטי קשר, הבטחות, ביו מותאם) לעולם לא נדרסים. אף מדורג לא
//   נמחק אוטומטית — מי שאינו ברשימת המכהנים רק מדווח לאדמין.
// ============================================================

import {
    applyOfficialSync,
    createOfficial,
    getOfficialForSync,
    invalidateRating,
    listOfficialsForSync,
    saveRecordLog,
    saveSyncLog,
    type OfficialSyncPatch,
    type RecordSyncLog,
    type SyncLog,
    type SyncOfficialRow,
} from './rating.js';
import type { KnessetRecord, RecordRole, ShakufData } from '$lib/rating/types';

const ODATA = 'https://knesset.gov.il/Odata/ParliamentInfo.svc';
const SHAKUF_BASE = 'https://shakuf.co.il';
const SHAKUF_API = `${SHAKUF_BASE}/wp-json/wp/v2/data/62356`;
const FALLBACK_KNESSET_NUM = 25;
const FETCH_HEADERS = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; rating.gofreeil.com data-sync)',
};

// PositionID → משמעות (מתוך KNS_Position)
const POS = {
    MK: [43, 61], // חבר/חברת הכנסת
    FACTION_MEMBER: [54], // חבר/ת סיעה — מקור שם הסיעה
    MINISTER: [39, 57], // שר/שרה
    DEPUTY_MINISTER: [40, 59], // סגן/סגנית שר
    PM: [45], // ראש הממשלה
};
const WANTED = new Set(Object.values(POS).flat());

// FactionID → שם מוכר (כנסת 25); סיעה לא ממופה נופלת לשם הרשמי מה-OData
const FACTION_SHORT: Record<number, string> = {
    1095: 'ש"ס',
    1096: 'הליכוד',
    1097: 'הציונות הדתית',
    1098: 'המחנה הממלכתי',
    1099: 'רע"ם',
    1100: 'העבודה',
    1101: 'יהדות התורה',
    1102: 'יש עתיד',
    1103: 'חד"ש-תע"ל',
    1104: 'ישראל ביתנו',
    1105: 'הציונות הדתית',
    1106: 'עוצמה יהודית',
    1107: 'נעם',
    1108: 'תקווה חדשה',
    1110: 'המחנה הממלכתי',
};

// שם רשמי (כולל שם אמצעי) → השם המוכר לציבור — לרשומות *חדשות* בלבד;
// רשומות קיימות מותאמות גם בהתאמת תת-קבוצת מילים (ר' matchByName)
const NAME_OVERRIDES: Record<string, string> = {
    'אריה מכלוף דרעי': 'אריה דרעי',
    'בנימין גנץ': 'בני גנץ',
    'יצחק שמעון וסרלאוף': 'יצחק וסרלאוף',
    'יולי יואל אדלשטיין': 'יולי אדלשטיין',
    'מירי מרים רגב': 'מירי רגב',
    'מכלוף מיקי זוהר': 'מיקי זוהר',
    'אורית מלכה סטרוק': 'אורית סטרוק',
    'אביחי אברהם בוארון': 'אביחי בוארון',
    'חוה אתי עטייה': 'אתי עטייה',
    'קטי קטרין שטרית': 'קטי שטרית',
    'מיכל מרים וולדיגר': 'מיכל וולדיגר',
    'ששון ששי גואטה': 'ששי גואטה',
    'צבי ידידיה סוכות': 'צבי סוכות',
    'מיכאל מרדכי ביטון': 'מיכאל ביטון',
    'שרן מרים השכל': 'שרן השכל',
    'יצחק גולדקנופ': 'יצחק גולדקנופף',
    'חנוך דב מלביצקי': 'חנוך מלביצקי',
};

// ---- כלי עזר ----

/** השוואת שמות סלחנית: מקפים→רווח, בלי גרשיים/גרש, כתיב ביטחון/בטחון אחיד */
function norm(s: string | null | undefined): string {
    return String(s ?? '')
        .replace(/[־–—-]/g, ' ')
        .replace(/["'׳״`]/g, '')
        .replace(/ביטחון/g, 'בטחון')
        .replace(/\s+/g, ' ')
        .trim();
}

/** ריצת מיפוי עם תקרת מקביליות — כדי לא להפגיז את Strapi/OData */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i]);
        }
    });
    await Promise.all(workers);
    return out;
}

/** fetch עם timeout ושני ניסיונות — מקורות ממשלתיים אוהבים להתעטש */
async function fetchJson<T>(url: string): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await fetch(url, {
                headers: FETCH_HEADERS,
                signal: AbortSignal.timeout(20_000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as T;
        } catch (e) {
            lastErr = e;
        }
    }
    throw new Error(`${url.split('?')[0]} → ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

// ============================================================
// ---- מקור 1: מצבת המכהנים מה-OData של הכנסת ----
// ============================================================

interface P2PRow {
    PersonID: number;
    PositionID: number;
    KnessetNum: number;
    StartDate: string | null;
    FinishDate: string | null;
    GovMinistryID: number | null;
    GovMinistryName: string | null;
    DutyDesc: string | null;
    FactionID: number | null;
    FactionName: string | null;
    IsCurrent: boolean;
}

interface PersonRow {
    PersonID: number;
    FirstName: string | null;
    LastName: string | null;
    GenderDesc: string | null;
}

export interface RosterEntry {
    personId: number;
    name: string;
    position: string;
    org: string;
    /** ביו אוטומטי — נכתב רק כשאין ביו ידני */
    bio: string;
    /** תיקי שר (לא סגנים) — למיפוי מדד שקוף למשרד */
    ministries: { name: string; extra: boolean }[];
}

async function odataAll<T>(entity: string, filter: string): Promise<T[]> {
    const PAGE = 100; // תקרת העמוד של ה-OData של הכנסת
    const rows: T[] = [];
    for (let skip = 0; ; skip += PAGE) {
        const json = await fetchJson<{ value?: T[] }>(
            `${ODATA}/${entity}?$filter=${encodeURIComponent(filter)}&$top=${PAGE}&$skip=${skip}&$format=json`,
        );
        const page = json.value ?? [];
        rows.push(...page);
        if (page.length < PAGE) return rows;
    }
}

/** "משרד החינוך" → "שר החינוך" · "המשרד לביטחון לאומי" → "השר לביטחון לאומי" */
function ministerTitle(ministry: string, female: boolean): string {
    const base = female ? 'שרת' : 'שר';
    const m = ministry.trim();
    if (!m) return female ? 'שרה' : 'שר';
    if (m === 'משרד ראש הממשלה') return `${base} במשרד ראש הממשלה`;
    if (m.startsWith('המשרד ל')) return `${female ? 'השרה' : 'השר'} ל${m.slice('המשרד ל'.length)}`;
    if (m.startsWith('משרד ')) return `${base} ${m.slice('משרד '.length)}`;
    return `${base} — ${m}`;
}

function deputyTitle(ministry: string, female: boolean): string {
    const base = female ? 'סגנית שר' : 'סגן שר';
    const m = ministry.trim().replace(/^המשרד/, 'משרד');
    return m ? `${base} ב${m}` : base;
}

function autoBio(position: string, org: string): string {
    return org ? `${position} מטעם ${org}` : position;
}

/** שם סיעה תצוגתי: המיפוי המקוצר, ואם אין — השם הרשמי בלי "בראשות ..." */
function factionDisplay(factionId: number | null, factionName: string | null): string {
    if (factionId && FACTION_SHORT[factionId]) return FACTION_SHORT[factionId];
    return String(factionName ?? '').replace(/ בראשות .*$/, '').trim();
}

/**
 * מספר הכנסת המכהנת — עמיד לחילופי כנסות בלי שינוי קוד.
 * KNS_KnessetDates מחזיק שורה לכל מושב; המכהנת היא הגבוהה שבהן.
 */
export async function currentKnessetNum(): Promise<number> {
    try {
        const cur = await fetchJson<{ value?: { KnessetNum: number }[] }>(
            `${ODATA}/KNS_KnessetDates?$filter=${encodeURIComponent('IsCurrent eq true')}&$top=100&$format=json`,
        );
        const nums = (cur.value ?? []).map((r) => Number(r.KnessetNum)).filter((n) => Number.isInteger(n) && n > 0);
        if (nums.length) return Math.max(...nums);
    } catch {
        // נופלים לברירת המחדל — לא מפילים סנכרון שלם על שאילתת עזר
    }
    return FALLBACK_KNESSET_NUM;
}

export async function fetchKnessetRoster(): Promise<RosterEntry[]> {
    const knessetNum = await currentKnessetNum();

    const p2p = await odataAll<P2PRow>(
        'KNS_PersonToPosition',
        `KnessetNum eq ${knessetNum} and IsCurrent eq true`,
    );
    const relevant = p2p.filter((r) => WANTED.has(r.PositionID));

    interface Agg {
        mk: boolean;
        pm: boolean;
        ministries: { duty: string; ministry: string; extra: boolean }[];
        deputies: { duty: string; ministry: string }[];
        factionId: number | null;
        factionName: string | null;
        factionStart: string;
    }
    const people = new Map<number, Agg>();
    for (const r of relevant) {
        const p =
            people.get(r.PersonID) ??
            ({ mk: false, pm: false, ministries: [], deputies: [], factionId: null, factionName: null, factionStart: '' } as Agg);
        const duty = (r.DutyDesc ?? '').trim();
        const ministry = (r.GovMinistryName ?? '').trim();
        if (POS.MK.includes(r.PositionID)) p.mk = true;
        if (POS.PM.includes(r.PositionID)) p.pm = true;
        if (POS.MINISTER.includes(r.PositionID)) {
            p.ministries.push({ duty, ministry, extra: duty.includes('נוסף') });
        }
        if (POS.DEPUTY_MINISTER.includes(r.PositionID)) p.deputies.push({ duty, ministry });
        if (POS.FACTION_MEMBER.includes(r.PositionID) && (r.StartDate ?? '') >= p.factionStart) {
            p.factionId = r.FactionID;
            p.factionName = r.FactionName;
            p.factionStart = r.StartDate ?? '';
        }
        people.set(r.PersonID, p);
    }

    // שרים "נורווגים" בלי רשומת סיעה נוכחית — שליפת הסיעה האחרונה שלהם במרוכז
    const noFaction = [...people.entries()].filter(([, p]) => !p.factionId).map(([pid]) => pid);
    for (let i = 0; i < noFaction.length; i += 15) {
        const batch = noFaction.slice(i, i + 15);
        const ors = batch.map((id) => `PersonID eq ${id}`).join(' or ');
        const rows = await odataAll<P2PRow>(
            'KNS_PersonToPosition',
            `KnessetNum eq ${knessetNum} and PositionID eq 54 and (${ors})`,
        );
        for (const pid of batch) {
            const latest = rows
                .filter((r) => r.PersonID === pid)
                .sort((a, b) => String(b.StartDate).localeCompare(String(a.StartDate)))[0];
            const p = people.get(pid);
            if (latest && p) {
                p.factionId = latest.FactionID;
                p.factionName = latest.FactionName;
            }
        }
    }

    // שמות ומגדר — באצוות של 20, במקביל
    const ids = [...people.keys()];
    const batches: number[][] = [];
    for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));
    const persons = new Map<number, PersonRow>();
    const results = await mapLimit(batches, 4, async (batch) => {
        const filter = batch.map((id) => `PersonID eq ${id}`).join(' or ');
        const json = await fetchJson<{ value?: PersonRow[] }>(
            `${ODATA}/KNS_Person?$filter=${encodeURIComponent(filter)}&$format=json`,
        );
        return json.value ?? [];
    });
    for (const row of results.flat()) persons.set(row.PersonID, row);

    const entries: RosterEntry[] = [];
    for (const [pid, p] of people) {
        const person = persons.get(pid);
        if (!person) continue;
        const rawName = `${person.FirstName ?? ''} ${person.LastName ?? ''}`.replace(/\s+/g, ' ').trim();
        if (!rawName) continue;
        const name = NAME_OVERRIDES[rawName] ?? rawName;
        const female = person.GenderDesc === 'נקבה';
        const org = factionDisplay(p.factionId, p.factionName);

        // תיק "אמיתי" עדיף על "שר נוסף במשרד X" כשיש כמה תיקים
        const pick = <T extends { duty: string }>(list: T[]) =>
            list.find((x) => x.duty && !x.duty.includes('נוסף')) ?? list[0];

        let position: string;
        if (p.pm) position = 'ראש הממשלה';
        else if (p.ministries.length) {
            const m = pick(p.ministries);
            position = m.duty || ministerTitle(m.ministry, female);
        } else if (p.deputies.length) {
            const m = pick(p.deputies);
            position = m.duty || deputyTitle(m.ministry, female);
        } else position = female ? 'חברת כנסת' : 'חבר כנסת';

        entries.push({
            personId: pid,
            name,
            position,
            org,
            bio: autoBio(position, org),
            ministries: p.ministries
                .filter((m) => m.ministry)
                .map((m) => ({ name: m.ministry, extra: m.extra })),
        });
    }
    return entries;
}

// ============================================================
// ---- מקור 2: המיניסטרמטר של שקוף ----
// ============================================================

export interface ShakufEntry {
    ministry: string;
    summary: string;
    reportUrl: string;
    sourceDate: string;
}

/** &quot; ‎&#8221; וחבריהם → התו עצמו (רק מה שמופיע בפועל בתוכן של שקוף) */
function decodeEntities(s: string): string {
    return s
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&apos;/g, "'");
}

function stripTags(s: string): string {
    return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * חילוץ בלוקי המשרדים מתוכן העמוד: כל <h2> הוא שם משרד; משפט הסיכום הוא
 * ה-<strong> הראשון אחריו שמכיל "מדד"/"ציון"; הקישור הוא ה-/data/N הראשון
 * אחריו — הכל לפני ה-<h2> הבא. משרד "בקרוב" (בלי דו"ח) מדולג מעצמו.
 */
export function parseShakufContent(html: string, sourceDate: string): ShakufEntry[] {
    interface Token { pos: number; kind: 'h2' | 'sum' | 'link'; text: string }
    const tokens: Token[] = [];
    for (const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)) {
        tokens.push({ pos: m.index ?? 0, kind: 'h2', text: stripTags(m[1]) });
    }
    for (const m of html.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/g)) {
        const text = stripTags(m[1]);
        if (/מדד|ציון/.test(text)) tokens.push({ pos: m.index ?? 0, kind: 'sum', text });
    }
    for (const m of html.matchAll(/href="([^"]*\/data\/\d+)"/g)) {
        tokens.push({ pos: m.index ?? 0, kind: 'link', text: m[1] });
    }
    tokens.sort((a, b) => a.pos - b.pos);

    const entries: ShakufEntry[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.kind !== 'h2' || !t.text.includes('משרד')) continue;
        let summary = '';
        let reportUrl = '';
        for (let j = i + 1; j < tokens.length && tokens[j].kind !== 'h2'; j++) {
            if (tokens[j].kind === 'sum' && !summary) summary = tokens[j].text;
            if (tokens[j].kind === 'link' && !reportUrl) {
                reportUrl = new URL(tokens[j].text, SHAKUF_BASE).toString();
            }
        }
        if (!summary || !reportUrl) continue; // "בקרוב" או בלוק שאינו משרד
        if (entries.some((e) => e.ministry === t.text)) continue; // כפילות בעמוד
        entries.push({ ministry: t.text, summary, reportUrl, sourceDate });
    }
    return entries;
}

export async function fetchShakufMinistermeter(): Promise<ShakufEntry[]> {
    const json = await fetchJson<{ modified?: string; content?: { rendered?: string } }>(SHAKUF_API);
    const html = json.content?.rendered ?? '';
    if (!html) throw new Error('שקוף: תוכן העמוד ריק');
    const entries = parseShakufContent(html, json.modified ?? '');
    if (!entries.length) throw new Error('שקוף: לא זוהו בלוקי משרדים — ייתכן שמבנה העמוד השתנה');
    return entries;
}

/** "משרד התחבורה" → "תחבורה" · "המשרד לביטחון לאומי" → "בטחון לאומי" (אחרי norm) */
function ministryKeyword(title: string): string {
    const n = norm(title);
    for (const prefix of ['המשרד ל', 'משרד ה', 'משרד ']) {
        if (n.startsWith(prefix)) return n.slice(prefix.length).trim();
    }
    return n;
}

// ============================================================
// ---- רזומה פרלמנטרית מהקדנציה (per-MK, מה-OData) ----
//
// מה נשאב לכל מכהן: ציר התפקידים בקדנציה (KNS_PersonToPosition), ותק
// (באילו כנסות כיהן/ה), מאזן החקיקה (KNS_BillInitiator + KNS_Bill לפי
// סטטוס), שאילתות והצעות לסדר, ולשרים — השאילתות שהופנו למשרד ומועדי
// המענה בפועל. הכל ספירות מנתוני מקור, בלי פרשנות.
// ============================================================

interface BillRow {
    BillID: number;
    StatusID: number;
    Name: string | null;
    PublicationDate: string | null;
    LastUpdatedDate: string | null;
}
interface QueryRow {
    Name: string | null;
    SubmitDate: string | null;
    ReplyMinisterDate: string | null;
    ReplyDatePlanned: string | null;
}

/** תיאור סטטוס → דלי תצוגה. עדיף על מיפוי StatusID קשיח: 35 סטטוסים משתנים */
function billBucket(desc: string): 'passed' | 'merged' | 'stopped' | 'in_progress' {
    if (desc.includes('התקבלה בקריאה שלישית')) return 'passed';
    if (desc.includes('מוזגה')) return 'merged';
    if (desc.includes('נעצרה') || desc.includes('נדחתה')) return 'stopped';
    return 'in_progress';
}

/** מפת StatusID→תיאור — נשלפת פעם אחת לריצה ומועברת לכל המכהנים */
export async function fetchStatusMap(): Promise<Map<number, string>> {
    const rows = await odataAll<{ StatusID: number; Desc: string | null }>('KNS_Status', 'StatusID gt 0');
    return new Map(rows.map((r) => [r.StatusID, r.Desc ?? '']));
}

/** תפקיד לתצוגה בציר הזמן; ריק = שורה שלא מציגים (חבר סיעה בלי שם סיעה) */
function roleTitle(row: P2PRow): string {
    const duty = (row.DutyDesc ?? '').trim();
    const ministry = (row.GovMinistryName ?? '').trim();
    if (POS.PM.includes(row.PositionID)) return 'ראש הממשלה';
    if (POS.MINISTER.includes(row.PositionID)) return duty || (ministry ? `שר/ה — ${ministry}` : 'שר/ה');
    if (POS.DEPUTY_MINISTER.includes(row.PositionID)) return duty || (ministry ? `סגן/ית שר ב${ministry}` : 'סגן/ית שר');
    if (POS.MK.includes(row.PositionID)) return 'חבר/ת הכנסת';
    if (POS.FACTION_MEMBER.includes(row.PositionID)) {
        const faction = factionDisplay(row.FactionID, row.FactionName);
        return faction ? `סיעת ${faction}` : '';
    }
    return duty;
}

/** שליפת שורות KNS_Bill לפי מזהים — אצוות של 45 (מעל ~50 ה-URL נחתך ל-404) */
async function billsByIds(ids: number[], knessetNum: number): Promise<BillRow[]> {
    const batches: number[][] = [];
    for (let i = 0; i < ids.length; i += 45) batches.push(ids.slice(i, i + 45));
    const pages = await mapLimit(batches, 3, (batch) =>
        fetchJson<{ value?: BillRow[] }>(
            `${ODATA}/KNS_Bill?$filter=${encodeURIComponent(
                `KnessetNum eq ${knessetNum} and (${batch.map((id) => `BillID eq ${id}`).join(' or ')})`,
            )}&$top=100&$format=json`,
        ).then((j) => j.value ?? []),
    );
    return pages.flat();
}

/** מיון יורד לפי תאריך (מחרוזות ISO — השוואה לקסיקוגרפית מספיקה) */
function byDateDesc<T>(rows: T[], date: (r: T) => string | null): T[] {
    return [...rows].sort((a, b) => String(date(b) ?? '').localeCompare(String(date(a) ?? '')));
}

const dayOf = (v: string | null | undefined) => String(v ?? '').slice(0, 10);

function toRecordQuery(q: QueryRow) {
    return {
        name: (q.Name ?? '').trim(),
        submitted: dayOf(q.SubmitDate),
        replied: dayOf(q.ReplyMinisterDate),
    };
}

export async function fetchKnessetRecord(
    personId: number,
    knessetNum: number,
    statusMap: Map<number, string>,
): Promise<KnessetRecord> {
    const [person, positions, initiator, queries, agenda] = await Promise.all([
        fetchJson<{ value?: { Email: string | null }[] }>(
            `${ODATA}/KNS_Person?$filter=${encodeURIComponent(`PersonID eq ${personId}`)}&$top=1&$format=json`,
        ).then((j) => j.value?.[0] ?? null),
        odataAll<P2PRow>('KNS_PersonToPosition', `PersonID eq ${personId}`),
        odataAll<{ BillID: number; IsInitiator: boolean }>('KNS_BillInitiator', `PersonID eq ${personId}`),
        odataAll<QueryRow>('KNS_Query', `PersonID eq ${personId} and KnessetNum eq ${knessetNum}`),
        odataAll<{ Name: string | null; LastUpdatedDate: string | null }>(
            'KNS_Agenda',
            `InitiatorPersonID eq ${personId} and KnessetNum eq ${knessetNum}`,
        ),
    ]);

    const leadIds = initiator.filter((r) => r.IsInitiator).map((r) => r.BillID);
    const coIds = initiator.filter((r) => !r.IsInitiator).map((r) => r.BillID);
    const [lead, cosigned] = await Promise.all([
        billsByIds(leadIds, knessetNum),
        billsByIds(coIds, knessetNum),
    ]);

    const counts = { passed: 0, merged: 0, stopped: 0, in_progress: 0 };
    const passedBills: BillRow[] = [];
    const activeBills: BillRow[] = [];
    for (const b of lead) {
        const bucket = billBucket(statusMap.get(b.StatusID) ?? '');
        counts[bucket]++;
        if (bucket === 'passed') passedBills.push(b);
        else if (bucket === 'in_progress') activeBills.push(b);
    }

    // ותק: באילו כנסות כיהן/ה כח"כ
    const knessets = [
        ...new Set(positions.filter((p) => POS.MK.includes(p.PositionID)).map((p) => p.KnessetNum)),
    ].sort((a, b) => a - b);

    // ציר הזמן של הקדנציה הנוכחית — לפי סדר תחילת הכהונה
    const roles: RecordRole[] = positions
        .filter((p) => p.KnessetNum === knessetNum && WANTED.has(p.PositionID))
        .map((p) => ({
            title: roleTitle(p),
            from: (p.StartDate ?? '').slice(0, 10),
            to: (p.FinishDate ?? '').slice(0, 10) || null,
        }))
        .filter((r) => r.title && r.from)
        .sort((a, b) => a.from.localeCompare(b.from));

    // לשרים: השאילתות שהופנו למשרד — כמה נענו וכמה אחרי המועד שנקבע
    const ministryRow = positions.find(
        (p) => p.KnessetNum === knessetNum && p.IsCurrent && p.GovMinistryID && POS.MINISTER.includes(p.PositionID),
    );
    let ministryQueries: KnessetRecord['ministry_queries'] = null;
    if (ministryRow?.GovMinistryID) {
        const rows = await odataAll<QueryRow>(
            'KNS_Query',
            `KnessetNum eq ${knessetNum} and GovMinistryID eq ${ministryRow.GovMinistryID}`,
        );
        ministryQueries = {
            ministry: (ministryRow.GovMinistryName ?? '').trim(),
            total: rows.length,
            answered: rows.filter((q) => q.ReplyMinisterDate).length,
            late: rows.filter(
                (q) => q.ReplyMinisterDate && q.ReplyDatePlanned && q.ReplyMinisterDate > q.ReplyDatePlanned,
            ).length,
            recent: byDateDesc(rows, (q) => q.SubmitDate).slice(0, 8).map(toRecordQuery),
        };
    }

    // נושאי ההצעות לסדר חוזרים כמה פעמים (דיון מפוצל) — מציגים כל נושא פעם אחת
    const agendaNames = [
        ...new Set(
            byDateDesc(agenda, (a) => a.LastUpdatedDate)
                .map((a) => (a.Name ?? '').replace(/^הצעה\s+\S+\s+לסדר\s+(?:ה)?יום\s+בנושא:\s*/, '').trim())
                .filter(Boolean),
        ),
    ].slice(0, 12);

    return {
        person_id: personId,
        knesset_num: knessetNum,
        knessets,
        roles,
        bills: { lead: lead.length, cosigned: cosigned.length, ...counts },
        queries: queries.length,
        agenda: agenda.length,
        ministry_queries: ministryQueries,
        email: (person?.Email ?? '').trim(),
        // החוקים שעברו הם ההישג המרכזי — נשמרים במלואם; השאר נדגמים כדי
        // לא לנפח את הרשומה ב-Strapi (מאות הצעות לכל ח"כ פעיל)
        passed_bills: byDateDesc(passedBills, (b) => b.PublicationDate ?? b.LastUpdatedDate)
            .slice(0, 60)
            .map((b) => ({
                name: (b.Name ?? '').trim(),
                status: statusMap.get(b.StatusID) ?? '',
                date: dayOf(b.PublicationDate),
            })),
        active_bills: byDateDesc(activeBills, (b) => b.LastUpdatedDate)
            .slice(0, 20)
            .map((b) => ({
                name: (b.Name ?? '').trim(),
                status: statusMap.get(b.StatusID) ?? '',
                date: dayOf(b.LastUpdatedDate),
            })),
        recent_queries: byDateDesc(queries, (q) => q.SubmitDate).slice(0, 20).map(toRecordQuery),
        recent_agenda: agendaNames,
        synced_at: new Date().toISOString(),
    };
}

/** רזומה ישנה מ-14 יום נחשבת "לרענון" בריצה המרוכזת */
const RECORD_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** תקציב זמן לריצה מרוכזת — מתחת לתקרת ה-60ש' של הפונקציה */
const RECORD_BUDGET_MS = 40_000;

export interface RecordSyncResult extends RecordSyncLog {
    ok: boolean;
    names: string[];
}

/**
 * משיכת רזומות במנות: מטפל קודם במי שאין לו רזומה, אחר כך בישנות ביותר,
 * ועוצר בתקציב הזמן. האדמין לוחץ שוב כדי להמשיך — עדיף על ריצה שנחתכת
 * באמצע ע"י תקרת הזמן של הפלטפורמה.
 */
export async function runRecordSync(ranBy: string): Promise<RecordSyncResult> {
    const started = Date.now();
    const result: RecordSyncResult = {
        ok: false,
        ran_at: new Date().toISOString(),
        ran_by: ranBy,
        done: 0,
        remaining: 0,
        errors: [],
        names: [],
    };

    let officials: SyncOfficialRow[];
    let knessetNum: number;
    let statusMap: Map<number, string>;
    try {
        [officials, knessetNum, statusMap] = await Promise.all([
            listOfficialsForSync(),
            currentKnessetNum(),
            fetchStatusMap(),
        ]);
    } catch (e) {
        result.errors.push(`הכנת הנתונים נכשלה: ${e instanceof Error ? e.message : e}`);
        return result;
    }

    const now = Date.now();
    const queue = officials
        .filter((o) => o.knessetPersonId && o.approved)
        .map((o) => {
            const rec = o.knessetRecord;
            const age = rec?.synced_at ? now - new Date(rec.synced_at).getTime() : Infinity;
            const stale = !rec || rec.knesset_num !== knessetNum || age > RECORD_TTL_MS;
            return { o, age, stale };
        })
        .filter((x) => x.stale)
        .sort((a, b) => b.age - a.age);

    for (const { o } of queue) {
        if (Date.now() - started > RECORD_BUDGET_MS) break;
        try {
            const record = await fetchKnessetRecord(o.knessetPersonId as number, knessetNum, statusMap);
            await applyOfficialSync(o.id, { knessetRecord: record });
            result.done++;
            result.names.push(o.name);
        } catch (e) {
            result.errors.push(`${o.name}: ${e instanceof Error ? e.message : e}`);
        }
    }

    result.remaining = Math.max(0, queue.length - result.done - result.errors.length);
    result.ok = true;
    if (result.done) invalidateRating();
    try {
        await saveRecordLog({
            ran_at: result.ran_at,
            ran_by: result.ran_by,
            done: result.done,
            remaining: result.remaining,
            errors: result.errors,
        });
    } catch (e) {
        result.errors.push(`שמירת יומן הרזומות נכשלה: ${e instanceof Error ? e.message : e}`);
    }
    return result;
}

/**
 * רענון רזומה של מדורג בודד — הכפתור בדף המדורג ובשורת האדמין.
 * כשעוד לא רץ סנכרון מצבת, המזהה נקבע כאן לפי השם מול רשימת המכהנים,
 * כדי שלחיצה אחת בדף של מדורג תספיק (בלי להריץ קודם סנכרון מלא).
 */
export async function syncOneRecord(officialId: string): Promise<{ name: string; record: KnessetRecord }> {
    const official = await getOfficialForSync(officialId);
    if (!official) throw new Error('המדורג לא נמצא');

    const patch: OfficialSyncPatch = {};
    let personId = official.knessetPersonId;
    if (!personId) {
        const roster = await fetchKnessetRoster();
        const entry = matchOneByName(official.name, roster);
        if (!entry) {
            throw new Error(`"${official.name}" לא נמצא/ה ברשימת המכהנים בכנסת — אין רזומה למשוך`);
        }
        personId = entry.personId;
        patch.knessetPersonId = personId;
        if (official.position !== entry.position) patch.position = entry.position;
        if (official.org !== entry.org) patch.org = entry.org;
    }

    const [knessetNum, statusMap] = await Promise.all([currentKnessetNum(), fetchStatusMap()]);
    const record = await fetchKnessetRecord(personId, knessetNum, statusMap);
    await applyOfficialSync(official.id, { ...patch, knessetRecord: record });
    invalidateRating();
    return { name: official.name, record };
}

// ============================================================
// ---- מנוע הסנכרון ----
// ============================================================

export interface SyncReport extends SyncLog {
    ok: boolean;
}

/**
 * התאמת שם יחיד מתוך רשימה: שוויון מלא, או תת-קבוצת מילים ("יולי יואל
 * אדלשטיין" ↔ "יולי אדלשטיין") — ורק כשההתאמה חד-משמעית. מחזיר null
 * כששני מועמדים מתאימים, כדי לא לשייך רזומה לאדם הלא נכון.
 */
function matchOneByName<T extends { name: string }>(name: string, candidates: T[]): T | null {
    const target = norm(name);
    const exact = candidates.filter((c) => norm(c.name) === target);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;

    const tSet = new Set(target.split(' '));
    const subset = candidates.filter((c) => {
        const cSet = new Set(norm(c.name).split(' '));
        if (cSet.size < 2 || tSet.size < 2) return false;
        const [small, big] = cSet.size <= tSet.size ? [cSet, tSet] : [tSet, cSet];
        return [...small].every((w) => big.has(w));
    });
    return subset.length === 1 ? subset[0] : null;
}

export async function runKnessetSync(ranBy: string): Promise<SyncReport> {
    const report: SyncReport = {
        ok: false,
        ran_at: new Date().toISOString(),
        ran_by: ranBy,
        roster_count: 0,
        added: [],
        updated: [],
        departed: [],
        shakuf_applied: [],
        errors: [],
    };

    // שלושת המקורות במקביל; בלי מצבת הכנסת או רשימת המדורגים אין מה לסנכרן,
    // כשל בשקוף בלבד → ממשיכים בלעדיו ומדווחים
    const [rosterRes, officialsRes, shakufRes] = await Promise.allSettled([
        fetchKnessetRoster(),
        listOfficialsForSync(),
        fetchShakufMinistermeter(),
    ]);
    if (rosterRes.status === 'rejected') {
        report.errors.push(`שליפת הכנסת נכשלה: ${rosterRes.reason}`);
        return report;
    }
    if (officialsRes.status === 'rejected') {
        report.errors.push(`שליפת המדורגים נכשלה: ${officialsRes.reason}`);
        return report;
    }
    const roster = rosterRes.value;
    const officials = officialsRes.value;
    let shakuf: ShakufEntry[] | null = null;
    if (shakufRes.status === 'fulfilled') shakuf = shakufRes.value;
    else report.errors.push(`שליפת שקוף נכשלה (הרוסטר סונכרן בלי המדד): ${shakufRes.reason}`);

    report.roster_count = roster.length;
    if (roster.length < 100) {
        // כנסת מלאה כוללת 120 ח"כים + שרים; פחות מזה = תשובה חלקית מה-OData.
        // ממשיכים לעדכן את מי שכן חזר, אבל לא מדווחים "עוזבים" על סמך רשימה קטומה.
        report.errors.push(`ה-OData החזיר ${roster.length} מכהנים בלבד — דילוג על איתור עוזבים`);
    }

    // ---- התאמה: personId קודם, אחר כך שם ----
    const byPersonId = new Map<number, SyncOfficialRow>();
    for (const o of officials) if (o.knessetPersonId) byPersonId.set(o.knessetPersonId, o);

    const matchedOfficialIds = new Set<string>();
    const officialIdByPersonId = new Map<number, string>(); // כולל חדשים — למיפוי שקוף
    const toCreate: RosterEntry[] = [];
    const toPatch: { row: SyncOfficialRow; patch: OfficialSyncPatch; entry: RosterEntry }[] = [];

    for (const entry of roster) {
        const existing =
            byPersonId.get(entry.personId) ??
            matchOneByName(
                entry.name,
                officials.filter((o) => !matchedOfficialIds.has(o.id)),
            );
        if (!existing) {
            toCreate.push(entry);
            continue;
        }
        matchedOfficialIds.add(existing.id);
        officialIdByPersonId.set(entry.personId, existing.id);

        const patch: OfficialSyncPatch = {};
        if (existing.position !== entry.position) patch.position = entry.position;
        if (existing.org !== entry.org) patch.org = entry.org;
        // ביו נדרס רק אם הוא ריק או אוטומטי (התבנית מהערכים הישנים) — ביו ידני נשמר
        const oldAuto = autoBio(existing.position, existing.org);
        if ((!existing.bio || existing.bio === oldAuto) && existing.bio !== entry.bio) {
            patch.bio = entry.bio;
        }
        if (existing.knessetPersonId !== entry.personId) patch.knessetPersonId = entry.personId;
        if (!existing.approved) patch.approved = true; // הצעת משתמש שהתבררה כמכהן/ת
        if (Object.keys(patch).length) toPatch.push({ row: existing, patch, entry });
    }

    // ---- מיפוי שקוף: משרד → השר/ה המכהן/ה → רשומת המדורג ----
    const shakufPatches = new Map<string, ShakufData>(); // officialId → נתון
    if (shakuf) {
        const now = new Date().toISOString();
        for (const s of shakuf) {
            const keyword = ministryKeyword(s.ministry);
            if (!keyword) continue;
            const holders = roster.filter((e) =>
                e.ministries.some((m) => norm(m.name).includes(keyword)),
            );
            // שר בתיק מלא עדיף על "שר נוסף במשרד"
            const holder =
                holders.find((e) => e.ministries.some((m) => norm(m.name).includes(keyword) && !m.extra)) ??
                holders[0];
            if (!holder) {
                report.errors.push(`שקוף: לא נמצא שר מכהן ל"${s.ministry}"`);
                continue;
            }
            const officialId = officialIdByPersonId.get(holder.personId);
            const data: ShakufData = {
                ministry: s.ministry,
                summary: s.summary,
                report_url: s.reportUrl,
                source_date: s.sourceDate,
                synced_at: now,
            };
            if (officialId) {
                shakufPatches.set(officialId, data);
                report.shakuf_applied.push(`${holder.name} — ${s.ministry}`);
            } else {
                // השר חדש — נוצר מיד; הנתון יחובר אחרי היצירה
                const idx = toCreate.findIndex((e) => e.personId === holder.personId);
                if (idx >= 0) {
                    shakufPatches.set(`create:${holder.personId}`, data);
                    report.shakuf_applied.push(`${holder.name} — ${s.ministry}`);
                }
            }
        }
    }

    // ---- כתיבות: יצירות חדשות ----
    await mapLimit(toCreate, 4, async (entry) => {
        try {
            const id = await createOfficial(
                {
                    name: entry.name,
                    group: 'knesset',
                    position: entry.position,
                    org: entry.org,
                    bio: entry.bio,
                    knessetPersonId: entry.personId,
                },
                { approved: true },
            );
            officialIdByPersonId.set(entry.personId, id);
            report.added.push(entry.name);
            const pendingShakuf = shakufPatches.get(`create:${entry.personId}`);
            if (pendingShakuf) {
                shakufPatches.delete(`create:${entry.personId}`);
                shakufPatches.set(id, pendingShakuf);
            }
        } catch (e) {
            report.errors.push(`הוספת ${entry.name}: ${e instanceof Error ? e.message : e}`);
        }
    });

    // ---- כתיבות: עדכוני מכהנים (תפקיד/סיעה/ביו אוטומטי/מזהה) ----
    await mapLimit(toPatch, 4, async ({ row, patch, entry }) => {
        try {
            await applyOfficialSync(row.id, patch);
            report.updated.push(entry.name);
        } catch (e) {
            report.errors.push(`עדכון ${entry.name}: ${e instanceof Error ? e.message : e}`);
        }
    });

    // ---- כתיבות: נתוני שקוף (רק כשהשתנו) + ניקוי ממי שכבר לא שר בתיק מוערך ----
    if (shakuf) {
        const writes: { id: string; data: ShakufData | null; name: string }[] = [];
        for (const [id, data] of shakufPatches) {
            if (id.startsWith('create:')) continue; // יצירה שנכשלה — אין למי לחבר
            const current = officials.find((o) => o.id === id)?.shakuf ?? null;
            const same =
                current &&
                current.ministry === data.ministry &&
                current.summary === data.summary &&
                current.report_url === data.report_url;
            if (!same) writes.push({ id, data, name: '' });
        }
        for (const o of officials) {
            if (o.shakuf && !shakufPatches.has(o.id)) writes.push({ id: o.id, data: null, name: o.name });
        }
        await mapLimit(writes, 4, async (w) => {
            try {
                await applyOfficialSync(w.id, { shakuf: w.data });
            } catch (e) {
                report.errors.push(`נתון שקוף (${w.name || w.id}): ${e instanceof Error ? e.message : e}`);
            }
        });
    }

    // ---- עוזבים: בקבוצת הכנסת, מאושרים, ולא הותאמו לאף מכהן — דיווח בלבד ----
    if (roster.length >= 100) {
        for (const o of officials) {
            if (o.group === 'knesset' && o.approved && !matchedOfficialIds.has(o.id)) {
                report.departed.push(o.name);
            }
        }
    }

    report.ok = true;
    invalidateRating();
    try {
        await saveSyncLog({
            ran_at: report.ran_at,
            ran_by: report.ran_by,
            roster_count: report.roster_count,
            added: report.added,
            updated: report.updated,
            departed: report.departed,
            shakuf_applied: report.shakuf_applied,
            errors: report.errors,
        });
    } catch (e) {
        report.errors.push(`שמירת יומן הסנכרון נכשלה: ${e instanceof Error ? e.message : e}`);
    }
    return report;
}
