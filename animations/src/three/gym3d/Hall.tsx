import { useLoader, useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo } from 'react';
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './math';
import { friezeTexture, marbleTexture, platformWoodTexture, rubberTexture, sideSkyTexture, woodTexture } from './textures';

// The Greek temple gym from gym/beast.webp, built in 3D: polished plank
// floor with a gold ring, tall sunlit windows on the left, a balcony and
// three arched windows onto the Acropolis at the back, an iron-and-bronze
// vaulted ceiling, marble columns.

export const FLOOR_Y = -0.045;
export const SUN_DIR = new THREE.Vector3(0.765, -0.546, 0.328).normalize(); // direction the light travels
const WALL_X = 7.5;
const BACK_Z = -7.5;
const LEFT_WINDOWS = [-5.6, -3.0, -0.4, 2.2];

let MATS: ReturnType<typeof makeMats> | null = null;
const makeMats = () => {
  const marble = marbleTexture();
  const m = (t: THREE.Texture, rx: number, ry: number) => {
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(rx, ry);
    c.needsUpdate = true;
    return c;
  };
  return {
    marbleWall: new THREE.MeshStandardMaterial({ map: m(marble, 0.22, 0.22), roughness: 0.38, color: '#F2DED2' }),
    marbleCol: new THREE.MeshStandardMaterial({ map: m(marble, 1, 2.4), roughness: 0.32 }),
    redWall: new THREE.MeshStandardMaterial({ color: '#6E2A2A', roughness: 0.78 }),
    plum: new THREE.MeshStandardMaterial({ color: '#4A2630', roughness: 0.85 }),
    vault: new THREE.MeshStandardMaterial({ color: '#5A2A30', roughness: 0.9, side: THREE.BackSide }),
    bronze: new THREE.MeshStandardMaterial({ color: '#B57A45', metalness: 1, roughness: 0.38 }),
    darkBronze: new THREE.MeshStandardMaterial({ color: '#6B4630', metalness: 0.9, roughness: 0.5 }),
    iron: new THREE.MeshStandardMaterial({ color: '#2E2226', metalness: 0.7, roughness: 0.55 }),
    gold: new THREE.MeshStandardMaterial({ color: '#E8B25C', metalness: 1, roughness: 0.32, envMapIntensity: 0.45 }),
    trim: new THREE.MeshStandardMaterial({ color: '#9A6A40', metalness: 0.85, roughness: 0.55, envMapIntensity: 0.3 }),
    frieze: new THREE.MeshStandardMaterial({ map: m(friezeTexture(), 6, 1), roughness: 0.6 }),
    platform: new THREE.MeshStandardMaterial({ map: platformWoodTexture(), roughness: 0.62 }),
    rubber: new THREE.MeshStandardMaterial({ map: m(rubberTexture(), 2, 4), roughness: 0.85 }),
    sideSky: new THREE.MeshBasicMaterial({ map: sideSkyTexture(), color: new THREE.Color(2.6, 2.3, 2.0), toneMapped: true }),
    plate: new THREE.MeshStandardMaterial({ color: '#23283A', roughness: 0.6 }),
    chalk: new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.95 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.5) }),
  };
};
export const hallMats = () => (MATS ??= makeMats());

