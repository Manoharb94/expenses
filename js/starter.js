/* ---------- starter plan (household + city + salary) ---------- */
var SP_T={single:{Groceries:5000,Food:3000,Transport:3000,"Bills & Utilities":2500,Health:1000,Entertainment:2000,Subscriptions:800,Shopping:3000,Travel:3000},
 couple:{Groceries:8000,Food:5000,Transport:5000,"Bills & Utilities":3500,Health:2000,Entertainment:3000,Subscriptions:1200,Shopping:4000,Travel:4000},
 family:{Groceries:14000,Food:7000,Transport:7000,"Bills & Utilities":5000,Health:3500,Entertainment:4000,Subscriptions:1500,Shopping:5000,Travel:5000,Kids:4000},
 parents:{Groceries:17000,Food:7000,Transport:8000,"Bills & Utilities":6500,Health:5000,Entertainment:4000,Subscriptions:1500,Shopping:5000,Travel:5000,Kids:4000}};
var SP_HH=[["single","Single"],["couple","Couple"],["family","Family of 4"],["parents","Family + parents"]],SP_CT=[["metro","Metro",1.2],["big","Big city",1],["small","Smaller town",.8]];
var SP_HINT={Groceries:"Food and household items",Food:"Eating out, delivery",Transport:"Fuel, cab, metro",Health:"Medicines, doctor visits",Entertainment:"Movies, outings",Shopping:"Reduced first if money is tight",Travel:"Trips and weekends","Bills & Utilities":"Electricity, gas, water",Subscriptions:"OTT, apps",Kids:"Activities, daily needs"};
function r100(v){return Math.round(v/100)*100}
function spPlan(hh,ct,sal){
  var f=(SP_CT.filter(function(c){return c[0]===ct})[0]||SP_CT[1])[2],T=SP_T[hh]||SP_T.couple,flex=[],fix=[];
  Object.keys(T).forEach(function(c){flex.push({c:c,a:r100(T[c]*f)})});
  var fp=function(n,pc,day,cat){fix.push({name:n,a:r100(sal*pc/100),day:day,cat:cat})};
  fp("House rent / EMI",25,1,"House Rent");fp("SIP (mutual fund)",12,5,"Investment");fp("Emergency fund",5,5,"Investment");fp("Health insurance",4,10,"Health");fp("Phone and internet",2,8,"Bills & Utilities");
  if(hh==="family"||hh==="parents")fp("School fees",5,5,"Education");
  var X=0,F=0;fix.forEach(function(x){X+=x.a});flex.forEach(function(x){F+=x.a});var ex=X+F-sal*0.97,tight=ex>0;
  if(tight){["Shopping","Travel","Entertainment","Subscriptions","Food"].forEach(function(c){var r=flex.filter(function(x){return x.c===c})[0];if(r&&ex>0){var cut=Math.min(r.a,ex);r.a=r100(r.a-cut);ex-=cut}});
    if(ex>0){F=0;flex.forEach(function(x){F+=x.a});var k=Math.max(0,(sal*0.97-X)/F);flex.forEach(function(x){x.a=r100(x.a*k)})}}
  return {flex:flex,fix:fix,tight:tight}}
function spTot(P){var X=0,F=0,SV=0;P.fix.forEach(function(x){X+=x.a;if(x.cat==="Investment")SV+=x.a});P.flex.forEach(function(x){F+=x.a});return {X:X,F:F,SV:SV}}
function salaryGuess(){var m={};(S.txns||[]).forEach(function(t){if(t.type==="in"&&t.category==="Salary / Income"&&isCount(t)){var k=pkey(t.txn_date);m[k]=(m[k]||0)+Number(t.amount)}});
  var v=Object.keys(m).sort().slice(-3).map(function(k){return m[k]}).sort(function(a,b){return a-b});return v.length?Math.round(v[Math.floor(v.length/2)]):0}
function starterCard(){
  if((S.budgets||[]).length||(S.fixed||[]).length||(S.profile&&S.profile.can_edit===false))return "";
  return '<div class="dc" style="border:1.5px solid var(--acc)"><b style="font-size:18px">✨ Get a starter plan</b><div class="note" style="margin:6px 0 10px;font-size:14px">Tell us your household and salary. We fill in budgets and bills for you. You can change every amount.</div><button class="btn" id="bplan" style="margin:0">Create my plan</button></div>'}
