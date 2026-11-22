// Jickle #3: "THE ERNE" - beach court at sunset. The ball goes wide down the line; he sprints,
// launches past the sideline (silhouetted against the sun), smashes it out of the air, lands in
// the sand and slides, then paddle on the shoulder and a finger point. Too easy.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, lerp, poseAt, Key } from '../lib/anim';
import { Stage, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Sparks, Dust, Burst, Ring, Glint, ConfettiRain } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { gait } from './RunKit';
import { Paddle, PADDLE_FACE, Ball } from './Jickle';
import { JCourt, JNet, jP, jS, jR, jUn, jK, JGREEN, JGREEN_D } from './JickleKit';

const RUN0 = 4;
const TAKE = 24;
const HIT = 33;
const LAND = 42;
const SLIDE = 54;
const COOL = 62;
const POINT = 76;
const CARD = 98;
const LIFT_FT = 2.8;

const heroX = (f: number) => {
  if (f < RUN0) return -4;
  if (f < TAKE) {
    const t = (f - RUN0) / (TAKE - RUN0);
    return -4 + 8 * (0.5 * t + 0.5 * t * t);
  }
  if (f < LAND) return 4 + (f - TAKE) * 0.5;
  return 13 + 1.5 * E.out(seg(f, LAND, SLIDE));
};
const heroZ = (f: number) => kf(f, [[TAKE, 8], [LAND, 7.2, E.linear]]);
const liftFt = (f: number) => (f > TAKE && f < LAND ? 4 * ((f - TAKE) / (LAND - TAKE)) * (1 - (f - TAKE) / (LAND - TAKE)) * LIFT_FT : 0);
const stageX = (f: number) => jP(heroX(f), heroZ(f))[0];

const READY: Partial<Pose> = {
  hipL: 20, hipR: 20, knL: -34, knR: -34, thL: 0.88, thR: 0.88, ftL: 4, ftR: 4, torsoSy: 0.95,
  shR: 24, elR: -92, wrR: 24, uaR: 1, faR: 0.9, handR: 'fist', shL: 36, elL: -50, handL: 'open',
  lid: 0.2, smile: 0.8, mouthOpen: 0.1, brow: 0.2, lookX: 0.6, lookY: -0.3,
};
const CROUCH: Partial<Pose> = {
  ...READY, hipL: 24, hipR: 24, knL: -56, knR: -56, thL: 0.8, thR: 0.8, sy: 0.9, sx: 1.04, rot: 6,
  shR: 40, elR: 30, wrR: 0, faR: 1, shL: 40, elL: 30, lookX: 0.7, lookY: -0.8, lid: 0.3, browTilt: -0.8, mouthMode: 'grit', mouthOpen: 0.1,
};
const LEAP: Partial<Pose> = {
  rot: 14, hipL: 40, knL: -112, thL: 0.86, hipR: 12, knR: -24, thR: 1, ftL: 24, ftR: 10, sx: 1, sy: 1, torsoSy: 1.03,
  shR: 166, elR: 14, wrR: -20, uaR: 1, faR: 1, shL: 98, elL: 28, handL: 'open',
  mouthMode: 'grin', mouthOpen: 0.75, smile: 1, lid: 0.1, brow: -0.2, browTilt: -0.8, lookX: 0.6, lookY: -0.9,
};
const SMASHED: Partial<Pose> = { ...LEAP, shR: 96, elR: -24, wrR: -40, rot: 20, mouthOpen: 1, lid: 0, brow: 0.6, browTilt: 0, lookX: 0.1, lookY: 0.3 };
const LANDED: Partial<Pose> = {
  rot: 2, hipL: 34, hipR: 34, knL: -80, knR: -80, thL: 0.76, thR: 0.76, ftL: 6, ftR: 6, sy: 0.88, sx: 1.07, torsoSy: 0.94,
  shL: 112, elL: 22, handL: 'open', shR: 74, elR: 24, wrR: 0, mouthMode: 'grin', mouthOpen: 0.6, smile: 1, lid: 0, brow: 0.8, lookX: -0.2, lookY: 0,
};
const SLID: Partial<Pose> = { ...LANDED, rot: -9, shL: 120, shR: 60, lookX: -0.4, mouthMode: 'grin', mouthOpen: 0.9 };
const CHILL: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 0, ftR: 0, rot: 0, sy: 1, sx: 1, torsoSy: 1, chestS: 1.06,
  shR: 30, elR: 150, wrR: -22, uaR: 1, faR: 1, shL: 30, elL: -96, handL: 'fist', flexL: 0.9, flexR: 1.4,
  mouthMode: 'grin', mouthOpen: 0.3, smile: 1, mouthSkew: 0.6, lid: 0.35, brow: 0.3, browTilt: -0.4, lookX: 0, lookY: 0, turn: 0.1,
};
const POINTY: Partial<Pose> = {
  ...CHILL, shL: 54, elL: -18, uaL: 0.55, faL: 0.5, wrL: -10, handL: 'point', wink: 1, mouthOpen: 0.5, mouthSkew: 0.8, turn: 0.18, lookX: 0.15,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: READY },
  { f: TAKE - 4, p: READY },
  { f: TAKE - 1, p: CROUCH, e: E.out },
  { f: TAKE + 4, p: LEAP, e: E.out },
  { f: HIT - 3, p: { ...LEAP, shR: 176, elR: 30, wrR: -10 } },
  { f: HIT, p: SMASHED, e: E.in },
  { f: LAND - 3, p: { ...SMASHED, hipL: 22, knL: -40, hipR: 22, knR: -40, rot: 10, shR: 70, elR: 10 } },
  { f: LAND, p: LANDED, e: E.in },
  { f: LAND + 6, p: SLID, e: E.out },
  { f: SLIDE, p: { ...SLID, rot: -3 } },
  { f: COOL, p: CHILL, e: E.back },
  { f: POINT - 4, p: CHILL },
  { f: POINT, p: POINTY, e: E.back },
  { f: 140, p: POINTY },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  if (f >= RUN0 && f < TAKE - 3) {
    const ph = ((f - RUN0) / 6) * Math.PI * 2;
    const g = gait(ph, 0.6);
    const w = seg(f, RUN0, RUN0 + 3);
    const k = (key: keyof Pose) => lerp(p[key] as number, (g[key] as number) ?? (p[key] as number), w);
    p = {
      ...p,
      hipL: k('hipL'), hipR: k('hipR'), knL: k('knL'), knR: k('knR'), thL: k('thL'), thR: k('thR'), ftL: k('ftL'), ftR: k('ftR'),
      shinL: k('shinL'), shinR: k('shinR'), shL: k('shL'), elL: k('elL'), uaL: k('uaL'), faL: k('faL'),
      rot: 8 * w, torso: (g.torso ?? 0) * w, head: (g.head ?? 0) * w, mouthOpen: 0.5, lid: 0.25, browTilt: -0.6,
    };
    p = plant(p, Math.max(0, Math.cos(ph * 2)) * 12);
  } else {
    p = plant(p);
  }
  // hand on hip while chilling
  const hip = kf(f, [[COOL - 6, 0], [COOL, 1, E.out], [POINT - 4, 1], [POINT, 0, E.in]]);
  if (hip > 0) {
    const q = { ...p, ...reach(p, 'L', [-128, -352], 1, 30) };
    p = { ...p, shL: lerp(p.shL, q.shL, hip), elL: lerp(p.elL, q.elL, hip) };
  }
  return { ...p, y: p.y - liftFt(f) * 163 };
};

