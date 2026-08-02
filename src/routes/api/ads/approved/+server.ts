// ============================================================
// GET /api/ads/approved — הזנת המודעות שעל האוויר לתצוגה הציבורית.
//
// נקודת קצה נפרדת ולא דרך ה-layout, כדי שהפרסומות יהיו שכבה עצמאית.
// הקאש קצר בכוונה ומיושר ל-TTL שבמאגר (15ש'): קאש ארוך גרם באתר המקור
// לכך שתשובת "אין מודעות" שנשמרה רגע לפני האישור הוגשה עוד דקות
// ארוכות אחריו, ומודעה שאושרה לא הופיעה בטור.
// ============================================================

import { json } from '@sveltejs/kit';
import { listApproved } from '$lib/server/ads';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
    let ads: Awaited<ReturnType<typeof listApproved>> = [];
    try {
        ads = await listApproved();
    } catch (e) {
        console.warn('[ads] approved feed failed:', e instanceof Error ? e.message : e);
    }
    setHeaders({ 'cache-control': 'public, s-maxage=15, stale-while-revalidate=15' });
    return json({ ads });
};
