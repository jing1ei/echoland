import type { InstrumentCategory } from '../../game/types';
import { CATEGORY_SPECS, CATEGORY_SPEC_MAP, type CategorySpec } from './categories';
import { CATEGORY_TEXT } from './text';

/* ============================================================
   PROFICIENCY — assembly

   Folds the category spine and its text into the record the UI reads.
   Numbers stay in ./values.ts; the system module imports them directly.
   ============================================================ */

export const CATEGORIES: InstrumentCategory[] = CATEGORY_SPECS.map((spec) => {
  const t = CATEGORY_TEXT[spec.id];
  return {
    id: spec.id,
    name: t?.name ?? spec.id,
    nameEn: t?.nameEn ?? spec.id,
    blurb: t?.blurb ?? '',
    examples: t?.examples ?? '',
  };
});

export const CATEGORY_MAP: Record<string, InstrumentCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export { CATEGORY_SPECS, CATEGORY_SPEC_MAP, type CategorySpec };
export { PROFICIENCY_VALUES, type ProficiencyValues } from './values';
export { PROFICIENCY_TEXT, CATEGORY_TEXT, TIER_LABELS } from './text';
export * as profConditions from './conditions';
