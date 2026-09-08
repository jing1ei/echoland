import type { Cond } from './types';
import type { GameState } from '../engine';
import { skyState } from '../engine';
import { OVERLOOK_MAP } from '../../content/overlooks';
import { CHARACTER_MAP, SCENE_MAP } from './registry';
import { tierIndex } from './tiers';
import { weatherMatches, weatherRefLabel } from '../systems/weather';
import { bondNeedText, tierNeedText } from '../systems/bond';
import { enmityCleanText, enmityIndex, enmityNeedText, enmityOf } from '../systems/enmity';
import { guestPresent, visitorSpec } from '../systems/visitors';
import { fameTier } from '../systems/fame';
import { FAME_TIERS } from '../../content/fame';
import { VOLUME_MAP } from '../../content/scores';
import { scoresFound, volumeFound, volumesDone } from '../systems/scores';
import { categoryBonus, effectiveProf, ownProf, tierOf } from '../systems/proficiency';
import { INSTRUMENT_MAP } from '../../content/instruments';
import { CATEGORY_MAP } from '../../content/proficiency';
import { PROFICIENCY_VALUES } from '../../content/proficiency/values';

/* ============================================================
   Condition evaluation

   One pure function. Every gate in the story system — trigger
   eligibility, a conditional line, a hidden choice, a locked choice —
   funnels through `test()`. There is no second code path, so a
   condition behaves the same everywhere.
   ============================================================ */

export interface CondCtx {
  now: number;
  /** the node being visited, when evaluating a `node` hook */
  nodeId?: string;
  /** overlook override, used when previewing a scene at a fixed place */
  overlook?: string;
}

const inRange = (v: number, min?: number, max?: number) =>
  (min == null || v >= min) && (max == null || v <= max);

