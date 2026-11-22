// Gym #7: "BOX JUMP" - every time he jumps, another plyo box slides in under him. Three hops,
// then a monster jump onto a six-box tower (he bonks the lamp on the way). Sticks it anyway.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, wobble } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust, Twinkle } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { stageOf } from './kit';
import { GymRoomBG, FloorShadow, PlyoBox, PendantLamp } from './GymRoom';

const GX = 540;
const GY = 1700;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const BOX_H = 220;
const LABELS = ['20', '30', '40', '60', '80', '100'];
/** lift (stage px above the floor) for standing on n boxes */
const H = (n: number) => (n === 0 ? 0 : n * BOX_H + 20);
type Hop = { t: number; a: number; l: number; from: number; to: number; apex: number };
const HOPS: Hop[] = [
  { t: 9, a: 15, l: 20, from: 0, to: 1, apex: H(1) + 130 },
  { t: 25, a: 31, l: 36, from: 1, to: 2, apex: H(2) + 130 },
  { t: 41, a: 47, l: 52, from: 2, to: 3, apex: H(3) + 130 },
  { t: 63, a: 73, l: 81, from: 3, to: 6, apex: H(6) + 160 },
];
const BIG = HOPS[3];
const BONK = BIG.a;
const WIN = 88;
const CARD = 96;
/** [arrive start, arrive end] per box (index 0 = bottom box) */
const BOX_IN: [number, number][] = [
  [HOPS[0].t + 1, HOPS[0].a + 2],
  [HOPS[1].t + 1, HOPS[1].a + 2],
  [HOPS[2].t + 1, HOPS[2].a + 2],
  [64, 69],
  [67, 72],
  [70, 75],
];

const liftAt = (f: number) => {
  for (const h of HOPS) {
    if (f < h.t) return H(h.from);
    if (f < h.a) return lerp(H(h.from), h.apex, E.out(seg(f, h.t, h.a)));
    if (f < h.l) return lerp(h.apex, H(h.to), E.in(seg(f, h.a, h.l)));
  }
  return H(6);
};

