// Gym #6: "RAISE THE BAR" - three quick pull-ups, then one so explosive he flies up and sticks
// the landing standing ON the bar. Wobble, wobble... double biceps.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, DIM } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, springAt, wobble } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { stageOf, INK } from './kit';
import { GymRoomBG, FloorShadow } from './GymRoom';

const GX = 540;
const GY = 1700;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const BAR_Y = 760;
const BAR_X0 = 150;
const BAR_X1 = 930;
const YB = (BAR_Y - GY) / SC; // bar height in hero space
const HAND_X = 262;
const REPS = [13, 23, 33];
const KIP = 40;
const RELEASE = 49;
const APEX = 56;
const LAND = 62;
const FLEX = 76;
const CARD = 92;

/* ------------------------------- poses ------------------------------- */
const HANG: Partial<Pose> = {
  hipL: 4, hipR: 4, knL: -14, knR: -14, ftL: 10, ftR: 10, thL: 0.96, thR: 0.96,
  handL: 'fist', handR: 'fist', flexL: 0.9, flexR: 0.9, lookY: -0.8, lookX: 0, smile: 0.6, mouthOpen: 0, mouthMode: 'grin',
  lid: 0.2, brow: 0.3, browTilt: -0.4,
};
const PULL: Partial<Pose> = { mouthMode: 'grit', mouthOpen: 0, lid: 0.45, browTilt: -1, brow: -0.2, red: 0.35, flexL: 1.7, flexR: 1.7, lookY: -0.3, knL: -30, knR: -30, thL: 0.86, thR: 0.86 };
const TUCK: Partial<Pose> = {
  hipL: 22, hipR: 22, thL: 0.5, thR: 0.5, knL: -70, knR: -70, ftL: 16, ftR: 16,
  shL: 150, shR: 150, elL: -20, elR: -20, handL: 'open', handR: 'open',
  mouthMode: 'grin', mouthOpen: 1, smile: 1, lid: 0, red: 0, brow: 1, browTilt: 0, eyeMode: 'star', lookY: -0.2,
};
const BALANCE: Partial<Pose> = {
  hipL: 10, hipR: 10, thL: 1, thR: 1, knL: -6, knR: -6, ftL: 4, ftR: 4,
  shL: 86, shR: 86, elL: 8, elR: 8, wrL: 0, wrR: 0, handL: 'open', handR: 'open', uaL: 1, uaR: 1, faL: 1, faR: 1,
  mouthMode: 'o', mouthOpen: 0.5, smile: 0.4, eyeMode: 'normal', brow: 1, browTilt: 0.6, lookY: 0.5,
};
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 1.9, flexR: 1.9,
  shrugL: 14, shrugR: 14, chestS: 1.1, hipL: 13, hipR: 13, knL: -6, knR: -6, handL: 'fist', handR: 'fist',
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', lookX: 0, lookY: 0, turn: 0, rot: 0,
};

/** Shoulder height (hero space) for each frame while he is on the bar. */
const shoulderY = (f: number) =>
  kf(f, [
    [0, YB + 292],
    [REPS[0] - 6, YB + 292],
    [REPS[0], YB + 14, E.inOut], [REPS[0] + 5, YB + 292, E.inOut],
    [REPS[1], YB + 14, E.inOut], [REPS[1] + 5, YB + 292, E.inOut],
    [REPS[2], YB + 14, E.inOut], [REPS[2] + 5, YB + 300, E.inOut],
    [KIP, YB + 312, E.out],
    [RELEASE, YB - 60, E.in],
  ]);

const onBar = (f: number) => f < RELEASE;

