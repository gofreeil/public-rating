// ============================================================
// sanitize.ts - חיטוי קלט המפרסם.
//
// כל שדה במודעה נכתב בידי גורם חיצוני, ולכן כל שדה כאן הוא קלט לא-אמין.
// שתי הנקודות המסוכנות באמת:
//
// 1. website — Svelte אינה מחטאת href. כתובת `javascript:...` שנשמרה
//    במודעה ממתינה מתבצעת בדפדפן של הסופר-אדמין ברגע שהוא לוחץ עליה
//    במסך האישור, כלומר עוד לפני שהמודעה אושרה. safeHttpUrl חוסמת כל
//    סכימה שאינה http/https.
// 2. תמונות — כתובת מרוחקת במודעה ממתינה חושפת את ה-IP של האדמין
//    למפרסם, ו-SVG הוא פורמט שאין שום סיבה להתיר. safeDataImage מתירה
//    data:image/png|jpeg|webp בלבד.
//
// כלל העבודה: מחטאים גם בכתיבה וגם ברינדור. שורה שנכתבה לפני שהחיטוי
// נכנס, או שנערכה ידנית באדמין של Strapi, לא תעקוף את הבדיקה.
// ============================================================

import { emptyLanding, type AdLanding, type AdProduct } from './types';

/** גזירת מחרוזת לאורך מרבי, אחרי ניקוי רווחים */
export function clamp(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

/** טקסט רב-שורתי — שומר שורות, גוזר אורך */
export function clampMultiline(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max);
}

/**
 * כתובת אתר בטוחה, או '' — התיקון לליקוי החמור ביותר.
 * נדחות: כל סכימה שאינה http/https (בראשן javascript: ו-data:),
 * וכתובות עם שם משתמש/סיסמה מוטמעים, ששימשו היסטורית להסוואת יעד.
 */
export function safeHttpUrl(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const u = new URL(raw);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
        if (u.username || u.password) return '';
        return u.toString().slice(0, 400);
    } catch {
        return '';
    }
}

/** תמונה מוטבעת בלבד; SVG נדחה במפורש */
export function safeDataImage(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(raw) ? raw : '';
}

/** מספר טלפון — ספרות וסימני הפרדה בלבד */
export function safePhone(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return /^[0-9+\-\s()]{5,25}$/.test(raw) ? raw : '';
}

export function safeEmail(value: unknown): string {
    const raw = String(value ?? '').trim().slice(0, 200);
    if (!raw) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw) ? raw : '';
}

/** גודל מוערך בבייטים של data URI (base64 מנפח ב-4/3) */
export function dataUriBytes(value: unknown): number {
    const raw = String(value ?? '');
    const idx = raw.indexOf('base64,');
    if (idx < 0) return 0;
    return Math.floor(((raw.length - idx - 7) * 3) / 4);
}

function normalizeProduct(raw: unknown, index: number): AdProduct {
    const p = (raw ?? {}) as Record<string, unknown>;
    return {
        id: Number.isFinite(Number(p.id)) ? Number(p.id) : index + 1,
        name: clamp(p.name, 60),
        price: clamp(p.price, 20),
        image: safeDataImage(p.image),
        description: clamp(p.description, 200),
    };
}

/** מקסימום מוצרים בדף נחיתה — תקרה על משקל השורה */
export const MAX_PRODUCTS = 3;

/**
 * מבטיח שכל מפתח קיים ושכל ערך חוטא. כל קורא — שרת, דף נחיתה, מסך
 * אדמין — יכול להניח את הצורה המלאה בלי בדיקות משלו.
 */
export function normalizeLanding(raw: unknown): AdLanding {
    const l = (raw ?? {}) as Record<string, unknown>;
    const adv = Array.isArray(l.advantages) ? l.advantages : [];

    return {
        ...emptyLanding(),
        headline: clamp(l.headline, 60),
        pitch: clampMultiline(l.pitch, 400),
        extended: clampMultiline(l.extended, 2000),
        image: safeDataImage(l.image),
        advantages: [clamp(adv[0], 80), clamp(adv[1], 80), clamp(adv[2], 80)],
        uniqueness: clampMultiline(l.uniqueness, 500),
        phone: safePhone(l.phone),
        whatsapp: safePhone(l.whatsapp),
        website: safeHttpUrl(l.website),
        email: safeEmail(l.email),
        address: clamp(l.address, 120),
        hours: clamp(l.hours, 120),
        products: (Array.isArray(l.products) ? l.products : [])
            .slice(0, MAX_PRODUCTS)
            .map(normalizeProduct),
    };
}

/** סך כל התמונות המוטבעות בשורה — לבדיקת התקרה ולתצוגה באדמין */
export function landingBytes(landing: AdLanding): number {
    return (
        dataUriBytes(landing.image) +
        landing.products.reduce((sum, p) => sum + dataUriBytes(p.image), 0)
    );
}
