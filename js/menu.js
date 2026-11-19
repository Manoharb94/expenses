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
  var h=topbar("Settings","menu")+(typeof langCard==="function"?langCard():"")+lookCard();
  h+='<div class="card"><button class="btn ghost" id="tourgo" style="margin:0">▶ Show app tour</button></div><div class="card">'+sxHead('📱','This phone','Saved on this phone only')+'<div class="mute">Currency symbol</div><input id="cu" maxlength="3" value="'+esc(S.cur)+'"><div class="mute">Your month starts on day (1 = normal calendar month)</div><input id="ms" type="number" inputmode="numeric" min="1" max="31" value="'+(S.ms||1)+'"><button class="btn ghost s" id="msal" style="margin-bottom:10px">Use my salary credit day</button><div class="note" id="msn">Saved on this phone only. Set the same day on the other phone. Reports, budgets and forecasts all follow it.</div><button class="btn" id="sv">Save</button></div>';
  h+=(typeof nativeCard==="function"?nativeCard():"");
  h+=aboutCard();
  return h}
var WEBVER="5.62 · 19 Nov 2026";
async function loadAinfo(){if(S._ainb)return;S._ainb=1;var P=smsPlugin();try{S.ainfo=P?await P.appInfo():null}catch(e){S.ainfo=null}S._ainb=0;if(S.tab==="set")render()}
function aboutCard(){
  var d=remDiag(),rows=[];
  if(!d.app){rows.push(["App","Web app in your browser"]);rows.push(["Web version",WEBVER])}
  else{var a=S.ainfo;
    rows.push(["App","Gharwise for "+(d.plat==="ios"?"iPhone":"Android")]);
    if(a===undefined){loadAinfo();rows.push(["App version","Checking…"])}
    else if(a===null)rows.push(["App version","Older than 2.2 — please update from the Play Store"]);
    else{rows.push(["App version",String(a.versionName||"?")]);rows.push(["Version code",String(a.versionCode)]);if(a.sdk)rows.push(["Android",String(a.sdk)])}
    rows.push(["Web version",WEBVER]);
    if(d.reg)rows.push(["Reminders built in",d.reg.indexOf("LocalNotifications")>=0?"✓ yes":"✗ no — install the latest version"])}
  return '<div class="card">'+sxHead('ℹ️','About this app','Version and diagnostics')+''+rows.map(function(r){return '<div class="row" style="padding:5px 0"><span class="mute">'+esc(r[0])+'</span><b style="text-align:right">'+esc(r[1])+'</b></div>'}).join('')+'<div class="note" style="margin:8px 0 0">Share these details if something does not work for you.</div></div>'}
function incFam(){return ls("incfam")!=="0"}
function canEditT(t){return !S.profile||S.profile.can_edit!==false||t.person===S.name}
