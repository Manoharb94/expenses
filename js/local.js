/* ===== On-phone version (Android app bundle): every payment, budget and setting lives on this phone. No server. =====
   Turned on by js/local-flag.js, which only the app bundle has. On the website this file does nothing. */
(function(){
var ON=!!window.GW_LOCAL_BUILD;try{if(!ON&&localStorage.getItem("gwlocal")==="1")ON=true}catch(e){}
var GWL=window.GWL={on:ON};
if(!ON)return;

var TABLES=["transactions","budgets","fixed_items","goals","goal_entries","household_categories","merchants","statement_imports","cards","txn_bills","family_txns"];
var FILES={data:"gharwise-data.json",bills:"gharwise-bills.json",family:"gharwise-family.json"};
var HH="local",PLAY_APP="https://play.google.com/store/apps/details?id=in.nestwise.app";
var DB=null;
function blank(){var d={v:1,app:"gharwise-local",profile:null,family:null,saved_at:null,t:{}};TABLES.forEach(function(t){d.t[t]=[]});return d}
function T(n){if(!DB.t[n])DB.t[n]=[];return DB.t[n]}
function uid(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h=Array.from(b,function(x){return (x<16?"0":"")+x.toString(16)}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}
function now(){return new Date().toISOString()}
function day(ms){var d=ms?new Date(ms):new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function me(){return DB&&DB.profile?DB.profile.name:""}
/* my id: the real login id once logged in (groups need it), "local" before that */
function myUid(){var u=GWL.uid&&GWL.uid();if(u){if(DB&&DB.profile&&DB.profile.uid!==u&&!GWL.testing){DB.profile.uid=u;mark("data",true)}return u}return DB&&DB.profile&&DB.profile.uid||"local"}
GWL.myId=myUid;

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
function mark(kind,quiet){dirty[kind||"data"]=true;dirty.data=true;if(GWL.testing)return;clearTimeout(stimer);stimer=setTimeout(flush,1200);if(!quiet&&kind!=="family"&&GWL.syncSoon)GWL.syncSoon()}
GWL.mark=mark;
function mainCopy(){var c={v:1,app:"gharwise-local",saved_at:now(),profile:DB.profile,family:DB.family||null,mail:DB.mail||null,keys:DB.keys||null,t:{}};
  TABLES.forEach(function(t){if(t!=="txn_bills"&&t!=="family_txns")c.t[t]=DB.t[t]});return c}
async function flush(){
  if(GWL.testing)return;
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
function membersList(){var out=[{user_id:myUid(),display_name:me(),role:"owner",created_at:DB.profile&&DB.profile.created||now()}],fp=familyPeople();
  Object.keys(fp).forEach(function(n){if(n!==me())out.push({user_id:"fam:"+n,display_name:n,role:"member",created_at:fp[n]||now()})});return out}
function profile(){if(!DB.profile)return null;return {user_id:myUid(),household_id:HH,display_name:DB.profile.name,role:"owner",can_edit:true,email:"",invite_code:"",phone:""}}
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
var EMPTY=["family_join_requests","bank_list"];
function rpc(fn,a){
  if(GWL.grpcHas&&GWL.grpcHas(fn))return GWL.grpc(fn,a);
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
  if(path.indexOf("rpc/")===0){var a={};try{a=JSON.parse(opt.body||"{}")}catch(e){}var out=await rpc(path.slice(4),a);return clone(out)}
  return rest(path,opt)};

/* ---------- bank SMS and voice entries, read on the phone ---------- */
function smsP(){try{return typeof smsPlugin==="function"?smsPlugin():null}catch(e){return null}}
function ingestSms(items,via){via=via||"sms";var saved=0,skipped=0,bad=0,tx=T("transactions");
  var refs={},raws={},other={};tx.forEach(function(t){if(t.ref)refs[t.ref+"|"+t.amount]=1;if(t.raw){raws[t.txn_date+"|"+String(t.raw).replace(/\s+/g," ").slice(0,120)]=1;var k=t.txn_date+"|"+t.amount+"|"+t.type;other[k]=other[k]||{};other[k][t.via||"sms"]=1}});
  (items||[]).forEach(function(it){var text=String(it.t||it.text||""),p=GWSMS.parseSms(text);if(!p){bad++;return}
    var d=it.ms?day(it.ms):(it.d&&/^\d{4}-\d{2}-\d{2}/.test(it.d)?String(it.d).slice(0,10):day());
    var rk=d+"|"+text.replace(/\s+/g," ").slice(0,120);
    if((p.ref&&refs[p.ref+"|"+p.amount])||raws[rk]){skipped++;return}
    var ok2=d+"|"+p.amount+"|"+p.type;if(other[ok2]&&Object.keys(other[ok2]).some(function(v){return v!==via})){skipped++;return}
    var r=prep("transactions",{amount:p.amount,type:p.type,merchant:p.merchant,merchant_key:p.merchant_key,txn_date:d,txn_at:it.ms?new Date(it.ms).toISOString():now(),raw:text,ref:p.ref||null,card_last:p.card_last||null,via:via});
    tx.push(r);if(p.ref)refs[p.ref+"|"+p.amount]=1;raws[rk]=1;other[ok2]=other[ok2]||{};other[ok2][via]=1;saved++});
  if(saved)mark();return {saved:saved,skipped:skipped,bad:bad}}
GWL.ingestSms=ingestSms;
function ingestVoice(it){var p=GWSMS.parseVoice(it.t);if(!p)return false;
  if(it.cid&&T("transactions").some(function(t){return t.client===it.cid}))return false;
  T("transactions").push(prep("transactions",{amount:p.amount,type:p.type,merchant:p.merchant,merchant_key:p.merchant_key,category:p.category||undefined,txn_date:day(it.ms),txn_at:it.ms?new Date(it.ms).toISOString():now(),client:it.cid||null,note:"Said: "+String(it.t).slice(0,80)}));
  mark();return true}
GWL.addVoice=function(text){return ingestVoice({t:text,ms:Date.now()})};
var draining=false;
async function drain(){var P=smsP();if(GWL.testing||draining||!P||!P.takeInbox||!DB||!DB.profile)return;draining=true;
  try{var r=await P.takeInbox(),items=r&&r.items||[];if(!items.length)return;
    var sms=items.filter(function(i){return i.k==="sms"}),voice=items.filter(function(i){return i.k==="voice"}),undo=items.filter(function(i){return i.k==="undo"});
    var g=ingestSms(sms),v=0;voice.forEach(function(i){if(ingestVoice(i)){v++;try{var pv=GWSMS.parseVoice(i.t)||{};ls("gwvlast",JSON.stringify({ms:i.ms||Date.now(),t:String(i.t||"").slice(0,40),m:pv.merchant||"",a:pv.amount||0,ty:pv.type||"out"}))}catch(x){}}});
    undo.forEach(function(u){var n=T("transactions").length;DB.t.transactions=T("transactions").filter(function(t){return !(u.cid&&t.client===u.cid)});if(T("transactions").length!==n)mark()});
    if(v)try{ls("gwvc",String(Number(ls("gwvc")||0)+v))}catch(x){}
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
function manyPeople(rows){var m={};rows.forEach(function(t){if(t.person)m[t.person]=1});return Object.keys(m).length>1}
function csvCell(v){v=v==null?"":String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function toCsv(rows){var mp=manyPeople(rows),h=["Date","Type","Amount","Payee","Category"].concat(mp?["Person"]:[],["Note","Source"]);
  return "﻿"+[h.join(",")].concat(rows.map(function(t){return [t.txn_date,t.type==="in"?"Income":"Expense",Number(t.amount).toFixed(2),t.merchant,t.category||""].concat(mp?[t.person||""]:[],[t.note||"",t.source==="statement"?"Bank statement":t.source==="family"?"Family":t.raw?"SMS":t.client?"Voice":"Added by hand"]).map(csvCell).join(",")})).join("\r\n")}
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
  var mp=manyPeople(rows),cols=mp?[[M,"Date"],[M+70,"Payee"],[M+250,"Category"],[M+370,"Person"],[W-M,"Amount"]]:[[M,"Date"],[M+70,"Payee"],[M+330,"Category"],[W-M,"Amount"]],ai=cols.length-1;
  var head=function(){J.setFont("helvetica","bold");J.setFontSize(9);cols.forEach(function(c,i){J.text(c[1],c[0],y,i===ai?{align:"right"}:undefined)});y+=6;J.line(M,y,W-M,y);y+=12;J.setFont("helvetica","normal")};
  head();
  rows.forEach(function(t){if(y>H-50){J.addPage();y=50;head()}
    J.text(t.txn_date||"",cols[0][0],y);J.text(asc(t.merchant).slice(0,mp?34:48),cols[1][0],y);J.text(asc(t.category||"-").slice(0,22),cols[2][0],y);if(mp)J.text(asc(t.person||"").slice(0,16),cols[3][0],y);
    J.text((t.type==="in"?"+":"-")+rs(t.amount),cols[ai][0],y,{align:"right"});y+=14});
  var out64=J.output("datauristring");return out64.slice(out64.indexOf(",")+1)}
GWL.exportData=async function(fmt,r,how,pre){
  var rows=rangeRows(r),stamp=day(),name,mime,text=null,b64=null;pre=pre||"gharwise-";
  if(!rows.length&&fmt!=="json"){toast("No payments in "+RL[r].toLowerCase());return}
  if(fmt==="csv"){name=pre+r+"-"+stamp+".csv";mime="text/csv";text=toCsv(rows)}
  else if(fmt==="pdf"){name=pre+r+"-"+stamp+".pdf";mime="application/pdf";b64=await toPdfB64(rows,r)}
  else{name="gharwise-full-backup-"+stamp+".json";mime="application/json";var c=mainCopy();c.t.txn_bills=T("txn_bills");c.t.family_txns=T("family_txns");text=JSON.stringify(c)}
  var P=LF();
  if(how==="share"){if(!P){toast("Sharing works in the app");return}
    await P.shareFile(b64?{name:name,base64:b64,mime:mime,title:"Gharwise export"}:{name:name,text:text,mime:mime,title:"Gharwise export"});return}
  if(b64)await fwriteB64(name,b64,mime);else await fwrite(name,text,mime);
  toast("Saved "+name+" in "+(GWL.folder.name||"your folder"))};

/* ---------- erase ---------- */
async function eraseAll(serverToo){try{var P=smsP();if(P)await P.disable()}catch(e){}
  if(GWL.loggedIn&&GWL.loggedIn()){try{if(DB.family)await GWL.srv("lm_family_leave",{})}catch(e){}try{if(DB.mail)await GWL.srv("lm_mail_off",{})}catch(e){}
    try{var pt=String(ls("gwpush")||"").split(":").slice(1).join(":");if(pt)await GWL.srv("lm_drop_push",{p_token:pt})}catch(e){}
    
    if(serverToo)try{await GWL.srv("delete_my_account",{})}catch(e){}GWL.logout()}
  await idbClear();var keep={theme:1,accent:1,lang:1};try{Object.keys(localStorage).forEach(function(k){if(!keep[k])localStorage.removeItem(k)})}catch(e){}
  DB=blank()}
GWL.eraseAll=eraseAll;GWL.deleteFolderFiles=async function(){for(var k in FILES)await fdelete(FILES[k])};

/* ---------- restore from the folder ---------- */
async function peekFolder(){try{var t=await fread(FILES.data);if(!t)return null;var o=JSON.parse(t);if(!o||o.app!=="gharwise-local"||!o.t)return null;return o}catch(e){return null}}
async function restoreFrom(o){var d=blank();d.profile=o.profile;d.family=o.family&&o.family.key?o.family:null;d.mail=o.mail||null;d.keys=o.keys||null;TABLES.forEach(function(t){if(o.t[t])d.t[t]=o.t[t]});
  try{var b=JSON.parse(await fread(FILES.bills)||"null");if(b&&b.bills)d.t.txn_bills=b.bills}catch(e){}
  try{var f=JSON.parse(await fread(FILES.family)||"null");if(f&&f.family_txns)d.t.family_txns=f.family_txns;}catch(e){}
  DB=d;await idbPut("db",DB)}

/* ---------- first-run setup: welcome → mobile → SMS code → name → folder ---------- */
var SU={step:1,name:"",phone:"",found:null,busy:false,err:"",sent:0};GWL.su=SU;
var STEPS=5;
function dots(){return '<div style="display:flex;gap:6px;justify-content:center;margin:0 0 14px">'+[1,2,3,4,5].map(function(i){return '<i style="width:22px;height:5px;border-radius:3px;background:'+(i<=SU.step?'var(--acc)':'var(--line)')+'"></i>'}).join('')+'</div>'}
function setupView(){
  var h='<div class="brand" style="margin-top:28px"><div style="font-size:44px">🏠</div><h1 style="margin:6px 0 2px">Gharwise</h1><div class="mute">Your money, kept on your phone</div></div><div class="card" style="margin-top:18px">';
  var err=SU.err?'<div class="note out" style="margin-top:8px">'+esc(SU.err)+'</div>':'';
  if(S.view==="lfolder")return h+'<h3 style="margin:0 0 8px">Choose your storage folder again</h3><p class="mute" style="margin:0 0 12px">Gharwise keeps a copy of all your data in a folder on this phone. The phone no longer lets the app use the folder you chose. Pick it again (or a new one) to keep going.</p>'+err+'<button class="btn" data-l="pick">'+(SU.busy?'Waiting…':'Choose folder')+'</button></div>';
  if(S.view!=="llogin")h+=dots();
  if(SU.step===1)h+='<h3 style="margin:0 0 8px">Your payments stay on this phone</h3><ul style="margin:0 0 14px;padding-left:18px;line-height:1.6"><li>Payments, budgets and bank SMS are saved <b>only on this phone</b> and in a folder you choose.</li><li>You log in with your mobile number, so your family can find you and you can switch phones.</li><li>Family sharing is <b>encrypted on the phone</b>. Our server only passes on scrambled data it can’t read.</li></ul><button class="btn" data-l="next">Get started</button>';
  else if(SU.step===2){var md=SU.mode||(S.view==="llogin"?"login":"signup"),pw=function(id,ph,ac){return '<div class="pwrap"><input id="'+id+'" type="password" placeholder="'+ph+'" autocomplete="'+ac+'"><button type="button" class="eye" data-eye="'+id+'" aria-label="Show password">'+(typeof EYE!=="undefined"?EYE:"👁")+'</button></div>'},
      mob='<div class="mobw"><span class="mcc">+91</span><input id="lphone" type="tel" inputmode="numeric" maxlength="14" placeholder="Mobile number" value="'+esc(SU.phone)+'" autocomplete="tel-national"></div>',
      lk=function(a,t){return '<div style="text-align:center"><button class="alink" data-l="'+a+'">'+t+'</button></div>'},bz=SU.busy;
    if(md==="login")h+='<h3 style="margin:0 0 10px">'+(S.view==="llogin"&&ls("gwout")!=="1"?'Log in again':'Log in')+'</h3>'+mob+pw("lpw","Password","current-password")+err+'<button class="btn" data-l="pwlogin"'+(bz?' disabled':'')+'>'+(bz?'Please wait…':'Log in')+'</button>'+lk("goforgot","Forgot password?")+lk("gosignup","New here? Create an account")+(S.view==="llogin"&&ls("gwout")!=="1"?'<button class="btn ghost" data-l="later" style="margin-top:8px">Later</button>':'')+(S.view==="llogin"&&ls("gwout")==="1"&&DB&&DB.profile&&DB.profile.phone?'<p class="mute" style="margin:12px 0 0;font-size:13px">This phone has Gharwise data for '+esc(DB.profile.name||"")+' (+'+esc(String(DB.profile.phone).replace(/^\+?91/,"91 "))+'). Log in with that number to open it.</p>':'');
    else if(md==="signup")h+='<h3 style="margin:0 0 10px">Create account</h3><input id="lsname" maxlength="30" placeholder="Your name, e.g. Manohar" value="'+esc(SU.name)+'" autocomplete="given-name">'+mob+pw("lpw","Password (8+ characters)","new-password")+'<p class="mute" style="margin:0 0 8px;font-size:13px">We send a 6-digit code by SMS to confirm your mobile. This needs the internet once.</p>'+err+'<button class="btn" data-l="signup"'+(bz?' disabled':'')+'>'+(bz?'Please wait…':'Create account')+'</button>'+lk("gologin","I already have an account");
    else h+='<h3 style="margin:0 0 8px">Reset password</h3><p class="mute" style="margin:0 0 10px">Enter your mobile number and we will send a code by SMS to choose a new password.</p>'+mob+err+'<button class="btn" data-l="forgot"'+(bz?' disabled':'')+'>'+(bz?'Sending…':'Send code')+'</button>'+lk("gologin","Back to log in")}
  else if(SU.step===3)h+='<h3 style="margin:0 0 8px">'+(SU.mode==='forgot'?'Reset password':'Confirm your mobile')+'</h3><p class="mute" style="margin:0 0 10px">Sent by SMS to <b>+91 '+esc(SU.phone)+'</b>.</p><input id="lotp" class="otpin" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">'+err+'<button class="btn" data-l="verify" style="margin-top:10px"'+(SU.busy?' disabled':'')+'>'+(SU.busy?'Checking…':'Continue')+'</button><button class="btn ghost" data-l="resend" style="margin-top:8px">Send the code again</button><button class="btn ghost" data-l="back" style="margin-top:8px">Change number</button>';
  else if(SU.step===4)h+='<h3 style="margin:0 0 8px">What should we call you?</h3><p class="mute" style="margin:0 0 10px">Your family sees this name next to your payments.</p><input id="lname" maxlength="30" placeholder="Your name" value="'+esc(SU.name)+'" autocomplete="given-name">'+err+'<button class="btn" data-l="name" style="margin-top:10px">Next</button>';
  else if(SU.step===6)h+='<h3 style="margin:0 0 8px">Choose a new password</h3><div class="pwrap"><input id="lpw" type="password" placeholder="New password (8+ characters)" autocomplete="new-password"><button type="button" class="eye" data-eye="lpw" aria-label="Show password">'+(typeof EYE!=="undefined"?EYE:"👁")+'</button></div><div class="pwrap"><input id="lpw2" type="password" placeholder="Repeat new password" autocomplete="new-password"><button type="button" class="eye" data-eye="lpw2" aria-label="Show password">'+(typeof EYE!=="undefined"?EYE:"👁")+'</button></div>'+err+'<button class="btn" data-l="savepw" style="margin-top:6px"'+(SU.busy?' disabled':'')+'>'+(SU.busy?'Saving…':'Save password')+'</button>';
  else{h+='<h3 style="margin:0 0 8px">Pick a folder for your data</h3><p class="mute" style="margin:0 0 10px">Tracking and adding payments start after this. Pick or create a folder such as <b>Documents › Gharwise</b>. Keep it: if you change phones, copy it across and pick it again.</p>';
    if(SU.found)h+='<div class="note" style="margin:0 0 10px">We found Gharwise data in <b>'+esc(GWL.folder.name||"this folder")+'</b>: '+((SU.found.t.transactions||[]).length)+' payments, saved '+esc(String(SU.found.saved_at||"").slice(0,10))+(SU.found.profile?' for '+esc(SU.found.profile.name):'')+'.</div><button class="btn" data-l="restore">Restore my data</button><button class="btn ghost" data-l="fresh" style="margin-top:8px">Start fresh here (replaces it)</button><button class="btn ghost" data-l="pick" style="margin-top:8px">Choose a different folder</button>';
    else h+=(GWL.folder.ok?'<div class="note" style="margin:0 0 10px">✓ Folder: <b>'+esc(GWL.folder.name)+'</b></div><button class="btn" data-l="done">Start using Gharwise</button><button class="btn ghost" data-l="pick" style="margin-top:8px">Choose a different folder</button>':'<button class="btn" data-l="pick">'+(SU.busy?'Waiting…':'Choose folder')+'</button>');
    h+=err}
  return h+'</div>'}
async function finishSetup(){if(!DB.profile)DB.profile={name:SU.name,created:now()};DB.profile.phone=GWL.phone&&GWL.phone();DB.profile.uid=GWL.uid&&GWL.uid()||DB.profile.uid||null;dirty.data=dirty.bills=dirty.family=true;await flush();S.view="";startApp()}
function samePerson(){var a=String(DB&&DB.profile&&DB.profile.phone||"").replace(/\D/g,"").slice(-10),b=String(GWL.phone&&GWL.phone()||"").replace(/\D/g,"").slice(-10);return !a||!b||a===b}
async function afterLogin(){
  if(S.view==="llogin"&&ls("gwout")==="1"&&DB&&DB.profile&&!samePerson()){
    if(!confirm("This phone has Gharwise data for "+(DB.profile.name||"another person")+" (+"+String(DB.profile.phone).replace(/^\+?91/,"91 ")+").\n\nErase it from this phone and start fresh as +"+String(GWL.phone()).replace(/^\+?91/,"91 ")+"?\n\nTheir copy in the storage folder is kept until you choose a folder.")){
      GWL.logout();SU.step=2;SU.err="Log in with +"+String(DB.profile.phone).replace(/^\+?91/,"91 ")+" to open this phone's data.";render();return}
    ls("gwout","");DB=blank();TABLES.forEach(function(t){if(!DB.t[t])DB.t[t]=[]});try{await idbPut("db",DB)}catch(e){}
    ["gs_sms","gs_voice","gs_budget","gwsc2","gwvsc","gwpastrun","gwvc","gwwc","gwvlast"].forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});
    S.view="lsetup";SU.step=4;render();return}
  SU.mode="";SU.pw="";
  if(S.view==="llogin"&&!APPON){ls("gwout","");S.view="";SU.step=1;startApp();toast("Logged in");return}
  if(S.view==="llogin"){ls("gwout","");S.view="";SU.step=1;var b=document.getElementById("lgbar");if(b)b.remove();render();if(GWL.online)GWL.online();toast("Logged in. Sync is back on.");return}
  SU.mode="";SU.pw="";SU.step=SU.name&&SU.name.length>=2?5:4;render()}
document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-l]");if(!b)return;var a=b.getAttribute("data-l");SU.err="";
  if(a==="next"){SU.mode="signup";SU.step=GWL.loggedIn&&GWL.loggedIn()?(SU.name&&SU.name.length>=2?5:4):2;render()}
  else if(a==="later"){S.view="";SU.step=1;SU.mode="";render()}
  else if(a==="back"){SU.step=2;SU.pw="";render()}
  else if(a==="gologin"||a==="gosignup"||a==="goforgot"){SU.mode={gologin:"login",gosignup:"signup",goforgot:"forgot"}[a];SU.err="";SU.phone=phDigits((document.getElementById("lphone")||{}).value||SU.phone);var sn=document.getElementById("lsname");if(sn)SU.name=sn.value;render()}
  else if(a==="pwlogin"||a==="signup"||a==="forgot"||a==="resend"){
    var md=SU.mode||(S.view==="llogin"?"login":"signup"),v=a==="resend"?SU.phone:phDigits((document.getElementById("lphone")||{}).value||""),pwv=(document.getElementById("lpw")||{}).value||"";
    var nm=a==="signup"?((document.getElementById("lsname")||{}).value||"").trim().replace(/\s+/g," "):SU.name;
    SU.phone=v;if(a==="signup")SU.name=nm;
    if(a!=="resend"&&!isMob(v)){SU.err="Enter a 10-digit mobile number";render();return}
    if(a==="signup"){if(nm.length<2){SU.err="Enter your name";render();return}if(pwv.length<8){SU.err="Password needs at least 8 characters";render();return}SU.pw=pwv}
    if(a==="pwlogin"&&!pwv){SU.err="Enter your password";render();return}
    SU.busy=true;SU.err="";render();var ph=phE164(v);
    try{
      if(a==="pwlogin"){try{await GWL.pwLogin(ph,pwv)}catch(x){
          if(x&&x.code==="phone_not_confirmed"){SU.mode="signup";SU.pw=pwv;try{await GWL.smsResend(ph)}catch(y){}SU.busy=false;SU.step=3;SU.err="Your mobile is not verified yet. We sent you a code.";render();return}
          if(x&&x.code==="invalid_credentials")throw new Error("Wrong mobile number or password. If you have not set a password yet, tap Forgot password.");throw x}
        SU.busy=false;await afterLogin();return}
      if(a==="signup"){var st=await GWL.phoneStatus(ph);
        if(st==="confirmed"){SU.busy=false;SU.err="This mobile number already has an account. Log in, or tap Forgot password.";render();return}
        SU.mode="signup";
        if(st==="unconfirmed")await GWL.smsResend(ph);else await GWL.pwSignup(ph,pwv);
        SU.busy=false;SU.step=3;SU.sent=Date.now();render();return}
      if(a==="forgot"){var st2=await GWL.phoneStatus(ph);
        if(st2==="none"||st2==="unconfirmed"){SU.busy=false;SU.err="No account with this mobile number. Check it, or create an account.";render();return}
        await GWL.resetCode(ph);SU.mode="forgot";SU.busy=false;SU.step=3;SU.sent=Date.now();render();return}
      if(a==="resend"){if(Date.now()-(SU.sent||0)<30000){SU.busy=false;toast("Please wait a little before asking again");render();return}
        if(SU.mode==="forgot")await GWL.resetCode(ph);else await GWL.smsResend(ph);SU.sent=Date.now();SU.busy=false;render();toast("New code sent")}
    }catch(x){SU.busy=false;SU.err=x&&x.name==="TypeError"?"No internet. This needs the internet once.":(x&&x.message||String(x));render()}}
  else if(a==="verify"){var c=((document.getElementById("lotp")||{}).value||"").replace(/\D/g,"");if(c.length!==6){SU.err="Type the 6-digit code";render();return}
    SU.busy=true;SU.err="";render();try{await GWL.verifyOtp(phE164(SU.phone),c);
      if(SU.mode==="forgot"){SU.busy=false;SU.step=6;render();return}
      if(SU.pw){try{await GWL.setPassword(SU.pw)}catch(y){}SU.pw=""}
      SU.busy=false;await afterLogin()}catch(x){SU.busy=false;SU.err=x&&x.message||String(x);render()}}
  else if(a==="savepw"){var p1=(document.getElementById("lpw")||{}).value||"",p2=(document.getElementById("lpw2")||{}).value||"";
    if(p1.length<8){SU.err="Password needs at least 8 characters";render();return}if(p1!==p2){SU.err="The two passwords do not match";render();return}
    SU.busy=true;SU.err="";render();try{await GWL.setPassword(p1);SU.busy=false;toast("Password changed");await afterLogin()}catch(x){SU.busy=false;SU.err=x&&x.message||String(x);render()}}
  else if(a==="name"){var n=(document.getElementById("lname")||{}).value||"";n=n.trim().replace(/\s+/g," ");if(n.length<2){SU.err="Please type your name";render();return}SU.name=n;SU.step=5;render()}
  else if(a==="pick"){SU.busy=true;render();try{var r=await pickFolder();SU.busy=false;if(r&&r.ok){SU.found=S.view==="lfolder"?null:await peekFolder();if(S.view==="lfolder"){dirty.data=dirty.bills=dirty.family=true;await flush();S.view="";startApp();return}}else if(!(r&&r.cancelled))SU.err="That folder can't be used. Pick a folder on the phone, for example in Documents."}catch(x){SU.busy=false;SU.err=String(x&&x.message||x)}render()}
  else if(a==="restore"){try{await restoreFrom(SU.found);S.view="";toast("Your data is back");startApp()}catch(x){SU.err="Could not read the data in this folder";render()}}
  else if(a==="fresh"){if(!confirm("Start fresh? The Gharwise data in this folder will be replaced the first time the app saves."))return;SU.found=null;finishSetup()}
  else if(a==="done")finishSetup()});
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-eye]");if(!b)return;var i=document.getElementById(b.getAttribute("data-eye"));if(i)i.type=i.type==="password"?"text":"password"});
document.addEventListener("keydown",function(e){if(e.key!=="Enter")return;var id=e.target&&e.target.id,m={lphone:(SU.mode==="forgot"?"forgot":SU.mode==="signup"?"signup":"pwlogin"),lpw:(SU.step===6?"savepw":SU.mode==="signup"?"signup":"pwlogin"),lpw2:"savepw",lsname:"signup",lotp:"verify",lname:"name"}[id];if(m){var b=document.querySelector('[data-l="'+m+'"]');if(b)b.click()}});

/* ---------- start ---------- */
var APPON=false;
function startApp(){APPON=true;S.auth={access:"local",refresh:"",exp:4e9,email:"",phone:""};try{ls("sb",JSON.stringify(S.auth))}catch(e){}S.name=me();S.view="";folderBar();
  Promise.resolve(enter()).then(function(){setTimeout(drain,600);if(GWL.loggedIn&&GWL.loggedIn()){if(GWL.online)GWL.online()}else if(GWL.loginBar)GWL.loginBar()})}
GWL.start=async function(){
  try{DB=await idbGet("db")}catch(e){DB=null}if(!DB||!DB.t)DB=blank();TABLES.forEach(function(t){if(!DB.t[t])DB.t[t]=[]});
  await folderStatus();
  if(!DB.profile){S.view="lsetup";SU.step=1;render();return}
  if(!GWL.folder.ok){S.view="lfolder";render();return}
  if(ls("gwout")==="1"&&!(GWL.loggedIn&&GWL.loggedIn())){S.name=me();S.view="llogin";SU.mode="login";SU.step=2;render();return}
  startApp()};
document.addEventListener("visibilitychange",function(){if(!document.hidden&&DB&&DB.profile)setTimeout(drain,400)});
setInterval(function(){if(!document.hidden&&DB&&DB.profile)drain()},15000);

/* ---------- screens that change in the on-phone version ---------- */
var LV={lsetup:1,lfolder:1,llogin:1};
GWL.hook=function(){
  var _auth=authView;authView=function(){return LV[S.view]?setupView():_auth()};
  var _bind=bindAuth;bindAuth=function(el){if(LV[S.view])return;_bind(el)};
  var _render=render;render=function(){if(LV[S.view]&&S.code&&S.name){var el=document.getElementById("app"),nav=document.getElementById("nav");nav.classList.add("hide");el.innerHTML=setupView();return}return _render.apply(this,arguments)};
  /* put the cursor in the setup box straight away (helps people and the Maestro test robot) */
  var _r2=render;render=function(){var out=_r2.apply(this,arguments);if(LV[S.view])setTimeout(function(){var i=document.getElementById("lotp")||document.getElementById("lphone")||document.getElementById("lname");if(i&&document.activeElement!==i){try{i.focus()}catch(e){}}},150);return out};
  boot=function(){return GWL.start()};
  /* Quick Add: put the cursor in the Amount box straight away */
  var _add=addSheet;addSheet=function(){var r=_add.apply(this,arguments);setTimeout(function(){var x=document.getElementById("xa");if(x&&!x.value&&document.activeElement!==x){try{x.focus()}catch(e){}}},250);return r};
  phoneNudge=function(){};joinCheck=function(){};touch=function(){};
  logoutLocal=function(){if(GWL.logout)GWL.logout();if(GWL.loginBar)GWL.loginBar()};
  try{loadGroups=function(){};gOKUI=function(){return false}}catch(e){}
  var _can=canEditT;canEditT=function(t){return t&&t.source==="family"?false:_can(t)};
  vMenu=localMenu;vFam=localFam;vMail=localMail;vProfile=localProfile;bindProfile=localBindProfile;famPhoto=localFamPhoto;
  /* Settings: "Delete all my data" lives here (moved from the Menu) */
  var _vSet=vSet;vSet=function(){var h=_vSet(),k=h.indexOf("About this app"),i=k<0?-1:h.lastIndexOf('<div class="card">',k),
    c='<div class="msec">Your data</div><div class="card" style="padding:0 12px">'+rowB("erase","🗑️",'<span class="out">Delete all my data</span>',"Removes everything from this phone","rgba(230,70,70,.18)")+'</div>';
    return i<0?h+c:h.slice(0,i)+c+h.slice(i)};
  var _vt=vTrack;vTrack=function(){var h=_vt(),m=DB.mail&&DB.mail.on,mv=!!(m&&DB.mail.verified);
    if(m&&!mv&&!window.__mchk&&GWL.mailStatus&&GWL.loggedIn&&GWL.loggedIn()){window.__mchk=1;GWL.mailStatus().then(function(r){if(r&&r.last_run&&(Date.now()-new Date(r.last_run).getTime())<30*60000&&DB.mail){DB.mail.verified=true;mark("data",true);if(S.tab==="track")render()}}).catch(function(){})}
    h=h.replace(/<div class="dc trk"><i style="background:rgba\(255,150,40,\.22\)">✉️<\/i>[\s\S]*?<\/button><\/div>/,'<div class="dc trk"><i style="background:rgba(255,150,40,.22)">✉️</i><div class="m"><b>Email Tracking</b><span>Bank emails, encrypted in your Gmail'+(mv?' · <span class="in">✓ On</span>':m?' · <span class="mute">Not connected yet</span>':'')+'</span></div><button class="sbtn" data-go="mail" aria-label="'+(mv?'Manage':'Set up')+' email tracking">'+(mv?'Manage':'Set Up')+'</button></div>');
    h=h.replace(/<div class="sec">❔ How It Works<\/div><div class="card"[\s\S]*$/,function(){return hiwBlock()});
    return h};
  var _vsn=vSmsNative;vSmsNative=function(){var h=_vsn();
    h=h.replace(/<ul[\s\S]*?<\/ul>/,'<ul style="margin:6px 0 0;padding-left:18px"><li>Gharwise reads SMS on this phone to find <b>bank payment alerts</b> (debited, credited, spent).</li><li>They are saved <b>only on this phone</b> and in your backup folder. SMS text is never sent anywhere.</li><li>OTPs, personal messages and offers are ignored.</li><li>You can turn this off any time here, or in Android Settings.</li></ul>');
    h=h.replace(/ sent from this phone/," added on this phone").replace(/<div class="note" style="text-align:center;margin-top:10px">You can also use <a[\s\S]*?<\/div>/,"");
    h=h.replace(/<div class="mute" style="margin:16px 0 6px">How far back should we read your bank SMS\?<\/div>[\s\S]*?(<button class="btn" id="non">)/,'<div style="height:14px"></div>$1');
    h=h.replace("Allow SMS access and turn on","Allow SMS access and turn on live tracking").replace("SMS tracking is on</h3>","Live SMS tracking is on</h3>");
    h=h.replace('<button class="btn ghost" id="noff">','<div class="note" style="margin:0 0 12px;text-align:center">Live tracking only adds new SMS. For older bank SMS, use <a href="#" data-limp="1" style="color:var(--acc)">Import SMS</a>.</div><button class="btn ghost" id="noff">');
    return h};
  var _vi=vImportSms;vImportSms=function(){var st=S.nsms;
    if(!nativeSmsOK()||!st||st.enabled)return _vi();
    if(st.permission!=="granted")return '<h2 style="margin:14px 0 2px">Import SMS</h2><div class="mute" style="margin-bottom:12px">Read older bank messages from this phone, once.</div><div class="card"><b>Allow Gharwise to read SMS</b><div class="note" style="margin:6px 0 12px">Only bank payment alerts are picked out and saved on this phone. This does not turn on live tracking.</div><button class="btn" data-lsmsperm="1">Allow SMS access</button></div>';
    S.nsms=Object.assign({},st,{enabled:true});try{return _vi()}finally{S.nsms=st}};
  ndPlugin=function(){return null};
  ndiIos=function(){try{return nativeApp()&&!!lnPlugin()}catch(e){return false}};
};
function rowB(id,i,a,b,bg,go){return '<button class="mr" '+(go?'data-go="'+go+'"':'data-lmenu="'+id+'"')+'><i class="mt" style="background:'+bg+'">'+i+'</i><span><b>'+a+'</b>'+(b?'<span>'+b+'</span>':'')+'</span><span class="go">›</span></button>'}
function familyPeopleCount(){var s={};T("family_txns").forEach(function(r){s[r.member||r.person]=1});return Object.keys(s).length}
/* ===== Profile: photo + name, like the main app. The photo is small (about 128px) so it can travel encrypted to the family ===== */
var PH_OK=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
function localFamPhoto(name){if(!DB||!DB.profile)return null;if(name===S.name||name===me())return DB.profile.photo||null;var m=(DB.family&&DB.family.mem)||{};for(var k in m){if(m[k]&&m[k].name===name&&m[k].photo)return m[k].photo}return null}
function myPhoneShow(){var ph=GWL.loggedIn&&GWL.loggedIn()?GWL.phone():"";return ph?"+"+String(ph).replace(/^\+?91/,"91 "):""}
function profCardL(){return '<style>.pring>span.gav{display:flex!important;align-items:center;justify-content:center;line-height:1}</style><button class="mr" data-go="prof" style="border:1px solid var(--line);border-radius:16px;margin:0 0 6px;padding:14px;background:var(--card)"><span class="pring">'+famAv(me(),56)+'</span><span><b style="font-size:17px">'+esc(me())+'</b><span>'+esc(myPhoneShow())+'</span><span><em class="pchip">Edit profile</em></span></span><span class="go">›</span></button>'}
function localProfile(){var ph=DB.profile.photo;
  return topbar("Profile","menu")+'<div class="card" style="text-align:center">'+famAv(me(),120)+'<div class="note" style="margin:8px 0 12px">'+(ph?'Your photo is shown to your family.':'No photo yet. Your first letter is shown instead.')+'</div><div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn s" id="pfc">🖼️ '+(ph?'Change photo':'Choose photo')+'</button>'+(ph?'<button class="btn ghost s" id="pfr">Remove photo</button>':'')+'</div><input type="file" id="pfile" accept="image/*" style="display:none"></div>'+
   '<div class="card">'+sxHead('👤','Your details','Your name and mobile')+'<div class="mute">Name</div><div style="font-weight:600;margin-bottom:2px">'+esc(me())+'</div><div class="mute" style="margin-top:14px">Mobile</div><div style="font-weight:600">'+esc(myPhoneShow()||"Not logged in")+'</div></div>'}
function localBindProfile(el){
  var a=el.querySelector("#pfile"),c=el.querySelector("#pfc");
  if(a&&c){c.onclick=function(){a.click()};a.onchange=function(){var f=a.files&&a.files[0];a.value="";if(!f)return;cropSheet(f,128,11000,function(d){DB.profile.photo=d;mark("data");render();toast("Photo saved")})}}
  var r=el.querySelector("#pfr");if(r)r.onclick=function(){delete DB.profile.photo;mark("data");render();toast("Photo removed")};}
/* "How it works": four tabs, tap one to read it */
var HIW=[["sms","SMS"],["email","Email"],["voice","Voice"],["stmt","Statements"]];
function hiwBlock(){var ios=false;try{ios=phoneOS()==="ios"}catch(e){}var t=S.hiw||"sms",D={
 sms:["💬","#dfe8fc","Bank SMS",ios?"Your Shortcuts automation hands each bank SMS to the app on this iPhone.":"Bank alerts are read on this phone the moment they arrive.",ios?["Tap Set Up and add the shortcut.","Pay as usual. The bank sends its SMS.","The payment appears in Gharwise in seconds."]:["Tap Set Up and allow SMS access.","Pay as usual. The bank sends its SMS.","The payment appears in Gharwise in seconds."],"🔒 Saved on this phone only. Nothing is sent anywhere."],
 email:["✉️","#fbe8d6","Bank emails","A small script in your own Gmail finds bank emails and <b>encrypts</b> them before sending.",["Tap Set Up and copy the script into Google.","Run it once and allow access.","Gharwise collects new emails on this phone."],"🔒 Only this phone can open them. Deleted from our server once collected."],
 voice:["🎤","#e7defa","Voice",ios?"Say “Hey Siri, add expense in Gharwise”, double-tap the back of your iPhone, or tap the widget mic.":"Tap the widget microphone on your home screen.",ios?["Open Settings and tap Set up voice.","Say your expense, like “Grocery 120”.","It is saved on your phone straight away."]:["Add the Gharwise widget to your home screen.","Tap the microphone and say “Grocery 120”.","It is saved on your phone straight away."],"🔒 Saved on your phone, like every other payment."],
 stmt:["📄","#dcf1e3","Bank statements","Import a PDF, Excel or CSV file from your bank.",["Open the Import Bank tab.","Pick the statement file.","Check the payments and add them."],"🔒 The file is read on the phone only."]}[t];
 return '<div class="sec">❔ How It Works</div><div class="seg2 hiwt" style="margin-bottom:0">'+HIW.map(function(x){return '<button data-hiw="'+x[0]+'"'+(t===x[0]?' class="on"':'')+'>'+x[1]+'</button>'}).join('')+'</div><div class="card" style="font-size:14.5px;line-height:1.5"><div style="width:44px;height:44px;border-radius:13px;background:'+D[1]+';display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:10px">'+D[0]+'</div><b class="tcx" style="font-size:17px">'+D[2]+'</b><p style="margin:6px 0 10px">'+D[3]+'</p><ol style="margin:0 0 10px;padding-left:20px">'+D[4].map(function(x){return '<li style="margin-bottom:5px">'+x+'</li>'}).join('')+'</ol><div class="note" style="margin:0">'+D[5]+'</div></div>'}
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-hiw]");if(!b)return;S.hiw=b.getAttribute("data-hiw");render()});
function localMenu(){
  var fam=DB.family?(DB.family.members||familyPeopleCount()+1)+" people · encrypted":"Not set up",li=GWL.loggedIn&&GWL.loggedIn();
  return topbar("Menu","home")+profCardL()+'<div class="msec">App settings</div><div class="card" style="padding:0 12px">'+rowB("","⚙️","Settings","Language, look, lock and reminders","rgba(120,130,150,.20)","set")+rowB("","🗂️","Categories","What each category has this month","rgba(255,150,40,.22)","cats")+'</div>'+
    '<div class="msec">Tracking & family</div><div class="card" style="padding:0 12px">'+rowB("","💬","Automated tracking","SMS, email, voice and bank statements","rgba(60,130,255,.20)","track")+rowB("","👨‍👩‍👧","Family sharing",fam,"rgba(140,100,255,.20)","fam")+rowB("","🎯","Goals","Save for things together","rgba(240,80,150,.20)","goals")+'</div>'+
    '<div class="msec">Your data</div><div class="card" style="padding:0 12px">'+rowB("folder","📁","Storage folder",GWL.folder.ok?esc(GWL.folder.name||"Chosen")+(GWL.lastBackup?" · backed up "+new Date(GWL.lastBackup).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):""):"⚠ Not available","rgba(40,180,100,.20)")+rowB("export","📤","Export my data","PDF or CSV (Excel)","rgba(60,130,255,.20)")+'<a class="mr" href="privacy.html" target="_blank" rel="noopener" style="text-decoration:none"><i class="mt" style="background:rgba(120,130,150,.20)">🔒</i><span><b>Privacy</b><span>Payments stay on this phone; family data is encrypted</span></span><span class="go">›</span></a>'+
    rowB("login","📱","Account",li?"+"+esc(String(GWL.phone()).replace(/^\+?91/,"91 ")):"⚠ Logged out · tap to log in","rgba(120,130,150,.20)")+(li?rowB("logout","⏻","Log out","Locks the app until you log in again","rgba(120,130,150,.20)"):"")+'</div>'+(false/* Testing section hidden: ls("gwdev")==="1" */?'<div class="msec">Testing</div><div class="card" style="padding:0 12px"><button class="mr" data-st="run"><i class="mt" style="background:rgba(40,180,100,.20)">🧪</i><span><b>Run self-check</b><span>Tests every feature on this phone. Your data is not touched.</span></span><span class="go">›</span></button>'+rowB("pushtest","📲","Send me a test push in 10 seconds","Firebase → this phone. Leave the app after tapping.","rgba(60,130,255,.20)")+rowB("pushinvite","📨","Send me a test family invite in 10 seconds","A real invite push with one phone. Leave the app after tapping.","rgba(60,130,255,.20)")+'</div>':'')}
