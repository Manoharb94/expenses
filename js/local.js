/* ===== On-phone version (Android app bundle): every payment, budget and setting lives on this phone. No server. =====
   Turned on by js/local-flag.js, which only the app bundle has. On the website this file does nothing. */
(function(){
var ON=!!window.GW_LOCAL_BUILD;try{if(!ON&&localStorage.getItem("gwlocal")==="1")ON=true}catch(e){}
var GWL=window.GWL={on:ON};
if(!ON)return;

var TABLES=["transactions","budgets","fixed_items","goals","goal_entries","household_categories","merchants","statement_imports","cards","txn_bills","family_txns"];
var FILES={data:"gharwise-data.json",bills:"gharwise-bills.json",family:"gharwise-family.json"};
var HH="local";
var DB=null;
function blank(){var d={v:1,app:"gharwise-local",profile:null,family:null,saved_at:null,t:{}};TABLES.forEach(function(t){d.t[t]=[]});return d}
function T(n){if(!DB.t[n])DB.t[n]=[];return DB.t[n]}
function uid(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h=Array.from(b,function(x){return (x<16?"0":"")+x.toString(16)}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}
function now(){return new Date().toISOString()}
function day(ms){var d=ms?new Date(ms):new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function me(){return DB&&DB.profile?DB.profile.name:""}

/* ---------- storage on the phone: IndexedDB (fast) + a copy in the person's folder ---------- */
var IDB=null;
function idb(){if(IDB)return IDB;IDB=new Promise(function(res,rej){var r=indexedDB.open("gharwise-local",1);r.onupgradeneeded=function(){r.result.createObjectStore("kv")};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return IDB}
async function idbGet(k){var d=await idb();return new Promise(function(res,rej){var q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=function(){res(q.result)};q.onerror=function(){rej(q.error)}})}
async function idbPut(k,v){var d=await idb();return new Promise(function(res,rej){var tx=d.transaction("kv","readwrite");tx.objectStore("kv").put(v,k);tx.oncomplete=function(){res()};tx.onerror=function(){rej(tx.error)}})}
async function idbClear(){var d=await idb();return new Promise(function(res){var tx=d.transaction("kv","readwrite");tx.objectStore("kv").clear();tx.oncomplete=function(){res()};tx.onerror=function(){res()}})}

function LF(){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalFiles||null}catch(e){return null}}
GWL.folder={set:false,ok:false,name:""};
/* in a desktop browser (testing only) there is no folder: a pretend one in this browser is used */
var FAKE={files:{},status:function(){return {set:!!ls("gwfakefolder"),ok:!!ls("gwfakefolder"),name:ls("gwfakefolder")||""}}};
async function folderStatus(){var P=LF();try{GWL.folder=P?await P.folderStatus():FAKE.status()}catch(e){GWL.folder={set:false,ok:false,name:""}}return GWL.folder}
async function pickFolder(){var P=LF();
  if(!P){var n=prompt("Testing in a browser: type a folder name","Gharwise");if(n)ls("gwfakefolder",n);return folderStatus()}
  var r=await P.pickFolder();GWL.folder=r||{set:false,ok:false};return GWL.folder}
async function fwrite(name,text,mime){var P=LF();if(!P){try{localStorage.setItem("gwfile:"+name,text)}catch(e){}return true}
  try{await P.writeFile({name:name,text:text,mime:mime||"application/json"});return true}
  catch(e){if(/NO_FOLDER/.test(String(e&&e.message||e))){GWL.folder.ok=false;folderBar()}throw e}}
async function fwriteB64(name,b64,mime){var P=LF();if(!P)return true;await P.writeFile({name:name,base64:b64,mime:mime});return true}
async function fread(name){var P=LF();if(!P){var v=null;try{v=localStorage.getItem("gwfile:"+name)}catch(e){}return v}
  var r=await P.readFile({name:name});return r&&r.exists?r.text:null}
async function fdelete(name){var P=LF();if(!P){try{localStorage.removeItem("gwfile:"+name)}catch(e){}return}if(P.deleteFile)try{await P.deleteFile({name:name})}catch(e){}}

var dirty={data:false,bills:false,family:false},stimer=null,saving=null;
function mark(kind){dirty[kind||"data"]=true;dirty.data=true;clearTimeout(stimer);stimer=setTimeout(flush,1200)}
GWL.mark=mark;
function mainCopy(){var c={v:1,app:"gharwise-local",saved_at:now(),profile:DB.profile,family:DB.family?{id:DB.family.id,code:DB.family.code,created:DB.family.created}:null,t:{}};
  TABLES.forEach(function(t){if(t!=="txn_bills"&&t!=="family_txns")c.t[t]=DB.t[t]});return c}
async function flush(){
  if(saving){await saving;}
  if(!dirty.data&&!dirty.bills&&!dirty.family)return;
  var d=dirty;dirty={data:false,bills:false,family:false};
  saving=(async function(){
    DB.saved_at=now();
    try{await idbPut("db",DB)}catch(e){}
    if(!GWL.folder.ok)return;
    try{
      if(d.data)await fwrite(FILES.data,JSON.stringify(mainCopy()));
      if(d.bills)await fwrite(FILES.bills,JSON.stringify({v:1,saved_at:now(),bills:T("txn_bills")}));
      if(d.family)await fwrite(FILES.family,JSON.stringify({v:1,saved_at:now(),family_txns:T("family_txns")}));
      GWL.lastBackup=Date.now();
    }catch(e){dirty.data=dirty.data||d.data;dirty.bills=dirty.bills||d.bills;dirty.family=dirty.family||d.family}
  })();
  try{await saving}finally{saving=null}}
GWL.flush=flush;
document.addEventListener("visibilitychange",function(){if(document.hidden)flush()});
window.addEventListener("pagehide",function(){flush()});

function folderBar(){var b=document.getElementById("lfbar");
  if(GWL.folder.ok||!DB||!DB.profile){if(b)b.remove();return}
  if(b)return;b=document.createElement("button");b.id="lfbar";
  b.style.cssText="position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:70;border:0;border-radius:12px;padding:11px 14px;background:#b91c1c;color:#fff;font:inherit;font-size:14px;text-align:left;box-shadow:0 6px 20px rgba(0,0,0,.25)";
  b.textContent="⚠ Your storage folder can't be reached. Your data is safe on this phone, but it is not being backed up. Tap to choose the folder again.";
  b.onclick=async function(){var r=await pickFolder();if(r&&r.ok){dirty.data=dirty.bills=dirty.family=true;await flush();folderBar();toast("Backup folder connected")}};document.body.appendChild(b)}

/* ---------- a stand-in for the server: the same requests, answered from the phone ---------- */
function splitQ(path){var i=path.indexOf("?"),tb=i<0?path:path.slice(0,i),qs=i<0?"":path.slice(i+1),p={},f=[];
  qs.split("&").forEach(function(kv){if(!kv)return;var j=kv.indexOf("="),k=decodeURIComponent(j<0?kv:kv.slice(0,j)),v=j<0?"":decodeURIComponent(kv.slice(j+1));
    if(k==="select"||k==="order"||k==="limit"||k==="offset"||k==="on_conflict")p[k]=v;else f.push([k,v])});
  return {table:tb,p:p,f:f}}
function match(row,f){for(var i=0;i<f.length;i++){var k=f[i][0],v=f[i][1],x=row[k],d=v.indexOf("."),op=v.slice(0,d),val=v.slice(d+1);
  if(op==="eq"){if(String(x)!==val&&!(x==null&&val==="null"))return false}
  else if(op==="neq"){if(String(x)===val)return false}
  else if(op==="is"){if(val==="null"?x!=null:String(x)!==val)return false}
  else if(op==="gte"){if(!(String(x)>=val))return false}else if(op==="lte"){if(!(String(x)<=val))return false}
  else if(op==="gt"){if(!(String(x)>val))return false}else if(op==="lt"){if(!(String(x)<val))return false}
  else if(op==="in"){var l=val.replace(/^\(|\)$/g,"").split(",");if(l.indexOf(String(x))<0)return false}}
  return true}
function sortRows(rows,order){if(!order)return rows;var keys=order.split(",").map(function(o){var a=o.split(".");return {k:a[0],d:a[1]==="desc"?-1:1}});
  return rows.slice().sort(function(a,b){for(var i=0;i<keys.length;i++){var x=a[keys[i].k],y=b[keys[i].k];if(x==null&&y==null)continue;if(x==null)return 1;if(y==null)return -1;if(x<y)return -keys[i].d;if(x>y)return keys[i].d}return 0})}
function catFor(key){if(!key||key==="unknown")return null;var m=T("merchants").filter(function(r){return r.merchant_key===key})[0];return m&&m.category||null}
function prep(table,r){r=Object.assign({},r);if(!r.id&&table!=="budgets"&&table!=="merchants"&&table!=="household_categories")r.id=uid();if(!r.created_at)r.created_at=now();r.household_id=HH;
  if(table==="transactions"){r.amount=Number(r.amount)||0;r.type=r.type==="in"?"in":"out";if(!r.person)r.person=me();if(!r.merchant)r.merchant=r.type==="in"?"Received":"Cash";
    if(!r.merchant_key)r.merchant_key=GWSMS.mkey(r.merchant);if(!r.txn_date)r.txn_date=day();if(!r.txn_at)r.txn_at=now();if(r.hidden==null)r.hidden=false;
    if(r.category===undefined||r.category===null||r.category==="")r.category=catFor(r.merchant_key)}
  if(table==="budgets"&&r.amount!=null)r.amount=Number(r.amount);
  return r}
var TOUCH={transactions:"data",budgets:"data",fixed_items:"data",goals:"data",goal_entries:"data",household_categories:"data",merchants:"data",statement_imports:"data",cards:"data",txn_bills:"bills",family_txns:"family"};
function rest(path,opt){
  var q=splitQ(path),tb=q.table,M=(opt.method||"GET").toUpperCase(),pref=String((opt.headers||{}).Prefer||"");
  if(tb==="members")return membersList();
  if(TABLES.indexOf(tb)<0)throw new Error("404 Not available in the on-phone version: "+tb);
  var rows=T(tb);
  if(M==="GET"){var out=rows.filter(function(r){return match(r,q.f)});out=sortRows(out,q.p.order);if(q.p.offset)out=out.slice(+q.p.offset);if(q.p.limit)out=out.slice(0,+q.p.limit);return clone(out)}
  if(M==="POST"){var body=JSON.parse(opt.body||"[]"),list=Array.isArray(body)?body:[body],done=[],conf=q.p.on_conflict?q.p.on_conflict.split(",").filter(function(c){return c!=="household_id"}):null,merge=/merge-duplicates/.test(pref);
    list.forEach(function(b){var r=prep(tb,b),hit=null;
      if(conf&&conf.length)hit=rows.filter(function(x){return conf.every(function(c){return String(x[c])===String(r[c])})})[0];
      if(hit){if(merge){Object.keys(b).forEach(function(k){hit[k]=b[k]});done.push(hit)}else throw new Error("409 duplicate")}
      else{rows.push(r);done.push(r)}});
    mark(TOUCH[tb]);return /return=representation/.test(pref)?clone(done):null}
  if(M==="PATCH"){var body2=JSON.parse(opt.body||"{}"),hit2=rows.filter(function(r){return match(r,q.f)});
    hit2.forEach(function(r){Object.keys(body2).forEach(function(k){r[k]=body2[k]});if(tb==="transactions"&&body2.amount!=null)r.amount=Number(r.amount)});
    if(hit2.length)mark(TOUCH[tb]);return /return=representation/.test(pref)?clone(hit2):null}
  if(M==="DELETE"){var keep=[],gone=[];rows.forEach(function(r){(match(r,q.f)?gone:keep).push(r)});DB.t[tb]=keep;
    if(tb==="transactions"&&gone.length){var ids={};gone.forEach(function(g){ids[g.id]=1});var nb=T("txn_bills").filter(function(b){return !ids[b.txn_id]});if(nb.length!==T("txn_bills").length){DB.t.txn_bills=nb;mark("bills")}}
    if(gone.length)mark(TOUCH[tb]);return /return=representation/.test(pref)?clone(gone):null}
  throw new Error("405")}
function familyPeople(){var s={};T("family_txns").forEach(function(r){if(r.person)s[r.person]=r.received_at||s[r.person]||""});return s}
function membersList(){var out=[{user_id:"local",display_name:me(),role:"owner",created_at:DB.profile&&DB.profile.created||now()}],fp=familyPeople();
  Object.keys(fp).forEach(function(n){if(n!==me())out.push({user_id:"fam:"+n,display_name:n,role:"member",created_at:fp[n]||now()})});return out}
function profile(){if(!DB.profile)return null;return {user_id:"local",household_id:HH,display_name:DB.profile.name,role:"owner",can_edit:true,email:"",invite_code:"",phone:""}}
function appTxns(limit){var own=T("transactions").filter(function(t){return !t.hidden}),fam=T("family_txns").map(function(r){var o=Object.assign({},r);o.source="family";return o});
  return clone(sortRows(own.concat(fam),"txn_date.desc,created_at.desc").slice(0,limit||5000))}

/* statement import, the same way the server did it: older SMS payments for those dates are hidden, not deleted */
function importStatement(a){
  var batch=uid(),person=a.p_person||me(),from=a.p_from,to=a.p_to,rows=a.p_rows||[],meta=a.p_meta||{};
  var old=T("transactions").filter(function(t){return t.person===person&&t.txn_date>=from&&t.txn_date<=to&&!t.source&&t.raw&&!t.hidden});
  var carried=0,inserted=0,deb=0,cred=0,need=0,seen={};
  T("transactions").filter(function(t){return t.source==="statement"&&t.person===person}).forEach(function(t){seen[t.txn_date+"|"+t.amount+"|"+t.type+"|"+(t.ref||"")]=1});
  rows.forEach(function(r){var key=r.d+"|"+Number(r.a)+"|"+r.t+"|"+(r.r||"");if(seen[key])return;seen[key]=1;
    var cat=null,o=old.filter(function(x){return x.txn_date===r.d&&Number(x.amount)===Number(r.a)&&x.type===r.t&&x.category})[0];
    if(o){cat=o.category;carried++}else if(r.c)cat=r.c;
    var row=prep("transactions",{amount:r.a,type:r.t,merchant:r.m||"Unknown",txn_date:r.d,note:r.n||null,ref:r.r||null,source:"statement",batch_id:batch,person:person,category:cat||undefined});
    T("transactions").push(row);inserted++;if(r.t==="out")deb+=Number(r.a);else cred+=Number(r.a);if(!row.category&&r.t==="out")need++});
  old.forEach(function(t){t.hidden=true;t.hidden_by=batch});
  T("statement_imports").push({id:batch,batch:batch,household_id:HH,person:person,date_from:from,date_to:to,file:meta.file||"",opening:meta.opening,closing:meta.closing,balance_ok:meta.balance_ok,inserted:inserted,replaced:old.length,created_at:now()});
  mark();return {batch:batch,inserted:inserted,replaced:old.length,carried:carried,needs_category:need,debits:Math.round(deb*100)/100,credits:Math.round(cred*100)/100}}
function undoStatement(b){DB.t.transactions=T("transactions").filter(function(t){return t.batch_id!==b});T("transactions").forEach(function(t){if(t.hidden_by===b){t.hidden=false;delete t.hidden_by}});DB.t.statement_imports=T("statement_imports").filter(function(i){return i.id!==b});mark();return true}

var NOOP=["touch","set_my_banks","set_mail_months","set_card","set_my_photo","regenerate_ingest_key","clear_join_request","set_member_edit"];
var EMPTY=["my_invites","my_groups","family_join_requests","bank_list"];
function rpc(fn,a){
  if(fn==="my_profile")return profile();
  if(fn==="app_txns")return appTxns(a.p_limit);
  if(fn==="my_script_config")return {key:"local",name:me(),last_run:null,banks:[],months:1};
  if(fn==="my_extra")return {};
  if(fn==="my_phone_norm"||fn==="my_join_request")return null;
  if(fn==="family_overview")return {members:membersList()};
  if(fn==="import_statement")return importStatement(a);
  if(fn==="undo_statement")return undoStatement(a.p_batch);
  if(fn==="delete_my_account"){eraseAll();return true}
  if(NOOP.indexOf(fn)>=0)return null;
  if(EMPTY.indexOf(fn)>=0)return [];
  throw new Error("404 This needs the internet version of Gharwise ("+fn+")")}
GWL.api=async function(path,opt){opt=opt||{};
  if(path.indexOf("rpc/")===0){var a={};try{a=JSON.parse(opt.body||"{}")}catch(e){}return clone(rpc(path.slice(4),a))}
  return rest(path,opt)};

/* ---------- bank SMS and voice entries, read on the phone ---------- */
function smsP(){try{return typeof smsPlugin==="function"?smsPlugin():null}catch(e){return null}}
function ingestSms(items){var saved=0,skipped=0,bad=0,tx=T("transactions");
  var refs={},raws={};tx.forEach(function(t){if(t.ref)refs[t.ref+"|"+t.amount]=1;if(t.raw)raws[t.txn_date+"|"+String(t.raw).replace(/\s+/g," ").slice(0,120)]=1});
  (items||[]).forEach(function(it){var text=String(it.t||it.text||""),p=GWSMS.parseSms(text);if(!p){bad++;return}
    var d=it.ms?day(it.ms):(it.d&&/^\d{4}-\d{2}-\d{2}/.test(it.d)?String(it.d).slice(0,10):day());
    var rk=d+"|"+text.replace(/\s+/g," ").slice(0,120);
    if((p.ref&&refs[p.ref+"|"+p.amount])||raws[rk]){skipped++;return}
    var r=prep("transactions",{amount:p.amount,type:p.type,merchant:p.merchant,merchant_key:p.merchant_key,txn_date:d,txn_at:it.ms?new Date(it.ms).toISOString():now(),raw:text,ref:p.ref||null,card_last:p.card_last||null});
    tx.push(r);if(p.ref)refs[p.ref+"|"+p.amount]=1;raws[rk]=1;saved++});
  if(saved)mark();return {saved:saved,skipped:skipped,bad:bad}}
GWL.ingestSms=ingestSms;
function ingestVoice(it){var p=GWSMS.parseVoice(it.t);if(!p)return false;
  if(it.cid&&T("transactions").some(function(t){return t.client===it.cid}))return false;
  T("transactions").push(prep("transactions",{amount:p.amount,type:p.type,merchant:p.merchant,merchant_key:p.merchant_key,category:p.category||undefined,txn_date:day(it.ms),txn_at:it.ms?new Date(it.ms).toISOString():now(),client:it.cid||null,note:"Said: "+String(it.t).slice(0,80)}));
  mark();return true}
GWL.addVoice=function(text){return ingestVoice({t:text,ms:Date.now()})};
var draining=false;
async function drain(){var P=smsP();if(draining||!P||!P.takeInbox||!DB||!DB.profile)return;draining=true;
  try{var r=await P.takeInbox(),items=r&&r.items||[];if(!items.length)return;
    var sms=items.filter(function(i){return i.k==="sms"}),voice=items.filter(function(i){return i.k==="voice"}),undo=items.filter(function(i){return i.k==="undo"});
    var g=ingestSms(sms),v=0;voice.forEach(function(i){if(ingestVoice(i))v++});
    undo.forEach(function(u){var n=T("transactions").length;DB.t.transactions=T("transactions").filter(function(t){return !(u.cid&&t.client===u.cid)});if(T("transactions").length!==n)mark()});
    if(g.saved||v||undo.length){await flush();if(typeof load==="function")await load(true);
      var parts=[];if(g.saved)parts.push(g.saved+" from SMS");if(v)parts.push(v+" by voice");if(parts.length)toast("New payments added: "+parts.join(", "))}}
  catch(e){}finally{draining=false}}
GWL.drain=drain;

/* ---------- export: CSV and PDF, saved in the folder and/or shared ---------- */
function rangeRows(r){var all=T("transactions").filter(function(t){return !t.hidden}).concat(T("family_txns")),n=new Date(),f="",to="9999";
  if(r==="month"){f=day(new Date(n.getFullYear(),n.getMonth(),1).getTime())}
  else if(r==="last"){f=day(new Date(n.getFullYear(),n.getMonth()-1,1).getTime());to=day(new Date(n.getFullYear(),n.getMonth(),0).getTime())}
  else if(r==="year"){f=n.getFullYear()+"-01-01"}
  return sortRows(all.filter(function(t){return t.txn_date>=f&&t.txn_date<=to}),"txn_date.asc,created_at.asc")}
function csvCell(v){v=v==null?"":String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function toCsv(rows){var h=["Date","Type","Amount","Payee","Category","Person","Note","Source"];
  return "﻿"+[h.join(",")].concat(rows.map(function(t){return [t.txn_date,t.type==="in"?"Income":"Expense",Number(t.amount).toFixed(2),t.merchant,t.category||"",t.person||"",t.note||"",t.source==="statement"?"Bank statement":t.source==="family"?"Family":t.raw?"SMS":t.client?"Voice":"Added by hand"].map(csvCell).join(",")})).join("\r\n")}
var RL={month:"This month",last:"Last month",year:"This year",all:"All time"};
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error("Could not load "+src))};document.head.appendChild(s)})}
async function toPdfB64(rows,r){
  if(!window.jspdf)await loadScript("vendor/jspdf.umd.min.js");
  var J=new window.jspdf.jsPDF({unit:"pt",format:"a4"}),W=J.internal.pageSize.getWidth(),H=J.internal.pageSize.getHeight(),y=50,M=40;
  var rs=function(v){return "Rs. "+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})};
  var asc=function(s){return String(s==null?"":s).replace(/[^\x20-\x7E]/g,"?")};
  J.setFont("helvetica","bold");J.setFontSize(18);J.text("Gharwise - money report",M,y);y+=20;
  J.setFont("helvetica","normal");J.setFontSize(10);J.text(asc(me())+" · "+RL[r]+" · made "+new Date().toLocaleString("en-IN"),M,y);y+=24;
  var inn=0,out=0;rows.forEach(function(t){if(t.type==="in")inn+=Number(t.amount);else out+=Number(t.amount)});
  J.setFontSize(11);J.text("Income: "+rs(inn)+"     Expenses: "+rs(out)+"     Payments: "+rows.length,M,y);y+=22;
  var cols=[[M,"Date"],[M+70,"Payee"],[M+250,"Category"],[M+370,"Person"],[W-M,"Amount"]];
  var head=function(){J.setFont("helvetica","bold");J.setFontSize(9);cols.forEach(function(c,i){J.text(c[1],c[0],y,i===4?{align:"right"}:undefined)});y+=6;J.line(M,y,W-M,y);y+=12;J.setFont("helvetica","normal")};
  head();
  rows.forEach(function(t){if(y>H-50){J.addPage();y=50;head()}
    J.text(t.txn_date||"",cols[0][0],y);J.text(asc(t.merchant).slice(0,34),cols[1][0],y);J.text(asc(t.category||"-").slice(0,22),cols[2][0],y);J.text(asc(t.person||"").slice(0,16),cols[3][0],y);
    J.text((t.type==="in"?"+":"-")+rs(t.amount),cols[4][0],y,{align:"right"});y+=14});
  var out64=J.output("datauristring");return out64.slice(out64.indexOf(",")+1)}
