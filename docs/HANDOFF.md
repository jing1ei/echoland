# Handoff — the prompt to hand this repo to another agent

Paste everything between the rules below into a fresh agent session. It is
written to be read cold: it says what the game is, what must stay true, where
things live, how to prove a change works, and what is still open.

---

You are taking over **The Wandering Lyre / 云游者**, a finished-and-shipping
mobile-first idle game. Read this brief, then `docs/ARCHITECTURE.md`,
`docs/STORY.md` and `docs/GM.md` before you touch anything. Work in
`wandering-lyre/`.

## 1. What the game is

A busking bard plays at scenic overlooks. The player leaves; time passes; they
come back to collect the takings (the "harvest"), read what happened while they
were away, set a simple strategy, and leave again. That loop is the product.

Around it:

- **Two kinds of map.** *Overlooks* are the idle stage and the thing the
  phone widget shows — procedural scenery, no UI, pretty. *Towns* are the
  exploration map paired to an overlook: shops, quests, shrines, taverns,
  minigames. Special overlooks and special town maps unlock from the story.
- **A story that gates everything.** The main line unlocks ordinary overlooks;
  side lines unlock special overlooks, instruments, sheet music and items. The
  main arc: the player is the last descendant of the 澹人, a people who could
  command the spirits of instruments; the 81 leaves of their ancestral score
  were stolen and scattered, and the game is recovering them.
- **AVG scenes** (a portrait, a line, a choice) fired by a trigger table on
  hooks: `open`, `collect`, `arrive`, `node`, `quest`.
- **Hidden relationships.** Affection and enmity are two separate numeric axes,
  and the player never sees either as a number — only prose, a word on a cast
  card, and a scene that does or does not happen.
- **Regional fame.** Fame is per-town, shown as one of five words, never a
  number. `renown` is the travelled name and works as a floor and a price tag.
- **Instruments** with proficiency, category bonuses, rarity, and spirits that
  wake at mastery. **Weather** and time of day move the takings. **Composing**
  spends inspiration to write new songs.

## 2. Invariants — break these and the game is a different game

1. **Content decides what; code decides how.** No prose, tuning number, colour
   or trigger threshold inside `src/game/` or `src/ui/`. Content lives in
   `src/content/<module>/{registry,values,text,art,audio,conditions}.ts`.
   Retuning must be one file, and never a grep.
2. **Hidden stats stay hidden.** No affection/enmity/fame number, bar, fraction
   or delta may reach the screen — not in a tooltip, not in a gate's reason
   text. They surface as a `FeelingBeat` (the screen dims, someone says
   something), as a word on the cast card, or as content that appears.
3. **Where a number may appear.** The bag/行囊 shows coin only. 名气 / 灵感 /
   闲暇 belong to the exploration screen. The stage keeps no permanent stat
   strip — tapping the scenery hides all UI on purpose. The compose sheet may
   print inspiration and leisure because it spends them.
4. **One writer per fact.** `grantFame` is the only thing that writes fame;
   `townOfOverlook` lives once, in `systems/fame.ts`; the value the satchel
   prints is the value the economy used, because both call the same function.
5. **The router is the only thing that decides what plays.** Scenes never
   check "should I run"; triggers do, through `Cond` data.
6. **Determinism where the player can see the seam.** Weather and stall
   visitors are a hash of (day, bucket, place), so the widget, the stage and
   the scene canvas agree and nothing flickers.
7. **The GM layer is removable.** Everything under `src/gm/` is behind
   `__GM__`; the release bundle must not contain it. `tests/smoke_gm.py`
   asserts both halves of that.
8. **No binary assets.** Scenery, portraits and every sound are procedural. A
   widget that downloads samples is not a widget.
9. **Old saves migrate, never wipe.** `engine.ts` sanitizes and back-fills;
   every new field needs a sane answer for a save that predates it.
10. **Chinese is the product language.** All player-facing copy is Chinese.
    Code comments explain *why*, in English, and are expected to be worth
    reading.

## 3. The map

```
src/content/     data only (see ARCHITECTURE.md for the module → file table)
src/content/audit.ts          the world audit: every cross-table reference
src/content/story/memories.ts flags written on purpose for a later callback
src/game/engine.ts            GameState, migration, accrue, computeRates
src/game/store.tsx            React context: persistence, clock, collect, hooks
src/game/systems/*            proficiency, performance, weather, spirits, bond,
                              enmity, fame, scores, compose, songs, visitors, beat
src/game/story/*              types, conditions, effects, runtime, router, registry
src/render/                   procedural canvas (scenery, portraits)
src/ui/                       screens and sheets
src/gm/                       debug layer, compiled out of release
tests/                        the browser suite; harness.py is shared
docs/                         ARCHITECTURE · STORY · GM · HANDOFF (this file)
```

