import React, { useMemo } from 'react';
import * as THREE from 'three';
import { E, Key, clamp, keys, lerp, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { bounce } from '../kit/props';
import { BodySpec, FootSpec, HandSpec, SK, faceTimeline, lookAt } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';
import { winterMats } from '../sets/WinterGym';

// gym-10-3d · Hammer Time (HammerTime.tsx), Winter Arc Gym: sledgehammer on
// a tractor tyre. Bonk (22)... then BWANG (40): the tyre launches up out of
// shot; UH OH (54), he drops the hammer (CLUNK 58) and the tyre comes down
// around him like a ring toss (RINGER 68). Flex (80). Card at 96.

const SLAM1 = 22;
const SLAM2 = 40;
const UHOH = 54;
const LET_GO = 50; // the hammer slips out of his hands as he gawps at the tyre
const CLUNK = 58;
const RINGER = 68;
const FLEX = 80;
const HANDLE = 0.9;
const TYRE_R = 0.72; // centre of the rubber
const TYRE_T = 0.21; // its thickness (radius of the tube)
const TYRE_H = TYRE_T * 0.85;
const TYRE_AT = v(0, TYRE_H, 1.35);
const ME = v(0, 0, -0.2); // where he stands

// ---------------------------------------------------------------- the hammer (handle bottom end, direction to the head)
const READY_B = v(-0.06, 0.66, 0.06);
const READY_H = v(-0.38, 0.09, 0.5);
const UP1_B = v(-0.08, 1.5, -0.12);
const UP1_H = v(-0.18, 2.12, -0.75);
const UP2_B = v(-0.1, 1.62, -0.16);
const UP2_H = v(-0.22, 2.3, -0.8);
const HIT_B = v(0, 0.96, -0.06);
const HIT_H = v(0, 0.43, 0.66);
const REC_B = v(-0.04, 1.2, -0.12);
const REC_H = v(-0.1, 1.95, -0.55);
const LIE_B = v(-0.86, 0.035, 0.92);
const LIE_H = LIE_B.clone().add(v(-0.25, 0, 1).normalize().multiplyScalar(HANDLE));

type HK = { t: number; b: THREE.Vector3; h: THREE.Vector3; e?: (x: number) => number };
const HAMMER: HK[] = [
  { t: 0, b: READY_B, h: READY_H },
  { t: 9, b: READY_B, h: READY_H },
  { t: 18, b: UP1_B, h: UP1_H, e: E.inOut },
  { t: 19.5, b: UP1_B.clone().add(v(0, 0.03, -0.02)), h: UP1_H.clone().add(v(0, 0.05, -0.06)) },
  { t: SLAM1, b: HIT_B, h: HIT_H, e: E.in },
  { t: 25, b: HIT_B.clone().add(v(0, 0.08, 0)), h: HIT_H.clone().add(v(0, 0.26, -0.04)), e: E.out },
  { t: 28, b: HIT_B, h: HIT_H.clone().add(v(0, 0.02, 0)), e: E.in },
  { t: 30, b: HIT_B, h: HIT_H.clone().add(v(0, 0.02, 0)) },
  { t: 36.5, b: UP2_B, h: UP2_H, e: E.inOut },
  { t: 37.5, b: UP2_B.clone().add(v(0, 0.03, -0.03)), h: UP2_H.clone().add(v(0, 0.06, -0.08)) },
  { t: SLAM2, b: HIT_B, h: HIT_H, e: E.in },
  { t: 45, b: REC_B, h: REC_H, e: E.out },
  { t: LET_GO, b: REC_B.clone().add(v(0.02, 0.02, 0)), h: REC_H.clone().add(v(0.05, 0.04, 0)) },
];

const hammerAt = (t: number) => {
  if (t >= LET_GO) {
    // let go: it tips over and falls flat (CLUNK)
    const k = E.in(seg(t, LET_GO, CLUNK));
    const a = HAMMER[HAMMER.length - 1];
    const b = a.b.clone().lerp(LIE_B, k);
    const h = a.h.clone().lerp(LIE_H, k);
    b.y += Math.sin(k * Math.PI) * 0.25;
    h.y = Math.max(h.y + Math.sin(k * Math.PI) * 0.3, 0.05);
    const bb = bounce(t, CLUNK, 0.05, 5);
    b.y += bb;
    h.y += bb * 1.4;
    return { b, dir: h.sub(b).normalize() };
  }
  let i = 0;
  while (i + 1 < HAMMER.length && HAMMER[i + 1].t <= t) i++;
  const A = HAMMER[i];
  const B = HAMMER[Math.min(i + 1, HAMMER.length - 1)];
  const k = A === B ? 0 : (B.e ?? E.sine)(clamp((t - A.t) / (B.t - A.t)));
  const b = A.b.clone().lerp(B.b, k);
  const h = A.h.clone().lerp(B.h, k);
  return { b, dir: h.sub(b).normalize() };
};

// ---------------------------------------------------------------- the tyre
const tyreAt = (t: number) => {
  const pos = TYRE_AT.clone();
  let squash = 1;
  let rx = 0;
  let rz = 0;
  if (t >= SLAM1 && t < SLAM2) {
    squash = 1 - 0.14 * Math.exp(-(t - SLAM1) / 2) * Math.cos(((t - SLAM1) / 5) * Math.PI);
    pos.y += bounce(t, SLAM1, 0.05, 5);
  }
  if (t >= SLAM2) {
    const yk: Key[] = [[SLAM2, TYRE_H], [48.5, 4.75, E.out], [51.5, 4.85], [RINGER, TYRE_H, E.in]];
    pos.y = keys(yk, t);
    pos.z = lerp(TYRE_AT.z, ME.z, E.sine(seg(t, SLAM2, 60)));
    rx = -Math.PI * 4 * E.out(seg(t, SLAM2, 64));
    squash = t < SLAM2 + 3 ? 1 - 0.25 * Math.sin(seg(t, SLAM2, SLAM2 + 3) * Math.PI) : 1;
    if (t > RINGER) {
      pos.y += bounce(t, RINGER, 0.07, 6);
      // rocks like a dropped ring settling
      const w = Math.exp(-(t - RINGER) / 7);
      rx += 0.08 * w * Math.sin((t - RINGER) * 0.9);
      rz = 0.08 * w * Math.cos((t - RINGER) * 0.9);
    }
  }
  return { pos, squash, rx, rz };
};

// ---------------------------------------------------------------- body
const depthKeys: Key[] = [[0, 0.58], [9, 0.58], [18, 0.6], [SLAM1, 0.5, E.in], [26, 0.54], [30, 0.56], [36.5, 0.61], [SLAM2, 0.48, E.in], [45, 0.56], [UHOH, 0.6], [62, 0.6], [RINGER, 0.54, E.in], [72, 0.6], [FLEX, 0.56], [86, 0.6]];
const leanKeys: Key[] = [[0, 0.12], [9, 0.12], [18, -0.22], [SLAM1, 0.55, E.in], [26, 0.4], [30, 0.3], [36.5, -0.28], [SLAM2, 0.6, E.in], [45, -0.08, E.out], [UHOH, -0.1], [62, -0.05], [RINGER, 0.12], [72, 0], [FLEX, -0.04]];
const heelKeys: Key[] = [[0, 0], [33, 0], [36.5, 0.04, E.out], [SLAM2 - 1, 0], [135, 0]];
const pzKeys: Key[] = [[0, ME.z], [SLAM2, ME.z], [44, ME.z - 0.12, E.out], [52, ME.z - 0.04], [62, ME.z]];
const headPitch: Key[] = [[0, 0.1], [9, 0.1], [18, -0.15], [SLAM1, 0.3], [30, 0.2], [36.5, -0.2], [SLAM2, 0.3], [43, -0.4], [48, -0.62], [UHOH, -0.55], [62, -0.6], [66, -0.2], [RINGER, 0.25], [72, 0.05], [FLEX, 0.02]];

const P: Record<string, ArmPose> = {
  uhoh: { at: [0.34, 1.12, 0.16], axis: [0, 1, 0], pole: [1, -0.3, -0.2], shape: 'open', palm: [0, 0.2, 1] },
  squeeze: { at: [0.11, 1.3, 0.02], axis: [0, 1, 0], pole: [1, 0, -0.2], shape: 'open', palm: [-1, 0, 0] },
  hang: ARMS.hang,
  flex: ARMS.flexBig,
};
const freeArms = armTrack([[LET_GO, P.hang, 2], [UHOH, P.uhoh, 4], [60, P.squeeze, 4], [RINGER + 3, P.hang, 5], [FLEX - 3, P.flex, 4]]);

const face = faceTimeline(
  [[0, 'cocky'], [9, 'focus'], [17, 'grit'], [SLAM1, 'pop'], [26, 'focus'], [33, 'strain'], [SLAM2, 'pop'], [44, 'wow'], [UHOH, 'panic'], [RINGER, 'wince'], [72, 'happy'], [77, 'grin'], [100, 'cocky'], [112, 'grin']],
  { blinks: [5, 28, 75, 118], wink: { t: 104, side: 'R' } },
);

const body = (t: number, camAz: number): BodySpec => {
  const heel = keys(heelKeys, t);
  const pelvis = v(0, SK.ankleH + heel + keys(depthKeys, t) + SK.hipDrop, keys(pzKeys, t));
  const lean = keys(leanKeys, t);
  const torso: [number, number, number] = [lean, t < UHOH ? -0.08 : 0, 0];
  const footPitch = Math.asin(clamp(heel / 0.11, 0, 0.9));
  const foot = (s: 1 | -1): FootSpec => ({ at: v(s * 0.22, SK.ankleH + heel, pelvis.z + 0.04), yaw: s * 0.16, pitch: footPitch, pole: v(s * 0.35, 0, 1).normalize() });
  let hands: { L: HandSpec; R: HandSpec };
  if (t < LET_GO) {
    const { b, dir } = hammerAt(t);
    hands = {
      L: { at: b.clone().addScaledVector(dir, 0.06), axis: dir.clone(), shape: 'grip', pole: v(1, -0.6, -0.3).normalize() },
      R: { at: b.clone().addScaledVector(dir, 0.3), axis: dir.clone(), shape: 'grip', pole: v(-1, -0.6, -0.3).normalize() },
    };
  } else {
    const L = handFrom(pelvis, torso, freeArms(t), 1);
    const R = handFrom(pelvis, torso, freeArms(t), -1);
    const k = E.out(seg(t, LET_GO, LET_GO + 4));
    if (k < 1) {
      const { b, dir } = hammerAt(LET_GO);
      L.at.lerp(b.clone().addScaledVector(dir, 0.06), 1 - k);
      R.at.lerp(b.clone().addScaledVector(dir, 0.3), 1 - k);
    }
    hands = { L, R };
  }
  const look = E.sine(seg(t, 86, 92)) * (1 - E.sine(seg(t, 124, 130)));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = t > 43 && t < 66 ? [0, -0.3] : la.gaze;
  return {
    pelvis,
    torso,
    shrug: t > 58 && t < RINGER + 2 ? 0.7 : 0.25,
    hands,
    feet: { L: foot(1), R: foot(-1) },
    head: [keys(headPitch, t) - lean * 0.5, la.yaw + noise1(t * 0.05, 3) * 0.02, noise1(t * 0.06, 5) * 0.02],
    face: fc,
    pump: 1 + 0.08 * E.out(seg(t, FLEX - 2, FLEX + 4)),
  };
};

// ---------------------------------------------------------------- props
const Hammer: React.FC<{ b: THREE.Vector3; dir: THREE.Vector3 }> = ({ b, dir }) => {
  const M = winterMats();
  // a new quaternion every frame: R3F only re-applies a prop when it is a different object
  const q = new THREE.Quaternion();
  const Y = dir.clone().normalize();
  const X = v(1, 0, 0).addScaledVector(Y, -Y.x);
  if (X.lengthSq() < 1e-4) X.set(0, 0, 1);
  X.normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#B98252', roughness: 0.55 }), []);
  return (
    <group position={b} quaternion={q}>
      <mesh material={wood} position={[0, HANDLE / 2, 0]} castShadow>
        <cylinderGeometry args={[0.017, 0.02, HANDLE, 12]} />
      </mesh>
      <mesh material={M.rubber} position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, 0.34, 12]} />
      </mesh>
      <mesh material={M.steel} position={[0, HANDLE - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.1, 0.24]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={M.chrome} position={[0, HANDLE - 0.03, s * 0.125]} castShadow>
          <boxGeometry args={[0.104, 0.104, 0.012]} />
        </mesh>
      ))}
      <mesh material={M.purple} position={[0, HANDLE - 0.03, 0]}>
        <boxGeometry args={[0.104, 0.104, 0.04]} />
      </mesh>
    </group>
  );
};

