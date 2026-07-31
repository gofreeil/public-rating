// ============================================================
// /admin/reports - תור טיפול בדיווחי תוכן (סופר-אדמין בלבד)
// הסרת התוכן המדווח או סימון הדיווח כטופל; הדיווח נשמר לתיעוד.
// ============================================================

import { fail, redirect } from '@sveltejs/kit';
import { requireSuperAdmin } from '$lib/server/auth';
import { listReports, markReportHandled, softDeleteRatingItem } from '$lib/server/rating';
import type { ContentReport } from '$lib/rating/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') redirect(303, '/');

    let reports: ContentReport[] = [];
    try {
        reports = await listReports();
    } catch (e) {
        console.warn('[admin/reports] listReports failed:', e);
    }

    // ממתינים ראשונים, ובתוך כל קבוצה — חדש למעלה
    reports.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return a.created_at < b.created_at ? 1 : -1;
    });

    return { reports };
};

export const actions: Actions = {
    // הסרת התוכן המדווח + סגירת הדיווח
    remove_content: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const reportId = String(fd.get('report_id') ?? '');
        const targetId = String(fd.get('target_id') ?? '');
        if (!reportId || !targetId) return fail(400, { error: 'חסרים מזהים' });

        try {
            await softDeleteRatingItem(targetId, session?.user?.id ?? 'admin');
            await markReportHandled(reportId);
            return { success: true, message: 'התוכן הוסר והדיווח נסגר' };
        } catch (e) {
            return fail(500, { error: `שגיאה בהסרה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הדיווח נבדק ונדחה — התוכן נשאר
    dismiss: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const fd = await event.request.formData();
        const reportId = String(fd.get('report_id') ?? '');
        if (!reportId) return fail(400, { error: 'חסר מזהה דיווח' });

        try {
            await markReportHandled(reportId);
            return { success: true, message: 'הדיווח סומן כטופל — התוכן נשאר' };
        } catch (e) {
            return fail(500, { error: `שגיאה בסימון: ${e instanceof Error ? e.message : e}` });
        }
    },
};
