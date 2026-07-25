// Show Office judging domain, protected RPC access and portable backup support.
// DOM rendering belongs in the root judge-panel.js controller.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const JUDGING_TABLE = 'show_office_class_judging';
  const SCORE_TABLE = 'show_office_entry_rounds';
  const CONTEXT_RPC = 'cce_show_office_judging_context';
  const PANEL_RPC = 'cce_show_office_judge_panel';
  const SAVE_RPC = 'cce_save_show_office_score';
  const RESET_RPC = 'cce_reset_show_office_score';
  const FINALIZE_RPC = 'cce_finalize_show_office_class';
  const REOPEN_RPC = 'cce_reopen_show_office_class';
  const TOGGLE_FENCE_RPC = 'cce_show_office_toggle_fence';
  const FENCE_SAVE_RPC = 'cce_save_show_office_fence_score';
  const BACKUP_PAGE_SIZE = 1000;
  const PHASES = Object.freeze(['first_round', 'jump_off']);
  const STATUSES = Object.freeze(['Not Started', 'Running', 'Finalized']);
  const INCIDENTS = Object.freeze(['clear', 'knockdown', 'refusal']);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const text = value => String(value == null ? '' : value).trim();

  function positiveInteger(value, label) {
    const number = Number(text(value));
    if (!Number.isInteger(number) || number <= 0 || number > 2147483647) {
      throw new Error(`${label} must be a positive whole number.`);
    }
    return number;
  }

  function uuid(value, label) {
    const result = text(value);
    if (!UUID_RE.test(result)) throw new Error(`${label} must be a valid UUID.`);
    return result.toLowerCase();
  }

  function phase(value) {
    const result = text(value).toLowerCase();
    if (!PHASES.includes(result)) throw new Error('Score phase must be first_round or jump_off.');
    return result;
  }

  function timeToMilliseconds(value) {
    const raw = text(value);
    if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) {
      throw new Error('Time must be a positive number of seconds with up to 3 decimal places.');
    }
    const result = Math.round(Number(raw) * 1000);
    if (!Number.isSafeInteger(result) || result <= 0 || result > 86400000) {
      throw new Error('Time must be greater than 0 and no more than 86,400 seconds.');
    }
    return result;
  }

  function millisecondsToTime(value) {
    if (value == null || value === '') return '';
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) return '';
    return (number / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  function faults(value) {
    const raw = text(value);
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      throw new Error('Faults must be a non-negative number with up to 2 decimal places.');
    }
    const result = Number(raw);
    if (!Number.isFinite(result) || result < 0 || result > 999999.99) {
      throw new Error('Faults must be between 0 and 999,999.99.');
    }
    return result;
  }

  function refusals(value) {
    const raw = text(value) || '0';
    const result = Number(raw);
    if (!Number.isInteger(result) || result < 0 || result > 9) {
      throw new Error('Refusals must be a whole number between 0 and 9.');
    }
    return result;
  }

  function normalizeRound(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return Object.freeze({
      ...value,
      id: value.id == null ? null : Number(value.id),
      result_ref: text(value.result_ref),
      phase: phase(value.phase),
      time_ms: value.time_ms == null ? null : Number(value.time_ms),
      faults: value.faults == null ? null : Number(value.faults),
      points: value.points == null ? null : Number(value.points),
      refusals: Number(value.refusals || 0),
      eliminated: value.eliminated === true,
      retired: value.retired === true,
      did_not_start: value.did_not_start === true,
      row_version: Number(value.row_version || 0)
    });
  }

  function normalizeContext(row) {
    const source = row && typeof row === 'object' ? row : {};
    return Object.freeze({
      ...source,
      competition_id: Number(source.competition_id),
      competition_name: text(source.competition_name),
      competition_date: text(source.competition_date),
      competition_status: text(source.competition_status),
      class_id: Number(source.class_id),
      class_number: text(source.class_number),
      class_name: text(source.class_name),
      sort_order: Number(source.sort_order),
      height_cm: source.height_cm == null ? null : Number(source.height_cm),
      allowed_time_seconds: source.allowed_time_seconds == null ? null : Number(source.allowed_time_seconds),
      time_limit_seconds: source.time_limit_seconds == null ? null : Number(source.time_limit_seconds),
      jump_off: source.jump_off === true,
      fence_count: source.fence_count == null ? null : Number(source.fence_count),
      knockdown_fault_value: source.knockdown_fault_value == null ? 4 : Number(source.knockdown_fault_value),
      refusal_fault_value: source.refusal_fault_value == null ? 4 : Number(source.refusal_fault_value),
      refusals_before_elimination: source.refusals_before_elimination == null ? 3 : Number(source.refusals_before_elimination),
      scoring_format: text(source.scoring_format) || 'table_a',
      joker_fence_number: source.joker_fence_number == null ? null : Number(source.joker_fence_number),
      judging_status: text(source.judging_status) || 'Not Started',
      scoring_profile: text(source.scoring_profile) || 'faults_then_time',
      ruleset_version: text(source.ruleset_version) || 'CCE 2026',
      entry_count: Number(source.entry_count || 0),
      scored_count: Number(source.scored_count || 0)
    });
  }

  function normalizeFences(value) {
    if (!Array.isArray(value)) return [];
    return value.map(row => Object.freeze({
      fence_number: Number(row?.fence_number),
      incident: INCIDENTS.includes(text(row?.incident)) ? text(row?.incident) : 'clear',
      row_version: Number(row?.row_version || 0)
    }));
  }

  function incident(value) {
    const result = text(value).toLowerCase();
    if (!INCIDENTS.includes(result)) throw new Error('Fence incident must be clear, knockdown or refusal.');
    return result;
  }

  function fenceNumber(value) {
    const number = Number(text(value));
    if (!Number.isInteger(number) || number <= 0 || number > 50) {
      throw new Error('Fence number must be a positive whole number no greater than 50.');
    }
    return number;
  }

  function validateScore(input) {
    const source = input && typeof input === 'object' ? input : {};
    const flags = {
      eliminated: source.eliminated === true,
      retired: source.retired === true,
      did_not_start: source.did_not_start === true
    };
    if (Object.values(flags).filter(Boolean).length > 1) {
      throw new Error('Eliminated, Retired and DNS are mutually exclusive.');
    }
    const special = flags.eliminated || flags.retired || flags.did_not_start;
    const expectedVersion = source.expected_version == null ? 0 : Number(source.expected_version);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new Error('Score version must be a non-negative whole number.');
    }
    return Object.freeze({
      entry_id: positiveInteger(source.entry_id, 'Entry'),
      phase: phase(source.phase),
      time_ms: special ? null : timeToMilliseconds(source.time_seconds),
      faults: special ? null : faults(source.faults),
      refusals: flags.did_not_start ? 0 : refusals(source.refusals),
      ...flags,
      expected_version: expectedVersion
    });
  }

  async function context() {
    const value = await sbRpc(CONTEXT_RPC, {});
    if (!Array.isArray(value)) throw new Error('Supabase returned an invalid judging context.');
    return value.map(normalizeContext);
  }

  async function panel(classId) {
    const value = await sbRpc(PANEL_RPC, {p_class_id: positiveInteger(classId, 'Class')});
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || !value.class || !Array.isArray(value.rows)) {
      throw new Error('Supabase returned an invalid Judge Panel.');
    }
    return Object.freeze({
      class: normalizeContext(value.class),
      rows: value.rows.map(row => Object.freeze({
        ...row,
        entry_id: Number(row.entry_id),
        entry_ref: text(row.entry_ref),
        start_number: Number(row.start_number),
        rider_name: text(row.rider_name),
        horse_name: text(row.horse_name),
        stable_name: text(row.stable_name),
        placing: row.placing == null ? null : Number(row.placing),
        first_round: normalizeRound(row.first_round),
        jump_off: normalizeRound(row.jump_off),
        first_round_fences: normalizeFences(row.first_round_fences),
        jump_off_fences: normalizeFences(row.jump_off_fences)
      }))
    });
  }

  async function toggleFence(entryId, scorePhase, fenceValue, incidentValue, expectedVersion) {
    const value = await sbRpc(TOGGLE_FENCE_RPC, {
      p_entry_id: positiveInteger(entryId, 'Entry'),
      p_phase: phase(scorePhase),
      p_fence_number: fenceNumber(fenceValue),
      p_incident: incident(incidentValue),
      p_expected_version: expectedVersion == null ? 0 : Number(expectedVersion)
    });
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Supabase returned an invalid fence result.');
    }
    return Object.freeze({
      fence_number: Number(value.fence_number),
      incident: INCIDENTS.includes(text(value.incident)) ? text(value.incident) : 'clear',
      row_version: Number(value.row_version || 0),
      totals: Object.freeze({
        faults: Number(value.totals?.faults || 0),
        refusals: Number(value.totals?.refusals || 0)
      })
    });
  }

  function validateFenceScore(input) {
    const source = input && typeof input === 'object' ? input : {};
    const flags = {
      eliminated: source.eliminated === true,
      retired: source.retired === true,
      did_not_start: source.did_not_start === true
    };
    if (Object.values(flags).filter(Boolean).length > 1) {
      throw new Error('Eliminated, Retired and DNS are mutually exclusive.');
    }
    const special = flags.eliminated || flags.retired || flags.did_not_start;
    const expectedVersion = source.expected_version == null ? 0 : Number(source.expected_version);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new Error('Score version must be a non-negative whole number.');
    }
    return Object.freeze({
      entry_id: positiveInteger(source.entry_id, 'Entry'),
      phase: phase(source.phase),
      time_ms: special ? null : timeToMilliseconds(source.time_seconds),
      ...flags,
      expected_version: expectedVersion
    });
  }

  async function saveFenceScore(input) {
    const row = validateFenceScore(input);
    const value = await sbRpc(FENCE_SAVE_RPC, {
      p_entry_id: row.entry_id,
      p_phase: row.phase,
      p_time_ms: row.time_ms,
      p_eliminated: row.eliminated,
      p_retired: row.retired,
      p_did_not_start: row.did_not_start,
      p_expected_version: row.expected_version
    });
    return normalizeRound(value);
  }

  async function saveScore(input) {
    const row = validateScore(input);
    const value = await sbRpc(SAVE_RPC, {
      p_entry_id: row.entry_id,
      p_phase: row.phase,
      p_time_ms: row.time_ms,
      p_faults: row.faults,
      p_refusals: row.refusals,
      p_eliminated: row.eliminated,
      p_retired: row.retired,
      p_did_not_start: row.did_not_start,
      p_expected_version: row.expected_version
    });
    return normalizeRound(value);
  }

  async function resetScore(entryId, scorePhase, expectedVersion) {
    return sbRpc(RESET_RPC, {
      p_entry_id: positiveInteger(entryId, 'Entry'),
      p_phase: phase(scorePhase),
      p_expected_version: positiveInteger(expectedVersion, 'Score version')
    });
  }

  async function finalize(classId) {
    return sbRpc(FINALIZE_RPC, {p_class_id: positiveInteger(classId, 'Class')});
  }

  async function reopen(classId) {
    return sbRpc(REOPEN_RPC, {p_class_id: positiveInteger(classId, 'Class')});
  }

  async function listEvery(table) {
    const rows = [];
    const seen = new Set();
    let cursor = '';
    while (true) {
      const order = table === JUDGING_TABLE ? 'class_id.asc' : 'id.asc';
      const cursorColumn = table === JUDGING_TABLE ? 'class_id' : 'id';
      const filter = cursor ? `&${cursorColumn}=gt.${encodeURIComponent(cursor)}` : '';
      const pageRows = await sbGet(table, `select=*&order=${order}${filter}&limit=${BACKUP_PAGE_SIZE}`);
      if (!Array.isArray(pageRows)) throw new Error(`Supabase returned an invalid ${table} backup page.`);
      for (const row of pageRows) {
        const id = text(row?.[cursorColumn]);
        if (!id) throw new Error(`${table} backup contained a record without an id.`);
        if (seen.has(id)) throw new Error(`${table} backup pagination repeated id ${id}.`);
        seen.add(id);
        rows.push(row);
      }
      if (!pageRows.length) break;
      const next = text(pageRows[pageRows.length - 1]?.[cursorColumn]);
      if (!next || next === cursor) throw new Error(`${table} backup pagination did not advance.`);
      cursor = next;
    }
    return rows;
  }

  async function listAll() {
    const [judging, scores] = await Promise.all([
      listEvery(JUDGING_TABLE),
      listEvery(SCORE_TABLE)
    ]);
    return Object.freeze({judging, scores});
  }

  function backupPayload(data, competitionsById, classesById, entriesById) {
    const source = data && typeof data === 'object' ? data : {};
    const portableClass = (row, index) => {
      const competitionClass = classesById.get(String(row.class_id));
      const competition = competitionClass && competitionsById.get(String(competitionClass.competition_id));
      if (!competitionClass || !competition) {
        throw new Error(`Judging backup row ${index + 1} references unavailable class data.`);
      }
      return {
        competition_name: text(competition.competition_name),
        competition_date: text(competition.competition_date),
        class_number: text(competitionClass.class_number)
      };
    };
    const judging = (source.judging || []).map((row, index) => ({
      ...portableClass(row, index),
      status: STATUSES.includes(text(row.status)) ? text(row.status) : 'Not Started',
      scoring_profile: text(row.scoring_profile) || 'faults_then_time',
      ruleset_version: text(row.ruleset_version) || 'CCE 2026'
    }));
    const scores = (source.scores || []).map((row, index) => {
      const entry = entriesById.get(String(row.entry_id));
      if (!entry) throw new Error(`Score backup row ${index + 1} references an unavailable entry.`);
      return {
        result_ref: uuid(row.result_ref, 'Score reference'),
        entry_ref: uuid(entry.entry_ref, 'Entry reference'),
        phase: phase(row.phase),
        time_ms: row.time_ms == null ? null : Number(row.time_ms),
        faults: row.faults == null ? null : Number(row.faults),
        refusals: Number(row.refusals || 0),
        eliminated: row.eliminated === true,
        retired: row.retired === true,
        did_not_start: row.did_not_start === true
      };
    });
    return validateBackupPayload({judging, scores});
  }

  function isISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function validateBackupPayload(payload) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    for (const key of ['judging', 'scores']) {
      if (Object.prototype.hasOwnProperty.call(source, key) && !Array.isArray(source[key])) {
        throw new Error(`Show Office backup ${key} must contain an array.`);
      }
    }
    const judging = (source.judging || []).map((row, index) => {
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('record must be an object.');
        const result = {
          competition_name: text(row.competition_name),
          competition_date: text(row.competition_date),
          class_number: text(row.class_number),
          status: text(row.status),
          scoring_profile: text(row.scoring_profile) || 'faults_then_time',
          ruleset_version: text(row.ruleset_version) || 'CCE 2026'
        };
        if (!result.competition_name || result.competition_name.length > 180) throw new Error('competition_name is invalid.');
        if (!isISODate(result.competition_date)) throw new Error('competition_date is invalid.');
        if (!result.class_number || result.class_number.length > 30) throw new Error('class_number is invalid.');
        if (!STATUSES.includes(result.status)) throw new Error('status is invalid.');
        if (result.scoring_profile !== 'faults_then_time') throw new Error('scoring_profile is unsupported.');
        if (!result.ruleset_version || result.ruleset_version.length > 80) throw new Error('ruleset_version is invalid.');
        return result;
      } catch (error) { throw new Error(`Judging row ${index + 1}: ${error.message}`); }
    });
    const scores = (source.scores || []).map((row, index) => {
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('record must be an object.');
        const flags = {
          eliminated: row.eliminated === true,
          retired: row.retired === true,
          did_not_start: row.did_not_start === true
        };
        if (['eliminated','retired','did_not_start'].some(key => key in row && typeof row[key] !== 'boolean')) {
          throw new Error('status flags must be boolean.');
        }
        if (Object.values(flags).filter(Boolean).length > 1) throw new Error('status flags conflict.');
        const special = flags.eliminated || flags.retired || flags.did_not_start;
        const result = {
          result_ref: uuid(row.result_ref, 'result_ref'),
          entry_ref: uuid(row.entry_ref, 'entry_ref'),
          phase: phase(row.phase),
          time_ms: row.time_ms == null ? null : Number(row.time_ms),
          faults: row.faults == null ? null : Number(row.faults),
          refusals: refusals(row.refusals),
          ...flags
        };
        if (special) {
          result.time_ms = null;
          result.faults = null;
          if (result.did_not_start) result.refusals = 0;
        } else if (!Number.isInteger(result.time_ms) || result.time_ms <= 0 || result.time_ms > 86400000
            || !Number.isFinite(result.faults) || result.faults < 0 || result.faults > 999999.99
            || Math.abs(Math.round(result.faults * 100) - result.faults * 100) > 1e-8) {
          throw new Error('time_ms or faults is invalid.');
        }
        return result;
      } catch (error) { throw new Error(`Score ${index + 1}: ${error.message}`); }
    });
    return Object.freeze({judging, scores});
  }

  function workbookSheets(payload) {
    return [
      {sheet:'Class Judging', rows:payload.judging.map(row => ({
        Competition:row.competition_name, Date:row.competition_date,
        'Class Number':row.class_number, Status:row.status,
        'Scoring Profile':row.scoring_profile, Ruleset:row.ruleset_version
      }))},
      {sheet:'Judge Scores', rows:payload.scores.map(row => ({
        Reference:row.result_ref, 'Entry Reference':row.entry_ref,
        Phase:row.phase, 'Time MS':row.time_ms, Faults:row.faults,
        Refusals:row.refusals, Eliminated:row.eliminated ? 'Yes' : 'No',
        Retired:row.retired ? 'Yes' : 'No', DNS:row.did_not_start ? 'Yes' : 'No'
      }))}
    ];
  }

  showOffice.judgingService = Object.freeze({
    JUDGING_TABLE,SCORE_TABLE,CONTEXT_RPC,PANEL_RPC,SAVE_RPC,RESET_RPC,
    FINALIZE_RPC,REOPEN_RPC,TOGGLE_FENCE_RPC,FENCE_SAVE_RPC,
    BACKUP_PAGE_SIZE,PHASES,STATUSES,INCIDENTS,
    normalizeRound,normalizeContext,normalizeFences,validateScore,validateFenceScore,
    timeToMilliseconds,millisecondsToTime,
    context,panel,saveScore,resetScore,finalize,reopen,toggleFence,saveFenceScore,listAll,
    backupPayload,validateBackupPayload,workbookSheets
  });
})();
