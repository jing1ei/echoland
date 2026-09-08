/* ============================================================
   INSTRUMENT SPIRITS — the spine

   Some instruments are not merely rare: they are one of a kind, and one
   of a kind is enough for something to have moved in. A spirit can take
   human shape and start its own events — but only after that particular
   instrument has been played to the top of its proficiency. Practice is
   the ritual; nothing else opens the door.

   Everything about a spirit is configuration. Adding one is:

     · a row here
     · a text block in ./text.ts
     · a portrait in ./art.ts
     · a cue in ./audio.ts
     · optionally, an extra condition in ./conditions.ts

   No engine edit, no new trigger written by hand — game/systems/spirits.ts
   builds the character, the scenes and the triggers from these files.
   ============================================================ */

export interface SpiritSpec {
  id: string;
  /** the one instrument this spirit lives in; must be `unique` */
  instrument: string;
  /** generated character id, so triggers and portraits can name it */
  character: string;
  /** town the cast list files it under */
  home: string;
  /** overlook used as the backdrop when it first appears; omit for "here" */
  overlook?: string;
  /** given to the player when they accept the spirit's offer */
  gift?: string;
  /** story flag raised once the spirit has shown itself */
  flag: string;
  /** optional extra gate, by key into ./conditions.ts */
  extraCondition?: string;
}

export const SPIRIT_SPECS: SpiritSpec[] = [
  {
    id: 'sp_star',
    instrument: 'lyre_star',
    character: 'ch_sp_star',
    home: 'moonsand',
    overlook: 'starfalldunes',
    gift: 'it_spirit_token',
    flag: 'flag_spirit_star',
    extraCondition: 'atNight',
  },
  {
    id: 'sp_whale',
    instrument: 'lyre_whale',
    character: 'ch_sp_whale',
    home: 'whalebone',
    overlook: 'whalefall',
    gift: 'it_tuning_fork',
    flag: 'flag_spirit_whale',
    extraCondition: 'aboveTheSea',
  },
];

export const SPIRIT_SPEC_MAP: Record<string, SpiritSpec> = Object.fromEntries(
  SPIRIT_SPECS.map((s) => [s.id, s]),
);

/** instrument id -> spirit, for the satchel's "this one is inhabited" hint */
export const SPIRIT_BY_INSTRUMENT: Record<string, SpiritSpec> = Object.fromEntries(
  SPIRIT_SPECS.map((s) => [s.instrument, s]),
);
