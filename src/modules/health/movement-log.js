// Movement & lameness log and pre/post-ride checks (v4.38.0).
// Observations (horse_movement_logs) and coach checklists (horse_ride_checks)
// live in Supabase next to the horse health file. Photos and videos go to the
// private horse-media bucket and are shown through short-lived signed URLs.
// A log or a post-ride "call the vet" decision can open a veterinary
// follow-up care task in horse_health_events (source_table links it back).
(function(){
  window.CCE=window.CCE||{};
  const BUCKET='horse-media';
  const MAX_FILE=50*1024*1024;
  const LIMBS=['LF','RF','LH','RH'];
  const SEVERITIES=['none','mild','moderate','severe'];
  const ONSETS=['before_ride','during_ride','after_ride','not_ridden'];
  const SYMPTOMS=['lameness','discomfort','gait_change','stumbling','swelling','heat','other'];
  const DECISIONS=['continue','monitor','rest','vet'];
  const CHECK_ITEMS={
    pre:['movement','legs','hooves','back','tack'],
    post:['movement','legs','back','recovery']
  };
  const STRINGS={
    en:{title:'Movement & Lameness',sub:'Lameness observations and coaches\' pre/post-ride checks, saved to each horse\'s health file.',
      profileTitle:'Movement & lameness',profileSub:'Observations, ride checks, photos and videos for this horse.',
      addLog:'+ Observation',addPre:'+ Pre-ride check',addPost:'+ Post-ride check',
      horse:'Horse',allHorses:'All horses',from:'From',to:'To',symptom:'Symptom',allSymptoms:'All symptoms',severity:'Severity',allSeverities:'All severities',
      type:'Show',types:{all:'Everything',logs:'Observations',checks:'Ride checks',concerns:'Concerns only'},clear:'Clear filters',
      date:'Date',limbs:'Leg(s)',limbsHint:'Tap every affected leg',onset:'When it showed',symptoms:'Symptoms',notes:'Notes',media:'Photos / videos',mediaHint:'Up to 50 MB each. Video of the horse walking and trotting in hand helps the vet most.',
      limb:{LF:'Left fore',RF:'Right fore',LH:'Left hind',RH:'Right hind'},limbShort:{LF:'LF',RF:'RF',LH:'LH',RH:'RH'},
      sev:{none:'None',mild:'Mild',moderate:'Moderate',severe:'Severe'},
      on:{before_ride:'Before riding',during_ride:'During riding',after_ride:'After riding',not_ridden:'Not ridden'},
      sym:{lameness:'Lameness',discomfort:'Discomfort',gait_change:'Gait change',stumbling:'Stumbling',swelling:'Swelling',heat:'Heat in leg',other:'Other'},
      followUp:'Create a vet follow-up task in Care & Alerts',
      phase:{pre:'Pre-ride check',post:'Post-ride check'},
      items:{
        pre:{movement:'Walks and trots sound in hand',legs:'Legs: no heat, swelling or cuts',hooves:'Hooves and shoes secure, no stones',back:'Back: no soreness when pressed',tack:'Saddle, girth and bridle fit correctly'},
        post:{movement:'Moves sound after the work',legs:'Legs cool, no new swelling or cuts',back:'Back and saddle area: no sore spots or rubs',recovery:'Breathing and sweat back to normal'}
      },
      ok:'OK',concern:'Concern',decision:'Decision after the ride',dec:{continue:'Normal work',monitor:'Monitor',rest:'Rest',vet:'Call the vet'},
      cleared:'All clear',concerns:n=>`${n} concern${n===1?'':'s'}`,session:'Session',
      save:'Save',saving:'Saving…',uploading:(i,n)=>`Uploading ${i}/${n}…`,cancel:'Cancel',del:'Delete',confirmDel:'Delete this record and its photos/videos?',
      by:'by',vetTask:'Vet follow-up task',linkedLog:'Observation',none:'No records for these filters.',loading:'Loading…',unable:'Unable to load the movement log.',
      pickHorse:'Choose a horse.',pickItems:'Mark every item OK or Concern.',fileTooBig:n=>`${n} is larger than 50 MB.`,
      concernPrompt:'A concern was marked. Record the details as an observation now?',
      taskTitle:(horse,parts)=>`Vet check — ${horse}${parts?': '+parts:''}`,
      fromCheck:'From ride check',locale:'en-GB'},
    ar:{title:'الحركة والعرج',sub:'ملاحظات العرج وفحص المدربين قبل الركوب وبعده، محفوظة في الملف الصحي لكل حصان.',
      profileTitle:'الحركة والعرج',profileSub:'الملاحظات وفحوصات الركوب والصور والفيديو لهذا الحصان.',
      addLog:'+ ملاحظة',addPre:'+ فحص قبل الركوب',addPost:'+ فحص بعد الركوب',
      horse:'الحصان',allHorses:'كل الخيول',from:'من',to:'إلى',symptom:'الأعراض',allSymptoms:'كل الأعراض',severity:'الشدة',allSeverities:'كل الدرجات',
      type:'نوع السجل',types:{all:'الكل',logs:'الملاحظات',checks:'فحوصات الركوب',concerns:'الملاحظات المقلقة فقط'},clear:'مسح الفلاتر',
      date:'التاريخ',limbs:'الرجل',limbsHint:'اختار كل رجل فيها مشكلة',onset:'متى ظهر',symptoms:'الأعراض',notes:'ملاحظات',media:'صور / فيديو',mediaHint:'حد أقصى 50 ميجا لكل ملف. فيديو للحصان وهو يمشي ويهرول مع الماسك يفيد الدكتور أكثر شي.',
      limb:{LF:'أمامية يسار',RF:'أمامية يمين',LH:'خلفية يسار',RH:'خلفية يمين'},limbShort:{LF:'أ.يسار',RF:'أ.يمين',LH:'خ.يسار',RH:'خ.يمين'},
      sev:{none:'لا يوجد',mild:'خفيفة',moderate:'متوسطة',severe:'شديدة'},
      on:{before_ride:'قبل الركوب',during_ride:'أثناء الركوب',after_ride:'بعد الركوب',not_ridden:'بدون ركوب'},
      sym:{lameness:'عرج',discomfort:'انزعاج',gait_change:'تغيّر في الحركة',stumbling:'تعثّر',swelling:'تورّم',heat:'حرارة في الرجل',other:'أخرى'},
      followUp:'إنشاء مهمة متابعة مع الطبيب في الرعاية والتنبيهات',
      phase:{pre:'فحص قبل الركوب',post:'فحص بعد الركوب'},
      items:{
        pre:{movement:'يمشي ويهرول سليم مع الماسك',legs:'الأرجل: ما فيها حرارة ولا تورّم ولا جروح',hooves:'الحوافر والنعل ثابتة وما فيها حصى',back:'الظهر: ما يتألم لما ينضغط',tack:'السرج والحزام واللجام مركبين صح'},
        post:{movement:'يتحرك سليم بعد الشغل',legs:'الأرجل باردة وما فيها تورّم أو جروح جديدة',back:'الظهر ومكان السرج: ما فيه ألم أو احتكاك',recovery:'التنفس والعرق رجعوا طبيعي'}
      },
      ok:'سليم',concern:'ملاحظة',decision:'القرار بعد الركوب',dec:{continue:'شغل عادي',monitor:'متابعة',rest:'راحة',vet:'نتصل بالطبيب'},
      cleared:'كله سليم',concerns:n=>`${n} ملاحظة`,session:'الحصة',
      save:'حفظ',saving:'جارٍ الحفظ…',uploading:(i,n)=>`جارٍ رفع ${i}/${n}…`,cancel:'إلغاء',del:'حذف',confirmDel:'حذف هذا السجل مع صوره والفيديو؟',
      by:'بواسطة',vetTask:'مهمة متابعة مع الطبيب',linkedLog:'ملاحظة',none:'ما في سجلات بهذي الفلاتر.',loading:'جارٍ التحميل…',unable:'تعذّر تحميل سجل الحركة.',
      pickHorse:'اختار الحصان.',pickItems:'حدد كل بند سليم أو ملاحظة.',fileTooBig:n=>`${n} أكبر من 50 ميجا.`,
      concernPrompt:'في بند عليه ملاحظة. تبي تسجل التفاصيل كملاحظة عرج الحين؟',
      taskTitle:(horse,parts)=>`فحص طبيب — ${horse}${parts?': '+parts:''}`,
      fromCheck:'من فحص الركوب',locale:'ar-u-nu-latn'}
  };
  const lang=()=>(typeof currentLang!=='undefined'&&currentLang==='ar')?'ar':'en';
  const T=()=>STRINGS[lang()];
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const todayISO=()=>typeof bahrainDateISO==='function'?bahrainDateISO():new Date().toISOString().slice(0,10);
  const can=code=>typeof window.canUser!=='function'||window.canUser(code);
  const canRecord=()=>can('horse_care.manage')||can('horse_events.manage');
  const sbUrl=()=>(typeof SB_URL!=='undefined'?SB_URL:(window.CCE_CONFIG&&CCE_CONFIG.SUPABASE_URL)||'');
  const authHeaders=()=>{const base=typeof buildHeaders==='function'?buildHeaders():{};return {apikey:base.apikey,Authorization:base.Authorization};};

  let horseCache=null;
  const boards=new Map(); // element -> {opts, filters, rows}
  const sessionChecks=new Map(); // `${schedule_id}:${phase}` -> check row

  // ---- pure helpers (exported for tests) ----
  function checkConcerns(items){return Object.values(items||{}).filter(v=>v==='concern').length;}
  function isConcern(entry){
    if(entry.kind==='check')return !entry.cleared||entry.decision==='vet'||entry.decision==='rest';
    return entry.severity&&entry.severity!=='none';
  }
  function mergeTimeline(logs,checks){
    const rows=[...(logs||[]).map(r=>({...r,kind:'log',date:r.observed_on})),...(checks||[]).map(r=>({...r,kind:'check',date:r.check_date}))];
    return rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))||Number(b.id)-Number(a.id));
  }
  function filterTimeline(rows,f){
    f=f||{};
    return (rows||[]).filter(r=>{
      if(f.horseId&&String(r.horse_id)!==String(f.horseId))return false;
      if(f.from&&String(r.date)<f.from)return false;
      if(f.to&&String(r.date)>f.to)return false;
      if(f.type==='logs'&&r.kind!=='log')return false;
      if(f.type==='checks'&&r.kind!=='check')return false;
      if(f.type==='concerns'&&!isConcern(r))return false;
      if(f.symptom&&!(r.kind==='log'&&(r.symptoms||[]).includes(f.symptom)))return false;
      if(f.severity&&!(r.kind==='log'&&r.severity===f.severity))return false;
      return true;
    });
  }
  function careTaskForLog(log,horseName){
    const t=STRINGS.en;
    const parts=[(log.limbs||[]).join('/'),(log.symptoms||[]).map(s=>t.sym[s]||s).join(', ')].filter(Boolean).join(' · ');
    return {
      horse_id:log.horse_id,event_scope:'care',event_type:'Veterinary Visit',
      event_date:log.observed_on||todayISO(),due_date:log.observed_on||todayISO(),
      title:t.taskTitle(horseName||'',parts),status:'Pending',
      priority:log.severity==='severe'?'Urgent':'High',
      severity:{none:'None',mild:'Low',moderate:'Moderate',severe:'High'}[log.severity]||'None',
      notes:[t.sev[log.severity]?`Severity: ${t.sev[log.severity]}`:'',log.onset?`Onset: ${t.on[log.onset]}`:'',log.notes||''].filter(Boolean).join('\n')||null,
      source_table:'horse_movement_logs',source_id:log.id||null
    };
  }
  function careTaskForCheck(check,horseName){
    const t=STRINGS.en;
    const items=Object.entries(check.items||{}).filter(([,v])=>v==='concern').map(([k])=>t.items[check.phase]?.[k]||k);
    return {
      horse_id:check.horse_id,event_scope:'care',event_type:'Veterinary Visit',
      event_date:check.check_date||todayISO(),due_date:check.check_date||todayISO(),
      title:t.taskTitle(horseName||'',t.phase[check.phase]),status:'Pending',priority:'High',severity:'Moderate',
      notes:[items.join('; '),check.notes||''].filter(Boolean).join('\n')||null,
      source_table:'horse_ride_checks',source_id:check.id||null
    };
  }

  // ---- data ----
  async function loadHorses(force){
    if(horseCache&&!force)return horseCache;
    try{horseCache=await sbRpc('cce_movement_horses',{});}
    catch(_e){horseCache=(typeof horses!=='undefined'&&Array.isArray(horses)?horses:[]).filter(x=>x.horse_name).map(x=>({id:x.id,horse_name:x.horse_name,stable_no:x.stable_no,status:x.status}));}
    horseCache=Array.isArray(horseCache)?horseCache:[];
    return horseCache;
  }
  const horseName=id=>{const x=(horseCache||[]).find(r=>String(r.id)===String(id));return x?x.horse_name:'#'+id;};
  function horseIdByName(name){
    const n=String(name||'').trim().toLowerCase();if(!n)return null;
    const x=(horseCache||[]).find(r=>String(r.horse_name||'').trim().toLowerCase()===n);
    return x?x.id:null;
  }
  async function fetchRows(f){
    const q=[];
    if(f.horseId)q.push('horse_id=eq.'+Number(f.horseId));
    const [logs,checks]=await Promise.all([
      sbGet('horse_movement_logs',[...q,f.from?'observed_on=gte.'+f.from:'',f.to?'observed_on=lte.'+f.to:'','order=observed_on.desc,id.desc','limit=300'].filter(Boolean).join('&')),
      sbGet('horse_ride_checks',[...q,f.from?'check_date=gte.'+f.from:'',f.to?'check_date=lte.'+f.to:'','order=check_date.desc,id.desc','limit=300'].filter(Boolean).join('&'))
    ]);
    const rows=mergeTimeline(logs,checks);
    if(window.CCE&&CCE.gait)await CCE.gait.load(rows).catch(()=>{});
    return rows;
  }

  // ---- storage ----
  function extFor(file){const m=/\.([a-z0-9]{1,5})$/i.exec(file.name||'');return (m?m[1]:(String(file.type).split('/')[1]||'bin')).toLowerCase();}
  async function uploadFiles(files,horseId,onProgress){
    const out=[];
    for(let i=0;i<files.length;i++){
      const file=files[i];
      if(onProgress)onProgress(i+1,files.length);
      const path=`movement/${Number(horseId)}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${extFor(file)}`;
      const r=await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}/${path}`,{method:'POST',headers:{...authHeaders(),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
      if(!r.ok)throw new Error(await r.text());
      out.push({path,type:String(file.type).startsWith('video/')?'video':'image',name:file.name||'',size:file.size||0});
    }
    return out;
  }
  async function signPaths(paths){
    if(!paths.length)return {};
    const r=await fetch(`${sbUrl()}/storage/v1/object/sign/${BUCKET}`,{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600,paths})});
    if(!r.ok)return {};
    const rows=await r.json();
    const map={};(rows||[]).forEach(x=>{if(x&&x.signedURL&&x.path)map[x.path]=`${sbUrl()}/storage/v1${x.signedURL.startsWith('/')?'':'/'}${x.signedURL}`;});
    return map;
  }
  async function removeFiles(media){
    const prefixes=(media||[]).map(m=>m.path).filter(Boolean);
    if(!prefixes.length)return;
    try{await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({prefixes})});}catch(_e){}
  }
  async function hydrateMedia(root){
    const nodes=[...root.querySelectorAll('[data-mv-path]')];
    if(!nodes.length)return;
    const urls=await signPaths([...new Set(nodes.map(n=>n.dataset.mvPath))]);
    nodes.forEach(n=>{
      const url=urls[n.dataset.mvPath];if(!url)return;
      if(n.tagName==='VIDEO'){n.src=url;}
      else if(n.tagName==='IMG'){n.src=url;const a=n.closest('a');if(a)a.href=url;}
    });
  }

  // ---- rendering ----
  function mediaHtml(media,r){
    if(!media||!media.length)return '';
    const gait=r&&window.CCE&&CCE.gait;
    return `<div class="mv-media">${media.map(m=>m.type==='video'
      ?`<div class="mv-vidbox"><video data-mv-path="${h(m.path)}" controls playsinline preload="metadata"></video>${gait?CCE.gait.chip(r,m):''}</div>`
      :`<a target="_blank" rel="noopener"><img data-mv-path="${h(m.path)}" alt="${h(m.name||'')}" loading="lazy"></a>`).join('')}</div>`;
  }
  function entryHtml(r,showHorse){
    const t=T();
    const head=showHorse?`<b class="mv-horse">${h(horseName(r.horse_id))}</b>`:'';
    const by=r.created_by_name?`<small>${t.by} ${h(r.created_by_name)}</small>`:'';
    const del=canRecord()?`<button class="mv-del" onclick="CCE.movement.remove('${r.kind}',${Number(r.id)},this)">${t.del}</button>`:'';
    const task=r.health_event_id?`<span class="mv-chip mv-task">🩺 ${t.vetTask}</span>`:'';
    if(r.kind==='log'){
      const limbs=(r.limbs||[]).map(l=>`<span class="mv-chip">${h(t.limb[l]||l)}</span>`).join('');
      const sym=(r.symptoms||[]).map(s=>`<span class="mv-chip">${h(t.sym[s]||s)}</span>`).join('');
      return `<article class="mv-entry mv-sev-${h(r.severity)}"><div class="mv-date" dir="ltr">${h(r.date)}</div><div class="mv-body">
        <div class="mv-title">${head}<span class="mv-badge mv-sev-${h(r.severity)}">${h(t.sev[r.severity]||r.severity)}</span>${r.onset?`<span class="mv-chip mv-onset">${h(t.on[r.onset]||r.onset)}</span>`:''}${r.ride_check_id?`<span class="mv-chip">${t.fromCheck}</span>`:''}${task}</div>
        ${limbs||sym?`<div class="mv-chips">${limbs}${sym}</div>`:''}${r.notes?`<p>${h(r.notes)}</p>`:''}${mediaHtml(r.media,r)}${by}</div>${del}</article>`;
    }
    const n=checkConcerns(r.items);
    const items=Object.entries(r.items||{}).map(([k,v])=>`<li class="${v==='concern'?'bad':'ok'}">${v==='concern'?'⚠':'✓'} ${h(t.items[r.phase]?.[k]||k)}</li>`).join('');
    return `<article class="mv-entry mv-check ${n?'mv-check-bad':''}"><div class="mv-date" dir="ltr">${h(r.date)}</div><div class="mv-body">
      <div class="mv-title">${head}<span class="mv-badge ${n?'mv-sev-moderate':'mv-sev-none'}">${h(t.phase[r.phase])}</span><span class="mv-chip">${n?t.concerns(n):t.cleared}</span>${r.decision?`<span class="mv-chip mv-dec-${h(r.decision)}">${h(t.dec[r.decision])}</span>`:''}${r.schedule_id?`<span class="mv-chip">${t.session} #${Number(r.schedule_id)}</span>`:''}${task}</div>
      <ul class="mv-items">${items}</ul>${r.notes?`<p>${h(r.notes)}</p>`:''}${mediaHtml(r.media,r)}${by}</div>${del}</article>`;
  }
  function render(el){
    const st=boards.get(el);if(!st||!st.rows)return;
    const t=T(),l=lang(),f=st.filters,fixedHorse=st.opts.horseId;
    const opt=(v,label,sel)=>`<option value="${h(v)}" ${String(sel||'')===String(v)?'selected':''}>${h(label)}</option>`;
    const horseSel=fixedHorse?'':`<label>${t.horse}<select data-f="horseId">${opt('',t.allHorses,f.horseId)}${(horseCache||[]).map(x=>opt(x.id,x.horse_name,f.horseId)).join('')}</select></label>`;
    const filters=`<div class="mv-filters">${horseSel}
      <label>${t.from}<input type="date" data-f="from" value="${h(f.from||'')}" dir="ltr"></label>
      <label>${t.to}<input type="date" data-f="to" value="${h(f.to||'')}" dir="ltr"></label>
      <label>${t.type}<select data-f="type">${Object.entries(t.types).map(([k,v])=>opt(k,v,f.type||'all')).join('')}</select></label>
      <label>${t.symptom}<select data-f="symptom">${opt('',t.allSymptoms,f.symptom)}${SYMPTOMS.map(s=>opt(s,t.sym[s],f.symptom)).join('')}</select></label>
      <label>${t.severity}<select data-f="severity">${opt('',t.allSeverities,f.severity)}${SEVERITIES.map(s=>opt(s,t.sev[s],f.severity)).join('')}</select></label>
      <button class="mv-clear" data-act="clear">${t.clear}</button></div>`;
    const hid=fixedHorse?Number(fixedHorse):0;
    const tools=canRecord()?`<div class="mv-tools"><button class="btn btn-amber" onclick="CCE.movement.newLog({horseId:${hid||'null'}})">${t.addLog}</button><button class="pd-add" onclick="CCE.movement.newCheck({horseId:${hid||'null'},phase:'pre'})">${t.addPre}</button><button class="pd-add" onclick="CCE.movement.newCheck({horseId:${hid||'null'},phase:'post'})">${t.addPost}</button></div>`:'';
    const rows=filterTimeline(st.rows,{...f,horseId:fixedHorse||f.horseId});
    const list=rows.length?rows.map(r=>entryHtml(r,!fixedHorse)).join(''):`<div class="health-empty">${t.none}</div>`;
    const head=st.opts.compact?`<div class="profile-toolbar"><div><h4>${t.profileTitle}</h4><p>${t.profileSub}</p></div></div>`
      :`<div class="pd-head"><h2>${t.title}</h2><p>${t.sub}</p></div>`;
    el.innerHTML=`<div class="mv-board" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}">${head}${tools}${filters}<div class="mv-list">${list}</div></div>`;
    el.querySelectorAll('[data-f]').forEach(input=>input.addEventListener('change',async()=>{
      const key=input.dataset.f;st.filters[key]=input.value||'';
      if(key==='from'||key==='to'||key==='horseId'){await reload(el);}else render(el);
    }));
    const clear=el.querySelector('[data-act="clear"]');
    if(clear)clear.addEventListener('click',async()=>{st.filters={type:'all'};await reload(el);});
    hydrateMedia(el).catch(()=>{});
  }
  async function reload(el){
    const st=boards.get(el);if(!st)return;
    try{
      st.rows=await fetchRows({...st.filters,horseId:st.opts.horseId||st.filters.horseId});
      render(el);
    }catch(error){
      el.innerHTML=`<div class="permission-denied"><strong>${T().unable}</strong><span>${h(typeof userSafeError==='function'?userSafeError(error):(error&&error.message)||error)}</span></div>`;
    }
  }
  async function open(el,opts={}){
    if(!el)return;
    const prev=boards.get(el);
    boards.set(el,{opts,filters:prev?prev.filters:{type:'all'},rows:null});
    el.innerHTML=`<div class="health-empty">${T().loading}</div>`;
    await loadHorses();
    await reload(el);
  }
  function renderAll(){
    for(const el of [...boards.keys()]){
      if(!el.isConnected){boards.delete(el);continue;}
      render(el);
    }
  }
  async function refreshAll(){
    for(const el of [...boards.keys()]){
      if(!el.isConnected){boards.delete(el);continue;}
      await reload(el);
    }
  }

  // ---- forms ----
  let formCtx=null;
  function horseSelectHtml(id,selected){
    const t=T();
    return `<select id="${id}"><option value="">—</option>${(horseCache||[]).map(x=>`<option value="${Number(x.id)}" ${String(x.id)===String(selected||'')?'selected':''}>${h(x.horse_name)}${x.stable_no?' · #'+h(x.stable_no):''}</option>`).join('')}</select>`;
  }
  function afterSave(){
    const ctx=formCtx||{};formCtx=null;
    if(ctx.returnToProfile&&window.CCE.horseProfile){CCE.horseProfile.open(ctx.returnToProfile);setTimeout(()=>CCE.horseProfile.selectTab('movement'),0);}
    else if(typeof closeModal==='function')closeModal();
    refreshAll();
    if(typeof ctx.onSaved==='function')ctx.onSaved();
  }
  function profileHorseInModal(){
    const m=document.querySelector('#modalOverlay .modal.horse-profile-modal');
    const overlay=document.getElementById('modalOverlay');
    return m&&overlay&&!overlay.classList.contains('hidden');
  }
  async function newLog(opts={}){
    if(!canRecord())return;
    await loadHorses();
    const t=T(),l=lang();
    formCtx={...opts,returnToProfile:opts.returnToProfile||(opts.horseId&&profileHorseInModal()?opts.horseId:null)};
    const limbs=new Set(opts.limbs||[]);
    const body=`<div class="mv-form" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}">
      <div class="form-grid">
        <div class="form-group"><label>${t.horse}</label>${horseSelectHtml('mv-horse',opts.horseId)}</div>
        <div class="form-group"><label>${t.date}</label><input type="date" id="mv-date" value="${h(opts.date||todayISO())}" dir="ltr"></div>
      </div>
      <div class="mv-field"><label>${t.limbs} <small>${t.limbsHint}</small></label><div class="mv-limbs">${LIMBS.map(k=>`<button type="button" class="mv-limb ${limbs.has(k)?'on':''}" data-limb="${k}">${h(t.limb[k])}</button>`).join('')}</div></div>
      <div class="mv-field"><label>${t.severity}</label><div class="mv-seg" data-name="severity">${SEVERITIES.map(s=>`<button type="button" class="mv-sev-${s} ${s===(opts.severity||'mild')?'on':''}" data-v="${s}">${h(t.sev[s])}</button>`).join('')}</div></div>
      <div class="mv-field"><label>${t.onset}</label><div class="mv-seg" data-name="onset">${ONSETS.map(s=>`<button type="button" class="${s===opts.onset?'on':''}" data-v="${s}">${h(t.on[s])}</button>`).join('')}</div></div>
      <div class="mv-field"><label>${t.symptoms}</label><div class="mv-checks">${SYMPTOMS.map(s=>`<label><input type="checkbox" value="${s}" ${(opts.symptoms||[]).includes(s)?'checked':''}> ${h(t.sym[s])}</label>`).join('')}</div></div>
      <div class="mv-field"><label>${t.notes}</label><textarea id="mv-notes" rows="3">${h(opts.notes||'')}</textarea></div>
      <div class="mv-field"><label>${t.media}</label><input type="file" id="mv-files" accept="image/*,video/*" multiple><small>${t.mediaHint}</small></div>
      <label class="mv-follow"><input type="checkbox" id="mv-follow" ${opts.severity==='severe'?'checked':''}> ${t.followUp}</label>
      <div class="btn-row"><button class="btn btn-amber" id="mv-save" onclick="CCE.movement.saveLog()">${t.save}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="CCE.movement.cancel()">${t.cancel}</button></div>
    </div>`;
    openModal(t.addLog.replace(/^\+\s*/,''),body);
    wireForm();
  }
  function wireForm(){
    const root=document.querySelector('#modalBody .mv-form');if(!root)return;
    root.querySelectorAll('.mv-limb').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('on')));
    root.querySelectorAll('.mv-seg').forEach(seg=>seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      const was=b.classList.contains('on');
      seg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      if(!was||seg.dataset.name==='severity'||seg.dataset.name==='phase')b.classList.add('on');
      if(seg.dataset.name==='severity'){const f=document.getElementById('mv-follow');if(f&&b.dataset.v==='severe')f.checked=true;}
    })));
    root.querySelectorAll('.mv-item').forEach(row=>row.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      row.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    })));
  }
  const segValue=name=>document.querySelector(`#modalBody .mv-seg[data-name="${name}"] button.on`)?.dataset.v||null;
  function pickedFiles(){
    const t=T();
    const files=[...(document.getElementById('mv-files')?.files||[])];
    const big=files.find(f=>f.size>MAX_FILE);
    if(big){alert(t.fileTooBig(big.name));return null;}
    return files;
  }
  async function withSaving(fn){
    const t=T(),btn=document.getElementById('mv-save');
    const label=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent=t.saving;}
    try{return await fn(text=>{if(btn)btn.textContent=text;});}
    finally{if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=label;}}
  }
  async function saveLog(){
    const t=T();
    const horseId=Number(document.getElementById('mv-horse').value);
    if(!horseId){alert(t.pickHorse);return;}
    const files=pickedFiles();if(!files)return;
    const ctx=formCtx||{};
    const row={
      horse_id:horseId,observed_on:document.getElementById('mv-date').value||todayISO(),
      limbs:[...document.querySelectorAll('#modalBody .mv-limb.on')].map(b=>b.dataset.limb),
      severity:segValue('severity')||'mild',onset:segValue('onset'),
      symptoms:[...document.querySelectorAll('#modalBody .mv-checks input:checked')].map(x=>x.value),
      notes:document.getElementById('mv-notes').value.trim()||null,
      ride_check_id:ctx.rideCheckId||null
    };
    const follow=document.getElementById('mv-follow').checked;
    let media=[];
    try{
      await withSaving(async progress=>{
        media=await uploadFiles(files,horseId,(i,n)=>progress(t.uploading(i,n)));
        progress(t.saving);
        const saved=(await sbPost('horse_movement_logs',{...row,media}))[0]||{};
        if(follow&&saved.id){
          const task=(await sbPost('horse_health_events',careTaskForLog(saved,horseName(horseId))))[0];
          if(task&&task.id)await sbPatch('horse_movement_logs',saved.id,{health_event_id:task.id});
        }
      });
      afterSave();
    }catch(e){
      await removeFiles(media);
      if(typeof showError==='function')showError(t.title,e);else alert(e.message||e);
    }
  }
  async function newCheck(opts={}){
    if(!canRecord())return;
    await loadHorses();
    const t=T(),l=lang();
    const horseId=opts.horseId||horseIdByName(opts.horseName);
    formCtx={...opts,horseId,returnToProfile:opts.returnToProfile||(opts.horseId&&profileHorseInModal()?opts.horseId:null)};
    const phase=opts.phase==='post'?'post':'pre';
    const itemsHtml=ph=>CHECK_ITEMS[ph].map(k=>`<div class="mv-item" data-item="${k}"><span>${h(t.items[ph][k])}</span><div><button type="button" data-v="ok">✓ ${t.ok}</button><button type="button" data-v="concern">⚠ ${t.concern}</button></div></div>`).join('');
    const body=`<div class="mv-form" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}">
      <div class="form-grid">
        <div class="form-group"><label>${t.horse}</label>${horseSelectHtml('mv-horse',horseId)}</div>
        <div class="form-group"><label>${t.date}</label><input type="date" id="mv-date" value="${h(opts.date||todayISO())}" dir="ltr"></div>
      </div>
      <div class="mv-field"><div class="mv-seg" data-name="phase">${['pre','post'].map(p=>`<button type="button" class="${p===phase?'on':''}" data-v="${p}">${h(t.phase[p])}</button>`).join('')}</div></div>
      ${['pre','post'].map(p=>`<div class="mv-items-form" data-phase="${p}" ${p===phase?'':'hidden'}>${itemsHtml(p)}</div>`).join('')}
      <div class="mv-field" id="mv-decision-wrap" ${phase==='post'?'':'hidden'}><label>${t.decision}</label><div class="mv-seg" data-name="decision">${DECISIONS.map(d=>`<button type="button" class="mv-dec-${d}" data-v="${d}">${h(t.dec[d])}</button>`).join('')}</div></div>
      <div class="mv-field"><label>${t.notes}</label><textarea id="mv-notes" rows="2"></textarea></div>
      <div class="mv-field"><label>${t.media}</label><input type="file" id="mv-files" accept="image/*,video/*" multiple><small>${t.mediaHint}</small></div>
      <div class="btn-row"><button class="btn btn-amber" id="mv-save" onclick="CCE.movement.saveCheck()">${t.save}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="CCE.movement.cancel()">${t.cancel}</button></div>
    </div>`;
    openModal(t.phase[phase],body);
    wireForm();
    document.querySelectorAll('#modalBody .mv-seg[data-name="phase"] button').forEach(b=>b.addEventListener('click',()=>{
      const p=b.dataset.v;
      document.querySelectorAll('#modalBody .mv-items-form').forEach(x=>x.hidden=x.dataset.phase!==p);
      const d=document.getElementById('mv-decision-wrap');if(d)d.hidden=p!=='post';
      const title=document.getElementById('modalTitle');if(title)title.textContent=t.phase[p];
    }));
  }
  async function saveCheck(){
    const t=T();
    const horseId=Number(document.getElementById('mv-horse').value);
    if(!horseId){alert(t.pickHorse);return;}
    const phase=segValue('phase')||'pre';
    const items={};let missing=false;
    document.querySelectorAll(`#modalBody .mv-items-form[data-phase="${phase}"] .mv-item`).forEach(row=>{
      const v=row.querySelector('button.on')?.dataset.v;if(!v)missing=true;else items[row.dataset.item]=v;
    });
    if(missing){alert(t.pickItems);return;}
    const files=pickedFiles();if(!files)return;
    const ctx=formCtx||{};
    const decision=phase==='post'?segValue('decision'):null;
    const row={horse_id:horseId,phase,check_date:document.getElementById('mv-date').value||todayISO(),schedule_id:ctx.scheduleId||null,
      items,cleared:checkConcerns(items)===0,decision,notes:document.getElementById('mv-notes').value.trim()||null};
    let media=[],saved=null;
    try{
      await withSaving(async progress=>{
        media=await uploadFiles(files,horseId,(i,n)=>progress(t.uploading(i,n)));
        progress(t.saving);
        saved=(await sbPost('horse_ride_checks',{...row,media}))[0]||null;
        if(saved&&decision==='vet'){
          const task=(await sbPost('horse_health_events',careTaskForCheck(saved,horseName(horseId))))[0];
          if(task&&task.id){await sbPatch('horse_ride_checks',saved.id,{health_event_id:task.id});saved.health_event_id=task.id;}
        }
      });
    }catch(e){
      await removeFiles(media);
      if(typeof showError==='function')showError(t.title,e);else alert(e.message||e);
      return;
    }
    if(saved&&saved.schedule_id)sessionChecks.set(`${saved.schedule_id}:${saved.phase}`,saved);
    if(saved&&!saved.cleared&&confirm(t.concernPrompt)){
      const keep=formCtx;
      formCtx=null;
      await newLog({horseId,rideCheckId:saved.id,onset:phase==='pre'?'before_ride':'after_ride',severity:'mild',date:saved.check_date,returnToProfile:keep&&keep.returnToProfile,onSaved:keep&&keep.onSaved});
      return;
    }
    afterSave();
  }
  function cancel(){
    const ctx=formCtx||{};formCtx=null;
    if(ctx.returnToProfile&&window.CCE.horseProfile){CCE.horseProfile.open(ctx.returnToProfile);setTimeout(()=>CCE.horseProfile.selectTab('movement'),0);}
    else if(typeof closeModal==='function')closeModal();
  }
  async function remove(kind,id,btn){
    const t=T();
    if(!confirm(t.confirmDel))return;
    const table=kind==='check'?'horse_ride_checks':'horse_movement_logs';
    if(btn)btn.disabled=true;
    try{
      const rows=await sbGet(table,`id=eq.${Number(id)}&select=media,schedule_id,phase`);
      await sbDel(table,id);
      if(rows&&rows[0]){await removeFiles(rows[0].media);if(rows[0].schedule_id)sessionChecks.delete(`${rows[0].schedule_id}:${rows[0].phase}`);}
      await refreshAll();
    }catch(e){if(btn)btn.disabled=false;if(typeof showError==='function')showError(t.title,e);}
  }

  // ---- instructor sessions ----
  async function loadSessionChecks(ids){
    const list=[...new Set((ids||[]).map(Number).filter(Boolean))];
    if(!list.length)return;
    try{
      const rows=await sbGet('horse_ride_checks',`schedule_id=in.(${list.join(',')})&select=id,schedule_id,phase,cleared,decision&order=id.asc`);
      (rows||[]).forEach(r=>sessionChecks.set(`${r.schedule_id}:${r.phase}`,r));
    }catch(_e){}
  }
  function sessionButtons(s){
    if(!s||!s.horse_name||!canRecord())return '';
    const t=T();
    const btn=phase=>{
      const done=sessionChecks.get(`${s.id}:${phase}`);
      const cls=done?(done.cleared?'mv-sess done':'mv-sess warn'):'mv-sess';
      const mark=done?(done.cleared?'✓ ':'⚠ '):'';
      const args=`{scheduleId:${Number(s.id)},horseName:${JSON.stringify(String(s.horse_name))},date:${JSON.stringify(String(s.date||''))},phase:${JSON.stringify(phase)},onSaved:window.renderInstrSchedule}`;
      return `<button class="${cls}" onclick="CCE.movement.newCheck(${h(args)})">${mark}${h(t.phase[phase])}</button>`;
    };
    return `<div class="mv-sess-row">${btn('pre')}${btn('post')}</div>`;
  }

  // Horse profile tab.
  function horsePane(horse){return `<div class="mv-host" data-horse="${Number(horse.id)}"></div>`;}
  CCE.events?.on?.('horse-profile:tab-changed',e=>{
    if(!e.detail||e.detail.tab!=='movement')return;
    const host=document.querySelector('#hpp-movement .mv-host');
    if(host&&!boards.has(host))open(host,{horseId:Number(host.dataset.horse),compact:true});
  });
  window.CCE.horseProfile=window.CCE.horseProfile||{};
  CCE.horseProfile.panels=CCE.horseProfile.panels||{};
  CCE.horseProfile.panels.movement=horsePane;

  CCE.movement={open,render:renderAll,refresh:refreshAll,newLog,saveLog,newCheck,saveCheck,cancel,remove,
    loadSessionChecks,sessionButtons,loadHorses,
    _test:{mergeTimeline,filterTimeline,checkConcerns,isConcern,careTaskForLog,careTaskForCheck,STRINGS,CHECK_ITEMS}};
})();
