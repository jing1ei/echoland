import type { GameState } from '../engine';
import type { Song } from '../types';
import { SONGS, SONG_MAP } from '../../content/gear';

/* ============================================================
   SONGS — resolution

   A repertoire may now hold two kinds of song: the ones the world wrote
   (content/songs) and the ones you wrote (state.composed). Anything that
   needs a song by id goes through here, so "the player's own songs count
   exactly like bought ones" stays a fact rather than a promise.
   ============================================================ */

export function songById(s: GameState, id: string): Song | undefined {
  return SONG_MAP[id] ?? (s.composed ?? []).find((x) => x.id === id);
}

/** authored + composed, authored first — the order the satchel lists them in */
export function allSongs(s: GameState): Song[] {
  return [...SONGS, ...(s.composed ?? [])];
}

/** everything in the case right now */
export function ownedSongs(s: GameState): Song[] {
  return allSongs(s).filter((x) => s.songs.includes(x.id));
}

export const songName = (s: GameState, id: string): string => songById(s, id)?.name ?? '';

/** true when the id belongs to a piece the player wrote themselves */
export const isMine = (s: GameState, id: string): boolean =>
  (s.composed ?? []).some((x) => x.id === id);
