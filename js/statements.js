/* ---------- statement import ---------- */
var XLSX_URL="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
S.st=null;S.imports=null;S.stsel="";
function loadXlsx(){return new Promise(function(res,rej){if(window.XLSX)return res();var x=document.createElement("script");x.src=XLSX_URL;x.onload=function(){res()};x.onerror=function(){rej(new Error("Could not load the spreadsheet reader. Check your internet and try again."))};document.head.appendChild(x)})}
function stNum(x){var v=parseFloat(String(x==null?"":x).replace(/,/g,""));return isNaN(v)?0:v}
function stInfo(n0,refc){
  var n=String(n0||"").replace(/\s+/g," ").trim(),pt=n.split("-"),m,o={m:"",rrn:"",c:""};
  var rc=String(refc||"").trim();
  if(/^UPIRET/i.test(n)){o.m="UPI refund";return o}
  if(/^UPI-/i.test(n)){o.m=(pt[1]||"").trim();m=n.match(/-(\d{12})-(?:UPI|TIPS)/i);if(m)o.rrn=m[1];else if(/^0+\d{12}$/.test(rc))o.rrn=rc.slice(-12);return o}
  if(/^(NEFT|RTGS|IMPS)\b/i.test(n)){o.m=(pt[2]||pt[1]||n).trim();return o}
  if(/^ACH D-/i.test(n)){m=n.match(/^ACH D-\s*(.+?)-[A-Z0-9]+$/i);o.m=(m?m[1]:n.replace(/^ACH D-\s*/i,"")).trim();return o}
  if(/^IB BILLPAY DR/i.test(n)){m=n.match(/(\d{4})$/);o.m="Credit card bill"+(m?" (HDFC …"+m[1]+")":"");o.c=CCB;return o}
  if(/^EXC PYMT/i.test(n)){o.m="Credit card refund";return o}
  if(/^POS\b/i.test(n)){m=n.match(/\d{2}[A-Z]{3}\d{2}\s+\d{2}:\d{2}:\d{2}\s+(.+)$/);o.m=(m?m[1]:"Card payment").trim();return o}
  if(/^(ATW|NWD)-/i.test(n)){o.m="ATM cash withdrawal";return o}
  if(/-TPT-/i.test(n)){m=n.match(/-TPT-(?:.*-)?([^-]+)$/);o.m=(m?m[1]:"Bank transfer").trim();return o}
  if(/INSTAALERTCHG|DEBIT CARD|DC INTL POS|CHRG|CHARGES|MARKUP/i.test(n)){o.m="HDFC Bank charges";return o}
  if(/^INTEREST/i.test(n)){o.m="HDFC interest";return o}
  if(/^CBDT/i.test(n)){o.m="Income tax (CBDT)";return o}
  o.m=n.slice(0,40);return o}
function parseHdfc(aoa){
  var hi=-1,i,r;
  for(i=0;i<aoa.length;i++){r=aoa[i]||[];if(String(r[0]).trim().toLowerCase()==="date"&&/narration/i.test(String(r[1]))){hi=i;break}}
  if(hi<0)throw new Error("This does not look like an HDFC account statement (no Date and Narration columns). Download it from NetBanking as Excel or CSV.");
  var hd=aoa[hi].map(function(x){return String(x||"").toLowerCase()}),
      ix=function(re){for(var k=0;k<hd.length;k++)if(re.test(hd[k]))return k;return -1},
      cr=ix(/chq|ref/),cw=ix(/withdraw/),cp=ix(/deposit/),cb=ix(/closing|balance/),lastBal=null,rows=[],sd=0,sc=0;
  if(cw<0||cp<0)throw new Error("Could not find the Withdrawal and Deposit columns.");
  for(i=hi+1;i<aoa.length;i++){r=aoa[i]||[];
    var m=String(r[0]).trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);if(!m)continue;
    var w=stNum(r[cw]),p=stNum(r[cp]);if(!(w>0||p>0))continue;if(cb>=0&&r[cb]!==""&&r[cb]!=null&&!isNaN(stNum(r[cb])))lastBal=stNum(r[cb]);
    var d=(m[3].length===2?"20"+m[3]:m[3])+"-"+m[2]+"-"+m[1],inf=stInfo(r[1],r[cr]),out=w>0,amt=Math.round((out?w:p)*100)/100;
    var ref=inf.rrn||("S"+d+"-"+String(r[cr]||"").trim()+"-"+rows.length);
    rows.push({d:d,a:amt,t:out?"out":"in",m:inf.m,r:ref,c:inf.c,n:String(r[1]||"").replace(/\s+/g," ").trim()});
    if(out)sd+=amt;else sc+=amt}
  if(!rows.length)throw new Error("No transactions found in this file.");
  var sum={},k2,j;
  for(i=0;i<aoa.length;i++){r=aoa[i]||[];if(String(r[0]).trim().toLowerCase()==="opening balance"){var vr=aoa[i+1]||[];
    for(j=0;j<r.length;j++){var h=String(r[j]).trim().toLowerCase();if(h==="opening balance")sum.opening=stNum(vr[j]);else if(h==="debits")sum.debits=stNum(vr[j]);else if(h==="credits")sum.credits=stNum(vr[j]);else if(h.indexOf("closing")===0)sum.closing=stNum(vr[j])}break}}
  if(sum.closing==null&&lastBal!=null)sum.closing=lastBal;
  var ds=rows.map(function(x){return x.d}).sort(),has=sum.opening!=null&&sum.closing!=null;
  var bal=has?Math.abs(sum.opening+sc-sd-sum.closing)<0.5:null,tie=sum.debits!=null?Math.abs(sum.debits-sd)<0.5&&Math.abs(sum.credits-sc)<0.5:null;
  return {rows:rows,from:ds[0],to:ds[ds.length-1],debits:Math.round(sd*100)/100,credits:Math.round(sc*100)/100,opening:sum.opening,closing:sum.closing,balance_ok:bal,summary_ok:tie}}
