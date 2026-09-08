import type { InstrumentCategoryId } from '../../game/types';

/* ============================================================
   PROFICIENCY — words

   Every string the proficiency system can show. No gameplay code holds a
   sentence; it holds a key into this file.
   ============================================================ */

export interface CategoryText {
  name: string;
  nameEn: string;
  /** one line in the instrument detail card */
  blurb: string;
  /** what else this technique covers — descriptive only */
  examples: string;
}

export const CATEGORY_TEXT: Record<InstrumentCategoryId, CategoryText> = {
  woodwind: {
    name: '吹管',
    nameEn: 'Woodwind',
    blurb: '气与舌的活儿。练熟了一支，别的管子也听你的话。',
    examples: '笛、箫、唢呐、竖笛',
  },
  brass: {
    name: '铜管',
    nameEn: 'Brass',
    blurb: '靠嘴唇找音，练的是一口气能撑多久。',
    examples: '铜号、长号、圆号',
  },
  plucked_string: {
    name: '弹拨弦',
    nameEn: 'Plucked Strings',
    blurb: '右手拨、左手按。琵琶和吉他的手是同一双手。',
    examples: '琉特、吉他、琵琶、三弦',
  },
  keyboard: {
    name: '键盘',
    nameEn: 'Keyboard',
    blurb: '十指分工。键排得越像，换琴就越不费劲。',
    examples: '手风琴、簧风琴、钢琴',
  },
  hammered_string: {
    name: '击弦',
    nameEn: 'Hammered Strings',
    blurb: '用竹签或槌子敲弦，练的是手腕的准头。',
    examples: '扬琴、锤击琴',
  },
  plucked_zither: {
    name: '拨弦琴桌',
    nameEn: 'Plucked Zither',
    blurb: '琴身平放，义甲扫过一整排弦。',
    examples: '古筝、古琴、瑟',
  },
  bowed_folk: {
    name: '拉弦（民间）',
    nameEn: 'Bowed Folk Strings',
    blurb: '弓夹在弦间，音准全靠指腹的记性。',
    examples: '二胡、板胡、马头琴',
  },
  violin_family: {
    name: '提琴',
    nameEn: 'Violin Family',
    blurb: '同一套指板逻辑，从小提琴一路到大提琴。',
    examples: '小提琴、中提琴、大提琴',
  },
  harp_lyre: {
    name: '竖琴与里拉',
    nameEn: 'Harps & Lyres',
    blurb: '空弦，不按指板。练的是记住哪根弦在哪儿。',
    examples: '竖琴、里拉、箜篌',
  },
  lamellophone: {
    name: '簧片拨奏',
    nameEn: 'Lamellophone',
    blurb: '拇指弹金属片。学得快，练到头也不容易。',
    examples: '卡林巴、姆比拉',
  },
  percussion: {
    name: '打击',
    nameEn: 'Percussion',
    blurb: '不管什么鼓，先练稳，再练花。',
    examples: '手鼓、腰鼓、铃',
  },
};

/** tier labels, index-aligned with PROFICIENCY_VALUES.tierAt */
export const TIER_LABELS = ['生手', '入门', '熟手', '好手', '名手', '入化', '通神'];

export const PROFICIENCY_TEXT = {
  /* --- the instrument detail card in 行囊 --- */
  card: {
    profLabel: '熟练',
    effectiveLabel: '实际手感',
    categoryLabel: '同类加成',
    ownLabel: '自身',
    bonusHint: (step: number, bonus: number) =>
      `每练满 ${step} 点，这一类乐器永久 +${bonus}% 底子。`,
    inHand: '在手',
    masteredTag: '通神',
    earnHint: (pct: number) => `熟练带来的收入加成 +${pct}%`,
    rarityHint: (pct: number) => `珍稀带来的收入加成 +${pct}%`,
    practiceHint: (rate: string) => `照现在的演奏方式，每小时约练 ${rate} 点。`,
    spiritLocked: '据说练到通神，这把琴会自己说话。',
    spiritAwake: '琴里的那位已经现身过了。',
    untouched: '还没正经练过。',
  },
  /* --- what gets written in the journal --- */
  journal: {
    milestoneTitle: (inst: string) => `${inst} · 又上一层`,
    milestoneBody: (inst: string, cat: string, bonus: number, total: number) =>
      `${inst}练到了 ${Math.round(total)} 点。手上的门道也传给了同类——${cat}整体底子 +${bonus}%。`,
    masterTitle: (inst: string) => `${inst} · 通神`,
    masterBody: (inst: string) =>
      `${inst}再没有需要你想的地方了。手比脑子快，曲子自己往外走。`,
  },
  /* --- the collect sheet line --- */
  collect: {
    label: '手上的琴',
    line: (inst: string, to: number, gained: number) =>
      `${inst} ${Math.round(to)}%${gained >= 0.1 ? `（+${gained.toFixed(1)}）` : ''}`,
    mastered: (inst: string) => `${inst} 已通神`,
  },
  /* --- the rate breakdown rows --- */
  rates: {
    prof: '熟练',
    rarity: '珍稀',
  },
};
