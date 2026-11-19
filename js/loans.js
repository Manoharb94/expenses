function splitLoans(rows){var g=[],l=[];(rows||[]).forEach(function(r){if(r&&typeof r.name==="string"&&r.name.indexOf("__loan:")===0){try{var o=JSON.parse(r.name.slice(7));o.id=r.id;l.push(o)}catch(e){}}else g.push(r)});S.loans=l;return g}
function addM(m,i){var y=+m.slice(0,4),mo=+m.slice(5,7)-1+i;y+=Math.floor(mo/12);mo=((mo%12)+12)%12;return y+"-"+pad(mo+1)}
function monDiff(a,b){return (+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7))}
function monLabel(m,sh){return new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleString("en-IN",{month:"short",year:sh?"2-digit":"numeric"})}
function emiOf(P,rate,n){var r=rate/1200;if(!(n>0)||!(P>0))return 0;if(r<=0)return P/n;var f=Math.pow(1+r,n);return P*r*f/(f-1)}
function loanSched(L,parts){var bal=L.b,out=[],P={};(parts||[]).forEach(function(p){if(p.m>=L.a)P[p.m]=(P[p.m]||0)+p.a});
  for(var i=0;i<700&&bal>0.5;i++){var m=addM(L.a,i),rt=L.r;(L.rt||[]).forEach(function(x){if(x.m<=m)rt=x.r});var it=bal*rt/1200,pr=L.e-it;
    if(pr<=0.01)return{rows:out,bad:true};if(pr>bal)pr=bal;bal-=pr;var ex=Math.min(bal,P[m]||0);bal-=ex;out.push({m:m,i:it,p:pr,x:ex,b:bal})}
  return{rows:out,bad:false}}
function sumI(s){return s.rows.reduce(function(a,r){return a+r.i},0)}
function loanParts(L){var list=S.loans||[],out=[];(S.txns||[]).forEach(function(t){if((t.category!==HLP&&t.category!==HLPO)||!t.txn_date)return;
    var nt=((t.note||"")+" "+(t.merchant||"")).toLowerCase(),mine=true;
    if(list.length>1){var by=list.slice().sort(function(a,b){return String(b.n).length-String(a.n).length}),tag=by.filter(function(x){return nt.indexOf("loan: "+String(x.n).toLowerCase())>=0})[0]||by.filter(function(x){return nt.indexOf(String(x.n).toLowerCase())>=0})[0];mine=tag?tag.id===L.id:list[0].id===L.id}
    if(mine&&t.txn_date.slice(0,7)>=L.a)out.push({m:t.txn_date.slice(0,7),a:Number(t.amount)||0,d:t.txn_date,who:t.merchant||""})});
  out.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0});return out}
function loanSavings(L,parts){var base=loanSched(L,[]),prev=base,cur=[],res=[];parts.forEach(function(p){cur.push(p);var s2=loanSched(L,cur);res.push({p:p,si:sumI(prev)-sumI(s2),sf:prev.rows.length-s2.rows.length});prev=s2});
  return{list:res,si:sumI(base)-sumI(prev),sf:base.rows.length-prev.rows.length,base:base,fin:prev}}
function loanNow(L,sv){var cm=iso(new Date()).slice(0,7),e=Math.max(0,monDiff(L.a,cm)),rows=sv.fin.rows,d=Math.min(e,rows.length);
  return{bal:d>0?rows[d-1].b:L.b,left:rows.length-d,end:rows.length?rows[rows.length-1].m:L.a}}
