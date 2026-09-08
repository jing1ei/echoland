import type { ItemKind, ThingArt } from '../../game/types';

/* ============================================================
   ITEMS — art

   The satchel draws things, not rows of text, so every item needs a
   picture and an ink colour. Same arrangement as content/instruments:
   the *drawing* lives in src/ui/Glyph.tsx, this file only says which
   drawing belongs to which object.

   Adding an item without a line here is not a crash — it falls back to
   the generic pouch in its kind's colour — but it is a content bug, and
   dev builds say so.
   ============================================================ */

export const ITEM_ART: Record<string, ThingArt> = {
  /* trinkets — things you sell without much feeling */
  it_shell: { glyph: 'shell', tint: '#6f6440' },
  it_button: { glyph: 'button', tint: '#9a7434' },
  it_feather: { glyph: 'feather', tint: '#5a6d76' },
  it_wheat: { glyph: 'wheat', tint: '#9a8034' },
  it_petal: { glyph: 'waxpetal', tint: '#a4646f' },
  it_lens: { glyph: 'mirror', tint: '#4e6a78' },
  it_glaze: { glyph: 'glaze', tint: '#9c5b3a' },
  it_sandglass: { glyph: 'hourglass', tint: '#715c30' },
  it_teabrick: { glyph: 'teabrick', tint: '#6d7a54' },

  /* reagents — things that get used up */
  it_string: { glyph: 'coil', tint: '#5c6a72' },
  it_rosin: { glyph: 'rosin', tint: '#94733f' },
  it_wine: { glyph: 'bottle', tint: '#7c6a3f' },
  it_tuning_fork: { glyph: 'fork', tint: '#53626c' },

  /* relics — the ones that are worth nothing and matter most */
  it_icecore: { glyph: 'icecore', tint: '#4c6d7e' },
  it_umbrella_paper: { glyph: 'umbrella', tint: '#8d6a72' },
  it_bellclapper: { glyph: 'clapper', tint: '#7a6a52' },
  it_lanternslip: { glyph: 'wishslip', tint: '#8a7a52' },
  it_scale: { glyph: 'scale', tint: '#4d6274' },
  it_catcollar: { glyph: 'collar', tint: '#8a6a4e' },
  it_score_burnt: { glyph: 'burntpage', tint: '#8a5a45' },
  it_map_old: { glyph: 'oldmap', tint: '#7b6a45' },
  it_spirit_token: { glyph: 'token', tint: '#7d5a63' },
};

/** used when an item has no line above — the generic pouch, inked by
    kind so a missing drawing still reads as the right sort of thing */
export const ITEM_ART_FALLBACK: Record<ItemKind, ThingArt> = {
  trinket: { glyph: 'thing', tint: '#8a7f5f' },
  reagent: { glyph: 'thing', tint: '#6d7a54' },
  relic: { glyph: 'thing', tint: '#7d5a63' },
};

export function itemArt(id: string, kind: ItemKind): ThingArt {
  return ITEM_ART[id] ?? ITEM_ART_FALLBACK[kind];
}
