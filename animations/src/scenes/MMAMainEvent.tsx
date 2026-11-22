// MMA #2 (Amaan): "MAIN EVENT" - lights down, the jumbotron announces AMAAN, he walks out through
// the smoke, bumps his gloves - BOOM, pyro - points at you, then both gloves up.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, Ring, Cloud } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { gait } from './RunKit';
import { NameTag, PEOPLE } from './jokekit';
import { Glove, Headband } from './JokeMMA';
import { Arena, Jumbotron, HeroSpot, Pyro, RED, RED_D, MAT_Y } from './MMAKit';

const GX = 540;
const WALK0 = 10;
const ARRIVE = 44;
const TAP = 50;
const POINT = 62;
const RAISE = 76;
const CARD = 94;
const [ORANGE] = PEOPLE.amaan;

const GUARD: Partial<Pose> = {
  shL: 50, elL: 130, shR: 46, elR: 126, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0,
  hipL: 14, hipR: 14, knL: -14, knR: -14, thL: 0.94, thR: 0.94, torsoSy: 0.98, chestS: 1.06,
  handL: 'fist', handR: 'fist', flexL: 1.3, flexR: 1.3, mouthMode: 'grin', smile: 0.8, mouthSkew: 0.5, lid: 0.25, brow: -0.1, browTilt: -0.5,
};
const POINTING: Partial<Pose> = {
  ...GUARD, shR: 54, elR: -18, uaR: 0.55, faR: 0.5, wrR: -10, handR: 'point', mouthSkew: 0.8, mouthOpen: 0.3, lid: 0.3, browTilt: -0.7, brow: 0.2, turn: 0.15, lookX: 0.1,
};
const RAISED: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, shL: 150, shR: 150, elL: -16, elR: -16, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0,
  handL: 'fist', handR: 'fist', chestS: 1.1, flexL: 1.6, flexR: 1.6, mouthMode: 'grin', mouthOpen: 1, smile: 1, mouthSkew: 0, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', turn: 0, lookX: 0,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: GUARD },
  { f: ARRIVE, p: GUARD },
  { f: TAP - 3, p: { ...GUARD, mouthMode: 'grit', mouthOpen: 0.3, lid: 0.45, browTilt: -0.9, sy: 1.02 } },
  { f: TAP, p: { ...GUARD, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.8, browTilt: 0, eyeMode: 'star', sy: 0.96, sx: 1.03 }, e: E.out },
  { f: POINT - 4, p: { ...GUARD, eyeMode: 'normal' } },
  { f: POINT, p: POINTING, e: E.back },
  { f: RAISE - 4, p: { ...POINTING, wink: 1 } },
  { f: RAISE, p: RAISED, e: E.back },
  { f: RAISE + 6, p: { chestS: 1.14 } },
  { f: 90, p: { eyeMode: 'normal', wink: 1, mouthSkew: 0.5, mouthOpen: 0.6, turn: 0.15, lookX: 0.4 }, e: E.inOut },
  { f: 102, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
  { f: 140, p: {} },
];

const walking = (f: number) => f >= WALK0 && f < ARRIVE;
const phase = (f: number) => (Math.max(0, f - WALK0) / 16) * Math.PI * 2;

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  if (f < ARRIVE + 2) {
    // swagger walk: half-size strides, gloves low, a little shoulder roll
    const g = gait(phase(f), 0);
    const w = walking(f) ? 1 : 0;
    p = {
      ...p,
      hipL: lerp(p.hipL, (g.hipL ?? 0) * 0.8, w), hipR: lerp(p.hipR, (g.hipR ?? 0) * 0.8, w),
      thL: lerp(p.thL, 1 - (1 - (g.thL ?? 1)) * 0.6, w), thR: lerp(p.thR, 1 - (1 - (g.thR ?? 1)) * 0.6, w),
      knL: lerp(p.knL, g.knL ?? 0, w), knR: lerp(p.knR, g.knR ?? 0, w), ftL: lerp(p.ftL, g.ftL ?? 0, w), ftR: lerp(p.ftR, g.ftR ?? 0, w),
      torso: Math.sin(phase(f)) * 6 * w, head: -Math.sin(phase(f)) * 4 * w, rot: Math.sin(phase(f)) * 2 * w,
    };
  }
  p = plant(p);
  if (walking(f)) {
    const bob = Math.sin(phase(f) * 2) * 6;
    p = { ...p, shL: p.shL + bob, shR: p.shR - bob };
  }
  // gloves bump together in front of the chest at TAP
  const bump = kf(f, [[TAP - 5, 0], [TAP - 1, 1, E.in], [TAP + 3, 0.6, E.out], [POINT - 4, 0, E.inOut]]);
  if (bump > 0) {
    const q = { ...p, ...reach(p, 'L', [-46, -740], 1), ...reach(p, 'R', [46, -740], 1) };
    p = { ...p, shL: lerp(p.shL, q.shL, bump), elL: lerp(p.elL, q.elL, bump), shR: lerp(p.shR, q.shR, bump), elR: lerp(p.elR, q.elR, bump) };
  }
  return p;
};

