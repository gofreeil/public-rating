// ============================================================
// time.ts - עיצוב תאריכים לתצוגה
//
// היה משוכפל בשלושה מקומות (ReviewCard, דף הבית, פאנל האמון) עם שלוש
// התנהגויות שונות. באתר שבו הטענות מתייחסות לאנשי ציבור בשמם, התאריך
// המדויק של הטענה הוא מידע — ולכן לצד "לפני 3 ימים" חייב להישמר גם
// התאריך המלא, ב-<time datetime> שקורא מסך וזחלן יכולים לקרוא.
// ============================================================

/** תאריך מלא בעברית: "3 באוגוסט 2026, 14:05" */
export function absDate(iso: string): string {
    const t = new Date(iso);
    if (!Number.isFinite(t.getTime())) return '';
    return t.toLocaleString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** תאריך בלבד, לשימוש ב-datetime של <time> */
export function isoDate(iso: string): string {
    const t = new Date(iso);
    return Number.isFinite(t.getTime()) ? t.toISOString() : '';
}

/**
 * "לפני 3 ימים".
 * `now` ניתן להזרקה כדי שאפשר יהיה לחשב מול אותה נקודת זמן בשרת ובלקוח
 * במקום לקרוא ל-Date.now() בתוך הרינדור.
 */
export function relDate(iso: string, now: number = Date.now()): string {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';

    const mins = Math.floor((now - t) / 60_000);
    if (mins < 1) return 'עכשיו';
    if (mins < 60) return `לפני ${mins} דק׳`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'אתמול';
    if (days < 30) return `לפני ${days} ימים`;

    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'לפני חודש' : `לפני ${months} חודשים`;

    const years = Math.floor(months / 12);
    return years === 1 ? 'לפני שנה' : `לפני ${years} שנים`;
}
