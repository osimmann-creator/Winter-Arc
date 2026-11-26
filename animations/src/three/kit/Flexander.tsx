import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, rng } from './math';
import { MouthShape, Pose, SK, Side } from './rig';
import { SDF, capsule, ellipsoid, smax, smin, surfaceNets } from './sdf';
import { blushTexture, eyeTexture, mouthTexture, sashTexture, skirtTexture } from './textures';

// Flexander, sculpted in 3D: a clay-toy build of the 2D hero with the same
// palette (Hero.tsx / looks.ts FLEXANDER) — big head, laurel, toga, gold.

const C = {
  skin: '#FFB48C',
  cloth: '#FFF8EE',
  gold: '#FFC65A',
  ink: '#2A1218',
  hair: ['#4A2A28', '#5A3230', '#6E3E36', '#8E5442'],
  leather: '#7A4526',
  leatherDark: '#4A2716',
};

// ---------------------------------------------------------------- materials
let MATS: ReturnType<typeof makeMats> | null = null;
const makeMats = () => ({
  skin: new THREE.MeshPhysicalMaterial({ color: C.skin, roughness: 0.48, sheen: 0.45, sheenColor: new THREE.Color('#FFD6B8'), sheenRoughness: 0.42, clearcoat: 0.08, clearcoatRoughness: 0.45 }),
  cloth: new THREE.MeshPhysicalMaterial({ color: C.cloth, roughness: 0.84, sheen: 0.8, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.65 }),
  skirt: new THREE.MeshPhysicalMaterial({ map: skirtTexture(), roughness: 0.84, sheen: 0.8, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.65, side: THREE.DoubleSide }),
  sash: new THREE.MeshPhysicalMaterial({ map: sashTexture(), roughness: 0.84, sheen: 0.8, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.65, side: THREE.DoubleSide }),
  gold: new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.24 }),
  goldDeep: new THREE.MeshStandardMaterial({ color: '#D9912E', metalness: 1, roughness: 0.32 }),
  hair: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.52 }),
  ink: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.42 }),
  eye: new THREE.MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 }),
  leather: new THREE.MeshStandardMaterial({ color: C.leather, roughness: 0.6 }),
  leatherDark: new THREE.MeshStandardMaterial({ color: C.leatherDark, roughness: 0.65 }),
  blush: new THREE.MeshStandardMaterial({ map: blushTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: 0.6 }),
  mouth: Object.fromEntries((['o', 'focus', 'grit', 'grin', 'smile', 'kiss', 'smirk', 'wow'] as MouthShape[]).map((m) => [m, new THREE.MeshStandardMaterial({ map: mouthTexture(m), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.45 })])) as Record<MouthShape, THREE.MeshStandardMaterial>,
});
export const flexMats = () => (MATS ??= makeMats());

// ---------------------------------------------------------------- sculpted torso & head
const E3 = ellipsoid;
const torsoParts = {
  waist: E3(0, 0.15, 0.005, 0.185, 0.17, 0.132),
  chest: E3(0, 0.335, -0.01, 0.262, 0.16, 0.155),
  pec: E3(0.11, 0.352, 0.083, 0.118, 0.08, 0.068),
  lat: E3(0.175, 0.27, -0.035, 0.1, 0.165, 0.105),
  trap: E3(0.1, 0.47, -0.035, 0.13, 0.065, 0.085),
  cap: E3(0.27, 0.44, -0.01, 0.09, 0.08, 0.09),
  neck: capsule(0, 0.45, -0.01, 0, 0.6, 0.0, 0.085),
  oblique: E3(0.15, 0.14, 0.05, 0.06, 0.1, 0.07),
  abs: [0.245, 0.18, 0.115].map((y) => E3(0.048, y, 0.112, 0.044, 0.03, 0.032)),
};
export const torsoSDF: SDF = (x, y, z) => {
  const ax = Math.abs(x);
  let d = smin(torsoParts.waist(x, y, z), torsoParts.chest(x, y, z), 0.09);
  d = smin(d, torsoParts.lat(ax, y, z), 0.06);
  d = smin(d, torsoParts.trap(ax, y, z), 0.06);
  d = smin(d, torsoParts.cap(ax, y, z), 0.05);
  d = smin(d, torsoParts.neck(x, y, z), 0.05);
  d = smin(d, torsoParts.oblique(ax, y, z), 0.05);
  d = smin(d, torsoParts.pec(ax, y, z), 0.028);
  for (const a of torsoParts.abs) d = smin(d, a(ax, y, z), 0.014);
  return d;
};
const clothParts = {
  hips: E3(0, 0.02, -0.005, 0.205, 0.14, 0.15),
  root: E3(0.12, -0.07, 0.0, 0.1, 0.1, 0.1),
};
const clothSDF: SDF = (x, y, z) => smin(clothParts.hips(x, y, z), clothParts.root(Math.abs(x), y, z), 0.05);

