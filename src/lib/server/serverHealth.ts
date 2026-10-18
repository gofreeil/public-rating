// ============================================================
// serverHealth.ts - מדדי בריאות/עומס של שרת הבאקאנד (הועתק מקהילה בשכונה)
//
// הבאקאנד המשותף (api.gofreeil.com) חושף GET /api/server-health עם מדדי
// מערכת חיים (מעבד/זיכרון/דיסק/זמן-תגובה). אותו שרת משרת גם את האתר
// הזה, ולכן לוח המכוונים רלוונטי כאן כמו שם. TTL קצר — כמעט בזמן-אמת,
// בלי להציף את השרת ברענונים תכופים.
// ============================================================

import { strapiGet } from './strapiClient';
import type { ServerHealth } from '$lib/serverHealthTypes';

export type { ServerHealth } from '$lib/serverHealthTypes';

const TTL_MS = 10_000;
let cache: { at: number; data: ServerHealth } | null = null;

/** מדדי בריאות השרת. מחזיר null אם הבאקאנד לא זמין / הנתיב עוד לא פרוס. */
export async function getServerHealth(): Promise<ServerHealth | null> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    try {
        const data = await strapiGet<ServerHealth>('/api/server-health');
        cache = { at: Date.now(), data };
        return data;
    } catch (e) {
        console.warn('[serverHealth] failed:', e instanceof Error ? e.message : e);
        return null;
    }
}
