---
name: demo-brief
description: Turn this session's or this week's commits into a plain-English changelog for a non-technical audience — a mentor, manager, client, or teammate — with what to click to demo each item. Use when the user says "list the changes in simple English", "what did we change, I need to present this", "make a WhatsApp-style summary", or is about to walk someone through the work.
---

# Demo brief

The audience is a person who did not read the diff and will not read a diff. They want to know
what is different, whether it works, and what to click.

## 1. Establish the range

Ask, or infer from context, then say which range you used:

```bash
git log --since="yesterday" --oneline                 # this session
git log <last-demo-tag>..HEAD --oneline               # since the last time you presented
git log --since="1 week ago" --oneline --author="$(git config user.name)"
git diff --stat <range>
```

If a tag marks the last demo, prefer it. Otherwise state plainly: "changes since Tuesday".

## 2. Translate, do not summarise

For each meaningful change, write one line of **what the person will now see or be able to do**.
Group by feature area, not by commit.

| Instead of | Write |
|---|---|
| `refactor(api): extract appointment mapper` | *(drop it — invisible to the audience)* |
| `fix: null guard on patient profile` | The profile page no longer goes blank for patients with no address on file |
| `feat: add filter to doctor list` | You can now filter doctors by speciality |

Rules:

- **No commit hashes, file names, or function names** unless asked.
- **Drop pure-internal work** (refactors, lint, deps) or compress it to one line: "plus some
  internal cleanup, nothing visible".
- **Be honest about what is not done.** A known-broken item stated up front is far better than
  it being discovered live in the meeting.
- Follow the `human-writing` rules: no em dashes, no filler.

## 3. Add the demo path

This is what makes it useful under time pressure. For each visible item, one line:

> **Filter doctors by speciality** — open the app, Doctors tab, use the dropdown top right.

Order the list the way you would actually walk through it, not the order the commits landed.

## 4. Pick the format

- **`whatsapp`** — one message, short lines, no headers, no markdown tables. This is the most
  common request. Keep it under ~10 lines.
- **`md`** — grouped headings, for pasting into a doc or an email.
- **`slides`** — one bullet per slide-worth, title plus two supporting lines.

Default to `whatsapp` if the user does not say, since that is usually the ask.

## 5. Offer to start the app

If a demo is imminent, the user will need the app running. Offer it, or use the `dev-up` skill —
being handed a working URL alongside the brief is the whole point.
