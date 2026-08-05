// ============================================================
// adsNotify.ts — התראה על בקשת פרסום חדשה.
//
// לאתר הזה אין תיבת הודעות משלו, אבל הוא יושב על אותו Strapi משותף
// כמו שאר אתרי הרשת — ולכן ההתראה נשלחת לאוסף messages המשותף,
// בדיוק כמו ב-national-gemach / index / purchasing_groups, ונוחתת
// בתיבת ההודעות של האדמין ב"קהילה בשכונה".
//
// נמענים: הסופר-אדמינים *וגם* כל אדמין שמונה (rating_admin) — התראה
// צריכה להגיע לכל מי שמוסמך לאשר את הפרסומת, לא רק לבעלים.
// ============================================================

import { strapiGet, strapiPost } from './strapiClient';

const SITE_NAME = 'דירוג ציבורי';
const ADMIN_ROLES = ['super_admin', 'rating_admin'];

/** מזהי כל האדמינים ב-Strapi המשותף. שגיאה כאן מחזירה [] ולא מפילה כלום. */
async function resolveAdminUserIds(): Promise<number[]> {
    const ids = new Set<number>();
    const notifyEmail = (process.env.ADS_NOTIFY_EMAIL ?? '').trim().toLowerCase();
    if (notifyEmail) {
        try {
            const users = await strapiGet<Array<{ id: number }>>('/api/users', {
                'filters[email][$eq]': notifyEmail,
            });
            if (Array.isArray(users) && users[0]?.id) ids.add(users[0].id);
        } catch {
            /* ממשיכים לרשימת התפקידים */
        }
    }
    try {
        const params: Record<string, string> = { 'pagination[limit]': '100' };
        ADMIN_ROLES.forEach((r, i) => { params[`filters[app_role][$in][${i}]`] = r; });
        const users = await strapiGet<Array<{ id: number }>>('/api/users', params);
        if (Array.isArray(users)) {
            for (const u of users) if (u?.id) ids.add(u.id);
        }
    } catch {
        /* בלי רשימת אדמינים נסתפק במה שכבר נאסף */
    }
    return [...ids];
}

/**
 * התראה על בקשת פרסום חדשה. best-effort במלוא מובן המילה: הקורא עוטף
 * ב-try/catch, וגם כאן כל כשל נבלע — פרסומת לא תיפול בגלל התראה.
 */
export async function notifyAdminsNewAd(info: {
    adTitle: string;
    advertiserName?: string | null;
    advertiserEmail?: string | null;
    durationDays?: number | null;
    payment?: string | null;
}): Promise<void> {
    try {
        const receivers = await resolveAdminUserIds();
        if (receivers.length === 0) {
            console.warn('[ads] no notify recipient resolved — skipping new-ad notification');
            return;
        }
        const who = info.advertiserEmail
            ? `${info.advertiserName || 'ללא שם'} (${info.advertiserEmail})`
            : (info.advertiserName || 'משתמש לא מזוהה');
        const content =
            `📢 בקשת פרסום חדשה — ${SITE_NAME}\n` +
            `פרסומת: "${info.adTitle}"\n` +
            `מי שלח: ${who}\n` +
            (info.durationDays ? `תקופה מבוקשת: ${info.durationDays} ימים\n` : '') +
            `תשלום: ${info.payment === 'owner' ? 'אדמין (ללא חיוב)' : 'ממתין לתשלום'}\n` +
            `המודעה ממתינה לאישור ב-rating.gofreeil.com/admin/ads`;
        await Promise.all(receivers.map(receiver =>
            strapiPost('/api/messages', { data: { receiver, content, read: false } })
        ));
    } catch (err) {
        console.warn('[ads] new-ad notification failed:', err instanceof Error ? err.message : err);
    }
}
