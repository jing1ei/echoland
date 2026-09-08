import type { Scene } from '../../../game/story/types';

/* ============================================================
   AMBIENT SCENES

   The part of the story you cannot farm. Every one of these sits
   behind a condition AND a probability, so meeting the requirement
   only buys a ticket. `a_star_wish` is the extreme case: right place,
   right sky, right weather, and then a 4% roll.

   Ambient scenes are cheap to add and are where a world stops feeling
   like a spreadsheet, so this file is meant to grow.
   ============================================================ */

export const AMBIENT_SCENES: Scene[] = [
  /* ---------------------------------------------------------- */
  {
    id: 'a_cat',
    title: '瞎眼猫',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '那只瞎眼的猫又上了缆桩，坐得很直，朝着你，但眼睛是空的。' },
      { t: 'say', text: '它一动不动听完了整首。' },
      {
        t: 'choose',
        options: [
          {
            label: '把今天的第一枚铜板换成一条鱼。',
            hint: '猫不吃铜板',
            need: { k: 'coin', min: 20 },
            lockNote: '你身上连买鱼的钱都没有',
            do: [{ k: 'coin', n: -20 }, { k: 'insp', n: 0.8, hours: true }, { k: 'var', id: 'v_cat_fed', add: 1 }],
            goto: 'fish',
          },
          {
            label: '继续弹，弹到它走。',
            do: [{ k: 'insp', n: 0.5, hours: true }],
            goto: 'play',
          },
        ],
      },
      { t: 'at', id: 'fish' },
      { t: 'say', text: '它吃了一半，把剩下的推到你琴箱边上。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'play' },
      { t: 'say', text: '它走的时候在你琴箱边留了半条鱼。你不知道它从哪弄来的。' },
      { t: 'at', id: 'end' },
      {
        t: 'say',
        if: { k: 'var', id: 'v_cat_fed', min: 3 },
        text: '它脖子上有个旧项圈，铜牌磨得快平了，上面刻着一个不是你起的名字。',
        do: [{ k: 'item', id: 'it_catcollar' }, { k: 'flag', id: 'flag_cat_found' }],
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_umbrella',
    title: '雨里的伞摊',
    line: 'ambient',
    steps: [
      { t: 'say', text: '雨下得直，一点风都没有。巷口多了一个摊位，昨天没有。' },
      { t: 'enter', who: 'ch_umbrella', side: 'right', as: 'calm' },
      { t: 'do', do: [{ k: 'meet', who: 'ch_umbrella' }, { k: 'flag', id: 'flag_umbrella_met' }] },
      { t: 'say', who: 'ch_umbrella', as: 'calm', text: '你要往哪走？' },
      { t: 'say', text: '「问这个干什么。」' },
      { t: 'say', who: 'ch_umbrella', as: 'smile', text: '往哪走，就该用哪把伞。' },
      {
        t: 'choose',
        prompt: '你怎么答',
        options: [
          {
            label: '「往北。麦子熟的地方。」',
            do: [
              { k: 'bond', who: 'ch_umbrella', n: 5 },
              { k: 'item', id: 'it_umbrella_paper' },
            ],
            goto: 'gift',
          },
          {
            label: '「不知道。走到哪算哪。」',
            do: [
              { k: 'bond', who: 'ch_umbrella', n: 7 },
              { k: 'item', id: 'it_umbrella_paper' },
            ],
            goto: 'nowhere',
          },
          {
            label: '「你先说你要往哪走。」',
            hint: '她大概不会答',
            chance: 0.35,
            do: [{ k: 'bond', who: 'ch_umbrella', n: 9 }],
            goto: 'herside',
            miss: {
              goto: 'dodge',
              text: '她笑了一下，把伞往你手里一塞，没答。',
            },
          },
        ],
      },
      { t: 'at', id: 'gift' },
      { t: 'say', text: '她挑了一把最素的给你，一个花样都没有。' },
      { t: 'say', who: 'ch_umbrella', as: 'calm', text: '北边风大。花样会被撕掉，素的不会。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'nowhere' },
      { t: 'say', who: 'ch_umbrella', as: 'smile', text: '那这把。' },
      { t: 'say', text: '也是最素的那一把。' },
      { t: 'say', text: '「区别在哪。」' },
      { t: 'say', who: 'ch_umbrella', as: 'laugh', text: '没有区别。我就想给你这把。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'herside' },
      { t: 'say', who: 'ch_umbrella', as: 'away', text: '……' },
      { t: 'say', who: 'ch_umbrella', as: 'calm', text: '往有人等的地方。' },
      { t: 'say', text: '「有人等你？」' },
      { t: 'say', who: 'ch_umbrella', as: 'sad', text: '还没有。所以我一直在走。' },
      { t: 'do', do: [{ k: 'item', id: 'it_umbrella_paper' }, { k: 'insp', n: 3, hours: true }] },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'dodge' },
      { t: 'say', text: '你想给钱，她已经在收摊了。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
      { t: 'say', text: '你回头看的时候，摊位没了。雨还在下。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_star_wish',
    title: '掉下来的那一颗',
    line: 'ambient',
    steps: [
      { t: 'say', text: '你抬头的时候正好看见。' },
      { t: 'say', text: '不是一道线，是一整块亮起来又暗下去，慢得离谱，像有人在天上翻了一页纸。' },
      { t: 'say', text: '沙丘上所有人都站起来了。没有人喊。' },
      {
        t: 'choose',
        prompt: '你做什么',
        options: [
          {
            label: '跟着它弹一段。',
            hint: '你不知道它有多长',
            do: [
              { k: 'insp', n: 8, hours: true },
              { k: 'renown', n: 20 },
              { k: 'flag', id: 'flag_saw_fall' },
            ],
            goto: 'play',
          },
          {
            label: '放下琴，只是看。',
            do: [
              { k: 'insp', n: 4, hours: true },
              { k: 'item', id: 'it_sandglass' },
              { k: 'flag', id: 'flag_saw_fall' },
            ],
            goto: 'watch',
          },
        ],
      },
      { t: 'at', id: 'play' },
      { t: 'say', text: '你弹到第三个音的时候，它还在。第十个音，还在。' },
      { t: 'say', text: '你弹完了整首。它比你长。' },
      { t: 'say', text: '后来有人跟你说那天晚上有一百多人在听，你一个都不记得。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'watch' },
      { t: 'say', text: '你把琴放在沙上，看到它灭。' },
      { t: 'say', text: '身边一个商队的老人往你手里塞了半只沙漏：「沙只够漏七分钟。刚好一首曲子。」' },
      { t: 'say', text: '「刚才那个多久。」' },
      { t: 'say', text: '「比七分钟长。」' },
      { t: 'at', id: 'end' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_rain_share',
    title: '一个屋檐',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '雨说下就下。你抱着琴冲到最近的屋檐下，那里已经站了一个人。' },
      {
        t: 'choose',
        prompt: '屋檐只够一个人',
        options: [
          {
            label: '把琴护住，自己站在外沿。',
            hint: '琴不能淋',
            do: [
              { k: 'renown', n: 3 },
              { k: 'var', id: 'v_wet', add: 1 },
            ],
            goto: 'out',
          },
          {
            label: '让给对方，抱着琴跑。',
            do: [{ k: 'renown', n: 5 }, { k: 'coin', n: -0.2, hours: true }],
            goto: 'run',
          },
          {
            label: '挤一挤。',
            hint: '看对方是什么人',
            chance: 0.55,
            do: [{ k: 'leisure', n: 2 }],
            goto: 'squeeze',
            miss: {
              goto: 'out',
              text: '对方往旁边挪了半尺，把整条肩膀留给了雨。你没好意思再挤。',
            },
          },
        ],
      },
      { t: 'at', id: 'out' },
      { t: 'say', text: '你半边身子全湿了，琴干的。这笔账你算得清。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'run' },
      { t: 'say', text: '你跑了三条巷子才找到第二个屋檐。回头看，那人还在原地，朝这边看。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'squeeze' },
      { t: 'say', text: '两个人肩挨着肩站了一炷香。谁也没说话，但雨停的时候都笑了一下。' },
      { t: 'at', id: 'end' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_wrong_song',
    title: '点错的曲子',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '一个人站在摊子前很久，最后说了一个曲名。' },
      { t: 'say', text: '你没听过这首。' },
      {
        t: 'choose',
        options: [
          {
            label: '「我不会。」',
            hint: '老实说',
            do: [{ k: 'renown', n: 1 }],
            goto: 'honest',
          },
          {
            label: '硬弹一个像的。',
            hint: '赌他也记不清',
            chance: 0.45,
            do: [{ k: 'coin', n: 1.4, hours: true }],
            goto: 'bluff',
            miss: {
              goto: 'caught',
              do: [{ k: 'renown', n: -4 }],
              text: '弹到第二句他就皱起了眉。第四句他走了。',
            },
          },
          {
            label: '「你哼一段，我跟。」',
            do: [{ k: 'insp', n: 1.5, hours: true }, { k: 'coin', n: 0.6, hours: true }],
            goto: 'follow',
          },
        ],
      },
      { t: 'at', id: 'honest' },
      { t: 'say', text: '他点了点头，还是放了一枚："不会也该给。你站了一天。"' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'bluff' },
      { t: 'say', text: '他听完很满意，给的比行价多。你一晚上都不太舒服。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'caught' },
      { t: 'say', text: '你在心里记下：以后不装。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'follow' },
      { t: 'say', text: '他哼得很难听，但调是对的。你跟了两遍就摸出来了。' },
      { t: 'say', text: '第三遍他跟着一起唱，唱到一半停了，说这是他母亲的曲子。' },
      { t: 'at', id: 'end' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_que_pass',
    title: '路上撞见',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'enter', who: 'ch_que', side: 'right', as: 'smile' },
      { t: 'say', who: 'ch_que', as: 'smile', text: '又是你。这条路是你家开的？' },
      { t: 'say', text: '她放下匣子，坐在你旁边的石头上，看样子要歇。' },
      {
        t: 'choose',
        options: [
          {
            label: '「歇多久。」',
            do: [{ k: 'bond', who: 'ch_que', n: 2 }],
            goto: 'short',
          },
          {
            label: '弹一首给她听，不收钱。',
            do: [
              { k: 'bond', who: 'ch_que', n: 5 },
              { k: 'insp', n: 0.8, hours: true },
            ],
            goto: 'play',
          },
          {
            label: '「你路线上哪里最好赚。」',
            hint: '正事',
            do: [
              { k: 'bond', who: 'ch_que', n: 1 },
              { k: 'coin', n: 1.2, hours: true },
            ],
            goto: 'money',
          },
        ],
      },
      { t: 'at', id: 'short' },
      { t: 'say', who: 'ch_que', as: 'calm', text: '一炷香。我从来只歇一炷香。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'play' },
      { t: 'say', text: '她听着，头一点一点，最后靠着匣子睡了小半个时辰。' },
      { t: 'say', text: '醒的时候她一句话都没说，走了。走了二十步回头喊：「那首叫什么。」' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'money' },
      { t: 'say', who: 'ch_que', as: 'think', text: '灯节前三天的樱水町。别的时候别去，人太多，没人听。' },
      { t: 'say', text: '这条消息后来替你挣了不少。' },
      { t: 'at', id: 'end' },
      { t: 'exit' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'a_night_listener',
    title: '夜里唯一的听众',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '过了半夜，路上就剩一个人还站着。你弹了一个时辰，他没走，也没给钱。' },
      {
        t: 'choose',
        options: [
          {
            label: '继续弹到他走。',
            do: [{ k: 'insp', n: 2, hours: true }],
            goto: 'stay',
          },
          {
            label: '停下来问他要听什么。',
            do: [{ k: 'renown', n: 2 }],
            goto: 'ask',
          },
        ],
      },
      { t: 'at', id: 'stay' },
      { t: 'say', text: '天快亮的时候他走了。走之前把外套脱下来搭在你琴箱上，没回头。' },
      { t: 'goto', to: 'end' },
      { t: 'at', id: 'ask' },
      { t: 'say', text: '他说：「不用弹了。我就是不想一个人待着。」' },
      { t: 'say', text: '你们一起坐到天亮。他一直没说他是谁。' },
      { t: 'at', id: 'end' },
    ],
  },
];
