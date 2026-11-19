/* ---------- swipe left to delete, always with a confirmation ---------- */
function confirmSheet(title,msg,okLabel,fn,calm){
  var sh=document.getElementById("sheet");
  sh.innerHTML='<div class="sheet"><div><b>'+esc(title)+'</b><div class="mute" style="margin:6px 0 14px">'+esc(msg)+'</div><button class="btn" id="cfok"'+(calm?'':' style="background:var(--out)"')+'>'+esc(okLabel||"Delete")+'</button><button class="btn ghost" style="margin-top:8px" id="cfno">Cancel</button></div></div>';
  document.getElementById("cfno").onclick=function(){sh.innerHTML="";closeSwipes()};
  document.getElementById("cfok").onclick=async function(){sh.innerHTML="";try{await fn()}catch(e){alert((calm?"Could not finish: ":"Could not delete: ")+(e&&e.message||e))}closeSwipes()};
}
function closeSwipes(){}
async function doSwipeDelete(spec){
  var a=spec.split("|"),kind=a[0],id=decodeURIComponent(a[1]||""),label=decodeURIComponent(a[2]||"");
  if(kind==="txn")return confirmSheet("Delete this payment?",(label||"This payment")+" will be removed. This can't be undone.","Delete",async function(){await api("transactions?id=eq."+encodeURIComponent(id),{method:"DELETE"});load()});
  if(kind==="bud")return confirmSheet("Delete the "+id+" budget?","Only the monthly limit is removed. Your payments stay as they are.","Delete",async function(){if(S.newBud)delete S.newBud[id];await api("budgets?category=eq."+encodeURIComponent(id),{method:"DELETE"});await load()});
  if(kind==="fixed")return confirmSheet("Delete this fixed expense?",(label||"It")+" will be removed from your plan and forecast.","Delete",async function(){await api("fixed_items?id=eq."+encodeURIComponent(id),{method:"DELETE"});load()});
  if(kind==="loan")return confirmSheet("Remove this loan tracker?",(label||"This loan")+" will be removed. Your payments stay as they are.","Remove",async function(){await api("goals?id=eq."+encodeURIComponent(id),{method:"DELETE"});await loadPlan();render()});
  if(kind==="goal")return confirmSheet("Delete this goal?",(label||"This goal")+" and its progress will be removed.","Delete",async function(){await api("goals?id=eq."+encodeURIComponent(id),{method:"DELETE"});await loadPlan();render()});
  if(kind==="lend"){
    var rows=S.txns.filter(function(t){return (t.category===LOUT||t.category===LIN)&&(t.merchant||"")===id}),man=rows.filter(function(t){return !t.raw&&t.source!=="statement"}),bank=rows.length-man.length;
    return confirmSheet("Delete "+id+" from lending?",man.length+" entr"+(man.length===1?"y":"ies")+" you added by hand will be deleted."+(bank?" "+bank+" bank payment"+(bank===1?"":"s")+" will stay in History and go back to 'no category'.":"")+" This can't be undone.","Delete",async function(){
      for(var i=0;i<man.length;i++)await api("transactions?id=eq."+encodeURIComponent(man[i].id),{method:"DELETE"});
      for(var j=0;j<rows.length;j++)if(man.indexOf(rows[j])<0)await api("transactions?id=eq."+encodeURIComponent(rows[j].id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:null})});
      load()})}
}

var CEMOJI=["🛒","🍽️","🍺","🎆","🎬","🎵","🛍️","👕","📱","💻","🚌","⛽","🚗","🏍️","✈️","🏠","💡","🏦","📈","💊","🏋️","🎓","🧸","🐾","💇","🎁","🙏","🧹","🔧","🧾","🌴","⚽","🎮","📚","☕","🥬","🍼","💍","🎯","📌"];
function lpMenu(sp){
  var a=sp.split("|"),kind=a[0],nm=decodeURIComponent(a[1]||"");
  if(S.profile&&S.profile.can_edit===false&&kind!=="txn"){toast("View only: ask the family owner for edit access");return}
  var sh=document.getElementById("sheet"),title=kind==="cat"?nm:decodeURIComponent(a[2]||"")||"Delete";
  var h='<div class="sheet"><div><b>'+esc(title)+'</b><div style="display:grid;gap:8px;margin-top:12px">';
  if(kind==="cat"){h+='<button class="btn ghost" id="lpi">🖼️ Change icon</button>';if(!SYSC[nm]&&!(typeof gNames==="function"&&gNames().indexOf(nm)>=0))h+='<button class="btn" id="lpd" style="background:var(--out)">Delete category</button>'}
  else h+='<button class="btn" id="lpd" style="background:var(--out)">Delete</button>';
  h+='<button class="btn ghost" id="lpx">Cancel</button></div></div></div>';
  sh.innerHTML=h;
  document.getElementById("lpx").onclick=function(){sh.innerHTML=""};
  var d=document.getElementById("lpd");if(d)d.onclick=function(){sh.innerHTML="";if(kind==="cat")deleteCategory(nm);else doSwipeDelete(sp)};
  var i=document.getElementById("lpi");if(i)i.onclick=function(){iconSheet(nm)}}
