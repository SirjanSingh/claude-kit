# Three `settings.json` fixes worth making

Two are defect repairs that apply to almost any Claude Code install on Windows. The third widens
what Claude may run without asking, which is a judgement call rather than a fix.

The occurrence counts below were measured by mining ~90 real sessions on one developer's machine.
Your numbers will differ; the failure modes almost certainly will not.

Preview and apply with:

```bash
node scripts/apply-settings.js            # dry run, changes nothing
node scripts/apply-settings.js --apply    # writes, after backing up
node scripts/apply-settings.js --apply --no-permissions   # the two bug fixes only
```

It is idempotent, refuses to touch a `settings.json` that does not parse, and never writes a
result that would not parse back.

---

## 1. Delete hooks whose endpoint is gone

Hooks of `"type": "http"` keep firing at a URL long after whatever was listening has stopped. Each
failure costs up to the hook's timeout and prints an error you can see in-band, including during
`/compact`.

On the machine this was written for, three such hooks on `Stop`, `UserPromptSubmit` and
`PreCompact` had produced **436 `ECONNREFUSED` failures**, with nothing bound to the port.

Check before deleting — if the service is meant to exist, the fix is to start it:

```powershell
Get-NetTCPConnection -LocalPort <PORT> -State Listen -ErrorAction SilentlyContinue
```

The script removes only hooks pointing at a hard-coded dead port; edit the constant for your own.

## 2. Set `env` to kill two Windows failure classes at the source

```jsonc
"env": {
  "PYTHONIOENCODING": "utf-8",
  "PYTHONUTF8": "1"
}
```

| Setting | What it stops | Measured |
|---|---|---|
| `PYTHONIOENCODING` + `PYTHONUTF8` | `UnicodeEncodeError` / `charmap codec can't encode` when Python writes UTF-8 to the Windows console | **98 failures** across 9 sessions, plus **358** commands carrying a manual encoding preamble |

The point is that this belongs in config rather than in a `CLAUDE.md` rule. It was already
written as an instruction in prose and kept recurring — prose is advice the model may follow,
`env` applies before the command runs.

### Do not put `PATH` in here

The obvious companion fix is to prepend Node to `PATH`, since `'node' is not recognized` when npm
spawns `cmd.exe` is a common Windows failure (**33** of them in the mined sessions). **It does not
work, and it breaks your environment.**

`settings.json` `env` values are stored **literally**. Claude Code does not interpolate `${PATH}`,
so this:

```jsonc
"PATH": "C:\\Program Files\\nodejs;${PATH}"     // ← do not do this
```

leaves tool-spawned shells with a two-entry PATH: `C:\Program Files\nodejs` and the literal string
`${PATH}`. Node resolves. Python, git, and everything else stop resolving. Found by doing it: the
next command in the session died with `The term 'python' is not recognized`.

Nothing persistent is damaged if you hit this — the machine's real `Path` in the registry is
untouched, the override is per-session, and removing the key plus restarting Claude Code restores
it. But there is no working `env`-based version of this fix. Handle the Node path in the command
itself instead:

```bash
PATH="/c/Program Files/nodejs:$PATH" npm run dev
```

## 3. A read-only permission allowlist — your call, not a fix

A near-empty allowlist against heavy shell use means constant prompting, and it stalls any
unattended run. The measured ratio on the source machine was **502 shell calls against 5 allow
rules**.

The script adds 31 rules covering read-only commands only: `git status|log|diff|show|branch|remote|
rev-parse|rev-list|ls-files|fetch|stash list`, `ls|cat|head|tail|wc|find|grep|rg|du|df|file`,
version probes, and the PowerShell `Get-*` / `Test-Path` family. Nothing writes, deletes, pushes or
installs. `git fetch` is included because it only updates remote-tracking refs.

**Understand what you are accepting.** An allowlist entry is a standing grant with no further
prompt. `Bash(cat:*)` lets any future session read any file the user can read, including `.env`.
For most solo development that is a reasonable trade for losing the interruptions; on a machine
holding other people's data it may not be. It is a list — delete any line you would not sign off.

`/fewer-permission-prompts` generates a project-scoped allowlist from your own transcripts, which
is a better starting point than any generic list if you have history to mine.

---

## Related: skills directory size

Every skill's `description` loads into context at the start of **every session, in every project**.
A skills directory that has accumulated bulk third-party packs is a standing token cost on work
that has nothing to do with them. Keeping a provenance note next to the skills makes it easy to
decide what to prune later; deleting a skill is just deleting its directory.
