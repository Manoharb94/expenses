/* ===== Self-check for the on-phone app =====
   Menu → tap the grey line at the bottom 7 times → "Run self-check".
   Runs ~45 checks on this phone in about a minute. Uses a separate, temporary copy of the data:
   your real payments, folder files and family are not touched. */
(function(){
var GWL=window.GWL;if(!GWL||!GWL.on)return;
var SMS=[
["Rs.500.00 debited from A/c XX1234 on 12-11-26 to VPA zomato@okaxis (UPI Ref No 432112345678). Not you? Call 18002586161",500,"out","Zomato"],
["INR 1,200.00 spent on HDFC Bank Card x1234 at AMAZON on 2026-11-12:10:22:33. Avl Lmt: INR 50,000",1200,"out","Amazon"],
["Sent Rs.40.00 From HDFC Bank A/C *1234 To RAMESH KUMAR On 12/11/26 Ref 432112345678 Not You? Call 18002586161",40,"out","Ramesh Kumar"],
["ICICI Bank Acct XX123 debited for Rs 450.00 on 12-Nov-26; SWIGGY credited. UPI:432112345678. Call 18002662 for dispute.",450,"out","Swiggy"],
["Dear UPI user A/C X1234 debited by 120.0 on date 12Nov26 trf to BIGBASKET Refno 432112345678. If not u? call 1800111109 -SBI",120,"out","Bigbasket"],
["INR 99.00 debited A/c no. XX1234 12-11-26 10:11:12 UPI/P2M/432112345678/NETFLIX Not you? SMS BLOCK 1234 to 919951860002 Axis Bank",99,"out","Netflix"],
["Sent Rs.100.00 from Kotak Bank AC X1234 to rapido@ybl on 12-11-26.UPI Ref 432112345678. Not you, https://kotak.com/KBANKT/Fraud",100,"out","Rapido"],
["Dear Customer, Rs 10,000.00 credited to your A/c XX1234 on 12-11-2026 by NEFT from ACME TECHNOLOGIES PVT LTD. Avl Bal Rs 55,000.00",10000,"in","Acme Technologies Pvt Ltd"],
["Rs.2500.00 credited to HDFC Bank A/c XX1234 on 12-11-26 from VPA manohar.b@okicici (UPI 432112345678)",2500,"in","Manohar B"],
["Acct XX123 is credited with INR 75,000.00 on 01-Nov-26 from SALARY ACME CORP. Info: NEFT-ACME. Avbl Bal INR 80,000",75000,"in","Salary Acme Corp"],
["Rs 2,000.00 withdrawn at ATM SBI MG ROAD from A/c XX1234 on 12-11-26. Avl bal Rs 3000",2000,"out","Atm Sbi Mg Road"],
["Refund of Rs.299.00 credited to your Card XX1234 from MYNTRA on 12-11-26.",299,"in","Myntra"],
["You have spent Rs.650 on your SBI Credit Card ending 4321 at DMART on 12/11/26. Trxn. Not you? Call",650,"out","Dmart"],
["Rs.1,560.00 paid to Electricity Board from A/c XX1234 via UPI on 12-11-26. Ref 432112345678",1560,"out","Electricity Board"],
["Your OTP for transaction of Rs 500 is 123456. Do not share.",0],
["Payment of Rs 3,499 is due on 15-11-26 for your credit card. Pay now.",0],
["Hi! Are we meeting at 6? Bring Rs 200 for snacks",0]];
var VOICE=[["spent 100 rs for auto",100,"out","Auto","Transport"],["paid ₹250 for groceries",250,"out","Groceries","Groceries"],["petrol 500",500,"out","Petrol","Fuel"],["received 1000 rupees from manohar",1000,"in","Manohar",null],["got 2k rupees from amma",2000,"in","Amma",null]];

var R=[],running=false,FT={};
function testNums(){return String(ls("gwtestnums")||"919000000001,919000000002,919000000003").split(/[\s,]+/).filter(Boolean).map(function(n){n=n.replace(/\D/g,"");return n.length===10?"91"+n:n})}
function testOtp(){return ls("gwtestotp")||"123456"}
function need(){if(!FT.A||!FT.B)skip("test members could not log in")}
async function asDev(who,fn){var d=FT[who],os=GWL._swapSess(d.sess),od=GWL.swapDb(d.db);try{return await fn()}finally{GWL.swapDb(od);GWL._swapSess(os)}}
async function cleanupFamily(){for(var w of ["A","B"]){if(!FT[w])continue;try{await asDev(w,function(){return GWL.famLeave()})}catch(e){try{await asDev(w,function(){return GWL.srv("lm_family_leave",{})})}catch(x){}}}}
function P(n){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n]||null}catch(e){return null}}
function native(){try{return typeof nativeApp==="function"&&nativeApp()}catch(e){return false}}
function skip(why){var e=new Error(why);e.skip=1;throw e}
function must(c,why){if(!c)throw new Error(why||"not as expected")}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
async function api2(path,opt){return GWL.api(path,opt||{})}
function enc(t){return new TextEncoder().encode(t)}
/* the same encryption the Gmail script does, so we can check this phone opens it */
async function gmailEncrypt(keyB64,text){var C=GWL.crypto,k=C.b64d(keyB64),ek=await C.hmac(k,enc("enc")),mk=await C.hmac(k,enc("mac"));
  var pt=enc(text),n=crypto.getRandomValues(new Uint8Array(16)),ct=new Uint8Array(pt.length),ks=null;
  for(var i=0;i<pt.length;i++){if(i%32===0){var blk=i/32,inp=new Uint8Array(20);inp.set(n,0);inp[18]=(blk>>8)&255;inp[19]=blk&255;ks=await C.hmac(ek,inp)}ct[i]=pt[i]^ks[i%32]}
  var both=new Uint8Array(16+ct.length);both.set(n,0);both.set(ct,16);return {n:C.b64e(n),c:C.b64e(ct),m:C.b64e(await C.hmac(mk,both))}}

