import * as THREE from 'three';
import { Barbell } from '../kit/Barbell';
import { E, Key, clamp, keys, lerp, noise1, seg } from '../kit/math';
import { SK, faceTimeline, headPoint, lookAt, makeRemap, toWorld, torsoQuat } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';

// gym-1-3d · Beast Mode: the clean and jerk from BeastMode.tsx. Same beats
// (pull from 22, catch ~50, dip 68, lockout 76), a slow-motion arc through
// the bar whip and the chalk cloud, the BEAST MODE plaque at 93.

const bar2D: Key[] = [[0, -140], [11, -140], [22, -148], [38, -312, E.sine], [45, -465, E.in], [49, -565, E.out], [53, -535], [61, -610, E.sine], [68, -550], [73, -802, E.in], [76, -1015, E.out], [80, -1000], [89, -1064, E.sine], [101, -1069], [134, -1067]];
const barYKey = (t: number) => SK.plateR + (-keys(bar2D, t) - 140) * 0.00184;
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

const RACK = new THREE.Vector3(0, 0.4, 0.255);
const overheadLocal = (shrug: number) => {
  const reach = Math.sqrt((SK.upper + SK.lower) ** 2 - (SK.grip - SK.shoulderX) ** 2) * 0.996;
  return new THREE.Vector3(0, SK.shoulderY + shrug * 0.055 + reach, -0.05);
};

