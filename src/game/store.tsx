import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  accrue,
  computeRates,
  freshState,
  SAVE_KEY,
  skyState,
  STATE_VERSION,
  type AccrualResult,
  type GameState,
  type JournalEntry,
  type PendingEvent,
} from './engine';
import { OVERLOOK_MAP } from '../content/overlooks';
import { EVENT_MAP } from '../content/events';
import { QUESTS, QUEST_MAP } from '../content/quests';
import { NODE_MAP, TOWN_MAP } from '../content/towns';
import { INSTRUMENT_MAP, ITEM_MAP, SONG_MAP, UPGRADE_MAP } from '../content/gear';
import type { ComposedSong, InstrumentCategoryId, NodeKind, Objective, Quest } from './types';
import { SCORE_MAP, SCORE_TEXT, SCORE_TOTAL, VOLUME_MAP } from '../content/scores';
import {
  activeVolume,
  findScore,
  findChance,
  leafJournal,
  pickLeaf,
  scoresFound,
  volumeDone,
  volumeFound,
  volumeJournal,
  volumesDone,
} from './systems/scores';
import { songById } from './systems/songs';
import { compose, type ComposeOpts } from './systems/compose';
import { CATEGORY_MAP, CATEGORY_SPEC_MAP } from '../content/proficiency';
import { PROFICIENCY_TEXT } from '../content/proficiency/text';
import { PROFICIENCY_VALUES } from '../content/proficiency/values';
import {
  categoryBonus,
  categoryOf,
  effectiveProf,
  isMastered,
  ownProf,
  practicePerHour,
  recomputeBonus,
} from './systems/proficiency';
import { forgetVisitorMemo } from './systems/visitors';
import {
  bestFameTier,
  currentTown,
  fameLabel,
  fameOf,
  fameProgress,
  fameTier,
  fameJournal,
  fameUpLine,
  grantFame,
  townsKnownAt,
} from './systems/fame';
import { FAME_TEXT } from '../content/fame';
import { performancePay } from './systems/performance';
import {
  choose as sceneChoose,
  freshStory,
  pickScene,
  probeTriggers,
  run as sceneRun,
  startScene,
  type Hook,
  type HookCtx,
  type Note,
  type Out,
  type Runner,
  mergeNotes,
  SCENE_MAP,
  CHARACTER_MAP,
  guestsAt,
  tierIndex,
  tierLabel,
  enmityIndex,
  enmityLabel,
  enmityOf,
} from './story';
import { setMasterVolume } from '../audio';

/* ============================================================
   Quest evaluation
   ============================================================ */

export function objectiveValue(s: GameState, o: Objective): number {
  switch (o.kind) {
    case 'coinTotal':
      return s.totalCoin;
    case 'inspTotal':
      return s.totalInsp;
    case 'collect':
      return s.collects;
    /* fame is local and shown as a word, so an errand asks for a *tier*
       in a named town (or the best you hold anywhere with `*any`) rather
       than for a number the player cannot see. See systems/fame.ts. */
    case 'fame': {
      const ref = o.ref ?? '*any';
      /* `*any`        target = the tier, counted anywhere
         `*towns:T`    target = how many towns hold you at tier T
         `<townId>`    target = the tier, in that town */
      if (ref === '*any') return bestFameTier(s);
      if (ref.startsWith('*towns')) {
        const tier = Number(ref.split(':')[1] ?? 2);
        return townsKnownAt(s, Number.isFinite(tier) ? tier : 2);
      }
      return fameTier(s, ref);
    }
    case 'renown':
      return s.renown;
    /* the eighty-one: `*vol` counts whole volumes, a volume id counts that
       volume's pages, anything else counts every page you have brought home */
    case 'score': {
      const ref = o.ref ?? '';
      if (ref === '*vol') return volumesDone(s);
      if (VOLUME_MAP[ref]) return volumeFound(s, ref);
      return scoresFound(s);
    }
    case 'hours':
      return (Date.now() - s.createdAt) / 3600000;
    case 'flag':
      return s.flags[o.ref ?? ''] ? 1 : 0;
    case 'minigame':
      return s.minigameWins[o.ref ?? ''] ?? 0;
    case 'ownItem': {
      if (o.ref === '*trinket') {
        return Object.entries(s.items).filter(
          ([id, n]) => n > 0 && ITEM_MAP[id]?.kind === 'trinket',
        ).length;
      }
      return s.items[o.ref ?? ''] ?? 0;
    }
    case 'performAt': {
      if (o.ref === '*any') return Object.values(s.performAt).filter((n) => n > 0).length;
      return s.performAt[o.ref ?? ''] ?? 0;
    }
    case 'visitNode': {
      const ref = o.ref ?? '';
      if (ref.startsWith('*')) {
        const kind = ref.slice(1);
        return Object.entries(s.nodeVisits).reduce((acc, [id, v]) => {
          const n = NODE_MAP[id];
          return n && n.node.kind === kind ? acc + v.count : acc;
        }, 0);
      }
      return s.nodeVisits[ref]?.count ?? 0;
    }
    default:
      return 0;
  }
}

export function questReady(s: GameState, q: Quest): boolean {
  return q.objectives.every((o) => objectiveValue(s, o) >= o.target);
}

export function availableQuests(s: GameState): Quest[] {
  return QUESTS.filter((q) => {
    if (s.questsDone.includes(q.id)) return false;
    if (q.requires && !q.requires.every((r) => s.questsDone.includes(r))) return false;
    return true;
  });
}

/* ============================================================
   Advancing time

   `accrue` is pure and says nothing; it just reports what happened. The
   store is where "what happened" turns into something the player can
   read. Practice milestones are worth a line in the journal — they are
   permanent, they affect instruments the player has never held, and they
   would otherwise be invisible.

   Every place that moves the clock forward goes through here, so a
   milestone crossed by the background tick is written down exactly like
   one crossed at the moment of collecting.
   ============================================================ */

function advance(prev: GameState, t: number): { state: GameState; result: AccrualResult } {
  const { state: s, result } = accrue(prev, t);
  const p = result.practice;
  if (!p || (p.milestones <= 0 && !p.justMastered)) return { state: s, result };

  const instName = INSTRUMENT_MAP[p.instrument]?.name ?? p.instrument;
  const catName = p.category ? (CATEGORY_MAP[p.category]?.name ?? '') : '';
  const entries: JournalEntry[] = [];
  if (p.milestones > 0) {
    entries.push({
      at: t,
      kind: 'craft',
      title: PROFICIENCY_TEXT.journal.milestoneTitle(instName),
      body: PROFICIENCY_TEXT.journal.milestoneBody(instName, catName, p.milestones, p.after),
    });
  }
  if (p.justMastered) {
    entries.push({
      at: t,
      kind: 'craft',
      title: PROFICIENCY_TEXT.journal.masterTitle(instName),
      body: PROFICIENCY_TEXT.journal.masterBody(instName),
    });
  }
  return {
    state: { ...s, journal: [...entries.reverse(), ...s.journal].slice(0, 220) },
    result,
  };
}

/* ============================================================
   Store
   ============================================================ */

