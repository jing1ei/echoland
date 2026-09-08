import { TOWNS } from '../towns';

/* ============================================================
   FAME — the tiers

   Fame is *local*. Every town keeps its own opinion of you, and the
   player is never shown the number behind it — only one of five words.
   That is the whole contract of this module: five thresholds, five
   labels, nothing else.

   Why words and not a number: a number invites optimisation, and this
   value is not a currency, it is a social fact. "小有名气" tells the
   player everything they can act on (play here more, or move on) and
   nothing they can grind against.

   Five bands, deliberately uneven. The first is cheap — a couple of
   evenings anywhere and somebody recognises the hat. The last is
   expensive enough that most saves will hold it in two or three towns,
   never everywhere, which is what makes "where am I actually known?" a
   real question.
   ============================================================ */

export interface FameTier {
  /** fame at or above this, in this town, reads as `label` */
  at: number;
  label: string;
  /** the one-line feel of that band, for the satchel */
  note: string;
}

export const FAME_TIERS: FameTier[] = [
  { at: 0, label: '无人识得', note: '这里没人知道你是谁。' },
  { at: 12, label: '有点面熟', note: '有几张脸开始对你点头。' },
  { at: 46, label: '小有名气', note: '摊子还没摆开就有人站住了。' },
  { at: 140, label: '声名在外', note: '有人专门绕路来这条街听你弹。' },
  { at: 380, label: '名动一方', note: '这一带提起走唱的，说的就是你。' },
];

export const FAME_TOP = FAME_TIERS.length - 1;

/* ------------------------------------------------------------
   Regions

   A town is the unit of fame, because a town is the unit of gossip.
   Overlooks inside one town share a name — you do not become a stranger
   again by walking to the other end of the same harbour.
   ------------------------------------------------------------ */

/** every place fame can be held, in the order the debug panel lists them */
export const FAME_TOWN_IDS: string[] = TOWNS.map((t) => t.id);
