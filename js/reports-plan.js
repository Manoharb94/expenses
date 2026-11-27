function vReports(){
  var opts=[["last","Last month"],["this","This month so far"],["next","Next month (forecast)"],["year","Next 12 months (forecast)"]];
  var h='<h1>Reports</h1>'+personUI()+'<select id="rp" style="display:none">';
  opts.forEach(function(o){h+='<option value="'+o[0]+'"'+(S.rp===o[0]?" selected":"")+'>'+o[1]+'</option>'});
  h+='</select>';
  var chips=[["this","This month"],["last","Last month"],["next","Next month"],["year","Next 12 months"]];
  h+='<div class="sxc" data-for="rp" style="margin-top:6px">'+chips.map(function(c){return '<button data-v="'+c[0]+'" class="'+(S.rp===c[0]||(c[0]==="this"&&!S.rp)?'on':'')+'" data-rpchip="1">'+c[1]+'</button>'}).join('')+'</div>';
  if(S.rp==="next")return h+forecastView(1);
  if(S.rp==="year")return h+forecastView(12);
  var off=S.rp==="last"?-1:0,key=monthKey(off),items=txIn(key),Lc=items.filter(isCount);
  var label=plabel(off);
  var RX=expenseSplit(Lc,iso(pdate(off)),iso(pend(off))),spent=RX.total,rec=sum(Lc,"in");
  var pOff=off-1,pItems=txIn(monthKey(pOff)).filter(isCount),pRX=expenseSplit(pItems,iso(pdate(pOff)),iso(pend(pOff))),pSpent=pRX.total,pRec=sum(pItems,"in"),pHas=pItems.length>0,pm=pdate(pOff).toLocaleString("en-IN",{month:"short"});
  var kept=rec-spent,pct=rec>0?Math.round(kept/rec*100):0,usedPct=rec>0?Math.max(0,Math.min(100,Math.round(spent/rec*100))):100;
  var dl=function(c,p,good){if(!pHas||!p)return '';var d=Math.round(c-p);if(!d)return '';var up=d>0,ok=(up===good);return '<small class="dlt '+(ok?'dg1':'db1')+'">'+(up?'▲ ':'▼ ')+money(Math.abs(d))+' vs '+esc(pm)+'</small>'};
  h+='<div class="hero2"><div class="hp"><span>'+esc(label)+'</span>'+(off===0?'<em>So far</em>':'')+'</div><small>Total expenses</small><div class="hb">'+money(Math.round(spent))+'</div><div class="hbar"><i style="width:'+usedPct+'%"></i></div><div class="hk">'+(rec>0?(kept>=0?'You kept <b>'+pct+'%</b> · '+money(Math.round(kept))+' left over':'Spent <b>'+money(Math.round(-kept))+'</b> more than received'):'No money received yet')+'</div></div>';
  h+='<div class="grid"><div class="card"><div class="mute">Money received</div><div class="big in">'+money(Math.round(rec))+'</div>'+dl(rec,pRec,true)+'</div><div class="card"><div class="mute">Left over</div><div class="big '+(kept>=0?"in":"out")+'">'+money(Math.round(kept))+'</div>'+dl(kept,pRec-pSpent,true)+'</div></div>';
  h+=mandBlock(RX);
  h+=trfBlock(items);
  var by=RX.by,pby=expenseSplit(txIn(monthKey(off-1)).filter(isCount),iso(pdate(off-1)),iso(pend(off-1))).by;
  var ks=Object.keys(by).sort(function(a,b){return by[b]-by[a]});
  var tot=ks.reduce(function(a,k){return a+by[k]},0);
  if(tot>0)h+='<h2>Where the money goes</h2><div class="card">'+donut(by,tot,pby,off===0?"last month":"the month before")+'</div>';
  h+=loanBlocks();
  h+=catBars(off);
  h+=compareMonths();
  h+=whoSpent(Lc,RX,{X:{by:pby}});
  h+=topPayees(RX);
  return h;
}
function vPlan(){
  var h='<h1>Plan</h1>';
  if(S.planErr)h+='<div class="card out">'+esc(S.planErr)+'<div class="note">Run the setup SQL in Supabase, then reload this page.</div></div>';
  var bm={};S.budgets.forEach(function(b){bm[b.category]=Number(b.amount)});var sp=spentThisMonth(),spp=spentByPerson();
  h+='<div class="card">'+sxHead('👛','Monthly budgets','Shared with your family · this month')+'<div class="note" style="margin:0 0 10px">Everyone in the family sees these budgets.</div>';
  S.newBud=S.newBud||{};
  var bl=CATS.filter(function(c){return !NOBUDGET[c]&&(bm[c]>0||S.newBud[c]!=null)});
  if(!bl.length)h+='<div class="empty"><span class="ei">👛</span>No budgets yet<div class="note">Tap Add Budget to set a monthly limit for a category.</div></div>';
  bl.forEach(function(c){
    var a=S.newBud[c]!=null?S.newBud[c]:bm[c],s=sp[c]||0;
    h+='<div class="swp" style="margin-bottom:10px;border-radius:0"><div class="swa" data-sw="bud|'+encodeURIComponent(c)+'|'+encodeURIComponent(c)+'">Delete</div><div class="swc"><div class="row"><span style="display:flex;align-items:center"><span class="ico" style="background:'+tint(c)+'">'+ci(c)+'</span>'+esc(c)+'</span><input data-bud="'+esc(c)+'" type="number" inputmode="numeric" placeholder="Budget" value="'+a+'" style="width:120px;margin:0"></div>';
    if(a)h+=budBar(Number(a),spp[c]||{});
    h+='</div></div>'});
  h+='<button class="btn ghost" id="addbud" style="margin-top:6px">＋ Add Budget</button>'+(bl.length?'<button class="btn" id="svb">Save Budget</button>':'<span id="svb" style="display:none"></span>')+'<div class="note">Only payments with a category count against a budget.</div></div>';
  h+='<div class="card">'+sxHead('📌','Fixed expenses','Home loan, school fees…');
  if(S.fixed.length){var fxm=0;S.fixed.forEach(function(f){var a=Number(f.amount)||0;fxm+=f.freq==="quarterly"?a/3:f.freq==="yearly"?a/12:a});h+='<div style="background:linear-gradient(135deg,#7a4ae8,#4a22a0);border-radius:18px;padding:14px 16px;color:#fff;margin:6px 0 10px"><div style="font-size:13px;opacity:.85">Every month</div><div style="font-size:26px;font-weight:800">'+money(Math.round(fxm))+'</div><div style="font-size:12.5px;opacity:.9">'+S.fixed.length+(S.fixed.length===1?' item':' items')+'</div></div>'}
  if(!S.fixed.length)h+='<span class="mute">None added yet.</span>';
  S.fixed.forEach(function(f){h+='<div class="swp" style="margin:6px 0"><div class="swa" data-sw="fixed|'+f.id+'|'+encodeURIComponent(f.name)+'">Delete</div><div class="swc"><div class="row" style="padding:4px 0"><span style="display:flex;align-items:center;min-width:0"'+(S.fxe?' data-fedit="'+f.id+'"':'')+'><span class="ico" style="background:'+tint(f.category||f.name)+'">'+ci(f.category||f.name)+'</span><span>'+esc(f.name)+'<div class="mute">'+(f.freq==="monthly"?"monthly":f.freq)+', day '+f.day+(f.category?' · '+esc(f.category):'')+'</div></span></span><span style="display:flex;align-items:center;gap:8px"><b>'+money(f.amount)+'</b>'+(S.fxe?'<span class="go" style="color:var(--acc);font-size:22px;line-height:1">›</span>':'')+'<button class="alink" data-rem="'+f.id+'" aria-label="Reminder" style="font-size:20px;line-height:1;opacity:'+(remOn(f.id)?'1':'.35')+'">'+(remOn(f.id)?'🔔':'🔕')+'</button></span></div></div></div>'});
  if(S.fixed.length)h+='<div class="note">Tap the bell on an expense to get a reminder at 8:00 am on its due day. You get one notification a day, even if several bills are due.'+(nativeApp()?'':' Reminders work only inside the Gharwise Android app.')+'</div>';
  h+='<button class="btn" id="fxopen" data-fxopen="1" style="margin-top:12px">'+(S.fxadd?'✕ Close':'＋ Add Fixed Expense')+'</button><div id="fxform" style="display:'+(S.fxadd?'block':'none')+'"><div class="fsub">Add a fixed expense</div><input id="fn" placeholder="Name (e.g. Home loan EMI)"><input id="fa" type="number" inputmode="decimal" placeholder="Amount"><input id="fd" type="number" inputmode="numeric" placeholder="Day of month (1-31)"><select id="ff"><option value="monthly">Every month</option><option value="quarterly">Every 3 months</option><option value="yearly">Once a year</option></select><div id="fmw" style="display:none"><div class="mute">Month it is due</div><select id="fm">';
  for(var m=1;m<=12;m++)h+='<option value="'+m+'">'+new Date(2026,m-1,1).toLocaleString("en-IN",{month:"long"})+'</option>';
  h+='</select></div><div class="mute">Category</div><select id="fc"><option value="">No category</option>';
  CATS.filter(function(c){return !NOBUD[c]}).forEach(function(c){h+='<option>'+esc(c)+'</option>'});
  h+='</select><label style="display:flex;align-items:center;gap:8px;margin:2px 0 10px"><input type="checkbox" id="fr" style="width:auto;margin:0"> <span>Remind me on the due day</span></label><button class="btn" id="fadd">Add Fixed Expense</button></div>'+(S.fixed.length?'<button class="btn ghost" id="fxe" style="margin-top:8px">'+(S.fxe?'Done Editing':'Edit Fixed Expenses')+'</button>'+(S.fxe?'<div class="note">Tap an expense above to change it.</div>':''):'')+'<div class="note">Fixed items feed your forecast.</div></div>';
  return h;
}
function salaryDay(){
  var mine=S.txns.filter(function(t){return t.type==="in"&&t.txn_date&&t.person===S.name});
  var c=mine.filter(function(t){return t.category==="Salary / Income"});
  if(!c.length){var lim=iso(new Date(Date.now()-90*864e5));c=mine.filter(function(t){return isCount(t)&&t.txn_date>=lim}).sort(function(a,b){return b.amount-a.amount}).slice(0,1)}
  if(!c.length)return null;
  c.sort(function(a,b){return a.txn_date<b.txn_date?1:-1});var t=c[0];
  return {day:Number(t.txn_date.slice(8,10)),amount:t.amount,date:t.txn_date}}
