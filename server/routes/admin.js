// server/routes/admin.js — QS platform admin endpoints (F2-F5).
// All routes scoped to /admin and require an authenticated qs_admin session.

const express = require('express');
const bcrypt = require('bcryptjs');
const { db, requireAuth, requireRole, notify } = require('../lib/helpers');
const { orgName } = require('../lib/shapes');

const router = express.Router();
router.use('/admin', requireAuth, requireRole('qs_admin'));

// ---------------------------------------------------------------------------
// F2. Platform analytics
// ---------------------------------------------------------------------------

router.get('/admin/stats', (req, res) => {
  const users = { student: 0, employer: 0, university_admin: 0, total: 0 };
  for (const r of db.prepare('SELECT role, COUNT(*) n FROM users GROUP BY role').all()) {
    if (Object.prototype.hasOwnProperty.call(users, r.role)) users[r.role] = r.n;
    users.total += r.n;
  }

  const universities = { approved: 0, pending: 0 };
  for (const r of db.prepare('SELECT status, COUNT(*) n FROM universities GROUP BY status').all()) {
    if (Object.prototype.hasOwnProperty.call(universities, r.status)) universities[r.status] = r.n;
  }

  const companies = db.prepare('SELECT COUNT(*) n FROM companies').get().n;

  const roles = {
    open: db.prepare("SELECT COUNT(*) n FROM roles WHERE status = 'open' AND hidden = 0").get().n,
    closed: db.prepare("SELECT COUNT(*) n FROM roles WHERE status = 'closed' AND hidden = 0").get().n,
    hidden: db.prepare('SELECT COUNT(*) n FROM roles WHERE hidden = 1').get().n,
  };

  const appStatuses = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
  const applications_by_status = {};
  for (const st of appStatuses) {
    applications_by_status[st] = db.prepare('SELECT COUNT(*) n FROM applications WHERE status = ?').get(st).n;
  }

  const placements_approved = db.prepare('SELECT COUNT(*) n FROM applications WHERE placement_approved = 1').get().n;
  const posts = db.prepare('SELECT COUNT(*) n FROM posts').get().n;
  const events = db.prepare('SELECT COUNT(*) n FROM events').get().n;
  const latest_signups = db.prepare(
    'SELECT name, role, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 5'
  ).all();
  // F9: "Reports generated" counter for the admin dashboard.
  const reports_generated = db.prepare(
    "SELECT COUNT(*) n FROM activity_log WHERE activity_type = 'report_generated'"
  ).get().n;

  res.json({
    users,
    universities,
    companies,
    roles,
    applications_by_status,
    placements_approved,
    posts,
    events,
    latest_signups,
    reports_generated,
  });
});

// ---------------------------------------------------------------------------
// F3. User & org management
// ---------------------------------------------------------------------------

router.get('/admin/users', (req, res) => {
  const { role, search } = req.query;
  let sql = `
    SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
           un.name AS uni_name, c.name AS company_name
    FROM users u
    LEFT JOIN universities un ON un.id = u.university_id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE 1 = 1
  `;
  const params = [];
  if (role) { sql += ' AND u.role = ?'; params.push(role); }
  if (search) { sql += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY u.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    org_name: r.uni_name || r.company_name || null,
    active: !!r.active,
    created_at: r.created_at,
  })));
});

router.patch('/admin/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const { active } = req.body || {};
  if (active !== 0 && active !== 1) return res.status(400).json({ error: 'active must be 0 or 1' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });

  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, user.id);

  const org = user.university_id
    ? db.prepare('SELECT name FROM universities WHERE id = ?').get(user.university_id)
    : user.company_id
      ? db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id)
      : null;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    org_name: org ? org.name : null,
    active: !!active,
    created_at: user.created_at,
  });
});

// ---------------------------------------------------------------------------
// F4. Content moderation
// ---------------------------------------------------------------------------

