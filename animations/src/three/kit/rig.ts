import * as THREE from 'three';
import { E, clamp, lerp, seg, smooth } from './math';

// Flexander's 3D rig, shared by every clip: skeleton sizes, two-bone IK, a
// body "spec" (where the pelvis, hands and feet go) solved into joint
// positions, and the face (expressions on a timeline). Units are roughly
// metres; y is up and he faces +z.

export const SK = {
  ankleH: 0.075,
  thigh: 0.31,
  shin: 0.31,
  hipX: 0.125,
  hipDrop: 0.05, // hip joints sit this far below the pelvis centre
  shoulderX: 0.33,
  shoulderY: 0.46,
  shoulderZ: -0.01,
  neck: new THREE.Vector3(0, 0.53, 0.0),
  head: new THREE.Vector3(0, 0.82, 0.025),
  upper: 0.35,
  lower: 0.42, // elbow to the middle of the hand
  hand: 0.085, // wrist to the middle of the hand
  grip: 0.48, // half the barbell grip width
  plateR: 0.27,
  barR: 0.016,
  /** standing pelvis height with straight-ish legs */
  standY: 0.73,
};

// ---------------------------------------------------------------- face
export type MouthShape = 'o' | 'focus' | 'grit' | 'grin' | 'smile' | 'kiss' | 'smirk' | 'wow';
export type Face = {
  lidU: [number, number]; // left, right: 0 open … 1 shut
  lidLow: number;
  lidTilt: number;
  browY: number;
  browAng: number;
  mouth: MouthShape;
  mouthScale: number;
  blush: number;
  gaze: [number, number]; // yaw, pitch
};

type Expr = { lid: number; lidLow: number; lidTilt: number; browY: number; browAng: number; mouth: MouthShape; mouthScale: number; blush: number };
export const EXPR: Record<string, Expr> = {
  breath: { lid: 0.25, lidLow: 0.08, lidTilt: 0.12, browY: 0, browAng: 0.18, mouth: 'o', mouthScale: 1, blush: 0 },
  focus: { lid: 0.43, lidLow: 0.12, lidTilt: 0.22, browY: -0.008, browAng: 0.3, mouth: 'focus', mouthScale: 1, blush: 0 },
  grit: { lid: 0.52, lidLow: 0.2, lidTilt: 0.3, browY: -0.016, browAng: 0.42, mouth: 'grit', mouthScale: 1, blush: 0.15 },
  strain: { lid: 0.74, lidLow: 0.3, lidTilt: 0.34, browY: -0.022, browAng: 0.5, mouth: 'grit', mouthScale: 1.16, blush: 0.45 },
  pop: { lid: 0.03, lidLow: 0, lidTilt: 0, browY: 0.02, browAng: -0.1, mouth: 'grit', mouthScale: 1.05, blush: 0.2 },
  grin: { lid: 0.08, lidLow: 0.38, lidTilt: -0.05, browY: 0.018, browAng: -0.18, mouth: 'grin', mouthScale: 1, blush: 0.75 },
  smile: { lid: 0.16, lidLow: 0.32, lidTilt: -0.04, browY: 0.012, browAng: -0.12, mouth: 'smile', mouthScale: 1, blush: 0.6 },
  happy: { lid: 0.1, lidLow: 0.2, lidTilt: -0.05, browY: 0.016, browAng: -0.15, mouth: 'smile', mouthScale: 1, blush: 0.35 },
  wow: { lid: 0.0, lidLow: 0, lidTilt: -0.05, browY: 0.03, browAng: -0.22, mouth: 'wow', mouthScale: 1, blush: 0.2 },
  panic: { lid: 0.0, lidLow: 0.05, lidTilt: -0.15, browY: 0.028, browAng: -0.3, mouth: 'o', mouthScale: 1.15, blush: 0.4 },
  cocky: { lid: 0.3, lidLow: 0.18, lidTilt: 0.05, browY: 0.006, browAng: 0.05, mouth: 'smirk', mouthScale: 1, blush: 0.3 },
  kiss: { lid: 0.78, lidLow: 0.3, lidTilt: -0.1, browY: 0.02, browAng: -0.15, mouth: 'kiss', mouthScale: 1, blush: 0.8 },
  wince: { lid: 0.85, lidLow: 0.4, lidTilt: 0.25, browY: -0.01, browAng: 0.35, mouth: 'grit', mouthScale: 0.95, blush: 0.5 },
};

export type FaceOpts = { blinks?: number[]; wink?: { t: number; side: 'L' | 'R' } | null; bob?: number };