/* ---------- any-file statement reader ---------- */
var PDFJS_URL="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",PDFW_URL="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
function loadPdfjs(){return new Promise(function(res,rej){if(window.pdfjsLib)return res();var x=document.createElement("script");x.src=PDFJS_URL;x.onload=function(){res()};x.onerror=function(){rej(new Error("Could not load the PDF reader. Check your internet and try again."))};document.head.appendChild(x)}).then(async function(){
  if(pdfjsLib.GlobalWorkerOptions.workerSrc)return;
  try{var t=await (await fetch(PDFW_URL)).text();pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([t],{type:"application/javascript"}))}catch(e){pdfjsLib.GlobalWorkerOptions.workerSrc=PDFW_URL}})}
async function pdfLines(buf){
  await loadPdfjs();
  var task=pdfjsLib.getDocument({data:new Uint8Array(buf)});
  task.onPassword=function(cb,reason){var p=prompt(reason===2?"That password was not right. Try again:":"This PDF is locked. Enter its password (banks often use your customer ID, date of birth or phone number):");if(p==null){cb("")}else cb(p)};
  var pdf;try{pdf=await task.promise}catch(e){if(e&&e.name==="PasswordException")throw new Error("This PDF is locked and the password was not accepted.");throw new Error("Could not open this PDF.")}
  var out=[];
  for(var pn=1;pn<=pdf.numPages;pn++){var pg=await pdf.getPage(pn),tc=await pg.getTextContent(),its=tc.items.filter(function(i){return String(i.str).trim()}).map(function(i){return {s:i.str,x:i.transform[4],y:i.transform[5],w:i.width||0}});
    its.sort(function(a,b){return b.y-a.y||a.x-b.x});var ln=[],cur=null;
    its.forEach(function(i){if(cur&&Math.abs(cur.y-i.y)<=3){cur.p.push(i)}else{cur={y:i.y,p:[i]};ln.push(cur)}});
    ln.forEach(function(l){l.p.sort(function(a,b){return a.x-b.x});var s="",end=null;l.p.forEach(function(i){if(end!=null&&i.x-end>1.5)s+=" ";else if(end!=null&&i.x-end>-1&&/\w$/.test(s)&&/^\w/.test(i.s)&&i.x-end>0.3)s+=" ";s+=i.s;end=i.x+i.w});out.push(s.replace(/\s+/g," ").trim())})}
  if(!out.join("").trim())throw new Error("This PDF has no readable text (it may be a scan or photo). Download the statement as Excel or CSV from your bank instead.");
  return out}
var MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function p2(n){return (n<10?"0":"")+n}
var DRE=/^(?:(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})|(\d{1,2})[-\/. ]([A-Za-z]{3})[a-z]*[-\/. ,]*(\d{2,4})|(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4}))(?![\d])/;
function stDate(s,mdy){s=String(s).trim();var m=s.match(DRE),y,mo,d;if(!m)return "";
  if(m[1]){y=+m[1];mo=+m[2];d=+m[3]}else if(m[4]){d=+m[4];mo=MON[m[5].toLowerCase()];y=+m[6];if(!mo)return ""}else{var a=+m[7],b=+m[8];y=+m[9];if(mdy){mo=a;d=b}else{d=a;mo=b}}
  if(y<100)y+=2000;if(mo<1||mo>12||d<1||d>31||y<2000||y>2100)return "";return y+"-"+p2(mo)+"-"+p2(d)}
