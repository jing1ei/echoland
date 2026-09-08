import type { GameState } from '../engine';
import { OVERLOOK_MAP } from '../../content/overlooks';
import { TOWN_MAP } from '../../content/towns';
import { FAME_TEXT, FAME_TIERS, FAME_TOP, FAME_VALUES } from '../../content/fame';

/* ============================================================
   FAME — core

   Renown used to be one number for the whole world. It is now one
   number per town, and the player sees none of them: a town's opinion
   of you is reported as one of five words (content/fame/registry.ts).

   Two values, one honest relationship:

     state.fame[townId]  what the people *here* think. Earned at full
                         rate wherever you play, spent as a coin
                         multiplier and an encounter multiplier here.
     state.renown        your travelled name. Grows at `spread` of what
                         you earn locally. Traders price by it, the story
                         gates by it, and it is the floor under which no
                         town will forget you.

   Everything in this file is a pure function of state. Nothing here
   formats a number for the screen, because nothing on the screen is
   allowed to show one.
   ============================================================ */

/** which town's gossip a place belongs to */
export function townOfOverlook(overlookId: string): string {
  return OVERLOOK_MAP[overlookId]?.townId ?? '';
}

export const townName = (townId: string): string => TOWN_MAP[townId]?.name ?? '';

/** the town whose opinion is currently on screen */
export const currentTown = (s: GameState): string => townOfOverlook(s.overlook);

/** raw local fame. Internal — never render this. */
export function fameOf(s: GameState, town?: string): number {
  const id = town ?? currentTown(s);
  if (!id) return 0;
  return Math.max(0, s.fame?.[id] ?? 0);
}

export function fameIndex(n: number): number {
  let i = 0;
  FAME_TIERS.forEach((t, k) => {
    if (n >= t.at) i = k;
  });
  return i;
}

/** the word for a tier index — for objectives and gates that speak in tiers */
export const fameTierLabel = (i: number): string =>
  FAME_TIERS[Math.max(0, Math.min(FAME_TOP, i))]?.label ?? FAME_TEXT.none;

export const fameLabel = (n: number): string => FAME_TIERS[fameIndex(n)]?.label ?? FAME_TEXT.none;

/** the tier of a town, 0..4 — the only fame fact the UI may ask for */
export const fameTier = (s: GameState, town?: string): number => fameIndex(fameOf(s, town));
export const fameWord = (s: GameState, town?: string): string => fameLabel(fameOf(s, town));

/** how far away the next word is, 0..1 — for a meter with no numbers on it */
export function fameProgress(s: GameState, town?: string): number {
  const n = fameOf(s, town);
  const i = fameIndex(n);
  if (i >= FAME_TOP) return 1;
  const from = FAME_TIERS[i].at;
  const to = FAME_TIERS[i + 1].at;
  return Math.max(0, Math.min(1, (n - from) / Math.max(1, to - from)));
}

/** the best you are known anywhere, as a tier — for quests that say "somewhere" */
export function bestFameTier(s: GameState): number {
  let best = 0;
  Object.keys(s.fame ?? {}).forEach((t) => {
    best = Math.max(best, fameIndex(fameOf(s, t)));
  });
  return best;
}

/** how many towns hold you at `tier` or better */
export function townsKnownAt(s: GameState, tier: number): number {
  return Object.keys(s.fame ?? {}).filter((t) => fameIndex(fameOf(s, t)) >= tier).length;
}

/* ------------------------------------------------------------
   Earning

   One writer, so that "fame is local, a slice of it travels" is a fact
   of the codebase and not a convention every call site has to remember.
   Callers that used to do `renown: s.renown + n` call this instead.
   ------------------------------------------------------------ */

export interface FameGain {
  state: GameState;
  /** the tier before and after, in the town it landed in */
  before: number;
  after: number;
  town: string;
  /** true when the town started using a new word for you */
  crossed: boolean;
}

export function grantFame(s: GameState, n: number, town?: string): FameGain {
  const id = town ?? currentTown(s);
  const before = fameIndex(fameOf(s, id));
  if (!id || !Number.isFinite(n) || n === 0) {
    return { state: s, before, after: before, town: id, crossed: false };
  }
  const next = Math.max(0, fameOf(s, id) + n);
  const fame = { ...(s.fame ?? {}), [id]: next };
  /* only gains travel. Losing face in one town does not make you less
     known in the next one over — it just costs you here. */
  const renown = Math.max(0, s.renown + (n > 0 ? n * FAME_VALUES.spread : 0));
  const after = fameIndex(next);
  return {
    state: { ...s, fame, renown },
    before,
    after,
    town: id,
    crossed: after > before,
  };
}

/* ------------------------------------------------------------
   Spending

   What being known here is worth. Coin only, plus a nudge to the
   encounter rate: a crowd that knows the tune brings its own stories.
   Fame deliberately does not multiply fame — that curve is flat on
   purpose so a famous town is not also the fastest place to get more
   famous.
   ------------------------------------------------------------ */

export interface FamePay {
  coin: number;
  event: number;
  tier: number;
  label: string;
}

export function famePay(s: GameState, town?: string): FamePay {
  const tier = fameTier(s, town);
  return {
    coin: FAME_VALUES.payByTier[tier] ?? 1,
    event: FAME_VALUES.eventByTier[tier] ?? 1,
    tier,
    label: FAME_TEXT.rateLabel,
  };
}

/* ------------------------------------------------------------
   Forgetting

   Fame decays in real time, quickly where you are not and barely where
   you are, down to a floor set by your travelled name. So a long trip
   costs you a little of the old town, and a genuinely famous busker is
   never a stranger anywhere — but the top word has to be maintained.
   ------------------------------------------------------------ */

export function forgetFame(s: GameState, now: number, overlook?: string): GameState {
  const last = s.fameAt || now;
  const days = (now - last) / 86400000;
  if (days <= 0) return { ...s, fameAt: now };
  if (!s.fame || Object.keys(s.fame).length === 0) return { ...s, fameAt: now };

  const here = townOfOverlook(overlook ?? s.overlook);
  /* A famous busker is never quite a stranger again: decay stops at a share
     of the travelled name. The floor only ever *slows* forgetting — it is
     clamped to what the town already thought of you (`min(v, floor)`), so a
     town that has barely heard you does not get handed a reputation it never
     gave. */
  const floor = s.renown * FAME_VALUES.floorFromTravelled;
  const fame: Record<string, number> = {};
  let touched = false;

  Object.entries(s.fame).forEach(([town, raw]) => {
    const v = Math.max(0, raw);
    const rate = town === here ? FAME_VALUES.forgetPerDayLocal : FAME_VALUES.forgetPerDayAway;
    const kept = v * Math.pow(1 - rate, days);
    const next = Math.max(Math.min(v, floor), kept);
    if (Math.abs(next - v) > 0.0001) touched = true;
    if (next > FAME_VALUES.epsilon) fame[town] = next;
    else if (v > 0) touched = true;
  });

  if (!touched) return { ...s, fameAt: now };
  return { ...s, fame, fameAt: now };
}

/* ------------------------------------------------------------
   Words for the screen
   ------------------------------------------------------------ */

/** the line a town says when it starts calling you something new */
export function fameUpLine(tier: number): string {
  return FAME_TEXT.up[tier] ?? '';
}

export function fameJournal(town: string, tier: number): { title: string; body: string } {
  const place = townName(town) || town;
  const word = FAME_TIERS[tier]?.label ?? '';
  return {
    title: FAME_TEXT.journal.title(place, word),
    body: FAME_TEXT.journal.body(place, word),
  };
}
