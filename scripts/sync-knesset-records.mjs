#!/usr/bin/env node
// ============================================================
// sync-knesset-records.mjs — ייבוא מרוכז של כל נתוני הכנסת
//
// מה זה עושה (אותה לוגיקה של src/lib/server/knessetSync.ts, בלי מגבלת
// הזמן של פונקציית שרת — כאן אפשר לרוץ על כל 120+ המכהנים ברצף):
//   1. מצבת המכהנים מה-OData → הוספת חסרים, עדכון תפקיד/סיעה, מזהה קבוע
//   2. רזומה מלאה לכל מכהן → חקיקה בשמות, שאילתות, הצעות לסדר, דוא"ל
//   3. מדד המיניסטרמטר של שקוף → הצמדה לשר המכהן במשרד
//
// שימוש:
//   node scripts/sync-knesset-records.mjs --url https://api.gofreeil.com
//   דגלים: [--dry] [--only "שם"] [--limit N]
// הרשאות: STRAPI_TOKEN מקובץ .env (‏--url גובר על STRAPI_URL שבו)
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ODATA = 'https://knesset.gov.il/Odata/ParliamentInfo.svc';
const SHAKUF_BASE = 'https://shakuf.co.il';
const SHAKUF_API = `${SHAKUF_BASE}/wp-json/wp/v2/data/62356`;
const FALLBACK_KNESSET_NUM = 25;
const OFFICIAL_CATEGORY = 'pr_official';

// ---- ארגומנטים ----
let dry = false;
/** רשימת שמות (מופרדים בפסיק) לסינון — להשלמת מי שנכשל בריצה קודמת */
let only = [];
let limit = Infinity;
let urlArg = '';
/** בקשות מקבילות ל-OData; הכנסת מחזירה 481 כשלוחצים חזק מדי */
let concurrency = 4;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--dry') dry = true;
	else if (argv[i] === '--only') only = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
	else if (argv[i] === '--limit') limit = Number(argv[++i]) || Infinity;
	else if (argv[i] === '--url') urlArg = argv[++i] ?? '';
	else if (argv[i] === '--concurrency') concurrency = Math.max(1, Number(argv[++i]) || 4);
}

// ---- טעינת .env ----
const dir = path.dirname(fileURLToPath(import.meta.url));
const env = {};
try {
	const raw = await readFile(path.join(dir, '..', '.env'), 'utf8');
	for (const line of raw.split('\n')) {
		const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
		if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
	}
} catch {
	// אפשר גם משתני סביבה רגילים
}
const STRAPI_URL = (urlArg || process.env.STRAPI_URL || env.STRAPI_URL || '').replace(/\/+$/, '');
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || env.STRAPI_TOKEN || '';
if (!STRAPI_URL) {
	console.error('✗ חסר STRAPI_URL');
	process.exit(1);
}
if (!STRAPI_TOKEN && !dry) {
	console.error('✗ חסר STRAPI_TOKEN (כתיבה אנונימית חסומה בפרודקשן)');
	process.exit(1);
}

// ============================================================
// ---- כלי עזר ----
// ============================================================

const POS = {
	MK: [43, 61],
	FACTION_MEMBER: [54],
	MINISTER: [39, 57],
	DEPUTY_MINISTER: [40, 59],
	PM: [45],
};
const WANTED = new Set(Object.values(POS).flat());

const FACTION_SHORT = {
	1095: 'ש"ס', 1096: 'הליכוד', 1097: 'הציונות הדתית', 1098: 'המחנה הממלכתי',
	1099: 'רע"ם', 1100: 'העבודה', 1101: 'יהדות התורה', 1102: 'יש עתיד',
	1103: 'חד"ש-תע"ל', 1104: 'ישראל ביתנו', 1105: 'הציונות הדתית',
	1106: 'עוצמה יהודית', 1107: 'נעם', 1108: 'תקווה חדשה', 1110: 'המחנה הממלכתי',
};

