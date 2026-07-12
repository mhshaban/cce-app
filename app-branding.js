(function(){
  function normalizePortalBranding(){
    document.querySelectorAll('.header-brand img').forEach(function(img){
      img.src='icons/logo-transparent.png';
      img.alt='Country Club Equestrian';
      img.onerror=function(){this.onerror=null;this.src='icons/icon-192.png';};
    });
  }
  document.addEventListener('DOMContentLoaded',normalizePortalBranding);
  window.addEventListener('load',normalizePortalBranding);
})();
