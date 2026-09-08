/* ============================================================
   PERFORMANCE — words

   Labels for the rate breakdown and the strategy sheet. The rate rows
   are read by players trying to work out where their coins come from, so
   they are content, not debug output.
   ============================================================ */

export const PERFORMANCE_TEXT = {
  rates: {
    prof: '熟练',
    rarity: '珍稀',
    novice: '生疏',
  },
  rarity: {
    common: '寻常',
    fine: '好琴',
    rare: '珍品',
    myth: '传世',
  } as Record<string, string>,
  strategy: {
    practiceNote: (rate: string, tier: string) => `${tier} · 每小时约练 ${rate} 点`,
    masteredNote: (tier: string) => `${tier} · 已经练到头了`,
  },
};