/** Expressions on a timeline of [action time, expression]; short crossfades, mouths swap with a pop. */
export const faceTimeline = (timeline: [number, keyof typeof EXPR | string][], opts: FaceOpts = {}) => (t: number): Face => {
  let i = 0;
  while (i + 1 < timeline.length && timeline[i + 1][0] <= t) i++;
  const cur = EXPR[timeline[i][1]];
  const prev = EXPR[timeline[Math.max(0, i - 1)][1]];
  const k = i === 0 ? 1 : smooth(seg(t, timeline[i][0], timeline[i][0] + 2.5));
  const mix = (a: number, b: number) => lerp(a, b, k);
  const pop = i === 0 ? 1 : lerp(0.86, 1, smooth(seg(t, timeline[i][0], timeline[i][0] + 2)));
  let lid = mix(prev.lid, cur.lid);
  const blink = (c: number, w = 1.6) => Math.max(0, 1 - Math.abs(t - c) / w);
  for (const b of opts.blinks ?? []) lid = Math.max(lid, blink(b));
  const wink = opts.wink ? clamp(Math.max(0, 1 - Math.abs(t - opts.wink.t) / 3.2) * 1.6) : 0;
  const winkL = opts.wink?.side === 'L' ? wink : 0;
  const winkR = opts.wink?.side === 'R' ? wink : 0;
  const bob = opts.bob !== undefined && t > opts.bob ? 0.04 * Math.sin((t - opts.bob) * 0.5) : 0;
  return {
    lidU: [Math.max(lid, winkL), Math.max(lid, winkR)],
    lidLow: mix(prev.lidLow, cur.lidLow) + wink * 0.25,
    lidTilt: mix(prev.lidTilt, cur.lidTilt),
    browY: mix(prev.browY, cur.browY),
    browAng: mix(prev.browAng, cur.browAng),
    mouth: k > 0.35 ? cur.mouth : prev.mouth,
    mouthScale: mix(prev.mouthScale, cur.mouthScale) * pop * (1 + bob),
    blush: mix(prev.blush, cur.blush),
    gaze: [0, 0],
  };
};

// ---------------------------------------------------------------- IK and solving
/** Two-bone IK: the middle joint, bending toward `pole`. */
export const ik = (root: THREE.Vector3, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) => {
  const d = target.clone().sub(root);
  let dist = d.length();
  const dir = d.normalize();
  dist = clamp(dist, Math.abs(a - b) + 1e-3, a + b - 1e-4);
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (n.lengthSq() < 1e-8) n.set(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z));
  n.normalize();
  const mid = root.clone().add(dir.clone().multiplyScalar(a * cosA)).add(n.multiplyScalar(a * sinA));
  const end = root.clone().add(dir.clone().multiplyScalar(dist));
  return { mid, end };
};

export type HandShape = 'grip' | 'fist' | 'open' | 'point';
/** at: middle of the hand; axis: what the fist closes around, pointing away from the body (or across the palm); pole: where the elbow points. */
export type HandSpec = { at: THREE.Vector3; axis: THREE.Vector3; shape: HandShape; pole: THREE.Vector3; palm?: THREE.Vector3 };
/** at: the ankle; pitch lifts the heel (rotates about the ball of the foot); pole: where the knee points. */
export type FootSpec = { at: THREE.Vector3; yaw: number; pitch: number; pole?: THREE.Vector3 };

export type BodySpec = {
  pelvis: THREE.Vector3;
  torso: [number, number, number]; // pitch (lean forward), yaw (turn to his left), roll — YXZ
  shrug: number;
  hands: { L: HandSpec; R: HandSpec };
  feet: { L: FootSpec; R: FootSpec };
  head: [number, number, number]; // relative to the torso, YXZ
  face: Face;
  pump?: number; // muscle size, 1 = normal
};

export type Side = {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  grip: THREE.Vector3;
  axis: THREE.Vector3;
  shape: HandShape;
  palm?: THREE.Vector3; // open hands: which way the palm faces
  hip: THREE.Vector3;
  knee: THREE.Vector3;
  ankle: THREE.Vector3;
  footPitch: number;
  footYaw: number;
};

export type Pose = {
  pelvis: THREE.Vector3;
  torsoQ: THREE.Quaternion;
  shrug: number;
  L: Side; // his left, +x
  R: Side; // his right, -x
  headQ: THREE.Quaternion;
  face: Face;
  thighL: THREE.Vector3; // thigh directions in torso space, for the skirt
  thighR: THREE.Vector3;
  pump: number;
};

export const torsoQuat = (torso: [number, number, number]) => new THREE.Quaternion().setFromEuler(new THREE.Euler(torso[0], torso[1], torso[2], 'YXZ'));
export const toWorld = (pelvis: THREE.Vector3, q: THREE.Quaternion, local: THREE.Vector3) => local.clone().applyQuaternion(q).add(pelvis);
export const shoulderLocal = (side: 1 | -1, shrug: number) => new THREE.Vector3(side * SK.shoulderX, SK.shoulderY + shrug * 0.055, SK.shoulderZ);
export const hipLocal = (side: 1 | -1) => new THREE.Vector3(side * SK.hipX, -SK.hipDrop, 0);
export const kneePole = (side: 1 | -1) => new THREE.Vector3(side * 0.35, -0.1, 1).normalize();

