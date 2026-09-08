import type { InstrumentAudio } from '../../game/types';

/* ============================================================
   INSTRUMENTS — sound

   The game has no audio files; it has a tiny oscillator (src/audio.ts).
   So the audio resource for an instrument is its voicing: a root pitch
   and a timbre the synth knows how to shape. Sound design lives here,
   not in the components that happen to play a note.
   ============================================================ */

export const INSTRUMENT_AUDIO: Record<string, InstrumentAudio> = {
  lute_worn: { root: 293.66, timbre: 'pluck' },
  guitar_road: { root: 246.94, timbre: 'pluck' },

  flute_silver: { root: 587.33, timbre: 'blow' },
  xiao_mist: { root: 440.0, timbre: 'blow' },
  suona_kiln: { root: 523.25, timbre: 'reed' },

  horn_post: { root: 349.23, timbre: 'reed' },
  trombone_harbor: { root: 174.61, timbre: 'reed' },

  accordion: { root: 329.63, timbre: 'reed' },
  harmonium_pilgrim: { root: 261.63, timbre: 'reed' },

  yangqin_moon: { root: 659.25, timbre: 'strike' },
  guzheng_river: { root: 392.0, timbre: 'pluck' },

  erhu_dusk: { root: 392.0, timbre: 'bow' },
  violin_ash: { root: 440.0, timbre: 'bow' },
  cello_tide: { root: 130.81, timbre: 'bow' },

  harp_tide: { root: 349.23, timbre: 'pluck' },
  lyre_star: { root: 466.16, timbre: 'pluck' },
  lyre_whale: { root: 98.0, timbre: 'bow' },

  kalimba: { root: 523.25, timbre: 'strike' },
  drum_kiln: { root: 87.31, timbre: 'strike' },
};

export const INSTRUMENT_AUDIO_FALLBACK: InstrumentAudio = { root: 293.66, timbre: 'pluck' };
