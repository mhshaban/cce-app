// Horse profile timeline component, backed by the shared timeline engine.
(function(){
  window.CCE=window.CCE||{}; CCE.horseProfile=CCE.horseProfile||{}; CCE.horseProfile.panels=CCE.horseProfile.panels||{};
  CCE.horseProfile.panels.timeline=function(h){
    const events=CCE.timeline.forHorse(horse_health_events,h.id);
    return `<div class="horse-timeline">${events.map(x=>`<div><time>${fmt(x.date)}</time><span></span><article><b>${esc(x.title)}</b><small>${esc(x.type)}</small><p>${esc(x.details||'')}</p></article></div>`).join('')||'<div class="health-empty">The timeline will appear as records are added.</div>'}</div>`;
  };
})();
