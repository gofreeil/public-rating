// ============================================================
// push.ts - Web Push client helpers
// ============================================================

// המפתח הציבורי נטען מהשרת בעת ה-subscribe (ראה subscribeToPush)
let _vapidPublicKey = '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** רשום service worker ובקש הרשאת push */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // טען מפתח VAPID ציבורי מהשרת אם עדיין לא נטען
    if (!_vapidPublicKey) {
        const res = await fetch('/api/push/vapid-public-key');
        const data = await res.json() as { key: string };
        _vapidPublicKey = data.key;
    }

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    return reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(_vapidPublicKey).buffer as ArrayBuffer,
    });
}

/** בטל מנוי */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    return sub.unsubscribe();
}

/** שלח את המנוי לשרת */
export async function saveSubscription(sub: PushSubscription, userId?: string): Promise<boolean> {
    const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: sub.toJSON(), userId }),
    });
    return res.ok;
}

/** מחק מנוי מהשרת */
export async function deleteSubscription(sub: PushSubscription): Promise<boolean> {
    const res = await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
    });
    return res.ok;
}
