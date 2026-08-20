---
name: codebase-map
description: Use when orienting to an unfamiliar or large project, when the user asks to "map the codebase / generate a project map / onboarding doc / orientation file", or when you find yourself reading many files just to learn how a repo fits together. Produces a compact, human-reviewed docs/CODEBASE_MAP.md — purpose, stack, entry points, directory map, data flow, and gotchas — plus a one-line pointer in CLAUDE.md so future sessions understand the project without reading the whole tree. Also handles refreshing a stale existing map.
---

# Codebase Map

Generate (or refresh) a short orientation document so a future session — human or agent —
understands a project's shape from one file instead of re-reading the tree every time.

## Why this exists

A cold session wastes context (and the user's money) rediscovering entry points, the run
commands, and how modules connect. A good map front-loads exactly that. Keep it **compact and
curated** — models reliably follow ~150–200 instructions, so a bloated map is worse than none.
Human-reviewed maps outperform blind auto-generated ones, and **staleness is the #1 failure
mode**: a map that points to a moved file sends the next agent confidently to the wrong place.
So: draft, flag what you're unsure about, let the user prune, then stamp it.

## Output contract

- **File:** `docs/CODEBASE_MAP.md` (create `docs/` if absent). Target **≤ 150 lines**. If it
  won't fit, you're including implementation detail that belongs in the code, not the map.
- **Pointer:** ensure `CLAUDE.md` (repo root) starts with a line like
  `> **Orientation:** read [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) first.` Create CLAUDE.md
  if it doesn't exist; never add a second pointer if one is already there.
- **Stamp:** first body line is `_Generated <YYYY-MM-DD> @ <short-git-sha> — regenerate when stale._`
- Use the section skeleton in `references/template.md`.

## Workflow

Announce "Using codebase-map to <generate|refresh> the project orientation." Create a todo per step.

### 1. Check for an existing map first
- If `docs/CODEBASE_MAP.md` exists, read it and compare its stamped SHA to `git rev-parse --short HEAD`.
  - Same/near SHA → tell the user it's current; ask what to change rather than rewriting wholesale.
  - Many commits behind → offer a **refresh**: keep human-curated prose, re-verify every file path
    and command still exists, update the stamp. Don't blow away notes the user added by hand.

### 2. Detect the project's shape (breadth over depth)
Read manifests, not source bodies. Look for:
- Language/stack + package manager: `package.json`, `pyproject.toml`/`setup.py`, `go.mod`,
  `Cargo.toml`, `pom.xml`/`build.gradle`, `Gemfile`, `*.csproj`, `composer.json`.
- Monorepo markers: workspaces, `packages/`, `apps/`, `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`.
- Existing docs: `README`, `docs/`, `ARCHITECTURE.md`, `CONTRIBUTING.md` — mine these instead of guessing.
Prefer `Glob`/`Grep` and directory listings over opening whole files.

### 3. Find the entry points
The files someone runs or that boot the system. Check, per stack:
- Scripts/bin: `package.json` `scripts`+`bin`, `[project.scripts]` / console_scripts, `Makefile`, `Taskfile`.
- App servers: `main`, `app`, `index`, `__main__.py`, `manage.py`, `cmd/*/main.go`, ASGI/WSGI apps.
- Containers/CI: `Dockerfile` `CMD`/`ENTRYPOINT`, `docker-compose.yml` services, workflow files.
List each with its one-line job and the exact command to run it.

### 4. Map the directory tree (top 1–2 levels only)
One line per significant directory: what lives there and why an agent would open it. Skip
`node_modules`, `dist`, `.venv`, build output, vendored deps.

### 5. Trace the primary data/control flow
The main happy path in 3–6 arrow-steps (e.g. `request → router → service → db → response`).
One critical flow, not every flow. This is the highest-value section — spend effort here.

### 6. Capture the commands that matter
Install, run/dev, test, lint/typecheck, build, deploy — exact invocations with flags, copied
from the manifests you already read (don't invent them). Note OS/shell gotchas if relevant.

### 7. Note gotchas & risky files
Non-obvious constraints an agent would trip on: config that needs a restart to take effect,
files that must stay in sync, load-bearing hacks, "don't import X from Y" rules, flaky areas.
Mine existing CLAUDE.md / session notes / code comments for these — don't fabricate.

### 8. Draft, flag, and confirm before writing
- Fill the template. Mark anything you inferred rather than verified with a trailing `(?)`.
- Show the draft (or a tight summary of it) to the user and invite pruning **before** committing —
  the curation step is what makes the map good. Skip the pause only if the user said "just do it."

### 9. Write the file and the pointer, then stamp it
Write `docs/CODEBASE_MAP.md`, add/verify the CLAUDE.md pointer, and set the stamp from
`git rev-parse --short HEAD` (or `uncommitted` if no commits yet). Don't commit unless the user asks.

## Anti-patterns
- ❌ Dumping the full file tree or pasting function bodies → it's a map, not a mirror of the repo.
- ❌ Listing commands you never verified against the manifests.
- ❌ Regenerating from scratch over an existing hand-edited map.
- ❌ Committing the map unreviewed, or letting it exceed ~150 lines.
