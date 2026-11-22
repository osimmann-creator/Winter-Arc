// Bike #3: "SPRINT FINISH" - the town finish straight, barriers and a roaring crowd, bunting
// overhead. He's out of the saddle in an all-out sprint, throws the bike at the line under the
// FINISH arch - flash, photo - then sits up, arms up, salutes the crowd and points at you.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam, TOP, FULL_H } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun } from './RunKit';
import { INK } from './kit';
import {
  RoadWorld, RoadObj, Bicycle, InHeroSpace, Helmet, RIDE, pedalLegs, gripBars, solesOf, P, ZH, HY, BIKE_C, BIKE_D, archObj, checkerLine,
} from './BikeKit';

const GX = 540;
const SC = 0.8;
const THROW = 35;
const LINE = 40;
const ARMS = 46;
const SALUTE = 70;
const POINT = 84;
const CARD = 98;
const RUN = makeRun(
  [[0, 0.2], [LINE, 0.22], [LINE + 14, 0.1, E.out], [140, 0.07]],
  [[0, 9], [LINE - 4, 8], [LINE + 6, 30, E.out]],
  [LINE + 2, LINE + 8],
);
const LINE_S = ZH - RUN.distAt(LINE);
const standAt = (f: number) => 1 - seg(f, LINE - 1, LINE + 5);

const SPRINT: Partial<Pose> = {
  ...RIDE, torsoSy: 0.8, mouthMode: 'grit', mouthOpen: 0.5, smile: 0.3, lid: 0.3, brow: -0.5, browTilt: -1.2, sweat: 1, red: 0.25, lookY: -0.2,
};
const YELL: Partial<Pose> = {
  ...RIDE, shL: 150, elL: -14, shR: 150, elR: -14, uaL: 1, uaR: 1, faL: 1, faR: 1, handL: 'fist', handR: 'fist', flexL: 1.5, flexR: 1.5,
  torsoSy: 0.98, chestS: 1.12, mouthMode: 'grin', mouthOpen: 1, smile: 1, lid: 0, brow: 1, browTilt: 0, eyeMode: 'star', sweat: 0.3, red: 0,
};
const SALUTING: Partial<Pose> = {
  ...YELL, eyeMode: 'normal', shR: 118, elR: 138, wrR: -20, handR: 'open', shL: 40, elL: 30, handL: 'fist', mouthOpen: 0.4, mouthSkew: 0.5, lid: 0.2, brow: 0.5,
  turn: -0.2, lookX: -0.5,
};
const POINTY: Partial<Pose> = {
  ...YELL, eyeMode: 'normal', shR: 54, elR: -18, uaR: 0.55, faR: 0.5, wrR: -10, handR: 'point', shL: 54, elL: -18, uaL: 0.55, faL: 0.5, wrL: -10, handL: 'point',
  wink: 1, mouthSkew: 0.6, mouthOpen: 0.5, turn: 0.1, lookX: 0.1, chestS: 1.08,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: SPRINT },
  { f: THROW - 2, p: SPRINT },
  { f: THROW + 3, p: { ...SPRINT, torsoSy: 0.7, mouthOpen: 0.9, lid: 0.5 }, e: E.out },
  { f: LINE + 1, p: { ...SPRINT, torsoSy: 0.76, mouthMode: 'o', mouthOpen: 0.7, lid: 0, brow: 0.8, browTilt: 0.2 } },
  { f: ARMS + 2, p: YELL, e: E.back },
  { f: SALUTE - 4, p: { ...YELL, eyeMode: 'normal' } },
  { f: SALUTE + 2, p: SALUTING, e: E.back },
  { f: POINT - 4, p: SALUTING },
  { f: POINT + 1, p: POINTY, e: E.back },
  { f: 140, p: POINTY },
];

const leanAt = (f: number) => 11 * Math.sin(RUN.phAt(f)) * standAt(f);

