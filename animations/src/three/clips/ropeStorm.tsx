import React, { useMemo } from 'react';
import * as THREE from 'three';
import { E, Key, clamp, keys, lerp, noise1, seg, smooth } from '../kit/math';
import { ARMS, handFrom, v } from '../kit/moves';
import { BodySpec, FootSpec, HandSpec, SK, faceTimeline, lookAt } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';
import { winterMats } from '../sets/WinterGym';

// gym-8-3d · Rope Storm (RopeStorm.tsx), Winter Arc Gym: battle ropes. The
// waves get bigger and faster (storm at 46), a double slam (62) sends a
// monster wave down the ropes straight into the camera (KA-WHOOM, 70); he
// drops the ropes (74), hands on hips (82). Card at 94.

const STORM = 46;
const SLAM = 62;
const HIT = 70;
const DROP = 74;
const PROUD = 82;
const ANCHOR = v(0, 0.12, 5.2);
const HAND_Z = 0.38;
const TRAVEL = 13; // frames for a wave to run the length of the rope
const R = 0.026;

// ---------------------------------------------------------------- hands
/** Wave period in frames: slow and steady, faster, then the storm. */
const period = (k: number) => lerp(11, 7.5, smooth(seg(k, 4, STORM))) - 1.5 * smooth(seg(k, STORM - 2, STORM + 2));
// accumulated phase at whole frames, so the speed-up never jumps
const PHASE: number[] = [0];
for (let k = 0; k < 70; k++) PHASE.push(PHASE[k] + (Math.PI * 2) / period(k));
const phaseAt = (t: number) => {
  const k = clamp(Math.floor(t), 0, 68);
  return lerp(PHASE[k], PHASE[k + 1], t - k);
};

/** Vertical offset of each hand from its rest height. */
const handY = (s: 1 | -1, t: number) => {
  if (t < 0) return 0;
  if (t < 56) {
    const amp = lerp(0.14, 0.28, smooth(seg(t, 4, STORM))) + 0.1 * smooth(seg(t, STORM - 2, STORM + 3));
    return amp * Math.sin(phaseAt(t) + (s > 0 ? 0 : Math.PI)) * smooth(seg(t, 1, 6)) * (1 - smooth(seg(t, 54, 56.5)));
  }
  // double slam: both up high, then down hard
  const up: Key[] = [[56, 0], [59, 0.7, E.out], [60, 0.72], [SLAM, -0.5, E.in], [64, -0.42], [68, -0.2, E.sine], [DROP, -0.25]];
  return keys(up, t);
};

// ---------------------------------------------------------------- body
const depthKeys: Key[] = [[0, 0.53], [56, 0.53], [59, 0.6, E.out], [SLAM, 0.47, E.in], [66, 0.49], [DROP, 0.57], [PROUD, 0.61, E.sine]];
const leanKeys: Key[] = [[0, 0.28], [56, 0.28], [59, -0.04, E.out], [SLAM, 0.58, E.in], [66, 0.45], [DROP, 0.2], [PROUD, -0.08, E.sine], [135, -0.06]];
const heelKeys: Key[] = [[0, 0], [56, 0], [59, 0.035, E.out], [SLAM - 1, 0], [135, 0]];
const face = faceTimeline(
  [[0, 'focus'], [6, 'grit'], [30, 'strain'], [STORM, 'grit'], [52, 'strain'], [57, 'grit'], [SLAM, 'pop'], [66, 'wow'], [HIT + 1, 'panic'], [DROP + 2, 'happy'], [PROUD, 'cocky'], [96, 'grin'], [118, 'smile']],
  { blinks: [10, 40, 77, 112], wink: { t: 101, side: 'R' } },
);

const handRest = (s: 1 | -1) => v(s * 0.24, 0.84, HAND_Z);

const handPos = (s: 1 | -1, t: number) => {
  const p = handRest(s);
  p.y += handY(s, Math.min(t, DROP));
  if (t > DROP) {
    // let go: the rope end drops and lies on the floor
    const k = E.in(seg(t, DROP, DROP + 5));
    p.y = lerp(p.y, R, k);
    p.z += 0.12 * k;
  }
  return p;
};

