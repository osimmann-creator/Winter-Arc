import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AirDef, Beam, Mote } from '../kit/Atmosphere';
import { ReflectiveFloor, wallWithHoles } from '../kit/build';
import { rng } from '../kit/math';
import { gymSignTexture, plasterTexture, snowViewTexture, tileTexture } from '../kit/textures';

// The Winter Arc Gym from the 2D clips (PullUp, BoxJump, RopeStorm, GainsShake,
// HammerTime): a bright cream room, tall arched windows onto snowy pines, the
// purple WINTER ARC GYM sign, dark slate tiles, racks and pendant lamps.

export const WG = {
  floorY: 0,
  backZ: -5.5,
  wallX: 6,
  height: 6.2,
  windows: [-2.75, 0, 2.75],
  winW: 1.9,
  winY0: 0.9,
  winY1: 5.3,
};
export const WINTER_SUN = new THREE.Vector3(0.361, -0.331, 0.872).normalize(); // the way the light travels

let MATS: ReturnType<typeof makeMats> | null = null;
const makeMats = () => {
  const plaster = plasterTexture().clone();
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  plaster.repeat.set(3, 2);
  plaster.needsUpdate = true;
  return {
    wall: new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92 }),
    trim: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }),
    lavender: new THREE.MeshStandardMaterial({ color: '#B9A6EE', roughness: 0.75 }),
    purple: new THREE.MeshStandardMaterial({ color: '#6A4CD0', roughness: 0.55 }),
    steel: new THREE.MeshStandardMaterial({ color: '#2B2A36', metalness: 0.75, roughness: 0.42 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#E8EAF0', metalness: 1, roughness: 0.16 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#25252E', roughness: 0.85 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#F1ECF6', roughness: 0.9, side: THREE.BackSide }),
    view: new THREE.MeshBasicMaterial({ map: snowViewTexture(), color: new THREE.Color(1.45, 1.45, 1.5) }),
    sign: new THREE.MeshStandardMaterial({ map: gymSignTexture(), roughness: 0.5 }),
    shade: new THREE.MeshStandardMaterial({ color: '#6A4CD0', roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2.0) }),
    ball: new THREE.MeshStandardMaterial({ color: '#7254DC', roughness: 0.6 }),
    orange: new THREE.MeshStandardMaterial({ color: '#F2853A', roughness: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3F8A5C', roughness: 0.7 }),
    pot: new THREE.MeshStandardMaterial({ color: '#E8DCCB', roughness: 0.8 }),
  };
};
export const winterMats = () => (MATS ??= makeMats());

/** Decorative pendant lamps (the Box Jump lamp is its own prop). */
export const LAMPS: [number, number][] = [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.9], [2.6, 1.9]];

