// Country Club Equestrian — Service Worker
// Network-first strategy: always fetch fresh updates, fall back to cache when offline
const CACHE_NAME = 'cce-cache-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first (fresh updates always win), cache fallback when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests from our own origin (skip Supabase API calls)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Save a fresh copy in the cache
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // Offline: serve from cache, or fall back to index.html for navigation
        caches.match(event.request).then(
          (cached) => cached || caches.match('./index.html')
        )
      )
  );
});