/* ------------------------------- poses ------------------------------- */
const STAND: Partial<Pose> = { hipL: 9, hipR: 9, knL: -6, knR: -6, shL: 16, shR: 16, elL: -30, elR: -30, smile: 1, mouthOpen: 0.15, brow: 0.5, lookX: 0.2, turn: 0.1 };
const CROUCH: Partial<Pose> = {
  hipL: 34, hipR: 34, knL: -46, knR: -46, thL: 0.68, thR: 0.68, ftL: 8, ftR: 8, torsoSy: 0.9, sy: 0.93,
  shL: 14, shR: 14, elL: 30, elR: 30, uaL: 0.8, uaR: 0.8, handL: 'fist', handR: 'fist',
  lookY: -0.5, lookX: 0, turn: 0, mouthMode: 'grit', mouthOpen: 0, lid: 0.3, browTilt: -0.7, brow: -0.1,
};
const AIR: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -64, knR: -64, thL: 0.62, thR: 0.62, ftL: 14, ftR: 14, torsoSy: 1, sy: 1.02,
  shL: 162, shR: 162, elL: -12, elR: -12, uaL: 1, uaR: 1, handL: 'open', handR: 'open',
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, browTilt: 0, brow: 0.9, lookY: -0.3,
};
const LANDED: Partial<Pose> = {
  hipL: 24, hipR: 24, knL: -34, knR: -34, thL: 0.82, thR: 0.82, ftL: 6, ftR: 6, torsoSy: 0.94, sy: 0.94, sx: 1.04,
  shL: 60, shR: 60, elL: 40, elR: 40, uaL: 1, uaR: 1, handL: 'open', handR: 'open', mouthMode: 'grin', mouthOpen: 0.5, smile: 1, lookY: 0,
};
const VICTORY: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, torsoSy: 1, sy: 1, sx: 1, chestS: 1.06,
  shL: 152, shR: 152, elL: -14, elR: -14, handL: 'fist', handR: 'fist', flexL: 1, flexR: 1,
  mouthMode: 'grin', mouthOpen: 1, smile: 1, eyes: 1, eyeMode: 'normal', brow: 0.8, browTilt: 0, lid: 0, lookX: 0, lookY: 0, turn: 0, head: 0,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: STAND },
  { f: 6, p: { ...CROUCH, hipL: 22, hipR: 22, knL: -26, knR: -26, thL: 0.86, thR: 0.86, sy: 0.97, mouthMode: 'grin', smile: 0.9, lid: 0.25, browTilt: -0.3 } },
  ...HOPS.slice(0, 3).flatMap((h, i): Key<Pose>[] => [
    { f: h.t, p: { ...AIR, sy: 1.06 }, e: E.out },
    { f: h.a, p: AIR },
    { f: h.l, p: LANDED, e: E.in },
    { f: h.l + 3, p: { ...LANDED, sy: 0.9, sx: 1.07 }, e: E.out },
    { f: h.l + 5, p: i < 2 ? { ...CROUCH, hipL: 22, hipR: 22, knL: -26, knR: -26, thL: 0.86, thR: 0.86, sy: 0.97, mouthMode: 'grin', smile: 1, lid: 0.2 } : { ...LANDED, sy: 1, sx: 1 }, e: E.inOut },
  ]),
  { f: 56, p: { ...STAND, lookX: 0.5, turn: 0.25, lookY: -0.3, smile: 1, mouthSkew: 0.6, brow: 1 } },
  { f: BIG.t - 2, p: { ...CROUCH, hipL: 40, hipR: 40, knL: -58, knR: -58, thL: 0.56, thR: 0.56, sy: 0.88, red: 0.6, lid: 0.5, sweat: 1 }, e: E.inOut },
  { f: BIG.t + 2, p: { ...AIR, sy: 1.1, sx: 0.95 }, e: E.out },
  { f: BONK - 1, p: { ...AIR, hipL: 30, hipR: 30, thL: 0.5, thR: 0.5, knL: -76, knR: -76 } },
  { f: BONK + 2, p: { ...AIR, eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.7, shL: 120, shR: 120, elL: 30, elR: 30, handL: 'open', handR: 'open' }, e: E.out },
  { f: BIG.l, p: { ...LANDED, eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.4 }, e: E.in },
  { f: BIG.l + 3, p: { ...LANDED, sy: 0.88, sx: 1.08, eyeMode: 'spiral' }, e: E.out },
  { f: 85, p: { ...LANDED, sy: 1, sx: 1, eyeMode: 'normal', mouthMode: 'grin', head: -10, turn: -0.3 }, e: E.inOut },
  { f: WIN, p: VICTORY, e: E.back },
  { f: 100, p: { chestS: 1.1 } },
  { f: 140, p: {} },
];

const solve = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  const shakeHead = f > 82 && f < WIN ? Math.sin(f * 2.4) * 10 : 0;
  const planted = plant({ ...p, head: p.head + shakeHead });
  return { ...planted, y: planted.y - liftAt(f) / SC };
};

/** the lamp hangs exactly where his head peaks */
const LAMP_Y = toStage(rig(solve(BONK)).headTop())[1] - 84;

