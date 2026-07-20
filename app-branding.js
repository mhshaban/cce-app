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
    const statusOrder={available:0,out:1,sold:2,dead:3};

    function stableNumber(value){
      const raw=String(value??'').trim();
      if(!raw)return null;
      const match=raw.match(/\d+(?:\.\d+)?/);
      if(!match)return null;
      const number=Number(match[0]);
      return Number.isFinite(number)?number:null;
    }

    function endDateValue(value){
      if(!value)return Number.POSITIVE_INFINITY;
      const time=Date.parse(String(value));
      return Number.isFinite(time)?time:Number.POSITIVE_INFINITY;
    }

    function compareHorses(a,b){
      const aStable=stableNumber(a&&a.stable_no);
      const bStable=stableNumber(b&&b.stable_no);
      const aHasStable=aStable!==null;
      const bHasStable=bStable!==null;

      if(aHasStable!==bHasStable)return aHasStable?-1:1;
      if(aHasStable&&bHasStable&&aStable!==bStable)return aStable-bStable;

      if(!aHasStable&&!bHasStable){
        const aStatus=statusOrder[String(a&&a.status||'').trim().toLowerCase()]??99;
        const bStatus=statusOrder[String(b&&b.status||'').trim().toLowerCase()]??99;
        if(aStatus!==bStatus)return aStatus-bStatus;

        const aEnd=endDateValue(a&&a.end_date);
        const bEnd=endDateValue(b&&b.end_date);
        if(aEnd!==bEnd)return aEnd-bEnd;
      }

      return String(a&&a.horse_name||'').localeCompare(String(b&&b.horse_name||''),'en',{numeric:true,sensitivity:'base'});
    }

    function sortedRenderHorses(){
      if(Array.isArray(window.horses))window.horses.sort(compareHorses);
      return originalRenderHorses.apply(this,arguments);
    }

    sortedRenderHorses.__cceStableSortInstalled=true;
    window.renderHorses=sortedRenderHorses;
  }

  installHorseSorting();
  document.addEventListener('DOMContentLoaded',function(){
    normalizePortalBranding();
    installHorseSorting();
  });
  window.addEventListener('load',function(){
    normalizePortalBranding();
    installHorseSorting();
  });
})();