var EX={f:"pdf",r:"month"};
function exportSheet(){var sh=document.getElementById("sheet");if(!sh)return;
  var chip=function(k,v,l){return '<button type="button" class="'+(EX[k]===v?'on':'')+'" data-ex="'+k+':'+v+'">'+l+'</button>'};
  sh.innerHTML='<div class="sheet"><div class="sx">'+sxHead("📤","Export my data","Expenses and income from this phone")+'<div class="mute" style="margin:6px 0">Format</div><div class="sxs">'+chip("f","pdf","PDF")+chip("f","csv","CSV / Excel")+chip("f","json","Full backup")+'</div><div class="mute" style="margin:10px 0 6px">Which payments</div><div class="sxs" style="flex-wrap:wrap">'+chip("r","month","This month")+chip("r","last","Last month")+chip("r","year","This year")+chip("r","all","All")+'</div><button class="btn" data-exgo="save" style="margin-top:14px">Save in my folder</button><button class="btn ghost" data-exgo="share" style="margin-top:8px">Share…</button><button class="btn ghost" data-exgo="close" style="margin-top:8px">Close</button></div></div>'}
document.addEventListener("click",async function(e){var t=e.target&&e.target.closest?e.target:null;if(!t||!GWL.on)return;
  var lm=t.closest("[data-lmenu]");
  if(lm){var a=lm.getAttribute("data-lmenu");
    if(a==="export")exportSheet();
    else if(a==="pushtest"){lm.disabled=true;try{var st=await GWL.pushSetup();if(st!=="on")throw new Error(st==="not in this build"?"This build has no Firebase file (google-services.json)":st==="not allowed"?"Allow notifications for Gharwise in Android settings":"Push notifications are not available: "+(GWL.pushNo||"unknown reason"));
        ls("gwpusherr","");if(!await GWL.pushWait())throw new Error(GWL.pushWhy());var r=await GWL.fn("lm-push",{test:true,delay:10});
        if(r&&r.status===404)throw new Error("The lm-push Edge Function is not deployed in Supabase");if(r&&r.note)throw new Error(r.note);if(r&&r.error)throw new Error(r.error);
        if(!r||!r.queued)throw new Error("The server has no push token for this phone even though it was just sent. Run the Supabase check from the notes, then send this message to me.");
        toast("Test push on its way. Leave the app now.")}catch(x){showErr(x&&x.message||String(x))}finally{lm.disabled=false}}
    else if(a==="pushinvite"){lm.disabled=true;try{await GWL.inviteTest();toast("Invite on its way. Leave the app now.")}catch(x){showErr(x&&x.message||String(x))}finally{lm.disabled=false}}
    else if(a==="logout"){if(!confirm("Log out? Your data stays on this phone. You need to log in again to open the app."))return;
      try{var pt=String(ls("gwpush")||"").split(":").slice(1).join(":");if(pt)await GWL.srv("lm_drop_push",{p_token:pt})}catch(e){}ls("gwpush","");
      try{await flush()}catch(e){}GWL.logout();ls("gwout","1");var lb=document.getElementById("lgbar");if(lb)lb.remove();
      S.view="llogin";SU.mode="login";SU.step=2;SU.phone="";SU.err="";render();toast("Logged out")}
    else if(a==="login"){if(GWL.loggedIn()){toast("Logged in as +"+String(GWL.phone()).replace(/^\+/,""));return}S.view="llogin";SU.mode="login";SU.step=2;render()}
    else if(a==="folder"){if(!confirm("Choose a different folder for your data? A full copy is saved there straight away."))return;var r=await pickFolder();if(r&&r.ok){dirty.data=dirty.bills=dirty.family=true;await flush();folderBar();toast("Saved to "+(r.name||"the new folder"));render()}}
    else if(a==="erase"){if(!confirm("Delete all your Gharwise data on this phone? Payments, budgets, settings and family data are removed. This can't be undone."))return;
      var alsoFiles=confirm("Also delete the backup files in your folder ("+(GWL.folder.name||"folder")+")?\n\nOK = delete them too. Cancel = keep them, so you can restore later.");
      var alsoLogin=confirm("Also delete your login (mobile number) from Gharwise's server?\n\nOK = delete it. Cancel = keep it.");
      if(alsoFiles)await GWL.deleteFolderFiles();await eraseAll(alsoLogin);location.reload()}
    return}
  var ex=t.closest("[data-ex]");if(ex){var kv=ex.getAttribute("data-ex").split(":");EX[kv[0]]=kv[1];exportSheet();return}
  var eg=t.closest("[data-exgo]");if(eg){var w=eg.getAttribute("data-exgo"),sh=document.getElementById("sheet");if(w==="close"){sh.innerHTML="";return}
    eg.disabled=true;eg.textContent="Preparing…";try{await GWL.exportData(EX.f,EX.r,w);sh.innerHTML=""}catch(x){eg.disabled=false;eg.textContent=w==="share"?"Share…":"Save in my folder";showErr("Could not export: "+(x&&x.message||x))}return}
  var fx=t.closest("[data-fcx],[data-fia],[data-fir]");if(fx){fx.disabled=true;try{
    if(fx.dataset.fcx){await GWL.srv("lm_invite_cancel",{p_id:fx.dataset.fcx});DB.family.invites=(DB.family.invites||[]).filter(function(x){return x.id!==fx.dataset.fcx});mark("data",true);toast("Invite cancelled")}
    else if(fx.dataset.fia){await GWL.inviteRespond(fx.dataset.fia,true);await load(true);toast("You joined the family")}
    else{await GWL.inviteRespond(fx.dataset.fir,false);toast("Invite rejected")}
    render()}catch(x){fx.disabled=false;showErr(x&&x.message||String(x))}return}
  var fb=t.closest("[data-fam]");if(fb){var f=fb.getAttribute("data-fam");if(f==="sheet"||f==="sheetx"||f==="tabm"||f==="tabc"||f==="joinopen"){if(f==="sheet"){S.famsheet="mobile";S.finvNo=null}else if(f==="sheetx")S.famsheet=null;else if(f==="tabm")S.famsheet="mobile";else if(f==="tabc")S.famsheet="code";else S.famjoin=!S.famjoin;render();return}
    try{
      if(!GWL.loggedIn()&&f!=="copy"){S.view="llogin";SU.mode="login";SU.step=2;render();return}
      var oldFam=async function(fn){try{return await fn()}catch(x){if(/already in a family/i.test(x&&x.message||"")&&confirm("This number is still in a family from before (for example, from an old install). Leave that family and continue?\n\nIf you want to rejoin it instead, paste its family code under “Someone already created one?”.")){await GWL.srv("lm_family_leave",{});return await fn()}throw x}};
      if(f==="create"){fb.disabled=true;await oldFam(function(){return GWL.famCreate()});render();toast("Family created. Now invite them by mobile number.")}
      else if(f==="join"){fb.disabled=true;var code=(document.getElementById("famcode")||{}).value;var n=await oldFam(function(){return GWL.famJoin(code)});render();toast("Joined. "+n+" people in your family.")}
      else if(f==="invite"){var v=phDigits((document.getElementById("finv")||{}).value||"");if(!isMob(v)){showErr("Type a 10-digit mobile number");try{document.getElementById("finv").focus()}catch(e){}return}fb.disabled=true;var r=await GWL.invite("family",DB.family.id,v);fb.disabled=false;
        if(r.status==="already")toast("They are already in your family");else{if(r.status==="waiting"){S.finvNo={ph:v,msg:me()+" invited you to our family on Gharwise.\n\nInstall Gharwise and sign up with this mobile number ("+v+"). Your invite will be waiting for you to accept:\n"+PLAY_APP};toast("Not on Gharwise yet")}else{S.finvNo=null;toast("Invite sent. They can accept it in their app.")}
          if(r.status!=="waiting")S.famsheet=null;try{DB.family.invites=await GWL.srv("lm_family_pending",{});mark("data",true)}catch(x){}render()}}
      else if(f==="nowa"){var q=S.finvNo;if(q)window.open("https://wa.me/91"+q.ph+"?text="+encodeURIComponent(q.msg),"_blank")}
      else if(f==="noshare"){var q2=S.finvNo;if(q2){try{if(navigator.share){await navigator.share({text:q2.msg});return}}catch(x){if(x&&x.name==="AbortError")return}if(await copyText(q2.msg))toast("Invite message copied")}}
      else if(f==="nox"){S.finvNo=null;render()}
      else if(f==="copy"){if(await copyText(GWL.famCode()))toast("Code copied")}
      else if(f==="sharecode"){var P=LF(),msg="Join my Gharwise family. In the Gharwise app: Menu → Family sharing → Join, and paste this code:\n\n"+GWL.famCode();if(P)await P.shareFile({name:"gharwise-family-code.txt",text:msg,mime:"text/plain",title:"Gharwise family code"});else if(await copyText(GWL.famCode()))toast("Code copied")}
      else if(f==="sync"){fb.disabled=true;if(GWL.famInfo)await GWL.famInfo();await GWL.sync();if(GWL.groupsSync)await GWL.groupsSync(true);fb.disabled=false;render();toast(DB.family&&DB.family.off?"Family sync is paused: tap Fix it":"Up to date")}
      else if(f==="repair"){if(DB.family.off==="other"&&!confirm("Your account is in another family on the server, one this phone can’t open. Leave it and use this phone’s family?"))return;
        fb.disabled=true;var nr=await GWL.famRepair();await load(true);render();
        toast(nr.fresh?"Fixed. Your old family was gone, so a new one was started. Invite them again (the family code has changed).":"Fixed. "+nr.members+(nr.members===1?" person":" people")+" in your family.")}
      else if(f==="leave"){if(!confirm("Leave this family? Family payments are removed from this phone, and your payments are removed from the family's phones."))return;await GWL.famLeave();await load(true);render()}
    }catch(x){fb.disabled=false;showErr(x&&x.message||String(x))}}});
