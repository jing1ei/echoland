import type { Instrument } from '../../game/types';
import { INSTRUMENT_SPECS } from './registry';
import { INSTRUMENT_VALUES } from './values';
import { INSTRUMENT_TEXT } from './text';
import { INSTRUMENT_ART, INSTRUMENT_ART_FALLBACK } from './art';
import { INSTRUMENT_AUDIO, INSTRUMENT_AUDIO_FALLBACK } from './audio';

/* ============================================================
   INSTRUMENTS — assembly

   The only place that knows an instrument is made of five files. The
   engine and the UI import `INSTRUMENTS` / `INSTRUMENT_MAP` from here
   and never see the split.

   A missing resource is a content bug, not a crash: the assembler fills
   in a neutral default and complains in dev.
   ============================================================ */

const MISSING: string[] = [];

export const INSTRUMENTS: Instrument[] = INSTRUMENT_SPECS.map((spec) => {
  const v = INSTRUMENT_VALUES[spec.id];
  const t = INSTRUMENT_TEXT[spec.id];
  if (!v) MISSING.push(`${spec.id} 缺少 values`);
  if (!t) MISSING.push(`${spec.id} 缺少 text`);
  if (!INSTRUMENT_ART[spec.id]) MISSING.push(`${spec.id} 缺少 art`);
  if (!INSTRUMENT_AUDIO[spec.id]) MISSING.push(`${spec.id} 缺少 audio`);
  return {
    id: spec.id,
    category: spec.category,
    rarity: spec.rarity,
    unique: spec.unique,
    name: t?.name ?? spec.id,
    nameEn: t?.nameEn ?? spec.id,
    desc: t?.desc ?? '',
    mul: v?.mul ?? {},
    affinity: v?.affinity ?? [],
    price: v?.price ?? 0,
    art: INSTRUMENT_ART[spec.id] ?? INSTRUMENT_ART_FALLBACK,
    audio: INSTRUMENT_AUDIO[spec.id] ?? INSTRUMENT_AUDIO_FALLBACK,
  };
});

export const INSTRUMENT_MAP: Record<string, Instrument> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
);

/** practice speed lives in values.ts; exposed here so the proficiency
    system never has to reach into a resource file directly */
export function practiceRate(id: string): number {
  return INSTRUMENT_VALUES[id]?.practice ?? 1;
}

export { INSTRUMENT_SPECS, INSTRUMENT_SPEC_MAP } from './registry';

if (import.meta.env.DEV && MISSING.length) {
  console.warn('[content/instruments] 资源不全:\n' + MISSING.join('\n'));
}
