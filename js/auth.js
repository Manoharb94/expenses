/* ---------- accounts, login, family ---------- */
var AUTHB=URLB.replace("/rest/v1/","/auth/v1/");
S.auth=null;S.view="";S.amsg="";S.aok=false;S.profile=null;S.members=null;S.fmode="create";S.newCode="";
function authMsg(o,st,ph){var c=o.error_code||o.code||"",m=o.msg||o.message||o.error_description||o.error||("Error "+st);
  var M={invalid_credentials:"Wrong mobile number, email or password. If you have not verified your mobile yet, log in with your email.",phone_exists:"This mobile number is already used by another account.",over_sms_send_rate_limit:"Please wait a minute before asking for another code.",sms_send_failed:"We could not send the SMS. Please try again in a minute.",otp_expired:"That code is wrong or has expired. Check it, or ask for a new one.",phone_not_confirmed:"Your mobile is not verified yet.",user_already_exists:"This email already has an account. Please log in.",email_exists:"This email already has an account. Please log in.",email_not_confirmed:"Please confirm your email first. Check your inbox.",weak_password:"Choose a stronger password (at least 8 characters).",over_email_send_rate_limit:"Too many emails sent. Please wait a few minutes and try again.",over_request_rate_limit:"Too many tries. Please wait a few minutes and try again.",signup_disabled:"New sign-ups are switched off in Supabase.",validation_failed:"Enter a valid email address.",email_address_invalid:"Enter a valid email address.",same_password:"Choose a password different from the old one.",user_not_found:"Wrong email or password."};
  if(/wait a minute|too many codes|busy right now|only indian/i.test(m))return m;
  if(/expired or is invalid|invalid.*token|token.*invalid/i.test(m))return "That code is wrong or has expired. Check it, or ask for a new one.";
  if(ph&&/hook|error sending|unexpected_failure|sms/i.test(c+" "+m))return "We could not send the SMS just now. Please try again in a minute.";
  if(/error sending|sending.*email|unexpected_failure/i.test(c+" "+m)){try{console.warn("Auth email failed:",c,m)}catch(e){}return "We could not send the email just now. Please try again in a few minutes."}
  return M[c]||m}
function errText(e){var m=String(e&&e.message||e);if(e&&e.name==="TypeError")return "Could not reach the server. Check your internet and try again.";
  if(/PGRST202|Could not find the function|schema cache/.test(m))return "Accounts are not set up yet. Run auth.sql in Supabase, then try again.";
  var j=m.replace(/^\d+\s/,"");try{var o=JSON.parse(j);m=o.message||o.msg||o.error_description||o.error||m}catch(x){}return m}
async function authFetch(path,method,body,token){
  var h={apikey:KEY,"Content-Type":"application/json"};if(token)h.Authorization="Bearer "+token;
  var r=await fetch(AUTHB+path,{method:method,headers:h,body:body?JSON.stringify(body):undefined});
  var t=await r.text(),o={};try{o=t?JSON.parse(t):{}}catch(e){}
  if(!r.ok){var e=new Error(authMsg(o,r.status,!!(body&&body.phone)||/^resend|^otp/.test(path)&&!(body&&body.email)));e.status=r.status;e.code=o.error_code||o.code||"";throw e}return o}
async function acctStatus(e){try{var r=await fetch(URLB+"rpc/account_status",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({p_email:e})});if(!r.ok)return null;var t=await r.json();return typeof t==="string"?t:null}catch(x){return null}}
function phDigits(x){var d=String(x||"").replace(/\D/g,"");if(d.length===12&&d.indexOf("91")===0)d=d.slice(2);else if(d.length===11&&d.charAt(0)==="0")d=d.slice(1);return d}
function isMob(x){return /^[6-9]\d{9}$/.test(phDigits(x))}
function phE164(x){return "+91"+phDigits(x)}
function phShow(x){var d=phDigits(x);return d.length===10?"+91 "+d.slice(0,5)+" "+d.slice(5):String(x||"")}
function phMask(x){var d=phDigits(x);return d.length===10?"+91 •••••• "+d.slice(6):""}
function idKind(x){x=String(x||"").trim();return x.indexOf("@")>=0?(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)?"email":""):(isMob(x)?"mobile":"")}
async function phoneStatus(p){try{var r=await fetch(URLB+"rpc/phone_status",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({p_phone:p})});if(!r.ok)return null;var t=await r.json();return typeof t==="string"?t:null}catch(x){return null}}
var EXISTS_MSG="This email already has an account. Please log in, or tap “Forgot password” if you don’t remember it.";
function saveSess(o){S.auth={access:o.access_token,refresh:o.refresh_token,exp:o.expires_at||(Math.floor(Date.now()/1000)+(o.expires_in||3600)),email:(o.user&&o.user.email)||(S.auth&&S.auth.email)||"",phone:(o.user&&o.user.phone)||(S.auth&&S.auth.phone)||""};ls("sb",JSON.stringify(S.auth))}
function refreshSess(){
  if(S.refreshing)return S.refreshing;
  S.refreshing=(async function(){try{
    if(!S.auth||!S.auth.refresh)throw new Error("Please log in again.");
    var r=await fetch(AUTHB+"token?grant_type=refresh_token",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:S.auth.refresh})});
    if(!r.ok){if(r.status===400||r.status===401||r.status===403||r.status===422){logoutLocal("Your session ended. Please log in again.");throw new Error("Please log in again.")}throw new Error("Could not reach the server. Try again in a moment.")}
    saveSess(await r.json())}finally{S.refreshing=null}})();
  return S.refreshing}