function shortN(v){v=Math.round(v);return v>=10000000?(v/10000000).toFixed(1).replace(".0","")+"Cr":v>=100000?(v/100000).toFixed(1).replace(".0","")+"L":v>=1000?Math.round(v/1000)+"k":String(v)}
function loanChart(L,sv){
  var W=340,H=214,pl=38,pr=10,pt=30,pb=26,w=W-pl-pr,h=H-pt-pb,b=sv.base.rows,f=sv.fin.rows;b=b.length>3?b.slice(0,-1):b;f=f.length>3?f.slice(0,-1):f;var n=Math.max(b.length,2),mx=1;
  b.concat(f).forEach(function(r){mx=Math.max(mx,r.i,r.p)});var st=Math.pow(10,Math.floor(Math.log10(mx)));mx=Math.ceil(mx/st*2)/2*st;
  var X=function(i){return pl+w*(i/(n-1))},Y=function(v){return pt+h*(1-v/mx)};
  var pts=function(rows,k){return rows.map(function(r,i){return X(i).toFixed(1)+","+Y(r[k]).toFixed(1)}).join(" ")};
  var lc={W:W,pl:pl,w:w,pt:pt,h:h,n:n,r:f.map(function(r){return[r.m,Math.round(r.i),Math.round(r.p),Math.round(r.x||0),Math.round(r.b),+Y(r.i).toFixed(1),+Y(r.p).toFixed(1)]})};
  var o='<div class="lchart" data-lc=\''+JSON.stringify(lc)+'\'><div class="lctip" style="min-height:38px;font-size:13px;margin-bottom:4px"><span class="mute">Touch the graph to see principal and interest for a month</span></div><svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;touch-action:pan-y;user-select:none;-webkit-user-select:none">';
  [0,.5,1].forEach(function(k){var y=Y(mx*k);o+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" style="stroke:var(--line)" stroke-width="1"/><text x="'+(pl-5)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" style="fill:var(--mute)">'+shortN(mx*k)+'</text>'});
  [0,.25,.5,.75,1].forEach(function(k){var i=Math.round((b.length-1)*k);if(b[i])o+='<text x="'+X(i*(n-1)/Math.max(1,n-1))+'" y="'+(H-8)+'" text-anchor="'+(k===0?"start":k===1?"end":"middle")+'" font-size="9" style="fill:var(--mute)">'+monLabel(b[i].m,1)+'</text>'});
  if(sv.list.length){o+='<polyline fill="none" stroke="#f59e0b" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 4" points="'+pts(b,"i")+'"/><polyline fill="none" stroke="#7c5cff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 4" points="'+pts(b,"p")+'"/>'}
  o+='<polyline fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linejoin="round" points="'+pts(f,"i")+'"/><polyline fill="none" stroke="#7c5cff" stroke-width="2.6" stroke-linejoin="round" points="'+pts(f,"p")+'"/>';
  var lastX=-99,lvl=0;sv.list.forEach(function(x){var i=monDiff(L.a,x.p.m);if(i<0||i>=f.length)return;var xx=X(i);lvl=(xx-lastX<30)?(lvl+1)%3:0;lastX=xx;
    o+='<line x1="'+xx+'" y1="'+pt+'" x2="'+xx+'" y2="'+(pt+h)+'" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="3 3"/><circle cx="'+xx+'" cy="'+Y(f[i].i)+'" r="4" fill="var(--card)" stroke="#f59e0b" stroke-width="2"/><circle cx="'+xx+'" cy="'+Y(f[i].p)+'" r="4" fill="var(--card)" stroke="#7c5cff" stroke-width="2"/><text x="'+Math.min(Math.max(xx,pl+16),W-pr-14)+'" y="'+(pt-8-lvl*9)+'" text-anchor="middle" font-size="9" font-weight="700" fill="#16a34a">'+shortN(x.p.a)+'</text>'});
  return o+'</svg></div><div class="row" style="justify-content:flex-start;gap:14px;font-size:12px;margin-top:4px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#7c5cff;margin-right:5px"></i>Principal</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#f59e0b;margin-right:5px"></i>Interest</span>'+(sv.list.length?'<span class="mute">Dashed = without part payments</span>':'')+'</div>'}
