// Show Office module orchestration for aggregate backup, restore and workbook export.
// Domain CRUD remains in competition-service.js and class-service.js.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const RESTORE_RPC = 'cce_restore_show_office_module';
  const text = value => String(value == null ? '' : value).trim();

  const competitionService = () => showOffice.competitionService;
  const classService = () => showOffice.classService;

  function servicesReady() {
    if (!competitionService() || !classService()) throw new Error('Show Office domain services are unavailable.');
  }

  async function snapshot() {
    servicesReady();
    const [competitions, classes] = await Promise.all([
      competitionService().listAll(),
      classService().listAll()
    ]);
    const competitionsById = new Map(competitions.map(row => [String(row.id), row]));
    return Object.freeze({competitions, classes, competitionsById});
  }

  async function jsonBackup() {
    const data = await snapshot();
    return {
      competitions: data.competitions,
      classes: classService().backupRows(data.classes, data.competitionsById)
    };
  }

  async function workbookBackup() {
    const data = await snapshot();
    return [
      {
        sheet: 'Competitions',
        rows: data.competitions.map(row => ({
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
      },
      {
        sheet: 'Competition Classes',
        rows: classService().workbookRows(data.classes, data.competitionsById)
      }
    ];
  }

  function validateBackupPayload(payload) {
    servicesReady();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Show Office backup must contain an object.');
    }
    return Object.freeze({
      competitions: competitionService().validateBackupPayload(payload),
      classes: classService().validateBackupPayload(
        Object.prototype.hasOwnProperty.call(payload, 'classes') ? payload.classes : []
      )
    });
  }

  function entitySummary(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Show Office restore returned an invalid ${name} summary.`);
    }
    const result = {
      total: Number(value.total),
      imported: Number(value.imported),
      duplicates: Number(value.duplicates),
      invalid: Number(value.invalid || 0)
    };
    if (!Object.values(result).every(Number.isInteger)
        || Object.values(result).some(number => number < 0)
        || result.imported + result.duplicates + result.invalid !== result.total) {
      throw new Error(`Show Office restore returned inconsistent ${name} totals.`);
    }
    return Object.freeze(result);
  }

  function restoreSummary(value, prepared) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Show Office restore returned an invalid response.');
    }
    const competitions = entitySummary(value.entities?.competitions, 'competition');
    const classes = entitySummary(value.entities?.classes, 'class');
    const result = {
      module: 'showOffice',
      total: Number(value.total),
      imported: Number(value.imported),
      duplicates: Number(value.duplicates),
      invalid: Number(value.invalid || 0),
      entities: Object.freeze({competitions, classes})
    };
    const expectedTotal = prepared.competitions.length + prepared.classes.length;
    if (text(value.module) !== 'showOffice'
        || ![result.total, result.imported, result.duplicates, result.invalid].every(Number.isInteger)
        || [result.total, result.imported, result.duplicates, result.invalid].some(number => number < 0)
        || result.total !== expectedTotal
        || result.imported + result.duplicates + result.invalid !== result.total
        || competitions.total !== prepared.competitions.length
        || classes.total !== prepared.classes.length
        || competitions.total + classes.total !== result.total
        || competitions.imported + classes.imported !== result.imported
        || competitions.duplicates + classes.duplicates !== result.duplicates
        || competitions.invalid + classes.invalid !== result.invalid) {
      throw new Error('Show Office restore returned inconsistent totals.');
    }
    return Object.freeze(result);
  }

  async function restorePrepared(prepared) {
    if (!prepared || !Array.isArray(prepared.competitions) || !Array.isArray(prepared.classes)) {
      throw new Error('Validated Show Office competitions and classes are required.');
    }
    const value = await sbRpc(RESTORE_RPC, {p_payload: prepared});
    return restoreSummary(value, prepared);
  }

  showOffice.moduleService = Object.freeze({
    RESTORE_RPC,
    snapshot,
    jsonBackup,
    workbookBackup,
    validateBackupPayload,
    restorePrepared,
    restoreSummary
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
