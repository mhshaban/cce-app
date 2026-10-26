// Horse-health domain and persistence service.
// UI modules use this API instead of constructing Supabase requests directly.
(function(){
  window.CCE=window.CCE||{};
  const sameHorse=(row,id)=>String(row&&row.horse_id)===String(id);
  const byDateDesc=(a,b)=>String(b.event_date||b.due_date||'').localeCompare(String(a.event_date||a.due_date||''));
  const byDueAsc=(a,b)=>String(a.due_date||a.event_date||'').localeCompare(String(b.due_date||b.event_date||''));
  const summaryMeta={
    Farrier:{date:'farrier_date',person:'farrier_name'},
    Dental:{date:'teeth_date'},
    Deworming:{date:'deworm_date'},
    Vaccination:{date:'vaccine_date',person:'vaccine_dr'},
    Medication:{date:'med_date',person:'medicant'}
  };
  function bahrainDate(value){
    if(!value)return null;
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bahrain',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
      const get=type=>parts.find(part=>part.type===type)?.value;
      const year=get('year'),month=get('month'),day=get('day');
      return year&&month&&day?`${year}-${month}-${day}`:null;
    }catch(_error){return String(value).slice(0,10)||null;}
  }
  function completedDate(event){
    if(event.event_scope==='care')return bahrainDate(event.completed_at)||event.event_date||null;
    return event.event_date||bahrainDate(event.completed_at)||null;
  }
  function completedPerson(event){
    return event.assigned_to||event.veterinarian||null;
  }
  // Mirrors cce_health_event_medication(): the medication a record shows on the horse card.
  function medicationValue(event){
    const text=value=>String(value||'').trim()||null;
    if(event.status==='Cancelled')return null;
    const completedMedication=event.event_type==='Medication'&&event.status==='Completed';
    if(event.event_scope==='medical')return text(event.medication)||(completedMedication?text(event.title):null);
    return completedMedication?text(event.medication)||text(event.title):null;
  }
  function mergeCompletedSummaries(horseRows,events){
    const latest=new Map();
    const consider=(event,type,date,person)=>{
      const key=`${event.horse_id}:${type}`;
      const current=latest.get(key);
      if(!current||date>current.date||(date===current.date&&Number(event.id||0)>Number(current.event.id||0))){
        latest.set(key,{date,event,meta:summaryMeta[type],person});
      }
    };
    (events||[]).forEach(event=>{
      const medication=medicationValue(event);
      if(medication&&event.event_date)consider(event,'Medication',event.event_date,medication);
      if(event.event_type==='Medication')return;
      const meta=summaryMeta[event.event_type];
      const date=event.status==='Completed'&&meta?completedDate(event):null;
      if(date)consider(event,event.event_type,date,completedPerson(event));
    });
    return (horseRows||[]).map(horse=>{
      const next={...horse};
      Object.keys(summaryMeta).forEach(type=>{
        const summary=latest.get(`${horse.id}:${type}`);
        if(!summary)return;
        const current=String(next[summary.meta.date]||'');
        if(current&&current>summary.date)return;
        next[summary.meta.date]=summary.date;
        if(summary.meta.person&&summary.person)next[summary.meta.person]=summary.person;
      });
      return next;
    });
  }
  function derive(events){
    const rows=Array.isArray(events)?events:[];
    return {
      medical:rows.filter(x=>x.event_scope==='medical').map(x=>({...x,record_type:x.event_type,next_review_date:x.due_date})),
      vaccinations:rows.filter(x=>x.event_scope==='vaccination').map(x=>({...x,vaccine_name:x.title,administered_date:x.status==='Completed'?x.event_date:null,due_date:x.due_date||x.event_date})),
      care:rows.filter(x=>x.event_scope==='care').map(x=>({...x,task_type:x.event_type==='Veterinary Visit'?'Veterinary':x.event_type,due_date:x.due_date||x.event_date}))
    };
  }
  CCE.health={
    derive,
    mergeCompletedSummaries,
    profileFor(profiles,id){return (profiles||[]).find(x=>sameHorse(x,id))||null;},
    records(events,id){return derive(events).medical.filter(x=>sameHorse(x,id)).sort(byDateDesc);},
    vaccines(events,id){return derive(events).vaccinations.filter(x=>sameHorse(x,id)).sort(byDueAsc);},
    tasks(events,id){return derive(events).care.filter(x=>sameHorse(x,id)).sort(byDueAsc);},
    async load(){
      const [profiles,events]=await Promise.all([
        sbGet('horse_health_profiles','select=*&limit=500'),
        sbGetAll('horse_health_events','select=*&order=event_date.desc,id.desc')
      ]);
      if(CCE.store)CCE.store.setMany({horseHealthProfiles:profiles,horseHealthEvents:events});
      return {profiles,events,derived:derive(events)};
    },
    async upsertProfile(params){return sbRpc('cce_upsert_horse_health_profile',params);},
    async createEvent(data){return sbPost('horse_health_events',data);},
    async updateEvent(id,data){return sbPatch('horse_health_events',id,data);},
    async deleteEvent(id){return sbDel('horse_health_events',id);}
  };
})();
