# CODEBASE_MAP.md template

Copy this skeleton into `docs/CODEBASE_MAP.md`. Keep the whole file ≤ 150 lines. Delete any
section that genuinely doesn't apply rather than padding it. Mark inferred (unverified) items
with a trailing `(?)`.

```markdown
# Codebase Map — <project name>

_Generated <YYYY-MM-DD> @ <short-git-sha> — regenerate when stale (see the codebase-map skill)._

## What this is
<1–3 sentences: what the project does and who/what runs it. No history, no fluff.>

## Stack
- Language / runtime: <e.g. Python 3.11>
- Framework(s): <e.g. FastAPI, React+Vite>
- Package manager: <e.g. pip / pnpm>
- Notable services / infra: <db, queue, cloud, observability>

## Commands
| Purpose | Command |
|---------|---------|
| Install | `...` |
| Run / dev | `...` |
| Test | `...` |
| Lint / typecheck | `...` |
| Build | `...` |
| Deploy | `...` |

## Entry points
- `path/to/entry` — <what it boots> — run with `...`
- `path/to/other` — <role>

## Directory map
- `dir/` — <purpose; when to open it>
- `dir/sub/` — <purpose>
<top 1–2 levels only; skip build output and vendored deps>

## Primary flow
<3–6 steps of the main happy path>
`entry → router → service → store → response`

## Gotchas & risky files
- <non-obvious constraint an agent would trip on>
- <files that must stay in sync / config that needs a restart / load-bearing hack>

## Where to learn more
- <README / ARCHITECTURE.md / docs/ / session notes worth reading for deeper context>
```
