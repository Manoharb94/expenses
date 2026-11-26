/* ===== On-phone app: the few things that use the server =====
   1. Login with an SMS code (Supabase phone OTP).
   2. Usage numbers for the owner's dashboard: last opened, version, which features are on, payment COUNT. No amounts.
   3. Family sync: every payment is encrypted on the phone (AES-256-GCM) with the family key before upload.
      The key travels only inside the family code, from phone to phone. The server can't read the payments.
   4. Email tracking: the Gmail script encrypts each bank email with a key from this phone; the server only
      holds the scrambled text until this phone collects it, then deletes it. */
(function(){
var GWL=window.GWL;if(!GWL||!GWL.on)return;

/* ---------- login session (kept apart from the website's) ---------- */
var SESS=null;try{SESS=JSON.parse(localStorage.getItem("gwsess")||"null")}catch(e){}
function sessSave(o){SESS={access:o.access_token,refresh:o.refresh_token,exp:o.expires_at||(Math.floor(Date.now()/1000)+(o.expires_in||3600)),phone:(o.user&&o.user.phone)||(SESS&&SESS.phone)||"",uid:(o.user&&o.user.id)||(SESS&&SESS.uid)||""};try{localStorage.setItem("gwsess",JSON.stringify(SESS))}catch(e){}}
function sessDrop(){SESS=null;try{localStorage.removeItem("gwsess")}catch(e){}}
GWL.loggedIn=function(){return !!SESS};GWL.uid=function(){return SESS&&SESS.uid||""};GWL.phone=function(){return SESS&&SESS.phone||""};GWL.logout=sessDrop;
var refreshing=null;
async function fresh(force){
  if(!SESS)throw new Error("LOGIN");
  if(!force&&SESS.exp-60>Date.now()/1000)return;
  if(refreshing)return refreshing;
  refreshing=(async function(){try{
    var r=await fetch(AUTHB+"token?grant_type=refresh_token",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:SESS.refresh})});
    if(r.status>=400&&r.status<500){sessDrop();loginBar();throw new Error("LOGIN")}
    if(!r.ok)throw new Error("NET");
    sessSave(await r.json())}finally{refreshing=null}})();
  return refreshing}
async function srv(fn,body,retry){
  await fresh();
  var r=await fetch(URLB+"rpc/"+fn,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+SESS.access,"Content-Type":"application/json"},body:JSON.stringify(body||{})});
  var t=await r.text();
  if(r.status===401&&!retry){await fresh(true);return srv(fn,body,1)}
  if(!r.ok){var m=t;try{var o=JSON.parse(t);m=o.message||o.msg||t}catch(e){}throw new Error(m)}
  return t?JSON.parse(t):null}
GWL.srv=srv;
/* a Supabase Edge Function (used only to send invite notifications); quiet if it isn't set up */
GWL.fn=async function(name,body){await fresh();var r=await fetch(URLB.replace(/rest\/v1\/?$/,"functions/v1/")+name,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+SESS.access,"Content-Type":"application/json"},body:JSON.stringify(body||{})});
  var t=await r.text(),o={};try{o=JSON.parse(t)||{}}catch(e){}if(!r.ok)o.status=r.status;return o};
/* self-check only: sign in a Supabase TEST number without touching this phone's own login */
GWL._loginTest=async function(num,otp){num=String(num).replace(/\D/g,"");await authFetch("otp","POST",{phone:"+"+num,create_user:true});
  var o=await authFetch("verify","POST",{type:"sms",phone:"+"+num,token:String(otp)});if(!o||!o.access_token)throw new Error("no session");
  return {access:o.access_token,refresh:o.refresh_token,exp:o.expires_at||(Math.floor(Date.now()/1000)+(o.expires_in||3600)),phone:num,uid:o.user&&o.user.id||""}};
