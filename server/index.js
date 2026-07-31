// server/index.js — QS Connect Express app: session auth, API routes,
// static client hosting with SPA fallback.

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');

const { seed } = require('./db');

seed();

const app = express();

app.use(express.json());
app.use(session({
  secret: 'qs-connect-demo',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// -- API routes -------------------------------------------------------------
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/lookups'));
app.use('/api', require('./routes/orgs'));
app.use('/api', require('./routes/students'));
app.use('/api', require('./routes/roles'));
app.use('/api', require('./routes/applications'));
app.use('/api', require('./routes/network'));
app.use('/api', require('./routes/feed'));
app.use('/api', require('./routes/messaging'));
app.use('/api', require('./routes/events'));
app.use('/api', require('./routes/university'));
app.use('/api', require('./routes/notifications'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/dev'));

// -- API 404 (must come after all /api routes, before static/SPA fallback) --
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// -- Static client + SPA fallback -------------------------------------------
const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
const hasClientBuild = fs.existsSync(clientIndex);

if (hasClientBuild) {
  app.use(express.static(clientDist));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (!hasClientBuild) {
    return res.status(200).send('QS Connect API is running. Client build not found at client/dist.');
  }
  res.sendFile(clientIndex);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`QS Connect server listening on port ${PORT}`);
});

module.exports = app;