// ---------------------------------------------------------------- floor with planar reflections
const ReflectiveFloor: React.FC = () => {
  const size = useThree((s) => s.size);
  const { reflector, floor } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(40, 40);
    const reflector = new Reflector(geo, { textureWidth: Math.round(size.width * 0.5), textureHeight: Math.round(size.height * 0.5), clipBias: 0.003, multisample: 0 });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = FLOOR_Y;
    const rm = reflector.material as THREE.ShaderMaterial;
    rm.colorWrite = false;
    rm.depthWrite = false;
    reflector.renderOrder = -100; // render the reflection before anything samples it
    const wood = woodTexture().clone();
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(10, 10);
    wood.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.66, metalness: 0, envMapIntensity: 0.25 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tReflect = { value: reflector.getRenderTarget().texture };
      shader.uniforms.uReflectMatrix = { value: rm.uniforms.textureMatrix.value };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uReflectMatrix;\nvarying vec4 vReflectUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvReflectUv = uReflectMatrix * vec4( position, 1.0 );');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tReflect;\nvarying vec4 vReflectUv;')
        .replace(
          '#include <tonemapping_fragment>',
          `{
            vec2 ruv = vReflectUv.xy / vReflectUv.w;
            vec3 refl = vec3( 0.0 );
            float wsum = 0.0;
            for ( int i = -2; i <= 2; i ++ ) {
              for ( int j = -2; j <= 2; j ++ ) {
                float w = exp( - float( i * i + j * j ) * 0.35 );
                refl += texture2D( tReflect, ruv + vec2( float( i ) * 0.0016, float( j ) * 0.0026 ) ).rgb * w;
                wsum += w;
              }
            }
            refl /= wsum;
            float ndv = clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 );
            float fres = 0.06 + 0.94 * pow( 1.0 - ndv, 4.0 );
            float lum = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) );
            gl_FragColor.rgb += min( refl, vec3( 2.5 ) ) * fres * smoothstep( 0.015, 0.12, lum ) * 0.7;
          }
          #include <tonemapping_fragment>`,
        );
    };
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    const draw = reflector.onBeforeRender.bind(reflector);
    reflector.onBeforeRender = (...args) => {
      floor.visible = false;
      draw(...args);
      floor.visible = true;
    };
    return { reflector, floor };
  }, [size.width, size.height]);
  return (
    <>
      <primitive object={reflector} />
      <primitive object={floor} />
    </>
  );
};

// ---------------------------------------------------------------- geometry builders
const fluted = (r: number, h: number) => {
  const g = new THREE.CylinderGeometry(r, r * 1.04, h, 120, 24, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    const f = 1 - 0.035 * Math.pow(Math.max(0, Math.cos(a * 20)), 0.6);
    p.setXYZ(i, (x / rr) * rr * f, p.getY(i), (z / rr) * rr * f);
  }
  g.computeVertexNormals();
  return g;
};

const columnParts = () => {
  const base = mergeGeometries([
    new RoundedBoxGeometry(1.25, 0.32, 1.25, 2, 0.04).translate(0, 0.16, 0),
    new THREE.CylinderGeometry(0.6, 0.62, 0.14, 48).translate(0, 0.39, 0).toNonIndexed(),
    new THREE.TorusGeometry(0.54, 0.06, 12, 48).rotateX(Math.PI / 2).translate(0, 0.5, 0).toNonIndexed(),
  ]);
  const capital = mergeGeometries([
    new THREE.TorusGeometry(0.5, 0.055, 12, 48).rotateX(Math.PI / 2).translate(0, 0, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.72, 0.5, 0.5, 48, 1).translate(0, 0.28, 0).toNonIndexed(),
    new RoundedBoxGeometry(1.5, 0.2, 1.5, 2, 0.03).translate(0, 0.62, 0),
  ]);
  return { base, capital, shaft: fluted(0.46, 1) };
};

/** A wall slab with rectangular / arched openings, extruded for thickness. */
const wallWithHoles = (w0: number, w1: number, h0: number, h1: number, holes: { c: number; w: number; y0: number; y1: number; arch?: boolean }[], depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(w0, h0);
  s.lineTo(w1, h0);
  s.lineTo(w1, h1);
  s.lineTo(w0, h1);
  s.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    const x0 = h.c - h.w / 2;
    const x1 = h.c + h.w / 2;
    p.moveTo(x0, h.y0);
    p.lineTo(x1, h.y0);
    if (h.arch) {
      p.lineTo(x1, h.y1 - h.w / 2);
      p.absarc(h.c, h.y1 - h.w / 2, h.w / 2, 0, Math.PI, false);
    } else {
      p.lineTo(x1, h.y1);
      p.lineTo(x0, h.y1);
    }
    p.closePath();
    s.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
};

