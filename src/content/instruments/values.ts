import type { MoodTag } from '../../game/types';

/* ============================================================
   INSTRUMENTS — numbers

   Nothing here is read directly by gameplay code: the assembler in
   ./index.ts folds these into the Instrument records the engine sees.
   Tuning the game means editing this file and nothing else.
   ============================================================ */

export interface InstrumentValues {
  /** per-hour multipliers applied by computeRates */
  mul: Partial<Record<'coin' | 'insp' | 'leisure' | 'renown' | 'event', number>>;
  /** which overlook moods this instrument resonates with */
  affinity: MoodTag[];
  /** shop price; 0 = story reward, never on a shelf */
  price: number;
  /** how fast this particular instrument trains, ×base practice speed.
      Easy instruments climb quickly; a myth-tier one asks for patience. */
  practice: number;
}

export const INSTRUMENT_VALUES: Record<string, InstrumentValues> = {
  /* ---- plucked strings ---- */
  lute_worn: { mul: { coin: 1, insp: 1, event: 1 }, affinity: [], price: 0, practice: 1.25 },
  guitar_road: {
    mul: { coin: 1.35, insp: 1.05, leisure: 1.05 },
    affinity: ['city', 'wind', 'festive'],
    price: 3200,
    practice: 1.15,
  },

  /* ---- woodwind ---- */
  flute_silver: {
    mul: { insp: 1.45, coin: 0.92, event: 1.1 },
    affinity: ['wind', 'cloud', 'sky'],
    price: 900,
    practice: 1.05,
  },
  xiao_mist: {
    mul: { insp: 1.5, coin: 0.95, leisure: 1.15 },
    affinity: ['cloud', 'rain', 'melancholy'],
    price: 2800,
    practice: 0.95,
  },
  suona_kiln: {
    mul: { coin: 1.6, insp: 0.9, renown: 1.2, event: 1.15 },
    affinity: ['festive', 'city', 'desert'],
    price: 4200,
    practice: 0.85,
  },

  /* ---- brass ---- */
  horn_post: {
    mul: { coin: 1.3, insp: 0.85, renown: 1.3 },
    affinity: ['city', 'wind', 'festive'],
    price: 3600,
    practice: 0.95,
  },
  trombone_harbor: {
    mul: { coin: 1.62, insp: 0.95, renown: 1.25, event: 1.1 },
    affinity: ['sea', 'city', 'festive'],
    price: 11000,
    practice: 0.8,
  },

  /* ---- keyboard ---- */
  accordion: {
    mul: { coin: 1.5, insp: 0.85, renown: 1.15 },
    affinity: ['festive', 'city'],
    price: 2600,
    practice: 1.0,
  },
  harmonium_pilgrim: {
    mul: { coin: 1.4, insp: 1.3, leisure: 1.1 },
    affinity: ['holy', 'cloud', 'ice'],
    price: 9800,
    practice: 0.85,
  },

  /* ---- hammered strings ---- */
  yangqin_moon: {
    mul: { coin: 1.55, insp: 1.15, renown: 1.1 },
    affinity: ['festive', 'floral', 'city'],
    price: 12000,
    practice: 0.8,
  },

  /* ---- plucked zither ---- */
  guzheng_river: {
    mul: { coin: 1.45, insp: 1.5, renown: 1.15 },
    affinity: ['forest', 'floral', 'holy'],
    price: 18000,
    practice: 0.75,
  },

  /* ---- bowed folk strings ---- */
  erhu_dusk: {
    mul: { coin: 1.3, insp: 1.45, renown: 1.1, event: 1.1 },
    affinity: ['melancholy', 'city', 'rain'],
    price: 8600,
    practice: 0.7,
  },

  /* ---- violin family ---- */
  violin_ash: {
    mul: { coin: 1.28, insp: 1.3, renown: 1.12 },
    affinity: ['city', 'melancholy', 'holy'],
    price: 5400,
    practice: 0.72,
  },
  cello_tide: {
    mul: { coin: 1.5, insp: 1.35, renown: 1.2 },
    affinity: ['sea', 'night', 'melancholy'],
    price: 15000,
    practice: 0.68,
  },

  /* ---- harps & lyres ---- */
  harp_tide: {
    mul: { coin: 1.62, insp: 1.2, renown: 1.2 },
    affinity: ['sea', 'ice', 'holy'],
    price: 9800,
    practice: 0.8,
  },
  lyre_star: {
    mul: { coin: 2.1, insp: 1.75, renown: 1.4, event: 1.2 },
    affinity: ['desert', 'night', 'sky'],
    price: 58000,
    practice: 0.6,
  },
  lyre_whale: {
    mul: { coin: 2.9, insp: 2.4, renown: 1.9, event: 1.35 },
    affinity: ['sky', 'sea', 'holy', 'night'],
    price: 0,
    practice: 0.55,
  },

  /* ---- lamellophone ---- */
  kalimba: {
    mul: { coin: 1.18, insp: 1.28, leisure: 1.2 },
    affinity: ['rain', 'melancholy', 'forest'],
    price: 4200,
    practice: 1.1,
  },

  /* ---- percussion ---- */
  drum_kiln: {
    mul: { coin: 1.85, insp: 0.95, event: 1.25 },
    affinity: ['city', 'festive', 'desert'],
    price: 21000,
    practice: 1.0,
  },
};
