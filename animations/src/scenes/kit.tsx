// Small shared helpers + props for the extra celebration scenes.
import React from 'react';
import { C, rig, Pose } from '../hero/Hero';
import { M } from '../lib/m2';
import { TITLE_FONT } from '../fonts';
import { rng } from '../lib/shape';
import { FULL_H, TOP } from '../fx/Stage';

export const INK = C.ink;
export type Pt = [number, number];
export type Shake = { x: number; y: number; r: number };

/** Hero-space point -> stage point for a hero drawn at (gx, gy) with scale sc. */
export const stageOf = (gx: number, gy: number, sc: number) => (pt: Pt): Pt => [gx + pt[0] * sc, gy + pt[1] * sc];

/** Rotation (deg) of a rig matrix once placed in the world. */
export const worldAngle = (p: Pose, m: M) => {
  const r = rig(p);
  const a = r.W(m, 0, 0);
  const b = r.W(m, 100, 0);
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
};

/** Ballistic drop with one small bounce. t = frames since release. Returns y and whether it has landed. */
export const drop = (t: number, y0: number, floor: number, vy0 = -6, g = 2.2) => {
  if (t <= 0) return { y: y0, landed: false, tl: -1 };
  // solve y0 + vy0 t + g t^2 / 2 = floor
  const a = g / 2;
  const b = vy0;
  const c = y0 - floor;
  const tl = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  if (t < tl) return { y: y0 + vy0 * t + a * t * t, landed: false, tl };
  const tb = t - tl;
  const v = (vy0 + g * tl) * 0.28; // bounce speed
  const hop = Math.max(0, v * tb - a * tb * tb);
  return { y: floor - hop, landed: true, tl };
};

/* ------------------------------- props ------------------------------- */
export const Dumbbell: React.FC<{ c?: string; d?: string; y?: number }> = ({ c = C.violet, d = C.violetSh, y = 44 }) => (
  <g transform={`translate(0 ${y})`}>
    <rect x={-96} y={-12} width={192} height={24} rx={9} fill="#CFC8DF" stroke={INK} strokeWidth={6.5} />
    <rect x={-80} y={-7} width={160} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
    {[-1, 1].map((k) => (
      <g key={k} transform={`translate(${k * 76} 0)`}>
        <rect x={-25} y={-60} width={50} height={120} rx={17} fill={d} />
        <rect x={-25} y={-60} width={32} height={120} rx={15} fill={c} />
        <rect x={-15} y={-46} width={9} height={62} rx={4.5} fill="#FFFFFF" opacity={0.45} />
        <rect x={-25} y={-60} width={50} height={120} rx={17} fill="none" stroke={INK} strokeWidth={7} />
      </g>
    ))}
  </g>
);

export const Ticket: React.FC<{ x: number; y: number; rot: number; s?: number; flip?: number; text?: string }> = ({ x, y, rot, s = 1, flip = 1, text = 'GUN SHOW' }) => {
  const d = 'M-150 -70 H150 A22 22 0 0 0 150 -26 V26 A22 22 0 0 0 150 70 H-150 A22 22 0 0 0 -150 26 V-26 A22 22 0 0 0 -150 -70 Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * flip} ${s})`}>
      <path d={d} fill={INK} transform="translate(6 10)" />
      <path d={d} fill={C.gold} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d="M-150 -70 H150 A22 22 0 0 0 150 -26 V-6 H-150 Z" fill="#FFFFFF" opacity={0.28} />
      <line x1={86} y1={-60} x2={86} y2={60} stroke={C.goldSh} strokeWidth={6} strokeDasharray="10 10" />
      <text x={-30} y={-14} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={54} fill={C.violet} stroke={INK} strokeWidth={3}>
        {text}
      </text>
      <text x={-30} y={38} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={30} fill={INK} letterSpacing={3}>
        ADMIT ONE
      </text>
      <text x={120} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill={INK} transform="rotate(-90 120 6)">
        No.1
      </text>
    </g>
  );
};

/** Wavy steam / breath plume. */
export const Steam: React.FC<{ x: number; y: number; f: number; h?: number; o?: number; w?: number; seed?: number; color?: string }> = ({
  x, y, f, h = 160, o = 0.85, w = 16, seed = 1, color = '#FFFFFF',
}) => {
  if (o <= 0.01) return null;
  const r = rng(seed);
  const ph = r() * 6;
  const pts: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    const xx = x + Math.sin(k * 7 + f / 5 + ph) * 18 * k;
    const yy = y - k * h - ((f * 1.2) % 30) * 0.2;
    pts.push(`${i ? 'L' : 'M'}${xx.toFixed(1)} ${yy.toFixed(1)}`);
  }
  return <path d={pts.join('')} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
};

/** Falling snow (screen space). */
/** Snow over the full-height frame (TOP-90 … BOT+90); n is per 1920px of height, as before. */
const SPAN = FULL_H + 180;
export const Snow: React.FC<{ f: number; n?: number; seed?: number; speed?: number; wind?: number; o?: number }> = ({ f, n: n0 = 70, seed = 4, speed = 5, wind = -2, o = 1 }) => {
  const n = Math.round((n0 * SPAN) / 2100);
  const r = rng(seed);
  return (
    <g opacity={o}>
      {Array.from({ length: n }).map((_, i) => {
        const x0 = r() * 1400 - 160;
        const y0 = r() * SPAN;
        const s = 5 + r() * 12;
        const sp = speed * (0.6 + r() * 0.8) * (0.6 + s / 18);
        const y = ((y0 + f * sp) % SPAN) + TOP - 90;
        const x = x0 + wind * f * (0.6 + r() * 0.6) + Math.sin(f / 9 + i) * 14;
        const xx = ((x % 1400) + 1400) % 1400 - 160;
        return <circle key={i} cx={xx} cy={y} r={s} fill="#FFFFFF" stroke="#B9C4EE" strokeWidth={2} />;
      })}
    </g>
  );
};