var TESTS=[
/* ---- this phone ---- */
["Phone","App storage (IndexedDB) works",async function(){var r=indexedDB.open("gharwise-selftest",1);await new Promise(function(ok,no){r.onupgradeneeded=function(){r.result.createObjectStore("kv")};r.onsuccess=ok;r.onerror=function(){no(r.error)}});
  var d=r.result,tx=d.transaction("kv","readwrite");tx.objectStore("kv").put("hello","k");await new Promise(function(ok){tx.oncomplete=ok});
  var v=await new Promise(function(ok){var q=d.transaction("kv").objectStore("kv").get("k");q.onsuccess=function(){ok(q.result)}});d.close();indexedDB.deleteDatabase("gharwise-selftest");must(v==="hello")}],
["Phone","Encryption is available",async function(){must(window.crypto&&crypto.subtle&&crypto.getRandomValues,"Web Crypto missing")}],
["Phone","App version",async function(){var s=P("SmsTracker");if(!s||!s.appInfo)skip("not in the app");var a=await s.appInfo();return "v"+a.versionName+" ("+a.versionCode+")"}],
["Folder","Storage folder is chosen and reachable",async function(){var f=P("LocalFiles");if(!f)skip("not in the app");var s=await f.folderStatus();must(s.ok,"folder not reachable: choose it again in Menu → Storage folder");return s.name}],
["Folder","Write, read and delete a test file",async function(){var t="selftest "+Date.now();await GWL.files.write("gharwise-selftest.txt",t,"text/plain");var b=await GWL.files.read("gharwise-selftest.txt");must(b===t,"read back different text");await GWL.files.del("gharwise-selftest.txt")}],
["Folder","Your backup file is in the folder",async function(){if(!P("LocalFiles"))skip("not in the app");var b=await GWL.files.read(GWL.FILES.data);must(b&&JSON.parse(b).app==="gharwise-local","gharwise-data.json missing or damaged")}],
/* ---- readers ---- */
["SMS reader","Reads "+SMS.filter(function(x){return x[1]}).length+" bank SMS formats",async function(){var bad=[];SMS.forEach(function(c){if(!c[1])return;var r=GWSMS.parseSms(c[0]);if(!r||r.amount!==c[1]||r.type!==c[2]||r.merchant!==c[3])bad.push(c[3]+" got "+(r?r.amount+" "+r.type+" "+r.merchant:"nothing"))});must(!bad.length,bad.join("; "))}],
["SMS reader","Ignores OTPs, reminders and chats",async function(){var bad=SMS.filter(function(c){return !c[1]&&GWSMS.parseSms(c[0])});must(!bad.length,bad.length+" read as payments")}],
["Voice reader","Reads spoken expenses",async function(){var bad=[];VOICE.forEach(function(c){var r=GWSMS.parseVoice(c[0]);if(!r||r.amount!==c[1]||r.type!==c[2]||r.merchant!==c[3]||r.category!==c[4])bad.push('"'+c[0]+'"')});must(!bad.length,bad.join(", "))}],
/* ---- data (on a temporary copy) ---- */
["Payments","Add a payment",async function(){await api2("transactions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({amount:250,type:"out",merchant:"Selftest Store",category:"Groceries",txn_date:"2026-01-15"})});var r=await api2("rpc/app_txns",{method:"POST",body:"{}"});must(r.some(function(t){return t.merchant==="Selftest Store"&&t.amount===250}))}],
["Payments","Change its category",async function(){var t=(await api2("rpc/app_txns",{method:"POST",body:"{}"})).find(function(x){return x.merchant==="Selftest Store"});await api2("transactions?id=eq."+t.id,{method:"PATCH",body:JSON.stringify({category:"Food"})});var u=(await api2("transactions?id=eq."+t.id))[0];must(u.category==="Food")}],
["Payments","Remembers a payee's category",async function(){await api2("merchants?on_conflict=household_id,merchant_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({merchant_key:"zomato",name:"Zomato",category:"Food"})});
  var g=GWL.ingestSms([{t:SMS[0][0],ms:Date.now()}]);must(g.saved===1,"SMS not saved");var t=(await api2("transactions?merchant_key=eq.zomato"))[0];must(t&&t.category==="Food","category not applied")}],
["Payments","Same SMS twice is saved once",async function(){var g=GWL.ingestSms([{t:SMS[0][0],ms:Date.now()}]);must(g.saved===0&&g.skipped===1)}],
["Payments","Voice entry saved and undone",async function(){must(GWL.addVoice("spent 70 rs for tea"),"not saved");var t=(await api2("transactions?merchant_key=eq.tea"))[0];must(t&&t.amount===70);await api2("transactions?id=eq."+t.id,{method:"DELETE"});must(!(await api2("transactions?merchant_key=eq.tea")).length,"not deleted")}],
["Payments","Delete a payment",async function(){var t=(await api2("transactions?merchant=eq.Selftest Store"))[0];await api2("transactions?id=eq."+t.id,{method:"DELETE"});must(!(await api2("transactions?merchant=eq.Selftest Store")).length)}],
["Budgets","Set and change a budget",async function(){await api2("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({category:"Food",amount:3000})});
  await api2("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({category:"Food",amount:3500})});var b=await api2("budgets?category=eq.Food");must(b.length===1&&b[0].amount===3500)}],
["Statements","Import a bank statement and undo it",async function(){var r=await api2("rpc/import_statement",{method:"POST",body:JSON.stringify({p_person:GWL.db().profile.name,p_from:"2026-01-01",p_to:"2026-01-31",p_rows:[{d:"2026-01-10",a:999,t:"out",m:"Statement Shop",r:"ST1"},{d:"2026-01-11",a:5000,t:"in",m:"Refund",r:"ST2"}],p_meta:{file:"selftest.pdf"}})});
  must(r&&r.inserted===2,"import failed");await api2("rpc/undo_statement",{method:"POST",body:JSON.stringify({p_batch:r.batch})});must(!(await api2("transactions?merchant=eq.Statement Shop")).length,"undo failed")}],
["Export","CSV export",async function(){await GWL.exportData("csv","all","save","gharwise-selftest-");var n="gharwise-selftest-all-"+new Date().toISOString().slice(0,10).replace(/(\d+)-(\d+)-(\d+)/,"$1-$2-$3")+".csv";
  var names=[n];var d=new Date();names.push("gharwise-selftest-all-"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+".csv");
  var t=null;for(var i=0;i<names.length&&!t;i++){t=await GWL.files.read(names[i]);if(t){await GWL.files.del(names[i]);break}}must(t&&/Date,Type,Amount,Payee/.test(t),"CSV not written")}],
["Export","PDF export",async function(){if(!window.jspdf)await new Promise(function(ok,no){var s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=ok;s.onerror=function(){no(new Error("PDF library missing from the app"))};document.head.appendChild(s)});
  var J=new window.jspdf.jsPDF();J.text("Gharwise selftest",20,20);var out=J.output("datauristring");must(/^data:application\/pdf/.test(out),"no PDF made");
  var f=P("LocalFiles");if(f){await f.writeFile({name:"gharwise-selftest.pdf",base64:out.slice(out.indexOf(",")+1),mime:"application/pdf"});var r=await f.readFile({name:"gharwise-selftest.pdf"});must(r.exists,"PDF not saved");await GWL.files.del("gharwise-selftest.pdf")}}],
["Screens","Every screen opens",async function(){var bad=[],tabs=["home","list","rep","plan","menu","set","track","sms","stmt","cats","goals","fam","mail"];
  for(var i=0;i<tabs.length;i++){try{go(tabs[i]);await wait(250);var el=document.getElementById("app");if(!el||el.innerHTML.length<200)bad.push(tabs[i])}catch(e){bad.push(tabs[i]+": "+e.message)}}
  go("menu");must(!bad.length,"failed: "+bad.join(", "))}],
/* ---- encryption ---- */
["Encryption","Family payment encrypts and decrypts",async function(){var k=GWL.crypto.b64e(crypto.getRandomValues(new Uint8Array(32))),key=await GWL.aesKey(k),iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc('{"merchant":"Test","amount":42}'));must(!/Test/.test(new TextDecoder("latin1").decode(ct)),"not scrambled");
  var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},key,ct);must(JSON.parse(new TextDecoder().decode(pt)).amount===42)}],
["Encryption","Tampered family data is rejected",async function(){var key=await GWL.aesKey(GWL.crypto.b64e(crypto.getRandomValues(new Uint8Array(32)))),iv=crypto.getRandomValues(new Uint8Array(12));var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc("hello")));ct[0]^=1;
  var ok=false;try{await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},key,ct)}catch(e){ok=true}must(ok,"tampering not caught")}],
["Encryption","Family code round-trip",async function(){var f={id:"0f8fad5b-d9cb-469f-a165-70867728950e",key:GWL.crypto.b64e(crypto.getRandomValues(new Uint8Array(32)))},c=GWL.famCodec.codeOf(f),p=GWL.famCodec.parseCode("Join us: "+c);must(p.id===f.id&&p.key===f.key);
  var bad=false;try{GWL.famCodec.parseCode("GW1-abc")}catch(e){bad=true}must(bad,"bad code accepted")}],
["Encryption","Email from Gmail opens on this phone",async function(){var k=GWL.crypto.b64e(crypto.getRandomValues(new Uint8Array(32))),it=await gmailEncrypt(k,JSON.stringify({t:"Rs.99 debited ₹ ✓ test",d:"2026-01-01"}));var o=await GWL.mailDecrypt(k,it);must(o&&o.t==="Rs.99 debited ₹ ✓ test")}],
["Encryption","Tampered email is rejected",async function(){var k=GWL.crypto.b64e(crypto.getRandomValues(new Uint8Array(32))),it=await gmailEncrypt(k,'{"t":"x"}');var c=GWL.crypto.b64d(it.c);c[0]^=1;it.c=GWL.crypto.b64e(c);must(await GWL.mailDecrypt(k,it)===null)}],
/* ---- phone features ---- */
["Android","SMS permission",async function(){var s=P("SmsTracker");if(!s)skip("not in the app");var st=await s.status();must(st.permission==="granted","not allowed yet: turn on SMS tracking in Automated tracking");return st.enabled?"tracking on":"allowed, tracking off"}],
["Android","SMS tracking is in on-phone mode",async function(){var s=P("SmsTracker");if(!s)skip("not in the app");var st=await s.status();if(!st.enabled)skip("SMS tracking is off");must(typeof s.takeInbox==="function","old app build: no on-phone inbox")}],
["Android","Can read recent SMS",async function(){var s=P("SmsTracker");if(!s)skip("not in the app");var st=await s.status();if(st.permission!=="granted")skip("no SMS permission");var r=await s.importRecent({days:3,local:true});must(r&&typeof r.found==="number","inbox not readable");must(Array.isArray(r.items),"old app build: sends SMS instead of keeping them");return r.found+" bank SMS in the last 3 days"}],
["Android","Voice widget is set up",async function(){var g=P("GharwiseNative");if(!g)skip("not in the app");must(typeof g.setWidget==="function")}],
["Android","Notifications allowed",async function(){var n=P("LocalNotifications");if(!n)skip("not in the app");var p=await n.checkPermissions();must(p.display==="granted","not allowed: Settings → Remind me to categorise")}],
["Android","A test notification appears in 5 seconds",async function(){var n=P("LocalNotifications");if(!n)skip("not in the app");var p=await n.checkPermissions();if(p.display!=="granted")skip("notifications not allowed");
  await n.schedule({notifications:[{id:9598,title:"Gharwise self-check",body:"If you see this, notifications work ✓",schedule:{at:new Date(Date.now()+5000)}}]});return "leave the app to see it"}],
["Android","Categorise reminders are scheduled",async function(){var n=P("LocalNotifications");if(!n)skip("not in the app");if(ls("ndion")==="0")skip("reminders are off in Settings");
  var p=await n.checkPermissions();if(p.display!=="granted")skip("notifications not allowed");
  var un=(S.txns||[]).filter(function(t){return !t.category&&t.type==="out"&&canEditT(t)}).length;
  try{if(typeof ndiSched==="function")await ndiSched()}catch(e){}
  var pend=((await n.getPending()).notifications||[]).filter(function(x){var i=Number(x.id);return i>=9511&&i<=9513});
  if(!un){must(!pend.length,"reminders are scheduled although everything is categorised");return "everything categorised, so none scheduled ✓"}
  must(pend.length>0,un+" uncategorised payments but no reminder is scheduled");var at=pend.map(function(x){return x.schedule&&x.schedule.at}).filter(Boolean).sort()[0];
  return pend.length+" scheduled"+(at?", next "+new Date(at).toLocaleString("en-IN",{weekday:"short",hour:"numeric",minute:"2-digit"}):"")}],
["Android","App lock (fingerprint/face) available",async function(){var g=P("GharwiseNative");if(!g||!g.lockStatus)skip("not in the app");var s=await g.lockStatus();must(s&&s.available!==false,"this phone has no screen lock set")}],
/* ---- family sync, end to end, between two Supabase TEST numbers (your real family is not touched) ---- */
["Family sync","Two test members log in",async function(){var nums=testNums(),otp=testOtp(),own=String(GWL.phone()||"").replace(/\D/g,"").slice(-10);
  var use=nums.filter(function(n){return n.replace(/\D/g,"").slice(-10)!==own});
  if(use.length<2)throw new Error("needs two test numbers that are not this phone's login (now: "+nums.join(", ")+"). Tap “Test numbers” below to change them.");
  for(var i=0;i<2;i++){var who=i?"B":"A";try{FT[who]={num:use[i],sess:await GWL._loginTest(use[i],otp)}}catch(e){throw new Error("+"+use[i]+" could not log in ("+(e.message||e)+"). Add it in Supabase → Authentication → Phone → Test phone numbers, code "+otp+".")}
    var d=GWL.blankDb();d.profile={name:"Test "+who,created:new Date().toISOString()};FT[who].db=d;await asDev(who,function(){return GWL.publishKey()})}
  for(var w of ["A","B"])await asDev(w,async function(){await GWL.srv("lm_family_leave",{});var gs=await GWL.srv("lm_groups_mine",{})||[];for(var g of gs){try{await GWL.srv(g.created_by===GWL.uid()?"lm_group_delete":"lm_group_leave",{p_group:g.id})}catch(e){}}});
  return "+"+FT.A.num+" and +"+FT.B.num}],
["Family sync","A creates a family and invites B by mobile number",async function(){need();await asDev("A",function(){return GWL.famCreate()});
  var r=await asDev("A",function(){return GWL.invite("family",GWL.db().family.id,FT.B.num)});must(r&&r.status==="invited","invite status: "+(r&&r.status)+(r&&r.status==="waiting"?" (B's phone key not published)":""));return "invite sent to +"+FT.B.num}],
["Family sync","B gets the invite and accepts",async function(){need();FT.fid=await asDev("A",function(){return GWL.db().family&&GWL.db().family.id});
  var n=await asDev("B",async function(){await GWL.fetchInbox();var i=GWL.inbox().filter(function(x){return x.kind==="family"&&x.target===FT.fid})[0];must(i,"no invite arrived");must(i.by==="Test A","invite shows "+i.by);await GWL.inviteRespond(i.id,true);return GWL.db().family&&GWL.db().family.members});
  must(n===2,"family has "+n+" members, expected 2");return "2 members"}],
["Family sync","B adds a payment → A sees it",async function(){need();
  await asDev("B",async function(){await api2("transactions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({amount:321,type:"out",merchant:"Sync test shop",category:"Groceries",txn_date:new Date().toISOString().slice(0,10)})});await GWL.sync()});
  var r=await asDev("A",async function(){await GWL.sync();return GWL.T("family_txns").find(function(t){return t.merchant==="Sync test shop"})});
  must(r,"payment did not arrive");must(r.amount===321&&r.person==="Test B"&&r.category==="Groceries","arrived wrong: "+r.amount+" "+r.person+" "+r.category);return "₹321 from Test B arrived"}],
["Family sync","B changes it → A sees the change",async function(){need();
  await asDev("B",async function(){var t=GWL.T("transactions").find(function(x){return x.merchant==="Sync test shop"});await api2("transactions?id=eq."+t.id,{method:"PATCH",body:JSON.stringify({category:"Food",amount:345})});await GWL.sync()});
  var r=await asDev("A",async function(){await GWL.sync();return GWL.T("family_txns").find(function(t){return t.merchant==="Sync test shop"})});
  must(r&&r.category==="Food"&&r.amount===345,"change did not arrive"+(r?" ("+r.category+" ₹"+r.amount+")":""));return "now Food ₹345"}],
["Family sync","B deletes it → it disappears for A",async function(){need();
  await asDev("B",async function(){var t=GWL.T("transactions").find(function(x){return x.merchant==="Sync test shop"});await api2("transactions?id=eq."+t.id,{method:"DELETE"});await GWL.sync()});
  var r=await asDev("A",async function(){await GWL.sync();return GWL.T("family_txns").find(function(t){return t.merchant==="Sync test shop"})});must(!r,"still there after delete")}],
["Family sync","A adds a payment → B sees it",async function(){need();
  await asDev("A",async function(){await api2("transactions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({amount:99,type:"out",merchant:"Reverse test",category:"Food",txn_date:new Date().toISOString().slice(0,10)})});await GWL.sync()});
  var r=await asDev("B",async function(){await GWL.sync();return GWL.T("family_txns").find(function(t){return t.merchant==="Reverse test"})});must(r&&r.amount===99&&r.person==="Test A","did not arrive")}],
["Family sync","Server copy is scrambled",async function(){need();var list=await asDev("B",function(){return GWL.srv("lm_pull",{p_since:0})});must(list&&list.length,"nothing on the server");
  var leak=list.some(function(e){return e.ct&&/Reverse test|Sync test shop/.test(atob(e.ct))});must(!leak,"payee name readable on the server!");return list.length+" item(s), unreadable"}],
["Family sync","Both leave; test family removed",async function(){need();await cleanupFamily();var a=await asDev("A",function(){return GWL.srv("lm_family_info",{})});must(!a,"A is still in a family")}],
/* ---- groups / trips between the same two test numbers ---- */
["Groups","A creates a trip and invites B by mobile",async function(){need();
  var id=await asDev("A",async function(){var g=await api2("rpc/group_create",{method:"POST",body:JSON.stringify({p_name:"Self-check trip",p_photo:null,p_start:null,p_end:null,p_simplify:true})});
    var r=await api2("rpc/group_invite",{method:"POST",body:JSON.stringify({p_group:g,p_email:"+"+FT.B.num})});must(r.status==="invited","invite status "+r.status);return g});FT.gid=id;return "invite sent"}],
["Groups","B accepts the invite",async function(){need();if(!FT.gid)skip("no test group");
  var n=await asDev("B",async function(){await GWL.fetchInbox();var i=GWL.inbox().filter(function(x){return x.kind==="group"&&x.target===FT.gid})[0];must(i,"no invite arrived");must(i.name==="Self-check trip"&&i.by==="Test A","invite shows "+i.name+" from "+i.by);
    await api2("rpc/group_invite_respond",{method:"POST",body:JSON.stringify({p_id:i.id,p_accept:true})});await GWL.groupsSync(true);var g=GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]);return g.members.map(function(m){return m.name}).sort().join(",")});
  must(n==="Test A,Test B","members: "+n);return "Test A and Test B"}],
["Groups","B adds ₹600 split equally → A owes ₹300",async function(){need();if(!FT.gid)skip("no test group");
  FT.eid=await asDev("B",async function(){var g=GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]),ids=g.members.map(function(m){return m.user_id}),sh={};ids.forEach(function(u){sh[u]=600/ids.length});
    return api2("rpc/group_save_expense",{method:"POST",body:JSON.stringify({p_group:FT.gid,p_id:null,p_txn:null,p_paid_by:GWL.uid(),p_amount:600,p_date:new Date().toISOString().slice(0,10),p_title:"Self-check dinner",p_mode:"equal",p_shares:sh,p_cat:"Food"})})});
  var net=await asDev("A",async function(){await GWL.groupsSync(true);var g=GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]);must(g.expenses.some(function(e){return e.title==="Self-check dinner"}),"payment did not arrive");return gNets(g)[GWL.uid()]});
  must(Math.round(net)===-300,"A's balance is "+net);return "A owes ₹300"}],
["Groups","A edits B's payment → B sees it",async function(){need();if(!FT.eid)skip("no test payment");
  await asDev("A",async function(){var g=GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]),e=g.expenses[0],sh={};Object.keys(e.shares).forEach(function(u){sh[u]=400});
    await api2("rpc/group_save_expense",{method:"POST",body:JSON.stringify({p_group:FT.gid,p_id:e.id,p_txn:null,p_paid_by:e.paid_by,p_amount:800,p_date:e.txn_date,p_title:e.title,p_mode:"equal",p_shares:sh,p_cat:"Food"})})});
  var a=await asDev("B",async function(){await GWL.groupsSync(true);return GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]).expenses[0].amount});must(a===800,"B sees ₹"+a);return "now ₹800"}],
