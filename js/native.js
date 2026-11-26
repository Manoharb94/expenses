/* Native extras for the Gharwise phone apps: app lock, reminders, voice quick-add widget feed.
   Everything here stays hidden in the browser and in older app versions that lack the native part. */
function gwNative(){try{if(!nativeApp()||!window.Capacitor)return null;var P=Capacitor.Plugins&&Capacitor.Plugins.GharwiseNative;if(P)return P;return Capacitor.registerPlugin?Capacitor.registerPlugin("GharwiseNative"):null}catch(e){return null}}
var GWN={ok:undefined,bio:false,busy:false,t:0};
function gwT(s,v){return typeof T==="function"?T(s,v):s}
async function gwProbe(){
  if(GWN.ok!==undefined)return GWN.ok;
  var P=gwNative();if(!P){GWN.ok=false;GWN.err="no-plugin";return false}
  try{var r=await P.lockStatus();GWN.ok=true;GWN.bio=!!(r&&r.available)}catch(e){GWN.ok=false;GWN.err=String(e&&(e.message||e.code||e)).slice(0,80)}
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
function wkDay(){var d=parseInt(ls("wkday"),10);return d>=0&&d<=6?d:0}            /* 0 = Sunday */
function wkTime(){return /^\d\d:\d\d$/.test(ls("wktime")||"")?ls("wktime"):"19:00"}
function baPct(){var p=parseInt(ls("bapct"),10);return p>=10&&p<=100?p:80}
function baTime(){return /^\d\d:\d\d$/.test(ls("batime")||"")?ls("batime"):"09:00"}
function hm(t){var a=t.split(":");return[parseInt(a[0],10)||0,parseInt(a[1],10)||0]}
function budgetHot(){
  var key=monthKey(0),sp={};
  txIn(key).forEach(function(t){if(t.type==="out"&&isCount(t)&&t.category)sp[t.category]=(sp[t.category]||0)+Number(t.amount)});
  return (S.budgets||[]).filter(function(b){return Number(b.amount)>0}).map(function(b){return{c:b.category,a:Number(b.amount),s:sp[b.category]||0}})
    .filter(function(x){return x.s/x.a>=baPct()/100}).sort(function(a,b){return b.s/b.a-a.s/a.a})}
async function schedInsights(){
  var P=lnPlugin();if(!P)return;
  try{
    await P.cancel({notifications:[{id:9501},{id:9502}]});
    if(!(wkOn()||baOn()))return;
    if(!(await remPermit(false)))return;
    var list=[],now=new Date();
    if(wkOn()){var w=hm(wkTime()),d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),w[0],w[1],0);d.setDate(d.getDate()+((wkDay()-d.getDay()+7)%7));if(d<=now)d.setDate(d.getDate()+7);
      list.push({id:9501,title:gwT("Your week in Gharwise"),body:gwT("See where this week’s money went and how your budgets are doing."),schedule:{at:d,allowWhileIdle:true}})}
    if(baOn()){var hot=budgetHot();if(hot.length){var h=hot[0],pct=Math.round(h.s/h.a*100),bt=hm(baTime()),t=new Date(now.getFullYear(),now.getMonth(),now.getDate(),bt[0],bt[1],0);if(t<=now)t.setDate(t.getDate()+1);
      list.push({id:9502,title:pct>=100?gwT("{c} budget is over",{c:gwT(h.c)}):gwT("{c} budget is {p}% used",{c:gwT(h.c),p:pct}),body:gwT("{s} of {a} spent this month",{s:money(h.s),a:money(h.a)}),schedule:{at:t,allowWhileIdle:true}})}}
    if(list.length)await P.schedule({notifications:list})}catch(e){}}
document.addEventListener("change",async function(e){
  var t=e.target;if(!t||(t.id!=="wkt"&&t.id!=="bat"))return;
  if(t.checked){var dg=remDiag();if(!dg.app||!dg.plugin){t.checked=false;toast(gwT("Please update the Gharwise app to use reminders"));return}
    if(!(await remPermit(true))){t.checked=false;toast(remMsg());return}}
  ls(t.id==="wkt"?"wkon":"baon",t.checked?"1":"0");schedInsights();
  toast(t.checked?gwT("Reminder on"):gwT("Reminder off"));if(S.tab==="set")render()});

