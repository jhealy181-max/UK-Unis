const express = require('express');
const { db, requireAuth, requireRole, notify, canMessage } = require('../lib/helpers');

const router = express.Router();

function connectionState(meId, otherId) {
  const row = db.prepare(`
    SELECT * FROM connections
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(meId, otherId, otherId, meId);
  if (!row) return 'none';
  if (row.status === 'accepted') return 'connected';
  if (row.status === 'declined') return 'none';
  // pending
  return row.requester_id === meId ? 'pending_out' : 'pending_in';
}

router.get('/students/:userId', requireAuth, (req, res) => {
  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(req.params.userId);
  if (!student) return res.status(404).json({ error: 'Not found' });

  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student.id) || {};
  const university = student.university_id
    ? db.prepare('SELECT name, qs_rank FROM universities WHERE id = ?').get(student.university_id)
    : null;
  const skills = db.prepare(`
    SELECT s.id, s.name, s.category FROM student_skills ss
    JOIN skills s ON s.id = ss.skill_id WHERE ss.student_user_id = ?
  `).all(student.id);
  const experience = db.prepare('SELECT * FROM experience_entries WHERE student_user_id = ? ORDER BY start_date DESC').all(student.id);
  const education = db.prepare(`
    SELECT ec.id, u.name AS university_name, ec.course, ec.start_year, ec.end_year, ec.status
    FROM education_claims ec JOIN universities u ON u.id = ec.university_id
    WHERE ec.student_user_id = ? AND ec.status = 'approved'
    ORDER BY ec.created_at DESC
  `).all(student.id);

  res.json({
    name: student.name,
    headline: profile.headline || '',
    about: profile.about || '',
    verified: !!profile.verified,
    university,
    skills,
    experience,
    education,
    connection_state: connectionState(req.user.id, student.id),
    can_message: canMessage(req.user.id, student.id),
  });
});

router.patch('/me/profile', requireAuth, requireRole('student'), (req, res) => {
  const fields = ['headline', 'about', 'interests_sectors', 'preferred_locations', 'work_rights', 'open_to_relocate', 'open_to_opportunities'];
  const updates = {};
  for (const f of fields) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) updates[f] = req.body[f];
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE student_profiles SET ${setClause} WHERE user_id = ?`).run(...keys.map(k => updates[k]), req.user.id);
  }
  res.json(db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(req.user.id));
});

router.put('/me/skills', requireAuth, requireRole('student'), (req, res) => {
  const skillIds = Array.isArray(req.body && req.body.skill_ids) ? req.body.skill_ids : null;
  if (!skillIds) return res.status(400).json({ error: 'skill_ids array required' });

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM student_skills WHERE student_user_id = ?').run(req.user.id);
    const ins = db.prepare('INSERT INTO student_skills (student_user_id, skill_id) VALUES (?,?)');
    for (const id of skillIds) ins.run(req.user.id, id);
  });
  txn();

  const skills = db.prepare(`
    SELECT s.id, s.name, s.category FROM student_skills ss
    JOIN skills s ON s.id = ss.skill_id WHERE ss.student_user_id = ?
  `).all(req.user.id);
  res.json(skills);
});

router.post('/me/experience', requireAuth, requireRole('student'), (req, res) => {
  const { title, organisation, start_date, end_date, description } = req.body || {};
  if (!title || !organisation || !start_date) {
    return res.status(400).json({ error: 'title, organisation and start_date are required' });
  }
  const r = db.prepare(`
    INSERT INTO experience_entries (student_user_id, title, organisation, start_date, end_date, description)
    VALUES (?,?,?,?,?,?)
  `).run(req.user.id, title, organisation, start_date, end_date || null, description || '');
  res.json(db.prepare('SELECT * FROM experience_entries WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/me/experience/:id', requireAuth, requireRole('student'), (req, res) => {
  const entry = db.prepare('SELECT * FROM experience_entries WHERE id = ?').get(req.params.id);
  if (!entry || entry.student_user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM experience_entries WHERE id = ?').run(entry.id);
  res.json({ ok: true });
});

router.post('/me/education-claim', requireAuth, requireRole('student'), (req, res) => {
  const { university_id, course, start_year, end_year } = req.body || {};
  if (!university_id || !course || !start_year || !end_year) {
    return res.status(400).json({ error: 'university_id, course, start_year, end_year are required' });
  }
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(university_id);
  if (!uni) return res.status(400).json({ error: 'Unknown university_id' });

  const r = db.prepare(`
    INSERT INTO education_claims (student_user_id, university_id, course, start_year, end_year, status)
    VALUES (?,?,?,?,?,'pending')
  `).run(req.user.id, university_id, course, start_year, end_year);

  const admins = db.prepare("SELECT id FROM users WHERE role = 'university_admin' AND university_id = ?").all(university_id);
  for (const a of admins) {
    notify(a.id, 'verification', `${req.user.name} requested verification for ${course}`, '/university/verifications');
  }

  res.json(db.prepare('SELECT * FROM education_claims WHERE id = ?').get(r.lastInsertRowid));
});

module.exports = router;
