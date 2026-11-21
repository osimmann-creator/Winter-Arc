// Inside joke: "THE IRON" - Saturday morning, everyone's honking outside, Flexander is still ironing his shirt. Perfectly.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, springAt } from '../lib/anim';
import { svgM } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, Glint, ConfettiRain, Sparks, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK, Steam } from './kit';
import { reach, inv } from './ik';
import { TITLE_FONT } from '../fonts';
import { cloudPath } from '../lib/shape';

export const IRON_FRAMES = 165;
const GX = 520;
const GY = 1800;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const LIFT = 66;
const SPOT = 84;
const PROUD = 100;
const CARD = 118;
const BOARD_Y = -470; // board surface (hero space)

/* ------------------------------- props ------------------------------- */
const Board: React.FC = () => (
  <g>
    {/* legs */}
    <path d="M-260 -440 L120 0 M120 -440 L-260 0" stroke={INK} strokeWidth={26} strokeLinecap="round" />
    <path d="M-260 -440 L120 0 M120 -440 L-260 0" stroke="#B9B3CC" strokeWidth={12} strokeLinecap="round" />
    <ellipse cx={-260} cy={2} rx={44} ry={12} fill={INK} />
    <ellipse cx={120} cy={2} rx={44} ry={12} fill={INK} />
    {/* board */}
    <path d={`M-560 ${BOARD_Y + 10} C-560 ${BOARD_Y - 30} -480 ${BOARD_Y - 46} -380 ${BOARD_Y - 46} L420 ${BOARD_Y - 46} Q470 ${BOARD_Y - 46} 470 ${BOARD_Y - 6} L470 ${BOARD_Y + 24} Q470 ${BOARD_Y + 44} 430 ${BOARD_Y + 44} L-470 ${BOARD_Y + 44} C-540 ${BOARD_Y + 44} -560 ${BOARD_Y + 30} -560 ${BOARD_Y + 10} Z`} fill="#BFE3F7" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
    <path d={`M-520 ${BOARD_Y + 2} C-510 ${BOARD_Y - 26} -460 ${BOARD_Y - 34} -380 ${BOARD_Y - 34} L420 ${BOARD_Y - 34}`} fill="none" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" opacity={0.8} />
    {[-420, -320, -220, -120, -20, 80, 180, 280, 380].map((x) => (
      <circle key={x} cx={x} cy={BOARD_Y + 10} r={9} fill="#8FC9EA" />
    ))}
    <path d={`M-555 ${BOARD_Y + 30} Q-520 ${BOARD_Y + 44} -470 ${BOARD_Y + 44} L430 ${BOARD_Y + 44} Q470 ${BOARD_Y + 44} 470 ${BOARD_Y + 24}`} fill="none" stroke="#7FB4D6" strokeWidth={10} />
  </g>
);

const Shirt: React.FC<{ wrinkle: number; lift?: boolean }> = ({ wrinkle, lift }) => (
  <g>
    {/* body */}
    <path d={lift ? 'M-150 -40 L-60 -70 Q0 -40 60 -70 L150 -40 L250 60 L190 120 L150 80 L150 330 L-150 330 L-150 80 L-190 120 L-250 60 Z' : 'M-300 -30 L300 -30 L320 30 L-320 30 Z'} fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {lift ? (
      <g>
        <path d="M-60 -70 L0 0 L60 -70 Q0 -40 -60 -70 Z" fill="#E6EEFF" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d="M-60 -70 L-30 -10 L-70 -36 Z M60 -70 L30 -10 L70 -36 Z" fill="#FFFFFF" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <line x1={0} y1={0} x2={0} y2={330} stroke="#DCE4F6" strokeWidth={6} />
        {[60, 130, 200, 270].map((y) => (
          <circle key={y} cx={10} cy={y} r={8} fill="#CFD8F2" stroke={INK} strokeWidth={3} />
        ))}
        <path d="M70 60 h50 v40 h-50 Z" fill="none" stroke="#DCE4F6" strokeWidth={5} />
      </g>
    ) : (
      <g>
        <path d="M-300 -30 L-240 -30 L-250 30 L-320 30 Z" fill="#E6EEFF" stroke={INK} strokeWidth={5} />
        {[-180, -100, -20, 60, 140, 220].map((x) => (
          <circle key={x} cx={x} cy={2} r={6} fill="#CFD8F2" stroke={INK} strokeWidth={2.5} />
        ))}
        {wrinkle > 0.01
          ? [-200, -60, 90, 230].map((x, i) => (
              <path key={i} d={`M${x - 30} ${-14 + i * 3} q15 ${-10 * wrinkle} 30 0 t30 0`} fill="none" stroke="#B8C3DE" strokeWidth={5} strokeLinecap="round" opacity={wrinkle} />
            ))
          : null}
      </g>
    )}
  </g>
);

