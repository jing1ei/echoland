import type { Scene } from '../../game/story/types';

/* ============================================================
   WEATHER — story

   Extreme weather is rare on purpose, so it is allowed to be the reason
   something happens. These scenes only ever open through the triggers in
   ./triggers.ts, which sit behind the weather conditions in
   ./conditions.ts plus a probability roll.

   Keeping them here rather than in content/story/scenes means the
   weather module owns its own narrative: one folder holds the odds, the
   look, the sound and the beats it can cause.
   ============================================================ */

export const WEATHER_CONTENT_SCENES: Scene[] = [
  /* ---------------------------------------------------------- */
  {
    id: 'w_thunder_shelter',
    title: '雷雨下的檐',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '第一道亮起来的时候，你已经把琴按在怀里了。' },
      { t: 'say', text: '整条街的人往同一个檐下挤。你挤在最里面，琴还没湿。' },
      { t: 'say', text: '有人问：还能弹吗。' },
      {
        t: 'choose',
        prompt: '雨声压过一切',
        options: [
          {
            label: '弹。弹给挤在这儿的人。',
            hint: '没有钱，但有人记得',
            do: [
              { k: 'renown', n: 6 },
              { k: 'insp', n: 1.4, hours: true },
              { k: 'var', id: 'v_storm_played', add: 1 },
            ],
            goto: 'played',
          },
          {
            label: '把琴裹紧，等雨停。',
            hint: '琴比场面重要',
            do: [{ k: 'leisure', n: 2 }],
            goto: 'waited',
          },
        ],
      },
      { t: 'at', id: 'played' },
      { t: 'say', text: '你弹了三首。雨停的时候，檐下的人都还在。' },
      {
        t: 'say',
        if: { k: 'var', id: 'v_storm_played', min: 3 },
        text: '有个孩子说，去年那场雨他也在。他记得你弹的是哪一首。',
        do: [{ k: 'renown', n: 10 }, { k: 'flag', id: 'flag_storm_known' }],
      },
      { t: 'goto', to: 'out' },
      { t: 'at', id: 'waited' },
      { t: 'say', text: '雨停得比想的快。地上全是亮的，人都散了。' },
      { t: 'at', id: 'out' },
      { t: 'say', text: '你摊开手，指腹上还留着雷声的麻。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'w_fog_listener',
    title: '雾里的听客',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '雾厚到看不见对面的招牌。你弹给三步之内的空气。' },
      { t: 'say', text: '有脚步在雾里停下，不近也不远，就那么听着。' },
      {
        t: 'choose',
        options: [
          {
            label: '停下来，问一句。',
            do: [{ k: 'insp', n: 0.8, hours: true }],
            chance: 0.5,
            miss: { text: '脚步走了。雾把方向也吃掉了。', goto: 'gone' },
            goto: 'answer',
          },
          { label: '不问，弹完。', do: [{ k: 'insp', n: 1.2, hours: true }], goto: 'gone' },
        ],
      },
      { t: 'at', id: 'answer' },
      { t: 'say', text: '雾里递过来一枚湿的铜板，比寻常的厚。然后脚步远了。' },
      { t: 'do', do: [{ k: 'coin', n: 1.6, hours: true }] },
      { t: 'at', id: 'gone' },
      { t: 'say', text: '你后来一直没弄清那是谁。雾天你总多弹两首。' },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    id: 'w_snow_hands',
    title: '雪里的手',
    line: 'ambient',
    repeatable: true,
    steps: [
      { t: 'say', text: '雪落在弦上，声音闷了半个调。你的指节已经不太听话。' },
      { t: 'say', text: '摊前放下一只陶碗，热的。放碗的人已经走开了。' },
      { t: 'do', do: [{ k: 'leisure', n: 3 }, { k: 'insp', n: 0.9, hours: true }] },
      { t: 'say', text: '你捧着碗，弹不了，也不想走。' },
    ],
  },
];
