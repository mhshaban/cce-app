// CCE service worker - pass-through hard fix for iOS subfolder PWAs
// Version: 8-ios-subfolder-hardfix-20260709
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
// Intentionally do not intercept fetch/navigation requests.
// This prevents old cached app-shell logic from forcing /cce-app/ for /book/, /stable/, /instructor/.
