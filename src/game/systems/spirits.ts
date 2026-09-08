import type { GameState } from '../engine';
import type { Character, Choice, Scene, Step, Trigger } from '../story/types';
import {
  SPIRIT_ART,
  SPIRIT_AUDIO,
  SPIRIT_BY_INSTRUMENT,
  SPIRIT_SPECS,
  SPIRIT_TEXT,
  SPIRIT_TIERS,
  SPIRIT_UI_TEXT,
  SPIRIT_VALUES,
  spiritKnown,
  spiritUnmet,
  type SpiritAudio,
  type SpiritSpec,
} from '../../content/spirits';
import { effectiveProf, isMastered } from './proficiency';

/* ============================================================
   INSTRUMENT SPIRITS — core

   This file is the only code the feature needs, and it contains no
   story: it reads content/spirits/* and *builds* the cast entry, the
   two scenes and the two triggers each spirit needs. The router then
   picks them up through story/registry.ts like any authored content.

   Why generate rather than hand-write the scenes? Because every spirit
   plays the same beat — an instrument you finished learning turns out to
   have been listening — and hand-copying that beat per instrument is
   how a nineteen-instrument game ends up with nineteen slightly
   divergent bugs. The shape lives here once; the words live in text.ts.

   The gate is content too: conditions.ts pins every spirit behind
   `masteredInHand`, which reads its threshold from the proficiency
   values. Nothing here decides when a spirit may appear.
   ============================================================ */

const sceneWake = (spec: SpiritSpec) => `sp_${spec.id}_wake`;
const sceneVisit = (spec: SpiritSpec) => `sp_${spec.id}_visit`;

/* ------------------------------------------------------------
   Cast
   ------------------------------------------------------------ */

export const SPIRIT_CHARACTERS: Character[] = SPIRIT_SPECS.flatMap((spec) => {
  const t = SPIRIT_TEXT[spec.id];
  const look = SPIRIT_ART[spec.id];
  if (!t || !look) return [];
  return [
    {
      id: spec.character,
      name: t.name,
      nameEn: t.nameEn,
      role: t.role,
      home: spec.home,
      blurb: t.blurb,
      look,
      tiers: SPIRIT_TIERS,
    },
  ];
});

/* ------------------------------------------------------------
   Scenes
   ------------------------------------------------------------ */

/** narration lines, no speaker */
const narrate = (lines: string[]): Step[] => lines.map((text) => ({ t: 'say', text }));

/** spoken lines, attributed to the spirit */
const spoken = (who: string, lines: string[]): Step[] =>
  lines.map((text) => ({ t: 'say', who, text }));

function wakeScene(spec: SpiritSpec): Scene {
  const t = SPIRIT_TEXT[spec.id];
  const v = SPIRIT_VALUES;

  const accept: Choice = {
    label: t.awaken.acceptLabel,
    hint: t.awaken.acceptHint,
    do: [
      { k: 'bond', who: spec.character, n: v.bondAccept },
      { k: 'insp', n: v.inspAccept, hours: true },
      ...(spec.gift ? [{ k: 'item' as const, id: spec.gift, n: 1 }] : []),
    ],
    goto: 'took',
  };

  const decline: Choice = {
    label: t.awaken.declineLabel,
    hint: t.awaken.declineHint,
    do: [
      { k: 'bond', who: spec.character, n: v.bondDecline },
      { k: 'coin', n: v.coinDecline, hours: true },
    ],
    goto: 'left',
  };

  return {
    id: sceneWake(spec),
    title: t.awaken.title,
    line: 'side',
    overlook: spec.overlook,
    steps: [
      ...narrate(t.awaken.open),
      { t: 'enter', who: spec.character, side: 'center', as: 'calm' },
      {
        t: 'do',
        do: [
          { k: 'meet', who: spec.character },
          { k: 'renown', n: v.renownAwaken },
          { k: 'flag', id: spec.flag },
        ],
      },
      ...spoken(spec.character, t.awaken.greet),
      { t: 'choose', prompt: t.awaken.prompt, options: [accept, decline] },
      { t: 'at', id: 'took' },
      ...spoken(spec.character, t.awaken.accept),
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'left' },
      ...spoken(spec.character, t.awaken.decline),
      { t: 'at', id: 'out' },
      { t: 'exit' },
      ...narrate(t.awaken.close),
      {
        t: 'do',
        do: [
          {
            k: 'journal',
            title: t.awaken.title,
            body: `${t.name}：${t.role}。你把那张琴弹到了尽头，尽头有人等着。`,
          },
        ],
      },
    ],
  };
}

