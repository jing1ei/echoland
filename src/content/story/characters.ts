import type { Character } from '../../game/story/types';

/* ============================================================
   CAST

   Affection ("好感") is a plain 0..∞ counter per person. Tiers are
   thresholds, not separate state, so tuning a tier never invalidates
   a save. Tier 0 is always "stranger" at 0.

   Bond scenes are gated on `{ k:'tier', who, min }` rather than raw
   numbers so the writing and the numbers can move independently.
   ============================================================ */

const TIERS_STD = [
  { at: 0, label: '生面孔' },
  { at: 10, label: '面熟' },
  { at: 26, label: '说得上话' },
  { at: 50, label: '交好' },
  { at: 84, label: '知己' },
  { at: 130, label: '不必说透' },
];

export const CHARACTERS: Character[] = [
  {
    id: 'ch_su',
    name: '苏芹',
    nameEn: 'Su Qin',
    role: '断桨酒馆老板娘',
    home: 'saltide',
    blurb:
      '记账记了十九年，从没催过谁。她说催是没用的，潮水会催。左手小指第一节缺了一段，问就说是切鱼切掉的。',
    look: {
      skin: '#e8c3a0',
      hair: '#2c2029',
      hair2: '#463240',
      cut: 'bun',
      robe: '#6c5140',
      robe2: '#8d6c50',
      garb: 'apron',
      accent: '#c9915a',
      prop: 'earring',
      build: 0.5,
      years: 'adult',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_chu',
    name: '楮',
    nameEn: 'Chu',
    role: '制琴师',
    home: 'saltide',
    blurb:
      '只有一个字的名字，说是师父懒。做琴前先把木头泡进海水里，说泡过的木头知道什么叫湿气。',
    look: {
      skin: '#d9b48c',
      hair: '#3a3730',
      hair2: '#565045',
      cut: 'tail',
      robe: '#4a5a52',
      robe2: '#6a7b6d',
      garb: 'vest',
      accent: '#9fb08b',
      prop: 'glasses',
      build: 0.72,
      years: 'adult',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_que',
    name: '阿雀',
    nameEn: 'A-Que',
    role: '驿使',
    home: 'sakuraminato',
    blurb:
      '跑遍所有你去过的地方，比你早到，也比你先走。背上永远有一只没送出去的匣子，从不解释装的是什么。',
    look: {
      skin: '#e5bb95',
      hair: '#42302a',
      hair2: '#63483c',
      cut: 'crop',
      robe: '#7a4a3c',
      robe2: '#a06a4e',
      garb: 'coat',
      accent: '#dfa15c',
      prop: 'scarf',
      build: 0.42,
      years: 'young',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_jiang',
    name: '姜聿',
    nameEn: 'Jiang Yu',
    role: '灯塔守夜人',
    home: 'tidecall',
    blurb:
      '十九岁那年一场高热夺走了她的听力。她照旧守灯、照旧写谱，把手按在墙上听你弹到哪一句。',
    look: {
      skin: '#eccaa8',
      hair: '#c8cbd2',
      hair2: '#e4e7ec',
      cut: 'long',
      robe: '#3f4a63',
      robe2: '#5d6a86',
      garb: 'cloak',
      accent: '#a8c0e0',
      prop: 'ribbon',
      build: 0.38,
      years: 'adult',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_bai',
    name: '白十一',
    nameEn: 'Bai Eleven',
    role: '赌徒',
    home: 'saltide',
    blurb:
      '本名没人知道，十一是他连输十一场那年自己改的。手气差得出名，眼力好得离谱，从不赖账。',
    look: {
      skin: '#dcae86',
      hair: '#1f1c22',
      hair2: '#3b3540',
      cut: 'wild',
      robe: '#5a3540',
      robe2: '#7d4a58',
      garb: 'coat',
      accent: '#d4b062',
      prop: 'pipe',
      build: 0.62,
      years: 'adult',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_mai',
    name: '麦穗',
    nameEn: 'Maisui',
    role: '磨坊村的孩子',
    home: 'millbrook',
    blurb:
      '偷过三袋麦子，被你抓住过一次，从此认定你是同伙。跑得比风车转得快，问什么都答"不知道"。',
    look: {
      skin: '#eec59c',
      hair: '#8d6a3c',
      hair2: '#b18b52',
      cut: 'bob',
      robe: '#7d7448',
      robe2: '#9c9560',
      garb: 'wrap',
      accent: '#e0c070',
      prop: 'bandage',
      build: 0.2,
      years: 'young',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_umbrella',
    name: '卖伞的姑娘',
    nameEn: 'The Umbrella Girl',
    role: '只在雨里出现',
    home: 'oldlamp',
    blurb:
      '雨天才摆摊，卖的伞从不要钱，只问一句"你要往哪走"。天晴时旧灯巷里没有这个摊位，问谁都说没见过。',
    look: {
      skin: '#efd2b4',
      hair: '#26232c',
      hair2: '#443f4d',
      cut: 'braid',
      robe: '#4b4a5e',
      robe2: '#6d6b84',
      garb: 'wrap',
      accent: '#b9c4d8',
      prop: 'ribbon',
      build: 0.34,
      years: 'young',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_xiu',
    name: '释岫',
    nameEn: 'Shi Xiu',
    role: '云台行者',
    home: 'cloudcloister',
    blurb:
      '在云台上住了多久他自己也算不清。不化缘、不讲经，只在有人上来的时候烧一壶水。',
    look: {
      skin: '#d2a97f',
      hair: '#584f48',
      hair2: '#756a60',
      cut: 'hood',
      robe: '#5c5445',
      robe2: '#7d7460',
      garb: 'robe',
      accent: '#c2a878',
      prop: 'beads',
      build: 0.55,
      years: 'old',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_dune',
    name: '老驼',
    nameEn: 'Camelback',
    role: '沙路商队的老人',
    home: 'moonsand',
    blurb:
      '走沙路四十年，一句话说三遍。他不让人挖沙下面的东西，自己却整夜坐在那儿等。撒水的手法很像在给谁上供。',
    look: {
      skin: '#c79a6d',
      hair: '#b9b2a4',
      hair2: '#d6cfc0',
      cut: 'hood',
      robe: '#8a6f4c',
      robe2: '#a98a60',
      garb: 'cloak',
      accent: '#d9b46a',
      prop: 'pipe',
      build: 0.66,
      years: 'old',
    },
    tiers: TIERS_STD,
  },
  {
    id: 'ch_fish',
    name: '凿冰人',
    nameEn: 'Ice-cutter',
    role: '冻湖上的渔人',
    home: 'frostweave',
    blurb:
      '凿了一辈子一尺宽的洞。他说看见湖底那些灯的人只有两种下场，说的时候把自己也算进去了。',
    look: {
      skin: '#dcae86',
      hair: '#4a4139',
      hair2: '#655a4e',
      cut: 'crop',
      robe: '#3f5560',
      robe2: '#5d7784',
      garb: 'wrap',
      accent: '#9fc4cd',
      prop: 'scarf',
      build: 0.86,
      years: 'adult',
    },
    tiers: TIERS_STD,
  },
];

/* Tier maths used to live here. It is logic, not content, so it moved to
   src/game/story/tiers.ts — this file is now pure cast data. */

