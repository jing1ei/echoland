import type { MoodTag, Phase } from '../../game/types';
import type { WeatherId } from '../../game/types';

/* ============================================================
   WEATHER — numbers

   Odds and consequences. The system module in game/systems/weather.ts
   reads this and nothing else; it contains no weights of its own.

   How a weather is chosen:

     1. the overlook's moods pick a climate (`climateByMood`, first match)
     2. the climate's weight table is biased by time of day (`phaseBias`)
     3. one deterministic roll per (day, time bucket, overlook) picks a
        weather — so the sky is stable while you look at it, and every
        device showing the same widget agrees

   An overlook with `scene.forceRain` is restricted to the `rain` group
   before rolling, which keeps 雨巷 permanently wet without a special case
   in code.
   ============================================================ */

export type ClimateId = 'temperate' | 'maritime' | 'arid' | 'highland' | 'frostbound' | 'monsoon';

export type WeightTable = Partial<Record<WeatherId, number>>;

export interface WeatherEffect {
  coin?: number;
  insp?: number;
  leisure?: number;
  renown?: number;
  /** multiplies the chance of a passing event */
  event?: number;
  /** an upgrade the player owns may rewrite any of the above */
  ifUpgrade?: Record<string, { coin?: number; insp?: number; leisure?: number; renown?: number }>;
}

export interface WeatherValues {
  /** the sky is re-rolled this often, in hours */
  bucketHours: number;
  /** first matching mood wins; falls through to `defaultClimate` */
  climateByMood: Array<[MoodTag, ClimateId]>;
  defaultClimate: ClimateId;
  climates: Record<ClimateId, WeightTable>;
  /** per-weather multiplier on its weight, by phase of day */
  phaseBias: Partial<Record<WeatherId, Partial<Record<Phase, number>>>>;
  /** economic consequence of standing in it */
  effects: Partial<Record<WeatherId, WeatherEffect>>;
  /** chance of the little wind-direction aside in the header */
  flavourChance: number;
}

export const WEATHER_VALUES: WeatherValues = {
  bucketHours: 2.5,

  climateByMood: [
    ['ice', 'frostbound'],
    ['desert', 'arid'],
    ['rain', 'monsoon'],
    ['cloud', 'highland'],
    ['sea', 'maritime'],
    ['sky', 'highland'],
    ['ruin', 'temperate'],
  ],
  defaultClimate: 'temperate',

  climates: {
    temperate: {
      clear: 48,
      cloudy: 15,
      overcast: 6,
      rain_light: 13,
      rain_heavy: 3.4,
      thunder: 1.2,
      fog: 3.4,
      wind: 9,
    },
    maritime: {
      clear: 36,
      cloudy: 10,
      overcast: 6,
      rain_light: 14,
      rain_heavy: 4,
      thunder: 1.2,
      fog: 14,
      wind: 14,
    },
    arid: {
      clear: 60,
      cloudy: 10,
      overcast: 3,
      rain_light: 2.4,
      rain_heavy: 0.8,
      thunder: 0.8,
      fog: 1,
      wind: 22,
    },
    highland: {
      clear: 34,
      cloudy: 14,
      overcast: 10,
      rain_light: 4,
      rain_heavy: 1,
      thunder: 0.6,
      fog: 26,
      wind: 10,
    },
    frostbound: {
      clear: 24,
      cloudy: 22,
      overcast: 8,
      fog: 4,
      wind: 2,
      snow: 36,
      sleet: 4,
    },
    monsoon: {
      clear: 3,
      cloudy: 8,
      overcast: 14,
      rain_light: 46,
      rain_heavy: 16,
      thunder: 5,
      fog: 8,
    },
  },

  phaseBias: {
    fog: { dawn: 2.4, day: 0.45, dusk: 0.9, night: 1.5 },
    thunder: { dawn: 0.5, day: 1.3, dusk: 1.5, night: 0.8 },
    rain_heavy: { dusk: 1.15, night: 1.1 },
    snow: { day: 0.9, night: 1.2 },
    clear: { day: 1.08 },
    wind: { dusk: 1.15 },
  },

  effects: {
    /* clear is the baseline and deliberately has no entry */
    cloudy: { coin: 1.02, insp: 1.02 },
    overcast: { coin: 0.97, insp: 1.06 },
    rain_light: {
      coin: 0.8,
      insp: 1.25,
      leisure: 1.1,
      ifUpgrade: { up_umbrella: { coin: 1.18 } },
    },
    rain_heavy: {
      coin: 0.6,
      insp: 1.4,
      leisure: 1.15,
      event: 1.1,
      ifUpgrade: { up_umbrella: { coin: 1.05 } },
    },
    thunder: {
      coin: 0.45,
      insp: 1.6,
      renown: 1.1,
      event: 1.25,
      ifUpgrade: { up_umbrella: { coin: 0.9 } },
    },
    fog: { coin: 0.92, insp: 1.18, leisure: 1.05 },
    wind: { coin: 0.94, insp: 1.12 },
    snow: { coin: 0.88, insp: 1.3 },
    /* wet counts as wet: the umbrella earns its keep here too, a little
       less than in light rain because sleet also freezes your hands */
    sleet: {
      coin: 0.74,
      insp: 1.34,
      leisure: 1.05,
      event: 1.1,
      ifUpgrade: { up_umbrella: { coin: 1.12 } },
    },
  },

  flavourChance: 0.1,
};