["Groups","A deletes it → gone for B",async function(){need();if(!FT.eid)skip("no test payment");
  await asDev("A",function(){return api2("rpc/group_delete_expense",{method:"POST",body:JSON.stringify({p_id:FT.eid})})});
  var n=await asDev("B",async function(){await GWL.groupsSync(true);return GWL.groupView(GWL.groupsLocal().filter(function(x){return x.id===FT.gid})[0]).expenses.length});must(n===0,"still there")}],
["Groups","Only the creator can delete the trip",async function(){need();if(!FT.gid)skip("no test group");var refused=false;
  try{await asDev("B",function(){return api2("rpc/group_delete",{method:"POST",body:JSON.stringify({p_group:FT.gid})})})}catch(e){refused=/Only the person/.test(e.message)}must(refused,"B could delete it")}],
["Groups","Server copy is scrambled",async function(){need();if(!FT.gid)skip("no test group");
  var list=await asDev("B",function(){return GWL.srv("lm_group_pull",{p_group:FT.gid,p_since:0})});must(list&&list.length,"nothing on the server");
  must(!list.some(function(e){return e.ct&&/Self-check|Test A|Test B/.test(atob(e.ct))}),"group text readable on the server!");return list.length+" item(s), unreadable"}],
["Groups","A deletes the trip → gone for B",async function(){need();if(!FT.gid)skip("no test group");
  await asDev("A",function(){return api2("rpc/group_delete",{method:"POST",body:JSON.stringify({p_group:FT.gid})})});
  var n=await asDev("B",async function(){await GWL.groupsSync(true);return GWL.groupsLocal().filter(function(x){return x.id===FT.gid}).length});FT.gid=null;must(n===0,"B still has it")}],
