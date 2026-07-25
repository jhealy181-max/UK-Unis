const path = require('path');
const express = require('express');
const { db, seed, resetAndSeed } = require('./db');

seed();

const app = express();
app.use(express.json());

// ---- helpers -------------------------------------------------------------

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function loadUser(req, res, next) {
  const header = req.get('x-user-id');
  if (header !== undefined) {
    const id = Number(header);
    if (Number.isInteger(id)) {
      const user = getUserById(id);
      if (user) req.user = user;
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'missing or invalid x-user-id header' });
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: `${role} role required` });
    next();
  };
}

function notify(userId, message) {
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?,?)').run(userId, message);
}

function employerUserIds(employerId) {
  return db.prepare("SELECT id FROM users WHERE role = 'employer' AND employer_id = ?").all(employerId).map(r => r.id);
}

function universityUserIds(universityId) {
  return db.prepare("SELECT id FROM users WHERE role = 'university' AND university_id = ?").all(universityId).map(r => r.id);
}

app.use(loadUser);

// ---- accounts / auth ------------------------------------------------------

app.get('/api/accounts', (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, un.name AS university, sp.course
    FROM users u
    JOIN universities un ON un.id = u.university_id
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student'
    ORDER BY u.id
  `).all();

  const employers = db.prepare(`
    SELECT u.id, u.name, u.email, e.name AS company
    FROM users u
    JOIN employers e ON e.id = u.employer_id
    WHERE u.role = 'employer'
    ORDER BY u.id
  `).all();

  const universities = db.prepare(`
    SELECT u.id, u.name, u.email, un.name AS university
    FROM users u
    JOIN universities un ON un.id = u.university_id
    WHERE u.role = 'university'
    ORDER BY u.id
  `).all();

  res.json({ students, employers, universities });
});

app.get('/api/me', requireAuth, (req, res) => {
  const u = req.user;
  const base = { id: u.id, role: u.role, name: u.name, email: u.email, university_id: u.university_id, employer_id: u.employer_id };

  if (u.role === 'student') {
    const sp = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(u.id);
    const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(u.university_id);
    base.profile = {
      course: sp.course,
      year: sp.year,
      skills: sp.skills,
      hours_completed: sp.hours_completed,
      requirement_met: sp.requirement_met,
      university_name: uni.name,
      required_hours: uni.required_hours,
    };
  } else if (u.role === 'employer') {
    base.profile = db.prepare('SELECT * FROM employers WHERE id = ?').get(u.employer_id);
  } else if (u.role === 'university') {
    const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(u.university_id);
    base.profile = { ...uni, required_hours: uni.required_hours };
  }

  res.json(base);
});

// ---- internships -----------------------------------------------------------

app.get('/api/internships', (req, res) => {
  const { search, sector, location, paid } = req.query;
  let sql = `
    SELECT i.*, e.name AS employer_name
    FROM internships i
    JOIN employers e ON e.id = i.employer_id
    WHERE i.status = 'open'
  `;
  const params = [];
  if (search) {
    sql += ' AND (i.title LIKE ? OR i.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (sector) {
    sql += ' AND i.sector = ?';
    params.push(sector);
  }
  if (location) {
    sql += ' AND i.location = ?';
    params.push(location);
  }
  if (paid === '1' || paid === '0') {
    sql += ' AND i.paid = ?';
    params.push(Number(paid));
  }
  sql += ' ORDER BY i.created_at DESC';

  const internships = db.prepare(sql).all(...params);

  if (req.user && req.user.role === 'student') {
    const appStmt = db.prepare('SELECT status FROM applications WHERE internship_id = ? AND student_user_id = ?');
    for (const i of internships) {
      const app = appStmt.get(i.id, req.user.id);
      i.my_application_status = app ? app.status : null;
    }
  }

  const sectors = db.prepare("SELECT DISTINCT sector FROM internships WHERE status = 'open' ORDER BY sector").all().map(r => r.sector);
  const locations = db.prepare("SELECT DISTINCT location FROM internships WHERE status = 'open' ORDER BY location").all().map(r => r.location);

  res.json({ internships, sectors, locations });
});

app.get('/api/internships/:id', (req, res) => {
  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!internship) return res.status(404).json({ error: 'internship not found' });
  const employer = db.prepare('SELECT * FROM employers WHERE id = ?').get(internship.employer_id);
  res.json({ ...internship, employer });
});

app.post('/api/internships', requireAuth, requireRole('employer'), (req, res) => {
  const { title, sector, location, duration_weeks, hours_total, paid, stipend, description, requirements, deadline } = req.body;
  if (!title || !sector || !location || !duration_weeks || !hours_total || !description || !deadline) {
    return res.status(400).json({ error: 'missing required fields' });
  }
  const result = db.prepare(`
    INSERT INTO internships (employer_id, title, sector, location, duration_weeks, hours_total, paid, stipend, description, requirements, deadline)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(req.user.employer_id, title, sector, location, duration_weeks, hours_total, paid ? 1 : 0, stipend || null, description, requirements || null, deadline);

  const created = db.prepare('SELECT * FROM internships WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/internships/:id', requireAuth, requireRole('employer'), (req, res) => {
  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!internship) return res.status(404).json({ error: 'internship not found' });
  if (internship.employer_id !== req.user.employer_id) return res.status(403).json({ error: 'not your posting' });

  const editable = ['title', 'sector', 'location', 'duration_weeks', 'hours_total', 'paid', 'stipend', 'description', 'requirements', 'deadline', 'status'];
  const updates = [];
  const params = [];
  for (const field of editable) {
    if (req.body[field] !== undefined) {
      if (field === 'status' && !['open', 'closed'].includes(req.body.status)) {
        return res.status(400).json({ error: 'invalid status' });
      }
      updates.push(`${field} = ?`);
      params.push(field === 'paid' ? (req.body.paid ? 1 : 0) : req.body[field]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'no fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE internships SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id));
});

app.get('/api/employer/internships', requireAuth, requireRole('employer'), (req, res) => {
  const internships = db.prepare(`
    SELECT i.*, (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicant_count
    FROM internships i
    WHERE i.employer_id = ?
    ORDER BY i.created_at DESC
  `).all(req.user.employer_id);
  res.json(internships);
});

app.get('/api/internships/:id/applications', requireAuth, requireRole('employer'), (req, res) => {
  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!internship) return res.status(404).json({ error: 'internship not found' });
  if (internship.employer_id !== req.user.employer_id) return res.status(403).json({ error: 'not your posting' });

  const applications = db.prepare(`
    SELECT a.id, a.cover_note, a.status, a.applied_at, a.updated_at,
           u.id AS student_id, u.name AS student_name, un.name AS university_name,
           sp.course, sp.year, sp.skills, sp.hours_completed
    FROM applications a
    JOIN users u ON u.id = a.student_user_id
    JOIN universities un ON un.id = u.university_id
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE a.internship_id = ?
    ORDER BY a.applied_at DESC
  `).all(req.params.id);

  res.json(applications);
});

// ---- applications -----------------------------------------------------------

app.post('/api/applications', requireAuth, requireRole('student'), (req, res) => {
  const { internship_id, cover_note } = req.body;
  if (!internship_id) return res.status(400).json({ error: 'internship_id required' });

  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(internship_id);
  if (!internship) return res.status(404).json({ error: 'internship not found' });
  if (internship.status !== 'open') return res.status(409).json({ error: 'internship is closed' });

  const existing = db.prepare('SELECT id FROM applications WHERE internship_id = ? AND student_user_id = ?').get(internship_id, req.user.id);
  if (existing) return res.status(409).json({ error: 'already applied' });

  const result = db.prepare('INSERT INTO applications (internship_id, student_user_id, cover_note, status) VALUES (?,?,?,\'applied\')')
    .run(internship_id, req.user.id, cover_note || '');

  for (const uid of employerUserIds(internship.employer_id)) {
    notify(uid, `New application from ${req.user.name} for ${internship.title}`);
  }

  const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.get('/api/my/applications', requireAuth, requireRole('student'), (req, res) => {
  const applications = db.prepare(`
    SELECT a.*, i.title, i.sector, i.location, i.duration_weeks, i.hours_total, i.paid, i.stipend, i.deadline,
           e.id AS employer_id, e.name AS employer_name
    FROM applications a
    JOIN internships i ON i.id = a.internship_id
    JOIN employers e ON e.id = i.employer_id
    WHERE a.student_user_id = ?
    ORDER BY a.applied_at DESC
  `).all(req.user.id);
  res.json(applications);
});

const TRANSITIONS = {
  applied: { shortlisted: 'employer', rejected: 'employer' },
  shortlisted: { offer: 'employer', rejected: 'employer' },
  offer: { accepted: 'student', rejected: 'employer' },
  accepted: { withdrawn: 'student', approved: 'university' },
  approved: { withdrawn: 'student', completed: 'university' },
};

app.patch('/api/applications/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });

  const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!application) return res.status(404).json({ error: 'application not found' });

  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(application.internship_id);
  const employer = db.prepare('SELECT * FROM employers WHERE id = ?').get(internship.employer_id);
  const studentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(application.student_user_id);

  const allowed = TRANSITIONS[application.status];
  const requiredRole = allowed ? allowed[status] : undefined;
  if (!requiredRole) return res.status(400).json({ error: `cannot move from ${application.status} to ${status}` });

  if (req.user.role !== requiredRole) return res.status(403).json({ error: `${requiredRole} role required for this transition` });

  if (requiredRole === 'employer' && internship.employer_id !== req.user.employer_id) {
    return res.status(403).json({ error: 'not your posting' });
  }
  if (requiredRole === 'student' && application.student_user_id !== req.user.id) {
    return res.status(403).json({ error: 'not your application' });
  }
  if (requiredRole === 'university' && studentUser.university_id !== req.user.university_id) {
    return res.status(403).json({ error: 'not a student at your university' });
  }

  db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, application.id);

  if (status === 'completed') {
    const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(studentUser.university_id);
    const sp = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentUser.id);
    const newHours = sp.hours_completed + internship.hours_total;
    const requirementMet = newHours >= uni.required_hours ? 1 : sp.requirement_met;
    db.prepare('UPDATE student_profiles SET hours_completed = ?, requirement_met = ? WHERE user_id = ?').run(newHours, requirementMet, studentUser.id);
  }

  const messages = {
    shortlisted: { student: `You've been shortlisted for ${internship.title} at ${employer.name}` },
    offer: { student: `You've received an offer for ${internship.title} at ${employer.name}` },
    rejected: { student: `Your application for ${internship.title} was not successful` },
    accepted: {
      student: `You accepted the offer for ${internship.title} at ${employer.name}`,
      employer: `${studentUser.name} accepted the offer for ${internship.title}`,
      university: `${studentUser.name}'s placement for ${internship.title} is pending approval`,
    },
    withdrawn: {
      student: `You withdrew your application for ${internship.title}`,
      employer: `${studentUser.name} withdrew their application for ${internship.title}`,
    },
    approved: { student: `Your placement for ${internship.title} has been approved by your university` },
    completed: { student: `Your placement for ${internship.title} has been marked complete. Hours credited: ${internship.hours_total}` },
  };

  const targets = messages[status] || {};
  if (targets.student) notify(studentUser.id, targets.student);
  if (targets.employer) for (const uid of employerUserIds(internship.employer_id)) notify(uid, targets.employer);
  if (targets.university) for (const uid of universityUserIds(studentUser.university_id)) notify(uid, targets.university);

  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(application.id));
});

