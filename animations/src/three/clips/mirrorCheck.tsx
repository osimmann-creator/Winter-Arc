import { createPortal, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { TITLE_FONT } from '../../fonts';
import { cameraAt } from '../kit/camera';
import { E, Key, keys, noise1, seg } from '../kit/math';
import { ARMS, ArmPose, armTrack, handFrom, v } from '../kit/moves';
import { BodySpec, FootSpec, SK, faceTimeline, makeRemap, torsoPoint } from '../kit/rig';
import { ClipDef, Shot, hit } from '../kit/stage';
import { FLOOR_Y } from '../sets/TempleHall';

// gym-5-3d · Mirror Check (Mirror.tsx): like the 2D clip, we watch him in
// the dressing mirror. He stands just out of shot facing a gold vanity
// mirror; three poses and phone flashes (31, 51, 73); the last flash freezes
// the frame, which prints as a polaroid that slaps down with the plaque (105).

const SHOTS = [31, 51, 73];
const FREEZE = 73.5;
const MIRROR = new THREE.Vector3(0, 1.33, -1.3); // centre of the glass
const GLASS = { w: 1.0, h: 2.3 };
const SPOT = v(0.55, 0, 0.9); // where he stands, facing the mirror

const P: Record<string, ArmPose> = {
  phoneDown: { at: [0.36, -0.24, 0.12], axis: [0, 0, 1], pole: [1, 0.2, -0.5], shape: 'grip' },
  selfie: { at: [0.17, 0.64, 0.42], axis: [0, 1, 0], pole: [1, -0.7, 0.1], shape: 'grip' },
  hang: ARMS.hang,
  flex: { ...ARMS.flex, at: [0.5, 0.76, 0.1] },
  hips: ARMS.hips,
  gun: { at: [0.2, 0.62, 0.52], axis: [0, 1, 0], pole: [1, -0.6, 0], shape: 'point' },
};
const phoneArm = armTrack([[0, P.phoneDown], [17, P.selfie, 6]]);
const freeArm = armTrack([[0, P.hang], [24, P.flex, 5], [36, P.hang, 5], [41, P.hips, 6], [56, P.hang, 5], [62, P.gun, 6]]);
const face = faceTimeline(
  [[0, 'happy'], [14, 'cocky'], [26, 'grin'], [36, 'happy'], [43, 'cocky'], [56, 'happy'], [64, 'grin']],
  { blinks: [9, 39, 58], wink: { t: 71, side: 'R' } },
);
const yawKeys: Key[] = [[0, 0.1], [17, 0.05], [27, 0.1], [36, 0], [44, -0.32], [56, -0.05], [64, 0.06]];
const pitchKeys: Key[] = [[0, 0.02], [27, -0.05], [36, 0], [44, -0.02], [64, -0.03]];
const rollKeys: Key[] = [[0, 0], [27, 0.03], [36, 0], [64, -0.04]];
const headY: Key[] = [[0, -0.15], [14, -0.05], [27, 0.05], [44, 0.18], [56, 0], [64, -0.04]];
const headR: Key[] = [[0, 0], [62, 0], [68, 0.12], [80, 0.12]];
const hipShift: Key[] = [[0, 0], [41, 0], [46, 0.04], [56, 0.01], [64, 0]];

const body = (t: number): BodySpec => {
  const pelvis = SPOT.clone().add(v(keys(hipShift, t), SK.standY + Math.sin(t * 0.3) * 0.004, 0));
  // he faces the mirror (-z): everything turns half a circle
  const torso: [number, number, number] = [keys(pitchKeys, t), Math.PI + keys(yawKeys, t), keys(rollKeys, t)];
  const foot = (s: 1 | -1): FootSpec => ({ at: SPOT.clone().add(v(-s * 0.17, SK.ankleH, 0)), yaw: Math.PI + s * 0.12, pitch: 0, pole: v(-s * 0.35, -0.1, -1).normalize() });
  return {
    pelvis,
    torso,
    shrug: 0.15,
    hands: { L: handFrom(pelvis, torso, freeArm(t), 1), R: handFrom(pelvis, torso, phoneArm(t), -1) },
    feet: { L: foot(1), R: foot(-1) },
    head: [0.06 + noise1(t * 0.05, 2) * 0.02, keys(headY, t) + noise1(t * 0.04, 3) * 0.03, keys(headR, t)],
    face: face(t),
  };
};

/** Where the camera sees a point's reflection on the glass. */
const onGlass = (cam: THREE.Vector3, p: THREE.Vector3) => {
  const img = p.clone().setZ(2 * MIRROR.z - p.z);
  const k = (MIRROR.z + 0.02 - cam.z) / (img.z - cam.z);
  return cam.clone().lerp(img, k);
};

type Props = { phone: THREE.Vector3; phoneQ: THREE.Quaternion; f: number };

// ---------------------------------------------------------------- the mirror
const Mirror: React.FC = () => {
  const parts = useMemo(() => {
    const reflector = new Reflector(new THREE.PlaneGeometry(GLASS.w, GLASS.h), { textureWidth: 700, textureHeight: 1610, clipBias: 0.003, multisample: 4, color: 0xdedce4 });
    reflector.position.copy(MIRROR);
    const draw = reflector.onBeforeRender.bind(reflector);
    reflector.onBeforeRender = (renderer, scene, camera, ...rest) => {
      // inside the floor's own (blurred) reflection pass: keep last frame's mirror
      if (camera.position.y < FLOOR_Y) return;
      // and leave the floor's reflection out of the mirror's view of the hall
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData.floorReflector && o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      });
      draw(renderer, scene, camera, ...rest);
      hidden.forEach((o) => (o.visible = true));
    };
    const gold = new THREE.MeshStandardMaterial({ color: '#F0B860', metalness: 1, roughness: 0.24 });
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.7, 1.9) });
    const wood = new THREE.MeshStandardMaterial({ color: '#4A2228', roughness: 0.55 });
    const bulbs: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const y = -1.02 + (i * 2.04) / 6;
      bulbs.push([-GLASS.w / 2 - 0.07, y], [GLASS.w / 2 + 0.07, y]);
    }
    for (const x of [-0.36, -0.12, 0.12, 0.36]) bulbs.push([x, GLASS.h / 2 + 0.07]);
    return { reflector, gold, bulb, wood, bulbs };
  }, []);
  const W = GLASS.w / 2 + 0.07;
  const H = GLASS.h / 2 + 0.07;
  const legH = MIRROR.y - H - FLOOR_Y;
  return (
    <group>
      <primitive object={parts.reflector} />
      <group position={MIRROR}>
        {/* frame: side rails and top/bottom bars */}
        {[1, -1].map((s) => (
          <mesh key={`r${s}`} position={[s * W, 0, 0.0]} material={parts.gold} castShadow receiveShadow>
            <boxGeometry args={[0.11, 2 * H + 0.11, 0.09]} />
          </mesh>
        ))}
        {[1, -1].map((s) => (
          <mesh key={`b${s}`} position={[0, s * H, 0.0]} material={parts.gold} castShadow receiveShadow>
            <boxGeometry args={[2 * W + 0.11, 0.11, 0.09]} />
          </mesh>
        ))}
        {parts.bulbs.map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.07]} material={parts.bulb}>
            <sphereGeometry args={[0.034, 16, 12]} />
          </mesh>
        ))}
        {/* crest */}
        <mesh position={[0, H + 0.16, 0]} material={parts.gold} castShadow>
          <sphereGeometry args={[0.09, 24, 16]} />
        </mesh>
        {/* backing and feet */}
        <mesh position={[0, 0, -0.07]} material={parts.wood} castShadow receiveShadow>
          <boxGeometry args={[2 * W + 0.1, 2 * H + 0.1, 0.05]} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={`f${s}`} position={[s * W, -H - legH / 2, -0.05]} material={parts.gold} castShadow receiveShadow>
            <boxGeometry args={[0.12, legH + 0.02, 0.5]} />
          </mesh>
        ))}
      </group>
      <pointLight position={[MIRROR.x, MIRROR.y, MIRROR.z + 0.5]} intensity={2.5} distance={3.5} decay={1.5} color="#FFD9A8" />
    </group>
  );
};

