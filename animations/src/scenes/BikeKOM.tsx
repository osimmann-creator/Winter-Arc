// Bike #1: "KING OF THE MOUNTAIN" - grinding up an alpine pass out of the saddle, bike rocking
// side to side, 12% sign, sweat flying. He crests under the polka-dot KOM arch, fist pump, then
// no hands - arms up, double biceps, wink - as the road tips over the top.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun } from './RunKit';
import { TITLE_FONT } from '../fonts';
import { INK } from './kit';
import {
  RoadWorld, RoadObj, Bicycle, InHeroSpace, Helmet, RIDE, pedalLegs, gripBars, solesOf, P, ZH, BIKE_C, BIKE_D, Fans, RoadSign,
} from './BikeKit';

const GX = 540;
const SC = 0.8;
const SUMMIT = 44;
const FIST = 50;
const NOHANDS = 60;
const FLEX = 78;
const WINK = 90;
const CARD = 98;
const RUN = makeRun(
  [[0, 0.045], [SUMMIT - 2, 0.045], [SUMMIT + 10, 0.1, E.inOut], [140, 0.11]],
  [[0, 24], [SUMMIT, 24], [SUMMIT + 6, 15, E.inOut]],
  [NOHANDS - 6, NOHANDS],
);
const ARCH_S = ZH - RUN.distAt(SUMMIT);
const standAt = (f: number) => 1 - seg(f, SUMMIT, SUMMIT + 6);

const GRIND: Partial<Pose> = {
  ...RIDE, mouthMode: 'grit', mouthOpen: 0.35, smile: 0.2, lid: 0.45, brow: -0.4, browTilt: -1.1, sweat: 1, red: 0.3, lookX: 0, lookY: -0.3,
};
const CREST: Partial<Pose> = {
  ...RIDE, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, sweat: 0.4, red: 0, lookY: -0.6, pupil: 1.1,
};
const PUMP: Partial<Pose> = { ...CREST, shR: 156, elR: 22, uaR: 1, faR: 1, handR: 'fist', flexR: 1.5, lookY: -0.2, lookX: 0.3 };
const ARMS_UP: Partial<Pose> = {
  ...CREST, shL: 150, elL: -14, shR: 150, elR: -14, uaL: 1, uaR: 1, faL: 1, faR: 1, handL: 'fist', handR: 'fist', flexL: 1.5, flexR: 1.5,
  torsoSy: 0.96, chestS: 1.1, eyeMode: 'star', lookY: 0, lookX: 0, sweat: 0,
};
const DOUBLE_BI: Partial<Pose> = {
  ...ARMS_UP, shL: 96, shR: 96, elL: 112, elR: 112, wrL: 10, wrR: 10, faL: 0.96, faR: 0.96, flexL: 1.9, flexR: 1.9, shrugL: 14, shrugR: 14,
  chestS: 1.12, torsoSy: 1, eyeMode: 'normal',
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: GRIND },
  { f: SUMMIT - 3, p: { ...GRIND, mouthOpen: 0.5 } },
  { f: SUMMIT + 2, p: CREST, e: E.out },
  { f: FIST - 3, p: CREST },
  { f: FIST + 2, p: PUMP, e: E.back },
  { f: NOHANDS - 4, p: PUMP },
  { f: NOHANDS + 2, p: ARMS_UP, e: E.back },
  { f: FLEX - 4, p: { ...ARMS_UP, eyeMode: 'normal' } },
  { f: FLEX + 1, p: DOUBLE_BI, e: E.back },
  { f: WINK - 3, p: DOUBLE_BI },
  { f: WINK + 1, p: { ...DOUBLE_BI, wink: 1, mouthSkew: 0.5, mouthOpen: 0.6, turn: 0.12, lookX: 0.3 }, e: E.inOut },
  { f: 140, p: { ...DOUBLE_BI, wink: 1, mouthSkew: 0.5, mouthOpen: 0.6, turn: 0.12, lookX: 0.3 } },
];

const leanAt = (f: number) => 9 * Math.sin(RUN.phAt(f)) * standAt(f);

const solve = (f: number): Pose => {
  const th = RUN.phAt(f);
  const stand = standAt(f);
  const lean = leanAt(f);
  const base = poseAt(f, BASE, KEYS);
  const legs = pedalLegs(th, stand);
  const bob = Math.sin(th * 2) * 6 * stand;
  let p: Pose = {
    ...base,
    ...legs,
    x: 378 * Math.sin((lean * Math.PI) / 180) * 0.35,
    rot: -lean * 0.3,
    head: base.head - lean * 0.4 + Math.sin(th * 2) * 2 * stand,
    y: (legs.y ?? 0) + bob,
  } as Pose;
  const gripL = kf(f, [[NOHANDS - 4, 1], [NOHANDS + 1, 0, E.in]]);
  const gripR = kf(f, [[FIST - 4, 1], [FIST + 1, 0, E.in]]);
  const foreL = lerp(1, 0.62, gripL);
  const foreR = lerp(1, 0.62, gripR);
  p = { ...p, uaL: lerp(p.uaL, foreL, gripL), faL: lerp(p.faL, foreL, gripL), uaR: lerp(p.uaR, foreR, gripR), faR: lerp(p.faR, foreR, gripR) };
  p = gripBars(p, lean, gripL, 'L');
  p = gripBars(p, lean, gripR, 'R');
  if (gripL > 0.5) p = { ...p, handL: 'grip' };
  if (gripR > 0.5) p = { ...p, handR: 'grip' };
  return p;
};

