import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { E, lerp, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { glintTexture } from '../kit/textures';
import { BodySpec, FootSpec, Pose, SK, faceTimeline, headPoint, lookAt } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';
import { winterMats } from '../sets/WinterGym';

// gym-7-3d · Box Jump (BoxJump.tsx), Winter Arc Gym: every time he jumps,
// another plyo box slides in under him. Three hops (9/25/41, landing 20/36/52),
// then a monster jump (63) as three more boxes stack up; he BONKS the lamp
// (73), lands on the six-box tower anyway (81) and sticks it (88). Card 96.

const BOX_H = 0.4;
const HOPS = [
  { t0: 9, t1: 20 },
  { t0: 25, t1: 36 },
  { t0: 41, t1: 52 },
];
const BIG = 63;
const BONK = 73;
const LAND = 81;
const STUCK = 88;
const LAMP_Y = 4.5; // bottom of the shade
// when each box arrives under him (box i sits at height i * BOX_H)
const ARRIVE = [15, 31, 47, 66, 69, 72];

/** Parabola through (t0, h0) and (t1, h1) peaking at H. */
const arc = (t: number, t0: number, h0: number, t1: number, h1: number, H: number) => {
  const a = ((Math.sqrt(H - h0) + Math.sqrt(H - h1)) / (t1 - t0)) ** 2;
  const tp = t0 + Math.sqrt((H - h0) / a);
  return H - a * (t - tp) ** 2;
};

/** Height of his soles. */
const feetY = (t: number) => {
  for (let i = 0; i < HOPS.length; i++) {
    const { t0, t1 } = HOPS[i];
    if (t >= t0 && t <= t1) return arc(t, t0, i * BOX_H, t1, (i + 1) * BOX_H, (i + 1) * BOX_H + 0.34);
    if (t < t0) return i * BOX_H;
  }
  if (t < BIG) return 3 * BOX_H;
  if (t < BONK) return lerp(3 * BOX_H, 2.76, E.out(seg(t, BIG, BONK)));
  if (t < LAND) return lerp(2.76, 6 * BOX_H, E.in(seg(t, BONK + 0.5, LAND)));
  return 6 * BOX_H;
};

/** Leg extension (ankle to hip height): crouch before each take-off, tuck in the air, absorb the landing. */
const takeoffs = [...HOPS.map((h) => h.t0), BIG];
const landings = [...HOPS.map((h) => h.t1), LAND];
const legExt = (t: number) => {
  let d = 0.61;
  for (const t0 of takeoffs) {
    const prep = t0 === BIG ? 8 : 4;
    d -= (t0 === BIG ? 0.16 : 0.11) * E.sine(seg(t, t0 - prep, t0 - 1)) * (1 - E.out(seg(t, t0 - 1, t0 + 1)));
    d -= 0.1 * E.sine(seg(t, t0 + 1, t0 + 4)) * (1 - E.sine(seg(t, t0 + 5, t0 + 9)));
  }
  for (const t1 of landings) d -= (t1 === LAND ? 0.17 : 0.12) * Math.sin(seg(t, t1 - 1, t1 + (t1 === LAND ? 9 : 6)) * Math.PI);
  return d;
};

const P: Record<string, ArmPose> = {
  hang: ARMS.hang,
  back: { at: [0.3, -0.16, -0.34], axis: [0, 0, -1], pole: [1, 0.3, 0.3], shape: 'open', palm: [-1, 0, 0] },
  up: ARMS.up,
  wide: { ...ARMS.wide, at: [0.8, 0.46, 0.14] },
  head: { at: [0.17, 0.98, 0.1], axis: [0, 0, 1], pole: [1, 0.25, -0.2], shape: 'open', palm: [-1, -0.3, 0] },
  victory: { at: [0.56, 1.14, 0.08], axis: [0, 1, 0], pole: [1, -0.2, -0.3], shape: 'fist' },
  flex: ARMS.flex,
};
const arms = armTrack([
  [0, P.hang],
  ...HOPS.flatMap((h) => [[h.t0 - 4, P.back, 3], [h.t0, P.up, 2], [h.t0 + 5, P.wide, 4], [h.t1 + 2, P.hang, 5]] as [number, ArmPose, number][]),
  [BIG - 8, P.back, 6],
  [BIG, P.up, 2],
  [BONK, P.head, 2],
  [LAND - 2, P.wide, 3],
  [STUCK - 2, P.victory, 3],
  [104, P.flex, 6],
]);

const face = faceTimeline(
  [[0, 'focus'], [5, 'grit'], [9, 'pop'], [14, 'happy'], [20, 'grin'], [24, 'grit'], [25, 'pop'], [30, 'wow'], [36, 'grin'], [40, 'grit'], [41, 'pop'], [46, 'wow'], [52, 'happy'], [56, 'focus'], [59, 'grit'], [BIG, 'pop'], [68, 'wow'], [BONK, 'wince'], [78, 'panic'], [LAND, 'grit'], [STUCK - 2, 'grin'], [104, 'cocky'], [112, 'grin']],
  { blinks: [3, 33, 58, 98], wink: { t: 118, side: 'R' }, bob: 106 },
);

const body = (t: number, camAz: number): BodySpec => {
  const fy = feetY(t);
  const j = landings.findIndex((t1, i) => t > takeoffs[i] && t < t1);
  const airborne = j >= 0;
  const pelvis = v(0, fy + SK.ankleH + legExt(t) + SK.hipDrop, 0);
  const wob = t > LAND ? Math.sin((t - LAND) * 0.8) * Math.exp(-(t - LAND) / 6) : 0;
  pelvis.x += wob * 0.03;
  const lean = 0.08 + (0.61 - legExt(t)) * 1.6 + (t > BONK && t < LAND ? 0.15 : 0);
  const torso: [number, number, number] = [lean, 0, -wob * 0.15];
  const tuck = airborne ? 1 - Math.abs(2 * seg(t, takeoffs[j], landings[j]) - 1) : 0;
  const foot = (s: 1 | -1): FootSpec => ({
    at: v(s * 0.16, fy + SK.ankleH + tuck * 0.06, tuck * 0.12),
    yaw: s * 0.12,
    pitch: tuck * 0.55,
    pole: v(s * 0.3, 0.1, 1).normalize(),
  });
  const a = arms(t);
  const look = E.sine(seg(t, 92, 97)) * (1 - E.sine(seg(t, 124, 130)));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = t > BIG - 2 && t < BONK ? [0, -0.3] : la.gaze;
  const headPitch = (t > BIG && t < BONK ? -0.3 : 0.05) + (t > BONK && t < BONK + 5 ? 0.35 * Math.sin(seg(t, BONK, BONK + 5) * Math.PI) : 0);
  return {
    pelvis,
    torso,
    shrug: t > BONK && t < LAND ? 0.8 : 0.2,
    hands: { L: handFrom(pelvis, torso, a, 1), R: handFrom(pelvis, torso, a, -1) },
    feet: { L: foot(1), R: foot(-1) },
    head: [headPitch - lean * 0.5, la.yaw + noise1(t * 0.05, 3) * 0.02, wob * 0.12 + noise1(t * 0.06, 5) * 0.015],
    face: fc,
    pump: 1 + 0.06 * E.out(seg(t, 104, 110)),
  };
};

// ---------------------------------------------------------------- props
const boxX = (i: number, t: number) => {
  const a = ARRIVE[i];
  const k = E.out(seg(t, a - 6, a));
  const settle = t > a ? 0.03 * Math.sin(((t - a) / 4) * Math.PI) * Math.exp(-(t - a) / 3) : 0;
  return lerp(3.4, 0, k) - settle;
};

const Boxes: React.FC<{ t: number }> = ({ t }) => {
  const M = winterMats();
  const parts = useMemo(
    () => ({
      box: new RoundedBoxGeometry(0.76, BOX_H - 0.012, 0.62, 3, 0.03),
      top: new RoundedBoxGeometry(0.7, 0.02, 0.56, 2, 0.008),
      wood: new THREE.MeshStandardMaterial({ color: '#C08A57', roughness: 0.6 }),
    }),
    [],
  );
  return (
    <>
      {ARRIVE.map((_, i) => {
        const x = boxX(i, t);
        if (x > 3.3) return null;
        return (
          <group key={i} position={[x, i * BOX_H + BOX_H / 2, 0]} rotation-y={(i % 2 ? 1 : -1) * 0.04}>
            <mesh geometry={parts.box} material={parts.wood} castShadow receiveShadow />
            <mesh geometry={parts.top} material={i % 2 ? M.purple : M.lavender} position={[0, BOX_H / 2 - 0.004, 0]} receiveShadow />
            <mesh position={[0, 0, 0.312]} material={M.purple}>
              <planeGeometry args={[0.5, 0.06]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

const Lamp: React.FC<{ t: number }> = ({ t }) => {
  const M = winterMats();
  const shade = useMemo(() => new THREE.CylinderGeometry(0.16, 0.42, 0.34, 32, 1, true), []);
  const swing = t > BONK ? 0.42 * Math.sin(((t - BONK) / 11) * Math.PI * 2) * Math.exp(-(t - BONK) / 16) : 0;
  const cord = 6.2 - (LAMP_Y + 0.34);
  return (
    <group position={[0, 6.2, 0]} rotation={[swing * 0.8, 0, swing * 0.35]}>
      <mesh position={[0, -cord / 2, 0]} material={M.steel}>
        <cylinderGeometry args={[0.008, 0.008, cord, 6]} />
      </mesh>
      <mesh geometry={shade} material={M.shade} position={[0, -cord - 0.17, 0]} castShadow />
      <mesh position={[0, -cord - 0.26, 0]} material={M.bulb}>
        <sphereGeometry args={[0.07, 16, 12]} />
      </mesh>
      <pointLight position={[0, -cord - 0.4, 0]} intensity={2.2} distance={5} decay={1.8} color="#FFD8A8" />
    </group>
  );
};

const Dizzy: React.FC<{ t: number; head: THREE.Vector3 }> = ({ t, head }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: glintTexture(), color: new THREE.Color(3.2, 2.6, 0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), []);
  const k = seg(t, BONK, BONK + 3) * (1 - seg(t, 86, 90));
  if (k <= 0) return null;
  return (
    <>
      {[0, 1, 2].map((i) => {
        const a = t * 0.45 + (i * Math.PI * 2) / 3;
        return <sprite key={i} material={mat} position={[head.x + Math.cos(a) * 0.28, head.y + 0.24 + Math.sin(a * 2) * 0.03, head.z + Math.sin(a) * 0.28]} scale={[0.34 * k, 0.34 * k, 1]} />;
      })}
    </>
  );
};

type Props = { t: number };

export const boxJump: ClipDef<Props> = {
  id: 'gym-7-3d',
  set: 'winter',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 20], [20, 16], [36, 12], [52, 8], [BIG, 4], [BONK, 0], [LAND, -6], [96, -12], [135, -16]],
      y: [[0, 1.15], [20, 1.35], [36, 1.6], [52, 1.9], [BIG, 2.1], [BONK, 2.4], [LAND, 2.45], [96, 2.6], [135, 2.65]],
      dist: [[0, 4.3], [20, 4.7], [36, 5.0], [52, 5.25], [BIG, 5.6], [BONK, 6.1], [LAND, 5.9], [96, 6.4], [135, 6.6]],
      ty: [[0, 1.1], [20, 1.5], [36, 1.9], [52, 2.3], [BIG, 2.65], [BONK, 3.25], [LAND, 3.25], [96, 3.35], [135, 3.4]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0], [135, 0]],
      fov: [[0, 38], [135, 38]],
    },
    hits: [[20, 0.25], [36, 0.25], [52, 0.3], [BONK, 0.9], [LAND, 0.7], [STUCK, 0.3]],
    punch: [BONK],
  },
  state: ({ t, cam }) => ({ body: body(t, cam.az), props: { t } }),
  Props: ({ props, pose }: { props: Props; pose: Pose }) => (
    <>
      <Boxes t={props.t} />
      <Lamp t={props.t} />
      <Dizzy t={props.t} head={headPoint(pose, v(0, 0.05, 0))} />
    </>
  ),
  bursts: [
    ...HOPS.map((h, i) => ({ burst: { t0: h.t1, n: 22, speed: 0.8, up: 0.1, drag: 3.2, life: 16, size: 0.05, grow: 2.4, alpha: 0.14, floor: true }, at: () => [v(-0.3, (i + 1) * BOX_H + 0.02, 0.2), v(0.3, (i + 1) * BOX_H + 0.02, 0.2)] })),
    { burst: { t0: BONK, n: 50, speed: 1.6, up: 0.2, drag: 2.8, life: 18, size: 0.03, grow: 1.2, alpha: 0.7, tint: [2.6, 2.2, 1.2] as [number, number, number] }, at: () => [v(0, LAMP_Y, 0)] },
    { burst: { t0: LAND, n: 44, speed: 1.2, up: 0.1, drag: 3, life: 20, size: 0.05, grow: 2.6, alpha: 0.18, floor: true }, at: () => [v(-0.3, 6 * BOX_H + 0.02, 0.2), v(0.3, 6 * BOX_H + 0.02, 0.2)] },
  ],
  glints: (_s, pose) => [
    { f: STUCK + 1, at: pose.L.grip.clone().add(v(0.03, 0.07, 0.05)), size: 0.38 },
    { f: 106, at: pose.R.grip.clone().add(v(-0.03, 0.07, 0.05)), size: 0.32 },
  ],
  card: { kind: 'ribbon', title: 'BOX JUMP', start: 96, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const bonk = hit(f, BONK, 4);
    const land = hit(f, LAND, 4);
    return { bloom: 0.85 + 0.8 * bonk + 0.5 * land, aberration: 0.9 * bonk + 0.5 * land, exposure: 1 + 0.12 * bonk, sun: 1 + 0.25 * hit(f, STUCK, 6) };
  },
};

