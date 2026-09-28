// ============================================================
// /advertise/manage — הפרסומות שלי: סטטוס, מדדים ותוקף.
//
// לאדמין שגם מפרסם בעצמו יש כאן קיצורי ניהול (אישור/דחייה/השהיה/הורדה),
// כדי לא לעבור למסך הניהול בשביל פרסומת אחת. אותן פונקציות בדיוק כמו
// ב-/admin/ads; ההרשאה נבדקת בתוך כל פעולה, לא רק ב-load (כלל 3).
// ============================================================

import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';
import {
    approveAd,
    isExpired,
    listForOwner,
    pauseAd,
    rejectAd,
    resumeAd,
    unapproveAd,
} from '$lib/server/ads';
import { getAdStats, type AdStatRow } from '$lib/server/adStats';
import type { SubmittedAd } from '$lib/ads/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const userId = session?.user?.id;
    if (!userId) {
        redirect(303, `/login?redirect=${encodeURIComponent('/advertise/manage')}`);
    }

    let ads: SubmittedAd[] = [];
    try {
        ads = await listForOwner(userId);
    } catch (e) {
        console.warn('[advertise/manage] listForOwner failed:', e instanceof Error ? e.message : e);
    }

    let stats: Record<string, AdStatRow> = {};
    try {
        stats = await getAdStats(ads.map((a) => a.id));
    } catch {
        stats = {};
    }

    const now = Date.now();
    return {
        sent: event.url.searchParams.get('sent') === '1',
        // קיצורי הניהול בכרטיסים מוצגים לאדמין בלבד; הפעולות עצמן בודקות שוב
        isAdmin: isAdmin(session),
        ads: ads.map((ad) => {
            const expired = isExpired(ad, now);
            return {
                id: ad.id,
                title: ad.title,
                subtitle: ad.subtitle,
                gradientId: ad.gradientId,
                mainImage: ad.mainImage,
                status: ad.status,
                expired,
                paused: Boolean(ad.paused),
                /** באוויר ממש: מאושרת, בתוקף ולא מושהית */
                live: ad.status === 'approved' && !expired && !ad.paused,
                expiresAt: ad.expiresAt,
                daysLeft: ad.expiresAt
                    ? Math.ceil((new Date(ad.expiresAt).getTime() - now) / 86_400_000)
                    : 0,
                rejectionReason: ad.rejectionReason,
                requestedDurationDays: ad.requestedDurationDays,
                // "עדכון ל-..." רלוונטי רק בזמן ההמתנה: אחרי האישור הישנה כבר לא ברשימה
                replacesTitle: ad.status === 'pending' ? (ad.replacesTitle ?? '') : '',
                submittedAt: ad.submittedAt,
                stats: stats[ad.id] ?? { impressions: 0, clicks: 0, landing: 0, leads: 0, ctr: 0 },
            };
        }),
    };
};

/**
 * הפתיח המשותף לכל קיצור ניהול: הרשאה, מזהה פרסומת ומי מבצע. הדף הזה
 * פתוח לכל מפרסם מחובר, ולכן מי שאינו אדמין מקבל fail(403) עם הודעה —
 * לא דף שגיאה. כל התוצאות באותה צורה: { success, message } בהצלחה,
 * fail עם { error } בכישלון.
 */
async function adAction(
    event: Parameters<Actions[string]>[0],
): Promise<{ id: string; fd: FormData; by: string } | { error: string; status: number }> {
    const session = await event.locals.auth();
    if (!isAdmin(session)) return { error: 'נדרשת הרשאת ניהול', status: 403 };
    const fd = await event.request.formData();
    const id = String(fd.get('id') ?? '');
    if (!id) return { error: 'חסר מזהה פרסומת', status: 400 };
    return { id, fd, by: session?.user?.email ?? session?.user?.name ?? 'admin' };
}

export const actions: Actions = {
    // אישור (או חידוש של פרסומת שפג תוקפה — אותה פעולה, תוקף חדש מהיום).
    // המסלול = מה שהמפרסם בחר בשליחה; בחירה מפורשת — במסך הניהול.
    approve: async (event) => {
        const a = await adAction(event);
        if ('error' in a) return fail(a.status, { error: a.error });
        try {
            const { replacedTitle } = await approveAd(a.id, {
                durationDays: a.fd.get('duration_days'),
                decidedBy: a.by,
            });
            return {
                success: true,
                message: replacedTitle
                    ? `הפרסומת אושרה ונכנסה במקום "${replacedTitle}", שירדה מהאוויר`
                    : 'הפרסומת אושרה ועלתה לאוויר',
            };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    reject: async (event) => {
        const a = await adAction(event);
        if ('error' in a) return fail(a.status, { error: a.error });
        try {
            await rejectAd(a.id, { reason: String(a.fd.get('reason') ?? ''), decidedBy: a.by });
            return { success: true, message: 'הפרסומת נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // השהיה — יורדת מהאוויר ושומרת את הימים שנותרו
    pause: async (event) => {
        const a = await adAction(event);
        if ('error' in a) return fail(a.status, { error: a.error });
        try {
            const r = await pauseAd(a.id);
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            return { success: true, message: `${r.title} הושהתה — ${r.daysLeft} ימים שמורים לה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהשהיה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // המשך אחרי השהיה — הימים השמורים נספרים מהיום
    resume: async (event) => {
        const a = await adAction(event);
        if ('error' in a) return fail(a.status, { error: a.error });
        try {
            const r = await resumeAd(a.id);
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            return { success: true, message: `${r.title} חזרה לאוויר — ${r.daysLeft} ימים` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהפעלה מחדש: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הורדה מהאוויר בלי מחיקה — חוזרת לממתינות והמשבצת מתפנה
    unapprove: async (event) => {
        const a = await adAction(event);
        if ('error' in a) return fail(a.status, { error: a.error });
        try {
            await unapproveAd(a.id, a.by);
            return { success: true, message: 'הפרסומת ירדה מהאתר וחזרה לממתינות' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהורדה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
