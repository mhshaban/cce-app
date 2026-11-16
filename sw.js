// Country Club Equestrian unified portal service worker
// Version: cce-stableos-20261116-4390
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Network pass-through is intentional. Authentication and current club data
// must not be served from a stale offline cache.
