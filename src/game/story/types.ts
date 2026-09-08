/* ============================================================
   Story system — schema
   ============================================================

   Four separate concepts, deliberately kept apart so each can grow
   without dragging the others along:

     Cond     — a pure predicate over game state ("can this happen?")
     Effect   — a pure state patch ("what did it change?")
     Scene    — an AVG script: an ordered list of Steps with labels
     Trigger  — the router entry: hook + Cond + probability -> Scene

   Content authors only ever touch Scene and Trigger tables. The
   evaluator, the applier and the interpreter never need editing to
   add story.
   ============================================================ */

import type { InstrumentCategoryId, MoodTag, NodeKind, Phase, WeatherRef } from '../types';

/* ------------------------------------------------------------
   Conditions
   ------------------------------------------------------------ */

export type Cond =
  /* structural */
  | { k: 'all'; of: Cond[] }
  | { k: 'any'; of: Cond[] }
  | { k: 'not'; of: Cond }

  /* progression */
  | { k: 'flag'; id: string; off?: boolean }
  | { k: 'var'; id: string; min?: number; max?: number; eq?: number }
  | { k: 'chapter'; min?: number; max?: number }
  | { k: 'quest'; id: string; is: 'done' | 'active' | 'open' }

  /* people — two independent hidden axes, see game/systems/{bond,enmity}.ts.
     Someone can be fond of you and still hold something against you; the
     interesting scenes are the ones that ask for both at once. */
  | { k: 'met'; who: string; off?: boolean }
  | { k: 'bond'; who: string; min?: number; max?: number }
  /** tier index, 0 = stranger; see Character.tiers */
  | { k: 'tier'; who: string; min?: number; max?: number }
  /** raw grudge points; prefer `grudge` unless you mean an exact amount */
  | { k: 'enmity'; who: string; min?: number; max?: number }
  /** grudge tier index, 0 = nothing between you; see content/enmity/registry.ts */
  | { k: 'grudge'; who: string; min?: number; max?: number }

  /* wallet & standing */
  | { k: 'coin' | 'insp' | 'renown' | 'leisure'; min?: number; max?: number }
  /** how well this town knows you, as a *tier* 0..4 (content/fame). Omit
      `town` for wherever you are standing; prefer this over `renown`,
      which is the reputation that travels rather than the local one. */
  | { k: 'fame'; town?: string; min?: number; max?: number }
  | { k: 'totalCoin'; min?: number }
  | { k: 'collects'; min?: number; max?: number }

  /* where you are */
  | { k: 'overlook'; ids: string[] }
  | { k: 'town'; ids: string[] }
  | { k: 'mood'; tags: MoodTag[] }
  | { k: 'phase'; of: Phase[] }
  /** ids or group ids — `of: ['rain']` covers every kind of rain */
  | { k: 'weather'; of: WeatherRef[] }

  /* the eighty-one — your people's library, see game/systems/scores.ts.
     `vol` asks about one volume's pages, `done` asks for whole volumes,
     and the bare form asks how many leaves you have brought home. */
  | { k: 'score'; vol?: string; min?: number; max?: number }
  | { k: 'volumes'; min?: number; max?: number }

  /* what you carry */
  | { k: 'item'; id: string; min?: number }
  | { k: 'song'; id: string; off?: boolean }
  | { k: 'instrument'; id: string; off?: boolean; held?: boolean }
  | { k: 'upgrade'; id: string }

  /* craft — see content/proficiency/conditions.ts for the builders */
  /** effective proficiency on one instrument; `own: true` ignores the
      category bonus and asks what the player personally practised */
  | { k: 'prof'; id: string; min?: number; max?: number; own?: boolean }
  /** the permanent shared bonus of a whole playing technique */
  | { k: 'profCat'; cat: InstrumentCategoryId; min?: number; max?: number }

  /* who is standing at the stall right now — see
     content/visitors/conditions.ts for the builder. Omit `id` for
     "anyone unusual". Computed from the clock, never stored. */
  | { k: 'guest'; id?: string }

  /* story bookkeeping */
  | { k: 'seen'; scene: string; min?: number; max?: number }
  /** real hours since a scene last played (never played = Infinity) */
  | { k: 'sinceScene'; scene: string; minH?: number }
  /** real hours since first meeting someone */
  | { k: 'sinceMet'; who: string; minH?: number };

/* ------------------------------------------------------------
   Effects
   ------------------------------------------------------------ */

export type Effect =
  /* currency. `hours: true` means "n hours of current income" so a
     reward stays meaningful in chapter 1 and in chapter 9 alike */
  | { k: 'coin' | 'insp'; n: number; hours?: boolean }
  /** `renown` earns *local* fame in the town you are standing in, and a
      slice of it travels (game/systems/fame.ts). There is deliberately no
      effect that writes the travelled name directly. */
  | { k: 'renown' | 'leisure'; n: number }

  | { k: 'bond'; who: string; n: number }
  /** a grudge. positive earns one, negative lets it go — see
      game/systems/enmity.ts. Never fold this into a negative `bond`:
      being disliked and being resented are different states. */
  | { k: 'enmity'; who: string; n: number }
  /** wipe the slate clean; the one route back from a deep grudge */
  | { k: 'forgive'; who: string }
  | { k: 'meet'; who: string }

  | { k: 'flag'; id: string; off?: boolean }
  | { k: 'var'; id: string; add?: number; set?: number }
  | { k: 'chapter'; set: number }

  | { k: 'item'; id: string; n?: number }
  | { k: 'song' | 'instrument' | 'overlook' | 'map' | 'upgrade'; id: string }
  /** hand back one of the eighty-one. Omit `id` for "whatever page this
      region still owes you" — the pick lives in game/systems/scores.ts. */
  | { k: 'score'; id?: string }

  | { k: 'quest'; id: string; start?: boolean }

  /** queue another scene to play after this one ends */
  | { k: 'queue'; scene: string }
  | { k: 'journal'; title: string; body: string };

