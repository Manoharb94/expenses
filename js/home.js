function vDash(){
  if(S.range!=="month")preset("month");
  var L=S.txns.filter(inRange),Lc=L.filter(isCount),pdt=periodDates(),X=expenseSplit(Lc,pdt.from,pdt.to),P=prevInfo(),F=flowCalc(L,Lc,X);
  var pendN=S.txns.filter(function(t){return personOK(t)&&!t.category&&t.type==="out"}).length;
  var h=topbar("Gharwise")+personChips();
  if((S.jrs||[]).length)h+='<div class="dc" style="border:1.5px solid var(--acc)"><b style="font-size:17px">👥 '+esc(S.jrs[0].name||"Someone")+(S.jrs.length>1?' and '+(S.jrs.length-1)+' more want':' wants')+' to join your family</b><div class="note" style="margin:6px 0 10px">Review the request in Family Sync.</div><button class="btn" data-go="fam" style="margin:0">Review Request</button></div>';
  if(S.err)h+='<div class="card out">'+esc(S.err)+'</div>';
  (S.invites||[]).forEach(function(x){h+='<div class="dc" style="border:2px solid var(--acc)"><b>👪 '+esc(x.by)+' invited you to '+esc(x.family)+'</b><div class="note" style="margin:4px 0 12px">Joining moves your own payments into that family, and you’ll see each other’s spending'+(x.can_edit?'':' (view only)')+'.</div><div class="row" style="gap:8px;justify-content:flex-start"><button class="btn s" data-inv="acc|'+x.id+'|'+esc(x.family)+'">Join</button><button class="btn ghost s" data-inv="dec|'+x.id+'|">Decline</button></div></div>'});
  if(pendN)h+='<button class="dc warnc tap" data-go="list" data-ltab="none" style="width:100%;border:0;font:inherit;color:var(--ink)"><span>🏷️ <b>'+pendN+'</b> payment'+(pendN>1?'s need':' needs')+' a category</span><span class="arr">→</span></button>';
  if(typeof suggestBlock==="function")h+=suggestBlock();
  if(typeof gsCard==="function")h+=gsCard();
  h+=expCard(X,P,F);
  h+=insightBlock(X,Lc,pdt);
  var rec=S.txns.filter(function(t){return personOK(t)&&privOK(t)}).slice().sort(byNew).slice(0,5);
  h+='<div class="dc"><div class="dch" data-go="list"><b>Latest transactions</b><span class="arr">→</span></div>';
  if(!rec.length&&!S.loaded)h+=skBox(6);
  else if(!rec.length)h+='<div class="empty"><span class="ei">🧾</span>'+(S.loaded?'No transactions yet':'')+'<button class="obtn" data-go="track">Set up automatic tracking</button></div>';
  else h+='<div style="margin-top:6px">'+rec.map(miniRow).join('')+'</div>';
  if(S.loaded)h+='<button class="obtn" data-go="stmt" style="display:flex;align-items:center;justify-content:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Import</button>';
  h+='</div>';
  var ps=(S.pf&&S.pf!=="__both")?[S.pf]:persons(),bals=ps.map(acctBal).filter(Boolean),bt=0;bals.forEach(function(b){bt+=b.bal});
  var bd=billsDue(30);
  h+='<div class="dc"><div class="dch" data-go="plan"><b>Bills due</b><span class="arr">→</span></div>';
  if(!bd.length)h+='<div class="empty"><span class="ei">⏰</span>No bills in the next 30 days</div><button class="obtn" data-go="plan" data-bfocus="#fn">+ Add bill</button>';
  else bd.slice(0,4).forEach(function(x){h+='<div class="lt" data-go="plan"><span class="ico" style="background:'+tint(x.f.category)+'">'+ci(x.f.category)+'</span><div class="m"><b>'+esc(x.f.name)+'</b><span>'+(x.diff===0?'Due today':x.diff===1?'Due tomorrow':'In '+x.diff+' days · '+x.d.toLocaleString("en-IN",{day:"numeric",month:"short"}))+'</span></div><b>'+money(x.f.amount)+'</b></div>'});
  h+='</div>';
  var evR=evRange(),more=unplannedBlock(Lc)+cardBlock(evR.L,evR.label)+trfBlock(L)+lendBlock()+(typeof groupsBlock==="function"?groupsBlock():'');
  var people={};Lc.forEach(function(t){var p=t.person||"?";(people[p]=people[p]||[]).push(t)});
  if(S.pf==="__both"&&Object.keys(people).length>1){more+='<h2>By person</h2><div class="grid">';
    Object.keys(people).forEach(function(p){more+='<div class="card"><div class="mute">'+esc(p)+(p===S.name?" (you)":"")+'</div><div style="font-size:20px;font-weight:700" class="out">'+money(sum(people[p],"out"))+'</div><div class="mute">received '+money(sum(people[p],"in"))+'</div></div>'});
    more+='</div>'}
  if(more)h+=more;
  h+='<div class="dc"><b style="font-size:18px">Control center</b><div class="cc">'+
    [["track","✨","Automated Tracking","rgba(60,130,255,.20)"],["fam","👥","Family Sync","rgba(140,100,255,.20)"],["goals","🎯","Goals","rgba(240,80,150,.20)"],["set","⚙️","Settings","rgba(120,130,150,.20)"],["menu","☰","More","rgba(255,150,40,.22)"]].map(function(x){return '<button data-go="'+x[0]+'"><i style="background:'+x[3]+'">'+x[1]+'</i>'+x[2]+'</button>'}).join('')+'</div></div>';
  return h}
