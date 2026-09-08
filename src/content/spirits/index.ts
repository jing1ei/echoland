/* ============================================================
   CONTENT MODULE — instrument spirits

     registry.ts    which instruments are inhabited, and by what
     values.ts      odds, cooldowns, reward sizes
     text.ts        names, blurbs, every spoken line
     art.ts         portrait specs
     audio.ts       the figure played when one appears
     conditions.ts  the mastery gate + named extra gates

   The scenes and triggers themselves are *generated* from these files by
   game/systems/spirits.ts and reach the router through
   game/story/registry.ts. Adding a spirit is six small edits in this
   folder and nothing anywhere else.
   ============================================================ */

export * from './registry';
export * from './values';
export * from './text';
export * from './art';
export * from './audio';
export * from './conditions';