var lcOn=null;
function lcShow(box,cx){var d;try{d=JSON.parse(box.dataset.lc)}catch(e){return}var svg=box.querySelector("svg"),r=svg.getBoundingClientRect();if(!r.width)return;
  var vx=(cx-r.left)/r.width*d.W,i=Math.round((vx-d.pl)/d.w*(d.n-1));i=Math.max(0,Math.min(d.r.length-1,i));var w=d.r[i],x=d.pl+d.w*i/(d.n-1);
  var g=svg.querySelector(".lcm");if(!g){svg.insertAdjacentHTML("beforeend",'<g class="lcm" pointer-events="none"><line stroke="#64748b" stroke-width="1" stroke-dasharray="3 3"/><circle r="5" fill="#f59e0b" stroke="#fff" stroke-width="1.5" class="lci"/><circle r="5" fill="#7c5cff" stroke="#fff" stroke-width="1.5" class="lcp"/></g>');g=svg.querySelector(".lcm")}
  var ln=g.querySelector("line");ln.setAttribute("x1",x);ln.setAttribute("x2",x);ln.setAttribute("y1",d.pt);ln.setAttribute("y2",d.pt+d.h);
  var a=g.querySelector(".lci"),b=g.querySelector(".lcp");a.setAttribute("cx",x);a.setAttribute("cy",w[5]);b.setAttribute("cx",x);b.setAttribute("cy",w[6]);
  box.querySelector(".lctip").innerHTML='<b>'+esc(monLabel(w[0]))+'</b> · <span style="color:#7c5cff;font-weight:700">Principal '+money(w[2])+'</span> · <span style="color:#d97706;font-weight:700">Interest '+money(w[1])+'</span><div class="mute" style="font-size:12px">EMI '+money(w[1]+w[2])+(w[3]>0?' · Part payment '+money(w[3]):'')+' · Balance '+money(w[4])+'</div>'}
document.addEventListener("pointerdown",function(e){var b=e.target&&e.target.closest&&e.target.closest(".lchart svg");if(!b)return;lcOn=b.parentNode;lcShow(lcOn,e.clientX)});
document.addEventListener("pointermove",function(e){if(lcOn&&(e.buttons||e.pointerType==="touch"))lcShow(lcOn,e.clientX)});
["pointerup","pointercancel"].forEach(function(k){document.addEventListener(k,function(){lcOn=null})});
function loanSavedBox(sv){return '<div style="margin-top:12px;border-radius:14px;padding:12px 14px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)"><div style="font-size:13px;color:#15803d">Saved with part payments</div><div style="font-size:26px;font-weight:800;color:#15803d">'+money(Math.round(sv.si))+'</div><div class="note" style="margin:0">in interest · '+sv.sf+' EMI'+(sv.sf===1?'':'s')+' fewer · ends '+(sv.fin.rows.length?monLabel(sv.fin.rows[sv.fin.rows.length-1].m):"now")+' instead of '+(sv.base.rows.length?monLabel(sv.base.rows[sv.base.rows.length-1].m):"now")+'</div></div>'}
function loanData(L){var parts=loanParts(L),sv=loanSavings(L,parts);return{parts:parts,sv:sv,nw:loanNow(L,sv)}}
function curLoan(){var l=S.loans||[];if(!l.length)return null;var id=S.loanSel||ls("loansel");return l.filter(function(x){return x.id===id})[0]||l[0]}
function loanSelect(id){var l=S.loans||[],c=curLoan();if(l.length<2)return "";return '<select id="'+id+'" data-lsel="1" style="margin:0 0 10px">'+l.map(function(x){return '<option value="'+esc(x.id)+'"'+(c&&c.id===x.id?" selected":"")+'>'+esc(x.n)+'</option>'}).join('')+'</select>'}
function loanSkipped(){try{return JSON.parse(ls("loanskip")||"[]")}catch(e){return[]}}
function loanCands(){var L0=S.loans||[],nm=function(x){return String(x||"").toLowerCase().replace(/[^a-z0-9]+/g,"")},out=[],sk=loanSkipped().map(nm);
  var tracked=function(n,fid,amt){var k=nm(n);return L0.some(function(l){return (fid&&l.fid===fid)||nm(l.n)===k||(amt>0&&Math.abs((Number(l.e)||0)-amt)<1)})};
  var dup=function(n,amt){var k=nm(n);return out.some(function(o){var j=nm(o.n);return j===k||j.indexOf(k)>=0||k.indexOf(j)>=0||(amt>0&&o.a===amt)})};
  (S.fixed||[]).forEach(function(f){if(!/loan|emi/i.test((f.name||"")+" "+(f.category||"")))return;var a=Number(f.amount)||0;if(tracked(f.name,f.id,a)||sk.indexOf(nm(f.name))>=0||dup(f.name,a))return;out.push({n:f.name,a:a,fid:f.id})});
  (CUSTOMC||[]).forEach(function(c){if(!/loan|emi/i.test(c)||c===HLP||c===HLPO)return;if(tracked(c,"",0)||sk.indexOf(nm(c))>=0||dup(c,0))return;out.push({n:c,a:0})});
  return out}
