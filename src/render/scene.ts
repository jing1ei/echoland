import type { CanvasWeather, Overlook, Palette } from '../game/types';
import type { Phase } from '../game/engine';
import type { VisitorArt } from '../content/visitors/art';
import { drawFeatures, drawForegroundFeatures, type FeatureCtx } from './features';
import { clamp, lerpColor, makeFbm, makeRng, mix, rgba, seedFrom, shade, smoothstep } from './util';

export interface RenderInput {
  overlook: Overlook;
  phase: Phase;
  blend: number;
  /** hour of day as 0..24 float */
  hour: number;
  /** the reduced, six-way look; systems/weather maps the real weather id
      onto one of these and the overlay layer adds the rest */
  weather: CanvasWeather;
  playing: boolean;
  showBard: boolean;
  crowd: number;
  motion: number;
  /** widget mode trims foreground clutter slightly */
  minimal?: boolean;
  /** the odd ones out in tonight's crowd — see systems/visitors.
      Silhouette parameters only; who they are and why they are here is
      decided well above the renderer. */
  guests?: Array<{ id: string; art: VisitorArt }>;
}

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number; k?: number };

const PHASE_ORDER: Phase[] = ['dawn', 'day', 'dusk', 'night'];

/* ------------------------------------------------------------
   Sky keyframes on a 24h timeline. Interpolating between two
   neighbouring anchors keeps midnight actually blue instead of
   half-way to dawn.
   ------------------------------------------------------------ */
const SKY_KEYS: Array<{ h: number; key: Phase; night: number }> = [
  { h: 0, key: 'night', night: 1 },
  { h: 4.4, key: 'night', night: 1 },
  { h: 6.3, key: 'dawn', night: 0.34 },
  { h: 8.4, key: 'day', night: 0 },
  { h: 15.8, key: 'day', night: 0 },
  { h: 18.2, key: 'dusk', night: 0.42 },
  { h: 20.4, key: 'night', night: 1 },
  { h: 24, key: 'night', night: 1 },
];

function skyByHour(pal: Palette, hour: number): { stops: [string, string, string]; nightness: number } {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && h > SKY_KEYS[i + 1].h) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const f = smoothstep(clamp((h - a.h) / Math.max(0.0001, b.h - a.h)));
  return {
    stops: [
      lerpColor(pal[a.key][0], pal[b.key][0], f),
      lerpColor(pal[a.key][1], pal[b.key][1], f),
      lerpColor(pal[a.key][2], pal[b.key][2], f),
    ],
    nightness: mix(a.night, b.night, f),
  };
}

function skyStops(pal: Palette, phase: Phase, blend: number): [string, string, string] {
  const i = PHASE_ORDER.indexOf(phase);
  const next = PHASE_ORDER[(i + 1) % 4];
  const f = smoothstep(blend);
  return [
    lerpColor(pal[phase][0], pal[next][0], f),
    lerpColor(pal[phase][1], pal[next][1], f),
    lerpColor(pal[phase][2], pal[next][2], f),
  ];
}
void skyStops;

