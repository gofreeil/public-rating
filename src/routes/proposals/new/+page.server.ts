// ============================================================
// הגשת הצעה אזרחית — משתמשים מחוברים; נכנסת כממתינה לאישור אדמין
// ============================================================

import { fail, redirect } from '@sveltejs/kit';
import { createProposal } from '$lib/server/rating';
import { TOO_FAST, TOO_MANY, allowAction, botCheck } from '$lib/server/rateLimit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}
    if (!session?.user) {
        redirect(303, `/login?redirect=${encodeURIComponent('/proposals/new')}`);
    }
    return {};
};

/** שורות טקסט → מערך נימוקים (עד 10, כל אחד עד 300 תווים) */
function parseLines(raw: string): string[] {
    return raw
        .split('\n')
        .map((s) => s.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 10);
}

export const actions: Actions = {
    default: async (event) => {
        const fd = await event.request.formData();
        const title = String(fd.get('title') ?? '').trim().slice(0, 120);
        const text = String(fd.get('text') ?? '').trim().slice(0, 5000);
        const prosRaw = String(fd.get('pros') ?? '');
        const consRaw = String(fd.get('cons') ?? '');
        const anonymous = Boolean(fd.get('anonymous'));

        const values = { title, text, pros: prosRaw, cons: consRaw, anonymous };

        let session = null;
        try {
            session = await event.locals.auth();
        } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי להציע', values });
        if (!allowAction(event, 'propose', session.user.id)) {
            return fail(429, { error: TOO_MANY, values });
        }

        const bot = botCheck(fd);
        // מלכודת: מדווחים "הצלחה" לבוט בלי ליצור הצעה
        if (bot.trap) return { success: true };
        if (bot.tooFast) return fail(400, { error: TOO_FAST, values });

        if (title.length < 5) return fail(400, { error: 'כותרת קצרה מדי (לפחות 5 תווים)', values });
        if (text.length < 30) {
            return fail(400, { error: 'פרטו את ההצעה — לפחות 30 תווים, שהציבור יבין במה מדובר', values });
        }

        try {
            await createProposal({
                title,
                text,
                pros: parseLines(prosRaw),
                cons: parseLines(consRaw),
                userId: session.user.id,
                proposerName: session.user.name ?? 'אזרח/ית',
                anonymous,
            });
        } catch (e) {
            console.error('[proposals] createProposal failed:', e);
            return fail(500, { error: 'שגיאה בשליחת ההצעה — נסו שוב בעוד רגע', values });
        }

        return { success: true };
    },
};
