"""
Smoke test for the three systems that arrived with the lineage rewrite:

  1. FAME IS LOCAL      renown was one number for the world; it is now one
                        per town, shown as one of five words and never as a
                        digit. An old save has to migrate into that shape,
                        and walking to the next town has to change the word.
  2. YOU CAN WRITE      inspiration buys a song of your own: the sheet spends
                        insp + leisure, the song lands in the repertoire
                        marked as yours, and the next one costs more.
  3. THE EIGHTY-ONE     the main line is a collection. Leaves accumulate,
                        the ninth leaf of a volume hands back the piece the
                        volume was, and the collection page shows blanks
                        rather than percentages for what is still missing.

Plus the one deletion the design asked for: a strange figure at the stall
gets NO caption. The silhouette is the whole notice.

Ports: 4179 = release build (dist), 4180 = GM build (dist-gm). The
collection test needs the GM panel, because finding nine specific leaves by
hand would mean visiting a hundred rooms.
"""

import asyncio
import glob
import json
import re
import sys

from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402


GM = GM_BASE

FAME_WORDS = ["无人识得", "有点面熟", "小有名气", "声名在外", "名动一方"]

# an old save: global renown, no `fame`, no `scores`, no `composed`.
# The sanitizer has to invent all three without stranding anything.
OLD_SAVE = """() => {
  const k = 'wandering-lyre-save-v1';
  const s = JSON.parse(localStorage.getItem(k));
  s.coin = 30000; s.insp = 5200; s.renown = 210; s.leisure = 40;
  s.overlooks = ['mistquay','windmeadow','petalbridge','cliffbeacon'];
  s.overlook = 'mistquay';
  s.instruments = ['lute_worn','flute_silver'];
  s.songs = ['song_ferry','song_tide'];
  s.repertoire = ['song_ferry'];
  s.lastTick = Date.now() - 4*3600*1000;
  s.lastCollect = s.lastTick;
  delete s.fame;
  delete s.fameAt;
  delete s.scores;
  delete s.composed;
  localStorage.setItem(k, JSON.stringify(s));
}"""

# five towns held at the five thresholds, so one page load can check the
# whole ladder. Values from content/fame/registry.ts.
LADDER = """() => {
  const k = 'wandering-lyre-save-v1';
  const s = JSON.parse(localStorage.getItem(k));
  s.fame = { saltide: 0, millbrook: 12, sakuraminato: 46, tidecall: 140, emberkiln: 380 };
  s.fameAt = Date.now();
  s.overlook = 'mistquay';
  localStorage.setItem(k, JSON.stringify(s));
}"""


async def boot(pg, url, seed, qs="?skipIntro=1"):
    """first load creates a save, `reseed` patches it with the app parked"""
    await pg.goto(url + "?skipIntro=1")
    await pg.wait_for_timeout(1100)
    if seed:
        await reseed(pg, seed, url=url, qs=qs, settle=1500)
        return
    await pg.goto(url + qs)
    await pg.wait_for_timeout(1500)
    await clear_story(pg)


async def gm_click(pg, label):
    """open the GM panel if needed and press one button by label"""
    if await pg.locator("[data-gm-panel]").count() == 0:
        await pg.locator("[data-gm-toggle]").first.click()
        await pg.wait_for_timeout(350)
    await pg.locator("[data-gm-panel] button", has_text=label).first.click()
    await pg.wait_for_timeout(400)


