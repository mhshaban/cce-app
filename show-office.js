(function(){
  'use strict';

  const STORAGE_KEY='cce_show_office_competitions_v1';
  const STATUS_ORDER={Running:0,Open:1,Draft:2,Finished:3};

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function readCompetitions(){
    try{
      const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(rows)?rows:[];
    }catch(_error){return [];}
  }
  function writeCompetitions(rows){localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));}
  function formatDate(value){
    if(!value)return '—';
    const date=new Date(value+'T00:00:00');
    return Number.isNaN(date.getTime())?escapeHtml(value):date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  }
  function statusClass(status){return 'so-status-'+String(status||'Draft').toLowerCase();}
  function nextId(){return 'competition_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);}
  function today(){return new Date().toISOString().slice(0,10);}

  function sortedCompetitions(){
    return readCompetitions().slice().sort((a,b)=>{
      const status=(STATUS_ORDER[a.competitionStatus]??9)-(STATUS_ORDER[b.competitionStatus]??9);
      if(status)return status;
      return String(b.competitionDate||'').localeCompare(String(a.competitionDate||''));
    });
  }

  function renderShowOfficeDashboard(){
    const rows=readCompetitions();
    const running=rows.filter(row=>row.competitionStatus==='Running').length;
    const open=rows.filter(row=>row.competitionStatus==='Open').length;
    const finished=rows.filter(row=>row.competitionStatus==='Finished').length;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
    set('soCompetitionCount',rows.length);
    set('soRunningCount',running);
    set('soOpenCount',open);
    set('soFinishedCount',finished);
  }

  function renderCompetitions(){
    renderShowOfficeDashboard();
    const host=document.getElementById('soCompetitionsTable');
    if(!host)return;
    const query=String(document.getElementById('soCompetitionSearch')?.value||'').trim().toLowerCase();
    const status=document.getElementById('soCompetitionStatus')?.value||'';
    const rows=sortedCompetitions().filter(row=>{
      const haystack=[row.competitionName,row.venue,row.organizer,row.chiefJudge].join(' ').toLowerCase();
      return (!query||haystack.includes(query))&&(!status||row.competitionStatus===status);
    });
    const count=document.getElementById('soCompetitionListCount');
    if(count)count.textContent=String(rows.length);
    if(!rows.length){
      host.innerHTML='<div class="so-table-empty"><div>🏆</div><strong>No competitions found</strong><p>Create the first competition to begin building classes and entries.</p></div>';
      return;
    }
    host.innerHTML='<table><thead><tr><th>Competition</th><th>Date</th><th>Venue</th><th>Status</th><th>Organizer</th><th>Actions</th></tr></thead><tbody>'+rows.map(row=>
      '<tr><td><strong>'+escapeHtml(row.competitionName)+'</strong><div style="font-size:11px;color:var(--muted);margin-top:3px">'+escapeHtml(row.notes||'')+'</div></td>'+ 
      '<td>'+formatDate(row.competitionDate)+'</td><td>'+escapeHtml(row.venue||'—')+'</td>'+ 
      '<td><span class="so-status '+statusClass(row.competitionStatus)+'">'+escapeHtml(row.competitionStatus||'Draft')+'</span></td>'+ 
      '<td>'+escapeHtml(row.organizer||'—')+'</td><td><div class="so-row-actions"><button class="so-edit" onclick="openCompetitionForm(\''+escapeHtml(row.id)+'\')">Edit</button><button class="so-delete" onclick="deleteCompetition(\''+escapeHtml(row.id)+'\')">Delete</button></div></td></tr>'
    ).join('')+'</tbody></table>';
  }

  function openCompetitionForm(id){
    const row=id?readCompetitions().find(item=>item.id===id):null;
    const overlay=document.getElementById('soCompetitionModal');
    if(!overlay)return;
    document.getElementById('soCompetitionModalTitle').textContent=row?'Edit Competition':'New Competition';
    document.getElementById('soCompetitionId').value=row?.id||'';
    document.getElementById('soCompetitionName').value=row?.competitionName||'';
    document.getElementById('soCompetitionDate').value=row?.competitionDate||today();
    document.getElementById('soCompetitionVenue').value=row?.venue||'';
    document.getElementById('soCompetitionOrganizer').value=row?.organizer||'';
    document.getElementById('soCompetitionChiefJudge').value=row?.chiefJudge||'';
    document.getElementById('soCompetitionCourseDesigner').value=row?.courseDesigner||'';
    document.getElementById('soCompetitionStatusField').value=row?.competitionStatus||'Draft';
    document.getElementById('soCompetitionNotes').value=row?.notes||'';
    overlay.classList.remove('hidden');
    setTimeout(()=>document.getElementById('soCompetitionName')?.focus(),30);
  }

  function closeCompetitionForm(){document.getElementById('soCompetitionModal')?.classList.add('hidden');}

  function saveCompetition(event){
    event?.preventDefault();
    const id=document.getElementById('soCompetitionId').value;
    const name=document.getElementById('soCompetitionName').value.trim();
    const date=document.getElementById('soCompetitionDate').value;
    if(!name||!date){alert('Competition name and date are required.');return false;}
    const rows=readCompetitions();
    const existing=rows.find(item=>item.id===id);
    const now=new Date().toISOString();
    const record={
      id:id||nextId(),competitionName:name,competitionDate:date,
      venue:document.getElementById('soCompetitionVenue').value.trim(),
      organizer:document.getElementById('soCompetitionOrganizer').value.trim(),
      chiefJudge:document.getElementById('soCompetitionChiefJudge').value.trim(),
      courseDesigner:document.getElementById('soCompetitionCourseDesigner').value.trim(),
      competitionStatus:document.getElementById('soCompetitionStatusField').value,
      notes:document.getElementById('soCompetitionNotes').value.trim(),
      createdAt:existing?.createdAt||now,updatedAt:now
    };
    if(existing)Object.assign(existing,record);else rows.push(record);
    writeCompetitions(rows);
    closeCompetitionForm();
    renderCompetitions();
    if(typeof window.logAudit==='function'){
      try{window.logAudit(existing?'update':'create','competitions',record.id,record.competitionName);}catch(_error){}
    }
    return false;
  }

  function deleteCompetition(id){
    const rows=readCompetitions();
    const record=rows.find(item=>item.id===id);
    if(!record)return;
    if(!confirm('Delete "'+record.competitionName+'"? This cannot be undone.'))return;
    writeCompetitions(rows.filter(item=>item.id!==id));
    renderCompetitions();
    if(typeof window.logAudit==='function'){
      try{window.logAudit('delete','competitions',record.id,record.competitionName);}catch(_error){}
    }
  }

  window.renderShowOfficeDashboard=renderShowOfficeDashboard;
  window.renderCompetitions=renderCompetitions;
  window.openCompetitionForm=openCompetitionForm;
  window.closeCompetitionForm=closeCompetitionForm;
  window.saveCompetition=saveCompetition;
  window.deleteCompetition=deleteCompetition;

  document.addEventListener('DOMContentLoaded',()=>{
    renderShowOfficeDashboard();
    renderCompetitions();
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCompetitionForm();});
  });
})();
