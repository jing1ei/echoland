/* ============================================================
   The Wandering Lyre — core type definitions
   ============================================================ */

export type MoodTag =
  | 'sea'
  | 'wind'
  | 'night'
  | 'floral'
  | 'desert'
  | 'cloud'
  | 'ice'
  | 'ruin'
  | 'rain'
  | 'sky'
  | 'forest'
  | 'city'
  | 'holy'
  | 'melancholy'
  | 'festive';

export type SceneKind =
  | 'quay'
  | 'meadow'
  | 'lighthouse'
  | 'bridge'
  | 'dunes'
  | 'cloudtop'
  | 'aurora'
  | 'belltower'
  | 'rainlane'
  | 'whalefall'
  | 'canopy'
  | 'kiln';

export interface Palette {
  /** sky gradient stops for dawn / day / dusk / night, top → horizon */
  dawn: [string, string, string];
  day: [string, string, string];
  dusk: [string, string, string];
  night: [string, string, string];
  /** silhouette ramp: far → near */
  ridge: [string, string, string, string];
  /** ground / water tint */
  ground: string;
  water?: string;
  /** signature accent used for lights, particles, glows */
  accent: string;
  accent2: string;
}

export interface SceneConfig {
  kind: SceneKind;
  palette: Palette;
  /** which extra particle systems this scene runs */
  particles: Array<
    | 'petals'
    | 'fireflies'
    | 'rain'
    | 'snow'
    | 'embers'
    | 'gulls'
    | 'whales'
    | 'dust'
    | 'leaves'
    | 'lanternfly'
    | 'sparks'
    | 'mist'
  >;
  /** 0 = no water, 1 = ocean-wide */
  water: number;
  /** ridge layer count & jaggedness */
  ridges: number;
  jag: number;
  /** star density multiplier at night */
  stars: number;
  /** if true the scene keeps its own perpetual weather regardless of clock */
  forceNight?: boolean;
  forceRain?: boolean;
  /** vertical position of the horizon, 0..1 of canvas height */
  horizon: number;
}

/* ------------------------------------------------------------
   Time of day & weather

   `Phase` and the weather ids live here rather than in the engine so
   content files can name them without importing gameplay code.
   ------------------------------------------------------------ */

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

/* ------------------------------------------------------------
   Weather

   Ids and group ids are types because triggers, art and the economy all
   key off them; the probabilities, looks, sounds and effects live in
   `content/weather/`.
   ------------------------------------------------------------ */

export type WeatherId =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'rain_light'
  | 'rain_heavy'
  | 'thunder'
  | 'fog'
  | 'wind'
  | 'snow'
  | 'sleet';

/** a bag of weathers a condition can name without listing every id */
export type WeatherGroupId = 'rain' | 'snowfall' | 'wet' | 'calm' | 'extreme' | 'lowlight';

/** anything a story condition may name in `{ k: 'weather', of: [...] }` */
export type WeatherRef = WeatherId | WeatherGroupId;

/** the six looks the scene canvas knows how to draw; new weather maps onto
    one of them and adds its own flair in the overlay layer instead */
export type CanvasWeather = 'clear' | 'cloudy' | 'rain' | 'wind' | 'snow' | 'fog';

export interface Overlook {
  id: string;
  name: string;
  nameEn: string;
  region: string;
  blurb: string;
  /** long flavour shown in the overlook browser */
  lore: string;
  scene: SceneConfig;
  /** per real hour, before multipliers */
  base: { coin: number; insp: number; leisure: number; renown: number };
  moods: MoodTag[];
  crowd: number;
  townId: string;
  special?: boolean;
  /** how it becomes available */
  unlockNote: string;
  /** where it sits on the travel map, in 0..100 board space (y from the top).
      Hand-placed rather than derived: the map is a drawing, and the reading
      order of the journey matters more than real geography. */
  mapPos: { x: number; y: number };
}

export type Rarity = 'common' | 'fine' | 'rare' | 'myth';

/** How an instrument is played. Proficiency is tracked per instrument, but a
    category also carries a permanent shared bonus, so the taxonomy is a
    gameplay object rather than flavour text. Declared in
    `content/proficiency/categories.ts`. */
export type InstrumentCategoryId =
  | 'woodwind'
  | 'brass'
  | 'plucked_string'
  | 'keyboard'
  | 'hammered_string'
  | 'plucked_zither'
  | 'bowed_folk'
  | 'violin_family'
  | 'harp_lyre'
  | 'lamellophone'
  | 'percussion';

export interface InstrumentCategory {
  id: InstrumentCategoryId;
  name: string;
  nameEn: string;
  /** one line shown in the instrument detail card */
  blurb: string;
  /** examples, for the same card — purely descriptive */
  examples: string;
}

/** procedural art hints — no bitmap assets in this project, so "art" means
    the colours and the silhouette key the canvas draws from */
export interface InstrumentArt {
  accent: string;
  silhouette: 'lute' | 'flute' | 'box' | 'harp' | 'drum' | 'bow' | 'keys' | 'zither' | 'horn' | 'lamella';
}

/** synth voicing used when this instrument makes a sound */
export interface InstrumentAudio {
  /** base frequency in Hz for the little confirmation phrase */
  root: number;
  timbre: 'pluck' | 'blow' | 'bow' | 'strike' | 'reed';
}