/** The KOM arch: white banner with red polka dots. */
const komArch = (S: number): RoadObj => ({
  X: 0, S, key: 'kom',
  draw: (x, y, s) => (
    <g key="kom" transform={`translate(${x} ${y}) scale(${s})`}>
      {[-1, 1].map((k) => (
        <rect key={k} x={k * 1000 - 30} y={-1500} width={60} height={1500} fill="#D8D2E6" stroke={INK} strokeWidth={10} />
      ))}
      <rect x={-1060} y={-1660} width={2120} height={280} rx={30} fill="#FFFFFF" stroke={INK} strokeWidth={14} />
      {Array.from({ length: 26 }).map((_, i) => (
        <circle key={i} cx={-1000 + (i % 13) * 166 + (i >= 13 ? 83 : 0)} cy={i >= 13 ? -1430 : -1610} r={30} fill="#D9434A" />
      ))}
      <text x={0} y={-1515} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={150} fill="#D9434A" stroke={INK} strokeWidth={8} paintOrder="stroke">
        KOM
      </text>
    </g>
  ),
});

export const BikeKOMScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const lean = leanAt(f);
  const GY = P(0, ZH).y;
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const cam: Cam = {
    cx: kf(f, [[0, 560], [SUMMIT, 540, E.inOut], [CARD + 10, 540]]),
    cy: kf(f, [[0, 1080], [SUMMIT - 6, 1060, E.inOut], [SUMMIT + 6, 980, E.inOut], [NOHANDS + 6, 1020, E.inOut], [FLEX, 1040, E.inOut], [CARD + 10, 950, E.inOut]]),
    z: kf(f, [[0, 1.12], [SUMMIT - 6, 1.06, E.inOut], [SUMMIT + 6, 0.92, E.inOut], [NOHANDS + 6, 1.0, E.inOut], [FLEX, 1.1, E.inOut], [CARD + 10, 0.98, E.inOut]]),
    r: kf(f, [[0, -2], [SUMMIT, -1.5], [SUMMIT + 10, 0, E.inOut]]),
  };
  const s1 = shake(f, SUMMIT, 12, 14, 1);
  const s2 = shake(f, NOHANDS, 10, 10, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };
  const fans: RoadObj[] = [-0.55, 0.45].flatMap((dS, i) =>
    ([-1, 1] as const).map((side) => ({
      X: side * 1.75, S: ARCH_S + dS, key: `fan${i}${side}`,
      draw: (x: number, y: number, s: number, z: number) => <Fans key={`fan${i}${side}`} x={x} y={y} s={s} seed={i * 7 + (side > 0 ? 3 : 0) + 11} z={z} side={side} />,
    })),
  );
  const extra: RoadObj[] = [
    komArch(ARCH_S),
    ...fans,
    { X: -1.85, S: 2.4, key: 'sign', draw: (x, y, s) => <RoadSign key="sign" x={x} y={y} s={s} text="12%" /> },
  ];
  const bike = (
    <InHeroSpace p={p}>
      <Bicycle lean={lean} soles={solesOf(p)} f={f} speed={RUN.speedAt(f)} />
    </InHeroSpace>
  );

  return (
    <Stage impact={f === SUMMIT} overlay={<EndCard f={f} start={CARD} lines={['KING OF THE', 'MOUNTAIN']} pts="+1.5" color={BIKE_C} dark={BIKE_D} y={96} />}>
      <GlowDefs />
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="alpine" seed={4} extra={extra} />
      <g transform={camP(cam, 1, sh)}>
        <ellipse cx={GX + p.x * SC * 0.3} cy={GY + 4} rx={140 * SC} ry={20 * SC} fill="#000" opacity={0.25} />
        <Glow x={chest[0]} y={chest[1]} r={kf(f, [[SUMMIT - 1, 0], [SUMMIT + 3, 600, E.out], [SUMMIT + 18, 0]])} id="glowY" o={0.7} />
        <Burst x={chest[0]} y={chest[1] - 60} r={420} t={seg(f, SUMMIT, SUMMIT + 14)} seed={61} />
        <Burst x={chest[0]} y={chest[1]} r={440} t={seg(f, NOHANDS, NOHANDS + 16)} seed={62} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} headExtra={<Helmet />} between={bike} />
        {/* sweat flicking off while he grinds */}
        <Sparks f={f} start={6} seed={63} n={6} x={head[0] - 60} y={head[1] + 120} speed={[6, 12]} g={0.6} size={[8, 12]} shape="drop" colors={['#A6DCFF']} angle={-150} spread={40} />
        <Sparks f={f} start={22} seed={64} n={6} x={head[0] + 60} y={head[1] + 120} speed={[6, 12]} g={0.6} size={[8, 12]} shape="drop" colors={['#A6DCFF']} angle={-30} spread={40} />
        <Sparks f={f} start={SUMMIT} seed={65} n={22} x={chest[0]} y={chest[1]} speed={[16, 36]} g={0.8} size={[14, 24]} colors={['#D9434A', '#FFFFFF', '#FFD064']} shape="dot" />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, WINK + 1, WINK + 14)} />
      </g>
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="alpine" seed={4} layer="front" extra={extra} />
      <Sfx f={f} start={10} text="HNNNG..." x={300} y={560} size={110} rot={-8} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={SUMMIT} text="SUMMIT!" x={540} y={520} size={180} rot={-5} fill="#FFD064" dur={18} />
      <Sfx f={f} start={NOHANDS} text="NO HANDS!" x={540} y={560} size={150} rot={4} fill="#FFFFFF" dur={18} />
      <ConfettiRain f={f} start={SUMMIT + 2} n={60} seed={66} colors={['#D9434A', '#FFFFFF', '#D9434A', '#FFD064', BIKE_C]} />
    </Stage>
  );
};
