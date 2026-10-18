// ============================================================
// adminNav.ts — מקור אמת יחיד למסכי פאנל הניהול ולהרשאות שלהם
// (אותו מבנה כמו בגמ"ח הארצי). שני צרכנים: סרגל הניווט של /admin,
// ופאנל הניהול הפרוס באזור האישי (/my-ratings#admin) — כדי שרשימת
// המסכים והגבלות התפקיד לא יתפצלו לשני מקומות.
// ============================================================

// מוגדר כאן ולא מיובא מ-$lib/server — הקובץ הזה נטען גם בדפדפן
export type AdminNavRole = 'super_admin' | 'admin';

export interface AdminNavItem {
    href: string;
    icon: string;
    /** תווית קצרה — לסרגל הניווט האופקי */
    label: string;
    /** כותרת מלאה — לאריח בפאנל הפרוס */
    title: string;
    /** משפט הסבר — לאריח בפאנל הפרוס */
    desc: string;
    /** האם הקישור פעיל רק בהתאמה מדויקת (ולא גם למסלולי-בן) */
    exact: boolean;
    /** מסך של סופר-אדמין בלבד — מסומן ★ באריח */
    superOnly?: boolean;
}

/** המסכים שהמשתמש רשאי לראות, לפי תפקיד */
export function adminNav(role: AdminNavRole | null): AdminNavItem[] {
    if (!role) return [];
    const isSuper = role === 'super_admin';

    return [
        {
            href: '/admin/officials', icon: '🗳️', label: 'מדורגים', exact: false,
            title: 'ניהול מדורגים',
            desc: 'אישור הצעות, עריכה וסנכרון הכנסת',
        },
        {
            href: '/admin/proposals', icon: '📜', label: 'הצעות', exact: false,
            title: 'הצעות אזרחיות',
            desc: 'אישור, סטטוס וקישור מדורגים',
        },
        {
            href: '/admin/reports', icon: '🚩', label: 'דיווחים', exact: false,
            title: 'דיווחי תוכן',
            desc: 'תור טיפול בדיווחים על תוכן',
        },
        {
            href: '/admin/ads', icon: '📢', label: 'ניהול פרסומות', exact: false,
            title: 'ניהול פרסומות',
            desc: 'אישור מודעות, לוח תפוסה ונתוני מפרסמים',
        },
        ...(isSuper
            ? [
                  {
                      href: '/admin/users', icon: '👥', label: 'משתמשים', exact: false, superOnly: true,
                      title: 'משתמשים',
                      desc: 'חיפוש, פרופיל, חסימה ותפקידים',
                  },
                  {
                      href: '/admin/admins', icon: '🔑', label: 'ניהול אדמינים', exact: false, superOnly: true,
                      title: 'ניהול אדמינים',
                      desc: 'מינוי והסרה של אדמינים וסופר-אדמינים',
                  },
                  {
                      href: '/admin/stats', icon: '📈', label: 'סטטיסטיקה', exact: false, superOnly: true,
                      title: 'סטטיסטיקה',
                      desc: 'נרשמים, דירוגים ומצב השרת',
                  },
              ]
            : []),
    ];
}
