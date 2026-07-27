const express = require('express');
const bcrypt = require('bcryptjs');
const { db, meShape, requireAuth } = require('../lib/helpers');

const router = express.Router();

router.post('/auth/register', (req, res) => {
  const { role, email, password, name, university_id, company_id, new_company } = req.body || {};

  if (!role || !['student', 'employer'].includes(role)) {
    return res.status(400).json({ error: 'role must be student or employer' });
  }
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  let finalUniversityId = null;
  let finalCompanyId = null;

  if (role === 'student') {
    if (!university_id) {
      return res.status(400).json({ error: 'university_id is required for students' });
    }
    const uni = db.prepare('SELECT id FROM universities WHERE id = ?').get(university_id);
    if (!uni) return res.status(400).json({ error: 'Unknown university_id' });
    finalUniversityId = university_id;
  } else {
    if (!company_id && !new_company) {
      return res.status(400).json({ error: 'company_id or new_company is required for employers' });
    }
    if (company_id) {
      const co = db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id);
      if (!co) return res.status(400).json({ error: 'Unknown company_id' });
      finalCompanyId = company_id;
    } else {
      if (!new_company.name || !new_company.sectors || !new_company.locations) {
        return res.status(400).json({ error: 'new_company requires name, sectors, locations' });
      }
      const r = db.prepare(`
        INSERT INTO companies (name, sectors, locations, about) VALUES (?,?,?,?)
      `).run(new_company.name, new_company.sectors, new_company.locations, new_company.about || '');
      finalCompanyId = r.lastInsertRowid;
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const r = db.prepare(`
    INSERT INTO users (role, email, password_hash, name, university_id, company_id)
    VALUES (?,?,?,?,?,?)
  `).run(role, email, passwordHash, name, finalUniversityId, finalCompanyId);

  if (role === 'student') {
    db.prepare(`
      INSERT INTO student_profiles (user_id) VALUES (?)
    `).run(r.lastInsertRowid);
  }

  req.session.userId = r.lastInsertRowid;
  res.json(meShape(r.lastInsertRowid));
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.userId = user.id;
  res.json(meShape(user.id));
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(meShape(req.user.id));
});

module.exports = router;
