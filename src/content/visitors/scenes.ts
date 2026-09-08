import type { Scene } from '../../game/story/types';

/* ============================================================
   STALL VISITORS — story

   The payoff for having watched. These scenes only open while that
   figure is actually standing at the stall (see ./triggers.ts and the
   `guest` condition), which means the player has already seen the shape
   several times before it ever speaks.

   None of them use a portrait. A silhouette that finally says something
   and *stays* a silhouette is more interesting than one that resolves
   into a face and a name; the ones that deserve faces get promoted into
   content/story/characters.ts and their own line.
   ============================================================ */

export const VISITOR_CONTENT_SCENES: Scene[] = [
  /* ---------------------------------------------------------- */
  {
    id: 'v_hood_speaks',
    title: '压低的帽檐',
    line: 'ambient',
    steps: [
      { t: 'say', text: '那个影子今天站得更近了。你弹完一整套，他都没动。' },
      { t: 'say', text: '「你换过弦。」帽檐下的声音说。「上一次听你弹，第四根是麻的。」' },
      { t: 'say', text: '你不记得他听过。你不记得他在哪听过。' },
      {
        t: 'choose',
        prompt: '他没有走的意思',
        options: [
          {
            label: '问他是谁。',
            hint: '大概问不出来',
            do: [{ k: 'insp', n: 1.2, hours: true }],
            goto: 'ask',
          },
          {
            label: '什么都不问，接着弹。',
            hint: '有些听众不需要名字',
            do: [{ k: 'coin', n: 2.2, hours: true }, { k: 'renown', n: 4 }],
            goto: 'play',
          },
        ],
      },
      { t: 'at', id: 'ask' },
      { t: 'say', text: '「一个记性好的人。」他说完就走了，帽檐一直没抬。' },
      { t: 'do', do: [{ k: 'flag', id: 'flag_hood_asked' }] },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'play' },
      { t: 'say', text: '你弹到收摊。他放下一枚不该出现在这个港口的银币，走了。' },
      { t: 'do', do: [{ k: 'item', id: 'it_button' }, { k: 'flag', id: 'flag_hood_paid' }] },
      { t: 'at', id: 'out' },
      {
        t: 'do',
        do: [
          {
            k: 'journal',
            title: '压低帽檐的人',
            body: '他听过我弹麻线弦的那一场。我不记得那天有他。他还会再来。',
          },
        ],
      },
      { t: 'say', text: '你后来常在人堆边上找那顶帽子。找到的次数比你愿意承认的多。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'v_case_opens',
    title: '没打开的琴匣',
    line: 'ambient',
    steps: [
      { t: 'say', text: '抱琴匣的人今天站在最前面。匣子扣得很紧，看得出里面的东西比匣子贵。' },
      { t: 'say', text: '你弹到一半，他忽然跟着哼了一句——比你弹的高一个调，但准。' },
      {
        t: 'choose',
        options: [
          {
            label: '停下来，把这一句让给他。',
            hint: '让一句，看他敢不敢接',
            chance: 0.62,
            miss: {
              text: '他摇头，把匣子抱得更紧了。「早不弹了。」',
              goto: 'refuse',
            },
            do: [{ k: 'renown', n: 8 }],
            goto: 'accept',
          },
          {
            label: '装作没听见，弹完。',
            do: [{ k: 'coin', n: 1.6, hours: true }],
            goto: 'refuse',
          },
        ],
      },
      { t: 'at', id: 'accept' },
      { t: 'say', text: '匣子开了。里面那把琴的漆比你的命长。他只弹了八个小节，就收回去了。' },
      { t: 'say', text: '「够了。」他说。「再多一句我就想起来为什么不弹了。」' },
      { t: 'do', do: [{ k: 'insp', n: 3.4, hours: true }, { k: 'flag', id: 'flag_case_heard' }] },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'refuse' },
      { t: 'say', text: '他站到最后一首才走。匣子始终没开。' },
      { t: 'at', id: 'out' },
      {
        t: 'do',
        do: [
          {
            k: 'journal',
            title: '抱琴匣的人',
            body: '他会哼我弹的调子，比我准。琴匣里的东西比他的衣服贵。他不弹了，但他还来听。',
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'v_glow_watches',
    title: '身上有光的人',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '那个人身上的光不来自任何一盏灯。你确认过。' },
      { t: 'say', text: '他不鼓掌，不放钱，也不走。你弹的时候，光会跟着调子亮一点。' },
      { t: 'say', text: '你收摊的时候他已经不在了。地上那一小块石头是暖的。' },
      { t: 'do', do: [{ k: 'insp', n: 2.2, hours: true }, { k: 'var', id: 'v_glow_seen', add: 1 }] },
      {
        t: 'say',
        if: { k: 'var', id: 'v_glow_seen', min: 3 },
        text: '第三次了。你开始觉得他不是在听你弹，而是在等你弹出某一首。',
        do: [{ k: 'flag', id: 'flag_glow_waiting' }],
      },
    ],
  },
];
