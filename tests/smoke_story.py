import asyncio, json, re
from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402




# an old v3 save with NO story slice at all — this is what a returning
# player actually has on disk, and it must migrate rather than wipe
OLD_SAVE = """() => {
  const s = {
    version: 3, coin: 8800, insp: 400, renown: 120, leisure: 20,
    totalCoin: 20000, collects: 12,
    overlook: 'saltide_pier', instrument: 'lute_worn', stance: 'busk',
    repertoire: ['song_ferry'],
    overlooks: ['mistquay','windmeadow','petalbridge','cliffbeacon'],
    instruments: ['lute_worn'], songs: ['song_ferry'], upgrades: [],
    items: {}, maps: [], flags: {}, questsDone: [], questsActive: [],
    journal: [], decisions: [], pending: {coin:0, insp:0, hours:0, events:[]},
    lastTick: Date.now() - 4*3600*1000, lastCollect: Date.now() - 4*3600*1000,
    seenIntro: true, reduceMotion: false, stamina: 1
  };
  localStorage.setItem('%s', JSON.stringify(s));
}""" % KEY


async def main():
    fails, notes = [], {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        # ---------- 1. content audit against the shipped bundle
        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1200)
        problems = await pg.evaluate("() => window.__lyreAudit ? window.__lyreAudit() : ['no audit hook']")
        notes["audit"] = problems
        if problems:
            fails.append(f"content audit: {problems}")

        # ---------- 2. old save migrates and gains a story slice
        await reseed(pg, OLD_SAVE, settle=1200)
        s = await pg.evaluate(READ)
        if s["coin"] < 8000:
            fails.append("v3 save was wiped instead of migrated")
        if "story" not in s:
            fails.append("story slice missing after migration")
        else:
            for k in ("chapter", "bond", "met", "seen", "seenAt", "fired", "vars", "queue"):
                if k not in s["story"]:
                    fails.append(f"story.{k} missing after migration")
        cur = await pg.evaluate("() => window.__lyre.version")
        if s.get("version") != cur:
            fails.append(f"version not rewritten to current ({cur}): {s.get('version')}")

        # ---------- 3. the router explains itself
        why = await pg.evaluate("() => window.__lyre.why('collect')")
        notes["collect_triggers"] = len(why)
        if not why:
            fails.append("no triggers registered on the collect hook")
        if not any(w["line"] == "main" for w in why):
            fails.append("no main-line trigger on collect")
        bad = [w for w in why if not (0 < w["chance"] <= 1)]
        if bad:
            fails.append(f"bad chance values: {bad}")

        # ---------- 4. probability actually gates firing
        # chapter 0 + nothing owned: the opening beat should be eligible and
        # certain, so 40 rolls must all produce a scene
        tally = await pg.evaluate("() => window.__lyre.roll('collect', 40)")
        notes["roll_ch0"] = tally
        if tally.get("__none", 0) == 40:
            fails.append("nothing ever fires on collect at chapter 0")

        # the distribution itself is the assertion: over 40 identical rolls the
        # same state must sometimes produce nothing and sometimes produce
        # different scenes, which is only possible if chance is really rolled
        outcomes = [k for k in tally if k != "__none"]
        if tally.get("__none", 0) == 0:
            fails.append("collect fires every single time — chance is being ignored")
        if len(outcomes) < 2:
            fails.append(f"only one outcome ever fires: {tally}")
        big = await pg.evaluate("() => window.__lyre.roll('collect', 600)")
        notes["roll_600"] = big
        # b_que_1 sits alone in the 70 band at chance .45 — a 600-sample rate
        # outside 0.32..0.58 means the priority band or the roll is wrong
        if "b_que_1" in big:
            rate = big["b_que_1"] / 600
            notes["b_que_1_rate"] = round(rate, 3)
            if not 0.32 <= rate <= 0.58:
                fails.append(f"b_que_1 fires at {rate:.2f}, authored chance is 0.45")

        # ---------- 5. a scene plays: portrait, dialogue, choices, rewards
        await pg.evaluate("() => window.__lyre.play('m1_ledger')")
        await pg.wait_for_timeout(700)
        layer = pg.locator("[data-story]")
        if await layer.count() == 0:
            fails.append("story layer did not mount")
        else:
            sid = await layer.first.get_attribute("data-story")
            if sid != "m1_ledger":
                fails.append(f"wrong scene open: {sid}")
            if await layer.locator("canvas").count() < 1:
                fails.append("scene is missing its backdrop canvas")

            met_before = await pg.evaluate("() => Object.keys(window.__lyre.state().story.met).length")

            # tap through until a choice appears or the scene ends
            saw_choice = False
            saw_portrait = False
            saw_name = False
            for _ in range(40):
                body = await pg.inner_text("body")
                if await layer.locator("canvas").count() >= 2:
                    saw_portrait = True
                if "苏芹" in body:
                    saw_name = True
                if "记下了" in body:
                    break
                btns = pg.locator("[data-story] button")
                n = await btns.count()
                choice = None
                for i in range(n):
                    t = (await btns.nth(i).inner_text()).strip()
                    if t and t not in ("回顾", "自动", "记下了") and len(t) > 3:
                        choice = btns.nth(i)
                        break
                if choice is not None:
                    saw_choice = True
                    if not await choice.is_enabled():
                        fails.append("every choice was locked — scene would soft-lock")
                        break
                    await choice.click()
                else:
                    await pg.mouse.click(207, 500)
                await pg.wait_for_timeout(260)

            if not saw_choice:
                fails.append("m1_ledger presented no choice")
            if not saw_portrait:
                fails.append("no character portrait was ever drawn")
            if not saw_name:
                fails.append("speaker name plate never appeared")
            body = await pg.inner_text("body")
            if "记下了" not in body:
                fails.append("scene never reached its closing card")

            met_after = await pg.evaluate("() => Object.keys(window.__lyre.state().story.met).length")
            if met_after <= met_before:
                fails.append("meeting a character did not register")

            # backlog holds what was said
            await pg.get_by_text("回顾").first.click()
            await pg.wait_for_timeout(400)
            body = await pg.inner_text("body")
            if "刚才说了什么" not in body:
                fails.append("backlog did not open")
            await pg.get_by_text("收起").first.click()
            await pg.wait_for_timeout(300)

            await pg.get_by_text("记下了").first.click()
            await pg.wait_for_timeout(600)
            if await pg.locator("[data-story]").count() != 0:
                fails.append("story layer did not close")

        st = await pg.evaluate(READ)
        notes["seen"] = st["story"]["seen"]
        notes["bond"] = st["story"]["bond"]
        if not st["story"]["seen"].get("m1_ledger"):
            fails.append("scene was not recorded as seen")

        # ---------- 6. affection moves, but the player never sees a number
        bond_before = await pg.evaluate("() => window.__lyre.state().story.bond.ch_su || 0")
        await pg.evaluate("() => window.__lyre.play('b_su_1')")
        await pg.wait_for_timeout(500)
        opened = await pg.locator("[data-story]").count()
        notes["b_su_1_opens_directly"] = opened > 0
        saw_beat = False
        beat_tier = None
        leaked = []
        if opened:
            # play it properly — the affection in b_su_1 hangs off a choice, so
            # a test that only taps the box would never move the number and
            # would then "prove" nothing about how the change is presented
            for _ in range(70):
                body = await pg.inner_text("body")
                if "好感" in body or re.search(r"(好感|亲密|羁绊)\s*[+\-＋－]?\s*\d", body):
                    leaked.append(body[:140])
                warm = await pg.locator("[data-warm]").count()
                if warm:
                    saw_beat = True
                    beat_tier = await pg.locator("[data-story]").first.get_attribute("data-warm")
                    dim = await pg.evaluate(
                        """() => {
                          const els = [...document.querySelectorAll('[data-warm] div')];
                          const o = els.map(e => parseFloat(getComputedStyle(e).opacity) || 0);
                          return Math.max(0, ...o.filter(x => x < 1));
                        }"""
                    )
                    notes["beat_dim"] = dim
                if "记下了" in body:
                    await pg.get_by_text("记下了").first.click()
                    break
                # a choice, if one is up — otherwise advance the line
                btns = pg.locator("[data-story] button")
                n = await btns.count()
                picked = False
                for i in range(n):
                    t = (await btns.nth(i).inner_text()).strip()
                    if t and t not in ("回顾", "自动", "记下了") and len(t) > 3:
                        await btns.nth(i).click()
                        picked = True
                        break
                if not picked:
                    await pg.mouse.click(207, 500)
                await pg.wait_for_timeout(200)
            await pg.wait_for_timeout(400)

        bond_after = await pg.evaluate("() => window.__lyre.state().story.bond.ch_su || 0")
        notes["bond_moved"] = [bond_before, bond_after]
        notes["warm_beat_shown"] = saw_beat
        notes["warm_beat_kind"] = beat_tier
        if bond_after <= bond_before:
            fails.append("affection did not move behind the scenes")
        if not saw_beat:
            fails.append("affection changed with no warmth beat on screen")
        if saw_beat and not notes.get("beat_dim"):
            fails.append("warmth beat did not dim the screen")
        if leaked:
            fails.append(f"affection leaked into the story layer: {leaked[0]}")

        # a bond trigger must be blocked while the tier is too low
        blocked = await pg.evaluate(
            """() => {
              const w = window.__lyre.why('collect').concat(window.__lyre.why('open'));
              return w.filter(x => x.line === 'bond' && !x.eligible).map(x => x.reason);
            }"""
        )
        notes["bond_blocked_reasons"] = list(set(blocked))
        if not blocked:
            fails.append("no bond trigger is gated — affection is not acting as a lock")
        if any(re.search(r"\d", r or "") and "好感" in (r or "") for r in blocked):
            fails.append(f"a gate reason exposes the hidden number: {blocked}")

        # ---------- 7. the cast page keeps it hidden too
        await pg.goto(BASE + "?skipIntro=1&tab=journal")
        await pg.wait_for_timeout(1200)
        await pg.get_by_text("人物", exact=True).first.click()
        await pg.wait_for_timeout(700)
        body = await pg.inner_text("body")
        if "好感" in body:
            fails.append("cast page still prints an affection readout")
        if re.search(r"\d+\s*/\s*\d+", body):
            fails.append("cast page shows a progress fraction")
        if "苏芹" not in body:
            fails.append("met character absent from the cast page")
        if "没打过照面" not in body:
            fails.append("unmet roster hint missing")
        # ...and says something human in its place
        if "只记事" not in body:
            fails.append("cast page lost its no-numbers note")
        bars = await pg.evaluate(
            """() => document.querySelectorAll('[data-bond-bar]').length"""
        )
        if bars:
            fails.append("an affection bar is still rendered")

        # ---------- 8. a scene the player walked out of is not lost
        # Closing the app mid-dialogue used to burn the beat: `seen` and the
        # trigger's cooldown are written when the scene opens, so a once-only
        # scene would never be offered again. The store now remembers what was
        # on screen and re-queues it on the next boot.
        await pg.evaluate("() => window.__lyre.play('b_su_1')")
        await pg.wait_for_timeout(600)
        mid = await pg.locator("[data-story]").first.get_attribute("data-story")
        notes["interrupted_scene"] = mid
        if mid != "b_su_1":
            fails.append(f"could not stage a scene to interrupt (got {mid})")
        saved = await pg.evaluate(
            "() => JSON.parse(localStorage.getItem('wandering-lyre-save-v1')).story.playing"
        )
        notes["playing_persisted"] = saved
        if saved != "b_su_1":
            fails.append(f"the live scene was not written to the save: {saved}")
        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1600)
        again = await pg.locator("[data-story]").count()
        resumed = (
            await pg.locator("[data-story]").first.get_attribute("data-story") if again else None
        )
        notes["resumed_scene"] = resumed
        if resumed != "b_su_1":
            fails.append(f"an interrupted scene was dropped instead of replayed: {resumed}")
        await clear_story(pg)
        left = await pg.evaluate(
            "() => JSON.parse(localStorage.getItem('wandering-lyre-save-v1')).story.playing"
        )
        if left:
            fails.append(f"a finished scene is still marked as playing: {left}")

        # ---------- 9. odd figures show up at the stall on their own
        vis = await pg.evaluate(
            """() => {
              const out = {};
              const t = Date.now();
              for (let i = 0; i < 220; i++) {
                const g = window.__lyre.guests(t + i * 13 * 60 * 1000) || [];
                g.forEach(x => { out[x.id] = (out[x.id] || 0) + 1; });
              }
              return out;
            }"""
        )
        notes["visitors_over_2_days"] = vis
        if not vis:
            fails.append("no special visitor ever appears at the stall")

        await b.close()

    return report("STORY SMOKE", fails, errs, notes)


sys.exit(asyncio.run(main()))