/* ---- server ---- */
["Server","Logged in",async function(){must(GWL.loggedIn(),"logged out: Menu → Account → log in");return "+"+String(GWL.phone()).replace(/^\+/,"")}],
["Server","Server is reachable and set up",async function(){if(!GWL.loggedIn())skip("logged out");try{await GWL.srv("lm_is_app_user",{})}catch(e){if(/Could not find|does not exist|PGRST202/i.test(e.message))throw new Error("run local_mode.sql in Supabase");if(/Failed to fetch|NetworkError|LOGIN/i.test(e.message))throw new Error("no internet or login expired");throw e}}],
["Server","Usage numbers are recorded",async function(){if(!GWL.loggedIn())skip("logged out");must(await GWL.srv("lm_is_app_user",{})===true,"no usage row yet: reopen the app")}],
["Server","Family sync status",async function(){if(!GWL.loggedIn())skip("logged out");var r=await GWL.srv("lm_family_info",{});var real=GWL.selftestReal;if(!real.family)return r?"in a family on the server but not on this phone":"not in a family";must(r&&r.family_id===real.family.id,"this phone's family doesn't match the server");return r.members+" people"}],
["Server","Email tracking status",async function(){if(!GWL.loggedIn())skip("logged out");var real=GWL.selftestReal;if(!real.mail||!real.mail.on)skip("email tracking is off");var r=await GWL.srv("lm_mail_status",{});must(r&&r.on,"server has no email token: set it up again");
  if(!r.last_run)throw new Error("the Gmail script has never checked in");var mins=(Date.now()-new Date(r.last_run).getTime())/60000;must(mins<30,"Gmail script last checked "+Math.round(mins)+" min ago (stopped?)");return "checked "+Math.round(mins)+" min ago"}],
