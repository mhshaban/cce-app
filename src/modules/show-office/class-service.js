// Show Office class domain and persistence service.
// DOM rendering and module-level backup orchestration belong elsewhere.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const TABLE = 'show_office_classes';
  const BACKUP_PAGE_SIZE = 1000;
  const CLASS_NUMBER_MAX = 30;
  const CLASS_NAME_MAX = 180;
  const COMPETITION_TYPE_MAX = 120;
  const NOTES_MAX = 4000;
  const SCORING_FORMATS = Object.freeze(['table_a', 'accumulator_joker']);

  const text = value => String(value == null ? '' : value).trim();
  const optional = value => text(value) || null;

  function isISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function positiveInteger(value, label, {optionalValue = false, maximum = Number.MAX_SAFE_INTEGER} = {}) {
    const raw = text(value);
    if (!raw && optionalValue) return null;
    const number = Number(raw);
    if (!Number.isInteger(number) || number <= 0 || number > maximum) {
      throw new Error(`${label} must be a positive whole number no greater than ${maximum.toLocaleString()}.`);
    }
    return number;
  }

  function entryFee(value) {
    const raw = text(value) || '0';
    if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) throw new Error('Entry fee must be a non-negative amount with up to 3 decimal places.');
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 9999999.999) {
      throw new Error('Entry fee must be between 0 and 9,999,999.999 BD.');
    }
    return number;
  }

  function faultValue(value, label, fallback) {
    const raw = text(value);
    if (!raw) return fallback;
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label} must be a non-negative amount with up to 2 decimal places.`);
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 999.99) {
      throw new Error(`${label} must be between 0 and 999.99.`);
    }
    return number;
  }

  function normalize(row) {
    const source = row && typeof row === 'object' ? row : {};
    return {
      ...source,
      competition_id: source.competition_id == null ? null : Number(source.competition_id),
      class_number: text(source.class_number),
      sort_order: source.sort_order == null ? null : Number(source.sort_order),
      class_name: text(source.class_name),
      height_cm: source.height_cm == null ? null : Number(source.height_cm),
      competition_type: text(source.competition_type),
      allowed_time_seconds: source.allowed_time_seconds == null ? null : Number(source.allowed_time_seconds),
      time_limit_seconds: source.time_limit_seconds == null ? null : Number(source.time_limit_seconds),
      jump_off: source.jump_off === true || source.jump_off === 'true',
      entry_fee_bd: source.entry_fee_bd == null ? 0 : Number(source.entry_fee_bd),
      notes: text(source.notes),
      fence_count: source.fence_count == null || source.fence_count === '' ? null : Number(source.fence_count),
      knockdown_fault_value: source.knockdown_fault_value == null ? 4 : Number(source.knockdown_fault_value),
      refusal_fault_value: source.refusal_fault_value == null ? 4 : Number(source.refusal_fault_value),
      refusals_before_elimination: source.refusals_before_elimination == null ? 3 : Number(source.refusals_before_elimination),
      scoring_format: text(source.scoring_format) || 'table_a',
      joker_fence_number: source.joker_fence_number == null || source.joker_fence_number === '' ? null : Number(source.joker_fence_number)
    };
  }

  function validate(input) {
    const row = normalize(input);
    const competitionId = positiveInteger(row.competition_id, 'Competition');
    if (!row.class_number) throw new Error('Class number is required.');
    if (row.class_number.length > CLASS_NUMBER_MAX) throw new Error(`Class number must be ${CLASS_NUMBER_MAX} characters or fewer.`);
    const sortOrder = positiveInteger(row.sort_order, 'Class order', {maximum: 2147483647});
    if (!row.class_name) throw new Error('Class name is required.');
    if (row.class_name.length > CLASS_NAME_MAX) throw new Error(`Class name must be ${CLASS_NAME_MAX} characters or fewer.`);
    const height = positiveInteger(row.height_cm, 'Height', {optionalValue: true, maximum: 32767});
    if (!row.competition_type) throw new Error('Competition type is required.');
    if (row.competition_type.length > COMPETITION_TYPE_MAX) {
      throw new Error(`Competition type must be ${COMPETITION_TYPE_MAX} characters or fewer.`);
    }
    const allowedTime = positiveInteger(row.allowed_time_seconds, 'Allowed time', {optionalValue: true, maximum: 2147483647});
    const timeLimit = positiveInteger(row.time_limit_seconds, 'Time limit', {optionalValue: true, maximum: 2147483647});
    if (allowedTime != null && timeLimit != null && timeLimit < allowedTime) {
      throw new Error('Time limit cannot be less than allowed time.');
    }
    if (row.notes.length > NOTES_MAX) throw new Error(`Notes must be ${NOTES_MAX.toLocaleString()} characters or fewer.`);
    const fenceCount = positiveInteger(row.fence_count, 'Fence count', {optionalValue: true, maximum: 50});
    const knockdownFaultValue = faultValue(row.knockdown_fault_value, 'Knockdown fault value', 4);
    const refusalFaultValue = faultValue(row.refusal_fault_value, 'Refusal fault value', 4);
    const refusalsBeforeElimination = positiveInteger(
      row.refusals_before_elimination, 'Refusals before elimination', {optionalValue: true, maximum: 9}
    ) || 3;
    const scoringFormat = row.scoring_format || 'table_a';
    if (!SCORING_FORMATS.includes(scoringFormat)) throw new Error('Scoring format must be table_a or accumulator_joker.');
    if (scoringFormat === 'accumulator_joker' && fenceCount == null) {
      throw new Error('Accumulator with Joker requires a fence count.');
    }
    const jokerFenceNumber = positiveInteger(row.joker_fence_number, 'Joker fence number', {optionalValue: true, maximum: 50});
    if (jokerFenceNumber != null && (fenceCount == null || jokerFenceNumber > fenceCount)) {
      throw new Error('Joker fence number cannot exceed the fence count.');
    }
    return {
      competition_id: competitionId,
      class_number: row.class_number,
      sort_order: sortOrder,
      class_name: row.class_name,
      height_cm: height,
      competition_type: row.competition_type,
      allowed_time_seconds: allowedTime,
      time_limit_seconds: timeLimit,
      jump_off: Boolean(row.jump_off),
      entry_fee_bd: entryFee(row.entry_fee_bd),
      notes: optional(row.notes),
      fence_count: fenceCount,
      knockdown_fault_value: knockdownFaultValue,
      refusal_fault_value: refusalFaultValue,
      refusals_before_elimination: refusalsBeforeElimination,
      scoring_format: scoringFormat,
      joker_fence_number: jokerFenceNumber
    };
  }

  function canView() {
    return typeof window.canUser !== 'function'
      || window.canUser('show_office.view')
      || window.canUser('show_office.classes.view');
  }

  async function listForCompetition(competitionId) {
    const id = positiveInteger(competitionId, 'Competition');
    const rows = await sbGet(TABLE, `select=*&competition_id=eq.${id}&order=sort_order.asc,id.asc&limit=2000`);
    return (Array.isArray(rows) ? rows : []).map(normalize);
  }

  async function countAll() {
    if (!canView()) throw new Error('Show Office class count requires class view permission.');
    return sbCount(TABLE);
  }

  async function listAll() {
    if (!canView()) throw new Error('Show Office class backup requires class view permission.');
    const rows = [];
    const seenIds = new Set();
    let cursor = '';
    while (true) {
      const after = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : '';
      const page = await sbGet(TABLE, `select=*&order=id.asc${after}&limit=${BACKUP_PAGE_SIZE}`);
      if (!Array.isArray(page)) throw new Error('Supabase returned an invalid class backup page.');
      for (const source of page) {
        const id = text(source?.id);
        if (!id) throw new Error('A class backup page contained a record without an id.');
        if (seenIds.has(id)) throw new Error(`Class backup pagination repeated id ${id}.`);
        seenIds.add(id);
        rows.push(normalize(source));
      }
      if (!page.length) break;
      const nextCursor = text(page[page.length - 1]?.id);
      if (!nextCursor || nextCursor === cursor) throw new Error('Class backup pagination did not advance.');
      cursor = nextCursor;
    }
    return rows;
  }

  async function create(input) {
    const rows = await sbPost(TABLE, validate(input));
    if (!rows?.[0]) throw new Error('The class was saved but no record was returned.');
    return normalize(rows[0]);
  }

  async function update(id, input, before = null) {
    if (!id) throw new Error('Class id is required.');
    const rows = await sbPatch(TABLE, id, validate(input), {before});
    if (!rows?.[0]) throw new Error('The class was not found or could not be updated.');
    return normalize(rows[0]);
  }

  async function remove(id, before = null) {
    if (!id) throw new Error('Class id is required.');
    await sbDel(TABLE, id, {before});
  }

  function validateBackupPayload(payload) {
    if (!Array.isArray(payload)) throw new Error('Show Office backup classes must contain an array.');
    return payload.map((source, index) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        throw new Error(`Class ${index + 1}: record must be an object.`);
      }
      const competitionName = text(source.competition_name);
      const competitionDate = text(source.competition_date);
      if (!competitionName) throw new Error(`Class ${index + 1}: competition_name is required.`);
      if (competitionName.length > 180) throw new Error(`Class ${index + 1}: competition_name must be 180 characters or fewer.`);
      if (!isISODate(competitionDate)) throw new Error(`Class ${index + 1}: a valid competition_date is required.`);
      try {
        const row = validate({...source, competition_id: 1});
        delete row.competition_id;
        return {competition_name: competitionName, competition_date: competitionDate, ...row};
      } catch (error) {
        throw new Error(`Class ${index + 1}: ${error.message}`);
      }
    });
  }

  function backupRows(rows, competitionsById) {
    if (!competitionsById || typeof competitionsById.get !== 'function') {
      throw new Error('Competition lookup is required for class backup.');
    }
    return (Array.isArray(rows) ? rows : []).map((source, index) => {
      const row = normalize(source);
      const competition = competitionsById.get(String(row.competition_id));
      if (!competition) throw new Error(`Class backup row ${index + 1} references an unavailable competition.`);
      const validated = validate(row);
      delete validated.competition_id;
      return {
        competition_name: text(competition.competition_name),
        competition_date: text(competition.competition_date),
        ...validated
      };
    });
  }

  function workbookRows(rows, competitionsById) {
    return backupRows(rows, competitionsById).map(row => ({
      'Competition Name': row.competition_name,
      'Competition Date': row.competition_date,
      'Class Number': row.class_number,
      'Display Order': row.sort_order,
      'Class Name': row.class_name,
      'Height CM': row.height_cm,
      'Competition Type': row.competition_type,
      'Allowed Time Seconds': row.allowed_time_seconds,
      'Time Limit Seconds': row.time_limit_seconds,
      'Jump-Off': row.jump_off ? 'Yes' : 'No',
      'Entry Fee BD': row.entry_fee_bd,
      'Fence Count': row.fence_count,
      'Knockdown Fault Value': row.knockdown_fault_value,
      'Refusal Fault Value': row.refusal_fault_value,
      'Refusals Before Elimination': row.refusals_before_elimination,
      'Scoring Format': row.scoring_format,
      'Joker Fence Number': row.joker_fence_number,
      Notes: row.notes
    }));
  }

  showOffice.classService = Object.freeze({
    TABLE,
    BACKUP_PAGE_SIZE,
    CLASS_NUMBER_MAX,
    CLASS_NAME_MAX,
    COMPETITION_TYPE_MAX,
    NOTES_MAX,
    SCORING_FORMATS,
    normalize,
    validate,
    listForCompetition,
    countAll,
    listAll,
    create,
    update,
    remove,
    validateBackupPayload,
    backupRows,
    workbookRows
  });
})();
