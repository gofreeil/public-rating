// ============================================================
// seo.ts - קבועים ועזרי SEO / שיתוף לדירוג הציבורי
//
// אתר שקיפות אזרחי חי משיתוף ומחיפוש אורגני: כל דף חייב title ייחודי,
// description, canonical, תגי Open Graph ו-JSON-LD מובנה.
// ============================================================

import { env } from '$env/dynamic/public';

export const SITE_NAME = 'דירוג ציבורי';
/** ניתן לעקוף ב-PUBLIC_SITE_URL (סביבת בדיקות/סטייג'ינג) */
export const SITE_URL = (env.PUBLIC_SITE_URL || 'https://rating.gofreeil.com').replace(/\/$/, '');
export const SITE_TAGLINE = 'הציבור מדרג את משרתיו';
export const DEFAULT_OG_IMAGE = '/images/public-rating.jpeg';
export const DEFAULT_DESCRIPTION =
    'דירוג ציבורי — שקיפות, אחריות ודירוג אמיתי של חברי כנסת, שופטים ועובדי ציבור על ידי העם. ' +
    'חמישה מדדים: זמנים ותקנים, תרומה לעם, ראיית המציאות, ניתוח לגופו של עניין ושקיפות.';

/** כתובת מוחלטת לנתיב יחסי (canonical / og:image חייבים להיות מוחלטים) */
export function absUrl(path: string): string {
    if (!path) return SITE_URL;
    if (/^https?:\/\//i.test(path)) return path;
    return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
}

/**
 * JSON-LD בטוח להטמעה בתוך <script>: `<` ו-`&` מנוטרלים כדי שתוכן משתמש
 * (שם מדורג, טקסט ביקורת) לא יוכל לסגור את התגית ולהזריק סקריפט.
 */
export function jsonLdScript(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

/** קיצור טקסט לתיאור מטא (גוגל חותך סביב 160 תווים) */
export function metaTrim(text: string, max = 155): string {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).replace(/[\s,.;:־-]+$/, '') + '…';
}
