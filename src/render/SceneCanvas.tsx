import { useEffect, useRef, useState } from 'react';
import { SceneRenderer } from './scene';
import { OVERLOOK_MAP } from '../content/overlooks';
import { skyState } from '../game/engine';
import { canvasWeather } from '../game/systems/weather';
import type { VisitorArt } from '../content/visitors/art';

interface Props {
  overlookId: string;
  playing?: boolean;
  showBard?: boolean;
  minimal?: boolean;
  reduceMotion?: boolean;
  className?: string;
  /** simulated hour override for previews */
  hourOverride?: number;
  /** draw one frame and stop — for thumbnails */
  still?: boolean;
  /** unusual figures at the stall; the caller decides who, this only draws */
  guests?: Array<{ id: string; art: VisitorArt }>;
}

/** ?hour=7.5 freezes the scene clock — handy for previews and screenshots */
const HOUR_PARAM = (() => {
  if (typeof window === 'undefined') return undefined;
  const v = new URLSearchParams(window.location.search).get('hour');
  if (v === null) return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : undefined;
})();

export default function SceneCanvas({
  overlookId,
  playing = true,
  showBard = true,
  minimal = false,
  reduceMotion = false,
  className,
  hourOverride,
  still = false,
  guests,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  /* A still canvas paints one frame and stops, which is what a thumbnail
     wants — until the thumbnail is asked to show a different place. This
     nonce pushes exactly one more frame when the inputs that matter to a
     preview change, instead of remounting (and re-acquiring a 2D context)
     every time someone taps around a map. */
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (still) setNonce((n) => n + 1);
  }, [still, overlookId, hourOverride]);

  const rendererRef = useRef<SceneRenderer | null>(null);
  const stateRef = useRef({ overlookId, playing, showBard, minimal, reduceMotion, hourOverride, still, guests });
  stateRef.current = { overlookId, playing, showBard, minimal, reduceMotion, hourOverride, still, guests };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!rendererRef.current) rendererRef.current = new SceneRenderer(canvas);
    const r = rendererRef.current;
    let raf = 0;
    let alive = true;
    let last = 0;

    const loop = (t: number) => {
      if (!alive) return;
      const cfg = stateRef.current;
      const minFrame = cfg.reduceMotion ? 200 : 1000 / 48;
      if (t - last >= minFrame) {
        last = t;
        const ov = OVERLOOK_MAP[cfg.overlookId] ?? OVERLOOK_MAP.mistquay;
        const sky = skyState(Date.now(), ov.id);
        const d = new Date();
        const hour =
          cfg.hourOverride ?? HOUR_PARAM ?? d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
        try {
          r.render({
            overlook: ov,
            phase: sky.phase,
            blend: sky.blend,
            hour,
            weather: canvasWeather(sky.weather),
            playing: cfg.playing,
            showBard: cfg.showBard,
            crowd: ov.crowd,
            motion: cfg.reduceMotion ? 0.12 : 1,
            minimal: cfg.minimal,
            guests: cfg.guests,
          });
        } catch (err) {
          console.error('scene render failed', err);
          alive = false;
          return;
        }
        if (cfg.still) return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      r.resize();
      if (stateRef.current.still) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(() => onResize());
    ro.observe(canvas);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [nonce]);

  return <canvas ref={ref} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
