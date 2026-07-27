const express = require('express');
const { resetAndSeed } = require('../db');

const router = express.Router();

router.post('/dev/reset', (req, res) => {
  if (req.headers['x-demo-reset'] !== 'true') {
    return res.status(403).json({ error: 'x-demo-reset header required' });
  }
  resetAndSeed();
  res.json({ ok: true });
});

module.exports = router;
