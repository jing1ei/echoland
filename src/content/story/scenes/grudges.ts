import type { Scene } from '../../../game/story/types';

/* ============================================================
   GRUDGE SCENES

   The other half of the relationship system. Affection scenes ask you
   to be present; these ask what you do when nobody is watching, and
   then let the answer sit there.

   Three rules the whole arc follows:

   1. A grudge is *earned in two beats*, never one. You take the coin in
      one scene and get found out in the next, so the moment it lands the
      player already knows why. A stat that moves the instant you tap is
      a punishment; a stat that moves when you are caught is a story.
   2. Owning up always costs less than lying. Every escalation has a
      cheaper honest branch, and the honest branch still leaves something
      behind — because it should.
   3. There is a way back, and it is work. Easing a grudge is repeatable
      and costs money or effort; wiping it out entirely needs one
      authored scene per person, gated on the relationship being worth
      saving in the first place. See `forgive` in game/story/types.ts.

   Enmity does not lower affection anywhere in this file. 苏芹 can be
   fond of you and still keep that page in the ledger, and that is the
   most interesting state a character in this game can be in.
   ============================================================ */

export const GRUDGE_SCENES: Scene[] = [
  /* ================= 苏芹 · 多给的那一枚 ================= */
  {
    id: 'g_su_coin',
    title: '多出来的那一枚',
    line: 'side',
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '她把今晚的份数给你，转身去应付门口的客人。' },
      { t: 'say', text: '你低头数了一遍。多了一枚。' },
      {
        t: 'choose',
        prompt: '她背对着你',
        options: [
          {
            label: '「苏芹，多了一枚。」',
            do: [{ k: 'bond', who: 'ch_su', n: 4 }],
            goto: 'give',
          },
          {
            label: '收进袋里。',
            hint: '她数了十九年，未必会错第二次',
            do: [
              { k: 'coin', n: 0.6, hours: true },
              { k: 'var', id: 'v_su_took', add: 1 },
            ],
            goto: 'keep',
          },
        ],
      },
      { t: 'at', id: 'give' },
      { t: 'say', who: 'ch_su', as: 'smile', text: '……我知道。留着吧，弦总要断。' },
      { t: 'say', text: '你忽然明白，她从来没数错。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'keep' },
      { t: 'say', text: '你把那枚压在最底下。整晚它都硌着你。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '走了？路上小心。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_su_caught',
    title: '账本翻到那一页',
    line: 'side',
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '你还没坐下，她就把账本翻开推了过来。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '那天的数，你自己看。' },
      {
        t: 'choose',
        prompt: '她一直没抬头',
        options: [
          {
            label: '「是我拿了。」',
            hint: '认了还是要认',
            do: [
              { k: 'enmity', who: 'ch_su', n: 4 },
              { k: 'var', id: 'v_su_took', set: 0 },
              { k: 'flag', id: 'flag_su_owned' },
            ],
            goto: 'own',
          },
          {
            label: '「可能是我数错了。」',
            do: [
              { k: 'enmity', who: 'ch_su', n: 10 },
              { k: 'var', id: 'v_su_took', set: 0 },
              { k: 'var', id: 'v_su_lied', add: 1 },
            ],
            goto: 'lie',
          },
          {
            label: '把那枚放回柜台。',
            /* the expensive apology: it costs a night's take and it still
               leaves a mark, because being caught is the part that stays */
            need: { k: 'coin', min: 40 },
            lockNote: '身上得有那么一枚才行',
            do: [
              { k: 'coin', n: -0.9, hours: true },
              { k: 'enmity', who: 'ch_su', n: 2 },
              { k: 'var', id: 'v_su_took', set: 0 },
              { k: 'flag', id: 'flag_su_owned' },
            ],
            goto: 'back',
          },
        ],
      },
      { t: 'at', id: 'own' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '嗯。' },
      { t: 'say', text: '她合上账本。这件事到此为止——也仅仅到此为止。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'lie' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '好。那就是我数错了。' },
      { t: 'say', text: '她把那一页折了个角，没有撕。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'back' },
      { t: 'say', text: '铜板落在木头上，声音比你想的响。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '钱我收了。你坐窗边吧。' },
      { t: 'say', text: '窗边漏风。她说过的。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_su_cold',
    title: '窗边那个位置',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '她给你倒酒，倒到一半就停了。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '今天人多，你坐窗边。' },
      { t: 'say', text: '柜台这头空着。你们都看见它空着。' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_su_mend',
    title: '还没算完的那笔',
    line: 'side',
    repeatable: true,
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '店里安静。她在擦一个已经很干的杯子——你认得这个动作。' },
      {
        t: 'choose',
        prompt: '你想做点什么',
        options: [
          {
            label: '把这些天挣的一半放在柜台上。',
            need: { k: 'coin', min: 120 },
            lockNote: '得先有那么多',
            do: [
              { k: 'coin', n: -2.4, hours: true },
              { k: 'enmity', who: 'ch_su', n: -6 },
            ],
            goto: 'pay',
          },
          {
            label: '什么也不说，弹到打烊。',
            hint: '弹她不认识的那种',
            do: [
              { k: 'enmity', who: 'ch_su', n: -4 },
              { k: 'insp', n: 0.8, hours: true },
            ],
            goto: 'play',
          },
          {
            label: '「那件事，是我不对。」',
            /* the cheapest and the best, but only once it is true: saying
               it while you are still lying about it does nothing */
            if: { k: 'flag', id: 'flag_su_owned' },
            do: [{ k: 'enmity', who: 'ch_su', n: -8 }],
            goto: 'say',
          },
        ],
      },
      { t: 'at', id: 'pay' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '我不缺这个。' },
      { t: 'say', text: '她还是收了，记在了另一页上。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'play' },
      { t: 'say', text: '最后一个客人走了很久，她才把灯芯拨下来。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '还行。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'say' },
      { t: 'say', who: 'ch_su', as: 'think', text: '我知道是你不对。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '我等的是你什么时候肯说。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_su_clear',
    title: '划掉那一笔',
    line: 'bond',
    steps: [
      { t: 'enter', who: 'ch_su', side: 'left', as: 'calm' },
      { t: 'say', text: '打烊之后她没赶你走，反而把账本搬了出来。' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '前面那一页，我要划掉。你看着。' },
      { t: 'say', text: '笔尖压得很重，一条线从头拉到尾。' },
      {
        t: 'choose',
        options: [
          {
            label: '「为什么现在。」',
            do: [{ k: 'bond', who: 'ch_su', n: 3 }],
            goto: 'why',
          },
          {
            label: '看着她划完。',
            do: [{ k: 'bond', who: 'ch_su', n: 5 }],
            goto: 'watch',
          },
        ],
      },
      { t: 'at', id: 'why' },
      { t: 'say', who: 'ch_su', as: 'calm', text: '因为你后来每次进门都先看柜台这头。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'watch' },
      { t: 'say', text: '她划完，把本子合上，往你那头推了半寸。' },
      { t: 'at', id: 'out' },
      { t: 'do', do: [{ k: 'forgive', who: 'ch_su' }, { k: 'leisure', n: 3 }] },
      { t: 'say', who: 'ch_su', as: 'smile', text: '坐柜台这头。窗边漏风，我说过。' },
      { t: 'exit' },
    ],
  },

  /* ================= 阿雀 · 一封信的去处 =================
     She runs on trust, so her ladder is short (content/enmity/registry)
     and her forgiveness is binary: 阿雀 does not hold half a grudge. */
  {
    id: 'g_que_letter',
    title: '不该说的路线',
    line: 'side',
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'calm' },
      { t: 'say', text: '阿雀把匣子换到另一边肩上，压低了声音。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '这趟走哪条道，别跟人说。问了也别说。' },
      { t: 'say', text: '第二天，一个穿得很好的人在市集上问起同一件事。他手里有钱。' },
      {
        t: 'choose',
        prompt: '他等着',
        options: [
          {
            label: '「不知道。」',
            do: [{ k: 'bond', who: 'ch_que', n: 5 }],
            goto: 'keep',
          },
          {
            label: '把那条道说给他。',
            hint: '一句话，够你摆两天摊',
            do: [
              { k: 'coin', n: 3.2, hours: true },
              { k: 'enmity', who: 'ch_que', n: 6 },
              { k: 'var', id: 'v_que_sold', add: 1 },
            ],
            goto: 'sold',
          },
        ],
      },
      { t: 'at', id: 'keep' },
      { t: 'say', text: '他走了。你站在原地，忽然觉得那条道也是自己的事。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'sold' },
      { t: 'say', text: '钱是当场给的。她是三天后知道的。' },
      { t: 'enter', who: 'ch_que', side: 'right', as: 'cross' },
      { t: 'say', who: 'ch_que', as: 'cross', text: '我只问一句：值多少。' },
      { t: 'say', text: '你说了数目。她点点头，把数目记住了。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_que_cold',
    title: '这趟不捎',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'away' },
      { t: 'say', text: '她从摊子前面过，脚步没停。' },
      { t: 'say', who: 'ch_que', as: 'away', text: '有信要寄的话，去驿铺排队。' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_que_clear',
    title: '把那笔钱跑回来',
    line: 'side',
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'calm' },
      { t: 'say', text: '你把那笔钱原数放在她的匣子上。她没碰。' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '钱我不要。你替我跑一趟。' },
      {
        t: 'choose',
        options: [
          {
            label: '「跑哪。」',
            need: { k: 'coin', min: 200 },
            lockNote: '路上总要花钱',
            do: [
              { k: 'coin', n: -3.2, hours: true },
              { k: 'forgive', who: 'ch_que' },
              { k: 'bond', who: 'ch_que', n: 4 },
            ],
            goto: 'run',
          },
          {
            label: '「我不是跑腿的。」',
            do: [{ k: 'enmity', who: 'ch_que', n: 4 }],
            goto: 'no',
          },
        ],
      },
      { t: 'at', id: 'run' },
      { t: 'say', text: '两天山路，没有报酬，收信的人也不知道你是谁。' },
      { t: 'say', who: 'ch_que', as: 'smile', text: '行了。下回还敢卖我，我就把你的路线也卖了。' },
      { t: 'say', text: '她说这话的时候，是笑着的。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'no' },
      { t: 'say', who: 'ch_que', as: 'away', text: '那就算了。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },

  /* ================= 楮 · 淋了雨的那把 ================= */
  {
    id: 'g_chu_rain',
    title: '淋了雨的那把',
    line: 'side',
    steps: [
      { t: 'say', text: '雨来得快。你的琴在摊子上，钱匣在另一头。' },
      {
        t: 'choose',
        prompt: '只够抱走一样',
        options: [
          {
            label: '先抱琴，钱不管了。',
            do: [
              { k: 'coin', n: -1.2, hours: true },
              { k: 'bond', who: 'ch_chu', n: 6 },
            ],
            goto: 'lute',
          },
          {
            label: '先抱钱匣。',
            do: [
              { k: 'enmity', who: 'ch_chu', n: 8 },
              { k: 'flag', id: 'flag_chu_soaked' },
            ],
            goto: 'coin',
          },
        ],
      },
      { t: 'at', id: 'lute' },
      { t: 'say', text: '钱匣翻了，一半的铜板滚进了排水沟。琴是干的。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'coin' },
      { t: 'say', text: '雨停了。面板上鼓起一道浅浅的浪。' },
      { t: 'enter', who: 'ch_chu', side: 'left', as: 'cross' },
      { t: 'say', text: '楮把琴举到窗口看了很久，然后放下，没有拿刨子。' },
      { t: 'say', who: 'ch_chu', as: 'cross', text: '木头是活的。它记得你选了哪个。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
  {
    id: 'g_chu_mend',
    title: '自己拿刨子',
    line: 'side',
    repeatable: true,
    steps: [
      { t: 'enter', who: 'ch_chu', side: 'left', as: 'calm' },
      { t: 'say', text: '他把工具摆在长凳上，退开一步。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '你弄坏的。你自己弄。我看着。' },
      {
        t: 'choose',
        options: [
          {
            label: '自己拿刨子上手。',
            hint: '你不会，但他没打算教',
            chance: 0.55,
            do: [{ k: 'enmity', who: 'ch_chu', n: -7 }],
            goto: 'ok',
            miss: {
              goto: 'fail',
              text: '刨子啃进木头里，多了一道新伤。',
              do: [{ k: 'enmity', who: 'ch_chu', n: -2 }],
            },
          },
          {
            label: '「我赔钱行不行。」',
            need: { k: 'coin', min: 150 },
            lockNote: '赔也要赔得起',
            do: [
              { k: 'coin', n: -3, hours: true },
              { k: 'enmity', who: 'ch_chu', n: -3 },
            ],
            goto: 'pay',
          },
        ],
      },
      { t: 'at', id: 'ok' },
      { t: 'say', text: '一个下午，一层薄如纸的木屑。那道浪平了一半。' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '手还行。心也还行。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'fail' },
      { t: 'say', who: 'ch_chu', as: 'calm', text: '知道疼了吧。它也疼。' },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'pay' },
      { t: 'say', text: '他收了钱，把琴修好了，但没让你在旁边看。' },
      { t: 'at', id: 'out' },
      { t: 'exit' },
    ],
  },
];
