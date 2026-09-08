import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { OVERLOOKS, OVERLOOK_MAP } from '../content/overlooks';
import { fmtRate, skyState } from '../game/engine';
import type { Overlook } from '../game/types';
import { Chip, Sheet } from './bits';
import SceneCanvas from '../render/SceneCanvas';
import { sfx } from '../audio';

/* ============================================================
   TRAVEL MAP — "换个地方"

   This used to be a vertical list of cards, which answered "what are my
   options" but not "where am I". A bard who walks from a salt harbour to
   a frozen lake should be able to see the walk. So: one hand-drawn
   chart, a dotted road through the places the main line takes you, and a
   marker per overlook whose shape says whether you have been there.

   Positions are authored in `overlooks.ts` (`mapPos`), in 0..100 board
   space. Nothing here is derived from real geography — the map is a
   drawing, and reading order matters more.
   ============================================================ */

/** board aspect: 100 wide × this tall, in the same units as mapPos */
const BOARD_H = 104;

/** the main line's walk, in the order the story unlocks it */
const ROUTE = [
  'mistquay',
  'windmeadow',
  'petalbridge',
  'cliffbeacon',
  'emberkiln',
  'starfalldunes',
  'cloudtea',
  'auroralake',
  'whalefall',
];

/* one character per place, drawn inside the marker — a row of identical
   dots made the map unreadable at a glance */
const GLYPH: Record<string, string> = {
  quay: '港',
  meadow: '麦',
  bridge: '桥',
  lighthouse: '灯',
  kiln: '窑',
  dunes: '沙',
  cloudtop: '云',
  aurora: '湖',
  rainlane: '雨',
  belltower: '钟',
  canopy: '灯',
  whalefall: '鲸',
};

export function OverlookThumb({ ov, h = 92, live = false }: { ov: Overlook; h?: number; live?: boolean }) {
  const phase = useMemo(() => skyState(Date.now(), ov.id).phase, [ov.id]);
  const stops = ov.scene.palette[phase];
  const r = ov.scene.palette.ridge;

  /* an owned overlook draws one real frame of its own scenery, so the preview
     shows you the actual view instead of nine similar gradients */
  if (live) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl" style={{ height: h }}>
        <SceneCanvas overlookId={ov.id} still minimal playing={false} showBard reduceMotion />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent, rgba(8,6,10,0.34))' }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ height: h, background: `linear-gradient(to bottom, ${stops[0]}, ${stops[1]} 55%, ${stops[2]})` }}
    >
      <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={`M0 34 Q20 ${26 - ov.scene.jag * 8} 40 32 T80 30 T120 34 L120 60 L0 60Z`} fill={r[0]} />
        <path d={`M0 44 Q28 ${34 - ov.scene.jag * 6} 52 42 T96 40 T120 44 L120 60 L0 60Z`} fill={r[1]} opacity="0.96" />
        <path d={`M0 52 Q34 47 70 51 T120 52 L120 60 L0 60Z`} fill={ov.scene.palette.ground} />
      </svg>
      <div className="absolute inset-0" style={{ background: 'rgba(20,16,12,0.52)' }} />
      <div className="ui absolute inset-0 grid place-items-center text-[10px] tracking-wider-2 text-[rgba(255,253,246,0.72)] uppercase">
        still dark
      </div>
    </div>
  );
}

