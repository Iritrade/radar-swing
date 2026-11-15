const V="radar-v2",F=["./","index.html","core.js","worker.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(V).then(c=>Promise.allSettled(F.map(u=>c.add(u))))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>{const q=e.request;
  if(q.method!=="GET"||new URL(q.url).origin!==location.origin)return;
  e.respondWith((async()=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),4000);
    try{const r=await fetch(q,{signal:ac.signal});clearTimeout(t);
      if(r.ok){const c=r.clone();e.waitUntil(caches.open(V).then(x=>x.put(q,c)))}
      else{const m=await caches.match(q);if(m)return m}
      return r}
    catch(_){clearTimeout(t);return(await caches.match(q))||Response.error()}})())});
