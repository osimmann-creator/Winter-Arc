// Jickle #2: "CHEF'S KISS" - the non-volley zone is called the kitchen, so: chef's hat on, tiles
// down. Two soft dinks with the pinky out, then a drop shot that clips the tape, rolls along it...
// and dies on our side. Chef's kiss.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, lerp, poseAt, Key } from '../lib/anim';
import { Stage, Cam, camP } from '../fx/Stage';
import { Sfx, GlowDefs, Sparks, Twinkle, Ring, ConfettiRain } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { Paddle, PADDLE_FACE, Ball } from './Jickle';
import { JCourt, JNet, jP, jS, jR, jUn, ChefHat, NetSign, JGREEN, JGREEN_D } from './JickleKit';

const XH = 0.4;
const ZH = 7.6;
const [GX, GY] = jP(XH, ZH);
const SC = jS(ZH);
const HAT = 10;
const C1 = 20;
const C2 = 40;
const C3 = 60;
const TAPE = 70;
const DROP = 82;
const KISS = 90;
const OPEN = 96;
const CARD = 104;

const READY: Partial<Pose> = {
  hipL: 20, hipR: 20, knL: -34, knR: -34, thL: 0.88, thR: 0.88, ftL: 4, ftR: 4, torsoSy: 0.95,
  shR: 24, elR: -92, wrR: 24, uaR: 1, faR: 0.9, handR: 'fist',
  shL: 30, elL: 122, wrL: -34, handL: 'open', flexL: 0.3, flexR: 0.6,
  lid: 0.32, smile: 0.7, mouthSkew: 0.45, mouthOpen: 0.08, brow: 0.25, browTilt: -0.2, lookY: 0.35, lookX: 0,
};
const DINK: Partial<Pose> = { ...READY, shR: 30, elR: -100, wrR: 4, sy: 0.98, mouthOpen: 0.18 };
const NERVOUS: Partial<Pose> = {
  ...READY, shL: 34, elL: 146, wrL: 0, handL: 'fist', shR: 16, elR: 24, lid: 0, pupil: 1.25, brow: 1, browTilt: 0.4,
  mouthMode: 'o', mouthOpen: 0.35, smile: 0.3, mouthSkew: 0, lookY: 0.9, lookX: -0.15, torsoSy: 0.93,
};
const YES: Partial<Pose> = {
  ...READY, hipL: 12, hipR: 12, knL: -10, knR: -10, thL: 0.98, thR: 0.98, torsoSy: 1, shL: 70, elL: 150, wrL: 0, handL: 'fist', flexL: 1.4,
  shR: 16, elR: 20, lid: 0, pupil: 1, brow: 0.9, browTilt: 0, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, mouthSkew: 0, lookY: 0, lookX: 0,
};
const KISSING: Partial<Pose> = {
  ...YES, shL: 20, elL: 140, handL: 'grip', flexL: 0.5, lid: 1, mouthMode: 'o', mouthOpen: 0.12, smile: 0.6, brow: 0.6, blush: 0.4, head: -4,
};
const OPENED: Partial<Pose> = {
  ...YES, shL: 118, elL: 18, wrL: -24, handL: 'open', flexL: 0.6, lid: 0.85, mouthMode: 'grin', mouthOpen: 0.5, smile: 1, brow: 0.7, blush: 0.6, head: 6, turn: -0.12,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...READY, lookY: -0.6, lid: 0, brow: 0.6 } },
  { f: HAT, p: { ...READY, sy: 0.94, lookY: -0.2 }, e: E.in },
  { f: HAT + 5, p: READY, e: E.out },
  { f: C1 - 5, p: READY },
  { f: C1, p: DINK, e: E.out },
  { f: C1 + 8, p: READY, e: E.inOut },
  { f: C2 - 5, p: READY },
  { f: C2, p: DINK, e: E.out },
  { f: C2 + 8, p: READY, e: E.inOut },
  { f: C3 - 5, p: { ...READY, lid: 0.15, mouthSkew: 0.7 } },
  { f: C3, p: { ...DINK, wrR: -6 }, e: E.out },
  { f: TAPE - 2, p: NERVOUS, e: E.inOut },
  { f: DROP - 1, p: { ...NERVOUS, torsoSy: 0.91, lookX: -0.05 } },
  { f: DROP + 3, p: YES, e: E.back },
  { f: KISS - 2, p: { ...YES, mouthOpen: 0.4 } },
  { f: KISS + 2, p: KISSING, e: E.out },
  { f: OPEN - 1, p: KISSING },
  { f: OPEN + 3, p: OPENED, e: E.back },
  { f: 140, p: OPENED },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  // lil bounce on the toes between dinks
  const bob = f < TAPE - 4 ? Math.max(0, Math.sin(f / 3.2)) * 6 : 0;
  p = plant(p, bob);
  const kiss = kf(f, [[KISS - 4, 0], [KISS + 1, 1, E.out], [OPEN - 1, 1], [OPEN + 2, 0, E.in]]);
  if (kiss > 0) {
    const r = rig(p);
    const m = r.mouth();
    const q = { ...p, ...reach(p, 'L', [m[0] - 4, m[1] + 6], -1, 34) };
    p = { ...p, shL: lerp(p.shL, q.shL, kiss), elL: lerp(p.elL, q.elL, kiss) };
  }
  return p;
};