GWL.exportData=async function(fmt,r,how){
  var rows=rangeRows(r),stamp=day(),name,mime,text=null,b64=null;
  if(!rows.length&&fmt!=="json"){toast("No payments in "+RL[r].toLowerCase());return}
  if(fmt==="csv"){name="gharwise-"+r+"-"+stamp+".csv";mime="text/csv";text=toCsv(rows)}
  else if(fmt==="pdf"){name="gharwise-"+r+"-"+stamp+".pdf";mime="application/pdf";b64=await toPdfB64(rows,r)}
  else{name="gharwise-full-backup-"+stamp+".json";mime="application/json";var c=mainCopy();c.t.txn_bills=T("txn_bills");c.t.family_txns=T("family_txns");text=JSON.stringify(c)}
  var P=LF();
  if(how==="share"){if(!P){toast("Sharing works in the app");return}
    await P.shareFile(b64?{name:name,base64:b64,mime:mime,title:"Gharwise export"}:{name:name,text:text,mime:mime,title:"Gharwise export"});return}
  if(b64)await fwriteB64(name,b64,mime);else await fwrite(name,text,mime);
  toast("Saved "+name+" in "+(GWL.folder.name||"your folder"))};

/* ---------- family sharing: encrypted files, no server ---------- */
var B32="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(){var b=new Uint8Array(20);crypto.getRandomValues(b);var s="";for(var i=0;i<20;i++)s+=B32[b[i]%32];return "GW-"+s.slice(0,5)+"-"+s.slice(5,10)+"-"+s.slice(10,15)+"-"+s.slice(15,20)}
function normCode(c){return String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^GW/,"")}
function b64e(buf){var b=new Uint8Array(buf),s="";for(var i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)}
function b64d(s){var r=atob(s),b=new Uint8Array(r.length);for(var i=0;i<r.length;i++)b[i]=r.charCodeAt(i);return b}
async function famId(code){var h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("gharwise-family-id:"+normCode(code)));return b64e(h).replace(/[^A-Za-z0-9]/g,"").slice(0,12)}
async function famKey(code){var base=await crypto.subtle.importKey("raw",new TextEncoder().encode(normCode(code)),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:new TextEncoder().encode("gharwise-family-v1"),iterations:150000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
GWL.famCreate=async function(){var c=newCode();DB.family={code:c,id:await famId(c),created:now()};mark();return c};
GWL.famJoin=async function(code){if(normCode(code).length!==20)throw new Error("That code doesn't look right. It has 20 letters and numbers after GW.");
  var c="GW-"+normCode(code).replace(/(.{5})(?=.)/g,"$1-");DB.family={code:c,id:await famId(c),created:now()};mark();return c};
GWL.famLeave=function(){DB.family=null;DB.t.family_txns=[];mark("family")};
GWL.famSend=async function(){if(!DB.family)throw new Error("Create or join a family first");
  var mine=T("transactions").filter(function(t){return !t.hidden&&t.person===me()}).map(function(t){return {id:t.id,amount:t.amount,type:t.type,merchant:t.merchant,merchant_key:t.merchant_key,category:t.category||null,txn_date:t.txn_date,note:t.note||null}});
  var payload=JSON.stringify({from:me(),at:now(),txns:mine}),iv=crypto.getRandomValues(new Uint8Array(12)),key=await famKey(DB.family.code);
  var ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,new TextEncoder().encode(payload));
  var file=JSON.stringify({gw:"family-share",v:1,fam:DB.family.id,from:me(),at:now(),n:mine.length,iv:b64e(iv),data:b64e(ct)});
  var name="gharwise-family-"+me().replace(/[^A-Za-z0-9]+/g,"-").toLowerCase()+".gwshare";
  try{await fwrite(name,file,"application/octet-stream")}catch(e){}
  var P=LF();if(P)await P.shareFile({name:name,text:file,mime:"application/octet-stream",title:"Gharwise family payments"});
  return mine.length};
GWL.famReceive=async function(text){if(!DB.family)throw new Error("Create or join a family first");
  var o;try{o=JSON.parse(text)}catch(e){throw new Error("This is not a Gharwise family file")}
  if(!o||o.gw!=="family-share")throw new Error("This is not a Gharwise family file");
  if(o.fam!==DB.family.id)throw new Error("This file is from a different family code. Ask them for your family's code.");
  var key=await famKey(DB.family.code),pt;
  try{pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(o.iv)},key,b64d(o.data))}catch(e){throw new Error("This file could not be opened with your family code")}
  var p=JSON.parse(new TextDecoder().decode(pt)),who=String(p.from||"").trim();
  if(!who)throw new Error("This file has no name in it");
  if(who===me())throw new Error("This file is your own. If it is from someone else, both of you have the same name: change one in Settings.");
  var keep=T("family_txns").filter(function(r){return r.person!==who}),at=now();
  (p.txns||[]).forEach(function(t){keep.push({id:"fam-"+who+"-"+t.id,amount:Number(t.amount)||0,type:t.type==="in"?"in":"out",merchant:t.merchant||"",merchant_key:t.merchant_key||GWSMS.mkey(t.merchant),category:t.category||null,txn_date:t.txn_date,note:t.note||null,person:who,source:"family",household_id:HH,created_at:at,received_at:at,sent_at:p.at||o.at})});
  DB.t.family_txns=keep;mark("family");await flush();return {from:who,n:(p.txns||[]).length}};