const Iron: React.FC<{ steam: number }> = ({ steam }) => (
  <g>
    <path d="M-150 60 Q-140 -10 -60 -24 L120 -24 Q150 -24 150 10 L150 60 Z" fill="#7254DC" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-120 34 Q-110 -2 -60 -10 L60 -10" fill="none" stroke={C.violetHi} strokeWidth={9} strokeLinecap="round" opacity={0.8} />
    <path d="M-160 60 L160 60 L150 84 L-140 84 Z" fill="#D9D5E6" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {/* handle loop */}
    <path d="M-60 -24 Q-40 -100 30 -100 L100 -100 Q120 -100 120 -60 L120 -24" fill="none" stroke={INK} strokeWidth={28} strokeLinecap="round" />
    <path d="M-60 -24 Q-40 -100 30 -100 L100 -100 Q120 -100 120 -60 L120 -24" fill="none" stroke="#4F35B0" strokeWidth={14} strokeLinecap="round" />
    <circle cx={60} cy={20} r={14} fill={steam > 0.5 ? '#FF7A5C' : '#FFD064'} stroke={INK} strokeWidth={5} />
  </g>
);

const Clock: React.FC<{ x: number; y: number; m: number; late: number }> = ({ x, y, m, late }) => {
  const mA = (m % 60) * 6;
  const hA = (m / 60) * 30;
  return (
    <g transform={`translate(${x} ${y}) rotate(${late * Math.sin(m) * 4})`}>
      <circle r={130} fill={INK} transform="translate(0 10)" />
      <circle r={130} fill={late > 0.5 ? '#FFB3B3' : '#FFFDF8'} stroke={INK} strokeWidth={12} />
      <circle r={112} fill="none" stroke={C.gold} strokeWidth={10} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={0} y1={-92} x2={0} y2={i % 3 ? -80 : -70} stroke={INK} strokeWidth={i % 3 ? 6 : 10} strokeLinecap="round" transform={`rotate(${i * 30})`} />
      ))}
      <line x1={0} y1={0} x2={0} y2={-56} stroke={INK} strokeWidth={14} strokeLinecap="round" transform={`rotate(${hA})`} />
      <line x1={0} y1={0} x2={0} y2={-84} stroke={late > 0.5 ? '#E2384D' : INK} strokeWidth={9} strokeLinecap="round" transform={`rotate(${mA})`} />
      <circle r={12} fill={C.gold} stroke={INK} strokeWidth={5} />
      {late > 0 ? (
        <g transform={`translate(0 60) scale(${late})`}>
          <rect x={-80} y={-28} width={160} height={56} rx={14} fill="#E2384D" stroke={INK} strokeWidth={6} />
          <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFFFF">LATE</text>
        </g>
      ) : null}
    </g>
  );
};

