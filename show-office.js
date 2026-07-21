(function(){
  'use strict';
  const STORAGE_KEY='cce_show_office_competitions_v1';
  const STATUSES=['Draft','Open','Running','Finished'];

  function list(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(_){return [];}
  }
  function persist(rows){localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));}
  function clean(value){return String(value??'').trim();}
  function html(value){return clean(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function attr(value){return html(value);}
  function dateLabel(value){
    if(!value)return 'Date not set';
    const d=new Date(value+'T00:00:00');
    return Number.isNaN(d.getTime())?html(value):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  }
  function statusClass(status){return 'so-status-'+clean(status).toLowerCase();}
  function byDate(a,b){return clean(b.competitionDate).localeCompare(clean(a.competitionDate));}

  window.renderShowOfficeDashboard=function(){
    const rows=list().sort(byDate);
    const stats=document.getElementById('showOfficeStats');
    if(stats){
      const counts=Object.fromEntries(STATUSES.map(status=>[status,rows.filter(row=>row.competitionStatus===status).length]));
      stats.innerHTML=`
        <div class="so-stat"><span>Total competitions</span><strong>${rows.length}</strong></div>
        <div class="so-stat"><span>Open</span><strong>${counts.Open}</strong></div>
        <div class="so-stat"><span>Running</span><strong>${counts.Running}</strong></div>
        <div class="so-stat"><span>Finished</span><strong>${counts.Finished}</strong></div>`;
    }
    const recent=document.getElementById('showOfficeRecent');
    if(recent){
      recent.innerHTML=rows.length?`<div class="so-recent-list">${rows.slice(0,5).map(row=>`
        <button class="so-recent-item" onclick="showDashPage('competitions')">
          <span><strong>${html(row.competitionName)}</strong><small>${dateLabel(row.competitionDate)} · ${html(row.venue||'Venue not set')}</small></span>
          <span class="so-status ${statusClass(row.competitionStatus)}">${html(row.competitionStatus)}</span>
        </button>`).join('')}</div>`:'<div class="so-empty"><span>🏆</span><strong>No competitions yet</strong><p>Create your first competition to begin.</p><button class="btn btn-amber" onclick="openCompetitionEditor()">＋ New Competition</button></div>';
    }
  };

  window.renderCompetitions=function(){
    const target=document.getElementById('competitionTable');
    if(!target)return;
    const query=clean(document.getElementById('competitionSearch')?.value).toLowerCase();
    const status=clean(document.getElementById('competitionStatusFilter')?.value);
    const rows=list().filter(row=>{
      const haystack=[row.competitionName,row.venue,row.organizer,row.chiefJudge].join(' ').toLowerCase();
      return (!query||haystack.includes(query))&&(!status||row.competitionStatus===status);
    }).sort(byDate);
    const count=document.getElementById('competitionCount');
    if(count)count.textContent=String(rows.length);
    if(!rows.length){target.innerHTML='<div class="so-empty"><span>🏅</span><strong>No matching competitions</strong><p>Create a competition or change the filters.</p></div>';return;}
    target.innerHTML=`<table class="so-table"><thead><tr><th>Competition</th><th>Date</th><th>Venue</th><th>Status</th><th>Officials</th><th>Actions</th></tr></thead><tbody>${rows.map(row=>`
      <tr>
        <td><strong>${html(row.competitionName)}</strong><small>${html(row.organizer||'Organizer not set')}</small></td>
        <td>${dateLabel(row.competitionDate)}</td>
        <td>${html(row.venue||'—')}</td>
        <td><span class="so-status ${statusClass(row.competitionStatus)}">${html(row.competitionStatus)}</span></td>
        <td><small>Judge: ${html(row.chiefJudge||'—')}</small><small>Designer: ${html(row.courseDesigner||'—')}</small></td>
        <td><div class="so-actions"><button class="action-btn" onclick="openCompetitionEditor('${attr(row.id)}')" title="Edit">✏️</button><button class="action-btn so-delete" onclick="deleteCompetition('${attr(row.id)}')" title="Delete">🗑️</button></div></td>
      </tr>`).join('')}</tbody></table>`;
  };

  window.openCompetitionEditor=function(id){
    const row=list().find(item=>String(item.id)===String(id))||{};
    const editing=Boolean(row.id);
    openModal(editing?'Edit Competition':'New Competition',`
      <div class="so-modal-intro"><span>🏆</span><div><strong>${editing?'Update competition details':'Create your first event'}</strong><small>Classes and entries will be added inside this competition.</small></div></div>
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1"><label>Competition Name *</label><input id="so-name" maxlength="120" value="${attr(row.competitionName||'')}" placeholder="Example: CCE Summer Cup 2026"></div>
        <div class="form-group"><label>Date *</label><input id="so-date" type="date" value="${attr(row.competitionDate||'')}"></div>
        <div class="form-group"><label>Status</label><select id="so-status">${STATUSES.map(s=>`<option ${row.competitionStatus===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="form-group" style="grid-column:1/-1"><label>Venue *</label><input id="so-venue" maxlength="120" value="${attr(row.venue||'')}" placeholder="Competition venue"></div>
        <div class="form-group"><label>Organizer</label><input id="so-organizer" maxlength="120" value="${attr(row.organizer||'')}"></div>
        <div class="form-group"><label>Chief Judge</label><input id="so-judge" maxlength="120" value="${attr(row.chiefJudge||'')}"></div>
        <div class="form-group"><label>Course Designer</label><input id="so-designer" maxlength="120" value="${attr(row.courseDesigner||'')}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Notes</label><textarea id="so-notes" rows="4" maxlength="1000">${html(row.notes||'')}</textarea></div>
      </div>
      <div id="so-form-error" class="so-form-error" role="alert"></div>
      <div class="btn-row"><button class="btn btn-amber" onclick="saveCompetition('${attr(row.id||'')}')">${editing?'Save Changes':'Create Competition'}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
    setTimeout(()=>document.getElementById('so-name')?.focus(),0);
  };

  window.saveCompetition=function(id){
    const data={
      competitionName:clean(document.getElementById('so-name')?.value),
      competitionDate:clean(document.getElementById('so-date')?.value),
      competitionStatus:clean(document.getElementById('so-status')?.value)||'Draft',
      venue:clean(document.getElementById('so-venue')?.value),
      organizer:clean(document.getElementById('so-organizer')?.value),
      chiefJudge:clean(document.getElementById('so-judge')?.value),
      courseDesigner:clean(document.getElementById('so-designer')?.value),
      notes:clean(document.getElementById('so-notes')?.value)
    };
    const error=document.getElementById('so-form-error');
    if(!data.competitionName||!data.competitionDate||!data.venue){
      if(error){error.textContent='Competition name, date and venue are required.';error.style.display='block';}
      return;
    }
    const rows=list();
    const now=new Date().toISOString();
    if(id){
      const index=rows.findIndex(row=>String(row.id)===String(id));
      if(index<0)return;
      rows[index]={...rows[index],...data,updatedAt:now};
    }else{
      rows.push({id:(globalThis.crypto?.randomUUID?.()||('c'+Date.now())),...data,createdAt:now,updatedAt:now});
    }
    persist(rows);closeModal();renderCompetitions();renderShowOfficeDashboard();
  };

  window.deleteCompetition=function(id){
    const rows=list();
    const row=rows.find(item=>String(item.id)===String(id));
    if(!row)return;
    if(!confirm(`Delete “${row.competitionName}”? This cannot be undone.`))return;
    persist(rows.filter(item=>String(item.id)!==String(id)));
    renderCompetitions();renderShowOfficeDashboard();
  };

  document.addEventListener('DOMContentLoaded',()=>{
    renderShowOfficeDashboard();
    renderCompetitions();
  });
})();
