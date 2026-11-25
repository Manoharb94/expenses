/* On-phone readers: bank SMS and spoken expenses become payments without any server. Pure functions, no network. */
(function(root){
var MONEY="(?:₹|rs\\.?|inr|rupees?)";
var NUM="([0-9][0-9,]*(?:\\.[0-9]{1,2})?)";
var OUTW=/\b(debited|debit|spent|sent|paid|withdrawn|withdrawal|purchase|purchased|deducted|transferred to|payment of|txn of|dr\.?)\b/i;
var INW=/\b(credited|credit|received|deposited|refund(?:ed)?|reversed|reversal|cashback|cr\.?)\b/i;
function num(s){var n=parseFloat(String(s).replace(/,/g,""));return isFinite(n)?n:0}
function clean(m){
  if(!m)return "";
  m=String(m).replace(/\s+/g," ").trim();
  m=m.replace(/^(?:vpa|upi|mr\.?|mrs\.?|ms\.?|m\/s\.?|the)\s+/i,"");
  m=m.replace(/\s+(?:on|ref|refno|ref no|upi ref|avl|avbl|bal|balance|not you|if not|info|txn|via|using|at|dt|date)\b.*$/i,"").replace(/\s+-\s.*$/,"");
  m=m.replace(/[.,;:*\-\s]+$/,"").replace(/^[.,;:*\-\s]+/,"");
  var at=m.indexOf("@");
  if(at>0){var u=m.slice(0,at);if(/^\d{8,}$/.test(u))u="UPI "+u.slice(-4);m=u.replace(/[._-]+/g," ")}
  if(/^[0-9x*\s]+$/i.test(m))return "";
  if(m.length>40)m=m.slice(0,40).trim();
  return m.replace(/\b([a-z])([a-z]*)/gi,function(_,a,b){return a.toUpperCase()+b.toLowerCase()});
}
function mkey(m){return (String(m||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""))||"unknown"}
function firstIdx(re,t){var m=re.exec(t);return m?m.index:-1}
/** Reads one bank SMS. Returns null if it is not a payment. */
function parseSms(text){
  var t=String(text||"").replace(/\s+/g," ").trim();if(t.length<15)return null;
  if(/\b(otp|one[ -]time password|verification code)\b/i.test(t))return null;
  if(/\b(will be debited|is due|due on|due date|requested|request of|collect request|has requested|minimum amount|emi of .* due|failed|declined|unsuccessful|reminder)\b/i.test(t)&&!/\b(has been|is|was)\s+(debited|credited)\b/i.test(t))return null;
  var amt=0,m;
  var res=[new RegExp(MONEY+"\\s?"+NUM,"i"),new RegExp(NUM+"\\s?(?:₹|rs\\.?|inr)\\b","i"),/(?:debited|credited|deducted|withdrawn)\s+(?:by|with|for|of)\s+(?:rs\.?|inr|₹)?\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i];
  for(var i=0;i<res.length&&!amt;i++){m=res[i].exec(t);if(m)amt=num(m[1])}
  if(!amt||amt<=0)return null;
  var io=firstIdx(OUTW,t),ii=firstIdx(INW,t);
  if(io<0&&ii<0)return null;
  var type;
  if(/credited to (?:your|ur|a\/c|ac|acct|account)|received in your|deposited (?:in|to|into) your|credited in your|has been credited|is credited|was credited/i.test(t)&&!/debited (?:from|to)? ?(?:your|ur|a\/c)|has been debited|is debited|was debited/i.test(t))type="in";
  else if(/debited|spent|sent|paid|withdrawn|purchase|deducted/i.test(t)&&!/^(?:.{0,40})(?:credited|received)/i.test(t))type="out";
  else type=(ii>=0&&(io<0||ii<io))?"in":"out";
  if(/refund|reversal|reversed|cashback/i.test(t)&&!/debited/i.test(t))type="in";
  var E="(?=\\s+(?:on|ref|refno|upi|via|dt|date|avl|avbl|info|from|using|for|txn|not)\\b|\\s*[.;,(]|\\s*$)",W="([A-Za-z0-9 .&'@_*-]{2,40}?)";
  var mer="",P=[
    /;\s*([A-Za-z0-9 .&'@_-]{2,40}?)\s+credited/i,                         // ICICI: "...; ZOMATO credited"
    new RegExp("\\btrf to\\s+"+W+E,"i"),                                  // SBI: "trf to SWIGGY Refno"
    /\bupi\/(?:p2m|p2a|dr|cr)?\/?\d{6,}\/([A-Za-z0-9 .&'_-]{2,40})/i,  // Axis: "UPI/P2M/1234/NETFLIX"
    /\b(?:to|from)\s+vpa\s+([A-Za-z0-9._-]+@[A-Za-z0-9.]+)/i,
    new RegExp("\\bat\\s+"+W+E,"i"),
    new RegExp("\\bmerchant\\s+"+W+E,"i"),
    new RegExp("\\bto\\s+"+W+E,"i"),
    new RegExp("\\bfrom\\s+(?!(?:your|ur|a\\/c|ac|acct|account|hdfc|icici|sbi|axis|kotak|bank)\\b)"+W+E,"i"),
    new RegExp("\\bby\\s+(?!(?:rs|inr|₹|\\d|neft|imps|rtgs|upi|a\\/c))"+W+E,"i"),
    /\binfo[:\s]+(?:upi\/)?([A-Za-z0-9 .&'_\/-]{2,40})/i,
    /([A-Za-z0-9._-]+@[A-Za-z]{2,})/];
  for(var j=0;j<P.length&&!mer;j++){m=P[j].exec(t);if(m){var c=clean(m[1]);if(c&&!/^(your|ur|a\/c|ac|acct|account|card|bank|upi)$/i.test(c)&&!/\b(a\/c|acct|account|card|your|ur)\b/i.test(c)&&!/^(neft|imps|rtgs|upi|atm)$/i.test(c))mer=c}}
  if(!mer)mer=type==="in"?"Money received":"UPI payment";
  var ref=(/(?:upi ref(?: no)?|ref(?:erence)?(?: no| number)?|refno|rrn|utr|txn id|transaction id)[:.\s#]*([A-Za-z0-9]{6,})/i.exec(t)||[])[1]||"";
  var card=(/(?:a\/c|ac|acct|account|card)(?:\s*no\.?)?[^0-9]{0,12}[x*]*([0-9]{3,6})\b/i.exec(t)||[])[1]||"";
  return {amount:Math.round(amt*100)/100,type:type,merchant:mer,merchant_key:mkey(mer),ref:ref,card_last:card?card.slice(-4):""};
}
/** Reads a spoken expense like "spent 100 rs for auto" or "received 1000 from Manohar". */
var VCAT=[[/\b(auto|rickshaw|bus|metro|cab|uber|ola|rapido|taxi|train|ticket|parking|toll)\b/,"Transport"],[/\b(petrol|diesel|fuel|cng)\b/,"Fuel"],[/\b(grocery|groceries|vegetables?|sabzi|milk|kirana|fruits?|rice|dal|atta)\b/,"Groceries"],[/\b(food|lunch|dinner|breakfast|tea|chai|coffee|snacks?|restaurant|swiggy|zomato|biryani)\b/,"Food"],[/\b(medicines?|doctor|hospital|pharmacy|clinic|dawai)\b/,"Health"],[/\brent\b/,"House Rent"],[/\b(electricity|current|bill|recharge|wifi|internet|gas|water)\b/,"Bills & Utilities"],[/\b(movie|cinema|netflix|games?)\b/,"Entertainment"],[/\b(school|fees|tuition|books|class)\b/,"Education"],[/\b(clothes|shirt|shoes|shopping|amazon|flipkart)\b/,"Shopping"]];
function parseVoice(text){
  var t=String(text||"").toLowerCase().replace(/,/g,"").trim();if(!t)return null;
  var a=/([0-9]+(?:\.[0-9]+)?)\s*(k\b|thousand|hazaar|hazar|lakh)?/.exec(t);if(!a)return null;
  var amt=parseFloat(a[1]);if(a[2]==="k"||a[2]==="thousand"||a[2]==="hazaar"||a[2]==="hazar")amt*=1000;else if(a[2]==="lakh")amt*=100000;if(!(amt>0))return null;
  var inn=/\b(received|receive|got|credited|credit|refund|salary|earned|income|mila|mile)\b/.test(t),m=null;
  if(inn)m=(/\b(?:from|by|se)\s+(.+)$/.exec(t)||[])[1];else m=(/\b(?:for|on|to|at|ke liye|ko)\s+(.+)$/.exec(t)||[])[1];
  if(!m){m=t.replace(/(?:₹|\brs\.?|\binr\b|\brupees?\b|\brupaye\b|\brupay\b)\s*[0-9.]*/g," ").replace(/[0-9][0-9.]*\s*(k\b|thousand|hazaar|hazar|lakh)?\s*(rs\b\.?|inr\b|rupees?\b|rupaye\b)?/g," ").replace(/\b(spent|paid|pay|gave|give|received|receive|got|credited|credit|refund|rs|inr|rupees|rupee|rupaye|of|the|a|an|today|yesterday|kharcha|diya|diye)\b/g," ")}
  m=String(m||"").replace(/\b(rs|rupees?|rupaye|inr)\b\.?/g," ").replace(/[0-9.]+/g," ").replace(/\s+/g," ").trim().replace(/^(the|a|an|my)\s+/,"");
  if(!m)m=inn?"Received":"Cash";m=m.slice(0,40).replace(/\b([a-z])/g,function(x){return x.toUpperCase()});
  var cat=null;if(!inn)for(var i=0;i<VCAT.length;i++)if(VCAT[i][0].test(t)){cat=VCAT[i][1];break}
  return {amount:Math.round(amt*100)/100,type:inn?"in":"out",merchant:m,merchant_key:mkey(m),category:cat};
}
var api={parseSms:parseSms,parseVoice:parseVoice,mkey:mkey,clean:clean};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.GWSMS=api;
})(typeof window!=="undefined"?window:this);