/* A family invite must be answered: shown on top of everything whenever one is waiting (push tapped or not), until Accept or Reject */
function avCol(n){var h=0,t=String(n||"?");for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))%360;return "hsl("+h+",55%,46%)"}
function avBig(n,sz){return '<span style="display:inline-flex;align-items:center;justify-content:center;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+avCol(n)+';color:#fff;font-weight:700;font-size:'+Math.round(sz*.46)+'px;box-shadow:0 6px 16px rgba(0,0,0,.18)">'+esc(String(n||"?").trim().charAt(0).toUpperCase())+'</span>'}
var IPOpen=false;
GWL.invitePrompt=function(){
  if(IPOpen||GWL.testing||!GWL.loggedIn||!GWL.loggedIn()||!DB||!DB.profile)return;
  var inv=(GWL.inbox?GWL.inbox():[]).filter(function(i){return i.kind==="family"})[0];if(!inv)return;
  IPOpen=true;
  var box=document.createElement("div");box.id="invprompt";
  box.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(20,10,40,.74);display:flex;align-items:center;justify-content:center;padding:24px";
  box.innerHTML='<div style="background:#fff;color:#1c1b22;border-radius:26px;padding:26px 22px;width:100%;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)"><div style="margin:0 auto 4px">'+avBig(inv.by,72)+'</div><h3 style="margin:10px 0 6px;font-size:20px">'+esc(inv.by)+' invited you to their family</h3><p style="margin:0 0 16px;font-size:14px;opacity:.7">You will see each other’s payments. They stay encrypted between your phones.</p><div style="display:flex;gap:10px"><button class="btn" data-ip="rej" style="flex:1;margin:0;background:#fde8e8;color:#b42318;box-shadow:none" aria-label="Reject"><span style="font-size:20px;font-weight:700">✕</span> Reject</button><button class="btn" data-ip="acc" style="flex:1;margin:0;background:linear-gradient(135deg,#2f9e6b,#1f7a50)" aria-label="Accept"><span style="font-size:20px;font-weight:700">✓</span> Accept</button></div></div>';
  document.body.appendChild(box);
  var busy=false;
  box.addEventListener("click",async function(e){var b=e.target.closest&&e.target.closest("[data-ip]");if(!b||busy)return;busy=true;
    var btns=box.querySelectorAll("button");btns.forEach(function(x){x.disabled=true});
    try{var yes=b.getAttribute("data-ip")==="acc";await GWL.inviteRespond(inv.id,yes);if(yes){await load(true);toast("You joined the family")}else toast("Invite rejected");
      box.remove();IPOpen=false;setTimeout(function(){GWL.invitePrompt()},300);try{render()}catch(x){}}
    catch(x){busy=false;btns.forEach(function(y){y.disabled=false});toast((x&&x.message)||"Could not answer the invite. Try again.")}});
};
document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(function(){try{GWL.groupsSync&&GWL.groupsSync(true).then(function(){GWL.invitePrompt()})}catch(e){}},600)});
setTimeout(function(){try{GWL.groupsSync&&GWL.groupsSync(true).then(function(){GWL.invitePrompt()})}catch(e){}},2500);
/* Titles keep a capital first letter on every word, also on the new screens */
if(typeof TC_SEL==="string")TC_SEL+=",.card>b:first-child,.card>label>b,.dc>b:first-child,.fx-opt b,.fx-sh>div>b,.vlt,.tcx";
/* Fixed expenses: the add form opens from one button */
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;var a=t.closest("#fadd");if(a){S.fxadd=false;return}var b=t.closest("[data-fxopen]");if(!b)return;S.fxadd=!S.fxadd;var f=document.getElementById("fxform");if(f)f.style.display=S.fxadd?"block":"none";b.textContent=S.fxadd?"✕ Close":"＋ Add Fixed Expense";if(S.fxadd){var n=document.getElementById("fn");if(n)setTimeout(function(){try{n.scrollIntoView({block:"center",behavior:"smooth"})}catch(x){}},50)}},true);
var FXCSS='<style>.fx-hero{background:linear-gradient(135deg,#7a4ae8,#4a22a0);border-radius:24px;padding:20px;color:#fff;margin:0 0 12px;box-shadow:0 10px 26px rgba(74,34,160,.28)}.fx-hero small{opacity:.85;font-size:13.5px}.fx-hero h2{margin:6px 0 0;font-size:22px;color:#fff}.fx-st{display:flex;align-items:center;gap:12px;margin:12px 0 14px}.fx-stack{display:flex}.fx-stack>span{margin-left:-12px;border-radius:50%;border:2px solid #5b2fc0;display:inline-flex;line-height:0}.fx-stack>span:first-child{margin-left:0}.fx-pill{display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.18);border-radius:20px;padding:5px 11px;font-size:12.5px;font-weight:600}.fx-dot{width:8px;height:8px;border-radius:50%;background:#7dffb4}.fx-nums{display:flex;gap:10px}.fx-nums>div{flex:1;background:rgba(255,255,255,.16);border-radius:14px;padding:10px 12px;font-size:12px;opacity:.95}.fx-nums b{display:block;font-size:18px}.fx-add{width:100%;margin:0 0 14px}.fx-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line,#e8e5df)}.fx-row:first-child{border-top:0}.fx-row .fx-n{font-weight:700;font-size:16px}.fx-row .fx-s{font-size:13px;color:var(--mute);margin-top:2px}.fx-chip{font-size:12px;font-weight:700;border-radius:20px;padding:4px 10px;white-space:nowrap}.fx-you{background:#ece6fb;color:#6b3fd4}.fx-ok{background:#e4f3ea;color:#2f7d5b}.fx-wt{background:#fdf0d8;color:#a8650b}.fx-link{border:0;background:none;color:var(--acc);font:inherit;font-weight:600;padding:0;cursor:pointer}.fx-foot{text-align:center;margin:10px 0 24px;font-size:14px;color:var(--mute)}.fx-bd{position:fixed;inset:0;background:rgba(20,18,30,.5);z-index:9000}.fx-sh{position:fixed;left:0;right:0;bottom:0;z-index:9001;background:var(--bg,#f5f3ef);border-radius:28px 28px 0 0;padding:12px 18px calc(22px + env(safe-area-inset-bottom));max-height:88vh;overflow:auto}.fx-grab{width:44px;height:5px;border-radius:3px;background:#cfccd4;margin:0 auto 12px}.fx-code{background:var(--chip);border-radius:12px;padding:12px;font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}.fx-opt{display:flex;gap:14px;align-items:center;width:100%;text-align:left;border:0;background:var(--card,#fff);border-radius:20px;padding:16px;margin-bottom:12px;font:inherit;color:inherit;box-shadow:0 2px 10px rgba(0,0,0,.04)}.fx-opt .fx-ic{flex:none;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px}</style>';
function localFam(){
  var h=topbar("Family sharing","menu"),li=GWL.loggedIn&&GWL.loggedIn();
  if(!li)h+='<div class="note out" style="margin:10px 0">You are logged out, so family sync is paused. <a href="#" data-lmenu="login" style="color:var(--acc)">Log in</a></div>';
  var finv=(GWL.inbox?GWL.inbox():[]).filter(function(i){return i.kind==="family"});
  var gd=GWL.inboxDbg;if(li&&gd&&!finv.length&&(gd.err||gd.n)){var why=gd.err?"could not check the server ("+gd.err+")":gd.fail.length?"this phone could not open it ("+gd.fail[0]+")":gd.other?"it was locked before this phone’s key was updated. We have asked their phone to lock it again: it appears here once they open Gharwise":"unknown";h+='<div class="note out" style="margin:10px 0">An invite reached the server, but '+esc(why)+'.</div>'}
  finv.forEach(function(i){h+='<div class="card" style="border:1.5px solid var(--acc)"><div style="display:flex;align-items:center;gap:10px">'+avBig(i.by,40)+'<b>'+esc(i.by)+' asked you to join their family</b></div><div class="note" style="margin:4px 0 10px">You will see each other’s payments. They stay encrypted between your phones.</div><div class="row" style="gap:8px;justify-content:flex-start;padding:0"><button class="btn s" data-fia="'+esc(i.id)+'" style="background:linear-gradient(135deg,#2f9e6b,#1f7a50)">✓ Accept</button><button class="btn ghost s out" data-fir="'+esc(i.id)+'">✕ Reject</button></div></div>'});
  h+=FXCSS;
  if(!DB.family){
    h+='<div class="card" style="text-align:center;padding:26px 18px"><div style="font-size:46px;margin-bottom:6px">👨‍👩‍👧</div><b class="tcx" style="font-size:21px">Track money together</b><div class="mute" style="font-size:14.5px;line-height:1.5;margin:8px 0 0">Add your spouse or family. Everyone sees each other’s payments. Payments are encrypted on each phone, so only your phones can read them.</div></div>'+
      '<button class="fx-opt" data-fam="create"><span class="fx-ic" style="background:#e4dcfa">👨‍👩‍👧</span><span style="flex:1"><b style="font-size:16.5px">Start a family</b><div class="mute" style="font-size:13px;margin-top:2px">Then invite them by mobile number</div></span><span style="font-size:22px;color:#a9a6b0">›</span></button>'+
      '<button class="fx-opt" data-fam="joinopen"><span class="fx-ic" style="background:#fbe8d6">🔑</span><span style="flex:1"><b style="font-size:16.5px">I have a family code</b><div class="mute" style="font-size:13px;margin-top:2px">Join a family someone already started</div></span><span style="font-size:22px;color:#a9a6b0">›</span></button>';
    if(S.famjoin)h+='<div class="card"><b>Paste the family code</b><div class="mute" style="margin:4px 0 8px">It starts with GW1-</div><textarea id="famcode" rows="3" placeholder="GW1-…" autocapitalize="off" autocomplete="off" style="width:100%;font-family:monospace;font-size:13px"></textarea><button class="btn" data-fam="join" style="margin-top:8px">Join this family</button></div>';
    return h}
  if(DB.family.members==null&&GWL.famInfo)GWL.famInfo();
  if(DB.family.off)h+='<div class="card" style="border:1.5px solid var(--out,#c0392b)"><b>⚠ Family sync is paused</b><div class="note" style="margin:4px 0 10px">'+(DB.family.off==="other"?'Your account is in a different family on the server than the one on this phone.':'Your account is not in this family on the server any more.')+' Tap Fix it to put your account back into this phone’s family. Your payments stay on this phone.</div><button class="btn s" data-fam="repair">Fix it</button></div>';
  var ppl={};T("family_txns").forEach(function(r){var k=r.member||r.person;if(!ppl[k])ppl[k]={name:r.person,n:0};ppl[k].n++});
  var pend=DB.family.invites||[];
  var mem=DB.family.mem||{},ids={};Object.keys(mem).forEach(function(k){ids[k]=mem[k].name});
  Object.keys(ppl).forEach(function(k){if(!ids[k])ids[k]=ppl[k].name});
  var tot=DB.family.members||0,shown=Object.keys(ids).length+1,unk=Math.max(0,tot-shown);
  function cnt(k){return ppl[k]?ppl[k].n:0}
  var mine=T("transactions").filter(function(t){return !t.hidden&&t.person===me()}).length,others=T("family_txns").length;
  var names=[me()].concat(Object.keys(ids).map(function(k){return ids[k]})),people=tot||names.length;
  var title=names.length<2?"Your family":names.length===2?names[0]+" & "+names[1]:names[0]+", "+names[1]+" +"+(names.length-2);
  function av(n){return '<span style="flex:none;display:inline-flex">'+(n&&n!=="?"?famAv(n,44):avBig("?",44))+'</span>'}
  h+='<div class="fx-hero"><small>Your family</small><h2>'+esc(title)+'</h2><div class="fx-st"><div class="fx-stack">'+names.slice(0,4).map(function(n){return '<span>'+famAv(n,46)+'</span>'}).join('')+'</div><span class="fx-pill"><span class="fx-dot"></span>'+(GWL.lastSync?'Synced '+esc(ago(new Date(GWL.lastSync).toISOString())):'Syncs when you are online')+'</span></div><div class="fx-nums"><div><b>'+people+'</b>'+(people===1?'person':'people')+'</div><div><b>'+(mine+others)+'</b>shared payments</div></div></div>'+
    '<button class="btn fx-add" data-fam="sheet">＋ Add family member</button>'+
    '<div class="sec">People in your family</div><div class="card" style="padding:6px 16px">'+
    '<div class="fx-row">'+av(me())+'<div style="flex:1"><div class="fx-n">'+esc(me())+'</div><div class="fx-s">'+mine+' payments</div></div><span class="fx-chip fx-you">You</span></div>'+
    Object.keys(ids).map(function(k){return '<div class="fx-row">'+av(ids[k])+'<div style="flex:1"><div class="fx-n">'+esc(ids[k])+'</div><div class="fx-s">'+cnt(k)+' payments</div></div><span class="fx-chip fx-ok">Joined</span></div>'}).join('')+
    (unk?'<div class="fx-row">'+av("?")+'<div style="flex:1"><div class="fx-n">'+(unk===1?'Another member':unk+' other members')+'</div><div class="fx-s">Their name shows once they open the updated app</div></div><span class="fx-chip fx-ok">Joined</span></div>':'')+
    pend.map(function(x){return '<div class="fx-row"><span style="flex:none;width:44px;height:44px;border-radius:50%;background:#d6d3cc;display:inline-flex;align-items:center;justify-content:center;font-size:20px;color:#7a7882">＋</span><div style="flex:1"><div class="fx-n">+'+esc(String(x.phone).replace(/^91/,"91 "))+'</div><div class="fx-s">Invite sent · <button class="fx-link" data-fcx="'+esc(x.id)+'">Cancel</button></div></div><span class="fx-chip fx-wt">Waiting</span></div>'}).join('')+'</div>'+
    '<div class="fx-foot"><button class="fx-link" data-fam="sync">Sync now</button> &nbsp;·&nbsp; <button class="fx-link" data-fam="leave" style="color:var(--out,#c0392b)">Leave family</button></div>';
  if(S.famsheet){var tab=S.famsheet==="code"?"code":"mobile";
    h+='<div class="fx-bd" data-fam="sheetx"></div><div class="fx-sh"><div class="fx-grab"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:21px">Add family member</b><button class="fx-link" data-fam="sheetx" aria-label="Close" style="font-size:22px;color:#8a8792">✕</button></div>'+
      '<div class="seg2" style="margin-bottom:14px"><button data-fam="tabm"'+(tab==="mobile"?' class="on"':'')+'>Mobile number</button><button data-fam="tabc"'+(tab==="code"?' class="on"':'')+'>Family code</button></div>';
    if(tab==="mobile")h+='<div class="mute" style="margin:0 0 10px;line-height:1.45">They get an invite in their Gharwise app and can accept or reject it. Only their phone can open it.</div><label class="mobw"><span class="mcc">+91</span><input id="finv" type="tel" inputmode="numeric" maxlength="14" placeholder="Mobile number" autocomplete="off"></label><button class="btn" data-fam="invite" style="margin-top:12px">Send invite</button>'+(S.finvNo?'<div class="card" style="background:#fdf0d8;box-shadow:none;border:1px solid #f1deb4;margin:14px 0 0"><b style="color:#7a4d0a">+91 '+esc(S.finvNo.ph)+' isn’t on Gharwise yet</b><div style="font-size:13.5px;color:#7a4d0a;margin:4px 0 12px;line-height:1.45">Your invite is saved. Ask them to install Gharwise and sign up with this number. They will then see it to accept.</div><button class="btn" data-fam="nowa" style="background:#25a05a;box-shadow:none">Invite on WhatsApp</button><button class="btn ghost s" data-fam="noshare" style="margin-top:8px">Share another way</button></div>':'');
    else h+='<div class="mute" style="margin:0 0 10px;line-height:1.45">Send this code to a family member. It holds your family key, so share it <b>only with family</b>.</div><div class="fx-code">'+esc(GWL.famCode())+'</div><div class="row" style="gap:8px;padding:0;margin-top:12px"><button class="btn ghost" data-fam="copy" style="flex:1">Copy</button><button class="btn" data-fam="sharecode" style="flex:1">Share code</button></div>';
    h+='</div>'}
  return h}
