import * as THREE from 'three';
import { rng } from './math';

// Every texture is painted on a canvas at load time with seeded randomness,
// so each render tab paints the same pixels.

const INK = '#2A1218';
const cache = new Map<string, THREE.Texture>();

const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, opts: { srgb?: boolean; repeat?: [number, number]; aniso?: number } = {}) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.anisotropy = opts.aniso ?? 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
};

/** Eyeball: sclera with the iris on the sphere's +z side (u = 0.25, v = 0.5). */
export const eyeTexture = () =>
  make('eye', 1024, 512, (c, w, h) => {
    c.fillStyle = '#FFFDF7';
    c.fillRect(0, 0, w, h);
    // faint warm shading toward the back of the ball
    const back = c.createLinearGradient(0, 0, w, 0);
    back.addColorStop(0, 'rgba(240,215,200,0.0)');
    back.addColorStop(0.75, 'rgba(240,210,195,0.35)');
    back.addColorStop(1, 'rgba(240,215,200,0.0)');
    c.fillStyle = back;
    c.fillRect(0, 0, w, h);
    const cx = w * 0.25;
    const cy = h * 0.5;
    const r = (h * 0.42) / Math.PI; // iris: 0.42 rad across the ball
    const iris = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    iris.addColorStop(0, '#C98A62');
    iris.addColorStop(0.55, '#8F513D');
    iris.addColorStop(1, '#4E2620');
    c.fillStyle = iris;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = r * 0.12;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = '#140A0C';
    c.beginPath();
    c.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.arc(cx - r * 0.3, cy - r * 0.34, r * 0.26, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.85;
    c.beginPath();
    c.arc(cx + r * 0.3, cy + r * 0.3, r * 0.11, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  });

/** Mouth shapes, drawn like the 2D Flexander: ink outline, dark mouth, white teeth. */
export type MouthShape = 'o' | 'focus' | 'grit' | 'grin' | 'smile' | 'kiss' | 'smirk' | 'wow';
export const mouthTexture = (shape: MouthShape) =>
  make('mouth-' + shape, 512, 256, (c) => {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = INK;
    const inside = '#5A1822';
    if (shape === 'o') {
      c.fillStyle = inside;
      c.beginPath();
      c.ellipse(256, 132, 34, 42, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#E3707B';
      c.beginPath();
      c.ellipse(256, 156, 22, 13, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 11;
      c.beginPath();
      c.ellipse(256, 132, 34, 42, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (shape === 'focus') {
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(188, 134);
      c.quadraticCurveTo(256, 118, 324, 134);
      c.stroke();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(184, 126);
      c.lineTo(192, 142);
      c.moveTo(328, 126);
      c.lineTo(320, 142);
      c.stroke();
    } else if (shape === 'grit') {
      const path = () => {
        c.beginPath();
        c.moveTo(140, 104);
        c.quadraticCurveTo(256, 84, 372, 104);
        c.quadraticCurveTo(392, 132, 368, 166);
        c.quadraticCurveTo(256, 182, 144, 166);
        c.quadraticCurveTo(120, 132, 140, 104);
        c.closePath();
      };
      path();
      c.fillStyle = '#FFFDF6';
      c.fill();
      c.save();
      path();
      c.clip();
      c.fillStyle = 'rgba(160,120,120,0.35)';
      c.fillRect(120, 160, 280, 40);
      c.strokeStyle = 'rgba(42,18,24,0.85)';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(130, 135);
      c.quadraticCurveTo(256, 128, 382, 135);
      c.stroke();
      c.lineWidth = 4;
      for (let x = 172; x <= 340; x += 34) {
        c.beginPath();
        c.moveTo(x, 90);
        c.lineTo(x + 2, 180);
        c.stroke();
      }
      c.restore();
      c.strokeStyle = INK;
      c.lineWidth = 11;
      path();
      c.stroke();
    } else if (shape === 'grin') {
      const path = () => {
        c.beginPath();
        c.moveTo(112, 92);
        c.quadraticCurveTo(256, 120, 400, 92);
        c.quadraticCurveTo(392, 232, 256, 236);
        c.quadraticCurveTo(120, 232, 112, 92);
        c.closePath();
      };
      path();
      c.fillStyle = inside;
      c.fill();
      c.save();
      path();
      c.clip();
      c.fillStyle = '#FFFDF6';
      c.beginPath();
      c.moveTo(100, 80);
      c.quadraticCurveTo(256, 112, 412, 80);
      c.lineTo(412, 138);
      c.quadraticCurveTo(256, 160, 100, 138);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(42,18,24,0.5)';
      c.lineWidth = 3;
      for (let x = 190; x <= 330; x += 46) {
        c.beginPath();
        c.moveTo(x, 104);
        c.lineTo(x, 148);
        c.stroke();
      }
      c.fillStyle = '#E3707B';
      c.beginPath();
      c.ellipse(256, 236, 92, 50, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.strokeStyle = INK;
      c.lineWidth = 11;
      path();
      c.stroke();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(100, 78);
      c.quadraticCurveTo(108, 96, 122, 100);
      c.moveTo(412, 78);
      c.quadraticCurveTo(404, 96, 390, 100);
      c.stroke();
    } else if (shape === 'kiss') {
      c.fillStyle = '#C8445E';
      c.beginPath();
      c.ellipse(262, 128, 30, 26, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7A1E30';
      c.beginPath();
      c.ellipse(262, 128, 11, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 10;
      c.beginPath();
      c.ellipse(262, 128, 30, 26, 0, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(250, 104);
      c.lineTo(252, 112);
      c.moveTo(274, 104);
      c.lineTo(272, 112);
      c.moveTo(250, 152);
      c.lineTo(252, 144);
      c.moveTo(274, 152);
      c.lineTo(272, 144);
      c.stroke();
    } else if (shape === 'smirk') {
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(186, 140);
      c.quadraticCurveTo(270, 150, 334, 104);
      c.stroke();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(336, 92);
      c.quadraticCurveTo(334, 106, 346, 114);
      c.stroke();
    } else if (shape === 'wow') {
      const path = () => {
        c.beginPath();
        c.ellipse(256, 140, 56, 70, 0, 0, Math.PI * 2);
      };
      path();
      c.fillStyle = inside;
      c.fill();
      c.save();
      path();
      c.clip();
      c.fillStyle = '#FFFDF6';
      c.fillRect(190, 60, 132, 30);
      c.fillStyle = '#E3707B';
      c.beginPath();
      c.ellipse(256, 206, 44, 30, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.lineWidth = 11;
      path();
      c.stroke();
    } else {
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(168, 112);
      c.quadraticCurveTo(256, 176, 344, 112);
      c.stroke();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(160, 104);
      c.quadraticCurveTo(164, 116, 176, 120);
      c.moveTo(352, 104);
      c.quadraticCurveTo(348, 116, 336, 120);
      c.stroke();
    }
  });

/** Soft round blush. */
export const blushTexture = () =>
  make('blush', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(231,105,90,0.9)');
    g.addColorStop(0.6, 'rgba(231,105,90,0.35)');
    g.addColorStop(1, 'rgba(231,105,90,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });

/** Greek key (meander) band, drawn along a strip. */
const meander = (c: CanvasRenderingContext2D, x0: number, y0: number, len: number, hgt: number, color: string, lw: number) => {
  const u = hgt / 5;
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineJoin = 'miter';
  c.beginPath();
  for (let x = x0; x < x0 + len; x += u * 5) {
    c.moveTo(x, y0 + hgt);
    c.lineTo(x, y0);
    c.lineTo(x + u * 4, y0);
    c.lineTo(x + u * 4, y0 + u * 3);
    c.lineTo(x + u * 2, y0 + u * 3);
    c.lineTo(x + u * 2, y0 + u * 1.6);
    c.moveTo(x + u * 2.9, y0 + hgt);
    c.lineTo(x + u * 5, y0 + hgt);
  }
  c.stroke();
};

/** Toga skirt: white cloth, violet meander hem with a gold line above it. */
export const skirtTexture = () =>
  make('skirt', 2048, 512, (c, w, h) => {
    c.fillStyle = '#FFFAF2';
    c.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(220,205,215,${0.04 + r() * 0.05})`;
      c.fillRect(r() * w, r() * h * 0.8, 1 + r() * 3, 20 + r() * 80);
    }
    const band = h * 0.2;
    c.fillStyle = '#7254DC';
    c.fillRect(0, h - band, w, band);
    c.fillStyle = '#4F35B0';
    c.fillRect(0, h - 10, w, 10);
    meander(c, 0, h - band + band * 0.2, w, band * 0.56, '#E6DEFF', 9);
    c.fillStyle = '#F2C15A';
    c.fillRect(0, h - band - 14, w, 9);
  });

/** Sash cloth: white with a thin violet edge on both sides. */
export const sashTexture = () =>
  make('sash', 64, 256, (c, w, h) => {
    c.fillStyle = '#FFFAF2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#BCABFF';
    c.fillRect(0, 0, 5, h);
    c.fillRect(w - 5, 0, 5, h);
    c.fillStyle = 'rgba(200,185,215,0.35)';
    for (let x = 14; x < w - 10; x += 12) c.fillRect(x, 0, 2, h);
  });

/** Bumper plate face: dark rubber, raised ring, gold pinstripe, Ω mark. */
export const plateTexture = () =>
  make('plate', 1024, 1024, (c, w) => {
    const m = w / 2;
    const g = c.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, '#2A3045');
    g.addColorStop(0.7, '#1E2334');
    g.addColorStop(1, '#151927');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    const ring = (r: number, lw: number, color: string) => {
      c.strokeStyle = color;
      c.lineWidth = lw;
      c.beginPath();
      c.arc(m, m, r * m, 0, Math.PI * 2);
      c.stroke();
    };
    ring(0.95, 14, '#2E3550');
    ring(0.88, 5, '#C9964F');
    ring(0.6, 30, '#262C42');
    ring(0.36, 8, '#3A4260');
    c.fillStyle = '#C9964F';
    c.font = 'bold 120px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Ω', m, m * 0.32);
    c.font = 'bold 74px Georgia, serif';
    c.fillStyle = '#8B95B8';
    c.fillText('25', m, m * 1.68);
    const r = rng(11);
    for (let i = 0; i < 3000; i++) {
      c.fillStyle = `rgba(255,255,255,${r() * 0.025})`;
      c.fillRect(r() * w, r() * w, 2, 2);
    }
  });

/** Polished temple floor: long planks running toward the back wall. */
export const woodTexture = () =>
  make('wood', 2048, 2048, (c, w, h) => {
    const r = rng(21);
    const planks = 16;
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      let y = -r() * h;
      while (y < h) {
        const len = h * (0.35 + r() * 0.5);
        const hue = 14 + r() * 8;
        const light = 27 + r() * 9;
        c.fillStyle = `hsl(${hue}, ${52 + r() * 12}%, ${light}%)`;
        c.fillRect(i * pw, y, pw, len);
        // grain
        for (let k = 0; k < 26; k++) {
          const gx = i * pw + r() * pw;
          c.strokeStyle = `rgba(${40 + r() * 30},${14 + r() * 10},${8},${0.12 + r() * 0.18})`;
          c.lineWidth = 1 + r() * 2.5;
          c.beginPath();
          c.moveTo(gx, y);
          let xx = gx;
          for (let s = 0; s <= 12; s++) {
            xx += (r() - 0.5) * 3;
            c.lineTo(Math.min(i * pw + pw - 2, Math.max(i * pw + 2, xx)), y + (len * s) / 12);
          }
          c.stroke();
        }
        c.fillStyle = 'rgba(30,10,6,0.85)';
        c.fillRect(i * pw, y + len - 3, pw, 4);
        y += len;
      }
      c.fillStyle = 'rgba(25,8,5,0.9)';
      c.fillRect(i * pw, 0, 3, h);
    }
    // warm sheen variation
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(255,170,110,${r() * 0.05})`;
      c.fillRect(r() * w, r() * h, r() * 300, r() * 600);
    }
  }, { repeat: [1, 1] });

export const platformWoodTexture = () =>
  make('platform', 1024, 1024, (c, w, h) => {
    const r = rng(33);
    const boards = 8;
    for (let i = 0; i < boards; i++) {
      c.fillStyle = `hsl(${28 + r() * 6}, ${45 + r() * 10}%, ${50 + r() * 8}%)`;
      c.fillRect(0, (i * h) / boards, w, h / boards);
      for (let k = 0; k < 30; k++) {
        c.strokeStyle = `rgba(110,60,25,${0.1 + r() * 0.2})`;
        c.lineWidth = 1 + r() * 2;
        const y = (i * h) / boards + r() * (h / boards);
        c.beginPath();
        c.moveTo(0, y);
        c.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 10, w * 0.7, y + (r() - 0.5) * 10, w, y + (r() - 0.5) * 6);
        c.stroke();
      }
      c.fillStyle = 'rgba(70,35,15,0.7)';
      c.fillRect(0, (i * h) / boards, w, 3);
    }
    // gold bolt emblem in the middle
    c.save();
    c.translate(w / 2, h / 2);
    c.fillStyle = 'rgba(120,70,30,0.35)';
    c.beginPath();
    c.arc(0, 0, 150, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#C9964F';
    c.lineWidth = 10;
    c.stroke();
    c.fillStyle = '#E2B868';
    c.beginPath();
    c.moveTo(20, -110);
    c.lineTo(-60, 15);
    c.lineTo(-5, 15);
    c.lineTo(-25, 110);
    c.lineTo(60, -20);
    c.lineTo(5, -20);
    c.closePath();
    c.fill();
    c.restore();
  });

export const rubberTexture = () =>
  make('rubber', 512, 512, (c, w, h) => {
    c.fillStyle = '#26262C';
    c.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let i = 0; i < 9000; i++) {
      const v = 30 + r() * 30;
      c.fillStyle = `rgba(${v},${v},${v + 6},0.5)`;
      c.fillRect(r() * w, r() * h, 2, 2);
    }
  });

/** Pink-cream marble with soft violet-grey veins. */
export const marbleTexture = () =>
  make('marble', 1024, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#EBD8CB');
    g.addColorStop(0.5, '#E2CCBF');
    g.addColorStop(1, '#EED9C6');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = rng(53);
    for (let v = 0; v < 26; v++) {
      let x = r() * w;
      let y = r() * h;
      let a = r() * Math.PI * 2;
      c.strokeStyle = `rgba(${120 + r() * 40},${100 + r() * 30},${120 + r() * 30},${0.08 + r() * 0.22})`;
      c.lineWidth = 0.6 + r() * 2.6;
      c.beginPath();
      c.moveTo(x, y);
      const steps = 30 + r() * 60;
      for (let s = 0; s < steps; s++) {
        a += (r() - 0.5) * 0.7;
        x += Math.cos(a) * 14;
        y += Math.sin(a) * 14;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }, { repeat: [1, 1] });

/** The red-and-gold chevron frieze from the painting. */
export const friezeTexture = () =>
  make('frieze', 1024, 128, (c, w, h) => {
    c.fillStyle = '#6A2226';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#C9964F';
    c.fillRect(0, 0, w, 9);
    c.fillRect(0, h - 9, w, 9);
    c.fillStyle = '#E0A85E';
    for (let i = 0; i < 16; i++) {
      const x = i * 64 + 10;
      const dir = i < 8 ? 1 : -1;
      c.beginPath();
      c.moveTo(x, 28);
      c.lineTo(x + 26 * dir + (dir < 0 ? 52 : 0), 64);
      c.lineTo(x + (dir < 0 ? 52 : 0), 100);
      c.lineTo(x + 18 + (dir < 0 ? 16 : 0), 100);
      c.lineTo(x + 18 + 26 * dir + (dir < 0 ? 16 + 18 : 0), 64);
      c.lineTo(x + 18 + (dir < 0 ? 16 : 0), 28);
      c.closePath();
      c.fill();
    }
  }, { repeat: [1, 1] });

/** Bright sunset sky seen through the tall side windows. */
export const sideSkyTexture = () =>
  make('sidesky', 256, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#C48DB0');
    g.addColorStop(0.35, '#F6A17A');
    g.addColorStop(0.7, '#FFD08C');
    g.addColorStop(1, '#FFF0C4');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = rng(61);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = `rgba(255,${200 + r() * 40},${170 + r() * 50},${0.15 + r() * 0.2})`;
      c.beginPath();
      c.ellipse(r() * w, h * 0.2 + r() * h * 0.6, 60 + r() * 120, 14 + r() * 30, 0, 0, Math.PI * 2);
      c.fill();
    }
  });

/** Light shaft: soft across, streaky along, fading at both ends. */
export const shaftTexture = () =>
  make('shaft', 256, 512, (c, w, h) => {
    const r = rng(71);
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const width = 4 + r() * 26;
      const g = c.createLinearGradient(x - width, 0, x + width, 0);
      const a = 0.15 + r() * 0.4;
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - width, 0, width * 2, h);
    }
    // edges soft, ends faded
    c.globalCompositeOperation = 'destination-in';
    const across = c.createLinearGradient(0, 0, w, 0);
    across.addColorStop(0, 'rgba(0,0,0,0)');
    across.addColorStop(0.2, 'rgba(0,0,0,1)');
    across.addColorStop(0.8, 'rgba(0,0,0,1)');
    across.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, w, h);
    const along = c.createLinearGradient(0, 0, 0, h);
    along.addColorStop(0, 'rgba(0,0,0,0)');
    along.addColorStop(0.12, 'rgba(0,0,0,1)');
    along.addColorStop(0.6, 'rgba(0,0,0,0.8)');
    along.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = along;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }, { srgb: false });

/** Soft round sprite for dust and chalk. */
export const softDot = () =>
  make('dot', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }, { srgb: false });

/** Four-point star glint. */
export const glintTexture = () =>
  make('glint', 256, 256, (c) => {
    c.translate(128, 128);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(-128, -128, 256, 256);
    for (const a of [0, Math.PI / 2]) {
      c.save();
      c.rotate(a);
      const s = c.createLinearGradient(-128, 0, 128, 0);
      s.addColorStop(0, 'rgba(255,255,255,0)');
      s.addColorStop(0.5, 'rgba(255,255,255,1)');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = s;
      c.beginPath();
      c.moveTo(-128, 0);
      c.lineTo(0, -7);
      c.lineTo(128, 0);
      c.lineTo(0, 7);
      c.closePath();
      c.fill();
      c.restore();
    }
  }, { srgb: false });

/** Night sky for the side windows: deep blue, a lighter horizon, stars. */
export const nightSkyTexture = () =>
  make('nightsky', 256, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0A0F2E');
    g.addColorStop(0.5, '#16245E');
    g.addColorStop(0.85, '#2E4290');
    g.addColorStop(1, '#5A6FB8');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = rng(613);
    for (let i = 0; i < 420; i++) {
      const s = r() < 0.92 ? 1 : 2;
      c.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
      c.fillRect(r() * w, r() * h * 0.85, s, s);
    }
  });

/** A soft teardrop for flames. */
export const softDotWarm = () =>
  make('flame', 128, 192, (c) => {
    const g = c.createRadialGradient(64, 120, 2, 64, 110, 70);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(64, 4);
    c.bezierCurveTo(100, 70, 120, 120, 100, 160);
    c.bezierCurveTo(84, 190, 44, 190, 28, 160);
    c.bezierCurveTo(8, 120, 28, 70, 64, 4);
    c.fill();
  }, { srgb: false });

/** Snowy view through the Winter Arc Gym's windows: sky, mountains, pines. */
export const snowViewTexture = () =>
  make('snowview', 2048, 1024, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#8FB8E6');
    sky.addColorStop(1, '#E6F0FA');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    const r = rng(717);
    // winter sun, low on the left
    const sun = c.createRadialGradient(w * 0.22, h * 0.3, 0, w * 0.22, h * 0.3, 260);
    sun.addColorStop(0, 'rgba(255,250,232,1)');
    sun.addColorStop(0.25, 'rgba(255,244,214,0.8)');
    sun.addColorStop(1, 'rgba(255,244,214,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
      c.beginPath();
      c.ellipse(r() * w, h * (0.08 + r() * 0.3), 120 + r() * 220, 26 + r() * 30, 0, 0, Math.PI * 2);
      c.fill();
    }
    // far mountains
    c.fillStyle = '#C9D9EE';
    c.beginPath();
    c.moveTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 64) c.lineTo(x, h * (0.46 + 0.1 * Math.abs(Math.sin(x * 0.0031 + 1.3)) + 0.04 * Math.sin(x * 0.011)));
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    // snowy hills
    c.fillStyle = '#F4F8FD';
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, h * (0.66 + 0.05 * Math.sin(x * 0.004 + 2)));
    c.lineTo(w, h);
    c.fill();
    // pines with snow on their boughs
    const pine = (x: number, y: number, s: number, shade: string) => {
      c.fillStyle = '#5B4030';
      c.fillRect(x - s * 0.06, y - s * 0.15, s * 0.12, s * 0.18);
      for (let k = 0; k < 4; k++) {
        const ty = y - s * (0.15 + k * 0.22);
        const tw = s * (0.5 - k * 0.1);
        c.fillStyle = shade;
        c.beginPath();
        c.moveTo(x - tw, ty);
        c.lineTo(x, ty - s * 0.36);
        c.lineTo(x + tw, ty);
        c.closePath();
        c.fill();
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.moveTo(x - tw * 0.55, ty - s * 0.16);
        c.lineTo(x, ty - s * 0.36);
        c.lineTo(x + tw * 0.55, ty - s * 0.16);
        c.quadraticCurveTo(x, ty - s * 0.1, x - tw * 0.55, ty - s * 0.16);
        c.fill();
      }
    };
    for (let i = 0; i < 26; i++) pine(r() * w, h * (0.68 + r() * 0.04), 60 + r() * 70, '#3E6A5A');
    for (let i = 0; i < 16; i++) pine(r() * w, h * (0.8 + r() * 0.12), 140 + r() * 110, '#2F5A4A');
  });

/** Dark slate floor tiles with light grout. */
export const tileTexture = () =>
  make('tiles', 1024, 1024, (c, w, h) => {
    const r = rng(821);
    const n = 4;
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const l = 30 + r() * 6;
        c.fillStyle = `hsl(${238 + r() * 8}, ${14 + r() * 6}%, ${l}%)`;
        c.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 40; k++) {
          c.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
          c.fillRect(i * s + r() * s, j * s + r() * s, 3 + r() * 40, 2 + r() * 4);
        }
      }
    c.strokeStyle = 'rgba(205,200,225,0.55)';
    c.lineWidth = 6;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo(i * s, 0);
      c.lineTo(i * s, h);
      c.moveTo(0, i * s);
      c.lineTo(w, i * s);
      c.stroke();
    }
  });