async function ensureToken(){if(S.auth&&S.auth.exp-60<Date.now()/1000)await refreshSess()}
function logoutLocal(msg){try{var pgx=document.getElementById("pgate");if(pgx)pgx.remove()}catch(e){}try{ls("pvok","")}catch(e){}try{if(typeof nativeSmsOK==="function"&&nativeSmsOK()){smsPlugin().disable();S.nsms=null}}catch(e){}S.auth=null;ls("sb","");ls("xc","");ls("ob","");S.profile=null;S.code="";S.name="";S.txns=[];S.budgets=[];S.fixed=[];S.goals=[];S.loans=[];S.gents=[];S.members=null;S.loaded=false;S.tab="home";S.view="login";S.amsg=msg||"";S.aok=false;if(typeof render==="function")render()}
async function loadMembers(){try{S.members=await api("members?select=user_id,display_name,role,created_at&order=created_at.asc")||[]}catch(e){S.members=[]}}
async function enter(){
  var fresh=!S.loaded&&!S.offline;if(fresh)try{window.brandLoader(true)}catch(e){}
  try{await enter0()}finally{if(fresh&&S.view)try{window.brandLoader(false)}catch(e){}}}
async function enter0(){
  S.view="";
  var pre=S.auth?startFetch():null;
  try{S.profile=await api("rpc/my_profile",{method:"POST",body:"{}"})}
  catch(e){if(!S.auth)return;if(isNet(e)&&S.profile&&S.loaded){S.view="";offBar();return}S.view="err";S.amsg=errText(e);render();return}
  if(!S.profile){var ps=null;try{ps=JSON.parse(ls("pends")||"null")}catch(e){}
    if(ps&&ps.n&&S.auth&&(ps.p?phDigits(S.auth.phone)===phDigits(ps.p):(!S.auth.email||String(S.auth.email).toLowerCase()===ps.e))){
      try{if(ps.c)await api("rpc/join_household",{method:"POST",body:JSON.stringify({p_code:ps.c,p_display:ps.n})});
        else{var r0=await api("rpc/create_household",{method:"POST",body:JSON.stringify({p_name:"",p_display:ps.n})});S.newCode=r0&&r0.invite_code}
        ls("pends","");ls("pendjoin","");ls("tour6","");ls("tournew","1");if(ps.c)ls("tourjoin","1");
        S.profile=await api("rpc/my_profile",{method:"POST",body:"{}"});if(ps.c)toast("Welcome to the family!")}
      catch(e2){ls("pends","");S._fprefill={c:ps.c,n:ps.n};S._fm=1;S.fmode=ps.c?"join":"create";try{S.invites=await api("rpc/my_invites",{method:"POST",body:"{}"})||[]}catch(e){S.invites=[]}S.view="family";S.amsg=errText(e2);render();return}}
    if(!S.profile){try{S.invites=await api("rpc/my_invites",{method:"POST",body:"{}"})||[]}catch(e){S.invites=[]}S.view="family";S.amsg="";render();return}}
  try{window.brandStep("Getting your money ready…")}catch(e){}S.code=S.profile.household_id;S.name=S.profile.display_name;ls("name","");ls("code","");S.view="";S.pf=ls("pf")||S.name;var qq=!!(S._cached&&S.loaded);S._cached=false;Promise.resolve(load(qq,pre)).then(function(){touch(true);setTimeout(phoneNudge,800);setTimeout(joinCheck,1500)},function(){touch(true);setTimeout(phoneNudge,800)});api("rpc/my_invites",{method:"POST",body:"{}"}).then(function(r){S.invites=r||[];if(S.invites.length&&S.tab==="home")render()}).catch(function(){})}
async function phoneNudge(force){
  /* Mandatory: every open, until this account has a verified mobile. Never blocks on a network error. */
  if(!S.auth||!S.code||S.view)return;if(S._pn&&!force)return;
  var key=String(S.auth.email||S.auth.phone||"");
  if(!force&&key&&ls("pvok")===key){
    if(!S.myPhone&&!S._pfx){S._pfx=1;api("rpc/my_phone_norm",{method:"POST",body:"{}"}).then(function(m){if(m&&/^\d{10,13}$/.test(String(m))){S.myPhone=String(m);if(S.tab==="prof"||S.tab==="menu")render()}}).catch(function(){S._pfx=0})}
    return}
  S._pn=1;
  var mine=null;try{mine=await api("rpc/my_phone_norm",{method:"POST",body:"{}"})}catch(e){S._pn=0;return}
  S.myPhone=mine&&/^\d{10,13}$/.test(String(mine))?String(mine):"";
  if(mine){if(key)ls("pvok",key);var g0=document.getElementById("pgate");if(g0)g0.remove();if(S.tab==="prof")render();return}
  phoneSheet(!force)}