GWL.famRemove=function(who){DB.t.family_txns=T("family_txns").filter(function(r){return r.person!==who});mark("family")};

/* ---------- erase ---------- */
async function eraseAll(){try{var P=smsP();if(P)await P.disable()}catch(e){}
  await idbClear();var keep={theme:1,accent:1,lang:1};try{Object.keys(localStorage).forEach(function(k){if(!keep[k])localStorage.removeItem(k)})}catch(e){}
  DB=blank()}
GWL.eraseAll=eraseAll;GWL.deleteFolderFiles=async function(){for(var k in FILES)await fdelete(FILES[k])};

/* ---------- restore from the folder ---------- */
async function peekFolder(){try{var t=await fread(FILES.data);if(!t)return null;var o=JSON.parse(t);if(!o||o.app!=="gharwise-local"||!o.t)return null;return o}catch(e){return null}}
async function restoreFrom(o){var d=blank();d.profile=o.profile;d.family=o.family||null;TABLES.forEach(function(t){if(o.t[t])d.t[t]=o.t[t]});
  try{var b=JSON.parse(await fread(FILES.bills)||"null");if(b&&b.bills)d.t.txn_bills=b.bills}catch(e){}
  try{var f=JSON.parse(await fread(FILES.family)||"null");if(f&&f.family_txns)d.t.family_txns=f.family_txns}catch(e){}
  if(d.family&&d.family.code&&!d.family.id)d.family.id=await famId(d.family.code);
  DB=d;await idbPut("db",DB)}