const headParts = {
  cranium: E3(0, 0.035, -0.012, 0.245, 0.262, 0.238),
  cheeks: E3(0, -0.075, 0.03, 0.238, 0.185, 0.21),
  jaw: E3(0, -0.17, 0.065, 0.15, 0.085, 0.125),
  nose: E3(0, -0.03, 0.238, 0.034, 0.032, 0.032),
  ear: E3(0.238, -0.005, -0.015, 0.032, 0.062, 0.048),
  brow: E3(0, 0.095, 0.17, 0.175, 0.04, 0.07),
  socket: E3(0.095, 0.02, 0.215, 0.072, 0.088, 0.05),
};
const headSDF: SDF = (x, y, z) => {
  const ax = Math.abs(x);
  let d = smin(headParts.cranium(x, y, z), headParts.cheeks(x, y, z), 0.08);
  d = smin(d, headParts.jaw(x, y, z), 0.06);
  d = smin(d, headParts.brow(x, y, z), 0.05);
  d = smin(d, headParts.ear(ax, y, z), 0.025);
  d = smax(d, -headParts.socket(ax, y, z), 0.025);
  d = smin(d, headParts.nose(x, y, z), 0.03);
  return d;
};

// ---------------------------------------------------------------- geometry
/** Project a point onto an SDF surface. */
const toSurface = (sdf: SDF, p: THREE.Vector3, offset: number) => {
  const e = 0.002;
  const q = p.clone();
  const n = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    const d = sdf(q.x, q.y, q.z);
    n.set(sdf(q.x + e, q.y, q.z) - sdf(q.x - e, q.y, q.z), sdf(q.x, q.y + e, q.z) - sdf(q.x, q.y - e, q.z), sdf(q.x, q.y, q.z + e) - sdf(q.x, q.y, q.z - e)).normalize();
    q.addScaledVector(n, -d);
  }
  return { p: q.addScaledVector(n, offset), n };
};

/** A cloth ribbon laid on the torso along a path. */
const ribbon = (sdf: SDF, path: THREE.Vector3[], width: number, offset: number) => {
  const curve = new THREE.CatmullRomCurve3(path);
  const N = 90;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const pts = curve.getSpacedPoints(N).map((p) => toSurface(sdf, p, offset));
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)].p;
    const b = pts[Math.min(N, i + 1)].p;
    const tan = b.clone().sub(a).normalize();
    const side = new THREE.Vector3().crossVectors(tan, pts[i].n).normalize();
    // cloth bunches a touch at the ends
    const w = width * (0.9 + 0.1 * Math.sin((i / N) * Math.PI));
    for (const s of [-1, 1]) {
      const p = pts[i].p.clone().addScaledVector(side, (s * w) / 2);
      const lift = toSurface(sdf, p, offset);
      pos.push(lift.p.x, lift.p.y, lift.p.z);
      uv.push(s < 0 ? 0 : 1, (i / N) * 6);
    }
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/** A tube along an arc, capped with spheres: fingers, brows. */
const cappedTube = (pts: THREE.Vector3[], r: number, rEnd = r) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 16, r, 10, false);
  const a = new THREE.SphereGeometry(r, 12, 8).translate(pts[0].x, pts[0].y, pts[0].z);
  const b = new THREE.SphereGeometry(rEnd, 12, 8).translate(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z);
  return mergeGeometries([tube.toNonIndexed(), a.toNonIndexed(), b.toNonIndexed()]);
};

const buildFist = () => {
  // local frame: x along the bar (outward), y toward the wrist, z = knuckles
  const R = 0.036;
  const fingers: THREE.BufferGeometry[] = [];
  const xs = [-0.034, -0.0115, 0.0115, 0.033];
  xs.forEach((x, i) => {
    const pts: THREE.Vector3[] = [];
    const a0 = Math.PI * 0.58;
    const a1 = Math.PI * (2.12 - i * 0.03);
    for (let k = 0; k <= 10; k++) {
      const a = lerp(a0, a1, k / 10);
      const rr = R * (1 - 0.05 * (k / 10));
      pts.push(new THREE.Vector3(x, rr * Math.sin(a), -rr * Math.cos(a)));
    }
    fingers.push(cappedTube(pts, 0.0195 - i * 0.0008, 0.0165));
  });
  const knuckles = xs.map((x) => new THREE.SphereGeometry(0.022, 12, 10).translate(x, R * Math.sin(Math.PI * 0.58) + 0.004, -R * Math.cos(Math.PI * 0.58) + 0.006).toNonIndexed());
  const palm = new RoundedBoxGeometry(0.1, 0.07, 0.07, 3, 0.026).translate(0, 0.058, 0.004);
  const thumb = cappedTube([new THREE.Vector3(-0.052, 0.05, -0.026), new THREE.Vector3(-0.05, 0.022, -0.046), new THREE.Vector3(-0.028, -0.006, -0.05)], 0.019, 0.017);
  const g = mergeGeometries([...fingers, ...knuckles, palm, thumb]);
  g.computeVertexNormals();
  return g;
};

