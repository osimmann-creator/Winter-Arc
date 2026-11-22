// Gym #9: "GAINS SHAKE" - shake shake shake, pop the cap, chug the whole protein shake...
// the muscles inflate on the spot. Double biceps with a protein moustache.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, springAt } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { stageOf, worldAngle, INK, Pt } from './kit';
import { GymRoomBG, FloorShadow, Shaker, ShakerCap } from './GymRoom';

const GX = 540;
const GY = 1690;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const SHAKE0 = 6;
const SHAKE1 = 34;
const POP = 38;
const CHUG0 = 45;
const CHUG1 = 64;
const PUMP = 70;
const TOSS = 72;
const FLEX = 82;
const CARD = 96;
const GRIP = 76; // the shaker's centre, measured from the wrist along the hand
const BS = 1.35; // shaker size
const TOPL = 138 * BS; // centre -> open top

/* ------------------------------- poses ------------------------------- */
const HOLD: Partial<Pose> = { hipL: 9, hipR: 9, knL: -6, knR: -6, smile: 1, mouthOpen: 0.2, brow: 0.6, lookX: 0.1, turn: 0.05, handL: 'grip', handR: 'fist' };
const SHAKING: Partial<Pose> = { mouthMode: 'grin', mouthOpen: 0.85, smile: 1, brow: 1, browTilt: 0.2, lid: 0, lookX: -0.4, turn: -0.15 };
const CHUGGING: Partial<Pose> = { mouthMode: 'o', mouthOpen: 0.45, lid: 0.85, brow: 0.6, browTilt: 0.4, red: 0.25, rot: -3, head: -8, turn: -0.1, lookX: 0, lookY: -0.6 };
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 2.3, flexR: 2.3,
  shrugL: 16, shrugR: 16, chestS: 1.2, hipL: 14, hipR: 14, knL: -6, knR: -6, handL: 'fist', handR: 'fist', sx: 1.05,
  mouthMode: 'grin', mouthOpen: 0.95, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', lookX: 0, lookY: 0, turn: 0, rot: 0, head: 0, red: 0,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: HOLD },
  { f: SHAKE0 + 3, p: { ...HOLD, ...SHAKING }, e: E.out },
  { f: SHAKE1, p: { ...HOLD, ...SHAKING, lookX: 0.3, turn: 0.1 } },
  { f: POP, p: { ...HOLD, mouthMode: 'o', mouthOpen: 0.7, brow: 1, browTilt: 0.6, lookY: -0.8, lookX: -0.4, turn: -0.2, eyeMode: 'normal' }, e: E.out },
  { f: CHUG0, p: { ...HOLD, ...CHUGGING }, e: E.inOut },
  { f: CHUG1, p: { ...HOLD, ...CHUGGING, red: 0.5, rot: -5 } },
  { f: CHUG1 + 4, p: { ...HOLD, mouthMode: 'grin', mouthOpen: 1, smile: 1, lid: 0, brow: 1, browTilt: 0, red: 0, rot: 0, head: 0, eyeMode: 'star', lookY: 0, turn: 0 }, e: E.out },
  { f: PUMP, p: { ...HOLD, mouthMode: 'grin', mouthOpen: 1, eyeMode: 'star', flexL: 1.2, flexR: 1.2, chestS: 1.05 } },
  { f: FLEX - 3, p: { ...DOUBLE_BI, flexL: 1.9, flexR: 1.9, chestS: 1.1, sx: 1.02, mouthMode: 'grit', mouthOpen: 0.4, red: 0.5, eyeMode: 'normal', lid: 0.4, browTilt: -0.8 }, e: E.inOut },
  { f: FLEX, p: DOUBLE_BI, e: E.back },
  { f: 92, p: { eyeMode: 'normal', wink: 1, mouthSkew: 0.5, mouthOpen: 0.5, turn: 0.15, lookX: 0.4 }, e: E.inOut },
  { f: 104, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
  { f: 140, p: {} },
];

