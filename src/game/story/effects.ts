import type { Effect } from './types';
import type { GameState, JournalEntry } from '../engine';
import { computeRates } from '../engine';
import { OVERLOOK_MAP } from '../../content/overlooks';
import { CHARACTER_MAP } from './registry';
import { tierIndex } from './tiers';
import { bondBeat } from '../systems/bond';
import type { FeelingBeat } from '../systems/beat';
import { enmityBeat, enmityIndex, enmityLabel } from '../systems/enmity';
import { BOND_UI_TEXT } from '../../content/bond';
import { ENMITY_UI_TEXT } from '../../content/enmity';
import { ITEM_MAP, SONG_MAP, INSTRUMENT_MAP, UPGRADE_MAP } from '../../content/gear';
import { FAME_TEXT } from '../../content/fame';
import { grantFame } from '../systems/fame';
import { findScore, pickLeaf } from '../systems/scores';
import { songById } from '../systems/songs';
import { QUEST_MAP } from '../../content/quests';
import { TOWN_MAP } from '../../content/towns';

/* ============================================================
   Effect application

   `apply` is the only place story content is allowed to write to the
   save. It returns the notes it produced so the AVG view can float
   "得到 海鸥尾羽" over the dialogue box without having to diff two
   states itself.

   Two kinds of note are deliberately not chips: affection and enmity.
   Both are hidden stats — see game/systems/{bond,enmity}.ts — so a
   change comes back as a `feel` note carrying a whole sentence, a tone
   and a dim level, and the AVG layer stops the screen for it instead of
   floating a number.
   ============================================================ */

export type NoteKind = 'coin' | 'insp' | 'renown' | 'leisure' | 'feel' | 'get' | 'unlock';

export interface Note {
  kind: NoteKind;
  label: string;
  /** signed amount when numeric */
  n?: number;
  /** `feel` only: the beat the AVG layer should stop the screen for */
  beat?: FeelingBeat;
}

export interface ApplyResult {
  state: GameState;
  notes: Note[];
}

const clampPos = (n: number) => Math.max(0, n);