/** Open hand in the fist's frame: fingers run away from the wrist (-y), back of the hand is +z. */
const buildOpen = () => {
  const palm = new RoundedBoxGeometry(0.1, 0.09, 0.036, 3, 0.016).translate(0, 0.012, 0);
  const fingers = [-0.034, -0.0115, 0.0115, 0.033].map((x, i) => {
    const len = [0.078, 0.088, 0.084, 0.066][i];
    return cappedTube([new THREE.Vector3(x, -0.026, 0.002), new THREE.Vector3(x * 1.12, -0.026 - len * 0.55, -0.006), new THREE.Vector3(x * 1.22, -0.026 - len, -0.02)], 0.0178 - i * 0.0007, 0.0158);
  });
  const thumb = cappedTube([new THREE.Vector3(-0.044, 0.03, -0.006), new THREE.Vector3(-0.074, 0.0, -0.016), new THREE.Vector3(-0.088, -0.032, -0.024)], 0.0195, 0.017);
  const g = mergeGeometries([palm, ...fingers, thumb]);
  g.computeVertexNormals();
  return g;
};

/** A fist with the index finger out, pointing away from the wrist. */
const buildPoint = () => {
  const R = 0.036;
  const parts: THREE.BufferGeometry[] = [];
  const xs = [-0.034, -0.0115, 0.0115, 0.033];
  xs.forEach((x, i) => {
    if (i === 0) {
      parts.push(cappedTube([new THREE.Vector3(x, 0.036, 0.016), new THREE.Vector3(x - 0.002, -0.01, 0.02), new THREE.Vector3(x - 0.004, -0.058, 0.018)], 0.0185, 0.0165));
      return;
    }
    const pts: THREE.Vector3[] = [];
    const a0 = Math.PI * 0.58;
    const a1 = Math.PI * (2.12 - i * 0.03);
    for (let k = 0; k <= 10; k++) {
      const a = lerp(a0, a1, k / 10);
      const rr = R * (1 - 0.05 * (k / 10));
      pts.push(new THREE.Vector3(x, rr * Math.sin(a), -rr * Math.cos(a)));
    }
    parts.push(cappedTube(pts, 0.0195 - i * 0.0008, 0.0165));
  });
  for (const x of xs) parts.push(new THREE.SphereGeometry(0.022, 12, 10).translate(x, R * Math.sin(Math.PI * 0.58) + 0.004, -R * Math.cos(Math.PI * 0.58) + 0.006).toNonIndexed());
  parts.push(new RoundedBoxGeometry(0.1, 0.07, 0.07, 3, 0.026).translate(0, 0.058, 0.004));
  parts.push(cappedTube([new THREE.Vector3(-0.052, 0.05, -0.026), new THREE.Vector3(-0.05, 0.022, -0.046), new THREE.Vector3(-0.028, -0.006, -0.05)], 0.019, 0.017));
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
};

const buildFoot = () => {
  const foot = new THREE.SphereGeometry(1, 24, 16).scale(0.056, 0.04, 0.118).translate(0, -0.03, 0.055).toNonIndexed();
  const toes = [-0.032, -0.011, 0.011, 0.03].map((x, i) => new THREE.SphereGeometry(i === 0 ? 0.024 : 0.018, 12, 8).translate(x, -0.045, 0.158 - Math.abs(x) * 0.5).toNonIndexed());
  const skin = mergeGeometries([foot, ...toes]);
  skin.computeVertexNormals();
  const sole = new RoundedBoxGeometry(0.13, 0.026, 0.27, 2, 0.012).translate(0, -0.064, 0.055);
  const straps = mergeGeometries([
    new THREE.TorusGeometry(0.06, 0.009, 8, 32).scale(1, 0.75, 1).rotateY(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, -0.03, 0.095).toNonIndexed(),
    new THREE.TorusGeometry(0.052, 0.009, 8, 32).rotateX(Math.PI / 2).translate(0, 0.0, -0.005).toNonIndexed(),
    new THREE.TorusGeometry(0.06, 0.008, 8, 32).scale(1, 0.75, 1).rotateY(Math.PI / 2).rotateZ(Math.PI / 2).rotateX(-0.5).translate(0, -0.02, 0.03).toNonIndexed(),
  ]);
  return { skin, sole, straps };
};

