/* ============================================================
   INSTRUMENT SPIRITS — audio

   One short figure per spirit, played when it steps on stage. Same
   contract as content/weather/audio.ts: content owns the notes, the
   synth (src/audio.ts) owns the sound.
   ============================================================ */

export interface SpiritAudio {
  /** frequencies, in order */
  cue: number[];
  gain: number;
  stagger: number;
  dur: number;
}

export const SPIRIT_AUDIO: Record<string, SpiritAudio> = {
  /* a rising open fifth stack — something arriving from very far up */
  sp_star: { cue: [466.16, 698.46, 932.33, 1396.91], gain: 0.05, stagger: 0.16, dur: 1.5 },
  /* low, slow, whale-shaped */
  sp_whale: { cue: [98.0, 130.81, 196.0], gain: 0.07, stagger: 0.34, dur: 2.4 },
};
