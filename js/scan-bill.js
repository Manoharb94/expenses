/* ---------- Scan Bill: free, on-device reading (no paid service, the picture never leaves the phone) ---------- */
var BILL_CATS=[
 ["Fuel",/\b(petrol|diesel|fuel|hpcl|bpcl|iocl|indian ?oil|bharat petroleum|hindustan petroleum|nayara|bunk|petro\w*)\b/i,1],
 ["Health",/\b(pharma\w*|medical\w*|chemist\w*|drug\w*|apollo|medplus|netmeds|hospital|clinic|diagnostic\w*|dental|pathology|labs?|medicines?)\b/i,1],
 ["Beauty / Salon",/\b(salon|spa|parlou?r|beauty|barber|makeover)\b/i,0],
 ["Entertainment",/\b(cinema|pvr|inox|movie|theatre|theater|bookmyshow|multiplex|amusement)\b/i,1],
 ["Education",/\b(school|college|tuition|stationery|books?|university|academy|coaching)\b/i,0],
 ["Bills & Utilities",/\b(electricity|bescom|tneb|msedcl|water ?bill|broadband|airtel|jio|vodafone|bsnl|recharge|dth|lpg|utility)\b/i,0],
 ["Travel",/\b(irctc|railway|airlines?|flight|indigo|air india|makemytrip|redbus|oyo)\b/i,0],
 ["Transport",/\b(uber|ola|rapido|taxi|cab|parking|toll|fastag)\b/i,0],
 ["Groceries",/\b(supermarket|hypermarket|mart|kirana|provision\w*|grocer\w*|dmart|d-?mart|big ?bazaar|bigbasket|reliance fresh|spencer\w*|nilgiri\w*|vegetables?|fruits?|milk|dairy|general store|bazaar|bazar)\b/i,0],
 ["Food",/\b(restaurant|cafe|café|hotel|dhaba|biryani|pizza|burger|kitchen|bakery|sweets?|tiffin|mess|canteen|bhavan|swiggy|zomato|dominos|kfc|mcdonald\w*|starbucks|juice|ice ?cream|foods?|meals?|dosa|idli|bhojan\w*)\b/i,1],
 ["Gadgets",/\b(electronics|croma|reliance digital|mobiles?|laptops?|computers?)\b/i,0],
 ["Kids",/\b(toys?|baby|kids|firstcry)\b/i,0],
 ["Home Services",/\b(plumb\w*|electrician|carpenter|repair\w*|pest|laundry|dry ?clean\w*)\b/i,0],
 ["Shopping",/\b(fashion|textiles?|clothing|garments?|lifestyle|westside|trends|myntra|amazon|flipkart|footwear|shoes?|jewel\w*|mall|boutique|saree|readymade)\b/i,0]];