export const solve = (b: BodySpec): Pose => {
  const torsoQ = torsoQuat(b.torso);
  const inv = torsoQ.clone().invert();
  const side = (s: 1 | -1): { side: Side; thigh: THREE.Vector3 } => {
    const hs = s > 0 ? b.hands.L : b.hands.R;
    const fs = s > 0 ? b.feet.L : b.feet.R;
    const shoulder = toWorld(b.pelvis, torsoQ, shoulderLocal(s, b.shrug));
    const arm = ik(shoulder, hs.at, SK.upper, SK.lower, hs.pole);
    const hip = toWorld(b.pelvis, torsoQ, hipLocal(s));
    const leg = ik(hip, fs.at, SK.thigh, SK.shin, fs.pole ?? kneePole(s));
    return {
      side: { shoulder, elbow: arm.mid, grip: arm.end, axis: hs.axis.clone().normalize(), shape: hs.shape, palm: hs.palm, hip, knee: leg.mid, ankle: leg.end, footPitch: fs.pitch, footYaw: fs.yaw },
      thigh: leg.mid.clone().sub(hip).normalize().applyQuaternion(inv),
    };
  };
  const L = side(1);
  const R = side(-1);
  return {
    pelvis: b.pelvis.clone(),
    torsoQ,
    shrug: b.shrug,
    L: L.side,
    R: R.side,
    headQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(b.head[0], b.head[1], b.head[2], 'YXZ')),
    face: b.face,
    thighL: L.thigh,
    thighR: R.thigh,
    pump: b.pump ?? 1,
  };
};

/** Where a point in the torso's own space is, in the world. */
export const torsoPoint = (b: Pick<BodySpec, 'pelvis' | 'torso'>, local: THREE.Vector3) => toWorld(b.pelvis, torsoQuat(b.torso), local);

/** A point in head space, in the world. */
export const headPoint = (p: Pose, local: THREE.Vector3) => {
  const inHead = SK.head.clone().sub(SK.neck).add(local).applyQuaternion(p.headQ).add(SK.neck);
  return inHead.applyQuaternion(p.torsoQ).add(p.pelvis);
};

/** Feet planted at ±x, flat, toes out a touch. */
export const plantedFeet = (x: number, z = 0, heel = 0): { L: FootSpec; R: FootSpec } => ({
  L: { at: new THREE.Vector3(x, SK.ankleH + heel, z), yaw: 0.12, pitch: Math.asin(clamp(heel / 0.11, 0, 0.9)) },
  R: { at: new THREE.Vector3(-x, SK.ankleH + heel, z), yaw: -0.12, pitch: Math.asin(clamp(heel / 0.11, 0, 0.9)) },
});

/** Head yaw/pitch so his eyes find the camera (weight 0..1). */
export const lookAt = (camAz: number, w: number) => ({ yaw: w * clamp(camAz * 0.75, -0.7, 0.7), gaze: [w * clamp(camAz * 0.3, -0.35, 0.35), w * -0.08] as [number, number] });

// ---------------------------------------------------------------- time
/**
 * A clip's clock: output frame -> action time. `slow` runs the action at
 * `rate` from `at` for `hold` frames, then ramps back to real time over
 * `ramp` frames. `freeze` stops the action at a frame for good.
 */
export const makeRemap = (opts: { slow?: { at: number; hold: number; rate: number; ramp: number }; freeze?: number } = {}) => (f: number) => {
  if (opts.freeze !== undefined && f >= opts.freeze) return opts.freeze;
  const s = opts.slow;
  if (!s || f <= s.at) return f;
  if (f <= s.at + s.hold) return s.at + (f - s.at) * s.rate;
  const a = s.at + s.hold * s.rate;
  if (f <= s.at + s.hold + s.ramp) {
    const u = (f - s.at - s.hold) / s.ramp;
    const intSmooth = u * u * u - 0.5 * u * u * u * u; // ∫ smoothstep from 0 to u
    return a + s.ramp * (s.rate * u + (1 - s.rate) * intSmooth);
  }
  return a + s.ramp * (s.rate + (1 - s.rate) * 0.5) + (f - s.at - s.hold - s.ramp);
};

/** Inverse of a remap, by search (for "which frame shows action time t"). */
export const frameOf = (remap: (f: number) => number, t: number, n = 135) => {
  let lo = 0;
  let hi = n;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (remap(m) < t) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

export { E };
