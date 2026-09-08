import type { MoodTag } from '../../game/types';

/* ============================================================
   THE EIGHTY-ONE — registry

   Your people are gone. What they left is a library: nine volumes of
   nine leaves, eighty-one pieces that do more than sound nice. Every
   one of them was taken. They are out there, in kiln ash and ledger
   covers and a fisherman's window paper, and the whole of the main line
   is one long errand to bring them home.

   Content module rules apply (docs/ARCHITECTURE.md):

     registry.ts   what exists — volumes, leaves, ids, regions
     values.ts     how often it is found and what it is worth
     text.ts       every word the player reads about it

   A leaf id is `sc_<volume no>_<leaf no>`, one-based, so a save can be
   read by eye. Nothing else in the game may build a leaf id by hand.
   ============================================================ */

export interface ScoreVolume {
  id: string;
  /** 1..9, the order the volumes were bound in */
  no: number;
  name: string;
  nameEn: string;
  /** the region this volume was scattered into */
  town: string;
  moods: MoodTag[];
  /** what this volume was *for*, in your grandmother's words */
  lore: string;
  /** the rumour shown over the leaves you have not found yet */
  rumor: string;
  /** the piece the nine leaves become once they are back together */
  song: string;
  /** nine leaf titles, in binding order */
  leaves: string[];
}

export const SCORE_VOLUMES: ScoreVolume[] = [
  {
    id: 'vol_tide',
    no: 1,
    name: '一卷 · 潮',
    nameEn: 'Volume of Tides',
    town: 'saltide',
    moods: ['sea', 'city'],
    lore: '第一卷是给水听的。据说弹全了，船在雾里也能找回自己的缆桩。',
    rumor: '盐汐港的东西从不离开盐汐港——只是换个人压在箱底。',
    song: 'song_vol_tide',
    leaves: ['《系缆》', '《退潮三叠》', '《咸雨》', '《舟眠》', '《浮标夜话》', '《盐花》', '《沉船的呼吸》', '《渡口无人》', '《潮眼》'],
  },
  {
    id: 'vol_wheat',
    no: 2,
    name: '二卷 · 麦',
    nameEn: 'Volume of Grain',
    town: 'millbrook',
    moods: ['wind', 'festive'],
    lore: '第二卷是给活人听的。婚丧嫁娶、开镰收仓，一年里最要紧的日子都在这九页里。',
    rumor: '磨坊村的人不识谱，但识纸——好纸都拿去糊了窗和账本。',
    song: 'song_vol_wheat',
    leaves: ['《扬场》', '《风车八拍》', '《谷仓夜灯》', '《镰下小调》', '《雀阵》', '《碾盘》', '《晒场月》', '《稻草人立正》', '《麦浪最后一寸》'],
  },
  {
    id: 'vol_petal',
    no: 3,
    name: '三卷 · 樱',
    nameEn: 'Volume of Petals',
    town: 'sakuraminato',
    moods: ['floral', 'city', 'melancholy'],
    lore: '第三卷最短，也最贵。它不是写给人听的，是写给要走的人听的。',
    rumor: '樱水町的抄谱人抄过太多东西，连自己抄过什么都忘了。',
    song: 'song_vol_petal',
    leaves: ['《落瓣数》', '《桥影》', '《伞骨谣》', '《茶烟》', '《春汛》', '《纸窗雨》', '《渡樱》', '《一枝入水》', '《花落无声》'],
  },
  {
    id: 'vol_lamp',
    no: 4,
    name: '四卷 · 灯',
    nameEn: 'Volume of the Watch',
    town: 'tidecall',
    moods: ['night', 'sea', 'melancholy'],
    lore: '第四卷是守夜用的。你的族人相信，只要有人整夜在弹，就没有船会走错。',
    rumor: '灯塔的记录本一年一册，纸不够的时候，塔里的人就用手边最厚的那种。',
    song: 'song_vol_lamp',
    leaves: ['《点灯》', '《十二时慢》', '《雾里号角》', '《礁语》', '《守夜人的脚步》', '《转灯》', '《海图折角》', '《鸥去》', '《灯芯将尽》'],
  },
  {
    id: 'vol_ember',
    no: 5,
    name: '五卷 · 火',
    nameEn: 'Volume of Embers',
    town: 'emberkiln',
    moods: ['city', 'festive'],
    lore: '第五卷是给器物听的。据说照着它弹，烧出来的东西不裂。窑工们后来只当是迷信。',
    rumor: '窑火不挑纸。烧到最后，什么都变成灰里一片黑边。',
    song: 'song_vol_ember',
    leaves: ['《开窑》', '《鼓风》', '《陶土呼吸》', '《炉前对饮》', '《釉裂》', '《铁砧三响》', '《火舌绕梁》', '《炭上足印》', '《余烬》'],
  },
  {
    id: 'vol_sand',
    no: 6,
    name: '六卷 · 沙',
    nameEn: 'Volume of Sand',
    town: 'moonsand',
    moods: ['desert', 'sky', 'night'],
    lore: '第六卷是走夜路的人抄走的。它记的不是旋律，是节奏——什么时候该停，什么时候不能停。',
    rumor: '商队什么都换，最舍不得换的是能让骆驼安静下来的东西。',
    song: 'song_vol_sand',
    leaves: ['《驼铃引》', '《沙下门》', '《星落》', '《旱井》', '《风蚀》', '《夜行商队》', '《海市》', '《骨笛》', '《沙记名》'],
  },
  {
    id: 'vol_cloud',
    no: 7,
    name: '七卷 · 云',
    nameEn: 'Volume of Clouds',
    town: 'cloudcloister',
    moods: ['cloud', 'sky', 'holy'],
    lore: '第七卷被寺里收着，抄了一遍又一遍，抄得比原本还多。可原本只有一份。',
    rumor: '云顶寺的僧人不说藏了什么，只说"抄本可以看，原本不在人间"。',
    song: 'song_vol_cloud',
    leaves: ['《晨钟未响》', '《石阶数》', '《云海翻》', '《一盏茶》', '《长明》', '《山门闭》', '《不下山》', '《云中鹤》', '《无声颂》'],
  },
  {
    id: 'vol_ice',
    no: 8,
    name: '八卷 · 冰',
    nameEn: 'Volume of Ice',
    town: 'frostweave',
    moods: ['ice', 'night', 'holy'],
    lore: '第八卷是全套里最难的一卷。你的族人只在冬至弹它，弹完就把它冻起来——他们说，让它睡。',
    rumor: '冻湖底下有过一座城。城里的东西，冰会替它保管。',
    song: 'song_vol_ice',
    leaves: ['《结冰》', '《冰裂纹》', '《极光低语》', '《雪盲》', '《湖心灯》', '《冻弦》', '《呼气成霜》', '《破冰》', '《冰下城》'],
  },
  {
    id: 'vol_bone',
    no: 9,
    name: '九卷 · 骨',
    nameEn: 'Volume of Bone',
    town: 'whalebone',
    moods: ['sky', 'sea', 'holy'],
    lore: '第九卷没人见过全本。传说它不是写下来的，是听下来的——听云里的东西唱，一句一句记。',
    rumor: '鲸骨集的摊主说：这一卷不用找。找齐前八卷，它自己会来找你。',
    song: 'song_vol_bone',
    leaves: ['《鲸语》', '《肋骨拱门》', '《潜行》', '《深处无光》', '《洄游》', '《骨上刻痕》', '《坠落》', '《鲸落成林》', '《终章无谱》'],
  },
];

