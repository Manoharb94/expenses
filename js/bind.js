/* ----- bindings for every screen ----- */
function bindGroups(el){
  if(S.tab==="prof")bindProfile(el);
  el.querySelectorAll("[data-gopen]").forEach(function(b){b.onclick=function(e){e.stopPropagation();S.gid=b.dataset.gopen;S.gfrom=S.tab==="grps"?"grps":"home";go("grpv");gQuiet()}});
  el.querySelectorAll("[data-gretry]").forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent="Loading…";try{await loadGroups(true)}catch(e){}render()}});
  el.querySelectorAll("[data-gnew]").forEach(function(b){b.onclick=function(e){e.stopPropagation();var v=b.getAttribute("data-gnew");gEditSheet(null,v==="Trip"||v==="Flat"||v==="Friends"?v:"")}});
  el.querySelectorAll("[data-bell]").forEach(function(b){b.onclick=function(e){e.stopPropagation();gBell()}});
  el.querySelectorAll("[data-gsy]").forEach(function(b){b.onclick=function(){var s=gSugg()[+b.dataset.gsy];if(s)gSuggYes(s)}});
  el.querySelectorAll("[data-gsn]").forEach(function(b){b.onclick=function(){var s=gSugg()[+b.dataset.gsn];if(!s)return;var d=gDismissed();d[s.t.id]=1;ls("gdis",JSON.stringify(d));render()}});
  if(S.tab!=="grpv"&&S.tab!=="grpo")return;var g=gGet(S.gid);if(!g)return;
  if(S.tab==="grpo"){gAct(el,g);return}
  el.querySelectorAll("[data-gopts]").forEach(function(o){o.onclick=function(){go("grpo")};o.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();go("grpo")}}});
  el.querySelectorAll("[data-gadd]").forEach(function(b){b.onclick=function(e){e.stopPropagation();gExpSheet({g:g})}});
  gAct(el,g)}
function gAct(el,g){var q=function(sel,f){el.querySelectorAll(sel).forEach(function(b){b.onclick=function(e){e.stopPropagation();f(b)}})};
  q("[data-gedit]",function(){gEditSheet(g.id)});
  q("[data-ginv]",function(){gInviteSheet(g.id)});
  q("[data-gset]",function(){gSettleSheet(g.id)});
  q("[data-grem]",function(b){gRemindSheet(g,gLines(g)[+b.dataset.grem])});
  q("[data-gexp]",function(b){gExpSheet({g:g,e:g.expenses.filter(function(x){return x.id===b.dataset.gexp})[0]})});
  q("[data-gds]",async function(b){if(!confirm("Remove this settlement? The balance goes back."))return;var r=await gCall("group_delete_settlement",{p_id:b.dataset.gds},"Removed");if(r.ok)render()});
  q("[data-gdue]",function(b){gDueAdd(g,{id:b.dataset.gdue})});
  q("[data-grec]",function(b){gRecSheet(g.id,b.dataset.grec)});
  q("[data-grecn]",function(){gRecSheet(g.id)});
  q("[data-gcsv]",function(){gExport(g)});
  q("[data-gclose]",async function(b){var c=b.dataset.gclose==="1";if(c&&!confirm("Close this group? No new payments can be added. Debts can still be settled."))return;var r=await gCall("group_set_closed",{p_group:g.id,p_closed:c},c?"Group closed":"Group reopened");if(r.ok){gClose();render()}});
  q("[data-gleave]",async function(){if(!confirm("Leave this group? Your past payments stay in its history."))return;var r=await gCall("group_leave",{p_group:g.id},"You left the group");if(r.ok){gClose();go(gBack())}});
  q("[data-gdelg]",async function(){if(!confirm("Delete this group for everyone? All its payments and settlements are removed. Your own payments in History stay."))return;var r=await gCall("group_delete",{p_group:g.id},"Group deleted");if(r.ok){gClose();go(gBack())}})}