export function test(s: GameState, c: Cond | undefined, ctx: CondCtx): boolean {
  if (!c) return true;
  const st = s.story;

  switch (c.k) {
    /* ---- structural ---- */
    case 'all':
      return c.of.every((x) => test(s, x, ctx));
    case 'any':
      return c.of.some((x) => test(s, x, ctx));
    case 'not':
      return !test(s, c.of, ctx);

    /* ---- progression ---- */
    case 'flag':
      return c.off ? !s.flags[c.id] : !!s.flags[c.id];
    case 'var': {
      const v = st.vars[c.id] ?? 0;
      if (c.eq != null) return v === c.eq;
      return inRange(v, c.min, c.max);
    }
    case 'chapter':
      return inRange(st.chapter, c.min, c.max);
    case 'quest':
      if (c.is === 'done') return s.questsDone.includes(c.id);
      if (c.is === 'active') return s.questsActive.includes(c.id);
      return !s.questsDone.includes(c.id);

    /* ---- people ---- */
    case 'met':
      return c.off ? !st.met[c.who] : !!st.met[c.who];
    case 'bond':
      return inRange(st.bond[c.who] ?? 0, c.min, c.max);
    case 'tier': {
      const ch = CHARACTER_MAP[c.who];
      if (!ch) return false;
      return inRange(tierIndex(ch, st.bond[c.who] ?? 0), c.min, c.max);
    }
    /* the second axis. `max: 0` is the useful one: "only if there is
       nothing between you" gates most of the friendly scenes. */
    case 'enmity':
      return inRange(enmityOf(st, c.who), c.min, c.max);
    case 'grudge': {
      const ch = CHARACTER_MAP[c.who];
      if (!ch) return false;
      return inRange(enmityIndex(ch, enmityOf(st, c.who)), c.min, c.max);
    }

    /* ---- wallet ---- */
    case 'coin':
      return inRange(s.coin, c.min, c.max);
    case 'insp':
      return inRange(s.insp, c.min, c.max);
    case 'renown':
      return inRange(s.renown, c.min, c.max);
    case 'fame':
      return inRange(fameTier(s, c.town ?? undefined), c.min, c.max);
    case 'leisure':
      return inRange(s.leisure, c.min, c.max);
    case 'totalCoin':
      return inRange(s.totalCoin, c.min);
    case 'collects':
      return inRange(s.collects, c.min, c.max);

    /* ---- place ---- */
    case 'overlook':
      return c.ids.includes(ctx.overlook ?? s.overlook);
    case 'town': {
      const ov = OVERLOOK_MAP[ctx.overlook ?? s.overlook];
      return !!ov && c.ids.includes(ov.townId);
    }
    case 'mood': {
      const ov = OVERLOOK_MAP[ctx.overlook ?? s.overlook];
      return !!ov && c.tags.some((t) => ov.moods.includes(t));
    }
    case 'phase':
      return c.of.includes(skyState(ctx.now, ctx.overlook ?? s.overlook).phase);
    case 'weather':
      return weatherMatches(skyState(ctx.now, ctx.overlook ?? s.overlook).weather, c.of);

    /* ---- the eighty-one ---- */
    case 'score':
      return inRange(c.vol ? volumeFound(s, c.vol) : scoresFound(s), c.min, c.max);
    case 'volumes':
      return inRange(volumesDone(s), c.min, c.max);

    /* ---- inventory ---- */
    case 'item':
      return (s.items[c.id] ?? 0) >= (c.min ?? 1);
    case 'song':
      return c.off ? !s.songs.includes(c.id) : s.songs.includes(c.id);
    case 'instrument':
      if (c.held) return s.instrument === c.id;
      return c.off ? !s.instruments.includes(c.id) : s.instruments.includes(c.id);
    case 'upgrade':
      return s.upgrades.includes(c.id);

    /* ---- craft ---- */
    case 'prof':
      return inRange(c.own ? ownProf(s, c.id) : effectiveProf(s, c.id), c.min, c.max);
    case 'profCat':
      return inRange(categoryBonus(s, c.cat), c.min, c.max);

    /* ---- the crowd ---- */
    /* the visitors system is handed `test` rather than importing it: it
       is the only way to ask "is the odd figure there" without the two
       modules importing each other */
    case 'guest':
      return guestPresent(s, ctx.now, test, c.id);

    /* ---- bookkeeping ---- */
    case 'seen':
      return inRange(st.seen[c.scene] ?? 0, c.min, c.max);
    case 'sinceScene': {
      const at = st.seenAt[c.scene];
      if (at == null) return true; // never played counts as "long ago"
      return (ctx.now - at) / 3600000 >= (c.minH ?? 0);
    }
    case 'sinceMet': {
      const at = st.met[c.who];
      if (at == null) return false; // haven't met at all
      return (ctx.now - at) / 3600000 >= (c.minH ?? 0);
    }

    default:
      return false;
  }
}

/* ============================================================
   Human-readable conditions

   Used for locked choices ("需要：与苏芹交好") and for the cast
   screen's "what unlocks next" hints. Keeping this next to the
   evaluator means a new condition kind gets a label in the same
   edit that gives it behaviour.
   ============================================================ */

const PHASE_CN: Record<string, string> = { dawn: '拂晓', day: '白日', dusk: '黄昏', night: '夜里' };