export interface Instrument {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  mul: Partial<Record<'coin' | 'insp' | 'leisure' | 'renown' | 'event', number>>;
  affinity: MoodTag[];
  price: number;
  rarity: Rarity;
  /** playing technique family — drives the shared proficiency bonus */
  category: InstrumentCategoryId;
  /** a one-of-a-kind instrument; only these may host a spirit */
  unique?: boolean;
  art: InstrumentArt;
  audio: InstrumentAudio;
}

export interface Song {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  tags: MoodTag[];
  mul: Partial<Record<'coin' | 'insp' | 'leisure' | 'renown' | 'event', number>>;
  price: number;
  rarity: 'common' | 'fine' | 'rare' | 'myth';
}

/** a song the player wrote. Stored whole in the save, because a piece you
    composed has to survive content updates that no longer know about it. */
export interface ComposedSong extends Song {
  composedAt: number;
  grade: string;
  focus: string;
  /** the overlook it was written at, for the description and the journal */
  at: string;
}

export interface Stance {
  id: string;
  name: string;
  desc: string;
  mul: Record<'coin' | 'insp' | 'leisure' | 'renown' | 'event', number>;
  drain: number;
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  price: number;
  effect: string;
}

export type ItemKind = 'trinket' | 'reagent' | 'relic';

/** how a thing looks in the satchel tray: which line drawing (see
    src/ui/Glyph.tsx) and what colour the ink is. Same split as
    InstrumentArt — the picture is a resource, not gameplay. */
export interface ThingArt {
  glyph: string;
  tint: string;
}

export interface Item {
  id: string;
  name: string;
  desc: string;
  kind: ItemKind;
  value: number;
}

export interface EventChoice {
  label: string;
  detail: string;
  /** flat rewards */
  gain?: Partial<Record<'coin' | 'insp' | 'renown' | 'leisure', number>>;
  cost?: Partial<Record<'coin' | 'insp' | 'renown' | 'leisure', number>>;
  item?: string;
  song?: string;
  instrument?: string;
  flag?: string;
  /** narrative resolution text */
  outcome: string;
}

export interface GameEvent {
  id: string;
  title: string;
  /** the diary line written while you were away */
  text: string;
  weight: number;
  /** only fires at overlooks carrying one of these moods (empty = anywhere) */
  moods: MoodTag[];
  /** minimum *local* fame to appear: a crowd has to know you here
      (systems/fame.ts reads this against state.fame[town]) */
  minRenown?: number;
  tone: 'warm' | 'odd' | 'eerie' | 'lucky' | 'sad' | 'grand';
  /** passive events resolve instantly with these */
  gain?: Partial<Record<'coin' | 'insp' | 'renown' | 'leisure', number>>;
  item?: string;
  /** decision events wait in the satchel until you answer */
  choices?: EventChoice[];
  once?: boolean;
  /** required story flag */
  needFlag?: string;
  /** grants a story flag on resolution */
  flag?: string;
}

export type ObjectiveKind =
  | 'coinTotal'
  | 'collect'
  /** a fame *tier* (0..4). `ref` names a town, `*any` means anywhere,
      `*towns` counts how many towns hold you at `target` or better.
      There is no objective that asks for a fame number, because the
      player is never shown one. */
  | 'fame'
  /** ancestral leaves recovered. `ref` may name a volume id, in which case
      the target counts that volume's pages; `*vol` counts whole volumes. */
  | 'score'
  | 'renown'
  | 'inspTotal'
  | 'visitNode'
  | 'ownItem'
  | 'flag'
  | 'minigame'
  | 'performAt'
  | 'hours';

export interface Objective {
  kind: ObjectiveKind;
  target: number;
  ref?: string;
  label: string;
}

export interface Quest {
  id: string;
  chapter: number;
  line: 'main' | 'side';
  title: string;
  teaser: string;
  /** the story beat shown when the quest opens */
  opening: string;
  /** the story beat shown on completion */
  closing: string;
  objectives: Objective[];
  reward: {
    coin?: number;
    insp?: number;
    renown?: number;
    /** an ancestral leaf handed over by the story — see content/scores/ */
    score?: string;
    overlook?: string;
    instrument?: string;
    song?: string;
    item?: string;
    upgrade?: string;
    map?: string;
  };
  requires?: string[];
  /** only offered once you own this overlook */
  atOverlook?: string;
}

/* Every kind here must exist on at least one map and carry a KIND_META
   entry in ui/TownView — content/audit.ts checks the first half of that
   promise, because a kind nothing uses is a tuning knob wired to nothing. */
export type NodeKind =
  | 'tavern'
  | 'story'
  | 'puzzle'
  | 'gamble'
  | 'luthier'
  | 'scribe'
  | 'shrine'
  | 'market';

export interface MapNode {
  id: string;
  name: string;
  kind: NodeKind;
  /** 0..100 position on the town canvas */
  x: number;
  y: number;
  desc: string;
  cost: number;
  /** repeatable nodes can be visited again after cooldown minutes */
  repeatable?: boolean;
  cooldown?: number;
  questId?: string;
  needFlag?: string;
  /** rewards for a plain visit */
  gain?: Partial<Record<'coin' | 'insp' | 'renown' | 'leisure', number>>;
  loot?: string[];
  minigame?: 'dice' | 'tune' | 'cards';
  shopStock?: string[];
}

export interface TownMap {
  id: string;
  name: string;
  nameEn: string;
  blurb: string;
  /** background hue for the parchment map */
  tint: string;
  nodes: MapNode[];
  special?: boolean;
}