GWL._swapSess=function(o){var x=SESS;SESS=o;return x};
GWL.idle=async function(){try{if(syncing)await syncing}catch(e){}var n=0;while(pulling&&n++<100)await new Promise(function(r){setTimeout(r,100)})};
GWL.sendOtp=async function(ph){await authFetch("otp","POST",{phone:ph,create_user:true})};
GWL.verifyOtp=async function(ph,code){var o=await authFetch("verify","POST",{type:"sms",phone:ph,token:code});if(!o||!o.access_token)throw new Error("That code did not work.");sessSave(o);return true};
function loginBar(){if(!GWL.db()||!GWL.db().profile)return;var b=document.getElementById("lgbar");if(SESS){if(b)b.remove();return}if(b)return;
  b=document.createElement("button");b.id="lgbar";b.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:65;border:0;border-radius:12px;padding:10px 14px;background:#92400e;color:#fff;font:inherit;font-size:14px;text-align:left";
  b.textContent="Log in again to keep family and email in sync. Your data on this phone is safe.";
  b.onclick=function(){S.view="llogin";GWL.su.step=2;render()};document.body.appendChild(b)}
GWL.loginBar=loginBar;

/* ---------- small crypto helpers ---------- */
var te=new TextEncoder(),td=new TextDecoder();
function b64e(buf){var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),s="";for(var i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)}
function b64d(s){var r=atob(s),b=new Uint8Array(r.length);for(var i=0;i<r.length;i++)b[i]=r.charCodeAt(i);return b}
function b64u(b){return b64e(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64ud(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return b64d(s)}
function rnd(n){return crypto.getRandomValues(new Uint8Array(n))}
async function sha256hex(s){var h=new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode(s)));return Array.from(h,function(x){return (x<16?"0":"")+x.toString(16)}).join("")}
function uuidBytes(u){var h=String(u).replace(/-/g,""),b=new Uint8Array(16);for(var i=0;i<16;i++)b[i]=parseInt(h.substr(i*2,2),16);return b}
function bytesUuid(b){var h=Array.from(b,function(x){return (x<16?"0":"")+x.toString(16)}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}
var keyCache={};
async function aesKey(b64){if(keyCache[b64])return keyCache[b64];return keyCache[b64]=await crypto.subtle.importKey("raw",b64d(b64),"AES-GCM",false,["encrypt","decrypt"])}
async function hmac(keyBytes,msgBytes){var k=await crypto.subtle.importKey("raw",keyBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",k,msgBytes))}
GWL.crypto={b64e:b64e,b64d:b64d,hmac:hmac,sha256hex:sha256hex};

/* ---------- usage numbers for the owner (no amounts, no payees) ---------- */
async function ping(open){
  if(!SESS||GWL.testing)return;var db=GWL.db();if(!db||!db.profile)return;
  var sms=false,ver="";try{var P=smsPlugin();if(P){var st=await P.status();sms=!!(st&&st.enabled)}}catch(e){}
  try{var P2=smsPlugin();if(P2&&P2.appInfo){var a=await P2.appInfo();ver=String(a.versionName||"")}}catch(e){}
  if(db.family&&db.family.key){try{var fi=await srv("lm_family_info",{});if(fi&&fi.members)db.family.members=fi.members}catch(e){}}
  var mine=GWL.T("transactions").filter(function(t){return t.person===db.profile.name}),month=Date.now()-30*86400000;
  var p={open:!!open,platform:(window.Capacitor&&Capacitor.getPlatform?Capacitor.getPlatform():"web"),app_version:ver,sms_on:sms,email_on:!!(db.mail&&db.mail.on),
    voice_on:mine.some(function(t){return t.client&&new Date(t.txn_at||t.created_at).getTime()>month}),family_on:!!db.family,family_size:db.family?(db.family.members||1):0,
    lock_on:ls("gwlock")==="1",reminders_on:ls("ndion")!=="0",payments:mine.length,
    sms_shortcut:ls("gwsc2")==="1",voice_shortcut:ls("gwvsc")==="1",guide_sms:ls("gs_sms")==="1",guide_voice:ls("gs_voice")==="1",
    budget_set:ls("gs_budget")==="1"||GWL.T("budgets").length>0,import_sms:ls("gwpastrun")==="1",voice_count:Number(ls("gwvc")||0),widget_count:Number(ls("gwwc")||0)};
  try{await srv("lm_ping",{p:p});GWL.lastPing=Date.now()}catch(e){}}
GWL.ping=ping;

/* ---------- family sync, end-to-end encrypted ---------- */
function fam(){var d=GWL.db();return d&&d.family&&d.family.key?d.family:null}
function codeOf(f){var b=new Uint8Array(48);b.set(uuidBytes(f.id),0);b.set(b64d(f.key),16);return "GW1-"+b64u(b)}
function parseCode(c){c=String(c||"").trim().replace(/\s+/g,"");var m=/GW1-([A-Za-z0-9_-]{60,70})/.exec(c);if(!m)throw new Error("That family code doesn't look right. Copy the whole code that starts with GW1-");
  var b=b64ud(m[1]);if(b.length!==48)throw new Error("That family code is incomplete. Copy the whole code.");return {id:bytesUuid(b.slice(0,16)),key:b64e(b.slice(16))}}
async function joinHash(keyB64){return sha256hex("gharwise-family-join-v1:"+keyB64)}
GWL.famCodec={codeOf:codeOf,parseCode:parseCode,joinHash:joinHash};GWL.aesKey=aesKey;GWL.famCode=function(){var f=fam();return f?codeOf(f):""};
GWL.famCreate=async function(){if(!SESS)throw new Error("Log in first");var key=b64e(rnd(32)),id=await srv("lm_family_create",{p_join_hash:await joinHash(key)});
  GWL.db().family={id:id,key:key,created:new Date().toISOString(),seq:0,pushed:{},members:1};GWL.mark("data",true);await GWL.flush();await sync();ping(false);return codeOf(GWL.db().family)};
GWL.famJoin=async function(code){if(!SESS)throw new Error("Log in first");var c=parseCode(code),n=await srv("lm_family_join",{p_family:c.id,p_join_hash:await joinHash(c.key)});
  GWL.db().family={id:c.id,key:c.key,created:new Date().toISOString(),seq:0,pushed:{},members:n};GWL.mark("data",true);await GWL.flush();await sync();ping(false);return n};
GWL.famLeave=async function(){try{await srv("lm_family_leave",{})}catch(e){if(!/not logged/i.test(e.message))throw e}var d=GWL.db();d.family=null;d.t.family_txns=[];GWL.mark("family",true);await GWL.flush();ping(false)};
GWL.famInfo=async function(){var f=fam();if(!f||!SESS)return;try{var r=await srv("lm_family_info",{});if(r&&r.members){f.members=r.members;GWL.mark("data",true)}if(!r){GWL.db().family=null;GWL.db().t.family_txns=[];GWL.mark("family",true)}}catch(e){}};
function payloadOf(t){return {id:t.id,amount:t.amount,type:t.type,merchant:t.merchant,merchant_key:t.merchant_key,category:t.category||null,txn_date:t.txn_date,note:t.note||null,person:t.person}}
async function push(){
  var f=fam(),db=GWL.db(),me=db.profile.name,key=await aesKey(f.key);if(!f.pushed)f.pushed={};
  var now={},out=[];
  GWL.T("transactions").forEach(function(t){if(t.hidden||t.person!==me)return;var p=payloadOf(t),fp=JSON.stringify(p);now[t.id]=fp;if(f.pushed[t.id]!==fp)out.push({id:t.id,p:p,fp:fp})});
  var gone=Object.keys(f.pushed).filter(function(id){return id!=="__me"&&!now[id]});
  /* tell the family who this phone is: the name travels encrypted like everything else */
  if(f.pushed.__me!==me){var pp={profile:true,name:me};out.push({id:"__me",p:pp,fp:me})}
  if(!out.length&&!gone.length)return 0;
  var items=[];
  for(var i=0;i<out.length;i++){var iv=rnd(12),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,te.encode(JSON.stringify(out[i].p)));items.push({item_id:out[i].id,iv:b64e(iv),ct:b64e(ct),fp:out[i].fp})}
  gone.forEach(function(id){items.push({item_id:id,deleted:true})});
  for(var j=0;j<items.length;j+=200){var part=items.slice(j,j+200);
    await srv("lm_push",{p_items:part.map(function(x){return x.deleted?{item_id:x.item_id,deleted:true}:{item_id:x.item_id,iv:x.iv,ct:x.ct}})});
    part.forEach(function(x){if(x.deleted)delete f.pushed[x.item_id];else f.pushed[x.item_id]=x.fp})}
  GWL.mark("data",true);return items.length}
async function pull(){
  var f=fam(),key=await aesKey(f.key),changed=0,guard=0,seq0=f.seq||0;
  while(guard++<50){
    var list=await srv("lm_pull",{p_since:f.seq||0});if(!Array.isArray(list)||!list.length)break;
    var rows=GWL.T("family_txns"),byId={};rows.forEach(function(r,i){byId[r.id]=i});
    for(var i=0;i<list.length;i++){var e=list[i],rid="fam-"+e.user+"-"+e.item_id;
      if(e.item_id==="__me"){if(!f.mem)f.mem={};
        if(e.deleted){delete f.mem[e.user]}else{try{var pt0=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(e.iv)},key,b64d(e.ct)),p0=JSON.parse(td.decode(pt0));if(p0&&p0.name)f.mem[e.user]={name:String(p0.name).slice(0,60)}}catch(x){}}
        f.seq=Math.max(f.seq||0,Number(e.seq)||0);changed++;continue}
      if(e.deleted){if(byId[rid]!==undefined){rows[byId[rid]]=null;changed++}}
      else{try{var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(e.iv)},key,b64d(e.ct)),p=JSON.parse(td.decode(pt));
          var row={id:rid,amount:Number(p.amount)||0,type:p.type==="in"?"in":"out",merchant:p.merchant||"",merchant_key:p.merchant_key||GWSMS.mkey(p.merchant),category:p.category||null,txn_date:p.txn_date,note:p.note||null,
            person:String(p.person||"Family"),member:e.user,source:"family",household_id:"local",created_at:new Date().toISOString(),received_at:new Date().toISOString()};
          if(byId[rid]!==undefined)rows[byId[rid]]=row;else{byId[rid]=rows.length;rows.push(row)}changed++}catch(x){}}
      f.seq=Math.max(f.seq||0,Number(e.seq)||0)}
    GWL.db().t.family_txns=rows.filter(function(r){return r});
    if(list.length<1000)break}
  if(changed)GWL.mark("family",true);else if((f.seq||0)!==seq0)GWL.mark("data",true);
  return changed}