type V3 = [number, number, number];
const faceStage = (f: number): [number, number] => {
  const p = solve(f);
  const r = rig(p);
  const w = r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]);
  return [GX + w[0] * SC, GY + w[1] * SC];
};
const faceWorld = (f: number): V3 => {
  const [sx, sy] = faceStage(f);
  const u = jUn(sx, sy, ZH - 0.4);
  return [u.X, ZH - 0.4, u.h];
};

/** Ball position in the world at frame f, or null when it's out of play. */
const ballAt = (f: number): V3 | null => {
  const legs: { f0: number; f1: number; a: V3; b: V3; arc: number }[] = [
    { f0: C1 - 10, f1: C1, a: [-1.2, -3.6, 2.4], b: faceWorld(C1), arc: 2.2 },
    { f0: C1, f1: C1 + 10, a: faceWorld(C1), b: [1.4, -3.6, 2.0], arc: 2.0 },
    { f0: C2 - 10, f1: C2, a: [1.8, -3.6, 2.4], b: faceWorld(C2), arc: 2.2 },
    { f0: C2, f1: C2 + 10, a: faceWorld(C2), b: [-1.6, -3.6, 2.0], arc: 2.0 },
    { f0: C3 - 10, f1: C3, a: [-0.8, -3.6, 2.6], b: faceWorld(C3), arc: 3.0 },
    { f0: C3, f1: TAPE, a: faceWorld(C3), b: [-0.5, 0.05, 3.05], arc: 1.4 },
  ];
  for (const l of legs) {
    if (f >= l.f0 && f < l.f1) {
      const t = (f - l.f0) / (l.f1 - l.f0);
      return [lerp(l.a[0], l.b[0], t), lerp(l.a[1], l.b[1], t), lerp(l.a[2], l.b[2], t) + l.arc * 4 * t * (1 - t)];
    }
  }
  if (f >= TAPE && f < DROP) {
    // rolling along the tape... teetering
    const t = (f - TAPE) / (DROP - TAPE);
    const hop = Math.abs(Math.sin(t * Math.PI * 2.5)) * 0.18 * (1 - t);
    return [lerp(-0.5, 0.55, E.out(t)), 0.05 - t * 0.04, 3.05 + hop];
  }
  if (f >= DROP && f < DROP + 8) {
    const t = (f - DROP) / 8;
    return [0.6 + t * 0.2, lerp(0.01, -0.5, t), 3.05 - 3.6 * t * t];
  }
  return null;
};

