// Inside joke: "SATELLITE HOUSE" - beers with the boys, then Connor heads home. He lives so far away it's in orbit.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam, W, TOP, FULL_H } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Cloud, Stars, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { Mug } from './Beers';
import { Flame } from './Torch';
import { NameTag, PEOPLE, Bubble } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const SAT_FRAMES = 165;
const GX = 540;
const FLOOR = 1800;
const SC = 0.74;
const CLINK = 10;
const WATCH = 32;
const IGNITE = 46;
const LIFT = 50;
const ARRIVE = 96;
const CARD = 122;
const HOUSE: [number, number] = [700, -1640];   // porch (world)
const LAND_X = HOUSE[0] - 250;
const [BLUE] = PEOPLE.connor;

/* ------------------------------- props ------------------------------- */
const Jetpack: React.FC<{ on: number; f: number }> = ({ on, f }) => (
  <g>
    {[-74, 74].map((x) => (
      <g key={x} transform={`translate(${x} -300)`}>
        {on > 0 ? (
          <g transform={`translate(0 230) scale(${on * (0.9 + Math.sin(f * 1.7 + x) * 0.15)}) rotate(180)`}>
            <Flame f={f} s={1.1} seed={x > 0 ? 2 : 1} />
          </g>
        ) : null}
        <rect x={-50} y={-110} width={100} height={260} rx={44} fill="#C9CED9" stroke={INK} strokeWidth={9} />
        <rect x={-32} y={-90} width={22} height={200} rx={11} fill="#FFFFFF" opacity={0.7} />
        <path d="M-50 120 L-80 190 L-40 160 Z M50 120 L80 190 L40 160 Z" fill="#E2384D" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <rect x={-40} y={150} width={80} height={40} rx={10} fill="#6B7689" stroke={INK} strokeWidth={7} />
      </g>
    ))}
  </g>
);

const Helmet: React.FC<{ k: number }> = ({ k }) =>
  k <= 0.01 ? null : (
    <g opacity={k} transform={`translate(0 -170) scale(${0.6 + 0.4 * k}) translate(0 170)`}>
      <circle cx={0} cy={-170} r={250} fill="#CFE8FF" opacity={0.25} stroke={INK} strokeWidth={9} />
      <path d="M-170 -300 A220 220 0 0 1 -40 -400" fill="none" stroke="#FFFFFF" strokeWidth={22} strokeLinecap="round" opacity={0.8} />
      <rect x={-170} y={50} width={340} height={50} rx={20} fill="#C9CED9" stroke={INK} strokeWidth={8} />
    </g>
  );

const House: React.FC<{ f: number }> = ({ f }) => (
  <g transform={`translate(${HOUSE[0]} ${HOUSE[1]}) rotate(${Math.sin(f / 30) * 2}) scale(1.4)`}>
    {/* solar wings */}
    {[-1, 1].map((s) => (
      <g key={s} transform={`scale(${s} 1)`}>
        <rect x={180} y={-200} width={40} height={18} fill="#B9B3CC" stroke={INK} strokeWidth={6} />
        <rect x={220} y={-280} width={260} height={170} rx={10} fill="#2D7BF0" stroke={INK} strokeWidth={9} />
        {[0, 1, 2].map((i) => <line key={i} x1={220 + (i + 1) * 65} y1={-280} x2={220 + (i + 1) * 65} y2={-110} stroke="#1C55B4" strokeWidth={6} />)}
        <line x1={220} y1={-195} x2={480} y2={-195} stroke="#1C55B4" strokeWidth={6} />
        <path d="M232 -270 L300 -270 L250 -200 Z" fill="#FFFFFF" opacity={0.3} />
      </g>
    ))}
    {/* porch */}
    <rect x={-230} y={-16} width={460} height={34} rx={10} fill="#A06343" stroke={INK} strokeWidth={8} />
    {/* house */}
    <rect x={-180} y={-330} width={360} height={316} fill="#FFFAF0" stroke={INK} strokeWidth={10} />
    <path d="M-220 -320 L0 -500 L220 -320 Z" fill="#E2384D" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
    <rect x={-50} y={-180} width={100} height={168} rx={10} fill="#A06343" stroke={INK} strokeWidth={8} />
    <circle cx={30} cy={-96} r={8} fill={C.gold} stroke={INK} strokeWidth={4} />
    <rect x={-150} y={-270} width={80} height={80} rx={8} fill={f % 40 < 30 ? '#FFE08A' : '#FFD064'} stroke={INK} strokeWidth={7} />
    <rect x={70} y={-270} width={80} height={80} rx={8} fill="#FFE08A" stroke={INK} strokeWidth={7} />
    {/* dish */}
    <g transform="translate(90 -440) rotate(-30)">
      <line x1={0} y1={0} x2={0} y2={70} stroke={INK} strokeWidth={10} />
      <path d="M-70 0 A70 40 0 0 0 70 0 Z" fill="#E9EAEE" stroke={INK} strokeWidth={8} />
      <line x1={0} y1={0} x2={0} y2={-50} stroke={INK} strokeWidth={6} />
      <circle cx={0} cy={-54} r={10} fill={f % 20 < 10 ? '#E2384D' : '#FFB3B3'} stroke={INK} strokeWidth={4} />
    </g>
    {/* doormat */}
    <rect x={-70} y={-24} width={140} height={14} rx={6} fill="#45B87A" stroke={INK} strokeWidth={4} />
  </g>
);