const solve = (f: number): Pose => {
  if (onBar(f)) {
    const up = f >= REPS[0] - 6 ? Math.max(0, 1 - Math.abs(((f - REPS[0] + 6) % 10) - 6) / 6) : 0;
    const keys: Key<Pose>[] = [
      { f: 0, p: HANG },
      { f: REPS[0] - 2, p: PULL },
      { f: REPS[2] + 5, p: PULL },
      { f: KIP, p: { ...HANG, knL: -50, knR: -50, thL: 0.7, thR: 0.7, mouthMode: 'grit', lid: 0.5, red: 0.6 } },
      { f: RELEASE, p: { ...PULL, red: 0.8, knL: -40, knR: -40 } },
    ];
    let p = poseAt(f, BASE, keys);
    // swing a little while hanging
    p = { ...p, rot: Math.sin(f / 6) * 2 * (1 - seg(f, 8, 12)) + Math.sin(f * 0.9) * 0.6 * up };
    const r0 = rig({ ...p, y: 0 });
    const sy0 = r0.W(r0.torso, -DIM.shX, DIM.shY)[1];
    p = { ...p, y: shoulderY(f) - sy0 };
    p = { ...p, ...reach(p, 'L', [-HAND_X, YB], 1) };
    p = { ...p, ...reach(p, 'R', [HAND_X, YB], 1) };
    return p;
  }
  // in the air, then standing on the bar
  const keys: Key<Pose>[] = [
    { f: RELEASE, p: { ...PULL, shL: 160, shR: 160, elL: -10, elR: -10, handL: 'open', handR: 'open' } },
    { f: APEX, p: TUCK, e: E.out },
    { f: LAND - 1, p: { ...BALANCE, hipL: 8, hipR: 8, mouthMode: 'grin', mouthOpen: 0.8, eyeMode: 'star' }, e: E.in },
    { f: LAND + 3, p: { ...BALANCE, sy: 0.9, sx: 1.06, knL: -20, knR: -20, hipL: 18, hipR: 18 }, e: E.out },
    { f: LAND + 8, p: { ...BALANCE }, e: E.inOut },
    { f: FLEX - 4, p: { ...BALANCE, mouthMode: 'grin', mouthOpen: 0.4, smile: 1, browTilt: 0, lookY: 0 } },
    { f: FLEX, p: DOUBLE_BI, e: E.back },
    { f: FLEX + 8, p: { chestS: 1.14 } },
    { f: 86, p: { eyeMode: 'normal', wink: 1, mouthSkew: 0.5, mouthOpen: 0.5, turn: 0.15, lookX: 0.4 }, e: E.inOut },
    { f: 98, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
    { f: 140, p: {} },
  ];
  const p = poseAt(f, BASE, keys);
  // balance wobble after landing
  const wob = f >= LAND ? wobble(f, LAND, 0.32, 0.07, 9) * (1 - seg(f, FLEX - 6, FLEX)) : 0;
  const pumped = f >= FLEX ? (springAt(f, FLEX, 14, 1.8, 4) - 1) * 0.5 : 0;
  const planted = plant({ ...p, rot: wob, flexL: p.flexL + pumped, flexR: p.flexR + pumped });
  // flight: shoulders go from the release height up to the apex and down onto the bar
  const standY = planted.y + YB - 19; // soles resting on top of the bar
  if (f < LAND) {
    const r0 = rig({ ...planted, y: 0 });
    const sy0 = r0.W(r0.torso, -DIM.shX, DIM.shY)[1];
    const relY = YB - 60 - sy0; // body y at release
    const apexY = standY - 150;
    const y = f < APEX ? lerp(relY, apexY, E.out(seg(f, RELEASE, APEX))) : lerp(apexY, standY, E.in(seg(f, APEX, LAND)));
    return { ...planted, y };
  }
  return { ...planted, y: standY };
};

/* ------------------------------- rack ------------------------------- */
const Upright: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <rect x={x - 22} y={BAR_Y - 90} width={44} height={GY - BAR_Y + 120} fill="#433C4F" stroke={INK} strokeWidth={8} />
    <rect x={x - 12} y={BAR_Y - 80} width={10} height={GY - BAR_Y + 100} fill="#5D5878" />
    {Array.from({ length: 16 }).map((_, i) => (
      <circle key={i} cx={x + 4} cy={BAR_Y + 60 + i * 56} r={5} fill="#8E89B0" />
    ))}
    <rect x={x - 36} y={GY + 10} width={72} height={26} rx={8} fill="#433C4F" stroke={INK} strokeWidth={7} />
  </g>
);

const Bar: React.FC<{ bend: number }> = ({ bend }) => {
  const d = `M${BAR_X0} ${BAR_Y} Q540 ${BAR_Y + bend * 2} ${BAR_X1} ${BAR_Y}`;
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={34} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#D3CEDE" strokeWidth={20} strokeLinecap="round" />
      <path d={`M${BAR_X0 + 30} ${BAR_Y - 5} Q540 ${BAR_Y - 5 + bend * 2} ${BAR_X1 - 30} ${BAR_Y - 5}`} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
      {/* grip tape */}
      {[-1, 1].map((s) => (
        <rect key={s} x={540 + s * HAND_X * SC - 50} y={BAR_Y - 11 + bend * 0.9} width={100} height={22} rx={6} fill="#7254DC" opacity={0.9} />
      ))}
    </g>
  );
};

