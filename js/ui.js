function toast(m){if(S._q2&&Date.now()-S._q2<2500)m="Saved on this phone · will sync when you are online";var b=document.getElementById("toast");if(!b){b=document.createElement("div");b.id="toast";b.style.cssText="position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1c1c1a;color:#fff;padding:10px 16px;border-radius:20px;font-size:14px;z-index:99;max-width:90%";document.body.appendChild(b)}
  b.textContent=m;b.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){b.style.display="none"},3500)}
async function saveTxn(body){
  if(navigator.onLine===false)return queueTxn(body);
  var r;try{r=await api("transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(body)})}catch(e){if(isNet(e))return queueTxn(body);throw e}
  if(!r||!r.length)throw new Error("The database did not keep this entry. A database rule may be rejecting it.");
  return r[0]}
async function addGoal(){
  var n=g("gn").trim(),t=parseFloat(g("gt")),sv=parseFloat(g("gs"))||0,d=g("gdt");
  if(!n||!(t>0)){alert("Enter a name and a target amount");return}
  try{await api("goals",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:n,target:t,saved:sv,due:d||null})});await loadPlan();render()}
  catch(e){alert("Could not save: "+e.message)}
}
async function goalMoney(id){
  var gl=S.goals.filter(function(x){return x.id===id})[0];if(!gl)return;
  var v=parseFloat(prompt("How much to add to "+gl.name+"? (use a minus to take money out)"));if(!v)return;
  try{await api("goals?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({saved:Math.max(0,Number(gl.saved||0)+v)})});
    if(S.gents!==null){try{await api("goal_entries",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({goal_id:id,amount:v})})}catch(x){}}
    await loadPlan();render()}
  catch(e){alert("Could not save: "+e.message)}
}
function g(id){var e=document.getElementById(id);return e?e.value:""}
/* ================= v2 layout: Home · Charts · List · Budget + menu pages ================= */
S.lm=0;S.lt="out";S.lq="";S.lsrch=false;S.smsDev="";S.smsStep=0;S.mailStep=0;
var IC={
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  budget:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.5 17a8 8 0 1 1 15 0"/><path d="m12 13 4-4"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>'
};
function topbar(title,back,nosearch){
  return '<div class="tb">'+(back?'<button class="tbb" data-go="'+back+'" aria-label="Back">'+IC.back+'</button>':'<button class="tbb" data-go="menu" aria-label="Menu">'+IC.menu+'</button>')+
    '<b>'+esc(title)+'</b>'+((back||nosearch)?'<span class="tbb"></span>':(title==="Gharwise"&&typeof bellHtml==="function"?bellHtml():'')+'<button class="tbb" data-go="list" data-srch="1" aria-label="Search">'+IC.search+'</button>')+'</div>'}
function personChips(){
  var ns=persons();if(ns.length<2||!incFam()){if(!incFam()&&S.pf!==S.name)S.pf=S.name;return ''}var cur=S.pf||"__both",h='<div class="seg2">';
  ns.forEach(function(n){h+='<button data-pf="'+esc(n)+'" class="'+(cur===n?'on':'')+'">'+(typeof famAv==="function"&&famPhoto(n)?famAv(n,22):'')+esc(n===S.name?'Me':n)+'</button>'});
  return h+'<button data-pf="__both" class="'+(cur==="__both"?'on':'')+'">Family</button></div>'}
var _pop=0;
function go(t){try{window.brandLoader(false)}catch(e){}
  if(t==="stmt"){t="track";S.trkTab="stmt"}else if(t==="track")S.trkTab="live";
  try{if(t!=="home"){if(!(history.state&&history.state.g))history.pushState({g:1},"")}else if(history.state&&history.state.g&&!_pop)history.back()}catch(e){}
  S.tab=t;if(t==="sms"){S.smsStep=0;if(nativeSmsOK())S.nsms=null}if(t==="mail"){S.mailStep=0;S._mailInit=0}if(t==="set")S.ainfo=undefined;
  render();window.scrollTo(0,0);
  if(t==="plan"||t==="goals")quiet(loadPlan());
  if(t==="fam"||t==="set"||t==="menu")quiet(loadMembers());if(t==="fam")quiet(loadFam());
  if(t==="track"||t==="sms"||t==="mail")quiet(loadSc());
  if(S.tab==="track"&&S.trkTab==="stmt")quiet(loadImports())}
function tAt(t){return Date.parse(t.txn_at||t.created_at||"")||0}
function byNew(a,b){return (a.txn_date||"")<(b.txn_date||"")?1:(a.txn_date||"")>(b.txn_date||"")?-1:(tAt(a)<tAt(b)?1:tAt(a)>tAt(b)?-1:(String(a.created_at||"")<String(b.created_at||"")?1:-1))}
function dayLabel(ds){if(!ds)return "No date";var t=iso(new Date()),y=new Date();y.setDate(y.getDate()-1);
  if(ds===t)return "Today";if(ds===iso(y))return "Yesterday";
  return new Date(ds+"T00:00:00").toLocaleString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
function txTime(t){try{var at=t.txn_at||t.created_at;if(!at)return "";var d=new Date(at);if(isNaN(d)||iso(d)!==t.txn_date)return "";
  return d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true}).replace(/\s*([ap])m/i,function(m,x){return " "+x.toUpperCase()+"M"})}catch(e){return ""}}
