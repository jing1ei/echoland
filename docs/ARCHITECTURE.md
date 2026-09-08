# Architecture — where things live and why

The rule this project is organised around:

> **Gameplay code decides what happens. Content decides what it looks like,
> what it costs, what it says and when it is allowed.**

If you find a sentence of story, a tuning number, a colour or a nested trigger
condition inside `src/game/` or `src/ui/`, that is a bug in the layout, not a
style preference. It is what makes a game like this ossify: six months in,
rebalancing means grepping for magic numbers across the renderer.

---

## The three layers

```
src/content/     data only. No imports from src/game/* except *types*.
src/game/        systems. Pure logic + the persisted state machine.
src/ui/, src/render/   presentation. Reads systems, never re-derives them.
```

```
src/
  content/                every authored resource, grouped by module
    events/  quests/  towns/  overlooks/  items/  songs/  stances/  upgrades/
    instruments/          registry · values · text · art · audio
    proficiency/          categories · values · text · conditions
    performance/          values · text
    weather/              registry · values · text · art · audio · conditions
                          · scenes · triggers
    spirits/              registry · values · text · art · audio · conditions
    story/                characters · triggers · scenes/{main,bonds,grudges,
                          side,ambient}
    bond/                 values · text          — hidden affection, told in prose
    enmity/               registry · values · text — hidden grudges, ditto
    visitors/             registry · values · text · art · conditions · scenes
                          · triggers  — who is standing at the stall
    gear.ts               back-compat barrel: instruments + songs + stances +
                          upgrades + items, for UI that wants "all the gear"

  game/
    types.ts              shared vocabulary (Rarity, MoodTag, WeatherId, …)
    engine.ts             GameState, freshState, migration, accrue, computeRates
    store.tsx             React context: persistence, the clock, collect, hooks
    rng.ts                hash32 / rand01 — deterministic, seedable
    systems/
      proficiency.ts      own value, category bonus, tiers, practice grants
      performance.ts      proficiency + rarity -> income multipliers
      weather.ts          rolls the sky, exposes art/audio/pay/matching
      spirits.ts          *generates* cast + scenes + triggers from content
      beat.ts             FeelingBeat: the one shape a hidden stat may take
      bond.ts             affection -> a sentence and a dim level
      enmity.ts           grudges -> a sentence, a local price, a slow fade
      visitors.ts         who is at the stall, from clock + place + state
    story/
      types.ts  conditions.ts  effects.ts  runtime.ts  router.ts  tiers.ts
      registry.ts           the seam: authored content + generated content
      index.ts              public API, auditContent()

  render/                 procedural canvas: scenery + portraits
  ui/                     screens and sheets
  gm/                     the debug layer. Excluded from release at compile
                          time by `__GM__` — see "The GM layer" below.

  content/audit.ts        the world audit: every cross-table reference,
                          checked. Owns `window.__lyreAudit` / `__lyreWorld`.
  content/story/memories.ts
                          the register of flags/vars written on purpose for a
                          later callback, so "nobody reads this" stays a real
                          finding instead of background noise.

tests/                    the browser suite. `harness.py` holds everything
                          shared (ports, save key, tapping through a scene,
                          serving a build); `run_all.py` runs the lot.
docs/                     ARCHITECTURE (this file) · STORY · GM · HANDOFF
```

### Why `story/registry.ts` exists

The interpreter, the router and the condition evaluator must never import a
content file directly. They import the registry. That single seam is what lets a
new content module ship without touching the engine:

```ts
export const SCENES   = [...AUTHORED_SCENES,   ...SPIRIT_SCENES,   ...WEATHER_SCENES];
export const TRIGGERS = [...AUTHORED_TRIGGERS, ...SPIRIT_TRIGGERS, ...WEATHER_TRIGGERS];
export const CHARACTERS = [...CAST, ...SPIRIT_CHARACTERS];
```

Generated content is content. `game/systems/spirits.ts` contains no story: it
reads `content/spirits/*` and builds one cast entry, two scenes and two triggers
per spirit. Nineteen instruments do not need nineteen hand-copied trigger rows.

---

## The five resource kinds

Every module splits its resources the same way, so you always know which file to
open:

| file | holds | never holds |
|------|-------|-------------|
| `registry.ts` / `categories.ts` | identity & structure: ids, groups, which instrument, which category | numbers, prose |
| `values.ts` | every number: rates, curves, odds, cooldowns, prices, caps | strings, colours |
| `text.ts` | names, labels, blurbs, dialogue, journal copy | numbers you might retune |
| `art.ts` | colours, silhouettes, overlay parameters, portrait specs | logic |
| `audio.ts` | note figures, gain, duration for the synth | timing logic |
| `conditions.ts` | **builders** that return `Cond` data | evaluation |
| `scenes.ts` / `triggers.ts` | that module's own story and hookups | thresholds (import them from `values.ts`) |

