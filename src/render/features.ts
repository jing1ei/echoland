import type { Palette, SceneKind } from '../game/types';
import { clamp, lerpColor, makeRng, mix, rgba, shade, smoothstep } from './util';

export interface FeatureCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  horizonY: number;
  groundY: number;
  waterTop: number;
  pal: Palette;
  /** seconds */
  time: number;
  /** 0 = full day, 1 = deep night */
  nightness: number;
  seed: number;
  fbm: (x: number) => number;
  wind: number;
  motion: number;
}

/* ---------------- shared primitives ---------------- */

function tree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  kind: 'pine' | 'round' | 'cherry' | 'dead',
  sway: number,
) {
  const w = h * 0.1;
  /* trunks are always darker than the crown — a pale trunk under a pale
     canopy reads as a floating cloud on a stick */
  ctx.fillStyle = kind === 'dead' ? color : shade(color, -0.45);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y);
  ctx.lineTo(x - w * 0.16 + sway * 0.3, y - h * 0.62);
  ctx.lineTo(x + w * 0.16 + sway * 0.3, y - h * 0.62);
  ctx.lineTo(x + w * 0.35, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;

  if (kind === 'pine') {
    for (let i = 0; i < 4; i++) {
      const p = i / 4;
      const cy = y - h * (0.4 + p * 0.6);
      const cw = h * 0.34 * (1 - p * 0.72);
      ctx.beginPath();
      ctx.moveTo(x + sway * (0.3 + p), cy - h * 0.24);
      ctx.lineTo(x - cw + sway * (0.3 + p * 0.9), cy);
      ctx.lineTo(x + cw + sway * (0.3 + p * 0.9), cy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'dead') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, h * 0.03);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      const bx = x + sway;
      const by = y - h * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * h * 0.34, by + Math.sin(a) * h * 0.36);
      ctx.stroke();
    }
  } else {
    const blobs = kind === 'cherry' ? 7 : 5;
    const r = makeRng(Math.floor(x * 31 + h));
    for (let i = 0; i < blobs; i++) {
      const bx = x + (r() - 0.5) * h * 0.5 + sway * 1.2;
      const by = y - h * (0.6 + r() * 0.38);
      const br = h * (0.13 + r() * 0.13);
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function lantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  glow: string,
  alpha: number,
  swing: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.strokeStyle = rgba('#1a1410', 0.55);
  ctx.lineWidth = Math.max(0.6, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.6);
  ctx.lineTo(0, -s * 0.9);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 4.2);
  g.addColorStop(0, rgba(glow, 0.55 * alpha));
  g.addColorStop(0.4, rgba(glow, 0.16 * alpha));
  g.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s * 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(glow, 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.62, s * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#2a1c12', 0.75);
  ctx.fillRect(-s * 0.66, -s * 0.95, s * 1.32, s * 0.16);
  ctx.fillRect(-s * 0.5, s * 0.8, s * 1.0, s * 0.14);
  ctx.restore();
}

function building(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
  win: string,
  litRatio: number,
  seed: number,
) {
  ctx.fillStyle = body;
  ctx.fillRect(x, y - h, w, h);
  // roof
  ctx.beginPath();
  ctx.moveTo(x - w * 0.09, y - h);
  ctx.lineTo(x + w * 0.5, y - h - h * 0.16);
  ctx.lineTo(x + w * 1.09, y - h);
  ctx.closePath();
  ctx.fill();
  const r = makeRng(seed);
  const cols = Math.max(1, Math.round(w / 15));
  const rows = Math.max(1, Math.round(h / 22));
  const cw = w / (cols + 1);
  const rh = h / (rows + 0.6);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = r() < litRatio;
      ctx.fillStyle = lit ? win : rgba('#0d1016', 0.5);
      const wx = x + cw * (i + 0.62);
      const wy = y - h + rh * (j + 0.5);
      ctx.fillRect(wx, wy, cw * 0.5, rh * 0.42);
    }
  }
}

