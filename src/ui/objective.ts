import type { Objective, Quest } from '../game/types';

/* ============================================================
   Objective display helpers

   Most errands can show honest arithmetic — 3/6 collects, 1,200 coins.
   Fame cannot: the player is never shown a fame number, so a fame
   objective reports the word the town currently uses for you instead of
   a fraction. `*towns:T` is the exception, because counting *places* is
   not counting fame.
   ============================================================ */

export function wordly(o: Objective): boolean {
  return o.kind === 'fame' && !(o.ref ?? '').startsWith('*towns');
}

/* ------------------------------------------------------------
   Quest badges

   The map and the journal both label an errand the same way — 第三章
   for the main line, 支线 for everything else. It was written twice,
   with its own private numeral table each time.
   ------------------------------------------------------------ */

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** small counting numeral: 1..10 as characters, 11..19 as 十一.., then digits */
export function cnNum(n: number): string {
  if (n <= 10) return CN_DIGITS[n] ?? String(n);
  if (n < 20) return `十${CN_DIGITS[n - 10]}`;
  return String(n);
}

export function questBadge(q: Pick<Quest, 'line' | 'chapter'>): string {
  return q.line === 'main' ? `第${cnNum(q.chapter)}章` : '支线';
}