/** Where the left hand holds the shaker (hero space) and the bottle's world tilt (deg, clockwise). */
const bottle = (f: number, p: Pose): { at: Pt; tilt: number } => {
  const r = rig(p);
  const mouth = r.mouth();
  const rest: Pt = [-250, -690];
  if (f < SHAKE0) return { at: rest, tilt: -6 };
  if (f < SHAKE1 + 2) {
    // shake: fast up/down
    const k = Math.sin((f - SHAKE0) * 1.6);
    const amp = 90 * seg(f, SHAKE0, SHAKE0 + 4) * (1 - seg(f, SHAKE1 - 2, SHAKE1 + 2));
    return { at: [rest[0] - 20, rest[1] - 40 + k * amp], tilt: -6 + k * 14 * (amp / 90) };
  }
  if (f < CHUG0) {
    // pop the cap at chest height, then lift to the mouth
    const L = TOPL;
    const tilt = 115;
    const atMouth: Pt = [mouth[0] - L * Math.sin((tilt * Math.PI) / 180) - 6, mouth[1] + L * Math.cos((tilt * Math.PI) / 180) + 8];
    const t = E.inOut(seg(f, POP + 1, CHUG0));
    return { at: [lerp(rest[0] - 20, atMouth[0], t), lerp(rest[1] - 40, atMouth[1], t)], tilt: lerp(-6, tilt, t) };
  }
  if (f < CHUG1) {
    const L = TOPL;
    const tilt = lerp(115, 158, E.inOut(seg(f, CHUG0, CHUG1)));
    return { at: [mouth[0] - L * Math.sin((tilt * Math.PI) / 180) - 6, mouth[1] + L * Math.cos((tilt * Math.PI) / 180) + 8], tilt };
  }
  // done: lower it and toss it over the shoulder
  const L = TOPL;
  const from: Pt = [mouth[0] - L * Math.sin((158 * Math.PI) / 180) - 6, mouth[1] + L * Math.cos((158 * Math.PI) / 180) + 8];
  const t = E.out(seg(f, CHUG1, TOSS));
  return { at: [lerp(from[0], -300, t), lerp(from[1], -900, t)], tilt: lerp(158, 40, t) };
};

const solve = (f: number): Pose => {
  let p = plant(poseAt(f, BASE, KEYS));
  if (f < FLEX - 3) {
    const pump = f >= PUMP ? (springAt(f, PUMP, 10, 1.8, 4) - 1) * 0.6 : 0;
    p = { ...p, flexL: p.flexL + pump, flexR: p.flexR + pump };
    // right fist on the hip until the flex
    p = { ...p, ...reach(p, 'R', [138, -374], 1) };
    if (f < TOSS) {
      const b = bottle(f, p);
      p = { ...p, ...reach(p, 'L', b.at, 1, GRIP), wrL: 0, armZL: f >= POP + 3 && f < CHUG1 + 6 ? 'top' : 'mid' };
    }
  }
  if (f >= TOSS && f < FLEX - 3) {
    // empty hand swings up into the flex
    const q = poseAt(FLEX - 3, BASE, KEYS);
    const t = E.inOut(seg(f, TOSS, FLEX - 3));
    p = { ...p, shL: lerp(150, q.shL, t), elL: lerp(-10, q.elL, t), handL: 'open' };
  }
  if (f >= FLEX - 3 && f < FLEX + 30) {
    const pumped = (springAt(f, FLEX, 14, 1.8, 4) - 1) * 0.45;
    p = { ...p, flexL: p.flexL + pumped, flexR: p.flexR + pumped };
  }
  return p;
};

/** Protein moustache (head space). */
const Stache: React.FC<{ o: number }> = ({ o }) =>
  o > 0 ? (
    <g opacity={o}>
      <path d="M-78 -88 Q-40 -116 0 -100 Q40 -116 78 -88 Q56 -74 30 -84 Q14 -76 0 -84 Q-14 -76 -30 -84 Q-56 -74 -78 -88 Z" fill="#9B5A3A" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M-50 -98 Q-30 -106 -12 -100" fill="none" stroke="#C07B52" strokeWidth={6} strokeLinecap="round" />
      <circle cx={-62} cy={-74} r={7} fill="#9B5A3A" />
    </g>
  ) : null;

