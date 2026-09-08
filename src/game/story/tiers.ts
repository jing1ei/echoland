import type { Character } from './types';

/* ============================================================
   Affection tiers — core

   Tiers are thresholds over one number, computed on read. Nothing is
   persisted, so re-tuning a tier table never invalidates a save. The
   thresholds themselves are content (content/story/characters.ts); the
   maths is here.
   ============================================================ */

/** index into `tiers` for a given affection score */
export function tierIndex(c: Character, bond: number): number {
  let i = 0;
  c.tiers.forEach((t, k) => {
    if (bond >= t.at) i = k;
  });
  return i;
}

export function tierLabel(c: Character, bond: number): string {
  return c.tiers[tierIndex(c, bond)].label;
}

/** progress 0..1 toward the next tier; 1 when already at the top */
export function tierProgress(
  c: Character,
  bond: number,
): { at: number; next: number | null; p: number } {
  const i = tierIndex(c, bond);
  const at = c.tiers[i].at;
  const nxt = c.tiers[i + 1]?.at ?? null;
  if (nxt == null) return { at, next: null, p: 1 };
  return { at, next: nxt, p: Math.max(0, Math.min(1, (bond - at) / (nxt - at))) };
}
