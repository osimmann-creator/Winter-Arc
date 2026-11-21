// Inside joke: "BLUE HAIR" - Connor leads the week: Flexander gets a victory amphora-shower of blue dye and loves the new look.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, Glint, ConfettiRain, Sparks, Cloud, Burst, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { reach } from './ik';
import { TITLE_FONT } from '../fonts';
import { rng } from '../lib/shape';

export const BLUE_FRAMES = 160;
const GX = 540;
const GY = 1500;
const SC = 0.86;
const toStage = stageOf(GX, GY, SC);
const POUR = 28;
const SHAKE = 50;
const MIRROR = 66;
const CARD = 112;
const BLUE = '#2F66E6';
const BLUE_D = '#1F47C2';
const BLUE_L = '#9FD0FF';

/* ------------------------------- props ------------------------------- */
const Amphora: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    {/* handles */}
    <path d="M-120 -170 C-210 -170 -210 -60 -130 -40" fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
    <path d="M-120 -170 C-210 -170 -210 -60 -130 -40" fill="none" stroke="#D9733F" strokeWidth={16} strokeLinecap="round" />
    <path d="M120 -170 C210 -170 210 -60 130 -40" fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
    <path d="M120 -170 C210 -170 210 -60 130 -40" fill="none" stroke="#D9733F" strokeWidth={16} strokeLinecap="round" />
    {/* body */}
    <path d="M-70 -260 L70 -260 L80 -200 C190 -150 210 40 120 160 C80 210 40 230 0 230 C-40 230 -80 210 -120 160 C-210 40 -190 -150 -80 -200 Z" fill="#D9733F" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
    <path d="M-150 -60 C-160 30 -130 120 -80 170" fill="none" stroke="#F3A06D" strokeWidth={18} strokeLinecap="round" opacity={0.8} />
    {/* black-figure band */}
    <path d="M-182 -40 Q0 -10 182 -40 L176 40 Q0 70 -176 40 Z" fill="#2B1A1E" />
    <path d={Array.from({ length: 9 }).map((_, i) => `M${-150 + i * 38} 20 v-24 h18 v14 h-8 v-6`).join(' ')} fill="none" stroke="#D9733F" strokeWidth={5} />
    {/* rim */}
    <rect x={-96} y={-292} width={192} height={40} rx={14} fill="#D9733F" stroke={INK} strokeWidth={10} />
    {/* blue dye inside the mouth */}
    <ellipse cx={0} cy={-284} rx={70} ry={10} fill={BLUE} />
  </g>
);

const HandMirror: React.FC = () => (
  <g transform="translate(0 30)">
    <rect x={-12} y={-6} width={24} height={110} rx={10} fill={C.gold} stroke={INK} strokeWidth={6} />
    <g transform="translate(0 170)">
      <ellipse rx={74} ry={92} fill={C.gold} stroke={INK} strokeWidth={8} />
      <ellipse rx={58} ry={76} fill="#CFE8FF" stroke={C.goldSh} strokeWidth={5} />
      <path d="M-30 -40 L10 -60 M-36 -10 L28 -44" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.85} />
    </g>
  </g>
);

