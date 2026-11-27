import React, { useMemo } from 'react';
import * as THREE from 'three';
import { E, Key, keys, lerp, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { bounce, toss } from '../kit/props';
import { BodySpec, HandSpec, Pose, SK, faceTimeline, headPoint, lookAt, plantedFeet, solve } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';
import { winterMats } from '../sets/WinterGym';

// gym-9-3d · Gains Shake (GainsShake.tsx), Winter Arc Gym: shake shake shake
// (6-34), pop the cap (38), chug the whole thing (45-64), burp (66), toss the
// empty over his shoulder (72) as the muscles inflate (70), double biceps
// with a protein moustache (82). Card at 96.

const POP = 38;
const CHUG = 45;
const CHUG_END = 64;
const BURP = 66;
const PUMP = 70;
const TOSS = 72;
const FLEX = 82;
const HALF = 0.11; // half the shaker's height
const LANDS = v(-1.05, 0.058, -1.25);
const LAND_T = 86;

const P: Record<string, ArmPose> = {
  hang: ARMS.hang,
  hips: ARMS.hips,
  show: { at: [0.27, 0.44, 0.36], axis: [0, 1, 0], pole: [1, -0.6, -0.1], shape: 'grip' },
  shake: { at: [0.3, 0.56, 0.3], axis: [0, 1, 0], pole: [1, -0.5, -0.2], shape: 'grip' },
  lid: { at: [-0.19, 0.64, 0.37], axis: [0, 0, 1], pole: [1, -0.4, -0.3], shape: 'point' },
  flex: ARMS.flexBig,
  back: { at: [0.34, 0.98, -0.2], axis: [0, 1, 0], pole: [1, 0.2, -0.3], shape: 'open', palm: [0, 0.2, -1] },
};
// right hand (mirrored by handFrom), left hand
const rightArm = armTrack([[0, P.show], [5, P.shake, 2], [34, P.show, 3], [TOSS - 3, P.back, 3], [TOSS + 2, P.hang, 5], [FLEX - 3, P.flex, 4]]);
const leftArm = armTrack([[0, P.hips], [33, P.lid, 3], [POP + 2, P.hips, 5], [PUMP - 2, P.hang, 4], [FLEX - 3, P.flex, 4]]);

const face = faceTimeline(
  [[0, 'cocky'], [6, 'grit'], [13, 'grin'], [26, 'focus'], [33, 'grit'], [POP, 'wow'], [41, 'happy'], [CHUG, 'kiss'], [CHUG_END, 'happy'], [BURP, 'wow'], [69, 'strain'], [77, 'pop'], [FLEX, 'grin'], [100, 'cocky'], [112, 'grin']],
  { blinks: [3, 42, 90, 120], wink: { t: 104, side: 'R' } },
);
const headPitchKeys: Key[] = [[0, 0.06], [6, 0.1], [34, 0.06], [CHUG - 3, 0.02], [CHUG + 2, -0.48, E.out], [CHUG_END, -0.56], [BURP, -0.08, E.out], [BURP + 3, 0.06], [PUMP, -0.05], [FLEX, 0.04]];
const leanKeys: Key[] = [[0, 0.02], [CHUG, 0.0], [CHUG + 3, -0.12], [CHUG_END, -0.15], [BURP, 0.02], [PUMP, 0.06], [FLEX, -0.04]];

const shakeOffset = (t: number) => (t > 5 && t < 34 ? 0.085 * Math.sin(((t - 5) / 4) * Math.PI * 2) * E.sine(seg(t, 5, 8)) * (1 - E.sine(seg(t, 31, 34))) : 0);

/** The body without the drink: arms from the tracks. */
const baseBody = (t: number, camAz: number): BodySpec => {
  const bob = Math.abs(shakeOffset(t)) * 0.08;
  const pelvis = v(0, SK.standY - bob + (t > PUMP ? 0.01 * E.out(seg(t, PUMP, PUMP + 8)) : 0), 0);
  const lean = keys(leanKeys, t);
  const torso: [number, number, number] = [lean, t < 34 ? 0.06 * Math.sin(t * 0.8) * seg(t, 5, 9) : 0, 0];
  const R = handFrom(pelvis, torso, rightArm(t), -1);
  R.at.y += shakeOffset(t);
  const look = E.sine(seg(t, 0, 2)) * (1 - E.sine(seg(t, 5, 8))) + E.sine(seg(t, 88, 93)) * (1 - E.sine(seg(t, 124, 130)));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = t < 34 && t > 6 ? [-0.15, 0.08] : t > CHUG && t < CHUG_END ? [0, -0.2] : la.gaze;
  const pump = 1 + 0.36 * E.out(seg(t, PUMP, PUMP + 9));
  return {
    pelvis,
    torso,
    shrug: 0.15 + (t > PUMP ? 0.4 * E.out(seg(t, PUMP, PUMP + 6)) : 0),
    hands: { L: handFrom(pelvis, torso, leftArm(t), 1), R },
    feet: plantedFeet(0.17),
    head: [keys(headPitchKeys, t) - lean * 0.4, la.yaw + (t < 34 ? -0.12 : 0) + noise1(t * 0.05, 3) * 0.02, noise1(t * 0.06, 5) * 0.02 + (t > 6 && t < 34 ? 0.05 * Math.sin(t * 1.57) : 0)],
    face: fc,
    pump,
  };
};

/** Drinking: the spout at his mouth, bottom tipping up as he empties it. */
const drink = (b: BodySpec, t: number) => {
  const pose = solve(b);
  const mouth = headPoint(pose, v(0, -0.13, 0.27));
  const tip = lerp(0.35, 1.1, E.sine(seg(t, CHUG, CHUG_END)));
  const axis = v(0.12, -Math.sin(tip), -Math.cos(tip)).normalize(); // bottom -> spout
  const center = mouth.clone().addScaledVector(axis, -(HALF + 0.04));
  return { center, axis };
};

const state = (t: number, camAz: number) => {
  let b = baseBody(t, camAz);
  let center: THREE.Vector3;
  let axis: THREE.Vector3;
  const w = E.sine(seg(t, CHUG - 4, CHUG)) * (1 - E.sine(seg(t, CHUG_END, CHUG_END + 4)));
  const held = (bb: BodySpec) => ({ center: bb.hands.R.at.clone().addScaledVector(bb.hands.R.axis, 0.03), axis: bb.hands.R.axis.clone() });
  if (t < TOSS) {
    const h = held(b);
    center = h.center;
    axis = h.axis;
    if (w > 0) {
      const d = drink(b, t);
      center = center.lerp(d.center, w);
      axis = axis.lerp(d.axis, w).normalize();
      const R: HandSpec = { at: center.clone().addScaledVector(axis, -0.03), axis: axis.clone(), shape: 'grip', pole: v(-1, -0.5, -0.1).normalize() };
      b = { ...b, hands: { ...b.hands, R } };
    }
  } else {
    // tossed over the shoulder
    const b0 = baseBody(TOSS, camAz);
    const h = held(b0);
    center = toss(h.center, LANDS, TOSS, LAND_T, t);
    center.y += bounce(t, LAND_T, 0.08, 6);
    const spin = (t - TOSS) * 0.55;
    axis = t < LAND_T ? v(Math.sin(spin), Math.cos(spin), 0.3 * Math.sin(spin * 0.7)).normalize() : v(1, 0.02, 0.35).normalize();
    if (t >= LAND_T) center.y = Math.max(center.y, 0.058);
  }
  const lid = -2.3 * E.back(seg(t, POP - 1, POP + 3));
  return { body: b, props: { center, axis, lid, t } };
};

// ---------------------------------------------------------------- props
type Props = { center: THREE.Vector3; axis: THREE.Vector3; lid: number; t: number };

const Shaker: React.FC<{ center: THREE.Vector3; axis: THREE.Vector3; lid: number }> = ({ center, axis, lid }) => {
  const M = winterMats();
  // a new quaternion every frame: R3F only re-applies a prop when it is a different object
  const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), axis.clone().normalize());
  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: '#8B6FF0', roughness: 0.25, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      cap: new THREE.MeshStandardMaterial({ color: '#23232C', roughness: 0.45 }),
      white: new THREE.MeshStandardMaterial({ color: '#F4F2F8', roughness: 0.5 }),
    }),
    [],
  );
  return (
    <group position={center} quaternion={q}>
      <mesh material={mats.body} castShadow receiveShadow>
        <cylinderGeometry args={[0.058, 0.052, 2 * HALF - 0.03, 32]} />
      </mesh>
      <mesh material={mats.white} position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.0585, 0.0565, 0.035, 32]} />
      </mesh>
      <mesh material={mats.cap} position={[0, HALF - 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.061, 0.061, 0.032, 32]} />
      </mesh>
      <mesh material={M.purple} position={[0, HALF + 0.008, 0.02]}>
        <cylinderGeometry args={[0.014, 0.016, 0.022, 16]} />
      </mesh>
      {/* the flip lid, hinged at the back */}
      <group position={[0, HALF + 0.006, -0.04]} rotation-x={lid}>
        <mesh material={mats.cap} position={[0, 0.006, 0.05]} castShadow>
          <boxGeometry args={[0.05, 0.012, 0.07]} />
        </mesh>
      </group>
    </group>
  );
};

