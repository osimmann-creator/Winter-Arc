import { createPortal } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TITLE_FONT } from '../../fonts';
import { E, clamp, rng, seg } from './math';
import { glintTexture } from './textures';

// The celebration end card from fx/EndCard.tsx in 3D: the ribbon (letters
// spring in one by one), its tails folding back, and the points coin that
// flips in on a real axis. Same colours, type and place on screen.

const INK = '#341720';
const GOLD = '#FFD064';
const GOLD_SH = '#C77928';
const K = 3.5265 / 2348; // overlay units per 2D px (fov 20, camera at z = 10)
const pxY = (y: number) => (1174 - y) * K;

const springy = (t: number, freq = 1.6, damp = 6) => (t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * 2 * t));

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

const starShape = (r1: number, r2: number, n: number) => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180;
    pts.push(new THREE.Vector2(r * Math.cos(a), -r * Math.sin(a)));
  }
  // round the points a little with a closed spline
  const curve = new THREE.SplineCurve([...pts, pts[0]]);
  return new THREE.Shape(curve.getPoints(n * 8));
};

const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, sx = 1 / w, sy = 1 / h, ox = 0.5, oy = 0.5) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * 2);
  canvas.height = Math.ceil(h * 2);
  const c = canvas.getContext('2d')!;
  c.scale(2, 2);
  draw(c);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(sx, sy);
  tex.offset.set(ox, oy);
  return tex;
};

const letterTexture = (ch: string, fs: number, light: string) => {
  const S = fs * 2;
  return canvasTex(S, S, (c) => {
    c.font = `${fs}px "${TITLE_FONT}"`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.lineJoin = 'round';
    const x = S / 2;
    const y = S / 2 + fs * 0.36;
    // drop shadow, then the ink outline, then the two-tone fill
    c.fillStyle = INK;
    c.strokeStyle = INK;
    c.lineWidth = fs * 0.2;
    c.strokeText(ch, x, y + fs * 0.07);
    c.fillText(ch, x, y + fs * 0.07);
    c.strokeText(ch, x, y);
    const g = c.createLinearGradient(0, y - fs * 0.72, 0, y);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.48, '#FFFFFF');
    g.addColorStop(0.52, light);
    g.addColorStop(1, light);
    c.fillStyle = g;
    c.fillText(ch, x, y);
  }, 1, 1, 0, 0);
};