type CollectReport = {
  hours: number;
  coin: number;
  insp: number;
  /** what the session earned in *local* fame. Kept out of the sheet as a
      number — the sheet prints `fameWord`, and `fameUp` when the town
      started calling you something new (systems/fame.ts). */
  renown: number;
  fameTown: string;
  fameWord: string;
  fameUp: string;
  leisure: number;
  events: PendingEvent[];
  fatigued: boolean;
  /** what the session did to the instrument in hand */
  practice?: {
    instrument: string;
    name: string;
    from: number;
    to: number;
    gained: number;
    milestones: number;
    mastered: boolean;
  };
};

/* ------------------------------------------------------------
   A live scene. The program counter is deliberately *not* persisted: a
   content edit would otherwise resume a player into the middle of a
   script that no longer exists. What is persisted is only which scene
   was on screen (`story.playing`), so that killing the app mid-dialogue
   replays that scene from its first line on the next boot instead of
   burning it — the bookkeeping that marks it seen happens when it
   opens. Effects already applied are kept, because those went through
   `commit`.
   ------------------------------------------------------------ */
export interface StorySession {
  sceneId: string;
  title: string;
  line: string;
  runner: Runner;
  out: Out;
  /** notes produced by the step we just landed on */
  notes: Note[];
  /** everything said so far, for the backlog */
  history: Array<{ who?: string; text: string }>;
  /** notes accumulated over the whole scene, shown on the closing card */
  earned: Note[];
}

interface Ctx {
  state: GameState;
  rates: ReturnType<typeof computeRates>;
  now: number;
  collect: () => CollectReport;
  /* --- story --- */
  story: StorySession | null;
  /** ask the router whether anything happens on this hook; true if a scene opened */
  fireHook: (hook: Hook, extra?: { nodeId?: string; nodeKind?: NodeKind }) => boolean;
  storyAdvance: () => void;
  storyChoose: (index: number) => void;
  storyClose: () => void;
  /** for the cast screen */
  bondOf: (who: string) => number;
  lastReport: CollectReport | null;
  clearReport: () => void;
  resolveDecision: (eventId: string, choiceIdx: number) => string;
  setStrategy: (patch: Partial<Pick<GameState, 'overlook' | 'instrument' | 'stance' | 'repertoire'>>) => void;
  visitNode: (nodeId: string) => {
    ok: boolean;
    msg: string;
    loot: string[];
    minigame?: string;
    story?: boolean;
    /** an ancestral page this room gave up, if any — see systems/scores.ts */
    score?: { name: string; vol: string } | null;
    /** set when that page completed a volume */
    volume?: { name: string; song: string } | null;
  };
  buy: (id: string) => { ok: boolean; msg: string };
  sell: (id: string) => { ok: boolean; msg: string };
  winMinigame: (kind: string, coinDelta: number, note: string) => void;
  claimQuest: (id: string) => Quest | null;
  markIntroSeen: () => void;
  /** puts the prologue back on screen — the settings sheet calls this "重看开场" */
  replayIntro: () => void;
  toggleMotion: () => void;
  setVolume: (v: number) => void;
  setProfile: (patch: Partial<GameState['profile']>) => void;
  markTipSeen: (id: string) => void;
  hardReset: () => void;
  addJournal: (e: Omit<JournalEntry, 'at'>) => void;
  spendLeisure: (n: number) => boolean;
  /** spend inspiration and write a song of your own; null when you cannot afford it */
  composeSong: (opts: ComposeOpts) => ComposedSong | null;

  /* ---- GM seam: development only ----------------------------------
     The only way anything outside game/ may write raw state, and the
     only way to force a scene open. Nothing in src/game or src/ui calls
     either one — they exist for src/gm/, which is built to be deleted
     before a release. See docs/GM.md. */
  gmWrite: (mut: (s: GameState) => GameState) => void;
  gmPlay: (sceneId: string) => void;
}

const GameCtx = createContext<Ctx | null>(null);

/* ------------------------------------------------------------
   Save loading

   A version bump used to wipe the save. That is a terrible trade for a game
   whose whole premise is "leave it running for weeks", so instead we migrate:
   start from a fresh state, layer the old save on top, then sanitise anything
   that points at content which no longer exists.
   ------------------------------------------------------------ */