/* ---------- first-run setup and the folder gate ---------- */
var SU={step:1,name:"",found:null,busy:false,err:""};
function setupView(){
  var h='<div class="brand" style="margin-top:28px"><div style="font-size:44px">🏠</div><h1 style="margin:6px 0 2px">Gharwise</h1><div class="mute">Your money, kept on your phone</div></div><div class="card" style="margin-top:18px">';
  var dots='<div style="display:flex;gap:6px;justify-content:center;margin:0 0 14px">'+[1,2,3].map(function(i){return '<i style="width:28px;height:5px;border-radius:3px;background:'+(i<=SU.step?'var(--acc)':'var(--line)')+'"></i>'}).join('')+'</div>';
  if(S.view==="lfolder"){h+='<h3 style="margin:0 0 8px">Choose your storage folder again</h3><p class="mute" style="margin:0 0 12px">Gharwise keeps a copy of all your data in a folder on this phone. The phone no longer lets the app use the folder you chose. Pick it again (or a new one) to keep going.</p>'+(SU.err?'<div class="note out">'+esc(SU.err)+'</div>':'')+'<button class="btn" data-l="pick">'+(SU.busy?'Waiting…':'Choose folder')+'</button></div>';return h}
  h+=dots;
  if(SU.step===1)h+='<h3 style="margin:0 0 8px">Everything stays on this phone</h3><ul style="margin:0 0 14px;padding-left:18px;line-height:1.6"><li>Your payments, budgets and bank SMS are saved <b>only on this phone</b>. No account, no server.</li><li>You choose a folder on the phone. Gharwise keeps a backup of your data there, so you can move to a new phone.</li><li>Family members share payments with <b>encrypted files</b> that only your family can open.</li></ul><button class="btn" data-l="next">Get started</button>';
  else if(SU.step===2)h+='<h3 style="margin:0 0 8px">What should we call you?</h3><p class="mute" style="margin:0 0 10px">Your family sees this name next to your payments.</p><input id="lname" maxlength="30" placeholder="Your name" value="'+esc(SU.name)+'" autocomplete="given-name">'+(SU.err?'<div class="note out">'+esc(SU.err)+'</div>':'')+'<button class="btn" data-l="name" style="margin-top:10px">Next</button>';
  else{h+='<h3 style="margin:0 0 8px">Pick a folder for your data</h3><p class="mute" style="margin:0 0 10px">Tracking and adding payments start after this. Pick or create a folder such as <b>Documents › Gharwise</b>. Keep it: if you change phones, copy it across and pick it again.</p>';
    if(SU.found)h+='<div class="note" style="margin:0 0 10px">We found Gharwise data in <b>'+esc(GWL.folder.name||"this folder")+'</b>: '+((SU.found.t.transactions||[]).length)+' payments, saved '+esc(String(SU.found.saved_at||"").slice(0,10))+(SU.found.profile?' for '+esc(SU.found.profile.name):'')+'.</div><button class="btn" data-l="restore">Restore my data</button><button class="btn ghost" data-l="fresh" style="margin-top:8px">Start fresh here (replaces it)</button><button class="btn ghost" data-l="pick" style="margin-top:8px">Choose a different folder</button>';
    else h+=(GWL.folder.ok?'<div class="note" style="margin:0 0 10px">✓ Folder: <b>'+esc(GWL.folder.name)+'</b></div><button class="btn" data-l="done">Start using Gharwise</button><button class="btn ghost" data-l="pick" style="margin-top:8px">Choose a different folder</button>':'<button class="btn" data-l="pick">'+(SU.busy?'Waiting…':'Choose folder')+'</button>');
    if(SU.err)h+='<div class="note out" style="margin-top:8px">'+esc(SU.err)+'</div>'}
  return h+'</div>'}
