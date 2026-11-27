import * as THREE from 'three';
import { Barbell } from '../kit/Barbell';
import { E, Key, clamp, keys, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { bounce, toss } from '../kit/props';
import { BodySpec, FootSpec, SK, faceTimeline, lookAt, makeRemap, toWorld, torsoQuat } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';

// gym-3-3d · Leg Day (LegDay.tsx): back squats — ONE at 22, TWO at 46 — the
// third one stalls at 57 and the legs wobble, he dumps the bar at 70 (CLANG
// at 80), the legs give out into the splits at 91, card at 100.

const BAR_LOCAL = new THREE.Vector3(0, 0.49, -0.16);
const BAIL = 70;
const CLANG = 80;
const SPLAT = 91;

const pelvisYKeys: Key[] = [[0, 0.73], [8, 0.73], [14, 0.43, E.inOut], [22, 0.73, E.inOut], [26, 0.73], [34, 0.43, E.inOut], [46, 0.72, E.inOut], [48, 0.72], [56, 0.42, E.inOut], [70, 0.44], [80, 0.45], [86, 0.38, E.in], [SPLAT, 0.13, E.in], [95, 0.17, E.out], [100, 0.15]];
const pelvisZKeys: Key[] = [[0, 0], [8, 0], [14, -0.1], [22, 0], [26, 0], [34, -0.1], [46, 0], [48, 0], [56, -0.1], [70, -0.08], [80, -0.02], [SPLAT, 0], [135, 0]];
const leanKeys: Key[] = [[0, 0.04], [8, 0.04], [14, 0.42], [22, 0.05], [26, 0.05], [34, 0.42], [46, 0.06], [48, 0.06], [56, 0.44], [70, 0.4], [74, 0.2, E.out], [80, 0.1], [86, 0.05], [SPLAT, -0.05, E.out], [100, -0.08]];
const stanceKeys: Key[] = [[0, 0.24], [84, 0.24], [SPLAT, 0.74, E.in], [135, 0.74]];

const P: Record<string, ArmPose> = {
  wide: { ...ARMS.wide, at: [0.78, 0.5, 0.2] },
  flail: { at: [0.62, 0.82, 0.34], axis: [0, 1, 0], pole: [1, -0.2, -0.2], shape: 'open', palm: [0, 0, -1] },
  flex: ARMS.flex,
};
const freeArm = armTrack([[BAIL, P.flail, 4], [CLANG + 2, P.wide, 6], [99, P.flex, 8]]);

const face = faceTimeline(
  [[0, 'focus'], [10, 'grit'], [20, 'happy'], [26, 'grit'], [42, 'strain'], [47, 'happy'], [50, 'grit'], [55, 'strain'], [59, 'panic'], [70, 'wow'], [86, 'panic'], [SPLAT, 'wince'], [99, 'grin'], [116, 'smile']],
  { blinks: [5, 24, 112] },
);

const barOnBack = (pelvis: THREE.Vector3, torso: [number, number, number]) => toWorld(pelvis, torsoQuat(torso), BAR_LOCAL);

const core = (t: number) => {
  const wobble = t > 57 && t < BAIL ? Math.sin(t * 2.6) * 0.012 * seg(t, 57, 61) : 0;
  const pelvis = v(wobble, keys(pelvisYKeys, t), keys(pelvisZKeys, t));
  const torso: [number, number, number] = [keys(leanKeys, t), 0, wobble * 3];
  return { pelvis, torso };
};

let AT_BAIL: THREE.Vector3 | null = null;
const barAtBail = () => {
  if (!AT_BAIL) {
    const c = core(BAIL);
    AT_BAIL = barOnBack(c.pelvis, c.torso);
  }
  return AT_BAIL;
};
const BAR_LAND = v(0, SK.plateR, -0.95);

const body = (t: number, camAz = 0): { b: BodySpec; bar: THREE.Vector3; whip: number } => {
  const { pelvis, torso } = core(t);
  const bar = t < BAIL ? barOnBack(pelvis, torso) : toss(barAtBail(), BAR_LAND, BAIL, CLANG, t);
  if (t > CLANG) bar.y += bounce(t, CLANG, 0.05, 6);
  const whip = (t > CLANG ? -0.07 * Math.sin(((t - CLANG) / 4) * Math.PI * 2) * Math.exp(-(t - CLANG) / 5) : 0) + (t < BAIL ? 0.02 * Math.sin(t * 0.9) * seg(t, 8, 14) : 0);
  const q = torsoQuat(torso);
  const onBar = (s: 1 | -1) => ({
    at: bar.clone().add(new THREE.Vector3(s * 0.56, 0.01, 0)),
    axis: new THREE.Vector3(s, 0, 0),
    shape: 'grip' as const,
    pole: new THREE.Vector3(s * 0.45, -1, -0.5).applyQuaternion(q),
  });
  const k = E.inOut(seg(t, BAIL, BAIL + 4));
  const L = k <= 0 ? onBar(1) : handFrom(pelvis, torso, freeArm(t), 1);
  const R = k <= 0 ? onBar(-1) : handFrom(pelvis, torso, freeArm(t), -1);
  if (k > 0 && k < 1) {
    const a = onBar(1);
    const b = onBar(-1);
    L.at.lerp(a.at, 1 - k);
    R.at.lerp(b.at, 1 - k);
  }
  const stance = keys(stanceKeys, t);
  const split = E.in(seg(t, 84, SPLAT));
  const shake = t > 57 && t < 84 ? 0.012 * Math.sin(t * 3.1) : 0;
  const foot = (s: 1 | -1): FootSpec => ({
    at: v(s * (stance + shake * s), SK.ankleH, 0.02),
    yaw: s * (0.38 + split * 1.05),
    pitch: 0,
    pole: v(s * 0.55 * (1 - split), 0.2 + split * 1.2, 1 - split * 0.4).normalize(),
  });
  const look = E.sine(seg(t, 104, 110));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = la.gaze;
  return {
    b: {
      pelvis,
      torso,
      shrug: t < BAIL ? 0.4 : 0.15,
      hands: { L, R },
      feet: { L: foot(1), R: foot(-1) },
      head: [-keys(leanKeys, t) * 0.65 + (t > 57 && t < BAIL ? noise1(t * 0.8, 9) * 0.06 : 0), la.yaw + noise1(t * 0.05, 3) * 0.02, (t > 57 && t < 84 ? Math.sin(t * 1.7) * 0.05 : 0) + clamp((t - SPLAT) / 6, 0, 1) * 0.08 * (1 - look)],
      face: fc,
    },
    bar,
    whip,
  };
};

type Props = { bar: THREE.Vector3; whip: number };

export const legDay: ClipDef<Props> = {
  id: 'gym-3-3d',
  set: 'temple',
  remap: makeRemap(),
  camera: {
    keys: {
      az: [[0, 26], [24, 20], [48, 12], [60, 6], [70, 0], [82, -8], [92, -14], [100, -12], [135, -8]],
      y: [[0, 1.0], [24, 0.95], [48, 0.85], [60, 0.7], [70, 0.62], [82, 0.6], [92, 0.38], [100, 0.85], [135, 1.0]],
      dist: [[0, 3.9], [24, 3.8], [48, 3.6], [60, 3.2], [70, 3.4], [82, 3.8], [92, 4.4], [102, 5.4], [135, 6.0]],
      ty: [[0, 1.15], [24, 1.05], [48, 1.0], [60, 0.95], [70, 0.95], [82, 0.85], [92, 0.58], [102, 1.35], [135, 1.4]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0], [70, -0.2], [92, 0], [135, 0]],
      fov: [[0, 36], [92, 38], [102, 34], [135, 34]],
    },
    hits: [[22, 0.15], [46, 0.2], [CLANG, 0.6], [SPLAT, 1], [101, 0.2]],
    punch: [SPLAT],
  },
  state: ({ t, cam }) => {
    const r = body(t, cam.az);
    return { body: r.b, props: { bar: r.bar, whip: r.whip } };
  },
  Props: ({ props }) => <Barbell pos={props.bar} whip={props.whip} />,
  bursts: [
    { burst: { t0: CLANG, n: 34, speed: 1.2, up: 0.12, drag: 3.2, life: 22, size: 0.08, grow: 2.6, alpha: 0.22, floor: true }, at: () => [v(-0.75, 0.02, -0.95), v(0.75, 0.02, -0.95)] },
    { burst: { t0: SPLAT, n: 40, speed: 1.6, up: 0.1, drag: 3, life: 24, size: 0.08, grow: 2.8, alpha: 0.24, floor: true }, at: (p) => [p.L.ankle, p.R.ankle, p.pelvis].map((a) => v(a.x, 0.02, a.z)) },
  ],
  glints: (_s, pose, props) => [
    { f: 22, at: props.bar.clone().add(v(0.9, 0.02, 0.03)), size: 0.35 },
    { f: 46, at: props.bar.clone().add(v(-0.9, 0.02, 0.03)), size: 0.35 },
    { f: 103, at: pose.L.grip.clone().add(v(0.03, 0.06, 0.06)), size: 0.32 },
  ],
  card: { kind: 'ribbon', title: 'LEG DAY', start: 100, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const splat = hit(f, SPLAT, 4);
    const clang = hit(f, CLANG, 3);
    return { bloom: 0.85 + 0.9 * splat + 0.35 * clang, aberration: 0.9 * splat + 0.4 * clang, exposure: 1 + 0.12 * splat, sun: 1 + 0.3 * splat };
  },
};
