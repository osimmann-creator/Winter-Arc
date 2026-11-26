import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { noise1, spline } from './math';

// One continuous camera move: from the shadow side (his left, backlit by the
// windows) around the front, a low push-in for the jerk, a slow-motion arc at
// the lockout, and a settle on his sunlit side for the plaque.

type K = [number, number][];
const CAM: Record<'az' | 'y' | 'dist' | 'ty' | 'tx' | 'tz' | 'fov', K> = {
  az: [[0, 36], [10, 33], [22, 27], [36, 21], [50, 15], [62, 9], [70, 4], [76, -3], [84, -20], [92, -38], [102, -47], [135, -53]],
  y: [[0, 0.72], [12, 0.74], [24, 0.85], [40, 1.0], [52, 1.0], [62, 0.8], [70, 0.52], [76, 0.42], [84, 0.46], [92, 0.62], [102, 0.95], [135, 1.12]],
  dist: [[0, 3.15], [14, 2.95], [24, 3.0], [40, 3.25], [52, 3.45], [62, 3.35], [70, 3.1], [76, 2.9], [84, 3.0], [92, 3.45], [102, 4.8], [120, 5.7], [135, 6.0]],
  ty: [[0, 1.04], [14, 1.02], [24, 1.0], [40, 1.0], [52, 1.05], [62, 1.1], [70, 1.35], [76, 1.58], [84, 1.55], [92, 1.45], [102, 1.42], [135, 1.45]],
  tx: [[0, 0.0], [135, 0]],
  tz: [[0, 0.12], [24, 0.05], [60, 0], [135, 0]],
  fov: [[0, 36], [70, 36], [76, 39], [90, 38], [102, 35], [135, 34]],
};

/** Decaying shake after each hit: [frame, strength]. */
const HITS: [number, number][] = [[50.5, 0.6], [76, 1], [93, 0.25]];

export const cameraAt = (f: number) => {
  const az = (spline(CAM.az, f) * Math.PI) / 180;
  const dist = spline(CAM.dist, f);
  const pos = new THREE.Vector3(Math.sin(az) * dist, spline(CAM.y, f), Math.cos(az) * dist);
  const target = new THREE.Vector3(spline(CAM.tx, f), spline(CAM.ty, f), spline(CAM.tz, f));
  let shake = 0;
  for (const [h, s] of HITS) if (f >= h) shake += s * Math.exp(-(f - h) / 3.2);
  // handheld drift, always on, very small
  const drift = new THREE.Vector3(noise1(f * 0.045, 1), noise1(f * 0.04, 2), noise1(f * 0.05, 3)).multiplyScalar(0.012);
  const jolt = new THREE.Vector3(noise1(f * 1.7, 4), noise1(f * 1.9, 5), noise1(f * 1.6, 6)).multiplyScalar(0.045 * shake);
  pos.add(drift).add(jolt);
  target.add(jolt.clone().multiplyScalar(0.5));
  const roll = noise1(f * 1.3, 7) * 0.02 * shake + noise1(f * 0.03, 8) * 0.004;
  // punch-in on the lockout
  const punch = f >= 76 ? Math.exp(-(f - 76) / 2.5) * 0.22 : 0;
  pos.lerp(target, punch * 0.25);
  return { pos, target, roll, fov: spline(CAM.fov, f), az, shake };
};

export const CameraRig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const c = cameraAt(f);
    camera.position.copy(c.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(c.target);
    camera.rotateZ(c.roll);
    camera.fov = c.fov;
    camera.near = 0.05;
    camera.far = 80;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, f]);
  return null;
};
