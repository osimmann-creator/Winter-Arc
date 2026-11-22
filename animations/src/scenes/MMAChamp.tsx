// MMA #4 (Amaan): "THE CHAMP" - the ref hoists his arm (WINNER!), the title belt comes spinning in
// and snaps round his waist, he can't believe it, then arms up - pyro - NEW CHAMP on the big
// screen, double biceps, wink.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, Ring, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { svgM, mul, R } from '../lib/m2';
import { reach } from './ik';
import { PEOPLE } from './jokekit';
import { Glove, Headband } from './JokeMMA';
import { Arena, Jumbotron, HeroSpot, Pyro, Belt, BeltOn, RefArm, RED, RED_D } from './MMAKit';

const LIFT = 12;
const LET_GO = 30;
const BELT0 = 24;
const SNAP = 38;
const LOOK = 44;
const VICTORY = 62;
const FLEX = 78;
const WINK = 90;
const CARD = 100;
const [ORANGE] = PEOPLE.amaan;
const GX = 540;
const GY = 1760;
const SC = 0.86;

const REST: Partial<Pose> = {
  hipL: 10, hipR: 10, knL: -8, knR: -8, thL: 0.97, thR: 0.97,
  shL: 18, elL: 26, shR: 16, elR: 8, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, flexL: 0.9, flexR: 0.9,
  handL: 'fist', handR: 'fist', chestS: 1.04, sweat: 0.7, mouthMode: 'grin', mouthOpen: 0.45, smile: 0.7,
  lid: 0.2, brow: 0.2, browTilt: 0, lookX: 0.3, lookY: -0.5,
};
const HOISTED: Partial<Pose> = {
  ...REST, shR: 168, elR: -6, flexR: 1.4, shrugR: 10, chestS: 1.08, mouthOpen: 0.9, smile: 1, brow: 0.8, lid: 0, lookX: 0.4, lookY: -0.8, sweat: 0.4,
};
const WATCH: Partial<Pose> = { lookX: -0.75, lookY: -0.4, mouthMode: 'o', mouthOpen: 0.5, brow: 0.9, lid: 0 };
const AWE: Partial<Pose> = {
  ...REST, sweat: 0, lookX: 0, lookY: 0.9, mouthMode: 'o', mouthOpen: 0.7, smile: 0.5, brow: 1, browTilt: 0.3, lid: 0, pupil: 1.25, chestS: 1.08,
};
const RAISED: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, shL: 150, shR: 150, elL: -16, elR: -16, shrugL: 0, shrugR: 0,
  handL: 'fist', handR: 'fist', chestS: 1.12, flexL: 1.6, flexR: 1.6, mouthMode: 'grin', mouthOpen: 1, smile: 1, mouthSkew: 0,
  lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', turn: 0, lookX: 0, lookY: 0, pupil: 1,
};
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 1.9, flexR: 1.9,
  shrugL: 14, shrugR: 14, chestS: 1.12, torsoSy: 1.02, sy: 1.03, sx: 0.98, hipL: 13, hipR: 13, knL: -6, knR: -6,
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'normal', lookX: 0, lookY: 0, turn: 0,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: REST },
  { f: LIFT - 2, p: { ...REST, shR: 30, elR: 4 } },
  { f: LIFT + 6, p: HOISTED, e: E.back },
  { f: BELT0, p: { ...HOISTED, ...WATCH } },
  { f: LET_GO + 4, p: { ...HOISTED, ...WATCH, lookX: -0.4, lookY: 0 } },
  { f: SNAP - 2, p: { ...REST, ...WATCH, sweat: 0, lookX: -0.1, lookY: 0.6, shR: 40, elR: 30 }, e: E.inOut },
  { f: SNAP, p: { ...AWE, sy: 0.95, sx: 1.04 }, e: E.out },
  { f: SNAP + 4, p: { ...AWE, sy: 1, sx: 1 } },
  { f: LOOK + 10, p: { ...AWE, mouthMode: 'grin', mouthOpen: 0.8, smile: 1, lookY: 0.7 } },
  { f: VICTORY - 4, p: { ...AWE, mouthMode: 'grin', mouthOpen: 0.4, smile: 1, lookY: 0.2, sy: 0.95 } },
  { f: VICTORY, p: RAISED, e: E.back },
  { f: VICTORY + 6, p: { chestS: 1.15 } },
  { f: FLEX - 4, p: { ...RAISED, chestS: 1.12, eyeMode: 'normal' } },
  { f: FLEX, p: DOUBLE_BI, e: E.back },
  { f: WINK - 4, p: DOUBLE_BI },
  { f: WINK, p: { ...DOUBLE_BI, wink: 1, mouthSkew: 0.5, mouthOpen: 0.6, turn: 0.12, lookX: 0.3 }, e: E.inOut },
  { f: 140, p: { ...DOUBLE_BI, wink: 1, mouthSkew: 0.5, mouthOpen: 0.6, turn: 0.12, lookX: 0.3 } },
];

