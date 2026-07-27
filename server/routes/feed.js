const express = require('express');
const { db, requireAuth, requireRole } = require('../lib/helpers');
const { postShape } = require('../lib/shapes');

const router = express.Router();

router.get('/feed', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT p.* FROM posts p
    WHERE
      (p.org_type IS NOT NULL AND EXISTS (
        SELECT 1 FROM follows f WHERE f.user_id = ? AND f.org_type = p.org_type AND f.org_id = p.org_id
      ))
      OR (p.org_type IS NULL AND EXISTS (
        SELECT 1 FROM connections c WHERE c.status = 'accepted'
          AND ((c.requester_id = ? AND c.addressee_id = p.author_user_id)
            OR (c.addressee_id = ? AND c.requester_id = p.author_user_id))
      ))
      OR (p.org_type = 'university' AND ? IS NOT NULL AND p.org_id = ?)
      OR (p.author_user_id = ?)
    ORDER BY p.created_at DESC
    LIMIT 50
  `).all(req.user.id, req.user.id, req.user.id, req.user.university_id, req.user.university_id, req.user.id);

  res.json(rows.map(p => postShape(p, req.user.id)));
});

router.post('/posts', requireAuth, (req, res) => {
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  let orgType = null;
  let orgId = null;
  if (req.user.role === 'employer') {
    orgType = 'company';
    orgId = req.user.company_id;
  } else if (req.user.role === 'university_admin') {
    orgType = 'university';
    orgId = req.user.university_id;
  }

  const r = db.prepare('INSERT INTO posts (author_user_id, org_type, org_id, body) VALUES (?,?,?,?)')
    .run(req.user.id, orgType, orgId, body);
  res.json(postShape(db.prepare('SELECT * FROM posts WHERE id = ?').get(r.lastInsertRowid), req.user.id));
});

router.post('/posts/:id/like', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(post.id, req.user.id);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?,?)').run(post.id, req.user.id);
  }
  const likes = db.prepare('SELECT COUNT(*) n FROM post_likes WHERE post_id = ?').get(post.id).n;
  res.json({ likes, liked_by_me: !existing });
});

router.post('/posts/:id/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  db.prepare('INSERT INTO post_comments (post_id, user_id, body) VALUES (?,?,?)').run(post.id, req.user.id, body);
  res.json(postShape(post, req.user.id));
});

module.exports = router;
