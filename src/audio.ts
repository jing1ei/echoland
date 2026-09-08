/* ============================================================
   A very small synth.

   The game has no audio files on purpose — a scenery widget that pulls
   megabytes of samples is not a widget. Everything you hear is a few
   oscillators, which means "sound" costs nothing to ship and the volume
   slider has something real to control.

   Volume is stored in the save (`state.volume`), but sounds fire from
   deep inside components where threading state through would be noise.
   So the master level is mirrored here as a module-level number and the
   store is the only writer. Read the comment in store.setVolume.
   ============================================================ */

let master = 0.6;
let ctx: AudioContext | null = null;

export function setMasterVolume(v: number) {
  master = Math.max(0, Math.min(1, v));
}

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    /* iOS suspends the context until a gesture; every one of our sounds is
       gesture-driven, so resuming lazily here is enough */
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** one plucked note; `gain` is relative and gets scaled by the master level */
export function tone(freq: number, dur = 0.34, type: OscillatorType = 'triangle', gain = 0.14) {
  if (master <= 0.001) return;
  const a = audio();
  if (!a) return;
  try {
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * master, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio blocked — silence is an acceptable failure mode */
  }
}

/** a short arpeggio; used for the collect chime and the volume preview */
export function chord(freqs: number[], stagger = 0.08, dur = 0.5, gain = 0.1) {
  freqs.forEach((f, i) => window.setTimeout(() => tone(f, dur, 'triangle', gain), i * stagger * 1000));
}

export const sfx = {
  /** packing up the stall: a small major triad, the game's one reward sound */
  collect: () => chord([392.0, 493.88, 587.33, 783.99], 0.07, 0.62, 0.09),
  /** moving to another overlook */
  travel: () => chord([349.23, 440.0, 523.25], 0.1, 0.7, 0.075),
  /** generic soft tap for sheets opening */
  tap: () => tone(523.25, 0.12, 'sine', 0.05),
  note: (freq: number, dur = 0.32) => tone(freq, dur),
  /** the sky changed; the figure itself is content (content/weather/audio.ts) */
  weather: (cue: number[], gain = 0.04, stagger = 0.12, dur = 0.6) =>
    chord(cue, stagger, dur, gain),
};
