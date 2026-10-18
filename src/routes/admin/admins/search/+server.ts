// ============================================================
// חיפוש משתמשים רשומים (סופר-אדמין) — למסך ניהול האדמינים, כמו בגמ"ח
// הארצי. מחפש ברשימת המשתמשים: קודם התאמה רגילה (שם/אימייל/טלפון/עיר),
// ואם אין — התאמה עמומה (מרחק לוינשטיין), כדי ששגיאת כתיב עדיין תציע
// את הדומים. מוחזר דגל fuzzy להצגת "אולי התכוונת".
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getAllUsers, type DbUser } from '$lib/server/db';
import { heMatches, heNormalize } from '$lib/rating/heSearch';
import { displayRole } from '$lib/server/adminUsers';

const MAX_RESULTS = 10;

/** מרחק לוינשטיין קלאסי, שתי שורות בלבד */
function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[b.length];
}

/** כמה שגיאות כתיב מרשים לפי אורך החיפוש */
function typoBudget(len: number): number {
    if (len <= 4) return 1;
    if (len <= 7) return 2;
    return 3;
}

/** המרחק העמום המינימלי בין החיפוש לשדות הרשומה (כולל מילים וקידומות) */
function fuzzyDistance(u: DbUser, q: string): number {
    const budget = typoBudget(q.length);
    let best = Infinity;
    for (const raw of [u.name, u.email, u.phone, u.nickname, u.city]) {
        if (!raw) continue;
        const v = heNormalize(raw);
        const candidates = new Set<string>([v]);
        if (v.includes('@')) candidates.add(v.split('@')[0]);
        for (const tok of v.split(/[@._\-\s]+/)) if (tok.length >= 2) candidates.add(tok);
        for (const c of candidates) {
            const d = Math.min(
                levenshtein(q, c),
                c.length > q.length ? levenshtein(q, c.slice(0, q.length)) : Infinity,
                c.length > q.length + 1 ? levenshtein(q, c.slice(0, q.length + 1)) : Infinity,
            );
            if (d < best) best = d;
            if (best === 0) return 0;
        }
    }
    return best <= budget ? best : Infinity;
}

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
    requireSuperAdmin(await locals.auth());

    const q = (url.searchParams.get('q') ?? '').trim();
    if (q.length < 2) return json({ users: [] });

    try {
        const all = await getAllUsers(cookies.get('strapi_jwt'));
        let matches = all.filter((u) => heMatches(q, u.name, u.email, u.phone, u.nickname, u.city));
        let fuzzy = false;
        if (matches.length === 0) {
            const nq = heNormalize(q);
            matches = all
                .map((u) => ({ u, d: fuzzyDistance(u, nq) }))
                .filter((h) => h.d !== Infinity)
                .sort((a, b) => a.d - b.d)
                .map((h) => h.u);
            fuzzy = matches.length > 0;
        }
        return json({
            fuzzy,
            users: matches.slice(0, MAX_RESULTS).map((u) => ({
                id: u.id,
                name: u.name ?? '',
                email: u.email ?? '',
                phone: u.phone ?? '',
                role: displayRole(u.role),
            })),
        });
    } catch (e) {
        console.error('[admin/admins] user search failed:', e);
        return json({ users: [], error: 'החיפוש ברשימת המשתמשים נכשל — נסו שוב בעוד רגע' });
    }
};
