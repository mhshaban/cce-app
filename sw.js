const CCE_CACHE = 'cce-app-v4-2026-07-07';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CCE_CACHE).then(cache => cache.addAll(CORE_ASSETS).catch(() => null))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CCE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for HTML and Supabase/API data so users get fresh data.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        if (url.origin === location.origin) caches.open(CCE_CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (url.origin === location.origin) caches.open(CCE_CACHE).then(cache => cache.put(req, res.clone()));
      return res;
    }))
  );
});
