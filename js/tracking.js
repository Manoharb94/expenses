function vCatsP(){
  var key=monthKey(0),by={};txIn(key).filter(function(t){return t.type==="out"&&isCount(t)}).forEach(function(t){var c=t.category||UNC;by[c]=(by[c]||0)+Number(t.amount)});
  var h=topbar("Categories","menu")+'<div class="dc"><div class="note" style="margin:0 0 14px">Built-in categories, with what was spent in each this month ('+esc(plabel(0))+'). Tap a payment in List to change its category.</div><div class="cgrid">';
  CATS.concat([UNC]).forEach(function(c){h+='<button data-go="list"><i style="background:'+tint(c)+'">'+ci(c)+'</i>'+esc(c)+'<small>'+(by[c]?money(Math.round(by[c])):'—')+'</small></button>'});
  return h+'</div></div><div class="note" style="text-align:center">Need a new category? Ask for it to be added to the app.</div>'}
function trackStat(){var c=S.sc;if(!c||c.err)return '';
  return c.alert_count>0?'<div class="note" style="margin-top:10px">✓ '+c.alert_count+' payment'+(c.alert_count>1?'s':'')+' received automatically · last '+ago(c.last_alert)+'</div>':'<div class="note" style="margin-top:10px">No payments received automatically yet.</div>'}
function trkTabs(t){return '<div class="seg2 trkt">'+[["live","Live Tracking"],["sms","Import SMS"],["stmt","Import Bank Statement"]].map(function(x){return '<button data-trk="'+x[0]+'"'+(t===x[0]?' class="on"':'')+'>'+x[1]+'</button>'}).join('')+'</div>'}
function vTrack(){
  var tab=S.trkTab||"live",h=topbar("Automated Tracking","menu")+trkTabs(tab);
  if(tab==="sms")return h+vImportSms();
  if(tab==="stmt")return h+vStmt();
  var c=S.sc,mail=c&&c.last_run?((Date.now()-new Date(c.last_run).getTime())<30*60000?'<span class="in">✓ Connected</span>':'<span class="out">⚠ Stopped</span>'):'Not set up';
  var ns=nativeSmsOK();if(ns&&S.nsms===null)nsmsRefresh();
  h+='<div class="dc trk"><i style="background:rgba(60,130,255,.20)">💬</i><div class="m"><b>SMS Tracking</b><span>Capture spends from bank SMS, seconds after you pay'+(ns&&S.nsms&&S.nsms.enabled?' · <span class="in">✓ On</span>':'')+'</span></div><button class="sbtn" data-go="sms">'+(ns&&S.nsms&&S.nsms.enabled?'Manage':ns?'Turn On':'Set Up')+'</button></div>';
  h+='<div class="dc trk"><i style="background:rgba(255,150,40,.22)">✉️</i><div class="m"><b>Email Tracking</b><span>Capture spends from bank emails · '+mail+'</span></div><button class="sbtn" data-go="mail">'+(c&&c.last_run?'Manage':'Set Up')+'</button></div>';
  h+=trackStat();
  h+='<div class="sec">❔ How It Works</div><div class="card" style="font-size:14px;line-height:1.55">'+
    '<p style="margin:0 0 8px"><b>SMS</b> is fastest. Your phone forwards each bank SMS to the app the moment it arrives. On iPhone this uses Apple’s Shortcuts app; on Android, a free SMS-forwarding app.</p>'+
    '<p style="margin:0 0 8px"><b>Email</b> is the back-up. A small script in your own Gmail checks for bank alerts every 2 minutes.</p>'+
    '<p style="margin:0">Use both if you like. The same payment arriving by SMS and by email is saved once. OTPs and offers are ignored.</p></div>';
  return h}
/* ---- Import SMS tab: pick a start date (last 3 months only), then read the messages from that date ---- */
var SMS_IMPORT_NAME="Gharwise Import", SMS_IMPORT_LINK="", SMS_IMPORT_FROM_DATE=false;  /* set the link (and true) once the separate "Gharwise Import" shortcut exists; until then the existing shortcut is used with whole months */
function isoD(d){var m=d.getMonth()+1,x=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(x<10?"0":"")+x}
function impMin(){var d=new Date();d.setHours(0,0,0,0);d.setMonth(d.getMonth()-3);return d}
function impDef(){var d=new Date();d.setHours(0,0,0,0);d.setMonth(d.getMonth()-1);return d}
function impDateOK(v){return /^\d{4}-\d\d-\d\d$/.test(v||"")&&v>=isoD(impMin())&&v<=isoD(new Date())}
function impDays(v){var a=new Date();a.setHours(0,0,0,0);var n=Math.round((a-new Date(v+"T00:00:00"))/864e5)+1;return Math.max(1,Math.min(95,n))}
function impHref(v){var m=Math.min(3,Math.max(1,Math.ceil((impDays(v)-1)/31))),tx=SMS_IMPORT_FROM_DATE?("FROM "+v):("HISTORY "+m);
  return "shortcuts://run-shortcut?name="+encodeURIComponent(SMS_IMPORT_LINK?SMS_IMPORT_NAME:SMS_SHORTCUT_NAME)+"&input=text&text="+encodeURIComponent(tx)}
