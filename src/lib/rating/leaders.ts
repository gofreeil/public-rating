// ============================================================
// leaders.ts - ראשי המפלגות בכנסת
//
// עד שיצטברו דירוגים כל המדורגים שקולים, והלוח נפתח בסדר א-ב — מסך ראשון
// שנראה אקראי. הרשימה כאן קובעת מי עולה לראש הלוח בינתיים: ראשי המפלגות,
// לפי גודל הסיעה. ברגע שיש דירוגים המדורגים עוקפים אותם בסדר הרגיל.
// ============================================================

export interface PartyLeader {
    /** שם כפי שמופיע במצבת הכנסת */
    name: string;
    /** תווית התפקיד המפלגתי (מוצגת על הכרטיס) */
    title: string;
}

/** מסודרים לפי גודל הסיעה — כך ייראה גם ראש הלוח */
export const PARTY_LEADERS: PartyLeader[] = [
    { name: 'בנימין נתניהו', title: 'יו״ר הליכוד' },
    { name: 'יאיר לפיד', title: 'יו״ר יש עתיד' },
    { name: 'אריה דרעי', title: 'יו״ר ש״ס' },
    { name: 'בני גנץ', title: 'יו״ר המחנה הממלכתי' },
    { name: 'בצלאל סמוטריץ׳', title: 'יו״ר הציונות הדתית' },
    { name: 'יצחק גולדקנופף', title: 'יו״ר יהדות התורה' },
    { name: 'משה גפני', title: 'יו״ר דגל התורה' },
    { name: 'איתמר בן גביר', title: 'יו״ר עוצמה יהודית' },
    { name: 'אביגדור ליברמן', title: 'יו״ר ישראל ביתנו' },
    { name: 'גדעון סער', title: 'יו״ר תקווה חדשה' },
    { name: 'מנסור עבאס', title: 'יו״ר רע״ם' },
    { name: 'איימן עודה', title: 'יו״ר חד״ש' },
    { name: 'אחמד טיבי', title: 'יו״ר תע״ל' },
    { name: 'אבי מעוז', title: 'יו״ר נעם' },
];

/** גרש/גרשיים נכתבים בכמה צורות (׳ ״ ' ") — משווים בלעדיהם */
function normalize(name: string): string {
    return (name ?? '')
        .replace(/[׳״'"`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

interface LeaderEntry extends PartyLeader {
    /** מקומו ברשימה — משמש כמפתח מיון */
    order: number;
    words: string[];
}

const ENTRIES: LeaderEntry[] = PARTY_LEADERS.map((l, i) => ({
    ...l,
    order: i,
    words: normalize(l.name).split(' '),
}));

const BY_NAME = new Map(ENTRIES.map((e) => [normalize(e.name), e]));

/**
 * זיהוי ראש מפלגה לפי שם. מצבת הכנסת לפעמים מוסיפה שם אמצעי
 * ("אריה מכלוף דרעי"), ולכן אחרי התאמה מדויקת בודקים גם הכלה של כל המילים.
 */
function findEntry(name: string): LeaderEntry | null {
    const key = normalize(name);
    if (!key) return null;
    const exact = BY_NAME.get(key);
    if (exact) return exact;
    const words = key.split(' ');
    return ENTRIES.find((e) => e.words.every((w) => words.includes(w))) ?? null;
}

export function partyLeaderOf(name: string): PartyLeader | null {
    return findEntry(name);
}

/** מפתח מיון: מקומו ברשימת ראשי המפלגות, ואינסוף לכל השאר */
export function leaderOrder(name: string): number {
    return findEntry(name)?.order ?? Infinity;
}