var BILL_MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function billLines(t){return String(t||"").split(/\r?\n/).map(function(l){return l.replace(/[|_~`]+/g," ").replace(/\s+/g," ").trim()}).filter(Boolean)}
function billIso(y,m,d,today){y=+y;m=+m;d=+d;if(y<100)y+=2000;if(m>12&&d<=12){var x=m;m=d;d=x}if(m<1||m>12||d<1||d>31||y<2000)return "";
  var dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCMonth()!==m-1)return "";
  var t=today?new Date(today+"T00:00:00Z"):new Date(),lo=t.getTime()-400*864e5,hi=t.getTime()+2*864e5;
  if(dt.getTime()<lo||dt.getTime()>hi)return "";return dt.toISOString().slice(0,10)}
function billDate(text,today){var s=String(text||""),m,re;
  re=/(\d{4})-(\d{2})-(\d{2})/g;while((m=re.exec(s))){var a=billIso(m[1],m[2],m[3],today);if(a)return a}
  re=/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4}|\d{2})(?!\d)/g;while((m=re.exec(s))){var b=billIso(m[3],m[2],m[1],today);if(b)return b}
  re=/(\d{1,2})(?:st|nd|rd|th)?[\s\-.,]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-.,']*(\d{4}|\d{2})(?!\d)/ig;while((m=re.exec(s))){var c=billIso(m[3],BILL_MON[m[2].toLowerCase()],m[1],today);if(c)return c}
  re=/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/ig;while((m=re.exec(s))){var e=billIso(m[3],BILL_MON[m[1].toLowerCase()],m[2],today);if(e)return e}
  return ""}
function billNums(line){var s=String(line||"").replace(/\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4}/g," ").replace(/\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?/ig," ").replace(/\b\d{4}-\d{2}-\d{2}\b/g," ");
  var out=[],re=/\d[\d,]*(?:\s?\.\s?\d{1,2})?/g,m;
  while((m=re.exec(s))){var tok=m[0].replace(/\s/g,""),raw=tok.replace(/,/g,"");if(/^\d+\.$/.test(raw))raw=raw.slice(0,-1);
    var digits=raw.replace(/\D/g,"");if(digits.length>7)continue;
    var v=parseFloat(raw);if(!(v>0)||v>=1e6)continue;out.push({v:v,dec:/\./.test(raw),i:m.index})}
  return out}
function billAmount(lines){
  var T1=/grand\s*total|net\s*(payable|amount|total)|amount\s*payable|total\s*payable|bill\s*(amount|total)|total\s*(amount|bill)|amt\.?\s*payable|amount\s*due|balance\s*due|you\s*pay/i,
      T2=/\b(total|amount|amt|paid|payable)\b/i,
      BAD=/sub\s*-?\s*total|tax|gst|vat|cess|discount|saving|saved|round|qty|quantity|items?|mrp|change|tender|received|points?|balance(?!\s*due)/i;
  function pick(re,useBad){var best=null;
    for(var i=0;i<lines.length;i++){var l=lines[i];if(!re.test(l))continue;if(useBad&&BAD.test(l))continue;
      var ns=billNums(l.replace(re,m=>" "));if(!ns.length&&lines[i+1]&&!/[a-z]{3}/i.test(lines[i+1]))ns=billNums(lines[i+1]);
      if(!ns.length)continue;var dn=ns.filter(function(n){return n.dec});var n=(dn.length?dn:ns).slice(-1)[0];
      if(!best||n.v>=best.v&&re===T2||re===T1)best=n}
    return best}
  var b=pick(T1,false)||pick(T2,true);
  if(b)return b.v;
  var cur=null;lines.forEach(function(l){if(/(₹|rs\.?|inr)/i.test(l)&&!BAD.test(l)){billNums(l).forEach(function(n){if(!cur||n.v>cur.v)cur=n})}});
  if(cur)return cur.v;
  var all=null;lines.forEach(function(l){if(!BAD.test(l))billNums(l).forEach(function(n){if(n.dec&&(!all||n.v>all.v))all=n})});
  return all?all.v:0}
function billMerchant(lines){
  var head=lines.slice(0,8),SKIP=/^(total|sub\s*total|tax\s*invoice|invoice|bill|cash\s*(memo|bill)|receipt|retail\s*invoice|gstin|gst|tel|ph|phone|mob|cin|fssai|date|time|order|table|welcome|thank|original|duplicate|copy|customer|name|address|dl\s*no|d\.l|www|http|email|e-mail)/i,
      BIZ=/(stores?|mart|hotel|restaurant|pharmacy|traders|enterprises|bakery|cafe|café|ltd|pvt|supermarket|medicals?|foods?|sweets|bazaar|electricals?|agencies|hospital|clinic|petroleum|fuels?|services)/i;
  var cands=[];head.forEach(function(l,i){var letters=(l.match(/[A-Za-z]/g)||[]).length,digits=(l.match(/\d/g)||[]).length,non=l.replace(/\s/g,"").length;
    if(letters<3||letters/non<.55||digits>4||SKIP.test(l))return;if(/@|\.(com|in)\b/i.test(l))return;cands.push({l:l,i:i})});
  if(!cands.length)return "";
  var c=cands[0];if(!BIZ.test(c.l)){var b=cands.filter(function(x){return x.i<6&&BIZ.test(x.l)})[0];if(b)c=b}
  var m=c.l.replace(/[^A-Za-z0-9&'’.\-() \/]/g," ").replace(/\s+/g," ").trim().replace(/^[\-.\s]+|[\-.\s]+$/g,"");
  if(m.length>40)m=m.slice(0,40).replace(/\s\S*$/,"");
  var up=(m.match(/[A-Z]/g)||[]).length,lo=(m.match(/[a-z]/g)||[]).length;
  if(up>lo*2)m=m.toLowerCase().replace(/(^|[\s(\-\/])([a-z])/g,function(x,a,b){return a+b.toUpperCase()}).replace(/\b(Pvt|Ltd|Llp|Hdfc|Icici|Sbi)\b/g,function(w){return w==="Pvt"?"Pvt":w==="Ltd"?"Ltd":w.toUpperCase()});
  return m.length>=3?m:""}
function billCategory(lines,merchant){
  var head=(merchant+" "+lines.slice(0,6).join(" ")),all=lines.join(" ");
  for(var i=0;i<BILL_CATS.length;i++)if(BILL_CATS[i][1].test(head))return BILL_CATS[i][0];
  for(var j=0;j<BILL_CATS.length;j++)if(BILL_CATS[j][2]&&BILL_CATS[j][1].test(all))return BILL_CATS[j][0];
  return ""}
function billParse(text,today){var L=billLines(text),mer=billMerchant(L);
  return {amount:billAmount(L)||0,merchant:mer,date:billDate(L.join("\n"),today),category:billCategory(L,mer)}}
var OCR={w:null,cb:null};
function ocrBase(){return location.origin+"/ocr/v1/"}
function ocrLoadLib(){return new Promise(function(res,rej){if(window.Tesseract)return res();var s=document.createElement("script");s.src=ocrBase()+"tesseract.min.js";s.onload=function(){res()};s.onerror=function(){rej(new Error("The bill reader could not be loaded. Check your internet and try again."))};document.head.appendChild(s)})}
async function ocrWorker(){if(OCR.w)return OCR.w;await ocrLoadLib();
  var w=await Tesseract.createWorker("eng",1,{workerPath:ocrBase()+"worker.min.js",corePath:ocrBase(),langPath:ocrBase()+"lang",gzip:true,logger:function(m){if(OCR.cb)OCR.cb(m)}});
  OCR.w=w;return w}
function ocrCanvas(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),im=new Image();
  im.onerror=function(){URL.revokeObjectURL(u);rej(new Error("That is not a picture"))};
  im.onload=function(){URL.revokeObjectURL(u);var w=im.naturalWidth,h=im.naturalHeight,mx=Math.max(w,h),k=mx>2400?2400/mx:(mx<1200?Math.min(2,1200/mx):1);
    var c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));var x=c.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
    try{var d=x.getImageData(0,0,c.width,c.height),p=d.data,hist=new Uint32Array(256),n=c.width*c.height,i,g;
      for(i=0;i<p.length;i+=4){g=(p[i]*299+p[i+1]*587+p[i+2]*114)/1000|0;p[i]=p[i+1]=p[i+2]=g;hist[g]++}
      var lo=0,hi=255,acc=0;for(i=0;i<256;i++){acc+=hist[i];if(acc>n*.02){lo=i;break}}acc=0;for(i=255;i>=0;i--){acc+=hist[i];if(acc>n*.15){hi=i;break}}
      if(hi-lo>30){var sc=255/(hi-lo);for(i=0;i<p.length;i+=4){g=(p[i]-lo)*sc;g=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=g}}
      x.putImageData(d,0,0)}catch(e){}
    res(c)};im.src=u})}
/* returns {amount,merchant,date,category}; ui(txt,pct) shows progress; never throws, resolves null if it cannot read */
async function billScanFile(file,ui){
  try{ui&&ui("Getting the bill reader ready…",0);
    var cv=await ocrCanvas(file),w=await ocrWorker();
    OCR.cb=function(m){if(!ui)return;if(m.status==="recognizing text")ui("Reading the bill…",Math.round(m.progress*100));else if(/loading|initializ/.test(m.status||""))ui("Getting the bill reader ready…",Math.round((m.progress||0)*100))};
    var r=await Promise.race([w.recognize(cv),new Promise(function(_,rej){setTimeout(function(){rej(new Error("slow"))},90000)})]);
    OCR.cb=null;return billParse(r&&r.data&&r.data.text||"")}
  catch(e){OCR.cb=null;if(e&&e.message==="slow"){try{OCR.w&&OCR.w.terminate()}catch(x){}OCR.w=null}return null}}

function ocrBusy(txt,pct){var o=document.getElementById("ocrbusy");
  if(txt===undefined||txt===null){if(o)o.remove();return}
  if(!o){o=document.createElement("div");o.id="ocrbusy";o.style.cssText="position:fixed;inset:0;z-index:9400;background:rgba(20,10,40,.55);display:flex;align-items:center;justify-content:center;padding:24px";
    o.innerHTML='<div class="card" style="width:100%;max-width:340px;text-align:center;margin:0"><div style="font-size:40px">🧾</div><b id="ocrt" style="display:block;margin:6px 0 10px"></b><div style="height:10px;border-radius:6px;background:var(--chip);overflow:hidden"><div id="ocrb" style="height:100%;width:0;background:var(--acc);transition:width .25s"></div></div><div class="note" id="ocrn" style="margin:10px 0 0">Your picture stays on this phone while it is read.</div></div>';document.body.appendChild(o)}
  document.getElementById("ocrt").textContent=txt;document.getElementById("ocrb").style.width=Math.max(4,Math.min(100,pct||0))+"%"}
async function scanBillFile(f){var info=await billScanFile(f,function(t,p){ocrBusy(t,p)});ocrBusy();
  if(info&&(info.amount||info.date||info.category)){toast("Filled from the bill. Please check it.");return info}
  toast(navigator.onLine===false&&!OCR.w?"Reading a bill needs internet the first time. Type the details for now.":"Could not read this bill. Please type the details.");return null}
function snapBill(cb){var i=document.createElement("input");i.type="file";i.accept="image/*";i.setAttribute("capture","environment");i.style.display="none";document.body.appendChild(i);
  i.oncancel=function(){i.remove()};
  i.onchange=async function(){var f=i.files&&i.files[0];i.remove();if(!f)return;try{var d=await imgToData(f,900,false,110000);var info=await scanBillFile(f);cb(d,info)}catch(e){ocrBusy();toast(errText(e))}};
  i.click()}
function plusMenu(){
  var pg=(S.tab==="grpv"||S.tab==="grpo")&&typeof gGet==="function"?gGet(S.gid):null;if(pg&&pg.closed)pg=null;
  if(pg)gExpSheet({g:pg});else addSheet(null)}
async function billBtn(sh,t){try{var r=await api("txn_bills?txn_id=eq."+encodeURIComponent(t.id)+"&select=photo");if(!r||!r.length||!PHOTO_RE.test(r[0].photo))return;var host=sh.querySelector(".sxm");if(!host||!host.parentNode)return;
  var b=document.createElement("button");b.className="wide";b.style.cssText="margin:8px 0";b.textContent="🧾 View Bill Photo";b.onclick=function(){billView(t,r[0].photo)};host.parentNode.insertBefore(b,host.nextSibling)}catch(e){}}
function billView(t,photo){var x=gSheet(gHead("Bill")+'<img src="'+photo+'" alt="Bill" style="width:100%;border-radius:12px;margin-bottom:10px"><button class="btn ghost out" id="bdel">Remove Bill Photo</button>');gBindX(x);
  x.querySelector("#bdel").onclick=async function(){try{await api("txn_bills?txn_id=eq."+encodeURIComponent(t.id),{method:"DELETE",headers:{Prefer:"return=minimal"}});toast("Bill photo removed");gClose()}catch(e){toast(errText(e))}}}
function addSheet(pre,bill,scan){
  var sh=document.getElementById("sheet");
  var fp=(S.pf&&S.pf!=="__both")?S.pf:S.name;
  var h='<div class="sheet"><div class="sx">'+sxHead("💵","Add cash payment","For money that did not come as a bank alert")+'<div class="sxs" data-for="xt"><button type="button" data-v="out" class="on">Money spent</button><button type="button" data-v="in">Money received</button></div><select id="xt" style="display:none"><option value="out">Money spent</option><option value="in">Money received</option></select><input id="xa" type="number" inputmode="decimal" placeholder="₹ Amount"><input id="xm" placeholder="Payee or note, e.g. vegetables">'+(bill?'<div class="row" style="justify-content:flex-start;gap:10px;margin:0 0 10px"><img src="'+bill+'" alt="" style="width:54px;height:54px;border-radius:10px;object-fit:cover"><span class="note" style="margin:0">'+(scan&&(scan.amount||scan.date||scan.category)?'Bill photo attached. Amount, date and category filled from the bill, please check them.':'Bill photo attached')+'</span></div>':'')+'<div class="sxc" data-for="xp">'+persons().map(function(n){return '<button type="button" data-v="'+esc(n)+'"'+(n===fp?' class="on"':'')+'>'+esc(n)+'</button>'}).join("")+'</div><select id="xp" style="display:none">'+persons().map(function(n){return '<option value="'+esc(n)+'"'+(n===fp?" selected":"")+'>'+esc(n)+'</option>'}).join("")+'</select><input id="xd" type="date" value="'+iso(new Date())+'"><select id="xc"><option value="">No category yet</option>';
  CATS.forEach(function(c){if(typeof gNames==="function"&&gNames().indexOf(c)>=0&&UNBUILT(c))return;h+='<option>'+esc(c)+'</option>'});
  var go_=typeof gOpen==="function"&&typeof gOKUI==="function"&&gOKUI()?gOpen():[];if(go_.length){h+='<optgroup label="Groups">';go_.forEach(function(g){h+='<option value="g:'+esc(g.id)+'"'+(g.id===pre?' selected':'')+'>'+esc(g.name)+'</option>'});h+='</optgroup>'}
  h+='</select><div class="note" style="margin:6px 0 10px">Lent money to someone, or borrowed? Choose <b>Lend out</b> or <b>Lend in</b> to track it under Lending.</div><div class="row" id="xbr" style="justify-content:flex-start;gap:10px;margin:6px 0 10px;flex-wrap:wrap"></div><input type="file" id="xpf" accept="image/*" style="display:none"><input type="file" id="xpf2" accept="image/*" capture="environment" style="display:none"><button class="btn" id="xs">Save</button><button class="btn ghost" style="margin-top:8px" id="xx">Cancel</button></div></div>';
  sh.innerHTML=h;
  function fillBill(sc){if(!sc)return;var xa=document.getElementById("xa"),xd=document.getElementById("xd"),xc=document.getElementById("xc");
    if(sc.amount&&xa)xa.value=String(sc.amount);if(sc.date&&xd)xd.value=sc.date;
    if(sc.category&&xc&&[].some.call(xc.options,function(o){return o.value===sc.category||o.text===sc.category}))xc.value=sc.category}
  function drawBill(){var r=document.getElementById("xbr");
    r.innerHTML=(bill&&PHOTO_RE.test(bill)?'<img src="'+bill+'" alt="Bill" style="width:64px;height:64px;border-radius:10px;object-fit:cover">':'')+'<button type="button" class="btn ghost s" id="xpc">📷 '+(bill?'Retake':'Scan')+' Bill</button><button type="button" class="btn ghost s" id="xph">🖼️ Choose Photo</button>'+(bill?'<button type="button" class="btn ghost s out" id="xpr">Remove</button>':'');
    var f=document.getElementById("xpf"),f2=document.getElementById("xpf2");
    document.getElementById("xph").onclick=function(){f.click()};document.getElementById("xpc").onclick=function(){f2.click()};
    var rm=document.getElementById("xpr");if(rm)rm.onclick=function(){bill=null;drawBill()}}
  ["xpf","xpf2"].forEach(function(id){document.getElementById(id).onchange=async function(){var x=this.files&&this.files[0];this.value="";if(!x)return;try{bill=await imgToData(x,900,false,110000);fillBill(await scanBillFile(x));drawBill()}catch(er){ocrBusy();toast(errText(er))}}});
  drawBill();
  if(scan){var xa_=document.getElementById("xa"),xm_=document.getElementById("xm"),xd_=document.getElementById("xd"),xc_=document.getElementById("xc");
    if(scan.amount&&xa_)xa_.value=String(scan.amount);if(scan.date&&xd_)xd_.value=scan.date;
    if(scan.category&&xc_&&[].some.call(xc_.options,function(o){return o.value===scan.category||o.text===scan.category}))xc_.value=scan.category}
  document.getElementById("xx").onclick=function(){sh.innerHTML=""};
  document.getElementById("xs").onclick=async function(){
    var a=parseFloat(g("xa")),m=g("xm").trim();if(!(a>0)||!m){alert("Enter an amount and a description");return}
    var key=mk(m),cat=g("xc"),known=S.txns.filter(function(x){return x.merchant_key===key&&x.category})[0];
    if(!cat&&known&&!(typeof gNames==="function"&&gNames().indexOf(known.category)>=0))cat=known.category;
    var grp=null;if(/^g:/.test(cat)){grp=gGet(cat.slice(2));cat="";
      if(!grp||grp.closed){alert("This group is closed");return}
      if(g("xt")!=="out"){alert("Choose Money spent to add a payment to a group");return}
      if((g("xp")||S.name)!==S.name){alert("Group payments are added for you. Choose your own name in For.");return}}
    try{var sv=await saveTxn({amount:a,type:g("xt"),merchant:m,merchant_key:key,category:cat||null,txn_date:g("xd")||iso(new Date()),person:g("xp")||S.name});sh.innerHTML="";
      if(bill&&sv&&sv.id&&!sv._pend){try{await api("txn_bills",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({txn_id:sv.id,photo:bill})})}catch(e2){toast("Saved, but the bill photo could not be saved")}}else if(bill)toast("Saved offline. The bill photo was not kept");
      if(grp&&sv&&sv.id&&!sv._pend){toast("Saved. Now split it with "+grp.name);await load();gExpSheet({g:gGet(grp.id)||grp,t:S.txns.filter(function(x){return x.id===sv.id})[0]||sv,photo:bill});return}
      if(grp)toast("Saved offline. Add it to "+grp.name+" when you are back online");else toast("Saved "+money(a)+" · "+m+" for "+(g("xp")||S.name));load()}
    catch(e){alert("Could not save: "+e.message)}
  };
}

document.addEventListener("click",function(e){var b=e.target&&e.target.closest?e.target.closest(".sxs button,.sxc button"):null;if(!b)return;var bx=b.parentNode,sel=document.getElementById(bx.getAttribute("data-for"));if(!sel)return;sel.value=b.getAttribute("data-v");bx.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===b)})});
document.addEventListener("change",function(e){if(e.target&&e.target.id==="lflt"){S.lf=e.target.value;render()}});
document.addEventListener("click",function(e){
  var dz=e.target&&e.target.closest?e.target.closest("[data-ldis]"):null;if(dz){ls("lenddis","1");render();toast("Hidden. Find Lending again in Menu.");return}
  var t=e.target&&e.target.closest?e.target.closest("#addx,[data-lnew],[data-lt]"):null;if(!t)return;
  try{if(t.id==="addx"){plusMenu()}else if(t.hasAttribute("data-lnew"))lendSheet("");else lendSheet(decodeURIComponent(t.getAttribute("data-lt")),t.getAttribute("data-ldef")||undefined)}
  catch(x){showErr(x.message)}
});

