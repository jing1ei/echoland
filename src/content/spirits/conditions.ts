import type { Cond } from '../../game/story/types';
import { masteredInHand } from '../proficiency/conditions';
import type { SpiritSpec } from './registry';

/* ============================================================
   INSTRUMENT SPIRITS — conditions

   The one non-negotiable gate: the spirit's own instrument is in hand
   and has been played to maximum proficiency. `masteredInHand` comes
   from content/proficiency/conditions.ts, so "what counts as mastered"
   still lives with the proficiency numbers.

   Anything else a spirit wants is a key into SPIRIT_EXTRA_CONDITIONS,
   referenced by name from registry.ts. Registry rows stay readable
   (`extraCondition: 'atNight'`) and the predicate stays data.
   ============================================================ */

export const SPIRIT_EXTRA_CONDITIONS: Record<string, Cond> = {
  /** it will not show itself in daylight */
  atNight: { k: 'phase', of: ['night'] },
  /** only where there is sea below, or sea overhead */
  aboveTheSea: { k: 'mood', tags: ['sea'] },
  /** after you have packed up the stall enough times to be a fixture */
  wellTravelled: { k: 'collects', min: 12 },
  /** in weather that hides a stranger */
  underRain: { k: 'weather', of: ['rain', 'fog'] },
};

/** the mastery gate, plus whatever else the spirit asks for */
export function spiritGate(spec: SpiritSpec, extra?: Cond): Cond {
  const of: Cond[] = [masteredInHand(spec.instrument)];
  const named = spec.extraCondition ? SPIRIT_EXTRA_CONDITIONS[spec.extraCondition] : undefined;
  if (named) of.push(named);
  if (extra) of.push(extra);
  return { k: 'all', of };
}

/** first meeting: the gate, and it has not happened yet */
export const spiritUnmet = (spec: SpiritSpec): Cond =>
  spiritGate(spec, { k: 'flag', id: spec.flag, off: true });

/** a later visit: the gate, and it has happened at least once */
export const spiritKnown = (spec: SpiritSpec): Cond =>
  spiritGate(spec, { k: 'flag', id: spec.flag });
