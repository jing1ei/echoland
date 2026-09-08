/* ============================================================
   INSTRUMENT SPIRITS — numbers

   Mastery only buys a ticket. These are the odds and the rewards; the
   gate itself ("this instrument is at maximum proficiency") comes from
   content/proficiency/values.ts through ./conditions.ts.
   ============================================================ */

export interface SpiritValues {
  /** chance the first meeting fires on an eligible hook */
  awakenChance: number;
  /** chance of a later visit */
  visitChance: number;
  /** real hours before a visit may repeat */
  visitCooldownH: number;
  /** where these scenes sit against the rest of the story */
  awakenPriority: number;
  visitPriority: number;
  /** affection for taking the spirit at its word / for refusing politely */
  bondAccept: number;
  bondDecline: number;
  bondVisit: number;
  /** hours-of-income rewards, so a gift keeps its weight in any chapter */
  inspAccept: number;
  coinDecline: number;
  inspVisit: number;
  renownAwaken: number;
}

export const SPIRIT_VALUES: SpiritValues = {
  awakenChance: 0.34,
  visitChance: 0.16,
  visitCooldownH: 22,
  awakenPriority: 44,
  visitPriority: 38,
  bondAccept: 12,
  bondDecline: 4,
  bondVisit: 6,
  inspAccept: 3.2,
  coinDecline: 2.4,
  inspVisit: 1.6,
  renownAwaken: 12,
};
