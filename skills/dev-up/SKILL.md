---
name: dev-up
description: Start this project's dev servers reliably and hand back a working URL — detect the stack, free stale ports, apply the Windows node PATH fix, launch backend and frontend in the background, then poll until each answers. Use when the user says "start the servers / start the frontend and backend / run the app / restart the server", or when something needs to be running before it can be checked.
---

# dev up

Starting the stack should be one step with a verified URL at the end, not a rediscovery
exercise. The failure this prevents: launching a server, assuming it came up, and reporting
a URL that returns nothing.

## 1. Find the real command — don't guess

Look, in this order, and stop at the first that answers:

1. **The project's own CLAUDE.md** — if it names ports or a start command, that wins over everything.
2. `.claude/launch.json`, `Makefile`, `Procfile`, `docker-compose.yml`.
3. `package.json` → `scripts.dev` / `scripts.start`; for the backend, the `main` entry or `server.js`.
4. Python: `manage.py runserver`, `uvicorn app:app --reload`, `flask run`.

**Ports are project facts, not defaults.** A port that belongs to a different project is the
classic mistake — read the config, don't assume 3000 or 5173. If you cannot establish the port
from the repo, ask rather than guess.

## 2. Clear stale listeners

A previous run holding the port is the most common cause of a "broken" app. Check first, and
only kill a process you can see belongs to this project:

```powershell
Get-NetTCPConnection -LocalPort <PORT> -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Get-Process -Id $_.OwningProcess | Select-Object Id, ProcessName, Path }
```

```bash
netstat -ano | grep -E "LISTENING.*:(3000|8080)"
```

Confirm the command line matches this project before stopping anything — do not blanket-kill
every `node.exe` on the machine.

## 3. Launch in the background, to a log

Always `run_in_background`, always redirect to a known log path. A server started in the
foreground blocks the session; a server with no log is undiagnosable when it fails.

On Windows, if `node` or a local binary is not found, prepend the real path rather than
retrying the same failing command:

```bash
PATH="/c/Program Files/nodejs:$PATH" npm run dev
```

## 4. Verify before reporting — this is the point of the skill

Poll until it answers or you have waited long enough to call it failed:

```bash
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:<PORT>/ 2>/dev/null)
  [ "$code" != "000" ] && { echo "up: HTTP $code"; break; }
  sleep 1
done
```

If it never answers, **read the log** and report the actual error. Do not report a URL you
have not seen respond.

## 5. Report

Give the user: the URL(s), the HTTP status you observed, the log paths, and anything you had
to kill or fix to get there. If a UI change prompted this, follow with the `ui-verify` skill —
starting the server is not the same as confirming the change renders.

## Notes

- Frontend and backend usually both need to be up; a frontend that loads but shows no data is
  normally a backend that is not running, not a UI bug.
- If `.env` / `.env.local` needs values to boot, read the existing file first and preserve what
  is there. Never overwrite a working env file from memory.
