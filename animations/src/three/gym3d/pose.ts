import * as THREE from 'three';
import { E, Key, actionTime, clamp, keys, lerp, noise1, seg, smooth } from './math';

// The clean and jerk, rebuilt from gym-1's 2D keys (BeastMode.tsx): same
// beats (pull from 22, catch ~52, dip 68, lockout 76), mapped into a 3D rig.
// Units are roughly metres; y is up and Flexander faces +z.

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
  lower: 0.42, // elbow to the middle of the fist
  hand: 0.085, // wrist to the middle of the fist
  grip: 0.48, // half the grip width
  plateR: 0.27,
  barR: 0.016,
};

/** Bar height keys: the 2D clip's px heights mapped onto the 3D rig. */
const bar2D: Key[] = [[0, -140], [11, -140], [22, -148], [38, -312, E.sine], [45, -465, E.in], [49, -565, E.out], [53, -535], [61, -610, E.sine], [68, -550], [73, -802, E.in], [76, -1015, E.out], [80, -1000], [89, -1064, E.sine], [101, -1069], [134, -1067]];
const barYKey = (t: number) => SK.plateR + (-keys(bar2D, t) - 140) * 0.00184;

/** Hip-to-ankle extension keys, from the 2D `depth` keys. */
const depth2D: Key[] = [[0, 146], [14, 144], [21, 145], [41, 273, E.sine], [46, 285, E.in], [52, 207, E.out], [61, 280, E.sine], [68, 214], [73, 281, E.in], [76, 225, E.out], [82, 248, E.sine], [89, 280, E.out]];
const depthKey = (t: number) => 0.475 + (keys(depth2D, t) - 146) * 0.000971;

const barZKeys: Key[] = [[0, 0.215], [22, 0.215], [30, 0.235], [38, 0.25], [45, 0.27], [49, 0.275], [52, 0.26], [68, 0.26], [71, 0.33], [73, 0.38], [74.5, 0.35, E.linear], [75.5, 0.17, E.linear], [76, -0.02, E.out]];
const heelKeys: Key[] = [[0, 0], [38, 0], [44, 0.035, E.out], [47, 0.035], [49, 0, E.in], [70, 0], [72.5, 0.03, E.out], [74, 0.03], [75.5, 0, E.in]];
const hopKeys: Key[] = [[0, 0], [46.5, 0], [48, 0.03, E.out], [50, 0, E.in], [74, 0], [75, 0.025, E.out], [76, 0, E.in]];
const stanceKeys: Key[] = [[0, 0.165], [47.5, 0.165], [50, 0.205, E.inOut], [74.5, 0.205], [76, 0.222, E.inOut]];
const pelvisZKeys: Key[] = [[0, -0.1], [22, -0.1], [38, -0.06], [45, 0.02, E.out], [50, -0.03], [56, 0], [68, 0], [76, -0.02], [89, 0]];
const leanKeys: Key[] = [[44, -0.12], [47, -0.05], [50, 0.12, E.out], [54, 0.03], [61, 0], [68, 0.02], [71, -0.05], [74, -0.03], [76, 0.07, E.out], [84, 0.05], [95, 0.03]];
const shrugKeys: Key[] = [[0, 0], [42, 0], [46, 1, E.out], [49, 0.2], [52, 0.3], [58, 0.1], [70, 0.1], [74, 0.8], [76, 1, E.out], [86, 0.6], [100, 0.45]];
const headPitchKeys: Key[] = [[0, 0.02], [18, -0.06], [22, -0.1], [38, -0.08], [46, -0.2], [49, -0.05], [52, 0.1, E.out], [56, 0], [61, -0.06], [66, 0.04], [68, 0.08], [71, -0.24], [74, -0.26], [76, 0.14, E.out], [80, 0.12], [86, -0.04], [95, -0.08]];

/** Where the bar rests in the torso's own space: front rack and lockout. */
const RACK = new THREE.Vector3(0, 0.4, 0.255);
const overheadLocal = (shrug: number) => {
  const reach = Math.sqrt((SK.upper + SK.lower) ** 2 - (SK.grip - SK.shoulderX) ** 2) * 0.996;
  return new THREE.Vector3(0, SK.shoulderY + shrug * 0.055 + reach, -0.05);
};

