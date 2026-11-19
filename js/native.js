/* Native extras for the Gharwise phone apps: app lock, reminders, voice quick-add widget feed.
   Everything here stays hidden in the browser and in older app versions that lack the native part. */
function gwNative(){try{if(!nativeApp()||!window.Capacitor)return null;var P=Capacitor.Plugins&&Capacitor.Plugins.GharwiseNative;if(P)return P;return Capacitor.registerPlugin?Capacitor.registerPlugin("GharwiseNative"):null}catch(e){return null}}
var GWN={ok:undefined,bio:false,busy:false,t:0};
function gwT(s,v){return typeof T==="function"?T(s,v):s}
async function gwProbe(){
  if(GWN.ok!==undefined)return GWN.ok;
  var P=gwNative();if(!P){GWN.ok=false;return false}
  try{var r=await P.lockStatus();GWN.ok=true;GWN.bio=!!(r&&r.available)}catch(e){GWN.ok=false}
  if(S.tab==="set"&&typeof render==="function")render();
  return GWN.ok}

/* ---------- app lock (off until the person turns it on in Settings) ---------- */
function lkOn(){return nativeApp()&&ls("gwlock")==="1"}
function lkCover(msg,btn){
  var d=document.getElementById("gwlk");
  if(!d){d=document.createElement("div");d.id="gwlk";d.setAttribute("style","position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:linear-gradient(135deg,#6d28d9,#3b1a7a);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:700 28px system-ui,-apple-system,sans-serif");document.documentElement.appendChild(d)}
  d.innerHTML='<div>Gharwise</div><div style="font:500 15px system-ui,-apple-system,sans-serif;opacity:.85;margin-top:8px">'+gwT(msg)+'</div>'+(btn?'<button id="gwlkb" style="margin-top:22px;padding:13px 26px;border:0;border-radius:14px;background:#fff;color:#4c1d95;font:700 16px system-ui,-apple-system,sans-serif">'+gwT("Unlock")+'</button>':'');
  var b=document.getElementById("gwlkb");if(b)b.onclick=lkTry}
function lkOpen(){var d=document.getElementById("gwlk");if(d)d.remove();window.__gwLocked=0;GWN.t=Date.now()}
async function lkTry(){
  if(GWN.busy)return;GWN.busy=true;
  try{var P=gwNative();var r=await P.unlock({title:gwT("Unlock Gharwise")});
    if(r&&r.ok)lkOpen();
    else if(r&&(r.unavailable||[11,12,14].indexOf(r.code)>=0)){ls("gwlock","0");lkOpen();toast(gwT("App lock was turned off: this phone has no fingerprint, face or passcode set up"))}
    else lkCover("Locked",true)}
  catch(e){lkOpen()}   /* never lock the person out if the native part is missing */
  GWN.busy=false;GWN.t=Date.now()}
document.addEventListener("visibilitychange",function(){
  if(!lkOn()||GWN.busy)return;
  if(document.hidden){GWN.t=Date.now();lkCover("Locked",false)}
  else if(Date.now()-GWN.t>30000||window.__gwLocked){lkCover("Locked",true);lkTry()}
  else lkOpen()});
if(window.__gwLocked){setTimeout(function(){lkCover("Locked",true);lkTry()},250)}
document.addEventListener("change",async function(e){
  var t=e.target;if(!t||t.id!=="lkt")return;var P=gwNative();if(!P)return;GWN.busy=true;
  try{
    if(t.checked){var st=await P.lockStatus();
      if(!st||!st.available){t.checked=false;toast(gwT("Set up a fingerprint, face or phone passcode on this phone first"))}
      else{var r=await P.unlock({title:gwT("Turn on app lock")});if(r&&r.ok){ls("gwlock","1");toast(gwT("App lock is on"))}else t.checked=false}}
    else{var r2=await P.unlock({title:gwT("Turn off app lock")});if(r2&&r2.ok){ls("gwlock","0");toast(gwT("App lock is off"))}else t.checked=true}
  }catch(er){t.checked=!t.checked;toast(gwT("Please update the Gharwise app to use this"))}
  GWN.busy=false;GWN.t=Date.now()});

/* ---------- reminders you choose (both off until switched on) ---------- */
function wkOn(){return ls("wkon")==="1"}
function baOn(){return ls("baon")==="1"}
function budgetHot(){
  var key=monthKey(0),sp={};
  txIn(key).forEach(function(t){if(t.type==="out"&&isCount(t)&&t.category)sp[t.category]=(sp[t.category]||0)+Number(t.amount)});
  return (S.budgets||[]).filter(function(b){return Number(b.amount)>0}).map(function(b){return{c:b.category,a:Number(b.amount),s:sp[b.category]||0}})
    .filter(function(x){return x.s/x.a>=0.8}).sort(function(a,b){return b.s/b.a-a.s/a.a})}
