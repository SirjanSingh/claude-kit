#!/usr/bin/env node
/**
 * PreToolUse hook: refuse to start a big install when the target drive has no room.
 *
 * Written after a machine sat at 0 MB free on C: and silently failed everything —
 * npm installs that half-wrote, venvs that created empty, and a config file that
 * could not be saved. Failing loudly up front costs seconds; failing halfway costs
 * an hour of cleanup.
 *
 * Wire it up in settings.json:
 *
 *   "hooks": {
 *     "PreToolUse": [
 *       { "matcher": "Bash|PowerShell",
 *         "hooks": [ { "type": "command",
 *                      "command": "node \"<path-to>/disk-preflight.js\"",
 *                      "timeout": 5 } ] }
 *     ]
 *   }
 *
 * Exit 0 = allow. Exit 2 = block, and stderr goes back to the model as the reason.
 * Env overrides: DISK_PREFLIGHT_MIN_GB (default 3), DISK_PREFLIGHT_OFF=1 to disable.
 */
'use strict';

const { execFileSync } = require('child_process');

const MIN_GB = Number(process.env.DISK_PREFLIGHT_MIN_GB || 3);
const ALLOW = 0;
const BLOCK = 2;

// Commands that write a lot and are painful to half-finish.
const HEAVY = new RegExp(
  [
    String.raw`\bnpm\s+(i|install|ci)\b`,
    String.raw`\bpnpm\s+(i|install)\b`,
    String.raw`\byarn\s+(install|add)\b`,
    String.raw`\bpip\s+install\b`,
    String.raw`\bpip3\s+install\b`,
    String.raw`\buv\s+(pip\s+install|sync|venv)\b`,
    String.raw`\bpython\s+-m\s+(pip\s+install|venv)\b`,
    String.raw`\bconda\s+(install|create)\b`,
    String.raw`\bcargo\s+(build|install)\b`,
    String.raw`\bgo\s+(get|install)\b`,
    String.raw`\bdocker\s+(pull|build)\b`,
    String.raw`\bwinget\s+install\b`,
    String.raw`\bchoco\s+install\b`,
    String.raw`\bplaywright\s+install\b`,
    String.raw`\bgit\s+clone\b`,
    String.raw`huggingface-cli\s+download`,
    String.raw`\bcurl\b[^|]*\s-[^|]*O`,
    String.raw`\bwget\b`,
  ].join('|'),
  'i'
);

function readStdin() {
  try {
    return require('fs').readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

/** Free space in GB for every fixed drive, as { C: 12.3, D: 4.7 }. */
function freeByDrive() {
  const out = {};
  if (process.platform === 'win32') {
    const ps =
      '(Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Free -ne $null} | ' +
      'ForEach-Object { "$($_.Name)=$($_.Free)" }) -join ";"';
    const raw = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const pair of raw.trim().split(';')) {
      const [name, bytes] = pair.split('=');
      if (name && bytes) out[name.toUpperCase()] = Number(bytes) / 1024 ** 3;
    }
  } else {
    const raw = execFileSync('df', ['-kP', '/'], { encoding: 'utf8', timeout: 4000 });
    const line = raw.trim().split('\n').pop().split(/\s+/);
    out['/'] = Number(line[3]) / 1024 ** 2;
  }
  return out;
}

/** Which drive will this command write to? Falls back to the cwd's drive. */
function targetDrive(command, cwd) {
  const explicit = command.match(/\b([A-Za-z]):[\\/]/);
  if (explicit) return explicit[1].toUpperCase();
  const fromCwd = (cwd || process.cwd()).match(/^([A-Za-z]):/);
  return fromCwd ? fromCwd[1].toUpperCase() : '/';
}

function main() {
  if (process.env.DISK_PREFLIGHT_OFF === '1') return ALLOW;

  let payload = {};
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch (e) {
    return ALLOW; // never block because we could not parse our own input
  }

  const input = payload.tool_input || {};
  const command = String(input.command || '');
  if (!command || !HEAVY.test(command)) return ALLOW;

  let free;
  try {
    free = freeByDrive();
  } catch (e) {
    return ALLOW; // if we cannot measure, do not stand in the way
  }

  const drive = targetDrive(command, payload.cwd || input.cwd);
  const gb = free[drive];
  if (gb === undefined || gb >= MIN_GB) return ALLOW;

  const roomy = Object.entries(free)
    .filter(([d, v]) => d !== drive && v > MIN_GB)
    .sort((a, b) => b[1] - a[1])
    .map(([d, v]) => `${d}: ${v.toFixed(1)} GB free`);

  const lines = [
    `BLOCKED: ${drive}: has only ${gb.toFixed(2)} GB free (threshold ${MIN_GB} GB).`,
    `Command: ${command.slice(0, 160)}`,
    '',
    'This install would very likely fail partway and leave a broken tree.',
  ];
  if (roomy.length) {
    lines.push(`Drives with room: ${roomy.join(', ')}. Install or clone there instead.`);
  }
  lines.push(
    'Or free space first, then retry. Safe, regenerable caches:',
    '  python -m pip cache purge',
    '  npm cache clean --force',
    'Check the big offenders before deleting anything you cannot re-download.',
    '',
    `To override for one session: set DISK_PREFLIGHT_OFF=1`
  );
  process.stderr.write(lines.join('\n') + '\n');
  return BLOCK;
}

process.exit(main());
