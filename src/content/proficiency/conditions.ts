import type { Cond } from '../../game/story/types';
import type { InstrumentCategoryId } from '../../game/types';
import { PROFICIENCY_VALUES } from './values';

/* ============================================================
   PROFICIENCY — conditions

   Trigger authors should never spell out a proficiency predicate by
   hand; they call one of these. That keeps "what counts as mastered"
   in one place (values.ts) even though a dozen triggers ask for it.

   These are builders, not evaluators — they return plain Cond data. The
   single evaluator lives in game/story/conditions.ts.
   ============================================================ */

/** effective proficiency (own value + category bonus) at least `min` */
export const profAtLeast = (instrument: string, min: number): Cond => ({
  k: 'prof',
  id: instrument,
  min,
});

/** own, un-bonused proficiency at least `min` — for "you personally practised this" */
export const ownProfAtLeast = (instrument: string, min: number): Cond => ({
  k: 'prof',
  id: instrument,
  min,
  own: true,
});

/** the gate every instrument-spirit event sits behind */
export const mastered = (instrument: string): Cond => ({
  k: 'prof',
  id: instrument,
  min: PROFICIENCY_VALUES.masteryAt,
});

/** holding that instrument AND having mastered it */
export const masteredInHand = (instrument: string): Cond => ({
  k: 'all',
  of: [{ k: 'instrument', id: instrument, held: true }, mastered(instrument)],
});

/** the permanent shared bonus of a category has reached `min` percent */
export const categoryBonusAtLeast = (cat: InstrumentCategoryId, min: number): Cond => ({
  k: 'profCat',
  cat,
  min,
});
