// Show Office UI controller.
// The root entry point is retained for compatibility; persistence and validation live in the module service.
(function () {
  'use strict';

  window.CCE = window.CCE || {};
  const showOffice = window.CCE.showOffice = window.CCE.showOffice || {};
  const LEGACY_STORAGE_KEY = 'cce_show_office_competitions_v1';
  let competitions = [];
  let loading = false;
  let loaded = false;
  let loadPromise = null;
  let loadError = '';

  const service = () => showOffice.competitionService;
  const clean = value => String(value == null ? '' : value).trim();
  const html = value => typeof window.esc === 'function'
    ? window.esc(value)
    : clean(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const attr = value => typeof window.escAttr === 'function' ? window.escAttr(value) : html(value);
  const can = permission => typeof window.canUser === 'function' && window.canUser(permission);
  const canView = () => can('show_office.view') || can('show_office.competitions.view');

  function byId(id) {
    return competitions.find(row => String(row.id) === String(id)) || null;
  }

  function setCompetitions(rows) {
    competitions = (Array.isArray(rows) ? rows : []).map(service().normalize).sort((left, right) =>
      String(right.competition_date).localeCompare(String(left.competition_date))
      || Number(right.id || 0) - Number(left.id || 0)
    );
    if (window.CCE.store) window.CCE.store.set('showOfficeCompetitions', competitions);
    return competitions;
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
    if (/show_office_competitions_name_date_uidx|duplicate key|23505/i.test(message)) {
      return 'A competition with the same name and date already exists.';
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

  function competitionActions(row) {
    const actions = [];
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

    const totals = service().dashboardStats(competitions);
    stats.innerHTML = [
      ['Total Competitions', totals.competitions],
      ['Total Classes', totals.classes],
      ['Total Entries', totals.entries],
      ["Today's Competitions", totals.today]
    ].map(([label, value]) => `<div class="so-stat"><span>${html(label)}</span><strong>${value}</strong></div>`).join('');

    const today = service().bahrainToday();
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
    if (!canView()) {
      count.textContent = '0';
      target.innerHTML = stateHtml('Show Office access is not available for this account.');
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

    const rows = filteredCompetitions();
    count.textContent = rows.length === competitions.length ? String(competitions.length) : `${rows.length} / ${competitions.length}`;
    if (!rows.length) {
      target.innerHTML = '<div class="so-empty"><span>🏅</span><strong>No matching competitions</strong><p>Create a competition or change the filters.</p></div>';
      return;
    }
    target.innerHTML = `<div class="so-competition-cards">${rows.map(competitionCard).join('')}</div><div class="so-table-wrap"><table class="so-table"><thead><tr><th>Competition</th><th>Date</th><th>Venue</th><th>Status</th><th>Officials</th><th>Actions</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td><strong>${html(row.competition_name)}</strong><small>${html(row.organizer || 'Organizer not set')}</small></td>
        <td>${dateLabel(row.competition_date)}</td>
        <td>${html(row.venue || '—')}</td>
        <td><span class="so-status ${statusClass(row.status)}">${html(row.status)}</span></td>
        <td><small>Judge: ${html(row.chief_judge || '—')}</small><small>Designer: ${html(row.course_designer || '—')}</small></td>
        <td><div class="so-actions">${competitionActions(row)}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function render() {
    renderShowOfficeDashboard();
    renderCompetitions();
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
        setCompetitions(await service().list());
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

  function clear() {
    competitions = [];
    loading = false;
    loaded = false;
    loadPromise = null;
    loadError = '';
    if (window.CCE.store) window.CCE.store.set('showOfficeCompetitions', []);
    render();
  }

  function formValue(id) {
    return document.getElementById(id)?.value || '';
  }

  window.openCompetitionEditor = function openCompetitionEditor(id = '') {
    const row = id ? byId(id) : null;
    const permission = row ? 'show_office.competitions.update' : 'show_office.competitions.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const statuses = service().STATUSES.map(status => `<option value="${attr(status)}" ${(row?.status || 'Draft') === status ? 'selected' : ''}>${html(status)}</option>`).join('');
    window.openModal(row ? 'Edit Competition' : 'New Competition', `
      <div class="so-modal-intro"><span>🏆</span><div><strong>${row ? 'Update competition details' : 'Create your first event'}</strong><small>Classes and entries will be added inside this competition.</small></div></div>
      <form id="showOfficeCompetitionForm" onsubmit="event.preventDefault();saveCompetition('${attr(row?.id || '')}')">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1"><label for="so-name">Competition Name *</label><input id="so-name" maxlength="180" required value="${attr(row?.competition_name || '')}" placeholder="Example: CCE Summer Cup 2026"></div>
          <div class="form-group"><label for="so-date">Date *</label><input id="so-date" required type="date" value="${attr(row?.competition_date || service().bahrainToday())}"></div>
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
    const existing = id ? byId(id) : null;
    const permission = existing ? 'show_office.competitions.update' : 'show_office.competitions.create';
    if (!can(permission)) return reportError('Show Office', new Error('Permission denied'));
    const button = document.getElementById('so-save');
    const error = document.getElementById('so-form-error');
    const payload = {
      competition_name: formValue('so-name'),
      competition_date: formValue('so-date'),
      venue: formValue('so-venue'),
      organizer: formValue('so-organizer'),
      chief_judge: formValue('so-judge'),
      course_designer: formValue('so-designer'),
      status: formValue('so-status'),
      notes: formValue('so-notes')
    };
    try {
      if (error) error.style.display = 'none';
      if (button) { button.disabled = true; button.textContent = 'Saving…'; }
      const saved = existing
        ? await service().update(existing.id, payload, existing)
        : await service().create(payload);
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
    const row = byId(id);
    if (!row || !can('show_office.competitions.delete')) return reportError('Show Office', new Error('Permission denied'));
    if (!window.confirm(`Delete “${row.competition_name}” on ${dateLabel(row.competition_date)}?\n\nThis action cannot be undone.`)) return;
    try {
      await service().remove(row.id, row);
      setCompetitions(competitions.filter(item => String(item.id) !== String(row.id)));
      render();
    } catch (error) {
      reportError('Delete competition', error);
    }
  };

  window.renderShowOfficeDashboard = renderShowOfficeDashboard;
  window.renderCompetitions = renderCompetitions;
  window.refreshShowOffice = () => load({force: true});
  showOffice.load = load;
  showOffice.open = () => {
    render();
    if ((!loaded || loadError) && !loading && canView()) load();
  };
  showOffice.clear = clear;
  showOffice.render = render;
  showOffice.getCompetitions = () => competitions.slice();
  // Keep the remote-main localStorage data untouched for compatibility/recovery; it is no longer an active data source.
  showOffice.legacyStorageKey = LEGACY_STORAGE_KEY;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once: true});
  else render();
})();
