// Minimal application event bus used by independent StableOS modules.
(function(){
  const target=new EventTarget();
  window.CCE=window.CCE||{};
  window.CCE.events={
    on(type,handler,options){target.addEventListener(type,handler,options);return ()=>target.removeEventListener(type,handler,options);},
    emit(type,detail){target.dispatchEvent(new CustomEvent(type,{detail}));}
  };
})();