var MS={months:1,st:null,busy:false};
function localMail(){
  var h=topbar("Email tracking","track"),m=DB.mail&&DB.mail.on,li=GWL.loggedIn&&GWL.loggedIn();
  if(!li)return h+'<div class="card"><b>Log in first</b><div class="note" style="margin:6px 0 10px">Email tracking needs your login.</div><button class="btn" data-lmenu="login">Log in</button></div>';
  if(!m)return h+'<div class="dc"><div style="text-align:center"><span style="font-size:42px">✉️</span><h3 style="margin:6px 0 4px">Track spends from bank emails</h3></div><div class="card" style="background:var(--chip);box-shadow:none;font-size:14px;line-height:1.55;margin:10px 0"><ul style="margin:0;padding-left:18px"><li>A small script runs in <b>your own Gmail</b>. It only looks at bank alert emails.</li><li>It <b>encrypts</b> each email there, with a key only this phone has.</li><li>Our server holds the scrambled text until this phone collects it, then deletes it.</li></ul></div><div class="mute" style="margin:0 0 6px">Also read past emails?</div><select id="mmo2">'+[0,1,3,6].map(function(x){return '<option value="'+x+'"'+(MS.months===x?' selected':'')+'>'+(x===0?'Only new emails':'Past '+(x===1?'1 month':x+' months'))+'</option>'}).join('')+'</select><button class="btn" data-mail="on" style="margin-top:10px">Make my Gmail script</button></div>';
  if(!MS.st&&!MS.busy){MS.busy=true;GWL.mailStatus().then(function(r){MS.st=r||{};MS.busy=false;if(S.tab==="mail")render()})}
  var st=MS.st||{},ok=st.last_run&&(Date.now()-new Date(st.last_run).getTime())<30*60000;
  if(ok&&DB.mail&&!DB.mail.verified){DB.mail.verified=true;mark("data",true)}
  var status='<div class="dc"><div class="row" style="padding:0"><b>'+(st.last_run?(ok?'✓ Connected':'⚠ Stopped'):'Waiting for your Gmail script')+'</b><span class="mute">'+(st.last_run?'checked '+ago(st.last_run):'')+'</span></div><div class="note" style="margin:6px 0 0">'+(st.count?st.count+' encrypted emails received':'No emails yet')+(st.waiting?' · '+st.waiting+' waiting for this phone':'')+'.</div><button class="btn ghost s" data-mail="pull" style="margin-top:10px">Check now</button></div>';
  var off='<button class="btn ghost" data-mail="off" style="margin:6px 0 20px">Turn off email tracking</button>';
  if(ok&&!MS.steps)return h+status+'<button class="btn ghost" data-mail="restep" style="margin-top:8px">Show set-up steps</button>'+off;
  return h+mailStepper(st,ok)+off}