function leftOver(){
  var pf=S.pf;S.pf="__both";var key=monthKey(0),Lc=S.txns.filter(function(t){return pkey(t.txn_date)===key&&isCount(t)});
  var X=expenseSplit(Lc,iso(pdate(0)),iso(pend(0))),r=sum(Lc,"in");S.pf=pf;return {rec:r,spent:X.total,left:r-X.total}}
function goalCalc(g){
  var tg=Number(g.target)||0,sv=Number(g.saved)||0,rem=Math.max(0,tg-sv),ml=0,pm=0;
  if(g.due){var n=new Date(),d=new Date(g.due+"T00:00:00");ml=Math.max(1,Math.ceil((d-n)/(30.44*864e5)));if(d<n)ml=0}
  if(rem>0)pm=ml>0?rem/ml:rem;
  var plan=goalPlan(g);
  if(g.due&&plan.N){var dd=new Date(g.due+"T00:00:00"),nn=new Date(),after=(dd.getFullYear()-nn.getFullYear())*12+dd.getMonth()-nn.getMonth(),ck=ym(nn),cur=0;
    (S.gents||[]).forEach(function(e){if(e.goal_id===g.id&&String(e.created_at||"").slice(0,7)===ck)cur+=Number(e.amount)});
    ml=cur>0?Math.max(0,after):Math.max(0,after)+1;if(dd<nn)ml=0;
    var elapsed=Math.max(0,plan.N-Math.max(0,after)),behind=plan.mt*elapsed-(sv-plan.initial);
    plan.cur=cur;plan.behind=behind}
  if(plan.mt>0&&rem>0&&ml>0)pm=plan.mt;
  return {tg:tg,sv:sv,rem:rem,ml:ml,pm:pm,mt:plan.mt,N:plan.N,initial:plan.initial,behind:plan.behind||0,cur:plan.cur||0,pct:tg>0?Math.min(100,Math.round(sv/tg*100)):0}}
