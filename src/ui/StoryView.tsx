import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { CHARACTER_MAP } from '../game/story';
import { OVERLOOK_MAP } from '../content/overlooks';
import { fmtNum } from '../game/engine';
import type { Note } from '../game/story';
import SceneCanvas from '../render/SceneCanvas';
import Portrait from '../render/PortraitCanvas';
import { spiritCue } from '../game/systems/spirits';
import type { FeelingBeat } from '../game/story';
import { BOND_UI_TEXT } from '../content/bond';
import { ENMITY_UI_TEXT } from '../content/enmity';
import { sfx } from '../audio';

/* ============================================================
   The AVG layer

   Shape of an adventure-game scene: someone stands there, and what
   they say sits underneath them. Three rules kept this from feeling
   like a modal dialog with a picture stapled on:

   1. The live scenery keeps running behind the cast, so a conversation
      happens at the place you are actually busking, at the hour it
      actually is.
   2. Tapping anywhere advances. The whole screen is the button, which
      is the only comfortable thing to do one-handed on a phone.
   3. Rewards float up as they happen instead of arriving in a summary
      nobody reads.

   With one deliberate exception. The two relationship stats — affection
   and enmity — are hidden: they never float, never show a number, never
   appear as a chip. When either moves, the screen dims and the box says
   one sentence about how someone is looking at you now (content/bond and
   content/enmity). A number would turn a relationship into a progress
   bar to farm; a sentence keeps it a relationship.

   Warm and cold beats are the same mechanism with opposite skins: gold
   and lit for "they think better of you", pale blue and flat for "that
   one is going to sit between you for a while". Same queue, same box,
   same tap — see game/systems/beat.ts.
   ============================================================ */

/* the two skins. Everything a beat looks like is decided here, so a
   third axis later needs a palette rather than a component. */
const BEAT_SKIN = {
  warm: {
    label: BOND_UI_TEXT.beatLabel,
    tapHint: BOND_UI_TEXT.beatTapHint,
    plate: '#e6bd76',
    plateSoft: 'rgba(255,255,255,0.42)',
    body: 'rgba(255,241,214,0.97)',
    bodySoft: 'rgba(255,247,235,0.9)',
    glow: '0 0 22px rgba(230,189,118,0.28)',
    veil: 'radial-gradient(120% 80% at 50% 42%, rgba(9,8,14,0.28) 0%, rgba(7,6,11,0.96) 78%)',
  },
  cold: {
    label: ENMITY_UI_TEXT.beatLabel,
    tapHint: ENMITY_UI_TEXT.beatTapHint,
    plate: '#93a4bd',
    plateSoft: 'rgba(197,210,230,0.4)',
    body: 'rgba(222,231,244,0.95)',
    bodySoft: 'rgba(214,224,239,0.88)',
    /* no glow: a grudge does not shine */
    glow: 'none',
    veil: 'radial-gradient(120% 80% at 50% 42%, rgba(7,9,16,0.34) 0%, rgba(5,7,13,0.97) 76%)',
  },
} as const;

const skinOf = (b: FeelingBeat | null) => BEAT_SKIN[b?.tone ?? 'warm'];

const LINE_LABEL: Record<string, { t: string; c: string }> = {
  main: { t: '主线', c: '#e6bd76' },
  side: { t: '支线', c: '#c49bb0' },
  bond: { t: '同行', c: '#a8c0a0' },
  ambient: { t: '路上', c: 'rgba(255,255,255,0.6)' },
};

function noteText(n: Note): string {
  if (n.n == null) return n.label;
  const sign = n.n >= 0 ? '+' : '−';
  const v = Math.abs(n.n);
  return `${n.label} ${sign}${v >= 10 ? fmtNum(v) : v.toFixed(v < 1 ? 1 : 0)}`;
}

function noteColor(n: Note): string {
  if (n.kind === 'unlock' || n.kind === 'get') return '#a8c0a0';
  if (n.n != null && n.n < 0) return '#d59a9a';
  return '#e6bd76';
}

/* ------------------------------------------------------------
   Typewriter

   Punctuation gets a longer beat than a character does. It is a small
   thing that makes a line of Chinese prose read at the speed you
   would actually say it.
   ------------------------------------------------------------ */

function useTypewriter(text: string, enabled: boolean) {
  const [n, setN] = useState(enabled ? 0 : text.length);
  const done = n >= text.length;

  useEffect(() => {
    setN(enabled ? 0 : text.length);
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled || n >= text.length) return;
    const ch = text[n];
    const beat = '，。、；：？！…—'.includes(ch) ? 120 : '「」（）'.includes(ch) ? 40 : 26;
    const id = window.setTimeout(() => setN((v) => v + 1), beat);
    return () => window.clearTimeout(id);
  }, [n, text, enabled]);

  return { shown: text.slice(0, n), done, finish: () => setN(text.length) };
}

