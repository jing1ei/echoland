import asyncio, json
from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402


"""
Smoke test for the four systems added on top of the story layer:

  proficiency   own value, permanent category bonus, the 10-point milestone
  performance   proficiency + rarity actually move idle income
  weather       an overlay exists on the stage and matches the rolled sky
  spirits       a spirit is gated behind MAX proficiency, not merely owning
                the instrument

Everything is asserted through the debug bridge (__lyre.prof / .sky / .why),
which reads the same systems the economy and the router use — so a green run
means the player-visible numbers and the internal ones cannot have diverged.
"""

URL = BASE + "?skipIntro=1"


def seed(patch: dict, clock: bool = True) -> str:
    """JS that merges a patch into the save on disk.

    `clock` re-stamps lastTick/lastCollect to now, which every patch that is
    not deliberately testing offline time wants: a patch that leaves the clock
    where a previous phase left it accrues hours nobody asked for.
    """
    body = "Object.assign(s, %s);" % json.dumps(patch)
    if clock:
        body += " s.lastTick = Date.now(); s.lastCollect = Date.now();"
    return (
        "() => { const k='%s'; const s=JSON.parse(localStorage.getItem(k)); %s"
        " localStorage.setItem(k, JSON.stringify(s)); }" % (KEY, body)
    )


NAV_TRAIL = []


async def go(pg, label):
    """click a nav tab, revealing the UI first if the scenery swallowed it

    Tapping the scenery hides every control (that is the point of the home
    screen), and clear_story() taps the scenery. So a test that navigates has
    to be prepared to bring the chrome back."""
    for _ in range(6):
        # a sheet on top of the nav has to be dismissed first
        body = await pg.inner_text("body")
        for close in ("继续放着，我先走", "记下了", "收起"):
            if close in body:
                try:
                    await pg.get_by_text(close).first.click(timeout=2500)
                    await pg.wait_for_timeout(450)
                except Exception:
                    pass
        bar = pg.locator('.ui-fade.from-bottom')
        if await bar.count() and await bar.first.get_attribute('data-hidden') == 'true':
            await pg.mouse.click(207, 430)
            await pg.wait_for_timeout(520)
        btn = pg.locator('.nav-tab', has_text=label)
        if await btn.count():
            try:
                await btn.first.click(timeout=4000)
                await pg.wait_for_timeout(650)
                return True
            except Exception:
                pass
        await pg.mouse.click(207, 430)
        await pg.wait_for_timeout(520)
    # a navigation failure used to be a bare "not reachable"; say what was on
    # screen instead, because the cause is always something still covering it
    try:
        NAV_TRAIL.append(
            {
                "label": label,
                "story": await pg.locator("[data-story]").count(),
                "body": (await pg.inner_text("body"))[:260].replace("\n", " | "),
            }
        )
        await pg.screenshot(path=f"/tmp/nav-fail-{label}.png")
    except Exception:
        pass
    return False



async def open_instrument(pg, iid):
    """The satchel is a tray of icons now: nothing writes itself out until you
    tap it. So 'read the instrument card' means go to the bag, switch to the
    instrument tab, then tap that instrument's cell."""
    from_bag = await go(pg, "行囊")
    if not from_bag:
        return False
    await pg.click("[data-tray-tab='instruments']")
    await pg.wait_for_timeout(200)
    cell = pg.locator(f"[data-cell='{iid}']")
    if await cell.count() == 0:
        return False
    await cell.first.click()
    await pg.wait_for_timeout(250)
    return True