const buildSkirt = () => {
  const rows = 12;
  const cols = 96;
  const pos = new Float32Array((rows + 1) * (cols + 1) * 3);
  const uv = new Float32Array((rows + 1) * (cols + 1) * 2);
  const wts = new Float32Array((rows + 1) * (cols + 1) * 2);
  const idx: number[] = [];
  const top = 0.085;
  const hem = -0.31;
  for (let r = 0; r <= rows; r++) {
    const u = r / rows;
    const y = lerp(top, hem, u);
    const rx = lerp(0.212, 0.3, Math.pow(u, 0.85));
    const rz = lerp(0.158, 0.252, Math.pow(u, 0.85));
    for (let c = 0; c <= cols; c++) {
      const th = (c / cols) * Math.PI * 2;
      const pleat = 1 + 0.032 * Math.pow(u, 1.1) * Math.sin(th * 15);
      const i = r * (cols + 1) + c;
      pos[i * 3] = Math.sin(th) * rx * pleat;
      pos[i * 3 + 1] = y + Math.pow(u, 3) * 0.012 * Math.sin(th * 3 + 1);
      pos[i * 3 + 2] = Math.cos(th) * rz * pleat;
      uv[i * 2] = (c / cols) * 2;
      uv[i * 2 + 1] = 1 - u;
      const reach = Math.pow(u, 1.25);
      const wl = Math.pow(clamp(Math.cos(th - 0.72)), 1.0) * reach;
      const wr = Math.pow(clamp(Math.cos(th + 0.72)), 1.0) * reach;
      const sum = wl + wr;
      const k = sum > 1 ? 1 / sum : 1;
      wts[i * 2] = wl * k;
      wts[i * 2 + 1] = wr * k;
      if (r < rows && c < cols) {
        const a = i;
        const b = i + 1;
        const d = i + cols + 1;
        const e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, rest: pos, wts };
};

let GEO: ReturnType<typeof buildGeo> | null = null;
const buildGeo = () => {
  const torso = surfaceNets(torsoSDF, [-0.4, -0.06, -0.23], [0.4, 0.64, 0.25], 0.0085);
  const clothCore = surfaceNets(clothSDF, [-0.33, -0.2, -0.2], [0.33, 0.18, 0.2], 0.012);
  const head = surfaceNets(headSDF, [-0.3, -0.3, -0.29], [0.3, 0.32, 0.3], 0.0068);

  // decals on the face (projected once, in head space)
  const headMesh = new THREE.Mesh(head);
  headMesh.updateMatrixWorld();
  const mouth = new DecalGeometry(headMesh, new THREE.Vector3(0, -0.128, 0.24), new THREE.Euler(0.12, 0, 0), new THREE.Vector3(0.25, 0.125, 0.3));
  const blushL = new DecalGeometry(headMesh, new THREE.Vector3(0.152, -0.07, 0.19), new THREE.Euler(0, 0.62, 0), new THREE.Vector3(0.1, 0.075, 0.2));
  const blushR = new DecalGeometry(headMesh, new THREE.Vector3(-0.152, -0.07, 0.19), new THREE.Euler(0, -0.62, 0), new THREE.Vector3(0.1, 0.075, 0.2));

  // sash: from the right hip, up the back, over the left shoulder, down the front
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const sash = ribbon(torsoSDF, [V(-0.17, 0.06, -0.12), V(-0.06, 0.2, -0.17), V(0.07, 0.36, -0.17), V(0.17, 0.5, -0.08), V(0.2, 0.55, 0.0), V(0.17, 0.49, 0.1), V(0.08, 0.38, 0.16), V(-0.04, 0.24, 0.16), V(-0.15, 0.1, 0.14), V(-0.18, 0.06, 0.12)], 0.125, 0.012);

  const beltCurve = new THREE.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new THREE.Vector3(Math.sin(a) * 0.21, 0.068, Math.cos(a) * 0.158);
  }), true);
  const beltGeo = new THREE.TubeGeometry(beltCurve, 96, 0.021, 10, true);

  const bolt = new THREE.Shape();
  bolt.moveTo(0.006, 0.03);
  bolt.lineTo(-0.016, -0.002);
  bolt.lineTo(-0.002, -0.002);
  bolt.lineTo(-0.008, -0.03);
  bolt.lineTo(0.016, 0.004);
  bolt.lineTo(0.002, 0.004);
  bolt.closePath();
  const boltGeo = new THREE.ExtrudeGeometry(bolt, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });

  // hair: curls over the crown, a hairline that sits high on the forehead
  const curls: { p: THREE.Vector3; s: number; c: number }[] = [];
  const r = rng(101);
  const N = 260;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const d = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
    const s = clamp(0.5 - d.z * 0.8);
    const line = lerp(0.5, -0.42, s);
    if (d.y < line) continue;
    if (Math.abs(d.x) > 0.8 && d.y < 0.2 && d.z > -0.3) continue; // clear the ears
    const p = new THREE.Vector3(d.x * 0.252, d.y * 0.27, d.z * 0.246).add(new THREE.Vector3(0, 0.035, -0.012));
    p.addScaledVector(d, 0.012 + r() * 0.012);
    curls.push({ p, s: 0.045 + r() * 0.022, c: Math.floor(r() * 4) });
  }

  // laurel: band at the hairline, leaves sweeping back from the brow
  const bandCurve = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return new THREE.Vector3(Math.sin(a) * 0.262, 0.165 + 0.055 * Math.cos(a) - 0.03 * Math.cos(2 * a), -0.012 + Math.cos(a) * 0.246);
  }), true);
  const band = new THREE.TubeGeometry(bandCurve, 80, 0.011, 8, true).toNonIndexed();
  const leaves: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const a = side * (0.25 + k * 0.17);
      const p = bandCurve.getPoint(((a / (Math.PI * 2)) % 1 + 1) % 1);
      for (const up of [1, -1]) {
        const leaf = new THREE.SphereGeometry(1, 10, 6).scale(0.012, 0.034, 0.005);
        leaf.translate(0, 0.03, 0);
        leaf.rotateZ(side * (up > 0 ? 0.9 : 2.1));
        leaf.rotateY(a);
        leaf.translate(p.x, p.y + up * 0.006, p.z + 0.004);
        leaves.push(leaf.toNonIndexed());
      }
    }
  }
  const laurel = mergeGeometries([band, ...leaves]);
  laurel.computeVertexNormals();

  const brow = cappedTube([new THREE.Vector3(-0.058, -0.004, -0.008), new THREE.Vector3(0, 0.008, 0.004), new THREE.Vector3(0.058, -0.002, -0.01)], 0.019, 0.015);

  return {
    torso,
    clothCore,
    head,
    mouth,
    blushL,
    blushR,
    sash,
    belt: beltGeo,
    buckle: new THREE.CylinderGeometry(0.05, 0.05, 0.02, 40).rotateX(Math.PI / 2),
    bolt: boltGeo,
    brooch: new THREE.CylinderGeometry(0.036, 0.036, 0.016, 32),
    curl: new THREE.IcosahedronGeometry(1, 2),
    curls,
    laurel,
    eye: new THREE.SphereGeometry(0.07, 40, 28),
    lid: new THREE.SphereGeometry(0.0745, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    lidLow: new THREE.SphereGeometry(0.0742, 40, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38),
    lash: new THREE.TorusGeometry(0.0745, 0.0075, 8, 48).rotateX(Math.PI / 2),
    brow,
    neck: new THREE.CylinderGeometry(0.085, 0.095, 0.2, 24),
    deltoid: new THREE.SphereGeometry(0.104, 28, 20).scale(1.04, 0.96, 1),
    fist: buildFist(),
    open: buildOpen(),
    point: buildPoint(),
    cuff: new THREE.CylinderGeometry(0.062, 0.058, 0.07, 32, 1, true),
    cuffLip: new THREE.TorusGeometry(0.06, 0.007, 8, 32).rotateX(Math.PI / 2),
    foot: buildFoot(),
    calfStrap: new THREE.TorusGeometry(1, 0.11, 8, 32).rotateX(Math.PI / 2),
    skirt: buildSkirt(),
  };
};
export const flexGeo = () => (GEO ??= buildGeo());

