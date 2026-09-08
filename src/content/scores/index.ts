/* ============================================================
   THE EIGHTY-ONE — barrel

   The main line's spine: nine volumes, nine leaves each, all stolen.
   Logic lives in game/systems/scores.ts; this folder only knows what
   exists, what it is worth, and how it reads.
   ============================================================ */

export {
  SCORE_VOLUMES,
  VOLUME_MAP,
  SCORES,
  SCORE_MAP,
  SCORE_TOTAL,
  VOLUME_SIZE,
  leavesOf,
  volumeOfTown,
  type ScoreVolume,
  type ScoreLeaf,
} from './registry';
export { SCORE_VALUES, type ScoreValues } from './values';
export { SCORE_TEXT } from './text';