function serialDate(n){if(typeof n!=="number"||n<36526||n>73050)return "";var d=new Date(Math.round((n-25569)*86400000));return d.getUTCFullYear()+"-"+p2(d.getUTCMonth()+1)+"-"+p2(d.getUTCDate())}
function cellDate(c,mdy){if(c instanceof Date&&!isNaN(c))return c.getFullYear()+"-"+p2(c.getMonth()+1)+"-"+p2(c.getDate());if(typeof c==="number")return serialDate(c);return stDate(c,mdy)}
function guessMdy(strs){var a=0,b=0;strs.forEach(function(s){var m=String(s).trim().match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.]\d{2,4}/);if(m){if(+m[1]>12)a++;if(+m[2]>12)b++}});return b>0&&a===0}
function amtOf(x){if(typeof x==="number")return x;var s=String(x==null?"":x).replace(/[₹,\s]|Rs\.?|INR/gi,"");var neg=/^\(.*\)$/.test(s)||/^-/.test(s)||/Dr\.?$/i.test(s);s=s.replace(/[()\-]|Dr\.?|Cr\.?/gi,"");var v=parseFloat(s);return isNaN(v)?null:(neg?-v:v)}
function genInfo(n0){var n=String(n0||"").replace(/\s+/g," ").trim(),o={m:"",rrn:"",c:""},m;
  if(/\bUPI\b/i.test(n)){m=n.match(/\b(\d{12})\b/);if(m)o.rrn=m[1];
    var seg=n.split(/[\/\-@|]/).map(function(x){return x.trim()}).filter(function(x){return x.length>2&&/[A-Za-z]{3}/.test(x)&&!/^(UPI|DR|CR|PAYMENT|PAID|TO|FROM|DEBIT|CREDIT|TRANSFER|BANK|REF|IMPS|NEFT|P2A|P2M|P2P|UTR)$/i.test(x)&&!/^(payment from|payment to|paid via|sent using|received from)/i.test(x)});
    o.m=(seg[0]||"UPI payment").slice(0,40);return o}
  if(/^(NEFT|RTGS|IMPS)\b/i.test(n)){var q=n.split(/[\/\-]/).map(function(x){return x.trim()}).filter(function(x){return /[A-Za-z]{3}/.test(x)&&!/^(NEFT|RTGS|IMPS|CR|DR|IN|OUT)$/i.test(x)});o.m=(q[q.length>2?1:0]||n).slice(0,40);return o}
  if(/\b(ATM|ATW|NWD|CASH WDL|CASH WITHDRAWAL)\b/i.test(n)){o.m="ATM cash withdrawal";return o}
  if(/\b(INT\.?\s*PD|INTEREST)\b/i.test(n)&&n.length<60){o.m="Bank interest";return o}
  if(/\b(CHARGES?|CHRG|GST|FEE)\b/i.test(n)&&n.length<60){o.m="Bank charges";return o}
  m=n.replace(/^(POS|ECOM|PUR|PURCHASE|BIL|BILLPAY|ACH D-?|ACH C-?|NACH|SI)[\/\- ]+/i,"").replace(/[\/\-]+\d{6,}.*$/,"").trim();
  o.m=(m||n).slice(0,40);return o}
