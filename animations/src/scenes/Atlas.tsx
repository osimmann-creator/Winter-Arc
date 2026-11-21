// Gym #4: "ATLAS MODE" - deadlift a giant marble ball, press it overhead, spin it on one finger, flick it into the sky.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Dust, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { GymBG, Columns, Platform, Cracks } from './Gym';
import { stageOf, INK } from './kit';
import { reach2, toRoot } from './ik';
import { TITLE_FONT } from '../fonts';

const GX = 540;
const GY = 1700;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const BR = 250; // ball radius (hero units)
const PRESS = 44;
const FLICK = 81;

/* ------------------------------- ball ------------------------------- */
const VEINS = [
  'M-300 -120 C-220 -160 -170 -60 -90 -100 S20 -170 90 -110 S210 -40 300 -90',
  'M-300 40 C-240 0 -180 90 -110 60 S-10 -10 60 40 S180 120 300 70',
  'M-300 150 C-200 120 -160 190 -60 170 S90 110 170 160 S260 200 300 180',
  'M-170 -230 C-140 -180 -160 -130 -120 -80',
  'M120 -40 C150 0 130 50 170 100',
];
export const MarbleBall: React.FC<{ r: number; spin: number; id: string }> = ({ r, spin, id }) => {
  const k = r / BR;
  const off = (((spin % 600) + 600) % 600) - 300;
  const layer = (dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      {VEINS.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#C9BCE6" strokeWidth={i < 3 ? 14 : 8} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#A996D6" strokeWidth={i < 3 ? 4 : 3} strokeLinecap="round" />
        </g>
      ))}
      <rect x={-150} y={-36} width={300} height={72} rx={14} fill="#E7DFF6" stroke="#B9A9DD" strokeWidth={5} />
      <text x={0} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={52} fill="#9C88CF" letterSpacing={4}>
        1000 KG
      </text>
    </g>
  );
  return (
    <g transform={`scale(${k})`}>
      <defs>
        <clipPath id={id}>
          <circle r={BR} />
        </clipPath>
      </defs>
      <circle r={BR + 4} fill={INK} transform="translate(0 14)" opacity={0.25} />
      <circle r={BR} fill="#D8CEEC" />
      <g clipPath={`url(#${id})`}>
        <circle r={BR} cx={-26} cy={-30} fill="#FBF8FF" />
        {layer(off)}
        {layer(off - 600)}
        {layer(off + 600)}
        <circle r={BR} cx={70} cy={80} fill="none" stroke="#C6B8E3" strokeWidth={70} opacity={0.55} />
      </g>
      <ellipse cx={-92} cy={-120} rx={56} ry={34} fill="#FFFFFF" opacity={0.85} transform="rotate(-35 -92 -120)" />
      <circle cx={-150} cy={-60} r={12} fill="#FFFFFF" opacity={0.85} />
      <circle r={BR} fill="none" stroke={INK} strokeWidth={9} />
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const SQ: Partial<Pose> = {
  hipL: 40, hipR: 40, knL: -50, knR: -50, thL: 0.66, thR: 0.66, ftL: 8, ftR: 8, torsoSy: 0.86, sy: 0.98,
  handL: 'open', handR: 'open', flexL: 0.7, flexR: 0.7, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0,
  mouthMode: 'grin', mouthOpen: 0.2, smile: 1, lookY: 0.5, brow: 0.4,
};
const UPR: Partial<Pose> = { hipL: 13, hipR: 13, knL: -8, knR: -8, thL: 1, thR: 1, ftL: 2, ftR: 2, torsoSy: 1, sy: 1 };
const KEYS: Key<Pose>[] = [
  { f: 0, p: SQ },
  { f: 12, p: { mouthMode: 'grit', mouthOpen: 0, lid: 0.3, browTilt: -0.6, lookY: 0.2 } },
  { f: 32, p: { ...UPR, red: 0.85, lid: 0.55, browTilt: -1, sweat: 1, lookY: -0.1, flexL: 1.2, flexR: 1.2 }, e: E.inOut },
  { f: 37, p: { hipL: 24, hipR: 24, knL: -26, knR: -26, thL: 0.86, thR: 0.86, sy: 0.96 }, e: E.inOut },
  { f: PRESS, p: { ...UPR, sy: 1.05, sx: 0.97, chestS: 1.08, mouthMode: 'grin', mouthOpen: 1, smile: 1, red: 0.2, lid: 0, browTilt: 0, brow: 1, lookY: -0.6, sweat: 0.5 }, e: E.out },
  { f: 50, p: { sy: 1, sx: 1, chestS: 1.06 }, e: E.inOut },
  { f: 56, p: { lookY: -0.8, mouthOpen: 0.5 } },
  {
    f: 62,
    p: {
      hipL: 9, hipR: 17, knL: -4, knR: -10, torso: -5, head: 6, chestS: 1.04,
      eyes: 1, mouthMode: 'o', mouthOpen: 0.18, smile: 0.6, brow: 0.7, sweat: 0, red: 0,
      handR: 'point', handL: 'fist', shR: 174, elR: 4, wrR: 0, flexR: 0.5, flexL: 0.9,
    },
    e: E.inOut,
  },
  { f: FLICK - 2, p: { eyes: 1 } },
  { f: FLICK, p: { elR: -26, wrR: -20, eyes: 0, mouthMode: 'grin', mouthOpen: 0.6, smile: 1, lookY: -1, head: -8, torso: -2 }, e: E.out },
  { f: FLICK + 6, p: { elR: 8, wrR: 0 }, e: E.inOut },
  { f: 100, p: { lookY: -0.4, head: 0, turn: 0.1, mouthOpen: 0.8 } },
  { f: 150, p: {} },
];

// ball centre (hero space) while it's in the hands
const ballY = (f: number) =>
  kf(f, [[0, -BR - 4], [14, -BR - 4], [32, -585, E.inOut], [37, -560, E.inOut], [PRESS, -1250, E.out], [56, -1250]]);
const ballX = (f: number) => (f > PRESS ? Math.sin((f - PRESS) / 3) * 6 * (1 - seg(f, PRESS + 8, 56)) : 0);

/** Pose with arms solved for this frame. */
const solve = (f: number): Pose => {
  const base = plant(poseAt(f, BASE, KEYS));
  // strain jitter while lifting
  const strain = seg(f, 14, 18) * (1 - seg(f, 31, 33));
  const b = { ...base, x: Math.sin(f * 3.1) * 3.5 * strain, rot: Math.sin(f * 3.7) * 0.7 * strain };
  if (f >= 59) {
    // left fist on the hip; right arm stays up from the keys
    const r = rig(b);
    const hip = r.W(r.torso, -118, -26);
    const q = reach2(b, hip, null, 1, 1, 34);
    return { ...q, handL: 'fist' };
  }
  const cx = ballX(f);
  const cy = ballY(f);
  const over = seg(f, 37, PRESS);
  const gx = lerp(0.84, 0.72, over);
  const gy = lerp(0.28, 0.66, over);
  const bend: 1 | -1 = f < 20 ? 1 : -1;
  const q = reach2(b, [cx - BR * gx, cy + BR * gy], [cx + BR * gx, cy + BR * gy], bend, bend, 30);
  // blend the overhead arms into the spin pose
  const t = seg(f, 54, 59);
  if (t > 0) {
    const k = poseAt(f, BASE, KEYS);
    return { ...q, shR: lerp(q.shR, k.shR, t), elR: lerp(q.elR, k.elR, t), shL: lerp(q.shL, 30, t), elL: lerp(q.elL, -100, t) };
  }
  return q;
};

const fingertip = (p: Pose) => {
  const r = rig(p);
  return r.W(r.aR.wrist, 22, 142);
};

export const AtlasScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const inHands = f < 37;

  // ball centre in hero space for every phase
  let bc: [number, number] = [ballX(f), ballY(f)];
  let bs = 1;
  const tip = fingertip(p);
  if (f >= 54) {
    const onTip: [number, number] = [tip[0] + Math.sin(f / 4) * 5, tip[1] - BR + 6];
    bc = f < 59 ? [lerp(bc[0], onTip[0], E.inOut(seg(f, 54, 59))), lerp(bc[1], onTip[1], E.inOut(seg(f, 54, 59)))] : onTip;
  }
  const lt = f - FLICK;
  if (lt > 0) {
    const t0 = fingertip(solve(FLICK));
    bc = [t0[0] + lt * 14, t0[1] - BR - (34 * lt + 4 * lt * lt)];
    bs = Math.max(0.12, 1 - lt / 16);
  }
  const spin = f < 56 ? 0 : (f - 56) * 46 + Math.max(0, f - FLICK) * 30;
  const ballStage = toStage(bc);
  const ballLocal = toRoot(p, bc);

  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1430], [14, 1400], [32, 1150, E.inOut], [PRESS, 1000, E.out], [80, 990], [92, 960, E.inOut], [104, 1040, E.inOut]]),
    z: kf(f, [[0, 1.35], [14, 1.3], [32, 1.0, E.inOut], [PRESS, 0.9, E.out], [62, 0.92], [80, 0.95], [92, 0.88, E.inOut], [104, 1.0, E.inOut]]),
    r: kf(f, [[0, -2], [32, 0], [PRESS, 1.2, E.out], [54, 0]]),
  };
  const s0 = shake(f, 14, 18, 4, 1);
  const s1 = shake(f, PRESS, 24, 30, 3);
  const sh = { x: s0.x + s1.x, y: s0.y + s1.y, r: s1.r };
  const ball = <MarbleBall r={BR * bs} spin={spin} id="marble" />;
  const head = toStage(r.headTop());
  const twinkleT = seg(f, 93, 112);

  return (
    <Stage impact={f === PRESS} overlay={<EndCard f={f} start={98} lines={['ATLAS MODE']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymBG f={f} cam={cam} sh={sh} />
      {/* the flicked ball becomes a star */}
      <g transform={camP(cam, 0.15, sh)}>
        {twinkleT > 0 && twinkleT < 1 ? <Twinkle x={760} y={250} s={2.2} t={twinkleT} color="#FFF0B7" /> : null}
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Platform />
        <Cracks f={f} start={PRESS} />
        <ellipse cx={ballStage[0]} cy={GY - 6} rx={250} ry={34} fill="#000" opacity={0.18 * (1 - seg(f, 14, 30))} />
        <Ring x={540} y={1700} t={seg(f, PRESS, PRESS + 18)} r={540} sy={0.22} w={30} />
        {f >= PRESS && f < PRESS + 14 ? <FocusLines f={f} cx={ballStage[0]} cy={ballStage[1]} r0={300} opacity={0.75 * (1 - seg(f, PRESS + 6, PRESS + 14))} /> : null}
        <Glow x={ballStage[0]} y={ballStage[1]} r={kf(f, [[PRESS - 1, 0], [PRESS + 3, 520, E.out], [PRESS + 20, 300], [FLICK, 260]])} id="glowY" o={seg(f, PRESS - 1, PRESS + 1) * (1 - seg(f, FLICK, FLICK + 10))} />
        <Burst x={ballStage[0]} y={ballStage[1] + 120} r={420} t={seg(f, PRESS, PRESS + 16)} seed={7} />
        {/* ball behind the hero once it's overhead */}
        {!inHands && bs > 0.13 ? <g transform={`translate(${ballStage[0]} ${ballStage[1]}) scale(${SC}) rotate(${spin * 0.02})`}>{ball}</g> : null}
        {/* spin rings */}
        {f >= 58 && f < FLICK
          ? [0, 1].map((i) => (
              <ellipse key={i} cx={ballStage[0]} cy={ballStage[1] + 30 * i - 10} rx={BR * SC * 1.12} ry={34} fill="none" stroke="#FFFFFF" strokeWidth={10} strokeDasharray="120 200" strokeDashoffset={-f * 60 - i * 150} opacity={0.8} />
            ))
          : null}
        <Hero p={p} x={GX} y={GY} scale={SC} between={inHands ? <g transform={`translate(${ballLocal[0]} ${ballLocal[1]})`}>{ball}</g> : undefined} />
        <Dust f={f} start={PRESS} x={540} y={1690} n={10} spread={560} size={64} seed={4} />
        <Sparks f={f} start={PRESS} seed={21} n={24} x={ballStage[0]} y={ballStage[1]} speed={[16, 38]} g={0.9} size={[14, 26]} />
        <Glint x={head[0] + 120} y={head[1] + 120} s={1} t={seg(f, 64, 78)} />
        {/* whistle notes */}
        {[0, 1, 2].map((i) => {
          const t = f - (63 + i * 5);
          if (t < 0 || t > 18) return null;
          const m = toStage(r.mouth());
          return (
            <text key={i} x={m[0] - 60 - t * 4} y={m[1] - 30 - t * 6} fontFamily={TITLE_FONT} fontSize={70} fill="#7254DC" stroke={INK} strokeWidth={4} opacity={1 - seg(t, 12, 18)} transform={`rotate(${-12 + Math.sin(t / 2) * 10} ${m[0] - 60} ${m[1] - 30})`}>
              ♪
            </text>
          );
        })}
        <Sfx f={f} start={16} text="HRNNGH!" x={300} y={980} size={110} rot={-8} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={PRESS} text="BOOM!" x={800} y={1220} size={180} rot={9} fill="#FFD064" dur={26} />
        <Sfx f={f} start={FLICK} text="FLICK!" x={300} y={760} size={130} rot={-10} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={94} text="TING!" x={770} y={430} size={110} rot={8} fill="#FFF0B7" dur={18} />
      </g>
      <Columns cam={cam} sh={sh} />
      <ConfettiRain f={f} start={102} n={50} seed={13} />
    </Stage>
  );
};

