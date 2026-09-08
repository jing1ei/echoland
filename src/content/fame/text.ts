/* ============================================================
   FAME — text

   Every string the player may ever read about being known. There is no
   number in any of them, and there is no arithmetic verb either: fame
   never "increases", people start recognising you.

   `up` lines are indexed by the tier just reached (1..4). Tier 0 has no
   line because arriving at "nobody knows you" is not news.
   ============================================================ */

export const FAME_TEXT = {
  /** how the axis is named in the UI. Never 名声值, never a digit. */
  label: '名气',
  localLabel: '此地名气',
  /** the satchel row's aside */
  hint: '名气跟着地方走。换个镇子，得重新弹给人听。',
  /** the collect sheet's one-word column */
  column: '名气',
  /** wordless notes: a story beat says which way it went, never how much */
  gain: '长名气',
  lose: '损名气',

  /** crossing into tier 1..4, in that town */
  up: [
    '',
    '有人隔着人堆冲你点了下头。你不记得他，他记得你。',
    '你还没调好弦，前面已经站住了三个人。',
    '有人是专门绕过来的。他说，听人讲这条街上有个弹琴的。',
    '孩子学你收弦的手势。这一带说起走唱的，说的就是你。',
  ],

  /** what the journal writes down when a tier is crossed */
  journal: {
    title: (place: string, tier: string) => `${place} · ${tier}`,
    body: (place: string, tier: string) =>
      `在${place}弹到现在，这里的人对你的说法变了：${tier}。名气不跟着你走，只留在弹过的地方。`,
  },

  /** the rate breakdown line — a phrase, not a stat */
  rateLabel: '这一带认得你',

  /** shown where a number used to be, when there is nothing yet */
  none: '无人识得',

  /** the map / travel screen's aside for a place you are known in */
  atPlace: (tier: string) => `此地：${tier}`,

  /** the one-off tip, in 设置 → 上手 */
  tip: '名气分地方记。在一个镇子弹得久了，那里的人才认得你；走远了，新地方要从头弹起。老地方也会慢慢淡，但不会忘光。',
} as const;