async def fame_slot(pg):
    """Read the fame word off the screen it now lives on.

    名气 used to sit on the stage next to the takings. It moved to the explore
    screen, beside the two things it actually spends time with (灵感, 闲暇), so
    a test that wants to see it has to walk there first."""
    for _ in range(6):
        if await pg.locator("[data-fame]").count() > 0:
            break
        body = await pg.inner_text("body")
        for close in ("继续放着，我先走", "记下了", "收起"):
            if close in body:
                try:
                    await pg.get_by_text(close).first.click(timeout=2000)
                    await pg.wait_for_timeout(300)
                except Exception:
                    pass
        tab = pg.get_by_text("探索", exact=True)
        if await tab.count() > 0:
            try:
                await tab.first.click(timeout=2000)
                await pg.wait_for_timeout(500)
                continue
            except Exception:
                pass
        # the chrome may be hidden — tapping the scenery brings it back
        await pg.mouse.click(207, 430)
        await pg.wait_for_timeout(300)
    slot = pg.locator("[data-fame]").first
    return (await slot.get_attribute("data-fame")), (await slot.inner_text()).strip()


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
            lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None,
        )

        # ==================================================================
        # 1. FAME
        # ==================================================================
        await boot(pg, BASE, OLD_SAVE, "?skipIntro=1&hour=15.2")

        # -- 1a. a save from before regional fame lands in the new shape
        fame = await pg.evaluate("() => window.__lyre.fame()")
        notes["migrated_fame"] = fame
        want(fame["town"] == "saltide", f"fame did not land in the town you are in: {fame}")
        want(fame["raw"] > 0, "migration threw the old renown away")
        want(fame["travelled"] > 0, "the travelled name did not survive migration")
        want(fame["word"] in FAME_WORDS, f"fame word off the five-word ladder: {fame['word']}")

        # -- 1b. the explore screen shows the word and nothing numeric, and
        #        the stage shows neither
        stage_body = await pg.inner_text("body")
        want("[data-fame]" not in stage_body, "sanity")
        want(
            await pg.locator("[data-fame]").count() == 0,
            "名气 is back on the stage — it belongs to the explore screen now",
        )
        stage_fame, fame_text = await fame_slot(pg)
        notes["explore_fame"] = {"attr": stage_fame, "text": fame_text}
        want(stage_fame == fame["word"], f"explore word disagrees with state: {stage_fame} vs {fame}")
        want(not re.search(r"\d", fame_text), f"a digit leaked into the fame slot: {fame_text!r}")

        body = await pg.inner_text("body")
        want("名声" not in body, "the old global word 名声 is still on screen")
        want(str(round(fame["raw"])) not in fame_text, "the raw fame number is on screen")

        # -- 1c. five bands, five words, in order
        await reseed(pg, LADDER, qs="?skipIntro=1&hour=15.2", settle=1400)
        ladder = await pg.evaluate(
            """() => ['saltide','millbrook','sakuraminato','tidecall','emberkiln']
                 .map(t => window.__lyre.fame(t))
                 .map(f => [f.tier, f.word])"""
        )
        notes["ladder"] = ladder
        want([t for t, _ in ladder] == [0, 1, 2, 3, 4], f"the five bands are not in order: {ladder}")
        want(len({w for _, w in ladder}) == 5, f"the five bands do not have five words: {ladder}")

        # -- 1d. fame is regional: the same save, a different town, a
        #        different word. 风车原 (windmeadow) is in 磨坊村 (millbrook).
        here = await pg.evaluate("() => window.__lyre.fame().word")
        await reseed(
            pg,
            """() => {
              const k = 'wandering-lyre-save-v1';
              const s = JSON.parse(localStorage.getItem(k));
              s.overlook = 'windmeadow';
              localStorage.setItem(k, JSON.stringify(s));
            }""",
            qs="?skipIntro=1&hour=15.2",
            settle=1400,
        )
        there = await pg.evaluate("() => window.__lyre.fame()")
        there_stage, _ = await fame_slot(pg)
        notes["regional"] = {"saltide": here, "millbrook": there["word"], "stage": there_stage}
        want(there["town"] == "millbrook", f"travelling did not move the fame town: {there}")
        want(
            there["word"] != here,
            f"the next town over calls you the same thing: {here} / {there['word']}",
        )
        want(there_stage == there["word"], "the explore screen did not follow you to the new town")

        # ==================================================================
        # 2. THE STALL SAYS NOTHING
        #    A special visitor used to get a caption and a badge. Both are
        #    gone, so the strings should not exist in the shipped bundle at
        #    all, and no idle stage should ever print one.
        # ==================================================================
        captions = [
            "摊边有人",
            "摊子边多了个影子",
            "有人提着灯站在听众后面",
            "摊子边站着的人身上有光",
            "一把伞停在人堆边上",
        ]
        bundle = ""
        for f in sorted(glob.glob("wandering-lyre/dist/assets/*.js")):
            bundle += open(f, encoding="utf-8").read()
        in_bundle = [c for c in captions if c in bundle]
        notes["captions_in_bundle"] = in_bundle
        want(not in_bundle, f"visitor captions are still shipped: {in_bundle}")

        # and a couple of live loads to be sure nothing else narrates it
        seen = []
        for h in ("6.5", "13.0", "21.5"):
            await pg.goto(BASE + f"?skipIntro=1&hour={h}")
            await pg.wait_for_timeout(1500)
            await clear_story(pg)
            body = await pg.inner_text("body")
            seen += [c for c in captions if c in body]
        notes["stall_captions"] = seen
        want(not seen, f"the stall announced its visitor: {seen}")

        # ==================================================================
        # 3. COMPOSING
        # ==================================================================
        await boot(pg, BASE, OLD_SAVE, "?skipIntro=1&hour=15.2")
        before = await pg.evaluate("() => window.__lyre.state()")

        await pg.get_by_text("制定策略").first.click()
        await pg.wait_for_timeout(600)
        await pg.get_by_text("用灵感谱一支曲", exact=False).first.click()
        await pg.wait_for_timeout(700)
        body = await pg.inner_text("body")
        want("谱曲" in body, "the composing sheet did not open")

        # 定稿 = two motifs, the normal purchase
        await pg.get_by_text("定稿", exact=True).first.click()
        await pg.wait_for_timeout(250)
        cost_before = await pg.evaluate(
            """() => {
              const el = [...document.querySelectorAll('span')]
                .find(x => /^\\d+\\s*灵感$/.test((x.textContent||'').trim()));
              return el ? parseInt(el.textContent) : null;
            }"""
        )

        chosen_motifs = await pg.evaluate(
            """() => {
              /* the motif row is the chip row that follows the 听过的东西
                 divider; click the first two chips in it */
              const labels = document.querySelectorAll('*');
              let row = null;
              for (const el of labels) {
                if ((el.textContent || '').trim().startsWith('听过的东西') && el.children.length === 0) {
                  let n = el.parentElement;
                  while (n && !row) {
                    let sib = n.nextElementSibling;
                    while (sib) {
                      if (sib.querySelectorAll('button').length >= 2) { row = sib; break; }
                      sib = sib.nextElementSibling;
                    }
                    n = n.parentElement;
                  }
                }
                if (row) break;
              }
              if (!row) return [];
              const btns = [...row.querySelectorAll('button')].slice(0, 2);
              btns.forEach((b) => b.click());
              return btns.map((b) => b.textContent.trim());
            }"""
        )
        await pg.wait_for_timeout(350)
        notes["motifs_picked"] = chosen_motifs
        want(len(chosen_motifs) >= 1, "could not pick a motif")

        await pg.get_by_text("为了钱", exact=False).first.click()
        await pg.wait_for_timeout(250)
        submit = pg.locator("button", has_text="落笔")
        want(await submit.count() > 0, "no 落笔 button")
        if await submit.count() > 0:
            await submit.first.click()
            await pg.wait_for_timeout(900)

        after = await pg.evaluate("() => window.__lyre.state()")
        lib = await pg.evaluate("() => window.__lyre.lib()")
        notes["compose"] = {
            "insp": [round(before["insp"]), round(after["insp"])],
            "leisure": [round(before["leisure"]), round(after["leisure"])],
            "composed": lib["composed"],
            "cost_shown": cost_before,
        }
        want(len(after["composed"]) == 1, f"no song was written: {after['composed']}")
        want(after["insp"] < before["insp"], "composing spent no inspiration")
        want(after["leisure"] < before["leisure"], "composing spent no leisure")
        if after["composed"]:
            mine = after["composed"][0]
            want(mine["id"] in after["songs"], "the composed song is not in the song list")
            want(bool(mine["name"]), "the composed song has no title")
            body = await pg.inner_text("body")
            want("写完了" in body, "the sheet did not confirm the song")
            want(mine["name"] in body, "the finished song's title was not shown")

        # -- 3b. the next one costs more (surchargePerSong)
        again = pg.locator("button", has_text="再写一首")
        if await again.count() > 0:
            await again.first.click()
            await pg.wait_for_timeout(400)
        await pg.get_by_text("定稿", exact=True).first.click()
        await pg.wait_for_timeout(250)
        cost_after = await pg.evaluate(
            """() => {
              const el = [...document.querySelectorAll('span')]
                .find(x => /^\\d+\\s*灵感$/.test((x.textContent||'').trim()));
              return el ? parseInt(el.textContent) : null;
            }"""
        )
        notes["compose_surcharge"] = [cost_before, cost_after]
        want(
            cost_before is not None and cost_after is not None and cost_after > cost_before,
            f"writing a second song is not dearer: {cost_before} -> {cost_after}",
        )

        # -- 3c. the satchel marks it as yours. The bag is a tray of icons
        #        now, so the mark lives on the slab you get after tapping the
        #        song's cell — go and tap it.
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(300)
        await pg.goto(BASE + "?skipIntro=1&hour=15.2&tab=satchel")
        await pg.wait_for_timeout(1300)
        await clear_story(pg)
        mine = await pg.evaluate(
            "() => (window.__lyre.lib().composed || []).map(s => s.id || s)"
        )
        notes["composed_ids"] = mine
        want(len(mine) > 0, "composing left nothing in the save")
        if mine:
            await pg.click("[data-tray-tab='songs']")
            await pg.wait_for_timeout(250)
            await pg.locator(f"[data-cell='{mine[0]}']").first.click()
            await pg.wait_for_timeout(300)
        body = await pg.inner_text("body")
        want("自谱" in body, "the satchel does not mark a self-written song")

        # ==================================================================
        # 4. THE EIGHTY-ONE  (GM build)
        # ==================================================================
        await boot(pg, GM, OLD_SAVE, "?skipIntro=1&gm=1&hour=15.2")
        lib0 = await pg.evaluate("() => window.__lyre.lib()")
        notes["lib_start"] = lib0
        want(lib0["total"] == 81, f"the library is not eighty-one leaves: {lib0}")
        want(lib0["found"] == 0, "a fresh save already holds leaves")
        want(lib0["active"] == "vol_tide", f"the first volume is not the tide volume: {lib0}")

        # one leaf: the state moves, the story notices
        await gm_click(pg, "找回下一页")
        await pg.wait_for_timeout(500)
        await clear_story(pg)
        lib1 = await pg.evaluate("() => window.__lyre.lib()")
        notes["lib_one"] = lib1
        want(lib1["found"] == 1, f"picking up a leaf did not register: {lib1}")

        # the whole volume: nine leaves hand back the piece they were
        await gm_click(pg, "补齐当前这一卷")
        await pg.wait_for_timeout(700)
        await clear_story(pg)
        lib2 = await pg.evaluate("() => window.__lyre.lib()")
        st = await pg.evaluate("() => window.__lyre.state()")
        notes["lib_volume"] = lib2
        want(lib2["found"] == 9, f"the volume did not fill: {lib2}")
        want(lib2["volumes"] == 1, f"nine leaves did not complete a volume: {lib2}")
        want("song_vol_tide" in st["songs"], "a completed volume gave back no song")
        want(lib2["active"] == "vol_wheat", f"the collection did not move on: {lib2}")

        # the collection page: found titles, blanks for the rest, no percentage
        # (reload without ?gm=1 so the debug slab is out of the way)
        await pg.goto(GM + "?skipIntro=1&tab=journal")
        await pg.wait_for_timeout(1400)
        await clear_story(pg)
        await pg.get_by_text("古谱", exact=True).first.click()
        await pg.wait_for_timeout(600)
        body_collapsed = await pg.inner_text("body")
        want("一卷 · 潮" in body_collapsed, "the collection page does not list the volumes")
        want(
            "《系缆》" not in body_collapsed,
            "the collection page spills every leaf title before you open a volume",
        )
        # open the tide volume: found leaves by name, the rest as blanks
        await pg.get_by_text("一卷 · 潮", exact=False).first.click()
        await pg.wait_for_timeout(500)
        body = await pg.inner_text("body")
        notes["scores_tab"] = {
            "shows_volume_one": "一卷 · 潮" in body,
            "shows_a_found_title": "《系缆》" in body,
            "shows_lore": "第一卷是给水听的" in body,
        }
        want("《系缆》" in body, "a recovered leaf is not shown by name")
        want("《潮眼》" in body, "a completed volume hides its own last leaf")
        want("%" not in body, "the collection page reports a percentage")
        want("《鲸语》" not in body, "an unfound leaf of a far volume leaked its title")

        await b.close()

    return report("LINEAGE SMOKE", fails, errors, notes)


sys.exit(asyncio.run(main()))
