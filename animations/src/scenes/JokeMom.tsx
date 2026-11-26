// Inside joke: "JAKE'S MOM" - Sunday night, Jake's gaming with points still missing. The door flies open. JAAAKE!
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { LOOKS } from '../hero/looks';
import { poseAt, E, kf, shake, seg, Key, clamp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Dust, Streaks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { gait, runLift } from './RunKit';
import { NameTag, PEOPLE, Bubble, Room, WallClock, Calendar } from './jokekit';

export const MOM_FRAMES = 165;
const GX = 640;
const GY = 1800;
const SC = 0.8;
const toStage = stageOf(GX, GY, SC);
const DOOR = 28;
const YELL = 31;
const RUN = 96;
const CARD = 120;
const [ORANGE] = PEOPLE.jake;

/* ------------------------------- props ------------------------------- */
const Controller: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`translate(-60 50) rotate(130) scale(${s})`}>
    <path d="M-110 -40 C-150 -40 -170 0 -160 40 C-150 80 -110 90 -90 60 L-60 30 L60 30 L90 60 C110 90 150 80 160 40 C170 0 150 -40 110 -40 Z" fill="#2B2340" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-100 -10 h30 M-85 -25 v30" stroke="#BCABFF" strokeWidth={10} strokeLinecap="round" />
    {[[80, -20, '#EE5982'], [100, 0, '#FFD064'], [60, 0, '#45B87A'], [80, 20, '#5C7CF0']].map(([x, y, c], i) => (
      <circle key={i} cx={x as number} cy={y as number} r={9} fill={c as string} stroke={INK} strokeWidth={3} />
    ))}
  </g>
);

const TV: React.FC<{ f: number; on: number }> = ({ f, on }) => (
  <g>
    <rect x={820} y={1420} width={300} height={240} rx={12} fill="#A06343" stroke={INK} strokeWidth={9} />
    <rect x={760} y={1080} width={420} height={300} rx={22} fill="#2B2340" stroke={INK} strokeWidth={10} />
    <rect x={782} y={1102} width={376} height={256} rx={12} fill={on > 0.5 ? '#5C7CF0' : '#1B1730'} />
    {on > 0.5 ? (
      <g>
        <rect x={782} y={1290} width={376} height={68} fill="#45B87A" />
        <rect x={820 + ((f * 9) % 300)} y={1230} width={46} height={60} rx={8} fill="#FFD064" stroke={INK} strokeWidth={5} />
        <circle cx={1100 - ((f * 6) % 280)} cy={1180} r={18} fill="#EE5982" stroke={INK} strokeWidth={5} />
        <text x={800} y={1140} fontFamily="Bangers" fontSize={34} fill="#FFFFFF">LVL 99</text>
      </g>
    ) : null}
    <rect x={940} y={1380} width={60} height={40} fill="#2B2340" stroke={INK} strokeWidth={8} />
  </g>
);

const Door: React.FC<{ open: number; f: number }> = ({ open, f }) => (
  <g>
    {/* frame */}
    <rect x={40} y={900} width={330} height={760} fill="#FFF7E2" />
    <rect x={40} y={900} width={330} height={760} fill="url(#glowY)" opacity={open} />
    {/* mom, backlit */}
    {open > 0.05 ? (
      <g opacity={clamp(open * 1.5)} transform={`translate(205 1660) scale(${0.96 + Math.sin(f * 1.3) * 0.01})`}>
        <path d="M-120 0 C-130 -180 -120 -360 -90 -430 C-70 -470 70 -470 90 -430 C120 -360 130 -180 120 0 Z" fill="#4B3B6E" />
        {/* pointing arm */}
        <path d="M70 -420 C150 -440 230 -470 300 -470" fill="none" stroke="#4B3B6E" strokeWidth={56} strokeLinecap="round" />
        <circle cx={316} cy={-472} r={26} fill="#4B3B6E" />
        <path d="M320 -480 L372 -486" stroke="#4B3B6E" strokeWidth={18} strokeLinecap="round" />
        {/* hand on hip */}
        <path d="M-80 -420 C-150 -360 -150 -300 -96 -280" fill="none" stroke="#4B3B6E" strokeWidth={50} strokeLinecap="round" />
        {/* head + curlers */}
        <circle cx={0} cy={-540} r={86} fill="#4B3B6E" />
        {[-70, -24, 24, 70].map((x, i) => (
          <g key={i} transform={`translate(${x} ${-614 + Math.abs(x) * 0.5})`}>
            <rect x={-24} y={-20} width={48} height={40} rx={18} fill="#EE5982" stroke={INK} strokeWidth={6} />
            <line x1={-12} y1={-20} x2={-12} y2={20} stroke={INK} strokeWidth={4} />
            <line x1={12} y1={-20} x2={12} y2={20} stroke={INK} strokeWidth={4} />
          </g>
        ))}
        {/* angry eyes */}
        <path d="M-50 -560 L-14 -544 M50 -560 L14 -544" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
        <path d="M-46 -530 L-20 -530 M46 -530 L20 -530" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" />
      </g>
    ) : null}
    {/* door leaf, swinging open toward us */}
    <g transform={`translate(40 900) scale(${1 - open * 0.86} 1)`}>
      <rect x={0} y={0} width={330} height={760} fill="#C27C5E" stroke={INK} strokeWidth={10} />
      <rect x={40} y={50} width={250} height={280} rx={10} fill="none" stroke="#A06343" strokeWidth={10} />
      <rect x={40} y={400} width={250} height={300} rx={10} fill="none" stroke="#A06343" strokeWidth={10} />
      <circle cx={290} cy={400} r={20} fill={C.gold} stroke={INK} strokeWidth={6} />
    </g>
    <rect x={40} y={900} width={330} height={760} fill="none" stroke={INK} strokeWidth={12} />
    <rect x={20} y={880} width={370} height={30} rx={8} fill="#FFFDF8" stroke={INK} strokeWidth={9} />
  </g>
);

