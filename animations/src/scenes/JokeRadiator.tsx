// Inside joke: "THE RADIATOR" - 4 days without a log, because Jake is chained to a radiator. The phone is right there.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE, Bubble, Calendar } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const RADIATOR_FRAMES = 165;
const GX = 560;
const GY = 1800;
const SC = 0.8;
const toStage = stageOf(GX, GY, SC);
const LUNGE1 = 26;
const SNAP1 = 40;
const LUNGE2 = 62;
const SNAP2 = 84;
const BUZZ = 92;
const CARD = 120;
const ANCHOR: [number, number] = [214, 1530]; // chain ring on the radiator pipe
const [ORANGE] = PEOPLE.jake;

/* ------------------------------- props ------------------------------- */
const Radiator: React.FC = () => (
  <g>
    <rect x={40} y={1810} width={360} height={14} rx={7} fill="#000" opacity={0.12} />
    {/* pipe into the floor */}
    <rect x={196} y={1500} width={36} height={320} rx={10} fill="#C9C2B4" stroke={INK} strokeWidth={8} />
    {Array.from({ length: 7 }).map((_, i) => (
      <g key={i} transform={`translate(${70 + i * 44} 0)`}>
        <rect x={-20} y={1420} width={40} height={380} rx={18} fill="#F4EEDF" stroke={INK} strokeWidth={8} />
        <rect x={-10} y={1440} width={10} height={330} rx={5} fill="#FFFFFF" opacity={0.8} />
      </g>
    ))}
    <rect x={44} y={1470} width={312} height={26} rx={10} fill="#E4DCC6" stroke={INK} strokeWidth={7} />
    <rect x={44} y={1726} width={312} height={26} rx={10} fill="#E4DCC6" stroke={INK} strokeWidth={7} />
    {/* valve */}
    <circle cx={380} cy={1520} r={22} fill="#E2384D" stroke={INK} strokeWidth={7} />
    <circle cx={ANCHOR[0]} cy={ANCHOR[1]} r={20} fill="none" stroke="#8A8597" strokeWidth={12} />
  </g>
);

/** Chain of links from a to b; slack makes it sag. */
const Chain: React.FC<{ a: [number, number]; b: [number, number]; slack: number; f: number }> = ({ a, b, slack, f }) => {
  const n = 18;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const sag = slack * Math.max(30, 300 - len * 0.35);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(t * Math.PI) * sag + Math.sin(f * 0.6 + i) * slack * 3]);
  }
  return (
    <g>
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const ang = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
        const cx = (p[0] + q[0]) / 2;
        const cy = (p[1] + q[1]) / 2;
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
        return (
          <g key={i} transform={`translate(${cx} ${cy}) rotate(${ang})`}>
            {i % 2 ? (
              <rect x={-l * 0.62} y={-5} width={l * 1.24} height={10} rx={5} fill="#8A8597" stroke={INK} strokeWidth={5} />
            ) : (
              <rect x={-l * 0.62} y={-13} width={l * 1.24} height={26} rx={13} fill="none" stroke={INK} strokeWidth={13} />
            )}
            {i % 2 ? null : <rect x={-l * 0.62} y={-13} width={l * 1.24} height={26} rx={13} fill="none" stroke="#B9B3CC" strokeWidth={5} />}
          </g>
        );
      })}
    </g>
  );
};

const Cuff: React.FC = () => (
  <g transform="translate(0 6)">
    <ellipse cx={0} cy={0} rx={44} ry={20} fill="none" stroke={INK} strokeWidth={16} />
    <ellipse cx={0} cy={0} rx={44} ry={20} fill="none" stroke="#B9B3CC" strokeWidth={7} />
  </g>
);

const Stool: React.FC<{ glow: number; buzz: number; f: number }> = ({ glow, buzz, f }) => (
  <g>
    <path d="M850 1800 L880 1470 M1030 1800 L1000 1470" stroke={INK} strokeWidth={22} strokeLinecap="round" />
    <path d="M850 1800 L880 1470 M1030 1800 L1000 1470" stroke="#A06343" strokeWidth={10} strokeLinecap="round" />
    <rect x={830} y={1440} width={220} height={44} rx={16} fill="#C27C5E" stroke={INK} strokeWidth={8} />
    {/* phone lying on it, screen up, buzzing */}
    <g transform={`translate(${940 + (buzz > 0 ? Math.sin(f * 3) * 6 : 0)} 1418)`}>
      <ellipse cx={0} cy={10} rx={110} ry={12} fill="#000" opacity={0.15} />
      <rect x={-100} y={-24} width={200} height={40} rx={14} fill="#2B2340" stroke={INK} strokeWidth={7} />
      <rect x={-88} y={-20} width={176} height={20} rx={8} fill={glow > 0.5 ? '#FFD064' : '#4E4670'} />
    </g>
  </g>
);

