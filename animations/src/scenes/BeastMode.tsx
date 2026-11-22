import React from 'react';
import { useCurrentFrame } from 'remotion';
import { BASE, DIM, HandG, Hero, Pose, plant, rig } from '../hero/Hero';
import { Cam, camP, Stage } from '../fx/Stage';
import { E, Key, kf, poseAt, seg } from '../lib/anim';
import { mul, svgM } from '../lib/m2';
import { rng } from '../lib/shape';
import { inv, reach2 } from './ik';
import { GymTheatre, GymVictory } from './GymTheatre';

type Point = [number, number];
const FLOOR = 1700;
const SCALE = 1.025;
const GRIP = 45;
const AXLE = 449;
const STEEL = '#242333';
const LOCK = 76;

// The feet stay on the same two marks. As the pelvis lowers, the knees fold out
// and the shins fold back in, keeping the sandal soles flat on the platform.
function stance(depth: number): Partial<Pose> {
  const offset = 80;
  const length = Math.hypot(depth, offset);
  const degrees = 180 / Math.PI;
  const hip = (Math.atan2(offset, depth) + Math.acos((DIM.TH ** 2 + length ** 2 - DIM.SH ** 2) / (2 * DIM.TH * length))) * degrees;
  const knee = Math.acos((DIM.TH ** 2 + DIM.SH ** 2 - length ** 2) / (2 * DIM.TH * DIM.SH)) * degrees - 180;
  return { hipL: hip, hipR: hip, knL: knee, knR: knee, ftL: -hip - knee, ftR: -hip - knee };
}

const ACTING: Key<Pose>[] = [
  { f: 0, p: { head: 5, turn: -0.24, lookX: -0.42, lookY: 0.65, mouthMode: 'o', mouthOpen: 0.13, smile: 0.2, brow: 0.15, browTilt: -0.5, lid: 0.14, torsoSy: 0.92, handL: 'grip', handR: 'grip' } },
  { f: 12, p: { head: 2, turn: -0.09, lookX: -0.08, lookY: 0.18, chestS: 1.04, mouthOpen: 0.23, brow: -0.2 } },
  { f: 22, p: { head: -2, turn: 0, lookX: 0, lookY: -0.35, mouthMode: 'grit', mouthOpen: 0.16, lid: 0.25, browTilt: -0.85, chestS: 1.01, flexL: 0.42, flexR: 0.42 } },
  { f: 39, p: { torsoSy: 1, brow: -0.4, lid: 0.32, red: 0.3, flexL: 0.75, flexR: 0.75 } },
  { f: 46, p: { shrugL: 29, shrugR: 29, head: -5, lid: 0.1, mouthOpen: 0.36, torsoSy: 1.04 }, e: E.in },
  { f: 52, p: { shrugL: 6, shrugR: 6, head: 3, torsoSy: 0.95, chestS: 1.06, lid: 0.65, brow: -0.6, mouthOpen: 0.1 }, e: E.out },
  { f: 61, p: { head: -2, lookY: -0.8, lid: 0.12, brow: 0.36, mouthMode: 'o', mouthOpen: 0.24, chestS: 1.03, red: 0.14, torsoSy: 1, flexL: 0.9, flexR: 0.9 } },
  { f: 68, p: { torsoSy: 0.94, mouthMode: 'grit', mouthOpen: 0.2, lookY: -0.3, lid: 0.28, browTilt: -0.95, red: 0.4 }, e: E.inOut },
  { f: LOCK, p: { torsoSy: 1.05, uaL: 1.39, uaR: 1.39, faL: 1.34, faR: 1.34, shrugL: 45, shrugR: 45, head: 0, headS: 0.96, mouthOpen: 0.4, lid: 0.05, brow: 0.2 }, e: E.inOut },
  { f: 86, p: { torsoSy: 1, chestS: 1.04, mouthMode: 'grin', mouthOpen: 0.78, smile: 1, lookY: -0.6, brow: 0.8, browTilt: -0.1, red: 0.12 }, e: E.out },
  { f: 97, p: { lookY: 0, lookX: 0.18, head: -3, turn: 0.16, red: 0, lid: 0, mouthSkew: 0.18 }, e: E.sine },
  { f: 107, p: { lookX: 0.08, head: -4, wink: 0.97, mouthSkew: 0.57, mouthOpen: 0.17, browTilt: 0.38 }, e: E.sine },
  { f: 112, p: { wink: 0.94 } },
  { f: 120, p: { wink: 0, mouthOpen: 0.64, head: -1, mouthSkew: 0.24, browTilt: 0.06, lookX: 0, turn: 0.05 }, e: E.out },
];

