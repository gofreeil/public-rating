// ============================================================
// POST /api/ads/track — קליטת מדדי פרסומות.
//
// ההגנה המרכזית: כל מזהה נבדק מול רשימת המודעות שעל האוויר, ולכן אי
// אפשר לנפח מונה של מזהה שרירותי. נוספה תקרת קצב נדיבה כדי שלולאה
// מתוסרטת תיחנק בלי לגעת בגולשים אמיתיים.
//
// המספרים אינדיקטיביים ולא ברי-חיוב: אין כאן זיהוי מבקר, ואותו אדם
// משני דפדפנים נראה כשניים.
// ============================================================

import { json } from '@sveltejs/kit';
import { listApproved } from '$lib/server/ads';
import { recordAdEvents } from '$lib/server/adStats';
import { allowAction } from '$lib/server/rateLimit';
import type { AdMetric } from '$lib/ads/adTrack';
import type { RequestHandler } from './$types';

const MAX_EVENTS = 25;
const VALID: AdMetric[] = ['impressions', 'clicks', 'landing', 'leads'];

export const POST: RequestHandler = async (event) => {
    if (!allowAction(event, 'adTrack')) return json({ ok: false }, { status: 429 });

    let payload: { events?: unknown };
    try {
        payload = await event.request.json();
    } catch {
        return json({ ok: false }, { status: 400 });
    }

    const raw = Array.isArray(payload.events) ? payload.events.slice(0, MAX_EVENTS) : [];
    if (!raw.length) return json({ ok: true });

    let liveIds: Set<string>;
    try {
        liveIds = new Set((await listApproved()).map((a) => a.id));
    } catch {
        return json({ ok: true });
    }

    const events = raw
        .map((e) => e as { id?: unknown; metric?: unknown })
        .filter(
            (e): e is { id: string; metric: AdMetric } =>
                typeof e.id === 'string' &&
                liveIds.has(e.id) &&
                typeof e.metric === 'string' &&
                VALID.includes(e.metric as AdMetric),
        );

    if (events.length) recordAdEvents(events);
    return json({ ok: true });
};
