// Gym #2: "GUN SHOW" - curls, drop the bells, double biceps, tickets, bicep kiss.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, springAt, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Dust, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { GymBG, Columns, Platform } from './Gym';
import { Dumbbell, Ticket, stageOf, worldAngle, drop, INK } from './kit';
import { heartPath } from '../lib/shape';

const GX = 540;
const GY = 1700;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const RELEASE = 50;

const STAND: Partial<Pose> = {
  hipL: 9, hipR: 9, knL: -6, knR: -6, shL: 9, shR: 9, elL: 4, elR: 4, wrL: 0, wrR: 0,
  flexL: 0.35, flexR: 0.35, handL: 'fist', handR: 'fist', smile: 1, mouthOpen: 0.1,
};
const up = (s: 'L' | 'R'): Partial<Pose> =>
  s === 'L' ? { shL: 18, elL: -148, faL: 0.8, wrL: -16, flexL: 1.25 } : { shR: 18, elR: -148, faR: 0.8, wrR: -16, flexR: 1.25 };
const down = (s: 'L' | 'R'): Partial<Pose> =>
  s === 'L' ? { shL: 9, elL: 4, faL: 1, wrL: 0, flexL: 0.35 } : { shR: 9, elR: 4, faR: 1, wrR: 0, flexR: 0.35 };
const EFFORT: Partial<Pose> = { mouthMode: 'grit', mouthOpen: 0, lid: 0.3, browTilt: -0.6, brow: -0.2 };
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 1.9, flexR: 1.9,
  shrugL: 14, shrugR: 14, chestS: 1.1, torsoSy: 1.02, sy: 1.03, sx: 0.98, torso: 0, head: 0,
  hipL: 13, hipR: 13, knL: -6, knR: -6, handL: 'fist', handR: 'fist',
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, red: 0, sweat: 0, eyeMode: 'star',
  lookX: 0, lookY: 0, turn: 0,
};
const KISS: Partial<Pose> = {
  shL: 108, elL: 122, flexL: 2.25, torso: -6, head: -15, turn: -0.62, lookX: -1, eyes: 1, eyeMode: 'normal',
  mouthMode: 'o', mouthOpen: 0.22, smile: 0.4, blush: 1, brow: 0.6,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...STAND, lookY: 0.3, lookX: -0.3 } },
  { f: 11, p: { ...up('L'), ...EFFORT, lookX: -0.5, turn: -0.12 } },
  { f: 17, p: { ...down('L'), mouthMode: 'grin', lid: 0.1 } },
  { f: 22, p: { ...up('R'), ...EFFORT, lookX: 0.5, turn: 0.12 } },
  { f: 28, p: { ...down('R'), mouthMode: 'grin' } },
  { f: 33, p: { ...up('L'), ...EFFORT, lookX: -0.5, turn: -0.12, red: 0.25 } },
  { f: 38, p: { ...down('L') } },
  { f: 45, p: { ...up('L'), ...up('R'), ...EFFORT, lookX: 0, turn: 0, red: 0.6, lid: 0.55, sweat: 1, browTilt: -1 } },
  { f: RELEASE, p: { ...down('L'), ...down('R'), shL: 22, shR: 22, elL: 24, elR: 24, handL: 'open', handR: 'open', mouthMode: 'o', mouthOpen: 0.5, red: 0.15, lid: 0, browTilt: 0, brow: 0.7 }, e: E.out },
  { f: 56, p: { sy: 0.93, sx: 1.05, hipL: 16, hipR: 16, knL: -20, knR: -20, shL: 36, shR: 36, elL: 70, elR: 70, handL: 'fist', handR: 'fist', mouthMode: 'grit', lid: 0.4 }, e: E.inOut },
  { f: 61, p: DOUBLE_BI, e: E.back },
  { f: 72, p: { chestS: 1.13 } },
  { f: 78, p: KISS, e: E.inOut },
  { f: 88, p: { flexL: 2.35 } },
  { f: 94, p: { ...DOUBLE_BI, eyeMode: 'normal', wink: 1, mouthSkew: 0.4, blush: 0.4 }, e: E.inOut },
  { f: 104, p: { wink: 0, mouthSkew: 0 } },
  { f: 150, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  // pump: biceps throb right after the flex lands
  const pump = f >= 61 ? (springAt(f, 61, 14, 1.8, 4) - 1) * 0.5 : 0;
  const strain = seg(f, 40, 44) * (1 - seg(f, 46, 49));
  const br = f > 96 ? Math.sin((f - 96) / 7) * 0.012 : 0;
  return plant({
    ...p,
    flexL: p.flexL + pump,
    flexR: p.flexR + pump,
    x: Math.sin(f * 3.1) * 3 * strain,
    chestS: p.chestS + br,
  });
};

