import type { Scene } from '../../../game/story/types';

/* ============================================================
   SIDE SCENES

   Side stories are where the condition system earns its keep. A main
   beat has to land, so its trigger uses chance 1 and the writing can
   assume you saw the previous one. A side scene is the opposite: it is
   allowed to require rain, a particular town, a specific item in your
   satchel and a coin flip on top — because nothing downstream depends
   on it. Missing one is part of the shape of a playthrough.

   Each of these hangs off a side quest in `data/quests.ts`, and either
   sets the flag that quest is watching or hands over the item it wants.
   That keeps the two systems talking through data instead of through
   special cases in code.
   ============================================================ */

export const SIDE_SCENES: Scene[] = [
  /* ---------------------------------------------------------- */
  {
    id: 's_cat_collar',
    title: '缆桩上的听众',
    line: 'side',
    steps: [
      { t: 'say', text: '它总是坐在第三根缆桩上，眼睛是白的，从来不动。' },
      { t: 'say', text: '今天它动了——从缆桩上下来，走到你脚边，把脖子往你手上顶。' },
      { t: 'say', text: '项圈很旧，铜牌磨得发亮，上面刻着一个名字。不是你起的。' },
      {
        t: 'choose',
        prompt: '你做什么',
        options: [
          {
            label: '把项圈解下来收好。',
            hint: '它像是要给你',
            do: [
              { k: 'item', id: 'it_catcollar' },
              { k: 'flag', id: 'flag_cat_found' },
              { k: 'insp', n: 1.5, hours: true },
            ],
            goto: 'took',
          },
          {
            label: '不动它，只把今天的鱼分一半。',
            hint: '名字是别人的事',
            do: [
              { k: 'flag', id: 'flag_cat_found' },
              { k: 'renown', n: 4 },
              { k: 'coin', n: -0.3, hours: true },
            ],
            goto: 'fish',
          },
          {
            label: '按着铜牌上的名字叫它一声。',
            hint: '万一它答应呢',
            chance: 0.35,
            do: [
              { k: 'flag', id: 'flag_cat_found' },
              { k: 'item', id: 'it_catcollar' },
              { k: 'insp', n: 3, hours: true },
              { k: 'journal', title: '它答应了', body: '你叫了铜牌上的名字。它回头了。那么这个名字，现在也算是你的了。' },
            ],
            goto: 'answered',
            miss: {
              text: '你叫了那个名字。它没有反应，只是把耳朵朝海的方向转了一下。',
              goto: 'fish',
            },
          },
        ],
      },

      { t: 'at', id: 'took' },
      { t: 'say', text: '它没躲。项圈拿下来以后，它反而在你琴箱边上躺下了。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'fish' },
      { t: 'say', text: '它吃得很慢，吃完把剩下的推回你这边。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'answered' },
      { t: 'say', text: '它回头了。' },
      { t: 'say', text: '你忽然明白，在你之前，有人在这条码头上，也天天弹给它听。' },

      { t: 'at', id: 'close' },
      { t: 'say', text: '你收摊的时候它跟到巷口，然后回去坐上了第三根缆桩。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 's_dice_polished',
    title: '磨光的那一面',
    line: 'side',
    steps: [
      { t: 'enter', who: 'ch_bai', side: 'right', as: 'smile' },
      { t: 'say', who: 'ch_bai', as: 'smile', text: '又是你。坐。' },
      { t: 'say', text: '他把骰子推过来。你捏着转了一圈——六点那一面比别的面滑。' },
      {
        t: 'choose',
        prompt: '你怎么办',
        options: [
          {
            label: '「这颗磨过。」当着满桌人说。',
            hint: '你今晚可能得跑',
            do: [
              { k: 'renown', n: 10 },
              { k: 'bond', who: 'ch_bai', n: -4 },
              { k: 'flag', id: 'flag_dice_called' },
            ],
            goto: 'called',
          },
          {
            label: '把骰子换回他的口袋，什么也不说。',
            hint: '让他知道你知道',
            do: [
              { k: 'bond', who: 'ch_bai', n: 9 },
              { k: 'var', id: 'v_bai_covered', add: 1 },
            ],
            goto: 'quiet',
          },
          {
            label: '用它押一把大的。',
            hint: '磨过的面朝谁都一样',
            need: { k: 'coin', min: 400 },
            lockNote: '你身上不够押这一把',
            chance: 0.5,
            do: [
              { k: 'coin', n: 6, hours: true },
              { k: 'bond', who: 'ch_bai', n: 5 },
            ],
            goto: 'won',
            miss: {
              text: '你押了。骰子停下来是一点。白十一笑了很久，笑到咳嗽。',
              do: [{ k: 'coin', n: -2, hours: true }, { k: 'bond', who: 'ch_bai', n: 3 }],
              goto: 'lost',
            },
          },
        ],
      },

      { t: 'at', id: 'called' },
      { t: 'say', text: '桌子翻了。有人抓住他的领子，他也没解释。' },
      { t: 'say', who: 'ch_bai', as: 'calm', text: '你没说错。' },
      { t: 'say', text: '第二天他还在，换了一张桌子，换了一副骰子。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'quiet' },
      { t: 'say', who: 'ch_bai', as: 'shock', text: '……你不说？' },
      { t: 'say', text: '「你磨了三年才磨到这么滑。这也算手艺。」' },
      { t: 'say', who: 'ch_bai', as: 'laugh', text: '手艺！他说这是手艺！' },
      { t: 'say', text: '他给你倒了一杯，倒的是他自己那壶好的。' },
      { t: 'do', do: [{ k: 'item', id: 'it_button' }] },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'won' },
      { t: 'say', text: '六点。整桌人都没说话。' },
      { t: 'say', who: 'ch_bai', as: 'laugh', text: '你比我坏。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'lost' },
      { t: 'say', who: 'ch_bai', as: 'laugh', text: '磨过的面，也得看谁的手。' },

      { t: 'at', id: 'close' },
      { t: 'exit' },
      { t: 'do', do: [{ k: 'quest', id: 'side_dice', start: true }] },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 's_umbrella_gift',
    title: '一把也不卖',
    line: 'side',
    steps: [
      { t: 'say', text: '雨下到第三天。她还在你对面站着，伞架上十七把，一把也不卖。' },
      { t: 'enter', who: 'ch_umbrella', side: 'right', as: 'calm' },
      { t: 'say', who: 'ch_umbrella', as: 'calm', text: '你不打伞。' },
      { t: 'say', text: '「琴要打。我不用。」' },
      { t: 'say', text: '她看了很久你护着琴箱的姿势，然后从架子最里面抽出一把素面的。' },
      {
        t: 'choose',
        prompt: '你收吗',
        options: [
          {
            label: '收下，把今天全部的进账放进她的钱箱。',
            hint: '不能白拿',
            need: { k: 'coin', min: 60 },
            lockNote: '你今天挣的还不够体面地给出去',
            do: [
              { k: 'item', id: 'it_umbrella_paper' },
              { k: 'flag', id: 'flag_umbrella_met' },
              { k: 'coin', n: -1, hours: true },
              { k: 'bond', who: 'ch_umbrella', n: 8 },
            ],
            goto: 'paid',
          },
          {
            label: '收下，然后为她弹一首。',
            hint: '你只有这个',
            do: [
              { k: 'item', id: 'it_umbrella_paper' },
              { k: 'flag', id: 'flag_umbrella_met' },
              { k: 'bond', who: 'ch_umbrella', n: 12 },
              { k: 'insp', n: 2, hours: true },
            ],
            goto: 'played',
          },
          {
            label: '不收。',
            hint: '十七把里少一把，她就得记着',
            do: [
              { k: 'flag', id: 'flag_umbrella_met' },
              { k: 'bond', who: 'ch_umbrella', n: 3 },
              { k: 'renown', n: 3 },
            ],
            goto: 'refused',
          },
        ],
      },

      { t: 'at', id: 'paid' },
      { t: 'say', who: 'ch_umbrella', as: 'cross', text: '我说了不卖。' },
      { t: 'say', text: '「我也没说买。」' },
      { t: 'say', text: '她把钱推回来，推了两次，第三次没推。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'played' },
      { t: 'say', text: '雨声比琴声大。你弹完，她鼓了一下掌——只一下，很轻。' },
      { t: 'say', who: 'ch_umbrella', as: 'shy', text: '这把伞，我做的时候没想过给谁。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'refused' },
      { t: 'say', who: 'ch_umbrella', as: 'think', text: '……那我明天还站这儿。' },

      { t: 'at', id: 'close' },
      { t: 'do', do: [{ k: 'quest', id: 'side_umbrella', start: true }] },
      { t: 'exit' },
      { t: 'say', text: '雨停的那天，她的伞架空了一把。她自己说不清是卖了还是给了。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 's_bell_parts',
    title: '十七个声部',
    line: 'side',
    /* only reachable once the bell-tower map is unlocked, and even then
       it takes the right hour — a scene you have to go looking for */
    steps: [
      { t: 'say', text: '钟塔塌了一半。风穿过缺口的时候，塔自己会响一个音。' },
      { t: 'say', text: '谱架散在瓦砾里，十七份，每一份只有一个声部。' },
      {
        t: 'choose',
        prompt: '十七个人的东西，你一个人怎么弹',
        options: [
          {
            label: '按顺序，一份一份弹给塔听。',
            hint: '十七遍，天会亮',
            do: [
              { k: 'insp', n: 4, hours: true },
              { k: 'renown', n: 12 },
              { k: 'flag', id: 'flag_bell_played' },
            ],
            goto: 'one',
          },
          {
            label: '只弹缺的那一份，让风补其余十六份。',
            hint: '得赌风',
            chance: 0.4,
            do: [
              { k: 'insp', n: 7, hours: true },
              { k: 'item', id: 'it_bellclapper' },
              { k: 'flag', id: 'flag_bell_played' },
              { k: 'journal', title: '十七个声部', body: '风替十六个人来了。你只弹了第十七份。' },
            ],
            goto: 'wind',
            miss: {
              text: '风没来。你在空塔里弹了一个声部，听起来像有人在等另外十六个人，等了很久。',
              goto: 'one',
            },
          },
        ],
      },

      { t: 'at', id: 'one' },
      { t: 'say', text: '你弹到第十四份的时候，塔上落下来一块灰，正好砸在谱架上，像是催。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'wind' },
      { t: 'say', text: '风穿过十六个缺口，塔身、瓦砾、断梁一起响了。' },
      { t: 'say', text: '你只弹了自己那一份。那一刻塔上有十七个人。' },

      { t: 'at', id: 'close' },
      { t: 'do', do: [{ k: 'quest', id: 'side_orchestra', start: true }] },
      { t: 'say', text: '天亮以后你数了数瓦砾里的谱架：还是十七份。一份都没少。' },
    ],
  },
];
