import type { Stance } from '../../game/types';

/* ============================================================
   STANCES — the "simple strategy" you set before idling again

   Content module: stances. `drain` is stamina cost per hour; `mul` is
   applied by computeRates. Practice speed per stance lives with the
   proficiency module (content/proficiency/values.ts), because that is a
   proficiency rule that happens to key off a stance id.
   ============================================================ */

export const STANCES: Stance[] = [
  {
    id: 'earnest',
    name: '卖力演奏',
    desc: '手指按到发白。钱最多，但你不会注意到路过的人。',
    mul: { coin: 1.45, insp: 0.8, leisure: 0.85, renown: 1.0, event: 0.65 },
    drain: 1.35,
  },
  {
    id: 'improv',
    name: '随心即兴',
    desc: '弹到哪算哪。灵感涨得快，钱少一点。',
    mul: { coin: 0.85, insp: 1.7, leisure: 1.0, renown: 1.05, event: 1.0 },
    drain: 0.9,
  },
  {
    id: 'mingle',
    name: '边弹边聊',
    desc: '曲子成了背景，故事成了主角。奇遇最多。',
    mul: { coin: 0.9, insp: 1.05, leisure: 1.35, renown: 1.3, event: 1.85 },
    drain: 0.8,
  },
  {
    id: 'quiet',
    name: '静默练习',
    desc: '几乎不收钱，只练手。手劲几乎不掉，技艺在长。',
    mul: { coin: 0.35, insp: 1.4, leisure: 1.15, renown: 0.7, event: 0.5 },
    drain: 0.25,
  },
  {
    id: 'busk_night',
    name: '通宵长奏',
    desc: '把一整夜连起来弹。什么都涨，但体力掉得像漏斗。',
    mul: { coin: 1.3, insp: 1.3, leisure: 1.1, renown: 1.35, event: 1.2 },
    drain: 2.0,
  },
];

export const STANCE_MAP: Record<string, Stance> = Object.fromEntries(
  STANCES.map((s) => [s.id, s]),
);
