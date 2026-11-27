import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { SFX_FONT, TITLE_FONT } from '../../fonts';
import { HallLights, TempleHall, templeBeams, templeMotes } from '../sets/TempleHall';
import { WinterGym, WinterLights, winterAir } from '../sets/WinterGym';
import { AirDef, Atmosphere, Burst, Glint } from './Atmosphere';
import { Cam, CamDef, CameraRig, cameraAt } from './camera';
import { Flexander } from './Flexander';
import { PlaqueOverlay, PlaqueTheme, makeOverlayCamera } from './Plaque';
import { Post } from './Post';
import { RibbonCardOverlay } from './RibbonCard';
import { BodySpec, Pose, frameOf, solve } from './rig';

// Every 3D gym clip is a ClipDef rendered by this shell: the set and its
// lights, an environment map of the empty set, Flexander, the clip's props,
// light shafts and chalk, the end card, and the film finish.

export type SetName = 'temple' | 'templeNight' | 'winter';
export type CardDef =
  | { kind: 'plaque'; theme: PlaqueTheme; title: string; start: number }
  | { kind: 'ribbon'; title: string; start: number; color: string; dark: string; pts: string };
export type Shot = { f: number; t: number; cam: Cam };
export type ClipState<P> = { body: BodySpec; props: P };
export type FX = { bloom: number; aberration: number; exposure: number; sun: number };
export type ClipDef<P> = {
  id: string;
  set: SetName;
  /** output frame -> action time (slow motion, freezes) */
  remap: (f: number) => number;
  camera: CamDef;
  state: (shot: Shot) => ClipState<P>;
  Props?: React.FC<{ shot: Shot; pose: Pose; props: P }>;
  /** extra things drawn over the world before the effects (e.g. a polaroid) */
  Overlay?: React.FC<{ shot: Shot; scene: THREE.Scene; world: { scene: THREE.Scene; gl: THREE.WebGLRenderer } }>;
  bursts?: { burst: Burst; at: (pose: Pose, props: P) => THREE.Vector3[] }[];
  glints?: (shot: Shot, pose: Pose, props: P) => Glint[];
  card: CardDef;
  fx: (f: number) => FX;
};

export const hit = (f: number, at: number, decay: number) => (f >= at ? Math.exp(-(f - at) / decay) : 0);

const AIR: Record<SetName, () => AirDef> = {
  temple: () => ({ beams: templeBeams(), beamColor: '#FFB878', motes: templeMotes(), moteTint: [1.9, 1.45, 1.0] }),
  templeNight: () => ({ beams: templeBeams(), beamColor: '#8FA8FF', motes: templeMotes(), moteTint: [1.0, 1.2, 1.7] }),
  winter: winterAir,
};

/** Capture the empty set into an environment map so chrome and gold reflect it. */
const EnvCapture: React.FC<{ hide: React.RefObject<THREE.Object3D | null>[]; overlay: THREE.Scene; at: THREE.Vector3 }> = ({ hide, overlay, at }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.1, 60, rt);
    cam.position.copy(at);
    const objs = hide.map((r) => r.current).filter((o): o is THREE.Object3D => !!o);
    const vis = objs.map((o) => o.visible);
    objs.forEach((o) => (o.visible = false));
    // skies are HDR-bright on screen; in reflections they would blow out
    // every polished surface, so they are captured at a fraction of that
    const dimmed: [THREE.MeshBasicMaterial, THREE.Color][] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && (m as THREE.Material).type === 'MeshBasicMaterial' && m.color && Math.max(m.color.r, m.color.g, m.color.b) > 1 && !dimmed.some(([d]) => d === m)) {
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
  }, [gl, scene, hide, overlay, at]);
  return null;
};

