import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SK } from './rig';
import { plateTexture } from './textures';

// Chrome bar with knurled grips, bronze sleeves and rubber bumper plates.
// The bar bends with `pose.whip`: the plates' inertia snaps the ends down
// and back up after the catch and the lockout.

const HALF = 0.985;
const IDENT = new THREE.Quaternion();
export const bend = (x: number, whip: number) => whip * Math.pow(Math.abs(x) / HALF, 2.2);
const slope = (x: number, whip: number) => (whip * 2.2 * Math.pow(Math.abs(x) / HALF, 1.2) * Math.sign(x)) / HALF;

let MATS: ReturnType<typeof makeMats> | null = null;
const makeMats = () => ({
  chrome: new THREE.MeshStandardMaterial({ color: '#EDEFF5', metalness: 1, roughness: 0.13 }),
  knurl: new THREE.MeshStandardMaterial({ color: '#B9BCC6', metalness: 1, roughness: 0.42 }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#E2E4EA', metalness: 1, roughness: 0.18 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1B2030', roughness: 0.62 }),
  face: new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.55 }),
  plum: new THREE.MeshStandardMaterial({ color: '#3A2D47', roughness: 0.58 }),
  bronze: new THREE.MeshStandardMaterial({ color: '#C08752', metalness: 1, roughness: 0.3 }),
  hub: new THREE.MeshStandardMaterial({ color: '#D6A062', metalness: 1, roughness: 0.22 }),
});
export const barMats = () => (MATS ??= makeMats());

const PLATES = [
  { x: 0.7, r: SK.plateR, t: 0.07, kind: 'big' },
  { x: 0.751, r: 0.232, t: 0.05, kind: 'plum' },
  { x: 0.793, r: 0.165, t: 0.032, kind: 'bronze' },
] as const;

let GEO: ReturnType<typeof makeGeo> | null = null;
const makeGeo = () => {
  // bar profile along x (as a lathe around y, turned onto x)
  const prof: [number, number][] = [
    [0, -HALF], [0.022, -HALF], [0.026, -HALF + 0.008], [0.026, -0.84], [0.027, -0.835], [0.027, -0.67], [0.036, -0.668], [0.036, -0.632], [0.017, -0.63],
    [0.017, 0.63], [0.036, 0.632], [0.036, 0.668], [0.027, 0.67], [0.027, 0.835], [0.026, 0.84], [0.026, HALF - 0.008], [0.022, HALF], [0, HALF],
  ];
  const bar = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  bar.rotateZ(-Math.PI / 2);
  bar.computeVertexNormals();
  const plate = (r: number, t: number) => ({
    rim: new THREE.CylinderGeometry(r, r, t - 0.012, 72, 1, true).rotateZ(-Math.PI / 2),
    bevel: new THREE.TorusGeometry(r - 0.006, 0.0065, 8, 72).rotateY(Math.PI / 2),
    face: new THREE.CircleGeometry(r - 0.005, 72),
  });
  return {
    bar,
    restBar: (bar.attributes.position.array as Float32Array).slice(),
    knurl: new THREE.CylinderGeometry(0.0172, 0.0172, 0.28, 24, 1, true).rotateZ(-Math.PI / 2),
    plates: PLATES.map((p) => plate(p.r, p.t)),
    hub: new THREE.CylinderGeometry(0.05, 0.05, 1, 32).rotateZ(-Math.PI / 2),
    collar: new THREE.CylinderGeometry(0.044, 0.044, 0.042, 32).rotateZ(-Math.PI / 2),
  };
};
export const barGeo = () => (GEO ??= makeGeo());

const PlateStack: React.FC<{ side: 1 | -1; whip: number }> = ({ side, whip }) => {
  const G = barGeo();
  const M = barMats();
  return (
    <>
      {PLATES.map((p, i) => {
        const x = side * p.x;
        const g = G.plates[i];
        const faceMat = p.kind === 'big' ? M.face : p.kind === 'plum' ? M.plum : M.bronze;
        const rimMat = p.kind === 'big' ? M.rubber : p.kind === 'plum' ? M.plum : M.bronze;
        return (
          <group key={i} position={[x, bend(x, whip), 0]} rotation={[0, 0, Math.atan(slope(x, whip))]}>
            <mesh geometry={g.rim} material={rimMat} castShadow receiveShadow />
            {[1, -1].map((f) => (
              <group key={f} position={[(f * p.t) / 2 - f * 0.006, 0, 0]}>
                <mesh geometry={g.bevel} material={rimMat} castShadow />
                <mesh geometry={g.face} material={f === side ? faceMat : rimMat} rotation={[0, (f * Math.PI) / 2, 0]} position={[f * 0.0055, 0, 0]} receiveShadow castShadow />
              </group>
            ))}
            <mesh geometry={G.hub} material={M.hub} scale={[p.t + 0.012, 1, 1]} castShadow />
          </group>
        );
      })}
      <mesh geometry={G.collar} material={M.chrome} position={[side * 0.832, bend(side * 0.832, whip), 0]} rotation={[0, 0, Math.atan(slope(side * 0.832, whip))]} castShadow />
    </>
  );
};

export const Barbell: React.FC<{ pos: THREE.Vector3; q?: THREE.Quaternion; whip: number }> = ({ pos, q, whip }) => {
  const G = barGeo();
  const M = barMats();
  const geo = useMemo(() => G.bar.clone(), [G]);
  useLayoutEffect(() => {
    const out = geo.attributes.position.array as Float32Array;
    const rest = G.restBar;
    for (let i = 0; i < rest.length; i += 3) {
      out[i] = rest[i];
      out[i + 1] = rest[i + 1] + bend(rest[i], whip);
      out[i + 2] = rest[i + 2];
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }, [geo, G, whip]);
  return (
    <group position={pos} quaternion={q ?? IDENT}>
      <mesh geometry={geo} material={M.chrome} castShadow receiveShadow />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={G.knurl} material={M.knurl} position={[s * 0.45, bend(s * 0.45, whip), 0]} castShadow />
      ))}
      <PlateStack side={1} whip={whip} />
      <PlateStack side={-1} whip={whip} />
    </group>
  );
};
