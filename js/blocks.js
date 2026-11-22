/* ---------- views ---------- */
function cardSums(L){
  var sp=L.filter(function(t){return t.kind==="card"&&t.type==="out"&&isCount(t)});
  var bank=L.filter(function(t){return t.category===CCB&&t.kind!=="card"&&t.type==="out"});
  var cr=L.filter(function(t){return t.category===CCB&&t.kind==="card"&&t.type==="in"});
  var paid=sum(bank,"out")||sum(cr,"in");
  return {spent:sum(sp,"out"),n:sp.length,paid:paid};
}
function evRange(){
  var sel=S.ev,ms=monthsWithData();if(sel!=="6m"&&sel!=="m0"&&ms.indexOf(Number(sel.slice(1)))<0)sel="m0";
  if(sel==="6m"){var o=[];for(var k=-5;k<=0;k++)o=o.concat(txIn(monthKey(k)));return {L:o,label:"Last 6 months"}}
  var k2=Number(sel.slice(1));return {L:k2===0?S.txns.filter(inRange):txIn(monthKey(k2)),label:k2===0?"This month":pnameDate(pdate(k2)).toLocaleString("en-IN",{month:"long",year:"numeric"})}}
function cardBlock(L,label){
  var c=cardSums(L),cr=L.some(function(t){return t.category===CCB&&t.kind==="card"&&t.type==="in"});
  var rows=L.filter(function(t){return t.kind==="card"}).map(function(t){return {t:t,ty:t.type,bill:t.category===CCB}});
  if(!cr)L.filter(function(t){return t.category===CCB&&t.kind!=="card"&&t.type==="out"}).forEach(function(t){rows.push({t:t,ty:"in",bill:1})});
  if(!rows.length&&!c.paid)return '';
  rows.sort(function(a,b){return (a.t.txn_date||"")<(b.t.txn_date||"")?1:-1});
  var h='<h2>Credit card'+(label?' <span class="mute" style="font-weight:500;font-size:13px">· '+esc(label)+'</span>':'')+'</h2><div class="card"><div class="row" style="margin:4px 0"><span>Spent on card</span><b class="out">'+money(c.spent)+'</b></div>';
  if(rows.length){h+='<div style="max-height:340px;overflow:auto;margin-top:8px">';
    rows.forEach(function(r){var t=r.t;h+='<div class="lt" data-cat="'+t.id+'"><span class="ico" style="background:'+tint(r.bill?'Bills':t.category)+'">'+(r.bill?'💳':ci(t.category))+'</span><div class="m"><b>'+esc(r.bill?'Card Payment':(t.merchant||"Unknown"))+'</b><span>'+esc(dayLabel(t.txn_date))+'</span></div><b class="'+(r.ty==="out"?"out":"in")+'">'+(r.ty==="out"?"−":"+")+money(t.amount)+'</b></div>'});
    h+='</div>'}
  return h+'<div class="note">Bill payments aren’t counted as spending.</div></div>'}
