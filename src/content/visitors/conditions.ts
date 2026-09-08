import type { Cond } from '../../game/story/types';

/* ============================================================
   STALL VISITORS — conditions

   Two kinds of gate live here.

   `VISITOR_GATES` decides whether a silhouette is allowed to appear at
   all. Referenced by key from ./registry.ts, so the registry stays flat
   data with no imports of its own.

   `whileGuest` is the other direction: a *story* trigger asking "is the
   odd one standing there right now". That is the seam that turns
   watching into a payoff — the stranger you have been noticing for a
   week is the one who finally speaks.
   ============================================================ */

export const VISITOR_GATES: Record<string, Cond> = {
  /** you are not a complete unknown *here* any more. Local, because the
      figure is standing in this town, and gossip is what brought it. */
  somewhatKnown: { k: 'fame', min: 1 },
  /** you have been around: strange things follow people who move */
  wellTravelled: { k: 'collects', min: 30 },
};

/** true while that particular figure (or any of them) is at the stall */
export const whileGuest = (id?: string): Cond => ({ k: 'guest', id });

/** the figure is there *and* something else holds */
export const guestAnd = (id: string, extra: Cond): Cond => ({
  k: 'all',
  of: [whileGuest(id), extra],
});
