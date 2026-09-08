import type { GameState } from '../engine';
import { skyState } from '../engine';
import type { Cond } from '../story/types';
import type { CondCtx } from '../story/conditions';
import { OVERLOOK_MAP } from '../../content/overlooks';
import {
  VISITOR_ART,
  VISITOR_GATES,
  VISITOR_SPECS,
  VISITOR_SPEC_MAP,
  VISITOR_VALUES,
  type VisitorArt,
  type VisitorSpec,
} from '../../content/visitors';
import { weatherMatches } from './weather';
import { hash32, rand01 } from '../rng';
import { devGuest } from '../devFlags';

/* ============================================================
   STALL VISITORS — core

   Who is standing at your stall right now, computed rather than stored.

   The clock is cut into windows. Each window rolls once, on a seed made
   of the window index and the place, so the answer is the same for the
   app, the widget and the story router without a byte of save data and
   without anything to desync. Inside its window, the figure lingers for
   `dwellMin` — long enough to be noticed by someone who opens the app
   to collect, short enough that seeing one still means something.

   The evaluator for gates is injected. This module must not import
   game/story/conditions.ts, because that module asks *this* one whether
   a guest is present (the `guest` condition kind) — dependency
   injection keeps the two out of a cycle and keeps the promise that
   there is exactly one condition evaluator.
   ============================================================ */

export type CondTest = (s: GameState, c: Cond | undefined, ctx: CondCtx) => boolean;

export interface StallGuest {
  spec: VisitorSpec;
  art: VisitorArt;
  /** when this figure showed up, and when it will be gone */
  since: number;
  until: number;
}

const windowMs = () => VISITOR_VALUES.windowMin * 60000;
const dwellMs = () => VISITOR_VALUES.dwellMin * 60000;

/** every figure allowed at this place, at this hour, under this sky */
function eligible(s: GameState, now: number, test: CondTest): VisitorSpec[] {
  const ov = OVERLOOK_MAP[s.overlook];
  if (!ov) return [];
  const sky = skyState(now, s.overlook);
  const ctx: CondCtx = { now };

  return VISITOR_SPECS.filter((v) => {
    if (v.overlooks && v.overlooks.length && !v.overlooks.includes(ov.id)) return false;
    if (v.moods && v.moods.length && !v.moods.some((m) => ov.moods.includes(m))) return false;
    if (v.phases && v.phases.length && !v.phases.includes(sky.phase)) return false;
    if (v.weather && v.weather.length && !weatherMatches(sky.weather, v.weather)) return false;
    /* a rumour of someone you have already properly met is not a rumour */
    if (v.untilMet && v.character && s.story.met[v.character]) return false;
    if (v.gate) {
      const gate = VISITOR_GATES[v.gate];
      if (gate && !test(s, gate, ctx)) return false;
    }
    return true;
  });
}

function weightedPick(list: VisitorSpec[], r: number): VisitorSpec | null {
  const total = list.reduce((a, v) => a + Math.max(0, v.weight), 0);
  if (total <= 0) return null;
  let x = r * total;
  for (const v of list) {
    x -= Math.max(0, v.weight);
    if (x <= 0) return v;
  }
  return list[list.length - 1] ?? null;
}

/** one draw slot: does slot `k` of this window hold anyone, and who */
function drawSlot(
  s: GameState,
  now: number,
  k: number,
  pool: VisitorSpec[],
): StallGuest | null {
  const win = windowMs();
  const bucket = Math.floor(now / win);
  const seed = hash32('visitor', s.overlook, bucket, k);

  if (rand01(seed) >= VISITOR_VALUES.chance) return null;

  /* when inside the window they are actually there */
  const dwell = Math.min(dwellMs(), win);
  const spare = Math.max(0, win - dwell);
  const since = bucket * win + rand01(hash32(seed, 'when')) * spare * VISITOR_VALUES.dwellJitter;
  const until = since + dwell;
  if (now < since || now > until) return null;

  const spec = weightedPick(pool, rand01(hash32(seed, 'who')));
  if (!spec) return null;

  /* No caption is computed here on purpose: the figure is drawn, never
     narrated. See content/visitors/text.ts. */
  return { spec, art: VISITOR_ART[spec.art] ?? VISITOR_ART.hood, since, until };
}

/* ------------------------------------------------------------
   Memo

   The render loop asks this up to 48 times a second and the answer only
   changes on a minute scale. Cache on the inputs that matter.
   ------------------------------------------------------------ */
let memo: { key: string; out: StallGuest[] } | null = null;

export function currentVisitors(s: GameState, now: number, test: CondTest): StallGuest[] {
  /* the key is coarse on purpose: a guest arriving mid-window must still
     be picked up within a few seconds. The dev override is part of the key
     so pinning a figure in the GM layer shows up on the next frame instead
     of after the cache expires. */
  const key = [
    s.overlook,
    Math.floor(now / 15000),
    s.renown | 0,
    s.collects | 0,
    Object.keys(s.story.met).length,
    devGuest() ?? '',
  ].join('|');
  if (memo && memo.key === key) return memo.out;

  /* GM override: pin one figure at the stall so its scene can be tested
     without waiting for a window to land (src/game/devFlags.ts) */
  const forced = devGuest();
  if (forced) {
    const spec = VISITOR_SPEC_MAP[forced];
    if (spec) {
      const out = [
        {
          spec,
          art: VISITOR_ART[spec.art] ?? VISITOR_ART.hood,
          since: now,
          until: now + dwellMs(),
        },
      ];
      memo = { key, out };
      return out;
    }
  }

  const pool = eligible(s, now, test);
  const out: StallGuest[] = [];
  for (let k = 0; k < VISITOR_VALUES.maxAtOnce; k++) {
    const g = drawSlot(s, now, k, pool);
    if (g && !out.some((o) => o.spec.id === g.spec.id)) out.push(g);
  }
  memo = { key, out };
  return out;
}

/** the one figure worth mentioning, if any */
export function currentVisitor(s: GameState, now: number, test: CondTest): StallGuest | null {
  return currentVisitors(s, now, test)[0] ?? null;
}

/** does `id` (or anyone at all) stand at the stall right now */
export function guestPresent(
  s: GameState,
  now: number,
  test: CondTest,
  id?: string,
): boolean {
  const list = currentVisitors(s, now, test);
  return id ? list.some((g) => g.spec.id === id) : list.length > 0;
}

export const visitorSpec = (id: string) => VISITOR_SPEC_MAP[id];

/** authoring aid: forget the cached draw (the GM layer changes state under us) */
export const forgetVisitorMemo = () => {
  memo = null;
};
