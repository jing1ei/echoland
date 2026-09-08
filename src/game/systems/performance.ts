import type { GameState } from '../engine';
import { INSTRUMENT_MAP } from '../../content/instruments';
import { PERFORMANCE_VALUES as P, type Curve } from '../../content/performance/values';
import { effectiveProf, isMastered, practicePerHour, tierOf } from './proficiency';

/* ============================================================
   PERFORMANCE — the system

   Turns "who is playing what, how well" into multipliers. Two inputs,
   both content-driven:

     · effective proficiency, looked up on a curve
     · instrument rarity, looked up in a table

   computeRates calls `performancePay`; the satchel calls the same
   function to explain itself, so the number the player is shown is the
   number the economy used.
   ============================================================ */

/** piecewise-linear read of a content curve; flat outside its ends */
export function curveAt(curve: Curve, x: number): number {
  const at = curve.at;
  if (!at.length) return 1;
  if (x <= at[0][0]) return at[0][1];
  for (let i = 1; i < at.length; i++) {
    const [x1, y1] = at[i];
    if (x <= x1) {
      const [x0, y0] = at[i - 1];
      const span = x1 - x0;
      const t = span <= 0 ? 0 : (x - x0) / span;
      return y0 + (y1 - y0) * t;
    }
  }
  return at[at.length - 1][1];
}

export interface PerformancePay {
  /** effective proficiency used, 0..100 */
  prof: number;
  tier: ReturnType<typeof tierOf>;
  mastered: boolean;
  /** multipliers from craft */
  skill: { coin: number; insp: number; renown: number };
  /** multipliers from the instrument being rare */
  rarity: { coin: number; insp: number; renown: number };
  /** stage fright tax while you barely know the thing */
  novice: number;
  /** extra chance of something happening because a master is playing */
  event: number;
}

export function performancePay(s: GameState, instrumentId = s.instrument): PerformancePay {
  const inst = INSTRUMENT_MAP[instrumentId];
  const prof = effectiveProf(s, instrumentId);
  const rarity = P.rarityPay[inst?.rarity ?? 'common'] ?? P.rarityPay.common;
  const mastered = isMastered(s, instrumentId);
  return {
    prof,
    tier: tierOf(prof),
    mastered,
    skill: {
      coin: curveAt(P.skillPay.coin, prof),
      insp: curveAt(P.skillPay.insp, prof),
      renown: curveAt(P.skillPay.renown, prof),
    },
    rarity,
    novice: prof < P.noviceBelow ? P.novicePenalty : 1,
    event: mastered ? P.masteryEventBonus : 1,
  };
}

/** what the strategy sheet and the satchel show under an instrument */
export function practiceForecast(s: GameState, instrumentId = s.instrument) {
  const perHour = practicePerHour(s, instrumentId, { stance: s.stance });
  return { perHour, mastered: isMastered(s, instrumentId) };
}
