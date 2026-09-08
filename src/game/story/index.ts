/* ============================================================
   Story system — public surface

   Everything the rest of the app is allowed to touch lives here.
   The UI imports from `game/story`, never from the internals, so the
   interpreter and the router stay free to change shape.
   ============================================================ */

export type {
  Cond,
  Effect,
  Choice,
  Step,
  Scene,
  Trigger,
  Hook,
  StoryLine,
  Character,
  PortraitSpec,
  Expression,
  Side,
  StoryState,
} from './types';
export { freshStory } from './types';

export { test, describe, missing, type CondCtx } from './conditions';
export { apply, mergeNotes, type Note, type NoteKind } from './effects';
export {
  startScene,
  run,
  choose,
  auditScene,
  type Runner,
  type Out,
  type Advance,
  type ResolvedChoice,
} from './runtime';
export { pickScene, probeTriggers, type HookCtx, type Pick, type TriggerProbe } from './router';
export { SCENES, SCENE_MAP, TRIGGERS, CHARACTERS, CHARACTER_MAP } from './registry';
export { tierIndex, tierLabel, tierProgress } from './tiers';
/* the two hidden axes reach the UI only as sentences — a beat while a
   scene is playing, a line on the cast card afterwards */
export type { FeelingBeat, BeatTone } from '../systems/beat';
export { closeness, castNote, bondBeat } from '../systems/bond';
export {
  enmityIndex,
  enmityLabel,
  enmityOf,
  hasGrudge,
  grudgeLine,
  enmityCastNote,
  enmityBeat,
} from '../systems/enmity';
export { guestAt, guestsAt, type StallGuest } from './guests';

/* ------------------------------------------------------------
   Content audit

   Runs once, in dev only. A mistyped label or an unknown character id
   is a content bug that should shout during authoring rather than
   quietly ending a scene in a player's face.
   ------------------------------------------------------------ */

import { SCENES as ALL, TRIGGERS, CHARACTERS, SCENE_MAP as MAP } from './registry';
import { auditScene as audit } from './runtime';

export function auditContent(): string[] {
  const known = new Set(CHARACTERS.map((c) => c.id));
  const problems = ALL.flatMap((s) => audit(s, known));
  TRIGGERS.forEach((t) => {
    if (!MAP[t.scene]) problems.push(`trigger ${t.id} 指向不存在的场景 "${t.scene}"`);
    if (t.chance <= 0 || t.chance > 1) problems.push(`trigger ${t.id} 的 chance 不在 (0,1] 内`);
    if (t.on.includes('node') && !t.nodeIds && !t.nodeKinds && (t.priority ?? 0) >= 70) {
      /* a high-priority node trigger with no target will hijack every
         single node visit — almost always a mistake */
      problems.push(`trigger ${t.id} 挂在 node 上但没有限定 nodeIds/nodeKinds`);
    }
  });
  return problems;
}

/* One scene's shape is checked here; the references *between* content
   tables are checked by content/audit.ts, which calls this and adds its
   own findings. That file owns the window hook and the dev warning, so
   there is a single place a content bug shows up. */

/* Kept in production too: the scene walker enumerates content from the
   real bundle rather than a hardcoded list that goes stale the moment
   someone writes a new chapter. */
if (typeof window !== 'undefined') {
  (window as unknown as { __lyreScenes?: () => string[] }).__lyreScenes = () =>
    ALL.map((s) => s.id);
}
