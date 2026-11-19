/* ----- Home: groups block, suggestions ----- */
function groupsBlock(){if(!gOKUI()){return GR.err?'<h2>Groups</h2><div class="card"><div class="note" style="margin:0 0 8px">Groups could not load: '+esc(GR.err)+'</div><button class="btn ghost s" data-gretry="1">Try again</button></div>':''}
  var gs=gList().filter(function(g){return !g.closed}),cl=gList().length-gs.length,me=myId();
  var h='<h2>Groups <span class="mute" style="font-weight:400;font-size:12px">shared with friends</span></h2><div class="card fc grp" id="grpcard">';
  if(!gs.length){h+='<div class="fcr"><div class="fci g">🧳</div><div><b>Trips or a shared flat?</b><div class="note">Split payments with friends and settle up with real payments.</div></div></div><div class="fchips"><button class="fchip p" data-gnew="Trip">✈️ Trip</button><button class="fchip" data-gnew="Flat">🏠 Flat</button><button class="fchip" data-gnew="Friends">🍽️ Friends</button><button class="fchip" data-gnew="Other">＋ Other</button></div>';
    if(cl)h+='<button class="fcl" data-go="grps" style="margin-left:0">All groups · '+cl+' closed</button>';return h+'</div>'}
  var pal=["#6d3fd8","#1f8a5b","#e08a1e","#c4372c","#2a5bd7","#0f8b9c"];
  h+='<div class="gtl">';
  gs.slice(0,8).forEach(function(g){var n=gMyNet(g),c=n>0.49?'var(--in)':n<-0.49?'var(--out)':'var(--line)',lab=n>0.49?'You get '+money(n):n<-0.49?'You owe '+money(-n):'Settled';
    h+='<button class="gt" data-gopen="'+g.id+'" style="--c:'+c+'">'+gIcon(g,44)+'<b>'+esc(g.name)+'</b><small style="color:'+(n>0.49?'var(--in)':n<-0.49?'var(--out)':'var(--mute)')+'">'+lab+'</small><span class="gav">'+g.members.slice(0,3).map(function(m,i){return '<i style="background:'+pal[i%pal.length]+'">'+esc(String(m.name||"?").charAt(0).toUpperCase())+'</i>'}).join("")+(g.members.length>3?'<i style="background:var(--mute)">+'+(g.members.length-3)+'</i>':'')+'</span></button>'});
  h+='<button class="gt new" data-gnew="1"><span><span style="font-size:26px;display:block">＋</span>New group</span></button></div>';
  if(gs.length>8||cl)h+='<button class="fcl" data-go="grps" style="margin-left:2px">All groups'+(cl?' · '+cl+' closed':'')+'</button>';
  return h+'</div>'}
function vGroups(){var h=topbar("Groups","menu");if(!gOKUI())return h+'<div class="card"><div class="note">Groups will be available after the next update.</div></div>';
  var op=gList().filter(function(g){return !g.closed}),cl=gList().filter(function(g){return g.closed});
  var row=function(g){var n=gMyNet(g);return '<button class="mr" data-gopen="'+g.id+'" style="padding:10px 0">'+gIcon(g,44)+'<span><b>'+esc(g.name)+'</b><span><span class="gstk">'+g.members.slice(0,5).map(function(m){return mAv(g,m.user_id,22)}).join('')+'</span>'+g.members.length+' members'+(g.closed?' · closed':'')+'</span></span><b class="'+(n>0.49?'in':n<-0.49?'out':'mute')+'" style="margin-left:auto;text-align:right">'+(n>0.49?'you get '+money(n):n<-0.49?'you owe '+money(-n):'settled')+'</b></button>'};
  h+='<div class="card">'+(op.length?op.map(row).join(""):'<div class="empty"><span class="ei" style="opacity:1">🧳</span><b style="color:var(--ink);font-size:18px">No groups yet</b><div class="note" style="margin:4px 0 6px">Split trips, flat rent and shared bills with friends, then settle up.</div></div>')+'<button class="btn s" data-gnew="1" style="margin-top:10px">＋ Create group</button></div>';
  if(cl.length)h+='<h2>Closed</h2><div class="card">'+cl.map(row).join("")+'</div>';
  return h}

/* matching real payments with pending group debts */
function gDismissed(){try{return JSON.parse(ls("gdis")||"{}")}catch(e){return {}}}
function gAliases(){try{return JSON.parse(ls("gali")||"{}")}catch(e){return {}}}
function gSugg(){var out=[],me=myId(),dis=gDismissed(),ali=gAliases();if(!gOKUI())return out;
  gList().forEach(function(g){var lines=gLines(g);if(!lines.length)return;
    var lo=g.start_date?Date.parse(g.start_date)-31*86400000:Date.now()-25*86400000,hi=g.end_date?Date.parse(g.end_date)+32*86400000:Date.now()+86400000;
    var used={};g.settlements.forEach(function(s){if(s.txn_id)used[s.txn_id]=1});
    S.txns.forEach(function(t){if(t.person!==S.name||!t.txn_date||Date.parse(t.txn_date)<lo||Date.parse(t.txn_date)>hi||dis[t.id]||used[t.id]||isLend(t))return;
      if(t.category&&t.category!==UNC&&t.category!=="Family & Friends"&&t.category!=="Other")return;
      var amt=Number(t.amount),mk=String(t.merchant||"").toLowerCase();if(!mk||amt<1)return;
      var best=null;lines.forEach(function(l){var other=t.type==="out"?(l.from===me?l.to:null):(l.to===me?l.from:null);if(!other)return;
        if(amt>l.amt+0.5)return;var m=gMem(g,other);if(!m)return;
        var tok=String(m.name||"").toLowerCase().split(/\s+/)[0],hit=(tok.length>=3&&mk.indexOf(tok)>=0)||ali[mk]===other;
        (m.upis||[]).forEach(function(u){var lp=String(u).split("@")[0];if(lp.length>=3&&mk.indexOf(lp)>=0)hit=true});
        if(!hit)return;if(g.settlements.some(function(s){return s.from_user===l.from&&s.to_user===l.to&&Math.abs(Number(s.amount)-amt)<0.5&&Math.abs(Date.parse(s.settled_on)-Date.parse(t.txn_date))<=3*86400000}))return;
        var sc=Math.abs(amt-l.amt)<0.5?2:1;if(!best||sc>best.sc)best={g:g,l:l,t:t,sc:sc,other:other,amt:Math.min(amt,l.amt)}});
      if(best)out.push(best)})});
  return out.slice(0,3)}
function suggestBlock(){var s=gSugg();if(!s.length)return '';
  return s.map(function(x,i){var g=x.g,out=x.t.type==="out";
    return '<div class="dc" style="border:1.5px solid var(--acc)"><div class="row" style="gap:10px;align-items:flex-start">'+gIcon(g,34)+'<div style="flex:1;min-width:0"><b>Is this settling '+esc(g.name)+'?</b><div class="note" style="margin:2px 0 8px">'+(out?'You paid ':'')+esc(x.t.merchant||"Payment")+' '+money(Number(x.t.amount))+(out?' · matches “you pay '+esc(gName(g,x.other))+' '+money(x.l.amt)+'”':' · matches “'+esc(gName(g,x.other))+' pays you '+money(x.l.amt)+'”')+'</div><div class="row" style="gap:8px;justify-content:flex-start"><button class="btn s" data-gsy="'+i+'">Yes</button><button class="btn ghost s" data-gsn="'+i+'">No</button></div></div></div></div>'}).join("")}
async function gSuggYes(x){var l=x.l,g=x.g,t=x.t;
  var r=await gCall("group_settle",{p_group:g.id,p_from:l.from,p_to:l.to,p_amount:x.amt,p_date:t.txn_date,p_method:"UPI",p_txn:t.id});
  if(!r.ok)return;
  try{await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:IGN,note:"Group settlement · "+g.name})})}catch(e){}
  var a=gAliases(),mk=String(t.merchant||"").toLowerCase();if(mk){a[mk]=x.other;ls("gali",JSON.stringify(a))}
  toast("Settled ✓");load(true)}

