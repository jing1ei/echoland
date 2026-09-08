import type { InstrumentCategoryId, Rarity } from '../../game/types';

/* ============================================================
   INSTRUMENTS — the spine

   This file answers only "what exists, and what kind of thing is it".
   Everything else about an instrument lives in a sibling file:

     values.ts  numbers   (multipliers, price, affinity, practice speed)
     text.ts    words     (name, English name, description)
     art.ts     looks     (accent colour, silhouette key)
     audio.ts   sound     (synth root + timbre)

   Keeping the spine separate means adding an instrument is one row here
   plus one entry in each resource file, and no gameplay code changes.
   ============================================================ */

export interface InstrumentSpec {
  id: string;
  /** playing technique family; see content/proficiency/categories.ts */
  category: InstrumentCategoryId;
  rarity: Rarity;
  /** one-of-a-kind. Only unique instruments may host a spirit. */
  unique?: boolean;
}

export const INSTRUMENT_SPECS: InstrumentSpec[] = [
  /* ---- plucked strings (guitar family) ---- */
  { id: 'lute_worn', category: 'plucked_string', rarity: 'common' },
  { id: 'guitar_road', category: 'plucked_string', rarity: 'fine' },

  /* ---- woodwind, including the ethnic ones ---- */
  { id: 'flute_silver', category: 'woodwind', rarity: 'fine' },
  { id: 'xiao_mist', category: 'woodwind', rarity: 'fine' },
  { id: 'suona_kiln', category: 'woodwind', rarity: 'rare' },

  /* ---- brass ---- */
  { id: 'horn_post', category: 'brass', rarity: 'fine' },
  { id: 'trombone_harbor', category: 'brass', rarity: 'rare' },

  /* ---- keyboard (free reed counts: it is played from a keyboard) ---- */
  { id: 'accordion', category: 'keyboard', rarity: 'fine' },
  { id: 'harmonium_pilgrim', category: 'keyboard', rarity: 'rare' },

  /* ---- hammered strings (yangqin family) ---- */
  { id: 'yangqin_moon', category: 'hammered_string', rarity: 'rare' },

  /* ---- plucked zither (guzheng family) ---- */
  { id: 'guzheng_river', category: 'plucked_zither', rarity: 'rare' },

  /* ---- bowed folk strings (erhu family) ---- */
  { id: 'erhu_dusk', category: 'bowed_folk', rarity: 'rare' },

  /* ---- violin family ---- */
  { id: 'violin_ash', category: 'violin_family', rarity: 'fine' },
  { id: 'cello_tide', category: 'violin_family', rarity: 'rare' },

  /* ---- open-string harps and lyres ---- */
  { id: 'harp_tide', category: 'harp_lyre', rarity: 'rare' },
  { id: 'lyre_star', category: 'harp_lyre', rarity: 'myth', unique: true },
  { id: 'lyre_whale', category: 'harp_lyre', rarity: 'myth', unique: true },

  /* ---- lamellophone ---- */
  { id: 'kalimba', category: 'lamellophone', rarity: 'rare' },

  /* ---- percussion ---- */
  { id: 'drum_kiln', category: 'percussion', rarity: 'rare' },
];

export const INSTRUMENT_SPEC_MAP: Record<string, InstrumentSpec> = Object.fromEntries(
  INSTRUMENT_SPECS.map((s) => [s.id, s]),
);
