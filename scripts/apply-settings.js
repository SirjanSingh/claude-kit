#!/usr/bin/env node
/**
 * Apply the settings.json changes described in docs/PROPOSED-settings-changes.md.
 *
 *   node scripts/apply-settings.js            # show what would change, touch nothing
 *   node scripts/apply-settings.js --apply    # write it, after backing up
 *   node scripts/apply-settings.js --apply --no-permissions   # skip the allowlist
 *
 * Idempotent: running it twice is a no-op the second time.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const SKIP_PERMS = process.argv.includes('--no-permissions');
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

const READONLY_RULES = [
  'Bash(git status:*)', 'Bash(git log:*)', 'Bash(git diff:*)', 'Bash(git show:*)',
  'Bash(git branch:*)', 'Bash(git remote:*)', 'Bash(git rev-parse:*)', 'Bash(git rev-list:*)',
  'Bash(git ls-files:*)', 'Bash(git fetch:*)', 'Bash(git stash list:*)',
  'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)',
  'Bash(find:*)', 'Bash(grep:*)', 'Bash(rg:*)', 'Bash(du:*)', 'Bash(df:*)', 'Bash(file:*)',
  'Bash(node --version)', 'Bash(npm --version)', 'Bash(python --version)',
  'PowerShell(Get-PSDrive:*)', 'PowerShell(Get-ChildItem:*)', 'PowerShell(Get-Content:*)',
  'PowerShell(Test-Path:*)', 'PowerShell(Get-Process:*)', 'PowerShell(Get-NetTCPConnection:*)',
];

if (!fs.existsSync(SETTINGS)) {
  console.error(`No settings.json at ${SETTINGS}`);
  process.exit(1);
}

const original = fs.readFileSync(SETTINGS, 'utf8');
let s;
try {
  s = JSON.parse(original);
} catch (e) {
  console.error(`settings.json is not valid JSON, refusing to touch it:\n  ${e.message}`);
  process.exit(1);
}

const changes = [];

// 1. Dead HTTP hooks -> 127.0.0.1:47913
let deadHooks = 0;
for (const [evt, groups] of Object.entries(s.hooks || {})) {
  const kept = [];
  for (const g of groups) {
    const hooks = (g.hooks || []).filter((h) => {
      const dead = h.type === 'http' && typeof h.url === 'string' && h.url.includes('47913');
      if (dead) deadHooks++;
      return !dead;
    });
    if (hooks.length) kept.push(Object.assign({}, g, { hooks }));
  }
  if (kept.length) s.hooks[evt] = kept;
  else delete s.hooks[evt];
}
if (deadHooks) changes.push(`remove ${deadHooks} dead http hook(s) pointing at 127.0.0.1:47913`);

// 2. env
const wantEnv = {
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
  PATH: 'C:\\Program Files\\nodejs;${PATH}',
};
const envAdds = Object.entries(wantEnv).filter(([k, v]) => (s.env || {})[k] !== v);
if (envAdds.length) {
  s.env = Object.assign({}, s.env, wantEnv);
  changes.push(`set env: ${envAdds.map(([k]) => k).join(', ')}`);
}

// 3. permissions
if (!SKIP_PERMS) {
  const allow = new Set((s.permissions && s.permissions.allow) || []);
  const before = allow.size;
  READONLY_RULES.forEach((r) => allow.add(r));
  if (allow.size !== before) {
    s.permissions = Object.assign({}, s.permissions, { allow: [...allow].sort() });
    changes.push(`add ${allow.size - before} read-only permission rule(s)`);
  }
}

if (!changes.length) {
  console.log('Nothing to do - settings.json already has all of these.');
  process.exit(0);
}

console.log('Changes:');
changes.forEach((c) => console.log('  - ' + c));

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.');
  console.log('Add --no-permissions to skip the allowlist and take only the bug fixes.');
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 10);
const backup = `${SETTINGS}.bak-${stamp}`;
if (!fs.existsSync(backup)) fs.writeFileSync(backup, original, 'utf8');

const next = JSON.stringify(s, null, 2) + '\n';
JSON.parse(next); // never write something that will not parse back
fs.writeFileSync(SETTINGS, next, 'utf8');

console.log(`\nApplied. Backup: ${backup}`);
console.log('Restart Claude Code to pick up hook and env changes.');
