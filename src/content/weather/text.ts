import type { WeatherId } from '../../game/types';

/* ============================================================
   WEATHER — words
   ============================================================ */

export interface WeatherText {
  /** the short label in the stage header */
  label: string;
  /** one line, shown when the weather is unusual enough to mention */
  note?: string;
}

export const WEATHER_TEXT: Record<WeatherId, WeatherText> = {
  clear: { label: '晴' },
  cloudy: { label: '多云' },
  overcast: { label: '阴' , note: '天压得低，人走得快。' },
  rain_light: { label: '小雨', note: '雨丝斜着落，琴箱上很快积了一层。' },
  rain_heavy: { label: '大雨', note: '雨砸在棚子上，压得过路人听不见你。' },
  thunder: { label: '雷雨', note: '云里有东西在滚，隔一会儿亮一下。' },
  fog: { label: '雾', note: '雾把街吃掉了，只剩你和三步之内的人。' },
  wind: { label: '大风', note: '风翻谱子，你得用铜板压着。' },
  snow: { label: '雪', note: '雪落在弦上，声音闷了半个调。' },
  sleet: { label: '雨夹雪', note: '又湿又冷，手指僵得按不准。' },
};

/** how a condition names a family of weathers, for locked-choice hints */
export const WEATHER_GROUP_TEXT: Record<string, string> = {
  rain: '雨天',
  snowfall: '落雪',
  wet: '湿天',
  calm: '好天',
  extreme: '恶劣天候',
  lowlight: '天色暗',
};

/** the aside in the header — pure flavour, fires on WEATHER_VALUES.flavourChance */
export const WEATHER_FLAVOUR = ['（风向偏南）', '（风里有海腥味）', '（远处有雷）'];

export const WEATHER_UI_TEXT = {
  extremeTag: '天候异常',
  overlayLabel: (label: string) => `此刻：${label}`,
};