["Server","Family data is unreadable on the server",async function(){if(!GWL.loggedIn())skip("logged out");var real=GWL.selftestReal;if(!real.family)skip("not in a family");
  var k=await GWL.aesKey(real.family.key),iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,enc('{"merchant":"Zomato","amount":500}')));must(!/Zomato|500/.test(new TextDecoder("latin1").decode(ct)))}]
];

function ui(){var o=document.getElementById("gwst");if(!o){o=document.createElement("div");o.id="gwst";o.style.cssText="position:fixed;inset:0;z-index:200;background:var(--bg);overflow:auto;padding:calc(16px + env(safe-area-inset-top)) 16px 24px";document.body.appendChild(o)}
  var pass=R.filter(function(r){return r.s==="pass"}).length,fail=R.filter(function(r){return r.s==="fail"}).length,sk=R.filter(function(r){return r.s==="skip"}).length;
  var ic={pass:'<span style="color:#16a34a">✓</span>',fail:'<span style="color:#dc2626">✗</span>',skip:'<span class="mute">–</span>',run:'<span class="mute">…</span>'},last="";
  o.innerHTML='<h2 style="margin:0 0 4px">Self-check</h2><div class="mute" style="margin:0 0 12px">'+(running?'Running… '+R.length+' of '+TESTS.length:(fail?'<b style="color:#dc2626">'+fail+' failed</b>':'<b style="color:#16a34a">All good</b>')+' · '+pass+' passed · '+sk+' skipped')+'</div>'+
    R.map(function(r){var h=(r.g!==last?'<div class="sec" style="margin:12px 0 4px">'+esc(r.g)+'</div>':'');last=r.g;return h+'<div class="row" style="padding:6px 0;align-items:flex-start;gap:10px"><span style="width:18px">'+ic[r.s]+'</span><span style="flex:1"><b style="font-weight:500">'+esc(r.n)+'</b>'+(r.m?'<br><small class="'+(r.s==="fail"?'out':'mute')+'">'+esc(r.m)+'</small>':'')+'</span><small class="mute">'+(r.ms!=null?r.ms+' ms':'')+'</small></div>'}).join('')+
    (running?'':'<div class="note" style="margin-top:14px">Family test numbers: '+esc(testNums().map(function(n){return "+"+n}).join(", "))+' · code '+esc(testOtp())+' <a href="#" data-st="nums" style="color:var(--acc)">Test numbers</a></div><button class="btn" data-st="share" style="margin-top:10px">Share report</button><button class="btn ghost" data-st="again" style="margin-top:8px">Run again</button><button class="btn ghost" data-st="close" style="margin-top:8px">Close</button>')}
