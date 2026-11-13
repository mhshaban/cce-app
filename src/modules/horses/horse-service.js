// Horse domain selectors. No DOM access and no duplicated application state.
(function(){
  window.CCE=window.CCE||{};
  const normalizeStatus=value=>String(value||'').trim().toLowerCase();
  // ISO 11784/11785 equine microchips are 15 digits. Spaces and dashes typed or
  // pasted between digit groups are dropped, and Arabic-Indic digits from an
  // Arabic keyboard become 0-9, before checking and saving.
  const MICROCHIP_DIGITS=15;
  const normalizeMicrochip=value=>String(value==null?'':value)
    .replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660))
    .replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0))
    .replace(/[\s-]+/g,'');
  const microchipStatus=value=>{const chip=normalizeMicrochip(value);if(!chip)return 'missing';return chip.length===MICROCHIP_DIGITS&&/^\d+$/.test(chip)?'valid':'invalid';};
  CCE.horses={
    find(rows,id){return (rows||[]).find(x=>String(x.id)===String(id))||null;},
    active(rows){return (rows||[]).filter(h=>normalizeStatus(h.status)==='available');},
    archived(rows){return (rows||[]).filter(h=>['sold','out','dead'].includes(normalizeStatus(h.status)));},
    byOwner(rows,owner){const key=String(owner||'').trim().toLowerCase();return (rows||[]).filter(h=>String(h.owner||'').trim().toLowerCase()===key);},
    MICROCHIP_DIGITS,
    normalizeMicrochip,
    microchipStatus,
    missingMicrochip(rows){return (rows||[]).filter(h=>microchipStatus(h.microchip)==='missing');},
    invalidMicrochip(rows){return (rows||[]).filter(h=>microchipStatus(h.microchip)==='invalid');},
    operationalStatus(value){const status=normalizeStatus(value);return status==='available'?'active':['sold','out','dead'].includes(status)?'archived':'other';}
  };
})();
