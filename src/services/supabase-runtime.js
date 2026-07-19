// CCE StableOS v4 — authenticated Supabase REST runtime.
// Compatibility globals are preserved while API/session logic lives outside the UI module.
let SB_ACCESS_TOKEN=sessionStorage.getItem('cce_sb_access_token')||'';
function buildHeaders(prefer='return=representation'){
  return {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+(SB_ACCESS_TOKEN||SB_KEY),'Prefer':prefer};
}
let HDR=buildHeaders();
function setSupabaseSession(token,expiresIn){
  SB_ACCESS_TOKEN=token||'';
  if(SB_ACCESS_TOKEN){
    sessionStorage.setItem('cce_sb_access_token',SB_ACCESS_TOKEN);
    sessionStorage.setItem('cce_sb_token_until',String(Date.now()+((expiresIn||3600)-60)*1000));
  }else{
    sessionStorage.removeItem('cce_sb_access_token');
    sessionStorage.removeItem('cce_sb_token_until');
  }
  HDR=buildHeaders();
  if(window.CCE&&CCE.events) CCE.events.emit('session:changed',{authenticated:Boolean(SB_ACCESS_TOKEN)});
}
function hasSupabaseSession(){
  const until=parseInt(sessionStorage.getItem('cce_sb_token_until')||'0',10);
  if(SB_ACCESS_TOKEN && (!until || until>Date.now())) return true;
  if(until && until<=Date.now()) setSupabaseSession('',0);
  return false;
}

// Security hardening for the static admin page.
// IMPORTANT: client-side checks are only a UI gate; Supabase Row Level Security should still be enabled in production.
const ADMIN_PASS_SHA256=''; // Legacy fallback disabled; unified Supabase Auth is required.
const ADMIN_SESSION_MS=8*60*60*1000;
async function sha256Hex(str){
  if(!window.crypto||!crypto.subtle) return '';
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function isAdminAuthed(){
  const until=parseInt(sessionStorage.getItem('cce_auth_until')||'0',10);
  if(sessionStorage.getItem('cce_auth')==='true' && until>Date.now()) return true;
  if(hasSupabaseSession()){
    sessionStorage.setItem('cce_auth','true');
    sessionStorage.setItem('cce_auth_until',String(Date.now()+ADMIN_SESSION_MS));
    return true;
  }
  sessionStorage.removeItem('cce_auth');
  sessionStorage.removeItem('cce_auth_until');
  return false;
}

async function sbGet(t,q=''){
  const query=String(q||'').replace(/^&+|&+$/g,'');
  const order=/(^|&)order=/.test(query)?'':'order=id.asc';
  const suffix=[query,order].filter(Boolean).join('&');
  const r=await fetch(`${SB_URL}/rest/v1/${t}?${suffix}`,{headers:HDR});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
function tableRowsForAudit(t){return ({income,expenses,horses,breeding,schedule:schedule_data,instructors:instructors_data,booking_requests})[t]||[];}
async function sbPost(t,d,opts={}){
  const data={...d};delete data.id;
  const prefer=opts.prefer||'return=representation';
  const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:buildHeaders(prefer),body:JSON.stringify(data)});
  if(!r.ok)throw new Error(await r.text());
  let out=[];
  if(!/return=minimal/i.test(prefer)){
    try{out=await r.json();}catch(e){out=[];}
  }
  if(!opts.skipAudit&&t!=='audit_logs')queueAudit('create',t,(out&&out[0]&&out[0].id)||'',null,(out&&out[0])||data);
  return out;
}

async function publicSubmitBooking(data){
  // The database owns price, capacity, rate limiting and the finance/intake transaction.
  return sbRpc('cce_public_submit_booking',data,{prefer:'return=representation'});
}
async function sbRpc(fn,payload={},opts={}){
  const prefer=opts.prefer||'return=representation';
  const r=await fetch(`${SB_URL}/rest/v1/rpc/${fn}`,{
    method:'POST',
    headers:buildHeaders(prefer),
    body:JSON.stringify(payload||{})
  });
  const txt=await r.text();
  let json=null;try{json=txt?JSON.parse(txt):null;}catch(e){}
  if(!r.ok){
    const msg=(json&&(json.message||json.error))||txt||('Supabase request failed: '+r.status);
    throw new Error(msg);
  }
  return json||[];
}
async function sbPatch(t,id,d,opts={}){
  const before=(tableRowsForAudit(t).find(x=>String(x.id)===String(id))||null);
  const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:HDR,body:JSON.stringify(d)});
  if(!r.ok)throw new Error(await r.text());
  const out=await r.json();
  if(!opts.skipAudit&&t!=='audit_logs')queueAudit('update',t,id,before,(out&&out[0])||d);
  return out;
}
async function sbDel(t,id,opts={}){
  const before=(tableRowsForAudit(t).find(x=>String(x.id)===String(id))||null);
  const r=await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:buildHeaders('return=minimal')});
  if(!r.ok)throw new Error(await r.text());
  if(!opts.skipAudit&&t!=='audit_logs')queueAudit('delete',t,id,before,null);
}