document.addEventListener("change",function(e){
  var t=e.target;if(!t)return;var m={wkd:"wkday",wkh:"wktime",bap:"bapct",bah:"batime"}[t.id];if(!m)return;
  if(!t.value)return;ls(m,t.value);schedInsights();toast(gwT("Saved"))});

/* ---------- widget: key, balance and language handed to the native widget ---------- */
function widgetLeft(){
  var L=S.txns.filter(inRange),Lc=L.filter(isCount),pdt=periodDates(),X=expenseSplit(Lc,pdt.from,pdt.to),F=flowCalc(L,Lc,X);
  return F.rec-X.total}
async function pushWidget(){   /* the widget only needs who you are; it never shows your money */
  var P=gwNative();if(!P||!(await gwProbe()))return;
  try{if(!S.sc)await loadSc();var key=S.sc&&S.sc.key;if(!key)return;
    await P.setWidget({key:key,url:(window.GWL&&GWL.on)?"local:":URLB+"rpc/",apikey:KEY,lang:(typeof LANG!=="undefined"?LANG:"en")})}
  catch(e){}}
function nativeAfterLoad(){try{gwProbe();pushWidget();schedInsights();ndInit();ndiListen();ndiSched()}catch(e){}}

/* ---------- iPhone: reminder when payments are still uncategorised (planned from the app each time it is opened) ---------- */
function ndiOn(){return ls("ndion")!=="0"}
function ndiIos(){try{return nativeApp()&&Capacitor.getPlatform()==="ios"&&!!lnPlugin()}catch(e){return false}}
function ndiMake(){
  var u=(S.txns||[]).filter(function(t){return !t.category&&t.type==="out"&&canEditT(t)});if(!u.length)return null;
  var now=new Date(),m0=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10),mc=u.filter(function(t){return (t.txn_date||"")>=m0}).length;
  var top=u.slice().sort(function(a,b){return (b.amount||0)-(a.amount||0)})[0],o=[];
  if(mc>1)o.push(gwT("This month {n} payments are uncategorised",{n:mc}));
  if(u.length>1)o.push(gwT("{n} payments are waiting for a category",{n:u.length}));
  if(top&&top.amount>0)o.push(gwT("Your biggest uncategorised payment: {a}",{a:money(top.amount)}));
  if(!o.length)o.push(gwT("A payment is waiting for a category"));
  return o}
async function ndiSched(force){
  var P=lnPlugin();if(!P||!ndiIos())return;
  try{
    if(!ndiOn()||!S.loaded){await P.cancel({notifications:[{id:9511},{id:9512},{id:9513}]});return}
    var o=ndiMake();
    if(!o){await P.cancel({notifications:[{id:9511},{id:9512},{id:9513}]});return}
    /* the reminder is on by default, so ask for permission once, the first time a payment is waiting for a category */
    var okp=await remPermit(false);
    if(!okp&&!ls("ndiask")){ls("ndiask","1");okp=await remPermit(true)}
    if(!okp)return;
    /* keep reminders that are already planned: planning again on every app open pushed them back and they never arrived */
    if(!force){try{var pend=await P.getPending(),mine=((pend&&pend.notifications)||[]).filter(function(n){return n.id>=9511&&n.id<=9513});if(mine.length>=2)return}catch(e){}}
    await P.cancel({notifications:[{id:9511},{id:9512},{id:9513}]});
    var list=[],d=new Date(),r=function(a,b){return a+Math.floor(Math.random()*(b-a+1))},day=r(1,2);
    for(var i=0;i<3;i++){
      var at=new Date(d.getFullYear(),d.getMonth(),d.getDate()+day,r(18,20),r(0,59),0);
      list.push({id:9511+i,title:"Gharwise",body:o[(i+r(0,o.length-1))%o.length]+". "+gwT("Tap to sort them."),schedule:{at:at,allowWhileIdle:true},extra:{nd:1}});
      day+=r(2,3)}
    await P.schedule({notifications:list})}catch(e){}}
function ndiListen(){if(S._ndil)return;var P=lnPlugin();if(!P||!P.addListener)return;S._ndil=1;
  try{P.addListener("localNotificationActionPerformed",function(a){var n=a&&a.notification;if(n&&n.id>=9511&&n.id<=9513)ndOpen()})}catch(e){}}
