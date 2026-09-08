import { useEffect, useMemo, useRef, useState } from 'react';
import SceneCanvas from '../render/SceneCanvas';
import { useGame } from '../game/store';
import { OVERLOOK_MAP } from '../content/overlooks';
import { INSTRUMENT_MAP, STANCE_MAP } from '../content/gear';
import { songName } from '../game/systems/songs';
import { fmtDuration, fmtNum, fmtRate, skyState } from '../game/engine';
import { isExtreme, weatherAudio, weatherNote } from '../game/systems/weather';
import { WEATHER_UI_TEXT } from '../content/weather';
import { guestsAt } from '../game/story';
import { sfx } from '../audio';
import { Chip, Icon, Meter } from './bits';
import WeatherOverlay from './WeatherOverlay';

export function livePending(
  state: ReturnType<typeof useGame>['state'],
  rates: ReturnType<typeof useGame>['rates'],
  now: number,
) {
  const elapsed = Math.min((now - state.lastTick) / 3600000, rates.offlineCap);
  const fresh = Math.max(0, Math.min(elapsed, rates.staminaCap - state.fatigue));
  const tired = Math.max(0, elapsed - fresh);
  const factor = state.upgrades.includes('up_apprentice') ? 0.62 : 0.35;
  const eff = fresh + tired * factor;
  return {
    coin: state.pending.coin + rates.coin * eff,
    insp: state.pending.insp + rates.insp * eff,
    renown: state.pending.renown + rates.renown * eff,
    leisure: Math.min(
      rates.leisureCap - state.leisure,
      state.pending.leisure + rates.leisure * elapsed,
    ),
    fatigue: Math.min(rates.staminaCap + 24, state.fatigue + elapsed * (STANCE_MAP[state.stance]?.drain ?? 1)),
    sinceCollect: (now - state.lastCollect) / 3600000,
    capped: elapsed >= rates.offlineCap - 0.001,
  };
}

interface Props {
  onOpenStrategy: () => void;
  onOpenOverlooks: () => void;
  onCollect: () => void;
  onOpenDecisions: () => void;
  onOpenSettings: () => void;
  paused: boolean;
  /** true = every control faded out, nothing but the view */
  bare: boolean;
  onToggleBare: () => void;
}