var syncing=null;
async function sync(){if(!fam()||!SESS)return;if(syncing)return syncing;
  syncing=(async function(){try{await push();var n=await pull();GWL.lastSync=Date.now();if(n&&typeof load==="function"&&S.code){await GWL.flush();await load(true)}}catch(e){if(/not in a family/i.test(e&&e.message)){var d=GWL.db();d.family=null;d.t.family_txns=[];GWL.mark("family",true)}}finally{syncing=null}})();
  return syncing}
GWL.sync=sync;
var stimer=null;GWL.syncSoon=function(){if(!fam())return;clearTimeout(stimer);stimer=setTimeout(sync,4000)};

/* ---------- email tracking, encrypted in the person's Gmail ---------- */
function mail(){var d=GWL.db();return d&&d.mail&&d.mail.on?d.mail:null}
async function mkeys(b64){var k=b64d(b64);return {enc:await hmac(k,te.encode("enc")),mac:await hmac(k,te.encode("mac"))}}
async function mailDecrypt(keys,it){
  var n=b64d(it.n),c=b64d(it.c),m=b64d(it.m),both=new Uint8Array(n.length+c.length);both.set(n,0);both.set(c,n.length);
  var want=await hmac(keys.mac,both);if(want.length!==m.length)return null;var diff=0;for(var i=0;i<m.length;i++)diff|=want[i]^m[i];if(diff)return null;
  var out=new Uint8Array(c.length),ks=null;
  for(var j=0;j<c.length;j++){if(j%32===0){var blk=j/32,inp=new Uint8Array(n.length+4);inp.set(n,0);inp[n.length+2]=(blk>>8)&255;inp[n.length+3]=blk&255;ks=await hmac(keys.enc,inp)}out[j]=c[j]^ks[j%32]}
  return JSON.parse(td.decode(out))}
