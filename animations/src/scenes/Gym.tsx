import React from 'react';
import { C } from '../hero/Hero';
import { seg } from '../lib/anim';
import { camP, Cam } from '../fx/Stage';
import { Cloud } from '../fx/fx';
import { rng } from '../lib/shape';

export { GymScene } from './BeastMode';

const INK = C.ink;

/* ------------------------------- barbell ------------------------------- */
export const Plate: React.FC<{ x: number; ry: number; rx: number; c: string; d: string }> = ({ x, ry, rx, c, d }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x={-rx} y={-ry} width={rx * 2} height={ry * 2} rx={rx} fill={d} stroke={INK} strokeWidth={7} />
    <ellipse cx={rx * 0.45} cy={0} rx={rx * 0.62} ry={ry - 10} fill={c} stroke={INK} strokeWidth={5} />
    <ellipse cx={rx * 0.45} cy={-ry * 0.42} rx={rx * 0.25} ry={ry * 0.22} fill="#FFFFFF" opacity={0.35} />
    <ellipse cx={rx * 0.45} cy={0} rx={rx * 0.24} ry={ry * 0.18} fill={d} stroke={INK} strokeWidth={4} />
  </g>
);

export const Barbell: React.FC<{ a: [number, number]; b: [number, number]; bend: number; L?: number }> = ({ a, b, bend, L = 420 }) => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const half = Math.max(160, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  // in bar-local coords (x along bar)
  const endY = -bend;
  const slope = (Math.atan2(endY, L - half) * 180) / Math.PI;
  const barD = `M${-L} ${endY} Q${-half - 40} 0 ${-half} 0 L${half} 0 Q${half + 40} 0 ${L} ${endY}`;
  const side = (s: -1 | 1) => (
    <g transform={`translate(${s * (L - 70)} ${endY * 0.82}) rotate(${-s * slope}) scale(${s} 1)`}>
      <Plate x={-36} ry={150} rx={30} c="#7254DC" d="#4F35B0" />
      <Plate x={0} ry={150} rx={30} c="#7254DC" d="#4F35B0" />
      <Plate x={34} ry={104} rx={24} c="#FFD064" d="#C77928" />
      <rect x={52} y={-30} width={26} height={60} rx={8} fill="#C5C0D1" stroke={INK} strokeWidth={6} />
    </g>
  );
  return (
    <g transform={`translate(${mx} ${my}) rotate(${(ang * 180) / Math.PI})`}>
      <path d={barD} fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
      <path d={barD} fill="none" stroke="#D3CEDE" strokeWidth={17} strokeLinecap="round" />
      <path d={`M${-half + 20} -4 L${half - 20} -4`} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.8} strokeLinecap="round" />
      {side(-1)}
      {side(1)}
    </g>
  );
};

/* ------------------------------- background ------------------------------- */
export const Column: React.FC<{ x: number; y0: number; y1: number; w: number }> = ({ x, y0, y1, w }) => (
  <g>
    <rect x={x - w / 2} y={y0} width={w} height={y1 - y0} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
    <rect x={x + w * 0.18} y={y0} width={w * 0.32} height={y1 - y0} fill="#E7E1F3" />
    {[-0.3, -0.1, 0.1, 0.3].map((k) => (
      <line key={k} x1={x + k * w} y1={y0 + 30} x2={x + k * w} y2={y1 - 30} stroke="#CFC6DE" strokeWidth={6} strokeLinecap="round" />
    ))}
    {/* capital */}
    <rect x={x - w * 0.75} y={y0 - 50} width={w * 1.5} height={44} rx={10} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
    <circle cx={x - w * 0.7} cy={y0 - 22} r={24} fill="#FFFDF8" stroke={INK} strokeWidth={7} />
    <circle cx={x + w * 0.7} cy={y0 - 22} r={24} fill="#FFFDF8" stroke={INK} strokeWidth={7} />
    <path d={`M${x - w * 0.7} ${y0 - 22} m-10 0 a10 10 0 1 1 10 10`} fill="none" stroke={INK} strokeWidth={4} />
    <path d={`M${x + w * 0.7} ${y0 - 22} m10 0 a10 10 0 1 0 -10 10`} fill="none" stroke={INK} strokeWidth={4} />
    <rect x={x - w * 0.62} y={y0 - 8} width={w * 1.24} height={20} rx={6} fill="#F0EBFB" stroke={INK} strokeWidth={7} />
    {/* base */}
    <rect x={x - w * 0.66} y={y1 - 6} width={w * 1.32} height={34} rx={8} fill="#F0EBFB" stroke={INK} strokeWidth={8} />
    <rect x={x - w * 0.78} y={y1 + 24} width={w * 1.56} height={34} rx={8} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
  </g>
);

