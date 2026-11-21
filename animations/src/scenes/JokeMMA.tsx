// Inside joke: "MMA GUY" - Amaan's 4th MMA session this week. He's better than all of us now. (It is not cool.)
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE, Bubble } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const MMA_FRAMES = 165;
const GX = 540;
const GY = 1760;
const SC = 0.8;
const toStage = stageOf(GX, GY, SC);
const PUNCH = 26;
const SPIN = 50;
const FALL = 66;
const UP = 88;
const POINT = 100;
const CARD = 122;
const [ORANGE] = PEOPLE.amaan;

/* ------------------------------- props ------------------------------- */
/** Oversized red MMA glove (wrist space). */
export const Glove: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`translate(0 52) scale(${s})`}>
    <ellipse cx={4} cy={8} rx={64} ry={72} fill={INK} opacity={0.25} />
    <path d="M-58 -30 C-62 -70 -30 -86 0 -86 C34 -86 62 -66 60 -26 L58 40 C56 70 30 84 0 84 C-32 84 -58 66 -60 36 Z" fill="#D9434A" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M-40 -60 C-20 -76 20 -76 36 -64" fill="none" stroke="#FF8C8C" strokeWidth={10} strokeLinecap="round" />
    {[-30, -10, 10, 30].map((x) => (
      <path key={x} d={`M${x} 34 L${x} 70`} stroke="#962830" strokeWidth={6} strokeLinecap="round" />
    ))}
    <rect x={-62} y={-46} width={124} height={30} rx={10} fill="#FFFDF6" stroke={INK} strokeWidth={6} />
    <rect x={-20} y={-44} width={18} height={26} fill="#962830" />
  </g>
);

const Headband: React.FC = () => (
  <g>
    <path d="M-150 -238 Q0 -272 150 -238 L146 -204 Q0 -238 -146 -204 Z" fill="#D9434A" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M146 -224 C190 -230 220 -200 236 -170 M146 -214 C186 -206 200 -176 214 -150" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
    <path d="M146 -224 C190 -230 220 -200 236 -170 M146 -214 C186 -206 200 -176 214 -150" fill="none" stroke="#D9434A" strokeWidth={8} strokeLinecap="round" />
  </g>
);

const Cage: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-600} y={-600} width={2280} height={3200} fill="#1C2033" />
    {/* empty seats */}
    {[300, 420, 540].map((y, row) => (
      <g key={row}>
        {Array.from({ length: 16 }).map((_, i) => (
          <rect key={i} x={-300 + i * 110 + (row % 2) * 55} y={y} width={84} height={70} rx={14} fill="#2C3350" stroke="#151827" strokeWidth={6} />
        ))}
      </g>
    ))}
    <Glow x={540} y={760} r={900} id="glowW" o={0.25} />
    {/* chain-link fence */}
    <g opacity={0.6}>
      {Array.from({ length: 40 }).map((_, i) => (
        <g key={i}>
          <line x1={-600 + i * 60} y1={640} x2={-600 + i * 60 + 900} y2={1640} stroke="#8A93B8" strokeWidth={4} />
          <line x1={-600 + i * 60} y1={1640} x2={-600 + i * 60 + 900} y2={640} stroke="#8A93B8" strokeWidth={4} />
        </g>
      ))}
    </g>
    {[-80, 540, 1160].map((x) => (
      <rect key={x} x={x - 22} y={600} width={44} height={1060} rx={14} fill="#2B2340" stroke={INK} strokeWidth={8} />
    ))}
    <rect x={-600} y={610} width={2280} height={34} fill="#2B2340" stroke={INK} strokeWidth={8} />
    {/* mat */}
    <rect x={-600} y={1640} width={2280} height={1200} fill="#7C86A8" />
    <path d="M-100 1640 L1180 1640 L1500 2100 L-420 2100 Z" fill="#8F99BB" />
    <text x={540} y={1840} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={130} fill="#6B7596" opacity={0.8}>MMA</text>
    {/* the one spotlight */}
    <path d={`M${540 + Math.sin(f / 20) * 30} -200 L240 1800 L840 1800 Z`} fill="#FFFFFF" opacity={0.08} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const STANCE: Partial<Pose> = {
  shL: 50, elL: 100, shR: 40, elR: 120, handL: 'fist', handR: 'fist', hipL: 58, knL: -96, hipR: 4, knR: -6,
  lookX: 0, lookY: 0.1, lid: 0.45, brow: 0.9, browTilt: 0.8, smile: 0.7, mouthMode: 'grin', mouthOpen: 0.15, mouthSkew: 0.9, head: -6, torso: -6,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...STANCE } },
  { f: 10, p: { shL: 90, elL: 40, shR: 20, elR: 140, head: 6, torso: 6 } },
  { f: 20, p: { shL: 40, elL: 120, shR: 80, elR: 30, head: -6, torso: -6 } },
  // the noodle punch
  { f: PUNCH, p: { shR: 64, elR: 80, uaR: 1, faR: 1, mouthMode: 'o', mouthOpen: 0.6, lid: 0.2, browTilt: -0.6, hipL: 20, knL: -30 } },
  { f: PUNCH + 12, p: { shR: 100, elR: -10, uaR: 1.45, faR: 1.5, wrR: 40, mouthMode: 'grit', mouthOpen: 1, red: 0.6, lid: 0.5, sx: 1.06, sy: 0.95 }, e: E.inOut },
  { f: SPIN - 6, p: { shR: 40, elR: 60, uaR: 1, faR: 1, wrR: 0, red: 0.2, sx: 1, sy: 1 } },
  // the spinning kick
  { f: SPIN + 6, p: { hipR: -70, knR: 10, ftR: 20, shL: 150, elL: 10, shR: 150, elR: 10, eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.8, rot: -10 } },
  { f: FALL - 2, p: { rot: 30, hipR: -80, mouthOpen: 1 } },
  { f: FALL + 6, p: { rot: 84, hipL: 30, knL: -40, hipR: -30, knR: -10, shL: 160, shR: 120, elL: 30, elR: 40, eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.5 }, e: E.in },
  { f: UP - 4, p: { rot: 80 } },
  { f: UP + 6, p: { rot: 0, hipL: 10, knL: -10, hipR: 10, knR: -10, shL: 20, elL: 30, shR: 20, elR: 30, eyeMode: 'spiral' }, e: E.out },
  { f: POINT, p: { eyeMode: 'normal', shR: 70, elR: 10, handR: 'point', lid: 0.5, brow: 1, browTilt: 0.9, smile: 1, mouthMode: 'grin', mouthOpen: 0.3, mouthSkew: 1, head: -8, lookX: 0, lookY: 0, turn: 0 }, e: E.back },
  { f: MMA_FRAMES, p: { head: -4 } },
];
const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  if (f >= SPIN && f < SPIN + 14) p = { ...p, sx: Math.cos(((f - SPIN) / 14) * Math.PI * 4) };   // two spins (faked with a flip)
  const bob = f < PUNCH ? Math.abs(Math.sin(f * 0.45)) * 40 : 0;
  return plant(p, bob);
};

