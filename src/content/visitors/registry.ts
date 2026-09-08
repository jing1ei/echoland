import type { MoodTag, Phase, WeatherRef } from '../../game/types';

/* ============================================================
   STALL VISITORS — the spine

   The crowd at the stall is wallpaper: nine interchangeable silhouettes
   that come and go with the takings. That is fine — until you realise
   the crowd is also the only place the game can *promise* something.

   So: once in a while, one of the figures is wrong. Taller. Hooded.
   Carrying a lantern in daylight. Standing closer than a stranger
   should. Nothing happens. The player sees it, and the next time they
   set the stall down they are hoping it comes back.

   That is the whole system. A visitor is a silhouette with weight and
   a few conditions; it does not require a scene, a character or a
   reward to justify itself. Some of them do eventually speak (see
   ./triggers.ts) and that is the payoff for having watched.

   Adding one:
     · a row here
     · a silhouette in ./art.ts
     · optionally a gate in ./conditions.ts
     · optionally a scene + trigger, if it should ever open its mouth
   ============================================================ */

export interface VisitorSpec {
  id: string;
  /** which silhouette in ./art.ts to draw */
  art: string;
  /** relative weight among everyone eligible right now */
  weight: number;

  /* ---- where and when it may be seen ---- */
  /** only at these overlooks (empty/omitted = anywhere) */
  overlooks?: string[];
  /** only at overlooks carrying one of these moods */
  moods?: MoodTag[];
  /** only during these parts of the day */
  phases?: Phase[];
  /** only under these skies — ids or group ids */
  weather?: WeatherRef[];
  /** extra gate, by key into ./conditions.ts */
  gate?: string;

  /* ---- how it reads ----
     Nothing here describes the figure in words. It is drawn, not
     narrated: see ./art.ts and the note at the top of ./text.ts. */
  /** the cast member this figure is a rumour of, if any */
  character?: string;
  /** true = stops showing up once that character is properly met */
  untilMet?: boolean;
}

export const VISITOR_SPECS: VisitorSpec[] = [
  /* -- the common strangers: no story attached, ever ------------- */
  {
    id: 'vs_hood',
    art: 'hood',
    weight: 30,
  },
  {
    id: 'vs_lantern',
    art: 'lantern',
    weight: 22,
    phases: ['dusk', 'night'],
  },
  {
    id: 'vs_parasol',
    art: 'parasol',
    weight: 18,
    phases: ['day', 'dawn'],
  },
  {
    id: 'vs_courier',
    art: 'courier',
    weight: 16,
  },
  {
    id: 'vs_cat',
    art: 'cat',
    weight: 20,
    moods: ['sea', 'city', 'ruin'],
  },

  /* -- weather-shaped figures ------------------------------------ */
  {
    id: 'vs_rain_watcher',
    art: 'rain_watcher',
    weight: 26,
    weather: ['rain', 'sleet'],
  },
  {
    id: 'vs_snow_veil',
    art: 'veil',
    weight: 24,
    weather: ['snowfall', 'fog'],
  },

  /* -- rarer, place-bound, and the ones that do eventually talk --- */
  {
    id: 'vs_case',
    art: 'case',
    weight: 14,
    moods: ['city', 'festive', 'sea'],
    gate: 'somewhatKnown',
  },
  {
    id: 'vs_tall_dark',
    art: 'tall_dark',
    weight: 9,
    phases: ['night'],
    gate: 'somewhatKnown',
  },
  {
    id: 'vs_pale',
    art: 'pale',
    weight: 6,
    moods: ['ruin', 'ice', 'melancholy', 'holy'],
    gate: 'wellTravelled',
  },
  {
    id: 'vs_glow',
    art: 'glow',
    weight: 4,
    phases: ['dusk', 'night'],
    moods: ['sky', 'night', 'cloud', 'desert'],
    gate: 'wellTravelled',
  },
];

export const VISITOR_SPEC_MAP: Record<string, VisitorSpec> = Object.fromEntries(
  VISITOR_SPECS.map((v) => [v.id, v]),
);
