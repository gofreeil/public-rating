// ============================================================
// POST /api/public-opinion — קליטת אירוע לכוכב "דעת הציבור" מאתרי הרשת.
//
// שרת-לשרת בלבד: האתר השולח (כרגע "מבקר רשויות המדינה", אחרי בחירת
// מודרטור העיר) חותם בסוד משותף — Authorization: Bearer <OPINION_SHARED_SECRET>.
// בלי הסוד בשני הצדדים ה-endpoint סגור (503).
//
// GET /api/public-opinion?source=criticism&days=60&limit=12 — ציבורי: השינויים
// האחרונים בכוכב (מי עלה/ירד ולמה), לבאנר באתר המקור.
// ============================================================

import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { listRecentOpinion, recordOpinion } from '$lib/server/opinion';
import { isOpinionReason } from '$lib/rating/opinion';
import type { RequestHandler } from './$types';

const SOURCES = new Set(['criticism']);

function authorized(header: string | null, secret: string): boolean {
    const got = Buffer.from(header?.replace(/^Bearer\s+/i, '') ?? '');
    const want = Buffer.from(secret);
    return got.length === want.length && timingSafeEqual(got, want);
}

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const iso = (v: unknown): string | null => {
    const t = typeof v === 'string' ? Date.parse(v) : NaN;
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

const clampInt = (v: string | null, def: number, min: number, max: number): number => {
    const n = Number.parseInt(v ?? '', 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export const GET: RequestHandler = async ({ url }) => {
    const source = url.searchParams.get('source') ?? 'criticism';
    if (!SOURCES.has(source)) return json({ error: 'מקור לא מוכר' }, { status: 400 });
    const days = clampInt(url.searchParams.get('days'), 60, 1, 365);
    const limit = clampInt(url.searchParams.get('limit'), 12, 1, 50);

    try {
        const changes = (await listRecentOpinion(source, days, limit)).map((c) => ({
            ...c,
            officialUrl: `${url.origin}/officials/${c.officialId}`,
        }));
        return json({ changes }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    } catch (e) {
        console.error('[public-opinion GET]', e);
        return json({ changes: [] }, { status: 502 });
    }
};

export const POST: RequestHandler = async ({ request, url }) => {
    const secret = env.OPINION_SHARED_SECRET;
    if (!secret) return json({ error: 'קליטת דעת הציבור לא הוגדרה בשרת' }, { status: 503 });
    if (!authorized(request.headers.get('authorization'), secret)) {
        return json({ error: 'לא מורשה' }, { status: 401 });
    }

    let b: Record<string, any>;
    try {
        b = await request.json();
    } catch {
        return json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
    }

    const source = str(b.source, 40);
    const sourceRef = str(b.sourceRef, 100);
    const name = str(b.official?.name, 120);
    const externalId = str(b.official?.externalId, 100);
    if (!SOURCES.has(source) || !sourceRef || !name || !externalId || !isOpinionReason(b.reason)) {
        return json({ error: 'חסרים שדות חובה' }, { status: 400 });
    }
    const days = Number(b.days);

    try {
        const r = await recordOpinion({
            source,
            sourceRef,
            sourceUrl: /^https:\/\//.test(str(b.sourceUrl)) ? str(b.sourceUrl) : '',
            title: str(b.title, 200),
            reason: b.reason,
            days: Number.isFinite(days) && days >= 0 ? Math.floor(days) : null,
            sentAt: iso(b.sentAt),
            respondedAt: iso(b.respondedAt),
            official: {
                externalId,
                name,
                role: str(b.official?.role, 80),
                city: str(b.official?.city, 80),
            },
        });
        return json({
            ok: true,
            officialId: r.officialId,
            officialUrl: `${url.origin}/officials/${r.officialId}`,
            created: r.created,
            star: r.star,
        });
    } catch (e) {
        console.error('[public-opinion]', e);
        return json({ error: 'השמירה באתר הדירוג נכשלה' }, { status: 500 });
    }
};
