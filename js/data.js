async function loadPlan(){
  await Promise.all([
    (async function(){var bad="";
      await Promise.all([
        api("budgets?select=*").then(function(r){S.budgets=r||[]},function(e){bad=e.message}),
        api("fixed_items?select=*&order=created_at.asc").then(function(r){S.fixed=r||[]},function(e){bad=bad||e.message}),
        api("cards?select=*").then(function(r){S.cards=r||[]},function(){S.cards=undefined}),
        api("household_categories?select=name&order=created_at.asc").then(function(r){mergeCats((r||[]).map(function(x){return x.name}))},function(){})]);
      S.planErr=bad?"Plan tables are not set up yet ("+bad.slice(0,80)+")":""})(),
    (async function(){try{S.goals=splitLoans(await api("goals?select=*&order=created_at.asc")||[]);S.goalErr=""}
      catch(e){S.goals=[];S.goalErr="Goals are not set up yet. Run goals.sql in Supabase."}})(),
    (async function(){try{S.gents=await api("goal_entries?select=*&order=created_at.asc")||[]}catch(e){S.gents=null}})()
  ]);
  syncLoanCat();schedRem();
}
function startFetch(){
  var q0="transactions?select=*&order=txn_date.desc,created_at.desc&limit=5000";
  var side=Promise.all([loadPlan(),loadMembers(),loadImports()]);
  var tx=(async function(){
    if(!S._noRpc){try{var rr=await api("rpc/app_txns",{method:"POST",body:'{"p_limit":5000}'});if(Array.isArray(rr)){S.txns=withPending(rr);S.err="";S.loaded=true;return}}catch(e){if(isNet(e)&&S.loaded)return;if(/PGRST202|Could not find the function|404|schema cache/.test(String(e&&e.message)))S._noRpc=1}}
    try{S.txns=withPending(await api(q0+"&hidden=eq.false")||[]);S.err="";S.loaded=true}
    catch(e){if(isNet(e)&&S.loaded)return;try{S.txns=withPending(await api(q0)||[]);S.err="";S.loaded=true}catch(e2){if(isNet(e2)&&S.loaded)return;S.err="Could not load: "+e2.message}}})();
  return Promise.all([tx,side])}
async function load(quiet,pre){
  await (pre||startFetch());S._full=Date.now();try{postLoad()}catch(e){}try{if(typeof nativeAfterLoad==="function")nativeAfterLoad()}catch(e){}
  try{window.brandLoader(false)}catch(e){}
  if(S.loaded&&!S.pf)S.pf=S.name;
  var sig=dataSig();
  try{loadGroups()}catch(e){}
  if(quiet&&sig===S._sig)return;
  S._sig=sig;S._q=!!quiet;render();S._q=false;try{maybeTour()}catch(e){}
  try{loadGroups()}catch(e){}
  if(S.loaded&&S._sig!==S._saved)(window.requestIdleCallback||function(f){return setTimeout(f,300)})(function(){saveCache();S._saved=S._sig},{timeout:3000});
}

var OLD2NEW={"Groceries – Offline":"Groceries","Groceries – Online":"Groceries","Shopping – Offline":"Shopping","Shopping – Online":"Shopping","Food – Dining out":"Food","Food – Online delivery":"Food","Home Loan Part Payment":"Loan Part Payment"};
function postLoad(){
  var olds={},hasOld=false;
  (S.txns||[]).forEach(function(t){var n=OLD2NEW[t.category];if(n){olds[t.category]=n;t.category=n;hasOld=true}});
  var bsum={},bold=false;(S.budgets||[]).forEach(function(b){var k=OLD2NEW[b.category]||b.category;if(OLD2NEW[b.category])bold=true;bsum[k]=(bsum[k]||0)+Number(b.amount)});
  var oldB=bold?S.budgets.filter(function(b){return OLD2NEW[b.category]}).map(function(b){return b.category}):[];
  if(bold)S.budgets=Object.keys(bsum).map(function(k){return {category:k,amount:bsum[k]}});
  var used=[];(S.txns||[]).forEach(function(t){if(t.category&&t.category!==UNC&&used.indexOf(t.category)<0)used.push(t.category)});(S.budgets||[]).forEach(function(b){if(used.indexOf(b.category)<0)used.push(b.category)});
  used=used.filter(function(c){return c!=="Mandatory"&&c!=="Rental income"&&!(typeof gNames==="function"&&gNames().indexOf(c)>=0)});
  mergeCats(used);try{gCats();gShareAdj()}catch(e){}
  if((hasOld||bold)&&!S._mig&&(!S.profile||S.profile.can_edit!==false)){S._mig=1;
    (async function(){try{
      for(var o in olds)await api("transactions?category=eq."+encodeURIComponent(o),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({category:olds[o]})});
      if(bold){var rows=Object.keys(bsum).filter(function(k){return oldB.some(function(o){return OLD2NEW[o]===k})}).map(function(k){return {category:k,amount:bsum[k]}});
        if(rows.length)await api("budgets?on_conflict=household_id,category",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
        for(var i=0;i<oldB.length;i++)await api("budgets?category=eq."+encodeURIComponent(oldB[i]),{method:"DELETE"})}
    }catch(e){S._mig=0;S._migFail=(S._migFail||0)+1;if(S._migFail>2)S._mig=1}})()}}
