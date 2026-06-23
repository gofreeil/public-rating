// ============================================================
// POST /api/missing-neighborhood
//
// משתמש שלא מצא את השכונה שלו ברשימה - שולח דרך הטופס
// בעמוד הפרופיל. שולח מייל לסופר אדמין + מנסה לשמור ב-Strapi.
// ============================================================

import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { strapiPost } from '$lib/server/strapiClient';
import type { RequestHandler } from './$types';

const SUPER_ADMIN_EMAIL = 'yahavanter@gmail.com';

interface Payload {
    city: string;
    suggested_neighborhood: string;
    username?: string;
    email?: string;
}

function buildEmailHtml(p: Payload): string {
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0; padding:0; background:#070b14; font-family:'Segoe UI',Arial,sans-serif; direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070b14; padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a; border-radius:20px; border:1px solid #1e2a3a; overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d1b69,#4a1942); padding:32px; text-align:center;">
          <div style="font-size:42px; margin-bottom:8px;">📍</div>
          <h1 style="margin:0; color:#fff; font-size:22px; font-weight:900;">בקשת שכונה חדשה</h1>
          <p style="margin:8px 0 0; color:#a5b4fc; font-size:14px;">משתמש לא מצא את השכונה שלו</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628; border:1px solid #1e2a3a; border-radius:12px;">
            <tr><td style="padding:14px 18px; border-bottom:1px solid #1e2a3a;">
              <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">עיר</p>
              <p style="margin:0; color:#f59e0b; font-size:18px; font-weight:800;">${escapeHtml(p.city)}</p>
            </td></tr>
            <tr><td style="padding:14px 18px; border-bottom:1px solid #1e2a3a;">
              <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">שכונה מבוקשת</p>
              <p style="margin:0; color:#22c55e; font-size:18px; font-weight:800;">${escapeHtml(p.suggested_neighborhood)}</p>
            </td></tr>
            ${p.username ? `<tr><td style="padding:14px 18px; border-bottom:1px solid #1e2a3a;">
              <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">משתמש</p>
              <p style="margin:0; color:#e2e8f0; font-size:15px;">${escapeHtml(p.username)}</p>
            </td></tr>` : ''}
            ${p.email ? `<tr><td style="padding:14px 18px;">
              <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">אימייל</p>
              <p style="margin:0; color:#e2e8f0; font-size:15px;"><a href="mailto:${escapeHtml(p.email)}" style="color:#60a5fa; text-decoration:none;">${escapeHtml(p.email)}</a></p>
            </td></tr>` : ''}
          </table>
          <p style="margin:24px 0 0; color:#94a3b8; font-size:13px; line-height:1.7;">
            הוסף את השכונה ל-<code style="background:#1e293b; padding:2px 6px; border-radius:4px; color:#f59e0b;">src/lib/neighborhoodsData.ts</code>
            כדי שתופיע ברשימה לכל המשתמשים.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    let payload: Payload;
    try {
        payload = await request.json();
    } catch {
        return json({ error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const city = String(payload.city || '').trim();
    const suggested = String(payload.suggested_neighborhood || '').trim();
    if (!city || !suggested) {
        return json({ error: 'יש למלא עיר ושם שכונה' }, { status: 400 });
    }
    if (suggested.length > 100 || city.length > 100) {
        return json({ error: 'שם ארוך מדי' }, { status: 400 });
    }

    const clean: Payload = {
        city,
        suggested_neighborhood: suggested,
        username: String(payload.username || '').trim().slice(0, 100),
        email:    String(payload.email    || '').trim().slice(0, 200),
    };

    // 1. שמירה ב-Strapi (best-effort; ייכשל בשקט אם הקולקשן לא קיים)
    try {
        const jwt = cookies.get('strapi_jwt') ?? undefined;
        await strapiPost('/api/missing-neighborhoods', {
            data: {
                city:                   clean.city,
                suggested_neighborhood: clean.suggested_neighborhood,
                username:               clean.username,
                user_email:             clean.email,
                status:                 'pending',
            },
        }, jwt);
    } catch (e) {
        console.warn('[missing-neighborhood] strapi save failed (collection may not exist yet):',
            e instanceof Error ? e.message : e);
    }

    // 2. מייל לסופר אדמין
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        console.warn('[missing-neighborhood] RESEND_API_KEY missing — saving request but not sending email');
        return json({ ok: true, warning: 'saved (no email service configured)' });
    }

    try {
        const resend = new Resend(resendKey);
        const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const { error } = await resend.emails.send({
            from:    `קהילה בשכונה <${fromEmail}>`,
            to:      [SUPER_ADMIN_EMAIL],
            replyTo: clean.email || undefined,
            subject: `📍 בקשת שכונה חדשה: ${clean.suggested_neighborhood} (${clean.city})`,
            html:    buildEmailHtml(clean),
        });
        if (error) {
            console.error('[missing-neighborhood] resend error:', error);
            return json({ error: 'שגיאה בשליחת המייל' }, { status: 500 });
        }
    } catch (e) {
        console.error('[missing-neighborhood] unexpected:', e);
        return json({ error: 'שגיאה לא צפויה' }, { status: 500 });
    }

    return json({ ok: true });
};
