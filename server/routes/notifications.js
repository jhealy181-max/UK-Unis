const express = require('express');
const { db, requireAuth } = require('../lib/helpers');

const router = express.Router();

router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, message, link, read, created_at FROM notifications
    WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30
  `).all(req.user.id);
  res.json(rows.map(r => ({ ...r, read: !!r.read })));
});

router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
