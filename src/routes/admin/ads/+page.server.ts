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
import { isAdmin, isSuperAdmin, requireAdmin } from '$lib/server/auth';
import { AD_SLOTS } from '$lib/ads/slots';
import { adPlans } from '$lib/ads/plans';
import {
    AdTooLargeError,
    approveAd,
    computeAdSlots,
    extendAd,
    isExpired,
    listAllForAdmin,
    moveApprovedAd,
    normalizeDurationDays,
    pauseAd,
    rejectAd,
    removeAd,
    resumeAd,
    setAdDuration,
    setAdExpiry,
    setAdSlot,
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
    // המקום המספרי הקבוע של כל מודעה מאושרת בלוח (1-based) — גם מושהית/
    // פגה שומרת את המקום שלה, כדי שתחזור אליו כשהיא עולה שוב לאוויר
    const adSlots = computeAdSlots(ads);
    // סדר המודעות שעל האוויר — זהה לסדר שהאתר מציג בו; ממנו נגזרים
    // כפתורי ▲/▼ (מושבתים בקצוות הטור)
    const slotOrder = ads
        .filter((a) => a.status === 'approved' && !isExpired(a, now) && !a.paused)
        .sort((a, b) => (adSlots.get(a.id) ?? 0) - (adSlots.get(b.id) ?? 0))
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
        // המקום המספרי הקבוע בלוח (1-based); למודעה לא-מאושרת אין מקום
        slot: adSlots.get(ad.id) ?? null,
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
        // חלון הקציבה (תקופה/תפוגה שרירותית) שמור לסופר-אדמין
        superAdmin: isSuperAdmin(session),
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

    // קציבת תקופה — נספרת מיום האישור (extend מוסיף על הקיים, זה קובע מחדש). שמורה לסופר-אדמין
    setDuration: async (event) => {
        await adminOf(event);
        if (!isSuperAdmin(await event.locals.auth())) {
            return fail(403, { error: 'קציבת תקופה שמורה לסופר-אדמין' });
        }
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

    // תאריך תפוגה שרירותי מחלון הקציבה — המודעה יורדת בסוף היום שנבחר. שמור לסופר-אדמין
    setExpiry: async (event) => {
        await adminOf(event);
        if (!isSuperAdmin(await event.locals.auth())) {
            return fail(403, { error: 'קביעת תאריך תפוגה שמורה לסופר-אדמין' });
        }
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        const expires = String(fd.get('expires') ?? '');
        if (!id || !expires) return fail(400, { error: 'חסר תאריך תפוגה' });
        const d = new Date(`${expires}T23:59:59`);
        if (isNaN(d.getTime())) return fail(400, { error: 'תאריך לא תקין' });
        try {
            const r = await setAdExpiry(id, d.toISOString());
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
            const day = new Date(r.expiresAt).toLocaleDateString('he-IL');
            const suffix = r.daysLeft < 0 ? ' — התאריך שנקבע כבר עבר, המודעה ירדה מהאוויר' : '';
            return { success: true, message: `${r.title}: תפוגה נקבעה ל-${day}${suffix}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בקביעת התאריך: ${e instanceof Error ? e.message : e}` });
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

    // הצבה במקום מספרי בלוח — מקום תפוס: שתי המודעות מתחלפות זו בזו
    setSlot: async (event) => {
        await adminOf(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה פרסומת' });
        try {
            const r = await setAdSlot(id, Number(fd.get('slot')));
            if (!r) return fail(404, { error: 'הפרסומת לא נמצאה או שאינה מאושרת' });
            return {
                success: true,
                message: r.swappedTitle
                    ? `"${r.title}" עברה למקום ${r.slot}, ו"${r.swappedTitle}" עברה למקום ${r.swappedSlot}`
                    : `"${r.title}" עברה למקום ${r.slot}`,
            };
        } catch (e) {
            return fail(500, { error: `שגיאה בהעברה: ${e instanceof Error ? e.message : e}` });
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
