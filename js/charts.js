/* ---------- charts and ideas ---------- */
var PAL=["#1f6f5c","#c9772b","#4b7bb5","#b4432f","#8a6bb1","#d1a52b","#3f9aa8","#a35c7a"];
function colr(n,i){return n===UNC?"#9b9a92":PAL[i%8]}
function donut(by,total,pby,pl){
  var ks=Object.keys(by).sort(function(a,b){return by[b]-by[a]}),items=[],rest=0,grp=[];
  ks.forEach(function(k,i){if(i<7)items.push({k:k,v:by[k]});else{rest+=by[k];grp.push(k)}});
  if(rest>0)items.push({k:"Other small ones",v:rest,grp:grp});
  var n=items.length,R=76,SW=26,IR=146,C=2*Math.PI*R,acc=0,ang=[],mid=[],a0=0,rad=Math.PI/180;
  items.forEach(function(it){var f=it.v/total;ang.push((a0+f/2)*360);mid.push((a0+f/2)*360);a0+=f});
  var gap=Math.min(38,360/n*.85);
  if(n>1){for(var i=1;i<n;i++)if(ang[i]<ang[i-1]+gap)ang[i]=ang[i-1]+gap;
    var lim=ang[0]+360-gap;for(var i2=n-1;i2>=1;i2--){var mx2=lim-(n-1-i2)*gap;if(ang[i2]>mx2)ang[i2]=mx2}
    var bad=ang[n-1]-ang[0]>360-gap+.01;for(var i3=1;i3<n;i3++)if(ang[i3]-ang[i3-1]<gap-.01)bad=true;
    if(bad)for(var i4=0;i4<n;i4++)ang[i4]=ang[0]+i4*360/n}
  var chg=function(it){if(!pby)return ["",""];var was=it.grp?it.grp.reduce(function(a,k){return a+(pby[k]||0)},0):(pby[it.k]||0);if(!was)return ["Not in "+pl,""];var d=Math.round((it.v-was)/was*100);return [(d>=0?"▲ ":"▼ ")+Math.abs(d)+"% vs "+pl,d>=0?"out":"in"]};
  var at=items.map(function(it,i){var nm=it.k===UNC?"No category yet":it.k,ch=chg(it);return ' data-dn="'+i+'" data-nm="'+esc(nm)+'" data-amt="'+esc(money(Math.round(it.v)))+'" data-pc="'+Math.round(it.v/total*100)+'" data-ch="'+esc(ch[0])+'" data-cc="'+ch[1]+'"'});
  var svg='<svg viewBox="0 0 360 360" style="display:block;width:100%;height:auto" role="img" aria-label="Spending by category"><g transform="rotate(-90 180 180)" fill="none" stroke-width="'+SW+'"><circle cx="180" cy="180" r="'+R+'" stroke="var(--chip)"/>';
  items.forEach(function(it,i){var len=Math.max(0,it.v/total*C);
    svg+='<circle class="dn-s"'+at[i]+' cx="180" cy="180" r="'+R+'" stroke="'+colr(it.k,i)+'" stroke-dasharray="'+Math.max(0,len-1.5).toFixed(2)+' '+(C-len+1.5).toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'" style="cursor:pointer"/>';acc+=len});
  svg+='</g>';
  var btns='';
  items.forEach(function(it,i){var c=colr(it.k,i),m=mid[i]*rad,an=ang[i]*rad,r1=R+SW/2+3,r2=IR-27,x=180+IR*Math.sin(an),y=180-IR*Math.cos(an),nm=it.k===UNC?"No category yet":it.k,em=it.k===UNC?"❔":(it.grp?"🧩":ci(it.k));
    btns+='<button class="dn-i"'+at[i]+' aria-label="'+esc(nm)+'" style="position:absolute;left:'+(x/3.6).toFixed(2)+'%;top:'+(y/3.6).toFixed(2)+'%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;border:2px solid '+c+';background:'+c+'22;font-size:22px;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer">'+em+'<span style="position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--ink);white-space:nowrap;margin-top:1px">'+Math.round(it.v/total*100)+'%</span></button>'});
  svg+='</svg>';
  var ctr='<div id="dnctr" style="position:absolute;left:50%;top:50%;width:33%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;line-height:1.2"><small id="dnl" class="mute" style="font-size:11px">Total spent</small><b id="dna" data-t="'+esc(money(Math.round(total)))+'" style="font-size:16px">'+money(Math.round(total))+'</b><small id="dnp" class="mute" style="font-size:10.5px"></small><small id="dnc" style="font-size:10.5px;font-weight:600"></small></div>';
  return '<div style="position:relative;width:100%;max-width:380px;margin:4px auto 20px">'+svg+btns+ctr+'</div>'+(by[UNC]?'<button class="obtn" data-go="list" data-ltab="none" style="margin-top:0">Sort payments with no category →</button>':'')}
