import * as THREE from 'three';
import { E, Ease, lerp, seg } from './math';
import { HandShape, HandSpec, SK, torsoQuat } from './rig';

// Choreography helpers: vector keys, and arm poses written once in the
// torso's own space (for his left arm; the right arm mirrors them) and
// blended on a timeline.

export type V3 = [number, number, number];
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Keys of [t, x, y, z, ease?] interpolated into a vector. */
export const vk = (k: [number, number, number, number, Ease?][], t: number) => {
  if (t <= k[0][0]) return v(k[0][1], k[0][2], k[0][3]);
  for (let i = 1; i < k.length; i++) {
    const [t1, x1, y1, z1, ease] = k[i];
    const [t0, x0, y0, z0] = k[i - 1];
    if (t <= t1) {
      const u = (ease ?? E.sine)(seg(t, t0, t1));
      return v(lerp(x0, x1, u), lerp(y0, y1, u), lerp(z0, z1, u));
    }
  }
  const l = k[k.length - 1];
  return v(l[1], l[2], l[3]);
};

/** An arm pose in torso space, for the left arm (+x). */
export type ArmPose = { at: V3; axis: V3; pole: V3; shape: HandShape; palm?: V3 };

export const ARMS: Record<string, ArmPose> = {
  // relaxed at the side
  hang: { at: [0.37, -0.28, 0.07], axis: [0, 0, 1], pole: [1, 0.2, -0.6], shape: 'open', palm: [-1, 0, 0] },
  // fist on the hip, elbow out
  hips: { at: [0.25, 0.03, 0.1], axis: [0, 1, 0], pole: [1, 0.15, -0.4], shape: 'fist' },
  // front double biceps: fist by the head, elbow out at shoulder height
  flex: { at: [0.5, 0.74, 0.08], axis: [0, 0, -1], pole: [1, -0.45, -0.15], shape: 'fist' },
  // a bigger, higher flex for the impact frames
  flexBig: { at: [0.56, 0.82, 0.12], axis: [0, 0, -1], pole: [1, -0.3, -0.2], shape: 'fist' },
  // both arms straight up in victory
  up: { at: [0.42, 1.22, 0.06], axis: [0, 0, 1], pole: [1, 0, -0.2], shape: 'fist' },
  // arms out to the sides (balance, surprise)
  wide: { at: [0.82, 0.38, 0.12], axis: [0, 0, 1], pole: [0.2, -1, -0.3], shape: 'open', palm: [0, -1, 0.2] },
  // pointing at the sky
  pointUp: { at: [0.34, 1.24, 0.14], axis: [0, 0, 1], pole: [1, 0, -0.2], shape: 'point' },
  // thumb-ish fist forward (cheers, "ta-da")
  forward: { at: [0.3, 0.42, 0.48], axis: [0, 1, 0], pole: [1, -0.6, 0], shape: 'fist' },
  // panic hands by the face
  panic: { at: [0.3, 0.86, 0.3], axis: [0, 1, 0], pole: [1, -0.8, 0], shape: 'open', palm: [0, 0, -1] },
};

export const mirror = (p: ArmPose): ArmPose => ({
  at: [-p.at[0], p.at[1], p.at[2]],
  axis: [-p.axis[0], p.axis[1], p.axis[2]],
  pole: [-p.pole[0], p.pole[1], p.pole[2]],
  shape: p.shape,
  palm: p.palm ? [-p.palm[0], p.palm[1], p.palm[2]] : undefined,
});

export const blendArm = (a: ArmPose, b: ArmPose, k: number): ArmPose => {
  const l = (x: V3, y: V3): V3 => [lerp(x[0], y[0], k), lerp(x[1], y[1], k), lerp(x[2], y[2], k)];
  return {
    at: l(a.at, b.at),
    axis: l(a.axis, b.axis),
    pole: l(a.pole, b.pole),
    shape: k < 0.5 ? a.shape : b.shape,
    palm: a.palm && b.palm ? l(a.palm, b.palm) : k < 0.5 ? a.palm : b.palm,
  };
};

/** A timeline of [t, pose, blend frames?] for one arm (poses written for the left arm). */
export const armTrack = (track: [number, ArmPose | string, number?][]) => (t: number): ArmPose => {
  const get = (p: ArmPose | string) => (typeof p === 'string' ? ARMS[p] : p);
  let i = 0;
  while (i + 1 < track.length && track[i + 1][0] <= t) i++;
  const cur = get(track[i][1]);
  if (i === 0) return cur;
  const prev = get(track[i - 1][1]);
  const k = E.inOut(seg(t, track[i][0], track[i][0] + (track[i][2] ?? 6)));
  return blendArm(prev, cur, k);
};

/** An arm pose in torso space -> a world hand spec. */
export const handFrom = (pelvis: THREE.Vector3, torso: [number, number, number], p: ArmPose, side: 1 | -1): HandSpec => {
  const q = torsoQuat(torso);
  const pose = side > 0 ? p : mirror(p);
  const w = (a: V3) => new THREE.Vector3(...a).applyQuaternion(q);
  return {
    at: w(pose.at).add(pelvis),
    axis: w(pose.axis),
    pole: w(pose.pole),
    shape: pose.shape,
    palm: pose.palm ? w(pose.palm) : undefined,
  };
};

/** A hand at a world point (on a prop). */
export const handAt = (at: THREE.Vector3, axis: V3 | THREE.Vector3, pole: V3 | THREE.Vector3, shape: HandShape = 'grip', palm?: V3 | THREE.Vector3): HandSpec => ({
  at,
  axis: Array.isArray(axis) ? v(...axis) : axis,
  pole: Array.isArray(pole) ? v(...pole) : pole,
  shape,
  palm: palm ? (Array.isArray(palm) ? v(...palm) : palm) : undefined,
});

/** Standing pelvis height for a hip-to-ankle extension `d` (0.475 deep squat … 0.61 straight). */
export const pelvisFor = (d: number, ankleY = SK.ankleH) => ankleY + d + SK.hipDrop;