export const WinterGym: React.FC<{ debug?: string; f?: number }> = ({ debug = '' }) => {
  const M = winterMats();
  const parts = useMemo(() => {
    const back = wallWithHoles(-WG.wallX, WG.wallX, WG.floorY, WG.height, WG.windows.map((c) => ({ c, w: WG.winW, y0: WG.winY0, y1: WG.winY1, arch: true })), 0.45);
    back.translate(0, 0, WG.backZ - 0.45);
    const bars: THREE.BufferGeometry[] = [];
    const frames: THREE.BufferGeometry[] = [];
    for (const c of WG.windows) {
      bars.push(new THREE.BoxGeometry(0.06, WG.winY1 - WG.winY0 - 0.9, 0.08).translate(c, (WG.winY0 + WG.winY1 - 0.95) / 2, WG.backZ - 0.2).toNonIndexed());
      for (const y of [2.2, 3.5]) bars.push(new THREE.BoxGeometry(WG.winW, 0.06, 0.08).translate(c, y, WG.backZ - 0.2).toNonIndexed());
      const pts: THREE.Vector3[] = [];
      const r = WG.winW / 2;
      const yc = WG.winY1 - r;
      pts.push(new THREE.Vector3(c - r, WG.winY0, 0), new THREE.Vector3(c - r, yc, 0));
      for (let k = 1; k < 16; k++) {
        const a = Math.PI - (k / 16) * Math.PI;
        pts.push(new THREE.Vector3(c + Math.cos(a) * r, yc + Math.sin(a) * r, 0));
      }
      pts.push(new THREE.Vector3(c + r, yc, 0), new THREE.Vector3(c + r, WG.winY0, 0));
      frames.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 64, 0.07, 8, false).translate(0, 0, WG.backZ + 0.02).toNonIndexed());
      frames.push(new THREE.BoxGeometry(WG.winW + 0.3, 0.1, 0.3).translate(c, WG.winY0 - 0.02, WG.backZ + 0.08).toNonIndexed());
    }
    // dumbbell rack on the left wall, squat rack and kettlebells on the right
    const r = rng(55);
    const steel: THREE.BufferGeometry[] = [];
    const bells: THREE.BufferGeometry[] = [];
    const accent: THREE.BufferGeometry[] = [];
    const x0 = -WG.wallX + 0.45;
    for (const y of [0.5, 0.95]) steel.push(new THREE.BoxGeometry(0.5, 0.05, 2.6).translate(x0, y, -1.0).toNonIndexed());
    for (const z of [-2.25, 0.25]) steel.push(new THREE.BoxGeometry(0.5, 1.0, 0.05).translate(x0, 0.5, z).toNonIndexed());
    for (const y of [0.6, 1.05])
      for (let k = 0; k < 6; k++) {
        const s = 0.07 + r() * 0.035;
        const z = -2.0 + k * 0.4;
        for (const dx of [-0.13, 0.13]) bells.push(new THREE.CylinderGeometry(s, s, 0.08, 18).rotateZ(Math.PI / 2).translate(x0 + dx, y + s * 0.5, z).toNonIndexed());
        accent.push(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8).rotateZ(Math.PI / 2).translate(x0, y + s * 0.5, z).toNonIndexed());
      }
    const rx = WG.wallX - 0.9;
    for (const [dx, dz] of [[-0.55, -0.6], [0.55, -0.6], [-0.55, 0.6], [0.55, 0.6]]) steel.push(new THREE.BoxGeometry(0.08, 2.4, 0.08).translate(rx + dx, 1.2, -2.8 + dz).toNonIndexed());
    for (const dz of [-0.6, 0.6]) steel.push(new THREE.BoxGeometry(1.2, 0.08, 0.08).translate(rx, 2.36, -2.8 + dz).toNonIndexed());
    for (const dx of [-0.55, 0.55]) steel.push(new THREE.BoxGeometry(0.08, 0.08, 1.2).translate(rx + dx, 2.36, -2.8).toNonIndexed());
    accent.push(new THREE.CylinderGeometry(0.016, 0.016, 2.0, 10).rotateX(Math.PI / 2).translate(rx - 0.45, 1.4, -2.8).toNonIndexed());
    for (const dz of [-0.75, 0.75]) bells.push(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 28).rotateX(Math.PI / 2).translate(rx - 0.45, 1.4, -2.8 + dz).toNonIndexed());
    const kb: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) {
      const s = 0.11 + k * 0.02;
      kb.push(new THREE.SphereGeometry(s, 18, 12).translate(WG.wallX - 0.5, s, 0.6 + k * 0.45).toNonIndexed());
      kb.push(new THREE.TorusGeometry(s * 0.55, s * 0.13, 8, 18, Math.PI).translate(WG.wallX - 0.5, s * 1.75, 0.6 + k * 0.45).toNonIndexed());
    }
    return {
      back,
      bars: mergeGeometries(bars),
      frames: mergeGeometries(frames),
      steel: mergeGeometries(steel),
      bells: mergeGeometries(bells),
      accent: mergeGeometries(accent),
      kb: mergeGeometries(kb),
      lampShade: new THREE.CylinderGeometry(0.16, 0.42, 0.34, 32, 1, true),
    };
  }, []);
  return (
    <group>
      {debug.includes('noreflect') ? (
        <mesh rotation-x={-Math.PI / 2} position-y={WG.floorY} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial map={tileTexture()} roughness={0.6} />
        </mesh>
      ) : (
        <ReflectiveFloor texture={tileTexture()} repeat={9} y={WG.floorY} roughness={0.5} strength={0.55} />
      )}
      {/* rubber training mat with a purple border */}
      <mesh position={[0, 0.006, 0.2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.6, 3.4]} />
        <primitive object={M.rubber} attach="material" />
      </mesh>
      <mesh position={[0, 0.004, 0.2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.8, 3.6]} />
        <primitive object={M.purple} attach="material" />
      </mesh>
      {/* back wall with the windows, the snowy view, the sign */}
      <mesh geometry={parts.back} material={M.wall} castShadow receiveShadow />
      <mesh geometry={parts.bars} material={M.trim} castShadow />
      <mesh geometry={parts.frames} material={M.trim} castShadow receiveShadow />
      <mesh position={[0, 3.2, -14]} scale={[30, 15, 1]}>
        <planeGeometry />
        <primitive object={M.view} attach="material" />
      </mesh>
      <mesh position={[0, WG.height - 0.42, WG.backZ + 0.06]}>
        <planeGeometry args={[3.2, 0.5]} />
        <primitive object={M.sign} attach="material" />
      </mesh>
      <mesh position={[0, WG.height - 0.12, WG.backZ + 0.05]}>
        <boxGeometry args={[2 * WG.wallX, 0.24, 0.1]} />
        <primitive object={M.lavender} attach="material" />
      </mesh>
      {/* side walls, front wall, ceiling */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (WG.wallX + 0.2), WG.height / 2, 0.5]} receiveShadow castShadow>
            <boxGeometry args={[0.4, WG.height, 12.5]} />
            <primitive object={M.wall} attach="material" />
          </mesh>
          <mesh position={[s * (WG.wallX - 0.02), 0.12, 0.5]}>
            <boxGeometry args={[0.06, 0.24, 12.5]} />
            <primitive object={M.purple} attach="material" />
          </mesh>
          <mesh position={[s * (WG.wallX - 0.02), WG.height - 0.12, 0.5]}>
            <boxGeometry args={[0.06, 0.24, 12.5]} />
            <primitive object={M.lavender} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, WG.height / 2, 6.8]} receiveShadow>
        <boxGeometry args={[2 * WG.wallX + 0.8, WG.height, 0.4]} />
        <primitive object={M.wall} attach="material" />
      </mesh>
      <mesh position={[0, WG.height, 0.5]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[2 * WG.wallX + 1, 13]} />
        <meshStandardMaterial color="#F1ECF6" roughness={0.9} />
      </mesh>
      {/* equipment */}
      <mesh geometry={parts.steel} material={M.steel} castShadow receiveShadow />
      <mesh geometry={parts.bells} material={M.rubber} castShadow receiveShadow />
      <mesh geometry={parts.accent} material={M.chrome} castShadow />
      <mesh geometry={parts.kb} material={M.purple} castShadow receiveShadow />
      <mesh position={[-WG.wallX + 0.6, 0.18, 1.4]} castShadow receiveShadow>
        <sphereGeometry args={[0.18, 24, 16]} />
        <primitive object={M.ball} attach="material" />
      </mesh>
      <mesh position={[-WG.wallX + 0.9, 0.13, 1.85]} castShadow receiveShadow>
        <sphereGeometry args={[0.13, 24, 16]} />
        <primitive object={M.orange} attach="material" />
      </mesh>
      {/* a potted plant in the corner */}
      <group position={[WG.wallX - 0.7, 0, WG.backZ + 0.8]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.2, 0.5, 24]} />
          <primitive object={M.pot} attach="material" />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * 2.4) * 0.16, 0.85 + (i % 3) * 0.18, Math.cos(i * 2.4) * 0.16]} rotation={[Math.cos(i) * 0.6, i, Math.sin(i * 1.7) * 0.6]} castShadow>
            <sphereGeometry args={[0.16, 12, 8]} />
            <primitive object={M.leaf} attach="material" />
          </mesh>
        ))}
      </group>
      {/* pendant lamps */}
      {LAMPS.map(([x, z], i) => (
        <group key={i} position={[x, WG.height, z]}>
          <mesh position={[0, -0.7, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 1.4, 6]} />
            <primitive object={M.steel} attach="material" />
          </mesh>
          <mesh geometry={parts.lampShade} material={M.shade} position={[0, -1.55, 0]} castShadow />
          <mesh position={[0, -1.68, 0]}>
            <sphereGeometry args={[0.1, 16, 10]} />
            <primitive object={M.bulb} attach="material" />
          </mesh>
        </group>
      ))}
      <WinterBench />
    </group>
  );
};