async function finishSetup(){if(!DB.profile)DB.profile={name:SU.name,created:now()};dirty.data=dirty.bills=dirty.family=true;await flush();S.view="";startApp()}
document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-l]");if(!b)return;var a=b.getAttribute("data-l");SU.err="";
  if(a==="next"){SU.step=2;render()}
  else if(a==="name"){var n=(document.getElementById("lname")||{}).value||"";n=n.trim().replace(/\s+/g," ");if(n.length<2){SU.err="Please type your name";render();return}SU.name=n;SU.step=3;render()}
  else if(a==="pick"){SU.busy=true;render();try{var r=await pickFolder();SU.busy=false;if(r&&r.ok){SU.found=S.view==="lfolder"?null:await peekFolder();if(S.view==="lfolder"){dirty.data=dirty.bills=dirty.family=true;await flush();S.view="";startApp();return}}else if(!(r&&r.cancelled))SU.err="That folder can't be used. Pick a folder on the phone, for example in Documents."}catch(x){SU.busy=false;SU.err=String(x&&x.message||x)}render()}
  else if(a==="restore"){try{await restoreFrom(SU.found);S.view="";toast("Your data is back");startApp()}catch(x){SU.err="Could not read the data in this folder";render()}}
  else if(a==="fresh"){if(!confirm("Start fresh? The Gharwise data in this folder will be replaced the first time the app saves."))return;SU.found=null;finishSetup()}
  else if(a==="done")finishSetup()});

