// Paddock board selectors (v4.34.0). No DOM access and no Supabase calls.
// The server already masks other owners' horses; these helpers only group and label.
(function(){
  window.CCE=window.CCE||{};
  const PADDOCKS=[
    {code:'big',label:'البادوك الكبير'},
    {code:'inner',label:'البادوك الداخلي'},
    {code:'outer',label:'البادوك الخارجي'}
  ];
  const ACTIVITIES={
    movement:{label:'Lunging / Free',minutes:20},
    session:{label:'Session',minutes:45},
    stable_session:{label:'CCE Session',minutes:45}
  };
  const PERIODS=[
    {code:'morning',label:'الفترة الصباحية',hours:'9:00 – 12:00'},
    {code:'evening',label:'الفترة المسائية',hours:'3:00 – 8:00'}
  ];
  const RESERVED_LABEL='(محجوز)';
  const STABLE_LABEL='حصة تدريبية (محجوز)';
  const toMinutes=value=>{
    const m=String(value||'').match(/^(\d{1,2}):(\d{2})/);
    return m?Number(m[1])*60+Number(m[2]):NaN;
  };
  const toTime=total=>{
    const t=((Math.round(total)%1440)+1440)%1440;
    return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  };
  // 12-hour clock without am/pm, matching how the stable reads its schedule (3:00 = 15:00).
  const clock=value=>{
    const total=toMinutes(value);
    if(!Number.isFinite(total))return '';
    let h=Math.floor(total/60);const m=total%60;
    if(h>12)h-=12;
    return h+':'+String(m).padStart(2,'0');
  };
  const periodOf=slot=>toMinutes(slot&&slot.start_time)<13*60?'morning':'evening';
  window.CCE.paddocks={
    PADDOCKS,ACTIVITIES,PERIODS,RESERVED_LABEL,STABLE_LABEL,
    toMinutes,toTime,clock,periodOf,
    paddockLabel(code){return (PADDOCKS.find(p=>p.code===code)||{label:code}).label;},
    activityLabel(code){return (ACTIVITIES[code]||{label:code}).label;},
    defaultEnd(start,activity){
      const begin=toMinutes(start);
      return Number.isFinite(begin)?toTime(begin+((ACTIVITIES[activity]||ACTIVITIES.movement).minutes)):'';
    },
    // What a slot shows as its main line. Owners never receive other horses' names.
    slotTitle(slot){
      if(!slot)return '';
      if(slot.activity==='stable_session')return STABLE_LABEL;
      if(slot.reserved||!slot.horse_name)return RESERVED_LABEL;
      return String(slot.horse_name).trim();
    },
    group(slots){
      const out={};
      PERIODS.forEach(p=>{out[p.code]={};PADDOCKS.forEach(d=>{out[p.code][d.code]=[];});});
      (slots||[]).forEach(slot=>{
        const period=periodOf(slot);
        if(out[period]&&out[period][slot.paddock])out[period][slot.paddock].push(slot);
      });
      Object.values(out).forEach(byPaddock=>Object.values(byPaddock).forEach(list=>
        list.sort((a,b)=>toMinutes(a.start_time)-toMinutes(b.start_time))));
      return out;
    }
  };
})();