/* ----- bell ----- */
function gEvList(){var me=myId(),lo=Math.max(Date.now()-864e5,Number(ls("gclr")||0));return ((GR.d&&GR.d.events)||[]).filter(function(e){return e.actor!==me&&Date.parse(e.at)>lo})}
function gEvText(e){var t=String(e.text||""),v=/^(added|changed|removed|created|updated|closed|reopened|joined|left)\b/.test(t),fm=function(n){return money(Number(n))};
  t=t.replace(/\s*\((\d+(?:\.\d+)?)\)\s*$/,function(_,n){return " · "+fm(n)}).replace(/\s(\d+(?:\.\d+)?)$/,function(_,n){return " "+fm(n)});
  return (e.name||"Someone")+" "+(v?"":"recorded that ")+t}
function gBellN(){if(!gOKUI())return 0;var d=GR.d||{},n=(d.invites||[]).length;gEvList().forEach(function(e){if(e.id>GR.seen)n++});return n}
function bellHtml(){if(!gOKUI()||!(gList().length||((GR.d&&GR.d.invites)||[]).length))return '';var n=gBellN();
  return '<button class="tbb bellb" data-bell="1" aria-label="Notifications">🔔'+(n?'<b class="bdg">'+(n>9?"9+":n)+'</b>':'')+'</button>'}
function gBell(){var d=GR.d||{},me=myId(),h=gHead("Notifications");
  (d.invites||[]).forEach(function(i){h+='<div class="card" style="border:1.5px solid var(--acc)"><div class="row" style="justify-content:flex-start;gap:12px">'+gAvH(i.by,i.by_photo,PCOL[0],44)+'<div><b>'+esc(i.by)+'</b> asked you to join <b>'+esc(i.group)+'</b></div></div><div class="row" style="gap:8px;margin-top:10px;justify-content:flex-start"><button class="btn s" data-gia="'+i.id+'">Accept</button><button class="btn ghost s out" data-gir="'+i.id+'">Reject</button></div></div>'});
  var ev=gEvList();
  if(!ev.length&&!(d.invites||[]).length)h+='<div class="note">Nothing new. Updates stay for one day.</div>';
  ev.slice(0,25).forEach(function(e){var g=gGet(e.group_id);h+='<div class="mr" style="padding:10px 0;cursor:default">'+(g?gIcon(g,34):'')+'<span><em style="font-style:normal;font-weight:600;display:block">'+esc(gEvText(e))+'</em><span>'+esc(g?g.name:"")+' · '+esc(gWhen(e.at))+'</span></span></div>'});
  if(ev.length)h+='<button class="btn ghost s" id="gclr" style="margin-top:8px">Clear all</button>';
  var sh=gSheet(h);gBindX(sh);var top=(d.events||[])[0];if(top&&top.id>GR.seen){GR.seen=top.id;ls("gseen",String(GR.seen))}
  var cb=sh.querySelector("#gclr");if(cb)cb.onclick=function(){ls("gclr",String(Date.now()));gClose();render()};
  sh.querySelectorAll("[data-gia]").forEach(function(b){b.onclick=async function(){var r=await gCall("group_invite_respond",{p_id:b.dataset.gia,p_accept:true},"You joined the group");if(r.ok){gClose();if(r.r){S.gid=r.r;go("grpv")}else render()}}});
  sh.querySelectorAll("[data-gir]").forEach(function(b){b.onclick=async function(){var r=await gCall("group_invite_respond",{p_id:b.dataset.gir,p_accept:false});if(r.ok){gClose();render()}}})}
function gPopups(){if(!gOKUI()||S.tab!=="home"||document.querySelector("#sheet .sheet"))return;
  var inv=((GR.d&&GR.d.invites)||[]).filter(function(i){return !GR.shown[i.id]})[0];if(!inv)return;GR.shown[inv.id]=1;
  var h='<div style="text-align:center">'+gAvH(inv.by,inv.by_photo,PCOL[0],84)+'<div style="font-size:18px;font-weight:700;margin-top:10px">'+esc(inv.by)+'</div><div class="note" style="margin:6px 0 12px">has asked you to join the group</div><div class="row" style="justify-content:center;gap:10px;margin-bottom:14px">'+gIcon({photo:inv.group_photo},44)+'<b style="font-size:17px">'+esc(inv.group)+'</b></div></div><button class="btn" data-gia="'+inv.id+'">Accept</button><button class="btn ghost out" data-gir="'+inv.id+'" style="margin-top:8px">Reject</button><button class="btn ghost" id="gx" style="margin-top:8px">Later</button>';
  var sh=gSheet(h);gBindX(sh);
  sh.querySelector("[data-gia]").onclick=async function(){var r=await gCall("group_invite_respond",{p_id:inv.id,p_accept:true},"You joined the group");if(r.ok){gClose();if(r.r){S.gid=r.r;go("grpv")}else render()}};
  sh.querySelector("[data-gir]").onclick=async function(){var r=await gCall("group_invite_respond",{p_id:inv.id,p_accept:false});if(r.ok){gClose();render()}}}

/* ----- create / edit group ----- */
function gEditSheet(id,preset){var g=id?gGet(id):null,me=myId(),isC=!g||(g.owner||g.created_by)===me,st={photo:g?g.photo:null,change:false};
  var h=gHead(g?"Edit group":"New group")+'<div style="text-align:center"><div id="gph" style="display:inline-block;cursor:pointer">'+(g?gIcon(g,92):'<span class="gic" style="width:92px;height:92px;font-size:38px;border:2px dashed var(--line)">📷</span>')+'</div><div class="note" style="margin:6px 0 10px"><a id="gphl" style="color:var(--acc);cursor:pointer">'+(g&&g.photo?'Change group photo':'Add group photo')+'</a></div><input type="file" id="gfile" accept="image/*" style="display:none"></div>'+
    '<div class="mute">Group name</div><input id="gnm" maxlength="40" placeholder="e.g. Goa Trip" value="'+esc(g?g.name:(preset||""))+'">';
  if(isC)h+='<div class="mute">Trip dates (optional)</div><div class="row" style="gap:8px"><input id="gsd" type="date" value="'+esc(g&&g.start_date||"")+'" style="margin:0"><input id="ged" type="date" value="'+esc(g&&g.end_date||"")+'" style="margin:0"></div><div class="note" style="margin:4px 0 8px">After the end date, new payments cannot be added to the group.</div>'+
    '<label class="row" style="justify-content:flex-start;gap:10px;margin:8px 0"><input type="checkbox" id="gsm" style="width:auto;margin:0"'+(!g||g.simplify!==false?' checked':'')+'><span><b>Simplify group debts</b><span class="note" style="display:block;margin:0">Fewest payments between members</span></span></label>';
  h+='<button class="btn" id="gok" style="margin-top:10px">'+(g?'Save':'Create group')+'</button>';
  var sh=gSheet(h);gBindX(sh);var f=sh.querySelector("#gfile");
  var ch=function(){f.click()};sh.querySelector("#gph").onclick=ch;sh.querySelector("#gphl").onclick=ch;
  f.onchange=function(){var x=f.files&&f.files[0];f.value="";if(!x)return;cropSheet(x,256,60000,function(d){st.photo=d;st.change=true;var ph=sh.querySelector("#gph");if(ph)ph.innerHTML='<img class="gic" src="'+st.photo+'" style="width:92px;height:92px">'})};
  sh.querySelector("#gok").onclick=async function(){var nm=gv(sh,"gnm").trim();if(!nm){toast("Enter a group name");return}
    var sd=isC?(gv(sh,"gsd")||null):null,ed=isC?(gv(sh,"ged")||null):null,sm=isC?!!sh.querySelector("#gsm").checked:true;
    if(sd&&ed&&ed<sd){toast("The end date is before the start date");return}
    if(!g){var r=await gCall("group_create",{p_name:nm,p_photo:st.photo||null,p_start:sd,p_end:ed,p_simplify:sm});if(r.ok){gClose();S.gid=r.r;go("grpv");setTimeout(function(){gInviteSheet(r.r,true)},250)}}
    else{var r1=await gCall("group_update",{p_group:g.id,p_name:nm,p_photo:st.photo||null,p_change_photo:st.change});if(!r1.ok)return;
      if(isC){var r2_=await gCall("group_settings",{p_group:g.id,p_start:sd,p_end:ed,p_simplify:sm});if(!r2_.ok)return}
      gClose();render();toast("Saved")}}}

