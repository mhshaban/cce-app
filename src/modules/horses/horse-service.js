// Horse domain selectors. No DOM access and no duplicated application state.
(function(){
  window.CCE=window.CCE||{};
  const normalizeStatus=value=>String(value||'').trim().toLowerCase();
  CCE.horses={
    find(rows,id){return (rows||[]).find(x=>String(x.id)===String(id))||null;},
    active(rows){return (rows||[]).filter(h=>normalizeStatus(h.status)==='available');},
    archived(rows){return (rows||[]).filter(h=>['sold','out','dead'].includes(normalizeStatus(h.status)));},
    byOwner(rows,owner){const key=String(owner||'').trim().toLowerCase();return (rows||[]).filter(h=>String(h.owner||'').trim().toLowerCase()===key);},
    operationalStatus(value){const status=normalizeStatus(value);return status==='available'?'active':['sold','out','dead'].includes(status)?'archived':'other';}
  };
})();
