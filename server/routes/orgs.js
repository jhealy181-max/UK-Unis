const express = require('express');
const { db, requireAuth, requireRole, toBindable, reputationPercentile } = require('../lib/helpers');
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
    "SELECT * FROM posts WHERE org_type = 'university' AND org_id = ? AND hidden = 0 ORDER BY created_at DESC"
  ).all(uni.id).map(p => postShape(p, req.user.id));
  const events = db.prepare(
    "SELECT * FROM events WHERE org_type = 'university' AND org_id = ? ORDER BY date ASC"
  ).all(uni.id).map(e => eventShape(e, req.user.id));
  const studentCount = db.prepare(
    "SELECT COUNT(*) n FROM users WHERE role = 'student' AND university_id = ?"
  ).get(uni.id).n;
  // F10: "Subject strengths" panel — this university's own subject_outcomes rows.
  const subjectOutcomes = db.prepare(
    'SELECT subject, subject_rank, top_sectors, median_days_to_offer FROM subject_outcomes WHERE university_id = ? ORDER BY subject_rank ASC'
  ).all(uni.id).map(r => ({ ...r, top_sectors: r.top_sectors.split(',').map(s => s.trim()).filter(Boolean) }));

  res.json({
    ...uni, followers, is_following: isFollowing, posts, events, student_count: studentCount,
    subject_outcomes: subjectOutcomes,
  });
});

router.get('/companies/:id', requireAuth, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });

  const followers = db.prepare("SELECT COUNT(*) n FROM follows WHERE org_type = 'company' AND org_id = ?").get(company.id).n;
  const isFollowing = !!db.prepare(
    "SELECT 1 FROM follows WHERE org_type = 'company' AND org_id = ? AND user_id = ?"
  ).get(company.id, req.user.id);
  const openRoles = db.prepare(
    "SELECT id, title, type, location FROM roles WHERE company_id = ? AND status = 'open' AND hidden = 0 ORDER BY created_at DESC"
  ).all(company.id);
  const posts = db.prepare(
    "SELECT * FROM posts WHERE org_type = 'company' AND org_id = ? AND hidden = 0 ORDER BY created_at DESC"
  ).all(company.id).map(p => postShape(p, req.user.id));
  const events = db.prepare(
    "SELECT * FROM events WHERE org_type = 'company' AND org_id = ? ORDER BY date ASC"
  ).all(company.id).map(e => eventShape(e, req.user.id));

  res.json({
    ...company, followers, is_following: isFollowing, open_roles: openRoles, posts, events,
    // F2: percentile (0-100, higher = better) of employer_reputation among same-sector peers.
    reputation_percentile: reputationPercentile(company.id),
  });
});

router.patch('/companies/:id', requireAuth, requireRole('employer'), (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });
  if (req.user.company_id !== company.id) return res.status(403).json({ error: 'Forbidden' });

  const fields = ['about', 'sectors', 'locations', 'banner_color'];
  const updates = {};
  for (const f of fields) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) updates[f] = toBindable(req.body[f]);
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE companies SET ${setClause} WHERE id = ?`).run(...keys.map(k => updates[k]), company.id);
  }
  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(company.id));
});

module.exports = router;
