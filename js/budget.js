/* ---------- budgets and fixed items ---------- */
function spentThisMonth(){var key=monthKey(0),o={};
  S.txns.forEach(function(t){if(t.type==="out"&&isCount(t)&&pkey(t.txn_date)===key){var c=t.category||UNC;o[c]=(o[c]||0)+Number(t.amount)}});return o}
function spentByPerson(){var key=monthKey(0),o={};
  S.txns.forEach(function(t){if(t.type==="out"&&isCount(t)&&pkey(t.txn_date)===key){var c=t.category||UNC,p=t.person||"?";o[c]=o[c]||{};o[c][p]=(o[c][p]||0)+Number(t.amount)}});return o}
var PCOL=["#8B6FE8","#B7A5F3","#6E52DB","#CDBFF7"],PME="#5B3FD4";
function pcol(p){if(p===S.name)return PME;var o=persons().filter(function(x){return x!==S.name}).sort(),k=o.indexOf(p);return PCOL[(k<0?0:k)%4]}
function budBar(a,byp){
  var ps=Object.keys(byp||{}).sort(),tot=0;ps.forEach(function(p){tot+=byp[p]});
  var scale=Math.max(a,tot)||1,segs='',lg='';
  ps.forEach(function(p){segs+='<i style="width:'+(byp[p]/scale*100).toFixed(1)+'%;background:'+pcol(p)+'"></i>';
    lg+='<span style="margin-right:12px;white-space:nowrap"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+pcol(p)+';margin-right:5px"></i>'+esc(p)+' '+money(byp[p])+'</span>'});
  return '<div class="bar" style="display:flex;'+(tot>a?'box-shadow:0 0 0 2px var(--out)':'')+'">'+segs+'</div><div class="note">'+(lg||'No spending yet')+'</div>'+
    '<div class="note">'+(tot>a?'<b class="out">Over by '+money(tot-a)+'</b>':'Left '+money(a-tot))+' of '+money(a)+'</div>';
}

function remList(){try{return JSON.parse(ls("fxrem")||"[]")}catch(e){return[]}}
function remOn(id){return remList().indexOf(id)>=0}
function remSet(id,on){var l=remList().filter(function(x){return x!==id});if(on)l.push(id);ls("fxrem",JSON.stringify(l))}
function lnPlugin(){try{if(!nativeApp()||!window.Capacitor)return null;var p=Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;if(p)return p;return Capacitor.registerPlugin?Capacitor.registerPlugin("LocalNotifications"):null}catch(e){return null}}
function remMsg(){var e=S.remErr||"",ios=false;try{ios=Capacitor.getPlatform()==="ios"}catch(x){}
  if(e.indexOf("old:")===0)return ios?"Reminders are not built into this iPhone build ("+e.slice(4,70)+")":"Please update the Gharwise app from the Play Store";
  if(e&&e!=="denied")return "Reminder error: "+e.slice(0,90);
  return ios?"Allow notifications: iPhone Settings → Notifications → Gharwise":"Allow notifications: Settings → Apps → Gharwise → Notifications"}
async function remPermit(ask){S.remErr="";var P=lnPlugin();if(!P)return false;try{var r=await P.checkPermissions();if(r.display==="granted")return true;if(!ask)return false;r=await P.requestPermissions();return r.display==="granted"}catch(e){var m=String(e&&e.message||e);S.remErr=/not implemented|unimplemented|not available|web implementation|does not have/i.test(m)?"old:"+m:m;return false}}
function remDiag(){var o={app:nativeApp(),plugin:!!lnPlugin(),plat:"web",reg:null};try{o.plat=(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform())||"web"}catch(e){}
  try{var H=window.Capacitor&&Capacitor.PluginHeaders;if(H&&H.length!==undefined)o.reg=Array.prototype.map.call(H,function(h){return h.name})}catch(e){}return o}
async function remCheck(){var d=remDiag(),perm="n/a",pend="n/a",sh=document.getElementById("sheet");
  var perr="";
  if(d.app&&d.plugin){try{perm=(await lnPlugin().checkPermissions()).display}catch(e){perm="plugin error";perr=String(e&&e.message||e)}
    try{var pp=await lnPlugin().getPending();pend=String(pp&&pp.notifications?pp.notifications.length:0)}catch(e){}}
  var noLN=d.app&&d.reg&&d.reg.indexOf("LocalNotifications")<0;
  var adv=noLN?"This installed copy of Gharwise was built without reminder support. Install the latest version from the Play Store (uninstall first if it does not update).":!d.app?"You are not inside the Gharwise Android app. Open Gharwise from your phone's app list (the Play Store version), not from the browser.":!d.plugin?"This version of the app cannot send reminders. Update Gharwise in the Play Store, then open it again.":perm!=="granted"?"Allow notifications: Settings → Apps → Gharwise → Notifications → turn on.":"Everything is ready. Tap the button for a test notification in 5 seconds, then leave the app or lock the screen.";
  var rows=[["Gharwise Android app",d.app?"✓ yes":"✗ not detected ("+d.plat+")"],["Notification support",d.plugin?"✓ found":"✗ missing"],["Permission",perm==="granted"?"✓ allowed":perm],["Reminders set on this phone",remList().length+" bills · "+pend+" scheduled"]];
  if(d.reg)rows.push(["Parts built into this app",d.reg.length?d.reg.join(", "):"none"]);
  if(perr)rows.push(["Error",perr.slice(0,120)]);
  sh.innerHTML='<div class="sheet"><div><b>Reminder check</b><div style="margin:10px 0">'+rows.map(function(x){return '<div class="row" style="padding:4px 0"><span class="mute">'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'}).join('')+'</div><div class="note" style="margin:0 0 12px">'+esc(adv)+'</div>'+(d.app&&d.plugin?'<button class="btn" id="rctest">Send test notification</button>':'')+'<div class="note">If reminders come late: Settings → Apps → Gharwise → Battery → Unrestricted.</div><button class="btn ghost" style="margin-top:8px" id="rcx">Close</button></div></div>';
  document.getElementById("rcx").onclick=function(){sh.innerHTML=""};
  var t=document.getElementById("rctest");if(t)t.onclick=async function(){sh.innerHTML="";
    if(!(await remPermit(true))){toast(remMsg());return}
    try{await lnPlugin().schedule({notifications:[{id:8999,title:"Gharwise reminder",body:"This is a test. Reminders are working.",schedule:{at:new Date(Date.now()+5000),allowWhileIdle:true}}]});toast("Test notification in 5 seconds. Leave the app or lock the screen.")}catch(e){toast("Could not send: "+String(e&&e.message||e))}}}
function remDays(){var ids=remList(),out=[],now=new Date();
  for(var i=0;i<45;i++){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,8,0,0),m=d.getMonth()+1,last=new Date(d.getFullYear(),m,0).getDate(),items=[];
    S.fixed.forEach(function(f){if(ids.indexOf(f.id)<0||!occurs(f,m))return;if(Math.min(last,Number(f.day)||1)===d.getDate())items.push(f)});
    if(items.length&&d.getTime()>now.getTime())out.push({at:d,items:items})}
  return out}
var remBusy=false;
async function schedRem(){var P=lnPlugin();if(!P||remBusy)return;remBusy=true;
  try{var pend=await P.getPending();if(pend&&pend.notifications&&pend.notifications.filter(function(n){return n.id!==9501&&n.id!==9502}).length)await P.cancel({notifications:pend.notifications.filter(function(n){return n.id!==9501&&n.id!==9502}).map(function(n){return{id:n.id}})});
    if(!remList().length||!(await remPermit(false)))return;
    var days=remDays();if(!days.length)return;
    await P.schedule({notifications:days.map(function(x,i){var tot=x.items.reduce(function(a,f){return a+Number(f.amount||0)},0),body=x.items.length===1?x.items[0].name+" · "+money(x.items[0].amount)+" is due today":x.items.length+" bills due today: "+x.items.map(function(f){return f.name+" "+money(f.amount)}).join(", ");
      return{id:9000+i,title:"Gharwise reminder",body:body,schedule:{at:x.at,allowWhileIdle:true}}})})}
  catch(e){}finally{remBusy=false}}
async function toggleRem(id){var on=!remOn(id);
  if(on){var dg=remDiag();
    if(!dg.app||!dg.plugin){toast(dg.app?(dg.plat==="ios"?"Reminders plugin not found (iPhone). Reg: "+String(dg.reg&&dg.reg.join(","))+"; reg fn: "+typeof Capacitor.registerPlugin:"Please update the Gharwise app from the Play Store, then try again"):"This page is not running inside the Gharwise app ("+dg.plat+"). Open the Gharwise app on your phone.");return}
    if(!(await remPermit(true))){toast(remMsg());return}}
  remSet(id,on);render();toast(on?"Reminder on · 8:00 am on the due day":"Reminder off");schedRem()}
function occurs(f,m){
  if(f.freq==="yearly")return Number(f.month||1)===m;
  if(f.freq==="quarterly")return (((m-Number(f.month||1))%3)+3)%3===0;
  return true}
function fixedIn(m){return S.fixed.reduce(function(a,f){return a+(occurs(f,m)?Number(f.amount):0)},0)}