export const RibbonCardOverlay: React.FC<{ f: number; start: number; title: string; pts: string; color: string; dark: string; light?: string; unit?: string; scene: THREE.Scene }> = ({ f, start, title, pts, color, dark, light = '#FFF0B7', unit = 'PTS', scene }) => {
  const parts = useMemo(() => {
    const fs = Math.min(132, 800 / (title.length * 0.64));
    const meas = document.createElement('canvas').getContext('2d')!;
    meas.font = `${fs}px "${TITLE_FONT}"`;
    const adv = title.split('').map((ch) => meas.measureText(ch).width);
    const textW = adv.reduce((a, b) => a + b, 0);
    const W = textW + 2 * 0.42 * fs + 20;
    const H = fs * 0.22 + fs + fs * 0.12 + 20;
    // ribbon body
    const body = new THREE.ExtrudeGeometry(roundedRect(W, H, 34), { depth: 16, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 3, curveSegments: 8 });
    const shadow = new THREE.ShapeGeometry(roundedRect(W + 6, H + 6, 36));
    const bodyTex = canvasTex(W + 8, H + 8, (c) => {
      c.translate((W + 8) / 2, (H + 8) / 2);
      const g = c.createLinearGradient(0, -H / 2, 0, H / 2);
      g.addColorStop(0, color);
      g.addColorStop(0.6, color);
      g.addColorStop(1, dark);
      c.fillStyle = g;
      c.beginPath();
      c.roundRect(-W / 2, -H / 2, W, H, 34);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = INK;
      c.beginPath();
      c.roundRect(-W / 2 + 5, -H / 2 + 5, W - 10, H - 10, 30);
      c.stroke();
      c.globalAlpha = 0.35;
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.roundRect(-W / 2 + 22, -H / 2 + 12, W - 44, 14, 10);
      c.fill();
    }, 1 / (W + 8), 1 / (H + 8), 0.5, 0.5);
    // tails: the notched ends, folding back behind the body
    const tail = (side: 1 | -1) => {
      const pts = [[150, 10], [20, 10], [52, 62], [20, 114], [150, 114]].map(([x, y]) => new THREE.Vector2(side * (W / 2 + 96 - x), H / 2 - 34 - y));
      if (side > 0) pts.reverse();
      return new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 12, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 2 });
    };
    const fold = (side: 1 | -1) => {
      const pts = [[150, 10], [102, 10], [102, -22]].map(([x, y]) => new THREE.Vector2(side * (W / 2 + 96 - x), H / 2 - 34 - y));
      if (side > 0) pts.reverse();
      return new THREE.ShapeGeometry(new THREE.Shape(pts));
    };
    // letters, laid out on the ribbon
    let x = -textW / 2;
    const letters = title.split('').map((ch, i) => {
      const cx = x + adv[i] / 2;
      x += adv[i];
      return { ch, x: cx, tex: ch === ' ' ? null : letterTexture(ch, fs, light) };
    });
    // the coin
    const coinR = 108;
    const coin = new THREE.ExtrudeGeometry(starShape(coinR + 8, coinR - 6, 24), { depth: 14, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 2, curveSegments: 4 });
    const coinTex = canvasTex(2 * coinR + 40, 2 * coinR + 40, (c) => {
      c.translate(coinR + 20, coinR + 20);
      c.fillStyle = GOLD_SH;
      c.beginPath();
      c.arc(0, 0, coinR + 14, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(0, 0, coinR - 14, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = GOLD_SH;
      c.fillRect(-coinR, -coinR, coinR * 2, coinR * 2);
      c.fillStyle = GOLD;
      c.beginPath();
      c.arc(-8, -10, coinR - 14, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.lineWidth = 7;
      c.strokeStyle = INK;
      c.beginPath();
      c.arc(0, 0, coinR - 14, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([2, 14]);
      c.lineCap = 'round';
      c.lineWidth = 5;
      c.strokeStyle = GOLD_SH;
      c.beginPath();
      c.arc(0, 0, coinR - 30, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.font = `${pts.length > 3 ? 70 : unit ? 84 : 100}px "${TITLE_FONT}"`;
      c.lineWidth = 14;
      c.strokeStyle = INK;
      c.strokeText(pts, 0, unit ? -2 : 8);
      c.fillStyle = '#FFFFFF';
      c.fillText(pts, 0, unit ? -2 : 8);
      if (unit) {
        c.font = `32px "${TITLE_FONT}"`;
        (c as unknown as { letterSpacing: string }).letterSpacing = '3px';
        c.fillStyle = INK;
        c.fillText(unit, 0, 56);
      }
    }, 1 / (2 * coinR + 40), 1 / (2 * coinR + 40), 0.5, 0.5);
    // confetti
    const r = rng(77);
    const confettiColors = ['#FF6B9A', '#7254DC', '#FFD064', '#4FC3F7', '#6CD98C', '#F2853A', '#FFFFFF'];
    const confetti = Array.from({ length: 90 }, () => ({
      x: (r() - 0.5) * 1.9,
      y0: 1.9 + r() * 0.9,
      speed: 0.018 + r() * 0.014,
      sway: r() * 6.28,
      spin: (r() - 0.5) * 0.5,
      tilt: r() * 6.28,
      z: -0.6 + r() * 0.5,
      c: confettiColors[Math.floor(r() * confettiColors.length)],
      w: 0.014 + r() * 0.01,
      delay: r() * 10,
    }));
    // the back gets its own face, the right way round, so the flip never reads mirrored
    const coinBack = new THREE.ShapeGeometry(starShape(coinR + 8, coinR - 6, 24), 4);
    return { fs, W, H, body, shadow, bodyTex, tails: [tail(-1), tail(1)], folds: [fold(-1), fold(1)], letters, coin, coinBack, coinTex, coinR, confetti };
  }, [title, pts, color, dark, light, unit]);

  const mats = useMemo(
    () => ({
      face: new THREE.MeshStandardMaterial({ map: parts.bodyTex, roughness: 0.42, metalness: 0.05 }),
      side: new THREE.MeshStandardMaterial({ color: dark, roughness: 0.5 }),
      ink: new THREE.MeshBasicMaterial({ color: INK }),
      shadow: new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.85 }),
      tail: new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
      tailDark: new THREE.MeshStandardMaterial({ color: dark, roughness: 0.55, side: THREE.DoubleSide }),
      letters: parts.letters.map((l) => (l.tex ? new THREE.MeshBasicMaterial({ map: l.tex, transparent: true, depthWrite: false }) : null)),
      coinFace: new THREE.MeshStandardMaterial({ map: parts.coinTex, metalness: 0.55, roughness: 0.3 }),
      coinSide: new THREE.MeshStandardMaterial({ color: GOLD_SH, metalness: 1, roughness: 0.3 }),
      spark: new THREE.SpriteMaterial({ map: glintTexture(), color: new THREE.Color(2.2, 2.2, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      confetti: new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }),
    }),
    [parts, color, dark],
  );
  const confettiMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.6), mats.confetti, parts.confetti.length);
    const col = new THREE.Color();
    parts.confetti.forEach((p, i) => m.setColorAt(i, col.set(p.c)));
    m.frustumCulled = false;
    return m;
  }, [mats, parts]);

  const t = f - start;
  if (t < 0) return createPortal(<group />, scene);
  // confetti falls from the top of the frame
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  parts.confetti.forEach((p, i) => {
    const age = Math.max(0, t - p.delay);
    const y = p.y0 - age * p.speed;
    const pos = new THREE.Vector3(p.x + Math.sin(age * 0.12 + p.sway) * 0.05, y, p.z);
    q.setFromEuler(new THREE.Euler(p.tilt + age * p.spin, age * p.spin * 1.3, p.sway + age * 0.05));
    const s = age > 0 ? p.w : 0.0001;
    mtx.compose(pos, q, new THREE.Vector3(s, s, s));
    confettiMesh.setMatrixAt(i, mtx);
  });
  confettiMesh.instanceMatrix.needsUpdate = true;

  const k = springy(t / 13, 1.3, 5);
  const rotDeg = -4 + (1 - Math.min(1, k)) * -10 + Math.sin(t / 14) * 0.8;
  const ribbonY = pxY(96 + 214 + parts.H / 2);
  const ct = t - 10;
  const ck = springy(ct / 15, 1.4, 5);
  const ang = 3 * Math.PI * (1 - E.out(seg(ct, 0, 26)));
  const coinY = pxY(96 + 214 + parts.H + 36 + parts.coinR + 20);
  return createPortal(
    <>
      <directionalLight position={[-3, 4, 6]} intensity={2.2} color="#FFF2E0" />
      <directionalLight position={[4, -1, 3]} intensity={0.7} color="#D6C8FF" />
      <ambientLight intensity={0.55} />
      <primitive object={confettiMesh} />
      <group position={[0, ribbonY, 0]} rotation={[0, 0, (-rotDeg * Math.PI) / 180]} scale={[K * Math.max(0.0001, k), K * Math.max(0.0001, k), K]}>
        <mesh geometry={parts.shadow} material={mats.shadow} position={[0, -16, -12]} />
        {[0, 1].map((i) => {
          const s = i === 0 ? -1 : 1;
          return (
            <group key={i} position={[(s * parts.W) / 2, 0, -6]} rotation={[0, s * 0.5, 0]}>
              <group position={[(-s * parts.W) / 2, 0, -10]}>
                <mesh geometry={parts.tails[i]} material={[mats.tail, mats.ink]} />
                <mesh geometry={parts.folds[i]} material={mats.tailDark} position={[0, 0, 15]} />
              </group>
            </group>
          );
        })}
        <mesh geometry={parts.body} material={[mats.face, mats.side]} />
        {parts.letters.map((l, i) => {
          if (!mats.letters[i]) return null;
          const t0 = 5 + i * 1.6;
          const lk = springy((t - t0) / 11, 1.5, 5.2);
          const bob = t > t0 + 12 ? Math.sin((t + i * 3.2) / 5.5) * 3.5 : 0;
          const ly = -6 + (1 - Math.min(1, lk)) * 50 - bob;
          const lr = (((1 - Math.min(1, lk)) * (i % 2 ? 14 : -14)) * Math.PI) / 180;
          const sc = Math.max(0.0001, lk) * parts.fs * 2;
          return <mesh key={i} material={mats.letters[i]!} position={[l.x, ly, 24 + i * 0.01]} rotation={[0, 0, -lr]} scale={[sc, sc, 1]}><planeGeometry /></mesh>;
        })}
      </group>
      {ct >= 0 && (
        <group position={[0, coinY, 0.2]}>
          <group rotation={[0, ang, ((1 - clamp(ck)) * 40 * Math.PI) / 180]} scale={[K * Math.max(0.0001, ck), K * Math.max(0.0001, ck), K * Math.max(0.0001, ck)]}>
            <mesh geometry={parts.coin} material={[mats.coinFace, mats.coinSide]} position={[0, 0, -9]} />
            <mesh geometry={parts.coinBack} material={mats.coinFace} position={[0, 0, -13.4]} rotation-y={Math.PI} />
          </group>
          {[0, 1, 2].map((i) => {
            const tt = clamp((ct - 16 - i * 7) / 16);
            if (tt <= 0 || tt >= 1) return null;
            const a = ([-40, 200, 120][i] * Math.PI) / 180;
            const s = Math.sin(Math.PI * tt) * 70 * K;
            return <sprite key={i} material={mats.spark} position={[Math.cos(a) * (parts.coinR + 30) * K, -Math.sin(a) * (parts.coinR + 30) * K, 0.05]} scale={[s, s, 1]} material-rotation={E.out(tt) * 0.8} />;
          })}
        </group>
      )}
    </>,
    scene,
  );
};

