import type { InstrumentArt } from '../../game/types';

/* ============================================================
   INSTRUMENTS — art

   The game draws everything procedurally, so "art" here means the two
   things the canvas and the UI actually need: an accent colour and a
   silhouette key. If bitmap art ever arrives, it gets a `sprite` field
   in this file and nowhere else.
   ============================================================ */

export const INSTRUMENT_ART: Record<string, InstrumentArt> = {
  lute_worn: { accent: '#b9834b', silhouette: 'lute' },
  guitar_road: { accent: '#c08a4e', silhouette: 'lute' },

  flute_silver: { accent: '#cfd8dd', silhouette: 'flute' },
  xiao_mist: { accent: '#9fb0a6', silhouette: 'flute' },
  suona_kiln: { accent: '#d1622f', silhouette: 'horn' },

  horn_post: { accent: '#d2a24a', silhouette: 'horn' },
  trombone_harbor: { accent: '#c99a3f', silhouette: 'horn' },

  accordion: { accent: '#a4553f', silhouette: 'box' },
  harmonium_pilgrim: { accent: '#7d6a4f', silhouette: 'keys' },

  yangqin_moon: { accent: '#c3a86a', silhouette: 'zither' },
  guzheng_river: { accent: '#a98a52', silhouette: 'zither' },

  erhu_dusk: { accent: '#8d5b4c', silhouette: 'bow' },
  violin_ash: { accent: '#b07a4a', silhouette: 'bow' },
  cello_tide: { accent: '#8a5a3c', silhouette: 'bow' },

  harp_tide: { accent: '#7fa6a6', silhouette: 'harp' },
  lyre_star: { accent: '#d9c07a', silhouette: 'harp' },
  lyre_whale: { accent: '#9fb6c6', silhouette: 'harp' },

  kalimba: { accent: '#8fa07a', silhouette: 'lamella' },
  drum_kiln: { accent: '#9a5c40', silhouette: 'drum' },
};

/** shared fallback so a brand-new instrument never renders as undefined */
export const INSTRUMENT_ART_FALLBACK: InstrumentArt = { accent: '#b9834b', silhouette: 'lute' };