function starterSheet(){
  var sh=document.getElementById("sheet"),st=S.sp=S.sp||{step:1,hh:"couple",ct:"metro",sal:salaryGuess()||""};st.step=1;
  function chips(arr,cur,key){return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px">'+arr.map(function(a){return '<button class="tab'+(a[0]===cur?' on':'')+'" data-spk="'+key+'" data-spv="'+a[0]+'">'+esc(a[1])+'</button>'}).join('')+'</div>'}
  function draw(){
    var P=null,h='<div class="sheet"><div style="max-height:86vh;overflow:auto">';
    if(st.step===1){
      h+='<b>Your starter plan</b> <span class="mute" style="float:right">1 of 3</span><div class="mute" style="margin:10px 0 0">Who are you budgeting for?</div>'+chips(SP_HH,st.hh,"hh")+'<div class="mute">Where do you live?</div>'+chips(SP_CT,st.ct,"ct")+'<div class="mute">Monthly take-home salary</div><input id="spsal" type="number" inputmode="numeric" placeholder="e.g. 100000" value="'+(st.sal||"")+'">'+(salaryGuess()&&+st.sal===salaryGuess()?'<div class="note" style="margin:-4px 0 8px">Taken from your last salary credits. Change it if it is wrong.</div>':'')+'<button class="btn" id="spgo">See my plan</button><div class="note" style="text-align:center;margin-top:8px">A starting point, not financial advice.</div><button class="btn ghost" id="spx" style="margin-top:8px">Cancel</button>'}
    else{P=st.P||(st.P=spPlan(st.hh,st.ct,Number(st.sal)));var T=spTot(P),left=Number(st.sal)-T.X-T.F,day=Math.round(T.F/30);
      if(st.step===2){
        h+='<b>Your starter plan</b> <span class="mute" style="float:right">2 of 3</span><div class="mute" style="margin:10px 0 2px">This is how you can live each month</div><div style="font-size:30px;font-weight:800">'+money(day)+' <span class="mute" style="font-size:16px;font-weight:600">a day</span></div><div class="note">to spend on everyday things, after your fixed bills and savings.</div>'
          +'<div class="row" style="margin-top:12px"><span>Fixed bills & savings</span><b>'+money(T.X)+'</b></div><div class="row" style="margin-top:6px"><span>Everyday spending</span><b>'+money(T.F)+'</b></div><div class="row" style="margin-top:6px"><span>Left over</span><b class="'+(left<0?'out':'in')+'">'+money(Math.max(left,0))+'</b></div>'
          +(P.tight?'<div class="card" style="margin:12px 0 0;border-color:var(--out)"><b class="out">This plan is tight for your salary.</b><div class="note">We cut shopping, travel and fun first. Review each amount.</div></div>':'')
          +'<div class="card" style="margin:12px 0 0;background:var(--chip)"><b>Stay inside these limits and you save about '+money(T.SV+Math.max(left,0))+' every month.</b><div class="note">'+money(T.SV)+' goes to SIP and your emergency fund, plus what is left over.</div></div><div class="note" style="margin-top:8px">After 2 months you can update these guesses with what you really spend.</div>'
          +'<button class="btn" id="spnx">Review and edit amounts</button><button class="btn ghost" id="spbk" style="margin-top:8px">Back</button>'}
      else{
        h+='<b>Your starter plan</b> <span class="mute" style="float:right">3 of 3</span><div style="font-weight:700;margin:12px 0 4px">Everyday spending</div>'
          +P.flex.map(function(x,i){return '<div class="row" style="gap:8px;margin:0 0 8px"><span style="flex:1;min-width:0">'+ci(x.c)+' '+esc(x.c)+'<div class="mute" style="font-size:11.5px">'+esc(SP_HINT[x.c]||"")+'</div></span><input data-spf="'+i+'" type="number" inputmode="numeric" value="'+x.a+'" style="width:100px;margin:0;text-align:right"></div>'}).join('')
          +'<div style="font-weight:700;margin:14px 0 4px">Fixed bills and savings</div><div class="note" style="margin:0 0 8px">Set an amount to 0 to skip it. Add your real home loan or EMI later.</div>'
          +P.fix.map(function(x,i){return '<div class="row" style="gap:8px;margin:0 0 8px"><span style="flex:1;min-width:0">'+esc(x.name)+'<div class="mute" style="font-size:11.5px">every month, day '+x.day+'</div></span><input data-spx="'+i+'" type="number" inputmode="numeric" value="'+x.a+'" style="width:100px;margin:0;text-align:right"></div>'}).join('')
          +'<button class="btn" id="spok">Save my plan</button><button class="btn ghost" id="spbk" style="margin-top:8px">Back</button>'}}
    h+='</div></div>';sh.innerHTML=h;wire()}
  function wire(){
    sh.querySelectorAll("[data-spk]").forEach(function(b){b.onclick=function(){var v=document.getElementById("spsal");if(v)st.sal=v.value;st[b.dataset.spk]=b.dataset.spv;st.P=null;draw()}});
    var x=document.getElementById("spx");if(x)x.onclick=function(){sh.innerHTML=""};
    var go=document.getElementById("spgo");if(go)go.onclick=function(){var v=parseFloat(document.getElementById("spsal").value);if(!(v>=5000)){alert("Enter your monthly salary");return}st.sal=v;st.P=null;st.step=2;draw()};
    var nx=document.getElementById("spnx");if(nx)nx.onclick=function(){st.step=3;draw()};
    var bk=document.getElementById("spbk");if(bk)bk.onclick=function(){st.step=st.step===3?2:1;draw()};
    var ok=document.getElementById("spok");if(ok)ok.onclick=save}
  async function save(){var P=st.P,bud=[],fx=[];
    sh.querySelectorAll("[data-spf]").forEach(function(i){var v=parseFloat(i.value),r=P.flex[+i.dataset.spf];if(v>0)bud.push({category:r.c,amount:v})});
    sh.querySelectorAll("[data-spx]").forEach(function(i){var v=parseFloat(i.value),r=P.fix[+i.dataset.spx];if(v>0)fx.push({name:r.name,amount:v,day:r.day,freq:"monthly",month:null,category:r.cat})});
    if(!bud.length&&!fx.length){alert("Add at least one amount");return}
    try{if(bud.length)await api("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(bud)});
      if(fx.length)await api("fixed_items",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(fx)});
      sh.innerHTML="";ls("bpdis","1");S.sp=null;await load();toast("Your plan is ready")}catch(e){alert("Could not save: "+e.message)}}
  draw()}
function editFixedSheet(id){
  var f=(S.fixed||[]).filter(function(x){return String(x.id)===String(id)})[0];if(!f)return;var sh=document.getElementById("sheet");
  var cs=CATS.filter(function(c){return !NOBUD[c]});if(f.category&&cs.indexOf(f.category)<0)cs.push(f.category);
  sh.innerHTML='<div class="sheet"><div style="max-height:86vh;overflow:auto"><b>Edit fixed expense</b><div class="mute" style="margin:10px 0 0">Name</div><input id="efn" value="'+esc(f.name)+'"><div class="mute">Amount</div><input id="efa" type="number" inputmode="decimal" value="'+Number(f.amount)+'"><div class="mute">Day of month (1-31)</div><input id="efd" type="number" inputmode="numeric" value="'+f.day+'"><div class="mute">How often</div><select id="eff"><option value="monthly"'+(f.freq==="monthly"?' selected':'')+'>Every month</option><option value="quarterly"'+(f.freq==="quarterly"?' selected':'')+'>Every 3 months</option><option value="yearly"'+(f.freq==="yearly"?' selected':'')+'>Once a year</option></select><div id="efmw" style="display:'+(f.freq==="monthly"?'none':'block')+'"><div class="mute">Month it is due</div><select id="efm">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(function(m){return '<option value="'+m+'"'+(+f.month===m?' selected':'')+'>'+new Date(2026,m-1,1).toLocaleString("en-IN",{month:"long"})+'</option>'}).join('')+'</select></div><div class="mute">Category</div><select id="efc"><option value="">No category</option>'+cs.map(function(c){return '<option'+(c===f.category?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select><button class="btn" id="efok">Save</button><button class="btn ghost" id="efdel" style="margin-top:8px;color:var(--out)">Delete</button><button class="btn ghost" id="efx" style="margin-top:8px">Cancel</button></div></div>';
  var ff=document.getElementById("eff");ff.onchange=function(){document.getElementById("efmw").style.display=ff.value==="monthly"?"none":"block"};
  document.getElementById("efx").onclick=function(){sh.innerHTML=""};
  document.getElementById("efdel").onclick=function(){sh.innerHTML="";confirmSheet("Delete this fixed expense?",f.name+" will be removed from your plan and forecast.","Delete",async function(){await api("fixed_items?id=eq."+encodeURIComponent(f.id),{method:"DELETE"});load()})};
  document.getElementById("efok").onclick=async function(){var n=document.getElementById("efn").value.trim(),a=parseFloat(document.getElementById("efa").value),d=parseInt(document.getElementById("efd").value,10)||1,fr=ff.value;
    if(!n||!(a>0)){alert("Enter a name and an amount");return}
    try{await api("fixed_items?id=eq."+encodeURIComponent(f.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:n,amount:a,day:Math.min(31,Math.max(1,d)),freq:fr,month:fr==="monthly"?null:(parseInt(document.getElementById("efm").value,10)||1),category:document.getElementById("efc").value||null})});
      sh.innerHTML="";await load();try{schedRem()}catch(e){}toast("Saved")}catch(e){alert("Could not save: "+e.message)}}}
