// ============================================================
// /admin/ads — ניהול הפרסומות (צוות הניהול — אדמין ומעלה)
//
// אישור, דחייה, הארכה, הסרה והזנה ידנית. ההזנה הידנית היא מה שהופך
// את המערכת לשמישה מהיום הראשון: בעל האתר מזין מודעה של מפרסם שסגר
// איתו בטלפון, בלי שהמפרסם צריך חשבון או בילדר.
//
// הרשאה נבדקת גם ב-load וגם בתוך כל action — כלל 3 ב-CLAUDE.md.
// ============================================================

import { fail, redirect } from '@sveltejs/kit';
import { isAdmin, requireAdmin } from '$lib/server/auth';
import { AD_SLOTS } from '$lib/ads/slots';
import { adPlans } from '$lib/ads/plans';
import {
    AdTooLargeError,
    approveAd,
    extendAd,
    isExpired,
    bySlotOrder,
    listAllForAdmin,
    moveApprovedAd,
    normalizeDurationDays,
    pauseAd,
    rejectAd,
    removeAd,
    resumeAd,
    setAdDuration,
    submitAd,
    unapproveAd,
} from '$lib/server/ads';
import { getAdStats, type AdStatRow } from '$lib/server/adStats';
import type { SubmittedAd } from '$lib/ads/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (!isAdmin(session)) redirect(303, '/');

    let ads: SubmittedAd[] = [];
    let backendUnavailable = false;
    try {
        ads = await listAllForAdmin();
    } catch (e) {
        console.warn('[admin/ads] listAllForAdmin failed:', e instanceof Error ? e.message : e);
        backendUnavailable = true;
    }

    // המדדים הם שכבה נלווית — כשלון בטעינתם לא מונע ניהול
    let stats: Record<string, AdStatRow> = {};
    try {
        stats = await getAdStats(ads.map((a) => a.id));
    } catch (e) {
        console.warn('[admin/ads] getAdStats failed:', e instanceof Error ? e.message : e);
    }

    const now = Date.now();
    // סדר המשבצות בטור — זהה לסדר שהאתר מציג בו. ממנו נגזר מספר המשבצת
    // שמוצג ליד כל מודעה וכפתורי החלפת המקום.
    const slotOrder = ads
        .filter((a) => a.status === 'approved' && !isExpired(a, now) && !a.paused)
        .slice()
        .reverse()
        .sort(bySlotOrder)
        .map((a) => a.id);

    const rows = ads.map((ad) => ({
        ...ad,
        // המפרסם ופרטי הקשר נשארים כאן: זה מסך אדמין מאחורי הרשאה,
        // בניגוד לדף הנחיתה הציבורי שמקבל רק toPublicAd
        expired: isExpired(ad, now),
        daysLeft: ad.expiresAt
            ? Math.ceil((new Date(ad.expiresAt).getTime() - now) / 86_400_000)
            : 0,
        editedAfterDecision: Boolean(
            ad.editedAt && ad.decidedAt && new Date(ad.editedAt) > new Date(ad.decidedAt),
        ),
        stats: stats[ad.id] ?? { impressions: 0, clicks: 0, landing: 0, leads: 0, ctr: 0 },
        slotIndex: slotOrder.indexOf(ad.id),
        slotTotal: slotOrder.length,
        // גרסה מעודכנת שהמודעה הקודמת שלה באמת באוויר — רק אז האישור
        // מחליף אותה, ורק אז יש טעם בכפתור "אישור כמודעה נוספת"
        replacesLive: Boolean(
            ad.replacesAdId &&
                ads.some(
                    (o) => o.id === ad.replacesAdId && o.status === 'approved' && !isExpired(o, now),
                ),
        ),
    }));

    const live = rows.filter((a) => a.status === 'approved' && !a.expired).length;

    return {
        rows,
        backendUnavailable,
        plans: adPlans,
        slotCount: AD_SLOTS.length,
        live,
        pending: rows.filter((a) => a.status === 'pending').length,
    };
};

/** כל פעולה מאמתת הרשאה בעצמה ומחזירה את המזהה של המבצע */
async function adminOf(event: Parameters<Actions[string]>[0]): Promise<string> {
    const session = await event.locals.auth();
    requireAdmin(session);
    return session?.user?.email ?? session?.user?.name ?? 'admin';
}

