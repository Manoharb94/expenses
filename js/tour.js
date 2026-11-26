function endTour(){var e=document.getElementById("tour");if(e)e.remove();ls("tour6","1");ls("tournew","");ls("tourjoin","")}
function tourSteps(){if(!ls("tourjoin"))return TOUR;var a=TOUR.slice();a[0]={tab:"home",sel:TOUR[0].sel,t:"Your family’s spending shows here",d:"Payments from everyone in your family appear together, so you can see the whole month at a glance."};return a}
function startTour(i){
  i=i||0;var TS=tourSteps(),st=TS[i];if(!st)return endTour();
  var nv=document.getElementById("nav");if(nv&&nv.classList.contains("hide")&&i===0){return}
  if(st.tab&&S.tab!==st.tab)go(st.tab);
  setTimeout(function(){
    var el=document.querySelector(st.sel),r=el?el.getBoundingClientRect():{left:0,top:0,width:0,height:0},pad=6;
    var o=document.getElementById("tour");if(!o){o=document.createElement("div");o.id="tour";document.body.appendChild(o)}
    var dots=TS.map(function(x,j){return '<i class="td'+(j===i?' on':'')+'"></i>'}).join(''),last=i===TS.length-1;
    o.innerHTML='<div class="tb0"></div><div class="th" style="left:'+(r.left-pad)+'px;top:'+(r.top-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px"></div><div class="tc'+(st.top?' tp':'')+'"><b>'+esc(st.t)+'</b><span>'+esc(st.d)+'</span>'+(st.list?'<div class="tl">'+st.list.map(function(x){return '<div><i>'+x[0]+'</i>'+esc(x[1])+'</div>'}).join('')+'</div>':'')+'<div class="tf"><button class="tsk" id="tsk">'+(last?'':'Skip')+'</button><div class="tds">'+dots+'</div><div class="tr">'+(i>0?'<button class="tbk" id="tbk">Back</button>':'')+'<button class="tnx" id="tnx">'+(last?'Done':'Next')+'</button></div></div></div>';
    document.getElementById("tnx").onclick=function(){if(last)endTour();else startTour(i+1)};
    var b=document.getElementById("tbk");if(b)b.onclick=function(){startTour(i-1)};
    var k=document.getElementById("tsk");if(k)k.onclick=endTour},st.tab&&S.tab!==st.tab?260:30)}
function maybeTour(){if(S._tourChk||!S.loaded)return;S._tourChk=1;ls("tour6","1")}
/* ===== Screen tours (v5.64): each screen explains itself the first time it is opened ===== */
var VOICE_IOS="Tap Set up voice and follow the steps. Then say “Hey Siri, add expense in Gharwise”, double-tap the back of your iPhone, or tap the widget mic, and say “Grocery 120”.",VOICE_AND="Add the widget to your home screen, tap the microphone and say “Grocery 120”. It is saved on your phone and syncs when you are online.";
var STOURS={
 home:[
  {sel:"^.hb",t:"Your month at a glance",d:"What your family has spent this month, with your daily average."},
  {sel:"#gsetup",n:1,t:"Finish setting up",d:"Three quick steps make Gharwise do the work for you: automatic tracking from bank SMS, the voice widget and a budget."},
  {sel:'.dch[data-go="list"]',t:"Your latest payments",d:"Tap a payment to choose its category. The arrow opens the full list."},
  {sel:"#addx",t:"Add a payment yourself",d:"Paid in cash? Tap + to add it in seconds, or split it between people."}],
 rep:[
  {sel:"^#dnctr",t:"Where the money goes",d:"Each slice is a category. Tap one to see its amount and share of your spending."},
  {sel:"^#cma",t:"Compare two months",d:"Pick any two months to see what went up and what came down."}],
 list:[
  {sel:".lht",t:"Expenses, Income and Others",d:"Transfers between your own accounts, lending and card bill payments sit in Others, so they never count as spending."},
  {sel:"#app .tx",t:"Tap to change the category",d:"Tap a payment to choose its category. Swipe left to delete it."}],
 plan:[
  {sel:"^#app .dc,#app .card",t:"Set a limit for each category",d:"Add a monthly budget for Groceries, Food or Shopping. The bar fills as you spend."},
  {n:1,t:"Get a reminder before you overspend",d:"Switch on Budget alerts in Settings and choose the percentage at which you want to be told."}],
 menu:[
  {t:"Everything else lives here",d:"Open any of these whenever you are ready:",list:[["💬","Automated tracking: SMS and email"],["📥","Import bank statements"],["👥","Family Sync: share with your family"],["🤝","Lending: money you lent or borrowed"],["⚙️","Settings: language, lock and reminders"]]}],
 set:[
  {sel:"@msec:0",t:"Language",d:"Use Gharwise in English or हिन्दी."},
  {sel:"@msec:1",t:"Light or dark",d:"Choose the look you like."},
  {sel:"@msec:2",n:1,t:"Lock, summary and alerts",d:"Lock the app with your fingerprint or face, pick the day and time of your weekly summary, and the percentage for budget alerts. Everything is off until you turn it on."},
  {sel:"@sxh:0",n:1,if:function(){return nativeApp()},t:"Speak to add an expense",d:function(){return phoneOS()==="ios"?VOICE_IOS:VOICE_AND}},
  {sel:"#tourgo",t:"Replay the tours",d:"Tap here any time to see these tips again."}]};
function stEl(sel){if(!sel)return null;try{
  var m=/^@msec:(\d+)$/.exec(sel);if(m){var e=document.querySelectorAll("#app .msec")[+m[1]];return e&&e.nextElementSibling}
  m=/^@sxh:(\d+)$/.exec(sel);if(m){var x=document.querySelectorAll("#app .sxh")[+m[1]];return x&&x.closest(".card")}
  if(sel.charAt(0)==="^"){var y=document.querySelector(sel.slice(1));return y&&(y.closest(".dc,.card")||y)}
  return document.querySelector(sel)}catch(e){return null}}
function stMode(){var m=ls("stmode");if(m)return m;
  if(ls("tournew")||ls("tourjoin"))m="new";
  else if(ls("tour6"))m="old";
  else{var m0=(S.members||[])[0],fresh=m0&&m0.created_at&&(Date.now()-Date.parse(m0.created_at))<3*864e5;m=(fresh||((S.txns||[]).length===0&&(S.budgets||[]).length===0))?"new":"old"}
  ls("stmode",m);return m}
function stEnd(t,all){var e=document.getElementById("tour");if(e)e.remove();if(all)Object.keys(STOURS).forEach(function(k){ls("st_"+k,"1")});else if(t)ls("st_"+t,"1")}
function stCheck(){
  var t=S.tab,L=STOURS[t];if(!L||!S.loaded||!S.code||!S.name||S.view)return;
  if(ls("st_"+t)||document.getElementById("tour"))return;
  if(document.hidden||(document.getElementById("sheet")||{}).innerHTML)return;
  var nv=document.getElementById("nav");if(nv&&nv.classList.contains("hide"))return;
  var a=document.activeElement;if(a&&a.matches&&a.matches("input,select,textarea"))return;
  var old=stMode()==="old",steps=L.filter(function(x){return (!old||x.n)&&(!x.if||x.if())&&(!x.sel||stEl(x.sel))});
  if(!steps.length){ls("st_"+t,"1");return}
  stShow(steps,0,t)}
function stShow(steps,i,t){
  var st=steps[i];if(!st)return stEnd(t);
  var el0=stEl(st.sel);if(el0&&el0.scrollIntoView){try{el0.scrollIntoView({block:"center"})}catch(e){}}
  setTimeout(function(){
    if(S.tab!==t){stEnd();clearTimeout(S._stT);S._stT=setTimeout(stCheck,600);return}
    var el=stEl(st.sel),r=el?el.getBoundingClientRect():null,pad=6,vh=window.innerHeight;
    var hole=r?'left:'+(r.left-pad)+'px;top:'+(r.top-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px':'left:50%;top:38%;width:0;height:0';
    var top=r?((r.top-70)>(vh-r.bottom-118)):false,last=i===steps.length-1,d=typeof st.d==="function"?st.d():st.d;
    var o=document.getElementById("tour");if(!o){o=document.createElement("div");o.id="tour";document.body.appendChild(o)}
    var dots=steps.length>1?steps.map(function(x,j){return '<i class="td'+(j===i?' on':'')+'"></i>'}).join(''):'';
    o.innerHTML='<div class="tb0"></div><div class="th" style="'+hole+'"></div><div class="tc'+(top?' tp':'')+'"><b>'+esc(st.t)+'</b><span>'+esc(d)+'</span>'+(st.list?'<div class="tl">'+st.list.map(function(x){return '<div><i>'+x[0]+'</i>'+esc(x[1])+'</div>'}).join('')+'</div>':'')+
      (i===0?'<button class="tka" id="tska">'+esc("Skip all tips")+'</button>':'')+
      '<div class="tf"><button class="tsk" id="tsk">'+(last?'':esc("Skip"))+'</button><div class="tds">'+dots+'</div><div class="tr">'+(i>0?'<button class="tbk" id="tbk">'+esc("Back")+'</button>':'')+'<button class="tnx" id="tnx">'+esc(last?"Got it":"Next")+'</button></div></div></div>';
    document.getElementById("tnx").onclick=function(){if(last)stEnd(t);else stShow(steps,i+1,t)};
    var b=document.getElementById("tbk");if(b)b.onclick=function(){stShow(steps,i-1,t)};
    var k=document.getElementById("tsk");if(k)k.onclick=function(){stEnd(t)};
    var ka=document.getElementById("tska");if(ka)ka.onclick=function(){stEnd(t,1)}},el0?280:30)}
var _stR=render;render=function(){var r=_stR.apply(this,arguments);clearTimeout(S._stT);S._stT=setTimeout(stCheck,900);return r};
/* the "Finish setting up" card on Home */
function gsItems(){
  var sc=S.sc,smsOn=!!((sc&&sc.alert_count>0)||(S.nsms&&S.nsms.enabled));
  var a=[{k:"sms",ic:"💬",t:"Turn on automatic tracking",done:smsOn||ls("gs_sms")==="1",go:"track"}];
  if(nativeApp())a.push({k:"voice",ic:"🎤",t:phoneOS()==="ios"?"Add the voice shortcut":"Add the voice widget",done:ls("gs_voice")==="1",go:"set"});
  if((S.budgets||[]).length>0)ls("gs_budget","1");
  a.push({k:"budget",ic:"🎯",t:"Set your first budget",done:ls("gs_budget")==="1",go:"plan"});
  return a}
function gsCard(){
  if(!S.loaded||ls("gs_off")==="1")return "";
  if(S.sc===undefined&&!S._gsl){S._gsl=1;try{quiet(loadSc())}catch(e){}}
  var it=gsItems(),left=it.filter(function(x){return !x.done}).length;if(!left)return "";
  return '<div class="dc gs" id="gsetup"><div class="dch"><b>Finish setting up</b><button class="gsx" data-gs="off">'+esc("Hide")+'</button></div>'+
    it.map(function(x){return '<button class="gr'+(x.done?' done':'')+'" data-gs="'+x.k+'" data-gsgo="'+x.go+'"><span class="ck">'+(x.done?'✓':'')+'</span><span>'+x.ic+' '+esc(x.t)+'</span><span class="arr">→</span></button>'}).join('')+'</div>'}
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-gs]");if(!b)return;
  var k=b.getAttribute("data-gs");if(k==="off"){ls("gs_off","1");render();return}
  go(b.getAttribute("data-gsgo")||"home")});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("#tourgo");if(b){Object.keys(STOURS).forEach(function(k){ls("st_"+k,"")});ls("stmode","new");ls("gs_off","");go("home");toast("Tips will show the first time you open each screen")}});