const GymBag: React.FC = () => (
  <g transform="translate(0 70)">
    <path d="M-40 0 Q0 -70 40 0" fill="none" stroke={INK} strokeWidth={14} />
    <rect x={-110} y={0} width={220} height={110} rx={40} fill="#E2384D" stroke={INK} strokeWidth={8} />
    <rect x={-80} y={46} width={160} height={14} rx={7} fill="#FFFFFF" opacity={0.6} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const GAME: Partial<Pose> = {
  shL: 22, elL: 108, wrL: 0, shR: 24, elR: 110, wrR: 0, handL: 'grip', handR: 'grip',
  hipL: 12, hipR: 12, knL: -14, knR: -14, torso: 4, head: 8, torsoSy: 0.95,
  lookX: 1, lookY: 0.3, turn: 0.4, mouthMode: 'grin', mouthOpen: 0.5, smile: 1, mouthSkew: 0.6, lid: 0.3, brow: 0.6, browTilt: -0.4,
};
const SHOCK: Partial<Pose> = {
  shL: 150, elL: -20, shR: 150, elR: -20, handL: 'open', handR: 'open', torso: 0, head: -4, torsoSy: 1.02,
  hipL: 8, hipR: 8, knL: -4, knR: -4, lookX: -1, lookY: -0.2, turn: -0.4, eyeMode: 'normal', pupil: 0.4,
  mouthMode: 'o', mouthOpen: 1, smile: 0, mouthSkew: 0, lid: 0, brow: 1.6, browTilt: 1, sweat: 1, sy: 1.08, sx: 0.95,
};
const SCOLD: Partial<Pose> = {
  ...SHOCK, shL: 10, elL: 6, shR: 10, elR: 6, handL: 'open', handR: 'open', sy: 1, sx: 1, mouthOpen: 0.35, pupil: 0.7, brow: 1.1, browTilt: 1.2, head: 6,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...GAME } },
  { f: 12, p: { mouthSkew: -0.4, torso: -3 } },
  { f: 24, p: { mouthSkew: 0.6, torso: 5 } },
  { f: DOOR, p: { ...GAME } },
  { f: YELL + 3, p: { ...SHOCK }, e: E.back },
  { f: 50, p: { ...SCOLD }, e: E.inOut },
  { f: 60, p: { head: 12 } },
  { f: 68, p: { head: 0 } },
  { f: 76, p: { head: 12 } },
  { f: 84, p: { head: 0, lookX: 0.8, turn: 0.4, mouthMode: 'grit', mouthOpen: 0.4 } },
  { f: RUN, p: {} },
  { f: MOM_FRAMES, p: {} },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  if (f >= RUN - 4) {
    const k = seg(f, RUN - 4, RUN + 2);
    const g = gait((f - RUN) * 0.62, 1);
    const q: Pose = { ...p, ...g, handL: 'fist', handR: 'grip', lookX: 1, turn: 0.4, mouthMode: 'grit', mouthOpen: 0.6, browTilt: -0.8, sweat: 1, pupil: 1 };
    const out: Record<string, unknown> = { ...q };
    for (const key of Object.keys(q)) {
      const a = (p as Record<string, unknown>)[key];
      const b = (q as Record<string, unknown>)[key];
      if (typeof a === 'number' && typeof b === 'number') out[key] = a + (b - a) * k;
    }
    p = out as Pose;
    return plant(p, runLift((f - RUN) * 0.62) * k);
  }
  const jump = f >= YELL && f < YELL + 16 ? Math.sin(((f - YELL) / 16) * Math.PI) * 150 : 0;
  return plant(p, jump);
};

