import type { Trigger } from '../../game/story/types';
import { inWeather } from './conditions';

/* ============================================================
   WEATHER — triggers

   Ambient priority (20) on purpose: a storm beat should never step on a
   main-line scene. Conditions are necessary but never sufficient — every
   one of these still has to win a roll.
   ============================================================ */

export const WEATHER_CONTENT_TRIGGERS: Trigger[] = [
  {
    id: 'tw_thunder',
    scene: 'w_thunder_shelter',
    on: ['open', 'collect'],
    when: inWeather('thunder'),
    chance: 0.35,
    priority: 24,
    cooldownH: 20,
    line: 'ambient',
  },
  {
    id: 'tw_fog',
    scene: 'w_fog_listener',
    on: ['collect'],
    when: inWeather('fog'),
    chance: 0.14,
    priority: 20,
    cooldownH: 30,
    line: 'ambient',
  },
  {
    id: 'tw_snow',
    scene: 'w_snow_hands',
    on: ['collect'],
    when: { k: 'all', of: [inWeather('snowfall'), { k: 'collects', min: 3 }] },
    chance: 0.16,
    priority: 20,
    cooldownH: 26,
    line: 'ambient',
  },
];
