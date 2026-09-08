/* ============================================================
   World audit — the cross-reference checker

   `game/story/auditContent()` checks one scene's *shape*: bad labels,
   unknown speakers, a trigger pointing at a scene that is not there.
   This file checks the thing that actually rots as content grows: the
   references *between* tables. An item id that no longer exists, a flag
   that every condition waits for and nobody ever sets, a tier gate
   above the total affection the whole game can hand out — those are
   silent. Nothing throws. The scene simply never plays, and no one
   notices for three months.

   Two severities, on purpose:

     errors      — a real dead end. The smoke suite fails on these.
     advisories  — worth a look, but a judgement call: content written
                   ahead of its unlock, a flag kept for future use.

   Authoring tool only. Vite folds the DEV block away, and the window
   hook is what the smoke tests call against the shipped bundle.
   ============================================================ */

import {
  SCENES,
  SCENE_MAP,
  TRIGGERS,
  CHARACTERS,
  CHARACTER_MAP,
  auditContent,
  type Cond,
  type Effect,
  type Scene,
} from '../game/story';
import { ITEM_MAP } from './items';
import { SONG_MAP } from './songs';
import { INSTRUMENT_MAP } from './instruments';
import { UPGRADE_MAP } from './upgrades';
import { OVERLOOK_MAP } from './overlooks';
import { TOWN_MAP, TOWNS, NODE_MAP } from './towns';
import { QUESTS, QUEST_MAP } from './quests';
import { SCORE_MAP, SCORE_VALUES, VOLUME_MAP } from './scores';
import { EVENTS } from './events';
import { STANCE_MAP } from './stances';
import { WEATHER_SPECS, WEATHER_VALUES } from './weather';
import { enmityTiers } from './enmity/registry';
import { VISITOR_SPEC_MAP } from './visitors';
import { MEMORIES } from './story/memories';

/* the kinds actually laid out on the maps, and the minigames that exist */
const NODE_KINDS = new Set(TOWNS.flatMap((t) => t.nodes.map((n) => n.kind as string)));
const MINIGAMES = new Set(['dice', 'tune', 'cards']);

export interface WorldAudit {
  errors: string[];
  advisories: string[];
}

/* ------------------------------------------------------------
   Walking the tables

   Every Cond and every Effect authored anywhere, each tagged with
   where it came from so a failure names a file the author can open.
   ------------------------------------------------------------ */

interface Site<T> {
  at: string;
  v: T;
}

interface Tables {
  conds: Site<Cond>[];
  effects: Site<Effect>[];
  flagWrites: Set<string>;
  flagReads: Set<string>;
  varWrites: Set<string>;
  varReads: Set<string>;
}

let cache: Tables | null = null;

/* Walked once, on the first audit call rather than at import time —
   boot should not pay for a tool the player never runs. */
function tables(): Tables {
  if (cache) return cache;

  const conds: Site<Cond>[] = [];
  const effects: Site<Effect>[] = [];

  const pushCond = (at: string, c?: Cond) => {
    if (!c) return;
    conds.push({ at, v: c });
    if (c.k === 'all' || c.k === 'any') c.of.forEach((sub, i) => pushCond(`${at}[${i}]`, sub));
    if (c.k === 'not') pushCond(`${at}!`, c.of);
  };
  const pushEffects = (at: string, list?: Effect[]) => {
    (list ?? []).forEach((e) => effects.push({ at, v: e }));
  };

  const collectScene = (s: Scene) => {
    s.steps.forEach((st, i) => {
      const at = `${s.id} step ${i}`;
      if ('if' in st) pushCond(at, st.if);
      if ('do' in st && st.do) pushEffects(at, st.do);
      if (st.t === 'choose') {
        st.options.forEach((o, k) => {
          const oat = `${s.id} step ${i} 选项 ${k}`;
          pushCond(oat, o.if);
          pushCond(`${oat} need`, o.need);
          pushEffects(oat, o.do);
          pushEffects(`${oat} miss`, o.miss?.do);
        });
      }
    });
  };

  SCENES.forEach(collectScene);
  TRIGGERS.forEach((t) => pushCond(`trigger ${t.id}`, t.when));

  /* Flags and vars — who writes, who reads. Writers live in two places
     (story effects, event resolutions), readers in four (conditions, map
     nodes, event gates, quest objectives). Read but never written is a
     locked door with no key cut for it. */
  const flagWrites = new Set<string>();
  const flagReads = new Set<string>();
  const varWrites = new Set<string>();
  const varReads = new Set<string>();

  effects.forEach(({ v }) => {
    if (v.k === 'flag') flagWrites.add(v.id);
    if (v.k === 'var') varWrites.add(v.id);
  });
  EVENTS.forEach((e) => {
    if (e.flag) flagWrites.add(e.flag);
    e.choices?.forEach((c) => c.flag && flagWrites.add(c.flag));
  });

  conds.forEach(({ v }) => {
    if (v.k === 'flag') flagReads.add(v.id);
    if (v.k === 'var') varReads.add(v.id);
  });
  EVENTS.forEach((e) => e.needFlag && flagReads.add(e.needFlag));
  TOWNS.forEach((t) => t.nodes.forEach((n) => n.needFlag && flagReads.add(n.needFlag)));
  QUESTS.forEach((q) =>
    q.objectives.forEach((o) => {
      if (o.kind === 'flag' && o.ref) flagReads.add(o.ref);
    }),
  );

  cache = { conds, effects, flagWrites, flagReads, varWrites, varReads };
  return cache;
}

