(function () {
  'use strict';

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v6h-6"/></svg>',
    backup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5"/><path d="M13 8l4 4-4 4M17 12H9"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
  };

  const ACTIONS = {
    backBtn: { icon: ICONS.home, label: 'Home', tone: 'neutral', priority: 70 },
    refreshBtn: { icon: ICONS.refresh, label: 'Refresh', tone: 'neutral', priority: 30 },
    backupBtn: { icon: ICONS.backup, label: 'Backup', tone: 'success', priority: 40 },
    logoutAdminBtn: { icon: ICONS.logout, label: 'Logout', tone: 'danger', priority: 90 },
    logoutOwnerBtn: { icon: ICONS.logout, label: 'Logout', tone: 'danger', priority: 90 },
    instrLogoutBtn: { icon: ICONS.logout, label: 'Logout', tone: 'danger', priority: 90 }
  };

  function actionMarkup(config, label) {
    return `<span class="cce-header-action-icon" aria-hidden="true">${config.icon || ''}</span><span class="cce-header-action-label">${label}</span>`;
  }

  function enhanceAction(el, config) {
    if (!el) return;
    const label = el.dataset.actionLabel || config.label || 'Action';
    el.dataset.cceHeaderEnhanced = '1';
    el.dataset.actionLabel = label;
    el.dataset.actionTone = config.tone || 'neutral';
    el.style.order = String(config.priority || 50);
    el.classList.add('cce-header-action');

    // Always normalize the contents. Legacy code may rewrite button text after load,
    // which previously caused duplicated icons and extra square glyphs.
    const expected = actionMarkup(config, label);
    if (el.innerHTML !== expected) el.innerHTML = expected;
    // A second line of defence against legacy CSS/markup that used emoji icons.
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
    });
    el.setAttribute('aria-label', label);
    el.setAttribute('title', label);
  }

  function enhanceBell(el) {
    if (!el) return;
    let badge = el.querySelector('.alert-bell-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'alert-bell-badge';
      badge.id = 'alertBellCount';
      badge.textContent = '0';
    }
    el.dataset.cceHeaderEnhanced = '1';
    el.classList.add('cce-header-action', 'cce-header-bell');
    el.style.order = '60';
    const hasNormalizedIcon = el.querySelectorAll(':scope > .cce-header-action-icon').length === 1;
    const hasSingleBadge = el.querySelectorAll(':scope > .alert-bell-badge').length === 1;
    if (!hasNormalizedIcon || !hasSingleBadge || el.childNodes.length !== 2) {
      el.innerHTML = `<span class="cce-header-action-icon" aria-hidden="true">${ICONS.bell}</span>`;
      el.appendChild(badge);
    }
    el.setAttribute('aria-label', 'Notifications');
    el.setAttribute('title', 'Notifications');
  }

  function enhancePill(pill) {
    if (!pill) return;
    pill.classList.add('cce-header-user');
    pill.style.order = '10';
  }

  function isSuperAdministrator() {
    const role = String(window.CCE_MEMBER?.role?.code || '').toLowerCase();
    return role === 'super_admin';
  }

  function enforceActionVisibility() {
    const backup = document.getElementById('backupBtn');
    if (backup) {
      const allow = isSuperAdministrator();
      backup.classList.toggle('hidden', !allow);
      backup.style.display = allow ? '' : 'none';
    }
    const bell = document.getElementById('alertBell');
    if (bell && window.CCE_MEMBER) {
      bell.classList.remove('hidden');
      bell.style.display = '';
    }
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
    enforceActionVisibility();
    requestAnimationFrame(syncHeaderMetrics);
  }

  function configureServiceHeaders() {
    document.querySelectorAll('.service-header').forEach((header) => {
      header.classList.add('cce-header', 'cce-service-responsive-header');
      const brand = header.querySelector('.header-brand');
      if (brand) brand.classList.add('cce-header-brand');
      header.querySelectorAll('.home-btn,.sync-btn').forEach((btn) => {
        const isHome = btn.classList.contains('home-btn');
        enhanceAction(btn, isHome
          ? {icon:ICONS.home,label:'Home',tone:'neutral',priority:70}
          : {icon:ICONS.refresh,label:'Refresh',tone:'neutral',priority:30});
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
      enhanceAction(btn, isHome
        ? {icon:ICONS.home,label:'Home',tone:'neutral',priority:70}
        : {icon:ICONS.logout,label:'Logout',tone:'danger',priority:90});
    });
  }

  function syncHeaderMetrics() {
    const header = document.getElementById('globalHeader');
    const bottom = header && getComputedStyle(header).display !== 'none'
      ? Math.max(0, Math.round(header.getBoundingClientRect().bottom))
      : 0;
    document.documentElement.style.setProperty('--cce-header-bottom', `${bottom}px`);
  }

  function refresh() {
    configureGlobalHeader();
    configureServiceHeaders();
    configurePublicHeader();
    configureLegacyInstructorHeader();
    enhancePill(document.getElementById('memberSessionPill'));
    enforceActionVisibility();
  }

  function init() {
    refresh();
    const header = document.getElementById('globalHeader');
    if (header) {
      let scheduled = false;
      const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; refresh(); });
      });
      observer.observe(header, {childList:true, subtree:true, characterData:true});
    }
    const updateViewport = () => {
      document.documentElement.style.setProperty('--cce-vw', `${window.innerWidth}px`);
      requestAnimationFrame(syncHeaderMetrics);
    };
    window.addEventListener('resize', updateViewport, {passive:true});
    window.addEventListener('orientationchange', updateViewport, {passive:true});
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport, {passive:true});
      window.visualViewport.addEventListener('scroll', updateViewport, {passive:true});
    }
    if (header && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => requestAnimationFrame(syncHeaderMetrics));
      ro.observe(header);
    }
    updateViewport();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  window.CCEHeaderSystem = { refresh, syncHeaderMetrics, icons: ICONS };
})();
