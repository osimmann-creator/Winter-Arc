import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { cameraAt } from './CameraRig';
import { FLOOR_Y, SUN_DIR } from './Hall';
import { actionTime, clamp, noise1, rng } from './math';
import { Pose, SK, poseAt } from './pose';
import { glintTexture, shaftTexture, softDot } from './textures';

// Light shafts from the side windows, dust drifting in them, chalk and floor
// dust on every impact, and star glints on the metal.

const WINDOWS = [-5.6, -3.0, -0.4, 2.2];

// ---------------------------------------------------------------- god rays
const shaftMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { map: { value: shaftTexture() }, uScroll: { value: 0 }, uIntensity: { value: 1 }, uColor: { value: new THREE.Color('#FFB878') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uScroll; uniform float uIntensity; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float a = texture2D(map, vUv).r;
        float b = texture2D(map, vec2(fract(vUv.x * 0.73 + 0.31), fract(vUv.y * 0.5 + uScroll))).r;
        float v = a * (0.55 + 0.6 * b) * uIntensity;
        gl_FragColor = vec4(uColor * v, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

type Beam = { start: THREE.Vector3; len: number; width: number; k: number };
const BEAMS: Beam[] = (() => {
  const out: Beam[] = [];
  const r = rng(301);
  for (const c of WINDOWS) {
    for (const y of [2.2, 4.0, 5.8, 7.4]) {
      const start = new THREE.Vector3(-7.4, y + (r() - 0.5) * 0.4, c + (r() - 0.5) * 0.3);
      const len = (start.y - FLOOR_Y) / -SUN_DIR.y;
      out.push({ start, len, width: 1.25 + r() * 0.45, k: (c === -3.0 ? 1.25 : 0.85) * (0.6 + r() * 0.5) });
    }
  }
  return out;
})();

const GodRays: React.FC<{ f: number; intensity: number }> = ({ f, intensity }) => {
  const { meshes, mats } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // v along +y
    const mats = BEAMS.map(() => shaftMat());
    const meshes = BEAMS.map((_, i) => {
      const m = new THREE.Mesh(geo, mats[i]);
      m.matrixAutoUpdate = false;
      m.frustumCulled = false;
      m.renderOrder = 5;
      return m;
    });
    return { meshes, mats };
  }, []);
  useLayoutEffect(() => {
    const cam = cameraAt(f).pos;
    BEAMS.forEach((b, i) => {
      const axis = SUN_DIR.clone();
      const mid = b.start.clone().addScaledVector(axis, b.len / 2);
      const toCam = cam.clone().sub(mid);
      const n = toCam.addScaledVector(axis, -toCam.dot(axis)).normalize();
      const right = new THREE.Vector3().crossVectors(axis, n).normalize();
      const m = new THREE.Matrix4().makeBasis(right.multiplyScalar(b.width), axis.clone().multiplyScalar(b.len), n);
      m.setPosition(b.start);
      meshes[i].matrix.copy(m);
      meshes[i].matrixWorldNeedsUpdate = true;
      mats[i].uniforms.uScroll.value = f * 0.0016 + i * 0.137;
      mats[i].uniforms.uIntensity.value = 0.055 * b.k * intensity;
    });
  }, [f, intensity, meshes, mats]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------- point sprites
const pointsMat = (map: THREE.Texture, additive: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uScale: { value: 600 } },
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 tint; varying float vAlpha; varying vec3 vTint;
      uniform float uScale;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * uScale / -mv.z, 0.0, 420.0);
        vAlpha = alpha; vTint = tint;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D map; varying float vAlpha; varying vec3 vTint;
      void main(){
        vec4 t = texture2D(map, gl_PointCoord);
        float a = t.a * vAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vTint * a, ${additive ? '1.0' : 'a'});
      }`,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });

const makePoints = (n: number, map: THREE.Texture, additive: boolean) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, pointsMat(map, additive));
  p.frustumCulled = false;
  return p;
};

// ---------------------------------------------------------------- dust in the light
const MOTES = (() => {
  const r = rng(404);
  return Array.from({ length: 520 }, () => {
    const c = WINDOWS[Math.floor(r() * WINDOWS.length)];
    const start = new THREE.Vector3(-7.4, 1.4 + r() * 6.9, c + (r() - 0.5) * 1.5);
    const sMax = (start.y - FLOOR_Y - 0.1) / -SUN_DIR.y;
    const p = start.addScaledVector(SUN_DIR, r() * sMax);
    return { p, seed: r() * 100, size: 0.008 + r() * 0.02, tw: r() * 6.28, b: 0.3 + r() * 0.7 };
  });
})();

const Dust: React.FC<{ f: number; height: number }> = ({ f, height }) => {
  const pts = useMemo(() => makePoints(MOTES.length, softDot(), true), []);
  useLayoutEffect(() => {
    (pts.material as THREE.ShaderMaterial).uniforms.uScale.value = height * 1.5;
    const g = pts.geometry;
    const pos = g.attributes.position.array as Float32Array;
    const size = g.attributes.size.array as Float32Array;
    const alpha = g.attributes.alpha.array as Float32Array;
    const tint = g.attributes.tint.array as Float32Array;
    const t = f / 30;
    MOTES.forEach((m, i) => {
      pos[i * 3] = m.p.x + noise1(t * 0.35 + m.seed, 1) * 0.25;
      pos[i * 3 + 1] = m.p.y + noise1(t * 0.3 + m.seed, 2) * 0.2 - t * 0.04;
      pos[i * 3 + 2] = m.p.z + noise1(t * 0.33 + m.seed, 3) * 0.25;
      size[i] = m.size;
      alpha[i] = m.b * (0.55 + 0.45 * Math.sin(t * 2.2 + m.tw));
      tint[i * 3] = 1.9;
      tint[i * 3 + 1] = 1.45;
      tint[i * 3 + 2] = 1.0;
    });
    for (const k of ['position', 'size', 'alpha', 'tint']) g.attributes[k].needsUpdate = true;
  }, [f, pts, height]);
  return <primitive object={pts} />;
};

// ---------------------------------------------------------------- chalk and floor dust
type Burst = { t0: number; at: (p: Pose) => THREE.Vector3[]; n: number; speed: number; up: number; spread: number; drag: number; life: number; size: number; grow: number; alpha: number; floor?: boolean };
const BURSTS: Burst[] = [
  // plates break from the floor
  { t0: 23, at: () => [-0.75, 0.75].flatMap((x) => [new THREE.Vector3(x, 0.02, 0.215)]), n: 40, speed: 0.9, up: 0.12, spread: 1, drag: 3.2, life: 26, size: 0.08, grow: 2.6, alpha: 0.2, floor: true },
  // feet stomp into the catch
  { t0: 49.5, at: (p) => [p.L.ankle, p.R.ankle].map((a) => new THREE.Vector3(a.x, 0.02, a.z + 0.05)), n: 26, speed: 0.8, up: 0.1, spread: 1, drag: 3.5, life: 20, size: 0.06, grow: 2.4, alpha: 0.18, floor: true },
  // chalk off the hands when the bar lands in the rack
  { t0: 50.5, at: (p) => [p.L.grip, p.R.grip], n: 46, speed: 1.1, up: 0.25, spread: 1, drag: 3.6, life: 26, size: 0.045, grow: 4.0, alpha: 0.24 },
  // jerk stomp
  { t0: 75.5, at: (p) => [p.L.ankle, p.R.ankle].map((a) => new THREE.Vector3(a.x, 0.02, a.z + 0.05)), n: 30, speed: 1.0, up: 0.1, spread: 1, drag: 3.2, life: 12, size: 0.06, grow: 2.2, alpha: 0.16, floor: true },
  // THE cloud: chalk explodes off both hands at the lockout
  { t0: 76, at: (p) => [p.L.grip, p.R.grip], n: 260, speed: 2.0, up: 0.3, spread: 1, drag: 2.6, life: 25, size: 0.035, grow: 6.5, alpha: 0.13 },
];
const BURST_SEEDS = BURSTS.map((b, k) => {
  const r = rng(900 + k);
  return Array.from({ length: b.n * 2 }, () => {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(r() * 2 - 1);
    const dir = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    if (b.floor) dir.y = Math.abs(dir.y) * 0.35;
    return { dir, v: 0.35 + r() * 0.65, s: 0.6 + r() * 0.8, delay: r() * 1.5, spin: r() };
  });
});
const CHALK_N = BURSTS.reduce((a, b) => a + b.n * 2, 0);
let ORIGINS: THREE.Vector3[][] | null = null;
// emitters are sampled at each burst's own moment, so a cloud stays where it was born
const burstOrigins = () => (ORIGINS ??= BURSTS.map((b) => b.at(poseAt(b.t0))));

const Chalk: React.FC<{ f: number; pose: Pose; height: number }> = ({ f, pose, height }) => {
  const pts = useMemo(() => makePoints(CHALK_N, softDot(), false), []);
  useLayoutEffect(() => {
    (pts.material as THREE.ShaderMaterial).uniforms.uScale.value = height * 1.5;
    const t = actionTime(f);
    const g = pts.geometry;
    const pos = g.attributes.position.array as Float32Array;
    const size = g.attributes.size.array as Float32Array;
    const alpha = g.attributes.alpha.array as Float32Array;
    const tint = g.attributes.tint.array as Float32Array;
    let i = 0;
    BURSTS.forEach((b, k) => {
      const origins = burstOrigins()[k];
      const seeds = BURST_SEEDS[k];
      for (let j = 0; j < b.n * 2; j++, i++) {
        const sd = seeds[j];
        const age = t - b.t0 - sd.delay * 0.4;
        const o = origins[j % origins.length];
        if (age <= 0 || age > b.life) {
          alpha[i] = 0;
          size[i] = 0;
          pos[i * 3] = o.x;
          pos[i * 3 + 1] = o.y;
          pos[i * 3 + 2] = o.z;
          continue;
        }
        const sec = age / 30;
        const travel = ((1 - Math.exp(-b.drag * sec)) / b.drag) * b.speed * sd.v;
        pos[i * 3] = o.x + sd.dir.x * travel + noise1(sec * 2 + sd.spin * 9, 1) * 0.04 * sec * 3;
        pos[i * 3 + 1] = Math.max(0.01, o.y + sd.dir.y * travel + b.up * sec - (b.floor ? 0 : 0.18) * sec * sec);
        pos[i * 3 + 2] = o.z + sd.dir.z * travel + noise1(sec * 2 + sd.spin * 7, 2) * 0.04 * sec * 3;
        const life = age / b.life;
        size[i] = b.size * sd.s * (1 + b.grow * Math.pow(life, 0.6));
        alpha[i] = b.alpha * clamp(age / 1.5) * Math.pow(1 - life, 1.8) * (0.55 + 0.45 * sd.v);
        const warm = b.floor ? 0.82 : 1.55;
        tint[i * 3] = warm * 1.04;
        tint[i * 3 + 1] = warm * (b.floor ? 0.9 : 1.0);
        tint[i * 3 + 2] = warm * (b.floor ? 0.78 : 0.94);
      }
    });
    for (const k of ['position', 'size', 'alpha', 'tint']) g.attributes[k].needsUpdate = true;
  }, [f, pose, pts, height]);
  return <primitive object={pts} />;
};

// ---------------------------------------------------------------- glints
const GLINTS: { f: number; at: (p: Pose) => THREE.Vector3; size: number }[] = [
  { f: 5, at: (p) => p.bar.clone().add(new THREE.Vector3(0.9, 0.02, 0.04)), size: 0.5 },
  { f: 30, at: (p) => p.L.grip.clone().add(new THREE.Vector3(0.02, 0.09, 0.05)), size: 0.28 },
  { f: 82, at: (p) => p.bar.clone().add(new THREE.Vector3(-0.93, 0.03, 0.03)), size: 0.75 },
  { f: 86, at: (p) => p.bar.clone().add(new THREE.Vector3(0.36, 0.02, 0.02)), size: 0.4 },
  // the wink: a star off the eye
  { f: 119.5, at: (p) => headPoint(p, new THREE.Vector3(-0.15, 0.08, 0.24)), size: 0.36 },
  { f: 125, at: (p) => p.pelvis.clone().add(new THREE.Vector3(0.0, 0.07, 0.19).applyQuaternion(p.torsoQ)), size: 0.26 },
];

/** A point in head space, in the world. */
const headPoint = (p: Pose, local: THREE.Vector3) => {
  const inHead = SK.head.clone().sub(SK.neck).add(local).applyQuaternion(p.headQ).add(SK.neck);
  return inHead.applyQuaternion(p.torsoQ).add(p.pelvis);
};

const Glints: React.FC<{ f: number; pose: Pose }> = ({ f, pose }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: glintTexture(), color: new THREE.Color(3.2, 2.7, 2.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), []);
  return (
    <>
      {GLINTS.map((g, i) => {
        const age = f - g.f;
        if (age < 0 || age > 9) return null;
        const k = Math.sin((age / 9) * Math.PI);
        const p = g.at(pose);
        return <sprite key={i} material={mat} position={p} scale={[g.size * k, g.size * k, 1]} material-rotation={age * 0.08} renderOrder={20} />;
      })}
    </>
  );
};

export const Atmosphere: React.FC<{ f: number; pose: Pose; height: number; sunBoost: number }> = ({ f, pose, height, sunBoost }) => (
  <>
    <GodRays f={f} intensity={sunBoost} />
    <Dust f={f} height={height} />
    <Chalk f={f} pose={pose} height={height} />
    <Glints f={f} pose={pose} />
  </>
);