function trfBlock(L){
  if(S.pf!=="__both")return '';
  var tr=L.filter(function(t){return t.category===TRF});if(!tr.length)return '';
  var by={};tr.forEach(function(t){var p=t.person||"?";by[p]=by[p]||{s:0,r:0};if(t.type==="out")by[p].s+=Number(t.amount);else by[p].r+=Number(t.amount)});
  var h='<div class="card">'+sxHead('🔄','Transfers between us','Money moved inside the family')+'';
  Object.keys(by).forEach(function(p){h+='<div class="row" style="margin:4px 0"><span>'+esc(p)+'</span><span>sent <b>'+money(by[p].s)+'</b> · received <b>'+money(by[p].r)+'</b></span></div>'});
  var lst=tr.slice().sort(function(a,b){return (a.txn_date||"")<(b.txn_date||"")?1:-1});
  h+='<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600;color:var(--acc)">Show all '+tr.length+' transfer'+(tr.length>1?'s':'')+'</summary>';
  lst.forEach(function(t){h+='<div class="row" style="margin:8px 0"><span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">'+esc(t.merchant||"Transfer")+'</b><span class="mute" style="font-size:12px">'+esc(t.txn_date||"")+' · '+esc(t.person||"")+' '+(t.type==="out"?'sent':'received')+'</span></span><b class="'+t.type+'">'+(t.type==="out"?"−":"+")+money(t.amount)+'</b></div>'});
  h+='</details>';
  return h+'<div class="note">Money moved between you two. It is left out of spending and money received.</div></div>';
}
var SUBRE=/netflix|spotify|youtube|prime video|amazon prime|hotstar|disney|jiocinema|jio ?cinema|sonyliv|sony liv|zee5|apple\.?com|itunes|icloud|google (one|play|storage)|microsoft|office ?365|adobe|canva|chatgpt|openai|claude|notion|dropbox|audible|kindle|linkedin|duolingo|gaana|wynk|hungama|sun ?nxt|aha|mubi|netflix|crunchyroll|tinder|bumble|cult\.?fit|cultpass|subscription|membership|playstation|xbox|nordvpn|expressvpn/i;
function isLend(t){return t.category===LOUT||t.category===LIN}
function privOK(t){return !isLend(t)||t.person===S.name}
function lendBlock(){
  if(S.pf&&S.pf!=="__both"&&S.pf!==S.name)return '';
  var by={},any=false;
  S.txns.filter(function(t){return isLend(t)&&t.person===S.name}).forEach(function(t){
    any=true;var k=t.merchant||"Unknown",o=by[k]=by[k]||{lent:0,back:0,took:0,paid:0,e:[]},a=Number(t.amount);
    if(t.category===LOUT){if(t.type==="out"){o.lent+=a;o.e.push([t.txn_date,"lent",a,t.note])}else{o.back+=a;o.e.push([t.txn_date,"got back",a,t.note])}}
    else{if(t.type==="in"){o.took+=a;o.e.push([t.txn_date,"borrowed",a,t.note])}else{o.paid+=a;o.e.push([t.txn_date,"paid back",a,t.note])}}});
  if(!any){if(ls("lenddis"))return '';return '<h2>Lending <span class="mute" style="font-weight:400;font-size:12px">🔒 only you see this</span></h2><div class="card fc len" id="lendcard"><div class="fcr"><div class="fci l">🪙</div><div><b>Lent or borrowed money?</b><div class="note">Track who owes you and who you owe. It is never counted as spending or income.</div></div></div><button class="fcb l" data-lnew="1">+ Add lender</button><button class="fcl" data-ldis="1">Hide</button></div>'}
  var rows=Object.keys(by).map(function(k){var o=by[k],r1=Math.max(0,Math.round((o.lent-o.back)*100)/100),r2=Math.max(0,Math.round((o.took-o.paid)*100)/100);return {k:k,o:o,r1:r1,r2:r2,net:Math.round((r1-r2)*100)/100,open:Math.abs(r1)+Math.abs(r2)}});
  rows.sort(function(a,b){return (a.open===0)-(b.open===0)||b.open-a.open});
  var get=0,owe=0;rows.forEach(function(r){if(r.net>0)get+=r.net;else if(r.net<0)owe-=r.net});
  S.lrows={};
  var h='<h2>Lending <span class="mute" style="font-weight:400;font-size:12px">🔒 only you see this</span></h2><div class="card fc len" id="lendcard"><div class="fsum"><div class="a"><span>You will get</span><b>'+money(get)+'</b></div><div class="b"><span>You have to pay</span><b>'+money(owe)+'</b></div></div><button class="btn ghost s" style="margin-bottom:10px" data-lnew="1">+ Add new lender</button>';
  function line(label,total,done,rem,who){
    if(total===0&&done>0)return '<div style="margin:6px 0"><div class="row"><span class="mute">'+(who==="still to get"?'Got back ':'Paid back ')+money(done)+'</span><span class="in"><b>Settled ✓</b></span></div><div class="note">No earlier '+(who==="still to get"?'lend':'borrowing')+' was recorded, so nothing is pending.</div></div>';
    var pct=total>0?Math.min(100,Math.round(done/total*100)):0;
    return '<div style="margin:6px 0"><div class="row"><span class="mute">'+label+' '+money(total)+'</span><span>'+(rem===0?'<span class="in"><b>'+(who==="still to get"?'Got back in full':'Paid in full')+' ✓</b></span>':who+' <b class="'+(rem>0&&who==="still to get"?"in":"out")+'">'+money(Math.abs(rem))+'</b>')+'</span></div><div class="bar"><i style="width:'+pct+'%"></i></div><div class="note">'+(who==="still to get"?'Got back ':'Paid back ')+money(done)+' of '+money(total)+' ('+pct+'%)'+(done>total?' · '+money(done-total)+' more than recorded, counted as settled':'')+'</div></div>'}
  var lf=S.lf||"pend",np=rows.filter(function(r){return r.open>0}).length,nd=rows.length-np;
  h+='<select id="lflt" style="margin:0 0 4px"><option value="pend"'+(lf==="pend"?' selected':'')+'>Pending ('+np+')</option><option value="done"'+(lf==="done"?' selected':'')+'>Settled ('+nd+')</option><option value="all"'+(lf==="all"?' selected':'')+'>All ('+rows.length+')</option></select>';
  var shown=0;
  rows.forEach(function(r){var o=r.o;
    if(lf==="pend"&&r.open===0)return;if(lf==="done"&&r.open>0)return;shown++;
    h+='<div class="swp" style="border-radius:0;margin:12px 0 0;border-top:1px solid var(--line)"><div class="swa" data-sw="lend|'+encodeURIComponent(r.k)+'|">Delete</div><div class="swc"><div style="padding:10px 0 12px"><b>'+esc(r.k)+'</b>';
    if(o.lent||o.back)h+=line("You lent",o.lent,o.back,r.r1,"still to get");
    if(o.took||o.paid)h+=line("You borrowed",o.took,o.paid,r.r2,"still to pay");
    o.e.sort(function(a,b){return a[0]<b[0]?1:-1});
    S.lrows[r.k]={r1:r.r1,r2:r.r2};
    o.e.slice(0,10).forEach(function(x){var def=(x[1]==="lent"||x[1]==="got back")?"o|in":"i|out";
      h+='<div class="row" style="margin:6px 0;align-items:center"><span style="font-size:14px"><span class="mute">'+esc(x[0]||"")+'</span> '+x[1]+' <b>'+money(x[2])+'</b>'+(x[3]?'<span class="mute"> · '+esc(x[3])+'</span>':'')+'</span><button class="btn ghost" style="width:auto;flex:none;padding:4px 11px;font-size:12px" data-lt="'+encodeURIComponent(r.k)+'" data-ldef="'+def+'">Tally</button></div>'});
    if(o.e.length>10)h+='<div class="note">'+(o.e.length-10)+' older entries not shown.</div>';
    h+='</div></div></div>'});
  if(!shown)h+='<div class="note" style="margin:10px 0">'+(lf==="pend"?'Nothing pending. Everyone is settled.':lf==="done"?'Nothing settled yet.':'No lending yet.')+'</div>';
  return h+'<div class="note">Lending is never counted as spending or income. To link a repayment to the same person, tap it, choose Lend out or Lend in, and type the same name. This covers all dates.</div></div>';
}
function unplannedBlock(Lc){
  var l=Lc.filter(function(t){return t.type==="out"&&t.category===UNPL});if(!l.length)return '';
  l.sort(function(a,b){return b.amount-a.amount});
  var h='<div class="card">'+sxHead('⚡','Unplanned expenses','Things you did not plan for')+'<div class="row"><span>'+l.length+' payment'+(l.length>1?'s':'')+'</span><b class="out">'+money(sum(l,"out"))+'</b></div>';
  l.slice(0,5).forEach(function(t){h+='<div class="row mute" style="margin:4px 0"><span>'+esc(t.merchant||"Unknown")+' · '+esc(t.txn_date||"")+'</span><span>'+money(t.amount)+'</span></div>'});
  return h+'<div class="note">Already included in Total expenses.</div></div>';
}
function incomeBlock(Lc,L){
  var ins=Lc.filter(function(t){return t.type==="in"}),both=S.pf==="__both",who=both?persons():[S.pf||S.name];
  var h='<div class="card">'+sxHead('💰','Income','Money received')+'',grand=0;
  who.forEach(function(p){
    var l=ins.filter(function(t){return t.person===p}),by={},tot=0;
    l.forEach(function(t){var c=t.category||"Other income (no category yet)";by[c]=(by[c]||0)+Number(t.amount);tot+=Number(t.amount)});grand+=tot;
    h+='<div style="margin:8px 0"><div class="row"><b>'+esc(p)+(p===S.name?" (you)":"")+'</b><b class="in">'+money(tot)+'</b></div>';
    Object.keys(by).sort(function(a,b){return by[b]-by[a]}).forEach(function(c){h+='<div class="row mute" style="margin:3px 0"><span>'+esc(c)+'</span><span>'+money(by[c])+'</span></div>'});
    if(!l.length)h+='<div class="note">No income in this period.</div>';
    var tr=(L||[]).filter(function(t){return t.category===TRF&&t.person===p}),sent=0,got=0;
    tr.forEach(function(t){if(t.type==="out")sent+=Number(t.amount);else got+=Number(t.amount)});
    if(sent>0||got>0){var bal=tot-sent+got;
      if(sent>0)h+='<div class="row" style="margin:3px 0"><span>Sent to family</span><span class="out">−'+money(sent)+'</span></div>';
      if(got>0)h+='<div class="row" style="margin:3px 0"><span>Received from family</span><span class="in">+'+money(got)+'</span></div>';
      h+='<div class="row" style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)"><b>Balance after transfers</b><b class="'+(bal>=0?"in":"out")+'">'+money(bal)+'</b></div>'}
    h+='</div>'});
  if(both&&who.length>1)h+='<div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b>Together</b><b class="in">'+money(grand)+'</b></div>';
  return h+'<div class="note">Tap an income payment in History once and choose Salary / Income or Rental income. Later payments from the same payer file themselves. Money sent to a family member is taken off the sender’s balance.</div></div>';
}
function dueIn(f,from,to){
  var a=new Date(from+"T00:00:00"),b=new Date(to+"T00:00:00"),n=0,y=a.getFullYear(),m=a.getMonth();
  while(new Date(y,m,1)<=b){
    if(occurs(f,m+1)){var dim=new Date(y,m+1,0).getDate(),d=new Date(y,m,Math.min(Number(f.day||1),dim));if(d>=a&&d<=b)n++}
    m++;if(m>11){m=0;y++}}
  return n}