function vImportSms(){
  var os=phoneOS(),h='<h2 style="margin:14px 0 2px">Import SMS</h2><div class="mute" style="margin-bottom:12px">Add older bank messages missing in Gharwise.</div>';
  if(os==="desk")return h+'<div class="card"><b>Open this on your phone</b><div class="note" style="margin-top:6px">Bank messages are read on the phone that receives them. Open the app on that phone, or use the Import Bank Statement tab here.</div></div>';
  if(os==="and"&&!nativeSmsOK())return h+'<div class="card"><b>Use the Gharwise app</b><div class="note" style="margin-top:6px">Reading older SMS needs the Gharwise app from the Play Store. You can also use the Import Bank Statement tab.</div></div>';
  var ns=nativeSmsOK();if(ns&&S.nsms===null){nsmsRefresh();return h+'<div class="card mute">Checking…</div>'}
  if(ns&&!(S.nsms&&S.nsms.enabled))return h+'<div class="card"><b>Turn on SMS tracking first</b><div class="note" style="margin:6px 0 12px">Gharwise needs your permission to read bank SMS on this phone.</div><button class="btn" data-go="sms">Turn on SMS tracking</button></div>';
  if(ns&&S.nimp)return h+nimpUI();
  var d=impDateOK(S.impDate)?S.impDate:isoD(impDef());S.impDate=d;
  h+='<div class="card"><div class="mute">Import from this date</div><input type="date" id="impd" value="'+d+'" min="'+isoD(impMin())+'" max="'+isoD(new Date())+'" style="width:100%;margin:6px 0 4px;min-height:46px"><div class="note" style="margin-bottom:14px">You can pick any date in the last 3 months.</div>'+
    (ns?'<button class="btn" id="impgo">Import SMS</button>':'<a class="btn" id="impgo" style="display:block;text-align:center;text-decoration:none" href="'+esc(impHref(d))+'">Import SMS</a>')+
    '<div class="note" style="margin-top:10px">Messages already processed are ignored.</div></div>';
  if(os==="ios"){
    if(SMS_IMPORT_LINK)h+='<div class="note" style="margin:0 0 6px">First time? Add the import shortcut, and allow Messages when iPhone asks.</div><a class="btn ghost" style="display:block;text-align:center;text-decoration:none;margin-bottom:12px" href="'+esc(SMS_IMPORT_LINK)+'" target="_blank" rel="noopener">Add the import shortcut</a>';
    h+='<div class="warnbox"><b>Importing a lot? Go in small steps.</b><br>iPhone may stop a long import (timeout). Pick a start date within the last 1 month first. Run it again for older dates. Messages already added are skipped.</div>'+
      '<details class="impd" id="imph"'+(S.impHelp?' open':'')+'><summary>Import not working?</summary><div class="impb"><b>Only a few messages came in, or none?</b><br>Your iPhone’s message search may need refreshing. Do this once:<ol><li>Open Settings → Search → Messages.</li><li>Turn “Show Content in Search” off, then on again.</li><li>Wait 24 hours while your iPhone rebuilds its message index.</li><li>Come back and import again.</li></ol><a href="#" data-trk="stmt" style="color:var(--acc)">Don’t want to wait? Use the Import Bank Statement tab.</a></div></details>'}
  return h}
function bindImpSms(){
  var di=document.getElementById("impd"),go=document.getElementById("impgo"),hp=document.getElementById("imph");
  if(hp)hp.ontoggle=function(){S.impHelp=hp.open};
  if(di)di.onchange=function(){if(!impDateOK(di.value)){di.value=isoD(impDef());toast("Pick a date in the last 3 months")}S.impDate=di.value;if(go&&go.tagName==="A")go.href=impHref(S.impDate)};
  if(go&&go.tagName==="BUTTON")go.onclick=function(){importNativeSms(impDays(S.impDate))}}