// ---------------------------------------------------------------- helpers
const UP = new THREE.Vector3(0, 1, 0);
const segment = (a: THREE.Vector3, b: THREE.Vector3) => {
  const d = b.clone().sub(a);
  const len = d.length();
  return { q: new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), len };
};


// ---------------------------------------------------------------- smooth limbs
// Each arm and leg is one tube swept through shoulder-elbow-wrist (or
// hip-knee-ankle) with a muscle profile, rebuilt every frame: the joints bend
// like clay instead of showing ball joints.
const RINGS = 56;
const SEGS = 22;
const profile = (pts: [number, number][]) => {
  const c = new THREE.SplineCurve(pts.map(([u, r]) => new THREE.Vector2(u, r)));
  const table = c.getPoints(200);
  return (u: number) => {
    // table is ordered in u; find the bracketing samples
    let i = 1;
    while (i < table.length - 1 && table[i].x < u) i++;
    const a = table[i - 1];
    const b = table[i];
    return lerp(a.y, b.y, clamp((u - a.x) / (b.x - a.x || 1)));
  };
};
const ARM_R = profile([[0, 0.086], [0.12, 0.085], [0.26, 0.094], [0.4, 0.078], [0.5, 0.064], [0.58, 0.068], [0.67, 0.074], [0.85, 0.056], [1, 0.047]]);
const LEG_R = profile([[0, 0.112], [0.15, 0.115], [0.3, 0.104], [0.44, 0.086], [0.5, 0.078], [0.58, 0.082], [0.67, 0.089], [0.8, 0.067], [0.92, 0.051], [1, 0.046]]);