export type Face = {
  lidU: [number, number]; // 0 open … 1 shut
  lidLow: number;
  lidTilt: number;
  browY: number;
  browAng: number;
  mouth: 'o' | 'focus' | 'grit' | 'grin' | 'smile';
  mouthScale: number;
  blush: number;
  gaze: [number, number]; // yaw, pitch
};

const EXPR: Record<string, Omit<Face, 'mouth' | 'lidU'> & { lid: number; mouth: Face['mouth'] }> = {
  breath: { lid: 0.25, lidLow: 0.08, lidTilt: 0.12, browY: 0, browAng: 0.18, mouth: 'o', mouthScale: 1, blush: 0, gaze: [0, 0] },
  focus: { lid: 0.43, lidLow: 0.12, lidTilt: 0.22, browY: -0.008, browAng: 0.3, mouth: 'focus', mouthScale: 1, blush: 0, gaze: [0, 0] },
  grit: { lid: 0.52, lidLow: 0.2, lidTilt: 0.3, browY: -0.016, browAng: 0.42, mouth: 'grit', mouthScale: 1, blush: 0.15, gaze: [0, 0] },
  strain: { lid: 0.74, lidLow: 0.3, lidTilt: 0.34, browY: -0.022, browAng: 0.5, mouth: 'grit', mouthScale: 1.16, blush: 0.45, gaze: [0, 0] },
  pop: { lid: 0.03, lidLow: 0, lidTilt: 0, browY: 0.02, browAng: -0.1, mouth: 'grit', mouthScale: 1.05, blush: 0.2, gaze: [0, 0] },
  grin: { lid: 0.08, lidLow: 0.38, lidTilt: -0.05, browY: 0.018, browAng: -0.18, mouth: 'grin', mouthScale: 1, blush: 0.75, gaze: [0, 0] },
  smile: { lid: 0.16, lidLow: 0.32, lidTilt: -0.04, browY: 0.012, browAng: -0.12, mouth: 'smile', mouthScale: 1, blush: 0.6, gaze: [0, 0] },
};
// [action time, expression]
const FACE_TIMELINE: [number, keyof typeof EXPR][] = [
  [0, 'breath'], [9, 'focus'], [20, 'grit'], [40, 'strain'], [51, 'pop'], [53.5, 'grit'], [60, 'breath'], [65.5, 'grit'], [71, 'strain'], [83.5, 'grin'], [112, 'smile'], [118, 'grin'],
];

const faceAt = (t: number): Face => {
  let i = 0;
  while (i + 1 < FACE_TIMELINE.length && FACE_TIMELINE[i + 1][0] <= t) i++;
  const cur = EXPR[FACE_TIMELINE[i][1]];
  const prev = EXPR[FACE_TIMELINE[Math.max(0, i - 1)][1]];
  const k = i === 0 ? 1 : smooth(seg(t, FACE_TIMELINE[i][0], FACE_TIMELINE[i][0] + 2.5));
  const mix = (a: number, b: number) => lerp(a, b, k);
  // a mouth swap pops: slightly small on the first frame of a new shape
  const pop = i === 0 ? 1 : lerp(0.86, 1, smooth(seg(t, FACE_TIMELINE[i][0], FACE_TIMELINE[i][0] + 2)));
  let lid = mix(prev.lid, cur.lid);
  // natural blinks, plus the wink
  const blink = (c: number, w = 1.6) => Math.max(0, 1 - Math.abs(t - c) / w);
  lid = Math.max(lid, blink(8), blink(57.5));
  const wink = clamp(Math.max(0, 1 - Math.abs(t - 108) / 3.2) * 1.6);
  return {
    lidU: [lid, Math.max(lid, wink)],
    lidLow: mix(prev.lidLow, cur.lidLow) + wink * 0.25,
    lidTilt: mix(prev.lidTilt, cur.lidTilt),
    browY: mix(prev.browY, cur.browY),
    browAng: mix(prev.browAng, cur.browAng),
    mouth: k > 0.35 ? cur.mouth : prev.mouth,
    mouthScale: mix(prev.mouthScale, cur.mouthScale) * pop * (1 + (t > 118 ? 0.04 * Math.sin((t - 118) * 0.5) : 0)),
    blush: mix(prev.blush, cur.blush),
    gaze: [0, 0],
  };
};

