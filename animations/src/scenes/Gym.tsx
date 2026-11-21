import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key } from '../lib/anim';
import { ap, M } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Dust, Cloud, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1700;
const SC = 0.9;

/* ------------------------------- poses ------------------------------- */
const SQUAT: Partial<Pose> = {
  hipL: 42, hipR: 42, knL: -50, knR: -50, thL: 0.64, thR: 0.64, ftL: 8, ftR: 8,
  torsoSy: 0.8, lookY: -0.5, head: 0,
  shL: 3, shR: 3, elL: 0, elR: 0, wrL: 0, wrR: 0, flexL: 0.6, flexR: 0.6,
  mouthMode: 'grit', mouthOpen: 0, smile: 0, lid: 0.35, browTilt: -1, brow: -0.3, sweat: 1, red: 0.25,
  handL: 'fist', handR: 'fist', armZL: 'mid', armZR: 'mid',
};
const PULL: Partial<Pose> = {
  hipL: 14, hipR: 14, knL: -14, knR: -14, thL: 0.94, thR: 0.94, ftL: 4, ftR: 4, torsoSy: 0.95,
  shL: 5, shR: 5, elL: 0, elR: 0, lookY: -0.2, red: 0.85, lid: 0.45, sweat: 1,
};
const DIP: Partial<Pose> = {
  hipL: 28, hipR: 28, knL: -32, knR: -32, thL: 0.82, thR: 0.82, torsoSy: 0.9, sy: 0.95, sx: 1.03,
  shL: 8, shR: 8, elL: 10, elR: 10, lid: 1, red: 1, browTilt: -1,
};
const RACK: Partial<Pose> = {
  hipL: 14, hipR: 14, knL: -6, knR: -6, thL: 1, thR: 1, torsoSy: 1.02, sy: 1.08, sx: 0.96,
  shL: 34, shR: 34, elL: 132, elR: 132, uaL: 0.8, uaR: 0.8, wrL: -20, wrR: -20,
  mouthMode: 'grin', mouthOpen: 1, smile: 0.6, lid: 0, red: 0.5, brow: 1, browTilt: -0.4,
};
const OVER: Partial<Pose> = {
  hipL: 24, hipR: 24, knL: -12, knR: -12, thL: 1, thR: 1, ftL: 6, ftR: 6, torsoSy: 1, sy: 1, sx: 1,
  chestS: 1.05, shL: 167, shR: 167, elL: -8, elR: -8, uaL: 1.26, uaR: 1.26, faL: 1.26, faR: 1.26, shrugL: 40, shrugR: 40,
  wrL: 0, wrR: 0, flexL: 0.9, flexR: 0.9,
  mouthMode: 'grin', mouthOpen: 0.75, smile: 1, lid: 0, browTilt: 0, brow: 0.9, red: 0, sweat: 0, lookY: -0.1,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: SQUAT },
  { f: 10, p: { lookY: -0.3 } },
  { f: 28, p: PULL, e: E.inOut },
  { f: 35, p: DIP, e: E.out },
  { f: 39, p: RACK, e: E.in },
  { f: 42, p: OVER, e: E.in },
  { f: 47, p: { sy: 1.05, sx: 0.97, chestS: 1.1 }, e: E.out },
  { f: 53, p: { sy: 0.97, sx: 1.02, chestS: 1.04 }, e: E.inOut },
  { f: 59, p: { sy: 1, sx: 1, chestS: 1.06, lookX: 0.2, turn: 0.15 }, e: E.inOut },
  { f: 66, p: { mouthOpen: 0.15, lookX: 0.5, turn: 0.28, lid: 0.15 }, e: E.inOut },
  { f: 70, p: { wink: 1, mouthSkew: 0.5 }, e: E.out },
  { f: 82, p: { wink: 1 } },
  { f: 86, p: { wink: 0, mouthSkew: 0, mouthOpen: 0.5, lookX: 0, turn: 0.05 }, e: E.inOut },
  { f: 150, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  // strain jitter
  const strain = seg(f, 6, 12) * (1 - seg(f, 36, 39));
  const jx = Math.sin(f * 2.9) * 3.5 * strain;
  const jr = Math.sin(f * 3.7) * 0.9 * strain;
  // breathing after lockout
  const br = f > 59 ? Math.sin((f - 59) / 7) * 0.012 : 0;
  return plant({ ...p, x: jx, rot: jr, chestS: p.chestS + br });
};

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

