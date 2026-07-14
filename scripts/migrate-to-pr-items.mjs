#!/usr/bin/env node
// ============================================================
// migrate-to-pr-items.mjs — העברת נתוני הדירוג הציבורי מאוסף ה-item
// המשותף אל האוסף המבודד pr-item.
//
// רקע: אוסף ה-item ב-Strapi משותף למשפחת "קהילה בשכונה" (גמ"ח ארצי, אבידות,
// בעלי מקצוע) — סנכרון דו-כיווני מכוון. אתר הדירוג הציבורי הוא מוצר נפרד
// שחלק בטעות את אותו אוסף, וניפח את מונה "פרטים במפה" של הקהילה.
// לכן הוא עובר ל-collection מבודד משלו: pr-item.
//
// שימוש:
//   node scripts/migrate-to-pr-items.mjs --dry           # תצוגה בלבד
//   node scripts/migrate-to-pr-items.mjs                 # העתקה ל-pr-items
//   node scripts/migrate-to-pr-items.mjs --delete-source # מחיקת המקור מ-item
//
// הרצה בטוחה וחוזרת: מדלג על רשומה שכבר הועתקה (לפי category+label).
// --delete-source מופרד בכוונה — מריצים אותו רק אחרי שמאמתים שהאתר עובד.
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CATEGORIES = ['pr_official', 'pr_review', 'pr_comment'];

// שדות התוכן שמועתקים 1:1 (ה-relation 'user' לא מועתק — user_id הוא מקור האמת)
const FIELDS = [
	'label', 'description', 'category', 'contact', 'phone', 'address',
	'icon', 'color', 'neighborhood', 'city', 'lat', 'lng',
	'extra_fields', 'status1', 'user_id', 'view_count', 'user_status',
];

const argv = process.argv.slice(2);
const dry          = argv.includes('--dry');
const deleteSource = argv.includes('--delete-source');

// ---- טעינת .env (STRAPI_URL / STRAPI_TOKEN) ----
const dir = path.dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
try {
	const raw = await readFile(path.join(dir, '..', '.env'), 'utf8');
	for (const line of raw.split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
		if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
} catch { /* אין .env — מסתמכים על משתני סביבה */ }

const base = (env.STRAPI_URL || '').replace(/\/+$/, '');
if (!base) { console.error('חסר STRAPI_URL'); process.exit(1); }

const headers = { 'Content-Type': 'application/json' };
if (env.STRAPI_TOKEN) headers.Authorization = `Bearer ${env.STRAPI_TOKEN}`;

const api = async (path, init) => {
	const res = await fetch(base + path, { ...init, headers });
	if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
	return res.status === 204 ? null : res.json();
};

// ---- 1. שליפת המקור מ-item ----
const filter = CATEGORIES.map((c, i) => `filters[category][$in][${i}]=${c}`).join('&');
const src = (await api(`/api/items?${filter}&pagination[limit]=1000&publicationState=preview`)).data ?? [];

console.log(`נמצאו ${src.length} רשומות דירוג באוסף המשותף item:`);
for (const c of CATEGORIES) {
	const n = src.filter((x) => x.category === c).length;
	if (n) console.log(`   ${c.padEnd(14)} ${n}`);
}

// ---- 2. מה כבר קיים ב-pr-items (אידמפוטנטיות) ----
const existing = (await api('/api/pr-items?pagination[limit]=1000&publicationState=preview')).data ?? [];
const key = (x) => `${x.category}::${x.label}`;
const already = new Set(existing.map(key));
console.log(`ב-pr-items כבר קיימות ${existing.length} רשומות.`);

if (deleteSource) {
	// מוחקים מהמקור רק רשומות שקיים להן עותק מאומת ב-pr-items
	const safe = src.filter((x) => already.has(key(x)));
	const unsafe = src.length - safe.length;
	if (unsafe > 0) {
		console.error(`❌ ${unsafe} רשומות עדיין ללא עותק ב-pr-items — לא מוחק כלום. הרץ קודם בלי --delete-source.`);
		process.exit(1);
	}
	console.log(`\nמוחק ${safe.length} רשומות מקור מ-item${dry ? ' (יבש)' : ''}...`);
	let del = 0;
	for (const x of safe) {
		if (!dry) await api(`/api/items/${x.documentId}`, { method: 'DELETE' });
		del++;
	}
	console.log(`✅ נמחקו ${del} רשומות מאוסף item. הקהילה נקייה.`);
	process.exit(0);
}

// ---- 3. העתקה ל-pr-items ----
let added = 0, skipped = 0, failed = 0;
for (const x of src) {
	if (already.has(key(x))) { skipped++; continue; }
	const data = {};
	for (const f of FIELDS) if (x[f] !== undefined && x[f] !== null) data[f] = x[f];
	data.publishedAt = x.publishedAt ?? new Date().toISOString();
	try {
		if (!dry) await api('/api/pr-items', { method: 'POST', body: JSON.stringify({ data }) });
		added++;
	} catch (e) {
		failed++;
		console.error(`   ✗ ${x.label}: ${e.message.slice(0, 120)}`);
	}
}

console.log(`\n${dry ? '[יבש] ' : ''}הועתקו ${added} · דילוג ${skipped} · כשלו ${failed}`);
if (failed) process.exit(1);
console.log('הצעד הבא: אמת שהאתר עובד מול pr-items, ואז הרץ --delete-source');