function cloudSea(f: FeatureCtx, top: number, bottom: number, tint: string, drift: number) {
  const { ctx, W } = f;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgba(tint, 0.95));
  g.addColorStop(0.5, rgba(shade(tint, 0.12), 0.98));
  g.addColorStop(1, rgba(shade(tint, -0.25), 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, bottom - top);

  for (let layer = 0; layer < 4; layer++) {
    const yy = top + (bottom - top) * (0.08 + layer * 0.22);
    const amp = (bottom - top) * (0.05 + layer * 0.02);
    const spd = drift * (0.4 + layer * 0.5);
    ctx.fillStyle = rgba(layer % 2 ? '#ffffff' : shade(tint, 0.25), 0.16 + layer * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    for (let x = 0; x <= W; x += 8) {
      const n = f.fbm((x + spd) * 0.006 + layer * 13);
      ctx.lineTo(x, yy + (n - 0.5) * amp * 2);
    }
    ctx.lineTo(W, bottom);
    ctx.closePath();
    ctx.fill();
  }
}

/* ---------------- per-scene features ---------------- */

export function drawFeatures(kind: SceneKind, f: FeatureCtx) {
  switch (kind) {
    case 'quay':
      return quay(f);
    case 'lighthouse':
      return lighthouse(f);
    case 'meadow':
      return meadow(f);
    case 'bridge':
      return bridge(f);
    case 'dunes':
      return dunes(f);
    case 'cloudtop':
      return cloudtop(f);
    case 'aurora':
      return auroraScene(f);
    case 'belltower':
      return belltower(f);
    case 'rainlane':
      return rainlane(f);
    case 'canopy':
      return canopy(f);
    case 'whalefall':
      return whalefall(f);
    case 'kiln':
      return kiln(f);
  }
}

function quay(f: FeatureCtx) {
  const { ctx, W, H, waterTop, groundY, pal } = f;
  const dark = pal.ridge[3];
  // moored boats
  const rng = makeRng(f.seed + 11);
  for (let i = 0; i < 4; i++) {
    const depth = rng();
    const y = mix(waterTop + (groundY - waterTop) * 0.12, groundY - 12, depth);
    const s = mix(0.5, 1.5, depth) * (H * 0.055);
    const x = W * (0.12 + rng() * 0.8);
    const bob = Math.sin(f.time * 0.9 + i * 2.1) * s * 0.06 * f.motion;
    ctx.fillStyle = rgba(dark, 0.82);
    ctx.beginPath();
    ctx.moveTo(x - s, y + bob);
    ctx.quadraticCurveTo(x, y + s * 0.5 + bob, x + s, y + bob);
    ctx.closePath();
    ctx.fill();
    // mast
    ctx.strokeStyle = rgba(dark, 0.8);
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y + bob);
    ctx.lineTo(x - s * 0.1, y - s * 1.5 + bob);
    ctx.stroke();
    // sail
    ctx.fillStyle = rgba(shade(pal.accent, 0.2), 0.28);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y - s * 1.4 + bob);
    ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.7 + bob, x - s * 0.1, y - s * 0.1 + bob);
    ctx.closePath();
    ctx.fill();
    /* waterline: a dark smear under the hull plus a squashed mirror image.
       Without them the boats hovered over the water instead of floating in it. */
    ctx.fillStyle = rgba('#0b0f14', 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y + bob + s * 0.16, s * 1.05, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(0, (y + bob) * 2 + s * 0.2);
    ctx.scale(1, -0.42);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = rgba(dark, 0.9);
    ctx.beginPath();
    ctx.moveTo(x - s, y + bob);
    ctx.quadraticCurveTo(x, y + s * 0.5 + bob, x + s, y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y - s * 1.4 + bob);
    ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.7 + bob, x - s * 0.1, y - s * 0.1 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // pier posts on the near water
  for (let i = 0; i < 7; i++) {
    const x = W * (0.03 + i * 0.155);
    const ph = H * (0.05 + (i % 3) * 0.012);
    const y = groundY + 4;
    ctx.fillStyle = rgba('#241c15', 0.85);
    ctx.fillRect(x, y - ph, Math.max(2, W * 0.008), ph);
    ctx.fillStyle = rgba('#241c15', 0.3);
    ctx.fillRect(x - 2, y - ph - 3, Math.max(4, W * 0.012), 4);
  }
  // rope
  ctx.strokeStyle = rgba('#241c15', 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const x = W * (0.03 + i * 0.155) + W * 0.004;
    const ph = H * (0.05 + (i % 3) * 0.012);
    const y = groundY + 4 - ph;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(x - W * 0.077, y + H * 0.02, x, y);
  }
  ctx.stroke();
}

