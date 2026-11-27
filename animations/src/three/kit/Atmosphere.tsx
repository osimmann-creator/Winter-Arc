import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { clamp, noise1, rng } from './math';
import { glintTexture, shaftTexture, softDot } from './textures';

// Light shafts from a set's windows, dust drifting in them, chalk and floor
// dust on the clip's impacts, and star glints on metal. The set supplies the
// beams and motes; the clip supplies the bursts and glints.

// ---------------------------------------------------------------- god rays
export type Beam = { start: THREE.Vector3; dir: THREE.Vector3; len: number; width: number; k: number };

const shaftMat = (color: THREE.Color) =>
  new THREE.ShaderMaterial({
    uniforms: { map: { value: shaftTexture() }, uScroll: { value: 0 }, uIntensity: { value: 1 }, uColor: { value: color } },
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

const GodRays: React.FC<{ f: number; beams: Beam[]; color: string; intensity: number; camPos: THREE.Vector3 }> = ({ f, beams, color, intensity, camPos }) => {
  const { meshes, mats } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // v along +y
    const mats = beams.map(() => shaftMat(new THREE.Color(color)));
    const meshes = beams.map((_, i) => {
      const m = new THREE.Mesh(geo, mats[i]);
      m.matrixAutoUpdate = false;
      m.frustumCulled = false;
      m.renderOrder = 5;
      return m;
    });
    return { meshes, mats };
  }, [beams, color]);
  useLayoutEffect(() => {
    beams.forEach((b, i) => {
      const axis = b.dir.clone().normalize();
      const mid = b.start.clone().addScaledVector(axis, b.len / 2);
      const toCam = camPos.clone().sub(mid);
      const n = toCam.addScaledVector(axis, -toCam.dot(axis)).normalize();
      const right = new THREE.Vector3().crossVectors(axis, n).normalize();
      const m = new THREE.Matrix4().makeBasis(right.multiplyScalar(b.width), axis.clone().multiplyScalar(b.len), n);
      m.setPosition(b.start);
      meshes[i].matrix.copy(m);
      meshes[i].matrixWorldNeedsUpdate = true;
      mats[i].uniforms.uScroll.value = f * 0.0016 + i * 0.137;
      mats[i].uniforms.uIntensity.value = 0.055 * b.k * intensity;
    });
  }, [f, intensity, meshes, mats, beams, camPos]);
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
export type Mote = { p: THREE.Vector3; seed: number; size: number; tw: number; b: number };

/** Motes scattered through the beams' volumes. */
export const motesInBeams = (beams: Beam[], n: number, floorY: number, spread: number, seed = 404): Mote[] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const b = beams[Math.floor(r() * beams.length)];
    const p = b.start.clone().add(new THREE.Vector3((r() - 0.5) * 0.3, (r() - 0.5) * spread, (r() - 0.5) * b.width));
    const sMax = Math.max(0.5, (p.y - floorY - 0.1) / Math.max(0.05, -b.dir.y));
    p.addScaledVector(b.dir, r() * Math.min(sMax, b.len));
    return { p, seed: r() * 100, size: 0.008 + r() * 0.02, tw: r() * 6.28, b: 0.3 + r() * 0.7 };
  });
};

const Dust: React.FC<{ f: number; height: number; motes: Mote[]; tint: [number, number, number] }> = ({ f, height, motes, tint }) => {
  const pts = useMemo(() => makePoints(motes.length, softDot(), true), [motes]);
  useLayoutEffect(() => {
    (pts.material as THREE.ShaderMaterial).uniforms.uScale.value = height * 1.5;
    const g = pts.geometry;
    const pos = g.attributes.position.array as Float32Array;
    const size = g.attributes.size.array as Float32Array;
    const alpha = g.attributes.alpha.array as Float32Array;
    const tn = g.attributes.tint.array as Float32Array;
    const t = f / 30;
    motes.forEach((m, i) => {
      pos[i * 3] = m.p.x + noise1(t * 0.35 + m.seed, 1) * 0.25;
      pos[i * 3 + 1] = m.p.y + noise1(t * 0.3 + m.seed, 2) * 0.2 - t * 0.04;
      pos[i * 3 + 2] = m.p.z + noise1(t * 0.33 + m.seed, 3) * 0.25;
      size[i] = m.size;
      alpha[i] = m.b * (0.55 + 0.45 * Math.sin(t * 2.2 + m.tw));
      tn[i * 3] = tint[0];
      tn[i * 3 + 1] = tint[1];
      tn[i * 3 + 2] = tint[2];
    });
    for (const k of ['position', 'size', 'alpha', 'tint']) g.attributes[k].needsUpdate = true;
  }, [f, pts, height, motes, tint]);
  return <primitive object={pts} />;
};

