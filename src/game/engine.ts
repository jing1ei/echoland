import type {
  ComposedSong,
  GameEvent,
  InstrumentCategoryId,
  Overlook,
  Phase,
  WeatherId,
} from './types';
import { freshStory, type StoryState } from './story/types';
import { OVERLOOK_MAP } from '../content/overlooks';
import {
  INSTRUMENT_MAP,
  SONG_MAP,
  STANCE_MAP,
  ITEM_MAP,
} from '../content/gear';
import { EVENTS } from '../content/events';
import { hash32, rand01 } from './rng';
import {
  isExtreme,
  rollWeather,
  weatherFlavour,
  weatherLabel,
  weatherPay,
  type WeatherPlace,
} from './systems/weather';
import { grantPractice } from './systems/proficiency';
import { PROFICIENCY_VALUES } from '../content/proficiency/values';
import { performancePay } from './systems/performance';
import { decayEnmity, enmityPay } from './systems/enmity';
import { fameOf, famePay, forgetFame } from './systems/fame';
import { scorePay } from './systems/scores';
import { songById } from './systems/songs';
import { PERFORMANCE_TEXT } from '../content/performance/text';
import { WEATHER_VALUES } from '../content/weather';

export { hash32, rand01 };

/* ============================================================
   Time of day & weather

   The clock is core logic; the sky is content. `skyState` decides *when*
   to ask, `systems/weather` decides *what* — see content/weather/values.
   ============================================================ */

export type { Phase } from './types';

export interface SkyState {
  phase: Phase;
  /** 0..1 blend into the next phase */
  blend: number;
  /** 0..1 fraction of the 24h day */
  t: number;
  weather: WeatherId;
  /** rare and event-worthy — the overlay says so, the router may use it */
  extreme: boolean;
  /** label for UI */
  label: string;
}

export function phaseOf(hourFloat: number): { phase: Phase; blend: number } {
  // dawn 4.5-7.5 | day 7.5-16.5 | dusk 16.5-19.5 | night 19.5-4.5
  const h = ((hourFloat % 24) + 24) % 24;
  if (h >= 4.5 && h < 7.5) return { phase: 'dawn', blend: (h - 4.5) / 3 };
  if (h >= 7.5 && h < 16.5) return { phase: 'day', blend: (h - 7.5) / 9 };
  if (h >= 16.5 && h < 19.5) return { phase: 'dusk', blend: (h - 16.5) / 3 };
  const n = h >= 19.5 ? h - 19.5 : h + 4.5;
  return { phase: 'night', blend: n / 9 };
}

/**
 * `?hour=7.5` pins the world clock. The canvas, the clock readout and the
 * phase label all read from here, so a pinned preview never shows a dawn sky
 * next to a "night" label.
 */
export const PREVIEW_HOUR: number | undefined = (() => {
  if (typeof window === 'undefined') return undefined;
  const v = new URLSearchParams(window.location.search).get('hour');
  if (v === null) return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : undefined;
})();

