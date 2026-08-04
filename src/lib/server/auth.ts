// ============================================================
// auth.ts - פונקציות הרשאה
//
// שני תפקידים: rating_admin (אדמין האתר — כל פעולות המודרציה) מעל
// super_admin (מנהל ראשי — גם מינוי אדמינים ומחיקות לצמיתות).
// התפקיד נשמר בשדה role של community-users, שהאתר הזה בלבד קורא.
// ============================================================

import type { Session } from '@auth/core/types';
import { error } from '@sveltejs/kit';

type UserRole = 'user' | 'rating_admin' | 'super_admin';

// בעל האתר — סופר-אדמין תמיד, גם אם הרשומה ב-DB עוד בלי תפקיד
const OWNER_EMAIL = 'yahavanter@gmail.com';

/** האם המשתמש סופר-אדמין */
export function isSuperAdmin(session: Session | null): boolean {
    if (session?.user?.role === 'super_admin') return true;
    return (session?.user?.email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

/** האם למשתמש יש הרשאות אדמין כלשהן (אדמין האתר או מנהל ראשי) */
export function isAdmin(session: Session | null): boolean {
    if (isSuperAdmin(session)) return true;
    const role = session?.user?.role as string | undefined;
    // neighborhood_admin — ערך שנשמר ממינויים ישנים בפאנל הזה (לפני שהתפקיד
    // קיבל שם משלו); ממשיכים לכבד אותו, ועדכון הבא מהפאנל כותב rating_admin.
    return role === 'rating_admin' || role === 'neighborhood_admin';
}

/** דרוש הרשאת אדמין - זורק 403 אם אין */
export function requireAdmin(session: Session | null): void {
    if (!isAdmin(session)) {
        throw error(403, 'אין לך הרשאה לבצע פעולה זו');
    }
}

/** דרוש סופר-אדמין - זורק 403 אם אין */
export function requireSuperAdmin(session: Session | null): void {
    if (!isSuperAdmin(session)) {
        throw error(403, 'נדרשת הרשאת מנהל ראשי');
    }
}

/** קבלת תפקיד בעברית */
export function getRoleLabel(role: UserRole | string | undefined): string {
    switch (role) {
        case 'super_admin':        return 'מנהל ראשי';
        case 'rating_admin':
        case 'neighborhood_admin': return 'אדמין האתר';
        default:                   return 'משתמש';
    }
}
