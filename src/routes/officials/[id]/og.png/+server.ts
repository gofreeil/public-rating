// ============================================================
// /officials/<id>/og.png — תמונת השיתוף של המדורג
//
// נבנית בבקשה ונשמרת בקאש בזיכרון. הזחלנים של וואטסאפ ופייסבוק מושכים
// אותה פעם אחת ושומרים אצלם, כך שהעומס בפועל זניח.
//
// נפילה רכה: כל תקלה ברינדור (בינארי חסר בפלטפורמת הפריסה, גופן, זיכרון)
// מפנה לתמונת ברירת המחדל. במקרה הגרוע חוזרים להתנהגות של היום — אף פעם
// לא לקישור שבור.
// ============================================================

import { error, redirect } from '@sveltejs/kit';
import { computeStats } from '$lib/rating/aggregate';
import { groupByKey } from '$lib/rating/types';
import { getOfficial, getReviewsFor } from '$lib/server/rating';
import { renderCard } from '$lib/server/og/card';
import { fetchImageDataUri } from '$lib/server/og/remoteImage';
import { DEFAULT_OG_IMAGE } from '$lib/seo';
import type { RequestHandler } from './$types';

/** קאש קטן בזיכרון — הכרטיס משתנה רק כשמתווסף דירוג */
const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; png: Buffer }>();

function readCache(key: string): Buffer | null {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > TTL_MS) {
        cache.delete(key);
        return null;
    }
    return hit.png;
}

function writeCache(key: string, png: Buffer): void {
    // פינוי הרשומה הוותיקה ביותר כשהמפה מתמלאת (Map שומר סדר הכנסה)
    if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), png });
}

export const GET: RequestHandler = async ({ params, setHeaders }) => {
    const cached = readCache(params.id);
    if (cached) {
        setHeaders({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600' });
        return new Response(new Uint8Array(cached));
    }

    let official;
    try {
        official = await getOfficial(params.id);
    } catch {
        redirect(302, DEFAULT_OG_IMAGE);
    }
    if (!official) error(404, 'המדורג לא נמצא');

    let stats;
    try {
        stats = computeStats(await getReviewsFor(official.id));
    } catch {
        stats = computeStats([]);
    }

    // תמונת פנים אמיתית עושה את ההבדל בין קישור שנפתח לקישור שנגלל.
    // כישלון כאן אינו כישלון של הכרטיס — נופלים לאווטאר ראשי תיבות.
    const imageDataUri = official.image ? ((await fetchImageDataUri(official.image)) ?? undefined) : undefined;

    let png: Buffer;
    try {
        png = renderCard({
            name: official.name,
            position: official.position,
            org: official.org,
            groupTitle: groupByKey(official.group)?.title ?? '',
            average: stats.average,
            count: stats.count,
            imageDataUri,
        });
    } catch (e) {
        console.error('[og] render failed:', e instanceof Error ? e.message : e);
        redirect(302, DEFAULT_OG_IMAGE);
    }

    writeCache(params.id, png);
    setHeaders({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600' });
    return new Response(new Uint8Array(png));
};