async function ndiTest(){
  var P=lnPlugin();if(!P)return;
  if(!(await remPermit(true))){toast(remMsg());return}
  var o=ndiMake();if(!o){toast(gwT("Everything is categorised, so no reminder would be sent"));return}
  await P.schedule({notifications:[{id:9519,title:"Gharwise",body:o[0]+". "+gwT("Tap to sort them."),schedule:{at:new Date(Date.now()+8000)},extra:{nd:1}}]});
  toast(gwT("Reminder in a few seconds. Leave the app now."))}
document.addEventListener("change",async function(e){
  var t=e.target;if(!t||t.id!=="ndit")return;
  if(t.checked){if(!(await remPermit(true))){t.checked=false;toast(remMsg());return}}
  ls("ndion",t.checked?"1":"0");ndiSched(true);toast(t.checked?gwT("Reminder on"):gwT("Reminder off"));if(S.tab==="set")render()});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("#nditest");if(b)ndiTest()});

/* ---------- Android: evening reminder when payments are still uncategorised ---------- */
function ndPlugin(){try{if(!nativeApp()||Capacitor.getPlatform()!=="android")return null;var P=smsPlugin();return P&&P.nudgeStatus?P:null}catch(e){return null}}
function ndInit(){var P=ndPlugin();if(!P)return;
  if(!S._ndl){S._ndl=1;P.nudgeStatus().then(function(r){S.nd=r;if(S.tab==="set")render()}).catch(function(){})}
  if(P.takeNudgeTap)P.takeNudgeTap().then(function(r){if(r&&r.tap)ndOpen()}).catch(function(){})}
function ndOpen(){try{go("home");setTimeout(catFlow,300)}catch(e){}}
document.addEventListener("DOMContentLoaded",function(){try{ndiListen()}catch(e){}});
window.gwNudgeOpen=function(){var P=ndPlugin();if(P&&P.takeNudgeTap)P.takeNudgeTap().then(function(){ndOpen()}).catch(function(){ndOpen()})};
document.addEventListener("click",async function(e){
  var b=e.target&&e.target.closest&&e.target.closest("#ndtest");if(!b)return;var P=ndPlugin();if(!P||!P.testNudge)return;
  try{var r=await P.testNudge();toast(r&&r.result==="Sent"?gwT("Reminder sent. Check your notifications."):gwT((r&&r.result)||"Could not send"))}catch(x){toast(gwT("Could not send"))}});
document.addEventListener("change",async function(e){
  var t=e.target;if(!t||t.id!=="ndt")return;var P=ndPlugin();if(!P)return;
  try{S.nd=await P.setNudge({on:!!t.checked});
    if(t.checked&&S.nd&&!S.nd.allowed)toast(gwT("Allow notifications for Gharwise in your phone settings"))}catch(x){}
  render()});

