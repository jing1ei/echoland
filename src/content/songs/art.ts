import type { MoodTag, Song, ThingArt } from '../../game/types';

/* ============================================================
   SONGS — art

   A song has no object to draw, so it borrows the picture of the thing
   it is *about*: its first mood tag. Which means a shelf of sheet music
   in the satchel reads as sea, sea, night, kiln — you can find the one
   you want without reading a single title.

   Drawings live in src/ui/Glyph.tsx. This file only maps mood → drawing.
   ============================================================ */

export const MOOD_ART: Record<MoodTag, ThingArt> = {
  sea: { glyph: 'mood_sea', tint: '#4f7280' },
  wind: { glyph: 'mood_wind', tint: '#6f8894' },
  night: { glyph: 'mood_night', tint: '#5c5470' },
  floral: { glyph: 'mood_floral', tint: '#a4646f' },
  desert: { glyph: 'mood_desert', tint: '#9a8034' },
  cloud: { glyph: 'mood_cloud', tint: '#7d8b90' },
  ice: { glyph: 'mood_ice', tint: '#6c8a9c' },
  ruin: { glyph: 'mood_ruin', tint: '#8a6b4a' },
  rain: { glyph: 'mood_rain', tint: '#5f7d86' },
  sky: { glyph: 'mood_sky', tint: '#6f8a94' },
  forest: { glyph: 'mood_forest', tint: '#4f6b3a' },
  city: { glyph: 'mood_city', tint: '#a8762a' },
  holy: { glyph: 'mood_holy', tint: '#8a7a3f' },
  melancholy: { glyph: 'mood_melancholy', tint: '#8f4a5e' },
  festive: { glyph: 'mood_festive', tint: '#b8873f' },
};

export const SONG_ART_FALLBACK: ThingArt = { glyph: 'score', tint: '#6f6350' };

/** glyph from the first tag — what the song is *about*; ink from the
    second — how it feels. Two harbour songs then still look different:
    the same waves, one in city amber, one in a wistful wine. */
export function songArt(song?: Pick<Song, 'tags'>): ThingArt {
  const [about, feels] = song?.tags ?? [];
  const base = (about && MOOD_ART[about]) || SONG_ART_FALLBACK;
  const ink = (feels && MOOD_ART[feels]?.tint) || base.tint;
  return { glyph: base.glyph, tint: ink };
}
