import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth';
import { listApproved, listPendingBrief } from '$lib/server/ads';

/**
 * חתימה קלה על מצב הפרסומות, לרענון האוטומטי של מסך הניהול (כמו בגמ"ח הארצי).
 *
 * הדף מושך מכאן חתימה של כמה עשרות בייטים כל 30 שניות, ומריץ
 * invalidateAll() (שמושך מחדש את כל הפרסומות עם התמונות) רק כשהיא
 * השתנתה — אחרת טאב אדמין פתוח היה שורף מגה-בייטים כל חצי דקה.
 */
export const GET: RequestHandler = async ({ locals }) => {
    requireAdmin(await locals.auth());

    const [pending, approved] = await Promise.all([
        listPendingBrief().catch(() => []),
        listApproved().catch(() => []),
    ]);
    const newest = pending.reduce((max, a) => (a.submittedAt > max ? a.submittedAt : max), '');

    return json(
        { sig: `${pending.length}|${approved.length}|${newest}` },
        { headers: { 'cache-control': 'no-store' } },
    );
};
