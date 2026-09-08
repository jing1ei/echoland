/* ============================================================
   ENMITY — content barrel

   registry.ts  the tier ladder, and who forgives slowly
   values.ts    how loud a change is, and what it costs
   text.ts      what it says instead of a number

   The maths lives in game/systems/enmity.ts. This module owns only the
   ladder and the telling.
   ============================================================ */

export {
  ENMITY_TIERS,
  ENMITY_TIERS_BY_CHARACTER,
  enmityTiers,
  type EnmityTier,
} from './registry';

export { ENMITY_VALUES, type EnmityValues } from './values';

export {
  ENMITY_LINES,
  ENMITY_LINES_BY_CHARACTER,
  ENMITY_CAST,
  ENMITY_BAND_BY_TIER,
  ENMITY_UI_TEXT,
  type EnmityLines,
} from './text';