/* ----- invite ----- */
function gInviteMsg(g,tok){var me=S.name||"I";return me+" invited you to join the group “"+g.name+"” on Gharwise to split expenses.\n\nOpen this link, install the app and create your account:\n"+APP_URL+"?g="+tok}
function gInviteSheet(id,fresh){var g=gGet(id);if(!g)return;
  var h=gHead(fresh?"Add friends to "+esc(g.name):"Add friend")+'<div class="mute" style="margin-bottom:6px">Friend’s mobile number</div><div class="mobw"><span class="mcc">+91</span><input id="gem" type="tel" inputmode="numeric" maxlength="14" placeholder="Mobile number" autocomplete="off"></div><button class="btn" id="gad">Send Invite</button><div id="gres"></div>';
  if(g.pending&&g.pending.length)h+='<h2 style="margin-top:14px">Waiting to join</h2>'+g.pending.map(function(p){return '<div class="row" style="padding:6px 0"><span>'+esc(p.email||phShow(p.phone))+'</span><span><button class="btn ghost s" data-gw="'+esc(p.token)+'">WhatsApp</button> <button class="btn ghost s out" data-gc="'+p.id+'">Cancel</button></span></div>'}).join("");
  var sh=gSheet(h);gBindX(sh);
  sh.querySelector("#gad").onclick=async function(){var em=gv(sh,"gem").trim();if(!em)return;if(idKind(em)!=="mobile"){toast("Enter a 10-digit mobile number");return}em=phE164(em);var r=await gCall("group_invite",{p_group:id,p_email:em});if(!r.ok)return;var o=r.r||{},res=sh.querySelector("#gres");
    if(o.status==="already"){res.innerHTML='<div class="note" style="margin-top:8px">They are already in this group.</div>';return}
    if(o.status==="invited"){res.innerHTML='<div class="note" style="margin-top:8px;color:var(--in)">Invite sent. They will see it in the bell in their app and can accept or reject.</div>';sh.querySelector("#gem").value="";return}
    res.innerHTML='<div class="note" style="margin-top:8px">No Gharwise account found for '+esc(phShow(em))+'. Send them the link instead. When they sign up, they join the group.</div><div class="row" style="gap:8px;justify-content:flex-start;margin-top:8px"><button class="btn s" id="gwa">💬 Invite via WhatsApp</button><button class="btn ghost s" id="gcl">🔗 Copy link</button></div>';
    var msg=gInviteMsg(g,o.token);sh.querySelector("#gwa").onclick=function(){window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank")};
    sh.querySelector("#gcl").onclick=async function(){toast(await copyText(APP_URL+"?g="+o.token)?"Link copied":"Press and hold to copy: "+APP_URL+"?g="+o.token)}};
  sh.querySelectorAll("[data-gw]").forEach(function(b){b.onclick=function(){window.open("https://wa.me/?text="+encodeURIComponent(gInviteMsg(g,b.dataset.gw)),"_blank")}});
  sh.querySelectorAll("[data-gc]").forEach(function(b){b.onclick=async function(){await gCall("group_cancel_invite",{p_id:b.dataset.gc});gInviteSheet(id)}})}

/* ----- payment in a group: split ----- */
function gEqual(amt,ids){var n=ids.length,per=Math.floor(amt/n*100)/100,o={},tot=0;ids.forEach(function(u,i){o[u]=per;tot+=per});o[ids[0]]=r2(o[ids[0]]+r2(amt-tot));return o}
var GCUR=["INR","USD","EUR","GBP","AED","SGD","THB","IDR","MYR","JPY","AUD","CAD","CHF","SAR","QAR","OMR","KWD","NPR","LKR","BDT","VND","HKD","CNY","KRW","NZD","ZAR","TRY","PHP"];
function gCurOpts(c){var cur=c||"INR",l=GCUR.slice();if(l.indexOf(cur)<0)l.push(cur);return l.map(function(x){return '<option'+(x===cur?' selected':'')+'>'+x+'</option>'}).join("")}
var _rc={};
async function gRate(cur,date){cur=String(cur||"").toUpperCase();if(!cur||cur==="INR")return {rate:1,note:""};var k=cur+"|"+date;if(_rc[k])return _rc[k];
  var today=iso(new Date()),to=function(u){return Promise.race([fetch(u).then(function(r){if(!r.ok)throw new Error("x");return r.json()}),new Promise(function(_,rj){setTimeout(function(){rj(new Error("t"))},6000)})])};
  try{var u="https://api.frankfurter.app/"+(date&&date<today?date:"latest")+"?from="+encodeURIComponent(cur)+"&to=INR",j=await to(u);if(j&&j.rates&&j.rates.INR){return _rc[k]={rate:Math.round(j.rates.INR*10000)/10000,note:"Rate for "+(j.date||date)+". You can edit it."}}}catch(e){}
  try{var j2=await to("https://open.er-api.com/v6/latest/"+encodeURIComponent(cur));if(j2&&j2.rates&&j2.rates.INR){return _rc[k]={rate:Math.round(j2.rates.INR*10000)/10000,note:"Latest rate"+(date&&date<today?" (not the exact day)":"")+". You can edit it."}}}catch(e){}
  return null}
function gExpSheet(o){var g=o.g,e=o.e,t=o.t,me=myId();if(!g)return;
  var canEdit=!e||(e.created_by===me||e.paid_by===me||(g.owner||g.created_by)===me);
  var st={payer:e?e.paid_by:me,mode:e?e.split_mode:"equal",amt:e?Number(e.amount):(t?Number(t.amount):0),title:e?e.title:(t&&t.merchant)||"",date:e?String(e.txn_date).slice(0,10):(t&&t.txn_date)||iso(new Date()),cat:e?(e.cat||""):"",note:e?(e.note||""):((t&&t.note)||""),photo:e?e.photo:(o.photo||null),
    sel:{},val:{},fx:!!(e&&e.orig_cur),cur:e&&e.orig_cur||"",orig:e&&e.orig_amount||"",rate:e&&e.rate||""};
  function fillScan(sc){if(!sc)return;if(sc.amount)st.amt=sc.amount;if(sc.date)st.date=sc.date;if(sc.category&&!st.cat)st.cat=sc.category}
  if(!e&&o.scan)fillScan(o.scan);
  g.members.forEach(function(m){st.sel[m.user_id]=e?(e.shares&&e.shares[m.user_id]!=null&&Number(e.shares[m.user_id])>0):true});
  if(e&&e.split_mode!=="equal")g.members.forEach(function(m){var a=Number((e.shares||{})[m.user_id]||0);st.val[m.user_id]=e.split_mode==="percent"?String(r2(a/Number(e.amount)*100)):String(a||"")});
  function calc(){var ids=g.members.filter(function(m){return st.sel[m.user_id]}).map(function(m){return m.user_id}),A=r2(st.amt),res={ids:ids,shares:{},ok:false,msg:""};
    if(!A||A<=0){res.msg="Enter the amount";return res}if(!ids.length){res.msg="Choose who shares this payment";return res}
    if(st.mode==="equal"){res.shares=gEqual(A,ids);res.ok=true;return res}
    var tot=0;ids.forEach(function(u){tot+=parseFloat(st.val[u])||0});tot=r2(tot);
    if(st.mode==="percent"){if(Math.abs(tot-100)>0.01){res.msg="Percentages add up to "+tot+"% (need 100%)";return res}var run=0;ids.forEach(function(u,i){var a=i===ids.length-1?r2(A-run):r2(A*(parseFloat(st.val[u])||0)/100);run=r2(run+a);res.shares[u]=a});res.ok=true;return res}
    if(Math.abs(tot-A)>0.01){res.msg=money(r2(Math.abs(A-tot)))+(tot>A?" too much":" left to assign");return res}ids.forEach(function(u){res.shares[u]=r2(parseFloat(st.val[u])||0)});res.ok=true;return res}
  async function fetchRate(){var r=await gRate(st.cur,st.date);if(r&&r.rate){st.rate=String(r.rate);st.rmsg=r.note;st.amt=r2((parseFloat(st.orig)||0)*r.rate)}else st.rmsg="Could not get the rate. Type it in.";draw()}
  function draw(keep){var sc=calc(),h=gHead(e?(canEdit?"Edit payment":"Payment"):"Add to "+esc(g.name));
    if(t)h+='<div class="note" style="margin:-4px 0 8px">'+esc(t.merchant||"Payment")+' · '+esc(t.txn_date||"")+'</div>';
    var dis=canEdit?'':' disabled';
    var rb=st.fx?'<div class="row" style="gap:8px;margin-top:8px"><div style="flex:1"><div class="mute">Rate: 1 '+esc(st.cur)+' = ₹</div><input id="xr" type="number" inputmode="decimal" value="'+esc(st.rate)+'"'+dis+' style="margin:0"></div><button class="btn ghost s" id="xrf"'+dis+' style="margin:18px 0 0">↻ Rate</button></div><div class="note" id="xrm">'+(st.orig&&st.rate?'<b>'+esc(st.cur)+' '+esc(st.orig)+' × '+esc(st.rate)+' = '+money(r2(st.orig*st.rate))+'</b> · converted to ₹. ':'Enter the amount. ')+esc(st.rmsg||'')+'</div>':'';
    h+='<div class="mute">What was it</div><input id="xt" maxlength="60" value="'+esc(st.title)+'" placeholder="e.g. Hotel"'+dis+'>'+
      '<div class="row" style="gap:8px"><div style="flex:1.3"><div class="mute">Amount</div><div class="row" style="gap:6px"><select id="xcu" style="margin:0;width:88px"'+(t&&!e?' disabled':dis)+'>'+gCurOpts(st.cur)+'</select><input id="'+(st.fx?'xo':'xa')+'" type="number" inputmode="decimal" value="'+(st.fx?(st.orig||''):(st.amt||''))+'"'+(t&&!e?' disabled':dis)+' style="margin:0;min-width:0"></div></div><div style="flex:1"><div class="mute">Date</div><input id="xd" type="date" value="'+esc(st.date)+'"'+dis+' style="margin:0"></div></div>'+
      rb+'<div class="mute" style="margin-top:8px">Type</div><select id="xc"'+dis+'><option value="">Choose</option>'+GCATS.map(function(c){return '<option'+(c===st.cat?' selected':'')+'>'+c+'</option>'}).join("")+'</select>'+
      '<div class="mute">Paid by</div><select id="xp"'+dis+'>'+g.members.map(function(m){return '<option value="'+m.user_id+'"'+(m.user_id===st.payer?' selected':'')+'>'+esc(m.name)+(m.user_id===me?' (you)':'')+'</option>'}).join("")+'</select>'+
      '<div class="seg2" style="margin-top:6px">'+[["equal","Equal"],["percent","Percent"],["manual","Manual"]].map(function(x){return '<button data-xm="'+x[0]+'" class="'+(st.mode===x[0]?'on':'')+'"'+dis+'>'+x[1]+'</button>'}).join("")+'</div>'+
      '<div class="mute">Split between ('+sc.ids.length+' of '+g.members.length+')</div><div class="card" style="padding:4px 10px;margin-bottom:8px">';
    g.members.forEach(function(m){var on=st.sel[m.user_id],u=m.user_id;
      h+='<div class="row" style="padding:7px 0;gap:8px"><input type="checkbox" data-xs="'+u+'"'+(on?' checked':'')+dis+' style="width:20px;margin:0">'+mAv(g,u,28)+'<span style="flex:1;min-width:0;'+(on?'':'color:var(--mute)')+'">'+esc(m.name)+(u===me?' (you)':'')+'</span>'+
        (st.mode==="equal"?'<b data-xsh="'+u+'">'+(on&&sc.shares[u]!=null?money(sc.shares[u]):money(0))+'</b>':on?'<input data-xv="'+u+'" type="number" inputmode="decimal" value="'+esc(st.val[u]||"")+'" placeholder="'+(st.mode==="percent"?'%':'₹')+'" style="width:92px;margin:0"'+dis+'>':'')+'</div>'});
    h+='</div><div class="note" id="xmsg" style="font-weight:700;'+(sc.ok?'':'color:var(--out)')+'">'+(sc.ok?'Split adds up ✓':esc(sc.msg))+'</div>';
    h+='<div class="row" style="justify-content:flex-start;gap:10px;margin:6px 0">'+(st.photo&&PHOTO_RE.test(st.photo)?'<img src="'+st.photo+'" style="width:64px;height:64px;border-radius:10px;object-fit:cover">':'')+(canEdit?'<button class="btn ghost s" id="xpc">📷 '+(st.photo?'Retake':'Scan')+' Bill</button><button class="btn ghost s" id="xph">🖼️ Choose Photo</button>'+(st.photo?'<button class="btn ghost s out" id="xpr">Remove</button>':'')+'<input type="file" id="xpf" accept="image/*" style="display:none"><input type="file" id="xpf2" accept="image/*" capture="environment" style="display:none">':'')+'</div>';
    if(e)h+='<div class="note">Added by '+esc(e.created_by_name||"")+(e.updated_by_name?' · last changed by '+esc(e.updated_by_name):'')+'</div>';
    if(canEdit)h+='<button class="btn" id="xok" style="margin-top:6px;'+(sc.ok?'':'opacity:.55')+'">'+(e?'Save changes':'Save split')+'</button>'+(e?'<button class="btn ghost out" id="xdel" style="margin-top:8px">Remove from group</button>':'');
    else h+='<div class="note">Only the person who added it, the person who paid, or the group creator can change this.</div>';
    var sh=gSheet(h);gBindX(sh);bind(sh)}
  function bind(sh){
    var re=function(){var sc=calc(),m=sh.querySelector("#xmsg");if(m){m.textContent=sc.ok?"Split adds up ✓":sc.msg;m.style.color=sc.ok?"":"var(--out)"}
      var b=sh.querySelector("#xok");if(b)b.style.opacity=sc.ok?"":".55";
      sh.querySelectorAll("[data-xsh]").forEach(function(x){var u=x.dataset.xsh;x.textContent=money(st.sel[u]&&sc.shares[u]!=null?sc.shares[u]:0)});
      var rm=sh.querySelector("#xrm");if(rm)rm.innerHTML=(st.orig&&st.rate?'<b>'+esc(st.cur)+' '+esc(st.orig)+' × '+esc(st.rate)+' = '+money(r2(st.orig*st.rate))+'</b> · converted to ₹. ':'Enter the amount. ')+esc(st.rmsg||'')};
    var okb=sh.querySelector("#xok");if(okb)okb.onmousedown=function(ev){ev.preventDefault()};
    var rd=function(){st.title=gv(sh,"xt");st.date=gv(sh,"xd")||st.date;st.cat=gv(sh,"xc");st.payer=gv(sh,"xp")||st.payer;
      var cu=gv(sh,"xcu");if(cu){st.cur=cu==="INR"?"":cu;st.fx=!!st.cur}
      if(st.fx){st.orig=gv(sh,"xo");st.rate=gv(sh,"xr");st.amt=r2((parseFloat(st.orig)||0)*(parseFloat(st.rate)||0))}else if(sh.querySelector("#xa")&&!sh.querySelector("#xa").disabled)st.amt=parseFloat(gv(sh,"xa"))||0;
      sh.querySelectorAll("[data-xv]").forEach(function(i){st.val[i.dataset.xv]=i.value})};
    ["xa","xo","xr"].forEach(function(id){var i=sh.querySelector("#"+id);if(i)i.oninput=function(){rd();var sc=calc(),m=sh.querySelector("#xmsg");if(m){m.textContent=sc.ok?"Split adds up ✓":sc.msg;m.style.color=sc.ok?"":"var(--out)"}re()}});
    sh.querySelectorAll("[data-xv]").forEach(function(i){i.oninput=function(){rd();var sc=calc(),m=sh.querySelector("#xmsg");m.textContent=sc.ok?"Split adds up ✓":sc.msg;m.style.color=sc.ok?"":"var(--out)";var b=sh.querySelector("#xok");if(b)b.style.opacity=sc.ok?"":".55"}});
    sh.querySelectorAll("[data-xm]").forEach(function(b){b.onclick=function(){rd();st.mode=b.dataset.xm;draw()}});
    sh.querySelectorAll("[data-xs]").forEach(function(c){c.onchange=function(){rd();st.sel[c.dataset.xs]=c.checked;draw()}});
    var cs=sh.querySelector("#xcu");if(cs)cs.onchange=async function(){var was=st.amt,wasFx=st.fx;rd();if(!st.fx){st.orig="";st.rate="";st.rmsg="";if(wasFx)st.amt=0;draw();return}
      if(!wasFx){st.orig=was?String(was):"";}st.rate="";st.rmsg="Getting today's rate…";draw();await fetchRate()};
    var rf=sh.querySelector("#xrf");if(rf)rf.onclick=async function(){rd();st.rmsg="Getting the rate…";draw();await fetchRate()};
    var xdt=sh.querySelector("#xd");if(xdt)xdt.onchange=async function(){rd();if(st.fx){st.rmsg="Getting the rate…";draw();await fetchRate()}};
    var xp=sh.querySelector("#xph");if(xp){var f=sh.querySelector("#xpf");xp.onclick=function(){f.click()};f.onchange=async function(){var x=f.files&&f.files[0];if(!x)return;rd();try{st.photo=await imgToData(x,900,false,110000);if(!e)fillScan(await scanBillFile(x));draw()}catch(er){ocrBusy();toast(errText(er))}}}
    var xc=sh.querySelector("#xpc");if(xc){var f2=sh.querySelector("#xpf2");xc.onclick=function(){f2.click()};f2.onchange=async function(){var x=f2.files&&f2.files[0];if(!x)return;rd();try{st.photo=await imgToData(x,900,false,110000);if(!e)fillScan(await scanBillFile(x));draw()}catch(er){ocrBusy();toast(errText(er))}}}
    var xr=sh.querySelector("#xpr");if(xr)xr.onclick=function(){rd();st.photo=null;draw()};
    var ok=sh.querySelector("#xok");if(ok)ok.onclick=async function(){rd();var sc=calc();if(!sc.ok){toast(sc.msg);return}
      var body={p_group:g.id,p_id:e?e.id:null,p_txn:t?t.id:(e?e.txn_id:null),p_paid_by:st.payer,p_amount:sc.ids.length?r2(st.amt):0,p_date:st.date,p_title:st.title||(t&&t.merchant)||"Payment",p_mode:st.mode,p_shares:sc.shares,p_note:st.note||null,p_photo:st.photo||null,p_cur:st.fx?(st.cur||null):null,p_orig:st.fx?(parseFloat(st.orig)||null):null,p_rate:st.fx?(parseFloat(st.rate)||null):null,p_cat:st.cat||null};
      ok.disabled=true;var mine=null;
      if(!e&&!t&&st.payer===me&&navigator.onLine!==false){try{var ttl=st.title||"Payment";mine=await saveTxn({amount:r2(st.amt),type:"out",merchant:ttl,merchant_key:mk(ttl),category:g.name,note:st.fx&&st.orig&&st.rate?(st.cur+" "+st.orig+" × "+st.rate):null,txn_date:st.date,person:S.name});if(mine&&mine.id&&!mine._pend)body.p_txn=mine.id;else mine=null}catch(er){mine=null}}
      var r=await gCall("group_save_expense",body,e?"Saved":"Added to "+g.name);if(!r.ok){ok.disabled=false;if(mine&&mine.id){try{await api("transactions?id=eq."+mine.id,{method:"DELETE"});load(true)}catch(er){}}return}
      if(mine)load(true);
      if(o.next){gClose();o.next();return}
      if(t&&!e){try{await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:g.name})})}catch(er){}load(true)}
      gClose();render()};
    var del=sh.querySelector("#xdel");if(del)del.onclick=async function(){if(!confirm("Remove this payment from the group? Everyone's balance changes."))return;var r=await gCall("group_delete_expense",{p_id:e.id},"Removed");if(r.ok){if(e.txn_id){try{await api("transactions?id=eq."+e.txn_id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:null})});load(true)}catch(er){}}gClose();render()}}}
  draw()}

