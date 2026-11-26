function render(){
  var el=document.getElementById("app"),nav=document.getElementById("nav");
  if(!S.view&&(!S.code||!S.name)&&!S.err){nav.classList.add("hide");el.innerHTML=skPage(6)+'<div class="note" id="skslow" style="text-align:center;opacity:0;transition:opacity .4s">Getting your family’s data…</div>';setTimeout(function(){var e=document.getElementById("skslow");if(e)e.style.opacity=1},3000);return}
  if(S.view||!S.code||!S.name){nav.classList.add("hide");el.innerHTML=authView();bindAuth(el);return}
  if(S.pf&&S.pf!=="__both"&&persons().indexOf(S.pf)<0)S.pf=S.name;
  nav.classList.remove("hide");
  nav.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b.dataset.t===S.tab)});nav.classList.toggle("hide",["sms","mail","stmt","voice"].indexOf(S.tab)>=0);
  if(S.tab==="me")S.tab="menu";
  var V={home:vDash,list:vTx,rep:function(){return vReports().replace('<h1>Reports</h1>',topbar("Analytics"))},plan:vBudget,goals:function(){return vGoals().replace('<h1>Goals</h1>',topbar("Goals","menu"))},stmt:function(){return topbar("Import","home")+vStmt()},menu:vMenu,set:vSet,fam:vFam,prof:vProfile,grps:vGroups,grpv:vGroup,grpo:vGroupOpts,cats:vCatsP,track:vTrack,sms:vSms,mail:vMail,voice:(typeof vVoice==="function"?vVoice:vTrack)};
  el.innerHTML=(V[S.tab]||vDash)();tcApply(el);
  var hb=el.querySelector(".hb");if(hb){var to=parseFloat(hb.textContent.replace(/[^0-9.]/g,""))||0;if(!S._hbOnce&&to>0&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){var t0=performance.now(),fr=S._hb>0&&Math.abs(S._hb-to)<to?S._hb:0;(function step(n){var k=Math.min(1,(n-t0)/650),e=1-Math.pow(1-k,3);if(hb.isConnected)hb.textContent=money(Math.round(fr+(to-fr)*e));if(k<1)requestAnimationFrame(step);else if(hb.isConnected)hb.textContent=money(to)})(t0)}if(to>0)S._hbOnce=true;S._hb=to}
  var q=function(i){return document.getElementById(i)};
  var dnc=q("dnctr");if(dnc){var dnShow=function(i,sr){var l=q("dnl"),ad=q("dna"),pp=q("dnp"),cc=q("dnc");l.dataset.i=i;
      if(i===""||!sr){l.textContent="Total spent";ad.textContent=ad.dataset.t;pp.textContent="";cc.textContent="";cc.className=""}
      else{l.textContent=sr.dataset.nm;ad.textContent=sr.dataset.amt;pp.textContent=sr.dataset.pc+"% of total";cc.textContent=sr.dataset.ch;cc.className=sr.dataset.cc||""}
      el.querySelectorAll(".dn-s,.dn-i").forEach(function(x){x.style.opacity=(i===""||x.dataset.dn===i)?1:.3})};
    el.querySelectorAll("[data-dn]").forEach(function(b){b.onclick=function(e){e.stopPropagation();dnShow(q("dnl").dataset.i===b.dataset.dn?"":b.dataset.dn,b)}});
    dnc.onclick=function(){dnShow("")}}
  var cbs=q("cbsel");if(cbs)cbs.onchange=function(){S.cb=cbs.value;render()};
  var cbw=q("cbs");if(cbw){cbw.scrollLeft=cbw.scrollWidth;el.querySelectorAll(".cbb").forEach(function(b){b.onclick=function(){q("cbd").textContent=b.dataset.a+" · "+b.dataset.d;el.querySelectorAll(".cbb").forEach(function(x){x.style.opacity=x===b?1:.75})}})}
  var cma=q("cma"),cmb=q("cmb");if(cma)cma.onchange=function(){S.cmA=Number(cma.value);render()};if(cmb)cmb.onchange=function(){S.cmB=Number(cmb.value);render()};
  var otc=q("otc");if(otc)otc.onclick=function(){var ob=q("otb");if(ob)ob.style.display=ob.style.display==="none"?"block":"none"};
  var rp=q("rp");if(rp)rp.onchange=function(){S.rp=rp.value;render()};
  document.querySelectorAll("[data-rpchip]").forEach(function(b){b.addEventListener("click",function(){S.rp=b.getAttribute("data-v");render()})});
  el.querySelectorAll("[data-cat]").forEach(function(b){b.onclick=function(){var t=S.txns.filter(function(x){return x.id===b.dataset.cat})[0];if(t)pick(t)}});
  var ma=q("msal");if(ma)ma.onclick=function(){var r=salaryDay(),n=q("msn");
    if(!r){n.textContent="No salary credit found yet. Mark your salary payee as Salary / Income in History first.";return}
    q("ms").value=r.day;n.textContent="Found "+money(r.amount)+" credited on "+r.date+". Day "+r.day+" filled in. Press Save."};
  var sv=q("sv");if(sv)sv.onclick=function(){S.ms=Math.min(31,Math.max(1,parseInt(g("ms"),10)||1));ls("ms",S.ms);if(S.range==="month"||S.range==="last")preset(S.range);S.cur="₹";S.tab=S.tab==="plan"?"plan":"home";load()};
  var mnd=q("mnd");if(mnd)mnd.ontoggle=function(){S.mndOpen=mnd.open};
  bindSc();bindStmt();bindV2(el);try{bindGroups(el)}catch(e){try{console.warn(e)}catch(x){}}
  var lo=q("lo");if(lo)lo.onclick=function(){authAction("out")};
  var cpy=q("cpy");if(cpy)cpy.onclick=async function(){toast(await copyText(S.profile.invite_code)?"Code copied":"Press and hold the code to copy")};
  var nc=q("ncode");if(nc)nc.onclick=async function(){if(!confirm("Make a new code? The old one will stop working."))return;try{S.profile.invite_code=await api("rpc/regenerate_invite",{method:"POST",body:"{}"});toast("New code ready");render()}catch(e){showErr(errText(e))}};
  el.querySelectorAll("[data-rm]").forEach(function(b){b.onclick=async function(){if(!confirm("Remove this person from the family? Their own payments go with them."))return;try{await api("rpc/remove_member",{method:"POST",body:JSON.stringify({p_user:b.dataset.rm})});await loadMembers();await loadFam();render()}catch(e){showErr(errText(e))}}});
  var svb=q("svb");if(svb)svb.onclick=saveBudgets;
  var fa=q("fadd");if(fa)fa.onclick=addFixed;
  var ga=q("gadd");if(ga)ga.onclick=addGoal;

  el.querySelectorAll("[data-gm]").forEach(function(b){b.onclick=function(){goalMoney(b.dataset.gm)}});
  var ff=q("ff");if(ff)ff.onchange=function(){q("fmw").style.display=ff.value==="monthly"?"none":"block"};
}
/* ---------- actions ---------- */