/* ------------------------------------------------------------
   Scenes
   ------------------------------------------------------------ */

export type Expression =
  | 'calm'
  | 'smile'
  | 'laugh'
  | 'sad'
  | 'cross'
  | 'shock'
  | 'shy'
  | 'think'
  | 'away';

export type Side = 'left' | 'right' | 'center';

export interface Choice {
  label: string;
  /** small grey line under the label */
  hint?: string;
  /** hidden entirely unless this holds */
  if?: Cond;
  /** shown but disabled unless this holds, with `lockNote` as the reason */
  need?: Cond;
  lockNote?: string;
  do?: Effect[];
  goto?: string;
  /** 0..1 — the choice may simply not work out */
  chance?: number;
  /** taken when the `chance` roll fails */
  miss?: { goto?: string; do?: Effect[]; text?: string };
}

export type Step =
  /** a line of dialogue, or narration when `who` is omitted */
  | { t: 'say'; who?: string; as?: Expression; side?: Side; text: string; if?: Cond; do?: Effect[] }
  /** jump target */
  | { t: 'at'; id: string }
  | { t: 'goto'; to: string; if?: Cond }
  | { t: 'do'; do: Effect[]; if?: Cond }
  /** branch on a probability roll */
  | { t: 'roll'; chance: number; hit: string; miss: string }
  /** who is on stage; `exit` removes them */
  | { t: 'enter'; who: string; side?: Side; as?: Expression }
  | { t: 'exit'; who?: string }
  /** change the backdrop mid-scene */
  | { t: 'bg'; overlook?: string; town?: string }
  | { t: 'choose'; prompt?: string; options: Choice[] }
  | { t: 'end' };

export type StoryLine = 'main' | 'side' | 'bond' | 'ambient';

export interface Scene {
  id: string;
  /** shown on the title card and in the story log */
  title: string;
  line: StoryLine;
  /** which chapter's index this belongs to, for the story log */
  chapter?: number;
  /** backdrop; defaults to wherever the player currently is */
  overlook?: string;
  /** replayable scenes can fire more than once */
  repeatable?: boolean;
  steps: Step[];
}

/* ------------------------------------------------------------
   Triggers
   ------------------------------------------------------------ */

export type Hook =
  /** app opened / returned to foreground with the stage visible */
  | 'open'
  /** the collect ("harvest") sheet was just dismissed */
  | 'collect'
  /** the player switched overlook */
  | 'arrive'
  /** a town node was visited */
  | 'node'
  /** a quest was just claimed */
  | 'quest';

export interface Trigger {
  id: string;
  scene: string;
  on: Hook[];
  /** for the `node` hook: restrict to these node kinds and/or ids */
  nodeKinds?: NodeKind[];
  nodeIds?: string[];
  when?: Cond;
  /** 0..1. Story beats that must land use 1. */
  chance: number;
  /** higher fires first; main line should outrank ambient chatter */
  priority?: number;
  once?: boolean;
  /** real hours before this trigger may fire again */
  cooldownH?: number;
  line: StoryLine;
}

/* ------------------------------------------------------------
   Characters
   ------------------------------------------------------------ */

export interface PortraitSpec {
  skin: string;
  hair: string;
  hair2: string;
  /** hair silhouette */
  cut: 'long' | 'bob' | 'bun' | 'crop' | 'braid' | 'hood' | 'wild' | 'tail';
  robe: string;
  robe2: string;
  /** collar / shoulder shape */
  garb: 'coat' | 'apron' | 'robe' | 'cloak' | 'vest' | 'wrap';
  accent: string;
  prop?: 'earring' | 'glasses' | 'scarf' | 'pipe' | 'beads' | 'ribbon' | 'bandage';
  /** 0 = slight, 1 = broad */
  build: number;
  /** rough age tint of the linework */
  years: 'young' | 'adult' | 'old';
}

export interface Character {
  id: string;
  name: string;
  nameEn: string;
  /** one-word role shown under the name in the cast list */
  role: string;
  /** home town id — used by the cast list, not by triggers */
  home: string;
  blurb: string;
  look: PortraitSpec;
  /** ascending thresholds. tiers[0].at must be 0. */
  tiers: { at: number; label: string }[];
}

/* ------------------------------------------------------------
   The persisted story slice
   ------------------------------------------------------------ */

export interface StoryState {
  chapter: number;
  /** character id -> affection points */
  bond: Record<string, number>;
  /** character id -> grudge points. Absent = clean slate. */
  enmity: Record<string, number>;
  /** when grudges were last aged; see systems/enmity.decayEnmity */
  enmityAt: number;
  /** character id -> first-met timestamp */
  met: Record<string, number>;
  /** scene id -> times played */
  seen: Record<string, number>;
  /** scene id -> last played timestamp */
  seenAt: Record<string, number>;
  /** trigger id -> last fired timestamp */
  fired: Record<string, number>;
  /** authored counters, e.g. how many times you lied to someone */
  vars: Record<string, number>;
  /** scenes waiting to be played, in order */
  queue: string[];
  /** the scene on screen right now, cleared when it ends. If a save comes
      back with this set, the player closed the app mid-scene: store.tsx
      re-queues it on load rather than letting a once-only beat vanish. */
  playing?: string | null;
}

export function freshStory(): StoryState {
  return {
    chapter: 1,
    bond: {},
    enmity: {},
    enmityAt: Date.now(),
    met: {},
    seen: {},
    seenAt: {},
    fired: {},
    vars: {},
    queue: [],
    playing: null,
  };
}
