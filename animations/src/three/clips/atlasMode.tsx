import React, { useMemo } from 'react';
import * as THREE from 'three';
import { E, Key, clamp, keys, lerp, noise1, rng, seg } from '../kit/math';
import { ARMS, handFrom, v } from '../kit/moves';
import { glintTexture, softDot } from '../kit/textures';
import { BodySpec, HandSpec, Pose, SK, faceTimeline, lookAt, solve } from '../kit/rig';
import { ClipDef, Shot, hit } from '../kit/stage';

// gym-4-3d · Atlas Mode (Atlas.tsx), in the temple hall at night: he heaves
// a stone celestial globe off the platform, push-presses it overhead (51),
// spins it on one finger, flicks it up through the centre arch (89) and it
// becomes a new star with its own constellation (104). Plaque at 105.

const R = 0.36;
const PRESS = 51;
const RELEASE = 89;
const ARRIVE = 104;
const STAR = v(0.35, 5.75, -6.9);
const UP = v(0, 1, 0);

// ---------------------------------------------------------------- choreography
const depthKeys: Key[] = [[0, 0.49], [15, 0.49], [19, 0.475], [34, 0.6, E.sine], [38, 0.605], [42, 0.545], [PRESS, 0.612, E.sine], [57, 0.605], [134, 0.61]];
const pzKeys: Key[] = [[0, -0.13], [15, -0.13], [34, -0.03, E.sine], [42, -0.04], [PRESS, 0, E.sine]];
const leanKeys: Key[] = [[0, 0.56], [15, 0.56], [20, 0.5], [34, 0.06, E.sine], [38, -0.02], [42, 0.04], [PRESS, -0.07, E.sine], [57, -0.04], [68, -0.07], [RELEASE, -0.1], [94, -0.13], [106, -0.06], [134, -0.04]];
const yawKeys: Key[] = [[0, 0], [PRESS, 0], [68, -0.14], [RELEASE, -0.18], [104, -0.08], [134, 0.04]];
const shrugKeys: Key[] = [[0, 0.2], [15, 0.3], [34, 0.6], [42, 0.4], [PRESS, 1, E.out], [57, 0.5], [68, 0.3], [RELEASE, 0.6], [100, 0.4]];
const heelKeys: Key[] = [[0, 0], [47, 0], [PRESS, 0.032, E.out], [56, 0]];
const stanceKeys: Key[] = [[0, 0.27], [20, 0.27], [34, 0.23, E.sine]];
const headPitch: Key[] = [[0, 0.22], [15, 0.15], [34, -0.02], [42, 0.04], [PRESS, -0.42, E.out], [57, -0.36], [66, -0.18], [76, -0.04], [85, -0.12], [RELEASE, -0.5], [96, -0.58], [104, -0.5], [110, -0.08], [118, 0.02]];
const face = faceTimeline(
  [[0, 'breath'], [9, 'focus'], [15, 'grit'], [28, 'strain'], [36, 'focus'], [42, 'grit'], [PRESS, 'wow'], [57, 'happy'], [67, 'grin'], [78, 'cocky'], [86, 'grit'], [RELEASE, 'wow'], [95, 'happy'], [104, 'wow'], [111, 'grin']],
  { blinks: [10, 60, 99], wink: { t: 122, side: 'R' }, bob: 112 },
);

