# Proposed `settings.json` changes

**Status: NOT applied.** These were prepared on 2026-08-21 while you were away. Two of the three
are pure bug fixes; the third widens what Claude may run without asking, and widening an agent's
own permissions unattended is your call, not mine. A backup of the current file is already at
`~/.claude/settings.json.bak-2026-08-21`.

Apply everything with:

```powershell
node "D:\projs\claude-kit\scripts\apply-settings.js"
```

Or apply them by hand from the snippets below. Re-running is safe (idempotent).

---

## 1. Remove the dead HTTP hooks — pure bug fix

Three hooks POST to `http://127.0.0.1:47913/event` on `Stop`, `UserPromptSubmit`, and
`PreCompact`. **Nothing is listening on that port** (verified 2026-08-21: no TCP listener), and
the transcripts contain **436** `ECONNREFUSED` failures from them. Each one costs up to its 2s
timeout and prints an error you can see in-band, including on every `/compact`.

Delete the three entries whose `"type": "http"` and whose URL contains `47913`. If you actually
want that listener back, the fix is to start the service instead — but nothing on this machine
has run it since at least the start of the transcript history.

## 2. Add `env` — pure bug fix

```jsonc
"env": {
  "PYTHONIOENCODING": "utf-8",
  "PYTHONUTF8": "1",
  "PATH": "C:\\Program Files\\nodejs;${PATH}"
}
```

Evidence from your own transcripts:

| Fix | What it stops | Occurrences |
|---|---|---|
| `PYTHONIOENCODING` + `PYTHONUTF8` | `UnicodeEncodeError` / `charmap codec can't encode` when Python writes UTF-8 to the Windows console | **98 failures**, across 9 sessions; plus **358** commands carrying a manual encoding preamble |
| `PATH` | `'node' is not recognized as an internal or external command` when npm spawns `cmd.exe` | **33 failures**; plus **69** commands manually prefixing the nodejs path |

Both are already written as *rules* in your global CLAUDE.md. Rules in prose have not stopped
them recurring — these need to be config, which applies before the command runs.

## 3. Permission allowlist — **your decision**

Currently **5** allow rules against **502** shell calls in the mined sessions, which is why you
get prompted constantly, and why unattended runs stall. The proposal adds 31 rules covering
**read-only** commands only:

```jsonc
"permissions": {
  "allow": [
    "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git show:*)",
    "Bash(git branch:*)", "Bash(git remote:*)", "Bash(git rev-parse:*)", "Bash(git rev-list:*)",
    "Bash(git ls-files:*)", "Bash(git fetch:*)", "Bash(git stash list:*)",
    "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)",
    "Bash(find:*)", "Bash(grep:*)", "Bash(rg:*)", "Bash(du:*)", "Bash(df:*)", "Bash(file:*)",
    "Bash(node --version)", "Bash(npm --version)", "Bash(python --version)",
    "PowerShell(Get-PSDrive:*)", "PowerShell(Get-ChildItem:*)", "PowerShell(Get-Content:*)",
    "PowerShell(Test-Path:*)", "PowerShell(Get-Process:*)", "PowerShell(Get-NetTCPConnection:*)"
  ]
}
```

Nothing here writes, deletes, pushes, or installs. `git fetch` is included because it only
updates remote-tracking refs and never touches your working tree.

**Read this before accepting:** an allowlist entry is a standing grant. `Bash(cat:*)` lets any
future session read any file on the machine without asking, including `.env` files. That is
almost certainly fine for how you work, but it should be a decision you made, not one I made
for you at 2am. Drop any line you are not comfortable with — the file is just a list.

For a wider sweep grounded in your actual history, `/fewer-permission-prompts` generates a
project-scoped allowlist from your transcripts.

---

## Also worth doing, not scripted

- **`~/.claude/skills/` has 102 skill directories.** Every description loads into context at the
  start of every session, in every project. Most are from bulk third-party packs you installed in
  March and July; the ones you actually invoke are a handful. Pruning to ~20 is the single
  biggest per-session token saving available. `~/.claude/skills/INSTALLED-research-skills.md`
  documents the provenance of 44 of them, so it is easy to decide.
- **`~/.claude/scheduled-tasks/job-application/` and `morning-outreach-agent/`** are real skills
  sitting in a directory Claude Code does not scan, so they have never been discoverable. Moving
  them into `~/.claude/skills/` would activate them — **but `morning-outreach-agent` sends cold
  emails**, and its description is broad enough to be auto-invoked. Tighten the description
  before you move it, or keep invoking it explicitly.
