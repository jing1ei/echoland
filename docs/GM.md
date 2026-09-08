# The GM layer

A translucent debug slab over the running game. It exists so that testing a
system does not require playing to it — you force the value and watch the stage
react underneath.

It is built to be **deletable**. That constraint is what keeps it honest: the
GM layer knows about the game, but nothing in the game knows about the GM layer.

```
src/gm/
  commands.ts   every button, as data. Mutators + GM_GROUPS.
  GmLayer.tsx   the panel. Reads useGame(), writes through gmWrite.
```

## Turning it on

Two gates, deliberately.

| gate | when | effect |
|------|------|--------|
| `__GM__` | compile time (`vite.config.ts`) | `false` in a production build, so Rollup drops the dynamic import and **no GM chunk is emitted at all** |
| `?gm=1` | run time, in a build that has it | keeps the corner button hidden until asked, so a shared dev link still looks like the product |

```bash
npm run dev            # GM on, no query string needed
npm run build          # GM OFF — this is what ships, to dist/
npm run build:gm       # GM on, to dist-gm/ — the build you hand a tester
```

Verify the release build is clean:

```bash
npm run build && ls dist/assets     # there must be no GmLayer chunk
npm run build:gm && ls dist-gm/assets   # this one has it
```

In a `build:gm` bundle, open `…/?gm=1` and the `GM` button appears top-left.

## Removing it for good

Delete `src/gm/`, the GM block near the top of `src/App.tsx`, the `<GmLayer/>`
line at the bottom of `Shell`, the `__GM__` define in `vite.config.ts` and the
`gmWrite` / `gmPlay` pair in `src/game/store.tsx`. Nothing else refers to any of
it. The `build:gm` script and this file can go too.

## The seam

The panel touches state through exactly two store methods:

```ts
gmWrite((s: GameState) => GameState)   // silent write, sanitizer still runs
gmPlay(sceneId: string)                // force a scene open
```

plus the ordinary `fireHook` and `hardReset` that the game already exposes. No
system has a GM branch in it. Weather and stall-visitor overrides go through
`game/devFlags.ts`, which the release build also never writes to.

## What the panel gives you

Live readout at the top: coin, inspiration, this town's fame (the word **and**
the raw local number, the one place it is ever shown), leisure, fatigue, current
coin/hour, who is at the stall, and which weather is forced. Below that a shared
`N` field feeds every `+N` button.

| section | what it is for |
|---------|----------------|
| 钱与资源 | write purse values straight into the save, bypassing the collect flow; 此地名气 `+N` / 升一档 pay the town you are standing in, 路上名声 writes the hidden travelling name |
| 族谱（八十一份） | 找回下一页 (nearest volume), 补齐当前这一卷 (also fires the volume song + the `volumes` scene), 八十一份全给, 清空族谱 |
| 谱曲 | 灵感与闲暇补满 so the compose sheet can be run twice in a row, 烧掉所有自谱曲 to reset `state.composed` |
| 时间与手劲 | skip N hours (winds `lastTick`/`lastCollect` back so the idle loop pays out), refill fatigue, **age grudges by N days**, bump collect count |
| 解锁 | all overlooks + maps, all instruments/songs/upgrades/items, chapter +1 |
| 剧情钩子 | roll `open` / `collect` / `arrive` for real, and report hit or miss |
| 熟练度 | set own proficiency to 0 / 25 / 50 / 90 / max, `+10` to watch the category bonus move, or put the instrument in your hands |
| 天气 | pin a weather id, or back to auto |
| 摊边人影 | pin a stall visitor so you can test the event hanging off it |
| 好感 | the hidden affection number, per character: `+1 / +5 / +20 / −5` |
| 憎恶 | the hidden enmity number, per character: `+1 / +6 / +18 / +40 / −6`, 揭过, 全部揭过 |
| 强制播放场景 | any authored *or generated* scene by id |
| 危险 | wipe the save |

The character dropdown prints both hidden axes — `苏芹 · 好 32 · 恨 18` — because
being able to see the pair is the point. Someone at 深交 **and** 怀恨 is a legal,
intended state, and the panel is the only place it is ever a number.

