// ============================================================
// adSlots.svelte.ts - מיזוג המודעות המאושרות עם המשבצות הפנויות.
//
// המודעות נטענות בצד לקוח מ-/api/ads/approved ולא דרך ה-layout, כדי
// שהפרסומות יהיו שכבה עצמאית: כשל בטעינתן לא נוגע בשאר האתר, והטור
// פשוט נשאר עם משבצות פנויות.
// ============================================================

import { browser } from '$app/environment';
import { AD_SLOTS, type AdSlotStyle } from './slots';
import { gradientCss } from './gradients';
import { registerPaidAds } from '$lib/adPopupStore';
import type { ApprovedAdPublic } from './types';

export type AdSlot =
    | { kind: 'real'; ad: ApprovedAdPublic; no: number }
    | { kind: 'vacant'; slot: AdSlotStyle; no: number };

let approved = $state<ApprovedAdPublic[]>([]);
let loadStarted = false;

/** טעינה חד-פעמית. בטוח לקרוא מכמה קומפוננטות. */
export function loadApprovedAds(): void {
    if (!browser || loadStarted) return;
    loadStarted = true;
    fetch('/api/ads/approved')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (Array.isArray(data?.ads)) {
                approved = data.ads;
                registerToPopup(approved);
            }
        })
        .catch(() => {
            /* כשל שקט — המשבצות נשארות פנויות */
        });
}

/**
 * המודעות המשולמות נכנסות גם לחפיסת הפופ-אפ בנייד - שם הן העיקר,
 * ופרסומות הרשת משובצות בדילול (ראו adPopupStore).
 */
function registerToPopup(list: ApprovedAdPublic[]): void {
    registerPaidAds(
        list
            .filter((a) => a.mainImage)
            .map((a) => ({
                id:          a.id,
                title:       a.title,
                description: a.subtitle,
                // כרטיס מוצר מהחנות - בלי כפתור המחיר (התמונה היא הקישור)
                cta:         a.shop ? '' : a.cta || a.title,
                href:        `/ads/${a.id}`,
                internal:    true,
                image:       a.mainImage,
                color:       '',
                colorCss:    gradientCss(a.gradientId),
                hover:       a.hoverText,
            })),
    );
}

/**
 * לוח המקומות בסדר מספרי: מקום שנתפס מציג את המודעה, מקום פנוי מציג
 * משבצת "מקום פרסום". המספר מגיע מהשרת (נקבע במסך הניהול), כך שמושהית/
 * פגה משאירה את המשבצת שלה פנויה עד שתחזור, וכרטיס מוצר מהחנות יושב
 * במקום שהסנכרון קבע לו. מודעה בלי מספר (קאש ישן) ממלאת את הפנוי הנמוך.
 */
export function adSlots(): AdSlot[] {
    const count = AD_SLOTS.length;
    const taken = new Set<number>();
    for (const a of approved) {
        if (typeof a.slot === 'number' && a.slot >= 1) taken.add(a.slot);
    }
    let nextFree = 1;
    const byNum = new Map<number, ApprovedAdPublic>();
    const overflow: AdSlot[] = [];
    for (const a of approved) {
        let num = typeof a.slot === 'number' && a.slot >= 1 ? a.slot : 0;
        // בלי מספר, או בהתנגשות נדירה — המספר הפנוי הנמוך ביותר
        if (num === 0 || byNum.has(num)) {
            while (taken.has(nextFree)) nextFree++;
            num = nextFree;
            taken.add(num);
        }
        if (num <= count) byNum.set(num, a);
        else overflow.push({ kind: 'real', ad: a, no: num });
    }
    // שכפל פרסומת: אותה מודעה גם במקומות הנוספים שלה (למשל 2 ו-6 —
    // נשארת באותה משבצת בכל הסבב). מקום ראשי של אחרת גובר.
    for (const a of approved) {
        for (const n of a.extraSlots ?? []) {
            if (n >= 1 && n <= count && !byNum.has(n)) byNum.set(n, a);
        }
    }
    const cells: AdSlot[] = AD_SLOTS.map((slot, i) => {
        const ad = byNum.get(i + 1);
        return ad
            ? { kind: 'real' as const, ad, no: i + 1 }
            : { kind: 'vacant' as const, slot, no: i + 1 };
    });
    // מעבר ללוח (גלישה) — בסוף, כדי שמודעה לא תיעלם
    return [...cells, ...overflow];
}

/** כמה מודעות אמיתיות נטענו — לשימוש בתצוגות שמתנהגות אחרת כשאין */
export function approvedCount(): number {
    return approved.length;
}