function sanitise(s: GameState): GameState {
  const keep = <T,>(list: unknown, valid: (x: string) => boolean, fallback: T[]): T[] =>
    Array.isArray(list) ? ((list.filter((x) => typeof x === 'string' && valid(x)) as unknown) as T[]) : fallback;

  const overlooks = keep<string>(s.overlooks, (id) => !!OVERLOOK_MAP[id], ['mistquay']);
  if (!overlooks.includes('mistquay')) overlooks.unshift('mistquay');
  const instruments = keep<string>(s.instruments, (id) => !!INSTRUMENT_MAP[id], ['lute_worn']);
  if (instruments.length === 0) instruments.push('lute_worn');
  /* ---- composing arrived in save v8 ----
     Songs the player wrote are stored whole, so they survive content
     updates; they are validated for shape rather than looked up in a
     table, because no table will ever contain them. */
  const composed: ComposedSong[] = Array.isArray((s as { composed?: unknown }).composed)
    ? ((s as { composed: unknown[] }).composed.filter(
        (x) =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as ComposedSong).id === 'string' &&
          typeof (x as ComposedSong).name === 'string' &&
          Array.isArray((x as ComposedSong).tags),
      ) as ComposedSong[])
    : [];
  const composedIds = new Set(composed.map((x) => x.id));

  const songs = keep<string>(s.songs, (id) => !!SONG_MAP[id] || composedIds.has(id), ['song_ferry']);
  if (songs.length === 0) songs.push('song_ferry');

  /* ---- the eighty-one, also v8 ----
     Leaf ids are validated against the registry: a save that names a page
     no volume contains has been hand-edited, and the honest fix is to drop
     it rather than to show a blank slot forever. */
  const scores = [...new Set(keep<string>((s as { scores?: unknown }).scores, (id) => !!SCORE_MAP[id], []))];
  const repertoire = keep<string>(s.repertoire, (id) => songs.includes(id), [songs[0]]).slice(0, 3);
  if (repertoire.length === 0) repertoire.push(songs[0]);

  const items: Record<string, number> = {};
  Object.entries(s.items ?? {}).forEach(([id, n]) => {
    if (ITEM_MAP[id] && typeof n === 'number' && n > 0) items[id] = Math.floor(n);
  });

  const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  /* Proficiency arrived in save v6. A save from before it simply has no
     craft yet, which is the correct answer rather than an error. Values
     for instruments that no longer exist are dropped, and the category
     bonus table is rebuilt from the surviving values so the two can never
     drift apart (a hand-edited save used to be able to grant itself a
     permanent bonus with no practice behind it). */
  const prof: Record<string, number> = {};
  Object.entries((s.prof ?? {}) as Record<string, unknown>).forEach(([id, v]) => {
    if (!INSTRUMENT_MAP[id]) return;
    const n = num(v);
    if (n > 0) prof[id] = Math.min(PROFICIENCY_VALUES.max, n);
  });
  const derived = recomputeBonus(prof);
  const profBonus: Partial<Record<InstrumentCategoryId, number>> = { ...derived };
  Object.entries((s.profBonus ?? {}) as Record<string, unknown>).forEach(([cat, v]) => {
    if (!CATEGORY_SPEC_MAP[cat]) return;
    const n = num(v);
    /* keep a stored bonus only when it exceeds what practice explains —
       that headroom is where a future one-off gift would live */
    const id = cat as InstrumentCategoryId;
    profBonus[id] = Math.min(
      PROFICIENCY_VALUES.categoryBonusCap,
      Math.max(derived[id] ?? 0, n > 0 ? n : 0),
    );
  });

  /* ---- fame arrived in save v7 ----
     Before it, reputation was one global number. A returning player is not
     a stranger, so that number is read as a travelled name and spread over
     the towns they had actually unlocked: the place they were last playing
     keeps the full weight of it, everywhere else gets a share. The result
     is a save that opens with words like 「小有名气」 in the harbour and
     「有点面熟」 up the valley, which is what the old number meant anyway.
     A save that already has the table keeps it, minus dead towns. */
  const renown = Math.max(0, num(s.renown));
  let fame: Record<string, number> = {};
  const rawFame = (s as { fame?: unknown }).fame;
  if (rawFame && typeof rawFame === 'object') {
    Object.entries(rawFame as Record<string, unknown>).forEach(([town, v]) => {
      if (!TOWN_MAP[town]) return;
      const n = num(v);
      if (n > 0) fame[town] = n;
    });
  }
  /* An empty table plus a travelled name means "not migrated yet". It has to
     be tested that way rather than by the absence of the key: load() merges
     a fresh state in first, so a pre-v7 save arrives here already carrying an
     empty `fame: {}`. The reverse case cannot happen — forgetFame floors
     every town at a share of the travelled name, so fame never empties while
     renown is positive. */
  if (Object.keys(fame).length === 0 && renown > 0) {
    const here = OVERLOOK_MAP[s.overlook]?.townId;
    const known = (Array.isArray(s.maps) ? (s.maps as string[]) : []).filter((t) => TOWN_MAP[t]);
    const towns = known.length ? known : here ? [here] : [];
    const seeded: Record<string, number> = {};
    towns.forEach((t) => {
      seeded[t] = renown * (t === here ? 1 : 0.42);
    });
    if (here && !seeded[here]) seeded[here] = renown;
    fame = seeded;
  }

  return {
    ...s,
    version: STATE_VERSION,
    coin: Math.max(0, num(s.coin)),
    insp: Math.max(0, num(s.insp)),
    renown,
    fame,
    fameAt: num((s as { fameAt?: unknown }).fameAt, Date.now()),
    leisure: Math.max(0, num(s.leisure)),
    fatigue: Math.max(0, num(s.fatigue)),
    overlook: OVERLOOK_MAP[s.overlook] && overlooks.includes(s.overlook) ? s.overlook : overlooks[0],
    instrument: instruments.includes(s.instrument) ? s.instrument : instruments[0],
    overlooks,
    instruments,
    songs,
    composed,
    scores,
    scoreAt: num((s as { scoreAt?: unknown }).scoreAt, 0),
    repertoire,
    items,
    prof,
    profBonus,
    /* the collect receipt is disposable: if it points at an instrument the
       player no longer owns, throwing it away is more honest than fixing it */
    pendingPractice:
      s.pendingPractice && INSTRUMENT_MAP[s.pendingPractice.instrument]
        ? {
            instrument: s.pendingPractice.instrument,
            from: num(s.pendingPractice.from),
            gained: Math.max(0, num(s.pendingPractice.gained)),
            milestones: Math.max(0, num(s.pendingPractice.milestones)),
            mastered: !!s.pendingPractice.mastered,
          }
        : null,
    upgrades: keep<string>(s.upgrades, (id) => !!UPGRADE_MAP[id], []),
    questsDone: keep<string>(s.questsDone, (id) => !!QUEST_MAP[id], []),
    questsActive: keep<string>(s.questsActive, (id) => !!QUEST_MAP[id], []),
    journal: Array.isArray(s.journal) ? s.journal.slice(0, 220) : [],
    lastTick: num(s.lastTick, Date.now()),
    lastCollect: num(s.lastCollect, Date.now()),
    createdAt: num(s.createdAt, Date.now()),
    story: sanitiseStory(s.story),
    /* Preferences arrived in save v5. A save from before that has none, and
       an unreadable one should degrade to the default rather than to NaN —
       a broken volume would silently mute the whole game. */
    volume: Math.max(0, Math.min(1, num(s.volume, 0.6))),
    profile: {
      name: typeof s.profile?.name === 'string' ? s.profile.name.slice(0, 24) : '',
      birthday: typeof s.profile?.birthday === 'string' ? s.profile.birthday.slice(0, 10) : '',
    },
    tipsSeen: s.tipsSeen && typeof s.tipsSeen === 'object' ? s.tipsSeen : {},
  };
}

/* The story slice arrived in save v4. Older saves simply have none, and a
   player mid-chapter should not be told to start over, so a missing slice
   is a fresh slice rather than an error. Affection and grudges for a
   character that no longer exists are dropped; everything else is clamped.
   Grudges arrived after affection did, so `enmity` is absent in most live
   saves — a missing map is a clean slate, which is the right default. */