function vTx(){
  var q=(S.lq||"").toLowerCase().trim(),key=monthKey(S.lm),lab=q?"All months":plabel(S.lm),items=(q?S.txns.filter(function(t){return personOK(t)&&privOK(t)}):txIn(key).filter(privOK));
  var G={out:items.filter(function(t){return t.type==="out"&&isCount(t)}),in:items.filter(function(t){return t.type==="in"&&isCount(t)}),oth:items.filter(function(t){return !isCount(t)}),none:items.filter(function(t){return !t.category})};
  var lt=G[S.lt]?S.lt:"out",F=G[lt].slice().sort(byNew);
  if(q){var qa=q.replace(/[₹,\s]/g,""),isNum=/^[\d.]+$/.test(qa);
    F=items.filter(function(t){if((t.merchant||"").toLowerCase().indexOf(q)>=0)return true;if(isNum){var a=Number(t.amount);return String(a).indexOf(qa)>=0||a.toFixed(2).indexOf(qa)>=0}return false}).sort(byNew)}
  S._lastF=F;var SH=F.length>200?F.slice(0,200):F;
  var h='<div class="lh"><div class="lhm"><button data-lm="-1" aria-label="Previous month"'+(q?' disabled':'')+'>'+IC.back+'</button><b>'+esc(lab)+'</b><button data-lm="1" aria-label="Next month"'+(S.lm>=0||q?' disabled':'')+' style="transform:scaleX(-1)">'+IC.back+'</button><button id="lsrch" aria-label="Search">'+IC.search+'</button><button id="csvb" aria-label="Export">'+IC.share+'</button></div>'+
    (q?'':'<div class="lht">'+[["out","Expenses"],["in","Income"],["oth","Others"]].map(function(x){return '<button data-ltab="'+x[0]+'" class="'+(lt===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div>')+'</div>';
  h+='<input id="lq" type="search" placeholder="🔍 Search payee or amount" autocomplete="off" value="'+esc(S.lq||"")+'" style="margin-bottom:12px">';
  h+=personChips();
  if(!q&&G.none.length&&lt!=="none")h+='<button class="nrow" data-ltab="none"><span>🏷️ <b>'+G.none.length+'</b> need a category</span><em>Sort →</em></button>';
  if(!q&&lt==="none")h+='<button class="tab on" data-ltab="out" style="margin-bottom:10px">🏷️ Needs a category · show all</button>';
  var tot=lt==="in"?sum(F,"in"):lt==="oth"?null:sum(F,"out");
  h+='<div class="ltot'+(q||tot===null?'':' big')+'">'+(!q&&tot!==null?'<b>'+money(Math.round(tot))+'</b><small>'+(lt==="in"?'received':'spent')+' this period</small>':'')+(q?'RESULTS · '+F.length+' payment'+(F.length===1?'':'s')+' · out '+money(sum(F,"out"))+' · in '+money(sum(F,"in")):(tot===null?esc(lab)+' · in '+money(sum(F,"in"))+' · out '+money(sum(F,"out")):''))+'</div>';
  if(!q&&lt==="oth")h+='<div class="note" style="margin:-4px 0 10px;text-align:center">Transfers between you, lending, card bill payments and ignored items. They do not count as spending.</div>';
  if(!F.length)h+='<div class="empty" style="padding:40px 0"><span class="ei">🧾</span>'+(q?'Nothing matches “'+esc(q)+'”':'No '+(lt==="in"?'income':lt==="oth"?'other':lt==="none"?'uncategorised':'expense')+' transactions for '+esc(lab))+'</div>';
  else{var last=null;h+='<div class="swh">Tap a payment to choose its category. Swipe left to delete.</div>';
    var dtot={};SH.forEach(function(t){if(isCount(t)&&t.type===(lt==="in"?"in":"out"))dtot[t.txn_date]=(dtot[t.txn_date]||0)+Number(t.amount)});
    SH.forEach(function(t){if(t.txn_date!==last){if(last!==null)h+='</div>';h+='<div class="dg"><span>'+esc(dayLabel(t.txn_date))+'</span>'+(lt!=="oth"&&dtot[t.txn_date]?'<em>'+(lt==="in"?'+':'−')+money(Math.round(dtot[t.txn_date]))+'</em>':'')+'</div><div class="card" style="padding:4px 14px">';last=t.txn_date}h+=txRow(t)});h+='</div>';if(F.length>SH.length)h+='<div class="note" style="text-align:center;margin:10px 0">Showing the newest 200 of '+F.length+'. Type more to narrow it down.</div>'}
  return h}
function vBudget(){
  var bm={};S.budgets.forEach(function(b){bm[b.category]=Number(b.amount)});var sp=spentThisMonth(),tb=0,ts=0;
  Object.keys(bm).forEach(function(c){if(bm[c]>0){tb+=bm[c];ts+=sp[c]||0}});
  var dl=Math.max(0,Math.ceil((pend(0)-new Date())/864e5));
  var heroB='<div class="hero2"><div class="hp"><span>👛 Monthly budget</span><em>'+dl+' day'+(dl===1?'':'s')+' left</em></div>'+(tb?'<small>'+(ts>tb?'Over budget by':'Left to spend')+'</small><div class="hb">'+money(Math.round(Math.abs(tb-ts)))+'</div><div class="hbar"><i style="width:'+Math.min(100,Math.round(ts/tb*100))+'%;'+(ts>tb?'background:#ffb4b4':'')+'"></i></div><div class="hk">'+money(Math.round(ts))+' spent of '+money(tb)+' · '+esc(plabel(0))+'</div>':'<div class="hb" style="font-size:22px">No budget set yet</div><div class="hk">Tap a category below to set one.</div>')+'</div>';
  var h=topbar("Budget",0,1);
  h+=starterCard();h+=loanBudgetCards();
  var ch='<div class="dc"><b style="font-size:18px">Categories</b><div class="note" style="margin:2px 0 10px">Spent this month. Tap one to add or change its budget. Press and hold to delete it.</div><input id="bq" type="search" placeholder="🔍 Search categories" autocomplete="off" value="'+esc(S.bq||"")+'" style="margin-bottom:12px"><div class="cgrid">';
  var bq=(S.bq||"").toLowerCase().trim(),bn=0;
  CATS.filter(function(c){return !NOBUDGET[c]&&(!bq||c.toLowerCase().indexOf(bq)>=0)}).forEach(function(c){bn++;var s=sp[c]||0,a=bm[c]||0;
    ch+='<button data-bfocus="'+esc(c)+'" data-lp="cat|'+encodeURIComponent(c)+'|"><i class="'+(a&&s>a?'ov':'')+'" style="background:'+tint(c)+'">'+ci(c)+'</i>'+esc(c)+'<small>'+(s?money(Math.round(s)):'—')+(a?' / '+money(a):'')+'</small></button>'});
  ch+='<button id="bnew" style="border-style:dashed"><i>＋</i>'+(bq&&!bn?'Add “'+esc(S.bq.trim())+'”':'New category')+'<small>Add your own</small></button></div>'+(bq&&!bn?'<div class="note" style="margin-top:10px">No category matches. Tap ＋ to add it.</div>':'')+'</div>';
  var pl=vPlan().replace('<h1>Plan</h1>','');
  if(S.profile&&S.profile.can_edit===false){pl=pl.replace(/<input /g,'<input disabled ').replace(/<select /g,'<select disabled ').replace('id="svb"','id="svb" style="display:none"').replace('id="addbud"','id="addbud" style="display:none"').replace('id="fadd"','id="fadd" style="display:none"').replace(/data-fedit="/g,'data-nofedit="').replace(/data-sw="fixed\|/g,'data-nosw="');h+='<div class="card" style="text-align:center">👁 View only. Ask the family owner for edit access to change budgets and bills.</div>'}
  return h+heroB+pl+ch+'<button class="obtn" data-go="rep" data-rp="next">See next month’s forecast →</button>'}
