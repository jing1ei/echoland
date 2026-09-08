import { useState } from 'react';
import { useGame } from '../game/store';
import { INSTRUMENTS, STANCES } from '../content/gear';
import { OVERLOOK_MAP } from '../content/overlooks';
import { fmtRate } from '../game/engine';
import type { GameState } from '../game/engine';
import { PERFORMANCE_TEXT } from '../content/performance';
import { practiceForecast } from '../game/systems/performance';
import { effectiveProf, tierOf } from '../game/systems/proficiency';
import { Card, Chip, Divider, Sheet } from './bits';
import { isMine, ownedSongs } from '../game/systems/songs';
import { COMPOSE_TEXT } from '../content/compose';
import ComposeSheet from './ComposeSheet';

/** "熟手 · 每小时约练 1.8 点", or the note for a finished instrument */
function practiceNote(state: GameState, id: string): string {
  const tier = tierOf(effectiveProf(state, id)).label;
  const f = practiceForecast(state, id);
  return f.mastered
    ? PERFORMANCE_TEXT.strategy.masteredNote(tier)
    : PERFORMANCE_TEXT.strategy.practiceNote(f.perHour.toFixed(2), tier);
}

const MUL_NAMES: Record<string, string> = {
  coin: '钱',
  insp: '灵感',
  leisure: '闲暇',
  renown: '名气',
  event: '奇遇',
};

/* gains and penalties used to share one grey — now the trade-off is visible
   at a glance, which is the entire point of picking a stance */
function MulLabel({ m, fallback }: { m: Record<string, number | undefined>; fallback?: string }) {
  const parts = Object.entries(m).filter(([, v]) => v != null && Math.abs(v - 1) > 0.001);
  if (parts.length === 0) return <span className="ui text-[10px] text-[#6a5f4c]">{fallback ?? ''}</span>;
  return (
    <span className="ui inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
      {parts.map(([k, v]) => (
        <span key={k} className={`tnum whitespace-nowrap ${v! > 1 ? 'text-[#4a6b3a]' : 'text-[#8a4a4a]'}`}>
          {MUL_NAMES[k] ?? k} {v! > 1 ? '+' : '−'}
          {Math.abs(Math.round((v! - 1) * 100))}%
        </span>
      ))}
    </span>
  );
}