const solve = (f: number): Pose => {
  const th = RUN.phAt(f);
  const stand = standAt(f);
  const lean = leanAt(f);
  const base = poseAt(f, BASE, KEYS);
  const legs = pedalLegs(th, stand);
  let p: Pose = {
    ...base,
    ...legs,
    x: 378 * Math.sin((lean * Math.PI) / 180) * 0.3,
    rot: -lean * 0.3,
    head: base.head - lean * 0.4,
    y: (legs.y ?? 0) + Math.sin(th * 2) * 5 * stand,
  } as Pose;
  const grip = kf(f, [[ARMS - 4, 1], [ARMS, 0, E.in]]);
  const fore = lerp(1, 0.62, grip);
  p = { ...p, uaL: lerp(p.uaL, fore, grip), faL: lerp(p.faL, fore, grip), uaR: lerp(p.uaR, fore, grip), faR: lerp(p.faR, fore, grip) };
  p = gripBars(p, lean, grip);
  if (grip > 0.5) p = { ...p, handL: 'grip', handR: 'grip' };
  return p;
};

/** Bunting strung across the road at depth S. */
const bunting = (S: number, i: number): RoadObj => ({
  X: 0, S, key: `bunt${S}`,
  draw: (x, y, s) => {
    const cols = ['#F15F75', '#FFD064', BIKE_C, '#45B87A', '#7254DC', '#FFFFFF'];
    const w = 1900;
    const top = -1350;
    const sag = 140;
    const flags: React.ReactNode[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const fx = -w / 2 + t * w;
      const fy = top + 4 * sag * t * (1 - t);
      flags.push(<path key={k} d={`M${fx - 44} ${fy} L${fx + 44} ${fy} L${fx} ${fy + 100} Z`} fill={cols[(k + i) % cols.length]} stroke={INK} strokeWidth={7} strokeLinejoin="round" />);
    }
    return (
      <g key={`bunt${S}`} transform={`translate(${x} ${y}) scale(${s})`}>
        <path d={`M${-w / 2} ${top} Q0 ${top + 2 * sag} ${w / 2} ${top}`} fill="none" stroke={INK} strokeWidth={8} />
        {flags}
      </g>
    );
  },
});

