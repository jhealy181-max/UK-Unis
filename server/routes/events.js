const express = require('express');
const { db, requireAuth, requireRole, logActivity } = require('../lib/helpers');
const { eventShape } = require('../lib/shapes');

const router = express.Router();

router.get('/events', requireAuth, (req, res) => {
  let sql = "SELECT * FROM events WHERE date >= datetime('now')";
  if (req.user.role !== 'qs_admin') sql += ' AND hidden = 0';
  sql += ' ORDER BY date ASC';
  const rows = db.prepare(sql).all();
  res.json(rows.map(e => eventShape(e, req.user.id)));
});

router.post('/events', requireAuth, requireRole('employer', 'university_admin'), (req, res) => {
  const { title, description, date, format, location, capacity } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
  if (format && !['virtual', 'in_person'].includes(format)) return res.status(400).json({ error: 'invalid format' });

  const orgType = req.user.role === 'employer' ? 'company' : 'university';
  const orgId = req.user.role === 'employer' ? req.user.company_id : req.user.university_id;

  const r = db.prepare(`
    INSERT INTO events (org_type, org_id, created_by_user_id, title, description, date, format, location, capacity)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(orgType, orgId, req.user.id, title, description || '', date, format || 'virtual', location || null, capacity || null);

  res.json(eventShape(db.prepare('SELECT * FROM events WHERE id = ?').get(r.lastInsertRowid), req.user.id));
});

router.post('/events/:id/register', requireAuth, requireRole('student'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const existing = db.prepare('SELECT 1 FROM event_registrations WHERE event_id = ? AND user_id = ?').get(event.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already registered' });

  if (event.capacity != null) {
    const count = db.prepare('SELECT COUNT(*) n FROM event_registrations WHERE event_id = ?').get(event.id).n;
    if (count >= event.capacity) return res.status(409).json({ error: 'Event is at capacity' });
  }

  db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?,?)').run(event.id, req.user.id);
  logActivity(req.user.id, 'event_registration');
  res.json(eventShape(event, req.user.id));
});

router.delete('/events/:id/register', requireAuth, requireRole('student'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?').run(event.id, req.user.id);
  res.json({ ok: true });
});

router.get('/events/:id/registrants', requireAuth, requireRole('employer', 'university_admin'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const ownOrgId = req.user.role === 'employer' ? req.user.company_id : req.user.university_id;
  const ownOrgType = req.user.role === 'employer' ? 'company' : 'university';
  if (event.org_type !== ownOrgType || event.org_id !== ownOrgId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = db.prepare(`
    SELECT u.id AS user_id, u.name, u.university_id
    FROM event_registrations er JOIN users u ON u.id = er.user_id
    WHERE er.event_id = ?
  `).all(event.id);
  const result = rows.map(r => ({
    user_id: r.user_id,
    name: r.name,
    university_name: r.university_id ? (db.prepare('SELECT name FROM universities WHERE id = ?').get(r.university_id) || {}).name : null,
  }));
  res.json(result);
});

module.exports = router;