const Phone: React.FC<{ pos: THREE.Vector3; q: THREE.Quaternion; flash: number }> = ({ pos, q, flash }) => {
  const geo = useMemo(() => new RoundedBoxGeometry(0.15, 0.078, 0.014, 3, 0.008), []);
  const lens = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), []);
  lens.color.setRGB(1 + 30 * flash, 1 + 28 * flash, 1 + 24 * flash);
  return (
    <group position={pos} quaternion={q}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#4B3C8C" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0.045, 0.018, -0.0085]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.006, 16]} />
        <meshStandardMaterial color="#1A1A22" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0.045, -0.01, -0.0088]} rotation-y={Math.PI} material={lens}>
        <circleGeometry args={[0.006, 12]} />
      </mesh>
      {/* always mounted: adding a light mid-clip would recompile every material */}
      <pointLight position={[0.045, -0.01, -0.08]} intensity={8 * flash} distance={4} decay={1.6} color="#FFF6EC" />
    </group>
  );
};

// ---------------------------------------------------------------- polaroid
const captionTexture = () => {
  const c = document.createElement('canvas');
  c.width = 1000;
  c.height = 240;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FBF8F2';
  x.fillRect(0, 0, 1000, 240);
  x.font = `76px "${TITLE_FONT}"`;
  x.fillStyle = '#4A3A52';
  x.textBaseline = 'middle';
  x.fillText('Gym session', 70, 124);
  x.translate(860, 120);
  x.fillStyle = '#2E8A55';
  x.beginPath();
  x.arc(0, 0, 70, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = '#FFFFFF';
  x.lineWidth = 16;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(-32, 2);
  x.lineTo(-8, 26);
  x.lineTo(34, -24);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const PHOTO_AT = 80;
const PRINT = 82;
const SLAP = 105;
const Polaroid: React.FC<{ shot: Shot; scene: THREE.Scene; world: { scene: THREE.Scene; gl: THREE.WebGLRenderer } }> = ({ shot, scene, world }) => {
  const f = shot.f;
  const done = useRef(false);
  const parts = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(720, 900, { type: THREE.HalfFloatType, samples: 4 });
    const c = cameraAt(mirrorCheck.camera, PHOTO_AT);
    // a tighter crop than the screen: the print is wider, and his real arm is just out of shot
    const cam = new THREE.PerspectiveCamera(23, 720 / 900, 0.05, 80);
    cam.position.copy(c.pos);
    cam.lookAt(c.target.clone().add(v(0, -0.02, 0)));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return {
      rt,
      cam,
      card: new RoundedBoxGeometry(1.0, 1.36, 0.02, 3, 0.012),
      photo: new THREE.PlaneGeometry(0.88, 1.1),
      caption: new THREE.PlaneGeometry(0.88, 0.21),
      cardMat: new THREE.MeshBasicMaterial({ color: '#F2EEE6' }),
      photoMat: new THREE.MeshBasicMaterial({ map: rt.texture }),
      captionMat: new THREE.MeshBasicMaterial({ map: captionTexture() }),
      shade: new THREE.MeshBasicMaterial({ color: '#0E0508', transparent: true, opacity: 0.45, depthWrite: false }),
      dim: new THREE.MeshBasicMaterial({ color: '#130A14', transparent: true, opacity: 0, depthWrite: false }),
      white: new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false }),
    };
  }, []);
  // the world is frozen from FREEZE on, so the print is taken once
  useFrame(({ gl }) => {
    if (f < PRINT || done.current) return;
    done.current = true;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(parts.rt);
    gl.clear();
    gl.render(world.scene, parts.cam);
    gl.setRenderTarget(prev);
  }, 0);
  let flash = 0;
  for (const s of SHOTS) if (f >= s) flash = Math.max(flash, (s === 73 ? 0.24 : 0.1) * Math.exp(-(f - s) / 1.4));
  parts.white.opacity = flash;
  parts.dim.opacity = 0.8 * E.out(seg(f, PRINT, 95));
  const t = f - PRINT;
  // the print develops (fades up from a pale grey) and settles; the slap squashes it
  parts.photoMat.color.setScalar(0.35 + 0.65 * E.sine(seg(t, 2, 20)));
  const shrink = E.out(seg(t, 0, 14));
  const slap = f >= SLAP ? Math.exp(-(f - SLAP) / 2.5) * Math.sin(((f - SLAP) / 5) * Math.PI) : 0;
  const lift = seg(f, SLAP - 9, SLAP - 4) * (1 - E.in(seg(f, SLAP - 4, SLAP)));
  const s = (1.84 + (1.24 - 1.84) * shrink) * (1 + 0.05 * lift - 0.05 * slap);
  const tilt = -0.08 * shrink + 0.015 * Math.sin(t * 0.06) * shrink;
  return createPortal(
    <>
      <mesh position={[0, 0, -1]} scale={[4, 6, 1]} material={parts.white}>
        <planeGeometry />
      </mesh>
      {f >= PRINT && (
        <>
          <mesh position={[0, 0, -2]} scale={[5, 8, 1]} material={parts.dim}>
            <planeGeometry />
          </mesh>
          <group position={[0, -0.16 * shrink - 0.02 * slap, 0]} rotation={[0, 0, tilt]} scale={[s, s, s]}>
            <mesh geometry={parts.card} material={parts.shade} position={[0.035, -0.115 - 0.03 * lift, -0.03]} />
            <mesh geometry={parts.card} material={parts.cardMat} position={[0, -0.08, -0.012]} />
            <mesh geometry={parts.photo} material={parts.photoMat} position={[0, 0.05, 0.001]} />
            <mesh geometry={parts.caption} material={parts.captionMat} position={[0, -0.63, 0.001]} />
          </group>
        </>
      )}
    </>,
    scene,
  );
};