function phoneSheet(must){
  var sh=document.getElementById("sheet");if(!sh||typeof gSheet!=="function")return;
  var ps={step:"num",ph:"",msg:""};
  var hd=function(t){return must?'<div style="text-align:center;margin:8px 0 14px"><div style="font-size:40px">📱</div><b style="font-size:21px">'+t+'</b></div>':gHead(t)};
  function draw(){var h;
    if(ps.step==="num")h=hd("Verify your mobile")+'<div class="note" style="margin:0 0 10px">'+(must?'To keep using Gharwise, verify your mobile number once. ':'')+'Log in with your mobile number and your current password, and get invited to groups by number. Your data stays exactly as it is.</div><div class="mobw"><span class="mcc">+91</span><input id="pvn" type="tel" inputmode="numeric" maxlength="14" placeholder="Mobile number" autocomplete="tel-national" value="'+esc(ps.ph)+'"></div><div class="amsg" id="pvm">'+esc(ps.msg)+'</div><button class="btn" id="pvs">Send Code</button>'+(must?'':'<button class="btn ghost" style="margin-top:8px" id="pvl">Not Now</button>');
    else if(ps.step==="otp")h=hd("Enter the code")+'<div class="note" style="margin:0 0 10px">We sent a 6-digit code by SMS to <b>'+esc(phShow(ps.ph))+'</b>.</div><input id="pvc" class="otpin" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"><div class="amsg'+(ps.ok?' ok':'')+'" id="pvm">'+esc(ps.msg)+'</div><button class="btn" id="pvv">Verify</button><div style="text-align:center"><button class="alink" id="pvr">Send the code again</button> · <button class="alink" id="pvch">Change number</button></div>';
    else h=hd("Mobile verified")+'<div style="text-align:center;padding:6px 0 12px"><div style="font-size:44px">✅</div><div style="font-weight:700;margin:6px 0">'+esc(phShow(ps.ph))+'</div><div class="note">From now on you can log in with this number and your current password. Your email login still works too.</div></div><button class="btn" id="pvd">Done</button>';
    if(must)h+='<div style="text-align:center;margin-top:14px"><button class="alink" id="pvhelp">Can’t receive the code?</button> · <button class="alink" id="pvout">Log out</button></div><div id="pvhelpt" class="note" style="display:none;margin-top:10px;text-align:center">Email <b>manoharb@gharwise.net</b> from the address you signed up with, and tell us your mobile number. We will help you get in.</div>';
    var x;if(must){var ov=document.getElementById("pgate");if(!ov){ov=document.createElement("div");ov.id="pgate";ov.style.cssText="position:fixed;inset:0;z-index:9000;background:var(--bg);overflow:auto;-webkit-overflow-scrolling:touch";document.body.appendChild(ov)}
      ov.innerHTML='<div style="max-width:460px;margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 18px 40px">'+h+'</div>';x=ov}else{x=gSheet(h);gBindX(x)}
    var hp=x.querySelector("#pvhelp");if(hp)hp.onclick=function(){x.querySelector("#pvhelpt").style.display="block"};
    var lo=x.querySelector("#pvout");if(lo)lo.onclick=function(){var o=document.getElementById("pgate");if(o)o.remove();authAction("out")};
    var m=function(t,ok){ps.msg=t||"";ps.ok=!!ok;var e=x.querySelector("#pvm");if(e){e.textContent=ps.msg;e.className="amsg"+(ok?" ok":"")}};
    var l=x.querySelector("#pvl");if(l)l.onclick=gClose;
    var d=x.querySelector("#pvd");if(d)d.onclick=function(){if(must){var o=document.getElementById("pgate");if(o)o.remove()}else gClose();render()};
    var snd=async function(btn){var v=(x.querySelector("#pvn")||{}).value||ps.ph;ps.ph=v;if(!isMob(v))return m("Enter a 10-digit mobile number.");
      btn.disabled=true;btn.textContent="Sending…";
      try{var stt=await phoneStatus(phE164(v));if(stt==="confirmed"){btn.disabled=false;btn.textContent="Send Code";return m("This number is already used by another account.")}
        await ensureToken();await authFetch("user","PUT",{phone:phE164(v)},S.auth.access);ps.step="otp";ps.msg="";draw()}
      catch(e){btn.disabled=false;btn.textContent="Send Code";m(errText(e))}};
    var sb=x.querySelector("#pvs");if(sb)sb.onclick=function(){snd(sb)};
    var vb=x.querySelector("#pvv");if(vb)vb.onclick=async function(){var c=(x.querySelector("#pvc").value||"").replace(/\s/g,"");if(c.length<4)return m("Enter the 6-digit code.");
      vb.disabled=true;vb.textContent="Checking…";
      try{await ensureToken();var o=await authFetch("verify","POST",{type:"phone_change",phone:phE164(ps.ph),token:c});if(o&&o.access_token)saveSess(o);
        S.myPhone=phE164(ps.ph).replace("+","");ls("lid",phE164(ps.ph));ps.step="done";draw();toast("Mobile verified")}
      catch(e){vb.disabled=false;vb.textContent="Verify";m(errText(e))}};
    var rs=x.querySelector("#pvr");if(rs)rs.onclick=async function(){if(Date.now()-(S._pcd||0)<60000)return m("Please wait a minute before asking again.");S._pcd=Date.now();
      try{await ensureToken();await authFetch("user","PUT",{phone:phE164(ps.ph)},S.auth.access);m("Sent again. It can take up to a minute.",true)}catch(e){m(errText(e))}};
    var ch=x.querySelector("#pvch");if(ch)ch.onclick=function(){ps.step="num";ps.msg="";draw()}}
  draw()}
