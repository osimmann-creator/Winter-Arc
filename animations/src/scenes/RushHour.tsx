// Run #6: "RUSH HOUR" - jogging down the middle of the avenue, a cab pulls up beside him and honks.
// He grins, hits turbo and leaves the taxi as a dot in the distance.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, VICTORY, WheelLegs } from './RunKit';
import { CityWorld, CITY, Taxi, P, HY, CityObj, streetBanner } from './CityKit';

const GX = 540;
const BOOST = 38;
const SKID = 74;
const POSE = 82;
const CARD = 94;
const RUN = makeRun(
  [[0, 0.11], [BOOST - 2, 0.1], [BOOST + 3, 0.44, E.in], [SKID - 4, 0.42], [SKID + 6, 0.04, E.out], [SKID + 10, 0, E.out]],
  [[0, 15], [BOOST - 2, 15], [BOOST + 3, 6.5, E.in], [SKID, 6.5], [SKID + 6, 14, E.out]],
  [SKID + 2, SKID + 8],
);
const turboAt = (f: number) => seg(f, BOOST, BOOST + 4) * (1 - seg(f, SKID - 2, SKID + 4));
/** taxi depth (it catches up, cruises beside him, then he leaves it behind) */
const taxiZ = (f: number) => kf(f, [[0, 7], [22, 1.62, E.out], [BOOST, 1.55], [BOOST + 22, 6.5, E.in], [SKID + 10, 16, E.out], [140, 22]]);
const TAXI_X = 0.98;

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = turboAt(f);
  const g = gait(ph, turbo);
  const run: Pose = { ...BASE, ...g };
  const look = kf(f, [[20, 0], [26, 1, E.out], [BOOST - 2, 1], [BOOST + 2, 0, E.inOut]]);
  if (f < SKID) {
    return plant(
      {
        ...run,
        turn: 0.55 * look,
        lookX: 1 * look,
        mouthMode: 'grin',
        smile: 1,
        mouthSkew: 0.7 * seg(f, 30, 34) * (1 - seg(f, BOOST, BOOST + 2)),
        brow: look > 0.5 ? 1 : run.brow,
        browTilt: look > 0.5 ? (f > 30 ? -0.6 : 0.5) : run.browTilt,
        eyeMode: f >= BOOST && f < BOOST + 6 ? 'star' : 'normal',
        red: 0,
      },
      runLift(ph),
    );
  }
  const keys: Key<Pose>[] = [
    { f: SKID, p: run },
    { f: SKID + 5, p: STOP, e: E.out },
    { f: POSE - 2, p: { sy: 0.9, sx: 1.07 }, e: E.inOut },
    { f: POSE + 2, p: { ...VICTORY, sy: 1.07, sx: 0.95 }, e: E.out },
    { f: POSE + 6, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
    { f: POSE + 10, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 96, p: { wink: 1, mouthSkew: 0.5, turn: 0.2, lookX: 0.5 }, e: E.inOut },
    { f: 108, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
    { f: 150, p: {} },
  ];
  return plant(poseAt(f, BASE, keys));
};

export const RushHourScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const turbo = turboAt(f);
  const scale = kf(f, [[0, 0.9], [SKID, 0.9], [POSE + 6, 0.98, E.out]]);
  const GY = kf(f, [[0, 1640], [SKID, 1640], [POSE + 6, 1700, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const knees: [number, number][] = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];
  const cam: Cam = {
    cx: kf(f, [[0, 560], [22, 600, E.inOut], [BOOST, 600], [BOOST + 10, 540, E.inOut]]),
    cy: kf(f, [[0, 1000], [BOOST, 980], [BOOST + 6, 1020, E.out], [SKID, 1000], [POSE + 6, 1060, E.inOut], [CARD + 6, 1020, E.inOut]]),
    z: kf(f, [[0, 1.02], [22, 1.08, E.inOut], [BOOST, 1.1], [BOOST + 6, 0.94, E.out], [SKID, 0.96], [POSE + 6, 1.04, E.out], [CARD + 6, 1.0, E.inOut]]),
    r: kf(f, [[BOOST, 0], [BOOST + 3, -2, E.out], [BOOST + 14, 0, E.inOut]]),
  };
  const s1 = shake(f, BOOST, 12, 22, 1);
  const s2 = shake(f, SKID, 10, 12, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };
  const tz = taxiZ(f);
  const taxiMood = f >= BOOST + 2 ? 'shock' : f >= 24 && f < 36 ? 'honk' : 'grin';
  const taxi: CityObj = {
    X: TAXI_X, S: tz - D, key: 'taxi',
    draw: (x, y, s) => <Taxi key="taxi" x={x} y={y} s={s} f={f} mood={taxiMood} lights={f >= 24 && f < 36 ? 1 : 0} />,
  };
  // a couple of parked cabs + a banner that he has already run under
  const parked: CityObj[] = [8, 21, 34].map((S, i) => ({
    X: i % 2 ? -1.15 : 1.15, S, key: `pk${S}`,
    draw: (x, y, s) => <Taxi key={`pk${S}`} x={x} y={y} s={s * 0.95} f={0} plate="NYC 26" />,
  }));
  const tp = P(TAXI_X, tz);
  const honkAt: [number, number] = [tp.x - 40 / tz, tp.y - 700 / tz];

  return (
    <Stage impact={f === BOOST} overlay={<EndCard f={f} start={CARD} lines={['RUSH HOUR']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.day} seed={6} extra={[taxi, ...parked, streetBanner(3.2, 'WINTER ARC 5K')]} crosswalks={[12, 30]} blur={turbo} />
      <g transform={camP(cam, 1, sh)}>
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1900} n={40} opacity={0.5 * turbo} width={7} /> : null}
        <Glow x={540} y={chest[1]} r={kf(f, [[BOOST - 1, 0], [BOOST + 3, 640, E.out], [BOOST + 16, 0]])} id="glowY" o={0.8} />
        <Burst x={540} y={chest[1] - 60} r={420} t={seg(f, BOOST, BOOST + 14)} seed={30} />
        <Burst x={540} y={chest[1]} r={420} t={seg(f, POSE, POSE + 17)} seed={31} />
        <Hero p={p} x={GX} y={GY} scale={scale} />
        <WheelLegs knees={knees} f={f} o={turbo} />
        {Array.from({ length: 7 }).map((_, i) => {
          const start = BOOST + 2 + i * 5;
          return f < SKID + 2 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={48} seed={i + 40} rise={1.2} /> : null;
        })}
        <Dust f={f} start={SKID} x={540} y={GY} n={8} spread={380} size={60} seed={47} />
        <Sparks f={f} start={SKID} seed={48} n={14} x={540} y={GY} speed={[10, 24]} g={0.9} size={[10, 18]} colors={['#FFD064', '#FFFFFF']} />
        <Sparks f={f} start={POSE} seed={49} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 98, 112)} />
        <Sfx f={f} start={24} text="BEEP BEEP!" x={honkAt[0]} y={honkAt[1]} size={120} rot={8} fill="#FFD064" dur={14} />
        <Sfx f={f} start={31} text="OH IT'S ON" x={300} y={head[1] - 70} size={96} rot={-8} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={BOOST} text="ZOOOM!" x={540} y={head[1] - 110} size={180} rot={-6} fill="#FFD064" dur={20} />
        <Sfx f={f} start={BOOST + 22} text="see ya!" x={840} y={HY + 40} size={90} rot={8} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={SKID} text="SKRRT!" x={800} y={GY - 160} size={120} rot={10} fill="#FFFFFF" dur={14} />
      </g>
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.day} seed={6} layer="front" extra={[taxi, ...parked]} />
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={32} />
    </Stage>
  );
};