// the globe: floor -> chest -> overhead, then balanced on a fingertip
const cxKeys: Key[] = [[0, 0], [PRESS, 0]];
const cyKeys: Key[] = [[0, R], [15, R], [20, R + 0.035, E.in], [34, 1.07, E.sine], [38, 1.12], [42, 1.02], [PRESS, 2.2, E.sine]];
const czKeys: Key[] = [[0, 0.47], [15, 0.47], [34, 0.31, E.sine], [42, 0.31], [PRESS, 0.04, E.sine]];
const spinDeg: Key[] = [[0, -7], [17, -7], [36, -2], [PRESS, 7], [56, 9], [68, 45, E.in], [82, 185, E.linear], [RELEASE, 242, E.linear], [ARRIVE + 2, 520, E.linear]];
const FINGER = (t: number) => {
  const base = v(-0.21, 1.84, 0.07);
  base.add(v(Math.sin(t * 0.31) * 0.012, Math.sin(t * 0.62) * 0.008, Math.cos(t * 0.31) * 0.01));
  base.y += -0.07 * E.sine(seg(t, 82, 86)) * (1 - E.in(seg(t, 86, RELEASE))) + 0.14 * E.in(seg(t, 86, RELEASE));
  return base;
};

type Props = { center: THREE.Vector3; spin: number; scale: number; glow: number; t: number; f: number; cam: THREE.Vector3; flying: boolean };

const contact = (center: THREE.Vector3, s: 1 | -1, t: number) => {
  const a = lerp(75, 41, E.sine(seg(t, 32, PRESS))) * (Math.PI / 180);
  const b = lerp(0.42, 0, E.sine(seg(t, 34, PRESS)));
  const n = v(s * Math.sin(a) * Math.cos(b), -Math.cos(a), -Math.sin(a) * Math.sin(b));
  return { at: center.clone().addScaledVector(n, R + 0.025), palm: n.clone().negate() };
};

const flightPoint = (t: number, p0: THREE.Vector3) => {
  const u = E.out(seg(t, RELEASE, ARRIVE));
  const c1 = p0.clone().add(v(0.15, 2.2, -0.7));
  const c2 = STAR.clone().add(v(0, -1.6, 2.4));
  const w = 1 - u;
  return p0.clone().multiplyScalar(w * w * w).addScaledVector(c1, 3 * w * w * u).addScaledVector(c2, 3 * w * u * u).addScaledVector(STAR, u * u * u);
};