const Tyre: React.FC<{ pos: THREE.Vector3; squash: number; rx: number; rz: number }> = ({ pos, squash, rx, rz }) => {
  const parts = useMemo(() => {
    const rubber = new THREE.MeshStandardMaterial({ color: '#43434D', roughness: 0.74 });
    const tread = new THREE.MeshStandardMaterial({ color: '#4C4C57', roughness: 0.8 });
    const ring = new THREE.TorusGeometry(TYRE_R, TYRE_T, 24, 96).rotateX(Math.PI / 2).scale(1, 0.85, 1);
    const lug = new THREE.BoxGeometry(0.06, 0.13, 0.07);
    const lugs = new THREE.InstancedMesh(lug, tread, 48);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = TYRE_R + TYRE_T - 0.02;
      m.makeRotationY(-a + (i % 2 ? 0.15 : -0.15));
      m.setPosition(Math.cos(a) * (r - 0.015), 0, Math.sin(a) * (r - 0.015));
      lugs.setMatrixAt(i, m);
    }
    lugs.castShadow = true;
    return { rubber, ring, lugs };
  }, []);
  return (
    <group position={pos} rotation={[rx, 0, rz]} scale={[1 + (1 - squash) * 0.4, squash, 1 + (1 - squash) * 0.4]}>
      <mesh geometry={parts.ring} material={parts.rubber} castShadow receiveShadow />
      <primitive object={parts.lugs} />
    </group>
  );
};