/** Two-bone IK: the middle joint, bending toward `pole`. */
export const ik = (root: THREE.Vector3, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) => {
  const d = target.clone().sub(root);
  let dist = d.length();
  const dir = d.normalize();
  dist = clamp(dist, Math.abs(a - b) + 1e-3, a + b - 1e-4);
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const mid = root.clone().add(dir.clone().multiplyScalar(a * cosA)).add(n.multiplyScalar(a * sinA));
  const end = root.clone().add(dir.clone().multiplyScalar(dist));
  return { mid, end };
};

export type Side = { shoulder: THREE.Vector3; elbow: THREE.Vector3; grip: THREE.Vector3; hip: THREE.Vector3; knee: THREE.Vector3; ankle: THREE.Vector3; footPitch: number };

export type Pose = {
  t: number;
  pelvis: THREE.Vector3;
  torsoQ: THREE.Quaternion;
  lean: number;
  shrug: number;
  L: Side; // his left, +x
  R: Side; // his right, -x
  bar: THREE.Vector3;
  barQ: THREE.Quaternion;
  whip: number; // signed end deflection of the bar
  headQ: THREE.Quaternion; // relative to the torso
  face: Face;
  /** thigh directions in torso space, for the skirt */
  thighL: THREE.Vector3;
  thighR: THREE.Vector3;
  impact: number; // 0..1 envelope after the catch and the lock (camera/fx)
};

const torsoQuat = (lean: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean);
const toWorld = (pelvis: THREE.Vector3, q: THREE.Quaternion, local: THREE.Vector3) => local.clone().applyQuaternion(q).add(pelvis);

