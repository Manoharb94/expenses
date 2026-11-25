var URLB="https://fwxhclagrwlzxvsmaekt.supabase.co/rest/v1/",KEY="sb_publishable_PiCUzSknFyCfGfEVzTiQbg_qEkBYwL_";
var SELF="Self transfer",TRF="Transfer between us",IGN="Ignore (don't count)",UNC="Others (no category yet)",CCB="Credit card bill (paid)",LOUT="Lend out",LIN="Lend in",UNPL="Unplanned expense",RENT="Rental income",PASS="Pass-through (received & sent on)";
var CATS=["Groceries","Food","Shopping","Transport","Fuel","Bills & Utilities","House Rent","EMI","Health","Education","Entertainment","Leisure","Subscriptions","Travel","Beauty / Salon","Gadgets","Investment","Family & Friends","Kids","Home Services",UNPL,"Salary / Income",RENT,"Other",LOUT,LIN,TRF,PASS,SELF,CCB,IGN];
var NOBUD={"Salary / Income":1};NOBUD[TRF]=1;NOBUD[SELF]=1;NOBUD[IGN]=1;NOBUD[CCB]=1;NOBUD[LOUT]=1;NOBUD[LIN]=1;NOBUD[UNPL]=1;NOBUD[RENT]=1;NOBUD[PASS]=1;
var NOBUDGET={};for(var k in NOBUD)NOBUDGET[k]=1;["Rent / EMI","Education","Home loan EMI","Kid education","Kid day care","Maid","Cook","Car cleaning","Electricity bill","Gas bill","Family donation","Family & Friends","House Rent","EMI"].forEach(function(c){NOBUDGET[c]=1});
var S={tab:"home",range:"month",from:"",to:"",rp:"this",hf:"all",pf:"",txns:[],budgets:[],fixed:[],planErr:"",goals:[],gents:[],lrows:{},goalErr:"",cur:"₹",code:"",name:"",err:"",loaded:false};
var ACC={emerald:["Emerald","#1f6f5c"],ocean:["Ocean","#2563eb"],violet:["Violet","#7c3aed"],sunset:["Sunset","#d9622b"],rose:["Rose","#be3a6a"],graphite:["Graphite","#334155"]};
function applyLook(){var r=document.documentElement,t=ls("theme")==="dark"?"dark":"light";   /* Light or Dark only; the colour is always violet */
  r.setAttribute("data-theme",t);r.setAttribute("data-accent","violet");
  var m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}
  m.content=getComputedStyle(r).getPropertyValue("--bg").trim()||"#151514"}
function lookCard(){var t=ls("theme")==="dark"?"dark":"light";
  var h='<div class="card"><div class="look" style="margin:0 0 8px">';
  [["light","☀️ Light"],["dark","🌙 Dark"]].forEach(function(x){h+='<button data-theme="'+x[0]+'"'+(t===x[0]?' class="on"':'')+'>'+x[1]+'</button>'});
  return h+'</div><div class="note" style="margin:0">Saved on this phone only, so you and your family can each pick your own.</div></div>'}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function money(n){n=Number(n);return (n<0?"−":"")+S.cur+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2})}