function loanBudgetCards(){var h="",c=curLoan();
  if(c){var d=loanData(c);
    var pd=c.b>0?Math.max(0,Math.min(100,Math.round((1-d.nw.bal/c.b)*100))):0;
    h+='<div class="hero2">'+loanSelect("lselb")+'<div data-loan="'+c.id+'" data-lp="loan|'+c.id+'|'+encodeURIComponent(c.n)+'" style="cursor:pointer"><div class="hp"><span>🏠 '+esc(c.n)+'</span><em>Loan tracker</em></div>'+'<small>Left to pay</small><div class="hb">'+money(Math.round(d.nw.bal))+'</div><div class="hbar"><i style="width:'+pd+'%"></i></div><div class="hk"><b>'+pd+'%</b> paid · '+d.nw.left+' EMIs left · ends '+monLabel(d.nw.end)+'</div>'+(d.sv.si>0?'<div class="hk" style="margin-top:6px">✨ Saved <b>'+money(Math.round(d.sv.si))+'</b> interest with part payments</div>':'')+'</div></div>'}
  h+='<button class="btn ghost" data-loantrack="1" style="margin:-6px 0 14px">＋ Track a loan</button>';
  return h}
function loanBlocks(){var c=curLoan();if(!c)return "";var d=loanData(c);
  return '<div class="card">'+sxHead('🏠','Loan tracker',(((S.loans||[]).length<2)?esc(c.n)+' · ':'')+'What each EMI pays, month by month')+loanSelect("lsela")+(d.sv.base.bad?'<div class="note">The EMI is too low to cover the interest. Open the loan and check the details.</div>':loanChart(c,d.sv))+(d.sv.list.length?loanSavedBox(d.sv):'<div class="note">Put a payment under “Loan Part Payment” in List to see how much interest it saves.</div>')+'<button class="btn ghost s" data-loan="'+c.id+'" style="margin-top:10px">Open loan details</button></div>'}
async function saveLoan(L,isNew){var o={n:L.n,b:L.b,r:L.r,m:L.m,e:L.e,a:L.a,rt:L.rt||[],fid:L.fid||undefined},name="__loan:"+JSON.stringify(o);
  if(isNew)await api("goals",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:name,target:L.b,saved:0,due:null})});
  else await api("goals?id=eq."+encodeURIComponent(L.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({name:name,target:L.b})});
  await loadPlan();render()}
