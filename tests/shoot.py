#!/usr/bin/env python3
"""
Screenshot tool — for looking at a screen without a phone in your hand.

    npm run build && npx vite preview --port 4179 &
    python3 tests/shoot.py stage bag explore journal

Writes shots/<name>.png at phone size, with a save seeded rich enough that
every screen has something on it. Replaces the pile of one-off shoot_*.py
scripts that each hardcoded one afternoon's layout.
"""

import asyncio
import os
import sys

from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import KEY, ROOT, clear_story, preview, reseed  # noqa: E402

OUT = os.path.join(ROOT, 'shots')

SEED = """() => {
  const k = '%s';
  const s = JSON.parse(localStorage.getItem(k)) || {};
  s.coin = 42000; s.insp = 900; s.leisure = 40; s.renown = 210;
  s.fame = { saltide: 120, windmeadow: 40 };
  s.overlooks = ['mistquay','windmeadow','petalbridge','cliffbeacon','rainlane'];
  s.maps = ['saltide','millvale','sakuramachi'];
  s.instruments = ['lute_worn','flute_silver','accordion'];
  s.songs = ['song_ferry','song_tide','song_wheat','song_letter'];
  s.repertoire = ['song_ferry','song_tide'];
  s.upgrades = ['up_coffer','up_dice','up_umbrella'];
  s.items = { it_shell: 3, it_button: 1, it_wheat: 12, it_rosin: 2 };
  s.scores = ['sc_1_1','sc_1_2','sc_2_1'];
  s.lastTick = Date.now() - 5.5*3600*1000;
  s.lastCollect = s.lastTick;
  s.seenIntro = true;
  localStorage.setItem(k, JSON.stringify(s));
}""" % KEY

# nav label per screen name; stage is where you land
SCREENS = {
    'stage': None,
    'explore': '探索',
    'journal': '手记',
    'bag': '行囊',
}


async def run(url: str, names: list[str]):
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 414, 'height': 896}, device_scale_factor=2)
        pg = await ctx.new_page()
        await pg.goto(url + '?skipIntro=1')
        await pg.wait_for_timeout(800)
        await reseed(pg, SEED, url=url, settle=1400)

        for name in names:
            label = SCREENS.get(name, name)
            if label:
                await pg.get_by_text(label, exact=True).last.click()
                await pg.wait_for_timeout(700)
                await clear_story(pg)
            path = os.path.join(OUT, f'{name}.png')
            await pg.screenshot(path=path)
            print('wrote', os.path.relpath(path, ROOT))
        await b.close()


def main() -> int:
    names = sys.argv[1:] or list(SCREENS)
    unknown = [n for n in names if n not in SCREENS]
    if unknown:
        print(f'unknown screen(s): {unknown}. known: {", ".join(SCREENS)}')
        return 2
    with preview() as url:
        asyncio.run(run(url, names))
    return 0


sys.exit(main())
