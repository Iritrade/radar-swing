const V="radar-v2",F=["./","index.html","core.js","worker.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>{self.skipWaiting();
  e.waitUntil(caches.open(V).then(c=>c.addAll(F.map(u=>new Request(u,{cache:"reload"})))))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Cache d'abord (démarrage instantané, même sur réseau faible), puis mise à jour en arrière-plan.
// L'API Binance (autre origine) n'est jamais interceptée ni stockée.
self.addEventListener("fetch",e=>{const q=e.request;
  if(q.method!=="GET"||new URL(q.url).origin!==location.origin)return;
  e.respondWith(caches.open(V).then(async c=>{
    const hit=await c.match(q,{ignoreSearch:true});
    const net=fetch(q.url,{cache:"no-cache"}).then(r=>{if(r.ok&&r.type==="basic")c.put(q,r.clone());return r}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return(await net)||new Response("Hors ligne",{status:503})}))});