const WinterBench: React.FC = () => {
  const M = winterMats();
  const geo = useMemo(() => new RoundedBoxGeometry(1.3, 0.12, 0.34, 3, 0.04), []);
  return (
    <group position={[-3.6, 0, -3.4]} rotation-y={0.3}>
      <mesh geometry={geo} position={[0, 0.46, 0]} material={M.purple} castShadow receiveShadow />
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.4, 0.3]} />
          <primitive object={M.steel} attach="material" />
        </mesh>
      ))}
    </group>
  );
};

export const WinterLights: React.FC<{ boost: number; f?: number }> = ({ boost }) => {
  const scene = useThree((s) => s.scene);
  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight('#FFF1DC', 4.2);
    l.position.copy(WINTER_SUN.clone().multiplyScalar(-20));
    l.target.position.set(0, 0, 0);
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -9;
    c.right = 9;
    c.top = 9;
    c.bottom = -9;
    c.near = 3;
    c.far = 45;
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
  sun.intensity = 4.2 * boost;
  return (
    <>
      <primitive object={sun} />
      <hemisphereLight args={['#F4F1FF', '#7A6A8E', 1.25]} />
      <directionalLight position={[2.5, 4, 7]} intensity={1.5} color="#FFF0E2" />
      <directionalLight position={[-6, 3, 2]} intensity={0.45} color="#D9CCFF" />
      {LAMPS.map(([x, z], i) => (
        <pointLight key={i} position={[x, WG.height - 1.75, z]} intensity={2.2} distance={5} decay={1.8} color="#FFD8A8" />
      ))}
    </>
  );
};