async function saveBudgets(){
  var rows=[],del=[],bm={};S.budgets.forEach(function(b){bm[b.category]=1});
  document.querySelectorAll("[data-bud]").forEach(function(i){var c=i.dataset.bud,v=parseFloat(i.value);if(v>0)rows.push({category:c,amount:v});else if(bm[c])del.push(c)});
  try{
    if(rows.length)await api("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
    for(var i=0;i<del.length;i++)await api("budgets?category=eq."+encodeURIComponent(del[i]),{method:"DELETE"});
    S.newBud={};await load();toast("Budget saved")
  }catch(e){alert("Could not save: "+e.message)}
}
async function addFixed(){
  var n=g("fn").trim(),a=parseFloat(g("fa")),d=parseInt(g("fd"),10)||1,fr=g("ff"),m=parseInt(g("fm"),10)||1,c=g("fc");
  if(!n||!(a>0)){alert("Enter a name and an amount");return}
  try{await api("fixed_items",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:n,amount:a,day:Math.min(31,Math.max(1,d)),freq:fr,month:fr==="monthly"?null:m,category:c||null})});var wantRem=!!(document.getElementById("fr")&&document.getElementById("fr").checked);await load();
    if(wantRem){var nf0=(S.fixed||[]).filter(function(x){return x.name===n}).pop();if(nf0){if(await remPermit(true)){remSet(nf0.id,true);schedRem();toast("Added with reminder")}else toast("Added. Allow notifications to get the reminder")}}
    if(/loan|emi/i.test(n+" "+(c||""))&&!(S.loans||[]).some(function(l){return String(l.n).toLowerCase()===n.toLowerCase()})){var nf=(S.fixed||[]).filter(function(x){return x.name===n}).pop();setTimeout(function(){loanSetup(null,n,a,nf&&nf.id||"")},250)}}
  catch(e){alert("Could not save: "+e.message)}
}
function csv(F){
  var rows=[["Date","Person","Type","Source","Payee","Category","Amount","Note"]];
  F.forEach(function(t){rows.push([t.txn_date,t.person,t.type,t.kind||"bank",t.merchant,t.category||"",t.amount,t.note||""])});
  var txt=rows.map(function(r){return r.map(function(c){return '"'+String(c==null?"":c).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+txt],{type:"text/csv"}));a.download="expenses.csv";document.body.appendChild(a);a.click();a.remove();
}
function sxHead(ic,t,sub){return '<div class="sxh"><div class="t">'+ic+'</div><div><b>'+t+'</b><small>'+sub+'</small></div></div>'}
function nice(x){x=String(x||"");return (x===x.toUpperCase()&&/[A-Z]/.test(x))?x.toLowerCase().replace(/(^|[\s*.\-])([a-z])/g,function(m,a,b){return a+b.toUpperCase()}):x}
function tintS(c){var h=0;String(c).split("").forEach(function(ch){h=(h*31+ch.charCodeAt(0))%360});return "hsl("+h+",62%,52%)"}
function tint(c){var h=0;String(c).toLowerCase().split("").forEach(function(ch){h=(h*31+ch.charCodeAt(0))%360});return "hsla("+h+",70%,55%,.16)"}
function lendSheet(name,pref){
  var sh=document.getElementById("sheet"),lr=S.lrows[name]||{r1:0,r2:0},def=pref||(name?(lr.r2>0&&lr.r1<=0?"i|out":"o|in"):"o|out"),rem=lr.r1>0?lr.r1:(lr.r2>0?lr.r2:0);
  var opt=[["o|out","I gave money (lent) - adds to what they owe me"],["o|in","They paid me back - subtracts"],["i|in","I took money (borrowed) - adds to what I owe"],["i|out","I paid them back - subtracts"]];
  var h='<div class="sheet"><div class="sx">'+sxHead("🤝",name?'Tally with '+esc(name):'Add lender','Not counted as spending or income')+(name?'':'<div class="sxs" data-for="lw"><button type="button" data-v="o|out"'+(def==="o|out"?' class="on"':'')+'>I gave money</button><button type="button" data-v="i|in"'+(def==="i|in"?' class="on"':'')+'>I got money</button></div><input id="lp" list="pl" placeholder="Person name"><datalist id="pl">'+lendNames()+'</datalist>')+'<select id="lw"'+(name?'':' style="display:none"')+'>';
  opt.forEach(function(o){h+='<option value="'+o[0]+'"'+(o[0]===def?" selected":"")+'>'+o[1]+'</option>'});
  h+='</select><input id="la" type="number" inputmode="decimal" placeholder="₹ Amount">'+(rem>0?'<button class="btn ghost s" id="lr" style="margin-bottom:8px">Use full remaining '+money(rem)+'</button>':'')+'<input id="lc" placeholder="Comment (optional)"><input id="ld" type="date" value="'+iso(new Date())+'"><button class="btn" id="ls">Save</button><button class="btn ghost" style="margin-top:8px" id="lx">Cancel</button></div></div>';
  sh.innerHTML=h;
  document.getElementById("lx").onclick=function(){sh.innerHTML=""};
  var lrb=document.getElementById("lr");if(lrb)lrb.onclick=function(){document.getElementById("la").value=rem};
  document.getElementById("ls").onclick=async function(){
    var nm=(name||g("lp")).trim(),a=parseFloat(g("la")),w=g("lw").split("|");
    if(!nm||!(a>0)){alert("Enter the person's name and an amount");return}
    var body={amount:a,type:w[1],merchant:nm,merchant_key:mk(nm),category:w[0]==="o"?LOUT:LIN,note:g("lc").trim()||null,txn_date:g("ld")||iso(new Date()),person:S.name};
    try{await saveTxn(body);sh.innerHTML="";toast("Saved: "+w[1]+" "+money(a)+" · "+nm);load()}
    catch(e){alert("Could not save: "+e.message)}
  };
}
function lendNames(){var seen={};S.txns.forEach(function(t){if(isLend(t)&&t.person===S.name)seen[t.merchant||""]=1});return Object.keys(seen).filter(Boolean).map(function(n){return '<option value="'+esc(n)+'">'}).join("")}
function isBankMove(t){return t.kind!=="card"&&!t.hidden&&(t.raw||t.source==="statement")}
function acctBal(p){
  var im=(S.imports||[]).filter(function(x){return x.person===p&&x.closing!=null&&x.closing!==""}).sort(function(a,b){return a.to_date<b.to_date?1:-1})[0];
  if(!im)return null;var b=Number(im.closing),n=0;
  S.txns.forEach(function(t){if(t.person===p&&t.txn_date>im.to_date&&isBankMove(t)){b+=t.type==="in"?Number(t.amount):-Number(t.amount);n++}});
  return {p:p,bal:Math.round(b*100)/100,as:im.to_date,n:n};
}
function balBlock(){
  if(!S.loaded||S.impErr||S.imports===null)return '';
  var ps=S.pf==="__both"?persons():[S.pf],rows=ps.map(acctBal).filter(Boolean);
  if(!rows.length)return '';
  var tot=0;rows.forEach(function(r){tot+=r.bal});
  var h='<div class="card"><div class="mute">Account balance</div>';
  rows.forEach(function(r){h+='<div style="margin:8px 0"><div class="row"><b style="font-size:17px">'+esc(r.p)+'</b><b style="font-size:22px;letter-spacing:-.3px" class="'+(r.bal<0?"out":"in")+'">'+S.cur+Number(r.bal).toLocaleString("en-IN",{minimumFractionDigits:r.bal%1?2:0,maximumFractionDigits:2})+'</b></div><div class="mute" style="font-size:12px">As of statement '+esc(r.as)+(r.n?' · +'+r.n+' payment'+(r.n>1?'s':'')+' since':'')+'</div></div>'});
  if(rows.length>1)h+='<div class="row" style="border-top:1px solid var(--line);padding-top:6px"><span class="mute">Together</span><b>'+money(tot)+'</b></div>';
  return h+'<div class="note">The last statement balance, plus money in and out since then from your alerts. Cash entries and credit card spends are not included. Upload a newer statement any time to reset it to the exact figure.</div></div>'}
function lendBal(){
  var by={};S.txns.filter(function(t){return isLend(t)&&t.person===S.name}).forEach(function(t){
    var k=t.merchant||"";if(!k)return;var o=by[k]=by[k]||{lent:0,back:0,took:0,paid:0},a=Number(t.amount);
    if(t.category===LOUT){if(t.type==="out")o.lent+=a;else o.back+=a}else{if(t.type==="in")o.took+=a;else o.paid+=a}});
  return Object.keys(by).map(function(k){var o=by[k];return {k:k,get:Math.max(0,Math.round((o.lent-o.back)*100)/100),owe:Math.max(0,Math.round((o.took-o.paid)*100)/100)}});
}
function lendWho(t,cat,kind,label,note,pp){
  var sh=document.getElementById("sheet"),a=Number(t.amount);
  async function apply(name){
    sh.innerHTML="";
    try{await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:cat,merchant:name,note:note||t.note||null})});toast(label+" · "+name+" · "+money(a))}
    catch(e){alert("Could not save: "+e.message)}
    load();
  }
  var h='<div class="sheet"><div><b>'+esc(label)+'</b><div class="mute" style="margin:4px 0 10px">'+esc(t.merchant||"Unknown")+' · '+money(a)+' · '+esc(t.txn_date||"")+'</div>';
  if(kind==="settle"){
    var open=lendBal().filter(function(r){return cat===LOUT?r.get>0:r.owe>0});
    h+='<div class="mute" style="margin-bottom:6px">'+(cat===LOUT?'Who paid you back?':'Whom did you pay back?')+' It is subtracted from their balance automatically.</div>';
    if(open.length)open.forEach(function(r,i){var rem=cat===LOUT?r.get:r.owe;h+='<button class="btn ghost" style="margin-bottom:6px;text-align:left" data-w="'+i+'">'+esc(r.k)+' · still '+(cat===LOUT?'to get ':'to pay ')+money(rem)+(a>rem?' (this is more)':a===rem?' (clears it)':' (leaves '+money(rem-a)+')')+'</button>'});
    else h+='<div class="note">Nothing is open to settle. Type a name below to start a record.</div>';
    var cut=new Date(t.txn_date||iso(new Date()));cut.setDate(cut.getDate()-150);var cs=iso(cut);
    var earlier=S.txns.filter(function(x){return x.id!==t.id&&x.type===(cat===LOUT?"out":"in")&&x.txn_date&&x.txn_date<=t.txn_date&&x.txn_date>=cs&&isCount(x)&&x.category!==PASS}).sort(function(p,q){return (Number(q.amount)===a)-(Number(p.amount)===a)||(q.txn_date<p.txn_date?-1:1)}).slice(0,8);
    var eh='';if(earlier.length){eh='<div class="mute" style="margin:10px 0 6px">Or pick the earlier payment you are settling. It is recorded as the '+(cat===LOUT?'lend':'borrowing')+' too.</div>';
      earlier.forEach(function(x,i){eh+='<button class="btn ghost" style="margin-bottom:6px;text-align:left" data-e="'+i+'">'+esc(x.txn_date)+' · '+esc(x.merchant||"Unknown")+' · '+money(x.amount)+'</button>'})}
    sh.innerHTML=h+eh+'<input id="wn" list="pl" placeholder="Someone else (name)"><datalist id="pl">'+lendNames()+'</datalist><button class="btn" id="wok">Save with this name</button><button class="btn ghost" style="margin-top:8px" id="wx">Cancel</button></div></div>';
    sh.querySelectorAll("[data-w]").forEach(function(b){b.onclick=function(){apply(open[+b.dataset.w].k)}});
    sh.querySelectorAll("[data-e]").forEach(function(b){b.onclick=async function(){var x=earlier[+b.dataset.e],nm=x.merchant||"Unknown";
      try{await api("transactions?id=eq."+x.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:cat===LOUT?LOUT:LIN})})}catch(e){alert("Could not save: "+e.message);return}
      apply(nm)}});
  }else{
    sh.innerHTML=h+'<input id="wn" list="pl" placeholder="Person name" value="'+esc(pp||t.merchant||"")+'"><datalist id="pl">'+lendNames()+'</datalist><button class="btn" id="wok">Save</button><button class="btn ghost" style="margin-top:8px" id="wx">Cancel</button></div></div>';
  }
  document.getElementById("wx").onclick=function(){sh.innerHTML=""};
  document.getElementById("wok").onclick=function(){var n=g("wn").trim();if(!n){alert("Enter the person's name");return}apply(n)};
}
function cardPickBlock(t){
  if(t.type!=="out"||!Array.isArray(S.cards))return "";
  var l4=t.card_last4||"",c=l4?S.cards.filter(function(x){return x.last4===l4})[0]:null,k=c?c.kind:"";
  var seg=function(v,lab){return '<button class="tab'+((k===v||(v==="none"&&!k&&t.kind!=="card"))?' on':'')+'" data-cc="'+v+'">'+lab+'</button>'};
  return '<div class="card" style="box-shadow:none;border:1px solid var(--line);margin:8px 0 10px;padding:10px"><div class="mute" style="margin-bottom:6px">💳 Paid with a card?</div>'+(l4?'<div style="margin-bottom:8px">Card ending <b>'+esc(l4)+'</b></div>':'<input id="ccd" type="number" inputmode="numeric" placeholder="Last 4 digits of the card" style="margin:0 0 8px">')+'<div style="display:flex;gap:8px;flex-wrap:wrap">'+seg("credit","Credit card")+seg("debit","Debit card")+seg("none","Not a card")+'</div><div class="note" style="margin-top:6px">All payments on this card, past and future, follow your choice.</div></div>'}
