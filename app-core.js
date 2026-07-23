// CCE StableOS v4 — legacy-compatible application module.
// Infrastructure is loaded from src/core and src/services before this file.
// ══════════════════════════════════════════════════════════
// LANGUAGE / DIRECTION SUPPORT — English LTR default, Arabic RTL supported
// ══════════════════════════════════════════════════════════
const CCE_DEFAULT_LANG='en';
const savedLanguage=localStorage.getItem('cce_lang');
const browserLanguage=(navigator.language||'').toLowerCase().startsWith('ar')?'ar':CCE_DEFAULT_LANG;
let currentLang=(savedLanguage==='ar'||savedLanguage==='en')?savedLanguage:browserLanguage;
// App interface mode via URL: ?app=book | stable | instructor (default full)
const APP_MODE=(window.CCE_PORTAL_MODE||new URLSearchParams(location.search).get('app')||'full').toLowerCase();
const CCE_I18N={
  en:{
    backHome:'← Home',refresh:'🔄 Refresh',backup:'💾 Backup',logout:'🔓 Logout',alerts:'🔔 Alerts',
    page_home:'Bahrain · Country Club Equestrian',page_booking:'Book a Horse Ride',page_training:'Training Packages',page_livery:'Livery Booking',page_owner:'Owner Portal',page_instructor:'Instructor Portal',page_admin:'Member Login',page_dashboard:'Dashboard',
    dash_dashboard:'Dashboard',dash_income:'Income',dash_expenses:'Expenses',dash_overdue:'Overdue',dash_horses:'Horses',dash_breeding:'Breeding',dash_bookings:'Bookings',dash_notifications:'Notifications',dash_schedule:'Schedule',dash_instructors:'Instructors',
    homeTrainingTitle:'Horse Riding Training',homeTrainingSub:'Private and group sessions for beginners and advanced riders',registerNow:'🎯 Register Now',
    homeRidesTitle:'Hack Rides',homeRidesSub:'Enjoyable rides on our beautiful horses',bookNow:'🐴 Book Now',
    ownerPortal:'Owner Portal',ownerPortalSub:'Horse owners access',instructorPortal:'Instructor Portal',instructorPortalSub:'Instructor daily access',adminDashboard:'Admin Dashboard',adminDashboardSub:'Staff management',
    bookingHeroTitle:'Book a Horse Ride',trainingHeroTitle:'Training Packages',liveryHeroTitle:'Book Livery',sendBooking:'🐴 Send Booking Request',sendTraining:'🎯 Send Registration Request',
    publicBrandSub:'Equestrian Club · Bahrain',
    publicMemberLogin:'🔐 Member Login',publicMemberLoginShort:'Member Login',
    publicHeroBadge:'🐎 Equestrian experiences in Bahrain',
    publicHeroTitle:'Book your equestrian experience<span>Training, riding tours, and horse livery in Bahrain</span>',
    publicHeroDescription:'Choose horse-riding lessons, recreational tours, or complete livery services and send your request directly without creating an account.',
    publicBrowseServices:'Browse guest services',
    publicGuestServicesKicker:'Guest Services',publicChooseBooking:'Choose your booking type',
    publicChooseBookingDescription:'Each service has a dedicated form to make it easy to select a package, date, and send your request to the club.',
    publicStartsFrom:'Starts from',publicDetailsPrices:'Details & prices',
    publicTrainingTitle:'Horse Riding Lessons',publicTrainingTag:'Private sessions and monthly packages',
    publicTrainingDescription:'Private lessons and monthly packages for beginners and advanced riders, with a choice of level and suitable time.',
    publicTrainingPoint1:'Lessons for beginners and advanced riders',publicTrainingPoint2:'Packages from 1 to 12 sessions',publicTrainingPoint3:'Morning and evening times',
    publicBookTraining:'Book lessons',publicTrainingPrice1:'Single session',publicTrainingPrice2:'Starter Pack · 4 sessions',publicTrainingPrice3:'Advanced Pack · 8 sessions',publicTrainingPrice4:'Pro Pack · 12 sessions',
    publicToursTitle:'Horse Riding Tours',publicToursTag:'Recreational and family experiences',
    publicToursDescription:'Recreational riding experiences for individuals and families, with photography options and different durations.',
    publicToursPoint1:'Half-hour or one-hour rides',publicToursPoint2:'Photo session with a ride',publicToursPoint3:'Family package for four rides',
    publicBookTour:'Book a tour',publicTourPrice1:'Half Hour Ride',publicTourPrice2:'1 Hour Hack Ride',publicTourPrice3:'Photo Session + Ride',publicTourPrice4:'Family Package · 4 rides',
    publicLiveryTitle:'Horse Livery Services',publicLiveryTag:'Monthly boarding and daily care',
    publicLiveryDescription:'Monthly boarding and daily horse care with full or air-conditioned livery and optional care services.',
    publicLiveryPoint1:'Full Livery or AC Livery',publicLiveryPoint2:'Daily feeding, cleaning, and care',publicLiveryPoint3:'Optional shower and training services',
    publicRequestLivery:'Request livery',publicLiveryPrice1:'Full Livery · monthly',publicLiveryPrice2:'AC Livery · monthly',publicLiveryPrice3:'Shower / Cleaning',publicLiveryPrice4:'VIP Shower',
    publicWhyChoose:'Why choose Country Club Equestrian?',
    publicBenefit1Title:'Safety first',publicBenefit1Text:'An organized experience suited to the rider’s level',
    publicBenefit2Title:'Specialized training',publicBenefit2Text:'Options for beginners and advanced riders',
    publicBenefit3Title:'Selected horses',publicBenefit3Text:'A suitable horse is selected for each service',
    publicBenefit4Title:'Direct booking',publicBenefit4Text:'Send a guest request without signing in',
    publicContactKicker:'Contact us',publicContactTitle:'Country Club Equestrian',
    publicLocationValue:'Janusan · Kingdom of Bahrain',publicWhatsApp:'WhatsApp',publicInstagram:'Instagram',publicOpenMap:'Open location',publicLocationShort:'Google Maps',
    publicFooter:'Country Club Equestrian · Bahrain'
  },
  ar:{
    backHome:'← الرئيسية',refresh:'🔄 تحديث',backup:'💾 نسخة احتياطية',logout:'🔓 تسجيل الخروج',alerts:'🔔 التنبيهات',
    page_home:'البحرين · نادي الريف للفروسية',page_booking:'حجز جولة ركوب الخيل',page_training:'باقات التدريب',page_livery:'حجز إيواء الخيل',page_owner:'بوابة المالك',page_instructor:'بوابة المدرب',page_admin:'دخول الأعضاء',page_dashboard:'لوحة التحكم',
    dash_dashboard:'لوحة التحكم',dash_income:'الإيرادات',dash_expenses:'المصروفات',dash_overdue:'المتأخرات',dash_horses:'الخيل',dash_breeding:'التناسل',dash_bookings:'الحجوزات',dash_notifications:'التنبيهات',dash_schedule:'الجدول',dash_instructors:'المدربون',
    homeTrainingTitle:'تدريب ركوب الخيل',homeTrainingSub:'للمبتدئين والمحترفين — حصص فردية وجماعية',registerNow:'🎯 التسجيل الآن',
    homeRidesTitle:'جولات ركوب الخيل',homeRidesSub:'جولات ممتعة على أجمل الخيول',bookNow:'🐴 احجز الآن',
    ownerPortal:'بوابة الملاك',ownerPortalSub:'دخول ملاك الخيول',instructorPortal:'بوابة المدربين',instructorPortalSub:'دخول المدربين',adminDashboard:'لوحة الإدارة',adminDashboardSub:'إدارة النادي',
    bookingHeroTitle:'حجز جولة ركوب الخيل',trainingHeroTitle:'باقات التدريب',liveryHeroTitle:'حجز إيواء الخيل',sendBooking:'🐴 إرسال طلب الحجز',sendTraining:'🎯 إرسال طلب التسجيل',
    publicBrandSub:'نادي الريف للفروسية',
    publicMemberLogin:'🔐 دخول الأعضاء',publicMemberLoginShort:'دخول الأعضاء',
    publicHeroBadge:'🐎 تجارب فروسية في البحرين',
    publicHeroTitle:'احجز تجربتك مع نادي الريف للفروسية<span>تدريب، جولات، وإيواء خيل في البحرين</span>',
    publicHeroDescription:'تدريب ركوب الخيل، جولات ترفيهية، وخدمات إيواء متكاملة — اختر الخدمة المناسبة وأرسل طلبك مباشرة دون الحاجة إلى إنشاء حساب.',
    publicBrowseServices:'استعرض خدمات الزوار',
    publicGuestServicesKicker:'خدمات الزوار',publicChooseBooking:'اختر نوع الحجز',
    publicChooseBookingDescription:'كل خدمة لها نموذج مخصص ليسهل اختيار الباقة والموعد وإرسال الطلب إلى النادي.',
    publicStartsFrom:'يبدأ من',publicDetailsPrices:'التفاصيل والأسعار',
    publicTrainingTitle:'تدريب ركوب الخيل',publicTrainingTag:'حصص فردية وباقات شهرية',
    publicTrainingDescription:'حصص تدريب فردية وباقات شهرية للمبتدئين والمتقدمين، مع اختيار المستوى والوقت المناسب.',
    publicTrainingPoint1:'حصص للمبتدئين والمتقدمين',publicTrainingPoint2:'باقات من حصة واحدة حتى 12 حصة',publicTrainingPoint3:'مواعيد صباحية ومسائية',
    publicBookTraining:'احجز تدريبًا',publicTrainingPrice1:'حصة واحدة',publicTrainingPrice2:'باقة البداية · 4 حصص',publicTrainingPrice3:'الباقة المتقدمة · 8 حصص',publicTrainingPrice4:'الباقة الاحترافية · 12 حصة',
    publicToursTitle:'جولات ركوب الخيل',publicToursTag:'جولات ترفيهية وتجارب عائلية',
    publicToursDescription:'جولات وتجارب ركوب ترفيهية للأفراد والعائلات، مع خيارات للتصوير ومدد مختلفة.',
    publicToursPoint1:'جولات نصف ساعة أو ساعة',publicToursPoint2:'جلسة تصوير مع الركوب',publicToursPoint3:'باقة عائلية لأربع جولات',
    publicBookTour:'احجز جولة',publicTourPrice1:'جولة نصف ساعة',publicTourPrice2:'جولة لمدة ساعة',publicTourPrice3:'جلسة تصوير مع ركوب',publicTourPrice4:'باقة عائلية · 4 جولات',
    publicLiveryTitle:'خدمات إيواء الخيل',publicLiveryTag:'إيواء شهري ورعاية يومية',
    publicLiveryDescription:'إيواء شهري ورعاية يومية للخيل مع خيارات الإسطبل الكامل أو المكيف وخدمات عناية إضافية.',
    publicLiveryPoint1:'إيواء كامل أو إيواء مكيف',publicLiveryPoint2:'تغذية وتنظيف وعناية يومية',publicLiveryPoint3:'خدمات استحمام وتدريب إضافية',
    publicRequestLivery:'اطلب خدمة إيواء',publicLiveryPrice1:'إيواء كامل · شهريًا',publicLiveryPrice2:'إيواء مكيف · شهريًا',publicLiveryPrice3:'استحمام أو تنظيف',publicLiveryPrice4:'استحمام VIP',
    publicWhyChoose:'لماذا تختار نادي الريف؟',
    publicBenefit1Title:'السلامة أولًا',publicBenefit1Text:'تجربة منظمة تناسب مستوى الراكب',
    publicBenefit2Title:'تدريب متخصص',publicBenefit2Text:'خيارات تدريب للمبتدئ والمتقدم',
    publicBenefit3Title:'خيول مختارة',publicBenefit3Text:'اختيار الخيل المناسب حسب الخدمة',
    publicBenefit4Title:'حجز مباشر',publicBenefit4Text:'أرسل طلبك كزائر دون تسجيل دخول',
    publicContactKicker:'تواصل معنا',publicContactTitle:'نادي الريف للفروسية',
    publicLocationValue:'جنوسان · مملكة البحرين',publicWhatsApp:'واتساب',publicInstagram:'إنستغرام',publicOpenMap:'فتح الموقع',publicLocationShort:'خرائط Google',
    publicFooter:'نادي الريف للفروسية · البحرين'
  }
}
function t(key){return (CCE_I18N[currentLang]&&CCE_I18N[currentLang][key]) || CCE_I18N.en[key] || key;}
function togglePublicLanguage(){ applyLanguage(currentLang==='en'?'ar':'en'); }
function applyLanguage(lang){
  currentLang = (lang==='ar') ? 'ar' : 'en';
  const root=document.documentElement;
  root.lang=currentLang;
  root.dir=currentLang==='ar'?'rtl':'ltr';
  if(document.body){
    document.body.dir=root.dir;
    document.body.classList.toggle('rtl-mode',currentLang==='ar');
    document.body.classList.toggle('ltr-mode',currentLang==='en');
  }
  localStorage.setItem('cce_lang',currentLang);
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder);});
  const publicLangBtn=document.getElementById('publicLangBtn');
  if(publicLangBtn){
    publicLangBtn.textContent=currentLang==='ar'?'English':'العربية';
    publicLangBtn.setAttribute('aria-label',currentLang==='ar'?'Switch to English':'التبديل إلى العربية');
  }
  updateHeaderLanguage();
  tagArabicLeafText();
}
function updateHeaderLanguage(){
  const headerSub=document.getElementById('headerSub');
  if(headerSub && typeof currentPage!=='undefined') headerSub.textContent=t('page_'+currentPage);
}
function tagArabicLeafText(){
  const arabic=/[\u0600-\u06FF]/;
  document.querySelectorAll('body *:not(script):not(style):not(svg)').forEach(el=>{
    const txt=(el.textContent||'').trim();
    if(!txt || el.children.length>0) return;
    if(el.hasAttribute('data-i18n')){
      el.setAttribute('lang',currentLang);
      el.setAttribute('dir',currentLang==='ar'?'rtl':'ltr');
      el.removeAttribute('data-auto-lang');
      return;
    }
    if(arabic.test(txt)){
      el.setAttribute('lang','ar');
      el.setAttribute('dir','auto');
      el.setAttribute('data-auto-lang','1');
    }else if(el.getAttribute('data-auto-lang')==='1'){
      el.removeAttribute('lang');
      el.removeAttribute('data-auto-lang');
      el.setAttribute('dir','auto');
    }else if(!el.hasAttribute('dir')){
      el.setAttribute('dir','auto');
    }
  });
}
function validBahrainPhone(v){return /^\d{8}$/.test(String(v||'').replace(/\s|-/g,''));}
function openWhatsAppProof(type){
  if(!CLUB_WHATSAPP || CLUB_WHATSAPP.includes('X')){
    alert('يرجى وضع رقم واتساب النادي في المتغير CLUB_WHATSAPP داخل ملف الموقع قبل النشر.');
    return;
  }
  const name=(document.getElementById('b-name')?.value||document.getElementById('t-name')?.value||document.getElementById('lv-name')?.value||'').trim();
  const phone=(document.getElementById('b-phone')?.value||document.getElementById('t-phone')?.value||document.getElementById('lv-phone')?.value||'').trim();
  const service=(document.getElementById('b-service')?.value||selectedPkg||selectedLiveryType||type||'').trim();
  const msg='مرحباً، أرفق لكم إثبات الدفع. الاسم: '+(name||'—')+'، الهاتف: '+(phone||'—')+'، الخدمة: '+(service||'—')+'، الآيبان: '+CLUB_IBAN;
  window.open('https://wa.me/'+CLUB_WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener');
}

// ══════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════
let currentPage = 'home';

function navigate(page) {
  if(page==='dashboard' && !isAdminAuthed()) page='admin';
  if(APP_MODE==='book'&&['owner','instructor','admin','dashboard'].includes(page))return;
  if(APP_MODE==='stable'&&page!=='owner')return;
  if(APP_MODE==='instructor'&&page!=='instructor')return;
  document.querySelectorAll('.app-page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  currentPage = page;
  document.body.className=document.body.className.replace(/\bpage-[^\s]+/g,'').trim();
  document.body.classList.add('page-'+page);

  // Header controls
  const backBtn       = document.getElementById('backBtn');
  const syncStatus    = document.getElementById('syncStatus');
  const refreshBtn    = document.getElementById('refreshBtn');
  const backupBtn     = document.getElementById('backupBtn');
  const logoutAdmin   = document.getElementById('logoutAdminBtn');
  const logoutOwner   = document.getElementById('logoutOwnerBtn');
  const overdueBadge  = document.getElementById('overdueBadge');

  // Hide all first
  [backBtn,syncStatus,refreshBtn,backupBtn,logoutAdmin,logoutOwner,overdueBadge,document.getElementById('alertBell')].forEach(el=>el&&el.classList.add('hidden'));

  document.getElementById('headerSub').textContent = t('page_'+page)||page;

  // Hide global header on pages that have their own internal header (avoid duplicates)
  const globalHeader=document.getElementById('globalHeader');
  if(globalHeader) globalHeader.style.display=(page==='livery'||page==='home'||page==='booking'||page==='training')?'none':'';

  if(page==='home') return;
  if(page!=='home') backBtn.classList.remove('hidden');
  if(page==='instructor') {
    loadInstructorNames();
  }
  if(page==='dashboard') {
    syncStatus.classList.remove('hidden');
    refreshBtn.classList.remove('hidden');
    const roleCode=String(window.CCE_MEMBER?.role?.code||'').toLowerCase();
    if(roleCode==='super_admin') backupBtn.classList.remove('hidden');
    logoutAdmin.classList.remove('hidden');
    overdueBadge.classList.remove('hidden');
    document.getElementById('alertBell').classList.remove('hidden');
  }
  if(page==='owner' && (sessionStorage.getItem('owner_phone') || window.CCE_MEMBER)) {
    logoutOwner.classList.remove('hidden');
    document.getElementById('alertBell').classList.remove('hidden');
  }
  if(page==='instructor' && window.CCE_MEMBER) {
    document.getElementById('alertBell').classList.remove('hidden');
  }
  if(window.CCEHeaderSystem) window.CCEHeaderSystem.refresh();
}

function goHome() {
  navigate('home');
}

// ══════════════════════════════════════════════════════════
// ADMIN AUTH
// ══════════════════════════════════════════════════════════
async function doAdminLogin() {
  const email=(document.getElementById('adminEmail')?.value||'').trim();
  const pwd = document.getElementById('adminPwd').value;
  const err=document.getElementById('adminErr');
  err.style.display='none';
  try{
    if(email){
      const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SB_KEY},
        body:JSON.stringify({email,password:pwd})
      });
      if(!r.ok) throw new Error('Supabase Auth rejected the login');
      const data=await r.json();
      setSupabaseSession(data.access_token,data.expires_in);
      sessionStorage.setItem('cce_auth','true');
      sessionStorage.setItem('cce_auth_until',String(Date.now()+Math.min(ADMIN_SESSION_MS,(data.expires_in||3600)*1000)));
      document.getElementById('adminPwd').value='';
      navigate('dashboard');
      if(income.length===0) loadAll();
      return;
    }
    const ok = (await sha256Hex(pwd)) === ADMIN_PASS_SHA256;
    if(ok) {
      sessionStorage.setItem('cce_auth','true');
      sessionStorage.setItem('cce_auth_until',String(Date.now()+ADMIN_SESSION_MS));
      document.getElementById('adminPwd').value='';
      navigate('dashboard');
      if(income.length===0) loadAll();
    } else {
      throw new Error('Incorrect password');
    }
  }catch(e){
    err.textContent='❌ '+userSafeError(e);
    err.style.display='block';
    document.getElementById('adminPwd').value='';
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('cce_auth');
  sessionStorage.removeItem('cce_auth_until');
  setSupabaseSession('',0);
  navigate('home');
}

// ══════════════════════════════════════════════════════════
// DASHBOARD INTERNAL NAV
// ══════════════════════════════════════════════════════════
const DASH_GROUPS={
  dashboard:['dashboard'],
  finance:['income','expenses','overdue','receipts','reports'],
  operations:['bookings','schedule','instructors'],
  horses:['horses','health','breeding'],
  showoffice:['show-office','competitions','show-office-classes','show-office-entries'],
  management:['users','notifications','audit','tools']
};
function dashGroupForPage(id){
  for(const [group,pages] of Object.entries(DASH_GROUPS)) if(pages.includes(id)) return group;
  return 'dashboard';
}
function updateDashGroupedNav(id){
  const group=dashGroupForPage(id);
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.classList.toggle('active',b.id==='dash-group-'+group));
  document.querySelectorAll('#dashSubNav .nav-btn').forEach(b=>{
    const inGroup=b.dataset.dashGroup===group;
    b.classList.toggle('sub-hidden',!inGroup);
    b.classList.toggle('active',b.id==='nav-'+id);
  });
}
function showDashGroup(group){
  const first=(DASH_GROUPS[group]&&DASH_GROUPS[group][0])||'dashboard';
  showDashPage(first,document.getElementById('nav-'+first));
}
function showDashPage(id, btn) {
  document.querySelectorAll('#page-dashboard .section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('#dashSubNav .nav-btn').forEach(b=>b.classList.remove('active'));
  const el = document.getElementById('page-'+( id==='dashboard'?'main-dashboard':id ));
  if(el) el.classList.add('active');
  const nb=btn||document.getElementById('nav-'+id);if(nb)nb.classList.add('active');
  updateDashGroupedNav(id);
  if(id==='reports') renderAdvancedReports();
  if(id==='receipts') renderReceipts();
  if(id==='health') renderHorseHealth();
  if(id==='tools') renderToolsPanel();
  if(id==='show-office'&&typeof renderShowOfficeDashboard==='function') renderShowOfficeDashboard();
  if(id==='competitions'&&typeof renderCompetitions==='function') renderCompetitions();
  if(id==='show-office-classes'&&typeof renderShowOfficeClasses==='function') renderShowOfficeClasses();
  if(id==='show-office-entries'&&typeof renderShowOfficeEntries==='function') renderShowOfficeEntries();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>updateDashGroupedNav('dashboard'));
}else{
  updateDashGroupedNav('dashboard');
}


// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
let income=[],expenses=[],horses=[],breeding=[],schedule_data=[],instructors_data=[],booking_requests=[];
let horse_health_profiles=[],horse_health_events=[],horse_medical_records=[],horse_vaccinations=[],horse_care_tasks=[];
function bookingRequestForIncome(row){
  if(!row)return null;
  const direct=row.booking_request_id;
  const ref=direct||((String(row.notes||'').match(/Ref\s*#(\d+)/i)||[])[1]);
  return ref?(booking_requests||[]).find(item=>String(item.id)===String(ref))||null:null;
}
function isPublicBookingIncome(row){
  const notes=String(row&&row.notes||'');
  return !!(row&&row.booking_request_id)||['BOOKING REQUEST','TRAINING REQUEST','LIVERY REQUEST'].some(marker=>notes.includes(marker));
}
function pendingBookingRequests(){
  if((booking_requests||[]).length){
    return booking_requests.filter(item=>(item.status||'Requested')==='Requested');
  }
  return income.filter(row=>isPublicBookingIncome(row)&&!isPaidRow(row));
}
const BOOKING_STATUS_TRANSITIONS=Object.freeze({
  Requested:['Requested','Confirmed','Cancelled','Rejected'],
  Confirmed:['Confirmed','Requested','Scheduled','Completed','Cancelled'],
  Scheduled:['Scheduled','Confirmed','Completed','Cancelled'],
  Completed:['Completed','Requested'],
  Cancelled:['Cancelled','Requested'],
  Rejected:['Rejected','Requested']
});
function bookingStatusOptions(status){return BOOKING_STATUS_TRANSITIONS[status]||[status];}
function deriveHealthCollections(){
  const derived=(window.CCE&&CCE.health)?CCE.health.derive(horse_health_events):{medical:[],vaccinations:[],care:[]};
  horse_medical_records=derived.medical;
  horse_vaccinations=derived.vaccinations;
  horse_care_tasks=derived.care;
  if(window.CCE&&CCE.store)CCE.store.setMany({horses,horseHealthProfiles:horse_health_profiles,horseHealthEvents:horse_health_events});
}
const CCE_CATEGORIES=['Hack','Lesson','Livery','Breeding','Shuwar','Salary','Wood Shavings','Hay','Maintenance','Farrier','Medicant','Trash Container','Leading','Rent','Others'];
let incPage=1,expPage=1,bookPage=1;
const PER=30;
const BD=v=>(parseFloat(v)||0).toFixed(3)+' BD';

// Accounting helpers — keep dashboard/backup/charts/overdue consistent
const moneyNum=v=>parseFloat(v)||0;
const normalizeActivityCategory=v=>{const x=(v||'').trim();return (!x||x==='Other'||x==='Others')?'Others':x;};
const calcRemaining=r=>Math.max(0, moneyNum(r.amount_bd)-moneyNum(r.paid_bd));
const rowIsFullyPaid=r=>{
  const total=moneyNum(r&&r.amount_bd);
  const paid=moneyNum(r&&r.paid_bd);
  return total>0 && paid+0.0004>=total;
};
// Treat legacy records as paid when Paid BD already equals Amount BD, even if old status still says Pending.
const isPaidRow=r=>String((r&&r.status)||'Pending').trim().toLowerCase()==='paid'||rowIsFullyPaid(r);
const isPendingRow=r=>!isPaidRow(r);
function normalizeLoadedPaymentStatuses(rows){
  (rows||[]).forEach(r=>{
    if(rowIsFullyPaid(r)) r.status='Paid';
    else if(!String(r.status||'').trim()) r.status='Pending';
  });
}
const hasRemaining=r=>calcRemaining(r)>0.0004;
const rowMonthKey=r=>String((r&&r.date)||'').slice(0,7);
const todayDateOnly=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const dateOnly=s=>{if(!s)return null;const d=new Date(String(s).slice(0,10)+'T00:00:00');return isNaN(d)?null:d;};
const isPastDueDate=s=>{const d=dateOnly(s);return !!d && d<todayDateOnly();};
const isOverdueRow=r=>isPendingRow(r)&&hasRemaining(r)&&((!!r.due_date&&isPastDueDate(r.due_date))||(r&&Object.prototype.hasOwnProperty.call(r,'supplier')&&expenseHasOverdueInstallment(r)));
// Cash accounting rule:
// Gross Collected = money received from customers (sum income.paid_bd).
// Stable Revenue = Gross Collected minus the immediate 50% instructor share
// for Lesson/Training income. Customer totals and remaining balances stay gross.
// Total Expenses = money actually paid/spent (sum expenses.paid_bd), regardless of status.
// Net Profit = Stable Revenue - Total Expenses.
// Pending/Unpaid are shown separately as remaining balances.
const rowStatus=r=>String((r&&r.status)||'Pending').trim().toLowerCase();
const calcPaidExpenseAmount=r=>moneyNum(r&&r.paid_bd);
const calcPaidExpenses=(rows)=>rows.reduce((s,r)=>s+calcPaidExpenseAmount(r),0);
const calcPendingAmount=(rows)=>rows.filter(isPendingRow).reduce((s,r)=>s+calcRemaining(r),0);
const isTrainingIncome=r=>['lesson','training'].includes(normalizeActivityCategory(r&&r.activity).toLowerCase());
const trainingSplitEnabled=r=>isTrainingIncome(r)&&(!r||r.training_split_enabled!==false);
const splitStableHalf=value=>Math.round((moneyNum(value)/2)*1000)/1000;
const incomeStableShare=r=>{
  if(r&&r.stable_share_bd!==undefined&&r.stable_share_bd!==null)return moneyNum(r.stable_share_bd);
  return trainingSplitEnabled(r)?splitStableHalf(r&&r.paid_bd):moneyNum(r&&r.paid_bd);
};
const incomeInstructorShare=r=>{
  if(r&&r.instructor_share_bd!==undefined&&r.instructor_share_bd!==null)return moneyNum(r.instructor_share_bd);
  return trainingSplitEnabled(r)?Math.max(0,moneyNum(r&&r.paid_bd)-splitStableHalf(r&&r.paid_bd)):0;
};
const incomeStableExpected=r=>trainingSplitEnabled(r)?splitStableHalf(r&&r.amount_bd):moneyNum(r&&r.amount_bd);
const calcGrossIncomeReceived=(rows)=>rows.reduce((s,r)=>s+moneyNum(r.paid_bd),0);
const calcIncomeReceived=(rows)=>rows.reduce((s,r)=>s+incomeStableShare(r),0);
const calcInstructorShares=(rows)=>rows.reduce((s,r)=>s+incomeInstructorShare(r),0);
const calcIncomePending=(rows)=>rows.filter(isPendingRow).reduce((s,r)=>s+calcRemaining(r),0);
const calcNetOverdue=(incRows,expRows)=>calcIncomePending(incRows)-calcPendingAmount(expRows);
function normalizePaidStatus(total,paid){return paid>=total&&total>0?'Paid':'Pending';}
function validatePaymentInput(total,paid,label){
  if(paid<0){alert(label+' paid amount cannot be negative');return false;}
  if(paid-total>0.0004){alert(label+' paid amount cannot be greater than total amount');return false;}
  return true;
}
function getDashPeriod(){
  return {year:document.getElementById('dashYearFilter')?.value||'', month:document.getElementById('dashMonthFilter')?.value||''};
}
function filterRowsByDashPeriod(rows){
  const p=getDashPeriod();
  return rows.filter(r=>{const m=rowMonthKey(r);if(!m)return false;return (!p.year||m.slice(0,4)===p.year)&&(!p.month||m.slice(5,7)===p.month);});
}
function populateDashPeriodFilters(){
  const ySel=document.getElementById('dashYearFilter'), mSel=document.getElementById('dashMonthFilter');
  if(!ySel||!mSel)return;
  const curY=ySel.value, curM=mSel.value;
  const keys=[...income,...expenses].map(rowMonthKey).filter(Boolean);
  const years=[...new Set(keys.map(k=>k.slice(0,4)))].sort();
  ySel.innerHTML='<option value="">All Years</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
  mSel.innerHTML='<option value="">All Months</option>'+MN.slice(1).map((name,i)=>`<option value="${String(i+1).padStart(2,'0')}">${name}</option>`).join('');
  if(years.includes(curY)) ySel.value=curY;
  if(curM) mSel.value=curM;
}
function resetDashPeriod(){
  const y=document.getElementById('dashYearFilter'),m=document.getElementById('dashMonthFilter');
  if(y)y.value=''; if(m)m.value=''; buildDash();
}

const fmt=d=>{if(!d)return '—';try{return new Date(d+'T00:00:00').toLocaleDateString('en-GB');}catch(e){return d;}};
const MN=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PC=['#1E7D4E','#C8923A','#2471A3','#8E44AD','#C0392B','#1A2744','#17A589','#E67E22'];

// Security / rendering helpers
function decodeLegacyEntities(v){
  let s=String(v??'');
  if(!s || s.indexOf('&')===-1) return s;
  // Some older records/alerts stored HTML entities literally (for example &#8212; or &#9989;).
  // Decode them first, then escape normally, so they display as real symbols without reducing safety.
  for(let i=0;i<2;i++){
    s=s.replace(/&amp;(#[0-9]+;|#x[0-9a-fA-F]+;|[a-zA-Z]+;)/g,'&$1');
  }
  s=s.replace(/&#(\d+);/g,(m,n)=>{const c=parseInt(n,10);return Number.isFinite(c)?String.fromCodePoint(c):m;});
  s=s.replace(/&#x([0-9a-fA-F]+);/g,(m,n)=>{const c=parseInt(n,16);return Number.isFinite(c)?String.fromCodePoint(c):m;});
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',middot:'·'};
  s=s.replace(/&([a-zA-Z]+);/g,(m,n)=>Object.prototype.hasOwnProperty.call(named,n)?named[n]:m);
  return s;
}
function cleanLegacyPlaceholder(v){
  const s=decodeLegacyEntities(v).trim();
  return (s==='—'||s==='-'||s==='–')?'':decodeLegacyEntities(v);
}
function esc(v){return decodeLegacyEntities(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function escAttr(v){return esc(cleanLegacyPlaceholder(v));}
function jsStr(v){return JSON.stringify(decodeLegacyEntities(v??''));}
function userSafeError(e){
  const raw=String((e&&e.message)||e||'');
  const lower=raw.toLowerCase();
  if(lower.includes('permission denied')||lower.includes('42501')||lower.includes('row-level security')||lower.includes('rls')) return 'لا توجد صلاحية لتنفيذ هذه العملية. يرجى التواصل مع الإدارة.';
  if(lower.includes('failed to fetch')||lower.includes('network')||lower.includes('timeout')) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مرة أخرى.';
  if(lower.includes('jwt')||lower.includes('auth')||lower.includes('session expired')) return 'انتهت الجلسة أو غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
  if(lower.includes('duplicate key')) return 'هذا السجل موجود مسبقًا.';
  if(lower.includes('violates not-null')||lower.includes('not null')) return 'بعض الحقول المطلوبة ناقصة. يرجى تعبئتها ثم المحاولة.';
  if(lower.includes('invalid input syntax')) return 'صيغة أحد الحقول غير صحيحة. يرجى مراجعة البيانات المدخلة.';
  if(lower.includes('cce_owner_get_horses')||lower.includes('cce_instructor_login')||lower.includes('cce_public_available_horses')||lower.includes('schema cache')||lower.includes('function')) return 'يحتاج Supabase إلى تحديث SQL الأمني المرفق، ثم إعادة المحاولة.';
  return raw.replace(/^\{.*\}$/,'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
}
function showError(prefix,e){alert((prefix||'Error')+': '+userSafeError(e));}
function isHash(v){return /^[a-f0-9]{64}$/i.test(String(v||''));}
async function hashSecret(v){v=String(v||'').trim();return v?await sha256Hex(v):null;}
async function verifySecret(stored,input){
  stored=String(stored||'').trim(); input=String(input||'').trim();
  if(!stored||!input)return false;
  return isHash(stored)?((await sha256Hex(input))===stored):(stored===input);
}
function scrubSecretRecord(obj){
  if(!obj||typeof obj!=='object')return obj;
  const out={...obj};
  ['owner_pwd','pin','password','pwd'].forEach(k=>{if(out[k])out[k]='[protected]';});
  return out;
}
function currentActor(){
  if(typeof currentInstructor!=='undefined'&&currentInstructor&&currentInstructor.name)return 'Instructor: '+currentInstructor.name;
  if(typeof currentOwner!=='undefined'&&currentOwner)return 'Owner: '+currentOwner;
  return isAdminAuthed()?'Admin':'Public';
}
function readAuditLog(){try{return JSON.parse(localStorage.getItem('cce_audit_log')||'[]');}catch(e){return [];}}
function saveAuditLog(list){localStorage.setItem('cce_audit_log',JSON.stringify(list.slice(0,500)));}
function queueAudit(action,tableName,recordId,before,after){
  const entry={ts:new Date().toISOString(),actor:currentActor(),action,table_name:tableName,record_id:String(recordId||''),before:scrubSecretRecord(before),after:scrubSecretRecord(after)};
  const list=readAuditLog();list.unshift(entry);saveAuditLog(list);
  renderAuditLog();
  // Best-effort server audit. Create a Supabase table named audit_logs to persist these centrally.
  fetch(`${SB_URL}/rest/v1/audit_logs`,{method:'POST',headers:HDR,body:JSON.stringify({ts:entry.ts,actor:entry.actor,action:entry.action,table_name:entry.table_name,record_id:entry.record_id,before_data:entry.before,after_data:entry.after})}).catch(()=>{});
}
function auditSummary(e){
  const after=e.after||{}, before=e.before||{};
  const name=after.customer_name||after.horse_name||after.supplier||after.name||after.mare_name||before.customer_name||before.horse_name||before.supplier||before.name||before.mare_name||'';
  return name?esc(name):'—';
}
function renderAuditLog(){
  const el=document.getElementById('auditTable'); if(!el)return;
  const q=(document.getElementById('auditSearch')?.value||'').toLowerCase();
  const ac=document.getElementById('auditActionFilter')?.value||'';
  let rows=readAuditLog();
  rows=rows.filter(e=>(!ac||e.action===ac)&&(!q||[e.actor,e.action,e.table_name,e.record_id,auditSummary(e)].join(' ').toLowerCase().includes(q)));
  if(!rows.length){el.innerHTML='<p style="color:var(--muted);padding:12px">No audit entries yet</p>';return;}
  el.innerHTML='<table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Table</th><th>Record</th><th>Summary</th></tr></thead><tbody>'+rows.slice(0,200).map(e=>`<tr><td>${new Date(e.ts).toLocaleString('en-GB')}</td><td>${esc(e.actor)}</td><td><span class="badge ${e.action==='delete'?'badge-red':e.action==='create'?'badge-green':'badge-amber'}">${esc(e.action)}</span></td><td>${esc(e.table_name)}</td><td>${esc(e.record_id)}</td><td>${auditSummary(e)}</td></tr>`).join('')+'</tbody></table>';
}
function clearAuditLog(){if(!confirm('Clear local audit log in this browser?'))return;localStorage.removeItem('cce_audit_log');renderAuditLog();}

// Booking conflict helpers
function timeToMin(t){const m=String(t||'').match(/^(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):0;}
function minToTime(n){n=((n%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function addMins(t,m){return minToTime(timeToMin(t)+m);}
function rangesOverlap(a1,a2,b1,b2){const A1=timeToMin(a1),A2=timeToMin(a2||addMins(a1,45)),B1=timeToMin(b1),B2=timeToMin(b2||addMins(b1,45));return A1<B2&&B1<A2;}
function normText(v){return String(v||'').trim().toLowerCase();}
function extractTrainingSlots(r){
  const slots=[]; const notes=String(r.notes||'');
  const re=/(\d{4}-\d{2}-\d{2})\s*@\s*(\d{2}:\d{2})/g; let m;
  while((m=re.exec(notes))!==null)slots.push({date:m[1],start:m[2]});
  return slots;
}
function conflictEvents(){
  const events=[];
  schedule_data.forEach(r=>events.push({source:'schedule',dbId:String(r.id),date:r.date,start:r.start_time||'00:00',end:r.end_time||'',horse:r.horse_name||'',instructor:r.instructor||'',customer:r.customer_name||'',activity:r.activity||'',status:r.status||'Scheduled'}));
  income.forEach(r=>{
    const slots=extractTrainingSlots(r);
    if(slots.length){slots.forEach((s,i)=>events.push({source:'income',dbId:String(r.id),slot:i,date:s.date,start:s.start,end:r.end_time||'',horse:r.horse_name||'',instructor:'',customer:r.customer_name||'',activity:r.activity||'',status:r.status||'Pending'}));}
    else if(r.date&&r.start_time){events.push({source:'income',dbId:String(r.id),date:r.date,start:r.start_time,end:r.end_time||'',horse:r.horse_name||'',instructor:'',customer:r.customer_name||'',activity:r.activity||'',status:r.status||'Pending'});}
  });
  return events.filter(e=>e.status!=='Cancelled');
}
function findBookingConflicts(c,exclude={}){
  const end=c.end||addMins(c.start,c.duration||45);
  return conflictEvents().filter(e=>{
    if(exclude.source&&e.source===exclude.source&&String(e.dbId)===String(exclude.dbId))return false;
    if(e.date!==c.date)return false;
    if(!rangesOverlap(c.start,end,e.start,e.end))return false;
    const horseClash=c.horse&&e.horse&&normText(c.horse)===normText(e.horse);
    const instrClash=c.instructor&&e.instructor&&normText(c.instructor)===normText(e.instructor);
    return horseClash||instrClash;
  });
}
function alertConflicts(conflicts){
  if(!conflicts.length)return false;
  alert('⚠️ Booking conflict detected:\n\n'+conflicts.slice(0,5).map(e=>`${e.date} ${e.start} — ${e.activity||'Session'}${e.horse?' / Horse: '+e.horse:''}${e.instructor?' / Instructor: '+e.instructor:''}${e.customer?' / '+e.customer:''}`).join('\n')+'\n\nPlease choose another time, horse, or instructor.');
  return true;
}


// ══════════════════════════════════════════════════════════
// DASHBOARD SCRIPT (from dashboard.html)
// ══════════════════════════════════════════════════════════

async function downloadBackup(){
  const btn=document.getElementById('backupBtn');
  btn.textContent='⏳ Preparing...';btn.disabled=true;
  try{
    // Fetch all data
    const moduleBackupProviders=Object.entries(window.CCE?.backupProviders||{});
    const [inc,exp,hor,bre,moduleBackups]=await Promise.all([
      sbGet('income','select=*&limit=5000'),
      sbGet('expenses','select=*&limit=5000'),
      sbGet('horses','select=*&limit=500'),
      sbGet('breeding','select=*&limit=500'),
      Promise.all(moduleBackupProviders.map(async([name,provider])=>{
        if(typeof provider!=='function')throw new Error(`Backup failed for module “${name}”: provider is not configured correctly.`);
        try{return await provider();}
        catch(error){throw new Error(`Backup failed for module “${name}”: ${error?.message||error}`);}
      })),
    ]);

    const wb=XLSX.utils.book_new();

    // Income sheet
    const incData=inc.map(r=>({
      ID:r.id, Date:r.date, 'Due Date':r.due_date,
      'Start Time':r.start_time, 'End Time':r.end_time,
      'Customer Name':r.customer_name, 'Horse Name':r.horse_name,
      Activity:r.activity, Qty:r.qty,
      'Amount BD':r.amount_bd, 'Paid BD':r.paid_bd,
      'Stable Share BD':incomeStableShare(r),
      'Instructor Share BD':incomeInstructorShare(r),
      'Training Split Enabled':!!r.training_split_enabled,
      Instructor:instructorNameById(r.instructor_id,''),
      Notes:r.notes, Status:r.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incData), 'Income');

    // Expenses sheet
    const expData=exp.map(r=>({
      ID:r.id, Date:r.date, 'Due Date':r.due_date,
      Category:r.category, Supplier:r.supplier, Qty:r.qty,
      'Amount BD':r.amount_bd, 'Paid BD':r.paid_bd,
      Horse:r.horse, Notes:r.notes, Status:r.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expData), 'Expenses');

    // Horses sheet
    const horData=hor.map(r=>({
      ID:r.id, 'Stable No':r.stable_no, Status:r.status,
      'Horse Name':r.horse_name, Owner:r.owner,
      CPR:r.cpr, Address:r.address, Contact:r.contact,
      'Start Date':r.start_date, 'Livery Type':r.livery_type,
      'Wood Shavings':r.qeshbar, Hay:r.hay,
      'Livery BD':r.livery_bd, 'AC Livery BD':r.ac_livery_bd,
      Payment:r.payment, Microchip:r.microchip, Passport:r.passport,
      'Birth Date':r.birth_date, Sex:r.sex, Color:r.color, Breed:r.breed,
      'Farrier Name':r.farrier_name, 'Farrier Date':r.farrier_date, 'Deworm Date':r.deworm_date,
      'Vaccine Dr':r.vaccine_dr, 'Vaccine Date':r.vaccine_date, 'Teeth Date':r.teeth_date, Medicant:r.medicant, 'Med Date':r.med_date,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(horData), 'Horses');

    // Breeding sheet
    const breData=bre.map(r=>({
      ID:r.id, 'Mare Name':r.mare_name, Owner:r.owner, Mobile:r.mobile, Count:r.count,
      'Day 1':r.day1,'Day 2':r.day2,'Day 3':r.day3,'Day 4':r.day4,'Day 5':r.day5,
      'Day 6':r.day6,'Day 7':r.day7,'Day 8':r.day8,'Day 9':r.day9,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breData), 'Breeding');

    // Domain modules contribute their own backup sheets without coupling their schema to app-core.
    moduleBackups.flatMap(item=>Array.isArray(item)?item:[item]).filter(item=>item&&item.sheet&&Array.isArray(item.rows)).forEach(item=>{
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(item.rows),String(item.sheet).slice(0,31));
    });

    // Summary sheet
    const totalGross=calcGrossIncomeReceived(inc);
    const totalRev=calcIncomeReceived(inc);
    const totalInstructorShare=calcInstructorShares(inc);
    // Total expenses = cash actually paid, including partial payments.
    const totalExp=calcPaidExpenses(exp);
    const totalPending=calcPendingAmount(exp);
    const totalPendingIncome=calcIncomePending(inc);
    const netOverdue=calcNetOverdue(inc,exp);
    const sumData=[
      {Metric:'Gross Collected BD',Value:totalGross.toFixed(3)},
      {Metric:'Stable Revenue BD',Value:totalRev.toFixed(3)},
      {Metric:'Instructor Shares BD',Value:totalInstructorShare.toFixed(3)},
      {Metric:'Total Expenses BD',Value:totalExp.toFixed(3)},
      {Metric:'Net Profit BD',Value:(totalRev-totalExp).toFixed(3)},
      {Metric:'Pending Income BD',Value:totalPendingIncome.toFixed(3)},
      {Metric:'Unpaid Expenses BD',Value:totalPending.toFixed(3)},
      {Metric:'Net Overdue BD',Value:netOverdue.toFixed(3)},
      {Metric:'Total Horses',Value:hor.length},
      {Metric:'Total Sessions',Value:inc.length},
      {Metric:'Total Expense Records',Value:exp.length},
      {Metric:'Backup Date',Value:new Date().toLocaleDateString('en-GB')},
      {Metric:'Backup Time',Value:new Date().toLocaleTimeString('en-GB')},
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumData), 'Summary');

    // Download
    const date=new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `CCE_Backup_${date}.xlsx`);
    btn.textContent='✓ Downloaded!';
    setTimeout(()=>{btn.innerHTML=t('backup');btn.disabled=false;},2000);
  }catch(e){
    showError('Backup error',e);
    btn.innerHTML=t('backup');btn.disabled=false;
  }
}

function logout() {
  sessionStorage.removeItem('cce_auth');
  navigate('home');
}
function skipLoad(){
  document.getElementById('loadingOverlay').style.display='none';
  document.getElementById('syncStatus').textContent='\u26A0\uFE0F Offline mode';
}

async function forceLoad(){
  document.getElementById('retryBtn').style.display='none';
  document.getElementById('spinner').style.display='block';
  document.getElementById('debugInfo').textContent='';
  await loadAll();
}

async function checkAndCreateLiveryNotifications(){
  // Auto-add livery payments for AVAILABLE horses — due on the 1st of EVERY month
  const today=new Date();
  const y=today.getFullYear(), m=today.getMonth()+1;
  const currentMonth=y+'-'+String(m).padStart(2,'0');
  const dueDateStr=currentMonth+'-01';               // Due: 1st of CURRENT month
  const todayStr=y+'-'+String(m).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  
  // Only Available horses with AC Livery amount > 0
  const liveryHorses=horses.filter(h=>h.status==='Available'&&parseFloat(h.ac_livery_bd||0)>0);
  
  let created=false;
  
  for(const horse of liveryHorses){
    // Skip if a livery record for THIS month already exists (Pending OR Paid — no duplicates)
    const existing=income.find(r=>
      r.horse_name===horse.horse_name&&
      (r.activity||'').startsWith('Livery')&&
      r.due_date&&r.due_date.startsWith(currentMonth)
    );
    
    if(!existing){
      try{
        await sbPost('income',{
          date:todayStr,
          due_date:dueDateStr,
          customer_name:horse.owner||'Owner',
          horse_name:horse.horse_name,
          activity:'Livery',
          qty:1,
          amount_bd:parseFloat(horse.ac_livery_bd)||0,
          paid_bd:0,
          notes:'Automatic monthly livery payment — '+horse.horse_name,
          status:'Pending'
        });
        created=true;
      }catch(e){

      }
    }
  }
  
  // Reload income so new records appear in Overdue immediately
  if(created){
    income=await sbGet('income','select=*&limit=2000');
  }
}

// ── One-time seeding of horse End Dates (runs once per browser) ──

async function loadAll(){
  if(!isAdminAuthed()){
    const ov0=document.getElementById('loadingOverlay');
    if(ov0) ov0.style.display='none';
    return;
  }
  const ov=document.getElementById('loadingOverlay');
  const msg=document.getElementById('loadingMsg');
  ov.style.display='flex';
  const dbg = document.getElementById('debugInfo');
  const setMsg = (m,d='') => { msg.textContent=m; if(d&&dbg) dbg.textContent=d; };
  
  try{
    setMsg('Step 1: Checking connection...','Testing network...');
    
    // Simple fetch test with 12s timeout
    const ctrl = new AbortController();
    const tid  = setTimeout(()=>ctrl.abort(), 12000);
    let testRes;
    try {
      testRes = await fetch(`${SB_URL}/rest/v1/income?select=id&limit=1`, {headers:HDR, signal:ctrl.signal});
      clearTimeout(tid);
    } catch(fetchErr) {
      clearTimeout(tid);
      if(fetchErr.name==='AbortError') throw new Error('Timeout after 12s — slow connection?');
      throw new Error('Network error: '+fetchErr.message);
    }
    
    if(!testRes.ok) throw new Error('Auth error '+testRes.status+' — check API key');
    setMsg('Step 2: Loading income...','Connection OK ✓');
    
    income   = await sbGet('income',  'select=*&limit=2000');
    normalizeLoadedPaymentStatuses(income);
    setMsg('Step 3: Loading expenses...',income.length+' income records loaded');
    
    expenses = await sbGet('expenses','select=*&limit=1000');
    normalizeLoadedPaymentStatuses(expenses);
    // Normalize category labels for display and filters only; no DB migrations run at startup.
    expenses.forEach(r=>{r.category=normalizeActivityCategory(r.category);});
    income.forEach(r=>{r.activity=normalizeActivityCategory(r.activity);});
    setMsg('Step 4: Loading horses...',expenses.length+' expenses loaded');
    
    horses   = await sbGet('horses',  'select=*&limit=200');
    if(window.CCE&&CCE.store)CCE.store.set('horses',horses);
    setMsg('Step 5: Loading breeding...',horses.length+' horses loaded');
    
    breeding = await sbGet('breeding','select=*&limit=200');
    setMsg('Step 6: Loading schedule...',breeding.length+' breeding records loaded');

    schedule_data = await sbGet('schedule','select=*&order=date.asc,start_time.asc&limit=1000');
    setMsg('Step 7: Loading instructors...',schedule_data.length+' schedule records loaded');

    instructors_data = await sbGet('instructors','select=*&order=name.asc');
    setMsg('Step 8: Loading horse health...',instructors_data.length+' instructors loaded');
    const healthLoaded=await CCE.health.load();
    horse_health_profiles=healthLoaded.profiles;
    horse_health_events=healthLoaded.events;
    horses=CCE.health.mergeCompletedSummaries(horses,horse_health_events);
    deriveHealthCollections();
    setMsg('Done!',horse_health_profiles.length+' health profiles and '+horse_health_events.length+' events loaded');

    document.getElementById('syncStatus').textContent='\u2713 '+new Date().toLocaleTimeString('en-GB');
    await checkAndCreateLiveryNotifications();
    populateDashPeriodFilters();buildDash();buildAlerts();renderIncome();renderExpenses();renderHorses();renderBreeding();renderOverdue();renderBookings();renderSchedule();renderInstructors();renderAuditLog();renderAdvancedReports();renderReceipts();renderHorseHealth();renderToolsPanel();populateLists();initNotifications();checkScheduledNotifications();dailyBackupSnapshot();
    ov.style.display='none';

  }catch(e){
    console.error('Load error:',e);
    setMsg('&#10007; '+userSafeError(e),'Tap Retry to try again');
    if(dbg) dbg.style.color='#ff9999';
    document.getElementById('spinner').style.display='none';
    document.getElementById('retryBtn').style.display='block';
    document.getElementById('syncStatus').textContent='\u2717 Error';
  }
}
function showPage(id,btn){
  showDashPage(id,btn);
  document.getElementById('headerSub').textContent=t('dash_'+id)||id;
}
function buildDash(){
  populateDashPeriodFilters();
  const p=getDashPeriod();
  const hasPeriod=!!(p.year||p.month);
  const incRows=hasPeriod?filterRowsByDashPeriod(income):income;
  const expRows=hasPeriod?filterRowsByDashPeriod(expenses):expenses;

  // Stable revenue excludes the instructor's immediate 50% training share.
  const gross=calcGrossIncomeReceived(incRows);
  const rev=calcIncomeReceived(incRows);
  const trainerShares=calcInstructorShares(incRows);

  // Cash accounting: Total Expenses is actual paid/spent cash (sum paid_bd).
  const exp=calcPaidExpenses(expRows);
  const pend=calcPendingAmount(expRows);
  const profit=rev-exp;
  const pendInc=calcIncomePending(incRows);
  const netOverdue=pendInc-pend;

  // Dashboard no longer uses due-date Overdue totals. Net Overdue = Pending Income - Unpaid Expenses.
  const ov=[];
  const ovAmt=netOverdue;

  const actH=horses.filter(h=>h.status==='Available').length;
  const totL=incRows.filter(r=>r.activity==='Lesson').length;
  const totH=incRows.filter(r=>r.activity==='Hack').length;
  const note=document.getElementById('dashPeriodNote');
  if(note){
    const label=hasPeriod?[(p.month?MN[parseInt(p.month,10)]:'All Months'),(p.year||'All Years')].join(' / '):'Showing all-time data';
    note.textContent=label+' — '+incRows.length+' income, '+expRows.length+' expense records';
  }
  // Hide legacy Overdue alert on dashboard; use Net Overdue card instead.
  document.getElementById('overdueBanner').classList.add('hidden');
  document.getElementById('overdueBadge').classList.add('hidden');
  const stats=[
    {l:'Gross Collected',v:BD(gross),c:'var(--navy)'},
    {l:'Stable Revenue',v:BD(rev),c:'var(--green)'},
    {l:'Instructor Shares',v:BD(trainerShares),c:'var(--amber)'},
    {l:'Total Expenses',v:BD(exp),c:'var(--red)'},
    {l:'Net Profit',v:BD(profit),c:profit>=0?'var(--green)':'var(--red)'},
    {l:'Pending Income',v:BD(pendInc),c:'var(--amber)'},
    {l:'Unpaid Expenses',v:BD(pend),c:'var(--amber)'},
    {l:'Net Overdue',v:BD(netOverdue),c:netOverdue>=0?'var(--green)':'var(--red)'},
    {l:'Horses (Active)',v:actH,c:'var(--navy)'},
    {l:'Total Lessons',v:totL,c:'var(--navy)'},
    {l:'Total Hack',v:totH,c:'var(--navy)'},
  ];
  document.getElementById('statsGrid').innerHTML=stats.map(s=>`<div class="stat-box"><div class="stat-label">${s.l}</div><div class="stat-value" style="color:${s.c}">${s.v}</div></div>`).join('');
  const mo={};
  const chartIncome=(p.year&&!p.month)?income.filter(r=>rowMonthKey(r).slice(0,4)===p.year):income;
  const chartExpenses=(p.year&&!p.month)?expenses.filter(r=>rowMonthKey(r).slice(0,4)===p.year):expenses;
  chartIncome.forEach(r=>{const m=rowMonthKey(r);if(!m)return;mo[m]=mo[m]||{rev:0,exp:0};mo[m].rev+=incomeStableShare(r);});
  chartExpenses.forEach(r=>{const m=rowMonthKey(r);if(!m)return;mo[m]=mo[m]||{rev:0,exp:0};mo[m].exp+=calcPaidExpenseAmount(r);});
  const months=Object.entries(mo).sort(([a],[b])=>a.localeCompare(b)).slice(-9);
  const mx=Math.max(...months.flatMap(([,v])=>[v.rev,v.exp]),1);
  document.getElementById('barChart').innerHTML=months.length?months.map(([m,v])=>`<div class="bar-group"><div class="bar-pair"><div class="bar" style="width:18px;height:${Math.max(4,(v.rev/mx)*110)}px;background:var(--green)" title="${BD(v.rev)}"></div><div class="bar" style="width:18px;height:${Math.max(4,(v.exp/mx)*110)}px;background:var(--red)" title="${BD(v.exp)}"></div></div><div class="bar-label">${MN[+m.split('-')[1]]}</div></div>`).join(''):'<p style="color:var(--muted);padding:12px">No monthly data</p>';
  const aM={};incRows.forEach(r=>{const a=normalizeActivityCategory(r.activity);aM[a]=(aM[a]||0)+incomeStableShare(r);});
  document.getElementById('actPie').innerHTML='<div class="pie-legend">'+Object.entries(aM).sort(([,a],[,b])=>b-a).map(([k,v],i)=>`<div class="pie-legend-item"><div class="pie-dot" style="background:${PC[i%8]}"></div><span>${esc(k)}</span><span style="margin-left:auto;font-weight:700;color:${PC[i%8]}">${BD(v)}</span></div>`).join('')+'</div>';
  const eM={};expRows.forEach(r=>{const c=normalizeActivityCategory(r.category);eM[c]=(eM[c]||0)+calcPaidExpenseAmount(r);});
  document.getElementById('expPie').innerHTML='<div class="pie-legend">'+Object.entries(eM).sort(([,a],[,b])=>b-a).slice(0,7).map(([k,v],i)=>`<div class="pie-legend-item"><div class="pie-dot" style="background:${PC[i%8]}"></div><span>${esc(k)}</span><span style="margin-left:auto;font-weight:700;color:${PC[i%8]}">${BD(v)}</span></div>`).join('')+'</div>';
  document.getElementById('recentInc').innerHTML=recentFinancialActivityHTML(incRows,expRows,10);
}

function recentFinancialActivityRows(incRows,expRows,limit=10){
  const auditRows=readAuditLog();
  const activityStamp=(tableName,r,index,total)=>{
    const entry=auditRows.find(e=>e&&e.table_name===tableName&&String(e.record_id)===String(r.id)&&['create','update'].includes(e.action));
    const relativeOrder=(index+1)/Math.max(1,total||1);
    const tableBias=tableName==='expenses'?0.000001:0;
    const exactMs=[entry?.ts,r.updated_at,r.created_at].map(value=>Date.parse(value||'')).filter(Number.isFinite);
    if(exactMs.length)return Math.max(...exactMs)+relativeOrder+tableBias;
    const dateMs=Date.parse(String(r.date||'')+'T00:00:00');
    return (Number.isFinite(dateMs)?dateMs:0)+relativeOrder+tableBias;
  };
  const rows=[
    ...(incRows||[]).map((r,index,list)=>({kind:'Income',row:r,stamp:activityStamp('income',r,index,list.length)})),
    ...(expRows||[]).map((r,index,list)=>({kind:'Expense',row:r,stamp:activityStamp('expenses',r,index,list.length)}))
  ];
  return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,Math.max(0,limit));
}
function recentFinancialActivityHTML(incRows,expRows,limit=10){
  const rows=recentFinancialActivityRows(incRows,expRows,limit);
  if(!rows.length)return '<p style="color:var(--muted);padding:12px">No records</p>';
  return '<table><thead><tr><th>Date</th><th>Type</th><th>Customer / Supplier</th><th>Category</th><th>Horse</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead><tbody>'+rows.map(item=>{
    const r=item.row;
    const isIncome=item.kind==='Income';
    const party=isIncome?r.customer_name:r.supplier;
    const category=isIncome?r.activity:r.category;
    const horse=isIncome?r.horse_name:r.horse;
    return '<tr>'+
      '<td>'+fmt(r.date)+'</td>'+
      '<td><span class="badge '+(isIncome?'badge-green':'badge-red')+'">'+item.kind+'</span></td>'+
      '<td>'+esc(party||'—')+'</td>'+
      '<td><span class="badge badge-amber">'+esc(category||'')+'</span></td>'+
      '<td>'+esc(horse||'—')+'</td>'+
      '<td class="'+(isIncome?'money-green':'money-red')+'">'+BD(r.amount_bd)+'</td>'+
      '<td>'+BD(r.paid_bd)+'</td>'+
      '<td><span class="badge '+(isPaidRow(r)?'badge-green':'badge-red')+'">'+esc(r.status||'Pending')+'</span></td>'+
    '</tr>';
  }).join('')+'</tbody></table>';
}

function incTblHTML(data){
  if(!data.length)return '<p style="color:var(--muted);padding:12px">No records</p>';
  return '<table><thead><tr><th>Date</th><th>Due</th><th>Customer</th><th>Horse</th><th>Category</th><th>Qty</th><th>Amount</th><th>Paid</th><th>Training Split</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
    data.map(function(r){
      return '<tr>'+ 
        '<td>'+fmt(r.date)+'</td>'+ 
        '<td>'+(r.due_date?'<span style="color:var(--red);font-weight:700">'+fmt(r.due_date)+'</span>':'&mdash;')+'</td>'+ 
        '<td>'+esc(r.customer_name||'&mdash;')+'</td>'+ 
        '<td>'+esc(r.horse_name||'&mdash;')+'</td>'+ 
        '<td><span class="badge badge-amber">'+esc(r.activity||'')+'</span></td>'+ 
        '<td>'+esc(r.qty||1)+'</td>'+ 
        '<td class="money-green">'+BD(r.amount_bd)+'</td>'+ 
        '<td>'+BD(r.paid_bd)+'</td>'+ 
        '<td>'+trainingSplitHTML(r)+'</td>'+
        '<td><span class="badge '+(r.status==='Paid'?'badge-green':'badge-red')+'">'+esc(r.status||'Pending')+'</span></td>'+ 
        '<td style="white-space:nowrap">'+
          '<button class="action-btn" style="background:#E8EAF0;color:var(--navy)" onclick="editIncome('+r.id+')">&#9999;&#65039;</button>'+ '<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="printReceipt('+r.id+')">&#129534;</button>'+ 
          (r.status!=='Paid'?'<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="markPaid(&apos;income&apos;,'+r.id+','+r.amount_bd+')">&#9989;</button>':'')+
          '<button class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="delRec(&apos;income&apos;,'+r.id+')">&#128465;&#65039;</button>'+ 
        '</td>'+ 
      '</tr>';
    }).join('')+'</tbody></table>';
}

function renderIncome(){
  const q=(document.getElementById('incSearch').value||'').toLowerCase();
  const ac=document.getElementById('incActFilter').value;
  const st=document.getElementById('incStFilter').value;
  let data=income.filter(r=>{const m=!q||(r.customer_name||'').toLowerCase().includes(q)||(r.horse_name||'').toLowerCase().includes(q)||(r.activity||'').toLowerCase().includes(q);return m&&(!ac||normalizeActivityCategory(r.activity)===ac)&&(!st||r.status===st);});
  document.getElementById('incCount').textContent=data.length;
  document.getElementById('incTotalAmt').textContent='Gross: '+BD(calcGrossIncomeReceived(data))+' • Stable: '+BD(calcIncomeReceived(data))+' • Instructor: '+BD(calcInstructorShares(data));
  const pages=Math.ceil(data.length/PER)||1;incPage=Math.min(incPage,pages);
  document.getElementById('incTable').innerHTML=incTblHTML([...data].reverse().slice((incPage-1)*PER,incPage*PER));
  renderPag('incPag',pages,incPage,p=>{incPage=p;renderIncome();});
}
async function addIncome(){
  const date=document.getElementById('inc-date').value;
  const cust=document.getElementById('inc-customer').value.trim();
  const amt=parseFloat(document.getElementById('inc-amount').value)||0;
  if(!date||!cust||!amt){alert('Fill: Date, Customer, Amount');return;}
  const qty=parseFloat(document.getElementById('inc-qty').value)||1;
  const total=qty*amt;
  const paid=parseFloat(document.getElementById('inc-paid').value)||0;
  if(!validatePaymentInput(total,paid,'Income'))return;
  const activity=normalizeActivityCategory(document.getElementById('inc-activity').value);
  const trainer=selectedInstructor('inc-instructor');
  if(isTrainingIncome({activity})&&paid>0&&!trainer){alert('Select an active instructor before recording a training payment.');return;}
  const btn=document.getElementById('incSaveBtn');btn.disabled=true;btn.textContent='Saving...';
  try{
    await sbPost('income',{date,due_date:document.getElementById('inc-due').value||null,start_time:document.getElementById('inc-start').value||null,end_time:document.getElementById('inc-end').value||null,customer_name:cust,horse_name:document.getElementById('inc-horse').value||null,activity,qty,amount_bd:total,paid_bd:paid,training_split_enabled:isTrainingIncome({activity}),instructor_id:isTrainingIncome({activity})?(trainer?.id||null):null,notes:document.getElementById('inc-notes').value||null,status:normalizePaidStatus(total,paid)});
    // Notify if booking
    const notes=document.getElementById('inc-notes').value||'';
    if(['BOOKING REQUEST','TRAINING REQUEST','LIVERY REQUEST'].some(marker=>notes.includes(marker))){
      notifyNewBooking(cust,document.getElementById('inc-horse').value||'?',document.getElementById('inc-start').value||date);
    }
    ['inc-date','inc-due','inc-customer','inc-amount','inc-notes','inc-start','inc-end'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('inc-qty').value='1';document.getElementById('inc-paid').value='0';document.getElementById('inc-total').value='';document.getElementById('inc-instructor').value='';syncIncomeInstructorField('inc');
    await loadAll();
  }catch(e){showError('Error',e);}
  finally{btn.disabled=false;btn.textContent='Save to Database';}
}
const EXPENSE_META_PREFIX='CCE_EXPENSE_META_V1:';
const CCE_EMPTY_INVOICE={attachment:null,lines:[]};
window.CCE_INVOICE_ATTACHMENTS=window.CCE_INVOICE_ATTACHMENTS||{};
function parseExpenseMetaFromNotes(notes){
  const raw=String(notes||'');
  if(raw.startsWith(EXPENSE_META_PREFIX)){
    try{
      const meta=JSON.parse(raw.slice(EXPENSE_META_PREFIX.length));
      return {
        details:String((meta&&meta.details)||''),
        invoice:normalizeExpenseInvoice(meta&&meta.invoice),
        installments:Array.isArray(meta&&meta.installments)?meta.installments:[]
      };
    }catch(e){
      return {details:raw,invoice:normalizeExpenseInvoice(null),installments:[]};
    }
  }
  return {details:raw,invoice:normalizeExpenseInvoice(null),installments:[]};
}
function money3(v){return Math.round(moneyNum(v)*1000)/1000;}
function expenseMeta(r){return parseExpenseMetaFromNotes(r&&r.notes);}
function newInvoiceLineId(){return 'inv_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function normalizeInvoiceAttachment(att){
  if(!att)return null;
  const name=String((att&&att.name)||'').trim();
  const type=String((att&&att.type)||'').trim();
  const data_url=String((att&&att.data_url)||'');
  if(!name&&!data_url)return null;
  return {name:name||'Invoice attachment',type,data_url};
}
function normalizeInvoiceLine(line){
  return {
    id:String((line&&line.id)||newInvoiceLineId()),
    description:String((line&&line.description)||''),
    amount:money3(line&&line.amount)
  };
}
function normalizeExpenseInvoice(inv){
  const lines=Array.isArray(inv&&inv.lines)?inv.lines:[];
  return {
    attachment:normalizeInvoiceAttachment(inv&&inv.attachment),
    lines:lines.map(normalizeInvoiceLine).filter(l=>l.description.trim()||l.amount>0)
  };
}
function invoiceHasContent(invoice){
  const inv=normalizeExpenseInvoice(invoice);
  return !!(inv.attachment||inv.lines.length);
}
function invoiceTotal(invoice){return normalizeExpenseInvoice(invoice).lines.reduce((s,l)=>s+moneyNum(l.amount),0);}
function expenseInvoice(r){return normalizeExpenseInvoice(expenseMeta(r).invoice);}
function normalizeExpenseInstallment(inst){
  const payments=Array.isArray(inst&&inst.payments)?inst.payments:[];
  const migratedPaid=(!payments.length && moneyNum(inst&&inst.paid)>0)?[{date:String((inst&&inst.paid_date)||''),amount:money3(inst.paid),note:''}]:[];
  return {
    id:String((inst&&inst.id)||newExpenseInstallmentId()),
    due_date:String((inst&&inst.due_date)||''),
    amount:money3(inst&&inst.amount),
    note:String((inst&&inst.note)||''),
    payments:[...payments,...migratedPaid].map(p=>({date:String((p&&p.date)||''),amount:money3(p&&p.amount),note:String((p&&p.note)||'')})).filter(p=>p.amount>0)
  };
}
function expenseInstallments(r){return expenseMeta(r).installments.map(normalizeExpenseInstallment).filter(i=>i.amount>0);}
function buildExpenseNotes(details,installments,invoice){
  const cleanInstallments=(installments||[]).map(normalizeExpenseInstallment).filter(i=>i.amount>0);
  const cleanDetails=String(details||'');
  const cleanInvoice=normalizeExpenseInvoice(invoice);
  if(cleanInstallments.length||invoiceHasContent(cleanInvoice)){
    return EXPENSE_META_PREFIX+JSON.stringify({details:cleanDetails,invoice:cleanInvoice,installments:cleanInstallments});
  }
  return cleanDetails||null;
}
function expenseDetailsText(r){return String(expenseMeta(r).details||'').trim();}
function expenseHasDetails(r){return !!(expenseDetailsText(r)||invoiceHasContent(expenseInvoice(r)));}
function expenseSearchText(r){
  const meta=expenseMeta(r);
  const inv=normalizeExpenseInvoice(meta.invoice);
  const invText=[inv.attachment&&inv.attachment.name, ...inv.lines.map(l=>[l.description,l.amount].join(' '))].join(' ');
  const plan=(meta.installments||[]).map(i=>[i.due_date,i.amount,i.note,(i.payments||[]).map(p=>[p.date,p.amount,p.note].join(' ')).join(' ')].join(' ')).join(' ');
  return [r&&r.supplier,r&&r.category,meta.details,invText,plan].join(' ').toLowerCase();
}
function expenseDetailsPreview(r,max=70){
  const txt=expenseDetailsText(r).replace(/\s+/g,' ');
  const inv=expenseInvoice(r);
  const invSummary=invoiceHasContent(inv)?('Invoice: '+(inv.lines.length?inv.lines.length+' lines / '+BD(invoiceTotal(inv)):'attached')):'';
  const combined=[txt,invSummary].filter(Boolean).join(' • ');
  if(!combined)return '&mdash;';
  return esc(combined.length>max?combined.slice(0,max-1)+'…':combined);
}
function expenseDetailsCell(r){
  const has=expenseHasDetails(r);
  return '<div style="min-width:170px">'+
    '<button class="action-btn" '+(has?'':'disabled')+' style="background:'+(has?'#EEF3FF':'#f3f3f3')+';color:'+(has?'var(--navy)':'#999')+';padding:6px 12px" onclick="viewExpenseDetails('+r.id+')">&#128196; Details</button>'+ 
    '<div style="margin-top:5px;color:var(--muted);font-size:11px;white-space:normal;max-width:260px">'+expenseDetailsPreview(r)+'</div>'+ 
  '</div>';
}
function invoiceLineHTML(scope,line={}){
  const l=normalizeInvoiceLine(line);
  return '<tr class="invoice-line"><td><input type="text" class="invoice-desc" value="'+escAttr(l.description)+'" placeholder="Invoice item / description"></td><td><input type="number" step="0.001" class="invoice-amount" value="'+(l.amount?l.amount.toFixed(3):'')+'" placeholder="0.000" oninput="updateInvoiceTotal(\''+scope+'\')"></td><td><button type="button" class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="removeInvoiceLine(this,\''+scope+'\')">&#128465;&#65039;</button></td></tr>';
}
function renderInvoiceEditor(scope,invoice){
  const inv=normalizeExpenseInvoice(invoice);
  window.CCE_INVOICE_ATTACHMENTS[scope]=inv.attachment||null;
  const tb=document.getElementById(scope+'-invoice-lines');
  if(tb)tb.innerHTML=(inv.lines.length?inv.lines:[{}]).map(l=>invoiceLineHTML(scope,l)).join('');
  updateInvoiceAttachmentLabel(scope);
  updateInvoiceTotal(scope);
}
function addInvoiceLine(scope,line={}){
  const tb=document.getElementById(scope+'-invoice-lines');
  if(!tb)return;
  tb.insertAdjacentHTML('beforeend',invoiceLineHTML(scope,line));
  updateInvoiceTotal(scope);
}
function removeInvoiceLine(btn,scope){
  const row=btn&&btn.closest?btn.closest('tr'):null;
  if(row)row.remove();
  const tb=document.getElementById(scope+'-invoice-lines');
  if(tb&&!tb.querySelector('.invoice-line'))addInvoiceLine(scope);
  updateInvoiceTotal(scope);
}
function getInvoiceEditorTotal(scope){
  const tb=document.getElementById(scope+'-invoice-lines');
  return tb?[...tb.querySelectorAll('.invoice-amount')].reduce((s,el)=>s+moneyNum(el.value),0):0;
}
function syncExpenseInvoiceTotals(scope){
  if(scope!=='exp'&&scope!=='ee')return;
  const total=money3(getInvoiceEditorTotal(scope));
  const qtyId=scope==='exp'?'exp-qty':'ee-qty';
  const amtId=scope==='exp'?'exp-amount':'ee-amt';
  const totalId=scope==='exp'?'exp-total':'ee-total';
  const qtyEl=document.getElementById(qtyId);
  const amtEl=document.getElementById(amtId);
  const totalEl=document.getElementById(totalId);
  const qty=Math.max(1,moneyNum(qtyEl&&qtyEl.value)||1);
  if(total>0){
    if(amtEl)amtEl.value=(total/qty).toFixed(3);
    if(totalEl)totalEl.value=total.toFixed(3);
  }else{
    const amt=moneyNum(amtEl&&amtEl.value);
    if(totalEl)totalEl.value=(qty*amt).toFixed(3);
  }
}
function updateInvoiceTotal(scope){
  const total=getInvoiceEditorTotal(scope);
  const out=document.getElementById(scope+'-invoice-total');
  if(out)out.textContent=BD(total);
  syncExpenseInvoiceTotals(scope);
}
function updateInvoiceAttachmentLabel(scope){
  const out=document.getElementById(scope+'-invoice-file-name');
  if(!out)return;
  const att=normalizeInvoiceAttachment(window.CCE_INVOICE_ATTACHMENTS[scope]);
  out.textContent=att?att.name:'No invoice attached';
  out.style.color=att?'var(--navy)':'var(--muted)';
}
function handleInvoiceAttachment(scope,input){
  const file=input&&input.files&&input.files[0];
  if(!file)return;
  const max=2*1024*1024;
  if(file.size>max){alert('Invoice attachment is too large. Maximum size is 2 MB.');input.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{window.CCE_INVOICE_ATTACHMENTS[scope]={name:file.name,type:file.type||'application/octet-stream',data_url:String(reader.result||'')};updateInvoiceAttachmentLabel(scope);};
  reader.onerror=()=>alert('Could not read invoice attachment.');
  reader.readAsDataURL(file);
}
function clearInvoiceAttachment(scope){
  window.CCE_INVOICE_ATTACHMENTS[scope]=null;
  const input=document.getElementById(scope+'-invoice-file');if(input)input.value='';
  updateInvoiceAttachmentLabel(scope);
}
function collectInvoiceData(scope){
  const tb=document.getElementById(scope+'-invoice-lines');
  const lines=tb?[...tb.querySelectorAll('.invoice-line')].map(row=>({
    description:row.querySelector('.invoice-desc')?.value||'',
    amount:money3(row.querySelector('.invoice-amount')?.value||0)
  })).filter(l=>String(l.description||'').trim()||moneyNum(l.amount)>0):[];
  return normalizeExpenseInvoice({attachment:window.CCE_INVOICE_ATTACHMENTS[scope]||null,lines});
}
function invoiceAttachmentHTML(att){
  const a=normalizeInvoiceAttachment(att);
  if(!a)return '<span style="color:var(--muted)">No attachment</span>';
  if(a.data_url)return '<a class="action-btn" style="background:#EEF3FF;color:var(--navy);display:inline-block;text-decoration:none;padding:7px 10px" href="'+escAttr(a.data_url)+'" download="'+escAttr(a.name)+'">&#128206; '+esc(a.name)+'</a>';
  return '<span>&#128206; '+esc(a.name)+'</span>';
}
function invoiceTableHTML(invoice){
  const inv=normalizeExpenseInvoice(invoice);
  const rows=inv.lines.length?inv.lines.map(l=>'<tr><td style="white-space:normal;min-width:260px">'+esc(l.description||'—')+'</td><td class="money-red">'+BD(l.amount)+'</td></tr>').join(''):'<tr><td colspan="2" style="color:var(--muted);padding:10px">No invoice lines saved.</td></tr>';
  return '<div class="tbl-wrap"><table><thead><tr><th>Invoice Item / Description</th><th>Amount</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th>Total</th><th>'+BD(invoiceTotal(inv))+'</th></tr></tfoot></table></div>';
}
function installmentPaid(inst){return (normalizeExpenseInstallment(inst).payments||[]).reduce((s,p)=>s+moneyNum(p.amount),0);}
function installmentRemaining(inst){const i=normalizeExpenseInstallment(inst);return Math.max(0,moneyNum(i.amount)-installmentPaid(i));}
function installmentRowsPaid(rows){return (rows||[]).reduce((sum,i)=>sum+installmentPaid(i),0);}
function expenseUntrackedPaid(r,rows){return Math.max(0,moneyNum(r&&r.paid_bd)-installmentRowsPaid(rows));}
function openingPaidInstallment(r,amount){
  const paid=money3(amount);
  const date=String((r&&r.date)||todayISOForInstallment());
  return {id:newExpenseInstallmentId(),due_date:date,amount:paid,note:'Paid before installment plan',payments:[{date,amount:paid,note:'Opening paid balance'}]};
}
function installmentStatus(inst){
  if(installmentRemaining(inst)<=0.0004)return 'Paid';
  if(isPastDueDate(inst.due_date))return 'Overdue';
  return 'Pending';
}
function expensePlanTotals(r){
  const rows=expenseInstallments(r);
  const planned=rows.reduce((s,i)=>s+moneyNum(i.amount),0);
  const paid=rows.reduce((s,i)=>s+installmentPaid(i),0);
  const planRemaining=rows.reduce((s,i)=>s+installmentRemaining(i),0);
  const expenseRemaining=calcRemaining(r);
  const unplannedRemaining=Math.max(0,expenseRemaining-planRemaining);
  const overPlanned=Math.max(0,planRemaining-expenseRemaining);
  const next=rows.filter(i=>installmentRemaining(i)>0.0004&&i.due_date).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0]||null;
  const overdueCount=rows.filter(i=>installmentRemaining(i)>0.0004&&isPastDueDate(i.due_date)).length;
  return {count:rows.length,planned,paid,planRemaining,expenseRemaining,unplannedRemaining,overPlanned,next,overdueCount};
}
function expenseHasOverdueInstallment(r){return expenseInstallments(r).some(i=>installmentRemaining(i)>0.0004&&isPastDueDate(i.due_date));}
function overdueExpenseInstallments(r){return expenseInstallments(r).filter(i=>installmentRemaining(i)>0.0004&&isPastDueDate(i.due_date));}
function expenseOverdueAmount(r){const rows=overdueExpenseInstallments(r);return rows.length?rows.reduce((s,i)=>s+installmentRemaining(i),0):calcRemaining(r);}
function expenseOverdueDueHTML(r){const rows=overdueExpenseInstallments(r);return rows.length?rows.map(i=>fmt(i.due_date)).join('<br>'):fmt(r.due_date);}
function expenseInstallmentsCell(r){
  const t=expensePlanTotals(r);
  if(!t.count&&isPaidRow(r)){
    return '<div style="min-width:155px"><span class="badge badge-green">Paid</span><div style="font-size:11px;color:var(--muted);margin-top:4px">No plan needed</div></div>';
  }
  const bg=t.overdueCount?'#FDECEA':'#E8F5EE';
  const color=t.overdueCount?'var(--red)':'var(--green)';
  const label=t.count?('Plan ('+t.count+')'):'Add Plan';
  const next=t.next?('<div style="font-size:11px;color:var(--muted);margin-top:4px">Next: '+fmt(t.next.due_date)+' / '+BD(installmentRemaining(t.next))+'</div>'):'';
  const warn=t.unplannedRemaining>0.0004?('<div style="font-size:11px;color:var(--amber);margin-top:4px">Unplanned: '+BD(t.unplannedRemaining)+'</div>'):(t.overPlanned>0.0004?('<div style="font-size:11px;color:var(--red);margin-top:4px">Over planned: '+BD(t.overPlanned)+'</div>'):'');
  return '<div style="min-width:155px"><button class="action-btn" style="background:'+bg+';color:'+color+';padding:6px 12px" onclick="viewExpenseInstallments('+r.id+')">&#128467;&#65039; '+label+'</button>'+next+warn+'</div>';
}
function bahrainDateISO(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bahrain',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
  const get=type=>parts.find(part=>part.type===type)?.value||'';
  return get('year')+'-'+get('month')+'-'+get('day');
}
function todayISOForInstallment(){return bahrainDateISO();}
function newExpenseInstallmentId(){return 'inst_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function installmentPaymentsHTML(inst){
  const i=normalizeExpenseInstallment(inst);
  if(!i.payments.length)return '<span style="color:var(--muted)">—</span>';
  return i.payments.map(p=>'<div>'+fmt(p.date)+' — '+BD(p.amount)+(p.note?' <span style="color:var(--muted)">('+esc(p.note)+')</span>':'')+'</div>').join('');
}
function viewExpenseDetails(id){
  const r=expenses.find(x=>String(x.id)===String(id));if(!r)return;
  const agreement=expenseDetailsText(r)||'No agreement/details text saved for this expense.';
  const inv=expenseInvoice(r);
  const plan=expensePlanTotals(r);
  openModal('Expense Details',`<div style="display:grid;gap:12px;font-size:13px;line-height:1.7">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="badge badge-amber">${esc(r.category||'Expense')}</span>
      <span><strong>Supplier:</strong> ${esc(r.supplier||'—')}</span>
      <span><strong>Amount:</strong> ${BD(r.amount_bd)}</span>
      <span><strong>Paid:</strong> ${BD(r.paid_bd)}</span>
      <span><strong>Remaining:</strong> ${BD(calcRemaining(r))}</span>
      <span><strong>Invoice Total:</strong> ${BD(invoiceTotal(inv))}</span>
      <span><strong>Installments:</strong> ${plan.count}</span>
    </div>
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fff">
      <div style="font-weight:700;color:var(--navy);margin-bottom:8px">Agreement / Details</div>
      <div style="white-space:pre-wrap;max-height:28vh;overflow:auto;font-family:'Cairo','Segoe UI',Roboto,Arial,sans-serif">${esc(agreement)}</div>
    </div>
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fff">
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-weight:700;color:var(--navy)">Invoice</div>
        <div>${invoiceAttachmentHTML(inv.attachment)}</div>
      </div>
      ${invoiceTableHTML(inv)}
    </div>
    <div class="btn-row"><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Close</button><button class="btn" style="background:#EEF3FF;color:var(--navy)" onclick="closeModal();viewExpenseInstallments(${id})">Installments</button><button class="btn btn-red" onclick="closeModal();editExpense(${id})">Edit Details</button></div>
  </div>`);
}
function viewExpenseInstallments(id){
  const r=expenses.find(x=>String(x.id)===String(id));if(!r)return;
  const rows=expenseInstallments(r);
  const t=expensePlanTotals(r);
  const canAddPlan=!isPaidRow(r)&&hasRemaining(r);
  const body=rows.length?rows.map(i=>{
    const st=installmentStatus(i);
    const badge=st==='Paid'?'badge-green':(st==='Overdue'?'badge-red':'badge-amber');
    const expenseArg=JSON.stringify(String(r.id));
    const instArg=JSON.stringify(String(i.id));
    return `<tr>
      <td>${fmt(i.due_date)}</td>
      <td class="money-red">${BD(i.amount)}</td>
      <td>${BD(installmentPaid(i))}</td>
      <td class="money-red">${BD(installmentRemaining(i))}</td>
      <td><span class="badge ${badge}">${st}</span></td>
      <td style="white-space:normal;min-width:160px">${esc(i.note||'—')}</td>
      <td style="white-space:normal;min-width:150px;font-size:12px">${installmentPaymentsHTML(i)}</td>
      <td style="white-space:nowrap">
        ${st!=='Paid'?`<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick='payExpenseInstallment(${expenseArg},${instArg})'>&#9989; Pay</button>`:''}
        <button class="action-btn" style="background:#EEF3FF;color:var(--navy)" onclick='manageExpenseInstallmentPayments(${expenseArg},${instArg})'>&#128176; Payments</button>
        <button class="action-btn" style="background:#E8EAF0;color:var(--navy)" onclick='editExpenseInstallment(${expenseArg},${instArg})'>&#9999;&#65039; Edit</button>
        <button class="action-btn" style="background:#FDECEA;color:var(--red)" onclick='deleteExpenseInstallment(${expenseArg},${instArg})'>&#128465;&#65039;</button>
      </td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="color:var(--muted);padding:12px">No installments yet. Add variable installments below.</td></tr>';
  openModal('Expense Installments',`<div style="display:grid;gap:12px;font-size:13px;line-height:1.6">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="badge badge-amber">${esc(r.category||'Expense')}</span>
      <span><strong>Supplier:</strong> ${esc(r.supplier||'—')}</span>
      <span><strong>Expense Remaining:</strong> ${BD(t.expenseRemaining)}</span>
      <span><strong>Plan Remaining:</strong> ${BD(t.planRemaining)}</span>
      <span><strong>Unplanned:</strong> ${BD(t.unplannedRemaining)}</span>
      <span><strong>Installments Paid:</strong> ${BD(t.paid)}</span>
      ${Math.abs(t.paid-moneyNum(r.paid_bd))>0.0004?`<span style="color:var(--red);font-weight:700">Paid mismatch: Expense ${BD(r.paid_bd)} / Plan ${BD(t.paid)}</span><button class="action-btn" style="background:#EEF3FF;color:var(--navy)" onclick="syncExpensePaidIntoInstallments(${id})">Sync Paid → Installments</button>`:''}
      ${t.overPlanned>0.0004?`<span style="color:var(--red);font-weight:700">Over planned: ${BD(t.overPlanned)}</span>`:''}
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Due Date</th><th>Installment Amount</th><th>Paid</th><th>Remaining</th><th>Status</th><th>Note</th><th>Payment History</th><th>Actions</th></tr></thead><tbody>${body}</tbody></table></div>
    ${canAddPlan?`<div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fafafa">
      <div style="font-weight:700;color:var(--navy);margin-bottom:8px">Add Variable Installment</div>
      <div class="form-grid">
        <div class="form-group"><label>Due Date *</label><input type="date" id="inst-due"></div>
        <div class="form-group"><label>Installment Amount BD *</label><input type="number" step="0.001" id="inst-amount" placeholder="0.000"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Note</label><input type="text" id="inst-note" placeholder="Example: reimbursement deduction, supplier payment, etc."></div>
      </div>
      <div class="btn-row"><button class="btn btn-red" onclick="addExpenseInstallment(${id})">Add Installment</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Close</button></div>
    </div>`:`<div style="border:1px solid #B8DDC7;border-radius:10px;padding:12px;background:#E8F5EE;color:var(--green);font-weight:700">&#10003; This expense is fully paid. No additional installment plan is needed.<div class="btn-row"><button class="btn" style="background:#fff;color:var(--navy)" onclick="closeModal()">Close</button></div></div>`}
  </div>`);
}
async function saveExpenseMetaPatch(expenseId,details,installments,paidOverride,invoiceOverride){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const invoice=(typeof invoiceOverride==='undefined')?expenseInvoice(r):invoiceOverride;
  const cleanInstallments=(installments||[]).map(normalizeExpenseInstallment).filter(i=>i.amount>0);
  const payload={notes:buildExpenseNotes(details,cleanInstallments,invoice)};
  if(typeof paidOverride==='number'){
    payload.paid_bd=money3(paidOverride);
    payload.status=normalizePaidStatus(moneyNum(r.amount_bd),payload.paid_bd);
  }
  await sbPatch('expenses',r.id,payload);
  await loadAll();
}
async function addExpenseInstallment(expenseId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  if(isPaidRow(r)||!hasRemaining(r)){alert('This expense is fully paid. No installment plan is needed.');return;}
  const due=(document.getElementById('inst-due')?.value||'').trim();
  const amount=money3(document.getElementById('inst-amount')?.value||0);
  const note=(document.getElementById('inst-note')?.value||'').trim();
  if(!due||amount<=0){alert('Fill installment due date and amount');return;}
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r);
  if(!rows.length&&moneyNum(r.paid_bd)>0.0004)rows.push(openingPaidInstallment(r,r.paid_bd));
  rows.push({id:newExpenseInstallmentId(),due_date:due,amount,note,payments:[]});
  const planRemaining=rows.reduce((s,i)=>s+installmentRemaining(i),0);
  if(planRemaining-calcRemaining(r)>0.0004){alert('Installment plan cannot exceed expense remaining by '+BD(planRemaining-calcRemaining(r))+'.');return;}
  try{await saveExpenseMetaPatch(expenseId,meta.details,rows);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}
async function payExpenseInstallment(expenseId,instId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r);
  const untrackedPaid=expenseUntrackedPaid(r,rows);
  const inst=rows.find(i=>String(i.id)===String(instId));if(!inst)return;
  const instRem=installmentRemaining(inst);
  const expRem=calcRemaining(r);
  if(instRem<=0.0004){alert('This installment is already paid.');return;}
  const amtRaw=prompt('Payment amount BD',Math.min(instRem,expRem).toFixed(3));
  if(amtRaw===null)return;
  const amount=money3(amtRaw);
  if(amount<=0){alert('Payment amount must be greater than zero.');return;}
  if(amount-instRem>0.0004){alert('Payment cannot be greater than installment remaining.');return;}
  if(amount-expRem>0.0004){alert('Payment cannot be greater than expense remaining.');return;}
  const date=prompt('Payment date',todayISOForInstallment());
  if(date===null)return;
  const payDate=(date||todayISOForInstallment()).trim();
  inst.payments.push({date:payDate,amount,note:''});
  const newPaid=Math.min(moneyNum(r.amount_bd),untrackedPaid+installmentRowsPaid(rows));
  try{await saveExpenseMetaPatch(expenseId,meta.details,rows,newPaid);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}

function paymentLineHTML(p={}){
  const date=String((p&&p.date)||todayISOForInstallment());
  const amount=moneyNum(p&&p.amount)>0?moneyNum(p.amount).toFixed(3):'';
  const note=String((p&&p.note)||'');
  return '<tr class="payment-line">'+
    '<td><input type="date" class="pay-date" value="'+escAttr(date)+'"></td>'+ 
    '<td><input type="number" step="0.001" class="pay-amount" value="'+escAttr(amount)+'" placeholder="0.000"></td>'+ 
    '<td><input type="text" class="pay-note" value="'+escAttr(note)+'" placeholder="Payment note"></td>'+ 
    '<td><button type="button" class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="removePaymentLine(this)">&#128465;&#65039;</button></td>'+ 
  '</tr>';
}
function addPaymentLine(p={}){
  const tb=document.getElementById('inst-payment-lines');
  if(tb)tb.insertAdjacentHTML('beforeend',paymentLineHTML(p));
}
function removePaymentLine(btn){
  const row=btn&&btn.closest?btn.closest('tr'):null;
  if(row)row.remove();
  const tb=document.getElementById('inst-payment-lines');
  if(tb&&!tb.querySelector('.payment-line'))addPaymentLine({date:todayISOForInstallment(),amount:0,note:''});
}
function manageExpenseInstallmentPayments(expenseId,instId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const rows=expenseInstallments(r);
  const inst=rows.find(i=>String(i.id)===String(instId));if(!inst)return;
  const pays=normalizeExpenseInstallment(inst).payments;
  const body=(pays.length?pays:[{date:todayISOForInstallment(),amount:0,note:''}]).map(paymentLineHTML).join('');
  openModal('Edit Installment Payments',`<div style="display:grid;gap:12px;font-size:13px;line-height:1.6">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="badge badge-amber">${esc(r.category||'Expense')}</span>
      <span><strong>Supplier:</strong> ${esc(r.supplier||'—')}</span>
      <span><strong>Installment:</strong> ${BD(inst.amount)}</span>
      <span><strong>Current Paid:</strong> ${BD(installmentPaid(inst))}</span>
      <span><strong>Remaining:</strong> ${BD(installmentRemaining(inst))}</span>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Payment Date</th><th>Amount BD</th><th>Note</th><th></th></tr></thead><tbody id="inst-payment-lines">${body}</tbody></table></div>
    <div style="font-size:12px;color:var(--muted)">Saving these rows will update Expense Paid BD automatically from all installment payments.</div>
    <div class="btn-row">
      <button class="btn" style="background:#E8F5EE;color:var(--green)" onclick="addPaymentLine({date:todayISOForInstallment(),amount:0,note:''})">+ Add Payment Row</button>
      <button class="btn btn-red" onclick="saveExpenseInstallmentPayments('${String(expenseId).replace(/'/g,"\'")}','${String(instId).replace(/'/g,"\'")}')">Save Payments</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="viewExpenseInstallments('${String(expenseId).replace(/'/g,"\'")}')">Back</button>
    </div>
  </div>`);
}
async function saveExpenseInstallmentPayments(expenseId,instId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r);
  const untrackedPaid=expenseUntrackedPaid(r,rows);
  const inst=rows.find(i=>String(i.id)===String(instId));if(!inst)return;
  const tb=document.getElementById('inst-payment-lines');
  const payments=tb?[...tb.querySelectorAll('.payment-line')].map(row=>({
    date:(row.querySelector('.pay-date')?.value||todayISOForInstallment()).trim(),
    amount:money3(row.querySelector('.pay-amount')?.value||0),
    note:(row.querySelector('.pay-note')?.value||'').trim()
  })).filter(p=>p.amount>0):[];
  const total=payments.reduce((s,p)=>s+moneyNum(p.amount),0);
  if(total-moneyNum(inst.amount)>0.0004){alert('Payments cannot be greater than the installment amount.');return;}
  inst.payments=payments;
  const allPaid=untrackedPaid+installmentRowsPaid(rows);
  if(allPaid-moneyNum(r.amount_bd)>0.0004){alert('All installment payments cannot be greater than expense amount.');return;}
  try{await saveExpenseMetaPatch(expenseId,meta.details,rows,allPaid);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}
async function syncExpensePaidIntoInstallments(expenseId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  if(!rows.length){alert('No installment plan found.');return;}
  const currentPaid=money3(r.paid_bd);
  if(currentPaid<=0){alert('Expense Paid BD is zero. Nothing to distribute.');return;}
  const planned=rows.reduce((s,i)=>s+moneyNum(i.amount),0);
  if(currentPaid-planned>0.0004 && !confirm('Paid BD is greater than planned installments by '+BD(currentPaid-planned)+'. Distribute only across planned installments?'))return;
  if(!confirm('This will replace current installment payment rows and distribute Expense Paid BD across installments from earliest due date. Continue?'))return;
  let left=currentPaid;
  rows.forEach(i=>{
    const a=Math.min(moneyNum(i.amount),left);
    i.payments=a>0.0004?[{date:i.due_date||todayISOForInstallment(),amount:money3(a),note:'Synced from Expense Paid BD'}]:[];
    left=money3(left-a);
  });
  const allPaid=rows.reduce((s,i)=>s+installmentPaid(i),0);
  try{await saveExpenseMetaPatch(expenseId,meta.details,rows,allPaid);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}
async function editExpenseInstallment(expenseId,instId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r);
  const inst=rows.find(i=>String(i.id)===String(instId));if(!inst)return;
  const due=prompt('Due date',inst.due_date||'');if(due===null)return;
  const amountRaw=prompt('Installment amount BD',moneyNum(inst.amount).toFixed(3));if(amountRaw===null)return;
  const amount=money3(amountRaw);
  const paid=installmentPaid(inst);
  if(amount<=0){alert('Installment amount must be greater than zero.');return;}
  if(amount-paid < -0.0004){alert('Installment amount cannot be less than already paid amount.');return;}
  const note=prompt('Note',inst.note||'');if(note===null)return;
  inst.due_date=(due||'').trim();inst.amount=amount;inst.note=(note||'').trim();
  const planRemaining=rows.reduce((s,i)=>s+installmentRemaining(i),0);
  if(planRemaining-calcRemaining(r)>0.0004){alert('Installment plan cannot exceed expense remaining by '+BD(planRemaining-calcRemaining(r))+'.');return;}
  try{await saveExpenseMetaPatch(expenseId,meta.details,rows);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}
async function deleteExpenseInstallment(expenseId,instId){
  const r=expenses.find(x=>String(x.id)===String(expenseId));if(!r)return;
  const meta=expenseMeta(r);
  const rows=expenseInstallments(r);
  const inst=rows.find(i=>String(i.id)===String(instId));if(!inst)return;
  if(installmentPaid(inst)>0.0004){alert('This installment has payments. Delete is blocked to protect the payment history.');return;}
  if(!confirm('Delete this installment?'))return;
  const next=rows.filter(i=>String(i.id)!==String(instId));
  try{await saveExpenseMetaPatch(expenseId,meta.details,next);viewExpenseInstallments(expenseId);}catch(e){showError('Error',e);}
}
function expTblHTML(data){
  if(!data.length)return '<p style="color:var(--muted);padding:12px">No records</p>';
  return '<table><thead><tr><th>Date</th><th>Due</th><th>Category</th><th>Supplier</th><th>Qty</th><th>Amount</th><th>Paid</th><th>Status</th><th>Details</th><th>Installments</th><th>Actions</th></tr></thead><tbody>'+ 
    data.map(function(r){
      return '<tr>'+ 
        '<td>'+fmt(r.date)+'</td>'+ 
        '<td>'+(r.due_date?'<span style="color:var(--red);font-weight:700">'+fmt(r.due_date)+'</span>':'&mdash;')+'</td>'+ 
        '<td><span class="badge badge-amber">'+esc(r.category||'')+'</span></td>'+ 
        '<td>'+esc(r.supplier||'&mdash;')+'</td>'+ 
        '<td>'+esc(r.qty||1)+'</td>'+ 
        '<td class="money-red">'+BD(r.amount_bd)+'</td>'+ 
        '<td>'+BD(r.paid_bd)+'</td>'+ 
        '<td><span class="badge '+(r.status==='Paid'?'badge-green':'badge-red')+'">'+esc(r.status||'Pending')+'</span></td>'+ 
        '<td>'+expenseDetailsCell(r)+'</td>'+ 
        '<td>'+expenseInstallmentsCell(r)+'</td>'+ 
        '<td style="white-space:nowrap">'+
          '<button class="action-btn" style="background:#E8EAF0;color:var(--navy)" onclick="editExpense('+r.id+')">&#9999;&#65039;</button>'+ 
          (r.status!=='Paid'?'<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="markPaid(&apos;expenses&apos;,'+r.id+','+r.amount_bd+')">&#9989;</button>':'')+
          '<button class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="delRec(&apos;expenses&apos;,'+r.id+')">&#128465;&#65039;</button>'+ 
        '</td>'+ 
      '</tr>';
    }).join('')+'</tbody></table>';
}

function renderExpenses(){
  const q=(document.getElementById('expSearch').value||'').toLowerCase();
  const ca=document.getElementById('expCatFilter').value;
  const st=document.getElementById('expStFilter').value;
  let data=expenses.filter(r=>{const m=!q||expenseSearchText(r).includes(q);return m&&(!ca||normalizeActivityCategory(r.category)===ca)&&(!st||r.status===st);});
  document.getElementById('expCount').textContent=data.length;
  // Remaining amount for filtered expense rows
  const totalExpense = data.reduce((s,r) => s + calcRemaining(r), 0);
  document.getElementById('expTotalAmt').textContent='Remaining: '+BD(totalExpense);
  const pages=Math.ceil(data.length/PER)||1;expPage=Math.min(expPage,pages);
  document.getElementById('expTable').innerHTML=expTblHTML([...data].reverse().slice((expPage-1)*PER,expPage*PER));
  renderPag('expPag',pages,expPage,p=>{expPage=p;renderExpenses();});
}
async function addExpense(){
  const date=document.getElementById('exp-date').value;
  const sup=document.getElementById('exp-supplier').value.trim();
  const qty=parseFloat(document.getElementById('exp-qty').value)||1;
  const inv=collectInvoiceData('exp');
  const invTotal=money3(invoiceTotal(inv));
  const manualAmt=parseFloat(document.getElementById('exp-amount').value)||0;
  const total=invTotal>0?invTotal:money3(qty*manualAmt);
  const amt=qty>0?money3(total/qty):total;
  if(invTotal>0){
    document.getElementById('exp-amount').value=amt.toFixed(3);
    document.getElementById('exp-total').value=total.toFixed(3);
  }
  if(!date||!sup||total<=0){alert('Fill: Date, Supplier, and either Amount or Invoice lines');return;}
  const paid=parseFloat(document.getElementById('exp-paid').value)||0;
  if(!validatePaymentInput(total,paid,'Expense'))return;
  if(!document.getElementById('exp-cat').value){alert('Fill: Category');return;}
  const btn=document.getElementById('expSaveBtn');btn.disabled=true;btn.textContent='Saving...';
  try{
    await sbPost('expenses',{date,due_date:document.getElementById('exp-due').value||null,category:normalizeActivityCategory(document.getElementById('exp-cat').value),supplier:sup,qty,amount_bd:total,paid_bd:paid,horse:document.getElementById('exp-horse').value||null,notes:buildExpenseNotes(document.getElementById('exp-notes').value||'',[],inv),status:normalizePaidStatus(total,paid)});
    ['exp-date','exp-due','exp-supplier','exp-amount','exp-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('exp-qty').value='1';document.getElementById('exp-paid').value='0';document.getElementById('exp-total').value='';renderInvoiceEditor('exp',null);
    await loadAll();
  }catch(e){showError('Error',e);}
  finally{btn.disabled=false;btn.textContent='Save to Database';}
}
// ══════════════════════════════════════════════════════════
// WHATSAPP PAYMENT REMINDERS 📱
// ══════════════════════════════════════════════════════════
function waPhone(raw){
  if(!raw) return null;
  let d=String(raw).replace(/[^0-9]/g,'');
  if(d.startsWith('00973')) d=d.slice(2);
  if(d.length===8) d='973'+d;           // Bahrain local number
  if(d.length<10||d.length>15) return null;
  return d;
}
function findContactForIncome(r){
  // 1. Public intake phone is stored outside finance notes.
  const request=bookingRequestForIncome(r);
  if(request?.phone){const p=waPhone(request.phone);if(p)return p;}
  // 2. Horse owner contact from horses table
  if(r.horse_name){
    const h=horses.find(x=>x.horse_name===r.horse_name);
    if(h&&h.contact){const p=waPhone(h.contact);if(p)return p;}
  }
  // 3. Legacy rows may still contain a phone in their text fields.
  const src=(r.customer_name||'')+' '+(r.notes||'');
  const m=src.match(/(?:\+?973[\s-]?)?(3\d{7}|6\d{7}|7\d{7})/);
  if(m) return waPhone(m[1]);
  return null;
}
function sendWhatsAppReminder(id){
  const r=income.find(x=>String(x.id)===String(id));
  if(!r){alert('Record not found');return;}
  let phone=findContactForIncome(r);
  if(!phone){
    const entered=prompt('No phone found for "'+(r.customer_name||'')+'".\nEnter WhatsApp number (e.g. 39001234):');
    if(!entered) return;
    phone=waPhone(entered);
    if(!phone){alert('Invalid phone number');return;}
  }
  const name=(r.customer_name||'Customer').split('|')[0].trim();
  const total=parseFloat(r.amount_bd)||0;
  const paid=parseFloat(r.paid_bd)||0;
  const remaining=Math.max(0,total-paid);
  const due=fmt(r.due_date);
  const horse=r.horse_name?(' — '+r.horse_name):'';
  const msg=
'🐴 *Country Club Equestrian*\n'+
'──────────────\n'+
'Dear '+name+',\n'+
'This is a kind reminder regarding your payment ('+(r.activity||'')+horse+') due on *'+due+'*:\n\n'+
'💰 Total Due: *'+BD(total)+'*\n'+
'✅ Paid: *'+BD(paid)+'*\n'+
'⏳ Remaining: *'+BD(remaining)+'*\n\n'+
'Thank you 🙏\n'+
'──────────────\n'+
'عزيزي '+name+'،\n'+
'نذكّركم بلطف بالدفعة المستحقة ('+(r.activity||'')+horse+') بتاريخ *'+due+'*:\n\n'+
'💰 المبلغ المستحق: *'+BD(total)+'*\n'+
'✅ المدفوع: *'+BD(paid)+'*\n'+
'⏳ المتبقي: *'+BD(remaining)+'*\n\n'+
'شكراً لكم 🙏';
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');
}

// ── Broadcast: one grouped message per customer, sent one-by-one ──
function buildWaGroups(){
  const ov=income.filter(isOverdueRow);
  const groups={};
  ov.forEach(r=>{
    const name=(r.customer_name||'Customer').split('|')[0].trim();
    if(!groups[name])groups[name]={name,phone:null,items:[],total:0,paid:0};
    const g=groups[name];
    if(!g.phone)g.phone=findContactForIncome(r);
    g.items.push(r);
    g.total+=parseFloat(r.amount_bd)||0;
    g.paid+=parseFloat(r.paid_bd)||0;
  });
  return Object.values(groups);
}
function waGroupMessage(g){
  const remaining=Math.max(0,g.total-g.paid);
  let lines=g.items.map(r=>{
    const rem=Math.max(0,(parseFloat(r.amount_bd)||0)-(parseFloat(r.paid_bd)||0));
    return '• '+(r.activity||'')+(r.horse_name?' — '+r.horse_name:'')+' ('+fmt(r.due_date)+'): *'+BD(rem)+'*';
  }).join('\n');
  return '🐴 *Country Club Equestrian*\n'+
'──────────────\n'+
'Dear '+g.name+',\n'+
'This is a kind reminder of your outstanding payments:\n\n'+
lines+'\n\n'+
'💰 Total Due: *'+BD(g.total)+'*\n'+
'✅ Paid: *'+BD(g.paid)+'*\n'+
'⏳ Remaining: *'+BD(remaining)+'*\n\n'+
'Thank you 🙏\n'+
'──────────────\n'+
'عزيزي '+g.name+'،\n'+
'نذكّركم بلطف بالدفعات المستحقة:\n\n'+
lines+'\n\n'+
'💰 المبلغ المستحق: *'+BD(g.total)+'*\n'+
'✅ المدفوع: *'+BD(g.paid)+'*\n'+
'⏳ المتبقي: *'+BD(remaining)+'*\n\n'+
'شكراً لكم 🙏';
}
function startWaBroadcast(){
  const groups=buildWaGroups();
  if(!groups.length){alert('✅ No pending overdue payments!');return;}
  const rows=groups.map((g,i)=>{
    const remaining=Math.max(0,g.total-g.paid);
    const phoneBadge=g.phone?'':'<span style="font-size:10px;background:#FDECEA;color:var(--red);border-radius:6px;padding:2px 6px">no phone</span>';
    return `<div id="wa-row-${i}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div style="min-width:0">
        <div style="font-weight:700;font-size:13px;color:var(--navy)">${esc(g.name)} ${phoneBadge}</div>
        <div style="font-size:11px;color:var(--muted)">${g.items.length} payment(s) — remaining <b style="color:var(--red)">${BD(remaining)}</b></div>
      </div>
      <button class="action-btn" style="background:#25D366;color:#fff;padding:8px 14px;flex-shrink:0" onclick="waSendGroup(${i})">&#128172; Send</button>
    </div>`;
  }).join('');
  window._waGroups=groups;
  openModal('&#128172; Send to All — '+groups.length+' customer(s)',`
    <div style="font-size:12px;color:var(--muted);background:var(--sand);border-radius:8px;padding:10px;margin-bottom:12px">
      ℹ️ WhatsApp opens one chat at a time. Tap <b>Send</b> for each customer — one combined message covers all their payments.
    </div>
    <div style="max-height:50vh;overflow-y:auto">${rows}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Done</button></div>`);
}
function waSendGroup(i){
  const g=window._waGroups&&window._waGroups[i];
  if(!g)return;
  let phone=g.phone;
  if(!phone){
    const entered=prompt('Enter WhatsApp number for '+g.name+' (e.g. 39001234):');
    if(!entered)return;
    phone=waPhone(entered);
    if(!phone){alert('Invalid phone number');return;}
    g.phone=phone;
  }
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(waGroupMessage(g)),'_blank');
  const row=document.getElementById('wa-row-'+i);
  if(row){row.style.background='#E8F5EE';row.style.borderColor='var(--green)';
    const btn=row.querySelector('button');if(btn){btn.textContent='✓ Sent';btn.style.background='var(--green)';}}
}

function renderOverdue(){
  const expData=expenses.filter(isOverdueRow);
  const incData=income.filter(isOverdueRow);
  const totalExp=expData.reduce((s,r)=>s+expenseOverdueAmount(r),0);
  const totalInc=incData.reduce((s,r)=>s+calcRemaining(r),0);
  let html='';
  if(!expData.length&&!incData.length){
    html='<p style="color:var(--green);font-weight:700;padding:12px">&#10003; No overdue payments!</p>';
  } else {
    if(incData.length){
      html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px"><div style="font-weight:700;color:var(--navy);font-size:14px">&#128176; Overdue Income</div><button class="action-btn" style="background:#25D366;color:#fff;padding:7px 16px;font-weight:700" onclick="startWaBroadcast()">&#128172; Send to All</button></div>';
      html+='<div style="margin-bottom:10px"><span class="badge badge-amber" style="font-size:13px;padding:5px 14px">Remaining Total: '+BD(totalInc)+'</span></div>';
      html+='<div class="tbl-wrap" style="margin-bottom:20px"><table><thead><tr><th>Date</th><th>Due Date</th><th>Customer</th><th>Horse</th><th>Category</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Action</th></tr></thead><tbody>'+
        incData.map(r=>`<tr><td>${fmt(r.date)}</td><td style="color:var(--red);font-weight:700">${expenseOverdueDueHTML(r)}</td><td>${esc(r.customer_name||'—')}</td><td>${esc(r.horse_name||'—')}</td><td><span class="badge badge-amber">${esc(r.activity||'')}</span></td><td class="money-green">${BD(r.amount_bd)}</td><td>${BD(r.paid_bd)}</td><td class="money-red">${BD(calcRemaining(r))}</td><td style="white-space:nowrap"><button class="action-btn" style="background:#E8F5EE;color:var(--green);padding:6px 12px" onclick="markPaid('income',${r.id},${r.amount_bd})">&#9989; Mark Paid</button> <button class="action-btn" style="background:#25D366;color:#fff;padding:6px 12px" title="Send WhatsApp reminder" onclick="sendWhatsAppReminder('${r.id}')">&#128172; Remind</button></td></tr>`).join('')+
        '</tbody></table></div>';
    }
    if(expData.length){
      html+='<div style="font-weight:700;color:var(--navy);margin-bottom:8px;font-size:14px">&#128184; Overdue Expenses</div>';
      html+='<div style="margin-bottom:10px"><span class="badge badge-red" style="font-size:13px;padding:5px 14px">Due Now Total: '+BD(totalExp)+'</span></div>';
      html+='<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Due Date</th><th>Category</th><th>Supplier</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Due Now</th><th>Details</th><th>Installments</th><th>Action</th></tr></thead><tbody>'+
        expData.map(r=>`<tr><td>${fmt(r.date)}</td><td style="color:var(--red);font-weight:700">${expenseOverdueDueHTML(r)}</td><td><span class="badge badge-amber">${esc(r.category||'')}</span></td><td>${esc(r.supplier||'—')}</td><td class="money-red">${BD(r.amount_bd)}</td><td>${BD(r.paid_bd)}</td><td class="money-red">${BD(calcRemaining(r))}</td><td class="money-red">${BD(expenseOverdueAmount(r))}</td><td>${expenseDetailsCell(r)}</td><td>${expenseInstallmentsCell(r)}</td><td><button class="action-btn" style="background:#E8F5EE;color:var(--green);padding:6px 12px" onclick="markPaid('expenses',${r.id},${r.amount_bd})">&#9989; Mark Paid</button></td></tr>`).join('')+
        '</tbody></table></div>';
    }
  }
  document.getElementById('overdueList').innerHTML=html;
}

function renderHorses(){
  const q=(document.getElementById('horseSearch').value||'').toLowerCase();
  const st=document.getElementById('horseStFilter').value;
  const data=horses.filter(h=>{if(!h.horse_name)return false;const m=!q||(h.horse_name||'').toLowerCase().includes(q)||(h.owner||'').toLowerCase().includes(q);return m&&(!st||h.status===st);});
  document.getElementById('horsesGrid').innerHTML=data.map(h=>{
    const hid=h.id;
    const st=h.status||'';
    const stBadge=st==='Available'?'badge-green':st==='Out'?'badge-amber':st==='Sold'?'badge-navy':'badge-red';
    const healthProfile=typeof healthProfileFor==='function'?healthProfileFor(hid):null;
    const healthChip=healthProfile&&typeof healthStatusHTML==='function'?healthStatusHTML(healthProfile.health_status||'Healthy'):'';
    const today=new Date(); today.setHours(0,0,0,0);
    function daysSince(d){if(!d)return null;const dt=new Date(d);dt.setHours(0,0,0,0);return Math.floor((today-dt)/(86400000));}
    const fDays=daysSince(h.farrier_date); const wDays=daysSince(h.deworm_date); const vDays=daysSince(h.vaccine_date);
    const fOver=fDays!==null&&fDays>30; const wOver=wDays!==null&&wDays>90; const vOver=vDays!==null&&vDays>150;
    const chips=[
      parseFloat(h.livery_bd)>0?'<span style="font-size:11px;background:#EEF2FF;color:#1A2744;border-radius:6px;padding:2px 7px;font-weight:600">&#127968; '+BD(h.livery_bd)+'</span>':'',
      parseFloat(h.ac_livery_bd)>0?'<span style="font-size:11px;background:#EEF2FF;color:#1A2744;border-radius:6px;padding:2px 7px;font-weight:600">&#10052; '+BD(h.ac_livery_bd)+'</span>':'',
      h.end_date?'<span style="font-size:11px;background:#FDECEA;color:#C0392B;border-radius:6px;padding:2px 7px;font-weight:600">&#128682; End: '+fmt(h.end_date)+'</span>':'',
      h.farrier_date?'<span style="font-size:11px;background:'+(fOver?'#FDECEA':'#F0F4F0')+';color:'+(fOver?'#C0392B':'#2E7D52')+';border-radius:6px;padding:2px 7px;font-weight:600">&#128295; '+fmt(h.farrier_date)+(fOver?' &#9888;':'')+'</span>':'',
      h.deworm_date?'<span style="font-size:11px;background:'+(wOver?'#FDECEA':'#F0F4F0')+';color:'+(wOver?'#C0392B':'#2E7D52')+';border-radius:6px;padding:2px 7px;font-weight:600">&#128027; '+fmt(h.deworm_date)+(wOver?' &#9888;':'')+'</span>':'',
      h.vaccine_date?'<span style="font-size:11px;background:'+(vOver?'#FDECEA':'#F0F4F0')+';color:'+(vOver?'#C0392B':'#2E7D52')+';border-radius:6px;padding:2px 7px;font-weight:600">&#128137; '+fmt(h.vaccine_date)+(vOver?' &#9888;':'')+'</span>':'',
    ].filter(Boolean).join('');
    return `<div class="horse-card" style="display:flex;align-items:center;gap:12px;padding:12px 14px"><div style="font-size:26px;flex-shrink:0">&#128052;</div><div style="flex:1;min-width:0"><div class="horse-name" style="font-size:14px">${esc(h.horse_name)}</div><div class="horse-meta">${esc(h.owner||'—')} &middot; #${esc(h.stable_no||'—')}</div><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px"><span class="badge ${stBadge}" style="cursor:pointer" title="Operational status — click to change" onclick="toggleHorse(${hid},${jsStr(st)})">${esc(st||'—')}</span>${healthChip}${chips}</div></div><div style="display:flex;gap:6px;flex-shrink:0;align-items:center"><button class="action-btn horse-profile-btn" title="Health Profile" onclick="openHorseHealthProfile(${hid})">&#129658;</button><button class="action-btn" style="background:#E8EAF0;color:var(--navy);padding:8px 10px;font-size:15px" title="Edit" onclick="editHorse(${hid})">&#9999;&#65039;</button><button class="action-btn" style="background:#FDECEA;color:var(--red);padding:8px 10px;font-size:15px" title="Delete" onclick="delRec('horses',${hid})">&#128465;&#65039;</button></div></div></div>`;
  }).join('')||'<p style="color:var(--muted);padding:12px">No horses found</p>';
}
async function addHorse(){
  const name=document.getElementById('h-name').value.trim();
  const owner=document.getElementById('h-owner').value.trim();
  if(!name||!owner){alert('Fill: Horse Name and Owner');return;}
  const btn=document.getElementById('horseSaveBtn');btn.disabled=true;btn.textContent='Saving...';
  try{
    await sbPost('horses',{stable_no:document.getElementById('h-stable').value||null,status:document.getElementById('h-status').value,horse_name:name,owner,contact:document.getElementById('h-contact').value||null,sex:document.getElementById('h-sex').value||null,color:document.getElementById('h-color').value||null,breed:document.getElementById('h-breed').value||null,livery_bd:parseFloat(document.getElementById('h-livery').value)||0,start_date:document.getElementById('h-start').value||null});
    ['h-stable','h-name','h-owner','h-contact','h-color','h-breed'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('h-livery').value='0';
    await loadAll();
  }catch(e){showError('Error',e);}
  finally{btn.disabled=false;btn.textContent='Save to Database';}
}
async function toggleHorse(id,cur){
  const opts=['Available','Out','Sold','Dead'];
  const idx=opts.indexOf(cur);
  const ns=opts[(idx+1)%opts.length];
  if(!confirm('Change status to "'+ns+'"?'))return;
  await sbPatch('horses',id,{status:ns});await loadAll();
}
function buildAlerts(){
  const bell=document.getElementById('alertBell');
  const count=document.getElementById('alertBellCount');
  const list=document.getElementById('alertsList');
  if(!bell||!count||!list)return;

  if(currentPage==='home'&&!window.CCE_MEMBER){
    count.textContent='0';
    list.innerHTML='<div style="padding:20px;text-align:center;color:var(--green);font-weight:700">✓ All clear — no alerts!</div>';
    return;
  }

  const access=window.CCE_MEMBER||null;
  const role=String(access?.role?.code||access?.portal||'').toLowerCase();
  const isOwner=['owner','horse_owner'].includes(role);
  const isTrainer=['trainer','instructor','staff','operations'].includes(role);
  const today=new Date(); today.setHours(0,0,0,0);
  const alerts=[];

  const normalize=v=>String(v||'').trim().toLowerCase();
  const ownerName=access?.profile?.owner_name||access?.profile?.full_name||'';
  const trainerName=access?.instructor_name||access?.profile?.full_name||currentInstructor?.name||'';
  const trainerId=access?.profile?.instructor_id||currentInstructor?.id||null;
  const summaryLines=(rows,format,limit=6)=>{
    const visible=rows.slice(0,limit).map(format);
    if(rows.length>limit)visible.push(`+ ${rows.length-limit} more`);
    return visible.join('\n');
  };

  const openOwner=()=>navigate('owner');
  const openTrainer=()=>navigate('instructor');
  const openAdmin=page=>showDashPage(page,null);

  const scopedHorseRows=isOwner?(Array.isArray(ownerHorses)?ownerHorses:[]):horses;
  const myHorses=window.CCE?.health?.mergeCompletedSummaries
    ? CCE.health.mergeCompletedSummaries(scopedHorseRows,horse_health_events)
    : scopedHorseRows;

  // Administration receives all unprocessed public requests.
  if(!isOwner&&!isTrainer){
    const pendingBooks=pendingBookingRequests();
    if(pendingBooks.length){
      alerts.push({
        type:'blue',icon:'📋',
        title:`${pendingBooks.length} pending booking request${pendingBooks.length>1?'s':''}`,
        desc:summaryLines(pendingBooks,r=>(r.customer_name||'Unknown')+' — '+(r.service_name||r.activity||r.horse_name||'Booking')+' ('+(r.start_time||fmt(r.requested_date||r.date))+')'),
        count:pendingBooks.length,
        action:()=>openAdmin('bookings')
      });
    }
  }

  // Trainers receive their upcoming lessons and rides, plus newly pending ride/training requests.
  if(isTrainer){
    const cutoff=new Date(today); cutoff.setDate(cutoff.getDate()+7);
    const mySessions=schedule_data.filter(r=>{
      const date=new Date(r.date); date.setHours(0,0,0,0);
      const assigned=(trainerId&&String(r.instructor_id||'')===String(trainerId))||normalize(r.instructor)===normalize(trainerName);
      return assigned&&date>=today&&date<=cutoff&&!['Done','Cancelled'].includes(r.status);
    });
    if(mySessions.length){
      alerts.push({
        type:'blue',icon:'📅',
        title:`${mySessions.length} upcoming session${mySessions.length>1?'s':''}`,
        desc:summaryLines(mySessions,r=>`${fmt(r.date)} ${r.start_time||''} — ${r.activity||'Session'}${r.horse_name?' · '+r.horse_name:''}`,8),
        count:mySessions.length,
        action:openTrainer
      });
    }
    const canViewBookings=typeof window.canUser!=='function'||window.canUser('bookings.view')||window.canUser('income.view');
    const pendingRides=canViewBookings?pendingBookingRequests().filter(row=>{
      const requestType=row.request_type||bookingRequestForIncome(row)?.request_type;
      return requestType?['ride','training'].includes(requestType):!String(row.notes||'').includes('LIVERY REQUEST');
    }):[];
    if(pendingRides.length){
      alerts.push({
        type:'amber',icon:'🏇',
        title:`${pendingRides.length} ride/training request${pendingRides.length>1?'s':''} awaiting scheduling`,
        desc:'Open Operations to review the latest requests.',
        count:pendingRides.length,
        action:openTrainer
      });
    }
  }

  // Health alerts: administration sees every active horse; owners see only their own horses.
  if(!isTrainer){
    const visibleHorseIds=new Set(myHorses.map(h=>String(h.id)));
    const canViewHealthDetails=typeof window.canUser!=='function'||['horse_health.view','horse_medical.view','horse_vaccinations.view','horse_care.view','horse_events.view'].some(permission=>window.canUser(permission));
    const visibleHealthProfiles=canViewHealthDetails?(horse_health_profiles||[]):[];
    const visibleHealthEvents=canViewHealthDetails?(horse_health_events||[]):[];
    const healthDestination=horse=>isOwner?openOwner:()=>{
      if(typeof window.canUser==='function'&&window.canUser('horse_health.view'))showDashPage('health',null);
      else openAdmin('horses');
      if(typeof openHorseHealthProfile==='function'&&horse)setTimeout(()=>openHorseHealthProfile(horse.id),0);
    };
    visibleHealthProfiles.filter(profile=>visibleHorseIds.has(String(profile.horse_id))&&['Critical','Injured','Under Treatment','Isolation'].includes(profile.health_status)).forEach(profile=>{
      const horse=myHorses.find(item=>String(item.id)===String(profile.horse_id));
      if(!horse)return;
      alerts.push({
        type:profile.health_status==='Critical'?'red':'amber',icon:'✚',
        title:`${profile.health_status} — ${horse.horse_name||'Unknown'}`,
        desc:profile.diagnosis||profile.medical_notes||'Health follow-up required',
        action:healthDestination(horse)
      });
    });
    visibleHealthEvents.filter(event=>{
      if(!visibleHorseIds.has(String(event.horse_id))||['Completed','Cancelled'].includes(event.status)||!event.due_date)return false;
      const due=new Date(event.due_date+'T00:00:00');
      return !Number.isNaN(due.getTime())&&Math.ceil((due-today)/86400000)<=14;
    }).forEach(event=>{
      const horse=myHorses.find(item=>String(item.id)===String(event.horse_id));
      if(!horse)return;
      const due=new Date(event.due_date+'T00:00:00');
      const days=Math.ceil((due-today)/86400000);
      const overdue=days<0||event.status==='Overdue';
      alerts.push({
        type:overdue||event.priority==='Urgent'?'red':'amber',icon:event.event_type==='Farrier'?'🔧':'✚',
        title:`${overdue?'Overdue':'Due soon'}: ${event.title||event.event_type} — ${horse.horse_name||'Unknown'}`,
        desc:`${event.event_type} · ${fmt(event.due_date)}${event.assigned_to?' · '+event.assigned_to:''}`,
        action:healthDestination(horse)
      });
    });
    myHorses.filter(h=>h.status==='Available').forEach(h=>{
      const name=h.horse_name||'Unknown';
      const destination=isOwner?openOwner:()=>openAdmin('horses');
      const dateAlert=(field,daysLimit,type,icon,title,extra='')=>{
        if(!h[field])return;
        const d=new Date(h[field]);d.setHours(0,0,0,0);
        const days=Math.floor((today-d)/(1000*60*60*24));
        if(days>daysLimit)alerts.push({type,icon,title:`${title} — ${name}`,desc:`Last: ${fmt(h[field])} (${days} days ago)${extra}`,action:destination});
      };
      dateAlert('farrier_date',30,'red','🔧','Farrier overdue',h.farrier_name?' · '+h.farrier_name:'');
      dateAlert('deworm_date',90,'amber','◉','Deworming overdue');
      dateAlert('vaccine_date',150,'red','✚','Vaccine overdue',h.vaccine_dr?' · Dr. '+h.vaccine_dr:'');
      dateAlert('teeth_date',180,'amber','◇','Teeth check overdue');

      const missing=[];
      if(!h.farrier_date)missing.push('Farrier');
      if(!h.deworm_date)missing.push('Deworming');
      if(!h.vaccine_date)missing.push('Vaccine');
      if(!h.teeth_date)missing.push('Teeth');
      if(missing.length)alerts.push({type:'amber',icon:'!',title:`Missing health dates — ${name}`,desc:missing.join(' · '),action:destination});
    });
  }

  // Owners also receive unpaid financial items that match their profile name.
  if(isOwner&&(typeof window.canUser!=='function'||window.canUser('income.view'))){
    const unpaid=income.filter(r=>normalize(r.customer_name)===normalize(ownerName)&&r.status!=='Paid');
    if(unpaid.length){
      const total=unpaid.reduce((sum,r)=>sum+(parseFloat(r.amount_bd)||0),0);
      alerts.push({type:'amber',icon:'BD',title:`${unpaid.length} pending payment${unpaid.length>1?'s':''}`,desc:`Pending total: ${BD(total)}`,action:openOwner});
    }
  }

  const actionableCount=alerts.reduce((sum,alert)=>sum+(Number(alert.count)||1),0);
  count.textContent=String(actionableCount);
  bell.setAttribute('aria-label',`Notifications: ${actionableCount}`);
  bell.classList.toggle('has-alerts',alerts.length>0);
  if(!alerts.length){
    list.innerHTML='<div style="padding:20px;text-align:center;color:var(--green);font-weight:700">✓ All clear — no alerts!</div>';
    window._alertActions=[];
    return;
  }

  list.innerHTML=alerts.map((a,i)=>`
    <div class="alert-item alert-${a.type}" style="cursor:pointer" onclick="handleAlertClick(${i})">
      <div class="alert-icon">${esc(a.icon)}</div>
      <div class="alert-text">
        <div class="alert-title">${esc(a.title)}</div>
        <div class="alert-desc" style="white-space:pre-line">${esc(a.desc)}</div>
      </div>
    </div>`).join('');
  window._alertActions=alerts.map(a=>a.action);
}

function handleAlertClick(i){
  toggleAlertsPanel();
  if(window._alertActions&&window._alertActions[i]) window._alertActions[i]();
}

function toggleAlertsPanel(){
  const panel=document.getElementById('alertsPanel');
  if(!panel)return;
  if(window.CCEHeaderSystem?.syncHeaderMetrics) window.CCEHeaderSystem.syncHeaderMetrics();
  const bell=document.getElementById('alertBell');
  const isOpen=panel.classList.toggle('open');
  panel.setAttribute('aria-hidden',isOpen?'false':'true');
  if(bell)bell.setAttribute('aria-expanded',isOpen?'true':'false');
  // Close when clicking outside without hiding the panel behind the header.
  if(window._cceAlertsOutsideHandler){
    document.removeEventListener('pointerdown',window._cceAlertsOutsideHandler,true);
    window._cceAlertsOutsideHandler=null;
  }
  if(isOpen){
    setTimeout(()=>{
      const handler=(e)=>{
        if(!panel.contains(e.target)&&!(bell&&bell.contains(e.target))){
          panel.classList.remove('open');
          panel.setAttribute('aria-hidden','true');
          if(bell)bell.setAttribute('aria-expanded','false');
          document.removeEventListener('pointerdown',handler,true);
          if(window._cceAlertsOutsideHandler===handler)window._cceAlertsOutsideHandler=null;
        }
      };
      window._cceAlertsOutsideHandler=handler;
      document.addEventListener('pointerdown',handler,true);
    },60);
  }
}

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const panel=document.getElementById('alertsPanel');
  const bell=document.getElementById('alertBell');
  if(!panel?.classList.contains('open'))return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden','true');
  if(bell){bell.setAttribute('aria-expanded','false');bell.focus();}
});

function renderBreeding(){
  const q=(document.getElementById('breedSearch').value||'').toLowerCase();
  const data=breeding.filter(r=>!q||(r.mare_name||'').toLowerCase().includes(q)||(r.owner||'').toLowerCase().includes(q));
  document.getElementById('breedList').innerHTML=data.map(r=>{
    const days=['day1','day2','day3','day4','day5','day6','day7','day8','day9'].filter(d=>r[d]).map(d=>'<div class="breed-day">&#128197; '+fmt(r[d])+'</div>').join('');
    return '<div class="breed-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><div style="font-weight:700;font-size:15px">&#128014; '+r.mare_name+'</div><div style="font-size:12px;color:var(--muted)">'+esc(r.owner||'')+' &middot; '+esc((r.mobile||'').toString().replace(/\.0$/,''))+'</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge badge-navy">'+(r.count||0)+' visits</span><button class="action-btn" style="background:#E8EAF0;color:var(--navy)" onclick="editBreeding('+r.id+')">&#9999;&#65039;</button><button class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="delRec(&apos;breeding&apos;,'+r.id+')">&#128465;&#65039;</button></div></div><div class="breed-days">'+(days||'<span style="color:var(--muted);font-size:13px">No dates</span>')+'</div></div>';
  }).join('')||'<p style="color:var(--muted);padding:12px">No records</p>';
}
async function addBreeding(){
  const mare=document.getElementById('b-mare').value.trim();
  const owner=document.getElementById('b-owner').value.trim();
  if(!mare||!owner){alert('Fill: Mare Name and Owner');return;}
  const btn=document.getElementById('breedSaveBtn');btn.disabled=true;btn.textContent='Saving...';
  try{
    await sbPost('breeding',{mare_name:mare,owner,mobile:document.getElementById('b-mobile').value||null,count:1,day1:document.getElementById('b-d1').value||null,day2:document.getElementById('b-d2').value||null,day3:document.getElementById('b-d3').value||null});
    ['b-mare','b-owner','b-mobile','b-d1','b-d2','b-d3'].forEach(id=>document.getElementById(id).value='');
    await loadAll();
  }catch(e){showError('Error',e);}
  finally{btn.disabled=false;btn.textContent='Save to Database';}
}
function renderBookings(){
  const q=(document.getElementById('bookSearch').value||'').toLowerCase();
  const bt=document.getElementById('bookTypeFilter').value;
  const st=document.getElementById('bookStFilter').value;
  // Finance and booking state are displayed independently. Legacy rows remain
  // readable until they are migrated to booking_requests.
  let data=income.filter(r=>{
    if(!isPublicBookingIncome(r))return false;
    const request=bookingRequestForIncome(r);
    const notes=String(r.notes||'');
    const requestType=request?.request_type||(notes.includes('TRAINING REQUEST')?'training':notes.includes('LIVERY REQUEST')?'livery':'ride');
    if(bt&&requestType!==bt)return false;
    const haystack=[r.customer_name,r.horse_name,notes,request?.phone,request?.service_name,request?.status].join(' ').toLowerCase();
    const visibleStatus=request?.status||r.status;
    return (!q||haystack.includes(q))&&(!st||visibleStatus===st||r.status===st);
  });
  document.getElementById('bookCount').textContent=data.length;
  const pages=Math.ceil(data.length/PER)||1;bookPage=Math.min(bookPage,pages);
  const pageData=[...data].reverse().slice((bookPage-1)*PER,bookPage*PER);
  if(!pageData.length){document.getElementById('bookTable').innerHTML='<p style="color:var(--muted);padding:12px">No booking requests found</p>';document.getElementById('bookPag').innerHTML='';return;}
  document.getElementById('bookTable').innerHTML='<table><thead><tr><th>Date</th><th>Type</th><th>Customer</th><th>Horse</th><th>Time</th><th>Package / Notes</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
    pageData.map(r=>{
      const notes=String(r.notes||'');
      const request=bookingRequestForIncome(r);
      const requestType=request?.request_type||(notes.includes('TRAINING REQUEST')?'training':notes.includes('LIVERY REQUEST')?'livery':'ride');
      const type=requestType==='training'
        ?'<span class="badge badge-navy">&#127919; Training</span>'
        :requestType==='livery'
          ?'<span class="badge badge-green">&#127968; Livery</span>'
          :'<span class="badge badge-amber">&#128052; Hack Ride</span>';
      const pkgMatch=notes.match(/Package:\s*([^|]+)/);
      const pkg=request?.service_name||(pkgMatch?pkgMatch[1].trim():'');
      const customer=request?.customer_name||r.customer_name||'—';
      const phone=request?.phone||'';
      const horse=request?.horse_name||r.horse_name||'—';
      const start=request?.start_time||r.start_time||'—';
      const bookingStatus=request?.status||'Legacy';
      const statusClass=['Completed','Confirmed','Scheduled'].includes(bookingStatus)?'badge-green':
        ['Cancelled','Rejected'].includes(bookingStatus)?'badge-red':'badge-amber';
      const safetyButton=request&&typeof window.canUser==='function'&&window.canUser('bookings.sensitive.view')
        ?'<button class="action-btn" style="background:#EEF3FF;color:var(--navy)" title="Protected rider details" onclick="viewBookingSafety('+request.id+')">&#128737;&#65039;</button>'
        :'';
      const canUpdate=request&&typeof window.canUser==='function'&&window.canUser('bookings.update');
      const canScheduleTraining=requestType==='training'&&request&&canUpdate&&
        window.canUser('schedule.create')&&!['Completed','Cancelled','Rejected'].includes(bookingStatus);
      const statusControl=canUpdate
        ?'<select aria-label="Booking status" onchange="updateBookingStatus('+request.id+',this.value)">'+
          bookingStatusOptions(bookingStatus).map(value=>'<option '+(value===bookingStatus?'selected':'')+'>'+value+'</option>').join('')+'</select>'
        :'<span class="badge '+statusClass+'">'+esc(bookingStatus)+'</span>';
      return '<tr>'+
        '<td>'+fmt(request?.requested_date||r.date)+'</td>'+
        '<td>'+type+'</td>'+
        '<td>'+esc(customer)+(phone?'<div style="font-size:11px;color:var(--muted)" dir="ltr">'+esc(phone)+'</div>':'')+'</td>'+
        '<td>'+esc(horse)+'</td>'+
        '<td>'+esc(String(start).slice(0,5))+'</td>'+
        '<td style="max-width:160px;font-size:12px;color:var(--muted)">'+esc(pkg||notes.replace(/BOOKING REQUEST — /,'').replace(/TRAINING REQUEST — /,'').replace(/LIVERY REQUEST — /,''))+'</td>'+
        '<td class="money-green">'+BD(r.amount_bd)+'</td>'+
        '<td>'+statusControl+'<div style="margin-top:4px"><span class="badge '+(isPaidRow(r)?'badge-green':'badge-red')+'">Payment: '+esc(r.status||'Pending')+'</span></div></td>'+
        '<td style="white-space:nowrap">'+
          safetyButton+
          (canScheduleTraining?'<button class="action-btn" style="background:#E8F5EE;color:var(--green)" title="Assign instructor and create package sessions" onclick="openScheduleTrainingBooking('+request.id+')">&#128197;</button>':'')+
          '<button class="action-btn" style="background:#E8EAF0;color:var(--navy)" onclick="editIncome('+r.id+')">&#9999;&#65039;</button>'+ '<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="printReceipt('+r.id+')">&#129534;</button>'+ 
          (r.status!=='Paid'?'<button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="markPaid(\'income\','+r.id+','+r.amount_bd+')">&#9989;</button>':'')+
          (!request?'<button class="action-btn" style="background:#FDECEA;color:var(--red)" onclick="delRec(\'income\','+r.id+')">&#128465;&#65039;</button>':'')+
        '</td>'+
      '</tr>';
    }).join('')+'</tbody></table>';
  renderPag('bookPag',pages,bookPage,p=>{bookPage=p;renderBookings();});
}

async function updateBookingStatus(bookingRequestId,status){
  const allowed=['Requested','Confirmed','Scheduled','Completed','Cancelled','Rejected'];
  if(!allowed.includes(status)||typeof window.canUser!=='function'||!window.canUser('bookings.update'))return;
  if(['Cancelled','Rejected'].includes(status)&&!confirm('Change this booking request to '+status+'?')){renderBookings();return;}
  try{
    await sbRpc('cce_update_booking_status',{p_booking_request_id:bookingRequestId,p_status:status});
    await loadAll();
  }catch(error){showError('Booking status',error);renderBookings();}
}

function openScheduleTrainingBooking(bookingRequestId){
  const request=(booking_requests||[]).find(row=>String(row.id)===String(bookingRequestId));
  const financial=(income||[]).find(row=>String(row.booking_request_id||'')===String(bookingRequestId));
  if(!request||request.request_type!=='training')return alert('Training booking not found.');
  const slots=Array.isArray(request.session_slots)?request.session_slots:[];
  if(!slots.length)return alert('This booking has no training session slots.');
  const existing=(schedule_data||[]).filter(row=>String(row.booking_request_id||'')===String(bookingRequestId));
  const slotList=slots.map((slot,index)=>`<li><strong>${index+1}.</strong> ${esc(fmtDisplayDate(slot.date))} · ${esc(fmtTimeShort(slot.time||''))}</li>`).join('');
  openModal('Assign Instructor & Schedule Package',`
    <div class="form-grid">
      <div class="form-group"><label>Customer</label><div><strong>${esc(request.customer_name||'—')}</strong></div></div>
      <div class="form-group"><label>Package</label><div>${esc(request.service_name||'Training')}</div></div>
      <div class="form-group"><label>Sessions</label><div>${slots.length} requested · ${existing.length} already scheduled</div></div>
      <div class="form-group"><label>Instructor *</label><select id="booking-instructor">${activeInstructorOptions(financial?.instructor_id||'')}</select></div>
      <div class="form-group" style="grid-column:1/-1"><label>Selected session slots</label><ol style="margin:0;padding-inline-start:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px">${slotList}</ol></div>
    </div>
    <div style="margin-top:12px;padding:10px;border-radius:8px;background:var(--sand);font-size:12px;color:var(--muted)">This creates or links one Schedule row per slot. It does not change Amount BD, Paid BD, or the remaining balance.</div>
    <div class="btn-row">
      <button class="btn btn-green" id="scheduleTrainingBookingBtn" onclick="scheduleTrainingBooking(${request.id})">&#128197; Assign & Schedule ${slots.length} Sessions</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function scheduleTrainingBooking(bookingRequestId){
  const trainer=selectedInstructor('booking-instructor');
  if(!trainer)return alert('Select an active instructor.');
  const button=document.getElementById('scheduleTrainingBookingBtn');
  if(button){button.disabled=true;button.textContent='Scheduling...';}
  try{
    const result=await sbRpc('cce_schedule_training_booking',{
      p_booking_request_id:bookingRequestId,
      p_instructor_id:trainer.id
    });
    closeModal();
    schedView='active';
    schedStatus='scheduled';
    await loadAll();
    alert(`✅ ${result.sessions||0} sessions assigned to ${result.instructor||trainer.name}.`);
  }catch(error){
    showError('Schedule training package',error);
    if(button){button.disabled=false;button.textContent='Assign & Schedule Sessions';}
  }
}

async function viewBookingSafety(bookingRequestId){
  if(typeof window.canUser==='function'&&!window.canUser('bookings.sensitive.view'))return;
  try{
    const result=await sbRpc('cce_booking_private_details',{p_booking_request_id:bookingRequestId});
    if(!result)throw new Error('Protected rider details were not found.');
    openModal('Protected Rider Safety Details',`<div class="form-grid">
      <div class="form-group"><label>Customer</label><div>${esc(result.customer_name||'—')}</div></div>
      <div class="form-group"><label>Phone</label><div dir="ltr">${esc(result.phone||'—')}</div></div>
      <div class="form-group"><label>Personal ID</label><div dir="ltr">${esc(result.personal_id||'—')}</div></div>
      <div class="form-group"><label>Date of Birth</label><div>${esc(result.birth_date||'—')}</div></div>
      <div class="form-group"><label>Emergency Contact</label><div dir="ltr">${esc(result.emergency_contact||'—')}</div></div>
      <div class="form-group" style="grid-column:1/-1"><label>Health / Safety Notes</label><div style="white-space:pre-wrap">${esc(result.health_notes||'None provided')}</div></div>
    </div><div style="font-size:11px;color:var(--muted);margin-top:12px">Restricted information — access is recorded in the audit log.</div>`);
  }catch(error){showError('Protected rider details',error);}
}

// Owner access is managed through unified member accounts; legacy horse passwords are no longer edited here.

function openModal(t,b){document.getElementById('modalTitle').textContent=t;document.getElementById('modalBody').innerHTML=b;document.getElementById('modalOverlay').classList.remove('hidden');}
function closeModal(){document.getElementById('modalOverlay').classList.add('hidden');}
function hOpts(sel=''){return horses.map(h=>h.horse_name).filter(Boolean).sort().map(n=>'<option value="'+escAttr(n)+'" '+(n===sel?'selected':'')+'>'+esc(n)+'</option>').join('');}
function editIncome(id){
  const r=income.find(x=>String(x.id)===String(id));if(!r)return;
  const qty=r.qty||1;const apu=qty>0?(r.amount_bd/qty):r.amount_bd;
  const splitChecked=isTrainingIncome(r)?r.training_split_enabled!==false:true;
  const splitLocked=isTrainingIncome(r)&&r.training_split_enabled===true;
  openModal('Edit Income',`<div class="form-grid">
    <div class="form-group"><label>Date</label><input type="date" id="ei-date" value="${escAttr(r.date||'')}"></div>
    <div class="form-group"><label>Due Date</label><input type="date" id="ei-due" value="${escAttr(r.due_date||'')}"></div>
    <div class="form-group"><label>Customer</label><input type="text" id="ei-cust" value="${escAttr(r.customer_name||'')}" list="ei-cl"><datalist id="ei-cl">${[...new Set(income.map(x=>x.customer_name).filter(Boolean))].sort().map(c=>'<option value="'+escAttr(c)+'">').join('')}</datalist></div>
    <div class="form-group"><label>Horse</label><select id="ei-horse"><option value="">&#8212;</option>${hOpts(r.horse_name)}</select></div>
    <div class="form-group"><label>Category</label><select id="ei-act" onchange="syncIncomeInstructorField('ei')">${CCE_CATEGORIES.map(a=>'<option '+(r.activity===a?'selected':'')+'>'+a+'</option>').join('')}</select></div>
    <div class="form-group"><label>Qty</label><input type="number" id="ei-qty" value="${qty}" min="1" oninput="cET('inc')"></div>
    <div class="form-group"><label>Amount BD (per unit)</label><input type="number" step="0.001" id="ei-amt" value="${apu.toFixed(3)}" oninput="cET('inc')"></div>
    <div class="form-group"><label>Total BD</label><input type="number" step="0.001" id="ei-total" value="${r.amount_bd}" readonly></div>
    <div class="form-group"><label>Paid BD</label><input type="number" min="0" step="0.001" id="ei-paid" value="${r.paid_bd||0}" oninput="syncIncomeInstructorField('ei')"></div>
    <div class="form-group" id="ei-training-policy-wrap"><label>Training revenue policy</label><label style="display:flex;align-items:flex-start;gap:8px;font-weight:600"><input type="checkbox" id="ei-training-split-enabled" ${splitChecked?'checked':''} ${splitLocked?'disabled':''} onchange="syncIncomeInstructorField('ei')" style="margin-top:3px"> Apply the new 50/50 stable/instructor split</label><div style="font-size:11px;color:var(--muted);margin-top:5px">Historical Lesson rows remain unchanged unless this is selected explicitly. Once a paid split is recorded it cannot be disabled.</div></div>
    <div class="form-group" id="ei-instructor-wrap"><label>Instructor *</label><select id="ei-instructor">${activeInstructorOptions(r.instructor_id,instructorNameById(r.instructor_id,''))}</select><div id="ei-training-split" style="font-size:11px;color:var(--muted);margin-top:5px"></div></div>
    <div class="form-group"><label>Start Time</label><input type="time" id="ei-start" value="${escAttr(r.start_time||'')}"></div>
    <div class="form-group"><label>End Time</label><input type="time" id="ei-end" value="${escAttr(r.end_time||'')}"></div>
    <div class="form-group"><label>Notes</label><input type="text" id="ei-notes" value="${escAttr(r.notes||'')}"></div>
  </div><div class="btn-row"><button class="btn btn-green" onclick="saveIncome(${id})">Save</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
  syncIncomeInstructorField('ei');
}
async function saveIncome(id){
  const qty=parseFloat(document.getElementById('ei-qty').value)||1;
  const amt=parseFloat(document.getElementById('ei-amt').value)||0;
  const total=qty*amt;const paid=parseFloat(document.getElementById('ei-paid').value)||0;
  if(!validatePaymentInput(total,paid,'Income'))return;
  const activity=normalizeActivityCategory(document.getElementById('ei-act').value);
  const splitEnabled=isTrainingIncome({activity})&&!!document.getElementById('ei-training-split-enabled')?.checked;
  const trainer=selectedInstructor('ei-instructor');
  if(splitEnabled&&paid>0&&!trainer){alert('Select an active instructor before recording a training payment.');return;}
  try{await sbPatch('income',id,{date:document.getElementById('ei-date').value||null,due_date:document.getElementById('ei-due').value||null,customer_name:document.getElementById('ei-cust').value,horse_name:document.getElementById('ei-horse').value||null,activity,qty,amount_bd:total,paid_bd:paid,training_split_enabled:splitEnabled,instructor_id:splitEnabled?(trainer?.id||null):null,start_time:document.getElementById('ei-start').value||null,end_time:document.getElementById('ei-end').value||null,notes:document.getElementById('ei-notes').value||null,status:normalizePaidStatus(total,paid)});closeModal();await loadAll();}catch(e){showError('Error',e);}
}
function editExpense(id){
  const r=expenses.find(x=>x.id===id);if(!r)return;
  const qty=r.qty||1;const apu=qty>0?(r.amount_bd/qty):r.amount_bd;
  const plan=expensePlanTotals(r);const hasPlan=plan.count>0;const paidValue=hasPlan?Math.max(plan.paid,moneyNum(r.paid_bd)):(r.paid_bd||0);
  openModal('Edit Expense',`<div class="form-grid">
    <div class="form-group"><label>Date</label><input type="date" id="ee-date" value="${r.date||''}"></div>
    <div class="form-group"><label>Due Date</label><input type="date" id="ee-due" value="${r.due_date||''}"></div>
    <div class="form-group"><label>Category</label><select id="ee-cat">${CCE_CATEGORIES.map(c=>'<option '+(r.category===c?'selected':'')+'>'+c+'</option>').join('')}</select></div>
    <div class="form-group"><label>Supplier</label><input type="text" id="ee-sup" value="${r.supplier||''}"></div>
    <div class="form-group"><label>Qty</label><input type="number" id="ee-qty" value="${qty}" min="1" oninput="syncExpenseInvoiceTotals('ee')"></div>
    <div class="form-group"><label>Amount BD (per unit)</label><input type="number" step="0.001" id="ee-amt" value="${apu.toFixed(3)}" oninput="syncExpenseInvoiceTotals('ee')"></div>
    <div class="form-group"><label>Total BD</label><input type="number" step="0.001" id="ee-total" value="${r.amount_bd}" readonly></div>
    <div class="form-group"><label>Paid BD ${hasPlan?'(auto from installments)':''}</label><input type="number" step="0.001" id="ee-paid" value="${paidValue}" ${hasPlan?'readonly title="Paid BD is controlled by installment payments"':''}>${hasPlan?'<div style="font-size:11px;color:var(--muted);margin-top:4px">Edit payments from Installments, not here.</div>':''}</div>
    <div class="form-group"><label>Horse</label><select id="ee-horse"><option value="">&#8212;</option>${hOpts(r.horse)}</select></div>
    <div class="form-group" style="grid-column:1/-1"><label>Agreement / Expense Details (text)</label><textarea id="ee-notes" rows="7" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical">${esc(expenseDetailsText(r)||'')}</textarea></div>
    <div class="form-group" style="grid-column:1/-1">
      <label>Invoice</label>
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fafafa;display:grid;gap:10px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="action-btn" style="background:#EEF3FF;color:var(--navy);padding:8px 12px" onclick="document.getElementById('ee-invoice-file').click()">&#128206; Attach Invoice</button>
          <input type="file" id="ee-invoice-file" accept="image/*,.pdf" style="display:none" onchange="handleInvoiceAttachment('ee',this)">
          <span id="ee-invoice-file-name" style="font-size:12px;color:var(--muted)">No invoice attached</span>
          <button type="button" class="action-btn" style="background:#FDECEA;color:var(--red);padding:7px 10px" onclick="clearInvoiceAttachment('ee')">Remove</button>
        </div>
        <div class="tbl-wrap"><table style="margin:0"><thead><tr><th>Invoice Item / Description</th><th>Amount BD</th><th></th></tr></thead><tbody id="ee-invoice-lines"></tbody><tfoot><tr><th>Total</th><th id="ee-invoice-total">BHD 0.000</th><th></th></tr></tfoot></table></div>
        <div><button type="button" class="action-btn" style="background:#E8F5EE;color:var(--green);padding:8px 12px" onclick="addInvoiceLine('ee')">&#10133; Add Invoice Line</button></div>
      </div>
    </div>
  </div><div class="btn-row"><button class="btn btn-red" onclick="saveExpense(${id})">Save</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
  renderInvoiceEditor('ee',expenseInvoice(r));
}
async function saveExpense(id){
  const r=expenses.find(x=>String(x.id)===String(id))||{};
  const qty=parseFloat(document.getElementById('ee-qty').value)||1;
  const inv=collectInvoiceData('ee');
  const invTotal=money3(invoiceTotal(inv));
  const manualAmt=parseFloat(document.getElementById('ee-amt').value)||0;
  const total=invTotal>0?invTotal:money3(qty*manualAmt);
  const amt=qty>0?money3(total/qty):total;
  if(invTotal>0){
    document.getElementById('ee-amt').value=amt.toFixed(3);
    document.getElementById('ee-total').value=total.toFixed(3);
  }
  const installments=expenseInstallments(r);
  const hasPlan=installments.length>0;
  const paid=hasPlan?money3(installments.reduce((s,i)=>s+installmentPaid(i),0)):(parseFloat(document.getElementById('ee-paid').value)||0);
  if(!validatePaymentInput(total,paid,'Expense'))return;
  try{await sbPatch('expenses',id,{date:document.getElementById('ee-date').value||null,due_date:document.getElementById('ee-due').value||null,category:normalizeActivityCategory(document.getElementById('ee-cat').value),supplier:document.getElementById('ee-sup').value,qty,amount_bd:total,paid_bd:paid,horse:document.getElementById('ee-horse').value||null,notes:buildExpenseNotes(document.getElementById('ee-notes').value||'',installments,inv),status:normalizePaidStatus(total,paid)});closeModal();await loadAll();}catch(e){showError('Error',e);}
}
function editHorse(id){
  const h=horses.find(x=>x.id===id);if(!h)return;
  openModal('Edit Horse &#8212; '+h.horse_name,`<div class="form-grid">
    <div class="form-group"><label>Stable No</label><input type="text" id="eh-stable" value="${h.stable_no||''}"></div>
    <div class="form-group"><label>Horse Name</label><input type="text" id="eh-name" value="${escAttr(h.horse_name||'')}"></div>
    <div class="form-group"><label>Owner</label><input type="text" id="eh-owner" value="${h.owner||''}"></div>
    <div class="form-group"><label>Contact</label><input type="text" id="eh-contact" value="${escAttr(h.contact||'')}"></div>
    <div class="form-group"><label>CPR</label><input type="text" id="eh-cpr" value="${escAttr(h.cpr||'')}"></div>
    <div class="form-group"><label>Address</label><input type="text" id="eh-address" value="${escAttr(h.address||'')}"></div>
    <div class="form-group"><label>Sex</label><select id="eh-sex">${['','Stallion','Mare','Gelding'].map(s=>'<option '+(h.sex===s?'selected':'')+'>'+s+'</option>').join('')}</select></div>
    <div class="form-group"><label>Color</label><input type="text" id="eh-color" value="${escAttr(h.color||'')}"></div>
    <div class="form-group"><label>Breed</label><input type="text" id="eh-breed" value="${escAttr(h.breed||'')}"></div>
    <div class="form-group"><label>Livery BD/month</label><input type="number" step="0.001" id="eh-livery" value="${h.livery_bd||0}"></div>
    <div class="form-group"><label>AC Livery BD</label><input type="number" step="0.001" id="eh-aclivery" value="${h.ac_livery_bd||0}"></div>
    <div class="form-group"><label>Livery Type</label><input type="text" id="eh-lvtype" value="${h.livery_type||''}"></div>
    <div class="form-group"><label>Payment</label><input type="text" id="eh-payment" value="${h.payment||''}"></div>
    <div class="form-group"><label>Status</label><select id="eh-status">${['Available','Out','Sold','Dead'].map(s=>'<option '+(h.status===s?'selected':'')+'>'+s+'</option>').join('')}</select></div>
    <div class="form-group"><label>Start Date</label><input type="date" id="eh-start" value="${h.start_date||''}"></div>
    <div class="form-group"><label>End Date</label><input type="date" id="eh-end" value="${h.end_date||''}"></div>
    <div class="form-group"><label>Birth Date</label><input type="date" id="eh-birth" value="${h.birth_date||''}"></div>
    <div class="form-group"><label>Microchip</label><input type="text" id="eh-micro" value="${escAttr(h.microchip||'')}"></div>
    <div class="form-group"><label>Passport</label><input type="text" id="eh-passport" value="${escAttr(h.passport||'')}"></div>
    <div class="form-group"><label>Farrier Name</label><input type="text" id="eh-farrier-name" value="${escAttr(h.farrier_name||'')}"></div>
    <div class="form-group"><label>Farrier Date</label><input type="date" id="eh-farrier" value="${h.farrier_date||''}"></div>
    <div class="form-group"><label>Deworm Date</label><input type="date" id="eh-deworm" value="${h.deworm_date||''}"></div>
    <div class="form-group"><label>Vaccine Dr</label><input type="text" id="eh-vaccine-dr" value="${escAttr(h.vaccine_dr||'')}"></div>
    <div class="form-group"><label>Vaccine Date</label><input type="date" id="eh-vaccine" value="${h.vaccine_date||''}"></div>
    <div class="form-group"><label>Teeth Date</label><input type="date" id="eh-teeth" value="${h.teeth_date||''}"></div>
    <div class="form-group"><label>Medicant</label><input type="text" id="eh-medicant" value="${escAttr(h.medicant||'')}"></div>
    <div class="form-group"><label>Med Date</label><input type="date" id="eh-meddate" value="${h.med_date||''}"></div>
  </div><div class="btn-row"><button class="btn btn-amber" onclick="saveHorse(${id})">Save</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
}
async function saveHorse(id){
  try{await sbPatch('horses',id,{stable_no:document.getElementById('eh-stable').value||null,horse_name:document.getElementById('eh-name').value,owner:document.getElementById('eh-owner').value,contact:document.getElementById('eh-contact').value||null,cpr:document.getElementById('eh-cpr').value||null,address:document.getElementById('eh-address').value||null,sex:document.getElementById('eh-sex').value||null,color:document.getElementById('eh-color').value||null,breed:document.getElementById('eh-breed').value||null,livery_bd:parseFloat(document.getElementById('eh-livery').value)||0,ac_livery_bd:parseFloat(document.getElementById('eh-aclivery').value)||0,livery_type:document.getElementById('eh-lvtype').value||null,payment:document.getElementById('eh-payment').value||null,status:document.getElementById('eh-status').value,start_date:document.getElementById('eh-start').value||null,end_date:document.getElementById('eh-end').value||null,birth_date:document.getElementById('eh-birth').value||null,microchip:document.getElementById('eh-micro').value||null,passport:document.getElementById('eh-passport').value||null,farrier_name:document.getElementById('eh-farrier-name').value||null,farrier_date:document.getElementById('eh-farrier').value||null,deworm_date:document.getElementById('eh-deworm').value||null,vaccine_dr:document.getElementById('eh-vaccine-dr').value||null,vaccine_date:document.getElementById('eh-vaccine').value||null,teeth_date:document.getElementById('eh-teeth').value||null,medicant:document.getElementById('eh-medicant').value||null,med_date:document.getElementById('eh-meddate').value||null});closeModal();await loadAll();}catch(e){showError('Error',e);}
}
function editBreeding(id){
  const r=breeding.find(x=>x.id===id);if(!r)return;
  openModal('Edit Breeding &#8212; '+r.mare_name,`<div class="form-grid">
    <div class="form-group"><label>Mare Name</label><input type="text" id="eb-mare" value="${r.mare_name||''}"></div>
    <div class="form-group"><label>Owner</label><input type="text" id="eb-owner" value="${r.owner||''}"></div>
    <div class="form-group"><label>Mobile</label><input type="text" id="eb-mobile" value="${r.mobile||''}"></div>
    <div class="form-group"><label>Day 1</label><input type="date" id="eb-d1" value="${r.day1||''}"></div>
    <div class="form-group"><label>Day 2</label><input type="date" id="eb-d2" value="${r.day2||''}"></div>
    <div class="form-group"><label>Day 3</label><input type="date" id="eb-d3" value="${r.day3||''}"></div>
    <div class="form-group"><label>Day 4</label><input type="date" id="eb-d4" value="${r.day4||''}"></div>
    <div class="form-group"><label>Day 5</label><input type="date" id="eb-d5" value="${r.day5||''}"></div>
    <div class="form-group"><label>Day 6</label><input type="date" id="eb-d6" value="${r.day6||''}"></div>
    <div class="form-group"><label>Day 7</label><input type="date" id="eb-d7" value="${r.day7||''}"></div>
    <div class="form-group"><label>Day 8</label><input type="date" id="eb-d8" value="${r.day8||''}"></div>
    <div class="form-group"><label>Day 9</label><input type="date" id="eb-d9" value="${r.day9||''}"></div>
  </div><div class="btn-row"><button class="btn btn-navy" onclick="saveBreeding(${id})">Save</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
}
async function saveBreeding(id){
  try{await sbPatch('breeding',id,{mare_name:document.getElementById('eb-mare').value,owner:document.getElementById('eb-owner').value,mobile:document.getElementById('eb-mobile').value||null,day1:document.getElementById('eb-d1').value||null,day2:document.getElementById('eb-d2').value||null,day3:document.getElementById('eb-d3').value||null,day4:document.getElementById('eb-d4').value||null,day5:document.getElementById('eb-d5').value||null,day6:document.getElementById('eb-d6').value||null,day7:document.getElementById('eb-d7').value||null,day8:document.getElementById('eb-d8').value||null,day9:document.getElementById('eb-d9').value||null});closeModal();await loadAll();}catch(e){showError('Error',e);}
}
function openTrainingPaymentModal(id){
  const r=income.find(x=>String(x.id)===String(id));if(!r)return;
  const total=moneyNum(r.amount_bd);
  openModal('Training Payment — 50/50 Split',`
    <div style="background:var(--sand);border-radius:12px;padding:14px;margin-bottom:14px;line-height:1.8">
      <div><strong>Customer:</strong> ${esc(r.customer_name||'—')}</div>
      <div><strong>Gross payment:</strong> ${BD(total)}</div>
      <div style="color:var(--green)"><strong>Stable:</strong> ${BD(splitStableHalf(total))}</div>
      <div style="color:var(--navy)"><strong>Instructor:</strong> ${BD(total-splitStableHalf(total))}</div>
    </div>
    <div class="form-group"><label>Instructor receiving the 50% share *</label><select id="training-payment-instructor">${activeInstructorOptions(r.instructor_id,instructorNameById(r.instructor_id,''))}</select></div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">The customer receipt remains ${BD(total)} and the remaining balance becomes ${BD(0)}.</div>
    <div class="btn-row"><button class="btn btn-green" onclick="confirmTrainingPayment(${r.id})">Confirm Payment & Split</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button></div>`);
}
async function confirmTrainingPayment(id){
  const r=income.find(x=>String(x.id)===String(id));if(!r)return;
  const trainer=selectedInstructor('training-payment-instructor');
  if(!trainer){alert('Select an active instructor.');return;}
  const finalAmount=moneyNum(r.amount_bd);
  try{
    await sbPatch('income',id,{paid_bd:finalAmount,status:'Paid',training_split_enabled:true,instructor_id:trainer.id});
    closeModal();await loadAll();
    if(confirm('✅ Payment split recorded.\n\nStable: '+BD(splitStableHalf(finalAmount))+'\n'+trainer.name+': '+BD(finalAmount-splitStableHalf(finalAmount))+'\n\nSend a thank-you WhatsApp message?'))sendWhatsAppThanks(r,finalAmount);
  }catch(e){showError('Training payment',e);}
}
async function markPaid(t,id,amt){
  const rows=(t==='income')?income:expenses;
  const row=rows.find(x=>String(x.id)===String(id));
  const finalAmount=moneyNum(row?.amount_bd ?? amt);
  if(t==='income'&&row&&isTrainingIncome(row)){openTrainingPaymentModal(id);return;}
  if(t==='expenses'&&row){
    const plan=expenseInstallments(row);
    const planned=plan.reduce((sum,i)=>sum+moneyNum(i.amount),0);
    const effectivePlanned=planned+expenseUntrackedPaid(row,plan);
    if(effectivePlanned-finalAmount>0.0004){alert('Installment plan exceeds the expense total by '+BD(effectivePlanned-finalAmount)+'. Adjust the plan before marking this expense paid.');return;}
  }
  if(!confirm('Mark as Paid ('+BD(finalAmount)+')?'))return;
  // Capture record BEFORE reload (for the thank-you message)
  const rec=(t==='income')?row:null;
  try{
    const payload={paid_bd:finalAmount,status:'Paid'};
    if(t==='expenses'&&row){
      const meta=expenseMeta(row);
      const plan=expenseInstallments(row);
      if(plan.length){
        const payDate=todayISOForInstallment();
        const untrackedPaid=expenseUntrackedPaid(row,plan);
        if(untrackedPaid>0.0004)plan.unshift(openingPaidInstallment(row,untrackedPaid));
        let left=Math.max(0,finalAmount-installmentRowsPaid(plan));
        plan.sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))).forEach(i=>{
          const payment=money3(Math.min(installmentRemaining(i),left));
          if(payment>0.0004)i.payments.push({date:payDate,amount:payment,note:'Marked paid from expense'});
          left=money3(left-payment);
        });
        if(left>0.0004){
          plan.push({id:newExpenseInstallmentId(),due_date:payDate,amount:left,note:'Final unplanned balance',payments:[{date:payDate,amount:left,note:'Marked paid from expense'}]});
        }
        payload.notes=buildExpenseNotes(meta.details,plan,meta.invoice);
      }
    }
    await sbPatch(t,id,payload);
    await loadAll();
    // Offer a thank-you WhatsApp message (income only)
    if(rec&&confirm('✅ Marked as Paid!\n\nSend a thank-you WhatsApp message to '+(rec.customer_name||'the customer').split('|')[0].trim()+'?')){
      sendWhatsAppThanks(rec,finalAmount);
    }
  }catch(e){showError('Error',e);}
}

function sendWhatsAppThanks(r,amount){
  let phone=findContactForIncome(r);
  if(!phone){
    const entered=prompt('Enter WhatsApp number (e.g. 39001234):');
    if(!entered)return;
    phone=waPhone(entered);
    if(!phone){alert('Invalid phone number');return;}
  }
  const name=(r.customer_name||'Customer').split('|')[0].trim();
  const horse=r.horse_name?(' — '+r.horse_name):'';
  const total=parseFloat(r.amount_bd)||0;
  const paid=amount;
  const remaining=Math.max(0,total-paid);
  const msg=
'🐴 *Country Club Equestrian*\n'+
'──────────────\n'+
'Dear '+name+',\n'+
'We have received your payment ('+(r.activity||'')+horse+'). ✅\n\n'+
'💰 Total Due: *'+BD(total)+'*\n'+
'✅ Paid: *'+BD(paid)+'*\n'+
'⏳ Remaining: *'+BD(remaining)+'*\n\n'+
'Thank you for your prompt payment!\nWe appreciate your business 🌟\n'+
'──────────────\n'+
'عزيزي '+name+'،\n'+
'تم استلام دفعتكم ('+(r.activity||'')+horse+'). ✅\n\n'+
'💰 المبلغ المستحق: *'+BD(total)+'*\n'+
'✅ تم دفع: *'+BD(paid)+'*\n'+
'⏳ المتبقي: *'+BD(remaining)+'*\n\n'+
'شكراً لكم على التزامكم بالسداد!\nنقدّر تعاملكم معنا 🙏';
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');
}
async function delRec(t,id){
  if(!confirm('Delete this record? Cannot be undone.'))return;
  try{await sbDel(t,id);await loadAll();}catch(e){showError('Error',e);}
}
function toggleForm(id){const el=document.getElementById(id);el.style.display=el.style.display==='none'?'block':'none';}
function calcTotal(p){
  const qty=parseFloat(document.getElementById(p+'-qty')?.value)||1;
  const amt=parseFloat(document.getElementById(p+'-amount')?.value)||0;
  const el=document.getElementById(p+'-total');if(el)el.value=(qty*amt).toFixed(3);
}
function cET(p){
  const qty=parseFloat(document.getElementById(p==='inc'?'ei-qty':'ee-qty')?.value)||1;
  const amt=parseFloat(document.getElementById(p==='inc'?'ei-amt':'ee-amt')?.value)||0;
  const el=document.getElementById(p==='inc'?'ei-total':'ee-total');if(el)el.value=(qty*amt).toFixed(3);
}
function instructorById(id){return instructors_data.find(i=>String(i.id)===String(id||''))||null;}
function instructorNameById(id,fallback=''){
  return instructorById(id)?.name||fallback||'';
}
function activeInstructorOptions(selectedId='',selectedName=''){
  const rows=instructors_data.filter(i=>i.active).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  const selected=instructorById(selectedId);
  if(selected&&!rows.some(i=>String(i.id)===String(selected.id)))rows.push(selected);
  const options=rows.map(i=>`<option value="${escAttr(i.id)}" ${String(i.id)===String(selectedId||'')?'selected':''}>${esc(i.name)}${i.active?'':' (Inactive)'}</option>`).join('');
  const legacy=selectedName&&!selectedId&&!rows.some(i=>normText(i.name)===normText(selectedName))
    ?`<option value="" selected>${esc(selectedName)} — select linked instructor</option>`:'';
  return '<option value="">— Select instructor —</option>'+legacy+options;
}
function selectedInstructor(selectId){
  const id=document.getElementById(selectId)?.value||'';
  const instructor=instructorById(id);
  return instructor&&instructor.active?instructor:null;
}
function syncIncomeInstructorField(prefix='inc'){
  const edit=prefix==='ei';
  const activity=document.getElementById(edit?'ei-act':'inc-activity')?.value||'';
  const paid=moneyNum(document.getElementById(edit?'ei-paid':'inc-paid')?.value);
  const wrap=document.getElementById(edit?'ei-instructor-wrap':'inc-instructor-wrap');
  const policy=document.getElementById('ei-training-policy-wrap');
  const select=document.getElementById(edit?'ei-instructor':'inc-instructor');
  const split=document.getElementById(edit?'ei-training-split':'inc-training-split');
  const training=['lesson','training'].includes(normalizeActivityCategory(activity).toLowerCase());
  const enabled=training&&(!edit||!!document.getElementById('ei-training-split-enabled')?.checked);
  if(policy)policy.style.display=training?'':'none';
  if(wrap)wrap.style.display=enabled?'':'none';
  if(select)select.required=enabled&&paid>0;
  if(split)split.textContent=enabled&&paid>0
    ?`Stable ${BD(splitStableHalf(paid))} • Instructor ${BD(paid-splitStableHalf(paid))}`
    :'The 50/50 split is created immediately when Paid BD is recorded.';
}
function trainingSplitHTML(r){
  if(!isTrainingIncome(r))return '<span style="color:var(--muted)">—</span>';
  const paid=moneyNum(r.paid_bd);
  if(!trainingSplitEnabled(r))return `<div style="min-width:150px;font-size:11px;line-height:1.65"><strong>Legacy — preserved</strong><br><span style="color:var(--green)">Stable: ${BD(paid)}</span><br><span style="color:var(--muted)">No retroactive split</span></div>`;
  if(paid<=0)return '<span style="color:var(--muted)">Awaiting payment</span>';
  const instructor=instructorNameById(r.instructor_id,'Unassigned instructor');
  return `<div style="min-width:150px;font-size:11px;line-height:1.65"><strong>${esc(instructor)}</strong><br><span style="color:var(--green)">Stable: ${BD(incomeStableShare(r))}</span><br><span style="color:var(--navy)">Instructor: ${BD(incomeInstructorShare(r))}</span></div>`;
}
function populateLists(){
  const cl=document.getElementById('cList');
  if(cl)cl.innerHTML=[...new Set(income.map(r=>r.customer_name).filter(Boolean))].sort().map(c=>'<option value="'+escAttr(c)+'">').join('');
  const hn=horses.map(h=>h.horse_name).filter(Boolean).sort();
  const ih=document.getElementById('inc-horse');
  if(ih)ih.innerHTML='<option value="">&#8212; Select &#8212;</option>'+hn.map(h=>'<option>'+esc(h)+'</option>').join('');
  const eh=document.getElementById('exp-horse');
  if(eh)eh.innerHTML='<option value="">&#8212; None &#8212;</option>'+hn.map(h=>'<option>'+esc(h)+'</option>').join('');
  const instructor=document.getElementById('inc-instructor');
  if(instructor){const selected=instructor.value;instructor.innerHTML=activeInstructorOptions(selected);instructor.value=selected;}
  syncIncomeInstructorField('inc');
}
function renderPag(id,total,cur,fn){
  const el=document.getElementById(id);if(total<=1){el.innerHTML='';return;}
  const s=Math.max(1,cur-3),e=Math.min(total,s+6);let h='';
  if(s>1)h+='<button class="page-btn" onclick="('+fn.toString()+')(1)">1</button><span style="padding:4px">&#8230;</span>';
  for(let i=s;i<=e;i++)h+='<button class="page-btn'+(i===cur?' active':'')+'" onclick="('+fn.toString()+')('+i+')">'+i+'</button>';
  if(e<total)h+='<span style="padding:4px">&#8230;</span><button class="page-btn" onclick="('+fn.toString()+')('+total+')">'+total+'</button>';
  el.innerHTML=h;
}
applyLanguage(currentLang);
renderInvoiceEditor('exp',null);
{ const ov=document.getElementById('loadingOverlay'); if(ov) ov.style.display='none'; }


// ══════════════════════════════════════════════════════════
// BOOKING SCRIPT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  const today=bahrainDateISO();
  ['b-date','t-date'].forEach(id=>{const el=document.getElementById(id);if(el)el.min=today;});
  applyLanguage(currentLang);
  const gh=document.getElementById('globalHeader');if(gh)gh.style.display='none';
  if(APP_MODE==='stable'){document.body.classList.add('mode-stable');navigate('owner');}
  else if(APP_MODE==='instructor'){document.body.classList.add('mode-instructor');navigate('instructor');}
  else if(APP_MODE==='book'){document.body.classList.add('mode-book');}
  initializeRideAvailability();
});

const PUBLIC_BOOKING_TERMS_VERSION='2026-07-v1';
const PUBLIC_RIDE_SERVICE_CODES=Object.freeze({
  'Half Hour Ride':'ride_half_hour',
  '1 Hour Hack Ride':'ride_one_hour',
  'Photo Session + Ride':'ride_photo',
  'Family Package':'ride_family'
});
const PUBLIC_TRAINING_SERVICE_CODES=Object.freeze({
  'Single Session':'training_single',
  '4 Sessions Package':'training_4',
  '8 Sessions Package':'training_8',
  '12 Sessions Package':'training_12'
});
let currentRideCapacity={total:0,reserved:0,available:0};

function rideDurationMinutes(service){return /1 Hour/i.test(service||'')?60:30;}
function rideCapacityUnits(service){return service==='Family Package'?4:1;}
function setRideCardsDisabled(disabled){
  document.querySelectorAll('#rideOptions .ride-card').forEach(card=>{
    card.classList.toggle('is-disabled',!!disabled);
    card.setAttribute('aria-disabled',disabled?'true':'false');
  });
  const btn=document.getElementById('bookBtn');
  if(btn) btn.disabled=!!disabled;
}
function renderRideCapacity(data){
  const total=Number(data?.total_horses??data?.total??0);
  const reserved=Number(data?.reserved_horses??data?.reserved??0);
  const available=Math.max(0,Number(data?.available_horses??data?.available??total-reserved));
  currentRideCapacity={total,reserved,available};
  const num=document.getElementById('rideCapacityNumber');
  const label=document.getElementById('rideCapacityLabel');
  const details=document.getElementById('rideCapacityDetails');
  const sold=document.getElementById('rideSoldOut');
  if(num)num.textContent=String(available);
  if(label)label.textContent='Available horses';
  if(details)details.textContent='';
  if(sold)sold.classList.toggle('hidden',available>0);
  setRideCardsDisabled(available<=0);
  return currentRideCapacity;
}
async function refreshRideAvailability(){
  const date=document.getElementById('b-date')?.value||null;
  const time=document.getElementById('b-time')?.value||null;
  const service=document.getElementById('b-service')?.value||'';
  const label=document.getElementById('rideCapacityLabel');
  if(label)label.textContent='Checking availability…';
  try{
    const result=await sbRpc('cce_public_ride_capacity',{
      p_date:date||null,p_start_time:time||null,p_duration_minutes:rideDurationMinutes(service)
    });
    const row=Array.isArray(result)?result[0]:result;
    return renderRideCapacity(row||{});
  }catch(e){
    // Compatibility fallback before the v4.3 SQL is installed: count public CC horses only.
    try{
      const list=await sbRpc('cce_public_available_horses',{});
      return renderRideCapacity({total_horses:(list||[]).length,reserved_horses:0,available_horses:(list||[]).length});
    }catch(fallbackError){
      if(label)label.textContent='Availability could not be checked. Please contact the stable.';
      const details=document.getElementById('rideCapacityDetails');if(details)details.textContent=userSafeError(fallbackError||e);
      setRideCardsDisabled(true);
      return {total:0,reserved:0,available:0};
    }
  }
}
function initializeRideAvailability(){
  ['b-date','b-time'].forEach(id=>document.getElementById(id)?.addEventListener('change',refreshRideAvailability));
  refreshRideAvailability();
}


function showBookingMissingAlert(missing){
  const labels={
    name:'الاسم', phone:'رقم الهاتف', personalId:'الرقم الشخصي', date:'التاريخ', time:'الوقت',
    riderLevel:'مستوى الراكب', service:'نوع الجولة'
  };
  alert('⚠️ يرجى تعبئة البيانات التالية:\n\n- '+missing.map(k=>labels[k]||k).join('\n- '));
}


function selectRideService(el,service,price){
  if(currentRideCapacity.available<=0){
    document.getElementById('rideSoldOut')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  document.querySelectorAll('.ride-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('b-service').value=service;
  document.getElementById('b-price').value=price;
  refreshRideAvailability();
}

function selectRiderLevel(el,level){
  document.querySelectorAll('input[name="rider-level"]').forEach(r=>r.checked=false);
  const input=el.querySelector('input[name="rider-level"]');
  input.checked=true;
  document.getElementById('b-rider-level').value=level;
  // Update border styling
  document.querySelectorAll('label[onclick*="selectRiderLevel"]').forEach(l=>l.style.borderColor='transparent');
  el.style.borderColor='var(--amber)';
}

async function submitBooking(){
  const name=document.getElementById('b-name').value.trim();
  const phone=document.getElementById('b-phone').value.trim();
  const birthDate=document.getElementById('b-birth-date').value||null;
  const personalId=document.getElementById('b-personal-id').value.trim();
  const emergency=document.getElementById('b-emergency').value.trim();
  const health=document.getElementById('b-health').value.trim();
  const date=document.getElementById('b-date').value;
  const time=document.getElementById('b-time').value;
  const riderLevel=document.getElementById('b-rider-level').value;
  const service=document.getElementById('b-service').value;
  const serviceCode=PUBLIC_RIDE_SERVICE_CODES[service]||'';
  const missing=[];
  if(!name)missing.push('name');
  if(!phone)missing.push('phone');
  if(!personalId)missing.push('personalId');
  if(!date)missing.push('date');
  if(!time)missing.push('time');
  if(!riderLevel)missing.push('riderLevel');
  if(!service)missing.push('service');
  if(missing.length){showBookingMissingAlert(missing);return;}
  const duration=rideDurationMinutes(service);
  const capacity=await refreshRideAvailability();
  const requiredUnits=rideCapacityUnits(service);
  if(capacity.available<requiredUnits){
    alert('⚠️ This service requires '+requiredUnits+' available horses; only '+capacity.available+' are currently available.');
    document.getElementById('rideSoldOut')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  if(!validBahrainPhone(phone)){alert('⚠️ رقم الهاتف يجب أن يتكون من 8 أرقام.');return;}
  if(!document.getElementById('b-terms').checked){alert('⚠️ يرجى قراءة اتفاقية تأجير ركوب الخيل والموافقة عليها للمتابعة.');return;}
  const btn=document.getElementById('bookBtn');btn.disabled=true;btn.textContent='⏳ جاري الإرسال...';
  try{
    if(!serviceCode)throw new Error('The selected ride service is not available.');
    await publicSubmitBooking({
      p_request_type:'ride',p_service_code:serviceCode,p_customer_name:name,p_phone:phone,
      p_requested_date:date,p_start_time:time,p_rider_level:riderLevel,p_session_slots:[],
      p_horse_name:null,p_personal_id:personalId,p_emergency_contact:emergency||null,
      p_birth_date:birthDate,p_health_notes:health||null,p_services:[],p_metadata:{},
      p_terms_accepted:true,p_terms_version:PUBLIC_BOOKING_TERMS_VERSION,p_honeypot:null
    });
    document.getElementById('bookingForm').style.display='none';
    document.getElementById('bookSuccess').style.display='block';
  }catch(e){showError('Error',e);btn.disabled=false;btn.textContent='🐴 إرسال طلب الحجز';}
}

function resetBooking(){
  document.getElementById('bookingForm').style.display='block';
  document.getElementById('bookSuccess').style.display='none';
  const bt=document.getElementById('b-terms');if(bt)bt.checked=false;
  ['b-name','b-phone','b-birth-date','b-personal-id','b-emergency','b-health','b-date','b-time'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('b-rider-level').value='';
  document.querySelectorAll('input[name="rider-level"]').forEach(r=>r.checked=false);
  const btn=document.getElementById('bookBtn');btn.disabled=false;btn.textContent='🐴 إرسال طلب الحجز';refreshRideAvailability();
}

// ══════════════════════════════════════════════════════════
// TRAINING SCRIPT
// ══════════════════════════════════════════════════════════
let selectedPkg=null,selectedPkgCode='',selectedPrice=0;

let selectedPkgSessions=1;
const TIME_SLOTS=['08:00','08:45','09:30','10:15','11:00','11:45','16:00','16:45','17:30','18:15','19:00','19:45'];

function selectPkg(el,name,sessions,price,count){
  document.querySelectorAll('.pkg-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedPkg=name;selectedPrice=price;
  selectedPkgCode=PUBLIC_TRAINING_SERVICE_CODES[name]||'';
  selectedPkgSessions=count||1;
  document.getElementById('selectedPkgBox').style.display='block';
  document.getElementById('selectedPkgLabel').textContent=name+' — '+price+' BD ('+sessions+')';
  buildSessionSlots(selectedPkgSessions);
}

function buildSessionSlots(count){
  const wrap=document.getElementById('sessionSlotsWrap');
  const container=document.getElementById('sessionSlots');
  if(!wrap||!container) return;
  wrap.style.display='block';
  let html='';
  for(let i=1;i<=count;i++){
    html+=`<div style="background:var(--sand);border-radius:10px;padding:12px 14px;margin-bottom:10px">
      <div style="font-weight:700;font-size:13px;color:var(--navy);margin-bottom:8px">&#128197; حصة ${i}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="sess-date-${i}" min="${bahrainDateISO()}" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;background:#fff;font-family:'Cairo','Segoe UI',Roboto,Arial,sans-serif">
        </div>
        <div class="form-group">
          <label>الوقت *</label>
          <select id="sess-time-${i}" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;background:#fff;font-family:'Cairo','Segoe UI',Roboto,Arial,sans-serif">
            <optgroup label="🌅 الفترة الصباحية">
              <option value="08:00">08:00 ص</option>
              <option value="08:45">08:45 ص</option>
              <option value="09:30">09:30 ص</option>
              <option value="10:15">10:15 ص</option>
              <option value="11:00">11:00 ص</option>
              <option value="11:45">11:45 ص</option>
            </optgroup>
            <optgroup label="🌆 الفترة المسائية">
              <option value="16:00">04:00 م</option>
              <option value="16:45">04:45 م</option>
              <option value="17:30">05:30 م</option>
              <option value="18:15">06:15 م</option>
              <option value="19:00">07:00 م</option>
              <option value="19:45">07:45 م</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>`;
  }
  container.innerHTML=html;
}

async function submitTraining(){
  const name=document.getElementById('t-name').value.trim();
  const phone=document.getElementById('t-phone').value.trim();
  const birthDate=document.getElementById('t-birth-date').value;
  const personalId=document.getElementById('t-personal-id').value.trim();
  const emergency=document.getElementById('t-emergency').value.trim();
  const health=document.getElementById('t-health').value.trim();
  if(!selectedPkg){alert('⚠️ Please select a package.');return;}
  if(!name||!phone||!personalId){alert('⚠️ يرجى كتابة الاسم ورقم الهاتف والرقم الشخصي.');return;}
  if(!validBahrainPhone(phone)){alert('⚠️ رقم الهاتف يجب أن يتكون من 8 أرقام.');return;}
  if(!document.getElementById('t-terms').checked){alert('⚠️ Please read and agree to the Terms & Conditions to proceed.\nيرجى قراءة والموافقة على الشروط والأحكام للمتابعة.');return;}

  // Collect session slots
  const slots=[];
  for(let i=1;i<=selectedPkgSessions;i++){
    const dateEl=document.getElementById('sess-date-'+i);
    const timeEl=document.getElementById('sess-time-'+i);
    if(!dateEl||!timeEl||!dateEl.value){alert('⚠️ Please fill all session dates (حصة '+i+')');return;}
    slots.push({date:dateEl.value,time:timeEl.value});
  }
  const dupSlot=slots.find((s,i)=>slots.findIndex(x=>x.date===s.date&&x.time===s.time)!==i);
  if(dupSlot){alert('⚠️ Duplicate training slot selected: '+dupSlot.date+' @ '+dupSlot.time);return;}

  const btn=document.getElementById('trainBtn');btn.disabled=true;btn.textContent='⏳ Submitting...';
  try{
    if(!selectedPkgCode)throw new Error('The selected training package is not available.');
    const result=await publicSubmitBooking({
      p_request_type:'training',p_service_code:selectedPkgCode,p_customer_name:name,p_phone:phone,
      p_requested_date:slots[0].date,p_start_time:slots[0].time,p_rider_level:null,
      p_session_slots:slots,p_horse_name:null,p_personal_id:personalId,
      p_emergency_contact:emergency||null,p_birth_date:birthDate||null,p_health_notes:health||null,
      p_services:[],p_metadata:{},p_terms_accepted:true,
      p_terms_version:PUBLIC_BOOKING_TERMS_VERSION,p_honeypot:null
    });
    const acceptedAmount=Number(result?.amount_bd??selectedPrice)||selectedPrice;
    document.getElementById('trainingForm').style.display='none';
    document.getElementById('trainSuccess').style.display='block';
    document.getElementById('trainSuccessText').innerHTML=
      'Thank you <strong>'+esc(name)+'</strong>!<br><br>'+
      'Package: <strong>'+esc(selectedPkg)+'</strong><br>'+
      'Sessions: <strong>'+selectedPkgSessions+' حصص</strong><br>'+
      'Amount: <strong>'+acceptedAmount+' BD</strong><br><br>'+
      '<div style="font-size:12px;color:#666;margin-top:8px">'+slots.map((s,i)=>'&#128197; حصة '+(i+1)+': '+esc(s.date)+' @ '+esc(s.time)).join('<br>')+'</div>'+
      '<br>Transfer to IBAN:<br><strong class="iban">BH23BIBB00100002375646</strong><button class="whatsapp-btn secondary" onclick="openWhatsAppProof(\'training\')">📱 Send Payment Proof via WhatsApp</button>';
  }catch(e){showError('Error',e);btn.disabled=false;btn.textContent='🎯 Send Registration Request';}
}

function resetTraining(){
  document.getElementById('trainingForm').style.display='block';
  document.getElementById('trainSuccess').style.display='none';
  const tt=document.getElementById('t-terms');if(tt)tt.checked=false;
  document.querySelectorAll('.pkg-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('selectedPkgBox').style.display='none';
  document.getElementById('sessionSlotsWrap').style.display='none';
  ['t-name','t-phone','t-birth-date','t-personal-id','t-emergency','t-health'].forEach(id=>document.getElementById(id).value='');
  selectedPkg=null;selectedPrice=0;selectedPkgSessions=1;
  selectedPkgCode='';
  const btn=document.getElementById('trainBtn');btn.disabled=false;btn.textContent='🎯 Send Registration Request';
}

// ══════════════════════════════════════════════════════════
// OWNER PORTAL SCRIPT
// ══════════════════════════════════════════════════════════
let ownerHorses=[];let currentOwner='';

function cleanPhone(p){return p?String(p).replace('.0','').replace(/\s/g,'').trim():'';}

// Owner authentication is handled only by the unified Supabase member session.
function renderOwnerHorses(){
  document.getElementById('ownerHorseList').innerHTML=ownerHorses.map((h,i)=>`
    <div class="horse-card owner-horse-card">
      <div class="horse-header owner-horse-header">
        <div class="horse-avatar">&#128052;</div>
        <div style="flex:1">
          <div class="horse-name">${esc(h.horse_name)}</div>
          <div class="horse-meta">Stable #${esc(h.stable_no||'—')} &middot; <span class="badge ${h.status==='Available'?'badge-green':h.status==='Occupied'?'badge-red':'badge-amber'}">${esc(h.status||'—')}</span></div>
        </div>
        <button class="edit-toggle" onclick="toggleOwnerEdit(${i})">&#9999;&#65039; Edit</button>
      </div>
      <div id="ownerInfo_${i}" class="info-grid" style="width:100%">
        <div class="info-item"><div class="info-label">Sex</div><div class="info-value">${esc(h.sex||'—')}</div></div>
        <div class="info-item"><div class="info-label">Color</div><div class="info-value">${esc(h.color||'—')}</div></div>
        <div class="info-item"><div class="info-label">Breed</div><div class="info-value">${esc(h.breed||'—')}</div></div>
        <div class="info-item"><div class="info-label">Birth Date</div><div class="info-value">${fmt(h.birth_date)}</div></div>
        <div class="info-item"><div class="info-label">Microchip</div><div class="info-value">${esc(h.microchip||'—')}</div></div>
        <div class="info-item"><div class="info-label">Passport</div><div class="info-value">${esc(h.passport||'—')}</div></div>
        <div class="info-item"><div class="info-label">Farrier</div><div class="info-value">${esc(h.farrier_name||'—')}</div></div>
        <div class="info-item"><div class="info-label">Farrier Date</div><div class="info-value">${fmt(h.farrier_date)}</div></div>
        <div class="info-item"><div class="info-label">Vaccine Dr</div><div class="info-value">${esc(h.vaccine_dr||'—')}</div></div>
        <div class="info-item"><div class="info-label">Vaccine Date</div><div class="info-value">${fmt(h.vaccine_date)}</div></div>
        <div class="info-item"><div class="info-label">Teeth Date</div><div class="info-value">${fmt(h.teeth_date)}</div></div>
        <div class="info-item"><div class="info-label">Deworm Date</div><div class="info-value">${fmt(h.deworm_date)}</div></div>
        <div class="info-item"><div class="info-label">Medicant</div><div class="info-value">${esc(h.medicant||'—')}</div></div>
        <div class="info-item"><div class="info-label">Contact</div><div class="info-value">${h.contact?esc(String(h.contact).replace('.0','')):'—'}</div></div>
        <div class="info-item"><div class="info-label">Address</div><div class="info-value">${esc(h.address||'—')}</div></div>
      </div>
      <div class="edit-form" id="ownerEdit_${i}" style="width:100%">
        <div class="form-grid">
          <div class="form-group"><label>Horse Name</label><input type="text" id="oe_name_${i}" value="${escAttr(h.horse_name||'')}"></div>
          <div class="form-group"><label>Contact</label><input type="text" id="oe_contact_${i}" value="${h.contact?escAttr(String(h.contact).replace('.0','')):''}"></div>
          <div class="form-group"><label>CPR</label><input type="text" id="oe_cpr_${i}" value="${escAttr(h.cpr||'')}"></div>
          <div class="form-group"><label>Address</label><input type="text" id="oe_address_${i}" value="${escAttr(h.address||'')}"></div>
          <div class="form-group"><label>Sex</label><select id="oe_sex_${i}">${['','Stallion','Mare','Gelding'].map(s=>'<option '+(h.sex===s?'selected':'')+'>'+s+'</option>').join('')}</select></div>
          <div class="form-group"><label>Color</label><input type="text" id="oe_color_${i}" value="${escAttr(h.color||'')}"></div>
          <div class="form-group"><label>Breed</label><input type="text" id="oe_breed_${i}" value="${escAttr(h.breed||'')}"></div>
          <div class="form-group"><label>Birth Date</label><input type="date" id="oe_birth_${i}" value="${h.birth_date||''}"></div>
          <div class="form-group"><label>Microchip</label><input type="text" id="oe_micro_${i}" value="${escAttr(h.microchip||'')}"></div>
          <div class="form-group"><label>Passport</label><input type="text" id="oe_passport_${i}" value="${escAttr(h.passport||'')}"></div>
          <div class="form-group"><label>Farrier Name</label><input type="text" id="oe_farrier_name_${i}" value="${escAttr(h.farrier_name||'')}"></div>
          <div class="form-group"><label>Farrier Date</label><input type="date" id="oe_farrier_${i}" value="${h.farrier_date||''}"></div>
          <div class="form-group"><label>Vaccine Dr</label><input type="text" id="oe_vaccine_dr_${i}" value="${escAttr(h.vaccine_dr||'')}"></div>
          <div class="form-group"><label>Vaccine Date</label><input type="date" id="oe_vaccine_${i}" value="${h.vaccine_date||''}"></div>
          <div class="form-group"><label>Deworm Date</label><input type="date" id="oe_deworm_${i}" value="${h.deworm_date||''}"></div>
          <div class="form-group"><label>Teeth Date</label><input type="date" id="oe_teeth_${i}" value="${h.teeth_date||''}"></div>
          <div class="form-group"><label>Medicant</label><input type="text" id="oe_medicant_${i}" value="${escAttr(h.medicant||'')}"></div>
          <div class="form-group"><label>Med Date</label><input type="date" id="oe_meddate_${i}" value="${h.med_date||''}"></div>
        </div>
        <button class="save-btn" onclick="saveOwnerHorse(${i},${h.id})">&#128190; Save Changes</button>
        <button class="cancel-btn" onclick="toggleOwnerEdit(${i})">Cancel</button>
      </div>
    </div>`).join('');
}

function toggleOwnerEdit(i){
  const form=document.getElementById('ownerEdit_'+i);
  const info=document.getElementById('ownerInfo_'+i);
  const open=form.style.display==='block';
  form.style.display=open?'none':'block';
  info.style.display=open?'grid':'none';
}


function humanSupabaseError(e){
  const msg=String((e&&e.message)||e||'');
  if(msg.includes('permission denied for table horses')||msg.includes('42501')){
    return 'Owner update is blocked by Supabase permissions. Please run the included SQL file: supabase_owner_portal_update_rpc.sql';
  }
  return msg;
}

async function ownerUpdateHorse(){
  throw new Error('Please sign in through the unified Member Login.');
}

async function saveOwnerHorse(i,id){
  const btn=document.querySelector('#ownerEdit_'+i+' .save-btn');
  btn.disabled=true;btn.textContent='⏳ Saving...';
  try{
    const data={
      horse_name:document.getElementById('oe_name_'+i).value,
      contact:document.getElementById('oe_contact_'+i).value||null,
      cpr:document.getElementById('oe_cpr_'+i).value||null,
      address:document.getElementById('oe_address_'+i).value||null,
      sex:document.getElementById('oe_sex_'+i).value||null,
      color:document.getElementById('oe_color_'+i).value||null,
      breed:document.getElementById('oe_breed_'+i).value||null,
      birth_date:document.getElementById('oe_birth_'+i).value||null,
      microchip:document.getElementById('oe_micro_'+i).value||null,
      passport:document.getElementById('oe_passport_'+i).value||null,
      farrier_name:document.getElementById('oe_farrier_name_'+i).value||null,
      farrier_date:document.getElementById('oe_farrier_'+i).value||null,
      vaccine_dr:document.getElementById('oe_vaccine_dr_'+i).value||null,
      vaccine_date:document.getElementById('oe_vaccine_'+i).value||null,
      deworm_date:document.getElementById('oe_deworm_'+i).value||null,
      teeth_date:document.getElementById('oe_teeth_'+i).value||null,
      medicant:document.getElementById('oe_medicant_'+i).value||null,
      med_date:document.getElementById('oe_meddate_'+i).value||null,
    };
    await ownerUpdateHorse(id,data);
    Object.assign(ownerHorses[i],data);
    toggleOwnerEdit(i);
    renderOwnerHorses();
    alert('✅ Horse updated successfully!');
  }catch(e){showError('Error',humanSupabaseError(e));}
  finally{btn.disabled=false;btn.textContent='💾 Save Changes';}
}

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
// Load CC horses when booking page is shown
const _origNavigate = window.navigate || navigate;
window.navigate = function(page){
  _origNavigate(page);
  if(page==='booking') loadCCHorses();
};

setInterval(()=>{if(APP_MODE==='full'&&currentPage==='dashboard'&&isAdminAuthed())loadAll();},10*60*1000);
// ══════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM
// ══════════════════════════════════════════════════════════

// ── Storage helpers ──
function notifGet(k){try{return JSON.parse(localStorage.getItem('cce_notif_'+k));}catch{return null;}}
function notifSet(k,v){localStorage.setItem('cce_notif_'+k,JSON.stringify(v));}

// ── Init ──
function initNotifications(){
  // Load saved settings
  const time=notifGet('time')||'08:00';
  const el=document.getElementById('notifTime');
  if(el) el.value=time;

  const checks=['farrier','deworm','vaccine','teeth','overdue','bookings'];
  checks.forEach(k=>{
    const saved=notifGet('check_'+k);
    const el=document.getElementById('notif-'+k);
    if(el&&saved!==null) el.checked=saved;
  });
  const bookingMode=document.getElementById('notifBookings');
  const savedBookingMode=notifGet('bookings_instant');
  if(bookingMode&&savedBookingMode!==null)bookingMode.value=String(savedBookingMode);

  // Check browser notification status
  checkPushStatus();
}

// ── Browser Notifications ──
function checkPushStatus(){
  const el=document.getElementById('pushStatus');
  const btn=document.getElementById('pushEnableBtn');
  if(!('Notification' in window)){
    if(el) el.innerHTML='&#10060; إشعارات المتصفح غير مدعومة في هذا المتصفح';
    if(btn) btn.disabled=true;
    return;
  }
  if(Notification.permission==='granted'){
    if(el) el.innerHTML='&#9989; مفعّل — الإشعارات تعمل';
    if(btn){btn.textContent='🔔 Enabled';btn.style.background='var(--green)';}
  } else if(Notification.permission==='denied'){
    if(el) el.innerHTML='&#10060; محظور — يرجى السماح من إعدادات المتصفح';
    if(btn) btn.disabled=true;
  } else {
    if(el) el.innerHTML='&#9675; في انتظار الإذن';
  }
}

async function enablePush(){
  if(!('Notification' in window)){alert('إشعارات المتصفح غير مدعومة');return;}
  const perm=await Notification.requestPermission();
  checkPushStatus();
  if(perm==='granted') sendBrowserPush('CCE Notifications','✅ تم تفعيل الإشعارات بنجاح!','🐴');
}

// ══════════════════════════════════════════════════════════
// SESSION REMINDERS — 1 day & 1 hour before every Lesson/Hack
// Runs only for an authenticated member with schedule access while the app is open.
// ══════════════════════════════════════════════════════════
async function checkSessionReminders(){
  if(typeof Notification==='undefined'||Notification.permission!=='granted') return;
  if(typeof window.canUser==='function'&&!window.canUser('schedule.view')&&!window.canUser('schedule.view_own'))return;
  try{
    const now=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const todayStr=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
    const tmw=new Date(now.getTime()+864e5);
    const tmwStr=tmw.getFullYear()+'-'+pad(tmw.getMonth()+1)+'-'+pad(tmw.getDate());
    const canViewAll=typeof window.canUser!=='function'||window.canUser('schedule.view');
    const rows=canViewAll
      ? await sbGet('schedule',`date=gte.${todayStr}&date=lte.${tmwStr}&select=id,date,start_time,activity,horse_name,customer_name,instructor,status`)
      : (schedule_data||[]).filter(row=>row.date>=todayStr&&row.date<=tmwStr);
    rows.filter(r=>/hack|lesson|ride|training/i.test(r.activity||'')&&r.status!=='Done'&&r.status!=='Cancelled').forEach(r=>{
      if(!r.start_time) return;
      const evTime=new Date(r.date+'T'+r.start_time);
      const diff=evTime-now;
      if(diff<=0) return;
      const who=(r.instructor?'🎓 '+r.instructor+' — ':'')+(r.activity||'Session')+(r.horse_name?' 🐴 '+r.horse_name:'')+(r.customer_name?' 👤 '+r.customer_name:'');
      const timeTxt=r.start_time.slice(0,5);
      const reminderKey=`${r.id}_${r.date}_${timeTxt}`;
      // 1-hour reminder
      if(diff<=36e5){
        if(!localStorage.getItem('cce_rem1_'+reminderKey)){
          localStorage.setItem('cce_rem1_'+reminderKey,'1');
          sendBrowserPush('⏰ Session in 1 Hour — '+timeTxt, who,'🐴');
        }
      }else if(diff<=864e5&&!localStorage.getItem('cce_rem24_'+reminderKey)){
        // Keep the two reminder windows mutually exclusive when the app opens late.
        localStorage.setItem('cce_rem24_'+reminderKey,'1');
        sendBrowserPush('📅 Session Within 24 Hours — '+timeTxt, who,'🐴');
      }
    });
  }catch(e){console.warn('[CCE] Session reminders skipped',e);}
}
// Run on every page (admin, instructor portal, anywhere) + every minute
setTimeout(checkSessionReminders,4000);
setInterval(checkSessionReminders,60000);

function sendBrowserPush(title, body, icon){
  if(typeof Notification==='undefined'||Notification.permission!=='granted') return;
  try{
    const iconUrl=icon&&/^(https?:|data:|\/)/.test(icon)?icon:'icons/icon-192.png';
    new Notification(title,{body,icon:iconUrl,badge:'icons/icon-96.png',tag:'cce-'+Date.now()});
  }catch(e){console.log('Push error:',e);}
}

function testPush(){
  if(typeof Notification==='undefined'||Notification.permission!=='granted'){alert('يجب تفعيل الإشعارات أولاً');return;}
  sendBrowserPush('CCE — Test Notification','🐴 هذا اختبار للإشعارات — كل شيء يعمل!');
  logNotif('✅ تم إرسال Browser Push تجريبي');
}

// ── Save Settings ──
function saveNotifSettings(){
  const time=document.getElementById('notifTime').value;
  notifSet('time',time);
  ['farrier','deworm','vaccine','teeth','overdue','bookings'].forEach(k=>{
    const el=document.getElementById('notif-'+k);
    if(el) notifSet('check_'+k,el.checked);
  });
  notifSet('bookings_instant',document.getElementById('notifBookings').value);
  logNotif('✅ تم حفظ الإعدادات — الإشعارات اليومية الساعة '+time);
  alert('✅ تم حفظ الإعدادات!');
}

// ── Build Notifications Messages ──
function buildNotifMessages(){
  const today=new Date(); today.setHours(0,0,0,0);
  function daysSince(d){if(!d)return null;const dt=new Date(d);dt.setHours(0,0,0,0);return Math.floor((today-dt)/86400000);}
  const msgs=[];
  const role=String(window.CCE_MEMBER?.role?.code||window.CCE_MEMBER?.portal||'').toLowerCase();
  const baseHorses=['owner','horse_owner'].includes(role)?(ownerHorses||[]):horses;
  const notificationHorses=window.CCE?.health?.mergeCompletedSummaries
    ? CCE.health.mergeCompletedSummaries(baseHorses,horse_health_events)
    : baseHorses;

  // Health alerts
  if(notifGet('check_farrier')!==false){
    notificationHorses.filter(h=>h.status==='Available'||h.status==='Out').forEach(h=>{
      const d=daysSince(h.farrier_date);
      if(d!==null&&d>30) msgs.push('🔧 Farrier: '+h.horse_name+' ('+d+' days)');
      if(!h.farrier_date) msgs.push('⚠️ No farrier date: '+h.horse_name);
    });
  }
  if(notifGet('check_deworm')!==false){
    notificationHorses.filter(h=>h.status==='Available'||h.status==='Out').forEach(h=>{
      const d=daysSince(h.deworm_date);
      if(d!==null&&d>90) msgs.push('🐛 Deworm: '+h.horse_name+' ('+d+' days)');
    });
  }
  if(notifGet('check_vaccine')!==false){
    notificationHorses.filter(h=>h.status==='Available'||h.status==='Out').forEach(h=>{
      const d=daysSince(h.vaccine_date);
      if(d!==null&&d>150) msgs.push('💉 Vaccine: '+h.horse_name+' ('+d+' days)');
    });
  }
  if(notifGet('check_teeth')!==false){
    notificationHorses.filter(h=>h.status==='Available'||h.status==='Out').forEach(h=>{
      const d=daysSince(h.teeth_date);
      if(d!==null&&d>180) msgs.push('🦷 Teeth: '+h.horse_name+' ('+d+' days)');
    });
  }

  // Overdue payments
  if(notifGet('check_overdue')!==false){
    const overdueExp=expenses.filter(isOverdueRow);
    const overdueInc=income.filter(isOverdueRow);
    if(overdueExp.length) msgs.push('💰 Overdue expenses: '+overdueExp.length+' items');
    if(overdueInc.length) msgs.push('💰 Overdue income: '+overdueInc.length+' items');
  }

  // Pending bookings
  if(notifGet('check_bookings')!==false){
    const bookings=pendingBookingRequests();
    if(bookings.length) msgs.push('📋 Pending bookings: '+bookings.length);
  }

  return msgs;
}

// ── Send All Notifications ──
async function sendAllNotifications(){
  const msgs=buildNotifMessages();
  if(!msgs.length){
    logNotif('✅ لا توجد تنبيهات حالياً — كل شيء على ما يرام!');
    sendBrowserPush('CCE — All Clear ✅','لا توجد مواعيد متأخرة أو حجوزات معلقة 🐴');
    notifSet('last_sent',new Date().toISOString());
    return;
  }

  // Browser notifications
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    msgs.slice(0,3).forEach((m,i)=>setTimeout(()=>sendBrowserPush('CCE Alert',m),i*500));
    if(msgs.length>3) setTimeout(()=>sendBrowserPush('CCE Alert','...و '+(msgs.length-3)+' تنبيهات أخرى'),1500);
  }

  logNotif('🔔 تم إرسال '+msgs.length+' تنبيه — '+new Date().toLocaleTimeString('en-GB'));
  notifSet('last_sent',new Date().toISOString());
}

// ── Auto-schedule: check if daily notification time has passed ──
function checkScheduledNotifications(){
  if(!window.CCE_MEMBER)return;
  if(typeof window.canUser==='function'&&!window.canUser('notifications.view')&&!window.canUser('settings.manage'))return;
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  const savedTime=notifGet('time');
  if(!savedTime) return;
  const lastSent=notifGet('last_sent');
  const now=new Date();
  const today=now.toDateString();
  if(lastSent&&new Date(lastSent).toDateString()===today) return; // already sent today

  const [h,m]=savedTime.split(':').map(Number);
  const scheduled=new Date(); scheduled.setHours(h,m,0,0);
  if(now>=scheduled){
    sendAllNotifications();
  }
}
setInterval(checkScheduledNotifications,60000);

// ── Instant notification on new booking ──
function notifyNewBooking(customerName, horseName, time){
  if(notifGet('bookings_instant')==='0') return;
  const msg='📋 *New Booking!*\n'+customerName+' — '+horseName+' @ '+time;
  sendBrowserPush('CCE — New Booking! 📋',customerName+' — '+horseName+' @ '+time);
  logNotif('📋 Booking notification sent: '+customerName);
}

// ── Log ──
function logNotif(msg){
  const el=document.getElementById('notifLog');
  if(!el) return;
  const time=new Date().toLocaleTimeString('en-GB');
  el.innerHTML='<div style="padding:3px 0;border-bottom:1px solid var(--border)">'+time+' — '+msg+'</div>'+el.innerHTML;
}


// ══════════════════════════════════════════════════════════
// SCHEDULE / TIMETABLE
// ══════════════════════════════════════════════════════════

let schedView='active';
let schedStatus='scheduled';
let schedDate=new Date(); schedDate.setHours(0,0,0,0);

const ACTIVITY_COLORS={
  'Hack':'#C8923A','Lesson':'#1E7D4E','Breeding':'#1A2744',
  'Shuwar':'#8B4513','Livery':'#5B6A8A','Rent':'#9B6A3C','Others':'#7A8399'
};

function actColor(a){return ACTIVITY_COLORS[normalizeActivityCategory(a)]||'#7A8399';}

function setSchedView(v){
  schedView=v;
  const btns={active:'schedViewActive',day:'schedViewDay',week:'schedViewWeek'};
  Object.keys(btns).forEach(k=>{
    const b=document.getElementById(btns[k]);
    if(b){b.style.background=v===k?'var(--amber)':'#f0f0f0';b.style.color=v===k?'#fff':'var(--navy)';}
  });
  renderSchedule();
}

function sessionStatusKey(value){
  const status=String(value||'').trim().toLowerCase();
  if(['done','completed','paid'].includes(status))return 'done';
  if(['cancelled','canceled','rejected'].includes(status))return 'cancelled';
  if(['scheduled','confirmed','active'].includes(status))return 'scheduled';
  return 'pending';
}

function sessionMatchesStatus(session,status){
  return status==='all'||sessionStatusKey(session&&session.status)===status;
}

function sessionStatusLabel(status){
  return ({all:'All',scheduled:'Scheduled',done:'Done',pending:'Pending',cancelled:'Cancelled'})[status]||'All';
}

function syncSchedStatusButtons(){
  const buttons={all:'schedStatusAll',scheduled:'schedStatusScheduled',done:'schedStatusDone',pending:'schedStatusPending',cancelled:'schedStatusCancelled'};
  Object.entries(buttons).forEach(([status,id])=>{
    const button=document.getElementById(id);if(!button)return;
    button.style.background=schedStatus===status?'var(--amber)':'#f0f0f0';
    button.style.color=schedStatus===status?'#fff':'var(--navy)';
  });
}

function setSchedStatus(status){
  if(!['all','scheduled','done','pending','cancelled'].includes(status))return;
  schedStatus=status;
  syncSchedStatusButtons();
  renderSchedule();
}

function schedNav(dir){
  if(schedView==='active'){setSchedView('day');return;}
  if(schedView==='day') schedDate.setDate(schedDate.getDate()+dir);
  else schedDate.setDate(schedDate.getDate()+(dir*7));
  renderSchedule();
}

function schedGoToday(){
  schedDate=new Date(); schedDate.setHours(0,0,0,0);
  renderSchedule();
}

function fmtDateKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function fmtDisplayDate(v){
  if(!v) return '—';
  const s=String(v).slice(0,10);
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return m[3]+'/'+m[2]+'/'+m[1];
  const d=new Date(v);
  if(!isNaN(d)) return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  return s;
}

function fmtTimeShort(v){
  if(!v) return '';
  const s=String(v);
  const m=s.match(/^(\d{1,2}):(\d{2})/);
  return m ? String(m[1]).padStart(2,'0')+':'+m[2] : s;
}

function getWeekDays(d){
  const days=[];
  const start=new Date(d);
  const dow=start.getDay();
  start.setDate(start.getDate()-dow); // Sunday
  for(let i=0;i<7;i++){
    const day=new Date(start);
    day.setDate(start.getDate()+i);
    days.push(day);
  }
  return days;
}

// Merge income records + schedule_data into unified events
function getAllEvents(){
  const events=[];
  // Schedule shows ONLY rides & training sessions (Hack / Lesson)
  const isSession=a=>/hack|lesson|ride|training/i.test(a||'');

  const incomeByBooking=new Map(income.filter(row=>row.booking_request_id!=null).map(row=>[String(row.booking_request_id),row]));
  const materializedSlots=new Set(schedule_data
    .filter(row=>row.booking_request_id!=null&&row.booking_slot_index!=null)
    .map(row=>String(row.booking_request_id)+':'+String(row.booking_slot_index)));

  // From schedule table
  schedule_data.filter(r=>isSession(r.activity)).forEach(r=>{
    const financial=r.booking_request_id!=null?incomeByBooking.get(String(r.booking_request_id)):null;
    events.push({
      id:'s_'+r.id,
      dbId:r.id,
      source:'schedule',
      date:r.date,
      start:r.start_time||'00:00',
      end:r.end_time||'',
      activity:normalizeActivityCategory(r.activity),
      horse:r.horse_name||'',
      customer:r.customer_name||'',
      instructor:instructorNameById(r.instructor_id,r.instructor||''),
      notes:r.notes||'',
      status:r.status||'Scheduled',
      paymentStatus:financial?.status||'',
      color:actColor(r.activity)
    });
  });

  // From income (rides & lessons). Training packages may contain several slots in notes.
  income.filter(r=>r.date&&isSession(r.activity)).forEach(r=>{
    const request=bookingRequestForIncome(r);
    const slots=extractTrainingSlots(r);
    const list=slots.length?slots:[{date:r.date,start:r.start_time||'00:00'}];
    list.forEach((slot,idx)=>{
      if(r.booking_request_id!=null&&materializedSlots.has(String(r.booking_request_id)+':'+String(idx+1)))return;
      const requestStatus=request?.status||'';
      const operationalStatus=requestStatus
        ?(['Completed'].includes(requestStatus)?'Done':['Cancelled','Rejected'].includes(requestStatus)?'Cancelled':['Scheduled','Confirmed'].includes(requestStatus)?'Scheduled':'Pending')
        :(isPaidRow(r)?'Done':'Pending');
      events.push({
      id:'i_'+r.id+'_'+idx,
      dbId:r.id,
      source:'income',
      date:slot.date,
      start:slot.start,
      end:r.end_time||'',
      activity:normalizeActivityCategory(r.activity),
      horse:r.horse_name||'',
      customer:r.customer_name||'',
      instructor:instructorNameById(r.instructor_id,''),
      notes:r.notes||'',
      status:operationalStatus,
      paymentStatus:r.status||'',
      color:actColor(r.activity)
      });
    });
  });

  return events.sort((a,b)=>a.start.localeCompare(b.start));
}

function adminSessionCard(ev){
  const statusKey=sessionStatusKey(ev.status);
  const isDone=statusKey==='done';
  const statusColor=isDone?'var(--green)':statusKey==='cancelled'?'var(--red)':'var(--amber)';
  const statusBg=isDone?'#E8F5EE':statusKey==='cancelled'?'#FDECEA':'#FEF3E2';
  return `<div onclick="viewEvent('${ev.id}')" style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;border-left:4px solid ${ev.color};cursor:pointer;opacity:${isDone?0.75:1}">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:28px">🐴</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span style="font-weight:700;font-size:15px;color:var(--navy)">${esc(fmtTimeShort(ev.start||''))} ${esc(ev.activity||'')}</span>
          <span style="background:${statusBg};color:${statusColor};border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">${esc(ev.status)}</span>
          ${ev.paymentStatus?`<span style="background:#EEF3FF;color:var(--navy);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">Payment: ${esc(ev.paymentStatus)}</span>`:''}
          ${ev.source==='income'?'<span style="background:#e8f0ff;color:#1A2744;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">Income</span>':''}
        </div>
        <div style="font-size:13px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap">
          ${ev.horse?`<span>🐴 ${esc(ev.horse)}</span>`:''}
          ${ev.customer?`<span>👤 ${esc(ev.customer)}</span>`:''}
          ${ev.instructor?`<span>🎓 ${esc(ev.instructor)}</span>`:''}
          ${(ev.date||ev.start)?`<span>📅 ${esc(fmtDisplayDate(ev.date))} &nbsp; ⏱ ${esc(fmtTimeShort(ev.start))}${ev.end?' → '+esc(fmtTimeShort(ev.end)):''}</span>`:''}
        </div>
        ${ev.notes?`<div style="margin-top:8px;background:var(--sand);border-radius:8px;padding:8px 10px;font-size:12px">${esc(ev.notes)}</div>`:''}
      </div>
    </div>
  </div>`;
}

function renderSchedule(){
  const el=document.getElementById('schedCalendar');
  if(!el) return;

  const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today=new Date(); today.setHours(0,0,0,0);
  syncSchedStatusButtons();
  const allEvents=getAllEvents();
  const visibleEvents=allEvents.filter(event=>sessionMatchesStatus(event,schedStatus));

  if(schedView==='active'){
    // All dates; status is controlled independently by schedStatus.
    const activeEvents=visibleEvents;
    document.getElementById('schedDateLabel').textContent='All Dates — '+sessionStatusLabel(schedStatus);
    if(!activeEvents.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);background:#fff;border-radius:14px;border:1px solid var(--border)">No '+esc(sessionStatusLabel(schedStatus).toLowerCase())+' sessions</div>';
      return;
    }
    // Sort by date then time
    activeEvents.sort((a,b)=>{
      if(a.date!==b.date) return a.date<b.date?-1:1;
      return (a.start||'').localeCompare(b.start||'');
    });
    // Group by date with day headers
    let html='';let lastDate='';
    activeEvents.forEach(ev=>{
      if(ev.date!==lastDate){
        lastDate=ev.date;
        const d=new Date(ev.date+'T00:00:00');
        const isToday=ev.date===fmtDateKey(today);
        html+=`<div style="font-weight:700;font-size:13px;color:${isToday?'var(--green)':'var(--muted)'};margin:14px 0 6px;padding:4px 0;border-bottom:2px solid ${isToday?'var(--green)':'var(--border)'}">
          ${isToday?'🟢 ':''}${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}
        </div>`;
      }
      html+=adminSessionCard(ev);
    });
    el.innerHTML=html;

  } else if(schedView==='day'){
    const key=fmtDateKey(schedDate);
    const dayEvents=visibleEvents.filter(e=>e.date===key);
    const isToday=fmtDateKey(schedDate)===fmtDateKey(today);

    document.getElementById('schedDateLabel').textContent=
      (isToday?'🟢 ':'')+DAY_NAMES[schedDate.getDay()]+', '+schedDate.getDate()+' '+MONTHS[schedDate.getMonth()]+' '+schedDate.getFullYear();

    // Card list view — same style as Instructor Portal
    if(!dayEvents.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);background:#fff;border-radius:14px;border:1px solid var(--border)">No sessions scheduled</div>';
    }else{
      el.innerHTML=dayEvents.map(ev=>adminSessionCard(ev)).join('');
    }

  } else {
    // WEEK VIEW — grouped day cards, same style as Instructor Portal
    const weekDays=getWeekDays(schedDate);
    const startStr=weekDays[0].getDate()+' '+MONTHS[weekDays[0].getMonth()];
    const endStr=weekDays[6].getDate()+' '+MONTHS[weekDays[6].getMonth()]+' '+weekDays[6].getFullYear();
    document.getElementById('schedDateLabel').textContent=startStr+' — '+endStr;

    let html='';
    weekDays.forEach(d=>{
      const key=fmtDateKey(d);
      const isToday=key===fmtDateKey(today);
      const daySess=visibleEvents.filter(e=>e.date===key);
      html+=`<div style="margin-bottom:14px">
        <div style="font-weight:700;font-size:13px;color:${isToday?'var(--green)':'var(--muted)'};margin-bottom:6px;padding:4px 0;border-bottom:2px solid ${isToday?'var(--green)':'var(--border)'}">
          ${isToday?'🟢 ':''}${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}
        </div>
        ${daySess.length?daySess.map(ev=>adminSessionCard(ev)).join(''):'<div style="padding:10px;color:var(--muted);font-size:12px">No sessions</div>'}
      </div>`;
    });
    el.innerHTML=html;
  }
}

function viewEvent(id){
  const all=getAllEvents();
  const ev=all.find(e=>e.id===id);
  if(!ev) return;
  const src=ev.source==='income'?'<span style="background:#e8f0ff;color:#1A2744;border-radius:6px;padding:2px 8px;font-size:11px">From Income</span>':'<span style="background:#e8f5ee;color:var(--green);border-radius:6px;padding:2px 8px;font-size:11px">Scheduled</span>';
  openModal('&#128197; '+esc(ev.activity)+' — '+esc(ev.date),`
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:8px;align-items:center">${src}
        <span style="background:${ev.color};color:#fff;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700">${esc(ev.status)}</span>
      </div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr">
        <div><div style="font-size:11px;color:var(--muted)">Date</div><div style="font-weight:700">${fmt(ev.date)}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Time</div><div style="font-weight:700">${esc(ev.start)}${ev.end?' → '+esc(ev.end):''}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Activity</div><div style="font-weight:700">${esc(ev.activity)}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Horse</div><div style="font-weight:700">${esc(ev.horse||'—')}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Customer</div><div style="font-weight:700">${esc(ev.customer||'—')}</div></div>
        ${ev.instructor?`<div><div style="font-size:11px;color:var(--muted)">Instructor</div><div style="font-weight:700">${esc(ev.instructor)}</div></div>`:''}
      </div>
      ${ev.notes?`<div style="background:var(--sand);padding:10px;border-radius:8px;font-size:13px">${esc(ev.notes)}</div>`:''}
      <div class="btn-row">
        ${ev.source==='schedule'?`<button class="btn btn-amber" onclick="closeModal();openEditSchedule('${ev.dbId}')">&#9999;&#65039; Edit</button>`:''}
        ${ev.source==='schedule'&&ev.status!=='Done'?`<button class="btn btn-green" style="width:auto;padding:8px 16px" onclick="markSchedDone('${ev.dbId}')">&#9989; Mark Done</button>`:''}
        ${ev.source==='schedule'?`<button class="btn" style="background:#FDECEA;color:var(--red);width:auto;padding:8px 16px" onclick="delSchedule('${ev.dbId}')">&#128465;&#65039;</button>`:''}
        <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Close</button>
      </div>
    </div>`);
}

function openAddSchedule(prefillDate){
  const d=prefillDate||fmtDateKey(schedDate);
  openModal('&#10133; Add Session',`
    <div class="form-grid">
      <div class="form-group"><label>Date *</label><input type="date" id="sc-date" value="${d}"></div>
      <div class="form-group"><label>Activity *</label><select id="sc-activity" onchange="syncScheduleInstructorField()"><option>Hack</option><option>Lesson</option><option>Breeding</option><option>Shuwar</option><option>Livery</option><option>Rent</option><option>Others</option></select></div>
      <div class="form-group"><label>Start Time *</label><input type="time" id="sc-start" value="08:00"></div>
      <div class="form-group"><label>End Time</label><input type="time" id="sc-end" value="09:00"></div>
      <div class="form-group"><label>Horse</label><select id="sc-horse"><option value="">— Select —</option>${horses.map(h=>`<option value="${escAttr(h.horse_name)}">${esc(h.horse_name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Customer</label><input type="text" id="sc-customer" list="cList" placeholder="Name..."></div>
      <div class="form-group" id="sc-instructor-wrap"><label id="sc-instructor-label">Instructor</label><select id="sc-instructor-id">${activeInstructorOptions()}</select><div id="sc-instructor-note" style="font-size:11px;color:var(--muted);margin-top:5px">Optional for non-training sessions.</div></div>
      <div class="form-group"><label>Status</label><select id="sc-status"><option>Scheduled</option><option>Done</option><option>Cancelled</option></select></div>
      <div class="form-group" style="grid-column:1/-1"><label>Notes</label><input type="text" id="sc-notes" placeholder="Optional notes..."></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-green" onclick="saveSchedule()">&#128190; Save Session</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
  syncScheduleInstructorField();
}

function syncScheduleInstructorField(){
  const activity=normalizeActivityCategory(document.getElementById('sc-activity')?.value||'');
  const training=['lesson','training'].includes(activity.toLowerCase());
  const select=document.getElementById('sc-instructor-id');
  const label=document.getElementById('sc-instructor-label');
  const note=document.getElementById('sc-instructor-note');
  if(select)select.required=training;
  if(label)label.textContent=training?'Instructor *':'Instructor';
  if(note)note.textContent=training?'Required: assign this training session to an active instructor.':'Optional for non-training sessions.';
}

async function saveSchedule(){
  const date=document.getElementById('sc-date').value;
  const start=document.getElementById('sc-start').value;
  if(!date||!start){alert('Date and Start Time are required');return;}
  const horse=document.getElementById('sc-horse').value||'';
  const activity=normalizeActivityCategory(document.getElementById('sc-activity').value);
  const trainer=selectedInstructor('sc-instructor-id');
  if(['lesson','training'].includes(activity.toLowerCase())&&!trainer){alert('Select an instructor for this training session.');return;}
  const instructor=trainer?.name||'';
  const end=document.getElementById('sc-end').value||'';
  if(alertConflicts(findBookingConflicts({date,start,end,horse,instructor})))return;
  try{
    await sbPost('schedule',{ 
      date,start_time:start,
      end_time:end||null,
      activity,
      horse_name:horse||null,
      customer_name:document.getElementById('sc-customer').value||null,
      instructor:instructor||null,
      instructor_id:trainer?.id||null,
      status:document.getElementById('sc-status').value,
      notes:document.getElementById('sc-notes').value||null,
      color:actColor(document.getElementById('sc-activity').value)
    });
    closeModal();await loadAll();
  }catch(e){showError('Error',e);}
}

async function openEditSchedule(id){
  const r=schedule_data.find(x=>String(x.id)===String(id));
  if(!r){alert('⚠️ Session not found. Please refresh and try again.');return;}
  const selectedInstructorId=r.instructor_id||instructors_data.find(i=>normText(i.name)===normText(r.instructor))?.id||'';
  openModal('&#9999;&#65039; Edit Session',`
    <div class="form-grid">
      <div class="form-group"><label>Date</label><input type="date" id="sc-date" value="${r.date||''}"></div>
      <div class="form-group"><label>Activity</label><select id="sc-activity" onchange="syncScheduleInstructorField()"><option ${r.activity==='Hack'?'selected':''}>Hack</option><option ${r.activity==='Lesson'?'selected':''}>Lesson</option><option ${r.activity==='Breeding'?'selected':''}>Breeding</option><option ${r.activity==='Shuwar'?'selected':''}>Shuwar</option><option ${r.activity==='Livery'?'selected':''}>Livery</option><option ${r.activity==='Rent'?'selected':''}>Rent</option><option ${normalizeActivityCategory(r.activity)==='Others'?'selected':''}>Others</option></select></div>
      <div class="form-group"><label>Start Time</label><input type="time" id="sc-start" value="${r.start_time||''}"></div>
      <div class="form-group"><label>End Time</label><input type="time" id="sc-end" value="${r.end_time||''}"></div>
      <div class="form-group"><label>Horse</label><select id="sc-horse"><option value="">— Select —</option>${horses.map(h=>`<option value="${escAttr(h.horse_name)}" ${h.horse_name===r.horse_name?'selected':''}>${esc(h.horse_name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Customer</label><input type="text" id="sc-customer" value="${r.customer_name||''}"></div>
      <div class="form-group" id="sc-instructor-wrap"><label id="sc-instructor-label">Instructor</label><select id="sc-instructor-id">${activeInstructorOptions(selectedInstructorId,r.instructor||'')}</select><div id="sc-instructor-note" style="font-size:11px;color:var(--muted);margin-top:5px"></div></div>
      <div class="form-group"><label>Status</label><select id="sc-status"><option ${r.status==='Scheduled'?'selected':''}>Scheduled</option><option ${r.status==='Done'?'selected':''}>Done</option><option ${r.status==='Cancelled'?'selected':''}>Cancelled</option></select></div>
      <div class="form-group" style="grid-column:1/-1"><label>Notes</label><input type="text" id="sc-notes" value="${r.notes||''}"></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-amber" onclick="updateSchedule('${r.id}')">&#128190; Save Changes</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
  syncScheduleInstructorField();
}

async function updateSchedule(id){
  const date=document.getElementById('sc-date').value;
  const start=document.getElementById('sc-start').value;
  const end=document.getElementById('sc-end').value||'';
  const horse=document.getElementById('sc-horse').value||'';
  const activity=normalizeActivityCategory(document.getElementById('sc-activity').value);
  const trainer=selectedInstructor('sc-instructor-id');
  if(['lesson','training'].includes(activity.toLowerCase())&&!trainer){alert('Select an instructor for this training session.');return;}
  const instructor=trainer?.name||'';
  if(alertConflicts(findBookingConflicts({date,start,end,horse,instructor},{source:'schedule',dbId:id})))return;
  try{
    await sbPatch('schedule',id,{
      date:document.getElementById('sc-date').value,
      start_time:document.getElementById('sc-start').value,
      end_time:end||null,
      activity,
      horse_name:horse||null,
      customer_name:document.getElementById('sc-customer').value||null,
      instructor:instructor||null,
      instructor_id:trainer?.id||null,
      status:document.getElementById('sc-status').value,
      notes:document.getElementById('sc-notes').value||null,
      color:actColor(document.getElementById('sc-activity').value)
    });
    closeModal();await loadAll();
  }catch(e){showError('Error',e);}
}

async function markSchedDone(id){
  if(!confirm('Mark this session as Done?'))return;
  try{await sbPatch('schedule',id,{status:'Done'});closeModal();await loadAll();}
  catch(e){showError('Error',e);}
}

async function delSchedule(id){
  if(!confirm('Delete this session?'))return;
  try{await sbDel('schedule',id);closeModal();await loadAll();}
  catch(e){showError('Error',e);}
}


// ══════════════════════════════════════════════════════════
// INSTRUCTOR PORTAL
// ══════════════════════════════════════════════════════════

let currentInstructor = null;
let instrView = 'active';
let instrStatus = 'scheduled';
let instrScope = 'all';
let instrDate = new Date(); instrDate.setHours(0,0,0,0);
const MONTHS_AR=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_AR=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Restore instructor session (login is now username/password) ──
async function loadInstructorNames(){
  try{
    const saved=sessionStorage.getItem('cce_instr');
    if(saved){
      currentInstructor=JSON.parse(saved);
      showInstrPortal();
    }
  }catch(e){console.log('instr session error',e);}
}

// ── Login ──
async function doInstrLogin(){
  const user=(document.getElementById('instrUser').value||'').trim();
  const pwd=(document.getElementById('instrPwd').value||'').trim();
  const errEl=document.getElementById('instrErr');
  if(!user||!pwd){if(errEl)errEl.style.display='block';return;}
  try{
    const hashed=await sha256Hex(pwd);
    let list=await sbRpc('cce_instructor_login',{p_name:user,p_secret:hashed});
    if(!list.length) list=await sbRpc('cce_instructor_login',{p_name:user,p_secret:pwd});
    const matched=Array.isArray(list)?list[0]:list;
    if(!matched){
      if(errEl) errEl.style.display='block';
      document.getElementById('instrPwd').value='';
      return;
    }
    currentInstructor={...matched,pin:'[protected]'};
    sessionStorage.setItem('cce_instr',JSON.stringify(currentInstructor));
    document.getElementById('instrUser').value='';
    document.getElementById('instrPwd').value='';
    if(errEl) errEl.style.display='none';
    showInstrPortal();
  }catch(e){showError('Login Error',e);}
}

function showInstrPortal(){
  document.getElementById('instrLoginWrap').style.display='none';
  document.getElementById('instrPortal').style.display='block';
  document.getElementById('instrLogoutBtn').classList.remove('hidden');
  document.getElementById('instrHeaderSub').textContent=currentInstructor.name+' — Instructor Portal';
  document.getElementById('instrWelcome').textContent='Welcome, '+currentInstructor.name+'! 👋';
  instrView='active';
  instrStatus='scheduled';
  instrDate=new Date(); instrDate.setHours(0,0,0,0);
  loadInstrData();
}

function logoutInstructor(){
  sessionStorage.removeItem('cce_instr');
  currentInstructor=null;
  document.getElementById('instrLoginWrap').style.display='block';
  document.getElementById('instrPortal').style.display='none';
  document.getElementById('instrLogoutBtn').classList.add('hidden');
  document.getElementById('instrHeaderSub').textContent='Instructor Portal';
  const iu=document.getElementById('instrUser');if(iu)iu.value='';
  const ip=document.getElementById('instrPwd');if(ip)ip.value='';
}

// ── Load instructor's sessions ──
async function loadInstrData(){
  if(!currentInstructor) return;
  try{
    // Instructor portal loads only the logged-in instructor schedule.
    const mySessions=await sbRpc('cce_instructor_schedule',{p_instructor_name:currentInstructor.name});
    const allSessions=mySessions;

    // Stats stay personal for the logged-in instructor; the list below can show all trainers.
    const today=new Date(); today.setHours(0,0,0,0);
    const todayKey=fmtDateKey(today);
    const nowMonth=today.getMonth(); const nowYear=today.getFullYear();
    const todaySess=mySessions.filter(s=>s.date===todayKey);
    const monthSess=mySessions.filter(s=>{
      const d=new Date(s.date);
      return !isNaN(d)&&d.getMonth()===nowMonth&&d.getFullYear()===nowYear;
    });
    document.getElementById('instrTodayCount').textContent=todaySess.length;
    document.getElementById('instrMonthCount').textContent=monthSess.length;
    document.getElementById('instrMonthStats').textContent=
      MONTHS_AR[nowMonth]+' '+nowYear+' — '+monthSess.length+' of your sessions';

    // Render all schedule rows by default. The filter can switch to the logged-in instructor only.
    window._instrAllSessions=allSessions;
    window._instrMySessions=mySessions;
    window._instrSessions=allSessions;
    renderInstrSchedule();
  }catch(e){

    window._instrAllSessions=[];
    window._instrMySessions=[];
    window._instrSessions=[];
    renderInstrSchedule();
    const st=document.getElementById('instrMonthStats');
    if(st) st.textContent='Schedule loading error: '+userSafeError(e);
    showError('Schedule Error',e);
  }
}

function setInstrView(v){
  instrView=v;
  document.getElementById('instrViewActive').style.background=v==='active'?'var(--green)':'#f0f0f0';
  document.getElementById('instrViewActive').style.color=v==='active'?'#fff':'var(--navy)';
  document.getElementById('instrViewWeek').style.background=v==='week'?'var(--green)':'#f0f0f0';
  document.getElementById('instrViewWeek').style.color=v==='week'?'#fff':'var(--navy)';
  renderInstrSchedule();
}

function syncInstrStatusButtons(){
  const buttons={all:'instrStatusAll',scheduled:'instrStatusScheduled',done:'instrStatusDone',cancelled:'instrStatusCancelled'};
  Object.entries(buttons).forEach(([status,id])=>{
    const button=document.getElementById(id);if(!button)return;
    button.style.background=instrStatus===status?'var(--green)':'#f0f0f0';
    button.style.color=instrStatus===status?'#fff':'var(--navy)';
  });
}

function setInstrStatus(status){
  if(!['all','scheduled','done','cancelled'].includes(status))return;
  instrStatus=status;
  syncInstrStatusButtons();
  renderInstrSchedule();
}

function setInstrScope(scope){
  instrScope=scope;
  window._instrSessions = window._instrMySessions||[];
  const allBtn=document.getElementById('instrScopeAll');
  const mineBtn=document.getElementById('instrScopeMine');
  if(allBtn){allBtn.style.background=scope==='all'?'var(--green)':'#f0f0f0'; allBtn.style.color=scope==='all'?'#fff':'var(--navy)';}
  if(mineBtn){mineBtn.style.background=scope==='mine'?'var(--green)':'#f0f0f0'; mineBtn.style.color=scope==='mine'?'#fff':'var(--navy)';}
  renderInstrSchedule();
}

function instrNav(dir){
  if(instrView==='active') return; // Active view doesn't navigate
  else if(instrView==='week') instrDate.setDate(instrDate.getDate()+(dir*7));
  renderInstrSchedule();
}
function instrGoToday(){ instrDate=new Date(); instrDate.setHours(0,0,0,0); renderInstrSchedule(); }

function renderInstrSchedule(){
  const el=document.getElementById('instrSessions');
  if(!el||!currentInstructor) return;
  const sessions=window._instrSessions||[];
  syncInstrStatusButtons();
  const visibleSessions=sessions.filter(session=>sessionMatchesStatus(session,instrStatus));
  const today=new Date(); today.setHours(0,0,0,0);

  if(instrView==='active'){
    // All dates; status is controlled independently by instrStatus.
    const activeSess=visibleSessions;
    document.getElementById('instrDateLabel').textContent='All Dates — '+sessionStatusLabel(instrStatus)+' — My Sessions';
    if(!activeSess.length){
      el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);background:#fff;border-radius:14px;border:1px solid var(--border)">No '+esc(sessionStatusLabel(instrStatus).toLowerCase())+' sessions</div>';
      return;
    }
    // Sort by date and time
    activeSess.sort((a,b)=>{
      const dateA=new Date(a.date);
      const dateB=new Date(b.date);
      if(dateA.getTime()!==dateB.getTime()) return dateA-dateB;
      const timeA=parseInt((a.start_time||'00:00').replace(':',''));
      const timeB=parseInt((b.start_time||'00:00').replace(':',''));
      return timeA-timeB;
    });
    el.innerHTML=activeSess.map(s=>instrSessionCard(s)).join('');
  } else if(instrView==='week'){
    const weekDays=getWeekDays(instrDate);
    const s0=weekDays[0]; const s6=weekDays[6];
    document.getElementById('instrDateLabel').textContent=
      s0.getDate()+' '+MONTHS_AR[s0.getMonth()]+' — '+s6.getDate()+' '+MONTHS_AR[s6.getMonth()]+' '+s6.getFullYear()+' — My Sessions';
    let html='';
    weekDays.forEach(d=>{
      const key=fmtDateKey(d);
      const isToday=key===fmtDateKey(today);
      const daySess=visibleSessions.filter(s=>s.date===key);
      html+=`<div style="margin-bottom:14px">
        <div style="font-weight:700;font-size:13px;color:${isToday?'var(--green)':'var(--muted)'};margin-bottom:6px;padding:4px 0;border-bottom:2px solid ${isToday?'var(--green)':'var(--border)'}">
          ${isToday?'🟢 ':''} ${DAYS_AR[d.getDay()]} ${d.getDate()} ${MONTHS_AR[d.getMonth()]}
        </div>
        ${daySess.length?daySess.map(s=>instrSessionCard(s)).join(''):'<div style="padding:10px;color:var(--muted);font-size:12px">No sessions</div>'}
      </div>`;
    });
    el.innerHTML=html;
  }
}

function instrSessionCard(s){
  const statusColor=s.status==='Done'?'var(--green)':s.status==='Cancelled'?'var(--red)':'var(--amber)';
  const statusBg=s.status==='Done'?'#E8F5EE':s.status==='Cancelled'?'#FDECEA':'#FEF3E2';
  const startTime=fmtTimeShort(s.start_time||'');
  const endTime=s.end_time?fmtTimeShort(s.end_time):'';
  const ownsSession=(currentInstructor?.id&&String(s.instructor_id||'')===String(currentInstructor.id))||normText(s.instructor)===normText(currentInstructor?.name);
  return `<article class="instructor-session-card" style="--session-accent:${actColor(s.activity)}">
    <div class="instructor-session-main">
      <div class="instructor-session-avatar" aria-hidden="true">🐴</div>
      <div class="instructor-session-content">
        <div class="instructor-session-heading">
          <strong>${esc(s.activity||'Session')} ${esc(startTime)}</strong>
          <span class="instructor-session-status" style="background:${statusBg};color:${statusColor}">${esc(s.status)}</span>
        </div>
        <div class="instructor-session-meta">
          ${s.horse_name?`<span>🐴 ${esc(s.horse_name)}</span>`:''}
          ${s.customer_name?`<span>👤 ${esc(s.customer_name)}</span>`:''}
          ${s.instructor?`<span>🎓 ${esc(s.instructor)}</span>`:''}
          ${s.date?`<span>📅 ${esc(fmtDisplayDate(s.date))}</span>`:''}
          ${startTime?`<span dir="ltr">⏱ ${esc(startTime)}${endTime?' → '+esc(endTime):''}</span>`:''}
        </div>
        ${s.notes?`<div class="instructor-session-note">${esc(s.notes)}</div>`:''}
        ${instrHorseInfo(s.horse_name)}
      </div>
      <div class="instructor-session-actions">
        ${ownsSession&&s.status!=='Done'&&s.status!=='Cancelled'?`<button class="session-icon-btn done" onclick="instrMarkDone(${s.id})" aria-label="Mark done">✓</button>`:''}
        ${ownsSession?`<button class="session-icon-btn note" onclick="instrAddNote(${s.id},${jsStr(s.notes||'')})" aria-label="Add note">✎</button>`:''}
      </div>
    </div>
  </article>`;
}

function instrHorseInfo(horseName){
  if(!horseName||typeof horses==='undefined') return '';
  const h=horses.find(x=>x.horse_name===horseName);
  if(!h) return '';
  return `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
    ${h.sex?`<span style="font-size:11px;background:#f0f0f0;border-radius:5px;padding:2px 7px">${esc(h.sex)}</span>`:''}
    ${h.color?`<span style="font-size:11px;background:#f0f0f0;border-radius:5px;padding:2px 7px">${esc(h.color)}</span>`:''}
    ${h.breed?`<span style="font-size:11px;background:#f0f0f0;border-radius:5px;padding:2px 7px">${esc(h.breed)}</span>`:''}
    ${h.farrier_date?`<span style="font-size:11px;background:#FEF3E2;color:var(--amber);border-radius:5px;padding:2px 7px">🔧 ${fmt(h.farrier_date)}</span>`:''}
  </div>`;
}

async function instrMarkDone(id){
  if(!confirm('Mark this session as Done?')) return;
  try{
    await sbRpc('cce_instructor_update_schedule',{p_schedule_id:id,p_instructor_name:currentInstructor.name,p_status:'Done',p_notes:null});
    await loadInstrData();
  }catch(e){showError('Error',e);}
}

function instrAddNote(id, currentNote){
  openModal('📝 Add Note',`
    <div class="form-group">
      <label>Note</label>
      <textarea id="instr-note" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:11px 14px;font-size:14px;background:#FDFAF4;font-family:'Cairo','Segoe UI', Roboto, Arial, sans-serif;min-height:100px;resize:vertical">${esc(currentNote)}</textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-green" onclick="saveInstrNote(${id})">💾 Save Note</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function saveInstrNote(id){
  const note=document.getElementById('instr-note').value.trim();
  try{
    await sbRpc('cce_instructor_update_schedule',{p_schedule_id:id,p_instructor_name:currentInstructor.name,p_status:null,p_notes:note});
    closeModal();
    await loadInstrData();
  }catch(e){showError('Error',e);}
}

// ── Manage instructors from Admin Dashboard ──
// (Add to horses page or a settings area)


// ══════════════════════════════════════════════════════════
// INSTRUCTORS MANAGEMENT (Admin Dashboard)
// ══════════════════════════════════════════════════════════

function renderInstructors(){
  const el=document.getElementById('instructorsGrid');
  if(!el) return;

  if(!instructors_data.length){
    el.innerHTML='<div class="card" style="text-align:center;color:var(--muted);padding:30px">No instructors added yet</div>';
    return;
  }

  el.innerHTML=instructors_data.map(instr=>{
    const now=new Date();
    const monthSess=schedule_data.filter(s=>{
      const assigned=String(s.instructor_id||'')===String(instr.id)||normText(s.instructor)===normText(instr.name);
      if(!assigned) return false;
      const d=new Date(s.date);
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    });
    const doneSess=monthSess.filter(s=>s.status==='Done');
    const active=!!instr.active;
    const trainerShare=income.filter(r=>String(r.instructor_id||'')===String(instr.id)&&trainingSplitEnabled(r)).reduce((sum,r)=>sum+incomeInstructorShare(r),0);
    const canSeeFinance=typeof window.canUser!=='function'||window.canUser('income.view');

    return `<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px">
      <div style="width:46px;height:46px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0">&#127919;</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;color:var(--navy)">${esc(instr.name)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(instr.phone||'No phone')}</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:11px;background:#E8F5EE;color:var(--green);border-radius:6px;padding:2px 8px;font-weight:600">&#128197; ${monthSess.length} sessions this month</span>
          <span style="font-size:11px;background:#EEF2FF;color:var(--navy);border-radius:6px;padding:2px 8px;font-weight:600">&#9989; ${doneSess.length} done</span>
          <span style="font-size:11px;background:${active?'#E8F5EE':'#FDECEA'};color:${active?'var(--green)':'var(--red)'};border-radius:6px;padding:2px 8px;font-weight:600">${active?'Active':'Inactive'}</span>
          ${canSeeFinance?`<span style="font-size:11px;background:#FFF6DF;color:#8A5A00;border-radius:6px;padding:2px 8px;font-weight:700">Instructor share: ${BD(trainerShare)}</span>`:''}
          <span style="font-size:11px;background:#F0F1F4;color:var(--muted);border-radius:6px;padding:2px 8px;font-weight:600">Password protected</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="action-btn" style="background:#E8EAF0;color:var(--navy);padding:8px 10px;font-size:15px" title="Edit" onclick="editInstructor(${instr.id})">&#9999;&#65039;</button>
        <button class="action-btn" style="background:#FEF3E2;color:var(--amber);padding:8px 10px;font-size:15px" title="Reset Password" onclick="resetInstrPIN(${instr.id},${jsStr(instr.name)})">&#128273;</button>
        <button class="action-btn" style="background:${active?'#FDECEA':'#E8F5EE'};color:${active?'var(--red)':'var(--green)'};padding:8px 10px;font-size:15px" title="${active?'Deactivate':'Activate'}" onclick="toggleInstructor(${instr.id},${active})">${active?'&#128683;':'&#9989;'}</button>
      </div>
    </div>`;
  }).join('');
}

function openAddInstructor(){
  openModal('➕ Add Instructor',`
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label>Full Name *</label><input type="text" id="instr-name" placeholder="Instructor name..."></div>
      <div class="form-group"><label>Phone</label><input type="tel" id="instr-phone" placeholder="+973 XXXXXXXX"></div>
      <div class="form-group">
        <label>Password *</label>
        <input type="password" id="instr-pin" placeholder="Enter password..." autocomplete="new-password">
      </div>
      <div style="font-size:12px;color:var(--muted);background:var(--sand);padding:10px;border-radius:8px">
        ℹ️ The instructor logs in with name + password. The password will be stored as a SHA-256 hash, not displayed later.
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-green" onclick="saveInstructor()">💾 Add Instructor</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function saveInstructor(){
  const name=document.getElementById('instr-name').value.trim();
  const pin=document.getElementById('instr-pin').value.trim();
  const phone=document.getElementById('instr-phone').value.trim();
  if(!name){alert('Name is required');return;}
  if(!pin){alert('Please enter a password');return;}
  try{
    await sbPost('instructors',{name,pin:await hashSecret(pin),phone:phone||null,active:true});
    closeModal();
    await loadAll();
    alert('✅ Instructor added successfully!');
  }catch(e){showError('Error',e);}
}

function editInstructor(id){
  const instr=instructors_data.find(x=>x.id===id);
  if(!instr) return;
  openModal('✏️ Edit Instructor — '+(instr.name||''),`
    <div class="form-grid" style="grid-template-columns:1fr">
      <div class="form-group"><label>Full Name *</label><input type="text" id="instr-name" value="${escAttr(instr.name)}"></div>
      <div class="form-group"><label>Phone</label><input type="tel" id="instr-phone" value="${escAttr(instr.phone||'')}"></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-amber" onclick="updateInstructor(${id})">&#128190; Save Changes</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function updateInstructor(id){
  const name=document.getElementById('instr-name').value.trim();
  const phone=document.getElementById('instr-phone').value.trim();
  if(!name){alert('Name is required');return;}
  try{
    await sbPatch('instructors',id,{name,phone:phone||null});
    closeModal();await loadAll();
  }catch(e){showError('Error',e);}
}

function resetInstrPIN(id,name){
  openModal('&#128273; Reset Password — '+(name||''),`
    <div style="font-size:12px;color:var(--muted);background:var(--sand);padding:10px;border-radius:8px;margin-bottom:12px">
      Current password is protected and cannot be viewed. Enter a new password to replace it.
    </div>
    <div class="form-group">
      <label>New Password *</label>
      <input type="password" id="new-pin" placeholder="New password" autocomplete="new-password"
        style="width:100%;border:1px solid var(--border);border-radius:10px;padding:11px 14px;background:#FDFAF4">
    </div>
    <div class="form-group">
      <label>Confirm Password</label>
      <input type="password" id="confirm-pin" placeholder="Repeat password" autocomplete="new-password"
        style="width:100%;border:1px solid var(--border);border-radius:10px;padding:11px 14px;background:#FDFAF4">
    </div>
    <div class="btn-row">
      <button class="btn btn-amber" onclick="saveInstrPIN(${id})">&#128190; Save Password</button>
      <button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function saveInstrPIN(id){
  const np=document.getElementById('new-pin').value.trim();
  const cp=document.getElementById('confirm-pin').value.trim();
  if(!np){alert('Please enter a password');return;}
  if(np!==cp){alert('Passwords do not match');return;}
  try{
    await sbPatch('instructors',id,{pin:await hashSecret(np)});
    closeModal();
    alert('✅ Password updated successfully!');
    await loadAll();
  }catch(e){showError('Error',e);}
}

async function toggleInstructor(id,isActive){
  const action=isActive?'deactivate':'activate';
  if(!confirm(`Are you sure you want to ${action} this instructor?`)) return;
  try{
    await sbPatch('instructors',id,{active:!isActive});
    await loadAll();
  }catch(e){showError('Error',e);}
}


// ══════════════════════════════════════════════════════════
// LIVERY BOOKING
// ══════════════════════════════════════════════════════════
let selectedLiveryType = '';

function showLiveryPage(){
  document.querySelectorAll('.app-page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-livery').classList.add('active');
  window.scrollTo(0,0);
}

function selectLiveryType(type){
  selectedLiveryType=type;
  document.getElementById('lv-type-full').style.border=type==='full'?'2px solid var(--amber)':'2px solid var(--border)';
  document.getElementById('lv-type-full').style.background=type==='full'?'#fffbf5':'#fff';
  document.getElementById('lv-type-ac').style.border=type==='ac'?'2px solid var(--amber)':'2px solid var(--border)';
  document.getElementById('lv-type-ac').style.background=type==='ac'?'#fffbf5':'#fff';
}

async function submitLivery(){
  const horse=document.getElementById('lv-horse').value.trim();
  const breed=document.getElementById('lv-breed').value.trim();
  const name=document.getElementById('lv-name').value.trim();
  const phone=document.getElementById('lv-phone').value.trim();
  if(!horse||!name||!phone){alert('يرجى تعبئة اسم الحصان واسم المالك ورقم الهاتف.');return;}
  if(!validBahrainPhone(phone)){alert('⚠️ رقم الهاتف يجب أن يتكون من 8 أرقام.');return;}
  if(!selectedLiveryType){alert('Please select a livery type (Full or AC).');return;}
  if(!document.getElementById('lv-terms').checked){alert('⚠️ Please read and agree to the Terms & Conditions to proceed.\nيرجى قراءة والموافقة على الشروط والأحكام للمتابعة.');return;}

  // Build services list
  const services=[];
  services.push(selectedLiveryType==='full'?'Full Livery (80 BD/mo)':'AC Livery (150 BD/mo)');
  if(document.getElementById('lv-shower').checked) services.push('Extra Care - Shower (3 BD)');
  if(document.getElementById('lv-vip-shower').checked) services.push('VIP Shower (10 BD)');
  if(document.getElementById('lv-cleaning').checked) services.push('Extra Care - Cleaning (3 BD)');
  if(document.getElementById('lv-outdoor-leading').checked) services.push('Outdoor Leading (3 BD/day)');
  if(document.getElementById('lv-training').checked) services.push('Extra Care - Training (60 BD)');
if(document.getElementById('lv-teben').checked) services.push('Feed - Teben (3 BD/bundle)');
  if(document.getElementById('lv-hay').checked) services.push('Feed - Hay (11 BD/bundle)');
  if(document.getElementById('lv-wooddust').checked) services.push('Feed - Wood Shavings (10 BD/16 bags)');

  const sex=document.getElementById('lv-sex').value;
  const color=document.getElementById('lv-color').value;
  const date=document.getElementById('lv-date').value;
  const notes=document.getElementById('lv-notes').value.trim();

  const notesText='LIVERY REQUEST — Horse: '+horse+(breed?' ('+breed+')':'')+(sex?' | '+sex:'')+(color?' | '+color:'')+
    ' | Owner: '+name+' | Phone: '+phone+(date?' | Start: '+date:'')+
    ' | Services: '+services.join(', ')+(notes?' | Notes: '+notes:'');

  const btn=document.getElementById('liveryBtn');
  btn.disabled=true;btn.textContent='⏳ Submitting...';

  try{
    const serviceCode=selectedLiveryType==='full'?'livery_full':'livery_ac';
    await publicSubmitBooking({
      p_request_type:'livery',p_service_code:serviceCode,p_customer_name:name,p_phone:phone,
      p_requested_date:date||todayISOForInstallment(),p_start_time:null,p_rider_level:null,
      p_session_slots:[],p_horse_name:horse,p_personal_id:null,p_emergency_contact:null,
      p_birth_date:null,p_health_notes:null,p_services:services,
      p_metadata:{breed:breed||null,sex:sex||null,color:color||null,notes:notes||null,summary:notesText},
      p_terms_accepted:true,p_terms_version:PUBLIC_BOOKING_TERMS_VERSION,p_honeypot:null
    });
    document.getElementById('liveryForm').style.display='none';
    document.getElementById('liverySuccess').style.display='block';
    document.getElementById('liverySuccessText').innerHTML=
      'Thank you <strong>'+esc(name)+'</strong>!<br><br>'+
      '🐴 Horse: <strong>'+esc(horse)+'</strong>'+(breed?' — '+esc(breed):'')+
      (date?'<br>📅 Start Date: <strong>'+esc(date)+'</strong>':'')+
      '<br><br><div style="font-size:12px;text-align:left">'+services.map(s=>'✓ '+esc(s)).join('<br>')+'</div>'+
      '<br>Transfer to IBAN:<br><strong class="iban">BH23BIBB00100002375646</strong><button class="whatsapp-btn secondary" onclick="openWhatsAppProof(\'livery\')">📱 Send Payment Proof via WhatsApp</button>';
  }catch(e){showError('Error',e);btn.disabled=false;btn.textContent='🏠 Submit Livery Request';}
}

function resetLivery(){
  document.getElementById('liveryForm').style.display='block';
  document.getElementById('liverySuccess').style.display='none';
  ['lv-horse','lv-breed','lv-color','lv-name','lv-phone','lv-date','lv-notes'].forEach(id=>document.getElementById(id).value='');
  ['lv-shower','lv-vip-shower','lv-cleaning','lv-outdoor-leading','lv-training','lv-teben','lv-hay','lv-wooddust','lv-terms'].forEach(id=>document.getElementById(id).checked=false);
  document.getElementById('lv-sex').value='';
  selectLiveryType('');
  selectedLiveryType='';
  const btn=document.getElementById('liveryBtn');btn.disabled=false;btn.textContent='🏠 Submit Livery Request';
}



// ══════════════════════════════════════════════════════════
// ADVANCED REPORTS / RECEIPTS / BACKUP / HEALTH / TOOLS
// ══════════════════════════════════════════════════════════
function monthKeyFromDate(d){return String(d||'').slice(0,7);}
function currentMonthKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function previousMonthKey(k=currentMonthKey()){
  const [y,m]=k.split('-').map(Number); const d=new Date(y,m-2,1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function periodStatsForMonth(k){
  const inc=income.filter(r=>monthKeyFromDate(r.date)===k);
  const exp=expenses.filter(r=>monthKeyFromDate(r.date)===k);
  const grossCollected=calcGrossIncomeReceived(inc);
  const cashRevenue=calcIncomeReceived(inc);
  const instructorShares=calcInstructorShares(inc);
  const paidExp=calcPaidExpenses(exp);
  const pendingIncome=calcIncomePending(inc);
  const unpaidExp=calcPendingAmount(exp);
  const netCash=cashRevenue-paidExp;
  const expected=(inc.reduce((s,r)=>s+incomeStableExpected(r),0))-exp.reduce((s,r)=>s+moneyNum(r.amount_bd),0);
  const collectionBase=inc.reduce((s,r)=>s+moneyNum(r.amount_bd),0);
  return {inc,exp,grossCollected,cashRevenue,instructorShares,paidExp,pendingIncome,unpaidExp,netCash,expected,collectionBase,collectionRate:collectionBase?grossCollected/collectionBase*100:0,expenseRatio:cashRevenue?paidExp/cashRevenue*100:0};
}
function pctDelta(cur,prev){ if(!prev) return cur?'+100%':'0%'; const v=((cur-prev)/Math.abs(prev))*100; return (v>=0?'+':'')+v.toFixed(1)+'%';}
function topBy(rows,keyFn,valFn,n=8){const m={};rows.forEach(r=>{const k=normalizeActivityCategory(keyFn(r));m[k]=(m[k]||0)+(valFn(r)||0);});return Object.entries(m).sort(([,a],[,b])=>b-a).slice(0,n);}
function renderMiniTable(rows,title,color='var(--navy)'){
  const content=rows.length?rows.map(([k,v],i)=>`<div class="report-rank-row"><span class="report-rank">${i+1}</span><span class="report-rank-name">${esc(k)}</span><strong class="report-rank-value">${BD(v)}</strong></div>`).join(''):'<p class="report-no-data">No data</p>';
  return `<div class="report-list-card"><div class="report-list-title" style="--report-accent:${color}">${title}</div><div class="report-rank-list">${content}</div></div>`;
}
function renderAdvancedReports(){
  const el=document.getElementById('advancedReports'); if(!el)return;
  const curK=currentMonthKey(), prevK=previousMonthKey(curK);
  const cur=periodStatsForMonth(curK), prev=periodStatsForMonth(prevK);
  const topCustomers=topBy(income,r=>(r.customer_name||'').split('|')[0].trim(),r=>moneyNum(r.paid_bd),10);
  const topServices=topBy(income,r=>r.activity,r=>incomeStableShare(r),10);
  const topExpenses=topBy(expenses,r=>r.category,r=>calcPaidExpenseAmount(r),10);
  const svcProfit=Object.entries(income.reduce((m,r)=>{const k=normalizeActivityCategory(r.activity);m[k]=(m[k]||0)+incomeStableShare(r);return m;},{})).map(([k,v])=>[k, v-(expenses.filter(x=>normalizeActivityCategory(x.category)===k).reduce((s,x)=>s+calcPaidExpenseAmount(x),0))]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const metric=(tone,label,value,sub,icon)=>`<article class="report-metric ${tone}"><div class="report-metric-icon">${icon}</div><div class="report-metric-copy"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></article>`;
  el.innerHTML=`
    <div class="report-metrics">
      ${metric('positive','Stable cash profit',BD(cur.netCash),`vs last month ${pctDelta(cur.netCash,prev.netCash)}`,'↗')}
      ${metric('navy','Gross collected',BD(cur.grossCollected),'Full customer payments before training split','◎')}
      ${metric('gold','Instructor shares',BD(cur.instructorShares),'Immediate 50% of paid training cash','½')}
      ${metric('navy','Expected profit',BD(cur.expected),'Includes pending and unpaid totals','◎')}
      ${metric('gold','Collection rate',cur.collectionRate.toFixed(1)+'%','Cash received from invoiced value','✓')}
      ${metric('danger','Expense ratio',cur.expenseRatio.toFixed(1)+'%','Paid expenses against cash revenue','%')}
      ${metric('soft','Pending income',BD(cur.pendingIncome),'Remaining to collect','◷')}
      ${metric('soft','Unpaid expenses',BD(cur.unpaidExp),'Remaining to pay','!')}
    </div>
    <div class="report-insight-strip">
      <div><span>Current month</span><strong>${curK}</strong></div>
      <p>Prioritize collections when pending income rises, and review service profitability before expanding costs.</p>
    </div>
    <div class="report-grid">
      <section class="report-panel">${renderMiniTable(topCustomers,'Top Customers — Paid','var(--green)')}</section>
      <section class="report-panel">${renderMiniTable(topServices,'Top Services — Stable Revenue','var(--amber)')}</section>
      <section class="report-panel">${renderMiniTable(topExpenses,'Top Expense Categories','var(--red)')}</section>
      <section class="report-panel">${renderMiniTable(svcProfit,'Estimated Service Profit','var(--navy)')}</section>
    </div>`;
}
function receiptNo(r){return 'CCE-'+String(r.date||'0000-00-00').replace(/-/g,'')+'-'+String(r.id||'').padStart(5,'0');}
function receiptHtml(r,mode='receipt'){
  const total=moneyNum(r.amount_bd), paid=moneyNum(r.paid_bd), remaining=Math.max(0,total-paid);
  const qr=encodeURIComponent(receiptNo(r));
  return `<div style="font-family:Arial,sans-serif;color:#1A2744;max-width:760px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:14px">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:2px solid #C8923A;padding-bottom:12px;margin-bottom:16px">
      <div><h2 style="margin:0">Country Club Equestrian</h2><div style="color:#777">Receipt / إيصال</div></div>
      <div style="text-align:right"><strong>${receiptNo(r)}</strong><br><span style="color:#777">${fmt(r.date)}</span></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tbody>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Customer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${esc(r.customer_name||'—')}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Horse</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(r.horse_name||'—')}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Service</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(r.activity||'—')}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Due Date</td><td style="padding:8px;border-bottom:1px solid #eee">${fmt(r.due_date)}</td></tr>
    </tbody></table>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
      <div style="background:#F6F2E8;padding:12px;border-radius:10px"><div style="font-size:12px;color:#777">Total</div><strong>${BD(total)}</strong></div>
      <div style="background:#E8F5EE;padding:12px;border-radius:10px"><div style="font-size:12px;color:#777">Paid</div><strong>${BD(paid)}</strong></div>
      <div style="background:#FDECEA;padding:12px;border-radius:10px"><div style="font-size:12px;color:#777">Remaining</div><strong>${BD(remaining)}</strong></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
      <div style="font-size:12px;color:#777;line-height:1.7">Thank you for choosing Country Club Equestrian.<br>شكراً لاختياركم نادي الريف للفروسية.</div>
      <img alt="QR" style="width:96px;height:96px;border:1px solid #eee" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qr}">
    </div>
  </div>`;
}
function printReceipt(id){const r=income.find(x=>String(x.id)===String(id));if(!r)return;const w=window.open('','_blank');w.document.write('<html><head><title>'+receiptNo(r)+'</title></head><body>'+receiptHtml(r)+'<script>window.onload=function(){window.print()}<\/script></body></html>');w.document.close();}
function whatsappReceipt(id){const r=income.find(x=>String(x.id)===String(id));if(!r)return;let phone=findContactForIncome(r);if(!phone){const entered=prompt('Enter WhatsApp number (e.g. 39001234):');if(!entered)return;phone=waPhone(entered);}if(!phone){alert('Invalid phone number');return;}const total=moneyNum(r.amount_bd),paid=moneyNum(r.paid_bd),rem=Math.max(0,total-paid);const msg='🐴 *Country Club Equestrian*\nReceipt: '+receiptNo(r)+'\nCustomer: '+(r.customer_name||'—')+'\nService: '+(r.activity||'—')+(r.horse_name?' — '+r.horse_name:'')+'\nTotal: '+BD(total)+'\nPaid: '+BD(paid)+'\nRemaining: '+BD(rem)+'\nThank you 🙏';window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');}
function renderReceipts(){
  const el=document.getElementById('receiptsTable'); if(!el)return;
  const q=(document.getElementById('receiptSearch')?.value||'').toLowerCase(); const st=document.getElementById('receiptStatusFilter')?.value||'';
  const rows=[...income].reverse().filter(r=>(!st||r.status===st)&&(!q||[r.customer_name,r.horse_name,r.activity,r.notes,receiptNo(r)].join(' ').toLowerCase().includes(q))).slice(0,200);
  if(!rows.length){el.innerHTML='<p style="color:var(--muted);padding:12px">No receipts found</p>';return;}
  el.innerHTML='<table><thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Horse</th><th>Service</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Actions</th></tr></thead><tbody>'+rows.map(r=>`<tr><td><strong>${receiptNo(r)}</strong></td><td>${fmt(r.date)}</td><td>${esc(r.customer_name||'—')}</td><td>${esc(r.horse_name||'—')}</td><td>${esc(r.activity||'—')}</td><td>${BD(r.amount_bd)}</td><td>${BD(r.paid_bd)}</td><td>${BD(calcRemaining(r))}</td><td style="white-space:nowrap"><button class="action-btn" style="background:#E8F5EE;color:var(--green)" onclick="printReceipt(${r.id})">Print/PDF</button> <button class="action-btn" style="background:#25D366;color:#fff" onclick="whatsappReceipt(${r.id})">WhatsApp</button></td></tr>`).join('')+'</tbody></table>';
}
function openCustomerStatement(){
  const name=prompt('Customer name contains:'); if(!name)return;
  const rows=income.filter(r=>(r.customer_name||'').toLowerCase().includes(name.toLowerCase())).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!rows.length){alert('No records found');return;}
  const total=rows.reduce((s,r)=>s+moneyNum(r.amount_bd),0), paid=rows.reduce((s,r)=>s+moneyNum(r.paid_bd),0), rem=Math.max(0,total-paid);
  const html=`<div style="font-family:Arial,sans-serif;padding:24px"><h2>Country Club Equestrian — Customer Statement</h2><p><strong>Customer:</strong> ${esc(name)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;border-bottom:1px solid #ddd;padding:7px">Date</th><th style="text-align:left;border-bottom:1px solid #ddd;padding:7px">Service</th><th style="text-align:left;border-bottom:1px solid #ddd;padding:7px">Horse</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:7px">Total</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:7px">Paid</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:7px">Remaining</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #eee">${fmt(r.date)}</td><td style="padding:7px;border-bottom:1px solid #eee">${esc(r.activity||'')}</td><td style="padding:7px;border-bottom:1px solid #eee">${esc(r.horse_name||'')}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">${BD(r.amount_bd)}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">${BD(r.paid_bd)}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">${BD(calcRemaining(r))}</td></tr>`).join('')}</tbody></table><h3>Total: ${BD(total)} &nbsp; Paid: ${BD(paid)} &nbsp; Remaining: ${BD(rem)}</h3></div>`;
  const w=window.open('','_blank');w.document.write('<html><head><title>Customer Statement</title></head><body>'+html+'<script>window.onload=function(){window.print()}<\/script></body></html>');w.document.close();
}
function asCsv(rows){
  if(!rows.length)return '';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  return keys.map(cell).join(',')+'\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\n');
}
function downloadTextFile(name,text,type='application/json'){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);
}
async function backupObject(){
  if(!window.CCE?.backupRuntime)throw new Error('Backup runtime is unavailable.');
  return window.CCE.backupRuntime.createJsonBackup({app:'Country Club Equestrian',version:'4.11.0',created_at:new Date().toISOString(),income,expenses,horses,breeding,schedule:schedule_data,instructors:instructors_data,booking_requests,audit_logs:readAuditLog()});
}
async function downloadJsonBackup(){
  try{
    const data=await backupObject();
    downloadTextFile('CCE_Backup_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2),'application/json');
    queueAudit('export','backup','json',null,{rows:income.length+expenses.length+horses.length,modules:Object.keys(data.modules||{})});
  }catch(error){alert('Backup failed: '+userSafeError(error));}
}
function exportCsvBundle(){
  downloadTextFile('CCE_income.csv',asCsv(income),'text/csv');
  downloadTextFile('CCE_expenses.csv',asCsv(expenses),'text/csv');
  downloadTextFile('CCE_horses.csv',asCsv(horses),'text/csv');
  downloadTextFile('CCE_schedule.csv',asCsv(schedule_data),'text/csv');
  queueAudit('export','backup','csv',null,{tables:4});
}
async function dailyBackupSnapshot(){
  try{
    const today=new Date().toISOString().slice(0,10), last=localStorage.getItem('cce_daily_snapshot_date');
    if(last===today)return;
    localStorage.setItem('cce_daily_snapshot',JSON.stringify(await backupObject()));
    localStorage.setItem('cce_daily_snapshot_date',today);
  }catch(error){console.warn('[CCE] daily backup aborted',error?.message||error);}
}
function downloadLocalDailySnapshot(){
  const snap=localStorage.getItem('cce_daily_snapshot'); if(!snap){alert('No local snapshot found yet. Open dashboard after loading data to create one.');return;}
  downloadTextFile('CCE_Local_Daily_Snapshot_'+(localStorage.getItem('cce_daily_snapshot_date')||'latest')+'.json',snap,'application/json');
}
async function restoreBackupFile(input){
  const file=input.files&&input.files[0]; if(!file)return;
  const text=await file.text(); let data;
  try{data=JSON.parse(text);}catch(e){alert('Invalid JSON backup');return;}
  let restorePlan;
  try{restorePlan=window.CCE?.backupRestore?.plan(data);}catch(error){alert('Invalid backup: '+userSafeError(error));return;}
  if(!restorePlan){alert('Backup restore service is unavailable.');return;}
  const scope=[
    restorePlan.tables.length?restorePlan.tables.length+' legacy table(s)':'',
    restorePlan.modules.length?restorePlan.modules.length+' module(s)':''
  ].filter(Boolean).join(' and ');
  if(!confirm('Restore will append '+scope+' to Supabase. Show Office restore is atomic; legacy tables are best-effort and may partially complete. Existing data will not be deleted and duplicate Show Office records will be skipped. Continue?'))return;
  let result;
  try{result=await window.CCE.backupRestore.execute(restorePlan);}catch(error){alert('Restore failed: '+userSafeError(error));return;}
  const moduleImported=result.modules.reduce((sum,item)=>sum+Number(item.imported||0),0);
  const moduleDuplicates=result.modules.reduce((sum,item)=>sum+Number(item.duplicates||0),0);
  const imported=result.legacy.imported+moduleImported;
  queueAudit('restore','backup','json',null,{legacy:result.legacy,modules:result.modules,ignored_modules:result.ignoredModules,count:imported,module_duplicates:moduleDuplicates});
  const moduleDetail=result.modules.map(item=>{
    const label=item.module==='showOffice'?'Show Office':String(item.module||'Module');
    const entities=item.entities&&typeof item.entities==='object'
      ? Object.entries(item.entities).map(([name,summary])=>`${name}: ${summary.imported} imported, ${summary.duplicates} duplicates`).join('; ')
      : '';
    return `${label}: ${item.imported} imported, ${item.duplicates} duplicate${item.duplicates===1?'':'s'} skipped.${entities?' '+entities+'.':''}`;
  }).join('\n');
  const legacyDetail=result.legacy.failed?`\nLegacy rows failed: ${result.legacy.failed}. Legacy table restore is best-effort; review the console for row errors.`:'';
  alert('Restore completed. Imported '+imported+' rows.'+legacyDetail+(moduleDetail?'\n'+moduleDetail:''));
  await loadAll();
}
function renderToolsPanel(){
  const el=document.getElementById('toolsPanel'); if(!el)return;
  const authStatus=hasSupabaseSession()?'Supabase Auth session active':'Emergency static login / anon API mode';
  const lastSnap=localStorage.getItem('cce_daily_snapshot_date')||'Not created yet';
  el.innerHTML=`
    <div class="stats-grid" style="margin-bottom:14px">
      <div class="stat-card navy"><div class="stat-label">Security Mode</div><div class="stat-value" style="font-size:18px">${esc(authStatus)}</div><div class="stat-sub">Enable RLS using the SQL file</div></div>
      <div class="stat-card green"><div class="stat-label">Loaded Rows</div><div class="stat-value">${income.length+expenses.length+horses.length+schedule_data.length}</div><div class="stat-sub">income / expenses / horses / schedule</div></div>
      <div class="stat-card amber"><div class="stat-label">Local Daily Snapshot</div><div class="stat-value" style="font-size:20px">${esc(lastSnap)}</div><div class="stat-sub">created when dashboard opens</div></div>
    </div>
    <div class="two-col">
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <div class="card-title">Backup / Export</div>
        <div class="btn-row"><button class="btn btn-green" onclick="downloadJsonBackup()">Download JSON Backup</button><button class="btn btn-amber" onclick="downloadBackup()">Download Excel Backup</button><button class="btn btn-navy" onclick="exportCsvBundle()">Export CSV</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="downloadLocalDailySnapshot()">Download Daily Snapshot</button></div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <div class="card-title">Restore</div>
        <p style="font-size:12px;color:var(--muted);line-height:1.6">Show Office restore is atomic. Legacy tables are best-effort and may be partially restored. Existing rows are not deleted.</p>
        <input type="file" accept="application/json,.json" onchange="restoreBackupFile(this)">
      </div>
    </div>
    <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-top:14px">
      <div class="card-title">Supabase Auth / RLS</div>
      <p style="font-size:12px;color:var(--muted);line-height:1.7">Create users in Supabase Auth, insert roles in <code>app_users</code>, then enable the SQL policies from the supplied migration file. Once RLS is enabled, use email + password on the admin login screen.</p>
      <button class="action-btn" style="background:#E8EAF0;color:var(--navy);padding:9px 14px" onclick="downloadRlsSql()">Download RLS SQL</button>
    </div>`;
}
function downloadRlsSql(){downloadTextFile('supabase_auth_rls_setup.sql',window.CCE_RLS_SQL||'-- RLS SQL file is included separately.','text/sql');}
// ══════════════════════════════════════════════════════════
// PWA — Service Worker & Install Prompt
// ══════════════════════════════════════════════════════════
let deferredPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260723-4110', {scope:'./'})
      .then(reg => {

        reg.update();
        reg.addEventListener('updatefound',()=>{
          const nw=reg.installing;
          if(nw) nw.addEventListener('statechange',()=>{ if(nw.state==='installed'&&navigator.serviceWorker.controller) showUpdateBanner(); });
        });
      })
      .catch(err => console.warn('[CCE] SW registration failed:', err));
  });
}

function showUpdateBanner(){
  if(document.getElementById('updateBanner'))return;
  const b=document.createElement('div');
  b.id='updateBanner';
  b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#1E7D4E;color:#fff;padding:12px 16px;text-align:center;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.2)';
  b.innerHTML='A new version is ready. <button style="margin-left:10px;background:#fff;color:#1E7D4E;border:none;border-radius:7px;padding:6px 12px;font-weight:700" onclick="location.reload()">Update now</button>';
  document.body.appendChild(b);
}

// Capture install prompt (Android/Chrome)
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

// Show install banner
function showInstallBanner() {
  if (document.getElementById('installBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    background: #1A2744; color: #fff; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    box-shadow: 0 -4px 20px rgba(0,0,0,.3);
    font-family:'Cairo','Segoe UI', Roboto, Arial, sans-serif;
  `;
  banner.innerHTML = `
    <img src="icons/icon-72.png" style="width:40px;height:40px;border-radius:10px;flex-shrink:0">
    <div style="flex:1">
      <div style="font-weight:700;font-size:14px">Country Club Equestrian</div>
      <div style="font-size:12px;color:rgba(255,255,255,.7)">ثبّت التطبيق على جوالك</div>
    </div>
    <button onclick="installPWA()" style="background:#C8923A;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;font-family:'Cairo','Segoe UI', Roboto, Arial, sans-serif">تثبيت</button>
    <button onclick="dismissInstall()" style="background:transparent;color:rgba(255,255,255,.6);border:none;font-size:20px;cursor:pointer;padding:0 4px">✕</button>
  `;
  document.body.appendChild(banner);
}

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  deferredPrompt = null;
  dismissInstall();
}

function dismissInstall() {
  const b = document.getElementById('installBanner');
  if (b) b.remove();
  sessionStorage.setItem('installDismissed', '1');
}

// iOS — show manual install instructions
window.addEventListener('load', () => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.navigator.standalone;
  const dismissed = sessionStorage.getItem('iosDismissed');
  if (isIOS && !isInStandalone && !dismissed) {
    setTimeout(showIOSInstallHint, 2000);
  }
});

function showIOSInstallHint() {
  if (document.getElementById('iosHint')) return;
  const hint = document.createElement('div');
  hint.id = 'iosHint';
  hint.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    background: #1A2744; color: #fff; padding: 16px;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,.3);
    font-family:'Cairo','Segoe UI', Roboto, Arial, sans-serif;
    text-align: center;
  `;
  hint.innerHTML = `
    <div style="width:40px;height:4px;background:rgba(255,255,255,.3);border-radius:2px;margin:0 auto 14px"></div>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAZT0lEQVR4nO18eXxV1bX/WnufO2ee54EkhAABEkYZA0UGEUGsUihabfVVsLZFqcN72len+py1xeqzoOIEKoiVeZ4jYzAhSEgIJBAyjzd3vmfv9fvjJBFRCL/eG9r3+eT7uR8+94Zz9vA9ew17rbUPEhH04spg/+oB/Lujl6Bu0EtQN+glqBv0EtQNegnqBr0EdYNegrpBL0HdoJegbtBLUDdQrmdnRCCkVHjHU2m1OYrLqwtKKr89W11Z29TQbHW43KokANDrlCCLIS48JD0pJjs9PrdfcmZyDEMEACICQMTrNGa8PptVIpIEnCEA2J3uPQWlG/NPHPu2oq7ZCowDEZEEkgwBCBCZBEmAiAwZByBG1Dc5anxuvxljsgemxUMnTZIkgEYVISBj/qftehAkpOSMAUBds/WTzYe+2FVQ3dQOACQFACJjcPl66JgzSUFC5ZyTEMQ40xkAcXBq1B9/dfOgjITrs4p6XMRUIRXOXG7v8q/2v7tuf6vNQ1IAIiJyxISY0PT4yNS4iJiI4JAAs07hQkqr3VXfbK2obSyvajhf0+xSCXQKAgTpcVZezszxQwb3TQSAqvqW6obWFqudM7SYjREhARmJ0UTkX+J6kCAiICCFs/yi8qeXrS+raiQSiMygw1HZ6dNuGDh2cHp8VOjVG2m3u46VVG7YX6TTKYvnTY4MDaxtanvtk23bD58qr6r1CAAArjOhdL/04G3pCdFEP1iOvqGnREwSaTr19ZXb//rZDgKGiCEBhnlTRi6YPjImPBgAWqz24rPVJRU156ob65utVrvL7fXoGDcadOFBgbFRwekJUdnpCZnJMVqbbTbn8ys2rt55jFBHQiXhZQigGEb2S3pu0ezU+Ei/swM9RJDGjsPlfvj1z7ceOU1ScoR7Z49dPO9GvU45U1W/bl/RnmOnS8/XuFUA1IwawXcjQUAEBCAg4Y0IsQzNTBqUkfjBhvyGdo/wODlHkEhATOEL5+T9ft6NjGGXpvMv/E+Qxk6bzXnvcysKSquBaHBG3Ku/uz0lLmJzfvHydfuPfVuBOj0IIaXKiJAjAICETt0MAACsY1RCEDKOXAFAEl4kSQBExBCIKa/+7qez83IlEQCwntHZftZBRICAdpfnnqeXF56tB5K/nj32kbum7ThyauGLH5deaNQsOhNukIgaLaLrCV3yqMR3X5EEqhIYAJH83rWUGhcppCQihXP/TqQL/iRIc3YQ4TcvfFh0rpFUz9I/zB+alfzLp9/bU3iOpGBS1ZaJEPQ9Oq4KSQBAl1IGAIgMkDdb7ZwxIaUfZ3EZ/EmQkKRw9uyyf+w7edHA5PJn7muzu36y6DWnV6DqASIBcO28XAucbg8AfE82/Q2/EaTtIbYeLH5vc4FJx15f/LMDReVvfZkvPU4GIPxuChgBMo0gzav2c/ud8A9BUhIitrQ7/vj2PzjHh+dN+mpP4cYjZaA6AUj0mK/ucHmgR9ePvwgiII7spQ82NTlpzpj+O4+UfF1yEVW32nPcAACA3enu0fbBLwRpdr30fO2nOwrSYkPLztcXnqtD6elpdgDB4fL2bBd+IYiIGGNvrNwGyNod7rKqRkZSdH+fH9CppHsQvrqekogzVlnTuO1wiZFRY6uNKToJ0GWtEP3v/neAsM3mAP/axR/AZ4IkAcDqHcck0wdaTF++8uBvbhuPjCPjqLWODIAxv8e4JAKJMYMzoIejZz4RREScoaqK9fuOk9fZYHV+vDF/8fwbn1s4mysKMEZcCTEbAk0GUPR+tDaIKACMCk3IzYQe22Ro8EkHafJ18mx1ZV0bAAOiT3cXTxyeNW/qyA37iw6fqnrhgVk3jxuMCOv2Fj69bH2b3QFEV9r9IcL/l7fEGJOyx6N9vilpAgDYX1im6IxpcUHhQZbic7XPLV//k+H9508b9atZysRhWUVnqtbsLDhzoY5IJaIff9aIJr2SGh9ZUlEHJK5x1lKQ7PlwqG8EIQDAwaLyhMjAP903a+TAPm02x/9+saeuue2mMdkA8PtXVm05eNJDDKSQQoUrhw4QceqogafO1V5z3yQleVUBAH6PIl4Kn3QQZ0wV4nxdU0VN47wn3rn/+Q8lwSN3TY8ICWxus//y6eUbDp/xSCCvE0kAXXFLyQGcXhqaldw3KRq4nvPrlbK4BvhqxRpbbTVNVpICpdh+rHzyopcv1DXrFF5V3/yrWeP3LH1g8dw8k9FIyNkVzDFDJKaYDLqosKBnF92KAJIY55zjVcdGoEohhATo2b2GzwS12FRBjAgY16H65L0zE6JCAWBQRqJXFV+fKP/NHT9Z9+qDI7ISQTH+sDPOERR9VnL0mv/5dUZi9LCslKVL5oaHBgDXE1euLjgE10MH+UpQq82BjCNHQvbq4rmzJ+TsPV5adqHO41Wz0xMefWP1ohc/To4NX/7kPTkZcaDoL+2PIxIzjMtO/fT5X/dLiZWSJNH00dkbX/3tY3dOvmFAynXNEF4BvhLkcLkBiFA3dWTW9NHZT7y1tqjswssrNp+vbQ4PDpgxdtCOwov3PP2u2ahfPH8yaIEuANDY4fph/eL//sRdFpNBSMkYMkQhZWRo4L2zxn30zL3J0WHA+A+HSEQAJESHku5R+EqQKqTmAT3086krtxz8eNPBySMG7PqmbOOBIiIymww64XC6vau2Hr5hULpJzyQAIjAAYjwu3PL2Ywt0inJpvJ0zRgRuj0pEs/JykCv4L9XZvhJk0OuQ8agQ0z/2FPzx3W2ThmVW1DSSLmDt7gJEtNqdHz51z60Tcl5csam+2apXOiLHWjb1pd/eHhpoUcXl2QhE0Ok4Is7Oy0HVK+WVBA17NNiqwVeCLEY9SbXFavvbF/s5yFsm5Egp06IDaxpb1+8rzBvaLycz+S8rt7WrfO7jb7W0O5AkY0hcP2vsgFHZaVre9UeGhSiJUuMiRw9OQ65jP2aoGKIqelzEfA13hAVZQHg9TBmSEfvO43dFhAYCwIyxg4vLL247dHL+tFE7j5wym02TR/SpaWq12l1Wp0rCqyjyd/OmEsFVyg1IEnAcPSjtQPF5YJcH7TUh/bf3pAEiw4LMJr3TQwumj8o/UT68f+qJM1V94iPTE6NS4yKMBl1qXMSWvy7WKRwAVFU88faXq/d9OyknJTk2XEjiVyCICDhnja22d7/aT6qHvu9DcY7E9INSo1NiwqWkHjV0PhFERCEBprjw4PKLTUveWB0RbN7zzmPJseGBFqPXKzhnUlJqfGRLu+PjTQe/Lq4Y1i/p/jkTth789sYR/YmuNjECQkCbw9VodTIAuIRHBJTAk6KClz95d4DZqIXDfZnF1eGTDhKSEHFgRiIYzLl9k9a8+IDJoMtMjokOC6pvbW+22rWFE2Ay3DNzzP1zxn285dDMJX8z6GBY/1REtDlcVxwWoiRKjg2/Y2IuGMzE9MQMHR/FFBpofu/Ju8ODAzTnwJcpdAufUs9CSM7ZB+vz3/hsx9EVTyBiTWPb/6zYeLqiruxC3UdP31tZ2zhl5MCwYEuL1a5TuN3pzlv4SojFmP/u4w6X5+TZiyMG9Okqc7gM2haUiNbuPl7XbEUgTWdJYHk56VmpcVeRUD/CJxFDhgAwuG/izWOyK2sam9rsDS3tGw+Xk1SnjMzqmxy94KkViVFhY4ZkNLS0/+Lp99e+uPC+WWM2HjiBiA6Xp6SidsSAPldsHFH7d87E3B/+r7wu7ICPIsYQpaT+feJcbs8tjy1rszkVzlGoJLy/mTt5y9fFitFcfPYiALi9aoPVtej5DyNDAgPMRgBQFF5YdoG6iwcSkSqk+P5HEvW0ZH03Rx/vl0Q6hWdnJDq91Cc+kjGUjMWHBQzoE7ft0Ekp1JKKWimp/GIDSPFN6fm/rdmj1zEACLKYTp+rOVvVQHS1PSciKpzx73+uJcbqLwfAV4I4QyKaPSE3kHkQMTjQjIyPzekLAKUX6klV22x2xnDN9iOa5a5vtdc1tXtVwRlyhX+yOR8R/R45lUSI4JdmfSUIESVRgNlw98yxqhCRIYEk1Nx+yURgszmBYVpcVNmFukOnqkB4hCQS3uqG1qr6ZgAYOSB11bZvmq12ztCPLp8qJEM8dqqirsXqe2t+KMliiET0y1vGxkeFBgeYUHUnRocJKQQRCWFzex5+bZWQUgvXMwaSKYeLzxFR3rAsN+Gjf1mNiER+eOCSSKswWbur4Mvdx6NCA33frPmBIERExACz0ajXBVlMfRLCLSY9Q2bQ6Uj1fL71cPHZWul1d4xUIhB9sfsYIuZkJiYEG3YVVTyzbB1nyBiq4p+cj6bLGSJn+L9r9z66dPUDt0/ijKHP0Ua/FfVpQ0SE4f1ThZCMYXxUCDBORChFV3ZVkAThOXqq6lDxWZNBP3/6KBLi/Y0Hl7z+mcPlUTjTVsG1C5zs6BcVzs7XNi164eOXP9v/3MJbYyKChfSDsfMbQdo6AoAxgzM8qgCAwRmJjCvI8bJVgcAI8c/vb5BE86aNTAg3M4C1e4tm/2HpziOntFWACEJKIaSQUhIRaQJKmiRqJAohiYghKpy12hxvfr5r9sNLtx2vmDIk6fbJw1Uh/eIo+bOIU/N961vaW9sdfZOiDxSeufOp91D1/lBsOCIphgfmjHno51P3Fpy++5kPFAaqkIBsVP+Un00dMS4nIzTQfC2dnq6sXb+/aPWOo/WtDgBMjg5e+9IDgWZj5/PyFT1SBiykZMiElDf//vWyi80oVPH9nA8iMkSJ/JXf3XZrXu7ba3a9vHIPk24pJHEdAIZa9DlZScOzUjISoxOiQ0MCzEaDTgvI2p2eZqu9sqaxsPTCoZNnT5RVgc4gvW6GLCTA9Onz96cnRl1p+/JPoKcKybWN0taDJxe+tAqlR/ygVggREBkie+HBObdNGvbXT3e8/tleUt2KwqQqJCAqOgAEElL1mg16g1FBYgTkdHpcqmBcB4gkBQmvTsdVAWazccWTvxialeLfgukePMyiDfT+P7+/reAcqs4fGigEAGTA+KLbxi9ZMHXrweJH/rLG5pHC4+QdZb0SJAqSgNqC0HasBEQcGTACicCAUAkJMC77rztzMpOvFKL8p9GDBGlTsdqdsx9aeqGxDUn98XUEAIoxOzX66ftnRYcGLv1896fbDktUpFBJqqix8mNj1kpqSGfsmxD25pJ5fRKi/M4O9ChB0FmdV15V//MnlzW0OZBU8WOeDkckpgDA5OF9508bpdfp9h0v3VtQera6zuXuyL5fWieFCIyhJIZMuS1v8H/fd7PFZPw/cxThMmjjPnuxfuELn5ypbiGvkzHU/OpLL2PakTjFAAAJ4ZZh/VOjwoLsDnd1Y2tVXXNNQ5vV4UREJEKOUiLT6ePDAx+5c+qMsYPgkrMzfsf1O1Bnc7ief3/Tyq2HketI9WipegK6dIPBkRFJYgoqChBJ1aNTOAf0SgkgSRBxBbkSajbcedOoe24eHRRgElIyf5n0H8N1OpLZ9YS/Kb3w8eZDOw5/2+ZUAYiESlJ0aNzvwDQPWEohBCEyYBwZJ6lmJETeOjH3p5OGRoQEwCVnGXsO14kg6DjJQdp8Gltte4+X7j5acvz0+ar6FqbogeHl1R/acSgpTHqWFh85alD6xKGZw/unampYSGJ4PTL3148g6OQIALoeu9urVlY3nb3YUFnbVNdkbbU5VFUAgMmghAUHxEeFpsRGpCVExUYEdzWiZWKvlhHxaz3V9VxB39UDa+fDEeEaBYSIhCRE6FF186PwscoVugoKtWiOdnpL+6ktlq6IDCJ4VaEtEK14WpuqVkknpBTaFyFV0XGZ9lPLfCmcMcQfdqcN49J4W7PVLjo3tL4/fp8IQgTO0OXxeryqplY5Y1rGQqtlgc5qDSL6bNvh595dryhcI5EzxhCFkICgU7iWR9QpnHOmcK4ovKKmSfvJGLY7XNAZn3Z7VLfnu+60G7U8GgD8Y8/xhpZ2zrAzKuDrcvMp7dNmc769ZldGUozHq1pMhpnjBn+4IT8qPMjjFbuPlTw4d7LL7Xn5o21/XjQ7KizI6nCFBppfWLHp0V9Mv1jf8sy7G8YMSouPDKmsbd53vGTa6MERwZZdR0vCQgJdbk9aQqTHqz71zrdvLJl/oPDMoIyEQLPR7nT/bfXO5NgIAAww6fvER766csdLD9628UDRiTNVzy6a43B5KqobJw3L+u1Ln8RHhZoMurtmjA65tqjAleDTCrrnT8tLKmrnTMydnZeTnRb/+fYjr328JTYiZOa4wREhgfc+825Tm23nsRLsWEo4c/yQv3+x57ll60ODzFsPnWqzOSYNz0qODdtdUD7thgFjBmes3XXMYtSlJ0Q+/tZXC6bf0NRqv/3xt4MspvjIUABY8vqnB0+cvWPy8DkTc7JS49pszp3HyiwmQ2ll7b6C0wxRFdKo1ykK35hfqFPYayu3VdY0+TJBXwkqrKi/ceQAAOCMpcRFbMoviggNHJSeIInGDckor2qobmgNNusVhQMAQ9Zmc4SHBDS0tb/y0VazUZeTmURECGjSMQAw6JWYiJCq+pbPth75w/xJqpBzp4woP18/rH+Kpkr2FJRMGpaldZ0aF2G1O0F4VCE4Y2EhAQCg48zl8docrpAAS2xEyJhBadsOnfxXEpTTJ3rtzmNCSp3Cz15suHHkwLIL9WcvNjDEtbsLstMTBmUktjm81Q2tANBstQdZTA3trgXTbxgxMNWlgkGvQ0RVFU61Q7XXNbcFmY16HS8+W9MZfhVd+8+Jw/p/tafAqwqF84rqRpfHKwmMel18VGhpRZ1XFS3tDkA8XVnb4hSZyTFpCVFvf3XQR4J80kHv/fev3l6za9XWI/GRwdFhwfOmjjQZ9Ov3FaYnxYQHWR554u7osKA/3Ttjw/7C87VN43Mzw4MDZo7Jdnu9U0cNfOKu1h2Hvx2SkWgxG24anS0EqaqYcsOgzJSYGWMH3fKfK1ZuOZSVGvvTySMcLk+g2SglvbJ47puf7fxk86HE6NCkmPD4yND4yJAN+4tmjh9itbu2Hz7FGc6ZmGsxGhZMGXagqNzmcr/zyFwfCfKDH+RVBWPYaVAQOqNlcInv0xWIUIVkDIWQOoVvyj/RbndNGz0wyGKC7ztKK7cceumjbZNH9PuP2eNT4yO0vJDWphaK1sTWK8SqLYe/Lj4XExqEDLPTYmfndSTy/VXa4BNBXVPSGumyqU63l4jMRj0ASEmMoeaQFJRUNrS0Tx+dDZ2VIZ3vaPAwhka9DgDcXtWgUwCgqdVWWdvcNylKy+Vr6NrTEUF1Q4vZZAgNNJdU1Pz5/Q25mSkLpo8KCTR3iaQkos7NzT8N36o7EHYdLfl817FRWSkzJ+SEBprbbM6ln+0YmBbfbLU3tLQvWTCt+OzFv6za+ezCWTHhwQdPlP9syogPNuYXl9eOzk6ZPnqQQa98ued4u90ZHGBJT4isbbZ6Vbluz/GE6NCMpKjZebkvvL+RK4rCWVRo4E1jsg8Vn9tx9HSfuLBFP514oa758TdXv/L7n+X2S37pt3e8sWqby+1RQgKeWbbObNQ/9POpANfqqV8Fvt7f3GbbtL9o5vghAEBEi1/9pORczawJOXfeNPqLHUffWLVNYWxXQZkWOGQMA0zGkoraIyfLbhoz2OH2AMDST7d/U1Y9ZWRWVFhQQmTI1FH9C0vPe7zq7LxcINicf8Lj8Q7LSn7qva3NVvvQrORjJ8ur6lsQcVR2WkRQ4H+99QUARIcFtbY7bn307ZZ2e2ll7bFT5/5dcvNGg85iNOwuKP266Awi7i8szxvWDwAUziYMzdx1tEQScRQ6HQcA7S0JwRajjus35p84da4aAP5476xdR09PXPj6xfqWvskxRBAcZNLrFM4Y5ywiJLDV5li2du/CWSMzEqOjw4KMJr0mjJW1TZmpsaUVNcdPn9f2HBEhllVbDte3OcJCAv5dqjtcHq/Do067YeCQvkn1Le3335a36+ipumar3ekuLLt4y/ghYUFmgUplTRMRNLXZ9Tre0u5wud0zxw2KiwwtKKkcl5Nx5P3HUuPDnnhrDQAgQku709F5WrfJajPoleAA04kz1QAgiVpabXanCwDW7f1meP/UuMiwv3+5hzPW0NIeZjHNmzayrd0BHcfz/ECSr1Wu4cEBM0Zn7zteWt3YNjQr+aH5Uw6eKP+6qPyrvQWZKTHzp40yG/VvPnzHsVMVre2OvNxMnaL0TYoBwO2Hv71Q2zxyYNrm/BOZKXEpMaHxUX0AwONVJw7tl5YQCQCqKsbnZGamxEwc2i/vwaUvf7RlyYKpM8YO6ZMQYXO4giymWROGIMJDf/2yoqbxxhEDGprbQwLMq56778UPNlXUNKbERvj+RiH/hDu6DHyXldlTULr98KkDhWUhgebczESL2RwTFjBv6shLzFDHLTWNbWeqGoLMhsF9Ey+zhpdiU/6Jp5ZtHNY/adGcCf37xGntaBHFVz7acrzswrP3z06JjdD+cr62aXP+iQlD+/VNivkXE0SdFSddb++7NAx6ovziziMlpytrosOCfzHjhqTYcATU8uya33QpG11PW0ippV67vgMBY2hzuEoq6+Ijg6PDgxmidr1GdGOrTUoZERqobeu1e1VVKIqvr825rhHF/4vofRNnN+glqBv0EtQNegnqBr0EdYNegrpBL0HdoJegbtBLUDfoJagb9BLUDf4fUs8Caga0+3QAAAAASUVORK5CYII=" style="width:56px;height:56px;border-radius:14px;margin-bottom:10px;background:#fff">
    <div style="font-weight:700;font-size:16px;margin-bottom:4px">ثبّت تطبيق CCE</div>
    <div style="font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px;line-height:1.7">
      لتثبيت التطبيق على iPhone:<br>
      1. اضغط على زر <strong>المشاركة</strong> &#9099; في أسفل المتصفح<br>
      2. اختر <strong>"Add to Home Screen"</strong><br>
      3. اضغط <strong>"Add"</strong>
    </div>
    <button onclick="dismissIOS()" style="width:100%;background:#C8923A;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Cairo','Segoe UI', Roboto, Arial, sans-serif">فهمت ✓</button>
  `;
  document.body.appendChild(hint);
}

function dismissIOS() {
  const h = document.getElementById('iosHint');
  if (h) h.remove();
  sessionStorage.setItem('iosDismissed', '1');
}

// App installed event
window.addEventListener('appinstalled', () => {

  dismissInstall();
});
