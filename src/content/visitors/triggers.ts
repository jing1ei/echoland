import type { Trigger } from '../../game/story/types';
import { whileGuest } from './conditions';

/* ============================================================
   STALL VISITORS — triggers

   Ambient priority: a stranger clearing his throat must never step on a
   main-line scene. The `guest` condition means these can only fire in
   the minutes that figure is actually visible, which is the entire
   point — the player watched a silhouette for a week, and then, on one
   ordinary collect, it turned out to be a scene.

   Low chance on purpose. Being seen often and speaking rarely is what
   makes the crowd worth looking at.
   ============================================================ */

export const VISITOR_CONTENT_TRIGGERS: Trigger[] = [
  {
    id: 'tv_hood',
    scene: 'v_hood_speaks',
    on: ['collect'],
    when: { k: 'all', of: [whileGuest('vs_hood'), { k: 'collects', min: 6 }] },
    chance: 0.3,
    priority: 26,
    once: true,
    line: 'ambient',
  },
  {
    id: 'tv_case',
    scene: 'v_case_opens',
    on: ['collect'],
    when: whileGuest('vs_case'),
    chance: 0.34,
    priority: 26,
    once: true,
    line: 'ambient',
  },
  {
    id: 'tv_glow',
    scene: 'v_glow_watches',
    on: ['collect', 'open'],
    when: whileGuest('vs_glow'),
    chance: 0.4,
    priority: 24,
    cooldownH: 40,
    line: 'ambient',
  },
];
