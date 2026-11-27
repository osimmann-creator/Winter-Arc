import React, { useMemo } from 'react';
import * as THREE from 'three';
import { E, Key, clamp, keys, lerp, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { BodySpec, FootSpec, HandSpec, SK, faceTimeline, lookAt } from '../kit/rig';
import { ClipDef, hit } from '../kit/stage';
import { winterMats } from '../sets/WinterGym';

// gym-6-3d · Raise the Bar (PullUp.tsx), Winter Arc Gym: three quick
// pull-ups (chin over at 13, 23, 33), a kip (40), he lets go (49), flies up
// (HUP 56) and lands standing ON the bar (62). Wobble, wobble... double
// biceps (76), wink (86). Card at 92.

const BAR_Y = 2.45;
const GRIP_X = 0.34;
const RELEASE = 49;
const APEX = 56;
const LAND = 62;
const FLEX = 76;

// pelvis height and depth (in front of the bar: the bar passes behind his head)
const pyKeys: Key[] = [[0, 1.27], [5, 1.26], [13, 1.83, E.inOut], [18, 1.29, E.inOut], [23, 1.83, E.inOut], [28, 1.29, E.inOut], [33, 1.84, E.inOut], [38, 1.24, E.inOut], [44, 1.36, E.sine], [47, 1.86, E.in], [RELEASE, 2.32, E.linear], [APEX, 3.5, E.out], [LAND, 2.88, E.in], [65, 2.83, E.out], [71, 3.17, E.sine], [135, 3.18]];
const pzKeys: Key[] = [[0, 0.2], [38, 0.2], [41, 0.42, E.sine], [44, 0.1, E.sine], [RELEASE, 0.3], [53, 0.36, E.out], [LAND, 0.02, E.in], [135, 0.0]];
const leanKeys: Key[] = [[0, 0.06], [13, 0.1], [18, 0.05], [23, 0.1], [28, 0.05], [33, 0.11], [38, 0.04], [41, -0.25, E.sine], [44, 0.32, E.sine], [RELEASE, 0.05], [APEX, 0.45, E.out], [LAND, 0.25], [65, 0.3], [71, 0.04, E.sine], [FLEX, -0.04], [135, -0.02]];
// knees: 0 straight .. 1 tucked to the chest
const tuckKeys: Key[] = [[0, 0.35], [38, 0.35], [41, 0.1], [44, 0.85, E.sine], [47, 0.3, E.in], [RELEASE, 0.05], [APEX, 1, E.out], [59, 0.6], [LAND, 0.45]];

const P: Record<string, ArmPose> = {
  up: ARMS.up,
  wide: { ...ARMS.wide, at: [0.84, 0.48, 0.1] },
  flex: ARMS.flexBig,
};
const freeArms = armTrack([[RELEASE, P.up, 3], [58, P.wide, 5], [FLEX - 3, P.flex, 4]]);

const face = faceTimeline(
  [[0, 'focus'], [7, 'grit'], [12, 'strain'], [15, 'grit'], [22, 'strain'], [25, 'grit'], [32, 'strain'], [36, 'focus'], [41, 'grit'], [46, 'strain'], [RELEASE, 'pop'], [APEX - 2, 'wow'], [LAND, 'panic'], [70, 'happy'], [FLEX, 'grin'], [83, 'cocky'], [96, 'grin'], [118, 'smile']],
  { blinks: [6, 37, 110], wink: { t: 87, side: 'R' }, bob: 96 },
);

const onBar = (t: number) => t < RELEASE;

const body = (t: number, camAz: number): BodySpec => {
  const wob = t > LAND ? Math.sin((t - LAND) * 0.75) * Math.exp(-(t - LAND) / 7) : 0;
  const pelvis = v(wob * 0.05, keys(pyKeys, t), keys(pzKeys, t));
  const torso: [number, number, number] = [keys(leanKeys, t), 0, -wob * 0.22];
  const shrug = onBar(t) ? lerp(0.9, 0.2, clamp((pelvis.y - 1.27) / 0.56)) : 0.25;
  let L: HandSpec;
  let R: HandSpec;
  if (onBar(t)) {
    const grip = (s: 1 | -1): HandSpec => ({ at: v(s * GRIP_X, BAR_Y, 0), axis: v(s, 0, 0), shape: 'grip', pole: v(s, -0.9, 0.45).normalize() });
    L = grip(1);
    R = grip(-1);
  } else {
    L = handFrom(pelvis, torso, freeArms(t), 1);
    R = handFrom(pelvis, torso, freeArms(t), -1);
    // hands leave the bar over a few frames, not in one
    const k = E.out(seg(t, RELEASE, RELEASE + 4));
    if (k < 1) {
      L.at.lerp(v(GRIP_X, BAR_Y + 0.05, 0), 1 - k);
      R.at.lerp(v(-GRIP_X, BAR_Y + 0.05, 0), 1 - k);
    }
    // windmilling for balance
    if (t > LAND && t < FLEX - 3) {
      L.at.y += wob * 0.18;
      R.at.y -= wob * 0.18;
    }
  }
  // feet: hanging (crossed ankles behind), tucked in the air, then on the bar
  const tuck = keys(tuckKeys, t);
  let feet: { L: FootSpec; R: FootSpec };
  if (t < LAND) {
    const foot = (s: 1 | -1): FootSpec => {
      const hang = v(s * 0.06, -0.56, -0.2);
      const tucked = v(s * 0.12, -0.22, 0.12);
      const at = pelvis.clone().add(hang.lerp(tucked, tuck));
      return { at, yaw: s * 0.08, pitch: lerp(0.95, 0.5, tuck), pole: v(s * 0.15, 0.35, 1).normalize() };
    };
    feet = { L: foot(1), R: foot(-1) };
  } else {
    const foot = (s: 1 | -1): FootSpec => ({ at: v(s * 0.13 + wob * 0.03, BAR_Y + 0.02 + SK.ankleH, -0.03), yaw: s * 0.06, pitch: 0, pole: v(s * 0.3, 0, 1).normalize() });
    feet = { L: foot(1), R: foot(-1) };
  }
  const look = E.sine(seg(t, 80, 85)) * (1 - E.sine(seg(t, 120, 126)));
  const la = lookAt(camAz, look);
  const fc = face(t);
  fc.gaze = t > APEX - 3 && t < LAND + 2 ? [0, 0.25] : la.gaze;
  const headPitch = onBar(t) ? -0.12 - 0.12 * clamp((pelvis.y - 1.27) / 0.56) : t < LAND ? 0.25 : 0.08 - wob * 0.05;
  return {
    pelvis,
    torso,
    shrug,
    hands: { L, R },
    feet,
    head: [headPitch - torso[0] * 0.5, la.yaw + noise1(t * 0.05, 3) * 0.02, wob * 0.1 + noise1(t * 0.06, 5) * 0.015],
    face: fc,
    pump: 1 + 0.08 * E.out(seg(t, FLEX - 2, FLEX + 4)),
  };
};

// ---------------------------------------------------------------- the pull-up rig
const PullUpRig: React.FC<{ bend: number }> = ({ bend }) => {
  const M = winterMats();
  const geo = useMemo(() => {
    const pts = [...Array(21)].map((_, i) => v(-1.12 + (i * 2.24) / 20, 0, 0));
    return { pts };
  }, []);
  const bar = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(geo.pts), 40, 0.022, 14, false), [geo]);
  // the bar flexes under the landing
  const pos = bar.attributes.position as THREE.BufferAttribute;
  const base = useMemo(() => Float32Array.from(pos.array as Float32Array), [pos]);
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    pos.setY(i, base[i * 3 + 1] - bend * Math.cos((x / 1.12) * (Math.PI / 2)));
  }
  pos.needsUpdate = true;
  return (
    <group>
      <mesh geometry={bar} material={M.chrome} position={[0, BAR_Y, 0]} castShadow receiveShadow />
      {[1, -1].map((s) => (
        <group key={s} position={[s * 1.12, 0, 0]}>
          <mesh position={[0, 1.36, 0]} material={M.steel} castShadow receiveShadow>
            <boxGeometry args={[0.1, 2.72, 0.1]} />
          </mesh>
          <mesh position={[0, 2.74, 0]} material={M.purple} castShadow>
            <boxGeometry args={[0.13, 0.05, 0.13]} />
          </mesh>
          <mesh position={[0, 0.03, -0.1]} material={M.steel} castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.06, 1.3]} />
          </mesh>
          <mesh position={[0, 0.85, -0.42]} rotation-x={-0.62} material={M.steel} castShadow>
            <boxGeometry args={[0.07, 1.55, 0.07]} />
          </mesh>
          <mesh position={[-s * 0.02, BAR_Y, 0]} rotation-z={Math.PI / 2} material={M.purple} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

type Props = { bend: number };

export const raiseTheBar: ClipDef<Props> = {
  id: 'gym-6-3d',
  set: 'winter',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 18], [30, 12], [45, 6], [APEX, 0], [LAND, -4], [FLEX, -10], [92, -14], [135, -18]],
      y: [[0, 1.3], [30, 1.45], [45, 1.7], [APEX, 2.3], [LAND, 2.3], [FLEX, 2.4], [92, 2.55], [135, 2.6]],
      dist: [[0, 3.8], [30, 4.0], [45, 4.8], [APEX, 6.2], [LAND, 5.6], [FLEX, 5.3], [92, 6.0], [135, 6.3]],
      ty: [[0, 1.85], [30, 2.1], [45, 2.4], [APEX, 3.25], [LAND, 3.1], [FLEX, 3.2], [92, 3.25], [135, 3.3]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0.15], [45, 0.1], [LAND, 0], [135, 0]],
      fov: [[0, 38], [135, 38]],
    },
    hits: [[13, 0.1], [23, 0.1], [33, 0.12], [RELEASE, 0.2], [LAND, 0.8], [FLEX, 0.5]],
    punch: [LAND],
  },
  state: ({ t, cam }) => {
    const bend = (t < RELEASE ? 0.012 * clamp((keys(pyKeys, t) - 1.2) / 0.6) : 0) + (t > LAND ? 0.05 * Math.sin(((t - LAND) / 5) * Math.PI) * Math.exp(-(t - LAND) / 5) + 0.012 : 0);
    return { body: body(t, cam.az), props: { bend } };
  },
  Props: ({ props }) => <PullUpRig bend={props.bend} />,
  bursts: [
    { burst: { t0: 3, n: 24, speed: 0.5, up: -0.2, drag: 3, life: 24, size: 0.03, grow: 3, alpha: 0.18 }, at: (p) => [p.L.grip, p.R.grip] },
    { burst: { t0: RELEASE, n: 40, speed: 1.0, up: 0.3, drag: 3.4, life: 24, size: 0.035, grow: 3.4, alpha: 0.22 }, at: () => [v(GRIP_X, BAR_Y, 0), v(-GRIP_X, BAR_Y, 0)] },
    { burst: { t0: LAND, n: 60, speed: 1.4, up: 0.15, drag: 3, life: 22, size: 0.04, grow: 3.4, alpha: 0.2 }, at: (p) => [p.L.ankle, p.R.ankle] },
  ],
  glints: (_s, pose) => [
    { f: 20, at: v(0.75, BAR_Y + 0.02, 0.03), size: 0.35 },
    { f: FLEX + 2, at: pose.L.grip.clone().add(v(0.03, 0.08, 0.06)), size: 0.38 },
    { f: 104, at: v(-0.8, BAR_Y + 0.02, 0.03), size: 0.3 },
  ],
  card: { kind: 'ribbon', title: 'RAISE THE BAR', start: 92, color: '#F2853A', dark: '#B4521C', pts: '+1.5' },
  fx: (f) => {
    const land = hit(f, LAND, 4);
    const flex = hit(f, FLEX, 4);
    return { bloom: 0.85 + 0.7 * land + 0.5 * flex, aberration: 0.7 * land + 0.4 * flex, exposure: 1 + 0.1 * land, sun: 1 + 0.25 * flex };
  },
};
