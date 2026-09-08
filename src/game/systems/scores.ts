import type { GameState } from '../engine';
import { TOWN_MAP } from '../../content/towns';
import {
  SCORES,
  SCORE_MAP,
  SCORE_TEXT,
  SCORE_TOTAL,
  SCORE_VALUES,
  SCORE_VOLUMES,
  VOLUME_MAP,
  VOLUME_SIZE,
  leavesOf,
  volumeOfTown,
  type ScoreLeaf,
  type ScoreVolume,
} from '../../content/scores';
import type { NodeKind } from '../types';

/* ============================================================
   THE EIGHTY-ONE — core

   Everything about recovering your people's library. Pure functions
   over state, one writer (`findScore`), and one honest rule about where
   leaves turn up:

     · a region holds one volume, and mostly gives up that volume's pages
     · sometimes a page has been carried somewhere else entirely
     · volumes open in order, so the collection has a shape

   The player's long arc is 81 leaves; each one is a small permanent
   bonus and a line in the journal. A finished volume is the real prize:
   the piece the nine leaves were always meant to be.
   ============================================================ */

export const hasScore = (s: GameState, id: string): boolean => (s.scores ?? []).includes(id);
export const scoresFound = (s: GameState): number => (s.scores ?? []).length;

/** how many leaves of one volume are home */
export function volumeFound(s: GameState, volId: string): number {
  return leavesOf(volId).filter((l) => hasScore(s, l.id)).length;
}

export const volumeDone = (s: GameState, volId: string): boolean =>
  volumeFound(s, volId) >= VOLUME_SIZE;

export const volumesDone = (s: GameState): number =>
  SCORE_VOLUMES.filter((v) => volumeDone(s, v.id)).length;

/** the volume currently being worked on — the first one not yet whole */
export function activeVolume(s: GameState): ScoreVolume {
  return SCORE_VOLUMES.find((v) => !volumeDone(s, v.id)) ?? SCORE_VOLUMES[SCORE_VOLUMES.length - 1];
}

/* ------------------------------------------------------------
   What having them is worth

   Small per leaf, a step per volume. Reported as one rate part named
   for the collection, so the strategy sheet can say where it came from.
   ------------------------------------------------------------ */

export interface ScorePay {
  coin: number;
  insp: number;
  practice: number;
  label: string;
}

export function scorePay(s: GameState): ScorePay {
  const leaves = scoresFound(s);
  const vols = volumesDone(s);
  return {
    coin: 1 + leaves * SCORE_VALUES.perLeaf.coin + vols * SCORE_VALUES.perVolume.coin,
    insp: 1 + leaves * SCORE_VALUES.perLeaf.insp + vols * SCORE_VALUES.perVolume.insp,
    practice: 1 + vols * SCORE_VALUES.practicePerVolume,
    label: '族谱',
  };
}

/* ------------------------------------------------------------
   Where a leaf turns up

   `pickLeaf` is the only place that decides which page a place gives
   up. Callers pass a roll in 0..1 so the store can stay deterministic
   under test.
   ------------------------------------------------------------ */

/** volumes you are allowed to find pages of yet */
export function openVolumes(s: GameState): ScoreVolume[] {
  const open: ScoreVolume[] = [];
  for (const v of SCORE_VOLUMES) {
    open.push(v);
    /* the next volume only starts surfacing once this one is under way,
       so the collection is a road rather than a lottery of eighty-one */
    if (volumeFound(s, v.id) < SCORE_VALUES.volumeGate) break;
  }
  return open;
}

function missingIn(s: GameState, vol: ScoreVolume): ScoreLeaf[] {
  return leavesOf(vol.id).filter((l) => !hasScore(s, l.id));
}

/**
 * pick a leaf a place could hand over, or null when it has nothing.
 * `roll` picks home-vs-stray, `pick` picks within the chosen pile.
 */
export function pickLeaf(
  s: GameState,
  town: string,
  roll: number,
  pick: number,
): ScoreLeaf | null {
  const open = openVolumes(s);
  if (open.length === 0) return null;

  const home = volumeOfTown(town);
  const homePile = home && open.includes(home) ? missingIn(s, home) : [];
  const strayPile = open.flatMap((v) => (v === home ? [] : missingIn(s, v)));

  const wantHome = homePile.length > 0 && (roll < SCORE_VALUES.homeBias || strayPile.length === 0);
  const pile = wantHome ? homePile : strayPile.length > 0 ? strayPile : homePile;
  if (pile.length === 0) return null;
  /* the earliest missing page of the pile, most of the time: a volume
     that fills in order reads like a book being rebound */
  const idx = pick < 0.72 ? 0 : Math.floor(pick * pile.length) % pile.length;
  return pile[idx];
}

/** how likely a node is to hold a page at all */
export function findChance(kind: NodeKind, s: GameState, now = Date.now()): number {
  const base = SCORE_VALUES.findByNode[kind] ?? 0;
  if (base <= 0) return 0;
  const since = (now - (s.scoreAt || 0)) / 3600000;
  if (since < SCORE_VALUES.findCooldownH) {
    /* not a hard lock: a cold streak is boring, a guaranteed streak is worse */
    return base * Math.max(0.12, since / SCORE_VALUES.findCooldownH) * 0.5;
  }
  return base;
}

/* ------------------------------------------------------------
   Recovering one

   The single writer. Everything else in the codebase asks this.
   ------------------------------------------------------------ */

export interface ScoreFind {
  state: GameState;
  leaf: ScoreLeaf | null;
  /** the volume, if this page completed it */
  completed: ScoreVolume | null;
  /** the song the completed volume gave back */
  song: string | null;
}

export function findScore(s: GameState, id: string, now = Date.now()): ScoreFind {
  const leaf = SCORE_MAP[id];
  if (!leaf || hasScore(s, id)) return { state: s, leaf: null, completed: null, song: null };

  const scores = [...(s.scores ?? []), id];
  let next: GameState = { ...s, scores, scoreAt: now };

  const vol = VOLUME_MAP[leaf.vol];
  const whole = vol && volumeFound(next, vol.id) >= VOLUME_SIZE ? vol : null;
  let song: string | null = null;
  if (whole && !next.songs.includes(whole.song)) {
    song = whole.song;
    next = { ...next, songs: [...next.songs, whole.song] };
  }
  return { state: next, leaf, completed: whole, song };
}

/* ------------------------------------------------------------
   Words
   ------------------------------------------------------------ */

export function leafJournal(leaf: ScoreLeaf, place: string): { title: string; body: string } {
  const vol = VOLUME_MAP[leaf.vol];
  return {
    title: SCORE_TEXT.journal.title(leaf.name),
    body: SCORE_TEXT.journal.body(leaf.name, vol?.name ?? '', place || '路上'),
  };
}

export function volumeJournal(vol: ScoreVolume, songName: string): { title: string; body: string } {
  return {
    title: SCORE_TEXT.volumeJournal.title(vol.name),
    body: SCORE_TEXT.volumeJournal.body(vol.name, songName),
  };
}

/** the mood tags your own library has taught you — used when composing */
export function knownMoods(s: GameState): string[] {
  const set = new Set<string>();
  SCORE_VOLUMES.forEach((v) => {
    if (volumeFound(s, v.id) > 0) v.moods.forEach((m) => set.add(m));
  });
  return [...set];
}
