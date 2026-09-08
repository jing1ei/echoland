import type { Upgrade } from '../../game/types';

/* ============================================================
   UPGRADES — permanent quality-of-idle

   Content module: upgrades. `effect` is player-facing text; the actual
   behaviour of each id lives in the engine's rate table. Adding an
   upgrade therefore takes two edits — one here, one in
   src/game/engine.ts — and the docs say so on purpose.
   ============================================================ */

export const UPGRADES: Upgrade[] = [
  {
    id: 'up_coffer',
    name: '铜边钱匣',
    desc: '钱匣好看，路人给得就大方。所有观景台收入 +22%。',
    price: 1800,
    effect: 'coin +22%',
  },
  {
    id: 'up_apprentice',
    name: '学徒少年',
    desc: '你累了他接着弹。体力见底后的收益从 35% 提到 62%。',
    price: 6500,
    effect: '疲劳惩罚减半',
  },
  {
    id: 'up_umbrella',
    name: '桐油大伞',
    desc: '雨天不再折损，反而 +18%。',
    price: 5200,
    effect: '雨天转为加成',
  },
  {
    id: 'up_lantern',
    name: '铁提灯',
    desc: '夜里也能看清谱子。夜间收益 +25%。',
    price: 9000,
    effect: '夜间 +25%',
  },
  {
    id: 'up_journal',
    name: '旅行札记',
    desc: '把奇遇都记下来。所有事件收益 +35%，且离线事件上限 +4。',
    price: 14000,
    effect: '事件收益 +35%',
  },
  {
    id: 'up_pass',
    name: '驿站通行证',
    desc: '离线积累上限从 12 小时提到 28 小时。',
    price: 26000,
    effect: '离线上限 28h',
  },
  {
    id: 'up_cushion',
    name: '软垫矮凳',
    desc: '坐得住，弹得久。体力上限 +5 小时。',
    price: 33000,
    effect: '体力上限 +5h',
  },
  {
    id: 'up_dice',
    name: '磨光的骰子',
    desc: '你没作弊，只是骰子更懂你。赌局赔率明显变好。',
    price: 18000,
    effect: '赌局优势',
  },
  {
    id: 'up_whistle',
    name: '候鸟哨',
    desc: '吹一声，总会有人绕过来。奇遇触发 +40%。',
    price: 45000,
    effect: '事件频率 +40%',
  },
  {
    id: 'up_ring',
    name: '名家指环',
    desc: '戴上它，人们默认你很贵。名气涨得 +60%，收入 +12%。',
    price: 88000,
    effect: '名气 +60%',
  },
  {
    id: 'up_cart',
    name: '折叠小推车',
    desc: '乐器全带上，随时换。闲暇上限 +20，闲暇产出 +25%。',
    price: 120000,
    effect: '闲暇上限 +20',
  },
  {
    id: 'up_pass2',
    name: '云游者披风',
    desc: '所有云游者的终点是同一件披风。全部收益 +45%，离线上限 48 小时。',
    price: 480000,
    effect: '全收益 +45% / 离线 48h',
  },
];

export const UPGRADE_MAP: Record<string, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);