function showErr(m){var b=document.getElementById("errbar");if(!b){b=document.createElement("div");b.id="errbar";b.style.cssText="position:fixed;top:0;left:0;right:0;background:#b4432f;color:#fff;padding:8px 12px;font-size:13px;z-index:99";b.onclick=function(){b.remove()};document.body.appendChild(b)}b.textContent="Problem: "+m+" (tap to close, and send me this message)"}
window.addEventListener("error",function(e){showErr(e.message)});
window.addEventListener("unhandledrejection",function(e){showErr(String(e.reason&&e.reason.message||e.reason))});
function qsig(){try{return JSON.stringify([S.budgets,S.fixed,S.goals,S.gents,S.members,S.sc,S.imports,S.fam])}catch(e){return Math.random()}}
function quiet(p){var a=qsig();return p.then(function(){if(qsig()!==a)render()})}
document.getElementById("nav").onclick=function(e){var bt=e.target.closest&&e.target.closest("button[data-t]");if(bt)go(bt.dataset.t)};
function idle(){return !document.hidden&&S.code&&["home","list","rep"].indexOf(S.tab)>=0&&!document.activeElement.matches("input,select,textarea")&&!document.getElementById("sheet").innerHTML}
async function refreshSoon(){
  if(!idle())return;
  try{
    var r=await api("transactions?select=id,created_at&order=created_at.desc&limit=1"),k=r&&r[0]?r[0].id+"|"+r[0].created_at:"none";
    if(k!==S._probe||Date.now()-(S._full||0)>300000){S._probe=k;load(true)}
  }catch(e){load(true)}}
