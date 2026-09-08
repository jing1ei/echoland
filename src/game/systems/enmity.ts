import type { Character, StoryState } from '../story/types';
import type { FeelingBeat } from './beat';
import { hash32, rand01 } from '../rng';
import { CHARACTERS as CAST } from '../../content/story/characters';
/* "which town's gossip does this place belong to" has exactly one owner,
   systems/fame.ts, and both hidden axes ask it the same question */
import { townOfOverlook } from './fame';
import {
  ENMITY_BAND_BY_TIER,
  ENMITY_CAST,
  ENMITY_LINES,
  ENMITY_LINES_BY_CHARACTER,
  ENMITY_UI_TEXT,
  ENMITY_VALUES,
  enmityTiers,
} from '../../content/enmity';

/* ============================================================
   Enmity — core

   The second hidden axis. Affection asks "do they like you"; enmity
   asks "is there something between you". They are independent on
   purpose: 苏芹 can be 熟人 and still be owed an apology, and that pair
   is where the interesting scenes live.

   Everything the player ever perceives of this number comes out of this
   file, in three shapes and no others:

     enmityBeat()  one sentence, on a dimmed screen, when it moves
     grudgeLine()  one line on the cast card, when it is nonzero
     enmityPay()   slightly thinner takings in that person's town

   The ladder is content/enmity/registry.ts, the loudness and the price
   are content/enmity/values.ts, the words are content/enmity/text.ts.
   No prose and no magic numbers below this line.
   ============================================================ */

/* ------------------------------------------------------------
   The ladder
   ------------------------------------------------------------ */

export function enmityIndex(ch: Character | { id: string }, n: number): number {
  const tiers = enmityTiers(ch);
  let i = 0;
  tiers.forEach((t, k) => {
    if (n >= t.at) i = k;
  });
  return i;
}

export function enmityLabel(ch: Character | { id: string }, n: number): string {
  const tiers = enmityTiers(ch);
  return tiers[enmityIndex(ch, n)]?.label ?? '';
}

export const enmityOf = (st: StoryState, who: string) => st.enmity?.[who] ?? 0;

/** does this person have anything against you at all */
export const hasGrudge = (st: StoryState, who: string) => enmityOf(st, who) > 0;

/* ------------------------------------------------------------
   The beat
   ------------------------------------------------------------ */

const fill = (t: string, name: string, tier = '') =>
  t.replace(/\{name\}/g, name).replace(/\{tier\}/g, tier);

function pick(list: string[], seed: number): string {
  if (list.length === 0) return '';
  return list[Math.floor(rand01(seed) * list.length) % list.length];
}

function linesFor(who: string, kind: keyof typeof ENMITY_LINES): string[] {
  const over = ENMITY_LINES_BY_CHARACTER[who]?.[kind];
  return over && over.length ? over : ENMITY_LINES[kind];
}

/**
 * A grudge moving is the same kind of event as a warmth beat — the
 * screen goes quiet and says one thing — so it returns the shared
 * FeelingBeat, only with `tone: 'cold'`.
 *
 * Returns null when the change is too small to stop the story for.
 */
export function enmityBeat(
  ch: Character,
  delta: number,
  before: number,
  after: number,
  seed = Date.now(),
): FeelingBeat | null {
  if (Math.abs(delta) < ENMITY_VALUES.minDelta) return null;

  const s = hash32(ch.id, Math.round(before), Math.round(after), seed);
  const t0 = enmityIndex(ch, before);
  const t1 = enmityIndex(ch, after);

  /* it went away entirely — that is a scene's doing, and it deserves the
     quiet relief line rather than the cold one */
  if (after <= 0 && before > 0) {
    return {
      who: ch.id,
      tone: 'warm',
      text: fill(pick(linesFor(ch.id, 'clear'), s), ch.name),
      dim: ENMITY_VALUES.dimEase,
      hold: ENMITY_VALUES.holdEase,
      heavy: false,
    };
  }

  if (delta < 0) {
    return {
      who: ch.id,
      tone: 'warm',
      text: fill(pick(linesFor(ch.id, 'ease'), s), ch.name),
      dim: ENMITY_VALUES.dimEase,
      hold: ENMITY_VALUES.holdEase,
      heavy: false,
    };
  }

  if (t1 > t0) {
    return {
      who: ch.id,
      tone: 'cold',
      text: fill(pick(linesFor(ch.id, 'tier'), s), ch.name, enmityLabel(ch, after)),
      dim: ENMITY_VALUES.dimTier,
      hold: ENMITY_VALUES.holdTier,
      heavy: true,
    };
  }

  const strong = delta >= ENMITY_VALUES.strongDelta;
  return {
    who: ch.id,
    tone: 'cold',
    text: fill(pick(linesFor(ch.id, strong ? 'strong' : 'gain'), s), ch.name),
    dim: ENMITY_VALUES.dim,
    hold: ENMITY_VALUES.hold,
    heavy: false,
  };
}

/* ------------------------------------------------------------
   The cast page

   One extra line under the relationship word. Never a second bar, never
   a number, and nothing at all when the slate is clean.
   ------------------------------------------------------------ */