export const GymBG: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number } }> = ({ f, cam, sh }) => {
  const r = rng(5);
  return (
    <>
      <defs>
        <linearGradient id="gymSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8BBAFE" />
          <stop offset="0.55" stopColor="#B4E1FA" />
          <stop offset="1" stopColor="#F7F3FF" />
        </linearGradient>
        <linearGradient id="gymFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9E3F7" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.15, sh)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="url(#gymSky)" />
        {/* god rays */}
        <g opacity={0.22} transform={`translate(540 -200) rotate(${Math.sin(f / 40) * 3})`}>
          {[-50, -30, -12, 6, 24, 42].map((a, i) => (
            <path key={i} d={`M0 0 L${Math.tan(((a - 6) * Math.PI) / 180) * 2400} 2400 L${Math.tan(((a + 6) * Math.PI) / 180) * 2400} 2400 Z`} fill="#FFFFFF" />
          ))}
        </g>
      </g>
      <g transform={camP(cam, 0.4, sh)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 300 + i * 190 + r() * 60;
          const w = 260 + r() * 220;
          const x = ((r() * 1400 + f * (0.6 + r() * 0.8)) % 1700) - 300;
          return <Cloud key={i} x={x} y={y} w={w} h={w * 0.42} seed={i + 3} opacity={0.95} />;
        })}
      </g>
      <g transform={camP(cam, 0.85, sh)}>
        {/* distant colonnade on horizon */}
        <rect x={-300} y={1290} width={1680} height={40} fill="#D9D0EC" />
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={i}>
            <rect x={-200 + i * 130} y={1150} width={34} height={150} fill="#E6DEF6" />
            <rect x={-208 + i * 130} y={1140} width={50} height={14} rx={4} fill="#E6DEF6" />
          </g>
        ))}
        <rect x={-300} y={1124} width={1680} height={22} fill="#E6DEF6" />
        {/* floor */}
        <path d="M-400 1330 L1480 1330 L1480 2400 L-400 2400 Z" fill="url(#gymFloor)" />
        {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((k) => (
          <line key={k} x1={540 + k * 70} y1={1330} x2={540 + k * 420} y2={2300} stroke="#D7CDE8" strokeWidth={5} />
        ))}
        {[1380, 1450, 1545, 1670, 1830, 2040].map((y) => (
          <line key={y} x1={-400} y1={y} x2={1480} y2={y} stroke="#D7CDE8" strokeWidth={5} />
        ))}
        <line x1={-400} y1={1330} x2={1480} y2={1330} stroke={INK} strokeWidth={6} opacity={0.5} />
        {/* dumbbell rack (left) */}
        <g transform="translate(150 1300)">
          <rect x={-90} y={-70} width={180} height={16} rx={8} fill="#87839C" stroke={INK} strokeWidth={5} />
          <rect x={-80} y={-56} width={12} height={58} fill="#87839C" stroke={INK} strokeWidth={5} />
          <rect x={68} y={-56} width={12} height={58} fill="#87839C" stroke={INK} strokeWidth={5} />
          {[-60, -20, 20, 60].map((x, i) => (
            <g key={x} transform={`translate(${x} -86)`}>
              <rect x={-14} y={-4} width={28} height={8} fill="#A3A2B9" stroke={INK} strokeWidth={3} />
              <rect x={-22} y={-14} width={10} height={28} rx={4} fill={['#F15F75', '#7E7EF3', '#FFD064', '#6ACC86'][i]} stroke={INK} strokeWidth={4} />
              <rect x={12} y={-14} width={10} height={28} rx={4} fill={['#F15F75', '#7E7EF3', '#FFD064', '#6ACC86'][i]} stroke={INK} strokeWidth={4} />
            </g>
          ))}
        </g>
        {/* kettlebells (right) */}
        {[870, 950].map((x, i) => (
          <g key={x} transform={`translate(${x} 1306) scale(${i ? 0.8 : 1})`}>
            <path d="M-22 -50 Q0 -88 22 -50" fill="none" stroke={INK} strokeWidth={18} />
            <path d="M-22 -50 Q0 -88 22 -50" fill="none" stroke="#65607B" strokeWidth={9} />
            <circle cx={0} cy={-20} r={34} fill="#65607B" stroke={INK} strokeWidth={6} />
            <circle cx={-10} cy={-30} r={9} fill="#FFFFFF" opacity={0.35} />
          </g>
        ))}
      </g>
    </>
  );
};

export const Columns: React.FC<{ cam: Cam; sh: { x: number; y: number; r: number } }> = ({ cam, sh }) => (
  <g transform={camP(cam, 1.08, sh)}>
    <Column x={30} y0={260} y1={1500} w={118} />
    <Column x={1050} y0={260} y1={1500} w={118} />
    {/* entablature */}
    <rect x={-200} y={130} width={1480} height={84} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
    <rect x={-200} y={196} width={1480} height={16} fill="#E7E1F3" />
    <path d={Array.from({ length: 40 }).map((_, i) => `M${-180 + i * 40} 186 V146 H${-152 + i * 40} V172 H${-166 + i * 40} V160`).join(' ')} fill="none" stroke="#6A5BE0" strokeWidth={6} />
  </g>
);

export const Platform: React.FC = () => (
  <g>
    <path d="M140 1640 L940 1640 L1000 1760 L80 1760 Z" fill="#E4AA73" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M140 1640 L300 1640 L262 1760 L80 1760 Z" fill="#433C4F" />
    <path d="M780 1640 L940 1640 L1000 1760 L818 1760 Z" fill="#433C4F" />
    {[380, 460, 540, 620, 700].map((x) => (
      <line key={x} x1={x} y1={1644} x2={540 + (x - 540) * 1.12} y2={1756} stroke="#C48654" strokeWidth={5} />
    ))}
    <path d="M140 1640 L940 1640 L1000 1760 L80 1760 Z" fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M80 1760 L1000 1760 L1000 1800 L80 1800 Z" fill="#B37648" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
  </g>
);

export const Cracks: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  const t = seg(f, start, start + 5);
  if (t <= 0) return null;
  const r = rng(77);
  const lines: string[] = [];
  for (let i = 0; i < 7; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let x = 540 + side * (40 + r() * 140);
    let y = 1690 + r() * 30;
    let d = `M${x} ${y}`;
    const n = 4 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      x += side * (30 + r() * 50) * t;
      y += (r() - 0.35) * 30 * t;
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    lines.push(d);
  }
  return (
    <g>
      {lines.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#774C2C" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" transform="translate(0 4)" />
        </g>
      ))}
    </g>
  );
};