const body = (t: number, camAz: number): BodySpec => {
  const heel = keys(heelKeys, t);
  const depth = keys(depthKeys, t);
  const bob = t < 56 ? 0.012 * Math.sin(t * 0.9) * seg(t, 2, 8) : 0;
  const pelvis = v(0, SK.ankleH + heel + depth + SK.hipDrop + bob, -0.12 * (1 - E.sine(seg(t, DROP, PROUD))));
  const lean = keys(leanKeys, t);
  const torso: [number, number, number] = [lean, 0, t < 56 ? 0.03 * Math.sin(t * 0.45) : 0];
  const stance = lerp(0.32, 0.24, E.sine(seg(t, DROP, PROUD)));
  const foot = (s: 1 | -1): FootSpec => ({ at: v(s * stance, SK.ankleH + heel, -0.04), yaw: s * lerp(0.25, 0.14, E.sine(seg(t, DROP, PROUD))), pitch: Math.asin(clamp(heel / 0.11, 0, 0.9)), pole: v(s * 0.45, 0, 1).normalize() });
  let hands: { L: HandSpec; R: HandSpec };
  const holding = (s: 1 | -1): HandSpec => ({ at: handPos(s, t), axis: v(0, -0.25, 1).normalize(), shape: 'grip', pole: v(s, -0.35, -0.6).normalize() });
  if (t <= DROP) hands = { L: holding(1), R: holding(-1) };
  else {
    const k = E.sine(seg(t, DROP + 2, PROUD));
    const free = (s: 1 | -1): HandSpec => {
      const hip = handFrom(pelvis, torso, ARMS.hips, s);
      const hang = handFrom(pelvis, torso, ARMS.hang, s);
      const lift = E.out(seg(t, DROP, DROP + 4)) * (1 - k);
      return k < 0.5 ? { ...hang, at: hang.at.clone().lerp(hip.at, k).add(v(0, 0.08 * lift, 0)) } : { ...hip, at: hang.at.clone().lerp(hip.at, k) };
    };
    hands = { L: free(1), R: free(-1) };
  }
  const look = E.sine(seg(t, 86, 92)) * (1 - E.sine(seg(t, 124, 130)));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = t > SLAM && t < DROP ? [0, 0.05] : la.gaze;
  return {
    pelvis,
    torso,
    shrug: t < DROP ? 0.35 + 0.4 * E.out(seg(t, 56, 59)) * (1 - seg(t, SLAM, SLAM + 3)) : 0.2,
    hands,
    feet: { L: foot(1), R: foot(-1) },
    head: [-lean * 0.55 + (t > SLAM && t < HIT + 2 ? -0.12 : 0.02), la.yaw + noise1(t * 0.05, 3) * 0.02, noise1(t * 0.06, 5) * 0.02],
    face: fc,
    pump: 1 + 0.06 * E.out(seg(t, PROUD - 2, PROUD + 4)),
  };
};

// ---------------------------------------------------------------- ropes
/** Points along one rope at time t: the hand's motion travels to the anchor. */
const ropePoints = (s: 1 | -1, t: number, n = 72) => {
  const hand = handPos(s, t);
  const pts: THREE.Vector3[] = [];
  const end = v(s * 0.06, ANCHOR.y, ANCHOR.z);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const tau = t - u * TRAVEL;
    const x = lerp(hand.x, end.x, smooth(u));
    const z = lerp(hand.z + 0.02, end.z, u);
    // at rest it drops from the hand to the floor and runs flat to the anchor
    const drop = 1 - smooth(clamp(u / 0.13));
    let y = R + (hand.y - R) * drop + (ANCHOR.y - R) * smooth(clamp((u - 0.94) / 0.06));
    if (t <= DROP + 3) {
      const src = handY(s, Math.min(tau, DROP));
      // ordinary waves fade down the rope; the slam wave grows as it goes
      const slamW = smooth(seg(tau, 56, 59)) * (1 - smooth(seg(tau, 66, 70)));
      const env = lerp(1 - 0.4 * u, 1 + 0.8 * u, slamW) * (1 - drop) * smooth(clamp((0.99 - u) / 0.08));
      const live = (tau > 0 ? 1 : 0) * (1 - seg(t, DROP, DROP + 3));
      y += src * env * live;
      // the waves also snake sideways (reads from above); the slam is straight up and down
      const side = src * env * live * 0.55 * (1 - slamW);
      pts.push(v(x + side, Math.max(R, y), z));
    } else pts.push(v(x, Math.max(R, y), z));
  }
  return pts;
};

