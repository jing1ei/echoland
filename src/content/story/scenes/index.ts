import type { Scene } from '../../../game/story/types';
import { MAIN_SCENES } from './main';
import { LINEAGE_SCENES } from './lineage';
import { BOND_SCENES } from './bonds';
import { SIDE_SCENES } from './side';
import { AMBIENT_SCENES } from './ambient';
import { GRUDGE_SCENES } from './grudges';

export const SCENES: Scene[] = [
  ...MAIN_SCENES,
  ...LINEAGE_SCENES,
  ...BOND_SCENES,
  ...GRUDGE_SCENES,
  ...SIDE_SCENES,
  ...AMBIENT_SCENES,
];

export const SCENE_MAP: Record<string, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s]));

/* duplicate ids would silently shadow each other — catch it here */
if (SCENES.length !== Object.keys(SCENE_MAP).length) {
  const seen = new Set<string>();
  const dupes = SCENES.map((s) => s.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  console.error('[story] 重复的场景 id：', dupes);
}