export function hourOf(now: number): number {
  if (PREVIEW_HOUR !== undefined) return PREVIEW_HOUR;
  const d = new Date(now);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

export function skyState(now: number, overlookId: string): SkyState {
  const hourFloat = hourOf(now);
  const ov = OVERLOOK_MAP[overlookId];
  let { phase, blend } = phaseOf(hourFloat);
  if (ov?.scene.forceNight) {
    phase = 'night';
    blend = 0.35 + 0.3 * Math.sin((hourFloat / 24) * Math.PI * 2);
  }

  const place: WeatherPlace = {
    id: overlookId,
    moods: ov?.moods ?? [],
    forceRain: ov?.scene.forceRain,
  };
  const weather = rollWeather(place, now, phase, hourFloat);
  const flavour = weatherFlavour(place, now, hourFloat);

  return {
    phase,
    blend,
    t: hourFloat / 24,
    weather,
    extreme: isExtreme(weather),
    label: `${phaseLabel(phase)} · ${weatherLabel(weather)}${flavour}`,
  };
}

export function phaseLabel(p: Phase): string {
  return p === 'dawn' ? '拂晓' : p === 'day' ? '白日' : p === 'dusk' ? '黄昏' : '夜';
}

/* ============================================================
   The mutable save state
   ============================================================ */

export interface JournalEntry {
  at: number;
  kind:
    | 'event'
    | 'quest'
    | 'story'
    | 'buy'
    | 'travel'
    | 'collect'
    | 'minigame'
    | 'explore'
    | 'bond'
    /** proficiency milestones: permanent, and invisible unless written down */
    | 'craft';
  title: string;
  body: string;
  tone?: string;
}

export interface PendingEvent {
  eventId: string;
  at: number;
  /** resolved gains, already scaled */
  gain: { coin: number; insp: number; renown: number; leisure: number };
  item?: string;
}

export interface PendingDecision {
  eventId: string;
  at: number;
  /** hourly snapshot used to scale the choice outcomes */
  coinPerHour: number;
  inspPerHour: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  lastCollect: number;

  coin: number;
  insp: number;
  /** your *travelled* name: what people know of you before you arrive.
      A slice of every local reputation leaks into it. The number the
      player is shown for "how known am I" is never this one — see
      `fame` and systems/fame.ts. */
  renown: number;
  leisure: number;

  /* ---- fame, per town ----
     Gossip is local, so reputation is too. Earned where you play, spent
     where you play, reported as one of five words and never as a digit.
     `fameAt` is the clock the forgetting runs off. */
  fame: Record<string, number>;
  fameAt: number;

  totalCoin: number;
  totalInsp: number;
  collects: number;

  pending: { coin: number; insp: number; renown: number; leisure: number };
  /** practice banked since the last time you packed up, so the collect sheet
      can report the whole session rather than the last few seconds of it.
      Proficiency itself is applied immediately; this is only the receipt. */
  pendingPractice: {
    instrument: string;
    from: number;
    gained: number;
    milestones: number;
    mastered: boolean;
  } | null;
  pendingEvents: PendingEvent[];
  decisions: PendingDecision[];

  overlook: string;
  instrument: string;
  repertoire: string[];
  stance: string;

  /** hours of continuous performing since the last time you packed up */
  fatigue: number;

  /* ---- craft ----
     Proficiency per instrument id, 0..100, and the permanent shared bonus
     each playing technique has earned. Both are plain tables so the
     proficiency system can stay a pile of pure functions; the rules live
     in content/proficiency/values.ts. */
  prof: Record<string, number>;
  profBonus: Partial<Record<InstrumentCategoryId, number>>;

  overlooks: string[];
  maps: string[];
  instruments: string[];
  songs: string[];
  /* ---- the eighty-one ----
     Ids of the ancestral leaves you have brought home, and the clock the
     find-cooldown runs off. Nine volumes of nine; see content/scores/ and
     systems/scores.ts. This is the main line. */
  scores: string[];
  scoreAt: number;
  /* ---- songs you wrote ----
     Whole Song objects, because a piece you composed must keep working
     when the content tables change under it. Resolve songs through
     systems/songs.ts, never through SONG_MAP alone. */
  composed: ComposedSong[];
  upgrades: string[];
  items: Record<string, number>;
  flags: Record<string, boolean>;

  questsActive: string[];
  questsDone: string[];
  nodeVisits: Record<string, { count: number; last: number }>;
  minigameWins: Record<string, number>;
  performAt: Record<string, number>;
  firedOnce: Record<string, boolean>;

  /** AVG story layer: affection, flags, scene bookkeeping */
  story: StoryState;

  journal: JournalEntry[];
  seenIntro: boolean;
  reduceMotion: boolean;

  /* ---- preferences, all of it living in the settings sheet ----
     Kept in the save rather than in component state so the widget, the
     stage and the minigames all read the same number. */
  /** 0..1 master volume for the little synth used by minigames and the stage */
  volume: number;
  /** who the bard is, as far as the player is concerned */
  profile: { name: string; birthday: string };
  /** one-off UI hints the player has already dismissed */
  tipsSeen: Record<string, boolean>;
}

export const SAVE_KEY = 'wandering-lyre-save-v1';
export const STATE_VERSION = 8;

export function freshState(now = Date.now()): GameState {
  return {
    version: STATE_VERSION,
    createdAt: now,
    lastTick: now,
    lastCollect: now,
    coin: 40,
    insp: 0,
    renown: 0,
    leisure: 6,
    fame: {},
    fameAt: now,
    totalCoin: 0,
    totalInsp: 0,
    collects: 0,
    pending: { coin: 0, insp: 0, renown: 0, leisure: 0 },
    pendingPractice: null,
    pendingEvents: [],
    decisions: [],
    overlook: 'mistquay',
    instrument: 'lute_worn',
    repertoire: ['song_ferry'],
    stance: 'earnest',
    fatigue: 0,
    prof: {},
    profBonus: {},
    overlooks: ['mistquay'],
    maps: ['saltide'],
    instruments: ['lute_worn'],
    songs: ['song_ferry'],
    scores: [],
    scoreAt: 0,
    composed: [],
    upgrades: [],
    items: {},
    flags: {},
    questsActive: ['main_1', 'side_luthier', 'side_cat'],
    questsDone: [],
    nodeVisits: {},
    minigameWins: {},
    performAt: {},
    firedOnce: {},
    story: freshStory(),
    journal: [],
    seenIntro: false,
    reduceMotion: false,
    volume: 0.6,
    profile: { name: '', birthday: '' },
    tipsSeen: {},
  };
}

/* ============================================================
   Rate computation
   ============================================================ */

export interface RateBreakdown {
  coin: number;
  insp: number;
  leisure: number;
  renown: number;
  parts: Array<{ label: string; value: number; kind: 'good' | 'bad' | 'flat' }>;
  resonance: number;
  eventRate: number;
  /** what the instrument in hand contributes, for the satchel to explain */
  pay: ReturnType<typeof performancePay>;
  staminaCap: number;
  leisureCap: number;
  offlineCap: number;
  fatigued: boolean;
}

const DIMINISH = [1, 0.62, 0.36];

export function songMultipliers(state: GameState) {
  const acc = { coin: 1, insp: 1, leisure: 1, renown: 1, event: 1 };
  state.repertoire.slice(0, 3).forEach((id, i) => {
    const s = songById(state, id);
    if (!s) return;
    const w = DIMINISH[i] ?? 0.3;
    (Object.keys(acc) as (keyof typeof acc)[]).forEach((k) => {
      const m = s.mul[k];
      if (m != null) acc[k] *= 1 + (m - 1) * w;
    });
  });
  return acc;
}

export function resonanceScore(state: GameState): number {
  const ov = OVERLOOK_MAP[state.overlook];
  if (!ov) return 0;
  let hits = 0;
  const seen = new Set<string>();
  state.repertoire.slice(0, 3).forEach((id) => {
    const s = songById(state, id);
    if (!s) return;
    s.tags.forEach((t) => {
      if (ov.moods.includes(t) && !seen.has(t)) {
        seen.add(t);
        hits += 1;
      }
    });
  });
  const inst = INSTRUMENT_MAP[state.instrument];
  let instHit = 0;
  if (inst) instHit = inst.affinity.filter((a) => ov.moods.includes(a)).length;
  return Math.min(1, hits * 0.16 + instHit * 0.14);
}

export function computeRates(state: GameState, now = Date.now()): RateBreakdown {
  const ov = OVERLOOK_MAP[state.overlook] ?? OVERLOOK_MAP.mistquay;
  const inst = INSTRUMENT_MAP[state.instrument] ?? INSTRUMENT_MAP.lute_worn;
  const stance = STANCE_MAP[state.stance] ?? STANCE_MAP.earnest;
  const songs = songMultipliers(state);
  const sky = skyState(now, state.overlook);
  const up = (id: string) => state.upgrades.includes(id);

  const parts: RateBreakdown['parts'] = [];

  let coin = ov.base.coin;
  let insp = ov.base.insp;
  let leisure = ov.base.leisure;
  let renown = ov.base.renown;

  const apply = (label: string, c = 1, i = 1, l = 1, r = 1) => {
    coin *= c;
    insp *= i;
    leisure *= l;
    renown *= r;
    const avg = (c + i + l + r) / 4;
    if (Math.abs(avg - 1) > 0.005) {
      parts.push({ label, value: avg, kind: avg >= 1 ? 'good' : 'bad' });
    }
  };

  apply(
    inst.name,
    inst.mul.coin ?? 1,
    inst.mul.insp ?? 1,
    inst.mul.leisure ?? 1,
    inst.mul.renown ?? 1,
  );
  apply('曲目单', songs.coin, songs.insp, songs.leisure, songs.renown);
  apply(stance.name, stance.mul.coin, stance.mul.insp, stance.mul.leisure, stance.mul.renown);

  // audience density
  const crowd = 1 + ov.crowd * 0.45;
  apply('人流', crowd, 1, crowd * 0.6 + 0.4, crowd);

  // resonance
  const res = resonanceScore(state);
  if (res > 0) apply('共鸣·钱', 1 + res, 1 + res * 0.8, 1, 1 + res * 0.6);

  // time of day
  const nightBase = ov.scene.forceNight ? 1.08 : 0.78;
  const tod =
    sky.phase === 'day' ? 1.14 : sky.phase === 'dusk' ? 1.26 : sky.phase === 'dawn' ? 0.96 : nightBase;
  const nightBoost = sky.phase === 'night' && up('up_lantern') ? 1.25 : 1;
  apply(phaseLabel(sky.phase), tod * nightBoost, sky.phase === 'night' ? 1.3 : 1, 1, 1);

  // weather — the multipliers, and any upgrade that rewrites them, are
  // content (content/weather/values.ts): this block only applies them
  const wx = weatherPay(sky.weather, state.upgrades);
  if (!wx.neutral) apply(weatherLabel(sky.weather), wx.coin, wx.insp, wx.leisure, wx.renown);

  /* craft & rarity — playing something you know well, on something worth
     looking at, is the whole point of the instrument system. Both curves
     come from content/performance/values.ts. */
  const pay = performancePay(state);
  apply(PERFORMANCE_TEXT.rates.prof, pay.skill.coin, pay.skill.insp, 1, pay.skill.renown);
  apply(PERFORMANCE_TEXT.rates.rarity, pay.rarity.coin, pay.rarity.insp, 1, pay.rarity.renown);
  if (pay.novice !== 1) apply(PERFORMANCE_TEXT.rates.novice, pay.novice, 1, 1, pay.novice);

  // upgrades
  if (up('up_coffer')) apply('铜边钱匣', 1.22);
  if (up('up_ring')) apply('名家指环', 1.12, 1, 1, 1.6);
  if (up('up_cart')) apply('折叠小推车', 1, 1, 1.25, 1);
  if (up('up_pass2')) apply('云游者披风', 1.45, 1.45, 1.45, 1.45);

  /* grudges — the only place the hidden enmity counter touches the idle
     loop. Local, floored and shown as a named line rather than a number,
     so the player can tell something is off without being handed the
     stat: see game/systems/enmity.ts */
  const grudge = enmityPay(state.story, state.overlook);
  if (grudge.label) apply(grudge.label, grudge.coin, 1, 1, grudge.renown);

  /* being known here pays. The multiplier steps with the *local* tier
     (systems/fame.ts) rather than sliding with a global number, so the
     player can feel the step the town's word changes and never has to
     read a stat to understand why the coins moved. */
  const fame = famePay(state);
  if (fame.coin !== 1) apply(fame.label, fame.coin, 1, 1, 1);

  /* your own library, working for you: every leaf you brought home is a
     little more of your people's craft back in your hands */
  const sc = scorePay(state);
  if (sc.coin !== 1 || sc.insp !== 1) apply(sc.label, sc.coin, sc.insp, 1, 1);

  const staminaCap = 6 + (up('up_cushion') ? 5 : 0) + (up('up_apprentice') ? 1 : 0);
  const leisureCap = 30 + (up('up_cart') ? 20 : 0);
  const offlineCap = up('up_pass2') ? 48 : up('up_pass') ? 28 : 12;

  /* a master playing in a storm is a story waiting to happen: both
     multipliers are content-side (performance + weather values) */
  const eventRate =
    0.52 *
    stance.mul.event *
    (inst.mul.event ?? 1) *
    songs.event *
    (up('up_whistle') ? 1.4 : 1) *
    wx.event *
    pay.event *
    fame.event;

  return {
    coin,
    insp,
    leisure,
    renown,
    parts,
    resonance: res,
    eventRate,
    pay,
    staminaCap,
    leisureCap,
    offlineCap,
    fatigued: state.fatigue >= staminaCap,
  };
}

/* ============================================================
   Accrual — called on load, on focus, and on a slow interval
   ============================================================ */

export interface AccrualResult {
  hours: number;
  cappedHours: number;
  gained: { coin: number; insp: number; renown: number; leisure: number };
  newEvents: PendingEvent[];
  newDecisions: PendingDecision[];
  fatiguedFor: number;
  /** what those hours did to the instrument in hand, if anything */
  practice?: ReturnType<typeof grantPractice>;
}

export function eligibleEvents(state: GameState, ov: Overlook): GameEvent[] {
  return EVENTS.filter((e) => {
    if (e.once && state.firedOnce[e.id]) return false;
    if (e.needFlag && !state.flags[e.needFlag]) return false;
    /* `minRenown` is read against *local* fame: an encounter that needs a
       crowd needs one here, not a reputation two provinces away */
    if (e.minRenown && fameOf(state) < e.minRenown) return false;
    if (e.moods.length && !e.moods.some((m) => ov.moods.includes(m))) return false;
    return true;
  });
}

export function pickEvent(pool: GameEvent[], seed: number): GameEvent | null {
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rand01(seed) * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

/* Rates for a *stretch* of time rather than a moment.

   computeRates reads the sky as it stands, which is right for the header
   and wrong for a night's absence: the player who closed the app at dusk
   in the rain should not be paid dusk-in-the-rain for nine hours. So the
   window actually being paid for is sampled once per weather bucket and
   the sky-driven rates averaged. Caps and labels stay as they are now —
   only the per-hour numbers move. Short sessions skip the work entirely
   and get the exact same answer as before. */
const RATE_SAMPLES_MAX = 12;

export function windowRates(s: GameState, from: number, to: number, now: number): RateBreakdown {
  const base = computeRates(s, now);
  const spanHours = (to - from) / 3600000;
  if (spanHours < WEATHER_VALUES.bucketHours) return base;

  const n = Math.max(2, Math.min(RATE_SAMPLES_MAX, Math.round(spanHours / WEATHER_VALUES.bucketHours)));
  let coin = 0;
  let insp = 0;
  let leisure = 0;
  let renown = 0;
  let eventRate = 0;
  for (let i = 0; i < n; i++) {
    /* midpoint of each slice, so a sample is never taken exactly on a
       bucket edge where the roll flips */
    const t = from + ((i + 0.5) / n) * (to - from);
    const r = computeRates(s, t);
    coin += r.coin;
    insp += r.insp;
    leisure += r.leisure;
    renown += r.renown;
    eventRate += r.eventRate;
  }
  return {
    ...base,
    coin: coin / n,
    insp: insp / n,
    leisure: leisure / n,
    renown: renown / n,
    eventRate: eventRate / n,
  };
}

/** Accrue idle progress into `pending`. Mutates a copy and returns it. */
export function accrue(state: GameState, now = Date.now()): { state: GameState; result: AccrualResult } {
  const s: GameState = { ...state, pending: { ...state.pending } };
  const nowRates = computeRates(s, now);
  const rawHours = Math.max(0, (now - s.lastTick) / 3600000);
  const hours = Math.min(rawHours, nowRates.offlineCap);
  /* takings stop at the offline cap, so the paid window starts where the
     player left off and ends `hours` later — not at `now` */
  const rates = windowRates(s, s.lastTick, s.lastTick + hours * 3600000, now);

  if (rawHours < 1 / 3600) {
    return {
      state: s,
      result: {
        hours: 0,
        cappedHours: 0,
        gained: { coin: 0, insp: 0, renown: 0, leisure: 0 },
        newEvents: [],
        newDecisions: [],
        fatiguedFor: 0,
      },
    };
  }

  const fresh = Math.max(0, Math.min(hours, rates.staminaCap - s.fatigue));
  const tired = Math.max(0, hours - fresh);
  const tiredFactor = s.upgrades.includes('up_apprentice') ? 0.62 : 0.35;
  const stance = STANCE_MAP[s.stance] ?? STANCE_MAP.earnest;
  const effHours = fresh + tired * tiredFactor;

  const gained = {
    coin: rates.coin * effHours,
    insp: rates.insp * effHours,
    renown: rates.renown * effHours,
    leisure: Math.min(rates.leisure * hours, rates.leisureCap - (s.leisure + s.pending.leisure)),
  };
  gained.leisure = Math.max(0, gained.leisure);

  s.pending.coin += gained.coin;
  s.pending.insp += gained.insp;
  s.pending.renown += gained.renown;
  s.pending.leisure += gained.leisure;
  s.fatigue = Math.min(rates.staminaCap + 24, s.fatigue + hours * stance.drain);
  s.lastTick = now;

  /* ---- grudges cool ----
     Aged on the real clock, not on capped idle hours: staying away for a
     fortnight should count for a fortnight even though the takings stop
     at the offline cap. Never reaches zero on its own — only a scene can
     do that (systems/enmity.ts). */
  s.story = decayEnmity(s.story, now, s.overlook);

  /* ---- and the towns forget ----
     Same clock, same reasoning: a month away is a month of a town not
     hearing you. Never below what your travelled name guarantees, and
     barely at all in the town you are standing in (systems/fame.ts). */
  Object.assign(s, forgetFame(s, now, s.overlook));

  /* ---- craft ----
     Every hour spent performing is also an hour of practice on the
     instrument in hand. Fresh hours count fully; tired hours count for
     less (the factor is content, in content/proficiency/values.ts), so
     the fresh/tired split computed above is reused rather than guessed
     at again. Crossing a milestone hands the whole category a permanent
     bonus — the system works that out, we only store what it returns. */
  const freshPractice = grantPractice(s, s.instrument, fresh, { stance: s.stance });
  const tiredPractice =
    tired > 0
      ? grantPractice(
          { ...s, prof: freshPractice.prof, profBonus: freshPractice.profBonus },
          s.instrument,
          tired,
          { stance: s.stance, tired: true },
        )
      : null;
  const practice = tiredPractice
    ? {
        ...tiredPractice,
        before: freshPractice.before,
        gained: tiredPractice.after - freshPractice.before,
        milestones: freshPractice.milestones + tiredPractice.milestones,
        justMastered: freshPractice.justMastered || tiredPractice.justMastered,
      }
    : freshPractice;
  if (practice.gained > 0) {
    s.prof = practice.prof;
    s.profBonus = practice.profBonus;
    /* The clock ticks many times between two collects, so the receipt has to
       add up rather than be overwritten. Switching instruments starts a new
       receipt: the sheet talks about the thing currently in your hands. */
    const prev =
      s.pendingPractice && s.pendingPractice.instrument === s.instrument ? s.pendingPractice : null;
    s.pendingPractice = {
      instrument: s.instrument,
      from: prev ? prev.from : practice.before,
      gained: (prev?.gained ?? 0) + practice.gained,
      milestones: (prev?.milestones ?? 0) + practice.milestones,
      mastered: practice.after >= PROFICIENCY_VALUES.max,
    };
  }

  // events
  const ov = OVERLOOK_MAP[s.overlook] ?? OVERLOOK_MAP.mistquay;
  const maxEvents = 8 + (s.upgrades.includes('up_journal') ? 4 : 0);
  const room = Math.max(0, maxEvents - s.pendingEvents.length - s.decisions.length);
  const expected = hours * rates.eventRate;
  let count = Math.floor(expected);
  const frac = expected - count;
  if (rand01(hash32(Math.floor(now / 60000), s.overlook, 'ev')) < frac) count += 1;
  count = Math.min(count, room);

  const newEvents: PendingEvent[] = [];
  const newDecisions: PendingDecision[] = [];
  const pool = eligibleEvents(s, ov);
  const firedNow = new Set<string>();

  for (let i = 0; i < count; i++) {
    const seed = hash32(Math.floor(now / 1000), i, s.overlook, s.collects);
    const filtered = pool.filter((e) => !firedNow.has(e.id));
    const ev = pickEvent(filtered.length ? filtered : pool, seed);
    if (!ev) break;
    firedNow.add(ev.id);
    if (ev.once) s.firedOnce = { ...s.firedOnce, [ev.id]: true };
    const at = now - Math.floor(rand01(seed + 7) * hours * 3600000);
    if (ev.choices && ev.choices.length) {
      newDecisions.push({ eventId: ev.id, at, coinPerHour: rates.coin, inspPerHour: rates.insp });
    } else {
      const boost = s.upgrades.includes('up_journal') ? 1.35 : 1;
      newEvents.push({
        eventId: ev.id,
        at,
        gain: {
          coin: (ev.gain?.coin ?? 0) * rates.coin * boost,
          insp: (ev.gain?.insp ?? 0) * rates.insp * boost,
          renown: (ev.gain?.renown ?? 0) * boost,
          leisure: (ev.gain?.leisure ?? 0) * boost,
        },
        item: ev.item,
      });
      if (ev.flag) s.flags = { ...s.flags, [ev.flag]: true };
    }
  }

  s.pendingEvents = [...s.pendingEvents, ...newEvents].sort((a, b) => a.at - b.at);
  s.decisions = [...s.decisions, ...newDecisions].sort((a, b) => a.at - b.at);

  return {
    state: s,
    result: {
      hours: rawHours,
      cappedHours: hours,
      gained,
      newEvents,
      newDecisions,
      fatiguedFor: tired,
      practice,
    },
  };
}

/* ============================================================
   Formatting
   ============================================================ */

export function fmtNum(n: number): string {
  const v = Math.floor(n);
  if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿';
  if (v >= 10000) return (v / 10000).toFixed(v >= 1000000 ? 0 : 2) + '万';
  return v.toLocaleString('en-US');
}

export function fmtRate(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 100) return Math.round(n).toString();
  return n.toFixed(1);
}

export function fmtDuration(hours: number): string {
  if (hours < 1 / 60) return '刚刚';
  const total = Math.floor(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}

export function itemName(id: string): string {
  return ITEM_MAP[id]?.name ?? id;
}