function touch(first){if(!S.auth||Date.now()-(S._tt||0)<30*60000)return;S._tt=Date.now();var pwa=false;try{pwa=nativeApp()||window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){}
  api("rpc/touch",{method:"POST",body:JSON.stringify({p_os:phoneOS(),p_pwa:pwa,p_ms:first&&!S._ttm?Math.round(performance.now()):null})}).catch(function(){});S._ttm=1}
document.addEventListener("visibilitychange",function(){if(!document.hidden&&S.code)touch()});
function phoneRecheck(){if(document.hidden||!S.auth||!S.code||document.getElementById("pgate"))return;S._pn=0;phoneNudge();joinCheck()}
document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(phoneRecheck,600)});
window.addEventListener("pageshow",function(){setTimeout(phoneRecheck,600)});
window.addEventListener("focus",function(){setTimeout(phoneRecheck,600)});
var APP_URL="https://gharwise.net/app.html",PLAY_URL="";
function joinLink(c){return APP_URL+"?join="+encodeURIComponent(c)}
function joinMsg(c,nm){return (nm||"I")+" invited you to share family expenses on Gharwise.\n\n1) Open this link and install the app: "+joinLink(c)+"\n2) Create your account. Your invite code "+c+" is filled in for you."+(PLAY_URL?"\n\nAndroid app: "+PLAY_URL:"")}
function shareBtns(pre){return '<div class="note" style="margin:10px 0 6px">Send the invite link. It opens the app and fills in the code.</div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn s" '+pre+'="wa">💬 WhatsApp</button><button class="btn ghost s" '+pre+'="mail">✉️ Email</button><button class="btn ghost s" '+pre+'="link">🔗 Copy link</button></div>'}
async function shareCode(kind,c,nm){if(!c)return;var msg=joinMsg(c,nm);
  if(kind==="wa"){window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");return}
  if(kind==="mail"){location.href="mailto:?subject="+encodeURIComponent("Join my family on Gharwise")+"&body="+encodeURIComponent(msg);return}
  if(kind==="link"){toast(await copyText(joinLink(c))?"Link copied":"Press and hold to copy: "+joinLink(c))}}
function captureJoin(){try{var u=new URLSearchParams(location.search),c=(u.get("join")||"").trim();if(c){ls("pendjoin",c.slice(0,40));u.delete("join");var q=u.toString();history.replaceState(null,"",location.pathname+(q?"?"+q:"")+location.hash)}}catch(e){}}
function linkErr(m,c){if(c==="otp_expired"||/expired|invalid/i.test(m||""))return "That email link has expired or was already used (some email apps open links early). Log in, or tap Forgot password to get a fresh email, or use the code in the email.";return m||"That link did not work."}
function parseHash(){var o={};try{new URLSearchParams(location.hash.replace(/^#/,"")).forEach(function(v,k){o[k]=v})}catch(e){}return o}
async function boot(){
  captureJoin();try{captureG()}catch(e){}var hp=parseHash(),qp={};try{new URLSearchParams(location.search).forEach(function(v,k){qp[k]=v})}catch(e){}
  if(qp.token_hash&&qp.type){var th=qp.token_hash,ty=qp.type;try{history.replaceState(null,"",location.pathname)}catch(e){}
    try{var vo=await authFetch("verify","POST",{type:ty,token_hash:th});saveSess(vo);if(ty==="recovery"){S.view="newpw";render();return}}
    catch(e){S.view="login";S.amsg=linkErr(e.message);render();return}}
  if(!hp.error_description&&qp.error_description){hp.error_description=qp.error_description;hp.error_code=qp.error_code;try{history.replaceState(null,"",location.pathname)}catch(e){}}
  if(hp.access_token){
    saveSess({access_token:hp.access_token,refresh_token:hp.refresh_token,expires_in:parseInt(hp.expires_in,10)||3600});
    try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
    if(hp.type==="recovery"){S.view="newpw";render();return}
  }else if(hp.error_description){
    S.view="login";S.amsg=linkErr(hp.error_description.replace(/\+/g," "),hp.error_code);try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}render();return}
  if(!S.auth){S.view="login";render();return}
  var cc=readCache();if(cc){useCache(cc);render();S._cached=true}else render();
  await enter()}
async function copyText(t){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return true}}catch(e){}
  var a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0";
  document.body.appendChild(a);var ok=false;try{a.select();a.setSelectionRange(0,t.length);ok=document.execCommand("copy")}catch(e){}
  document.body.removeChild(a);return ok}
var EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
function authView(){
  var v=S.view,legacy=!!ls("code"),h='<div class="brand"><svg width="84" height="84" style="display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">  <defs>    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">      <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c1d95"/>    </linearGradient>    <radialGradient id="glow" cx="0.25" cy="0.15" r="0.7">      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>    </radialGradient>  </defs>  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>  <rect width="1024" height="1024" rx="230" fill="url(#glow)"/>    <path d="M248 488 L512 268 L776 488" fill="none" stroke="#fff" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>    <rect x="356" y="652" width="84" height="120" rx="42" fill="#fff" opacity=".78"/>  <rect x="470" y="582" width="84" height="190" rx="42" fill="#fff"/>  <rect x="584" y="512" width="84" height="260" rx="42" fill="#5eead4"/></svg></div><h1 style="text-align:center;margin-bottom:2px">Gharwise</h1><div class="mute" style="text-align:center;margin-bottom:14px">Family money, made clear</div><div class="card">';
  var mobInp=function(id,val){return '<div class="mobw"><span class="mcc">+91</span><input id="'+id+'" type="tel" inputmode="numeric" maxlength="14" placeholder="Mobile number" autocomplete="tel-national"'+(val?' value="'+esc(val)+'"':'')+'></div>'};
  var idInp=function(val){return '<input id="a_em" type="text" placeholder="Mobile number or email" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"'+(val?' value="'+esc(val)+'"':'')+'>'};
  var inp=function(id,ph,type,ac,val){var i='<input id="'+id+'" type="'+type+'" placeholder="'+ph+'" autocomplete="'+ac+'"'+(type==="email"?' inputmode="email" autocapitalize="off" autocorrect="off"':'')+(val?' value="'+esc(val)+'"':'')+'>';return type==="password"?'<div class="pwrap">'+i+'<button type="button" class="eye" data-eye="'+id+'" aria-label="Show password">'+EYE+'</button></div>':i};
  var btn=function(a,t){return '<button class="btn" data-a="'+a+'">'+t+'</button>'};
  var lnk=function(a,t){return '<div style="text-align:center"><button class="alink" data-a="'+a+'">'+t+'</button></div>'};
  var msg='<div id="amsg" class="amsg'+(S.aok?" ok":"")+'">'+esc(S.amsg)+'</div>';
  var pj=ls("pendjoin"),pjn=pj?'<div class="note" style="margin-bottom:10px;border:1px solid var(--line);border-radius:12px;padding:10px">🎉 You have been invited to a family. Create your account (or log in) and you will join it automatically.</div>':'';
  if(v==="login"){h+='<h2 style="margin-top:0">Log in</h2>'+pjn+(legacy?'<div class="note" style="margin-bottom:10px">The app now uses accounts. Create an account, then join your family with the invite code. Your saved expenses stay as they are.</div>':'')+idInp(S.lastEmail)+inp("a_pw","Password","password","current-password")+msg+btn("login","Log in")+lnk("go-forgot","Forgot password?")+lnk("go-signup","New here? Create an account")}
  else if(v==="signup"){var jc=ls("pendjoin")||"",so=!!jc;h+='<h2 style="margin-top:0">Create account</h2>'+pjn+inp("a_nm","Your name, e.g. Manohar","text","given-name",S.lastName)+mobInp("a_mb",S.lastMob)+inp("a_pw","Password (8+ characters)","password","new-password")+'<div id="fcw" style="display:'+(so?'block':'none')+'">'+inp("a_fc","Family code","text","off",jc)+'<div class="note" style="margin:-4px 0 10px">Ask the person who set up Gharwise for the code. You will join their family.</div></div>'+msg+btn("signup","Create account")+'<div style="text-align:center"><button class="alink" id="sfcb" data-a="sfc">'+(so?'No family code? Start on my own':'Have a family code? Join family')+'</button></div>'+lnk("go-login","I already have an account")}
  else if(v==="forgot"){h+='<h2 style="margin-top:0">Reset password</h2><div class="note" style="margin-bottom:10px">Enter your mobile number and we will send a code to choose a new password. If you have not verified a mobile yet, enter your email instead.</div>'+idInp(S.lastEmail)+msg+btn("forgot","Send Code or Link")+lnk("go-login","Back to log in")}
  else if(v==="pverify"){h+='<h2 style="margin-top:0">'+(S.pmode==="reset"?"Reset password":"Verify your mobile")+'</h2><div class="note" style="margin-bottom:10px">We sent a 6-digit code by SMS to <b>'+esc(phShow(S.vphone||""))+'</b>. It can take up to a minute.</div><input id="a_code" class="otpin" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······">'+msg+btn("pcode","Verify")+lnk("presend","Send the code again")+lnk(S.pmode==="reset"?"go-forgot":"go-signup","Change number")+lnk("go-login","Back to log in")}
  else if(v==="verify"){h+='<h2 style="margin-top:0">Confirm your email</h2><div class="note" style="margin-bottom:10px">We sent a message to <b>'+esc(S.vemail||"")+'</b>. Tap the link inside it, or type the code from it here.</div><input id="a_code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Code from the email">'+msg+btn("vcode","Confirm")+lnk("vresend","Send the email again")+lnk("go-login","Back to log in")}
  else if(v==="rcode"){h+='<h2 style="margin-top:0">Reset password</h2><div class="note" style="margin-bottom:10px">Tap the link in the email we sent to <b>'+esc(S.vemail||"")+'</b>, or type the code from it here and choose a new password.</div><input id="a_code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Code from the email">'+inp("a_pw","New password (8+ characters)","password","new-password")+inp("a_pw2","Repeat new password","password","new-password")+msg+btn("rcode","Save new password")+lnk("rresend","Send the email again")+lnk("go-login","Back to log in")}
  else if(v==="newpw"){h+='<h2 style="margin-top:0">Choose a new password</h2>'+inp("a_pw","New password (8+ characters)","password","new-password")+inp("a_pw2","Repeat new password","password","new-password")+msg+btn("newpw","Save password")}
  else if(v==="family"){var pj2=ls("pendjoin");if(pj2&&!S._fm)S.fmode="join";var c=S.fmode==="create";
    if((S.invites||[]).length){h+='<h2 style="margin-top:0">You’re invited</h2>'+inp("f_inm","Your name, e.g. Manjari","text","given-name")+(S.invites||[]).map(function(x){return '<div class="card" style="box-shadow:none;border:1px solid var(--line);margin:8px 0"><b>'+esc(x.by)+'</b> invited you to <b>'+esc(x.family)+'</b><div class="note" style="margin:2px 0 10px">'+x.members+' '+(x.members===1?'person':'people')+' · you can '+(x.can_edit?'view and edit':'view')+' the family’s payments</div><div class="row" style="gap:8px"><button class="btn s" data-a="iacc:'+x.id+'">Join</button><button class="btn ghost s" data-a="idec:'+x.id+'">Decline</button></div></div>'}).join('')+msg+'<div class="note" style="margin:14px 0 6px;text-align:center">or</div>';msg=''}
    h+='<div class="seg"><button class="btn s '+(c?'':'ghost')+'" data-a="ftab-c">I’m new</button><button class="btn s '+(c?'ghost':'')+'" data-a="ftab-j">Join with a code</button></div>'+
      (c?'<div class="note" style="margin-bottom:10px">We’ll set up your own space. You can invite family later.</div>'+inp("f_nm","Your name, e.g. Manohar","text","given-name",S._fprefill&&S._fprefill.n)+msg+btn("fcreate","Get started")
        :'<div class="note" style="margin-bottom:10px">Ask the person who set up Gharwise for the invite code.</div>'+inp("f_code","Invite code","text","off",(S._fprefill&&S._fprefill.c)||pj2)+inp("f_nm","Your name, e.g. Manjari","text","given-name",S._fprefill&&S._fprefill.n)+msg+btn("fjoin","Join"))+lnk("out","Log out")}
  else if(v==="err"){h+='<h2 style="margin-top:0">Something went wrong</h2>'+msg+btn("retry","Try again")+lnk("out","Log out")}
  else h+='<div class="mute">Loading…</div>';
  return h+'</div><div class="note" style="text-align:center;margin-top:14px"><a href="privacy.html" target="_blank" rel="noopener" style="color:var(--mute)">Privacy policy</a> · <a href="delete.html" target="_blank" rel="noopener" style="color:var(--mute)">Delete account</a></div>'}
async function authAction(a){
  var m=function(t,ok){var e=document.getElementById("amsg");if(e){e.textContent=t||"";e.className="amsg"+(ok?" ok":"")}};
  var go=function(v,t,ok){S.view=v;S.amsg=t||"";S.aok=!!ok;render()};
  var em=function(){S.lastEmail=g("a_em").trim().toLowerCase();return S.lastEmail};
  var keep=function(){var v=(g("a_em")||g("a_mb")||"").trim();if(v){S.lastEmail=v.toLowerCase();if(v.indexOf("@")<0)S.lastMob=v}};
  if(a==="sfc"){var fw=document.getElementById("fcw"),sb=document.getElementById("sfcb");if(fw){var op=fw.style.display==="none";fw.style.display=op?"block":"none";if(sb)sb.textContent=op?"No family code? Start on my own":"Have a family code? Join family";if(op){var fi=document.getElementById("a_fc");if(fi)fi.focus()}}return}
  if(a==="go-login"){keep();return go("login")}if(a==="go-signup"){keep();return go("signup")}if(a==="go-forgot"){keep();return go("forgot")}
  if(a==="ftab-c"){S._fm=1;S.fmode="create";return go("family")}if(a==="ftab-j"){S._fm=1;S.fmode="join";return go("family")}
  if(a.indexOf("sh-")===0){return shareCode(a.slice(3),S.newCode,S.name||"")}
  if(a==="out"){try{if(S.auth)await authFetch("logout","POST",null,S.auth.access)}catch(e){}return logoutLocal("")}
  if(a==="copy"){toast(await copyText(S.newCode)?"Code copied":"Press and hold the code to copy");return}
  if(a==="cont"||a==="retry"){S.view="";render();return enter()}
  var btn=document.querySelector("[data-a='"+a+"']"),old=btn?btn.textContent:"";
  var BS={pcode:"Checking the code…",login:"Signing you in…",signup:"Creating your account…",vcode:"Confirming your email…",rcode:"Saving your new password…",newpw:"Saving your new password…",fcreate:"Setting up your family…",fjoin:"Joining your family…"};
  var busy=function(on){if(btn){btn.disabled=on;btn.textContent=on?"Please wait…":old}try{if(on)window.brandLoader(true,a.indexOf("iacc:")===0?"Setting up your family…":(BS[a]||""));else window.brandLoader(false)}catch(e){}};
  m("");
  try{
    if(a==="login"&&idKind(g("a_em"))==="mobile"){var mid=g("a_em").trim(),mpw=g("a_pw");S.lastEmail=mid;if(!mpw)return m("Enter your password.");busy(true);
      var mo;try{mo=await authFetch("token?grant_type=password","POST",{phone:phE164(mid),password:mpw})}
      catch(e){if(e.code==="phone_not_confirmed"||/not confirmed|not verified/i.test(e.message)){S.vphone=phE164(mid);S.pmode="signup";S._spw=mpw;try{await authFetch("resend","POST",{type:"sms",phone:S.vphone})}catch(x){}busy(false);return go("pverify","Your mobile is not verified yet. We sent you a code.",true)}throw e}
      saveSess(mo);ls("lid",phE164(mid));S.view="";render();await enter();return}
    if(a==="login"){var e1=em(),pw=g("a_pw");if(!e1||!pw)return m("Enter your mobile number or email, and your password.");if(idKind(e1)!=="email")return m("Enter a 10-digit mobile number or a valid email.");busy(true);
      var o;try{o=await authFetch("token?grant_type=password","POST",{email:e1,password:pw})}catch(e){if(/confirm your email/i.test(e.message)){S.vemail=e1;busy(false);return go("verify","Please confirm your email first. Tap the link we sent, or enter its code below.")}throw e}saveSess(o);S.auth.email=S.auth.email||e1;ls("sb",JSON.stringify(S.auth));S.view="";render();await enter();return}
    if(a==="signup"){var nmS=g("a_nm").trim(),mb=g("a_mb").trim(),p1=g("a_pw"),fw2=document.getElementById("fcw"),fcS=fw2&&fw2.style.display!=="none"?g("a_fc").replace(/\s/g,""):"";S.lastName=nmS;S.lastMob=mb;
      if(nmS.length<2)return m("Enter your name.");if(!isMob(mb))return m("Enter a 10-digit mobile number.");if(p1.length<8)return m("Password needs at least 8 characters.");busy(true);
      var ph=phE164(mb),st2=await phoneStatus(ph);
      if(st2==="confirmed"){busy(false);return m("This mobile number already has an account. Please log in, or tap Forgot password.")}
      ls("pends",JSON.stringify({e:"",p:ph,n:nmS,c:fcS}));S.vphone=ph;S.pmode="signup";S._spw=p1;
      if(st2==="unconfirmed"){try{await authFetch("resend","POST",{type:"sms",phone:ph})}catch(x){}return go("pverify","You started signing up with this number before. We sent a new code.",true)}
      await authFetch("signup","POST",{phone:ph,password:p1});
      return go("pverify","We sent a 6-digit code to your mobile.",true)}
    if(a==="pcode"){var pc=g("a_code").replace(/\s/g,"");if(pc.length<4)return m("Enter the 6-digit code.");busy(true);
      var vo2=await authFetch("verify","POST",{type:"sms",phone:S.vphone,token:pc});if(!vo2.access_token)throw new Error("That code did not work.");saveSess(vo2);
      if(S.pmode==="reset"){S.view="newpw";S.amsg="";S.aok=false;render();return}
      if(S._spw){try{await authFetch("user","PUT",{password:S._spw},S.auth.access)}catch(x){}S._spw=""}
      ls("lid",S.vphone);S.view="";render();toast("Mobile verified");await enter();return}
    if(a==="presend"){if(Date.now()-(S._pcd||0)<60000)return m("Please wait a minute before asking again.");S._pcd=Date.now();
      if(S.pmode==="reset")await authFetch("otp","POST",{phone:S.vphone,create_user:false});else await authFetch("resend","POST",{type:"sms",phone:S.vphone});
      return m("Sent again. It can take up to a minute.",true)}
    if(a==="forgot"){var fid=g("a_em").trim(),fk=idKind(fid);S.lastEmail=fid.toLowerCase();if(!fk)return m("Enter your mobile number or email.");
      if(fk==="mobile"){busy(true);var ph3=phE164(fid),st4=await phoneStatus(ph3);
        if(st4==="none"||st4==="unconfirmed"){busy(false);return m("No verified account with this mobile number. If you have not verified your mobile yet, enter your email instead.")}
        await authFetch("otp","POST",{phone:ph3,create_user:false});S.vphone=ph3;S.pmode="reset";return go("pverify","We sent a 6-digit code to your mobile.",true)}
      var e3=fid.toLowerCase();busy(true);
      var st3=await acctStatus(e3);
      if(st3==="none"){busy(false);return m("No account found with this email. Please check the spelling, or tap “Create account”.")}
      if(st3==="unconfirmed"){S.vemail=e3;try{await authFetch("resend?redirect_to="+encodeURIComponent(APP_URL),"POST",{type:"signup",email:e3})}catch(x){}return go("verify","This email is not confirmed yet. We sent a new confirmation email. Confirm it first, then you can log in.",true)}
      await authFetch("recover?redirect_to="+encodeURIComponent(APP_URL),"POST",{email:e3});
      S.vemail=e3;return go("rcode","We sent a reset email. Check your inbox and spam.",true)}
    if(a==="vcode"){var cc=g("a_code").replace(/\s/g,"");if(cc.length<4)return m("Enter the code from the email.");busy(true);
      var vo=await authFetch("verify","POST",{type:"signup",email:S.vemail,token:cc});if(!vo.access_token)throw new Error("That code did not work.");saveSess(vo);S.view="";render();toast("Email confirmed");await enter();return}
    if(a==="vresend"){await authFetch("resend?redirect_to="+encodeURIComponent(APP_URL),"POST",{type:"signup",email:S.vemail});return m("Sent again. Check your inbox and spam.",true)}
    if(a==="rcode"){var rc=g("a_code").replace(/\s/g,""),q1=g("a_pw"),q2=g("a_pw2");if(rc.length<4)return m("Enter the code from the email.");if(q1.length<8)return m("Password needs at least 8 characters.");if(q1!==q2)return m("The two passwords do not match.");busy(true);
      var ro=await authFetch("verify","POST",{type:"recovery",email:S.vemail,token:rc});if(!ro.access_token)throw new Error("That code did not work.");saveSess(ro);
      await authFetch("user","PUT",{password:q1},S.auth.access);S.view="";S.amsg="";render();toast("Password changed");await enter();return}
    if(a==="rresend"){await authFetch("recover?redirect_to="+encodeURIComponent(APP_URL),"POST",{email:S.vemail});return m("Sent again. Check your inbox and spam.",true)}
    if(a==="newpw"){var n1=g("a_pw"),n2=g("a_pw2");if(!S.auth||!S.auth.access){S.view="forgot";return go("forgot","This link has expired. Enter your email for a new one.")}if(n1.length<8)return m("Password needs at least 8 characters.");if(n1!==n2)return m("The two passwords do not match.");busy(true);
      await ensureToken();await authFetch("user","PUT",{password:n1},S.auth.access);S.view="";S.amsg="";render();toast("Password changed");await enter();return}
    if(a.indexOf("iacc:")===0){var nm3=g("f_inm").trim();if(nm3.length<2)return m("Enter your name first.");busy(true);
      await api("rpc/accept_invite",{method:"POST",body:JSON.stringify({p_id:a.slice(5),p_display:nm3})});ls("tour6","");ls("tournew","1");ls("tourjoin","1");S.view="";render();toast("Welcome to the family!");await enter();return}
    if(a.indexOf("idec:")===0){await api("rpc/decline_invite",{method:"POST",body:JSON.stringify({p_id:a.slice(5)})});S.invites=(S.invites||[]).filter(function(x){return x.id!==a.slice(5)});return go("family")}
    if(a==="fcreate"){var nm=g("f_nm").trim();if(nm.length<2)return m("Enter your name.");busy(true);
      var r=await api("rpc/create_household",{method:"POST",body:JSON.stringify({p_name:"",p_display:nm})});
      S.newCode=r.invite_code;ls("tour6","");ls("tournew","1");S.view="";render();toast("You’re all set");await enter();return}
    if(a==="fjoin"){var cd=g("f_code").trim(),nm2=g("f_nm").trim();if(!cd)return m("Enter the invite code.");if(nm2.length<2)return m("Enter your name.");busy(true);
      await api("rpc/join_household",{method:"POST",body:JSON.stringify({p_code:cd,p_display:nm2})});ls("pendjoin","");ls("tour6","");ls("tournew","1");ls("tourjoin","1");S.view="";render();toast("Welcome!");await enter();return}
  }catch(e){busy(false);m(errText(e))}}
function bindAuth(el){
  el.querySelectorAll("[data-eye]").forEach(function(b){b.onclick=function(){var i=document.getElementById(b.dataset.eye);if(!i)return;var sh=i.type==="password";i.type=sh?"text":"password";b.innerHTML=sh?EYE_OFF:EYE;b.setAttribute("aria-label",sh?"Hide password":"Show password");i.focus()}});
  el.querySelectorAll("[data-a]").forEach(function(b){b.onclick=function(){authAction(b.dataset.a)}});
  el.querySelectorAll("input").forEach(function(i){i.onkeydown=function(e){if(e.key==="Enter"){var pb=el.querySelector(".btn:not(.ghost):not(.s)[data-a]");if(pb)pb.click()}}})}

