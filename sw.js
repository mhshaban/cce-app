// Country Club Equestrian unified portal service worker
// Version: unified-member-portal-20260712-410
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Network pass-through is intentional. Authentication and current club data
// must not be served from a stale offline cache.
