import asyncio, json, subprocess, os, glob
from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402


"""
Smoke test for the GM layer and — more importantly — for its absence.

Two builds are checked against each other:

  RELEASE  (dist,    npm run build)      __GM__ = false
  TESTER   (dist-gm, npm run build:gm)   __GM__ = true

The release half is the real assertion of the requirement: no GM chunk on
disk, no GM string in the bundle, no corner button even when someone
guesses `?gm=1`. The tester half proves the panel still does its job, so
that "removable" doesn't quietly mean "broken".
"""

RELEASE = BASE
TESTER = GM_BASE


async def main():
    fails, notes, errors = [], {}, []

    def want(c, m):
        if not c:
            fails.append(m)

    # ------------------------------------------------------------------
    # 0. the release bundle on disk: nothing GM about it
    # ------------------------------------------------------------------
    rel = os.path.join(ROOT, "dist", "assets")
    gm_chunks = [os.path.basename(p) for p in glob.glob(os.path.join(rel, "*[Gg][Mm]*"))]
    notes["release_gm_chunks"] = gm_chunks
    want(not gm_chunks, f"release build emitted a GM chunk: {gm_chunks}")

    hits = []
    for p in glob.glob(os.path.join(rel, "*.js")):
        txt = open(p, encoding="utf-8", errors="ignore").read()
        for needle in ("GM · 调试层", "gmWrite", "摊边人影"):
            if needle in txt:
                hits.append((os.path.basename(p), needle))
    notes["release_gm_strings"] = hits
    # gmWrite survives as a store field name; the panel's own text must not
    want(
        not [h for h in hits if h[1] != "gmWrite"],
        f"release bundle still contains GM UI text: {hits}",
    )

    async with async_playwright() as p:
        b = await p.chromium.launch()

        # --------------------------------------------------------------
        # 1. release build: ?gm=1 does nothing at all
        # --------------------------------------------------------------
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(RELEASE + "?skipIntro=1&gm=1")
        await pg.wait_for_timeout(1500)
        toggle = await pg.locator("[data-gm-toggle]").count()
        notes["release_toggle_with_gm_param"] = toggle
        want(toggle == 0, "?gm=1 opened a GM button in the release build")
        await ctx.close()

        # --------------------------------------------------------------
        # 2. tester build: the panel is there and it works
        # --------------------------------------------------------------
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        # without the flag the tester build still looks like the game
        await pg.goto(TESTER + "?skipIntro=1")
        await pg.wait_for_timeout(1400)
        notes["tester_toggle_without_param"] = await pg.locator("[data-gm-toggle]").count()
        want(
            notes["tester_toggle_without_param"] == 0,
            "the GM button showed up without ?gm=1",
        )

        await pg.goto(TESTER + "?skipIntro=1&gm=1")
        await pg.wait_for_timeout(1600)
        await clear_story(pg)
        want(await pg.locator("[data-gm-toggle]").count() == 1, "no GM button with ?gm=1")

        # it sits in the top-left corner, and it is see-through
        box = await pg.locator("[data-gm-toggle]").first.bounding_box()
        notes["toggle_box"] = box
        want(box and box["x"] < 24 and box["y"] < 60, f"GM button is not top-left: {box}")
        alpha = await pg.evaluate(
            """() => {
              const el = document.querySelector('[data-gm-toggle]');
              const bg = getComputedStyle(el).backgroundColor;
              const m = bg.match(/rgba?\\(([^)]+)\\)/);
              const parts = m ? m[1].split(',').map(Number) : [0,0,0,1];
              return parts.length > 3 ? parts[3] : 1;
            }"""
        )
        notes["toggle_alpha"] = alpha
        want(alpha < 0.95, f"the GM button should be translucent, alpha={alpha}")

        await pg.locator("[data-gm-toggle]").first.click()
        await pg.wait_for_timeout(500)
        want(await pg.locator("[data-gm-panel]").count() == 1, "the GM panel did not open")

        # --- money: a GM write must land in the save, not just the screen
        coin_before = await pg.evaluate("() => window.__lyre.state().coin")
        await pg.get_by_text("铜板 +N", exact=False).first.click()
        await pg.wait_for_timeout(400)
        coin_after = await pg.evaluate("() => window.__lyre.state().coin")
        notes["coin"] = [coin_before, coin_after]
        want(coin_after > coin_before, "GM coin button did not change the save")

        # --- weather override, read back through the same system the UI uses
        await pg.get_by_text("雷雨", exact=False).first.click()
        await pg.wait_for_timeout(600)
        sky = await pg.evaluate("() => window.__lyre.sky()")
        notes["forced_sky"] = sky["weather"]
        want(sky["weather"] == "thunder", f"forced weather did not take: {sky['weather']}")

        # --- visitor override: pin one and check the stall agrees
        await pg.get_by_text("glow", exact=False).first.click()
        await pg.wait_for_timeout(600)
        guests = await pg.evaluate("() => window.__lyre.guests()")
        notes["forced_guest"] = guests
        want(
            any(g["id"] == "vs_glow" for g in guests),
            f"pinned visitor did not appear: {guests}",
        )

        # --- hidden affection: the panel may edit it, the player still sees prose
        bond_before = await pg.evaluate("() => window.__lyre.state().story.bond.ch_su || 0")
        await pg.get_by_text("+20", exact=True).first.click()
        await pg.wait_for_timeout(500)
        bond_after = await pg.evaluate("() => window.__lyre.state().story.bond.ch_su || 0")
        notes["gm_bond"] = [bond_before, bond_after]
        want(bond_after > bond_before, "GM affection button did not move the hidden value")

        # --- force a scene, which is the whole reason the panel exists
        await pg.evaluate("() => window.__lyre.play('m1_ledger')")
        await pg.wait_for_timeout(700)
        notes["forced_scene"] = await pg.locator("[data-story]").first.get_attribute("data-story")
        want(notes["forced_scene"] == "m1_ledger", "GM could not force a scene open")
        await clear_story(pg)

        await b.close()

    return report("GM SMOKE", fails, errors, notes)


sys.exit(asyncio.run(main()))
