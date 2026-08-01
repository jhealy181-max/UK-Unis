const express = require('express');
const { db, requireAuth, requireRole, notify, logActivity } = require('../lib/helpers');

const router = express.Router();

router.get('/network/suggestions', requireAuth, requireRole('student'), (req, res) => {
  const excluded = new Set([req.user.id]);
  const connRows = db.prepare(`
    SELECT requester_id, addressee_id FROM connections
    WHERE status IN ('pending','accepted') AND (requester_id = ? OR addressee_id = ?)
  `).all(req.user.id, req.user.id);
  for (const r of connRows) {
    excluded.add(r.requester_id === req.user.id ? r.addressee_id : r.requester_id);
  }

  const mySkillIds = new Set(
    db.prepare('SELECT skill_id FROM student_skills WHERE student_user_id = ?').all(req.user.id).map(r => r.skill_id)
  );

  const candidates = db.prepare(`
    SELECT u.id AS user_id, u.name, sp.headline, sp.verified, u.university_id
    FROM users u JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student' AND u.id != ?
  `).all(req.user.id).filter(c => !excluded.has(c.user_id));

  const scored = candidates.map(c => {
    const uni = c.university_id ? db.prepare('SELECT name FROM universities WHERE id = ?').get(c.university_id) : null;
    const theirSkillIds = db.prepare('SELECT skill_id FROM student_skills WHERE student_user_id = ?').all(c.user_id).map(r => r.skill_id);
    const mutualSkills = theirSkillIds.filter(id => mySkillIds.has(id)).length;
    const sameUniversity = c.university_id === req.user.university_id ? 1 : 0;
    return {
      user_id: c.user_id,
      name: c.name,
      headline: c.headline || '',
      university_name: uni ? uni.name : null,
      verified: !!c.verified,
      mutual_skills: mutualSkills,
      _sameUniversity: sameUniversity,
    };
  });

  scored.sort((a, b) => (b._sameUniversity - a._sameUniversity) || (b.mutual_skills - a.mutual_skills));
  const result = scored.slice(0, 8).map(({ _sameUniversity, ...rest }) => rest);
  res.json(result);
});

router.post('/connections', requireAuth, requireRole('student'), (req, res) => {
  const { user_id } = req.body || {};
  const target = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(user_id);
  if (!target) return res.status(400).json({ error: 'Unknown user_id' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot connect to yourself' });

  const existing = db.prepare(`
    SELECT * FROM connections
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(req.user.id, target.id, target.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Connection already exists' });

  const r = db.prepare(`
    INSERT INTO connections (requester_id, addressee_id, status) VALUES (?,?,'pending')
  `).run(req.user.id, target.id);
  notify(target.id, 'connection', `${req.user.name} wants to connect with you`, '/network');
  logActivity(req.user.id, 'connect_request');
  res.json(db.prepare('SELECT * FROM connections WHERE id = ?').get(r.lastInsertRowid));
});

router.get('/my/connections', requireAuth, (req, res) => {
  function rowShape(connId, otherId) {
    const other = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId);
    const profile = db.prepare('SELECT headline FROM student_profiles WHERE user_id = ?').get(otherId) || {};
    const uni = other.university_id ? db.prepare('SELECT name FROM universities WHERE id = ?').get(other.university_id) : null;
    return {
      connection_id: connId,
      user_id: other.id,
      name: other.name,
      headline: profile.headline || '',
      university_name: uni ? uni.name : null,
    };
  }

  const accepted = db.prepare(`
    SELECT * FROM connections WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
  `).all(req.user.id, req.user.id).map(c => rowShape(c.id, c.requester_id === req.user.id ? c.addressee_id : c.requester_id));

  const incoming = db.prepare(`
    SELECT * FROM connections WHERE status = 'pending' AND addressee_id = ?
  `).all(req.user.id).map(c => rowShape(c.id, c.requester_id));

  const outgoing = db.prepare(`
    SELECT * FROM connections WHERE status = 'pending' AND requester_id = ?
  `).all(req.user.id).map(c => rowShape(c.id, c.addressee_id));

  res.json({ accepted, incoming, outgoing });
});

router.patch('/connections/:id', requireAuth, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) return res.status(404).json({ error: 'Not found' });
  if (conn.addressee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body || {};
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'invalid status' });

  db.prepare('UPDATE connections SET status = ? WHERE id = ?').run(status, conn.id);
  if (status === 'accepted') {
    notify(conn.requester_id, 'connection', `${req.user.name} accepted your connection request`, '/network');
    logActivity(req.user.id, 'accept');
  }
  res.json(db.prepare('SELECT * FROM connections WHERE id = ?').get(conn.id));
});

router.post('/follows', requireAuth, (req, res) => {
  const { org_type, org_id } = req.body || {};
  if (!['university', 'company'].includes(org_type) || !org_id) {
    return res.status(400).json({ error: 'org_type and org_id are required' });
  }
  try {
    db.prepare('INSERT INTO follows (user_id, org_type, org_id) VALUES (?,?,?)').run(req.user.id, org_type, org_id);
  } catch (e) {
    return res.status(409).json({ error: 'Already following' });
  }
  res.json({ ok: true });
});

router.delete('/follows', requireAuth, (req, res) => {
  const { org_type, org_id } = req.body || {};
  db.prepare('DELETE FROM follows WHERE user_id = ? AND org_type = ? AND org_id = ?').run(req.user.id, org_type, org_id);
  res.json({ ok: true });
});

router.get('/my/follows', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT org_type, org_id FROM follows WHERE user_id = ?').all(req.user.id);
  const result = rows.map(r => {
    const name = r.org_type === 'university'
      ? (db.prepare('SELECT name FROM universities WHERE id = ?').get(r.org_id) || {}).name
      : (db.prepare('SELECT name FROM companies WHERE id = ?').get(r.org_id) || {}).name;
    return { org_type: r.org_type, org_id: r.org_id, name: name || null };
  });
  res.json(result);
});

module.exports = router;
