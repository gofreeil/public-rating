// ============================================================
// adTrack.ts - מדידת פרסומות בצד לקוח.
//
// חשיפות נצברות ונשלחות במנה אחת; קליקים, צפיות בדף נחיתה ופניות
// נשלחים מיד ב-sendBeacon (ששורד ניווט) עם נפילה ל-fetch keepalive.
//
// כל כשל שקט: מדידה שנכשלת לא אמורה להיות מורגשת למשתמש.
//
// חשוב לדעת על המספרים: אין כאן זיהוי מבקר, ולכן הם אינדיקטיביים —
// טובים למגמה ולהשוואה בין מודעות, לא לחיוב כספי.
// ============================================================

import { browser } from '$app/environment';

export type AdMetric = 'impressions' | 'clicks' | 'landing' | 'leads';

const ENDPOINT = '/api/ads/track';
/** ארוך יותר ממחזור הסבב בטור (14ש') כדי שסיבוב לא ייצר בקשה בכל מחזור */
const BATCH_MS = 20_000;
const MAX_BATCH = 25;

interface AdEvent {
    id: string;
    metric: AdMetric;
}

/** חשיפה נספרת פעם אחת לכל מודעה בביקור */
const seenThisVisit = new Set<string>();
let queue: AdEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let listenersBound = false;

function send(events: AdEvent[]): void {
    if (!events.length) return;
    const body = JSON.stringify({ events: events.slice(0, MAX_BATCH) });
    try {
        if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
            return;
        }
    } catch {
        /* נופלים ל-fetch */
    }
    fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).catch(() => {
        /* שקט */
    });
}

function flush(): void {
    if (timer) {
        clearTimeout(timer);
        timer = undefined;
    }
    if (!queue.length) return;
    const batch = queue;
    queue = [];
    send(batch);
}

function bindLeaveListeners(): void {
    if (listenersBound || !browser) return;
    listenersBound = true;
    // pagehide לבדו אינו אמין במעבר אפליקציה בנייד — visibilitychange משלים
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
}

function enqueue(event: AdEvent): void {
    if (!browser) return;
    bindLeaveListeners();
    queue.push(event);
    if (queue.length >= MAX_BATCH) {
        flush();
        return;
    }
    if (!timer) timer = setTimeout(flush, BATCH_MS);
}

/** מודעה נכנסה לתצוגה — נספרת פעם אחת לביקור */
export function markAdSeen(id: string): void {
    if (!browser || !id || seenThisVisit.has(id)) return;
    seenThisVisit.add(id);
    enqueue({ id, metric: 'impressions' });
}

/** אירועים חד-פעמיים נשלחים מיד — הקליק מנווט מהדף */
export function trackAdEvent(id: string, metric: AdMetric): void {
    if (!browser || !id) return;
    bindLeaveListeners();
    send([{ id, metric }]);
}

export const trackAdClick = (id: string) => trackAdEvent(id, 'clicks');
export const trackAdLanding = (id: string) => trackAdEvent(id, 'landing');
export const trackAdLead = (id: string) => trackAdEvent(id, 'leads');