/** belt plate centre in hero space for pose p */
const beltAt = (p: Pose): [number, number] => {
  const r = rig(p);
  return r.W(mul(r.torso, R(-p.torso * 0.5)), 0, -14);
};

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  // panting while he waits
  const pant = (1 - seg(f, LIFT, LIFT + 6)) * Math.sin(f / 3.2) * 0.03;
  p = { ...p, chestS: p.chestS + pant, shrugL: p.shrugL + pant * 200, shrugR: p.shrugR + pant * 200 };
  p = plant(p);
  // both gloves cradle the belt while he takes it in
  const hold = kf(f, [[SNAP + 1, 0], [LOOK, 1, E.out], [VICTORY - 5, 1], [VICTORY - 1, 0, E.in]]);
  if (hold > 0) {
    const b = beltAt(p);
    const q = { ...p, ...reach(p, 'L', [b[0] - 158, b[1] - 6], 1, 52), ...reach(p, 'R', [b[0] + 158, b[1] - 6], 1, 52) };
    p = { ...p, shL: lerp(p.shL, q.shL, hold), elL: lerp(p.elL, q.elL, hold), shR: lerp(p.shR, q.shR, hold), elR: lerp(p.elR, q.elR, hold) };
  }
  return p;
};

export const MMAChampScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const chest = toStage(r.chest());
  const mouth = toStage(r.mouth());
  const wristR = toStage(r.W(r.aR.wrist, 0, -4));
  const belt = toStage(beltAt(p));
  const beltEnd = toStage(beltAt(solve(SNAP)));
  const worn = f >= SNAP;

  // the ref: holds the right wrist, hoists it, lets go and pulls out of frame
  const away = E.in(seg(f, LET_GO, LET_GO + 8));
  const refHand: [number, number] = [lerp(wristR[0], 1500, away), lerp(wristR[1], 1250, away)];

  // flying belt: arcs in from the upper left, spinning, and shrinks onto the waist
  const bt = seg(f, BELT0, SNAP);
  const bx = (1 - bt) ** 2 * -480 + 2 * (1 - bt) * bt * 120 + bt * bt * beltEnd[0];
  const by = (1 - bt) ** 2 * 1180 + 2 * (1 - bt) * bt * 980 + bt * bt * beltEnd[1];
  const bs = lerp(0.72, 0.27, E.in(bt));
  const spin = 0.3 + 0.7 * Math.abs(Math.cos(bt * Math.PI * 3));

  const hype = kf(f, [[0, 0.5], [LIFT + 6, 0.9], [VICTORY, 1]]);
  const screen =
    f < LIFT + 4 ? (
      <Jumbotron text="AND NEWWW" sub="LADIES & GENTS" color="#FFFFFF" />
    ) : f < VICTORY ? (
      <Jumbotron text="AMAAN" sub="WINNER BY K.O." color={ORANGE} flash={1 - seg(f, LIFT + 4, LIFT + 10)} />
    ) : (
      <Jumbotron text="NEW CHAMP" sub="AMAAN" color="#FFD064" flash={1 - seg(f, VICTORY, VICTORY + 8)} />
    );
  const cam: Cam = {
    cx: kf(f, [[0, 560], [LIFT, 580, E.inOut], [BELT0, 520, E.inOut], [SNAP, 540], [VICTORY - 4, 540], [VICTORY + 6, 540]]),
    cy: kf(f, [[0, 1120], [LIFT + 6, 1060, E.inOut], [BELT0 + 4, 1100, E.inOut], [SNAP, 1240, E.inOut], [SNAP + 8, 1400, E.out], [VICTORY - 4, 1390], [VICTORY + 6, 1090, E.inOut], [CARD + 10, 1070, E.inOut]]),
    z: kf(f, [[0, 0.96], [LIFT + 6, 1.0, E.inOut], [BELT0 + 4, 0.96, E.inOut], [SNAP, 1.2, E.in], [SNAP + 8, 1.75, E.out], [VICTORY - 4, 1.82], [VICTORY + 6, 0.96, E.inOut], [FLEX, 1.02, E.inOut], [CARD + 10, 0.99]]),
  };
  const s1 = shake(f, SNAP, 10, 14, 1);
  const s2 = shake(f, VICTORY, 14, 22, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s2.r };
  const shine = kf(f, [[SNAP + 6, 0], [SNAP + 10, 1, E.out], [SNAP + 16, 0], [FLEX + 2, 0], [FLEX + 6, 1, E.out], [FLEX + 12, 0]]);

  return (
    <Stage bg="#100E24" impact={f === VICTORY} overlay={<EndCard f={f} start={CARD} lines={['THE CHAMP']} pts="+1.5" color={RED} dark={RED_D} y={96} />}>
      <GlowDefs />
      <Arena f={f} cam={cam} sh={sh} hype={hype} screen={screen} spots={1} />
      <g transform={camP(cam, 1, sh)}>
        <HeroSpot x={GX} y={GY + 6} o={1} w={280} />
        <ellipse cx={GX} cy={GY + 4} rx={230 * SC} ry={26 * SC} fill="#000" opacity={0.3} />
        <Pyro x={150} y={GY - 40} t={f - VICTORY} />
        <Pyro x={930} y={GY - 40} t={f - VICTORY} />
        <Pyro x={150} y={GY - 40} t={f - FLEX} h={700} />
        <Pyro x={930} y={GY - 40} t={f - FLEX} h={700} />
        <Glow x={belt[0]} y={belt[1]} r={kf(f, [[SNAP - 1, 0], [SNAP + 3, 300, E.out], [SNAP + 20, 160]])} id="glowY" o={seg(f, SNAP - 1, SNAP + 1) * 0.8 * (1 - seg(f, VICTORY - 6, VICTORY))} />
        <Glow x={chest[0]} y={chest[1]} r={kf(f, [[VICTORY - 1, 0], [VICTORY + 3, 560, E.out], [VICTORY + 24, 380]])} id="glowY" o={seg(f, VICTORY - 1, VICTORY + 1) * 0.75} />
        <Burst x={chest[0]} y={chest[1]} r={460} t={seg(f, VICTORY, VICTORY + 17)} seed={81} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          shadow={false}
          headExtra={<Headband />}
          itemL={<Glove />}
          itemR={<Glove />}
          between={
            worn ? (
              <g transform={svgM(mul(r.torso, R(-p.torso * 0.5)))}>
                <g transform="scale(1.15)">
                  <BeltOn name="AMAAN" shine={shine} />
                </g>
              </g>
            ) : null
          }
        />
        {f < LET_GO + 9 ? <RefArm x0={1320} y0={1180} hx={refHand[0]} hy={refHand[1]} /> : null}
        {!worn && f >= BELT0 ? <Belt x={bx} y={by} s={bs} rot={lerp(-38, 0, E.out(bt))} spin={spin} name="AMAAN" curve={lerp(0, 30, bt)} /> : null}
        <Burst x={belt[0]} y={belt[1]} r={170} t={seg(f, SNAP, SNAP + 10)} seed={82} />
        <Ring x={belt[0]} y={belt[1]} t={seg(f, SNAP, SNAP + 10)} r={220} w={18} />
        <Sparks f={f} start={SNAP} seed={83} n={16} x={belt[0]} y={belt[1]} speed={[10, 26]} g={0.7} size={[10, 18]} colors={['#FFD064', '#FFFFFF', RED]} />
        <Sparks f={f} start={VICTORY} seed={84} n={26} x={chest[0]} y={chest[1]} speed={[16, 40]} g={0.8} size={[14, 26]} colors={['#FFD064', '#FFFFFF', '#F2853A']} />
        <Twinkle x={belt[0] - 70} y={belt[1] - 50} s={0.9} t={seg(f, SNAP + 8, SNAP + 22)} color="#FFF3C4" />
        <Twinkle x={belt[0] + 76} y={belt[1] + 10} s={0.7} t={seg(f, SNAP + 14, SNAP + 28)} color="#FFF3C4" rot={20} />
        <Twinkle x={belt[0] + 60} y={belt[1] - 40} s={0.8} t={seg(f, FLEX + 4, FLEX + 18)} color="#FFF3C4" />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, WINK + 2, WINK + 16)} />
      </g>
      <Sfx f={f} start={LIFT + 4} text="WINNER!" x={430} y={470} size={170} rot={-6} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={SNAP} text="SNAP!" x={300} y={1260} size={140} rot={-10} fill="#FFD064" dur={16} />
      <Sfx f={f} start={VICTORY} text="CHAMPION!" x={540} y={640} size={150} rot={-5} fill="#FFD064" dur={22} />
      <ConfettiRain f={f} start={VICTORY + 2} n={60} seed={85} colors={[RED, '#FFC9C9', '#FFFFFF', '#FFD064', '#F2853A']} />
    </Stage>
  );
};
