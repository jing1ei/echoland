/* ============================================================
   THE EIGHTY-ONE — text

   The premise, in the fewest words that still hurt: your people were
   killed off, their library was carried away leaf by leaf, and you are
   the last pair of hands the leaves still answer to. Every string the
   player reads about that lives here.
   ============================================================ */

export const SCORE_TEXT = {
  /** the collection tab */
  tab: '古谱',
  title: '八十一份',
  sub: '九卷，每卷九页。全都被拿走过。',
  /** the standing explanation, shown at the top of the tab */
  premise:
    '你是澹人最后一个。澹人不会打仗，只会一件事：让乐器里的东西听话。八十一份曲谱是他们全部的家当，也是他们被抄干净的原因。\n谱子没有毁，只是散了——压在账本下、糊在窗上、烧进窑灰里。你不问它们值多少钱。你只想把它们拿回来。',
  /** the one-off tip in 设置 → 上手 */
  tip: '手记里的「古谱」记着八十一份族谱。探索地图上的旧谱箱、祠、废墟最容易翻出散页；找齐一整卷，你会弹出这一卷原本的样子。',

  unknownLeaf: '？',
  volumeProgress: (n: number) => `${n} / 9`,
  allProgress: (n: number) => `${n} / 81`,

  /** what a discovery says, in the node result line */
  found: (name: string, vol: string) => `散页 · ${vol}${name}`,
  foundPlain: '你翻出了一页不属于这里的纸。',

  /** the journal entry for a single leaf */
  journal: {
    title: (name: string) => `拾回 ${name}`,
    body: (name: string, vol: string, place: string) =>
      `${name}在${place}。${vol}又少一页缺口。你没有当场弹它——手抖得太厉害。`,
  },

  /** the journal entry for a completed volume */
  volumeJournal: {
    title: (vol: string) => `${vol} · 全`,
    body: (vol: string, song: string) =>
      `九页齐了。你按顺序弹了一遍${vol}，弹到第七页的时候，乐器自己接了下去。\n从今天起你会弹${song}——不是学会，是想起来。`,
  },

  /** shown on the stage/collect when a leaf turns up while you were away */
  awayFound: (name: string) => `有人把${name}塞进了你的琴盒，没留名字。`,

  /** the words the game uses for the two milestones the player will chase */
  volumeDone: '全卷',
  volumeOpen: (n: number) => `已有 ${n} 页`,
  volumeNone: '还没有一页',

  /** cast/lore aside about the ability */
  gift: '御器',
  giftNote: '澹人的本事：乐器里住着的东西，肯听你的。',
} as const;