/* ------------------------------- scene ------------------------------- */
export const PullUpScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const feet = toStage(r.W(r.lL.ankle));
  const bicepL = toStage(r.W(r.aL.upper, -40, 70));
  const bicepR = toStage(r.W(r.aR.upper, -40, 70));
  const mouth = toStage(r.mouth());
  const bend = f >= LAND ? 10 + wobble(f, LAND, 0.5, 0.08, 22) : 0;

  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1080], [10, 1040, E.out], [KIP, 1040], [APEX, 520, E.inOut], [LAND + 6, 300, E.out], [FLEX, 260], [CARD, 180, E.inOut], [140, 170]]),
    z: kf(f, [[0, 1.25], [10, 1.02, E.out], [KIP, 1.05], [APEX, 0.9, E.inOut], [LAND + 6, 1.0, E.out], [FLEX, 1.06, E.out], [CARD, 0.98, E.inOut], [140, 1.0]]),
    r: kf(f, [[KIP, 0], [RELEASE, -2, E.out], [LAND, 1.5], [LAND + 8, 0, E.out]]),
  };
  const s1 = shake(f, LAND, 16, 22, 2);
  const s2 = shake(f, FLEX, 14, 16, 5);
  const s0 = shake(f, KIP, 9, 8, 1);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r };

  const bodyTrail = trail((ff) => {
    const q = solve(ff);
    const rr = rig(q);
    return toStage(rr.W(rr.torso, 0, -150));
  }, f, 7);

  return (
    <Stage impact={f === FLEX} overlay={<EndCard f={f} start={CARD} lines={['RAISE THE BAR']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymRoomBG f={f} cam={cam} sh={sh} rack={false} />
      <g transform={camP(cam, 1, sh)}>
        <FloorShadow x={540} y={GY + 4} w={lerp(170, 90, seg(f, KIP, APEX))} o={0.2} />
        <Upright x={BAR_X0 + 10} />
        <Upright x={BAR_X1 - 10} />
        <Glow x={540} y={head[1] + 300} r={kf(f, [[FLEX - 1, 0], [FLEX + 3, 560, E.out], [FLEX + 24, 380]])} id="glowY" o={seg(f, FLEX - 1, FLEX + 1) * (1 - seg(f, 110, 130) * 0.5)} />
        <Burst x={540} y={head[1] + 330} r={430} t={seg(f, FLEX, FLEX + 17)} seed={5} />
        {f >= FLEX && f < FLEX + 14 ? <FocusLines f={f} cx={540} cy={head[1] + 330} r0={470} opacity={0.7 * (1 - seg(f, FLEX + 6, FLEX + 14))} /> : null}
        {f >= RELEASE - 4 && f <= APEX + 2 ? <Swoosh pts={bodyTrail} width={300} opacity={0.55} /> : null}
        <Ring x={540} y={BAR_Y} t={seg(f, LAND, LAND + 16)} r={420} sy={0.22} w={26} />
        {/* the bar sits behind the fists while he hangs and under his soles once he stands on it */}
        <Bar bend={bend} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} />
        <Dust f={f} start={LAND} x={feet[0]} y={BAR_Y - 6} n={6} spread={260} size={46} seed={3} />
        <Sparks f={f} start={FLEX} seed={6} n={22} x={540} y={head[1] + 330} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={bicepL[0] - 10} y={bicepL[1] - 40} s={1.2} t={seg(f, FLEX + 3, FLEX + 17)} />
        <Glint x={bicepR[0] + 10} y={bicepR[1] - 40} s={1.2} t={seg(f, FLEX + 7, FLEX + 21)} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 88, 102)} />
        {REPS.map((rf, i) => (
          <Sfx key={rf} f={f} start={rf - 1} text={`${i + 1}!`} x={i % 2 ? 870 : 210} y={BAR_Y - 170 - i * 20} size={120} rot={i % 2 ? 9 : -9} fill="#FFFFFF" dur={12} />
        ))}
        <Sfx f={f} start={KIP - 2} text="NNNGH!" x={540} y={BAR_Y - 280} size={130} rot={-5} fill="#FFD064" dur={12} />
        <Sfx f={f} start={RELEASE} text="HUP!" x={250} y={BAR_Y - 520} size={160} rot={-10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={LAND + 2} text="BOING!" x={830} y={BAR_Y + 160} size={130} rot={10} fill="#FFFFFF" dur={20} />
        <Sfx f={f} start={FLEX} text="POW!" x={820} y={head[1] + 40} size={180} rot={8} fill="#FFD064" dur={22} />
      </g>
      <ConfettiRain f={f} start={CARD + 4} n={56} seed={6} />
    </Stage>
  );
};