const Ropes: React.FC<{ t: number }> = ({ t }) => {
  const M = winterMats();
  const mats = useMemo(
    () => ({
      rope: new THREE.MeshStandardMaterial({ color: '#3A3E58', roughness: 0.78 }),
      sleeve: new THREE.MeshStandardMaterial({ color: '#17171D', roughness: 0.7 }),
    }),
    [],
  );
  const geos = useMemo(() => ({ list: [] as THREE.BufferGeometry[] }), []);
  geos.list.forEach((g) => g.dispose());
  geos.list = ([1, -1] as const).map((s) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePoints(s, t)), 220, R, 10, false));
  const sleeves = ([1, -1] as const).map((s) => {
    const p = ropePoints(s, t, 72);
    const a = p[0];
    const b = p[2];
    const dir = b.clone().sub(a).normalize();
    return { at: a.clone().addScaledVector(dir, -0.06), q: new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), dir) };
  });
  return (
    <>
      {geos.list.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.rope} castShadow receiveShadow />
      ))}
      {sleeves.map((sl, i) => (
        <group key={i} position={sl.at} quaternion={sl.q}>
          <mesh material={mats.sleeve} castShadow>
            <cylinderGeometry args={[R + 0.008, R + 0.008, 0.26, 14]} />
          </mesh>
          <mesh material={M.purple} position={[0, 0.15, 0]}>
            <cylinderGeometry args={[R + 0.01, R + 0.01, 0.04, 14]} />
          </mesh>
        </group>
      ))}
      {/* the anchor: a steel post with a ring */}
      <group position={[0, 0, ANCHOR.z + 0.1]}>
        <mesh material={M.steel} position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.4, 24]} />
        </mesh>
        <mesh material={M.chrome} position={[0, ANCHOR.y + 0.02, -0.12]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.08, 0.018, 10, 24]} />
        </mesh>
      </group>
    </>
  );
};

type Props = { t: number };

export const ropeStorm: ClipDef<Props> = {
  id: 'gym-8-3d',
  set: 'winter',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 28], [30, 22], [STORM, 14], [58, 4], [SLAM, 0], [HIT, 0], [76, -6], [94, -14], [135, -18]],
      y: [[0, 2.25], [30, 2.1], [STORM, 1.8], [58, 1.25], [SLAM, 1.05], [HIT, 0.95], [76, 1.3], [94, 1.5], [135, 1.6]],
      dist: [[0, 3.9], [STORM, 3.7], [58, 3.7], [SLAM, 3.8], [HIT, 3.8], [76, 4.4], [94, 5.4], [135, 5.8]],
      ty: [[0, 0.75], [STORM, 0.8], [SLAM, 0.85], [HIT, 0.95], [76, 1.1], [94, 1.38], [135, 1.45]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0.9], [STORM, 0.7], [SLAM, 0.45], [76, 0.2], [94, 0], [135, 0]],
      fov: [[0, 38], [SLAM, 40], [HIT, 44], [80, 38], [135, 36]],
    },
    hits: [[24, 0.08], [STORM, 0.2], [52, 0.15], [SLAM, 0.8], [HIT, 1.4], [PROUD, 0.3]],
    punch: [SLAM, HIT],
  },
  state: ({ t, cam }) => ({ body: body(t, cam.az), props: { t } }),
  Props: ({ props }) => <Ropes t={props.t} />,
  bursts: [
    { burst: { t0: SLAM, n: 60, speed: 1.4, up: 0.15, drag: 3, life: 22, size: 0.06, grow: 2.8, alpha: 0.2, floor: true }, at: () => [0.25, 0.4, 0.55].flatMap((u) => [v(0.18 - u * 0.12, 0.03, HAND_Z + u * 4.8), v(-0.18 + u * 0.12, 0.03, HAND_Z + u * 4.8)]) },
    { burst: { t0: HIT, n: 120, speed: 2.6, up: 0.4, drag: 2.4, life: 20, size: 0.05, grow: 3.2, alpha: 0.22 }, at: () => [v(0, 0.6, 3.9)] },
    { burst: { t0: DROP + 3, n: 24, speed: 0.8, up: 0.1, drag: 3, life: 16, size: 0.05, grow: 2.4, alpha: 0.14, floor: true }, at: () => [v(0.24, 0.03, HAND_Z + 0.1), v(-0.24, 0.03, HAND_Z + 0.1)] },
  ],
  glints: (_s, pose) => [
    { f: PROUD + 2, at: pose.L.grip.clone().add(v(0.03, 0.06, 0.06)), size: 0.32 },
    { f: 104, at: pose.pelvis.clone().add(v(0, 0.09, 0.2)), size: 0.3 },
  ],
  card: { kind: 'ribbon', title: 'ROPE STORM', start: 94, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const slam = hit(f, SLAM, 4);
    const whoom = hit(f, HIT, 5);
    return { bloom: 0.85 + 0.5 * slam + 1.1 * whoom, aberration: 0.6 * slam + 1.4 * whoom, exposure: 1 + 0.08 * slam + 0.2 * whoom, sun: 1 + 0.25 * hit(f, PROUD, 6) };
  },
};
