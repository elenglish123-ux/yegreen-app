// 앱 서비스워커: 항상 최신 내용을 먼저 받고, 안 되면 저장본을 보여 줌
const CACHE = 'yegreen-app-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'app.css', 'app.js', 'manifest.json', 'logo-mark.svg', 'icon-192.png', 'icon-512.png'])));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// 서버에서 온 알림 표시 (내용: {"title", "body", "url"})
self.addEventListener('push', (e) => {
  const msg = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(msg.title || '예그린교회', {
    body: msg.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: msg.url || './' },
  }));
});

// 알림을 누르면 해당 화면 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.openWindow(url));
});