const Patio: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {/* fence + string lights */}
    {Array.from({ length: 16 }).map((_, i) => (
      <rect key={i} x={-300 + i * 110} y={1300} width={70} height={520} rx={12} fill="#C27C5E" stroke={INK} strokeWidth={7} />
    ))}
    <rect x={-300} y={1380} width={1800} height={30} fill="#A06343" stroke={INK} strokeWidth={7} />
    <path d="M-200 1080 Q300 1200 760 1080 Q1100 1000 1400 1100" fill="none" stroke={INK} strokeWidth={6} />
    {Array.from({ length: 14 }).map((_, i) => {
      const x = -180 + i * 110;
      const y = 1110 + Math.sin((i / 13) * Math.PI * 2) * 40;
      return <circle key={i} cx={x} cy={y + 16} r={14} fill={['#FFD064', '#EE5982', '#9DD2FF'][i % 3]} stroke={INK} strokeWidth={4} opacity={0.6 + 0.4 * Math.sin(f / 4 + i)} />;
    })}
    {/* deck */}
    <rect x={-600} y={FLOOR - 10} width={2280} height={800} fill="#C9A27E" />
    {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={-600} y={FLOOR + i * 50} width={2280} height={6} fill="#A9825E" />)}
    {/* table */}
    <rect x={120} y={1600} width={840} height={40} rx={14} fill="#A06343" stroke={INK} strokeWidth={9} />
    <rect x={180} y={1640} width={30} height={170} fill="#6E3B2A" />
    <rect x={870} y={1640} width={30} height={170} fill="#6E3B2A" />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const DRINK: Partial<Pose> = { shR: 30, elR: 128, wrR: -10, handR: 'grip', shL: 20, elL: 20, handL: 'fist', smile: 1, mouthMode: 'grin', mouthOpen: 0.6, eyes: 1, brow: 0.8 };
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...DRINK, shR: 70, elR: 60 } },
  { f: CLINK, p: { shR: 96, elR: 30, eyes: 1, mouthOpen: 1 }, e: E.snap },
  { f: CLINK + 8, p: { ...DRINK } },
  { f: 22, p: { head: -14, lookY: -0.6, eyes: 0, lid: 0.6, mouthMode: 'o', mouthOpen: 0.4 } },
  { f: WATCH - 2, p: { head: 0, lookY: 0.4, lookX: -0.5, shL: 60, elL: 110, wrL: 0, eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.5, brow: 1.2, browTilt: 1 } },
  { f: WATCH + 8, p: { lookX: 0.8, turn: 0.3, shL: 20, elL: 20, mouthMode: 'grin', mouthOpen: 0.3, smile: 0.7, brow: 0.6, browTilt: 0 } },
  { f: IGNITE, p: { shL: 30, elL: 30, shR: 30, elR: 30, handR: 'fist', lookX: 0, lookY: -0.6, turn: 0, mouthMode: 'grin', mouthOpen: 0.9, brow: 1 } },
  { f: LIFT + 6, p: { shL: 170, elL: 0, shR: 20, elR: 10, hipL: 10, knL: -30, hipR: 4, knR: -10, eyes: 1, mouthOpen: 1 }, e: E.out },
  { f: ARRIVE - 6, p: { shL: 170, elL: 0 } },
  { f: ARRIVE + 4, p: { shL: 110, elL: 20, handL: 'open', hipL: 8, knL: -6, eyes: 0, lookX: 0.4, mouthMode: 'grin', mouthOpen: 0.7, sy: 0.92, sx: 1.05 }, e: E.back },
  { f: ARRIVE + 14, p: { shL: 150, elL: -20, sy: 1, sx: 1 } },
  { f: 116, p: { shL: 120, elL: 20 } },
  { f: SAT_FRAMES, p: { shL: 150, elL: -20 } },
];

