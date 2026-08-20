---
name: ui-verify
description: Exercise a running web app in a real browser and report what actually happened — screenshot, console errors, page errors, failed requests. Use whenever a frontend or UI change needs to be confirmed working, when the user asks to "check the UI / take a screenshot / see if it renders", before claiming any visual fix is done, or when a page is blank, broken, or behaving unexpectedly.
---

# UI verify

Never report a frontend change as working without having driven it in a browser. A passing
build says the bundle compiled, not that the page renders. This skill closes that gap in one
command instead of thirty lines of retyped Playwright.

## The rule this exists to enforce

> A UI fix is not done until it has been exercised in the running app.

Reading the diff, checking the build, or reasoning about the JSX are all insufficient. The
failure modes that matter — a crashed component tree, a 404 on a data call, a hydration
mismatch, an element rendered behind an overlay — are only visible at runtime.

## Usage

`scripts/ui_shot.py` is the workhorse. It navigates, optionally interacts, screenshots, and
returns every error the page produced.

```bash
python scripts/ui_shot.py --url http://localhost:8080/

# click something first, then capture
python scripts/ui_shot.py --url http://localhost:8080/ --click "🧑‍⚕️ Patient" --click "Appointments"

# mobile viewport, wait for a specific element instead of guessing a timeout
python scripts/ui_shot.py --url http://localhost:3000/ --viewport mobile --wait-for "text=Welcome"
```

Key flags: `--click ROLE_OR_TEXT` (repeatable, in order), `--fill "selector=value"`,
`--wait-for SELECTOR`, `--viewport mobile|tablet|desktop`, `--out PATH`, `--full-page`,
`--timeout MS`.

Install once: `python -m pip install playwright && python -m playwright install chromium`.

## What to do with the output

The script prints a report and exits non-zero if the page produced errors.

1. **Read the console/page errors first.** They are the real signal. A screenshot of a blank
   page tells you less than the `TypeError` that caused it.
2. **Then look at the screenshot.** Read the image — do not just confirm the file exists.
   Check the thing you actually changed, and check that you did not break the layout around it.
3. **Check failed network requests.** A UI that renders but shows no data is usually a 401/404
   on an API call, not a frontend bug.
4. Report what you saw, including the screenshot path so the user can look too.

## Before you run it

The app must actually be running. If nothing is listening, start it (see the `dev-up` skill)
rather than reporting a connection error as a finding.

## Honest reporting

- If the screenshot does not show the change, say so and investigate — do not narrate the
  intended behaviour as though it happened.
- If you could not reach the page at all, say that plainly. "Could not verify" is a legitimate
  outcome; "looks good" when you never saw it is not.
- Errors unrelated to your change (pre-existing console noise) should be mentioned once and
  set aside, not silently swallowed.