/** Lean the torso just enough that straight arms reach the bar (pull phase). */
const solveLean = (pelvis: THREE.Vector3, grip: THREE.Vector3, shrug: number) => {
  const L = (SK.upper + SK.lower) * 0.994;
  const sh = new THREE.Vector3(SK.shoulderX, SK.shoulderY + shrug * 0.055, SK.shoulderZ);
  const f = (lean: number) => toWorld(pelvis, torsoQuat([lean, 0, 0]), sh).distanceTo(grip) - L;
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

const face = faceTimeline(
  [[0, 'breath'], [9, 'focus'], [20, 'grit'], [40, 'strain'], [51, 'pop'], [53.5, 'grit'], [60, 'breath'], [65.5, 'grit'], [71, 'strain'], [83.5, 'grin'], [112, 'smile'], [118, 'grin']],
  { blinks: [8, 57.5], wink: { t: 108, side: 'R' }, bob: 118 },
);

type Props = { bar: THREE.Vector3; whip: number };

export const beastMode: ClipDef<Props> = {
  id: 'gym-1-3d',
  set: 'temple',
  remap: makeRemap({ slow: { at: 76, hold: 14, rate: 0.3, ramp: 8 } }),
  camera: {
    keys: {
      az: [[0, 36], [10, 33], [22, 27], [36, 21], [50, 15], [62, 9], [70, 4], [76, -3], [84, -20], [92, -38], [102, -47], [135, -53]],
      y: [[0, 0.72], [12, 0.74], [24, 0.85], [40, 1.0], [52, 1.0], [62, 0.8], [70, 0.52], [76, 0.42], [84, 0.46], [92, 0.62], [102, 0.95], [135, 1.12]],
      dist: [[0, 3.15], [14, 2.95], [24, 3.0], [40, 3.25], [52, 3.45], [62, 3.35], [70, 3.1], [76, 2.9], [84, 3.0], [92, 3.45], [102, 4.8], [120, 5.7], [135, 6.0]],
      ty: [[0, 1.04], [14, 1.02], [24, 1.0], [40, 1.0], [52, 1.05], [62, 1.1], [70, 1.35], [76, 1.58], [84, 1.55], [92, 1.45], [102, 1.42], [135, 1.45]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0.12], [24, 0.05], [60, 0], [135, 0]],
      fov: [[0, 36], [70, 36], [76, 39], [90, 38], [102, 35], [135, 34]],
    },
    hits: [[50.5, 0.6], [76, 1], [93, 0.25]],
    punch: [76],
  },
  state: ({ t, cam }) => {
    const breathe = t < 22 ? Math.sin(t * 0.42) * 0.004 : 0;
    const shrug = keys(shrugKeys, t);
    const heel = keys(heelKeys, t);
    const hop = keys(hopKeys, t);
    const stance = keys(stanceKeys, t);
    const ankleY = SK.ankleH + heel + hop;
    const pelvis = new THREE.Vector3(0, ankleY + depthKey(t) + breathe + SK.hipDrop - hop * 0.4, keys(pelvisZKeys, t));
    const keyedBar = new THREE.Vector3(0, barYKey(t), keys(barZKeys, t));
    const wRack = t < 68 ? E.out(seg(t, 49, 52)) : 1 - E.sine(seg(t, 68, 69.6));
    const wOver = E.out(seg(t, 75.2, 76.2));
    const solved = t < 49 ? solveLean(pelvis, keyedBar.clone().add(new THREE.Vector3(SK.grip, 0, 0)), shrug) : 0;
    const lean = lerp(solved, keys(leanKeys, t), E.sine(seg(t, 43.5, 47.5))) + (t < 22 ? breathe * 2 : 0);
    const q = torsoQuat([lean, 0, 0]);
    const bar = keyedBar.clone();
    if (wRack > 0 && t < 72) bar.lerp(toWorld(pelvis, q, RACK.clone().add(new THREE.Vector3(0, shrug * 0.04, 0))), wRack);
    if (wOver > 0) bar.lerp(toWorld(pelvis, q, overheadLocal(shrug)), wOver);
    const whipAt = (t0: number, amp: number, period: number, decay: number) => (t > t0 ? amp * Math.sin(((t - t0) / period) * Math.PI * 2) * Math.exp(-(t - t0) / decay) : 0);
    const whip = whipAt(50.5, -0.05, 5, 4) + whipAt(76, -0.11, 4.2, 5);
    const pole = (s: number) => {
      const p = new THREE.Vector3(s, 0.1, -0.6);
      p.lerp(new THREE.Vector3(s * 0.9, 0.9, -0.2), E.sine(seg(t, 44, 47.5)));
      p.lerp(new THREE.Vector3(s * 0.75, -0.65, 0.15), E.sine(seg(t, 47.5, 51)));
      p.lerp(new THREE.Vector3(s, 0.05, -0.3), E.sine(seg(t, 69, 74)));
      return p.normalize();
    };
    const sag = whip * 0.12;
    const footPitch = Math.asin(clamp(heel / 0.11, 0, 0.9));
    const look = E.sine(seg(t, 95, 100)) * (1 - E.sine(seg(t, 126, 132)));
    const la = lookAt(cam.az, look);
    const fc = face(t);
    fc.gaze = la.gaze;
    return {
      body: {
        pelvis,
        torso: [lean, 0, 0],
        shrug,
        hands: {
          L: { at: bar.clone().add(new THREE.Vector3(SK.grip, sag, 0)), axis: new THREE.Vector3(1, 0, 0), shape: 'grip', pole: pole(1) },
          R: { at: bar.clone().add(new THREE.Vector3(-SK.grip, sag, 0)), axis: new THREE.Vector3(-1, 0, 0), shape: 'grip', pole: pole(-1) },
        },
        feet: {
          L: { at: new THREE.Vector3(stance, ankleY, 0), yaw: 0.12, pitch: footPitch },
          R: { at: new THREE.Vector3(-stance, ankleY, 0), yaw: -0.12, pitch: footPitch },
        },
        head: [keys(headPitchKeys, t) - lean * 0.72 - look * 0.05, la.yaw + noise1(t * 0.05, 3) * 0.02, E.sine(seg(t, 104, 107)) * (1 - E.sine(seg(t, 112, 116))) * -0.14 + noise1(t * 0.06, 5) * 0.015],
        face: fc,
      },
      props: { bar, whip },
    };
  },
  Props: ({ props }) => <Barbell pos={props.bar} whip={props.whip} />,
  bursts: [
    { burst: { t0: 23, n: 40, speed: 0.9, up: 0.12, drag: 3.2, life: 26, size: 0.08, grow: 2.6, alpha: 0.2, floor: true }, at: () => [new THREE.Vector3(-0.75, 0.02, 0.215), new THREE.Vector3(0.75, 0.02, 0.215)] },
    { burst: { t0: 49.5, n: 26, speed: 0.8, up: 0.1, drag: 3.5, life: 20, size: 0.06, grow: 2.4, alpha: 0.18, floor: true }, at: (p) => [p.L.ankle, p.R.ankle].map((a) => new THREE.Vector3(a.x, 0.02, a.z + 0.05)) },
    { burst: { t0: 50.5, n: 46, speed: 1.1, up: 0.25, drag: 3.6, life: 26, size: 0.045, grow: 4.0, alpha: 0.24 }, at: (p) => [p.L.grip, p.R.grip] },
    { burst: { t0: 75.5, n: 30, speed: 1.0, up: 0.1, drag: 3.2, life: 12, size: 0.06, grow: 2.2, alpha: 0.16, floor: true }, at: (p) => [p.L.ankle, p.R.ankle].map((a) => new THREE.Vector3(a.x, 0.02, a.z + 0.05)) },
    { burst: { t0: 76, n: 260, speed: 2.0, up: 0.3, drag: 2.6, life: 25, size: 0.035, grow: 6.5, alpha: 0.13 }, at: (p) => [p.L.grip, p.R.grip] },
  ],
  glints: (_shot, pose, props) => [
    { f: 5, at: props.bar.clone().add(new THREE.Vector3(0.9, 0.02, 0.04)), size: 0.5 },
    { f: 30, at: pose.L.grip.clone().add(new THREE.Vector3(0.02, 0.09, 0.05)), size: 0.28 },
    { f: 82, at: props.bar.clone().add(new THREE.Vector3(-0.93, 0.03, 0.03)), size: 0.75 },
    { f: 86, at: props.bar.clone().add(new THREE.Vector3(0.36, 0.02, 0.02)), size: 0.4 },
    { f: 119.5, at: headPoint(pose, new THREE.Vector3(-0.15, 0.08, 0.24)), size: 0.36 },
    { f: 125, at: pose.pelvis.clone().add(new THREE.Vector3(0, 0.07, 0.19).applyQuaternion(pose.torsoQ)), size: 0.26 },
  ],
  card: { kind: 'plaque', theme: 'beast', title: 'BEAST MODE', start: 93 },
  fx: (f) => {
    const lock = hit(f, 76, 4);
    const ctch = hit(f, 50.5, 3);
    const slow = f > 76 && f < 98 ? Math.sin(((f - 76) / 22) * Math.PI) : 0;
    return { bloom: 0.9 + 1.3 * lock + 0.3 * ctch, aberration: 0.25 * ctch + lock, exposure: 1 + 0.22 * lock, sun: 1 + 0.55 * lock + 0.25 * slow };
  },
};

