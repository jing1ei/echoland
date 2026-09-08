"""
The bag, and where numbers are allowed to live.

Two rules got written into the UI and this is the test that keeps them:

  1. 行囊 is a tray of pictures. Every object is a cell with a drawing and,
     if you carry several, a count in the corner. No object writes its name
     out until you tap it. The only number the bag prints by itself is coin.

  2. 名气, 灵感 and 闲暇 belong to 探索 — the screen where you spend them.
     They are not on the stage, and they are not in the bag.

Run against the built preview (npm run preview -- --port 4179).
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
  s.coin = 42000; s.insp = 5200; s.leisure = 31; s.renown = 260;
  s.overlooks = ['mistquay','windmeadow','petalbridge'];
  s.overlook = 'mistquay';
  s.maps = ['saltide','millbrook'];
  s.instruments = ['lute_worn','flute_silver','harp_tide'];
  s.instrument = 'flute_silver';
  s.songs = ['song_ferry','song_tide','song_lantern'];
  s.repertoire = ['song_ferry','song_tide'];
  s.upgrades = ['up_coffer','up_lantern'];
  s.items = { it_shell: 7, it_glaze: 4, it_sandglass: 1, it_string: 9 };
  s.fame = { saltide: 210, millbrook: 20 };
  s.fameAt = Date.now();
  s.lastTick = Date.now() - 3*3600*1000;
  s.lastCollect = s.lastTick;
  s.story = s.story || {};
  s.story.chapter = 3;
  s.story.seen = { m1_ledger: 1, m1_paid: 1 };
  s.story.seenAt = {}; s.story.fired = {}; s.story.vars = {}; s.story.queue = [];
  localStorage.setItem(k, JSON.stringify(s));
}"""

# the three that may only appear on 探索
ELSEWHERE = ("名气", "灵感", "闲暇")


async def tab(pg, label):
    for _ in range(5):
        el = pg.locator(".nav-tab", has_text=label)
        if await el.count() > 0:
            try:
                await el.first.click(timeout=2500)
                await pg.wait_for_timeout(650)
                return True
            except Exception:
                pass
        # the chrome hides when the scenery is tapped — bring it back
        await pg.mouse.click(207, 430)
        await pg.wait_for_timeout(300)
    return False


async def main():
    fails, notes, errors = [], {}, []

    def want(c, m):
        if not c:
            fails.append(m)

    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.on(
            "console",
            lambda m: errors.append(f"console.error: {m.text}")
            if m.type == "error" and "ERR_" not in m.text
            else None,
        )

        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1100)
        await reseed(pg, SEED, settle=1700)

        # ------------------------------------------------------------------
        # 1. the stage carries no stat strip any more
        # ------------------------------------------------------------------
        stage = await pg.inner_text("body")
        notes["stage_words"] = [w for w in ELSEWHERE if w in stage]
        want(not notes["stage_words"], f"the stage still prints {notes['stage_words']}")
        want(
            await pg.locator("[data-fame]").count() == 0,
            "名气 is back on the stage",
        )

        # ------------------------------------------------------------------
        # 2. the bag: pictures, counts, coin, and nothing else
        # ------------------------------------------------------------------
        want(await tab(pg, "行囊"), "the bag tab should be reachable")
        want(await pg.locator("[data-purse='coin']").count() == 1, "the bag lost its coin slot")

        tabs = await pg.locator("[data-tray-tab]").count()
        notes["tray_tabs"] = tabs
        want(tabs == 4, f"the bag should have four icon tabs, found {tabs}")
        want(
            await pg.locator("[data-tray-tab] svg").count() >= 4,
            "the tabs should be drawings, not words",
        )

        cells = pg.locator("[data-cell]")
        notes["cells"] = await cells.count()
        want(notes["cells"] == 4, f"four kinds of thing carried, {notes['cells']} cells drawn")
        want(
            await pg.locator("[data-cell] svg").count() == notes["cells"],
            "every cell should carry a drawing",
        )

        bag = await pg.inner_text("body")
        notes["bag_words"] = [w for w in ELSEWHERE if w in bag]
        want(not notes["bag_words"], f"the bag still prints {notes['bag_words']}")
        want("窑变瓷片" not in bag, "an untapped cell is writing its name out")
        # the counts are in the cells, in the corner
        counts = []
        for i in range(notes["cells"]):
            counts.append((await cells.nth(i).inner_text()).strip())
        counts = sorted(counts)
        notes["counts"] = counts
        want(counts == ["1", "4", "7", "9"], f"counts are not on the cells: {counts}")

        # tapping is what writes it out
        await pg.locator("[data-cell='it_glaze']").click()
        await pg.wait_for_timeout(350)
        slab = await pg.inner_text("body")
        want("窑变瓷片" in slab, "tapping a cell did not name the thing")
        want("烧坏了的" in slab, "tapping a cell did not describe the thing")
        notes["slab_words"] = [w for w in ELSEWHERE if w in slab]
        want(not notes["slab_words"], f"the slab leaked {notes['slab_words']}")

        # the other trays still hold their own things
        await pg.locator("[data-tray-tab='songs']").click()
        await pg.wait_for_timeout(300)
        want(await pg.locator("[data-cell='song_tide']").count() == 1, "the song tray is empty")
        song_tray = await pg.inner_text("body")
        want("《潮汐摇篮曲》" not in song_tray, "an untapped song is writing its title out")
        await pg.locator("[data-cell='song_tide']").click()
        await pg.wait_for_timeout(300)
        want("潮汐摇篮曲" in await pg.inner_text("body"), "tapping a song did not name it")

        await pg.locator("[data-tray-tab='instruments']").click()
        await pg.wait_for_timeout(300)
        want(await pg.locator("[data-cell='harp_tide']").count() == 1, "the instrument tray is empty")

        await pg.locator("[data-tray-tab='kit']").click()
        await pg.wait_for_timeout(300)
        want(await pg.locator("[data-cell='up_coffer']").count() == 1, "the kit tray is empty")

        # ------------------------------------------------------------------
        # 3. explore: all three, and the fame word without a number
        # ------------------------------------------------------------------
        want(await tab(pg, "探索"), "the explore tab should be reachable")
        exp = await pg.inner_text("body")
        missing = [w for w in ELSEWHERE if w not in exp]
        notes["explore_missing"] = missing
        want(not missing, f"the explore screen is missing {missing}")
        want(await pg.locator("[data-fame]").count() >= 1, "the fame slot is not on explore")
        word = await pg.locator("[data-fame]").first.get_attribute("data-fame")
        slot = (await pg.locator("[data-fame]").first.inner_text()).strip()
        notes["fame"] = {"word": word, "text": slot}
        want(word == "声名在外", f"fame word wrong for a save at 210: {word}")
        want(not any(ch.isdigit() for ch in slot), f"a digit leaked into the fame slot: {slot!r}")

        await b.close()

    return report("BAG SMOKE", fails, errors, notes)


sys.exit(asyncio.run(main()))
