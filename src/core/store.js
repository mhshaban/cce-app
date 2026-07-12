// CCE StableOS — small observable application store.
// Modules publish loaded collections here without owning UI rendering.
(function(){
  window.CCE=window.CCE||{};
  const state=Object.create(null);
  window.CCE.store={
    get(name,fallback=null){return Object.prototype.hasOwnProperty.call(state,name)?state[name]:fallback;},
    set(name,value){state[name]=value;if(CCE.events)CCE.events.emit('store:changed',{name,value});return value;},
    setMany(values){Object.entries(values||{}).forEach(([name,value])=>{state[name]=value;});if(CCE.events)CCE.events.emit('store:changed',{names:Object.keys(values||{})});return values;},
    snapshot(){return {...state};}
  };
})();
