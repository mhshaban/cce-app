/* Country Club Equestrian — unified member portal and RBAC UI */
(() => {
  'use strict';

  const REFRESH_KEY = 'cce_sb_refresh_token';
  const MEMBER_KEY = 'cce_member_access';
  const ACCESS_FN = `${SB_URL}/functions/v1/admin-users`;
  const protectedPages = new Set(['owner', 'instructor', 'dashboard']);
  const pagePermission = {
    dashboard: ['dashboard.view'],
    income: ['income.view'],
    expenses: ['expenses.view'],
    overdue: ['income.view', 'expenses.view'],
    receipts: ['income.view'],
    reports: ['reports.view', 'income.view', 'expenses.view'],
    bookings: ['bookings.view'],
    schedule: ['schedule.view'],
    instructors: ['instructors.view'],
    horses: ['horses.view'],
    health: ['horse_health.view', 'horses.view'],
    breeding: ['breeding.view'],
    notifications: ['notifications.view', 'settings.manage'],
    audit: ['audit.view'],
    tools: ['settings.manage'],
    users: ['users.manage', 'roles.manage']
  };

  let memberAccess = null;
  let permissionSet = new Set();
  let accessAdminData = null;
  let accessAdminLoading = false;
  const legacyNavigate = window.navigate;
  const legacyShowDashPage = window.showDashPage;
  const legacyShowDashGroup = window.showDashGroup;

  const text = value => String(value == null ? '' : value);
  const html = value => typeof esc === 'function' ? esc(text(value)) : text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr = value => typeof escAttr === 'function' ? escAttr(text(value)) : html(value);
  const initials = name => text(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'U';
  const normalizeUsername = value => text(value).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '');
  const isInternalMemberEmail = value => text(value).toLowerCase().endsWith('@members.countryclubequestrian.com');

  function normalizeAccess(raw) {
    if (Array.isArray(raw)) raw = raw[0] || null;
    if (!raw || typeof raw !== 'object') return null;
    const permissions = Array.isArray(raw.permissions) ? raw.permissions : [];
    return {...raw, permissions};
  }

  function setMemberAccess(access) {
    memberAccess = normalizeAccess(access);
    permissionSet = new Set(memberAccess?.permissions || []);
    window.CCE_MEMBER = memberAccess;
    if (memberAccess) {
      sessionStorage.setItem(MEMBER_KEY, JSON.stringify(memberAccess));
      document.body.classList.add('member-authenticated');
    } else {
      sessionStorage.removeItem(MEMBER_KEY);
      document.body.classList.remove('member-authenticated');
    }
    updateMemberChrome();
  }

  function hasPermission(code) {
    if (!memberAccess || memberAccess.profile?.is_active === false) return false;
    return permissionSet.has('*') || permissionSet.has(code);
  }
  function hasAny(codes) { return (codes || []).some(hasPermission); }
  function hasMemberSession() { return !!(memberAccess && SB_ACCESS_TOKEN); }
  function canAccessDashboard() {
    return hasMemberSession() && Object.values(pagePermission).some(hasAny);
  }
  window.canUser = hasPermission;
  window.isAdminAuthed = canAccessDashboard;

  function clearMemberSession() {
    setMemberAccess(null);
    setSupabaseSession('', 0);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem('cce_auth');
    sessionStorage.removeItem('cce_auth_until');
    sessionStorage.removeItem('owner_auth');
    sessionStorage.removeItem('owner_secret');
    sessionStorage.removeItem('owner_name');
    sessionStorage.removeItem('cce_instr');
    currentInstructor = null;
    ownerHorses = [];
    currentOwner = '';
    income = []; expenses = []; horses = []; breeding = []; schedule_data = []; instructors_data = []; booking_requests = [];
    horse_health_profiles = []; horse_health_events = [];
    horse_medical_records = []; horse_vaccinations = []; horse_care_tasks = [];
    accessAdminData = null;
  }

  async function authRequest(grantType, payload) {
    const response = await fetch(`${SB_URL}/auth/v1/token?grant_type=${encodeURIComponent(grantType)}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', apikey: SB_KEY},
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error_description || body.msg || body.message || 'Authentication failed');
    setSupabaseSession(body.access_token, body.expires_in);
    if (body.refresh_token) sessionStorage.setItem(REFRESH_KEY, body.refresh_token);
    return body;
  }

  async function resolveLoginEmail(identifier) {
    const value = text(identifier).trim();
    if (!value) throw new Error('Enter username or email.');
    if (value.includes('@')) return value.toLowerCase();
    const resolved = await sbRpc('cce_resolve_login_identifier', {p_identifier:value});
    const email = typeof resolved === 'string' ? resolved : '';
    if (!email) throw new Error('Invalid username/email or password.');
    return email;
  }

  async function refreshMemberSession() {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      await authRequest('refresh_token', {refresh_token: refreshToken});
      return true;
    } catch (error) {
      clearMemberSession();
      return false;
    }
  }

  async function fetchMyAccess(allowRefresh = true) {
    try {
      const raw = await sbRpc('cce_my_access', {});
      const access = normalizeAccess(raw);
      if (!access || !access.profile || access.profile.is_active === false) throw new Error('This account is inactive or has no application profile.');
      setMemberAccess(access);
      return access;
    } catch (error) {
      if (allowRefresh && await refreshMemberSession()) return fetchMyAccess(false);
      throw error;
    }
  }

  window.doAdminLogin = async function doUnifiedMemberLogin() {
    const identifier = text(document.getElementById('adminEmail')?.value).trim();
    const password = text(document.getElementById('adminPwd')?.value);
    const err = document.getElementById('adminErr');
    const button = document.getElementById('memberLoginBtn');
    if (err) err.style.display = 'none';
    if (!identifier || !password) {
      if (err) { err.textContent = '❌ Enter username/email and password / أدخل اسم المستخدم أو البريد وكلمة المرور'; err.style.display = 'block'; }
      return;
    }
    if (button) { button.disabled = true; button.textContent = '⏳ Signing in…'; }
    try {
      const email = await resolveLoginEmail(identifier);
      await authRequest('password', {email, password});
      await fetchMyAccess(false);
      document.getElementById('adminPwd').value = '';
      applyMemberUI();
      await routeMemberHome();
    } catch (error) {
      clearMemberSession();
      if (err) { err.textContent = '❌ ' + (typeof userSafeError === 'function' ? userSafeError(error) : error.message); err.style.display = 'block'; }
      const pwd = document.getElementById('adminPwd'); if (pwd) pwd.value = '';
    } finally {
      if (button) { button.disabled = false; button.textContent = '🔐 Login'; }
    }
  };

  window.logoutMember = async function logoutMember() {
    const token = SB_ACCESS_TOKEN;
    try {
      if (token) await fetch(`${SB_URL}/auth/v1/logout`, {method:'POST', headers:{apikey:SB_KEY, Authorization:`Bearer ${token}`}});
    } catch (_) {}
    clearMemberSession();
    resetProtectedPortals();
    legacyNavigate('home');
    syncMemberLogoutButtons();
  };
  window.logoutAdmin = window.logoutMember;
  window.logoutOwner = window.logoutMember;
  window.logoutInstructor = window.logoutMember;

  function activePortalPage() {
    const pageClass = [...document.body.classList].find(name => /^page-(dashboard|owner|instructor)$/.test(name));
    return pageClass ? pageClass.slice(5) : '';
  }

  function syncMemberLogoutButtons() {
    const activePage = activePortalPage();
    const memberSession = hasMemberSession();
    const routes = {
      logoutAdminBtn: {page:'dashboard', allowed:memberSession},
      logoutOwnerBtn: {page:'owner', allowed:memberSession || !!sessionStorage.getItem('owner_phone')},
      instrLogoutBtn: {page:'instructor', allowed:memberSession || !!currentInstructor}
    };
    Object.entries(routes).forEach(([id, route]) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.classList.toggle('hidden', !route.allowed || activePage !== route.page);
    });
  }

  function updateMemberChrome() {
    let pill = document.getElementById('memberSessionPill');
    const headerRight = document.querySelector('#globalHeader .header-right');
    if (memberAccess && headerRight) {
      if (!pill) {
        pill = document.createElement('span');
        pill.id = 'memberSessionPill';
        pill.className = 'member-session-pill';
        headerRight.prepend(pill);
      }
      const roleCode = memberAccess.role?.code || '';
      const roleLabels = {
        super_admin:'Administrator', admin:'Administrator', manager:'Manager', accountant:'Accountant',
        reception:'Reception', trainer:'Trainer', instructor:'Trainer', owner:'Horse Owner', horse_owner:'Horse Owner', staff:'Staff'
      };
      const roleLabel = roleLabels[roleCode] || memberAccess.role?.name_en || roleCode || 'Member';
      const displayName = memberAccess.profile?.full_name || memberAccess.profile?.username || memberAccess.profile?.email || 'Member';
      pill.innerHTML = `<strong>${html(displayName)}</strong><small>${html(roleLabel)}</small>`;
      pill.title = memberAccess.profile?.email || '';
      pill.style.display = '';
      const publicBtn=document.getElementById('publicMemberButton');
      if(publicBtn){publicBtn.textContent='My Portal';publicBtn.onclick=()=>routeMemberHome();}
    } else {
      if(pill) pill.style.display='none';
      const publicBtn=document.getElementById('publicMemberButton');
      if(publicBtn){publicBtn.textContent='🔐 Member Login';publicBtn.onclick=()=>window.navigate('admin');}
    }
    syncMemberLogoutButtons();
    if(window.CCEHeaderSystem) window.CCEHeaderSystem.refresh();
  }

  function resetProtectedPortals() {
    const ownerLogin = document.getElementById('ownerLoginWrap'); if (ownerLogin) ownerLogin.style.display = 'none';
    const ownerPortal = document.getElementById('ownerPortal'); if (ownerPortal) ownerPortal.style.display = 'none';
    const instructorLogin = document.getElementById('instrLoginWrap'); if (instructorLogin) instructorLogin.style.display = 'none';
    const instructorPortal = document.getElementById('instrPortal'); if (instructorPortal) instructorPortal.style.display = 'none';
  }

  function routeForMember() {
    const portal = String(memberAccess?.portal || memberAccess?.role?.code || '').toLowerCase();
    const permissions = [...permissionSet];
    const ownerCodes = new Set(['owner.horses.view','owner.horses.update','horses.view','horses.update']);
    const trainerCodes = new Set(['schedule.view_own','schedule.update_own','schedule.view','schedule.update']);
    const ownerOnly = permissions.length > 0 && permissions.every(code => ownerCodes.has(code));
    const trainerOnly = permissions.length > 0 && permissions.every(code => trainerCodes.has(code));
    // The explicit portal role owns the landing page. Extra read-only health
    // permissions must not accidentally redirect a trainer into Dashboard.
    if ((portal === 'owner' || portal === 'horse_owner') && hasPermission('owner.horses.view') && !hasPermission('dashboard.view')) return 'owner';
    if ((portal === 'trainer' || portal === 'instructor') && hasPermission('schedule.view_own') && !hasPermission('dashboard.view')) return 'instructor';
    // Custom linked accounts still receive their dedicated portal when their
    // effective permission set is limited to that portal.
    if ((portal === 'owner' || portal === 'horse_owner') && ownerOnly) return 'owner';
    if ((portal === 'trainer' || portal === 'instructor') && trainerOnly) return 'instructor';
    return 'dashboard';
  }

  async function routeMemberHome() {
    const route = routeForMember();
    if (route === 'owner') {
      window.navigate('owner');
      await openOwnerMemberPortal();
      return;
    }
    if (route === 'instructor') {
      window.navigate('instructor');
      await openInstructorMemberPortal();
      return;
    }
    window.navigate('dashboard');
    const first = firstAllowedDashboardPage();
    if (first && first !== 'dashboard') window.showDashPage(first, document.getElementById('nav-' + first));
  }

  window.navigate = function unifiedNavigate(page) {
    if (page === 'login') page = 'admin';
    if (page === 'admin' && hasMemberSession()) {
      routeMemberHome();
      return;
    }
    if (protectedPages.has(page) && !hasMemberSession()) page = 'admin';
    if (page === 'dashboard' && !canAccessDashboard()) page = 'admin';
    legacyNavigate(page);
    syncMemberLogoutButtons();
    if (page === 'booking') loadCCHorses();
    if (page === 'owner' && hasMemberSession()) openOwnerMemberPortal();
    if (page === 'instructor' && hasMemberSession()) openInstructorMemberPortal();
    if (page === 'dashboard' && hasMemberSession()) {
      applyMemberUI();
      window.loadAll();
    }
  };

  function permissionForPage(id) { return pagePermission[id] || []; }
  function canOpenDashPage(id) { return hasAny(permissionForPage(id)); }

  function prefersSchedule() {
    const role = String(memberAccess?.role?.code || memberAccess?.portal || '').toLowerCase();
    return ['trainer','instructor','staff','operations'].includes(role) && canOpenDashPage('schedule');
  }

  function firstAllowedDashboardPage() {
    const order = prefersSchedule()
      ? ['schedule','bookings','horses','dashboard','income','expenses','health','breeding','instructors','reports','receipts','overdue','users','audit','notifications','tools']
      : ['dashboard','bookings','schedule','income','expenses','horses','health','breeding','instructors','reports','receipts','overdue','users','audit','notifications','tools'];
    return order.find(canOpenDashPage) || null;
  }

  window.showDashPage = function guardedDashPage(id, btn) {
    if (!canOpenDashPage(id)) {
      const first = firstAllowedDashboardPage();
      if (first && first !== id) return window.showDashPage(first, document.getElementById('nav-' + first));
      return;
    }
    legacyShowDashPage(id, btn);
    if (id === 'users') loadAccessAdmin();
    window.setTimeout(stripDisallowedActions, 0);
  };

  window.showDashGroup = function guardedDashGroup(group) {
    let pages = [...((window.DASH_GROUPS || DASH_GROUPS)[group] || [])];
    if (group === 'operations' && prefersSchedule()) {
      pages = ['schedule', ...pages.filter(page => page !== 'schedule')];
    }
    const first = pages.find(canOpenDashPage);
    if (first) window.showDashPage(first, document.getElementById('nav-' + first));
    else legacyShowDashGroup(group);
  };

  function applyMemberUI() {
    updateMemberChrome();
    syncMemberLogoutButtons();
    document.querySelectorAll('#dashSubNav .nav-btn').forEach(button => {
      const id = button.id.replace(/^nav-/, '');
      button.style.display = canOpenDashPage(id) ? '' : 'none';
    });
    document.querySelectorAll('#dashGroupNav .nav-group-btn').forEach(groupButton => {
      const group = groupButton.id.replace('dash-group-', '');
      const pages = (window.DASH_GROUPS || DASH_GROUPS)[group] || [];
      groupButton.style.display = pages.some(canOpenDashPage) ? '' : 'none';
    });
    const roleCode = String(memberAccess?.role?.code || '').toLowerCase();
    const backup = document.getElementById('backupBtn');
    if (backup) {
      const canBackup = roleCode === 'super_admin';
      backup.style.display = canBackup ? '' : 'none';
      backup.classList.toggle('hidden', !canBackup);
    }
    const alertBell = document.getElementById('alertBell');
    if (alertBell) {
      alertBell.style.display = hasMemberSession() ? '' : 'none';
      alertBell.classList.toggle('hidden', !hasMemberSession());
    }
    if (typeof buildAlerts === 'function') window.setTimeout(buildAlerts, 0);
    const addUser = document.getElementById('addMemberBtn'); if (addUser) addUser.style.display = hasPermission('users.manage') ? '' : 'none';
    const addRole = document.getElementById('addRoleBtn'); if (addRole) addRole.style.display = hasPermission('roles.manage') ? '' : 'none';
    stripDisallowedActions();
  }

  function hideByPermission(selector, permission) {
    document.querySelectorAll(selector).forEach(node => node.style.display = hasPermission(permission) ? '' : 'none');
  }

  function stripDisallowedActions() {
    hideByPermission('#incSaveBtn,[onclick^="addIncome"]', 'income.create');
    hideByPermission('#expSaveBtn,[onclick^="addExpense"]', 'expenses.create');
    hideByPermission('#horseSaveBtn,[onclick^="addHorse"]', 'horses.create');
    hideByPermission('#breedSaveBtn,[onclick^="addBreeding"]', 'breeding.create');
    hideByPermission('[onclick^="editIncome"],[onclick^="markPaid(\'income\'"]', 'income.update');
    hideByPermission('[onclick^="editExpense"],[onclick^="markPaid(\'expenses\'"]', 'expenses.update');
    hideByPermission('[onclick^="editHorse"],[onclick^="toggleHorse"]', 'horses.update');
    hideByPermission('[onclick^="editBreeding"]', 'breeding.update');
    hideByPermission('[onclick^="openAddSchedule"],[onclick^="saveSchedule"]', 'schedule.create');
    hideByPermission('[onclick^="editSchedule"],[onclick^="markScheduleDone"]', 'schedule.update');
    hideByPermission('[onclick^="openAddInstructor"],[onclick^="saveInstructor"]', 'instructors.create');
    hideByPermission('[onclick^="editInstructor"],[onclick^="resetInstrPIN"],[onclick^="toggleInstructor"]', 'instructors.update');
    hideByPermission('[onchange^="updateBookingStatus"]', 'bookings.update');
    document.querySelectorAll('[onclick^="delRec("]').forEach(button => {
      const action = button.getAttribute('onclick') || '';
      const table = (action.match(/delRec\(['\"]([^'\"]+)/) || [])[1];
      const map = {income:'income.delete',expenses:'expenses.delete',horses:'horses.delete',breeding:'breeding.delete',schedule:'schedule.delete',instructors:'instructors.delete'};
      if (map[table]) button.style.display = hasPermission(map[table]) ? '' : 'none';
    });
  }

  async function safeGet(table, query, allowed) {
    if (!allowed) return [];
    try { return await sbGet(table, query); }
    catch (error) {
      console.warn(`[CCE] ${table} unavailable for this account`, error);
      return [];
    }
  }

  function safeInvoke(name) {
    try { if (typeof window[name] === 'function') window[name](); }
    catch (error) { console.warn(`[CCE] render ${name} skipped`, error); }
  }

  window.loadAll = async function permissionAwareLoadAll() {
    if (!hasMemberSession() || routeForMember() !== 'dashboard') {
      const overlay = document.getElementById('loadingOverlay'); if (overlay) overlay.style.display = 'none';
      return;
    }
    const overlay = document.getElementById('loadingOverlay');
    const msg = document.getElementById('loadingMsg');
    if (overlay) overlay.style.display = 'flex';
    if (msg) msg.textContent = 'Loading permitted sections…';
    try {
      const needIncome = hasAny(['income.view','bookings.view','dashboard.view','reports.view']);
      const needExpenses = hasAny(['expenses.view','dashboard.view','reports.view']);
      const needBookings = hasPermission('bookings.view');
      const needBreeding = hasPermission('breeding.view');
      const needSchedule = hasPermission('schedule.view');
      const needInstructors = hasAny(['instructors.view','schedule.view']);
      const needHealth = hasAny(['horse_health.view','horse_medical.view','horse_vaccinations.view','horse_care.view','horse_events.view']);
      const needHorses = hasAny(['horses.view','dashboard.view','schedule.view']) || needHealth;
      [income, expenses, horses, breeding, schedule_data, instructors_data, booking_requests] = await Promise.all([
        safeGet('income','select=*&limit=2000',needIncome),
        safeGet('expenses','select=*&limit=1000',needExpenses),
        safeGet('horses','select=*&limit=500',needHorses),
        safeGet('breeding','select=*&limit=500',needBreeding),
        safeGet('schedule','select=*&order=date.asc,start_time.asc&limit=1500',needSchedule),
        safeGet('instructors','select=*&order=name.asc',needInstructors),
        safeGet('booking_requests','select=id,request_type,service_code,service_name,customer_name,phone,horse_name,requested_date,start_time,end_time,rider_level,session_slots,services,request_metadata,status,amount_bd,created_at,updated_at&order=created_at.desc&limit=1500',needBookings)
      ]);
      if (typeof normalizeLoadedPaymentStatuses === 'function') {
        normalizeLoadedPaymentStatuses(income); normalizeLoadedPaymentStatuses(expenses);
      }
      expenses.forEach(r => { if (typeof normalizeActivityCategory === 'function') r.category = normalizeActivityCategory(r.category); });
      income.forEach(r => { if (typeof normalizeActivityCategory === 'function') r.activity = normalizeActivityCategory(r.activity); });
      if (needHealth) {
        [horse_health_profiles, horse_health_events] = await Promise.all([
          safeGet('horse_health_profiles','select=*&limit=500',true),
          safeGet('horse_health_events','select=*&order=event_date.desc,id.desc&limit=4000',true)
        ]);
        if (window.CCE?.health?.mergeCompletedSummaries) horses = CCE.health.mergeCompletedSummaries(horses, horse_health_events);
        if (typeof deriveHealthCollections === 'function') deriveHealthCollections();
      } else {
        horse_health_profiles=[];horse_health_events=[];horse_medical_records=[];horse_vaccinations=[];horse_care_tasks=[];
      }
      const sync = document.getElementById('syncStatus'); if (sync) sync.textContent = '✓ ' + new Date().toLocaleTimeString('en-GB');
      if (hasPermission('dashboard.view')) safeInvoke('buildDash');
      if (hasPermission('income.view')) safeInvoke('renderIncome');
      if (hasPermission('expenses.view')) safeInvoke('renderExpenses');
      if (hasPermission('horses.view')) safeInvoke('renderHorses');
      if (needHealth) safeInvoke('renderHorseHealth');
      if (hasPermission('breeding.view')) safeInvoke('renderBreeding');
      if (hasAny(['income.view','expenses.view'])) safeInvoke('renderOverdue');
      if (hasPermission('bookings.view')) safeInvoke('renderBookings');
      if (hasPermission('schedule.view')) safeInvoke('renderSchedule');
      if (hasPermission('instructors.view')) safeInvoke('renderInstructors');
      if (hasPermission('audit.view')) safeInvoke('renderAuditLog');
      if (hasPermission('reports.view')) safeInvoke('renderAdvancedReports');
      if (hasPermission('income.view')) safeInvoke('renderReceipts');
      if (hasPermission('settings.manage')) safeInvoke('renderToolsPanel');
      safeInvoke('populateLists');
      safeInvoke('buildAlerts');
      safeInvoke('initNotifications');
      safeInvoke('checkScheduledNotifications');
      stripDisallowedActions();
      if (overlay) overlay.style.display = 'none';
    } catch (error) {
      if (overlay) overlay.style.display = 'none';
      if (typeof showError === 'function') showError('Loading error', error);
    }
  };

  async function openOwnerMemberPortal() {
    if (!hasMemberSession()) return;
    if (routeForMember() !== 'owner' && !hasAny(['owner.horses.view','owner.horses.update'])) return;
    if (!document.body.classList.contains('page-owner')) {
      syncMemberLogoutButtons();
      return;
    }
    const login = document.getElementById('ownerLoginWrap'); if (login) login.style.display = 'none';
    const portal = document.getElementById('ownerPortal'); if (portal) portal.style.display = 'block';
    syncMemberLogoutButtons();
    currentOwner = memberAccess.profile?.owner_name || memberAccess.profile?.full_name || 'Owner';
    const display = document.getElementById('ownerNameDisplay'); if (display) display.textContent = currentOwner;
    try {
      let rows = await sbRpc('cce_member_owner_horses', {});
      ownerHorses = Array.isArray(rows) ? rows : [];
      if(!ownerHorses.length && currentOwner){try{ownerHorses=await sbGet('horses',`owner=ilike.${encodeURIComponent(currentOwner)}&select=*`);}catch(_e){}}
      renderOwnerHorses();
      const list = document.getElementById('ownerHorseList');
      if (list && !ownerHorses.length) {
        list.innerHTML = '<div class="member-empty owner-empty-state"><strong>No horses linked to this account.</strong><span>Please ask the administrator to link the owner account to the correct horse record.</span></div>';
      }
      if (!hasPermission('owner.horses.update') && !hasPermission('horses.update')) document.querySelectorAll('#ownerHorseList .edit-toggle').forEach(x => x.style.display = 'none');
      if (typeof buildAlerts === 'function') buildAlerts();
    } catch (error) {
      const list = document.getElementById('ownerHorseList');
      if (list) list.innerHTML = `<div class="permission-denied"><strong>Unable to load owner horses.</strong><span>${html(typeof userSafeError === 'function' ? userSafeError(error) : error.message)}</span></div>`;
      if (typeof showError === 'function') showError('Owner portal', error);
    }
  }

  window.ownerUpdateHorse = async function secureMemberOwnerUpdate(id, data) {
    if (!hasPermission('owner.horses.update')) throw new Error('You do not have permission to update horse information.');
    const payload = {p_horse_id: id};
    Object.keys(data).forEach(key => { payload['p_' + key] = data[key]; });
    return sbRpc('cce_member_owner_update_horse', payload);
  };

  async function openInstructorMemberPortal() {
    if (!hasMemberSession()) return;
    if (routeForMember() !== 'trainer' && !hasPermission('schedule.view_own')) return;
    if (!document.body.classList.contains('page-instructor')) {
      syncMemberLogoutButtons();
      return;
    }
    const login = document.getElementById('instrLoginWrap'); if (login) login.style.display = 'none';
    currentInstructor = {id: memberAccess.profile?.instructor_id || null, name: memberAccess.instructor_name || memberAccess.profile?.full_name || 'Trainer'};
    sessionStorage.removeItem('cce_instr');
    const allScope = document.getElementById('instrScopeAll'); if (allScope) allScope.style.display = 'none';
    const mineScope = document.getElementById('instrScopeMine'); if (mineScope) mineScope.style.display = 'none';
    showInstrPortal();
    syncMemberLogoutButtons();
  }

  window.loadInstructorNames = function loadUnifiedInstructor() {
    if (hasMemberSession()) openInstructorMemberPortal();
  };

  window.loadInstrData = async function loadOwnInstructorSchedule() {
    if (!currentInstructor || !hasMemberSession()) return;
    try {
      const rows = await sbRpc('cce_member_instructor_schedule', {});
      const sessions = Array.isArray(rows) ? rows : [];
      const today = new Date(); today.setHours(0,0,0,0);
      const todayKey = fmtDateKey(today);
      const month = today.getMonth(), year = today.getFullYear();
      const todaySessions = sessions.filter(s => s.date === todayKey);
      const monthSessions = sessions.filter(s => { const d = new Date(s.date); return !isNaN(d) && d.getMonth() === month && d.getFullYear() === year; });
      document.getElementById('instrTodayCount').textContent = todaySessions.length;
      document.getElementById('instrMonthCount').textContent = monthSessions.length;
      document.getElementById('instrMonthStats').textContent = `${MONTHS_AR[month]} ${year} — ${monthSessions.length} sessions`;
      schedule_data = sessions;
      window._instrAllSessions = sessions;
      window._instrMySessions = sessions;
      window._instrSessions = sessions;
      instrScope = 'mine';
      renderInstrSchedule();
      if (typeof buildAlerts === 'function') buildAlerts();
    } catch (error) {
      window._instrSessions = [];
      renderInstrSchedule();
      if (typeof showError === 'function') showError('Schedule Error', error);
    }
  };

  window.instrMarkDone = async function secureInstructorDone(id) {
    if (!hasPermission('schedule.update_own')) return alert('You do not have permission to update this session.');
    if (!confirm('Mark this session as Done?')) return;
    try { await sbRpc('cce_member_instructor_update_schedule', {p_schedule_id:id,p_status:'Done',p_notes:null}); await loadInstrData(); }
    catch (error) { showError('Error', error); }
  };

  window.saveInstrNote = async function secureInstructorNote(id) {
    if (!hasPermission('schedule.update_own')) return alert('You do not have permission to update this session.');
    const note = text(document.getElementById('instr-note')?.value).trim();
    try { await sbRpc('cce_member_instructor_update_schedule', {p_schedule_id:id,p_status:null,p_notes:note}); closeModal(); await loadInstrData(); }
    catch (error) { showError('Error', error); }
  };

  async function callAdminUsers(action, payload = {}, retry = true) {
    const response = await fetch(ACCESS_FN, {
      method: 'POST',
      headers: {'Content-Type':'application/json', apikey:SB_KEY, Authorization:`Bearer ${SB_ACCESS_TOKEN}`},
      body: JSON.stringify({action, ...payload})
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && retry && await refreshMemberSession()) return callAdminUsers(action, payload, false);
    if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
    return body;
  }

  window.showAccessTab = function showAccessTab(tab) {
    const users = document.getElementById('accessUsersPanel');
    const roles = document.getElementById('accessRolesPanel');
    const userButton = document.getElementById('accessTabUsers');
    const roleButton = document.getElementById('accessTabRoles');
    if (users) users.style.display = tab === 'users' ? '' : 'none';
    if (roles) roles.style.display = tab === 'roles' ? '' : 'none';
    userButton?.classList.toggle('active', tab === 'users');
    roleButton?.classList.toggle('active', tab === 'roles');
  };

  window.loadAccessAdmin = async function loadAccessAdmin(force = false) {
    if (!hasAny(['users.manage','roles.manage'])) return;
    if (accessAdminLoading) return;
    if (accessAdminData && !force) { renderAccessUsers(); renderAccessRoles(); return; }
    accessAdminLoading = true;
    const usersPanel = document.getElementById('accessUsersPanel');
    const rolesPanel = document.getElementById('accessRolesPanel');
    if (usersPanel) usersPanel.innerHTML = '<div class="member-loading">Loading users…</div>';
    if (rolesPanel) rolesPanel.innerHTML = '<div class="member-loading">Loading roles…</div>';
    try {
      accessAdminData = await callAdminUsers('bootstrap');
      renderAccessUsers(); renderAccessRoles();
    } catch (error) {
      const message = `<div class="permission-denied">${html(error.message)}</div>`;
      if (usersPanel) usersPanel.innerHTML = message;
      if (rolesPanel) rolesPanel.innerHTML = message;
    } finally { accessAdminLoading = false; }
  };

  function roleById(id) { return (accessAdminData?.roles || []).find(role => role.id === id); }
  function userProfile(user) { return user.profile || {}; }
  function effectiveUserRole(user) { return roleById(userProfile(user).role_id) || user.role || {}; }

  function renderAccessUsers() {
    const panel = document.getElementById('accessUsersPanel'); if (!panel) return;
    const users = accessAdminData?.users || [];
    if (!users.length) { panel.innerHTML = '<div class="member-empty">No users found.</div>'; return; }
    panel.innerHTML = `<div class="member-user-grid">${users.map(user => {
      const profile = userProfile(user); const role = effectiveUserRole(user);
      const mapping = profile.owner_name ? `Owner: ${html(profile.owner_name)}` : profile.instructor_id ? `Trainer linked` : '';
      const loginEmail = user.email || profile.email || '';
      const emailLabel = isInternalMemberEmail(loginEmail) ? 'Internal member account' : loginEmail;
      return `<article class="member-user-card">
        <div class="member-user-head"><div class="member-avatar">${html(initials(profile.full_name || profile.username || loginEmail))}</div><div><div class="member-user-name">${html(profile.full_name || 'Unnamed user')}</div><div class="member-user-email">${profile.username ? '@'+html(profile.username)+' · ' : ''}${html(emailLabel)}</div></div></div>
        <div class="member-user-meta"><span class="member-chip">${html(role.name_en || role.code || 'No role')}</span><span class="member-chip ${profile.is_active === false ? 'inactive':'active'}">${profile.is_active === false ? 'Inactive':'Active'}</span>${mapping ? `<span class="member-chip">${mapping}</span>`:''}</div>
        <div class="member-user-actions">
          ${hasPermission('users.manage') ? `<button onclick="openEditMember('${attr(user.id)}')">✏️ Edit</button><button class="warn" onclick="openResetMemberPassword('${attr(user.id)}','${attr(profile.full_name || user.email)}')">🔑 Password</button><button class="${profile.is_active === false ? '' : 'danger'}" onclick="toggleMemberActive('${attr(user.id)}',${profile.is_active === false})">${profile.is_active === false ? '✓ Activate':'⛔ Deactivate'}</button>` : ''}
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  function renderAccessRoles() {
    const panel = document.getElementById('accessRolesPanel'); if (!panel) return;
    const roles = accessAdminData?.roles || [];
    const links = accessAdminData?.role_permissions || [];
    panel.innerHTML = `<div class="member-role-grid">${roles.map(role => {
      const count = links.filter(link => link.role_id === role.id && link.allowed !== false).length;
      return `<article class="member-role-card"><div class="member-role-title"><strong>${html(role.name_en || role.code)}</strong><span class="member-chip">${html(role.code)}</span></div><div class="member-role-desc">${html(role.description || role.name_ar || '')}</div><div class="member-role-count">${count} permissions</div>${hasPermission('roles.manage') ? `<button onclick="openEditRole('${attr(role.id)}')">⚙️ Edit permissions</button>`:''}</article>`;
    }).join('')}</div>`;
  }

  function roleOptions(selected) {
    return (accessAdminData?.roles || []).map(role => `<option value="${attr(role.id)}" ${role.id === selected ? 'selected':''}>${html(role.name_en || role.code)} — ${html(role.name_ar || '')}</option>`).join('');
  }
  function instructorOptions(selected) {
    return '<option value="">— Not linked —</option>' + (accessAdminData?.instructors || []).map(item => `<option value="${attr(item.id)}" ${String(item.id) === String(selected || '') ? 'selected':''}>${html(item.name)}</option>`).join('');
  }
  function ownerOptions(selected) {
    const values = accessAdminData?.owners || [];
    return `<input class="inp" id="member-owner" list="memberOwnerNames" value="${attr(selected || '')}" placeholder="Exact owner name in Horses"><datalist id="memberOwnerNames">${values.map(owner => `<option value="${attr(owner)}">`).join('')}</datalist>`;
  }

  function rolePermissionSet(roleId) {
    return new Set((accessAdminData?.role_permissions || [])
      .filter(item => item.role_id === roleId && item.allowed !== false)
      .map(item => item.permission_code));
  }

  function groupedPermissionsHtml(renderItem) {
    const groups = new Map();
    for (const permission of (accessAdminData?.permissions || [])) {
      const category = permission.category || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(permission);
    }
    return [...groups.entries()].map(([category, permissions]) => `
      <section class="member-permission-group">
        <div class="member-permission-group-title">${html(category)}</div>
        <div class="member-permission-grid">${permissions.map(renderItem).join('')}</div>
      </section>`).join('');
  }

  function permissionOverridesHtml(userId, roleId) {
    const overrides = (accessAdminData?.user_permissions || []).filter(item => item.user_id === userId);
    const overrideMap = new Map(overrides.map(item => [item.permission_code, item.allowed]));
    const roleDefaults = rolePermissionSet(roleId);
    const permissions = accessAdminData?.permissions || [];
    const effectiveCount = permissions.filter(permission => overrideMap.has(permission.code)
      ? overrideMap.get(permission.code) === true
      : roleDefaults.has(permission.code)).length;
    return `<div class="member-permission-toolbar">
      <div class="member-permission-toolbar-copy"><strong>Effective permissions / الصلاحيات الفعلية</strong><small>Unchecked permissions are denied. Changes that match the selected role are saved as inherited.</small></div>
      <div class="member-permission-toolbar-actions">
        <button type="button" onclick="setAllUserPermissions(true)">✓ Select all / تحديد الكل</button>
        <button type="button" onclick="setAllUserPermissions(false)">□ Clear all / إلغاء الكل</button>
        <button type="button" onclick="applySelectedRolePermissions()">↺ Restore role / استعادة الدور</button>
      </div>
      <span class="member-permission-summary" id="userPermissionSummary">${effectiveCount} / ${permissions.length} selected</span>
    </div>
    <div class="member-permission-list">${groupedPermissionsHtml(permission => {
      const roleAllowed = roleDefaults.has(permission.code);
      const effectiveAllowed = overrideMap.has(permission.code) ? overrideMap.get(permission.code) === true : roleAllowed;
      const isCustom = overrideMap.has(permission.code) && effectiveAllowed !== roleAllowed;
      return `<label class="member-permission-check ${isCustom ? 'is-custom':''}">
        <input type="checkbox" data-user-permission="${attr(permission.code)}" ${effectiveAllowed?'checked':''} onchange="refreshUserPermissionIndicators()">
        <span class="member-permission-copy"><strong>${html(permission.name_en || permission.code)}</strong><small>${html(permission.name_ar || '')}${permission.name_ar ? ' · ' : ''}${html(permission.code)}</small></span>
        <span class="member-permission-origin" data-user-permission-origin="${attr(permission.code)}">${isCustom ? 'Custom':'From role'}</span>
      </label>`;
    })}</div>`;
  }

  function updateUserPermissionSummary() {
    const boxes = [...document.querySelectorAll('[data-user-permission]')];
    const selected = boxes.filter(box => box.checked).length;
    const summary = document.getElementById('userPermissionSummary');
    if (summary) summary.textContent = `${selected} / ${boxes.length} selected`;
  }

  window.refreshUserPermissionIndicators = function refreshUserPermissionIndicators() {
    const roleId = document.getElementById('member-role')?.value || '';
    const roleDefaults = rolePermissionSet(roleId);
    document.querySelectorAll('[data-user-permission]').forEach(input => {
      const custom = input.checked !== roleDefaults.has(input.dataset.userPermission);
      const row = input.closest('.member-permission-check');
      if (row) row.classList.toggle('is-custom', custom);
      const origin = document.querySelector(`[data-user-permission-origin="${CSS.escape(input.dataset.userPermission)}"]`);
      if (origin) origin.textContent = custom ? 'Custom' : 'From role';
    });
    updateUserPermissionSummary();
  };

  window.setAllUserPermissions = function setAllUserPermissions(checked) {
    document.querySelectorAll('[data-user-permission]').forEach(input => { input.checked = !!checked; });
    window.refreshUserPermissionIndicators();
  };

  window.applySelectedRolePermissions = function applySelectedRolePermissions() {
    const roleId = document.getElementById('member-role')?.value || '';
    const roleDefaults = rolePermissionSet(roleId);
    document.querySelectorAll('[data-user-permission]').forEach(input => {
      input.checked = roleDefaults.has(input.dataset.userPermission);
    });
    window.refreshUserPermissionIndicators();
  };

  window.openCreateMember = function openCreateMember() {
    if (!hasPermission('users.manage')) return;
    openModal('➕ Add Member', `<div class="form-grid">
      <div class="form-group"><label>Full name *</label><input id="member-name" type="text"></div>
      <div class="form-group"><label>Username *</label><input id="member-username" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="e.g. mohamed"></div>
      <div class="form-group"><label>Email (optional)</label><input id="member-email" type="email" autocomplete="off" placeholder="Leave blank for an internal account"></div>
      <div class="form-group"><label>Temporary password *</label><input id="member-password" type="password" autocomplete="new-password"></div>
      <div class="form-group"><label>Phone</label><input id="member-phone" type="tel"></div>
      <div class="form-group"><label>Role *</label><select id="member-role">${roleOptions('')}</select></div>
      <div class="form-group"><label>Status</label><select id="member-active"><option value="true">Active</option><option value="false">Inactive</option></select></div>
      <div class="form-group"><label>Owner mapping</label>${ownerOptions('')}</div>
      <div class="form-group"><label>Instructor mapping</label><select id="member-instructor">${instructorOptions('')}</select></div>
    </div><div class="member-login-note">Username: 3–32 lowercase letters, numbers, dot, dash, or underscore. Email is optional; when omitted, the system creates a private internal login email. For owner accounts, enter the owner name exactly as stored in the Horses table. For trainers, select the matching instructor record.</div><div class="btn-row"><button class="btn btn-green" onclick="saveNewMember()">Create account</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  };

  window.saveNewMember = async function saveNewMember() {
    const payload = {
      username:normalizeUsername(document.getElementById('member-username')?.value),
      email:text(document.getElementById('member-email')?.value).trim(), password:text(document.getElementById('member-password')?.value),
      full_name:text(document.getElementById('member-name')?.value).trim(), phone:text(document.getElementById('member-phone')?.value).trim() || null,
      role_id:document.getElementById('member-role')?.value || null, is_active:document.getElementById('member-active')?.value !== 'false',
      owner_name:text(document.getElementById('member-owner')?.value).trim() || null, instructor_id:document.getElementById('member-instructor')?.value || null
    };
    if (!payload.username || !payload.password || !payload.full_name || !payload.role_id) return alert('Name, username, password and role are required.');
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(payload.username)) return alert('Username must be 3–32 characters and use lowercase letters, numbers, dot, dash, or underscore.');
    try { await callAdminUsers('create_user', {user:payload}); closeModal(); accessAdminData = null; await loadAccessAdmin(true); alert('✅ User created successfully.'); }
    catch (error) { showError('Create user', error); }
  };

  window.openEditMember = function openEditMember(userId) {
    if (!hasPermission('users.manage')) return;
    const user = (accessAdminData?.users || []).find(item => item.id === userId); if (!user) return;
    const profile = userProfile(user);
    const suggestedUsername = profile.username || normalizeUsername((user.email || profile.email || '').split('@')[0]);
    openModal('✏️ Edit Member', `<div class="form-grid">
      <div class="form-group"><label>Full name *</label><input id="member-name" type="text" value="${attr(profile.full_name || '')}"></div>
      <div class="form-group"><label>Username *</label><input id="member-username" type="text" value="${attr(suggestedUsername)}" autocapitalize="none" spellcheck="false"></div>
      <div class="form-group"><label>Email</label><input id="member-email" type="email" value="${attr(user.email || profile.email || '')}"></div>
      <div class="form-group"><label>Phone</label><input id="member-phone" type="tel" value="${attr(profile.phone || '')}"></div>
      <div class="form-group"><label>Role *</label><select id="member-role" onchange="applySelectedRolePermissions()">${roleOptions(profile.role_id)}</select></div>
      <div class="form-group"><label>Status</label><select id="member-active"><option value="true" ${profile.is_active !== false?'selected':''}>Active</option><option value="false" ${profile.is_active === false?'selected':''}>Inactive</option></select></div>
      <div class="form-group"><label>Owner mapping</label>${ownerOptions(profile.owner_name || '')}</div>
      <div class="form-group"><label>Instructor mapping</label><select id="member-instructor">${instructorOptions(profile.instructor_id)}</select></div>
    </div><div class="member-form-section"><h4>Permissions / الصلاحيات</h4>${permissionOverridesHtml(userId, profile.role_id)}</div><div class="btn-row"><button class="btn btn-green" onclick="saveEditedMember('${attr(userId)}')">Save changes</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  };

  function collectOverrides() {
    const roleId = document.getElementById('member-role')?.value || '';
    const roleDefaults = rolePermissionSet(roleId);
    return [...document.querySelectorAll('[data-user-permission]')]
      .filter(input => input.checked !== roleDefaults.has(input.dataset.userPermission))
      .map(input => ({permission_code:input.dataset.userPermission, allowed:input.checked}));
  }

  window.saveEditedMember = async function saveEditedMember(userId) {
    const user = {
      username:normalizeUsername(document.getElementById('member-username')?.value),
      email:text(document.getElementById('member-email')?.value).trim(), full_name:text(document.getElementById('member-name')?.value).trim(),
      phone:text(document.getElementById('member-phone')?.value).trim() || null, role_id:document.getElementById('member-role')?.value || null,
      is_active:document.getElementById('member-active')?.value !== 'false', owner_name:text(document.getElementById('member-owner')?.value).trim() || null,
      instructor_id:document.getElementById('member-instructor')?.value || null, permission_overrides:collectOverrides()
    };
    if (!user.full_name || !user.username || !user.role_id) return alert('Name, username and role are required.');
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(user.username)) return alert('Username must be 3–32 characters and use lowercase letters, numbers, dot, dash, or underscore.');
    try { await callAdminUsers('update_user', {user_id:userId,user}); closeModal(); accessAdminData = null; await loadAccessAdmin(true); alert('✅ User updated.'); }
    catch (error) { showError('Update user', error); }
  };

  window.openResetMemberPassword = function openResetMemberPassword(userId, name) {
    openModal('🔑 Reset Password — ' + html(name), `<div class="form-group"><label>New password *</label><input id="member-new-password" class="inp" type="password" autocomplete="new-password"></div><div class="form-group"><label>Confirm password *</label><input id="member-confirm-password" class="inp" type="password" autocomplete="new-password"></div><div class="btn-row"><button class="btn btn-amber" onclick="saveResetMemberPassword('${attr(userId)}')">Save password</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  };

  window.saveResetMemberPassword = async function saveResetMemberPassword(userId) {
    const password = text(document.getElementById('member-new-password')?.value); const confirmPassword = text(document.getElementById('member-confirm-password')?.value);
    if (password.length < 8) return alert('Password must be at least 8 characters.');
    if (password !== confirmPassword) return alert('Passwords do not match.');
    try { await callAdminUsers('reset_password', {user_id:userId,password}); closeModal(); alert('✅ Password updated.'); }
    catch (error) { showError('Reset password', error); }
  };

  window.toggleMemberActive = async function toggleMemberActive(userId, activate) {
    const action = activate ? 'activate':'deactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try { await callAdminUsers('set_active', {user_id:userId,is_active:activate}); accessAdminData = null; await loadAccessAdmin(true); }
    catch (error) { showError('Update user', error); }
  };

  function rolePermissionsHtml(roleId) {
    const current = rolePermissionSet(roleId);
    const permissions = accessAdminData?.permissions || [];
    return `<div class="member-permission-toolbar">
      <div class="member-permission-toolbar-copy"><strong>Role permissions / صلاحيات الدور</strong><small>Select the permissions inherited by every member assigned to this role.</small></div>
      <div class="member-permission-toolbar-actions">
        <button type="button" onclick="setAllRolePermissions(true)">✓ Select all / تحديد الكل</button>
        <button type="button" onclick="setAllRolePermissions(false)">□ Clear all / إلغاء الكل</button>
      </div>
      <span class="member-permission-summary" id="rolePermissionSummary">${current.size} / ${permissions.length} selected</span>
    </div><div class="member-permission-list">${groupedPermissionsHtml(permission => `<label class="member-permission-check">
      <input type="checkbox" data-role-permission="${attr(permission.code)}" ${current.has(permission.code)?'checked':''} onchange="updateRolePermissionSummary()">
      <span class="member-permission-copy"><strong>${html(permission.name_en || permission.code)}</strong><small>${html(permission.name_ar || '')}${permission.name_ar ? ' · ' : ''}${html(permission.code)}</small></span>
    </label>`)}</div>`;
  }

  window.updateRolePermissionSummary = function updateRolePermissionSummary() {
    const boxes = [...document.querySelectorAll('[data-role-permission]')];
    const summary = document.getElementById('rolePermissionSummary');
    if (summary) summary.textContent = `${boxes.filter(box => box.checked).length} / ${boxes.length} selected`;
  };

  window.setAllRolePermissions = function setAllRolePermissions(checked) {
    document.querySelectorAll('[data-role-permission]').forEach(input => { input.checked = !!checked; });
    window.updateRolePermissionSummary();
  };

  window.openCreateRole = function openCreateRole() {
    if (!hasPermission('roles.manage')) return;
    openModal('➕ Add Role', `<div class="form-grid"><div class="form-group"><label>Code *</label><input id="role-code" type="text" placeholder="operations_manager"></div><div class="form-group"><label>English name *</label><input id="role-name-en" type="text"></div><div class="form-group"><label>Arabic name</label><input id="role-name-ar" type="text"></div><div class="form-group"><label>Description</label><input id="role-description" type="text"></div></div><div class="member-form-section"><h4>Permissions</h4>${rolePermissionsHtml('__new__')}</div><div class="btn-row"><button class="btn btn-green" onclick="saveNewRole()">Create role</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  };

  function collectRolePermissions() { return [...document.querySelectorAll('[data-role-permission]:checked')].map(input => input.dataset.rolePermission); }

  window.saveNewRole = async function saveNewRole() {
    const role = {code:text(document.getElementById('role-code')?.value).trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_'),name_en:text(document.getElementById('role-name-en')?.value).trim(),name_ar:text(document.getElementById('role-name-ar')?.value).trim(),description:text(document.getElementById('role-description')?.value).trim(),permissions:collectRolePermissions()};
    if (!role.code || !role.name_en) return alert('Role code and English name are required.');
    try { await callAdminUsers('create_role', {role}); closeModal(); accessAdminData=null; await loadAccessAdmin(true); alert('✅ Role created.'); }
    catch (error) { showError('Create role', error); }
  };

  window.openEditRole = function openEditRole(roleId) {
    if (!hasPermission('roles.manage')) return;
    const role = roleById(roleId); if (!role) return;
    openModal('⚙️ Edit Role', `<div class="form-grid"><div class="form-group"><label>Code</label><input id="role-code" type="text" value="${attr(role.code)}" ${role.is_system?'readonly':''}></div><div class="form-group"><label>English name *</label><input id="role-name-en" type="text" value="${attr(role.name_en || '')}"></div><div class="form-group"><label>Arabic name</label><input id="role-name-ar" type="text" value="${attr(role.name_ar || '')}"></div><div class="form-group"><label>Description</label><input id="role-description" type="text" value="${attr(role.description || '')}"></div></div><div class="member-form-section"><h4>Permissions</h4>${rolePermissionsHtml(roleId)}</div><div class="btn-row"><button class="btn btn-green" onclick="saveEditedRole('${attr(roleId)}')">Save role</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  };

  window.saveEditedRole = async function saveEditedRole(roleId) {
    const role = {code:text(document.getElementById('role-code')?.value).trim(),name_en:text(document.getElementById('role-name-en')?.value).trim(),name_ar:text(document.getElementById('role-name-ar')?.value).trim(),description:text(document.getElementById('role-description')?.value).trim(),permissions:collectRolePermissions()};
    if (!role.name_en) return alert('English role name is required.');
    try { await callAdminUsers('update_role', {role_id:roleId,role}); closeModal(); accessAdminData=null; await loadAccessAdmin(true); alert('✅ Role updated. Existing users receive the new permissions immediately.'); }
    catch (error) { showError('Update role', error); }
  };

  async function restoreMember() {
    resetProtectedPortals();
    if (!SB_ACCESS_TOKEN) {
      const saved = sessionStorage.getItem(MEMBER_KEY);
      if (saved) sessionStorage.removeItem(MEMBER_KEY);
      return false;
    }
    try {
      await fetchMyAccess(true);
      applyMemberUI();
      return true;
    } catch (error) {
      console.warn('[CCE] member session restore failed', error);
      clearMemberSession();
      return false;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    resetProtectedPortals();
    const restored = await restoreMember();
    const open = new URLSearchParams(location.search).get('open');
    if (open === 'booking') window.navigate('booking');
    else if (open === 'login') restored ? routeMemberHome() : window.navigate('admin');
    else if (restored && ['owner','instructor','dashboard','admin'].includes(currentPage)) routeMemberHome();
    const overlay = document.getElementById('loadingOverlay'); if (overlay && overlay.style.display !== 'flex') overlay.style.display = 'none';
  });
})();
