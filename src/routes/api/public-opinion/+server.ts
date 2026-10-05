// ============================================================
// POST /api/public-opinion — קליטת אירוע לכוכב "דעת הציבור" מאתרי הרשת.
//
// שרת-לשרת בלבד: האתר השולח (כרגע "מבקר רשויות המדינה", אחרי בחירת
// מודרטור העיר) חותם בסוד משותף — Authorization: Bearer <OPINION_SHARED_SECRET>.
// בלי הסוד בשני הצדדים ה-endpoint סגור (503).
// ============================================================

import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { recordOpinion } from '$lib/server/opinion';
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