type Props = { b: THREE.Vector3; dir: THREE.Vector3; tyre: ReturnType<typeof tyreAt> };

export const hammerTime: ClipDef<Props> = {
  id: 'gym-10-3d',
  set: 'winter',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 26], [SLAM1, 24], [SLAM2, 20], [48, 16], [RINGER, 10], [FLEX, 2], [96, -8], [135, -14]],
      y: [[0, 2.3], [SLAM1, 2.2], [SLAM2, 2.0], [46, 1.4], [52, 1.2], [58, 1.35], [RINGER, 1.45], [FLEX, 1.35], [96, 1.5], [135, 1.55]],
      dist: [[0, 4.4], [SLAM1, 4.3], [SLAM2, 4.4], [48, 5.0], [RINGER, 4.7], [FLEX, 4.3], [96, 5.6], [135, 5.9]],
      ty: [[0, 0.85], [SLAM1, 0.8], [SLAM2, 0.85], [46, 2.0], [51, 2.3], [58, 1.6], [RINGER, 1.1], [FLEX, 1.2], [96, 1.42], [135, 1.48]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0.55], [SLAM2, 0.5], [56, 0.1], [RINGER, -0.1], [135, -0.15]],
      fov: [[0, 38], [135, 38]],
    },
    hits: [[SLAM1, 0.5], [SLAM2, 1.0], [CLUNK, 0.25], [RINGER, 0.8], [FLEX, 0.4]],
    punch: [SLAM2, RINGER],
  },
  state: ({ t, cam }) => {
    const h = hammerAt(t);
    return { body: body(t, cam.az), props: { b: h.b, dir: h.dir, tyre: tyreAt(t) } };
  },
  Props: ({ props }) => (
    <>
      <Hammer b={props.b} dir={props.dir} />
      <Tyre pos={props.tyre.pos} squash={props.tyre.squash} rx={props.tyre.rx} rz={props.tyre.rz} />
    </>
  ),
  bursts: [
    { burst: { t0: SLAM1, n: 34, speed: 1.0, up: 0.2, drag: 3.2, life: 18, size: 0.05, grow: 2.6, alpha: 0.18 }, at: () => [HIT_H.clone()] },
    { burst: { t0: SLAM2, n: 80, speed: 1.8, up: 0.3, drag: 2.8, life: 22, size: 0.05, grow: 3, alpha: 0.2 }, at: () => [HIT_H.clone()] },
    { burst: { t0: SLAM2, n: 60, speed: 2.2, up: 0.3, drag: 2.6, life: 16, size: 0.025, grow: 1.2, alpha: 0.7, tint: [2.6, 2.2, 1.3] }, at: () => [HIT_H.clone().add(v(0, 0.05, 0))] },
    { burst: { t0: CLUNK, n: 20, speed: 0.7, up: 0.1, drag: 3, life: 14, size: 0.05, grow: 2.2, alpha: 0.14, floor: true }, at: () => [LIE_H.clone().setY(0.03)] },
    { burst: { t0: RINGER, n: 70, speed: 1.6, up: 0.12, drag: 2.8, life: 22, size: 0.06, grow: 2.8, alpha: 0.2, floor: true }, at: () => [0, 1, 2, 3, 4, 5].map((i) => v(ME.x + Math.cos(i) * 0.95, 0.03, ME.z + Math.sin(i) * 0.95)) },
  ],
  glints: (_s, pose, props) => [
    { f: 6, at: props.b.clone().addScaledVector(props.dir, HANDLE - 0.03).add(v(0.06, 0.05, 0.05)), size: 0.3 },
    { f: FLEX + 1, at: pose.L.grip.clone().add(v(0.03, 0.07, 0.06)), size: 0.4 },
    { f: 106, at: pose.R.grip.clone().add(v(-0.03, 0.07, 0.06)), size: 0.32 },
  ],
  card: { kind: 'ribbon', title: 'HAMMER TIME', start: 96, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const bwang = hit(f, SLAM2, 5);
    const ring = hit(f, RINGER, 4);
    return { bloom: 0.85 + 0.4 * hit(f, SLAM1, 3) + 0.9 * bwang + 0.6 * ring, aberration: 0.3 * hit(f, SLAM1, 3) + 1.0 * bwang + 0.6 * ring, exposure: 1 + 0.12 * bwang, sun: 1 + 0.25 * hit(f, FLEX, 6) };
  },
};
