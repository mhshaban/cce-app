// Horse profile shell and tab controller.
(function(){
  window.CCE=window.CCE||{}; CCE.horseProfile=CCE.horseProfile||{};
  const tabs=[['overview','Overview'],['medical','Medical'],['vaccines','Vaccinations'],['care','Care & Alerts'],['timeline','Timeline']];
  CCE.horseProfile.selectTab=function(tab){
    document.querySelectorAll('.horse-profile-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
    document.querySelectorAll('.horse-profile-pane').forEach(x=>x.hidden=x.id!==`hpp-${tab}`);
    CCE.events?.emit('horse-profile:tab-changed',{tab});
  };
  CCE.horseProfile.render=function(h,p){
    const score=healthScore(h);
    const nav=tabs.map(([id,label],i)=>`<button class="horse-profile-tab ${i?'':'active'}" data-tab="${id}" onclick="profileTab(${h.id},'${id}')">${label}</button>`).join('');
    const panes=tabs.map(([id])=>`<section class="horse-profile-pane" id="hpp-${id}" ${id==='overview'?'':'hidden'}>${CCE.horseProfile.panels[id](h,p)}</section>`).join('');
    return `<div class="horse-profile-shell"><div class="horse-profile-hero"><div class="horse-profile-identity"><span>&#128052;</span><div><h3>${esc(h.horse_name)}</h3><p>${esc(h.breed||'Breed not recorded')} · ${esc(h.sex||'Sex not recorded')} · Stable ${esc(h.stable_no||'—')}</p></div></div><div class="horse-profile-score ${scoreClass(score)}"><b>${score}</b><span>Health score</span></div></div><div class="horse-profile-tabs">${nav}</div>${panes}</div>`;
  };
  CCE.horseProfile.open=function(id){
    const h=CCE.horses.find(horses,id); if(!h)return;
    const p=healthProfileFor(id)||{};
    openModal('Horse Profile — '+h.horse_name,CCE.horseProfile.render(h,p));
    document.querySelector('#modalOverlay .modal')?.classList.add('horse-profile-modal');
    CCE.events?.emit('horse-profile:opened',{horseId:id});
  };
})();
