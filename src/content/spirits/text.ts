/* ============================================================
   INSTRUMENT SPIRITS — text

   Every word a spirit says lives here. game/systems/spirits.ts turns
   these blocks into real AVG scenes, so writing a new spirit means
   filling in this shape — never touching the interpreter, the router or
   the scene tables.

   `open` lines are narration before the figure appears; `greet` lines
   are spoken. The choice is always the same shape — take what it
   offers, or refuse kindly — because that is the beat: an instrument
   asking to be kept, and you answering it.
   ============================================================ */

export interface SpiritDialogue {
  title: string;
  /** narration, before anyone is on stage */
  open: string[];
  /** spoken by the spirit, once it is standing there */
  greet: string[];
  prompt: string;
  acceptLabel: string;
  acceptHint?: string;
  accept: string[];
  declineLabel: string;
  declineHint?: string;
  decline: string[];
  /** narration after both branches rejoin */
  close: string[];
}

export interface SpiritVisitDialogue {
  title: string;
  open: string[];
  lines: string[];
  close: string[];
}

export interface SpiritText {
  name: string;
  nameEn: string;
  /** shown under the name in the cast list */
  role: string;
  blurb: string;
  awaken: SpiritDialogue;
  visit: SpiritVisitDialogue;
}

/** spirits keep their own ladder — they do not warm up the way people do */
export const SPIRIT_TIERS = [
  { at: 0, label: '琴上的声音' },
  { at: 12, label: '肯露面' },
  { at: 34, label: '愿意同行' },
  { at: 66, label: '不必再问' },
  { at: 110, label: '同一个人' },
];

export const SPIRIT_TEXT: Record<string, SpiritText> = {
  /* ---------------------------------------------------------- */
  sp_star: {
    name: '砂',
    nameEn: 'Sha',
    role: '星陨琴里的声音',
    blurb:
      '你把这张琴弹到了尽头，尽头有人。她说她在琴里躺了很久，久到忘了自己是不是琴。她数得清天上每一颗掉下来的东西，却记不住自己的名字，于是用你第一次弹错的那个音当名字。',
    awaken: {
      title: '弦上的人',
      open: [
        '你已经把这张琴弹到没有生手的地方了。闭着眼也不会错。',
        '这一夜的最后一个音按下去，它没有停。',
        '它一直响，响到你把手拿开，响到沙丘上的风都绕着走。',
      ],
      greet: [
        '「你终于弹到底了。」',
        '「我在这根弦下面待了很久。上一个把我弹到底的人，死在去云顶的路上。」',
        '「我不要钱，也不吃东西。我只想跟着还在弹的人。」',
      ],
      prompt: '她站在你的琴影里，等一句话',
      acceptLabel: '那你跟着我。',
      acceptHint: '她会留下一样东西',
      accept: [
        '「好。」她说得很轻，像怕把这句话弹坏。',
        '她从琴颈上解下一枚铜签，塞进你手里。铜签是温的。',
        '「以后你听见琴自己响，那是我在。别怕。」',
      ],
      declineLabel: '我一个人走惯了。',
      declineHint: '她不会生气',
      decline: [
        '「我知道。」她笑了一下，「弹到底的人都这么说。」',
        '「那你把琴带好。我不缠人，我只是在这儿。」',
        '她退回弦上的时候，往你的钱袋里丢了几个铜板。你没看清是从哪儿来的。',
      ],
      close: ['沙丘重新安静下来。你的手指还在抖，但不是因为累。'],
    },
    visit: {
      title: '她又出来了',
      open: ['你正在收摊。第七根弦自己响了一下。'],
      lines: [
        '「今天那首慢了半拍。」她坐在你的琴箱上，脚不落地。',
        '「不是坏事。慢半拍的时候，听的人才会抬头。」',
        '「继续弹。我看着。」',
      ],
      close: ['等你抬头，琴箱上没人，只有一层薄薄的沙，摆成一个音符的形状。'],
    },
  },

  /* ---------------------------------------------------------- */
  sp_whale: {
    name: '澜',
    nameEn: 'Lan',
    role: '鲸落琴里的声音',
    blurb:
      '这张琴的木头来自一头死在天上的鲸。它把自己最后一段声音留在了木头里，如今有人把它弹活了。他说话很慢，慢得像隔着水，讲的全是很久以前海还在天上的事。',
    awaken: {
      title: '木头里的海',
      open: [
        '这张琴的低音一向闷。今晚它不闷了，它在下沉。',
        '你按住最后一个和弦，声音没有散，它往下走，一直走到你听不见的地方。',
        '然后有人从那个地方走上来。',
      ],
      greet: [
        '「你把我弹醒了。」他浑身是湿的，地上却没有水。',
        '「这块木头是我的骨。我死在天上那年，海还没退。」',
        '「弹得够好的人我等了三百年。我不要你可怜我，我要你别停。」',
      ],
      prompt: '他站在你面前，比你高出一头，滴着不存在的水',
      acceptLabel: '我不停。上来吧。',
      acceptHint: '他会给你一件调音的东西',
      accept: [
        '他点头，很慢。「那我替你听音。你的耳朵会越来越准。」',
        '他把一支音叉放在你摊前，敲了一下。整条街的狗都醒了。',
        '「以后你弹低音的时候，往下听。我在下面。」',
      ],
      declineLabel: '我怕我担不起。',
      declineHint: '他见过更没用的人',
      decline: [
        '「担不起也弹得挺好。」他说，「人总把这两件事当一件。」',
        '「我不上来。你继续弹就够了。」',
        '他退回木头里的时候，琴腹上多了一道水纹，擦不掉。',
      ],
      close: ['你把琴收进箱子。箱子比刚才沉了一点，也可能是你的手软了。'],
    },
    visit: {
      title: '下面有人在听',
      open: ['低音弦自己晃了一下，像被水推的。'],
      lines: [
        '「刚才那段，」他从琴腹的水纹里说话，「你憋着一口气弹的。」',
        '「不必憋。海从来不憋气，海就是一直在那儿。」',
        '「明天弹给早市的人听。他们不懂，但他们要出海。」',
      ],
      close: ['水纹淡了一点。你记住了他说的话，也记住了那句你不太懂的。'],
    },
  },
};

/** the satchel's own wording for the spirit hint on an instrument card */
export const SPIRIT_UI_TEXT = {
  hosted: '此琴有灵',
  awake: '琴灵已现',
  gate: '弹至圆满，或许有人应声',
  ready: '圆满了。它随时可能出声',
};
