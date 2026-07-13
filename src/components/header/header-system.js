(function () {
  'use strict';

  const ACTIONS = {
    backBtn: { icon: '⌂', label: 'Home', tone: 'neutral', priority: 70 },
    refreshBtn: { icon: '↻', label: 'Refresh', tone: 'neutral', priority: 30 },
    backupBtn: { icon: '▣', label: 'Backup', tone: 'success', priority: 40 },
    logoutAdminBtn: { icon: '⇥', label: 'Logout', tone: 'danger', priority: 90 },
    logoutOwnerBtn: { icon: '⇥', label: 'Logout', tone: 'danger', priority: 90 },
    instrLogoutBtn: { icon: '⇥', label: 'Logout', tone: 'danger', priority: 90 }
  };

  function enhanceAction(el, config) {
    if (!el) return;
    const alreadyStructured = Boolean(el.querySelector('.cce-header-action-icon') && el.querySelector('.cce-header-action-label'));
    if (alreadyStructured) return;
    const rawLabel = (el.textContent || '').trim().replace(/^[^A-Za-z\u0600-\u06FF]+/, '').trim();
    const label = rawLabel || config.label || 'Action';
    el.dataset.cceHeaderEnhanced = '1';
    el.dataset.actionLabel = label;
    el.dataset.actionTone = config.tone || 'neutral';
    el.style.order = String(config.priority || 50);
    el.classList.add('cce-header-action');
    el.innerHTML = `<span class="cce-header-action-icon" aria-hidden="true">${config.icon || '•'}</span><span class="cce-header-action-label">${label}</span>`;
    el.setAttribute('aria-label', label);
    el.setAttribute('title', label);
  }

  function enhanceBell(el) {
    if (!el || el.dataset.cceHeaderEnhanced === '1') return;
    el.dataset.cceHeaderEnhanced = '1';
    el.classList.add('cce-header-action', 'cce-header-bell');
    el.style.order = '60';
    el.setAttribute('aria-label', 'Notifications');
    el.setAttribute('title', 'Notifications');
  }

  function enhancePill(pill) {
    if (!pill) return;
    pill.classList.add('cce-header-user');
    pill.style.order = '10';
  }

  function configureGlobalHeader() {
    const header = document.getElementById('globalHeader');
    if (!header) return;
    header.classList.add('cce-header', 'cce-workspace-header');
    const brand = header.querySelector('.header-brand');
    const actions = header.querySelector('.header-right');
    if (brand) brand.classList.add('cce-header-brand');
    if (actions) actions.classList.add('cce-header-actions');

    Object.entries(ACTIONS).forEach(([id, cfg]) => enhanceAction(document.getElementById(id), cfg));
    enhanceBell(document.getElementById('alertBell'));
    enhancePill(document.getElementById('memberSessionPill'));

    const sync = document.getElementById('syncStatus');
    if (sync) {
      sync.classList.add('cce-header-sync');
      sync.style.order = '20';
      sync.setAttribute('aria-label', 'Sync status');
    }
  }

  function configureServiceHeaders() {
    document.querySelectorAll('.service-header').forEach((header) => {
      header.classList.add('cce-header', 'cce-service-responsive-header');
      const brand = header.querySelector('.header-brand');
      if (brand) brand.classList.add('cce-header-brand');
      header.querySelectorAll('.home-btn,.sync-btn').forEach((btn) => {
        const isHome = btn.classList.contains('home-btn');
        enhanceAction(btn, isHome ? {icon:'⌂',label:'Home',tone:'neutral',priority:70} : {icon:'↻',label:'Refresh',tone:'neutral',priority:30});
      });
    });
  }

  function configurePublicHeader() {
    const nav = document.querySelector('.public-nav');
    if (nav) nav.classList.add('cce-public-responsive-header');
  }

  function configureLegacyInstructorHeader() {
    const header = document.querySelector('#page-instructor > .legacy-portal-header');
    if (!header) return;
    header.classList.add('cce-header', 'cce-legacy-header');
    header.querySelectorAll('.home-btn,.sync-btn').forEach((btn) => {
      const isHome = btn.classList.contains('home-btn');
      enhanceAction(btn, isHome ? {icon:'⌂',label:'Home',tone:'neutral',priority:70} : {icon:'⇥',label:'Logout',tone:'danger',priority:90});
    });
  }

  function refresh() {
    configureGlobalHeader();
    configureServiceHeaders();
    configurePublicHeader();
    configureLegacyInstructorHeader();
    enhancePill(document.getElementById('memberSessionPill'));
  }

  function init() {
    refresh();
    const header = document.getElementById('globalHeader');
    if (header) {
      const observer = new MutationObserver(refresh);
      observer.observe(header, {childList:true, subtree:true});
    }
    window.addEventListener('resize', () => document.documentElement.style.setProperty('--cce-vw', `${window.innerWidth}px`), {passive:true});
    document.documentElement.style.setProperty('--cce-vw', `${window.innerWidth}px`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  window.CCEHeaderSystem = { refresh };
})();
