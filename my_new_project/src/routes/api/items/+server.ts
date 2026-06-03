import { json } from '@sveltejs/kit';
import { createItem, getAllItems } from '$lib/server/db';
import { categoryConfig, getCategoryIcon, getCategoryColor } from '$lib/categoryFields';
import { Resend } from 'resend';
import type { RequestHandler } from './$types';

// ---- GET: list all active items ----
export const GET: RequestHandler = async () => {
    const items = await getAllItems();
    return json(items);
};

// ---- POST: create a new item ----
export const POST: RequestHandler = async (event) => {
    // קבל את פרטי המשתמש המחובר (אופציונלי - guard נעשה בדף הטופס)
    const session = await event.locals.auth();

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const { category, label, extra_fields, neighborhood, city, ...rest } = body as {
        category: string;
        label: string;
        extra_fields?: Record<string, unknown>;
        neighborhood?: string;
        city?: string;
        description?: string;
        contact?: string;
        phone?: string;
        address?: string;
    };

    if (!category || !label) {
        return json({ success: false, message: 'חסרים שדות חובה' }, { status: 400 });
    }

    if (!categoryConfig[category]) {
        return json({ success: false, message: 'קטגוריה לא תקינה' }, { status: 400 });
    }

    const icon  = getCategoryIcon(category);
    const color = getCategoryColor(category);

    const item = await createItem({
        category,
        label: String(label),
        description: String(rest.description ?? ''),
        contact:     String(rest.contact ?? ''),
        phone:       String(rest.phone ?? ''),
        address:     String(rest.address ?? ''),
        icon,
        color,
        neighborhood: String(neighborhood ?? ''),
        city:         String(city ?? ''),
        extra_fields: (extra_fields ?? {}) as Record<string, unknown>,
        user_id:     session?.user?.id ?? undefined,
    });

    // ---- שלח מייל לאדמין ----
    try {
        const resend  = new Resend(process.env.RESEND_API_KEY);
        const fromAddr = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const catLabel = categoryConfig[category]?.label ?? category;
        const extraStr = Object.entries(extra_fields ?? {})
            .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#94a3b8;font-size:13px;">${k}</td><td style="padding:4px 8px;color:#e2e8f0;font-size:13px;">${v}</td></tr>`)
            .join('');

        await resend.emails.send({
            from: `קהילה בשכונה <${fromAddr}>`,
            to:   ['ads@shchuna.co.il'],
            subject: `🆕 פריט חדש נוסף: ${label} (${catLabel})`,
            html: `<!DOCTYPE html><html dir="rtl"><body style="font-family:Arial,sans-serif;background:#070b14;color:#e2e8f0;padding:24px;">
              <h2 style="color:#f59e0b;">📌 פריט חדש נוסף לאתר</h2>
              <table style="border-collapse:collapse;width:100%;max-width:600px;background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
                <tr><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">שדה</td><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">ערך</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">מזהה</td><td style="padding:8px 16px;">${item.id}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">קטגוריה</td><td style="padding:8px 16px;">${icon} ${catLabel}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">כותרת</td><td style="padding:8px 16px;font-weight:700;">${label}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">שכונה</td><td style="padding:8px 16px;">${neighborhood ?? ''}, ${city ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">כתובת</td><td style="padding:8px 16px;">${rest.address ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">טלפון</td><td style="padding:8px 16px;">${rest.phone ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">איש קשר</td><td style="padding:8px 16px;">${rest.contact ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">תיאור</td><td style="padding:8px 16px;">${rest.description ?? ''}</td></tr>
                ${extraStr}
              </table>
              <p style="color:#64748b;font-size:12px;margin-top:16px;">הפריט כבר פעיל באתר. ניתן להסיר מה-Admin אם נדרש.</p>
            </body></html>`,
        });
    } catch (e) {
        // מייל לאדמין הוא best-effort - לא נכשיל את הבקשה
        console.warn('Admin email failed:', e);
    }

    return json({ success: true, id: item.id });
};
