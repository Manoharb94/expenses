function myId(){return S.profile&&S.profile.user_id}
function r2(n){return Math.round(n*100)/100}
function gTryCache(){if(GR.d||GR.ok===false||!myId())return;try{var c=JSON.parse(ls("gcache")||"null");if(c&&c.u===myId()&&c.d&&c.d.groups){GR.d=c.d;GR.ex=GR.ex||c.ex||null;GR.ok=true;gMap()}}catch(e){}}
function gSaveCache(){try{ls("gcache",JSON.stringify({u:myId(),d:GR.d,ex:GR.ex}))}catch(e){}}
function gOKUI(){if(!GR.d)gTryCache();return GR.ok&&!!GR.d&&!!myId()}
function gList(){return (GR.d&&GR.d.groups)||[]}
function gGet(id){return gList().filter(function(g){return g.id===id})[0]}
function gMem(g,u){return g.members.filter(function(m){return m.user_id===u})[0]}
function gName(g,u){var m=gMem(g,u);return m?m.name:"Someone"}
function gYou(g,u){return u===myId()?"You":gName(g,u)}
function gMeName(g,u){return u===myId()?"you":gName(g,u)}
function gCol(g,u){if(u===myId())return PME;var i=0,k=0;g.members.forEach(function(m){if(m.user_id===u)i=k;if(m.user_id!==myId())k++});var idx=0,c=0;g.members.forEach(function(m){if(m.user_id===myId())return;if(m.user_id===u)idx=c;c++});return PCOL[idx%PCOL.length]}
function gAvH(name,photo,color,size){size=size||36;
  if(photo&&PHOTO_RE.test(photo))return '<img class="gav" src="'+photo+'" alt="" style="width:'+size+'px;height:'+size+'px">';
  return '<span class="gav" style="width:'+size+'px;height:'+size+'px;background:'+color+';font-size:'+Math.round(size*.42)+'px">'+esc((name||"?").trim().charAt(0).toUpperCase())+'</span>'}
