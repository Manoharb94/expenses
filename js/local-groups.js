/* ===== On-phone app: invites by mobile number (family) =====
   Each phone makes its own key pair (ECDH P-256). Only the PUBLIC half goes to the server.
   An invite carries the family or group key LOCKED for the invitee's public key, so only the invitee's phone can open it.
   If the person has no app yet, the invite waits; when they log in, any member's phone locks the key for them.
   Group payments are encrypted with the group key (AES-256-GCM) before upload, exactly like family payments.
   The server only knows who is in which group, never names, amounts or payees. */
(function(){
var GWL=window.GWL;if(!GWL||!GWL.on)return;
var te=new TextEncoder(),td=new TextDecoder(),C=GWL.crypto,EC={name:"ECDH",namedCurve:"P-256"};
function D(){return GWL.db()}
function now(){return new Date().toISOString()}
function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function rnd(n){return crypto.getRandomValues(new Uint8Array(n))}
function me(){var d=D();return d&&d.profile?d.profile.name:""}
function myId(){return GWL.myId()}
function srv(fn,b){return GWL.srv(fn,b)}
function need(){if(!GWL.loggedIn())throw new Error("Log in first (Menu → Account). Groups and invites need the internet.")}
function save(){GWL.mark("family",true)}
async function sha(s){var h=new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode(s)));return Array.from(h,function(x){return (x<16?"0":"")+x.toString(16)}).join("")}

/* ---------- this phone's key pair ---------- */
async function myKeys(){var d=D();if(d.keys&&d.keys.priv&&d.keys.pub)return d.keys;
  var kp=await crypto.subtle.generateKey(EC,true,["deriveBits"]);
  d.keys={priv:await crypto.subtle.exportKey("jwk",kp.privateKey),pub:C.b64e(await crypto.subtle.exportKey("raw",kp.publicKey)),at:now()};GWL.mark("data",true);return d.keys}
async function pubHash(pub){return (await sha("gharwise-pub-v1:"+pub)).slice(0,32)}
async function publishKey(){var k=await myKeys(),tag=myId()+":"+k.pub;if(k.sent===tag)return;await srv("lm_set_pubkey",{p_key:k.pub});k.sent=tag;GWL.mark("data",true)}
GWL.publishKey=publishKey;
async function hk(bits){var base=await crypto.subtle.importKey("raw",bits,"HKDF",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:te.encode("gharwise-invite-v1"),info:new Uint8Array(0)},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
/* lock: [their one-time public key 65 bytes][iv 12][AES-GCM text] */
async function seal(pubB64,obj){var rp=await crypto.subtle.importKey("raw",C.b64d(pubB64),EC,false,[]),eph=await crypto.subtle.generateKey(EC,true,["deriveBits"]);
  var key=await hk(await crypto.subtle.deriveBits({name:"ECDH",public:rp},eph.privateKey,256)),iv=rnd(12);
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,te.encode(JSON.stringify(obj)))),ep=new Uint8Array(await crypto.subtle.exportKey("raw",eph.publicKey));
  var out=new Uint8Array(65+12+ct.length);out.set(ep,0);out.set(iv,65);out.set(ct,77);return C.b64e(out)}
async function unseal(s){var k=await myKeys(),b=C.b64d(s),priv=await crypto.subtle.importKey("jwk",k.priv,EC,false,["deriveBits"]),ep=await crypto.subtle.importKey("raw",b.slice(0,65),EC,false,[]);
  var key=await hk(await crypto.subtle.deriveBits({name:"ECDH",public:ep},priv,256));
  return JSON.parse(td.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(65,77)},key,b.slice(77))))}
GWL.inviteCrypto={seal:seal,unseal:unseal,myKeys:myKeys,pubHash:pubHash};