function loanSetup(L,pn,amt,fid){
  var sh=document.getElementById("sheet"),ed=!!L,d=ed?loanData(L):null,cm=iso(new Date()).slice(0,7);
  var v={n:ed?L.n:(pn||"Loan"),b:ed?Math.round(d.nw.bal):"",r:ed?(function(){var r=L.r;(L.rt||[]).forEach(function(x){if(x.m<=cm)r=x.r});return r})():"",m:ed?d.nw.left:"",e:ed?L.e:(amt>0?Math.round(amt):"")};
  sh.innerHTML='<div class="sheet"><div><b>'+(ed?'Update loan details':'Loan details')+'</b><div class="note" style="margin:4px 0 10px">We use these to work out your interest, and how a part payment saves it. '+(ed?'Updating starts the schedule again from this month.':'')+'</div>'
   +'<div class="mute">Name</div><input id="ln_n" value="'+esc(v.n)+'"><div class="mute">Balance principal left (₹)</div><input id="ln_b" type="number" inputmode="decimal" placeholder="e.g. 4500000" value="'+v.b+'"><div class="mute">Interest rate (% a year)</div><input id="ln_r" type="number" inputmode="decimal" placeholder="e.g. 8.5" value="'+v.r+'"><div class="mute">Months left</div><input id="ln_m" type="number" inputmode="numeric" placeholder="e.g. 180" value="'+v.m+'"><div class="mute">EMI per month (₹)</div><input id="ln_e" type="number" inputmode="decimal" placeholder="Worked out for you" value="'+v.e+'"><div class="note" id="ln_h" style="margin-top:-4px">We work the EMI out from the three above. Change it if your bank’s EMI is different.</div><div class="amsg" id="ln_x"></div>'
   +'<button class="btn" id="ln_s">Save</button><button class="btn ghost" style="margin-top:8px" id="ln_c">Cancel</button></div></div>';
  var q=function(i){return document.getElementById(i)},man=ed||amt>0;
  var auto=function(){if(man)return;var e=emiOf(+q("ln_b").value,+q("ln_r").value,+q("ln_m").value);q("ln_e").value=e>0?Math.round(e):""};
  ["ln_b","ln_r","ln_m"].forEach(function(i){q(i).oninput=auto});q("ln_e").oninput=function(){man=true};
  q("ln_c").onclick=function(){sh.innerHTML=""};
  q("ln_s").onclick=async function(){var x=function(t){q("ln_x").textContent=t},n=q("ln_n").value.trim(),b=+q("ln_b").value,r=+q("ln_r").value,m=Math.round(+q("ln_m").value),e=+q("ln_e").value;
    if(!n)return x("Give the loan a name.");if(!(b>0))return x("Enter the balance principal left.");if(!(r>=0&&r<=40)||q("ln_r").value==="")return x("Enter the yearly interest rate, for example 8.5.");if(!(m>=1&&m<=480))return x("Enter the months left (1 to 480).");if(!(e>0))return x("Enter the EMI.");
    if(b*r/1200>=e)return x("That EMI does not even cover the monthly interest. Please check the numbers.");
    var o={id:ed?L.id:null,fid:ed?L.fid:(fid||undefined),n:n.slice(0,40),b:b,r:r,m:m,e:Math.round(e),a:cm,rt:[]};
    try{q("ln_s").disabled=true;await saveLoan(o,!ed);sh.innerHTML="";toast("Loan saved");if(ed)loanSheet(L.id);else{var nl=(S.loans||[]).filter(function(z){return z.n===o.n}).pop();if(nl){S.loanSel=nl.id;ls("loansel",nl.id);render()}}}catch(err){q("ln_s").disabled=false;x(errText(err))}}}
