/* Gharwise service worker: opens the app instantly from the phone's own copy,
   then quietly checks for a newer version. Never touches login or data requests. */
var CACHE="gharwise-v3";
var SHELL=["./","index.html","manifest.json","icon-192.png","icon.png","apple-touch-icon.png","favicon-32.png","logo.svg"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function tell(msg){self.clients.matchAll({type:"window"}).then(function(cs){cs.forEach(function(c){c.postMessage(msg)})})}
function revalidate(req,cache,key,notify){
  return fetch(req,{cache:"no-cache"}).then(function(res){
    if(res&&res.ok&&res.type!=="opaque"){
      var copy=res.clone();
      return cache.match(key,{ignoreSearch:true}).then(function(old){
        if(notify&&old){return Promise.all([old.text(),copy.clone().text()]).then(function(t){if(t[0]!==t[1])tell({t:"update"})})}
      }).catch(function(){}).then(function(){return cache.put(key,copy)}).then(function(){return res})}
    return res}).catch(function(){return null})}
self.addEventListener("fetch",function(e){
  var req=e.request;if(req.method!=="GET")return;
  var url=new URL(req.url);
  /* versioned spreadsheet / PDF readers: keep forever */
  if(/(^|\.)(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(url.hostname)){
    e.respondWith(caches.open(CACHE).then(function(c){return c.match(req).then(function(hit){return hit||fetch(req).then(function(r){if(r&&(r.ok||r.type==="opaque"))c.put(req,r.clone());return r})})}));return}
  if(url.origin!==self.location.origin)return;
  if(/admin\.html$|privacy\.html$|delete\.html$|get\.html$|sw\.js$/.test(url.pathname)||/^\/get\/?$/.test(url.pathname))return;
  if(req.mode==="navigate"&&/\.html$/.test(url.pathname)&&!/index\.html$/.test(url.pathname))return;
  var isPage=req.mode==="navigate"||/(\/|index\.html)$/.test(url.pathname);
  var key=isPage?new Request(new URL("index.html",self.registration.scope).href):req;
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(key,{ignoreSearch:true}).then(function(hit){
      var net=revalidate(req.mode==="navigate"?key:req,c,key,isPage);
      if(hit)return hit;
      return net.then(function(r){return r||new Response("Offline",{status:503,headers:{"Content-Type":"text/plain"}})})})}))});
