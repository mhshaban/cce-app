// CCE StableOS v4.34.0 — Paddock board (جدول البادوكات)
// Dashboard page `paddocks` (full board, editable with paddocks.manage) and a
// read-only section in the Owner Portal. All data comes from the
// cce_paddock_board() RPC, which masks other owners' horses on the server.
(function(){
  'use strict';
  const P=()=>window.CCE.paddocks;
  const h=value=>typeof esc==='function'?esc(String(value==null?'':value)):String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const can=code=>typeof window.canUser==='function'&&window.canUser(code);
  const safeError=error=>typeof userSafeError==='function'?userSafeError(error):String((error&&error.message)||error||'');
  let adminBoard={full:false,slots:[]};
  let editingId=null;

  async function fetchBoard(){
    const raw=await sbRpc('cce_paddock_board',{});
    const board=Array.isArray(raw)?raw[0]:raw;
    return {full:!!(board&&board.full),slots:Array.isArray(board&&board.slots)?board.slots:[]};
  }

  function slotHTML(slot,options){
    const service=P();
    const cls=slot.activity==='stable_session'?'stable':slot.reserved?'reserved':slot.activity;
    const mine=slot.mine&&!options.full?' mine':'';
    const meta=!slot.reserved&&slot.horse_name
      ?`<small>${h([slot.owner,slot.stable_no].filter(Boolean).join(' · '))}</small>`:'';
    const note=slot.note?`<small class="paddock-note">${h(slot.note)}</small>`:'';
    const tag=slot.activity==='stable_session'||slot.reserved?'':`<span class="paddock-tag">${h(service.activityLabel(slot.activity))}</span>`;
    const actions=options.editable
      ?`<span class="paddock-actions"><button type="button" class="paddock-icon-btn" onclick="editPaddockSlot(${Number(slot.id)})" aria-label="Edit slot">✏️</button><button type="button" class="paddock-icon-btn" onclick="deletePaddockSlot(${Number(slot.id)})" aria-label="Delete slot">🗑️</button></span>`:'';
    return `<li class="paddock-slot ${cls}${mine}"><span class="paddock-time">${h(service.clock(slot.start_time))} – ${h(service.clock(slot.end_time))}</span><span class="paddock-name">${h(service.slotTitle(slot))}${meta}${note}</span>${tag}${actions}</li>`;
  }

  function boardHTML(board,options){
    const service=P();
    const grouped=service.group(board.slots);
    return service.PERIODS.map(period=>{
      const lanes=service.PADDOCKS.map(paddock=>{
        const list=grouped[period.code][paddock.code];
        const body=list.length?list.map(slot=>slotHTML(slot,options)).join(''):'<li class="paddock-empty">—</li>';
        return `<div class="paddock-lane"><h4>${h(paddock.label)}</h4><ul>${body}</ul></div>`;
      }).join('');
      return `<section class="paddock-period"><div class="paddock-period-head"><h3>${h(period.label)}</h3><span>${h(period.hours)}</span></div><div class="paddock-lanes">${lanes}</div></section>`;
    }).join('');
  }

  function legendHTML(){
    const service=P();
    return `<div class="paddock-legend"><span class="paddock-pill movement">${h(service.activityLabel('movement'))} · 20 min</span><span class="paddock-pill session">${h(service.activityLabel('session'))} · 45 min</span><span class="paddock-pill stable">${h(service.activityLabel('stable_session'))} · 45 min</span></div>`;
  }

  // ── Dashboard page ──────────────────────────────────────────────────────
  function horseOptions(selected){
    const list=(window.CCE.horses&&typeof horses!=='undefined'?CCE.horses.active(horses):[])
      .filter(x=>x.horse_name)
      .sort((a,b)=>String(a.horse_name).trim().localeCompare(String(b.horse_name).trim()));
    return '<option value="">— Choose horse —</option>'+list.map(x=>`<option value="${Number(x.id)}"${String(x.id)===String(selected)?' selected':''}>${h(String(x.horse_name).trim())}${x.owner?' · '+h(x.owner):''}</option>`).join('');
  }

  function formHTML(slot){
    const service=P();
    const s=slot||{paddock:'inner',activity:'movement',start_time:'09:00',end_time:'09:20'};
    const opt=(list,value)=>list.map(([code,label])=>`<option value="${h(code)}"${code===value?' selected':''}>${h(label)}</option>`).join('');
    return `<div class="card paddock-form" id="paddockForm">
      <div class="card-title">${slot?'✏️ Edit slot':'➕ Add slot'}</div>
      <div class="form-grid">
        <div class="form-group"><label for="pd-paddock">Paddock</label><select id="pd-paddock">${opt(service.PADDOCKS.map(p=>[p.code,p.label]),s.paddock)}</select></div>
        <div class="form-group"><label for="pd-activity">Activity</label><select id="pd-activity" onchange="paddockActivityChanged()">${opt(Object.entries(service.ACTIVITIES).map(([code,a])=>[code,code==='stable_session'?service.STABLE_LABEL:a.label]),s.activity)}</select></div>
        <div class="form-group"><label for="pd-start">Start</label><input id="pd-start" type="time" value="${h(String(s.start_time).slice(0,5))}" onchange="paddockActivityChanged()"/></div>
        <div class="form-group"><label for="pd-end">End</label><input id="pd-end" type="time" value="${h(String(s.end_time).slice(0,5))}"/></div>
        <div class="form-group" id="pd-horse-group"${s.activity==='stable_session'?' style="display:none"':''}><label for="pd-horse">Horse</label><select id="pd-horse">${horseOptions(s.horse_id)}</select></div>
        <div class="form-group"><label for="pd-note">Note</label><input id="pd-note" type="text" maxlength="180" value="${h(s.note||'')}"/></div>
      </div>
      <div class="paddock-form-actions"><button type="button" class="btn btn-green" onclick="savePaddockSlot()">💾 Save</button><button type="button" class="cancel-btn" onclick="closePaddockForm()">Cancel</button></div>
      <div class="err" id="pd-error" style="display:none"></div>
    </div>`;
  }

  function drawAdmin(){
    const el=document.getElementById('paddockBoard');
    if(!el)return;
    const editable=can('paddocks.manage');
    const editingSlot=editingId==null?null:adminBoard.slots.find(s=>String(s.id)===String(editingId))||null;
    const form=editable&&editingId!==null?formHTML(editingSlot):'';
    const add=editable&&editingId===null?'<button type="button" class="btn paddock-add-btn" onclick="openPaddockForm()">➕ Add slot</button>':'';
    el.innerHTML=`<div class="paddock-toolbar">${legendHTML()}${add}</div>${form}<div class="paddock-board">${boardHTML(adminBoard,{editable,full:true})}</div>`;
  }

  async function renderPaddockPage(){
    const el=document.getElementById('paddockBoard');
    if(!el)return;
    el.innerHTML='<div class="member-empty">Loading paddock board…</div>';
    try{
      adminBoard=await fetchBoard();
      drawAdmin();
    }catch(error){
      el.innerHTML=`<div class="permission-denied"><strong>Unable to load the paddock board.</strong><span>${h(safeError(error))}</span></div>`;
    }
  }

  window.renderPaddockPage=renderPaddockPage;
  window.openPaddockForm=function(){editingId='new';drawAdmin();};
  window.editPaddockSlot=function(id){editingId=id;drawAdmin();};
  window.closePaddockForm=function(){editingId=null;drawAdmin();};
  window.paddockActivityChanged=function(){
    const activity=document.getElementById('pd-activity').value;
    const group=document.getElementById('pd-horse-group');
    if(group)group.style.display=activity==='stable_session'?'none':'';
    const end=document.getElementById('pd-end');
    const start=document.getElementById('pd-start').value;
    if(end&&start)end.value=P().defaultEnd(start,activity);
  };
  window.savePaddockSlot=async function(){
    const err=document.getElementById('pd-error');
    const activity=document.getElementById('pd-activity').value;
    const horse=document.getElementById('pd-horse').value;
    const payload={
      p_id:editingId==='new'||editingId==null?null:Number(editingId),
      p_paddock:document.getElementById('pd-paddock').value,
      p_start_time:document.getElementById('pd-start').value,
      p_end_time:document.getElementById('pd-end').value,
      p_activity:activity,
      p_horse_id:activity==='stable_session'||!horse?null:Number(horse),
      p_note:document.getElementById('pd-note').value
    };
    try{
      await sbRpc('cce_paddock_save_slot',payload);
      editingId=null;
      await renderPaddockPage();
    }catch(error){
      if(err){err.textContent=safeError(error);err.style.display='block';}
    }
  };
  window.deletePaddockSlot=async function(id){
    const slot=adminBoard.slots.find(s=>String(s.id)===String(id));
    const label=slot?`${P().slotTitle(slot)} · ${P().clock(slot.start_time)}`:'';
    if(!confirm('Delete this paddock slot?\n'+label))return;
    try{
      await sbRpc('cce_paddock_delete_slot',{p_id:Number(id)});
      if(String(editingId)===String(id))editingId=null;
      await renderPaddockPage();
    }catch(error){
      if(typeof showError==='function')showError('Paddock board',error);
    }
  };

  // ── Owner portal ────────────────────────────────────────────────────────
  async function renderOwnerPaddocks(){
    const section=document.getElementById('ownerPaddockSection');
    const el=document.getElementById('ownerPaddockBoard');
    if(!section||!el)return;
    try{
      const board=await fetchBoard();
      if(!board.slots.length){section.style.display='none';return;}
      el.innerHTML=legendHTML()+`<div class="paddock-board">${boardHTML(board,{editable:false,full:board.full})}</div>`;
      section.style.display='';
    }catch(_error){
      // Before the v4.34.0 migration (or without permission) the owner portal stays as it was.
      section.style.display='none';
    }
  }
  window.renderOwnerPaddocks=renderOwnerPaddocks;
})();
