import type { MoodTag } from '../../game/types';

/* ============================================================
   COMPOSING — values

   Inspiration used to be a currency you only spent inside events. It is
   now the thing you write with: pick two motifs, pick what the piece is
   for, pay, and the repertoire gains a song nobody else has.

   Balance intent:
     · a draft is cheap enough to try on a whim
     · a fair copy is the normal purchase of a good week
     · a life's work costs a real trip's worth of hours
     · every song you have already written makes the next one dearer,
       so the answer to "more money" is never "spam fifty drafts"
   ============================================================ */

export type ComposeGradeId = 'draft' | 'fair' | 'lifework';

export interface ComposeGrade {
  id: ComposeGradeId;
  /** inspiration, before the written-before surcharge */
  cost: number;
  /** total multiplier budget handed out across the chosen focus */
  budget: number;
  /** how much of the budget the roll may swing, ± */
  swing: number;
  rarity: 'common' | 'fine' | 'rare';
  /** how many motif slots this grade fills */
  motifs: number;
}

export interface ComposeValues {
  grades: ComposeGrade[];
  /** each song you have written adds this share to the next one's cost */
  surchargePerSong: number;
  /** cap on the surcharge, so composing never becomes impossible */
  surchargeCap: number;
  /** quality lift from the instrument's proficiency tier, per tier */
  profBonus: number;
  /** quality lift per completed ancestral volume — your people wrote well */
  volumeBonus: number;
  /** quality lift from the local fame tier: a crowd that listens writes with you */
  fameBonus: number;
  /** the share of the budget the chosen focus gets; the rest is scattered */
  focusShare: number;
  /** a composed song may never exceed this on one axis, myth pieces aside */
  axisCap: number;
  /** how much leisure writing takes — an afternoon with the notebook */
  leisure: number;
}

export const COMPOSE_VALUES: ComposeValues = {
  grades: [
    { id: 'draft', cost: 70, budget: 0.4, swing: 0.12, rarity: 'common', motifs: 1 },
    { id: 'fair', cost: 260, budget: 0.85, swing: 0.2, rarity: 'fine', motifs: 2 },
    { id: 'lifework', cost: 820, budget: 1.5, swing: 0.32, rarity: 'rare', motifs: 2 },
  ],
  surchargePerSong: 0.16,
  surchargeCap: 2.4,
  profBonus: 0.06,
  volumeBonus: 0.09,
  fameBonus: 0.05,
  focusShare: 0.62,
  axisCap: 2.6,
  leisure: 2,
};

export const GRADE_MAP: Record<ComposeGradeId, ComposeGrade> = Object.fromEntries(
  COMPOSE_VALUES.grades.map((g) => [g.id, g]),
) as Record<ComposeGradeId, ComposeGrade>;

/** what a piece can be written *for* */
export type ComposeFocus = 'coin' | 'insp' | 'renown' | 'event' | 'leisure';

export const FOCI: ComposeFocus[] = ['coin', 'insp', 'renown', 'event', 'leisure'];

/** the motifs you may write with before any volume has taught you more */
export const STARTER_MOTIFS: MoodTag[] = ['sea', 'city'];
