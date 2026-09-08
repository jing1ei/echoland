/* ============================================================
   INSTRUMENTS — words

   Every string a player can read about an instrument. No numbers, no
   asset paths, no conditions. Translating the game means translating
   files like this one and nothing else.
   ============================================================ */

export interface InstrumentText {
  name: string;
  nameEn: string;
  desc: string;
}

export const INSTRUMENT_TEXT: Record<string, InstrumentText> = {
  lute_worn: {
    name: '旧木鲁特琴',
    nameEn: 'Worn Lute',
    desc: '琴颈上有三道刻痕，据说是前主人赊过三次账。稳定、便宜、什么都不出彩。',
  },
  guitar_road: {
    name: '行路吉他',
    nameEn: 'Roadworn Guitar',
    desc: '背带磨出了两层颜色。谁都能跟着它唱两句，这就是它最贵的地方。',
  },

  flute_silver: {
    name: '银笛',
    nameEn: 'Silver Flute',
    desc: '声音薄而远，风越大它越站得住。灵感稳产，赚钱一般。',
  },
  xiao_mist: {
    name: '雾中箫',
    nameEn: 'Mistreed Xiao',
    desc: '竹子在阴处长了十年，吹起来像是替雨说话。人听着容易走神。',
  },
  suona_kiln: {
    name: '火门唢呐',
    nameEn: 'Kilnmouth Suona',
    desc: '响得不讲道理。婚丧嫁娶都用它，一开口，半条街的钱都往这边走。',
  },

  horn_post: {
    name: '驿站铜号',
    nameEn: 'Posthouse Horn',
    desc: '本来是催马的。你把它吹成了曲子，路过的车夫会莫名地摘帽子。',
  },
  trombone_harbor: {
    name: '港口长号',
    nameEn: 'Harbour Trombone',
    desc: '拉杆上还有盐渍。它压得住汽笛，也压得住吵架。',
  },

  accordion: {
    name: '折风手风琴',
    nameEn: 'Windfold Accordion',
    desc: '一拉开就有人围过来。热闹场合的印钞机，安静场合的灾难。',
  },
  harmonium_pilgrim: {
    name: '行脚簧风琴',
    nameEn: 'Pilgrim Harmonium',
    desc: '背在身上像背一间小房子。踏板一动，庙里的人会以为是自己的心跳。',
  },

  yangqin_moon: {
    name: '月纹扬琴',
    nameEn: 'Moongrain Yangqin',
    desc: '两支竹槌敲下去，声音像有人在很远的地方撒了一把铜钱。',
  },

  guzheng_river: {
    name: '江声古筝',
    nameEn: 'Riversong Guzheng',
    desc: '弦多得让人手心出汗。弹对了一段，听众会先安静下来，然后才鼓掌。',
  },

  erhu_dusk: {
    name: '暮色二胡',
    nameEn: 'Duskwood Erhu',
    desc: '两根弦，能把一整个人的一辈子说完。街口老人听见就不走了。',
  },

  violin_ash: {
    name: '灰木小提琴',
    nameEn: 'Ashwood Violin',
    desc: '琴身轻得不像话。站着拉一小时，手臂会记得这件事三天。',
  },
  cello_tide: {
    name: '潮声大提琴',
    nameEn: 'Tidesong Cello',
    desc: '搬它比背它累。但它一响，整条码头的人都会慢半拍。',
  },

  harp_tide: {
    name: '潮纹竖琴',
    nameEn: 'Tidegrain Harp',
    desc: '弦是用旧渔线搓的，弹起来还有咸味。海边神物。',
  },
  lyre_star: {
    name: '星砂里拉',
    nameEn: 'Starsand Lyre',
    desc: '沙丘底下挖出来的，弦不知是什么做的，夜里会自己微微响。',
  },
  lyre_whale: {
    name: '鲸骨里拉',
    nameEn: 'Whalebone Lyre',
    desc: '低音低到听不见，但整个山谷都会跟着一起震。传说中的最后一把琴。',
  },

  kalimba: {
    name: '雨铃拇指琴',
    nameEn: 'Rainchime Kalimba',
    desc: '雨声会替它伴奏。潮湿的地方它最值钱。',
  },

  drum_kiln: {
    name: '窑腹鼓',
    nameEn: 'Kilnbelly Drum',
    desc: '用报废的窑砖箍的鼓身，声音闷得像地脉。人多的地方它压得住场。',
  },
};
