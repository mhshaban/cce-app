// Show Office UI controller.
// The root entry point is retained for compatibility; persistence and validation live in module services.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const LEGACY_STORAGE_KEY = 'cce_show_office_competitions_v1';
  let competitions = [];
  let classRows = [];
  let classTotal = 0;
  let entryRows = [];
  let entryContext = [];
  let entryTotal = 0;
  let entryPageTotal = 0;
  let selectedCompetitionId = '';
  let selectedEntryCompetitionId = '';
  let selectedEntryClassId = '';
  let loading = false;
  let loaded = false;
  let loadPromise = null;
  let loadError = '';
  let classesLoading = false;
  let classesLoaded = false;
  let classesPromise = null;
  let classesError = '';
  let classLoadRequest = 0;
  let entriesLoading = false;
  let entriesLoaded = false;
  let entriesPromise = null;
  let entriesError = '';
  let entryLoadRequest = 0;
  let entryPage = 0;
  const ENTRY_PAGE_SIZE = 100;
  let entryDirectory = {riders:[], horses:[], stables:[], core_horses:[]};
  let entryDirectoryTimer = null;
  let entrySearchTimer = null;
  const entryDirectoryLabels = {rider:new Map(), horse:new Map(), stable:new Map()};

  const competitionService = () => showOffice.competitionService;
  const classService = () => showOffice.classService;
  const entryService = () => showOffice.entryService;
  const clean = value => String(value == null ? '' : value).trim();
  const html = value => typeof window.esc === 'function'
    ? window.esc(value)
    : clean(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const attr = value => typeof window.escAttr === 'function' ? window.escAttr(value) : html(value);
  const can = permission => typeof window.canUser === 'function' && window.canUser(permission);
  const canViewCompetitions = () => can('show_office.view') || can('show_office.competitions.view');
  const canViewClasses = () => can('show_office.view') || can('show_office.classes.view');
  const canViewEntries = () => can('show_office.view') || can('show_office.entries.view');
  const canView = () => canViewCompetitions() || canViewClasses() || canViewEntries();

  function competitionById(id) {
    return competitions.find(row => String(row.id) === String(id)) || null;
  }

  function classById(id) {
    return classRows.find(row => String(row.id) === String(id)) || null;
  }

  function entryById(id) {
    return entryRows.find(row => String(row.id) === String(id)) || null;
  }

  function setCompetitions(rows) {
    competitions = (Array.isArray(rows) ? rows : []).map(competitionService().normalize).sort((left, right) =>
      String(right.competition_date).localeCompare(String(left.competition_date))
      || Number(right.id || 0) - Number(left.id || 0)
    );
    if (selectedCompetitionId && !competitionById(selectedCompetitionId)) {
      selectedCompetitionId = '';
      classRows = [];
      classesLoaded = false;
    }
    if (window.CCE.store) window.CCE.store.set('showOfficeCompetitions', competitions);
    return competitions;
  }

  function setClasses(rows) {
    classRows = (Array.isArray(rows) ? rows : []).map(classService().normalize).sort((left, right) =>
      Number(left.sort_order || 0) - Number(right.sort_order || 0)
      || Number(left.id || 0) - Number(right.id || 0)
    );
    if (window.CCE.store) window.CCE.store.set('showOfficeClasses', classRows);
    return classRows;
  }

  function setEntries(rows) {
    entryRows = (Array.isArray(rows) ? rows : []).map(entryService().normalize).sort((left, right) =>
      Number(left.start_number || 0) - Number(right.start_number || 0)
      || Number(left.id || 0) - Number(right.id || 0)
    );
    if (window.CCE.store) window.CCE.store.set('showOfficeEntries', entryRows);
    return entryRows;
  }

  function dateLabel(value) {
    if (!value) return 'Date not set';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? html(value)
      : date.toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar-BH' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
  }

  function statusClass(status) {
    return `so-status-${clean(status || 'Draft').toLowerCase()}`;
  }

  function friendlyError(error) {
    const message = String(error?.message || error || 'Unexpected error');
    if (/show_office_competitions_name_date_uidx|duplicate key.*competition|23505.*competition/i.test(message)) {
      return 'A competition with the same name and date already exists.';
    }
    if (/show_office_classes_competition_number_uidx|duplicate key.*class/i.test(message)) {
      return 'This competition already has a class with the same class number.';
    }
    if (/show_office_entries_class_start_uidx|duplicate key.*start/i.test(message)) {
      return 'This class already has the same start number.';
    }
    if (/show_office_entries_class_pair_uidx|duplicate key.*pair/i.test(message)) {
      return 'This rider and horse are already entered in the selected class.';
    }
    if (/show_office_entries.*foreign key|show_office_entries_class_id_fkey/i.test(message)) {
      return 'This class contains entries. Delete its entries before deleting the class.';
    }
    if (/show_office_classes|foreign key|23503/i.test(message)) {
      return 'This competition contains classes. Delete its classes before deleting the competition.';
    }
    if (/row-level security|permission denied|42501/i.test(message)) {
      return 'You do not have permission to perform this Show Office action.';
    }
    return typeof window.userSafeError === 'function' ? window.userSafeError(error) : message;
  }

  function reportError(prefix, error) {
    const message = friendlyError(error);
    if (typeof window.showError === 'function') window.showError(prefix, new Error(message));
    else window.alert(`${prefix}: ${message}`);
  }

  function stateHtml(message, icon = '🏆') {
    return `<div class="so-empty"><span>${icon}</span><strong>${html(message)}</strong></div>`;
  }

  function loadWarningHtml(message, action) {
    return `<div class="so-load-warning" role="alert">
      <div><strong>Refresh failed</strong><span>${html(message)}</span></div>
      <button class="btn btn-amber" onclick="${attr(action)}">Try again</button>
    </div>`;
  }

  function competitionActions(row) {
    const actions = [];
    if (canViewClasses()) {
      actions.push(`<button class="action-btn so-class-link" onclick="openCompetitionClasses('${attr(row.id)}')" title="Manage Classes">🏇</button>`);
    }
    if (can('show_office.competitions.update')) {
      actions.push(`<button class="action-btn" onclick="openCompetitionEditor('${attr(row.id)}')" title="Edit">✏️</button>`);
    }
    if (can('show_office.competitions.delete')) {
      actions.push(`<button class="action-btn so-delete" onclick="deleteCompetition('${attr(row.id)}')" title="Delete">🗑️</button>`);
    }
    return actions.length ? actions.join('') : '<span class="so-read-only">View only</span>';
  }

  function competitionCard(row) {
    return `<article class="so-competition-card">
      <div class="so-competition-card-head">
        <span><strong>${html(row.competition_name)}</strong><small>${dateLabel(row.competition_date)}</small></span>
        <span class="so-status ${statusClass(row.status)}">${html(row.status)}</span>
      </div>
      <dl class="so-competition-details">
        <div><dt>Venue</dt><dd>${html(row.venue || '—')}</dd></div>
        <div><dt>Organizer</dt><dd>${html(row.organizer || '—')}</dd></div>
        <div><dt>Chief Judge</dt><dd>${html(row.chief_judge || '—')}</dd></div>
        <div><dt>Course Designer</dt><dd>${html(row.course_designer || '—')}</dd></div>
      </dl>
      ${row.notes ? `<p class="so-competition-notes">${html(row.notes)}</p>` : ''}
      <div class="so-actions">${competitionActions(row)}</div>
    </article>`;
  }

  function renderShowOfficeDashboard() {
    const stats = document.getElementById('showOfficeStats');
    const todayList = document.getElementById('showOfficeRecent');
    if (!stats || !todayList) return;
    if (!canView()) {
      stats.innerHTML = stateHtml('Show Office access is not available for this account.');
      todayList.innerHTML = '';
      return;
    }
    if (loading && !loaded) {
      stats.innerHTML = stateHtml('Loading Show Office…');
      todayList.innerHTML = '';
      return;
    }
    if (loadError && !loaded) {
      stats.innerHTML = stateHtml(loadError);
      todayList.innerHTML = '<button class="btn btn-amber" onclick="refreshShowOffice()">Try again</button>';
      return;
    }

    const totals = {...competitionService().dashboardStats(competitions), classes: classTotal, entries: entryTotal};
    const warning = loadError ? loadWarningHtml(loadError, 'refreshShowOffice()') : '';
    stats.innerHTML = warning + [
      ['Total Competitions', totals.competitions],
      ['Total Classes', totals.classes],
      ['Total Entries', totals.entries],
      ["Today's Competitions", totals.today]
    ].map(([label, value]) => `<div class="so-stat"><span>${html(label)}</span><strong>${value}</strong></div>`).join('');

    const today = competitionService().bahrainToday();
    const rows = competitions.filter(row => row.competition_date === today);
    todayList.innerHTML = rows.length ? `<div class="so-recent-list">${rows.map(row => `
      <button class="so-recent-item" onclick="showDashPage('competitions')">
        <span><strong>${html(row.competition_name)}</strong><small>${dateLabel(row.competition_date)} · ${html(row.venue || 'Venue not set')}</small></span>
        <span class="so-status ${statusClass(row.status)}">${html(row.status)}</span>
      </button>`).join('')}</div>` : '<div class="so-empty"><span>📅</span><strong>No competitions today</strong><p>Upcoming competitions remain available from the Competitions page.</p></div>';
  }

  function filteredCompetitions() {
    const query = clean(document.getElementById('competitionSearch')?.value).toLowerCase();
    const status = clean(document.getElementById('competitionStatusFilter')?.value);
    return competitions.filter(row => {
      if (status && row.status !== status) return false;
      if (!query) return true;
      return [row.competition_name, row.competition_date, row.venue, row.organizer,
        row.chief_judge, row.course_designer, row.status, row.notes]
        .some(value => clean(value).toLowerCase().includes(query));
    });
  }

  function renderCompetitions() {
    const target = document.getElementById('competitionTable');
    const count = document.getElementById('competitionCount');
    if (!target || !count) return;
    if (!canViewCompetitions()) {
      count.textContent = '0';
      target.innerHTML = stateHtml('Competition access is not available for this account.');
      return;
    }
    if (loading && !loaded) {
      count.textContent = '…';
      target.innerHTML = stateHtml('Loading competitions…');
      return;
    }
    if (loadError && !loaded) {
      count.textContent = '0';
      target.innerHTML = `${stateHtml(loadError)}<button class="btn btn-amber" onclick="refreshShowOffice()">Try again</button>`;
      return;
    }

    const warning = loadError ? loadWarningHtml(loadError, 'refreshShowOffice()') : '';
    const rows = filteredCompetitions();
    count.textContent = rows.length === competitions.length ? String(competitions.length) : `${rows.length} / ${competitions.length}`;
    if (!rows.length) {
      target.innerHTML = warning + '<div class="so-empty"><span>🏅</span><strong>No matching competitions</strong><p>Create a competition or change the filters.</p></div>';
      return;
    }
    target.innerHTML = `${warning}<div class="so-competition-cards">${rows.map(competitionCard).join('')}</div><div class="so-table-wrap"><table class="so-table"><thead><tr><th>Competition</th><th>Date</th><th>Venue</th><th>Status</th><th>Officials</th><th>Actions</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td><strong>${html(row.competition_name)}</strong><small>${html(row.organizer || 'Organizer not set')}</small></td>
        <td>${dateLabel(row.competition_date)}</td>
        <td>${html(row.venue || '—')}</td>
        <td><span class="so-status ${statusClass(row.status)}">${html(row.status)}</span></td>
        <td><small>Judge: ${html(row.chief_judge || '—')}</small><small>Designer: ${html(row.course_designer || '—')}</small></td>
        <td><div class="so-actions">${competitionActions(row)}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function selectedCompetition() {
    return competitionById(selectedCompetitionId);
  }

  function ensureSelectedCompetition() {
    if (!selectedCompetition() && competitions.length) selectedCompetitionId = String(competitions[0].id);
    return selectedCompetition();
  }

  function filteredClasses() {
    const query = clean(document.getElementById('showOfficeClassSearch')?.value).toLowerCase();
    const type = clean(document.getElementById('showOfficeClassTypeFilter')?.value);
    const jumpOff = clean(document.getElementById('showOfficeClassJumpOffFilter')?.value);
    return classRows.filter(row => {
      if (type && row.competition_type !== type) return false;
      if (jumpOff === 'yes' && !row.jump_off) return false;
      if (jumpOff === 'no' && row.jump_off) return false;
      if (!query) return true;
      return [row.class_number, row.class_name, row.height_cm, row.competition_type, row.notes]
        .some(value => clean(value).toLowerCase().includes(query));
    });
  }

  function classActions(row) {
    const actions = [];
    if (canViewEntries()) {
      actions.push(`<button class="action-btn so-class-link" onclick="openClassEntries('${attr(row.id)}')" title="Manage Entries">👥</button>`);
    }
    if (can('show_office.classes.update')) {
      actions.push(`<button class="action-btn" onclick="openClassEditor('${attr(row.id)}')" title="Edit">✏️</button>`);
    }
    if (can('show_office.classes.delete')) {
      actions.push(`<button class="action-btn so-delete" onclick="deleteShowOfficeClass('${attr(row.id)}')" title="Delete">🗑️</button>`);
    }
    return actions.length ? actions.join('') : '<span class="so-read-only">View only</span>';
  }

  function feeLabel(value) {
    return `${Number(value || 0).toFixed(3)} BD`;
  }

  function classCard(row) {
    return `<article class="so-class-card">
      <div class="so-class-card-head">
        <span><small>Class ${html(row.class_number)} · Order ${html(row.sort_order)}</small><strong>${html(row.class_name)}</strong></span>
        <span class="so-jump-badge ${row.jump_off ? 'is-active' : ''}">${row.jump_off ? 'Jump-Off' : 'No Jump-Off'}</span>
      </div>
      <dl class="so-class-details">
        <div><dt>Height</dt><dd>${row.height_cm ? `${html(row.height_cm)} cm` : '—'}</dd></div>
        <div><dt>Type</dt><dd>${html(row.competition_type)}</dd></div>
        <div><dt>Allowed Time</dt><dd>${row.allowed_time_seconds ? `${html(row.allowed_time_seconds)} sec` : '—'}</dd></div>
        <div><dt>Time Limit</dt><dd>${row.time_limit_seconds ? `${html(row.time_limit_seconds)} sec` : '—'}</dd></div>
        <div><dt>Entry Fee</dt><dd>${feeLabel(row.entry_fee_bd)}</dd></div>
      </dl>
      ${row.notes ? `<p class="so-competition-notes">${html(row.notes)}</p>` : ''}
      <div class="so-actions">${classActions(row)}</div>
    </article>`;
  }

  function renderClassCompetitionSelector() {
    const selector = document.getElementById('showOfficeClassCompetition');
    if (!selector) return;
    ensureSelectedCompetition();
    selector.innerHTML = competitions.length
      ? competitions.map(row => `<option value="${attr(row.id)}">${html(row.competition_name)} — ${html(row.competition_date)}</option>`).join('')
      : '<option value="">No competitions available</option>';
    selector.value = selectedCompetitionId;
    selector.disabled = !competitions.length || classesLoading;
  }

  function renderShowOfficeClasses() {
    const target = document.getElementById('showOfficeClassTable');
    const count = document.getElementById('showOfficeClassCount');
    const createButton = document.getElementById('showOfficeClassCreate');
    if (!target || !count) return;
    renderClassCompetitionSelector();
    if (createButton) createButton.disabled = !competitions.length;
    if (!canViewClasses()) {
      count.textContent = '0';
      target.innerHTML = stateHtml('Class access is not available for this account.', '🏇');
      return;
    }
    if (loading && !loaded) {
      count.textContent = '…';
      target.innerHTML = stateHtml('Loading competitions…', '🏇');
      return;
    }
    if (loadError && !loaded) {
      count.textContent = '0';
      target.innerHTML = `${stateHtml(loadError, '⚠️')}<button class="btn btn-amber" onclick="refreshShowOffice()">Try again</button>`;
      return;
    }
    const competitionWarning = loadError ? loadWarningHtml(loadError, 'refreshShowOffice()') : '';
    if (!competitions.length && loaded) {
      count.textContent = '0';
      target.innerHTML = competitionWarning + '<div class="so-empty"><span>🏆</span><strong>Create a competition first</strong><p>Every class belongs to one competition.</p></div>';
      return;
    }
    if (classesLoading && !classesLoaded) {
      count.textContent = '…';
      target.innerHTML = competitionWarning + stateHtml('Loading classes…', '🏇');
      return;
    }
    if (classesError && !classesLoaded) {
      count.textContent = '0';
      target.innerHTML = `${stateHtml(classesError, '⚠️')}<button class="btn btn-amber" onclick="refreshShowOfficeClasses()">Try again</button>`;
      return;
    }
    if (!classesLoaded) {
      count.textContent = '0';
      target.innerHTML = competitionWarning + stateHtml('Select a competition to load its classes.', '🏇');
      return;
    }

    const warning = competitionWarning
      + (classesError ? loadWarningHtml(classesError, 'refreshShowOfficeClasses()') : '');
    const types = [...new Set(classRows.map(row => row.competition_type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const typeFilter = document.getElementById('showOfficeClassTypeFilter');
    const selectedType = clean(typeFilter?.value);
    if (typeFilter) {
      typeFilter.innerHTML = '<option value="">All types</option>' + types.map(type => `<option value="${attr(type)}">${html(type)}</option>`).join('');
      typeFilter.value = types.includes(selectedType) ? selectedType : '';
    }
    const rows = filteredClasses();
    count.textContent = rows.length === classRows.length ? String(classRows.length) : `${rows.length} / ${classRows.length}`;
    if (!rows.length) {
      target.innerHTML = warning + '<div class="so-empty"><span>🏇</span><strong>No matching classes</strong><p>Create a class or change the filters.</p></div>';
      return;
    }
    target.innerHTML = `${warning}<div class="so-class-cards">${rows.map(classCard).join('')}</div><div class="so-class-table-wrap"><table class="so-table so-class-table"><thead><tr><th>Order</th><th>Class</th><th>Height</th><th>Type</th><th>Timing</th><th>Jump-Off</th><th>Fee</th><th>Actions</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td>${html(row.sort_order)}</td>
        <td><strong>${html(row.class_number)} · ${html(row.class_name)}</strong>${row.notes ? `<small>${html(row.notes)}</small>` : ''}</td>
        <td>${row.height_cm ? `${html(row.height_cm)} cm` : '—'}</td>
        <td>${html(row.competition_type)}</td>
        <td><small>Allowed: ${row.allowed_time_seconds ? `${html(row.allowed_time_seconds)} sec` : '—'}</small><small>Limit: ${row.time_limit_seconds ? `${html(row.time_limit_seconds)} sec` : '—'}</small></td>
        <td><span class="so-jump-badge ${row.jump_off ? 'is-active' : ''}">${row.jump_off ? 'Yes' : 'No'}</span></td>
        <td>${feeLabel(row.entry_fee_bd)}</td>
        <td><div class="so-actions">${classActions(row)}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function entryContextClass(id) {
    return entryContext.find(row => String(row.class_id) === String(id)) || null;
  }

  function entryCompetitions() {
    const rows = [];
    const seen = new Set();
    entryContext.forEach(row => {
      const id = String(row.competition_id);
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({id, competition_name:row.competition_name, competition_date:row.competition_date});
    });
    return rows;
  }

  function renderEntrySelectors() {
    const competitionSelector = document.getElementById('showOfficeEntryCompetition');
    const classSelector = document.getElementById('showOfficeEntryClass');
    const createButton = document.getElementById('showOfficeEntryCreate');
    if (!competitionSelector || !classSelector) return;
    const competitionsForEntries = entryCompetitions();
    if (!competitionsForEntries.some(row => String(row.id) === selectedEntryCompetitionId)) {
      selectedEntryCompetitionId = competitionsForEntries[0]?.id || '';
    }
    const classes = entryContext.filter(row => String(row.competition_id) === selectedEntryCompetitionId);
    if (!classes.some(row => String(row.class_id) === selectedEntryClassId)) {
      selectedEntryClassId = classes[0] ? String(classes[0].class_id) : '';
      entriesLoaded = false;
      setEntries([]);
    }
    competitionSelector.innerHTML = competitionsForEntries.length
      ? competitionsForEntries.map(row => `<option value="${attr(row.id)}">${html(row.competition_name)} — ${html(row.competition_date)}</option>`).join('')
      : '<option value="">No competitions with classes</option>';
    competitionSelector.value = selectedEntryCompetitionId;
    competitionSelector.disabled = !competitionsForEntries.length || entriesLoading;
    classSelector.innerHTML = classes.length
      ? classes.map(row => `<option value="${attr(row.class_id)}">${html(row.class_number)} · ${html(row.class_name)}</option>`).join('')
      : '<option value="">No classes available</option>';
    classSelector.value = selectedEntryClassId;
    classSelector.disabled = !classes.length || entriesLoading;
    if (createButton) createButton.disabled = !selectedEntryClassId || entriesLoading;
  }

  function entryActions(row) {
    const actions = [];
    if (can('show_office.entries.update')) {
      actions.push(`<button class="action-btn" onclick="openEntryEditor('${attr(row.id)}')" title="Edit">✏️</button>`);
    }
    if (can('show_office.entries.delete')) {
      actions.push(`<button class="action-btn so-delete" onclick="deleteShowOfficeEntry('${attr(row.id)}')" title="Delete">🗑️</button>`);
    }
    return actions.length ? actions.join('') : '<span class="so-read-only">View only</span>';
  }

  function entryCard(row) {
    return `<article class="so-entry-card">
      <div class="so-entry-card-head"><span class="so-start-number">${html(row.start_number)}</span><span><strong>${html(row.rider_name)}</strong><small>${html(row.horse_name)}</small></span></div>
      <div class="so-entry-stable">${html(row.stable_name || 'Independent entry')}</div>
      <div class="so-actions">${entryActions(row)}</div>
    </article>`;
  }

  function renderShowOfficeEntries() {
    const target = document.getElementById('showOfficeEntryTable');
    const count = document.getElementById('showOfficeEntryCount');
    const pagination = document.getElementById('showOfficeEntryPagination');
    if (!target || !count) return;
    renderEntrySelectors();
    if (!canViewEntries()) {
      count.textContent = '0';
      target.innerHTML = stateHtml('Entry access is not available for this account.', '👥');
      if (pagination) pagination.innerHTML = '';
      return;
    }
    if (!entryContext.length && loading) {
      count.textContent = '…';
      target.innerHTML = stateHtml('Loading competition classes…', '👥');
      return;
    }
    if (!entryContext.length) {
      count.textContent = '0';
      target.innerHTML = '<div class="so-empty"><span>🏇</span><strong>Create a class first</strong><p>Every entry belongs to one competition class.</p></div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }
    if (entriesLoading && !entriesLoaded) {
      count.textContent = '…';
      target.innerHTML = stateHtml('Loading entries…', '👥');
      return;
    }
    if (entriesError && !entriesLoaded) {
      count.textContent = '0';
      target.innerHTML = `${stateHtml(entriesError, '⚠️')}<button class="btn btn-amber" onclick="refreshShowOfficeEntries()">Try again</button>`;
      return;
    }
    if (!entriesLoaded) {
      count.textContent = '0';
      target.innerHTML = stateHtml('Select a class to load its entries.', '👥');
      return;
    }
    const warning = entriesError ? loadWarningHtml(entriesError, 'refreshShowOfficeEntries()') : '';
    const from = entryPageTotal ? entryPage * ENTRY_PAGE_SIZE + 1 : 0;
    const to = Math.min((entryPage + 1) * ENTRY_PAGE_SIZE, entryPageTotal);
    count.textContent = entryPageTotal ? `${from}–${to} / ${entryPageTotal}` : '0';
    if (!entryRows.length) {
      target.innerHTML = warning + '<div class="so-empty"><span>👥</span><strong>No matching entries</strong><p>Add an entry or change the search.</p></div>';
    } else {
      target.innerHTML = `${warning}<div class="so-entry-cards">${entryRows.map(entryCard).join('')}</div><div class="so-entry-table-wrap"><table class="so-table so-entry-table"><thead><tr><th>Start No.</th><th>Rider</th><th>Horse</th><th>Stable / Club</th><th>Actions</th></tr></thead><tbody>${entryRows.map(row => `
        <tr><td><span class="so-start-number">${html(row.start_number)}</span></td><td><strong>${html(row.rider_name)}</strong></td><td>${html(row.horse_name)}</td><td>${html(row.stable_name || '—')}</td><td><div class="so-actions">${entryActions(row)}</div></td></tr>`).join('')}</tbody></table></div>`;
    }
    if (pagination) {
      const pages = Math.max(1, Math.ceil(entryPageTotal / ENTRY_PAGE_SIZE));
      pagination.innerHTML = entryPageTotal > ENTRY_PAGE_SIZE
        ? `<button class="action-btn" ${entryPage<=0?'disabled':''} onclick="changeShowOfficeEntryPage(-1)">Previous</button><span>Page ${entryPage+1} of ${pages}</span><button class="action-btn" ${entryPage+1>=pages?'disabled':''} onclick="changeShowOfficeEntryPage(1)">Next</button>`
        : '';
    }
  }

  function render() {
    renderShowOfficeDashboard();
    renderCompetitions();
    renderShowOfficeClasses();
    renderShowOfficeEntries();
    document.querySelectorAll('[data-show-office-permission]').forEach(node => {
      node.style.display = can(node.dataset.showOfficePermission) ? '' : 'none';
    });
  }

  async function load(options = {}) {
    if (!canView()) {
      clear();
      return [];
    }
    if (loadPromise && !options.force) return loadPromise;
    loading = true;
    loadError = '';
    render();
    loadPromise = (async () => {
      try {
        const [competitionRows, totalClasses, totalEntries, contextRows] = await Promise.all([
          canViewCompetitions() ? competitionService().list()
            : canViewClasses() ? competitionService().listClassDirectory() : Promise.resolve([]),
          canViewClasses() ? classService().countAll() : Promise.resolve(0),
          canViewEntries() ? entryService().countAll() : Promise.resolve(0),
          canViewEntries() ? entryService().context() : Promise.resolve([])
        ]);
        entryContext = contextRows;
        const limitedCompetitions = competitionRows.length ? competitionRows : entryCompetitions().map(row => ({
          id:Number(row.id), competition_name:row.competition_name,
          competition_date:row.competition_date, status:'Draft'
        }));
        setCompetitions(limitedCompetitions);
        classTotal = totalClasses;
        entryTotal = totalEntries;
        loaded = true;
        return competitions;
      } catch (error) {
        loadError = friendlyError(error);
        if (options.throwOnError) throw error;
        return [];
      } finally {
        loading = false;
        loadPromise = null;
        render();
      }
    })();
    return loadPromise;
  }

  async function loadClassesForCompetition(id, options = {}) {
    if (!canViewClasses()) return [];
    const competition = competitionById(id);
    if (!competition) {
      classLoadRequest += 1;
      setClasses([]);
      selectedCompetitionId = '';
      classesLoaded = false;
      render();
      return [];
    }
    const nextId = String(competition.id);
    if (classesPromise && selectedCompetitionId === nextId && !options.force) return classesPromise;
    if (selectedCompetitionId !== nextId) {
      setClasses([]);
      classesLoaded = false;
    }
    selectedCompetitionId = nextId;
    const request = ++classLoadRequest;
    classesLoading = true;
    classesError = '';
    render();
    classesPromise = (async () => {
      try {
        const rows = await classService().listForCompetition(nextId);
        if (request !== classLoadRequest) return [];
        setClasses(rows);
        classesLoaded = true;
        return classRows;
      } catch (error) {
        if (request !== classLoadRequest) return [];
        classesError = friendlyError(error);
        if (options.throwOnError) throw error;
        return [];
      } finally {
        if (request === classLoadRequest) {
          classesLoading = false;
          classesPromise = null;
          render();
        }
      }
    })();
    return classesPromise;
  }

  async function loadEntriesForClass(id, options = {}) {
    if (!canViewEntries()) return [];
    const contextRow = entryContextClass(id);
    if (!contextRow) {
      entryLoadRequest += 1;
      setEntries([]);
      selectedEntryClassId = '';
      entriesLoaded = false;
      render();
      return [];
    }
    const nextId = String(contextRow.class_id);
    if (entriesPromise && selectedEntryClassId === nextId && !options.force) return entriesPromise;
    if (selectedEntryClassId !== nextId) {
      setEntries([]);
      entriesLoaded = false;
      entryPage = 0;
    }
    selectedEntryCompetitionId = String(contextRow.competition_id);
    selectedEntryClassId = nextId;
    const request = ++entryLoadRequest;
    entriesLoading = true;
    entriesError = '';
    render();
    entriesPromise = (async () => {
      try {
        const result = await entryService().page(nextId, {
          search: formValue('showOfficeEntrySearch'), limit: ENTRY_PAGE_SIZE,
          offset: entryPage * ENTRY_PAGE_SIZE
        });
        if (request !== entryLoadRequest) return [];
        setEntries(result.rows);
        entryPageTotal = result.total;
        entriesLoaded = true;
        return entryRows;
      } catch (error) {
        if (request !== entryLoadRequest) return [];
        entriesError = friendlyError(error);
        if (options.throwOnError) throw error;
        return [];
      } finally {
        if (request === entryLoadRequest) {
          entriesLoading = false;
          entriesPromise = null;
          render();
        }
      }
    })();
    return entriesPromise;
  }

  function clear() {
    competitions = [];
    classRows = [];
    classTotal = 0;
    entryRows = [];
    entryContext = [];
    entryTotal = 0;
    entryPageTotal = 0;
    selectedCompetitionId = '';
    selectedEntryCompetitionId = '';
    selectedEntryClassId = '';
    loading = false;
    loaded = false;
    loadPromise = null;
    loadError = '';
    classesLoading = false;
    classesLoaded = false;
    classesPromise = null;
    classesError = '';
    classLoadRequest += 1;
    entriesLoading = false;
    entriesLoaded = false;
    entriesPromise = null;
    entriesError = '';
    entryLoadRequest += 1;
    entryPage = 0;
    entryDirectory = {riders:[], horses:[], stables:[], core_horses:[]};
    if (window.CCE.store) {
      window.CCE.store.set('showOfficeCompetitions', []);
      window.CCE.store.set('showOfficeClasses', []);
      window.CCE.store.set('showOfficeEntries', []);
    }
    render();
  }

  function formValue(id) {
    return document.getElementById(id)?.value || '';
  }

  window.openCompetitionEditor = function openCompetitionEditor(id = '') {
    const row = id ? competitionById(id) : null;
    const permission = row ? 'show_office.competitions.update' : 'show_office.competitions.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const statuses = competitionService().STATUSES.map(status => `<option value="${attr(status)}" ${(row?.status || 'Draft') === status ? 'selected' : ''}>${html(status)}</option>`).join('');
    window.openModal(row ? 'Edit Competition' : 'New Competition', `
      <div class="so-modal-intro"><span>🏆</span><div><strong>${row ? 'Update competition details' : 'Create a competition'}</strong><small>Classes are managed inside each competition.</small></div></div>
      <form id="showOfficeCompetitionForm" onsubmit="event.preventDefault();saveCompetition('${attr(row?.id || '')}')">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1"><label for="so-name">Competition Name *</label><input id="so-name" maxlength="180" required value="${attr(row?.competition_name || '')}" placeholder="Example: CCE Summer Cup 2026"></div>
          <div class="form-group"><label for="so-date">Date *</label><input id="so-date" required type="date" value="${attr(row?.competition_date || competitionService().bahrainToday())}"></div>
          <div class="form-group"><label for="so-status">Status</label><select id="so-status">${statuses}</select></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-venue">Venue</label><input id="so-venue" maxlength="180" value="${attr(row?.venue || '')}" placeholder="Competition venue"></div>
          <div class="form-group"><label for="so-organizer">Organizer</label><input id="so-organizer" maxlength="180" value="${attr(row?.organizer || '')}"></div>
          <div class="form-group"><label for="so-judge">Chief Judge</label><input id="so-judge" maxlength="180" value="${attr(row?.chief_judge || '')}"></div>
          <div class="form-group"><label for="so-designer">Course Designer</label><input id="so-designer" maxlength="180" value="${attr(row?.course_designer || '')}"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-notes">Notes</label><textarea id="so-notes" rows="4" maxlength="4000">${html(row?.notes || '')}</textarea></div>
        </div>
        <div id="so-form-error" class="so-form-error" role="alert"></div>
        <div class="btn-row"><button class="btn btn-amber" id="so-save" type="submit">${row ? 'Save Changes' : 'Create Competition'}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()" type="button">Cancel</button></div>
      </form>`);
    window.setTimeout(() => document.getElementById('so-name')?.focus(), 0);
  };

  window.saveCompetition = async function saveCompetition(id = '') {
    const existing = id ? competitionById(id) : null;
    const permission = existing ? 'show_office.competitions.update' : 'show_office.competitions.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const button = document.getElementById('so-save');
    const error = document.getElementById('so-form-error');
    const payload = {
      competition_name: formValue('so-name'), competition_date: formValue('so-date'), venue: formValue('so-venue'),
      organizer: formValue('so-organizer'), chief_judge: formValue('so-judge'), course_designer: formValue('so-designer'),
      status: formValue('so-status'), notes: formValue('so-notes')
    };
    try {
      if (error) error.style.display = 'none';
      if (button) { button.disabled = true; button.textContent = 'Saving…'; }
      const saved = existing
        ? await competitionService().update(existing.id, payload, existing)
        : await competitionService().create(payload);
      setCompetitions(existing
        ? competitions.map(row => String(row.id) === String(saved.id) ? saved : row)
        : [...competitions, saved]);
      loaded = true;
      window.closeModal();
      window.showDashPage('competitions', document.getElementById('nav-competitions'));
      render();
    } catch (saveError) {
      if (error) { error.textContent = friendlyError(saveError); error.style.display = 'block'; }
      if (button) { button.disabled = false; button.textContent = existing ? 'Save Changes' : 'Create Competition'; }
    }
  };

  window.deleteCompetition = async function deleteCompetition(id) {
    const row = competitionById(id);
    if (!row || !can('show_office.competitions.delete')) return reportError('Show Office', new Error('Permission denied'));
    if (!window.confirm(`Delete “${row.competition_name}” on ${dateLabel(row.competition_date)}?\n\nThis action cannot be undone.`)) return;
    try {
      await competitionService().remove(row.id, row);
      setCompetitions(competitions.filter(item => String(item.id) !== String(row.id)));
      render();
    } catch (error) {
      reportError('Delete competition', error);
    }
  };

  window.openCompetitionClasses = async function openCompetitionClasses(id) {
    if (!canViewClasses()) return reportError('Show Office', new Error('Permission denied'));
    selectedCompetitionId = String(id);
    window.showDashPage('show-office-classes', document.getElementById('nav-show-office-classes'));
    await loadClassesForCompetition(selectedCompetitionId);
  };

  window.selectShowOfficeCompetition = function selectShowOfficeCompetition(id) {
    return loadClassesForCompetition(id);
  };

  window.openClassEditor = function openClassEditor(id = '') {
    const row = id ? classById(id) : null;
    const permission = row ? 'show_office.classes.update' : 'show_office.classes.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    if (!competitions.length) return reportError('Show Office', new Error('Create a competition before adding classes.'));
    const competitionId = String(row?.competition_id || ensureSelectedCompetition()?.id || '');
    const nextOrder = classRows.reduce((maximum, item) => Math.max(maximum, Number(item.sort_order || 0)), 0) + 1;
    const competitionOptions = competitions.map(item => `<option value="${attr(item.id)}" ${String(item.id) === competitionId ? 'selected' : ''}>${html(item.competition_name)} — ${html(item.competition_date)}</option>`).join('');
    const typeSuggestions = [...new Set(classRows.map(item => item.competition_type).filter(Boolean))]
      .map(type => `<option value="${attr(type)}"></option>`).join('');
    window.openModal(row ? 'Edit Class' : 'New Class', `
      <div class="so-modal-intro"><span>🏇</span><div><strong>${row ? 'Update class details' : 'Add a competition class'}</strong><small>Timing is entered in seconds and height in centimetres.</small></div></div>
      <form id="showOfficeClassForm" onsubmit="event.preventDefault();saveShowOfficeClass('${attr(row?.id || '')}')">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1"><label for="so-class-competition">Competition *</label><select id="so-class-competition" required>${competitionOptions}</select></div>
          <div class="form-group"><label for="so-class-number">Class Number *</label><input id="so-class-number" maxlength="30" required value="${attr(row?.class_number || '')}" placeholder="Example: 1A"></div>
          <div class="form-group"><label for="so-class-order">Display Order *</label><input id="so-class-order" min="1" step="1" type="number" required value="${attr(row?.sort_order || nextOrder)}"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-class-name">Class Name *</label><input id="so-class-name" maxlength="180" required value="${attr(row?.class_name || '')}" placeholder="Example: Open Jumping 100 cm"></div>
          <div class="form-group"><label for="so-class-height">Height (cm)</label><input id="so-class-height" min="1" step="1" type="number" value="${attr(row?.height_cm || '')}"></div>
          <div class="form-group"><label for="so-class-type">Competition Type *</label><input id="so-class-type" list="so-class-types" maxlength="120" required value="${attr(row?.competition_type || '')}" placeholder="Example: Table A"><datalist id="so-class-types">${typeSuggestions}</datalist></div>
          <div class="form-group"><label for="so-class-allowed">Allowed Time (seconds)</label><input id="so-class-allowed" min="1" step="1" type="number" value="${attr(row?.allowed_time_seconds || '')}"></div>
          <div class="form-group"><label for="so-class-limit">Time Limit (seconds)</label><input id="so-class-limit" min="1" step="1" type="number" value="${attr(row?.time_limit_seconds || '')}"></div>
          <div class="form-group"><label for="so-class-fee">Entry Fee (BD)</label><input id="so-class-fee" min="0" max="9999999.999" step="0.001" type="number" value="${attr(row?.entry_fee_bd ?? 0)}"></div>
          <div class="form-group so-checkbox-group"><label for="so-class-jump"><input id="so-class-jump" type="checkbox" ${row?.jump_off ? 'checked' : ''}> Jump-Off</label></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-class-notes">Notes</label><textarea id="so-class-notes" rows="4" maxlength="4000">${html(row?.notes || '')}</textarea></div>
        </div>
        <div id="so-class-form-error" class="so-form-error" role="alert"></div>
        <div class="btn-row"><button class="btn btn-amber" id="so-class-save" type="submit">${row ? 'Save Changes' : 'Create Class'}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()" type="button">Cancel</button></div>
      </form>`);
    window.setTimeout(() => document.getElementById('so-class-number')?.focus(), 0);
  };

  window.saveShowOfficeClass = async function saveShowOfficeClass(id = '') {
    const existing = id ? classById(id) : null;
    const permission = existing ? 'show_office.classes.update' : 'show_office.classes.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const button = document.getElementById('so-class-save');
    const error = document.getElementById('so-class-form-error');
    const payload = {
      competition_id: formValue('so-class-competition'), class_number: formValue('so-class-number'),
      sort_order: formValue('so-class-order'), class_name: formValue('so-class-name'),
      height_cm: formValue('so-class-height'), competition_type: formValue('so-class-type'),
      allowed_time_seconds: formValue('so-class-allowed'), time_limit_seconds: formValue('so-class-limit'),
      jump_off: Boolean(document.getElementById('so-class-jump')?.checked),
      entry_fee_bd: formValue('so-class-fee'), notes: formValue('so-class-notes')
    };
    try {
      if (error) error.style.display = 'none';
      if (button) { button.disabled = true; button.textContent = 'Saving…'; }
      const saved = existing
        ? await classService().update(existing.id, payload, existing)
        : await classService().create(payload);
      if (existing) {
        if (String(saved.competition_id) === selectedCompetitionId) {
          setClasses(classRows.map(row => String(row.id) === String(saved.id) ? saved : row));
        } else {
          setClasses(classRows.filter(row => String(row.id) !== String(saved.id)));
        }
      } else {
        classTotal += 1;
        if (String(saved.competition_id) === selectedCompetitionId) setClasses([...classRows, saved]);
      }
      classesLoaded = true;
      window.closeModal();
      render();
    } catch (saveError) {
      if (error) { error.textContent = friendlyError(saveError); error.style.display = 'block'; }
      if (button) { button.disabled = false; button.textContent = existing ? 'Save Changes' : 'Create Class'; }
    }
  };

  window.deleteShowOfficeClass = async function deleteShowOfficeClass(id) {
    const row = classById(id);
    if (!row || !can('show_office.classes.delete')) return reportError('Show Office', new Error('Permission denied'));
    if (!window.confirm(`Delete class “${row.class_number} · ${row.class_name}”?\n\nThis action cannot be undone.`)) return;
    try {
      await classService().remove(row.id, row);
      setClasses(classRows.filter(item => String(item.id) !== String(row.id)));
      classTotal = Math.max(0, classTotal - 1);
      render();
    } catch (error) {
      reportError('Delete class', error);
    }
  };

  function entryDirectoryLabel(type, row) {
    if (type === 'rider') return `${row.rider_name} · R-${row.id}`;
    if (type === 'stable') return `${row.stable_name} · S-${row.id}`;
    if (row.coreOnly) return `${row.horse_name}${row.stable_no ? ` · Stable #${row.stable_no}` : ''} · CORE-${row.id}`;
    return `${row.horse_name} · H-${row.id}`;
  }

  function registerEntryDirectory(value, current = null) {
    entryDirectory = value || {riders:[], horses:[], stables:[], core_horses:[]};
    entryDirectoryLabels.rider = new Map();
    entryDirectoryLabels.horse = new Map();
    entryDirectoryLabels.stable = new Map();
    entryDirectory.riders.forEach(row => entryDirectoryLabels.rider.set(entryDirectoryLabel('rider', row), {rider_id:row.id}));
    entryDirectory.horses.forEach(row => entryDirectoryLabels.horse.set(entryDirectoryLabel('horse', row), {horse_id:row.id}));
    entryDirectory.core_horses.forEach(row => {
      const item = {...row, coreOnly:true};
      entryDirectoryLabels.horse.set(entryDirectoryLabel('horse', item), {core_horse_id:row.id});
    });
    entryDirectory.stables.forEach(row => entryDirectoryLabels.stable.set(entryDirectoryLabel('stable', row), {stable_id:row.id}));
    if (current) {
      entryDirectoryLabels.rider.set(`${current.rider_name} · R-${current.rider_id}`, {rider_id:current.rider_id});
      entryDirectoryLabels.horse.set(`${current.horse_name} · H-${current.horse_id}`, {horse_id:current.horse_id});
      if (current.stable_id) entryDirectoryLabels.stable.set(`${current.stable_name} · S-${current.stable_id}`, {stable_id:current.stable_id});
    }
  }

  function renderEntryDatalists() {
    const riderList = document.getElementById('so-entry-rider-list');
    const horseList = document.getElementById('so-entry-horse-list');
    const stableList = document.getElementById('so-entry-stable-list');
    if (riderList) riderList.innerHTML = [...entryDirectoryLabels.rider.keys()].map(label => `<option value="${attr(label)}"></option>`).join('');
    if (horseList) horseList.innerHTML = [...entryDirectoryLabels.horse.keys()].map(label => `<option value="${attr(label)}"></option>`).join('');
    if (stableList) stableList.innerHTML = [...entryDirectoryLabels.stable.keys()].map(label => `<option value="${attr(label)}"></option>`).join('');
  }

  window.queueEntryDirectorySearch = function queueEntryDirectorySearch(value) {
    const query = clean(value).replace(/\s·\s(?:R|H|S|CORE)-.*$/, '');
    window.clearTimeout(entryDirectoryTimer);
    entryDirectoryTimer = window.setTimeout(async () => {
      try {
        const current = window._soEntryEditor || null;
        registerEntryDirectory(await entryService().directory(query), current);
        renderEntryDatalists();
      } catch (error) {
        const target = document.getElementById('so-entry-directory-note');
        if (target) target.textContent = friendlyError(error);
      }
    }, 220);
  };

  function entryDirectoryChoice(type, value) {
    const raw = clean(value);
    const selected = entryDirectoryLabels[type].get(raw);
    if (selected) return selected;
    if (type === 'stable') return raw ? {stable_name:raw} : {stable_id:null, stable_name:null};
    return type === 'rider' ? {rider_name:raw} : {horse_name:raw};
  }

  window.openEntryEditor = async function openEntryEditor(id = '') {
    const row = id ? entryById(id) : null;
    const permission = row ? 'show_office.entries.update' : 'show_office.entries.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const contextRow = entryContextClass(row?.class_id || selectedEntryClassId);
    if (!contextRow) return reportError('Show Office', new Error('Select a competition class before adding entries.'));
    try {
      registerEntryDirectory(await entryService().directory(''), row);
    } catch (error) {
      return reportError('Load entry directory', error);
    }
    window._soEntryEditor = row;
    const riderValue = row ? `${row.rider_name} · R-${row.rider_id}` : '';
    const horseValue = row ? `${row.horse_name} · H-${row.horse_id}` : '';
    const stableValue = row?.stable_id ? `${row.stable_name} · S-${row.stable_id}` : '';
    window.openModal(row ? 'Edit Entry' : 'New Entry', `
      <div class="so-modal-intro"><span>👥</span><div><strong>${row ? 'Update competition entry' : 'Register rider and horse'}</strong><small>${html(contextRow.competition_name)} · Class ${html(contextRow.class_number)}</small></div></div>
      <form id="showOfficeEntryForm" onsubmit="event.preventDefault();saveShowOfficeEntry('${attr(row?.id || '')}')">
        <div class="form-grid">
          <div class="form-group"><label for="so-entry-start">Start Number *</label><input id="so-entry-start" min="1" max="2147483647" step="1" type="number" required value="${attr(row?.start_number || '')}" placeholder="Example: 12"></div>
          <div class="form-group"><label>Competition Class</label><input disabled value="${attr(`${contextRow.class_number} · ${contextRow.class_name}`)}"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-entry-rider">Rider *</label><input autocomplete="off" id="so-entry-rider" list="so-entry-rider-list" maxlength="220" oninput="queueEntryDirectorySearch(this.value)" required value="${attr(riderValue)}" placeholder="Search or type a new permanent rider"><datalist id="so-entry-rider-list"></datalist></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-entry-horse">Horse *</label><input autocomplete="off" id="so-entry-horse" list="so-entry-horse-list" maxlength="240" oninput="queueEntryDirectorySearch(this.value)" required value="${attr(horseValue)}" placeholder="Search stable horses or type a new competition horse"><datalist id="so-entry-horse-list"></datalist></div>
          <div class="form-group" style="grid-column:1/-1"><label for="so-entry-stable">Stable / Club</label><input autocomplete="off" id="so-entry-stable" list="so-entry-stable-list" maxlength="220" oninput="queueEntryDirectorySearch(this.value)" value="${attr(stableValue)}" placeholder="Optional — search or create"><datalist id="so-entry-stable-list"></datalist></div>
        </div>
        <div class="so-entry-help" id="so-entry-directory-note">Selecting a suggestion reuses the existing record. Plain text creates a permanent Show Office record; no Guest Rider is created.</div>
        <div id="so-entry-form-error" class="so-form-error" role="alert"></div>
        <div class="btn-row"><button class="btn btn-amber" id="so-entry-save" type="submit">${row ? 'Save Changes' : 'Create Entry'}</button><button class="btn" style="background:#f0f0f0;color:var(--navy)" onclick="closeModal()" type="button">Cancel</button></div>
      </form>`);
    renderEntryDatalists();
    window.setTimeout(() => document.getElementById('so-entry-start')?.focus(), 0);
  };

  window.saveShowOfficeEntry = async function saveShowOfficeEntry(id = '') {
    const existing = id ? entryById(id) : null;
    const permission = existing ? 'show_office.entries.update' : 'show_office.entries.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const button = document.getElementById('so-entry-save');
    const error = document.getElementById('so-entry-form-error');
    const payload = {
      class_id: selectedEntryClassId,
      start_number: formValue('so-entry-start'),
      ...entryDirectoryChoice('rider', formValue('so-entry-rider')),
      ...entryDirectoryChoice('horse', formValue('so-entry-horse')),
      ...entryDirectoryChoice('stable', formValue('so-entry-stable'))
    };
    try {
      if (error) error.style.display = 'none';
      if (button) { button.disabled = true; button.textContent = 'Saving…'; }
      await entryService().save(existing?.id || '', payload);
      if (!existing) entryTotal += 1;
      window._soEntryEditor = null;
      window.closeModal();
      await loadEntriesForClass(selectedEntryClassId, {force:true});
    } catch (saveError) {
      if (error) { error.textContent = friendlyError(saveError); error.style.display = 'block'; }
      if (button) { button.disabled = false; button.textContent = existing ? 'Save Changes' : 'Create Entry'; }
    }
  };

  window.deleteShowOfficeEntry = async function deleteShowOfficeEntry(id) {
    const row = entryById(id);
    if (!row || !can('show_office.entries.delete')) return reportError('Show Office', new Error('Permission denied'));
    if (!window.confirm(`Delete start number ${row.start_number}: ${row.rider_name} / ${row.horse_name}?\n\nThis action cannot be undone.`)) return;
    try {
      await entryService().remove(row.id, row);
      entryTotal = Math.max(0, entryTotal - 1);
      if (entryRows.length === 1 && entryPage > 0) entryPage -= 1;
      await loadEntriesForClass(selectedEntryClassId, {force:true});
    } catch (error) {
      reportError('Delete entry', error);
    }
  };

  window.openClassEntries = async function openClassEntries(id) {
    if (!canViewEntries()) return reportError('Show Office', new Error('Permission denied'));
    const row = entryContextClass(id);
    if (!row) return reportError('Show Office', new Error('Entry context is not available. Refresh Show Office and try again.'));
    selectedEntryCompetitionId = String(row.competition_id);
    selectedEntryClassId = String(row.class_id);
    entryPage = 0;
    window.showDashPage('show-office-entries', document.getElementById('nav-show-office-entries'));
    await loadEntriesForClass(selectedEntryClassId, {force:true});
  };

  window.selectShowOfficeEntryCompetition = function selectShowOfficeEntryCompetition(id) {
    selectedEntryCompetitionId = String(id || '');
    selectedEntryClassId = '';
    entryPage = 0;
    entriesLoaded = false;
    render();
    return selectedEntryClassId ? loadEntriesForClass(selectedEntryClassId) : Promise.resolve([]);
  };

  window.selectShowOfficeEntryClass = function selectShowOfficeEntryClass(id) {
    entryPage = 0;
    return loadEntriesForClass(id, {force:true});
  };

  window.searchShowOfficeEntries = function searchShowOfficeEntries() {
    window.clearTimeout(entrySearchTimer);
    entrySearchTimer = window.setTimeout(() => {
      entryPage = 0;
      if (selectedEntryClassId) loadEntriesForClass(selectedEntryClassId, {force:true});
    }, 250);
  };

  window.changeShowOfficeEntryPage = function changeShowOfficeEntryPage(direction) {
    const pages = Math.max(1, Math.ceil(entryPageTotal / ENTRY_PAGE_SIZE));
    entryPage = Math.max(0, Math.min(entryPage + Number(direction || 0), pages - 1));
    return loadEntriesForClass(selectedEntryClassId, {force:true});
  };

  window.renderShowOfficeDashboard = renderShowOfficeDashboard;
  window.renderCompetitions = renderCompetitions;
  window.renderShowOfficeClasses = renderShowOfficeClasses;
  window.renderShowOfficeEntries = renderShowOfficeEntries;
  window.refreshShowOffice = () => load({force: true});
  window.refreshShowOfficeClasses = () => selectedCompetitionId
    ? loadClassesForCompetition(selectedCompetitionId, {force: true})
    : Promise.resolve([]);
  window.refreshShowOfficeEntries = () => selectedEntryClassId
    ? loadEntriesForClass(selectedEntryClassId, {force:true}) : Promise.resolve([]);
  showOffice.load = load;
  showOffice.open = async page => {
    render();
    if ((!loaded || loadError) && !loading && canView()) await load();
    if (page === 'show-office-classes' && canViewClasses()) {
      const competition = ensureSelectedCompetition();
      if (competition && (!classesLoaded || classesError)) await loadClassesForCompetition(competition.id);
    }
    if (page === 'show-office-entries' && canViewEntries()) {
      renderEntrySelectors();
      if (selectedEntryClassId && (!entriesLoaded || entriesError)) {
        await loadEntriesForClass(selectedEntryClassId);
      }
    }
  };
  showOffice.clear = clear;
  showOffice.render = render;
  showOffice.getCompetitions = () => competitions.slice();
  showOffice.getClasses = () => classRows.slice();
  showOffice.getClassTotal = () => classTotal;
  showOffice.getEntries = () => entryRows.slice();
  showOffice.getEntryTotal = () => entryTotal;
  // Keep remote-main localStorage data untouched for compatibility/recovery; it is no longer an active data source.
  showOffice.legacyStorageKey = LEGACY_STORAGE_KEY;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once: true});
  else render();
})();
