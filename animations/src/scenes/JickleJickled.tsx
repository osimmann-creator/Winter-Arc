// Jickle #4: "JICKLED!" - match point at 10-0. Underhand serve, ace past your ear, the flip
// scoreboard turns to 11-0 (winning 11-0 is getting "pickled"), it rains pickles, he catches
// one and takes a big crunchy bite.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, lerp, poseAt, Key } from '../lib/anim';
import { Stage, Cam, camP } from '../fx/Stage';
import { Sfx, GlowDefs, Sparks, Ring, ConfettiRain, Twinkle } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { Paddle, PADDLE_FACE, Ball } from './Jickle';
import { JCourt, JNet, jP, jS, jR, jUn, Scoreboard, Pickle, JGREEN, JGREEN_D } from './JickleKit';
import { rng } from '../lib/shape';

const XH = 1.3;
const ZH = 21.4;
const [GX, GY] = jP(XH, ZH);
const SC = jS(ZH);
const DROP = 9;
const HIT = 16;
const PASS = 27;
const FLIP = 31;
const JICKLED = 39;
const CATCH = 60;
const BITE = 70;
const CARD = 98;
const BOARD: [number, number] = [jP(-4.3, 23)[0], jP(-4.3, 23)[1] - 600 * 0.27];

const SET: Partial<Pose> = {
  hipL: 10, hipR: 14, knL: -10, knR: -16, thL: 0.98, thR: 0.95, torsoSy: 0.98,
  shL: 34, elL: -84, wrL: 10, handL: 'grip', shR: 10, elR: 14, wrR: 30, handR: 'fist',
  lookX: -0.15, lookY: 0.5, lid: 0.3, smile: 0.8, mouthSkew: 0.5, brow: -0.1, browTilt: -0.5,
};
const SWING: Partial<Pose> = { ...SET, shL: 30, elL: 30, handL: 'open', shR: 56, elR: -84, wrR: 6, torso: -4, mouthMode: 'grit', mouthOpen: 0.1, lid: 0.15 };
const FOLLOW: Partial<Pose> = { ...SWING, shR: 128, elR: -96, wrR: -10, torso: -7, mouthMode: 'grin', mouthOpen: 0.4 };
const WATCH: Partial<Pose> = { ...FOLLOW, torso: 0, lookX: -0.45, lookY: 0.35, mouthMode: 'o', mouthOpen: 0.25, smile: 0.5, brow: 0.6, lid: 0 };
const CHEER: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, torso: 0, shL: 150, shR: 150, elL: -16, elR: -16, wrL: 0, wrR: 0,
  handL: 'fist', handR: 'fist', chestS: 1.1, flexL: 1.4, flexR: 1.4, mouthMode: 'grin', mouthOpen: 1, smile: 1, mouthSkew: 0,
  lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', lookX: 0, lookY: 0,
};
const REACH: Partial<Pose> = { ...CHEER, shL: 140, elL: 30, handL: 'open', shR: 30, elR: 150, wrR: -20, eyeMode: 'normal', lookX: -0.3, lookY: -0.8, mouthMode: 'o', mouthOpen: 0.4 };
const HOLD: Partial<Pose> = { ...REACH, shL: 60, elL: 110, handL: 'grip', lookX: -0.2, lookY: 0.1, mouthMode: 'grin', mouthOpen: 0.6, brow: 1 };
const CHOMP: Partial<Pose> = { ...HOLD, mouthMode: 'o', mouthOpen: 1, lid: 0.2, brow: 0.8 };
const CHEW: Partial<Pose> = { ...HOLD, mouthMode: 'grin', mouthOpen: 0, smile: 1, lid: 1, brow: 0.7, blush: 0.4, lookX: 0, lookY: 0 };

