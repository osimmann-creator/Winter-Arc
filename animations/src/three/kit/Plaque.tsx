import { createPortal } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SFX_FONT } from '../../fonts';
import { E, clamp, lerp, seg } from './math';

// The BEAST MODE plaque from GymTheatre.tsx (same outline, colours, type and
// spot on screen), built as a beveled enamel-and-gold slab that flips in.

export type PlaqueTheme = 'beast' | 'atlas' | 'mirror';
const THEMES: Record<PlaqueTheme, { enamel: string; dark: string; foil: string; gleam: string; light: string; metal: string }> = {
  beast: { enamel: '#682E23', dark: '#311A22', foil: '#FFC77C', gleam: '#FFEDD0', light: '#7A3828', metal: '#F2B35A' },
  atlas: { enamel: '#244860', dark: '#101D36', foil: '#ECD08D', gleam: '#E9FAFE', light: '#2E5A78', metal: '#E8C878' },
  mirror: { enamel: '#734056', dark: '#391F34', foil: '#EEBA92', gleam: '#FFF2E3', light: '#8A4E68', metal: '#EDB08C' },
};
type Theme = (typeof THEMES)['beast'];
const PERIMETER: [number, number][] = [[-420, 0], [-332, 0], [-317, -17], [-73, -17], [-55, -28], [55, -28], [73, -17], [317, -17], [332, 0], [420, 0], [397, 32], [414, 63], [336, 63], [314, 87], [-314, 87], [-336, 63], [-414, 63], [-397, 32]];
const TAG: [number, number][] = [[-122, -2], [122, -2], [135, 16], [113, 45], [-113, 45], [-135, 16]];

const shapeFrom = (pts: [number, number][], dy = 0) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, -(y + dy)) : s.lineTo(x, -(y + dy))));
  s.closePath();
  return s;
};

const foilGradient = (C: Theme, c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#AA6E45');
  g.addColorStop(0.23, C.foil);
  g.addColorStop(0.45, '#FFEDD0');
  g.addColorStop(0.61, '#B97A49');
  g.addColorStop(0.77, C.foil);
  g.addColorStop(1, '#976439');
  return g;
};

const pathFrom = (c: CanvasRenderingContext2D, pts: [number, number][]) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.closePath();
};

