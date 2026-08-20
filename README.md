# claude-kit

Skills, hooks and a status line for [Claude Code](https://claude.com/claude-code), built from
friction that actually showed up in my own session logs rather than from a list of good ideas.

Every item here exists because something went wrong repeatedly. The counts in the tables below
come from mining ~90 sessions of transcripts, and they are the reason each thing was written.

Windows-first (PowerShell 5.1 and Git Bash), but nothing here is Windows-only except where noted.

---

## Install

```powershell
git clone https://github.com/SirjanSingh/claude-kit.git
cd claude-kit
.\install.ps1 -Statusline
```

```bash
# macOS / Linux
git clone https://github.com/SirjanSingh/claude-kit.git
cd claude-kit && ./install.sh --statusline
```

Existing files are backed up to `<name>.bak-<date>`, never overwritten silently.
Use `-Link` (or `--link`) to symlink instead of copy, so `git pull` updates your skills in place.
Install a subset with `-Skills wrap,ui-verify`. Preview with `-WhatIf`.

---

## The status line

The one thing here that pays for itself on day one: **your actual plan usage, in the prompt.**

```
Opus 5 | Ctx 34% | cassandra | ⎇ main* | 5h 24% (2h11m) 7d 41% (3d0h) | $1.23
```

Claude Code ≥ 2.1.80 puts your real Pro/Max rate limits on the status-line payload as
`rate_limits`. This reads them directly — no API key, no network call, no log parsing — and
colours them green / amber / red as you approach the ceiling, with a countdown to reset.

The quota segment disappears cleanly on plans that do not publish limits, on the first render of
a session, and after a `/compact` until the next API call.

> If you already have a status line that shows cost but never shows quota, check for
> `else if (input.rate_limits)` chained after the `input.cost` branch. `cost` is essentially
> always present, so that one keyword hides the quota forever. That was the bug here.

---

## Skills

| Skill | What it does | Why it exists |
|---|---|---|
| **`ui-verify`** | Drives the running app in Chromium: clicks, screenshots, and reports console errors, page errors and failed requests. Exits non-zero when the page broke. | 77 hand-written Playwright scripts across 8 sessions, all the same boilerplate. Stops "fixed" being reported for something never opened in a browser. |
| **`dev-up`** | Finds the real start command, frees stale ports, launches back end and front end in the background, then polls until each answers. | 7 explicit "start the servers" requests, 53 port probes, and six mutually inconsistent recipes for the same app. |
| **`human-writing`** | Outbound copy that does not read as AI: no em dashes, no LLM tics, counted character limits for application portals. | Em dashes complained about 7 separate times. 13 outbound drafts needing a de-AI pass. Portal fields silently truncate at 200/255. |
| **`team-sync`** | Read-only recon of what teammates actually pushed, across every remote and branch; then optional rebase and multi-remote push. | 43 "did X push anything" investigations. Repos with two remotes that must both receive every push. |
| **`demo-brief`** | This week's commits as a plain-English changelog for a mentor or client, with what to click to demo each item. | 8 requests for exactly this, usually minutes before the meeting. |
| **`wrap`** | End-of-session close-out: session notes, memory, logical commits, push. | The chore that gets skipped, which is how context between sessions gets lost. |
| **`codebase-map`** | One compact orientation doc per repo so a cold session stops re-reading the tree. | Context spent every session rediscovering entry points. |

## Hooks

Neither is wired up by the installer; both print the exact `settings.json` block to paste in
their header comment.

| Hook | Event | What it does |
|---|---|---|
| **`disk-preflight.js`** | `PreToolUse` | Blocks `npm install`, `pip install`, `git clone`, `docker pull` and friends when the target drive is below 3 GB, and names a drive that has room. Written the day this machine sat at **0 MB free** and silently failed everything, including saving a 7 KB config file. |
| **`secret-guard.js`** | `UserPromptSubmit` | Notices an API key pasted into chat and tells the model to route it into `.env`, never echo it, and flag it for rotation. Does not block, and never prints the value. A key pasted into a prompt is written to the transcript in plaintext and stays there. |

## Also in here

- **`docs/settings-fixes.md`** plus `scripts/apply-settings.js` — three
  evidence-backed `settings.json` fixes, with a dry run by default. Two are pure bug fixes; the
  third widens the permission allowlist, which is deliberately left as your decision.

---

## Notes

- `ui-verify` needs Playwright: `python -m pip install playwright && python -m playwright install chromium`.
- Skills are just directories with a `SKILL.md`. Delete a directory to remove the skill.
- Every skill description loads into context at the start of every session, so a skills directory
  with 100+ entries costs you tokens in every project. Keep the ones you actually invoke.

## Licence

MIT. Take what is useful, ignore the rest.