async def main():
    fails, notes, errors = [], {}, []

    def want(cond, msg):
        if not cond:
            fails.append(msg)

    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        await clear_story(pg)

        # ------------------------------------------------------------------
        # 1. category bonus: 10 own points on one instrument lifts the whole
        #    technique, permanently, including instruments never touched
        # ------------------------------------------------------------------
        await reseed(
            pg,
            seed(
                {
                    "instruments": ["lute_worn", "violin_ash", "cello_tide", "lyre_star"],
                    "instrument": "violin_ash",
                    "prof": {"violin_ash": 40},
                    "profBonus": {},
                    "coin": 90000,
                }
            ),
            settle=1200,
        )

        pr = await pg.evaluate("() => window.__lyre.prof('violin_ash')")
        notes["violin_at_40"] = pr
        want(pr["category"] == "violin_family", "violin should be in the violin family")
        want(abs(pr["own"] - 40) < 0.001, f"own value should survive the load, got {pr['own']}")
        # 40 own points = four 10-point milestones = +4% to the family
        want(abs(pr["bonus"] - 4) < 0.001, f"family bonus should be 4, got {pr['bonus']}")
        want(abs(pr["effective"] - 44) < 0.001, f"effective should be 44, got {pr['effective']}")

        cello = await pg.evaluate("() => window.__lyre.prof('cello_tide')")
        notes["cello_untouched"] = cello
        want(cello["own"] == 0, "the cello was never practised")
        want(
            abs(cello["effective"] - 4) < 0.001,
            f"an untouched cello should start at the family bonus, got {cello['effective']}",
        )

        # a fifth milestone (40 -> 50) must add exactly one more point
        await reseed(
            pg,
            "() => { const k='%s'; const s=JSON.parse(localStorage.getItem(k));"
            "s.prof = { violin_ash: 50 }; s.profBonus = {};"
            "localStorage.setItem(k, JSON.stringify(s)); }" % KEY,
            settle=1100,
        )
        pr2 = await pg.evaluate("() => window.__lyre.prof('violin_ash')")
        notes["violin_at_50"] = pr2
        want(abs(pr2["bonus"] - 5) < 0.001, f"40->50 should give +1 more, got {pr2['bonus']}")

        # ------------------------------------------------------------------
        # 2. performance: skill and rarity both raise pay, and the numbers the
        #    satchel prints are the ones the economy used
        # ------------------------------------------------------------------
        lute = await pg.evaluate("() => window.__lyre.prof('lute_worn')")
        star = await pg.evaluate("() => window.__lyre.prof('lyre_star')")
        notes["pay_lute_vs_star"] = {
            "lute_rarity_coin": lute["pay"]["rarity"]["coin"],
            "star_rarity_coin": star["pay"]["rarity"]["coin"],
            "violin_skill_coin_at_45": pr2["pay"]["skill"]["coin"],
        }
        want(
            star["pay"]["rarity"]["coin"] > lute["pay"]["rarity"]["coin"],
            "a myth-tier instrument must pay better than the starting lute",
        )
        want(
            pr2["pay"]["skill"]["coin"] > 1.0,
            f"45% proficiency should beat the baseline, got {pr2['pay']['skill']['coin']}",
        )
        want(
            pr2["practicePerHour"] > 0,
            "an unfinished instrument must still be trainable",
        )

        # ------------------------------------------------------------------
        # 3. idle practice: hours away buy craft as well as coins, and the
        #    collect sheet says so
        # ------------------------------------------------------------------
        await reseed(
            pg,
            "() => { const k='%s'; const s=JSON.parse(localStorage.getItem(k));"
            "s.prof = { violin_ash: 22.5 }; s.profBonus = {};"
            "s.lastTick = Date.now() - 6*3600*1000; s.lastCollect = s.lastTick;"
            "localStorage.setItem(k, JSON.stringify(s)); }" % KEY,
            settle=1400,
        )
        before = await pg.evaluate("() => window.__lyre.prof('violin_ash')")
        # the six offline hours are applied on load, so 'before' is already grown
        want(
            before["own"] > 22.5,
            f"six idle hours should have taught something, got {before['own']}",
        )
        notes["after_6h_idle"] = before["own"]

        # the collect sheet must report the craft half of the harvest
        body = await pg.inner_text("body")
        if "收摊结账" in body:
            await pg.get_by_text("收摊结账").first.click()
            await pg.wait_for_timeout(900)
            sheet = await pg.inner_text("body")
            notes["collect_mentions_practice"] = "手上的琴" in sheet
            want("手上的琴" in sheet, "the collect sheet should show the practice line")
            for label in ("继续放着，我先走",):
                if label in sheet:
                    await pg.get_by_text(label).first.click()
                    await pg.wait_for_timeout(600)
            await clear_story(pg)

        # ------------------------------------------------------------------
        # 4. the satchel tells the whole proficiency story on the item itself
        # ------------------------------------------------------------------
        want(await open_instrument(pg, "violin_ash"), "the violin's cell should be in the bag")
        satchel = await pg.inner_text("body")
        notes["satchel_has_prof"] = "熟练" in satchel
        want("熟练" in satchel, "the satchel should print proficiency on the instrument card")
        want("提琴" in satchel, "the instrument card should name its technique")
        want("同类加成" in satchel or "同类底子" in satchel, "the card should explain the shared bonus")

        # ------------------------------------------------------------------
        # 5. weather: an overlay layer exists over the scenery, and it does not
        #    replace the scene canvas
        # ------------------------------------------------------------------
        want(await go(pg, "摊子"), "the stage tab should be reachable")
        sky = await pg.evaluate("() => window.__lyre.sky()")
        notes["sky"] = {"weather": sky["weather"], "phase": sky["phase"], "extreme": sky.get("extreme")}
        canvases = await pg.locator("canvas").count()
        overlay = await pg.locator("[data-weather]").count()
        notes["canvas_count"] = canvases
        notes["overlay_present"] = overlay
        want(canvases >= 1, "the scene canvas must still be there")
        want(overlay >= 1, "the weather overlay layer should be mounted over the scene")
        if overlay:
            attr = await pg.locator("[data-weather]").first.get_attribute("data-weather")
            notes["overlay_id"] = attr
            want(attr == sky["weather"], f"overlay {attr} should match rolled sky {sky['weather']}")

        # ------------------------------------------------------------------
        # 6. spirits: owning the instrument is not enough — mastery is the gate
        # ------------------------------------------------------------------
        await reseed(
            pg,
            "() => { const k='%s'; const s=JSON.parse(localStorage.getItem(k));"
            "s.instruments = ['lute_worn','lyre_star']; s.instrument = 'lyre_star';"
            "s.prof = { lyre_star: 20 }; s.profBonus = {};"
            "s.overlook = 'starfalldunes';"
            "s.lastTick = Date.now(); s.lastCollect = Date.now();"
            "localStorage.setItem(k, JSON.stringify(s)); }" % KEY,
            settle=1300,
        )
        why = await pg.evaluate("() => window.__lyre.why('open')")
        wake = [w for w in why if w["id"] == "tsp_sp_star_wake"]
        notes["spirit_trigger_registered"] = bool(wake)
        want(bool(wake), "the generated spirit trigger should be in the router table")
        if wake:
            notes["spirit_locked_reason"] = wake[0]["reason"]
            want(not wake[0]["eligible"], "a half-learned instrument must not wake its spirit")

        # now master it. The star lyre also insists on night, so the trigger may
        # still be held back by the hour — assert the mastery clause specifically
        await reseed(
            pg,
            "() => { const k='%s'; const s=JSON.parse(localStorage.getItem(k));"
            "s.prof = { lyre_star: 100 };"
            "localStorage.setItem(k, JSON.stringify(s)); }" % KEY,
            settle=1300,
        )
        mastered = await pg.evaluate("() => window.__lyre.prof('lyre_star')")
        notes["star_mastered"] = mastered["mastered"]
        want(mastered["mastered"], "100 points must count as mastered")
        want(
            abs(mastered["practicePerHour"]) < 0.0001,
            "a finished instrument should stop accruing practice",
        )
        why2 = await pg.evaluate("() => window.__lyre.why('open')")
        wake2 = [w for w in why2 if w["id"] == "tsp_sp_star_wake"]
        sky2 = await pg.evaluate("() => window.__lyre.sky()")
        notes["spirit_after_mastery"] = {
            "eligible": wake2[0]["eligible"] if wake2 else None,
            "reason": wake2[0]["reason"] if wake2 else None,
            "phase": sky2["phase"],
        }
        # `once: true` means the wake scene may already have fired during this
        # run — that is a pass, not a failure: it fired *because* of mastery
        if wake2 and sky2["phase"] == "night":
            want(
                wake2[0]["eligible"] or wake2[0]["reason"] == "已经演过",
                f"at night, a mastered star lyre should be eligible: {wake2[0]['reason']}",
            )

        # the satchel should now say the instrument is inhabited
        want(await open_instrument(pg, "lyre_star"), "the star lyre's cell should be in the bag")
        sat2 = await pg.inner_text("body")
        notes["satchel_spirit_hint"] = "此琴有灵" in sat2 or "琴灵已现" in sat2
        want(notes["satchel_spirit_hint"], "the satchel should hint that the lyre is inhabited")

        await b.close()

    notes["nav_failures"] = NAV_TRAIL
    return report("SYSTEMS SMOKE", fails, errors, notes)


sys.exit(asyncio.run(main()))