/* dumbbell pose at the moment the hands open */
const relPose = poseF(RELEASE - 1);
const relRig = rig(relPose);
const relDB = (s: 'L' | 'R') => {
  const m = s === 'L' ? relRig.aL.wrist : relRig.aR.wrist;
  return { pt: toStage(relRig.W(m, 0, 44)), a: worldAngle(relPose, m) };
};

export const GunShowScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const held = f < RELEASE;

  const cam: Cam = {
    cx: kf(f, [[0, 470], [16, 540, E.out], [74, 540], [80, 500, E.inOut], [92, 500], [100, 540, E.inOut]]),
    cy: kf(f, [[0, 1360], [16, 1080, E.out], [58, 1060], [62, 1020, E.out], [74, 1020], [80, 980, E.inOut], [92, 980], [100, 1010, E.inOut]]),
    z: kf(f, [[0, 1.55], [16, 1.0, E.out], [58, 1.0], [62, 1.1, E.out], [70, 1.04], [80, 1.2, E.inOut], [92, 1.2], [100, 1.0, E.inOut]]),
    r: kf(f, [[0, -3], [16, 0, E.out], [62, 1.5, E.out], [70, 0]]),
  };
  const s1 = shake(f, 61, 18, 26, 2);
  const s2 = shake(f, 59, 10, 14, 7);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r };

  // dropped dumbbells (stage space)
  const floor = GY - 34;
  const dropped = (s: 'L' | 'R', seed: number) => {
    if (held) return null;
    const { pt, a } = relDB(s);
    const t = f - RELEASE;
    const d = drop(t, pt[1], floor, -2, 2.6);
    const x = pt[0] + (s === 'L' ? -1 : 1) * Math.min(t, d.landed ? d.tl : t) * 1.6;
    const ang = d.landed ? lerp(a, 0, Math.min(1, (t - d.tl) / 4)) : a + (s === 'L' ? -1 : 1) * t * 2;
    return (
      <g key={s}>
        <g transform={`translate(${x} ${d.y}) rotate(${ang}) scale(${SC})`}>
          {s === 'L' ? <Dumbbell y={0} /> : <Dumbbell y={0} c="#F15F75" d="#B83A55" />}
        </g>
        {d.landed ? <Dust f={f} start={RELEASE + Math.ceil(d.tl)} x={x} y={floor + 20} n={5} spread={220} size={46} seed={seed} /> : null}
      </g>
    );
  };
  const land = RELEASE + Math.ceil(drop(99, relDB('L').pt[1], floor, -2, 2.6).tl);

  const head = toStage(r.headTop());
  const fistL = toStage(r.handL());
  const fistR = toStage(r.handR());
  const bicepL = toStage(r.W(r.aL.upper, -40, 70));
  const bicepR = toStage(r.W(r.aR.upper, -40, 70));
  const mouth = toStage(r.mouth());

  // tickets
  const ticket = (i: number) => {
    const t = f - (66 + i * 7);
    if (t < 0) return null;
    const x0 = [190, 890, 150][i];
    const x = x0 + Math.sin(t / 7 + i) * 60;
    const y = -140 + t * 19;
    if (y > 2100) return null;
    return <Ticket key={i} x={x} y={y} rot={Math.sin(t / 6 + i * 2) * 28 + (i - 1) * 12} s={0.95} flip={Math.max(0.25, Math.abs(Math.cos(t / 5 + i)))} />;
  };

  // kiss heart
  const kt = f - 84;
  const heart =
    kt >= 0 && kt < 26 ? (
      <g transform={`translate(${lerp(bicepL[0] + 40, mouth[0] - 170, Math.min(1, kt / 6)) - kt * 3} ${lerp(bicepL[1] - 30, mouth[1] - 60, Math.min(1, kt / 6)) - kt * 6}) rotate(${-14 + Math.sin(kt / 3) * 10}) scale(${Math.min(1, springAt(kt, 0, 8))})`} opacity={1 - seg(kt, 18, 26)}>
        <path d={heartPath(0, 0, 50)} fill={C.heart} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <ellipse cx={-18} cy={-16} rx={10} ry={7} fill="#FFFFFF" opacity={0.6} />
      </g>
    ) : null;

  return (
    <Stage impact={f === 61} overlay={<EndCard f={f} start={98} lines={['GUN SHOW']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Platform />
        <Ring x={540} y={1700} t={seg(f, 61, 80)} r={520} sy={0.22} color="#FFFFFF" w={28} />
        {f >= 61 && f < 76 ? <FocusLines f={f} cx={540} cy={1180} r0={460} opacity={0.7 * (1 - seg(f, 68, 76))} /> : null}
        <Glow x={540} y={1150} r={kf(f, [[60, 0], [64, 560, E.out], [90, 360]])} id="glowY" o={seg(f, 60, 62) * (1 - seg(f, 90, 120) * 0.5)} />
        <Burst x={540} y={1120} r={420} t={seg(f, 61, 78)} seed={5} />
        {dropped('L', 3)}
        {dropped('R', 4)}
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          itemL={held ? <Dumbbell /> : undefined}
          itemR={held ? <Dumbbell c="#F15F75" d="#B83A55" /> : undefined}
          itemBehindL
          itemBehindR
        />
        <Sparks f={f} start={61} seed={6} n={22} x={540} y={1120} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={bicepL[0] - 10} y={bicepL[1] - 40} s={1.2} t={seg(f, 64, 78)} />
        <Glint x={bicepR[0] + 10} y={bicepR[1] - 40} s={1.2} t={seg(f, 68, 82)} />
        <Glint x={fistR[0] + 30} y={fistR[1] - 30} s={0.9} t={seg(f, 100, 114)} />
        {heart}
        <Sfx f={f} start={11} text="1!" x={fistL[0] - 120} y={fistL[1] - 60} size={110} rot={-10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={22} text="2!" x={fistR[0] + 120} y={fistR[1] - 60} size={110} rot={8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={33} text="3!" x={fistL[0] - 120} y={fistL[1] - 60} size={110} rot={-10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={44} text="NNNGH!" x={540} y={head[1] - 120} size={120} rot={-4} fill="#FFD064" dur={14} />
        <Sfx f={f} start={land} text="CLONK!" x={300} y={1520} size={130} rot={-10} fill="#FFFFFF" dur={20} />
        <Sfx f={f} start={61} text="POW!" x={820} y={720} size={200} rot={10} fill="#FFD064" dur={26} />
        <Sfx f={f} start={84} text="MWAH!" x={250} y={720} size={130} rot={-12} fill="#FBD3E0" dur={22} />
      </g>
      <Columns cam={cam} sh={sh} />
      <g>
        {[0, 1, 2].map(ticket)}
      </g>
      <ConfettiRain f={f} start={102} n={50} seed={8} />
    </Stage>
  );
};
