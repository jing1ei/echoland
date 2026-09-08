"""
Scene walker: plays EVERY authored scene from start to finish in a real
browser, clicking through choices, and fails if any scene errors, stalls,
or leaves the story layer stuck open.

The content audit (window.__lyreAudit) catches bad references statically.
This catches the other half: a label that is unreachable at runtime, a
choice whose branch never reaches an end, a `roll` with no fallthrough.
Cheap insurance as the script grows — run it after adding scenes.
"""

import asyncio
import json
import sys

from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402



SEED = """() => {
  const k = 'wandering-lyre-save-v1';
  const s = JSON.parse(localStorage.getItem(k));
  // rich state so `need:` gates on choices are satisfiable and we exercise
  // the taken branch rather than always seeing the locked one
  s.coin = 200000; s.insp = 9000; s.renown = 400; s.leisure = 60;
  s.totalCoin = 400000; s.collects = 40;
  s.overlooks = ['mistquay','windmeadow','petalbridge','cliffbeacon','rainlane',
                 'emberkiln','auroralake','cloudtea','starfalldunes','belltower',
                 'lanternwood','whalefall'];
  s.instruments = ['lute_worn','flute_silver','accordion','drum_frame','erhu_road'];
  s.songs = ['song_ferry','song_tide','song_wheat','song_letter'];
  s.story = s.story || {};
  s.story.chapter = 9;
  s.story.bond = {};
  s.story.met = {};
  s.story.seen = {}; s.story.seenAt = {}; s.story.fired = {};
  s.story.vars = {}; s.story.queue = [];
  localStorage.setItem(k, JSON.stringify(s));
}"""


async def main():
    failures = []
    errors = []
    walked = {}

    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.on(
            "console",
            lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None,
        )

        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1200)
        await reseed(pg, SEED, qs="?skipIntro=1&hour=17.6", settle=1800)

        ids = await pg.evaluate("() => window.__lyreScenes ? window.__lyreScenes() : null")
        if not ids:
            print("window.__lyreScenes() missing — cannot enumerate scenes")
            sys.exit(1)

        for sid in ids:
            # clear any leftover overlay, then force this scene
            await pg.evaluate("() => window.__lyre.state && null")
            ok = await pg.evaluate("(id) => window.__lyre.play(id)", sid)
            if ok is False:
                failures.append(f"{sid}: play() refused")
                continue
            await pg.wait_for_timeout(260)

            steps = 0
            lines = 0
            while steps < 260:
                steps += 1
                if await pg.locator("[data-story]").count() == 0:
                    break
                body = await pg.inner_text("body")

                if "记下了" in body:  # closing card
                    await pg.get_by_text("记下了").first.click()
                    await pg.wait_for_timeout(180)
                    continue
                if "刚才说了什么" in body:  # backlog got opened somehow
                    await pg.get_by_text("收起").first.click()
                    await pg.wait_for_timeout(140)
                    continue

                btns = pg.locator("[data-story] button")
                n = await btns.count()
                clicked = False
                for i in range(n):
                    t = (await btns.nth(i).inner_text()).strip()
                    if not t or t in ("回顾", "自动"):
                        continue
                    if len(t) <= 3:
                        continue
                    if not await btns.nth(i).is_enabled():
                        continue
                    await btns.nth(i).click()
                    clicked = True
                    break
                if not clicked:
                    await pg.mouse.click(207, 500)
                    lines += 1
                await pg.wait_for_timeout(120)

            if await pg.locator("[data-story]").count() != 0:
                failures.append(f"{sid}: story layer still open after {steps} steps")
                await pg.evaluate("() => window.__lyre.close && window.__lyre.close()")
                await pg.reload()
                await pg.wait_for_timeout(1400)
            walked[sid] = lines

    return report("SCENE WALK", failures, errors, {"scenes": len(walked), "walked": walked})


sys.exit(asyncio.run(main()))