/* the Gmail set-up, one short step per screen */
function mailStepper(st,ok){var n=Math.max(0,Math.min(3,MS.step||0)),chips=function(a){return '<div class="mchips">'+a.map(function(x,i){return (i?'<i>›</i>':'')+'<span>'+x+'</span>'}).join('')+'</div>'},
  names=["Copy your script","Paste in Google Script","Run and allow","Check"],body;
  if(n===0)body='<div class="mic">📋</div><h3 class="mh">Copy your script</h3><div class="mute">It has your personal key. Don’t share it.</div><button class="btn" data-mail="copy" style="margin-top:20px">Copy script</button><button class="btn ghost" data-mail="sharescript" style="margin-top:10px">Share with another device…</button>';
  else if(n===1)body='<div class="mic">📝</div><h3 class="mh">Paste it in Google Script</h3><div class="mute">Sign in with the Gmail that gets your bank alerts.</div><a class="btn" href="https://script.google.com/home" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:20px">Open Google Apps Script</a>'+gChips("mail1",[["New project","gs_new","Tap New project"],["Remove existing script","gs_remove","Delete the placeholder code first"],["Paste the copied script","gs_paste","Paste your script here"],["Name it Gharwise","gs_name","Tap the title, type Gharwise"],["Save","gs_save","Tap the save icon"]])+'<div class="note" style="margin-top:12px">On a phone, use Chrome → ⋮ → Desktop site.</div>';
  else if(n===2)body='<div class="mic">▶️</div><h3 class="mh">Run it once</h3><div class="mute">Google asks for permission. It’s your own script, so the warning is normal.</div>'+'<a class="btn" href="https://script.google.com/home" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:18px">Open Google Script</a><div class="note" style="margin-top:10px">Open your Gharwise script, then press the <b>▶ Run</b> button.</div>'+gChips("mail2",[["Choose setup","gs_setup","In the box next to Debug, pick setup"],["▶ Run","gs_run","Tap Run"],["Review permissions","gs_review","Tap Review permissions"],["Advanced","gs_adv","Tap Advanced"],["Go to Gharwise (unsafe)","gs_go","Tap Go to Gharwise (unsafe)"],["Allow","gs_allow","Tick all, scroll down, tap Allow"]]);
  else body='<div class="mic">✅</div><h3 class="mh">Check the connection</h3><div class="mute">The log in Google should end with “Connected”.</div><button class="btn" data-mail="pull" style="margin-top:20px">Check now</button><div style="margin-top:16px;font-weight:700;color:'+(ok?'var(--in,#2f7d5b)':'var(--mute,#7a7882)')+'">'+(st.last_run?(ok?'✓ Connected · checked '+ago(st.last_run):'⚠ Stopped · last check '+ago(st.last_run)):'Waiting for your Gmail script')+'</div>';
  return '<div class="mprog">'+[0,1,2,3].map(function(i){return '<button data-mstep="'+i+'" aria-label="Step '+(i+1)+'"'+(i<=n?' class="on"':'')+'></button>'}).join('')+'</div>'+
    '<div class="mlab"><b>Step '+(n+1)+' of 4</b><span class="mute">'+names[n]+'</span></div><div class="card" style="padding:22px 20px">'+body+'</div>'+
    '<div class="mnav"><button class="btn ghost" data-mstep="prev"'+(n?'':' disabled style="opacity:.4"')+'>‹ Back</button><button class="btn p" data-mstep="next">'+(n===3?'Done':'Next ›')+'</button></div>'}
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-mstep]");if(!b)return;var k=b.getAttribute("data-mstep"),n=MS.step||0;
  if(k==="prev")MS.step=Math.max(0,n-1);
  else if(k==="next"){if(n>=3){MS.steps=false;MS.step=0;MS.done=true;go("track");return}else MS.step=n+1}
  else MS.step=+k;
  GCH.mail1=0;GCH.mail2=0;render();window.scrollTo(0,0)});