// ---------------------------------------------------------------- the hall
export const Hall: React.FC<{ debug?: string }> = ({ debug = '' }) => {
  const M = hallMats();
  const view = useLoader(THREE.TextureLoader, staticFile('gym/beast.webp'));
  const parts = useMemo(() => {
    const col = columnParts();
    // left wall (x = -7.5): windows let the sun in
    const left = wallWithHoles(-7.5, 6.5, FLOOR_Y, 10.5, LEFT_WINDOWS.map((c) => ({ c, w: 1.7, y0: 1.25, y1: 8.4, arch: true })), 0.7);
    left.rotateY(-Math.PI / 2).translate(-WALL_X, 0, 0);
    // back wall upper part with the three arches
    const backUpper = wallWithHoles(-9, 9, 3.55, 10.5, [-2.3, 0, 2.3].map((c) => ({ c, w: 1.75, y0: 4.0, y1: 7.7, arch: true })), 0.6);
    backUpper.translate(0, 0, BACK_Z - 0.6);
    const right = new THREE.BoxGeometry(0.6, 10.6, 14.5).translate(WALL_X + 0.3, 5.25, -0.5);
    // window mullions (none across the opening that lights the lifter)
    const bars: THREE.BufferGeometry[] = [];
    for (const c of LEFT_WINDOWS) {
      const ys = c === -3.0 ? [2.6, 4.6] : [2.6, 4.0, 5.4, 6.8];
      for (const y of ys) bars.push(new THREE.BoxGeometry(0.12, 0.07, 1.7).translate(-WALL_X - 0.35, y, c).toNonIndexed());
      if (c !== -3.0) bars.push(new THREE.BoxGeometry(0.12, 7.0, 0.07).translate(-WALL_X - 0.35, 4.85, c).toNonIndexed());
    }
    // window frames: an arch of bronze around each opening
    const frames: THREE.BufferGeometry[] = [];
    const archFrame = (c: number, w: number, y0: number, y1: number, plane: 'x' | 'z', at: number) => {
      const pts: THREE.Vector3[] = [];
      const r = w / 2;
      const yc = y1 - r;
      pts.push(new THREE.Vector3(c - r, y0, 0), new THREE.Vector3(c - r, yc, 0));
      for (let k = 1; k < 16; k++) {
        const a = Math.PI - (k / 16) * Math.PI;
        pts.push(new THREE.Vector3(c + Math.cos(a) * r, yc + Math.sin(a) * r, 0));
      }
      pts.push(new THREE.Vector3(c + r, yc, 0), new THREE.Vector3(c + r, y0, 0));
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 64, 0.07, 8, false);
      if (plane === 'x') g.rotateY(-Math.PI / 2).translate(at, 0, 0);
      else g.translate(0, 0, at);
      frames.push(g.toNonIndexed());
    };
    for (const c of LEFT_WINDOWS) archFrame(c, 1.7, 1.25, 8.4, 'x', -WALL_X + 0.02);
    for (const c of [-2.3, 0, 2.3]) archFrame(c, 1.75, 4.0, 7.7, 'z', BACK_Z + 0.02);
    // pilasters and the balcony
    const pil: THREE.BufferGeometry[] = [];
    for (const x of [-6.6, -3.5, 3.5, 6.6]) pil.push(new THREE.BoxGeometry(0.42, 3.4, 0.2).translate(x, 1.7 + FLOOR_Y, BACK_Z + 0.1).toNonIndexed());
    for (const x of [-3.45, -1.15, 1.15, 3.45]) pil.push(new THREE.BoxGeometry(0.34, 4.6, 0.25).translate(x, 6.0, BACK_Z + 0.06).toNonIndexed());
    const balcony = new THREE.BoxGeometry(18, 0.22, 1.1).translate(0, 3.5, BACK_Z + 0.55);
    const rail: THREE.BufferGeometry[] = [new THREE.BoxGeometry(18, 0.07, 0.08).translate(0, 4.45, BACK_Z + 1.05).toNonIndexed(), new THREE.BoxGeometry(18, 0.04, 0.05).translate(0, 3.78, BACK_Z + 1.05).toNonIndexed()];
    for (let x = -8.8; x <= 8.8; x += 0.22) rail.push(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 6).translate(x, 4.03, BACK_Z + 1.05).toNonIndexed());
    for (let x = -8; x <= 8; x += 1.6) rail.push(new THREE.TorusGeometry(0.17, 0.022, 8, 24).translate(x, 4.1, BACK_Z + 1.06).toNonIndexed());
    // the vault: a barrel ceiling with riveted bronze arches
    const R = 12.5;
    const half = Math.asin(WALL_X / R);
    const vault = new THREE.CylinderGeometry(R, R, 16, 64, 1, true, -half, half * 2).rotateX(-Math.PI / 2).translate(0, 10.5 - R * Math.cos(half), -0.5);
    const arches: THREE.BufferGeometry[] = [];
    const rivets: THREE.Vector3[] = [];
    for (const z of [-6.2, -3.4, -0.6, 2.2, 5.0]) {
      arches.push(new THREE.TorusGeometry(R - 0.12, 0.16, 8, 64, half * 2).rotateZ(Math.PI / 2 - half).translate(0, 10.5 - R * Math.cos(half), z).toNonIndexed());
      arches.push(new THREE.TorusGeometry(R - 0.75, 0.09, 8, 64, half * 2).rotateZ(Math.PI / 2 - half).translate(0, 10.5 - R * Math.cos(half), z).toNonIndexed());
      for (let k = 0; k <= 30; k++) {
        const a = Math.PI / 2 - half + (k / 30) * half * 2;
        rivets.push(new THREE.Vector3(Math.cos(a) * (R - 0.12), 10.5 - R * Math.cos(half) + Math.sin(a) * (R - 0.12) - 0.13, z + 0.12));
      }
      for (let k = 0; k < 12; k++) {
        const a0 = Math.PI / 2 - half + (k / 12) * half * 2;
        const a1 = Math.PI / 2 - half + ((k + 1) / 12) * half * 2;
        const p0 = new THREE.Vector3(Math.cos(a0) * (R - 0.12), Math.sin(a0) * (R - 0.12), 0);
        const p1 = new THREE.Vector3(Math.cos(a1) * (R - 0.75), Math.sin(a1) * (R - 0.75), 0);
        const mid = p0.clone().add(p1).multiplyScalar(0.5);
        const len = p0.distanceTo(p1);
        const brace = new THREE.BoxGeometry(0.06, len, 0.06);
        brace.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()));
        brace.translate(mid.x, mid.y + 10.5 - R * Math.cos(half), z);
        arches.push(brace.toNonIndexed());
      }
    }
    // dumbbell racks along the back wall
    const rackFrame: THREE.BufferGeometry[] = [];
    const bells: THREE.BufferGeometry[] = [];
    const r = rng(5);
    for (const x0 of [-5.4, 4.0]) {
      rackFrame.push(new THREE.BoxGeometry(1.6, 0.06, 0.45).translate(x0 + 0.8, 0.55, BACK_Z + 0.55).toNonIndexed());
      rackFrame.push(new THREE.BoxGeometry(1.6, 0.06, 0.45).translate(x0 + 0.8, 1.15, BACK_Z + 0.55).toNonIndexed());
      for (const dx of [0.03, 1.57]) rackFrame.push(new THREE.BoxGeometry(0.06, 1.5, 0.45).translate(x0 + dx, 0.75, BACK_Z + 0.55).toNonIndexed());
      for (const y of [0.68, 1.28]) {
        for (let k = 0; k < 5; k++) {
          const s = 0.075 + r() * 0.03;
          const x = x0 + 0.2 + k * 0.3;
          bells.push(new THREE.CylinderGeometry(s, s, 0.08, 20).rotateX(Math.PI / 2).translate(x, y + s * 0.4, BACK_Z + 0.4).toNonIndexed());
          bells.push(new THREE.CylinderGeometry(s, s, 0.08, 20).rotateX(Math.PI / 2).translate(x, y + s * 0.4, BACK_Z + 0.72).toNonIndexed());
          bells.push(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8).rotateX(Math.PI / 2).translate(x, y + s * 0.4, BACK_Z + 0.56).toNonIndexed());
        }
      }
    }
    return {
      col,
      left,
      backUpper,
      right,
      bars: mergeGeometries(bars),
      frames: mergeGeometries(frames),
      pil: mergeGeometries(pil),
      balcony,
      rail: mergeGeometries(rail),
      vault,
      arches: mergeGeometries(arches),
      rivets,
      rackFrame: mergeGeometries(rackFrame),
      bells: mergeGeometries(bells),
    };
  }, []);

  const rivetMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), M.bronze, parts.rivets.length);
    const m = new THREE.Matrix4();
    parts.rivets.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    return mesh;
  }, [parts, M]);

  // the painted view through the arches: crop the Acropolis from the 2D backdrop
  const viewTex = useMemo(() => {
    const t = view.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(430 / 887, 220 / 1774);
    t.offset.set(243 / 887, 1 - 625 / 1774);
    t.needsUpdate = true;
    return t;
  }, [view]);

  // kept out of the sun's path to the platform (it comes through the window at z = -3)
  const columns: [number, number][] = [[-3.9, 0.5], [3.9, -1.3], [-3.9, -3.9], [3.9, -4.7], [3.9, 2.3]];
  const colH = 8.6;

  return (
    <group>
      {debug.includes('noreflect') || debug.includes('flatfloor') ? (
        <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} receiveShadow>
          <planeGeometry args={[40, 40]} />
          {debug.includes('flatfloor') ? <meshBasicMaterial color="#402010" /> : <meshStandardMaterial color="#6A3020" roughness={0.4} />}
        </mesh>
      ) : (
        <ReflectiveFloor />
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y + 0.002, 0]} receiveShadow>
        <ringGeometry args={[2.62, 2.7, 160]} />
        <primitive object={M.gold} attach="material" />
      </mesh>
      {/* lifting platform: oak centre, rubber wings, bronze trim */}
      <group visible={!debug.includes('noplatform')}>
      <mesh position={[0, -0.0225, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.3, 0.045, 2.4]} />
        <primitive object={M.platform} attach="material" />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.975, -0.0225, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.65, 0.045, 2.4]} />
          <primitive object={M.rubber} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, -0.025, 0]} receiveShadow>
        <boxGeometry args={[2.68, 0.036, 2.48]} />
        <primitive object={M.trim} attach="material" />
      </mesh>
      </group>

      {/* walls */}
      <mesh geometry={parts.left} material={M.marbleWall} castShadow receiveShadow />
      <mesh geometry={parts.bars} material={M.iron} castShadow />
      <mesh geometry={parts.frames} material={M.bronze} castShadow />
      <mesh geometry={parts.right} material={M.redWall} receiveShadow />
      {/* back wall: marble lower panels, frieze, balcony, arches */}
      <mesh position={[0, 1.7, BACK_Z - 0.3]} receiveShadow castShadow>
        <boxGeometry args={[18, 3.6, 0.6]} />
        <primitive object={M.marbleWall} attach="material" />
      </mesh>
      <mesh position={[0, 3.25, BACK_Z + 0.06]} receiveShadow>
        <boxGeometry args={[18, 0.42, 0.14]} />
        <primitive object={M.frieze} attach="material" />
      </mesh>
      <mesh geometry={parts.pil} material={M.bronze} castShadow receiveShadow />
      <mesh geometry={parts.balcony} material={M.darkBronze} castShadow receiveShadow />
      <mesh geometry={parts.rail} material={M.iron} castShadow />
      <mesh geometry={parts.backUpper} material={M.redWall} castShadow receiveShadow />
      <mesh geometry={parts.vault} material={M.vault} receiveShadow />
      <mesh geometry={parts.arches} material={M.darkBronze} castShadow />
      <primitive object={rivetMesh} />
      <mesh geometry={parts.rackFrame} material={M.bronze} castShadow receiveShadow />
      <mesh geometry={parts.bells} material={M.plate} castShadow receiveShadow />

      {/* skies */}
      <mesh position={[0, 8.6, -24]} scale={[48, 24.5, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={viewTex} color={new THREE.Color(1.5, 1.4, 1.35)} />
      </mesh>
      <mesh position={[-13, 5, -1]} rotation-y={Math.PI / 2} scale={[24, 14, 1]}>
        <planeGeometry />
        <primitive object={M.sideSky} attach="material" />
      </mesh>

      {/* columns */}
      <group visible={!debug.includes('nocols')}>
      {columns.map(([x, z], i) => (
        <group key={i} position={[x, FLOOR_Y, z]}>
          <mesh geometry={parts.col.base} material={M.marbleCol} castShadow receiveShadow />
          <mesh geometry={parts.col.shaft} material={M.marbleCol} position={[0, 0.55 + (colH - 1.3) / 2, 0]} scale={[1, colH - 1.3, 1]} castShadow receiveShadow />
          <mesh geometry={parts.col.capital} material={M.bronze} position={[0, colH - 0.75, 0]} castShadow receiveShadow />
        </group>
      ))}
      </group>

      {/* chalk bowl on a marble stand, beside the platform */}
      <group position={[1.75, FLOOR_Y, -0.9]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.9, 32]} />
          <primitive object={M.marbleCol} attach="material" />
        </mesh>
        <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#B57A45" metalness={1} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.93, 0]} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[0.27, 24, 12]} />
          <primitive object={M.chalk} attach="material" />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- lights and environment
export const HallLights: React.FC<{ boost: number }> = ({ boost }) => {
  const scene = useThree((s) => s.scene);
  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight('#FFD3A6', 5.2);
    l.position.copy(SUN_DIR.clone().multiplyScalar(-22));
    l.target.position.set(0, 0, 0);
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -11;
    c.right = 11;
    c.top = 11;
    c.bottom = -11;
    c.near = 4;
    c.far = 48;
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.07;
    l.shadow.radius = 2.5;
    return l;
  }, []);
  useLayoutEffect(() => {
    scene.add(sun.target);
    return () => {
      scene.remove(sun.target);
    };
  }, [scene, sun]);
  sun.intensity = 5.2 * boost;
  return (
    <>
      <primitive object={sun} />
      <hemisphereLight args={['#F2CDB8', '#8A5A44', 0.9]} />
      <directionalLight position={[5, 3.2, -6]} intensity={0.55} color="#F0C8EC" />
      <directionalLight position={[2, 3, 6]} intensity={0.85} color="#FFE2CC" />
    </>
  );
};

