import type { WeatherGroupId, WeatherId } from '../../game/types';

/* ============================================================
   WEATHER — the spine

   The home screen keeps its scenery; weather is a layer over it. So a
   weather is not a place, it is a small bundle of: odds (values), a look
   (art), a sound (audio), an economic effect (values) and possibly a
   story hook (conditions + scenes).

   This file only answers "which weathers exist, and what family is each
   one in". Groups let a trigger say `of: ['rain']` and stay correct when
   a new kind of rain is added later.
   ============================================================ */

export interface WeatherSpec {
  id: WeatherId;
  groups: WeatherGroupId[];
  /** rare, and allowed to interrupt the player with an event */
  extreme?: boolean;
}

export const WEATHER_SPECS: WeatherSpec[] = [
  { id: 'clear', groups: ['calm'] },
  { id: 'cloudy', groups: ['calm'] },
  { id: 'overcast', groups: ['lowlight'] },
  { id: 'rain_light', groups: ['rain', 'wet'] },
  { id: 'rain_heavy', groups: ['rain', 'wet', 'extreme'], extreme: true },
  { id: 'thunder', groups: ['rain', 'wet', 'lowlight', 'extreme'], extreme: true },
  { id: 'fog', groups: ['lowlight'] },
  { id: 'wind', groups: [] },
  { id: 'snow', groups: ['snowfall', 'lowlight'] },
  { id: 'sleet', groups: ['snowfall', 'wet', 'extreme'], extreme: true },
];

export const WEATHER_SPEC_MAP: Record<string, WeatherSpec> = Object.fromEntries(
  WEATHER_SPECS.map((w) => [w.id, w]),
);

export const WEATHER_IDS: WeatherId[] = WEATHER_SPECS.map((w) => w.id);

/** group id -> member weathers, built once from the spine */
export const WEATHER_GROUPS: Record<string, WeatherId[]> = (() => {
  const out: Record<string, WeatherId[]> = {};
  WEATHER_SPECS.forEach((w) =>
    w.groups.forEach((g) => {
      (out[g] ??= []).push(w.id);
    }),
  );
  return out;
})();
