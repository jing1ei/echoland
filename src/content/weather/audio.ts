import type { WeatherId } from '../../game/types';

/* ============================================================
   WEATHER — sound

   The game's only sound source is a tiny oscillator, so a weather's
   "audio asset" is a short figure played once when the sky changes while
   you are watching. Silence is a valid entry: fair weather says nothing.
   ============================================================ */

export interface WeatherAudio {
  /** frequencies of the little figure, in order */
  cue: number[];
  /** relative gain, scaled by the master volume */
  gain: number;
  /** seconds between notes */
  stagger: number;
  dur: number;
}

export const WEATHER_AUDIO: Partial<Record<WeatherId, WeatherAudio>> = {
  rain_light: { cue: [392.0, 349.23], gain: 0.045, stagger: 0.12, dur: 0.5 },
  rain_heavy: { cue: [261.63, 246.94, 220.0], gain: 0.05, stagger: 0.1, dur: 0.6 },
  thunder: { cue: [110.0, 82.41], gain: 0.07, stagger: 0.18, dur: 1.1 },
  fog: { cue: [329.63, 311.13], gain: 0.038, stagger: 0.26, dur: 0.9 },
  wind: { cue: [523.25, 493.88], gain: 0.035, stagger: 0.1, dur: 0.4 },
  snow: { cue: [659.25, 783.99], gain: 0.036, stagger: 0.16, dur: 0.7 },
  sleet: { cue: [587.33, 554.37, 493.88], gain: 0.04, stagger: 0.1, dur: 0.5 },
  overcast: { cue: [293.66], gain: 0.03, stagger: 0.1, dur: 0.6 },
};