/* ------------------------------- scene ------------------------------- */
export const GainsShakeScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const bicepL = toStage(r.W(r.aL.upper, -40, 70));
  const bicepR = toStage(r.W(r.aR.upper, -40, 70));
  const holding = f < TOSS;
  const b = holding ? bottle(f, p) : null;
  const wristA = worldAngle(p, r.aL.wrist);
  const level = kf(f, [[0, 0.82], [CHUG0 + 1, 0.82], [CHUG1 - 2, 0, E.inOut]]);
  const capOn = f < POP;
  // the cap flies off at POP from the top of the bottle
  const capT = f - POP;
  const centre = r.W(r.aL.wrist, 0, GRIP);
  const upv = (deg: number): Pt => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];
  const capStart = toStage([centre[0] + upv(-6)[0] * 170 * BS, centre[1] + upv(-6)[1] * 170 * BS]);
  const capPos: Pt = [capStart[0] - capT * 9, capStart[1] - capT * 34 + capT * capT * 1.7];
  // the empty bottle flies over his shoulder after the toss
  const tossT = f - TOSS;
  const tossFrom = toStage([-300, -900]);
  const tossPos: Pt = [tossFrom[0] - tossT * 15, tossFrom[1] - tossT * 40 + tossT * tossT * 0.8];
  const stacheO = seg(f, CHUG1 - 1, CHUG1 + 2);

  const cam: Cam = {
    cx: kf(f, [[0, 540], [SHAKE0, 500, E.inOut], [CHUG0, 470, E.inOut], [CHUG1, 470], [FLEX, 540, E.inOut]]),
    cy: kf(f, [[0, 1180], [SHAKE0, 1100, E.out], [POP, 1060], [CHUG0, 900, E.inOut], [CHUG1, 900], [FLEX, 1120, E.inOut], [CARD + 6, 1060, E.inOut], [140, 1050]]),
    z: kf(f, [[0, 1.2], [SHAKE0, 1.05, E.out], [POP, 1.08], [CHUG0, 1.5, E.inOut], [CHUG1, 1.6], [PUMP, 1.1, E.inOut], [FLEX, 1.0, E.out], [CARD + 6, 0.98, E.inOut]]),
    r: kf(f, [[CHUG0, 0], [CHUG1, -2], [PUMP, 0, E.out]]),
  };
  const s1 = shake(f, SHAKE0, SHAKE1 - SHAKE0, 5, 1);
  const s2 = shake(f, FLEX, 16, 18, 3);
  const s3 = shake(f, PUMP, 10, 8, 4);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s2.r };

  const shaker = holding ? (
    <Shaker level={level} capOn={capOn} rot={b!.tilt - wristA} s={BS} tilt={b!.tilt} />
  ) : null;

  return (
    <Stage impact={f === FLEX} overlay={<EndCard f={f} start={CARD} lines={['GAINS SHAKE']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymRoomBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <FloorShadow x={540} y={GY + 6} w={250} />
        <Glow x={540} y={chest[1]} r={kf(f, [[PUMP - 1, 0], [PUMP + 4, 440, E.out], [FLEX, 520], [FLEX + 26, 400]])} id="glowY" o={seg(f, PUMP - 1, PUMP + 1) * (1 - seg(f, 112, 130) * 0.5)} />
        <Burst x={540} y={chest[1]} r={460} t={seg(f, FLEX, FLEX + 17)} seed={14} />
        {f >= FLEX && f < FLEX + 14 ? <FocusLines f={f} cx={540} cy={chest[1]} r0={480} opacity={0.65 * (1 - seg(f, FLEX + 6, FLEX + 14))} /> : null}
        <Ring x={540} y={chest[1]} t={seg(f, PUMP, PUMP + 14)} r={520} w={22} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemL={shaker} itemBehindL headExtra={<Stache o={stacheO} />} />
        {/* shake blur */}
        {f >= SHAKE0 + 2 && f < SHAKE1
          ? [0, 1].map((i) => {
              const at = toStage(rig(p).W(rig(p).aL.wrist, 0, GRIP));
              const y = at[1] + (i ? 170 : -200) + (f % 2) * 10;
              return <path key={i} d={`M${at[0] - 70} ${y} Q${at[0]} ${y + (i ? 26 : -26)} ${at[0] + 70} ${y}`} fill="none" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" opacity={0.85} />;
            })
          : null}
        {f >= POP && capT < 30 ? <ShakerCap x={capPos[0]} y={capPos[1]} rot={capT * 31} s={SC * BS} /> : null}
        {f >= TOSS && tossT < 26 ? (
          <g transform={`translate(${tossPos[0]} ${tossPos[1]}) rotate(${-tossT * 24}) scale(${SC * (1 - tossT * 0.012)})`}>
            <Shaker level={0} capOn={false} s={BS} />
          </g>
        ) : null}
        {/* glug bubbles */}
        {f >= CHUG0 + 2 && f < CHUG1
          ? [0, 1, 2, 3].map((i) => {
              const t = ((f - CHUG0 + i * 5) % 20) / 20;
              const u = upv(b ? b.tilt : 150);
              const k = (80 - t * 170) * BS;
              const at = toStage([centre[0] + u[0] * k + (i - 1.5) * 12, centre[1] + u[1] * k]);
              return <circle key={i} cx={at[0]} cy={at[1]} r={(10 + i * 3) * SC} fill="#FFFFFF" stroke={INK} strokeWidth={4} opacity={0.9 * (1 - t)} />;
            })
          : null}
        <Sparks f={f} start={FLEX} seed={15} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Sparks f={f} start={PUMP} seed={16} n={12} x={540} y={chest[1]} speed={[10, 24]} g={0.4} size={[12, 20]} shape="dot" colors={['#FFD064', '#FFFFFF']} />
        <Glint x={bicepL[0] - 10} y={bicepL[1] - 40} s={1.2} t={seg(f, FLEX + 3, FLEX + 17)} />
        <Glint x={bicepR[0] + 10} y={bicepR[1] - 40} s={1.2} t={seg(f, FLEX + 7, FLEX + 21)} />
        {f >= PUMP && f < FLEX + 10
          ? [0, 1, 2].map((i) => <Twinkle key={i} x={540 + (i - 1) * 330} y={chest[1] - 160 + (i % 2) * 120} s={1} t={seg(f, PUMP + i * 3, PUMP + i * 3 + 12)} color="#FFD064" />)
          : null}
        <Sfx f={f} start={SHAKE0 + 2} text="SHAKE!" x={830} y={760} size={130} rot={10} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={SHAKE0 + 12} text="SHAKE!" x={240} y={600} size={120} rot={-10} fill="#FFD064" dur={12} />
        <Sfx f={f} start={SHAKE0 + 21} text="SHAKE!!" x={800} y={560} size={140} rot={8} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={POP} text="POP!" x={260} y={head[1] - 40} size={130} rot={-12} fill="#FFD064" dur={14} />
        <Sfx f={f} start={CHUG0 + 3} text="GLUG" x={760} y={head[1] + 40} size={100} rot={8} fill="#FFFFFF" dur={8} />
        <Sfx f={f} start={CHUG0 + 9} text="GLUG" x={790} y={head[1] + 150} size={110} rot={-6} fill="#FFFFFF" dur={8} />
        <Sfx f={f} start={CHUG0 + 15} text="GLUG!" x={760} y={head[1] + 260} size={120} rot={6} fill="#FFFFFF" dur={8} />
        <Sfx f={f} start={CHUG1} text="AHHH!" x={790} y={head[1] + 40} size={130} rot={8} fill="#FFD064" dur={12} />
        <Sfx f={f} start={FLEX} text="GAINS!" x={800} y={head[1] - 30} size={170} rot={8} fill="#FFD064" dur={22} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 94, 108)} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={17} />
    </Stage>
  );
};