function loanSheet(id){
  var L=(S.loans||[]).filter(function(x){return x.id===id})[0];if(!L)return;var sh=document.getElementById("sheet"),d=loanData(L),sv=d.sv,cm=iso(new Date()).slice(0,7),rate=L.r;(L.rt||[]).forEach(function(x){if(x.m<=cm)rate=x.r});
  var h='<div class="sheet"><div><div style="display:flex;align-items:center;justify-content:space-between"><b style="font-size:18px">🏠 '+esc(L.n)+'</b><button id="lx" aria-label="Close" style="background:transparent;border:0;color:inherit;font-size:24px;line-height:1;padding:4px 8px;cursor:pointer">✕</button></div>';
  if(sv.base.bad)h+='<div class="note out" style="margin:8px 0">The EMI is too low to cover the interest, so the schedule cannot be worked out. Tap Update details.</div>';
  else{h+='<div class="grid" style="margin-top:10px"><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="mute">Left to pay (about)</div><b style="font-size:18px">'+money(Math.round(d.nw.bal))+'</b></div><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="mute">EMI · rate</div><b style="font-size:18px">'+money(L.e)+' · '+rate+'%</b></div><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="mute">EMIs left</div><b style="font-size:18px">'+d.nw.left+'</b></div><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="mute">Ends</div><b style="font-size:18px">'+monLabel(d.nw.end)+'</b></div></div><div style="margin-top:12px">'+loanChart(L,sv)+'</div>';
    if(sv.list.length)h+=loanSavedBox(sv)}
  h+='<div class="sec" style="margin-top:16px">Part payments</div>';
  if(!sv.list.length)h+='<div class="note">None yet. When you pay extra, set the payment’s category to “Loan Part Payment” in List. It shows here with the interest it saved.</div>';
  sv.list.forEach(function(x){h+='<div style="border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin:8px 0"><div class="row"><span><b>Loan Part Payment</b><div class="mute">'+esc(x.p.d)+(x.p.who?' · '+esc(x.p.who):'')+'</div></span><b>'+money(x.p.a)+'</b></div><div class="row" style="margin-top:8px;border-radius:10px;padding:7px 10px;background:rgba(34,197,94,.12);color:#15803d;font-size:13px;font-weight:600"><span>Saved '+money(Math.round(x.si))+' interest</span><span>'+x.sf+' EMI'+(x.sf===1?'':'s')+' fewer</span></div></div>'});
  if(sv.list.length)h+='<div class="note">Each saving is counted in order, so a later payment’s saving already includes the earlier ones. Part payments are kept out of your monthly spending.</div>';
  h+='<div class="sec" style="margin-top:16px">If you pay more</div><div class="note" style="margin:0 0 8px">Try an amount before you pay it.</div><div class="row" style="gap:8px"><input id="wl" type="number" inputmode="decimal" placeholder="Lump sum (₹)" style="margin:0"><input id="wk" type="number" inputmode="numeric" placeholder="Extra EMIs" style="margin:0"></div><div id="wr" style="margin-top:10px;border-radius:12px;padding:10px 12px;background:var(--card);border:1px dashed var(--line)"><span class="mute">Enter an amount to see how much interest you would save.</span></div>';
  h+='<div class="sec" style="margin-top:16px">Interest rate changed?</div><div class="note" style="margin:0 0 8px">Your EMI stays the same and the schedule is worked out again from that month.</div><div class="row" style="gap:8px"><input id="lr" type="number" inputmode="decimal" placeholder="New rate %" style="margin:0"><input id="lrm" type="month" value="'+cm+'" style="margin:0"></div><button class="btn ghost" id="lrs" style="margin-top:8px">Update rate</button><div class="amsg" id="lrx"></div>';
  h+='<button class="btn ghost" id="lue" style="margin-top:4px">Update loan details</button><div class="note" style="text-align:center">Press and hold the loan card in Budget to remove it.</div></div></div>';
  sh.innerHTML=h;var q=function(i){return document.getElementById(i)};
  q("lx").onclick=function(){sh.innerHTML=""};
  var calc=function(){var lump=+q("wl").value||0,k=Math.round(+q("wk").value||0),amt=lump+k*L.e,res=q("wr");
    if(amt<=0){res.innerHTML='<span class="mute">Enter an amount to see how much interest you would save.</span>';return}
    var m=cm<L.a?L.a:cm,s2=loanSched(L,d.parts.concat([{m:m,a:amt}])),si=sumI(sv.fin)-sumI(s2),sf=sv.fin.rows.length-s2.rows.length;
    res.innerHTML='<b style="color:#15803d;font-size:17px">Save '+money(Math.round(si))+' interest</b><div class="note" style="margin:2px 0 0">'+sf+' EMI'+(sf===1?'':'s')+' fewer · ends '+(s2.rows.length?monLabel(s2.rows[s2.rows.length-1].m):"now")+' · paying '+money(Math.round(amt))+'</div>'};
  q("wl").oninput=calc;q("wk").oninput=calc;
  q("lrs").onclick=async function(){var r=+q("lr").value,m=q("lrm").value,x=q("lrx");if(!(r>0&&r<=40))return x.textContent="Enter the new yearly rate, for example 8.25.";if(!m)return x.textContent="Pick the month the new rate starts.";
    var o={id:L.id,fid:L.fid,n:L.n,b:L.b,r:L.r,m:L.m,e:L.e,a:L.a,rt:(L.rt||[]).filter(function(z){return z.m!==m}).concat([{m:m,r:r}]).sort(function(a,b){return a.m<b.m?-1:1})};
    try{await saveLoan(o,false);toast("Rate updated");loanSheet(L.id)}catch(err){x.textContent=errText(err)}};
  q("lue").onclick=function(){loanSetup(L)}}