/** Everything about one moment: body and globe. */
const moment = (t: number, camAz: number): { body: BodySpec; center: THREE.Vector3 } => {
  const shrug = keys(shrugKeys, t);
  const heel = keys(heelKeys, t);
  const effort = seg(t, 15, 19) * (1 - seg(t, 28, 34));
  const ankleY = SK.ankleH + heel;
  const pelvis = v(0, ankleY + keys(depthKeys, t) + SK.hipDrop + (t < 15 ? Math.sin(t * 0.42) * 0.004 : 0), keys(pzKeys, t));
  const lean = keys(leanKeys, t) + Math.sin(t * 1.4) * effort * 0.025;
  const torso: [number, number, number] = [lean, keys(yawKeys, t), Math.sin(t * 1.7) * effort * 0.03];
  const stance = keys(stanceKeys, t);
  const toe = lerp(0.32, 0.14, E.sine(seg(t, 20, 34)));
  const footPitch = Math.asin(clamp(heel / 0.11, 0, 0.9));
  const kneeOut = lerp(0.75, 0.25, E.sine(seg(t, 20, 34)));
  const feet = {
    L: { at: v(stance, ankleY, 0), yaw: toe, pitch: footPitch, pole: v(kneeOut, 0, 1).normalize() },
    R: { at: v(-stance, ankleY, 0), yaw: -toe, pitch: footPitch, pole: v(-kneeOut, 0, 1).normalize() },
  };
  // the lift: hands on the globe
  let center = v(keys(cxKeys, t), keys(cyKeys, t), keys(czKeys, t));
  const onGlobe = (s: 1 | -1, c: THREE.Vector3, tt: number): HandSpec => {
    const k = contact(c, s, tt);
    return { at: k.at, axis: UP.clone(), pole: v(s, -0.45, -0.55).normalize(), shape: 'open', palm: k.palm };
  };
  let L = onGlobe(1, center, t);
  let Rh = onGlobe(-1, center, t);
  if (t > PRESS) {
    // hand-over: left hand to the hip, right hand under the globe, finger up
    const k = E.sine(seg(t, PRESS + 1, 64));
    const held = v(0, 2.2, 0.04).add(v(Math.sin((t - PRESS) * 0.5) * 0.01 * (1 - k), 0, 0));
    const hip = handFrom(pelvis, torso, ARMS.hips, 1);
    const L0 = onGlobe(1, held, PRESS);
    L = k < 0.5 ? { ...L0, at: L0.at.clone().lerp(hip.at, k) } : { ...hip, at: L0.at.clone().lerp(hip.at, k) };
    const fing = FINGER(t);
    const R0 = onGlobe(-1, held, PRESS);
    const rAt = R0.at.clone().lerp(fing, k);
    Rh = k < 0.55 ? { ...R0, at: rAt } : { at: rAt, axis: v(-1, 0, 0), pole: v(-1, -0.7, -0.15).normalize(), shape: 'point' };
    if (t > RELEASE) {
      // follow-through: the arm goes on up, then points at the new star
      const up = E.out(seg(t, RELEASE, RELEASE + 5));
      const point = E.sine(seg(t, 98, 108));
      const reach = fing.clone().add(v(-0.05, 0.12 * up, -0.04 * up));
      const toStar = handFrom(pelvis, torso, { at: [0.3, 1.18, -0.05], axis: [0, 0, 1], pole: [1, 0.1, -0.3], shape: 'point' }, -1);
      Rh = { at: reach.lerp(toStar.at, point), axis: v(-1, 0, 0), pole: v(-1, -0.6, -0.2).lerp(toStar.pole, point).normalize(), shape: 'point' };
    }
    // where the globe sits
    const pre = solve({ pelvis, torso, shrug, hands: { L, R: Rh }, feet, head: [0, 0, 0], face: face(t) });
    const tip = fingerTip(pre);
    const onFinger = tip.clone().addScaledVector(UP, R + 0.004);
    center = held.clone().lerp(onFinger, E.sine(seg(t, PRESS + 2, 64)));
  }
  const la = lookAt(camAz, E.sine(seg(t, 66, 72)) * (1 - E.sine(seg(t, 84, 88))) + E.sine(seg(t, 108, 113)));
  const fc = face(t);
  fc.gaze = t > 84 && t < 108 ? [0, -0.25] : t < 60 && t > 45 ? [0, -0.3] : la.gaze;
  return {
    body: {
      pelvis,
      torso,
      shrug,
      hands: { L, R: Rh },
      feet,
      head: [keys(headPitch, t) - lean * 0.6, la.yaw + noise1(t * 0.05, 3) * 0.02, noise1(t * 0.06, 5) * 0.02 + (t > 110 ? 0.08 * E.sine(seg(t, 110, 116)) : 0)],
      face: fc,
    },
    center,
  };
};

/** The index fingertip of the right hand (the point shape: index along -Y of the hand frame). */
const fingerTip = (p: Pose) => {
  const X = p.R.axis.clone().normalize();
  const toElbow = p.R.elbow.clone().sub(p.R.grip);
  const Y = toElbow.addScaledVector(X, -toElbow.dot(X)).normalize();
  return p.R.grip.clone().addScaledVector(Y, -0.078);
};

const releaseAt = (() => {
  const m = moment(RELEASE, 0);
  return m.center;
})();

