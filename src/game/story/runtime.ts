import type { Choice, Expression, Scene, Side, Step } from './types';
import type { GameState } from '../engine';
import { test, type CondCtx } from './conditions';
import { apply, mergeNotes, type Note } from './effects';
import { SCENE_MAP } from './registry';

/* ============================================================
   Scene interpreter

   A scene is a flat list of steps plus jump labels. The runner is a
   program counter over that list. Everything it produces is data, so
   the AVG view is a dumb renderer and the whole thing is testable
   without React.

   Deliberately NOT a tree of nested branches: flat + labels means a
   writer can insert a beat anywhere without re-indenting a pyramid,
   and the save only needs to remember an integer.
   ============================================================ */

export interface CastMember {
  who: string;
  side: Side;
  as: Expression;
}

export interface Runner {
  sceneId: string;
  pc: number;
  cast: CastMember[];
  bg: { overlook?: string; town?: string };
  /** synthetic narration waiting to be shown (failed-roll blurbs) */
  inject: string[];
  /** true once an `end` step or the end of the list was reached */
  finished: boolean;
}

export interface ResolvedChoice {
  index: number;
  label: string;
  hint?: string;
  enabled: boolean;
  lockNote?: string;
  /** shown as a subtle warning: this one might not work */
  chance?: number;
}

export type Out =
  | { t: 'say'; who?: string; as: Expression; side: Side; text: string }
  | { t: 'choose'; prompt?: string; options: ResolvedChoice[] }
  | { t: 'end' };

export interface Advance {
  rt: Runner;
  state: GameState;
  out: Out;
  notes: Note[];
}

export type Rng = () => number;

const MAX_STEPS = 4000;

function labelIndex(scene: Scene): Record<string, number> {
  const m: Record<string, number> = {};
  scene.steps.forEach((s, i) => {
    if (s.t === 'at') m[s.id] = i;
  });
  return m;
}

/** last speaker's slot, so a reply appears on the side they entered on */
function sideOf(rt: Runner, who?: string, override?: Side): Side {
  if (override) return override;
  if (!who) return 'center';
  return rt.cast.find((c) => c.who === who)?.side ?? 'center';
}

export function startScene(
  sceneId: string,
  state: GameState,
  ctx: CondCtx,
  rng: Rng = Math.random,
): Advance | null {
  const scene = SCENE_MAP[sceneId];
  if (!scene) return null;
  const rt: Runner = {
    sceneId,
    pc: 0,
    cast: [],
    bg: { overlook: scene.overlook },
    inject: [],
    finished: false,
  };
  return run(rt, state, ctx, rng);
}

/** advance from wherever the runner is until the next visible frame */
export function run(rt0: Runner, state0: GameState, ctx: CondCtx, rng: Rng = Math.random): Advance {
  let rt: Runner = { ...rt0, cast: [...rt0.cast], inject: [...rt0.inject], bg: { ...rt0.bg } };
  let state = state0;
  const notes: Note[] = [];

  /* queued narration from a failed roll takes precedence */
  if (rt.inject.length) {
    const text = rt.inject[0];
    rt.inject = rt.inject.slice(1);
    return { rt, state, out: { t: 'say', as: 'calm', side: 'center', text }, notes };
  }

  const scene = SCENE_MAP[rt.sceneId];
  if (!scene) return { rt: { ...rt, finished: true }, state, out: { t: 'end' }, notes };
  const labels = labelIndex(scene);

  let guard = 0;
  while (rt.pc < scene.steps.length) {
    if (++guard > MAX_STEPS) break;
    const step: Step = scene.steps[rt.pc];

    switch (step.t) {
      case 'at':
        rt.pc += 1;
        break;

      case 'do': {
        if (test(state, step.if, ctx)) {
          const r = apply(state, step.do, ctx.now);
          state = r.state;
          notes.push(...r.notes);
        }
        rt.pc += 1;
        break;
      }

      case 'goto': {
        if (test(state, step.if, ctx)) {
          const target = labels[step.to];
          rt.pc = target == null ? scene.steps.length : target;
        } else {
          rt.pc += 1;
        }
        break;
      }

      case 'roll': {
        const hit = rng() < step.chance;
        const target = labels[hit ? step.hit : step.miss];
        rt.pc = target == null ? scene.steps.length : target;
        break;
      }

      case 'enter': {
        const side = step.side ?? (rt.cast.length === 0 ? 'left' : 'right');
        rt.cast = [
          ...rt.cast.filter((c) => c.who !== step.who),
          { who: step.who, side, as: step.as ?? 'calm' },
        ];
        rt.pc += 1;
        break;
      }

      case 'exit':
        rt.cast = step.who ? rt.cast.filter((c) => c.who !== step.who) : [];
        rt.pc += 1;
        break;

      case 'bg':
        rt.bg = { overlook: step.overlook ?? rt.bg.overlook, town: step.town ?? rt.bg.town };
        rt.pc += 1;
        break;

      case 'say': {
        if (!test(state, step.if, ctx)) {
          rt.pc += 1;
          break;
        }
        if (step.do) {
          const r = apply(state, step.do, ctx.now);
          state = r.state;
          notes.push(...r.notes);
        }
        /* an expression on a line updates the standing portrait too */
        if (step.who && step.as) {
          rt.cast = rt.cast.map((c) => (c.who === step.who ? { ...c, as: step.as! } : c));
        }
        if (step.who && !rt.cast.some((c) => c.who === step.who)) {
          rt.cast = [
            ...rt.cast,
            { who: step.who, side: step.side ?? (rt.cast.length === 0 ? 'left' : 'right'), as: step.as ?? 'calm' },
          ];
        }
        rt.pc += 1;
        return {
          rt,
          state,
          out: {
            t: 'say',
            who: step.who,
            as: step.as ?? rt.cast.find((c) => c.who === step.who)?.as ?? 'calm',
            side: sideOf(rt, step.who, step.side),
            text: step.text,
          },
          notes: mergeNotes(notes),
        };
      }

      case 'choose': {
        const options: ResolvedChoice[] = [];
        step.options.forEach((o, i) => {
          if (o.if && !test(state, o.if, ctx)) return; // hidden
          const enabled = !o.need || test(state, o.need, ctx);
          options.push({
            index: i,
            label: o.label,
            hint: o.hint,
            enabled,
            lockNote: enabled ? undefined : o.lockNote,
            chance: o.chance,
          });
        });
        /* a prompt with nothing selectable would soft-lock the scene */
        if (options.length === 0) {
          rt.pc += 1;
          break;
        }
        return { rt, state, out: { t: 'choose', prompt: step.prompt, options }, notes: mergeNotes(notes) };
      }

      case 'end':
        rt.pc = scene.steps.length;
        break;
    }
  }

  rt.finished = true;
  return { rt, state, out: { t: 'end' }, notes: mergeNotes(notes) };
}

