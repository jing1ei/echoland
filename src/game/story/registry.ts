import type { Character, Scene, Trigger } from './types';
import { SCENES as AUTHORED_SCENES } from '../../content/story/scenes';
import { TRIGGERS as AUTHORED_TRIGGERS } from '../../content/story/triggers';
import { CHARACTERS as CAST } from '../../content/story/characters';
import { SPIRIT_CHARACTERS, SPIRIT_SCENES, SPIRIT_TRIGGERS } from '../systems/spirits';
import { WEATHER_SCENES, WEATHER_TRIGGERS } from '../systems/weather';
import { VISITOR_CONTENT_SCENES, VISITOR_CONTENT_TRIGGERS } from '../../content/visitors';

/* ============================================================
   Story registry — the seam between core and content

   The interpreter, the router and the condition evaluator must never
   import a content file directly. They import this. That is the whole
   trick behind "content is data": there is exactly one place where
   authored tables and generated tables are gathered, so a new content
   module (instrument spirits, weather beats, whatever comes next) plugs
   in with one line here and zero edits to the engine.

   Generated content is content too — the spirit and weather modules
   build their scenes and triggers from their own config files rather
   than hand-writing a trigger per instrument.
   ============================================================ */

export const SCENES: Scene[] = [
  ...AUTHORED_SCENES,
  ...SPIRIT_SCENES,
  ...WEATHER_SCENES,
  ...VISITOR_CONTENT_SCENES,
];

export const SCENE_MAP: Record<string, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s]));

export const TRIGGERS: Trigger[] = [
  ...AUTHORED_TRIGGERS,
  ...SPIRIT_TRIGGERS,
  ...WEATHER_TRIGGERS,
  ...VISITOR_CONTENT_TRIGGERS,
];

export const CHARACTERS: Character[] = [...CAST, ...SPIRIT_CHARACTERS];

export const CHARACTER_MAP: Record<string, Character> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);

/* duplicate ids would silently shadow each other — catch it at boot */
if (SCENES.length !== Object.keys(SCENE_MAP).length) {
  const seen = new Set<string>();
  const dupes = SCENES.map((s) => s.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  console.error('[story] 重复的场景 id：', dupes);
}
if (CHARACTERS.length !== Object.keys(CHARACTER_MAP).length) {
  console.error('[story] 重复的人物 id');
}
