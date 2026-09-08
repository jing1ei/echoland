/* ============================================================
   AFFECTION — content barrel

   values.ts  how loud a change is allowed to be
   text.ts    what it says instead of a number

   The maths (tiers, thresholds) is core and lives in
   game/story/tiers.ts; the thresholds themselves are per-character in
   content/story/characters.ts. This module owns only the *telling*.
   ============================================================ */

export { BOND_VALUES, type BondValues } from './values';
export {
  BOND_LINES,
  BOND_LINES_BY_CHARACTER,
  BOND_CLOSENESS,
  BOND_BAND_BY_TIER,
  BOND_UI_TEXT,
  type BondLines,
  type ClosenessBand,
} from './text';
