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

module.exports = router;