function sanitiseStory(raw: unknown): GameState['story'] {
  const base = freshStory();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<GameState['story']>;
  const numMap = (m: unknown, keep?: (k: string) => boolean): Record<string, number> => {
    const out: Record<string, number> = {};
    if (m && typeof m === 'object') {
      Object.entries(m as Record<string, unknown>).forEach(([k, v]) => {
        if (typeof v === 'number' && Number.isFinite(v) && (!keep || keep(k))) out[k] = v;
      });
    }
    return out;
  };
  const queued = Array.isArray(s.queue)
    ? s.queue.filter((x) => typeof x === 'string' && !!SCENE_MAP[x]).slice(0, 12)
    : [];
  /* A scene that was still on screen when the app went away was already
     counted as seen and its trigger already spent. Rather than lose the
     beat — which for a main-line scene means losing a page of the story —
     put it back at the head of the queue, where the router plays it
     without asking the trigger again. */
  const interrupted = typeof s.playing === 'string' && SCENE_MAP[s.playing] ? s.playing : null;
  if (interrupted && !queued.includes(interrupted)) queued.unshift(interrupted);

  return {
    chapter: typeof s.chapter === 'number' && s.chapter >= 1 ? Math.floor(s.chapter) : 1,
    bond: numMap(s.bond, (k) => !!CHARACTER_MAP[k]),
    enmity: numMap(s.enmity, (k) => !!CHARACTER_MAP[k]),
    /* aging grudges needs a clock. An old save has none, so start it now
       rather than in 1970 — otherwise every grudge would decay on load. */
    enmityAt: typeof s.enmityAt === 'number' && s.enmityAt > 0 ? s.enmityAt : Date.now(),
    met: numMap(s.met, (k) => !!CHARACTER_MAP[k]),
    seen: numMap(s.seen),
    seenAt: numMap(s.seenAt),
    fired: numMap(s.fired),
    vars: numMap(s.vars),
    queue: queued,
    playing: null,
  };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as Partial<GameState> | null;
    if (!parsed || typeof parsed !== 'object') return freshState();
    const base = freshState(parsed.createdAt ?? Date.now());
    const merged = {
      ...base,
      ...parsed,
      pending: { ...base.pending, ...(parsed.pending ?? {}) },
      flags: { ...base.flags, ...(parsed.flags ?? {}) },
      performAt: { ...base.performAt, ...(parsed.performAt ?? {}) },
      nodeVisits: { ...base.nodeVisits, ...(parsed.nodeVisits ?? {}) },
      minigameWins: { ...base.minigameWins, ...(parsed.minigameWins ?? {}) },
      story: parsed.story ?? base.story,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      tipsSeen: { ...base.tipsSeen, ...(parsed.tipsSeen ?? {}) },
    } as GameState;
    return sanitise(merged);
  } catch {
    return freshState();
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const s = load();
    return advance(s, Date.now()).state;
  });
  const [now, setNow] = useState(() => Date.now());
  const [lastReport, setLastReport] = useState<CollectReport | null>(null);
  const saveTimer = useRef<number | null>(null);

  /* ----------------------------------------------------------
     Every action below has to answer the caller *now* ("did the
     purchase go through?", "what was in the coin box?"). A React
     updater cannot do that — it runs later, so anything written
     inside it is still undefined when the handler returns. So we
     keep an authoritative mirror of the state, compute the next
     state synchronously against it, and hand it to React after.
     Every mutation in this file must go through `commit`.
     ---------------------------------------------------------- */
  const ref = useRef(state);
  const commit = useCallback((fn: (s: GameState) => GameState): GameState => {
    const next = fn(ref.current);
    if (next !== ref.current) {
      ref.current = next;
      setState(next);
    }
    return ref.current;
  }, []);

  /* Actions defined above the story block still need to ask "did anything
     just happen?". A ref breaks that declaration-order cycle without
     shuffling the file into a less readable order. */
  const fireHookRef = useRef<(h: Hook, e?: { nodeId?: string; nodeKind?: NodeKind }) => boolean>(
    () => false,
  );

  /* Saved volume has to reach the synth once at startup; after that
     store.setVolume keeps the two in step. */
  useEffect(() => {
    setMasterVolume(ref.current.volume);
  }, []);

  /* --- persistence ---
     Writes are debounced, because a busy second can produce a dozen state
     changes and JSON.stringify of the whole save is not free. Two moments
     cannot afford to wait for the debounce, though: opening and ending a
     scene. Both write `story.playing`, which is how a scene survives the app
     being killed mid-dialogue, and "the app was killed" is exactly the case
     where the timer never fires. Those two call `saveNow`. */
  const saveNow = useCallback((s: GameState) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* quota — ignore */
    }
  }, []);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      } catch {
        /* quota — ignore */
      }
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state]);

  /* --- ticking --- */
  useEffect(() => {
    const fast = window.setInterval(() => setNow(Date.now()), 1000);
    const slow = window.setInterval(() => {
      commit((s) => advance(s, Date.now()).state);
    }, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        commit((s) => advance(s, Date.now()).state);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      window.clearInterval(fast);
      window.clearInterval(slow);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [commit]);

  const rates = useMemo(() => computeRates(state, now), [state, now]);

  const addJournal = useCallback(
    (e: Omit<JournalEntry, 'at'>) => {
      commit((s) => ({ ...s, journal: [{ ...e, at: Date.now() }, ...s.journal].slice(0, 220) }));
    },
    [commit],
  );

  /* --- collect / harvest --- */
  const collect = useCallback((): CollectReport => {
    const t = Date.now();
    const { state: s, result: acc } = advance(ref.current, t);
    const r = computeRates(s, t);
    const p = s.pending;
    const items = { ...s.items };
    let coin = p.coin;
    let insp = p.insp;
    let renown = p.renown;
    let leisure = p.leisure;
    const journal: JournalEntry[] = [];

    s.pendingEvents.forEach((pe) => {
      coin += pe.gain.coin;
      insp += pe.gain.insp;
      renown += pe.gain.renown;
      leisure += pe.gain.leisure;
      if (pe.item) items[pe.item] = (items[pe.item] ?? 0) + 1;
      const ev = EVENT_MAP[pe.eventId];
      if (ev) journal.push({ at: pe.at, kind: 'event', title: ev.title, body: ev.text, tone: ev.tone });
    });

    const hours = (t - s.lastCollect) / 3600000;
    /* The practice line is the second half of the loop the player is actually
       playing: an hour at the stall buys coins *and* craft. Read it from the
       session receipt (state.pendingPractice), not from this last accrual —
       offline hours are applied the moment the app loads, so by the time the
       player taps 收摊结账 the final tick is worth seconds. `acc.practice` is
       the fallback for a save that predates the receipt. */
    const receipt = s.pendingPractice;
    const pr = receipt
      ? {
          instrument: receipt.instrument,
          before: receipt.from,
          after: receipt.from + receipt.gained,
          gained: receipt.gained,
          milestones: receipt.milestones,
          mastered: receipt.mastered,
        }
      : acc.practice
        ? {
            instrument: acc.practice.instrument,
            before: acc.practice.before,
            after: acc.practice.after,
            gained: acc.practice.gained,
            milestones: acc.practice.milestones,
            mastered: acc.practice.after >= PROFICIENCY_VALUES.max,
          }
        : null;
    /* fame lands in the town you played in, and only a slice of it becomes
       travelled name — one writer for that rule, in systems/fame.ts */
    const fame = grantFame(s, renown);
    const report: CollectReport = {
      hours,
      coin,
      insp,
      renown,
      fameTown: fame.town,
      fameWord: fameLabel(fameOf(fame.state, fame.town)),
      fameUp: fame.crossed ? fameUpLine(fame.after) : '',
      leisure,
      events: s.pendingEvents,
      fatigued: s.fatigue >= r.staminaCap,
      practice: pr
        ? {
            instrument: pr.instrument,
            name: INSTRUMENT_MAP[pr.instrument]?.name ?? pr.instrument,
            from: pr.before,
            to: pr.after,
            gained: pr.gained,
            milestones: pr.milestones,
            mastered: pr.mastered,
          }
        : undefined,
    };

    const ov = OVERLOOK_MAP[s.overlook];
    /* a town changing its word for you is worth writing down; the number
       behind it never is */
    if (fame.crossed) {
      const j = fameJournal(fame.town, fame.after);
      journal.push({ at: t, kind: 'story', title: j.title, body: j.body });
    }
    journal.push({
      at: t,
      kind: 'collect',
      title: `在${ov?.name ?? '路上'}收摊`,
      body: `演奏了 ${hours < 1 ? Math.round(hours * 60) + ' 分钟' : hours.toFixed(1) + ' 小时'}，进账 ${Math.floor(coin).toLocaleString('en-US')} 枚。`,
    });

    commit(() => ({
      ...fame.state,
      coin: s.coin + coin,
      insp: s.insp + insp,
      leisure: Math.min(r.leisureCap, s.leisure + leisure),
      totalCoin: s.totalCoin + Math.max(0, coin),
      totalInsp: s.totalInsp + Math.max(0, insp),
      collects: s.collects + 1,
      performAt: { ...s.performAt, [s.overlook]: (s.performAt[s.overlook] ?? 0) + 1 },
      pending: { coin: 0, insp: 0, renown: 0, leisure: 0 },
      pendingPractice: null,
      pendingEvents: [],
      items,
      fatigue: 0,
      lastCollect: t,
      lastTick: t,
      journal: [...journal.sort((a, b) => b.at - a.at), ...s.journal].slice(0, 220),
    }));
    setLastReport(report);
    return report;
  }, [commit]);

  const clearReport = useCallback(() => setLastReport(null), []);

  /* --- decisions --- */
  const resolveDecision = useCallback(
    (eventId: string, choiceIdx: number): string => {
      const s = ref.current;
      const dec = s.decisions.find((d) => d.eventId === eventId);
      const ev = EVENT_MAP[eventId];
      if (!dec || !ev || !ev.choices) return '';
      const c = ev.choices[choiceIdx];
      if (!c) return '';
      const boost = s.upgrades.includes('up_journal') ? 1.35 : 1;
      const coin = (c.gain?.coin ?? 0) * dec.coinPerHour * boost - (c.cost?.coin ?? 0) * dec.coinPerHour;
      const insp = (c.gain?.insp ?? 0) * dec.inspPerHour * boost - (c.cost?.insp ?? 0) * dec.inspPerHour;
      const renown = (c.gain?.renown ?? 0) * boost - (c.cost?.renown ?? 0);
      const leisure = (c.gain?.leisure ?? 0) - (c.cost?.leisure ?? 0);

      const items = { ...s.items };
      if (c.item) items[c.item] = (items[c.item] ?? 0) + 1;
      const songs = c.song && !s.songs.includes(c.song) ? [...s.songs, c.song] : s.songs;
      const instruments =
        c.instrument && !s.instruments.includes(c.instrument)
          ? [...s.instruments, c.instrument]
          : s.instruments;
      const flags = { ...s.flags };
      if (c.flag) flags[c.flag] = true;
      if (ev.flag) flags[ev.flag] = true;

      commit(() => ({
        ...grantFame(s, renown).state,
        coin: Math.max(0, s.coin + coin),
        insp: Math.max(0, s.insp + insp),
        leisure: Math.max(0, s.leisure + leisure),
        totalCoin: s.totalCoin + Math.max(0, coin),
        totalInsp: s.totalInsp + Math.max(0, insp),
        items,
        songs,
        instruments,
        flags,
        decisions: s.decisions.filter((d) => d.eventId !== eventId),
        journal: [
          {
            at: Date.now(),
            kind: 'event' as const,
            title: ev.title,
            body: `${ev.text}\n\n〔你的选择：${c.label}〕\n${c.outcome}`,
            tone: ev.tone,
          },
          ...s.journal,
        ].slice(0, 220),
      }));
      return c.outcome;
    },
    [commit],
  );

  /* --- strategy --- */
  const setStrategy = useCallback(
    (patch: Partial<Pick<GameState, 'overlook' | 'instrument' | 'stance' | 'repertoire'>>) => {
      commit((prev) => {
        const { state: s } = advance(prev, Date.now());
        const next = { ...s, ...patch };
        if (patch.overlook && patch.overlook !== s.overlook) {
          const ov = OVERLOOK_MAP[patch.overlook];
          next.journal = [
            {
              at: Date.now(),
              kind: 'travel' as const,
              title: `启程前往${ov?.name ?? ''}`,
              body: ov?.blurb ?? '',
            },
            ...s.journal,
          ].slice(0, 220);
          next.fatigue = Math.max(0, s.fatigue - 1.5);
        }
        return next;
      });
      if (patch.overlook) fireHookRef.current('arrive');
    },
    [commit],
  );

  /* --- exploration --- */
  const visitNode = useCallback(
    (nodeId: string) => {
      const prev = ref.current;
      const miss = { ok: false, loot: [] as string[], minigame: undefined as string | undefined };
      const entry = NODE_MAP[nodeId];
      if (!entry) return { ...miss, msg: '那地方不在图上。' };
      const n = entry.node;
      const rec = prev.nodeVisits[nodeId];
      if (rec && !n.repeatable) return { ...miss, msg: '这里你已经来过了。' };
      if (rec && n.cooldown && Date.now() - rec.last < n.cooldown * 60000) {
        const left = Math.ceil((n.cooldown * 60000 - (Date.now() - rec.last)) / 60000);
        return { ...miss, msg: `再等 ${left} 分钟。` };
      }
      if (prev.leisure < n.cost) {
        return { ...miss, msg: `闲暇不够（需要 ${n.cost}）。回去演奏一会儿。` };
      }

      const r = computeRates(prev, Date.now());
      const loot: string[] = [];
      const items = { ...prev.items };
      (n.loot ?? []).forEach((id) => {
        if (Math.random() < 0.82 || !prev.items[id]) {
          items[id] = (items[id] ?? 0) + 1;
          loot.push(id);
        }
      });
      const coin = (n.gain?.coin ?? 0) * r.coin;
      const insp = (n.gain?.insp ?? 0) * r.insp;
      const renown = n.gain?.renown ?? 0;

      /* ---- an ancestral leaf may be sitting in this room ----
         Every region holds one of the nine volumes, so a scribe's chest in
         the valley mostly gives up valley pages; occasionally something has
         been carried a long way. The roll, the pick and the cooldown all
         live in systems/scores.ts — here we only spend the result. */
      const found =
        Math.random() < findChance(n.kind, prev)
          ? pickLeaf(prev, entry.townId, Math.random(), Math.random())
          : null;
      const find = found ? findScore(prev, found.id) : null;
      const leaf = find?.leaf ?? null;
      const wholeVol = find?.completed ?? null;
      const volSong = find?.song ? songById(find.state, find.song)?.name ?? '' : '';
      const base = find?.state ?? prev;

      commit(() => ({
        /* a good turn done in a town is known in that town */
        ...grantFame(base, renown, entry.townId).state,
        leisure: prev.leisure - n.cost,
        coin: prev.coin + coin,
        insp: prev.insp + insp,
        totalCoin: prev.totalCoin + coin,
        totalInsp: prev.totalInsp + insp,
        items,
        nodeVisits: {
          ...prev.nodeVisits,
          [nodeId]: { count: (rec?.count ?? 0) + 1, last: Date.now() },
        },
        scores: base.scores,
        scoreAt: base.scoreAt,
        songs: base.songs,
        /* every trip is written down — the satchel used to silently drop
           tavern and shrine visits, which made the log look broken */
        journal: [
          {
            at: Date.now(),
            kind: 'explore' as const,
            title: `${TOWN_MAP[entry.townId]?.name ?? ''} · ${n.name}`,
            body:
              n.desc +
              (loot.length ? `\n\n捡到：${loot.map((l) => ITEM_MAP[l]?.name ?? l).join('、')}` : '') +
              (coin >= 1 || insp >= 1 || renown > 0
                ? `\n\n${[
                    coin >= 1 ? `${Math.round(coin)} 枚` : '',
                    insp >= 1 ? `${Math.round(insp)} 灵感` : '',
                    renown > 0 ? FAME_TEXT.label : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}`
                : ''),
          },
          /* a recovered page gets its own entry: this is the main line, and
             it should never be a footnote inside an errand's receipt */
          ...(leaf
            ? [
                {
                  at: Date.now(),
                  kind: 'story' as const,
                  ...leafJournal(leaf, TOWN_MAP[entry.townId]?.name ?? ''),
                },
              ]
            : []),
          ...(wholeVol
            ? [
                {
                  at: Date.now(),
                  kind: 'story' as const,
                  ...volumeJournal(wholeVol, volSong),
                },
              ]
            : []),
          ...prev.journal,
        ].slice(0, 220),
      }));

      /* a visit is the most common place for a scene to happen — the
         router gets the node id and kind so a trigger can be as narrow
         as "only in the Broken Oar" or as broad as "any gambling den" */
      const story = fireHookRef.current('node', { nodeId, nodeKind: n.kind });

      return {
        ok: true,
        msg: n.desc,
        loot,
        minigame: n.minigame,
        coin,
        insp,
        renown,
        story,
        score: leaf ? { name: leaf.name, vol: VOLUME_MAP[leaf.vol]?.name ?? '' } : null,
        volume: wholeVol ? { name: wholeVol.name, song: volSong } : null,
      };
    },
    [commit],
  );

  /* --- shop --- */
  const buy = useCallback(
    (id: string) => {
      const s = ref.current;
      const kind = id.startsWith('song_')
        ? 'song'
        : id.startsWith('up_')
          ? 'upgrade'
          : id.startsWith('it_')
            ? 'item'
            : 'instrument';
      let price = 0;
      let name = '';
      if (kind === 'song') {
        const x = SONG_MAP[id];
        if (!x) return { ok: false, msg: '货架上没有这个。' };
        if (s.songs.includes(id)) return { ok: false, msg: '这首你已经会了。' };
        price = x.price;
        name = x.name;
      } else if (kind === 'upgrade') {
        const x = UPGRADE_MAP[id];
        if (!x) return { ok: false, msg: '货架上没有这个。' };
        if (s.upgrades.includes(id)) return { ok: false, msg: '已经有了。' };
        price = x.price;
        name = x.name;
      } else if (kind === 'item') {
        const x = ITEM_MAP[id];
        if (!x) return { ok: false, msg: '货架上没有这个。' };
        price = Math.round(x.value * 1.4);
        name = x.name;
      } else {
        const x = INSTRUMENT_MAP[id];
        if (!x) return { ok: false, msg: '货架上没有这个。' };
        if (s.instruments.includes(id)) return { ok: false, msg: '已经有了。' };
        price = x.price;
        name = x.name;
      }
      if (s.coin < price) return { ok: false, msg: `钱不够，还差 ${Math.ceil(price - s.coin).toLocaleString('en-US')} 枚。` };

      commit(() => {
        const next: GameState = { ...s, coin: s.coin - price };
        if (kind === 'song') next.songs = [...s.songs, id];
        if (kind === 'upgrade') next.upgrades = [...s.upgrades, id];
        if (kind === 'instrument') next.instruments = [...s.instruments, id];
        if (kind === 'item') next.items = { ...s.items, [id]: (s.items[id] ?? 0) + 1 };
        next.journal = [
          { at: Date.now(), kind: 'buy' as const, title: `买下 ${name}`, body: `花了 ${price.toLocaleString('en-US')} 枚。` },
          ...s.journal,
        ].slice(0, 220);
        return next;
      });
      return { ok: true, msg: `买下了${name}。` };
    },
    [commit],
  );

  const sell = useCallback(
    (id: string) => {
      const s = ref.current;
      const it = ITEM_MAP[id];
      if (!it || !(s.items[id] > 0)) return { ok: false, msg: '行囊里没有这个。' };
      if (it.value <= 0) return { ok: false, msg: '这个你卖不掉。' };
      const gain = Math.round(it.value * (1 + Math.min(1.2, s.renown / 400)));
      commit(() => {
        const items = { ...s.items, [id]: s.items[id] - 1 };
        if (items[id] <= 0) delete items[id];
        return { ...s, items, coin: s.coin + gain, totalCoin: s.totalCoin + gain };
      });
      return { ok: true, msg: `卖了 ${it.name}，得 ${gain.toLocaleString('en-US')} 枚。` };
    },
    [commit],
  );

  const winMinigame = useCallback(
    (kind: string, coinDelta: number, note: string) => {
      commit((s) => ({
        ...s,
        coin: Math.max(0, s.coin + coinDelta),
        totalCoin: s.totalCoin + Math.max(0, coinDelta),
        minigameWins:
          coinDelta > 0
            ? { ...s.minigameWins, [kind]: (s.minigameWins[kind] ?? 0) + 1 }
            : s.minigameWins,
        journal: [
          {
            at: Date.now(),
            kind: 'minigame' as const,
            title: kind === 'dice' ? '骰局' : kind === 'cards' ? '牌局' : '听力试炼',
            body: note,
          },
          ...s.journal,
        ].slice(0, 220),
      }));
    },
    [commit],
  );

  const spendLeisure = useCallback(
    (n: number) => {
      if (ref.current.leisure < n) return false;
      commit((s) => ({ ...s, leisure: s.leisure - n }));
      return true;
    },
    [commit],
  );

  /* --- writing your own songs ---
     Inspiration's real sink. The rules (cost, quality, the multiplier
     budget, the title bank) all live in systems/compose.ts; the store only
     commits the result and writes it down. */
  const composeSong = useCallback(
    (opts: ComposeOpts) => {
      const r = compose(ref.current, opts);
      if (!r) return null;
      commit(() => ({
        ...r.state,
        journal: [
          {
            at: Date.now(),
            kind: 'story' as const,
            title: `谱成 ${r.song.name}`,
            body: `${r.song.desc}\n这一首没人教过你，也没人有第二份。`,
          },
          ...r.state.journal,
        ].slice(0, 220),
      }));
      return r.song;
    },
    [commit],
  );

  const claimQuest = useCallback(
    (id: string) => {
      const s = ref.current;
      const quest = QUEST_MAP[id];
      if (!quest || s.questsDone.includes(id)) return null;
      if (!questReady(s, quest)) return null;

      commit(() => {
        const r = quest.reward;
        /* a chapter can hand back one of the eighty-one. That has to happen
           before the rest of the reward is folded in, because completing a
           volume unlocks a song and the song list is written below. */
        const find = r.score ? findScore(s, r.score) : null;
        const withScore = find?.state ?? s;
        const next: GameState = {
          /* the errand was done somewhere: the credit is local, and only a
             slice of it travels (systems/fame.ts) */
          ...grantFame(withScore, r.renown ?? 0).state,
          coin: s.coin + (r.coin ?? 0),
          insp: s.insp + (r.insp ?? 0),
          totalCoin: s.totalCoin + (r.coin ?? 0),
          questsDone: [...s.questsDone, id],
          questsActive: s.questsActive.filter((x) => x !== id),
        };
        if (r.overlook && !next.overlooks.includes(r.overlook)) {
          next.overlooks = [...next.overlooks, r.overlook];
          const ov = OVERLOOK_MAP[r.overlook];
          if (ov && !next.maps.includes(ov.townId)) next.maps = [...next.maps, ov.townId];
        }
        if (r.map && !next.maps.includes(r.map)) next.maps = [...next.maps, r.map];
        if (r.instrument && !next.instruments.includes(r.instrument))
          next.instruments = [...next.instruments, r.instrument];
        if (r.song && !next.songs.includes(r.song)) next.songs = [...next.songs, r.song];
        if (r.upgrade && !next.upgrades.includes(r.upgrade)) next.upgrades = [...next.upgrades, r.upgrade];
        if (r.item) next.items = { ...next.items, [r.item]: (next.items[r.item] ?? 0) + 1 };
        next.journal = [
          { at: Date.now(), kind: 'quest' as const, title: `${quest.title} · 完成`, body: quest.closing },
          ...(find?.leaf
            ? [
                {
                  at: Date.now(),
                  kind: 'story' as const,
                  ...leafJournal(find.leaf, TOWN_MAP[OVERLOOK_MAP[s.overlook]?.townId ?? '']?.name ?? ''),
                },
              ]
            : []),
          ...(find?.completed
            ? [
                {
                  at: Date.now(),
                  kind: 'story' as const,
                  ...volumeJournal(
                    find.completed,
                    find.song ? songById(find.state, find.song)?.name ?? '' : '',
                  ),
                },
              ]
            : []),
          ...s.journal,
        ].slice(0, 220);
        return next;
      });
      fireHookRef.current('quest');
      return quest;
    },
    [commit],
  );

  /* ==========================================================
     Story sessions

     `fireHook` is the single entry point. Everything else in the app
     just says "something happened, is there a scene for that?" and
     the router decides. Bookkeeping (fired / seen / queue) is written
     BEFORE the scene starts so a scene's own effects land on top of
     an already-updated save.
     ========================================================== */

  const [session, setSession] = useState<StorySession | null>(null);

  const hookCtx = useCallback(
    (hook: Hook, extra?: { nodeId?: string; nodeKind?: NodeKind }): HookCtx => ({
      now: Date.now(),
      hook,
      nodeId: extra?.nodeId,
      nodeKind: extra?.nodeKind,
    }),
    [],
  );

  const openScene = useCallback(
    (sceneId: string, triggerId: string | null, ctx: HookCtx): boolean => {
      const now = ctx.now;
      /* bookkeeping first */
      commit((s) => ({
        ...s,
        story: {
          ...s.story,
          fired: triggerId ? { ...s.story.fired, [triggerId]: now } : s.story.fired,
          seen: { ...s.story.seen, [sceneId]: (s.story.seen[sceneId] ?? 0) + 1 },
          seenAt: { ...s.story.seenAt, [sceneId]: now },
          queue: s.story.queue.filter((q) => q !== sceneId),
          playing: sceneId,
        },
      }));

      const adv = startScene(sceneId, ref.current, ctx);
      if (!adv) return false;
      saveNow(commit(() => adv.state));
      const scene = SCENE_MAP[sceneId];
      setSession({
        sceneId,
        title: scene?.title ?? '',
        line: scene?.line ?? 'ambient',
        runner: adv.rt,
        out: adv.out,
        notes: adv.notes,
        /* the closing card lists what you carry away. Warmth is not
           carried away — it already had the screen to itself. */
        earned: adv.notes.filter((n) => n.kind !== 'feel'),
        history: adv.out.t === 'say' ? [{ who: adv.out.who, text: adv.out.text }] : [],
      });
      return true;
    },
    [commit, saveNow],
  );

  const fireHook = useCallback(
    (hook: Hook, extra?: { nodeId?: string; nodeKind?: NodeKind }): boolean => {
      if (session) return false; // never stack scenes
      const ctx = hookCtx(hook, extra);
      const pick = pickScene(ref.current, ctx);
      if (!pick) return false;
      return openScene(pick.sceneId, pick.triggerId, ctx);
    },
    [session, hookCtx, openScene],
  );

  const storyAdvance = useCallback(() => {
    setSession((cur) => {
      if (!cur) return cur;
      if (cur.out.t === 'end') return cur; // the closing card handles itself
      const ctx = hookCtx('open');
      const adv = sceneRun(cur.runner, ref.current, ctx);
      commit(() => adv.state);
      return {
        ...cur,
        runner: adv.rt,
        out: adv.out,
        notes: adv.notes,
        earned: mergeNotes([...cur.earned, ...adv.notes.filter((n) => n.kind !== 'feel')]),
        history:
          adv.out.t === 'say'
            ? [...cur.history, { who: adv.out.who, text: adv.out.text }].slice(-40)
            : cur.history,
      };
    });
  }, [commit, hookCtx]);

  const storyChoose = useCallback(
    (index: number) => {
      setSession((cur) => {
        if (!cur || cur.out.t !== 'choose') return cur;
        const picked = cur.out.options.find((o) => o.index === index);
        if (!picked || !picked.enabled) return cur;
        const ctx = hookCtx('open');
        const adv = sceneChoose(cur.runner, ref.current, ctx, index);
        commit(() => adv.state);
        return {
          ...cur,
          runner: adv.rt,
          out: adv.out,
          notes: adv.notes,
          earned: mergeNotes([...cur.earned, ...adv.notes.filter((n) => n.kind !== 'feel')]),
          history: [
            ...cur.history,
            { who: '__you', text: picked.label },
            ...(adv.out.t === 'say' ? [{ who: adv.out.who, text: adv.out.text }] : []),
          ].slice(-40),
        };
      });
    },
    [commit, hookCtx],
  );

  const storyClose = useCallback(() => {
    const justClosed = session?.sceneId;
    setSession(null);
    /* the scene ran its course: nothing to recover on next boot */
    saveNow(commit((s) => (s.story.playing ? { ...s, story: { ...s.story, playing: null } } : s)));
    /* a scene that promised "we'll talk later" queued the follow-up;
       play it right away rather than making the player go find it */
    const next = ref.current.story.queue.find((q) => q !== justClosed && SCENE_MAP[q]);
    if (next) {
      const ctx = hookCtx('open');
      window.setTimeout(() => openScene(next, null, ctx), 260);
    }
  }, [session, hookCtx, openScene, commit, saveNow]);

  fireHookRef.current = fireHook;

  const bondOf = useCallback((who: string) => state.story.bond[who] ?? 0, [state.story.bond]);

  const markIntroSeen = useCallback(() => commit((s) => ({ ...s, seenIntro: true })), [commit]);
  const replayIntro = useCallback(() => commit((s) => ({ ...s, seenIntro: false })), [commit]);

  const toggleMotion = useCallback(
    () => commit((s) => ({ ...s, reduceMotion: !s.reduceMotion })),
    [commit],
  );

  /* Volume lives in the save, but the synth reads a module-level number so a
     tone can fire from anywhere without threading state through. Keep the two
     in step here — this is the only place that writes it. */
  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setMasterVolume(clamped);
      commit((s) => ({ ...s, volume: clamped }));
    },
    [commit],
  );

  const setProfile = useCallback(
    (patch: Partial<GameState['profile']>) =>
      commit((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    [commit],
  );

  const markTipSeen = useCallback(
    (id: string) => commit((s) => ({ ...s, tipsSeen: { ...s.tipsSeen, [id]: true } })),
    [commit],
  );
  const hardReset = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    const s = freshState();
    ref.current = s;
    setState(s);
    setLastReport(null);
    setSession(null);
  }, []);

  /* ----------------------------------------------------------
     Debug bridge

     Story bugs are almost always "why didn't that fire" bugs, and the
     only honest answer lives inside the trigger table at a specific
     moment. This exposes the router's own reasoning to the console (and
     to the smoke test) instead of forcing anyone to guess.

       __lyre.why('collect')      -> every trigger + why it is/isn't eligible
       __lyre.roll('collect', 500) -> what actually fires over 500 tries
       __lyre.play('m1_ledger')   -> force a scene open
     ---------------------------------------------------------- */
  useEffect(() => {
    const w = window as unknown as { __lyre?: unknown };
    w.__lyre = {
      state: () => ref.current,
      /** current save schema version — tests assert migration without
          hard-coding a number that changes every time we add a field */
      version: STATE_VERSION,
      bond: (who: string) => ref.current.story.bond[who] ?? 0,
      /** both hidden axes for one person, plus the words they map to. The
          UI is not allowed to print these; a test has to be able to read
          them, or "the number never shows" is unprovable. */
      feel: (who: string) => {
        const s = ref.current;
        const ch = CHARACTER_MAP[who];
        const bond = s.story.bond[who] ?? 0;
        const hate = enmityOf(s.story, who);
        return {
          who,
          bond,
          tier: ch ? tierIndex(ch, bond) : 0,
          tierLabel: ch ? tierLabel(ch, bond) : '',
          enmity: hate,
          grudge: ch ? enmityIndex(ch, hate) : 0,
          grudgeLabel: ch && hate > 0 ? enmityLabel(ch, hate) : '',
        };
      },
      /** the rate breakdown, so the local cost of a grudge is measurable */
      rates: () => {
        const r = computeRates(ref.current, Date.now());
        return { coin: r.coin, renown: r.renown, parts: r.parts };
      },
      /** fame, the third hidden value. Local, and the screen may only ever
          show the word — so a test needs the number from somewhere. */
      fame: (town?: string) => {
        const s = ref.current;
        const id = town ?? currentTown(s);
        return {
          town: id,
          raw: fameOf(s, id),
          tier: fameTier(s, id),
          word: fameLabel(fameOf(s, id)),
          progress: fameProgress(s, id),
          /** the travelled name behind it — global, and also never printed */
          travelled: s.renown,
          all: Object.fromEntries(
            Object.keys(s.fame ?? {}).map((t) => [t, fameTier(s, t)]),
          ),
        };
      },
      /** the recovery of the eighty-one, as numbers a test can read */
      lib: () => {
        const s = ref.current;
        return {
          found: scoresFound(s),
          total: SCORE_TOTAL,
          volumes: volumesDone(s),
          active: activeVolume(s).id,
          activeFound: volumeFound(s, activeVolume(s).id),
          composed: (s.composed ?? []).map((c) => c.id),
        };
      },
      why: (hook: Hook = 'collect', extra?: { nodeId?: string; nodeKind?: NodeKind }) =>
        probeTriggers(ref.current, hookCtx(hook, extra)).map((p) => ({
          id: p.trigger.id,
          scene: p.trigger.scene,
          line: p.trigger.line,
          chance: p.trigger.chance,
          eligible: p.eligible,
          reason: p.reason,
        })),
      /** frequency of each outcome over n independent rolls — probability wiring, measured */
      roll: (hook: Hook = 'collect', n = 200) => {
        const tally: Record<string, number> = { __none: 0 };
        for (let i = 0; i < n; i++) {
          const pick = pickScene(ref.current, hookCtx(hook));
          const k = pick ? pick.sceneId : '__none';
          tally[k] = (tally[k] ?? 0) + 1;
        }
        return tally;
      },
      play: (sceneId: string) => openScene(sceneId, null, hookCtx('open')),
      fire: (hook: Hook = 'collect') => fireHook(hook),
      close: () => storyClose(),
      /** the proficiency triangle for one instrument: what you practised,
          what the technique carries, what your hands actually manage */
      prof: (id: string = ref.current.instrument) => {
        const s = ref.current;
        const cat = categoryOf(id);
        return {
          instrument: id,
          category: cat,
          own: ownProf(s, id),
          bonus: categoryBonus(s, cat),
          effective: effectiveProf(s, id),
          mastered: isMastered(s, id),
          pay: performancePay(s, id),
          practicePerHour: practicePerHour(s, id, { stance: s.stance }),
        };
      },
      /** the sky, so a test can assert the overlay matches the state */
      sky: () => skyState(Date.now(), ref.current.overlook),
      /** who is standing at the stall at a given moment — the crowd is
          computed from state + clock, so a test can sweep two days of
          time without waiting for them */
      guests: (at: number = Date.now()) =>
        guestsAt(ref.current, at).map((g) => ({ id: g.spec.id, art: g.spec.art })),
    };
  }, [hookCtx, openScene, fireHook, storyClose]);

  /* ----------------------------------------------------------
     GM seam

     Two functions, no validation beyond the sanitizer that every write
     goes through anyway. Deleting src/gm/ leaves these unused; deleting
     these two lines and their entries below removes the seam entirely.
     ---------------------------------------------------------- */
  const gmWrite = useCallback(
    (mut: (s: GameState) => GameState) => {
      commit(mut);
      /* the crowd is derived from state + clock and memoised — a forced
         change of renown or place must be visible immediately */
      forgetVisitorMemo();
    },
    [commit],
  );
  const gmPlay = useCallback(
    (sceneId: string) => {
      openScene(sceneId, null, hookCtx('open'));
    },
    [openScene, hookCtx],
  );

  const value: Ctx = {
    state,
    rates,
    now,
    collect,
    story: session,
    fireHook,
    storyAdvance,
    storyChoose,
    storyClose,
    bondOf,
    lastReport,
    clearReport,
    resolveDecision,
    setStrategy,
    visitNode,
    buy,
    sell,
    winMinigame,
    claimQuest,
    markIntroSeen,
    replayIntro,
    toggleMotion,
    setVolume,
    setProfile,
    markTipSeen,
    hardReset,
    addJournal,
    spendLeisure,
    composeSong,
    gmWrite,
    gmPlay,
  };

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame outside provider');
  return c;
}