/** Blue goo on the head (head-local), k = 0..1 amount, drip = frames since pour. */
const Goo: React.FC<{ k: number; drip: number }> = ({ k, drip }) => {
  if (k <= 0.01) return null;
  const d = Math.max(0, drip);
  const drips = [
    [-118, 1.0],
    [-70, 0.6],
    [-20, 0.8],
    [40, 0.5],
    [96, 0.9],
    [124, 0.7],
  ];
  return (
    <g opacity={k}>
      <path d="M-150 -230 C-170 -330 -60 -380 10 -372 C100 -366 170 -320 150 -220 C120 -200 90 -232 60 -214 C30 -196 0 -230 -30 -212 C-70 -190 -100 -232 -150 -230 Z" fill={BLUE} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-100 -320 C-60 -350 -10 -356 30 -350" fill="none" stroke={BLUE_L} strokeWidth={12} strokeLinecap="round" />
      {drips.map(([x, sp], i) => {
        const len = Math.min(220, d * 9 * sp);
        return (
          <g key={i}>
            <path d={`M${x - 14} -224 L${x - 12} ${-224 + len} A13 13 0 0 0 ${x + 12} ${-224 + len} L${x + 14} -224 Z`} fill={BLUE} stroke={INK} strokeWidth={5} />
            <circle cx={x - 3} cy={-224 + len - 4} r={4} fill={BLUE_L} />
          </g>
        );
      })}
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, wrL: 10, wrR: 10, flexL: 1.6, flexR: 1.6, shrugL: 12, shrugR: 12, chestS: 1.08,
  hipL: 12, hipR: 12, knL: -6, knR: -6, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, brow: 0.8, handL: 'fist', handR: 'fist',
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...DOUBLE_BI } },
  { f: 12, p: { chestS: 1.12 } },
  // shadow overhead - look up
  { f: 22, p: { shL: 40, shR: 40, elL: 30, elR: 30, flexL: 0.6, flexR: 0.6, chestS: 1.02, lookY: -1, head: -4, mouthMode: 'o', mouthOpen: 0.5, pupil: 0.5, brow: 1.4, browTilt: 1 }, e: E.inOut },
  // drenched
  { f: POUR + 4, p: { sy: 0.88, sx: 1.07, eyes: 1, mouthMode: 'grit', mouthOpen: 0, lookY: 0, head: 0, shL: 74, shR: 74, elL: 24, elR: 24, handL: 'open', handR: 'open', pupil: 1, brow: 0.4, browTilt: -0.4 }, e: E.out },
  { f: SHAKE - 2, p: { sy: 0.92, sx: 1.04 } },
  { f: SHAKE + 12, p: { sy: 1, sx: 1, eyes: 0, mouthMode: 'o', mouthOpen: 0.4, shL: 30, shR: 30, elL: 20, elR: 20 }, e: E.inOut },
  // mirror check -> love it
  { f: MIRROR + 6, p: { turn: -0.35, lookX: -1, head: -6, mouthMode: 'grin', mouthOpen: 0.3, smile: 1, brow: 0.9, handL: 'fist' }, e: E.inOut },
  { f: MIRROR + 12, p: { eyeMode: 'heart', blush: 1, mouthOpen: 0.9 }, e: E.back },
  { f: 92, p: { eyeMode: 'heart' } },
  // #1 point + wink
  { f: 100, p: { eyeMode: 'normal', turn: 0.15, lookX: 0.3, head: 6, wink: 1, mouthSkew: 0.45, blush: 0.4, handR: 'point', shR: 166, elR: 6, wrR: 0, flexR: 0.6, chestS: 1.08 }, e: E.back },
  { f: BLUE_FRAMES, p: {} },
];

const solve = (f: number): Pose => {
  const p = plant(poseAt(f, BASE, KEYS));
  // head shake while shaking off the dye
  const sk = seg(f, SHAKE, SHAKE + 2) * (1 - seg(f, SHAKE + 12, SHAKE + 15));
  const shaken = { ...p, head: p.head + Math.sin(f * 1.6) * 16 * sk, turn: p.turn + Math.sin(f * 1.6) * 0.35 * sk, rot: Math.sin(f * 1.6 + 1) * 2 * sk };
  // mirror in the left hand from MIRROR on
  const m = seg(f, MIRROR - 4, MIRROR + 4);
  if (m <= 0) return { ...shaken, hairBlue: kf(f, [[POUR + 6, 0], [SHAKE + 10, 1, E.inOut]]) };
  const r = rig(shaken);
  const face = r.W(r.head, 0, -150);
  const h = reach(shaken, 'L', [face[0] - 230, face[1] + 120], 1, 30);
  const tot = (h.shL ?? 0) + (h.elL ?? 0) + shaken.torso + shaken.rot;
  return {
    ...shaken,
    shL: lerp(shaken.shL, h.shL ?? 0, m),
    elL: lerp(shaken.elL, h.elL ?? 0, m),
    wrL: lerp(shaken.wrL, 160 - tot, m),
    hairBlue: 1,
  };
};

