import React, { useMemo } from 'react';
import * as THREE from 'three';

// Small props shared by the clips.

const g = <T,>(f: () => T) => {
  let v: T | null = null;
  return () => (v ??= f());
};

export const propMats = g(() => ({
  chrome: new THREE.MeshStandardMaterial({ color: '#EEF0F5', metalness: 1, roughness: 0.14 }),
  knurl: new THREE.MeshStandardMaterial({ color: '#AFB3BE', metalness: 1, roughness: 0.42 }),
  pink: new THREE.MeshStandardMaterial({ color: '#E8609A', roughness: 0.48 }),
  purple: new THREE.MeshStandardMaterial({ color: '#7254DC', roughness: 0.48 }),
  black: new THREE.MeshStandardMaterial({ color: '#23232C', roughness: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: '#B98252', roughness: 0.55 }),
  steel: new THREE.MeshStandardMaterial({ color: '#5E6472', metalness: 0.9, roughness: 0.32 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1E1E24', roughness: 0.82 }),
  gold: new THREE.MeshStandardMaterial({ color: '#FFC65A', metalness: 1, roughness: 0.26 }),
}));

const dbGeo = g(() => ({
  handle: new THREE.CylinderGeometry(0.017, 0.017, 0.16, 16).rotateZ(Math.PI / 2),
  head: new THREE.CylinderGeometry(0.072, 0.072, 0.075, 6).rotateZ(Math.PI / 2),
  cap: new THREE.CylinderGeometry(0.03, 0.03, 0.08, 16).rotateZ(Math.PI / 2),
}));

/** Hex dumbbell along its local x. */
export const Dumbbell: React.FC<{ pos: THREE.Vector3; q: THREE.Quaternion; color: 'pink' | 'purple' | 'black' }> = ({ pos, q, color }) => {
  const G = dbGeo();
  const M = propMats();
  return (
    <group position={pos} quaternion={q}>
      <mesh geometry={G.handle} material={M.knurl} castShadow />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.118, 0, 0]}>
          <mesh geometry={G.head} material={M[color]} castShadow receiveShadow />
          <mesh geometry={G.cap} material={M.chrome} castShadow />
        </group>
      ))}
    </group>
  );
};

/** Quaternion that turns local +x onto `axis`. */
export const alongX = (axis: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)) => {
  const x = axis.clone().normalize();
  let z = new THREE.Vector3().crossVectors(x, up);
  if (z.lengthSq() < 1e-6) z = new THREE.Vector3().crossVectors(x, new THREE.Vector3(0, 0, 1));
  z.normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
};

/** A ballistic toss: from p0 at f0 to land at p1 at f1 (frames), gravity in units/frame². */
export const toss = (p0: THREE.Vector3, p1: THREE.Vector3, f0: number, f1: number, t: number, grav = 9.8 / 900) => {
  const T = f1 - f0;
  const u = Math.min(Math.max(t - f0, 0), T);
  const vy = (p1.y - p0.y + 0.5 * grav * T * T) / T;
  return new THREE.Vector3(p0.x + ((p1.x - p0.x) * u) / T, p0.y + vy * u - 0.5 * grav * u * u, p0.z + ((p1.z - p0.z) * u) / T);
};

/** A bounce after landing: height offset that decays. */
export const bounce = (t: number, land: number, h = 0.06, period = 6) => (t <= land ? 0 : Math.abs(Math.sin(((t - land) / period) * Math.PI)) * h * Math.exp(-(t - land) / (period * 0.9)));

const heartTex = g(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.translate(128, 136);
  x.fillStyle = '#FF5C93';
  x.strokeStyle = '#341720';
  x.lineWidth = 14;
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(0, 84);
  x.bezierCurveTo(-36, 56, -104, 12, -100, -36);
  x.bezierCurveTo(-96, -84, -40, -100, 0, -56);
  x.bezierCurveTo(40, -100, 96, -84, 100, -36);
  x.bezierCurveTo(104, 12, 36, 56, 0, 84);
  x.closePath();
  x.fill();
  x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.65)';
  x.beginPath();
  x.ellipse(-48, -40, 20, 12, -0.6, 0, Math.PI * 2);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

/** A cartoon heart that pops and floats up (the kiss). */
export const Heart: React.FC<{ at: THREE.Vector3; t: number; t0: number }> = ({ at, t, t0 }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: heartTex(), transparent: true, depthWrite: false }), []);
  const age = t - t0;
  if (age < 0 || age > 30) return null;
  const pop = age < 5 ? 1 - Math.pow(1 - age / 5, 3) * 1 + Math.sin((age / 5) * Math.PI) * 0.25 : 1;
  const s = 0.2 * pop * (age > 22 ? 1 - (age - 22) / 8 : 1);
  return <sprite material={mat} position={[at.x + Math.sin(age * 0.3) * 0.03, at.y + age * 0.012, at.z]} scale={[s, s, 1]} />;
};