(function(){var st=document.createElement("style");st.textContent=".mprog{display:flex;gap:6px;margin:12px 0 0}.mprog button{flex:1;height:8px;border-radius:4px;background:rgba(120,120,130,.25);border:0;padding:0}.mprog button.on{background:var(--acc)}.mlab{display:flex;justify-content:space-between;align-items:baseline;margin:10px 2px 0}.mlab b{color:var(--acc);font-size:15px}.mic{width:54px;height:54px;border-radius:16px;background:var(--chip);display:flex;align-items:center;justify-content:center;font-size:28px}.mh{font-size:22px;margin:14px 0 6px}.mchips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.mchips span{background:var(--chip);border-radius:999px;padding:8px 12px;font-size:14px;font-weight:600}.mchips i{font-style:normal;color:var(--mute,#8a8794);align-self:center}.mnav{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:10px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(rgba(0,0,0,0),var(--bg) 35%)}.mnav .btn{flex:1;margin:0}.mnav .p{flex:2}.gchips{display:flex;flex-wrap:wrap;gap:6px 4px;align-items:center;margin-top:14px}.gchips i{font-style:normal;color:var(--mute,#8a8794)}.gchips .gc{background:var(--chip);color:inherit;border:2px solid transparent;border-radius:999px;padding:7px 12px;font:inherit;font-size:14px;font-weight:600}.gchips button.gc{cursor:pointer}.gchips .gc.sel{background:var(--acc);color:#fff}.gpic{margin-top:12px;border-radius:14px;overflow:hidden;position:relative;background:#000;line-height:0}.gpic img{width:100%;display:block}.gring{position:absolute;width:44px;height:44px;border-radius:50%;border:3px solid #ffd43b;box-shadow:0 0 0 6px rgba(255,212,59,.3);transform:translate(-50%,-50%);pointer-events:none}.ghand{position:absolute;font-size:34px;line-height:1;transform:translate(-30%,-8%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));pointer-events:none}.gcap{font-size:13px;font-weight:600;margin-top:8px}#impd::-webkit-date-and-time-value{text-align:center;height:46px;line-height:46px;margin:0}#impd::-webkit-datetime-edit{line-height:46px;padding:0}.gtab{width:100%;border-collapse:collapse;font-size:14px}.gtab th{text-align:left;color:var(--mute,#7a7882);font-weight:600;padding:6px 8px 6px 0;border-bottom:1px solid var(--line,#e4e2da)}.gtab td{padding:8px 8px 8px 0;border-bottom:1px solid var(--line,#e4e2da);vertical-align:top}.gtab td:first-child{font-weight:600}.vchat{margin-top:14px}.vr{display:flex;flex-direction:column;margin:8px 0}.vr.me{align-items:flex-end}.vr.si{align-items:flex-start}.vw{font-size:11px;opacity:.6;margin:0 6px 2px}.vm{max-width:85%;padding:9px 13px;border-radius:16px;font-size:14px}.me .vm{background:var(--acc);color:#fff;border-bottom-right-radius:4px}.si .vm{background:var(--soft,#eee);border-bottom-left-radius:4px}.si .vm.vok{background:#e3f6e8;color:#14612c;font-weight:700}.vboth{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.vboth span{font-size:12px;padding:4px 10px;border-radius:99px;background:var(--soft,#eee)}.vtbl{width:100%;border-collapse:collapse;font-size:13px}.vtbl th{text-align:left;font-size:12px;opacity:.65;padding:6px 8px;border-bottom:1px solid var(--line,#ddd)}.vtbl td{padding:9px 8px;border-bottom:1px solid var(--line,#eee);vertical-align:top}.vsv{display:inline-block;background:var(--soft,#eee);border-radius:99px;padding:1px 8px;font-size:12px;font-weight:700;margin-right:4px}.gok{border:2px solid #2f9e6b;border-radius:16px;padding:12px 14px;margin-top:14px;font-weight:700}";document.head.appendChild(st)})();
document.addEventListener("change",function(e){if(e.target&&e.target.id==="mmo2")MS.months=+e.target.value});
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("[data-limp]");if(!a)return;e.preventDefault();go("track");S.trkTab="sms";render();window.scrollTo(0,0);try{quiet(loadSc())}catch(x){}});
document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-lsmsperm]");if(!b)return;b.disabled=true;
  try{var P=smsPlugin();await P.requestPermissions({permissions:["sms"]});S.nsms=await P.status()}catch(x){showErr("SMS access was not allowed. Allow it in Android Settings → Apps → Gharwise Local → Permissions.")}render()});
document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-mail]");if(!b)return;var a=b.getAttribute("data-mail");
  try{
    if(a==="on"){b.disabled=true;await GWL.mailEnable(MS.months);MS.st=null;render();if(await copyText(GWL.mailScript()))toast("Script copied. Paste it in Google Script.")}
    else if(a==="copy"){if(await copyText(GWL.mailScript()))toast("Script copied")}
    else if(a==="sharescript"){var P=LF();if(P)await P.shareFile({name:"gharwise-gmail-script.txt",text:GWL.mailScript(),mime:"text/plain",title:"My Gharwise Gmail script"});else if(await copyText(GWL.mailScript()))toast("Script copied")}
    else if(a==="restep"){MS.steps=true;MS.step=0;render();window.scrollTo(0,0)}
    else if(a==="pull"){b.disabled=true;var n=await GWL.mailPull();MS.st=null;b.disabled=false;render();if(!n)toast("No new bank emails")}
    else if(a==="off"){if(!confirm("Turn off email tracking? Then delete the project in script.google.com too."))return;await GWL.mailOff();MS.st=null;render()}
  }catch(x){b.disabled=false;showErr(x&&x.message||String(x))}});
