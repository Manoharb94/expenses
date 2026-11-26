/* Gharwise service worker: opens the app instantly from the phone's own copy,
   then quietly checks for a newer version. Never touches login or data requests. */
var CACHE="gharwise-v5",OCRC="gharwise-ocr-v1";
/* JS files are listed by tools/build.py (each carries a fingerprint, so old and new never mix) */
var JSF=["js/hi.js?v=b8abe60d","js/core.js?v=83c4c5bc","js/i18n.js?v=aa0aab33","js/auth.js?v=9fcd3cc7","js/gmail.js?v=21243d5e","js/statements.js?v=aa6ad96d","js/data.js?v=ac28be8e","js/charts.js?v=c7a57d5c","js/budget.js?v=22b345fc","js/forecast.js?v=f7ec5c48","js/blocks.js?v=61d7508c","js/reports-plan.js?v=ea9029d7","js/ui.js?v=31d83946","js/home.js?v=0527c249","js/menu.js?v=f578ccd9","js/family.js?v=ff1a9de7","js/tracking.js?v=829b64e8","js/account.js?v=367d1040","js/render.js?v=43a534a1","js/starter.js?v=5ee25d24","js/scan-bill.js?v=f7c0c275","js/edit.js?v=afc43f4b","js/loans.js?v=d9a64fc5","js/tour.js?v=f40576c7","js/groups-core.js?v=21c0d9e4","js/profile.js?v=6a8a6fff","js/groups-ui.js?v=cb3e6adf","js/bind.js?v=5de6bda0","js/native.js?v=bf96e25f","js/local-sms.js?v=2876d5fa","js/local.js?v=7bb23046","js/local-sync.js?v=d2a587c1","js/local-groups.js?v=6c381bd5","js/local-selftest.js?v=1133c063","js/main.js?v=9bcf7583"/*JS*/];
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
