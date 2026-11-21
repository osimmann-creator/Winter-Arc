// Gym #3: "LEG DAY" - three grindy squats, bail the bar, jelly legs, accidental splits, thumbs up.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key } from '../lib/anim';
import { ap, svgM } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Dust, Sfx, GlowDefs, Glint, ConfettiRain } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { GymBG, Columns, Platform, Barbell, Cracks } from './Gym';
import { stageOf, drop } from './kit';

const GX = 540;
const GY = 1700;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const BAIL = 57;
const SPLIT = 88;

const ARMS: Partial<Pose> = {
  shL: 70, shR: 70, elL: 80, elR: 80, wrL: -6, wrR: -6, uaL: 1, uaR: 1, faL: 1, faR: 1,
  flexL: 0.8, flexR: 0.8, handL: 'fist', handR: 'fist', armZL: 'mid', armZR: 'mid', shrugL: 10, shrugR: 10,
};
const TALL: Partial<Pose> = {
  ...ARMS, hipL: 11, hipR: 11, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, torsoSy: 1, sy: 1, sx: 1,
  mouthMode: 'grit', mouthOpen: 0, smile: 0.4, lid: 0.25, browTilt: -0.5, brow: 0,
};
const DEEP: Partial<Pose> = {
  hipL: 44, hipR: 44, knL: -54, knR: -54, thL: 0.62, thR: 0.62, ftL: 8, ftR: 8, torsoSy: 0.84, sy: 0.98,
  lid: 0.5, browTilt: -1, red: 0.4, sweat: 1, lookY: -0.4,
};
const rep = (f0: number, slow = 1): Key<Pose>[] => [
  { f: f0 + 7 * slow, p: { ...DEEP }, e: E.inOut },
  { f: f0 + 9 * slow, p: { sy: 0.96 }, e: E.out },
  { f: f0 + 16 * slow, p: { ...TALL, red: 0.2 * slow }, e: E.inOut },
];

const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...TALL, mouthMode: 'grin', smile: 1, lid: 0, browTilt: 0, brow: 0.6 } },
  { f: 6, p: { ...TALL } },
  ...rep(6),
  ...rep(22),
  { f: 45, p: { ...DEEP, red: 0.8, lid: 0.7 }, e: E.inOut },
  { f: 49, p: { hipL: 36, hipR: 36, knL: -40, knR: -40, thL: 0.72, thR: 0.72, torsoSy: 0.88 }, e: E.inOut },
  { f: 55, p: { ...TALL, red: 0.9, lid: 0.6, sweat: 1 }, e: E.inOut },
  // bail: arms fling up/out, hands open
  { f: BAIL + 3, p: { shL: 118, shR: 118, elL: 30, elR: 30, handL: 'open', handR: 'open', mouthMode: 'o', mouthOpen: 0.8, lid: 0, red: 0.3, brow: 1, browTilt: 0 }, e: E.out },
  { f: 66, p: { shL: 24, shR: 24, elL: 20, elR: 20, flexL: 0.3, flexR: 0.3, handL: 'relax', handR: 'relax', mouthMode: 'grin', mouthOpen: 0.4, smile: 0.7, pupil: 0.8 }, e: E.inOut },
  // wobbly thumbs up
  { f: 74, p: { shR: 26, elR: 142, wrR: -64, handR: 'thumb', smile: 1, mouthOpen: 0.6, browTilt: 0.6, brow: 0.8 }, e: E.back },
  { f: SPLIT - 2, p: { pupil: 0.6, mouthMode: 'o', mouthOpen: 0.6, browTilt: 1, brow: 1.2 } },
  // splits
  {
    f: SPLIT + 3,
    p: {
      hipL: 86, hipR: 86, knL: -2, knR: -2, thL: 1, thR: 1, ftL: -10, ftR: -10, torsoSy: 0.98, sy: 1, sx: 1,
      shL: 120, shR: 120, elL: -20, elR: -20, handL: 'open', handR: 'open', mouthMode: 'o', mouthOpen: 1, eyes: 1, red: 0.6, sweat: 1,
    },
    e: E.in,
  },
  { f: SPLIT + 8, p: { shL: 100, shR: 100 }, e: E.out },
  {
    f: 104,
    p: { shL: 30, shR: 30, elL: 142, elR: 142, wrL: -64, wrR: -64, handL: 'thumb', handR: 'thumb', eyes: 0, mouthMode: 'grit', smile: 1, lid: 0.15, red: 0.25, browTilt: 0.8, brow: 1 },
    e: E.back,
  },
  { f: 150, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  // grind shake on the third rep
  const grind = seg(f, 44, 47) * (1 - seg(f, 54, 56));
  // jelly legs between the bail and the splits
  const j = seg(f, 60, 64) * (1 - seg(f, SPLIT - 1, SPLIT + 1));
  const w = f * 0.95;
  const q: Pose = {
    ...p,
    x: Math.sin(f * 3.3) * 4 * grind + Math.sin(w * 0.5) * 26 * j,
    rot: Math.sin(w * 0.5 + 0.6) * 3.5 * j,
    hipL: p.hipL - 12 * j + Math.sin(w) * 10 * j,
    hipR: p.hipR - 12 * j + Math.sin(w + Math.PI) * 10 * j,
    knL: p.knL + (30 + Math.sin(w + 1) * 14) * j,
    knR: p.knR + (30 + Math.sin(w + 1 + Math.PI) * 14) * j,
    thL: p.thL - 0.1 * j,
    thR: p.thR - 0.1 * j,
    sy: p.sy - (0.03 + Math.sin(w * 1.3) * 0.025) * j,
    sweat: Math.max(p.sweat, j),
    wrR: p.wrR + Math.sin(w * 1.6) * 14 * j,
  };
  const sit = seg(f, SPLIT, SPLIT + 3);
  return plant(q, -18 * sit);
};

