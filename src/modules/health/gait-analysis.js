// AI video movement analysis (v4.39.0).
// Works on videos already attached to a movement observation or ride check
// (horse-media bucket). The browser samples JPEG frames from a chosen part of
// the video, the gait-analysis edge function asks Claude for a structured
// review and saves it to horse_gait_analyses. The viewer plays the video with
// the notes written over it at the right moments, and can download a copy of
// the video with the notes burned in. An aid for coaches, not a diagnosis.
(function(){
  window.CCE=window.CCE||{};
  const LIMBS=['LF','RF','LH','RH'];
  const GAITS=['walk','trot','canter','lunge'];
  const VIEWS=['side','front','behind'];
  const SPAN=10,FRAMES=30,FRAME_WIDTH=768,HOLD=1.6,EXPORT_MAX_SECONDS=60;
  const STRINGS={
    en:{analyze:'🔍 Analyse movement',open:'🔍 AI analysis',failedChip:'⚠ Analysis failed',title:'Video movement analysis',
      disclaimer:'AI aid for coaches. It is not a veterinary diagnosis; when in doubt, call the vet.',
      gait:'Gait filmed',view:'Camera view',gaits:{walk:'Walk',trot:'Trot',canter:'Canter',lunge:'Lunging'},views:{side:'From the side',front:'From the front',behind:'From behind'},
      startHint:'Pause the video where the horse starts moving straight (trot in hand is best). The next 10 seconds are analysed.',
      start:'Start analysis',again:'Analyse again',cancel:'Close',download:'⬇ Download video with notes',
      sampling:(i,n)=>`Taking frames ${i}/${n}…`,sending:'Analysing… this takes about a minute.',exporting:p=>`Preparing video… ${p}%`,
      grade:'Lameness grade',limbs:'Leg(s) to watch',none:'None',confidence:'Confidence',conf:{low:'Low',medium:'Medium',high:'High'},
      rec:'Recommendation',recs:{normal:'Normal work',monitor:'Monitor and film again',vet:'Ask the vet'},
      findings:'What was seen',quality:'Video quality',unusable:'Not enough to judge',by:'by',at:'at',
      limb:{LF:'Left fore',RF:'Right fore',LH:'Left hind',RH:'Right hind'},
      metric:{head_nod:'Head nod',hip_hike:'Hip hike',stride_length:'Stride length',foot_placement:'Foot placement',tracking_up:'Tracking up',symmetry:'Symmetry',posture:'Posture',other:'Other'},
      badge:(g,l)=>`AI · Grade ${g}/5${l?' · '+l:''}`,overlayTag:'CCE · AI movement notes · not a diagnosis',
      noVideo:'Could not load the video.',failed:'The analysis failed',notConfigured:'Analysis is not switched on yet (the service key is missing).',
      exportUnsupported:'This browser cannot record video. Try Chrome or Safari on a computer.',
      chip:(g,l,r)=>`🔍 Grade ${g}/5${l?' · '+l:''} · ${r}`},
    ar:{analyze:'🔍 حلّل الحركة',open:'🔍 تحليل الذكاء الاصطناعي',failedChip:'⚠ فشل التحليل',title:'تحليل الحركة من الفيديو',
      disclaimer:'مساعد بالذكاء الاصطناعي للمدربين، وليس تشخيص بيطري. إذا في شك، كلّم الطبيب.',
      gait:'المشية في الفيديو',view:'زاوية التصوير',gaits:{walk:'مشي',trot:'هرولة',canter:'كانتر',lunge:'لنج (دوران)'},views:{side:'من الجنب',front:'من القدام',behind:'من الورا'},
      startHint:'وقّف الفيديو عند اللحظة اللي يبدأ فيها الحصان يمشي بخط مستقيم (الهرولة مع الماسك أفضل شي). نحلل 10 ثواني من هني.',
      start:'ابدأ التحليل',again:'حلّل مرة ثانية',cancel:'إغلاق',download:'⬇ تحميل الفيديو مع الملاحظات',
      sampling:(i,n)=>`جارٍ أخذ اللقطات ${i}/${n}…`,sending:'جارٍ التحليل… ياخذ حوالي دقيقة.',exporting:p=>`جارٍ تجهيز الفيديو… ${p}%`,
      grade:'درجة العرج',limbs:'الرجل اللي تحتاج متابعة',none:'لا يوجد',confidence:'درجة الثقة',conf:{low:'منخفضة',medium:'متوسطة',high:'عالية'},
      rec:'التوصية',recs:{normal:'شغل عادي',monitor:'متابعة وتصوير مرة ثانية',vet:'استشر الطبيب'},
      findings:'الملاحظات',quality:'جودة الفيديو',unusable:'ما يكفي للحكم',by:'بواسطة',at:'',
      limb:{LF:'الأمامية اليسار',RF:'الأمامية اليمين',LH:'الخلفية اليسار',RH:'الخلفية اليمين'},
      metric:{head_nod:'هز الراس',hip_hike:'رفع الورك',stride_length:'طول الخطوة',foot_placement:'نزول الحافر',tracking_up:'وصول الرجل الخلفية',symmetry:'التناظر',posture:'وقفة الجسم',other:'أخرى'},
      badge:(g,l)=>`تحليل AI · الدرجة ${g}/5${l?' · '+l:''}`,overlayTag:'CCE · ملاحظات حركة بالذكاء الاصطناعي · ليس تشخيص',
      noVideo:'ما قدرنا نحمّل الفيديو.',failed:'فشل التحليل',notConfigured:'التحليل غير مفعّل للحين (مفتاح الخدمة ناقص).',
      exportUnsupported:'هذا المتصفح ما يقدر يسجّل فيديو. جرّب Chrome أو Safari على الكمبيوتر.',
      chip:(g,l,r)=>`🔍 الدرجة ${g}/5${l?' · '+l:''} · ${r}`}
  };
  const lang=()=>(typeof currentLang!=='undefined'&&currentLang==='ar')?'ar':'en';
  const T=()=>STRINGS[lang()];
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const can=code=>typeof window.canUser!=='function'||window.canUser(code);
  const canRecord=()=>can('horse_care.manage')||can('horse_events.manage');
  const sbUrl=()=>(typeof SB_URL!=='undefined'?SB_URL:(window.CCE_CONFIG&&CCE_CONFIG.SUPABASE_URL)||'');
  const authHeaders=()=>{const base=typeof buildHeaders==='function'?buildHeaders():{};return {apikey:base.apikey,Authorization:base.Authorization};};
  const keyOf=(kind,id,path)=>`${kind}:${Number(id)}:${path}`;
  const analyses=new Map(); // key -> rows, newest first

  // ---- pure helpers (exported for tests) ----
  function planFrameTimes(duration,start,span=SPAN,count=FRAMES){
    const d=Number(duration);if(!(d>0))return [];
    const last=Math.max(0,d-0.05);
    let s=Math.min(Math.max(0,Number(start)||0),last),e=Math.min(last,s+span);
    if(e-s<Math.min(span,last)*0.6){e=last;s=Math.max(0,e-span);}
    const n=Math.max(4,Math.min(count,Math.round((e-s)*3)||4));
    if(e<=s)return [Math.round(s*100)/100];
    return Array.from({length:n},(_,i)=>Math.round((s+i*(e-s)/(n-1))*100)/100);
  }
  function activeAnnotation(list,now,hold=HOLD){
    let hit=null;
    for(const a of list||[]){if(a.t<=now+0.05&&now-a.t<hold)hit=a;}
    return hit;
  }
  // Where the picture sits inside a <video> with object-fit:contain.
  function contentBox(w,h2,vw,vh){
    if(!(w>0&&h2>0&&vw>0&&vh>0))return {x:0,y:0,w:w||0,h:h2||0};
    const scale=Math.min(w/vw,h2/vh),cw=vw*scale,ch=vh*scale;
    return {x:(w-cw)/2,y:(h2-ch)/2,w:cw,h:ch};
  }
  function latestFor(kind,id,path){
    const rows=analyses.get(keyOf(kind,id,path))||[];
    return rows.find(r=>r.status==='done')||rows[0]||null;
  }
  function limbText(a,short){
    const t=T(),l=a&&a.suspected_limbs||[];
    return l.map(x=>short?x:(t.limb[x]||x)).join(short?'/':'، ');
  }

  // ---- data ----
  async function load(rows){
    const logs=[],checks=[];
    (rows||[]).forEach(r=>{if((r.media||[]).some(m=>m.type==='video'))(r.kind==='check'?checks:logs).push(Number(r.id));});
    const loaded=new Set([...logs.map(id=>'log:'+id),...checks.map(id=>'check:'+id)]);
    for(const k of [...analyses.keys()]){if(loaded.has(k.split(':').slice(0,2).join(':')))analyses.delete(k);}
    if(!logs.length&&!checks.length)return;
    const parts=[];
    if(logs.length)parts.push(`movement_log_id.in.(${logs.join(',')})`);
    if(checks.length)parts.push(`ride_check_id.in.(${checks.join(',')})`);
    let list=[];
    try{list=await sbGet('horse_gait_analyses',`select=*&or=(${parts.join(',')})&order=created_at.desc&limit=500`);}catch(_e){return;}
    (list||[]).forEach(a=>{
      const k=keyOf(a.ride_check_id?'check':'log',a.ride_check_id||a.movement_log_id,a.media_path);
      if(!analyses.has(k))analyses.set(k,[]);
      analyses.get(k).push(a);
    });
  }
  function chip(r,m){
    if(!m||m.type!=='video')return '';
    const t=T(),a=latestFor(r.kind,r.id,m.path);
    const args=`'${r.kind}',${Number(r.id)},'${h(String(m.path).replace(/'/g,''))}'`;
    if(a&&a.status==='done'){
      return `<button type="button" class="gx-chip gx-rec-${h(a.recommendation)}" onclick="CCE.gait.open(${args})">${h(t.chip(a.grade??'?',limbText(a,true),t.recs[a.recommendation]||''))}</button>`;
    }
    if(!canRecord())return '';
    if(a&&a.status==='failed')return `<button type="button" class="gx-chip gx-failed" onclick="CCE.gait.open(${args})">${t.failedChip}</button>`;
    return `<button type="button" class="gx-chip" onclick="CCE.gait.open(${args})">${t.analyze}</button>`;
  }

  // ---- video helpers ----
  async function signedUrl(path){
    const r=await fetch(`${sbUrl()}/storage/v1/object/sign/horse-media`,{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600,paths:[path]})});
    if(!r.ok)throw new Error(T().noVideo);
    const rows=await r.json();const x=rows&&rows[0];
    if(!x||!x.signedURL)throw new Error(T().noVideo);
    return `${sbUrl()}/storage/v1${x.signedURL.startsWith('/')?'':'/'}${x.signedURL}`;
  }
  // A same-origin blob copy keeps the canvas untainted for frames and export.
  async function blobVideo(url){
    const r=await fetch(url);if(!r.ok)throw new Error(T().noVideo);
    const src=URL.createObjectURL(await r.blob());
    const v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.preload='auto';v.src=src;
    await new Promise((ok,bad)=>{v.onloadeddata=ok;v.onerror=()=>bad(new Error(T().noVideo));});
    return {video:v,release:()=>URL.revokeObjectURL(src)};
  }
  const seek=(v,t)=>new Promise(ok=>{const done=()=>{v.removeEventListener('seeked',done);ok();};v.addEventListener('seeked',done);v.currentTime=t;});
  async function sampleFrames(url,start,onProgress){
    const {video,release}=await blobVideo(url);
    try{
      const times=planFrameTimes(video.duration,start);
      const scale=Math.min(1,FRAME_WIDTH/(video.videoWidth||FRAME_WIDTH));
      const c=document.createElement('canvas');
      c.width=Math.round((video.videoWidth||FRAME_WIDTH)*scale);c.height=Math.round((video.videoHeight||432)*scale);
      const g=c.getContext('2d');const out=[];
      for(let i=0;i<times.length;i++){
        if(onProgress)onProgress(i+1,times.length);
        await seek(video,times[i]);
        g.drawImage(video,0,0,c.width,c.height);
        out.push({t:times[i],data:c.toDataURL('image/jpeg',0.78).split(',')[1]});
      }
      return out;
    }finally{release();}
  }

  // ---- viewer ----
  let ctx=null;
  async function open(kind,id,path){
    const t=T(),l=lang();
    ctx={kind,id:Number(id),path,url:null};
    openModal(t.title,`<div class="gx-view" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}"><div class="health-empty">…</div></div>`);
    try{ctx.url=await signedUrl(path);}catch(e){return paint(e.message);}
    paint();
  }
  function paint(error){
    const root=document.querySelector('#modalBody .gx-view');if(!root||!ctx)return;
    const t=T(),a=latestFor(ctx.kind,ctx.id,ctx.path);
    const done=a&&a.status==='done';
    const form=canRecord()?`<div class="gx-form" ${done?'hidden':''}>
        <div class="mv-field"><label>${t.gait}</label><div class="mv-seg gx-seg" data-name="gait">${GAITS.map(g=>`<button type="button" data-v="${g}" class="${g==='trot'?'on':''}">${h(t.gaits[g])}</button>`).join('')}</div></div>
        <div class="mv-field"><label>${t.view}</label><div class="mv-seg gx-seg" data-name="view">${VIEWS.map(v=>`<button type="button" data-v="${v}" class="${v==='side'?'on':''}">${h(t.views[v])}</button>`).join('')}</div></div>
        <small class="gx-hint">${t.startHint}</small>
        <button class="btn btn-amber gx-go" type="button">${t.start}</button></div>`:'';
    const failed=a&&a.status==='failed'?`<div class="gx-error">${t.failed}: ${h(a.error||'')}</div>`:'';
    root.innerHTML=`${ctx.url?`<div class="gx-player"><video controls playsinline preload="metadata" src="${h(ctx.url)}"></video><div class="gx-ov" aria-live="polite"></div></div>`:''}
      ${error?`<div class="gx-error">${h(error)}</div>`:''}${failed}
      <div class="gx-status" hidden></div>
      ${done?reportHtml(a):''}${form}
      <p class="gx-disclaimer">⚕ ${t.disclaimer}</p>
      <div class="btn-row">${done?`<button class="btn btn-amber gx-dl" type="button">${t.download}</button>`:''}${done&&canRecord()?`<button class="btn gx-again" type="button" style="background:#f0f0f0;color:var(--navy)">${t.again}</button>`:''}<button class="btn" type="button" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">${t.cancel}</button></div>`;
    root.querySelectorAll('.gx-seg').forEach(seg=>seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');})));
    root.querySelector('.gx-go')?.addEventListener('click',run);
    root.querySelector('.gx-again')?.addEventListener('click',()=>{root.querySelector('.gx-form').hidden=false;root.querySelector('.gx-again').hidden=true;});
    root.querySelector('.gx-dl')?.addEventListener('click',()=>exportVideo(a));
    if(done)wireOverlay(root,a);
  }
  function reportHtml(a){
    const t=T(),l=lang(),r=a.result||{},q=r.video_quality||{};
    const summary=l==='ar'?(a.summary_ar||a.summary_en):(a.summary_en||a.summary_ar);
    const findings=(r.findings||[]).map(f=>`<li class="gx-lv-${h(f.level)}"><b>${h(t.metric[f.metric]||f.metric)}</b> ${h(l==='ar'?(f.text_ar||f.text_en):(f.text_en||f.text_ar))}</li>`).join('');
    const issues=l==='ar'?(q.issues_ar||q.issues_en):(q.issues_en||q.issues_ar);
    const when=a.created_at?new Date(a.created_at).toLocaleString(l==='ar'?'ar-u-nu-latn':'en-GB',{dateStyle:'medium',timeStyle:'short'}):'';
    return `<div class="gx-report gx-rec-${h(a.recommendation)}">
      <div class="gx-stats">
        <div><small>${t.grade}</small><b dir="ltr">${a.grade??'?'} / 5</b></div>
        <div><small>${t.limbs}</small><b>${h(limbText(a)||t.none)}</b></div>
        <div><small>${t.confidence}</small><b>${h(t.conf[a.confidence]||a.confidence||'')}</b></div>
        <div><small>${t.rec}</small><b class="gx-rec">${h(t.recs[a.recommendation]||'')}</b></div>
      </div>
      ${summary?`<p class="gx-summary">${h(summary)}</p>`:''}
      ${findings?`<div><small class="gx-label">${t.findings}</small><ul class="gx-findings">${findings}</ul></div>`:''}
      ${issues||q.usable===false?`<p class="gx-quality"><b>${t.quality}:</b> ${q.usable===false?t.unusable+'. ':''}${h(issues||'')}</p>`:''}
      <small class="gx-meta">${a.created_by_name?`${t.by} ${h(a.created_by_name)} · `:''}${h(when)}</small></div>`;
  }
  function noteText(a){return lang()==='ar'?(a.text_ar||a.text_en):(a.text_en||a.text_ar);}
  function wireOverlay(root,a){
    const v=root.querySelector('.gx-player video'),ov=root.querySelector('.gx-ov');if(!v||!ov)return;
    const t=T(),notes=a.annotations||[];
    const paintOv=()=>{
      const n=activeAnnotation(notes,v.currentTime);
      const box=contentBox(v.clientWidth,v.clientHeight,v.videoWidth,v.videoHeight);
      const badge=`<span class="gx-badge" style="top:${box.y+6}px;inset-inline-start:${box.x+6}px">${h(t.badge(a.grade??'?',limbText(a,true)))}</span>`;
      if(!n){ov.innerHTML=badge;return;}
      const dot=n.x!=null&&n.y!=null?`<span class="gx-dot gx-lv-${h(n.level)}" style="left:${box.x+n.x*box.w}px;top:${box.y+n.y*box.h}px"></span>`:'';
      ov.innerHTML=`${badge}${dot}<span class="gx-cap gx-lv-${h(n.level)}" style="bottom:${(v.clientHeight-box.y-box.h)+44}px">${h(noteText(n))}</span>`;
    };
    ['timeupdate','seeked','loadedmetadata','play','pause'].forEach(ev=>v.addEventListener(ev,paintOv));
    if(v.requestVideoFrameCallback){const loop=()=>{if(!v.isConnected)return;paintOv();v.requestVideoFrameCallback(loop);};v.requestVideoFrameCallback(loop);}
    window.addEventListener('resize',paintOv);
    paintOv();
  }
  function status(text){const s=document.querySelector('#modalBody .gx-status');if(s){s.hidden=!text;s.textContent=text||'';}}
  async function run(){
    const t=T(),root=document.querySelector('#modalBody .gx-view');if(!root||!ctx)return;
    const btn=root.querySelector('.gx-go');if(btn)btn.disabled=true;
    const pick=name=>root.querySelector(`.gx-seg[data-name="${name}"] button.on`)?.dataset.v;
    const player=root.querySelector('.gx-player video');
    try{
      if(player)player.pause();
      const frames=await sampleFrames(ctx.url,player?player.currentTime:0,(i,n)=>status(t.sampling(i,n)));
      status(t.sending);
      const r=await fetch(`${sbUrl()}/functions/v1/gait-analysis`,{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({kind:ctx.kind,record_id:ctx.id,media_path:ctx.path,gait:pick('gait')||'trot',view:pick('view')||'side',frames})});
      const body=await r.json().catch(()=>({}));
      if(body&&body.analysis){
        const k=keyOf(ctx.kind,ctx.id,ctx.path);
        analyses.set(k,[body.analysis,...(analyses.get(k)||[])]);
      }
      status('');
      if(!r.ok&&!(body&&body.analysis))throw new Error(r.status===503?t.notConfigured:(body.error||t.failed));
      paint();
      if(window.CCE&&CCE.movement)CCE.movement.render();
    }catch(e){
      status('');
      const err=document.createElement('div');err.className='gx-error';err.textContent=e&&e.message||String(e);
      root.querySelector('.gx-status')?.after(err);
      if(btn)btn.disabled=false;
    }
  }

  // ---- export with burned-in notes ----
  function pickMime(){
    if(typeof MediaRecorder==='undefined')return null;
    return ['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||null;
  }
  function wrapLines(g,text,max){
    const words=String(text).split(/\s+/),lines=[];let line='';
    words.forEach(w=>{const next=line?line+' '+w:w;if(g.measureText(next).width>max&&line){lines.push(line);line=w;}else line=next;});
    if(line)lines.push(line);return lines.slice(0,3);
  }
  function drawOverlay(g,W,H,a,n){
    const t=T(),rtl=lang()==='ar',pad=Math.round(W*0.02),fs=Math.max(16,Math.round(W*0.03));
    g.save();g.direction=rtl?'rtl':'ltr';g.textBaseline='top';
    g.font=`700 ${Math.round(fs*0.7)}px Cairo, sans-serif`;
    const tag=`${t.badge(a.grade??'?',limbText(a,true))}  ·  ${t.overlayTag}`;
    const tw=Math.min(W-pad*2,g.measureText(tag).width+pad);
    g.fillStyle='rgba(26,39,68,.78)';g.fillRect(rtl?W-pad-tw:pad,pad,tw,fs*1.1);
    g.fillStyle='#E2C27A';g.textAlign=rtl?'right':'left';g.fillText(tag,rtl?W-pad-pad/2:pad+pad/2,pad+fs*0.15,W-pad*3);
    if(n){
      const colour=n.level==='concern'?'#E5533D':n.level==='watch'?'#F0B43C':'#4FC08D';
      if(n.x!=null&&n.y!=null){g.strokeStyle=colour;g.lineWidth=Math.max(3,W*0.005);g.beginPath();g.arc(n.x*W,n.y*H,Math.max(18,W*0.04),0,Math.PI*2);g.stroke();}
      g.font=`800 ${fs}px Cairo, sans-serif`;g.textAlign='center';
      const lines=wrapLines(g,noteText(n),W*0.86),lh=fs*1.35,bh=lines.length*lh+fs*0.6,by=H-bh-pad*2;
      g.fillStyle='rgba(17,26,48,.82)';g.fillRect(W*0.05,by,W*0.9,bh);
      g.fillStyle=colour;g.fillRect(rtl?W*0.95-6:W*0.05,by,6,bh);
      g.fillStyle='#fff';lines.forEach((ln,i)=>g.fillText(ln,W/2,by+fs*0.3+i*lh,W*0.86));
    }
    g.restore();
  }
  async function exportVideo(a){
    const t=T(),mime=pickMime();
    if(!mime||!HTMLCanvasElement.prototype.captureStream){alert(t.exportUnsupported);return;}
    const dl=document.querySelector('#modalBody .gx-dl');if(dl)dl.disabled=true;
    let release=()=>{};
    try{
      status(t.exporting(0));
      const res=await blobVideo(ctx.url);release=res.release;const v=res.video;
      const scale=Math.min(1,1280/(v.videoWidth||1280));
      const c=document.createElement('canvas');c.width=Math.round((v.videoWidth||1280)*scale)&~1;c.height=Math.round((v.videoHeight||720)*scale)&~1;
      const g=c.getContext('2d');
      const from=Math.max(0,Number(a.clip_start||0)-1),to=Math.min(v.duration,from+EXPORT_MAX_SECONDS,Math.max(Number(a.clip_end||0)+2,from+3));
      const rec=new MediaRecorder(c.captureStream(30),{mimeType:mime,videoBitsPerSecond:4_000_000});
      const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
      const stopped=new Promise(ok=>rec.onstop=ok);
      await seek(v,from);
      const draw=()=>{g.drawImage(v,0,0,c.width,c.height);drawOverlay(g,c.width,c.height,a,activeAnnotation(a.annotations,v.currentTime));};
      draw();rec.start(250);await v.play();
      await new Promise(ok=>{
        let finished=false;
        const finish=()=>{if(finished)return;finished=true;v.pause();ok();};
        v.addEventListener('ended',finish,{once:true});
        const tick=()=>{
          if(finished)return;
          draw();status(t.exporting(Math.min(99,Math.round((v.currentTime-from)/(to-from)*100))));
          if(v.currentTime>=to||v.ended){finish();return;}
          v.requestVideoFrameCallback?v.requestVideoFrameCallback(tick):requestAnimationFrame(tick);
        };tick();
      });
      rec.stop();await stopped;
      const blob=new Blob(chunks,{type:mime.split(';')[0]});
      const link=document.createElement('a');link.href=URL.createObjectURL(blob);
      link.download=`movement-analysis-${a.id}.${mime.includes('mp4')?'mp4':'webm'}`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),60000);
      status('');
    }catch(e){status('');alert(e&&e.message||String(e));}
    finally{release();if(dl&&dl.isConnected)dl.disabled=false;}
  }

  CCE.gait={load,chip,open,_test:{planFrameTimes,activeAnnotation,contentBox,STRINGS,analyses,keyOf,latestFor}};
})();
