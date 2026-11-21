/* Language (English / Hindi). English is the source language; Hindi is applied on top by translating what is shown.
   The dictionary lives in js/hi.js and is only loaded when Hindi is chosen. Category names stay English in the data. */
var LANG=(function(){var l=ls("lang");if(l==="hi"||l==="en")return l;try{if(/^hi\b/i.test(navigator.language||""))return "hi"}catch(e){}return "en"})();
var HI_SRC="js/hi.js?v=5e328b74";
if(LANG==="hi"&&!window.HI)document.write('<script src="'+HI_SRC+'"><\/script>');
var HIM=null,HIMN=null;
function i18nPrep(){
  if(HIM||!window.HI)return;
  HIM={};HIMN={};
  for(var k in HI){var v=HI[k];HIM[k]=v;
    if(/\d/.test(k)){var a=k.match(/\d[\d,]*(?:\.\d+)?/g),b=v.match(/\d[\d,]*(?:\.\d+)?/g);
      if(a&&b&&a.length===b.length)HIMN[k.replace(/\d[\d,]*(?:\.\d+)?/g,"#")]=v.replace(/\d[\d,]*(?:\.\d+)?/g,"#")}}
}
function hiKey(s){return s.replace(/\s+/g," ").trim().toLowerCase()}
function hiLook(core){
  var k=hiKey(core);if(HIM.hasOwnProperty(k))return HIM[k];
  if(/\d/.test(k)){var m=k.match(/\d[\d,]*(?:\.\d+)?/g),mk=k.replace(/\d[\d,]*(?:\.\d+)?/g,"#");
    if(HIMN.hasOwnProperty(mk)){var i=0;return HIMN[mk].replace(/#/g,function(){return m[i++]})}}
  return null}

var HI_MON={jan:"जनवरी",feb:"फ़रवरी",mar:"मार्च",apr:"अप्रैल",may:"मई",jun:"जून",jul:"जुलाई",aug:"अगस्त",sep:"सितंबर",oct:"अक्टूबर",nov:"नवंबर",dec:"दिसंबर"};
var HI_MONL={january:"jan",february:"feb",march:"mar",april:"apr",may:"may",june:"jun",july:"jul",august:"aug",september:"sep",october:"oct",november:"nov",december:"dec"};
var HI_DAY={mon:"सोम",tue:"मंगल",wed:"बुध",thu:"गुरु",fri:"शुक्र",sat:"शनि",sun:"रवि"};
function hiMon(m){m=m.toLowerCase();return HI_MON[HI_MONL[m]||m.slice(0,3)]||m}
function hiDate(s){ /* weekday / month names only inside date-like text (next to digits) */
  if(s.length>60||!/\d/.test(s))return null;
  var o=s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(day|sday|nesday|rsday|urday)?\b/g,function(a,d){return HI_DAY[d.toLowerCase()]})
   .replace(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g,function(a){return hiMon(a)});
  return o!==s?o:null}
var HI_PAT=[
 [/^(\d+) days? left$/,function(m){return m[1]+" दिन बाकी"}],
 [/^day (\d+) of (\d+)$/i,function(m){return "दिन "+m[1]+" / "+m[2]}],
 [/^(\d+) payments? · avg (₹[\d,.]+)$/i,function(m){return m[1]+" भुगतान · औसत "+m[2]}],
 [/^(\d+)% of everyday$/,function(m){return "रोज़मर्रा ख़र्च का "+m[1]+"%"}],
 [/^([▲▼]) (₹[\d,.]+) vs (\w+)$/,function(m){return m[1]+" "+m[2]+" बनाम "+hiMon(m[3])}],
 [/^step (\d+) of (\d+)$/i,function(m){return "चरण "+m[1]+" / "+m[2]}],
 [/^about (₹[\d,.]+) a day$/,function(m){return "लगभग "+m[1]+" प्रतिदिन"}],
 [/^everyday spending so far (₹[\d,.]+)$/i,function(m){return "अब तक रोज़मर्रा ख़र्च "+m[1]}],
 [/^fixed bills this month (₹[\d,.]+)$/i,function(m){return "इस महीने के तय बिल "+m[1]}],
 [/^other payments (₹[\d,.]+)$/i,function(m){return "अन्य भुगतान "+m[1]}],
 [/^spent each day · avg (₹[\d,.]+) a day · tap a bar$/i,function(m){return "रोज़ का ख़र्च · औसत "+m[1]+" प्रतिदिन · बार दबाएँ"}],
 [/^every payment in one category · (.+)$/i,function(m){return "एक श्रेणी के सारे भुगतान · "+(hiDate(m[1])||m[1])}]
];
function hiPat(core){for(var i=0;i<HI_PAT.length;i++){var m=core.match(HI_PAT[i][0]);if(m){var r=HI_PAT[i][1](m);if(r)return r}}return null}
function trHi(s){
  if(!s||!HIM)return s;
  var lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.slice(lead.length,s.length-trail.length);
  if(!core)return s;
  var r=hiLook(core);if(r!==null)return lead+r+trail;
  var m=core.match(/^([^A-Za-z0-9ऀ-ॿ₹]*)([\s\S]*?)([\s:.…!?,)]*)$/);   /* leading ✓ ⚠ ▶ etc and trailing : … */
  if(m&&m[2]&&(m[1]||m[3])){r=hiLook(m[2]);if(r!==null)return lead+m[1]+r+m[3]+trail}
  r=hiPat(core);if(r!==null)return lead+r+trail;
  r=hiDate(core);if(r!==null)return lead+r+trail;
  if(core.indexOf(" · ")>0){var parts=core.split(" · "),ch=false,o=parts.map(function(p){var x=hiLook(p);if(x!==null){ch=true;return x}return p});if(ch)return lead+o.join(" · ")+trail}
  return s}
function T(s,v){
  var o=s;if(LANG==="hi"){i18nPrep();var r=HIM&&hiLook(s);if(r!=null&&r!==undefined)o=r}
  if(v)o=o.replace(/\{(\w+)\}/g,function(a,k){return v[k]!==undefined?v[k]:a});
  return o}
var HI_ATTR=["placeholder","title","aria-label","alt"];
var HI_SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,NOSCRIPT:1,CODE:1,PRE:1};
function hiNode(n){
  if(n.nodeType===3){var p=n.parentNode;if(!p||HI_SKIP[p.nodeName]||(p.closest&&p.closest("[data-notr]")))return;
    var v=n.nodeValue;if(!v||!/[A-Za-z]/.test(v))return;var t=trHi(v);if(t!==v)n.nodeValue=t;return}
  if(n.nodeType!==1||HI_SKIP[n.nodeName]||(n.hasAttribute&&n.hasAttribute("data-notr")))return;
  for(var i=0;i<HI_ATTR.length;i++){var a=n.getAttribute(HI_ATTR[i]);if(a&&/[A-Za-z]/.test(a)){var t2=trHi(a);if(t2!==a)n.setAttribute(HI_ATTR[i],t2)}}
  if(n.nodeName==="INPUT"&&/^(button|submit)$/.test(n.type)){var vv=n.value,t3=trHi(vv);if(t3!==vv)n.value=t3}
  for(var c=n.firstChild;c;c=c.nextSibling)hiNode(c)}