/* ----- settle up ----- */
function gSettleSheet(id,pre){var g=gGet(id);if(!g)return;var me=myId(),lines=gLines(g).filter(function(l){return l.from===me||l.to===me||(g.owner||g.created_by)===me});
  if(!lines.length){toast("Nothing to settle");return}var i0=0;if(pre){lines.forEach(function(l,i){if(l.from===pre.from&&l.to===pre.to)i0=i})}
  var h=gHead("Settle up")+'<div class="mute">Which payment</div><select id="sl">'+lines.map(function(l,i){return '<option value="'+i+'"'+(i===i0?' selected':'')+'>'+esc(gYou(g,l.from))+' → '+esc(gYou(g,l.to))+' · '+money(l.amt)+'</option>'}).join("")+'</select>'+
    '<div class="mute">Amount paid</div><input id="sa" type="number" inputmode="decimal" value="'+lines[i0].amt+'"><div class="mute">How</div><select id="sm"><option>UPI</option><option>Cash</option><option>Bank transfer</option></select><div class="mute">Date</div><input id="sd" type="date" value="'+iso(new Date())+'"><button class="btn" id="sok">Record payment</button><div class="note" style="margin-top:8px">This only records a payment you made outside the app. If it was a UPI payment, Gharwise also suggests settling automatically when it sees the real payment.</div>';
  var sh=gSheet(h);gBindX(sh);sh.querySelector("#sl").onchange=function(){sh.querySelector("#sa").value=lines[+gv(sh,"sl")].amt};
  sh.querySelector("#sok").onclick=async function(){var l=lines[+gv(sh,"sl")],a=parseFloat(gv(sh,"sa"));if(!a||a<=0){toast("Enter an amount");return}
    var r=await gCall("group_settle",{p_group:id,p_from:l.from,p_to:l.to,p_amount:r2(a),p_date:gv(sh,"sd"),p_method:gv(sh,"sm"),p_txn:(pre&&pre.txn)||null},"Recorded ✓");if(r.ok){if(pre&&pre.txn){try{await api("transactions?id=eq."+pre.txn+"&household_id=eq."+S.code,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:IGN,note:"Group settlement · "+g.name})});load(true)}catch(e){}}gClose();render()}}}