const KEYS: Key<Pose>[] = [
  { f: 0, p: SET },
  { f: DROP, p: { ...SET, handL: 'open', shL: 32, elL: -70 }, e: E.out },
  { f: HIT - 3, p: { ...SET, handL: 'open', shL: 30, elL: -40, shR: 4, elR: 6, wrR: 40, sy: 0.98 } },
  { f: HIT, p: SWING, e: E.in },
  { f: HIT + 4, p: FOLLOW, e: E.out },
  { f: PASS - 4, p: WATCH },
  { f: FLIP, p: { ...WATCH, lookX: -0.9, lookY: 0, turn: -0.3, mouthMode: 'grin', mouthOpen: 0.5, smile: 1, mouthSkew: 0.6 } },
  { f: JICKLED - 2, p: { ...WATCH, lookX: -0.9, turn: -0.3, mouthMode: 'grin', mouthOpen: 0.3, smile: 1, sy: 0.94 } },
  { f: JICKLED + 3, p: CHEER, e: E.back },
  { f: CATCH - 10, p: { ...CHEER, eyeMode: 'normal' } },
  { f: CATCH - 4, p: REACH, e: E.inOut },
  { f: CATCH, p: { ...REACH, handL: 'grip' } },
  { f: CATCH + 5, p: HOLD, e: E.out },
  { f: BITE - 3, p: HOLD },
  { f: BITE, p: CHOMP, e: E.in },
  { f: BITE + 3, p: CHEW, e: E.out },
  { f: 140, p: CHEW },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  const dance = f > JICKLED + 3 && f < CATCH - 6 ? Math.abs(Math.sin((f - JICKLED) / 3.4)) * 30 : 0;
  p = plant(p, dance);
  // bring the pickle to the mouth for the bite
  const k = kf(f, [[BITE - 8, 0], [BITE - 1, 1, E.inOut], [BITE + 8, 1], [BITE + 16, 0.85, E.inOut]]);
  if (k > 0) {
    const r = rig(p);
    const m = r.mouth();
    const q = { ...p, ...reach(p, 'L', [m[0] - 14, m[1] + 150], 1, 34) };
    p = { ...p, shL: lerp(p.shL, q.shL, k), elL: lerp(p.elL, q.elL, k), wrL: lerp(p.wrL, 30, k) };
  }
  // chewing
  if (f > BITE + 3) {
    const c = Math.max(0, Math.sin((f - BITE) / 2.2));
    p = { ...p, mouthOpen: c * 0.25, head: Math.sin((f - BITE) / 4.4) * 3, sy: p.sy + c * 0.01 };
  }
  return p;
};

type V3 = [number, number, number];
const toStageAt = (f: number, which: 'face' | 'handL') => {
  const p = solve(f);
  const r = rig(p);
  const w = which === 'face' ? r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]) : r.W(r.aL.wrist, 0, 40);
  return [GX + w[0] * SC, GY + w[1] * SC] as [number, number];
};
const ballAt = (f: number): V3 | null => {
  const hand = toStageAt(DROP, 'handL');
  const h0 = jUn(hand[0], hand[1], ZH - 0.3);
  const fc = toStageAt(HIT, 'face');
  const c = jUn(fc[0], fc[1], ZH - 0.4);
  if (f < DROP) return [h0.X, ZH - 0.3, h0.h];
  if (f < HIT) {
    const t = (f - DROP) / (HIT - DROP);
    return [lerp(h0.X, c.X, t), lerp(ZH - 0.3, ZH - 0.4, t), lerp(h0.h, c.h, t) + 0.6 * Math.sin(t * Math.PI) - 0.6 * t * t];
  }
  if (f < PASS + 2) {
    const tt = (f - HIT) / (PASS + 2 - HIT);
    return [lerp(c.X, -0.9, tt), lerp(ZH - 0.4, -6.4, tt), lerp(c.h, 6.2, tt) + 2.5 * 4 * tt * (1 - tt)];
  }
  return null;
};

