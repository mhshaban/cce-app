(function(){
  function normalizePortalBranding(){
    document.querySelectorAll('.header-brand img').forEach(function(img){
      img.src='icons/logo-transparent.png';
      img.alt='Country Club Equestrian';
      img.onerror=function(){this.onerror=null;this.src='icons/icon-192.png';};
    });
  }

  function installHorseSorting(){
    if(typeof renderHorses!=='function'||renderHorses.__cceStableSortInstalled)return;

    const originalRenderHorses=renderHorses;
    const statusOrder={Available:0,Out:1,Sold:2,Dead:3};
    const stableNumber=value=>{
      const raw=String(value??'').trim();
      if(!raw)return null;
     