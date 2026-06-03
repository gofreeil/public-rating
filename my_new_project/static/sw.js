// ============================================================
// Service Worker - Web Push Notifications
// ============================================================

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'קהילה בשכונה', body: event.data.text() };
    }

    const title = data.title ?? 'קהילה בשכונה';
    const options = {
        body:    data.body   ?? '',
        icon:    data.icon   ?? '/images/logos/לוגו2.png',
        badge:   data.badge  ?? '/images/logos/לוגו2.png',
        tag:     data.tag    ?? 'kahal-notification',
        data:    { url: data.url ?? '/' },
        dir:     'rtl',
        lang:    'he',
        vibrate: [200, 100, 200],
        actions: data.actions ?? [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
