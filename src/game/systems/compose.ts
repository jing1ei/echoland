import type { GameState } from '../engine';
import type { ComposedSong, MoodTag, Song } from '../types';
import { OVERLOOK_MAP } from '../../content/overlooks';
import { SONGS, SONG_MAP } from '../../content/gear';
import {
  COMPOSE_TEXT,
  COMPOSE_VALUES,
  FORMS,
  GRADE_MAP,
  MOTIF_MOMENTS,
  MOTIF_NOUNS,
  STARTER_MOTIFS,
  type ComposeFocus,
  type ComposeGradeId,
} from '../../content/compose';
import { effectiveProf, tierOf } from './proficiency';
import { fameTier } from './fame';
import { volumesDone } from './scores';
import { SCORE_VOLUMES } from '../../content/scores';

/* ============================================================
   COMPOSING — core

   Inspiration in, a song of your own out. The rules, once:

     motifs   what you have heard. Unlocked by where you have played and
              by which ancestral volumes you have pages of.
     focus    what the piece is for. Takes the larger share of the
              multiplier budget; the rest scatters, so no composed song
              is a pure stat stick.
     grade    how long you sat with it. Sets cost, budget and rarity.
     roll     the only randomness, bounded by the grade's swing.

   Composed songs are stored in the save as whole `Song` objects (plus a
   little bookkeeping), which is why the rest of the game must look songs
   up through `songById` in systems/songs.ts rather than SONG_MAP.
   ============================================================ */

export interface ComposeOpts {
  motifs: MoodTag[];
  focus: ComposeFocus;
  grade: ComposeGradeId;
  /** the title the player accepted or typed */
  name?: string;
}

/* ------------------------------------------------------------
   What you may write with
   ------------------------------------------------------------ */

/** every motif you have heard: places you have unlocked + volumes you hold pages of */
export function availableMotifs(s: GameState): MoodTag[] {
  const set = new Set<MoodTag>(STARTER_MOTIFS);
  s.overlooks.forEach((id) => OVERLOOK_MAP[id]?.moods.forEach((m) => set.add(m)));
  SCORE_VOLUMES.forEach((v) => {
    if ((s.scores ?? []).some((leaf) => leaf.startsWith(`sc_${v.no}_`))) {
      v.moods.forEach((m) => set.add(m));
    }
  });
  return [...set];
}

/* ------------------------------------------------------------
   Price
   ------------------------------------------------------------ */

export function composeCost(s: GameState, grade: ComposeGradeId): number {
  const g = GRADE_MAP[grade];
  const written = (s.composed ?? []).length;
  const surcharge = Math.min(
    COMPOSE_VALUES.surchargeCap,
    written * COMPOSE_VALUES.surchargePerSong,
  );
  return Math.round(g.cost * (1 + surcharge));
}

export const composeLeisure = (): number => COMPOSE_VALUES.leisure;

export function canCompose(s: GameState, grade: ComposeGradeId): { ok: boolean; why?: string } {
  if (s.insp < composeCost(s, grade)) return { ok: false, why: COMPOSE_TEXT.notEnough };
  if (s.leisure < composeLeisure()) return { ok: false, why: COMPOSE_TEXT.notEnoughLeisure };
  return { ok: true };
}

/* ------------------------------------------------------------
   Quality

   Everything you have earned shows up here rather than in a bigger
   budget: skill, lineage and a crowd that already listens.
   ------------------------------------------------------------ */

export function composeQuality(s: GameState): number {
  const prof = tierOf(effectiveProf(s, s.instrument)).index;
  return (
    1 +
    prof * COMPOSE_VALUES.profBonus +
    volumesDone(s) * COMPOSE_VALUES.volumeBonus +
    fameTier(s) * COMPOSE_VALUES.fameBonus
  );
}

/* ------------------------------------------------------------
   Titles
   ------------------------------------------------------------ */

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

/** three title suggestions for a set of motifs, seeded by `seed` in 0..1 */
export function titleSuggestions(motifs: MoodTag[], seed: number): string[] {
  const out: string[] = [];
  for (let k = 0; k < 3; k += 1) {
    const r = (seed * 997 + k * 131.77) % 1;
    const a = pick(MOTIF_NOUNS[motifs[0]] ?? ['长街'], r);
    if (motifs.length > 1) {
      const b = pick(MOTIF_MOMENTS[motifs[1]] ?? ['天将亮'], (r * 7.3) % 1);
      out.push(`《${a}${b}》`);
    } else {
      const f = pick(FORMS, (r * 3.1) % 1);
      out.push(`《${a}${f}》`);
    }
  }
  /* three identical suggestions read as a bug, even when they are honest */
  return [...new Set(out)].length === 1
    ? [out[0], `《${pick(MOTIF_NOUNS[motifs[0]] ?? ['长街'], (seed * 13.3) % 1)}${pick(FORMS, seed)}》`, out[0] + '·二']
    : out;
}