function periodDates(){
  var from=S.from,to=S.to;
  if(!from){var ds=S.txns.filter(personOK).map(function(t){return t.txn_date}).filter(Boolean).sort();from=ds[0]||iso(new Date())}
  if(S.range==="month")to=iso(pend(0));
  if(!to)to=iso(new Date());
  return {from:from,to:to}}
var CATI={"Groceries – Offline":"🛒","Groceries – Online":"🥬","Shopping – Offline":"🛍️","Shopping – Online":"📦","Food – Dining out":"🍽️","Food – Online delivery":"🛵","Transport":"🚌","Fuel":"⛽","Bills & Utilities":"💡","Rent / EMI":"🏠","Health":"💊","Beauty / Salon":"💇","Entertainment":"🎬","Subscriptions":"🔁","Travel":"✈️","Education":"🎓","Home loan EMI":"🏦","Kid education":"📚","Kid day care":"🧸","Kid expense":"👶","Maid":"🧹","Cook":"🍳","Car cleaning":"🚗","Electricity bill":"⚡","Gas bill":"🔥","Family donation":"🙏","Unplanned expense":"⚠️","Family & Friends":"👪","Salary / Income":"💼","Rental income":"🏘️","Other":"📌","Lend out":"🤝","Lend in":"🤝","Mandatory":"📌"};
CATI[TRF]="🔁";CATI[SELF]="🔄";CATI[PASS]="🔀";CATI["GPay wallet"]="👛";CATI["Trips"]="🧳";CATI["Pet expenses"]="🐾";CATI["Car Expenses"]="🚗";CATI["Bike Expenses"]="🏍️";CATI["Refunds"]="↩️";CATI[CCB]="💳";CATI[IGN]="🚫";CATI[UNC]="❔";CATI["Groceries"]="🛒";CATI["Food"]="🍽️";CATI["Shopping"]="🛍️";CATI["House Rent"]="🏠";CATI["EMI"]="🏦";CATI["Leisure"]="🎯";CATI["Gadgets"]="📱";CATI["Investment"]="📈";CATI["Kids"]="🧸";CATI["Home Services"]="🧹";
var CICON=(function(){try{return JSON.parse(ls("cicons")||"{}")}catch(e){return {}}})();
var KW=[[/non.?veg|chicken|mutton|meat|\bfish\b|\begg/i,"🍗"],[/app dev|software|coding|developer|website|domain|hosting|godaddy|\baws\b|saas/i,"💻"],[/speaker|headphone|earphone|laptop|electronic|gadget/i,"🔊"],[/donat|charity|temple|pooja|puja/i,"🙏"],[/trip|tour|vacation|holiday|\bgoa\b|resort|hotel/i,"✈️"],[/\bdog\b|\bcat\b|\bpet\b|\bvet\b/i,"🐾"],[/saving|\bsip\b|mutual|stock/i,"📈"],[/\bkid|child|baby/i,"👶"],[/insurance|policy|\blic\b/i,"🛡️"],[/family|parents|relative/i,"👪"],[/liquor|beer|wine|whisk|vodka|\brum\b|brew|alcohol|\bbar\b|\bpub\b|spirits/i,"🍺"],[/cracker|firework|diwali|sparkler/i,"🎆"],[/netflix|hotstar|prime video|\bott\b|movie|cinema|theatre|theater|show/i,"🎬"],[/spotify|music|gaana|wynk|song/i,"🎵"],[/amazon|flipkart|myntra|meesho|ajio|nykaa/i,"🛒"],[/swiggy|zomato|restaurant|cafe|coffee|tea|dining|pizza|burger|biryani|snack|sweet|bakery/i,"🍽️"],[/grocer|vegetable|fruit|milk|kirana|supermarket|bigbasket|blinkit|zepto|instamart|dmart/i,"🛒"],[/petrol|diesel|\bfuel\b|\bgas\b|cng/i,"⛽"],[/uber|ola|rapido|cab|taxi|auto|metro|bus|train|irctc|flight|ticket/i,"🚕"],[/rent/i,"🏠"],[/emi|loan|mortgage/i,"🏦"],[/electric|power|bescom|water|wifi|broadband|internet|recharge|mobile|phone|jio|airtel|\bvi\b|bill/i,"💡"],[/doctor|hospital|medic|pharma|clinic|dental|health|lab|test|gym|fitness|yoga/i,"💊"],[/school|college|tuition|course|fee|class|education|book|stationery/i,"🎓"],[/kid|child|baby|toy|daycare/i,"🧸"],[/pet|dog|cat\b|vet/i,"🐾"],[/salon|beauty|spa|haircut|parlou?r|makeup|grooming/i,"💇"],[/gadget|mobile|laptop|phone|tv\b|electronic|camera|headphone|earbud/i,"📱"],[/invest|mutual|sip\b|stock|share|gold|fd\b|ppf|nps|crypto|insurance|lic\b/i,"📈"],[/travel|trip|holiday|vacation|hotel|resort|goa/i,"✈️"],[/gift|donat|charity|temple|puja|festival/i,"🎁"],[/cloth|apparel|fashion|shoe|dress|shirt|jeans/i,"👕"],[/furniture|home|house|decor|kitchen|appliance|repair|maintenance/i,"🛋️"],[/maid|cook|clean|laundry|driver|servant/i,"🧹"],[/car\b|bike|vehicle|service|wash|tyre|parking/i,"🚗"],[/game|sport|leisure|hobby|fun|party|club/i,"🎯"],[/subscription|member|renew/i,"🔁"],[/tax|fine|penalty|challan/i,"🧾"]];
var BR=[[/netflix/i,"netflix.com"],[/hotstar|disney/i,"hotstar.com"],[/prime video|amazon prime/i,"primevideo.com"],[/amazon/i,"amazon.in"],[/flipkart/i,"flipkart.com"],[/myntra/i,"myntra.com"],[/meesho/i,"meesho.com"],[/ajio/i,"ajio.com"],[/nykaa/i,"nykaa.com"],[/swiggy/i,"swiggy.com"],[/zomato/i,"zomato.com"],[/blinkit/i,"blinkit.com"],[/zepto/i,"zeptonow.com"],[/bigbasket/i,"bigbasket.com"],[/dmart/i,"dmart.in"],[/instamart/i,"swiggy.com"],[/spotify/i,"spotify.com"],[/youtube/i,"youtube.com"],[/google|gpay|g pay/i,"google.com"],[/phonepe/i,"phonepe.com"],[/paytm/i,"paytm.com"],[/uber/i,"uber.com"],[/\bola\b/i,"olacabs.com"],[/rapido/i,"rapido.bike"],[/irctc/i,"irctc.co.in"],[/makemytrip/i,"makemytrip.com"],[/goibibo/i,"goibibo.com"],[/cleartrip/i,"cleartrip.com"],[/indigo/i,"goindigo.in"],[/air india/i,"airindia.com"],[/airtel/i,"airtel.in"],[/\bjio\b/i,"jio.com"],[/vodafone|\bvi\b/i,"myvi.in"],[/bsnl/i,"bsnl.co.in"],[/tata ?play|tata sky/i,"tataplay.com"],[/bescom/i,"bescom.co.in"],[/hdfc/i,"hdfcbank.com"],[/icici/i,"icicibank.com"],[/\bsbi\b|state bank/i,"sbi.co.in"],[/axis/i,"axisbank.com"],[/kotak/i,"kotak.com"],[/zerodha/i,"zerodha.com"],[/groww/i,"groww.in"],[/lic\b/i,"licindia.in"],[/policybazaar/i,"policybazaar.com"],[/apollo/i,"apollopharmacy.in"],[/pharmeasy/i,"pharmeasy.in"],[/1mg/i,"1mg.com"],[/practo/i,"practo.com"],[/cult\.?fit|cultfit/i,"cult.fit"],[/dominos|domino/i,"dominos.co.in"],[/mcdonald/i,"mcdonaldsindia.com"],[/kfc/i,"kfc.co.in"],[/starbucks/i,"starbucks.in"],[/pizza hut/i,"pizzahut.co.in"],[/burger king/i,"burgerking.in"],[/bookmyshow/i,"bookmyshow.com"],[/pvr/i,"pvrcinemas.com"],[/apple/i,"apple.com"],[/microsoft/i,"microsoft.com"],[/linkedin/i,"linkedin.com"],[/jiosaavn|saavn/i,"jiosaavn.com"],[/gaana/i,"gaana.com"],[/zee5/i,"zee5.com"],[/sonyliv|sony liv/i,"sonyliv.com"],[/ikea/i,"ikea.com"],[/decathlon/i,"decathlon.in"],[/reliance/i,"relianceretail.com"],[/tata/i,"tata.com"],[/swiggy one/i,"swiggy.com"],[/dunzo/i,"dunzo.com"],[/lenskart/i,"lenskart.com"],[/urban ?company/i,"urbancompany.com"],[/bluedart/i,"bluedart.com"],[/shell/i,"shell.in"],[/indian ?oil/i,"iocl.com"],[/bharat ?petroleum|\bbpcl\b/i,"bharatpetroleum.in"],[/fastag/i,"npci.org.in"]];
var _ciC={};
function ciEmoji(c){for(var i=0;i<KW.length;i++)if(KW[i][0].test(c))return KW[i][1];return "🏷️"}
function ciBrand(c){for(var i=0;i<BR.length;i++)if(BR[i][0].test(c))return BR[i][1];return ""}
function ci(c){
  if(!c)return "❔";
  if(typeof GR!=="undefined"&&GR&&GR.cat&&GR.cat[c])return GR.cat[c];
  if(_ciC[c]!=null)return _ciC[c];
  var r,o=CICON[c];
  if(o)r=esc(o);
  else if(CATI[c])r=CATI[c];
  else{var e=ciEmoji(c),d=ciBrand(c);
    r=d?'<img class="bl" src="https://www.google.com/s2/favicons?domain='+d+'&sz=64" alt="" loading="lazy" data-e="'+e+'" onerror="this.replaceWith(document.createTextNode(this.dataset.e))">':e}
  _ciC[c]=r;return r}
