import type { GameState } from '../game/engine';
import type { Hook } from '../game/story';
import { INSTRUMENTS, SONGS, UPGRADES } from '../content/gear';
import { fameOf, fameTier, grantFame } from '../game/systems/fame';
import { FAME_TIERS, FAME_TOP } from '../content/fame';
import { SCORES, leavesOf } from '../content/scores';
import { activeVolume, findScore, pickLeaf } from '../game/systems/scores';
import { ITEMS } from '../content/items';
import { OVERLOOKS, OVERLOOK_MAP } from '../content/overlooks';
import { TOWNS } from '../content/towns';
import { PROFICIENCY_VALUES } from '../content/proficiency/values';
import { recomputeBonus } from '../game/systems/proficiency';

/* ============================================================
   GM commands

   Every button in the panel is one of these. Kept apart from the panel
   itself so the list can grow without anybody having to read JSX, and
   so it is obvious at a glance what a test build can reach into.

   Rules for adding one:
     · go through `api.write`, never through a store method that also
       plays a sound or opens a sheet — GM edits should be silent
     · leave the save valid; the sanitizer runs on every write, but it
       will not invent a legal instrument for you
     · say what happened in `api.log`, because half of testing is
       remembering what you just did
   ============================================================ */

export interface GmApi {
  state: GameState;
  write: (mut: (s: GameState) => GameState) => void;
  play: (sceneId: string) => void;
  fire: (hook: Hook) => boolean;
  reset: () => void;
  log: (msg: string) => void;
}

export interface GmAction {
  id: string;
  label: string;
  /** takes the amount from the panel's shared number field */
  amount?: boolean;
  tone?: 'plain' | 'warn';
  run: (api: GmApi, n: number) => void;
}

export interface GmGroup {
  id: string;
  title: string;
  hint?: string;
  actions: GmAction[];
}

const H = 3600000;

/* ------------------------------------------------------------
   Shared mutators — also used by the panel's pickers
   ------------------------------------------------------------ */

export const setProf = (s: GameState, id: string, v: number): GameState => {
  const prof = { ...s.prof, [id]: Math.max(0, Math.min(PROFICIENCY_VALUES.max, v)) };
  return { ...s, prof, profBonus: recomputeBonus(prof) };
};

export const addBond = (s: GameState, who: string, n: number): GameState => ({
  ...s,
  story: {
    ...s.story,
    bond: { ...s.story.bond, [who]: Math.max(0, (s.story.bond[who] ?? 0) + n) },
    met: s.story.met[who] ? s.story.met : { ...s.story.met, [who]: Date.now() },
  },
});

/* Grudges are the second hidden axis. Written raw here, exactly like
   affection: to see the *presentation* (dim screen + one cold line) force
   a scene that carries an `enmity` effect — g_su_caught is the short one. */
export const addEnmity = (s: GameState, who: string, n: number): GameState => {
  const cur = s.story.enmity?.[who] ?? 0;
  const next = Math.max(0, cur + n);
  const enmity = { ...(s.story.enmity ?? {}) };
  if (next > 0) enmity[who] = next;
  else delete enmity[who];
  return {
    ...s,
    story: {
      ...s.story,
      enmity,
      met: s.story.met[who] ? s.story.met : { ...s.story.met, [who]: Date.now() },
    },
  };
};

export const clearEnmity = (s: GameState, who?: string): GameState => {
  if (!who) return { ...s, story: { ...s.story, enmity: {} } };
  const enmity = { ...(s.story.enmity ?? {}) };
  delete enmity[who];
  return { ...s, story: { ...s.story, enmity } };
};

/** age grudges by N days without waiting for them: see systems/enmity */
export const ageGrudges = (s: GameState, days: number): GameState => ({
  ...s,
  story: { ...s.story, enmityAt: (s.story.enmityAt ?? Date.now()) - days * 24 * H },
});

export const setChapter = (s: GameState, n: number): GameState => ({
  ...s,
  story: { ...s.story, chapter: Math.max(0, n) },
});