/** is this title already on a shelf somewhere */
export function titleTaken(s: GameState, name: string): boolean {
  return (
    SONGS.some((x) => x.name === name) || (s.composed ?? []).some((x) => x.name === name)
  );
}

/* ------------------------------------------------------------
   The multipliers
   ------------------------------------------------------------ */

function budgetToMul(
  budget: number,
  focus: ComposeFocus,
  motifs: MoodTag[],
): Song['mul'] {
  const mul: Song['mul'] = {};
  const focused = budget * COMPOSE_VALUES.focusShare;
  mul[focus] = Math.min(COMPOSE_VALUES.axisCap, 1 + focused);

  /* the remainder scatters onto whatever the motifs imply, so a sea-and-night
     piece about money still pays a little inspiration */
  const rest = budget - focused;
  const others: ComposeFocus[] = [];
  motifs.forEach((m) => {
    if (m === 'melancholy' || m === 'holy' || m === 'ruin') others.push('insp');
    else if (m === 'festive' || m === 'city') others.push('coin');
    else if (m === 'sky' || m === 'cloud' || m === 'desert') others.push('event');
    else if (m === 'forest' || m === 'floral' || m === 'rain') others.push('leisure');
    else others.push('renown');
  });
  const spread = others.filter((k) => k !== focus);
  if (spread.length === 0) {
    mul[focus] = Math.min(COMPOSE_VALUES.axisCap, (mul[focus] ?? 1) + rest * 0.5);
    return mul;
  }
  const each = rest / spread.length;
  spread.forEach((k) => {
    mul[k] = Math.min(COMPOSE_VALUES.axisCap, (mul[k] ?? 1) + each);
  });
  return mul;
}

/* ------------------------------------------------------------
   Writing it

   The single writer. `roll` is 0..1 and injectable so tests are honest.
   ------------------------------------------------------------ */

export interface ComposeResult {
  state: GameState;
  song: ComposedSong;
}

export function compose(
  s: GameState,
  opts: ComposeOpts,
  roll = Math.random(),
  now = Date.now(),
): ComposeResult | null {
  const g = GRADE_MAP[opts.grade];
  if (!g) return null;
  const motifs = opts.motifs.slice(0, Math.max(1, g.motifs));
  if (motifs.length === 0) return null;
  if (!canCompose(s, opts.grade).ok) return null;

  const cost = composeCost(s, opts.grade);
  const budget = Math.max(
    0.1,
    (g.budget + (roll * 2 - 1) * g.swing) * composeQuality(s),
  );
  const mul = budgetToMul(budget, opts.focus, motifs);

  const place = OVERLOOK_MAP[s.overlook]?.name ?? '路上';
  const n = (s.composed ?? []).length + 1;
  const fallback = titleSuggestions(motifs, (now % 100000) / 100000)[0];
  let name = (opts.name ?? '').trim() || fallback;
  if (!name.startsWith('《')) name = `《${name.replace(/[《》]/g, '')}》`;
  if (titleTaken(s, name)) name = `${name.slice(0, -1)}·${n}》`;

  const song: ComposedSong = {
    id: `song_my_${n}`,
    name,
    nameEn: `Your Piece No.${n}`,
    desc: COMPOSE_TEXT.desc(place, opts.focus),
    tags: motifs,
    mul,
    price: 0,
    rarity: g.rarity,
    composedAt: now,
    grade: opts.grade,
    focus: opts.focus,
    at: s.overlook,
  };

  const state: GameState = {
    ...s,
    insp: Math.max(0, s.insp - cost),
    leisure: Math.max(0, s.leisure - composeLeisure()),
    composed: [...(s.composed ?? []), song],
    songs: [...s.songs, song.id],
  };
  return { state, song };
}

/** a composed song's strongest axis, for the card's one-line summary */
export function bestAxis(song: Song): { k: string; v: number } {
  let k = 'coin';
  let v = 1;
  Object.entries(song.mul).forEach(([key, val]) => {
    if ((val ?? 1) > v) {
      k = key;
      v = val ?? 1;
    }
  });
  return { k, v };
}
