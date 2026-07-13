// ============================================================
// heSearch.ts - חיפוש עברי סלחני (קליינט + שרת)
// התאמה לפי מילים בכל סדר, אותיות סופיות מנורמלות, בלי ניקוד
// ============================================================

const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export function heNormalize(s: string): string {
    return (s || '')
        .toLowerCase()
        .replace(/[֑-ׇ]/g, '')                 // ניקוד וטעמים
        .replace(/[ךםןףץ]/g, (ch) => FINALS[ch] ?? ch)  // אותיות סופיות
        .replace(/["'`”“׳״.,\-–—()]/g, ' ')             // פיסוק → רווח
        .replace(/\s+/g, ' ')
        .trim();
}

/** האם כל מילות החיפוש מופיעות (כתת-מחרוזות, בכל סדר) בטקסט */
export function heMatches(query: string, ...fields: (string | null | undefined)[]): boolean {
    const q = heNormalize(query);
    if (!q) return true;
    const hay = heNormalize(fields.filter(Boolean).join(' '));
    return q.split(' ').every((word) => hay.includes(word));
}