const barBend = (f: number) => {
  if (f < 43) return -kf(f, [[0, 0], [28, 24], [35, 30]]) + Math.sin(f * 3.1) * 2 * seg(f, 8, 12);
  const t = f - 43;
  return 34 * Math.cos(t * 0.5) * Math.exp(-t * 0.075) - 14 * (1 - Math.exp(-t * 0.1));
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

/* ------------------------------- scene ------------------------------- */
export const GymScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const grip = (a: Rig2) => ap(a.wrist, 0, 42) as [number, number];
  type Rig2 = typeof r.aL;
  const gL = grip(r.aL);
  const gR = grip(r.aR);
  const bend = barBend(f);
  const behind = f >= 40;
  const bar = <Barbell a={gL} b={gR} bend={bend} />;

  // camera
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1500], [22, 1060, E.out], [34, 1080], [42, 1040, E.out], [150, 1000]]),
    z: kf(f, [[0, 1.75], [22, 1.0, E.out], [34, 1.08, E.inOut], [42, 0.98, E.out], [72, 1.0], [150, 1.05]]),
    r: kf(f, [[0, -2], [22, 0, E.out], [42, 1.2], [50, 0]]),
  };
  const s1 = shake(f, 43, 22, 34, 3);
  const s0 = shake(f, 8, 30, 3 * (1 - seg(f, 30, 38)), 1);
  const sh = { x: s1.x + s0.x, y: s1.y + s0.y, r: s1.r };
  const impact = f === 42 || f === 43;

  // world-space helpers (hero space -> stage)
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const handTrail = (side: 'L' | 'R') =>
    trail((ff) => {
      const q = poseF(ff);
      const rr = rig(q);
      const pt = rr.W(side === 'L' ? rr.aL.wrist : rr.aR.wrist, 0, 40);
      return toStage(pt);
    }, f, 6);
  const mouth = toStage(r.mouth());
  const gripW = (pt: [number, number]) => toStage(ap(r.root as M, pt[0], pt[1]));
  const barMid = gripW([(gL[0] + gR[0]) / 2, (gL[1] + gR[1]) / 2]);

  return (
    <Stage
      impact={impact}
      overlay={<EndCard f={f} start={74} lines={['BEAST MODE']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}
    >
      <GlowDefs />
      <GymBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Platform />
        <Cracks f={f} start={43} />
        <Ring x={540} y={1700} t={seg(f, 43, 62)} r={520} sy={0.22} color="#FFFFFF" w={30} />
        {f >= 43 && f < 60 ? <FocusLines f={f} cx={barMid[0]} cy={barMid[1]} r0={420} opacity={0.75 * (1 - seg(f, 50, 60))} color="#FFFFFF" /> : null}
        <Glow x={barMid[0]} y={barMid[1]} r={kf(f, [[42, 0], [46, 520, E.out], [70, 300]])} id="glowY" o={seg(f, 42, 44) * (1 - seg(f, 70, 100) * 0.6)} />
        <Burst x={barMid[0]} y={barMid[1] + 60} r={340} t={seg(f, 43, 60)} seed={9} />
        {f >= 38 && f <= 44 ? (
          <>
            <Swoosh pts={handTrail('L')} width={110} />
            <Swoosh pts={handTrail('R')} width={110} />
          </>
        ) : null}
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          behind={behind ? bar : undefined}
          between={!behind ? bar : undefined}
        />
        <Dust f={f} start={43} x={540} y={1690} n={10} spread={460} size={64} seed={4} />
        <Sparks f={f} start={43} seed={21} n={26} x={barMid[0]} y={barMid[1]} speed={[16, 40]} g={0.9} size={[14, 28]} />
        <Glint x={mouth[0] + 40} y={mouth[1] - 10} s={1.3} t={seg(f, 58, 72)} />
        <Glint x={barMid[0] - 330} y={barMid[1] - 110} s={0.9} t={seg(f, 64, 80)} />
      </g>
      <Columns cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Sfx f={f} start={10} text="NNNGH!" x={250} y={900} size={110} rot={-10} fill="#FFFFFF" dur={28} />
        <Sfx f={f} start={43} text="CLANG!" x={760} y={560} size={190} rot={8} fill="#FFD064" dur={30} />
        <Sfx f={f} start={60} text="ting!" x={mouth[0] + 160} y={mouth[1] - 110} size={80} rot={-6} fill="#FFFFFF" dur={20} />
      </g>
      <ConfettiRain f={f} start={80} n={60} seed={3} />
    </Stage>
  );
};
