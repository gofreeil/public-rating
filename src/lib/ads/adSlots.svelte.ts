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
    | { kind: 'real'; ad: ApprovedAdPublic }
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
                cta:         a.cta || a.title,
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
 * סדר התצוגה: המודעות האמיתיות תופסות את המשבצות הראשונות, והשאר
 * נשארות פנויות. מספור המשבצת הפנויה ממשיך מהמודעות שכבר תפוסות.
 */
export function adSlots(): AdSlot[] {
    const real: AdSlot[] = approved
        .slice(0, AD_SLOTS.length)
        .map((ad) => ({ kind: 'real' as const, ad }));
    const vacant: AdSlot[] = AD_SLOTS.slice(real.length).map((slot, i) => ({
        kind: 'vacant' as const,
        slot,
        no: real.length + i + 1,
    }));
    return [...real, ...vacant];
}

/** כמה מודעות אמיתיות נטענו — לשימוש בתצוגות שמתנהגות אחרת כשאין */
export function approvedCount(): number {
    return approved.length;
}
