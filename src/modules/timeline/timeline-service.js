// StableOS timeline engine: normalizes domain events into one chronological stream.
(function(){
  window.CCE=window.CCE||{};
  const dateOf=row=>row.event_date||row.administered_date||row.due_date||row.created_at||null;
  const normalize=row=>({
    id:row.id,
    horse_id:row.horse_id,
    date:dateOf(row),
    scope:row.event_scope||'horse',
    type:row.record_type||row.task_type||row.event_type||'Update',
    title:row.title||row.vaccine_name||row.event_type||'Horse update',
    details:row.diagnosis||row.treatment||row.notes||row.status||'',
    status:row.status||null,
    priority:row.priority||null,
    source:row
  });
  CCE.timeline={
    normalize,
    forHorse(events,horseId){
      return (events||[]).filter(x=>String(x.horse_id)===String(horseId)).map(normalize).filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.id||0)-Number(a.id||0));
    },
    groupByDay(items){
      return (items||[]).reduce((groups,item)=>{const key=String(item.date||'').slice(0,10)||'undated';(groups[key]||(groups[key]=[])).push(item);return groups;},{});
    }
  };
})();
