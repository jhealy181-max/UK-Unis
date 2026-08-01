const express = require('express');
const { db, requireAuth, requireRole, notify, logActivity, futureProofForStudent } = require('../lib/helpers');
const peerBenchmarks = require('../data/peer-benchmarks.json');

const router = express.Router();
// Scoped to the /university/* path prefix only — a bare router.use() with no
// path would intercept every /api/* request that falls through to this
// router (since it's mounted at /api), including unrelated routes like
// /api/notifications or /api/dev/reset registered in routers mounted after
// this one.
router.use('/university', requireAuth, requireRole('university_admin'));

const LIVE_STATUSES = ['applied', 'shortlisted', 'interview', 'offer'];
const STATUS_RANK = { hired: 7, offer: 6, interview: 5, shortlisted: 4, applied: 3, rejected: 2, withdrawn: 1 };

function computeOverview(uniId) {
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

  return {
    students: total,
    verified_pct: total ? Math.round((verifiedCount / total) * 100) : 0,
    with_live_applications: withLive,
    placements_pending_approval: pendingApproval,
    placed,
    requirement_satisfied: requirementSatisfied,
  };
}

router.get('/university/overview', (req, res) => {
  res.json(computeOverview(req.user.university_id));
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

function computePlacements(uniId) {
  const rows = db.prepare(`
    SELECT ap.id AS application_id, ap.status, ap.placement_approved, u.name AS student_name,
           r.title AS role_title, c.name AS company_name
    FROM applications ap
    JOIN users u ON u.id = ap.student_user_id
    JOIN roles r ON r.id = ap.role_id
    JOIN companies c ON c.id = r.company_id
    WHERE u.university_id = ? AND ap.status IN ('offer','hired')
    ORDER BY ap.updated_at DESC
  `).all(uniId);

  const pending = rows.filter(r => !r.placement_approved).map(r => ({
    application_id: r.application_id, student_name: r.student_name, role_title: r.role_title,
    company_name: r.company_name, status: r.status,
  }));
  const approved = rows.filter(r => r.placement_approved).map(r => ({
    application_id: r.application_id, student_name: r.student_name, role_title: r.role_title,
    company_name: r.company_name, status: r.status, placement_approved: !!r.placement_approved,
  }));
  return { pending, approved };
}

router.get('/university/placements', (req, res) => {
  res.json(computePlacements(req.user.university_id));
});

function computeSkillsGap(uniId) {
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

  return demandRows.map(d => {
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
}

router.get('/university/skills-gap', (req, res) => {
  res.json(computeSkillsGap(req.user.university_id));
});

function computeEngagementCompanies(uniId) {
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
  `).all(uniId);
  return rows.map(r => ({
    company_id: r.company_id,
    name: r.name,
    roles_targeting: r.roles_targeting,
    applications_from_cohort: r.applications_from_cohort,
    hires: r.hires || 0,
  }));
}

// F8: % of cohort with any logged activity in the last 7 days.
function activeThisWeekPct(uniId) {
  const cohort = db.prepare("SELECT id FROM users WHERE role = 'student' AND university_id = ?").all(uniId);
  if (!cohort.length) return 0;
  const activeCount = cohort.filter(s => db.prepare(
    "SELECT 1 FROM activity_log WHERE user_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(s.id)).length;
  return Math.round((activeCount / cohort.length) * 100);
}

router.get('/university/engagement', (req, res) => {
  const uniId = req.user.university_id;
  res.json({
    companies: computeEngagementCompanies(uniId),
    // F8: engagement page "% of cohort active this week" StatCard.
    active_this_week_pct: activeThisWeekPct(uniId),
  });
});

// ---------------------------------------------------------------------------
// F6. Cohort AI-readiness radar
// ---------------------------------------------------------------------------

function computeAiReadiness(uniId) {
  const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND university_id = ?").all(uniId);
  const cohortSize = students.length;

  let with3plus = 0;
  let sumFuture = 0;
  for (const s of students) {
    const augCount = db.prepare(`
      SELECT COUNT(*) n FROM student_skills ss JOIN skills sk ON sk.id = ss.skill_id
      WHERE ss.student_user_id = ? AND sk.ai_exposure = 'augmented'
    `).get(s.id).n;
    if (augCount >= 3) with3plus++;
    sumFuture += futureProofForStudent(s.id).score;
  }
  const pct_with_3plus_augmented = cohortSize ? Math.round((with3plus / cohortSize) * 100) : 0;
  const avg_future_proof = cohortSize ? Math.round(sumFuture / cohortSize) : 0;

  const by_exposure = ['augmented', 'at_risk', 'human_core'].map(cat => {
    const demand = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN rs.weight = 'high' THEN 3 ELSE 2 END), 0) demand
      FROM role_skills rs JOIN roles r ON r.id = rs.role_id JOIN skills s ON s.id = rs.skill_id
      WHERE r.status = 'open' AND r.hidden = 0 AND s.ai_exposure = ?
    `).get(cat).demand;
    const studentsWith = db.prepare(`
      SELECT COUNT(DISTINCT ss.student_user_id) n
      FROM student_skills ss JOIN users u ON u.id = ss.student_user_id JOIN skills s ON s.id = ss.skill_id
      WHERE u.university_id = ? AND s.ai_exposure = ?
    `).get(uniId, cat).n;
    const coverage_pct = cohortSize ? Math.round((studentsWith / cohortSize) * 100) : 0;
    return { ai_exposure: cat, demand, students_with: studentsWith, coverage_pct };
  });

  const close_first = db.prepare(`
    SELECT s.id, s.name AS skill, SUM(CASE WHEN rs.weight = 'high' THEN 3 ELSE 2 END) demand
    FROM role_skills rs JOIN roles r ON r.id = rs.role_id JOIN skills s ON s.id = rs.skill_id
    WHERE r.status = 'open' AND r.hidden = 0 AND s.ai_exposure = 'augmented'
    GROUP BY s.id
  `).all().map(row => {
    const studentsWith = db.prepare(`
      SELECT COUNT(*) n FROM student_skills ss JOIN users u ON u.id = ss.student_user_id
      WHERE u.university_id = ? AND ss.skill_id = ?
    `).get(uniId, row.id).n;
    const coverage_pct = cohortSize ? Math.round((studentsWith / cohortSize) * 100) : 0;
    return { skill: row.skill, coverage_pct, demand: row.demand };
  })
    .sort((a, b) => (a.coverage_pct - b.coverage_pct) || (b.demand - a.demand))
    .slice(0, 3)
    .map(r => ({
      skill: r.skill,
      reason: `High employer demand for this augmented AI skill, but only ${r.coverage_pct}% of the cohort holds it.`,
    }));

  return { cohort_size: cohortSize, pct_with_3plus_augmented, avg_future_proof, by_exposure, close_first };
}

router.get('/university/ai-readiness', (req, res) => {
  res.json(computeAiReadiness(req.user.university_id));
});

// ---------------------------------------------------------------------------
// F9. Auto-generated outcomes report
// ---------------------------------------------------------------------------

function pickBenchmarkBand(qsRank) {
  if (qsRank == null) return null;
  return peerBenchmarks.bands.find(b => qsRank <= b.max_rank) || peerBenchmarks.bands[peerBenchmarks.bands.length - 1];
}

// avg_days_to_offer for a single university, matching GET /benchmark/universities.
function avgDaysToOffer(uniId) {
  const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND university_id = ?").all(uniId);
  const dayGaps = [];
  for (const s of students) {
    const apps = db.prepare('SELECT id FROM applications WHERE student_user_id = ?').all(s.id);
    for (const a of apps) {
      const appliedEvt = db.prepare("SELECT created_at FROM application_events WHERE application_id = ? AND status = 'applied' ORDER BY created_at ASC LIMIT 1").get(a.id);
      const offerEvt = db.prepare("SELECT created_at FROM application_events WHERE application_id = ? AND status = 'offer' ORDER BY created_at ASC LIMIT 1").get(a.id);
      if (appliedEvt && offerEvt) {
        const days = (new Date(offerEvt.created_at.replace(' ', 'T') + 'Z') - new Date(appliedEvt.created_at.replace(' ', 'T') + 'Z')) / 86400000;
        if (days >= 0) dayGaps.push(days);
      }
    }
  }
  return dayGaps.length ? Math.round(dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length) : null;
}

router.get('/university/report', (req, res) => {
  const uniId = req.user.university_id;
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(uniId);

  const overview = computeOverview(uniId);
  const placements = computePlacements(uniId);
  const engagement = { companies: computeEngagementCompanies(uniId), active_this_week_pct: activeThisWeekPct(uniId) };
  const skillsGap = computeSkillsGap(uniId);
  const aiReadiness = computeAiReadiness(uniId);

  const band = pickBenchmarkBand(uni.qs_rank);
  const placementRate = overview.students ? Math.round((overview.placed / overview.students) * 100) : 0;
  const avgDays = avgDaysToOffer(uniId);
  const peer_benchmark = band ? {
    rank_band: band.rank_band,
    median_verified_pct: band.median_verified_pct,
    median_placement_rate: band.median_placement_rate,
    median_avg_days_to_offer: band.median_avg_days_to_offer,
    delta_verified_pct: overview.verified_pct - band.median_verified_pct,
    delta_placement_rate: placementRate - band.median_placement_rate,
    delta_avg_days_to_offer: avgDays != null ? avgDays - band.median_avg_days_to_offer : null,
  } : null;

  logActivity(req.user.id, 'report_generated');

  res.json({
    university: { id: uni.id, name: uni.name, city: uni.city, country: uni.country, qs_rank: uni.qs_rank },
    generated_at: new Date().toISOString(),
    overview,
    placements,
    engagement,
    skills_gap: skillsGap,
    ai_readiness: aiReadiness,
    placement_rate: placementRate,
    avg_days_to_offer: avgDays,
    peer_benchmark,
  });
});

// ---------------------------------------------------------------------------
// F4. University settings (alumni spotlight opt-out)
// ---------------------------------------------------------------------------

router.patch('/university/settings', (req, res) => {
  const { spotlight_optout } = req.body || {};
  if (spotlight_optout !== 0 && spotlight_optout !== 1) {
    return res.status(400).json({ error: 'spotlight_optout must be 0 or 1' });
  }
  db.prepare('UPDATE universities SET spotlight_optout = ? WHERE id = ?').run(spotlight_optout, req.user.university_id);
  res.json(db.prepare('SELECT * FROM universities WHERE id = ?').get(req.user.university_id));
});

module.exports = router;
