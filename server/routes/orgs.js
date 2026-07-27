const express = require('express');
const { db, requireAuth, requireRole } = require('../lib/helpers');
const { postShape, eventShape } = require('../lib/shapes');

const router = express.Router();

router.get('/universities/:id', requireAuth, (req, res) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id);
  if (!uni) return res.status(404).json({ error: 'Not found' });

  const followers = db.prepare("SELECT COUNT(*) n FROM follows WHERE org_type = 'university' AND org_id = ?").get(uni.id).n;
  const isFollowing = !!db.prepare(
    "SELECT 1 FROM follows WHERE org_type = 'university' AND org_id = ? AND user_id = ?"
  ).get(uni.id, req.user.id);
  const posts = db.prepare(
    "SELECT * FROM posts WHERE org_type = 'university' AND org_id = ? ORDER BY created_at DESC"
  ).all(uni.id).map(p => postShape(p, req.user.id));
  const events = db.prepare(
    "SELECT * FROM events WHERE org_type = 'university' AND org_id = ? ORDER BY date ASC"
  ).all(uni.id).map(e => eventShape(e, req.user.id));
  const studentCount = db.prepare(
    "SELECT COUNT(*) n FROM users WHERE role = 'student' AND university_id = ?"
  ).get(uni.id).n;

  res.json({ ...uni, followers, is_following: isFollowing, posts, events, student_count: studentCount });
});

router.get('/companies/:id', requireAuth, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });

  const followers = db.prepare("SELECT COUNT(*) n FROM follows WHERE org_type = 'company' AND org_id = ?").get(company.id).n;
  const isFollowing = !!db.prepare(
    "SELECT 1 FROM follows WHERE org_type = 'company' AND org_id = ? AND user_id = ?"
  ).get(company.id, req.user.id);
  const openRoles = db.prepare(
    "SELECT id, title, type, location FROM roles WHERE company_id = ? AND status = 'open' ORDER BY created_at DESC"
  ).all(company.id);
  const posts = db.prepare(
    "SELECT * FROM posts WHERE org_type = 'company' AND org_id = ? ORDER BY created_at DESC"
  ).all(company.id).map(p => postShape(p, req.user.id));
  const events = db.prepare(
    "SELECT * FROM events WHERE org_type = 'company' AND org_id = ? ORDER BY date ASC"
  ).all(company.id).map(e => eventShape(e, req.user.id));

  res.json({ ...company, followers, is_following: isFollowing, open_roles: openRoles, posts, events });
});

router.patch('/companies/:id', requireAuth, requireRole('employer'), (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });
  if (req.user.company_id !== company.id) return res.status(403).json({ error: 'Forbidden' });

  const fields = ['about', 'sectors', 'locations', 'banner_color'];
  const updates = {};
  for (const f of fields) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) updates[f] = req.body[f];
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE companies SET ${setClause} WHERE id = ?`).run(...keys.map(k => updates[k]), company.id);
  }
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(company.id));
});

module.exports = router;
