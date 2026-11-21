// Two-bone arm IK for Flexander: put a hand (grip point) on a hero-space target.
import { DIM, rig, Pose } from '../hero/Hero';
import { M, ap, mul } from '../lib/m2';

export const inv = (m: M): M => {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};

const DEG = 180 / Math.PI;
const acosC = (v: number) => Math.acos(Math.max(-1, Math.min(1, v))) * DEG;

/**
 * Solve shoulder/elbow so the hand's grip point (wrist + `grip` along the hand) lands on `target`
 * (hero space: ground = 0, x right). bend = 1 bends the elbow outward/down, -1 the other way.
 * Leaves wrist rotation alone (assumes ~0 so the hand continues the forearm).
 */
export function reach(p: Pose, side: 'L' | 'R', target: [number, number], bend: 1 | -1 = 1, grip = 42): Partial<Pose> {
  const r = rig(p);
  const tm = mul(r.root, r.torso);
  const [lx, ly] = ap(inv(tm), target[0], target[1]);
  const L = side === 'L';
  const shrug = L ? p.shrugL : p.shrugR;
  const sx = (L ? -1 : 1) * DIM.shX;
  const sy = DIM.shY - shrug;
  const ua = DIM.UA * (L ? p.uaL : p.uaR);
  const fa = DIM.FA * (L ? p.faL : p.faR) + grip;
  let dx = lx - sx;
  const dy = ly - sy;
  if (!L) dx = -dx;
  let d = Math.hypot(dx, dy);
  d = Math.max(Math.abs(ua - fa) + 1, Math.min(ua + fa - 0.5, d));
  const t0 = Math.atan2(-dx, dy) * DEG;
  const alpha = acosC((ua * ua + d * d - fa * fa) / (2 * ua * d));
  const beta = acosC((ua * ua + fa * fa - d * d) / (2 * ua * fa));
  const sh = t0 + bend * alpha;
  const el = -bend * (180 - beta);
  return L ? { shL: sh, elL: el } : { shR: sh, elR: el };
}

/** Apply reach for both hands at once (each solved against the same body). */
export function reach2(p: Pose, tl: [number, number] | null, tr: [number, number] | null, bendL: 1 | -1 = 1, bendR: 1 | -1 = 1, grip = 42): Pose {
  let q = p;
  if (tl) q = { ...q, ...reach(p, 'L', tl, bendL, grip) };
  if (tr) q = { ...q, ...reach(p, 'R', tr, bendR, grip) };
  return q;
}

/** Hero-space point -> root-local (for drawing inside Hero's behind/between/front layers). */
export const toRoot = (p: Pose, pt: [number, number]) => ap(inv(rig(p).root), pt[0], pt[1]) as [number, number];