Two of those deserve a note:

- **`conditions.ts` files build, they do not evaluate.** There is exactly one
  evaluator, `game/story/conditions.ts`. A builder like
  `mastered('lyre_star')` returns `{ k: 'prof', id: 'lyre_star', min: 100 }`
  where the `100` came from `proficiency/values.ts`. Retuning mastery moves one
  number and every gate follows.
- **Assets are procedural.** There is no `assets/` folder because there are no
  files: scenery, portraits, weather and every sound are generated. So the "art"
  and "audio" resource kinds are *parameters* — palettes, silhouettes, note
  lists. A widget that downloads megabytes of samples is not a widget.

---

## Module → resource map

**Core system** columns are the files that will break the app if you edit them
casually. Everything to their right is safe to edit while the game is running.

| module | core system | conditions | values | text | art | audio |
|---|---|---|---|---|---|---|
| **Idle economy** | `game/engine.ts` (`accrue`, `computeRates`), `game/store.tsx` | — | `content/stances`, `content/upgrades`, `content/overlooks` | same files | `content/overlooks` (palettes) | `src/audio.ts` (synth only) |
| **Instruments** | `content/instruments/index.ts` (assembler) | — | `instruments/values.ts` | `instruments/text.ts` | `instruments/art.ts` | `instruments/audio.ts` |
| **Proficiency** | `game/systems/proficiency.ts`, `GameState.prof` / `.profBonus` | `proficiency/conditions.ts` | `proficiency/values.ts` | `proficiency/text.ts` | — | — |
| **Performance & earnings** | `game/systems/performance.ts`, `computeRates` | — | `performance/values.ts` | `performance/text.ts` | — | — |
| **Instrument spirits** | `game/systems/spirits.ts` (generator) | `spirits/conditions.ts` (+ proficiency gate) | `spirits/values.ts` | `spirits/text.ts` | `spirits/art.ts` | `spirits/audio.ts` |
| **Weather** | `game/systems/weather.ts`, `ui/WeatherOverlay.tsx` | `weather/conditions.ts` | `weather/values.ts` | `weather/text.ts` | `weather/art.ts` | `weather/audio.ts` |
| **Story / AVG** | `game/story/*` + `registry.ts` | `story/triggers.ts` (`when`) | `story/triggers.ts` (`chance`, `priority`), `characters.ts` (tiers) | `story/scenes/*` | `story/characters.ts` (`look`) | `src/audio.ts` |
| **Affection (hidden)** | `game/systems/bond.ts`, `story/tiers.ts` | — | `bond/values.ts`, `characters.ts` (tiers) | `bond/text.ts` | — | — |
| **Enmity (hidden)** | `game/systems/enmity.ts` | — | `enmity/registry.ts` (tiers), `enmity/values.ts` | `enmity/text.ts` | — | — |
| **Stall visitors** | `game/systems/visitors.ts`, `story/guests.ts` | `visitors/conditions.ts` | `visitors/values.ts` | `visitors/text.ts` | `visitors/art.ts` | — |
| **Local fame** | `game/systems/fame.ts`, `GameState.fame` | — | `fame/registry.ts` (5 tiers), `fame/values.ts` | `fame/text.ts` | — | — |
| **The eighty-one** | `game/systems/scores.ts`, `GameState.scores` | `story/conditions.ts` (`score`, `volumes`) | `scores/registry.ts` (9×9), `scores/values.ts` | `scores/text.ts` | — | — |
| **Composing** | `game/systems/compose.ts`, `game/systems/songs.ts` | — | `compose/values.ts` | `compose/text.ts` | — | — |
| **Exploration** | `ui/TownView.tsx`, `ui/Minigames.tsx` | node `need` fields | `content/towns` (costs, odds), `content/quests` | `content/towns`, `content/quests` | `content/overlooks` | `src/audio.ts` |
| **Encounters** | `game/engine.ts` (`rollEvents`) | `content/events` (`needFlag`, moods) | `content/events` (weights, gains) | `content/events` | — | — |
| **Scenery & widget** | `render/scene.ts`, `render/SceneCanvas.tsx`, `ui/WidgetView.tsx` | — | `content/overlooks` (`scene`) | `content/overlooks` (names, blurbs) | `content/overlooks` (`palette`, features) | — |

---

## How the four new systems fit together

They are deliberately a chain, not four separate features:

```
you pick an instrument (StrategyPanel)
  → hours pass          engine.accrue
      → practice        systems/proficiency.grantPractice     (values: proficiency)
          → every 10 own points, +1% permanent to the whole technique
      → earnings        systems/performance.performancePay    (values: performance)
          × weather      systems/weather.weatherPay            (values: weather)
  → collect sheet shows both halves: coins, and what your hands learned
      → at max proficiency, a unique instrument's spirit may show up
         systems/spirits (gate: proficiency/conditions.mastered)
```

Proficiency model, precisely:

```
own value        state.prof[instrumentId]      0..100, never drops
category bonus   state.profBonus[categoryId]   permanent, stacks, capped
effective        own + category bonus, capped at 100
```

The category bonus is derived (one point per 10 own points, per
`values.ts`) *and* stored. Stored, because a future one-off gift — a luthier
showing you a trick — should be able to add to it without inventing a second
mechanism; derived, because `recomputeBonus()` can then heal any save whose
stored value drifted. `engine.ts` bumps `STATE_VERSION` and the sanitizer in
`store.tsx` drops proficiency for instruments that no longer exist.

Weather is a **mask, never a replacement**. `render/scene.ts` still paints the
place; `ui/WeatherOverlay.tsx` paints tint, blur, streaks, flakes, gusts and
lightning on top from `weather/art.ts`. The renderer only receives a reduced
`CanvasWeather` so the rich weather set can grow without touching it.

---

## The two hidden axes

Relationships run on **two** numbers per person, and the player is shown
neither:

```
state.story.bond[id]     affection, 0..∞, tiers from characters.ts
state.story.enmity[id]   grudges,   0..∞, tiers from enmity/registry.ts
state.story.enmityAt     when grudges were last aged
```

Enmity is **not** the bottom of the affection scale. They are independent on
purpose: 苏芹 can sit at 交好 and 记着这事 at the same time, and that pair is the
most interesting state a character in this game can be in. Nothing in
`effects.ts` moves one when content asks for the other.

Both reach the player through exactly one shape, `systems/beat.ts`:

```ts
FeelingBeat { who, tone: 'warm' | 'cold', text, dim, hold, heavy }
```

`apply()` returns it as a `feel` note; `StoryView` drains a queue of them, dims
the screen, and prints the sentence in the box where dialogue goes. Warm and
cold differ only in palette (`BEAT_SKIN` in `StoryView.tsx`). A number would
turn a relationship into a progress bar to farm.

Where each is allowed to surface:

| | affection | enmity |
|---|---|---|
| in a scene | warm beat, prose | cold beat, prose |
| cast page | tier word + one drifting line | tier word + one line, only when > 0 |
| conditions | `bond` / `tier`, described as the tier word | `enmity` / `grudge`, described as "旧事" |
| the idle loop | — | coin & renown multiplier **in that person's town only**, floored at `ENMITY_VALUES.worst`, shown as a named line in the rate breakdown |
| decay | never | `decayEnmity()` on every tick, slower where they can see you, and it **stops at tier 1** |

That last row is the design in one line: time gets a grudge down to "记着这事"
and no further. Getting back to a clean slate needs an authored scene with a
`forgive` effect — forgiveness is a story beat, not a waiting game.

---

## Fame is a place, not a score

There is no global reputation number in front of the player. Fame is kept per
town and shown as one of five words for the town you are standing in:

```
state.fame[townId]   local fame, decays slowly toward the tier below
state.fameAt         when fame was last aged
state.renown         hidden: the name that travels, seeds new towns
```

```
无人识得 → 有点面熟 → 小有名气 → 声名在外 → 名动一方
```

`systems/fame.ts` owns all of it — `grantFame()` pays the town you played in and
lets a slice spill into `renown`, which in turn gives a new town a small head
start. Nothing in the UI prints the number: `fameWord()` gives the tier word and
`fameProgress()` gives a 0..1 for an underline, which is as close to a bar as
this game gets. Objectives that want fame use `kind: 'fame'` and are described in
words; the one exception is `ref: '*towns:N'`, which counts *how many* places
know you at tier N and can honestly show a count.

Saves from before v7 held a single scalar. The migration in `store.tsx` spreads
it across the towns you had already reached, so an old save wakes up famous
where it earned it.

---

## Where numbers are allowed to be

Three screens, three jobs, and a rule about digits.

**The stage** (`StageView`) shows the view and the takings, and nothing else.
No stat strip. If you want to know how you are doing, you go and look.