/** Capture the empty hall into an environment map so chrome and gold reflect it. */
export const HallEnvironment: React.FC<{ hide: React.RefObject<THREE.Object3D | null>[]; overlay: THREE.Scene }> = ({ hide, overlay }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.1, 60, rt);
    cam.position.set(0, 1.6, 1.2);
    const objs = hide.map((r) => r.current).filter((o): o is THREE.Object3D => !!o);
    const vis = objs.map((o) => o.visible);
    objs.forEach((o) => (o.visible = false));
    // the sky planes are HDR-bright on screen; in reflections they would blow
    // out every polished surface, so they are captured at a fraction of that
    const dimmed: [THREE.MeshBasicMaterial, THREE.Color][] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && (m as THREE.Material).type === 'MeshBasicMaterial' && Math.max(m.color.r, m.color.g, m.color.b) > 1 && !dimmed.some(([d]) => d === m)) {
        dimmed.push([m, m.color.clone()]);
        m.color.multiplyScalar(0.38);
      }
    });
    cam.update(gl, scene);
    dimmed.forEach(([m, c]) => m.color.copy(c));
    objs.forEach((o, i) => (o.visible = vis[i]));
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromCubemap(rt.texture).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    overlay.environment = env;
    overlay.environmentIntensity = 1.1;
    pmrem.dispose();
    rt.dispose();
    return () => {
      scene.environment = null;
      overlay.environment = null;
      env.dispose();
    };
  }, [gl, scene, hide, overlay]);
  return null;
};
