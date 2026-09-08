import type { PortraitSpec } from '../../game/story/types';

/* ============================================================
   INSTRUMENT SPIRITS — art

   A spirit borrows a human shape, so it uses the same procedural
   portrait spec as the rest of the cast; nothing about the renderer
   needs to know a spirit is a spirit. What marks them out is authored
   here, not in code: colder skin, hair pulled from the instrument's own
   accent, `years: 'young'` on things far older than the player.

   Keyed by spirit id (registry.ts), not by character id, so a spirit's
   generated character can be renamed without touching the palette.
   ============================================================ */

export const SPIRIT_ART: Record<string, PortraitSpec> = {
  sp_star: {
    skin: '#e6dcc9',
    hair: '#c9b06a',
    hair2: '#efdca0',
    cut: 'long',
    robe: '#2f3350',
    robe2: '#4a5079',
    garb: 'robe',
    accent: '#d9c07a',
    prop: 'beads',
    build: 0.34,
    years: 'young',
  },
  sp_whale: {
    skin: '#dbe4e6',
    hair: '#7d97a8',
    hair2: '#a9c1cd',
    cut: 'wild',
    robe: '#22343c',
    robe2: '#3c5a63',
    garb: 'cloak',
    accent: '#9fb6c6',
    prop: 'scarf',
    build: 0.58,
    years: 'adult',
  },
};