export const JokeMMAScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1160], [PUNCH, 1160], [PUNCH + 10, 1100, E.out], [FALL, 1200], [FALL + 8, 1380, E.out], [UP, 1300], [POINT, 1140, E.inOut], [CARD, 1140], [CARD + 12, 960, E.inOut]]),
    z: kf(f, [[0, 1.0], [PUNCH, 1.0], [PUNCH + 10, 1.15, E.out], [FALL, 1.0], [FALL + 8, 1.2, E.out], [UP, 1.05], [POINT, 1.1, E.inOut], [CARD, 1.05], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, FALL + 6, 14, 20, 2);
  const gloves = { itemL: <Glove />, itemR: <Glove /> };

  return (
    <Stage
      bg="#1C2033"
      overlay={<EndCard f={f} start={CARD} lines={['MMA GUY']} pts="4" unit="SESSIONS" sub="AMAAN DOES MMA. HE TOLD US." color="#D9434A" dark="#962830" light="#FFC9C9" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.7, { x: sh.x * 0.4, y: sh.y * 0.4, r: 0 })}>
        <Cage f={f} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <ellipse cx={GX} cy={GY + 4} rx={240} ry={26} fill="#000" opacity={0.25} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} headExtra={<Headband />} {...gloves} />
        <Dust f={f} start={FALL + 6} x={GX + 120} y={GY - 20} n={8} seed={3} spread={320} size={70} color="#B9C1DC" line="#6B7596" />
        {/* the crowd: one cricket */}
        {f >= POINT + 4 ? (
          <text x={880 + Math.sin(f) * 3} y={1520} fontFamily="Bangers" fontSize={56} fill="#B9C1DC" opacity={0.8 * (f % 20 < 12 ? 1 : 0.3)}>chirp</text>
        ) : null}
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={250} y={700} text="I DO MMA" t={f - 6} size={60} me color="#D9434A" side={-1} />
          <Bubble x={640} y={780} text="I'M BETTER THAN ALL OF U" t={f - POINT} size={52} me color="#D9434A" side={1} />
        </g>
        <NameTag x={head[0]} y={head[1] - 70} name="AMAAN" color={ORANGE} t={f - 2} out={seg(f, CARD - 8, CARD)} />
      </g>
      <Sfx f={f} start={PUNCH + 4} text="HIYAAA" x={760} y={620} size={130} rot={8} fill="#FFFFFF" dur={18} />
      <Sfx f={f} start={SPIN + 2} text="WHOOSH?" x={300} y={640} size={110} rot={-8} fill="#FFD064" dur={16} />
      <Sfx f={f} start={FALL + 6} text="THUD." x={600} y={1500} size={150} rot={-4} fill="#FFFFFF" dur={20} />
      <ConfettiRain f={f} start={CARD + 2} n={36} seed={29} colors={['#D9434A', '#FFC9C9', '#FFFFFF', '#F2853A', '#7C86A8']} />
    </Stage>
  );
};