function visitScene(spec: SpiritSpec): Scene {
  const t = SPIRIT_TEXT[spec.id];
  return {
    id: sceneVisit(spec),
    title: t.visit.title,
    line: 'bond',
    repeatable: true,
    steps: [
      ...narrate(t.visit.open),
      { t: 'enter', who: spec.character, side: 'center', as: 'smile' },
      ...spoken(spec.character, t.visit.lines),
      {
        t: 'do',
        do: [
          { k: 'bond', who: spec.character, n: SPIRIT_VALUES.bondVisit },
          { k: 'insp', n: SPIRIT_VALUES.inspVisit, hours: true },
        ],
      },
      { t: 'exit' },
      ...narrate(t.visit.close),
    ],
  };
}

export const SPIRIT_SCENES: Scene[] = SPIRIT_SPECS.flatMap((spec) =>
  SPIRIT_TEXT[spec.id] ? [wakeScene(spec), visitScene(spec)] : [],
);

/* ------------------------------------------------------------
   Triggers
   ------------------------------------------------------------ */

export const SPIRIT_TRIGGERS: Trigger[] = SPIRIT_SPECS.flatMap((spec) => {
  if (!SPIRIT_TEXT[spec.id]) return [];
  const v = SPIRIT_VALUES;
  return [
    {
      id: `tsp_${spec.id}_wake`,
      scene: sceneWake(spec),
      on: ['open', 'collect', 'arrive'],
      when: spiritUnmet(spec),
      chance: v.awakenChance,
      priority: v.awakenPriority,
      once: true,
      line: 'side',
    },
    {
      id: `tsp_${spec.id}_visit`,
      scene: sceneVisit(spec),
      on: ['collect'],
      when: spiritKnown(spec),
      chance: v.visitChance,
      priority: v.visitPriority,
      cooldownH: v.visitCooldownH,
      line: 'bond',
    },
  ];
});

/* ------------------------------------------------------------
   Lookups for the UI
   ------------------------------------------------------------ */

export type SpiritStage = 'none' | 'sleeping' | 'ready' | 'awake';

export interface SpiritStatus {
  spec: SpiritSpec;
  stage: SpiritStage;
  /** what to print on the instrument card */
  label: string;
  note: string;
  /** effective proficiency, so the card can show how far off the gate is */
  prof: number;
}

/** the satchel's "this one is inhabited" hint; null for ordinary instruments */
export function spiritStatus(s: GameState, instrumentId: string): SpiritStatus | null {
  const spec = SPIRIT_BY_INSTRUMENT[instrumentId];
  if (!spec) return null;
  const prof = effectiveProf(s, instrumentId);
  const awake = !!s.flags?.[spec.flag];
  const ready = isMastered(s, instrumentId);
  const stage: SpiritStage = awake ? 'awake' : ready ? 'ready' : 'sleeping';
  return {
    spec,
    stage,
    label: awake ? SPIRIT_UI_TEXT.awake : SPIRIT_UI_TEXT.hosted,
    note: awake
      ? (SPIRIT_TEXT[spec.id]?.role ?? SPIRIT_UI_TEXT.awake)
      : ready
        ? SPIRIT_UI_TEXT.ready
        : SPIRIT_UI_TEXT.gate,
    prof,
  };
}

/** character id -> its arrival figure, for the story view */
export const SPIRIT_CUES: Record<string, SpiritAudio> = Object.fromEntries(
  SPIRIT_SPECS.flatMap((spec) => {
    const cue = SPIRIT_AUDIO[spec.id];
    return cue ? [[spec.character, cue] as const] : [];
  }),
);

export const spiritCue = (characterId: string): SpiritAudio | undefined =>
  SPIRIT_CUES[characterId];
