// CCE StableOS — backward-compatible backup restore orchestration.
// Domain modules validate and restore their own payloads through registered providers.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const LEGACY_TABLES = Object.freeze(['income', 'expenses', 'horses', 'breeding', 'schedule', 'instructors']);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  async function collectJsonModules() {
    const modules = {};
    for (const [name, provider] of Object.entries(window.CCE.jsonBackupProviders || {})) {
      if (typeof provider !== 'function') {
        throw new Error(`Backup failed for module “${name}”: provider is not configured correctly.`);
      }
      try {
        const payload = await provider();
        if (payload === undefined) throw new Error('provider returned no data');
        modules[name] = payload;
      } catch (error) {
        throw new Error(`Backup failed for module “${name}”: ${error?.message || error}`);
      }
    }
    return modules;
  }

  async function createJsonBackup(base) {
    if (!isRecord(base)) throw new Error('Backup base must contain a JSON object.');
    return {...base, modules: await collectJsonModules()};
  }

  function plan(data) {
    if (!isRecord(data)) throw new Error('Backup must contain a JSON object.');
    const tables = LEGACY_TABLES.filter(table => Array.isArray(data[table]));
    let modulePayloads = {};
    if (own(data, 'modules')) {
      if (!isRecord(data.modules)) throw new Error('Backup modules must contain a JSON object.');
      modulePayloads = data.modules;
    }

    const providers = window.CCE.restoreProviders || {};
    const modules = [];
    for (const [name, provider] of Object.entries(providers)) {
      if (!own(modulePayloads, name)) continue;
      if (!provider || typeof provider.validate !== 'function' || typeof provider.restore !== 'function') {
        throw new Error(`Restore provider “${name}” is not configured correctly.`);
      }
      modules.push({name, provider, prepared: provider.validate(modulePayloads[name])});
    }

    if (!tables.length && !modules.length) throw new Error('No restorable tables or modules were found in this backup.');
    return Object.freeze({
      version: String(data.version || ''),
      data,
      tables: Object.freeze(tables),
      modules: Object.freeze(modules),
      ignoredModules: Object.freeze(Object.keys(modulePayloads).filter(name => !own(providers, name)))
    });
  }

  async function execute(restorePlan) {
    if (!restorePlan || !Array.isArray(restorePlan.tables) || !Array.isArray(restorePlan.modules)) {
      throw new Error('A validated backup restore plan is required.');
    }

    // Module providers run first so permission or database failures do not follow legacy writes.
    const modules = [];
    for (const item of restorePlan.modules) {
      modules.push(await item.provider.restore(item.prepared));
    }

    let legacyImported = 0;
    let legacyFailed = 0;
    for (const table of restorePlan.tables) {
      const rows = restorePlan.data[table];
      for (const source of rows) {
        const row = {...source};
        delete row.id;
        try {
          await sbPost(table, row, {skipAudit: true});
          legacyImported += 1;
        } catch (error) {
          legacyFailed += 1;
          console.warn('[CCE] restore skipped', table, error?.message || error);
        }
      }
    }

    return Object.freeze({
      legacy: Object.freeze({
        tables: restorePlan.tables.slice(),
        imported: legacyImported,
        failed: legacyFailed
      }),
      modules,
      ignoredModules: restorePlan.ignoredModules.slice()
    });
  }

  window.CCE.backupRuntime = Object.freeze({collectJsonModules, createJsonBackup});
  window.CCE.backupRestore = Object.freeze({LEGACY_TABLES, plan, execute});
})();
