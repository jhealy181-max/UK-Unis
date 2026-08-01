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
  if (!user.active) {
    return res.status(403).json({ error: 'Account suspended by QS administrator' });
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
// F8: activity log (career momentum)
// ---------------------------------------------------------------------------

const insActivity = db.prepare('INSERT INTO activity_log (user_id, activity_type) VALUES (?,?)');

function logActivity(userId, activityType) {
  insActivity.run(userId, activityType);
}

// ---------------------------------------------------------------------------
// F1: AI exposure / future-proof skill score
// ---------------------------------------------------------------------------

// Weighting per ITERATION-3.md F1: augmented skills count less against you
// (AI mostly assists), at_risk skills count more (AI mostly replaces), and
// human_core sits in between.
const FUTURE_PROOF_WEIGHTS = { augmented: 0.5, human_core: 0.7, at_risk: 1.3 };

function futureProofForStudent(userId) {
  const heldSkills = db.prepare(`
    SELECT s.id, s.name, s.ai_exposure, s.exposure_score
    FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
    WHERE ss.student_user_id = ?
    ORDER BY s.category ASC, s.name ASC
  `).all(userId);

  let weightedSum = 0;
  let weightSum = 0;
  for (const s of heldSkills) {
    const w = FUTURE_PROOF_WEIGHTS[s.ai_exposure] ?? 1;
    weightedSum += s.exposure_score * w;
    weightSum += w;
  }
  const avgExposure = weightSum ? weightedSum / weightSum : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - avgExposure)));

  const breakdown = heldSkills.map(s => ({
    skill: s.name,
    ai_exposure: s.ai_exposure,
    exposure_score: s.exposure_score,
  }));

  return { score, breakdown };
}

function suggestedFutureProofSkills(userId, limit = 3) {
  const heldIds = new Set(
    db.prepare('SELECT skill_id FROM student_skills WHERE student_user_id = ?').all(userId).map(r => r.skill_id)
  );
  const rows = db.prepare(`
    SELECT s.id, s.name, COUNT(*) n
    FROM role_skills rs
    JOIN roles r ON r.id = rs.role_id
    JOIN skills s ON s.id = rs.skill_id
    WHERE r.status = 'open' AND r.hidden = 0 AND s.ai_exposure = 'augmented'
    GROUP BY s.id
    ORDER BY n DESC, s.name ASC
  `).all();

  return rows
    .filter(r => !heldIds.has(r.id))
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      name: r.name,
      reason: `Appears in ${r.n} open role${r.n === 1 ? '' : 's'} and is an 'augmented' AI skill — worth building alongside AI tools rather than avoiding.`,
    }));
}

// ---------------------------------------------------------------------------
// F2: employer reputation percentile
// ---------------------------------------------------------------------------

function sectorsList(s) {
  return (s || '').split(',').map(x => x.trim()).filter(Boolean);
}

// Percentile rank (0-100, higher = better standing) of a company's
// employer_reputation among same-sector peers; falls back to all companies
// if fewer than 3 same-sector peers exist. Null if the company has no
// reputation value or there's no meaningful comparison group.
function reputationPercentile(companyId) {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company || company.employer_reputation == null) return null;

  const mySectors = new Set(sectorsList(company.sectors).map(s => s.toLowerCase()));
  const all = db.prepare('SELECT id, employer_reputation, sectors FROM companies WHERE employer_reputation IS NOT NULL').all();

  let peers = all.filter(c => c.id !== company.id && sectorsList(c.sectors).some(s => mySectors.has(s.toLowerCase())));
  if (peers.length < 3) {
    peers = all.filter(c => c.id !== company.id);
  }

  const group = [...peers, company];
  const n = group.length;
  if (n <= 1) return null;

  const countBelow = group.filter(c => c.employer_reputation < company.employer_reputation).length;
  return Math.round((countBelow / (n - 1)) * 100);
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
  } else if (user.role === 'university_admin') {
    const u = db.prepare('SELECT * FROM universities WHERE id = ?').get(user.university_id) || {};
    profile = {
      ...u,
      university_status: u.status || null,
      unread_notifications: unreadNotificationCount(user.id),
      unread_messages: unreadMessageCount(user.id),
    };
  } else {
    // qs_admin: no org, just notification/message counts.
    profile = {
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

// SQLite can only bind strings/numbers/null: arrays become comma-separated
// text (matching the schema's TEXT columns) and booleans become 0/1.
function toBindable(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

module.exports = {
  toBindable,
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
  logActivity,
  futureProofForStudent,
  suggestedFutureProofSkills,
  reputationPercentile,
};