function mAv(g,u,size){var m=gMem(g,u)||{name:"?"};return gAvH(m.name,m.photo,gCol(g,u),size)}
function famPhoto(name){if(!GR.ex)return null;if(name===S.name)return GR.ex.photo;return GR.ex.family&&GR.ex.family[name]}
function famAv(name,size){return gAvH(name,famPhoto(name),pcol(name),size)}
function gIcon(g,size){size=size||40;
  if(g&&g.photo&&PHOTO_RE.test(g.photo))return '<img class="gic" src="'+g.photo+'" alt="" style="width:'+size+'px;height:'+size+'px">';
  return '<span class="gic" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.5)+'px;background:'+tint(g&&g.name||"g")+'">👥</span>'}
function gMap(){GR.cat={};gList().forEach(function(g){GR.cat[g.name]=gIcon(g,22)});gCats();gShareAdj()}
/* each group is a real category with the group photo as its icon */
function gCats(){gList().forEach(function(g){var n=g.name,i=CUSTOMC.indexOf(n);if(i>=0)CUSTOMC.splice(i,1);if(CATS.indexOf(n)<0)CATS.push(n)})}
function gOpen(){return gList().filter(function(g){return !g.closed})}
function gByName(n){return gOpen().filter(function(g){return g.name===n})[0]}
/* a payment tagged to a group counts only my share in totals, budgets and analytics */
function gShareAdj(){if(!GR||!GR.d)return;var me=myId(),by={};
  gList().forEach(function(g){(g.expenses||[]).forEach(function(e){if(e.txn_id)by[e.txn_id]=Number((e.shares||{})[me]||0)})});
  (S.txns||[]).forEach(function(t){if(t._full!=null){if(by[t.id]===undefined){t.amount=t._full;delete t._full}else t.amount=by[t.id];return}
    if(t.type==="out"&&by[t.id]!==undefined){t._full=t.amount;t.amount=by[t.id]}})}
function gNames(){return gList().map(function(g){return g.name})}

/* ----- balances ----- */
function gNets(g){var n={};g.members.forEach(function(m){n[m.user_id]=0});
  g.expenses.forEach(function(e){n[e.paid_by]=(n[e.paid_by]||0)+Number(e.amount);var sh=e.shares||{};for(var k in sh)n[k]=(n[k]||0)-Number(sh[k])});
  g.settlements.forEach(function(s){n[s.from_user]=(n[s.from_user]||0)+Number(s.amount);n[s.to_user]=(n[s.to_user]||0)-Number(s.amount)});
  for(var k in n)n[k]=r2(n[k]);return n}
function gLines(g){var out=[];
  if(g.simplify!==false){var n=gNets(g),cr=[],db=[];for(var k in n){if(n[k]>0.49)cr.push({u:k,a:n[k]});else if(n[k]<-0.49)db.push({u:k,a:-n[k]})}
    cr.sort(function(a,b){return b.a-a.a});db.sort(function(a,b){return b.a-a.a});
    var i=0,j=0;while(i<cr.length&&j<db.length){var x=Math.min(cr[i].a,db[j].a);if(x>0.49)out.push({from:db[j].u,to:cr[i].u,amt:r2(x)});cr[i].a=r2(cr[i].a-x);db[j].a=r2(db[j].a-x);if(cr[i].a<0.5)i++;if(db[j].a<0.5)j++}
    return out}
  var d={};function add(f,t,a){if(f===t)return;var k=f+">"+t;d[k]=(d[k]||0)+a}
  g.expenses.forEach(function(e){var sh=e.shares||{};for(var k in sh)add(k,e.paid_by,Number(sh[k]))});
  g.settlements.forEach(function(s){add(s.to_user,s.from_user,Number(s.amount))});
  for(var key in d){var p=key.split(">"),rk=p[1]+">"+p[0];if(d[key]>=(d[rk]||0)){var v=r2(d[key]-(d[rk]||0));if(v>0.49)out.push({from:p[0],to:p[1],amt:v})}}
  return out}
function gMyNet(g){return gNets(g)[myId()]||0}

/* ----- loading ----- */
async function loadGroups(force){
  if(!S.auth||!S.code||!myId())return;
  if(!force&&Date.now()-GR.t<15000)return;GR.t=Date.now();
  var s0=JSON.stringify([GR.d,GR.ex,GR.ok,GR.exok,GR.err]);
  try{GR.ex=await api("rpc/my_extra",{method:"POST",body:"{}"});GR.exok=true}catch(e){if(/PGRST202|Could not find|schema cache|404/.test(String(e&&e.message)))GR.exok=false}
  try{GR.d=await api("rpc/my_groups",{method:"POST",body:"{}"});GR.ok=true;GR.err="";gSaveCache()}catch(e){GR.err=String(e&&e.message||e).slice(0,160);if(/PGRST202|Could not find|schema cache|404/.test(String(e&&e.message)))GR.ok=false}
  try{gMap()}catch(e){GR.err="gMap: "+String(e&&e.message||e).slice(0,120)}
  try{await gJoinPending()}catch(e){}
  if(s0!==JSON.stringify([GR.d,GR.ex,GR.ok,GR.exok,GR.err])){var a=document.activeElement;if(!a||!/INPUT|TEXTAREA|SELECT/.test(a.tagName)){if(!document.querySelector("#sheet .sheet"))render()}}
  gPopups()}
function gQuiet(){loadGroups(true).catch(function(){})}
function captureG(){try{var u=new URLSearchParams(location.search),c=(u.get("g")||"").trim();if(c){ls("pendg",c.slice(0,60));u.delete("g");var q=u.toString();history.replaceState(null,"",location.pathname+(q?"?"+q:"")+location.hash)}}catch(e){}}
async function gJoinPending(){var tk=ls("pendg");if(!tk||!S.auth||!S.code)return;ls("pendg","");
  try{var id=await api("rpc/group_join_token",{method:"POST",body:JSON.stringify({p_token:tk})});GR.d=await api("rpc/my_groups",{method:"POST",body:"{}"});gMap();toast("You joined the group");if(id){S.gid=id;S.gfrom="home";go("grpv")}}catch(e){toast(errText(e))}}

/* ----- small helpers ----- */
function gClose(){var sh=document.getElementById("sheet");if(sh)sh.innerHTML=""}
function gSheet(html){var sh=document.getElementById("sheet");sh.innerHTML='<div class="sheet"><div style="max-height:86vh;overflow:auto">'+html+'</div></div>';
  var ov=sh.firstChild;ov.onclick=function(e){if(e.target===ov)gClose()};return sh}
function gHead(t){return '<div class="row" style="margin-bottom:8px"><b style="font-size:17px">'+t+'</b><button id="gx" aria-label="Close" style="background:transparent;border:0;color:inherit;font-size:22px;padding:0 4px">✕</button></div>'}
function gBindX(sh){var x=sh.querySelector("#gx");if(x)x.onclick=gClose}
function gv(sh,id){var e=sh.querySelector("#"+id);return e?e.value:""}
async function gCall(fn,body,okMsg){try{var r=await api("rpc/"+fn,{method:"POST",body:JSON.stringify(body||{})});await loadGroups(true);if(okMsg)toast(okMsg);return {ok:true,r:r}}catch(e){toast(errText(e));return {ok:false,e:e}}}
/* Move and zoom a picture inside a round window, then save exactly what is inside it. Used for profile and group photos. */
function cropSheet(file,size,limit,cb){
  var url=URL.createObjectURL(file),im=new Image();
  im.onerror=function(){URL.revokeObjectURL(url);toast("That is not a picture")};
  im.onload=function(){
    var old=document.getElementById("crp");if(old)old.remove();
    var V=Math.round(Math.min(window.innerWidth*.8,320)),iw=im.naturalWidth,ih=im.naturalHeight,s0=V/Math.min(iw,ih),z=1,s=s0,ox=0,oy=0,pts={},pd=0;
    var o=document.createElement("div");o.id="crp";o.style.cssText="position:fixed;inset:0;z-index:9500;background:rgba(15,8,30,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;-webkit-user-select:none;user-select:none";
    o.innerHTML='<b style="color:#fff;font-size:18px">Adjust Your Photo</b><div style="color:#d9d2ee;font-size:14px;margin-top:-8px;text-align:center">Drag to move. Pinch or use the slider to zoom.</div>'+
      '<div id="crpv" style="width:'+V+'px;height:'+V+'px;border-radius:50%;overflow:hidden;position:relative;background:#222;touch-action:none;box-shadow:0 0 0 3px rgba(255,255,255,.85)"><img id="crpi" src="'+url+'" alt="" draggable="false" style="position:absolute;left:0;top:0;max-width:none;transform-origin:0 0;pointer-events:none"></div>'+
      '<input id="crpz" type="range" min="1" max="4" step="0.01" value="1" style="width:'+Math.min(V,280)+'px" aria-label="Zoom">'+
      '<div style="display:flex;gap:10px;width:'+Math.min(V,320)+'px"><button class="btn ghost" id="crpn" style="margin:0;flex:1">Cancel</button><button class="btn" id="crpo" style="margin:0;flex:1">Use Photo</button></div>';
    document.body.appendChild(o);
    var img=o.querySelector("#crpi"),box=o.querySelector("#crpv"),zr=o.querySelector("#crpz");
    function clamp(){var w=iw*s,h=ih*s;ox=Math.min(0,Math.max(V-w,ox));oy=Math.min(0,Math.max(V-h,oy))}
    function draw(){clamp();img.style.width=iw+"px";img.style.height=ih+"px";img.style.transform="translate("+ox+"px,"+oy+"px) scale("+s+")"}
    function zoomTo(nz,cx,cy){nz=Math.max(1,Math.min(4,nz));var ix=(cx-ox)/s,iy=(cy-oy)/s;z=nz;s=s0*z;ox=cx-ix*s;oy=cy-iy*s;zr.value=String(z);draw()}
    /* start with the head in view: centre sideways, and for tall pictures look at the upper part */
    ox=(V-iw*s)/2;oy=ih>iw?V/2-.33*ih*s:(V-ih*s)/2;draw();
    box.onpointerdown=function(e){try{box.setPointerCapture(e.pointerId)}catch(x){}pts[e.pointerId]={x:e.clientX,y:e.clientY};pd=0};
    box.onpointermove=function(e){var q=pts[e.pointerId];if(!q)return;var ids=Object.keys(pts);
      if(ids.length===2){var a=pts[ids[0]],b=pts[ids[1]];if(e.pointerId==ids[0])a={x:e.clientX,y:e.clientY};else b={x:e.clientX,y:e.clientY};
        var d=Math.hypot(a.x-b.x,a.y-b.y);if(pd){var r=box.getBoundingClientRect();zoomTo(z*d/pd,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top)}pd=d}
      else{ox+=e.clientX-q.x;oy+=e.clientY-q.y;draw()}
      pts[e.pointerId]={x:e.clientX,y:e.clientY}};
    function up(e){delete pts[e.pointerId];pd=0}
    box.onpointerup=up;box.onpointercancel=up;
    box.onwheel=function(e){e.preventDefault();var r=box.getBoundingClientRect();zoomTo(z*(e.deltaY<0?1.08:.92),e.clientX-r.left,e.clientY-r.top)};
    zr.oninput=function(){zoomTo(parseFloat(zr.value)||1,V/2,V/2)};
    function close(){o.remove();URL.revokeObjectURL(url)}
    o.querySelector("#crpn").onclick=close;
    o.querySelector("#crpo").onclick=function(){
      var c=document.createElement("canvas");c.width=c.height=size;var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,size,size);
      x.drawImage(im,-ox/s,-oy/s,V/s,V/s,0,0,size,size);
      var q=.85,d=c.toDataURL("image/jpeg",q);while(d.length>(limit||60000)&&q>.3){q-=.1;d=c.toDataURL("image/jpeg",q)}
      close();if(d.length>(limit||60000)){toast("The picture is too big");return}cb(d)}};
  im.src=url}
