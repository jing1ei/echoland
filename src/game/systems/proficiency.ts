import type { GameState } from '../engine';
import type { InstrumentCategoryId } from '../types';
import { INSTRUMENT_MAP, INSTRUMENT_SPECS, practiceRate } from '../../content/instruments';
import { PROFICIENCY_VALUES as V } from '../../content/proficiency/values';
import { TIER_LABELS } from '../../content/proficiency/text';

/* ============================================================
   PROFICIENCY — the system

   Core logic only. Every threshold, rate and label this file uses comes
   from content/proficiency/. Nothing here decides how fast anything
   goes; it decides what happens when it does.

   The model:

     own value      state.prof[instrumentId]        0..max, never drops
     category bonus state.profBonus[categoryId]     permanent, stacks
     effective      own + category bonus, capped at max

   The category bonus is a *derived* quantity — one point of bonus per
   `milestone` points of own proficiency on any instrument of that
   category — but it is also stored, so a future one-off gift ("the
   luthier shows you a trick") can add to it without inventing a second
   mechanism. `recomputeBonus` heals a save whose stored value drifted.
   ============================================================ */

export interface PracticeContext {
  /** performing stance id; picks the stance practice factor */
  stance: string;
  /** past your hands' limit the hour still teaches you, just less */
  tired?: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function categoryOf(instrumentId: string): InstrumentCategoryId | undefined {
  return INSTRUMENT_MAP[instrumentId]?.category;
}

/** what the player personally put into this instrument */
export function ownProf(s: GameState, instrumentId: string): number {
  return clamp(s.prof?.[instrumentId] ?? 0, 0, V.max);
}

/** the permanent shared bonus carried by a whole playing technique */
export function categoryBonus(s: GameState, cat: InstrumentCategoryId | undefined): number {
  if (!cat) return 0;
  return clamp(s.profBonus?.[cat] ?? 0, 0, V.categoryBonusCap);
}

/** what the hands actually manage: own practice plus what the family taught */
export function effectiveProf(s: GameState, instrumentId: string): number {
  const own = ownProf(s, instrumentId);
  return clamp(own + categoryBonus(s, categoryOf(instrumentId)), 0, V.max);
}

export function isMastered(s: GameState, instrumentId: string): boolean {
  return effectiveProf(s, instrumentId) >= V.masteryAt;
}

/** how many category bonus points a given own-value is worth */
export function milestonesOf(own: number): number {
  return Math.floor(clamp(own, 0, V.max) / V.milestone);
}

/** the bonus table implied by the current own values — used to heal saves */
export function recomputeBonus(
  prof: Record<string, number>,
): Partial<Record<InstrumentCategoryId, number>> {
  const out: Partial<Record<InstrumentCategoryId, number>> = {};
  INSTRUMENT_SPECS.forEach((spec) => {
    const own = prof[spec.id];
    if (!own) return;
    const add = milestonesOf(own) * V.categoryBonus;
    if (add <= 0) return;
    out[spec.category] = clamp((out[spec.category] ?? 0) + add, 0, V.categoryBonusCap);
  });
  return out;
}

export interface Tier {
  index: number;
  label: string;
  /** 0..1 through the current tier */
  progress: number;
  next?: number;
}

export function tierOf(value: number): Tier {
  const v = clamp(value, 0, V.max);
  let i = 0;
  for (let k = 0; k < V.tierAt.length; k++) if (v >= V.tierAt[k]) i = k;
  const from = V.tierAt[i];
  const next = V.tierAt[i + 1];
  return {
    index: i,
    label: TIER_LABELS[i] ?? TIER_LABELS[TIER_LABELS.length - 1] ?? '',
    progress: next == null ? 1 : clamp((v - from) / (next - from), 0, 1),
    next,
  };
}

/** percentage points of own proficiency gained per hour of performing */
export function practicePerHour(s: GameState, instrumentId: string, ctx: PracticeContext): number {
  const inst = INSTRUMENT_MAP[instrumentId];
  if (!inst) return 0;
  const own = ownProf(s, instrumentId);
  if (own >= V.max) return 0;

  const stance = V.stancePractice[ctx.stance] ?? V.defaultStancePractice;
  const rarity = V.rarityPractice[inst.rarity] ?? 1;
  /* the last stretch is the long one, but it never stalls completely */
  const drag = Math.max(V.minPracticeFactor, Math.pow(1 - own / V.max, V.masteryDrag));
  const tired = ctx.tired ? V.tiredPracticeFactor : 1;

  return V.practicePerHour * stance * rarity * practiceRate(instrumentId) * drag * tired;
}

export interface PracticeResult {
  instrument: string;
  /** own value before / after */
  before: number;
  after: number;
  gained: number;
  /** category bonus points earned by crossing milestones this session */
  milestones: number;
  category?: InstrumentCategoryId;
  categoryBonusAfter: number;
  /** true only on the hour that finishes the instrument */
  justMastered: boolean;
  /** patches for the save; identical objects when nothing changed */
  prof: Record<string, number>;
  profBonus: Partial<Record<InstrumentCategoryId, number>>;
}

/** Pure. Returns the new proficiency tables plus what happened, so the
    caller can decide whether it is worth a journal line. */
export function grantPractice(
  s: GameState,
  instrumentId: string,
  hours: number,
  ctx: PracticeContext,
): PracticeResult {
  const prof = s.prof ?? {};
  const profBonus = s.profBonus ?? {};
  const before = ownProf(s, instrumentId);
  const cat = categoryOf(instrumentId);
  const none: PracticeResult = {
    instrument: instrumentId,
    before,
    after: before,
    gained: 0,
    milestones: 0,
    category: cat,
    categoryBonusAfter: categoryBonus(s, cat),
    justMastered: false,
    prof,
    profBonus,
  };
  if (!INSTRUMENT_MAP[instrumentId] || hours <= 0 || before >= V.max) return none;

  const gain = practicePerHour(s, instrumentId, ctx) * hours;
  if (!(gain > 0)) return none;

  const after = clamp(before + gain, 0, V.max);
  const milestones = (milestonesOf(after) - milestonesOf(before)) * V.categoryBonus;
  const nextProf = { ...prof, [instrumentId]: after };
  let nextBonus = profBonus;
  if (milestones > 0 && cat) {
    nextBonus = {
      ...profBonus,
      [cat]: clamp((profBonus[cat] ?? 0) + milestones, 0, V.categoryBonusCap),
    };
  }

  return {
    instrument: instrumentId,
    before,
    after,
    gained: after - before,
    milestones,
    category: cat,
    categoryBonusAfter: clamp(cat ? (nextBonus[cat] ?? 0) : 0, 0, V.categoryBonusCap),
    justMastered: before < V.max && after >= V.max,
    prof: nextProf,
    profBonus: nextBonus,
  };
}

export { PROFICIENCY_VALUES } from '../../content/proficiency/values';