function miniRow(t){
  return '<div class="lt" data-cat="'+t.id+'"><span class="ico" style="background:'+tint(t.category)+'">'+ci(t.category)+'</span><div class="m"><b>'+esc(t.merchant||"Unknown")+'</b><span>'+esc(dayLabel(t.txn_date))+(txTime(t)?' · '+txTime(t):'')+(S.pf==="__both"||!S.pf?' · '+esc(t.person||""):'')+'</span></div><div style="text-align:right"><b class="'+t.type+'">'+(t.type==="out"?"−":"+")+money(t.amount)+'</b><div><span class="tag'+(t.category?'':' warn')+'" style="font-size:11px">'+esc(t.category||"Choose category")+'</span></div></div></div>'}
function txRow(t){
  var xf=!isCount(t)||/wallet|upi ?lite/i.test(t.merchant||"");
  var rowH='<div class="tx tap" data-cat="'+t.id+'"><div class="row"><span style="display:flex;align-items:center;min-width:0"><span class="ico" style="background:'+tint(t.category||"?")+'">'+ci(t.category)+'</span><span class="txm"><b>'+esc(nice(t.merchant||"Unknown"))+'</b><span class="mute">'+[txTime(t),S.pf==="__both"?(t.person||""):""].filter(Boolean).map(esc).join(" · ")+(t.note?' · '+esc(t.note):'')+'</span></span></span><span style="text-align:right;white-space:nowrap"><b class="'+(xf?'':t.type)+'"'+(xf?' style="color:var(--mute)"':'')+'>'+(t.type==="out"?"−":"+")+money(t.amount)+'</b><div>'+(t.kind==="card"?'<span class="tag">💳 '+(t.card_last4?'••'+esc(t.card_last4):'card')+'</span> ':'')+(xf&&/wallet|upi ?lite/i.test(t.merchant||"")?'<span class="tag xfp">Transfer</span>':'<span class="tag ctag'+(t.category?'':' warn')+'"'+(t.category?' style="background:'+tint(t.category)+'"':'')+'>'+esc(t.category||"Choose category")+'</span>')+'</div></span></div></div>';
  return (t.person===S.name||!t.raw||t.category===LOUT||t.category===LIN)?'<div class="swp"><div class="swa" data-sw="txn|'+t.id+'|'+encodeURIComponent((t.merchant||'Payment')+' '+money(t.amount))+'">Delete</div><div class="swc">'+rowH+'</div></div>':rowH}

S.ev=ls("ev")||"m0";
function monthsWithData(){var o=[];for(var k=-1;k>=-5;k--){if(txIn(monthKey(k)).some(function(t){return t.type==="out"&&isCount(t)}))o.push(k)}return o}
function balLine(){
  var ps=(S.pf&&S.pf!=="__both")?[S.pf]:persons(),rows=ps.map(acctBal).filter(Boolean);if(!rows.length)return '';
  var tot=0,as="",n=0;rows.forEach(function(r){tot+=r.bal;n+=r.n;if(!as||r.as<as)as=r.as});
  return '<div class="balr" data-go="acct"><span>🏦 Bank balance'+(rows.length>1?' · '+rows.length+' accounts':'')+'<small>Statement closing on '+new Date(as+"T00:00:00").toLocaleString("en-IN",{day:"numeric",month:"short"})+(n?' + '+n+' payment'+(n>1?'s':'')+' since':'')+'</small></span><b class="'+(tot<0?'out':'')+'">'+S.cur+Number(tot).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})+'</b></div>'}
function expCard(X,P,F){
  var ms=monthsWithData(),sel=S.ev;if(sel!=="6m"&&sel!=="m0"&&ms.indexOf(Number(sel.slice(1)))<0)sel="m0";
  var opt='<select class="evs" id="evs" aria-label="Choose period"><option value="m0">This month</option>'+ms.map(function(k){return '<option value="m'+k+'"'+(sel==="m"+k?' selected':'')+'>'+esc(pnameDate(pdate(k)).toLocaleString("en-IN",{month:"long",year:"numeric"}))+'</option>'}).join('')+(ms.length?'<option value="6m"'+(sel==="6m"?' selected':'')+'>Last 6 months</option>':'')+'</select>';
  if(sel==="m0")opt=opt.replace('<option value="m0">','<option value="m0" selected>');
  var h='<div class="dc"><div class="dch"><b data-go="rep" style="cursor:pointer">Expenses</b>'+opt+'</div>';
  if(sel==="6m"){var r=sixMonths(),tot=r.reduce(function(a,x){return a+x.v},0),nz=r.filter(function(x){return x.v>0});
    h+='<div class="amt hb">'+money(Math.round(nz.length?tot/nz.length:0))+'</div><div class="mute">Average a month · '+money(Math.round(tot))+' over '+nz.length+' month'+(nz.length===1?'':'s')+'</div>'+monthBars(r)}
  else{var k=Number(sel.slice(1)),Xk=k===0?X:expenseSplit(txIn(monthKey(k)).filter(isCount),iso(pdate(k)),iso(pend(k))),Pk=k===0?P:null,recK=k===0?F.rec:sum(txIn(monthKey(k)).filter(isCount),"in");
    h+='<div class="amt hb">'+money(Xk.total)+'</div><div class="mute">'+esc(plabel(k))+(Pk?' &nbsp;'+arrow(Xk.total,Pk.X.total)+' vs '+esc(Pk.label):'')+'</div>'+
      '<div class="row" style="margin-top:10px;font-size:13px"><span class="mute" data-go="list" data-ltab="in" style="cursor:pointer">Received <b class="in">'+money(recK)+'</b> ›</span><span class="mute">'+(recK-Xk.total>=0?'Left over':'Short by')+' <b class="'+(recK-Xk.total>=0?'in':'out')+'">'+money(Math.abs(recK-Xk.total))+'</b></span></div>'+dayBars(k)}
  return h+balLine()+'</div>'}
