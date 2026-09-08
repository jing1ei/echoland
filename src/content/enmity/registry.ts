import type { Character } from '../../game/story/types';

/* ============================================================
   ENMITY (憎恶) — the spine

   Affection is not a slider with hate at the bottom. Real grudges do
   not cancel affection out; they sit next to it. The tavern keeper can
   like you and still not have forgiven the night you played through
   her husband's wake, and that pair — fond *and* wronged — is worth
   more story than a single number sliding left.

   So enmity is a second hidden counter per person, 0..∞, with its own
   thresholds:

     · it never subtracts from affection (content does that explicitly)
     · it gates its own scenes: confrontations, refusals, apologies
     · at the higher tiers it costs money in that person's town, which
       is the only place the player feels it in the idle loop
     · it fades on its own, slowly, if you stay away — a grudge is not
       a life sentence, but time is the cheapest apology and it is slow

   The player is never shown either number. See game/systems/enmity.ts
   for how a change becomes one sentence and a dimmed screen.
   ============================================================ */

export interface EnmityTier {
  at: number;
  /** the word the journal and the cast page may use */
  label: string;
}

/* Deliberately shorter than the affection ladder. Hate should escalate
   fast and top out early: four steps, and the last one is a door
   closing rather than a number growing. */
export const ENMITY_TIERS: EnmityTier[] = [
  { at: 0, label: '无芥蒂' },
  { at: 6, label: '记着这事' },
  { at: 18, label: '怀恨' },
  { at: 40, label: '结了仇' },
];

/** per-character override, for people who forgive nothing (or everything) */
export const ENMITY_TIERS_BY_CHARACTER: Record<string, EnmityTier[]> = {
  /* 苏芹 keeps books, not grudges — she takes longer to reach each step */
  ch_su: [
    { at: 0, label: '无芥蒂' },
    { at: 9, label: '记着这事' },
    { at: 26, label: '怀恨' },
    { at: 56, label: '结了仇' },
  ],
  /* 阿雀 runs on trust; lie to a courier once and it is already a thing */
  ch_que: [
    { at: 0, label: '无芥蒂' },
    { at: 4, label: '记着这事' },
    { at: 13, label: '怀恨' },
    { at: 30, label: '结了仇' },
  ],
};

export const enmityTiers = (ch: Character | { id: string }): EnmityTier[] =>
  ENMITY_TIERS_BY_CHARACTER[ch.id] ?? ENMITY_TIERS;
