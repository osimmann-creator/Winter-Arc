import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { SFX_FONT } from '../fonts';
import { Atmosphere } from './gym3d/Atmosphere';
import { Barbell } from './gym3d/Barbell';
import { CameraRig, cameraAt } from './gym3d/CameraRig';
import { Flexander } from './gym3d/Flexander';
import { Hall, HallEnvironment, HallLights } from './gym3d/Hall';
import { PlaqueOverlay, makeOverlayCamera } from './gym3d/Plaque';
import { Post } from './gym3d/Post';
import { poseAt } from './gym3d/pose';

// gym-1-3d — "Beast Mode" rebuilt in Three.js (React Three Fiber through
// @remotion/three). Same beats as the 2D gym-1 clip (BeastMode.tsx): the pull
// from 22, the catch ~50, the dip at 68 and the lockout at 76 — plus a
// slow-motion arc at the lockout and the plaque at 93.

export const PLAQUE_AT = 93;

const hit = (f: number, at: number, decay: number) => (f >= at ? Math.exp(-(f - at) / decay) : 0);

const World: React.FC<{ f: number; debug: string }> = ({ f, debug }) => {
  const size = useThree((s) => s.size);
  const overlay = useMemo(() => ({ scene: new THREE.Scene(), camera: makeOverlayCamera(size.width / size.height) }), [size.width, size.height]);
  const character = useRef<THREE.Group>(null);
  const air = useRef<THREE.Group>(null);
  const hide = useMemo(() => [character, air], []);
  const cam = cameraAt(f);
  const pose = poseAt(f, cam.az);
  const lock = hit(f, 76, 4);
  const catchHit = hit(f, 50.5, 3);
  const slow = f > 76 && f < 98 ? Math.sin(((f - 76) / 22) * Math.PI) : 0;
  const sunBoost = 1 + 0.55 * lock + 0.25 * slow;
  return (
    <>
      <CameraRig f={f} />
      <HallLights boost={sunBoost} />
      <Hall debug={debug} />
      <HallEnvironment hide={hide} overlay={overlay.scene} />
      <group ref={character}>
        <Flexander pose={pose} />
        <Barbell pose={pose} />
      </group>
      <group ref={air} visible={!debug.includes('noair')}>
        <Atmosphere f={f} pose={pose} height={size.height} sunBoost={sunBoost} />
      </group>
      <PlaqueOverlay f={f} start={PLAQUE_AT} title="BEAST MODE" scene={overlay.scene} aspect={size.width / size.height} />
      <Post overlay={overlay} bloom={0.9 + 1.3 * lock + 0.3 * catchHit} aberration={0.25 * catchHit + 1.0 * lock} exposure={1 + 0.22 * lock} />
    </>
  );
};

export const BeastMode3D: React.FC<{ debug?: string }> = ({ debug = '' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // the plaque paints its type onto a canvas: wait for the font first
  const [handle] = useState(() => delayRender('Gym3D: plaque font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.load(`98px ${SFX_FONT}`).then(() => setReady(true), () => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return (
    <AbsoluteFill style={{ background: '#1A0F12' }}>
      {ready && (
        <ThreeCanvas width={width} height={height} flat shadows="percentage" dpr={1} gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }} camera={{ fov: 36, near: 0.05, far: 80, position: [0, 1, 4] }}>
          <World f={frame} debug={debug} />
        </ThreeCanvas>
      )}
    </AbsoluteFill>
  );
};