function pad(n){return String(n).padStart(2,"0")}
function ym(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function mk(n){return String(n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"unknown"}
/* ---------- offline mode: saved data to read, entries kept on the phone until the internet is back ---------- */
function isNet(e){return !!e&&(e.name==="TypeError"||/Failed to fetch|Load failed|NetworkError|network connection|Could not reach/i.test(String(e.message||e)))}
function obRead(){try{var q=JSON.parse(ls("ob")||"[]");return Array.isArray(q)?q:[]}catch(e){return []}}
function obWrite(q){ls("ob",JSON.stringify(q))}
function pendRows(){return obRead().map(function(q){var r={};for(var k in q.body)r[k]=q.body[k];r.id=q.lid;r.created_at=q.t;r.hidden=false;r.source="manual";r._pend=1;return r})}
function withPending(rows){var p=pendRows();return p.length?p.concat(rows||[]):(rows||[])}
function offBar(){var b=document.getElementById("offbar"),n=obRead().length,on=!!S.offline;
  if(!on&&!n){if(b)b.style.display="none";return}
  if(!b){b=document.createElement("div");b.id="offbar";b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 6px);z-index:70;background:#1f1f23;color:#fff;border-radius:16px;padding:5px 12px;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:92%;white-space:nowrap";document.body.appendChild(b)}
  b.textContent=(on?"Offline · showing saved data":"Syncing")+(n?" · "+n+" waiting to sync":"");b.style.display="block"}
function setOffline(v){v=!!v;if(S.offline===v){offBar();return}S.offline=v;offBar();if(!v)flushOutbox()}
var _fl=0;
async function flushOutbox(){if(_fl||!S.auth||!S.code)return;var q=obRead();if(!q.length)return;_fl=1;var keep=[],done=0;
  try{for(var i=0;i<q.length;i++){
    try{await api("transactions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(q[i].body)});done++}
    catch(e){if(isNet(e)){keep=q.slice(i);break}try{toast("Could not sync one entry: "+errText(e))}catch(x){}}}
  }finally{obWrite(keep);_fl=0;offBar()}
  if(done){S.txns=(S.txns||[]).filter(function(t){return !t._pend});try{toast("Synced "+done+" saved "+(done===1?"entry":"entries"))}catch(e){}if(typeof load==="function")load()}}
function localEdit(lid,path,opt){var q=obRead(),i,m=(opt&&opt.method)||"GET";
  for(i=0;i<q.length;i++)if(q[i].lid===lid)break;
  if(i<q.length){if(m==="DELETE")q.splice(i,1);else if(m==="PATCH"){try{var b=JSON.parse(opt.body||"{}");for(var k in b)q[i].body[k]=b[k]}catch(e){}}obWrite(q)}
  if(m==="DELETE")S.txns=(S.txns||[]).filter(function(t){return t.id!==lid});
  else if(m==="PATCH"){try{var b2=JSON.parse(opt.body||"{}");(S.txns||[]).forEach(function(t){if(t.id===lid)for(var k2 in b2)t[k2]=b2[k2]})}catch(e){}}
  offBar();return Promise.resolve(null)}
async function queueTxn(body){var q=obRead(),t=new Date().toISOString(),lid="loc-"+Date.now()+Math.floor(Math.random()*1000);
  q.push({lid:lid,t:t,body:body});obWrite(q);setOffline(true);S._q2=Date.now();
  var row=pendRows().filter(function(r){return r.id===lid})[0];S.txns=[row].concat(S.txns||[]);
  try{saveCache()}catch(e){}return row}
window.addEventListener("online",function(){try{flushOutbox();if(S.code&&S.offline&&typeof enter==="function")enter()}catch(e){}});
window.addEventListener("offline",function(){setOffline(true)});
setInterval(function(){if(S.offline&&navigator.onLine!==false&&S.auth&&typeof enter==="function")enter()},15000);
async function api(path,opt){
  opt=opt||{};if(window.GWL&&GWL.on)return GWL.api(path,opt);var lm=/id=eq\.(loc-[0-9]+)/.exec(path);if(lm)return localEdit(lm[1],path,opt);
  try{await ensureToken()}catch(e0){if(isNet(e0))setOffline(true);throw e0}
  var ch=opt.headers||{},h={apikey:KEY,"x-household":S.code,"Content-Type":"application/json"};
  if(S.auth)h.Authorization="Bearer "+S.auth.access;
  for(var k in ch)h[k]=ch[k];
  var o2={};for(var k2 in opt)o2[k2]=opt[k2];o2.headers=h;
  var r,t;try{r=await fetch(URLB+path,o2);t=await r.text()}catch(e1){if(isNet(e1))setOffline(true);throw e1}
  if(S.offline)setOffline(false);
  if(r.status===401&&S.auth&&!opt._retry){try{await refreshSess()}catch(e){throw e}var o3={};for(var k3 in opt)o3[k3]=opt[k3];o3.headers=ch;o3._retry=1;return api(path,o3)}
  if(r.status===401&&S.auth){logoutLocal("Please log in again.");throw new Error("Please log in again.")}
  if(!r.ok)throw new Error(r.status+" "+t);return t?JSON.parse(t):null;
}


/* ---- quick-access helpers: everyday categories, suggestions from history, recent payees ---- */
var EVERYDAY=["Groceries","Food","Shopping","Transport","Fuel","Bills & Utilities","House Rent","EMI","Health","Education","Entertainment","Travel"];
function sugCats(key,n){
  var out=[],by={},all={};
  (S.txns||[]).forEach(function(t){if(!t.category||t.type!=="out"||EVERYDAY.indexOf(t.category)<0)return;all[t.category]=(all[t.category]||0)+1;if(key&&t.merchant_key===key)by[t.category]=(by[t.category]||0)+1});
  Object.keys(by).sort(function(a,b){return by[b]-by[a]}).forEach(function(c){out.push(c)});
  Object.keys(all).sort(function(a,b){return all[b]-all[a]}).forEach(function(c){if(out.indexOf(c)<0)out.push(c)});
  EVERYDAY.forEach(function(c){if(out.indexOf(c)<0)out.push(c)});
  return {list:out.slice(0,n),known:!!(key&&Object.keys(by).length&&out[0]&&by[out[0]])}}
function recentPayees(n){
  var seen={},out=[];
  (S.txns||[]).slice().sort(byNew).forEach(function(t){if(out.length>=n||t.type!=="out"||!t.merchant||!t.merchant_key||t.merchant_key==="unknown"||seen[t.merchant_key])return;seen[t.merchant_key]=1;
    var nm=String(t.merchant);if(nm.length>16)nm=nm.slice(0,15)+"…";out.push({name:String(t.merchant),label:nm,key:t.merchant_key})});
  return out}
