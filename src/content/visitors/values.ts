/* ============================================================
   STALL VISITORS — numbers

   Two rules make this work, and both are just numbers:

   1. Rare enough to be a small event. A stranger at every glance is
      wallpaper again.
   2. Long enough to be *seen*. A figure that lasts thirty seconds will
      be missed by a player who opens the app, collects and leaves. Since
      the figure gets no caption any more (./text.ts), the dwell is the
      only thing standing between "you noticed someone" and "nothing
      happened", so it is generous on purpose.

   The draw is deterministic: one roll per window, seeded on the clock
   and the place. So two devices, the widget and the app all agree about
   who is standing at the stall — nothing is stored, nothing desyncs.
   ============================================================ */

export interface VisitorValues {
  /** length of one draw window, minutes */
  windowMin: number;
  /** chance that a window has anyone unusual in it at all */
  chance: number;
  /** how long the figure lingers inside its window, minutes */
  dwellMin: number;
  /** ...and how much that dwell wanders, 0..1 of the spare room */
  dwellJitter: number;
  /** the stall is not a bus stop: at most this many at once */
  maxAtOnce: number;
  /** gate helpers, in the units the conditions use — fame is local now,
      so `somewhatKnownFame` is measured in *this town's* fame */
  somewhatKnownFame: number;
  wellTravelledOverlooks: number;
}

export const VISITOR_VALUES: VisitorValues = {
  windowMin: 26,
  chance: 0.42,
  dwellMin: 15,
  dwellJitter: 0.8,
  maxAtOnce: 1,
  somewhatKnownFame: 34,
  wellTravelledOverlooks: 4,
};
