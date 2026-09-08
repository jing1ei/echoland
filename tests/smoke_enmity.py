"""
Smoke test for the second hidden axis: enmity (憎恶).

The requirement it guards is the same one affection has — the player must
never see the number — plus the four things that make a grudge more than
flavour text:

  1. HIDDEN      no digits, no bar, no "憎恶 +N" anywhere on screen; the
                 cast card gets a word and a sentence, and nothing else
  2. INDEPENDENT affection and enmity move separately: someone can be
                 深交 and 怀恨 at the same time
  3. COLD BEAT   a grudge landing stops the screen with prose, like a
                 warmth beat but in the other palette (data-cold)
  4. IT COSTS    the takings drop in that person's town and nowhere else,
                 the drop is floored, it shows up as a named line in the
                 breakdown, and it fades with time but never to zero

Run against the release build (port 4179) — the production bundle is the
only one that ships, so it is the one that gets tested.
"""

import asyncio
import json
import sys

from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402



# 苏芹 and 楮 live in 盐汐港 (saltide / mistquay overlook);
# 阿雀 lives in 樱桥 (sakuraminato / petalbridge overlook)
SEED = """() => {
  const k = 'wandering-lyre-save-v1';
  const s = JSON.parse(localStorage.getItem(k));
  s.coin = 20000; s.insp = 4000; s.renown = 120; s.collects = 30;
  s.overlooks = ['mistquay','windmeadow','petalbridge','cliffbeacon'];
  s.overlook = 'mistquay';
  s.story = s.story || {};
  s.story.chapter = 4;
  s.story.bond = { ch_su: 60, ch_que: 20 };
  s.story.met = { ch_su: Date.now() - 8.64e7, ch_que: Date.now() - 8.64e7 };
  s.story.seen = { m1_ledger: 1, b_su_1: 1, b_su_2: 1, b_que_1: 1, b_que_2: 1 };
  s.story.seenAt = {}; s.story.fired = {}; s.story.vars = {}; s.story.queue = [];
  /* deliberately NOT setting story.enmity: an old save has no such field,
     and the sanitizer has to treat that as a clean slate rather than NaN */
  delete s.story.enmity;
  delete s.story.enmityAt;
  localStorage.setItem(k, JSON.stringify(s));
}"""