const tubeGeometry = () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RINGS * (SEGS + 1) * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(RINGS * (SEGS + 1) * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < RINGS - 1; i++)
    for (let j = 0; j < SEGS; j++) {
      const a = i * (SEGS + 1) + j;
      const b = a + SEGS + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  g.setIndex(idx);
  return g;
};

const sweep = (g: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, radius: (u: number) => number) => {
  const curve = new THREE.CatmullRomCurve3([a, b, c], false, 'centripetal');
  const pos = g.attributes.position.array as Float32Array;
  const nrm = g.attributes.normal.array as Float32Array;
  const len = curve.getLength();
  let n = new THREE.Vector3();
  let prevT = curve.getTangentAt(0);
  // any normal to start, then parallel transport down the tube
  n.set(0, 0, 1).cross(prevT);
  if (n.lengthSq() < 1e-6) n.set(1, 0, 0).cross(prevT);
  n.normalize();
  const bn = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < RINGS; i++) {
    const u = i / (RINGS - 1);
    curve.getPointAt(u, p);
    const t = curve.getTangentAt(u);
    q.setFromUnitVectors(prevT, t);
    n.applyQuaternion(q).normalize();
    prevT = t;
    bn.crossVectors(t, n).normalize();
    const r = radius(u);
    const slope = (radius(Math.min(1, u + 0.01)) - radius(Math.max(0, u - 0.01))) / (0.02 * len);
    for (let j = 0; j <= SEGS; j++) {
      const th = (j / SEGS) * Math.PI * 2;
      dir.copy(n).multiplyScalar(Math.cos(th)).addScaledVector(bn, Math.sin(th));
      const k = (i * (SEGS + 1) + j) * 3;
      pos[k] = p.x + dir.x * r;
      pos[k + 1] = p.y + dir.y * r;
      pos[k + 2] = p.z + dir.z * r;
      const nx = dir.x - t.x * slope;
      const ny = dir.y - t.y * slope;
      const nz = dir.z - t.z * slope;
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm[k] = nx / l;
      nrm[k + 1] = ny / l;
      nrm[k + 2] = nz / l;
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  g.computeBoundingSphere();
};

const LimbTube: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; radius: (u: number) => number }> = ({ a, b, c, radius }) => {
  const M = flexMats();
  const geo = useMemo(() => tubeGeometry(), []);
  useLayoutEffect(() => sweep(geo, a, b, c, radius), [geo, a, b, c, radius]);
  return <mesh geometry={geo} material={M.skin} castShadow receiveShadow frustumCulled={false} />;
};

// ---------------------------------------------------------------- parts
const Arm: React.FC<{ s: Side; side: 1 | -1; pump: number }> = ({ s, side, pump }) => {
  const G = flexGeo();
  const M = flexMats();
  // hand frame: x along what the fist closes around (or across the palm),
  // y toward the wrist, z out of the back of the hand
  const toElbow = s.elbow.clone().sub(s.grip).normalize();
  let X: THREE.Vector3;
  let Y: THREE.Vector3;
  let Z: THREE.Vector3;
  if (s.palm) {
    Z = s.palm.clone().negate().normalize();
    Y = toElbow.clone().addScaledVector(Z, -toElbow.dot(Z)).normalize();
    X = new THREE.Vector3().crossVectors(Y, Z).multiplyScalar(side);
  } else {
    X = s.axis.clone().normalize();
    Y = toElbow.clone().addScaledVector(X, -toElbow.dot(X));
    if (Y.lengthSq() < 1e-6) Y.set(0, 1, 0).addScaledVector(X, -X.y);
    Y.normalize();
    Z = new THREE.Vector3().crossVectors(X, Y).multiplyScalar(side);
  }
  const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(s.grip);
  const hp = new THREE.Vector3();
  const hq = new THREE.Quaternion();
  const hs = new THREE.Vector3();
  m.decompose(hp, hq, hs);
  const wrist = s.grip.clone().addScaledVector(Y, 0.072).addScaledVector(Z, 0.004);
  const fore = segment(s.elbow, wrist);
  const cuffAt = wrist.clone().addScaledVector(s.elbow.clone().sub(wrist).normalize(), 0.035);
  const radius = useMemo(() => (pump === 1 ? ARM_R : (u: number) => ARM_R(u) * (1 + (pump - 1) * (u < 0.55 ? 1.25 : 0.8))), [pump]);
  const hand = s.shape === 'open' ? G.open : s.shape === 'point' ? G.point : G.fist;
  return (
    <>
      <LimbTube a={s.shoulder} b={s.elbow} c={wrist} radius={radius} />
      <group position={hp} quaternion={hq} scale={hs}>
        <mesh geometry={hand} material={M.skin} castShadow receiveShadow />
      </group>
      <group position={cuffAt} quaternion={fore.q}>
        <mesh geometry={G.cuff} material={M.gold} castShadow />
        <mesh geometry={G.cuffLip} material={M.goldDeep} position={[0, 0.035, 0]} />
        <mesh geometry={G.cuffLip} material={M.goldDeep} position={[0, -0.035, 0]} />
      </group>
    </>
  );
};

