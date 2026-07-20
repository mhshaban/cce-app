(function(){
  function normalizePortalBranding(){
    document.querySelectorAll('.header-brand img').forEach(function(img){
      img.src='icons/logo-transparent.png';
      img.alt='Country Club Equestrian';
      img.onerror=function(){this.onerror=null;this.src='icons/icon-192.png';};
    });
  }

  function installHorseSorting(){
    if(typeof window.renderHorses!=='function'||window.renderHorses.__cceStableSortInstalled)return;

    const originalRenderHorses=window.renderHorses;
    const terminalStatusOrder={sold:3,out:4,dead:5};

    function normalizeStatus(value){
      return String(value||'').trim().toLowerCase();
    }

    function parseStable(value){
      const raw=String(value??'').trim().toUpperCase().replace(/\s+/g,'');
      if(!raw)return {group:2,number:Number.POSITIVE_INFINITY,raw:''};

      if(/^\d+(?:\.\d+)?$/.test(raw)){
        return {group:0,number:Number(raw),raw};
      }

      const match=raw.match(/^([AB])(\d+(?:\.\d+)?)$/);
      if(match){
        return {group:match[1]==='A'?1:2,number:Number(match[2]),raw};
      }

      return {group:2,number:Number.POSITIVE_INFINITY,raw};
    }

    function endDateValue(value){
      if(!value)return Number.POSITIVE_INFINITY;
      const time=Date.parse(String(value));
      return Number.isFinite(time)?time:Number.POSITIVE_INFINITY;
    }

    function compareNames(a,b){
      return String(a&&a.horse_name||'').localeCompare(String(b&&b.horse_name||''),'en',{numeric:true,sensitivity:'base'});
    }

    function compareHorses(a,b){
      const aStatus=normalizeStatus(a&&a.status);
      const bStatus=normalizeStatus(b&&b.status);
      const aSection=terminalStatusOrder[aStatus]??0;
      const bSection=terminalStatusOrder[bStatus]??0;

      if(aSection!==bSection)return aSection-bSection;

      if(aSection>=3){
        const aEnd=endDateValue(a&&a.end_date);
        const bEnd=endDateValue(b&&b.end_date);
        if(aEnd!==bEnd)return aEnd-bEnd;
        return compareNames(a,b);
      }

      const aStable=parseStable(a&&a.stable_no);
      const bStable=parseStable(b&&b.stable_no);
      if(aStable.group!==bStable.group)return aStable.group-bStable.group;
      if(aStable.number!==bStable.number)return aStable.number-bStable.number;
      if(aStable.raw!==bStable.raw)return aStable.raw.localeCompare(bStable.raw,'en',{numeric:true,sensitivity:'base'});
      return compareNames(a,b);
    }

    function sortedRenderHorses(){
      if(typeof horses!=='undefined'&&Array.isArray(horses))horses.sort(compareHorses);
      return originalRenderHorses.apply(this,arguments);
    }

    sortedRenderHorses.__cceStableSortInstalled=true;
    window.renderHorses=sortedRenderHorses;
  }

  function installSafeMemberForm(){
    if(typeof window.openCreateMember!=='function'||window.openCreateMember.__cceRolesReadyInstalled)return;

    const originalOpenCreateMember=window.openCreateMember;
    let opening=false;

    async function waitForRoles(){
      if(typeof window.loadAccessAdmin==='function'){
        try{await window.loadAccessAdmin(true);}catch(_error){}
      }

      for(let i=0;i<40;i++){
        if(document.querySelectorAll('#accessRolesPanel .member-role-card').length)return true;
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      return false;
    }

    async function safeOpenCreateMember(){
      if(opening)return;
      opening=true;
      try{
        const ready=await waitForRoles();
        originalOpenCreateMember.apply(this,arguments);
        const roleSelect=document.getElementById('member-role');
        if(roleSelect&&roleSelect.options.length)return;

        if(roleSelect){
          roleSelect.innerHTML='<option value="">No roles loaded — refresh and try again</option>';
          roleSelect.disabled=true;
        }
        if(!ready&&typeof window.loadAccessAdmin==='function'){
          try{await window.loadAccessAdmin(true);}catch(_error){}
        }
      }finally{
        opening=false;
      }
    }

    safeOpenCreateMember.__cceRolesReadyInstalled=true;
    window.openCreateMember=safeOpenCreateMember;
  }

  function installFixes(){
    normalizePortalBranding();
    installHorseSorting();
    installSafeMemberForm();
  }

  installFixes();
  document.addEventListener('DOMContentLoaded',installFixes);
  window.addEventListener('load',installFixes);
})();
