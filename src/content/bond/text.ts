/* ============================================================
   AFFECTION — text

   The whole point of this module: affection is never a chip that says
   "好感 +2". It is a line of prose, and the screen goes quiet while you
   read it. So every number the old UI printed has to have a sentence
   here to replace it.

   Templates take {name} (the person) and {tier} (the new relationship
   word, for crossings only). Several variants per situation — one fixed
   sentence read as a system message the third time you saw it.
   ============================================================ */

export interface BondLines {
  /** a small gain */
  gain: string[];
  /** a large gain in one scene */
  strong: string[];
  /** crossing into a new tier */
  tier: string[];
  /** you cost yourself something */
  cool: string[];
}

export const BOND_LINES: BondLines = {
  gain: [
    '{name}看你的眼神里，好像多了一点欣赏。',
    '{name}没说什么，只是站得比刚才近了半步。',
    '{name}把话头往你这边让了让。',
    '你说完了，{name}还在看着你，没接下一句。',
    '{name}笑了一下，那种「原来你是这样的人」的笑。',
  ],
  strong: [
    '{name}看你的眼神变了——像是把你从「路过的琴师」挪到了别的位置上。',
    '{name}沉默了很久，然后说：你这人，比看上去可靠。',
    '有些话{name}本来不会对外人讲。她刚讲完了，然后才想起你是外人。',
    '{name}认真看了你一会儿，像在重新认一遍你的脸。',
  ],
  tier: [
    '你和{name}之间的什么东西落了地。往后再见面，是{tier}了。',
    '{name}换了个称呼叫你。你听出来了——这已经是{tier}。',
    '不必说透。你们都清楚，这算{tier}了。',
  ],
  cool: [
    '{name}的眼神收回去了一点。',
    '{name}没有生气，只是把刚要说的话咽了回去。',
    '你话说完了。{name}点点头，比刚才客气了些。',
  ],
};

/** flavour for specific people — merged over BOND_LINES, per key */
export const BOND_LINES_BY_CHARACTER: Record<string, Partial<BondLines>> = {
  ch_su: {
    gain: [
      '苏芹在账页上你那一行边上，画了个很小的记号。',
      '苏芹没催账。她从来不催，但今天她连提都没提。',
      '苏芹给你续了半杯，摆手说不记账。',
    ],
  },
  ch_chu: {
    gain: [
      '楮把你的琴翻过来看了看，说：还能用很久。',
      '楮递给你一段废弦，说拿着，比你现在那根麻线好。',
    ],
  },
  ch_que: {
    gain: [
      '阿雀记住了你下一站要去哪。她一向只记要送信的地址。',
      '阿雀把匣子换到另一边肩上，好像是为了跟你并肩走。',
    ],
  },
};

/* ------------------------------------------------------------
   The cast page

   The tier word stays — it is a relationship, not a score. Everything
   numeric goes, and in its place: one line about which direction this
   is drifting.

   These are keyed by the *relationship word*, not by progress inside
   it, because that was the earlier bug: a card could read「生面孔」and
   then「见面已经不用找话头了」in the same breath. Progress only picks
   between "this is where we are" and "this is about to change".
   ------------------------------------------------------------ */

export interface ClosenessBand {
  /** the usual line for this stage */
  steady: string[];
  /** the same stage, but close to tipping into the next one */
  rising: string[];
}

export const BOND_CLOSENESS: Record<string, ClosenessBand> = {
  /* tier 0 — 生面孔 */
  stranger: {
    steady: ['刚认下这张脸。', '还在互相打量。', '点头之交，名字未必记得住。'],
    rising: ['已经不用自我介绍了。', '再碰上两次，大概会记住你。'],
  },
  /* tier 1 — 面熟 */
  known: {
    steady: ['见着会点头，话不多。', '算是脸熟的人了。'],
    rising: ['最近愿意多站一会儿听你弹。', '好像有话要问你，还没问。'],
  },
  /* tier 2 — 说得上话 */
  talking: {
    steady: ['见面已经不用找话头了。', '说得上话，也还留着分寸。'],
    rising: ['有些话已经快要说得出口。', '再多几次照面，就该换个说法了。'],
  },
  /* tier 3 — 交好 */
  friend: {
    steady: ['你的事，她会顺口问一句。', '算是自己人，但不必说明。'],
    rising: ['有件事她一直想告诉你。'],
  },
  /* tier 4 和以上 */
  deep: {
    steady: ['到这一步，剩下的都不必说透。', '不常提，也不会忘。'],
    rising: ['不常提，也不会忘。'],
  },
};

/** tier index -> which band above describes it */
export const BOND_BAND_BY_TIER = ['stranger', 'known', 'talking', 'friend', 'deep'] as const;

export const BOND_UI_TEXT = {
  /** the beat overlay's whisper of a label */
  beatLabel: '这一刻',
  beatTapHint: '轻触收下',
  /** cast page, where "好感 12 / 26" used to be */
  castNote: '关系深浅不记数，只记事。',
  /** condition phrasing, when a locked choice needs a closer bond */
  needTier: '与{name}{tier}',
  needCloser: '与{name}再熟一些',
  /** journal title for a tier crossing */
  journalTier: '{name} · {tier}',
  journalBody: '你和{name}之间的距离又近了一点。',
} as const;