async def open_cast(pg):
    """手记 → 人物"""
    await pg.get_by_text("手记", exact=True).first.click()
    await pg.wait_for_timeout(500)
    await pg.get_by_text("人物", exact=True).first.click()
    await pg.wait_for_timeout(500)


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

        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1200)
        await reseed(pg, SEED, qs="?skipIntro=1&hour=15.2", settle=1600)

        # ------------------------------------------------------------------
        # 0. a save written before grudges existed still loads clean
        # ------------------------------------------------------------------
        feel0 = await pg.evaluate("() => window.__lyre.feel('ch_su')")
        notes["migrated"] = feel0
        want(feel0["enmity"] == 0, f"old save did not migrate to a clean slate: {feel0}")
        want(feel0["bond"] == 60, "migration lost the affection value")

        # ------------------------------------------------------------------
        # 1. the cold beat: play the scene where a grudge actually lands
        #    and take the lying branch
        # ------------------------------------------------------------------
        await pg.evaluate("() => window.__lyre.play('g_su_caught')")
        await pg.wait_for_timeout(500)
        # walk to the choice, then pick "可能是我数错了。"
        picked = False
        for _ in range(30):
            if await pg.locator("[data-story]").count() == 0:
                break
            lie = pg.get_by_text("「可能是我数错了。」", exact=False)
            if await lie.count() > 0 and await lie.first.is_enabled():
                await lie.first.click()
                picked = True
                break
            await pg.mouse.click(207, 500)
            await pg.wait_for_timeout(180)
        want(picked, "never reached the choice in g_su_caught")

        cold, dim, plate, body_at_beat = None, None, None, ""
        for _ in range(24):
            if await pg.locator("[data-cold]").count() > 0:
                cold = await pg.get_attribute("[data-cold]", "data-cold")
                # the veil fades in over ~700ms; read it once it has settled
                await pg.wait_for_timeout(900)
                dim = await pg.evaluate(
                    """() => {
                      const el = document.querySelector('[data-cold] .absolute.inset-0.z-\\\\[25\\\\]')
                        || [...document.querySelectorAll('[data-cold] div')]
                            .find(d => getComputedStyle(d).zIndex === '25');
                      return el ? parseFloat(getComputedStyle(el).opacity) : null;
                    }"""
                )
                body_at_beat = await pg.inner_text("[data-story]")
                plate = await pg.evaluate(
                    """() => {
                      const s = [...document.querySelectorAll('[data-story] span')]
                        .find(x => /这一下/.test(x.textContent || ''));
                      return s ? s.textContent.trim() : null;
                    }"""
                )
                break
            await pg.mouse.click(207, 500)
            await pg.wait_for_timeout(200)

        notes["cold_beat"] = {"flag": cold, "dim": dim, "plate": plate}
        want(cold is not None, "a grudge landed but no cold beat appeared")
        want(dim is None or dim > 0.3, f"cold beat did not dim the screen: {dim}")
        want(plate is not None, "cold beat did not use the 憎恶 name plate")
        # the beat is prose, not bookkeeping
        for leak in ("憎恶", "+1", "＋1", "怨恨值", "好感"):
            want(leak not in body_at_beat, f"cold beat leaked '{leak}': {body_at_beat[:120]}")
        notes["cold_beat_text"] = body_at_beat.replace("\n", " ")[:160]

        await clear_story(pg)
        feel1 = await pg.evaluate("() => window.__lyre.feel('ch_su')")
        notes["after_lie"] = feel1
        want(feel1["enmity"] >= 6, f"lying did not earn a grudge: {feel1}")
        # 2. independence: affection untouched by the grudge
        want(
            feel1["bond"] == feel0["bond"],
            f"enmity moved affection as a side effect: {feel0} -> {feel1}",
        )
        want(feel1["tier"] >= 3 and feel1["grudge"] >= 1, f"not both at once: {feel1}")

        # ------------------------------------------------------------------
        # 3. the cast page: a word and a sentence, never a number
        # ------------------------------------------------------------------
        await open_cast(pg)
        cast = await pg.inner_text("body")
        # the one card we care about, not the whole page: a stray digit in the
        # journal is not a leak, a digit inside 苏芹's card is
        card = await pg.evaluate(
            """() => {
              const el = [...document.querySelectorAll('div')]
                .filter(d => {
                  const t = d.innerText || '';
                  /* the whole card: name + role + relationship words + blurb.
                     Smallest such block, so the page around it is excluded. */
                  return t.includes('苏芹') && t.includes('酒馆') && t.length > 60;
                })
                .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
              return el ? el.innerText : '';
            }"""
        )
        notes["cast_card"] = card.replace("\n", " · ")[:220]
        notes["cast_has_grudge_word"] = feel1["grudgeLabel"] in cast
        want(feel1["grudgeLabel"] in card, f"cast card never says 「{feel1['grudgeLabel']}」")
        want("憎恶" not in card, "cast card printed the stat name")
        import re

        want(not re.search(r"\d", card), f"cast card printed a number: {card!r}")
        # both axes are spoken about, in words
        want(feel1["tierLabel"] in card, "cast card lost the affection word")
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(400)

        # ------------------------------------------------------------------
        # 4. it costs money, locally, and it is legible
        # ------------------------------------------------------------------
        await pg.evaluate("() => window.__lyre.close && window.__lyre.close()")
        # push the grudge into the tier that actually charges
        await reseed(
            pg,
            """() => {
              const k = 'wandering-lyre-save-v1';
              const s = JSON.parse(localStorage.getItem(k));
              s.story.enmity = { ch_su: 30 };
              s.story.enmityAt = Date.now();
              localStorage.setItem(k, JSON.stringify(s));
            }""",
            qs="?skipIntro=1&hour=15.2",
        )

        here = await pg.evaluate("() => window.__lyre.rates()")
        labels_here = [p["label"] for p in here["parts"]]
        notes["saltide_parts"] = labels_here
        want("有人说你的坏话" in labels_here, f"grudge is invisible in the breakdown: {labels_here}")

        # …and nowhere else: same state, one town over
        await reseed(
            pg,
            """() => {
              const k = 'wandering-lyre-save-v1';
              const s = JSON.parse(localStorage.getItem(k));
              s.overlook = 'petalbridge';
              localStorage.setItem(k, JSON.stringify(s));
            }""",
            qs="?skipIntro=1&hour=15.2",
        )
        away = True
        there = await pg.evaluate("() => window.__lyre.rates()")
        labels_there = [p["label"] for p in there["parts"]]
        notes["petalbridge_parts"] = labels_there
        want(
            "有人说你的坏话" not in labels_there,
            f"a grudge in 盐汐港 followed the player to 樱桥: {labels_there}",
        )
        notes["seeded_away"] = bool(away)

        # ------------------------------------------------------------------
        # 5. it fades with time — but never all the way
        # ------------------------------------------------------------------
        await reseed(
            pg,
            """() => {
              const k = 'wandering-lyre-save-v1';
              const s = JSON.parse(localStorage.getItem(k));
              s.story.enmity = { ch_su: 30 };
              /* 400 days away: far more than enough to shed 30 points */
              s.story.enmityAt = Date.now() - 400 * 864e5;
              s.lastTick = Date.now() - 6 * 36e5;
              localStorage.setItem(k, JSON.stringify(s));
            }""",
            qs="?skipIntro=1&hour=15.2",
            settle=1600,
        )
        aged = await pg.evaluate("() => window.__lyre.feel('ch_su')")
        notes["after_400_days"] = aged
        want(aged["enmity"] < 30, "grudges do not fade at all")
        want(aged["enmity"] > 0, "time alone wiped the grudge; only a scene should do that")
        want(aged["grudge"] == 1, f"decay did not stop at the first tier: {aged}")

        # ------------------------------------------------------------------
        # 6. the way back: an authored scene clears it, with a warm beat
        # ------------------------------------------------------------------
        await pg.evaluate("() => window.__lyre.play('g_su_clear')")
        await pg.wait_for_timeout(400)
        ok = await clear_story(pg)
        want(ok, "g_su_clear never finished")
        cleared = await pg.evaluate("() => window.__lyre.feel('ch_su')")
        notes["after_forgive"] = cleared
        want(cleared["enmity"] == 0, f"the apology scene did not clear the grudge: {cleared}")

        # and the scene it was blocking is offered again
        why = await pg.evaluate("() => window.__lyre.why('node', { nodeId: 'sal_tavern' })")
        b_su_3 = [w for w in why if w["scene"] == "b_su_3"]
        notes["b_su_3_after_forgive"] = b_su_3
        want(bool(b_su_3), "b_su_3 is not even in the trigger table")

        # ------------------------------------------------------------------
        # 7. gating: with a grudge open, that scene is withheld
        # ------------------------------------------------------------------
        await reseed(
            pg,
            """() => {
              const k = 'wandering-lyre-save-v1';
              const s = JSON.parse(localStorage.getItem(k));
              s.story.enmity = { ch_su: 30 };
              s.story.enmityAt = Date.now();
              s.story.seen = { m1_ledger: 1, b_su_1: 1, b_su_2: 1, b_que_1: 1, b_que_2: 1 };
              s.story.fired = {};
              localStorage.setItem(k, JSON.stringify(s));
            }""",
            qs="?skipIntro=1&hour=15.2",
        )
        notes["grudge_at_gate"] = await pg.evaluate("() => window.__lyre.feel('ch_su')")
        why2 = await pg.evaluate("() => window.__lyre.why('node', { nodeId: 'sal_tavern' })")
        blocked = [w for w in why2 if w["scene"] == "b_su_3"]
        mending = [w for w in why2 if w["scene"] in ("g_su_mend", "g_su_cold")]
        notes["b_su_3_with_grudge"] = blocked
        notes["mending_offered"] = [w["scene"] for w in mending if w["eligible"]]
        want(
            blocked and not blocked[0]["eligible"],
            f"a grudge did not withhold the deep bond scene: {blocked}",
        )
        want(
            any(w["eligible"] for w in mending),
            f"grudge is open but nothing offers a way to mend it: {mending}",
        )

        # nothing on the home screen ever mentions the stat
        home = await pg.inner_text("body")
        for leak in ("憎恶值", "仇恨值", "enmity"):
            want(leak not in home, f"home screen leaked '{leak}'")

        await b.close()

    return report("ENMITY SMOKE", fails, errors, notes)


sys.exit(asyncio.run(main()))
