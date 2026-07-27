// server/lib/helpers.js — shared DB access helpers, auth guards, and shape
// builders used across route modules.

const { db } = require('../db');
const { matchScore } = require('../match');

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const insNotif = db.prepare(`
  INSERT INTO notifications (user_id, type, message, link, read)
  VALUES (?,?,?,?,0)
`);

function notify(userId, type, message, link) {
  insNotif.run(userId, type, message, link || null);
}

function unreadNotificationCount(userId) {
  return db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read = 0').get(userId).n;
}

function unreadMessageCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) n FROM messages m
    JOIN threads t ON t.id = m.thread_id
    WHERE m.read = 0 AND m.sender_id != ? AND (t.a_user_id = ? OR t.b_user_id = ?)
  `).get(userId, userId, userId).n;
}

// ---------------------------------------------------------------------------
// Profile strength
// ---------------------------------------------------------------------------

function computeProfileStrength(profile, skillCount, experienceCount, hasApprovedClaim) {
  let score = 0;
  if (profile.headline && profile.headline.trim()) score += 20;
  if (profile.about && profile.about.trim()) score += 15;
  if (skillCount >= 3) score += 20;
  if (experienceCount >= 1) score += 15;
  if (hasApprovedClaim) score += 15;
  if (profile.interests_sectors && profile.interests_sectors.trim()) score += 15;
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function requiredSkillsForRole(roleId) {
  return db.prepare(`
    SELECT rs.skill_id AS id, s.name AS name, rs.weight AS weight
    FROM role_skills rs JOIN skills s ON s.id = rs.skill_id
    WHERE rs.role_id = ?
  `).all(roleId);
}

function matchForStudent(studentUserId, roleRow) {
  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentUserId);
  const skillIds = db.prepare('SELECT skill_id FROM student_skills WHERE student_user_id = ?')
    .all(studentUserId).map(r => r.skill_id);
  const student = {
    skill_ids: skillIds,
    interests_sectors: profile ? profile.interests_sectors : '',
    preferred_locations: profile ? profile.preferred_locations : '',
    work_rights: profile ? profile.work_rights : 0,
    open_to_relocate: profile ? profile.open_to_relocate : 0,
  };
  const role = {
    sector: roleRow.sector,
    location: roleRow.location,
    remote: roleRow.remote,
    sponsors_visa: roleRow.sponsors_visa,
    required_skills: requiredSkillsForRole(roleRow.id),
  };
  return matchScore(student, role);
}

// ---------------------------------------------------------------------------
// Messaging permission
// ---------------------------------------------------------------------------

function canMessage(aUserId, bUserId) {
  if (aUserId === bUserId) return false;
  const a = db.prepare('SELECT * FROM users WHERE id = ?').get(aUserId);
  const b = db.prepare('SELECT * FROM users WHERE id = ?').get(bUserId);
  if (!a || !b) return false;

  const accepted = db.prepare(`
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
  `).get(aUserId, bUserId, bUserId, aUserId);
  if (accepted) return true;

  function employerStudentPair(employer, student) {
    if (employer.role !== 'employer' || student.role !== 'student') return false;
    const hasApplication = db.prepare(`
      SELECT 1 FROM applications ap JOIN roles r ON r.id = ap.role_id
      WHERE ap.student_user_id = ? AND r.company_id = ?
    `).get(student.id, employer.company_id);
    if (hasApplication) return true;
    const hasInvite = db.prepare(`
      SELECT 1 FROM role_invites ri JOIN roles r ON r.id = ri.role_id
      WHERE ri.student_user_id = ? AND r.company_id = ?
    `).get(student.id, employer.company_id);
    return !!hasInvite;
  }
  if (employerStudentPair(a, b) || employerStudentPair(b, a)) return true;

  function uniAdminStudentPair(admin, student) {
    if (admin.role !== 'university_admin' || student.role !== 'student') return false;
    return admin.university_id != null && admin.university_id === student.university_id;
  }
  if (uniAdminStudentPair(a, b) || uniAdminStudentPair(b, a)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// GET /me shape (reused by register/login/me)
// ---------------------------------------------------------------------------

function meShape(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  let university = null;
  if (user.university_id) {
    const u = db.prepare('SELECT id, name, qs_rank FROM universities WHERE id = ?').get(user.university_id);
    if (u) university = u;
  }
  let company = null;
  if (user.company_id) {
    const c = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(user.company_id);
    if (c) company = c;
  }

  let profile;
  if (user.role === 'student') {
    const sp = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id) || {};
    const skills = db.prepare(`
      SELECT s.id, s.name, s.category FROM student_skills ss
      JOIN skills s ON s.id = ss.skill_id WHERE ss.student_user_id = ?
    `).all(user.id);
    const experience = db.prepare('SELECT * FROM experience_entries WHERE student_user_id = ? ORDER BY start_date DESC').all(user.id);
    const claims = db.prepare(`
      SELECT ec.id, u.name AS university_name, ec.course, ec.start_year, ec.end_year, ec.status
      FROM education_claims ec JOIN universities u ON u.id = ec.university_id
      WHERE ec.student_user_id = ? ORDER BY ec.created_at DESC
    `).all(user.id);
    const hasApprovedClaim = claims.some(c => c.status === 'approved');
    const profileStrength = computeProfileStrength(sp, skills.length, experience.length, hasApprovedClaim);
    profile = {
      ...sp,
      skills,
      experience,
      education_claims: claims,
      profile_strength: profileStrength,
      unread_notifications: unreadNotificationCount(user.id),
      unread_messages: unreadMessageCount(user.id),
    };
  } else if (user.role === 'employer') {
    const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(user.company_id) || {};
    profile = {
      ...c,
      unread_notifications: unreadNotificationCount(user.id),
      unread_messages: unreadMessageCount(user.id),
    };
  } else {
    const u = db.prepare('SELECT * FROM universities WHERE id = ?').get(user.university_id) || {};
    profile = {
      ...u,
      unread_notifications: unreadNotificationCount(user.id),
      unread_messages: unreadMessageCount(user.id),
    };
  }

  return {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    university,
    company,
    profile,
  };
}

module.exports = {
  db,
  requireAuth,
  requireRole,
  notify,
  unreadNotificationCount,
  unreadMessageCount,
  computeProfileStrength,
  requiredSkillsForRole,
  matchForStudent,
  canMessage,
  meShape,
};
