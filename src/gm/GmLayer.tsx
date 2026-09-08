import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { CHARACTERS, SCENES, guestAt } from '../game/story';
import { INSTRUMENTS } from '../content/gear';
import { WEATHER_IDS } from '../content/weather/registry';
import { WEATHER_TEXT } from '../content/weather/text';
import { VISITOR_SPECS } from '../content/visitors';
import { PROFICIENCY_VALUES } from '../content/proficiency/values';
import { setDevGuest, setDevWeather, devGuest, devWeather } from '../game/devFlags';
import { effectiveProf, ownProf, categoryOf, categoryBonus } from '../game/systems/proficiency';
import { GM_GROUPS, addBond, addEnmity, clearEnmity, setProf, type GmApi } from './commands';
import { enmityLabel, enmityOf } from '../game/story';
import { fameOf, fameWord } from '../game/systems/fame';
import type { WeatherId } from '../game/types';

/* ============================================================
   The GM layer

   A translucent slab over the game with every value you might want to
   force while testing. Three things it is deliberately not:

   · not styled like the game. It is grey, monospaced and ugly on
     purpose, so no screenshot of it can ever be mistaken for the
     product.
   · not wired into anything. It reads `useGame()` and writes through
     the single `gmWrite` seam. No system knows it exists.
   · not shipped. `__GM__` is folded to `false` in a production build, so
     Rollup deletes the import in App.tsx and no GM chunk is emitted —
     see docs/GM.md.
   ============================================================ */

const box =
  'rounded-[10px] border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-white/85';