function gRemindSheet(g,l){var to=gName(g,l.from),msg="Hi "+to+", a small reminder: "+money(l.amt)+" for "+g.name+" is still pending on Gharwise. Thanks! 🙏";
  var sh=gSheet(gHead("Remind "+esc(to))+'<textarea id="rm" rows="4" style="width:100%">'+esc(msg)+'</textarea><button class="btn" id="rw" style="margin-top:8px;background:#25D366">Send on WhatsApp</button><button class="btn ghost" id="rc" style="margin-top:8px">Copy message</button>');gBindX(sh);
  sh.querySelector("#rw").onclick=function(){window.open("https://wa.me/?text="+encodeURIComponent(gv(sh,"rm")),"_blank")};sh.querySelector("#rc").onclick=async function(){toast(await copyText(gv(sh,"rm"))?"Copied":"Press and hold to copy")}}

/* ----- repeating payments ----- */
function gRecSheet(id,rid){var g=gGet(id),me=myId(),r=rid?g.recurring.filter(function(x){return x.id===rid})[0]:null;if(!g)return;
  var ppl=r?(r.people||[]):g.members.map(function(m){return m.user_id});
  var h=gHead(r?"Edit repeating payment":"Repeating payment")+'<div class="mute">Name</div><input id="rt" maxlength="40" placeholder="Rent, Internet…" value="'+esc(r?r.title:"")+'"><div class="row" style="gap:8px"><div style="flex:1"><div class="mute">Amount</div><input id="ra" type="number" inputmode="decimal" value="'+(r?r.amount:"")+'" style="margin:0"></div><div style="flex:1"><div class="mute">Day of month (1–28)</div><input id="rd" type="number" min="1" max="28" value="'+(r?r.day:1)+'" style="margin:0"></div></div>'+
    '<div class="mute" style="margin-top:8px">Paid by</div><select id="rp">'+g.members.map(function(m){return '<option value="'+m.user_id+'"'+((r?r.paid_by:me)===m.user_id?' selected':'')+'>'+esc(m.name)+'</option>'}).join("")+'</select><div class="mute">Split equally between</div><div class="card" style="padding:4px 10px">'+
    g.members.map(function(m){return '<label class="row" style="justify-content:flex-start;gap:8px;padding:6px 0"><input type="checkbox" data-rs="'+m.user_id+'"'+(ppl.indexOf(m.user_id)>=0?' checked':'')+' style="width:20px;margin:0">'+mAv(g,m.user_id,26)+'<span>'+esc(m.name)+'</span></label>'}).join("")+'</div><div class="note">On the due day, Gharwise asks you to add it with one tap. Nothing is added by itself.</div><button class="btn" id="rok">Save</button>'+(r?'<button class="btn ghost out" id="rdel" style="margin-top:8px">Delete</button>':'');
  var sh=gSheet(h);gBindX(sh);
  sh.querySelector("#rok").onclick=async function(){var ids=[];sh.querySelectorAll("[data-rs]").forEach(function(c){if(c.checked)ids.push(c.dataset.rs)});var a=parseFloat(gv(sh,"ra")),d=parseInt(gv(sh,"rd"),10);
    if(!gv(sh,"rt").trim()||!a||a<=0||!(d>=1&&d<=28)||!ids.length){toast("Fill in the name, amount, a day from 1 to 28, and who shares it");return}
    var x=await gCall("group_rec_save",{p_group:id,p_id:r?r.id:null,p_title:gv(sh,"rt"),p_amount:a,p_day:d,p_mode:"equal",p_people:ids,p_paid_by:gv(sh,"rp")},"Saved");if(x.ok){gClose();render()}};
  var del=sh.querySelector("#rdel");if(del)del.onclick=async function(){if(!confirm("Delete this repeating payment?"))return;var x=await gCall("group_rec_delete",{p_id:r.id});if(x.ok){gClose();render()}}}
