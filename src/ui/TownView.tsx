import { useMemo, useState } from 'react';
import { useGame, availableQuests, objectiveValue, questReady } from '../game/store';
import { OVERLOOK_MAP } from '../content/overlooks';
import { TOWN_MAP, TOWNS } from '../content/towns';
import { INSTRUMENT_MAP, ITEM_MAP, SONG_MAP, UPGRADE_MAP } from '../content/gear';
import { fmtNum, itemName } from '../game/engine';
import type { MapNode, Quest, TownMap } from '../game/types';
import { Card, Chip, Divider, Empty, Icon, Meter, Sheet } from './bits';
import { FAME_TEXT } from '../content/fame';
import { fameProgress, fameTierLabel, fameWord } from '../game/systems/fame';
import { SCORE_TEXT } from '../content/scores';
import { questBadge, wordly } from './objective';

/* ---------------- node vocabulary ---------------- */

const KIND_META: Record<string, { label: string; glyph: string; tone: string }> = {
  /* one Chinese character per kind — a letter M or T on a map pin told you
     nothing, and mixing letters with pictograms looked accidental */
  market: { label: '市集', glyph: '市', tone: '#b8873f' },
  luthier: { label: '琴匠', glyph: '琴', tone: '#8a5a2a' },
  scribe: { label: '抄谱', glyph: '谱', tone: '#5c5470' },
  tavern: { label: '酒馆', glyph: '酒', tone: '#7b3b46' },
  story: { label: '故事', glyph: '事', tone: '#3f6b7a' },
  puzzle: { label: '谜题', glyph: '谜', tone: '#5c6a45' },
  gamble: { label: '赌局', glyph: '赌', tone: '#8a3f3f' },
  shrine: { label: '祠', glyph: '祠', tone: '#8a7a3f' },
};

/* Every node used to answer with the same "you walked over", which made the
   whole map feel like one button. Each kind now has a small pool of outcomes,
   so a repeat visit at least reads differently. */
const FLAVOUR: Record<string, string[]> = {
  market: [
    '你在摊子间绕了一圈，听了三种口音的还价。',
    '卖鱼的女人多给你一把小银币，说昨天听过你弹。',
    '有人拿一枚旧扣子跟你换半支曲子，你换了。',
  ],
  luthier: [
    '老师傅拿走你的琴，敲了敲，说还能撑一年。',
    '琴颈上的旧裂被填平了，音准回来一点。',
  ],
  scribe: [
    '抄谱的人借你一页空谱，让你把昨晚想到的写下来。',
    '你把记不牢的段落抄了一遍，纸比脑子可靠。',
  ],
  tavern: [
    '你在角落弹了两支，酒客把铜板丢进帽子里。',
    '灶边的位子空着，你坐下弹到炉火发暗。',
    '有人点了首你没听过的调子，你照着旋律糊弄过去，居然过关了。',
  ],
  shrine: [
    '你留了一枚铜板在石台上，替某个还在海上的人。',
    '香灰是冷的。你把琴横在膝上弹了一遍，没人听，风听。',
    '石缝里已经有三枚铜板了。你的那枚排在第四。',
  ],
  story: [
    '事情比传闻里复杂些。你记下了能记的部分。',
    '你顺着线索走了一段，尽头是另一个问题。',
  ],
  gamble: [
    '桌子腾出个位子。骰子推到你面前。',
    '灯芯挑亮了些，赌客往边上挪了挪。',
  ],
  puzzle: [
    '锁是老式的。你听着簧片，一点点转。',
    '图样和你手记里那页对得上。',
  ],
  quest: [
    '差事接下了。',
    '对方点点头，把该给的先给了一半。',
  ],
};