function addBudgetSheet(pre){
  var sh=document.getElementById("sheet"),bm={};(S.budgets||[]).forEach(function(b){bm[b.category]=Number(b.amount)});
  var cs=CATS.filter(function(c){return !NOBUDGET[c]});
  sh.innerHTML='<div class="sheet"><div><b>Add budget</b><div class="mute" style="margin:4px 0 10px">Choose a category and its monthly limit.</div><select id="abc"><option value="">Choose category</option>'+cs.map(function(c){return '<option value="'+esc(c)+'"'+(c===pre?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select><label for="aba" style="display:block;margin:8px 0 4px;font-size:13px">Monthly amount</label><input id="aba" type="number" inputmode="numeric" placeholder="Monthly amount" value="'+(pre&&bm[pre]?bm[pre]:'')+'"><button class="btn" id="abok">Add</button><button class="btn ghost" style="margin-top:8px" id="abx">Cancel</button></div></div>';
  var sel=document.getElementById("abc"),am=document.getElementById("aba");
  sel.onchange=function(){if(bm[sel.value]&&!am.value)am.value=bm[sel.value]};
  document.getElementById("abx").onclick=function(){sh.innerHTML=""};
  document.getElementById("abok").onclick=async function(){var c=sel.value,v=parseFloat(am.value);if(!c){alert("Choose a category");return}if(!(v>0)){alert("Enter the monthly amount");return}
    /* a new budget is saved straight away; only edits to existing budgets need Save Budget */
    try{await api("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify([{category:c,amount:v}])});
      if(S.newBud)delete S.newBud[c];sh.innerHTML="";await load();toast("Budget added")}catch(e){alert("Could not save: "+e.message)}}}
