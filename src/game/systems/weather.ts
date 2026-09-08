import type { Scene, Trigger } from '../story/types';
import type {
  CanvasWeather,
  MoodTag,
  Phase,
  WeatherId,
  WeatherRef,
} from '../types';
import { hash32, rand01 } from '../rng';
import { devWeather } from '../devFlags';
import {
  WEATHER_ART,
  WEATHER_AUDIO,
  WEATHER_CONTENT_SCENES,
  WEATHER_CONTENT_TRIGGERS,
  WEATHER_FLAVOUR,
  WEATHER_GROUPS,
  WEATHER_SPEC_MAP,
  WEATHER_TEXT,
  WEATHER_GROUP_TEXT,
  WEATHER_VALUES as V,
  type ClimateId,
} from '../../content/weather';

/* ============================================================
   WEATHER — the system

   Core logic, no content. It picks a weather, says what that costs you,
   and hands the art/audio description to whoever is drawing. Every
   weight, effect, colour and label comes from content/weather/.

   Determinism matters more than variety here: the widget, the stage and
   the scene canvas all ask independently and must agree, and a sky that
   re-rolled on every render would flicker. So the roll is a hash of
   (day, time bucket, overlook) — stable while you watch, different
   tomorrow.
   ============================================================ */

export interface WeatherPlace {
  id: string;
  moods: MoodTag[];
  forceRain?: boolean;
}

export function climateOf(place: WeatherPlace): ClimateId {
  for (const [mood, climate] of V.climateByMood) {
    if (place.moods.includes(mood)) return climate;
  }
  return V.defaultClimate;
}

function weightsFor(place: WeatherPlace, phase: Phase): Array<[WeatherId, number]> {
  const table = V.climates[climateOf(place)] ?? {};
  const rainOnly = place.forceRain ? new Set(WEATHER_GROUPS.rain ?? []) : null;
  const out: Array<[WeatherId, number]> = [];
  (Object.keys(table) as WeatherId[]).forEach((id) => {
    if (rainOnly && !rainOnly.has(id)) return;
    const base = table[id] ?? 0;
    if (base <= 0) return;
    const bias = V.phaseBias[id]?.[phase] ?? 1;
    out.push([id, base * bias]);
  });
  /* a forceRain overlook whose climate lists no rain still has to rain */
  if (!out.length && rainOnly) {
    return [...rainOnly].map((id) => [id, 1]);
  }
  return out;
}

/** Deterministic pick for a place and a moment. */
export function rollWeather(place: WeatherPlace, now: number, phase: Phase, hourFloat: number): WeatherId {
  /* the only non-deterministic input in the whole system, and it can
     only be set by the GM layer (src/game/devFlags.ts) */
  const forced = devWeather();
  if (forced) return forced;

  const pool = weightsFor(place, phase);
  if (!pool.length) return 'clear';
  const dayIndex = Math.floor(now / 86400000);
  const bucket = Math.floor(hourFloat / V.bucketHours);
  const r = rand01(hash32(dayIndex, bucket, place.id, 'w'));
  const total = pool.reduce((a, [, w]) => a + w, 0);
  let acc = r * total;
  for (const [id, w] of pool) {
    acc -= w;
    if (acc <= 0) return id;
  }
  return pool[pool.length - 1][0];
}

/** the optional aside in the stage header — flavour only */
export function weatherFlavour(place: WeatherPlace, now: number, hourFloat: number): string {
  const dayIndex = Math.floor(now / 86400000);
  const bucket = Math.floor(hourFloat / V.bucketHours);
  const r = rand01(hash32(place.id, dayIndex, bucket, 'flavour'));
  if (r > V.flavourChance) return '';
  const i = Math.floor(rand01(hash32(place.id, bucket, 'f2')) * WEATHER_FLAVOUR.length);
  return WEATHER_FLAVOUR[Math.min(i, WEATHER_FLAVOUR.length - 1)] ?? '';
}

/* ------------------------------------------------------------
   Reading a weather
   ------------------------------------------------------------ */

export const weatherLabel = (id: WeatherId): string => WEATHER_TEXT[id]?.label ?? id;
/** label for an id *or* a group id — used by the condition describer */
export const weatherRefLabel = (ref: WeatherRef): string =>
  WEATHER_TEXT[ref as WeatherId]?.label ?? WEATHER_GROUP_TEXT[ref] ?? ref;
export const weatherNote = (id: WeatherId): string => WEATHER_TEXT[id]?.note ?? '';
export const weatherArt = (id: WeatherId) => WEATHER_ART[id] ?? WEATHER_ART.clear;
export const weatherAudio = (id: WeatherId) => WEATHER_AUDIO[id];
export const isExtreme = (id: WeatherId): boolean => !!WEATHER_SPEC_MAP[id]?.extreme;

/** the look the procedural scene canvas should keep drawing underneath */
export const canvasWeather = (id: WeatherId): CanvasWeather => weatherArt(id).canvas;

/** does a weather answer to this id or group id? drives the story condition */
export function weatherMatches(id: WeatherId, refs: WeatherRef[]): boolean {
  return refs.some((ref) => ref === id || (WEATHER_GROUPS[ref] ?? []).includes(id));
}

export interface WeatherPay {
  coin: number;
  insp: number;
  leisure: number;
  renown: number;
  event: number;
  /** true when nothing at all changes, so the rate breakdown can skip a row */
  neutral: boolean;
}

/** what standing in this weather does to the takings */
export function weatherPay(id: WeatherId, upgrades: string[]): WeatherPay {
  const e = V.effects[id];
  const pay: WeatherPay = { coin: 1, insp: 1, leisure: 1, renown: 1, event: 1, neutral: true };
  if (!e) return pay;
  pay.coin = e.coin ?? 1;
  pay.insp = e.insp ?? 1;
  pay.leisure = e.leisure ?? 1;
  pay.renown = e.renown ?? 1;
  pay.event = e.event ?? 1;
  /* an upgrade may rewrite any of the four — an umbrella turns a light
     rain from a loss into the best pitch on the street */
  if (e.ifUpgrade) {
    Object.entries(e.ifUpgrade).forEach(([upgradeId, patch]) => {
      if (!upgrades.includes(upgradeId)) return;
      if (patch.coin != null) pay.coin = patch.coin;
      if (patch.insp != null) pay.insp = patch.insp;
      if (patch.leisure != null) pay.leisure = patch.leisure;
      if (patch.renown != null) pay.renown = patch.renown;
    });
  }
  pay.neutral =
    pay.coin === 1 && pay.insp === 1 && pay.leisure === 1 && pay.renown === 1 && pay.event === 1;
  return pay;
}

/* ------------------------------------------------------------
   Story surface

   The registry gathers scenes and triggers from every module through
   these two names, so weather narrative plugs in without the router
   knowing weather exists.
   ------------------------------------------------------------ */

export const WEATHER_SCENES: Scene[] = WEATHER_CONTENT_SCENES;
export const WEATHER_TRIGGERS: Trigger[] = WEATHER_CONTENT_TRIGGERS;
