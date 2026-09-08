import type { Scene } from '../../../game/story/types';

/* ============================================================
   LINEAGE SCENES — what the eighty-one are for

   Two beats the quest chain cannot carry, because both are about the
   player's own hands rather than about a town:

     l_first_leaf   the first recovered page, and the first time the
                    instrument answers something you did not play
     l_volume       any completed volume, which is the moment the game
                    admits what your family actually was

   Both are gated on state rather than on a chapter, so they land whenever
   the player gets there — including for someone who ignores the main line
   and simply digs through every scribe's chest on the map.
   ============================================================ */

export const LINEAGE_SCENES: Scene[] = [
  {
    id: 'l_first_leaf',
    title: '它认得你',
    line: 'main',
    chapter: 1,
    steps: [
      { t: 'say', text: '夜里收了摊，你把那页纸摊在膝上。' },
      {
        t: 'say',
        text: '纸很旧，边上被人裁过，裁得不讲究——裁它的人只当它是好纸。上面的记谱法不是这一带的写法：音高不写在线上，写在字的旁边，像给字注了小声。',
      },
      { t: 'say', text: '你祖母教过你读它。你八岁，她七十三，教了两个下午就没再提。' },
      {
        t: 'choose',
        prompt: '你要不要现在就弹',
        options: [
          {
            label: '弹。手指还记得。',
            hint: '不管准不准',
            do: [
              { k: 'insp', n: 12 },
              { k: 'var', id: 'v_leaf_played', set: 1 },
            ],
            goto: 'play',
          },
          {
            label: '先抄一份。原件太脆了。',
            hint: '澹人的老规矩：先抄，再弹',
            do: [
              { k: 'insp', n: 6 },
              { k: 'flag', id: 'flag_lineage_careful' },
            ],
            goto: 'copy',
          },
          {
            label: '收起来。你不想一个人听见。',
            hint: '有些东西一听就回不去了',
            do: [{ k: 'leisure', n: 2 }],
            goto: 'keep',
          },
        ],
      },

      { t: 'at', id: 'play' },
      { t: 'say', text: '你按上面的音弹了四小节。' },
      {
        t: 'say',
        text: '第五小节你没有弹——但它响了。\n\n不是回声，不是共振，是有人接着你弹了下去，用的还是你这把琴。',
      },
      { t: 'say', text: '你没有松手。你听完了那一句，然后才发现自己在发抖。' },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'copy' },
      {
        t: 'say',
        text: '你抄到第三行，笔尖忽然轻了一下——像被人扶着。抄完那一页，字迹前后一致得不像你写的。',
      },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'keep' },
      {
        t: 'say',
        text: '你把纸夹回琴箱。半夜箱子里响了一声，很轻，像有人翻了个身。\n\n你没有开箱。',
      },

      { t: 'at', id: 'close' },
      {
        t: 'say',
        text: '祖母的原话你现在才听懂：\n\n"澹人不会弹琴。澹人只是让琴愿意。"\n\n"那别人为什么要杀我们？"\n"因为愿意听你的东西，就不听别人的了。"',
      },
      {
        t: 'do',
        do: [
          { k: 'flag', id: 'flag_lineage_known' },
          {
            k: 'journal',
            title: '御器',
            body: '澹人的本事不在手上，在乐器那边：它肯听你。八十一份曲谱是这门本事的全部写法，被人一页一页拿走，散在各地。\n你不打算讨回公道。你只打算把它们弹回来。',
          },
        ],
      },
    ],
  },

  {
    id: 'l_volume',
    title: '一卷齐了',
    line: 'main',
    chapter: 2,
    steps: [
      { t: 'say', text: '九页按序排开，压上镇纸。你花了很久才敢从第一页起手。' },
      {
        t: 'say',
        text: '前三页是你熟的，第四页开始不对劲：你弹得越慢，它跟得越紧。到第七页，你已经分不清哪一声是你按出来的。',
      },
      {
        t: 'say',
        text: '第九页你根本没有看谱。手自己走完了。像是想起来一件很久以前做过的事。',
      },
      {
        t: 'choose',
        prompt: '弹完之后',
        options: [
          {
            label: '再弹一遍，从头。',
            hint: '确认不是幻觉',
            do: [
              { k: 'insp', n: 40, hours: true },
              { k: 'var', id: 'v_volume_twice', add: 1 },
            ],
            goto: 'again',
          },
          {
            label: '把九页重新包好，收进琴箱最里面。',
            hint: '这是家产',
            do: [{ k: 'renown', n: 6 }],
            goto: 'pack',
          },
        ],
      },

      { t: 'at', id: 'again' },
      {
        t: 'say',
        text: '第二遍更稳。弹到中段，摊子外面有人停下来听——不是被曲子勾住的那种停，是像被叫住了名字的那种停。',
      },
      { t: 'goto', to: 'close' },

      { t: 'at', id: 'pack' },
      {
        t: 'say',
        text: '你包纸的时候手很稳。包好之后才坐下来，坐了很久，什么也没做。',
      },

      { t: 'at', id: 'close' },
      {
        t: 'say',
        text: '一卷九页，你族里五十个人抄了一辈子。如今会弹全的只有你一个。\n\n还有八卷。你把琴擦干净，明天照旧出摊。',
      },
      { t: 'do', do: [{ k: 'flag', id: 'flag_volume_done' }] },
    ],
  },
];