function catBars(off){
  off=off||0;var all=txIn(monthKey(off)).filter(function(t){return personOK(t)&&t.category&&isCount(t)&&t.txn_date&&t.type==="out"}),tot={};
  all.forEach(function(t){tot[t.category]=(tot[t.category]||0)+Number(t.amount)});
  var cats=Object.keys(tot).sort(function(a,b){return tot[b]-tot[a]});
  if(!cats.length)return '';
  var sel=cats.indexOf(S.cb)>=0?S.cb:cats[0];
  var L=all.filter(function(t){return t.category===sel}).sort(function(a,b){return a.txn_date<b.txn_date?-1:a.txn_date>b.txn_date?1:0});
  var mx=Math.max.apply(null,L.map(function(t){return Number(t.amount)}))||1,sm=L.reduce(function(a,t){return a+Number(t.amount)},0);
  var fd=function(d){return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})};
  var h='<div class="card">'+sxHead('<span style="font-size:22px">'+ci(sel)+'</span>','Category Spending','Every payment in one category · '+esc(plabel(off)))+'<select id="cbsel" style="margin:0 0 12px">'+cats.map(function(c){return '<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select>';
  h+='<div class="cbst"><div><small>Total</small><b>'+money(Math.round(sm))+'</b></div><div><small>Payments</small><b>'+L.length+'</b></div><div><small>Average</small><b>'+money(Math.round(sm/L.length))+'</b></div></div>';
  h+='<div id="cbd" class="note" style="min-height:20px;margin:8px 0 6px">Tap a bar to see the date and amount.</div>';
  h+='<div id="cbs" style="overflow-x:auto"><div style="display:flex;align-items:flex-end;gap:5px;height:150px;min-width:100%;width:max-content">';
  L.forEach(function(t,i){var hh=Math.max(4,Math.round(Number(t.amount)/mx*146));
    h+='<button class="cbb" data-cb="'+i+'" data-d="'+esc(fd(t.txn_date)+' · '+(t.merchant||"Unknown"))+'" data-a="'+esc(money(t.amount))+'" aria-label="'+esc(fd(t.txn_date)+' '+money(t.amount))+'" style="flex:none;width:16px;height:'+hh+'px;border:0;border-radius:6px 6px 2px 2px;background:'+(t.type==="in"?'var(--in)':'var(--acc)')+';opacity:.75;padding:0;cursor:pointer"></button>'});
  return h+'</div></div></div>'}
var CM=null;
function cmD(t){return new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short"})}
function cmSeries(k,M,ev){var f=pdate(k),t=pend(k),n=Math.round((t-f)/864e5)+1,days=[],i;for(i=0;i<n;i++)days.push({t:0,by:{},it:[]});
  (M.outs||[]).forEach(function(x){if(ev&&M.ids&&M.ids[x.id])return;if(!x.txn_date)return;var d=Math.round((new Date(x.txn_date+"T00:00:00")-f)/864e5);if(d<0||d>=n)return;var o=days[d],v=+x.amount||0,c=x.category||UNC;o.t+=v;o.by[c]=(o.by[c]||0)+v;o.it.push([x.merchant||"",v,c])});
  var cum=[],run=0;days.forEach(function(d){run+=d.t;cum.push(run)});
  var cap=n;if(k===0){cap=Math.min(n,Math.max(1,Math.round((new Date(iso(new Date())+"T00:00:00")-f)/864e5)+1))}
  var dt=[];for(i=0;i<n;i++){dt.push(new Date(f.getFullYear(),f.getMonth(),f.getDate()+i))}
  return {f:f.getTime(),n:n,cap:cap,days:days,cum:cum,dt:dt,lab:pnameDate(f).toLocaleString("en-IN",{month:"short",year:"2-digit"})}}
function cmChart(a,b,A,B,extra){
  var ev=!!S.cmEv,sa=cmSeries(a,A,ev),sb=cmSeries(b,B,ev);
  var Lt=sa.f>=sb.f?sa:sb,Er=Lt===sa?sb:sa;
  /* line the earlier month up by calendar date: 11 Nov is compared with 11 Oct */
  var dim=function(y,m){return new Date(y,m+1,0).getDate()},al={cum:[],days:[],dt:[]},last=0;
  for(var i=0;i<Lt.n;i++){var d=Lt.dt[i],ty=d.getFullYear(),tm=d.getMonth()-1,src=new Date(ty,tm,Math.min(d.getDate(),dim(ty,tm))),ix=Math.round((src-Er.f)/864e5);
    al.dt.push(src);
    if(ix<0){al.days.push(null);al.cum.push(0)}
    else if(ix>=Er.n){al.days.push(null);al.cum.push(Er.cum[Er.n-1]||0)}
    else{al.days.push(Er.days[ix]);al.cum.push(Er.cum[ix])}}
  Er.n=Lt.n;Er.cap=Lt.n;Er.days=al.days;Er.cum=al.cum;Er.dt=al.dt;
  var N=Math.max(sa.n,sb.n),C=N;
  if(sa.cap<sa.n||sb.cap<sb.n)C=Math.min(sa.cap<sa.n?sa.cap:N,sb.cap<sb.n?sb.cap:N);
  CM={a:sa,b:sb,N:N,C:C};
  var W=340,H=196,pl=40,pr=10,pt=14,pb=24,w=W-pl-pr,h=H-pt-pb,mx=1;
  [sa,sb].forEach(function(s){mx=Math.max(mx,s.cum[s.cap-1]||0,s.cum[Math.min(C,s.n)-1]||0)});
  var st=Math.pow(10,Math.floor(Math.log10(mx)));mx=Math.ceil(mx/st*2)/2*st;
  var X=function(i){return pl+w*(i/Math.max(1,N-1))},Y=function(v){return pt+h*(1-v/mx)};
  CM.g={W:W,pl:pl,w:w,pt:pt,h:h,N:N,mx:mx};
  var pts=function(s,from,to){var r=[];for(var i=from;i<to&&i<s.n;i++)r.push(X(i).toFixed(1)+","+Y(s.cum[i]).toFixed(1));return r.join(" ")};
  var o='<div class="cmchart" style="margin:16px 0 4px"><div style="font-weight:600;margin-bottom:6px" class="mute">Spending day by day</div><div class="seg2" style="margin-bottom:8px"><button type="button" class="'+(ev?'':'on')+'" data-cmev="0">All expense</button><button type="button" class="'+(ev?'on':'')+'" data-cmev="1">Daily expense</button></div>'
   +'<div class="cmtip" style="min-height:40px;font-size:13px;margin-bottom:4px"><span class="mute">Touch the graph to see a day</span></div>'
   +'<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;touch-action:pan-y;user-select:none;-webkit-user-select:none">';
  [0,.5,1].forEach(function(k){var y=Y(mx*k);o+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" style="stroke:var(--line)" stroke-width="1"/><text x="'+(pl-5)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" style="fill:var(--mute)">'+shortN(mx*k)+'</text>'});
  [0,.25,.5,.75,1].forEach(function(k){var i=Math.round((N-1)*k);o+='<text x="'+X(i)+'" y="'+(H-8)+'" text-anchor="'+(k===0?"start":k===1?"end":"middle")+'" font-size="9" style="fill:var(--mute)">'+(i+1)+'</text>'});
  [[sa,"#E08A2E"],[sb,"#5B3FD4"]].forEach(function(z){var s=z[0],c=z[1],solid=Math.min(s.cap,C);
    if(s.cap>C)o+='<polyline fill="none" stroke="'+c+'" stroke-opacity=".4" stroke-width="2" stroke-dasharray="4 4" points="'+pts(s,C-1,s.cap)+'"/>';
    if(s===sb&&solid>1)o+='<polygon fill="'+c+'" fill-opacity=".12" points="'+pts(s,0,solid)+' '+X(solid-1).toFixed(1)+','+Y(0).toFixed(1)+' '+X(0).toFixed(1)+','+Y(0).toFixed(1)+'"/>';
    o+='<polyline fill="none" stroke="'+c+'" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="'+pts(s,0,solid)+'"/>'});
  o+='</svg><div class="row" style="justify-content:flex-start;gap:14px;font-size:12px;margin-top:4px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#E08A2E;margin-right:5px"></i>'+esc(sa.lab)+'</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#5B3FD4;margin-right:5px"></i>'+esc(sb.lab)+'</span></div><details class="cminfo"><summary>ⓘ How this is compared</summary><div class="note">'+(ev?'<b>Everyday only</b> leaves out fixed bills such as EMIs and rent, so you see normal day-to-day spending.':'<b>All spending</b> is every payment, including fixed bills such as EMIs and rent.')+' The same date is compared, for example 11 Nov with 11 Oct. '+esc(sa.lab)+' runs from '+cmD(sa.f)+' and '+esc(sb.lab)+' from '+cmD(sb.f)+'. Numbers across the bottom are days since the month started'+(C<N?' · faded = after today':'')+'.</div>'+(extra||'')+'</details></div>';
  return o}
var cmOn=false;
function cmShow(box,cx){if(!CM)return;var svg=box.querySelector("svg"),r=svg.getBoundingClientRect(),g=CM.g;if(!r.width)return;
  var vx=(cx-r.left)/r.width*g.W,i=Math.round((vx-g.pl)/g.w*(g.N-1));i=Math.max(0,Math.min(g.N-1,i));var x=g.pl+g.w*i/Math.max(1,g.N-1);
  var Y=function(v){return g.pt+g.h*(1-v/g.mx)};
  var m=svg.querySelector(".cmm");if(!m){svg.insertAdjacentHTML("beforeend",'<g class="cmm" pointer-events="none"><line stroke="#64748b" stroke-width="1" stroke-dasharray="3 3"/><circle r="5" fill="#E08A2E" stroke="#fff" stroke-width="1.5" class="cma1"/><circle r="5" fill="#5B3FD4" stroke="#fff" stroke-width="1.5" class="cmb1"/></g>');m=svg.querySelector(".cmm")}
  var ln=m.querySelector("line");ln.setAttribute("x1",x);ln.setAttribute("x2",x);ln.setAttribute("y1",g.pt);ln.setAttribute("y2",g.pt+g.h);
  var blk=function(s,col,cl){var c=m.querySelector(cl),ok=i<s.n&&i<s.cap;if(!ok){c.setAttribute("display","none");return '<div style="flex:1;min-width:0"><b style="color:'+col+'">'+esc(s.lab)+'</b><div class="mute" style="font-size:12px">'+(i<s.n?'No data yet':'No such day')+'</div></div>'}
    c.removeAttribute("display");c.setAttribute("cx",x);c.setAttribute("cy",Y(s.cum[i]));var d=s.days[i]||{t:0,by:{},it:[]},ks=Object.keys(d.by).sort(function(p,q){return d.by[q]-d.by[p]});
    var dt=s.dt[i];
    return '<div style="flex:1;min-width:0"><b style="color:'+col+'">'+esc(dt.toLocaleString("en-IN",{day:"numeric",month:"short"}))+'</b> · '+money(Math.round(d.t))+'<div class="mute" style="font-size:12px">Total so far '+money(Math.round(s.cum[i]))+'</div>'
     +(ks.length?ks.slice(0,5).map(function(k){return '<div style="display:flex;justify-content:space-between;gap:6px;font-size:12px;margin-top:3px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(k===UNC?"No category yet":k)+'</span><b>'+money(Math.round(d.by[k]))+'</b></div>'}).join('')+(ks.length>5?'<div class="mute" style="font-size:11px">+'+(ks.length-5)+' more</div>':''):'<div class="mute" style="font-size:12px;margin-top:3px">Nothing spent</div>')+'</div>'};
  box.querySelector(".cmtip").innerHTML='<div style="display:flex;gap:12px;align-items:flex-start">'+blk(CM.a,"#E08A2E",".cma1")+blk(CM.b,"#5B3FD4",".cmb1")+'</div>'}
document.addEventListener("pointerdown",function(e){var b=e.target&&e.target.closest&&e.target.closest(".cmchart svg");if(!b)return;cmOn=b.parentNode;cmShow(cmOn,e.clientX)});
document.addEventListener("pointermove",function(e){if(cmOn&&(e.buttons||e.pointerType==="touch"))cmShow(cmOn,e.clientX)});
["pointerup","pointercancel"].forEach(function(k){document.addEventListener(k,function(){cmOn=false})});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-cmev]");if(!b)return;S.cmEv=b.getAttribute("data-cmev")==="1";render()});
function sm(n){return n<0?'−'+money(Math.abs(n)):money(n)}
function compareMonths(){
  var avail=[];
  for(var k=0;k>=-5;k--){(function(k){var f=iso(pdate(k)),t=iso(pend(k));if(S.txns.some(function(x){return personOK(x)&&x.type==="out"&&isCount(x)&&x.txn_date&&x.txn_date>=f&&x.txn_date<=t}))avail.push(k)})(k)}
  if(avail.length<2)return '<h2>Compare months</h2><div class="card mute">Comparison appears once the app has two months of data.</div>';
  var b=avail.indexOf(S.cmB)>=0?S.cmB:avail[0],a=(avail.indexOf(S.cmA)>=0&&S.cmA!==b)?S.cmA:(avail.filter(function(x){return x<b})[0]);
  if(a===undefined)a=avail.filter(function(x){return x!==b})[0];
  var el=Math.max(0,Math.round((new Date(iso(new Date())+"T00:00:00")-pdate(0))/864e5));
  var md=function(k,cap){var f=pdate(k),t=pend(k);if(cap!=null){var c=new Date(f);c.setDate(c.getDate()+cap);if(c<t)t=c}
    var fi=iso(f),ti=iso(t),Lc=S.txns.filter(function(x){return personOK(x)&&isCount(x)&&x.txn_date&&x.txn_date>=fi&&x.txn_date<=ti}),X=expenseSplit(Lc,fi,ti),A=X.useM?{sum:0,ids:{}}:autoFixed(X.outs,k),eo=X.outs.filter(function(x){return !A.ids[x.id]});
    return {sp:X.total,fx:A.sum+X.mand,ev:X.ev-A.sum,rec:sum(Lc,"in"),by:catTotals(eo),outs:X.outs,ids:A.ids}};
  var capA=(b===0&&a!==0)?el:null,capB=(a===0&&b!==0)?el:null,A=md(a,capA),B=md(b,capB);
  var opt=function(sel){return avail.map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(pnameDate(pdate(k)).toLocaleString("en-IN",{month:"long",year:"numeric"}))+'</option>'}).join('')};
  var h='<div class="card">'+sxHead('📊','Compare months','Two months side by side')+'<div class="row" style="gap:10px;margin:0 0 6px"><select id="cma" style="flex:1;min-width:0;margin:0">'+opt(a)+'</select><select id="cmb" style="flex:1;min-width:0;margin:0">'+opt(b)+'</select></div>';
  var spend=function(lbl,x,y){return '<div style="margin:12px 0 0"><div class="mute" style="font-size:12px">'+lbl+'</div><div class="row"><span class="mute">'+money(x)+'</span><span class="mute">→</span><b>'+money(y)+'</b>'+arrow(y,x)+'</div></div>'};
  var gain=function(lbl,x,y){var d=y-x;return '<div class="cmt"><span>'+lbl+'</span><b>'+sm(y)+'</b><em class="'+(d>=0?'in':'out')+'">'+(d>=0?'▲ ':'▼ ')+money(Math.abs(d))+'</em></div>'};
  h+='<div class="row" style="gap:10px;margin:12px 0 4px;align-items:stretch">'+gain("Money received",A.rec,B.rec)+gain("Left over",A.rec-A.sp,B.rec-B.sp)+'</div>';
  var keys={};Object.keys(A.by).concat(Object.keys(B.by)).forEach(function(k){keys[k]=1});
  var ch=Object.keys(keys).map(function(k){return {k:k,a:A.by[k]||0,b:B.by[k]||0,d:(B.by[k]||0)-(A.by[k]||0)}});
  var up=ch.filter(function(x){return x.d>0}).sort(function(x,y){return y.d-x.d}).slice(0,3),dn=ch.filter(function(x){return x.d<0}).sort(function(x,y){return x.d-y.d}).slice(0,3);
  var rows=function(l,cl,sg){var mxd=Math.max.apply(null,l.map(function(x){return Math.abs(x.d)}).concat([1]));return l.length?l.map(function(x){return '<div class="cmr"><span>'+esc(x.k===UNC?"No category yet":x.k)+'</span><span class="cmb"><i style="width:'+Math.max(6,Math.round(Math.abs(x.d)/mxd*100))+'%;background:var(--'+cl+')"></i></span><b class="'+cl+'">'+(sg==="▲"?'+':'−')+money(Math.round(Math.abs(x.d)))+'</b></div>'}).join(''):'<div class="mute" style="margin:6px 2px">Nothing</div>'};
  h+=cmChart(a,b,A,B,(capA!=null||capB!=null?'<div class="note">This month is still running, so the other month is compared on the same number of days.</div>':'')+'<div class="note">Fixed bills such as EMIs are kept out of “Daily expense” and the lists below.</div>');
  h+='<div class="cmh">WENT UP</div>'+rows(up,"out","▲")+'<div class="cmh">WENT DOWN</div>'+rows(dn,"in","▼");
  return h+'</div>'}
function pie(by,total){
  var ks=Object.keys(by).sort(function(a,b){return by[b]-by[a]}),items=[],rest=0;
  ks.forEach(function(k,i){if(i<7)items.push([k,by[k]]);else rest+=by[k]});
  if(rest>0)items.push(["Everything else",rest]);
  var C=2*Math.PI*40,acc=0,svg='<svg viewBox="0 0 120 120" width="170" height="170" role="img" aria-label="Spending by category"><g transform="rotate(-90 60 60)">';
  items.forEach(function(it,i){var len=it[1]/total*C;
    svg+='<circle cx="60" cy="60" r="40" fill="none" stroke="'+colr(it[0],i)+'" stroke-width="22" stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'"/>';acc+=len});
  svg+='</g></svg>';
  var lg='<div style="flex:1;min-width:160px">';
  items.forEach(function(it,i){lg+='<div class="row" style="margin:5px 0;font-size:14px"><span><i style="display:inline-block;width:11px;height:11px;border-radius:3px;background:'+colr(it[0],i)+';margin-right:7px"></i>'+esc(it[0])+'</span><span><b>'+Math.round(it[1]/total*100)+'%</b> <span class="mute">'+money(it[1])+'</span></span></div>'});
  return '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center">'+svg+lg+'</div></div>';
}
function catTotals(list){var o={};list.forEach(function(t){var c=t.category||UNC;o[c]=(o[c]||0)+Number(t.amount)});return o}
function prevList(){
  if(!S.from||!S.to)return null;
  var a=new Date(S.from+"T00:00:00"),b=new Date(S.to+"T00:00:00"),days=Math.round((b-a)/864e5)+1;
  var ps=new Date(a),pe=new Date(a);ps.setDate(a.getDate()-days);pe.setDate(a.getDate()-1);
  var f=iso(ps),t=iso(pe);return S.txns.filter(function(x){var d=x.txn_date||"";return personOK(x)&&isCount(x)&&d>=f&&d<=t&&x.type==="out"});
}
function insights(Lc,by,total){
  var tips=[],DISC={"Food":1,"Shopping":1,"Leisure":1,"Entertainment":1,"Travel":1,"Food – Dining out":1,"Food – Online delivery":1,"Shopping – Offline":1,"Shopping – Online":1};
  var outs=Lc.filter(function(t){return t.type==="out"}),ks=Object.keys(by).sort(function(a,b){return by[b]-by[a]});
  if(!ks.length||total<=0)return tips;
  var top=ks[0];tips.push("<b>"+esc(top)+"</b> is your biggest spend: "+money(by[top])+" ("+Math.round(by[top]/total*100)+"% of the total).");
  var disc=0;ks.forEach(function(k){if(DISC[k])disc+=by[k]});
  if(disc>0)tips.push("Eating out, delivery, shopping, entertainment and travel add up to <b>"+money(disc)+"</b> ("+Math.round(disc/total*100)+"%). These are the easiest to trim. Cutting 10% would save about "+money(disc*0.1)+".");
  var fd=outs.filter(function(t){return t.category==="Food – Online delivery"||(t.category==="Food"&&/swiggy|zomato|blinkit|zepto|instamart|eatsure|dunzo/i.test(t.merchant||""))});
  if(fd.length>=3)tips.push("You placed <b>"+fd.length+" food delivery orders</b> averaging "+money(sum(fd,"out")/fd.length)+" each. Cooking at home a few of those times would add up.");
  var pv=prevList();
  if(pv&&pv.length){var pc=catTotals(pv);
    ks.forEach(function(k){if(k===UNC)return;var was=pc[k]||0,now=by[k];
      if(now-was>=500&&(was===0||now>=was*1.25))tips.push("<b>"+esc(k)+"</b> is up "+(was?Math.round((now-was)/was*100)+"%":"from nothing")+" compared with the previous period ("+money(was)+" to "+money(now)+").")})}
  var cnt={};outs.forEach(function(t){var m=t.merchant||"Unknown";(cnt[m]=cnt[m]||{n:0,s:0}).n++;cnt[m].s+=Number(t.amount)});
  Object.keys(cnt).sort(function(a,b){return cnt[b].s-cnt[a].s}).slice(0,12).some(function(m){var c=cnt[m];
    if(c.n>=5&&c.s/c.n<600){tips.push("<b>"+c.n+" small payments to "+esc(m)+"</b> total "+money(c.s)+". Small amounts that repeat are easy to miss.");return true}return false});
  var nc=by[UNC]||0;
  if(nc>0&&nc/total>0.15)tips.push(Math.round(nc/total*100)+"% of your spending has no category yet ("+money(nc)+"). Choose categories so these ideas become more accurate.");
  return tips.slice(0,6);
}
