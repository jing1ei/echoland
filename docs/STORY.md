# Writing story for The Wandering Lyre

Everything in this document is about **content**, not code. If you are adding a
chapter, a character, a bond scene or a random encounter, you should never need
to touch anything under `src/game/story/*.ts` (the engine) or `src/ui/*` (the
presentation). You add rows to data tables. That separation is the whole point —
it is what lets the script keep growing for months without the runtime rotting.

```
src/game/story/            ← engine. You do not edit these to add story.
  types.ts        Cond / Effect / Step / Scene / Trigger — the vocabulary
  conditions.ts   evaluates a Cond against GameState (+ human-readable text)
  effects.ts      applies an Effect, returns the notes the UI floats up
  runtime.ts      the AVG interpreter: say / enter / choose / roll / goto
  router.ts       picks which trigger wins, and rolls its dice
  tiers.ts        affection thresholds -> tier index / label / progress
  registry.ts     the ONE seam: gathers authored + generated content
  index.ts        public API + auditContent()

src/content/story/         ← content. This is where you write.
  characters.ts   the cast: look, role, affection tiers
  triggers.ts     THE condition/probability table — one row per scene hookup
  scenes/
    main.ts       main line, m1..m9
    lineage.ts    what the blood does: first leaf, first finished volume
    bonds.ts      affection-gated, per character
    grudges.ts    enmity arcs: earn it, live with it, mend it
    side.ts       side-quest openers
    ambient.ts    flavour, repeatable

src/content/enmity/          ← the other half of the cast's feelings
  registry.ts     enmity thresholds -> tier label (per character overrides)
  values.ts       beat strength, local pay penalty, decay rates
  text.ts         every player-facing line about a grudge
```

Some modules bring their own story instead of filing it under
`content/story/`: `content/weather/scenes.ts` owns the storm beats, and
`content/spirits/` describes instrument spirits from which
`game/systems/spirits.ts` *generates* scenes and triggers. Both reach the router
through `game/story/registry.ts`, so from the engine's point of view they are
ordinary content. See `docs/ARCHITECTURE.md` for the module → resource map.

## The premise, in five sentences

You are the last of the **澹人**, a people who were killed off for what their
blood could do: instruments answer them. Their craft was written down as
**eighty-one scores**, nine volumes of nine leaves, and every one of them was
taken and scattered when the people were. You busk because a busker can stand in
any town without being asked who they are. The main line is therefore not a
journey with an ending scene — it is a recovery: nine volumes, nine regions, and
a song at the bottom of each finished volume that no one alive but you can play.

Two consequences for anyone writing:

- **Never explain the whole thing in a scene.** NPCs do not know what a 澹人 is.
  Most of them think the page you are holding is an odd bit of old paper.
- **The ability is not a spell.** It surfaces as instruments doing slightly more
  than they were asked to: a string sounding after you lifted your hand, a flute
  holding a note you did not have breath for. Write it small, always.

Handing out a page from a scene:

```ts
{ k: 'score' }                // a page belonging to where you are standing
{ k: 'score', id: 'sc_3_3' }  // a specific leaf, for an authored payoff
```

Gating on the collection:

```ts
{ k: 'score', min: 1 }                 // has recovered at least one page
{ k: 'score', vol: 'vol_tide', min: 5 }// five of the tide volume's nine
{ k: 'volumes', min: 2 }               // two volumes finished
```

`scenes/lineage.ts` holds the two beats that explain the blood — the first leaf
and the first finished volume. If you write a third, hook it on `volumes` so it
cannot fire before the player has felt the mechanic.

---

## Fame is local, and it is a word

If a scene wants to know whether the town knows you, ask for fame — not renown,
and never for a number. The player sees one of five words for the town they are
standing in (`无人识得 / 有点面熟 / 小有名气 / 声名在外 / 名动一方`), so a line
like "他们竟然还记得你" should be gated on a tier, and a reward should read
`长名气`, not `+8 名声`. Effects that pay fame pay the *current* town.

---

## The four questions every scene answers

1. **When can it happen?** → a `Cond` in `triggers.ts`
2. **How likely is it then?** → `chance` in `triggers.ts`
3. **What is said?** → `steps` in a `scenes/*.ts` file
4. **What changes because of it?** → `Effect[]` inside the scene

Keep 1 and 2 in the trigger table, never inside the scene. A scene should be
playable in isolation — that is what `window.__lyre.play('scene_id')` and the
scene walker rely on.

## Adding a scene

