"""
Shared harness for the browser smoke suite.

Every test here drives the *release* bundle through a real browser, because
the release bundle is the only one that ships. The pieces that every test
needs — where the save lives, how to tap through a story scene, how to bring
a preview server up and down — used to be copy-pasted into each file with
small drifts (three different tap delays, two different return types). They
live here now.

    cd wandering-lyre
    npm run build
    npm test                 # tests/run_all.py, serves and runs everything
    python3 tests/smoke.py    # one test, against an already-running preview

Ports come from the environment so a busy machine can move them:
LYRE_PORT (release, default 4179) and LYRE_GM_PORT (tester build, 4180).
"""

from __future__ import annotations

import contextlib
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KEY = 'wandering-lyre-save-v1'
PORT = int(os.environ.get('LYRE_PORT', '4179'))
GM_PORT = int(os.environ.get('LYRE_GM_PORT', '4180'))

BASE = f'http://localhost:{PORT}/index.html'
GM_BASE = f'http://localhost:{GM_PORT}/index.html'

# A static file on the same origin. Loading it stops the app while keeping
# localStorage reachable — see `reseed` for why that matters.
PARK = f'http://localhost:{PORT}/manifest.webmanifest'
GM_PARK = f'http://localhost:{GM_PORT}/manifest.webmanifest'

READ = f"() => JSON.parse(localStorage.getItem('{KEY}'))"


def seed(patch: dict) -> str:
    """JS that merges a patch into the save already on disk."""
    return f"""() => {{
      const k = '{KEY}';
      const s = JSON.parse(localStorage.getItem(k)) || {{}};
      Object.assign(s, {json.dumps(patch)});
      localStorage.setItem(k, JSON.stringify(s));
    }}"""


# ------------------------------------------------------------------
# story layer
# ------------------------------------------------------------------

async def clear_story(pg, taps: int = 90) -> bool:
    """Tap through whatever scene is on screen until the AVG layer is gone.

    The story can interrupt anything — app open, a collect, a node visit — so
    any test that touches the game has to be able to get past it. Returns
    True when the screen is clear, False if it never settled.
    """
    for _ in range(taps):
        if await pg.locator('[data-story]').count() == 0:
            return True
        body = await pg.inner_text('body')
        if '记下了' in body:                     # the journal card that ends a scene
            await pg.get_by_text('记下了').first.click()
            await pg.wait_for_timeout(320)
            continue
        if '刚才说了什么' in body:                # the backlog drawer
            await pg.get_by_text('收起').first.click()
            await pg.wait_for_timeout(250)
            continue
        btns = pg.locator('[data-story] button')
        for i in range(await btns.count()):
            label = (await btns.nth(i).inner_text()).strip()
            if not label or label in ('回顾', '自动') or len(label) <= 3:
                continue
            if not await btns.nth(i).is_enabled():
                continue
            await btns.nth(i).click()
            break
        else:
            await pg.mouse.click(207, 500)       # advance a plain line
        await pg.wait_for_timeout(180)
    return False


async def new_page(browser, errors: list | None = None, width: int = 414, height: int = 896):
    """A phone-sized page that collects page errors into `errors`."""
    ctx = await browser.new_context(viewport={'width': width, 'height': height})
    pg = await ctx.new_page()
    if errors is not None:
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    return pg


async def boot(pg, seed_js: str | None = None, url: str | None = None, qs: str = '?skipIntro=1'):
    """Load the game, optionally seed the save, reload, and clear any scene.

    The first load is what creates a save to patch; `reseed` then edits it
    with the app parked so the store cannot overwrite the patch.
    """
    target = (url or BASE) + qs
    await pg.goto(target)
    await pg.wait_for_timeout(900)
    if seed_js:
        await reseed(pg, seed_js, url, qs, settle=1100)
        return
    await clear_story(pg)


async def reseed(pg, js: str, url: str | None = None, qs: str = '?skipIntro=1', settle: int = 1400):
    """Edit the save with the app *not* running, then boot into it.

    The store writes the whole save 350ms after any state change, so a page
    that is still alive will cheerfully overwrite whatever a test just put in
    localStorage — silently, and only sometimes, which is the worst kind of
    flake. Parking on a static file of the same origin first gives the test
    the save to itself. Use this for anything that seeds state and reloads.
    """
    park = GM_PARK if (url or BASE).startswith(f'http://localhost:{GM_PORT}') else PARK
    await pg.wait_for_timeout(450)          # let the app's own debounce land
    await pg.goto(park)
    await pg.evaluate(js)
    await pg.goto((url or BASE) + qs)
    await pg.wait_for_timeout(settle)
    await clear_story(pg)


async def tab(pg, label: str):
    """Bottom navigation: 摊子 / 探索 / 手记 / 行囊."""
    await clear_story(pg)
    await pg.get_by_text(label, exact=True).last.click()
    await pg.wait_for_timeout(420)
    await clear_story(pg)


# ------------------------------------------------------------------
# preview server
# ------------------------------------------------------------------

def _up(port: int, timeout: float = 25.0) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        with contextlib.closing(socket.socket()) as s:
            s.settimeout(0.4)
            if s.connect_ex(('127.0.0.1', port)) == 0:
                return True
        time.sleep(0.3)
    return False


def _serving_current_build(port: int, out_dir: str) -> bool:
    """Is the server on this port serving the build sitting in `out_dir`?

    index.html names the hashed asset bundle, so comparing the two files
    catches the one failure mode that wastes an afternoon: a preview server
    left running from before the last `npm run build`, quietly testing the old
    bundle and blaming the new code.
    """
    local = os.path.join(ROOT, out_dir, 'index.html')
    if not os.path.exists(local):
        return False
    try:
        with urllib.request.urlopen(f'http://localhost:{port}/index.html', timeout=3) as r:
            served = r.read().decode('utf-8', 'replace')
    except Exception:
        return False
    with open(local, encoding='utf-8') as f:
        return f.read().strip() == served.strip()


@contextlib.contextmanager
def preview(out_dir: str = 'dist', port: int = PORT):
    """`vite preview` on a fixed port, torn down on the way out.

    Reuses a server that is already listening — a developer can keep one up in
    another shell and still call a single test directly — but only if it is
    serving the build that is on disk right now.
    """
    if _up(port, timeout=0.5):
        if not _serving_current_build(port, out_dir):
            raise RuntimeError(
                f'something on port {port} is not serving the current {out_dir}/ — '
                f'rebuild (npm run build) or stop that server before testing'
            )
        yield f'http://localhost:{port}/index.html'
        return
    proc = subprocess.Popen(
        ['npx', 'vite', 'preview', '--outDir', out_dir, '--port', str(port),
         '--strictPort', '--host', '0.0.0.0'],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        if not _up(port):
            raise RuntimeError(f'preview never came up on {port} (built {out_dir}?)')
        yield f'http://localhost:{port}/index.html'
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


# ------------------------------------------------------------------
# reporting
# ------------------------------------------------------------------

def report(name: str, fails: list, errors: list | None = None, notes: dict | None = None) -> int:
    """Print the usual JSON block plus one verdict line. Returns an exit code."""
    body: dict = {'failures': fails}
    if errors is not None:
        body['errors'] = errors[:10]
    if notes:
        body['notes'] = notes
    print(json.dumps(body, ensure_ascii=False, indent=2))
    ok = not fails and not (errors or [])
    print(f'{name}:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def die(code: int):
    sys.exit(code)
