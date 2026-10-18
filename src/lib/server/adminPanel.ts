// ============================================================
// adminPanel.ts — המונים של פאנל הניהול (כמו בגמ"ח הארצי)
//
// pending = מה שממתין לטיפול אדמין: פרסומות לאישור, הצעות מדורגים,
// הצעות אזרחיות ודיווחי תוכן. הסכום מוצג כבועה אדומה על תמונת
// הפרופיל בהאדר, על אריחי הפאנל ובסרגל הניווט של /admin — כולם
// מאותו מקור, כדי שתמיד יראו את אותו מספר.
//
// קאש קצר ברמת התהליך: ה-layout קורא לזה בכל ניווט של אדמין, ושליפת
// המדורגים הממתינים אינה בקאש של rating.ts.
// ============================================================

import { countPending as countPendingAds, listApproved } from './ads';
import {
    listAllReviews,
    listOfficials,
    listPendingOfficials,
    listPendingProposals,
    listReports,
} from './rating';

export interface AdminPending {
    ads: number;
    officials: number;
    proposals: number;
    reports: number;
    total: number;
}

const EMPTY: AdminPending = { ads: 0, officials: 0, proposals: 0, reports: 0, total: 0 };
const TTL_MS = 30_000;
let pendingCache: { at: number; data: AdminPending } | null = null;

/** מאפס את המונים — אחרי פעולת אישור/דחייה, כדי שהבועה תתעדכן מיד */
export function invalidateAdminCounts(): void {
    pendingCache = null;
}

/**
 * עוטף actions של מסך ניהול כך שכל פעולה (גם כושלת או זורקת redirect)
 * מאפסת את המונים — הבועות מתעדכנות כבר בטעינה שאחרי הפעולה.
 */
export function resettingCounts<T extends Record<string, (event: never) => unknown>>(actions: T): T {
    const out: Record<string, (event: never) => Promise<unknown>> = {};
    for (const [name, fn] of Object.entries(actions)) {
        out[name] = async (event) => {
            try {
                return await fn(event);
            } finally {
                invalidateAdminCounts();
            }
        };
    }
    return out as T;
}

export async function getAdminPending(): Promise<AdminPending> {
    if (pendingCache && Date.now() - pendingCache.at < TTL_MS) return pendingCache.data;
    const [ads, officials, proposals, reports] = await Promise.all([
        countPendingAds().catch(() => 0),
        listPendingOfficials().then((l) => l.length).catch(() => 0),
        listPendingProposals().then((l) => l.length).catch(() => 0),
        listReports().then((l) => l.filter((r) => r.status === 'pending').length).catch(() => 0),
    ]);
    const data = { ads, officials, proposals, reports, total: ads + officials + proposals + reports };
    pendingCache = { at: Date.now(), data };
    return data;
}

export function emptyPending(): AdminPending {
    return { ...EMPTY };
}

export interface AdminOverview {
    officials: number;
    reviews: number;
    liveAds: number;
}

/** מוני הלוח (באנר עליון בפאנל) — כולם מקאשים קיימים של rating/ads */
export async function getAdminOverview(): Promise<AdminOverview> {
    const [officials, reviews, liveAds] = await Promise.all([
        listOfficials().then((l) => l.length).catch(() => 0),
        listAllReviews().then((l) => l.length).catch(() => 0),
        listApproved().then((l) => l.length).catch(() => 0),
    ]);
    return { officials, reviews, liveAds };
}