const Leg: React.FC<{ s: Side }> = ({ s }) => {
  const G = flexGeo();
  const M = flexMats();
  const shin = segment(s.knee, s.ankle);
  return (
    <>
      <LimbTube a={s.hip} b={s.knee} c={s.ankle} radius={LEG_R} />
      <group position={s.knee} quaternion={shin.q}>
        {[0.2, 0.245, 0.29].map((y, i) => (
          <mesh key={i} geometry={G.calfStrap} material={M.leather} position={[0, y, 0]} scale={[0.064 - i * 0.006, 0.07, 0.064 - i * 0.006]} castShadow />
        ))}
      </group>
      <group position={s.ankle} rotation={[s.footPitch, s.footYaw, 0, 'YXZ']}>
        <mesh geometry={G.foot.skin} material={M.skin} castShadow receiveShadow />
        <mesh geometry={G.foot.sole} material={M.leatherDark} castShadow receiveShadow />
        <mesh geometry={G.foot.straps} material={M.leather} castShadow />
      </group>
    </>
  );
};

const Skirt: React.FC<{ pose: Pose }> = ({ pose }) => {
  const G = flexGeo();
  const M = flexMats();
  const geo = useMemo(() => G.skirt.g.clone(), [G]);
  useLayoutEffect(() => {
    const { rest, wts } = G.skirt;
    const out = geo.attributes.position.array as Float32Array;
    const down = new THREE.Vector3(0, -1, 0);
    const qL = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), new THREE.Quaternion().setFromUnitVectors(down, pose.thighL), 0.88);
    const qR = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), new THREE.Quaternion().setFromUnitVectors(down, pose.thighR), 0.88);
    const pL = new THREE.Vector3(SK.hipX, -SK.hipDrop, 0);
    const pR = new THREE.Vector3(-SK.hipX, -SK.hipDrop, 0);
    const v = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dirL = pose.thighL;
    const dirR = pose.thighR;
    const axis = new THREE.Vector3();
    const push = (p: THREE.Vector3, hip: THREE.Vector3, dir: THREE.Vector3) => {
      const rel = p.clone().sub(hip);
      const t = clamp(rel.dot(dir) / SK.thigh, 0, 1);
      axis.copy(hip).addScaledVector(dir, t * SK.thigh);
      const radial = p.clone().sub(axis);
      const d = radial.length();
      const r = lerp(0.126, 0.098, t);
      if (d < r && d > 1e-5) p.copy(axis).addScaledVector(radial, r / d);
    };
    for (let i = 0; i < rest.length / 3; i++) {
      v.set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
      const wl = wts[i * 2];
      const wr = wts[i * 2 + 1];
      a.copy(v).sub(pL).applyQuaternion(qL).add(pL);
      b.copy(v).sub(pR).applyQuaternion(qR).add(pR);
      const wp = 1 - wl - wr;
      v.set(v.x * wp + a.x * wl + b.x * wr, v.y * wp + a.y * wl + b.y * wr, v.z * wp + a.z * wl + b.z * wr);
      push(v, pL, dirL);
      push(v, pR, dirR);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }, [geo, G, pose.thighL, pose.thighR]);
  return <mesh geometry={geo} material={M.skirt} castShadow receiveShadow />;
};