/** resolve a `choose` step. `index` is the authored option index. */
export function choose(
  rt0: Runner,
  state0: GameState,
  ctx: CondCtx,
  index: number,
  rng: Rng = Math.random,
): Advance {
  const scene = SCENE_MAP[rt0.sceneId];
  const step = scene?.steps[rt0.pc];
  if (!scene || !step || step.t !== 'choose') return run(rt0, state0, ctx, rng);
  const opt: Choice | undefined = step.options[index];
  if (!opt) return run(rt0, state0, ctx, rng);

  const labels = labelIndex(scene);
  let rt: Runner = { ...rt0, cast: [...rt0.cast], inject: [...rt0.inject], bg: { ...rt0.bg } };
  let state = state0;
  const notes: Note[] = [];

  const hit = opt.chance == null || rng() < opt.chance;
  const branch = hit ? { goto: opt.goto, do: opt.do, text: undefined as string | undefined } : {
    goto: opt.miss?.goto ?? opt.goto,
    do: opt.miss?.do,
    text: opt.miss?.text,
  };

  if (branch.do) {
    const r = apply(state, branch.do, ctx.now);
    state = r.state;
    notes.push(...r.notes);
  }
  if (branch.text) rt.inject = [...rt.inject, branch.text];

  if (branch.goto) {
    const target = labels[branch.goto];
    rt.pc = target == null ? scene.steps.length : target;
  } else {
    rt.pc = rt0.pc + 1;
  }

  const next = run(rt, state, ctx, rng);
  return { ...next, notes: mergeNotes([...notes, ...next.notes]) };
}

/* ============================================================
   Authoring safety net

   Called once at module load in dev. A typo'd label or a scene that
   references a character that does not exist is a content bug that
   should be loud, not a dialogue box that silently ends.
   ============================================================ */

export function auditScene(scene: Scene, knownChars: Set<string>): string[] {
  const problems: string[] = [];
  const labels = new Set(scene.steps.filter((s) => s.t === 'at').map((s) => (s as { id: string }).id));
  const jump = (to: string, where: string) => {
    if (!labels.has(to)) problems.push(`${scene.id}: ${where} 跳到不存在的标签 "${to}"`);
  };
  scene.steps.forEach((s, i) => {
    if (s.t === 'goto') jump(s.to, `step ${i}`);
    if (s.t === 'roll') {
      jump(s.hit, `step ${i} hit`);
      jump(s.miss, `step ${i} miss`);
    }
    if (s.t === 'choose') {
      s.options.forEach((o, k) => {
        if (o.goto) jump(o.goto, `step ${i} option ${k}`);
        if (o.miss?.goto) jump(o.miss.goto, `step ${i} option ${k} miss`);
        if (o.need && !o.lockNote) problems.push(`${scene.id}: step ${i} option ${k} 有 need 但没有 lockNote`);
      });
    }
    if ((s.t === 'say' && s.who) || s.t === 'enter') {
      const who = s.t === 'say' ? s.who! : s.who;
      if (!knownChars.has(who)) problems.push(`${scene.id}: step ${i} 引用了未知人物 "${who}"`);
    }
  });
  return problems;
}
