// Show Office competition domain and persistence service.
// No DOM access belongs in this file.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const TABLE = 'show_office_competitions';
  const RESTORE_RPC = 'cce_restore_show_office_competitions';
  const BACKUP_PAGE_SIZE = 1000;
  const STATUSES = Object.freeze(['Draft', 'Open', 'Running', 'Finished']);
  const BACKUP_FIELDS = Object.freeze([
    'competition_name', 'competition_date', 'venue', 'organizer', 'chief_judge',
    'course_designer', 'status', 'notes'
  ]);

  const text = value => String(value == null ? '' : value).trim();
  const optional = value => text(value) || null;

  function isISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function normalize(row) {
    const source = row && typeof row === 'object' ? row : {};
    return {
      ...source,
      competition_name: text(source.competition_name),
      competition_date: text(source.competition_date),
      venue: text(source.venue),
      organizer: text(source.organizer),
      chief_judge: text(source.chief_judge),
      course_designer: text(source.course_designer),
      status: STATUSES.includes(source.status) ? source.status : 'Draft',
      notes: text(source.notes)
    };
  }

  function validate(input) {
    const requestedStatus = text(input?.status) || 'Draft';
    if (!STATUSES.includes(requestedStatus)) throw new Error('Select a valid competition status.');
    const row = normalize({...input, status: requestedStatus});
    if (!row.competition_name) throw new Error('Competition name is required.');
    if (row.competition_name.length > 180) throw new Error('Competition name must be 180 characters or fewer.');
    if (!isISODate(row.competition_date)) throw new Error('A valid competition date is required.');
    for (const [label, value] of [
      ['Venue', row.venue], ['Organizer', row.organizer], ['Chief Judge', row.chief_judge],
      ['Course Designer', row.course_designer]
    ]) {
      if (value.length > 180) throw new Error(`${label} must be 180 characters or fewer.`);
    }
    if (row.notes.length > 4000) throw new Error('Notes must be 4,000 characters or fewer.');
    return {
      competition_name: row.competition_name,
      competition_date: row.competition_date,
      venue: optional(row.venue),
      organizer: optional(row.organizer),
      chief_judge: optional(row.chief_judge),
      course_designer: optional(row.course_designer),
      status: row.status,
      notes: optional(row.notes)
    };
  }

  function bahrainToday() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bahrain', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = type => parts.find(item => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  function dashboardStats(rows, today = bahrainToday()) {
    const competitions = Array.isArray(rows) ? rows : [];
    return {
      competitions: competitions.length,
      classes: 0,
      entries: 0,
      today: competitions.filter(row => row.competition_date === today).length
    };
  }

  async function list() {
    const rows = await sbGet(TABLE, 'select=*&order=competition_date.desc,id.desc&limit=2000');
    return (Array.isArray(rows) ? rows : []).map(normalize);
  }

  async function listAll() {
    if (typeof window.canUser === 'function'
      && !window.canUser('show_office.view')
      && !window.canUser('show_office.competitions.view')) {
      throw new Error('Show Office backup requires competition view permission.');
    }
    const rows = [];
    const seenIds = new Set();
    let cursor = '';
    while (true) {
      const after = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : '';
      const page = await sbGet(TABLE, `select=*&order=id.asc${after}&limit=${BACKUP_PAGE_SIZE}`);
      if (!Array.isArray(page)) throw new Error('Supabase returned an invalid competition backup page.');
      for (const source of page) {
        const id = text(source?.id);
        if (!id) throw new Error('A competition backup page contained a record without an id.');
        if (seenIds.has(id)) throw new Error(`Competition backup pagination repeated id ${id}.`);
        seenIds.add(id);
        rows.push(normalize(source));
      }
      if (!page.length) break;
      const nextCursor = text(page[page.length - 1]?.id);
      if (!nextCursor || nextCursor === cursor) throw new Error('Competition backup pagination did not advance.');
      cursor = nextCursor;
    }
    return rows;
  }

  async function create(input) {
    const rows = await sbPost(TABLE, validate(input));
    if (!rows?.[0]) throw new Error('The competition was saved but no record was returned.');
    return normalize(rows[0]);
  }

  async function update(id, input, before = null) {
    if (!id) throw new Error('Competition id is required.');
    const rows = await sbPatch(TABLE, id, validate(input), {before});
    if (!rows?.[0]) throw new Error('The competition was not found or could not be updated.');
    return normalize(rows[0]);
  }

  async function remove(id, before = null) {
    if (!id) throw new Error('Competition id is required.');
    await sbDel(TABLE, id, {before});
  }

  function validateBackupPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Show Office backup must contain an object.');
    }
    if (!Array.isArray(payload.competitions)) {
      throw new Error('Show Office backup must contain a competitions array.');
    }
    return payload.competitions.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Competition ${index + 1}: record must be an object.`);
      }
      for (const field of BACKUP_FIELDS) {
        if (row[field] != null && typeof row[field] !== 'string') {
          throw new Error(`Competition ${index + 1}: ${field} must be text.`);
        }
      }
      try {
        // validate() deliberately returns only writable domain fields. IDs, timestamps and
        // audit identities from a file never cross the restore boundary.
        return validate(row);
      } catch (error) {
        throw new Error(`Competition ${index + 1}: ${error.message}`);
      }
    });
  }

  function restoreSummary(result, expectedTotal) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Show Office restore returned an invalid response.');
    }
    const summary = {
      module: 'showOffice',
      total: Number(result.total),
      imported: Number(result.imported),
      duplicates: Number(result.duplicates),
      invalid: Number(result.invalid || 0)
    };
    if (![summary.total, summary.imported, summary.duplicates, summary.invalid].every(Number.isInteger)
        || summary.total !== expectedTotal
        || summary.imported < 0 || summary.duplicates < 0 || summary.invalid < 0
        || summary.imported + summary.duplicates + summary.invalid !== summary.total) {
      throw new Error('Show Office restore returned inconsistent totals.');
    }
    return Object.freeze(summary);
  }

  async function restorePrepared(prepared) {
    if (!Array.isArray(prepared)) throw new Error('Validated Show Office competitions are required.');
    if (!prepared.length) return restoreSummary({total: 0, imported: 0, duplicates: 0, invalid: 0}, 0);
    const result = await sbRpc(RESTORE_RPC, {p_competitions: prepared});
    return restoreSummary(result, prepared.length);
  }

  async function restoreBackup(payload) {
    return restorePrepared(validateBackupPayload(payload));
  }

  async function jsonBackup() {
    return {competitions: await listAll()};
  }

  async function workbookBackup() {
    const rows = await listAll();
    return {
      sheet: 'Competitions',
      rows: rows.map(row => ({
        ID: row.id,
        'Competition Name': row.competition_name,
        'Competition Date': row.competition_date,
        Venue: row.venue,
        Organizer: row.organizer,
        'Chief Judge': row.chief_judge,
        'Course Designer': row.course_designer,
        Status: row.status,
        Notes: row.notes,
        'Created At': row.created_at,
        'Updated At': row.updated_at
      }))
    };
  }

  showOffice.competitionService = Object.freeze({
    TABLE,
    RESTORE_RPC,
    BACKUP_PAGE_SIZE,
    STATUSES,
    normalize,
    validate,
    dashboardStats,
    bahrainToday,
    list,
    listAll,
    create,
    update,
    remove,
    validateBackupPayload,
    restoreBackup,
    jsonBackup,
    workbookBackup
  });
  window.CCE.backupProviders = window.CCE.backupProviders || {};
  window.CCE.backupProviders.showOffice = workbookBackup;
  window.CCE.jsonBackupProviders = window.CCE.jsonBackupProviders || {};
  window.CCE.jsonBackupProviders.showOffice = jsonBackup;
  window.CCE.restoreProviders = window.CCE.restoreProviders || {};
  window.CCE.restoreProviders.showOffice = Object.freeze({
    validate: validateBackupPayload,
    restore: restorePrepared
  });
})();
