#!/usr/bin/env node
// ============================================================
// enrich-official-images.mjs — תמונות פנים אמיתיות למדורגים (pr_official)
//
// מושך לכל מדורג את תמונת הערך שלו בוויקיפדיה העברית (pageimages)
// ושומר את ה-URL ב-extra_fields.image. הפרונט מציג אותה ב-Avatar
// עם נפילה חזרה לראשי-תיבות אם הקישור מת.
//
// שימוש:
//   STRAPI_TOKEN=<token> node scripts/enrich-official-images.mjs --url https://api.gofreeil.com [--dry] [--force]
//   --dry   הדפסת ההתאמות בלבד, בלי כתיבה (לביקורת שהתמונה של האדם הנכון!)
//   --force עדכון גם למי שכבר יש image
//
// בטוח להרצה חוזרת — מדלג על מי שכבר יש לו תמונה (בלי --force).
// ============================================================

const WIKI_API = 'https://he.wikipedia.org/w/api.php';
const THUMB_SIZE = 256; // מוצג עד 72px — פי 2+ לרשתות retina

// שמות עמומים בוויקיפדיה → כותרת הערך המדויקת של האדם הנכון
// (בלי override, החיפוש מוצא את ישראל אהרוני הזואולוג...)
const TITLE_OVERRIDES = {
	'ישראל כ"ץ': 'ישראל כ"ץ (הליכוד)',
	'אלמוג כהן': 'אלמוג כהן (חבר הכנסת)', // בלי override — הכדורגלן
};

// ---- ארגומנטים ----
let url = process.env.STRAPI_URL || '';
let dry = false;
let force = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--url') url = argv[++i] || '';
	else if (argv[i] === '--dry') dry = true;
	else if (argv[i] === '--force') force = true;
}
if (!url) {
	console.error('שימוש: node scripts/enrich-official-images.mjs --url <STRAPI_URL> [--dry] [--force]');
	process.exit(1);
}
const base = url.replace(/\/+$/, '');
const headers = { 'Content-Type': 'application/json' };
if (process.env.STRAPI_TOKEN) headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// בקשה לוויקיפדיה עם retry — ה-API חוסם רצף בקשות מהיר (429)
async function wikiFetch(params) {
	for (let attempt = 0; attempt < 3; attempt++) {
		if (attempt) await sleep(3000 * attempt);
		const res = await fetch(`${WIKI_API}?${params}`, {
			headers: { 'User-Agent': 'gofreeil-rating/1.0 (yahavanter@gmail.com)' },
		});
		if (res.ok) return res.json();
		console.error(`   ! ויקיפדיה HTTP ${res.status} (ניסיון ${attempt + 1})`);
	}
	return null;
}

// ---- ויקיפדיה: כותרת → תמונה + תיאור (לאימות זהות) ----
async function wikiPageImage(title) {
	const json = await wikiFetch(new URLSearchParams({
		action: 'query',
		titles: title,
		prop: 'pageimages|description',
		format: 'json',
		pithumbsize: String(THUMB_SIZE),
		redirects: '1',
	}));
	if (!json) return null;
	const pages = json?.query?.pages ?? {};
	const page = Object.values(pages)[0];
	if (!page || page.missing !== undefined || !page.thumbnail?.source) return null;
	return {
		title: page.title,
		description: page.description ?? '',
		// בלי פרמטרי utm שוויקיפדיה מדביקה ל-API
		image: page.thumbnail.source.split('?')[0],
	};
}

// חיפוש חופשי כשאין ערך בכותרת המדויקת
async function wikiSearchTitle(name) {
	const json = await wikiFetch(new URLSearchParams({
		action: 'query',
		list: 'search',
		srsearch: name,
		srlimit: '1',
		format: 'json',
	}));
	return json?.query?.search?.[0]?.title ?? null;
}

// ---- שליפת כל המדורגים ----
const listUrl =
	`${base}/api/items?filters[category][$eq]=pr_official` +
	`&filters[status1][$eq]=active&pagination[limit]=1000`;
const listRes = await fetch(listUrl, { headers });
if (!listRes.ok) {
	console.error(`✗ שליפת מדורגים נכשלה: HTTP ${listRes.status} — ${await listRes.text()}`);
	process.exit(1);
}
const officials = (await listRes.json()).data ?? [];
console.log(`נמצאו ${officials.length} מדורגים${dry ? ' (מצב dry — בלי כתיבה)' : ''}\n`);

let updated = 0;
let skipped = 0;
let missing = 0;
let failed = 0;

for (const item of officials) {
	const name = item.label ?? '';
	const x = item.extra_fields && typeof item.extra_fields === 'object' ? item.extra_fields : {};

	if (x.image && !force) {
		console.log(`≡ יש תמונה: ${name}`);
		skipped++;
		continue;
	}

	try {
		await sleep(500); // לא להפגיז את ה-API של ויקיפדיה
		let hit = await wikiPageImage(TITLE_OVERRIDES[name] ?? name);
		if (!hit) {
			const found = await wikiSearchTitle(name);
			if (found) hit = await wikiPageImage(found);
		}
		if (!hit) {
			console.log(`? אין ערך/תמונה בוויקיפדיה: ${name}`);
			missing++;
			continue;
		}

		console.log(`✚ ${name} ← "${hit.title}" (${hit.description || 'ללא תיאור'})`);
		console.log(`   ${hit.image}`);

		if (dry) {
			updated++;
			continue;
		}

		const putRes = await fetch(`${base}/api/items/${item.documentId}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify({ data: { extra_fields: { ...x, image: hit.image } } }),
		});
		if (!putRes.ok) {
			console.error(`✗ כתיבה נכשלה ל-"${name}": HTTP ${putRes.status} — ${await putRes.text()}`);
			failed++;
			continue;
		}
		updated++;
	} catch (e) {
		console.error(`✗ שגיאה ב-"${name}": ${e?.message ?? e}`);
		failed++;
	}
}

console.log(`\nסיכום: עודכנו ${updated} · דולגו ${skipped} · בלי תמונה ${missing} · נכשלו ${failed}`);
process.exit(failed ? 1 : 0);