function hash6(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
function finishRows(raw,note){
  /* raw: [{d,a,t,n,rc,bal}] in file order. Fixes order, fills types from balance chain, builds the preview object */
  if(!raw.length)throw new Error("No transactions found in this file. If this is a bank statement, download it as Excel, CSV or PDF from your bank and try again.");
  var asc=raw.length<2||raw[0].d<=raw[raw.length-1].d;if(!asc)raw=raw.slice().reverse();
  var hasBal=raw.every(function(r){return r.bal!=null}),breaks=0,i,r;
  if(hasBal){
    for(i=1;i<raw.length;i++){r=raw[i];var dl=Math.round((r.bal-raw[i-1].bal)*100)/100,am=Math.round(r.a*100)/100;
      if(Math.abs(dl-am)<0.011)r.t="in";else if(Math.abs(dl+am)<0.011)r.t="out";else{breaks++;if(!r.t)r.t=dl>=0?"in":"out"}}
    r=raw[0];if(!r.t)r.t=guessDir(r.n)||"out"
  }
  raw.forEach(function(x){if(!x.t)x.t=guessDir(x.n)||"out"});
  var rows=[],sd=0,sc=0,seen={};
  raw.forEach(function(x){var inf=/^(HDFC)/i.test(note||"")?stInfo(x.n,x.rc):genInfo(x.n),a=Math.round(Math.abs(x.a)*100)/100,out=x.t==="out",k=x.d+"|"+a+"|"+x.n;seen[k]=(seen[k]||0)+1;
    var ref=inf.rrn||("S"+x.d+"-"+hash6(k)+"-"+seen[k]);
    rows.push({d:x.d,a:a,t:x.t,m:inf.m||"Unknown",r:ref,c:inf.c||"",n:String(x.n||"").slice(0,200)});if(out)sd+=a;else sc+=a});
  var ds=rows.map(function(x){return x.d}).sort(),op=null,cl=null;
  if(hasBal){var f=raw[0];op=Math.round((f.bal+(f.t==="out"?f.a:-f.a))*100)/100;cl=raw[raw.length-1].bal}
  return {rows:rows,from:ds[0],to:ds[ds.length-1],debits:Math.round(sd*100)/100,credits:Math.round(sc*100)/100,opening:op,closing:cl,balance_ok:hasBal?breaks===0:null,summary_ok:null,generic:true,breaks:breaks}}
function guessDir(n){n=String(n||"");if(/\b(salary|refund|reversal|interest (?:paid|credit)|int\.?\s*pd|received|deposit|cashback|credited|cr\b|by transfer|neft cr|imps cr)/i.test(n))return "in";return ""}
var NUMRE=/\(?-?\d[\d,]*\.\d{1,2}\)?(?:\s?(?:Cr|Dr)\b\.?)?/gi;
function parseLines(lines){
  var mdy=guessMdy(lines.map(function(l){return l.replace(/^\D*/,"")})),raw=[],prev=null;
  lines.forEach(function(l){l=String(l).replace(/\s+/g," ").trim();if(!l)return;
    var d="",rest="";
    var dm=l.match(/^(?:\d{1,3}\s+)?(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/. ][A-Za-z]{3}[a-z]*[-\/. ,]+\d{2,4}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})\b\s*(.*)$/);
    if(dm){d=stDate(dm[1],mdy);rest=dm[2]}
    if(!d){if(prev&&!prev.closed&&l.length<90&&!/page|statement|summary|opening|closing|total|brought|carried|date|particulars|narration|balance/i.test(l)&&!(l.match(NUMRE)||[]).length)prev.n+=" "+l;return}
    var vd=rest.match(/^(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/. ][A-Za-z]{3}[a-z]*[-\/. ,]+\d{2,4}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})\b\s*(.*)$/);if(vd&&stDate(vd[1],mdy))rest=vd[2];
    var nums=rest.match(NUMRE)||[];if(!nums.length){prev=null;return}
    var first=rest.indexOf(nums[0]),narr=rest.slice(0,first).trim(),vals=nums.map(function(x){return {v:amtOf(x),dr:/Dr\b\.?$/i.test(x),cr:/Cr\b\.?$/i.test(x),neg:/^\(|^-/.test(x)}});
    var bal=null,a,t="";
    if(vals.length>=2){bal=vals[vals.length-1].v;a=vals[vals.length-2]}else a=vals[0];
    if(bal!=null&&vals[vals.length-1].dr)bal=-Math.abs(bal);
    t=a.dr?"out":a.cr?"in":a.neg?"out":"";
    prev={d:d,a:Math.abs(a.v),t:t,n:narr,rc:"",bal:bal};raw.push(prev)});
  return finishRows(raw)}