/** The WINTER ARC GYM sign: purple plate, cream letters, gold stars. */
export const gymSignTexture = () =>
  make('gymsign', 2048, 320, (c, w, h) => {
    c.fillStyle = '#5B3FB8';
    c.beginPath();
    c.roundRect(10, 10, w - 20, h - 20, 70);
    c.fill();
    c.lineWidth = 16;
    c.strokeStyle = '#FFF6E8';
    c.beginPath();
    c.roundRect(34, 34, w - 68, h - 68, 54);
    c.stroke();
    c.font = '170px "Luckiest Guy"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#2A1846';
    c.fillText('WINTER ARC GYM', w / 2 + 6, h / 2 + 16);
    c.fillStyle = '#FFF6E8';
    c.fillText('WINTER ARC GYM', w / 2, h / 2 + 8);
    const star = (x: number, y: number, r1: number) => {
      c.fillStyle = '#FFD064';
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r1 * 0.45 : r1;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      c.fill();
    };
    star(120, h / 2, 44);
    star(w - 120, h / 2, 44);
  });

/** Warm cream plaster for the gym walls. */
export const plasterTexture = () =>
  make('plaster', 512, 512, (c, w, h) => {
    c.fillStyle = '#F6EDE0';
    c.fillRect(0, 0, w, h);
    const r = rng(931);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(${200 + r() * 40},${180 + r() * 40},${170 + r() * 40},${r() * 0.08})`;
      c.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6);
    }
  }, { repeat: [1, 1] });