var SYSC={};[UNPL,"Salary / Income",RENT,"Other",LOUT,LIN,TRF,SELF,PASS,CCB,IGN].forEach(function(c){SYSC[c]=1});
var HLP="Loan Part Payment",HLPO="Home Loan Part Payment";NOBUD[HLP]=1;NOBUD[HLPO]=1;NOBUDGET[HLP]=1;NOBUDGET[HLPO]=1;SYSC[HLP]=1;CATI[HLP]="🏠";CATI[HLPO]="🏠";
function syncLoanCat(){var has=(S.loans||[]).length>0,i=CATS.indexOf(HLP);if(has&&i<0){var k=CATS.indexOf("Investment");CATS.splice(k<0?CATS.length:k+1,0,HLP)}else if(!has&&i>=0&&!(S.txns||[]).some(function(t){return t.category===HLP}))CATS.splice(i,1)}
var HIDDEN={};
function dropCat(n){var l=String(n).toLowerCase();HIDDEN[l]=1;
  for(var i=CATS.length-1;i>=0;i--)if(CATS[i].toLowerCase()===l&&!SYSC[CATS[i]])CATS.splice(i,1);
  for(var j=CUSTOMC.length-1;j>=0;j--)if(CUSTOMC[j].toLowerCase()===l)CUSTOMC.splice(j,1)}
