/* ----- F1: profile ----- */
function profCard(){var em=(S.profile&&S.profile.email)||(S.auth&&S.auth.email)||(/^\d{10,13}$/.test(String(S.myPhone||""))?phShow(S.myPhone):"");
  return '<button class="mr" data-go="prof" style="border:1px solid var(--line);border-radius:16px;margin:0 0 6px;padding:14px;background:var(--card)">'+'<span class="pring">'+famAv(S.name,56)+'</span><span><b style="font-size:17px">'+esc(S.name)+'</b><span>'+esc(em)+'</span><span><em class="pchip">Edit profile</em></span></span><span class="go">›</span></button>'}
function vProfile(){var em=(S.profile&&S.profile.email)||(S.auth&&S.auth.email)||"",pm=S.myPhone||(S.auth&&S.auth.phone)||"",ph=GR.ex&&GR.ex.photo;
  if(!/^\+?\d[\d\s]{8,}$/.test(String(pm)))pm="";
  var pvDone=!pm&&String((S.auth&&(S.auth.email||S.auth.phone))||"")&&ls("pvok")===String((S.auth&&(S.auth.email||S.auth.phone))||"");
  var h=topbar("Profile","menu");
  h+='<div class="card" style="text-align:center">'+famAv(S.name,120);
  if(GR.exok){h+='<div class="note" style="margin:8px 0 12px">'+(ph?'Your photo is visible to your family and to people in your groups.':'No photo yet. Your initial is shown instead.')+'</div>'+
    '<div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn s" id="pfc">🖼️ Upload Profile Photo</button></div>'+
    '<input type="file" id="pfile" accept="image/*" style="display:none">'}
  else h+='<div class="note" style="margin-top:10px">Profile pictures will be available after the next update.</div>';
  h+='</div><div class="card">'+sxHead('👤','Your details','Your name, mobile and email')+'<div class="mute">Name</div><div style="font-weight:600;margin-bottom:10px">'+esc(S.name)+'</div><div class="mute">Mobile</div><div style="font-weight:600;margin-bottom:10px">'+(pm?esc(phShow(pm))+'<span class="vpill">Verified</span>':pvDone?'<span class="vpill" style="margin-left:0">Verified</span>':'<button class="btn s" id="pvb" style="margin-top:4px">Verify Mobile</button>')+'</div><div class="mute">Email</div><div style="font-weight:600">'+(esc(em)||'<span class="mute" style="font-weight:400">Not added</span>')+'</div></div>';
  h+='<h2>Security</h2><div class="card" style="padding:0 12px"><button class="mr" id="chpw"><i>🔑</i><span><b>Change password</b><span>Choose a new password for '+esc(em||phShow(pm))+'</span></span><span class="go">›</span></button></div>';
  return h}
function bindProfile(el){
  var pick=function(inp){inp.onchange=function(){var f=inp.files&&inp.files[0];inp.value="";if(!f)return;
    cropSheet(f,256,60000,async function(d){try{toast("Saving…");await api("rpc/set_my_photo",{method:"POST",body:JSON.stringify({p_photo:d})});GR.ex=GR.ex||{};GR.ex.photo=d;await loadGroups(true);render();toast("Photo saved")}catch(e){toast(errText(e))}})}};
  var a=el.querySelector("#pfile");if(a){pick(a);el.querySelector("#pfc").onclick=function(){a.click()}}
  var pv=el.querySelector("#pvb");if(pv)pv.onclick=function(){phoneSheet()}}

