import type { NodeKind } from '../../game/types';

/* ============================================================
   THE EIGHTY-ONE — values

   Two jobs: how likely a leaf is to surface, and what having it is
   worth. Both are deliberately small numbers. Eighty-one leaves at a
   large bonus each would end the economy by volume three; eighty-one
   leaves at a small one keeps the collection about the collection.
   ============================================================ */

export interface ScoreValues {
  /** multiplier added per recovered leaf, e.g. 0.006 → +0.6% each */
  perLeaf: { coin: number; insp: number };
  /** extra multiplier per *completed* volume, on top of its nine leaves */
  perVolume: { coin: number; insp: number };
  /** a full volume also lifts practice: the ancestral fingering is in it */
  practicePerVolume: number;
  /** chance a visited node turns one up, by node kind */
  findByNode: Partial<Record<NodeKind, number>>;
  /** how much more likely a node is to hold a leaf of *its own* region's volume */
  homeBias: number;
  /** a leaf found outside its region reads as "someone carried it here" */
  strayChance: number;
  /** cooldown so one lucky street does not empty a volume in an evening */
  findCooldownH: number;
  /** you cannot start finding volume N+1's leaves before N is at least this far */
  volumeGate: number;
}

export const SCORE_VALUES: ScoreValues = {
  perLeaf: { coin: 0.006, insp: 0.009 },
  perVolume: { coin: 0.05, insp: 0.07 },
  practicePerVolume: 0.04,
  findByNode: {
    scribe: 0.3,
    story: 0.22,
    puzzle: 0.2,
    shrine: 0.16,
    market: 0.12,
    luthier: 0.1,
    tavern: 0.08,
    gamble: 0.04,
  },
  homeBias: 0.78,
  strayChance: 0.22,
  findCooldownH: 5,
  volumeGate: 3,
};