const heroY = (f: number) => (f < LIFT ? FLOOR : f < ARRIVE ? lerp(FLOOR, HOUSE[1] - 26, E.inOut(seg(f, LIFT, ARRIVE))) : HOUSE[1] - 26);
const heroX = (f: number) => (f < LIFT ? GX : f < ARRIVE ? lerp(GX, LAND_X, E.inOut(seg(f, LIFT, ARRIVE))) + Math.sin(f / 5) * 20 * (1 - seg(f, ARRIVE - 10, ARRIVE)) : LAND_X);

export const JokeSatelliteScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = plant(poseAt(f, BASE, KEYS));
  const r = rig(p);
  const gy = heroY(f);
  const gx = heroX(f);
  const head = stageOf(gx, gy, SC)(r.headTop());
  const alt = clamp((FLOOR - gy) / (FLOOR - HOUSE[1]));
  const thrust = f >= IGNITE && f < ARRIVE + 2 ? 1 : 0;
  const cam: Cam = {
    cx: lerp(540, HOUSE[0] - 120, seg(f, LIFT, ARRIVE)),
    cy: f < LIFT ? kf(f, [[0, 1220], [IGNITE, 1220], [LIFT, 1180, E.inOut]]) : kf(f, [[LIFT, 1180], [ARRIVE, HOUSE[1] - 520, E.inOut], [CARD, HOUSE[1] - 520], [CARD + 12, HOUSE[1] - 700, E.inOut]]),
    z: kf(f, [[0, 1.05], [IGNITE, 1.05], [LIFT + 10, 0.9, E.inOut], [ARRIVE - 10, 0.9], [ARRIVE, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, IGNITE, 30, 12, 3);
  const earthY = lerp(2700, 1660, E.out(seg(f, 74, ARRIVE + 6)));
  const otherMug = (side: -1 | 1) => {
    const k = side < 0 ? 1 : 1;
    const x = side < 0 ? lerp(160, 300, E.out(seg(f, 0, CLINK))) : lerp(940, 790, E.out(seg(f, 0, CLINK)));
    return { x: x * k, y: 1430 - (f > CLINK - 2 && f < CLINK + 4 ? 20 : 0) };
  };

  return (
    <Stage
      bg="#0E1238"
      overlay={<EndCard f={f} start={CARD} lines={['SATELLITE', 'HOUSE']} pts="22K" unit="MILES" sub="CONNOR HEADS HOME" color="#3D4FD6" dark="#26308C" light="#C9D0FF" y={80} />}
    >
      <GlowDefs />
      <defs>
        <linearGradient id="skyUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E1238" />
          <stop offset="0.45" stopColor="#26308C" />
          <stop offset="0.75" stopColor="#6C7BE8" />
          <stop offset="0.92" stopColor="#F2A2B8" />
          <stop offset="1" stopColor="#FFC98E" />
        </linearGradient>
      </defs>
      {/* sky to space (world) */}
      <g transform={camP(cam, 1, sh)}>
        <rect x={-1400} y={-2800} width={3880} height={4400} fill="url(#skyUp)" />
      </g>
      <g opacity={seg(alt, 0.35, 0.7)}>
        <Stars f={f} n={72} seed={5} area={[0, TOP, W, FULL_H]} />
      </g>
      {/* Earth rises into view from below once he's up there (screen space) */}
      <g opacity={seg(f, 70, 80)}>
        <circle cx={540} cy={earthY + 2400} r={2400} fill="#2D7BF0" stroke={INK} strokeWidth={12} />
        <path d={`M-200 ${earthY + 140} Q200 ${earthY + 40} 500 ${earthY + 120} Q800 ${earthY + 200} 1300 ${earthY + 60} L1300 ${earthY + 900} L-200 ${earthY + 900} Z`} fill="#45B87A" opacity={0.8} />
        <circle cx={540} cy={earthY + 2400} r={2440} fill="none" stroke="#9DD2FF" strokeWidth={40} opacity={0.4} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Cloud x={160} y={600} w={360} h={120} seed={3} />
        <Cloud x={900} y={240} w={420} h={140} seed={6} />
        <Cloud x={300} y={-260} w={380} h={130} seed={9} opacity={0.9} />
        <Cloud x={980} y={-640} w={300} h={110} seed={12} opacity={0.7} />
        <Patio f={f} />
        {/* the boys' mugs + his */}
        {f < LIFT + 20 ? (
          <g>
            <g transform={`translate(${otherMug(-1).x} ${otherMug(-1).y}) rotate(10)`}><Mug s={0.6} seed={3} f={f} /></g>
            <g transform={`translate(${otherMug(1).x} ${otherMug(1).y}) rotate(-10)`}><Mug s={0.6} flip seed={4} f={f} /></g>
          </g>
        ) : null}
        {/* orbit line + house */}
        <ellipse cx={HOUSE[0] - 100} cy={HOUSE[1] + 600} rx={1100} ry={300} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeDasharray="20 22" opacity={0.35 * seg(alt, 0.6, 0.9)} />
        <House f={f} />
        <Hero
          p={p}
          x={gx}
          y={gy}
          scale={SC}
          shadow={f < LIFT}
          behind={f >= WATCH + 6 ? <Jetpack on={thrust} f={f} /> : undefined}
          headExtra={<Helmet k={seg(f, WATCH + 6, WATCH + 12)} />}
          itemR={f < IGNITE ? <g transform="translate(0 30) rotate(-90)"><Mug s={0.5} seed={9} f={f} /></g> : undefined}
        />
        <Sparks f={f} start={CLINK} seed={2} n={14} x={540} y={1330} speed={[10, 22]} g={0.8} size={[10, 18]} colors={['#FFFFFF', '#FFE1AD']} shape="foam" />
        {/* distance sign at home */}
        <g transform={`translate(${HOUSE[0] + 230} ${HOUSE[1] + 150}) rotate(6)`} opacity={seg(f, ARRIVE - 4, ARRIVE + 4)}>
          <rect x={-150} y={-60} width={300} height={120} rx={18} fill="#FFFDF6" stroke={INK} strokeWidth={8} />
          <text x={0} y={-12} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill={INK}>HOME</text>
          <text x={0} y={34} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={34} fill="#26308C">22,236 MI</text>
        </g>
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={290} y={1250} text="gotta head home" t={f - WATCH} size={46} me color={BLUE} side={-1} />
          <Bubble x={HOUSE[0] + 120} y={HOUSE[1] - 860} text="made it. see u guys" t={f - ARRIVE - 6} size={44} me color={BLUE} side={-1} />
        </g>
        <NameTag x={head[0]} y={head[1] - 60} name="CONNOR" color={BLUE} t={f - 4} out={seg(f, CARD - 8, CARD)} />
      </g>
      <Sfx f={f} start={CLINK} text="CHEERS!" x={540} y={760} size={150} rot={-6} fill="#FFD064" dur={16} />
      <Sfx f={f} start={IGNITE} text="WHOOSH" x={760} y={1300} size={160} rot={-8} fill="#FFFFFF" dur={20} />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={41} colors={['#3D4FD6', '#C9D0FF', '#FFFFFF', '#FFD064', '#9DD2FF']} />
    </Stage>
  );
};
