/* ============================================================
   Small math / colour helpers for the procedural renderer
   ============================================================ */

export function clamp(v: number, a = 0, b = 1) {
  return v < a ? a : v > b ? b : v;
}

export function smoothstep(t: number) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Accepts #rgb, #rrggbb, rgb(r,g,b) and rgba(r,g,b,a). The rgb() forms matter
 * because lerpColor/shade return them — nesting the helpers used to produce
 * NaN channels (i.e. black) before this understood its own output.
 */
function hex(c: string): [number, number, number] {
  let s = c.trim();
  if (s.startsWith('rgb')) {
    const nums = s
      .slice(s.indexOf('(') + 1, s.lastIndexOf(')'))
      .split(',')
      .map((x) => Number.parseFloat(x));
    return [
      clamp(Math.round(nums[0] || 0), 0, 255),
      clamp(Math.round(nums[1] || 0), 0, 255),
      clamp(Math.round(nums[2] || 0), 0, 255),
    ];
  }
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  const n = Number.parseInt(s.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const k = clamp(t);
  return `rgb(${Math.round(mix(A[0], B[0], k))},${Math.round(mix(A[1], B[1], k))},${Math.round(
    mix(A[2], B[2], k),
  )})`;
}

export function rgba(c: string, alpha: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${clamp(alpha)})`;
}

export function shade(c: string, amt: number): string {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/* deterministic RNG */
export function makeRng(seed: number) {
  let s = (seed || 1) >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function seedFrom(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* value noise on a 1-D lattice, deterministic per seed */
export function makeNoise1(seed: number) {
  const n = 512;
  const rng = makeRng(seed);
  const tbl = new Float32Array(n);
  for (let i = 0; i < n; i++) tbl[i] = rng();
  return (x: number) => {
    const xi = Math.floor(x);
    const f = x - xi;
    const a = tbl[((xi % n) + n) % n];
    const b = tbl[(((xi + 1) % n) + n) % n];
    const t = f * f * (3 - 2 * f);
    return mix(a, b, t);
  };
}

export function makeFbm(seed: number, octaves = 4) {
  const noises = Array.from({ length: octaves }, (_, i) => makeNoise1(seed + i * 7919));
  return (x: number) => {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noises[i](x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return sum / norm;
  };
}