/* ---------- Settings cards ---------- */
function nativeCard(){
  if(!nativeApp())return "";
  if(GWN.ok===undefined){gwProbe();return ""}
  var ios=false;try{ios=Capacitor.getPlatform()==="ios"}catch(e){}
  var row=function(i,b,s,id,on){return '<div class="dc trk"><i style="background:rgba(60,130,255,.20)">'+i+'</i><div class="m"><b>'+gwT(b)+'</b><span>'+gwT(s)+'</span></div><label class="tgl"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+'><span></span></label></div>'};
  var h='<div class="msec">'+gwT("Security and reminders")+'</div><div class="card"><div class="note" style="margin:0 0 8px">'+gwT("All off until you switch them on.")+'</div>';
  if(GWN.ok)h+=row("🔒",ios?"Lock with Face ID":"Lock with fingerprint or face","Ask for it every time you open Gharwise","lkt",lkOn());
  else h+='<div class="note">'+gwT("Update the Gharwise app to use app lock.")+(GWN.err?" ["+esc(GWN.err)+"]":"")+'</div>';
  if(lnPlugin()){
    var dn=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],opt=function(v,t,sel){return '<option value="'+v+'"'+(sel?' selected':'')+'>'+gwT(t)+'</option>'};
    h+=row("📅","Weekly summary","Pick the day and time to see where the week’s money went","wkt",wkOn());
    if(wkOn())h+='<div class="ropt"><label><span>'+gwT("Day")+'</span><select id="wkd">'+dn.map(function(n,k){return opt(k,n,k===wkDay())}).join('')+'</select></label><label><span>'+gwT("Time")+'</span><input type="time" id="wkh" value="'+wkTime()+'"></label></div>';
    h+=row("⚠️","Budget alerts","Get a reminder when a budget has used up the percentage you choose","bat",baOn());
    if(baOn())h+='<div class="ropt"><label><span>'+gwT("When used")+'</span><select id="bap">'+[50,60,70,75,80,90,100].map(function(p){return '<option value="'+p+'"'+(p===baPct()?' selected':'')+'>'+p+'%</option>'}).join('')+'</select></label><label><span>'+gwT("Time")+'</span><input type="time" id="bah" value="'+baTime()+'"></label></div>'}
  if(ndiIos()){h+=row("🔔","Remind me to categorise","A reminder every couple of days in the evening, only when payments are waiting","ndit",ndiOn());}
  if(ndPlugin()&&S.nd)h+=row("🔔","Remind me to categorise","An evening nudge every day or two, only when payments are waiting","ndt",!!S.nd.on&&!!S.nd.allowed);
  h+='</div>';
  h+='<div class="card">'+sxHead('🎤','Add an expense by voice','Say it, it is saved')+'<div class="note" style="margin:0">'+(ios
    ?'<p class="vi">'+gwT("Double-tap the back of your iPhone and say “Grocery 120”. It is saved.")+'</p>'+(scAdded()
      ?'<div class="sxh" style="margin:6px 0 10px;background:var(--chip);border-radius:14px;padding:10px"><div class="t">✅</div><div><b>'+gwT("Gharwise SMS shortcut added")+'</b><small>'+gwT("Voice uses the same shortcut")+'</small></div></div><a href="#" data-scx class="note" style="color:var(--acc)">'+gwT("Not added yet? Add it here")+'</a>'
      :'<div class="sxh" style="margin:6px 0 10px;background:var(--chip);border-radius:14px;padding:10px"><div class="t">➕</div><div><b>'+gwT("Add the Gharwise SMS shortcut first")+'</b><small>'+gwT("One shortcut for SMS, import and voice")+'</small></div></div>'+scBtn(gwT("Add the Gharwise SMS shortcut")))+'<div class="vs"><span class="vn">'+(scAdded()?'1':'2')+'</span><div><b>'+gwT("Set the double-tap")+'</b><p>'+gwT("Settings → Accessibility → Touch → Back Tap → Double Tap. Choose Gharwise SMS.")+'</p></div></div><p class="note" style="margin:8px 0 0">'+gwT("You can also say “Hey Siri, Gharwise SMS”.")+'</p>'
    :gwT("Add the Gharwise widget to your home screen. Then tap the microphone on it and say, for example, “Grocery 120”.")+'<button class="btn" id="pinw" style="margin:10px 0 4px">'+gwT("Add widget to home screen")+'</button><div class="note" style="margin:0">'+gwT("If nothing opens: press and hold an empty spot on your home screen, choose Widgets, then Gharwise.")+'</div>')+'</div></div>';
  return h}

/* ---------- Android back button: close a pop-up, then go back to Home, and only then let the app close ---------- */
window.gwBack=function(){
  try{
    var sh=document.getElementById("sheet");if(sh&&sh.querySelector(".sheet")){sh.innerHTML="";return true}
    if(S&&!S.view&&S.code&&S.tab&&S.tab!=="home"){go(S.tab==="grpo"?"grpv":S.tab==="grpv"&&typeof gBack==="function"?gBack():"home");return true}
  }catch(e){}
  return false};

/* Android: the voice widget is "added" once the home screen really has one: tick the setup box by itself */
async function gwWidgetSync(){try{var P=gwNative();if(!P||!P.widgetCount||ls("gs_voice")==="1")return;var r=await P.widgetCount();
  if(r&&r.count>0){ls("gs_voice","1");try{render()}catch(e){}}}catch(e){}}
setTimeout(gwWidgetSync,3000);document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(gwWidgetSync,800)});
document.addEventListener("click",async function(e){
  var b=e.target&&e.target.closest&&e.target.closest("#pinw");if(!b)return;
  var P=gwNative();
  try{var r=P&&P.pinWidget?await P.pinWidget():null;
    if(!r||!r.supported)toast(gwT("Press and hold an empty spot on your home screen, choose Widgets, then Gharwise.")+(r&&r.why?" ("+r.why+")":""));[1500,4000,8000,15000,30000].forEach(function(t){setTimeout(gwWidgetSync,t)})}
  catch(er){toast(gwT("Press and hold an empty spot on your home screen, choose Widgets, then Gharwise."))}});
