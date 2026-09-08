import type { MoodTag } from '../../game/types';
import type { ComposeFocus, ComposeGradeId } from './values';

/* ============================================================
   COMPOSING — text

   Names are not decoration here: a song you wrote is a song you will
   read in the repertoire list for the rest of the save, so the generator
   has to produce titles that sound like the ones a person wrote by hand.

   Two word banks per motif — a noun of place and a noun of moment — plus
   a small set of forms (调/引/谣/记). One motif gives 〈noun〉〈form〉,
   two motifs give 〈noun〉与〈noun〉. Everything is offered as three
   suggestions, and the player may type over them.
   ============================================================ */

export const COMPOSE_TEXT = {
  title: '谱曲',
  sub: '灵感攒够了，就自己写一首。',
  open: '用灵感谱一支曲',
  /** the standing note under the header */
  premise:
    '澹人不背谱，他们写谱。你手上的灵感是听来的东西：潮声、窑火、别人哭的方式。把它写下来，它就成了你的。',
  tip: '摊子的「制定策略」里可以谱曲：挑一两个「听过的东西」，说清这首是为什么写的，花灵感落笔。写出来的曲子只有你有。',

  motifLabel: '听过的东西',
  motifNone: '你还没听够。多在几个地方摆摊，或找回几页族谱。',
  focusLabel: '这首是为什么写的',
  gradeLabel: '写到什么程度',
  nameLabel: '题名',
  nameHint: '不改也行，用现成的。',
  reroll: '换几个名字',
  costLabel: '灵感',
  leisureLabel: '闲暇',
  submit: '落笔',
  notEnough: '灵感不够',
  notEnoughLeisure: '闲暇不够，写不下去',
  doneTitle: '写完了',
  doneNote: '收进曲目单，随时可以拿出来弹。',

  grades: {
    draft: { name: '草稿', note: '一个下午的东西。能弹，也就是能弹。' },
    fair: { name: '定稿', note: '改到自己肯署名。这是大多数曲子的样子。' },
    lifework: { name: '心血', note: '写完手会抖。写不出第二首一样的。' },
  } as Record<ComposeGradeId, { name: string; note: string }>,

  foci: {
    coin: { name: '为了钱', note: '好听不好听另说，帽子里会满。' },
    insp: { name: '为了自己', note: '弹它的时候你在想别的事，想出来的东西更多。' },
    renown: { name: '为了被记住', note: '这一带的人会开始念你的名字。' },
    event: { name: '为了招人', note: '奇怪的人爱在奇怪的曲子前面站住。' },
    leisure: { name: '为了喘口气', note: '弹它不费手，弹完还有力气逛街。' },
  } as Record<ComposeFocus, { name: string; note: string }>,

  /** the finished song's description, assembled from where and why */
  desc: (place: string, focus: ComposeFocus) => {
    const why: Record<ComposeFocus, string> = {
      coin: '写它的时候你在算账。',
      insp: '写它的时候你没想给谁听。',
      renown: '写它的时候你在想被记住是什么样。',
      event: '写它的时候你希望有人停下来。',
      leisure: '写它的时候你只想坐一会儿。',
    };
    return `你在${place}写的。${why[focus]}`;
  },
} as const;

/* ------------------------------------------------------------
   Name banks
   ------------------------------------------------------------ */

/** nouns of place / thing, by motif */
export const MOTIF_NOUNS: Record<MoodTag, string[]> = {
  sea: ['潮', '缆', '雾港', '咸风', '浪口'],
  wind: ['风车', '麦垄', '扬场', '穿堂风', '旗'],
  night: ['守夜', '灯芯', '子时', '更漏', '长夜'],
  floral: ['落瓣', '花街', '一枝', '春汛', '纸窗'],
  desert: ['驼铃', '沙下', '旱井', '风蚀', '海市'],
  cloud: ['云海', '山门', '石阶', '晨钟', '一盏茶'],
  ice: ['冰裂', '冻弦', '雪盲', '湖心', '呼气'],
  ruin: ['断柱', '空堂', '旧钟', '荒阶', '无名碑'],
  rain: ['雨檐', '伞骨', '积水', '湿石板', '两个人'],
  sky: ['星落', '云上', '飞过', '高处', '天海'],
  forest: ['林道', '萤', '树冠', '苔阶', '鹿径'],
  city: ['长街', '摊前', '酒馆', '巷口', '人堆'],
  holy: ['长明', '无声颂', '祠前', '香灰', '合掌'],
  melancholy: ['未送', '空位', '旧信', '别处', '回头'],
  festive: ['花灯', '鼓点', '收割节', '人声', '连夜'],
};

/** nouns of moment — the second half of a two-motif title */
export const MOTIF_MOMENTS: Record<MoodTag, string[]> = {
  sea: ['退潮', '起雾', '开船'],
  wind: ['扬起', '停风', '打谷'],
  night: ['熄灯', '换更', '天将亮'],
  floral: ['花落', '开尽', '一阵香'],
  desert: ['过夜', '起沙', '找水'],
  cloud: ['云散', '入定', '下山'],
  ice: ['结冰', '破冰', '解冻'],
  ruin: ['塌下', '长草', '有人来过'],
  rain: ['落雨', '雨停', '屋檐滴完'],
  sky: ['放晴', '星起', '飞远'],
  forest: ['入林', '出林', '有光落下'],
  city: ['散市', '打更', '有人赏钱'],
  holy: ['敲钟', '起香', '闭门'],
  melancholy: ['无人应', '想起', '算了'],
  festive: ['开场', '散场', '再来一遍'],
};

/** the form a short piece takes */
export const FORMS = ['小调', '引', '谣', '记', '断句', '慢', '三叠', '夜行'];