function Btn({
  children,
  onClick,
  warn,
}: {
  children: React.ReactNode;
  onClick: () => void;
  warn?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[9px] border px-2 py-[5px] text-[11px] leading-none transition-colors ${
        warn
          ? 'border-[#a8555a]/60 bg-[#a8555a]/20 text-[#ffd9d9]'
          : 'border-white/18 bg-white/[0.07] text-white/85 active:bg-white/20'
      }`}
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
    >
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-2.5">
      <p className="text-[10px] tracking-wider text-white/45 uppercase">{title}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-snug text-white/30">{hint}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export default function GmLayer() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [log, setLog] = useState<string[]>([]);
  const [inst, setInst] = useState(g.state.instrument);
  const [who, setWho] = useState(CHARACTERS[0]?.id ?? '');
  const [scene, setScene] = useState(SCENES[0]?.id ?? '');
  const [tick, setTick] = useState(0);

  const api: GmApi = useMemo(
    () => ({
      state: g.state,
      write: g.gmWrite,
      play: g.gmPlay,
      fire: g.fireHook,
      reset: g.hardReset,
      log: (m: string) => setLog((l) => [m, ...l].slice(0, 6)),
    }),
    [g.state, g.gmWrite, g.gmPlay, g.fireHook, g.hardReset],
  );

  const guest = guestAt(g.state, Date.now());
  const prof = {
    own: ownProf(g.state, inst),
    eff: effectiveProf(g.state, inst),
    cat: categoryOf(inst),
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        data-gm-toggle
        className="fixed left-0 top-0 z-[200] m-[max(6px,env(safe-area-inset-top))] grid h-7 w-7 place-items-center rounded-[8px] border border-white/20 bg-[rgba(10,10,14,0.42)] text-[9px] font-bold tracking-wider text-white/60 backdrop-blur-[3px]"
        style={{ fontFamily: 'ui-monospace, monospace' }}
        aria-label="GM"
      >
        GM
      </button>
    );

  return (
    <div className="fixed inset-0 z-[200] flex justify-center">
      {/* the game keeps running underneath — half the point is watching a
          value you just forced take effect on the stage */}
      <div
        className="absolute inset-0 bg-[rgba(6,6,9,0.35)]"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative m-2 flex h-[calc(100%-16px)] w-full max-w-[400px] flex-col overflow-hidden rounded-[14px] border border-white/15 bg-[rgba(10,11,15,0.86)] backdrop-blur-[10px]"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-white/80">GM · 调试层</p>
            <p className="text-[9.5px] text-white/35">
              存档 v{g.state.version} · 第 {g.state.story.chapter} 章 · {g.state.collects} 次收摊
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-[8px] border border-white/18 px-2 py-1 text-[10.5px] text-white/70"
          >
            收起
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-6 pt-2 no-scrollbar" data-gm-panel>
          {/* live readout: the numbers the player is not allowed to see */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-[10px] border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10.5px] text-white/60">
            <span>铜板 {Math.round(g.state.coin)}</span>
            <span>灵感 {Math.round(g.state.insp)}</span>
            <span>
              名气 {fameWord(g.state)} {fameOf(g.state).toFixed(0)}
            </span>
            <span>闲暇 {Math.round(g.state.leisure)}</span>
            <span>手劲耗 {g.state.fatigue.toFixed(1)}h</span>
            <span>收益 {Math.round(g.rates.coin)}/h</span>
            <span className="col-span-2 text-white/40">
              摊边：{guest ? guest.spec.id : '无'}
              {devGuest() ? '（强制）' : ''} · 天气：{devWeather() ?? '自动'}
            </span>
          </div>

          {/* amount field, shared by every "+N" button */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-white/45">N =</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className={`${box} w-24`}
            />
            {[1, 10, 100, 1000, 10000].map((v) => (
              <Btn key={v} onClick={() => setAmount(v)}>
                {v}
              </Btn>
            ))}
          </div>

          {GM_GROUPS.map((grp) => (
            <Section key={grp.id} title={grp.title} hint={grp.hint}>
              {grp.actions.map((a) => (
                <Btn
                  key={a.id}
                  warn={a.tone === 'warn'}
                  onClick={() => {
                    a.run(api, amount);
                    setTick((t) => t + 1);
                  }}
                >
                  {a.label}
                </Btn>
              ))}
            </Section>
          ))}

          {/* ---- proficiency ---- */}
          <Section
            title="熟练度"
            hint={`本体 ${prof.own.toFixed(1)} + 门类加成 ${categoryBonus(g.state, prof.cat).toFixed(1)} = ${prof.eff.toFixed(1)} · ${prof.cat}`}
          >
            <select
              value={inst}
              onChange={(e) => setInst(e.target.value)}
              className={`${box} max-w-[150px]`}
            >
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id} className="bg-[#12131a]">
                  {i.name}
                </option>
              ))}
            </select>
            {[0, 25, 50, 90, PROFICIENCY_VALUES.max].map((v) => (
              <Btn
                key={v}
                onClick={() => {
                  g.gmWrite((s) => setProf(s, inst, v));
                  api.log(`${inst} 熟练度 → ${v}`);
                }}
              >
                {v === PROFICIENCY_VALUES.max ? '满' : v}
              </Btn>
            ))}
            <Btn
              onClick={() => {
                g.gmWrite((s) => setProf(s, inst, ownProf(s, inst) + 10));
                api.log(`${inst} 熟练度 +10（应触发门类加成）`);
              }}
            >
              +10
            </Btn>
            <Btn
              onClick={() => {
                g.gmWrite((s) => ({ ...s, instrument: inst }));
                api.log(`换到 ${inst}`);
              }}
            >
              拿在手上
            </Btn>
          </Section>

          {/* ---- weather ---- */}
          <Section title="天气" hint="强制天气会盖住自动判定，测完记得恢复">
            <Btn
              onClick={() => {
                setDevWeather(null);
                setTick((t) => t + 1);
                api.log('天气恢复自动');
              }}
            >
              自动
            </Btn>
            {WEATHER_IDS.map((w) => (
              <Btn
                key={w}
                onClick={() => {
                  setDevWeather(w as WeatherId);
                  setTick((t) => t + 1);
                  api.log(`天气 → ${w}`);
                }}
              >
                {WEATHER_TEXT[w as WeatherId]?.label ?? w}
              </Btn>
            ))}
          </Section>

          {/* ---- stall visitors ---- */}
          <Section title="摊边人影" hint="钉住一个人影，方便测它挂的事件">
            <Btn
              onClick={() => {
                setDevGuest(null);
                setTick((t) => t + 1);
                api.log('人影恢复自动');
              }}
            >
              自动
            </Btn>
            {VISITOR_SPECS.map((v) => (
              <Btn
                key={v.id}
                onClick={() => {
                  setDevGuest(v.id);
                  setTick((t) => t + 1);
                  api.log(`人影 → ${v.id}`);
                }}
              >
                {v.id.replace('vs_', '')}
              </Btn>
            ))}
          </Section>

          {/* ---- affection (hidden from the player, visible here) ---- */}
          <Section
            title="好感（玩家看不到数值）"
            hint="这里是直接写存档；想看「暗屏＋一句话」的表现，用下面的强制播放挑一幕带 bond 的"
          >
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className={`${box} max-w-[130px]`}
            >
              {CHARACTERS.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#12131a]">
                  {c.name} · 好 {Math.round(g.state.story.bond[c.id] ?? 0)} · 恨{' '}
                  {Math.round(enmityOf(g.state.story, c.id))}
                </option>
              ))}
            </select>
            {[1, 5, 20, -5].map((n) => (
              <Btn
                key={n}
                onClick={() => {
                  g.gmWrite((s) => addBond(s, who, n));
                  api.log(`${who} 好感 ${n > 0 ? '+' : ''}${n}`);
                }}
              >
                {n > 0 ? `+${n}` : n}
              </Btn>
            ))}
          </Section>

          {/* ---- enmity: the other hidden axis ----
              Deliberately its own section rather than negative affection,
              because that is how the system works: someone can sit at 深交
              and 怀恨 at the same time, and testing that pair is the whole
              point of having the panel. */}
          <Section
            title="憎恶（玩家看不到数值）"
            hint={`当前：${
              enmityOf(g.state.story, who) > 0
                ? `${enmityLabel(CHARACTERS.find((c) => c.id === who) ?? { id: who }, enmityOf(g.state.story, who))}（${Math.round(enmityOf(g.state.story, who))}）`
                : '无芥蒂'
            } · 只在对方所在的镇上扣钱`}
          >
            {[1, 6, 18, 40, -6].map((n) => (
              <Btn
                key={n}
                onClick={() => {
                  g.gmWrite((s) => addEnmity(s, who, n));
                  api.log(`${who} 憎恶 ${n > 0 ? '+' : ''}${n}`);
                }}
              >
                {n > 0 ? `+${n}` : n}
              </Btn>
            ))}
            <Btn
              onClick={() => {
                g.gmWrite((s) => clearEnmity(s, who));
                api.log(`${who} 揭过了`);
              }}
            >
              揭过
            </Btn>
            <Btn
              onClick={() => {
                g.gmWrite((s) => clearEnmity(s));
                api.log('所有仇怨揭过');
              }}
            >
              全部揭过
            </Btn>
          </Section>

          {/* ---- scenes ---- */}
          <Section title="强制播放场景" hint={`共 ${SCENES.length} 幕，含生成的琴灵/天气/人影场景`}>
            <select
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              className={`${box} max-w-[220px]`}
            >
              {SCENES.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#12131a]">
                  {s.line} · {s.title} ({s.id})
                </option>
              ))}
            </select>
            <Btn
              onClick={() => {
                g.gmPlay(scene);
                api.log(`播放 ${scene}`);
              }}
            >
              播放
            </Btn>
          </Section>

          {/* ---- log ---- */}
          {log.length > 0 && (
            <div className="border-t border-white/10 pt-2">
              <p className="text-[10px] tracking-wider text-white/40 uppercase">刚才做了</p>
              {log.map((l, i) => (
                <p key={i} className="text-[10.5px] leading-snug" style={{ color: `rgba(255,255,255,${0.6 - i * 0.08})` }}>
                  {l}
                </p>
              ))}
            </div>
          )}

          <p className="pt-1 text-[9.5px] leading-relaxed text-white/25">
            这一层只通过 store 的 gmWrite / gmPlay 写状态；正式包里 __GM__ 为 false，整块代码不会被打进去。
            tick #{tick}
          </p>
        </div>
      </div>
    </div>
  );
}