export const JokeMomScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const runX = f >= RUN ? (f - RUN) ** 1.35 * 9 : 0;
  const gx = GX + runX;
  const head = stageOf(gx, GY, SC)(r.headTop());
  const open = E.out(seg(f, DOOR, DOOR + 5));
  const cam: Cam = {
    cx: kf(f, [[0, 640], [DOOR, 640], [YELL + 2, 480, E.out], [60, 520], [RUN, 560], [CARD, 540], [CARD + 12, 500, E.inOut]]),
    cy: kf(f, [[0, 1180], [DOOR, 1180], [YELL + 2, 1120, E.out], [RUN, 1120], [CARD, 1120], [CARD + 12, 1000, E.inOut]]),
    z: kf(f, [[0, 1.15], [DOOR, 1.15], [YELL + 2, 0.98, E.out], [RUN, 1.0], [CARD, 1.0], [CARD + 12, 0.92, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, YELL, 26, 26, 3);
  const minutes = 18 * 60 + kf(f, [[0, 0], [MOM_FRAMES, 4]]);

  return (
    <Stage
      bg="#F6E7D8"
      overlay={<EndCard f={f} start={CARD} lines={["JAKE'S MOM"]} pts="SUN" unit="6PM" sub="JAKE'S STILL UNDER 7" color="#EE5982" dark="#A83560" light="#FFD3E2" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.75, { x: sh.x * 0.5, y: sh.y * 0.5, r: 0 })}>
        <Room wall="#FBE9D7" stripe="#F6DCC4" floor="#C9A27E" floorLine="#A9825E" floorY={1660} />
        <WallClock x={560} y={560} m={minutes} r={110} />
        <Calendar x={800} y={540} top="SUN" big="6PM" color="#EE5982" rot={5} bigSize={70} />
        {/* rug */}
        <ellipse cx={640} cy={1760} rx={420} ry={60} fill="#E7B9A2" stroke={INK} strokeWidth={8} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Door open={open} f={f} />
        <TV f={f} on={f < YELL ? 1 : 0} />
        <ellipse cx={gx} cy={GY + 4} rx={220} ry={24} fill="#000" opacity={0.14} />
        <Hero look={LOOKS.jake} p={p} x={gx} y={GY} scale={SC} shadow={false} itemR={f < YELL + 2 ? <Controller /> : f >= RUN - 4 ? <GymBag /> : undefined} />
        {/* controller flies away when he jumps */}
        {f >= YELL + 2 && f < YELL + 30 ? (
          <g transform={`translate(${gx + (f - YELL) * 16} ${1200 - (f - YELL) * 26 + (f - YELL) ** 2 * 1.4}) rotate(${(f - YELL) * 30})`}>
            <Controller s={0.9} />
          </g>
        ) : null}
        {f >= RUN ? (
          <g>
            <Streaks f={f} x0={gx - 700} y0={1100} w={500} h={600} angle={0} n={12} color="#FFFFFF" speed={40} len={200} opacity={0.6} thick={14} />
            <Dust f={f} start={RUN + 2} x={gx - 60} y={GY - 20} n={6} seed={5} spread={200} size={60} color="#F3E6D6" line="#C9A27E" dir={-6} />
          </g>
        ) : null}
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={300} y={640} text="4.5 POINTS?!" t={f - 44} size={56} me color="#4B3B6E" side={-1} />
          <Bubble x={320} y={750} text="ON A SUNDAY?!" t={f - 58} size={56} me color="#4B3B6E" side={-1} />
          <Bubble x={280} y={866} text="GYM. NOW." t={f - 74} size={64} me color="#E2384D" side={-1} />
        </g>
        <NameTag x={head[0]} y={head[1] - 60} name="JAKE" color={ORANGE} t={f - 4} out={seg(f, RUN + 6, RUN + 14)} />
      </g>
      <Sfx f={f} start={DOOR} text="BANG!" x={260} y={720} size={130} rot={-10} fill="#FFFFFF" dur={12} />
      <Sfx f={f} start={YELL} text="JAAAAKE!!!" x={540} y={420} size={190} rot={-5} fill="#FF8AB0" dur={40} />
      <Sfx f={f} start={RUN + 4} text="ZOOM" x={760} y={1400} size={120} rot={-8} fill="#FFD064" dur={18} />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={17} colors={['#EE5982', '#FFD3E2', '#FFFFFF', '#E39A2E', '#4B3B6E']} />
    </Stage>
  );
};
