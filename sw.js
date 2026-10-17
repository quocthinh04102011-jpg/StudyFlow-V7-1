const CACHE_NAME='studyflow-v7-cache-1';const CORE=['./','./index.html','./manifest.json','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('studyflow-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok){let cp=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,cp))}return r}).catch(()=>caches.match('./index.html'))))});