/* ---------- start ---------- */
function startApp(){S.auth={access:"local",refresh:"",exp:4e9,email:"",phone:""};try{ls("sb",JSON.stringify(S.auth))}catch(e){}S.name=me();S.view="";folderBar();
  Promise.resolve(enter()).then(function(){setTimeout(drain,600)})}
GWL.start=async function(){
  try{DB=await idbGet("db")}catch(e){DB=null}if(!DB||!DB.t)DB=blank();TABLES.forEach(function(t){if(!DB.t[t])DB.t[t]=[]});
  await folderStatus();
  if(!DB.profile){S.view="lsetup";SU.step=1;render();return}
  if(!GWL.folder.ok){S.view="lfolder";render();return}
  startApp()};
document.addEventListener("visibilitychange",function(){if(!document.hidden&&DB&&DB.profile)setTimeout(drain,400)});
setInterval(function(){if(!document.hidden&&DB&&DB.profile)drain()},15000);

/* ---------- screens that change in the on-phone version ---------- */
GWL.hook=function(){
  var _auth=authView;authView=function(){return (S.view==="lsetup"||S.view==="lfolder")?setupView():_auth()};
  var _bind=bindAuth;bindAuth=function(el){if(S.view==="lsetup"||S.view==="lfolder"){var i=document.getElementById("lname");if(i)i.onkeydown=function(e){if(e.key==="Enter"){var b=document.querySelector('[data-l="name"]');if(b)b.click()}};return}_bind(el)};
  boot=function(){return GWL.start()};
  phoneNudge=function(){};joinCheck=function(){};touch=function(){};
  try{loadGroups=function(){};gOKUI=function(){return false}}catch(e){}
  var _can=canEditT;canEditT=function(t){return t&&t.source==="family"?false:_can(t)};
  vMenu=localMenu;vFam=localFam;vMail=function(){return topbar("Email tracking","track")+'<div class="card"><b>Not in the on-phone version</b><div class="note" style="margin-top:6px">Email tracking works by a script in your Gmail sending bank emails to a server. This version has no server, so it can’t receive them. Use SMS tracking, voice, or Import Bank (statements) instead.</div></div>'};
  var _vt=vTrack;vTrack=function(){var h=_vt();
    h=h.replace(/<div class="dc trk"><i style="background:rgba\(255,150,40,\.22\)">✉️<\/i>[\s\S]*?<\/button><\/div>/,'<div class="dc trk"><i style="background:rgba(120,130,150,.20)">✉️</i><div class="m"><b>Email Tracking</b><span>Not in the on-phone version, because it needs a server</span></div></div>');
    h=h.replace(/<div class="sec">❔ How It Works<\/div><div class="card"[\s\S]*$/,'<div class="sec">❔ How It Works</div><div class="card" style="font-size:14px;line-height:1.55"><p style="margin:0 0 8px"><b>SMS</b>: bank alerts are read on this phone the moment they arrive and saved here. Nothing is sent anywhere.</p><p style="margin:0 0 8px"><b>Voice</b>: say an expense to the home-screen widget, for example “Grocery 120”.</p><p style="margin:0"><b>Bank statements</b>: import a PDF, Excel or CSV file from your bank. It is read on the phone.</p></div>');
    return h};
  var _vsn=vSmsNative;vSmsNative=function(){var h=_vsn();
    h=h.replace(/<ul[\s\S]*?<\/ul>/,'<ul style="margin:6px 0 0;padding-left:18px"><li>Gharwise reads SMS on this phone to find <b>bank payment alerts</b> (debited, credited, spent).</li><li>They are saved <b>only on this phone</b> and in your backup folder. Nothing is sent to any server.</li><li>OTPs, personal messages and offers are ignored.</li><li>You can turn this off any time here, or in Android Settings.</li></ul>');
    h=h.replace(/ sent from this phone/," added on this phone").replace(/<div class="note" style="text-align:center;margin-top:10px">You can also use <a[\s\S]*?<\/div>/,"");return h};
  var _ndp=ndPlugin;ndPlugin=function(){return null};
  ndiIos=function(){try{return nativeApp()&&!!lnPlugin()}catch(e){return false}};
};
function rowB(id,i,a,b,bg,go){return '<button class="mr" '+(go?'data-go="'+go+'"':'data-lm="'+id+'"')+'><i class="mt" style="background:'+bg+'">'+i+'</i><span><b>'+a+'</b>'+(b?'<span>'+b+'</span>':'')+'</span><span class="go">›</span></button>'}
function localMenu(){
  var fam=DB.family?Object.keys(familyPeople()).length+1+" people":"Not set up";
  return topbar("Menu","home")+'<div class="msec">App settings</div><div class="card" style="padding:0 12px">'+rowB("","⚙️","Settings","Language, look, lock and reminders","rgba(120,130,150,.20)","set")+rowB("","🗂️","Categories","What each category has this month","rgba(255,150,40,.22)","cats")+'</div>'+
    '<div class="msec">Tracking & family</div><div class="card" style="padding:0 12px">'+rowB("","💬","Automated tracking","SMS, voice and bank statements","rgba(60,130,255,.20)","track")+rowB("","👨‍👩‍👧","Family sharing","Encrypted files · "+fam,"rgba(140,100,255,.20)","fam")+rowB("","🎯","Goals","Save for things together","rgba(240,80,150,.20)","goals")+'</div>'+
    '<div class="msec">Your data</div><div class="card" style="padding:0 12px">'+rowB("folder","📁","Storage folder",GWL.folder.ok?esc(GWL.folder.name||"Chosen")+(GWL.lastBackup?" · backed up "+new Date(GWL.lastBackup).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):""):"⚠ Not available","rgba(40,180,100,.20)")+rowB("export","📤","Export my data","PDF or CSV (Excel)","rgba(60,130,255,.20)")+'<a class="mr" href="privacy.html" target="_blank" rel="noopener" style="text-decoration:none"><i class="mt" style="background:rgba(120,130,150,.20)">🔒</i><span><b>Privacy</b><span>Nothing leaves this phone unless you share it</span></span><span class="go">›</span></a>'+rowB("erase","🗑️",'<span class="out">Erase all data on this phone</span>',"Payments, settings and family data","rgba(230,70,70,.18)")+'</div><div class="note" style="text-align:center;margin:14px 0">Gharwise on-phone version · '+T("transactions").length+' payments stored here</div>'}
