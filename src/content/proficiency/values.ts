/* ============================================================
   PROFICIENCY — numbers

   Every rule of the proficiency system is a number in this file. The
   system code in `game/systems/proficiency.ts` reads them and does the
   arithmetic; it decides nothing on its own.

   The shape of the rule the design asks for:

     · each instrument has its own proficiency, 0..max
     · every `milestone` percentage points gained on ONE instrument grants
       its whole category a permanent `+categoryBonus` base bonus
     · category bonuses stack forever, and apply to instruments you have
       never touched — that is the point: a cellist who trained a violin
       starts above zero
   ============================================================ */

export interface ProficiencyValues {
  /** proficiency ceiling, in percentage points */
  max: number;
  /** how many points of gain on one instrument earn a category bonus */
  milestone: number;
  /** permanent base bonus granted to the category per milestone */
  categoryBonus: number;
  /** safety rail so a very long save cannot make everything free */
  categoryBonusCap: number;
  /** base percentage points gained per hour of performing */
  practicePerHour: number;
  /** the last stretch is the hard one: gain × (1 - p/max)^drag */
  masteryDrag: number;
  /** never fully stall — the floor on that curve */
  minPracticeFactor: number;
  /** practising past your hands' limit still teaches you something */
  tiredPracticeFactor: number;
  /** how a performing stance trades coin for craft */
  stancePractice: Record<string, number>;
  defaultStancePractice: number;
  /** rarer instruments demand more hours; keyed by Rarity */
  rarityPractice: Record<string, number>;
  /** ascending tier thresholds; labels live in ./text.ts */
  tierAt: number[];
  /** "mastered" for spirits and events means at least this much */
  masteryAt: number;
}

export const PROFICIENCY_VALUES: ProficiencyValues = {
  max: 100,
  milestone: 10,
  categoryBonus: 1,
  categoryBonusCap: 25,
  practicePerHour: 2.4,
  masteryDrag: 1.35,
  minPracticeFactor: 0.16,
  tiredPracticeFactor: 0.7,
  stancePractice: {
    /* quiet practice is the fast lane, mingling barely counts as playing */
    earnest: 1.05,
    improv: 1.15,
    mingle: 0.55,
    quiet: 2.1,
    busk_night: 1.25,
  },
  defaultStancePractice: 1,
  rarityPractice: {
    common: 1.2,
    fine: 1,
    rare: 0.85,
    myth: 0.7,
  },
  tierAt: [0, 12, 30, 52, 76, 94, 100],
  masteryAt: 100,
};