function hs(s){var x=0,i;s=s==null?"":String(s);for(i=0;i<s.length&&i<14;i++)x=(x*31+s.charCodeAt(i))|0;return x^s.length}
function dataSig(){try{var h=0,T=S.txns||[],i,t;
  for(i=0;i<T.length;i++){t=T[i];h=(((h*31+Math.round(t.amount*100))|0)*31+hs(t.id)+hs(t.category)*7+hs(t.merchant)*13+hs(t.note)*17+hs(t.txn_date)*3+(t.hidden?5:0)+(t.type==="in"?11:0)+(t.raw?19:0)+hs(t.person)*23)|0}
  var js=JSON.stringify([S.budgets,S.fixed,S.imports,S.members,S.profile,S.goals,S.err]),sig=h;for(i=0;i<js.length;i++)sig=(sig*31+js.charCodeAt(i))|0;return T.length+":"+js.length+":"+sig}catch(e){return String(Math.random())}}
/* a saved copy of the last data, so the app opens instantly and refreshes quietly behind it */
function saveCache(){try{
  if(!S.auth||!S.profile||S.err)return;
  var c={e:S.auth.email||S.auth.phone||"",p:S.profile,t:S.txns.map(function(t){if(typeof t.raw!=="string")return t;var o={};for(var k in t)if(k!=="raw")o[k]=t[k];if(t.raw)o.raw=1;return o}),b:S.budgets,f:S.fixed,g:S.goals,ln:S.loans,ge:S.gents,m:S.members,i:S.imports},js=JSON.stringify(c);
  if(js.length<3500000)ls("xc",js)}catch(e){}}
function readCache(){try{var c=JSON.parse(ls("xc")||"null");if(c&&S.auth&&c.e&&c.e===(S.auth.email||S.auth.phone)&&c.p&&c.t)return c}catch(e){}return null}
function useCache(c){S.profile=c.p;S.code=c.p.household_id;S.name=c.p.display_name;S.view="";S.pf=ls("pf")||S.name;S.txns=c.t;S.budgets=c.b||[];S.fixed=c.f||[];S.goals=c.g||[];S.loans=c.ln||[];syncLoanCat();S.gents=c.ge||null;S.members=c.m||null;S.imports=c.i||null;S.loaded=true;S.err="";S._sig=dataSig()}
function pdate(off){var n=new Date(),ms=S.ms||1,m=n.getMonth()+off;
  if(n.getDate()<Math.min(ms,new Date(n.getFullYear(),n.getMonth()+1,0).getDate()))m--;
  return new Date(n.getFullYear(),m,Math.min(ms,new Date(n.getFullYear(),m+1,0).getDate()))}
function pend(off){var d=pdate(off+1);d.setDate(d.getDate()-1);return d}
function pnameDate(d){var ms=S.ms||1;if(ms<=1)return d;var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+15);return new Date(x.getFullYear(),x.getMonth(),1)}
function pkey(ds){if(!ds)return "";var ms=S.ms||1;if(S._pkm!==ms){S._pkm=ms;S._pk={}}var c=S._pk[ds];if(c)return c;
  var y=+ds.slice(0,4),m=+ds.slice(5,7)-1,d=+ds.slice(8,10),dim=[31,(y%4===0&&(y%100!==0||y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][m];
  if(d<Math.min(ms,dim))m--;if(m<0){m=11;y--}return S._pk[ds]=y+"-"+(m<9?"0":"")+(m+1)}
function plabel(off){var a=pdate(off),b=pend(off),o={day:"numeric",month:"short"};
  return (S.ms||1)===1?a.toLocaleString("en-IN",{month:"long",year:"numeric"}):a.toLocaleString("en-IN",o)+" – "+b.toLocaleString("en-IN",o)+" "+b.getFullYear()}
function preset(r){var n=new Date();S.range=r;
  if(r==="month"){S.from=iso(pdate(0));S.to=iso(n)}
  else if(r==="last"){S.from=iso(pdate(-1));S.to=iso(pend(-1))}
  else if(r==="all"){S.from="";S.to=""}}
function isCount(t){return t.category!==HLP&&t.category!==HLPO&&t.category!==TRF&&t.category!==SELF&&t.category!==IGN&&t.category!==CCB&&t.category!==LOUT&&t.category!==LIN&&t.category!==PASS}
function personOK(t){return !S.pf||S.pf==="__both"||t.person===S.pf}
function inRange(t){var d=t.txn_date||"";return personOK(t)&&(!S.from||d>=S.from)&&(!S.to||d<=S.to)}
function sum(l,ty){return l.filter(function(t){return t.type===ty}).reduce(function(a,t){return a+Number(t.amount)},0)}
function persons(){var seen={};S.txns.forEach(function(t){if(t.person)seen[t.person]=1});if(S.name)seen[S.name]=1;(S.members||[]).forEach(function(m){if(m.display_name)seen[m.display_name]=1});
  return Object.keys(seen).sort(function(a,b){return a===S.name?-1:b===S.name?1:a<b?-1:1})}
function allWord(cap){return cap?'Family':'the family'}
function personUI(){return personChips()}
