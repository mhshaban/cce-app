// Daily paddock schedule board (dashboard page and owner portal section).
// Rows come from cce_paddock_schedule(): staff get every detail, an owner
// gets details only for their own horses and a bare "booked" flag otherwise.
(function(){
  window.CCE=window.CCE||{};
  const PADDOCKS=[['big','الكبير'],['inner','الداخلي'],['outer','الخارجي']];
  const PERIODS=[
    ['morning','الحركة اليومية · Lunging / Free','كل يوم · 9:00 – 12:00'],
    ['evening','الحصص المسائية · Session','كل يوم · 3:00 – 8:00']
  ];
  const TYPES={lunge:'Lunging / Free',session:'Session',stable:'CCE Session'};
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>{const [hh,mm]=String(v||'').split(':').map(Number);if(!Number.isFinite(hh))return '';const h12=hh>12?hh-12:(hh||12);return h12+':'+String(mm||0).padStart(2,'0');};
  const range=s=>clock(s.start_time)+' – '+clock(s.end_time);
  const canManage=()=>typeof window.canUser==='function'&&window.canUser('paddocks.manage');
  let rows=[], target=null, ownerView=false;

  function slotHtml(s,manage){
    const attrs=manage?` role="button" tabindex="0" onclick="CCE.paddocks.edit(${Number(s.id)})"`:'';
    if(ownerView&&!s.mine){
      return `<li class="pd-slot ${s.booked?'pd-booked':'pd-open'}"><span class="pd-tm">${range(s)}</span><span class="pd-nm">${s.booked?'محجوز':'متاح'}</span><span class="pd-ty"></span></li>`;
    }
    if(!s.horse_name){
      const label=s.slot_type==='stable'?'حصة تدريبية (محجوز)':(manage?'+ متاح':'متاح');
      return `<li class="pd-slot ${s.slot_type==='stable'?'pd-stable':'pd-open'}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${label}</span><span class="pd-ty">${s.slot_type==='stable'?TYPES.stable:''}</span></li>`;
    }
    const meta=[s.owner,s.stable_no].filter(Boolean).map(h).join(' · ');
    const note=s.note?`<small class="pd-note">${h(s.note)}</small>`:'';
    return `<li class="pd-slot pd-${h(s.slot_type)}${s.mine&&ownerView?' pd-mine':''}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${h(s.horse_name)}<small>${meta}</small>${note}</span><span class="pd-ty">${TYPES[s.slot_type]||''}</span></li>`;
  }

  function laneHtml(period,pad,label,manage){
    const list=rows.filter(s=>s.period===period&&s.paddock===pad).sort((a,b)=>a.start_time.localeCompare(b.start_time));
    const add=manage?`<button class="pd-add" onclick="CCE.paddocks.add('${period}','${pad}')">+ Slot</button>`:'';
    return `<div class="pd-lane"><div class="pd-lane-h"><h3>البادوك ${label}</h3>${add}</div><ul class="pd-slots">${list.map(s=>slotHtml(s,manage)).join('')||'<li class="pd-slot pd-open"><span class="pd-nm">—</span></li>'}</ul></div>`;
  }

  function mineHtml(){
    const mine=rows.filter(s=>s.mine).sort((a,b)=>(a.period===b.period?0:a.period==='morning'?-1:1)||a.start_time.localeCompare(b.start_time));
    if(!mine.length)return '<div class="pd-note-box">لا توجد مواعيد لخيولك في جدول البادوكات حالياً.</div>';
    return `<div class="pd-mine-list">${mine.map(s=>`<div class="pd-mine-item"><b>${h(s.horse_name)}</b><span>${TYPES[s.slot_type]||''}</span><span class="pd-tm">${range(s)}</span><span>${s.period==='morning'?'صباحاً':'مساءً'} · البادوك ${(PADDOCKS.find(p=>p[0]===s.paddock)||[])[1]||''}</span></div>`).join('')}</div>`;
  }

  function render(){
    if(!target)return;
    const manage=!ownerView&&canManage();
    const legend=`<div class="pd-legend"><span class="pd-pill pd-lunge">Lunging / Free · 20 min</span><span class="pd-pill pd-session">Session · 45 min</span><span class="pd-pill pd-stable">CCE Session · 45 min</span>${ownerView?'<span class="pd-pill pd-booked">محجوز</span>':''}</div>`;
    const horsesCount=new Set(rows.filter(s=>s.horse_id).map(s=>s.horse_id)).size;
    const head=ownerView
      ?`<div class="pd-head"><h2>جدول البادوكات · مواعيد خيولك</h2><p>تظهر تفاصيل خيولك فقط، وباقي المواعيد المحجوزة تظهر "محجوز".</p>${legend}</div>${mineHtml()}`
      :`<div class="pd-head"><h2>جدول إشغال البادوكات اليومي</h2><p>${horsesCount} خيل مجدول · الحركة اليومية صباحاً 9:00–12:00 (20 min) · Session مساءً 3:00–8:00 (45 min)${manage?' · اضغط على أي موعد للتعديل':''}</p>${legend}</div>`;
    target.innerHTML=`<div class="pd-board" dir="rtl" lang="ar">${head}${PERIODS.map(([p,title,hrs])=>`<section class="pd-period"><div class="pd-ph"><h3>${title}</h3><span>${hrs}</span></div><div class="pd-lanes">${PADDOCKS.map(([pad,label])=>laneHtml(p,pad,label,manage)).join('')}</div></section>`).join('')}</div>`;
  }

  async function open(el,opts={}){
    target=el; ownerView=!!opts.ownerView;
    if(!target)return;
    target.innerHTML='<div class="pd-note-box">جارٍ تحميل جدول البادوكات…</div>';
    try{
      const data=await sbRpc('cce_paddock_schedule',{});
      rows=Array.isArray(data)?data:[];
      render();
    }catch(error){
      target.innerHTML=`<div class="permission-denied"><strong>Unable to load the paddock schedule.</strong><span>${h(typeof userSafeError==='function'?userSafeError(error):(error&&error.message)||error)}</span></div>`;
    }
  }

  function horseOptions(selected){
    const list=(typeof horses!=='undefined'&&Array.isArray(horses)?horses:[])
      .filter(x=>x.status==='Available'||String(x.id)===String(selected))
      .sort((a,b)=>String(a.horse_name||'').localeCompare(String(b.horse_name||'')));
    return '<option value="">— متاح (بدون خيل) —</option>'+list.map(x=>`<option value="${Number(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${h(String(x.horse_name||'').trim())}${x.owner?' · '+h(x.owner):''}</option>`).join('');
  }

  function edit(id){
    if(!canManage())return;
    const s=rows.find(x=>String(x.id)===String(id));if(!s)return;
    const pad=(PADDOCKS.find(p=>p[0]===s.paddock)||[])[1]||s.paddock;
    openModal('Paddock slot — البادوك '+pad+' · '+range(s),`<div class="form-grid">
      <div class="form-group" style="grid-column:1/-1"><label>Horse</label><select id="pd-horse">${horseOptions(s.horse_id)}</select></div>
      <div class="form-group"><label>Type</label><select id="pd-type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${k===s.slot_type?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="form-group"><label>Start</label><input type="time" id="pd-start" value="${h(s.start_time)}"></div>
      <div class="form-group"><label>End</label><input type="time" id="pd-end" value="${h(s.end_time)}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>Note</label><input type="text" id="pd-note" value="${h(s.note||'')}"></div>
    </div><div class="btn-row"><button class="btn btn-amber" onclick="CCE.paddocks.save(${Number(s.id)})">Save</button><button class="btn" style="background:#FDECEA;color:var(--red)" onclick="CCE.paddocks.remove(${Number(s.id)})">Delete slot</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
  }

  async function save(id){
    const start=document.getElementById('pd-start').value, end=document.getElementById('pd-end').value;
    if(!start||!end||end<=start){alert('End time must be after the start time.');return;}
    const horseId=document.getElementById('pd-horse').value;
    try{
      await sbPatch('paddock_slots',id,{horse_id:horseId?Number(horseId):null,slot_type:document.getElementById('pd-type').value,start_time:start,end_time:end,note:document.getElementById('pd-note').value.trim()||null});
      closeModal(); await open(target,{ownerView});
    }catch(e){showError('Paddock slot',e);}
  }

  async function add(period,paddock){
    if(!canManage())return;
    const same=rows.filter(s=>s.period===period&&s.paddock===paddock).sort((a,b)=>a.end_time.localeCompare(b.end_time));
    const last=same[same.length-1];
    const len=period==='morning'?20:45, gap=period==='morning'?0:5;
    const toMin=v=>{const [a,b]=String(v).split(':').map(Number);return a*60+b;};
    const toTime=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    const startMin=last?toMin(last.end_time)+gap:(period==='morning'?540:900);
    if(startMin+len>24*60){alert('No room left in this paddock today.');return;}
    try{
      await sbPost('paddock_slots',{period,paddock,start_time:toTime(startMin),end_time:toTime(startMin+len),slot_type:period==='morning'?'lunge':'session'});
      await open(target,{ownerView});
    }catch(e){showError('Paddock slot',e);}
  }

  async function remove(id){
    if(!confirm('Delete this paddock slot?'))return;
    try{await sbDel('paddock_slots',id);closeModal();await open(target,{ownerView});}catch(e){showError('Paddock slot',e);}
  }

  CCE.paddocks={open,render,edit,save,add,remove,_clock:clock};
})();
