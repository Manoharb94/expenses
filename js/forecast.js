/* ---------- forecast ---------- */
function monthStart(off){return pdate(off)}
function monthKey(off){return ym(monthStart(off))}
function txIn(key){return S.txns.filter(function(t){return personOK(t)&&pkey(t.txn_date)===key})}
function fixedCats(){var o={};S.fixed.forEach(function(f){if(f.category)o[f.category]=1});return o}
function monthVar(key,type){var fc=fixedCats();
  return txIn(key).filter(function(t){return t.type===type&&isCount(t)&&(type==="in"||!fc[t.category])}).reduce(function(a,t){return a+Number(t.amount)},0)}
function forecastBase(){
  var now=new Date(),cur=monthKey(0),mine=S.txns.filter(personOK).filter(function(t){return t.txn_date});
  if(!mine.length)return {n:0,out:0,inn:0,basis:"no data yet"};
  var earliest=mine.map(function(t){return pkey(t.txn_date)}).sort()[0];
  if(earliest>=cur){var day=Math.round((new Date(iso(now)+"T00:00:00")-pdate(0))/864e5)+1,dim=Math.round((pdate(1)-pdate(0))/864e5);
    return {n:0,out:monthVar(cur,"out")/day*dim,inn:monthVar(cur,"in")/day*dim,basis:"this month so far, projected to a full month"}}
  var ks=[];for(var i=1;i<=3;i++){var k=monthKey(-i);if(k<earliest)break;ks.push(k)}
  var fc=fixedCats(),bm={};S.budgets.forEach(function(b){if(Number(b.amount)>0)bm[b.category]=Number(b.amount)});
  var per={},ins=[],insAll=[],unc=[];
  ks.forEach(function(k){var mi=0,ma=0,mu=0;txIn(k).forEach(function(t){if(!isCount(t))return;var a=Number(t.amount);
    if(t.type==="in"){ma+=a;if(t.category==="Salary / Income"||t.category===RENT)mi+=a;return}
    if(!t.category){mu+=a;return}
    if(fc[t.category]||t.category===UNPL)return;var c=t.category;(per[c]=per[c]||{})[k]=((per[c]||{})[k]||0)+a});ins.push(mi);insAll.push(ma);unc.push(mu)});
  function med(a){var b=a.slice().sort(function(x,y){return x-y}),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
  var cats=[],tot=0;Object.keys(per).forEach(function(c){var arr=ks.map(function(k){return per[c][k]||0}),est=bm[c]?bm[c]:med(arr);tot+=est;cats.push({c:c,est:est,budget:!!bm[c]})});
  Object.keys(bm).forEach(function(c){if(!per[c]&&!fc[c]){tot+=bm[c];cats.push({c:c,est:bm[c],budget:true})}});
  cats.sort(function(a,b){return b.est-a.est});
  var salMed=med(ins);return {n:ks.length,out:tot,inn:salMed>0?salMed:med(insAll),innSal:salMed>0,unc:med(unc),cats:cats,basis:"your budgets where you set one, otherwise a typical month from your last "+ks.length+" full month"+(ks.length>1?"s":"")+" (one-off big payments and Unplanned expenses are left out)"}
}
function mny(n){n=Math.round(n);return (n<0?"−":"")+money(Math.abs(n))}
function forecastView(n){
  var b=forecastBase(),rows=[],tot=0,i;
  for(i=1;i<=n;i++){var d=monthStart(i),v=b.out+fixedIn(d.getMonth()+1);rows.push([d,v]);tot+=v}
  var h='';
  if(!S.fixed.length)h+='<div class="card mute">Add fixed expenses such as your home loan and school fees in the <b>Plan</b> tab for a better forecast.</div>';
  var title=n===1?"Expected spending next month":"Expected spending over the next 12 months";
  h+='<div class="card"><div class="mute">'+title+'</div><div class="big out">'+mny(tot)+'</div><div class="note">Everyday spending is based on '+esc(b.basis)+', plus your fixed items. It is an estimate, not a promise.</div></div>';
  var recv=b.inn*n;
  h+='<div class="grid"><div class="card"><div class="mute">Expected money received</div><div style="font-size:20px;font-weight:700" class="in">'+mny(recv)+'</div><div class="note" style="margin-top:2px">'+(b.innSal?'salary & rental income':'all money received')+'</div></div><div class="card"><div class="mute">Expected left over</div><div style="font-size:20px;font-weight:700" class="'+(recv-tot>=0?"in":"out")+'">'+mny(recv-tot)+'</div></div></div>';
  if(b.unc>0)h+='<div class="card" style="border:1.5px solid var(--out)"><b>'+mny(b.unc)+' of payments have no category</b><div class="note">These are left out of the forecast, because untagged items are often large transfers. Go to Summary → "need a category" → Review and tag them, then they count.</div></div>';
  if(n===1){var fx=fixedIn(monthStart(1).getMonth()+1);
    h+='<div class="card"><div class="row"><span>Everyday spending</span><b>'+mny(b.out)+'</b></div><div class="row" style="margin-top:6px"><span>Fixed items due</span><b>'+mny(fx)+'</b></div></div>';
    if(b.cats&&b.cats.length){h+='<div class="card">'+sxHead('🧩','What makes up everyday spending','Day-to-day spending only')+'';
      b.cats.slice(0,10).forEach(function(r){h+='<div class="row" style="margin:5px 0"><span>'+esc(r.c)+' <span class="mute" style="font-size:12px">· '+(r.budget?'your budget':'typical month')+'</span></span><b>'+mny(r.est)+'</b></div>'});
      h+='<div class="note">If a category here looks too big, a large transfer or payment is probably filed under it. Tag it as Transfer, Pass-through, Lend out or Ignore and the forecast corrects itself.</div></div>'}}
  else{var mx=Math.max.apply(null,rows.map(function(r){return r[1]}))||1;
    h+='<div class="card">'+sxHead('📅','Month by month','Spending over the last months')+'';
    rows.forEach(function(r){h+='<div style="margin-bottom:8px"><div class="row"><span>'+r[0].toLocaleString("en-IN",{month:"short",year:"2-digit"})+'</span><b>'+mny(r[1])+'</b></div><div class="bar"><i style="width:'+Math.round(r[1]/mx*100)+'%"></i></div></div>'});
    h+='</div>'}
  if(tot===0)h+='<div class="card mute">There is not enough data for a forecast yet.</div>';
  return h;
}