const Car: React.FC<{ x: number; y: number; bump: number; f: number }> = ({ x, y, bump, f }) => (
  <g transform={`translate(${x} ${y - bump * 10}) rotate(${Math.sin(f * 2) * bump * 2})`}>
    <path d="M-170 0 L-170 -60 Q-160 -80 -120 -84 L-80 -140 Q-60 -160 20 -160 L80 -160 Q110 -160 130 -120 L150 -84 Q190 -80 190 -50 L190 0 Z" fill="#F15F75" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-70 -134 L-50 -150 L20 -150 L20 -96 L-104 -96 Z" fill="#CFE8FF" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M36 -150 L76 -150 Q96 -150 112 -120 L126 -96 L36 -96 Z" fill="#CFE8FF" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    {/* friends (silhouettes) */}
    {[-60, -10, 72].map((hx, i) => (
      <g key={i} transform={`translate(${hx} ${-110 + Math.sin(f * 1.5 + i) * 4 * bump})`}>
        <circle r={20} fill={['#7254DC', '#F2853A', '#2E9E5B'][i]} stroke={INK} strokeWidth={4} />
      </g>
    ))}
    {[-100, 120].map((wx) => (
      <g key={wx} transform={`translate(${wx} 0)`}>
        <circle r={36} fill="#2B2340" stroke={INK} strokeWidth={6} />
        <circle r={14} fill="#B9B3CC" />
      </g>
    ))}
    <rect x={170} y={-58} width={22} height={18} rx={6} fill="#FFF0B7" stroke={INK} strokeWidth={4} />
  </g>
);

const Bubble: React.FC<{ x: number; y: number; text: string; t: number; me?: boolean }> = ({ x, y, text, t, me }) => {
  const k = Math.max(0, Math.min(1.15, springAt(t, 0, 9, 1.5, 5)));
  const w = 44 + text.length * 19;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-32} width={w} height={64} rx={26} fill={me ? '#7254DC' : '#FFFFFF'} stroke={INK} strokeWidth={6} />
      <path d={`M${w / 2 - 30} 28 l16 22 l-34 -18 Z`} fill={me ? '#7254DC' : '#FFFFFF'} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <rect x={w / 2 - 56} y={22} width={30} height={12} fill={me ? '#7254DC' : '#FFFFFF'} />
      <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily="Bangers" fontSize={38} letterSpacing={1} fill={me ? '#FFFFFF' : INK}>
        {text}
      </text>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const CALM: Partial<Pose> = { hipL: 8, hipR: 8, knL: -4, knR: -4, eyes: 1, smile: 1, mouthMode: 'o', mouthOpen: 0.12, brow: 0.5, torso: 0, head: 6, lookY: 0.6 };
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...CALM, handL: 'open', handR: 'fist' } },
  { f: 40, p: { head: -4 } },
  { f: LIFT - 4, p: { head: 2 } },
  // lift the shirt to inspect
  { f: LIFT + 4, p: { eyes: 0, mouthMode: 'grin', mouthOpen: 0.4, lookY: -0.3, head: 0, brow: 0.8, handL: 'fist', handR: 'fist' }, e: E.inOut },
  { f: SPOT - 4, p: { eyeMode: 'star', mouthOpen: 0.9 } },
  // ...wait. a wrinkle.
  { f: SPOT, p: { eyeMode: 'normal', lid: 0.45, mouthMode: 'grin', mouthOpen: 0, smile: 0.2, browTilt: -0.8, brow: -0.2, lookY: 0.4, lookX: 0.3, turn: 0.1 }, e: E.out },
  { f: SPOT + 6, p: { eyes: 1, smile: 1, mouthMode: 'o', mouthOpen: 0.12, lid: 0, browTilt: 0, brow: 0.5, lookY: 0.6, lookX: 0, turn: 0, handL: 'open' }, e: E.inOut },
  { f: PROUD - 2, p: {} },
  // proud: shirt up + thumbs up... still not leaving
  { f: PROUD + 4, p: { eyes: 0, wink: 1, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, mouthSkew: 0.4, brow: 0.9, lookY: 0, head: 0, handL: 'fist' }, e: E.back },
  { f: IRON_FRAMES, p: {} },
];