/** Face art in SVG units: x -440..440, y -50..110 at 2px per unit. */
const faceTexture = (C: Theme, title: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1760;
  canvas.height = 320;
  const c = canvas.getContext('2d')!;
  c.scale(2, 2);
  c.translate(440, 50);
  const en = c.createLinearGradient(-200, -40, 120, 120);
  en.addColorStop(0, C.light);
  en.addColorStop(0.5, C.enamel);
  en.addColorStop(1, C.dark);
  pathFrom(c, PERIMETER);
  c.fillStyle = en;
  c.fill();
  c.lineJoin = 'miter';
  c.strokeStyle = foilGradient(C, c, -420, -28, 300, 120);
  c.lineWidth = 9;
  pathFrom(c, PERIMETER);
  c.stroke();
  c.strokeStyle = C.foil;
  c.lineWidth = 2;
  c.globalAlpha = 0.85;
  c.beginPath();
  c.moveTo(-308, -8);
  c.lineTo(-72, -8);
  c.lineTo(-53, -19);
  c.lineTo(53, -19);
  c.lineTo(72, -8);
  c.lineTo(308, -8);
  c.moveTo(-309, 76);
  c.lineTo(309, 76);
  c.stroke();
  c.globalAlpha = 1;
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(329, 14);
    c.lineTo(393, 14);
    c.moveTo(342, 25);
    c.lineTo(379, 25);
    c.moveTo(354, 36);
    c.lineTo(367, 36);
    c.moveTo(345, 46);
    c.lineTo(352, 53);
    c.lineTo(359, 46);
    c.lineTo(352, 39);
    c.closePath();
    c.stroke();
    c.restore();
  }
  c.font = `${title === 'MIRROR CHECK' ? 86 : 98}px ${SFX_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  (c as unknown as { letterSpacing: string }).letterSpacing = '4.4px';
  c.lineJoin = 'round';
  c.fillStyle = 'rgba(20,8,10,0.7)';
  c.fillText(title, 2, 68);
  c.strokeStyle = C.dark;
  c.lineWidth = 6;
  c.strokeText(title, 0, 63);
  const tg = c.createLinearGradient(0, 0, 0, 66);
  tg.addColorStop(0, '#FFF8EC');
  tg.addColorStop(0.55, C.gleam);
  tg.addColorStop(1, '#F7C985');
  c.fillStyle = tg;
  c.fillText(title, 0, 63);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / 880, 1 / 160);
  tex.offset.set(0.5, 110 / 160);
  return tex;
};

/** Gold tag in its own units: x -150..150, y -10..50 (SVG y down), 4px per unit. */
const tagTexture = (C: Theme) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 240;
  const c = canvas.getContext('2d')!;
  c.scale(4, 4);
  c.translate(150, 10);
  c.fillStyle = foilGradient(C, c, -135, -2, 60, 60);
  c.fillRect(-150, -10, 300, 60);
  c.strokeStyle = C.dark;
  c.globalAlpha = 0.65;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-114, 3);
  c.lineTo(114, 3);
  c.moveTo(-107, 38);
  c.lineTo(107, 38);
  c.stroke();
  c.globalAlpha = 1;
  c.font = `34px ${SFX_FONT}`;
  c.textAlign = 'center';
  (c as unknown as { letterSpacing: string }).letterSpacing = '3px';
  c.fillStyle = C.dark;
  c.fillText('+1.5 PTS', 0, 31);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / 300, 1 / 60);
  tex.offset.set(0.5, 50 / 60);
  return tex;
};

const sheenMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { uX: { value: -600 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uX; uniform float uA; varying vec2 vP; void main(){ float d = (vP.x - uX) + vP.y * 0.55; float b = exp(-d*d/900.0); gl_FragColor = vec4(vec3(1.0,0.93,0.8) * b * uA, 1.0); }',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

export const PlaqueOverlay: React.FC<{ f: number; start: number; title: string; theme: PlaqueTheme; scene: THREE.Scene }> = ({ f, start, title, theme, scene }) => {
  const C = THEMES[theme];
  const parts = useMemo(() => {
    const shape = shapeFrom(PERIMETER);
    const body = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 3, curveSegments: 1 });
    const tag = new THREE.ExtrudeGeometry(shapeFrom(TAG), { depth: 8, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.5, bevelSegments: 2 });
    const shadow = new THREE.ShapeGeometry(shapeFrom(PERIMETER, 8));
    const sheen = new THREE.ShapeGeometry(shape);
    return { body, tag, shadow, sheen };
  }, []);
  // the parent only mounts the canvas once the plaque font has loaded
  const mats = useMemo(() => {
    const gold = new THREE.MeshStandardMaterial({ color: C.metal, metalness: 1, roughness: 0.22 });
    return {
      face: new THREE.MeshStandardMaterial({ map: faceTexture(C, title), roughness: 0.32, metalness: 0.2 }),
      gold,
      tag: new THREE.MeshStandardMaterial({ map: tagTexture(C), metalness: 0.75, roughness: 0.28 }),
      shadow: new THREE.MeshBasicMaterial({ color: '#12070A', transparent: true, opacity: 0.55, depthWrite: false }),
      sheen: sheenMat(),
    };
  }, [title, C]);

  const t = f - start;
  if (t < 0) return createPortal(<group />, scene);
  // flip in about x with an overshoot, then a slow living float
  const flip = E.back(seg(t, 0, 12));
  const k = 0.0015019; // world units per 2D px
  const y = 1.412;
  const tagIn = E.back(seg(t, 5, 14));
  const sweep = seg(t, 10, 31);
  mats.sheen.uniforms.uX.value = lerp(-520, 520, sweep);
  mats.sheen.uniforms.uA.value = sweep > 0 && sweep < 1 ? 0.55 : 0;
  const float = clamp((t - 12) / 10);
  const rotX = (1 - flip) * -1.45 + float * Math.sin(t * 0.07) * 0.05;
  const rotY = float * Math.sin(t * 0.05 + 1) * 0.07;
  return createPortal(
    <>
      <directionalLight position={[-3, 4, 6]} intensity={2.4} color="#FFE7C8" />
      <directionalLight position={[4, -1, 3]} intensity={0.9} color="#C9B6FF" />
      <ambientLight intensity={0.35} />
      <group position={[0, y + (1 - flip) * 0.06, 0]} rotation={[rotX, rotY, 0]} scale={[k * lerp(0.9, 1, flip), k * lerp(0.9, 1, flip), k]}>
        <mesh geometry={parts.shadow} material={mats.shadow} position={[0, 0, -14]} />
        <mesh geometry={parts.body} material={[mats.face, mats.gold]} />
        <mesh geometry={parts.sheen} material={mats.sheen} position={[0, 0, 17.6]} />
        <group position={[0, -81 + (1 - tagIn) * 12, 6]} scale={[Math.max(0.001, tagIn), Math.max(0.001, tagIn), 1]}>
          <mesh geometry={parts.tag} material={[mats.tag, mats.gold]} />
        </group>
      </group>
    </>,
    scene,
  );
};

export const makeOverlayCamera = (aspect: number) => {
  const cam = new THREE.PerspectiveCamera(20, aspect, 0.1, 100);
  cam.position.set(0, 0, 10);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return cam;
};
