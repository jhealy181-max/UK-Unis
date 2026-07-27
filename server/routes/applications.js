const express = require('express');
const { db, requireAuth, requireRole, notify, matchForStudent } = require('../lib/helpers');

const router = express.Router();

const EMPLOYER_TRANSITIONS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
};
const NON_TERMINAL = ['applied', 'shortlisted', 'interview', 'offer'];

router.post('/applications', requireAuth, requireRole('student'), (req, res) => {
  const { role_id, note } = req.body || {};
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(role_id);
  if (!role) return res.status(400).json({ error: 'Unknown role_id' });
  if (role.status !== 'open') return res.status(409).json({ error: 'Role is closed' });

  const existing = db.prepare('SELECT 1 FROM applications WHERE role_id = ? AND student_user_id = ?').get(role.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already applied' });

  const r = db.prepare(`
    INSERT INTO applications (role_id, student_user_id, note, status) VALUES (?,?,?,'applied')
  `).run(role.id, req.user.id, note || '');
  db.prepare('INSERT INTO application_events (application_id, status) VALUES (?, ?)').run(r.lastInsertRowid, 'applied');

  const employerUsers = db.prepare('SELECT id FROM users WHERE company_id = ?').all(role.company_id);
  for (const e of employerUsers) {
    notify(e.id, 'application', `${req.user.name} applied for ${role.title}`, '/employer/roles');
  }

  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(r.lastInsertRowid));
});

router.get('/my/applications', requireAuth, requireRole('student'), (req, res) => {
  const apps = db.prepare(`
    SELECT ap.*, r.title AS role_title, c.name AS company_name
    FROM applications ap
    JOIN roles r ON r.id = ap.role_id
    JOIN companies c ON c.id = r.company_id
    WHERE ap.student_user_id = ?
    ORDER BY ap.created_at DESC
  `).all(req.user.id);

  const result = apps.map(a => {
    const timeline = db.prepare('SELECT status, created_at FROM application_events WHERE application_id = ? ORDER BY created_at ASC, id ASC').all(a.id);
    return {
      id: a.id,
      role: { id: a.role_id, title: a.role_title, company_name: a.company_name },
      status: a.status,
      placement_approved: !!a.placement_approved,
      note: a.note,
      timeline,
      created_at: a.created_at,
    };
  });
  res.json(result);
});

router.get('/roles/:id/applications', requireAuth, requireRole('employer'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.company_id !== req.user.company_id) return res.status(403).json({ error: 'Forbidden' });

  const apps = db.prepare('SELECT * FROM applications WHERE role_id = ? ORDER BY created_at DESC').all(role.id);
  const result = apps.map(a => {
    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(a.student_user_id);
    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student.id) || {};
    const university = student.university_id
      ? db.prepare('SELECT name, qs_rank FROM universities WHERE id = ?').get(student.university_id)
      : null;
    return {
      id: a.id,
      status: a.status,
      note: a.note,
      created_at: a.created_at,
      student: {
        user_id: student.id,
        name: student.name,
        headline: profile.headline || '',
        verified: !!profile.verified,
        university,
        match: matchForStudent(student.id, role),
      },
    };
  });
  res.json(result);
});

router.patch('/applications/:id', requireAuth, (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(app.role_id);
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status is required' });

  let actor;
  if (req.user.role === 'employer') {
    if (role.company_id !== req.user.company_id) return res.status(403).json({ error: 'Forbidden' });
    const allowed = EMPLOYER_TRANSITIONS[app.status] || [];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Cannot transition from ${app.status} to ${status}` });
    actor = 'employer';
  } else if (req.user.role === 'student') {
    if (app.student_user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (status !== 'withdrawn' || !NON_TERMINAL.includes(app.status)) {
      return res.status(400).json({ error: `Cannot transition from ${app.status} to ${status}` });
    }
    actor = 'student';
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, app.id);
  db.prepare('INSERT INTO application_events (application_id, status) VALUES (?,?)').run(app.id, status);

  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(app.student_user_id);
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(role.company_id);

  if (actor === 'employer') {
    notify(student.id, 'application', `Your application for ${role.title} is now ${status}`, '/student/applications');
    if (status === 'offer' || status === 'hired') {
      const admins = db.prepare("SELECT id FROM users WHERE role = 'university_admin' AND university_id = ?").all(student.university_id);
      for (const a of admins) {
        notify(a.id, 'placement', `${student.name}'s application for ${role.title} at ${company.name} needs placement sign-off`, '/university/placements');
      }
    }
  } else {
    const employerUsers = db.prepare('SELECT id FROM users WHERE company_id = ?').all(role.company_id);
    for (const e of employerUsers) {
      notify(e.id, 'application', `${student.name} withdrew their application for ${role.title}`, '/employer/roles');
    }
  }

  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(app.id));
});

router.post('/applications/:id/approve-placement', requireAuth, requireRole('university_admin'), (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(app.student_user_id);
  if (!student || student.university_id !== req.user.university_id) return res.status(403).json({ error: 'Forbidden' });
  if (!['offer', 'hired'].includes(app.status)) {
    return res.status(400).json({ error: 'Application must be in offer or hired status' });
  }

  db.prepare('UPDATE applications SET placement_approved = 1 WHERE id = ?').run(app.id);
  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student.id);
  if (profile && profile.placement_required_hours != null) {
    db.prepare('UPDATE student_profiles SET placement_satisfied = 1 WHERE user_id = ?').run(student.id);
  }

  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(app.role_id);
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(role.company_id);
  notify(student.id, 'placement', `Your placement at ${company.name} (${role.title}) has been approved by your university`, '/student/applications');
  const employerUsers = db.prepare('SELECT id FROM users WHERE company_id = ?').all(role.company_id);
  for (const e of employerUsers) {
    notify(e.id, 'placement', `${student.name}'s placement for ${role.title} has been approved by their university`, '/employer/roles');
  }

  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(app.id));
});

module.exports = router;