const ironX = (f: number) => {
  // ironing strokes (hero space x of the iron hand), faster as time runs out
  const ph = f < LIFT ? f * 0.22 + f * f * 0.0016 : (f - SPOT) * 0.3;
  return 70 + Math.sin(ph) * 190;
};
const solve = (f: number): Pose => {
  const p = plant(poseAt(f, BASE, KEYS));
  const ironing = (f < LIFT - 2 || (f > SPOT + 4 && f < PROUD - 2)) ? 1 : 0;
  const liftK = seg(f, LIFT - 4, LIFT + 4) * (1 - seg(f, SPOT, SPOT + 6)) + seg(f, PROUD - 2, PROUD + 4);
  const r = rig(p);
  if (liftK > 0.01) {
    // hold the shirt up by its shoulders at chest height
    const chest = r.W(r.torso, 0, -170);
    const l = reach(p, 'L', [chest[0] - 150, chest[1] - 120], -1, 30);
    const rr = reach(p, 'R', [chest[0] + 150, chest[1] - 120], -1, 30);
    const base = reach(p, 'L', [-220, BOARD_Y - 40], 1, 50);
    const baseR = reach(p, 'R', [ironX(f), BOARD_Y - 100], 1, 10);
    return {
      ...p,
      shL: lerp(base.shL ?? 0, l.shL ?? 0, liftK), elL: lerp(base.elL ?? 0, l.elL ?? 0, liftK),
      shR: lerp(baseR.shR ?? 0, rr.shR ?? 0, liftK), elR: lerp(baseR.elR ?? 0, rr.elR ?? 0, liftK),
    };
  }
  const l = reach(p, 'L', [-220 + Math.sin(f * 0.2) * 10, BOARD_Y - 40], 1, 50);
  const rr = reach(p, 'R', [ironX(f), BOARD_Y - 100 - (ironing ? 0 : 30)], 1, 10);
  return { ...p, ...l, ...rr };
};