export const BikeSprintScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const lean = leanAt(f);
  const lunge = kf(f, [[THROW, 0], [LINE - 1, 1, E.out], [LINE + 8, 0, E.inOut]]);
  const sc = SC * (1 + 0.12 * lunge);
  const GY = P(0, ZH).y + 60 * lunge;
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * sc, GY + pt[1] * sc];
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const hands = [toStage(r.handL()), toStage(r.handR())];
  const sprint = seg(f, 4, 12) * (1 - seg(f, LINE + 2, LINE + 10));
  const cam: Cam = {
    cx: kf(f, [[0, 560], [LINE, 540, E.inOut], [SALUTE, 520, E.inOut], [POINT, 540, E.inOut]]),
    cy: kf(f, [[0, 1080], [THROW, 1100, E.inOut], [LINE + 4, 1000, E.out], [ARMS + 6, 1020, E.inOut], [CARD + 10, 960, E.inOut]]),
    z: kf(f, [[0, 1.04], [THROW, 1.12, E.inOut], [LINE + 4, 0.94, E.out], [ARMS + 6, 1.02, E.inOut], [POINT, 1.1, E.inOut], [CARD + 10, 0.98, E.inOut]]),
    r: kf(f, [[0, 1.5], [LINE, -1], [LINE + 12, 0, E.inOut]]),
  };
  const s1 = shake(f, LINE, 14, 18, 1);
  const shk = Math.sin(f * 2.3) * 2.5 * sprint;
  const sh = { x: s1.x + shk, y: s1.y + Math.cos(f * 1.9) * 2.5 * sprint, r: s1.r };
  const extra: RoadObj[] = [
    archObj(LINE_S, 'FINISH', '#2B2840', 'WINTER ARC GP', true),
    bunting(LINE_S - 3.4, 0),
    bunting(LINE_S + 3.2, 2),
    bunting(LINE_S + 7.8, 4),
    bunting(LINE_S - 7.6, 1),
  ];
  const bike = (
    <InHeroSpace p={p}>
      <Bicycle lean={lean} soles={solesOf(p)} f={f} speed={RUN.speedAt(f) * 3} />
    </InHeroSpace>
  );
  const flash = kf(f, [[LINE - 1, 0], [LINE, 1], [LINE + 6, 0, E.out]]);

  return (
    <Stage overlay={<EndCard f={f} start={CARD} lines={['SPRINT FINISH']} pts="+1.5" color={BIKE_C} dark={BIKE_D} y={96} />}>
      <GlowDefs />
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="town" seed={12} extra={extra} marks={checkerLine(LINE_S + D)} blur={sprint * 0.5} />
      <g transform={camP(cam, 1, sh)}>
        {sprint > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={600} r1={1900} n={40} opacity={0.35 * sprint} width={6} /> : null}
        <ellipse cx={GX + p.x * sc * 0.3} cy={GY + 4} rx={140 * sc} ry={20 * sc} fill="#000" opacity={0.25} />
        <Glow x={chest[0]} y={chest[1]} r={kf(f, [[ARMS - 1, 0], [ARMS + 3, 600, E.out], [ARMS + 22, 380]])} id="glowY" o={seg(f, ARMS - 1, ARMS + 1) * 0.7} />
        <Burst x={chest[0]} y={chest[1]} r={460} t={seg(f, ARMS, ARMS + 16)} seed={81} />
        <Hero p={p} x={GX} y={GY} scale={sc} shadow={false} headExtra={<Helmet />} between={bike} />
        <Sparks f={f} start={ARMS} seed={82} n={22} x={chest[0]} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 24]} colors={['#FFD064', '#FFFFFF', BIKE_C]} />
        {/* confetti cannons from the barriers */}
        <Sparks f={f} start={LINE + 1} seed={83} n={30} x={40} y={1520} speed={[24, 46]} g={0.7} size={[10, 18]} shape="confetti" angle={-60} spread={30} colors={['#F15F75', '#FFD064', BIKE_C, '#45B87A', '#FFFFFF']} />
        <Sparks f={f} start={LINE + 1} seed={84} n={30} x={1040} y={1520} speed={[24, 46]} g={0.7} size={[10, 18]} shape="confetti" angle={-120} spread={30} colors={['#F15F75', '#FFD064', BIKE_C, '#45B87A', '#FFFFFF']} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, POINT + 1, POINT + 14)} />
        <Glint x={hands[1][0] + 10} y={hands[1][1] - 40} s={0.8} t={seg(f, SALUTE + 2, SALUTE + 14)} />
      </g>
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="town" seed={12} layer="front" extra={extra} />
      {flash > 0 ? <rect x={-40} y={TOP - 40} width={1160} height={FULL_H + 80} fill="#FFFFFF" opacity={flash * 0.9} /> : null}
      <Sfx f={f} start={8} text="ALLEZ ALLEZ!" x={300} y={640} size={110} rot={-8} fill="#FFFFFF" dur={18} />
      <Sfx f={f} start={THROW} text="THROW IT!" x={540} y={1330} size={130} rot={6} fill="#FFD064" dur={10} />
      <Sfx f={f} start={LINE} text="CLICK!" x={540} y={420} size={170} rot={-6} fill="#FFFFFF" dur={14} />
      <Sfx f={f} start={ARMS} text="WINNER!" x={540} y={460} size={190} rot={-4} fill="#FFD064" dur={20} />
      <ConfettiRain f={f} start={ARMS} n={60} seed={85} colors={['#F15F75', '#FFD064', BIKE_C, '#45B87A', '#FFFFFF']} />
    </Stage>
  );
};