**The bag** (`SatchelView`) prints exactly one number by itself: coin, in
`[data-purse="coin"]`. Everything else in there is a picture. The tray is a
5-wide grid of cells (`[data-cell="<id>"]`), each one a glyph in the object's
own ink over a breath of its own colour, with the count you carry on a small
plate in the corner. Names, descriptions and buttons appear only after a tap,
on one slab below the tray. Category tabs are drawings too
(`[data-tray-tab="things|instruments|songs|kit"]`).

**Explore** (`TownView`) is where 名气 / 灵感 / 闲暇 live, at the top, next to
the shops and quests that spend them. Fame is still a word with a hairline
under it — `[data-fame]` moved here from the stage.

The drawings live in one place, `ui/Glyph.tsx`: a flat map of id → stroke-only
24×24 SVG, no fills, `currentColor`, so a cell, a slab and a tab can all ask
for the same picture at different sizes. Which object gets which drawing is
content, not UI:

```
content/items/art.ts       ITEM_ART      id → { glyph, tint }   + kind fallback
content/upgrades/art.ts    UPGRADE_ART   id → { glyph, tint }
content/songs/art.ts       MOOD_ART      songArt(): glyph from the first mood
                                         tag (what the song is about), ink from
                                         the second (how it feels)
content/instruments/art.ts already carried silhouette + accent — the tray reads it
content/satchel/index.ts   the four tabs, their glyphs, and every word on screen
```

Adding an item without a line in `ITEM_ART` is not a crash — it falls back to a
generic pouch inked by kind — but it is a content bug, and dev builds say so.

`smoke_bag.py` holds the rule down: the stage prints none of the three, the bag
prints none of the three, an untapped cell does not write its name out, counts
are on the cells, and the fame slot on explore contains no digit.

---

## The eighty-one: the main line is a collection

The main story is one object: **9 volumes × 9 leaves = 81 ancestral scores**,
scattered when the 澹人 were wiped out. `content/scores/registry.ts` generates
them; each volume belongs to a town, so where you idle decides what you can find.

```
state.scores   string[]  leaf ids recovered
state.scoreAt  number    cooldown clock for finds
```

`systems/scores.ts` is the whole rule set:

```
findChance(s, node)  → per-node odds, weighted by volume, gated by cooldown
pickLeaf(s, town)    → homeBias: usually this town's volume, sometimes a stray
findScore(s, id)     → adds the leaf, and when a volume closes, unlocks its song
scorePay(s)          → tiny permanent bonus per leaf, larger per finished volume
```

Three roads lead to a leaf, and content never has to know about the others:
an exploration node roll (`store.tsx`), a quest `reward.score`, or a story
`{ k: 'score' }` effect. Completing a volume grants an authored myth-rarity song
(`song_vol_tide` … `song_vol_bone`) — the only songs in the game with no price.

`ui/ScoresTab.tsx` is the collection page: 81 total, nine volumes, found leaves
named, missing ones as rumours.

---

## Composing: inspiration becomes repertoire

Inspiration used to be a currency you spent on other people's songs. Now it can
buy your own. `systems/compose.ts` takes a grade, one or two motifs, a focus and
a title, spends inspiration and leisure, and returns a whole `Song`:

```
state.composed  ComposedSong[]   the song object itself, stored in the save
```

That is the important detail: composed songs live **in the save**, not in
`content/`. So nothing may reach into `SONG_MAP` directly any more. Everything
goes through `systems/songs.ts`:

```ts
songById(s, id)   // authored or composed
ownedSongs(s)     // what the player can put in a set
songName(s, id)   // for any label
isMine(s, id)     // for the 自谱 mark
```

Quality is a budget, not a roll: the grade sets the total multiplier budget,
the focus decides where most of it lands, proficiency nudges it, and a surcharge
makes each additional song cost more so a player cannot farm a hundred of them.

---

## The GM layer

`src/gm/` is a development tool that must not ship. It is removed at *compile*
time, not at runtime:

```ts
// vite.config.ts
define: { __GM__: mode !== 'production' || process.env.VITE_GM === '1' }

// App.tsx
if (__GM__) { /* the only import of ./gm/GmLayer */ }
```

Rollup folds the constant, deletes the branch, and emits no GM chunk at all —
so `?gm=1` against a release build does nothing, and deleting `src/gm/` leaves
only two unused fields on the store (`gmWrite`, `gmPlay`).

```bash
npm run build      # release: no GM chunk, no GM strings   -> dist/
npm run build:gm   # tester:  GM behind ?gm=1              -> dist-gm/
```

`smoke_gm.py` asserts both halves, including the absence of GM UI text in the
release bundle.

What the panel can force, how to add a command, and why a hidden value needs
testing twice (the number, then the beat) — see `docs/GM.md`.

---

## Adding things

