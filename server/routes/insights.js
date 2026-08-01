// server/routes/insights.js — Iteration 3 endpoints: F1 future-proof score,
// F5 AI interview coach, F7 benchmarking explorer, F8 career momentum,
// F10 subject-level pathways.
// (F6 AI-readiness radar and F9 outcomes report live in routes/university.js
// since they're scoped to the existing /university/* prefix + middleware.)

const express = require('express');
const {
  db, requireAuth, requireRole, logActivity, futureProofForStudent, suggestedFutureProofSkills,
  computeProfileStrength,
} = require('../lib/helpers');
const interviewBank = require('../data/interview-bank.json');

const router = express.Router();

// ---------------------------------------------------------------------------
// F1. Future-proof skill score
// ---------------------------------------------------------------------------

router.get('/me/future-proof', requireAuth, requireRole('student'), (req, res) => {
  const { score, breakdown } = futureProofForStudent(req.user.id);
  const suggested_skills = suggestedFutureProofSkills(req.user.id, 3);
  res.json({ score, breakdown, suggested_skills });
});

// ---------------------------------------------------------------------------
// F5. AI interview coach
// ---------------------------------------------------------------------------

// Role sector -> extra sector-flavour question category (beyond the skill
// categories already on the role's required skills).
const SECTOR_CATEGORY_MAP = {
  Consulting: 'Consulting', Finance: 'Finance', Engineering: 'Engineering', Media: 'Media',
};

function categoriesForRole(roleId, role) {
  const skillCats = db.prepare(`
    SELECT DISTINCT s.category FROM role_skills rs JOIN skills s ON s.id = rs.skill_id WHERE rs.role_id = ?
  `).all(roleId).map(r => r.category);
  const cats = new Set(skillCats);
  if (SECTOR_CATEGORY_MAP[role.sector]) cats.add(SECTOR_CATEGORY_MAP[role.sector]);
  if (cats.size === 0) cats.add('Soft');
  return [...cats];
}

// Deterministic selection (no randomness — see ITERATION-3.md "AI-powered
// behaviour is deterministic"): lowest-id questions in the matched
// categories first, padded from the Soft/behavioural category if short.
function pickQuestions(categories, count = 5) {
  const pool = interviewBank.filter(q => categories.includes(q.category)).sort((a, b) => a.id - b.id);
  const result = [];
  const seen = new Set();
  for (const q of pool) {
    if (result.length >= count) break;
    result.push(q);
    seen.add(q.id);
  }
  if (result.length < count) {
    const filler = interviewBank.filter(q => q.category === 'Soft' && !seen.has(q.id)).sort((a, b) => a.id - b.id);
    for (const q of filler) {
      if (result.length >= count) break;
      result.push(q);
      seen.add(q.id);
    }
  }
  return result.slice(0, count);
}

router.get('/interview/questions', requireAuth, requireRole('student'), (req, res) => {
  const { role_id, category } = req.query;
  let categories;
  let role = null;

  if (role_id) {
    role = db.prepare('SELECT * FROM roles WHERE id = ?').get(role_id);
    if (!role) return res.status(400).json({ error: 'Unknown role_id' });
    categories = categoriesForRole(role_id, role);
  } else if (category) {
    if (!interviewBank.some(q => q.category === category)) return res.status(400).json({ error: 'Unknown category' });
    categories = [category];
  } else {
    return res.status(400).json({ error: 'role_id or category is required' });
  }

  const questions = pickQuestions(categories, 5).map(q => ({
    id: q.id, category: q.category, question: q.question, star_expected: q.star_expected,
  }));
  res.json({ role: role ? { id: role.id, title: role.title } : null, categories, questions });
});

// STAR heuristic cue words (situation / action / result).
const STAR_CUES = {
  situation: ['situation', 'context', 'background', 'when i', 'while working', 'at the time'],
  action: ['i decided', 'i led', 'i built', 'i implemented', 'i approached', 'my approach', 'i took the', 'action'],
  result: ['result', 'outcome', 'achieved', 'improved', 'increased', 'reduced', 'impact', 'led to'],
};

