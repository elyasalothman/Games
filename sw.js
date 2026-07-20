const CACHE = 'lumaa-v11';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/socket.io')
  ) return;

  // Network-first for HTML and versioned CSS/JS so updates always show
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');
  const isAppShell = url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('sw.js');

  if (isHtml || isAppShell) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE)
            .then((cache) => cache.put(e.request, clone))
            .catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