function sixMonths(){var r=[];for(var o=-5;o<=0;o++){var Lc=txIn(monthKey(o)).filter(isCount),X=expenseSplit(Lc,iso(pdate(o)),iso(pend(o)));r.push({v:X.total,l:pnameDate(pdate(o)).toLocaleString("en-IN",{month:"short"}),f:plabel(o)})}
  while(r.length>1&&!(r[0].v>0))r.shift();return r}
function svgBars(vals,labels,tips,hi,note){
  var mx=Math.max.apply(null,vals.concat([1])),W=300,H=96,n=vals.length,bw=W/n,svg='<svg viewBox="0 0 '+W+' '+(H+18)+'" width="100%" role="img" aria-label="Spending bars">';
  vals.forEach(function(v,i){var h=v>0?Math.max(3,Math.round(v/mx*H)):0,w=Math.max(2,bw*(n>12?.66:.56)),x=i*bw+(bw-w)/2;
    svg+='<g class="bg" data-tip="'+esc(tips[i])+'"><rect x="'+(i*bw)+'" y="0" width="'+bw+'" height="'+(H+18)+'" fill="transparent"/>'+(h?'<rect x="'+x.toFixed(1)+'" y="'+(H-h)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="'+(n>12?2:5)+'" fill="#fff" opacity="'+(i===hi?1:.5)+'"/>':'')+'</g>';
    if(labels[i])svg+='<text x="'+(i*bw+bw/2).toFixed(1)+'" y="'+(H+14)+'" text-anchor="middle" font-size="10.5" fill="#fff" opacity=".8">'+labels[i]+'</text>'});
  return '<div class="trend"><div class="trt" id="trt">'+esc(note||"")+'</div>'+svg+'</svg></div>'}
function dayBars(k){
  var a=pdate(k),b=pend(k),today=iso(new Date()),by={},vals=[],labels=[],tips=[],hi=-1,i=0;
  txIn(monthKey(k)).forEach(function(t){if(t.type==="out"&&isCount(t))by[t.txn_date]=(by[t.txn_date]||0)+Number(t.amount)});
  for(var d=new Date(a);d<=b;d.setDate(d.getDate()+1),i++){var ds=iso(d),v=by[ds]||0,fut=k===0&&ds>today;vals.push(fut?0:v);
    labels.push((d.getDate()===1||d.getDate()%5===0)&&!(d.getDate()===30&&i>27)?String(d.getDate()):"");
    tips.push(d.toLocaleString("en-IN",{weekday:"short",day:"numeric",month:"short"})+": "+(fut?"—":money(Math.round(v))));if(ds===today)hi=i}
  if(!vals.some(function(v){return v>0}))return '<div class="trend"><div class="tre">No spending yet in '+esc(plabel(k))+'</div></div>';
  var nz=vals.filter(function(v){return v>0});
  return svgBars(vals,labels,tips,k===0?hi:-1,"Spent each day · avg "+money(Math.round(nz.reduce(function(x,y){return x+y},0)/Math.max(1,(k===0?Math.round((new Date(today+"T00:00:00")-a)/864e5)+1:vals.length))))+" a day · tap a bar")}
function monthBars(r){return svgBars(r.map(function(x){return x.v}),r.map(function(x){return x.l}),r.map(function(x){return x.f+": "+money(Math.round(x.v))}),r.length-1,"Total each month · tap a bar")}
function billsDue(days){
  var out=[],now=new Date(),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  S.fixed.forEach(function(f){for(var i=0;i<3;i++){var m=new Date(t0.getFullYear(),t0.getMonth()+i,1);if(!occurs(f,m.getMonth()+1))continue;
    var dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate(),d=new Date(m.getFullYear(),m.getMonth(),Math.min(Number(f.day||1),dim));
    var diff=Math.round((d-t0)/864e5);if(diff>=0&&diff<=days){out.push({f:f,d:d,diff:diff});break}}});
  return out.sort(function(a,b){return a.diff-b.diff})}