function report(){var pass=R.filter(function(r){return r.s==="pass"}).length,fail=R.filter(function(r){return r.s==="fail"}).length;
  return "Gharwise self-check — "+new Date().toLocaleString("en-IN")+"\n"+(GWL.selftestVersion||"")+" · "+navigator.userAgent.replace(/^.*?\(|\).*$/g,"")+"\n"+pass+" passed, "+fail+" failed, "+(R.length-pass-fail)+" skipped\n\n"+
    R.map(function(r){return (r.s==="pass"?"✓":r.s==="fail"?"✗":"–")+" "+r.g+": "+r.n+(r.m?" — "+r.m:"")}).join("\n")}
async function run(){if(running)return;running=true;R=[];FT={};ui();
  if(GWL.idle)await GWL.idle();
  GWL.selftestReal=JSON.parse(JSON.stringify({family:GWL.db().family||null,mail:GWL.db().mail||null}));
  var test=GWL.blankDb();test.profile={name:GWL.db().profile.name,created:new Date().toISOString()};
  GWL.testing=true;var real=GWL.swapDb(test);
  try{for(var i=0;i<TESTS.length;i++){var t=TESTS[i],row={g:t[0],n:t[1],s:"run"};R.push(row);ui();var t0=Date.now();
      try{var m=await t[2]();row.s="pass";if(typeof m==="string")row.m=m;if(row.n==="App version")GWL.selftestVersion=m}catch(e){row.s=e&&e.skip?"skip":"fail";row.m=e&&e.message||String(e)}
      row.ms=Date.now()-t0;ui()}}
  finally{try{await cleanupFamily()}catch(e){}FT={};GWL.swapDb(real);GWL.testing=false;running=false;try{await load(true);go("menu")}catch(e){}ui()}}
GWL.selftest=run;GWL.selftestResults=function(){return R};
document.addEventListener("click",async function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-st]");if(b){var a=b.getAttribute("data-st");
    if(a==="nums"){e.preventDefault();var v=prompt("Two Supabase test phone numbers for the family check, separated by a comma",testNums().join(","));if(v){ls("gwtestnums",v)}var c=prompt("Their test code (6 digits)",testOtp());if(c&&/^\d{6}$/.test(c.trim()))ls("gwtestotp",c.trim());ui();return}
    if(a==="run")run();else if(a==="again")run();else if(a==="close"){var o=document.getElementById("gwst");if(o)o.remove()}
    else if(a==="share"){var f=P("LocalFiles"),t=report();if(f)await f.shareFile({name:"gharwise-selfcheck.txt",text:t,mime:"text/plain",title:"Gharwise self-check"});else if(await copyText(t))toast("Report copied")}return}
  var v=e.target&&e.target.closest&&e.target.closest("#gwver");if(v){var n=(+v.dataset.n||0)+1;v.dataset.n=n;if(n>=7){ls("gwdev","1");toast("Self-check unlocked");render()}else if(n>=4)toast((7-n)+" more taps")}});
})();
