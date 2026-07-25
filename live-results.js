// Show Office Sprint 5 Live Results Board controller.
// Read-only view of the same provisional ranking Judge Panel computes server-side.
// Data refreshes when the page is opened and on manual Refresh only — no background polling.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const PAGE_ID = 'page-show-office-results';
  let contextRows = [];
  let boardData = null;
  let selectedCompetitionId = '';
  let selectedClassId = '';
  let loading = false;
  let loaded = false;
  let loadError = '';
  let lastUpdatedAt = null;
  let tvMode = false;
  let requestId = 0;

  const service = () => showOffice.judgingService;
  const clean = value => String(value == null ? '' : value).trim();
  const html = value => typeof window.esc === 'function'
    ? window.esc(value)
    : clean(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const attr = value => typeof window.escAttr === 'function' ? window.escAttr(value) : html(value);
  const can = permission => typeof window.canUser === 'function' && window.canUser(permission);
  const canView = () => can('show_office.view') || can('show_office.results.view')
    || can('show_office.judging.view') || can('show_office.judging.score')
    || can('show_office.judging.finalize') || can('show_office.judging.reopen');

  function friendlyError(error) {
    const message = String(error?.message || error || 'Unexpected error');
    if (/permission denied|row-level security|42501/i.test(message)) {
      return 'You do not have permission to view the Live Results board.';
    }
    return typeof window.userSafeError === 'function' ? window.userSafeError(error) : message;
  }

  function stateHtml(message, icon = '📊') {
    return `<div class="so-empty"><span>${icon}</span><strong>${html(message)}</strong></div>`;
  }

  function competitionRows() {
    const seen = new Set();
    return contextRows.filter(row => {
      const key = String(row.competition_id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function classesForCompetition(id) {
    return contextRows.filter(row => String(row.competition_id) === String(id));
  }

  function ensureSelection() {
    if (!contextRows.length) {
      selectedCompetitionId = '';
      selectedClassId = '';
      boardData = null;
      return;
    }
    if (!contextRows.some(row => String(row.competition_id) === String(selectedCompetitionId))) {
      const preferred = competitionRows().find(row => row.competition_status === 'Running') || competitionRows()[0];
      selectedCompetitionId = String(preferred.competition_id);
    }
    const classes = classesForCompetition(selectedCompetitionId);
    if (!classes.some(row => String(row.class_id) === String(selectedClassId))) {
      const preferred = classes.find(row => row.judging_status === 'Running')
        || classes.find(row => row.judging_status === 'Finalized') || classes[0];
      selectedClassId = preferred ? String(preferred.class_id) : '';
      boardData = null;
    }
  }

  function renderSelectors() {
    const competitionSelect = document.getElementById('showOfficeResultsCompetition');
    const classSelect = document.getElementById('showOfficeResultsClass');
    if (!competitionSelect || !classSelect) return;
    ensureSelection();
    const competitions = competitionRows();
    competitionSelect.innerHTML = competitions.length
      ? competitions.map(row => `<option value="${attr(row.competition_id)}" ${String(row.competition_id) === selectedCompetitionId ? 'selected' : ''}>${html(row.competition_name)} · ${html(row.competition_date)} · ${html(row.competition_status)}</option>`).join('')
      : '<option value="">No competitions yet</option>';
    const classes = classesForCompetition(selectedCompetitionId);
    classSelect.innerHTML = classes.length
      ? classes.map(row => `<option value="${attr(row.class_id)}" ${String(row.class_id) === selectedClassId ? 'selected' : ''}>${html(row.class_number)} — ${html(row.class_name)} · ${html(row.judging_status)}</option>`).join('')
      : '<option value="">No classes in this competition</option>';
    competitionSelect.disabled = loading || !competitions.length;
    classSelect.disabled = loading || !classes.length;
  }

  function scoreLabel(score) {
    if (!score) return 'Not scored';
    if (score.did_not_start) return 'DNS';
    if (score.eliminated) return 'Eliminated';
    if (score.retired) return 'Retired';
    return `${Number(score.faults).toFixed(2).replace(/\.00$/, '')} faults · ${service().millisecondsToTime(score.time_ms)} s`;
  }

  function entryStatusClass(score) {
    if (!score) return 'is-pending';
    if (score.did_not_start || score.eliminated || score.retired) return 'is-special';
    return 'is-scored';
  }

  function placingBadge(placing) {
    if (placing == null) return '<span class="so-live-place is-pending">—</span>';
    const medal = placing === 1 ? '🥇' : placing === 2 ? '🥈' : placing === 3 ? '🥉' : '';
    return `<span class="so-live-place">${medal ? `<em>${medal}</em>` : ''}#${html(placing)}</span>`;
  }

  function updatedAgoLabel() {
    if (!lastUpdatedAt) return '';
    return lastUpdatedAt.toLocaleTimeString(document.documentElement.lang === 'ar' ? 'ar-BH' : 'en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function boardHeader(competitionClass) {
    const statusClass = `so-status-${clean(competitionClass.judging_status || 'not started').toLowerCase().replace(/\s+/g, '-')}`;
    return `<div class="so-live-head">
      <div>
        <span class="so-live-kicker">${html(competitionClass.competition_name)} · ${html(competitionClass.competition_date)}</span>
        <h3>${html(competitionClass.class_number)} — ${html(competitionClass.class_name)}</h3>
      </div>
      <div class="so-live-head-meta">
        <span class="so-status ${statusClass}">${html(competitionClass.judging_status)}</span>
        ${lastUpdatedAt ? `<span class="so-live-updated">Updated ${html(updatedAgoLabel())} · press Refresh for the latest</span>` : ''}
      </div>
    </div>`;
  }

  function standingsRows(rows, competitionClass) {
    const ranked = rows.slice().sort((left, right) =>
      (left.placing == null ? Number.MAX_SAFE_INTEGER : left.placing)
      - (right.placing == null ? Number.MAX_SAFE_INTEGER : right.placing)
      || left.start_number - right.start_number
    );
    return ranked.map(row => {
      const first = scoreLabel(row.first_round);
      const jump = row.jump_off ? scoreLabel(row.jump_off) : '—';
      return `<div class="so-live-row ${row.placing === 1 ? 'is-leader' : ''}">
        ${placingBadge(row.placing)}
        <span class="so-live-competitor"><b>${html(row.start_number)} · ${html(row.rider_name)}</b><small>${html(row.horse_name)}${row.stable_name ? ` · ${html(row.stable_name)}` : ''}</small></span>
        <span class="so-live-score ${entryStatusClass(row.first_round)}"><small>First Round</small><b>${html(first)}</b></span>
        ${competitionClass.jump_off ? `<span class="so-live-score ${entryStatusClass(row.jump_off)}"><small>Jump-Off</small><b>${html(jump)}</b></span>` : ''}
      </div>`;
    }).join('');
  }

  function renderBoard() {
    const target = document.getElementById('showOfficeResultsBoard');
    if (!target) return;
    document.getElementById(PAGE_ID)?.classList.toggle('so-live-tv', tvMode);
    const tvButton = document.getElementById('showOfficeResultsTvToggle');
    if (tvButton) tvButton.textContent = tvMode ? '🖥️ Exit Big Screen' : '🖥️ Big Screen';
    renderSelectors();
    if (!canView()) {
      target.innerHTML = stateHtml('Live Results access is not available for this account.', '🔒');
      return;
    }
    if (loading && !loaded) {
      target.innerHTML = stateHtml('Loading Live Results…');
      return;
    }
    if (loadError && !loaded) {
      target.innerHTML = `${stateHtml(loadError, '⚠️')}<button class="btn btn-amber" onclick="refreshShowOfficeResults()">Try again</button>`;
      return;
    }
    if (!selectedClassId) {
      target.innerHTML = stateHtml('Create a class and entries to see live results here.');
      return;
    }
    if (!boardData || String(boardData.class.class_id) !== selectedClassId) {
      target.innerHTML = stateHtml('Select a class to load its results.');
      return;
    }
    const competitionClass = boardData.class;
    const rows = boardData.rows || [];
    target.innerHTML = `<div class="card so-live-board">
      ${boardHeader(competitionClass)}
      ${rows.length ? `<div class="so-live-rows">${standingsRows(rows, competitionClass)}</div>`
        : stateHtml('This class has no entries yet.', '👥')}
    </div>`;
  }

  async function loadContext(options = {}) {
    if (!canView()) {
      clear();
      return [];
    }
    const currentRequest = ++requestId;
    loading = true;
    loadError = '';
    renderBoard();
    try {
      contextRows = await service().context();
      if (currentRequest !== requestId) return [];
      ensureSelection();
      loaded = true;
      if (selectedClassId) await loadBoard(selectedClassId, {nested: true});
      else boardData = null;
      return contextRows;
    } catch (error) {
      if (currentRequest !== requestId) return [];
      loadError = friendlyError(error);
      if (options.throwOnError) throw error;
      return [];
    } finally {
      if (currentRequest === requestId) {
        loading = false;
        renderBoard();
      }
    }
  }

  async function loadBoard(classId, options = {}) {
    const id = clean(classId);
    if (!id) {
      boardData = null;
      selectedClassId = '';
      renderBoard();
      return null;
    }
    const currentRequest = options.nested ? requestId : ++requestId;
    if (!options.nested) {
      loading = true;
      loadError = '';
      renderBoard();
    }
    try {
      const value = await service().panel(id);
      if (currentRequest !== requestId) return null;
      selectedClassId = String(value.class.class_id);
      selectedCompetitionId = String(value.class.competition_id);
      boardData = value;
      loaded = true;
      lastUpdatedAt = new Date();
      return value;
    } catch (error) {
      if (currentRequest !== requestId) return null;
      loadError = friendlyError(error);
      if (options.throwOnError) throw error;
      return null;
    } finally {
      if (!options.nested && currentRequest === requestId) {
        loading = false;
        renderBoard();
      }
    }
  }

  function clear() {
    requestId += 1;
    contextRows = [];
    boardData = null;
    selectedCompetitionId = '';
    selectedClassId = '';
    loading = false;
    loaded = false;
    loadError = '';
    lastUpdatedAt = null;
    tvMode = false;
    renderBoard();
  }

  window.selectShowOfficeResultsCompetition = function selectShowOfficeResultsCompetition(id) {
    selectedCompetitionId = String(id || '');
    const first = classesForCompetition(selectedCompetitionId)[0];
    selectedClassId = first ? String(first.class_id) : '';
    boardData = null;
    renderBoard();
    return selectedClassId ? loadBoard(selectedClassId) : Promise.resolve(null);
  };

  window.selectShowOfficeResultsClass = function selectShowOfficeResultsClass(id) {
    return loadBoard(id);
  };

  window.refreshShowOfficeResults = () => loadContext({force: true});

  window.toggleShowOfficeResultsTv = function toggleShowOfficeResultsTv() {
    tvMode = !tvMode;
    const page = document.getElementById(PAGE_ID);
    if (tvMode && page?.requestFullscreen) {
      page.requestFullscreen().catch(() => {});
    } else if (!tvMode && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    renderBoard();
  };

  showOffice.liveResults = Object.freeze({
    // Opening the page (or pressing Refresh) is the only way this board updates —
    // there is no background polling, by design, to keep database load minimal.
    open: async () => {
      await loadContext();
      return contextRows;
    },
    clear,
    render: renderBoard
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderBoard, {once: true});
  else renderBoard();
})();