// ---------------------------------------------------------------- the globe
const globeTextures = () => {
  const W = 1024;
  const H = 512;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const base = mk();
  const glow = mk();
  const b = base.getContext('2d')!;
  const g = glow.getContext('2d')!;
  const grad = b.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2E3A63');
  grad.addColorStop(0.5, '#3A4878');
  grad.addColorStop(1, '#273256');
  b.fillStyle = grad;
  b.fillRect(0, 0, W, H);
  const r = rng(77);
  // stone grain
  for (let i = 0; i < 2600; i++) {
    b.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(10,14,30,0.12)';
    const s = 1 + r() * 3;
    b.fillRect(r() * W, r() * H, s, s);
  }
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  // graticule
  b.strokeStyle = 'rgba(214,176,110,0.55)';
  b.lineWidth = 2;
  for (let k = 1; k < 6; k++) {
    b.beginPath();
    b.moveTo(0, (k * H) / 6);
    b.lineTo(W, (k * H) / 6);
    b.stroke();
  }
  for (let k = 0; k < 12; k++) {
    b.beginPath();
    b.moveTo((k * W) / 12, 0);
    b.lineTo((k * W) / 12, H);
    b.stroke();
  }
  // constellations
  for (let k = 0; k < 11; k++) {
    const cx = ((k + 0.5) / 11) * W + (r() - 0.5) * 40;
    const cy = H * (0.25 + r() * 0.5);
    const n = 4 + Math.floor(r() * 3);
    const pts: [number, number][] = [];
    let x = cx;
    let y = cy;
    for (let i = 0; i < n; i++) {
      x += (r() - 0.5) * 70;
      y += (r() - 0.5) * 60;
      pts.push([x, y]);
    }
    for (const ctx of [b, g]) {
      ctx.strokeStyle = ctx === b ? '#E9C783' : '#FFE2A8';
      ctx.lineWidth = ctx === b ? 2.4 : 3;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      ctx.fillStyle = '#FFF4D6';
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, ctx === b ? 4.5 : 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  // loose stars
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const y = r() * H;
    const s = 0.8 + r() * 1.8;
    for (const ctx of [b, g]) {
      ctx.fillStyle = 'rgba(255,240,205,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const map = new THREE.CanvasTexture(base);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissive = new THREE.CanvasTexture(glow);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
};

const Globe: React.FC<{ center: THREE.Vector3; spin: number; scale: number; glow: number; visible: boolean }> = ({ center, spin, scale, glow, visible }) => {
  const parts = useMemo(() => {
    const tex = globeTextures();
    return {
      stone: new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: new THREE.Color('#FFD9A0'), roughness: 0.6, metalness: 0.08 }),
      gold: new THREE.MeshStandardMaterial({ color: '#F0BE6A', metalness: 1, roughness: 0.22, emissive: new THREE.Color('#FFB050') }),
      ring: new THREE.TorusGeometry(R + 0.03, 0.017, 12, 120),
      pin: new THREE.CylinderGeometry(0.014, 0.014, 2 * R + 0.16, 12),
    };
  }, []);
  parts.stone.emissiveIntensity = 0.12 + glow * 2.0;
  parts.gold.emissiveIntensity = glow * 0.25;
  return (
    <group position={center} scale={[scale, scale, scale]}>
      <group rotation={[0, 0, 0.38]} visible={visible}>
        <group rotation={[0, spin, 0]}>
          <mesh material={parts.stone} castShadow receiveShadow>
            <sphereGeometry args={[R, 64, 40]} />
          </mesh>
          <mesh geometry={parts.ring} material={parts.gold} rotation-x={Math.PI / 2} castShadow />
          <mesh geometry={parts.ring} material={parts.gold} castShadow />
          <mesh geometry={parts.ring} material={parts.gold} rotation-y={Math.PI / 2} />
        </group>
        <mesh geometry={parts.pin} material={parts.gold} castShadow />
      </group>
      {/* always mounted (a light appearing mid-clip recompiles every material) */}
      <pointLight intensity={visible ? 0.4 + 7 * glow : 0} distance={4.5} decay={1.6} color="#FFCF8A" />
    </group>
  );
};

// ---------------------------------------------------------------- the new star
const CROWN: [number, number][] = [[-140, -47], [-105, -14], [-64, 2], [0, 0], [47, -26], [79, -63], [94, -95]];
const NewStar: React.FC<{ t: number; cam: THREE.Vector3; trail: THREE.Vector3[]; flying: boolean }> = ({ t, cam, trail, flying }) => {
  const mats = useMemo(
    () => ({
      dot: new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(3.0, 2.4, 1.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      glint: new THREE.SpriteMaterial({ map: glintTexture(), color: new THREE.Color(3.6, 3.0, 2.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      line: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      trail: [...Array(12)].map(() => new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(2.6, 1.9, 1.0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
    }),
    [],
  );
  // a new quaternion every frame: R3F only re-applies a prop when it is a different object
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(cam, STAR, UP));
  const arrived = t >= ARRIVE - 1;
  const progress = E.sine(seg(t, ARRIVE - 1, ARRIVE + 14));
  const rays = 1 + 1.35 * Math.sin(seg(t, ARRIVE - 1, ARRIVE + 8) * Math.PI);
  const twinkle = 1 + 0.08 * Math.sin(t * 0.9) + 0.05 * Math.sin(t * 2.3);
  const k = 0.0095;
  return (
    <>
      {flying &&
        trail.map((p, i) => {
          const s = (0.3 - i * 0.02) * (1 - seg(t, ARRIVE - 3, ARRIVE + 6));
          mats.trail[i].opacity = ((12 - i) / 16) * (1 - seg(t, ARRIVE - 3, ARRIVE + 6));
          return s > 0 ? <sprite key={i} material={mats.trail[i]} position={p} scale={[s, s, 1]} /> : null;
        })}
      {arrived && (
        <group position={STAR} quaternion={q}>
          <sprite material={mats.dot} scale={[0.8 * rays * twinkle, 0.8 * rays * twinkle, 1]} />
          <sprite material={mats.glint} scale={[0.75 * rays * twinkle, 0.75 * rays * twinkle, 1]} material-rotation={0.2} />
          {CROWN.map(([x, y], i) => {
            if (i === 3) return null;
            const prev = CROWN[i < 3 ? i + 1 : i - 1];
            const step = Math.abs(i - 3) - 1;
            const qq = seg(progress * 3, step, step + 1);
            if (qq <= 0) return null;
            const ax = prev[0] * k;
            const ay = -prev[1] * k;
            const bx = lerp(ax, x * k, qq);
            const by = lerp(ay, -y * k, qq);
            const len = Math.hypot(bx - ax, by - ay);
            return (
              <group key={i}>
                <mesh material={mats.line} position={[(ax + bx) / 2, (ay + by) / 2, -0.01]} rotation-z={Math.atan2(by - ay, bx - ax)} scale={[len, 0.022, 1]}>
                  <planeGeometry />
                </mesh>
                <sprite material={mats.dot} position={[x * k, -y * k, 0]} scale={[0.32 * qq, 0.32 * qq, 1]} />
              </group>
            );
          })}
        </group>
      )}
    </>
  );
};

// ---------------------------------------------------------------- the clip
export const atlasMode: ClipDef<Props> = {
  id: 'gym-4-3d',
  set: 'templeNight',
  remap: (f) => f,
  camera: {
    keys: {
      az: [[0, 24], [15, 22], [34, 14], [PRESS, 8], [68, -4], [RELEASE, -10], [100, -4], [135, 3]],
      y: [[0, 1.12], [15, 1.08], [30, 1.32], [42, 1.3], [PRESS, 0.55], [68, 0.62], [RELEASE, 0.6], [100, 0.42], [135, 0.45]],
      dist: [[0, 3.45], [15, 3.3], [34, 3.4], [PRESS, 4.2], [68, 3.9], [RELEASE, 4.1], [100, 4.8], [135, 5.0]],
      ty: [[0, 0.86], [15, 0.82], [34, 1.12], [42, 1.12], [PRESS, 1.45], [68, 1.55], [RELEASE, 1.7], [100, 2.35], [135, 2.4]],
      tx: [[0, 0], [135, 0]],
      tz: [[0, 0.25], [34, 0.1], [PRESS, 0], [135, -0.3]],
      fov: [[0, 38], [PRESS, 40], [100, 42], [135, 42]],
    },
    hits: [[25, 0.2], [PRESS, 0.6], [RELEASE, 0.2], [ARRIVE + 1, 0.3]],
    punch: [PRESS],
  },
  state: ({ t, f, cam }) => {
    const m = moment(t, cam.az);
    const glow = E.sine(seg(t, 53, 68)) * (1 - seg(t, RELEASE + 1, ARRIVE)) + 0.35 * seg(t, RELEASE, RELEASE + 3) * (1 - seg(t, ARRIVE - 4, ARRIVE));
    const flying = t > RELEASE;
    const center = flying ? flightPoint(t, releaseAt) : m.center;
    const scale = flying ? lerp(1, 0.05, E.in(seg(t, RELEASE, ARRIVE))) : 1;
    return { body: m.body, props: { center, spin: (keys(spinDeg, t) * Math.PI) / 180, scale, glow, t, f, cam: cam.pos, flying } };
  },
  Props: ({ props }) => {
    const trail = useMemo(() => [] as THREE.Vector3[], []);
    trail.length = 0;
    if (props.flying) for (let i = 0; i < 12; i++) trail.push(flightPoint(Math.max(RELEASE, props.t - i * 0.8), releaseAt));
    return (
      <>
        <Globe center={props.center} spin={props.spin} scale={props.scale} glow={props.glow} visible={props.t < ARRIVE} />
        <NewStar t={props.t} cam={props.cam} trail={trail} flying={props.flying} />
      </>
    );
  },
  bursts: [
    { burst: { t0: 17, n: 36, speed: 0.8, up: 0.1, drag: 3.2, life: 22, size: 0.07, grow: 2.4, alpha: 0.16, floor: true }, at: () => [v(0, 0.02, 0.47)] },
    { burst: { t0: 50.5, n: 26, speed: 0.8, up: 0.1, drag: 3.5, life: 18, size: 0.06, grow: 2.4, alpha: 0.16, floor: true }, at: (p) => [p.L.ankle, p.R.ankle].map((a) => v(a.x, 0.02, a.z + 0.05)) },
    { burst: { t0: 51, n: 40, speed: 1.0, up: 0.25, drag: 3.6, life: 22, size: 0.04, grow: 3.6, alpha: 0.2 }, at: (p) => [p.L.grip, p.R.grip] },
    { burst: { t0: RELEASE, n: 70, speed: 1.5, up: 0.4, drag: 2.8, life: 20, size: 0.025, grow: 1.2, alpha: 0.6, tint: [2.4, 1.8, 0.9] }, at: () => [releaseAt.clone()] },
    { burst: { t0: ARRIVE, n: 120, speed: 2.4, up: 0.2, drag: 2.4, life: 26, size: 0.05, grow: 1.0, alpha: 0.7, tint: [2.6, 2.0, 1.1] }, at: () => [STAR.clone()] },
  ],
  glints: (_shot: Shot, pose: Pose, props) => [
    { f: 8, at: props.center.clone().add(v(0.22, 0.25, 0.2)), size: 0.32 },
    { f: 60, at: props.center.clone().add(v(-0.25, 0.2, 0.25)), size: 0.5 },
    { f: 74, at: props.center.clone().add(v(0.3, 0.1, 0.2)), size: 0.4 },
    { f: 120, at: pose.R.grip.clone().add(v(0, 0.08, 0.05)), size: 0.3 },
  ],
  card: { kind: 'plaque', theme: 'atlas', title: 'ATLAS MODE', start: 105 },
  fx: (f) => ({ bloom: 1.0 + 0.6 * hit(f, PRESS, 4) + 0.8 * hit(f, ARRIVE, 6), aberration: 0.3 * hit(f, PRESS, 3), exposure: 1 + 0.1 * hit(f, ARRIVE, 5), sun: 1 }),
};