/** Pickles falling out of the sky and piling up on the court (stage space, sorted by where they land). */
const pickleStorm = (f: number) => {
  const r = rng(43);
  const out: { land: number; node: React.ReactNode }[] = [];
  for (let i = 0; i < 46; i++) {
    const x = GX - 520 + r() * 1040;
    const front = r() < 0.45;
    const land = front ? GY + 40 + r() * 330 : GY - 70 + r() * 60;
    const delay = front ? r() * 16 : r() * 34;
    const speed = 16 + r() * 10;
    const rot0 = r() * 360;
    const spin = (r() - 0.5) * 22;
    const lie = (r() < 0.5 ? 80 : 100) + (r() - 0.5) * 30;
    const t = f - JICKLED - delay;
    if (t < 0) continue;
    // keep the falling ones off his face
    if (front && Math.abs(x - GX) < 70) continue;
    const y = -80 + t * speed;
    const landed = y >= land;
    const bounce = landed ? Math.max(0, Math.sin((t - (land + 80) / speed) * 0.9)) * 14 * Math.exp(-(t - (land + 80) / speed) * 0.35) : 0;
    const scale = 0.5 * SC * (1 + (land - GY) / 900);
    out.push({
      land,
      node: (
        <g key={i} transform={`translate(${x} ${(landed ? land : y) - bounce}) rotate(${landed ? lie : rot0 + t * spin})`}>
          <Pickle s={scale} />
        </g>
      ),
    });
  }
  return out.sort((a, b) => a.land - b.land);
};