var CUSTOMC=[];
function mergeCats(names){names.forEach(function(n){n=(n||"").trim();if(!n)return;if(n.charAt(0)==="~"){dropCat(n.slice(1));return}if(HIDDEN[n.toLowerCase()])return;if(CATS.some(function(c){return c.toLowerCase()===n.toLowerCase()}))return;CATS.push(n);CUSTOMC.push(n)})}
function localCats(){try{return JSON.parse(ls("ccats")||"[]")}catch(e){return []}}
mergeCats(localCats());
(function(){try{JSON.parse(ls("hidecats")||"[]").forEach(dropCat)}catch(e){}})();
async function addCat(name){
  name=(name||"").replace(/\s+/g," ").trim().slice(0,30);
  if(!name){return null}
  if(S.profile&&S.profile.can_edit===false){toast("View only: ask the family owner for edit access");return null}
  var ex=CATS.filter(function(c){return c.toLowerCase()===name.toLowerCase()})[0];
  if(ex){toast("“"+ex+"” already exists");return ex}
  mergeCats([name]);var l=localCats();l.push(name);ls("ccats",JSON.stringify(l));
  try{await api("household_categories",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({name:name})})}catch(e){}
  toast("Added “"+name+"”");return name}
function arrow(cur,prev){
  if(!(prev>0))return cur>0?'<span class="chip">new</span>':'';
  var d=Math.round((cur-prev)/prev*100);if(d===0)return '<span class="chip">same</span>';
  return '<span class="chip '+(d>0?'up':'down')+'">'+(d>0?'▲':'▼')+' '+Math.abs(d)+'%</span>'}
