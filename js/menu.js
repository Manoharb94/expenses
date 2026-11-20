function vMenu(){
  var em=(S.profile&&S.profile.email)||(S.auth&&S.auth.email)||"";
  var row=function(t,i,a,b,bg,badge,extra){return '<button class="mr" data-go="'+t+'"'+(extra||'')+'><i class="mt" style="background:'+bg+'">'+i+'</i><span><b>'+a+'</b>'+(b?'<span>'+b+'</span>':'')+'</span>'+(badge||'')+'<span class="go">›</span></button>'};
  var nG=0;try{nG=gList().length}catch(e){}
  var lb=0;try{lendBal().forEach(function(r){lb+=r.get-r.owe})}catch(e){}
  var lbad=lb?'<em class="mbd" style="color:'+(lb>0?'var(--acc)':'var(--out)')+'">'+(lb>0?'+':'−')+money(Math.abs(Math.round(lb)))+'</em>':'';
  return topbar("Menu","home")+(typeof profCard==="function"?profCard():'')+'<div class="msec">App settings</div><div class="card" style="padding:0 12px">'+row("set","⚙️","Settings","Theme, colour, currency, month start","rgba(120,130,150,.20)")+row("cats","🗂️","Categories","What each category has this month","rgba(255,150,40,.22)")+'</div>'+
    '<div class="msec">Automation & sharing</div><div class="card" style="padding:0 12px">'+row("track","💬","Automated tracking","SMS & Email","rgba(60,130,255,.20)")+row("fam","👥","Family Sync","Share expenses with family","rgba(140,100,255,.20)")+(typeof gOKUI==="function"&&gOKUI()?row("grps","🧳","Groups","Trips, flats and shared payments","rgba(40,170,230,.20)",nG?'<em class="mbd bg">'+nG+'</em>':''):'')+row("goals","🎯","Goals","Save for things together","rgba(240,80,150,.20)")+row("home","🤝","Lending","Money you lent or borrowed","rgba(40,180,100,.20)",lbad,' data-lend="1"')+'</div>'+
    '<div class="msec">Account</div><div class="card" style="padding:0 12px"><a class="mr" href="privacy.html" target="_blank" rel="noopener" style="text-decoration:none"><i class="mt" style="background:rgba(120,130,150,.20)">🔒</i><span><b>Privacy policy</b><span>What the app stores and why</span></span><span class="go">›</span></a><button class="mr" id="lo"><i class="mt" style="background:rgba(120,130,150,.20)">⏻</i><span><b>Log out</b><span>'+esc(em)+'</span></span></button><button class="mr" id="delacc"><i class="mt" style="background:rgba(230,70,70,.18)">🗑️</i><span><b class="out">Delete my account</b><span>Removes your login and your payments</span></span></button></div><div class="note" style="text-align:center;margin:14px 0">Gharwise version 2.0 (build 44)</div>'}
function vSet(){
  var h=topbar("Settings","menu");
  h+='<div class="msec">Language</div>'+(typeof langCard==="function"?langCard():"");
  h+='<div class="msec">Appearance</div>'+lookCard();
  h+='<div class="msec">Your month</div><div class="card"><div class="mute">Day your month starts (1 = normal calendar month)</div><input id="ms" type="number" inputmode="numeric" min="1" max="31" value="'+(S.ms||1)+'"><button class="btn ghost s" id="msal" style="margin-bottom:10px">Use my salary credit day</button><div class="note" id="msn">Saved on this phone only. Set the same day on the other phone. Reports, budgets and forecasts all follow it.</div><button class="btn" id="sv">Save</button></div>';
  h+=(typeof nativeCard==="function"?nativeCard():"");
  h+=aboutCard();
  return h}
var WEBVER="5.63 · 21 Nov 2026";
function _tmo(p,ms){return Promise.race([p,new Promise(function(_,j){setTimeout(function(){j(new Error("timeout"))},ms)})])}
async function loadAinfo(){if(S._ainb)return;S._ainb=1;var P=smsPlugin();try{S.ainfo=P&&P.appInfo?await _tmo(P.appInfo(),2500):null}catch(e){S.ainfo=null}
  if(!S.ainfo){try{var G=typeof gwNative==="function"?gwNative():null;if(G&&G.appInfo)S.ainfo=await _tmo(G.appInfo(),2500)}catch(e){}}
  if(!S.ainfo)S.ainfo=null;S._ainb=0;if(S.tab==="set")render()}
function aboutCard(){
  var d=remDiag(),v="";
  if(!d.app)v="Web app in your browser · "+WEBVER;
  else{var a=S.ainfo;
    if(a===undefined){loadAinfo();v="Checking…"}
    else if(a===null)v=d.plat==="ios"?"":"Older than 2.2 — please update from the Play Store";
    else v=String(a.versionName||"?")+" ("+String(a.versionCode)+")"}
  return '<div class="card">'+sxHead('ℹ️','About this app','Version')+(v?'<div class="row" style="padding:5px 0"><span class="mute">App version</span><b style="text-align:right">'+esc(v)+'</b></div>':'')+'<button class="btn ghost" id="tourgo" style="margin:10px 0 0">▶ Show app tour</button></div>'}
function incFam(){return ls("incfam")!=="0"}
function canEditT(t){return !S.profile||S.profile.can_edit!==false||t.person===S.name}
