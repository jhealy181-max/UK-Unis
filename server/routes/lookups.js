const express = require('express');
const { db } = require('../lib/helpers');

const router = express.Router();

router.get('/universities', (req, res) => {
  const rows = db.prepare('SELECT id, name, city, country, qs_rank FROM universities ORDER BY qs_rank ASC').all();
  res.json(rows);
});

router.get('/companies', (req, res) => {
  const rows = db.prepare('SELECT id, name, sectors FROM companies ORDER BY name ASC').all();
  res.json(rows);
});

router.get('/skills', (req, res) => {
  const rows = db.prepare('SELECT id, name, category FROM skills ORDER BY category ASC, name ASC').all();
  res.json(rows);
});

const COURSES = [
  'BSc Computer Science', 'BSc Software Engineering', 'BSc Data Science', 'BSc Artificial Intelligence',
  'BSc Cyber Security', 'BEng Mechanical Engineering', 'BEng Civil Engineering', 'BEng Electrical Engineering',
  'BEng Chemical Engineering', 'BSc Mathematics', 'BSc Physics', 'BSc Biomedical Science',
  'BSc Nursing', 'BSc Psychology', 'BSc Economics', 'BSc Finance', 'BSc Accounting',
  'BA Business Management', 'BA International Business', 'BA Marketing', 'BA Media and Communications',
  'BA Journalism', 'BA Graphic Design', 'BA English Literature', 'BA History', 'BA Law (LLB)',
  'BSc Environmental Science', 'BSc Sports Science', 'MSc Data Analytics', 'MSc Management',
];

router.get('/courses', (req, res) => res.json(COURSES));

// Locations offered by employers, plus the cities our universities sit in.
router.get('/locations', (req, res) => {
  const roleLocations = db.prepare('SELECT DISTINCT location FROM roles').all().map(r => r.location);
  const uniCities = db.prepare('SELECT DISTINCT city FROM universities').all().map(r => r.city);
  const extras = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow',
    'Cardiff', 'Belfast', 'Cambridge', 'Oxford', 'Remote'];
  res.json([...new Set([...roleLocations, ...uniCities, ...extras])].sort());
});

module.exports = router;