function expenseSplit(Lc,from,to,mf,mt2){
  var useM=S.pf==="__both"&&S.fixed.length>0,fc=useM?fixedCats():{};
  var outs=Lc.filter(function(t){return t.type==="out"&&!(t.category&&fc[t.category])});
  var by=catTotals(outs),ev=sum(outs,"out"),rows=[],mt=0;
  if(useM)S.fixed.forEach(function(f){var n=dueIn(f,mf||from,mt2||to),amt=n*Number(f.amount);rows.push({f:f,amt:amt});mt+=amt;
    if(amt>0){var k=f.category||f.name;by[k]=(by[k]||0)+amt}});
  return {by:by,ev:ev,rows:rows,mand:mt,total:ev+mt,useM:useM,outs:outs}}
function prevInfo(){
  var n=new Date(),pf,pt,mf,mt,label;
  if(S.range==="month"){var el=Math.round((new Date(iso(n)+"T00:00:00")-pdate(0))/864e5);pf=pdate(-1);pt=new Date(pf);pt.setDate(pt.getDate()+el);if(pt>pend(-1))pt=pend(-1);mf=iso(pdate(-1));mt=iso(pend(-1));label="the same days last month"}
  else if(S.range==="last"){pf=pdate(-2);pt=pend(-2);mf=iso(pf);mt=iso(pt);label="the month before"}
  else if(S.from&&S.to){var a=new Date(S.from+"T00:00:00"),b=new Date(S.to+"T00:00:00"),days=Math.round((b-a)/864e5)+1,ps=new Date(a),pe=new Date(a);ps.setDate(a.getDate()-days);pe.setDate(a.getDate()-1);pf=ps;pt=pe;mf=iso(ps);mt=iso(pe);label="the previous "+days+" days"}
  else return null;
  var f=iso(pf),t=iso(pt),Lc=S.txns.filter(function(x){return personOK(x)&&isCount(x)&&x.txn_date&&x.txn_date>=f&&x.txn_date<=t});
  return {X:expenseSplit(Lc,f,t,mf,mt),label:label,rec:sum(Lc,"in"),Lc:Lc}}
function flowCalc(L,Lc,X){
  var rec=sum(Lc,"in"),lend=0;
  L.forEach(function(t){if(t.category===LOUT||t.category===LIN)lend+=t.type==="out"?Number(t.amount):-Number(t.amount)});
  var avail=rec+Math.max(-lend,0),out=X.mand+X.ev+Math.max(lend,0);
  return {rec:rec,lend:lend,mand:X.mand,ev:X.ev,avail:avail,out:out,left:avail-out}}
function fxKey(t){return (t.merchant||"").toLowerCase().replace(/\s+/g," ").trim()}
function fxNear(a,b){return Math.abs(a-b)<=Math.max(a,b)*.1}
function autoFixed(outs,base,wantPend){
  var res={sum:0,pend:0,ids:{}};if(!outs||(!outs.length&&!wantPend))return res;
  var hm={};
  for(var j=1;j<=3;j++){(function(j){var o=base-j,f=iso(pdate(o)),t=iso(pend(o));
    S.txns.forEach(function(x){if(x.type!=="out"||!personOK(x)||!isCount(x)||!x.txn_date||x.txn_date<f||x.txn_date>t)return;var k=fxKey(x);if(!k)return;(hm[k]=hm[k]||[[],[],[]])[j-1].push(Number(x.amount))})})(j)}
  var rec={};
  Object.keys(hm).forEach(function(k){var m=hm[k],i=0;while(i<3&&!m[i].length)i++;if(i>2)return;if(m[i].length!==1)return;var a=m[i][0],c=0;
    for(var j2=0;j2<3;j2++)if(m[j2].length===1&&fxNear(a,m[j2][0]))c++;
    if(c>=2)rec[k]=a});
  var lim=iso(new Date(Date.now()-90*864e5)),am=S.txns.filter(function(x){return x.type==="out"&&personOK(x)&&isCount(x)&&x.txn_date>=lim}).map(function(x){return Number(x.amount)}).sort(function(a,b){return a-b}),
    med=am.length?am[Math.floor(am.length/2)]:0,thr=Math.max(10000,med*10),paid={};
  outs.forEach(function(x){var k=fxKey(x),a=Number(x.amount),isRec=k&&rec[k]&&fxNear(rec[k],a);if(isRec)paid[k]=1;if(isRec||a>=thr){res.ids[x.id]=1;res.sum+=a}});
  if(wantPend)Object.keys(rec).forEach(function(k){if(!paid[k]&&!outs.some(function(x){return fxKey(x)===k}))res.pend+=rec[k]});
  return res}
