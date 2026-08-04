// ============================================================
// /admin/officials - ניהול מדורגים (צוות הניהול — אדמין ומעלה)
// הוספה ידנית, אישור/דחיית הצעות משתמשים, עריכה והסרה
// ============================================================

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isAdmin, requireAdmin } from '$lib/server/auth';
import {
    listPendingOfficials,
    getRatedOfficials,
    createOfficial,
    updateOfficial,
    softDeleteRatingItem,
} from '$lib/server/rating';
import {
    PROMISE_STATUSES,
    groupByKey,
    type GroupKey,
    type Official,
    type OfficialPromise,
    type PromiseStatus,
    type RatedOfficial,
} from '$lib/rating/types';

/**
 * שורת הבטחה בטופס האדמין: "טקסט ההבטחה | סטטוס" (הסטטוס אופציונלי).
 * סטטוסים: קוימה / בתהליך / הופרה — כל דבר אחר נחשב "טרם נבחנה".
 */
function parsePromiseLines(raw: string): OfficialPromise[] {
    return raw
        .split('\n')
        .map((line) => {
            const parts = line.split('|');
            let status: PromiseStatus = 'unknown';
            if (parts.length > 1) {
                const label = parts[parts.length - 1].trim();
                const found = PROMISE_STATUSES.find((s) => s.label === label || s.key === label);
                if (found) {
                    status = found.key;
                    parts.pop();
                }
            }
            return { text: parts.join('|').trim(), status };
        })
        .filter((p) => p.text);
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (!isAdmin(session)) redirect(303, '/');

    let pending: Official[] = [];
    let officials: RatedOfficial[] = [];

    try {
        pending = await listPendingOfficials();
    } catch (e) {
        console.warn('[admin/officials] listPendingOfficials failed:', e);
    }
    try {
        officials = await getRatedOfficials();
    } catch (e) {
        console.warn('[admin/officials] getRatedOfficials failed:', e);
    }

    return { pending, officials };
};

export const actions: Actions = {
    // הוספת מדורג חדש (מאושר מיד)
    create: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const name = String(fd.get('name') ?? '').trim();
        const group = String(fd.get('group') ?? '');
        const position = String(fd.get('position') ?? '').trim();
        const org = String(fd.get('org') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const image = String(fd.get('image') ?? '').trim();

        if (!name) return fail(400, { error: 'חסר שם המדורג' });
        if (!groupByKey(group)) return fail(400, { error: 'קבוצה לא תקינה' });

        try {
            await createOfficial({ name, group: group as GroupKey, position, org, bio, image }, { approved: true });
            return { success: true, message: `"${name}" נוסף למדורגים` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהוספה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // אישור הצעת משתמש
    approve: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await updateOfficial(id, { approved: true });
            return { success: true, message: 'ההצעה אושרה — המדורג עלה ללוח' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    // דחיית הצעת משתמש (הסרה רכה)
    reject: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'ההצעה נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // עריכת פרטי מדורג קיים (כולל שדות הפרופיל המלא)
    update: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        const name = String(fd.get('name') ?? '').trim();
        const position = String(fd.get('position') ?? '').trim();
        const org = String(fd.get('org') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const image = String(fd.get('image') ?? '').trim();
        // חשבון הדמות (מענה רשמי): ריק = ללא שינוי, "-" = ניתוק
        const officialUser = String(fd.get('official_user') ?? '').trim();

        // ---- פרופיל מלא ----
        const contacts = {
            email: String(fd.get('contact_email') ?? '').trim(),
            phone: String(fd.get('contact_phone') ?? '').trim(),
            whatsapp: String(fd.get('contact_whatsapp') ?? '').trim(),
            facebook: String(fd.get('contact_facebook') ?? '').trim(),
            website: String(fd.get('contact_website') ?? '').trim(),
        };
        const verified = Boolean(fd.get('verified'));
        const platformUrl = String(fd.get('platform_url') ?? '').trim();
        const annualReportUrl = String(fd.get('annual_report_url') ?? '').trim();
        const specialties = String(fd.get('specialties') ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const promises = parsePromiseLines(String(fd.get('promises') ?? ''));
        const attendanceRaw = String(fd.get('attendance_score') ?? '').trim();
        const attendanceNum = Number(attendanceRaw);
        const attendanceScore =
            attendanceRaw !== '' && Number.isFinite(attendanceNum)
                ? Math.min(100, Math.max(0, Math.round(attendanceNum)))
                : null;

        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });
        if (!name) return fail(400, { error: 'חסר שם המדורג' });

        try {
            await updateOfficial(id, {
                name,
                position,
                org,
                bio,
                image,
                contacts,
                verified,
                platformUrl,
                annualReportUrl,
                specialties,
                promises,
                attendanceScore,
                ...(officialUser ? { officialUserId: officialUser === '-' ? null : officialUser } : {}),
            });
            return { success: true, message: `"${name}" עודכן` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הסרת מדורג (הסרה רכה)
    remove: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה מדורג' });

        try {
            await softDeleteRatingItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'המדורג הוסר' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהסרה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