function bindCard(sh,t){
  sh.querySelectorAll("[data-cc]").forEach(function(b){b.onclick=async function(){
    var v=b.dataset.cc,l=String(t.card_last4||(document.getElementById("ccd")||{}).value||"").replace(/\D/g,"");
    if(l.length!==4){alert("Enter the last 4 digits of the card");return}
    try{var n=await api("rpc/set_card",{method:"POST",body:JSON.stringify({p_last4:l,p_kind:v,p_txn:String(t.id)})});sh.innerHTML="";await load();toast(n>1?"Saved. "+n+" payments on this card updated":"Saved")}catch(e){alert("Could not save: "+e.message)}}})}
function UNBUILT(c){return ["Groceries","Food","Shopping","Transport","Fuel","Bills & Utilities","House Rent","EMI","Health","Education","Entertainment","Leisure","Subscriptions","Travel","Beauty / Salon","Gadgets","Investment","Family & Friends","Kids","Home Services"].indexOf(c)<0}
function pick(t){
  if(!canEditT(t)){toast("View only: ask the family owner for edit access");return}
  var sh=document.getElementById("sheet");
  var h='<div class="sheet"><div class="sx sxp"><div style="position:sticky;top:-18px;z-index:2;background:var(--card);margin:-18px -16px 0;padding:18px 16px 6px;display:flex;align-items:center;justify-content:space-between"><b>Choose a category</b><button id="later" aria-label="Close" style="background:transparent;border:0;color:inherit;font-size:24px;line-height:1;padding:4px 8px;margin:-4px -8px;cursor:pointer">✕</button></div><input id="cq" type="search" placeholder="🔍 Search categories" autocomplete="off" style="margin:8px 0 4px"><div class="sxm"><div class="t">'+ci(t.category||UNC)+'</div><div style="min-width:0"><b>'+esc(nice(t.merchant||"Unknown"))+'</b><small>'+esc(t.txn_date||"")+'</small></div><em>'+money(t.amount)+'</em></div>'+(function(){var cb=cardPickBlock(t);return cb?'<details class="sxd"'+(t.card_last4||t.kind==="card"?' open':'')+'><summary>💳 Paid with a card?</summary>'+cb+'</details>':''})()+'<input id="pn" placeholder="Note (optional)" value="'+esc(t.note||"")+'"><input id="pp" list="pl" placeholder="Person name (only for Lend out / Lend in)" value="'+esc(t.merchant||"")+'"><datalist id="pl">'+lendNames()+'</datalist><label class="sxr"><span><b>Only this payment</b><small>Otherwise the payee is remembered, and its future payments are filed automatically.</small></span><input type="checkbox" id="po"></label>'+(t.type==="out"&&t.category!==LOUT&&t.category!==LIN&&t.category!==IGN?'<button class="btn ghost" id="splt" style="margin:6px 0 0">✂ Split this payment</button>':'')+(t.category===IGN&&/^✂ Split into/.test(t.note||"")?'<button class="btn ghost" id="unsp" style="margin:10px 0 0">↩ Undo split</button>':'')+'<div class="cats pk">';
  if(t.type!=="in"&&SUBRE.test(t.merchant||""))h+='<button class="wide" data-c="'+CATS.indexOf("Subscriptions")+'" style="border-color:var(--accent,#5fb59a)">⭐ Subscriptions (suggested)</button>';
  CATS.forEach(function(c,i){if(c===LOUT||c===LIN||CUSTOMC.indexOf(c)>=0||(typeof gNames==="function"&&gNames().indexOf(c)>=0&&UNBUILT(c)))return;h+='<button data-c="'+i+'"><i style="background:'+tint(c)+'">'+ci(c)+'</i>'+esc(c)+'</button>'});
  var LB=t.type==="in"?[["Borrowed (they gave me)",LIN,"new","📥"],["Got back (they repaid me)",LOUT,"settle","🤝"]]:[["Lend out (I gave)",LOUT,"new","📤"],["Paid back (I repaid)",LIN,"settle","🤝"]];
  LB.forEach(function(x,i){h+='<button data-l="'+i+'"><i>'+x[3]+'</i>'+x[0]+'</button>'});
  CUSTOMC.forEach(function(c){var i=CATS.indexOf(c);if(i>=0&&(typeof gNames!=="function"||gNames().indexOf(c)<0))h+='<button data-c="'+i+'"><i>'+ci(c)+'</i>'+esc(c)+'</button>'});
  if(typeof gPickHtml==="function")h+=gPickHtml(t);
  h+='<button data-new="1"><i style="border:1.5px dashed var(--mute);background:none">＋</i>New category</button>';
  h+='</div></div></div>';
  sh.innerHTML=h;bindCard(sh,t);try{gPickBind(sh,t)}catch(e){}billBtn(sh,t);
  sh.querySelectorAll(".cats.pk button i").forEach(function(i){var st=i.getAttribute("style")||"";if(st.indexOf("background")<0)i.style.background=tint(i.parentNode.textContent.trim())});
  var cq=document.getElementById("cq");if(cq)cq.oninput=function(){var q=cq.value.trim().toLowerCase(),n=0,last=null;
    sh.querySelectorAll(".cats button:not([data-new])").forEach(function(b){var ok=!q||b.textContent.toLowerCase().indexOf(q)>=0;b.style.display=ok?"":"none";if(ok){n++;last=b}});
    var nm=document.getElementById("cqn");if(!nm){nm=document.createElement("div");nm.id="cqn";nm.className="note";nm.style.cssText="margin:8px 0";nm.textContent="No category matches. Clear the search to see them all.";sh.querySelector(".cats").parentNode.insertBefore(nm,sh.querySelector(".cats"))}nm.style.display=n?"none":"";cq._one=n===1?last:null};
  if(cq)cq.onkeydown=function(e){if(e.key==="Enter"&&cq._one){e.preventDefault();cq._one.click()}};
  var nb=sh.querySelector("[data-new]");if(nb)nb.onclick=async function(){var nm=(cq&&cq.value.trim())||prompt("New category name");if(!nm)return;var r=await addCat(nm);if(r)pick(t)};
  sh.querySelectorAll("[data-l]").forEach(function(b){b.onclick=function(){var x=LB[+b.dataset.l];lendWho(t,x[1],x[2],x[0],g("pn").trim(),g("pp").trim())}});
  document.getElementById("later").onclick=function(){sh.innerHTML=""};
  var sp1=document.getElementById("splt");if(sp1)sp1.onclick=function(){splitSheet(t)};
  var sp2=document.getElementById("unsp");if(sp2)sp2.onclick=function(){unsplit(t)};
  sh.querySelectorAll("[data-c]").forEach(function(b){b.onclick=async function(){
    var cat=CATS[+b.dataset.c],lend=(cat===LOUT||cat===LIN),only=document.getElementById("po").checked||lend||!t.merchant_key||t.merchant_key==="unknown",note=g("pn").trim(),pp=g("pp").trim();if(cat===HLP){only=true;if((S.loans||[]).length>1){whichLoan(t,note);return}}sh.innerHTML="";
    try{
      if(only){var body={category:cat};if(lend)body.merchant=pp||t.merchant;if(note||t.note)body.note=note||null;
        await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(body)})}
      else{
        await api("merchants?on_conflict=household_id,merchant_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({merchant_key:t.merchant_key,name:t.merchant,category:cat})});
        await api("transactions?merchant_key=eq."+encodeURIComponent(t.merchant_key),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:cat})});
        if(note!==(t.note||""))await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({note:note||null})});
      }
    }catch(e){alert("Could not save: "+e.message)}
    load();
  }});
}