export function describe(c: Cond | undefined): string {
  if (!c) return '';
  const who = (id: string) => CHARACTER_MAP[id]?.name ?? id;

  switch (c.k) {
    case 'all':
      return c.of.map(describe).filter(Boolean).join('，');
    case 'any':
      return c.of.map(describe).filter(Boolean).join(' 或 ');
    case 'not':
      return `非（${describe(c.of)}）`;

    case 'flag':
      return c.off ? '' : '';
    case 'var':
      return '';
    case 'chapter':
      return c.min ? `第 ${c.min} 章之后` : '';
    case 'quest':
      return c.is === 'done' ? '完成相关的故事' : '';

    case 'met':
      return c.off ? '' : `认识${who(c.who)}`;
    /* affection is hidden, so a threshold describes itself as the
       relationship word it crosses, never as the number it is */
    case 'bond':
      return c.min ? bondNeedText(CHARACTER_MAP[c.who], c.min) : '';
    case 'tier': {
      if (c.min == null) return '';
      return tierNeedText(CHARACTER_MAP[c.who], c.min);
    }
    /* a grudge is hidden too: describe the state, not the points */
    case 'enmity':
      if (c.max != null && c.max <= 0) return enmityCleanText(CHARACTER_MAP[c.who]);
      return c.min ? enmityNeedText(CHARACTER_MAP[c.who], c.min) : '';
    case 'grudge':
      if (c.max != null && c.max <= 0) return enmityCleanText(CHARACTER_MAP[c.who]);
      return c.min ? enmityNeedText(CHARACTER_MAP[c.who], 1) : '';

    case 'coin':
      return c.min ? `身上 ${c.min} 枚以上` : '';
    case 'insp':
      return c.min ? `灵感 ${c.min} 以上` : '';
    case 'renown':
      return c.min ? '路上有人听说过你' : '';
    /* fame is regional and shown as a word, so a requirement is spoken as
       the word this town would have to be using for you */
    case 'fame':
      return c.min
        ? `这一带认得你到「${FAME_TIERS[Math.min(c.min, FAME_TIERS.length - 1)]?.label ?? ''}」`
        : '';
    case 'leisure':
      return c.min ? `闲暇 ${c.min} 以上` : '';
    case 'totalCoin':
      return c.min ? `累计挣到 ${c.min.toLocaleString('en-US')} 枚` : '';
    case 'collects':
      return c.min ? `收摊 ${c.min} 次以上` : '';

    case 'overlook':
      return `在${c.ids.map((i) => OVERLOOK_MAP[i]?.name ?? i).join('或')}`;
    case 'town':
      return '在特定的镇上';
    case 'mood':
      return '在合适的地方';
    case 'phase':
      return c.of.map((p) => PHASE_CN[p] ?? p).join('或');
    case 'weather':
      return c.of.map(weatherRefLabel).join('或');

    case 'guest': {
      /* the figure is never described in words anywhere else in the game
         (content/visitors/text.ts), so a requirement hint does not get to
         name it either — it says only that someone is there */
      return c.id && visitorSpec(c.id) ? '摊边那个人还在' : '摊边站着不太一样的人';
    }

    case 'score':
      return c.vol ? `${VOLUME_MAP[c.vol]?.name ?? ''}找回若干页` : '族谱找回若干页';
    case 'volumes':
      return '凑齐过整卷族谱';

    case 'item':
      return `带着某样东西`;
    case 'song':
      return c.off ? '' : '会某一首曲子';
    case 'instrument':
      return c.held ? '手上拿着特定的琴' : '有某一把琴';
    case 'upgrade':
      return '有相应的行头';

    case 'prof': {
      const name = INSTRUMENT_MAP[c.id]?.name ?? c.id;
      if (c.min == null) return '';
      if (c.min >= PROFICIENCY_VALUES.masteryAt) return `${name}练到通神`;
      return `${name}熟练 ${Math.round(c.min)}%（${tierOf(c.min).label}）以上`;
    }
    case 'profCat': {
      const cat = CATEGORY_MAP[c.cat]?.name ?? c.cat;
      return c.min ? `${cat}底子 +${Math.round(c.min)}%` : '';
    }

    case 'seen':
      return '';
    case 'sinceScene':
      return c.minH ? `隔上 ${Math.round(c.minH)} 小时` : '';
    case 'sinceMet':
      return c.minH ? `认识${who(c.who)}满 ${Math.round(c.minH)} 小时` : '';

    default:
      return '';
  }
}

/** the parts of a condition that are still unmet — for "what's missing" hints */
export function missing(s: GameState, c: Cond | undefined, ctx: CondCtx): string[] {
  if (!c) return [];
  if (test(s, c, ctx)) return [];
  if (c.k === 'all') return c.of.flatMap((x) => missing(s, x, ctx));
  const d = describe(c);
  return d ? [d] : [];
}