export default function StageView({
  onOpenStrategy,
  onOpenOverlooks,
  onCollect,
  onOpenDecisions,
  onOpenSettings,
  paused,
  bare,
  onToggleBare,
}: Props) {
  const { state, rates, now, markTipSeen } = useGame();
  const ov = OVERLOOK_MAP[state.overlook];
  const sky = useMemo(() => skyState(now, state.overlook), [Math.floor(now / 20000), state.overlook]);
  const live = livePending(state, rates, now);
  const [tapped, setTapped] = useState(0);

  /* ----------------------------------------------------------
     Who is at the stall

     Most of the crowd is wallpaper. Every so often one of the figures
     is wrong — taller, hooded, carrying a lantern at noon — and nothing
     happens. That is the feature: the player notices, and next time
     they leave the stall out a little longer. Some of those figures do
     eventually speak (content/visitors/triggers.ts), which is why the
     waiting pays.

     Nothing on this screen says so. There was a badge and a line of
     narration here; both are gone. A caption turns something you
     spotted into something you were told, and being told is worth far
     less. The only job left is to hand the silhouette to the canvas.
     ---------------------------------------------------------- */
  /* guestsAt() is memoised inside the system (the draw loop asks it dozens
     of times a second), so calling it every render is cheap. Keying our own
     memo on *who came back* rather than on a clock bucket means anything
     that changes the answer — a new window, a change of place, a value the
     GM layer forced — lands on the next frame instead of up to 15s later. */
  const guestsNow = guestsAt(state, now);
  const guestSig = guestsNow.map((g) => g.spec.id).join(',');
  const guests = useMemo(
    () => guestsNow.map((g) => ({ id: g.spec.id, art: g.art })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guestSig],
  );

  /* The tap-to-clear gesture is invisible by nature, so it gets exactly one
     mention, once per save, and it goes away the moment it is used or after
     a few seconds of being ignored. */
  const hintable = !state.tipsSeen.tip_bare && !bare;
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!hintable) return;
    const inId = window.setTimeout(() => setHint(true), 2600);
    const outId = window.setTimeout(() => setHint(false), 11000);
    return () => {
      window.clearTimeout(inId);
      window.clearTimeout(outId);
    };
  }, [hintable]);
  useEffect(() => {
    if (bare && !state.tipsSeen.tip_bare) markTipSeen('tip_bare');
  }, [bare, state.tipsSeen.tip_bare, markTipSeen]);

  /* A change of sky is worth a glance up, so it gets one short figure and
     one line of text. Both are content (content/weather/audio.ts and
     text.ts); the first render is deliberately silent — nobody wants a
     noise the moment the app opens. */
  const seenWeather = useRef<string | null>(null);
  const [weatherNoteText, setWeatherNoteText] = useState('');
  useEffect(() => {
    const prev = seenWeather.current;
    seenWeather.current = sky.weather;
    if (prev === null || prev === sky.weather) return;
    const cue = weatherAudio(sky.weather);
    if (cue && !paused) sfx.weather(cue.cue, cue.gain, cue.stagger, cue.dur);
    const note = weatherNote(sky.weather);
    if (!note) return;
    setWeatherNoteText(note);
    const id = window.setTimeout(() => setWeatherNoteText(''), 6400);
    return () => window.clearTimeout(id);
  }, [sky.weather, paused]);

  const inst = INSTRUMENT_MAP[state.instrument];
  const stance = STANCE_MAP[state.stance];
  const fatigueRatio = live.fatigue / rates.staminaCap;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <SceneCanvas
          overlookId={state.overlook}
          playing
          reduceMotion={state.reduceMotion || paused}
          guests={guests}
        />
      </div>

      {/* weather sits on the scenery, never instead of it */}
      <WeatherOverlay
        weather={sky.weather}
        overlookId={state.overlook}
        reduceMotion={state.reduceMotion || paused}
      />

      {/* ----------------------------------------------------------
          The tap-to-clear layer.

          It sits directly on the scenery, under every control. Anything
          that is actually UI is above it and swallows its own taps, so
          "tap the view" and "tap a button" never get confused. Once the
          controls are faded they stop taking pointer events, which turns
          this into a full-screen target to bring them back.
          ---------------------------------------------------------- */}
      <button
        onClick={onToggleBare}
        className="absolute inset-0 z-[1] cursor-default"
        aria-label={bare ? '显示界面' : '隐藏界面，只看风景'}
      />

      {/* the one-time nudge for the invisible gesture */}
      <div
        className="ui-fade pointer-events-none absolute inset-x-0 top-[46%] z-[2] text-center"
        data-hidden={!(hint && hintable)}
      >
        <span className="ui legible rounded-full bg-[rgba(10,8,14,0.3)] px-3 py-1.5 text-[11px] text-[rgba(255,250,238,0.82)] backdrop-blur-[2px]">
          点一下风景，只看风景
        </span>
      </div>

      {/* top gradient + header */}
      <div
        className={`ui-fade from-top pointer-events-none absolute inset-x-0 top-0 z-[2] h-44 vignette-top`}
        data-hidden={bare}
      />
      <div
        className="ui-fade from-top absolute inset-x-0 top-0 z-[3] px-4 pt-[max(14px,env(safe-area-inset-top))]"
        data-hidden={bare}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="ui legible-strong flex items-center gap-2 text-[10px] tracking-wider-2 text-[rgba(255,250,238,0.9)] uppercase">
              <span>{ov?.region}</span>
              <span className="h-[3px] w-[3px] rounded-full bg-[rgba(255,248,232,0.75)]" />
              <span>{sky.label}</span>
            </div>
            <h1 className="display legible-strong mt-0.5 text-[26px] font-semibold leading-none text-[rgba(255,251,242,0.99)]">
              {ov?.name}
            </h1>
            <p className="ui legible-strong mt-1 max-w-[210px] text-[11px] leading-snug text-[rgba(255,250,238,0.9)]">
              {ov?.blurb}
            </p>
            {/* extreme weather is rare enough to be worth naming, and it is
                also what the storm scenes hang off */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {sky.extreme && (
                <span className="ui legible inline-block rounded-full bg-[rgba(59,69,87,0.6)] px-2 py-[3px] text-[10px] text-[rgba(255,247,232,0.92)] backdrop-blur-[2px]">
                  {WEATHER_UI_TEXT.extremeTag} · {sky.label.split(' · ')[1] ?? ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5">
            <button
              onClick={onOpenOverlooks}
              className="ui btn glass h-8 rounded-full px-3 text-[11px] text-[rgba(255,250,238,0.92)]"
            >
              <Icon name="map" size={13} /> 换个地方
            </button>
            <button
              onClick={onOpenSettings}
              className="ui btn glass grid h-8 w-8 place-items-center rounded-full text-[rgba(255,250,238,0.92)]"
              aria-label="设置"
            >
              <Icon name="gear" size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* pending decisions nudge — the one thing that may not be hidden
          quietly, because it is the game waiting on the player */}
      {state.decisions.length > 0 && (
        <button
          onClick={onOpenDecisions}
          className="ui-fade from-top ui btn absolute left-4 top-[118px] z-[3] rounded-full border border-[rgba(217,174,99,0.6)] bg-[rgba(123,59,70,0.78)] px-3 py-1.5 text-[11px] text-[rgba(255,246,230,0.96)] backdrop-blur"
          data-hidden={bare}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8c58a] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#f0cd85]" />
          </span>
          有 {state.decisions.length} 件事等你答复
        </button>
      )}

      {/* the one line the sky gets to say for itself */}
      <div
        className="ui-fade pointer-events-none absolute inset-x-0 top-[40%] z-[2] px-8 text-center"
        data-hidden={!weatherNoteText}
      >
        <span className="ui legible rounded-2xl bg-[rgba(10,8,14,0.32)] px-3 py-1.5 text-[11.5px] leading-relaxed text-[rgba(255,250,238,0.86)] backdrop-blur-[2px]">
          {weatherNoteText}
        </span>
      </div>

      {/* bottom panel */}
      <div
        className="ui-fade from-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-72 vignette-bottom"
        data-hidden={bare}
      />
      <div
        className="ui-fade from-bottom absolute inset-x-0 bottom-[74px] z-[3] px-4"
        data-hidden={bare}
      >
        {/* strategy strip */}
        <button
          onClick={onOpenStrategy}
          className="glass mb-2.5 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left"
        >
          <span className="text-[#e8c58a]">
            <Icon name="lyre" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="ui truncate text-[11.5px] text-[rgba(255,250,238,0.95)]">
              {inst?.name} · {stance?.name}
            </div>
            <div className="ui truncate text-[10px] text-[rgba(255,248,232,0.8)]">
              {state.repertoire.map((s) => songName(state, s)).join(' ')}
              {rates.resonance > 0 && ` · 共鸣 +${Math.round(rates.resonance * 100)}%`}
            </div>
          </div>
          <span className="ui rounded-full border border-[rgba(255,255,255,0.22)] px-2 py-[3px] text-[10px] text-[rgba(255,250,238,0.8)]">
            制定策略
          </span>
        </button>

        {/* takings card */}
        <div className="paper paper-edge rounded-3xl px-4 pb-3.5 pt-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">琴箱里</div>
              <div className="display tnum -mt-0.5 text-[34px] font-semibold leading-none text-[#2b2419]">
                {fmtNum(live.coin)}
                <span className="ui ml-1 text-[12px] font-normal text-[#6a5f4c]">枚</span>
              </div>
            </div>
            <div className="text-right">
              <div className="ui tnum text-[12px] text-[#5a4f3d]">
                {fmtRate(rates.coin)} <span className="text-[10px] text-[#6f6350]">/时</span>
              </div>
              <div className="ui mt-0.5 text-[10px] text-[#6f6350]">
                已演奏 {fmtDuration(live.sinceCollect)}
              </div>
            </div>
          </div>

          {/* The takings card used to carry a strip of four: coin, then
              +灵感 / 此地名气 / +闲暇. Three of those are numbers you can
              do nothing about while standing here, and the home screen is
              supposed to be a view. They now live on the explore screen,
              where they get spent, and the collect sheet still reports
              every one of them the moment you pick the hat up. What is
              left is the one thing the stall is actually producing, plus
              whoever is waiting to talk to you. */}
          {state.pendingEvents.length > 0 && (
            <div className="mt-2 flex items-center">
              <Chip tone="brass">{state.pendingEvents.length} 段见闻</Chip>
            </div>
          )}

          <div className="mt-2.5">
            <div className="ui mb-1 flex items-center justify-between text-[9.5px] tracking-wider-2 text-[#6f6350] uppercase">
              <span>手劲</span>
              <span className="tnum normal-case tracking-normal">
                {fatigueRatio >= 1
                  ? `现在 ${state.upgrades.includes('up_apprentice') ? 62 : 35}% 效率`
                  : `余力 ${Math.round((1 - fatigueRatio) * 100)}%`}
              </span>
            </div>
            <Meter
              value={Math.max(0, rates.staminaCap - live.fatigue)}
              max={rates.staminaCap}
              /* spent stamina still earns at a reduced rate — the hatched
                 remainder says so instead of leaving an empty track */
              ghost={fatigueRatio >= 1 ? (state.upgrades.includes('up_apprentice') ? 0.62 : 0.35) : 0}
              tone={fatigueRatio >= 1 ? '#a85a5a' : fatigueRatio > 0.7 ? '#c08a3a' : '#7d9455'}
            />
            <p className="ui mt-1.5 text-[10px] leading-snug text-[#6a5f4c]">
              {live.capped
                ? `离线上限 ${rates.offlineCap} 小时已满 — 再放也不涨了。`
                : fatigueRatio >= 1
                  ? `${state.upgrades.includes('up_apprentice') ? '手劲见底，学徒替你顶着，收益按 62% 折算。' : '手劲见底，收益按 35% 折算。收一次摊就回满。'}`
                  : `满效率还能撑 ${fmtDuration(Math.max(0, rates.staminaCap - live.fatigue) / (STANCE_MAP[state.stance]?.drain ?? 1))}。`}
            </p>
          </div>

          <button
            onClick={() => {
              setTapped(Date.now());
              onCollect();
            }}
            className="ui btn btn-brass pulse-ring relative mt-3 h-12 w-full text-[14.5px] font-medium tracking-wide"
          >
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <span className="shimmer absolute inset-0 opacity-40" />
            </span>
            收摊结账
          </button>
          {tapped > 0 && <div className="sr-only">collected</div>}
        </div>
      </div>

      {/* a single line of afterthought while the UI is away: enough to tell
          the player the tap was intentional and reversible */}
      <div
        className="ui-fade pointer-events-none absolute inset-x-0 bottom-[max(26px,env(safe-area-inset-bottom))] z-[2] text-center"
        data-hidden={!bare}
      >
        <p className="ui legible text-[10.5px] tracking-wider-2 text-[rgba(255,250,238,0.6)] uppercase">
          {ov?.name} · tap to return
        </p>
      </div>
    </div>
  );
}
