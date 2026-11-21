// Inside joke: "THE LIQUOR RUN" - everyone's in a time crunch. Gaurav takes an hour to pick a bottle.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, springAt } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE, Bubble, WallClock } from './jokekit';
import { TITLE_FONT } from '../fonts';
import { rng } from '../lib/shape';

export const LIQUOR_FRAMES = 165;
const GX = 430;
const GY = 1800;
const SC = 0.82;
const toStage = stageOf(GX, GY, SC);
const PICK1 = 14;
const BACK1 = 38;
const PICK2 = 48;
const LATER = 64;
const FOUND = 96;
const CARD = 120;
const [PURPLE, PURPLE_D] = PEOPLE.gaurav;

/* ------------------------------- props ------------------------------- */
const BOTTLES = ['#45B87A', '#7254DC', '#E2384D', '#F5B23E', '#5C7CF0', '#A06343', '#EE5982', '#2FA36B', '#FFD064'];
export const Bottle: React.FC<{ c: string; s?: number; kind?: number }> = ({ c, s = 1, kind = 0 }) => {
  const tall = kind % 3 === 0;
  const round = kind % 3 === 1;
  const body = tall ? 'M-34 0 L-34 -150 Q-34 -180 -14 -196 L-14 -250 L14 -250 L14 -196 Q34 -180 34 -150 L34 0 Z'
    : round ? 'M-46 0 Q-56 -60 -40 -110 Q-24 -140 -12 -150 L-12 -210 L12 -210 L12 -150 Q24 -140 40 -110 Q56 -60 46 0 Z'
      : 'M-40 0 L-40 -120 L-12 -150 L-12 -200 L12 -200 L12 -150 L40 -120 L40 0 Z';
  return (
    <g transform={`scale(${s})`}>
      <path d={body} fill={c} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <rect x={-26} y={tall ? -110 : -84} width={52} height={50} rx={8} fill="#FFFDF6" stroke={INK} strokeWidth={4} />
      <path d={tall ? 'M-14 -250 L14 -250 L14 -232 L-14 -232 Z' : round ? 'M-12 -210 L12 -210 L12 -194 L-12 -194 Z' : 'M-12 -200 L12 -200 L12 -186 L-12 -186 Z'} fill={INK} />
      <rect x={-24} y={-150} width={10} height={130} rx={5} fill="#FFFFFF" opacity={0.45} />
    </g>
  );
};

const Shelves: React.FC = () => {
  const r = rng(5);
  return (
    <g>
      {[620, 940, 1260].map((y, row) => (
        <g key={row}>
          {Array.from({ length: 13 }).map((_, i) => (
            <g key={i} transform={`translate(${-160 + i * 110 + (row % 2) * 40} ${y})`}>
              <Bottle c={BOTTLES[Math.floor(r() * BOTTLES.length)]} s={0.85 + r() * 0.2} kind={Math.floor(r() * 3)} />
            </g>
          ))}
          <rect x={-300} y={y} width={1700} height={34} rx={8} fill="#A06343" stroke={INK} strokeWidth={8} />
          <rect x={-300} y={y + 30} width={1700} height={16} fill="#000" opacity={0.15} />
        </g>
      ))}
    </g>
  );
};