const relPose = poseF(BAIL);
const relRig = rig(relPose);
const relA = ap(relRig.aL.wrist, 0, 42) as [number, number];
const relB = ap(relRig.aR.wrist, 0, 42) as [number, number];
const relMid = toStage(relRig.W(relRig.aL.wrist, 0, 42));
const relMid2 = toStage(relRig.W(relRig.aR.wrist, 0, 42));
const relCY = (relMid[1] + relMid2[1]) / 2;

export const LegDayScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const held = f < BAIL;
  const gL = ap(r.aL.wrist, 0, 42) as [number, number];
  const gR = ap(r.aR.wrist, 0, 42) as [number, number];
  const bend = held ? -(14 + Math.sin(f / 2.2) * 3 * seg(f, 40, 46) + kf(f, [[0, 0], [13, 10], [15, 4], [29, 10], [31, 4], [45, 14], [55, 4]])) : 0;

  // dropped bar
  const floorBar = GY - 60 - 135;
  const bt = f - BAIL;
  const bd = drop(bt, relCY, floorBar, -10, 4);
  const barDrop = held ? null : (
    <g transform={`translate(0 ${bd.y - relCY})`}>
      <g transform={`translate(${GX} ${GY}) scale(${SC})`}>
        <g transform={svgM(relRig.root)}>
          <Barbell a={relA} b={relB} L={530} bend={bd.landed ? Math.cos((bt - bd.tl) * 0.9) * 26 * Math.exp(-(bt - bd.tl) * 0.15) : -10} />
        </g>
      </g>
    </g>
  );
  const barLand = BAIL + Math.ceil(drop(99, relCY, floorBar, -10, 4).tl);

  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1250], [12, 1060, E.out], [44, 1060], [48, 1180, E.inOut], [56, 1180], [64, 1080, E.out], [SPLIT, 1080], [SPLIT + 4, 1180, E.out], [100, 1180], [112, 1120, E.inOut]]),
    z: kf(f, [[0, 1.5], [12, 1.0, E.out], [44, 1.0], [48, 1.35, E.inOut], [56, 1.35], [64, 1.0, E.out], [SPLIT, 1.0], [SPLIT + 4, 1.12, E.out], [100, 1.12], [112, 1.0, E.inOut]]),
    r: kf(f, [[0, 2], [12, 0, E.out]]) + Math.sin(f * 0.5) * 1.2 * seg(f, 62, 66) * (1 - seg(f, SPLIT - 2, SPLIT)),
  };
  const s0 = shake(f, 44, 12, 5, 1);
  const s1 = shake(f, barLand, 16, 22, 3);
  const s2 = shake(f, SPLIT + 3, 20, 30, 5);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r + s2.r };
  const head = toStage(r.headTop());
  const thumbR = toStage(r.handR());
  const thumbL = toStage(r.handL());

  return (
    <Stage impact={f === SPLIT + 3} overlay={<EndCard f={f} start={100} lines={['LEG DAY']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Platform />
        <Cracks f={f} start={SPLIT + 3} />
        <Ring x={540} y={1690} t={seg(f, SPLIT + 3, SPLIT + 20)} r={500} sy={0.22} w={26} />
        {barDrop}
        {!held && bd.landed ? <Dust f={f} start={barLand} x={540} y={GY - 40} n={9} spread={640} size={60} seed={8} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} behind={held ? <Barbell a={gL} b={gR} bend={bend} L={530} /> : undefined} />
        <Burst x={540} y={1640} r={300} t={seg(f, SPLIT + 3, SPLIT + 18)} seed={3} />
        <Dust f={f} start={SPLIT + 3} x={540} y={1690} n={10} spread={560} size={62} seed={9} />
        <Sparks f={f} start={SPLIT + 3} seed={12} n={16} x={540} y={1650} speed={[12, 30]} g={0.9} size={[12, 22]} shape="drop" colors={['#A6DCFF']} />
        <Glint x={thumbR[0] + 20} y={thumbR[1] - 40} s={1.1} t={seg(f, 106, 120)} />
        <Glint x={thumbL[0] - 20} y={thumbL[1] - 40} s={1.1} t={seg(f, 110, 124)} />
        <Sfx f={f} start={14} text="ONE!" x={250} y={900} size={110} rot={-10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={30} text="TWO!" x={830} y={900} size={110} rot={8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={46} text="THREEEE..." x={540} y={head[1] - 110} size={100} rot={-4} fill="#FFD064" dur={14} />
        <Sfx f={f} start={barLand} text="CLANG!" x={250} y={1240} size={150} rot={10} fill="#FFD064" dur={20} />
        {['W', 'O', 'B', 'B', 'L', 'E'].map((ch, i) => (
          <Sfx key={i} f={f} start={68 + i} text={ch} x={170 + i * 60} y={760 + Math.sin(f / 2.5 + i) * 24} size={96} rot={Math.sin(f / 3 + i) * 14} fill="#BCABFF" dur={SPLIT - 70} shake={false} />
        ))}
        <Sfx f={f} start={SPLIT + 3} text="SPLAT!" x={780} y={1300} size={170} rot={8} fill="#FFFFFF" dur={22} />
      </g>
      <Columns cam={cam} sh={sh} />
      <ConfettiRain f={f} start={104} n={50} seed={21} />
    </Stage>
  );
};

