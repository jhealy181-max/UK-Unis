'use strict';

/* ===========================================================
   InternLink UK — vanilla JS SPA
   Hash-routed, no frameworks, no build step.
   =========================================================== */

const LS_KEY = 'internlink_uid';
const API_BASE = '/api';

const state = {
  user: null,
  notifications: [],
  notifOpen: false,
};

/* ---------------- API helper ---------------- */

async function api(path, opts) {
  opts = opts || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const uid = localStorage.getItem(LS_KEY);
  if (uid) headers['x-user-id'] = uid;
  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
  } catch (err) {
    throw new Error('Network error — is the server running?');
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = null; }
  }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function apiGet(path) { return api(path); }
function apiPost(path, body) { return api(path, { method: 'POST', body: JSON.stringify(body || {}) }); }
function apiPatch(path, body) { return api(path, { method: 'PATCH', body: JSON.stringify(body || {}) }); }

/* ---------------- utilities ---------------- */

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function nl2br(str) { return escapeHtml(str).replace(/\n/g, '<br>'); }

function pick(obj, keys, fallback) {
  if (!obj) return fallback;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function statusPill(status) {
  const s = String(status || '').toLowerCase();
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  return `<span class="pill pill-${s || 'applied'}">${label}</span>`;
}

function loadingHtml() { return `<div class="spinner-wrap">Loading…</div>`; }

function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text || '')}</p></div>`;
}

function errHtml(app, err) { app.innerHTML = emptyState('⚠️', 'Something went wrong', err.message); }

function toast(message, type) {
  const root = document.getElementById('toast-root');
  const div = document.createElement('div');
  div.className = 'toast' + (type ? ' ' + type : '');
  div.textContent = message;
  root.appendChild(div);
  setTimeout(() => {
    div.style.transition = 'opacity .25s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 250);
  }, 3200);
}

function bellSvg() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
}

/* ---------------- notifications ---------------- */

async function loadNotifications() {
  try { state.notifications = await apiGet('/notifications') || []; }
  catch (e) { state.notifications = []; }
  if (!Array.isArray(state.notifications)) state.notifications = state.notifications.notifications || [];
}

/* ---------------- nav ---------------- */

function renderNav() {
  const root = document.getElementById('nav-root');
  const user = state.user;
  document.body.dataset.role = user ? user.role : '';

  if (!user) {
    root.innerHTML = `<div class="navbar"><div class="navbar-inner">
      <div class="brand"><span class="brand-mark">IL</span> InternLink UK</div>
    </div></div>`;
    return;
  }

  const unread = state.notifications.filter((n) => !n.read).length;

  root.innerHTML = `<div class="navbar"><div class="navbar-inner">
    <div class="brand" data-action="goto" data-hash="#/dashboard" style="cursor:pointer;">
      <span class="brand-mark">IL</span> InternLink UK
    </div>
    <div class="spacer"></div>
    <div class="nav-actions">
      <span class="role-badge">${escapeHtml(user.role)}</span>
      <div class="user-chip">
        <div class="user-avatar">${initials(user.name)}</div>
        <div class="user-name">${escapeHtml(user.name)}</div>
      </div>
      <div class="bell-wrap">
        <button class="icon-btn" data-action="toggle-bell" title="Notifications" aria-label="Notifications">
          ${bellSvg()}
          ${unread ? `<span class="badge-count">${unread > 9 ? '9+' : unread}</span>` : ''}
        </button>
        ${state.notifOpen ? renderNotifDropdown() : ''}
      </div>
      <button class="btn" data-action="reset-demo">Reset demo data</button>
      <button class="btn" data-action="signout">Sign out</button>
    </div>
  </div></div>`;
}

function renderNotifDropdown() {
  const items = state.notifications;
  const unread = items.filter((n) => !n.read).length;
  return `<div class="dropdown">
    <div class="dropdown-header">
      <span>Notifications</span>
      ${unread ? `<button data-action="mark-read">Mark all as read</button>` : ''}
    </div>
    <div class="dropdown-list">
      ${items.length ? items.map((n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <span class="notif-dot ${n.read ? 'read' : ''}"></span>
          <div class="notif-text">${escapeHtml(n.message)}<div class="notif-time">${fmtDateTime(n.created_at)}</div></div>
        </div>`).join('') : `<div class="empty-mini">You're all caught up.</div>`}
    </div>
  </div>`;
}

/* ---------------- tabs ---------------- */

const TABS = {
  student: [
    { key: 'dashboard', label: 'Dashboard', hash: '#/dashboard' },
    { key: 'browse', label: 'Browse internships', hash: '#/browse' },
    { key: 'applications', label: 'My applications', hash: '#/applications' },
  ],
  employer: [
    { key: 'dashboard', label: 'Dashboard', hash: '#/dashboard' },
    { key: 'postings', label: 'My postings', hash: '#/postings' },
    { key: 'new', label: 'New posting', hash: '#/postings/new' },
  ],
  university: [
    { key: 'dashboard', label: 'Overview', hash: '#/dashboard' },
    { key: 'students', label: 'Students', hash: '#/university/students' },
    { key: 'approvals', label: 'Approvals', hash: '#/university/approvals' },
  ],
};

function tabsHtml(activeKey) {
  const tabs = TABS[state.user.role] || [];
  return `<div class="tabs">${tabs.map((t) => `<button class="tab ${t.key === activeKey ? 'active' : ''}" data-action="goto" data-hash="${t.hash}">${t.label}</button>`).join('')}</div>`;
}

/* ---------------- modal ---------------- */

function modalShell(inner) {
  return `<div class="modal-backdrop" data-action="close-modal-backdrop">
    <div class="modal">
      <button class="modal-close" data-action="close-modal" aria-label="Close">✕</button>
      ${inner}
    </div>
  </div>`;
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

function getEmployerInfo(item, detail) {
  const nested = item.employer || (detail && detail.employer) || {};
  return {
    name: pick(nested, ['name'], null) || pick(item, ['employer_name', 'company'], 'Employer'),
    sector: pick(nested, ['sector'], null) || pick(item, ['employer_sector'], ''),
    location: pick(nested, ['location'], null) || pick(item, ['employer_location'], ''),
    description: pick(nested, ['description'], null) || pick(item, ['employer_description'], ''),
  };
}

async function openInternshipModal(id) {
  const modalRoot = document.getElementById('modal-root');
  modalRoot.innerHTML = modalShell(loadingHtml());
  let detail;
  try { detail = await apiGet(`/internships/${id}`); }
  catch (err) { modalRoot.innerHTML = modalShell(emptyState('⚠️', 'Could not load internship', err.message)); return; }

  const item = detail.internship || detail;
  const employer = getEmployerInfo(item, detail);
  const myStatus = pick(item, ['my_application_status'], null);
  const already = !!myStatus;

  modalRoot.innerHTML = modalShell(`
    <h2>${escapeHtml(pick(item, ['title'], 'Untitled role'))}</h2>
    <div class="sub muted">${escapeHtml(employer.name)}${employer.sector ? ' · ' + escapeHtml(employer.sector) : ''}${employer.location ? ' · ' + escapeHtml(employer.location) : ''}</div>
    <div class="detail-meta-grid">
      <div class="detail-meta-item"><div class="label">Location</div><div class="value">${escapeHtml(pick(item, ['location'], '—'))}</div></div>
      <div class="detail-meta-item"><div class="label">Duration</div><div class="value">${escapeHtml(String(pick(item, ['duration_weeks'], '—')))} weeks</div></div>
      <div class="detail-meta-item"><div class="label">Hours</div><div class="value">${escapeHtml(String(pick(item, ['hours_total'], '—')))}h</div></div>
      <div class="detail-meta-item"><div class="label">Pay</div><div class="value">${pick(item, ['paid'], 0) ? escapeHtml(pick(item, ['stipend'], 'Paid')) : 'Unpaid'}</div></div>
      <div class="detail-meta-item"><div class="label">Deadline</div><div class="value">${fmtDate(pick(item, ['deadline'], null))}</div></div>
      <div class="detail-meta-item"><div class="label">Sector</div><div class="value">${escapeHtml(pick(item, ['sector'], '—'))}</div></div>
    </div>
    <hr class="divider">
    <h3>About this role</h3>
    <p>${nl2br(pick(item, ['description'], ''))}</p>
    ${pick(item, ['requirements'], '') ? `<h3>Requirements</h3><p>${nl2br(pick(item, ['requirements'], ''))}</p>` : ''}
    <hr class="divider">
    ${already ? `
      <div class="card" style="background:var(--accent-bg);border-color:transparent;">
        <strong>You've already applied</strong> — status: ${statusPill(myStatus)}
      </div>
    ` : `
      <h3>Apply for this internship</h3>
      <form id="apply-form">
        <div class="form-row">
          <label for="cover-note">Cover note</label>
          <textarea class="input" id="cover-note" placeholder="Tell the employer why you're a great fit…" required></textarea>
        </div>
        <button class="btn btn-primary btn-block" type="submit">Submit application</button>
      </form>
    `}
  `);

  if (!already) {
    const form = document.getElementById('apply-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = document.getElementById('cover-note').value.trim();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Submitting…';
      try {
        await apiPost('/applications', { internship_id: Number(id), cover_note: note });
        toast('Application submitted!', 'success');
        closeModal();
        route();
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false; btn.textContent = 'Submit application';
      }
    });
  }
}

/* ---------------- login / landing ---------------- */

async function renderLogin(app) {
  app.innerHTML = `
    <div class="hero">
      <div class="brand-mark">IL</div>
      <h1>Internships, matched across UK universities.</h1>
      <p>InternLink UK connects students seeking placements, employers offering real-world experience, and university teams tracking work-experience requirements — all in one place.</p>
    </div>
    <div id="accounts-root" class="role-columns"><div class="spinner-wrap">Loading demo accounts…</div></div>
  `;
  try {
    const accounts = await apiGet('/accounts');
    document.getElementById('accounts-root').innerHTML = [
      accountCol('student', 'Students', '🎓', 'Apply for placements and track your work-experience hours.', accounts.students, (a) => `${a.university} · ${a.course}`),
      accountCol('employer', 'Employers', '🏢', 'Post internships and manage your applicant pipeline.', accounts.employers, (a) => a.company),
      accountCol('university', 'Universities', '🏛️', 'Approve placements and monitor student requirements.', accounts.universities, (a) => a.university),
    ].join('');
  } catch (err) {
    document.getElementById('accounts-root').innerHTML = emptyState('⚠️', "Couldn't load demo accounts", err.message);
  }
}

function accountCol(role, title, icon, desc, list, metaFn) {
  return `<div class="role-col role-${role}">
    <div class="role-col-head"><div class="role-col-icon">${icon}</div><div class="role-col-title">${title}</div></div>
    <div class="role-col-desc">${desc}</div>
    ${(list && list.length) ? list.map((a) => `
      <button class="account-item" data-action="select-account" data-id="${a.id}">
        <span><span class="name">${escapeHtml(a.name)}</span><span class="meta">${escapeHtml(metaFn(a) || '')}</span></span>
        <span class="arrow">→</span>
      </button>`).join('') : `<div class="empty-mini">No demo accounts yet.</div>`}
  </div>`;
}

/* ---------------- student: dashboard ---------------- */

async function renderStudentDashboard(app) {
  app.innerHTML = loadingHtml();
  let me, apps;
  try {
    [me, apps] = await Promise.all([apiGet('/me'), apiGet('/my/applications')]);
  } catch (err) { return errHtml(app, err); }
  apps = Array.isArray(apps) ? apps : (apps.applications || []);

  const counts = {};
  apps.forEach((a) => { const s = pick(a, ['status'], 'applied'); counts[s] = (counts[s] || 0) + 1; });

  const hoursCompleted = Number(pick(me, ['hours_completed'], 0)) || 0;
  const requiredHours = Number(pick(me, ['required_hours'], 0)) || 0;
  const met = !!pick(me, ['requirement_met'], 0);
  const pct = requiredHours ? Math.min(100, Math.round((hoursCompleted / requiredHours) * 100)) : 0;
  const statusOrder = ['applied', 'shortlisted', 'offer', 'accepted', 'approved', 'completed', 'rejected', 'withdrawn'];

  app.innerHTML = `
    <div class="page-header">
      <div><h1>Welcome back, ${escapeHtml(String(me.name).split(' ')[0])}</h1>
      <div class="sub">${escapeHtml(pick(me, ['university_name', 'university'], ''))}${pick(me, ['course'], '') ? ' · ' + escapeHtml(pick(me, ['course'], '')) : ''}</div></div>
    </div>
    ${tabsHtml('dashboard')}
    <div class="grid-stats">
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${apps.length}</div><div class="stat-label">Total applications</div></div>
      <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-value">${counts.offer || 0}</div><div class="stat-label">Offers received</div></div>
      <div class="stat-card"><div class="stat-icon">💼</div><div class="stat-value">${(counts.accepted || 0) + (counts.approved || 0)}</div><div class="stat-label">Active placements</div></div>
      <div class="stat-card"><div class="stat-icon">🏁</div><div class="stat-value">${counts.completed || 0}</div><div class="stat-label">Completed</div></div>
    </div>
    <div class="two-col">
      <div class="card">
        <h3>Applications by status</h3>
        ${apps.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">${statusOrder.filter((s) => counts[s]).map((s) => `<span class="pill pill-${s}">${s} · ${counts[s]}</span>`).join('')}</div>` : `<p class="muted">No applications yet — head to Browse internships to get started.</p>`}
      </div>
      <div class="card">
        <h3>Work-experience progress</h3>
        <div class="progress-track"><div class="progress-fill ${met ? 'met' : ''}" style="width:${pct}%"></div></div>
        <div class="progress-text"><span>${hoursCompleted} / ${requiredHours} hours</span><span>${pct}%</span></div>
        <div style="margin-top:12px;">${met ? `<span class="pill pill-met">Requirement met</span>` : `<span class="pill pill-unmet">In progress</span>`}</div>
      </div>
    </div>
  `;
}

/* ---------------- student: browse ---------------- */

async function renderBrowse(app) {
  app.innerHTML = `
    <div class="page-header"><h1>Browse internships</h1></div>
    ${tabsHtml('browse')}
    <div id="browse-filters"></div>
    <div id="browse-results">${loadingHtml()}</div>
  `;
  document.getElementById('browse-filters').innerHTML = `
    <div class="filter-bar">
      <input class="input search-input" type="search" id="f-search" placeholder="Search title or keyword…">
      <select class="input" id="f-sector"><option value="">All sectors</option></select>
      <select class="input" id="f-location"><option value="">All locations</option></select>
      <select class="input" id="f-paid">
        <option value="">Paid &amp; unpaid</option>
        <option value="1">Paid only</option>
        <option value="0">Unpaid only</option>
      </select>
    </div>`;

  let debounceTimer;
  const trigger = () => loadBrowseResults(false);
  document.getElementById('f-search').addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(trigger, 300); });
  document.getElementById('f-sector').addEventListener('change', trigger);
  document.getElementById('f-location').addEventListener('change', trigger);
  document.getElementById('f-paid').addEventListener('change', trigger);

  await loadBrowseResults(true);
}

function fillSelect(id, values, allLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">${allLabel}</option>` + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  sel.value = current;
}

async function loadBrowseResults(initial) {
  const resultsRoot = document.getElementById('browse-results');
  if (!resultsRoot) return;
  const search = document.getElementById('f-search').value.trim();
  const sector = document.getElementById('f-sector').value;
  const location = document.getElementById('f-location').value;
  const paid = document.getElementById('f-paid').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sector) params.set('sector', sector);
  if (location) params.set('location', location);
  if (paid) params.set('paid', paid);

  resultsRoot.innerHTML = loadingHtml();
  let data;
  try { data = await apiGet('/internships' + (params.toString() ? `?${params}` : '')); }
  catch (err) { resultsRoot.innerHTML = emptyState('⚠️', 'Could not load internships', err.message); return; }

  const list = Array.isArray(data) ? data : (data.internships || data.items || data.results || []);
  let sectors = (!Array.isArray(data) && data.sectors) || [];
  let locations = (!Array.isArray(data) && data.locations) || [];
  if (initial) {
    if (!sectors.length) sectors = [...new Set(list.map((i) => pick(i, ['sector'], null)).filter(Boolean))];
    if (!locations.length) locations = [...new Set(list.map((i) => pick(i, ['location'], null)).filter(Boolean))];
    fillSelect('f-sector', sectors, 'All sectors');
    fillSelect('f-location', locations, 'All locations');
  }

  if (!list.length) { resultsRoot.innerHTML = emptyState('🔍', 'No internships match your filters', 'Try broadening your search or clearing filters.'); return; }
  resultsRoot.innerHTML = `<div class="grid-cards">${list.map(internshipCard).join('')}</div>`;
}

function internshipCard(item) {
  const id = pick(item, ['id'], '');
  const title = pick(item, ['title'], 'Untitled role');
  const employer = pick(item, ['employer_name', 'company', 'employer'], 'Employer');
  const location = pick(item, ['location'], '—');
  const duration = pick(item, ['duration_weeks'], '—');
  const hours = pick(item, ['hours_total'], '—');
  const paid = pick(item, ['paid'], 0);
  const deadline = pick(item, ['deadline'], null);
  const myStatus = pick(item, ['my_application_status'], null);
  return `<div class="ship-card" data-action="open-internship" data-id="${id}">
    <div class="ship-title">${escapeHtml(title)}</div>
    <div class="ship-employer">${escapeHtml(employer)}</div>
    <div class="ship-meta">
      <span>📍 ${escapeHtml(String(location))}</span>
      <span>⏱️ ${escapeHtml(String(duration))} wks</span>
      <span>🕒 ${escapeHtml(String(hours))}h</span>
      <span>${paid ? '<span class="pill pill-paid">Paid</span>' : '<span class="pill pill-unpaid">Unpaid</span>'}</span>
    </div>
    <div class="ship-foot">
      <span class="ship-deadline">Deadline ${fmtDate(deadline)}</span>
      ${myStatus ? statusPill(myStatus) : ''}
    </div>
  </div>`;
}

/* ---------------- student: my applications ---------------- */

async function renderMyApplications(app) {
  app.innerHTML = `<div class="page-header"><h1>My applications</h1></div>${tabsHtml('applications')}<div id="apps-root">${loadingHtml()}</div>`;
  const root = document.getElementById('apps-root');
  let apps;
  try { apps = await apiGet('/my/applications'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load applications', err.message); return; }
  apps = Array.isArray(apps) ? apps : (apps.applications || []);
  if (!apps.length) { root.innerHTML = emptyState('📄', 'No applications yet', 'Browse open internships and submit your first application.'); return; }
  root.innerHTML = `<div class="grid-cards">${apps.map(applicationCard).join('')}</div>`;
}

function applicationCard(a) {
  const id = pick(a, ['id'], '');
  const title = pick(a, ['title', 'internship_title'], 'Untitled role');
  const employer = pick(a, ['employer_name', 'company', 'employer'], 'Employer');
  const location = pick(a, ['location'], '');
  const status = pick(a, ['status'], 'applied');
  const applied = pick(a, ['applied_at'], null);
  const canAccept = status === 'offer';
  const canWithdraw = ['applied', 'shortlisted', 'offer'].includes(status);
  return `<div class="ship-card" style="cursor:default;">
    <div class="ship-foot" style="margin-top:0;"><div class="ship-title">${escapeHtml(title)}</div>${statusPill(status)}</div>
    <div class="ship-employer">${escapeHtml(employer)}${location ? ' · ' + escapeHtml(location) : ''}</div>
    <div class="faint">Applied ${fmtDate(applied)}</div>
    ${(canAccept || canWithdraw) ? `<div class="applicant-actions">
      ${canAccept ? `<button class="btn btn-primary btn-sm" data-action="accept-offer" data-id="${id}">Accept offer</button>` : ''}
      ${canWithdraw ? `<button class="btn btn-danger btn-sm" data-action="withdraw-app" data-id="${id}">Withdraw</button>` : ''}
    </div>` : ''}
  </div>`;
}

/* ---------------- employer: dashboard ---------------- */

async function renderEmployerDashboard(app) {
  app.innerHTML = `<div class="page-header"><h1>Employer dashboard</h1></div>${tabsHtml('dashboard')}<div id="emp-dash-root">${loadingHtml()}</div>`;
  const root = document.getElementById('emp-dash-root');
  let postings;
  try { postings = await apiGet('/employer/internships'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load dashboard', err.message); return; }
  postings = Array.isArray(postings) ? postings : (postings.internships || []);

  const postingsCount = postings.length;
  const totalApplicants = postings.reduce((sum, p) => sum + (Number(pick(p, ['applicant_count'], 0)) || 0), 0);

  let offers = 0;
  const withApplicants = postings.filter((p) => (Number(pick(p, ['applicant_count'], 0)) || 0) > 0);
  try {
    const results = await Promise.all(withApplicants.map((p) => apiGet(`/internships/${pick(p, ['id'])}/applications`).catch(() => [])));
    results.forEach((list) => {
      const arr = Array.isArray(list) ? list : (list.applications || []);
      offers += arr.filter((a) => pick(a, ['status'], '') === 'offer').length;
    });
  } catch (e) { /* best effort */ }

  root.innerHTML = `
    <div class="grid-stats">
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${postingsCount}</div><div class="stat-label">Active postings</div></div>
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${totalApplicants}</div><div class="stat-label">Total applicants</div></div>
      <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-value">${offers}</div><div class="stat-label">Offers out</div></div>
    </div>
    <div class="section-title">Recent postings</div>
    ${postings.length ? `<div class="grid-cards">${postings.slice(0, 6).map(postingCard).join('')}</div>` : emptyState('📋', 'No postings yet', 'Create your first internship posting to start receiving applications.')}
  `;
}

function postingCard(p) {
  const id = pick(p, ['id'], '');
  const title = pick(p, ['title'], 'Untitled role');
  const status = pick(p, ['status'], 'open');
  const applicantCount = Number(pick(p, ['applicant_count'], 0)) || 0;
  return `<div class="ship-card" data-action="goto" data-hash="#/postings/${id}/applicants">
    <div class="ship-foot" style="margin-top:0;"><div class="ship-title">${escapeHtml(title)}</div><span class="pill pill-${status}">${escapeHtml(status)}</span></div>
    <div class="ship-meta">
      <span>📍 ${escapeHtml(pick(p, ['location'], '—'))}</span>
      <span>🏷️ ${escapeHtml(pick(p, ['sector'], '—'))}</span>
      <span>👥 ${applicantCount} applicant${applicantCount === 1 ? '' : 's'}</span>
    </div>
    <div class="ship-foot">
      <span class="ship-deadline">Deadline ${fmtDate(pick(p, ['deadline'], null))}</span>
      ${status === 'open' ? `<button class="btn btn-sm btn-danger" data-action="close-posting" data-id="${id}">Close</button>` : ''}
    </div>
  </div>`;
}

/* ---------------- employer: postings list ---------------- */

async function renderPostings(app) {
  app.innerHTML = `<div class="page-header"><h1>My postings</h1><button class="btn btn-primary" data-action="goto" data-hash="#/postings/new">+ New posting</button></div>${tabsHtml('postings')}<div id="postings-root">${loadingHtml()}</div>`;
  const root = document.getElementById('postings-root');
  let postings;
  try { postings = await apiGet('/employer/internships'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load postings', err.message); return; }
  postings = Array.isArray(postings) ? postings : (postings.internships || []);
  if (!postings.length) { root.innerHTML = emptyState('📋', 'No postings yet', 'Create your first internship posting to start receiving applications.'); return; }
  root.innerHTML = `<div class="grid-cards">${postings.map(postingCard).join('')}</div>`;
}

/* ---------------- employer: new posting ---------------- */

async function renderNewPosting(app) {
  app.innerHTML = `
    <div class="page-header"><h1>New posting</h1></div>
    ${tabsHtml('new')}
    <div class="card" style="max-width:640px;">
      <form id="posting-form">
        <div class="form-row"><label>Title</label><input class="input" name="title" required placeholder="e.g. Marketing Intern"></div>
        <div class="form-grid">
          <div class="form-row"><label>Sector</label><input class="input" name="sector" required placeholder="e.g. Marketing"></div>
          <div class="form-row"><label>Location</label><input class="input" name="location" required placeholder="e.g. Manchester"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>Duration (weeks)</label><input class="input" type="number" name="duration_weeks" min="1" required></div>
          <div class="form-row"><label>Total hours</label><input class="input" type="number" name="hours_total" min="1" required></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>Deadline</label><input class="input" type="date" name="deadline" required></div>
          <div class="form-row"><label>Stipend (optional)</label><input class="input" name="stipend" placeholder="e.g. £250/week"></div>
        </div>
        <div class="form-row"><label class="checkbox-row"><input type="checkbox" name="paid"> This role is paid</label></div>
        <div class="form-row"><label>Description</label><textarea class="input" name="description" required placeholder="What will the intern be doing?"></textarea></div>
        <div class="form-row"><label>Requirements (optional)</label><textarea class="input" name="requirements" placeholder="Skills, year of study, etc."></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Publish posting</button>
      </form>
    </div>
  `;

  document.getElementById('posting-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: String(fd.get('title') || '').trim(),
      sector: String(fd.get('sector') || '').trim(),
      location: String(fd.get('location') || '').trim(),
      duration_weeks: Number(fd.get('duration_weeks')),
      hours_total: Number(fd.get('hours_total')),
      paid: fd.get('paid') ? 1 : 0,
      stipend: fd.get('stipend') ? String(fd.get('stipend')).trim() : null,
      description: String(fd.get('description') || '').trim(),
      requirements: fd.get('requirements') ? String(fd.get('requirements')).trim() : null,
      deadline: fd.get('deadline'),
    };
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      await apiPost('/internships', body);
      toast('Posting published!', 'success');
      location.hash = '#/postings';
      route();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Publish posting';
    }
  });
}

/* ---------------- employer: applicants ---------------- */

async function renderApplicants(app, internshipId) {
  app.innerHTML = `<div id="applicants-root">${loadingHtml()}</div>`;
  const root = document.getElementById('applicants-root');
  let detail, apps;
  try {
    [detail, apps] = await Promise.all([
      apiGet(`/internships/${internshipId}`),
      apiGet(`/internships/${internshipId}/applications`),
    ]);
  } catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load applicants', err.message); return; }

  const item = detail.internship || detail;
  apps = Array.isArray(apps) ? apps : (apps.applications || []);

  root.innerHTML = `
    <div class="page-header">
      <div><h1>${escapeHtml(pick(item, ['title'], 'Posting'))}</h1><div class="sub">${escapeHtml(pick(item, ['location'], ''))} · ${apps.length} applicant${apps.length === 1 ? '' : 's'}</div></div>
      <button class="btn" data-action="goto" data-hash="#/postings">← Back to postings</button>
    </div>
    ${apps.length ? apps.map(applicantCard).join('') : emptyState('👥', 'No applicants yet', 'Check back once students start applying.')}
  `;
}

function applicantCard(a) {
  const id = pick(a, ['id'], '');
  const name = pick(a, ['student_name', 'name'], 'Student');
  const uni = pick(a, ['university_name', 'university'], '');
  const course = pick(a, ['course'], '');
  const year = pick(a, ['year'], '');
  const skillsRaw = pick(a, ['skills'], '');
  const skills = String(skillsRaw).split(',').map((s) => s.trim()).filter(Boolean);
  const hours = pick(a, ['hours_completed'], 0);
  const note = pick(a, ['cover_note'], '');
  const status = pick(a, ['status'], 'applied');

  let actions = '';
  if (status === 'applied') {
    actions = `
      <button class="btn btn-primary btn-sm" data-action="app-shortlist" data-id="${id}">Shortlist</button>
      <button class="btn btn-danger btn-sm" data-action="app-reject" data-id="${id}">Reject</button>`;
  } else if (status === 'shortlisted') {
    actions = `
      <button class="btn btn-primary btn-sm" data-action="app-offer" data-id="${id}">Make offer</button>
      <button class="btn btn-danger btn-sm" data-action="app-reject" data-id="${id}">Reject</button>`;
  }

  return `<div class="applicant-card">
    <div class="applicant-top">
      <div><div class="applicant-name">${escapeHtml(name)}</div><div class="applicant-sub">${escapeHtml(uni)}${course ? ' · ' + escapeHtml(course) : ''}${year ? ' · Year ' + escapeHtml(String(year)) : ''}</div></div>
      ${statusPill(status)}
    </div>
    <div class="applicant-meta"><span>🕒 ${escapeHtml(String(hours))}h completed</span></div>
    ${skills.length ? `<div>${skills.map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
    ${note ? `<div class="applicant-note">${nl2br(note)}</div>` : ''}
    ${actions ? `<div class="applicant-actions">${actions}</div>` : ''}
  </div>`;
}

async function patchApplication(id, status, successMsg) {
  try {
    await apiPatch(`/applications/${id}`, { status });
    toast(successMsg, 'success');
    route();
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------------- university: overview ---------------- */

async function renderUniOverview(app) {
  app.innerHTML = `<div class="page-header"><h1>University overview</h1></div>${tabsHtml('dashboard')}<div id="uni-root">${loadingHtml()}</div>`;
  const root = document.getElementById('uni-root');
  let ov;
  try { ov = await apiGet('/university/overview'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load overview', err.message); return; }

  const total = pick(ov, ['total_students', 'students_total', 'student_count'], 0);
  const active = pick(ov, ['active_placements', 'students_with_active_placement', 'active_placement_count'], 0);
  const pending = pick(ov, ['pending_approvals', 'pending_approval_count'], 0);
  const met = pick(ov, ['requirement_met_count', 'requirement_met'], 0);

  root.innerHTML = `
    <div class="grid-stats">
      <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-value">${total}</div><div class="stat-label">Total students</div></div>
      <div class="stat-card"><div class="stat-icon">💼</div><div class="stat-value">${active}</div><div class="stat-label">Active placements</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${pending}</div><div class="stat-label">Pending approvals</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${met}</div><div class="stat-label">Requirement met</div></div>
    </div>
    <div class="empty-state"><div class="icon">📊</div><h3>Manage your cohort</h3><p>Use the Students and Approvals tabs above to review placements and sign off on work-experience hours.</p></div>
  `;
}

/* ---------------- university: students ---------------- */

async function renderUniStudents(app) {
  app.innerHTML = `<div class="page-header"><h1>Students</h1></div>${tabsHtml('students')}<div id="uni-students-root">${loadingHtml()}</div>`;
  const root = document.getElementById('uni-students-root');
  let students;
  try { students = await apiGet('/university/students'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load students', err.message); return; }
  students = Array.isArray(students) ? students : (students.students || []);
  if (!students.length) { root.innerHTML = emptyState('🎓', 'No students found', ''); return; }
  root.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Student</th><th>Course</th><th>Year</th><th>Hours progress</th><th>Requirement</th><th>Applications</th><th></th></tr></thead>
    <tbody>${students.map(studentRow).join('')}</tbody>
  </table></div>`;
}

function studentRow(s) {
  const userId = pick(s, ['user_id', 'id'], '');
  const name = pick(s, ['name'], 'Student');
  const course = pick(s, ['course'], '—');
  const year = pick(s, ['year'], '—');
  const hours = Number(pick(s, ['hours_completed'], 0)) || 0;
  const required = Number(pick(s, ['required_hours'], 0)) || 0;
  const met = !!pick(s, ['requirement_met'], 0);
  const pct = required ? Math.min(100, Math.round((hours / required) * 100)) : 0;
  const appsRaw = pick(s, ['applications', 'applications_summary', 'apps'], []);
  const apps = Array.isArray(appsRaw) ? appsRaw : [];
  return `<tr>
    <td><strong>${escapeHtml(name)}</strong></td>
    <td>${escapeHtml(String(course))}</td>
    <td>${escapeHtml(String(year))}</td>
    <td style="min-width:160px;">
      <div class="progress-track"><div class="progress-fill ${met ? 'met' : ''}" style="width:${pct}%"></div></div>
      <div class="progress-text"><span>${hours}/${required}h</span><span>${pct}%</span></div>
    </td>
    <td>${met ? `<span class="pill pill-met">Met</span>` : `<span class="pill pill-unmet">Not met</span>`}</td>
    <td>${apps.length ? apps.map((a) => statusPill(pick(a, ['status'], 'applied'))).join(' ') : '<span class="faint">None</span>'}</td>
    <td><button class="btn btn-sm" data-action="toggle-requirement" data-id="${userId}" data-met="${met ? 1 : 0}">${met ? 'Mark not met' : 'Mark met'}</button></td>
  </tr>`;
}

/* ---------------- university: approvals ---------------- */

async function renderUniApprovals(app) {
  app.innerHTML = `<div class="page-header"><h1>Approvals</h1></div>${tabsHtml('approvals')}<div id="uni-approvals-root">${loadingHtml()}</div>`;
  const root = document.getElementById('uni-approvals-root');
  let students;
  try { students = await apiGet('/university/students'); }
  catch (err) { root.innerHTML = emptyState('⚠️', 'Could not load approvals', err.message); return; }
  students = Array.isArray(students) ? students : (students.students || []);

  const pending = [];
  const approved = [];
  students.forEach((s) => {
    const name = pick(s, ['name'], 'Student');
    const appsRaw = pick(s, ['applications', 'applications_summary', 'apps'], []);
    const apps = Array.isArray(appsRaw) ? appsRaw : [];
    apps.forEach((a) => {
      const status = pick(a, ['status'], '');
      const enriched = Object.assign({}, a, { _student: name });
      if (status === 'accepted') pending.push(enriched);
      else if (status === 'approved') approved.push(enriched);
    });
  });

  root.innerHTML = `
    <div class="section-title">Pending approvals</div>
    ${pending.length ? pending.map((a) => approvalRow(a, 'approve')).join('') : emptyState('⏳', 'No pending approvals', 'Accepted placements awaiting your sign-off will appear here.')}
    <div class="section-title">Approved placements</div>
    ${approved.length ? approved.map((a) => approvalRow(a, 'complete')).join('') : emptyState('💼', 'No approved placements yet', '')}
  `;
}

function approvalRow(a, kind) {
  const id = pick(a, ['id', 'application_id'], '');
  const title = pick(a, ['title', 'internship_title'], 'Internship');
  const employer = pick(a, ['employer', 'employer_name', 'company'], 'Employer');
  return `<div class="applicant-card">
    <div class="applicant-top">
      <div><div class="applicant-name">${escapeHtml(a._student)}</div><div class="applicant-sub">${escapeHtml(title)} · ${escapeHtml(employer)}</div></div>
      ${statusPill(pick(a, ['status'], ''))}
    </div>
    <div class="applicant-actions">
      ${kind === 'approve'
        ? `<button class="btn btn-primary btn-sm" data-action="uni-approve" data-id="${id}">Approve</button>`
        : `<button class="btn btn-primary btn-sm" data-action="uni-complete" data-id="${id}">Mark completed</button>`}
    </div>
  </div>`;
}

/* ---------------- router ---------------- */

async function route() {
  state.notifOpen = false;
  renderNav();
  const app = document.getElementById('app');
  if (!state.user) { renderLogin(app); return; }

  let path = location.hash.replace(/^#\/?/, '');
  if (!path) { location.hash = '#/dashboard'; return; }
  const segs = path.split('/');

  try {
    if (state.user.role === 'student') {
      if (segs[0] === 'dashboard') return await renderStudentDashboard(app);
      if (segs[0] === 'browse') return await renderBrowse(app);
      if (segs[0] === 'applications') return await renderMyApplications(app);
    } else if (state.user.role === 'employer') {
      if (segs[0] === 'dashboard') return await renderEmployerDashboard(app);
      if (segs[0] === 'postings' && segs[1] === 'new') return await renderNewPosting(app);
      if (segs[0] === 'postings' && segs[1] && segs[2] === 'applicants') return await renderApplicants(app, segs[1]);
      if (segs[0] === 'postings') return await renderPostings(app);
    } else if (state.user.role === 'university') {
      if (segs[0] === 'dashboard') return await renderUniOverview(app);
      if (segs[0] === 'university' && segs[1] === 'students') return await renderUniStudents(app);
      if (segs[0] === 'university' && segs[1] === 'approvals') return await renderUniApprovals(app);
    }
    location.hash = '#/dashboard';
  } catch (err) {
    errHtml(app, err);
  }
}

function goto(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

/* ---------------- global click delegation ---------------- */

document.addEventListener('click', async (e) => {
  if (state.notifOpen && !e.target.closest('.bell-wrap')) {
    state.notifOpen = false;
    renderNav();
  }

  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;
  const id = t.dataset.id;

  switch (action) {
    case 'goto':
      goto(t.dataset.hash);
      break;

    case 'select-account':
      localStorage.setItem(LS_KEY, id);
      try {
        state.user = await apiGet('/me');
        await loadNotifications();
        toast(`Welcome, ${String(state.user.name).split(' ')[0]}!`, 'success');
        goto('#/dashboard');
      } catch (err) {
        localStorage.removeItem(LS_KEY);
        toast(err.message, 'error');
      }
      break;

    case 'signout':
      localStorage.removeItem(LS_KEY);
      state.user = null;
      state.notifications = [];
      state.notifOpen = false;
      location.hash = '';
      route();
      break;

    case 'reset-demo':
      if (!confirm('Reset all demo data? This cannot be undone.')) break;
      try {
        await apiPost('/reset', {});
        localStorage.removeItem(LS_KEY);
        location.reload();
      } catch (err) { toast(err.message, 'error'); }
      break;

    case 'toggle-bell':
      state.notifOpen = !state.notifOpen;
      if (state.notifOpen) await loadNotifications();
      renderNav();
      break;

    case 'mark-read':
      try { await apiPost('/notifications/read', {}); } catch (err) { toast(err.message, 'error'); }
      await loadNotifications();
      renderNav();
      break;

    case 'open-internship':
      await openInternshipModal(id);
      break;

    case 'close-modal':
      closeModal();
      break;

    case 'close-modal-backdrop':
      if (e.target === t) closeModal();
      break;

    case 'accept-offer':
      try { await apiPatch(`/applications/${id}`, { status: 'accepted' }); toast('Offer accepted!', 'success'); route(); }
      catch (err) { toast(err.message, 'error'); }
      break;

    case 'withdraw-app':
      if (!confirm('Withdraw this application?')) break;
      try { await apiPatch(`/applications/${id}`, { status: 'withdrawn' }); toast('Application withdrawn'); route(); }
      catch (err) { toast(err.message, 'error'); }
      break;

    case 'close-posting':
      if (!confirm('Close this posting? It will no longer accept applications.')) break;
      try { await apiPatch(`/internships/${id}`, { status: 'closed' }); toast('Posting closed'); route(); }
      catch (err) { toast(err.message, 'error'); }
      break;

    case 'app-shortlist':
      await patchApplication(id, 'shortlisted', 'Applicant shortlisted');
      break;

    case 'app-offer':
      await patchApplication(id, 'offer', 'Offer sent');
      break;

    case 'app-reject':
      if (!confirm('Reject this applicant?')) break;
      await patchApplication(id, 'rejected', 'Applicant rejected');
      break;

    case 'toggle-requirement': {
      const newVal = t.dataset.met === '1' ? 0 : 1;
      try { await apiPatch(`/university/students/${id}`, { requirement_met: newVal }); toast('Updated', 'success'); route(); }
      catch (err) { toast(err.message, 'error'); }
      break;
    }

    case 'uni-approve':
      await patchApplication(id, 'approved', 'Placement approved');
      break;

    case 'uni-complete':
      await patchApplication(id, 'completed', 'Placement marked completed');
      break;
  }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ---------------- boot ---------------- */

async function boot() {
  const uid = localStorage.getItem(LS_KEY);
  if (uid) {
    try {
      state.user = await apiGet('/me');
      await loadNotifications();
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
  }
  window.addEventListener('hashchange', route);
  route();
}

document.addEventListener('DOMContentLoaded', boot);