const Basket: React.FC = () => (
  <g transform="translate(0 30)">
    <path d="M-80 70 Q0 -60 80 70" fill="none" stroke={INK} strokeWidth={16} />
    <path d="M-80 70 Q0 -60 80 70" fill="none" stroke="#E2384D" strokeWidth={8} />
    <path d="M-130 70 L130 70 L104 220 L-104 220 Z" fill="#E2384D" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {[-70, -20, 30, 80].map((x) => (
      <line key={x} x1={x * 0.9} y1={86} x2={x * 0.75} y2={206} stroke="#B3172C" strokeWidth={8} />
    ))}
    <line x1={-118} y1={130} x2={118} y2={130} stroke="#B3172C" strokeWidth={8} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const STROLL: Partial<Pose> = {
  shL: 16, elL: 8, handL: 'grip', shR: 18, elR: 20, handR: 'relax', hipL: 8, hipR: 8, knL: -6, knR: -6,
  lookX: -0.4, lookY: -0.5, turn: -0.2, eyes: 1, smile: 1, mouthMode: 'o', mouthOpen: 0.12, brow: 0.5, head: -4,
};
const INSPECT: Partial<Pose> = {
  shR: 120, elR: 78, wrR: 0, handR: 'grip', lookX: 0.6, lookY: -0.9, turn: 0.2, eyes: 0, lid: 0.4, smile: 0.4, mouthMode: 'o', mouthOpen: 0.25,
  brow: 0.8, browTilt: 0.6, head: -8,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...STROLL } },
  { f: PICK1, p: { ...INSPECT }, e: E.out },
  { f: 26, p: { head: 6, lookX: 0.9, mouthSkew: 0.6 } },
  { f: BACK1, p: { ...STROLL, lookX: 0.3, shR: 40, elR: 30, handR: 'open', mouthMode: 'grin', mouthOpen: 0.2, smile: 0.4 } },
  { f: PICK2, p: { ...INSPECT, lookX: 0.4, turn: 0.15, lid: 0.25 }, e: E.out },
  { f: LATER, p: { head: 10, lookX: 0.8 } },
  { f: 80, p: { head: -6, lookX: 0.2, lookY: -1, lid: 0.5, mouthOpen: 0.1 } },
  { f: FOUND, p: { shR: 156, elR: -6, wrR: 0, eyes: 0, lid: 0, eyeMode: 'star', mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1, browTilt: 0, lookX: 0, lookY: -0.6, turn: 0, head: 0, sy: 1.05, sx: 0.97 }, e: E.back },
  { f: 108, p: { eyeMode: 'normal', eyes: 1, sy: 1, sx: 1 } },
  { f: LIQUOR_FRAMES, p: {} },
];
const solve = (f: number): Pose => plant(poseAt(f, BASE, KEYS), f >= FOUND && f < FOUND + 10 ? Math.sin(((f - FOUND) / 10) * Math.PI) * 60 : 0);