/* ------------------------------- scene ------------------------------- */
export const BoxJumpScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const lift = liftAt(f);
  const feetY = GY - lift;

  // camera follows the stack
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [
      [0, 1240], [HOPS[0].l, 1150, E.inOut], [HOPS[1].l, 1000, E.inOut], [HOPS[2].l, 860, E.inOut], [BIG.t, 860],
      [BONK, -250, E.inOut], [BIG.l, -330, E.out], [WIN, -390, E.inOut], [CARD + 6, -430, E.inOut], [140, -440],
    ]),
    z: kf(f, [[0, 1.12], [10, 1.0, E.out], [BIG.t - 4, 1.06, E.inOut], [BIG.t + 4, 0.82, E.out], [BONK, 0.92], [BIG.l + 2, 1.02, E.out], [WIN, 1.0], [CARD + 6, 0.95, E.inOut]]),
    r: kf(f, [[BONK, 0], [BONK + 2, -2.5, E.out], [BONK + 10, 0, E.inOut]]),
  };
  const sh0 = shake(f, BONK, 12, 18, 3);
  const sh1 = shake(f, BIG.l, 18, 26, 4);
  const sh = { x: sh0.x + sh1.x, y: sh0.y + sh1.y, r: sh1.r };
  // the tower sways once he lands on top
  const sway = f >= BIG.l ? wobble(f, BIG.l, 0.22, 0.06, 2.4) : 0;

  const boxes = BOX_IN.map(([a, b], i) => {
    if (f < a) return null;
    const side = i % 2 === 0 ? 1 : -1;
    const t = E.out(seg(f, a, b));
    const x = 540 + side * 1000 * (1 - t);
    const rot = side * 10 * (1 - t) + (f >= b ? wobble(f, b, 0.5, 0.18, side * 3) : 0);
    return <PlyoBox key={i} x={x} y={GY - i * BOX_H} w={440} h={BOX_H} top={42} label={LABELS[i]} rot={rot} />;
  });
  const lampSwing = f >= BONK ? wobble(f, BONK, 0.16, 0.035, 3.2) : 0;
  const bodyTrail = trail((ff) => toStage(rig(solve(ff)).W(rig(solve(ff)).torso, 0, -150)), f, 7);

  return (
    <Stage impact={f === BONK} overlay={<EndCard f={f} start={CARD} lines={['BOX JUMP']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymRoomBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <FloorShadow x={540} y={GY + 4} w={lerp(230, 120, seg(lift, 0, 300))} o={f < HOPS[0].a + 2 ? 0.26 : 0} />
        {/* the lamp he bonks */}
        <PendantLamp x={540} y={LAMP_Y} cord={1600} swing={lampSwing} s={1.4} />
        <g transform={`rotate(${sway} 540 ${GY})`}>
          {boxes}
          {HOPS.map((h, i) =>
            f >= h.l && f < h.l + 30 ? <Dust key={i} f={f} start={h.l} x={540} y={GY - H(h.to) + 6} n={i === 3 ? 9 : 5} spread={i === 3 ? 420 : 260} size={i === 3 ? 64 : 48} seed={i + 3} /> : null,
          )}
          {f >= BIG.t - 1 && f <= BONK ? <Swoosh pts={bodyTrail} width={320} opacity={0.55} /> : null}
          <Ring x={540} y={feetY + 10} t={seg(f, BIG.l, BIG.l + 16)} r={430} sy={0.22} w={26} />
          <Glow x={540} y={head[1] + 280} r={kf(f, [[WIN - 1, 0], [WIN + 3, 560, E.out], [WIN + 24, 380]])} id="glowY" o={seg(f, WIN - 1, WIN + 1) * (1 - seg(f, 112, 130) * 0.5)} />
          <Burst x={540} y={head[1] + 300} r={430} t={seg(f, WIN, WIN + 17)} seed={8} />
          {f >= WIN && f < WIN + 14 ? <FocusLines f={f} cx={540} cy={head[1] + 300} r0={470} opacity={0.6 * (1 - seg(f, WIN + 6, WIN + 14))} /> : null}
          <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} />
          {/* stars circling after the bonk */}
          {f >= BONK && f < WIN
            ? [0, 1, 2].map((i) => {
                const a = f / 3 + (i * Math.PI * 2) / 3;
                return <Twinkle key={i} x={head[0] + Math.cos(a) * 130} y={head[1] + 40 + Math.sin(a) * 34} s={0.9} t={0.5} color="#FFD064" />;
              })
            : null}
          <Sparks f={f} start={WIN} seed={9} n={22} x={540} y={head[1] + 300} speed={[16, 38]} g={0.8} size={[14, 26]} />
          <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, WIN + 6, WIN + 20)} />
        </g>
        {HOPS.slice(0, 3).map((h, i) => (
          <Sfx key={i} f={f} start={h.t} text="HOP!" x={i % 2 ? 250 : 830} y={GY - H(h.to) - 760} size={110} rot={i % 2 ? -10 : 10} fill="#FFFFFF" dur={12} />
        ))}
        <Sfx f={f} start={BIG.t - 6} text="NNNGH!" x={540} y={GY - H(3) - 1020} size={130} rot={-5} fill="#FFD064" dur={10} />
        <Sfx f={f} start={BONK} text="BONK!" x={790} y={-560} size={170} rot={10} fill="#FFD064" dur={20} />
        <Sfx f={f} start={BIG.l + 1} text="STUCK IT!" x={540} y={GY - H(6) + 230} size={130} rot={-4} fill="#FFFFFF" dur={20} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={12} />
    </Stage>
  );
};