function scoreAnswer(question, text) {
  const clean = (text || '').toLowerCase();
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const keywords = question.keywords || [];
  const matched = keywords.filter(k => clean.includes(k.toLowerCase()));
  const keywordPct = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;

  const starHits = Object.values(STAR_CUES).filter(cues => cues.some(c => clean.includes(c)));
  const starPct = Math.round((starHits.length / 3) * 100);

  let lengthPct;
  if (wordCount >= 40 && wordCount <= 250) lengthPct = 100;
  else if (wordCount < 40) lengthPct = Math.round((wordCount / 40) * 100);
  else lengthPct = Math.max(0, Math.round(100 - (wordCount - 250) / 5));

  const starScore = Math.round((starPct + lengthPct) / 2);
  const score = Math.max(0, Math.min(100, Math.round(keywordPct * 0.6 + starScore * 0.4)));

  const feedbackParts = [];
  feedbackParts.push(matched.length
    ? `Touched on ${matched.length}/${keywords.length} key ideas (${matched.join(', ')}).`
    : 'Try to reference more of the concepts this question is looking for.');
  feedbackParts.push(starPct >= 67
    ? 'Good STAR structure — situation, action and result all came through.'
    : 'Strengthen the STAR structure: be explicit about the situation, your action and the result.');
  feedbackParts.push(wordCount >= 40 && wordCount <= 250
    ? `Answer length (${wordCount} words) was in the ideal range.`
    : wordCount < 40
      ? `Answer was quite short (${wordCount} words) — aim for 40-250 words.`
      : `Answer was quite long (${wordCount} words) — aim for 40-250 words.`);

  return { score, feedback: feedbackParts.join(' ') };
}

function readinessLabel(score) {
  if (score >= 80) return 'Interview-ready';
  if (score >= 60) return 'Developing';
  return 'Needs practice';
}

router.post('/interview/attempts', requireAuth, requireRole('student'), (req, res) => {
  const { role_id, category, answers } = req.body || {};
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ error: 'answers array is required' });
  }

  let role = null;
  if (role_id) {
    role = db.prepare('SELECT * FROM roles WHERE id = ?').get(role_id);
    if (!role) return res.status(400).json({ error: 'Unknown role_id' });
  }

  const perQuestion = [];
  for (const a of answers) {
    const q = interviewBank.find(x => x.id === a.question_id);
    if (!q) return res.status(400).json({ error: `Unknown question_id ${a.question_id}` });
    const { score, feedback } = scoreAnswer(q, a.text || '');
    perQuestion.push({ question_id: q.id, score, feedback });
  }
  const overall = Math.round(perQuestion.reduce((sum, p) => sum + p.score, 0) / perQuestion.length);
  const readiness_label = readinessLabel(overall);
  const categoryLabel = category || (role ? `Role: ${role.title}` : 'Mixed');

  const r = db.prepare(`
    INSERT INTO interview_attempts (user_id, role_id, category, score, feedback_json)
    VALUES (?,?,?,?,?)
  `).run(req.user.id, role_id || null, categoryLabel, overall, JSON.stringify(perQuestion));

  logActivity(req.user.id, 'interview_attempt');

  res.json({ id: r.lastInsertRowid, score: overall, per_question: perQuestion, readiness_label });
});

router.get('/interview/attempts', requireAuth, requireRole('student'), (req, res) => {
  const rows = db.prepare(`
    SELECT ia.*, r.title AS role_title FROM interview_attempts ia
    LEFT JOIN roles r ON r.id = ia.role_id
    WHERE ia.user_id = ? ORDER BY ia.created_at DESC, ia.id DESC
  `).all(req.user.id);
  res.json(rows.map(r => ({
    id: r.id,
    role: r.role_id ? { id: r.role_id, title: r.role_title } : null,
    category: r.category,
    score: r.score,
    per_question: JSON.parse(r.feedback_json || '[]'),
    readiness_label: readinessLabel(r.score),
    created_at: r.created_at,
  })));
});