**A new instrument** — five rows, all in `content/instruments/`:
`registry.ts` (id, category, rarity), `values.ts` (multipliers, price, practice
speed), `text.ts`, `art.ts`, `audio.ts`. Then put it on a shelf via
`shopStock` in `content/towns/`, or hand it out as a quest reward. Proficiency,
category bonus and earnings all work immediately — none of them know the
instrument list.

**A new instrument spirit** — six rows in `content/spirits/`, and only for an
instrument marked `unique: true`. The mastery gate, the two scenes, the two
triggers and the cast entry are generated.

**A new weather** — a spec in `weather/registry.ts`, weights in `values.ts`,
labels in `text.ts`, overlay parameters in `art.ts`, optionally a cue in
`audio.ts`. Add it to a group and every `inWeather('rain')` condition already
written picks it up.

**A new story beat** — see `docs/STORY.md`.

**A new ancestral leaf** — nothing to add: the 81 are generated from
`scores/registry.ts`. To change *where* one hides, move its volume's `townId`;
to change how often they turn up, edit `findByNode` / `homeBias` /
`findCooldownH` in `scores/values.ts`. To hand a specific page out by name, put
`score: 'sc_3_3'` on a quest reward or `{ k: 'score', id: 'sc_3_3' }` in a scene.

**A new composition motif or grade** — `compose/values.ts` for the numbers,
`compose/text.ts` for the words. The sheet, the cost curve and the song
resolution all read from those two.

**A grudge for a new character** — nothing to register. `{ k: 'enmity', who, n }`
in any scene works immediately; add an entry to `ENMITY_TIERS_BY_CHARACTER`
only if that person should forgive faster or slower than the default, and a few
lines to `ENMITY_LINES_BY_CHARACTER` if they should react in their own voice.
Write the arc in `content/story/scenes/grudges.ts` — two beats to earn it, one
to cool it, one to clear it.

---

## Before you commit

One command does all of it — typecheck, both builds, and the whole browser
suite against the bundle that would ship:

```bash
npm run check
```

which is:

```bash
npm run typecheck        # tsc --noEmit
npm run build            # typechecks, then dist/
npm run build:gm         # the tester build, dist-gm/ — never deploy this one
npm test                 # python3 tests/run_all.py
```

The suite, if you want one piece of it (needs a build first; each test will
serve `dist/` itself, or reuse a `npm run preview` you already have up):

```bash
npm run audit                  # content cross-references only, no browser assertions
python3 tests/smoke.py         # economy, save migration, the loop
python3 tests/smoke_story.py   # audit + trigger spread, hidden affection, interrupted scenes
python3 tests/smoke_enmity.py  # grudges: hidden, local, floored, forgivable
python3 tests/smoke_systems.py # proficiency, spirits, weather
python3 tests/smoke_gm.py      # the GM layer, and its absence from the release build
python3 tests/smoke_lineage.py # regional fame, composing, the 81 leaves
python3 tests/smoke_bag.py     # the icon tray, and which screen may print which number
python3 tests/walk_scenes.py   # plays every scene, every branch
python3 tests/shoot.py stage explore journal bag   # screenshots into shots/
```

Two things worth knowing before you write a test:

- **Seed the save through `harness.reseed`.** The store persists 350ms after
  any state change, so a page that is still alive will overwrite whatever you
  just wrote to `localStorage` — sometimes. `reseed` parks the browser on a
  static file of the same origin, writes, then boots the app.
- **`dist/` is generated and not committed.** `npm run build` remakes it; the
  deploy step uploads it. If you keep a `npm run preview` running in another
  shell, the harness checks that it is serving the build currently on disk and
  refuses to test a stale bundle rather than blaming your new code.

### The world audit

`content/audit.ts` walks every table and reports two severities:

- **errors** — a dead reference: an item id nobody defines, a shop shelf with
  an unpriced good, a `findByNode` knob for a node kind no map lays down, a
  quest pointing at a scene that was renamed. `npm test` fails on these.
- **advisories** — judgement calls: content with no way to obtain it, a flag
  written and never read. If a flag is written *on purpose* for a callback you
  have not written yet, register it in `content/story/memories.ts` with a line
  saying what it is for. Both lists are expected to be empty; keep them that
  way and the next dead reference is visible the day it appears.

In the browser console:

```js
__lyre.why('collect')          // every trigger + why it is/isn't eligible
__lyre.feel('ch_su')           // both hidden axes for one person, and their words
__lyre.rates()                 // the rate breakdown, including a grudge's cost
__lyre.guests()                // who is standing at the stall right now
__lyre.play('g_su_caught')     // force a scene
__lyreWorld()                  // { errors, advisories } from the world audit
```