GWL.newId=uid;GWL.db=function(){return DB};GWL.swapDb=function(d){var o=DB;DB=d;return o};GWL.blankDb=blank;GWL.files={write:fwrite,writeB64:fwriteB64,read:fread,del:fdelete};GWL.prep=prep;GWL.FILES=FILES;GWL.T=T;GWL.flush=flush;
/* guide steps: short steps with a progress bar, chips joined by ›, and a small picture under the chips (tap a chip to see where to tap) */
var GST={},GCH={},GBACK={voice:"set",sms:"track"};
var GPOS={"settings":[62.3,49.9],"access":[30.3,49.9],"touch":[24.3,49.9],"backtap":[17,49.9],"double":[19.1,49.9],"voice_pick":[30.2,50],"lib":[50,68.5],"newauto":[50,49.9],"message":[27.1,49.9],"contains":[84.5,49.9],"runimm":[24.2,49.9],"next":[87.1,49.9],"pick":[67,49.9],"gs_setup":[73.7,61.7],"gs_new":[13.0,49.9],"gs_remove":[59.4,49.9],"gs_paste":[52.6,49.9],"gs_name":[42.0,46.9],"gs_save":[56.0,49.9],"gs_run":[65.3,49.9],"gs_review":[76.0,74.0],"gs_adv":[13.4,49.9],"gs_go":[24.1,49.9],"gs_allow":[9.2,49.9]};
/* list: [label, picture|"" , caption] ; a chip without a picture is plain text */
function gChips(key,list){var cur=GCH[key]||0;if(!list[cur]||!list[cur][1])cur=0;
  var h='<div class="gchips">'+list.map(function(c,i){return (i?'<i>›</i>':'')+(c[1]?'<button class="gc'+(i===cur?' sel':'')+'" data-gchip="'+key+'|'+i+'">'+c[0]+'</button>':'<span class="gc">'+c[0]+'</span>')}).join('')+'</div>',c=list[cur];
  if(c&&c[1]){var p=GPOS[c[1]]||[50,50];h+='<div class="gpic"><img src="guide/'+c[1]+'.jpg" alt=""><div class="gring" style="left:'+p[0]+'%;top:'+p[1]+'%"></div><div class="ghand" style="left:'+p[0]+'%;top:'+p[1]+'%">👆</div></div><div class="gcap">'+c[2]+'</div>'}
  return h}
function gSteps(key,names,bodies,lastLabel){var n=Math.max(0,Math.min(names.length-1,GST[key]||0)),last=n===names.length-1;
  return '<div class="mprog">'+names.map(function(_,i){return '<button data-gstep="'+key+'|'+i+'" aria-label="Step '+(i+1)+'"'+(i<=n?' class="on"':'')+'></button>'}).join('')+'</div>'+
    '<div class="mlab"><b>Step '+(n+1)+' of '+names.length+'</b><span class="mute">'+names[n]+'</span></div><div class="card" style="padding:20px 18px">'+bodies[n]+'</div>'+
    '<div class="mnav"><button class="btn ghost" data-gstep="'+key+'|prev"'+(n?'':' disabled style="opacity:.4"')+'>‹ Back</button><button class="btn p" data-gstep="'+key+'|next">'+(last?(lastLabel||"Done"):"Next ›")+'</button></div>'}
function gHead(ic,t,sub){return '<div class="mic">'+ic+'</div><h3 class="mh">'+t+'</h3>'+(sub?'<div class="mute">'+sub+'</div>':'')}
document.addEventListener("click",function(e){var c=e.target&&e.target.closest&&e.target.closest("[data-gchip]");if(c){var a=c.getAttribute("data-gchip").split("|");GCH[a[0]]=+a[1];render();return}
  var b=e.target&&e.target.closest&&e.target.closest("[data-gstep]");if(!b)return;var q=b.getAttribute("data-gstep").split("|"),key=q[0],k=q[1],n=GST[key]||0,len=(window.GSTLEN&&GSTLEN[key])||4;
  if(k==="prev")GST[key]=Math.max(0,n-1);
  else if(k==="next"){if(n>=len-1){try{if(key==="voice")ls("gs_voice","1");if(key==="sms")ls("gs_sms","1")}catch(x){}GST[key]=0;GCH[key]=0;go(GBACK[key]||"menu");return}GST[key]=n+1;GCH[key]=0}
  else{GST[key]=+k;GCH[key]=0}
  render();window.scrollTo(0,0)});
/* when voice is already on, "Show usage guide" opens the usage guide (step 5) */
document.addEventListener("click",function(e){var g=e.target&&e.target.closest&&e.target.closest('[data-go="voice"]');if(!g)return;var on=false;try{on=!!JSON.parse(ls("gwvlast")||"null")}catch(x){}GST.voice=on?4:0;GCH.voice1=0;GCH.voice2=0},true);
/* ===== iPhone (on-phone version for iOS) =====
   iPhone apps can't read SMS. Bank SMS come in through the person's own Shortcuts automation, which runs the app's
   "Add SMS to Gharwise" action. That action keeps the SMS on this iPhone (no server); the app collects them (drain). */