function gDue(g){if(g.closed)return [];var now=new Date(),ym=now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2);
  return (g.recurring||[]).filter(function(r){return r.last_month!==ym&&now.getDate()>=r.day})}
async function gDueAdd(g,r){await loadGroups(true);g=gGet(g.id);r=(g.recurring||[]).filter(function(x){return x.id===r.id})[0];if(!r)return;var now=new Date(),ym=now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2);
  if(r.last_month===ym){toast("Already added this month");render();return}
  var ids=(r.people||[]).filter(function(u){return gMem(g,u)});if(!ids.length){toast("Nobody shares this payment any more. Edit it first.");return}
  var res=await gCall("group_save_expense",{p_group:g.id,p_id:null,p_txn:null,p_paid_by:r.paid_by,p_amount:Number(r.amount),p_date:iso(now),p_title:r.title,p_mode:"equal",p_shares:gEqual(Number(r.amount),ids),p_cat:"Rent"},"Added "+r.title);
  if(res.ok){await gCall("group_rec_mark",{p_id:r.id,p_month:ym});render()}}

/* ----- group page ----- */
function gSummary(g){var tot=0,by={},paid={},share={},me=myId();
  g.expenses.forEach(function(e){var a=Number(e.amount);tot+=a;var c=e.cat||"Other";by[c]=(by[c]||0)+a;paid[e.paid_by]=(paid[e.paid_by]||0)+a;var sh=e.shares||{};for(var k in sh)share[k]=(share[k]||0)+Number(sh[k])});
  return {tot:r2(tot),by:by,paid:paid,share:share}}
