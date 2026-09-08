#!/usr/bin/env python3
"""World audit — the content cross-reference report, read out of the real bundle.

`errors` are dead ends: an id that points at nothing, a flag every condition
waits for and nobody sets, a gate above the affection the whole game can hand
out. They fail the suite. `advisories` are judgement calls.

    npm run build && python3 tests/audit_world.py
"""

import asyncio
import os
import sys

from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, preview  # noqa: E402


async def run(url: str) -> int:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        await pg.goto(url + "?skipIntro=1", wait_until="networkidle")
        report = await pg.evaluate("() => window.__lyreWorld ? window.__lyreWorld() : null")
        await b.close()

    if report is None:
        print("window.__lyreWorld() missing — is content/audit.ts imported by main.tsx?")
        return 1

    errors, advisories = report["errors"], report["advisories"]
    print(f"errors: {len(errors)}")
    for e in errors:
        print("  x", e)
    print(f"advisories: {len(advisories)}")
    for a in advisories:
        print("  .", a)
    print("WORLD AUDIT:", "PASS" if not errors else "FAIL")
    return 1 if errors else 0


def main() -> int:
    with preview() as url:
        return asyncio.run(run(url))


sys.exit(main())
