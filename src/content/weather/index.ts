/* ============================================================
   WEATHER — module barrel

   The system module (game/systems/weather.ts) is the only consumer.
   ============================================================ */

export {
  WEATHER_SPECS,
  WEATHER_SPEC_MAP,
  WEATHER_IDS,
  WEATHER_GROUPS,
  type WeatherSpec,
} from './registry';
export {
  WEATHER_VALUES,
  type WeatherValues,
  type WeatherEffect,
  type ClimateId,
  type WeightTable,
} from './values';
export {
  WEATHER_TEXT,
  WEATHER_GROUP_TEXT,
  WEATHER_FLAVOUR,
  WEATHER_UI_TEXT,
  type WeatherText,
} from './text';
export { WEATHER_ART, type WeatherArt } from './art';
export { WEATHER_AUDIO, type WeatherAudio } from './audio';
export * as weatherConditions from './conditions';
export { WEATHER_CONTENT_SCENES } from './scenes';
export { WEATHER_CONTENT_TRIGGERS } from './triggers';