// ---------------------------------------------------------------- chalk and floor dust
/** A puff of chalk or floor dust at action time t0 from each origin. */
export type Burst = { t0: number; n: number; speed: number; up: number; drag: number; life: number; size: number; grow: number; alpha: number; floor?: boolean; tint?: [number, number, number] };

const seedsFor = (b: Burst, k: number) => {
  const r = rng(900 + k);
  return Array.from({ length: b.n * 2 }, () => {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(r() * 2 - 1);
    const dir = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    if (b.floor) dir.y = Math.abs(dir.y) * 0.35;
    return { dir, v: 0.35 + r() * 0.65, s: 0.6 + r() * 0.8, delay: r() * 1.5, spin: r() };
  });
};

const Chalk: React.FC<{ t: number; height: number; bursts: Burst[]; origins: THREE.Vector3[][] }> = ({ t, height, bursts, origins }) => {
  const seeds = useMemo(() => bursts.map(seedsFor), [bursts]);
  const count = bursts.reduce((a, b) => a + b.n * 2, 0);
  const pts = useMemo(() => makePoints(Math.max(1, count), softDot(), false), [count]);
  useLayoutEffect(() => {
    (pts.material as THREE.ShaderMaterial).uniforms.uScale.value = height * 1.5;
    const g = pts.geometry;
    const pos = g.attributes.position.array as Float32Array;
    const size = g.attributes.size.array as Float32Array;
    const alpha = g.attributes.alpha.array as Float32Array;
    const tint = g.attributes.tint.array as Float32Array;
    let i = 0;
    bursts.forEach((b, k) => {
      const from = origins[k];
      for (let j = 0; j < b.n * 2; j++, i++) {
        const sd = seeds[k][j];
        const age = t - b.t0 - sd.delay * 0.4;
        const o = from[j % from.length];
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
        const tn = b.tint ?? (b.floor ? [0.85, 0.74, 0.64] : [1.6, 1.55, 1.46]);
        tint[i * 3] = tn[0];
        tint[i * 3 + 1] = tn[1];
        tint[i * 3 + 2] = tn[2];
      }
    });
    for (const k of ['position', 'size', 'alpha', 'tint']) g.attributes[k].needsUpdate = true;
  }, [t, pts, height, bursts, origins, seeds]);
  return <primitive object={pts} />;
};

// ---------------------------------------------------------------- glints
export type Glint = { f: number; at: THREE.Vector3; size: number };

const Glints: React.FC<{ f: number; glints: Glint[] }> = ({ f, glints }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: glintTexture(), color: new THREE.Color(3.2, 2.7, 2.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), []);
  return (
    <>
      {glints.map((g, i) => {
        const age = f - g.f;
        if (age < 0 || age > 9) return null;
        const k = Math.sin((age / 9) * Math.PI);
        return <sprite key={i} material={mat} position={g.at} scale={[g.size * k, g.size * k, 1]} material-rotation={age * 0.08} renderOrder={20} />;
      })}
    </>
  );
};

export type AirDef = { beams: Beam[]; beamColor: string; motes: Mote[]; moteTint: [number, number, number] };

export const Atmosphere: React.FC<{ f: number; t: number; height: number; sunBoost: number; camPos: THREE.Vector3; air: AirDef; bursts: Burst[]; origins: THREE.Vector3[][]; glints: Glint[] }> = ({ f, t, height, sunBoost, camPos, air, bursts, origins, glints }) => (
  <>
    <GodRays f={f} beams={air.beams} color={air.beamColor} intensity={sunBoost} camPos={camPos} />
    <Dust f={f} height={height} motes={air.motes} tint={air.moteTint} />
    {bursts.length > 0 && <Chalk t={t} height={height} bursts={bursts} origins={origins} />}
    <Glints f={f} glints={glints} />
  </>
);