function goalPlan(g){
  var tg=Number(g.target)||0,sv=Number(g.saved)||0;
  if(!g.due||!Array.isArray(S.gents))return {mt:0,N:0,initial:0};
  var sumE=0;S.gents.forEach(function(e){if(e.goal_id===g.id)sumE+=Number(e.amount)});
  var initial=Math.max(0,sv-sumE),start=new Date(g.created_at||Date.now()),N=Math.max(1,Math.ceil((new Date(g.due+"T00:00:00")-start)/(30.44*864e5)));
  return {mt:Math.max(0,(tg-initial)/N),N:N,initial:initial}}
function goalMonthly(g){
  if(S.gents===null)return '<div class="note">Run the updated goals.sql in Supabase to track savings month by month.</div>';
  var ents=S.gents.filter(function(e){return e.goal_id===g.id}),c=goalCalc(g),sumE=0;ents.forEach(function(e){sumE+=Number(e.amount)});
  var start=new Date(g.created_at||Date.now()),now=new Date(),mt=c.mt||0;
  var months=[],y=start.getFullYear(),m=start.getMonth();
  while(y<now.getFullYear()||(y===now.getFullYear()&&m<=now.getMonth())){months.push([y,m]);m++;if(m>11){m=0;y++}}
  months=months.slice(-6);
  var h='<div class="mute" style="margin-top:12px">Saved each month'+(mt>0?' (target about '+money(mt)+' a month)':'')+'</div>';
  months.forEach(function(mm){var key=mm[0]+"-"+pad(mm[1]+1),amt=0;
    ents.forEach(function(e){if(String(e.created_at||"").slice(0,7)===key)amt+=Number(e.amount)});
    var pct=mt>0?Math.round(amt/mt*100):null,label=new Date(mm[0],mm[1],1).toLocaleString("en-IN",{month:"short",year:"2-digit"});
    var w=pct===null?(amt>0?100:0):Math.min(100,pct);
    h+='<div style="margin:6px 0"><div class="row"><span>'+label+'</span><b>'+money(amt)+(pct===null?'':' · '+pct+'%')+'</b></div><div class="bar"><i style="width:'+w+'%"></i></div></div>'});
  if(!g.due)h+='<div class="note">Add a target date to a new goal to see each month as a percentage of what you need.</div>';
  return h;
}
function vGoals(){
  var h='<h1>Goals</h1>';
  if(S.goalErr)h+='<div class="card out">'+esc(S.goalErr)+'<div class="note">Run the Goals SQL in Supabase, then reload this page.</div></div>';
  var need=0;S.goals.forEach(function(g){need+=goalCalc(g).pm});
  var lo=leftOver();
  if(S.goals.length)h+='<div class="hero2"><div class="hp"><span>🎯 Savings goals</span><em>'+S.goals.length+' goal'+(S.goals.length>1?'s':'')+'</em></div><small>Needed each month</small><div class="hb">'+money(Math.round(need))+'</div><div class="hk">Left over this month <b>'+(lo.left<0?'−':'')+money(Math.abs(Math.round(lo.left)))+'</b></div></div><div class="note" style="margin:-4px 4px 12px">Left over = both our income minus total expenses, this month so far.</div>';
  if(!S.goals.length&&!S.goalErr)h+='<div class="card mute">No goals yet. Add one below, for example a car, a holiday or an emergency fund.</div>';
  S.goals.forEach(function(g){var c=goalCalc(g),done=c.rem===0;
    h+='<div class="swp card0"><div class="swa" data-sw="goal|'+g.id+'|'+encodeURIComponent(g.name)+'">Delete</div><div class="swc"><div class="card"><div class="row" style="margin-bottom:10px"><span style="display:flex;align-items:center;min-width:0"><span class="ico" style="background:'+tint(g.name)+'">🎯</span><b>'+esc(g.name)+'</b></span><span class="pill2">'+c.pct+'%</span></div><div class="bar" style="height:12px"><i style="width:'+c.pct+'%"></i></div><div class="row" style="margin-top:6px"><span>'+money(c.sv)+' of '+money(c.tg)+'</span></div>';
    h+='<div class="note">'+(done?'Goal reached 🎉':(g.due?'Target '+esc(g.due)+' · '+(c.ml>0?c.ml+' month'+(c.ml>1?'s':'')+' left · save <b>'+money(c.pm)+'</b> a month (fixed)':'date has passed · '+money(c.rem)+' still to go'):money(c.rem)+' still to go'))+'</div>';
    var cur=0,ck=ym(new Date());(S.gents||[]).forEach(function(e){if(e.goal_id===g.id&&String(e.created_at||"").slice(0,7)===ck)cur+=Number(e.amount)});
    if(c.mt>0&&!done)h+='<div class="note">This month: saved '+money(cur)+' of '+money(c.mt)+(cur>=c.mt?' ✓':' · <b>'+money(c.mt-cur)+'</b> to go')+'</div><div class="note">'+(c.behind>1?'Behind plan by <b class="out">'+money(c.behind)+'</b> so far':(c.behind<-1?'Ahead of plan by <b class="in">'+money(-c.behind)+'</b>':'On plan'))+' · the monthly amount stays '+money(c.mt)+'</div>';
    h+=goalMonthly(g)+'<button class="btn ghost s" style="margin-top:8px" data-gm="'+g.id+'">+ Add money</button></div></div></div>'});
  h+='<div class="card">'+sxHead('➕','New goal','Name it, set a target, save towards it')+'<input id="gn" placeholder="Goal name (e.g. Car, Goa trip)"><input id="gt" type="number" inputmode="decimal" placeholder="Target amount"><input id="gs" type="number" inputmode="decimal" placeholder="Already saved (optional)"><div class="mute">Target date (optional)</div><input id="gdt" type="date"><button class="btn" id="gadd">Add goal</button><div class="note">Goals are shared. The app only tracks savings. It does not move money.</div></div>';
  return h;
}
