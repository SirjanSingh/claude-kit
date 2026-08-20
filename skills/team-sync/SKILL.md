---
name: team-sync
description: Find out what teammates actually pushed, across every remote and branch, without touching the working tree — then optionally rebase and push to all remotes. Use when the user asks "did X push anything / what did X change / pull their changes", when a repo has more than one remote that must stay in sync, or before pushing to a shared branch.
---

# Team sync

Two jobs, kept separate on purpose: **look** (read-only reconnaissance) and **sync** (rebase and
push). Never do the second when asked for the first.

---

## Part 1 — Look (default; changes nothing)

A teammate saying "I pushed it" and the branch actually having it are different claims. Check
all remotes, not just `origin`, and all branches, not just the current one.

```bash
git remote -v                       # know every remote before concluding anything
git fetch --all --prune
```

**What is new, everywhere:**

```bash
# every remote branch touched in the last 2 weeks, newest first
git for-each-ref --sort=-committerdate refs/remotes/ \
  --format='%(committerdate:short)  %(authorname)  %(refname:short)' | head -30
```

**How far apart are we:**

```bash
git rev-list --left-right --count HEAD...@{upstream}    # <local-ahead> <remote-ahead>
```

**What one person actually changed:**

```bash
git log --author="<name>" --since="2 weeks ago" --oneline --all
git log <branch> --not HEAD --oneline          # commits on that branch we don't have
git diff HEAD...<remote>/<branch> --stat
```

**Report honestly.** If a teammate says they pushed and you cannot find it, say exactly where
you looked: which remotes, which branches, what date range. The usual explanations are: pushed
to a different remote, pushed to a branch nobody named, committed locally and never pushed, or
pushed to a fork. Distinguish "I found nothing" from "they did nothing".

Do not check out, merge, rebase, or stash anything during this part.

---

## Part 2 — Sync (only when asked to pull/push)

1. **Check the tree is clean first.** Uncommitted work plus a rebase is how work gets lost.
   If it is dirty, say so and stop, or commit first if that is what the user wants.
2. **Always `pull --rebase`, never a merge commit**, on shared branches:
   ```bash
   git pull --rebase origin <branch>
   ```
   On conflict: stop, report the conflicting files, and let the user decide. Do not resolve by
   picking a side.
3. **Push to every remote that needs it.** With more than one remote, name them explicitly and
   verify each:
   ```bash
   git push origin <branch>
   git push <other-remote> <branch>
   git rev-list --left-right --count <branch>...origin/<branch>   # expect 0 0
   ```
4. **Never force-push a shared branch** without fresh, explicit confirmation. `--force-with-lease`
   is still a force push.

## Report

Who pushed what since when, whether you are ahead or behind on each remote, what you rebased or
pushed, and anything left conflicting or unpushed.