function nightnessOf(phase: Phase, blend: number) {
  if (phase === 'night') return 1;
  if (phase === 'dusk') return smoothstep(blend) * 0.95;
  if (phase === 'dawn') return 1 - smoothstep(blend) * 0.95;
  return 0;
}
void nightnessOf;

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private t0 = performance.now();
  private lastFrame = performance.now();
  private parts: Record<string, P[]> = {};
  private notes: P[] = [];
  private fbmCache: Record<string, (x: number) => number> = {};
  private starCache: { key: string; pts: Array<[number, number, number, number]> } | null = null;
  private cloudStrip: HTMLCanvasElement | null = null;
  private cloudKey = '';
  private noise: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c = canvas.getContext('2d', { alpha: false });
    if (!c) throw new Error('no 2d context');
    this.ctx = c;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (w === this.W && h === this.H && dpr === this.dpr) return;
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.parts = {};
    this.starCache = null;
    this.cloudStrip = null;
  }

  private fbm(seed: string) {
    if (!this.fbmCache[seed]) this.fbmCache[seed] = makeFbm(seedFrom(seed), 4);
    return this.fbmCache[seed];
  }

  /* ---------------- particles ---------------- */

  private ensure(kind: string, n: number, init: (rng: () => number, i: number) => P) {
    if (this.parts[kind] && this.parts[kind].length === n) return this.parts[kind];
    const rng = makeRng(seedFrom(kind + this.W + 'x' + this.H));
    this.parts[kind] = Array.from({ length: n }, (_, i) => init(rng, i));
    return this.parts[kind];
  }

  private step(kind: string, dt: number, fn: (p: P, dt: number) => void) {
    const arr = this.parts[kind];
    if (arr) arr.forEach((p) => fn(p, dt));
  }

  /* ---------------- main ---------------- */

  render(input: RenderInput) {
    this.resize();
    const now = performance.now();
    const dtRaw = Math.min(0.08, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const motion = clamp(input.motion, 0, 1);
    const dt = dtRaw * motion;
    const time = ((now - this.t0) / 1000) * (motion > 0 ? 1 : 0);

    const { ctx, W, H } = this;
    const sc = input.overlook.scene;
    const pal = sc.palette;
    const forced = sc.forceNight;
    const sky = skyByHour(pal, forced ? 23 : input.hour);
    const stops = sky.stops;
    const nightness = forced ? 1 : sky.nightness;
    const seed = seedFrom(input.overlook.id);
    const fbmA = this.fbm(input.overlook.id + ':a');

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* Composition: the bard must live in the window between the top
       resource bar and the bottom takings card, so the ground line sits
       around 0.63H in game mode and lower in widget mode. */
    const groundY = H * (input.minimal ? 0.72 : 0.63);
    const horizonY = H * clamp(sc.horizon * (input.minimal ? 0.8 : 0.7), 0.24, 0.56);
    const waterTop = sc.water >= 0.5 ? horizonY : sc.water > 0 ? mix(horizonY, groundY, 0.5) : groundY;

    /* --- sky --- */
    const g = ctx.createLinearGradient(0, 0, 0, horizonY + H * 0.08);
    g.addColorStop(0, stops[0]);
    g.addColorStop(0.55, stops[1]);
    g.addColorStop(1, stops[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY + H * 0.1);
    ctx.fillStyle = stops[2];
    ctx.fillRect(0, horizonY + H * 0.09, W, H);

    /* --- stars --- */
    if (nightness > 0.02) {
      const key = `${W}x${H}:${input.overlook.id}`;
      if (!this.starCache || this.starCache.key !== key) {
        const rng = makeRng(seed + 999);
        const count = Math.floor((W * H) / 5200 * sc.stars);
        this.starCache = {
          key,
          pts: Array.from({ length: count }, () => [
            rng() * W,
            rng() * (horizonY * 0.98),
            0.35 + rng() * 1.25,
            rng() * Math.PI * 2,
          ]),
        };
      }
      const a = nightness;
      this.starCache.pts.forEach(([x, y, r, ph]) => {
        const tw = 0.55 + 0.45 * Math.sin(time * 1.4 + ph);
        ctx.fillStyle = rgba(r > 1.35 ? pal.accent2 : '#ffffff', a * tw * (0.35 + r * 0.4));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      // milky band on very starry scenes
      if (sc.stars > 1.2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const mg = ctx.createLinearGradient(0, horizonY * 0.18, W, horizonY * 0.62);
        mg.addColorStop(0, rgba('#ffffff', 0));
        mg.addColorStop(0.5, rgba(pal.accent2, 0.075 * nightness));
        mg.addColorStop(1, rgba('#ffffff', 0));
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.moveTo(0, horizonY * 0.1);
        ctx.lineTo(W, horizonY * 0.46);
        ctx.lineTo(W, horizonY * 0.72);
        ctx.lineTo(0, horizonY * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    /* --- aurora --- */
    if (sc.kind === 'aurora' || sc.kind === 'whalefall') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const arng = makeRng(seedFrom(input.overlook.id + ':aur'));
      for (let b = 0; b < 4; b++) {
        const yBase = horizonY * (0.16 + b * 0.13);
        const ag = ctx.createLinearGradient(0, yBase - H * 0.06, 0, yBase + H * 0.22);
        const c1 = b % 2 ? pal.accent : pal.accent2;
        ag.addColorStop(0, rgba(c1, 0));
        ag.addColorStop(0.4, rgba(c1, 0.21 * (0.5 + nightness * 0.5)));
        ag.addColorStop(1, rgba(c1, 0));
        ctx.fillStyle = ag;
        /* One continuous path whose thickness tapers to nothing at both frame
           edges. Alpha-faded slabs left visible seams where they abutted.
           The two ends taper over different distances and the body swells
           unevenly, because a mirror-symmetric curtain reads as a stamp. */
        const ridge = (x: number) => yBase + (fbmA(x * 0.004 + b * 9 + time * 0.06) - 0.5) * H * 0.16;
        const lw = W * (0.14 + arng() * 0.3);
        const rw = W * (0.14 + arng() * 0.3);
        const swellPhase = arng() * 6.28;
        const swell = (x: number) => 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((x / W) * 4.1 + swellPhase));
        const taper = (x: number) => smoothstep(Math.min(x / lw, (W - x) / rw));
        const step = 8;
        ctx.beginPath();
        for (let x = 0; x <= W; x += step) {
          const y = ridge(x);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let x = W; x >= 0; x -= step) {
          ctx.lineTo(x, ridge(x) + H * 0.2 * taper(x) * swell(x));
        }
        ctx.closePath();
        ctx.fill();

        /* vertical rays — the thing that makes an aurora look like an aurora */
        const rays = 7;
        for (let i = 0; i < rays; i++) {
          const x = W * (0.04 + arng() * 0.92);
          const t = taper(x) * swell(x);
          if (t < 0.25) continue;
          const y0 = ridge(x);
          const len = H * 0.2 * t * (0.5 + arng() * 0.8);
          const rg2 = ctx.createLinearGradient(0, y0, 0, y0 + len);
          rg2.addColorStop(0, rgba(c1, 0.14 * (0.4 + nightness * 0.6)));
          rg2.addColorStop(1, rgba(c1, 0));
          ctx.fillStyle = rg2;
          ctx.fillRect(x, y0, Math.max(1.2, W * (0.004 + arng() * 0.012)), len);
        }
      }
      ctx.restore();
    }

    /* --- sun / moon --- */
    this.drawCelestial(input, horizonY, nightness, pal);

    /* --- cloud band --- */
    this.drawClouds(input, horizonY, nightness, time, pal);

    /* --- horizon glow --- */
    const hg = ctx.createLinearGradient(0, horizonY - H * 0.16, 0, horizonY + H * 0.04);
    const glowCol = nightness > 0.6 ? pal.accent2 : pal.accent;
    hg.addColorStop(0, rgba(glowCol, 0));
    hg.addColorStop(1, rgba(glowCol, nightness < 0.14 ? 0.09 : nightness > 0.85 ? 0.14 : 0.28));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizonY - H * 0.16, W, H * 0.2);

    /* --- ridges --- */
    this.drawRidges(input, horizonY, waterTop, groundY, nightness, stops[2]);

    /* --- water --- */
    if (sc.water > 0) this.drawWater(input, waterTop, groundY, nightness, time, pal, stops[2]);

    /* --- scene features --- */
    const fctx: FeatureCtx = {
      ctx,
      W,
      H,
      horizonY,
      groundY,
      waterTop,
      pal,
      time,
      nightness,
      seed,
      fbm: fbmA,
      wind: 1,
      motion,
    };
    drawFeatures(sc.kind, fctx);

    /* --- terrace --- */
    this.drawTerrace(input, groundY, nightness);

    /* --- foreground props that must sit on top of the terrace --- */
    drawForegroundFeatures(sc.kind, fctx);

    /* --- audience + bard --- */
    if (input.showBard) {
      this.drawAudience(input, groundY, time, nightness);
      /* guests stand in front of the crowd and behind the busker: close
         enough to be noticed, never in the way of the performance */
      this.drawGuests(input, groundY, time, nightness);
      this.drawBard(input, groundY, time, nightness, dt);
    }

    /* --- particles --- */
    this.drawParticles(input, horizonY, waterTop, groundY, dt, time, nightness);

    /* --- grade --- */
    this.grade(nightness, input, pal);
  }

  private drawCelestial(input: RenderInput, horizonY: number, nightness: number, pal: Palette) {
    const { ctx, W, H } = this;
    const h = input.hour;
    const isNight = nightness > 0.62 || !!input.overlook.scene.forceNight;
    let p: number;
    if (isNight) {
      const n = h >= 19.5 ? h - 19.5 : h + 4.5;
      p = clamp(n / 9);
    } else {
      p = clamp((h - 4.5) / 15);
    }
    const x = W * (0.16 + 0.68 * p);
    /* a flatter arc near the ends: at 17:00 the label says dusk, so the sun
       has to sit low rather than halfway up the sky */
    const alt = Math.pow(Math.sin(p * Math.PI), 1.55);
    const y = horizonY - alt * H * (isNight ? 0.3 : 0.34) - H * 0.03;
    const r = Math.min(W, H) * (isNight ? 0.032 : 0.042);

    /* halo */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const col = isNight ? '#eaf1ff' : nightness < 0.18 ? '#fff6dd' : pal.accent;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 11);
    gg.addColorStop(0, rgba(col, isNight ? 0.3 : 0.46));
    gg.addColorStop(0.12, rgba(col, isNight ? 0.12 : 0.2));
    gg.addColorStop(0.4, rgba(col, isNight ? 0.04 : 0.07));
    gg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, r * 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* disc */
    /* three stops with a feathered rim — a hard-edged disc looked like a
       sticker pasted on the sky */
    const dg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.1, x, y, r * 1.06);
    dg.addColorStop(0, rgba('#ffffff', isNight ? 0.98 : 1));
    dg.addColorStop(0.78, rgba(col, isNight ? 0.86 : 0.96));
    dg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.06, 0, Math.PI * 2);
    ctx.fill();

    if (isNight) {
      /* maria — a few soft grey blots so it reads as a moon, not a hole */
      const rng = makeRng(seedFrom(input.overlook.id + ':moon'));
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const a = rng() * Math.PI * 2;
        const rr = rng() * r * 0.62;
        ctx.fillStyle = rgba('#b9c6dd', 0.16 + rng() * 0.12);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * (0.14 + rng() * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawClouds(input: RenderInput, horizonY: number, nightness: number, time: number, pal: Palette) {
    const { ctx, W, H } = this;
    const heavy = input.weather === 'rain' || input.weather === 'cloudy' || input.weather === 'snow';
    const key = `${W}x${H}:${input.overlook.id}:${input.phase}:${heavy ? 1 : 0}`;
    if (!this.cloudStrip || this.cloudKey !== key) {
      const cw = Math.max(2, Math.floor(W * 1.4));
      const ch = Math.max(2, Math.floor(horizonY));
      const off = document.createElement('canvas');
      off.width = cw;
      off.height = ch;
      const c = off.getContext('2d');
      if (c) {
        const rng = makeRng(seedFrom(key));
        /* Clouds are built from many small puffs clustered along a few bands.
           Each puff fades inside its own ellipse (gradient drawn in a scaled
           space) so no hard circular rims show up against a flat sky. */
        const bands = heavy ? 5 : 3;
        for (let b = 0; b < bands; b++) {
          const by = ch * (0.14 + (b / bands) * 0.7 + rng() * 0.05);
          const clusters = heavy ? 5 : 4;
          for (let k = 0; k < clusters; k++) {
            const cxBase = ((k + rng() * 0.8) / clusters) * cw;
            const scale = 0.55 + rng() * 0.85;
            const puffs = 5 + Math.floor(rng() * 4);
            for (let i = 0; i < puffs; i++) {
              const cx = cxBase + (rng() - 0.5) * ch * 0.5 * scale;
              const cy = by + (rng() - 0.5) * ch * 0.06;
              const rr = ch * (0.028 + rng() * 0.05) * scale;
              const tint = lerpColor('#ffffff', pal.ridge[0], 0.18 + rng() * 0.28);
              c.save();
              c.translate(cx, cy);
              c.scale(2.1, 0.66);
              const grad = c.createRadialGradient(0, 0, 0, 0, 0, rr);
              grad.addColorStop(0, rgba(tint, heavy ? 0.2 : 0.14));
              grad.addColorStop(0.5, rgba(tint, heavy ? 0.1 : 0.07));
              grad.addColorStop(1, rgba(tint, 0));
              c.fillStyle = grad;
              c.beginPath();
              c.arc(0, 0, rr, 0, Math.PI * 2);
              c.fill();
              c.restore();
            }
          }
        }
      }
      this.cloudStrip = off;
      this.cloudKey = key;
    }
    const strip = this.cloudStrip;
    if (!strip) return;
    const a = (0.7 + (heavy ? 0.3 : 0)) * (1 - nightness * 0.55);
    ctx.save();
    ctx.globalAlpha = a;
    const off = (time * 5) % strip.width;
    ctx.drawImage(strip, -off, 0, strip.width, horizonY);
    ctx.drawImage(strip, strip.width - off, 0, strip.width, horizonY);
    ctx.restore();
    void H;
  }

  private drawRidges(
    input: RenderInput,
    horizonY: number,
    waterTop: number,
    groundY: number,
    nightness: number,
    haze: string,
  ) {
    const { ctx, W, H } = this;
    const sc = input.overlook.scene;
    const pal = sc.palette;
    const ocean = sc.water >= 0.5;
    const bottom = ocean ? horizonY + H * 0.004 : waterTop;
    const layers = sc.ridges;

    for (let i = 0; i < layers; i++) {
      const d = layers === 1 ? 0 : i / (layers - 1);
      const fbm = this.fbm(input.overlook.id + ':r' + i);
      const amp = H * (0.018 + sc.jag * (0.04 + d * 0.1));
      const baseY = ocean
        ? horizonY - H * 0.004 - (1 - d) * H * 0.012
        : mix(horizonY + H * 0.012, groundY - H * 0.02, d);
      const colIdx = Math.min(3, Math.floor(d * 3.999));
      let col = pal.ridge[colIdx];
      /* aerial perspective: far layers wash out into the sky */
      col = lerpColor(col, haze, (1 - d) * 0.55);
      col = lerpColor(col, pal.night[1], nightness * 0.34);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, bottom + H * 0.02);
      const stepPx = 6;
      for (let x = 0; x <= W + stepPx; x += stepPx) {
        const n = fbm(x * (0.0022 + d * 0.0016) + i * 41);
        const n2 = fbm(x * 0.012 + i * 7) * (sc.jag * 0.5);
        ctx.lineTo(x, baseY - (n - 0.42) * amp * 2 - n2 * amp * 0.5);
      }
      ctx.lineTo(W, bottom + H * 0.02);
      ctx.closePath();
      ctx.fill();
      // rim light on the crest
      if (i >= layers - 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba(nightness > 0.6 ? pal.accent2 : pal.accent, nightness > 0.6 ? 0.07 : 0.13);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= W + stepPx; x += stepPx) {
          const n = fbm(x * (0.0022 + d * 0.0016) + i * 41);
          const n2 = fbm(x * 0.012 + i * 7) * (sc.jag * 0.5);
          const y = baseY - (n - 0.42) * amp * 2 - n2 * amp * 0.5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawWater(
    input: RenderInput,
    waterTop: number,
    groundY: number,
    nightness: number,
    time: number,
    pal: Palette,
    haze: string,
  ) {
    const { ctx, W, H } = this;
    const base = lerpColor(pal.water ?? pal.ridge[3], pal.night[1], nightness * 0.4);
    /* the water near the horizon mirrors the sky */
    const top = lerpColor(base, haze, 0.55);
    const g = ctx.createLinearGradient(0, waterTop, 0, groundY + H * 0.06);
    g.addColorStop(0, top);
    g.addColorStop(0.35, lerpColor(base, haze, 0.16));
    g.addColorStop(1, shade(base, nightness > 0.6 ? -0.34 : -0.22));
    ctx.fillStyle = g;
    ctx.fillRect(0, waterTop, W, groundY + H * 0.06 - waterTop);

    /* a soft haze band welded across the waterline — a hard colour jump at
       the horizon was the most artificial thing in the frame */
    const seam = ctx.createLinearGradient(0, waterTop - H * 0.05, 0, waterTop + H * 0.05);
    seam.addColorStop(0, rgba(haze, 0));
    seam.addColorStop(0.5, rgba(haze, 0.5));
    seam.addColorStop(1, rgba(haze, 0));
    ctx.fillStyle = seam;
    ctx.fillRect(0, waterTop - H * 0.05, W, H * 0.1);

    // sun/moon glitter column
    const isNight = nightness > 0.62 || !!input.overlook.scene.forceNight;
    const h = input.hour;
    const p = isNight ? clamp((h >= 19.5 ? h - 19.5 : h + 4.5) / 9) : clamp((h - 4.5) / 15);
    const cx = W * (0.16 + 0.68 * p);
    const grng = makeRng(seedFrom(input.overlook.id + ':glit'));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rows = 34;
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      const y = mix(waterTop + 1, groundY, t * t);
      const spread = W * (0.012 + t * 0.15);
      /* per-row jitter — evenly stacked bars read as a stair-step sprite */
      const jitter = (grng() - 0.5) * spread * 0.9;
      const wob = Math.sin(time * 1.6 + i * 0.9 + grng() * 3) * spread * 0.5;
      const a = (1 - t) * 0.24 * (isNight ? 0.7 : 1) * (0.55 + grng() * 0.7);
      const w = spread * (0.35 + t + grng() * 0.5);
      ctx.fillStyle = rgba(isNight ? '#dfe8ff' : pal.accent, a * 0.8);
      /* soft lozenges, not rectangles — hard blocks stacked into a staircase */
      ctx.beginPath();
      ctx.ellipse(
        cx + wob + jitter,
        y,
        w * 0.5,
        Math.max(0.7, H * 0.0016 * (0.6 + grng())),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    /* shimmer: broken strokes of uneven length instead of one repeated dash */
    const srng = makeRng(seedFrom(input.overlook.id + ':shim'));
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const y = mix(waterTop + 2, groundY, t * t + 0.02);
      const off = Math.sin(time * 0.9 + i * 1.7) * W * 0.05;
      const x0 = W * (0.02 + srng() * 0.6) + off;
      const len = W * (0.06 + srng() * 0.34) * (0.5 + t);
      ctx.strokeStyle = rgba('#ffffff', 0.04 + srng() * 0.07 * (1 - t * 0.5));
      ctx.lineWidth = srng() < 0.3 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + len, y + (srng() - 0.5) * 1.2);
      ctx.stroke();
    }
  }

  private drawTerrace(input: RenderInput, groundY: number, nightness: number) {
    const { ctx, W, H } = this;
    const pal = input.overlook.scene.palette;
    const g = ctx.createLinearGradient(0, groundY - H * 0.01, 0, H);
    g.addColorStop(0, lerpColor(pal.ground, pal.accent, 0.1));
    g.addColorStop(0.25, lerpColor(pal.ground, pal.night[1], nightness * 0.34));
    g.addColorStop(1, lerpColor(shade(pal.ground, -0.42), pal.night[0], nightness * 0.42));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, groundY + H * 0.012);
    const fbm = this.fbm(input.overlook.id + ':ground');
    for (let x = 0; x <= W + 8; x += 8) {
      ctx.lineTo(x, groundY + (fbm(x * 0.01) - 0.5) * H * 0.012);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // stone lip highlight
    ctx.strokeStyle = rgba(pal.accent, 0.16);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) {
      const y = groundY + (fbm(x * 0.01) - 0.5) * H * 0.012;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    /* foreground texture: without it the bottom third is a dead gradient.
       Seams get further apart towards the viewer, which sells the perspective. */
    const kind = input.overlook.scene.kind;
    const woody = kind === 'quay' || kind === 'cloudtop' || kind === 'whalefall';
    const grassy = kind === 'meadow' || kind === 'canopy' || kind === 'aurora';
    const rng = makeRng(seedFrom(input.overlook.id + ':fg'));
    const bottom = H + H * 0.02;

    if (woody) {
      // deck planks running away from the viewer
      const seams = 7;
      for (let i = 0; i < seams; i++) {
        const t = i / seams;
        const y = mix(groundY + H * 0.02, bottom, t * t + 0.05);
        ctx.strokeStyle = rgba('#120d09', 0.1 + t * 0.06);
        ctx.lineWidth = Math.max(1, H * 0.0016 + t * 1.6);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y + (fbm(i * 3.7) - 0.5) * H * 0.006);
        ctx.stroke();
        // butt joints
        const joints = 2 + Math.floor(rng() * 3);
        for (let j = 0; j < joints; j++) {
          const jx = rng() * W;
          ctx.beginPath();
          ctx.moveTo(jx, y);
          ctx.lineTo(jx, mix(y, bottom, 0.12));
          ctx.stroke();
        }
      }
    } else if (!grassy) {
      // cobbles / gravel — small flat ellipses, bigger as they come forward
      const n = 42;
      for (let i = 0; i < n; i++) {
        const t = rng();
        const y = mix(groundY + H * 0.02, bottom, t * t + 0.03);
        const x = rng() * W;
        const s = H * (0.003 + t * 0.009);
        ctx.fillStyle = rgba(rng() > 0.5 ? '#ffffff' : '#000000', 0.03 + rng() * 0.04);
        ctx.beginPath();
        ctx.ellipse(x, y, s * 1.8, s * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (grassy) {
      // tufts along the lip so the ground does not end on a hard line
      ctx.strokeStyle = rgba(shade(pal.ground, -0.4), 0.45);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < Math.floor(W / 9); i++) {
        const x = i * 9 + rng() * 5;
        const base = groundY + (fbm(x * 0.01) - 0.5) * H * 0.012 + H * 0.004;
        const hh = H * (0.006 + rng() * 0.012);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x + hh * 0.3, base - hh * 0.7, x + hh * 0.8, base - hh);
        ctx.stroke();
      }
    }

    // railing for cliff-type overlooks
    const railed = ['lighthouse', 'cloudtop', 'whalefall', 'belltower', 'kiln'];
    if (railed.includes(input.overlook.scene.kind) && !input.minimal) {
      const railY = groundY - H * 0.055;
      ctx.strokeStyle = rgba('#241c15', 0.5);
      ctx.lineWidth = Math.max(1.4, H * 0.005);
      ctx.beginPath();
      ctx.moveTo(W * 0.42, railY);
      ctx.lineTo(W, railY - H * 0.006);
      ctx.stroke();
      for (let x = W * 0.44; x < W; x += W * 0.07) {
        ctx.beginPath();
        ctx.moveTo(x, railY);
        ctx.lineTo(x, groundY);
        ctx.stroke();
      }
    }
  }

  private drawAudience(input: RenderInput, groundY: number, time: number, nightness: number) {
    const { ctx, W, H } = this;
    const pal = input.overlook.scene.palette;
    const rng = makeRng(seedFrom(input.overlook.id + ':aud'));
    const slots = 9;
    /* every listener used to be the same blob. each one now gets a build, a
       posture and sometimes a hat or a basket, so a crowd reads as people. */
    const figures = Array.from({ length: slots }, (_, i) => ({
      /* evenly spaced lanes with a little jitter — pure random x made pairs
         overlap into a single blob */
      x: W * (0.4 + ((i + 0.5) / slots) * 0.56 + (rng() - 0.5) * 0.045),
      depth: rng(),
      girth: mix(0.13, 0.23, rng()),
      child: rng() < 0.18,
      hat: rng() < 0.34,
      basket: rng() < 0.22,
      lean: (rng() - 0.5) * 0.16,
      phase: rng() * 6.28,
    }));

    for (let i = 0; i < slots; i++) {
      const f = figures[i];
      const present = (Math.sin(time * 0.07 + i * 2.3) * 0.5 + 0.5) < input.crowd + 0.08;
      if (!present) continue;
      const y = groundY + H * (0.012 + f.depth * 0.05);
      const hh = H * mix(0.055, 0.085, f.depth) * (f.child ? 0.7 : 1);
      const bob = Math.sin(time * 1.3 + f.phase) * hh * 0.014;
      const tiltX = f.lean * hh;
      const { x } = f;
      // contact shadow — without it the figures look pasted on
      ctx.fillStyle = rgba('#000000', 0.14 + f.depth * 0.06);
      ctx.beginPath();
      ctx.ellipse(x, y + hh * 0.02, hh * (f.girth + 0.08), hh * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(lerpColor('#241c18', pal.night[0], nightness * 0.5), 0.9 + f.depth * 0.1);
      // body
      ctx.beginPath();
      ctx.moveTo(x - hh * f.girth, y);
      ctx.quadraticCurveTo(x - hh * (f.girth + 0.04), y - hh * 0.7, x + tiltX, y - hh * 0.74 + bob);
      ctx.quadraticCurveTo(x + hh * (f.girth + 0.04), y - hh * 0.7, x + hh * f.girth, y);
      ctx.closePath();
      ctx.fill();
      // head
      const headY = y - hh * 0.84 + bob;
      ctx.beginPath();
      ctx.arc(x + tiltX * 1.1, headY, hh * (f.child ? 0.125 : 0.11), 0, Math.PI * 2);
      ctx.fill();
      if (f.hat) {
        ctx.beginPath();
        ctx.ellipse(x + tiltX * 1.1, headY - hh * 0.08, hh * 0.2, hh * 0.045, f.lean * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f.basket && !f.child) {
        ctx.beginPath();
        ctx.arc(x + hh * (f.girth + 0.1), y - hh * 0.22, hh * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------------
     Stall guests

     Same brush as the crowd — flat ink on the ground — with three
     things a local never has: a rim of colour, a silhouette you can
     name (hood, lantern, parasol, case) and a position inside the
     listening circle. Everything numeric arrives from
     content/visitors/art.ts; this method only knows how to draw.
     ------------------------------------------------------------ */
  private drawGuests(input: RenderInput, groundY: number, time: number, nightness: number) {
    const guests = input.guests;
    if (!guests || guests.length === 0) return;
    const { ctx, W, H } = this;
    const pal = input.overlook.scene.palette;

    guests.forEach((g, gi) => {
      const a = g.art;
      const rng = makeRng(seedFrom(g.id + ':guest'));
      const depth = 0.2 + rng() * 0.3;
      /* place 0 sits at the busker's elbow, 1 is the far edge of the crowd */
      const x = W * (0.36 + a.place * 0.56 + (rng() - 0.5) * 0.02);
      const y = groundY + H * (0.014 + depth * 0.05);
      const hh = H * mix(0.062, 0.092, depth) * a.scale;
      const girth = a.girth ?? 0.17;
      const sway = Math.sin(time * (input.playing ? 1.05 : 0.5) + gi * 1.7) * hh * 0.02 * a.sway;
      const lift = (a.float ?? 0) * hh * (1 + Math.sin(time * 0.6 + gi) * 0.25);
      const ink = lerpColor(a.ink, pal.night[0], nightness * 0.42);
      const top = y - hh - lift;

      /* the rim: what makes them read as not-from-here. A wash of their
         own colour behind the shape, plus a lit edge on the body. */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(x, top + hh * 0.42, hh * 0.05, x, top + hh * 0.42, hh * 1.5);
      rg.addColorStop(0, rgba(a.glow, 0.3 * a.glowStrength * (0.55 + nightness * 0.6)));
      rg.addColorStop(1, rgba(a.glow, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, top + hh * 0.42, hh * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // contact shadow
      ctx.fillStyle = rgba('#000000', 0.2);
      ctx.beginPath();
      ctx.ellipse(x, y + hh * 0.015, hh * (girth + 0.12), hh * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      if (a.prop === 'cat') {
        /* not everyone at the stall is a person */
        ctx.fillStyle = rgba(ink, 0.95);
        ctx.beginPath();
        ctx.ellipse(x, y - hh * 0.28, hh * 0.5, hh * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - hh * 0.42, y - hh * 0.52, hh * 0.22, 0, Math.PI * 2);
        ctx.fill();
        // ears
        ctx.beginPath();
        ctx.moveTo(x - hh * 0.58, y - hh * 0.66);
        ctx.lineTo(x - hh * 0.5, y - hh * 0.9);
        ctx.lineTo(x - hh * 0.38, y - hh * 0.68);
        ctx.closePath();
        ctx.fill();
        // tail, curling with the music
        ctx.strokeStyle = rgba(ink, 0.9);
        ctx.lineWidth = Math.max(1.2, hh * 0.07);
        ctx.beginPath();
        ctx.moveTo(x + hh * 0.44, y - hh * 0.3);
        ctx.quadraticCurveTo(
          x + hh * 0.82,
          y - hh * (0.42 + Math.sin(time * 1.4) * 0.12),
          x + hh * 0.66,
          y - hh * 0.72,
        );
        ctx.stroke();
        ctx.strokeStyle = rgba(a.glow, 0.24 * a.glowStrength);
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      // body
      ctx.fillStyle = rgba(ink, 0.94);
      ctx.beginPath();
      ctx.moveTo(x - hh * girth, y);
      ctx.quadraticCurveTo(x - hh * (girth + 0.05), top + hh * 0.3, x + sway, top + hh * 0.16);
      ctx.quadraticCurveTo(x + hh * (girth + 0.05), top + hh * 0.3, x + hh * girth, y);
      ctx.closePath();
      ctx.fill();
      // lit edge
      ctx.strokeStyle = rgba(a.glow, 0.34 * a.glowStrength);
      ctx.lineWidth = Math.max(1, hh * 0.022);
      ctx.stroke();

      // head
      const headR = hh * 0.115;
      const headY = top + hh * 0.06;
      ctx.fillStyle = rgba(ink, 0.96);
      ctx.beginPath();
      ctx.arc(x + sway * 1.1, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      switch (a.prop) {
        case 'hood': {
          // a peak over the head, shoulders swallowed by cloth
          ctx.beginPath();
          ctx.moveTo(x + sway - headR * 1.7, headY + headR * 1.5);
          ctx.quadraticCurveTo(x + sway, headY - headR * 2.5, x + sway + headR * 1.7, headY + headR * 1.5);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'wide_hat': {
          ctx.beginPath();
          ctx.ellipse(x + sway, headY - headR * 0.35, headR * 2.4, headR * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'veil': {
          ctx.fillStyle = rgba(a.glow, 0.3);
          ctx.beginPath();
          ctx.moveTo(x + sway - headR * 1.5, headY);
          ctx.quadraticCurveTo(x + sway, headY + hh * 0.34, x + sway + headR * 1.5, headY);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'parasol': {
          const py = top - hh * 0.06;
          ctx.fillStyle = rgba(ink, 0.9);
          ctx.beginPath();
          ctx.ellipse(x + sway, py, hh * 0.42, hh * 0.13, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = rgba(a.glow, 0.4 * a.glowStrength);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.strokeStyle = rgba(ink, 0.8);
          ctx.beginPath();
          ctx.moveTo(x + sway, py);
          ctx.lineTo(x + sway, py + hh * 0.3);
          ctx.stroke();
          break;
        }
        case 'lantern': {
          const lx = x + hh * (girth + 0.24);
          const ly = y - hh * 0.44;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, hh * 0.8);
          lg.addColorStop(0, rgba(a.glow, 0.75 * a.glowStrength));
          lg.addColorStop(1, rgba(a.glow, 0));
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(lx, ly, hh * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = rgba(ink, 0.85);
          ctx.lineWidth = Math.max(1, hh * 0.02);
          ctx.beginPath();
          ctx.moveTo(x + hh * girth * 0.8, y - hh * 0.62);
          ctx.lineTo(lx, ly - hh * 0.1);
          ctx.stroke();
          ctx.fillStyle = rgba(a.glow, 0.85);
          ctx.beginPath();
          ctx.rect(lx - hh * 0.07, ly - hh * 0.09, hh * 0.14, hh * 0.18);
          ctx.fill();
          break;
        }
        case 'case': {
          ctx.fillStyle = rgba(ink, 0.95);
          ctx.beginPath();
          ctx.ellipse(x - hh * (girth + 0.06), y - hh * 0.4, hh * 0.1, hh * 0.26, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = rgba(a.glow, 0.45 * a.glowStrength);
          ctx.lineWidth = 1.1;
          ctx.stroke();
          break;
        }
        case 'satchel': {
          ctx.fillStyle = rgba(ink, 0.95);
          ctx.beginPath();
          ctx.rect(x + hh * (girth - 0.02), y - hh * 0.44, hh * 0.2, hh * 0.16);
          ctx.fill();
          break;
        }
        case 'staff': {
          ctx.strokeStyle = rgba(ink, 0.9);
          ctx.lineWidth = Math.max(1.2, hh * 0.028);
          ctx.beginPath();
          ctx.moveTo(x + hh * (girth + 0.16), y);
          ctx.lineTo(x + hh * (girth + 0.1), top - hh * 0.1);
          ctx.stroke();
          ctx.fillStyle = rgba(a.glow, 0.55 * a.glowStrength);
          ctx.beginPath();
          ctx.arc(x + hh * (girth + 0.1), top - hh * 0.12, hh * 0.05, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default:
          break;
      }
    });
  }

  private drawBard(
    input: RenderInput,
    groundY: number,
    time: number,
    nightness: number,
    dt: number,
  ) {
    const { ctx, W, H } = this;
    const pal = input.overlook.scene.palette;
    const s = Math.min(W, H);
    const x = W * (input.minimal ? 0.24 : 0.27);
    const y = groundY + H * 0.035;
    const bh = s * (input.minimal ? 0.2 : 0.19);
    const ink = lerpColor('#2a2018', pal.night[0], nightness * 0.45);

    // warm rim glow behind him
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(x, y - bh * 0.5, 0, x, y - bh * 0.5, bh * 2.6);
    rg.addColorStop(0, rgba(pal.accent, 0.16));
    rg.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y - bh * 0.5, bh * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // shadow
    ctx.fillStyle = rgba('#000000', 0.2);
    ctx.beginPath();
    ctx.ellipse(x, y + bh * 0.05, bh * 0.6, bh * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // stool / crate
    ctx.fillStyle = lerpColor('#3a2a1c', pal.night[0], nightness * 0.4);
    ctx.fillRect(x - bh * 0.3, y - bh * 0.26, bh * 0.6, bh * 0.26);
    ctx.fillStyle = rgba('#000000', 0.18);
    ctx.fillRect(x - bh * 0.3, y - bh * 0.26, bh * 0.6, bh * 0.05);

    const breathe = Math.sin(time * 1.1) * bh * 0.012;

    // legs
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(x - bh * 0.1, y - bh * 0.24);
    ctx.lineTo(x + bh * 0.42, y - bh * 0.14);
    ctx.lineTo(x + bh * 0.46, y - bh * 0.02);
    ctx.lineTo(x + bh * 0.2, y - bh * 0.04);
    ctx.lineTo(x - bh * 0.02, y - bh * 0.12);
    ctx.closePath();
    ctx.fill();

    // torso + cloak
    ctx.beginPath();
    ctx.moveTo(x - bh * 0.3, y - bh * 0.22);
    ctx.quadraticCurveTo(x - bh * 0.36, y - bh * 0.62 + breathe, x - bh * 0.1, y - bh * 0.72 + breathe);
    ctx.quadraticCurveTo(x + bh * 0.22, y - bh * 0.76 + breathe, x + bh * 0.26, y - bh * 0.4);
    ctx.quadraticCurveTo(x + bh * 0.3, y - bh * 0.24, x + bh * 0.1, y - bh * 0.2);
    ctx.closePath();
    ctx.fill();

    // head
    const hy = y - bh * 0.82 + breathe;
    ctx.beginPath();
    ctx.arc(x + bh * 0.02, hy, bh * 0.115, 0, Math.PI * 2);
    ctx.fill();
    // wide-brim hat
    ctx.beginPath();
    ctx.ellipse(x + bh * 0.02, hy - bh * 0.05, bh * 0.3, bh * 0.07, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - bh * 0.1, hy - bh * 0.06);
    ctx.quadraticCurveTo(x + bh * 0.02, hy - bh * 0.28, x + bh * 0.16, hy - bh * 0.06);
    ctx.closePath();
    ctx.fill();
    // feather
    ctx.strokeStyle = rgba(pal.accent, 0.75);
    ctx.lineWidth = Math.max(1, bh * 0.028);
    ctx.beginPath();
    ctx.moveTo(x + bh * 0.14, hy - bh * 0.12);
    ctx.quadraticCurveTo(x + bh * 0.36, hy - bh * 0.32, x + bh * 0.46, hy - bh * 0.16);
    ctx.stroke();

    // instrument body
    const ix = x + bh * 0.16;
    const iy = y - bh * 0.42 + breathe;
    ctx.fillStyle = lerpColor('#7a4a24', pal.night[1], nightness * 0.4);
    ctx.beginPath();
    ctx.ellipse(ix, iy, bh * 0.24, bh * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // rose (sound hole) + a highlight so the bowl reads as round
    ctx.fillStyle = rgba('#150e08', 0.7);
    ctx.beginPath();
    ctx.ellipse(ix + bh * 0.04, iy - bh * 0.02, bh * 0.055, bh * 0.045, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba('#f6dfae', 0.18);
    ctx.lineWidth = Math.max(1, bh * 0.014);
    ctx.beginPath();
    ctx.ellipse(ix - bh * 0.05, iy + bh * 0.05, bh * 0.15, bh * 0.09, -0.3, 0, Math.PI);
    ctx.stroke();
    /* neck: short enough to read as a lute rather than a rifle barrel,
       with a bent-back headstock at the end */
    const nx = ix + bh * 0.46;
    const ny = iy - bh * 0.34;
    ctx.strokeStyle = lerpColor('#5c3418', pal.night[1], nightness * 0.4);
    ctx.lineWidth = Math.max(1.4, bh * 0.038);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ix + bh * 0.14, iy - bh * 0.11);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.6, bh * 0.05);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx + bh * 0.06, ny + bh * 0.06);
    ctx.stroke();
    // strings glint
    ctx.strokeStyle = rgba(pal.accent, 0.3);
    ctx.lineWidth = 1;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(ix + bh * 0.08 + k * 1.1, iy - bh * 0.07 + k * 1.1);
      ctx.lineTo(nx + k * 1.1, ny + k * 1.1);
      ctx.stroke();
    }

    // strumming arm
    const strum = input.playing ? Math.sin(time * 6.2) : Math.sin(time * 0.8) * 0.2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, bh * 0.075);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - bh * 0.02, y - bh * 0.62 + breathe);
    ctx.quadraticCurveTo(
      x + bh * 0.3,
      y - bh * 0.56 + breathe,
      ix + bh * 0.02 + strum * bh * 0.06,
      iy + bh * 0.1 + strum * bh * 0.05,
    );
    ctx.stroke();
    // fretting arm
    ctx.beginPath();
    ctx.moveTo(x + bh * 0.06, y - bh * 0.58 + breathe);
    ctx.quadraticCurveTo(x + bh * 0.42, y - bh * 0.72, ix + bh * 0.48, iy - bh * 0.34);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // open case with coins
    if (!input.minimal) {
      const cx = x - bh * 0.72;
      const cy = y + bh * 0.02;
      ctx.fillStyle = lerpColor('#4a3520', pal.night[0], nightness * 0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy, bh * 0.34, bh * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba('#1a1208', 0.6);
      ctx.beginPath();
      ctx.ellipse(cx, cy - bh * 0.005, bh * 0.27, bh * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      const cr = makeRng(seedFrom(input.overlook.id + 'coins'));
      for (let i = 0; i < 7; i++) {
        const a = cr() * Math.PI * 2;
        const rr = cr();
        const px = cx + Math.cos(a) * bh * 0.2 * rr;
        const py = cy + Math.sin(a) * bh * 0.05 * rr;
        const tw = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.7);
        ctx.fillStyle = rgba('#f2c96a', 0.55 + tw * 0.4);
        ctx.beginPath();
        ctx.ellipse(px, py, bh * 0.028, bh * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* music notes */
    if (input.playing) {
      if (Math.random() < dt * 3.2) {
        this.notes.push({
          x: ix + (Math.random() - 0.5) * bh * 0.2,
          y: iy - bh * 0.1,
          vx: 8 + Math.random() * 14,
          vy: -(14 + Math.random() * 16),
          r: bh * (0.05 + Math.random() * 0.035),
          a: 1,
          ph: Math.random() * Math.PI * 2,
          k: Math.random() < 0.5 ? 0 : 1,
        });
      }
    }
    this.notes = this.notes.filter((n) => n.a > 0.02);
    this.notes.forEach((n) => {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vy += 2 * dt;
      n.a -= dt * 0.42;
      n.ph += dt * 2.4;
      ctx.save();
      ctx.translate(n.x + Math.sin(n.ph) * 4, n.y);
      ctx.fillStyle = rgba(pal.accent, n.a * 0.85);
      ctx.beginPath();
      ctx.ellipse(0, 0, n.r * 0.62, n.r * 0.45, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(pal.accent, n.a * 0.85);
      ctx.lineWidth = Math.max(1, n.r * 0.17);
      ctx.beginPath();
      ctx.moveTo(n.r * 0.55, -n.r * 0.1);
      ctx.lineTo(n.r * 0.55, -n.r * 1.5);
      if (n.k) ctx.lineTo(n.r * 1.3, -n.r * 1.15);
      ctx.stroke();
      ctx.restore();
    });
  }

  private drawParticles(
    input: RenderInput,
    horizonY: number,
    waterTop: number,
    groundY: number,
    dt: number,
    time: number,
    nightness: number,
  ) {
    const { ctx, W, H } = this;
    const sc = input.overlook.scene;
    const pal = sc.palette;
    const kinds = new Set(sc.particles);
    if (input.weather === 'rain') kinds.add('rain');
    if (input.weather === 'snow') kinds.add('snow');
    if (input.weather === 'fog') kinds.add('mist');

    const wrap = (p: P) => {
      if (p.x < -30) p.x = W + 30;
      if (p.x > W + 30) p.x = -30;
    };

    if (kinds.has('mist')) {
      const arr = this.ensure('mist', 8, (r) => ({
        x: r() * W,
        y: mix(horizonY - H * 0.02, groundY + H * 0.04, r()),
        vx: 4 + r() * 10,
        vy: 0,
        r: H * (0.016 + r() * 0.03),
        a: 0.05 + r() * 0.05,
        ph: r() * 6.28,
      }));
      this.step('mist', dt, (p) => {
        p.x += p.vx * dt;
        wrap(p);
      });
      /* long, flat bands — mist should read as haze lying on the water,
         never as round blobs floating in it */
      arr.forEach((p) => {
        const y = p.y + Math.sin(time * 0.3 + p.ph) * 4;
        const g = ctx.createLinearGradient(0, y - p.r, 0, y + p.r);
        g.addColorStop(0, rgba('#ffffff', 0));
        g.addColorStop(0.5, rgba('#ffffff', p.a * (1 - nightness * 0.5)));
        g.addColorStop(1, rgba('#ffffff', 0));
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(p.x, y);
        ctx.scale(1, 1);
        ctx.beginPath();
        ctx.ellipse(0, 0, W * 0.9, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    if (kinds.has('petals') || kinds.has('leaves')) {
      const kind = kinds.has('petals') ? 'petals' : 'leaves';
      const col = kind === 'petals' ? pal.accent : shade(pal.accent, -0.25);
      const arr = this.ensure(kind, 46, (r) => ({
        x: r() * W,
        y: r() * H,
        vx: 10 + r() * 24,
        vy: 12 + r() * 26,
        r: 2 + r() * 3.2,
        a: 0.4 + r() * 0.5,
        ph: r() * 6.28,
      }));
      this.step(kind, dt, (p) => {
        p.ph += dt * 2.2;
        p.x += (p.vx + Math.sin(p.ph) * 18) * dt;
        p.y += p.vy * dt;
        if (p.y > H + 10) {
          p.y = -10;
          p.x = Math.random() * W;
        }
        wrap(p);
      });
      arr.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ph);
        ctx.fillStyle = rgba(col, p.a);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    if (kinds.has('rain')) {
      const arr = this.ensure('rain', 150, (r) => ({
        x: r() * W,
        y: r() * H,
        vx: -60 - r() * 40,
        vy: 620 + r() * 380,
        r: 6 + r() * 12,
        a: 0.1 + r() * 0.24,
        ph: 0,
      }));
      this.step('rain', dt, (p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > H + 12) {
          p.y = -20;
          p.x = Math.random() * (W + 200);
        }
        if (p.x < -40) p.x = W + 40;
      });
      ctx.lineWidth = 1;
      arr.forEach((p) => {
        ctx.strokeStyle = rgba('#e8f2ff', p.a);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (p.vx / p.vy) * p.r, p.y + p.r);
        ctx.stroke();
      });
      // splash on the terrace
      ctx.strokeStyle = rgba('#e8f2ff', 0.13);
      for (let i = 0; i < 14; i++) {
        const sx = ((time * 60 + i * 137) % W + W) % W;
        const rr = ((time * 2 + i) % 1) * 9;
        ctx.beginPath();
        ctx.arc(sx, groundY + H * 0.03 + (i % 4) * 6, rr, 0, Math.PI);
        ctx.stroke();
      }
    }

    if (kinds.has('snow')) {
      const arr = this.ensure('snow', 120, (r) => ({
        x: r() * W,
        y: r() * H,
        vx: 6 + r() * 18,
        vy: 22 + r() * 34,
        r: 0.7 + r() * 1.5,
        a: 0.28 + r() * 0.42,
        ph: r() * 6.28,
      }));
      this.step('snow', dt, (p) => {
        p.ph += dt * 1.4;
        p.x += (p.vx + Math.sin(p.ph) * 14) * dt;
        p.y += p.vy * dt;
        if (p.y > H + 6) {
          p.y = -6;
          p.x = Math.random() * W;
        }
        wrap(p);
      });
      arr.forEach((p) => {
        ctx.fillStyle = rgba('#ffffff', p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (kinds.has('fireflies')) {
      const arr = this.ensure('fireflies', 34, (r) => ({
        x: r() * W,
        y: mix(waterTop, H, r()),
        vx: (r() - 0.5) * 18,
        vy: (r() - 0.5) * 12,
        r: 1.4 + r() * 1.8,
        a: r(),
        ph: r() * 6.28,
      }));
      this.step('fireflies', dt, (p) => {
        p.ph += dt * (0.8 + p.r * 0.3);
        p.x += (p.vx + Math.cos(p.ph) * 10) * dt;
        p.y += (p.vy + Math.sin(p.ph * 0.7) * 8) * dt;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < waterTop) p.y = H;
        if (p.y > H) p.y = waterTop;
      });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      arr.forEach((p) => {
        const blink = Math.max(0, Math.sin(p.ph * 1.6));
        /* fireflies only exist after dusk — in daylight they read as lens dirt */
        const a = blink * nightness * 0.95;
        if (a < 0.02) return;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, rgba(pal.accent, a * 0.6));
        g.addColorStop(1, rgba(pal.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba('#fff8dc', a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (kinds.has('embers') || kinds.has('lanternfly')) {
      const kind = kinds.has('embers') ? 'embers' : 'lanternfly';
      const n = kind === 'embers' ? 46 : 22;
      const arr = this.ensure(kind, n, (r) => ({
        x: r() * W,
        y: mix(groundY, H, r()),
        vx: (r() - 0.5) * 14,
        vy: -(kind === 'embers' ? 26 + r() * 46 : 8 + r() * 14),
        r: kind === 'embers' ? 0.9 + r() * 1.8 : 2.4 + r() * 3,
        a: 0.4 + r() * 0.6,
        ph: r() * 6.28,
      }));
      this.step(kind, dt, (p) => {
        p.ph += dt * 1.8;
        p.x += (p.vx + Math.sin(p.ph) * 12) * dt;
        p.y += p.vy * dt;
        if (p.y < -12) {
          p.y = H + 8;
          p.x = Math.random() * W;
        }
        wrap(p);
      });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      arr.forEach((p) => {
        const fl = 0.55 + 0.45 * Math.sin(p.ph * 2.2);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, rgba(pal.accent, p.a * fl * 0.6));
        g.addColorStop(1, rgba(pal.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba('#fff2cf', p.a * fl * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (kinds.has('dust')) {
      const arr = this.ensure('dust', 60, (r) => ({
        x: r() * W,
        y: r() * H,
        vx: 16 + r() * 42,
        vy: (r() - 0.5) * 6,
        r: 0.7 + r() * 1.6,
        a: 0.12 + r() * 0.3,
        ph: r() * 6.28,
      }));
      this.step('dust', dt, (p) => {
        p.ph += dt;
        p.x += p.vx * dt;
        p.y += (p.vy + Math.sin(p.ph) * 4) * dt;
        wrap(p);
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });
      arr.forEach((p) => {
        ctx.fillStyle = rgba(input.phase === 'night' ? '#cfe0ff' : '#fff2d0', p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (kinds.has('sparks')) {
      const arr = this.ensure('sparks', 40, (r) => ({
        x: r() * W,
        y: r() * horizonY,
        vx: (r() - 0.5) * 4,
        vy: (r() - 0.5) * 3,
        r: 0.6 + r() * 1.3,
        a: r(),
        ph: r() * 6.28,
      }));
      this.step('sparks', dt, (p) => {
        p.ph += dt * 2.6;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      arr.forEach((p) => {
        const a = Math.max(0, Math.sin(p.ph)) * (0.3 + nightness * 0.7);
        ctx.fillStyle = rgba(pal.accent2, a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (kinds.has('gulls')) {
      const arr = this.ensure('gulls', 5, (r) => ({
        x: r() * W,
        y: mix(horizonY * 0.42, horizonY * 0.86, r()),
        vx: (r() < 0.5 ? -1 : 1) * (24 + r() * 34),
        vy: 0,
        r: 5 + r() * 7,
        a: 0.5 + r() * 0.4,
        ph: r() * 6.28,
      }));
      this.step('gulls', dt, (p) => {
        p.ph += dt * 3.4;
        p.x += p.vx * dt;
        p.y += Math.sin(p.ph * 0.4) * 6 * dt;
        if (p.x < -40) p.x = W + 40;
        if (p.x > W + 40) p.x = -40;
      });
      ctx.strokeStyle = rgba(lerpColor('#4a463e', pal.night[0], nightness * 0.55), 0.42);
      ctx.lineCap = 'round';
      arr.forEach((p) => {
        const flap = Math.sin(p.ph) * 0.42 + 0.34;
        const r = p.r * 0.62;
        ctx.lineWidth = Math.max(0.9, r * 0.14);
        ctx.beginPath();
        ctx.moveTo(p.x - r, p.y - flap * r * 0.7);
        ctx.quadraticCurveTo(p.x - r * 0.45, p.y + r * 0.06, p.x, p.y);
        ctx.quadraticCurveTo(p.x + r * 0.45, p.y + r * 0.06, p.x + r, p.y - flap * r * 0.7);
        ctx.stroke();
      });
      ctx.lineCap = 'butt';
    }

    if (kinds.has('whales')) {
      const arr = this.ensure('whales', 3, (r) => ({
        x: r() * W,
        y: mix(horizonY * 0.2, horizonY * 0.85, r()),
        vx: (r() < 0.5 ? -1 : 1) * (7 + r() * 9),
        vy: 0,
        r: Math.min(W, H) * (0.07 + r() * 0.08),
        a: 0.5 + r() * 0.35,
        ph: r() * 6.28,
      }));
      this.step('whales', dt, (p) => {
        p.ph += dt * 0.5;
        p.x += p.vx * dt;
        p.y += Math.sin(p.ph) * 5 * dt;
        if (p.x < -p.r * 4) p.x = W + p.r * 4;
        if (p.x > W + p.r * 4) p.x = -p.r * 4;
      });
      arr.forEach((p) => {
        const dir = p.vx > 0 ? 1 : -1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(dir, 1);
        ctx.rotate(Math.sin(p.ph) * 0.06);
        // glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 3.4);
        g.addColorStop(0, rgba(pal.accent, 0.14));
        g.addColorStop(1, rgba(pal.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = rgba(lerpColor(pal.ridge[2], pal.night[1], nightness * 0.5), p.a);
        ctx.beginPath();
        ctx.moveTo(-p.r * 1.6, 0);
        ctx.quadraticCurveTo(-p.r * 0.6, -p.r * 0.42, p.r * 0.9, -p.r * 0.2);
        ctx.quadraticCurveTo(p.r * 1.5, -p.r * 0.06, p.r * 1.5, 0);
        ctx.quadraticCurveTo(p.r * 1.2, p.r * 0.3, p.r * 0.3, p.r * 0.34);
        ctx.quadraticCurveTo(-p.r * 0.7, p.r * 0.34, -p.r * 1.6, 0);
        ctx.closePath();
        ctx.fill();
        // tail
        ctx.beginPath();
        ctx.moveTo(-p.r * 1.45, 0);
        ctx.lineTo(-p.r * 2.15, -p.r * 0.42);
        ctx.lineTo(-p.r * 1.85, 0);
        ctx.lineTo(-p.r * 2.1, p.r * 0.38);
        ctx.closePath();
        ctx.fill();
        // fin
        ctx.beginPath();
        ctx.moveTo(p.r * 0.1, p.r * 0.24);
        ctx.lineTo(-p.r * 0.3, p.r * 0.66);
        ctx.lineTo(p.r * 0.4, p.r * 0.3);
        ctx.closePath();
        ctx.fill();
        // bioluminescent dots
        for (let i = 0; i < 6; i++) {
          const dx = -p.r * 1.2 + (i / 6) * p.r * 2.4;
          ctx.fillStyle = rgba(pal.accent2, 0.5 + 0.4 * Math.sin(p.ph * 3 + i));
          ctx.beginPath();
          ctx.arc(dx, p.r * 0.14, p.r * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }
  }

  /** a small tiling noise canvas, built once — breaks the banding that large
      canvas gradients always show on phone screens */
  private noiseTile(): HTMLCanvasElement | null {
    if (this.noise) return this.noise;
    const n = document.createElement('canvas');
    n.width = 96;
    n.height = 96;
    const c = n.getContext('2d');
    if (!c) return null;
    const img = c.createImageData(96, 96);
    const rng = makeRng(20240918);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rng() - 0.5) * 92;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    this.noise = n;
    return n;
  }

  private grade(nightness: number, input: RenderInput, pal: Palette) {
    const { ctx, W, H } = this;
    // colour wash
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const wash = nightness > 0.65 ? pal.accent2 : pal.accent;
    ctx.fillStyle = rgba(wash, 0.1);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // vignette
    const g = ctx.createRadialGradient(W * 0.5, H * 0.46, Math.min(W, H) * 0.16, W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(10,8,14,${0.2 + nightness * 0.14})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* Text scrims come last so they also calm down particles drifting through
       the copy. Snow over a near-white snowfield was unreadable otherwise. */
    const bright = 1 - nightness;
    const floor = (input.minimal ? 0.24 : 0.18) + nightness * 0.12;
    const bottom = ctx.createLinearGradient(0, H * 0.68, 0, H);
    bottom.addColorStop(0, rgba('#0b0a09', 0));
    bottom.addColorStop(0.55, rgba('#0b0a09', floor * 0.35));
    bottom.addColorStop(1, rgba('#0b0a09', floor));
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);

    const top = ctx.createLinearGradient(0, 0, 0, H * 0.2);
    top.addColorStop(0, rgba('#0b0a09', 0.16 + bright * 0.06));
    top.addColorStop(1, rgba('#0b0a09', 0));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.2);

    /* film grain last of all: 2% of it is enough to kill the stepped bands in
       the big sky gradients without reading as noise */
    const tile = this.noiseTile();
    if (tile) {
      const pat = ctx.createPattern(tile, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }
  }
}