function parseGrid(aoa){
  var hi=-1,i,j,c;
  for(i=0;i<Math.min(aoa.length,80)&&hi<0;i++){var hd=(aoa[i]||[]).map(function(x){return String(x==null?"":x).trim().toLowerCase()});
    var hasD=hd.some(function(x){return /^(txn\.?\s*|transaction\s*|posting\s*|value\s*)?date\b|^date$/.test(x)}),hasA=hd.some(function(x){return /withdraw|debit|\bdr\b|amount|paid out|money out/.test(x)});
    if(hasD&&hasA)hi=i}
  if(hi<0)return null;
  var H=aoa[hi].map(function(x){return String(x==null?"":x).trim().toLowerCase()}),ix=function(re,skip){for(var k=0;k<H.length;k++)if(re.test(H[k])&&k!==skip)return k;return -1};
  var cD=ix(/^(txn\.?\s*|transaction\s*|posting\s*)?date\b|^date$/),cV=ix(/value/),cN=ix(/narration|description|particulars|details|remarks|transaction remarks/),cR=ix(/chq|cheque|ref|utr/),
      cW=ix(/withdraw|debit|paid out|money out|\bdr\b/),cP=ix(/deposit|credit|paid in|money in|\bcr\b/),cA=ix(/^amount|transaction amount|\bamount\b/),cT=ix(/^type$|dr\s*\/\s*cr|cr\s*\/\s*dr|debit\s*\/\s*credit|txn type|transaction type/),cB=ix(/balance/);
  if(cN<0){for(j=0;j<H.length;j++)if(j!==cD&&j!==cV&&j!==cR&&j!==cW&&j!==cP&&j!==cA&&j!==cT&&j!==cB&&H[j]){cN=j;break}}
  if(cD<0||(cW<0&&cP<0&&cA<0))return null;
  var dstr=[];for(i=hi+1;i<aoa.length;i++){c=(aoa[i]||[])[cD];if(typeof c==="string")dstr.push(c)}
  var mdy=guessMdy(dstr),raw=[];
  for(i=hi+1;i<aoa.length;i++){var r=aoa[i]||[],d=cellDate(r[cD],mdy);if(!d)continue;
    var w=cW>=0?amtOf(r[cW]):null,p=cP>=0&&cP!==cW?amtOf(r[cP]):null,a=null,t="";
    if(cW>=0&&cP>=0&&cW!==cP){if(w&&Math.abs(w)>0){a=Math.abs(w);t="out"}else if(p&&Math.abs(p)>0){a=Math.abs(p);t="in"}}
    else{var v=amtOf(r[cA>=0?cA:cW]);if(v!=null&&v!==0){a=Math.abs(v);if(cT>=0){var tt=String(r[cT]).toLowerCase();t=/^(cr|credit|c)\b|deposit|in$/.test(tt)?"in":/^(dr|debit|d)\b|withdraw|out$/.test(tt)?"out":""}if(!t){var rs=String(r[cA>=0?cA:cW]);t=/Cr\b/i.test(rs)?"in":/Dr\b/i.test(rs)||v<0?"out":""}}}
    if(!a)continue;
    var bal=cB>=0?amtOf(r[cB]):null;if(bal!=null&&/Dr\b/i.test(String(r[cB])))bal=-Math.abs(bal);
    raw.push({d:d,a:a,t:t,n:String(r[cN]==null?"":r[cN]).replace(/\s+/g," ").trim(),rc:cR>=0?String(r[cR]||"").trim():"",bal:bal})}
  if(!raw.length)return null;
  /* a Cr/Dr-less single-amount sheet: let the balance chain decide */
  return finishRows(raw)}
function parseOfx(txt){var raw=[],re=/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi,m,tag=function(b,t){var x=b.match(new RegExp("<"+t+">([^<\\r\\n]*)","i"));return x?x[1].trim():""};
  while((m=re.exec(txt))){var b=m[1],ds=tag(b,"DTPOSTED").slice(0,8),amt=parseFloat(tag(b,"TRNAMT"));if(!/^\d{8}$/.test(ds)||isNaN(amt)||!amt)continue;
    raw.push({d:ds.slice(0,4)+"-"+ds.slice(4,6)+"-"+ds.slice(6,8),a:Math.abs(amt),t:amt<0?"out":"in",n:(tag(b,"NAME")+" "+tag(b,"MEMO")).trim(),rc:tag(b,"FITID"),bal:null})}
  var r=finishRows(raw),lb=txt.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([-\d.,]+)/i);if(lb){r.closing=parseFloat(lb[1]);r.opening=Math.round((r.closing-r.credits+r.debits)*100)/100}return r}
