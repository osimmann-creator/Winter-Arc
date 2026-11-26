// Small, deterministic helpers for the 3D Beast Mode clip. Everything here is a
// pure function of the frame number, so any frame can render on its own.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);

export type Ease = (t: number) => number;
export const E = {
  linear: ((t) => t) as Ease,
  sine: ((t) => 0.5 - 0.5 * Math.cos(Math.PI * t)) as Ease,
  in: ((t) => t * t * t) as Ease,
  out: ((t) => 1 - Math.pow(1 - t, 3)) as Ease,
  inOut: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) as Ease,
  back: ((t) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
};

/** A key: [frame, value, ease-into-this-key]. Same shape as the 2D clip's keys. */
export type Key = [number, number, Ease?];

/** Piecewise interpolation, holding the first/last value outside the range. */
export const keys = (k: Key[], t: number): number => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    const [f1, v1, ease] = k[i];
    const [f0, v0] = k[i - 1];
    if (t <= f1) return lerp(v0, v1, (ease ?? E.sine)(seg(t, f0, f1)));
  }
  return k[k.length - 1][1];
};

/**
 * Smooth spline through keys (Catmull-Rom style tangents that respect uneven
 * spacing, clamped so a key never overshoots between equal neighbours).
 * Used for the camera, where continuous velocity matters more than easing.
 */
export const spline = (k: [number, number][], t: number): number => {
  const n = k.length;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 1;
  while (t > k[i][0]) i++;
  const [t0, p0] = k[i - 1];
  const [t1, p1] = k[i];
  const slope = (a: number) => {
    if (a <= 0 || a >= n - 1) return 0;
    const d0 = (k[a][1] - k[a - 1][1]) / (k[a][0] - k[a - 1][0]);
    const d1 = (k[a + 1][1] - k[a][1]) / (k[a + 1][0] - k[a][0]);
    if (d0 * d1 <= 0) return 0;
    return (2 * d0 * d1) / (d0 + d1); // harmonic mean: monotone, no overshoot
  };
  const h = t1 - t0;
  const m0 = slope(i - 1) * h;
  const m1 = slope(i) * h;
  const s = (t - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1;
};

/** Mulberry32: a tiny seeded random generator. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const h = (n: number) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const i = Math.floor(x);
  const f = x - i;
  return lerp(h(i), h(i + 1), smooth(f));
};

/**
 * The slow-motion time remap. Output frame -> "action" frame.
 * Real time up to the lockout (76), a third of real speed through the
 * bar whip and chalk cloud, then a smooth ramp back to real time.
 */
export const SLOW_START = 76;
export const SLOW_END = 90;
export const RAMP_END = 98;
export const SLOW_RATE = 0.3;
export const actionTime = (f: number) => {
  if (f <= SLOW_START) return f;
  if (f <= SLOW_END) return SLOW_START + (f - SLOW_START) * SLOW_RATE;
  const a = SLOW_START + (SLOW_END - SLOW_START) * SLOW_RATE;
  const len = RAMP_END - SLOW_END;
  if (f <= RAMP_END) {
    // integral of rate(u) = SLOW_RATE + (1 - SLOW_RATE) * smoothstep(u/len)
    const u = (f - SLOW_END) / len;
    const intSmooth = u * u * u - 0.5 * u * u * u * u; // ∫ smoothstep from 0 to u
    return a + len * (SLOW_RATE * u + (1 - SLOW_RATE) * intSmooth);
  }
  const b = a + len * (SLOW_RATE + (1 - SLOW_RATE) * 0.5);
  return b + (f - RAMP_END);
};