export const JokeBlueHairScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const headC = toStage(r.W(r.head, 0, -170));
  const gooK = seg(f, POUR + 1, POUR + 4) * (1 - seg(f, SHAKE + 2, SHAKE + 12));

  // amphora swoops in from top-right and tips
  const ax = kf(f, [[0, 1250], [14, 1250], [24, 820, E.out], [POUR + 16, 800], [POUR + 26, 1300, E.in]]);
  const ay = kf(f, [[0, -300], [14, -300], [24, 330, E.out], [POUR + 16, 340], [POUR + 26, -260, E.in]]);
  const arot = kf(f, [[0, 20], [24, 30, E.out], [POUR, 118, E.inOut], [POUR + 16, 125], [POUR + 26, 60, E.in]]);
  const mouthAng = ((arot - 90) * Math.PI) / 180;
  const mouth: [number, number] = [ax + Math.cos(mouthAng) * 285, ay + Math.sin(mouthAng) * 285];
  const pouring = f >= POUR - 1 && f < POUR + 14;
  const sw = Math.sin(f * 1.3) * 10;
  const stream = pouring
    ? `M${mouth[0] - 30} ${mouth[1]} C${mouth[0] - 80} ${mouth[1] + 120} ${head[0] + 60 + sw} ${head[1] - 220} ${head[0] + 40} ${head[1] + 20} L${head[0] - 40} ${head[1] + 20} C${head[0] - 10 - sw} ${head[1] - 200} ${mouth[0] - 120} ${mouth[1] + 90} ${mouth[0] - 60} ${mouth[1] - 20} Z`
    : null;

  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1080], [14, 1060], [24, 900, E.inOut], [POUR + 4, 940, E.out], [SHAKE, 960], [MIRROR, 860, E.inOut], [MIRROR + 20, 860], [CARD - 6, 850, E.inOut]]),
    z: kf(f, [[0, 1.0], [14, 1.0], [24, 0.94, E.inOut], [POUR + 4, 1.08, E.out], [SHAKE, 1.06], [MIRROR, 1.32, E.inOut], [MIRROR + 20, 1.36], [CARD - 6, 0.88, E.inOut]]),
    r: 0,
  };
  const s1 = shake(f, POUR, 18, 22, 3);
  const s2 = shake(f, SHAKE, 14, 8, 6);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };
  const rr = rng(3);

  return (
    <Stage overlay={<EndCard f={f} start={CARD} lines={['BLUE HAIR']} pts="#1" unit="WEEK" sub="CONNOR LEADS THE WEEK" color={BLUE} dark={BLUE_D} light={BLUE_L} y={90} />}>
      <GlowDefs />
      <defs>
        <linearGradient id="bhSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FB0FF" />
          <stop offset="0.6" stopColor="#B9E2FB" />
          <stop offset="1" stopColor="#F4F0FF" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.2, sh)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="url(#bhSky)" />
        <g transform={`translate(540 1300) rotate(${f * 0.25})`} opacity={0.18}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d="M0 0 L1700 -150 L1700 150 Z" fill="#FFFFFF" transform={`rotate(${i * (360 / 14)})`} />
          ))}
        </g>
        {[0, 1, 2, 3].map((i) => (
          <Cloud key={i} x={((i * 400 + f * 0.7) % 1600) - 260} y={260 + (i % 2) * 260 + rr() * 60} w={300 + i * 40} h={130} seed={i + 2} />
        ))}
      </g>
      <g transform={camP(cam, 1, sh)}>
        {/* podium */}
        <g>
          <rect x={60} y={1560} width={300} height={360} fill="#DCD8EA" stroke={INK} strokeWidth={10} />
          <rect x={720} y={1610} width={300} height={310} fill="#E8B48A" stroke={INK} strokeWidth={10} />
          <rect x={330} y={1490} width={420} height={430} fill={C.gold} stroke={INK} strokeWidth={10} />
          <rect x={350} y={1506} width={380} height={24} rx={10} fill="#FFFFFF" opacity={0.4} />
          <text x={540} y={1700} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={180} fill="#FFFFFF" stroke={INK} strokeWidth={18} paintOrder="stroke">1</text>
          <text x={210} y={1740} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={130} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke">2</text>
          <text x={870} y={1770} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={120} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke">3</text>
          {/* blue puddle */}
          <ellipse cx={540} cy={1500} rx={kf(f, [[POUR + 2, 0], [POUR + 14, 210, E.out]])} ry={kf(f, [[POUR + 2, 0], [POUR + 14, 26, E.out]])} fill={BLUE} stroke={INK} strokeWidth={5} opacity={0.9} />
        </g>
        {/* amphora shadow on hero */}
        <ellipse cx={540} cy={1494} rx={170} ry={22} fill="#000" opacity={0.14 + 0.1 * seg(f, 14, 24) * (1 - seg(f, POUR + 16, POUR + 22))} />
        <Hero p={p} x={GX} y={GY} scale={SC} headExtra={<Goo k={gooK} drip={f - POUR} />} itemL={f >= MIRROR - 4 ? <HandMirror /> : undefined} />
        {stream ? (
          <g>
            <path d={stream} fill={BLUE} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
            <path d={`M${mouth[0] - 70} ${mouth[1] + 40} C${mouth[0] - 90} ${mouth[1] + 140} ${head[0] + 10} ${head[1] - 180} ${head[0] + 6} ${head[1] - 40}`} fill="none" stroke={BLUE_L} strokeWidth={10} strokeLinecap="round" opacity={0.8} />
          </g>
        ) : null}
        <Amphora x={ax} y={ay} rot={arot} />
        <Burst x={head[0]} y={head[1] + 40} r={300} t={seg(f, POUR, POUR + 14)} seed={4} fill={BLUE} fill2={BLUE_L} />
        <Sparks f={f} start={POUR} seed={41} n={30} x={head[0]} y={head[1] + 40} speed={[14, 34]} g={1.3} size={[14, 28]} shape="drop" colors={[BLUE, BLUE_L, BLUE_D]} />
        <Sparks f={f} start={SHAKE + 2} seed={42} n={26} x={headC[0]} y={headC[1]} speed={[18, 38]} g={1.1} size={[12, 24]} shape="drop" colors={[BLUE, BLUE_L]} />
        <Sparks f={f} start={SHAKE + 7} seed={43} n={20} x={headC[0]} y={headC[1]} speed={[18, 38]} g={1.1} size={[12, 22]} shape="drop" colors={[BLUE, BLUE_L]} />
        <Glow x={head[0]} y={head[1] + 60} r={kf(f, [[SHAKE + 12, 0], [SHAKE + 16, 420, E.out], [MIRROR + 10, 200]])} id="glowW" o={0.9} />
        {[0, 1, 2, 3].map((i) => (
          <Twinkle key={i} x={head[0] + [-150, 140, -90, 170][i]} y={head[1] + [40, 10, -60, 120][i]} s={1.1} t={seg(f, SHAKE + 13 + i * 3, SHAKE + 27 + i * 3)} color={i % 2 ? '#FFFFFF' : BLUE_L} />
        ))}
        <Glint x={head[0] + 130} y={head[1] + 80} s={1.1} t={seg(f, 104, 118)} />
        <Sfx f={f} start={16} text="uh oh." x={250} y={1000} size={100} rot={-8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={POUR} text="SPLOOSH!" x={330} y={740} size={160} rot={-10} fill={BLUE_L} dur={24} />
        <Sfx f={f} start={SHAKE + 1} text="SHAKE SHAKE" x={540} y={600} size={110} rot={4} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={MIRROR + 12} text="OBSESSED." x={800} y={780} size={100} rot={8} fill="#FBD3E0" dur={22} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={60} seed={14} colors={[BLUE, BLUE_L, '#FFFFFF', '#FFD064', '#7254DC']} />
    </Stage>
  );
};