// ---------------------------------------------------------------- light shafts through the back windows
const winterBeams = (): Beam[] => {
  const out: Beam[] = [];
  const r = rng(515);
  for (const c of WG.windows) {
    for (const y of [1.6, 2.8, 4.0]) {
      const start = new THREE.Vector3(c + (r() - 0.5) * 0.4, y + (r() - 0.5) * 0.3, WG.backZ + 0.1);
      const len = (start.y - WG.floorY) / -WINTER_SUN.y;
      out.push({ start, dir: WINTER_SUN.clone(), len, width: 1.4 + r() * 0.4, k: 0.55 + r() * 0.4 });
    }
  }
  return out;
};

const winterMotes = (beams: Beam[]): Mote[] => {
  const r = rng(616);
  return Array.from({ length: 380 }, () => {
    const b = beams[Math.floor(r() * beams.length)];
    const p = b.start.clone().add(new THREE.Vector3((r() - 0.5) * b.width, (r() - 0.5) * 0.8, 0));
    p.addScaledVector(b.dir, r() * b.len * 0.9);
    return { p, seed: r() * 100, size: 0.007 + r() * 0.016, tw: r() * 6.28, b: 0.25 + r() * 0.6 };
  });
};

export const winterAir = (): AirDef => {
  const beams = winterBeams();
  return { beams, beamColor: '#FFF0D8', motes: winterMotes(beams), moteTint: [1.6, 1.5, 1.35] };
};