/** wind the clock back so the idle loop has hours to hand over */
export const skipHours = (s: GameState, h: number): GameState => ({
  ...s,
  lastTick: s.lastTick - h * H,
  lastCollect: s.lastCollect - h * H,
});

export const unlockAllPlaces = (s: GameState): GameState => ({
  ...s,
  overlooks: OVERLOOKS.map((o) => o.id),
  maps: TOWNS.map((t) => t.id),
});

export const unlockAllGear = (s: GameState): GameState => ({
  ...s,
  instruments: INSTRUMENTS.map((i) => i.id),
  songs: SONGS.map((x) => x.id),
  upgrades: UPGRADES.map((u) => u.id),
  items: Object.fromEntries(ITEMS.map((i) => [i.id, Math.max(1, s.items[i.id] ?? 0)])),
});

/* ------------------------------------------------------------
   The groups the panel renders
   ------------------------------------------------------------ */

export const GM_GROUPS: GmGroup[] = [
  {
    id: 'purse',
    title: '钱与资源',
    hint: '直接写进存档，不走收摊流程',
    actions: [
      {
        id: 'coin+',
        label: '铜板 +N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, coin: s.coin + n, totalCoin: s.totalCoin + Math.max(0, n) }));
          log(`铜板 +${n}`);
        },
      },
      {
        id: 'coin-',
        label: '铜板 −N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, coin: Math.max(0, s.coin - n) }));
          log(`铜板 −${n}`);
        },
      },
      {
        id: 'insp+',
        label: '灵感 +N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, insp: s.insp + n, totalInsp: s.totalInsp + Math.max(0, n) }));
          log(`灵感 +${n}`);
        },
      },
      {
        /* fame is local now: this pays into the town you are standing in,
           and lets a slice of it travel, exactly like play does */
        id: 'fame+',
        label: '此地名气 +N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => grantFame(s, n).state);
          log(`此地名气 +${n}`);
        },
      },
      {
        id: 'fameTier+',
        label: '此地名气升一档',
        run: ({ write, log, state }) => {
          const tier = fameTier(state);
          const next = FAME_TIERS[Math.min(FAME_TOP, tier + 1)];
          write((s) => {
            const need = Math.max(0, next.at - fameOf(s));
            return grantFame(s, need + 1).state;
          });
          log(`此地名气 → ${next.label}`);
        },
      },
      {
        id: 'renown+',
        label: '路上名声 +N（不分地区）',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, renown: Math.max(0, s.renown + n) }));
          log(`路上名声 +${n}`);
        },
      },
      {
        id: 'leisure+',
        label: '闲暇 +N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, leisure: s.leisure + n }));
          log(`闲暇 +${n}`);
        },
      },
      {
        id: 'broke',
        label: '清空钱包',
        run: ({ write, log }) => {
          write((s) => ({ ...s, coin: 0, insp: 0, leisure: 0 }));
          log('钱包清空');
        },
      },
    ],
  },

  {
    id: 'clock',
    title: '时间与手劲',
    hint: '跳时间＝把上次结算的时刻往前挪，收益会照常累积',
    actions: [
      {
        id: 'skip',
        label: '跳过 N 小时',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => skipHours(s, n));
          log(`时间 +${n} 小时`);
        },
      },
      {
        id: 'rest',
        label: '手劲回满',
        run: ({ write, log }) => {
          write((s) => ({ ...s, fatigue: 0 }));
          log('手劲回满');
        },
      },
      {
        id: 'age-grudge',
        label: '仇怨放旧 N 天',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ageGrudges(s, n));
          log(`仇怨的时钟往前挪了 ${n} 天，下一拍生效`);
        },
      },
      {
        id: 'collects',
        label: '收摊次数 +N',
        amount: true,
        run: ({ write, log }, n) => {
          write((s) => ({ ...s, collects: s.collects + n }));
          log(`收摊次数 +${n}`);
        },
      },
    ],
  },

  {
    id: 'unlock',
    title: '解锁',
    actions: [
      {
        id: 'places',
        label: '全部观景台与地图',
        run: ({ write, log }) => {
          write(unlockAllPlaces);
          log('观景台/地图全开');
        },
      },
      {
        id: 'gear',
        label: '全部乐器·曲谱·行头·道具',
        run: ({ write, log }) => {
          write(unlockAllGear);
          log('行囊全开');
        },
      },
      {
        id: 'chapter+',
        label: '章节 +1',
        run: ({ write, log, state }) => {
          write((s) => setChapter(s, s.story.chapter + 1));
          log(`章节 → ${state.story.chapter + 1}`);
        },
      },
    ],
  },

  {
    /* the eighty-one: the main line is a long collection, and testing the
       late game by hand would mean visiting a hundred nodes */
    id: 'scores',
    title: '族谱（八十一份）',
    hint: '整卷齐了会解锁该卷的原曲，并让「一卷齐了」那场戏有条件触发',
    actions: [
      {
        id: 'leaf+',
        label: '找回下一页（就近的卷）',
        run: ({ write, log, state }) => {
          const leaf = pickLeaf(state, OVERLOOK_MAP[state.overlook]?.townId ?? '', 0, 0);
          if (!leaf) return log('没有可找的散页了');
          write((s) => findScore(s, leaf.id).state);
          log(`拾回 ${leaf.name}`);
        },
      },
      {
        id: 'vol+',
        label: '补齐当前这一卷',
        run: ({ write, log, state }) => {
          const vol = activeVolume(state);
          write((s) => {
            let next = s;
            leavesOf(vol.id).forEach((l) => {
              next = findScore(next, l.id).state;
            });
            return next;
          });
          log(`${vol.name} · 全卷`);
        },
      },
      {
        id: 'scores-all',
        label: '八十一份全给',
        run: ({ write, log }) => {
          write((s) => {
            let next = s;
            SCORES.forEach((l) => {
              next = findScore(next, l.id).state;
            });
            return next;
          });
          log('族谱全开（九卷）');
        },
      },
      {
        id: 'scores-clear',
        label: '清空族谱',
        run: ({ write, log }) => {
          write((s) => ({ ...s, scores: [], scoreAt: 0 }));
          log('族谱清空（已解锁的原曲不收回）');
        },
      },
    ],
  },

  {
    /* composing burns inspiration and leisure, so testing the sheet twice
       in a row normally means waiting a day — these two make it cheap */
    id: 'compose',
    title: '谱曲',
    actions: [
      {
        id: 'compose-fuel',
        label: '灵感与闲暇补满',
        run: ({ write, log }) => {
          write((s) => ({
            ...s,
            insp: s.insp + 2000,
            totalInsp: s.totalInsp + 2000,
            leisure: s.leisure + 12,
          }));
          log('灵感 +2000，闲暇 +12');
        },
      },
      {
        id: 'compose-clear',
        label: '烧掉所有自谱曲',
        run: ({ write, log, state }) => {
          const mine = state.composed.map((c) => c.id);
          write((s) => ({
            ...s,
            composed: [],
            songs: s.songs.filter((id) => !mine.includes(id)),
            repertoire: s.repertoire.filter((id) => !mine.includes(id)),
          }));
          log(`烧掉 ${mine.length} 首自谱曲`);
        },
      },
    ],
  },

  {
    id: 'story',
    title: '剧情钩子',
    hint: '条件满足也未必触发——这里是替你多摇几次骰子',
    actions: [
      {
        id: 'fire-open',
        label: '试 open 钩子',
        run: ({ fire, log }) => log(fire('open') ? 'open：触发了' : 'open：没中'),
      },
      {
        id: 'fire-collect',
        label: '试 collect 钩子',
        run: ({ fire, log }) => log(fire('collect') ? 'collect：触发了' : 'collect：没中'),
      },
      {
        id: 'fire-arrive',
        label: '试 arrive 钩子',
        run: ({ fire, log }) => log(fire('arrive') ? 'arrive：触发了' : 'arrive：没中'),
      },
    ],
  },

  {
    id: 'danger',
    title: '危险',
    actions: [
      {
        id: 'reset',
        label: '清档重来',
        tone: 'warn',
        run: ({ reset, log }) => {
          reset();
          log('存档已清');
        },
      },
    ],
  },
];
