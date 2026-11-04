// Daily paddock schedule board (dashboard page and owner portal section).
// Data comes from cce_paddock_schedule(date): staff get every detail, an
// owner gets details only for their own horses and a bare "booked" flag
// otherwise. Training lessons booked through the app use the big paddock
// and take priority: overlapping big-paddock slots come back bumped.
(function(){
  window.CCE=window.CCE||{};
  // Follows the app language (currentLang from app-core.js): English LTR, Arabic RTL.
  const STRINGS={
    en:{pad:{big:'Big Paddock',inner:'Inner Paddock',outer:'Outer Paddock'},
      morningTitle:'Daily Movement · Lunging / Free',morningHours:'Every day · 9:00 – 12:00',
      eveningTitle:'Evening Sessions',eveningHours:'Every day · 3:00 – 8:00',
      types:{lunge:'Lunging / Free',session:'Session',stable:'CCE Session',lesson:'Training'},
      booked:'Booked',available:'Available',trainingSession:'Training session',reservedLesson:'Training session (reserved)',
      bumpStaff:'⚠️ Clashes with a training session · the lesson has priority',
      bumpOwner:'⚠️ Today: a training session has priority at this time',
      bigSub:'App training sessions have priority',noSlots:'—',
      noMine:'None of your horses are on the paddock schedule for this day.',
      morning:'Morning',evening:'Evening',
      legendLunge:'Lunging / Free · 20 min',legendSession:'Session · 45 min',legendLesson:'Training · app bookings',legendStable:'CCE Session · 45 min',
      today:'Today',prev:'Previous day',next:'Next day',prevGlyph:'‹',nextGlyph:'›',
      ownerTitle:'Paddock Schedule · Your Horses',ownerSub:'Only your horses are shown in detail; other taken slots show as "Booked".',
      staffTitle:'Daily Paddock Schedule',
      staffSub:(n,l,m)=>`${n} horses scheduled · morning movement 9:00–12:00 (20 min) · evening sessions 3:00–8:00 (45 min)${l?` · ${l} training session${l>1?'s':''} in the Big Paddock`:''}${m?' · click any slot to edit':''}`,
      loading:'Loading the paddock schedule…',unable:'Unable to load the paddock schedule.',
      emptyHorse:'— Available (no horse) —',slotTitle:'Paddock slot',horse:'Horse',type:'Type',start:'Start',end:'End',note:'Note',
      save:'Save',del:'Delete slot',cancel:'Cancel',addSlot:'+ Slot',
      endAfter:'End time must be after the start time.',noRoom:'No room left in this paddock today.',confirmDel:'Delete this paddock slot?',
      locale:'en-GB'},
    ar:{pad:{big:'البادوك الكبير',inner:'البادوك الداخلي',outer:'البادوك الخارجي'},
      morningTitle:'الحركة اليومية · <bdi>Lunging / Free</bdi>',morningHours:'كل يوم · <bdi>9:00 – 12:00</bdi>',
      eveningTitle:'الحصص المسائية · <bdi>Session</bdi>',eveningHours:'كل يوم · <bdi>3:00 – 8:00</bdi>',
      types:{lunge:'Lunging / Free',session:'Session',stable:'CCE Session',lesson:'Training'},
      booked:'محجوز',available:'متاح',trainingSession:'حصة تدريبية',reservedLesson:'حصة تدريبية (محجوز)',
      bumpStaff:'⚠️ تتعارض مع حصة تدريبية · الأولوية للحصة',
      bumpOwner:'⚠️ هذا اليوم: الأولوية لحصة تدريبية في نفس الوقت',
      bigSub:'حصص التدريب من التطبيق لها الأولوية',noSlots:'—',
      noMine:'لا توجد مواعيد لخيولك في جدول البادوكات لهذا اليوم.',
      morning:'صباحاً',evening:'مساءً',
      legendLunge:'<bdi>Lunging / Free</bdi> · 20 دقيقة',legendSession:'<bdi>Session</bdi> · 45 دقيقة',legendLesson:'<bdi>Training</bdi> · حجوزات التطبيق',legendStable:'<bdi>CCE Session</bdi> · 45 دقيقة',
      today:'اليوم',prev:'اليوم السابق',next:'اليوم التالي',prevGlyph:'›',nextGlyph:'‹',
      ownerTitle:'جدول البادوكات · مواعيد خيولك',ownerSub:'تظهر تفاصيل خيولك فقط، وباقي المواعيد المحجوزة تظهر "محجوز".',
      staffTitle:'جدول إشغال البادوكات اليومي',
      staffSub:(n,l,m)=>`${n} خيل مجدول · الحركة اليومية صباحاً 9:00–12:00 (20 دقيقة) · الحصص مساءً 3:00–8:00 (45 دقيقة)${l?` · ${l} حصة تدريبية في البادوك الكبير`:''}${m?' · اضغط على أي موعد للتعديل':''}`,
      loading:'جارٍ تحميل جدول البادوكات…',unable:'تعذّر تحميل جدول البادوكات.',
      emptyHorse:'— متاح (بدون خيل) —',slotTitle:'موعد البادوك',horse:'الخيل',type:'النوع',start:'البداية',end:'النهاية',note:'ملاحظة',
      save:'حفظ',del:'حذف الموعد',cancel:'إلغاء',addSlot:'+ موعد',
      endAfter:'وقت النهاية لازم يكون بعد وقت البداية.',noRoom:'ما في مكان لموعد جديد في هذا البادوك اليوم.',confirmDel:'حذف هذا الموعد؟',
      locale:'ar-u-nu-latn'}
  };
  const lang=()=>(typeof currentLang!=='undefined'&&currentLang==='ar')?'ar':'en';
  const T=()=>STRINGS[lang()];
  const PADDOCKS=['big','inner','outer'];
  const PERIODS=['morning','evening'];
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>{const [hh,mm]=String(v||'').split(':').map(Number);if(!Number.isFinite(hh))return '';const h12=hh>12?hh-12:(hh||12);return h12+':'+String(mm||0).padStart(2,'0');};
  const range=s=>clock(s.start_time)+' – '+clock(s.end_time);
  const canManage=()=>typeof window.canUser==='function'&&window.canUser('paddocks.manage');
  let rows=[], lessons=[], day=null, target=null, ownerView=false;

  function lessonHtml(l){
    const t=T();
    if(ownerView&&!l.mine)return `<li class="pd-slot pd-booked"><span class="pd-tm">${range(l)}</span><span class="pd-nm">${t.booked}</span><span class="pd-ty"></span></li>`;
    if(ownerView)return `<li class="pd-slot pd-lesson pd-mine"><span class="pd-tm">${range(l)}</span><span class="pd-nm">${h(l.horse_name)}<small>${t.trainingSession}</small></span><span class="pd-ty">${t.types.lesson}</span></li>`;
    const meta=[l.horse_name,l.instructor].filter(Boolean).map(h).join(' · ');
    return `<li class="pd-slot pd-lesson"><span class="pd-tm">${range(l)}</span><span class="pd-nm">${t.trainingSession}${l.customer_name?' · '+h(l.customer_name):''}<small>${meta}</small></span><span class="pd-ty">${t.types.lesson}</span></li>`;
  }
  function slotHtml(s,manage){
    const t=T(), TYPES=t.types;
    const attrs=manage?` role="button" tabindex="0" onclick="CCE.paddocks.edit(${Number(s.id)})"`:'';
    if(s.bumped&&s.horse_name){
      const meta=[s.owner,s.stable_no].filter(Boolean).map(h).join(' · ');
      return `<li class="pd-slot pd-${h(s.slot_type)} pd-bumped${s.mine&&ownerView?' pd-mine':''}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${h(s.horse_name)}<small>${meta}</small><small class="pd-bump">${ownerView?t.bumpOwner:t.bumpStaff}</small></span><span class="pd-ty">${TYPES[s.slot_type]||''}</span></li>`;
    }
    if(ownerView&&!s.mine){
      return `<li class="pd-slot ${s.booked?'pd-booked':'pd-open'}"><span class="pd-tm">${range(s)}</span><span class="pd-nm">${s.booked?t.booked:''}</span><span class="pd-ty"></span></li>`;
    }
    if(!s.horse_name){
      const label=s.slot_type==='stable'?t.reservedLesson:(manage?'+ '+t.available:t.available);
      return `<li class="pd-slot ${s.slot_type==='stable'?'pd-stable':'pd-open'}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${label}</span><span class="pd-ty">${s.slot_type==='stable'?TYPES.stable:''}</span></li>`;
    }
    const meta=[s.owner,s.stable_no].filter(Boolean).map(h).join(' · ');
    const note=s.note?`<small class="pd-note">${h(s.note)}</small>`:'';
    return `<li class="pd-slot pd-${h(s.slot_type)}${s.mine&&ownerView?' pd-mine':''}"${attrs}><span class="pd-tm">${range(s)}</span><span class="pd-nm">${h(s.horse_name)}<small>${meta}</small>${note}</span><span class="pd-ty">${TYPES[s.slot_type]||''}</span></li>`;
  }

  function laneHtml(period,pad,manage){
    const t=T();
    // A bumped slot without a horse of the viewer's own is simply covered by the lesson.
    const slots=rows.filter(s=>s.period===period&&s.paddock===pad&&!(s.bumped&&!(s.horse_name&&(!ownerView||s.mine))))
      .map(s=>({start:s.start_time,html:slotHtml(s,manage)}));
    const items=slots.concat(lessons.filter(l=>l.period===period&&l.paddock===pad).map(l=>({start:l.start_time,html:lessonHtml(l)})))
      .sort((a,b)=>a.start.localeCompare(b.start));
    const add=manage?`<button class="pd-add" onclick="CCE.paddocks.add('${period}','${pad}')">${t.addSlot}</button>`:'';
    const sub=pad==='big'?`<small class="pd-lane-sub">${t.bigSub}</small>`:'';
    return `<div class="pd-lane"><div class="pd-lane-h"><h3>${t.pad[pad]}${sub}</h3>${add}</div><ul class="pd-slots">${items.map(i=>i.html).join('')||`<li class="pd-slot pd-open"><span class="pd-nm">${t.noSlots}</span></li>`}</ul></div>`;
  }

  function mineHtml(){
    const t=T();
    const mine=rows.filter(s=>s.mine).map(s=>({...s,kind:s.slot_type})).concat(lessons.filter(l=>l.mine).map(l=>({...l,kind:'lesson'})))
      .sort((a,b)=>a.start_time.localeCompare(b.start_time));
    if(!mine.length)return `<div class="pd-note-box">${t.noMine}</div>`;
    return `<div class="pd-mine-list">${mine.map(s=>`<div class="pd-mine-item${s.bumped?' pd-bumped':''}"><b>${h(s.horse_name)}</b><span>${s.kind==='lesson'?t.trainingSession:(t.types[s.kind]||'')}</span><span class="pd-tm">${range(s)}</span><span>${s.period==='morning'?t.morning:t.evening} · ${t.pad[s.paddock]||''}${s.bumped?' · '+t.bumpOwner:''}</span></div>`).join('')}</div>`;
  }

  function render(){
    if(!target)return;
    const t=T(), l=lang();
    const manage=!ownerView&&canManage();
    const legend=`<div class="pd-legend"><span class="pd-pill pd-lunge">${t.legendLunge}</span><span class="pd-pill pd-session">${t.legendSession}</span><span class="pd-pill pd-lesson">${t.legendLesson}</span><span class="pd-pill pd-stable">${t.legendStable}</span>${ownerView?`<span class="pd-pill pd-booked">${t.booked}</span>`:''}</div>`;
    const dayNav=`<div class="pd-day"><button onclick="CCE.paddocks.go(-1)" aria-label="${t.prev}">${t.prevGlyph}</button><input type="date" dir="ltr" value="${h(day)}" onchange="CCE.paddocks.go(0,this.value)"><button onclick="CCE.paddocks.go(1)" aria-label="${t.next}">${t.nextGlyph}</button><button class="pd-today" onclick="CCE.paddocks.go(0,'')">${t.today}</button><span>${dayLabel()}</span></div>`;
    const horsesCount=new Set(rows.filter(s=>s.horse_id).map(s=>s.horse_id)).size;
    const head=ownerView
      ?`<div class="pd-head"><h2>${t.ownerTitle}</h2><p>${t.ownerSub}</p>${dayNav}${legend}</div>${mineHtml()}`
      :`<div class="pd-head"><h2>${t.staffTitle}</h2><p>${t.staffSub(horsesCount,lessons.length,manage)}</p>${dayNav}${legend}</div>`;
    const periodHead={morning:[t.morningTitle,t.morningHours],evening:[t.eveningTitle,t.eveningHours]};
    target.innerHTML=`<div class="pd-board" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}">${head}${PERIODS.map(p=>`<section class="pd-period"><div class="pd-ph"><h3>${periodHead[p][0]}</h3><span>${periodHead[p][1]}</span></div><div class="pd-lanes">${PADDOCKS.map(pad=>laneHtml(p,pad,manage)).join('')}</div></section>`).join('')}</div>`;
  }

  function dayLabel(){
    if(!day)return '';
    const d=new Date(day+'T12:00:00');
    try{return new Intl.DateTimeFormat(T().locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);}
    catch(_e){return day;}
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
    target.innerHTML=`<div class="pd-note-box">${T().loading}</div>`;
    try{
      const data=await sbRpc('cce_paddock_schedule',day?{p_date:day}:{});
      rows=Array.isArray(data&&data.slots)?data.slots:[];
      lessons=Array.isArray(data&&data.lessons)?data.lessons:[];
      day=(data&&data.date)||day;
      render();
    }catch(error){
      target.innerHTML=`<div class="permission-denied"><strong>${T().unable}</strong><span>${h(typeof userSafeError==='function'?userSafeError(error):(error&&error.message)||error)}</span></div>`;
    }
  }

  function horseOptions(selected){
    const list=(typeof horses!=='undefined'&&Array.isArray(horses)?horses:[])
      .filter(x=>x.status==='Available'||String(x.id)===String(selected))
      .sort((a,b)=>String(a.horse_name||'').localeCompare(String(b.horse_name||'')));
    return `<option value="">${T().emptyHorse}</option>`+list.map(x=>`<option value="${Number(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${h(String(x.horse_name||'').trim())}${x.owner?' · '+h(x.owner):''}</option>`).join('');
  }

  function edit(id){
    if(!canManage())return;
    const s=rows.find(x=>String(x.id)===String(id));if(!s)return;
    const t=T();
    openModal(t.slotTitle+' — '+(t.pad[s.paddock]||s.paddock)+' · '+range(s),`<div class="form-grid">
      <div class="form-group" style="grid-column:1/-1"><label>${t.horse}</label><select id="pd-horse">${horseOptions(s.horse_id)}</select></div>
      <div class="form-group"><label>${t.type}</label><select id="pd-type">${['lunge','session','stable'].map(k=>`<option value="${k}" ${k===s.slot_type?'selected':''}>${t.types[k]}</option>`).join('')}</select></div>
      <div class="form-group"><label>${t.start}</label><input type="time" id="pd-start" value="${h(s.start_time)}"></div>
      <div class="form-group"><label>${t.end}</label><input type="time" id="pd-end" value="${h(s.end_time)}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>${t.note}</label><input type="text" id="pd-note" value="${h(s.note||'')}"></div>
    </div><div class="btn-row"><button class="btn btn-amber" onclick="CCE.paddocks.save(${Number(s.id)})">${t.save}</button><button class="btn" style="background:#FDECEA;color:var(--red)" onclick="CCE.paddocks.remove(${Number(s.id)})">${t.del}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">${t.cancel}</button></div>`);
  }

  async function save(id){
    const start=document.getElementById('pd-start').value, end=document.getElementById('pd-end').value;
    if(!start||!end||end<=start){alert(T().endAfter);return;}
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
    if(startMin+len>24*60){alert(T().noRoom);return;}
    try{
      await sbPost('paddock_slots',{period,paddock,start_time:toTime(startMin),end_time:toTime(startMin+len),slot_type:period==='morning'?'lunge':'session'});
      await open(target,{ownerView});
    }catch(e){showError('Paddock slot',e);}
  }

  async function remove(id){
    if(!confirm(T().confirmDel))return;
    try{await sbDel('paddock_slots',id);closeModal();await open(target,{ownerView});}catch(e){showError('Paddock slot',e);}
  }

  CCE.paddocks={open,render,go,edit,save,add,remove,_clock:clock};
})();