function wz(title,steps,cur,doneTo){
  var s=steps[cur],tb=topbar(title,"track");if(cur>0)tb=tb.replace('data-go="track"','data-step="-1"');
  var h='<div class="wz">'+tb+'<div class="wzp"><div class="wzs">Step '+(cur+1)+' of '+steps.length+'</div><div class="wzbar"><i style="width:'+Math.round((cur+1)/steps.length*100)+'%"></i></div></div>'+
    '<div class="card wzc"><div class="wzh"><em>'+(cur+1)+'</em><b>'+s[0]+'</b></div><div class="wzb" style="line-height:1.55">'+s[1]+'</div></div>'+
    '<div class="wzn"><button class="btn ghost" data-step="-1"'+(cur===0?' data-go="track"':'')+'>'+(cur===0?'Back':'Previous')+'</button>'+
    (cur===steps.length-1?'<button class="btn" data-go="'+doneTo+'">Done</button>':'<button class="btn" data-step="1">Next</button>')+'</div></div>';
  return h}
function kv(label,val){return '<div class="mute" style="margin-top:10px">'+label+'</div><div class="kv"><span>'+esc(val)+'</span><button class="btn ghost s" data-copy="'+esc(val)+'">Copy</button></div>'}
/* Paste the iCloud link of the shared "Gharwise SMS" shortcut here (see setup notes). Empty = step-by-step instructions instead. */
var SMS_SHORTCUT_LINK="https://www.icloud.com/shortcuts/521cc0457b594587b9172633f6a21ba5";
var SMS_SHORTCUT_NAME="Gharwise SMS";
var SMS_PAST=true;
var SMS_MONTHS_IN_URL=true;  /* true once the shortcut reads 'HISTORY <months>' (no question asked) */   /* true once the shared shortcut also reads past SMS */
var SMS_HIST_NAME="Gharwise past SMS", SMS_HIST_LINK="";   /* iCloud link of the "Gharwise past SMS" shortcut */
/* iPhone app: hand the personal key to the app's "Add SMS to Gharwise" action (stored by the Capacitor Preferences plugin) */
function iosLinkKey(key){try{if(!key||!nativeApp()||Capacitor.getPlatform()!=="ios"||S._kl===key)return;
  var P=(Capacitor.Plugins&&Capacitor.Plugins.Preferences)||(Capacitor.registerPlugin&&Capacitor.registerPlugin("Preferences"));
  if(P&&P.set){S._kl=key;P.set({key:"gharwise_key",value:key})}}catch(e){}}
function phoneOS(){var u=navigator.userAgent||"";if(nativeApp()&&window.Capacitor.getPlatform)return Capacitor.getPlatform()==="ios"?"ios":"and";
  if(/iPhone|iPad|iPod/i.test(u)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))return "ios";
  if(/Android/i.test(u))return "and";return "desk"}