const Eye: React.FC<{ side: 1 | -1; lid: number; lidLow: number; tilt: number; gaze: [number, number] }> = ({ side, lid, lidLow, tilt, gaze }) => {
  const G = flexGeo();
  const M = flexMats();
  // lid angle: -1.25 rad = wide open (folded back), +1.5 = shut
  // the upper lid stops just below the middle of the eye, where the lower lid
  // rises to meet it, so a closed eye still shows its lash line
  const edge = lerp(1.08, -0.24, lid);
  const upper = -Math.asin(clamp(edge, -1, 1));
  const lower = lerp(0.0, -0.62, Math.max(lidLow, lid * 0.36));
  return (
    <group position={[side * 0.095, 0.02, 0.19]} scale={[1, 1.22, 0.78]}>
      <mesh geometry={G.eye} material={M.eye} rotation={[gaze[1], gaze[0], 0, 'YXZ']} />
      <group rotation={[0, 0, side * -tilt]}>
        <group rotation={[upper, 0, 0]}>
          <mesh geometry={G.lid} material={M.skin} castShadow />
          <mesh geometry={G.lash} material={M.ink} />
        </group>
        <group rotation={[lower, 0, 0]}>
          <mesh geometry={G.lidLow} material={M.skin} />
        </group>
      </group>
    </group>
  );
};

const Head: React.FC<{ pose: Pose }> = ({ pose }) => {
  const G = flexGeo();
  const M = flexMats();
  const f = pose.face;
  const hairMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(G.curl, M.hair, G.curls.length);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    G.curls.forEach((c, i) => {
      m.compose(c.p, new THREE.Quaternion(), new THREE.Vector3(c.s, c.s * 0.92, c.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(C.hair[c.c]));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [G, M]);
  return (
    <group>
      <mesh geometry={G.head} material={M.skin} castShadow receiveShadow />
      <mesh geometry={G.mouth} material={M.mouth[f.mouth]} scale={[f.mouthScale, f.mouthScale, 1]} position={[0, -0.128 * (1 - f.mouthScale), 0]} />
      {f.blush > 0.02 && (
        <>
          <mesh geometry={G.blushL} material={M.blush} material-opacity={f.blush} />
          <mesh geometry={G.blushR} material={M.blush} material-opacity={f.blush} />
        </>
      )}
      <Eye side={1} lid={f.lidU[0]} lidLow={f.lidLow} tilt={f.lidTilt} gaze={f.gaze} />
      <Eye side={-1} lid={f.lidU[1]} lidLow={f.lidLow} tilt={f.lidTilt} gaze={f.gaze} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={G.brow} material={M.ink} position={[s * 0.096, 0.132 + f.browY, 0.212]} rotation={[0.12, s * 0.32, s * f.browAng, 'YXZ']} castShadow />
      ))}
      <primitive object={hairMesh} />
      <mesh geometry={G.laurel} material={M.gold} castShadow />
    </group>
  );
};

export const Flexander: React.FC<{ pose: Pose }> = ({ pose }) => {
  const G = flexGeo();
  const M = flexMats();
  const headPos = SK.head.clone().sub(SK.neck);
  return (
    <group>
      <group position={pose.pelvis} quaternion={pose.torsoQ}>
        <mesh geometry={G.torso} material={M.skin} scale={[1 + (pose.pump - 1) * 0.55, 1 + (pose.pump - 1) * 0.15, 1 + (pose.pump - 1) * 0.6]} position={[0, -(pose.pump - 1) * 0.02, 0]} castShadow receiveShadow />
        <mesh geometry={G.clothCore} material={M.cloth} castShadow receiveShadow />
        <Skirt pose={pose} />
        <mesh geometry={G.sash} material={M.sash} castShadow receiveShadow />
        <mesh geometry={G.belt} material={M.gold} castShadow receiveShadow />
        <group position={[0, 0.068, 0.168]}>
          <mesh geometry={G.buckle} material={M.gold} castShadow />
          <mesh geometry={G.bolt} material={M.goldDeep} position={[0, 0, 0.008]} />
        </group>
        <mesh geometry={G.brooch} material={M.goldDeep} position={[0.19, 0.548, 0.03]} rotation={[0.9, 0, -0.5]} scale={[0.62, 0.5, 0.62]} castShadow />
        {[1, -1].map((s) => (
          <mesh key={s} geometry={G.deltoid} material={M.skin} scale={1 + (pose.pump - 1) * 1.1} position={[s * (SK.shoulderX + 0.012 + (pose.pump - 1) * 0.05), SK.shoulderY + pose.shrug * 0.055 + 0.01, SK.shoulderZ]} castShadow receiveShadow />
        ))}
        <group position={SK.neck} quaternion={pose.headQ}>
          <mesh geometry={G.neck} material={M.skin} position={[0, 0.05, 0.0]} castShadow receiveShadow />
          <group position={headPos}>
            <Head pose={pose} />
          </group>
        </group>
      </group>
      <Arm s={pose.L} side={1} pump={pose.pump} />
      <Arm s={pose.R} side={-1} pump={pose.pump} />
      <Leg s={pose.L} />
      <Leg s={pose.R} />
    </group>
  );
};
