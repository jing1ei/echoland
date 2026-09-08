/* ============================================================
   Deterministic helpers

   Lives on its own because both the engine and the weather system need
   it, and the weather system must not import the engine (the engine
   imports it — that way round only).
   ============================================================ */

export function hash32(...parts: (number | string)[]): number {
  let h = 2166136261 >>> 0;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function rand01(seed: number): number {
  let x = seed || 1;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5;
  x >>>= 0;
  return (x % 100000) / 100000;
}