/* ------------------------------------------------------------
   How much affection / grudge the whole game can possibly hand out

   A coarse upper bound: every positive grant anywhere, ignoring
   whether the player could ever reach them all. If a gate asks for
   more than that, it is unreachable no matter how the run goes —
   which is a content bug, not a difficulty choice.
   ------------------------------------------------------------ */

function totalGrant(kind: 'bond' | 'enmity', who: string): number {
  return tables().effects.reduce(
    (sum, { v }) => (v.k === kind && v.who === who && v.n > 0 ? sum + v.n : sum),
    0,
  );
}

function bondCeiling(who: string, tier: number): number | null {
  const ch = CHARACTER_MAP[who];
  if (!ch) return null;
  return ch.tiers[tier]?.at ?? null;
}

function enmityCeiling(who: string, tier: number): number | null {
  const ch = CHARACTER_MAP[who];
  if (!ch) return null;
  return enmityTiers(ch)[tier]?.at ?? null;
}

/* ------------------------------------------------------------
   The audit
   ------------------------------------------------------------ */

export function auditWorld(): WorldAudit {
  const { conds, effects, flagReads, flagWrites, varReads, varWrites } = tables();
  const errors: string[] = [...auditContent()];
  const advisories: string[] = [];

  const miss = (at: string, what: string, id: string) =>
    errors.push(`${at}: 引用了不存在的${what} "${id}"`);

  /* --- effects point at real content --- */
  effects.forEach(({ at, v }) => {
    switch (v.k) {
      case 'item':
        if (!ITEM_MAP[v.id]) miss(at, '物品', v.id);
        break;
      case 'song':
        if (!SONG_MAP[v.id]) miss(at, '曲子', v.id);
        break;
      case 'instrument':
        if (!INSTRUMENT_MAP[v.id]) miss(at, '乐器', v.id);
        break;
      case 'upgrade':
        if (!UPGRADE_MAP[v.id]) miss(at, '行装', v.id);
        break;
      case 'overlook':
        if (!OVERLOOK_MAP[v.id]) miss(at, '观景台', v.id);
        break;
      case 'map':
        if (!TOWN_MAP[v.id]) miss(at, '地图', v.id);
        break;
      case 'quest':
        if (!QUEST_MAP[v.id]) miss(at, '委托', v.id);
        break;
      case 'score':
        if (v.id && !SCORE_MAP[v.id]) miss(at, '古谱页', v.id);
        break;
      case 'queue':
        if (!SCENE_MAP[v.scene]) miss(at, '场景', v.scene);
        break;
      case 'bond':
      case 'enmity':
      case 'forgive':
      case 'meet':
        if (!CHARACTER_MAP[v.who]) miss(at, '人物', v.who);
        break;
    }
  });

  /* --- conditions point at real content, and can be met --- */
  conds.forEach(({ at, v }) => {
    switch (v.k) {
      case 'item':
        if (!ITEM_MAP[v.id]) miss(at, '物品', v.id);
        break;
      case 'song':
        if (!SONG_MAP[v.id]) miss(at, '曲子', v.id);
        break;
      case 'instrument':
        if (!INSTRUMENT_MAP[v.id]) miss(at, '乐器', v.id);
        break;
      case 'upgrade':
        if (!UPGRADE_MAP[v.id]) miss(at, '行装', v.id);
        break;
      case 'quest':
        if (!QUEST_MAP[v.id]) miss(at, '委托', v.id);
        break;
      case 'overlook':
        v.ids.forEach((id) => !OVERLOOK_MAP[id] && miss(at, '观景台', id));
        break;
      case 'town':
        v.ids.forEach((id) => !TOWN_MAP[id] && miss(at, '城镇', id));
        break;
      case 'fame':
        if (v.town && !TOWN_MAP[v.town]) miss(at, '城镇', v.town);
        break;
      case 'score':
        if (v.vol && !VOLUME_MAP[v.vol]) miss(at, '卷', v.vol);
        break;
      case 'seen':
      case 'sinceScene':
        if (!SCENE_MAP[v.scene]) miss(at, '场景', v.scene);
        break;
      case 'guest':
        if (v.id && !VISITOR_SPEC_MAP[v.id]) miss(at, '摊边客', v.id);
        break;
      case 'met':
      case 'sinceMet':
        if (!CHARACTER_MAP[v.who]) miss(at, '人物', v.who);
        break;
      case 'bond':
      case 'tier':
      case 'enmity':
      case 'grudge': {
        if (!CHARACTER_MAP[v.who]) {
          miss(at, '人物', v.who);
          break;
        }
        if (v.min === undefined) break;
        const axis = v.k === 'bond' || v.k === 'tier' ? 'bond' : 'enmity';
        const need =
          v.k === 'tier'
            ? bondCeiling(v.who, v.min)
            : v.k === 'grudge'
              ? enmityCeiling(v.who, v.min)
              : v.min;
        const pool = totalGrant(axis, v.who);
        if (need !== null && need > pool) {
          errors.push(
            `${at}: ${v.who} 的 ${v.k} ≥ ${v.min} 需要 ${need} 点，但全部内容加起来只给得出 ${pool} 点`,
          );
        }
        break;
      }
    }
  });

  /* --- flags & vars --- */
  [...flagReads].sort().forEach((id) => {
    if (!flagWrites.has(id)) errors.push(`flag "${id}" 有人在等，但没有任何内容会点亮它`);
  });
  [...varReads].sort().forEach((id) => {
    if (!varWrites.has(id)) errors.push(`var "${id}" 有人在读，但没有任何内容会写它`);
  });
  [...flagWrites].sort().forEach((id) => {
    if (flagReads.has(id)) return;
    if (!MEMORIES[id])
      advisories.push(`flag "${id}" 点亮了但没人读 — 要么写个回响，要么登记到 story/memories.ts`);
  });
  [...varWrites].sort().forEach((id) => {
    if (varReads.has(id)) return;
    if (!MEMORIES[id])
      advisories.push(`var "${id}" 写了但没人读 — 要么写个回响，要么登记到 story/memories.ts`);
  });
  Object.keys(MEMORIES).forEach((id) => {
    if (!flagWrites.has(id) && !varWrites.has(id))
      errors.push(`memories.ts 里的 "${id}" 已经没有任何内容会写它了`);
    else if (flagReads.has(id) || varReads.has(id))
      advisories.push(`memories.ts 里的 "${id}" 已经有人读了，这行可以删掉`);
  });

  /* --- quests --- */
  QUESTS.forEach((q) => {
    const at = `quest ${q.id}`;
    q.requires?.forEach((id) => !QUEST_MAP[id] && miss(at, '前置委托', id));
    if (q.atOverlook && !OVERLOOK_MAP[q.atOverlook]) miss(at, '观景台', q.atOverlook);
    const r = q.reward;
    if (r.score && !SCORE_MAP[r.score]) miss(at, '古谱页', r.score);
    if (r.overlook && !OVERLOOK_MAP[r.overlook]) miss(at, '观景台', r.overlook);
    if (r.instrument && !INSTRUMENT_MAP[r.instrument]) miss(at, '乐器', r.instrument);
    if (r.song && !SONG_MAP[r.song]) miss(at, '曲子', r.song);
    if (r.item && !ITEM_MAP[r.item]) miss(at, '物品', r.item);
    if (r.upgrade && !UPGRADE_MAP[r.upgrade]) miss(at, '行装', r.upgrade);
    if (r.map && !TOWN_MAP[r.map]) miss(at, '地图', r.map);
    q.objectives.forEach((o, i) => {
      const oat = `${at} 目标 ${i}`;
      const ref = o.ref ?? '';
      /* `*`-prefixed refs are the wildcard forms store.tsx understands:
         `*any`, `*towns:2`, `*vol`, `*trinket`, `*<nodeKind>`. A wildcard
         nobody implements reads as zero progress forever, so the shapes
         get checked here rather than trusted. */
      switch (o.kind) {
        case 'visitNode':
          if (ref.startsWith('*')) {
            if (!NODE_KINDS.has(ref.slice(1))) errors.push(`${oat}: 没有这种地点类型 "${ref}"`);
          } else if (!NODE_MAP[ref]) miss(oat, '地点', ref);
          break;
        case 'ownItem':
          if (ref.startsWith('*')) {
            if (ref !== '*trinket') errors.push(`${oat}: 物品只支持 *trinket 一种通配，写了 "${ref}"`);
          } else if (!ITEM_MAP[ref]) miss(oat, '物品', ref);
          break;
        case 'performAt':
          if (ref.startsWith('*')) {
            if (ref !== '*any') errors.push(`${oat}: 演奏只支持 *any 一种通配，写了 "${ref}"`);
          } else if (!OVERLOOK_MAP[ref]) miss(oat, '观景台', ref);
          break;
        case 'score':
          if (ref && ref !== '*vol' && !VOLUME_MAP[ref]) miss(oat, '卷', ref);
          break;
        case 'fame':
          if (ref.startsWith('*')) {
            if (ref !== '*any' && !ref.startsWith('*towns'))
              errors.push(`${oat}: 名气只支持 *any / *towns:档位，写了 "${ref}"`);
          } else if (ref && !TOWN_MAP[ref]) miss(oat, '城镇', ref);
          if (o.target < 0 || o.target > 4)
            errors.push(`${oat}: 名气档位只有 0..4，写了 ${o.target}`);
          break;
        case 'minigame':
          if (!MINIGAMES.has(ref)) errors.push(`${oat}: 没有这种小游戏 "${ref}"`);
          break;
      }
    });
  });

  /* --- towns & overlooks --- */
  TOWNS.forEach((t) =>
    t.nodes.forEach((n) => {
      const at = `node ${t.id}/${n.id}`;
      if (n.questId && !QUEST_MAP[n.questId]) miss(at, '委托', n.questId);
      n.loot?.forEach((id) => !ITEM_MAP[id] && miss(at, '掉落物品', id));
      n.shopStock?.forEach((id) => {
        /* items price themselves through `value`, everything else through
           `price`; either way 0 means "story reward, never on a shelf".
           On a shelf it would mean the shop gives it away. */
        const tag = ITEM_MAP[id]
          ? ITEM_MAP[id].value
          : (SONG_MAP[id] ?? INSTRUMENT_MAP[id] ?? UPGRADE_MAP[id])?.price;
        if (tag === undefined) {
          miss(at, '货品', id);
          return;
        }
        if (!(tag > 0)) errors.push(`${at} 上架了没有标价的 ${id}（会变成免费）`);
      });
    }),
  );
  Object.values(OVERLOOK_MAP).forEach((o) => {
    if (!TOWN_MAP[o.townId]) miss(`overlook ${o.id}`, '所属城镇', o.townId);
  });

  /* --- the eighty-one: find chances are tuned per node kind, and a kind
         that no map lays down is a knob wired to nothing --- */
  Object.keys(SCORE_VALUES.findByNode).forEach((kind) => {
    if (!NODE_KINDS.has(kind))
      errors.push(`findByNode 里的 "${kind}" 在任何地图上都没有这种地点`);
  });
  [...NODE_KINDS].sort().forEach((kind) => {
    if (!(kind in SCORE_VALUES.findByNode))
      advisories.push(`地点类型 "${kind}" 没有古谱出现概率（当 0 处理）`);
  });

  /* --- weather: anything filed under `wet` should notice the umbrella,
         otherwise the player buys it and feels nothing in half the rain --- */
  WEATHER_SPECS.filter((w) => w.groups.includes('wet')).forEach((w) => {
    const e = WEATHER_VALUES.effects[w.id];
    if (e && !e.ifUpgrade?.up_umbrella)
      advisories.push(`天气 ${w.id} 属于 wet，但 up_umbrella 对它没有任何作用`);
  });

  /* --- events --- */
  EVENTS.forEach((e) => {
    const at = `event ${e.id}`;
    if (e.item && !ITEM_MAP[e.item]) miss(at, '物品', e.item);
    e.choices?.forEach((c, i) => {
      const cat = `${at} 选项 ${i}`;
      if (c.item && !ITEM_MAP[c.item]) miss(cat, '物品', c.item);
      if (c.song && !SONG_MAP[c.song]) miss(cat, '曲子', c.song);
      if (c.instrument && !INSTRUMENT_MAP[c.instrument]) miss(cat, '乐器', c.instrument);
    });
  });

  /* --- characters --- */
  CHARACTERS.forEach((c) => {
    if (c.tiers[0]?.at !== 0) errors.push(`人物 ${c.id} 的 tiers[0].at 必须是 0`);
    c.tiers.forEach((t, i) => {
      if (i > 0 && t.at <= c.tiers[i - 1].at)
        errors.push(`人物 ${c.id} 的 tiers 不是递增的（第 ${i} 档）`);
    });
    if (c.home && !TOWN_MAP[c.home]) miss(`人物 ${c.id}`, '故乡', c.home);
  });

  /* --- stances are referenced by save data, keep the set honest --- */
  if (!STANCE_MAP.earnest) errors.push('缺少默认台风 earnest');

  /* --- scenes nobody can enter --- */
  const reachable = new Set<string>(TRIGGERS.map((t) => t.scene));
  effects.forEach(({ v }) => v.k === 'queue' && reachable.add(v.scene));
  SCENES.forEach((s) => {
    if (!reachable.has(s.id)) advisories.push(`场景 ${s.id} 没有任何触发器或 queue 指向它`);
  });

  /* --- content the player can never obtain --- */
  const obtainable = new Set<string>(['lute_worn', 'song_ferry']);
  effects.forEach(({ v }) => {
    if (v.k === 'item' || v.k === 'song' || v.k === 'instrument' || v.k === 'upgrade')
      obtainable.add(v.id);
  });
  EVENTS.forEach((e) => {
    if (e.item) obtainable.add(e.item);
    e.choices?.forEach((c) => {
      [c.item, c.song, c.instrument].forEach((id) => id && obtainable.add(id));
    });
  });
  TOWNS.forEach((t) =>
    t.nodes.forEach((n) => {
      n.loot?.forEach((id) => obtainable.add(id));
      n.shopStock?.forEach((id) => obtainable.add(id));
    }),
  );
  QUESTS.forEach((q) => {
    [q.reward.item, q.reward.song, q.reward.instrument, q.reward.upgrade].forEach(
      (id) => id && obtainable.add(id),
    );
  });
  /* finishing a volume of the eighty-one hands over its song — that grant
     lives in game/systems/scores.ts, not in a scene */
  Object.values(VOLUME_MAP).forEach((v) => v.song && obtainable.add(v.song));
  const orphan = (label: string, ids: string[]) =>
    ids.filter((id) => !obtainable.has(id)).forEach((id) => advisories.push(`${label} ${id} 无处可得`));
  orphan('物品', Object.keys(ITEM_MAP));
  orphan('曲子', Object.keys(SONG_MAP));
  orphan('乐器', Object.keys(INSTRUMENT_MAP));
  orphan('行装', Object.keys(UPGRADE_MAP));

  return { errors, advisories };
}

/* Authoring-time shout. Errors are loud, advisories are a quiet list. */
if (import.meta.env.DEV) {
  const { errors, advisories } = auditWorld();
  if (errors.length) console.warn('[world] 内容检查:\n' + errors.join('\n'));
  if (advisories.length) console.info('[world] 可以看一眼:\n' + advisories.join('\n'));
}

/* The smoke suite runs this against the production bundle — the only
   build that ships — and fails on `errors`. Advisories are readable
   from the same hook without failing anything. */
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __lyreAudit?: () => string[];
    __lyreWorld?: () => WorldAudit;
  };
  w.__lyreAudit = () => auditWorld().errors;
  w.__lyreWorld = auditWorld;
}
