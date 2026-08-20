#!/usr/bin/env node
// Claude Code status line:
//   model | context % | cwd | git branch | plan quota (5h / 7d) | session cost
//
// The quota segment is the point of this script. Claude Code >= 2.1.80 puts your real
// Pro/Max plan limits on the status-line stdin payload as `rate_limits`; this renders them
// with a countdown to reset and colours them by how close you are to the ceiling.
// No API key, no network call, no log parsing — it is the number Anthropic reports.
//
// Docs: https://code.claude.com/docs/en/statusline

// Never hang the UI. Claude Code can hold stdin open on Windows/Git Bash, which orphans
// node processes; bail out rather than accumulate them.
const watchdog = setTimeout(() => process.exit(0), 3000);
watchdog.unref?.();

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  clearTimeout(watchdog);

  let input = {};
  try { input = JSON.parse(raw); } catch (e) { /* fall through with {} */ }

  const path = require('path');
  const { execSync } = require('child_process');
  const parts = [];

  // Colour only when the terminal will render it.
  const useColor = !process.env.NO_COLOR;
  const paint = (s, code) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  // Quota is the one thing worth shouting about: green under half, yellow past 60, red past 85.
  const heat = (pct) => (pct >= 85 ? '31' : pct >= 60 ? '33' : '32');

  // 1. Model display name
  const modelName = (input.model && (input.model.display_name || input.model.id)) || null;
  if (modelName) parts.push(modelName);

  // 2. Context window usage (percent used, or percent remaining if that's what's provided)
  const cw = input.context_window;
  if (cw) {
    if (cw.used_percentage != null) {
      parts.push(`Ctx ${Math.round(cw.used_percentage)}%`);
    } else if (cw.remaining_percentage != null) {
      parts.push(`Ctx ${Math.round(cw.remaining_percentage)}% left`);
    }
  }

  // 3. Current directory basename
  const cwd = (input.workspace && input.workspace.current_dir) || input.cwd || process.cwd();
  const base = path.basename(cwd);
  if (base) parts.push(base);

  // 4. Git branch (skip optional locks so we never block on an in-progress git op)
  const gitCwd = cwd;
  try {
    const branch = execSync('git --no-optional-locks branch --show-current', {
      cwd: gitCwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1000,
    }).toString().trim();
    if (branch) {
      let dirty = '';
      try {
        const status = execSync('git --no-optional-locks status --porcelain', {
          cwd: gitCwd,
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 1000,
        }).toString();
        if (status.trim()) dirty = '*';
      } catch (e) { /* ignore */ }
      parts.push(`⎇ ${branch}${dirty}`);
    }
  } catch (e) { /* not a git repo, or git not on PATH */ }

  // 5. Plan quota — the 5-hour rolling window and the 7-day window.
  //    Absent on the very first render of a session and until the next API call after a
  //    /compact, and absent entirely on plans without published limits. Degrade silently.
  const rl = input.rate_limits;
  if (rl) {
    const seg = (win, label) => {
      if (!win || win.used_percentage == null) return null;
      const pct = Math.round(win.used_percentage);
      let s = `${label} ${pct}%`;
      if (win.resets_at) {
        // resets_at is Unix epoch SECONDS.
        const mins = Math.max(0, Math.round((win.resets_at * 1000 - Date.now()) / 60000));
        if (mins >= 1440)     s += ` (${Math.floor(mins / 1440)}d${Math.floor((mins % 1440) / 60)}h)`;
        else if (mins >= 60)  s += ` (${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m)`;
        else                  s += ` (${mins}m)`;
      }
      return paint(s, heat(pct));
    };
    const quota = [seg(rl.five_hour, '5h'), seg(rl.seven_day, '7d')].filter(Boolean).join(' ');
    if (quota) parts.push(quota);
  }

  // 6. Session cost. Separate from quota, not an alternative to it — the original bug here
  //    was chaining these with `else if`, which hid quota behind an always-present cost.
  if (input.cost && typeof input.cost.total_cost_usd === 'number') {
    parts.push(`$${input.cost.total_cost_usd.toFixed(2)}`);
  }

  process.stdout.write(parts.join(' | '));
});