export const JokeLiquorScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const hand = toStage(r.handR());
  const holding = (f >= PICK1 - 2 && f < BACK1 - 2) || f >= PICK2 - 2;
  const bottleC = f < BACK1 ? '#45B87A' : f < FOUND - 4 ? '#7254DC' : '#F5B23E';
  const minutes = 9 * 60 + kf(f, [[0, 0], [LATER - 2, 26, E.in], [LATER + 10, 52, E.inOut], [CARD, 61]]);
  const late = seg(f, LATER + 10, LATER + 16);
  const cam: Cam = {
    cx: kf(f, [[0, 520], [FOUND - 6, 520], [FOUND, 520, E.out], [CARD, 520], [CARD + 12, 500, E.inOut]]),
    cy: kf(f, [[0, 1100], [FOUND - 6, 1100], [FOUND, 1040, E.out], [CARD, 1080], [CARD + 12, 960, E.inOut]]),
    z: kf(f, [[0, 1.05], [FOUND - 6, 1.05], [FOUND, 1.15, E.out], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const msgs: [number, string][] = [
    [10, 'where r u'],
    [24, 'we leave in 5'],
    [38, 'GAURAV'],
    [54, "it's been an HOUR"],
    [76, 'TIME CRUNCH BRO'],
    [90, '??????'],
  ];
  const shown = msgs.filter(([t]) => f >= t);
  const laterK = clamp(springAt(f - LATER, 0, 10, 1.3, 5), 0, 1.2) * (1 - seg(f, LATER + 22, LATER + 28));

  return (
    <Stage
      bg="#2B1F3D"
      overlay={<EndCard f={f} start={CARD} lines={['THE LIQUOR RUN']} pts="1" unit="HOUR" sub="GAURAV IS IN LAST" color={PURPLE} dark={PURPLE_D} light="#F0D4FA" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.75)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#3B2B55" />
        <rect x={-600} y={360} width={2280} height={1300} fill="#4B3B6E" />
        <Shelves />
        {/* neon sign */}
        <g transform="translate(300 240)">
          <rect x={-230} y={-70} width={460} height={140} rx={30} fill="#2B1F3D" stroke={INK} strokeWidth={10} />
          <Glow x={0} y={0} r={300} id="glowP" o={0.55 + 0.2 * Math.sin(f / 3)} />
          <text x={0} y={10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={96} fill="#FFD3E2" stroke="#EE5982" strokeWidth={4}>LIQUOR</text>
        </g>
        <WallClock x={830} y={250} m={minutes} late={late} tag="LATE" r={110} wob={late * Math.sin(f) * 4} />
        {/* checker floor */}
        <rect x={-600} y={1660} width={2280} height={1200} fill="#E9E3F5" />
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x={-600 + i * 180} y={1660 + (i % 2) * 90} width={90} height={90} fill="#C9C0DE" />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={'b' + i} x={-510 + i * 180} y={1660 + ((i + 1) % 2) * 90} width={90} height={90} fill="#C9C0DE" />
        ))}
      </g>
      <g transform={camP(cam, 1)}>
        <ellipse cx={GX} cy={GY + 4} rx={220} ry={24} fill="#000" opacity={0.2} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          shadow={false}
          itemL={<Basket />}
          itemR={holding ? <g transform="translate(0 190) rotate(180)"><Bottle c={bottleC} s={1.35} kind={f < BACK1 ? 0 : 1} /></g> : undefined}
        />
        {[0, 1, 2].map((i) => (
          <Twinkle key={i} x={hand[0] + [-80, 90, 10][i]} y={hand[1] + [-140, -60, -220][i]} s={1.3} t={seg(f, FOUND + i * 3, FOUND + 14 + i * 3)} />
        ))}
        <Sparks f={f} start={FOUND} seed={8} n={18} x={hand[0]} y={hand[1] - 100} speed={[12, 26]} g={0.5} size={[12, 20]} colors={['#FFFFFF', '#FFF0B7', '#F0D4FA']} shape="star" />
        {/* humming */}
        {[4, 30, 56, 70].map((n, i) => {
          const t = f - n;
          if (t < 0 || t > 14) return null;
          const m = toStage(r.mouth());
          return (
            <text key={i} x={m[0] + 70 + t * 4} y={m[1] - 40 - t * 6} fontFamily={TITLE_FONT} fontSize={66} fill="#F0D4FA" stroke={INK} strokeWidth={4} opacity={1 - seg(t, 9, 14)}>♪</text>
          );
        })}
        <NameTag x={head[0]} y={head[1] - 60} name="GAURAV" color={PURPLE} t={f - 4} out={seg(f, CARD - 8, CARD)} />
      </g>
      {/* the group chat (screen space) */}
      <g opacity={1 - seg(f, CARD - 6, CARD)}>
        {shown.slice(-3).map(([t, text], i, arr) => (
          <Bubble key={t} x={1046 - (44 + text.length * 19) / 2} y={1240 + (i - arr.length + 1) * 84} text={text} t={f - t} />
        ))}
      </g>
      {laterK > 0.01 ? (
        <g transform={`translate(540 760) rotate(-4) scale(${laterK})`}>
          <rect x={-420} y={-90} width={840} height={180} rx={30} fill={INK} transform="translate(0 14)" />
          <rect x={-420} y={-90} width={840} height={180} rx={30} fill="#FFD064" stroke={INK} strokeWidth={10} />
          <text x={0} y={10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={104} fill={INK}>1 HOUR LATER</text>
        </g>
      ) : null}
      <Sfx f={f} start={30} text="hmm..." x={250} y={860} size={90} rot={-6} fill="#FFFFFF" dur={16} shake={false} />
      <Sfx f={f} start={FOUND + 2} text="FOUND IT!" x={540} y={520} size={150} rot={-6} fill="#FFD064" dur={22} />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={23} colors={[PURPLE, '#F0D4FA', '#FFFFFF', '#FFD064', '#45B87A']} />
    </Stage>
  );
};