export const JickleJickledScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const mouth = toStage(r.mouth());
  const handL = toStage(r.W(r.aL.wrist, 0, 40));
  const b = ballAt(f);
  const cam: Cam = {
    cx: kf(f, [[0, 470], [HIT, 500, E.inOut], [HIT + 6, 540, E.inOut], [PASS, 540], [FLIP - 1, 420, E.inOut], [FLIP + 8, 440], [JICKLED + 6, 500, E.inOut], [CATCH - 6, 520], [BITE - 6, 600, E.inOut], [CARD + 8, 560, E.inOut]]),
    cy: kf(f, [[0, 450], [HIT, 450], [HIT + 6, 860, E.inOut], [PASS, 900, E.inOut], [FLIP - 1, 480, E.inOut], [JICKLED + 6, 440, E.inOut], [CATCH - 6, 440], [BITE - 6, 470, E.inOut], [CARD + 8, 450, E.inOut]]),
    z: kf(f, [[0, 2.3], [HIT, 2.35, E.inOut], [HIT + 6, 1.15, E.inOut], [PASS, 1.0, E.inOut], [FLIP - 1, 2.5, E.inOut], [FLIP + 8, 2.5], [JICKLED + 6, 2.3, E.inOut], [CATCH - 6, 2.4], [BITE - 6, 3.0, E.inOut], [CARD + 8, 2.6, E.inOut]]),
  };
  const s1 = shake(f, FLIP + 4, 10, 10, 1);
  const s2 = shake(f, JICKLED, 14, 18, 2);
  const s3 = shake(f, BITE, 8, 8, 3);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s2.r };
  const flip = seg(f, FLIP, FLIP + 6);
  const ballNode = b ? (() => {
    const [x, y] = jP(b[0], b[1], b[2]);
    return <Ball x={x} y={y} r={jR(b[1])} rot={f * 16} />;
  })() : null;
  const ballTrail = trail((ff) => {
    const q = ballAt(Math.max(HIT, ff));
    return q ? jP(q[0], q[1], q[2]) : [0, 0];
  }, f, 5, 0.7);
  // the one pickle he catches
  const fallT = seg(f, CATCH - 14, CATCH);
  const catchFrom: [number, number] = [handL[0] - 30, handL[1] - 520];
  const held = f >= CATCH;
  // held pickle: stands up out of his fist (stage space), so at the bite its tip meets his mouth
  const grip = toStage(r.W(r.aL.wrist, 0, 34));
  const PK = 0.6 * SC;
  const heldPickle = held ? (
    <g transform={`translate(${grip[0] + 4 * SC} ${grip[1] - 92 * SC}) rotate(-8)`}>
      <Pickle s={PK} bite={f >= BITE ? 1 : 0} />
    </g>
  ) : null;
  const bitePt = mouth;
  const storm = pickleStorm(f);

  return (
    <Stage bg="#7DB0FA" overlay={<EndCard f={f} start={CARD} lines={['JICKLED!']} sub="11 - 0" pts="+0.5" color={JGREEN} dark={JGREEN_D} y={96} />}>
      <GlowDefs />
      <JCourt f={f} cam={cam} sh={sh} theme="day" banner="JICKLE CLUB">
        <Scoreboard x={BOARD[0]} y={BOARD[1]} s={0.27} a="10" a2="11" b="0" flip={flip} />
        <Sparks f={f} start={FLIP + 5} seed={41} n={16} x={BOARD[0]} y={BOARD[1] + 20} speed={[6, 14]} g={0.4} size={[6, 12]} colors={['#FFD064', '#FFFFFF', JGREEN]} />
        {storm.filter((q) => q.land < GY).map((q) => q.node)}
        <ellipse cx={GX} cy={GY + 2} rx={150 * SC} ry={22 * SC} fill="#000" opacity={0.25} />
        {b && b[1] > 0.3 ? <ellipse cx={jP(b[0], b[1], 0)[0]} cy={jP(b[0], b[1], 0)[1]} rx={jR(b[1]) * 0.9} ry={jR(b[1]) * 0.3} fill="#000" opacity={0.2} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemR={<Paddle />} itemBehindR={f < HIT} />
        {heldPickle}
        {f > HIT && f < PASS ? <Swoosh pts={ballTrail} width={jR(b ? b[1] : 10) * 1.7} color="#FFF3A0" opacity={0.75} /> : null}
        {b && b[1] > 0 ? ballNode : null}
        <Ring x={toStageAt(HIT, 'face')[0]} y={toStageAt(HIT, 'face')[1]} t={seg(f, HIT, HIT + 8)} r={60} w={10} />
        {!held && f >= CATCH - 14 ? (
          <g transform={`translate(${lerp(catchFrom[0], handL[0], fallT)} ${lerp(catchFrom[1], handL[1] - 40, E.in(fallT))}) rotate(${(1 - fallT) * 400})`}>
            <Pickle s={0.5 * SC} />
          </g>
        ) : null}
        <Sparks f={f} start={BITE} seed={42} n={12} x={bitePt[0]} y={bitePt[1]} speed={[5, 12]} g={0.5} size={[4, 8]} shape="drop" colors={['#C9F08A', '#A6DB6A', '#FFFFFF']} />
        <Twinkle x={handL[0] + 30} y={handL[1] - 60} s={0.35} t={seg(f, CATCH, CATCH + 10)} color="#FFFFFF" />
        {storm.filter((q) => q.land >= GY).map((q) => q.node)}
        <JNet f={f} />
        {b && b[1] <= 0 ? ballNode : null}
      </JCourt>
      <g transform={camP(cam, 1, sh)}>
        <Sfx f={f} start={BITE} text="CRUNCH!" x={mouth[0] + 150} y={mouth[1] - 90} size={46} rot={8} fill="#C9F08A" dur={16} />
      </g>
      <Sfx f={f} start={PASS - 3} text="ACE!" x={330} y={1250} size={190} rot={-10} fill="#FFFFFF" dur={10} />
      <Sfx f={f} start={JICKLED} text="JICKLED!" x={540} y={400} size={190} rot={-5} fill="#8BE07A" dur={30} />
      <ConfettiRain f={f} start={JICKLED + 2} n={40} seed={44} colors={[JGREEN, '#FFFFFF', '#FFD064', '#8BE07A']} />
    </Stage>
  );
};