/** Low smoke rolling across the floor. */
const Smoke: React.FC<{ f: number; o: number }> = ({ f, o }) =>
  o > 0 ? (
    <g opacity={o}>
      {Array.from({ length: 9 }).map((_, i) => (
        <Cloud key={i} x={((i * 260 + f * (2 + (i % 3))) % 2000) - 600} y={MAT_Y + 60 + (i % 3) * 90} w={420} h={140} seed={i + 30} fill="#E9E6F6" shade="#C9C3E6" line="#8E87B8" lw={4} opacity={0.75} />
      ))}
    </g>
  ) : null;

export const MMAMainEventScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const walkT = E.out(seg(f, WALK0, ARRIVE));
  const SC = lerp(0.5, 0.86, walkT);
  const GY = lerp(MAT_Y + 70, 1760, walkT);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const r = rig(p);
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const tap = toStage([0, -720]);
  const point = toStage(r.W(r.aR.wrist, 0, 60));
  const hype = kf(f, [[0, 0.1], [WALK0, 0.4], [TAP, 1], [140, 1]]);
  const lightsUp = seg(f, 2, 10);
  const screen = f < 16 ? (
    <Jumbotron text="MAIN EVENT" sub="TONIGHT" color="#FFFFFF" flash={0} />
  ) : f < TAP ? (
    <Jumbotron text="AMAAN" sub="AND NOWWW..." color={ORANGE} flash={1 - seg(f, 16, 22)} />
  ) : (
    <Jumbotron text="AMAAN" sub="WINTER ARC MMA" color="#FFD064" flash={1 - seg(f, TAP, TAP + 6)} />
  );
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 880], [WALK0, 900], [ARRIVE, 1160, E.inOut], [TAP, 1140], [POINT, 1180, E.inOut], [RAISE, 1080, E.inOut], [CARD + 6, 1060, E.inOut]]),
    z: kf(f, [[0, 0.86], [WALK0, 0.9], [ARRIVE, 1.04, E.inOut], [TAP - 2, 1.1, E.inOut], [TAP + 4, 0.98, E.out], [POINT, 1.16, E.out], [RAISE, 1.0, E.inOut], [CARD + 6, 0.98, E.inOut]]),
  };
  const s1 = shake(f, TAP, 14, 24, 1);
  const s2 = shake(f, RAISE, 12, 14, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };

  return (
    <Stage bg="#100E24" impact={f === TAP} overlay={<EndCard f={f} start={CARD} lines={['MAIN EVENT']} pts="+1.5" color={RED} dark={RED_D} y={96} />}>
      <GlowDefs />
      <Arena f={f} cam={cam} sh={sh} hype={hype} screen={screen} spots={lightsUp} dark={0.55 * (1 - lightsUp)} />
      <g transform={camP(cam, 1, sh)}>
        <HeroSpot x={GX} y={GY + 6} o={lightsUp} w={lerp(170, 290, walkT)} />
        <ellipse cx={GX} cy={GY + 4} rx={230 * SC} ry={26 * SC} fill="#000" opacity={0.3} />
        <Pyro x={150} y={MAT_Y + 120} t={f - TAP} />
        <Pyro x={930} y={MAT_Y + 120} t={f - TAP} />
        <Pyro x={150} y={MAT_Y + 120} t={f - RAISE} h={700} />
        <Pyro x={930} y={MAT_Y + 120} t={f - RAISE} h={700} />
        <Glow x={chest[0]} y={chest[1]} r={kf(f, [[RAISE - 1, 0], [RAISE + 3, 560, E.out], [RAISE + 24, 380]])} id="glowY" o={seg(f, RAISE - 1, RAISE + 1) * 0.8} />
        <Burst x={tap[0]} y={tap[1]} r={360} t={seg(f, TAP, TAP + 14)} seed={50} />
        <Burst x={chest[0]} y={chest[1]} r={440} t={seg(f, RAISE, RAISE + 17)} seed={51} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} headExtra={<Headband />} itemL={<Glove />} itemR={p.handR === 'point' ? undefined : <Glove />} />
        <Ring x={tap[0]} y={tap[1]} t={seg(f, TAP, TAP + 12)} r={300} w={20} />
        <Sparks f={f} start={TAP} seed={52} n={20} x={tap[0]} y={tap[1]} speed={[14, 34]} g={0.8} size={[12, 22]} />
        <Sparks f={f} start={RAISE} seed={53} n={24} x={chest[0]} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} colors={['#FFD064', '#FFFFFF', '#F2853A']} />
        <Glint x={point[0]} y={point[1]} s={1.3} t={seg(f, POINT + 1, POINT + 14)} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 92, 106)} />
        <NameTag x={head[0]} y={head[1] - 70} name="AMAAN" color={ORANGE} t={f - 18} out={seg(f, TAP - 6, TAP - 2)} s={lerp(0.7, 1, walkT)} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Smoke f={f} o={0.9 * (1 - seg(f, TAP + 10, TAP + 30))} />
      </g>
      <Sfx f={f} start={14} text="AND NOWWW..." x={540} y={560} size={110} rot={-4} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={TAP} text="BOOM!" x={780} y={720} size={190} rot={8} fill="#FFD064" dur={18} />
      <Sfx f={f} start={POINT} text="YOU." x={260} y={740} size={150} rot={-8} fill="#FFFFFF" dur={14} />
      <Sfx f={f} start={RAISE} text="LET'S GOOO!" x={540} y={660} size={150} rot={-5} fill="#FFD064" dur={20} />
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={54} colors={[RED, '#FFC9C9', '#FFFFFF', '#FFD064', '#F2853A']} />
    </Stage>
  );
};