var EX={f:"pdf",r:"month"};
function exportSheet(){var sh=document.getElementById("sheet");if(!sh)return;
  var chip=function(k,v,l){return '<button type="button" class="'+(EX[k]===v?'on':'')+'" data-ex="'+k+':'+v+'">'+l+'</button>'};
  sh.innerHTML='<div class="sheet"><div class="sx">'+sxHead("📤","Export my data","Expenses and income from this phone")+'<div class="mute" style="margin:6px 0">Format</div><div class="sxs">'+chip("f","pdf","PDF")+chip("f","csv","CSV / Excel")+chip("f","json","Full backup")+'</div><div class="mute" style="margin:10px 0 6px">Which payments</div><div class="sxs" style="flex-wrap:wrap">'+chip("r","month","This month")+chip("r","last","Last month")+chip("r","year","This year")+chip("r","all","All")+'</div><button class="btn" data-exgo="save" style="margin-top:14px">Save in my folder</button><button class="btn ghost" data-exgo="share" style="margin-top:8px">Share…</button><button class="btn ghost" data-exgo="close" style="margin-top:8px">Close</button></div></div>'}
document.addEventListener("click",async function(e){var t=e.target&&e.target.closest?e.target:null;if(!t||!GWL.on)return;
  var lm=t.closest("[data-lm]");
  if(lm){var a=lm.getAttribute("data-lm");
    if(a==="export")exportSheet();
    else if(a==="folder"){if(!confirm("Choose a different folder for your data? A full copy is saved there straight away."))return;var r=await pickFolder();if(r&&r.ok){dirty.data=dirty.bills=dirty.family=true;await flush();folderBar();toast("Saved to "+(r.name||"the new folder"));render()}}
    else if(a==="erase"){if(!confirm("Erase all Gharwise data on this phone? Payments, budgets, settings and family data are removed. This can't be undone."))return;
      var alsoFiles=confirm("Also delete the backup files in your folder ("+(GWL.folder.name||"folder")+")?\n\nOK = delete them too. Cancel = keep them, so you can restore later.");
      if(alsoFiles)await GWL.deleteFolderFiles();await eraseAll();location.reload()}
    return}
  var ex=t.closest("[data-ex]");if(ex){var kv=ex.getAttribute("data-ex").split(":");EX[kv[0]]=kv[1];exportSheet();return}
  var eg=t.closest("[data-exgo]");if(eg){var w=eg.getAttribute("data-exgo"),sh=document.getElementById("sheet");if(w==="close"){sh.innerHTML="";return}
    eg.disabled=true;eg.textContent="Preparing…";try{await GWL.exportData(EX.f,EX.r,w);sh.innerHTML=""}catch(x){eg.disabled=false;eg.textContent=w==="share"?"Share…":"Save in my folder";showErr("Could not export: "+(x&&x.message||x))}return}
  var fb=t.closest("[data-fam]");if(fb){var f=fb.getAttribute("data-fam");
    try{
      if(f==="create"){await GWL.famCreate();await flush();render()}
      else if(f==="join"){var c=(document.getElementById("famcode")||{}).value;await GWL.famJoin(c);await flush();render();toast("Joined. Now send your payments and add theirs.")}
      else if(f==="copy"){if(await copyText(DB.family.code))toast("Code copied")}
      else if(f==="sharecode"){var P=LF();if(P)await P.shareFile({name:"gharwise-family-code.txt",text:"Our Gharwise family code: "+DB.family.code+"\n\nIn Gharwise: Menu → Family sharing → Join with a code.",mime:"text/plain",title:"Gharwise family code"});else if(await copyText(DB.family.code))toast("Code copied")}
      else if(f==="send"){fb.disabled=true;var n=await GWL.famSend();fb.disabled=false;toast(n+" payments packed and encrypted")}
      else if(f==="receive"){var P2=LF(),txt=null;
        if(P2){var r2=await P2.openFile();if(!r2||r2.cancelled)return;txt=r2.text}
        else txt=prompt("Testing in a browser: paste the family file text");
        if(!txt)return;var res=await GWL.famReceive(txt);await load(true);render();toast("Added "+res.n+" payments from "+res.from)}
      else if(f==="leave"){if(!confirm("Leave this family? Payments you received from family are removed from this phone. Your own payments stay."))return;GWL.famLeave();await flush();await load(true);render()}
      else if(f.indexOf("rm:")===0){var who=f.slice(3);if(!confirm("Remove "+who+"'s payments from this phone?"))return;GWL.famRemove(who);await flush();await load(true);render()}
    }catch(x){fb.disabled=false;showErr(x&&x.message||String(x))}}});