function flavourFor(n: MapNode) {
  const pool = FLAVOUR[n.kind] ?? ['你走了一趟。'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function kindMeta(k: string) {
  return KIND_META[k] ?? { label: k, glyph: '·', tone: '#6b6050' };
}

/* ---------------- shop row ---------------- */

function priceOf(id: string) {
  if (id.startsWith('song_')) return SONG_MAP[id]?.price ?? 0;
  if (id.startsWith('up_')) return UPGRADE_MAP[id]?.price ?? 0;
  if (id.startsWith('it_')) return Math.round((ITEM_MAP[id]?.value ?? 0) * 1.4);
  return INSTRUMENT_MAP[id]?.price ?? 0;
}
function stockInfo(id: string) {
  if (id.startsWith('song_')) {
    const x = SONG_MAP[id];
    return { name: x?.name ?? id, desc: x?.desc ?? '', tag: '乐谱', rarity: x?.rarity };
  }
  if (id.startsWith('up_')) {
    const x = UPGRADE_MAP[id];
    return { name: x?.name ?? id, desc: x?.desc ?? '', tag: '行装', rarity: undefined };
  }
  if (id.startsWith('it_')) {
    const x = ITEM_MAP[id];
    return { name: x?.name ?? id, desc: x?.desc ?? '', tag: '物件', rarity: undefined };
  }
  const x = INSTRUMENT_MAP[id];
  return { name: x?.name ?? id, desc: x?.desc ?? '', tag: '乐器', rarity: x?.rarity };
}

function ShopList({ stock }: { stock: string[] }) {
  const { state, buy } = useGame();
  const [flash, setFlash] = useState<string>('');
  const owned = (id: string) =>
    id.startsWith('song_')
      ? state.songs.includes(id)
      : id.startsWith('up_')
        ? state.upgrades.includes(id)
        : id.startsWith('it_')
          ? false
          : state.instruments.includes(id);

  return (
    <div>
      <Divider label="货架" />
      <div className="space-y-2">
        {stock.map((id) => {
          const info = stockInfo(id);
          const p = priceOf(id);
          const have = owned(id);
          const afford = state.coin >= p;
          return (
            <Card key={id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="display truncate text-[15px] font-semibold text-[#2b2419]">{info.name}</h4>
                    <Chip tone="ghost">{info.tag}</Chip>
                    {info.rarity && info.rarity !== 'common' && (
                      <Chip tone={info.rarity === 'myth' ? 'wine' : 'brass'}>
                        {info.rarity === 'myth' ? '传说' : info.rarity === 'rare' ? '珍稀' : '精制'}
                      </Chip>
                    )}
                  </div>
                  <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">{info.desc}</p>
                </div>
                <button
                  disabled={have || !afford}
                  onClick={() => {
                    const r = buy(id);
                    setFlash(r.msg);
                  }}
                  className={`ui btn h-9 flex-none px-3 text-[12px] ${
                    have ? 'btn-quiet opacity-50' : afford ? 'btn-brass' : 'btn-quiet opacity-60'
                  }`}
                >
                  {have ? '已有' : afford ? `${fmtNum(p)} 枚` : `差 ${fmtNum(p - state.coin)} 枚`}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      {flash && (
        <p className="ui mt-3 rounded-xl bg-[rgba(184,135,63,0.12)] px-3 py-2 text-[12px] text-[#8a6220]">{flash}</p>
      )}
    </div>
  );
}

/* ---------------- quest board (tavern) ---------------- */

function QuestBoard() {
  const { state, claimQuest } = useGame();
  const [done, setDone] = useState<Quest | null>(null);
  const quests = availableQuests(state);
  const main = quests.filter((q) => q.line === 'main').slice(0, 1);
  const side = quests.filter((q) => q.line === 'side').slice(0, 6);
  const list = [...main, ...side];

  return (
    <div>
      <Divider label="门板上的委托" />
      {list.length === 0 ? (
        <Empty>门板空着。风把最后一张吹走了。</Empty>
      ) : (
        <div className="space-y-2.5">
          {list.map((q) => {
            const ready = questReady(state, q);
            return (
              <Card key={q.id} active={ready}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Chip tone={q.line === 'main' ? 'wine' : 'moss'}>
                        {questBadge(q)}
                      </Chip>
                      {ready && <Chip tone="brass">可交付</Chip>}
                    </div>
                    <h4 className="display mt-1.5 text-[15.5px] font-semibold leading-tight text-[#2b2419]">
                      {q.title}
                    </h4>
                    <p className="ui mt-1 text-[12px] leading-relaxed text-[#6b6050]">{q.teaser}</p>
                  </div>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {q.objectives.map((o, i) => {
                    const v = objectiveValue(state, o);
                    const p = Math.min(1, v / o.target);
                    return (
                      <div key={i}>
                        <div className="ui flex items-baseline justify-between gap-2 text-[11.5px]">
                          <span className={p >= 1 ? 'text-[#4d5a38]' : 'text-[#6b6050]'}>
                            {p >= 1 ? '✓ ' : ''}
                            {o.label}
                          </span>
                          <span
                            className={`flex-none text-[10.5px] text-[#6f6350] ${
                              wordly(o) ? 'ui' : 'tnum'
                            }`}
                          >
                            {wordly(o)
                              ? fameTierLabel(v)
                              : `${fmtNum(Math.min(v, o.target))}/${fmtNum(o.target)}`}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Meter value={v} max={o.target} tone={p >= 1 ? '#5c6a45' : '#b8873f'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {q.reward.coin ? <Chip tone="brass">{fmtNum(q.reward.coin)} 枚</Chip> : null}
                  {q.reward.insp ? <Chip tone="ink">{fmtNum(q.reward.insp)} 灵感</Chip> : null}
                  {q.reward.renown ? <Chip tone="ink">{FAME_TEXT.label}</Chip> : null}
                  {q.reward.overlook && <Chip tone="wine">观景台 · {OVERLOOK_MAP[q.reward.overlook]?.name}</Chip>}
                  {q.reward.map && <Chip tone="wine">地图 · {TOWN_MAP[q.reward.map]?.name}</Chip>}
                  {q.reward.instrument && <Chip tone="brass">{INSTRUMENT_MAP[q.reward.instrument]?.name}</Chip>}
                  {q.reward.song && <Chip tone="brass">{SONG_MAP[q.reward.song]?.name}</Chip>}
                  {q.reward.upgrade && <Chip tone="moss">{UPGRADE_MAP[q.reward.upgrade]?.name}</Chip>}
                  {q.reward.item && <Chip tone="ghost">{ITEM_MAP[q.reward.item]?.name}</Chip>}
                </div>
                {ready && (
                  <button
                    onClick={() => {
                      const r = claimQuest(q.id);
                      if (r) setDone(r);
                    }}
                    className="ui btn btn-brass mt-3 h-10 w-full text-[13px]"
                  >
                    交付
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!done} onClose={() => setDone(null)} title={done?.title} sub="完成" tall>
        {done && (
          <div>
            <p className="display whitespace-pre-line text-[15.5px] leading-[1.9] text-[#2b2419]">{done.closing}</p>
            <Divider label="所得" />
            <div className="flex flex-wrap gap-1.5">
              {done.reward.coin ? <Chip tone="brass">{fmtNum(done.reward.coin)} 枚</Chip> : null}
              {done.reward.insp ? <Chip tone="ink">{fmtNum(done.reward.insp)} 灵感</Chip> : null}
              {done.reward.renown ? <Chip tone="ink">{FAME_TEXT.label}</Chip> : null}
              {done.reward.overlook && (
                <Chip tone="wine">解锁观景台 · {OVERLOOK_MAP[done.reward.overlook]?.name}</Chip>
              )}
              {done.reward.map && <Chip tone="wine">解锁地图 · {TOWN_MAP[done.reward.map]?.name}</Chip>}
              {done.reward.instrument && <Chip tone="brass">{INSTRUMENT_MAP[done.reward.instrument]?.name}</Chip>}
              {done.reward.song && <Chip tone="brass">{SONG_MAP[done.reward.song]?.name}</Chip>}
              {done.reward.upgrade && <Chip tone="moss">{UPGRADE_MAP[done.reward.upgrade]?.name}</Chip>}
              {done.reward.item && <Chip tone="ghost">{ITEM_MAP[done.reward.item]?.name}</Chip>}
            </div>
            <button onClick={() => setDone(null)} className="ui btn btn-ink mt-5 h-11 w-full text-[13.5px]">
              合上手记
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ---------------- the map ---------------- */

export default function TownView({
  onOpenMinigame,
}: {
  onOpenMinigame: (kind: string, title: string) => void;
}) {
  const { state, visitNode, rates } = useGame();
  const ov = OVERLOOK_MAP[state.overlook];
  const defaultTown = ov?.townId ?? 'saltide';
  const [townId, setTownId] = useState(defaultTown);

  const unlocked: TownMap[] = useMemo(() => {
    const ids = new Set<string>([defaultTown, ...state.maps]);
    return TOWNS.filter((t) => ids.has(t.id));
  }, [state.maps, defaultTown]);

  const town = TOWN_MAP[unlocked.some((t) => t.id === townId) ? townId : defaultTown];
  /* fame is read for the town on screen, not the one you are standing in —
     browsing the next town over should tell you what *it* thinks of you */
  const fameHere = fameWord(state, town?.id);
  const fameFill = fameProgress(state, town?.id);
  /* Authored coordinates cluster in the middle of the board and leave the top
     and bottom empty, which reads as a layout bug. Stretch whatever nodes are
     actually visible to fill the board, keeping their relative arrangement. */
  const nodes = useMemo(() => {
    const raw = (town?.nodes ?? []).filter((n) => !n.needFlag || state.flags[n.needFlag]);
    if (raw.length < 2) return raw;
    const xs = raw.map((n) => n.x);
    const ys = raw.map((n) => n.y);
    const spread = (v: number, lo: number, hi: number, a: number, b: number) =>
      hi - lo < 1 ? (a + b) / 2 : a + ((v - lo) / (hi - lo)) * (b - a);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    return raw.map((n) => ({
      ...n,
      x: spread(n.x, x0, x1, 15, 85),
      y: spread(n.y, y0, y1, 11, 88),
    }));
  }, [town, state.flags]);

  const [sel, setSel] = useState<MapNode | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    msg: string;
    loot: string[];
    coin?: number;
    insp?: number;
    renown?: number;
    flavour?: string;
    score?: { name: string; vol: string } | null;
    volume?: { name: string; song: string } | null;
  } | null>(null);

  const nodeState = (n: MapNode) => {
    const rec = state.nodeVisits[n.id];
    if (!rec) return 'fresh' as const;
    if (!n.repeatable) return 'spent' as const;
    if (n.cooldown && Date.now() - rec.last < n.cooldown * 60000) return 'cooling' as const;
    return 'open' as const;
  };

  const open = (n: MapNode) => {
    setSel(n);
    setResult(null);
  };

  const doVisit = (n: MapNode) => {
    const r = visitNode(n.id);
    /* If someone was waiting at this node, the story layer is already on
       screen above us (z-70). We still set up the result card and the
       minigame underneath, so closing the conversation drops the player
       exactly where the visit would have left them — the scene is an
       interruption, not a replacement. */
    setResult(r.ok ? { ...r, flavour: flavourFor(n) } : r);
    if (r.ok && r.minigame) {
      setSel(null);
      onOpenMinigame(r.minigame, n.name);
    }
  };

  if (!town) return null;

  return (
    <div className="relative h-full overflow-y-auto no-scrollbar">
      {/* parchment ground */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${town.tint}55, transparent 70%), #f4ecdc`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply grain" />

      <div className="relative px-5 pt-[max(16px,env(safe-area-inset-top))] pb-nav">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">
              {town.special ? 'special map' : 'town near the overlook'}
            </p>
            <h1 className="display text-[26px] font-semibold leading-tight text-[#2b2419]">{town.name}</h1>
            <p className="ui mt-0.5 text-[11.5px] italic text-[#6a5f4c]">{town.nameEn}</p>
          </div>
        </div>
        <p className="ui mt-2 max-w-[46ch] text-[12.5px] leading-relaxed text-[#6b6050]">{town.blurb}</p>

        {/* ---------------- the three you spend out here ----------------

            名气 / 灵感 / 闲暇 are shown on this screen and nowhere else.
            They are not decoration on the landscape and not a character
            sheet in the bag — they are what the shops, the scribe and the
            road cost, so they belong next to the map that spends them.

            Fame follows the town you are *looking at*, which is the whole
            point of it being regional: browse the next town over and the
            word changes to what that town thinks of you. It stays a word;
            the hairline under it is the only progress cue, deliberately
            unlabelled, because a labelled bar is a stat again. */}
        <div className="mt-3 flex gap-1.5">
          <div
            className="min-w-0 flex-1 rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.72)] px-2.5 py-2"
            data-fame={fameHere}
          >
            <div className="ui flex items-center gap-1 text-[9.5px] tracking-wider-2 text-[#7d4b55] uppercase">
              <Icon name="fame" size={11} />
              {FAME_TEXT.localLabel}
            </div>
            <p className="display mt-1 truncate text-[14px] font-semibold leading-none text-[#2b2419]">
              {fameHere}
            </p>
            <span className="mt-1.5 block h-[2px] w-full rounded-full bg-[rgba(125,75,85,0.16)]">
              <span
                className="block h-full rounded-full bg-[rgba(125,75,85,0.5)]"
                style={{ width: `${Math.round(fameFill * 100)}%` }}
              />
            </span>
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.72)] px-2.5 py-2">
            <div className="ui flex items-center gap-1 text-[9.5px] tracking-wider-2 text-[#4f7280] uppercase">
              <Icon name="spark" size={11} />
              灵感
            </div>
            <p className="display tnum mt-1 text-[16px] font-semibold leading-none text-[#2b2419]">
              {Math.floor(state.insp)}
            </p>
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.72)] px-2.5 py-2">
            <div className="ui flex items-center gap-1 text-[9.5px] tracking-wider-2 text-[#54663c] uppercase">
              <Icon name="leisure" size={11} />
              闲暇
            </div>
            <p className="display tnum mt-1 text-[16px] font-semibold leading-none text-[#2b2419]">
              {Math.floor(state.leisure)}
              <span className="ui ml-0.5 text-[10px] font-normal text-[#6f6350]">/{rates.leisureCap}</span>
            </p>
          </div>
        </div>

        {unlocked.length > 1 && (
          <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
            {unlocked.map((t) => (
              <button
                key={t.id}
                onClick={() => setTownId(t.id)}
                className={`ui btn h-8 flex-none px-3 text-[11.5px] ${
                  t.id === town.id ? 'btn-ink' : 'btn-quiet'
                }`}
              >
                {t.name}
                {t.special ? ' ·' : ''}
              </button>
            ))}
          </div>
        )}

        {/* map board */}
        <div
          className="relative mt-4 aspect-[3/4] min-h-[70vh] w-full overflow-hidden rounded-[22px] border border-[rgba(43,36,25,0.18)]"
          style={{
            background: `linear-gradient(170deg, #fdf8ec, #f0e6d2 60%, #e9dcc4)`,
            boxShadow: 'inset 0 0 60px rgba(120,96,54,0.16), 0 14px 40px -24px rgba(60,45,20,0.5)',
          }}
        >
          <svg viewBox="0 0 100 133" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {/* decorative terrain */}
            <g opacity="0.5" stroke={town.tint} strokeWidth="0.5" fill="none">
              <path d="M-4 34 Q 22 27 44 33 T 104 30" />
              <path d="M-4 40 Q 26 33 50 39 T 104 36" />
              <path d="M-4 108 Q 30 100 58 106 T 104 100" />
            </g>
            <g opacity="0.35" fill="none" stroke="rgba(43,36,25,0.25)" strokeWidth="0.35" strokeDasharray="1.6 1.8">
              <rect x="4" y="4" width="92" height="125" rx="6" />
            </g>
            {/* roads: connect each node to the nearest previous one */}
            <g stroke="rgba(90,74,44,0.4)" strokeWidth="0.55" fill="none" strokeDasharray="2 1.6">
              {nodes.map((n, i) => {
                if (i === 0) return null;
                let best = nodes[0];
                let bd = Infinity;
                for (let j = 0; j < i; j++) {
                  const d = (nodes[j].x - n.x) ** 2 + (nodes[j].y - n.y) ** 2;
                  if (d < bd) {
                    bd = d;
                    best = nodes[j];
                  }
                }
                const x1 = best.x;
                const y1 = best.y * 1.33;
                const x2 = n.x;
                const y2 = n.y * 1.33;
                const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12;
                const my = (y1 + y2) / 2 - (x2 - x1) * 0.12;
                return <path key={n.id} d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} />;
              })}
            </g>
          </svg>

          {/* nodes */}
          {nodes.map((n) => {
            const m = kindMeta(n.kind);
            const st = nodeState(n);
            const dim = st === 'spent' || st === 'cooling';
            /* labels sit under the pin by default; if another pin is close
               below, flip this one above so the two names never overlap */
            const crowdedBelow = nodes.some(
              (o) => o.id !== n.id && Math.abs(o.x - n.x) < 24 && o.y - n.y > 0 && o.y - n.y < 11,
            );
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-95"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span className={`relative flex items-center ${crowdedBelow ? 'flex-col-reverse' : 'flex-col'}`}>
                  {st === 'fresh' && (
                    <>
                      {/* a hairline pulse was invisible on parchment; a tinted
                          disc behind the pin actually reads as "unvisited" */}
                      <span
                        className="absolute -inset-3 rounded-full"
                        style={{ background: m.tone, opacity: 0.13 }}
                      />
                      <span
                        className="pulse-ring absolute -inset-2 rounded-full border-2"
                        style={{ borderColor: m.tone }}
                      />
                    </>
                  )}
                  <span
                    className="display grid h-8 w-8 place-items-center rounded-full border-2 text-[12px] font-semibold shadow-[0_5px_14px_-8px_rgba(50,36,10,0.9)]"
                    style={{
                      borderColor: m.tone,
                      color: dim ? '#6f6350' : m.tone,
                      background: dim ? 'rgba(244,236,220,0.9)' : '#fffdf6',
                      opacity: dim ? 0.62 : 1,
                    }}
                  >
                    {m.glyph}
                  </span>
                  <span
                    className={`ui whitespace-nowrap rounded-full px-1.5 py-[2px] text-[9.5px] leading-none ${
                      crowdedBelow ? 'mb-2' : 'mt-1.5'
                    }`}
                    style={{
                      background: 'rgba(255,253,246,0.94)',
                      boxShadow: '0 1px 4px -1px rgba(60,45,20,0.35)',
                      color: dim ? '#6f6350' : '#3d3527',
                    }}
                  >
                    {n.name}
                    {n.cost > 0 && <span className="tnum ml-1 text-[#8a6220]">{n.cost}</span>}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="ui absolute bottom-2.5 right-3 text-[9px] tracking-wider-2 text-[rgba(90,74,44,0.5)] uppercase">
            {town.nameEn}
          </div>
        </div>

        <p className="ui mt-3 text-center text-[11px] text-[#6f6350]">
          带光圈的还没去过，名字后面的数字是要花的闲暇。闲暇只在放置时长出来。
        </p>
      </div>

      {/* node sheet */}
      <Sheet
        open={!!sel}
        onClose={() => {
          setSel(null);
          setResult(null);
        }}
        title={sel?.name}
        sub={sel ? `${kindMeta(sel.kind).label} · ${town.name}` : undefined}
        tall
      >
        {sel && (
          <div>
            <p className="display text-[15.5px] leading-[1.9] text-[#2b2419]">{sel.desc}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {sel.cost > 0 ? <Chip tone="moss">耗 {sel.cost} 闲暇</Chip> : <Chip tone="ghost">不耗闲暇</Chip>}
              {sel.repeatable && <Chip tone="ghost">可反复</Chip>}
              {sel.cooldown ? <Chip tone="ghost">冷却 {sel.cooldown} 分</Chip> : null}
              {sel.minigame && (
                <Chip tone="wine">
                  {sel.minigame === 'dice' ? '骰局' : sel.minigame === 'cards' ? '牌局' : '听力试炼'}
                </Chip>
              )}
              {state.nodeVisits[sel.id] && <Chip tone="ink">来过 {state.nodeVisits[sel.id].count} 次</Chip>}
            </div>

            {!result && (
              <button
                onClick={() => doVisit(sel)}
                disabled={state.leisure < sel.cost || nodeState(sel) === 'spent' || nodeState(sel) === 'cooling'}
                className="ui btn btn-brass mt-4 h-12 w-full text-[13.5px]"
              >
                {nodeState(sel) === 'spent'
                  ? '已经来过了'
                  : nodeState(sel) === 'cooling'
                    ? '过一会儿再来'
                    : state.leisure < sel.cost
                      ? `闲暇不够（需 ${sel.cost}）`
                      : sel.minigame
                        ? '入局'
                        : '走过去'}
              </button>
            )}

            {result && (
              <>
                <div
                  className={`ui mt-4 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed ${
                    result.ok ? 'bg-[rgba(92,106,69,0.12)] text-[#3f4a2e]' : 'bg-[rgba(123,59,70,0.1)] text-[#6f2f3a]'
                  }`}
                >
                  {result.ok ? result.flavour : result.msg || '这一趟没走成。'}
                  {result.ok && (
                    <>
                      {/* the take, spelled out — a visit that only said "you
                          walked over" read like a dead end */}
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium">
                        {(result.coin ?? 0) >= 1 && (
                          <span className="tnum text-[#8a6220]">+{fmtNum(result.coin ?? 0)} 枚</span>
                        )}
                        {(result.insp ?? 0) >= 1 && (
                          <span className="tnum text-[#3f6b7a]">+{Math.round(result.insp ?? 0)} 灵感</span>
                        )}
                        {(result.renown ?? 0) > 0 && (
                          <span className="text-[#7d4b55]">长{FAME_TEXT.label}</span>
                        )}
                        {sel.cost > 0 && <span className="tnum text-[#5c6a45]">−{sel.cost} 闲暇</span>}
                        {(result.coin ?? 0) < 1 &&
                          (result.insp ?? 0) < 1 &&
                          (result.renown ?? 0) <= 0 &&
                          !result.score &&
                          result.loot.length === 0 && (
                            <span className="text-[#6a5f4c]">
                              {sel.cost > 0 ? '没什么进账，只有话。' : '不花闲暇，也不进账 — 这里是听消息的地方。'}
                            </span>
                          )}
                      </span>
                      {result.loot.length > 0 && (
                        <span className="mt-1 block text-[#7a5418]">
                          捡到：{result.loot.map((l) => itemName(l)).join('、')}
                        </span>
                      )}
                      {/* an ancestral page is never a bullet in a receipt —
                          it gets its own line, and a finished volume gets two */}
                      {result.score && (
                        <span className="mt-2 block text-[12.5px] font-medium text-[#8a6220]">
                          {SCORE_TEXT.found(result.score.name, result.score.vol)}
                        </span>
                      )}
                      {result.volume && (
                        <span className="mt-1 block text-[12.5px] font-medium text-[#4d5a38]">
                          {result.volume.name} · {SCORE_TEXT.volumeDone}
                          {result.volume.song ? ` · ${result.volume.song}` : ''}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {/* there is always an exit — an empty sheet with no action was
                    the single worst thing in the exploration loop */}
                <div className="mt-3 flex gap-2">
                  {sel.repeatable && nodeState(sel) === 'open' && state.leisure >= sel.cost ? (
                    <button
                      onClick={() => doVisit(sel)}
                      className="ui btn btn-brass h-12 flex-1 text-[13.5px]"
                    >
                      {sel.cost > 0 ? `再走一趟 · ${sel.cost} 闲暇` : '再走一趟'}
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setSel(null);
                      setResult(null);
                    }}
                    className={`ui btn h-12 flex-1 text-[13.5px] ${
                      sel.repeatable && nodeState(sel) === 'open' && state.leisure >= sel.cost
                        ? 'btn-quiet'
                        : 'btn-ink'
                    }`}
                  >
                    回到地图
                  </button>
                </div>
              </>
            )}

            {sel.shopStock && <ShopList stock={sel.shopStock} />}
            {sel.kind === 'tavern' && <QuestBoard />}
          </div>
        )}
      </Sheet>
    </div>
  );
}