function nativeApp(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
function smsPlugin(){try{return window.Capacitor&&(Capacitor.Plugins&&Capacitor.Plugins.SmsTracker||(Capacitor.registerPlugin&&Capacitor.registerPlugin("SmsTracker")))}catch(e){return null}}
function nativeSmsOK(){return nativeApp()&&Capacitor.getPlatform&&Capacitor.getPlatform()==="android"&&!!smsPlugin()}
S.nsms=null;
async function nsmsRefresh(){try{S.nsms=await smsPlugin().status()}catch(e){S.nsms={enabled:false,err:e.message}}if(S.tab==="sms"||S.tab==="track")render()}
function vSmsNative(){
  var T=topbar("SMS tracking","track"),st=S.nsms,c=S.sc;
  if(st===null){nsmsRefresh();return T+'<div class="card mute">Checking…</div>'}
  if(st.enabled)return T+'<div class="dc" style="text-align:center"><span style="font-size:46px">✅</span><h3 style="margin:6px 0">SMS tracking is on</h3><p class="mute" style="margin:0">Bank payment SMS are added to the app the moment they arrive, even when the app is closed.</p><div class="note" style="margin-top:10px">'+(st.count?st.count+' sent from this phone'+(st.last?' · last '+ago(new Date(st.last).toISOString()):''):'Waiting for your next bank SMS')+'</div></div>'+
    '<button class="btn ghost" id="noff">Turn off SMS tracking</button>';
  return T+'<div class="dc"><div style="text-align:center"><span style="font-size:46px">💬</span><h3 style="margin:6px 0 4px">Track spends from bank SMS</h3><p class="mute" style="margin:0 0 14px">One tap. No other app needed.</p></div>'+
    '<div class="card" style="background:var(--chip);box-shadow:none;font-size:14px;line-height:1.55;margin:0"><b>What happens when you allow SMS access</b><ul style="margin:6px 0 0;padding-left:18px"><li>Gharwise reads SMS on this phone to find <b>bank payment alerts</b> (debited, credited, spent).</li><li>Only those alerts are sent to your account. OTPs, personal messages and offers are checked on the phone and never leave it.</li><li>The alerts are used only to show your spending, and only you and your family can see them.</li><li>You can turn this off any time here, or in Android Settings.</li></ul></div>'+
    (c&&c.key?'<div class="mute" style="margin:16px 0 6px">How far back should we read your bank SMS?</div>'+nmoSel()+'<button class="btn" id="non">Allow SMS access and turn on</button>':'<div class="note" style="margin-top:14px">Loading your account…</div>')+
    (st.err?'<div class="note out" style="margin-top:8px">'+esc(st.err)+'</div>':'')+'<div class="note" style="text-align:center;margin-top:10px">You can also use <a href="#" data-go="mail" style="color:var(--acc)">email tracking</a> instead, or as well.</div></div>'}
function nimpUI(){var n=S.nimp;if(n&&Date.now()-(n.last||n.t0||0)>180000){S.nimp=null;n=null}
  if(n)return '<div class="card" id="nprog" style="margin:0 0 16px"><div class="row" style="padding:0"><b id="ntxt">'+esc(n.txt||"Reading your messages…")+'</b><span class="mute" id="npct">'+Math.round(n.pct||0)+'%</span></div><div style="height:12px;border-radius:7px;background:var(--chip);overflow:hidden;margin-top:8px"><div id="nbar" class="'+(n.got?'':'nind')+'" style="height:100%;width:'+Math.round(n.pct||0)+'%;background:var(--acc);transition:width .25s"></div></div><div class="note" style="margin:8px 0 0">Please keep the app open. '+esc(n.lab||"Your messages")+' '+((n.mo||1)<=1?"can take a few seconds":"can take a minute")+'.</div></div>';
  return '<div class="mute" style="margin:0 0 6px">How far back should we read?</div>'+nmoSel()+'<button class="btn" id="nimp">Add bank SMS from the past '+nmoLab()+'</button><div class="note" style="margin:6px 0 16px">Payments already in the app are skipped, so this is safe to run again.</div>'}
function nimpTick(e){var n=S.nimp;if(!n||!e)return;n.got=1;n.last=Date.now();var nb0=document.getElementById("nbar");if(nb0)nb0.classList.remove("nind");var t=e.total||0,f=e.done||0,p;
  if(e.phase==="read"){p=t?30*f/t:30;n.txt="Reading your messages…"}
  else if(e.phase==="send"){p=30+(t?70*f/t:70);n.txt="Adding payments… "+f+" of "+t}
  else{p=100;n.txt="Done"}
  n.pct=Math.min(100,Math.max(n.pct||0,p));
  var b=document.getElementById("nbar");if(b)b.style.width=n.pct+"%";
  var x=document.getElementById("npct");if(x)x.textContent=Math.round(n.pct)+"%";
  var y=document.getElementById("ntxt");if(y)y.textContent=n.txt}
function nmoLab(){var m=Math.min(3,S.nmo||1);return m===1?"1 month":m+" months"}
function nmoSel(){return '<select id="nmo" style="margin-bottom:12px">'+[1,2,3].map(function(m){return '<option value="'+m+'"'+((Math.min(3,S.nmo||1))===m?' selected':'')+'>Past '+(m===1?'1 month':m+' months')+'</option>'}).join('')+'</select>'}
function bindNativeSms(){
  var nm=document.getElementById("nmo");if(nm){nm.onchange=function(){S.nmo=Math.min(3,+nm.value);var b=document.getElementById("nimp");if(b)b.textContent="Add bank SMS from the past "+nmoLab()}}
  var on=document.getElementById("non");if(on)on.onclick=async function(){this.disabled=true;this.textContent="Waiting for permission…";
    try{S.nsms=await smsPlugin().enable({key:S.sc.key,url:URLB+"rpc/ingest_sms",apikey:KEY});render();if(S.nsms.enabled&&confirm("SMS tracking is on. Add your bank SMS from the past "+nmoLab()+" now?"))importNativeSms()}
    catch(e){S.nsms={enabled:false,err:/denied|not given/i.test(e.message||"")?"SMS access was not allowed. Tap the button again, or allow SMS for Gharwise in Android Settings → Apps → Permissions.":e.message};render()}};
  var im=document.getElementById("nimp");if(im)im.onclick=importNativeSms;
  var off=document.getElementById("noff");if(off)off.onclick=async function(){if(!confirm("Turn off SMS tracking on this phone?"))return;try{S.nsms=await smsPlugin().disable()}catch(e){}render()}}
async function importNativeSms(days){
  if(S.nimp)return;
  var mo=days?Math.min(3,Math.ceil(days/31)):Math.min(3,S.nmo||1),lab=days?days+(days===1?" day":" days"):(mo===1?"1 month":mo+" months"),h=null,r=null;
  S.nimp={pct:0,txt:"Reading your messages…",mo:mo,lab:lab,t0:Date.now(),last:Date.now()};setTimeout(function(){var n=S.nimp;if(n&&!n.got){n.txt="Still reading, please keep the app open…";var y=document.getElementById("ntxt");if(y)y.textContent=n.txt}},20000);if(S.tab==="sms"||S.tab==="track")render();
  try{h=await smsPlugin().addListener("smsImport",nimpTick)}catch(e){}
  try{r=await smsPlugin().importRecent({days:Math.min(95,days||mo*31)})}
  catch(e){S.nimp=null;try{h&&h.remove()}catch(x){}if(S.tab==="sms"||S.tab==="track")render();showErr("Could not read SMS: "+(e.message||e));return}
  try{h&&h.remove()}catch(x){}
  nimpTick({phase:"done"});
  await new Promise(function(res){setTimeout(res,900)});
  S.nimp=null;if(S.tab==="sms"||S.tab==="track")render();
  if(!r.found)toast("No bank SMS found in the past "+lab);
  else toast("Done · "+r.found+" bank SMS read, "+(r.saved||0)+" new payment"+(r.saved===1?"":"s")+" added"+(r.skipped?" ("+r.skipped+" already in the app or not a payment)":"")+(r.queued&&!r.refused?" · "+r.queued+" will be sent when you are online":""));
  if(r.refused)showErr("The server did not accept the messages. Turn SMS tracking off and on again, then retry.");
  setTimeout(function(){load(true)},1200);nsmsRefresh()}
function vSms(){
  if(nativeSmsOK())return vSmsNative();
  var c=S.sc,os=phoneOS(),T=topbar("SMS tracking","track");
  if(!c)return T+'<div class="card">'+skBox(3)+'</div>';
  if(c.err)return T+'<div class="card out">'+esc(c.err)+'</div>';
  var key=c.key||"",j=URLB+"rpc/ingest_sms",tx=URLB+"rpc/ingest_sms_text",steps;
  if(os==="desk")return T+'<div class="dc" style="text-align:center"><span style="font-size:44px">📱</span><h3 style="margin:8px 0">Open this on your phone</h3><p class="mute" style="margin:0 0 6px">SMS tracking is set up on the phone that receives your bank messages. Open the app on that phone and come back to <b>Menu → Automated tracking → SMS</b>.</p><p class="note">The app works out by itself whether it is an iPhone or an Android phone.</p></div>';
  if(os==="ios"){
    var jb=URLB+"rpc/ingest_sms_batch";
    var histStep=['Read your past messages (once)','<p>Live tracking only sees new SMS. This second shortcut sends your old bank SMS once. Open <b>Shortcuts</b> → <b>+</b> and name it <b>Gharwise history</b>. Then add these actions in order:</p><ol>'+
      '<li><b>Find Messages</b>. Filters: <b>Content</b> contains <b>Rs</b>, then <b>+</b> and add <b>Content</b> contains <b>INR</b> and <b>debited</b>. Change “All” to <b>Any</b>. Add <b>Date Sent</b> is in the last <b>6 months</b>. Sort by Date Sent, Limit <b>500</b>.</li>'+
      '<li><b>Repeat with Each</b> (the messages).</li>'+
      '<li>Inside it, first add <b>Format Date</b> on <b>Repeat Item → Date Sent</b>. Date Format <b>Custom</b>: <b>yyyy-MM-dd</b>.</li>'+
      '<li>Then <b>Get Contents of URL</b>:</li></ol>'+kv("URL",jb)+'<ol start="5"><li>Method <b>POST</b>. Header <b>apikey</b>:</li></ol>'+kv("apikey value",KEY)+
      '<ol start="6"><li>Request Body <b>JSON</b>: Text <b>p_key</b> = your key. <b>p_items</b> = <b>Array</b> with one <b>Dictionary</b> inside: Text <b>t</b> = <b>Repeat Item → Content</b>, Text <b>d</b> = <b>Formatted Date</b>.</li><li>After the repeat, add <b>Show Notification</b>: “Gharwise: past SMS sent”.</li></ol>'+
      '<p>Run it once. Allow access to Messages when iPhone asks. 200 messages take about 2 minutes. Run it again any time; messages already in the app are skipped.</p><div class="note">If “Find Messages” is missing in your Shortcuts app, tell us your iOS version in feedback.</div>'];
    iosLinkKey(key);
    var run="shortcuts://run-shortcut?name="+encodeURIComponent(SMS_SHORTCUT_NAME)+"&input=text&text="+encodeURIComponent("OEKEY:"+key);
    var runHist="shortcuts://run-shortcut?name="+encodeURIComponent(SMS_SHORTCUT_NAME)+"&input=text&text=HISTORY%203";
    if(nativeApp()&&SMS_SHORTCUT_LINK)steps=[
      ['Add the live shortcut','<p>This shortcut sends each new bank SMS to Gharwise. Tap the button, then <b>Add Shortcut</b>, and come back here.</p><a class="btn" style="display:block;text-align:center;text-decoration:none" href="'+esc(SMS_SHORTCUT_LINK)+'" target="_blank" rel="noopener">Add shortcut</a><p class="note">Your account is linked automatically. Nothing to copy.</p><div class="must"><div class="mt"><span>Do this once</span>Allow the shortcut</div><ol><li>Open the Shortcuts app.</li><li>Tap ▶ on Gharwise SMS.</li><li>Tap Always Allow on every question.</li></ol><div class="why">Without this, tracking stops whenever your phone is locked.</div><a class="btn ghost" style="display:block;text-align:center;text-decoration:none" href="shortcuts://">Open Shortcuts</a></div>'],
      ['Turn on live tracking','<video src="sms-live-iphone.mp4" autoplay muted loop playsinline controls style="width:100%;max-width:270px;display:block;margin:0 auto 10px;border-radius:14px"></video><p>Apple does not let any app create this automation for you. Watch the video, then tap the button:</p><ol><li><b>Automation</b> tab → <b>New Automation</b> → <b>Message</b></li><li><b>Message Contains</b>: type one <b>space</b></li><li>Choose <b>'+esc(SMS_SHORTCUT_NAME)+'</b>, tick <b>Run Immediately</b> → Done</li></ol><a class="btn" style="display:block;text-align:center;text-decoration:none" href="shortcuts://">Open Shortcuts</a><div class="note">Only bank payment alerts are saved. Other messages are ignored.</div>'],
      ['All set','<p>The next bank SMS reaches the app within seconds and shows up in <b>List</b>.</p>'+trackStat()]];
    else if(SMS_SHORTCUT_LINK)steps=[
      ['Add the shortcut','<p>Tap the button, then tap <b>Add Shortcut</b> in the Shortcuts app and come back here.</p><a class="btn" style="display:block;text-align:center;text-decoration:none" href="'+esc(SMS_SHORTCUT_LINK)+'" target="_blank" rel="noopener">Add shortcut</a>'],
      ['Link it to your account','<p>One tap. This hands your personal key to the shortcut, so the SMS it sends are saved as yours. You will see “Linked to Gharwise”.</p><a class="btn" style="display:block;text-align:center;text-decoration:none" href="'+esc(run)+'">Link my account</a><p class="note">If iPhone asks to allow the shortcut to save a file, tap <b>Always Allow</b>.</p>'],
      ['Turn it on for bank SMS','<p>Apple only lets you switch on message automations yourself. It takes about 30 seconds:</p><ol><li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Message</b>.</li><li><b>Message Contains</b>: type <b>Rs</b>.</li><li>Choose <b>Run Immediately</b> → <b>Next</b>.</li><li>Pick <b>'+esc(SMS_SHORTCUT_NAME)+'</b>.</li></ol><a class="btn ghost" style="display:block;text-align:center;text-decoration:none" href="shortcuts://">Open Shortcuts</a><div class="note">Bank writes INR (Axis) or no currency (SBI)? Repeat with <b>INR</b> or <b>debited</b>. Duplicates are ignored.</div>'],
      ['All set','<p>The next bank SMS reaches the app within seconds and shows up in <b>List</b>.</p>'+trackStat()]];
    else steps=[
      ['Copy your personal key','This key tells the app the SMS is yours. Keep it private.'+kv("Your key",key)],
      ['Create the automation','<ol><li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Message</b>.</li><li><b>Message Contains</b>: type <b>Rs</b>.</li><li><b>Run Immediately</b> → <b>Next</b> → <b>New Blank Automation</b>.</li></ol><a class="btn ghost" style="display:block;text-align:center;text-decoration:none" href="shortcuts://">Open Shortcuts</a>'],
      ['Add the “send” action','<ol><li>Add <b>Get Contents of URL</b> with this URL:</li></ol>'+kv("URL",j)+'<ol start="2"><li>Method <b>POST</b>. Header <b>apikey</b>:</li></ol>'+kv("apikey value",KEY)+'<ol start="3"><li>Request Body <b>JSON</b>: Text field <b>p_key</b> = your key; Text field <b>p_text</b> = Shortcut Input → <b>Content</b>.</li></ol>'],
      ['All set','<p>The next bank SMS reaches the app within seconds.</p>'+trackStat()]];
  }else steps=[
    ['Copy your personal key','This key tells the app the SMS is yours. Keep it private.'+kv("Your key",key)],
    ['Install an SMS forwarder','<p>Until the app is on the Play Store, a free helper app forwards bank SMS. These steps use <b>MacroDroid</b>.</p><a class="btn" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid">Get MacroDroid</a><p class="note">Allow SMS access when it asks.</p>'],
    ['Make the macro','<ol><li><b>Add Macro</b>. Trigger: <b>SMS Received</b>, message contains <b>Rs</b>.</li><li>Action: <b>HTTP Request</b>, method <b>POST</b>, URL:</li></ol>'+kv("URL",tx)+'<ol start="3"><li>Body type <b>text/plain</b>, body = the <b>SMS message</b> variable.</li><li>Headers: <b>apikey</b>:</li></ol>'+kv("apikey value",KEY)+'<ol start="5"><li>and <b>x-key</b>: your key from step 1. Save.</li></ol>'],
    ['All set','<p>The next bank SMS reaches the app within seconds.</p>'+trackStat()]];
  if(S.smsStep>=steps.length)S.smsStep=steps.length-1;
  return wz("SMS tracking · "+(os==="ios"?"iPhone":"Android"),steps,S.smsStep,"track")}
function vMail(){
  var c=S.sc;
  if(!c)return topbar("Email tracking","track")+'<div class="card">'+skBox(3)+'</div>';
  if(c.err)return topbar("Email tracking","track")+'<div class="card out">'+esc(c.err)+'</div>';
  var steps=[
    ['Copy your script','<p style="margin-top:0">This script runs inside your own Gmail. It finds your bank alert emails on its own, for any bank, and sends only the payments to this app.</p><button class="btn" id="sccopy">Copy script</button><details style="margin-top:10px"><summary class="mute" style="cursor:pointer">If copying does not work, show the script</summary><textarea readonly id="sctxt" rows="6" style="width:100%;font-size:16px;margin-top:6px">'+esc(scriptText())+'</textarea></details>'],
    ['Put it in Google Script','<ol><li>Open Google Script with the Gmail account that receives your bank alerts. A computer is easiest.</li><li>Tap <b>New project</b>, select all the text already there and paste your script over it.</li><li>Press <b>Save</b> (disk icon).</li><li>In the function box at the top choose <b>setup</b> and press <b>Run</b>.</li><li>Allow access when Google asks (Advanced → Go to project).</li></ol><a class="btn" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://script.google.com/create">Open Google Script</a><a class="btn ghost" style="display:block;text-align:center;text-decoration:none;margin-top:10px" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=mc5dPWPysqI">▶ Watch how to add and run a script (YouTube)</a>'],
    ['Wait for connected','<p style="margin-top:0">This page updates by itself. It usually shows <b>Connected</b> within a minute. New emails are checked every 2 minutes. Once it shows <b>Connected</b>, choose below how far back to read your past emails.</p><div class="card" style="margin-top:12px" id="scstat">'+scStat()+'</div>'+mailPast(c)+'<div class="note">Nothing to choose: any email from a bank with a debit, credit or transfer is picked up. Senders it recognises are remembered, so the next checks are quicker.</div><button class="btn ghost s" id="sckey" style="margin-top:12px">Make a new key</button><div class="note">Use this if you shared the script by mistake.</div>']];
  if(!S._mailInit){S._mailInit=1;if(c.last_run)S.mailStep=2}
  if(S.mailStep>=steps.length)S.mailStep=steps.length-1;
  return wz("Email tracking",steps,S.mailStep,"track")}
function bindV2(el){
  el.querySelectorAll("[data-go]").forEach(function(b){b.addEventListener("click",function(e){
    if(b.hasAttribute("data-step"))return;
    if(b.dataset.ltab){S.lt=b.dataset.ltab;S.lm=0}
    if(b.dataset.srch){S.lsrch=true}
    if(b.dataset.rp)S.rp=b.dataset.rp;
    if(b.dataset.lend){ls("lenddis","")}
    var bf=b.dataset.bfocus,t=b.dataset.go;
    if(t==="acct"){var a=document.getElementById("acct");if(a){a.scrollIntoView({behavior:"smooth"});return}t="home"}
    e.stopPropagation();go(t);
    if(bf){var i=document.querySelector(bf);if(i){i.scrollIntoView({block:"center"});i.focus()}}
    if(t==="list"&&S.lsrch){var q=document.getElementById("lq");if(q)q.focus()}
    if(b.dataset.lend)setTimeout(function(){var c=document.getElementById("lendcard");if(c)c.scrollIntoView({behavior:"smooth",block:"center"})},350)})});
  el.querySelectorAll("[data-pf]").forEach(function(b){b.onclick=function(){S.pf=b.dataset.pf;ls("pf",S.pf);render()}});
  el.querySelectorAll("[data-ltab]:not([data-go])").forEach(function(b){b.onclick=function(){S.lt=b.dataset.ltab;render()}});
  el.querySelectorAll("[data-lm]").forEach(function(b){b.onclick=function(){S.lm=Math.min(0,S.lm+Number(b.dataset.lm));render()}});
  var ls2=document.getElementById("lsrch");if(ls2)ls2.onclick=function(){var q=document.getElementById("lq");if(q)q.focus()};
  var bq2=document.getElementById("bq");if(bq2)bq2.oninput=function(){S.bq=bq2.value;clearTimeout(S._bqt);S._bqt=setTimeout(function(){var p=bq2.selectionStart;render();var n=document.getElementById("bq");if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}},120)};
  var bnw=document.getElementById("bnew");if(bnw)bnw.onclick=async function(){var nm=(S.bq||"").trim()||prompt("New category name");if(!nm)return;var r=await addCat(nm);if(r){S.bq="";render()}};
  var lq=document.getElementById("lq");if(lq)lq.oninput=function(){S.lq=lq.value;clearTimeout(S._lqt);S._lqt=setTimeout(function(){var p=lq.selectionStart;render();var n=document.getElementById("lq");if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}},140)};
  el.querySelectorAll("[data-bfocus]:not([data-go])").forEach(function(b){b.onclick=function(){var c=b.dataset.bfocus,i=document.querySelector('[data-bud="'+c.replace(/"/g,'\\"')+'"]');if(i){i.scrollIntoView({block:"center"});i.focus()}else if(!NOBUDGET[c])addBudgetSheet(c)}});
  var bpb=document.getElementById("bplan");if(bpb)bpb.onclick=starterSheet;
  el.querySelectorAll("[data-fedit]").forEach(function(b){b.onclick=function(e){e.stopPropagation();editFixedSheet(b.dataset.fedit)}});
  var fxb=document.getElementById("fxe");if(fxb)fxb.onclick=function(){S.fxe=!S.fxe;render()};
  var ab=document.getElementById("addbud");if(ab)ab.onclick=function(){addBudgetSheet("")};
  el.querySelectorAll("[data-copy]").forEach(function(b){b.onclick=async function(){toast(await copyText(b.dataset.copy)?"Copied":"Press and hold the text to copy")}});
  el.querySelectorAll("[data-dev]").forEach(function(b){b.onclick=function(){S.smsDev=b.dataset.dev;S.smsStep=0;ls("smsdev",S.smsDev);render();window.scrollTo(0,0)}});
  el.querySelectorAll("[data-step]").forEach(function(b){b.onclick=function(){var d=Number(b.dataset.step);if(b.dataset.go&&d<0){go(b.dataset.go);return}
    if(S.tab==="sms")S.smsStep=Math.max(0,S.smsStep+d);else S.mailStep=Math.max(0,S.mailStep+d);render();window.scrollTo(0,0)}});
  var cb=document.getElementById("csvb");if(cb)cb.onclick=function(){csv(S._lastF||[])};
  var da=document.getElementById("delacc");if(da)da.onclick=deleteAccountSheet;
  var cp=document.getElementById("chpw");if(cp)cp.onclick=changePwSheet;
  if(S.tab==="sms"&&nativeSmsOK())bindNativeSms();
  if(S.tab==="track"&&S.trkTab==="sms")bindImpSms();
  el.querySelectorAll("[data-trk]").forEach(function(b){b.onclick=function(e){e.preventDefault();S.trkTab=b.dataset.trk;render();window.scrollTo(0,0);if(S.trkTab==="stmt")quiet(loadImports());if(S.trkTab==="sms")quiet(loadSc())}});
  if(S.tab==="fam")bindFam(el);
  el.querySelectorAll("[data-inv]").forEach(function(b){b.onclick=async function(){var q=b.dataset.inv.split("|");
    if(q[0]==="dec"){try{await api("rpc/decline_invite",{method:"POST",body:JSON.stringify({p_id:q[1]})})}catch(e){}S.invites=(S.invites||[]).filter(function(x){return x.id!==q[1]});render();return}
    confirmSheet("Join "+q[2]+"?","Your own payments move into that family, and you’ll see each other’s spending.","Join",async function(){try{await api("rpc/accept_invite",{method:"POST",body:JSON.stringify({p_id:q[1]})});S.invites=[];toast("Welcome to the family!");S._xcReset=1;await enter()}catch(e){showErr(errText(e))}})}});
  var evs=document.getElementById("evs");if(evs){evs.onclick=function(e){e.stopPropagation()};evs.onchange=function(){S.ev=evs.value;ls("ev",S.ev);render()}}
  el.querySelectorAll(".trend .bg").forEach(function(g){var f=function(){var t=g.closest(".trend").querySelector(".trt");if(t)t.textContent=g.dataset.tip;g.closest("svg").querySelectorAll(".bg rect+rect").forEach(function(r){r.style.opacity=""});var r2=g.querySelector("rect+rect");if(r2)r2.style.opacity="1"};g.addEventListener("pointerenter",f);g.addEventListener("click",f)});
}
