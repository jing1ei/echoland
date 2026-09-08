import type { Hook, Trigger } from './types';
import type { GameState } from '../engine';
import type { NodeKind } from '../types';
import { test, type CondCtx } from './conditions';
import { SCENE_MAP, TRIGGERS } from './registry';

/* ============================================================
   Trigger routing

   The order of business, every time the game asks "does anything
   happen right now?":

     1. anything explicitly queued by a previous scene plays first —
        a story that says "we'll talk tomorrow" must keep its word
     2. collect the triggers wired to this hook
     3. drop the ones whose conditions do not hold, that already
        fired their one time, or that are still cooling down
     4. take the highest priority band still standing — main story
        outranks a bond scene outranks ambient chatter
     5. inside that band, shuffle and roll each `chance` in turn;
        first hit wins, and a whole band can miss

   Step 5 is why the same conditions do not always produce the same
   scene: meeting the requirement buys you a ticket, not the prize.
   ============================================================ */

export interface HookCtx extends CondCtx {
  hook: Hook;
  nodeId?: string;
  nodeKind?: NodeKind;
}

export interface Pick {
  sceneId: string;
  /** null for a queued scene, which is not gated by a trigger */
  triggerId: string | null;
}

function playable(s: GameState, t: Trigger, ctx: HookCtx): boolean {
  const scene = SCENE_MAP[t.scene];
  if (!scene) return false;

  /* a non-repeatable scene is spent no matter which trigger points at it */
  if (!scene.repeatable && (s.story.seen[t.scene] ?? 0) > 0) return false;

  if (t.once && s.story.fired[t.id]) return false;
  if (t.cooldownH) {
    const last = s.story.fired[t.id];
    if (last != null && (ctx.now - last) / 3600000 < t.cooldownH) return false;
  }
  if (!t.on.includes(ctx.hook)) return false;
  if (ctx.hook === 'node') {
    if (t.nodeIds && !(ctx.nodeId && t.nodeIds.includes(ctx.nodeId))) return false;
    if (t.nodeKinds && !(ctx.nodeKind && t.nodeKinds.includes(ctx.nodeKind))) return false;
  }
  return test(s, t.when, ctx);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickScene(s: GameState, ctx: HookCtx, rng: () => number = Math.random): Pick | null {
  /* 1 — promises first */
  const queued = s.story.queue.find((id) => SCENE_MAP[id]);
  if (queued) return { sceneId: queued, triggerId: null };

  /* 2-3 */
  const live = TRIGGERS.filter((t) => playable(s, t, ctx));
  if (live.length === 0) return null;

  /* 4 — walk the priority bands from the top so a missed main beat can
     still let ambient chatter through on the same visit */
  const bands = [...new Set(live.map((t) => t.priority ?? 0))].sort((a, b) => b - a);
  for (const band of bands) {
    const pool = shuffle(
      live.filter((t) => (t.priority ?? 0) === band),
      rng,
    );
    for (const t of pool) {
      if (rng() < t.chance) return { sceneId: t.scene, triggerId: t.id };
    }
  }
  return null;
}

/* ------------------------------------------------------------
   Diagnostics — used by the cast screen and by tests
   ------------------------------------------------------------ */

export interface TriggerProbe {
  trigger: Trigger;
  eligible: boolean;
  reason: string;
}

export function probeTriggers(s: GameState, ctx: HookCtx): TriggerProbe[] {
  return TRIGGERS.filter((t) => t.on.includes(ctx.hook)).map((t) => {
    const scene = SCENE_MAP[t.scene];
    let reason = '可以触发';
    let eligible = true;
    if (!scene) {
      reason = '场景不存在';
      eligible = false;
    } else if (!scene.repeatable && (s.story.seen[t.scene] ?? 0) > 0) {
      reason = '已经演过';
      eligible = false;
    } else if (t.once && s.story.fired[t.id]) {
      reason = '只触发一次';
      eligible = false;
    } else if (
      t.cooldownH &&
      s.story.fired[t.id] != null &&
      (ctx.now - s.story.fired[t.id]) / 3600000 < t.cooldownH
    ) {
      reason = '冷却中';
      eligible = false;
    } else if (!test(s, t.when, ctx)) {
      reason = '条件不满足';
      eligible = false;
    }
    return { trigger: t, eligible, reason };
  });
}
