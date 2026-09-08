import type { WeatherId } from './types';

/* ============================================================
   Dev seams

   Two module-level overrides, both empty by default, both read by
   exactly one system each:

     weather -> systems/weather.rollWeather
     guest   -> systems/visitors.currentVisitors

   Nothing in the game writes them. The GM layer (src/gm/) does, and
   `src/gm/` is designed to be deleted wholesale before a release: with
   it gone, these stay null forever and both reads fold to "no
   override". That is the entire cost of keeping a testing hook in the
   shipping code — two nulls.
   ============================================================ */

let weather: WeatherId | null = null;
let guest: string | null = null;

export const devWeather = (): WeatherId | null => weather;
export const setDevWeather = (w: WeatherId | null) => {
  weather = w;
};

export const devGuest = (): string | null => guest;
export const setDevGuest = (id: string | null) => {
  guest = id;
};
