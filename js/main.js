
applyLook();preset("month");boot();
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
  navigator.serviceWorker.addEventListener("message",function(e){if(e.data&&e.data.t==="update"&&!document.getElementById("updbar")){
    var b=document.createElement("div");b.id="updbar";b.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:60;background:#1f1f23;color:#fff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,.3);font-size:14px";
    b.innerHTML='<span>A new version is ready</span><button style="border:0;border-radius:10px;padding:8px 14px;font-weight:600;background:#8b5cf6;color:#fff">Update</button>';
    b.querySelector("button").onclick=function(){location.reload()};document.body.appendChild(b)}})}