/* ------------------------------- poses ------------------------------- */
const IDLE: Partial<Pose> = {
  shL: 40, elL: 10, handL: 'fist', shR: 16, elR: 20, handR: 'relax', hipL: 6, hipR: 6, knL: -4, knR: -4,
  lookX: 0.8, lookY: 0.4, turn: 0.2, smile: 0.2, mouthMode: 'o', mouthOpen: 0.1, lid: 0.35, brow: 0.3, browTilt: 0.6,
};
const REACH: Partial<Pose> = {
  rot: 16, shL: 64, elL: 6, shR: 96, elR: -4, handR: 'open', hipL: 34, knL: -30, hipR: -18, knR: -6, ftR: 10,
  lookX: 1, lookY: 0.2, turn: 0.35, mouthMode: 'grit', mouthOpen: 0.5, lid: 0.2, browTilt: -0.8, brow: 0.6, red: 0.5, sweat: 1, torso: 6,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...IDLE } },
  { f: 18, p: { lookY: 0.6, lid: 0.45 } },
  { f: LUNGE1, p: { ...REACH, rot: 10, red: 0.2 }, e: E.out },
  { f: SNAP1 - 4, p: { ...REACH } },
  { f: SNAP1, p: { ...IDLE, rot: -6, mouthMode: 'o', mouthOpen: 0.8, lid: 0, brow: 1, browTilt: 1, sy: 0.95, sx: 1.04, lookX: -0.6, turn: -0.2 }, e: E.back },
  { f: SNAP1 + 10, p: { ...IDLE, rot: 0, mouthMode: 'grit', mouthOpen: 0.3, lid: 0.3, browTilt: -1, brow: 0.2, lookX: 0.9, turn: 0.2 } },
  { f: LUNGE2, p: { ...REACH, rot: 20, shR: 92, red: 0.9, mouthOpen: 0.9 }, e: E.out },
  { f: SNAP2 - 2, p: { ...REACH, rot: 21, shR: 94, red: 1, mouthOpen: 1 } },
  { f: SNAP2 + 4, p: { ...IDLE, rot: -4, shL: 30, mouthMode: 'o', mouthOpen: 0.6, red: 0, sweat: 1, brow: 1, browTilt: 1 }, e: E.back },
  { f: BUZZ, p: { ...IDLE, lookX: 0.9, lookY: 0.4, eyeMode: 'normal', pupil: 0.6, mouthOpen: 0.5, brow: 1 } },
  { f: 106, p: { lookX: 0, lookY: 0, turn: 0, pupil: 1.3, lid: 0.1, brow: 1.2, browTilt: 1.2, mouthMode: 'o', mouthOpen: 0.25, smile: 0, head: 6, shR: 30, elR: 40, handR: 'open' } },
  { f: RADIATOR_FRAMES, p: { head: 4 } },
];
const solve = (f: number): Pose => plant(poseAt(f, BASE, KEYS));