export default function StrategyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, rates, setStrategy } = useGame();
  const ov = OVERLOOK_MAP[state.overlook];
  const [compose, setCompose] = useState(false);

  const toggleSong = (id: string) => {
    const cur = state.repertoire;
    if (cur.includes(id)) {
      if (cur.length === 1) return;
      setStrategy({ repertoire: cur.filter((x) => x !== id) });
    } else {
      const next = cur.length >= 3 ? [...cur.slice(1), id] : [...cur, id];
      setStrategy({ repertoire: next });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="制定策略" sub={`当前在 ${ov?.name} · 总共鸣 +${Math.round(rates.resonance * 100)}%`} tall>
      {/* live rates */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { l: '铜板/时', v: fmtRate(rates.coin) },
          { l: '灵感/时', v: fmtRate(rates.insp) },
          { l: '闲暇/时', v: rates.leisure.toFixed(1) },
          { l: '奇遇/时', v: rates.eventRate.toFixed(2) },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-[rgba(43,36,25,0.12)] bg-[rgba(255,253,246,0.7)] px-2 py-2 text-center">
            <div className="ui tnum text-[14px] font-medium text-[#2b2419]">{x.v}</div>
            <div className="ui text-[9px] tracking-wider-2 text-[#6f6350] uppercase">{x.l}</div>
          </div>
        ))}
      </div>

      {rates.parts.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {rates.parts.slice(0, 9).map((p, i) => (
            <Chip key={i} tone={p.kind === 'good' ? 'moss' : 'wine'} className="tnum whitespace-nowrap">
              {p.label} {p.value >= 1 ? '+' : '−'}
              {Math.abs(Math.round((p.value - 1) * 100))}%
            </Chip>
          ))}
        </div>
      )}

      <Divider label="演奏方式" />
      <div className="space-y-2">
        {STANCES.map((s) => (
          <Card key={s.id} active={state.stance === s.id} onClick={() => setStrategy({ stance: s.id })}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="display text-[15.5px] font-semibold text-[#2b2419]">{s.name}</h4>
                <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">{s.desc}</p>
              </div>
              {state.stance === s.id && <Chip tone="brass" className="flex-none whitespace-nowrap">正在用</Chip>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <MulLabel m={s.mul} />
              <span
                className={`ui tnum whitespace-nowrap text-[10px] ${
                  s.drain > 1 ? 'text-[#8a4a4a]' : s.drain < 1 ? 'text-[#4a6b3a]' : 'text-[#6a5f4c]'
                }`}
              >
                手劲消耗 ×{s.drain.toFixed(2)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Divider label="乐器" />
      <div className="space-y-2">
        {INSTRUMENTS.filter((i) => state.instruments.includes(i.id)).map((i) => {
          const fit = i.affinity.filter((a) => ov?.moods.includes(a));
          return (
            <Card key={i.id} active={state.instrument === i.id} onClick={() => setStrategy({ instrument: i.id })}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="display text-[15.5px] font-semibold text-[#2b2419]">
                    {i.name}
                    <span className="ui ml-1.5 text-[10px] font-normal text-[#6f6350]">{i.nameEn}</span>
                  </h4>
                  <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">{i.desc}</p>
                </div>
                {state.instrument === i.id && <Chip tone="brass" className="flex-none whitespace-nowrap">在手</Chip>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <MulLabel m={i.mul} fallback="无加成" />
                {fit.length > 0 && <Chip tone="moss">与此地契合 ×{fit.length}</Chip>}
              </div>
              {/* the strategy sheet is where the player decides what the next
                  few hours are for. Coins are only half of it: an hour also
                  goes into this instrument's hands, so say how fast. */}
              <p className="ui mt-1.5 text-[11px] text-[#6f6350]">{practiceNote(state, i.id)}</p>
            </Card>
          );
        })}
      </div>

      <Divider label={`曲目单（最多 3 首，第 1 首权重最高）`} />
      {/* inspiration's sink: a repertoire you wrote yourself. The sheet
          lives next to the list it changes, so writing a song and putting
          it on the stand are one gesture. The button used to print how
          much inspiration you were holding; that number belongs to the
          explore screen and to the compose sheet itself, which has to
          show it because it is about to spend it. */}
      <button
        onClick={() => setCompose(true)}
        className="ui btn btn-quiet mb-2 h-10 w-full text-[12.5px]"
      >
        {COMPOSE_TEXT.open}
      </button>
      <div className="space-y-2">
        {ownedSongs(state).map((s) => {
          const idx = state.repertoire.indexOf(s.id);
          const fit = s.tags.filter((t) => ov?.moods.includes(t));
          return (
            <Card key={s.id} active={idx >= 0} onClick={() => toggleSong(s.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="display text-[15px] font-semibold text-[#2b2419]">
                    {s.name}
                    {isMine(state, s.id) && (
                      <span className="ui ml-1.5 rounded-full bg-[rgba(92,106,69,0.18)] px-1.5 py-[1px] text-[9.5px] text-[#4d5a38]">
                        自谱
                      </span>
                    )}
                    {idx >= 0 && (
                      <span className="ui ml-1.5 rounded-full bg-[rgba(184,135,63,0.22)] px-1.5 py-[1px] text-[9.5px] text-[#8a6220]">
                        第 {idx + 1} 首
                      </span>
                    )}
                  </h4>
                  <p className="ui mt-0.5 text-[11.5px] leading-relaxed text-[#6b6050]">{s.desc}</p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <MulLabel m={s.mul} />
                {fit.length > 0 && <Chip tone="moss">共鸣 ×{fit.length}</Chip>}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="ui mt-4 text-center text-[10.5px] leading-relaxed text-[#6f6350]">
        曲目的标签和观景台的气质对上，就有共鸣加成。<br />
        乐器的契合度也算在里面。
      </p>

      <ComposeSheet open={compose} onClose={() => setCompose(false)} />
    </Sheet>
  );
}
