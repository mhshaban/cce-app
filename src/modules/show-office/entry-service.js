// Show Office entry domain, permanent registries and persistence service.
// DOM rendering and module-level backup orchestration belong elsewhere.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const TABLE = 'show_office_entries';
  const RIDER_TABLE = 'show_office_riders';
  const HORSE_TABLE = 'show_office_horses';
  const STABLE_TABLE = 'show_office_stables';
  const SAVE_RPC = 'cce_save_show_office_entry';
  const CONTEXT_RPC = 'cce_show_office_entry_context';
  const DIRECTORY_RPC = 'cce_show_office_entry_directory';
  const PAGE_RPC = 'cce_show_office_entries_page';
  const BACKUP_PAGE_SIZE = 1000;
  const NAME_MAX = 180;
  const CLASS_NUMBER_MAX = 30;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const text = value => String(value == null ? '' : value).trim();
  const optional = value => text(value) || null;

  function positiveInteger(value, label) {
    const number = Number(text(value));
    if (!Number.isInteger(number) || number <= 0 || number > 2147483647) {
      throw new Error(`${label} must be a positive whole number.`);
    }
    return number;
  }

  function name(value, label) {
    const result = text(value);
    if (!result) throw new Error(`${label} is required.`);
    if (result.length > NAME_MAX) throw new Error(`${label} must be ${NAME_MAX} characters or fewer.`);
    return result;
  }

  function optionalId(value, label) {
    return text(value) ? positiveInteger(value, label) : null;
  }

  function isISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function uuid(value, label) {
    const result = text(value);
    if (!UUID_RE.test(result)) throw new Error(`${label} must be a valid UUID.`);
    return result.toLowerCase();
  }

  function normalize(row) {
    const source = row && typeof row === 'object' ? row : {};
    return {
      ...source,
      id: source.id == null ? null : Number(source.id),
      class_id: source.class_id == null ? null : Number(source.class_id),
      start_number: source.start_number == null ? null : Number(source.start_number),
      rider_id: source.rider_id == null ? null : Number(source.rider_id),
      rider_name: text(source.rider_name),
      horse_id: source.horse_id == null ? null : Number(source.horse_id),
      horse_name: text(source.horse_name),
      stable_id: source.stable_id == null ? null : Number(source.stable_id),
      stable_name: text(source.stable_name)
    };
  }

  function validate(input) {
    const source = input && typeof input === 'object' ? input : {};
    const riderId = optionalId(source.rider_id, 'Rider');
    const horseId = optionalId(source.horse_id, 'Horse');
    const coreHorseId = optionalId(source.core_horse_id, 'Core horse');
    const stableId = optionalId(source.stable_id, 'Stable or club');
    const riderName = riderId ? null : name(source.rider_name, 'Rider name');
    let horseName = null;
    if (!horseId && !coreHorseId) horseName = name(source.horse_name, 'Horse name');
    const stableName = stableId ? null : optional(source.stable_name);
    if (stableName && stableName.length > NAME_MAX) {
      throw new Error(`Stable or club name must be ${NAME_MAX} characters or fewer.`);
    }
    return {
      class_id: positiveInteger(source.class_id, 'Class'),
      start_number: positiveInteger(source.start_number, 'Start number'),
      rider_id: riderId,
      rider_name: riderName,
      horse_id: horseId,
      core_horse_id: horseId ? null : coreHorseId,
      horse_name: horseName,
      stable_id: stableId,
      stable_name: stableName
    };
  }

  async function context() {
    const rows = await sbRpc(CONTEXT_RPC, {});
    if (!Array.isArray(rows)) throw new Error('Supabase returned an invalid Show Office entry context.');
    return rows.map(row => ({
      competition_id: Number(row.competition_id),
      competition_name: text(row.competition_name),
      competition_date: text(row.competition_date),
      class_id: Number(row.class_id),
      class_number: text(row.class_number),
      class_name: text(row.class_name),
      sort_order: Number(row.sort_order)
    }));
  }

  async function directory(query = '') {
    const value = await sbRpc(DIRECTORY_RPC, {p_query: text(query), p_limit: 100});
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Supabase returned an invalid Show Office entry directory.');
    }
    for (const key of ['riders', 'horses', 'stables', 'core_horses']) {
      if (!Array.isArray(value[key])) throw new Error(`Entry directory ${key} is unavailable.`);
    }
    return {
      riders: value.riders.map(row => ({id:Number(row.id), rider_ref:text(row.rider_ref), rider_name:text(row.rider_name)})),
      horses: value.horses.map(row => ({
        id:Number(row.id), horse_ref:text(row.horse_ref),
        core_horse_id:row.core_horse_id == null ? null : Number(row.core_horse_id), horse_name:text(row.horse_name)
      })),
      stables: value.stables.map(row => ({id:Number(row.id), stable_ref:text(row.stable_ref), stable_name:text(row.stable_name)})),
      core_horses: value.core_horses.map(row => ({id:Number(row.id), horse_name:text(row.horse_name), stable_no:text(row.stable_no)}))
    };
  }

  async function page(classId, {search = '', limit = 100, offset = 0} = {}) {
    const value = await sbRpc(PAGE_RPC, {
      p_class_id: positiveInteger(classId, 'Class'),
      p_search: text(search),
      p_limit: Math.max(1, Math.min(Number(limit) || 100, 200)),
      p_offset: Math.max(0, Number(offset) || 0)
    });
    if (!value || typeof value !== 'object' || !Array.isArray(value.rows)
        || !Number.isInteger(Number(value.total)) || Number(value.total) < 0) {
      throw new Error('Supabase returned an invalid Show Office entry page.');
    }
    return Object.freeze({total:Number(value.total), rows:value.rows.map(normalize)});
  }

  async function countAll() {
    return sbCount(TABLE);
  }

  async function save(id, input) {
    const row = validate(input);
    const value = await sbRpc(SAVE_RPC, {
      p_class_id: row.class_id,
      p_start_number: row.start_number,
      p_entry_id: id ? positiveInteger(id, 'Entry') : null,
      p_rider_id: row.rider_id,
      p_rider_name: row.rider_name,
      p_horse_id: row.horse_id,
      p_core_horse_id: row.core_horse_id,
      p_horse_name: row.horse_name,
      p_stable_id: row.stable_id,
      p_stable_name: row.stable_name
    });
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('The entry was saved but no record was returned.');
    }
    return normalize(value);
  }

  async function remove(id, before = null) {
    if (!id) throw new Error('Entry id is required.');
    await sbDel(TABLE, id, {before});
  }

  async function listEvery(table) {
    const rows = [];
    const seenIds = new Set();
    let cursor = '';
    while (true) {
      const after = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : '';
      const pageRows = await sbGet(table, `select=*&order=id.asc${after}&limit=${BACKUP_PAGE_SIZE}`);
      if (!Array.isArray(pageRows)) throw new Error(`Supabase returned an invalid ${table} backup page.`);
      for (const row of pageRows) {
        const id = text(row?.id);
        if (!id) throw new Error(`${table} backup contained a record without an id.`);
        if (seenIds.has(id)) throw new Error(`${table} backup pagination repeated id ${id}.`);
        seenIds.add(id);
        rows.push(row);
      }
      if (!pageRows.length) break;
      const next = text(pageRows[pageRows.length - 1]?.id);
      if (!next || next === cursor) throw new Error(`${table} backup pagination did not advance.`);
      cursor = next;
    }
    return rows;
  }

  async function listAll() {
    const [riders, horses, stables, entries] = await Promise.all([
      listEvery(RIDER_TABLE), listEvery(HORSE_TABLE), listEvery(STABLE_TABLE), listEvery(TABLE)
    ]);
    return Object.freeze({riders, horses, stables, entries});
  }

  function backupPayload(data, competitionsById, classesById) {
    const source = data && typeof data === 'object' ? data : {};
    const riders = (source.riders || []).map(row => ({
      rider_ref: uuid(row.rider_ref, 'Rider reference'),
      rider_name: name(row.rider_name, 'Rider name')
    }));
    const horses = (source.horses || []).map(row => ({
      horse_ref: uuid(row.horse_ref, 'Horse reference'),
      horse_name: name(row.horse_name, 'Horse name')
    }));
    const stables = (source.stables || []).map(row => ({
      stable_ref: uuid(row.stable_ref, 'Stable reference'),
      stable_name: name(row.stable_name, 'Stable or club name')
    }));
    const ridersById = new Map((source.riders || []).map(row => [String(row.id), row]));
    const horsesById = new Map((source.horses || []).map(row => [String(row.id), row]));
    const stablesById = new Map((source.stables || []).map(row => [String(row.id), row]));
    const entries = (source.entries || []).map((row, index) => {
      const competitionClass = classesById.get(String(row.class_id));
      const competition = competitionClass && competitionsById.get(String(competitionClass.competition_id));
      const rider = ridersById.get(String(row.rider_id));
      const horse = horsesById.get(String(row.horse_id));
      const stable = row.stable_id == null ? null : stablesById.get(String(row.stable_id));
      if (!competitionClass || !competition || !rider || !horse || (row.stable_id != null && !stable)) {
        throw new Error(`Entry backup row ${index + 1} references unavailable Show Office data.`);
      }
      return {
        entry_ref: uuid(row.entry_ref, 'Entry reference'),
        competition_name: name(competition.competition_name, 'Competition name'),
        competition_date: text(competition.competition_date),
        class_number: text(competitionClass.class_number),
        start_number: positiveInteger(row.start_number, 'Start number'),
        rider_ref: uuid(rider.rider_ref, 'Rider reference'),
        horse_ref: uuid(horse.horse_ref, 'Horse reference'),
        stable_ref: stable ? uuid(stable.stable_ref, 'Stable reference') : null
      };
    });
    return Object.freeze({riders, horses, stables, entries});
  }

  function validateBackupPayload(payload) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    for (const key of ['riders', 'horses', 'stables', 'entries']) {
      if (Object.prototype.hasOwnProperty.call(source, key) && !Array.isArray(source[key])) {
        throw new Error(`Show Office backup ${key} must contain an array.`);
      }
    }
    const data = {
      riders: source.riders || [], horses: source.horses || [],
      stables: source.stables || [], entries: source.entries || []
    };
    const riders = data.riders.map((row, index) => {
      try { return {rider_ref:uuid(row?.rider_ref, 'rider_ref'), rider_name:name(row?.rider_name, 'rider_name')}; }
      catch (error) { throw new Error(`Rider ${index + 1}: ${error.message}`); }
    });
    const horses = data.horses.map((row, index) => {
      try { return {horse_ref:uuid(row?.horse_ref, 'horse_ref'), horse_name:name(row?.horse_name, 'horse_name')}; }
      catch (error) { throw new Error(`Horse ${index + 1}: ${error.message}`); }
    });
    const stables = data.stables.map((row, index) => {
      try { return {stable_ref:uuid(row?.stable_ref, 'stable_ref'), stable_name:name(row?.stable_name, 'stable_name')}; }
      catch (error) { throw new Error(`Stable ${index + 1}: ${error.message}`); }
    });
    const entries = data.entries.map((row, index) => {
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('record must be an object.');
        const competitionName = name(row.competition_name, 'competition_name');
        const competitionDate = text(row.competition_date);
        const classNumber = text(row.class_number);
        if (!isISODate(competitionDate)) throw new Error('competition_date must be a valid date.');
        if (!classNumber || classNumber.length > CLASS_NUMBER_MAX) throw new Error('class_number is invalid.');
        return {
          entry_ref:uuid(row.entry_ref, 'entry_ref'), competition_name:competitionName,
          competition_date:competitionDate, class_number:classNumber,
          start_number:positiveInteger(row.start_number, 'start_number'),
          rider_ref:uuid(row.rider_ref, 'rider_ref'), horse_ref:uuid(row.horse_ref, 'horse_ref'),
          stable_ref:text(row.stable_ref) ? uuid(row.stable_ref, 'stable_ref') : null
        };
      } catch (error) { throw new Error(`Entry ${index + 1}: ${error.message}`); }
    });
    return Object.freeze({riders, horses, stables, entries});
  }

  function workbookSheets(payload) {
    return [
      {sheet:'Competition Riders', rows:payload.riders.map(row => ({Reference:row.rider_ref, Rider:row.rider_name}))},
      {sheet:'Competition Horses', rows:payload.horses.map(row => ({Reference:row.horse_ref, Horse:row.horse_name}))},
      {sheet:'Stables and Clubs', rows:payload.stables.map(row => ({Reference:row.stable_ref, 'Stable / Club':row.stable_name}))},
      {sheet:'Competition Entries', rows:payload.entries.map(row => ({
        Reference:row.entry_ref, Competition:row.competition_name, Date:row.competition_date,
        'Class Number':row.class_number, 'Start Number':row.start_number,
        'Rider Reference':row.rider_ref, 'Horse Reference':row.horse_ref,
        'Stable Reference':row.stable_ref
      }))}
    ];
  }

  showOffice.entryService = Object.freeze({
    TABLE,RIDER_TABLE,HORSE_TABLE,STABLE_TABLE,SAVE_RPC,CONTEXT_RPC,DIRECTORY_RPC,PAGE_RPC,
    BACKUP_PAGE_SIZE,NAME_MAX,normalize,validate,context,directory,page,countAll,save,remove,
    listAll,backupPayload,validateBackupPayload,workbookSheets
  });
})();