function parseQif(txt){var raw=[],cur={},mdy=false;txt.split(/\r?\n/).forEach(function(l){var c=l.charAt(0),v=l.slice(1).trim();
  if(c==="D")cur.d=stDate(v.replace(/'/g,"/"),mdy);else if(c==="T"||c==="U"){if(cur.v==null)cur.v=amtOf(v)}else if(c==="P")cur.n=v;else if(c==="M"&&!cur.n)cur.n=v;
  else if(c==="^"){if(cur.d&&cur.v)raw.push({d:cur.d,a:Math.abs(cur.v),t:cur.v<0?"out":"in",n:cur.n||"",rc:"",bal:null});cur={}}});return finishRows(raw)}
async function readStatementFile(file){
  var buf=await file.arrayBuffer(),u=new Uint8Array(buf.slice(0,8)),name=(file.name||"").toLowerCase(),ext=name.split(".").pop(),
      isPdf=u[0]===0x25&&u[1]===0x50&&u[2]===0x44&&u[3]===0x46,isZip=u[0]===0x50&&u[1]===0x4B,isOle=u[0]===0xD0&&u[1]===0xCF,
      isImg=/^image\//.test(file.type||"")||/(png|jpe?g|gif|webp|heic|bmp)$/.test(ext)||(u[0]===0xFF&&u[1]===0xD8)||(u[0]===0x89&&u[1]===0x50);
  if(isImg)throw new Error("A photo or screenshot cannot be read reliably, and money needs to be exact. Download the statement from your bank as PDF, Excel or CSV and choose that file.");
  if(isPdf){return parseLines(await pdfLines(buf))}
  var sheets=null,txt=null;
  if(isZip||isOle){await loadXlsx();var wb=XLSX.read(buf,{type:"array",cellDates:true});sheets=wb.SheetNames.map(function(n){return XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:""})})}
  else{try{txt=new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(e){txt=new TextDecoder("windows-1252").decode(buf)}
    txt=txt.replace(/^﻿/,"");
    if(/<OFX|OFXHEADER/i.test(txt))return parseOfx(txt);
    if(/^\s*!Type/im.test(txt))return parseQif(txt);
    await loadXlsx();var wb2=XLSX.read(txt,{type:"string",raw:true,cellDates:false});sheets=wb2.SheetNames.map(function(n){return XLSX.utils.sheet_to_json(wb2.Sheets[n],{header:1,raw:true,defval:""})});
    if(!/<table/i.test(txt)){/* plain text or CSV: also keep the raw lines for the line reader */sheets.push(null)}}
  var firstErr=null,k,aoa,res;
  if(txt!=null&&!/csv|tsv|html?|xml/.test(ext)&&!/<table/i.test(txt)){try{return parseLines(txt.split(/\r?\n/))}catch(e){firstErr=e}}
  for(k=0;k<sheets.length;k++){aoa=sheets[k];if(!aoa)continue;
    try{res=parseHdfc(aoa);return res}catch(e){}
    try{res=parseGrid(aoa);if(res)return res}catch(e){firstErr=firstErr||e}}
  for(k=0;k<sheets.length;k++){aoa=sheets[k];if(!aoa)continue;
    try{return parseLines(aoa.map(function(r){return r.map(function(c){return c instanceof Date?cellDate(c):String(c==null?"":c)}).join(" ")}))}catch(e){firstErr=firstErr||e}}
  if(txt!=null){try{return parseLines(txt.split(/\r?\n/))}catch(e){firstErr=firstErr||e}}
  throw firstErr||new Error("This file does not look like a bank statement. Try the PDF, Excel or CSV from your bank.")}
/* ---------- end any-file reader ---------- */
/* ---------- end statement import ---------- */

function stBadge(ok,t){return '<span class="tag'+(ok?'':' warn')+'">'+(ok?'✓ ':'⚠ ')+t+'</span>'}
async function loadImports(){try{S.imports=await api("statement_imports?select=*&order=created_at.desc")||[]}catch(e){S.imports=[];S.impErr=errText(e)}}
function stReplaceInfo(p,f,t){var l=S.txns.filter(function(x){return x.person===p&&x.txn_date>=f&&x.txn_date<=t&&!x.source&&x.raw});return {n:l.length,sum:sum(l,"out")}}
function vStmt(){
  var h='<div class="row" style="align-items:flex-start;margin:14px 0 10px"><div><h2 style="margin:0">Import</h2><div class="mute" style="margin-top:4px">Bank statements from any bank</div></div><button class="btn ghost s" id="stpast">🕘 Past Files</button></div><div class="card" style="border:2px dashed var(--line);box-shadow:none;text-align:center;padding:22px 16px">';
  var st=S.st;
  if(!st){h+='<div style="width:56px;height:56px;border-radius:50%;background:var(--bg);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px">📄</div><div class="mute" style="font-size:16px">Pick a PDF, Excel or CSV file</div><button class="btn" id="stpick" style="margin-top:14px">Select File</button><input type="file" id="stf" style="display:none"><div class="note" style="margin:10px 0 0">PDF, Excel, CSV, text, OFX or QIF all work. Locked PDFs ask for the password. Photos and screenshots cannot be read reliably. For the dates you choose, the statement replaces the email-alert payments. Your cash, lending and tally entries are not touched.</div><div id="stmsg" class="note"></div>'}
  else{var rp=stReplaceInfo(st.person,st.from2,st.to2);
    h+='<div class="row"><b>'+esc(st.file)+'</b><button class="btn ghost s" id="stx">Choose another</button></div>';
    h+='<div class="note" style="margin:6px 0">'+st.rows.length+' payments · '+esc(st.from)+' to '+esc(st.to)+' · out '+money(st.debits)+' · in '+money(st.credits)+'</div><div style="margin-bottom:8px">'+(st.balance_ok==null?'':stBadge(st.balance_ok,st.balance_ok?'opening + in − out = closing balance':'balances do not add up'))+' '+(st.summary_ok==null?'':stBadge(st.summary_ok,st.summary_ok?'matches the statement totals':'differs from statement totals'))+'</div>';
    if(st.generic)h+='<div class="note" style="margin:0 0 8px">Read automatically from your file. Check these first rows and the totals before importing.</div>';
    h+='<div class="card" style="box-shadow:none;border:1px solid var(--line);margin:0 0 10px;padding:4px 12px">'+st.rows.slice(0,5).map(function(x){return '<div class="row" style="margin:6px 0"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.m)+' <span class="mute">'+esc(x.d)+'</span></span><b class="'+(x.t==="out"?"out":"in")+'" style="white-space:nowrap;margin-left:8px">'+(x.t==="out"?"−":"+")+money(x.a)+'</b></div>'}).join('')+(st.rows.length>5?'<div class="note" style="margin:4px 0">and '+(st.rows.length-5)+' more</div>':'')+'</div>';
    h+='<div class="mute">Whose account is this?</div><select id="stp">'+persons().map(function(n){return '<option value="'+esc(n)+'"'+(n===st.person?' selected':'')+'>'+esc(n)+(n===S.name?' (you)':'')+'</option>'}).join('')+'</select>';
    h+='<div class="grid"><div><div class="mute">From</div><input type="date" id="stfrom" value="'+esc(st.from2)+'"></div><div><div class="mute">To</div><input type="date" id="stto" value="'+esc(st.to2)+'"></div></div>';
    h+='<div class="note" id="strep" style="margin:0 0 8px">For '+esc(st.person)+', this replaces '+rp.n+' email-alert payment'+(rp.n===1?'':'s')+' ('+money(rp.sum)+') between these dates. They are only hidden, and come back if you remove the import.</div><button class="btn" id="stgo">Confirm and import</button><div id="stmsg" class="note"></div>'}
  h+='</div>';
  var im=S.imports;
  h+='<h2 id="stpastbox">Past Files</h2><div class="card">';
  if(im===null)h+=skBox(2);
  else if(S.impErr)h+='<span class="out">'+esc(S.impErr)+'</span><div class="note">If this mentions step5.sql, run it in Supabase first.</div>';
  else if(!im.length)h+='<span class="mute">Nothing imported yet.</span>';
  else im.forEach(function(x){var on=S.stsel===x.id;
    h+='<div class="tx tap" data-imp="'+esc(x.id)+'"><div class="row"><b>'+esc(x.person)+' · '+esc(x.from_date)+' to '+esc(x.to_date)+'</b><span>'+(on?'▾':'▸')+'</span></div><div class="row mute"><span>'+x.rows_in+' payments · out '+money(x.debits)+' · in '+money(x.credits)+'</span></div><div style="margin-top:4px">'+(x.balance_ok==null?'':stBadge(x.balance_ok,x.balance_ok?'balance checks out':'balance mismatch'))+(x.rows_file>x.rows_in?' '+stBadge(false,(x.rows_file-x.rows_in)+' skipped as duplicates'):'')+'</div></div>'});
  h+='</div>';
  var sel=(im||[]).filter(function(x){return x.id===S.stsel})[0];
  if(sel)h+=vStmtAnalysis(sel);
  return h}
function vStmtAnalysis(x){
  var rows=S.txns.filter(function(t){return t.batch_id===x.id}),mo={},h='<h2>This statement: '+esc(x.from_date)+' to '+esc(x.to_date)+'</h2><div class="card">';
  rows.forEach(function(t){var k=(t.txn_date||"").slice(0,7),o=mo[k]=mo[k]||{out:0,inn:0,sp:0,n:0},a=Number(t.amount);o.n++;if(t.type==="out"){o.out+=a;if(isCount(t))o.sp+=a}else o.inn+=a});
  var ks=Object.keys(mo).sort(),mx=Math.max.apply(null,ks.map(function(k){return Math.max(mo[k].out,mo[k].inn)}))||1;
  h+='<div class="note" style="margin:0 0 8px">Money out of the bank includes loan EMIs, card bills and transfers. “Counted as spending” leaves out transfers between you, card-bill payments and lending, so it matches the rest of the app.</div>';
  ks.forEach(function(k){var o=mo[k];h+='<div class="cr"><div class="row"><b>'+esc(plabelFor(k))+'</b><span class="mute">'+o.n+' payments</span></div><div class="row"><span>Money out</span><b class="out">'+money(o.out)+'</b></div><div class="bar"><i style="width:'+Math.round(o.out/mx*100)+'%;background:#b4432f"></i></div><div class="row"><span>Money in</span><b class="in">'+money(o.inn)+'</b></div><div class="bar"><i style="width:'+Math.round(o.inn/mx*100)+'%"></i></div><div class="row mute"><span>Counted as spending</span><span>'+money(o.sp)+'</span></div></div>'});
  h+='</div>';
  var outs=rows.filter(function(t){return t.type==="out"&&isCount(t)}),ev=outs.reduce(function(a,t){return a+Number(t.amount)},0);
  h+=topPayees({outs:outs,ev:ev});
  var big=rows.filter(function(t){return t.type==="out"}).sort(function(a,b){return b.amount-a.amount}).slice(0,8);
  if(big.length){h+='<div class="card">'+sxHead('💥','Biggest payments out','Your largest payments')+'';big.forEach(function(t){h+='<div class="row" style="margin:6px 0"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t.merchant||"Unknown")+' <span class="mute">'+esc(t.txn_date)+'</span></span><b class="out">'+money(t.amount)+'</b></div>'});h+='</div>'}
  h+='<div class="card"><button class="btn ghost s" data-undo="'+esc(x.id)+'">Remove this import</button><div class="note">Removing it brings back the email-alert payments for these dates.</div></div>';
  return h}
function plabelFor(k){var p=k.split("-"),d=pnameDate(new Date(+p[0],+p[1]-1,Math.min(S.ms||1,28)));return d.toLocaleString("en-IN",{month:"long",year:"numeric"})}
function bindStmt(){
  var f=document.getElementById("stf"),pk=document.getElementById("stpick"),pb=document.getElementById("stpast");if(pb)pb.onclick=function(){var e=document.getElementById("stpastbox");if(e)e.scrollIntoView({behavior:"smooth"})};if(pk&&f)pk.onclick=function(){f.click()};
  if(f)f.onchange=async function(){var file=f.files&&f.files[0],msg=document.getElementById("stmsg");if(!file)return;if(msg){msg.className="note";msg.textContent="Reading the file…"}
    try{var r=await readStatementFile(file);
      r.file=file.name;r.person=S.name;r.from2=r.from;r.to2=r.to;S.st=r;render()}
    catch(e){if(msg){msg.className="note out";msg.textContent=errText(e)}}};
  var x=document.getElementById("stx");if(x)x.onclick=function(){S.st=null;render()};
  var sp=document.getElementById("stp");if(sp)sp.onchange=function(){S.st.person=sp.value;stRefresh()};
  var sf=document.getElementById("stfrom");if(sf)sf.onchange=function(){S.st.from2=sf.value;stRefresh()};
  var stt=document.getElementById("stto");if(stt)stt.onchange=function(){S.st.to2=stt.value;stRefresh()};
  var go=document.getElementById("stgo");if(go)go.onclick=stImport;
  document.querySelectorAll("[data-imp]").forEach(function(b){b.onclick=function(){S.stsel=S.stsel===b.dataset.imp?"":b.dataset.imp;render()}});
  document.querySelectorAll("[data-undo]").forEach(function(b){b.onclick=async function(){if(!confirm("Remove this import? The email-alert payments for these dates come back."))return;try{await api("rpc/undo_statement",{method:"POST",body:JSON.stringify({p_batch:b.dataset.undo})});S.stsel="";await load();await loadImports();render();toast("Import removed")}catch(e){showErr(errText(e))}}})}
function stRefresh(){var st=S.st,e=document.getElementById("strep");if(!e||!st)return;var rp=stReplaceInfo(st.person,st.from2,st.to2);e.textContent="For "+st.person+", this replaces "+rp.n+" email-alert payment"+(rp.n===1?"":"s")+" ("+money(rp.sum)+") between these dates. They are only hidden, and come back if you remove the import."}
async function stImport(){
  var st=S.st,msg=document.getElementById("stmsg"),btn=document.getElementById("stgo");if(!st)return;
  if(!st.from2||!st.to2||st.from2>st.to2){if(msg){msg.className="note out";msg.textContent="Check the From and To dates."}return}
  var rows=st.rows.filter(function(r){return r.d>=st.from2&&r.d<=st.to2});if(!rows.length){if(msg){msg.className="note out";msg.textContent="No payments fall between these dates."}return}
  if(!confirm("Import "+rows.length+" payments for "+st.person+" from "+st.from2+" to "+st.to2+"?"))return;
  btn.disabled=true;btn.textContent="Importing…";
  try{var res=await api("rpc/import_statement",{method:"POST",body:JSON.stringify({p_person:st.person,p_from:st.from2,p_to:st.to2,p_rows:rows,p_meta:{file:st.file,opening:st.opening,closing:st.closing,balance_ok:st.balance_ok}})});
    var fd=0,fc=0;rows.forEach(function(r){if(r.t==="out")fd+=r.a;else fc+=r.a});
    var ok=Math.abs(res.debits-fd)<0.5&&Math.abs(res.credits-fc)<0.5;
    S.st=null;S.stsel=res.batch;await load();await loadImports();render();
    toast("Imported "+res.inserted+" payments");
    var m2=document.getElementById("stmsg");if(m2){m2.className="note";m2.textContent="Imported "+res.inserted+" payments ("+res.replaced+" email-alert payments replaced, "+res.carried+" categories kept, "+res.needs_category+" need a category). "+(ok?"Totals match the file.":"Totals differ from the file by "+money(Math.abs(res.debits-fd)+Math.abs(res.credits-fc))+" (duplicates skipped).")}
  }catch(e){btn.disabled=false;btn.textContent="Confirm and import";if(msg){msg.className="note out";msg.textContent=errText(e)}}}