```ts
{
  id: 's_lantern_slip',        // unique, prefix by line: m_ / b_ / s_ / a_
  title: '没写的那张',          // shows in the corner and in the scene log
  line: 'side',                // main | bond | side | ambient — colours the chip
  steps: [
    { t: 'enter', who: 'ch_mai', side: 'right', as: 'smile' },
    { t: 'say', who: 'ch_mai', as: 'smile', text: '你这张还空着。' },
    { t: 'say', text: '「我想不出来。」' },   // unattributed + 「」 renders as 我
    {
      t: 'choose',
      prompt: '你写什么',                    // optional; defaults to 你怎么做
      options: [
        { label: '写一个名字。', do: [{ k: 'bond', who: 'ch_mai', n: 6 }], goto: 'name' },
        {
          label: '把签放回架子上。',
          hint: '不写',                       // grey sub-label
          need: { k: 'item', id: 'it_lanternslip' },
          lockNote: '你手里没有签',            // shown when need fails
          chance: 0.4,                        // succeeds 40% of the time
          do: [{ k: 'insp', n: 2, hours: true }],
          goto: 'back',
          miss: { text: '风把签吹走了。', goto: 'name' },   // the other 60%
        },
      ],
    },
    { t: 'at', id: 'name' },
    { t: 'say', text: '你写完就折起来了，没让人看。' },
    { t: 'goto', to: 'end' },
    { t: 'at', id: 'back' },
    { t: 'say', text: '架子上那一排签，全是空的。' },
    { t: 'at', id: 'end' },
    { t: 'exit' },
  ],
}
```

Step types: `say`, `enter`, `exit`, `bg`, `do`, `at`, `goto`, `roll`, `choose`,
`end`. `at` declares a label; `goto` / `option.goto` / `roll` jump to one. Fall
off the end of the array and the scene closes, so `end` is only needed for an
early exit.

Two conventions worth keeping:

- **Player lines** are unattributed `say` steps wrapped in `「」`. The dialogue box
  detects the quotes and labels them 我 · 走唱的. Do not invent a `ch_player`.
- **Narration** is unattributed and unquoted. Use it for everything the bard
  notices rather than says.

## Hooking it up

```ts
{
  id: 't_s_lantern_slip',
  scene: 's_lantern_slip',
  on: ['node', 'collect'],       // open | collect | arrive | node | quest
  nodeKinds: ['market'],          // required if on includes 'node' at prio >= 70
  when: {
    k: 'all',
    of: [
      { k: 'town', ids: ['lanternfair'] },
      { k: 'tier', who: 'ch_mai', min: 2 },
      { k: 'phase', of: ['dusk', 'night'] },
    ],
  },
  chance: 0.45,
  priority: 55,
  once: true,                     // or cooldownH: 6 for repeatables
  line: 'side',
}
```

Priority bands, and why they exist: the router collects every eligible trigger,
keeps only the highest band present, then rolls. A main beat therefore never
loses a coin flip to a cat.

| band | used for | typical chance |
|-----:|----------|----------------|
| 100 | main line | `1` — must land |
| 70 | bond scenes | `0.6 – 0.85` |
| 55 | side-quest openers | `0.35 – 0.7` |
| 40 | named-character ambient | `0.04 – 0.4` |
| 20 | world ambient | `0.18 – 0.22` |

Rules of thumb:

- `chance: 1` belongs to the main line only. Everywhere else, a hard condition
  plus a coin flip is what makes two playthroughs differ.
- `once: true` for anything with consequences. `cooldownH` for texture.
- Gate on `tier`, not raw `bond`. Tiers are thresholds you can retune later
  without invalidating anyone's save.
- Gate a follow-up on `seen` / `sinceScene` of its predecessor, not on a flag you
  set by hand.

## Two hidden axes: affection and enmity

A character keeps **two independent numbers** about you, and the player is never
shown either of them.

| axis | state | tiers live in | effect | condition |
|------|-------|---------------|--------|-----------|
| affection (喜爱) | `story.bond[id]` | `content/story/characters.ts` | `{ k: 'bond', who, n }` | `tier` / `bond` |
| enmity (憎恶) | `story.enmity[id]` | `content/enmity/registry.ts` | `{ k: 'enmity', who, n }` | `grudge` / `enmity` |

Both are plain numbers, and both are turned into tiers **on read** — nothing
about a tier is persisted, so retuning a threshold reshapes existing saves
instead of stranding them.

**Enmity is not negative affection.** 苏芹 can be 交好 with you and still be
counting the coin you took. That contradiction is the point: write it, don't
resolve it. If you want someone to simply warm to you less, use a smaller
`bond`, not `enmity`.

Scale for `{ k: 'bond', n }`: `+2..3` politeness, `+5..6` a real choice,
`+8..12` the scene's best outcome, negatives for a betrayal you meant.

Scale for `{ k: 'enmity', who, n }` (default tiers — `ch_su` escalates slower,
`ch_que` faster):

| n | reads as | tier crossed |
|--:|----------|--------------|
| `+2..4` | a small rudeness, mostly forgotten | 无芥蒂 |
| `+6..10` | she remembers it | 记着这事 |
| `+18..24` | a real grievance | 怀恨 |
| `+40` | you made an enemy | 结了仇 |
| `-4..-8` | a mending scene: you paid it back, partly | — |

