/* ============================================================
   ENMITY — text

   The hard part of a hidden hate stat is tone. Nothing here may sound
   like a system: no「憎恶 +1」, no「你失去了好感」, and no threats about
   what will happen next. What a busker would actually notice is small
   and physical — a coin not dropped, a back turned, a name said flatly.

   Templates take {name} and, for a crossing, {tier}.
   ============================================================ */

export interface EnmityLines {
  /** a small grudge forms or deepens */
  gain: string[];
  /** you did something big */
  strong: string[];
  /** crossing into a new word: 记着这事 / 怀恨 / 结了仇 */
  tier: string[];
  /** it cools down — an apology, a favour, or just months of quiet */
  ease: string[];
  /** it is gone entirely: only an authored scene can do this */
  clear: string[];
}

export const ENMITY_LINES: EnmityLines = {
  gain: [
    '{name}听完了，什么也没说。你觉得这句话被记下来了。',
    '{name}看你的眼神凉了一下，像被风吹过。',
    '{name}往后退了半步，那半步没有再补回来。',
    '{name}把话咽了，改口说了句客气话。客气得不像她。',
    '你说完就后悔了。{name}的脸上什么都没有——这才是最糟的。',
  ],
  strong: [
    '{name}很久没出声。等她再开口，语气已经是对陌生人的了。',
    '{name}笑了一下，那种「原来你也是这种人」的笑。',
    '你听见{name}轻轻吸了口气，然后把该说的话全部换掉了。',
    '{name}转身之前看了你一眼。你宁愿她骂一句。',
  ],
  tier: [
    '有件事在{name}那儿落了地，往后翻不回去了。这算{tier}。',
    '{name}叫你的时候用了全名。你懂了：{tier}。',
    '不必说出口。你们心里都清楚，这已经是{tier}。',
  ],
  ease: [
    '{name}的语气松了一点，像放下了半块石头。',
    '{name}这次没有绕开你的摊子。',
    '{name}提起那件事，用的是过去的语气。',
  ],
  clear: [
    '{name}说：算了，都过去了。她说的时候是真的放下了。',
    '{name}摆摆手，把那件事从账上划掉了。',
  ],
};

/** flavour for specific people, merged over ENMITY_LINES per key */
export const ENMITY_LINES_BY_CHARACTER: Record<string, Partial<EnmityLines>> = {
  ch_su: {
    gain: [
      '苏芹在你那一行旁边补了一笔，写得比平时重。',
      '苏芹给你倒酒的时候，倒到平常的一半就停了。',
    ],
    tier: ['苏芹合上账本，把它放回了柜台最里面。这算{tier}。'],
  },
  ch_chu: {
    gain: [
      '楮把手里的刨子放下了，没再拿起来。',
      '楮没接你的琴。他只是说：你自己看着弄吧。',
    ],
  },
  ch_que: {
    gain: [
      '阿雀把匣子换到了离你远的那侧肩上。',
      '阿雀记下了你说的话。她记性一向很好，这次你不希望她好。',
    ],
  },
};

/* ------------------------------------------------------------
   The cast page

   A grudge shows up as one more line under the relationship word —
   never as a second bar. If someone both likes you and holds something
   against you, the card says both, in that order, because that is the
   order the player experiences it in.
   ------------------------------------------------------------ */

export const ENMITY_CAST: Record<string, string[]> = {
  /* tier 1 */
  minor: ['有件事她还记着。', '有一笔没算清的旧事。'],
  /* tier 2 */
  real: ['她不太愿意提你。', '你欠她一句道歉，她也没打算讨。'],
  /* tier 3 */
  deep: ['这一处，短时间是修不回来了。', '见了面，两个人都装作没看见。'],
};

export const ENMITY_BAND_BY_TIER = ['', 'minor', 'real', 'deep'] as const;

export const ENMITY_UI_TEXT = {
  /** the beat overlay's label — the warm one says 这一刻 */
  beatLabel: '这一下',
  beatTapHint: '轻触咽下',
  /** the rate breakdown line, when a grudge is costing you money */
  payPart: '有人说你的坏话',
  /** condition phrasing */
  needGrudge: '{name}对你有话没说完',
  /* reads as a to-do in the cast page's 「下次见面还差：」 slot, which is
     where this string actually lands */
  needClean: '先把与{name}的旧事了了',
  /** journal */
  journalTier: '{name} · {tier}',
  journalBody: '这件事她记住了。往后再见面，得先过这一道。',
  journalClear: '{name} · 揭过了',
  journalClearBody: '那件事从账上划掉了。',
  /** the cast page's one-line explanation of why there is no number */
  castNote: '记恨不记数。只有事，和事过了多久。',
} as const;
