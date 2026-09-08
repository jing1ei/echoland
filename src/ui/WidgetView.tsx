import { useEffect, useMemo, useState } from 'react';
import SceneCanvas from '../render/SceneCanvas';
import { useGame } from '../game/store';
import { OVERLOOKS, OVERLOOK_MAP } from '../content/overlooks';
import { fmtNum, hourOf, phaseLabel, skyState } from '../game/engine';
import { weatherLabel } from '../game/systems/weather';
import { guestsAt } from '../game/story';
import WeatherOverlay from './WeatherOverlay';
import { livePending } from './StageView';
import { Sheet } from './bits';
import { canInstall, isStandalone, promptInstall, subscribeInstall } from '../pwa';

export default function WidgetView({ onExit }: { onExit: () => void }) {
  const { state, rates, now, setStrategy } = useGame();
  const [bare, setBare] = useState(true);
  const [help, setHelp] = useState(false);
  const [installable, setInstallable] = useState(canInstall());
  const [installNote, setInstallNote] = useState('');
  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), []);
  const ov = OVERLOOK_MAP[state.overlook];
  const sky = useMemo(() => skyState(now, state.overlook), [Math.floor(now / 20000), state.overlook]);
  const live = livePending(state, rates, now);
  /* the widget is the same view, so it shows the same crowd — including
     the figure you will later wonder about. Same signature trick as the
     stage: memo on who is standing there, not on a clock bucket. */
  const guestsNow = guestsAt(state, now);
  const guestSig = guestsNow.map((g) => g.spec.id).join(',');
  const guests = useMemo(
    () => guestsNow.map((g) => ({ id: g.spec.id, art: g.art })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guestSig],
  );
  const unlocked = OVERLOOKS.filter((o) => state.overlooks.includes(o.id));
  const idx = unlocked.findIndex((o) => o.id === state.overlook);

  useEffect(() => {
    if (bare) return;
    const t = window.setTimeout(() => setBare(true), 6000);
    return () => window.clearTimeout(t);
  }, [bare]);

  // hourOf honours ?hour=…, so the readout always matches the sky on screen
  const worldHour = hourOf(now);
  const hh = Math.floor(worldHour).toString().padStart(2, '0');
  const mm = Math.floor((worldHour % 1) * 60)
    .toString()
    .padStart(2, '0');

  const cycle = (d: number) => {
    if (unlocked.length < 2) return;
    const n = unlocked[(idx + d + unlocked.length) % unlocked.length];
    setStrategy({ overlook: n.id });
    setBare(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black" onClick={() => setBare((b) => !b)}>
      <SceneCanvas
        overlookId={state.overlook}
        playing
        showBard
        minimal
        reduceMotion={state.reduceMotion}
        guests={guests}
        className="absolute inset-0"
      />

      {/* the widget is a window, and windows have weather on them */}
      <WeatherOverlay
        weather={sky.weather}
        overlookId={state.overlook}
        reduceMotion={state.reduceMotion}
        minimal
      />

      {/* the widget face — always visible, very quiet */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 vignette-top" />
      {/* bright grounds (ice, sand, snow) washed out the bottom copy, so the
          widget carries its own stronger foot scrim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[rgba(8,6,12,0.7)] via-[rgba(8,6,12,0.34)] to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 px-7 pt-[max(52px,calc(env(safe-area-inset-top)+22px))]">
        <p className="display legible text-[46px] font-light leading-none tracking-tight text-white/95 tnum">
          {hh}
          <span className="text-white/45">:</span>
          {mm}
        </p>
        <p className="ui legible mt-2 text-[12.5px] font-medium text-white/85">
          {ov?.name} · {phaseLabel(sky.phase)}
          {sky.weather !== 'clear' ? ` · ${weatherLabel(sky.weather)}` : ''}
        </p>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 px-7 pb-[max(40px,calc(env(safe-area-inset-bottom)+24px))] transition-opacity duration-400 ${
          bare ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="display legible-strong text-[15.5px] leading-relaxed text-white/90">{ov?.blurb}</p>
        <div className="mt-2 flex items-baseline gap-2">
          {/* a bare "2 枚待收" right after collecting looks like a broken
              counter, so a barely-started purse says so in words */}
          {live.coin < 12 ? (
            <span className="ui legible-strong text-[12.5px] text-white/85">刚收过 · 正在攒</span>
          ) : (
            <>
              <span className="display legible-strong tnum text-[25px] font-semibold text-[#f7e2b4]">
                {fmtNum(live.coin)}
              </span>
              <span className="ui legible-strong text-[11.5px] text-white/85">
                枚待收{live.capped ? ' · 已存满' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* revealed controls — anchored low, where the thumb already is, and
          scrimmed so the glass never has masts showing through its labels */}
      <div
        className={`absolute inset-x-0 bottom-0 px-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+14px))] transition-all duration-400 ${
          bare ? 'pointer-events-none translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-[340px] rounded-[24px] border border-white/16 bg-[rgba(12,10,16,0.62)] p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => cycle(-1)}
              aria-label="上一处观景台"
              className="ui btn h-12 w-12 flex-none rounded-full border border-white/35 bg-white/12 text-[22px] leading-none text-white"
            >
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="ui truncate text-[13px] font-medium text-white">{ov?.name}</p>
              <p className="ui truncate text-[10.5px] text-white/85">
                {ov?.nameEn} · {Math.max(1, idx + 1)} / {unlocked.length}
              </p>
            </div>
            <button
              onClick={() => cycle(1)}
              aria-label="下一处观景台"
              className="ui btn h-12 w-12 flex-none rounded-full border border-white/35 bg-white/12 text-[22px] leading-none text-white"
            >
              ›
            </button>
          </div>

          <div className="mt-2.5 flex gap-2">
            {/* the widget's own action is the primary one here; leaving is not */}
            <button
              onClick={() => setHelp(true)}
              className="ui btn btn-brass h-12 flex-[1.35] rounded-xl text-[13px] font-medium"
            >
              放到桌面
            </button>
            <button
              onClick={onExit}
              className="ui btn h-12 flex-1 rounded-xl border border-white/35 bg-white/10 text-[12.5px] text-white"
            >
              回到摊子
            </button>
          </div>
          <p className="ui mt-2 text-center text-[11px] text-white/80">轻触风景收起 · 收益照常累积</p>
        </div>
      </div>

      {bare && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(136px,calc(env(safe-area-inset-bottom)+120px))] text-center">
          <span className="ui rounded-full border border-white/12 bg-[rgba(8,6,10,0.66)] px-4 py-1.5 text-[11px] tracking-wide text-white backdrop-blur-[3px]">
            轻触显示控制
          </span>
        </p>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <Sheet open={help} onClose={() => setHelp(false)} title="把观景台放到桌面" sub="widget 的做法" tall>
          <div className="space-y-4">
            {installable && (
              <button
                onClick={async () => {
                  const r = await promptInstall();
                  setInstallNote(
                    r === 'accepted' ? '装好了。回桌面看看那块风景。' : r === 'dismissed' ? '那就先算了。' : '',
                  );
                }}
                className="ui btn btn-brass h-12 w-full text-[13.5px] font-medium"
              >
                现在安装到桌面
              </button>
            )}
            {isStandalone() && !installable && (
              <p className="ui rounded-xl bg-[rgba(92,106,69,0.12)] px-3 py-2 text-[12px] text-[#3f4a2e]">
                你已经是从桌面打开的了。
              </p>
            )}
            {installNote && (
              <p className="ui rounded-xl bg-[rgba(184,135,63,0.12)] px-3 py-2 text-[12px] text-[#7a5418]">
                {installNote}
              </p>
            )}
            <div>
              <h4 className="display text-[15px] font-semibold text-[#2b2419]">iPhone · Safari</h4>
              <p className="ui mt-1 text-[12.5px] leading-relaxed text-[#6b6050]">
                分享 → 添加到主屏幕。图标点开就是全屏观景模式，没有地址栏。
                想要真正的桌面小组件，用「快捷指令」新建一个打开此链接的指令，再把指令放到桌面即可。
              </p>
            </div>
            <div>
              <h4 className="display text-[15px] font-semibold text-[#2b2419]">Android · Chrome</h4>
              <p className="ui mt-1 text-[12.5px] leading-relaxed text-[#6b6050]">
                菜单 → 添加到主屏幕 → 选择「安装」。部分启动器（Nova、Niagara 等）支持把网页做成可缩放的桌面窗口，
                拉成 4×2 就是一块会动的风景。
              </p>
            </div>
            <div>
              <h4 className="display text-[15px] font-semibold text-[#2b2419]">桌面 / 平板</h4>
              <p className="ui mt-1 text-[12.5px] leading-relaxed text-[#6b6050]">
                浏览器地址栏右侧的安装按钮，或者干脆全屏挂着当屏保。风景按真实时刻变化，天亮天黑都跟着你这边的时间。
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.62)] p-3">
              <p className="ui text-[12px] leading-relaxed text-[#6b6050]">
                观景模式里主角一直在演奏，收益照常累积。左右箭头可以换观景台——
                换了之后手记会记下这次启程。
              </p>
            </div>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