function i18nStart(){
  if(LANG!=="hi"||!window.HI)return;
  i18nPrep();document.documentElement.lang="hi";
  var q=[],busy=false;
  var run=function(){busy=false;var l=q;q=[];obs.disconnect();try{l.forEach(function(n){if(n.isConnected!==false)hiNode(n)})}catch(e){}go()};
  var obs=new MutationObserver(function(ms){ms.forEach(function(m){
    if(m.type==="childList")m.addedNodes.forEach(function(n){q.push(n)});
    else if(m.type==="characterData")q.push(m.target);
    else if(m.type==="attributes")q.push(m.target)});
    if(!busy&&q.length){busy=true;(window.requestAnimationFrame||setTimeout)(run)}});
  var go=function(){obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:HI_ATTR})};
  hiNode(document.body);go();
  /* dialogs */
  var A=window.alert,C=window.confirm,P=window.prompt;
  window.alert=function(m){return A.call(window,trHi(String(m)))};
  window.confirm=function(m){return C.call(window,trHi(String(m)))};
  window.prompt=function(m,d){return P.call(window,trHi(String(m)),d)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",i18nStart);else i18nStart();
function langCard(){
  var b=function(c,l){return '<button class="'+(LANG===c?"btn":"btn ghost")+'" data-lang="'+c+'" data-notr style="flex:1;margin:0">'+l+'</button>'};
  return '<div class="card"><div style="display:flex;gap:8px">'+b("en","English")+b("hi","हिन्दी")+'</div></div>'}
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-lang]");if(!t)return;var c=t.getAttribute("data-lang");if(c===LANG)return;ls("lang",c);location.reload()});