export const mirrorCheck: ClipDef<Props> = {
  id: 'gym-5-3d',
  set: 'temple',
  remap: makeRemap({ freeze: FREEZE }),
  camera: {
    keys: {
      az: [[0, -15], [40, -14], [73, -13.5], [135, -13]],
      y: [[0, 1.42], [135, 1.38]],
      dist: [[0, 4.05], [73, 3.8], [135, 3.65]],
      ty: [[0, 1.33], [135, 1.33]],
      tx: [[0, 0.04], [135, 0.05]],
      tz: [[0, MIRROR.z], [135, MIRROR.z]],
      fov: [[0, 40], [135, 40]],
    },
    hits: [[31, 0.06], [51, 0.06], [73, 0.14], [105, 0.18]],
  },
  state: ({ t, f }) => {
    const b = body(t);
    const h = b.hands.R;
    const up = h.axis.clone().normalize();
    const phone = h.at.clone().addScaledVector(up, 0.045);
    // long side along the hand, screen turned to his face, lens to the mirror
    const toFace = torsoPoint(b, v(0, 0.84, 0.05)).sub(phone);
    const z = toFace.addScaledVector(up, -toFace.dot(up)).normalize();
    const y = new THREE.Vector3().crossVectors(z, up);
    const phoneQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(up, y, z));
    return { body: b, props: { phone, phoneQ, f } };
  },
  Props: ({ props }) => {
    let flash = 0;
    for (const s of SHOTS) if (props.f >= s) flash = Math.max(flash, Math.exp(-(props.f - s) / 2));
    return (
      <>
        <Mirror />
        <Phone pos={props.phone} q={props.phoneQ} flash={flash} />
      </>
    );
  },
  Overlay: Polaroid,
  // the flash flares where the camera sees the phone in the glass
  glints: (shot, _pose, props) => SHOTS.map((s) => ({ f: s, at: onGlass(shot.cam.pos, props.phone), size: s === 73 ? 0.42 : 0.3 })),
  card: { kind: 'plaque', theme: 'mirror', title: 'MIRROR CHECK', start: SLAP },
  fx: (f) => {
    const flash = Math.max(hit(f, 31, 2) * 0.5, hit(f, 51, 2) * 0.5, hit(f, 73, 2.5));
    return { bloom: 0.9 + 0.6 * flash, aberration: 0.25 * flash, exposure: 1 + 0.12 * flash, sun: 1 };
  },
};