### Hidden values need two kinds of test

Writing `好感 +5` or `憎恶 +18` from the panel is a **silent** write. It changes
the number and nothing else: no dimmed screen, no floated line. That is correct
— the beat belongs to the story runtime, not to the value.

So test the two halves separately:

- **the number** → GM buttons, then `__lyre.feel('ch_su')` in the console
- **the presentation** → 强制播放场景 on a scene that carries the effect
  (`g_su_caught` for a cold beat, any `bond` scene for a warm one)

If you only ever use the buttons you will never notice that a beat is missing.

### Fame is local, so stand somewhere first

此地名气 pays whichever town the current overlook belongs to. Travel, then click.
The player-facing side is five words and no digits, so the panel showing
`名气 小有名气 46` is the *only* legal place that number appears — if you see a
number anywhere else, that is the bug.

### The eighty-one, without the walk

The main line needs pages, and pages come from exploration rolls with a cooldown.
补齐当前这一卷 is the useful button: it closes the volume for the town you are in,
which unlocks that volume's myth song and satisfies `{ k: 'volumes', min: N }`,
so it is how you reach late chapters and the `l_volume` scene in one click.
清空族谱 removes the pages but deliberately leaves already-unlocked songs alone —
songs are earned, and revoking them would corrupt a repertoire mid-test.

### Grudges and the clock

Enmity decays in real time, faster away from the character's town. 仇怨放旧 N 天
moves `story.enmityAt` backwards; the decay applies on the next accrual tick, so
click a 跳过 N 小时 or reopen the app afterwards. Decay floors at tier 1 — if you
want a clean slate, use 揭过 or play a `forgive` scene.

## Console, without the panel

`window.__lyre` ships in **every** build, GM or not. It is read-mostly
instrumentation the smoke tests depend on, so it is not part of the GM layer.

```js
__lyre.state()               // the whole save
__lyre.version               // save schema version (migration tests read this)
__lyre.feel('ch_su')         // { bond, tier, tierLabel, enmity, grudge, grudgeLabel }
__lyre.rates()               // { coin, renown, parts } — grudge penalty shows in parts
__lyre.why('collect')        // every trigger + exactly why it is or isn't eligible
__lyre.roll('collect', 500)  // measured firing distribution
__lyre.play('g_su_caught')   // force a scene
__lyre.fire('collect')       // roll the hook for real
__lyre.prof()                // own / bonus / effective / pay for the held instrument
__lyre.sky()                 // sky + weather state at this instant
__lyre.guests()              // who is at the stall right now
```

`__lyre.feel()` and `__lyre.rates()` are what make the hidden-stat contract
testable: `smoke_enmity.py` asserts the number moved *and* that no digit of it
reached the screen.

## Adding a command

Add a row to `GM_GROUPS` in `commands.ts` — no JSX needed. Three rules:

1. Go through `api.write`, never a store method that also plays a sound or opens
   a sheet. GM edits are silent.
2. Leave the save valid. The sanitizer runs on every write, but it will not
   invent a legal instrument for you.
3. Say what happened in `api.log`. Half of testing is remembering what you just
   did.

```ts
{
  id: 'renown+',
  label: '名声 +N',
  amount: true,                 // takes the panel's shared N
  tone: 'warn',                 // optional, red — for destructive actions
  run: ({ write, log }, n) => {
    write((s) => ({ ...s, renown: s.renown + n }));
    log(`名声 +${n}`);
  },
}
```

If a mutator is also useful to a picker in the panel (or to a test), export it
from `commands.ts` the way `addBond` / `addEnmity` / `clearEnmity` / `ageGrudges`
are exported.

## Why it is ugly

Grey, monospaced, unstyled. On purpose: no screenshot of the GM panel can ever
be mistaken for the product, and nobody is tempted to promote a debug affordance
into a feature.

## Tests

```bash
python3 ../smoke_gm.py        # panel opens, buttons write, release build has no GM
python3 ../smoke_enmity.py    # hidden axes: values move, numbers never render
```