export function apply(state: GameState, effects: Effect[] | undefined, now = Date.now()): ApplyResult {
  if (!effects || effects.length === 0) return { state, notes: [] };

  let s: GameState = { ...state, story: { ...state.story } };
  const notes: Note[] = [];
  const journal: JournalEntry[] = [];
  const rates = computeRates(state, now);

  for (const e of effects) {
    switch (e.k) {
      case 'coin': {
        const n = e.hours ? e.n * rates.coin : e.n;
        s = {
          ...s,
          coin: clampPos(s.coin + n),
          totalCoin: s.totalCoin + Math.max(0, n),
        };
        notes.push({ kind: 'coin', label: '铜板', n });
        break;
      }
      case 'insp': {
        const n = e.hours ? e.n * rates.insp : e.n;
        s = { ...s, insp: clampPos(s.insp + n), totalInsp: s.totalInsp + Math.max(0, n) };
        notes.push({ kind: 'insp', label: '灵感', n });
        break;
      }
      case 'renown': {
        /* fame is local and wordless: the story earns it for the town you
           are standing in, and the note never carries a number */
        const g = grantFame(s, e.n);
        s = g.state;
        notes.push({
          kind: 'renown',
          label: e.n >= 0 ? FAME_TEXT.gain : FAME_TEXT.lose,
        });
        break;
      }
      case 'leisure':
        s = { ...s, leisure: Math.min(rates.leisureCap, clampPos(s.leisure + e.n)) };
        notes.push({ kind: 'leisure', label: '闲暇', n: e.n });
        break;

      case 'bond': {
        const ch = CHARACTER_MAP[e.who];
        if (!ch) break;
        const before = s.story.bond[e.who] ?? 0;
        const after = clampPos(before + e.n);
        const bond = { ...s.story.bond, [e.who]: after };
        /* meeting someone is implicit in caring about them */
        const met = s.story.met[e.who] ? s.story.met : { ...s.story.met, [e.who]: now };
        s = { ...s, story: { ...s.story, bond, met } };

        /* the number stays in the save and goes no further: what comes
           out is a sentence, and the screen dims while it is read */
        const beat = bondBeat(ch, e.n, before, after, now);
        if (beat) notes.push({ kind: 'feel', label: beat.text, beat });

        const t0 = tierIndex(ch, before);
        const t1 = tierIndex(ch, after);
        if (t1 > t0) {
          const label = ch.tiers[t1].label;
          journal.push({
            at: now,
            kind: 'bond',
            title: BOND_UI_TEXT.journalTier.replace('{name}', ch.name).replace('{tier}', label),
            body: BOND_UI_TEXT.journalBody.replace('{name}', ch.name),
          });
        }
        break;
      }
      case 'enmity': {
        const ch = CHARACTER_MAP[e.who];
        if (!ch) break;
        const before = s.story.enmity?.[e.who] ?? 0;
        const after = clampPos(before + e.n);
        const enmity = { ...(s.story.enmity ?? {}) };
        if (after > 0) enmity[e.who] = after;
        else delete enmity[e.who];
        /* you cannot resent someone you have never met */
        const met = s.story.met[e.who] ? s.story.met : { ...s.story.met, [e.who]: now };
        s = { ...s, story: { ...s.story, enmity, met } };

        const beat = enmityBeat(ch, e.n, before, after, now);
        if (beat) notes.push({ kind: 'feel', label: beat.text, beat });

        const t0 = enmityIndex(ch, before);
        const t1 = enmityIndex(ch, after);
        if (t1 > t0) {
          journal.push({
            at: now,
            kind: 'bond',
            title: ENMITY_UI_TEXT.journalTier
              .replace('{name}', ch.name)
              .replace('{tier}', enmityLabel(ch, after)),
            body: ENMITY_UI_TEXT.journalBody.replace('{name}', ch.name),
          });
        }
        break;
      }
      case 'forgive': {
        const ch = CHARACTER_MAP[e.who];
        const before = s.story.enmity?.[e.who] ?? 0;
        if (!ch || before <= 0) break;
        const enmity = { ...(s.story.enmity ?? {}) };
        delete enmity[e.who];
        s = { ...s, story: { ...s.story, enmity } };

        const beat = enmityBeat(ch, -before, before, 0, now);
        if (beat) notes.push({ kind: 'feel', label: beat.text, beat });
        journal.push({
          at: now,
          kind: 'bond',
          title: ENMITY_UI_TEXT.journalClear.replace('{name}', ch.name),
          body: ENMITY_UI_TEXT.journalClearBody.replace('{name}', ch.name),
        });
        break;
      }
      case 'meet': {
        const ch = CHARACTER_MAP[e.who];
        if (!ch || s.story.met[e.who]) break;
        s = { ...s, story: { ...s.story, met: { ...s.story.met, [e.who]: now } } };
        notes.push({ kind: 'unlock', label: `认识了${ch.name}` });
        journal.push({
          at: now,
          kind: 'bond',
          title: `认识了${ch.name}`,
          body: `${ch.role}。${ch.blurb}`,
        });
        break;
      }

      case 'flag':
        s = { ...s, flags: { ...s.flags, [e.id]: !e.off } };
        break;
      case 'var': {
        const cur = s.story.vars[e.id] ?? 0;
        const next = e.set != null ? e.set : cur + (e.add ?? 0);
        s = { ...s, story: { ...s.story, vars: { ...s.story.vars, [e.id]: next } } };
        break;
      }
      case 'chapter':
        if (e.set > s.story.chapter) s = { ...s, story: { ...s.story, chapter: e.set } };
        break;

      case 'item': {
        const it = ITEM_MAP[e.id];
        if (!it) break;
        const n = e.n ?? 1;
        s = { ...s, items: { ...s.items, [e.id]: clampPos((s.items[e.id] ?? 0) + n) } };
        if (s.items[e.id] <= 0) {
          const items = { ...s.items };
          delete items[e.id];
          s = { ...s, items };
        }
        notes.push({ kind: 'get', label: n > 0 ? `得到 ${it.name}` : `失去 ${it.name}` });
        break;
      }
      /* ---- one of the eighty-one ----
         A scene can name the page or leave it to the region. Completing a
         volume is loud on purpose: it is the only unlock in the game that
         gives you back something your family wrote. */
      case 'score': {
        const id =
          e.id ??
          pickLeaf(s, OVERLOOK_MAP[s.overlook]?.townId ?? '', Math.random(), Math.random())?.id;
        if (!id) break;
        const find = findScore(s, id);
        if (!find.leaf) break;
        s = find.state;
        notes.push({ kind: 'get', label: `拾回 ${find.leaf.name}` });
        if (find.completed) {
          const songName = find.song ? songById(s, find.song)?.name ?? '' : '';
          notes.push({ kind: 'unlock', label: `${find.completed.name} · 全卷${songName ? ` · ${songName}` : ''}` });
        }
        break;
      }
      case 'song':
        if (SONG_MAP[e.id] && !s.songs.includes(e.id)) {
          s = { ...s, songs: [...s.songs, e.id] };
          notes.push({ kind: 'unlock', label: `学会 ${SONG_MAP[e.id].name}` });
        }
        break;
      case 'instrument':
        if (INSTRUMENT_MAP[e.id] && !s.instruments.includes(e.id)) {
          s = { ...s, instruments: [...s.instruments, e.id] };
          notes.push({ kind: 'unlock', label: `到手 ${INSTRUMENT_MAP[e.id].name}` });
        }
        break;
      case 'upgrade':
        if (UPGRADE_MAP[e.id] && !s.upgrades.includes(e.id)) {
          s = { ...s, upgrades: [...s.upgrades, e.id] };
          notes.push({ kind: 'unlock', label: `添了 ${UPGRADE_MAP[e.id].name}` });
        }
        break;
      case 'overlook': {
        const ov = OVERLOOK_MAP[e.id];
        if (!ov) break;
        if (!s.overlooks.includes(e.id)) {
          s = { ...s, overlooks: [...s.overlooks, e.id] };
          notes.push({ kind: 'unlock', label: `开了新观景台 · ${ov.name}` });
          journal.push({
            at: now,
            kind: 'story',
            title: `${ov.name} · 可以去了`,
            body: ov.blurb,
          });
        }
        if (!s.maps.includes(ov.townId)) s = { ...s, maps: [...s.maps, ov.townId] };
        break;
      }
      case 'map':
        if (TOWN_MAP[e.id] && !s.maps.includes(e.id)) {
          s = { ...s, maps: [...s.maps, e.id] };
          notes.push({ kind: 'unlock', label: `新地图 · ${TOWN_MAP[e.id].name}` });
        }
        break;

      case 'quest':
        if (e.start && QUEST_MAP[e.id] && !s.questsActive.includes(e.id) && !s.questsDone.includes(e.id)) {
          s = { ...s, questsActive: [...s.questsActive, e.id] };
          notes.push({ kind: 'unlock', label: `新的委托 · ${QUEST_MAP[e.id].title}` });
        }
        break;

      case 'queue':
        if (!s.story.queue.includes(e.scene)) {
          s = { ...s, story: { ...s.story, queue: [...s.story.queue, e.scene] } };
        }
        break;

      case 'journal':
        journal.push({ at: now, kind: 'story', title: e.title, body: e.body });
        break;
    }
  }

  if (journal.length) {
    s = { ...s, journal: [...journal.reverse(), ...s.journal].slice(0, 220) };
  }
  return { state: s, notes };
}

/** merge notes of the same kind so a scene doesn't spam five "+1 铜板" chips */
export function mergeNotes(list: Note[]): Note[] {
  const out: Note[] = [];
  list.forEach((n) => {
    /* feeling beats are sentences, not amounts — two of them in one scene
       are two separate moments and must not be folded together */
    if (n.kind === 'feel' || n.n == null) {
      out.push(n);
      return;
    }
    const hit = out.find((o) => o.kind === n.kind && o.label === n.label && o.n != null);
    if (hit) hit.n = (hit.n ?? 0) + n.n;
    else out.push({ ...n });
  });
  return out.filter((n) => n.n == null || Math.abs(n.n) >= 0.5);
}