GWL.ios=function(){try{return !!(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==="ios"&&Capacitor.isNativePlatform())}catch(e){return false}};
(function(){var _h=GWL.hook;GWL.hook=function(){_h.apply(this,arguments);if(!GWL.ios())return;
  async function smsStatus(){try{var P=smsPlugin();S.nsms=P&&P.status?await P.status():null}catch(e){S.nsms=null}}
  smsStatus();setTimeout(function(){try{if(DB&&DB.profile&&Capacitor.Plugins.GharwiseNative)Capacitor.Plugins.GharwiseNative.setWidget({lang:(typeof LANG!=="undefined"?LANG:"en")})}catch(e){}},3000);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(function(){smsStatus().then(function(){if(S.tab==="sms"||S.tab==="track"||S.tab==="home")render()})},900)});
  var _dr=GWL.drain;GWL.drain=async function(){await _dr();await smsStatus()};
  /* Widget mic: the app opens on a Listening screen, hears the expense and saves it */
  (function(){var st=document.createElement("style");st.textContent="#vlisten{position:fixed;inset:0;z-index:99999;background:rgba(20,10,40,.72);display:flex;align-items:center;justify-content:center;padding:24px}.vlbox{background:#fff;color:#1c1b22;border-radius:28px;padding:28px 22px;width:100%;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}.vlmic{width:84px;height:84px;margin:0 auto 14px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4c1d95);display:flex;align-items:center;justify-content:center;font-size:38px;animation:vlp 1.3s ease-in-out infinite}@keyframes vlp{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.5)}50%{box-shadow:0 0 0 18px rgba(124,58,237,0)}}.vlt{font-size:20px;font-weight:800}.vls{font-size:14px;opacity:.65;margin-top:4px}.vlp{min-height:44px;margin:14px 0;font-size:17px;font-weight:600;color:#4c1d95}.vlbox .btn{margin-top:8px;width:100%}";document.head.appendChild(st)})();
  (function(){var st=document.createElement("style");st.textContent=".vlw{display:flex;gap:5px;justify-content:center;align-items:center;height:40px;margin:8px 0}.vlw i{width:5px;height:10px;border-radius:3px;background:#8a5cf0;animation:vlwv 1s ease-in-out infinite}.vlw i:nth-child(2n){animation-delay:.15s}.vlw i:nth-child(3n){animation-delay:.3s}.vlw i:nth-child(5n){animation-delay:.45s}@keyframes vlwv{0%,100%{height:10px}50%{height:34px}}.vlp:not(:empty){background:#f5f3ef;border-radius:14px;padding:12px;font-weight:700;font-size:20px;margin:6px 0 10px}.vlh{font-size:13px;color:#7a7882;margin:4px 0 14px}";document.head.appendChild(st)})();
  var VLOpen=false;
  function startListen(){var N=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.GharwiseNative;if(!N||!N.listen||VLOpen)return;
    if(!(DB&&DB.profile)){toast("Open Gharwise and log in first");return}
    VLOpen=true;var cancelled=false,box=document.createElement("div");box.id="vlisten";
    box.innerHTML='<div class="vlbox"><div class="vlmic">🎤</div><div class="vlt">Listening…</div><div class="vls">Say the amount and what it was for, like “Grocery 120”</div><div class="vlw"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="vlp"></div><div class="vlh">Try “Petrol 500” or “Salary 45000”</div><button class="btn" data-vl="stop">Done</button><button class="btn ghost" data-vl="cancel">Cancel</button></div>';
    document.body.appendChild(box);
    var q=function(c){return box.querySelector(c)},sub=null;
    try{N.addListener("partial",function(e){var p=q(".vlp");if(p)p.textContent=e&&e.text?"“"+e.text+"”":""}).then(function(h){sub=h})}catch(x){}
    function close(){try{if(sub&&sub.remove)sub.remove()}catch(x){}VLOpen=false;if(box.parentNode)box.parentNode.removeChild(box);try{render()}catch(x){}}
    function say(t,sub2,again){q(".vlt").textContent=t;q(".vls").textContent=sub2||"";q(".vlp").textContent="";q(".vlmic").style.animation="none";try{q(".vlw").style.display="none";q(".vlh").style.display="none"}catch(x){}q(".vlbox").querySelectorAll("button").forEach(function(b){b.remove()});
      var b=document.createElement("button");b.className="btn";b.textContent=again?"Try again":"Close";b.onclick=function(){if(again){close();setTimeout(startListen,200)}else close()};q(".vlbox").appendChild(b)}
    box.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-vl]");if(!b)return;if(b.getAttribute("data-vl")==="cancel"){cancelled=true;try{N.stopListening()}catch(x){}close()}else{try{N.stopListening()}catch(x){}}});
    N.listen().then(function(r){if(cancelled)return;r=r||{};
      if(r.error==="speech"||r.error==="mic"){say("Allow the microphone","iPhone Settings › Gharwise › turn on Microphone and Speech Recognition",false);return}
      if(r.error){say("Can’t listen right now","Try again in a moment.",true);return}
      if(!r.text){say("Didn’t catch that","Say it like “Grocery 120”.",true);return}
      q(".vlt").textContent="Saving…";
      return N.saveVoice({text:r.text}).then(function(m){m=m||{};
        if(m.error){say("Open Gharwise and log in first","",false);return}
        return Promise.resolve(GWL.drain()).then(function(){var last=null;try{last=JSON.parse(ls("gwvlast")||"null")}catch(x){}
          if(/^(saved|सेव)/i.test(m.message||"")){try{ls("gwwc",String(Number(ls("gwwc")||0)+1))}catch(x){}var ok=last&&last.a?("✓ Saved · "+(last.m||"")+" "+(last.ty==="in"?"+":"")+"₹"+Number(last.a).toLocaleString("en-IN")):"✓ Saved";say(ok,"“"+r.text+"”",false);setTimeout(function(){if(VLOpen)close()},2200)}
          else say(m.message||"Didn’t save","“"+r.text+"”",true)})})
    }).catch(function(){if(!cancelled)say("Can’t listen right now","Try again in a moment.",true)})}
  window.gwStartListen=startListen;
  function voicePending(){try{var N=Capacitor.Plugins.GharwiseNative;if(N&&N.pendingVoice)N.pendingVoice().then(function(r){if(r&&r.open)startListen()})}catch(e){}}
  try{Capacitor.Plugins.GharwiseNative.addListener("openVoice",function(){setTimeout(voicePending,200)})}catch(e){}
  setTimeout(voicePending,1800);document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(voicePending,400)});

  /* first launch: no folder to pick on iPhone */
  var _sv=setupView;setupView=function(){var h=_sv.apply(this,arguments);
    return h.replace('<h3 style="margin:0 0 8px">Pick a folder for your data</h3>','<h3 style="margin:0 0 8px">Where your data is kept</h3>')
      .replace(/Tracking and adding payments start after this\. Pick or create a folder such as <b>Documents › Gharwise<\/b>\. Keep it: if you change phones, copy it across and pick it again\./,'Everything stays on this iPhone, in <b>Files › On My iPhone › Gharwise</b>, and is included in your iPhone backup (iCloud or computer). If you change phones, restore your backup or copy that folder across.')
      .replace('>Choose folder<','>Use this iPhone<').replace(/<button class="btn ghost" data-l="pick" style="margin-top:8px">Choose a different folder<\/button>/g,'')};
  /* SMS tracking page: the Shortcuts automation */
  var smsSteps=function(){var st=S.nsms||{},n=st.count||0;
    var live='<p>Apple lets only you switch on message automations. It takes about a minute:</p><ol>'+
      '<li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>New Automation</b> (or <b>+</b>) → <b>Message</b>.</li>'+
      '<li><b>Message Contains</b>: type <b>Rs</b>. Choose <b>Run Immediately → Next</b>.</li>'+
      '<li><b>New Blank Automation</b> → <b>Add Action</b> → search <b>Gharwise</b> → <b>Add SMS to Gharwise</b>.</li>'+
      '<li>Tap <b>Message</b> in the action and pick <b>Shortcut Input</b>. Tap <b>Done</b>.</li>'+
      '<li>Do it once more with <b>INR</b> instead of Rs, for banks that write INR.</li></ol>'+
      '<a class="btn ghost" style="display:block;text-align:center;text-decoration:none" href="shortcuts://">Open Shortcuts</a>'+
      '<p class="note">The SMS stays on this iPhone. Gharwise adds it as a payment the next time you open the app.</p>';
    var past='<p>Open the <b>Import SMS</b> tab to add older bank SMS.</p>';
    var done='<p>'+(n?'✅ <b>'+n+' bank SMS</b> have come in through the automation'+(st.last?', the last one '+esc(ago(new Date(st.last).toISOString())):'')+'.':'Waiting for the first bank SMS. Send yourself a test like “Rs 10 debited from a/c XX1234” from another phone, or wait for a real one.')+'</p>'+
      (st.waiting?'<p class="note">'+st.waiting+' waiting to be added.</p>':'')+'<button class="btn" data-lios="drain">Add waiting SMS now</button>';
    return [['Turn on live SMS',live],['Add older SMS (optional)',past],['Check it works',done]]};
  /* SMS tracking (iPhone): 4 short steps; the chips are tappable and show where to tap */
  window.GSTLEN={voice:5,sms:4};
  var playBtn=function(name,m){return '<a class="btn ghost" href="shortcuts://run-shortcut?name='+encodeURIComponent(name)+'" style="display:block;text-align:center;text-decoration:none;margin-top:'+(m||12)+'px">▶ Play shortcut</a><div class="note" style="margin-top:8px">Added it? Tap ▶ once and tap <b>Allow</b> when asked.</div>'};

  vSms=function(){var st=S.nsms||{},n=st.count||0,added=scAdded();
    var openSc='<a class="btn ghost" href="shortcuts://" style="display:block;text-align:center;text-decoration:none;margin-top:14px">Open Shortcuts</a>';
    var b0=gHead("💬","Add the bank SMS shortcut","One tap, then Add Shortcut.")+(added?'<div class="gok">✅ Shortcut added</div><a href="#" data-scx class="note" style="color:var(--acc);display:block;margin-top:10px">Add again</a>':scBtn("Add shortcut").replace('style="','style="margin-top:18px;'));
    var bR=gHead("▶️","Run it once","Allow when asked.")+playBtn("Gharwise SMS",18)+gChips("sms0",[["Tap ▶","",""],["Allow","",""]]);
    var b1=gHead("⚙️","Make the automation","Starts by itself when a bank SMS arrives.")+openSc+gChips("sms1",[["Automation","lib","Open the Automation tab"],["New Automation","newauto","Tap New Automation"],["Message","message","Tap Message"],["Message Contains","contains","Tap Choose, press the space bar once, then tap Done"],["Run Immediately","runimm","Pick Run Immediately"],["Next","next","Tap Next"],["Gharwise SMS","pick","Pick the Gharwise SMS shortcut"]]);
    var b2=n?gHead("✅","Live tracking is on",n+" bank SMS saved"+(st.last?" · last "+esc(ago(new Date(st.last).toISOString())):""))+'<button class="btn ghost" data-limp style="margin-top:16px">Import older SMS</button>'
      :gHead("🧪","Check it works","Send yourself “Rs 10 debited from a/c XX1234” from another phone, then open Gharwise.")+'<div class="note" style="margin-top:14px;font-weight:700">Waiting for the first bank SMS…</div>';
    return topbar("SMS tracking","track")+gSteps("sms",["Add the shortcut","Run it once","Make the automation","Check it works"],[b0,bR,b1,b2])};
  /* Voice expense (iPhone): 4 short steps. "Voice is on" once a real voice expense has come in. */
  var VOICE_LINK="https://www.icloud.com/shortcuts/13d1373c661a4dc5a39b553d9218bc0f";
  window.vVoice=function(){var vOK=ls("gwvsc")==="1",last=null;try{last=JSON.parse(ls("gwvlast")||"null")}catch(x){}
    var b0=gHead("🎤","Add the voice shortcut","One tap, then Add Shortcut.")+(vOK?'<div class="gok">✅ Voice shortcut added</div><a href="#" data-vcx class="note" style="color:var(--acc);display:block;margin-top:10px">Add again</a>':'<a class="btn" data-vca href="'+esc(VOICE_LINK)+'" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:18px">Add voice shortcut</a>');
    var b1=gHead("▶️","Run it once","Allow when asked. Then say “Grocery 120”.")+playBtn("Gharwise Voice",18)+gChips("voice1",[["Tap ▶","",""],["Allow","",""],["Say “Grocery 120”","",""]]);
    var b2=gHead("👆","Double-tap the back","Optional. Start voice without opening anything.")+gChips("voice2",[["Settings","settings","Open Settings"],["Accessibility","access","Tap Accessibility"],["Touch","touch","Tap Touch"],["Back Tap","backtap","Scroll down, tap Back Tap"],["Double Tap","double","Tap Double Tap"],["Gharwise Voice","voice_pick","Pick Gharwise Voice"]])+'<button class="btn ghost" data-gstep="voice|next" style="margin-top:14px">Skip this step</button>';
    var rows=[["Grocery 150","Groceries","₹150"],["Auto 80","Transport","₹80"],["Spent 100 rupees for petrol","Fuel","₹100"],["Paid 250 for lunch","Food","₹250"],["Five hundred for petrol","Fuel","₹500"],["Twenty five thousand for rent","House Rent","₹25,000"],["Received 1000 from Amma","Income","+₹1,000 · Amma"],["Got 2k from Manohar","Income","+₹2,000 · Manohar"],["Received one lakh from office","Income","+₹1,00,000 · Office"]];
    var tab='<table class="vtbl"><thead><tr><th>You say</th><th>Saved as</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>“'+esc(r[0])+'”</td><td><span class="vsv">'+esc(r[1])+'</span> '+esc(r[2])+'</td></tr>'}).join("")+'</tbody></table>';
    var lastTxt=last?((last.m&&last.a?esc(last.m)+" "+(last.ty==="in"?"+":"")+"₹"+Number(last.a).toLocaleString("en-IN"):esc(last.t))+" · "+esc(ago(new Date(last.ms).toISOString()))):"";
    var b3=gHead("🗣️","Ask Siri","Hands-free, even from the lock screen.")+'<div class="vchat"><div class="vr me"><div class="vw">You</div><div class="vm">“Hey Siri, add expense in Gharwise”</div></div><div class="vr si"><div class="vw">Siri</div><div class="vm">What did you spend?</div></div><div class="vr me"><div class="vw">You</div><div class="vm">“Grocery 150”</div></div><div class="vr si"><div class="vw">Siri</div><div class="vm vok">✓ Saved · Groceries ₹150</div></div></div><div class="note" style="margin-top:12px">Say the amount with the item. It shows in Gharwise when you open it.</div>';
    var b4=(last?'<div class="gok" style="margin:0 0 14px">✅ Voice is on · '+lastTxt+'</div>':'<div class="note" style="margin:0 0 14px;font-weight:700">Waiting for your first voice expense…</div>')+'<h3 class="mh" style="margin:0 0 6px">Voice usage guide</h3><div class="vboth"><span>🗣️ Siri</span><span>👆 Back Tap</span><span>same words for both</span></div>'+tab+'<div class="note" style="margin-top:12px">Numbers can be words too: “one thousand”, “2k”, “one lakh”.</div>';
    return topbar("Voice expense","set")+gSteps("voice",["Add the shortcut","Run it once","Double-tap the back","Ask Siri","Usage guide"],[b0,b1,b2,b3,b4])};
  /* the new "Gharwise SMS" shortcut (iCloud link). In Shortcuts it must be named exactly "Gharwise SMS": the app opens it by that name. A new flag, so it is added again once. */
  SMS_SHORTCUT_LINK="https://www.icloud.com/shortcuts/ac4190c19e4441869b3b1f924ce8f905";SMS_IMPORT_LINK=SMS_SHORTCUT_LINK;
  scAdded=function(){return ls("gwsc2")==="1"};scMark=function(v){ls("gwsc2",v?"1":"")};
  /* Import SMS (iPhone): add the shortcut first (button on the Live Tracking tab), then pick a start date in the last 3 months. */
  vImportSms=function(){var h='<h2 style="margin:14px 0 12px">Import SMS</h2>';
    if(!scAdded())return h+'<button class="btn" data-trk="live">Add shortcut first</button>';
    var d=impDateOK(S.impDate)?S.impDate:isoD(impDef());S.impDate=d;
    return h+'<div class="card"><div class="in" style="font-weight:600;margin-bottom:12px">✅ Shortcut added</div><div class="mute">From</div>'+
      '<div style="width:100%;overflow:hidden;margin:6px 0 14px"><input type="date" id="impd" value="'+d+'" min="'+isoD(impMin())+'" max="'+isoD(new Date())+'" style="display:block;-webkit-appearance:none;appearance:none;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:0;height:48px;line-height:48px;padding:0 14px;text-align:center"></div>'+
      '<a class="btn" id="impgo" style="display:block;text-align:center;text-decoration:none" href="'+esc(impHref(d))+'">Import SMS</a></div>'+'<div class="warnbox" style="margin-top:12px">⚠️ <b>You can import up to the past 3 months.</b><br>A longer range can make the iPhone shortcut time out. If it times out, choose the past 1 month.</div>'};
  /* Live Tracking tab: the one SMS shortcut card, short */
  scCard=function(){
    if(scAdded())return '<div class="card"><div class="sxh" style="margin-bottom:6px"><div class="t">✅</div><div><b>Shortcut added</b><small>Live and old bank SMS</small></div></div><a href="#" data-scx class="note" style="color:var(--acc)">Add again</a></div>';
    return '<div class="card" style="border:2px solid var(--acc)"><div class="sxh" style="margin-bottom:12px"><div class="t">💬</div><div><b>Bank SMS shortcut</b><small>Live and old messages</small></div></div>'+scBtn("Add shortcut")+'</div>'};
  /* back from Shortcuts after "Import SMS": add whatever it handed over */
  document.addEventListener("click",function(e){if(e.target&&e.target.closest&&e.target.closest("#impgo"))ls("gwpastrun","1")});
  document.addEventListener("visibilitychange",function(){if(document.hidden||ls("gwpastrun")!=="1")return;ls("gwpastrun","");
    setTimeout(async function(){try{await GWL.drain();toast("Older SMS added ✓")}catch(x){}render()},1500)});
  document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-lios="drain"]');if(!b)return;b.disabled=true;try{await GWL.drain();toast(S.nsms&&S.nsms.waiting?"Some SMS could not be added":"Up to date ✓")}finally{b.disabled=false;render()}});
  /* Home: "Live tracking is on" line from the automation's counter */
  trackLine=function(){var st=S.nsms;if(!st||!st.count||!S.loaded)return "";var days=st.last?Math.floor((Date.now()-st.last)/864e5):-1;
    if(days>=3)return '<button class="dc stl" data-go="sms" style="border:1.5px solid #e0a020;display:block"><span style="display:flex;justify-content:space-between;width:100%"><span><i class="dot r"></i><b>Live tracking stopped</b></span><span class="note" style="margin:0;color:var(--acc)">Fix it ›</span></span><div class="note" style="margin:6px 0 0">No bank SMS for '+days+' days. Check the automation in Shortcuts.</div></button>';
    return '<button class="dc stl" data-go="sms"><span><i class="dot"></i><b>Live tracking is on</b></span><span class="note" style="margin:0">Last SMS '+esc(ago(new Date(st.last).toISOString()))+' ›</span></button>'};
  /* Tracking page: describe the iPhone way */
  var _vt=vTrack;vTrack=function(){return _vt().replace(/<b>SMS<\/b>: bank alerts are read on this phone the moment they arrive and saved here\./,'<b>SMS</b>: your Shortcuts automation hands each bank SMS to the app on this iPhone. It is saved here, nowhere else.')};
  document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("[data-vca],[data-vcx]");if(!a)return;
    if(a.hasAttribute("data-vcx")){e.preventDefault();ls("gwvsc","");render();return}
    ls("gwvsc","1");setTimeout(function(){try{render()}catch(x){}},700)});
  /* Settings: voice = Siri / Back Tap / widget, all on this iPhone */
  var _nc=nativeCard;nativeCard=function(){var h=_nc.apply(this,arguments),i=h.indexOf(sxHead('🎤','Add an expense by voice','Say it, it is saved'));if(i<0)return h;
    var j=h.lastIndexOf('</div></div>');var VL="https://www.icloud.com/shortcuts/13d1373c661a4dc5a39b553d9218bc0f",vOK=ls("gwvsc")==="1";
    var vl=null;try{vl=JSON.parse(ls("gwvlast")||"null")}catch(x){}
    var card='<div class="card" id="voicecard" style="text-align:center;padding:24px 16px"><div style="font-size:48px;line-height:1">🎤</div>'+
      '<div style="font-size:20px;font-weight:700;margin:10px 0 2px">Add expense by voice</div><div class="mute" style="margin-bottom:18px">Siri, Back Tap or the widget. Set up once, then just speak.</div>'+
      (vl?'<div class="in" style="font-weight:600;margin-bottom:10px">✅ Voice is on</div><button class="btn ghost" data-go="voice">Show usage guide</button>':'<button class="btn" data-go="voice">Set up voice</button>')+'</div>';
    return h.slice(0,h.lastIndexOf('<div class="card">',i))+card+h.slice(j+12)};
}})();
})();
/* while typing, hide the bottom bar and the round ＋ button: with the keyboard open they float up and cover buttons such as Send Invite */
(function(){if(!window.GWL||!GWL.on)return;
  var st=document.createElement("style");st.textContent="body.typing #nav,body.typing .fab,body.typing #fab{display:none!important}";document.head.appendChild(st);
  function isText(e){if(!e||!e.tagName)return false;if(e.tagName==="TEXTAREA")return true;if(e.tagName!=="INPUT")return false;return !/^(checkbox|radio|button|submit|range|color|file)$/i.test(e.type||"")}
  document.addEventListener("focusin",function(e){if(isText(e.target))document.body.classList.add("typing")});
  document.addEventListener("focusout",function(){setTimeout(function(){if(!isText(document.activeElement))document.body.classList.remove("typing")},50)})})();
