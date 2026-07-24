// Show Office module orchestration for aggregate backup, restore and workbook export.
// Domain CRUD remains in competition-service.js, class-service.js, entry-service.js
// and judging-service.js.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const RESTORE_RPC = 'cce_restore_show_office_module';
  const text = value => String(value == null ? '' : value).trim();

  const competitionService = () => showOffice.competitionService;
  const classService = () => showOffice.classService;
  const entryService = () => showOffice.entryService;
  const judgingService = () => showOffice.judgingService;

  function servicesReady() {
    if (!competitionService() || !classService() || !entryService() || !judgingService()) {
      throw new Error('Show Office domain services are unavailable.');
    }
  }

  async function snapshot() {
    servicesReady();
    const [competitions, classes, entryData, judgingData] = await Promise.all([
      competitionService().listAll(),
      classService().listAll(),
      entryService().listAll(),
      judgingService().listAll()
    ]);
    const competitionsById = new Map(competitions.map(row => [String(row.id), row]));
    const classesById = new Map(classes.map(row => [String(row.id), row]));
    const entriesById = new Map(entryData.entries.map(row => [String(row.id), row]));
    return Object.freeze({
      competitions, classes, entryData, judgingData,
      competitionsById, classesById, entriesById
    });
  }

  async function jsonBackup() {
    const data = await snapshot();
    const entries = entryService().backupPayload(
      data.entryData, data.competitionsById, data.classesById
    );
    const judging = judgingService().backupPayload(
      data.judgingData, data.competitionsById, data.classesById, data.entriesById
    );
    return {
      competitions: data.competitions,
      classes: classService().backupRows(data.classes, data.competitionsById),
      ...entries,
      ...judging
    };
  }

  async function workbookBackup() {
    const data = await snapshot();
    const entryPayload = entryService().backupPayload(
      data.entryData, data.competitionsById, data.classesById
    );
    const judgingPayload = judgingService().backupPayload(
      data.judgingData, data.competitionsById, data.classesById, data.entriesById
    );
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
    ]
      .concat(entryService().workbookSheets(entryPayload))
      .concat(judgingService().workbookSheets(judgingPayload));
  }

  function validateBackupPayload(payload) {
    servicesReady();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Show Office backup must contain an object.');
    }
    const entryPayload = entryService().validateBackupPayload(payload);
    const judgingPayload = judgingService().validateBackupPayload(payload);
    return Object.freeze({
      competitions: competitionService().validateBackupPayload(payload),
      classes: classService().validateBackupPayload(
        Object.prototype.hasOwnProperty.call(payload, 'classes') ? payload.classes : []
      ),
      ...entryPayload,
      ...judgingPayload
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
    const riders = entitySummary(value.entities?.riders, 'rider');
    const horses = entitySummary(value.entities?.horses, 'horse');
    const stables = entitySummary(value.entities?.stables, 'stable');
    const entries = entitySummary(value.entities?.entries, 'entry');
    const judging = entitySummary(value.entities?.judging, 'judging');
    const scores = entitySummary(value.entities?.scores, 'score');
    const result = {
      module: 'showOffice',
      total: Number(value.total),
      imported: Number(value.imported),
      duplicates: Number(value.duplicates),
      invalid: Number(value.invalid || 0),
      entities: Object.freeze({
        competitions, classes, riders, horses, stables, entries, judging, scores
      })
    };
    const expectedTotal = prepared.competitions.length + prepared.classes.length
      + prepared.riders.length + prepared.horses.length + prepared.stables.length
      + prepared.entries.length + prepared.judging.length + prepared.scores.length;
    if (text(value.module) !== 'showOffice'
        || ![result.total, result.imported, result.duplicates, result.invalid].every(Number.isInteger)
        || [result.total, result.imported, result.duplicates, result.invalid].some(number => number < 0)
        || result.total !== expectedTotal
        || result.imported + result.duplicates + result.invalid !== result.total
        || competitions.total !== prepared.competitions.length
        || classes.total !== prepared.classes.length
        || riders.total !== prepared.riders.length
        || horses.total !== prepared.horses.length
        || stables.total !== prepared.stables.length
        || entries.total !== prepared.entries.length
        || judging.total !== prepared.judging.length
        || scores.total !== prepared.scores.length
        || competitions.total + classes.total + riders.total + horses.total
          + stables.total + entries.total + judging.total + scores.total !== result.total
        || competitions.imported + classes.imported + riders.imported + horses.imported
          + stables.imported + entries.imported + judging.imported + scores.imported
          !== result.imported
        || competitions.duplicates + classes.duplicates + riders.duplicates + horses.duplicates
          + stables.duplicates + entries.duplicates + judging.duplicates + scores.duplicates
          !== result.duplicates
        || competitions.invalid + classes.invalid + riders.invalid + horses.invalid
          + stables.invalid + entries.invalid + judging.invalid + scores.invalid
          !== result.invalid) {
      throw new Error('Show Office restore returned inconsistent totals.');
    }
    return Object.freeze(result);
  }

  async function restorePrepared(prepared) {
    if (!prepared || ![
      'competitions','classes','riders','horses','stables','entries','judging','scores'
    ]
      .every(key => Array.isArray(prepared[key]))) {
      throw new Error('Validated Show Office module data is required.');
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