const Moustache: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#F1E4CF', roughness: 0.65 }), []);
  const k = E.back(seg(t, CHUG_END - 1, CHUG_END + 3));
  if (k <= 0) return null;
  const at = headPoint(pose, v(0, -0.092, 0.238));
  const q = pose.torsoQ.clone().multiply(pose.headQ);
  return (
    <group position={at} quaternion={q} scale={[k, k, k]}>
      {[1, -1].map((s) => (
        <mesh key={s} material={mat} position={[s * 0.04, -0.004, 0]} rotation={[0.25, 0, -s * 0.28]} scale={[0.055, 0.017, 0.022]} castShadow>
          <sphereGeometry args={[1, 20, 12]} />
        </mesh>
      ))}
    </group>
  );
};

export const gainsShake: ClipDef<Props> = {
  id: 'gym-9-3d',
  set: 'winter',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 22], [20, 16], [POP, 10], [CHUG, 4], [CHUG_END, -4], [PUMP, -6], [FLEX, -10], [96, -14], [135, -18]],
      y: [[0, 1.35], [POP, 1.4], [CHUG, 1.45], [CHUG_END, 1.4], [PUMP, 1.25], [FLEX, 1.2], [96, 1.4], [135, 1.5]],
      dist: [[0, 3.0], [20, 3.1], [POP, 3.0], [CHUG, 2.8], [CHUG_END, 3.1], [PUMP, 3.6], [FLEX, 4.4], [96, 5.4], [135, 5.8]],
      ty: [[0, 1.3], [POP, 1.35], [CHUG, 1.42], [CHUG_END, 1.35], [PUMP, 1.28], [FLEX, 1.32], [96, 1.42], [135, 1.48]],
      tx: [[0, -0.18], [40, -0.12], [CHUG_END, 0], [135, 0]],
      tz: [[0, 0.1], [135, 0]],
      fov: [[0, 38], [135, 36]],
    },
    hits: [[POP, 0.4], [BURP, 0.2], [PUMP + 3, 0.6], [FLEX, 0.7], [LAND_T, 0.1]],
    punch: [FLEX],
  },
  state: ({ t, cam }) => state(t, cam.az),
  Props: ({ props, pose }) => (
    <>
      <Shaker center={props.center} axis={props.axis} lid={props.lid} />
      <Moustache pose={pose} t={props.t} />
    </>
  ),
  bursts: [
    { burst: { t0: POP, n: 40, speed: 0.9, up: 0.5, drag: 3.2, life: 20, size: 0.03, grow: 3.2, alpha: 0.35, tint: [1.4, 1.25, 1.05] }, at: (_p, props) => [props.center.clone().addScaledVector(props.axis, HALF + 0.03)] },
    { burst: { t0: BURP, n: 26, speed: 0.6, up: 0.2, drag: 3, life: 18, size: 0.04, grow: 3, alpha: 0.18 }, at: (p) => [headPoint(p, v(0, -0.13, 0.32))] },
    { burst: { t0: FLEX, n: 90, speed: 1.6, up: 0.3, drag: 2.8, life: 22, size: 0.035, grow: 1.2, alpha: 0.6, tint: [2.4, 1.9, 1.0] }, at: (p) => [p.L.grip, p.R.grip] },
    { burst: { t0: LAND_T, n: 14, speed: 0.6, up: 0.1, drag: 3, life: 14, size: 0.04, grow: 2.2, alpha: 0.12, floor: true }, at: () => [LANDS.clone()] },
  ],
  glints: (_s, pose, props) => [
    { f: 3, at: props.center.clone().add(v(0.03, 0.05, 0.06)), size: 0.3 },
    { f: FLEX + 1, at: pose.L.grip.clone().add(v(0.03, 0.07, 0.06)), size: 0.4 },
    { f: FLEX + 4, at: pose.R.grip.clone().add(v(-0.03, 0.07, 0.06)), size: 0.34 },
  ],
  card: { kind: 'ribbon', title: 'GAINS SHAKE', start: 96, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const pump = hit(f, PUMP + 3, 6);
    const flex = hit(f, FLEX, 4);
    return { bloom: 0.85 + 0.6 * pump + 0.6 * flex + 0.3 * hit(f, POP, 3), aberration: 0.5 * pump + 0.6 * flex, exposure: 1 + 0.1 * flex, sun: 1 + 0.25 * flex };
  },
};