/* ---------- invites: inbox (to me) ---------- */
/* kept per login, so the self-check's test members never mix with yours */
var INB={};function inbox(){return INB[myId()]||[]}function setInbox(v){INB[myId()]=v}GWL.inbox=inbox;
async function fetchInbox(){var list=await srv("lm_invites_inbox",{}),k=await myKeys(),h=await pubHash(k.pub),out=[];
  for(var i=0;i<(list||[]).length;i++){var x=list[i];if(x.sealed_for!==h)continue;
    try{var o=await unseal(x.sealed);if(o.target!==x.target||o.kind!==x.kind||!o.key)continue;out.push({id:x.id,kind:x.kind,target:x.target,key:o.key,name:o.name||"",by:o.by||"Someone",at:x.created_at})}catch(e){}}
  var ch=JSON.stringify(out.map(function(x){return x.id}))!==JSON.stringify(inbox().map(function(x){return x.id}));setInbox(out);return ch}
GWL.fetchInbox=fetchInbox;

/* ---------- invites: sending ---------- */
function keyOf(kind,target){if(kind==="family"){var f=D().family;return f&&f.id===target?{key:f.key,name:"Family"}:null}return null}
/* the invite shows who asked, even when another member's phone locks it later */
function inviterName(kind,target,from){if(!from||from===myId())return me();
  
  var r=GWL.T("family_txns").filter(function(x){return x.member===from})[0];return r&&r.person||me()}
async function sealFor(id,kind,target,pub,from){var k=keyOf(kind,target);if(!k)return false;
  await srv("lm_invite_seal",{p_id:id,p_sealed:await seal(pub,{v:1,kind:kind,target:target,key:k.key,name:k.name,by:inviterName(kind,target,from)}),p_for:await pubHash(pub)});notify(id);return true}
GWL.invite=async function(kind,target,phone){need();var r=await srv("lm_invite",{p_kind:kind,p_target:target,p_phone:String(phone||"")});
  if(r&&r.status==="invited"){if(r.pubkey)await sealFor(r.id,kind,target,r.pubkey);else r.status="waiting"}
  return r};
/* invites waiting for someone who has now opened the app (or got a new phone): lock the key for them */
async function resealSent(){var list=await srv("lm_invites_sent",{})||[],n=0;
  for(var i=0;i<list.length;i++){var x=list[i];if(!x.pubkey)continue;if(x.sealed_for===await pubHash(x.pubkey))continue;try{if(await sealFor(x.id,x.kind,x.target,x.pubkey,x.from_user))n++}catch(e){}}return n}
GWL.resealSent=resealSent;

GWL.inviteRespond=async function(id,accept){need();var inv=inbox().filter(function(x){return x.id===id})[0];
  if(!accept){await srv("lm_invite_respond",{p_id:id,p_accept:false});setInbox(inbox().filter(function(x){return x.id!==id}));return null}
  if(!inv)throw new Error("This invite is no longer available");
  var r;
  if(inv.kind==="family"){var d=D();
    if(d.family&&d.family.id!==inv.target){if(!GWL.testing&&!confirm("You are already in a family on this phone. Leave it and join "+inv.by+"'s family?"))throw new Error("You stayed in your current family");await GWL.famLeave()}
    try{r=await srv("lm_invite_respond",{p_id:id,p_accept:true})}
    catch(e){if(!/already in a family/i.test(e&&e.message||""))throw e;
      if(!GWL.testing&&!confirm("This number is still in a family from before (for example, an old install). Leave it and join "+inv.by+"'s family?"))throw new Error("You stayed in your old family");
      await srv("lm_family_leave",{});r=await srv("lm_invite_respond",{p_id:id,p_accept:true})}
    d=D();d.family={id:inv.target,key:inv.key,created:now(),seq:0,pushed:{},members:r&&r.members||2};GWL.mark("data",true);
    setInbox(inbox().filter(function(x){return x.id!==id}));await GWL.flush();try{await GWL.sync()}catch(e){}return null}
  await srv("lm_invite_respond",{p_id:id,p_accept:false});setInbox(inbox().filter(function(x){return x.id!==id}));return null};

