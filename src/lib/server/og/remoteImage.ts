// ============================================================
// remoteImage.ts - משיכת תמונת הפנים של מדורג להטמעה בכרטיס השיתוף
//
// התמונות מתארחות בוויקיפדיה / אתר הכנסת, כלומר משיכה מרשת חיצונית בתוך
// נתיב שרת. לכן כל בקשה מוגבלת בזמן, בגודל ובסוג תוכן, והכתובת נבדקת
// לפני היציאה: השדה נקבע אמנם באדמין, אבל נקודת קצה שמושכת URL שרירותי
// היא SSRF בהמתנה — אין שום סיבה שהשרת יפנה לרשת הפנימית שלו.
//
// כל כישלון מחזיר null, והכרטיס נופל לאווטאר ראשי תיבות.
// ============================================================

const TIMEOUT_MS = 4000;
const MAX_BYTES = 4 * 1024 * 1024;

/** resvg מרנדר <image> מהפורמטים האלה בלבד */
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif']);

/** תמונת מדורג משתנה לעיתים רחוקות מאוד */
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 120;
const cache = new Map<string, { at: number; uri: string | null }>();

/** חוסם לולאה חזרה לשרת עצמו ולרשתות פרטיות */
function isPrivateHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true;
    if (h === '::1' || h === '[::1]') return true;

    const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!v4) return false;
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

function cacheGet(url: string): { uri: string | null } | null {
    const hit = cache.get(url);
    if (!hit) return null;
    if (Date.now() - hit.at > TTL_MS) {
        cache.delete(url);
        return null;
    }
    return { uri: hit.uri };
}

function cacheSet(url: string, uri: string | null): void {
    if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(url, { at: Date.now(), uri });
}

/**
 * מחזיר data URI להטמעה ב-SVG, או null כשאי אפשר/לא כדאי.
 * כישלון נשמר בקאש גם הוא — כדי לא לנסות שוב בכל רינדור.
 */
export async function fetchImageDataUri(rawUrl: string): Promise<string | null> {
    const url = (rawUrl ?? '').trim();
    if (!url) return null;

    const cached = cacheGet(url);
    if (cached) return cached.uri;

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        cacheSet(url, null);
        return null;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        cacheSet(url, null);
        return null;
    }
    if (isPrivateHost(parsed.hostname)) {
        cacheSet(url, null);
        return null;
    }

    try {
        const res = await fetch(parsed, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            redirect: 'follow',
            headers: {
                Accept: 'image/png,image/jpeg,image/gif',
                // מדיניות ויקימדיה — מקור התמונות העיקרי — דורשת סוכן מזוהה
                'User-Agent': 'PublicRatingIL/1.0 (+https://rating.gofreeil.com)',
            },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);

        const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (!ALLOWED_TYPES.has(type)) throw new Error(`unsupported type ${type}`);

        // בדיקה מוקדמת לפי הכותרת, ואחריה בדיקה על מה שהתקבל בפועל —
        // Content-Length אינו מחייב את השרת המרוחק
        const declared = Number(res.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error('too large');

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_BYTES) throw new Error('too large');

        const mime = type === 'image/jpg' ? 'image/jpeg' : type;
        const uri = `data:${mime};base64,${buf.toString('base64')}`;
        cacheSet(url, uri);
        return uri;
    } catch (e) {
        console.warn('[og] image fetch failed:', url, e instanceof Error ? e.message : e);
        cacheSet(url, null);
        return null;
    }
}
