#!/usr/bin/env node
// ============================================================
// seed-officials.mjs — זריעת מדורגים ראשונית ל-Strapi (pr_official)
//
// שימוש:
//   node scripts/seed-officials.mjs --url https://api.gofreeil.com [--dry]
//   או: STRAPI_URL=https://api.gofreeil.com node scripts/seed-officials.mjs
//   אופציונלי: STRAPI_TOKEN=<api token> → נשלח כ-Authorization: Bearer
//
// בטוח להרצה חוזרת — מדלג על מדורג שכבר קיים (לפי label).
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GROUP_ICONS = { knesset: '🏛️', judges: '⚖️', public_servants: '🏢' };

// ---- ארגומנטים ----
let url = process.env.STRAPI_URL || '';
let dry = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--url') url = argv[++i] || '';
	else if (argv[i] === '--dry') dry = true;
}
if (!url) {
	console.error('שימוש: node scripts/seed-officials.mjs --url <STRAPI_URL> [--dry]');
	console.error('       (או משתנה סביבה STRAPI_URL)');
	process.exit(1);
}
const base = url.replace(/\/+$/, '');

const headers = { 'Content-Type': 'application/json' };
if (process.env.STRAPI_TOKEN) headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;

// ---- קריאת קובץ הנתונים (יחסית למיקום הסקריפט) ----
const dir = path.dirname(fileURLToPath(import.meta.url));
const officials = JSON.parse(await readFile(path.join(dir, 'seed-officials.json'), 'utf8'));

let added = 0;
let skipped = 0;
let failed = 0;

for (const o of officials) {
	try {
		// בדיקת קיום לפי שם
		const checkUrl =
			`${base}/api/pr-items?filters[category][$eq]=pr_official` +
			`&filters[label][$eq]=${encodeURIComponent(o.name)}` +
			`&pagination[limit]=1`;
		const checkRes = await fetch(checkUrl, { headers });
		if (!checkRes.ok) {
			console.error(`✗ שגיאה בבדיקת "${o.name}": HTTP ${checkRes.status} — ${await checkRes.text()}`);
			failed++;
			continue;
		}
		const existing = await checkRes.json();
		if (existing?.data?.length) {
			console.log(`≡ קיים: ${o.name}`);
			skipped++;
			continue;
		}

		if (dry) {
			console.log(`✚ (dry) יתווסף: ${o.name}`);
			added++;
			continue;
		}

		const postRes = await fetch(`${base}/api/pr-items`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				data: {
					category: 'pr_official',
					label: o.name,
					description: o.bio,
					extra_fields: {
						group: o.group,
						position: o.position,
						org: o.org,
						...(o.image ? { image: o.image } : {}),
						approved: true,
					},
					icon: GROUP_ICONS[o.group] ?? '🏛️',
					color: 'blue',
					status1: 'active',
					user_id: null,
					publishedAt: new Date().toISOString(),
				},
			}),
		});
		if (!postRes.ok) {
			console.error(`✗ שגיאה בהוספת "${o.name}": HTTP ${postRes.status} — ${await postRes.text()}`);
			failed++;
			continue;
		}
		console.log(`✚ נוסף: ${o.name}`);
		added++;
	} catch (e) {
		console.error(`✗ שגיאה ב-"${o.name}": ${e?.message ?? e}`);
		failed++;
	}
}

console.log(`\nסיכום: נוספו ${added} · דולגו ${skipped} · נכשלו ${failed}`);
process.exit(failed ? 1 : 0);
