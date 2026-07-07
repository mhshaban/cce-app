/* Country Club Equestrian Service Worker — fixed safe version */
const CCE_CACHE = 'cce-app-v5-fix-2026-07-07';
const CORE_ASSETS = [
  './index.html',
  './manifest.json'
];

async function safeCacheCore(){
  const cache = await caches.open(CCE_CACHE);
  await Promise.allSettled(CORE_ASSETS.map(async (url)=>{
    try{
      const res = await fetch(new Request(url,{cache:'reload'}));
      if(res && res.ok) await cache.put(url,res.clone());
    }catch(_){/* ignore offline / missing optional files */}
  }));
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(safeCacheCore());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CCE_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(!event.data) return;
  if(event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if(event.data.type === 'CLEAR_CCE_CACHE') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }
});

function isHttpRequest(req){
  return req && req.url && (req.url.startsWith('http://') || req.url.startsWith('https://'));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET' || !isHttpRequest(req)) return;

  const url = new URL(req.url);

  // Supabase/API requests should never be served from cache.
  if(url.hostname.includes('supabase.co')){
    event.respondWith(fetch(req));
    return;
  }

  // Navigation / HTML: network first, then cached index fallback.
  if(req.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith((async()=>{
      try{
        const res = await fetch(req);
        if(res && res.ok && url.origin === self.location.origin){
          const cache = await caches.open(CCE_CACHE);
          await cache.put('./index.html',res.clone());
        }
        return res;
      }catch(_){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if(url.origin === self.location.origin){
    event.respondWith((async()=>{
      const cache = await caches.open(CCE_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then(res=>{
        if(res && res.ok) cache.put(req,res.clone());
        return res;
      }).catch(()=>null);
      return cached || await network || Response.error();
    })());
  }
});