## 4. How to work

```bash
cd wandering-lyre
npm install
npm run dev            # http://localhost:5173/?skipIntro=1
npm run check          # typecheck + both builds + the whole suite  <- the gate
```

Useful URL flags: `?skipIntro=1`, `?widget=1` (widget mode), `?hour=15.2`
(freeze the clock), `?tab=town|journal|satchel`, `?gm=1` (GM build only).

In the console: `__lyre.why('collect')` (every trigger and why it is or is not
eligible), `__lyre.feel('ch_su')`, `__lyre.rates()`, `__lyre.guests()`,
`__lyre.play('m1_ledger')`, `__lyreWorld()` (audit).

Rules of engagement:

- **`npm run check` must be green before you commit.** Two builds, the content
  audit at zero errors *and* zero advisories, and eight browser tests.
- **Seed test state through `harness.reseed`**, never a bare
  `localStorage.setItem` on a live page: the store persists 350ms after any
  state change and will silently overwrite you.
- **Add content, then let the audit tell you what you forgot.** A new item that
  nothing can obtain, a shelf with an unpriced good, a flag nobody reads — all
  of that is reported by `npm run audit`. If a flag is written deliberately for
  a callback you have not written yet, register it in
  `content/story/memories.ts` with one line about what it is for.
- **A new mechanic gets a smoke test that asserts the *requirement*,** not the
  implementation. Read `tests/smoke_enmity.py` for the house style: each block
  is a numbered claim in a comment and the failure message says what the player
  would have experienced.
- **Commit messages are Chinese, one line, about the player-visible change.**
  `git log --oneline` is the changelog.

Deploy: `npm run build`, then deploy `dist/` (never `dist-gm/`).

## 5. Where the seams are, if you are about to change something

- **Adding a scene / trigger / character** → `docs/STORY.md`. Effects and
  conditions are data (`{ k: 'bond', who, n }`, `{ k: 'grudge', who, max: 0 }`);
  if you need a new kind, add it to `story/types.ts`, then to `effects.ts` or
  `conditions.ts`, then to the describer so a gate can explain itself without
  printing a number, then to `content/audit.ts` so its references are checked.
- **Rebalancing the idle loop** → `content/overlooks` (base rates),
  `content/stances`, `content/upgrades`, `performance/values.ts`,
  `weather/values.ts`. `computeRates` only multiplies things together.
- **Offline earnings** → `engine.ts: accrue` + `windowRates`. Takings stop at
  `offlineCap`; the paid window is sampled once per weather bucket so a night
  away is not paid at the sky the player left behind.
- **Interrupted scenes** → `story.playing` in the save. A scene is marked seen
  and its trigger spent when it *opens*; if the app dies mid-dialogue the store
  re-queues that scene on the next boot so a once-only beat is not lost. The
  program counter is deliberately not persisted.
- **A new node kind on a town map** → also give it a find-chance in
  `scores/values.ts` and UI metadata in `TownView.tsx`; the audit fails on a
  kind that exists in only one of the three places.

## 6. Open items, in the order I would take them

1. **Fatigue and events use capped hours.** Coins stop at `offlineCap`, and so
   do encounters and stamina drain. Whether a fortnight away should still hand
   back a fortnight of *events* is a design call, not a bug — but it is the
   most player-visible remaining simplification.
2. **Proficiency over very long sessions** integrates at a flat rate for the
   fresh/tired split. A diminishing-returns curve over a single long absence
   would read better than "eight hours away taught you as much as eight
   separate hours".
3. **One chunk, ~600kB.** Vite warns. Splitting the story content and the
   render layer out of the entry chunk is the obvious first cut, but measure
   the widget's cold start before and after — that is the number that matters.
4. **Balance sweep.** Song and instrument prices grew scene by scene; a pass
   that lines price up against rarity and unlock order is overdue. Keep
   situational goods (weather-locked songs) cheap on purpose.
5. **Onboarding.** The old rules page was removed on purpose and never replaced
   by the intended guided first session.
6. **No lint config.** ESLint was never wired up; `tsc --noEmit` plus review is
   the current standard. If you add a config, add it to `npm run check`.

## 7. What "done" looks like for any change

- `npm run check` green, audit at zero errors and zero advisories.
- No number that must stay hidden appears on screen (`tests/smoke_bag.py` and
  `smoke_story.py` guard the known cases — extend them for new screens).
- An old save from before your change still loads and still plays.
- Comments explain the decision, not the syntax.

---
