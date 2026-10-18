// ============================================================
// GET /api/server-health — מדדי בריאות/עומס השרת ללוח המכוונים בפאנל
// הניהול (רענון ידני ב-↻). מוגן לסופר-אדמין בלבד.
// ============================================================
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getServerHealth } from '$lib/server/serverHealth';

export const GET: RequestHandler = async ({ locals }) => {
    requireSuperAdmin(await locals.auth());
    return json(await getServerHealth(), { headers: { 'cache-control': 'no-store' } });
};
