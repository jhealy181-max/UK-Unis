const express = require('express');
const { db, requireAuth, requireRole, notify } = require('../lib/helpers');

const router = express.Router();
// Scoped to the /university/* path prefix only — a bare router.use() with no
// path would intercept every /api/* request that falls through to this
// router (since it's mounted at /api), including unrelated routes like
// /api/notifications or /api/dev/reset registered in routers mounted after
// this one.
router.use('/university', requireAuth, requireRole('university_admin'));

const LIVE_STATUSES = ['applied', 'shortlisted', 'interview', 'offer'];
const STATUS_RANK = { hired: 7, offer: 6, interview: 5, shortlisted: 4, applied: 3, rejected: 2, withdrawn: 1 };

router.get('/university/overview', (req, res) => {
  const uniId = req.user.university_id;
  const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND university_id = ?").all(uniId);
  const studentIds = students.map(s => s.id);
  const total = studentIds.length;

  let verifiedCount = 0;
  let withLive = 0;
  let placed = 0;
  let pendingApproval = 0;
  let requirementSatisfied = 0;

  for (const sid of studentIds) {
    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(sid) || {};
    if (profile.verified) verifiedCount++;
    if (profile.placement_required_hours != null && profile.placement_satisfied) requirementSatisfied++;

    const apps = db.prepare('SELECT * FROM applications WHERE student_user_id = ?').all(sid);
    if (apps.some(a => LIVE_STATUSES.includes(a.status))) withLive++;
    if (apps.some(a => a.status === 'offer' || a.status === 'hired')) placed++;
    pendingApproval += apps.filter(a => ['offer', 'hired'].includes(a.status) && !a.placement_approved).length;
  }

  res.json({
    students: total,
    verified_pct: total ? Math.round((verifiedCount / total) * 100) : 0,
    with_live_applications: withLive,
    placements_pending_approval: pendingApproval,
    placed,
    requirement_satisfied: requirementSatisfied,
  });
});

router.get('/university/verifications', (req, res) => {
  const rows = db.prepare(`
    SELECT ec.id, ec.student_user_id, u.name AS student_name, ec.course, ec.start_year, ec.end_year, ec.created_at
    FROM education_claims ec JOIN users u ON u.id = ec.student_user_id
    WHERE ec.university_id = ? AND ec.status = 'pending'
    ORDER BY ec.created_at ASC
  `).all(req.user.university_id);
  res.json(rows.map(r => ({
    id: r.id,
    student: { user_id: r.student_user_id, name: r.student_name },
    course: r.course,
    start_year: r.start_year,
    end_year: r.end_year,
    created_at: r.created_at,
  })));
});

router.patch('/university/verifications/:id', (req, res) => {
  const claim = db.prepare('SELECT * FROM education_claims WHERE id = ?').get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Not found' });
  if (claim.university_id !== req.user.university_id) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'invalid status' });

  db.prepare('UPDATE education_claims SET status = ? WHERE id = ?').run(status, claim.id);
  const uni = db.prepare('SELECT name FROM universities WHERE id = ?').get(req.user.university_id);
  if (status === 'approved') {
    db.prepare('UPDATE student_profiles SET verified = 1 WHERE user_id = ?').run(claim.student_user_id);
    notify(claim.student_user_id, 'verification', `Your enrolment at ${uni.name} has been verified`, '/student/profile');
  } else {
    notify(claim.student_user_id, 'verification', `Your verification request for ${claim.course} was declined`, '/student/profile');
  }

  res.json(db.prepare('SELECT * FROM education_claims WHERE id = ?').get(claim.id));
});

router.get('/university/cohort', (req, res) => {
  const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND university_id = ?").all(req.user.university_id);
  const result = students.map(s => {
    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(s.id) || {};
    const claim = db.prepare('SELECT course, end_year FROM education_claims WHERE student_user_id = ? ORDER BY created_at DESC LIMIT 1').get(s.id) || {};
    const skillsCount = db.prepare('SELECT COUNT(*) n FROM student_skills WHERE student_user_id = ?').get(s.id).n;
    const apps = db.prepare('SELECT status FROM applications WHERE student_user_id = ?').all(s.id);
    const live = apps.filter(a => LIVE_STATUSES.includes(a.status)).length;
    let bestStatus = null;
    for (const a of apps) {
      if (!bestStatus || STATUS_RANK[a.status] > STATUS_RANK[bestStatus]) bestStatus = a.status;
    }
    return {
      user_id: s.id,
      name: s.name,
      course: claim.course || null,
      end_year: claim.end_year || null,
      verified: !!profile.verified,
      skills_count: skillsCount,
      applications: { total: apps.length, live, best_status: bestStatus },
      placement_required_hours: profile.placement_required_hours,
      placement_satisfied: !!profile.placement_satisfied,
    };
  });
  res.json(result);
});

