/* ============================================================
   Feelings — the shared beat

   Two hidden stats now decide how people treat you: affection
   (systems/bond.ts) and enmity (systems/enmity.ts). Neither is ever
   printed. Both are allowed to reach the player in exactly one shape —
   this one: the screen goes quiet, one sentence lands in the dialogue
   box, and the story picks up where it was.

   Keeping the shape in its own module means the AVG layer has a single
   thing to render and a single queue to drain, no matter which stat
   moved or how many more axes get added later.
   ============================================================ */

export type BeatTone = 'warm' | 'cold';

export interface FeelingBeat {
  /** character id, for the log */
  who: string;
  /** warm = they think better of you, cold = worse */
  tone: BeatTone;
  /** the line the dialogue box shows while the screen is dimmed */
  text: string;
  /** 0..1 — how far down the rest of the screen goes */
  dim: number;
  /** ms before it auto-advances if the player does nothing */
  hold: number;
  /** crossing into a new relationship word: the slower, heavier version */
  heavy: boolean;
}
