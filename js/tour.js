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
function maybeTour(){
  if(S._tourChk||!S.loaded)return;S._tourChk=1;
  if(ls("tour6"))return;
  var m0=(S.members||[])[0],fresh=m0&&m0.created_at&&(Date.now()-Date.parse(m0.created_at))<3*864e5;
  if(ls("tournew")||fresh){setTimeout(function(){if(!ls("tour6"))startTour(0)},1700);return}
  if((S.txns||[]).length===0&&(S.budgets||[]).length===0)setTimeout(function(){if(!ls("tour6"))startTour(0)},1700);else ls("tour6","1")}
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("#tourgo");if(b){ls("tour6","");S._tourChk=1;go("home");startTour(0)}});
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
S.pf=ls("pf")||"";S.cur=ls("cur")||"₹";S.ms=parseInt(ls("ms"),10)||1;
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