router.patch('/university/students/:userId', (req, res) => {
  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(req.params.userId);
  if (!student || student.university_id !== req.user.university_id) return res.status(404).json({ error: 'Not found' });
  const { placement_satisfied } = req.body || {};
  if (![0, 1].includes(placement_satisfied)) return res.status(400).json({ error: 'placement_satisfied must be 0 or 1' });

  db.prepare('UPDATE student_profiles SET placement_satisfied = ? WHERE user_id = ?').run(placement_satisfied, student.id);
  res.json(db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student.id));
});

router.get('/university/placements', (req, res) => {
  const rows = db.prepare(`
    SELECT ap.id AS application_id, ap.status, ap.placement_approved, u.name AS student_name,
           r.title AS role_title, c.name AS company_name
    FROM applications ap
    JOIN users u ON u.id = ap.student_user_id
    JOIN roles r ON r.id = ap.role_id
    JOIN companies c ON c.id = r.company_id
    WHERE u.university_id = ? AND ap.status IN ('offer','hired')
    ORDER BY ap.updated_at DESC
  `).all(req.user.university_id);

  const pending = rows.filter(r => !r.placement_approved).map(r => ({
    application_id: r.application_id, student_name: r.student_name, role_title: r.role_title,
    company_name: r.company_name, status: r.status,
  }));
  const approved = rows.filter(r => r.placement_approved).map(r => ({
    application_id: r.application_id, student_name: r.student_name, role_title: r.role_title,
    company_name: r.company_name, status: r.status, placement_approved: !!r.placement_approved,
  }));
  res.json({ pending, approved });
});

router.get('/university/skills-gap', (req, res) => {
  const uniId = req.user.university_id;
  const cohortSize = db.prepare(
    "SELECT COUNT(*) n FROM users WHERE role = 'student' AND university_id = ?"
  ).get(uniId).n;

  const demandRows = db.prepare(`
    SELECT s.id AS id, s.name AS skill, s.category AS category,
           SUM(CASE WHEN rs.weight = 'high' THEN 3 ELSE 2 END) AS demand
    FROM role_skills rs
    JOIN roles r ON r.id = rs.role_id
    JOIN skills s ON s.id = rs.skill_id
    WHERE r.status = 'open' AND r.hidden = 0
    GROUP BY s.id
    ORDER BY demand DESC
    LIMIT 15
  `).all();

  const result = demandRows.map(d => {
    const studentsWith = db.prepare(`
      SELECT COUNT(*) n FROM student_skills ss
      JOIN users u ON u.id = ss.student_user_id
      WHERE u.university_id = ? AND ss.skill_id = ?
    `).get(uniId, d.id).n;
    const coveragePct = cohortSize ? Math.round((studentsWith / cohortSize) * 100) : 0;
    return {
      skill: d.skill,
      category: d.category,
      demand: d.demand,
      students_with: studentsWith,
      cohort_size: cohortSize,
      coverage_pct: coveragePct,
    };
  });

  res.json(result);
});

router.get('/university/engagement', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id AS company_id, c.name,
           COUNT(DISTINCT ap.role_id) AS roles_targeting,
           COUNT(ap.id) AS applications_from_cohort,
           SUM(CASE WHEN ap.status = 'hired' THEN 1 ELSE 0 END) AS hires
    FROM applications ap
    JOIN roles r ON r.id = ap.role_id
    JOIN companies c ON c.id = r.company_id
    JOIN users u ON u.id = ap.student_user_id
    WHERE u.university_id = ?
    GROUP BY c.id, c.name
    ORDER BY applications_from_cohort DESC
  `).all(req.user.university_id);
  res.json(rows.map(r => ({
    company_id: r.company_id,
    name: r.name,
    roles_targeting: r.roles_targeting,
    applications_from_cohort: r.applications_from_cohort,
    hires: r.hires || 0,
  })));
});

module.exports = router;