function localFam(){
  var h=topbar("Family sharing","menu");
  if(!DB.family)return h+'<div class="dc"><div style="text-align:center"><span style="font-size:42px">👨‍👩‍👧</span><h3 style="margin:6px 0 4px">Share payments with family, privately</h3><p class="mute" style="margin:0 0 12px">There is no server. Each person sends an <b>encrypted file</b> (for example on WhatsApp). Only phones with your family code can open it.</p></div><button class="btn" data-fam="create">Create a family code</button></div>'+
    '<div class="card"><b>Someone already made a code?</b><div class="mute" style="margin:4px 0 8px">Type the code they shared with you.</div><input id="famcode" placeholder="GW-XXXXX-XXXXX-XXXXX-XXXXX" autocapitalize="characters" autocomplete="off"><button class="btn ghost" data-fam="join" style="margin-top:8px">Join with this code</button></div>';
  var ppl=familyPeople(),names=Object.keys(ppl).filter(function(n){return n!==me()});
  h+='<div class="card"><div class="mute">Your family code</div><div style="font-size:19px;font-weight:700;letter-spacing:.5px;margin:6px 0 8px;word-break:break-all">'+esc(DB.family.code)+'</div><div class="note" style="margin:0 0 10px">Share it only with your family. Anyone with this code can open your family files.</div><div class="row" style="gap:8px;padding:0"><button class="btn ghost s" data-fam="copy">Copy</button><button class="btn ghost s" data-fam="sharecode">Share code</button></div></div>';
  h+='<div class="card"><b>1. Send your payments</b><div class="mute" style="margin:4px 0 10px">Makes an encrypted file with your '+T("transactions").filter(function(t){return !t.hidden&&t.person===me()}).length+' payments (no SMS text) and opens Share. Send it to your family.</div><button class="btn" data-fam="send">Send my payments</button></div>';
  h+='<div class="card"><b>2. Add a family member’s file</b><div class="mute" style="margin:4px 0 10px">When someone sends you their .gwshare file, save it and open it here. Their newest file replaces the old one.</div><button class="btn ghost" data-fam="receive">Open a family file</button></div>';
  h+='<div class="sec">People</div><div class="card"><div class="row" style="padding:6px 0"><b>'+esc(me())+' (you)</b><span class="mute">'+T("transactions").filter(function(t){return !t.hidden}).length+' payments</span></div>'+
    (names.length?names.map(function(n){var c=T("family_txns").filter(function(r){return r.person===n}).length;return '<div class="row" style="padding:6px 0"><span><b>'+esc(n)+'</b><br><small class="mute">'+c+' payments · received '+esc(String(ppl[n]||"").slice(0,10))+'</small></span><button class="btn ghost s" data-fam="rm:'+esc(n)+'">Remove</button></div>'}).join(''):'<div class="note">No family files added yet.</div>')+'</div>';
  return h+'<button class="btn ghost" data-fam="leave" style="margin:6px 0 20px">Leave this family</button>'}
GWL.db=function(){return DB};GWL.FILES=FILES;GWL.T=T;
})();
