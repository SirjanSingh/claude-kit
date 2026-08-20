---
name: wrap
description: End-of-session close-out in one pass — update session notes and project memory, group changes into logical commits authored solely by you (no AI attribution trailers), and push the current branch. Use when the user says "wrap", "wrap up", "push and document", "update the session logs", "im done / going to sleep", or is ending a session with uncommitted work.
---

# Session wrap

Do all of the following in order. Skip a step only if there is genuinely nothing for it, and
say so in the final report.

## 1. Survey
- `git status` and `git diff --stat` to see what changed this session.
- If the tree is clean AND docs are current, report "nothing to wrap" and stop.

## 2. Session notes
- Find this project's convention, in priority order: `docs/sessions/*.md`,
  `session-logs/`, `SESSION_NOTES.md`, or the project CLAUDE.md's stated protocol.
- **Read the newest existing note before touching anything.** Update today's note or create
  `docs/sessions/<YYYY-MM-DD>-<topic>.md` if none exists for today.
- Content: what changed, **why** (the decision, not just the diff), files touched, how it
  was verified, open items for next session.
- Files that don't exist yet: create with Write. Existing files: Read first, then Edit.

## 3. Memory
- If something durable was learned (a gotcha, a decision, a preference), update the
  auto-memory directory: Read `MEMORY.md` first if it exists; add/update the fact file and
  its index line. If nothing durable, skip.

## 4. Commits
- Group the changes into **logical, separate commits** (feature vs fix vs docs vs data) —
  not one blob.
- Author = the repo's configured git user. **Never add `Co-Authored-By:` or any
  AI-attribution trailer.**
- If the diff contains anything that looks like a secret (API key, token, password),
  STOP and flag it instead of committing.

## 5. Push
- Push the **current** branch to origin. Never force-push; never push a different branch
  than the one checked out without asking.
- If rejected (non-fast-forward): `git pull --rebase` and retry once. If that produces
  conflicts, stop and report the conflicting files — do not resolve destructively.

## 6. Report
One short summary: commits made (hash + message), files touched, which note/memory files
were updated, and anything intentionally left uncommitted or open.