// ---------------------------------------------------------------------------
// F7. QS outcomes benchmarking explorer
// ---------------------------------------------------------------------------

function benchmarkRow(u) {
  const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND university_id = ?").all(u.id);
  const total = students.length;
  let verified = 0;
  let placed = 0;
  const dayGaps = [];

  for (const s of students) {
    const profile = db.prepare('SELECT verified FROM student_profiles WHERE user_id = ?').get(s.id) || {};
    if (profile.verified) verified++;
    const apps = db.prepare('SELECT * FROM applications WHERE student_user_id = ?').all(s.id);
    if (apps.some(a => a.status === 'offer' || a.status === 'hired')) placed++;
    for (const a of apps) {
      const appliedEvt = db.prepare("SELECT created_at FROM application_events WHERE application_id = ? AND status = 'applied' ORDER BY created_at ASC LIMIT 1").get(a.id);
      const offerEvt = db.prepare("SELECT created_at FROM application_events WHERE application_id = ? AND status = 'offer' ORDER BY created_at ASC LIMIT 1").get(a.id);
      if (appliedEvt && offerEvt) {
        const days = (new Date(offerEvt.created_at.replace(' ', 'T') + 'Z') - new Date(appliedEvt.created_at.replace(' ', 'T') + 'Z')) / 86400000;
        if (days >= 0) dayGaps.push(days);
      }
    }
  }

  return {
    id: u.id,
    name: u.name,
    qs_rank: u.qs_rank,
    employer_reputation: u.employer_reputation,
    employment_outcomes: u.employment_outcomes,
    students: total,
    verified_pct: total ? Math.round((verified / total) * 100) : 0,
    placements: placed,
    avg_days_to_offer: dayGaps.length ? Math.round(dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length) : null,
  };
}

router.get('/benchmark/universities', requireAuth, (req, res) => {
  const unis = db.prepare("SELECT * FROM universities WHERE status = 'approved' ORDER BY qs_rank ASC").all();
  res.json(unis.map(benchmarkRow));
});

// ---------------------------------------------------------------------------
// F8. Career momentum streaks & milestones
// ---------------------------------------------------------------------------

const WEEK_MS = 7 * 24 * 3600 * 1000;

function toUtcMs(sqliteTs) {
  return new Date(sqliteTs.replace(' ', 'T') + 'Z').getTime();
}
function weekIndex(sqliteTs) {
  return Math.floor(toUtcMs(sqliteTs) / WEEK_MS);
}

