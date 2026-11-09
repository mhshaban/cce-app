// Bran stock per owner account (dashboard page and owner portal card).
// cce_feed_summary(month) returns, per account, the monthly share (the
// stable's bags split by Available horses), bags issued, bags taken from the
// owners' own stock and the running own balance. Managers record entries in
// feed_ledger; owners only read their own account through the RPC.
(function(){
  window.CCE=window.CCE||{};
  const STRINGS={
    en:{title:'Bran Stock',sub:n=>`The stable buys ${n} bags a month, shared by Available horses. Bags issued above an account's share come from the bags its owners bought.`,
      ownerTitle:'Bran · Your Bags',ownerSub:'Your monthly share from the stable, the bags you received, and the bags you bought that are kept in the store.',
      thisMonth:'This month',prev:'Previous month',next:'Next month',prevGlyph:'‹',nextGlyph:'›',
      horses:'Horses',share:'Monthly share',shareAuto:'auto by horses',shareFixed:'fixed',issued:'Issued',shareLeft:'Share left',
      fromOwn:'From own stock',purchased:'Bought by owner',opening:'Own stock at start',closing:'Own stock now',
      negative:'Issued more than the share and the owners\' own stock: the difference is on the stable.',
      record:'Record',date:'Date',qty:'Bags',kind:'Type',note:'Note',kinds:{issue:'Issued',purchase:'Owner purchase',adjust:'Adjustment'},
      entries:'Entries this month',none:'No entries this month.',del:'Delete',confirmDel:'Delete this entry?',
      edit:'Edit account',addAccount:'+ Account',name:'Account name',owners:'Owners (exact owner names, comma-separated)',
      fixed:'Fixed monthly share (empty = auto by horses)',active:'Active',save:'Save',cancel:'Cancel',stableBags:'Stable bags per month',
      noAccounts:'No Bran accounts yet.',noOwnerAccount:'Your horses are not on a Bran account.',loading:'Loading Bran stock…',unable:'Unable to load Bran stock.',
      bags:'bags',qtyInvalid:'Enter a number of bags.',locale:'en-GB'},
    ar:{title:'مخزون البران',sub:n=>`الإسطبل يشتري ${n} كيس شهرياً، تتوزع على الخيول الموجودة. اللي ينصرف فوق حصة الحساب ينخصم من أكياس اشتراها ملاكه.`,
      ownerTitle:'البران · أكياسك',ownerSub:'حصتك الشهرية من الإسطبل، والأكياس اللي استلمتها، والأكياس اللي اشتريتها ومحفوظة في المخزن.',
      thisMonth:'هذا الشهر',prev:'الشهر السابق',next:'الشهر التالي',prevGlyph:'›',nextGlyph:'‹',
      horses:'الخيول',share:'الحصة الشهرية',shareAuto:'تلقائية حسب الخيول',shareFixed:'ثابتة',issued:'المنصرف',shareLeft:'الباقي من الحصة',
      fromOwn:'من المخزون الخاص',purchased:'مشتريات المالك',opening:'المخزون الخاص أول الشهر',closing:'المخزون الخاص الحين',
      negative:'المنصرف أكثر من الحصة والمخزون الخاص: الفرق على حساب الإسطبل.',
      record:'تسجيل',date:'التاريخ',qty:'الأكياس',kind:'النوع',note:'ملاحظة',kinds:{issue:'صرف',purchase:'شراء المالك',adjust:'تعديل'},
      entries:'حركات هذا الشهر',none:'ما في حركات هذا الشهر.',del:'حذف',confirmDel:'حذف هذه الحركة؟',
      edit:'تعديل الحساب',addAccount:'+ حساب',name:'اسم الحساب',owners:'الملاك (أسماء الملاك كما في بطاقات الخيول، بينها فاصلة)',
      fixed:'حصة شهرية ثابتة (فاضي = تلقائي حسب الخيول)',active:'فعّال',save:'حفظ',cancel:'إلغاء',stableBags:'أكياس الإسطبل شهرياً',
      noAccounts:'ما في حسابات بران للحين.',noOwnerAccount:'خيولك مو مسجلة في حساب بران.',loading:'جارٍ تحميل مخزون البران…',unable:'تعذّر تحميل مخزون البران.',
      bags:'كيس',qtyInvalid:'اكتب عدد الأكياس.',locale:'ar-u-nu-latn'}
  };
  const lang=()=>(typeof currentLang!=='undefined'&&currentLang==='ar')?'ar':'en';
  const T=()=>STRINGS[lang()];
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{const n=Number(v)||0;return Number.isInteger(n)?String(n):n.toFixed(1);};
  const canManage=()=>typeof window.canUser==='function'&&window.canUser('feed.manage');
  const todayISO=()=>typeof bahrainDateISO==='function'?bahrainDateISO():new Date().toISOString().slice(0,10);
  let data=null, month=null, target=null, ownerView=false;

  function monthLabel(){
    if(!month)return '';
    try{return new Intl.DateTimeFormat(T().locale,{month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00'));}catch(_e){return month;}
  }
  function shiftMonth(m,delta){const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+delta);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}

  function kpi(label,value,cls=''){return `<div class="bs-kpi ${cls}"><span>${label}</span><b>${value}</b></div>`;}

  function accountHtml(a,manage){
    const t=T();
    const closing=Number(a.closing_balance)||0;
    const horses=(a.horses||[]).map(x=>h(x.horse_name)).join(' · ');
    const kpis=[
      kpi(t.share,`${num(a.allocation)} <small>${a.allocation_fixed?t.shareFixed:t.shareAuto}</small>`),
      kpi(t.issued,num(a.issued)),
      kpi(t.shareLeft,num(a.allocation_left)),
      kpi(t.fromOwn,num(a.from_own),Number(a.from_own)>0?'bs-warn':''),
      kpi(t.purchased,num(a.purchased)),
      kpi(t.opening,num(a.opening_balance)),
      kpi(t.closing,num(closing),closing<0?'bs-bad':'bs-good')
    ].join('');
    const form=manage?`<div class="bs-form"><input type="date" id="bs-date-${a.id}" value="${h(todayISO())}" dir="ltr"><input type="number" id="bs-qty-${a.id}" value="1" step="0.5" min="0" dir="ltr" aria-label="${t.qty}"><select id="bs-kind-${a.id}">${Object.entries(t.kinds).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><input type="text" id="bs-note-${a.id}" placeholder="${t.note}"><button class="btn btn-amber" onclick="CCE.bran.record(${Number(a.id)})">${t.record}</button></div>`:'';
    const rows=(a.entries||[]).map(e=>`<tr><td dir="ltr">${h(e.date)}</td><td>${h(t.kinds[e.kind]||e.kind)}</td><td>${num(e.qty)}</td><td>${h(e.note||'')}</td>${manage?`<td><button class="bs-del" onclick="CCE.bran.remove(${Number(e.id)})">${t.del}</button></td>`:''}</tr>`).join('');
    const table=rows?`<div class="tbl-wrap"><table class="bs-table"><thead><tr><th>${t.date}</th><th>${t.kind}</th><th>${t.qty}</th><th>${t.note}</th>${manage?'<th></th>':''}</tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="bs-note">${t.none}</div>`;
    return `<div class="bs-account"><div class="bs-acc-h"><div><h3>${h(a.name)}</h3><small>${t.horses} (${a.horse_count}): ${horses||'—'}</small></div>${manage?`<button class="pd-add" onclick="CCE.bran.editAccount(${Number(a.id)})">${t.edit}</button>`:''}</div>
      <div class="bs-kpis">${kpis}</div>${closing<0?`<div class="bs-alert">${t.negative}</div>`:''}${form}<h4>${t.entries}</h4>${table}</div>`;
  }

  function render(){
    if(!target||!data)return;
    const t=T(), l=lang(), manage=!ownerView&&canManage();
    const nav=`<div class="pd-day"><button onclick="CCE.bran.go(-1)" aria-label="${t.prev}">${t.prevGlyph}</button><button onclick="CCE.bran.go(1)" aria-label="${t.next}">${t.nextGlyph}</button><button class="pd-today" onclick="CCE.bran.go(0)">${t.thisMonth}</button><span>${monthLabel()}</span></div>`;
    const tools=manage?`<div class="bs-tools"><button class="pd-add" onclick="CCE.bran.editStable()">${t.stableBags}: ${num(data.stable_monthly_bags)}</button><button class="pd-add" onclick="CCE.bran.editAccount(0)">${t.addAccount}</button></div>`:'';
    const accounts=data.accounts||[];
    const body=accounts.length?accounts.map(a=>accountHtml(a,manage)).join(''):`<div class="bs-note">${ownerView?t.noOwnerAccount:t.noAccounts}</div>`;
    target.innerHTML=`<div class="bs-board" dir="${l==='ar'?'rtl':'ltr'}" lang="${l}"><div class="pd-head"><h2>${ownerView?t.ownerTitle:t.title}</h2><p>${ownerView?t.ownerSub:t.sub(num(data.stable_monthly_bags))}</p>${nav}${tools}</div>${body}</div>`;
    if(ownerView&&!accounts.length)target.style.display='none';else target.style.display='';
  }

  async function open(el,opts={}){
    target=el; ownerView=!!opts.ownerView;
    if('month' in opts)month=opts.month||null;
    if(!target)return;
    target.innerHTML=`<div class="bs-note">${T().loading}</div>`;
    try{
      data=await sbRpc('cce_feed_summary',month?{p_month:month+'-01'}:{});
      month=(data&&data.month)||month;
      render();
    }catch(error){
      if(ownerView){target.style.display='none';return;}
      target.innerHTML=`<div class="permission-denied"><strong>${T().unable}</strong><span>${h(typeof userSafeError==='function'?userSafeError(error):(error&&error.message)||error)}</span></div>`;
    }
  }
  function go(delta){month=delta&&month?shiftMonth(month,delta):null;return open(target,{ownerView});}

  async function record(accountId){
    const t=T();
    const qty=Number(document.getElementById('bs-qty-'+accountId).value);
    const kind=document.getElementById('bs-kind-'+accountId).value;
    if(!qty||(kind!=='adjust'&&qty<0)){alert(t.qtyInvalid);return;}
    try{
      await sbPost('feed_ledger',{account_id:accountId,entry_date:document.getElementById('bs-date-'+accountId).value||todayISO(),kind,qty,note:document.getElementById('bs-note-'+accountId).value.trim()||null});
      await open(target,{ownerView});
    }catch(e){showError(t.title,e);}
  }
  async function remove(id){
    if(!confirm(T().confirmDel))return;
    try{await sbDel('feed_ledger',id);await open(target,{ownerView});}catch(e){showError(T().title,e);}
  }

  async function editAccount(id){
    if(!canManage())return;
    const t=T();
    let a={id:0,name:'',owners:[],monthly_allocation:null,active:true};
    if(id){try{const rows=await sbGet('feed_accounts',`id=eq.${Number(id)}&select=*`);if(rows&&rows[0])a=rows[0];}catch(e){showError(t.title,e);return;}}
    const ownerNames=[...new Set((typeof horses!=='undefined'&&Array.isArray(horses)?horses:[]).filter(x=>x.status==='Available'&&x.owner).map(x=>String(x.owner).trim()))].sort();
    openModal(id?t.edit:t.addAccount,`<div class="form-grid">
      <div class="form-group" style="grid-column:1/-1"><label>${t.name}</label><input type="text" id="bs-acc-name" value="${h(a.name)}"></div>
      <div class="form-group" style="grid-column:1/-1"><label>${t.owners}</label><input type="text" id="bs-acc-owners" list="bs-owner-list" value="${h((a.owners||[]).join(', '))}"><datalist id="bs-owner-list">${ownerNames.map(o=>`<option value="${h(o)}">`).join('')}</datalist></div>
      <div class="form-group"><label>${t.fixed}</label><input type="number" step="0.5" min="0" id="bs-acc-alloc" value="${a.monthly_allocation==null?'':h(a.monthly_allocation)}"></div>
      <div class="form-group"><label><input type="checkbox" id="bs-acc-active" ${a.active!==false?'checked':''}> ${t.active}</label></div>
    </div><div class="btn-row"><button class="btn btn-amber" onclick="CCE.bran.saveAccount(${Number(a.id)||0})">${t.save}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">${t.cancel}</button></div>`);
  }
  async function saveAccount(id){
    const name=document.getElementById('bs-acc-name').value.trim();
    if(!name){alert(T().name);return;}
    const alloc=document.getElementById('bs-acc-alloc').value;
    const payload={name,item:'Bran',owners:document.getElementById('bs-acc-owners').value.split(',').map(x=>x.trim()).filter(Boolean),
      monthly_allocation:alloc===''?null:Number(alloc),active:document.getElementById('bs-acc-active').checked};
    try{
      if(id)await sbPatch('feed_accounts',id,payload);else await sbPost('feed_accounts',payload);
      closeModal();await open(target,{ownerView});
    }catch(e){showError(T().title,e);}
  }
  async function editStable(){
    const t=T();
    const value=prompt(t.stableBags,num(data&&data.stable_monthly_bags));
    if(value===null)return;
    const bags=Number(value);
    if(!(bags>=0)){alert(t.qtyInvalid);return;}
    try{
      const rows=await sbGet('feed_settings','item=eq.Bran&select=id');
      if(rows&&rows[0])await sbPatch('feed_settings',rows[0].id,{stable_monthly_bags:bags});
      else await sbPost('feed_settings',{item:'Bran',stable_monthly_bags:bags});
      await open(target,{ownerView});
    }catch(e){showError(t.title,e);}
  }

  CCE.bran={open,render,go,record,remove,editAccount,saveAccount,editStable};
})();