function splitSheet(t){
  var A=Number(t.amount),st={blocks:[{cat:"",rows:[{p:"",a:""}]}]},sh=document.getElementById("sheet");
  var cats=CATS.filter(function(c){if(c===UNC||c===IGN||c===TRF||c===SELF||c===PASS||c===CCB||c===LIN||c===RENT||c==="Salary / Income")return false;var gn=typeof gNames==="function"&&gNames().indexOf(c)>=0;return !gn||!!(typeof gByName==="function"&&gByName(c))});
  var isG=function(c){return !!(c&&typeof gByName==="function"&&typeof gOKUI==="function"&&gOKUI()&&gByName(c))};
  function tot(){var x=0;st.blocks.forEach(function(b){b.rows.forEach(function(r){x+=parseFloat(r.a)||0})});return Math.round(x*100)/100}
  function left(){return Math.round((A-tot())*100)/100}
  function line(){var l=left(),e=document.getElementById("sleft");if(!e)return;var ok=l===0;e.className="note"+(ok?"":" out");e.style.cssText="font-weight:700;margin:8px 0;"+(ok?"color:var(--in)":"color:var(--out)");
    e.textContent=ok?"✓ Adds up to "+money(A):"Does not match the payment amount "+money(A)+" · "+money(Math.abs(l))+(l<0?" too much":" left");var b=document.getElementById("sok");if(b)b.style.opacity=ok?"":".55"}
  function draw(){
    var h='<div class="sheet"><div style="max-height:80vh;overflow:auto"><b>Split this payment</b><div class="mute" style="margin:4px 0 10px">'+esc(t.merchant||"Payment")+' · '+money(A)+' · '+esc(t.txn_date||"")+'</div>';
    st.blocks.forEach(function(b,bi){
      h+='<div class="card" style="box-shadow:none;border:1px solid var(--line);margin:0 0 10px;padding:10px"><div class="row"><select data-bc="'+bi+'" style="margin:0"><option value="">Choose category</option>'+cats.map(function(c){return '<option'+(c===b.cat?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select>'+(st.blocks.length>1?'<button class="btn ghost s" data-dc="'+bi+'" style="margin:0 0 0 8px">✕</button>':'')+'</div>';
      b.rows.forEach(function(r,ri){h+='<div class="row" style="margin-top:8px;gap:8px">'+(isG(b.cat)?'':'<input data-bp="'+bi+'|'+ri+'" list="pl" placeholder="'+(b.cat===LOUT?'Person name':'Person (optional)')+'" value="'+esc(r.p)+'" style="margin:0;flex:1;min-width:0">')+'<input data-ba="'+bi+'|'+ri+'" type="number" inputmode="decimal" placeholder="Amount" value="'+esc(r.a)+'" style="margin:0;'+(isG(b.cat)?'flex:1;min-width:0':'width:110px')+'">'+(b.rows.length>1?'<button class="btn ghost s" data-dr="'+bi+'|'+ri+'" style="margin:0">✕</button>':'')+'</div>'});
      h+='<button class="btn ghost s" data-ap="'+bi+'" style="margin:8px 0 0">＋ Add another person</button></div>'});
    h+='<datalist id="pl">'+lendNames()+'</datalist><div id="sleft" class="note"></div><button class="btn" id="sok">Save split</button><button class="btn ghost" style="margin-top:8px" id="sno">Cancel</button></div></div>';
    sh.innerHTML=h;line();
    sh.querySelectorAll("[data-bc]").forEach(function(e){e.onchange=function(){st.blocks[+e.dataset.bc].cat=e.value;draw()}});
    var so=document.getElementById("sok");if(so)so.onmousedown=function(ev){ev.preventDefault()};
    sh.querySelectorAll("[data-bp]").forEach(function(e){e.oninput=function(){var k=e.dataset.bp.split("|");st.blocks[+k[0]].rows[+k[1]].p=e.value}});
    sh.querySelectorAll("[data-ba]").forEach(function(e){e.oninput=function(){var k=e.dataset.ba.split("|");st.blocks[+k[0]].rows[+k[1]].a=e.value;line()}});
    sh.querySelectorAll("[data-ap]").forEach(function(e){e.onclick=function(){st.blocks[+e.dataset.ap].rows.push({p:"",a:""});draw()}});
    sh.querySelectorAll("[data-dr]").forEach(function(e){e.onclick=function(){var k=e.dataset.dr.split("|");st.blocks[+k[0]].rows.splice(+k[1],1);draw()}});
    sh.querySelectorAll("[data-dc]").forEach(function(e){e.onclick=function(){st.blocks.splice(+e.dataset.dc,1);draw()}});
    document.getElementById("sno").onclick=function(){sh.innerHTML=""};
    document.getElementById("sok").onclick=async function(){
      var ch=[],bad="";
      st.blocks.forEach(function(b){b.rows.forEach(function(r){var a=parseFloat(r.a);if(!(a>0)&&!r.p.trim())return;if(!(a>0)){bad="Enter an amount for every row";return}
        if(!b.cat){bad="Choose a category for every part";return}if(b.cat===LOUT&&!r.p.trim()){bad="Enter the person's name for each lend";return}
        ch.push({a:a,cat:b.cat,p:r.p.trim()})})});
      if(bad){alert(bad);return}
      if(!ch.length){alert("Add at least one part");return}
      if(left()!==0){alert("Does not match the payment amount "+money(A)+". "+money(Math.abs(left()))+(left()<0?" too much.":" left."));return}
      var btn=document.getElementById("sok");btn.disabled=true;btn.textContent="Saving…";
      var tag="✂ Split of "+(t.merchant||"payment")+" "+money(A)+" ["+t.id+"]";
      var gq=[];
      try{
        for(var i=0;i<ch.length;i++){var c=ch[i],isL=c.cat===LOUT,mn=isL?c.p:(t.merchant||"Payment"),gg=isG(c.cat)?gByName(c.cat):null;
          var sv=await saveTxn({amount:c.a,type:"out",merchant:mn,merchant_key:mk(mn),category:c.cat,txn_date:t.txn_date||iso(new Date()),person:t.person||S.name,note:tag+(!isL&&c.p&&!gg?" · "+c.p:"")});
          if(gg&&sv&&sv.id&&!sv._pend)gq.push({g:gg,t:Object.assign({},sv,{amount:c.a,type:"out",merchant:mn,txn_date:t.txn_date||iso(new Date())})})}
        await api("transactions?id=eq."+encodeURIComponent(t.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:IGN,note:"✂ Split into "+ch.length+" parts ["+t.id+"]"})});
        sh.innerHTML="";toast("Split into "+ch.length+" parts");await load();
        var nextG=function(){if(!gq.length)return;var x=gq.shift();gExpSheet({g:gGet(x.g.id)||x.g,t:x.t,next:nextG})};
        if(gq.length){toast("Now split "+(gq.length>1?"each group part":"the group part")+" with "+gq[0].g.name);nextG()}
      }catch(e){btn.disabled=false;btn.textContent="Save split";alert("Could not save: "+e.message)}}}
  draw()}
function unsplit(t){
  var kids=(S.txns||[]).filter(function(x){return x.id!==t.id&&(x.note||"").indexOf("["+t.id+"]")>=0&&/^✂ Split of/.test(x.note||"")});
  confirmSheet("Undo this split?",kids.length+" part"+(kids.length===1?"":"s")+" will be removed and the payment goes back to one payment with no category.","Undo split",async function(){
    for(var i=0;i<kids.length;i++)await api("transactions?id=eq."+encodeURIComponent(kids[i].id),{method:"DELETE"});
    await api("transactions?id=eq."+encodeURIComponent(t.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:null,note:null})});
    load()})}
