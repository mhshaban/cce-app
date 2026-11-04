// Daily paddock schedule board (dashboard page and owner portal section).
// Data comes from cce_paddock_schedule(date): staff get every detail, an
// owner gets details only for their own horses and a bare "booked" flag
// otherwise. Training lessons booked through the app use the big paddock
// and take priority: overlapping big-paddock slots come back bumped.
(function(){
  window.CCE=window.CCE||{};
  const PADDOCKS=[['big','الكبير'],['inner','الداخلي'],['outer','الخارجي']];
  const PERIODS=[
    ['morning','الحركة اليومية · Lunging / Free','كل يوم · 9:00 – 12:00'],
    ['evening','الحصص المسائية · Session','كل يوم · 3:00 – 8:00']
  ];
  const TYPES={lunge:'Lunging / Free',session:'Session',stable:'CCE Session',lesson:'Training'};
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>{const [hh,mm]=String(v||'').split(':').map(Number);if(!Number.isFinite(hh))return '';const h12=hh>12?hh-12:(hh||12);return h12+':'+String(mm||0).padStart(2,'0');};
  const range=s=>clock(s.start_time)+' – '+clock(s.end_time);
  const canManage=()=>typeof window.canUser==='function'&&window.canUser('paddocks.manage');
  let rows=[], lessons=[], day=null, target=null, ownerView=false;

  const BUMP_STAFF='⚠️ تتعارض مع حصة تدريبية · الأولوية للحصة';
  const BUMP_OWNER='⚠️ هذا اليوم: الأولوية لحصة تدريبية في نفس الوقت';
  function lessonHtml(l){
    if(ownerView&&!l.mine)return `<li class="pd-slot pd-booked"><span class="pd-tm">${range(l)}</span><span class="pd-nm">محجوز</span><span class="pd-ty"></span></li>`;
    if(ownerView)return `<li class="pd-slot pd-lesson pd-mine"><span class="pd-tm">${range(l)}</span><span class="pd-nm">${h(l.horse_name)}<small>حصة تدريبية</small></span><span class="pd-ty">${TYPES.lesson}</span></li>`;
    const meta=[l.horse_name,l.instructor].filter(Boolean).map(h).join(' · ');
    return `<li class="pd-slot pd-lesson"><span class="pd-tm">${range(l)}</span><span class="pd-nm">حصة تدريبية${l.customer_name?' · '+h(l.customer_name):''}<small>${meta}</small></span><span class="pd-ty">${TYPES.lesson}</span></li>`;
  }
  function slotHtml(s,manage){
    const attrs=manage?` role="button" tabindex="0" onclick="CCE.paddocks.edit(${Number(s.id)})"`:'';
    if(s.bumped&&s.horse_name){
      const meta=[s.owner,s.stable_no].filter(Boolean).map(h).join(' · ');
      return `<li class="pd-slot pd-${h(s.slot_type)} pd-bumped${s.mine&&ownerView?' pd-mine':''}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${h(s.horse_name)}<small>${meta}</small><small class="pd-bump">${ownerView?BUMP_OWNER:BUMP_STAFF}</small></span><span class="pd-ty">${TYPES[s.slot_type]||''}</span></li>`;
    }
    if(ownerView&&!s.mine){
      return `<li class="pd-slot ${s.booked?'pd-booked':'pd-open'}"><span class="pd-tm">${range(s)}</span><span class="pd-nm">${s.booked?'محجوز':''}</span><span class="pd-ty"></span></li>`;
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
    // A bumped slot without a horse of the viewer's own is simply covered by the lesson.
    const slots=rows.filter(s=>s.period===period&&s.paddock===pad&&!(s.bumped&&!(s.horse_name&&(!ownerView||s.mine))))
      .map(s=>({start:s.start_time,html:slotHtml(s,manage)}));
    const items=slots.concat(lessons.filter(l=>l.period===period&&l.paddock===pad).map(l=>({start:l.start_time,html:lessonHtml(l)})))
      .sort((a,b)=>a.start.localeCompare(b.start));
    const add=manage?`<button class="pd-add" onclick="CCE.paddocks.add('${period}','${pad}')">+ Slot</button>`:'';
    const sub=pad==='big'?'<small class="pd-lane-sub">حصص التدريب من التطبيق لها الأولوية</small>':'';
    return `<div class="pd-lane"><div class="pd-lane-h"><h3>البادوك ${label}${sub}</h3>${add}</div><ul class="pd-slots">${items.map(i=>i.html).join('')||'<li class="pd-slot pd-open"><span class="pd-nm">—</span></li>'}</ul></div>`;
  }

  function mineHtml(){
    const mine=rows.filter(s=>s.mine).map(s=>({...s,kind:s.slot_type})).concat(lessons.filter(l=>l.mine).map(l=>({...l,kind:'lesson'})))
      .sort((a,b)=>a.start_time.localeCompare(b.start_time));
    if(!mine.length)return '<div class="pd-note-box">لا توجد مواعيد لخيولك في جدول البادوكات لهذا اليوم.</div>';
    return `<div class="pd-mine-list">${mine.map(s=>`<div class="pd-mine-item${s.bumped?' pd-bumped':''}"><b>${h(s.horse_name)}</b><span>${s.kind==='lesson'?'حصة تدريبية':(TYPES[s.kind]||'')}</span><span class="pd-tm">${range(s)}</span><span>${s.period==='morning'?'صباحاً':'مساءً'} · البادوك ${(PADDOCKS.find(p=>p[0]===s.paddock)||[])[1]||''}${s.bumped?' · '+BUMP_OWNER:''}</span></div>`).join('')}</div>`;
  }

  function render(){
    if(!target)return;
    const manage=!ownerView&&canManage();
    const legend=`<div class="pd-legend"><span class="pd-pill pd-lunge">Lunging / Free · 20 min</span><span class="pd-pill pd-session">Session · 45 min</span><span class="pd-pill pd-lesson">Training · حجوزات التطبيق</span><span class="pd-pill pd-stable">CCE Session · 45 min</span>${ownerView?'<span class="pd-pill pd-booked">محجوز</span>':''}</div>`;
    const dayNav=`<div class="pd-day"><button onclick="CCE.paddocks.go(-1)" aria-label="Previous day">›</button><input type="date" value="${h(day)}" onchange="CCE.paddocks.go(0,this.value)"><button onclick="CCE.paddocks.go(1)" aria-label="Next day">‹</button><button class="pd-today" onclick="CCE.paddocks.go(0,'')">اليوم</button><span>${dayLabel()}</span></div>`;
    const horsesCount=new Set(rows.filter(s=>s.horse_id).map(s=>s.horse_id)).size;
    const head=ownerView
      ?`<div class="pd-head"><h2>جدول البادوكات · مواعيد خيولك</h2><p>تظهر تفاصيل خيولك فقط، وباقي المواعيد المحجوزة تظهر "محجوز".</p>${dayNav}${legend}</div>${mineHtml()}`
      :`<div class="pd-head"><h2>جدول إشغال البادوكات اليومي</h2><p>${horsesCount} خيل مجدول · الحركة اليومية صباحاً 9:00–12:00 (20 min) · Session مساءً 3:00–8:00 (45 min)${lessons.length?' · '+lessons.length+' حصة تدريبية في البادوك الكبير':''}${manage?' · اضغط على أي موعد للتعديل':''}</p>${dayNav}${legend}</div>`;
    target.innerHTML=`<div class="pd-board" dir="rtl" lang="ar">${head}${PERIODS.map(([p,title,hrs])=>`<section class="pd-period"><div class="pd-ph"><h3>${title}</h3><span>${hrs}</span></div><div class="pd-lanes">${PADDOCKS.map(([pad,label])=>laneHtml(p,pad,label,manage)).join('')}</div></section>`).join('')}</div>`;
  }

  const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  function dayLabel(){
    if(!day)return '';
    const d=new Date(day+'T12:00:00');
    return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();
  }
  function shift(iso,delta){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+delta);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function go(delta,value){
    if(value===''){day=null;}else if(value){day=value;}else if(day){day=shift(day,delta);}
    return open(target,{ownerView,date:day});
  }
  async function open(el,opts={}){
    target=el; ownerView=!!opts.ownerView;
    if('date' in opts)day=opts.date||null;
    if(!target)return;
    target.innerHTML='<div class="pd-note-box">جارٍ تحميل جدول البادوكات…</div>';
    try{
      const data=await sbRpc('cce_paddock_schedule',day?{p_date:day}:{});
      rows=Array.isArray(data&&data.slots)?data.slots:[];
      lessons=Array.isArray(data&&data.lessons)?data.lessons:[];
      day=(data&&data.date)||day;
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

  CCE.paddocks={open,render,go,edit,save,add,remove,_clock:clock};
})();