function imgToData(file,max,crop,limit){return new Promise(function(res,rej){var fr=new FileReader();fr.onerror=function(){rej(new Error("Could not read the picture"))};
  fr.onload=function(){var im=new Image();im.onerror=function(){rej(new Error("That is not a picture"))};
    im.onload=function(){var w=im.width,h=im.height,sx=0,sy=0,sw=w,sh=h,cw,ch;
      if(crop){var s=Math.min(w,h);sx=(w-s)/2;sy=(h-s)/2;sw=s;sh=s;cw=ch=max}else{var k=Math.min(1,max/Math.max(w,h));cw=Math.round(w*k);ch=Math.round(h*k)}
      var c=document.createElement("canvas");c.width=cw;c.height=ch;var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cw,ch);x.drawImage(im,sx,sy,sw,sh,0,0,cw,ch);
      var q=.82,d=c.toDataURL("image/jpeg",q);while(d.length>(limit||90000)&&q>.3){q-=.1;d=c.toDataURL("image/jpeg",q)}
      if(d.length>(limit||90000))rej(new Error("The picture is too big"));else res(d)};im.src=fr.result};fr.readAsDataURL(file)})}
async function shareFile(name,blob,mime,text){try{var f=new File([blob],name,{type:mime});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:text||""});return}}catch(e){if(e&&e.name==="AbortError")return}
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}
function gWhen(d){return d?dayLabel(String(d).slice(0,10)):""}
function gSplitLabel(e){return e.split_mode==="percent"?"Percent split":e.split_mode==="manual"?"Manual split":"Equal split"}

