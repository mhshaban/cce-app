// Unified PWA entry: guest booking and authenticated members share one application.
  (function(){
    window.CCE_PORTAL_MODE='full';
    try{ localStorage.removeItem('cce_last_portal'); }catch(_e){}
    var link=document.getElementById('cceManifestLink');
    if(link) link.setAttribute('href','manifest.json?v=stableos-20260712-410');
  })();