function motion(f: number) {
  const acting = poseAt(f, BASE, ACTING);
  const depth = kf(f, [[0, 146], [14, 144], [21, 145], [41, 273, E.sine], [46, 285, E.in], [52, 207, E.out], [61, 280, E.sine], [68, 214], [73, 281, E.in], [LOCK, 225, E.out], [82, 248, E.sine], [89, 280, E.out]]);
  const breath = seg(f, 89, 98) * Math.sin((f - 89) / 9) * 0.006;
  const base = plant({ ...acting, ...stance(depth), chestS: acting.chestS + breath });
  const y = kf(f, [[0, -140], [11, -140], [22, -148], [38, -312, E.sine], [45, -465, E.in], [49, -565, E.out], [53, -535], [61, -610, E.sine], [68, -550], [73, -802, E.in], [LOCK, -1015, E.out], [80, -1000], [89, -1064, E.sine], [101, -1069], [134, -1067]]);
  const halfGrip = kf(f, [[0, 213], [44, 213], [50, 214], [68, 214], [LOCK, 221]]);
  const p = reach2(base, [-halfGrip, y], [halfGrip, y], -1, -1, GRIP);
  const r = rig(p);
  const left = r.W(r.aL.wrist, 0, GRIP);
  const right = r.W(r.aR.wrist, 0, GRIP);
  const fret = Math.max(0, f - LOCK);
  const sag = kf(f, [[0, 0], [12, 0], [22, 8], [39, 12], [46, 22], [52, -12], [58, 9], [67, 8], [72, 23], [LOCK, 13]]) + Math.sin(fret * 0.63) * Math.exp(-fret / 8) * 18;
  return { p, r, left, right, sag };
}

const HardwareDefs: React.FC = () => (
  <defs>
    <linearGradient id="beast-edge" x2="0%" y2="100%">
      <stop stopColor="#d6bfc9" /><stop offset=".07" stopColor="#77738f" />
      <stop offset=".24" stopColor="#48455e" /><stop offset=".54" stopColor="#302c46" />
      <stop offset=".84" stopColor="#1c1c2c" /><stop offset="1" stopColor="#555067" />
    </linearGradient>
    <linearGradient id="beast-bronze" x1="0%" y1="0%" x2="40%" y2="100%">
      <stop stopColor="#fff0ba" /><stop offset=".22" stopColor="#e8b873" />
      <stop offset=".55" stopColor="#b77248" /><stop offset=".82" stopColor="#814637" />
      <stop offset="1" stopColor="#d19966" />
    </linearGradient>
    <linearGradient id="beast-platform" x2="0%" y2="100%">
      <stop stopColor="#945847" /><stop offset=".53" stopColor="#bb805b" /><stop offset="1" stopColor="#ce9670" />
    </linearGradient>
    <radialGradient id="beast-aureole">
      <stop stopColor="#ffe3a0" stopOpacity=".53" /><stop offset=".6" stopColor="#ffd18d" stopOpacity=".19" />
      <stop offset="1" stopColor="#ffc48a" stopOpacity="0" />
    </radialGradient>
    <pattern id="beast-knurl" width="10" height="12" patternUnits="userSpaceOnUse">
      <path d="M-5 12 5 0 M5 12 15 0 M-5 0 5 12 M5 0 15 12" fill="none" stroke="#443949" strokeWidth="1.5" opacity=".78" />
    </pattern>
    <pattern id="beast-tread" width="22" height="9" patternUnits="userSpaceOnUse">
      <path d="m2 3 5 2 M13 7l5 -2" stroke="#8a7882" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </pattern>
  </defs>
);

const Deck: React.FC = () => (
  <g strokeLinejoin="round">
    <path d="m54 1760 970 0 44 30 -22 22 H35 l-26 -18z" fill="#221b2e" opacity=".34" />
    <path d="M86 1646 H994 L1056 1764 V1794 H24 V1764Z" fill="#4c3945" stroke={STEEL} strokeWidth="6" />
    <path d="M86 1646 H994 L1056 1764 H24Z" fill="#373444" />
    <path d="M86 1646 H994 L1056 1764 H24Z" fill="url(#beast-tread)" />
    <path d="M285 1646 H795 L832 1764 H248Z" fill="url(#beast-platform)" stroke="#2e2635" strokeWidth="5" />
    {[0, 1, 2, 3, 4].map(i => {
      const x = 320 + i * 103;
      return <g key={i} opacity=".52"><path d={`M${x} 1647 l${(i - 2) * 11} 115`} stroke="#714835" strokeWidth="2" />
        <path d={`M${x + 21} 1658 q22 21 12 52 t8 39 m22 -88 q-12 19 -3 46`} fill="none" stroke="#e0a378" strokeWidth="2" /></g>;
    })}
    <path d="M87 1648 H993 M27 1764 H1053" fill="none" stroke="#d6ba93" strokeWidth="3" />
    <path d="M29 1774 H1051" stroke="#251f31" strokeWidth="4" />
    {[68, 145, 932, 1009].map(x => <g key={x}><circle cx={x} cy="1782" r="6" fill="#c89464" stroke="#2a2436" strokeWidth="2" /><path d={`m${x - 2.5} 1784 5 -4`} stroke="#584354" strokeWidth="2" /></g>)}
    <path d="m482 1773 10 9h25l7 6h32l7-6h25l10-9" fill="none" stroke="#b78767" strokeWidth="2" />
    <path d="m539 1770 -8 10h7l-2 7 13-13h-8l3-4z" fill="#e5c698" />
  </g>
);

