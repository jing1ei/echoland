#!/usr/bin/env python3
"""
Run the whole suite against the built bundles.

    cd wandering-lyre
    npm run build && npm run build:gm
    npm test

Order matters a little: the world audit is first because it is fast and a
broken reference makes every later failure a red herring. The GM test needs
both builds on disk (dist and dist-gm) and both preview servers, so it brings
up the tester port itself.

Anything can also be run alone against a preview you already have open:

    npx vite preview --port 4179 &
    python3 tests/smoke_bag.py
"""

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import GM_PORT, PORT, ROOT, preview  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

SUITE = [
    ('audit_world.py', 'content cross-references'),
    ('smoke.py', 'the loop: idle, collect, strategy, save migration'),
    ('smoke_story.py', 'story runtime, triggers, hidden bond'),
    ('smoke_systems.py', 'proficiency, performance, weather, spirits'),
    ('smoke_enmity.py', 'the grudge axis stays hidden and costs money'),
    ('smoke_lineage.py', 'regional fame, composing, the eighty-one'),
    ('smoke_bag.py', 'the bag is pictures; numbers live where they belong'),
    ('walk_scenes.py', 'every authored scene plays to its end'),
    ('smoke_gm.py', 'the GM layer works, and is absent from release'),
]


def need(path: str, hint: str):
    if not os.path.isdir(os.path.join(ROOT, path)):
        print(f'missing {path}/ — run {hint} first')
        sys.exit(2)


def main() -> int:
    need('dist', 'npm run build')
    need('dist-gm', 'npm run build:gm')

    failed = []
    with preview('dist', PORT), preview('dist-gm', GM_PORT):
        for script, what in SUITE:
            print(f'\n──── {script}  ({what})', flush=True)
            code = subprocess.call([sys.executable, os.path.join(HERE, script)], cwd=ROOT)
            if code != 0:
                failed.append(script)

    print('\n════ summary')
    for script, _ in SUITE:
        print(f'  {"FAIL" if script in failed else "pass"}  {script}')
    return 1 if failed else 0


sys.exit(main())
