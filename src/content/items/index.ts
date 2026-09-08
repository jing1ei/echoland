import type { Item } from '../../game/types';

/* ============================================================
   ITEMS — trinkets you sell, reagents you use, relics that matter

   Content module: items. `value` 0 means "not for sale at any price" —
   the story items. Sell pricing itself is engine logic.
   ============================================================ */

export const ITEMS: Item[] = [
  { id: 'it_shell', name: '磨圆的贝壳', desc: '有人当钱给你的。它不是钱，但很好看。', kind: 'trinket', value: 90 },
  { id: 'it_button', name: '黄铜纽扣', desc: '军装上的，磨得只剩一半花纹。', kind: 'trinket', value: 160 },
  { id: 'it_feather', name: '海鸥尾羽', desc: '据说塞在琴箱里能招来风。', kind: 'trinket', value: 240 },
  { id: 'it_wheat', name: '干麦穗束', desc: '磨坊主塞给你的，说是招财。', kind: 'trinket', value: 200 },
  { id: 'it_petal', name: '封蜡樱瓣', desc: '有人把去年的花瓣封在蜡里给了你。', kind: 'trinket', value: 380 },
  { id: 'it_lens', name: '灯塔碎镜', desc: '一小片，还能把光聚成线。', kind: 'trinket', value: 520 },
  { id: 'it_glaze', name: '窑变瓷片', desc: '烧坏了的，所以颜色反而绝了。', kind: 'trinket', value: 900 },
  { id: 'it_sandglass', name: '半只沙漏', desc: '沙只够漏七分钟。刚好一首曲子。', kind: 'trinket', value: 1500 },
  { id: 'it_teabrick', name: '云顶茶砖', desc: '寺里的，闻着像雨后的石头。', kind: 'trinket', value: 2600 },
  { id: 'it_icecore', name: '湖心冰核', desc: '不化。放在琴箱里，弦会自己微响。', kind: 'relic', value: 6000 },
  { id: 'it_string', name: '备用银弦', desc: '断弦时的救命东西。', kind: 'reagent', value: 300 },
  { id: 'it_rosin', name: '松脂块', desc: '手心出汗的时候有用。', kind: 'reagent', value: 220 },
  { id: 'it_wine', name: '一小瓶麦酒', desc: '喝了体力回一点，判断力掉一点。', kind: 'reagent', value: 260 },
  { id: 'it_umbrella_paper', name: '素面纸伞', desc: '一个卖伞的姑娘留下的。她没要钱。', kind: 'relic', value: 0 },
  { id: 'it_bellclapper', name: '钟舌', desc: '钟塔的舌头。握着它，你听得见塔从前的声音。', kind: 'relic', value: 0 },
  { id: 'it_lanternslip', name: '空白心愿签', desc: '还没写。你一直没敢写。', kind: 'relic', value: 0 },
  { id: 'it_scale', name: '鲸鳞一枚', desc: '天上的海掉下来的东西。轻得不像真的。', kind: 'relic', value: 0 },
  { id: 'it_catcollar', name: '猫的旧项圈', desc: '铜牌上刻着一个不是你起的名字。', kind: 'relic', value: 0 },
  { id: 'it_score_burnt', name: '烧焦的谱页', desc: '窑火里抢出来的，右下角有个签名。', kind: 'relic', value: 0 },
  { id: 'it_map_old', name: '云游者旧图', desc: '标了十二个点，其中一个在云上面。', kind: 'relic', value: 0 },
  /* ---- proficiency / spirit module items ---- */
  {
    id: 'it_tuning_fork',
    name: '一支音叉',
    desc: '敲一下能响很久。练手的人靠它把耳朵校准。',
    kind: 'reagent',
    value: 480,
  },
  {
    id: 'it_spirit_token',
    name: '一枚琴魂铜签',
    desc: '不知谁挂在琴颈上的。上面刻着一个字，你读不出来，但你知道它在叫谁。',
    kind: 'relic',
    value: 0,
  },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