export const VOLUME_MAP: Record<string, ScoreVolume> = Object.fromEntries(
  SCORE_VOLUMES.map((v) => [v.id, v]),
);

export interface ScoreLeaf {
  id: string;
  /** volume id */
  vol: string;
  /** 1..9 inside the volume */
  no: number;
  name: string;
  /** the region it was scattered into, copied from the volume for lookup speed */
  town: string;
  moods: MoodTag[];
}

/** all eighty-one, flattened. Derived on purpose: the volumes are the truth. */
export const SCORES: ScoreLeaf[] = SCORE_VOLUMES.flatMap((v) =>
  v.leaves.map((name, i) => ({
    id: `sc_${v.no}_${i + 1}`,
    vol: v.id,
    no: i + 1,
    name,
    town: v.town,
    moods: v.moods,
  })),
);

export const SCORE_MAP: Record<string, ScoreLeaf> = Object.fromEntries(SCORES.map((s) => [s.id, s]));

export const SCORE_TOTAL = SCORES.length; // 81
export const VOLUME_SIZE = 9;

/** every leaf id of one volume, in order */
export const leavesOf = (volId: string): ScoreLeaf[] => SCORES.filter((s) => s.vol === volId);

/** the volume a region holds, if any */
export const volumeOfTown = (town: string): ScoreVolume | undefined =>
  SCORE_VOLUMES.find((v) => v.town === town);
