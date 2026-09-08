/* ============================================================
   ENMITY — numbers

   Same rule as affection: the counter is invisible, so everything here
   is about *how it is told* and *what it costs* — never about showing
   it. Two groups:

     the beat      how dark the screen goes, how long the line holds
     the price     what a grudge does to a night's takings, and how
                   quickly it fades if you leave that town alone

   The price is the only reason enmity is not just flavour. It is
   deliberately small, local and slow: a grudge in 盐汐港 does nothing
   to your evening in 樱桥, and even at its worst it is a dent, not a
   wall. An idle game must never punish the player for opening it.
   ============================================================ */

export interface EnmityValues {
  /** below this, a change passes in silence */
  minDelta: number;
  /** at or above this, the heavier wording */
  strongDelta: number;
  /** dim levels for the cold beat (0..1) */
  dim: number;
  dimTier: number;
  /** ms the line holds if the player does nothing */
  hold: number;
  holdTier: number;
  /** cooling a grudge down is quiet — a small relief, not a fanfare */
  dimEase: number;
  holdEase: number;

  /* ---- what it costs ---- */
  /** coin multiplier per enmity tier, index-aligned with ENMITY_TIERS */
  payByTier: number[];
  /** renown multiplier per tier — word travels */
  renownByTier: number[];
  /** the penalty only applies in towns this person is tied to */
  localOnly: boolean;
  /** floor on the combined multiplier, however many people you crossed */
  worst: number;

  /* ---- how it fades ---- */
  /** points shed per real day away from that person's town */
  decayPerDay: number;
  /** …and per real day spent right there, where they can see you */
  decayPerDayLocal: number;
  /** a grudge never fully forgets on its own: it stops here, at tier 1 */
  decayFloorTier: number;
}

export const ENMITY_VALUES: EnmityValues = {
  minDelta: 1,
  strongDelta: 5,
  dim: 0.62,
  dimTier: 0.78,
  hold: 3600,
  holdTier: 4800,
  dimEase: 0.34,
  holdEase: 2800,

  payByTier: [1, 0.96, 0.88, 0.78],
  renownByTier: [1, 0.98, 0.9, 0.8],
  localOnly: true,
  worst: 0.62,

  decayPerDay: 1.6,
  decayPerDayLocal: 0.5,
  decayFloorTier: 1,
};