function lighthouse(f: FeatureCtx) {
  const { ctx, W, H, horizonY, pal } = f;
  const bx = W * 0.78;
  const baseY = horizonY + H * 0.06;
  /* the whole tower has to fit on screen — cap the height so the lamp room
     never runs off the top of the frame */
  const th = Math.min(H * 0.3, Math.max(H * 0.16, baseY - H * 0.16));
  const tw = W * 0.032;
  // cliff
  ctx.fillStyle = pal.ridge[3];
  ctx.beginPath();
  ctx.moveTo(W * 0.6, f.groundY);
  ctx.lineTo(W * 0.66, baseY + H * 0.02);
  ctx.lineTo(W * 0.72, baseY - H * 0.01);
  ctx.lineTo(W * 0.86, baseY + H * 0.005);
  ctx.lineTo(W * 0.95, baseY + H * 0.05);
  ctx.lineTo(W, f.groundY);
  ctx.closePath();
  ctx.fill();
  // tower
  const g = ctx.createLinearGradient(bx - tw, 0, bx + tw, 0);
  g.addColorStop(0, shade(pal.ridge[2], -0.3));
  g.addColorStop(0.55, shade(pal.ridge[1], 0.05));
  g.addColorStop(1, shade(pal.ridge[3], -0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(bx - tw, baseY);
  ctx.lineTo(bx - tw * 0.55, baseY - th);
  ctx.lineTo(bx + tw * 0.55, baseY - th);
  ctx.lineTo(bx + tw, baseY);
  ctx.closePath();
  ctx.fill();
  // stripes — a lighthouse is read by its bands, so keep them high contrast
  for (let i = 0; i < 3; i++) {
    const p = 0.16 + i * 0.26;
    const y = baseY - th * p;
    const wAt = mix(tw, tw * 0.55, p);
    ctx.fillStyle = rgba(i % 2 ? '#f3ece0' : '#2a211c', i % 2 ? 0.5 : 0.42);
    ctx.fillRect(bx - wAt, y, wAt * 2, th * 0.09);
  }
  // keeper's hut at the foot, so the tower has a sense of scale
  ctx.fillStyle = shade(pal.ridge[3], -0.2);
  ctx.fillRect(bx - tw * 2.6, baseY - H * 0.024, tw * 1.5, H * 0.024);
  ctx.beginPath();
  ctx.moveTo(bx - tw * 2.75, baseY - H * 0.024);
  ctx.lineTo(bx - tw * 1.85, baseY - H * 0.036);
  ctx.lineTo(bx - tw * 0.95, baseY - H * 0.024);
  ctx.closePath();
  ctx.fill();
  // lamp room: gallery deck + railing, glazed room, conical roof
  const lampY = baseY - th - H * 0.026;
  const gw = tw * 1.2;
  ctx.fillStyle = shade(pal.ridge[3], -0.15);
  ctx.fillRect(bx - gw, lampY + H * 0.018, gw * 2, H * 0.006);
  ctx.strokeStyle = rgba('#241c15', 0.7);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const rx = bx - gw + (gw * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(rx, lampY + H * 0.018);
    ctx.lineTo(rx, lampY + H * 0.009);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(bx - gw, lampY + H * 0.009);
  ctx.lineTo(bx + gw, lampY + H * 0.009);
  ctx.stroke();
  // glazed lantern room
  ctx.fillStyle = rgba(lerpColor(pal.accent, '#ffffff', 0.35), 0.85);
  ctx.fillRect(bx - tw * 0.62, lampY - H * 0.004, tw * 1.24, H * 0.024);
  ctx.strokeStyle = rgba('#241c15', 0.55);
  for (let i = 1; i < 3; i++) {
    const gx = bx - tw * 0.62 + (tw * 1.24 * i) / 3;
    ctx.beginPath();
    ctx.moveTo(gx, lampY - H * 0.004);
    ctx.lineTo(gx, lampY + H * 0.02);
    ctx.stroke();
  }
  // roof + finial
  ctx.beginPath();
  ctx.moveTo(bx - gw * 0.92, lampY - H * 0.004);
  ctx.lineTo(bx, lampY - H * 0.032);
  ctx.lineTo(bx + gw * 0.92, lampY - H * 0.004);
  ctx.closePath();
  ctx.fillStyle = shade(pal.ridge[3], -0.3);
  ctx.fill();
  ctx.fillRect(bx - 1, lampY - H * 0.042, 2, H * 0.011);
  const lensY = lampY + H * 0.008;
  const beamAngle = (f.time * 0.35 * f.motion) % (Math.PI * 2);
  const lampGlow = 0.35 + f.nightness * 0.65;
  const rg = ctx.createRadialGradient(bx, lensY, 0, bx, lensY, W * 0.3);
  rg.addColorStop(0, rgba(pal.accent, 0.75 * lampGlow));
  rg.addColorStop(0.25, rgba(pal.accent, 0.16 * lampGlow));
  rg.addColorStop(1, rgba(pal.accent, 0));
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(bx, lensY, W * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // rotating beam — starts at the lens, not at the roof
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // a single wedge — mirroring it made a grey plank skewering the tower
  for (const dir of [0]) {
    const a = beamAngle + dir;
    const spread = 0.1;
    const len = W * 1.1;
    const lg = ctx.createLinearGradient(bx, lensY, bx + Math.cos(a) * len, lensY + Math.sin(a) * len * 0.35);
    lg.addColorStop(0, rgba(pal.accent, 0.26 * lampGlow));
    lg.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(bx, lensY);
    ctx.lineTo(bx + Math.cos(a - spread) * len, lensY + Math.sin(a - spread) * len * 0.35);
    ctx.lineTo(bx + Math.cos(a + spread) * len, lensY + Math.sin(a + spread) * len * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = rgba(lerpColor(pal.accent, '#ffffff', 0.4), 0.95);
  ctx.beginPath();
  ctx.arc(bx, lensY, Math.max(2, W * 0.007), 0, Math.PI * 2);
  ctx.fill();
}

function meadow(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  const rng = makeRng(f.seed + 3);
  for (let i = 0; i < 3; i++) {
    const x = W * (0.14 + i * 0.31 + rng() * 0.06);
    const scale = 0.7 + rng() * 0.6;
    const baseY = horizonY + H * (0.03 + i * 0.035);
    const th = H * 0.125 * scale;
    const tw = W * 0.055 * scale;
    const body = shade(pal.ridge[3], -0.1);
    // tower
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - tw, baseY);
    ctx.lineTo(x - tw * 0.52, baseY - th);
    ctx.lineTo(x + tw * 0.52, baseY - th);
    ctx.lineTo(x + tw, baseY);
    ctx.closePath();
    ctx.fill();
    // cap
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.66, baseY - th);
    ctx.quadraticCurveTo(x, baseY - th - tw * 1.1, x + tw * 0.66, baseY - th);
    ctx.closePath();
    ctx.fill();
    // door + window, so it reads as a mill rather than a pylon
    ctx.fillStyle = rgba('#100c08', 0.4);
    ctx.fillRect(x - tw * 0.22, baseY - th * 0.3, tw * 0.44, th * 0.3);

    const hubY = baseY - th - tw * 0.35;
    const spin = f.time * (0.28 + i * 0.1) * f.motion + i;
    const blade = th * 0.55;
    for (let b = 0; b < 4; b++) {
      const a = spin + (b * Math.PI) / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // each sail is a broad quad with a lattice of slats
      const px = -sa;
      const py = ca;
      const wSail = blade * 0.2;
      ctx.fillStyle = rgba(body, 0.95);
      ctx.beginPath();
      ctx.moveTo(x + px * wSail * 0.25, hubY + py * wSail * 0.25);
      ctx.lineTo(x + ca * blade + px * wSail, hubY + sa * blade + py * wSail);
      ctx.lineTo(x + ca * blade - px * wSail * 0.2, hubY + sa * blade - py * wSail * 0.2);
      ctx.lineTo(x - px * wSail * 0.25, hubY - py * wSail * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#0e0b08', 0.35);
      ctx.lineWidth = 1;
      for (let s = 0.25; s < 1; s += 0.25) {
        ctx.beginPath();
        ctx.moveTo(x + ca * blade * s, hubY + sa * blade * s);
        ctx.lineTo(x + ca * blade * s + px * wSail * s, hubY + sa * blade * s + py * wSail * s);
        ctx.stroke();
      }
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, hubY, Math.max(1.6, tw * 0.16), 0, Math.PI * 2);
    ctx.fill();
  }
  // hedgerow trees
  for (let i = 0; i < 9; i++) {
    const x = W * (0.02 + rng() * 0.96);
    const d = rng();
    const y = mix(horizonY + H * 0.1, groundY - H * 0.02, d);
    const h = H * mix(0.05, 0.11, d);
    tree(ctx, x, y, h, pal.ridge[Math.min(3, 1 + Math.floor(d * 3))], 'round', Math.sin(f.time * 0.7 + i) * 2 * f.motion);
  }
  // wheat standing in front of the terrace — drawn in the foreground pass,
  // otherwise the terrace fill paints straight over it
}

/** Anything that must sit on top of the terrace fill. */
export function drawForegroundFeatures(kind: SceneKind, f: FeatureCtx) {
  if (kind === 'meadow') return meadowWheat(f);
}

function meadowWheat(f: FeatureCtx) {
  const { ctx, W, H, pal } = f;
  for (let i = 0; i < Math.floor(W / 4); i++) {
    const x = i * 4 + (i % 3);
    const h = H * (0.05 + ((i * 37) % 11) / 220);
    const s = Math.sin(f.time * 1.6 + i * 0.4) * 4 * f.motion;
    const dark = i % 3 === 0;
    ctx.strokeStyle = rgba(shade(pal.ground, dark ? -0.5 : -0.28), 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, H + 4);
    ctx.quadraticCurveTo(x + s * 0.4, H - h * 0.6, x + s, H - h);
    ctx.stroke();
    // ear of grain
    ctx.fillStyle = rgba(shade(pal.ground, dark ? -0.4 : -0.14), 0.55);
    ctx.beginPath();
    ctx.ellipse(x + s, H - h, 1.6, 4.2, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bridge(f: FeatureCtx) {
  const { ctx, W, H, waterTop, groundY, pal } = f;
  const y = mix(waterTop, groundY, 0.1);
  const span = W * 0.86;
  const x0 = W * 0.07;
  const rise = H * 0.1;
  const waterLine = y + H * 0.13;
  /* Solid masonry from the deck down to the water, then the arches are cut
     back out with the water colour. Filling only a thin curved band (and a
     dark blob underneath) made this read as a dam. */
  const deckTop = (t: number) => {
    const a = y + H * 0.05;
    const c = y - rise;
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * a;
  };
  const stone = ctx.createLinearGradient(0, y - rise, 0, waterLine);
  stone.addColorStop(0, shade(pal.ridge[2], -0.04));
  stone.addColorStop(1, shade(pal.ridge[3], -0.22));

  // one big central span plus two smaller flanking ones
  const arches: Array<[number, number]> = [
    [0.5, 0.3],
    [0.14, 0.13],
    [0.86, 0.13],
  ];
  const archPath = (cx: number, halfW: number, crown: number) => {
    ctx.moveTo(cx - halfW, waterLine);
    ctx.lineTo(cx - halfW, crown + halfW * 0.55);
    ctx.quadraticCurveTo(cx, crown - halfW * 0.35, cx + halfW, crown + halfW * 0.55);
    ctx.lineTo(cx + halfW, waterLine);
  };

  /* The arches are genuine holes punched with evenodd, so the water already
     painted underneath shows through — refilling them with a guessed water
     colour made them read as slate windows. */
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(x0, waterLine);
  for (let i = 0; i <= 40; i++) ctx.lineTo(x0 + span * (i / 40), deckTop(i / 40));
  ctx.lineTo(x0 + span, waterLine);
  ctx.closePath();
  for (const [tc, tw] of arches) {
    archPath(x0 + span * tc, span * tw * 0.5, deckTop(tc) + H * 0.028);
    ctx.closePath();
  }
  ctx.fill('evenodd');

  for (const [tc, tw] of arches) {
    const cx = x0 + span * tc;
    const halfW = span * tw * 0.5;
    const crown = deckTop(tc) + H * 0.028;
    // shadow hanging under the vault
    ctx.save();
    ctx.beginPath();
    archPath(cx, halfW, crown);
    ctx.closePath();
    ctx.clip();
    const vg = ctx.createLinearGradient(0, crown - halfW * 0.35, 0, crown + halfW * 1.5);
    vg.addColorStop(0, rgba('#120f18', 0.52));
    vg.addColorStop(1, rgba('#120f18', 0.14));
    ctx.fillStyle = vg;
    ctx.fillRect(cx - halfW, crown - halfW, halfW * 2, waterLine - crown + halfW);
    ctx.restore();
    /* no voussoir stroke: at phone size the 1px rim read as a lit window
       frame, which made the hole look like a shuttered doorway */
  }

  // railings — evaluate the same quadratic the rail is stroked with, otherwise
  // the balusters float above the deck near the crest
  const deckY = deckTop;
  const railH = H * 0.042;
  ctx.strokeStyle = shade(pal.ridge[3], 0.02);
  ctx.lineWidth = Math.max(1.4, H * 0.005);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const py = deckY(t) - railH;
    const px = x0 + span * t;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, H * 0.0035);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const px = x0 + span * t;
    const base = deckY(t);
    ctx.beginPath();
    ctx.moveTo(px, base - railH);
    ctx.lineTo(px, base + H * 0.002);
    ctx.stroke();
  }
  // cherry trees
  const rng = makeRng(f.seed + 21);
  for (let i = 0; i < 5; i++) {
    const x = W * (0.08 + rng() * 0.88);
    const d = rng();
    const yy = mix(waterTop - H * 0.02, groundY - H * 0.01, d);
    /* opaque crowns, hazier the further away — overlapping translucent blobs
       used to show every seam */
    const crown = lerpColor(shade(pal.accent, 0.12), pal.ridge[0], (1 - d) * 0.45);
    tree(ctx, x, yy, H * mix(0.07, 0.15, d), crown, 'cherry', Math.sin(f.time * 0.6 + i) * 2.4 * f.motion);
  }
}

function dunes(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  // caravan silhouette on a far dune
  const rng = makeRng(f.seed + 5);
  const cy = mix(horizonY + H * 0.05, groundY - H * 0.12, 0.35);
  const cx = W * 0.62;
  ctx.fillStyle = rgba(shade(pal.ridge[3], -0.35), 0.8);
  for (let i = 0; i < 3; i++) {
    const x = cx + i * W * 0.055;
    const s = H * 0.028;
    ctx.beginPath();
    ctx.ellipse(x, cy - s * 0.6, s * 0.85, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - s * 0.5, cy - s * 0.6, s * 0.12, s * 0.7);
    ctx.fillRect(x + s * 0.4, cy - s * 0.6, s * 0.12, s * 0.7);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.8, cy - s * 0.9);
    ctx.lineTo(x + s * 1.15, cy - s * 1.25);
    ctx.lineTo(x + s * 1.2, cy - s * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  // tents
  for (let i = 0; i < 3; i++) {
    const x = W * (0.12 + rng() * 0.26);
    const y = mix(horizonY + H * 0.1, groundY - H * 0.06, rng());
    const s = H * (0.03 + rng() * 0.03);
    ctx.fillStyle = rgba(shade(pal.ridge[3], -0.2), 0.85);
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x, y - s * 1.3);
    ctx.lineTo(x + s, y);
    ctx.closePath();
    ctx.fill();
    const glow = 0.3 + f.nightness * 0.7;
    const rg = ctx.createRadialGradient(x, y - s * 0.2, 0, x, y - s * 0.2, s * 3);
    rg.addColorStop(0, rgba(pal.accent, 0.3 * glow));
    rg.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.2, s * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // wind streaks over the sand
  ctx.strokeStyle = rgba('#ffffff', 0.06);
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = mix(horizonY + H * 0.04, H, i / 26);
    const off = ((f.time * 18 * f.motion + i * 90) % (W + 300)) - 150;
    ctx.beginPath();
    ctx.moveTo(off, y);
    ctx.lineTo(off + 90 + i * 3, y + 1.5);
    ctx.stroke();
  }
}

function cloudtop(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  cloudSea(f, horizonY + H * 0.02, groundY, lerpColor('#ffffff', pal.ridge[0], 0.35 + f.nightness * 0.4), f.time * 8 * f.motion);
  // peaks poking through
  const rng = makeRng(f.seed + 9);
  for (let i = 0; i < 5; i++) {
    const x = W * (0.05 + rng() * 0.9);
    const d = rng();
    const baseY = mix(horizonY + H * 0.14, groundY - H * 0.04, d);
    const h = H * mix(0.06, 0.18, d);
    // opaque, with aerial perspective baked into the colour instead of alpha
    ctx.fillStyle = lerpColor(pal.ridge[Math.min(3, Math.floor(d * 4))], '#ffffff', (1 - d) * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - h * 0.5, baseY);
    ctx.lineTo(x - h * 0.1, baseY - h);
    ctx.lineTo(x + h * 0.18, baseY - h * 0.75);
    ctx.lineTo(x + h * 0.55, baseY);
    ctx.closePath();
    ctx.fill();
  }
  /* prayer flags: two poles with a slack line between them, pennants sampled
     along that same curve so they hang from the rope instead of floating */
  const poleL = W * 0.06;
  const poleR = W * 0.94;
  const topL = groundY - H * 0.2;
  const topR = groundY - H * 0.17;
  const sag = H * 0.075;
  const lineY = (t: number) => {
    const a = topL;
    const b = topR;
    const c = mix(topL, topR, 0.5) + sag * 2;
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  };
  const lineX = (t: number) => mix(poleL, poleR, t);
  // poles
  ctx.strokeStyle = rgba('#2a2119', 0.75);
  ctx.lineWidth = Math.max(2, W * 0.008);
  for (const [px, py] of [
    [poleL, topL],
    [poleR, topR],
  ]) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, groundY + H * 0.012);
    ctx.stroke();
  }
  // rope
  ctx.strokeStyle = rgba('#2a2119', 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    if (i === 0) ctx.moveTo(lineX(t), lineY(t));
    else ctx.lineTo(lineX(t), lineY(t));
  }
  ctx.stroke();
  const cols = ['#c8543f', '#e0b04a', '#5f8f6a', '#4a6f9e', '#e6e0d0'];
  const flags = 15;
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const x = lineX(t);
    const yy = lineY(t);
    // local slope so each pennant hangs perpendicular to the rope
    const dt = 0.01;
    const slope = Math.atan2(lineY(t + dt) - lineY(t - dt), lineX(t + dt) - lineX(t - dt));
    const s = H * 0.03;
    const flap = Math.sin(f.time * 2.4 + i * 0.9) * 0.16 * f.motion;
    ctx.save();
    ctx.translate(x, yy);
    ctx.rotate(slope + flap);
    ctx.fillStyle = rgba(cols[i % 5], 0.82);
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, 0);
    ctx.lineTo(s * 0.34, 0);
    ctx.lineTo(s * 0.34, s * 1.05);
    ctx.lineTo(-s * 0.34, s * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.14);
    ctx.fillRect(-s * 0.34, s * 0.4, s * 0.68, s * 0.12);
    ctx.restore();
  }
}

function auroraScene(f: FeatureCtx) {
  const { ctx, W, H, waterTop, groundY, pal } = f;
  // pines along the far shore
  const rng = makeRng(f.seed + 13);
  for (let i = 0; i < 16; i++) {
    const x = W * (0.01 + rng() * 0.98);
    const d = rng() * 0.5;
    const y = mix(waterTop - H * 0.005, waterTop + H * 0.02, d);
    tree(ctx, x, y, H * mix(0.05, 0.11, d), rgba(pal.ridge[3], 0.92), 'pine', 0);
  }
  // ice cracks: shallow, mostly horizontal, wider apart as they come forward,
  // so they read as pressure lines on a frozen lake instead of scribbles
  const cr = makeRng(f.seed + 77);
  for (let i = 0; i < 7; i++) {
    const t = 0.18 + (i / 7) * 0.78;
    const y0 = mix(waterTop, groundY, t * t);
    const x0 = -W * 0.1 + cr() * W * 0.5;
    const len = W * (0.35 + cr() * 0.6);
    ctx.strokeStyle = rgba('#ffffff', 0.08 + t * 0.12);
    ctx.lineWidth = 0.8 + t * 0.9;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0;
    let y = y0;
    const steps = 5;
    for (let k = 0; k < steps; k++) {
      x += len / steps;
      y += (cr() - 0.5) * H * 0.008;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    // one short branch
    if (cr() > 0.45) {
      ctx.beginPath();
      ctx.moveTo(mix(x0, x, 0.6), mix(y0, y, 0.6));
      ctx.lineTo(mix(x0, x, 0.6) + W * 0.06, mix(y0, y, 0.6) + H * 0.02);
      ctx.stroke();
    }
  }
}

function belltower(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  const bx = W * 0.72;
  const baseY = groundY - H * 0.01;
  const th = H * 0.46;
  const tw = W * 0.07;
  ctx.fillStyle = shade(pal.ridge[3], -0.1);
  ctx.beginPath();
  ctx.moveTo(bx - tw, baseY);
  ctx.lineTo(bx - tw * 0.82, baseY - th * 0.98);
  ctx.lineTo(bx - tw * 0.3, baseY - th);
  ctx.lineTo(bx + tw * 0.2, baseY - th * 0.86);
  ctx.lineTo(bx + tw * 0.86, baseY - th * 0.9);
  ctx.lineTo(bx + tw, baseY);
  ctx.closePath();
  ctx.fill();
  // arches
  ctx.fillStyle = rgba('#0e120e', 0.5);
  for (let i = 0; i < 3; i++) {
    const y = baseY - th * (0.28 + i * 0.22);
    const w = tw * 0.34;
    ctx.beginPath();
    ctx.moveTo(bx - w, y);
    ctx.lineTo(bx - w, y - th * 0.1);
    ctx.quadraticCurveTo(bx, y - th * 0.2, bx + w, y - th * 0.1);
    ctx.lineTo(bx + w, y);
    ctx.closePath();
    ctx.fill();
  }
  // the bell
  ctx.fillStyle = rgba(pal.accent2, 0.5);
  const by = baseY - th * 0.78;
  ctx.beginPath();
  ctx.moveTo(bx - tw * 0.26, by);
  ctx.quadraticCurveTo(bx - tw * 0.3, by - th * 0.14, bx, by - th * 0.16);
  ctx.quadraticCurveTo(bx + tw * 0.3, by - th * 0.14, bx + tw * 0.26, by);
  ctx.closePath();
  ctx.fill();
  // vines
  ctx.strokeStyle = rgba(pal.accent, 0.4);
  ctx.lineWidth = 1.6;
  const vr = makeRng(f.seed + 31);
  for (let i = 0; i < 10; i++) {
    let x = bx - tw + vr() * tw * 2;
    let y = baseY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const len = th * (0.2 + vr() * 0.7);
    for (let k = 0; k < 8; k++) {
      y -= len / 8;
      x += Math.sin(f.time * 0.4 + k + i) * 2.2 * f.motion + (vr() - 0.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // scattered music stands
  for (let i = 0; i < 6; i++) {
    const x = W * (0.06 + i * 0.09);
    const y = groundY + H * 0.02;
    ctx.strokeStyle = rgba('#1c2018', 0.6);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - H * 0.05);
    ctx.stroke();
    ctx.fillStyle = rgba('#e8e2cc', 0.35);
    ctx.save();
    ctx.translate(x, y - H * 0.055);
    ctx.rotate(-0.4 + i * 0.1);
    ctx.fillRect(-H * 0.018, -H * 0.012, H * 0.036, H * 0.024);
    ctx.restore();
  }
  void horizonY;
}

function rainlane(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  const win = rgba(pal.accent, 0.55 + f.nightness * 0.4);
  // right block
  building(ctx, W * 0.58, groundY + H * 0.02, W * 0.5, H * 0.5, shade(pal.ridge[2], -0.2), win, 0.5, f.seed + 2);
  building(ctx, W * 0.42, groundY + H * 0.02, W * 0.2, H * 0.36, shade(pal.ridge[1], -0.12), win, 0.42, f.seed + 4);
  // left block
  building(ctx, -W * 0.1, groundY + H * 0.02, W * 0.34, H * 0.44, shade(pal.ridge[3], -0.1), win, 0.55, f.seed + 6);
  building(ctx, W * 0.2, groundY + H * 0.02, W * 0.16, H * 0.3, shade(pal.ridge[2], -0.28), win, 0.35, f.seed + 8);
  // eaves over the player
  ctx.fillStyle = rgba('#1d1c22', 0.92);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.42, 0);
  ctx.lineTo(W * 0.3, H * 0.14);
  ctx.lineTo(0, H * 0.1);
  ctx.closePath();
  ctx.fill();
  // hanging lanterns
  for (let i = 0; i < 4; i++) {
    const x = W * (0.1 + i * 0.24);
    const y = H * (0.19 + (i % 2) * 0.05);
    lantern(ctx, x, y, H * 0.022, pal.accent, 0.8, Math.sin(f.time * 1.1 + i) * 0.09 * f.motion);
  }
  void horizonY;
}

function canopy(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  const rng = makeRng(f.seed + 41);
  // canopy overhead
  ctx.fillStyle = rgba(shade(pal.ridge[3], -0.35), 0.95);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.1);
  for (let x = W; x >= 0; x -= 12) {
    ctx.lineTo(x, H * (0.09 + f.fbm(x * 0.01 + 3) * 0.13));
  }
  ctx.closePath();
  ctx.fill();
  // trunks
  for (let i = 0; i < 7; i++) {
    const x = W * (0.04 + rng() * 0.94);
    const d = rng();
    const w = W * mix(0.012, 0.036, d);
    ctx.fillStyle = rgba(pal.ridge[Math.min(3, 1 + Math.floor(d * 3))], 0.92);
    ctx.beginPath();
    ctx.moveTo(x - w, groundY + H * 0.03);
    ctx.lineTo(x - w * 0.55, H * 0.12);
    ctx.lineTo(x + w * 0.55, H * 0.12);
    ctx.lineTo(x + w, groundY + H * 0.03);
    ctx.closePath();
    ctx.fill();
  }
  // hanging wish lanterns
  for (let i = 0; i < 12; i++) {
    const x = W * (0.03 + rng() * 0.94);
    const y = H * (0.16 + rng() * 0.32);
    lantern(ctx, x, y, H * (0.014 + rng() * 0.014), pal.accent, 0.85, Math.sin(f.time * 0.9 + i) * 0.08 * f.motion);
  }
  void horizonY;
}

function whalefall(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  cloudSea(f, horizonY + H * 0.04, groundY, lerpColor(pal.ridge[1], '#ffffff', 0.25), f.time * 5 * f.motion);
  // floating islands
  const rng = makeRng(f.seed + 61);
  for (let i = 0; i < 4; i++) {
    const x = W * (0.1 + rng() * 0.8);
    const d = rng();
    const y = mix(horizonY - H * 0.06, groundY - H * 0.1, d);
    const s = W * mix(0.04, 0.11, d);
    const bob = Math.sin(f.time * 0.4 + i * 2) * H * 0.006 * f.motion;
    ctx.fillStyle = rgba(pal.ridge[Math.min(3, Math.floor(d * 4))], 0.92);
    ctx.beginPath();
    ctx.ellipse(x, y + bob, s, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y + bob);
    ctx.lineTo(x, y + bob + s * 0.6);
    ctx.lineTo(x + s * 0.7, y + bob);
    ctx.closePath();
    ctx.fill();
    tree(ctx, x, y + bob - s * 0.1, s * 0.5, rgba(shade(pal.ridge[3], -0.2), 0.9), 'round', 0);
  }
  void groundY;
}

function kiln(f: FeatureCtx) {
  const { ctx, W, H, horizonY, groundY, pal } = f;
  const rng = makeRng(f.seed + 71);
  // kiln domes with glowing mouths
  for (let i = 0; i < 4; i++) {
    const x = W * (0.14 + i * 0.24 + (rng() - 0.5) * 0.05);
    const d = 0.3 + rng() * 0.6;
    const y = mix(horizonY + H * 0.08, groundY - H * 0.01, d);
    const s = H * mix(0.05, 0.11, d);
    ctx.fillStyle = rgba(shade(pal.ridge[3], -0.05), 0.95);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.25, s, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - s * 1.25, y, s * 2.5, s * 0.16);
    // chimney
    ctx.fillRect(x + s * 0.75, y - s * 1.6, s * 0.28, s * 0.9);
    // glowing mouth
    const flick = 0.75 + Math.sin(f.time * 6 + i * 3) * 0.2 * f.motion;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4);
    rg.addColorStop(0, rgba(pal.accent, 0.75 * flick));
    rg.addColorStop(0.3, rgba(pal.accent, 0.2 * flick));
    rg.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, s * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#fff0c0', 0.85 * flick);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.34, s * 0.24, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // smoke — soft gradient puffs; flat-alpha circles showed every seam
    for (let k = 0; k < 5; k++) {
      const rise = ((f.time * 12 * f.motion) % (s * 0.7)) + k * s * 0.7;
      const sy = y - s * 1.6 - rise;
      const sx = x + s * 0.9 + Math.sin(f.time * 0.6 + k + i) * s * 0.5;
      const rr = s * (0.34 + k * 0.2);
      const fade = 1 - k / 5;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
      sg.addColorStop(0, rgba('#f3e8d6', 0.2 * fade));
      sg.addColorStop(0.55, rgba('#f3e8d6', 0.09 * fade));
      sg.addColorStop(1, rgba('#f3e8d6', 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // stacked pots on the terrace
  for (let i = 0; i < 7; i++) {
    const x = W * (0.62 + i * 0.05);
    const y = groundY + H * 0.035;
    const s = H * 0.018;
    ctx.fillStyle = rgba(shade(pal.accent, -0.45), 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y - s, s * 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  void smoothstep;
  void clamp;
}
