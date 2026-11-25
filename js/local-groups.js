/* ===== On-phone app: invites by mobile number (family + groups) and Groups / Trips =====
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

/* ---------- groups kept on this phone ---------- */
function groups(){var d=D();if(!d.groups)d.groups=[];return d.groups}
function grp(id){return groups().filter(function(g){return g.id===id})[0]}
function grpOf(prefix,id){return groups().filter(function(g){var x=g.items[prefix+id];return x&&!x.del})[0]}
function newGroup(id,key,by){return {id:id,key:key,created_by:by||null,seq:0,items:{},out:{},members:[myId()],pending:[]}}
function put(g,k,v){g.items[k]={v:v,by:myId(),at:now()};g.out[k]=1;save()}
function del(g,k){var x=g.items[k];g.items[k]={del:true,v:x&&x.v||null,by:myId(),at:now()};g.out[k]=1;save()}
function val(g,k){var x=g.items[k];return x&&!x.del?x.v:null}
function meta(g){return val(g,"meta")||{}}
function nameOf(g,u){var m=val(g,"m:"+u);return m&&m.name||(u===myId()?me():"Member")}
function isCreator(g){return g.created_by===myId()}

/* the shape the Groups screens expect (same as the internet version's my_groups) */
function view(g){var M=meta(g),ids=(g.members&&g.members.length?g.members.slice():[myId()]);
  var members=ids.map(function(u){var m=val(g,"m:"+u)||{};return {user_id:u,name:m.name||(u===myId()?me():"Member"),photo:m.photo||null,upis:[]}});
  var exp=[],set=[],rec=[];
  Object.keys(g.items).forEach(function(k){var x=g.items[k];if(!x||x.del)return;var id=k.slice(2),v=x.v||{};
    if(k.indexOf("e:")===0)exp.push(Object.assign({},v,{id:id,amount:Number(v.amount)||0,at:x.at,paid_by_name:nameOf(g,v.paid_by),created_by_name:nameOf(g,v.created_by),updated_by_name:x.by&&x.by!==v.created_by?nameOf(g,x.by):null}));
    else if(k.indexOf("s:")===0)set.push(Object.assign({},v,{id:id,amount:Number(v.amount)||0,settled_on:v.txn_date}));
    else if(k.indexOf("r:")===0)rec.push(Object.assign({},v,{id:id,amount:Number(v.amount)||0,paid_by_name:nameOf(g,v.paid_by)}))});
  var by=function(a,b){return String(b.txn_date||"").localeCompare(String(a.txn_date||""))||String(b.created_at||"").localeCompare(String(a.created_at||""))};
  exp.sort(by);set.sort(by);
  return {id:g.id,name:M.name||"Group",photo:M.photo||null,owner:g.created_by,created_by:g.created_by,start_date:M.start_date||null,end_date:M.end_date||null,simplify:M.simplify!==false,closed:!!M.closed,
    members:members,expenses:exp,settlements:set,recurring:rec,pending:(g.pending||[]).map(function(p){return {id:p.id,phone:p.phone,email:null,token:null}})}}

/* ---------- invites: inbox (to me) ---------- */
/* kept per login, so the self-check's test members never mix with yours */
var INB={};function inbox(){return INB[myId()]||[]}function setInbox(v){INB[myId()]=v}GWL.inbox=inbox;
async function fetchInbox(){var list=await srv("lm_invites_inbox",{}),k=await myKeys(),h=await pubHash(k.pub),out=[];
  for(var i=0;i<(list||[]).length;i++){var x=list[i];if(x.sealed_for!==h)continue;
    try{var o=await unseal(x.sealed);if(o.target!==x.target||o.kind!==x.kind||!o.key)continue;out.push({id:x.id,kind:x.kind,target:x.target,key:o.key,name:o.name||"",by:o.by||"Someone",at:x.created_at})}catch(e){}}
  var ch=JSON.stringify(out.map(function(x){return x.id}))!==JSON.stringify(inbox().map(function(x){return x.id}));setInbox(out);return ch}
GWL.fetchInbox=fetchInbox;

/* ---------- invites: sending ---------- */
function keyOf(kind,target){if(kind==="family"){var f=D().family;return f&&f.id===target?{key:f.key,name:"Family"}:null}var g=grp(target);return g?{key:g.key,name:meta(g).name||"Group"}:null}
/* the invite shows who asked, even when another member's phone locks it later */
function inviterName(kind,target,from){if(!from||from===myId())return me();
  if(kind==="group"){var g=grp(target);return g?nameOf(g,from):me()}
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
  r=await srv("lm_invite_respond",{p_id:id,p_accept:true});
  var g=grp(inv.target);if(!g){g=newGroup(inv.target,inv.key,null);groups().push(g)}else g.key=inv.key;
  put(g,"m:"+myId(),{name:me()});setInbox(inbox().filter(function(x){return x.id!==id}));
  try{await refreshMine()}catch(e){}try{await pushGroup(g);await pullGroup(g)}catch(e){}return inv.target};