function gBack(){return S.gfrom==="grps"?"menu":"home"}
function gOptsHtml(g){var me=myId(),isC=(g.owner||g.created_by)===me,nets=gNets(g),lines=gLines(g),sm=gSummary(g),h='';
  h+='<div class="card">'+sxHead('🤝','Who pays whom','The simplest way to settle')+'';
  if(!lines.length)h+='<div class="in"><b>All settled ✓</b></div>';
  lines.forEach(function(l,i){var mine=l.from===me||l.to===me;
    h+='<div class="row" style="padding:8px 0;gap:10px;'+(mine?'background:var(--chip);margin:0 -14px;padding:8px 14px;':'')+'">'+mAv(g,l.from,32)+'<span style="flex:1;min-width:0"><b>'+(l.from===me?'You pay '+esc(gName(g,l.to)):l.to===me?esc(gName(g,l.from))+' pays you':esc(gName(g,l.from))+' pays '+esc(gName(g,l.to)))+'</b></span><b class="'+(l.to===me?'in':l.from===me?'out':'')+'">'+money(l.amt)+'</b>'+(l.to===me?'<button class="btn ghost s" data-grem="'+i+'">Remind</button>':'')+'</div>'});
  if(lines.length)h+='<button class="btn" data-gset="1" style="margin-top:10px">Settle up</button>';
  h+='<div class="note" style="margin-top:8px">'+(g.simplify!==false?'Debts are simplified to the fewest payments.':'Showing each person’s own debts, not simplified.')+'</div></div>';
  h+='<div class="card">'+sxHead('👥','Members','Who is in this group')+'';
  g.members.forEach(function(m){var n=nets[m.user_id]||0;h+='<div class="row" style="padding:7px 0;gap:10px">'+mAv(g,m.user_id,36)+'<span style="flex:1;min-width:0"><b>'+esc(m.name)+(m.user_id===me?' (you)':'')+(m.user_id===(g.owner||g.created_by)?' · creator':'')+'</b>'+((m.upis&&m.upis.length)?'<span class="note" style="display:block;margin:0">UPI '+esc(m.upis.join(", "))+'</span>':'')+'</span><b class="'+(n>0.49?'in':n<-0.49?'out':'mute')+'">'+(n>0.49?'gets '+money(n):n<-0.49?'owes '+money(-n):'settled')+'</b></div>'});
  (g.pending||[]).forEach(function(p){h+='<div class="row" style="padding:7px 0;gap:10px"><span class="gav" style="width:36px;height:36px;background:var(--chip);color:var(--mute)">?</span><span style="flex:1"><b>'+esc(p.email||phShow(p.phone))+'</b><span class="note" style="display:block;margin:0">Invite waiting</span></span></div>'});
  h+='<button class="btn ghost s" data-ginv="1" style="margin-top:8px">＋ Add friend</button></div>';
  h+='<div class="card">'+sxHead('🧾','Summary','Totals so far')+'<div class="row"><span class="mute">Total group spend</span><b style="font-size:20px">'+money(sm.tot)+'</b></div>';
  var cats=Object.keys(sm.by).sort(function(a,b){return sm.by[b]-sm.by[a]});cats.forEach(function(c,i){var p=sm.tot?sm.by[c]/sm.tot*100:0;h+='<div style="margin-top:8px"><div class="row"><span>'+esc(c)+'</span><b>'+money(sm.by[c])+'</b></div><div class="gbar"><i style="width:'+p.toFixed(1)+'%;background:'+PCOL[i%PCOL.length]+'"></i></div></div>'});
  h+='<div class="mute" style="margin-top:12px">Each person</div>';g.members.forEach(function(m){var u=m.user_id;h+='<div class="row" style="padding:5px 0;gap:8px">'+mAv(g,u,24)+'<span style="flex:1;min-width:0">'+esc(m.name)+'<span class="note" style="display:block;margin:0">paid '+money(sm.paid[u]||0)+' · share '+money(sm.share[u]||0)+'</span></span><b class="'+((nets[u]||0)>0.49?'in':(nets[u]||0)<-0.49?'out':'mute')+'">'+(nets[u]>0?'+':'')+money(nets[u]||0)+'</b></div>'});
  h+='</div>';
  h+='<div class="card">'+sxHead('🔁','Repeating payments','Added every month')+'';
  (g.recurring||[]).forEach(function(r){h+='<button class="mr" data-grec="'+r.id+'" style="padding:8px 0"><i>🔁</i><span><b>'+esc(r.title)+'</b><span>Day '+r.day+' of every month · '+(r.people||[]).length+' people</span></span><b style="margin-left:auto">'+money(Number(r.amount))+'</b></button>'});
  if(!(g.recurring||[]).length)h+='<div class="note">Rent, internet or a subscription that repeats every month.</div>';
  h+='<button class="btn ghost s" data-grecn="1" style="margin-top:8px">＋ Add repeating payment</button></div>';
  h+='<div class="card">'+sxHead('📤','Share &amp; export','Send or download the details')+'<button class="btn" data-gcsv="1">⬆️ Export</button><div class="note" style="margin:6px 0 0">Saves every payment in this group as a CSV file you can open in Excel.</div></div>';
  h+='<h2>Group settings</h2><div class="card" style="padding:0 12px">'+(isC?'<button class="mr" data-gedit="1"><i>⚙️</i><span><b>Dates &amp; simplify debts</b><span>'+(g.simplify!==false?'Simplify is on':'Simplify is off')+'</span></span><span class="go">›</span></button>':'')+(isC&&!g.closed?'<button class="mr" data-gclose="1"><i>🏁</i><span><b>Close group</b><span>No new payments. Debts can still be settled.</span></span><span class="go">›</span></button>':'')+
    '<button class="mr" data-gleave="1"><i>🚪</i><span><b>Leave group</b><span>Only when your balance is zero</span></span></button>'+(isC?'<button class="mr" data-gdelg="1"><i>🗑️</i><span><b class="out">Delete group</b><span>Removes it for everyone</span></span></button>':'')+'</div>';
  h+='<div class="note" style="margin:10px 0 24px">Members see only the payments tagged to this group, never each other’s other spending.</div>';
  return h}
function vGroupOpts(){var g=gGet(S.gid),h=topbar(g?g.name:"Group","grpv");if(!g)return h+'<div class="card"><div class="note">This group is not available.</div><button class="btn s" data-go="'+gBack()+'">Back</button></div>';
  var me=myId();h+='<div class="card" style="text-align:center">'+gIcon(g,76)+'<div style="font-size:20px;font-weight:700;margin-top:8px">'+esc(g.name)+'</div><div class="note" style="margin:2px 0 8px">'+g.members.length+' members'+(g.start_date||g.end_date?' · '+esc((g.start_date||"")+(g.end_date?" – "+g.end_date:"")):"")+(g.closed?' · <b>Closed</b>':'')+'</div><button class="btn ghost s" data-gedit="1">✏️ Edit name / photo</button></div>';
  return h+gOptsHtml(g)}
function gOpts(g){var sh=gSheet(gHead(esc(g.name))+gOptsHtml(g));gBindX(sh);gAct(sh,g)}
function vGroup(){var g=gGet(S.gid),bk=gBack(),h=g?'<div class="tb"><button class="tbb" data-go="'+bk+'" aria-label="Back">'+IC.back+'</button><b data-gopts="1" role="button" tabindex="0" style="cursor:pointer;text-align:center">'+esc(g.name)+' <span class="go">›</span></b><span class="tbb"></span></div>':topbar("Group",bk);if(!g)return h+'<div class="card"><div class="note">This group is not available. It may have been deleted, or you left it.</div><button class="btn s" data-go="'+bk+'">Back</button></div>';
  var me=myId(),n=gMyNet(g);
  h+='<div data-gopts="1" role="button" tabindex="0" class="row" style="justify-content:center;gap:10px;margin:0 0 8px;cursor:pointer">'+gIcon(g,34)+'<span class="note" style="margin:0;text-align:center">'+g.members.length+' members · <b class="'+(n>0.49?'in':n<-0.49?'out':'mute')+'">'+(n>0.49?'you get '+money(n):n<-0.49?'you owe '+money(-n):'all settled')+'</b> · tap for settings</span></div>';
  if(g.closed)h+='<div class="card note">This group is closed. No new payments can be added, but debts can still be settled.'+(isC?' <button class="btn ghost s" data-gclose="0" style="margin-left:6px">Reopen</button>':'')+'</div>';
  gDue(g).forEach(function(r){h+='<div class="dc" style="border:1.5px solid var(--acc)"><b>Due: '+esc(r.title)+' '+money(Number(r.amount))+'</b><div class="note" style="margin:2px 0 8px">Paid by '+esc(r.paid_by_name||"")+' · split equally</div><button class="btn s" data-gdue="'+r.id+'">Add now</button></div>'});
  h+='<h2>Activity</h2><div class="card" style="padding:0 12px">';
  var items=[];g.expenses.forEach(function(e){items.push({k:"e",d:String(e.txn_date).slice(0,10),x:e,c:e.created_at})});g.settlements.forEach(function(s){items.push({k:"s",d:String(s.settled_on).slice(0,10),x:s,c:s.created_at})});
  items.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:(a.c<b.c?1:-1)});
  if(!items.length)h+='<div class="note" style="padding:12px 0">No payments yet. Tap the ＋ button below to add one, or pick “'+esc(g.name)+'” as the category on any payment.</div>';
  var lastd="";items.forEach(function(it){if(it.d!==lastd){lastd=it.d;h+='<div class="mute" style="padding:10px 0 2px">'+esc(dayLabel(it.d))+'</div>'}
    if(it.k==="e"){var e=it.x,my=Number((e.shares||{})[me]||0);h+='<button class="mr" data-gexp="'+e.id+'" style="padding:10px 0">'+mAv(g,e.paid_by,34)+'<span><b>'+esc(e.title)+'</b><span>'+esc(gYou(g,e.paid_by))+' paid '+money(Number(e.amount))+' · '+gSplitLabel(e)+(e.orig_cur?' · converted from '+esc(e.orig_cur)+' '+esc(e.orig_amount)+(e.rate?' @ '+esc(e.rate):''):'')+'</span></span><span style="margin-left:auto;text-align:right"><span style="display:block">'+(my>0?'your share':'not in this')+'</span><b class="'+(my>0?'out':'')+'">'+(my>0?money(my):'')+'</b></span></button>'}
    else{var s=it.x,can=s.created_by===me||s.from_user===me||s.to_user===me;h+='<div class="row" style="padding:10px 0;gap:10px">'+mAv(g,s.from_user,34)+'<span style="flex:1;min-width:0"><b>'+esc(gYou(g,s.from_user))+' paid '+esc(gMeName(g,s.to_user))+'</b><span class="note" style="display:block;margin:0">Settled ✓'+(s.method?' · '+esc(s.method):'')+(s.txn_id?' · matched to a real payment':'')+'</span></span><b class="in">'+money(Number(s.amount))+'</b>'+(can?'<button class="btn ghost s out" data-gds="'+s.id+'" aria-label="Remove">✕</button>':'')+'</div>'}});
  h+='</div>';
  return h}

