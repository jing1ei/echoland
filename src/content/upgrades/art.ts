import type { ThingArt } from '../../game/types';

/* ============================================================
   UPGRADES — art

   One drawing per piece of kit, for the satchel tray. Drawings live in
   src/ui/Glyph.tsx; this file only maps id → drawing + ink.
   ============================================================ */

export const UPGRADE_ART: Record<string, ThingArt> = {
  up_coffer: { glyph: 'coffer', tint: '#9a7434' },
  up_apprentice: { glyph: 'apprentice', tint: '#7a6a52' },
  up_umbrella: { glyph: 'umbrella', tint: '#6d7a54' },
  up_lantern: { glyph: 'lantern', tint: '#96762f' },
  up_journal: { glyph: 'journal', tint: '#6f6350' },
  up_pass: { glyph: 'pass', tint: '#7f7256' },
  up_cushion: { glyph: 'cushion', tint: '#8a6a4e' },
  up_dice: { glyph: 'dice', tint: '#8a4f4f' },
  up_whistle: { glyph: 'whistle', tint: '#6f8894' },
  up_ring: { glyph: 'ring', tint: '#9a7434' },
  up_cart: { glyph: 'cart', tint: '#7b6a45' },
  up_pass2: { glyph: 'cloak', tint: '#7d5a63' },
};

export const UPGRADE_ART_FALLBACK: ThingArt = { glyph: 'boot', tint: '#7f7256' };

export function upgradeArt(id: string): ThingArt {
  return UPGRADE_ART[id] ?? UPGRADE_ART_FALLBACK;
}