// ---- university -----------------------------------------------------------

app.get('/api/university/students', requireAuth, requireRole('university'), (req, res) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.user.university_id);
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, sp.course, sp.year, sp.hours_completed, sp.requirement_met
    FROM users u
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student' AND u.university_id = ?
    ORDER BY u.name
  `).all(req.user.university_id);

  const appStmt = db.prepare(`
    SELECT a.status, i.title, e.name AS employer_name
    FROM applications a
    JOIN internships i ON i.id = a.internship_id
    JOIN employers e ON e.id = i.employer_id
    WHERE a.student_user_id = ?
    ORDER BY a.applied_at DESC
  `);

  for (const s of students) {
    s.required_hours = uni.required_hours;
    s.applications = appStmt.all(s.id);
  }

  res.json(students);
});

app.patch('/api/university/students/:userId', requireAuth, requireRole('university'), (req, res) => {
  const { requirement_met } = req.body;
  if (requirement_met !== 0 && requirement_met !== 1) return res.status(400).json({ error: 'requirement_met must be 0 or 1' });

  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(req.params.userId);
  if (!student) return res.status(404).json({ error: 'student not found' });
  if (student.university_id !== req.user.university_id) return res.status(403).json({ error: 'not a student at your university' });

  db.prepare('UPDATE student_profiles SET requirement_met = ? WHERE user_id = ?').run(requirement_met, student.id);
  res.json(db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student.id));
});

app.get('/api/university/overview', requireAuth, requireRole('university'), (req, res) => {
  const universityId = req.user.university_id;

  const total_students = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student' AND university_id = ?").get(universityId).c;

  const active_placements = db.prepare(`
    SELECT COUNT(DISTINCT a.student_user_id) c
    FROM applications a
    JOIN users u ON u.id = a.student_user_id
    WHERE u.university_id = ? AND a.status IN ('accepted','approved')
  `).get(universityId).c;

  const pending_approvals = db.prepare(`
    SELECT COUNT(*) c
    FROM applications a
    JOIN users u ON u.id = a.student_user_id
    WHERE u.university_id = ? AND a.status = 'accepted'
  `).get(universityId).c;

  const requirement_met_count = db.prepare(`
    SELECT COUNT(*) c
    FROM users u
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'student' AND u.university_id = ? AND sp.requirement_met = 1
  `).get(universityId).c;

  res.json({ total_students, active_placements, pending_approvals, requirement_met_count });
});

// ---- notifications -----------------------------------------------------------

app.get('/api/notifications', requireAuth, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
  res.json(notifications);
});

app.post('/api/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ---- reset -----------------------------------------------------------

app.post('/api/reset', (req, res) => {
  resetAndSeed();
  res.json({ ok: true });
});

// ---- static -----------------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`InternLink UK server running at http://localhost:${port}`);
});