/* ----- export / share ----- */
function gCsv(g){var q=function(v){v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},rows=[["Date","What","Type","Paid by","Amount","Split"].concat(g.members.map(function(m){return m.name+" share"}))];
  g.expenses.slice().sort(function(a,b){return a.txn_date<b.txn_date?-1:1}).forEach(function(e){rows.push([String(e.txn_date).slice(0,10),e.title,e.cat||"",e.paid_by_name,e.amount,e.split_mode].concat(g.members.map(function(m){return (e.shares||{})[m.user_id]||0})))});
  rows.push([]);rows.push(["Settlements"]);g.settlements.forEach(function(s){rows.push([String(s.settled_on).slice(0,10),"Settled","",s.from_name+" paid "+s.to_name,s.amount,s.method||""])});
  rows.push([]);rows.push(["Who pays whom"]);gLines(g).forEach(function(l){rows.push(["","","",gName(g,l.from)+" pays "+gName(g,l.to),l.amt])});
  return rows.map(function(r){return r.map(q).join(",")}).join("\n")}
function gShareImg(g){var c=document.createElement("canvas"),W=1080,lines=gLines(g),sm=gSummary(g),H=Math.max(1080,560+lines.length*70+120);c.width=W;c.height=H;var x=c.getContext("2d"),gr=x.createLinearGradient(0,0,W,H);gr.addColorStop(0,"#7b5ce6");gr.addColorStop(1,"#4a2a98");x.fillStyle=gr;x.fillRect(0,0,W,H);
  x.textAlign="center";x.fillStyle="#fff";x.font="700 64px system-ui,sans-serif";x.fillText(g.name.slice(0,22),W/2,200);x.font="400 34px system-ui,sans-serif";x.globalAlpha=.8;x.fillText(g.members.length+" people"+(g.start_date?" · "+g.start_date+(g.end_date?" – "+g.end_date:""):""),W/2,262);x.globalAlpha=1;
  x.font="700 130px system-ui,sans-serif";x.fillText(S.cur+Number(sm.tot).toLocaleString("en-IN"),W/2,430);x.font="400 34px system-ui,sans-serif";x.globalAlpha=.8;x.fillText("total spent",W/2,480);x.globalAlpha=1;
  x.fillStyle="rgba(255,255,255,.16)";x.fillRect(80,540,W-160,Math.max(120,lines.length*70+40));x.textAlign="left";x.fillStyle="#fff";x.font="500 38px system-ui,sans-serif";
  if(!lines.length){x.textAlign="center";x.fillText("All settled ✓",W/2,610)}else lines.slice(0,12).forEach(function(l,i){x.textAlign="left";x.fillText(gName(g,l.from).slice(0,14)+" pays "+gName(g,l.to).slice(0,14),120,600+i*70);x.textAlign="right";x.fillText(S.cur+Number(l.amt).toLocaleString("en-IN"),W-120,600+i*70)});
  x.textAlign="center";x.globalAlpha=.7;x.font="400 30px system-ui,sans-serif";x.fillStyle="#fff";x.fillText("Made with Gharwise",W/2,H-60);
  c.toBlob(function(b){shareFile("gharwise-"+g.name.replace(/\W+/g,"-")+".png",b,"image/png",g.name+" on Gharwise")},"image/png")}
async function gExport(g){var csv=gCsv(g),name="gharwise-"+g.name.replace(/\W+/g,"-")+".csv",blob=new Blob(["\ufeff"+csv],{type:"text/csv"});
  try{var f=new File([blob],name,{type:"text/csv"});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==="AbortError")return}
  if(typeof nativeApp==="function"&&nativeApp()){var sh=gSheet(gHead("Export")+'<div class="note" style="margin:0 0 8px">Copy this and paste it into Excel or Sheets, or send it to yourself.</div><textarea id="gex" readonly rows="8" style="width:100%;font-size:12px"></textarea><button class="btn" id="gexc" style="margin-top:8px">Copy</button>');gBindX(sh);var ta=sh.querySelector("#gex");ta.value=csv;sh.querySelector("#gexc").onclick=async function(){try{await navigator.clipboard.writeText(csv);toast("Copied")}catch(e){ta.select();toast("Press and hold, then Copy")}};return}
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.rel="noopener";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}
function gPdf(g){var sm=gSummary(g),w=window.open("","_blank");if(!w){toast("Allow pop-ups to save as PDF");return}
  var rows=g.expenses.slice().sort(function(a,b){return a.txn_date<b.txn_date?-1:1}).map(function(e){return '<tr><td>'+esc(String(e.txn_date).slice(0,10))+'</td><td>'+esc(e.title)+'</td><td>'+esc(e.cat||"")+'</td><td>'+esc(e.paid_by_name)+'</td><td style="text-align:right">'+money(Number(e.amount))+'</td></tr>'}).join("");
  var ln=gLines(g).map(function(l){return '<li>'+esc(gName(g,l.from))+' pays '+esc(gName(g,l.to))+' <b>'+money(l.amt)+'</b></li>'}).join("")||"<li>All settled</li>";
  w.document.write('<!doctype html><title>'+esc(g.name)+'</title><body style="font-family:system-ui,sans-serif;padding:24px"><h1>'+esc(g.name)+'</h1><p>Total '+money(sm.tot)+' · '+g.members.length+' people</p><h3>Who pays whom</h3><ul>'+ln+'</ul><h3>Payments</h3><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Date</th><th>What</th><th>Type</th><th>Paid by</th><th>Amount</th></tr>'+rows+'</table><p style="color:#888">Made with Gharwise</p></body>');w.document.close();setTimeout(function(){try{w.print()}catch(e){}},400)}

/* ----- pick() hooks: tag a payment with a group, or settle a group debt ----- */
function gPickHtml(t){if(!gOKUI())return '';var h='',me=myId();
  if(t.type==="out")gList().filter(function(g){return !g.closed}).forEach(function(g){h+='<button data-gt="'+g.id+'"><i style="background:none">'+gIcon(g,44)+'</i>'+esc(g.name)+'</button>'});
  gList().forEach(function(g){var has=gLines(g).some(function(l){return t.type==="out"?l.from===me:l.to===me});if(has)h+='<button class="wide" data-gs="'+g.id+'"><i>🤝</i>Settle up with '+esc(g.name)+'</button>'});return h}
function gPickBind(sh,t){sh.querySelectorAll("[data-gt]").forEach(function(b){b.onclick=function(){var g=gGet(b.dataset.gt);gClose();gExpSheet({g:g,t:t})}});
  sh.querySelectorAll("[data-gs]").forEach(function(b){b.onclick=function(){var me=myId(),g=gGet(b.dataset.gs),l=gLines(g).filter(function(l){return t.type==="out"?l.from===me:l.to===me})[0];if(!l)return;gClose();gSettleSheet(g.id,{from:l.from,to:l.to,txn:t.id})}})}

