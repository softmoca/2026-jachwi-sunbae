const { execFileSync } = require('node:child_process');
const { cpSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const frontend = path.resolve(__dirname, '..');
execFileSync('npm', ['run', 'build'], {
  cwd: frontend,
  stdio: 'inherit',
  env: { ...process.env, PAGES_BASE_PATH: process.env.PAGES_BASE_PATH || '/2026-jachwi-sunbae/' },
});
cpSync(path.join(frontend, 'public'), path.join(frontend, 'dist'), { recursive: true });
writeFileSync(path.join(frontend, 'dist/.nojekyll'), '');