function iconSheet(c){
  var sh=document.getElementById("sheet");
  sh.innerHTML='<div class="sheet"><div><b>Choose an icon for '+esc(c)+'</b><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:12px 0">'+CEMOJI.map(function(e){return '<button class="btn ghost" data-em="'+e+'" style="padding:8px 0;font-size:20px;margin:0">'+e+'</button>'}).join('')+'</div><button class="btn ghost" id="lpr">Use automatic icon</button><button class="btn ghost" style="margin-top:8px" id="lpx">Cancel</button></div></div>';
  document.getElementById("lpx").onclick=function(){sh.innerHTML=""};
  var set=function(v){if(v)CICON[c]=v;else delete CICON[c];ls("cicons",JSON.stringify(CICON));_ciC={};sh.innerHTML="";render()};
  sh.querySelectorAll("[data-em]").forEach(function(b){b.onclick=function(){set(b.dataset.em)}});
  document.getElementById("lpr").onclick=function(){set("")}}
function deleteCategory(c){
  var n=(S.txns||[]).filter(function(t){return t.category===c}).length,hasB=(S.budgets||[]).some(function(b){return b.category===c});
  confirmSheet("Delete “"+c+"”?",(n?n+" payment"+(n===1?"":"s")+" will move to Uncategorised. ":"No payments use it. ")+(hasB?"Its budget will be removed. ":"")+"You can add it again later with New category.","Delete",async function(){
    var q=encodeURIComponent(c),custom=CUSTOMC.indexOf(c)>=0;
    if(n)await api("transactions?category=eq."+q,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:null})});
    try{await api("budgets?category=eq."+q,{method:"DELETE"})}catch(e){}
    try{await api("merchants?category=eq."+q,{method:"DELETE"})}catch(e){}
    if(custom){try{await api("household_categories?name=eq."+q,{method:"DELETE"})}catch(e){}var l=localCats().filter(function(x){return x!==c});ls("ccats",JSON.stringify(l))}
    else{try{await api("household_categories",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({name:("~"+c).slice(0,30)})})}catch(e){}
      var hl=[];try{hl=JSON.parse(ls("hidecats")||"[]")}catch(e){}hl.push(c);ls("hidecats",JSON.stringify(hl))}
    dropCat(c);delete CICON[c];_ciC={};if(S.newBud)delete S.newBud[c];
    await load();toast("Deleted “"+c+"”")})}
(function(){
  var tm=null,sx=0,sy=0,fired=false;
  function clear(){clearTimeout(tm);tm=null}
  function start(x,y,t){fired=false;clear();if(!t||!t.closest||t.closest("input,select,textarea,.sheet,#tour"))return;
    var el=t.closest("[data-lp],.swp");if(!el)return;
    var sp=el.getAttribute("data-lp");if(!sp){var w=el.querySelector(".swa");sp=w&&w.getAttribute("data-sw")}
    if(!sp)return;sx=x;sy=y;
    tm=setTimeout(function(){tm=null;fired=true;try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}lpMenu(sp)},550)}
  function move(x,y){if(tm&&(Math.abs(x-sx)>10||Math.abs(y-sy)>10))clear()}
  document.addEventListener("touchstart",function(e){var t=e.touches[0];start(t.clientX,t.clientY,e.target)},{passive:true});
  document.addEventListener("touchmove",function(e){var t=e.touches[0];move(t.clientX,t.clientY)},{passive:true});
  document.addEventListener("touchend",clear);document.addEventListener("touchcancel",clear);
  document.addEventListener("mousedown",function(e){if(e.button===0)start(e.clientX,e.clientY,e.target)});
  document.addEventListener("mousemove",function(e){if(tm)move(e.clientX,e.clientY)});
  document.addEventListener("mouseup",clear);
  document.addEventListener("contextmenu",function(e){var t=e.target;if(t&&t.closest&&t.closest("[data-lp],.swp")&&!t.closest("input,select,textarea"))e.preventDefault()});
  document.addEventListener("click",function(e){if(fired){fired=false;e.stopPropagation();e.preventDefault()}},true);
})();


/* ===== Home loan tracker ===== */
