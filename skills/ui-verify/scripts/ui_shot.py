#!/usr/bin/env python
"""Drive a running web app in Chromium, screenshot it, and report everything that broke.

Replaces the ad-hoc Playwright script that otherwise gets retyped for every UI check.
Exits non-zero when the page produced console errors, page errors, or failed requests,
so it works as a check in a pipeline as well as a manual look.

  python ui_shot.py --url http://localhost:8080/
  python ui_shot.py --url http://localhost:8080/ --click "Patient" --click "Appointments"
  python ui_shot.py --url http://localhost:3000/ --viewport mobile --wait-for "text=Welcome"
"""
from __future__ import annotations

import argparse
import datetime as _dt
import os
import re
import sys

VIEWPORTS = {
    "mobile": {"width": 390, "height": 844},
    "tablet": {"width": 820, "height": 1180},
    "desktop": {"width": 1440, "height": 900},
}


def _parse_args(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--url", required=True, help="page to open")
    p.add_argument("--click", action="append", default=[],
                   help="accessible name or text to click, in order; repeatable")
    p.add_argument("--fill", action="append", default=[],
                   help='"selector=value" to type into, in order; repeatable')
    p.add_argument("--wait-for", default=None,
                   help="selector to wait for after navigation (better than a blind timeout)")
    p.add_argument("--viewport", choices=sorted(VIEWPORTS), default="desktop")
    p.add_argument("--out", default=None, help="screenshot path (default: ./ui-shot-<ts>.png)")
    p.add_argument("--full-page", action="store_true", help="capture the whole scrollable page")
    p.add_argument("--timeout", type=int, default=15000, help="per-action timeout in ms")
    p.add_argument("--settle", type=int, default=400,
                   help="ms to wait after the last action before the screenshot")
    p.add_argument("--headed", action="store_true", help="show the browser window")
    p.add_argument("--keep-going", action="store_true",
                   help="always exit 0, even when the page reported errors")
    return p.parse_args(argv)


def _click(page, target, timeout):
    """Click by accessible role/name first, then fall back to plain text, then to a selector."""
    from playwright.sync_api import Error as PWError

    attempts = (
        lambda: page.get_by_role("button", name=target).first.click(timeout=timeout),
        lambda: page.get_by_role("link", name=target).first.click(timeout=timeout),
        lambda: page.get_by_role("tab", name=target).first.click(timeout=timeout),
        lambda: page.get_by_text(target, exact=False).first.click(timeout=timeout),
        lambda: page.click(target, timeout=timeout),
    )
    last = None
    for attempt in attempts:
        try:
            attempt()
            return True, None
        except PWError as exc:  # not found / not clickable with this strategy
            last = exc
    return False, last


def main(argv=None) -> int:
    args = _parse_args(argv)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is not installed.\n"
              "  python -m pip install playwright && python -m playwright install chromium",
              file=sys.stderr)
        return 2

    out = args.out or os.path.abspath(
        "ui-shot-{}.png".format(_dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
    )
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)

    console_errors: list[str] = []
    page_errors: list[str] = []
    failed_requests: list[str] = []
    actions: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        context = browser.new_context(viewport=VIEWPORTS[args.viewport])
        page = context.new_page()

        page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}")
                if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("requestfailed", lambda r: failed_requests.append(
            f"{r.method} {r.url} -> {(r.failure or {}).get('errorText', 'failed') if isinstance(r.failure, dict) else r.failure}"
        ))
        page.on("response", lambda r: failed_requests.append(f"{r.status} {r.request.method} {r.url}")
                if r.status >= 400 else None)

        try:
            page.goto(args.url, wait_until="domcontentloaded", timeout=args.timeout)
        except Exception as exc:
            print(f"FAILED to open {args.url}\n  {exc}\n"
                  f"  Is the dev server running? Check the port before treating this as a UI bug.",
                  file=sys.stderr)
            browser.close()
            return 2

        if args.wait_for:
            try:
                page.wait_for_selector(args.wait_for, timeout=args.timeout)
                actions.append(f"waited for {args.wait_for!r}")
            except Exception as exc:
                actions.append(f"TIMED OUT waiting for {args.wait_for!r}: {type(exc).__name__}")

        for spec in args.fill:
            sel, _, value = spec.partition("=")
            try:
                page.fill(sel, value, timeout=args.timeout)
                actions.append(f"filled {sel!r}")
            except Exception as exc:
                actions.append(f"FAILED to fill {sel!r}: {type(exc).__name__}")

        for target in args.click:
            ok, err = _click(page, target, args.timeout)
            actions.append(f"clicked {target!r}" if ok
                           else f"FAILED to click {target!r}: {type(err).__name__ if err else 'not found'}")
            page.wait_for_timeout(200)

        page.wait_for_timeout(args.settle)
        title = page.title()
        page.screenshot(path=out, full_page=args.full_page)
        browser.close()

    # Chrome's own noise is not the app's fault.
    noise = re.compile(r"favicon|DevTools|Download the React DevTools|preloaded using link preload")
    console_errors = [c for c in console_errors if not noise.search(c)]
    failed_requests = [f for f in failed_requests if not noise.search(f)]

    print(f"\nURL        {args.url}")
    print(f"Title      {title or '(none)'}")
    print(f"Viewport   {args.viewport} {VIEWPORTS[args.viewport]['width']}x{VIEWPORTS[args.viewport]['height']}")
    print(f"Screenshot {out}")
    if actions:
        print("\nActions")
        for a in actions:
            print(f"  - {a}")

    def _section(label, items, limit=15):
        print(f"\n{label} ({len(items)})")
        if not items:
            print("  none")
            return
        for item in items[:limit]:
            print(f"  - {item[:300]}")
        if len(items) > limit:
            print(f"  ... {len(items) - limit} more")

    _section("Page errors", page_errors)
    _section("Console errors/warnings", console_errors)
    _section("Failed / 4xx-5xx requests", failed_requests)

    broke = bool(page_errors or failed_requests
                 or [c for c in console_errors if c.startswith("error")]
                 or [a for a in actions if a.startswith(("FAILED", "TIMED OUT"))])
    print("\nRESULT:", "PROBLEMS FOUND - read the errors above" if broke else "clean")
    print("Now open the screenshot and confirm the change is actually visible.\n")
    return 0 if (args.keep_going or not broke) else 1


if __name__ == "__main__":
    sys.exit(main())
