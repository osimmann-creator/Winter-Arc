// Run #7: "GREEN LIGHT" - jogging on the spot at a crosswalk, checking his (imaginary) watch...
// the signal flips to WALK and he launches like a sprinter. Double thumbs up.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust, Ring } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, WheelLegs } from './RunKit';
import { CityWorld, CITY, WalkSignal, P, HY, CityObj } from './CityKit';

const GX = 540;
const GO = 32;
const SKID = 70;
const POSE = 78;
const CARD = 92;
const RUN = makeRun(
  [[0, 0], [GO + 1, 0], [GO + 5, 0.46, E.in], [SKID - 4, 0.44], [SKID + 6, 0.03, E.out], [SKID + 10, 0, E.out]],
  [[0, 11], [GO, 11], [GO + 5, 6.2, E.in], [SKID, 6.2], [SKID + 6, 14, E.out]],
  [SKID + 2, SKID + 8],
);
const turboAt = (f: number) => seg(f, GO + 2, GO + 6) * (1 - seg(f, SKID - 2, SKID + 4));
const SIGNAL_S = 2.35;

const THUMBS: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, shinL: 1, shinR: 1,
  shL: 30, shR: 30, elL: 142, elR: 142, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: -64, wrR: -64, handL: 'thumb', handR: 'thumb',
  torso: 0, head: 0, torsoSy: 1, sy: 1, sx: 1, chestS: 1.06, flexL: 1.2, flexR: 1.2,
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'normal', sweat: 0.4, lookX: 0, lookY: 0, turn: 0,
};

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = turboAt(f);
  if (f < GO + 2) {
    // jogging on the spot: smaller strides, impatient
    const g = gait(ph, 0);
    const watch = seg(f, 9, 13) * (1 - seg(f, 22, 26));
    const p: Pose = {
      ...BASE,
      ...g,
      hipL: (g.hipL ?? 0) * 0.6, hipR: (g.hipR ?? 0) * 0.6, thL: lerp(1, g.thL ?? 1, 0.55), thR: lerp(1, g.thR ?? 1, 0.55),
      shL: lerp(g.shL ?? 0, 34, watch), elL: lerp(g.elL ?? 0, -118, watch), faL: lerp(g.faL ?? 1, 0.85, watch), wrL: lerp(g.wrL ?? 0, 10, watch),
      lookX: lerp(0.9, -0.5, watch), lookY: lerp(-0.2, 0.9, watch), turn: lerp(0.35, -0.25, watch),
      mouthMode: f > 14 && f < 28 ? 'grit' : 'grin', mouthOpen: 0.2, mouthSkew: f > 14 ? -0.6 : 0.3, smile: 0.7,
      brow: f > 14 ? -0.2 : 0.5, browTilt: f > 14 ? -0.6 : 0.2, lid: f > 14 ? 0.35 : 0.1, sweat: 0,
    };
    if (f >= GO - 3) {
      // crouch to launch
      const t = seg(f, GO - 3, GO + 1);
      return plant({ ...p, sy: 1 - 0.08 * t, hipL: lerp(p.hipL, 30, t), hipR: lerp(p.hipR, 30, t), knL: lerp(p.knL, -44, t), knR: lerp(p.knR, -44, t), thL: lerp(p.thL, 0.72, t), thR: lerp(p.thR, 0.72, t), lookX: 0, lookY: 0, turn: 0, eyeMode: 'star', mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1, browTilt: 0 }, 0);
    }
    return plant(p, runLift(ph) * 0.6);
  }
  const g = gait(ph, turbo);
  if (f < SKID) return plant({ ...BASE, ...g, eyeMode: f < GO + 6 ? 'star' : 'normal' }, runLift(ph));
  const keys: Key<Pose>[] = [
    { f: SKID, p: { ...BASE, ...g } },
    { f: SKID + 5, p: STOP, e: E.out },
    { f: POSE - 2, p: { sy: 0.9, sx: 1.07 }, e: E.inOut },
    { f: POSE + 2, p: { ...THUMBS, sy: 1.07, sx: 0.95 }, e: E.out },
    { f: POSE + 6, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
    { f: POSE + 10, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 94, p: { wink: 1, mouthSkew: 0.5, turn: 0.2, lookX: 0.5 }, e: E.inOut },
    { f: 106, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
    { f: 150, p: {} },
  ];
  return plant(poseAt(f, BASE, keys));
};

export const GreenLightScene: React.FC = () => {
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
  const walk = f >= GO - 4 ? 1 : 0;
  const blink = f >= 18 && f < GO - 4 && Math.floor(f / 3) % 2 === 1;
  const signal: CityObj = {
    X: 1.62, S: SIGNAL_S, key: 'sig',
    draw: (x, y, s) => <WalkSignal key="sig" x={x} y={y} s={s * 1.25} walk={walk} blink={blink} />,
  };
  const signal2: CityObj = { X: -1.62, S: SIGNAL_S + 0.2, key: 'sig2', draw: (x, y, s) => <WalkSignal key="sig2" x={x} y={y} s={s * 1.25} walk={walk} blink={blink} /> };
  const sp = P(1.62, SIGNAL_S + D);
  const cam: Cam = {
    cx: kf(f, [[0, 690], [GO - 6, 680], [GO + 4, 540, E.inOut]]),
    cy: kf(f, [[0, 940], [GO - 6, 960], [GO + 2, 1040, E.out], [SKID, 1000], [POSE + 6, 1060, E.inOut], [CARD + 6, 1020, E.inOut]]),
    z: kf(f, [[0, 0.9], [GO - 6, 0.98, E.inOut], [GO + 1, 1.12, E.in], [GO + 8, 0.94, E.out], [SKID, 0.96], [POSE + 6, 1.04, E.out], [CARD + 6, 1.0, E.inOut]]),
    r: kf(f, [[GO, 0], [GO + 3, 2, E.out], [GO + 14, 0, E.inOut]]),
  };
  const s1 = shake(f, GO + 2, 12, 24, 1);
  const s2 = shake(f, SKID, 10, 12, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };
  const sigTop = { x: sp.x, y: sp.y - (2000 * 1.25) / (SIGNAL_S + D) };

  return (
    <Stage impact={f === GO + 2} overlay={<EndCard f={f} start={CARD} lines={['GREEN LIGHT']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.golden} seed={17} extra={[signal, signal2]} crosswalks={[0.9, 26]} blur={turbo} />
      <g transform={camP(cam, 1, sh)}>
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1900} n={40} opacity={0.5 * turbo} width={7} /> : null}
        <Glow x={sigTop.x} y={sigTop.y} r={kf(f, [[GO - 5, 0], [GO - 3, 300, E.out], [GO + 6, 0]])} id="glowW" o={0.9} />
        <Ring x={sigTop.x} y={sigTop.y} t={seg(f, GO - 4, GO + 8)} r={260} w={16} />
        <Glow x={540} y={chest[1]} r={kf(f, [[GO + 1, 0], [GO + 4, 640, E.out], [GO + 16, 0]])} id="glowY" o={0.8} />
        <Burst x={540} y={GY - 40} r={420} t={seg(f, GO + 2, GO + 15)} seed={33} />
        <Burst x={540} y={chest[1]} r={420} t={seg(f, POSE, POSE + 17)} seed={34} />
        <Hero p={p} x={GX} y={GY} scale={scale} />
        <WheelLegs knees={knees} f={f} o={turbo} />
        {Array.from({ length: 7 }).map((_, i) => {
          const start = GO + 3 + i * 5;
          return f < SKID + 2 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={48} seed={i + 50} rise={1.2} /> : null;
        })}
        <Dust f={f} start={GO + 2} x={540} y={GY} n={9} spread={420} size={64} seed={57} />
        <Dust f={f} start={SKID} x={540} y={GY} n={8} spread={380} size={60} seed={58} />
        <Sparks f={f} start={SKID} seed={59} n={14} x={540} y={GY} speed={[10, 24]} g={0.9} size={[10, 18]} colors={['#FFD064', '#FFFFFF']} />
        <Sparks f={f} start={POSE} seed={60} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 96, 110)} />
        <Sfx f={f} start={4} text="tap tap tap" x={300} y={head[1] - 40} size={80} rot={-8} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={14} text="C'MONNN..." x={330} y={head[1] - 90} size={100} rot={-6} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={GO - 4} text="WALK!" x={sigTop.x - 60} y={sigTop.y - 150} size={110} rot={8} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={GO + 2} text="GO GO GO!" x={540} y={head[1] - 120} size={170} rot={-6} fill="#FFD064" dur={20} />
        <Sfx f={f} start={SKID} text="SKRRT!" x={800} y={GY - 160} size={120} rot={10} fill="#FFFFFF" dur={14} />
      </g>
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.golden} seed={17} layer="front" extra={[signal, signal2]} />
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={35} />
    </Stage>
  );
};