const NAME_OVERRIDES = {
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

const norm = (s) =>
	String(s ?? '')
		.replace(/[־–—-]/g, ' ')
		.replace(/["'׳״`]/g, '')
		.replace(/ביטחון/g, 'בטחון')
		.replace(/\s+/g, ' ')
		.trim();

/** התאמת שם חד-משמעית: שוויון מלא או תת-קבוצת מילים */
function matchOneByName(name, candidates) {
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

async function mapLimit(items, limitN, fn) {
	const out = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limitN, items.length) }, async () => {
			while (next < items.length) {
				const i = next++;
				out[i] = await fn(items[i], i);
			}
		}),
	);
	return out;
}

async function fetchJson(url) {
	let lastErr;
	// 481 = חסימת קצב של הכנסת — המתנה גדלה בין הניסיונות
	for (let attempt = 0; attempt < 4; attempt++) {
		if (attempt) await new Promise((r) => setTimeout(r, 3000 * attempt));
		try {
			const res = await fetch(url, {
				headers: { Accept: 'application/json', 'User-Agent': 'rating.gofreeil.com data-sync' },
				signal: AbortSignal.timeout(30000),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return await res.json();
		} catch (e) {
			lastErr = e;
		}
	}
	throw new Error(`${url.split('?')[0]} → ${lastErr?.message ?? lastErr}`);
}

const f = (s) => encodeURIComponent(s);

async function odataAll(entity, filter) {
	const rows = [];
	for (let skip = 0; ; skip += 100) {
		const json = await fetchJson(`${ODATA}/${entity}?$filter=${f(filter)}&$top=100&$skip=${skip}&$format=json`);
		const page = json?.value ?? [];
		rows.push(...page);
		if (page.length < 100) return rows;
	}
}

const dayOf = (v) => String(v ?? '').slice(0, 10);
const byDateDesc = (rows, date) => [...rows].sort((a, b) => String(date(b) ?? '').localeCompare(String(date(a) ?? '')));

// ============================================================
// ---- Strapi ----
// ============================================================

async function strapiListOfficials() {
	const all = [];
	for (let start = 0; ; start += 500) {
		const url =
			`${STRAPI_URL}/api/pr-items?filters[category][$eq]=${OFFICIAL_CATEGORY}` +
			`&filters[status1][$eq]=active&pagination[start]=${start}&pagination[limit]=500`;
		const json = await fetchJson(url);
		const page = json?.data ?? [];
		all.push(...page);
		if (page.length < 500) return all;
	}
}

async function strapiWrite(method, pathname, body) {
	const res = await fetch(STRAPI_URL + pathname, {
		method,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(30000),
	});
	if (!res.ok) throw new Error(`Strapi ${method} ${pathname} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
	return res.json();
}

// ============================================================
// ---- 1. מצבת המכהנים ----
// ============================================================

function ministerTitle(ministry, female) {
	const base = female ? 'שרת' : 'שר';
	const m = String(ministry ?? '').trim();
	if (!m) return female ? 'שרה' : 'שר';
	if (m === 'משרד ראש הממשלה') return `${base} במשרד ראש הממשלה`;
	if (m.startsWith('המשרד ל')) return `${female ? 'השרה' : 'השר'} ל${m.slice('המשרד ל'.length)}`;
	if (m.startsWith('משרד ')) return `${base} ${m.slice('משרד '.length)}`;
	return `${base} — ${m}`;
}
function deputyTitle(ministry, female) {
	const base = female ? 'סגנית שר' : 'סגן שר';
	const m = String(ministry ?? '').trim().replace(/^המשרד/, 'משרד');
	return m ? `${base} ב${m}` : base;
}
const autoBio = (position, org) => (org ? `${position} מטעם ${org}` : position);
const factionDisplay = (id, name) =>
	(id && FACTION_SHORT[id]) || String(name ?? '').replace(/ בראשות .*$/, '').trim();

async function currentKnessetNum() {
	try {
		const j = await fetchJson(`${ODATA}/KNS_KnessetDates?$filter=${f('IsCurrent eq true')}&$top=100&$format=json`);
		const nums = (j?.value ?? []).map((r) => Number(r.KnessetNum)).filter((n) => Number.isInteger(n) && n > 0);
		if (nums.length) return Math.max(...nums);
	} catch {}
	return FALLBACK_KNESSET_NUM;
}

async function fetchRoster(knessetNum) {
	const p2p = await odataAll('KNS_PersonToPosition', `KnessetNum eq ${knessetNum} and IsCurrent eq true`);
	const relevant = p2p.filter((r) => WANTED.has(r.PositionID));

	const people = new Map();
	for (const r of relevant) {
		const p = people.get(r.PersonID) ?? {
			mk: false, pm: false, ministries: [], deputies: [], factionId: null, factionName: null, factionStart: '',
		};
		const duty = (r.DutyDesc ?? '').trim();
		const ministry = (r.GovMinistryName ?? '').trim();
		if (POS.MK.includes(r.PositionID)) p.mk = true;
		if (POS.PM.includes(r.PositionID)) p.pm = true;
		if (POS.MINISTER.includes(r.PositionID)) p.ministries.push({ duty, ministry, extra: duty.includes('נוסף') });
		if (POS.DEPUTY_MINISTER.includes(r.PositionID)) p.deputies.push({ duty, ministry });
		if (POS.FACTION_MEMBER.includes(r.PositionID) && (r.StartDate ?? '') >= p.factionStart) {
			p.factionId = r.FactionID;
			p.factionName = r.FactionName;
			p.factionStart = r.StartDate ?? '';
		}
		people.set(r.PersonID, p);
	}

	// "נורווגים" בלי רשומת סיעה נוכחית
	const noFaction = [...people.entries()].filter(([, p]) => !p.factionId).map(([pid]) => pid);
	for (let i = 0; i < noFaction.length; i += 15) {
		const batch = noFaction.slice(i, i + 15);
		const ors = batch.map((id) => `PersonID eq ${id}`).join(' or ');
		const rows = await odataAll('KNS_PersonToPosition', `KnessetNum eq ${knessetNum} and PositionID eq 54 and (${ors})`);
		for (const pid of batch) {
			const latest = rows.filter((r) => r.PersonID === pid).sort((a, b) => String(b.StartDate).localeCompare(String(a.StartDate)))[0];
			const p = people.get(pid);
			if (latest && p) {
				p.factionId = latest.FactionID;
				p.factionName = latest.FactionName;
			}
		}
	}

	// שמות ומגדר
	const ids = [...people.keys()];
	const batches = [];
	for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));
	const persons = new Map();
	const results = await mapLimit(batches, 4, async (batch) => {
		const filter = batch.map((id) => `PersonID eq ${id}`).join(' or ');
		const j = await fetchJson(`${ODATA}/KNS_Person?$filter=${f(filter)}&$format=json`);
		return j?.value ?? [];
	});
	for (const row of results.flat()) persons.set(row.PersonID, row);

	const entries = [];
	for (const [pid, p] of people) {
		const person = persons.get(pid);
		if (!person) continue;
		const rawName = `${person.FirstName ?? ''} ${person.LastName ?? ''}`.replace(/\s+/g, ' ').trim();
		if (!rawName) continue;
		const name = NAME_OVERRIDES[rawName] ?? rawName;
		const female = person.GenderDesc === 'נקבה';
		const org = factionDisplay(p.factionId, p.factionName);
		const pick = (list) => list.find((x) => x.duty && !x.duty.includes('נוסף')) ?? list[0];

		let position;
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
			ministries: p.ministries.filter((m) => m.ministry).map((m) => ({ name: m.ministry, extra: m.extra })),
		});
	}
	return entries;
}

// ============================================================
// ---- 2. רזומה לכל מכהן ----
// ============================================================

function billBucket(desc) {
	if (desc.includes('התקבלה בקריאה שלישית')) return 'passed';
	if (desc.includes('מוזגה')) return 'merged';
	if (desc.includes('נעצרה') || desc.includes('נדחתה')) return 'stopped';
	return 'in_progress';
}

function roleTitle(row) {
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

const toRecordQuery = (q) => ({
	name: (q.Name ?? '').trim(),
	submitted: dayOf(q.SubmitDate),
	replied: dayOf(q.ReplyMinisterDate),
});

async function billsByIds(ids, knessetNum) {
	const batches = [];
	for (let i = 0; i < ids.length; i += 45) batches.push(ids.slice(i, i + 45));
	const pages = await mapLimit(batches, 3, (batch) =>
		fetchJson(
			`${ODATA}/KNS_Bill?$filter=${f(`KnessetNum eq ${knessetNum} and (${batch.map((id) => `BillID eq ${id}`).join(' or ')})`)}&$top=100&$format=json`,
		).then((j) => j?.value ?? []),
	);
	return pages.flat();
}

async function fetchRecord(personId, knessetNum, statusMap) {
	const [person, positions, initiator, queries, agenda] = await Promise.all([
		fetchJson(`${ODATA}/KNS_Person?$filter=${f(`PersonID eq ${personId}`)}&$top=1&$format=json`).then((j) => j?.value?.[0] ?? null),
		odataAll('KNS_PersonToPosition', `PersonID eq ${personId}`),
		odataAll('KNS_BillInitiator', `PersonID eq ${personId}`),
		odataAll('KNS_Query', `PersonID eq ${personId} and KnessetNum eq ${knessetNum}`),
		odataAll('KNS_Agenda', `InitiatorPersonID eq ${personId} and KnessetNum eq ${knessetNum}`),
	]);

	const leadIds = initiator.filter((r) => r.IsInitiator).map((r) => r.BillID);
	const coIds = initiator.filter((r) => !r.IsInitiator).map((r) => r.BillID);
	const [lead, cosigned] = await Promise.all([billsByIds(leadIds, knessetNum), billsByIds(coIds, knessetNum)]);

	const counts = { passed: 0, merged: 0, stopped: 0, in_progress: 0 };
	const passedBills = [];
	const activeBills = [];
	for (const b of lead) {
		const bucket = billBucket(statusMap.get(b.StatusID) ?? '');
		counts[bucket]++;
		if (bucket === 'passed') passedBills.push(b);
		else if (bucket === 'in_progress') activeBills.push(b);
	}

	const knessets = [...new Set(positions.filter((p) => POS.MK.includes(p.PositionID)).map((p) => p.KnessetNum))].sort((a, b) => a - b);

	const roles = positions
		.filter((p) => p.KnessetNum === knessetNum && WANTED.has(p.PositionID))
		.map((p) => ({ title: roleTitle(p), from: dayOf(p.StartDate), to: dayOf(p.FinishDate) || null }))
		.filter((r) => r.title && r.from)
		.sort((a, b) => a.from.localeCompare(b.from));

	const ministryRow = positions.find(
		(p) => p.KnessetNum === knessetNum && p.IsCurrent && p.GovMinistryID && POS.MINISTER.includes(p.PositionID),
	);
	let ministryQueries = null;
	if (ministryRow?.GovMinistryID) {
		const rows = await odataAll('KNS_Query', `KnessetNum eq ${knessetNum} and GovMinistryID eq ${ministryRow.GovMinistryID}`);
		ministryQueries = {
			ministry: (ministryRow.GovMinistryName ?? '').trim(),
			total: rows.length,
			answered: rows.filter((q) => q.ReplyMinisterDate).length,
			late: rows.filter((q) => q.ReplyMinisterDate && q.ReplyDatePlanned && q.ReplyMinisterDate > q.ReplyDatePlanned).length,
			recent: byDateDesc(rows, (q) => q.SubmitDate).slice(0, 8).map(toRecordQuery),
		};
	}

	const recentAgenda = [
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
		passed_bills: byDateDesc(passedBills, (b) => b.PublicationDate ?? b.LastUpdatedDate)
			.slice(0, 60)
			.map((b) => ({ name: (b.Name ?? '').trim(), status: statusMap.get(b.StatusID) ?? '', date: dayOf(b.PublicationDate) })),
		active_bills: byDateDesc(activeBills, (b) => b.LastUpdatedDate)
			.slice(0, 20)
			.map((b) => ({ name: (b.Name ?? '').trim(), status: statusMap.get(b.StatusID) ?? '', date: dayOf(b.LastUpdatedDate) })),
		recent_queries: byDateDesc(queries, (q) => q.SubmitDate).slice(0, 20).map(toRecordQuery),
		recent_agenda: recentAgenda,
		synced_at: new Date().toISOString(),
	};
}

// ============================================================
// ---- 3. שקוף ----
// ============================================================

const decodeEntities = (s) =>
	s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&apos;/g, "'");
const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parseShakuf(html, sourceDate) {
	const tokens = [];
	for (const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)) tokens.push({ pos: m.index, kind: 'h2', text: stripTags(m[1]) });
	for (const m of html.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/g)) {
		const text = stripTags(m[1]);
		if (/מדד|ציון/.test(text)) tokens.push({ pos: m.index, kind: 'sum', text });
	}
	for (const m of html.matchAll(/href="([^"]*\/data\/\d+)"/g)) tokens.push({ pos: m.index, kind: 'link', text: m[1] });
	tokens.sort((a, b) => a.pos - b.pos);

	const entries = [];
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t.kind !== 'h2' || !t.text.includes('משרד')) continue;
		let summary = '', reportUrl = '';
		for (let j = i + 1; j < tokens.length && tokens[j].kind !== 'h2'; j++) {
			if (tokens[j].kind === 'sum' && !summary) summary = tokens[j].text;
			if (tokens[j].kind === 'link' && !reportUrl) reportUrl = new URL(tokens[j].text, SHAKUF_BASE).toString();
		}
		if (!summary || !reportUrl) continue;
		if (entries.some((e) => e.ministry === t.text)) continue;
		entries.push({ ministry: t.text, summary, reportUrl, sourceDate });
	}
	return entries;
}

function ministryKeyword(title) {
	const n = norm(title);
	for (const prefix of ['המשרד ל', 'משרד ה', 'משרד ']) if (n.startsWith(prefix)) return n.slice(prefix.length).trim();
	return n;
}

// ============================================================
// ---- ריצה ----
// ============================================================

console.log(`יעד: ${STRAPI_URL}${dry ? '  (מצב dry — בלי כתיבה)' : ''}\n`);

const knessetNum = await currentKnessetNum();
console.log(`כנסת מכהנת: ${knessetNum}`);

console.log('שולף מצבת מכהנים, סטטוסי חקיקה, מדורגים ושקוף...');
const [roster, statusRows, items, shakufJson] = await Promise.all([
	fetchRoster(knessetNum),
	odataAll('KNS_Status', 'StatusID gt 0'),
	strapiListOfficials(),
	fetchJson(SHAKUF_API).catch((e) => {
		console.error(`  ! שקוף נכשל: ${e.message}`);
		return null;
	}),
]);
const statusMap = new Map(statusRows.map((s) => [s.StatusID, s.Desc ?? '']));
const shakuf = shakufJson ? parseShakuf(shakufJson?.content?.rendered ?? '', shakufJson?.modified ?? '') : [];
console.log(`  מכהנים: ${roster.length} · מדורגים ב-DB: ${items.length} · משרדים בשקוף: ${shakuf.length}\n`);

if (roster.length < 100) {
	console.error(`✗ ה-OData החזיר ${roster.length} מכהנים בלבד — עצירה כדי לא לכתוב נתונים חלקיים`);
	process.exit(1);
}

// מיפוי מדורגים קיימים
const officials = items.map((it) => ({
	documentId: it.documentId,
	name: it.label ?? '',
	description: it.description ?? '',
	extra: it.extra_fields && typeof it.extra_fields === 'object' ? it.extra_fields : {},
}));
const byPersonId = new Map();
for (const o of officials) {
	const pid = Number(o.extra.knesset_person_id);
	if (Number.isInteger(pid) && pid > 0) byPersonId.set(pid, o);
}

// שיוך כל מכהן לרשומה קיימת (או סימון ליצירה)
const matched = new Set();
const plan = [];
for (const entry of roster) {
	if (only.length && !only.some((n) => norm(entry.name).includes(norm(n)))) continue;
	const existing = byPersonId.get(entry.personId) ?? matchOneByName(entry.name, officials.filter((o) => !matched.has(o.documentId)));
	if (existing) matched.add(existing.documentId);
	plan.push({ entry, existing });
}
const toCreate = plan.filter((p) => !p.existing);
console.log(`שיוך: ${plan.length - toCreate.length} קיימים · ${toCreate.length} חדשים ליצירה`);

// ---- יצירת חסרים ----
for (const { entry } of toCreate) {
	if (dry) {
		console.log(`  [dry] יצירה: ${entry.name} | ${entry.position} | ${entry.org}`);
		continue;
	}
	try {
		const res = await strapiWrite('POST', '/api/pr-items', {
			data: {
				category: OFFICIAL_CATEGORY,
				label: entry.name,
				description: entry.bio,
				extra_fields: {
					group: 'knesset',
					position: entry.position,
					org: entry.org,
					knesset_person_id: entry.personId,
					approved: true,
				},
				icon: '🏛️',
				color: 'blue',
				status1: 'active',
				publishedAt: new Date().toISOString(),
			},
		});
		const created = {
			documentId: res.data.documentId,
			name: entry.name,
			description: entry.bio,
			extra: { group: 'knesset', position: entry.position, org: entry.org, knesset_person_id: entry.personId, approved: true },
		};
		officials.push(created);
		// בלי זה הנוצר-עכשיו נספר בטעות כ"אינו ברשימת המכהנים" בסוף הריצה
		matched.add(created.documentId);
		plan.find((p) => p.entry.personId === entry.personId).existing = created;
		console.log(`  ✚ נוצר: ${entry.name}`);
	} catch (e) {
		console.error(`  ✗ יצירת ${entry.name}: ${e.message}`);
	}
}

// ---- מיפוי מדד שקוף לשר המכהן ----
const shakufByPerson = new Map();
const now = new Date().toISOString();
for (const s of shakuf) {
	const keyword = ministryKeyword(s.ministry);
	if (!keyword) continue;
	const holders = roster.filter((e) => e.ministries.some((m) => norm(m.name).includes(keyword)));
	const holder = holders.find((e) => e.ministries.some((m) => norm(m.name).includes(keyword) && !m.extra)) ?? holders[0];
	if (!holder) {
		console.error(`  ! שקוף: לא נמצא שר מכהן ל"${s.ministry}"`);
		continue;
	}
	shakufByPerson.set(holder.personId, {
		ministry: s.ministry,
		summary: s.summary,
		report_url: s.reportUrl,
		source_date: s.sourceDate,
		synced_at: now,
	});
}

// ---- הריצה הראשית: רזומה + עדכון פרטים לכל מכהן ----
const work = plan.filter((p) => p.existing).slice(0, limit);
console.log(`\nמושך רזומות ל-${work.length} מכהנים...\n`);

let done = 0;
const failures = [];
const t0 = Date.now();

await mapLimit(work, concurrency, async ({ entry, existing }) => {
	try {
		const record = await fetchRecord(entry.personId, knessetNum, statusMap);
		const oldAuto = autoBio(existing.extra.position ?? '', existing.extra.org ?? '');
		const bioIsAuto = !existing.description || existing.description === oldAuto;
		const extra = {
			...existing.extra,
			group: existing.extra.group ?? 'knesset',
			position: entry.position,
			org: entry.org,
			knesset_person_id: entry.personId,
			approved: true,
			knesset_record: record,
		};
		const shakufData = shakufByPerson.get(entry.personId);
		if (shakufData) extra.shakuf = shakufData;
		else if (extra.shakuf) delete extra.shakuf;

		if (!dry) {
			await strapiWrite('PUT', `/api/pr-items/${existing.documentId}`, {
				data: { ...(bioIsAuto ? { description: entry.bio } : {}), extra_fields: extra },
			});
		}
		done++;
		const b = record.bills;
		console.log(
			`  ${String(done).padStart(3)}/${work.length} ${entry.name} — ${b.lead} הצעות (${b.passed} עברו) · ` +
				`${record.queries} שאילתות · ${record.agenda} לסדר${shakufData ? ' · שקוף ✓' : ''}`,
		);
	} catch (e) {
		failures.push(`${entry.name}: ${e.message}`);
		console.error(`  ✗ ${entry.name}: ${e.message}`);
	}
});

// ---- מי במאגר ואינו ברשימת המכהנים (דיווח בלבד) ----
// רק בריצה מלאה: עם --only/--limit רוב המדורגים לא נבדקו כלל, ורשימת
// "עוזבים" שנגזרת מריצה חלקית היא דיווח שגוי
const partialRun = only.length > 0 || Number.isFinite(limit);
const departed = partialRun
	? []
	: officials
			.filter((o) => (o.extra.group ?? '') === 'knesset' && o.extra.approved !== false && !matched.has(o.documentId))
			.map((o) => o.name);

console.log(`\n${'='.repeat(60)}`);
console.log(`הושלם ב-${Math.round((Date.now() - t0) / 1000)} שניות · ${done} רזומות · ${failures.length} כשלונות`);
if (departed.length) console.log(`\nאינם ברשימת המכהנים (לא הוסרו): ${departed.join(', ')}`);
if (failures.length) console.log(`\nכשלונות:\n  ${failures.join('\n  ')}`);

// ---- יומן סנכרון לאדמין ----
if (!dry) {
	try {
		const existingLog = await fetchJson(
			`${STRAPI_URL}/api/pr-items?filters[category][$eq]=pr_sync&filters[label][$eq]=knesset_sync&pagination[limit]=1`,
		);
		const row = existingLog?.data?.[0];
		const log = {
			ran_at: new Date().toISOString(),
			ran_by: 'scripts/sync-knesset-records.mjs',
			roster_count: roster.length,
			added: toCreate.map((p) => p.entry.name),
			updated: [`${done} רזומות מלאות`],
			departed,
			shakuf_applied: [...shakufByPerson.entries()].map(([pid, s]) => {
				const e = roster.find((r) => r.personId === pid);
				return `${e?.name ?? pid} — ${s.ministry}`;
			}),
			errors: failures,
		};
		if (row) {
			await strapiWrite('PUT', `/api/pr-items/${row.documentId}`, {
				data: { extra_fields: { ...(row.extra_fields ?? {}), log } },
			});
		} else {
			await strapiWrite('POST', '/api/pr-items', {
				data: {
					category: 'pr_sync',
					label: 'knesset_sync',
					description: 'יומן סנכרון הנתונים החיצוני (כנסת + שקוף)',
					extra_fields: { log },
					icon: '🔄',
					color: 'blue',
					status1: 'active',
					publishedAt: new Date().toISOString(),
				},
			});
		}
		console.log('\nיומן הסנכרון נשמר (מוצג ב-/admin/officials)');
	} catch (e) {
		console.error(`\n! שמירת יומן הסנכרון נכשלה: ${e.message}`);
	}
}