window.addEventListener("popstate",function(){if(S.tab!=="home"&&S.code){_pop=1;try{go(S.tab==="grpo"?"grpv":S.tab==="grpv"&&typeof gBack==="function"?gBack():"home")}finally{_pop=0}}});
document.addEventListener("visibilitychange",function(){if(!document.hidden)refreshSoon()});
setInterval(refreshSoon,6000);
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
S.pf=ls("pf")||"";S.cur="₹";S.ms=parseInt(ls("ms"),10)||1;
try{S.auth=JSON.parse(ls("sb")||"null")}catch(e){S.auth=null}
setInterval(function(){if((S.tab==="track"||S.tab==="mail")&&!document.hidden&&S.code)refreshSc()},6000);
window.addEventListener("hashchange",function(){if(/access_token|error_description/.test(location.hash))boot()});
document.addEventListener("click",function(e){
  var b=e.target&&e.target.closest?e.target.closest("button[data-theme],button[data-accent]"):null;if(!b)return;
  if(b.hasAttribute("data-theme"))ls("theme",b.getAttribute("data-theme"));else ls("accent",b.getAttribute("data-accent"));
  applyLook();render()});
/* ===== F1 profile picture + F2 groups (v5.30) ===== */
var GR={d:null,ex:null,ok:true,exok:true,t:0,seen:Number(ls("gseen")||0),shown:{},cat:{}};
var PHOTO_RE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
var GCATS=["Stay","Food","Travel","Fun","Shopping","Rent","Bills","Other"];

/* while a tip or guide is showing, the page behind it cannot be scrolled or tapped */
(function(){
  var st=document.createElement("style");st.textContent="#tour,#tour *{touch-action:none}";document.head.appendChild(st);
  function blk(e){var o=document.getElementById("tour");if(o&&o.contains(e.target)&&e.cancelable)e.preventDefault()}
  document.addEventListener("touchmove",blk,{passive:false});
  document.addEventListener("wheel",blk,{passive:false});
  function lock(){var on=!!document.getElementById("tour");document.documentElement.style.overflow=on?"hidden":"";document.body.style.overflow=on?"hidden":""}
  try{new MutationObserver(lock).observe(document.body,{childList:true})}catch(e){}
})();
