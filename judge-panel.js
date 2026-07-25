// Show Office Sprint 4 Judge Panel controller.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  let contextRows = [];
  let panelData = null;
  let selectedCompetitionId = '';
  let selectedClassId = '';
  let selectedEntryId = '';
  let selectedPhase = 'first_round';
  let loading = false;
  let loaded = false;
  let loadError = '';
  let requestId = 0;

  const service = () => showOffice.judgingService;
  const clean = value => String(value == null ? '' : value).trim();
  const html = value => typeof window.esc === 'function'
    ? window.esc(value)
    : clean(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const attr = value => typeof window.escAttr === 'function' ? window.escAttr(value) : html(value);
  const can = permission => typeof window.canUser === 'function' && window.canUser(permission);
  const canView = () => can('show_office.view') || can('show_office.judging.view')
    || can('show_office.judging.score') || can('show_office.judging.finalize')
    || can('show_office.judging.reopen');
  const canScore = () => can('show_office.judging.score');

  function friendlyError(error) {
    const message = String(error?.message || error || 'Unexpected error');
    if (/changed on another device|40001/i.test(message)) {
      return 'This score changed on another device. The panel was refreshed; review it before saving again.';
    }
    if (/finalized and locked|55000/i.test(message)) return 'This class is finalized and its scores are locked.';
    if (/competition must be Running/i.test(message)) return 'Set the competition status to Running before recording scores.';
    if (/permission denied|row-level security|42501/i.test(message)) {
      return 'You do not have permission to perform this judging action.';
    }
    return typeof window.userSafeError === 'function' ? window.userSafeError(error) : message;
  }

  function reportError(prefix, error) {
    const message = friendlyError(error);
    if (typeof window.showError === 'function') window.showError(prefix, new Error(message));
    else window.alert(`${prefix}: ${message}`);
  }

  function stateHtml(message, icon = '⚖️') {
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

  function contextClass(id) {
    return contextRows.find(row => String(row.class_id) === String(id)) || null;
  }

  function selectedEntry() {
    return panelData?.rows?.find(row => String(row.entry_id) === String(selectedEntryId)) || null;
  }

  function scoreFor(row, scorePhase = selectedPhase) {
    return scorePhase === 'jump_off' ? row?.jump_off : row?.first_round;
  }

  function scoreLabel(score) {
    if (!score) return 'Not scored';
    if (score.did_not_start) return 'DNS';
    if (score.eliminated) return 'Eliminated';
    if (score.retired) return 'Retired';
    if (score.points != null) {
      return `${Number(score.points).toFixed(2).replace(/\.00$/, '')} points · ${service().millisecondsToTime(score.time_ms)} s`;
    }
    return `${Number(score.faults).toFixed(2).replace(/\.00$/, '')} faults · ${service().millisecondsToTime(score.time_ms)} s`;
  }

  function entryStatusClass(score) {
    if (!score) return 'is-pending';
    if (score.did_not_start || score.eliminated || score.retired) return 'is-special';
    return 'is-scored';
  }

  function isFenceClass(competitionClass) {
    return Number(competitionClass?.fence_count) > 0;
  }

  function isAccumulator(competitionClass) {
    return competitionClass?.scoring_format === 'accumulator_joker';
  }

  function fencesFor(row, scorePhase = selectedPhase) {
    const fences = scorePhase === 'jump_off' ? row?.jump_off_fences : row?.first_round_fences;
    return Array.isArray(fences) ? fences : [];
  }

  function jokerFenceNumber(fences, competitionClass) {
    return Number(competitionClass.joker_fence_number) || fences.length;
  }

  function fenceTotals(fences, competitionClass) {
    return fences.reduce((totals, fence) => {
      if (fence.incident === 'knockdown') totals.faults += Number(competitionClass.knockdown_fault_value || 0);
      if (fence.incident === 'refusal') {
        totals.faults += Number(competitionClass.refusal_fault_value || 0);
        totals.refusals += 1;
      }
      return totals;
    }, {faults: 0, refusals: 0});
  }

  function pointsTotals(fences, competitionClass) {
    const joker = jokerFenceNumber(fences, competitionClass);
    let base = 0;
    let jokerCleared = false;
    let refusals = 0;
    fences.forEach(fence => {
      const clear = fence.incident === 'clear';
      if (clear) base += Number(fence.fence_number);
      if (fence.incident === 'refusal') refusals += 1;
      if (clear && Number(fence.fence_number) === joker) jokerCleared = true;
    });
    return {points: jokerCleared ? base * 2 : base, refusals, jokerCleared};
  }

  function fenceIcon(incidentValue) {
    if (incidentValue === 'knockdown') return '✕';
    if (incidentValue === 'refusal') return '⟲';
    return '✓';
  }

  function fenceGridHtml(fences, disabled, jokerFence) {
    return `<div class="so-judge-fence-grid">${fences.map(fence => `
      <button type="button" class="so-judge-fence ${fence.incident !== 'clear' ? `is-${fence.incident}` : ''} ${jokerFence && Number(fence.fence_number) === jokerFence ? 'is-joker' : ''}" ${disabled} onclick="toggleShowOfficeJudgeFence(${fence.fence_number})" title="Fence ${fence.fence_number}: ${fence.incident}${jokerFence && Number(fence.fence_number) === jokerFence ? ' (Joker)' : ''}">
        <span>${fenceIcon(fence.incident)}</span><small>#${fence.fence_number}${jokerFence && Number(fence.fence_number) === jokerFence ? ' J' : ''}</small>
      </button>`).join('')}</div>`;
  }

  function ensureSelection() {
    if (!contextRows.length) {
      selectedCompetitionId = '';
      selectedClassId = '';
      selectedEntryId = '';
      panelData = null;
      return;
    }
    if (!contextRows.some(row => String(row.competition_id) === String(selectedCompetitionId))) {
      const preferred = competitionRows().find(row => row.competition_status === 'Running') || competitionRows()[0];
      selectedCompetitionId = String(preferred.competition_id);
    }
    const classes = classesForCompetition(selectedCompetitionId);
    if (!classes.some(row => String(row.class_id) === String(selectedClassId))) {
      const preferred = classes.find(row => row.judging_status === 'Running')
        || classes.find(row => row.judging_status !== 'Finalized') || classes[0];
      selectedClassId = preferred ? String(preferred.class_id) : '';
      panelData = null;
    }
  }

  function ensureEntrySelection() {
    const rows = panelData?.rows || [];
    if (!rows.some(row => String(row.entry_id) === String(selectedEntryId))) {
      const preferred = rows.find(row => !scoreFor(row)) || rows[0];
      selectedEntryId = preferred ? String(preferred.entry_id) : '';
    }
    if (selectedPhase === 'jump_off' && panelData && !panelData.class.jump_off) {
      selectedPhase = 'first_round';
    }
  }

  function renderSelectors() {
    const competitionSelect = document.getElementById('showOfficeJudgeCompetition');
    const classSelect = document.getElementById('showOfficeJudgeClass');
    if (!competitionSelect || !classSelect) return;
    ensureSelection();
    const competitions = competitionRows();
    competitionSelect.innerHTML = competitions.length
      ? competitions.map(row => `<option value="${attr(row.competition_id)}" ${String(row.competition_id) === selectedCompetitionId ? 'selected' : ''}>${html(row.competition_name)} · ${html(row.competition_date)} · ${html(row.competition_status)}</option>`).join('')
      : '<option value="">No competitions with classes</option>';
    const classes = classesForCompetition(selectedCompetitionId);
    classSelect.innerHTML = classes.length
      ? classes.map(row => `<option value="${attr(row.class_id)}" ${String(row.class_id) === selectedClassId ? 'selected' : ''}>${html(row.class_number)} — ${html(row.class_name)} · ${html(row.judging_status)}</option>`).join('')
      : '<option value="">No classes in this competition</option>';
    competitionSelect.disabled = loading || !competitions.length;
    classSelect.disabled = loading || !classes.length;
  }

  function panelActions(competitionClass) {
    const finalized = competitionClass.judging_status === 'Finalized';
    if (finalized && can('show_office.judging.reopen')) {
      return '<button class="btn so-judge-reopen" onclick="reopenShowOfficeClass()">🔓 Reopen Class</button>';
    }
    if (!finalized && can('show_office.judging.finalize')) {
      return '<button class="btn btn-green" onclick="finalizeShowOfficeClass()">✓ Finalize &amp; Lock</button>';
    }
    return '<span class="so-read-only">View only</span>';
  }

  function entryButtons(rows) {
    return rows.map(row => {
      const score = scoreFor(row);
      return `<button class="so-judge-entry ${String(row.entry_id) === selectedEntryId ? 'is-selected' : ''} ${entryStatusClass(score)}" onclick="selectShowOfficeJudgeEntry('${attr(row.entry_id)}')">
        <span class="so-start-number">${html(row.start_number)}</span>
        <span><strong>${html(row.rider_name)}</strong><small>${html(row.horse_name)}${row.stable_name ? ` · ${html(row.stable_name)}` : ''}</small><em>${html(scoreLabel(score))}</em></span>
        ${row.placing == null ? '' : `<b>#${html(row.placing)}</b>`}
      </button>`;
    }).join('');
  }

  function scoreForm(row, competitionClass) {
    if (!row) return stateHtml('Select an entry to record or review its result.', '👤');
    const score = scoreFor(row);
    const locked = competitionClass.judging_status === 'Finalized';
    const competitionRunning = competitionClass.competition_status === 'Running';
    const editable = canScore() && !locked && competitionRunning;
    const disabled = editable ? '' : 'disabled';
    const eliminated = score?.eliminated === true;
    const retired = score?.retired === true;
    const dns = score?.did_not_start === true;
    const special = eliminated || retired || dns;
    const reason = locked
      ? 'Class finalized — scores are locked.'
      : !competitionRunning
        ? 'Competition must be Running before scores can be changed.'
        : !canScore() ? 'View-only access.' : '';
    const fenceMode = isFenceClass(competitionClass);
    const accumulator = fenceMode && isAccumulator(competitionClass);
    const fences = fenceMode ? fencesFor(row) : [];
    const totals = fenceMode ? (accumulator ? pointsTotals(fences, competitionClass) : fenceTotals(fences, competitionClass)) : null;
    const autoEliminate = fenceMode && !special && totals.refusals >= Number(competitionClass.refusals_before_elimination || 3);
    const eliminatedChecked = eliminated || (fenceMode && !score && autoEliminate);
    const joker = accumulator ? jokerFenceNumber(fences, competitionClass) : null;
    return `<form class="so-judge-score-card" id="showOfficeJudgeScoreForm" onsubmit="event.preventDefault();saveShowOfficeJudgeScore()">
      <div class="so-judge-score-head">
        <div><span>START ${html(row.start_number)}</span><h3>${html(row.rider_name)}</h3><p>${html(row.horse_name)}${row.stable_name ? ` · ${html(row.stable_name)}` : ''}</p></div>
        <span class="so-judge-score-state ${entryStatusClass(score)}">${html(scoreLabel(score))}</span>
      </div>
      ${reason ? `<div class="so-judge-notice">${html(reason)}</div>` : ''}
      ${fenceMode ? `
      <div class="so-judge-fence-summary">${accumulator
        ? `<span>Fences: ${fences.length}</span><span>Points: <b class="so-points-value">${totals.points.toFixed(2).replace(/\.00$/, '')}</b></span><span>Refusals: <b>${totals.refusals}</b>${autoEliminate ? ' — auto-eliminated' : ''}${totals.jokerCleared ? ' · Joker doubled' : ''}</span>`
        : `<span>Fences: ${fences.length}</span><span>Faults: <b>${totals.faults.toFixed(2).replace(/\.00$/, '')}</b></span><span>Refusals: <b>${totals.refusals}</b>${autoEliminate ? ' — auto-eliminated' : ''}</span>`
      }</div>
      ${fenceGridHtml(fences, disabled || special ? 'disabled' : '', joker)}
      <p class="so-judge-fence-note">${accumulator
        ? `Tap a fence to cycle Clear → Knockdown → Refusal. Each clear fence scores its number in points; clearing Joker fence #${html(joker)} doubles the total. ${html(competitionClass.refusals_before_elimination || 3)} refusals eliminate the entry automatically; correct it below if needed.`
        : `Tap a fence to cycle Clear → Knockdown → Refusal. ${html(competitionClass.refusals_before_elimination || 3)} refusals in this round eliminate the entry automatically; correct it below if needed.`
      }</p>
      <div class="so-judge-score-fields" style="grid-template-columns:1fr">
        <label><span>Time (seconds)</span><input ${disabled} ${special ? 'disabled' : ''} id="showOfficeJudgeTime" inputmode="decimal" min="0.001" max="86400" step="0.001" type="number" value="${attr(service().millisecondsToTime(score?.time_ms))}" placeholder="72.450"></label>
      </div>` : `
      <div class="so-judge-score-fields">
        <label><span>Time (seconds)</span><input ${disabled} ${special ? 'disabled' : ''} id="showOfficeJudgeTime" inputmode="decimal" min="0.001" max="86400" step="0.001" type="number" value="${attr(service().millisecondsToTime(score?.time_ms))}" placeholder="72.450"></label>
        <label><span>Faults</span><input ${disabled} ${special ? 'disabled' : ''} id="showOfficeJudgeFaults" inputmode="decimal" min="0" max="999999.99" step="0.01" type="number" value="${attr(score?.faults ?? '')}" placeholder="0"></label>
        <label><span>Refusals</span><input ${disabled} ${dns ? 'disabled' : ''} id="showOfficeJudgeRefusals" inputmode="numeric" min="0" max="9" step="1" type="number" value="${attr(score?.refusals ?? 0)}"></label>
      </div>`}
      <fieldset class="so-judge-dispositions" ${disabled}><legend>Result status</legend>
        <label><input type="checkbox" id="showOfficeJudgeEliminated" ${eliminatedChecked ? 'checked' : ''} onchange="setShowOfficeJudgeDisposition(this)"> Eliminated</label>
        <label><input type="checkbox" id="showOfficeJudgeRetired" ${retired ? 'checked' : ''} onchange="setShowOfficeJudgeDisposition(this)"> Retired</label>
        <label><input type="checkbox" id="showOfficeJudgeDns" ${dns ? 'checked' : ''} onchange="setShowOfficeJudgeDisposition(this)"> DNS</label>
      </fieldset>
      <div class="so-judge-form-actions">
        ${score && editable ? '<button type="button" class="btn so-judge-reset" onclick="resetShowOfficeJudgeScore()">Reset Score</button>' : ''}
        ${editable ? '<button type="submit" class="btn btn-amber">Save &amp; Next →</button>' : ''}
      </div>
      <div class="so-form-error" id="showOfficeJudgeFormError"></div>
    </form>`;
  }

  function standings(rows, competitionClass) {
    const ranked = rows.slice().sort((left, right) =>
      (left.placing == null ? Number.MAX_SAFE_INTEGER : left.placing)
      - (right.placing == null ? Number.MAX_SAFE_INTEGER : right.placing)
      || left.start_number - right.start_number
    );
    const phaseTitle = competitionClass.jump_off ? 'First Round / Jump-Off' : 'First Round';
    return `<div class="card so-judge-standings">
      <div class="card-title">🏁 Provisional Ranking · ${html(phaseTitle)}</div>
      <div class="so-judge-results">${ranked.map(row => {
        const first = scoreLabel(row.first_round);
        const jump = row.jump_off ? scoreLabel(row.jump_off) : '—';
        return `<div class="so-judge-result-row">
          <strong>${row.placing == null ? '—' : `#${html(row.placing)}`}</strong>
          <span><b>${html(row.start_number)} · ${html(row.rider_name)}</b><small>${html(row.horse_name)}</small></span>
          <span><small>First Round</small><b>${html(first)}</b></span>
          ${competitionClass.jump_off ? `<span><small>Jump-Off</small><b>${html(jump)}</b></span>` : ''}
        </div>`;
      }).join('')}</div>
      <p class="so-judge-ranking-note">${isAccumulator(competitionClass)
        ? 'Provisional order uses total points (highest first, Joker fence doubled when cleared), then time.'
        : 'Provisional order uses the official faults entered by the judge, then time. Refusals and allowed time are displayed but do not automatically add penalties.'
      }</p>
    </div>`;
  }

  function renderPanel() {
    const target = document.getElementById('showOfficeJudgePanel');
    if (!target) return;
    renderSelectors();
    if (!canView()) {
      target.innerHTML = stateHtml('Judge Panel access is not available for this account.');
      return;
    }
    if (loading && !loaded) {
      target.innerHTML = stateHtml('Loading Judge Panel…');
      return;
    }
    if (loadError && !loaded) {
      target.innerHTML = `${stateHtml(loadError, '⚠️')}<button class="btn btn-amber" onclick="refreshShowOfficeJudgePanel()">Try again</button>`;
      return;
    }
    if (!selectedClassId) {
      target.innerHTML = stateHtml('Create a class and entries before opening the Judge Panel.');
      return;
    }
    if (!panelData || String(panelData.class.class_id) !== selectedClassId) {
      target.innerHTML = stateHtml('Select a class to load its entries.');
      return;
    }
    ensureEntrySelection();
    const competitionClass = panelData.class;
    const rows = panelData.rows || [];
    const warning = loadError ? `<div class="so-load-warning"><div><strong>Refresh failed</strong><span>${html(loadError)}</span></div><button class="btn btn-amber" onclick="refreshShowOfficeJudgePanel()">Try again</button></div>` : '';
    target.innerHTML = `${warning}
      <div class="card so-judge-summary">
        <div><span>Competition</span><strong>${html(competitionClass.competition_name)}</strong><small>${html(competitionClass.competition_date)} · ${html(competitionClass.competition_status)}</small></div>
        <div><span>Class</span><strong>${html(competitionClass.class_number)} — ${html(competitionClass.class_name)}</strong><small>${html(competitionClass.competition_type || '—')} · ${competitionClass.height_cm ? `${html(competitionClass.height_cm)} cm` : 'Height not set'}</small></div>
        <div><span>Timing</span><strong>${competitionClass.allowed_time_seconds ? `${html(competitionClass.allowed_time_seconds)} s allowed` : 'No allowed time'}</strong><small>${competitionClass.time_limit_seconds ? `${html(competitionClass.time_limit_seconds)} s limit` : 'No time limit'}</small></div>
        <div><span>Status</span><strong class="so-judge-lifecycle">${html(competitionClass.judging_status)}</strong><small>${html(competitionClass.ruleset_version)}</small></div>
        <div class="so-judge-summary-action">${panelActions(competitionClass)}</div>
      </div>
      <div class="so-judge-phase-tabs" role="tablist">
        <button class="${selectedPhase === 'first_round' ? 'active' : ''}" onclick="setShowOfficeJudgePhase('first_round')">First Round</button>
        ${competitionClass.jump_off ? `<button class="${selectedPhase === 'jump_off' ? 'active' : ''}" onclick="setShowOfficeJudgePhase('jump_off')">Jump-Off</button>` : ''}
      </div>
      ${rows.length ? `<div class="so-judge-workspace">
        <div class="card so-judge-start-list"><div class="card-title">Start List · ${rows.length}</div>${entryButtons(rows)}</div>
        ${scoreForm(selectedEntry(), competitionClass)}
      </div>${standings(rows, competitionClass)}` : stateHtml('This class has no entries yet.', '👥')}`;
  }

  async function loadContext(options = {}) {
    if (!canView()) {
      clear();
      return [];
    }
    const currentRequest = ++requestId;
    loading = true;
    loadError = '';
    renderPanel();
    try {
      contextRows = await service().context();
      if (currentRequest !== requestId) return [];
      ensureSelection();
      loaded = true;
      if (selectedClassId) await loadPanel(selectedClassId, {nested:true});
      else panelData = null;
      return contextRows;
    } catch (error) {
      if (currentRequest !== requestId) return [];
      loadError = friendlyError(error);
      if (options.throwOnError) throw error;
      return [];
    } finally {
      if (currentRequest === requestId) {
        loading = false;
        renderPanel();
      }
    }
  }

  async function loadPanel(classId, options = {}) {
    const id = clean(classId);
    if (!id) {
      panelData = null;
      selectedClassId = '';
      renderPanel();
      return null;
    }
    const currentRequest = options.nested ? requestId : ++requestId;
    if (!options.nested) {
      loading = true;
      loadError = '';
      renderPanel();
    }
    try {
      const value = await service().panel(id);
      if (currentRequest !== requestId) return null;
      selectedClassId = String(value.class.class_id);
      selectedCompetitionId = String(value.class.competition_id);
      panelData = value;
      loaded = true;
      ensureEntrySelection();
      return value;
    } catch (error) {
      if (currentRequest !== requestId) return null;
      loadError = friendlyError(error);
      if (options.throwOnError) throw error;
      return null;
    } finally {
      if (!options.nested && currentRequest === requestId) {
        loading = false;
        renderPanel();
      }
    }
  }

  async function refreshAfterMutation() {
    await loadPanel(selectedClassId, {throwOnError:true});
    try {
      contextRows = await service().context();
    } catch (error) {
      console.warn('[CCE] Judge Panel context refresh failed', error);
    }
    renderPanel();
  }

  function clear() {
    requestId += 1;
    contextRows = [];
    panelData = null;
    selectedCompetitionId = '';
    selectedClassId = '';
    selectedEntryId = '';
    selectedPhase = 'first_round';
    loading = false;
    loaded = false;
    loadError = '';
    renderPanel();
  }

  window.renderShowOfficeJudgePanel = renderPanel;
  window.refreshShowOfficeJudgePanel = () => loadContext({force:true});

  window.selectShowOfficeJudgeCompetition = function selectShowOfficeJudgeCompetition(id) {
    selectedCompetitionId = String(id || '');
    const first = classesForCompetition(selectedCompetitionId)[0];
    selectedClassId = first ? String(first.class_id) : '';
    selectedEntryId = '';
    selectedPhase = 'first_round';
    panelData = null;
    renderPanel();
    return selectedClassId ? loadPanel(selectedClassId) : Promise.resolve(null);
  };

  window.selectShowOfficeJudgeClass = function selectShowOfficeJudgeClass(id) {
    selectedEntryId = '';
    selectedPhase = 'first_round';
    return loadPanel(id);
  };

  window.selectShowOfficeJudgeEntry = function selectShowOfficeJudgeEntry(id) {
    selectedEntryId = String(id || '');
    renderPanel();
  };

  window.setShowOfficeJudgePhase = function setShowOfficeJudgePhase(value) {
    selectedPhase = value === 'jump_off' ? 'jump_off' : 'first_round';
    ensureEntrySelection();
    renderPanel();
  };

  window.setShowOfficeJudgeDisposition = function setShowOfficeJudgeDisposition(input) {
    if (input?.checked) {
      ['showOfficeJudgeEliminated','showOfficeJudgeRetired','showOfficeJudgeDns']
        .filter(id => id !== input.id)
        .forEach(id => { const node = document.getElementById(id); if (node) node.checked = false; });
    }
    const special = ['showOfficeJudgeEliminated','showOfficeJudgeRetired','showOfficeJudgeDns']
      .some(id => document.getElementById(id)?.checked);
    const dns = document.getElementById('showOfficeJudgeDns')?.checked;
    ['showOfficeJudgeTime','showOfficeJudgeFaults'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.disabled = special;
    });
    const refusal = document.getElementById('showOfficeJudgeRefusals');
    if (refusal) {
      refusal.disabled = Boolean(dns);
      if (dns) refusal.value = '0';
    }
    document.querySelectorAll('.so-judge-fence').forEach(button => { button.disabled = special; });
  };

  window.toggleShowOfficeJudgeFence = async function toggleShowOfficeJudgeFence(fenceNumberValue) {
    const row = selectedEntry();
    if (!row || !canScore()) return;
    const fences = fencesFor(row);
    const current = fences.find(fence => fence.fence_number === fenceNumberValue);
    if (!current) return;
    const next = current.incident === 'clear' ? 'knockdown' : current.incident === 'knockdown' ? 'refusal' : 'clear';
    try {
      const result = await service().toggleFence(row.entry_id, selectedPhase, fenceNumberValue, next, current.row_version);
      const key = selectedPhase === 'jump_off' ? 'jump_off_fences' : 'first_round_fences';
      const updatedFences = fences.map(fence => fence.fence_number === fenceNumberValue
        ? {fence_number: result.fence_number, incident: result.incident, row_version: result.row_version}
        : fence);
      const rowIndex = panelData.rows.findIndex(item => String(item.entry_id) === String(row.entry_id));
      if (rowIndex !== -1) panelData.rows[rowIndex] = {...panelData.rows[rowIndex], [key]: updatedFences};
      renderPanel();
    } catch (error) {
      if (/changed on another device/i.test(String(error?.message || error))) await loadPanel(selectedClassId);
      reportError('Fence not updated', error);
    }
  };

  window.saveShowOfficeJudgeScore = async function saveShowOfficeJudgeScore() {
    const row = selectedEntry();
    if (!row || !canScore()) return;
    const formError = document.getElementById('showOfficeJudgeFormError');
    try {
      const score = scoreFor(row);
      const fenceMode = isFenceClass(panelData.class);
      if (fenceMode) {
        await service().saveFenceScore({
          entry_id: row.entry_id,
          phase: selectedPhase,
          time_seconds: document.getElementById('showOfficeJudgeTime')?.value,
          eliminated: document.getElementById('showOfficeJudgeEliminated')?.checked === true,
          retired: document.getElementById('showOfficeJudgeRetired')?.checked === true,
          did_not_start: document.getElementById('showOfficeJudgeDns')?.checked === true,
          expected_version: score?.row_version || 0
        });
      } else {
        await service().saveScore({
          entry_id: row.entry_id,
          phase: selectedPhase,
          time_seconds: document.getElementById('showOfficeJudgeTime')?.value,
          faults: document.getElementById('showOfficeJudgeFaults')?.value,
          refusals: document.getElementById('showOfficeJudgeRefusals')?.value,
          eliminated: document.getElementById('showOfficeJudgeEliminated')?.checked === true,
          retired: document.getElementById('showOfficeJudgeRetired')?.checked === true,
          did_not_start: document.getElementById('showOfficeJudgeDns')?.checked === true,
          expected_version: score?.row_version || 0
        });
      }
      const rows = panelData.rows;
      const currentIndex = rows.findIndex(item => String(item.entry_id) === selectedEntryId);
      const next = rows.slice(currentIndex + 1).find(item => !scoreFor(item))
        || rows.find(item => !scoreFor(item));
      await refreshAfterMutation();
      if (next) selectedEntryId = String(next.entry_id);
      renderPanel();
      window.setTimeout(() => document.getElementById('showOfficeJudgeTime')?.focus(), 0);
    } catch (error) {
      const message = friendlyError(error);
      if (/changed on another device/i.test(message)) {
        await loadPanel(selectedClassId);
        reportError('Score not saved', error);
        return;
      }
      if (formError) {
        formError.textContent = message;
        formError.style.display = 'block';
      } else reportError('Score not saved', error);
    }
  };

  window.resetShowOfficeJudgeScore = async function resetShowOfficeJudgeScore() {
    const row = selectedEntry();
    const score = scoreFor(row);
    if (!row || !score || !canScore()) return;
    if (!window.confirm('Reset this score? The action remains in the immutable score history.')) return;
    try {
      await service().resetScore(row.entry_id, selectedPhase, score.row_version);
      await refreshAfterMutation();
    } catch (error) {
      if (/changed on another device|40001/i.test(String(error?.message || error))) await loadPanel(selectedClassId);
      reportError('Score not reset', error);
    }
  };

  window.finalizeShowOfficeClass = async function finalizeShowOfficeClass() {
    if (!selectedClassId || !can('show_office.judging.finalize')) return;
    if (!window.confirm('Finalize and lock this class? Every entry must have a first-round result.')) return;
    try {
      await service().finalize(selectedClassId);
      await refreshAfterMutation();
    } catch (error) { reportError('Class not finalized', error); }
  };

  window.reopenShowOfficeClass = async function reopenShowOfficeClass() {
    if (!selectedClassId || !can('show_office.judging.reopen')) return;
    if (!window.confirm('Reopen this finalized class for score corrections?')) return;
    try {
      await service().reopen(selectedClassId);
      await refreshAfterMutation();
    } catch (error) { reportError('Class not reopened', error); }
  };

  showOffice.judgePanel = Object.freeze({
    open: () => loaded && !loadError ? (renderPanel(), Promise.resolve(contextRows)) : loadContext(),
    load: loadContext,
    clear,
    render: renderPanel,
    getContext: () => contextRows.slice(),
    getPanel: () => panelData
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPanel, {once:true});
  else renderPanel();
})();