GWL.mailDecrypt=async function(b64,it){return mailDecrypt(await mkeys(b64),it)};
GWL.mailEnable=async function(months){if(!SESS)throw new Error("Log in first");var tok=await srv("lm_mail_token",{}),d=GWL.db();
  if(!d.mail||!d.mail.key)d.mail={key:b64e(rnd(32))};d.mail.on=true;d.mail.token=tok;d.mail.months=months==null?1:months;d.mail.since=new Date().toISOString();GWL.mark("data",true);await GWL.flush();ping(false);return tok};
GWL.mailOff=async function(){try{await srv("lm_mail_off",{})}catch(e){}var d=GWL.db();d.mail=null;GWL.mark("data",true);await GWL.flush();ping(false)};
GWL.mailStatus=async function(){if(!mail()||!SESS)return null;try{return await srv("lm_mail_status",{})}catch(e){return null}};
var pulling=false;
async function mailPull(){var m=mail();if(!m||!SESS||pulling)return 0;pulling=true;var added=0;
  try{var keys=await mkeys(m.key),guard=0;
    while(guard++<20){var list=await srv("lm_mail_pull",{});if(!Array.isArray(list)||!list.length)break;var items=[],ids=[];
      for(var i=0;i<list.length;i++){ids.push(list[i].id);try{var o=await mailDecrypt(keys,list[i]);if(o&&o.t)items.push({t:o.t,d:o.d})}catch(e){}}
      var g=GWL.ingestSms(items,"email");added+=g.saved;
      await GWL.flush();await srv("lm_mail_ack",{p_ids:ids});
      if(list.length<300)break}
    if(added){m.last_added=new Date().toISOString();GWL.mark("data",true);if(typeof load==="function"&&S.code)await load(true);toast(added+" new payment"+(added>1?"s":"")+" from email")}
  }catch(e){}finally{pulling=false}return added}
