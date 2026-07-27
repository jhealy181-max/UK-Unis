// server/lib/shapes.js — shared response-shape builders (posts, events).

const { db } = require('../db');

function orgName(orgType, orgId) {
  if (!orgType || orgId == null) return null;
  if (orgType === 'university') {
    const u = db.prepare('SELECT name FROM universities WHERE id = ?').get(orgId);
    return u ? u.name : null;
  }
  const c = db.prepare('SELECT name FROM companies WHERE id = ?').get(orgId);
  return c ? c.name : null;
}

function postShape(post, viewerUserId) {
  const author = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(post.author_user_id);
  const likes = db.prepare('SELECT COUNT(*) n FROM post_likes WHERE post_id = ?').get(post.id).n;
  const likedByMe = viewerUserId
    ? !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, viewerUserId)
    : false;
  const comments = db.prepare(`
    SELECT pc.id, u.name AS user_name, pc.body, pc.created_at
    FROM post_comments pc JOIN users u ON u.id = pc.user_id
    WHERE pc.post_id = ? ORDER BY pc.created_at ASC
  `).all(post.id);

  return {
    id: post.id,
    body: post.body,
    created_at: post.created_at,
    author: {
      name: author ? author.name : null,
      org_name: post.org_type ? orgName(post.org_type, post.org_id) : null,
      org_type: post.org_type || null,
      org_id: post.org_id || null,
      role: author ? author.role : null,
    },
    likes,
    liked_by_me: likedByMe,
    comments,
  };
}

function eventShape(event, viewerUserId) {
  const registrations = db.prepare('SELECT COUNT(*) n FROM event_registrations WHERE event_id = ?').get(event.id).n;
  const registered = viewerUserId
    ? !!db.prepare('SELECT 1 FROM event_registrations WHERE event_id = ? AND user_id = ?').get(event.id, viewerUserId)
    : false;
  return {
    ...event,
    org_name: orgName(event.org_type, event.org_id),
    registered,
    registrations,
  };
}

module.exports = { orgName, postShape, eventShape };
