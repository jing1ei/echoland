import type { Expression, PortraitSpec } from '../game/story/types';

/* ============================================================
   Procedural character portraits

   The game ships no art. Scenery is drawn from palettes and noise, so
   the cast is drawn the same way: a flat-vector bust, lit from one
   side, with deliberately spare facial features. Spare is a choice —
   a handful of thin strokes reads as a woodblock print, while a fully
   rendered face drawn by arithmetic reads as a mistake.

   Everything is laid out on a fixed 300×420 logical box and scaled by
   the caller, so a portrait looks identical at 96px in the cast list
   and at 520px in a dialogue scene.
   ============================================================ */

export const P_W = 300;
export const P_H = 420;

const HEAD = { cx: 150, cy: 148, rx: 53, ry: 63 };

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function blob(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  close = true,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const [nx, ny] = pts[(i + 1) % pts.length];
    ctx.bezierCurveTo(px + (x - px) * 0.55, py + (y - py) * 0.35, x - (nx - x) * 0.18, y - (ny - y) * 0.18, x, y);
  }
  if (close) ctx.closePath();
}

/* ------------------------------------------------------------
   Garments — the shoulder silhouette does most of the work in
   telling two characters apart at a glance
   ------------------------------------------------------------ */

function garment(ctx: CanvasRenderingContext2D, s: PortraitSpec) {
  /* Shoulders were wide enough to reach the canvas edge, which read as a
     bell rather than a person. Keeping the widest build inside ~200px of
     the 300px box leaves air on both sides and lets the head lead. */
  const half = 62 + s.build * 34;
  const top = 236;
  const g = ctx.createLinearGradient(150 - half, top, 150 + half, P_H);
  g.addColorStop(0, s.robe2);
  g.addColorStop(0.55, s.robe);
  g.addColorStop(1, shade(s.robe, -22));
  ctx.fillStyle = g;

  ctx.beginPath();
  switch (s.garb) {
    case 'cloak':
      ctx.moveTo(150 - half - 14, P_H);
      ctx.quadraticCurveTo(150 - half + 6, top - 10, 150 - 26, top + 6);
      ctx.lineTo(150 + 26, top + 6);
      ctx.quadraticCurveTo(150 + half - 6, top - 10, 150 + half + 14, P_H);
      break;
    case 'robe':
      ctx.moveTo(150 - half, P_H);
      ctx.quadraticCurveTo(150 - half + 12, top + 14, 150 - 20, top + 2);
      ctx.lineTo(150 + 20, top + 2);
      ctx.quadraticCurveTo(150 + half - 12, top + 14, 150 + half, P_H);
      break;
    case 'apron':
    case 'wrap':
      ctx.moveTo(150 - half, P_H);
      ctx.quadraticCurveTo(150 - half + 4, top + 20, 150 - 24, top + 4);
      ctx.lineTo(150 + 24, top + 4);
      ctx.quadraticCurveTo(150 + half - 4, top + 20, 150 + half, P_H);
      break;
    default: // coat / vest
      ctx.moveTo(150 - half, P_H);
      ctx.quadraticCurveTo(150 - half + 2, top + 26, 150 - 30, top);
      ctx.lineTo(150 + 30, top);
      ctx.quadraticCurveTo(150 + half - 2, top + 26, 150 + half, P_H);
  }
  ctx.closePath();
  ctx.fill();

  /* collar / lapel detail */
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  if (s.garb === 'coat' || s.garb === 'vest') {
    ctx.beginPath();
    ctx.moveTo(150 - 26, top + 4);
    ctx.lineTo(150 - 6, P_H - 60);
    ctx.moveTo(150 + 26, top + 4);
    ctx.lineTo(150 + 6, P_H - 60);
    ctx.stroke();
  } else if (s.garb === 'robe' || s.garb === 'cloak') {
    ctx.beginPath();
    ctx.moveTo(150 - 22, top + 6);
    ctx.quadraticCurveTo(150, top + 44, 150 + 22, top + 6);
    ctx.stroke();
  } else {
    /* apron string */
    ctx.strokeStyle = s.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150 - half + 16, top + 62);
    ctx.quadraticCurveTo(150, top + 50, 150 + half - 16, top + 62);
    ctx.stroke();
  }

  /* a strip of accent at the shoulder catches the rim light */
  ctx.fillStyle = s.accent;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(150 - half * 0.62, top + 34, 16, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------
   Hair
   ------------------------------------------------------------ */

function hairBack(ctx: CanvasRenderingContext2D, s: PortraitSpec) {
  const { cx, cy, rx, ry } = HEAD;
  ctx.fillStyle = shade(s.hair, -16);
  switch (s.cut) {
    case 'long':
      ctx.beginPath();
      ctx.moveTo(cx - rx - 10, cy - 10);
      ctx.quadraticCurveTo(cx - rx - 26, cy + 130, cx - rx + 4, P_H - 90);
      ctx.lineTo(cx + rx - 4, P_H - 90);
      ctx.quadraticCurveTo(cx + rx + 26, cy + 130, cx + rx + 10, cy - 10);
      ctx.closePath();
      ctx.fill();
      break;
    case 'braid':
      ctx.beginPath();
      ctx.ellipse(cx, cy - 6, rx + 10, ry + 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + rx - 6, cy + 30);
      ctx.quadraticCurveTo(cx + rx + 24, cy + 110, cx + rx + 2, P_H - 120);
      ctx.quadraticCurveTo(cx + rx - 18, cy + 100, cx + rx - 20, cy + 34);
      ctx.closePath();
      ctx.fill();
      break;
    case 'tail':
      ctx.beginPath();
      ctx.ellipse(cx, cy - 6, rx + 8, ry + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - ry - 2);
      ctx.quadraticCurveTo(cx + rx + 40, cy - 30, cx + rx + 22, cy + 96);
      ctx.quadraticCurveTo(cx + rx - 4, cy + 30, cx + 4, cy - ry + 8);
      ctx.closePath();
      ctx.fill();
      break;
    case 'bun':
      ctx.beginPath();
      ctx.ellipse(cx, cy - 6, rx + 7, ry + 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy - ry - 20, 27, 22, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hood':
      ctx.fillStyle = shade(s.robe, -30);
      ctx.beginPath();
      ctx.moveTo(cx - rx - 26, cy + 76);
      ctx.quadraticCurveTo(cx - rx - 22, cy - ry - 44, cx, cy - ry - 40);
      ctx.quadraticCurveTo(cx + rx + 22, cy - ry - 44, cx + rx + 26, cy + 76);
      ctx.quadraticCurveTo(cx, cy + 40, cx - rx - 26, cy + 76);
      ctx.closePath();
      ctx.fill();
      break;
    case 'wild':
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        const r = ry + 16 + (i % 2 ? 14 : 0);
        ctx.lineTo(cx + Math.cos(a) * (rx + 12), cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    default: // bob / crop
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, rx + 9, ry + 6, 0, 0, Math.PI * 2);
      ctx.fill();
  }
}

function hairFront(ctx: CanvasRenderingContext2D, s: PortraitSpec) {
  const { cx, cy, rx, ry } = HEAD;
  if (s.cut === 'hood') {
    /* a hood shows only a wedge of hair */
    ctx.fillStyle = s.hair;
    ctx.beginPath();
    ctx.moveTo(cx - rx + 6, cy - ry + 20);
    ctx.quadraticCurveTo(cx, cy - ry + 2, cx + rx - 6, cy - ry + 20);
    ctx.quadraticCurveTo(cx, cy - ry + 34, cx - rx + 6, cy - ry + 20);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy);
  g.addColorStop(0, s.hair2);
  g.addColorStop(0.6, s.hair);
  g.addColorStop(1, shade(s.hair, -18));
  ctx.fillStyle = g;

  /* skull cap */
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, rx + 5, ry - 8, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  /* fringe — asymmetric, because a symmetric one looks stamped on */
  ctx.beginPath();
  ctx.moveTo(cx - rx - 4, cy - 14);
  ctx.quadraticCurveTo(cx - rx + 6, cy + 18, cx - 20, cy - 6);
  ctx.quadraticCurveTo(cx - 4, cy + 12, cx + 12, cy - 12);
  ctx.quadraticCurveTo(cx + 26, cy + 6, cx + rx + 2, cy - 20);
  ctx.quadraticCurveTo(cx + rx + 6, cy - ry, cx, cy - ry - 6);
  ctx.quadraticCurveTo(cx - rx - 2, cy - ry, cx - rx - 4, cy - 14);
  ctx.closePath();
  ctx.fill();

  /* sidelocks */
  if (s.cut === 'long' || s.cut === 'braid' || s.cut === 'bob') {
    ctx.beginPath();
    ctx.moveTo(cx - rx - 2, cy - 20);
    ctx.quadraticCurveTo(cx - rx - 10, cy + 44, cx - rx + 8, cy + 62);
    ctx.quadraticCurveTo(cx - rx + 2, cy + 20, cx - rx + 4, cy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + rx + 2, cy - 20);
    ctx.quadraticCurveTo(cx + rx + 10, cy + 40, cx + rx - 10, cy + 56);
    ctx.quadraticCurveTo(cx + rx - 2, cy + 18, cx + rx - 4, cy - 18);
    ctx.closePath();
    ctx.fill();
  }

  /* a single highlight sweep — the one bit of gloss */
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - ry + 12);
  ctx.quadraticCurveTo(cx - 4, cy - ry + 2, cx + 24, cy - ry + 16);
  ctx.stroke();
}

/* ------------------------------------------------------------
   Face
   ------------------------------------------------------------ */

interface FaceMood {
  /** 0 = closed, 1 = wide */
  open: number;
  browIn: number;
  browUp: number;
  mouth: number; // -1 frown .. 1 smile
  mouthOpen: number;
  blush: number;
  look: number; // -1 left .. 1 right
}

const MOODS: Record<Expression, FaceMood> = {
  calm: { open: 0.72, browIn: 0, browUp: 0, mouth: 0.06, mouthOpen: 0, blush: 0, look: 0 },
  smile: { open: 0.6, browIn: 0, browUp: 0.1, mouth: 0.7, mouthOpen: 0, blush: 0.2, look: 0 },
  laugh: { open: 0.06, browIn: 0, browUp: 0.3, mouth: 1, mouthOpen: 0.8, blush: 0.35, look: 0 },
  sad: { open: 0.62, browIn: -0.5, browUp: 0.36, mouth: -0.6, mouthOpen: 0, blush: 0.1, look: -0.2 },
  cross: { open: 0.55, browIn: 0.8, browUp: -0.3, mouth: -0.35, mouthOpen: 0, blush: 0.14, look: 0.1 },
  shock: { open: 1, browIn: -0.2, browUp: 0.85, mouth: 0, mouthOpen: 0.7, blush: 0.1, look: 0 },
  shy: { open: 0.36, browIn: -0.15, browUp: 0.2, mouth: 0.3, mouthOpen: 0, blush: 0.85, look: -0.5 },
  think: { open: 0.62, browIn: 0.28, browUp: 0.16, mouth: -0.05, mouthOpen: 0, blush: 0, look: 0.55 },
  away: { open: 0.04, browIn: -0.1, browUp: 0.06, mouth: -0.1, mouthOpen: 0, blush: 0.05, look: 0 },
};

function face(ctx: CanvasRenderingContext2D, s: PortraitSpec, as: Expression) {
  const { cx, cy, rx } = HEAD;
  const m = MOODS[as] ?? MOODS.calm;
  const ink = s.years === 'old' ? 'rgba(58,46,40,0.86)' : 'rgba(40,32,34,0.9)';
  const eyeY = cy + 6;
  const dx = 21;
  const gaze = m.look * 2.4;

  /* blush first, under the linework */
  if (m.blush > 0.05) {
    ctx.fillStyle = `rgba(206,110,102,${0.1 + m.blush * 0.2})`;
    [-1, 1].forEach((k) => {
      ctx.beginPath();
      ctx.ellipse(cx + k * (dx + 12), eyeY + 15, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';

  /* eyes */
  [-1, 1].forEach((k) => {
    const ex = cx + k * dx;
    if (m.open < 0.18) {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ex - 8, eyeY);
      ctx.quadraticCurveTo(ex, eyeY + (as === 'laugh' ? -5 : 3), ex + 8, eyeY);
      ctx.stroke();
      return;
    }
    const h = 4 + m.open * 6;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 6.4, h, 0, 0, Math.PI * 2);
    ctx.fill();
    /* upper lid trims the eye so it never looks like a bug's */
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.rect(ex - 9, eyeY - h - 6, 18, (1 - m.open) * 6);
    ctx.fill();
    ctx.restore();
    /* catchlight */
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(ex + gaze + 1.6, eyeY - h * 0.34, 1.9, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
  });

  /* brows */
  ctx.lineWidth = 2.6;
  [-1, 1].forEach((k) => {
    const ex = cx + k * dx;
    const base = eyeY - 17 - m.browUp * 5;
    ctx.beginPath();
    ctx.moveTo(ex - 9, base + k * m.browIn * 3.5);
    ctx.quadraticCurveTo(ex, base - 3.5, ex + 9, base - k * m.browIn * 3.5);
    ctx.stroke();
  });

  /* nose — one short stroke, offset with the gaze */
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(40,32,34,0.4)';
  ctx.beginPath();
  ctx.moveTo(cx + gaze, eyeY + 13);
  ctx.lineTo(cx + gaze - 2, eyeY + 19);
  ctx.stroke();

  /* mouth */
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.3;
  const my = eyeY + 33;
  if (m.mouthOpen > 0.2) {
    ctx.fillStyle = 'rgba(96,58,56,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx + gaze, my, 6 + m.mouthOpen * 3, 4 + m.mouthOpen * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx + gaze - 8, my);
    ctx.quadraticCurveTo(cx + gaze, my + m.mouth * 6, cx + gaze + 8, my);
    ctx.stroke();
  }

  /* age lines, sparingly */
  if (s.years === 'old') {
    ctx.strokeStyle = 'rgba(60,48,42,0.32)';
    ctx.lineWidth = 1.6;
    [-1, 1].forEach((k) => {
      ctx.beginPath();
      ctx.moveTo(cx + k * (rx - 12), eyeY - 2);
      ctx.lineTo(cx + k * (rx - 6), eyeY + 4);
      ctx.stroke();
    });
  }
}

/* ------------------------------------------------------------
   Props
   ------------------------------------------------------------ */

function prop(ctx: CanvasRenderingContext2D, s: PortraitSpec) {
  const { cx, cy, rx, ry } = HEAD;
  ctx.lineCap = 'round';
  switch (s.prop) {
    case 'earring':
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.ellipse(cx + rx - 2, cy + 26, 3.6, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'glasses':
      ctx.strokeStyle = 'rgba(48,40,36,0.72)';
      ctx.lineWidth = 2.2;
      [-1, 1].forEach((k) => {
        ctx.beginPath();
        ctx.ellipse(cx + k * 21, cy + 6, 15, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 4);
      ctx.lineTo(cx + 6, cy + 4);
      ctx.moveTo(cx - 36, cy + 2);
      ctx.lineTo(cx - rx - 2, cy - 2);
      ctx.moveTo(cx + 36, cy + 2);
      ctx.lineTo(cx + rx + 2, cy - 2);
      ctx.stroke();
      break;
    case 'scarf':
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry + 22, 44, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 22, cy + ry + 26);
      ctx.quadraticCurveTo(cx + 44, cy + ry + 70, cx + 26, cy + ry + 96);
      ctx.quadraticCurveTo(cx + 20, cy + ry + 56, cx + 12, cy + ry + 30);
      ctx.closePath();
      ctx.fill();
      break;
    case 'pipe':
      ctx.strokeStyle = 'rgba(48,38,32,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy + 40);
      ctx.lineTo(cx + 44, cy + 50);
      ctx.stroke();
      ctx.fillStyle = 'rgba(38,30,26,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx + 50, cy + 48, 7, 9, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 50, cy + 36);
      ctx.quadraticCurveTo(cx + 62, cy + 14, cx + 48, cy - 6);
      ctx.stroke();
      break;
    case 'beads':
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry + 46, 34, 20, 0, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = s.accent;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.08 + (i / 6) * 0.84);
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * -34, cy + ry + 46 + Math.sin(a) * 20, 3.4, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'ribbon':
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.moveTo(cx - rx + 6, cy - ry + 10);
      ctx.quadraticCurveTo(cx - rx - 16, cy - ry - 4, cx - rx - 4, cy - ry + 24);
      ctx.quadraticCurveTo(cx - rx + 2, cy - ry + 16, cx - rx + 6, cy - ry + 10);
      ctx.closePath();
      ctx.fill();
      break;
    case 'bandage':
      ctx.strokeStyle = 'rgba(246,240,228,0.9)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy + 44);
      ctx.lineTo(cx + 26, cy + 40);
      ctx.stroke();
      break;
  }
}

/* ------------------------------------------------------------
   Entry point
   ------------------------------------------------------------ */

export interface PortraitOpts {
  /** rim-light colour, usually the scene accent so the cast matches the sky */
  rim?: string;
  /** 0..1 — how much of the figure is in shadow (a non-speaker is dimmed) */
  dim?: number;
  /** draw a soft halo behind the bust to lift it off busy scenery */
  halo?: boolean;
}

export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  s: PortraitSpec,
  as: Expression = 'calm',
  opts: PortraitOpts = {},
) {
  const { cx, cy, rx, ry } = HEAD;
  const rim = opts.rim ?? s.accent;
  ctx.clearRect(0, 0, P_W, P_H);
  ctx.save();

  if (opts.halo) {
    /* a soft pool of shade behind the bust — busy scenery otherwise eats
       the silhouette. It must fade to fully transparent well inside the
       canvas, or the box itself becomes visible. */
    const h = ctx.createRadialGradient(cx, cy + 50, 10, cx, cy + 50, 190);
    h.addColorStop(0, 'rgba(6,5,10,0.4)');
    h.addColorStop(0.55, 'rgba(6,5,10,0.2)');
    h.addColorStop(1, 'rgba(6,5,10,0)');
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, P_W, P_H);
  }

  hairBack(ctx, s);

  /* neck */
  ctx.fillStyle = shade(s.skin, -26);
  ctx.beginPath();
  ctx.roundRect(cx - 16, cy + ry - 22, 32, 58, 12);
  ctx.fill();

  garment(ctx, s);

  /* head */
  const fg = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  fg.addColorStop(0, shade(s.skin, 12));
  fg.addColorStop(0.62, s.skin);
  fg.addColorStop(1, shade(s.skin, -20));
  ctx.fillStyle = fg;
  blob(ctx, [
    [cx, cy - ry],
    [cx + rx, cy - ry * 0.34],
    [cx + rx * 0.82, cy + ry * 0.62],
    [cx, cy + ry],
    [cx - rx * 0.82, cy + ry * 0.62],
    [cx - rx, cy - ry * 0.34],
  ]);
  ctx.fill();

  /* ears */
  ctx.fillStyle = shade(s.skin, -12);
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.ellipse(cx + k * (rx - 2), cy + 12, 6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  face(ctx, s, as);
  hairFront(ctx, s);
  prop(ctx, s);

  /* Rim light down one edge ties the figure to the sky behind it.
     This MUST be `source-atop`: a plain fill in `screen` mode paints the
     empty half of the canvas too, and the portrait's bounding box shows
     up on screen as a bright rectangle. Only lit pixels may be lit. */
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const r = ctx.createLinearGradient(cx - rx - 30, 0, cx - rx * 0.2, 0);
  r.addColorStop(0, rim);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, P_W, P_H);
  ctx.restore();

  /* bottom fade so the bust dissolves into the dialogue box */
  const f = ctx.createLinearGradient(0, P_H - 150, 0, P_H);
  f.addColorStop(0, 'rgba(0,0,0,0)');
  f.addColorStop(1, 'rgba(10,9,14,0.92)');
  ctx.fillStyle = f;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillRect(0, P_H - 150, P_W, 150);
  ctx.globalCompositeOperation = 'source-over';

  if (opts.dim) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(10,9,16,${Math.min(0.72, opts.dim)})`;
    ctx.fillRect(0, 0, P_W, P_H);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}