GWL.mailPull=mailPull;
GWL.mailScript=function(){var m=mail();if(!m)return "";var d=GWL.db();
  return MAIL_TPL.split("__NAME__").join(String(d.profile&&d.profile.name||"").replace(/[^A-Za-z0-9 ]/g,"")).split("__TOKEN__").join(m.token).split("__KEY__").join(m.key).split("__MONTHS__").join(String(m.months||0))
    .split("__API__").join(URLB+"rpc/").split("__ANON__").join(KEY)};
var MAIL_TPL=[
"/* Gharwise (on-phone version): finds your bank alert emails, ENCRYPTS them here in your own Google",
"   account, and sends the scrambled text for your phone to collect. The server can't read them.",
"   Made for __NAME__. Keep this private: it contains your personal key.",
"   1. Press Save (disk icon).  2. In the function box choose  setup  and press Run.",
"   3. Allow access when Google asks (Advanced > Go to project). That is all. */",
"var API_ = \"__API__\";",
"var ANON_ = \"__ANON__\";",
"var TOKEN_ = \"__TOKEN__\";",
"var KEY_ = \"__KEY__\";",
"var MONTHS_ = __MONTHS__;",
"var BANKS_ = [\"hdfcbank.net\",\"hdfcbank.com\",\"icicibank.com\",\"sbi.co.in\",\"axisbank.com\",\"kotak.com\",\"yesbank.in\",\"idfcfirstbank.com\",\"indusind.com\",\"pnb.co.in\",\"bankofbaroda.com\",\"bankofbaroda.co.in\",\"canarabank.com\",\"unionbankofindia.co.in\",\"federalbank.co.in\",\"aubank.in\",\"rblbank.com\",\"sc.com\",\"hsbc.co.in\",\"paytmbank.com\",\"bandhanbank.com\",\"idbibank.co.in\",\"iob.in\",\"centralbankofindia.co.in\",\"bankofindia.co.in\",\"dbs.com\",\"jupiter.money\",\"fi.money\"];",
"var MONEY_ = /(?:rs\\.?|inr|₹)\\s?[0-9]|(?:debited|credited)\\s+(?:by|with|for)\\s+[0-9]/i;",
"var DOING_ = /(debited|credited|paid|sent|received|spent|withdrawn|deposited|transferred)/i;",
"var ACCT_ = /(a\\/c|acct|account|card|upi|vpa)/i;",
"var PROMO_ = /(pre-?approved|apply now|eligible for|special offer|cashback offer|offer valid|win |congratulations|lucky draw)/i;",
"",
"function s8_(b) { b = b & 255; return b > 127 ? b - 256 : b; }",
"function hmac_(key, bytes) { return Utilities.computeHmacSha256Signature(bytes, key); }",
"var K_ = Utilities.base64Decode(KEY_);",
"var EK_ = hmac_(K_, Utilities.newBlob(\"enc\").getBytes()), MK_ = hmac_(K_, Utilities.newBlob(\"mac\").getBytes());",
"// encrypt-then-MAC with HMAC-SHA256 (counter mode keystream). Your phone has the same key and opens it.",
"function enc_(text) {",
"  var pt = Utilities.newBlob(text).getBytes();",
"  var nonce = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now() + Math.random()).slice(0, 16);",
"  var ct = [], ks = null;",
"  for (var i = 0; i < pt.length; i++) {",
"    if (i % 32 === 0) { var blk = i / 32; ks = hmac_(EK_, nonce.concat([0, 0, s8_(blk >> 8), s8_(blk)])); }",
"    ct.push(s8_(pt[i] ^ ks[i % 32]));",
"  }",
"  var mac = hmac_(MK_, nonce.concat(ct));",
"  return { n: Utilities.base64Encode(nonce), c: Utilities.base64Encode(ct), m: Utilities.base64Encode(mac) };",
"}",
"function call_(fn, payload) {",
"  var r = UrlFetchApp.fetch(API_ + fn, { method: \"post\", contentType: \"application/json\",",
"    headers: { apikey: ANON_ }, payload: JSON.stringify(payload), muteHttpExceptions: true });",
"  if (r.getResponseCode() >= 300) throw new Error(fn + \" replied \" + r.getResponseCode() + \" \" + r.getContentText());",
"  var t = r.getContentText(); return t ? JSON.parse(t) : null;",
"}",
"function clip_(b) {",
"  b = b.replace(/https?:\\/\\/\\S+/g, \" \").replace(/\\s+/g, \" \");",
"  var i = b.search(/(?:Rs\\.?|INR|₹)\\s?[0-9]/i);",
"  if (i > 300) b = b.substring(i - 300);",
"  return b.substring(0, 1500);",
"}",
"function addr_(from) { var m = String(from).match(/<([^>]+)>/); return (m ? m[1] : String(from)).trim().toLowerCase(); }",
"function day_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), \"yyyy-MM-dd\"); }",
"function bodyOf_(m) {",
"  var b = m.getPlainBody() || \"\";",
"  if (b.replace(/\\s+/g, \"\").length < 20) {",
"    try { b = (m.getBody() || \"\").replace(/<style[\\s\\S]*?<\\/style>/gi, \" \").replace(/<[^>]+>/g, \" \").replace(/&nbsp;/g, \" \").replace(/&amp;/g, \"&\").replace(/&#8377;|&#x20b9;/gi, \"₹\"); } catch (e) {}",
"  }",
"  return b;",
"}",
"function scan_(range, cutoff, stopAt) {",
"  var qs = [\"from:(\" + BANKS_.join(\" OR \") + \")\" + range,",
"            \"subject:(debited OR credited OR transaction OR payment OR UPI OR alert OR received OR paid) -category:social -category:promotions\" + range];",
"  var sent = 0, newest = 0, ids = {}, done = true;",
"  for (var q = 0; q < qs.length; q++) {",
"    var start = 0;",
"    while (true) {",
"      if (Date.now() > stopAt) { done = false; break; }",
"      var threads = GmailApp.search(qs[q], start, 25); if (!threads.length) break; start += threads.length;",
"      var items = [];",
"      threads.forEach(function (t) { t.getMessages().forEach(function (m) {",
"        var ts = m.getDate().getTime(); if (ts <= cutoff) return;",
"        var id = m.getId(); if (ids[id]) return; ids[id] = 1; if (ts > newest) newest = ts;",
"        var from = m.getFrom(), a = addr_(from), body = bodyOf_(m), text = (m.getSubject() || \"\") + \" \" + body;",
"        if (!MONEY_.test(text) || !DOING_.test(text)) return;",
"        if (/\\botp\\b|one[ -]time password/i.test(text) && !/debited|credited/i.test(text)) return;",
"        var bank = BANKS_.some(function (b) { return a.indexOf(b) >= 0; }) || /bank/i.test(from);",
"        if (!bank && !ACCT_.test(text)) return;",
"        if (PROMO_.test(text) && !/(a\\/c|account|card)\\s*(no\\.?\\s*)?(ending|xx+|\\*+)\\s*[0-9]{3,4}/i.test(text)) return;",
"        items.push(enc_(JSON.stringify({ t: clip_((m.getSubject() || \"\") + \". \" + body), d: day_(m.getDate()) })));",
"      }); });",
"      for (var i = 0; i < items.length; i += 50) { sent += call_(\"lm_mail_push\", { p_token: TOKEN_, p_items: items.slice(i, i + 50) }); }",
"    }",
"    if (!done) break;",
"  }",
"  return { sent: sent, newest: newest, done: done };",
"}",
"function run() {",
"  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return;",
"  try {",
"    var props = PropertiesService.getScriptProperties(), stopAt = Date.now() + 240000;",
"    if (MONTHS_ > 0 && props.getProperty(\"past\") !== \"done\") {",
"      var r0 = scan_(\" newer_than:\" + (MONTHS_ * 31) + \"d\", 0, stopAt);",
"      if (r0.done) { props.setProperty(\"past\", \"done\"); props.setProperty(\"last\", String(Date.now())); }",
"      Logger.log(\"Past emails: \" + r0.sent + \" sent.\");",
"    } else {",
"      var last = Number(props.getProperty(\"last\") || 0);",
"      var r = scan_(\" newer_than:2d\", last ? last - 3 * 3600 * 1000 : 0, stopAt);",
"      if (r.done && r.newest > last) props.setProperty(\"last\", String(r.newest));",
"      Logger.log(\"New emails: \" + r.sent + \" sent.\");",
"    }",
"    call_(\"lm_mail_push\", { p_token: TOKEN_, p_items: [] });",
"  } finally { lock.releaseLock(); }",
"}",
"function setup() {",
"  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });",
"  ScriptApp.newTrigger(\"run\").timeBased().everyMinutes(5).create();",
"  run();",
"  Logger.log(\"Connected. New bank emails are checked every 5 minutes.\");",
"}"].join("\n");

/* ---------- when it runs ---------- */
GWL.online=function(){if(!SESS)return;ping(true);GWL.famInfo().then(sync);mailPull();if(GWL.groupsSync)GWL.groupsSync(true);if(GWL.pushSetup)GWL.pushSetup().catch(function(){})};
document.addEventListener("visibilitychange",function(){if(!document.hidden&&!GWL.testing&&SESS&&GWL.db()&&GWL.db().profile&&S.code){sync();mailPull()}});
setInterval(function(){if(document.hidden||GWL.testing||!SESS||!S.code)return;sync();mailPull();if(Date.now()-(GWL.lastPing||0)>6*3600000)ping(false)},60000);
window.addEventListener("online",function(){if(SESS&&S.code&&!GWL.testing){sync();mailPull()}});
})();
