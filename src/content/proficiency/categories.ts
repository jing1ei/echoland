import type { InstrumentCategoryId } from '../../game/types';

/* ============================================================
   PROFICIENCY — the category spine

   Instruments are grouped by *how they are played*, because that is what
   transfers: hours spent on a violin do help a cello, and do nothing for
   a suona. Each instrument keeps its own proficiency value; the group
   only carries the permanent shared bonus (see ./values.ts).

   This file is the spine — ids and reading order only. Names and blurbs
   live in ./text.ts, numbers in ./values.ts.
   ============================================================ */

export interface CategorySpec {
  id: InstrumentCategoryId;
  /** what the hands actually do — used to explain the shared bonus */
  technique: 'blow' | 'bow' | 'pluck' | 'strike' | 'keys';
}

/** display order for anywhere a list of categories is shown */
export const CATEGORY_SPECS: CategorySpec[] = [
  { id: 'woodwind', technique: 'blow' },
  { id: 'brass', technique: 'blow' },
  { id: 'plucked_string', technique: 'pluck' },
  { id: 'keyboard', technique: 'keys' },
  { id: 'hammered_string', technique: 'strike' },
  { id: 'plucked_zither', technique: 'pluck' },
  { id: 'bowed_folk', technique: 'bow' },
  { id: 'violin_family', technique: 'bow' },
  { id: 'harp_lyre', technique: 'pluck' },
  { id: 'lamellophone', technique: 'pluck' },
  { id: 'percussion', technique: 'strike' },
];

export const CATEGORY_SPEC_MAP: Record<string, CategorySpec> = Object.fromEntries(
  CATEGORY_SPECS.map((c) => [c.id, c]),
);