async function schedInsights(){
  var P=lnPlugin();if(!P)return;
  try{
    await P.cancel({notifications:[{id:9501},{id:9502}]});
    if(!(wkOn()||baOn()))return;
    if(!(await remPermit(false)))return;
    var list=[],now=new Date();
    if(wkOn()){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),19,0,0);d.setDate(d.getDate()+((7-d.getDay())%7));if(d<=now)d.setDate(d.getDate()+7);
      list.push({id:9501,title:gwT("Your week in Gharwise"),body:gwT("See where this week’s money went and how your budgets are doing."),schedule:{at:d,allowWhileIdle:true}})}
    if(baOn()){var hot=budgetHot();if(hot.length){var h=hot[0],pct=Math.round(h.s/h.a*100),t=new Date(now.getFullYear(),now.getMonth(),now.getDate(),9,0,0);if(t<=now)t.setDate(t.getDate()+1);
      list.push({id:9502,title:pct>=100?gwT("{c} budget is over",{c:gwT(h.c)}):gwT("{c} budget is {p}% used",{c:gwT(h.c),p:pct}),body:gwT("{s} of {a} spent this month",{s:money(h.s),a:money(h.a)}),schedule:{at:t,allowWhileIdle:true}})}}
    if(list.length)await P.schedule({notifications:list})}catch(e){}}
document.addEventListener("change",async function(e){
  var t=e.target;if(!t||(t.id!=="wkt"&&t.id!=="bat"))return;
  if(t.checked){var dg=remDiag();if(!dg.app||!dg.plugin){t.checked=false;toast(gwT("Please update the Gharwise app to use reminders"));return}
    if(!(await remPermit(true))){t.checked=false;toast(remMsg());return}}
  ls(t.id==="wkt"?"wkon":"baon",t.checked?"1":"0");schedInsights();
  toast(t.checked?gwT("Reminder on"):gwT("Reminder off"))});

/* ---------- widget: key, balance and language handed to the native widget ---------- */
function widgetLeft(){
  var L=S.txns.filter(inRange),Lc=L.filter(isCount),pdt=periodDates(),X=expenseSplit(Lc,pdt.from,pdt.to),F=flowCalc(L,Lc,X);
  return F.rec-X.total}
async function pushWidget(){
  var P=gwNative();if(!P||!(await gwProbe()))return;
  try{if(!S.sc)await loadSc();var key=S.sc&&S.sc.key;if(!key)return;
    if(S.range!=="month")preset("month");
    var left=widgetLeft(),d=new Date();
    await P.setWidget({key:key,url:URLB+"rpc/",apikey:KEY,title:gwT("Left this month"),big:money(Math.round(left)),
      small:gwT("Updated {t}",{t:d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}),left:Math.round(left),lang:(typeof LANG!=="undefined"?LANG:"en")})}
  catch(e){}}
function nativeAfterLoad(){try{gwProbe();pushWidget();schedInsights()}catch(e){}}

/* ---------- Settings cards ---------- */
function nativeCard(){
  if(!nativeApp())return "";
  if(GWN.ok===undefined){gwProbe();return ""}
  var ios=false;try{ios=Capacitor.getPlatform()==="ios"}catch(e){}
  var row=function(i,b,s,id,on){return '<div class="dc trk"><i style="background:rgba(60,130,255,.20)">'+i+'</i><div class="m"><b>'+gwT(b)+'</b><span>'+gwT(s)+'</span></div><label class="tgl"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+'><span></span></label></div>'};
  var h='<div class="card">'+sxHead('🔒','App lock and reminders','Saved on this phone')+'<div class="note" style="margin:0 0 8px">'+gwT("Everything here is off until you switch it on.")+'</div>';
  if(GWN.ok)h+=row("🔒",ios?"Lock with Face ID":"Lock with fingerprint or face","Ask for it every time you open Gharwise","lkt",lkOn());
  else h+='<div class="note">'+gwT("Update the Gharwise app to use app lock.")+'</div>';
  if(lnPlugin()){h+=row("📅","Weekly summary","Sunday 7 pm: see where the week’s money went","wkt",wkOn());
    h+=row("⚠️","Budget alerts","9 am when a budget is 80% used or more","bat",baOn())}
  h+='</div>';
  h+='<div class="card">'+sxHead('🎤','Add an expense by voice','Say it, it is saved')+'<div class="note" style="margin:0">'+(ios
    ?gwT("Say “Hey Siri, add expense in Gharwise”, then speak, for example “Grocery 120”. You can also set Back Tap or the Action Button to run it: Settings → Accessibility → Touch → Back Tap.")
    :gwT("Press and hold an empty spot on your home screen, choose Widgets, then Gharwise. Tap the microphone on the widget and say, for example, “Grocery 120”."))+'</div></div>';
  return h}