/* ---------- sync: each group's items, encrypted ---------- */
var EV=function(){var d=D();if(!d.gevents)d.gevents=[];return d.gevents};
function event(g,seq,user,text){var l=EV();l.unshift({id:Number(seq)||0,actor:user,name:nameOf(g,user),group_id:g.id,text:text,at:now()});
  var lo=Date.now()-2*864e5;D().gevents=l.filter(function(e){return Date.parse(e.at)>lo}).slice(0,60)}
function evText(k,old,nw,deleted){var v=nw||{},o=old||{};
  if(k.indexOf("e:")===0)return deleted?"removed "+(o.title||"a payment"):(old?"changed ":"added ")+(v.title||"a payment")+" ("+(Number(v.amount)||0)+")";
  if(k.indexOf("s:")===0)return deleted?"removed a settlement":"settled up ("+(Number(v.amount)||0)+")";
  if(k.indexOf("m:")===0)return deleted?"left":(old?"":"joined");
  if(k==="meta"){if(!!v.closed!==!!o.closed)return v.closed?"closed the group":"reopened the group";return old?"updated the group":"created the group"}
  if(k.indexOf("r:")===0)return deleted?"removed a repeating payment":(old?"changed ":"added ")+"repeating "+(v.title||"payment");
  return ""}
async function pushGroup(g){var ks=Object.keys(g.out||{});if(!ks.length)return 0;var key=await GWL.aesKey(g.key),items=[];
  for(var i=0;i<ks.length;i++){var x=g.items[ks[i]];if(!x||x.del){items.push({item_id:ks[i],deleted:true});continue}
    var iv=rnd(12),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,te.encode(JSON.stringify(x.v)));items.push({item_id:ks[i],iv:C.b64e(iv),ct:C.b64e(ct)})}
  for(var j=0;j<items.length;j+=100){var part=items.slice(j,j+100);await srv("lm_group_push",{p_group:g.id,p_items:part});part.forEach(function(p){delete g.out[p.item_id]})}
  save();return items.length}
async function pullGroup(g){var key=await GWL.aesKey(g.key),ch=0,guard=0,mine=myId();
  while(guard++<40){var list=await srv("lm_group_pull",{p_group:g.id,p_since:g.seq||0});if(!Array.isArray(list)||!list.length)break;
    for(var i=0;i<list.length;i++){var e=list[i],k=e.item_id,old=g.items[k];g.seq=Math.max(g.seq||0,Number(e.seq)||0);
      if(g.out&&g.out[k])continue;   /* my newer change is still waiting to upload */
      if(e.deleted){if(old&&!old.del){g.items[k]={del:true,v:old.v,by:e.user,at:now()};ch++;if(e.user!==mine)event(g,e.seq,e.user,evText(k,old.v,null,true))}continue}
      try{var v=JSON.parse(td.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:C.b64d(e.iv)},key,C.b64d(e.ct))));
        var same=old&&!old.del&&JSON.stringify(old.v)===JSON.stringify(v);g.items[k]={v:v,by:e.user,at:now()};
        if(!same){ch++;var t=evText(k,old&&!old.del?old.v:null,v,false);if(e.user!==mine&&t)event(g,e.seq,e.user,t)}}catch(x){}}
    if(list.length<500)break}
  if(ch)save();return ch}
/* who is in which group, from the server (no content) */
async function refreshMine(){var list=await srv("lm_groups_mine",{})||[],by={},ch=false;list.forEach(function(x){by[x.id]=x});
  var keep=groups().filter(function(g){var s=by[g.id];if(!s){ch=true;return false}
    var mem=(s.members||[]).slice().sort().join(","),pen=JSON.stringify(s.pending||[]);
    if(mem!==(g.members||[]).slice().sort().join(",")||pen!==JSON.stringify(g.pending||[])||g.created_by!==s.created_by){g.members=s.members||[];g.pending=s.pending||[];g.created_by=s.created_by;ch=true}return true});
  if(ch){D().groups=keep;save()}return ch}