var TC_SEL="h1,h2,.fsub,.dch>b,.dc>b[style*='font-size:18px'],.ic small,.tile small,.sec,.mr>span>b,.tb>b,.balr>span,.sxh b,.btn,.obtn,.tab,.alink,.nrow span,.cgrid button,.cats button,.sxc button,.sxs button,.seg2 button,.lht button,.tag,.cc button,.hero2 .hp span,.cr .row>span:first-child,.wzh b";
var TC_SMALL={a:1,an:1,the:1,of:1,and:1,or:1,for:1,in:1,on:1,to:1,at:1,by:1,vs:1,with:1};
function tcTxt(str,st){return str.replace(/[A-Za-z][A-Za-z'’]*/g,function(w){var f=st.n++===0;if(!f&&TC_SMALL[w])return w;return w.charAt(0).toUpperCase()+w.slice(1)})}
function tcApply(root){if(!root||!root.querySelectorAll)return;root.querySelectorAll(TC_SEL).forEach(function(e){var st={n:0};
  for(var i=0;i<e.childNodes.length;i++){var nd=e.childNodes[i];if(nd.nodeType!==3)continue;var v=tcTxt(nd.nodeValue,st);if(v!==nd.nodeValue)nd.nodeValue=v}})}
(function(){var pend=false;function run(){pend=false;tcApply(document.body)}
  function start(){if(!window.MutationObserver||!document.body)return;new MutationObserver(function(){if(!pend){pend=true;requestAnimationFrame(run)}}).observe(document.body,{childList:true,subtree:true,characterData:true});run()}
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start)})();
var NDRX=/\b(emi|loan|rent|insurance|premium|tax|invest\w*|sip|fees?|day ?care|education|donation)\b/i;
function insightBlock(X,Lc,pdt){
  var outs=Lc.filter(function(t){return t.type==="out"}),today=iso(new Date()),from=pdt.from,to=(S.range==="month"||pdt.to>today)?today:pdt.to;
  if(!from||!outs.length)return '';
  var days=Math.max(1,Math.round((new Date(to+"T00:00:00")-new Date(from+"T00:00:00"))/864e5)+1),A=X.useM?{sum:0,pend:0,ids:{}}:autoFixed(X.outs||[],S.range==="last"?-1:0,S.range==="month");
  var dayS=0,unc=0,oth=0;(X.outs||[]).forEach(function(t){if(A.ids[t.id])return;var a=Number(t.amount);if(!t.category||t.category===UNC)unc+=a;else if(NDRX.test(t.category))oth+=a;else dayS+=a});
  var ev=dayS,c=[],top=null;Object.keys(X.by).forEach(function(k){if(!top||X.by[k]>X.by[top])top=k});
  c.push('<div class="ic"><span class="e">📅</span><small>Daily average</small><b>'+money(Math.round(ev/days))+'</b><span style="display:block">Day-to-day spending only</span>'+(unc>0?'<span data-go="list" data-ltab="none" style="display:block;margin-top:4px;text-decoration:underline;cursor:pointer">'+money(Math.round(unc))+' waiting for a category</span>':'')+'</div>');
  if(S.range==="month"){
    var dim=Math.round((pdate(1)-pdate(0))/864e5),dayN=Math.max(1,Math.round((new Date(today+"T00:00:00")-pdate(0))/864e5)+1),pf=Math.round((X.mand||0)+A.sum+A.pend),po=Math.round(oth+unc);
    var pe2=Math.round(ev),tot2=pe2+pf+po;
    c.push('<div class="ic" id="otc" style="cursor:pointer"><span class="e">🧾</span><small>Spent + due so far</small><b>'+money(tot2)+'</b><div class="pace"><i style="width:'+Math.min(100,Math.round(dayN/dim*100))+'%"></i></div><span>day '+dayN+' of '+dim+'</span><span style="display:block">Tap for breakdown</span><div id="otb" style="display:none;margin-top:8px;border-top:1px solid var(--line);padding-top:6px"><span style="display:block">Everyday spending so far '+money(pe2)+'</span><span style="display:block;font-size:12px;opacity:.8">about '+money(Math.round(ev/dayN))+' a day</span><span style="display:block">Fixed bills this month '+money(pf)+'</span><span style="display:block">Other payments '+money(po)+'</span></div></div>');
    var seen={};outs.forEach(function(t){seen[t.txn_date]=1});var ns=0;for(var i=0;i<dayN;i++){var d=new Date(pdate(0));d.setDate(d.getDate()+i);if(!seen[iso(d)])ns++}
    c.push('<div class="ic"><span class="e">🌿</span><small>No-spend days</small><b>'+ns+'</b><span>this period</span></div>');
  }
  if(top)c.push('<div class="ic"><span class="e">'+ci(top)+'</span><small>Biggest category</small><b>'+esc(top.length>16?top.slice(0,15)+"…":top)+'</b><span>'+money(Math.round(X.by[top]))+'</span></div>');
  var big=outs.slice().sort(function(a,b){return b.amount-a.amount})[0];
  if(big)c.push('<div class="ic"><span class="e">💥</span><small>Largest payment</small><b>'+money(big.amount)+'</b><span>'+esc((big.merchant||"Unknown").slice(0,18))+'</span></div>');
  return '<div class="ins">'+c.join('')+'</div>'}
function topPayees(X){
  var g2={};X.outs.forEach(function(t){var k=t.merchant||"Unknown",o=g2[k]=g2[k]||{n:0,s:0,c:t.category};o.n++;o.s+=Number(t.amount)});
  var ks=Object.keys(g2).sort(function(a,b){return g2[b].s-g2[a].s}).slice(0,5);if(!ks.length)return '';
  var tot=X.ev||1,mx=g2[ks[0]].s||1,h='<div class="card">'+sxHead('🏆','Top 5 payees','Where most of your money went');
  var rk=0;ks.forEach(function(k){var o=g2[k];rk++;h+='<div class="cr"><div class="row"><span style="display:flex;align-items:center;min-width:0"><em class="rk">'+rk+'</em><span class="ico" style="background:'+tint(o.c)+'">'+ci(o.c)+'</span><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(k)+'</b></span><b>'+money(o.s)+'</b></div><div class="row mute" style="margin-top:2px"><span>'+o.n+' payment'+(o.n>1?'s':'')+' · avg '+money(o.s/o.n)+'</span><span>'+Math.round(o.s/tot*100)+'% of everyday</span></div><div class="bar"><i style="width:'+Math.round(o.s/mx*100)+'%;background:var(--acc)"></i></div></div>'});
  return h+'</div>'}
function whoSpent(Lc,X,P){
  var fc=X.useM?fixedCats():{},by={};
  X.outs.forEach(function(t){var c=t.category||UNC,p=t.person||"?";by[c]=by[c]||{};by[c][p]=(by[c][p]||0)+Number(t.amount)});
  if(X.useM)X.rows.forEach(function(r){if(r.amt>0){var c=r.f.category||r.f.name;by[c]=by[c]||{};by[c].Mandatory=(by[c].Mandatory||0)+r.amt}});
  var tot={};Object.keys(by).forEach(function(c){tot[c]=Object.keys(by[c]).reduce(function(a,p){return a+by[c][p]},0)});
  var ks=Object.keys(tot).sort(function(a,b){return tot[b]-tot[a]});
  var h='<div class="card">'+sxHead('👨‍👩‍👧','Who spent what','By category and person');
  if(!ks.length)return h+'<span class="mute">Nothing in this period.</span></div>';
  var mx=tot[ks[0]]||1,col=function(p){return p==="Mandatory"?"#8a8a84":pcol(p)},seenP={};
  ks.forEach(function(c){Object.keys(by[c]).forEach(function(p){seenP[p]=1})});
  h+='<div class="lg" style="margin:0 0 12px">'+Object.keys(seenP).sort().map(function(p){return '<span><i style="background:'+col(p)+'"></i>'+esc(p)+'</span>'}).join('')+'</div>';
  ks.forEach(function(c){var parts=Object.keys(by[c]).sort();
    h+='<div class="cr"><div class="row"><span style="display:flex;align-items:center"><span class="ico" style="background:'+tint(c)+'">'+ci(c)+'</span>'+esc(c)+'</span><span style="display:flex;align-items:center;gap:8px">'+(P?arrow(tot[c],P.X.by[c]||0):'')+'<b>'+money(tot[c])+'</b></span></div><div class="stack" style="width:'+Math.max(6,Math.round(tot[c]/mx*100))+'%">'+parts.map(function(p){return '<i style="width:'+(by[c][p]/tot[c]*100).toFixed(1)+'%;background:'+col(p)+'"></i>'}).join('')+'</div><div class="note">'+parts.map(function(p){return esc(p)+' '+money(by[c][p])}).join(' · ')+'</div></div>'});
  return h+'</div>'}
function mandBlock(x){
  if(!S.fixed.length)return '';
  if(!x.useM)return '';
  var h='<div class="card">'+sxHead('📌','Mandatory expenses','Bills and fixed costs')+'';
  x.rows.forEach(function(r){h+='<div class="row" style="margin:5px 0"><span>'+esc(r.f.name)+'</span><b>'+(r.amt>0?money(r.amt):'<span class="mute">not due</span>')+'</b></div>'});
  return h+'<div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b>Total mandatory</b><b class="out">'+money(x.mand)+'</b></div><div class="note">Included in Total expenses.</div></div>';
}