`{ k: 'forgive', who }` is the only thing that zeroes it. Use it once per grudge
arc, at the end, and make the player earn it.

### What the player actually sees

Never a number, and never the word 憎恶 in a player-facing string. Both axes
surface through the same `FeelingBeat`: the screen dims, one line floats in the
dialogue box, and it fades. Affection gains and eased grudges use the warm
(gold) skin; affection losses and new grudges use the cold (pale blue, no glow)
one. A tier crossing dims harder and holds longer, and also writes a 手记 entry.

The 人物 page prints two words — an affection tier chip, plus a grudge chip and
one line of prose *only if* enmity is nonzero. No digits, ever. If you find
yourself wanting to show "+6", write a better line instead.

### What a grudge does to the game

An open grudge shaves coin and renown, **but only in that character's home
town** (`enmityPay`), and the total is floored at 0.62 so collecting three
enemies cannot zero the loop. It shows in the strategy screen's rate breakdown
as 有人说你的坏话 — the player sees a consequence and a rumour, not a stat.

Enmity also decays in real time — faster while you are away from their town,
slower under their nose — and **stops at tier 1**. Time makes a feud into a
coolness; only a `forgive` scene makes it nothing.

### Authoring a grudge arc

Five beats, in this order. `content/story/scenes/grudges.ts` has three worked
examples (苏芹 / 阿雀 / 楮) — copy the shape.

1. **The temptation.** A scene where taking something is easy and nobody is
   watching. No enmity yet.
2. **Caught.** The consequence lands. `{ k: 'enmity', who, n }` here. Honesty
   should always cost less than the lie — usually half the enmity and a little
   bond.
3. **Cold texture.** A low-priority ambient scene gated on
   `{ k: 'grudge', who, min: 1 }`: the window seat is taken, the letter is not
   carried. Repeatable, `cooldownH`, cheap to write, and it is what makes the
   grudge feel real between the big beats.
4. **Mending.** Gated on `{ k: 'grudge', who, min: 2 }` — a real cost, and
   `{ k: 'enmity', who, n: -6 }`. Can fire more than once.
5. **Forgiveness.** Gated on `{ k: 'grudge', who, min: 1 }` plus proof of work
   (`seen` of the mending scene, or an item). Ends with
   `{ k: 'forgive', who }`.

```ts
// scene effects
{ k: 'enmity', who: 'ch_su', n: 10 }    // she remembers it
{ k: 'enmity', who: 'ch_su', n: -6 }    // you paid some of it back
{ k: 'forgive', who: 'ch_su' }          // struck off the ledger

// trigger conditions
{ k: 'grudge', who: 'ch_su', min: 1 }   // any open grudge, by tier
{ k: 'grudge', who: 'ch_su', max: 0 }   // clean slate required
{ k: 'enmity', who: 'ch_su', min: 18 }  // raw, for fine tuning
```

Gate on `grudge` (tier) rather than `enmity` (raw) for the same reason you gate
on `tier` rather than `bond`.

### Grudges gate warmth

Put `{ k: 'grudge', who, max: 0 }` on the deep bond scenes — `b_su_3`, `b_que_3`
and the like. Somebody who is still owed money does not tell you about her
father. This is the mechanism that makes a grudge *matter* without any UI: the
player notices the story went quiet and has to work out why.

## Missable content is a feature

姜聿's bond scenes require `main_4` to still be open, and chapter four closes that
door permanently. That is deliberate. Do not "fix" it by relaxing the condition —
the fact that a playthrough can lose someone is the reason the condition system
is worth having.

## Before you commit

```bash
npx tsc -b --pretty false     # types
npm run build
python3 ../walk_scenes.py     # plays EVERY scene in a browser, all branches
python3 ../smoke_story.py     # audit + migration + probability distribution
python3 ../smoke_enmity.py    # grudges: beats, gating, local penalty, decay
python3 ../smoke.py           # the rest of the game still works
```

`walk_scenes.py` is the one that catches authoring mistakes: an unreachable
label, a `goto` into nowhere, a branch that never terminates. One quirk worth
knowing: it ignores choice labels of three characters or fewer, so
`抱琴。` / `抱钱。` will hang it. Write labels a human would read anyway.

`smoke_enmity.py` asserts the hidden-stat contract, including that no cold beat
and no cast card ever prints a digit. If you add a line to
`content/enmity/text.ts`, run it.

In the browser console:

```js
__lyreAudit()               // unknown characters / items / dangling scene refs
__lyreScenes()              // every authored scene id
__lyre.why('collect')       // every trigger + exactly why it is or isn't eligible
__lyre.roll('collect', 500) // measured firing distribution over 500 rolls
__lyre.play('g_su_caught')  // force a scene
__lyre.feel('ch_su')        // both hidden axes + their tier labels
__lyre.rates()              // rate breakdown, including grudge penalties
```

`__lyre.why()` is the answer to "why didn't my scene fire". It reports the
router's own reasoning rather than your guess about it.