var gsync=null,lastInbox=0;
GWL.groupsSync=function(full){if(!GWL.loggedIn()||!D()||!D().profile)return Promise.resolve(false);if(gsync)return gsync;
  gsync=(async function(){var ch=false;
    try{await publishKey()}catch(e){}
    try{if(await refreshMine())ch=true}catch(e){}
    for(var i=0;i<groups().length;i++){var g=groups()[i];try{if(await pushGroup(g))ch=true;if(await pullGroup(g))ch=true}catch(e){}}
    if(full||Date.now()-lastInbox>110000){lastInbox=Date.now();
      try{if(await fetchInbox())ch=true}catch(e){}
      try{await resealSent()}catch(e){}
      if(D().family)try{var p=await srv("lm_family_pending",{});if(JSON.stringify(p)!==JSON.stringify(D().family.invites||[])){D().family.invites=p;GWL.mark("data",true);ch=true}}catch(e){}}
    return ch})();
  return gsync.then(function(ch){gsync=null;if(ch&&!GWL.testing){try{if(typeof loadGroups==="function"&&S.code)loadGroups(true)}catch(e){}}return ch},function(e){gsync=null;return false})};

/* ---------- the group requests the Groups screens make, answered on this phone ---------- */
async function after(g){try{await pushGroup(g)}catch(e){}}
function mustGroup(id){var g=grp(id);if(!g)throw new Error("This group is not on this phone");return g}
function onlyCreator(g,what){if(!isCreator(g))throw new Error("Only the person who made the group can "+what)}
var H={
  my_groups:function(){var inv=inbox().map(function(i){return {id:i.id,kind:i.kind,group:i.kind==="family"?"Family sharing":i.name,group_photo:null,by:i.by,by_photo:null}});
    return {groups:groups().map(view),invites:inv,events:EV().slice()}},
  my_invites:function(){return []},
  group_create:async function(a){need();var id=await srv("lm_group_create",{}),g=newGroup(id,C.b64e(rnd(32)),myId());groups().push(g);
    put(g,"meta",{name:String(a.p_name||"Group").slice(0,40),photo:a.p_photo||null,start_date:a.p_start||null,end_date:a.p_end||null,simplify:a.p_simplify!==false,closed:false});
    put(g,"m:"+myId(),{name:me()});await after(g);return id},
  group_update:async function(a){var g=mustGroup(a.p_group),m=Object.assign({},meta(g));m.name=String(a.p_name||m.name).slice(0,40);if(a.p_change_photo)m.photo=a.p_photo||null;put(g,"meta",m);await after(g);return true},
  group_settings:async function(a){var g=mustGroup(a.p_group);onlyCreator(g,"change the dates");var m=Object.assign({},meta(g));m.start_date=a.p_start||null;m.end_date=a.p_end||null;m.simplify=a.p_simplify!==false;put(g,"meta",m);await after(g);return true},
  group_set_closed:async function(a){var g=mustGroup(a.p_group);onlyCreator(g,"close or reopen it");var m=Object.assign({},meta(g));m.closed=!!a.p_closed;put(g,"meta",m);await after(g);return true},
  group_invite:async function(a){var g=mustGroup(a.p_group),r=await GWL.invite("group",g.id,a.p_email);try{await refreshMine()}catch(e){}return {status:r.status,token:null}},
  group_invite_respond:function(a){return GWL.inviteRespond(a.p_id,!!a.p_accept)},
  group_cancel_invite:async function(a){need();await srv("lm_invite_cancel",{p_id:a.p_id});try{await refreshMine()}catch(e){}if(D().family)D().family.invites=(D().family.invites||[]).filter(function(x){return x.id!==a.p_id});return true},
  group_save_expense:async function(a){var g=mustGroup(a.p_group),M=meta(g),id=a.p_id||GWL.newId(),old=val(g,"e:"+id);
    if(!old&&M.closed)throw new Error("This group is closed. Reopen it to add payments.");
    if(!old&&M.end_date&&today()>M.end_date)throw new Error("This trip ended on "+M.end_date+". Change the dates to add more payments.");
    if(!g.members.some(function(u){return u===myId()}))throw new Error("You are not in this group");
    put(g,"e:"+id,{txn_id:a.p_txn||(old&&old.txn_id)||null,paid_by:a.p_paid_by,amount:Number(a.p_amount)||0,txn_date:a.p_date||today(),title:String(a.p_title||"Payment").slice(0,80),split_mode:a.p_mode||"equal",shares:a.p_shares||{},
      note:a.p_note||null,photo:a.p_photo||null,orig_cur:a.p_cur||null,orig_amount:a.p_orig||null,rate:a.p_rate||null,cat:a.p_cat||null,created_by:old?old.created_by:myId(),created_at:old?old.created_at:now()});
    await after(g);return id},
  group_delete_expense:async function(a){var g=grpOf("e:",a.p_id);if(!g)throw new Error("Payment not found");del(g,"e:"+a.p_id);await after(g);return true},
  group_settle:async function(a){var g=mustGroup(a.p_group),id=GWL.newId();put(g,"s:"+id,{from_user:a.p_from,to_user:a.p_to,amount:Number(a.p_amount)||0,txn_date:a.p_date||today(),method:a.p_method||null,txn_id:a.p_txn||null,created_by:myId(),created_at:now()});await after(g);return id},
  group_delete_settlement:async function(a){var g=grpOf("s:",a.p_id);if(!g)throw new Error("Settlement not found");del(g,"s:"+a.p_id);await after(g);return true},
  group_rec_save:async function(a){var g=mustGroup(a.p_group),id=a.p_id||GWL.newId(),old=val(g,"r:"+id)||{};
    put(g,"r:"+id,{title:String(a.p_title||"Rent").slice(0,60),amount:Number(a.p_amount)||0,day:Number(a.p_day)||1,mode:a.p_mode||"equal",people:a.p_people||[],paid_by:a.p_paid_by,last_month:old.last_month||null,created_by:old.created_by||myId()});await after(g);return id},
  group_rec_mark:async function(a){var g=grpOf("r:",a.p_id);if(!g)return false;var r=Object.assign({},val(g,"r:"+a.p_id));r.last_month=a.p_month;put(g,"r:"+a.p_id,r);await after(g);return true},
  group_rec_delete:async function(a){var g=grpOf("r:",a.p_id);if(!g)return false;del(g,"r:"+a.p_id);await after(g);return true},
  group_leave:async function(a){need();var g=mustGroup(a.p_group);
    if(typeof gNets==="function"){var n=gNets(view(g))[myId()]||0;if(Math.abs(n)>0.49)throw new Error("Settle up first: your balance in this group is not zero.")}
    try{del(g,"m:"+myId());await pushGroup(g)}catch(e){}
    await srv("lm_group_leave",{p_group:g.id});D().groups=groups().filter(function(x){return x.id!==g.id});save();return true},
  group_delete:async function(a){need();var g=mustGroup(a.p_group);onlyCreator(g,"delete it");await srv("lm_group_delete",{p_group:g.id});D().groups=groups().filter(function(x){return x.id!==g.id});save();return true},
  group_join_token:function(){throw new Error("Invite links are not used in this app. Ask them to invite your mobile number.")}
};
var _idle=GWL.idle;GWL.idle=async function(){if(_idle)await _idle();try{if(gsync)await gsync}catch(e){}};
GWL.grpc=function(fn,a){return H[fn]?H[fn](a||{}):undefined};GWL.grpcHas=function(fn){return !!H[fn]};
GWL.groupsLocal=groups;GWL.groupView=view;

