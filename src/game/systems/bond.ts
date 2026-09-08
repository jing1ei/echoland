import type { Character } from '../story/types';
import type { FeelingBeat } from './beat';
import { tierIndex, tierProgress } from '../story/tiers';
import { hash32, rand01 } from '../rng';
import {
  BOND_BAND_BY_TIER,
  BOND_CLOSENESS,
  BOND_LINES,
  BOND_LINES_BY_CHARACTER,
  BOND_UI_TEXT,
  BOND_VALUES,
} from '../../content/bond';

/* ============================================================
   Affection — presentation core

   Affection is a hidden stat. The number stays in the save because the
   trigger table needs something to compare against; it never reaches
   the screen. This file is the one-way valve: give it a delta, get back
   a sentence and a dim level.

   Everything it says comes from content/bond/text.ts, and how hard it
   says it comes from content/bond/values.ts. No prose, no magic
   numbers below this line.
   ============================================================ */

/* Affection beats and grudge beats are the same event to the AVG layer:
   the screen goes quiet and says one thing. The shape lives in
   systems/beat.ts so there is one queue to drain, whichever axis moved. */
export type { FeelingBeat } from './beat';

const fill = (t: string, name: string, tier = '') =>
  t.replace(/\{name\}/g, name).replace(/\{tier\}/g, tier);

/** deterministic pick so the same moment reads the same on a replay */
function pick(list: string[], seed: number): string {
  if (list.length === 0) return '';
  return list[Math.floor(rand01(seed) * list.length) % list.length];
}

function linesFor(who: string, kind: keyof typeof BOND_LINES): string[] {
  const over = BOND_LINES_BY_CHARACTER[who]?.[kind];
  return over && over.length ? over : BOND_LINES[kind];
}

/**
 * The only way affection is allowed to become something a player sees.
 * Returns null when the change is too small to be worth stopping for —
 * silence is a legitimate answer and keeps the loud moments loud.
 */
export function bondBeat(
  ch: Character,
  delta: number,
  before: number,
  after: number,
  seed = Date.now(),
): FeelingBeat | null {
  if (Math.abs(delta) < BOND_VALUES.minDelta) return null;

  const t0 = tierIndex(ch, before);
  const t1 = tierIndex(ch, after);
  const s = hash32(ch.id, Math.round(before), Math.round(after), seed);

  if (t1 > t0) {
    const label = ch.tiers[t1]?.label ?? '';
    return {
      who: ch.id,
      tone: 'warm',
      text: fill(pick(linesFor(ch.id, 'tier'), s), ch.name, label),
      dim: BOND_VALUES.dimTier,
      hold: BOND_VALUES.holdTier,
      heavy: true,
    };
  }

  if (delta < 0) {
    /* losing ground reads cold even though no grudge was earned — the
       tone only says which way the moment went */
    return {
      who: ch.id,
      tone: 'cold',
      text: fill(pick(linesFor(ch.id, 'cool'), s), ch.name),
      dim: BOND_VALUES.dimCool,
      hold: BOND_VALUES.holdCool,
      heavy: false,
    };
  }

  const strong = delta >= BOND_VALUES.strongDelta;
  return {
    who: ch.id,
    tone: 'warm',
    text: fill(pick(linesFor(ch.id, strong ? 'strong' : 'gain'), s), ch.name),
    dim: BOND_VALUES.dim,
    hold: BOND_VALUES.hold,
    heavy: false,
  };
}

/* ------------------------------------------------------------
   The cast page's replacement for "好感 12 / 26"
   ------------------------------------------------------------ */

/** one line about which way this relationship is drifting — never a number */
export function closeness(ch: Character, bond: number, seed = 0): string {
  const ti = tierIndex(ch, bond);
  const { next, p } = tierProgress(ch, bond);
  /* the band is the relationship word, not the progress: a 生面孔 card must
     never claim you are past small talk just because it is 70% of the way
     to the next tier */
  const bandKey =
    BOND_BAND_BY_TIER[Math.min(ti, BOND_BAND_BY_TIER.length - 1)] ?? BOND_BAND_BY_TIER[0];
  const band = BOND_CLOSENESS[bandKey] ?? BOND_CLOSENESS.stranger;
  const rising = next != null && p >= 0.62 && band.rising.length > 0;
  const list = rising ? band.rising : band.steady;
  return pick(list, hash32(ch.id, bandKey, rising ? 1 : 0, seed));
}

export const castNote = () => BOND_UI_TEXT.castNote;

/* ------------------------------------------------------------
   Condition phrasing

   `{ k:'bond', who, min: 26 }` used to describe itself as "苏芹好感 26",
   which leaks the exact stat we just hid. Translate the threshold into
   the tier word it actually crosses.
   ------------------------------------------------------------ */

export function bondNeedText(ch: Character | undefined, min: number): string {
  if (!ch) return '';
  let label = '';
  ch.tiers.forEach((t) => {
    if (min >= t.at && t.at > 0) label = t.label;
  });
  return label
    ? BOND_UI_TEXT.needTier.replace('{name}', ch.name).replace('{tier}', label)
    : BOND_UI_TEXT.needCloser.replace('{name}', ch.name);
}

export function tierNeedText(ch: Character | undefined, tier: number): string {
  if (!ch) return '';
  const label = ch.tiers[tier]?.label;
  return label
    ? BOND_UI_TEXT.needTier.replace('{name}', ch.name).replace('{tier}', `「${label}」`)
    : BOND_UI_TEXT.needCloser.replace('{name}', ch.name);
}