type V3 = [number, number, number];
const place = (f: number) => {
  const Z = heroZ(f);
  const [x, y] = jP(heroX(f), Z);
  return { x, y, sc: jS(Z), Z };
};
const faceWorld = (f: number): V3 => {
  const p = solve(f);
  const r = rig(p);
  const { x, y, sc, Z } = place(f);
  const w = r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]);
  const u = jUn(x + w[0] * sc, y + w[1] * sc, Z - 0.3);
  return [u.X, Z - 0.3, u.h];
};
const ballAt = (f: number): V3 | null => {
  const c = faceWorld(HIT);
  if (f >= 8 && f < HIT) {
    const t = (f - 8) / (HIT - 8);
    return [lerp(-2, c[0], t), lerp(-3.6, c[1], t), lerp(2.4, c[2], t) + 7 * 4 * t * (1 - t)];
  }
  if (f >= HIT && f < HIT + 6) {
    const t = (f - HIT) / 6;
    return [lerp(c[0], 2.5, t), lerp(c[1], -5.2, t), lerp(c[2], 1.2, t)];
  }
  return null;
};

export const JickleErneScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const { x: GX, y: GY, sc: SC } = place(f);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const face = toStage(r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]));
  const mouth = toStage(r.mouth());
  const b = ballAt(f);
  let cx = 0;
  for (let i = 0; i < 6; i++) cx += stageX(f - i) / 6;
  const air = liftFt(f) * jK(heroZ(f));
  const cam: Cam = {
    cx: cx + kf(f, [[TAKE, 0], [HIT, 80, E.inOut], [SLIDE, 0, E.inOut]]),
    cy: GY - 470 * SC - air * 0.55 + kf(f, [[COOL, 0], [POINT, 40, E.inOut]]),
    z: kf(f, [[0, 1.5], [TAKE, 1.42], [HIT, 1.22, E.out], [LAND, 1.3, E.inOut], [SLIDE, 1.48, E.inOut], [POINT, 1.62, E.inOut], [CARD + 8, 1.5, E.inOut]]),
  };
  const s1 = shake(f, HIT, 10, 16, 1);
  const s2 = shake(f, LAND, 10, 12, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const ballNode = (bb: V3, k = 1, key?: string) => {
    const [x, y] = jP(bb[0], bb[1], bb[2]);
    return <Ball key={key} x={x} y={y} r={jR(bb[1]) * k} rot={f * 14} />;
  };
  const ghosts =
    f > HIT && f < HIT + 6
      ? [3, 2, 1].map((i) => {
          const g = ballAt(f - i * 0.5);
          return g ? <g key={i} opacity={0.18 * (4 - i)}>{ballNode(g, 0.95, `g${i}`)}</g> : null;
        })
      : null;
  const paddleTrail = trail((ff) => {
    const q = solve(ff);
    const rr = rig(q);
    const pl = place(ff);
    const w = rr.W(rr.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]);
    return [pl.x + w[0] * pl.sc, pl.y + w[1] * pl.sc];
  }, f, 6);
  const feet = [GX, GY] as [number, number];
  const ballTrail = trail((ff) => {
    const q = ballAt(Math.max(HIT, ff));
    return q ? jP(q[0], q[1], q[2]) : [face[0], face[1]];
  }, f, 6, 0.6);

  return (
    <Stage bg="#6A4CC4" overlay={<EndCard f={f} start={CARD} lines={['THE ERNE']} pts="+0.5" color={JGREEN} dark={JGREEN_D} y={96} />}>
      <GlowDefs />
      <JCourt f={f} cam={cam} sh={sh} theme="sunset" banner="JICKLE BEACH" sunX={1300}>
        {b && b[1] > 0.3 ? (
          <ellipse cx={jP(b[0], b[1], 0)[0]} cy={jP(b[0], b[1], 0)[1]} rx={jR(b[1]) * 0.9} ry={jR(b[1]) * 0.3} fill="#000" opacity={0.2} />
        ) : null}
        <ellipse cx={GX} cy={GY + 4} rx={150 * SC * (1 - liftFt(f) / 6)} ry={22 * SC * (1 - liftFt(f) / 6)} fill="#000" opacity={0.25} />
        {f >= HIT - 3 && f <= HIT + 3 ? <Swoosh pts={paddleTrail} width={150} opacity={0.7} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemR={<Paddle />} itemBehindR={f >= COOL - 4} />
        {b && b[1] > 0 && f < HIT ? ballNode(b) : null}
        {f > HIT && f < HIT + 7 ? <Swoosh pts={ballTrail} width={jR(b ? b[1] : 0) * 1.8} color="#FFF3A0" opacity={0.8} /> : null}
        <Burst x={face[0]} y={face[1]} r={190} t={seg(f, HIT, HIT + 10)} seed={31} />
        <Ring x={face[0]} y={face[1]} t={seg(f, HIT, HIT + 10)} r={170} w={18} />
        <Sparks f={f} start={HIT} seed={32} n={14} x={face[0]} y={face[1]} speed={[12, 26]} size={[10, 20]} />
        <Dust f={f} start={LAND} x={feet[0]} y={feet[1]} n={10} seed={33} spread={340} size={60} color="#F7DDB0" line="#C99A5E" dir={6} />
        <Sparks f={f} start={LAND + 1} seed={34} n={22} x={feet[0] + 40} y={feet[1] - 10} speed={[10, 22]} g={0.9} size={[8, 14]} shape="sand" angle={-60} spread={70} colors={['#F1C88E', '#E0AE6B', '#FFE7BF']} />
        <JNet f={f} theme="sunset" />
        {b && b[1] <= 0 ? ballNode(b) : null}
        {b && f >= HIT ? (
          <>
            {ghosts}
            {ballNode(b)}
          </>
        ) : null}
        <Glint x={mouth[0] + 40} y={mouth[1] - 10} s={0.9} t={seg(f, POINT + 1, POINT + 14)} />
      </JCourt>
      <Sfx f={f} start={HIT} text="ERNE!" x={540} y={330} size={210} rot={-6} fill="#FFD064" dur={22} />
      <Sfx f={f} start={HIT + 5} text="BAM!" x={300} y={1650} size={150} rot={8} fill="#FFFFFF" dur={14} />
      <Sfx f={f} start={POINT} text="TOO EASY." x={540} y={310} size={130} rot={-4} fill="#FFFFFF" dur={20} />
      <ConfettiRain f={f} start={COOL} n={40} seed={35} colors={[JGREEN, '#FFD064', '#FF9F86', '#FFFFFF']} />
    </Stage>
  );
};
