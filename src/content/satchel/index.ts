/* ============================================================
   SATCHEL — the words, and which trays exist

   The bag is now a tray of icons: four tabs across the top, a grid of
   glyphs underneath, and nothing else until you tap something. That
   means almost all of its text is *conditional* — it only shows up in
   the detail slab for the one thing you tapped — so the strings are
   worth keeping in one place.

   Rules this module encodes:
   - the bag reports coin and nothing else. 名气 / 灵感 / 闲暇 belong to
     the explore screen, where they are about to be spent. A bag that
     lists four stats is a character sheet, and this game does not have
     one (see docs/ARCHITECTURE.md, "where numbers are allowed").
   - tabs are pictures. The label is for screen readers and for the
     one-line caption under the tray, not for a chip on every cell.
   ============================================================ */

export type SatchelTabId = 'things' | 'instruments' | 'songs' | 'kit';

export interface SatchelTab {
  id: SatchelTabId;
  /** glyph key, see src/ui/Glyph.tsx */
  glyph: string;
  /** spoken / caption name */
  label: string;
  /** the line under the tray when nothing is picked yet */
  hint: string;
  /** shown when this tray is empty */
  empty: string;
}

export const SATCHEL_TABS: SatchelTab[] = [
  {
    id: 'things',
    glyph: 'crate',
    label: '物件',
    hint: '点一个看看是什么。',
    empty: '空得能听见回声。市集、委托和路上的人都会给你东西。',
  },
  {
    id: 'instruments',
    glyph: 'lute',
    label: '乐器',
    hint: '点一个看手艺，长按不用——直接点「拿在手上」。',
    empty: '手上只有一把琴，别的还没到你手里。',
  },
  {
    id: 'songs',
    glyph: 'score',
    label: '谱子',
    hint: '亮着的是在演的三首。点一个换上或撤下。',
    empty: '还没有谱子。抄谱铺子有卖，灵感够了也可以自己写。',
  },
  {
    id: 'kit',
    glyph: 'pack',
    label: '行装',
    hint: '点一个看它替你做了什么。',
    empty: '还没置办什么行装。市集和琴铺有卖。',
  },
];

export const SATCHEL_TEXT = {
  title: '行囊',
  kicker: 'the satchel',
  /* the only number the bag is allowed to print */
  coinLabel: '铜板',
  coinUnit: '枚',
  worth: (n: string) => `拢共值 ${n} 枚`,
  kind: { trinket: '小物', reagent: '材料', relic: '遗物' } as Record<string, string>,
  /** the detail slab */
  sell: (n: string) => `卖 ${n}`,
  priceless: '不卖',
  pricelessNote: '这个不卖。你知道为什么。',
  take: '拿在手上',
  inHand: '在手上',
  playing: '在演',
  play: '换上',
  drop: '撤下',
  mine: '自谱',
  lastSong: '至少得留一首在演。',
  nothingPicked: '点一个看看是什么。',
  count: (n: number) => `${n}`,
} as const;
