/* ============================================================
   AFFECTION — numbers

   Affection itself is still a number in the save; the player must never
   see it. What these values control is the *telling*: when a change is
   worth a beat, how dark the screen goes while it lands, and how long
   it holds.

   Nothing here is a gate. Gates live in content/story/triggers.ts as
   `{ k:'tier' }` conditions, so the writing and the arithmetic can move
   independently.
   ============================================================ */

export interface BondValues {
  /** a change smaller than this passes in silence — no beat, no line */
  minDelta: number;
  /** at or above this, the line gets the warmer wording */
  strongDelta: number;
  /** how far the screen dims while a warmth beat is on screen (0..1) */
  dim: number;
  /** a tier crossing dims further — it is the bigger moment */
  dimTier: number;
  /** ms the beat holds before it will auto-advance if untouched */
  hold: number;
  holdTier: number;
  /** a loss is quieter than a gain: dim less, hold less */
  dimCool: number;
  holdCool: number;
}

export const BOND_VALUES: BondValues = {
  minDelta: 1,
  strongDelta: 6,
  dim: 0.5,
  dimTier: 0.68,
  hold: 3400,
  holdTier: 4600,
  dimCool: 0.4,
  holdCool: 3000,
};