router.get('/admin/content', (req, res) => {
  const posts = db.prepare(`
    SELECT p.id, u.name AS author_name, p.org_type, p.org_id, p.body, p.hidden, p.created_at
    FROM posts p JOIN users u ON u.id = p.author_user_id
    ORDER BY p.created_at DESC
  `).all().map(p => ({
    id: p.id,
    author_name: p.author_name,
    org_name: p.org_type ? orgName(p.org_type, p.org_id) : null,
    body: p.body,
    hidden: !!p.hidden,
    created_at: p.created_at,
  }));

  const roles = db.prepare(`
    SELECT r.id, r.title, c.name AS company_name, r.status, r.hidden, r.created_at
    FROM roles r JOIN companies c ON c.id = r.company_id
    ORDER BY r.created_at DESC
  `).all().map(r => ({
    id: r.id,
    title: r.title,
    company_name: r.company_name,
    status: r.status,
    hidden: !!r.hidden,
    created_at: r.created_at,
  }));

  const events = db.prepare(`
    SELECT id, org_type, org_id, title, date, hidden FROM events ORDER BY date DESC
  `).all().map(e => ({
    id: e.id,
    title: e.title,
    org_name: orgName(e.org_type, e.org_id),
    date: e.date,
    hidden: !!e.hidden,
  }));

  res.json({ posts, roles, events });
});

const CONTENT_TABLES = { post: 'posts', role: 'roles', event: 'events' };

router.patch('/admin/content/:type/:id', (req, res) => {
  const table = CONTENT_TABLES[req.params.type];
  if (!table) return res.status(400).json({ error: 'type must be post, role or event' });

  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { hidden } = req.body || {};
  if (hidden !== 0 && hidden !== 1) return res.status(400).json({ error: 'hidden must be 0 or 1' });

  db.prepare(`UPDATE ${table} SET hidden = ? WHERE id = ?`).run(hidden, row.id);
  res.json({ ...row, hidden: !!hidden });
});

// ---------------------------------------------------------------------------
// F5. University management
// ---------------------------------------------------------------------------

router.get('/admin/universities', (req, res) => {
  const rows = db.prepare('SELECT * FROM universities ORDER BY qs_rank ASC').all();
  const result = rows.map(u => ({
    ...u,
    student_count: db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'student' AND university_id = ?").get(u.id).n,
    admin_count: db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'university_admin' AND university_id = ?").get(u.id).n,
  }));
  res.json(result);
});

router.post('/admin/universities', (req, res) => {
  const { name, city, country, qs_rank, employer_reputation, employment_outcomes, admin_name, admin_email, password } = req.body || {};
  if (!name || !city || !country || !admin_name || !admin_email) {
    return res.status(400).json({ error: 'name, city, country, admin_name and admin_email are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(admin_email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const finalPassword = password || 'demo123';
  const passwordHash = bcrypt.hashSync(finalPassword, 10);

  const uniR = db.prepare(`
    INSERT INTO universities (name, city, country, qs_rank, employer_reputation, employment_outcomes, status)
    VALUES (?,?,?,?,?,?,'approved')
  `).run(name, city, country, qs_rank ?? null, employer_reputation ?? null, employment_outcomes ?? null);

  db.prepare(`
    INSERT INTO users (role, email, password_hash, name, university_id)
    VALUES ('university_admin', ?,?,?,?)
  `).run(admin_email, passwordHash, admin_name, uniR.lastInsertRowid);

  const university = db.prepare('SELECT * FROM universities WHERE id = ?').get(uniR.lastInsertRowid);
  res.json({ university, admin: { email: admin_email, password: finalPassword } });
});

router.patch('/admin/universities/:id', (req, res) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id);
  if (!uni) return res.status(404).json({ error: 'Not found' });

  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'invalid status' });

  db.prepare('UPDATE universities SET status = ? WHERE id = ?').run(status, uni.id);

  if (status === 'approved') {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'university_admin' AND university_id = ?").all(uni.id);
    for (const a of admins) {
      notify(a.id, 'generic', `${uni.name} has been approved by QS and is now live on QS Connect`, '/university');
    }
  }

  res.json(db.prepare('SELECT * FROM universities WHERE id = ?').get(uni.id));
});

module.exports = router;