/* ---------- push notifications (Firebase), so an invite is noticed while the app is closed ---------- */
/* tell the invitee's phone: the server sends only "Someone invited you…"; it never knows names */
function notify(id){if(GWL.testing&&!GWL.pushInTests)return;try{GWL.fn("lm-push",{invite:id}).catch(function(){})}catch(e){}}
function pushP(){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.PushNotifications||null}catch(e){return null}}
var pushOn=false;
GWL.pushSetup=async function(){var P=pushP();if(!P||!GWL.loggedIn()||GWL.testing)return "no";
  try{var S2=Capacitor.Plugins.SmsTracker,a=S2&&S2.appInfo?await S2.appInfo():null;if(!a||!a.pushReady)return "not in this build"}catch(e){return "no"}
  if(!pushOn){pushOn=true;
    P.addListener("registration",async function(t){var tok=t&&t.value;if(!tok)return;var tag=GWL.uid()+":"+tok;if(ls("gwpush")===tag)return;try{await srv("lm_set_push",{p_token:tok,p_platform:"android"});ls("gwpush",tag)}catch(e){}});
    P.addListener("registrationError",function(){});
    P.addListener("pushNotificationReceived",function(){GWL.groupsSync(true)});
    P.addListener("pushNotificationActionPerformed",function(ev){try{var dt=ev&&ev.notification&&ev.notification.data||{};if(dt.kind==="test"){setTimeout(function(){toast("Push notification works ✓")},800);return}}catch(e){}GWL.groupsSync(true).then(function(){try{if(S.code){go("home");loadGroups(true)}}catch(e){}})})}
  try{await P.createChannel({id:"invites",name:"Invites",description:"When someone invites you to their family or a group",importance:4,visibility:1})}catch(e){}
  var pm=await P.checkPermissions();if(pm.receive==="prompt"||pm.receive==="prompt-with-rationale")pm=await P.requestPermissions();
  if(pm.receive!=="granted")return "not allowed";
  await P.register();return "on"};

/* ---------- when it runs ---------- */
document.addEventListener("visibilitychange",function(){if(!document.hidden&&!GWL.testing&&GWL.loggedIn()&&D()&&D().profile&&S.code)GWL.groupsSync(true)});
setInterval(function(){if(document.hidden||GWL.testing||!GWL.loggedIn()||!S.code)return;GWL.groupsSync(false)},45000);
window.addEventListener("online",function(){if(GWL.loggedIn()&&S.code&&!GWL.testing)GWL.groupsSync(true)});
})();
