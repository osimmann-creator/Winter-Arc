import * as THREE from 'three';
import { E, Key, keys, noise1, seg } from '../kit/math';
import { ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { Dumbbell, Heart, alongX, bounce, toss } from '../kit/props';
import { BodySpec, SK, faceTimeline, lookAt, makeRemap, plantedFeet } from '../kit/rig';
import { ClipDef, Shot, hit } from '../kit/stage';

// gym-2-3d · Gun Show (GunShow.tsx): three curls, the dumbbells go flying at
// 50, POW double-biceps at 61 as the guns pump up, the bells CLONK down at 75
// and 78, a kiss for the right bicep at 94, the card at 98.

const P: Record<string, ArmPose> = {
  dbHang: { at: [0.36, -0.27, 0.1], axis: [0, 0, 1], pole: [1, 0.15, -0.5], shape: 'grip' },
  curlTop: { at: [0.27, 0.36, 0.27], axis: [0.15, 0, 1], pole: [0.35, -1, -0.15], shape: 'grip' },
  tossUp: { at: [0.34, 1.02, -0.06], axis: [0, 0, 1], pole: [1, 0.2, -0.3], shape: 'open', palm: [0, 0.3, -1] },
  flexBig: { at: [0.56, 0.82, 0.12], axis: [0, 0, -1], pole: [1, -0.3, -0.2], shape: 'fist' },
  flex: { at: [0.5, 0.74, 0.08], axis: [0, 0, -1], pole: [1, -0.45, -0.15], shape: 'fist' },
  flexKiss: { at: [0.36, 0.8, 0.24], axis: [0, 0, -1], pole: [1, -0.4, 0.2], shape: 'fist' },
};
const armL = armTrack([[0, P.dbHang], [24, P.curlTop, 8], [32, P.dbHang, 6], [38, P.curlTop, 6], [46, P.tossUp, 4], [51, P.flexBig, 9], [66, P.flex, 12]]);
const armR = armTrack([[0, P.dbHang], [12, P.curlTop, 8], [20, P.dbHang, 7], [38, P.curlTop, 6], [46, P.tossUp, 4], [51, P.flexBig, 9], [66, P.flex, 12], [86, P.flexKiss, 7], [97, P.flex, 8]]);

const face = faceTimeline(
  [[0, 'happy'], [10, 'focus'], [16, 'grit'], [22, 'happy'], [28, 'grit'], [34, 'focus'], [40, 'grit'], [47, 'wow'], [55, 'grit'], [61, 'grin'], [72, 'cocky'], [87, 'kiss'], [96.5, 'grin'], [112, 'smile']],
  { blinks: [6, 70, 118], bob: 116 },
);

const dipKeys: Key[] = [[0, 0], [58, 0], [61, -0.035, E.out], [66, 0, E.sine]];
const pitchKeys: Key[] = [[0, 0.02], [18, 0.06], [22, 0.02], [30, 0.06], [34, 0.02], [44, 0.08], [48, -0.12], [56, -0.04], [61, -0.1, E.out], [80, -0.06], [88, 0.02], [96, -0.04]];
const yawKeys: Key[] = [[0, 0], [86, 0], [92, -0.22], [97, -0.05], [110, -0.1]];
const shrugKeys: Key[] = [[0, 0], [46, 0.2], [50, 0.6], [61, 0.45], [80, 0.35]];
const pumpKeys: Key[] = [[0, 1], [59, 1], [62, 1.2, E.out], [70, 1.14], [135, 1.14]];
const headP: Key[] = [[0, -0.02], [18, 0.05], [24, -0.02], [44, 0.05], [48, -0.25], [55, -0.05], [61, -0.1], [86, -0.05], [91, 0.18], [96, 0.12], [99, -0.04]];
const headY: Key[] = [[0, 0], [12, -0.15], [20, -0.3], [26, 0], [32, 0.3], [38, 0], [86, 0], [91, -0.82], [96, -0.78], [99, 0]];
const headR: Key[] = [[0, 0], [86, 0], [91, -0.18], [96, -0.12], [99, 0]];

const body = (t: number, camAz = 0): BodySpec => {
  const breathe = Math.sin(t * 0.3) * 0.004;
  const pelvis = v(0, SK.standY + breathe + keys(dipKeys, t), 0);
  const torso: [number, number, number] = [keys(pitchKeys, t), keys(yawKeys, t), 0];
  const look = E.sine(seg(t, 100, 106));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = la.gaze;
  return {
    pelvis,
    torso,
    shrug: keys(shrugKeys, t),
    hands: { L: handFrom(pelvis, torso, armL(t), 1), R: handFrom(pelvis, torso, armR(t), -1) },
    feet: plantedFeet(t < 59 ? 0.17 : 0.19),
    head: [keys(headP, t), keys(headY, t) + la.yaw + noise1(t * 0.05, 3) * 0.02, keys(headR, t)],
    face: fc,
    pump: keys(pumpKeys, t),
  };
};

const RELEASE = 50;
let AT_RELEASE: BodySpec | null = null;
const atRelease = () => (AT_RELEASE ??= body(RELEASE));
const LAND = { L: { at: v(0.86, 0.072, -1.15), f: 78 }, R: { at: v(-0.95, 0.072, -1.0), f: 75 } };

type Props = { bells: { pos: THREE.Vector3; q: THREE.Quaternion }[]; t: number };

const bellAt = (side: 'L' | 'R', t: number, b: BodySpec) => {
  if (t < RELEASE) {
    const h = b.hands[side];
    return { pos: h.at.clone(), q: alongX(h.axis) };
  }
  const r = atRelease().hands[side];
  const land = LAND[side];
  const pos = toss(r.at, land.at, RELEASE, land.f, t);
  pos.y += bounce(t, land.f, 0.05, 5);
  if (t > land.f) pos.z += Math.min(1, (t - land.f) / 14) * 0.12;
  const spin = Math.min(t, land.f) - RELEASE;
  const q = alongX(r.axis).premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(spin * 0.32, spin * (side === 'L' ? 0.18 : -0.21), spin * 0.12)));
  if (t > land.f) q.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side === 'L' ? 0.4 : -0.3, 0)), Math.min(1, (t - land.f) / 3));
  return { pos, q };
};