/** Lean the torso just enough that straight arms reach the bar (pull phase). */
const solveLean = (pelvis: THREE.Vector3, grip: THREE.Vector3, shrug: number) => {
  const L = (SK.upper + SK.lower) * 0.994;
  const sh = new THREE.Vector3(SK.shoulderX, SK.shoulderY + shrug * 0.055, SK.shoulderZ);
  const f = (lean: number) => toWorld(pelvis, torsoQuat(lean), sh).distanceTo(grip) - L;
  let lo = -0.35;
  if (f(lo) <= 0) return lo;
  let hi = lo;
  for (let a = lo; a <= 1.3; a += 0.02) {
    hi = a;
    if (f(a) <= 0) break;
    lo = a;
  }
  if (f(hi) > 0) return hi;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

/** Camera azimuth is needed for the look-to-camera beat; pass it in. */
export const poseAt = (f: number, camAz = 0): Pose => {
  const t = actionTime(f);
  const breathe = t < 22 ? Math.sin(t * 0.42) * 0.004 : 0;
  const shrug = keys(shrugKeys, t);
  const heel = keys(heelKeys, t);
  const hop = keys(hopKeys, t);
  const stance = keys(stanceKeys, t);
  const ankleY = SK.ankleH + heel + hop;
  const depth = depthKey(t) + breathe;
  const pelvis = new THREE.Vector3(0, ankleY + depth + SK.hipDrop - hop * 0.4, keys(pelvisZKeys, t));

  // --- the bar, keyed or riding on the body
  const keyedBar = new THREE.Vector3(0, barYKey(t), keys(barZKeys, t));
  const wRack = t < 68 ? E.out(seg(t, 49, 52)) : 1 - E.sine(seg(t, 68, 69.6));
  const wOver = E.out(seg(t, 75.2, 76.2));

  // lean: solved while the arms hang straight, keyed afterwards
  const solved = t < 49 ? solveLean(pelvis, keyedBar.clone().add(new THREE.Vector3(SK.grip, 0, 0)), shrug) : 0;
  const wKey = E.sine(seg(t, 43.5, 47.5));
  const lean = lerp(solved, keys(leanKeys, t), wKey) + (t < 22 ? breathe * 2 : 0);
  const torsoQ = torsoQuat(lean);

  const rackW = toWorld(pelvis, torsoQ, RACK.clone().add(new THREE.Vector3(0, shrug * 0.04, 0)));
  const overW = toWorld(pelvis, torsoQ, overheadLocal(shrug));
  const bar = keyedBar.clone();
  if (wRack > 0 && t < 72) bar.lerp(rackW, wRack);
  if (wOver > 0) bar.lerp(overW, wOver);

  // bar whip: the plates keep going after the bar stops (catch and lockout)
  const whipAt = (t0: number, amp: number, period: number, decay: number) => (t > t0 ? amp * Math.sin(((t - t0) / period) * Math.PI * 2) * Math.exp(-(t - t0) / decay) : 0);
  const whip = whipAt(50.5, -0.05, 5, 4) + whipAt(76, -0.11, 4.2, 5);
  const barQ = new THREE.Quaternion(); // the bar stays level

  // --- arms
  const shoulderL = toWorld(pelvis, torsoQ, new THREE.Vector3(SK.shoulderX, SK.shoulderY + shrug * 0.055, SK.shoulderZ));
  const shoulderR = toWorld(pelvis, torsoQ, new THREE.Vector3(-SK.shoulderX, SK.shoulderY + shrug * 0.055, SK.shoulderZ));
  const gripSag = whip * 0.12; // the hands see a little of the bend
  const gripL = bar.clone().add(new THREE.Vector3(SK.grip, gripSag, 0));
  const gripR = bar.clone().add(new THREE.Vector3(-SK.grip, gripSag, 0));
  // elbow pole: out/back on the pull, high on the turnover, down-out in the rack, out overhead
  const poleFor = (s: number) => {
    const pull = new THREE.Vector3(s * 1, 0.1, -0.6);
    const turn = new THREE.Vector3(s * 0.9, 0.9, -0.2);
    const rack = new THREE.Vector3(s * 0.75, -0.65, 0.15);
    const over = new THREE.Vector3(s * 1, 0.05, -0.3);
    const p = pull.clone();
    p.lerp(turn, E.sine(seg(t, 44, 47.5)));
    p.lerp(rack, E.sine(seg(t, 47.5, 51)));
    p.lerp(over, E.sine(seg(t, 69, 74)));
    return p.normalize();
  };
  const armL = ik(shoulderL, gripL, SK.upper, SK.lower, poleFor(1));
  const armR = ik(shoulderR, gripR, SK.upper, SK.lower, poleFor(-1));

  // --- legs
  const hipL = toWorld(pelvis, torsoQ, new THREE.Vector3(SK.hipX, -SK.hipDrop, 0));
  const hipR = toWorld(pelvis, torsoQ, new THREE.Vector3(-SK.hipX, -SK.hipDrop, 0));
  const ankleL = new THREE.Vector3(stance, ankleY, 0);
  const ankleR = new THREE.Vector3(-stance, ankleY, 0);
  const legL = ik(hipL, ankleL, SK.thigh, SK.shin, new THREE.Vector3(0.35, -0.1, 1).normalize());
  const legR = ik(hipR, ankleR, SK.thigh, SK.shin, new THREE.Vector3(-0.35, -0.1, 1).normalize());
  const footPitch = Math.asin(clamp(heel / 0.11, 0, 0.9));

  const inv = torsoQ.clone().invert();
  const thighL = legL.mid.clone().sub(hipL).normalize().applyQuaternion(inv);
  const thighR = legR.mid.clone().sub(hipR).normalize().applyQuaternion(inv);

  // --- head: keep the eyes level-ish while the torso leans, plus acting
  const face = faceAt(t);
  let pitch = keys(headPitchKeys, t) - lean * 0.72;
  // the look into the lens (action ~96 onward) and a cocky head tilt for the wink
  const look = E.sine(seg(t, 95, 100)) * (1 - E.sine(seg(t, 126, 132)));
  const yaw = look * clamp(camAz * 0.75, -0.7, 0.7) + noise1(t * 0.05, 3) * 0.02;
  const roll = E.sine(seg(t, 104, 107)) * (1 - E.sine(seg(t, 112, 116))) * -0.14 + noise1(t * 0.06, 5) * 0.015;
  pitch += look * -0.05;
  face.gaze = [look * clamp(camAz * 0.3, -0.35, 0.35), look * -0.08];
  const headQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));

  const impact = Math.max(t > 50.5 ? Math.exp(-(t - 50.5) / 3) : 0, t > 76 ? Math.exp(-(t - 76) / 3.5) : 0);

  return {
    t,
    pelvis,
    torsoQ,
    lean,
    shrug,
    L: { shoulder: shoulderL, elbow: armL.mid, grip: armL.end, hip: hipL, knee: legL.mid, ankle: legL.end, footPitch },
    R: { shoulder: shoulderR, elbow: armR.mid, grip: armR.end, hip: hipR, knee: legR.mid, ankle: legR.end, footPitch },
    bar,
    barQ,
    whip,
    headQ,
    face,
    thighL,
    thighR,
    impact,
  };
};
