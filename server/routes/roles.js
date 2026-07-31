const express = require('express');
const { db, requireAuth, requireRole, matchForStudent, requiredSkillsForRole, notify, toBindable } = require('../lib/helpers');

const router = express.Router();

function roleCard(role, viewerUser) {
  const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(role.company_id);
  const card = {
    id: role.id,
    company_id: role.company_id,
    title: role.title,
    type: role.type,
    sector: role.sector,
    location: role.location,
    remote: role.remote,
    paid: role.paid,
    sponsors_visa: role.sponsors_visa,
    deadline: role.deadline,
    status: role.status,
    hidden: !!role.hidden,
    created_at: role.created_at,
    company,
  };
  if (viewerUser && viewerUser.role === 'student') {
    card.match = matchForStudent(viewerUser.id, role);
    const app = db.prepare('SELECT status FROM applications WHERE role_id = ? AND student_user_id = ?').get(role.id, viewerUser.id);
    card.my_application_status = app ? app.status : null;
    card.invited = !!db.prepare('SELECT 1 FROM role_invites WHERE role_id = ? AND student_user_id = ?').get(role.id, viewerUser.id);
  }
  return card;
}

router.get('/roles', requireAuth, (req, res) => {
  const { search, type, sector, location, remote, sponsors_visa } = req.query;

  let sql = "SELECT * FROM roles WHERE status = 'open' AND hidden = 0";
  const params = [];
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (sector) { sql += ' AND sector = ?'; params.push(sector); }
  if (location) { sql += ' AND location = ?'; params.push(location); }
  if (remote !== undefined) { sql += ' AND remote = ?'; params.push(remote === 'true' || remote === '1' ? 1 : 0); }
  if (sponsors_visa !== undefined) { sql += ' AND sponsors_visa = ?'; params.push(sponsors_visa === 'true' || sponsors_visa === '1' ? 1 : 0); }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  let cards = rows.map(r => roleCard(r, req.user));
  if (req.user.role === 'student') {
    cards.sort((a, b) => b.match.score - a.match.score);
  }

  const allOpen = db.prepare("SELECT DISTINCT sector, location FROM roles WHERE status = 'open' AND hidden = 0").all();
  const sectors = [...new Set(allOpen.map(r => r.sector))].sort();
  const locations = [...new Set(allOpen.map(r => r.location))].sort();

  res.json({ roles: cards, sectors, locations });
});

router.get('/roles/:id', requireAuth, (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  const isOwner = req.user.role === 'employer' && req.user.company_id === role.company_id;
  const isAdmin = req.user.role === 'qs_admin';
  if (role.hidden && !isOwner && !isAdmin) return res.status(404).json({ error: 'Not found' });
  const card = roleCard(role, req.user);
  const applicantCount = db.prepare('SELECT COUNT(*) n FROM applications WHERE role_id = ?').get(role.id).n;
  res.json({
    ...card,
    description: role.description,
    required_skills: requiredSkillsForRole(role.id).map(s => ({ name: s.name, weight: s.weight })),
    applicant_count: applicantCount,
  });
});

router.post('/roles', requireAuth, requireRole('employer'), (req, res) => {
  const { title, type, sector, location, remote, paid, description, sponsors_visa, deadline, skills } = req.body || {};
  if (!title || !type || !sector || !location || !description || !deadline) {
    return res.status(400).json({ error: 'title, type, sector, location, description, deadline are required' });
  }
  if (!['internship', 'placement', 'graduate'].includes(type)) {
    return res.status(400).json({ error: 'invalid type' });
  }

  const r = db.prepare(`
    INSERT INTO roles (company_id, title, type, sector, location, remote, paid, description, sponsors_visa, deadline)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(req.user.company_id, title, type, sector, location, remote ? 1 : 0, paid || null, description, sponsors_visa ? 1 : 0, deadline);

  if (Array.isArray(skills)) {
    const ins = db.prepare('INSERT INTO role_skills (role_id, skill_id, weight) VALUES (?,?,?)');
    for (const s of skills) {
      ins.run(r.lastInsertRowid, s.skill_id, s.weight === 'high' ? 'high' : 'medium');
    }
  }

  res.json(db.prepare('SELECT * FROM roles WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/roles/:id', requireAuth, requireRole('employer'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.company_id !== req.user.company_id) return res.status(403).json({ error: 'Forbidden' });

  const fields = ['title', 'type', 'sector', 'location', 'remote', 'paid', 'description', 'sponsors_visa', 'deadline', 'status'];
  const updates = {};
  for (const f of fields) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) updates[f] = toBindable(req.body[f]);
  }
  if (updates.status && !['open', 'closed'].includes(updates.status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE roles SET ${setClause} WHERE id = ?`).run(...keys.map(k => updates[k]), role.id);
  }
  res.json(db.prepare('SELECT * FROM roles WHERE id = ?').get(role.id));
});

router.get('/employer/roles', requireAuth, requireRole('employer'), (req, res) => {
  const roles = db.prepare('SELECT * FROM roles WHERE company_id = ? ORDER BY created_at DESC').all(req.user.company_id);
  const statuses = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];
  const result = roles.map(role => {
    const counts = {};
    for (const st of statuses) {
      counts[st] = db.prepare('SELECT COUNT(*) n FROM applications WHERE role_id = ? AND status = ?').get(role.id, st).n;
    }
    return { ...role, counts };
  });
  res.json(result);
});

router.get('/roles/:id/matches', requireAuth, requireRole('employer'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.company_id !== req.user.company_id) return res.status(403).json({ error: 'Forbidden' });

  const students = db.prepare(`
    SELECT u.id AS user_id, u.name, sp.headline, sp.verified, u.university_id
    FROM users u JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student' AND sp.open_to_opportunities = 1
  `).all();

  const result = students.map(s => {
    const university = s.university_id
      ? db.prepare('SELECT name, qs_rank FROM universities WHERE id = ?').get(s.university_id)
      : null;
    const match = matchForStudent(s.user_id, role);
    const applied = !!db.prepare('SELECT 1 FROM applications WHERE role_id = ? AND student_user_id = ?').get(role.id, s.user_id);
    const invited = !!db.prepare('SELECT 1 FROM role_invites WHERE role_id = ? AND student_user_id = ?').get(role.id, s.user_id);
    return {
      user_id: s.user_id,
      name: s.name,
      headline: s.headline,
      verified: !!s.verified,
      university,
      match,
      applied,
      invited,
    };
  });
  result.sort((a, b) => b.match.score - a.match.score);
  res.json(result);
});

router.post('/roles/:id/invite', requireAuth, requireRole('employer'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.company_id !== req.user.company_id) return res.status(403).json({ error: 'Forbidden' });

  const { student_user_id } = req.body || {};
  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(student_user_id);
  if (!student) return res.status(400).json({ error: 'Unknown student_user_id' });

  const existing = db.prepare('SELECT 1 FROM role_invites WHERE role_id = ? AND student_user_id = ?').get(role.id, student.id);
  if (existing) return res.status(409).json({ error: 'Already invited' });

  db.prepare('INSERT INTO role_invites (role_id, student_user_id) VALUES (?,?)').run(role.id, student.id);
  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(role.company_id);
  notify(student.id, 'invite', `${company.name} invited you to apply for ${role.title}`, '/student/roles');

  res.json({ ok: true });
});

module.exports = router;
