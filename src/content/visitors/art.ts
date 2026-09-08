/* ============================================================
   STALL VISITORS — art

   Silhouettes, not portraits. The crowd is drawn as flat ink shapes
   against the ground; a visitor is drawn with the same brush, and only
   the proportions, the props and a faint rim of colour separate them
   from the locals. That restraint is what makes them read as "someone",
   rather than as a sprite pasted on a painting.

   `place` is where they stand along the stall: 0 sits at the busker's
   elbow, 1 is out at the edge of the crowd. Standing close is the
   single strongest signal available — a stranger who steps inside the
   listening circle is doing something.
   ============================================================ */

export type VisitorProp =
  | 'none'
  | 'hood'
  | 'lantern'
  | 'parasol'
  | 'satchel'
  | 'case'
  | 'veil'
  | 'cat'
  | 'staff'
  | 'wide_hat';

export interface VisitorArt {
  /** height against a normal listener, 1 = the same */
  scale: number;
  /** the ink they are cut out of */
  ink: string;
  /** rim light — this is the "not from here" tell */
  glow: string;
  /** 0..1 strength of that rim */
  glowStrength: number;
  /** 0 = at the busker's elbow, 1 = far edge of the crowd */
  place: number;
  prop: VisitorProp;
  /** how much they move with the music, 0 = still as a post */
  sway: number;
  /** hovers this far off the ground, in figure heights */
  float?: number;
  /** widens the body: cloaks, coats, big shoulders */
  girth?: number;
}

export const VISITOR_ART: Record<string, VisitorArt> = {
  hood: {
    scale: 1.14,
    ink: '#1d1720',
    glow: '#8f7fa8',
    glowStrength: 0.3,
    place: 0.3,
    prop: 'hood',
    sway: 0.1,
    girth: 0.26,
  },
  lantern: {
    scale: 1.06,
    ink: '#20180f',
    glow: '#f0b95e',
    glowStrength: 0.72,
    place: 0.46,
    prop: 'lantern',
    sway: 0.3,
  },
  parasol: {
    scale: 1.02,
    ink: '#241a1e',
    glow: '#e4a0b4',
    glowStrength: 0.34,
    place: 0.6,
    prop: 'parasol',
    sway: 0.24,
  },
  courier: {
    scale: 0.98,
    ink: '#1b1c22',
    glow: '#8fb0c4',
    glowStrength: 0.3,
    place: 0.72,
    prop: 'satchel',
    sway: 0.5,
  },
  cat: {
    scale: 0.34,
    ink: '#191519',
    glow: '#c9d68f',
    glowStrength: 0.26,
    place: 0.16,
    prop: 'cat',
    sway: 0.14,
  },
  rain_watcher: {
    scale: 1.05,
    ink: '#181d22',
    glow: '#9fc6d8',
    glowStrength: 0.4,
    place: 0.52,
    prop: 'wide_hat',
    sway: 0.08,
    girth: 0.22,
  },
  veil: {
    scale: 1.08,
    ink: '#22212a',
    glow: '#dfe6f2',
    glowStrength: 0.46,
    place: 0.38,
    prop: 'veil',
    sway: 0.16,
    girth: 0.2,
  },
  case: {
    scale: 1.1,
    ink: '#1e1a17',
    glow: '#d9a86a',
    glowStrength: 0.38,
    place: 0.26,
    prop: 'case',
    sway: 0.2,
  },
  tall_dark: {
    scale: 1.34,
    ink: '#14121a',
    glow: '#6f6ba0',
    glowStrength: 0.44,
    place: 0.22,
    prop: 'staff',
    sway: 0.05,
    girth: 0.18,
  },
  pale: {
    scale: 1.04,
    ink: '#2b2b33',
    glow: '#eef2f6',
    glowStrength: 0.6,
    place: 0.34,
    prop: 'none',
    sway: 0.06,
    float: 0.02,
  },
  glow: {
    scale: 1.16,
    ink: '#1a1626',
    glow: '#9fe0d6',
    glowStrength: 0.86,
    place: 0.2,
    prop: 'none',
    sway: 0.12,
    float: 0.05,
    girth: 0.16,
  },
};