export const JokeIronScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const hand = r.W(r.aR.wrist, 0, 10);
  const liftK = seg(f, LIFT - 4, LIFT + 4) * (1 - seg(f, SPOT, SPOT + 6)) + seg(f, PROUD - 2, PROUD + 4);
  const shirtUp = liftK > 0.5;
  const minutes = 9 * 60 + kf(f, [[0, 0], [LIFT, 34, E.in], [SPOT, 40], [PROUD, 52, E.in], [IRON_FRAMES, 58]]);
  const late = seg(f, SPOT + 6, SPOT + 12);
  const honks = [20, 34, 46, 56, 92, 104];
  const bump = Math.max(...honks.map((h) => (f >= h && f < h + 8 ? Math.sin(((f - h) / 8) * Math.PI) : 0)));
  const chest = toStage(r.W(r.torso, 0, -240));
  const wrinkle = f < LIFT ? 1 - seg(f, 8, LIFT - 6) : f < SPOT + 4 ? 0.0 : 0.3 * (1 - seg(f, SPOT + 4, PROUD - 4));
  const steam = f < LIFT - 2 || (f > SPOT + 4 && f < PROUD - 2) ? 1 : 0;
  const ironStage = toStage([hand[0], BOARD_Y - 30]);
  const invRoot = svgM(inv(r.root));

  const cam: Cam = {
    cx: kf(f, [[0, 540], [LIFT, 540], [SPOT, 600, E.inOut], [SPOT + 10, 600], [PROUD, 540, E.inOut]]),
    cy: kf(f, [[0, 1000], [LIFT - 6, 1000], [LIFT + 4, 960, E.inOut], [SPOT, 1180, E.inOut], [SPOT + 10, 1180], [PROUD, 1000, E.inOut], [CARD, 1000], [CARD + 10, 1060, E.inOut]]),
    z: kf(f, [[0, 1.0], [LIFT - 6, 1.0], [LIFT + 4, 1.12, E.inOut], [SPOT, 1.7, E.inOut], [SPOT + 10, 1.75], [PROUD, 1.0, E.inOut], [CARD, 1.0], [CARD + 10, 0.92, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, 92, 12, 6 * bump, 3);

  // phone messages (newest at the bottom)
  const msgs: [number, string][] = [
    [16, "we're outside"],
    [28, 'bro??'],
    [40, 'AYAAD'],
    [52, 'are u ironing again'],
    [96, "WE'RE SO LATE"],
  ];
  const shown = msgs.filter(([t]) => f >= t);

  return (
    <Stage bg="#F4EEFF" overlay={<EndCard f={f} start={CARD} lines={['THE IRON']} pts="SAT" unit="9:58" sub="AYAAD IS IN LAST" color="#7254DC" dark="#4F35B0" light="#DCD0FF" y={90} />}>
      <GlowDefs />
      {/* room */}
      <g transform={camP(cam, 0.6, { x: sh.x * 0.3, y: sh.y * 0.3, r: 0 })}>
        <rect x={-400} y={-400} width={1880} height={2800} fill="#EFE8FF" />
        {Array.from({ length: 16 }).map((_, i) => (
          <rect key={i} x={-400 + i * 120} y={-400} width={56} height={2800} fill="#E6DDFB" />
        ))}
        {/* window with the car outside */}
        <g>
          <rect x={620} y={260} width={420} height={500} rx={18} fill="#9DD2FF" stroke={INK} strokeWidth={12} />
          <rect x={632} y={600} width={396} height={148} fill="#9ED17E" />
          <rect x={632} y={650} width={396} height={70} fill="#8A8597" />
          <path d={cloudPath(760, 360, 160, 60, 2)} fill="#FFFFFF" opacity={0.9} />
          <Car x={840} y={700} bump={bump} f={f} />
          <rect x={620} y={260} width={420} height={500} rx={18} fill="none" stroke={INK} strokeWidth={12} />
          <line x1={830} y1={260} x2={830} y2={760} stroke={INK} strokeWidth={10} />
          <line x1={620} y1={510} x2={1040} y2={510} stroke={INK} strokeWidth={10} />
          <rect x={600} y={756} width={460} height={34} rx={10} fill="#FFFDF8" stroke={INK} strokeWidth={9} />
        </g>
        <Clock x={260} y={420} m={minutes} late={late} />
        {/* calendar */}
        <g transform="translate(250 720) rotate(-4)">
          <rect x={-90} y={-60} width={180} height={190} rx={12} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
          <rect x={-90} y={-60} width={180} height={56} rx={12} fill="#E2384D" stroke={INK} strokeWidth={8} />
          <text x={0} y={-30} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#FFFFFF">SAT</text>
          <text x={0} y={66} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={86} fill={INK}>9AM</text>
        </g>
        {/* floor */}
        <rect x={-400} y={1640} width={1880} height={800} fill="#D9C2A8" />
        <rect x={-400} y={1640} width={1880} height={16} fill="#B99A7A" />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <ellipse cx={GX} cy={GY + 4} rx={300} ry={30} fill="#000" opacity={0.1} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          shadow={false}
          between={
            <g transform={invRoot}>
              <Board />
              {!shirtUp ? (
                <g transform={`translate(-40 ${BOARD_Y - 60})`}>
                  <Shirt wrinkle={wrinkle} />
                </g>
              ) : null}
              {/* phone on the board end */}
              <g transform={`translate(330 ${BOARD_Y - 58}) rotate(${bump * Math.sin(f * 3) * 6})`}>
                <rect x={-50} y={-14} width={100} height={28} rx={8} fill="#2B2340" stroke={INK} strokeWidth={6} />
                <rect x={-40} y={-10} width={80} height={10} rx={4} fill={f % 8 < 4 && shown.length ? '#BCABFF' : '#4E4670'} />
              </g>
              {!shirtUp ? (
                <g transform={`translate(${hand[0] - 10} ${BOARD_Y - 150})`}>
                  <Iron steam={steam} />
                </g>
              ) : (
                <g transform={`translate(330 ${BOARD_Y - 150}) scale(0.9)`}>
                  <Iron steam={0} />
                </g>
              )}
            </g>
          }
          front={
            shirtUp ? (
              <g transform={invRoot}>
                <g transform={`translate(${(r.W(r.aL.wrist, 0, 30)[0] + r.W(r.aR.wrist, 0, 30)[0]) / 2} ${r.W(r.aL.wrist, 0, 30)[1] + 40})`}>
                  <Shirt wrinkle={0} lift />
                </g>
              </g>
            ) : undefined
          }
        />
        {/* steam puffs off the iron */}
        {steam
          ? [0, 1, 2].map((i) => {
              const t = ((f + i * 7) % 21) / 21;
              return (
                <g key={i} transform={`translate(${ironStage[0] - 100 * SC - t * 40} ${ironStage[1] - 40 - t * 140}) scale(${0.4 + t * 0.8})`} opacity={(1 - t) * 0.9}>
                  <path d={cloudPath(0, 0, 90, 56, i + 3)} fill="#FFFFFF" stroke="#C9C2DE" strokeWidth={5} />
                </g>
              );
            })
          : null}
        <Steam x={chest[0] - 200} y={chest[1] - 40} f={f} h={120} o={shirtUp ? 0.6 : 0} w={12} seed={3} />
        {/* notes while humming */}
        {[4, 14, 24, 34].map((n, i) => {
          const t = f - n;
          if (t < 0 || t > 14) return null;
          const m = toStage(r.mouth());
          return (
            <text key={i} x={m[0] - 70 - t * 4} y={m[1] - 40 - t * 6} fontFamily={TITLE_FONT} fontSize={66} fill="#7254DC" stroke={INK} strokeWidth={4} opacity={1 - seg(t, 9, 14)}>
              ♪
            </text>
          );
        })}
        {/* inspect sparkle */}
        {[0, 1, 2].map((i) => (
          <Twinkle key={i} x={chest[0] + [-120, 140, 20][i]} y={chest[1] + [40, -10, 140][i]} s={1.2} t={seg(f, LIFT + 6 + i * 3, LIFT + 18 + i * 3)} />
        ))}
        <Glow x={chest[0]} y={chest[1] + 60} r={kf(f, [[LIFT + 2, 0], [LIFT + 8, 360, E.out], [SPOT - 2, 200], [SPOT, 0]])} id="glowW" o={0.8} />
        <Glint x={chest[0] + 170} y={chest[1] - 40} s={1.1} t={seg(f, PROUD + 4, PROUD + 18)} />
        <Sparks f={f} start={PROUD + 2} seed={9} n={18} x={chest[0]} y={chest[1] + 60} speed={[12, 28]} g={0.5} size={[12, 22]} colors={['#FFFFFF', '#FFF0B7', '#BCABFF']} shape="star" />
      </g>
      {/* honks + bubbles (screen space) */}
      {honks.map((h, i) => (
        <Sfx key={i} f={f} start={h} text={i % 2 ? 'HONK HONK!' : 'HONK!'} x={i % 2 ? 790 : 840} y={i % 2 ? 230 : 190} size={i % 2 ? 90 : 110} rot={i % 2 ? -6 : 8} fill="#FFFFFF" dur={14} />
      ))}
      <g opacity={1 - seg(f, CARD - 6, CARD)}>
        {shown.slice(-3).map(([t, text], i, arr) => (
          <Bubble key={t} x={1046 - (44 + text.length * 19) / 2} y={1130 + (i - arr.length + 1) * 84} text={text} t={f - t} />
        ))}
      </g>
      <Sfx f={f} start={LIFT + 4} text="CRISP." x={540} y={560} size={140} rot={-6} fill="#FFFFFF" dur={13} />
      <Sfx f={f} start={SPOT} text="...wait. one wrinkle." x={540} y={1500} size={74} rot={-3} fill="#FFFFFF" dur={14} shake={false} />
      <Sfx f={f} start={SPOT + 8} text="9:58" x={300} y={300} size={120} rot={-8} fill="#FF9AA6" dur={16} />
      <ConfettiRain f={f} start={CARD + 2} n={44} seed={21} colors={['#7254DC', '#BCABFF', '#FFFFFF', '#FFD064', '#9DD2FF']} />
    </Stage>
  );
};
