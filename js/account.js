function changePwSheet(){
  var sh=document.getElementById("sheet");
  sh.innerHTML='<div class="sheet"><div><div class="row"><b style="font-size:20px">Change password</b><button class="x" id="cpx">✕</button></div><input id="cp1" type="password" autocomplete="new-password" placeholder="New password (8+ characters)" style="margin-top:14px"><input id="cp2" type="password" autocomplete="new-password" placeholder="Repeat new password"><div class="amsg" id="cpm"></div><button class="btn" id="cpgo">Save password</button></div></div>';
  var msg=function(t,ok){var e=document.getElementById("cpm");e.textContent=t;e.className="amsg"+(ok?" ok":"")};
  document.getElementById("cpx").onclick=function(){sh.innerHTML=""};
  document.getElementById("cpgo").onclick=async function(){var a=document.getElementById("cp1").value,b=document.getElementById("cp2").value;
    if(a.length<8)return msg("Password needs at least 8 characters.");if(a!==b)return msg("The two passwords do not match.");
    this.disabled=true;this.textContent="Saving…";
    try{await ensureToken();await authFetch("user","PUT",{password:a},S.auth.access);sh.innerHTML="";toast("Password changed")}
    catch(e){this.disabled=false;this.textContent="Save password";msg(errText(e))}}}
function deleteAccountSheet(){
  var sh=document.getElementById("sheet"),others=(S.members||[]).filter(function(m){return m.display_name!==S.name}).length;
  sh.innerHTML='<div class="sheet"><div><b style="font-size:18px">Delete your account?</b><div style="margin:10px 0;line-height:1.5">This permanently removes:<ul style="margin:6px 0;padding-left:20px"><li>your login ('+esc((S.profile&&S.profile.email)||(S.auth&&S.auth.email)||phShow(S.myPhone||(S.auth&&S.auth.phone)||""))+')</li><li>every payment saved under <b>'+esc(S.name)+'</b>, and your statement uploads</li>'+(others?'<li>you from the family. Budgets, bills and goals stay with the others'+((S.profile||{}).role==="owner"?', and another member becomes the owner':'')+'</li>':'<li>your whole family’s data: budgets, bills, goals and categories</li>')+'</ul>It cannot be undone. Also delete your Gmail script and SMS shortcut, or they will stop working anyway.</div><div class="mute">Type <b>DELETE</b> to confirm</div><input id="delc" autocomplete="off" autocapitalize="characters"><button class="btn" id="delok" style="background:var(--out)">Delete my account</button><button class="btn ghost" style="margin-top:8px" id="delno">Cancel</button></div></div>';
  document.getElementById("delno").onclick=function(){sh.innerHTML=""};
  document.getElementById("delok").onclick=async function(){
    if(document.getElementById("delc").value.trim().toUpperCase()!=="DELETE"){toast("Type DELETE to confirm");return}
    this.disabled=true;this.textContent="Deleting…";
    try{await api("rpc/delete_my_account",{method:"POST",body:"{}"});sh.innerHTML="";logoutLocal("Your account and data were deleted.")}
    catch(e){sh.innerHTML="";showErr("Could not delete: "+errText(e))}}}

function skRows(n){var h='';for(var i=0;i<n;i++)h+='<div class="skr"><div class="sk"></div><div><div class="sk skl" style="width:'+(55+(i*13)%35)+'%"></div><div class="sk skl" style="width:35%;height:9px"></div></div><div class="sk skl" style="width:56px;flex:none"></div></div>';return h}
function skPage(n){return '<div aria-busy="true" aria-label="Loading"><div class="skc"><div class="sk skl" style="width:40%"></div><div class="sk" style="height:34px;width:60%;margin:12px 0"></div><div class="sk skl" style="width:75%"></div></div><div class="skc">'+skRows(n||5)+'</div></div>'}
function skBox(n){return '<div aria-busy="true">'+skRows(n||3)+'</div>'}
