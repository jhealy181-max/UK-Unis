const { existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const dist = path.join(__dirname, 'client', 'dist', 'index.html');
if (!existsSync(dist)) {
  console.log('Client build not found — building (first run only, ~1 min)...');
  execSync('npm run build:client', { stdio: 'inherit', cwd: __dirname });
}
require('./server/index.js');
