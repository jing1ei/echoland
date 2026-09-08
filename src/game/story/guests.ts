import type { GameState } from '../engine';
import { test } from './conditions';
import { currentVisitor, currentVisitors, type StallGuest } from '../systems/visitors';

/* ============================================================
   Guests — the bound version

   `systems/visitors.ts` takes the condition evaluator as an argument so
   the two modules never import each other. Everything outside the story
   system wants the convenient form, and this is it: two functions with
   `test` already tied on.

   The UI imports these from `game/story`, never `systems/visitors`.
   ============================================================ */

export type { StallGuest };

export const guestAt = (s: GameState, now: number): StallGuest | null =>
  currentVisitor(s, now, test);

export const guestsAt = (s: GameState, now: number): StallGuest[] =>
  currentVisitors(s, now, test);
