/* ============================================================
   PERFORMANCE — numbers

   "Playing an instrument while you idle" is one loop with three knobs:

     · practice   how much craft an hour of performing buys
                  (the curve itself lives in content/proficiency/values.ts)
     · skill pay  how much that craft is worth at the stall
     · rarity pay how much the instrument itself is worth being seen with

   Both pay curves are lookup-and-interpolate tables rather than formulas
   in code, so the economy can be retuned without touching the engine.
   ============================================================ */

export interface Curve {
  /** ascending stops: [input, multiplier] */
  at: Array<[number, number]>;
}

export interface PerformanceValues {
  /** effective proficiency (0..100) → income multiplier */
  skillPay: { coin: Curve; insp: Curve; renown: Curve };
  /** rarity → income multiplier, on top of the instrument's own `mul` */
  rarityPay: Record<string, { coin: number; insp: number; renown: number }>;
  /** a mastered instrument draws a crowd all by itself */
  masteryEventBonus: number;
  /** playing something you barely know puts people off */
  noviceBelow: number;
  novicePenalty: number;
}

export const PERFORMANCE_VALUES: PerformanceValues = {
  skillPay: {
    coin: {
      at: [
        [0, 1],
        [25, 1.16],
        [50, 1.42],
        [75, 1.78],
        [100, 2.3],
      ],
    },
    insp: {
      at: [
        [0, 1],
        [50, 1.2],
        [100, 1.55],
      ],
    },
    renown: {
      at: [
        [0, 1],
        [40, 1.1],
        [70, 1.35],
        [100, 1.9],
      ],
    },
  },
  rarityPay: {
    common: { coin: 1, insp: 1, renown: 1 },
    fine: { coin: 1.12, insp: 1.06, renown: 1.08 },
    rare: { coin: 1.34, insp: 1.16, renown: 1.24 },
    myth: { coin: 1.7, insp: 1.35, renown: 1.6 },
  },
  masteryEventBonus: 1.15,
  noviceBelow: 8,
  novicePenalty: 0.94,
};
