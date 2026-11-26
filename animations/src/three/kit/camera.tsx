import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { noise1, spline } from './math';

// A clip's camera: smooth splines for orbit angle, height, distance, target
// and lens, plus decaying shakes on the hits and an optional punch-in.

export type CamKeys = Record<'az' | 'y' | 'dist' | 'ty' | 'tx' | 'tz' | 'fov', [number, number][]>;
export type CamDef = { keys: CamKeys; hits: [number, number][]; punch?: number[] };
export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; roll: number; fov: number; az: number; shake: number };

export const cameraAt = (def: CamDef, f: number): Cam => {
  const k = def.keys;
  const az = (spline(k.az, f) * Math.PI) / 180;
  const dist = spline(k.dist, f);
  const pos = new THREE.Vector3(Math.sin(az) * dist, spline(k.y, f), Math.cos(az) * dist);
  const target = new THREE.Vector3(spline(k.tx, f), spline(k.ty, f), spline(k.tz, f));
  pos.x += target.x;
  pos.z += target.z;
  let shake = 0;
  for (const [h, s] of def.hits) if (f >= h) shake += s * Math.exp(-(f - h) / 3.2);
  // handheld drift, always on, very small
  const drift = new THREE.Vector3(noise1(f * 0.045, 1), noise1(f * 0.04, 2), noise1(f * 0.05, 3)).multiplyScalar(0.012);
  const jolt = new THREE.Vector3(noise1(f * 1.7, 4), noise1(f * 1.9, 5), noise1(f * 1.6, 6)).multiplyScalar(0.045 * shake);
  pos.add(drift).add(jolt);
  target.add(jolt.clone().multiplyScalar(0.5));
  const roll = noise1(f * 1.3, 7) * 0.02 * shake + noise1(f * 0.03, 8) * 0.004;
  for (const p of def.punch ?? []) {
    const punch = f >= p ? Math.exp(-(f - p) / 2.5) * 0.22 : 0;
    pos.lerp(target, punch * 0.25);
  }
  return { pos, target, roll, fov: spline(k.fov, f), az, shake };
};

export const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(cam.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(cam.target);
    camera.rotateZ(cam.roll);
    camera.fov = cam.fov;
    camera.near = 0.05;
    camera.far = 80;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, cam]);
  return null;
};