function World<P>({ def, f, debug }: { def: ClipDef<P>; f: number; debug: string }) {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const worldScene = useThree((s) => s.scene);
  const overlay = useMemo(() => ({ scene: new THREE.Scene(), camera: makeOverlayCamera(size.width / size.height) }), [size.width, size.height]);
  const character = useRef<THREE.Group>(null);
  const air = useRef<THREE.Group>(null);
  const things = useRef<THREE.Group>(null);
  const hide = useMemo(() => [character, air, things], []);
  const airDef = useMemo(() => AIR[def.set](), [def.set]);
  const envAt = useMemo(() => (def.set === 'winter' ? new THREE.Vector3(0, 1.6, 1.4) : new THREE.Vector3(0, 1.6, 1.2)), [def.set]);
  // where each burst starts: the pose at the burst's own moment
  const origins = useMemo(
    () =>
      (def.bursts ?? []).map((b) => {
        const f0 = frameOf(def.remap, b.burst.t0);
        const shot = { f: f0, t: b.burst.t0, cam: cameraAt(def.camera, f0) };
        const s0 = def.state(shot);
        return b.at(solve(s0.body), s0.props);
      }),
    [def],
  );
  const t = def.remap(f);
  const cam = cameraAt(def.camera, f);
  const shot: Shot = { f, t, cam };
  const st = def.state(shot);
  const pose = solve(st.body);
  const fx = def.fx(f);
  const night = def.set === 'templeNight';
  const Props = def.Props;
  const Overlay = def.Overlay;
  return (
    <>
      <CameraRig cam={cam} />
      {def.set === 'winter' ? (
        <>
          <WinterLights boost={fx.sun} f={f} />
          <WinterGym debug={debug} f={f} />
        </>
      ) : (
        <>
          <HallLights boost={fx.sun} night={night} f={f} />
          <TempleHall debug={debug} night={night} f={f} />
        </>
      )}
      <EnvCapture hide={hide} overlay={overlay.scene} at={envAt} />
      <group ref={character}>
        <Flexander pose={pose} />
      </group>
      <group ref={things}>{Props && <Props shot={shot} pose={pose} props={st.props} />}</group>
      <group ref={air} visible={!debug.includes('noair')}>
        <Atmosphere f={f} t={t} height={size.height} sunBoost={fx.sun} camPos={cam.pos} air={airDef} bursts={(def.bursts ?? []).map((b) => b.burst)} origins={origins} glints={def.glints?.(shot, pose, st.props) ?? []} />
      </group>
      {Overlay && <Overlay shot={shot} scene={overlay.scene} world={{ scene: worldScene, gl }} />}
      {def.card.kind === 'plaque' ? (
        <PlaqueOverlay f={f} start={def.card.start} title={def.card.title} theme={def.card.theme} scene={overlay.scene} />
      ) : (
        <RibbonCardOverlay f={f} start={def.card.start} title={def.card.title} pts={def.card.pts} color={def.card.color} dark={def.card.dark} scene={overlay.scene} />
      )}
      <Post overlay={overlay} bloom={fx.bloom} aberration={fx.aberration} exposure={fx.exposure} />
    </>
  );
}

/** A Remotion component for a clip. */
export function makeClip<P>(def: ClipDef<P>): React.FC<{ debug?: string }> {
  const Clip: React.FC<{ debug?: string }> = ({ debug = '' }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    // the cards paint their type onto canvases: wait for the fonts first
    const [handle] = useState(() => delayRender('3D clip: fonts'));
    const [ready, setReady] = useState(false);
    useEffect(() => {
      Promise.all([document.fonts.load(`98px ${SFX_FONT}`), document.fonts.load(`98px "${TITLE_FONT}"`)]).then(
        () => setReady(true),
        () => setReady(true),
      );
    }, []);
    useEffect(() => {
      if (ready) continueRender(handle);
    }, [ready, handle]);
    return (
      <AbsoluteFill style={{ background: '#1A0F12' }}>
        {ready && (
          <ThreeCanvas width={width} height={height} flat shadows="percentage" dpr={1} gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }} camera={{ fov: 36, near: 0.05, far: 80, position: [0, 1, 4] }}>
            <World def={def} f={frame} debug={debug} />
          </ThreeCanvas>
        )}
      </AbsoluteFill>
    );
  };
  Clip.displayName = def.id;
  return Clip;
}