/* ------------------------------------------------------------ */

export default function StoryView() {
  const { story, storyAdvance, storyChoose, storyClose, state } = useGame();
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState(false);
  const [floaters, setFloaters] = useState<Array<{ id: number; n: Note }>>([]);
  const floatId = useRef(0);
  /* feeling beats queue instead of overlapping: two people changing their
     mind about you in one scene are two separate moments */
  const [beats, setBeats] = useState<FeelingBeat[]>([]);
  const beat = beats[0] ?? null;
  const skin = skinOf(beat);

  const say = story?.out.t === 'say' ? story.out : null;
  const choose = story?.out.t === 'choose' ? story.out : null;
  const ended = story?.out.t === 'end';

  /* while a feeling beat is up it owns the box, so it owns the typewriter */
  const bodyText = beat ? beat.text : (say?.text ?? '');
  const typed = useTypewriter(bodyText, !state.reduceMotion);

  /* new notes rise off the box as they are earned — except feelings, which
     are not rewards you collect but things you notice */
  useEffect(() => {
    if (!story?.notes.length) return;
    const felt = story.notes
      .filter((n) => n.kind === 'feel' && n.beat)
      .map((n) => n.beat as FeelingBeat);
    if (felt.length) setBeats((b) => [...b, ...felt]);

    const rest = story.notes.filter((n) => n.kind !== 'feel');
    if (!rest.length) return;
    const batch = rest.map((n) => ({ id: ++floatId.current, n }));
    setFloaters((f) => [...f, ...batch]);
    const id = window.setTimeout(
      () => setFloaters((f) => f.filter((x) => !batch.some((b) => b.id === x.id))),
      2200,
    );
    return () => window.clearTimeout(id);
  }, [story?.notes]);

  /* a beat that is ignored lets go by itself — an idle game should never
     need a tap to keep reading */
  useEffect(() => {
    if (!beat) return;
    const id = window.setTimeout(() => setBeats((b) => b.slice(1)), beat.hold);
    return () => window.clearTimeout(id);
  }, [beat]);

  useEffect(() => {
    if (!story) setBeats([]);
  }, [story?.sceneId, story]);

  /* an instrument spirit stepping on stage gets its own figure — the
     notes live in content/spirits/audio.ts, this only fires them once
     per arrival */
  const heard = useRef<Set<string>>(new Set());
  useEffect(() => {
    const cast = story?.runner.cast;
    if (!cast) return;
    for (const c of cast) {
      if (heard.current.has(c.who)) continue;
      heard.current.add(c.who);
      const cue = spiritCue(c.who);
      if (cue) sfx.weather(cue.cue, cue.gain, cue.stagger, cue.dur);
    }
  }, [story?.runner.cast]);

  useEffect(() => {
    if (!story) heard.current.clear();
  }, [story?.sceneId, story]);

  const tap = useCallback(() => {
    if (!story) return;
    if (log) return;
    /* a beat is a full stop: it takes the tap, and the story waits */
    if (beat) {
      if (!typed.done) typed.finish();
      else setBeats((b) => b.slice(1));
      return;
    }
    if (ended) {
      storyClose();
      return;
    }
    if (choose) return; // must pick
    if (!typed.done) {
      typed.finish();
      return;
    }
    storyAdvance();
  }, [story, log, beat, ended, choose, typed, storyAdvance, storyClose]);

  /* auto-play: an idle game should be readable with a thumb parked */
  useEffect(() => {
    if (!auto || !story || choose || ended || beat) return;
    if (!typed.done) return;
    const id = window.setTimeout(() => storyAdvance(), 900);
    return () => window.clearTimeout(id);
  }, [auto, story, choose, ended, beat, typed.done, storyAdvance]);

  useEffect(() => {
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tap();
      }
      if (e.key === 'Escape' && ended) storyClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [story, tap, ended, storyClose]);

  const bg = story?.runner.bg.overlook ?? state.overlook;
  const accent = useMemo(() => OVERLOOK_MAP[bg]?.scene.palette.accent ?? '#e6bd76', [bg]);

  if (!story) return null;

  const speaker = say?.who ? CHARACTER_MAP[say.who] : null;
  const cast = story.runner.cast;
  const line = LINE_LABEL[story.line] ?? LINE_LABEL.ambient;

  /* Scripts write the bard's own lines as unattributed text in quotes —
     「你怎么知道有人要来。」 — because the player has no portrait and no
     fixed name. Labelling those "旁白" reads wrong. Detect the quotes and
     call it what it is. Presentation-only, so no scene needs rewriting. */
  const selfLine = !speaker && !!say && /^[「"“]/.test(say.text.trim());

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-center"
      data-story={story.sceneId}
      /* tests (and nothing else) read these: a feeling beat is on screen
         and the box is showing prose instead of a number */
      data-beat={beat ? beat.tone : undefined}
      data-warm={beat?.tone === 'warm' ? (beat.heavy ? 'tier' : '1') : undefined}
      data-cold={beat?.tone === 'cold' ? (beat.heavy ? 'tier' : '1') : undefined}
    >
      <div className="relative h-full w-full max-w-[520px] overflow-hidden bg-[#0b0a10]">
        {/* backdrop: the place you are actually standing */}
        <SceneCanvas
          overlookId={bg}
          playing
          showBard={false}
          minimal
          reduceMotion={state.reduceMotion}
          className="absolute inset-0 scale-[1.06]"
        />
        <div className="absolute inset-0 bg-[rgba(9,8,14,0.44)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgba(8,7,12,0.72)] to-transparent" />

        {/* title strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span
              className="ui rounded-full px-2 py-[3px] text-[10px] tracking-wider-2"
              style={{ background: 'rgba(10,8,14,0.55)', color: line.c, border: `1px solid ${line.c}44` }}
            >
              {line.t}
            </span>
            <span className="ui legible text-[11px] text-white/70">{story.title}</span>
          </div>
        </div>

        {/* cast */}
        <div className="absolute inset-x-0 bottom-0 top-0" onClick={tap}>
          {cast.map((c) => {
            const ch = CHARACTER_MAP[c.who];
            if (!ch) return null;
            const active = say?.who === c.who || cast.length === 1;
            return (
              <div
                key={c.who}
                className="absolute bottom-[176px] transition-all duration-500 ease-out"
                style={{
                  left: c.side === 'left' ? '-6%' : c.side === 'right' ? undefined : '50%',
                  right: c.side === 'right' ? '-6%' : undefined,
                  transform: `${c.side === 'center' ? 'translateX(-50%)' : ''} scale(${active ? 1 : 0.94}) translateY(${active ? 0 : 10}px)`,
                  filter: active ? 'none' : 'saturate(0.7)',
                  zIndex: active ? 3 : 2,
                }}
              >
                <Portrait
                  look={ch.look}
                  as={c.as}
                  height={Math.min(430, Math.round(window.innerHeight * 0.52))}
                  rim={accent}
                  dim={active ? 0 : 0.42}
                  halo
                />
              </div>
            );
          })}
        </div>

        {/* floaters */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[196px] z-20 flex flex-col items-center gap-1">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="ui float-up rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
              style={{
                background: 'rgba(12,10,16,0.72)',
                color: noteColor(f.n),
                border: `1px solid ${noteColor(f.n)}55`,
              }}
            >
              {noteText(f.n)}
            </span>
          ))}
        </div>

        {/* ----------------------------------------------------------
            The feeling beat.

            Nothing floats, nothing counts. The place goes dark, the
            person you were talking to stays lit at the edges, and the
            box says one sentence. Tap (or wait) and the scene picks up
            exactly where it was. Warm and cold differ only in palette.
            ---------------------------------------------------------- */}
        <div
          className="pointer-events-none absolute inset-0 z-[25] transition-opacity duration-700"
          style={{ background: skin.veil, opacity: beat ? beat.dim : 0 }}
        />

        {/* dialogue box */}
        <div className="absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-none h-24 bg-gradient-to-t from-[rgba(9,8,14,0.95)] to-transparent" />
          <div className="bg-[rgba(9,8,14,0.94)] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-[2px]">
            {/* name plate */}
            <div className="flex min-h-[26px] items-end justify-between gap-3">
              {beat ? (
                <span
                  className="ui text-[10px] tracking-wider-2 uppercase"
                  style={{ color: beat.heavy ? skin.plate : skin.plateSoft }}
                >
                  {skin.label}
                </span>
              ) : speaker ? (
                <div className="flex items-baseline gap-2">
                  <span className="display text-[16px] font-semibold" style={{ color: accent }}>
                    {speaker.name}
                  </span>
                  <span className="ui text-[10px] text-white/40">{speaker.role}</span>
                </div>
              ) : selfLine && !ended && !choose ? (
                <div className="flex items-baseline gap-2">
                  <span className="display text-[16px] font-semibold text-[#a8c0a0]">我</span>
                  <span className="ui text-[10px] text-white/35">走唱的</span>
                </div>
              ) : (
                <span className="ui text-[10px] tracking-wider-2 text-white/35 uppercase">
                  {ended ? '这一场结束了' : choose ? (choose.prompt ?? '你怎么做') : '旁白'}
                </span>
              )}
              <div className="flex flex-none items-center gap-1.5 pb-[2px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLog(true);
                  }}
                  className="ui rounded-full border border-white/15 px-2.5 py-[3px] text-[10.5px] text-white/60"
                >
                  回顾
                </button>
                {!ended && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAuto((a) => !a);
                  }}
                  className="ui rounded-full border px-2.5 py-[3px] text-[10.5px]"
                  style={{
                    borderColor: auto ? `${accent}88` : 'rgba(255,255,255,0.15)',
                    color: auto ? accent : 'rgba(255,255,255,0.6)',
                  }}
                >
                  自动
                </button>
                )}
              </div>
            </div>

            <div className="rule-lt my-2 opacity-30" />

            {/* body */}
            <div className="min-h-[92px]" onClick={tap}>
              {beat ? (
                <p
                  className="display whitespace-pre-line text-[16.5px] leading-[1.95] italic"
                  style={{
                    color: beat.heavy ? skin.body : skin.bodySoft,
                    textShadow: beat.heavy ? skin.glow : 'none',
                  }}
                >
                  {typed.shown}
                  {!typed.done && <span className="caret" />}
                </p>
              ) : (
                say && (
                  <p className="display legible-strong whitespace-pre-line text-[16.5px] leading-[1.9] text-white/95">
                    {typed.shown}
                    {!typed.done && <span className="caret" />}
                  </p>
                )
              )}

              {!beat && choose && (
                <div className="space-y-2 py-0.5">
                  {choose.options.map((o) => (
                    <button
                      key={o.index}
                      disabled={!o.enabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        storyChoose(o.index);
                      }}
                      className={`w-full rounded-[14px] border px-3.5 py-2.5 text-left transition-all ${
                        o.enabled
                          ? 'border-white/15 bg-white/[0.06] active:scale-[0.99]'
                          : 'border-white/8 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="display text-[15px] font-medium leading-snug"
                          style={{ color: o.enabled ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.36)' }}
                        >
                          {o.label}
                        </span>
                        {o.enabled && o.chance != null && (
                          <span
                            className="ui mt-[3px] flex-none rounded-full border px-1.5 py-[1px] text-[9.5px]"
                            style={{ borderColor: `${accent}55`, color: accent }}
                          >
                            未必成
                          </span>
                        )}
                      </div>
                      {o.enabled
                        ? o.hint && <p className="ui mt-1 text-[11px] leading-snug text-white/45">{o.hint}</p>
                        : o.lockNote && (
                            <p className="ui mt-1 text-[11px] leading-snug text-[#c9a06a]">{o.lockNote}</p>
                          )}
                    </button>
                  ))}
                </div>
              )}

              {!beat && ended && (
                <div>
                  <p className="ui text-[12.5px] leading-relaxed text-white/55">
                    {story.earned.length ? '这一趟的收获：' : '这件事就这么过去了。'}
                  </p>
                  {story.earned.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {story.earned.map((n, i) => (
                        <span
                          key={i}
                          className="ui rounded-full border px-2 py-[3px] text-[11px]"
                          style={{ borderColor: `${noteColor(n)}55`, color: noteColor(n) }}
                        >
                          {noteText(n)}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      storyClose();
                    }}
                    className="ui btn btn-brass mt-4 h-11 w-full text-[13.5px]"
                  >
                    记下了
                  </button>
                </div>
              )}
            </div>

            {/* advance hint */}
            {(say || beat) && (
              <p className="ui mt-1 text-right text-[10px] text-white/28">
                {beat
                  ? typed.done
                    ? skin.tapHint
                    : '轻触跳过'
                  : typed.done
                    ? '轻触继续'
                    : '轻触跳过'}
              </p>
            )}
          </div>
        </div>

        {/* backlog */}
        {log && (
          <div className="absolute inset-0 z-40 flex flex-col bg-[rgba(8,7,12,0.96)]">
            <div className="flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))] pb-3">
              <h3 className="display text-[18px] font-semibold text-white/92">刚才说了什么</h3>
              <button
                onClick={() => setLog(false)}
                className="ui rounded-full border border-white/18 px-3 py-1 text-[11.5px] text-white/70"
              >
                收起
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-8 no-scrollbar">
              {story.history.length === 0 && (
                <p className="ui text-[12.5px] text-white/40">还没说什么。</p>
              )}
              {story.history.map((h, i) => {
                const you = h.who === '__you';
                const ch = h.who && !you ? CHARACTER_MAP[h.who] : null;
                const mine = !you && !ch && /^[「"“]/.test(h.text.trim());
                return (
                  <div key={i}>
                    <p
                      className="ui text-[10.5px] tracking-wider-2"
                      style={{
                        color: you || mine ? '#a8c0a0' : ch ? accent : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {you ? '你选了' : (ch?.name ?? (mine ? '我' : '旁白'))}
                    </p>
                    <p className="display mt-0.5 whitespace-pre-line text-[14.5px] leading-[1.8] text-white/80">
                      {h.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
