import type { CanvasWeather, WeatherId } from '../../game/types';

/* ============================================================
   WEATHER — art

   The rule the design asks for: weather is a *mask over* the scenery, it
   never replaces it. So every weather is described twice:

     canvas   which of the six looks the procedural scene already knows
              how to draw (rain particles, snow, mist…), so the backdrop
              stays consistent with the sky
     overlay  the layer painted on top by ui/WeatherOverlay — a tint, a
              blur, and any of the four particle systems

   Nothing here is a file path because the project ships no bitmaps; the
   "asset" is the parameter set. If real art ever arrives it gets a
   `sprite` field in this file and nowhere else.
   ============================================================ */

export interface StreakSpec {
  count: number;
  /** degrees from vertical */
  tilt: number;
  /** length in px */
  len: number;
  width: number;
  /** seconds for one fall */
  speed: number;
  opacity: number;
  color: string;
}

export interface FlakeSpec {
  count: number;
  size: number;
  speed: number;
  /** horizontal sway in px */
  drift: number;
  opacity: number;
  color: string;
}

export interface BandSpec {
  count: number;
  speed: number;
  opacity: number;
  color: string;
  /** band height as a fraction of the screen */
  height: number;
}

export interface FlashSpec {
  /** average gap between flashes, ms */
  every: number;
  jitter: number;
  opacity: number;
  color: string;
}

export interface WeatherArt {
  canvas: CanvasWeather;
  /** full-screen wash; '' = no tint */
  tint: string;
  /** 0..1 */
  tintOpacity: number;
  /** px of backdrop blur applied to the scenery through the mask */
  blur: number;
  /** extra darkening at the edges, 0..1 */
  vignette: number;
  streaks?: StreakSpec;
  flakes?: FlakeSpec;
  bands?: BandSpec;
  gusts?: BandSpec;
  flash?: FlashSpec;
}

export const WEATHER_ART: Record<WeatherId, WeatherArt> = {
  clear: { canvas: 'clear', tint: '', tintOpacity: 0, blur: 0, vignette: 0 },

  cloudy: {
    canvas: 'cloudy',
    tint: '#9fa8b4',
    tintOpacity: 0.1,
    blur: 0,
    vignette: 0.06,
    bands: { count: 2, speed: 78, opacity: 0.1, color: '#cfd6de', height: 0.16 },
  },

  overcast: {
    canvas: 'cloudy',
    tint: '#6e7580',
    tintOpacity: 0.22,
    blur: 0.4,
    vignette: 0.16,
    bands: { count: 3, speed: 96, opacity: 0.14, color: '#aeb6be', height: 0.2 },
  },

  rain_light: {
    canvas: 'rain',
    tint: '#5f6f7d',
    tintOpacity: 0.16,
    blur: 0.6,
    vignette: 0.14,
    streaks: {
      count: 46,
      tilt: 12,
      len: 54,
      width: 1,
      speed: 0.9,
      opacity: 0.3,
      color: 'rgba(226,238,247,0.75)',
    },
  },

  rain_heavy: {
    canvas: 'rain',
    tint: '#48586a',
    tintOpacity: 0.3,
    blur: 1.4,
    vignette: 0.24,
    streaks: {
      count: 84,
      tilt: 17,
      len: 96,
      width: 1.6,
      speed: 0.52,
      opacity: 0.42,
      color: 'rgba(232,242,250,0.85)',
    },
    bands: { count: 2, speed: 34, opacity: 0.12, color: '#dfe8f0', height: 0.3 },
  },

  thunder: {
    canvas: 'rain',
    tint: '#3b4557',
    tintOpacity: 0.36,
    blur: 1.6,
    vignette: 0.3,
    streaks: {
      count: 74,
      tilt: 20,
      len: 104,
      width: 1.5,
      speed: 0.48,
      opacity: 0.4,
      color: 'rgba(226,238,250,0.85)',
    },
    flash: { every: 7200, jitter: 5200, opacity: 0.5, color: 'rgba(226,236,255,1)' },
  },

  fog: {
    canvas: 'fog',
    tint: '#c9cfd2',
    tintOpacity: 0.3,
    blur: 2.6,
    vignette: 0.1,
    bands: { count: 5, speed: 46, opacity: 0.3, color: '#e6eaec', height: 0.24 },
  },

  wind: {
    canvas: 'wind',
    tint: '#8f9aa4',
    tintOpacity: 0.06,
    blur: 0,
    vignette: 0.05,
    gusts: { count: 7, speed: 2.4, opacity: 0.24, color: 'rgba(240,246,250,0.7)', height: 0.012 },
  },

  snow: {
    canvas: 'snow',
    tint: '#aebdcc',
    tintOpacity: 0.16,
    blur: 0.6,
    vignette: 0.12,
    flakes: {
      count: 56,
      size: 3.4,
      speed: 9,
      drift: 34,
      opacity: 0.68,
      color: 'rgba(255,255,255,0.92)',
    },
  },

  sleet: {
    canvas: 'snow',
    tint: '#8b98a8',
    tintOpacity: 0.26,
    blur: 1,
    vignette: 0.2,
    flakes: {
      count: 40,
      size: 2.6,
      speed: 5.2,
      drift: 18,
      opacity: 0.6,
      color: 'rgba(244,250,255,0.9)',
    },
    streaks: {
      count: 40,
      tilt: 22,
      len: 62,
      width: 1.1,
      speed: 0.7,
      opacity: 0.28,
      color: 'rgba(226,238,247,0.7)',
    },
  },
};
