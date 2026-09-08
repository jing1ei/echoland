import type { Cond } from '../../game/story/types';
import type { WeatherRef } from '../../game/types';

/* ============================================================
   WEATHER — conditions

   Builders for trigger authors. `inWeather` takes ids or group ids, so
   `inWeather('rain')` keeps working when a new sort of rain shows up.
   ============================================================ */

export const inWeather = (...of: WeatherRef[]): Cond => ({ k: 'weather', of });

/** any of the three rare, dangerous skies */
export const inExtremeWeather = (): Cond => ({ k: 'weather', of: ['extreme'] });

/** sheltering weather + a stance that leaves you talking to people */
export const shelteringWith = (extra: Cond): Cond => ({
  k: 'all',
  of: [inWeather('rain', 'sleet'), extra],
});
