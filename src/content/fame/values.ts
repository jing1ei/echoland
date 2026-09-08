/* ============================================================
   FAME — numbers

   Three questions this file answers, and nothing else:

   1. What does being known here buy you? `payByTier`.
   2. How much of a local name travels? `spread`.
   3. How fast do people forget? `forgetPerDayAway`.

   The shape of the economy: fame is earned where you play, at full
   value. A slice of it leaks into a global "travelled name" that
   traders and quest-givers use, and that also stops any town from
   forgetting you completely once you are somebody. Play in one town
   forever and it pays very well there and almost nowhere else; keep
   moving and you are moderately welcome everywhere. Both are valid,
   which is the point of making it regional at all.
   ============================================================ */

export interface FameValues {
  /** coin multiplier per fame tier, index 0..4 — being known pays */
  payByTier: number[];
  /** chance-of-an-encounter multiplier per tier: a crowd brings stories */
  eventByTier: number[];
  /** fraction of local fame that also becomes travelled (global) name */
  spread: number;
  /** fraction of local fame lost per day while you are somewhere else */
  forgetPerDayAway: number;
  /** ...and while you are still standing there (people rarely forget a face in front of them) */
  forgetPerDayLocal: number;
  /** a town never forgets below travelled-name × this */
  floorFromTravelled: number;
  /** below this, fame is not worth mentioning at all */
  epsilon: number;
}

export const FAME_VALUES: FameValues = {
  payByTier: [1, 1.1, 1.26, 1.46, 1.72],
  eventByTier: [1, 1.04, 1.1, 1.18, 1.28],
  spread: 0.26,
  forgetPerDayAway: 0.035,
  forgetPerDayLocal: 0.004,
  floorFromTravelled: 0.55,
  epsilon: 0.5,
};