document.addEventListener("click",function(e){var tk=e.target&&e.target.closest&&e.target.closest("[data-loantrack]");if(tk){loanTrack();return}
  var sk=e.target&&e.target.closest&&e.target.closest("[data-loanskip]");if(sk){e.stopPropagation();var l=loanSkipped();l.push(sk.dataset.loanskip);ls("loanskip",JSON.stringify(l));render();return}
  var t=e.target&&e.target.closest&&e.target.closest("[data-loan],[data-loansetup]");if(!t)return;if(t.dataset.loan)loanSheet(t.dataset.loan);else loanSetup(null,t.dataset.loansetup,+t.dataset.amt||0,t.dataset.fid||"")});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-rem]");if(b){e.stopPropagation();toggleRem(b.dataset.rem)}});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-remcheck]");if(b){e.stopPropagation();remCheck()}});
document.addEventListener("change",function(e){var t=e.target;if(t&&t.dataset&&t.dataset.lsel){var v=t.value;S.loanSel=v;ls("loansel",v);render()}});
function loanTrack(){var cs=loanCands();if(!cs.length){loanSetup(null,"",0,"");return}
  var sh=document.getElementById("sheet");
  sh.innerHTML='<div class="sheet"><div><b>Track a loan</b><div class="mute" style="margin:6px 0 12px">Choose an EMI or loan from your fixed expenses, or add a new one.</div><select id="ltsel">'+cs.map(function(x,i){return '<option value="'+i+'">'+esc(x.n)+(x.a?' · '+money(x.a)+' / month':'')+'</option>'}).join('')+'<option value="new">＋ New loan</option></select><div style="display:grid;gap:8px;margin-top:12px"><button class="btn" id="ltok">Continue</button><button class="btn ghost" id="ltx">Cancel</button></div></div></div>';
  document.getElementById("ltx").onclick=function(){sh.innerHTML=""};
  document.getElementById("ltok").onclick=function(){var v=document.getElementById("ltsel").value;sh.innerHTML="";if(v==="new")loanSetup(null,"",0,"");else{var x=cs[+v];loanSetup(null,x.n,x.a,x.fid||"")}}}
function whichLoan(t,note){var sh=document.getElementById("sheet"),L0=S.loans||[];
  sh.innerHTML='<div class="sheet"><div><b>Which loan is this for?</b><div class="mute" style="margin:6px 0 12px">'+esc(t.merchant||"Payment")+' · '+money(t.amount)+'</div><div style="display:grid;gap:8px">'+L0.map(function(x,i){return '<button class="btn ghost" data-wl="'+i+'">🏠 '+esc(x.n)+'</button>'}).join('')+'<button class="btn ghost" id="wlx">Cancel</button></div></div></div>';
  document.getElementById("wlx").onclick=function(){sh.innerHTML=""};
  sh.querySelectorAll("[data-wl]").forEach(function(b){b.onclick=async function(){var L=L0[+b.dataset.wl],nt=String(note||"").replace(/\s*·?\s*Loan: .*$/,"").trim();nt=(nt?nt+" · ":"")+"Loan: "+L.n;sh.innerHTML="";
    try{await api("transactions?id=eq."+t.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:HLP,note:nt})});await load();toast("Added to "+L.n)}catch(err){alert("Could not save: "+(err&&err.message||err))}}})}
/* ===== end home loan tracker ===== */

var TOUR=[
 {tab:"home",sel:'#nav [data-t="home"]',t:"Your month at a glance",d:"See what you’ve spent, your daily average and the latest payments."},
 {tab:"rep",sel:'#nav [data-t="rep"]',t:"See where the money goes",d:"Pie chart by category, history bars for each category and a month-to-month comparison."},
 {tab:"",sel:'#addx',t:"Add a cash payment",d:"Paid in cash? Tap + to add it in seconds. You can also split any payment between categories or people."},
 {tab:"list",sel:'#nav [data-t="list"]',t:"Every payment in one list",d:"Search and filter, tap a payment to change its category, and press and hold to delete it."},
 {tab:"plan",sel:'#nav [data-t="plan"]',t:"Set your monthly limits",d:"Add a budget for Groceries, Food or Shopping and watch the bars fill up."},
 {tab:"home",sel:'.tb [data-go="menu"]',top:1,t:"Everything else is in Menu",d:"Set up what you need, whenever you’re ready:",list:[["💬","Automated Tracking (SMS & Email)"],["📥","Import bank statements"],["👥","Family Sync: share expenses together with your spouse"],["🤝","Lending: track money you lent or borrowed"]]}];
