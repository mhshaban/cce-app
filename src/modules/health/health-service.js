// Horse-health domain and persistence service.
// UI modules use this API instead of constructing Supabase requests directly.
(function(){
  window.CCE=window.CCE||{};
  const sameHorse=(row,id)=>String(row&&row.horse_id)===String(id);
  const byDateDesc=(a,b)=>String(b.event_date||b.due_date||'').localeCompare(String(a.event_date||a.due_date||''));
  const byDueAsc=(a,b)=>String(a.due_date||a.event_date||'').localeCompare(String(b.due_date||b.event_date||''));
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
    profileFor(profiles,id){return (profiles||[]).find(x=>sameHorse(x,id))||null;},
    records(events,id){return derive(events).medical.filter(x=>sameHorse(x,id)).sort(byDateDesc);},
    vaccines(events,id){return derive(events).vaccinations.filter(x=>sameHorse(x,id)).sort(byDueAsc);},
    tasks(events,id){return derive(events).care.filter(x=>sameHorse(x,id)).sort(byDueAsc);},
    async load(){
      const [profiles,events]=await Promise.all([
        sbGet('horse_health_profiles','select=*&limit=500'),
        sbGet('horse_health_events','select=*&order=event_date.desc,id.desc&limit=4000')
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
