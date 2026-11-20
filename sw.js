/* Gharwise service worker: opens the app instantly from the phone's own copy,
   then quietly checks for a newer version. Never touches login or data requests. */
var CACHE="gharwise-v5",OCRC="gharwise-ocr-v1";
/* JS files are listed by tools/build.py (each carries a fingerprint, so old and new never mix) */
var JSF=["js/hi.js?v=918d2650","js/core.js?v=ff13e833","js/i18n.js?v=db901cc8","js/auth.js?v=a54343ea","js/gmail.js?v=21243d5e","js/statements.js?v=6ee38e19","js/data.js?v=ac28be8e","js/charts.js?v=e4858469","js/budget.js?v=22b345fc","js/forecast.js?v=f7ec5c48","js/blocks.js?v=b52e5999","js/reports-plan.js?v=b6a7a7a8","js/ui.js?v=0511c428","js/home.js?v=5e27b244","js/menu.js?v=e980ba96","js/family.js?v=4d6de756","js/tracking.js?v=9cc4a766","js/account.js?v=367d1040","js/render.js?v=0ab1d84c","js/starter.js?v=d9f25032","js/scan-bill.js?v=fbf824c8","js/edit.js?v=afc43f4b","js/loans.js?v=d9a64fc5","js/tour.js?v=e9b988aa","js/groups-core.js?v=21c0d9e4","js/profile.js?v=6a8a6fff","js/groups-ui.js?v=f1d78260","js/bind.js?v=5de6bda0","js/native.js?v=86b82f9d","js/main.js?v=eb1bbd4d"/*JS*/];
var SHELL=["app.html","manifest.json","icon-192.png","icon.png","apple-touch-icon.png","favicon-32.png","logo.svg"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(SHELL.concat(JSF).map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE&&k!==OCRC}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
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
  /* bill reader files (about 11 MB, downloaded only the first time someone scans a bill): keep forever */
  if(/\/ocr\/v\d+\//.test(url.pathname)){
    e.respondWith(caches.open(OCRC).then(function(c){return c.match(req).then(function(hit){return hit||fetch(req).then(function(r){if(r&&r.ok)c.put(req,r.clone());return r})})}));return}
  /* the home page (features) is only a front door: always fresh, and offline it falls back to the app itself */
  if(req.mode==="navigate"&&(/\/$/.test(url.pathname)||/index\.html$/.test(url.pathname))){
    e.respondWith(fetch(req).catch(function(){return caches.match(new Request(new URL("app.html",self.registration.scope).href),{ignoreSearch:true}).then(function(h){return h||new Response("Offline",{status:503,headers:{"Content-Type":"text/plain"}})})}));return}
  if(/admin\.html$|privacy\.html$|delete\.html$|get\.html$|features\.html$|sw\.js$/.test(url.pathname)||/^\/get\/?$/.test(url.pathname))return;
  if(req.mode==="navigate"&&/\.html$/.test(url.pathname)&&!/app\.html$/.test(url.pathname))return;
  var isPage=req.mode==="navigate"||/app\.html$/.test(url.pathname);
  var key=isPage?new Request(new URL("app.html",self.registration.scope).href):req;
  var exact=/\/js\/[^/]+\.js$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(key,{ignoreSearch:!exact}).then(function(hit){
      var net=revalidate(req.mode==="navigate"?key:req,c,key,isPage);
      if(hit)return hit;
      return net.then(function(r){return r||new Response("Offline",{status:503,headers:{"Content-Type":"text/plain"}})})})}))});
