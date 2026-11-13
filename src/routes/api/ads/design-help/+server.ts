// ============================================================
// POST /api/ads/design-help — "דורש עזרה - פנה לתמיכה" בסטודיו הפרסומות.
//
// כמו בקהילה בשכונה: הפנייה נוחתת כהודעה אצל האדמינים, עם זהות הפונה
// ותקציר הטיוטה. כאן חובה להיות מחובר (כמו בכל הסטודיו) ויש תקרת קצב,
// כי זו נקודת כתיבה שמפעילה הודעות לצוות.
// ============================================================

import { json } from '@sveltejs/kit';
import { notifyAdminsDesignHelp } from '$lib/server/adsNotify';
import { TOO_MANY, allowAction } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

const MAX_LEN = 2000;

export const POST: RequestHandler = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}

    const userId = session?.user?.id;
    if (!userId) {
        return json({ ok: false, error: 'יש להתחבר כדי לשלוח פנייה' }, { status: 401 });
    }
    if (!allowAction(event, 'adHelp', userId)) {
        return json({ ok: false, error: TOO_MANY }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ ok: false, error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const problem = String(body.problem ?? '').trim().slice(0, MAX_LEN);
    if (problem.length < 5) {
        return json({ ok: false, error: 'אנא תארו את הבעיה (לפחות 5 תווים)' }, { status: 400 });
    }

    const delivered = await notifyAdminsDesignHelp({
        problem,
        contact: String(body.contact ?? '').trim().slice(0, 200),
        draftSummary: String(body.draftSummary ?? '').trim().slice(0, 600),
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        userId,
    });
    if (!delivered) {
        return json({ ok: false, error: 'השליחה נכשלה — נסו שוב בעוד רגע' }, { status: 502 });
    }
    return json({ ok: true });
};