export function grudgeLine(ch: Character, n: number, seed = 0): string {
  if (n <= 0) return '';
  const ti = enmityIndex(ch, n);
  const key = ENMITY_BAND_BY_TIER[Math.min(ti, ENMITY_BAND_BY_TIER.length - 1)];
  if (!key) return '';
  const list = ENMITY_CAST[key] ?? [];
  return pick(list, hash32(ch.id, key, seed));
}

export const enmityCastNote = () => ENMITY_UI_TEXT.castNote;

/* ------------------------------------------------------------
   Condition phrasing
   ------------------------------------------------------------ */

export function enmityNeedText(ch: Character | undefined, min: number): string {
  if (!ch) return '';
  if (min <= 0) return '';
  const ti = enmityIndex(ch, min);
  const label = enmityTiers(ch)[ti]?.label;
  return ti > 0 && label
    ? ENMITY_UI_TEXT.journalTier.replace('{name}', ch.name).replace('{tier}', label)
    : ENMITY_UI_TEXT.needGrudge.replace('{name}', ch.name);
}

export function enmityCleanText(ch: Character | undefined): string {
  if (!ch) return '';
  return ENMITY_UI_TEXT.needClean.replace('{name}', ch.name);
}

/* ============================================================
   The price

   The only place a grudge touches the idle loop. Three rules keep it
   from ever feeling like a punishment for playing:

     local     it costs you only in towns that person belongs to
     floored   however many people you crossed, the multiplier stops
               at ENMITY_VALUES.worst
     legible   it shows up as a named line in the rate breakdown, so the
               player can see *that* something is wrong without being
               handed a number for it
   ============================================================ */

const HOME_OF: Record<string, string> = Object.fromEntries(CAST.map((c) => [c.id, c.home]));

export interface EnmityPay {
  coin: number;
  renown: number;
  /** the breakdown label, or '' when nothing applies here */
  label: string;
  /** character ids currently costing you money, worst first */
  who: string[];
}

const CLEAN: EnmityPay = { coin: 1, renown: 1, label: '', who: [] };

export function enmityPay(st: StoryState | undefined, overlook: string): EnmityPay {
  const rec = st?.enmity;
  if (!rec) return CLEAN;
  const here = townOfOverlook(overlook);

  let coin = 1;
  let renown = 1;
  const who: { id: string; n: number }[] = [];

  Object.entries(rec).forEach(([id, n]) => {
    if (!n || n <= 0) return;
    const home = HOME_OF[id];
    /* a grudge held in 盐汐港 does nothing to your evening in 樱桥 */
    if (ENMITY_VALUES.localOnly && home && home !== here) return;
    const ti = enmityIndex({ id }, n);
    if (ti <= 0) return;
    const c = ENMITY_VALUES.payByTier[Math.min(ti, ENMITY_VALUES.payByTier.length - 1)] ?? 1;
    const r = ENMITY_VALUES.renownByTier[Math.min(ti, ENMITY_VALUES.renownByTier.length - 1)] ?? 1;
    coin *= c;
    renown *= r;
    who.push({ id, n });
  });

  if (who.length === 0) return CLEAN;
  who.sort((a, b) => b.n - a.n);
  return {
    coin: Math.max(ENMITY_VALUES.worst, coin),
    renown: Math.max(ENMITY_VALUES.worst, renown),
    label: ENMITY_UI_TEXT.payPart,
    who: who.map((w) => w.id),
  };
}

/* ============================================================
   How it fades

   Time is the cheapest apology and it is slow. Staying away helps more
   than standing in front of them every night, and it never fades all
   the way: decay stops at the first tier, so the only route back to a
   clean slate is an authored scene. That keeps forgiveness a story
   beat rather than a waiting game.
   ============================================================ */

export function decayEnmity(st: StoryState, now: number, overlook: string): StoryState {
  const rec = st.enmity;
  if (!rec) return st;
  const ids = Object.keys(rec);
  if (ids.length === 0) return st;

  const since = st.enmityAt ?? now;
  const days = (now - since) / 86400000;
  if (days <= 0) return st;
  /* under a few minutes there is nothing to shed; don't churn the save */
  if (days < 1 / 288) return st;

  const here = townOfOverlook(overlook);
  const next: Record<string, number> = {};
  let changed = false;

  ids.forEach((id) => {
    const n = rec[id];
    if (!n || n <= 0) return;
    const local = HOME_OF[id] === here;
    const rate = local ? ENMITY_VALUES.decayPerDayLocal : ENMITY_VALUES.decayPerDay;
    const tiers = enmityTiers({ id });
    const floor = tiers[Math.min(ENMITY_VALUES.decayFloorTier, tiers.length - 1)]?.at ?? 0;
    /* already at or below the floor: it just sits there */
    const v = n <= floor ? n : Math.max(floor, n - rate * days);
    if (Math.abs(v - n) > 0.001) changed = true;
    if (v > 0) next[id] = v;
    else changed = true;
  });

  if (!changed) return { ...st, enmityAt: now };
  return { ...st, enmity: next, enmityAt: now };
}