// The front face is foreshortened, with cast-in handles and a bright machined
// lip. The face turns inside a stationary ring as the sleeve takes the load.
const Disc: React.FC<{ x: number; r: number; width: number; face: string; rim: string; spin: number }> = ({ x, r, width, face, rim, spin }) => {
  const rx = r * 0.29;
  return <g transform={`translate(${x} 0)`}>
    <path d={`M0 ${-r} H${width} A${rx} ${r} 0 0 1 ${width} ${r} H0 Z`} fill="url(#beast-edge)" stroke={STEEL} strokeWidth="5" />
    <path d={`M4 ${-r + 3} h${width - 3} M${rx * .91} ${-r * .45} h${width - 2}`} stroke={rim} strokeWidth="3" opacity=".82" />
    <ellipse rx={rx} ry={r} fill={face} stroke={STEEL} strokeWidth="5" />
    <ellipse rx={rx - 3} ry={r - 5} fill="none" stroke={rim} strokeWidth="3" />
    <g transform="scale(.29 1)">
      <circle r={r * .88} fill="none" stroke={rim} strokeWidth="4" />
      <g transform={`rotate(${spin})`}>
        {[0, 120, 240].map(a => <g key={a} transform={`rotate(${a})`}>
          <path d={`M${-r * .29} ${-r * .6} Q0 ${-r * .78} ${r * .29} ${-r * .6}`} fill="none" stroke={STEEL} strokeWidth={r * .12} strokeLinecap="round" />
          <path d={`M${-r * .27} ${-r * .55} Q0 ${-r * .72} ${r * .27} ${-r * .55}`} fill="none" stroke={rim} strokeWidth="3" strokeLinecap="round" />
        </g>)}
      </g>
      <circle r={r * .36} fill={STEEL} stroke={rim} strokeWidth="4" />
      <circle r={r * .23} fill="url(#beast-bronze)" />
    </g>
  </g>;
};

const Bar: React.FC<{ left: Point; right: Point; sag: number; f: number }> = ({ left, right, sag, f }) => {
  const half = (right[0] - left[0]) / 2;
  const mid = (right[0] + left[0]) / 2;
  const y = (right[1] + left[1]) / 2;
  const angle = Math.atan2(right[1] - left[1], right[0] - left[0]) * 180 / Math.PI;
  const sleeveX = 344;
  const shaft = `M${-AXLE} ${sag} H${-sleeveX} Q${-half - 39} 0 ${-half} 0 H${half} Q${half + 39} 0 ${sleeveX} ${sag} H${AXLE}`;
  const spin = kf(f, [[0, -13], [22, -14], [49, 17], [58, 12], [LOCK, 41], [87, 32], [134, 35]]);
  return <g transform={`translate(${mid} ${y}) rotate(${angle})`} strokeLinejoin="round">
    <path d={shaft} fill="none" stroke={STEEL} strokeWidth="25" strokeLinecap="round" />
    <path d={shaft} fill="none" stroke="#a4a8b5" strokeWidth="16" strokeLinecap="round" />
    <path d={shaft} transform="translate(0 -4)" fill="none" stroke="#f4ece4" strokeWidth="3.5" strokeLinecap="round" />
    <rect x={-31} y={-7} width="62" height="14" fill="url(#beast-knurl)" />
    {([-1, 1] as const).map(side => <g key={side} transform={`scale(${side} 1)`}>
      <rect x={half - 80} y={-7} width={80} height={14} fill="url(#beast-knurl)" />
      <rect x={half - 88} y={-8} width="4" height="16" fill="#485161" />
      <g transform={`translate(0 ${sag})`}>
        <rect x="425" y="-24" width="18" height="48" rx="4" fill="url(#beast-bronze)" stroke={STEEL} strokeWidth="4" />
        <Disc x={403} r={82} width={18} face="#aa744f" rim="#efd2a3" spin={spin + 30} />
        <Disc x={371} r={120} width={26} face="#665573" rim="#af9ba9" spin={spin + 12} />
        <Disc x={335} r={138} width={25} face="#4a414f" rim="#caac85" spin={spin} />
        <ellipse cx="333" rx="11" ry="28" fill="#a9a5ac" stroke={STEEL} strokeWidth="4" />
        <ellipse cx="331" rx="6" ry="14" fill="#655562" />
        <path d="M329 -19 Q334 -23 337 -16" fill="none" stroke="#fff0cd" strokeWidth="3" />
      </g>
    </g>)}
  </g>;
};

