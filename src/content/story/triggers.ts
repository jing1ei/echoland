import type { Trigger } from '../../game/story/types';
import { SCORE_VALUES } from '../scores';
import type { NodeKind } from '../../game/types';

/** the rooms a leaf can actually surface in — derived, so this row cannot
    drift from content/scores/values.ts. A main beat hooked on `node` has to
    say where it may interrupt (see auditContent). */
const LEAF_ROOMS = Object.keys(SCORE_VALUES.findByNode) as NodeKind[];

/* ============================================================
   TRIGGERS — the whole condition/probability layer in one table.

   Read a row as: "on HOOK, if WHEN holds, this scene has CHANCE of
   playing, and it competes only against rows of the same PRIORITY."

   Priority bands used here:
     100  main story — chance 1, must land
      70  bond scenes — high chance, one per visit at most
      40  named-character ambient
      20  world ambient
   A main beat therefore never loses a coin flip to a cat.
   ============================================================ */

export const TRIGGERS: Trigger[] = [
  /* ================= LINEAGE =================
     Gated on the collection rather than on a chapter, because a player who
     ignores the quest chain and digs through every scribe's chest deserves
     to find out what they are for at the same moment. Priority 100: these
     never lose a coin flip. */
  {
    id: 't_l_first_leaf',
    scene: 'l_first_leaf',
    on: ['collect', 'open', 'node'],
    nodeKinds: LEAF_ROOMS,
    when: { k: 'score', min: 1 },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_l_volume',
    scene: 'l_volume',
    on: ['collect', 'open'],
    when: { k: 'volumes', min: 1 },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },

  /* ================= MAIN LINE ================= */
  {
    id: 't_m1_ledger',
    scene: 'm1_ledger',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: { k: 'flag', id: 'flag_met_su', off: true },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m1_paid',
    scene: 'm1_paid',
    on: ['quest', 'open'],
    when: { k: 'quest', id: 'main_1', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m2_kids',
    scene: 'm2_kids',
    on: ['quest', 'node', 'open'],
    nodeKinds: ['story', 'market'],
    when: { k: 'quest', id: 'main_2', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m3_keeper',
    scene: 'm3_keeper',
    on: ['arrive', 'node', 'open'],
    nodeKinds: ['story', 'shrine'],
    when: {
      k: 'all',
      of: [
        { k: 'quest', id: 'main_3', is: 'done' },
        { k: 'overlook', ids: ['cliffbeacon'] },
      ],
    },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m4_page',
    scene: 'm4_empty_page',
    on: ['quest', 'collect', 'open'],
    when: { k: 'quest', id: 'main_4', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m5_kiln',
    scene: 'm5_kiln',
    on: ['quest', 'node', 'arrive'],
    nodeKinds: ['story', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'quest', id: 'main_5', is: 'done' },
        { k: 'town', ids: ['emberkiln'] },
      ],
    },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m6_sand',
    scene: 'm6_sand',
    on: ['quest', 'collect', 'arrive'],
    when: { k: 'quest', id: 'main_6', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m7_brother',
    scene: 'm7_brother',
    on: ['quest', 'arrive', 'node'],
    nodeKinds: ['story', 'shrine'],
    when: { k: 'quest', id: 'main_7', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m8_lake',
    scene: 'm8_lake',
    on: ['quest', 'collect', 'arrive'],
    when: {
      k: 'all',
      of: [
        { k: 'quest', id: 'main_8', is: 'done' },
        { k: 'overlook', ids: ['auroralake'] },
      ],
    },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },
  {
    id: 't_m9_whalefall',
    scene: 'm9_whalefall',
    on: ['quest', 'collect', 'arrive', 'open'],
    when: { k: 'quest', id: 'main_9', is: 'done' },
    chance: 1,
    priority: 100,
    once: true,
    line: 'main',
  },

  /* ================= BONDS · 苏芹 ================= */
  {
    id: 't_b_su_1',
    scene: 'b_su_1',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_su', min: 1 },
        { k: 'seen', scene: 'm1_ledger', min: 1 },
      ],
    },
    chance: 0.75,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_su_2',
    scene: 'b_su_2',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_su', min: 2 },
        { k: 'weather', of: ['rain'] },
      ],
    },
    chance: 0.85,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_su_3',
    scene: 'b_su_3',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_su', min: 3 },
        { k: 'met', who: 'ch_que' },
        /* the mechanical bite of a grudge: the scene she would have let
           you see is simply not offered while that page is open */
        { k: 'grudge', who: 'ch_su', max: 0 },
      ],
    },
    chance: 0.8,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 楮 ================= */
  {
    id: 't_b_chu_1',
    scene: 'b_chu_1',
    on: ['node'],
    nodeKinds: ['luthier'],
    chance: 0.8,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_chu_2',
    scene: 'b_chu_2',
    on: ['node'],
    nodeKinds: ['luthier'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_chu', min: 2 },
        { k: 'sinceScene', scene: 'b_chu_1', minH: 6 },
      ],
    },
    chance: 0.8,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 阿雀 ================= */
  {
    id: 't_b_que_1',
    scene: 'b_que_1',
    on: ['collect', 'arrive'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_que', off: true },
        { k: 'collects', min: 4 },
      ],
    },
    chance: 0.45,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_que_2',
    scene: 'b_que_2',
    on: ['collect', 'node'],
    nodeKinds: ['scribe', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_que', min: 2 },
        { k: 'sinceMet', who: 'ch_que', minH: 4 },
      ],
    },
    chance: 0.5,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_que_3',
    scene: 'b_que_3',
    on: ['collect', 'arrive'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_que', min: 3 },
        { k: 'seen', scene: 'b_que_2', min: 1 },
        { k: 'grudge', who: 'ch_que', max: 0 },
      ],
    },
    chance: 0.6,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 姜聿 =================
     Both of hers require main_4 to still be open. Chapter four closes
     this door for good, on purpose. */
  {
    id: 't_b_jiang_1',
    scene: 'b_jiang_1',
    on: ['node', 'arrive'],
    nodeKinds: ['story', 'shrine'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_jiang' },
        { k: 'quest', id: 'main_4', is: 'open' },
        { k: 'overlook', ids: ['cliffbeacon'] },
      ],
    },
    chance: 0.7,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_jiang_2',
    scene: 'b_jiang_2',
    on: ['node', 'collect'],
    nodeKinds: ['story', 'shrine'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_jiang', min: 2 },
        { k: 'quest', id: 'main_4', is: 'open' },
        { k: 'overlook', ids: ['cliffbeacon'] },
        { k: 'phase', of: ['night', 'dusk'] },
      ],
    },
    chance: 0.65,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 白十一 ================= */
  {
    id: 't_b_bai_1',
    scene: 'b_bai_1',
    on: ['node'],
    nodeKinds: ['gamble'],
    chance: 0.7,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_bai_2',
    scene: 'b_bai_2',
    on: ['node'],
    nodeKinds: ['gamble'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_bai', min: 2 },
        { k: 'sinceScene', scene: 'b_bai_1', minH: 4 },
      ],
    },
    chance: 0.75,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 麦穗 ================= */
  {
    id: 't_b_mai_1',
    scene: 'b_mai_1',
    on: ['collect', 'node'],
    nodeKinds: ['story', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_mai' },
        { k: 'town', ids: ['millbrook'] },
      ],
    },
    chance: 0.7,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_mai_2',
    scene: 'b_mai_2',
    on: ['collect', 'node'],
    nodeKinds: ['story', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_mai', min: 2 },
        { k: 'town', ids: ['millbrook'] },
        { k: 'phase', of: ['day', 'dawn'] },
      ],
    },
    chance: 0.7,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 释岫 ================= */
  {
    id: 't_b_xiu_1',
    scene: 'b_xiu_1',
    on: ['node', 'arrive'],
    nodeKinds: ['story', 'shrine'],
    when: { k: 'town', ids: ['cloudcloister'] },
    chance: 0.8,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= BONDS · 老驼 / 凿冰人 =================
     Both are met inside a main beat, so these only ask for the town and
     a bit of warmth — they are late-game company, not a puzzle. */
  {
    id: 't_b_dune_1',
    scene: 'b_dune_1',
    on: ['collect', 'node', 'arrive'],
    nodeKinds: ['story', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_dune' },
        { k: 'town', ids: ['moonsand'] },
        { k: 'phase', of: ['night', 'dusk'] },
      ],
    },
    chance: 0.6,
    priority: 70,
    once: true,
    line: 'bond',
  },
  {
    id: 't_b_fish_1',
    scene: 'b_fish_1',
    on: ['collect', 'node', 'arrive'],
    nodeKinds: ['story', 'market'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_fish' },
        { k: 'town', ids: ['frostweave'] },
      ],
    },
    chance: 0.6,
    priority: 70,
    once: true,
    line: 'bond',
  },

  /* ================= GRUDGES =================
     Priority 85 for the beat where a grudge lands, and for the one that
     clears it: being found out interrupts everything except the main
     line, because a player who is about to lose something should not
     have it buried under a cat sighting. The cooling-off and mending
     scenes sit at 68 — under bonds, since the player chose to be there.

     Every opener carries `{ grudge, max: 0 }`. You cannot start a second
     quarrel with someone while the first one is still open; that would
     stack penalties the player has no way to read.

     Note the two-beat shape: `*_coin` / `*_letter` / `*_rain` only set a
     var or a flag, and the scene that actually charges enmity fires the
     next time you walk in. See scenes/grudges.ts. */
  {
    id: 't_g_su_coin',
    scene: 'g_su_coin',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_su', min: 1 },
        { k: 'seen', scene: 'b_su_1', min: 1 },
        { k: 'grudge', who: 'ch_su', max: 0 },
        { k: 'var', id: 'v_su_took', max: 0 },
      ],
    },
    chance: 0.45,
    priority: 68,
    once: true,
    line: 'side',
  },
  {
    id: 't_g_su_caught',
    scene: 'g_su_caught',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    /* no `once`: the var is what closes this door, and the scene itself
       clears the var on every branch */
    when: { k: 'var', id: 'v_su_took', min: 1 },
    chance: 1,
    priority: 85,
    line: 'side',
  },
  {
    id: 't_g_su_cold',
    scene: 'g_su_cold',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: { k: 'grudge', who: 'ch_su', min: 1 },
    chance: 0.5,
    priority: 40,
    cooldownH: 18,
    line: 'ambient',
  },
  {
    id: 't_g_su_mend',
    scene: 'g_su_mend',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    when: { k: 'grudge', who: 'ch_su', min: 1 },
    chance: 0.7,
    priority: 68,
    cooldownH: 10,
    line: 'side',
  },
  {
    id: 't_g_su_clear',
    scene: 'g_su_clear',
    on: ['node'],
    nodeIds: ['sal_tavern'],
    /* forgiveness is not automatic and not cheap: she has to still like
       you, and you have to have tried at least once */
    when: {
      k: 'all',
      of: [
        { k: 'grudge', who: 'ch_su', min: 1 },
        { k: 'tier', who: 'ch_su', min: 3 },
        { k: 'seen', scene: 'g_su_mend', min: 1 },
      ],
    },
    chance: 1,
    priority: 82,
    once: true,
    line: 'bond',
  },

  {
    id: 't_g_que_letter',
    scene: 'g_que_letter',
    on: ['node'],
    nodeIds: ['sak_market', 'sal_market'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_que', min: 1 },
        { k: 'seen', scene: 'b_que_1', min: 1 },
        { k: 'grudge', who: 'ch_que', max: 0 },
      ],
    },
    chance: 0.4,
    priority: 68,
    once: true,
    line: 'side',
  },
  {
    id: 't_g_que_cold',
    scene: 'g_que_cold',
    on: ['collect', 'arrive'],
    when: { k: 'grudge', who: 'ch_que', min: 1 },
    chance: 0.35,
    priority: 40,
    cooldownH: 20,
    line: 'ambient',
  },
  {
    id: 't_g_que_clear',
    scene: 'g_que_clear',
    on: ['node'],
    nodeIds: ['sak_post'],
    when: {
      k: 'all',
      of: [
        { k: 'grudge', who: 'ch_que', min: 1 },
        { k: 'var', id: 'v_que_sold', min: 1 },
      ],
    },
    chance: 1,
    priority: 82,
    once: true,
    line: 'side',
  },

  {
    id: 't_g_chu_rain',
    scene: 'g_chu_rain',
    on: ['collect'],
    when: {
      k: 'all',
      of: [
        { k: 'met', who: 'ch_chu' },
        { k: 'grudge', who: 'ch_chu', max: 0 },
        { k: 'weather', of: ['rain'] },
        { k: 'collects', min: 6 },
      ],
    },
    chance: 0.5,
    priority: 68,
    once: true,
    line: 'side',
  },
  {
    id: 't_g_chu_mend',
    scene: 'g_chu_mend',
    on: ['node'],
    nodeIds: ['sal_luthier', 'tid_luthier'],
    when: { k: 'grudge', who: 'ch_chu', min: 1 },
    chance: 0.8,
    priority: 68,
    cooldownH: 10,
    line: 'side',
  },

  /* ================= SIDE STORIES =================
     Priority 55: above ambient, below bonds. These are the openers for
     side quests, so they are worth interrupting a cat for — but a bond
     scene the player has been building toward still wins. */
  {
    id: 't_s_cat_collar',
    scene: 's_cat_collar',
    on: ['node', 'collect'],
    nodeIds: ['sal_dock', 'sal_warehouse'],
    when: {
      k: 'all',
      of: [
        { k: 'flag', id: 'flag_cat_found', off: true },
        { k: 'seen', scene: 'a_cat', min: 2 },
      ],
    },
    /* it takes two winters in the fiction; here, two sightings and luck */
    chance: 0.35,
    priority: 55,
    once: true,
    line: 'side',
  },
  {
    id: 't_s_dice_polished',
    scene: 's_dice_polished',
    on: ['node'],
    nodeKinds: ['gamble'],
    when: {
      k: 'all',
      of: [
        { k: 'tier', who: 'ch_bai', min: 2 },
        { k: 'quest', id: 'main_2', is: 'done' },
        { k: 'not', of: { k: 'quest', id: 'side_dice', is: 'active' } },
      ],
    },
    chance: 0.5,
    priority: 55,
    once: true,
    line: 'side',
  },
  {
    id: 't_s_umbrella_gift',
    scene: 's_umbrella_gift',
    on: ['collect', 'node'],
    when: {
      k: 'all',
      of: [
        { k: 'weather', of: ['rain'] },
        { k: 'seen', scene: 'a_umbrella', min: 1 },
        { k: 'flag', id: 'flag_umbrella_met', off: true },
      ],
    },
    chance: 0.55,
    priority: 55,
    once: true,
    line: 'side',
  },
  {
    id: 't_s_bell_parts',
    scene: 's_bell_parts',
    on: ['node'],
    nodeIds: ['bel_score', 'bel_bell'],
    when: {
      k: 'all',
      of: [
        { k: 'town', ids: ['bellruin'] },
        { k: 'flag', id: 'flag_bell_played', off: true },
      ],
    },
    chance: 0.7,
    priority: 55,
    once: true,
    line: 'side',
  },

  /* ================= AMBIENT · named ================= */
  {
    id: 't_a_umbrella',
    scene: 'a_umbrella',
    on: ['collect', 'node'],
    when: {
      k: 'all',
      of: [
        { k: 'weather', of: ['rain'] },
        { k: 'flag', id: 'flag_umbrella_met', off: true },
      ],
    },
    chance: 0.4,
    priority: 40,
    once: true,
    line: 'side',
  },
  {
    id: 't_a_que_pass',
    scene: 'a_que_pass',
    on: ['collect', 'arrive'],
    when: { k: 'met', who: 'ch_que' },
    chance: 0.22,
    priority: 40,
    cooldownH: 5,
    line: 'ambient',
  },

  /* ================= AMBIENT · world ================= */
  {
    id: 't_a_star_wish',
    scene: 'a_star_wish',
    on: ['collect'],
    when: {
      k: 'all',
      of: [
        { k: 'mood', tags: ['desert', 'sky', 'night'] },
        { k: 'phase', of: ['night'] },
        { k: 'weather', of: ['clear'] },
      ],
    },
    /* right place, right sky, right weather — and still only 4% */
    chance: 0.04,
    priority: 40,
    once: true,
    line: 'side',
  },
  {
    id: 't_a_cat',
    scene: 'a_cat',
    on: ['collect'],
    when: { k: 'mood', tags: ['sea'] },
    chance: 0.2,
    priority: 20,
    cooldownH: 4,
    line: 'ambient',
  },
  {
    id: 't_a_rain_share',
    scene: 'a_rain_share',
    on: ['collect', 'node'],
    when: { k: 'weather', of: ['rain'] },
    chance: 0.22,
    priority: 20,
    cooldownH: 6,
    line: 'ambient',
  },
  {
    id: 't_a_wrong_song',
    scene: 'a_wrong_song',
    on: ['collect'],
    when: { k: 'collects', min: 2 },
    chance: 0.18,
    priority: 20,
    cooldownH: 3,
    line: 'ambient',
  },
  {
    id: 't_a_night_listener',
    scene: 'a_night_listener',
    on: ['collect'],
    when: { k: 'phase', of: ['night'] },
    chance: 0.2,
    priority: 20,
    cooldownH: 8,
    line: 'ambient',
  },
];