export default function TravelMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setStrategy, rates } = useGame();
  const [sel, setSel] = useState<string | null>(null);

  const here = state.overlook;
  /* default the preview to where you are standing, so the card below the
     board is never empty and the map always explains itself */
  const shown = OVERLOOK_MAP[sel && OVERLOOK_MAP[sel] ? sel : here];
  const owned = (id: string) => state.overlooks.includes(id);
  const plays = (id: string) => state.performAt[id] ?? 0;

  const routePts = useMemo(
    () =>
      ROUTE.map((id) => OVERLOOK_MAP[id]).filter(Boolean).map((o) => ({
        id: o.id,
        x: o.mapPos.x,
        y: (o.mapPos.y / 100) * BOARD_H,
      })),
    [],
  );

  const seenCount = OVERLOOKS.filter((o) => owned(o.id)).length;
  const playedCount = OVERLOOKS.filter((o) => plays(o.id) > 0).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="换个地方"
      sub={`到过 ${playedCount} 处 · 开放 ${seenCount} / ${OVERLOOKS.length}`}
      tall
    >
      {/* ---------------- the chart ---------------- */}
      <div
        className="relative w-full overflow-hidden rounded-[22px] border border-[rgba(43,36,25,0.18)]"
        style={{
          aspectRatio: `100 / ${BOARD_H}`,
          background: 'linear-gradient(168deg, #fdf8ec, #f1e7d3 58%, #e7d9be)',
          boxShadow: 'inset 0 0 70px rgba(120,96,54,0.18), 0 14px 40px -26px rgba(60,45,20,0.5)',
        }}
      >
        <svg viewBox={`0 0 100 ${BOARD_H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {/* decorative sea to the west, ridges inland, cloud band at the top —
              enough to make the empty parts of the board feel drawn, not blank */}
          <g stroke="rgba(70,104,120,0.34)" strokeWidth="0.4" fill="none">
            <path d="M-2 96 Q 10 92 20 96 T 40 96" />
            <path d="M-2 90 Q 8 86 17 90 T 34 90" />
            <path d="M-2 78 Q 7 74 15 78 T 30 78" />
          </g>
          <g stroke="rgba(120,96,54,0.3)" strokeWidth="0.45" fill="none">
            <path d="M20 46 l 6 -7 6 7" />
            <path d="M30 44 l 7 -8 7 8" />
            <path d="M62 34 l 6 -7 6 7" />
            <path d="M84 60 l 5 -6 5 6" />
          </g>
          <g stroke="rgba(90,110,130,0.3)" strokeWidth="0.4" fill="none">
            <path d="M32 14 q 6 -4 12 0 t 12 0" />
            <path d="M56 8 q 6 -4 12 0 t 10 0" />
          </g>
          <g fill="none" stroke="rgba(43,36,25,0.22)" strokeWidth="0.35" strokeDasharray="1.6 1.8">
            <rect x="3" y="3" width="94" height={BOARD_H - 6} rx="6" />
          </g>

          {/* the road: solid where you have already walked it, ghosted ahead */}
          <g fill="none" strokeLinecap="round">
            {routePts.slice(1).map((p, i) => {
              const a = routePts[i];
              const walked = owned(a.id) && owned(p.id);
              const mx = (a.x + p.x) / 2 + (p.y - a.y) * 0.14;
              const my = (a.y + p.y) / 2 - (p.x - a.x) * 0.14;
              return (
                <path
                  key={p.id}
                  d={`M${a.x} ${a.y} Q ${mx} ${my} ${p.x} ${p.y}`}
                  stroke={walked ? 'rgba(138,98,32,0.55)' : 'rgba(90,74,44,0.2)'}
                  strokeWidth={walked ? 0.6 : 0.45}
                  strokeDasharray={walked ? '2.4 1.8' : '1 2.4'}
                />
              );
            })}
          </g>
        </svg>

        {/* ---------------- markers ---------------- */}
        {OVERLOOKS.map((ov) => {
          const on = owned(ov.id);
          const isHere = ov.id === here;
          const been = plays(ov.id) > 0;
          const active = shown?.id === ov.id;
          return (
            <button
              key={ov.id}
              onClick={() => {
                setSel(ov.id);
                sfx.tap();
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${ov.mapPos.x}%`, top: `${ov.mapPos.y}%` }}
              aria-label={on ? ov.name : '未开放的地点'}
            >
              <span className="relative flex flex-col items-center">
                {isHere && (
                  <span className="absolute -inset-2 rounded-full border border-[rgba(184,135,63,0.5)] opacity-70" />
                )}
                <span
                  className="display grid place-items-center rounded-full border text-[12px] font-semibold transition-all"
                  style={{
                    width: on ? 30 : 24,
                    height: on ? 30 : 24,
                    /* three shapes, three meanings: filled = you have played
                       here, outlined = open but never played, dashed = unknown */
                    background: isHere
                      ? '#b8873f'
                      : been
                        ? 'rgba(184,135,63,0.2)'
                        : on
                          ? 'rgba(255,253,246,0.9)'
                          : 'rgba(43,36,25,0.05)',
                    borderColor: active
                      ? '#8a6220'
                      : on
                        ? 'rgba(138,98,32,0.55)'
                        : 'rgba(43,36,25,0.22)',
                    borderStyle: on ? 'solid' : 'dashed',
                    borderWidth: active ? 1.6 : 1,
                    color: isHere ? '#fff8e8' : on ? '#6b4a15' : 'rgba(43,36,25,0.35)',
                    boxShadow: active ? '0 6px 16px -8px rgba(138,98,32,0.9)' : 'none',
                  }}
                >
                  {on ? (GLYPH[ov.scene.kind] ?? '·') : '?'}
                </span>
                {/* only real places get a name. Five identical "未知" labels
                    turned the empty half of the map into a wall of text and
                    said nothing the dashed circle wasn't already saying. */}
                {on && (
                  <span
                    className="ui mt-1 whitespace-nowrap rounded-full px-1.5 text-[9.5px] leading-[14px]"
                    style={{
                      background: active ? 'rgba(184,135,63,0.2)' : 'rgba(253,248,236,0.55)',
                      color: '#5a4f3d',
                    }}
                  >
                    {ov.name}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        <p className="ui absolute bottom-[15px] right-[19px] text-[9px] tracking-wider-2 text-[rgba(90,80,64,0.42)] uppercase">
          the road so far
        </p>
      </div>

      {/* ---------------- preview of the selected place ---------------- */}
      {shown && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[rgba(43,36,25,0.14)] bg-[rgba(255,253,246,0.7)]">
          <OverlookThumb ov={shown} h={owned(shown.id) ? 132 : 84} live={owned(shown.id)} />
          <div className="px-3.5 pb-3.5 pt-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="display text-[17px] font-semibold leading-tight text-[#2b2419]">
                  {owned(shown.id) ? shown.name : '还没到过的地方'}
                  {owned(shown.id) && (
                    <span className="ui ml-1.5 text-[10px] font-normal text-[#6f6350]">{shown.nameEn}</span>
                  )}
                </h4>
                <div className="ui mt-0.5 flex flex-wrap items-center gap-1.5">
                  {owned(shown.id) && (
                    <span className="text-[10px] tracking-wider-2 text-[#6f6350] uppercase">{shown.region}</span>
                  )}
                  {shown.special && <Chip tone="wine">特殊</Chip>}
                  {plays(shown.id) > 0 && <Chip tone="ghost">演出 {plays(shown.id)} 场</Chip>}
                </div>
              </div>
              {owned(shown.id) ? (
                shown.id === here ? (
                  <span className="ui flex flex-none items-center gap-1.5 pt-1 text-[11px] font-medium text-[#8a6220]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#b8873f]" />
                    正在此地
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setStrategy({ overlook: shown.id });
                      sfx.travel();
                      onClose();
                    }}
                    className="ui btn btn-ink h-9 flex-none px-4 text-[12px]"
                  >
                    去这里
                  </button>
                )
              ) : (
                <Chip tone="ghost">未开放</Chip>
              )}
            </div>

            <p className="ui mt-1.5 text-[12px] leading-relaxed text-[#6b6050]">
              {owned(shown.id) ? shown.lore : shown.unlockNote}
            </p>

            {owned(shown.id) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="ui tnum text-[10.5px] text-[#8a6220]">
                  基准 {fmtRate(shown.base.coin)} 枚/时
                </span>
                <span className="ui text-[10.5px] text-[#6a5f4c]">
                  气质 {shown.moods.map(moodZh).join(' · ')}
                </span>
                <span className="ui text-[10.5px] text-[#6a5f4c]">人流 {Math.round(shown.crowd * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="ui mt-3 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
        主线解锁常规观景台，支线解锁特殊观景台。<br />
        换个地方会顺便让手劲回一点（{rates.staminaCap} 小时满效率）。
      </p>
    </Sheet>
  );
}

export function moodZh(m: string) {
  const map: Record<string, string> = {
    sea: '海',
    wind: '风',
    night: '夜',
    floral: '花',
    desert: '沙',
    cloud: '云',
    ice: '冰',
    ruin: '废墟',
    rain: '雨',
    sky: '天',
    forest: '林',
    city: '市井',
    holy: '神性',
    melancholy: '怅然',
    festive: '喧闹',
  };
  return map[m] ?? m;
}