export const JickleChefScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const handL = toStage(r.handL());
  const b = ballAt(f);
  const cam: Cam = {
    cx: kf(f, [[0, 560], [TAPE - 4, 560], [TAPE + 2, 520, E.inOut], [KISS - 6, 520], [KISS, 600, E.inOut], [CARD + 6, 570, E.inOut]]),
    cy: kf(f, [[0, 870], [HAT + 6, 900, E.inOut], [TAPE - 6, 910], [TAPE + 2, 1150, E.inOut], [DROP + 2, 1160], [KISS, 830, E.inOut], [CARD + 6, 900, E.inOut]]),
    z: kf(f, [[0, 1.62], [HAT + 6, 1.75, E.inOut], [TAPE - 6, 1.75], [TAPE + 2, 1.8, E.inOut], [DROP + 2, 1.84], [KISS, 2.2, E.inOut], [CARD + 6, 1.75, E.inOut]]),
  };
  const s1 = shake(f, DROP + 3, 8, 8, 1);
  const sh = { x: s1.x, y: s1.y, r: s1.r };
  const hatDrop = E.out(seg(f, 2, HAT));
  const hatWob = Math.sin(seg(f, HAT, HAT + 14) * Math.PI * 3) * 8 * (1 - seg(f, HAT, HAT + 14));
  const ballNode = (() => {
    if (!b) return null;
    const [x, y] = jP(b[0], b[1], b[2]);
    return <Ball x={x} y={y} r={jR(b[1])} rot={f * 9} />;
  })();
  const shadowNode = b && b[1] > 0.3 ? (() => {
    const [x, y] = jP(b[0], b[1], 0);
    return <ellipse cx={x} cy={y} rx={jR(b[1]) * 0.9} ry={jR(b[1]) * 0.3} fill="#000" opacity={0.22} />;
  })() : null;
  const tape = jP(0, 0, 2.86);
  const contacts = [C1, C2, C3].map((c) => ({ c, at: faceStage(c) }));

  return (
    <Stage bg="#7DB0FA" overlay={<EndCard f={f} start={CARD} lines={["CHEF'S KISS"]} pts="+0.5" color={JGREEN} dark={JGREEN_D} y={96} />}>
      <GlowDefs />
      <JCourt f={f} cam={cam} sh={sh} theme="day" kitchen="tiles" banner="JICKLE CLUB">
        {shadowNode}
        <ellipse cx={GX} cy={GY + 4} rx={150 * SC} ry={22 * SC} fill="#000" opacity={0.25} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          shadow={false}
          itemR={<Paddle />}
          itemBehindR
          headExtra={
            <g transform={`translate(0 ${-520 * (1 - hatDrop)})`} opacity={seg(f, 2, 4)}>
              <ChefHat wob={hatWob} />
            </g>
          }
        />
        {b && b[1] > 0 ? ballNode : null}
        {contacts.map(({ c, at }) => (
          <Ring key={c} x={at[0]} y={at[1]} t={seg(f, c, c + 8)} r={60} w={10} />
        ))}
        <JNet f={f} wob={kf(f, [[TAPE, 0], [TAPE + 2, 1], [DROP + 6, 0]])} sign={<NetSign x={tape[0] - 330} y={tape[1] + 120} s={0.8} text="THE KITCHEN" rot={-3} />} />
        {b && b[1] <= 0 ? ballNode : null}
        <Twinkle x={handL[0] - 20} y={handL[1] - 30} s={0.8} t={seg(f, OPEN + 1, OPEN + 12)} color="#FFFFFF" />
        <Twinkle x={handL[0] - 90} y={handL[1] + 30} s={0.6} t={seg(f, OPEN + 4, OPEN + 16)} color="#FFD064" rot={30} />
        <Twinkle x={handL[0] + 40} y={handL[1] - 90} s={0.55} t={seg(f, OPEN + 6, OPEN + 18)} color="#FFFFFF" rot={60} />
        <Sparks f={f} start={OPEN + 1} seed={22} n={14} x={handL[0]} y={handL[1]} speed={[8, 18]} g={0.25} size={[10, 18]} shape="heart" colors={['#EE5982', '#FF8FB0', '#FFFFFF']} />
      </JCourt>
      <g transform={camP(cam, 1, sh)}>
        <Sfx f={f} start={C1} text="dink" x={contacts[0].at[0] + 130} y={contacts[0].at[1] - 60} size={64} rot={-8} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={C2} text="dink" x={contacts[1].at[0] + 130} y={contacts[1].at[1] - 60} size={64} rot={8} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={C3} text="dink..." x={contacts[2].at[0] + 150} y={contacts[2].at[1] - 60} size={64} rot={-6} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={TAPE + 2} text="..." x={tape[0] + 10} y={tape[1] - 170} size={170} rot={0} fill="#FFFFFF" dur={DROP - TAPE - 1} shake={false} />
      </g>
      <Sfx f={f} start={DROP + 3} text="DEAD BALL!" x={540} y={1500} size={120} rot={-5} fill="#FFD064" dur={16} />
      <Sfx f={f} start={KISS + 1} text="MWAH!" x={300} y={560} size={150} rot={-8} fill="#FF8FB0" dur={18} />
      <ConfettiRain f={f} start={OPEN + 4} n={44} seed={23} colors={[JGREEN, '#FFFFFF', '#E2504F', '#FFD064']} />
    </Stage>
  );
};