router.get('/me/momentum', requireAuth, requireRole('student'), (req, res) => {
  const userId = req.user.id;

  const activity = db.prepare('SELECT activity_type, created_at FROM activity_log WHERE user_id = ?').all(userId);
  const currentWeek = Math.floor(Date.now() / WEEK_MS);
  const weeks = new Set(activity.map(r => weekIndex(r.created_at)));
  const week_count = activity.filter(r => weekIndex(r.created_at) === currentWeek).length;
  let streak_weeks = 0;
  let idx = currentWeek;
  while (weeks.has(idx)) { streak_weeks++; idx--; }

  const apps = db.prepare('SELECT id, created_at FROM applications WHERE student_user_id = ? ORDER BY created_at ASC, id ASC').all(userId);
  const firstApp = apps[0] || null;
  const fifthApp = apps[4] || null;

  const firstAcceptedConn = db.prepare(`
    SELECT created_at FROM connections
    WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
    ORDER BY created_at ASC LIMIT 1
  `).get(userId, userId);

  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId) || {};
  const skillCount = db.prepare('SELECT COUNT(*) n FROM student_skills WHERE student_user_id = ?').get(userId).n;
  const experienceCount = db.prepare('SELECT COUNT(*) n FROM experience_entries WHERE student_user_id = ?').get(userId).n;
  const hasApprovedClaim = !!db.prepare("SELECT 1 FROM education_claims WHERE student_user_id = ? AND status = 'approved'").get(userId);
  const profileStrength = computeProfileStrength(profile, skillCount, experienceCount, hasApprovedClaim);
  const lastProfileEdit = db.prepare(`
    SELECT created_at FROM activity_log WHERE user_id = ? AND activity_type = 'profile_edit'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  const firstInterview = db.prepare('SELECT created_at FROM interview_attempts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId);

  const firstOfferEvent = db.prepare(`
    SELECT ae.created_at FROM application_events ae
    JOIN applications a ON a.id = ae.application_id
    WHERE a.student_user_id = ? AND ae.status = 'offer'
    ORDER BY ae.created_at ASC LIMIT 1
  `).get(userId);

  const verifiedClaim = db.prepare(`
    SELECT created_at FROM education_claims WHERE student_user_id = ? AND status = 'approved'
    ORDER BY created_at ASC LIMIT 1
  `).get(userId);

  const milestones = [
    { key: 'first_application', label: 'Submitted your first application', achieved: !!firstApp, achieved_at: firstApp ? firstApp.created_at : null },
    { key: 'five_applications', label: 'Submitted 5 applications', achieved: apps.length >= 5, achieved_at: fifthApp ? fifthApp.created_at : null },
    { key: 'first_connection', label: 'Made your first connection', achieved: !!firstAcceptedConn, achieved_at: firstAcceptedConn ? firstAcceptedConn.created_at : null },
    { key: 'profile_75', label: 'Reached 75% profile strength', achieved: profileStrength >= 75, achieved_at: profileStrength >= 75 ? (lastProfileEdit ? lastProfileEdit.created_at : null) : null },
    { key: 'verified', label: 'Verified your enrolment', achieved: !!profile.verified, achieved_at: profile.verified ? (verifiedClaim ? verifiedClaim.created_at : null) : null },
    { key: 'first_interview_practice', label: 'Completed your first interview practice', achieved: !!firstInterview, achieved_at: firstInterview ? firstInterview.created_at : null },
    { key: 'first_offer', label: 'Received your first offer', achieved: !!firstOfferEvent, achieved_at: firstOfferEvent ? firstOfferEvent.created_at : null },
  ];

  res.json({ week_count, streak_weeks, milestones });
});

// ---------------------------------------------------------------------------
// F10. Subject-level career pathways
// ---------------------------------------------------------------------------

const SUBJECT_ORDER = ['Computer Science', 'Business & Management', 'Engineering', 'Data Science'];

router.get('/pathways', requireAuth, (req, res) => {
  const rawSubjects = db.prepare('SELECT DISTINCT subject FROM subject_outcomes').all().map(r => r.subject);
  const subjects = rawSubjects.slice().sort((a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b));
  const requested = req.query.subject;
  const subject = requested && subjects.includes(requested) ? requested : subjects[0];

  const rows = subject ? db.prepare(`
    SELECT so.*, u.name AS university_name, u.qs_rank
    FROM subject_outcomes so JOIN universities u ON u.id = so.university_id
    WHERE so.subject = ? AND u.status = 'approved'
    ORDER BY so.subject_rank ASC
  `).all(subject) : [];

  const universities = rows.map(r => {
    const sectors = r.top_sectors.split(',').map(s => s.trim()).filter(Boolean);
    const top_sectors = sectors.map(sector => ({
      sector,
      open_roles: db.prepare("SELECT COUNT(*) n FROM roles WHERE sector = ? AND status = 'open' AND hidden = 0").get(sector).n,
    }));
    return {
      university_id: r.university_id,
      university_name: r.university_name,
      qs_rank: r.qs_rank,
      subject_rank: r.subject_rank,
      median_days_to_offer: r.median_days_to_offer,
      top_sectors,
    };
  });

  res.json({ subjects, subject: subject || null, universities });
});

module.exports = router;
