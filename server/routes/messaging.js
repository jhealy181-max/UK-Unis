const express = require('express');
const { db, requireAuth, notify, canMessage } = require('../lib/helpers');

const router = express.Router();

function otherUserId(thread, meId) {
  return thread.a_user_id === meId ? thread.b_user_id : thread.a_user_id;
}

function otherInfo(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  let orgName = null;
  if (user.role === 'employer' && user.company_id) {
    orgName = (db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id) || {}).name;
  } else if (user.role === 'university_admin' && user.university_id) {
    orgName = (db.prepare('SELECT name FROM universities WHERE id = ?').get(user.university_id) || {}).name;
  }
  return { user_id: user.id, name: user.name, role: user.role, org_name: orgName };
}

router.get('/threads', requireAuth, (req, res) => {
  const threads = db.prepare('SELECT * FROM threads WHERE a_user_id = ? OR b_user_id = ?').all(req.user.id, req.user.id);
  const result = threads.map(t => {
    const otherId = otherUserId(t, req.user.id);
    const lastMsg = db.prepare('SELECT body, created_at FROM messages WHERE thread_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(t.id);
    const unread = db.prepare('SELECT COUNT(*) n FROM messages WHERE thread_id = ? AND sender_id != ? AND read = 0').get(t.id, req.user.id).n;
    return {
      id: t.id,
      other: otherInfo(otherId),
      last_message: lastMsg || null,
      unread,
    };
  });
  result.sort((a, b) => {
    const ta = a.last_message ? a.last_message.created_at : '';
    const tb = b.last_message ? b.last_message.created_at : '';
    return tb.localeCompare(ta);
  });
  res.json(result);
});

router.post('/threads', requireAuth, (req, res) => {
  const { user_id, body } = req.body || {};
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!other) return res.status(400).json({ error: 'Unknown user_id' });
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });
  if (!canMessage(req.user.id, other.id)) return res.status(403).json({ error: 'Not permitted to message this user' });

  let thread = db.prepare(`
    SELECT * FROM threads WHERE (a_user_id = ? AND b_user_id = ?) OR (a_user_id = ? AND b_user_id = ?)
  `).get(req.user.id, other.id, other.id, req.user.id);

  if (!thread) {
    const r = db.prepare('INSERT INTO threads (a_user_id, b_user_id) VALUES (?,?)').run(req.user.id, other.id);
    thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(r.lastInsertRowid);
  }

  db.prepare('INSERT INTO messages (thread_id, sender_id, body) VALUES (?,?,?)').run(thread.id, req.user.id, body);
  notify(other.id, 'message', `New message from ${req.user.name}`, '/messages');

  res.json({ id: thread.id, other: otherInfo(other.id) });
});

router.get('/threads/:id/messages', requireAuth, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread || (thread.a_user_id !== req.user.id && thread.b_user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  db.prepare('UPDATE messages SET read = 1 WHERE thread_id = ? AND sender_id != ?').run(thread.id, req.user.id);
  const messages = db.prepare('SELECT id, sender_id, body, created_at FROM messages WHERE thread_id = ? ORDER BY created_at ASC, id ASC').all(thread.id);
  res.json({
    messages,
    other: otherInfo(otherUserId(thread, req.user.id)),
  });
});

router.post('/threads/:id/messages', requireAuth, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread || (thread.a_user_id !== req.user.id && thread.b_user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  const r = db.prepare('INSERT INTO messages (thread_id, sender_id, body) VALUES (?,?,?)').run(thread.id, req.user.id, body);
  const otherId = otherUserId(thread, req.user.id);
  notify(otherId, 'message', `New message from ${req.user.name}`, '/messages');

  res.json(db.prepare('SELECT id, sender_id, body, created_at FROM messages WHERE id = ?').get(r.lastInsertRowid));
});

module.exports = router;
