import { Easing } from 'remotion';

export const FPS = 30;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (f: number, a: number, b: number) => clamp((f - a) / (b - a));

export type EaseFn = (t: number) => number;

export const E = {
  linear: (t: number) => t,
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.4),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  snap: Easing.bezier(0.2, 0.9, 0.1, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  backIn: Easing.bezier(0.6, -0.4, 0.74, 0.05),
  bigBack: Easing.bezier(0.3, 1.9, 0.6, 1),
  sine: Easing.bezier(0.37, 0, 0.63, 1),
  hold: () => 0,
};

/** Damped spring 0->1 with overshoot. t in "beats" (0..~1.2 settles). */
export const springy = (t: number, freq = 1.6, damp = 6) => {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * 2 * t);
};

/** Spring driven by frames since `start`, settling in roughly `dur` frames. */
export const springAt = (f: number, start: number, dur = 18, freq = 1.6, damp = 6) =>
  springy((f - start) / dur, freq, damp);

/** Damped wobble that starts at `start` frame: returns offset in [-1,1]*amp decaying. */
export const wobble = (f: number, start: number, freq = 0.35, decay = 0.12, amp = 1) => {
  const t = f - start;
  if (t < 0) return 0;
  return Math.sin(t * freq * Math.PI * 2 * 0.5) * Math.exp(-t * decay) * amp;
};

/** Keyframed number: keys = [[frame, value, easeIntoThisKey?], ...] */
export function kf(f: number, keys: [number, number, EaseFn?][]): number {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (f <= f1) {
      const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
      return lerp(v0, v1, (e ?? E.inOut)(t));
    }
  }
  return keys[keys.length - 1][1];
}

/** Keyframe a whole record of numbers. Each key: {f, p (partial values), e (ease into this key)} */
export type Key<TP> = { f: number; p: Partial<TP>; e?: EaseFn };
export function poseAt<TP extends Record<string, unknown>>(f: number, base: TP, keys: Key<TP>[]): TP {
  // resolve full poses for each key (carry forward)
  const full: TP[] = [];
  let cur = { ...base };
  for (const k of keys) {
    cur = { ...cur, ...k.p };
    full.push(cur);
  }
  if (f <= keys[0].f) return full[0];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) {
      const t = (f - keys[i - 1].f) / Math.max(1e-6, keys[i].f - keys[i - 1].f);
      const et = (keys[i].e ?? E.inOut)(t);
      const a = full[i - 1];
      const b = full[i];
      const out: Record<string, unknown> = { ...b };
      for (const key of Object.keys(b)) {
        const va = a[key];
        const vb = b[key];
        if (typeof va === 'number' && typeof vb === 'number') out[key] = lerp(va, vb, et);
        else out[key] = et < 0.5 ? va : vb;
      }
      return out as TP;
    }
  }
  return full[full.length - 1];
}

/** Camera shake offset. */
export const shake = (f: number, start: number, dur: number, amp: number, seed = 1) => {
  const t = f - start;
  if (t < 0 || t > dur) return { x: 0, y: 0, r: 0 };
  const k = (1 - t / dur) ** 2;
  return {
    x: Math.sin(t * 2.7 + seed) * amp * k + Math.sin(t * 5.3 + seed * 3) * amp * 0.4 * k,
    y: Math.cos(t * 3.1 + seed * 2) * amp * k,
    r: Math.sin(t * 2.1 + seed) * amp * 0.06 * k,
  };
};

export const pulse = (f: number, period: number, phase = 0) =>
  0.5 + 0.5 * Math.sin(((f + phase) / period) * Math.PI * 2);