export const actions: Actions = {
    approve: async (event) => {
        const by = await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        // ברירת המחדל לגרסה מעודכנת היא החלפה. keepPrevious הוא המקרה ההפוך:
        // מפרסם שבאמת רוצה שתי מודעות במקביל ולא שדרג את הקיימת.
        const keepPrevious = String(fd.get('keepPrevious') ?? '') === '1';
        try {
            const { replacedTitle } = await approveAd(id, {
                durationDays: fd.get('duration_days'),
                decidedBy: by,
                keepPrevious,
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
        const by = await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            await rejectAd(id, { reason: String(fd.get('reason') ?? ''), decidedBy: by });
            return { success: true, message: 'הפרסומת נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    extend: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            await extendAd(id, fd.get('duration_days'));
            return { success: true, message: 'הפרסום הוארך' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהארכה: ${e instanceof Error ? e.message : e}` });
        }
    },

    remove: async (event) => {
        const by = await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            await removeAd(id, by);
            return { success: true, message: 'הפרסומת הוסרה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהסרה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הורדה מהאוויר בלי מחיקה — המודעה חוזרת לממתינה והמשבצת מתפנה
    unapprove: async (event) => {
        const by = await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            await unapproveAd(id, by);
            return { success: true, message: 'הפרסומת ירדה מהאתר וחזרה לממתינות' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהורדה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // קציבת תקופה — נספרת מיום האישור (extend מוסיף על הקיים, זה קובע מחדש)
    setDuration: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            const r = await setAdDuration(id, normalizeDurationDays(fd.get('duration_days')));
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            const suffix = r.daysLeft < 0 ? ' — התקופה כבר חלפה, המודעה ירדה מהאוויר' : '';
            return { success: true, message: `${r.title}: ${r.daysLeft} ימים נותרו${suffix}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בקציבה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // השהיה — יורדת מהאוויר ושומרת את הימים שנותרו
    pause: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            const r = await pauseAd(id);
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            return { success: true, message: `${r.title} הושהתה — ${r.daysLeft} ימים שמורים לה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהשהיה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // המשך אחרי השהיה — הימים השמורים נספרים מהיום
    resume: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            const r = await resumeAd(id);
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            return { success: true, message: `${r.title} חזרה לאוויר — ${r.daysLeft} ימים` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהפעלה מחדש: ${e instanceof Error ? e.message : e}` });
        }
    },

    // החלפת מקום בין משבצות הטור
    move: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        const dir = fd.get('dir') === 'down' ? 'down' : 'up';
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            const r = await moveApprovedAd(id, dir);
            if (!r) return fail(400, { error: 'הפרסומת כבר בקצה הטור' });
            return { success: true, message: `${r.title} — משבצת ${r.position} מתוך ${r.total}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהחלפת המקום: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הזנה ידנית — נוצרת כ-pending ואז מאושרת בלחיצה, כדי שיהיה מסלול
    // כתיבה אחד בלבד (submitAd) ולא שני נתיבי יצירה שיכולים להיפרד
    create: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const title = String(fd.get('title') ?? '').trim();
        if (!title) return fail(400, { error: 'חסרה כותרת לפרסומת' });

        try {
            await submitAd({
                title,
                subtitle: String(fd.get('subtitle') ?? ''),
                hoverText: String(fd.get('hover_text') ?? ''),
                cta: String(fd.get('cta') ?? ''),
                gradientId: String(fd.get('gradient_id') ?? ''),
                logo: '',
                mainImage: '',
                style: {},
                landing: {
                    headline: String(fd.get('headline') ?? title),
                    pitch: String(fd.get('pitch') ?? ''),
                    phone: String(fd.get('phone') ?? ''),
                    whatsapp: String(fd.get('whatsapp') ?? ''),
                    website: String(fd.get('website') ?? ''),
                    email: String(fd.get('email') ?? ''),
                    address: String(fd.get('address') ?? ''),
                    hours: String(fd.get('hours') ?? ''),
                },
                requestedDurationDays: fd.get('duration_days'),
                ownerId: session?.user?.id ?? '',
                ownerName: String(fd.get('advertiser') ?? ''),
                contactEmail: String(fd.get('email') ?? ''),
                payment: 'owner',
            });
            return { success: true, message: `"${title}" נוצרה וממתינה לאישור` };
        } catch (e) {
            if (e instanceof AdTooLargeError) return fail(400, { error: e.message });
            return fail(500, { error: `שגיאה ביצירה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