var gsync=null,lastInbox=0;
GWL.groupsSync=function(full){if(!GWL.loggedIn()||!D()||!D().profile)return Promise.resolve(false);if(gsync)return gsync;
  gsync=(async function(){var ch=false;
    try{await publishKey()}catch(e){}
    if(full||Date.now()-lastInbox>110000){lastInbox=Date.now();
      try{if(await fetchInbox())ch=true}catch(e){}
      try{await resealSent()}catch(e){}
      if(D().family)try{var p=await srv("lm_family_pending",{});if(JSON.stringify(p)!==JSON.stringify(D().family.invites||[])){D().family.invites=p;GWL.mark("data",true);ch=true}}catch(e){}}
    return ch})();
  return gsync.then(function(ch){gsync=null;if(ch&&!GWL.testing){}return ch},function(e){gsync=null;return false})};

var H={};
var _idle=GWL.idle;GWL.idle=async function(){if(_idle)await _idle();try{if(gsync)await gsync}catch(e){}};
GWL.grpc=function(fn,a){return H[fn]?H[fn](a||{}):undefined};GWL.grpcHas=function(fn){return !!H[fn]};

/* ---------- push notifications (Firebase), so an invite is noticed while the app is closed ---------- */
/* tell the invitee's phone: the server sends only "Someone invited you…"; it never knows names */
function notify(id){if(GWL.testing&&!GWL.pushInTests)return;try{GWL.fn("lm-push",{invite:id,delay:GWL.pushDelay||0}).catch(function(){})}catch(e){}}
function pushP(){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.PushNotifications||null}catch(e){return null}}
var pushOn=false;
GWL.pushSetup=async function(){var P=pushP();if(!P||!GWL.loggedIn()||GWL.testing)return "no";
  try{var S2=Capacitor.Plugins.SmsTracker,a=S2&&S2.appInfo?await S2.appInfo():null;if(!a||!a.pushReady)return "not in this build"}catch(e){return "no"}
  if(!pushOn){pushOn=true;
    P.addListener("registration",async function(t){var tok=t&&t.value;if(!tok)return;var tag=GWL.uid()+":"+tok;if(ls("gwpush")===tag)return;try{await srv("lm_set_push",{p_token:tok,p_platform:"android"});ls("gwpush",tag)}catch(e){}});
    P.addListener("registrationError",function(){});
    P.addListener("pushNotificationReceived",function(ev){try{var d0=ev&&ev.data||{};if(d0.kind==="invite"&&ls("gwinvtest")==="1"){toast("Invite push works ✓");GWL.inviteTestCleanup&&GWL.inviteTestCleanup();return}}catch(e){}GWL.groupsSync(true)});
    P.addListener("pushNotificationActionPerformed",function(ev){try{var dt=ev&&ev.notification&&ev.notification.data||{};if(dt.kind==="test"){setTimeout(function(){toast("Push notification works ✓")},800);return}if(dt.kind==="invite"&&ls("gwinvtest")==="1"){setTimeout(function(){toast("Invite push works ✓")},800);GWL.inviteTestCleanup&&GWL.inviteTestCleanup();return}}catch(e){}GWL.groupsSync(true)})}
  try{await P.createChannel({id:"invites",name:"Invites",description:"When someone invites you to their family or a group",importance:4,visibility:1})}catch(e){}
  var pm=await P.checkPermissions();if(pm.receive==="prompt"||pm.receive==="prompt-with-rationale")pm=await P.requestPermissions();
  if(pm.receive!=="granted")return "not allowed";
  await P.register();return "on"};

/* ---------- when it runs ---------- */
document.addEventListener("visibilitychange",function(){if(!document.hidden&&!GWL.testing&&GWL.loggedIn()&&D()&&D().profile&&S.code)GWL.groupsSync(true)});
setInterval(function(){if(document.hidden||GWL.testing||!GWL.loggedIn()||!S.code)return;GWL.groupsSync(false)},45000);
window.addEventListener("online",function(){if(GWL.loggedIn()&&S.code&&!GWL.testing)GWL.groupsSync(true)});
})();