export const gunShow: ClipDef<Props> = {
  id: 'gym-2-3d',
  set: 'temple',
  remap: makeRemap(),
  camera: {
    keys: {
      az: [[0, 18], [20, 10], [44, 4], [56, -12], [61, -18], [80, -30], [90, -34], [98, -24], [135, -18]],
      y: [[0, 1.2], [20, 1.1], [44, 1.0], [56, 0.8], [61, 0.78], [80, 0.95], [90, 1.1], [98, 1.15], [135, 1.2]],
      dist: [[0, 2.2], [20, 2.9], [44, 3.4], [56, 4.3], [61, 4.2], [80, 4.6], [90, 2.6], [100, 5.6], [135, 6.3]],
      ty: [[0, 1.15], [20, 1.02], [44, 1.05], [56, 1.18], [61, 1.2], [80, 1.2], [90, 1.48], [100, 1.58], [135, 1.62]],
      tx: [[0, 0], [86, 0], [90, -0.15], [98, 0], [135, 0]],
      tz: [[0, 0.05], [135, 0]],
      fov: [[0, 36], [56, 38], [80, 36], [100, 34], [135, 34]],
    },
    hits: [[61, 1], [75, 0.35], [78, 0.3], [99, 0.2]],
    punch: [61],
  },
  state: ({ t, cam }: Shot) => {
    const b = body(t, cam.az);
    return { body: b, props: { bells: [bellAt('L', t, b), bellAt('R', t, b)], t } };
  },
  Props: ({ props, pose }) => (
    <>
      <Dumbbell pos={props.bells[0].pos} q={props.bells[0].q} color="purple" />
      <Dumbbell pos={props.bells[1].pos} q={props.bells[1].q} color="pink" />
      <Heart at={pose.R.elbow.clone().lerp(pose.R.shoulder, 0.4).add(new THREE.Vector3(0.02, 0.16, 0.16))} t={props.t} t0={93.5} />
    </>
  ),
  bursts: [
    { burst: { t0: 61, n: 40, speed: 1.9, up: 0.08, drag: 3, life: 22, size: 0.07, grow: 2.6, alpha: 0.22, floor: true }, at: (p) => [p.L.ankle, p.R.ankle, new THREE.Vector3(0, 0.02, 0.25)].map((a) => new THREE.Vector3(a.x, 0.02, a.z)) },
    { burst: { t0: 61, n: 24, speed: 1.3, up: 0.2, drag: 3.4, life: 20, size: 0.04, grow: 3.4, alpha: 0.18 }, at: (p) => [p.L.elbow, p.R.elbow] },
    { burst: { t0: 75, n: 24, speed: 1.0, up: 0.1, drag: 3.4, life: 18, size: 0.06, grow: 2.4, alpha: 0.2, floor: true }, at: () => [new THREE.Vector3(-0.95, 0.02, -1.0)] },
    { burst: { t0: 78, n: 24, speed: 1.0, up: 0.1, drag: 3.4, life: 18, size: 0.06, grow: 2.4, alpha: 0.2, floor: true }, at: () => [new THREE.Vector3(0.86, 0.02, -1.15)] },
  ],
  glints: (_s, pose) => [
    { f: 62, at: pose.L.grip.clone().add(new THREE.Vector3(0.03, 0.06, 0.06)), size: 0.45 },
    { f: 68, at: pose.R.shoulder.clone().add(new THREE.Vector3(-0.08, 0.06, 0.1)), size: 0.3 },
    { f: 104, at: pose.pelvis.clone().add(new THREE.Vector3(0, 0.07, 0.19).applyQuaternion(pose.torsoQ)), size: 0.26 },
  ],
  card: { kind: 'ribbon', title: 'GUN SHOW', start: 98, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const pow = hit(f, 61, 4);
    const land = hit(f, 75, 3) + hit(f, 78, 3) * 0.8;
    return { bloom: 0.85 + 1.1 * pow + 0.2 * land, aberration: 0.9 * pow + 0.25 * land, exposure: 1 + 0.18 * pow, sun: 1 + 0.4 * pow };
  },
};