export const JokeRadiatorScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const cuff = toStage(r.W(r.aL.wrist, 0, 36));
  const taut = Math.max(seg(f, LUNGE1 - 6, LUNGE1), 0) * (1 - seg(f, SNAP1 + 2, SNAP1 + 8)) + seg(f, LUNGE2 - 8, LUNGE2) * (1 - seg(f, SNAP2 + 2, SNAP2 + 8));
  const day = f < 6 ? 1 : f < 12 ? 2 : f < 18 ? 3 : 4;
  const buzz = f >= BUZZ && f < BUZZ + 26 ? 1 : 0;
  const bulb = Math.sin(f / 14) * 8;
  const cam: Cam = {
    cx: kf(f, [[0, 560], [LUNGE2 - 6, 560], [LUNGE2 + 4, 700, E.out], [SNAP2 + 4, 620], [CARD, 560], [CARD + 12, 540, E.inOut]]),
    cy: kf(f, [[0, 1080], [LUNGE2 - 6, 1080], [LUNGE2 + 4, 1300, E.out], [SNAP2 + 4, 1160], [CARD, 1080], [CARD + 12, 960, E.inOut]]),
    z: kf(f, [[0, 1], [LUNGE2 - 6, 1], [LUNGE2 + 4, 1.25, E.out], [SNAP2 + 4, 1.05], [CARD, 1], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh1 = shake(f, SNAP1, 12, 12, 2);
  const sh2 = shake(f, SNAP2, 12, 14, 4);
  const S = { x: sh1.x + sh2.x, y: sh1.y + sh2.y, r: sh1.r + sh2.r };

  return (
    <Stage
      bg="#3D4250"
      overlay={<EndCard f={f} start={CARD} lines={['THE RADIATOR']} pts="4" unit="DAYS" sub="JAKE: 4 DAYS, 0 LOGS" color="#6B7689" dark="#454E5E" light="#DCE2EC" y={80} />}
    >
      <GlowDefs />
      {/* basement */}
      <g transform={camP(cam, 0.7, { x: S.x * 0.3, y: S.y * 0.3, r: 0 })}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#8C93A3" />
        {Array.from({ length: 14 }).map((_, row) =>
          Array.from({ length: 12 }).map((__, col) => (
            <rect key={`${row}-${col}`} x={-600 + col * 200 + (row % 2) * 100} y={-200 + row * 110} width={190} height={100} rx={8} fill="#959CAC" stroke="#7B8191" strokeWidth={6} />
          )),
        )}
        {/* little window, high up */}
        <rect x={700} y={330} width={300} height={170} rx={12} fill="#1F2A4D" stroke={INK} strokeWidth={10} />
        <circle cx={900} cy={390} r={34} fill="#FFF0B7" />
        <line x1={850} y1={330} x2={850} y2={500} stroke={INK} strokeWidth={8} />
        {/* tally marks + calendar */}
        <g transform="translate(150 600)">
          {Array.from({ length: day }).map((_, i) => (
            <path key={i} d={`M${i * 40} 0 L${i * 40 + 6} 150`} stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.9} />
          ))}
        </g>
        <Calendar x={260} y={380} top="DAY" big={String(day)} color="#6B7689" rot={-6} />
        <rect x={-600} y={1660} width={2280} height={1200} fill="#5E6474" />
        <rect x={-600} y={1660} width={2280} height={18} fill="#4B505E" />
      </g>
      {/* swinging bulb */}
      <g transform={camP(cam, 0.8, S)}>
        <g transform={`translate(560 -200) rotate(${bulb})`}>
          <line x1={0} y1={0} x2={0} y2={560} stroke={INK} strokeWidth={8} />
          <Glow x={0} y={600} r={420} id="glowY" o={0.55} />
          <circle cx={0} cy={600} r={48} fill="#FFF0B7" stroke={INK} strokeWidth={8} />
          <rect x={-26} y={540} width={52} height={36} rx={8} fill="#B9B3CC" stroke={INK} strokeWidth={7} />
        </g>
      </g>
      <g transform={camP(cam, 1, S)}>
        <Radiator />
        <Stool glow={f % 30 < 18 ? 1 : 0} buzz={buzz} f={f} />
        <ellipse cx={GX} cy={GY + 4} rx={220} ry={24} fill="#000" opacity={0.18} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemL={<Cuff />} />
        <Chain a={ANCHOR} b={cuff} slack={1 - taut} f={f} />
        <Sparks f={f} start={SNAP1} seed={3} n={10} x={cuff[0]} y={cuff[1]} speed={[10, 20]} g={0.6} size={[8, 14]} colors={['#FFFFFF', '#FFF0B7']} shape="star" />
        <Sparks f={f} start={SNAP2} seed={6} n={12} x={cuff[0]} y={cuff[1]} speed={[10, 22]} g={0.6} size={[8, 14]} colors={['#FFFFFF', '#FFF0B7']} shape="star" />
        {/* distance to the phone */}
        {f >= LUNGE2 && f < SNAP2 ? (
          <g opacity={seg(f, LUNGE2, LUNGE2 + 4)}>
            <path d={`M${toStage(r.handR())[0] + 30} 1360 L 900 1360`} stroke="#FFFFFF" strokeWidth={8} strokeDasharray="14 12" />
            <text x={(toStage(r.handR())[0] + 930) / 2} y={1320} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFFFF" stroke={INK} strokeWidth={8} paintOrder="stroke">1 INCH</text>
          </g>
        ) : null}
      </g>
      <g transform={camP(cam, 1, S)}>
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={800} y={1300} text="WINTER ARC: LOG SOMETHING?" t={f - BUZZ} size={34} color="#FFFFFF" side={1} />
          <Bubble x={300} y={1020} text="LOG IT FOR ME??" t={f - 104} size={42} me side={-1} />
        </g>
        <NameTag x={head[0]} y={head[1] - 60} name="JAKE" color={ORANGE} t={f - 4} out={seg(f, CARD - 8, CARD)} />
      </g>
      <Sfx f={f} start={SNAP1 - 1} text="CLANK!" x={300} y={1240} size={140} rot={-8} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={SNAP2 - 1} text="CLANK!!" x={330} y={1180} size={150} rot={6} fill="#FFD064" dur={16} />
      <Sfx f={f} start={LUNGE2 - 2} text="SO CLOSE" x={640} y={760} size={110} rot={-4} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={BUZZ} text="BZZT" x={930} y={1300} size={90} rot={10} fill="#FFD064" dur={16} />
      <ConfettiRain f={f} start={CARD + 2} n={36} seed={13} colors={['#6B7689', '#DCE2EC', '#FFFFFF', '#E39A2E', '#FFD064']} />
    </Stage>
  );
};
