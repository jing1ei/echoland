import asyncio, json
from playwright.async_api import async_playwright

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import BASE, GM_BASE, KEY, READ, ROOT, clear_story, report, reseed  # noqa: E402



SEED = """() => {
  const k = 'wandering-lyre-save-v1';
  const s = JSON.parse(localStorage.getItem(k));
  s.coin = 24000; s.insp = 900; s.renown = 180; s.leisure = 30;
  s.lastTick = Date.now() - 5.5*3600*1000;
  s.lastCollect = s.lastTick;
  s.overlooks = ['mistquay','windmeadow','petalbridge','cliffbeacon','rainlane','emberkiln','auroralake','cloudtea','starfalldunes'];
  s.instruments = ['lute_worn','flute_silver','accordion'];
  s.songs = ['song_ferry','song_tide','song_wheat','song_letter'];
  s.repertoire = ['song_ferry','song_tide'];
  s.upgrades = ['up_coffer','up_dice'];
  s.items = {it_shell:3};
  localStorage.setItem(k, JSON.stringify(s));
}"""



# The story layer can now appear on top of anything (app open, a collect, a
# node visit). Every interaction step therefore has to be story-aware: play
# whatever is on screen to its end and dismiss it before touching the game.
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 414, "height": 896})
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(900)
        await reseed(pg, SEED, settle=1500)

        # ---- collect
        before = await pg.evaluate(READ)
        await pg.get_by_text("收摊结账").first.click()
        await pg.wait_for_timeout(900)
        body = await pg.inner_text("body")
        if "今天的收成" not in body:
            fails.append("collect sheet did not open")
        after = await pg.evaluate(READ)
        if not (after["coin"] > before["coin"] + 100):
            fails.append(f"collect did not pay out: {before['coin']} -> {after['coin']}")
        if after["pending"]["coin"] > 1:
            fails.append("pending not cleared after collect")

        # ---- decision, if one is queued
        await pg.get_by_text("继续放着").first.click()
        await pg.wait_for_timeout(700)
        await clear_story(pg)
        body = await pg.inner_text("body")
        if "怎么办" in body or "你决定" in body:
            btns = pg.locator("button")
            n = await btns.count()
            for i in range(n):
                t = (await btns.nth(i).inner_text()).strip()
                if t and len(t) > 3 and "关掉" not in t:
                    await btns.nth(i).click()
                    break
            await pg.wait_for_timeout(600)

        # ---- town: shrine visit spends leisure and pays fame
        #      Fame is regional and wordless now (content/fame): the visit
        #      result may say 名气, never 名声, and never a number for it.
        await pg.goto(BASE + "?skipIntro=1&tab=town")
        await pg.wait_for_timeout(1400)
        await clear_story(pg)
        pre = await pg.evaluate(READ)
        await pg.get_by_text("咸风小祠").first.click()
        await pg.wait_for_timeout(500)
        await pg.get_by_text("走过去").first.click()
        await pg.wait_for_timeout(700)
        await clear_story(pg)
        post = await pg.evaluate(READ)
        if post["leisure"] >= pre["leisure"]:
            fails.append("shrine visit did not spend leisure")
        if post["renown"] <= pre["renown"]:
            fails.append("shrine visit paid no travelled name")
        if sum(post.get("fame", {}).values()) <= sum(pre.get("fame", {}).values()):
            fails.append("shrine visit paid no local fame")
        if len(post["journal"]) <= len(pre["journal"]):
            fails.append("visit was not written to the journal")
        body = await pg.inner_text("body")
        if "名气" not in body:
            fails.append("result panel shows no gains")
        if "名声" in body:
            fails.append("the old global renown word is still on screen")
        await pg.get_by_text("回到地图").first.click()
        await pg.wait_for_timeout(400)

        # ---- dice minigame
        await pg.get_by_text("舱底骰局").first.click()
        await pg.wait_for_timeout(500)
        await pg.get_by_text("入局").first.click()
        await pg.wait_for_timeout(900)
        await clear_story(pg)
        body = await pg.inner_text("body")
        if "这一把押多少" not in body:
            fails.append("dice minigame did not open")
        else:
            c0 = (await pg.evaluate(READ))["coin"]
            await pg.get_by_text("掷", exact=True).first.click()
            await pg.wait_for_timeout(1800)
            c1 = (await pg.evaluate(READ))["coin"]
            if c0 == c1:
                fails.append("dice roll did not move the purse")
            body = await pg.inner_text("body")
            if "净" not in body and "平手" not in body:
                fails.append("dice result message missing")
            await pg.get_by_text("收手").first.click()
            await pg.wait_for_timeout(400)

        # ---- shop purchase
        await pg.goto(BASE + "?skipIntro=1&tab=town")
        await pg.wait_for_timeout(1300)
        await clear_story(pg)
        await pg.get_by_text("潮市摊列").first.click()
        await pg.wait_for_timeout(600)
        c0 = (await pg.evaluate(READ))["coin"]
        pill = pg.locator("button", has_text="枚").last
        try:
            await pill.click()
            await pg.wait_for_timeout(600)
            c1 = (await pg.evaluate(READ))["coin"]
            if c1 >= c0:
                fails.append("purchase did not deduct coin")
        except Exception as e:
            fails.append(f"shop click failed: {e}")

        # ---- strategy switch
        await pg.goto(BASE + "?skipIntro=1")
        await pg.wait_for_timeout(1300)
        await clear_story(pg)
        await pg.get_by_text("制定策略").first.click()
        await pg.wait_for_timeout(600)
        await pg.get_by_text("静默练习").first.click()
        await pg.wait_for_timeout(500)
        st = await pg.evaluate(READ)
        if st["stance"] != "quiet":
            fails.append("stance did not change")

        # ---- widget cycle
        await pg.goto(BASE + "?widget=1")
        await pg.wait_for_timeout(1800)
        o0 = (await pg.evaluate(READ))["overlook"]
        await pg.mouse.click(200, 400)
        await pg.wait_for_timeout(600)
        await pg.get_by_label("下一处观景台").click()
        await pg.wait_for_timeout(700)
        o1 = (await pg.evaluate(READ))["overlook"]
        if o0 == o1:
            fails.append("widget did not change overlook")

        # ---- save survives a version bump (migration, not a wipe)
        await reseed(pg, """() => {
          const k = 'wandering-lyre-save-v1';
          const s = JSON.parse(localStorage.getItem(k));
          s.v = -1; s.songs.push('song_bogus'); s.overlook = 'nowhere';
          localStorage.setItem(k, JSON.stringify(s));
        }""", settle=1200)
        mig = await pg.evaluate(READ)
        if mig["coin"] < 1000:
            fails.append("save was wiped instead of migrated")
        if "song_bogus" in mig["songs"]:
            fails.append("invalid content id survived sanitise")
        if mig["overlook"] == "nowhere":
            fails.append("invalid overlook survived sanitise")

        await b.close()

    return report("SMOKE", fails, errs)


sys.exit(asyncio.run(main()))
