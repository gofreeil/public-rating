// ============================================================
// adImage.ts - טיפול בתמונות בבילדר (צד לקוח בלבד).
//
// תמונות נשמרות כ-data URI בתוך שורת המודעה, ולכן חייבות להיות קטנות:
// Strapi חוסם בקשה מעל 1MB, ומודעה שעברה את הגבול נכשלת בשליחה עם
// שגיאה גנרית. לכן כל תמונה עוברת דחיסה מחדש בקנבס לפני השליחה, ולא
// רק בדיקה של הגודל המקורי.
// ============================================================

/** תקרה לתמונה בודדת אחרי דחיסה */
export const MAX_IMAGE_BYTES = 220 * 1024;

export function dataUrlBytes(dataUrl: string): number {
    const idx = dataUrl.indexOf('base64,');
    if (idx < 0) return 0;
    return Math.floor(((dataUrl.length - idx - 7) * 3) / 4);
}

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('הקובץ אינו תמונה תקינה'));
        img.src = src;
    });
}

/**
 * דוחס קובץ תמונה ל-JPEG שמתחת לתקרה.
 * מקטין מימדים ואיכות לסירוגין — הקטנת איכות בלבד לא מספיקה לתמונות
 * גדולות מהטלפון, והקטנת מימדים בלבד פוגעת בחדות ללא צורך.
 */
export async function compressImage(
    file: File,
    maxBytes = MAX_IMAGE_BYTES,
    maxDimension = 1000,
): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('יש לבחור קובץ תמונה');
    // SVG אינו נתמך בכוונה — הוא פורמט שמכיל קוד, ואין בו צורך בכרטיס
    if (file.type === 'image/svg+xml') throw new Error('פורמט SVG אינו נתמך — בחרו PNG או JPG');

    const original = await readAsDataUrl(file);
    const img = await loadImage(original);

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('הדפדפן אינו תומך בעיבוד תמונה');

    for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const quality = Math.max(0.4, 0.85 - attempt * 0.07);
        const out = canvas.toDataURL('image/jpeg', quality);
        if (dataUrlBytes(out) <= maxBytes) return out;

        // כל שני ניסיונות גם מקטינים מימדים
        if (attempt % 2 === 1) {
            width = Math.round(width * 0.8);
            height = Math.round(height * 0.8);
        }
    }

    throw new Error('התמונה גדולה מדי גם אחרי דחיסה — נסו תמונה קטנה יותר');
}

export function fmtKb(bytes: number): string {
    return `${Math.round(bytes / 1024)}KB`;
}
