#!/usr/bin/env node
// ============================================================
// fetch-knesset-members.mjs — שליפת כל חברי הכנסת והשרים המכהנים
// מה-OData הרשמי של הכנסת, והוספת החסרים ל-seed-officials.json.
//
// שימוש:
//   node scripts/fetch-knesset-members.mjs [--url https://api.gofreeil.com] [--dry]
//   --url  בדיקת כפילויות גם מול המדורגים שכבר ב-Strapi (מומלץ)
//   --dry  הדפסה בלבד, בלי כתיבה לקובץ
//
// אחרי ההרצה: node scripts/seed-officials.mjs --url ... ואז enrich-official-images.mjs
// ============================================================

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ODATA = 'https://knesset.gov.il/Odata/ParliamentInfo.svc';
const KNESSET_NUM = 25;

// PositionID → משמעות (מתוך KNS_Position)
const POS = {
	MK: [43, 61], // חבר/חברת הכנסת
	FACTION_MEMBER: [54], // חבר/ת סיעה — מקור שם הסיעה
	MINISTER: [39, 57], // שר/שרה
	DEPUTY_MINISTER: [40, 59], // סגן/סגנית שר
	PM: [45], // ראש הממשלה
};
const WANTED = new Set(Object.values(POS).flat());

// שם סיעה רשמי → שם מוכר (FactionID של הכנסת ה-25)
const FACTION_SHORT = {
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

// שם רשמי (כולל שם אמצעי) → השם המוכר לציבור; חובה כדי לא ליצור
// כפילות מול רשומות קיימות ב-DB ("אריה דרעי", "בני גנץ"...)
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

// ---- ארגומנטים ----
let strapiUrl = '';
let dry = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--url') strapiUrl = argv[++i] || '';
	else if (argv[i] === '--dry') dry = true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function odataJson(pathAndQuery) {
	for (let attempt = 0; attempt < 3; attempt++) {
		if (attempt) await sleep(2000 * attempt);
		try {
			const res = await fetch(`${ODATA}/${pathAndQuery}`, { headers: { Accept: 'application/json' } });
			if (res.ok) return res.json();
			console.error(`   ! OData HTTP ${res.status} (ניסיון ${attempt + 1})`);
		} catch (e) {
			console.error(`   ! OData ${e?.message ?? e} (ניסיון ${attempt + 1})`);
		}
	}
	throw new Error(`OData נכשל: ${pathAndQuery.slice(0, 120)}`);
}

// שליפה מדופדפת של כל הרשומות
async function odataAll(entity, filter) {
	const rows = [];
	const PAGE = 100;
	for (let skip = 0; ; skip += PAGE) {
		const json = await odataJson(
			`${entity}?$filter=${encodeURIComponent(filter)}&$top=${PAGE}&$skip=${skip}&$format=json`,
		);
		const page = json?.value ?? [];
		rows.push(...page);
		if (page.length < PAGE) break;
		await sleep(300);
	}
	return rows;
}

// השוואת שמות סלחנית: מקפים→רווח, בלי גרשיים/גרש, רווחים מכווצים
const norm = (s) =>
	String(s ?? '')
		.replace(/[־–—-]/g, ' ')
		.replace(/["'׳״`]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

// "משרד החינוך" → "שר החינוך" · "המשרד לביטחון לאומי" → "השר לביטחון לאומי"
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

// ---- 1. כל האיושים הנוכחיים בכנסת ה-25 ----
console.log(`שולף איושים נוכחיים (כנסת ${KNESSET_NUM})...`);
const p2p = await odataAll('KNS_PersonToPosition', `KnessetNum eq ${KNESSET_NUM} and IsCurrent eq true`);
const relevant = p2p.filter((r) => WANTED.has(r.PositionID));
console.log(`${p2p.length} רשומות, מהן ${relevant.length} רלוונטיות`);

// ---- 2. קיבוץ לפי אדם ----
const people = new Map(); // PersonID → { mk, pm, ministries[], deputies[], factionId, factionStart }
for (const r of relevant) {
	const p = people.get(r.PersonID) ?? { mk: false, pm: false, ministries: [], deputies: [], factionId: null, factionStart: '' };
	// DutyDesc הוא התואר המדויק ("שר נוסף במשרד האוצר", "השר לשיתוף פעולה אזורי")
	const duty = (r.DutyDesc ?? '').trim();
	if (POS.MK.includes(r.PositionID)) p.mk = true;
	if (POS.PM.includes(r.PositionID)) p.pm = true;
	if (POS.MINISTER.includes(r.PositionID)) p.ministries.push({ duty, ministry: r.GovMinistryName ?? '' });
	if (POS.DEPUTY_MINISTER.includes(r.PositionID)) p.deputies.push({ duty, ministry: r.GovMinistryName ?? '' });
	if (POS.FACTION_MEMBER.includes(r.PositionID) && (r.StartDate ?? '') >= p.factionStart) {
		p.factionId = r.FactionID;
		p.factionStart = r.StartDate ?? '';
	}
	people.set(r.PersonID, p);
}

// שרים "נורווגים" בלי רשומת סיעה נוכחית — שליפת הסיעה האחרונה שלהם
for (const [pid, p] of people) {
	if (p.factionId) continue;
	const rows = await odataAll(
		'KNS_PersonToPosition',
		`PersonID eq ${pid} and KnessetNum eq ${KNESSET_NUM} and PositionID eq 54`,
	);
	const latest = rows.sort((a, b) => String(b.StartDate).localeCompare(String(a.StartDate)))[0];
	if (latest) p.factionId = latest.FactionID;
	await sleep(300);
}

// ---- 3. שמות ומגדר ----
console.log('שולף שמות...');
const ids = [...people.keys()];
const persons = new Map();
for (let i = 0; i < ids.length; i += 20) {
	const batch = ids.slice(i, i + 20);
	const filter = batch.map((id) => `PersonID eq ${id}`).join(' or ');
	const json = await odataJson(`KNS_Person?$filter=${encodeURIComponent(filter)}&$format=json`);
	for (const row of json?.value ?? []) persons.set(row.PersonID, row);
	await sleep(300);
}

// ---- 4. בניית רשומות ----
const entries = [];
for (const [pid, p] of people) {
	const person = persons.get(pid);
	if (!person) {
		console.error(`? לא נמצא KNS_Person עבור ${pid}`);
		continue;
	}
	const rawName = `${person.FirstName ?? ''} ${person.LastName ?? ''}`.replace(/\s+/g, ' ').trim();
	const name = NAME_OVERRIDES[rawName] ?? rawName;
	const female = person.GenderDesc === 'נקבה';
	const org = FACTION_SHORT[p.factionId] ?? '';

	// תיק "אמיתי" עדיף על "שר נוסף במשרד X" כשיש כמה תיקים
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

	const bio = org ? `${position} מטעם ${org}` : position;
	entries.push({ name, group: 'knesset', position, org, bio });
}
entries.sort((a, b) => a.name.localeCompare(b.name, 'he'));
console.log(`\nסה"כ ${entries.length} מכהנים\n`);

// ---- 5. סינון קיימים: מול הקובץ ומול ה-DB ----
const dir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(dir, 'seed-officials.json');
const seed = JSON.parse(await readFile(seedPath, 'utf8'));
const known = new Set(seed.map((o) => norm(o.name)));

if (strapiUrl) {
	const base = strapiUrl.replace(/\/+$/, '');
	const res = await fetch(
		`${base}/api/items?filters[category][$eq]=pr_official&pagination[limit]=1000&fields[0]=label`,
	);
	if (!res.ok) {
		console.error(`✗ שליפת מדורגים מ-Strapi נכשלה: HTTP ${res.status}`);
		process.exit(1);
	}
	for (const item of (await res.json()).data ?? []) known.add(norm(item.label));
}

const fresh = entries.filter((e) => !known.has(norm(e.name)));
const skipped = entries.length - fresh.length;

for (const e of fresh) console.log(`✚ ${e.name} | ${e.position} | ${e.org}`);
console.log(`\nחדשים: ${fresh.length} · כבר קיימים: ${skipped}`);

if (dry || !fresh.length) {
	if (dry) console.log('(מצב dry — לא נכתב לקובץ)');
	process.exit(0);
}

// ---- 6. כתיבה לקובץ בפורמט הקיים (שורה לרשומה) ----
const all = [...seed, ...fresh];
const lines = all.map((o) => '  ' + JSON.stringify(o).replace(/","/g, '", "').replace(/{"/, '{ "').replace(/"}$/, '" }'));
await writeFile(seedPath, '[\n' + lines.join(',\n') + '\n]\n', 'utf8');
console.log(`נכתבו ${fresh.length} רשומות חדשות ל-${path.basename(seedPath)}`);