const random = rng(173);
const grit = Array.from({ length: 24 }, () => ({
  dx: 26 + random() * 120, dy: 19 + random() * 74,
  sx: (random() - 0.5) * 46, delay: Math.floor(random() * 6), r: 1.7 + random() * 2.8,
}));
const Chalk: React.FC<{ f: number; at: number; x: number; y: number; dir: number }> = ({ f, at, x, y, dir }) => (
  <g fill="#ffe8c4">
    {grit.map((s, i) => {
      const t = seg(f, at + s.delay, at + 24 + s.delay);
      if (!t || t === 1) return null;
      return <circle key={i} cx={x + s.sx + dir * s.dx * (1 - (1 - t) ** 2)} cy={y - s.dy * Math.sin(t * 2.25) + t * t * 28} r={s.r * (1 - t * .4)} opacity={.83 * (1 - t ** 1.6)} />;
    })}
  </g>
);

const FlashOfMetal: React.FC<{ x: number; y: number; f: number; at: number }> = ({ x, y, f, at }) => {
  const t = seg(f, at, at + 13);
  const s = Math.sin(t * Math.PI) ** 1.6;
  if (s < 0.01) return null;
  return <g transform={`translate(${x} ${y}) rotate(13) scale(${s})`} fill="#fff3d2">
    <path d="M0 -29 Q2 -4 20 0 Q2 3 0 31 Q-2 3 -21 0 Q-2 -3 0 -29Z" />
    <circle r="3.5" fill="white" />
  </g>;
};

export const GymScene: React.FC = () => {
  const f = useCurrentFrame();
  const { p, r, left, right, sag } = motion(f);
  const cam: Cam = {
    cx: kf(f, [[0, 422], [9, 430, E.sine], [29, 540, E.sine], [134, 540]]),
    cy: kf(f, [[0, 1365], [10, 1325, E.sine], [31, 1170, E.sine], [48, 1120], [64, 1110], [LOCK + 3, 1002, E.sine], [123, 1008]]),
    z: kf(f, [[0, 1.62], [9, 1.58], [30, 1.09, E.sine], [49, 1.05], [65, 1.10], [LOCK + 4, 1.005, E.out], [134, 1.045]]),
    r: kf(f, [[0, -3.6], [12, -2.8], [30, 0, E.sine]]),
  };
  const load = (at: number, amount: number) => {
    const time = f - at;
    return time < 0 ? 0 : amount * Math.sin(time * 1.05) * Math.exp(-time / 2.8);
  };
  const sh = { x: 0, y: load(51, 10) + load(LOCK, 14), r: 0 };
  const endX = (right[0] + left[0]) / 2;
  const endY = (right[1] + left[1]) / 2;
  const steel = <Bar f={f} left={left} right={right} sag={sag} />;
  const gleam = seg(f, LOCK - 1, LOCK + 7) * (1 - seg(f, 90, 112));
  return <Stage overlay={<GymVictory f={f} start={88} title="BEAST MODE" theme="beast" />}>
    <GymTheatre f={f} theme="beast" cam={cam} sh={sh} />
    <HardwareDefs />
    <g transform={camP(cam, 1, sh)} className="gym-actor">
      <Deck />
      <g transform={`translate(540 ${FLOOR}) scale(${SCALE})`}>
        {([-1, 1] as const).map(side => <ellipse key={side} cx={side * 369} cy="4" rx={49} ry={9} fill="#241b29" opacity={.45 * (1 - seg(f, 22, 43))} />)}
        {gleam > 0 && <g opacity={gleam}><ellipse cy={endY + 85} rx="520" ry="443" fill="url(#beast-aureole)" /></g>}
        <Chalk f={f} at={24} x={-368} y={0} dir={-1} />
        <Chalk f={f} at={24} x={368} y={0} dir={1} />
      </g>
      <Hero p={p} x={540} y={FLOOR} scale={SCALE}
        front={<>
          <g transform={svgM(inv(r.root))}>{steel}</g>
          <HandG m={r.aL.wrist} lm={mul(r.root, r.aL.wrist)} type={p.handL} />
          <HandG m={r.aR.wrist} lm={mul(r.root, r.aR.wrist)} type={p.handR} />
        </>}
      />
      <g transform={`translate(540 ${FLOOR}) scale(${SCALE})`}>
        <FlashOfMetal x={endX - 337} y={endY + sag - 120} f={f} at={4} />
        <FlashOfMetal x={endX + 339} y={endY + sag - 123} f={f} at={81} />
        <FlashOfMetal x={-210} y={endY} f={f} at={116} />
      </g>
    </g>
  </Stage>;
};
