// Gym #10: "HAMMER TIME" - sledgehammer on a tractor tyre. Bonk... then BWANG: the tyre launches
// out of frame, comes back down and lands around him like a ring toss. Ringer. Flex.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, wobble } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Ring, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust } from '../fx/fx';
import { Swoosh } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { stageOf, INK, Pt } from './kit';
import { GymRoomBG, FloorShadow, Tyre } from './GymRoom';

const GX = 400;
const GY = 1700;
const SC = 0.86;
const toStage = stageOf(GX, GY, SC);
const toHero = (pt: Pt): Pt => [(pt[0] - GX) / SC, (pt[1] - GY) / SC];
const TYRE0: Pt = [810, 1752];
const TRX = 280;
const TRY = 92;
const TTH = 88;
const SLAM1 = 22;
const SLAM2 = 40;
const LAUNCH = SLAM2;
const ARMS_UP = 54;
const DOWN0 = 58;
const RINGER = 68;
const FLEX = 80;
const CARD = 96;
const HAM_L = 410; // hero units from the bottom hand to the head centre
const HAND_GAP = 120;

/* ------------------------------- hammer ------------------------------- */
type Ham = { g: Pt; a: number }; // bottom-hand point (hero space) + handle angle (deg; 0 = right, 90 = down)
const slamA = (() => {
  const t = toHero([TYRE0[0] - 30, TYRE0[1] - TRY * 0.4]);
  const g: Pt = [236, -330];
  return { g, a: (Math.atan2(t[1] - g[1], t[0] - g[0]) * 180) / Math.PI };
})();
const HKEYS: { f: number; h: Ham; e?: (t: number) => number }[] = [
  { f: 0, h: { g: [150, -440], a: -62 } },
  { f: 8, h: { g: [150, -460], a: -60 } },
  { f: SLAM1 - 4, h: { g: [176, -860], a: -128 }, e: E.inOut },
  { f: SLAM1, h: slamA, e: E.in },
  { f: SLAM1 + 4, h: { g: [220, -380], a: slamA.a - 14 }, e: E.out },
  { f: SLAM2 - 4, h: { g: [150, -880], a: -142 }, e: E.inOut },
  { f: SLAM2, h: slamA, e: E.in },
];
const hamAt = (f: number): Ham => {
  if (f <= HKEYS[0].f) return HKEYS[0].h;
  for (let i = 1; i < HKEYS.length; i++) {
    const k0 = HKEYS[i - 1];
    const k1 = HKEYS[i];
    if (f <= k1.f) {
      const t = (k1.e ?? E.inOut)(seg(f, k0.f, k1.f));
      return { g: [lerp(k0.h.g[0], k1.h.g[0], t), lerp(k0.h.g[1], k1.h.g[1], t)], a: lerp(k0.h.a, k1.h.a, t) };
    }
  }
  return HKEYS[HKEYS.length - 1].h;
};
const dir = (a: number): Pt => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];

/** Sledgehammer in stage space from the bottom hand g (stage) along angle a. */
const SledgeS: React.FC<{ g: Pt; a: number }> = ({ g, a }) => {
  const d = dir(a);
  const len = HAM_L * SC;
  const butt: Pt = [g[0] - d[0] * 40 * SC, g[1] - d[1] * 40 * SC];
  const head: Pt = [g[0] + d[0] * len, g[1] + d[1] * len];
  return (
    <g>
      <line x1={butt[0]} y1={butt[1]} x2={head[0]} y2={head[1]} stroke={INK} strokeWidth={34} strokeLinecap="round" />
      <line x1={butt[0]} y1={butt[1]} x2={head[0]} y2={head[1]} stroke="#C98B4E" strokeWidth={20} strokeLinecap="round" />
      <line x1={butt[0] + d[1] * 4} y1={butt[1] - d[0] * 4} x2={head[0] + d[1] * 4} y2={head[1] - d[0] * 4} stroke="#E9B57E" strokeWidth={5} strokeLinecap="round" />
      <g transform={`translate(${head[0]} ${head[1]}) rotate(${a + 90}) scale(${SC})`}>
        <rect x={-96} y={-44} width={192} height={88} rx={18} fill="#5D5878" stroke={INK} strokeWidth={9} />
        <rect x={-82} y={-32} width={150} height={20} rx={8} fill="#9B95B5" />
        <rect x={-110} y={-50} width={22} height={100} rx={8} fill="#433C4F" stroke={INK} strokeWidth={7} />
        <rect x={88} y={-50} width={22} height={100} rx={8} fill="#433C4F" stroke={INK} strokeWidth={7} />
      </g>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const READY: Partial<Pose> = { hipL: 14, hipR: 14, knL: -10, knR: -10, handL: 'fist', handR: 'fist', smile: 1, mouthOpen: 0.2, brow: 0.5, lookX: 0.4, turn: 0.2, flexL: 1.2, flexR: 1.2 };
const RAISED: Partial<Pose> = { hipL: 12, hipR: 12, knL: -4, knR: -4, torsoSy: 1.04, chestS: 1.06, rot: -4, mouthMode: 'grit', mouthOpen: 0.2, lid: 0.35, browTilt: -0.9, brow: -0.1, lookX: 0.6, lookY: 0.3, turn: 0.3, flexL: 1.7, flexR: 1.7 };
const SLAMMED: Partial<Pose> = { hipL: 26, hipR: 26, knL: -40, knR: -40, thL: 0.8, thR: 0.8, torsoSy: 0.94, sy: 0.95, rot: 6, mouthMode: 'grin', mouthOpen: 0.8, lid: 0, browTilt: 0, brow: 0.9, lookX: 0.8, lookY: 0.5, turn: 0.35 };
const UP: Partial<Pose> = {
  hipL: 10, hipR: 10, knL: -4, knR: -4, thL: 1, thR: 1, torsoSy: 1, sy: 1, sx: 1, rot: 0, chestS: 1,
  shL: 168, shR: 168, elL: 8, elR: 8, wrL: 0, wrR: 0, handL: 'open', handR: 'open', flexL: 0.8, flexR: 0.8,
  mouthMode: 'o', mouthOpen: 0.8, smile: 0.6, brow: 1, browTilt: 0.6, lookX: 0, lookY: -1, turn: 0,
};
const DOUBLE_BI: Partial<Pose> = {
  shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 2, flexR: 2,
  shrugL: 14, shrugR: 14, chestS: 1.12, hipL: 16, hipR: 16, knL: -6, knR: -6, handL: 'fist', handR: 'fist',
  mouthMode: 'grin', mouthOpen: 0.95, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', lookX: 0, lookY: 0, turn: 0, rot: 0,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: READY },
  { f: SLAM1 - 4, p: RAISED, e: E.inOut },
  { f: SLAM1, p: SLAMMED, e: E.in },
  { f: SLAM1 + 6, p: { ...READY, mouthMode: 'grin', lookX: 0.8, lookY: 0.4, turn: 0.35, mouthSkew: 0.6, brow: 1 }, e: E.out },
  { f: SLAM2 - 4, p: { ...RAISED, rot: -7, red: 0.6, sweat: 1, lid: 0.5 }, e: E.inOut },
  { f: SLAM2, p: { ...SLAMMED, red: 0.3, eyeMode: 'star' }, e: E.in },
  { f: SLAM2 + 8, p: { ...SLAMMED, eyeMode: 'normal', mouthMode: 'o', mouthOpen: 0.9, lookX: 0.2, lookY: -1, turn: 0.1, brow: 1, browTilt: 0.7, red: 0 }, e: E.out },
  { f: ARMS_UP, p: UP, e: E.inOut },
  { f: RINGER - 1, p: { ...UP, mouthOpen: 1, brow: 1, browTilt: 0.8 } },
  { f: RINGER + 1, p: { ...UP, mouthMode: 'grin', smile: 1, mouthOpen: 1, eyeMode: 'star', lookY: 0, brow: 0.9, browTilt: 0 }, e: E.out },
  { f: RINGER + 3, p: { sy: 0.95, sx: 1.03 }, e: E.out },
  { f: FLEX - 2, p: { ...DOUBLE_BI, chestS: 1.04, flexL: 1.4, flexR: 1.4, eyeMode: 'normal' }, e: E.inOut },
  { f: FLEX, p: DOUBLE_BI, e: E.back },
  { f: 90, p: { eyeMode: 'normal', wink: 1, mouthSkew: 0.5, mouthOpen: 0.5, turn: 0.15, lookX: 0.4 }, e: E.inOut },
  { f: 102, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
  { f: 140, p: {} },
];

const holding = (f: number) => f < SLAM2 + 3;
const solve = (f: number): Pose => {
  let p = plant(poseAt(f, BASE, KEYS));
  if (holding(f)) {
    const h = hamAt(f);
    const d = dir(h.a);
    const lo: Pt = h.g;
    const hi: Pt = [h.g[0] + d[0] * HAND_GAP, h.g[1] + d[1] * HAND_GAP];
    p = { ...p, ...reach(p, 'L', lo, 1), ...reach(p, 'R', hi, 1), wrL: 0, wrR: 0, handL: 'grip', handR: 'grip' };
  }
  return p;
};

/* ------------------------------- tyre path ------------------------------- */
type TyreS = { x: number; y: number; rx: number; ry: number; rot: number; vis: boolean };
const tyreAt = (f: number): TyreS => {
  const base: TyreS = { x: TYRE0[0], y: TYRE0[1], rx: TRX, ry: TRY, rot: 0, vis: true };
  if (f < SLAM1) return base;
  if (f < LAUNCH) {
    const t = f - SLAM1;
    const hop = Math.max(0, Math.sin((t / 9) * Math.PI)) * 46 * (t < 9 ? 1 : 0);
    const sq = t < 4 ? 1 - Math.sin((t / 4) * Math.PI) * 0.22 : 1;
    return { ...base, y: base.y - hop, ry: TRY * sq, rx: TRX * (2 - sq) };
  }
  if (f < DOWN0) {
    // launched: up and out of the top while flipping
    const t = seg(f, LAUNCH, LAUNCH + 12);
    if (t >= 1) return { ...base, vis: false };
    return { x: lerp(TYRE0[0], GX + 60, t), y: lerp(TYRE0[1], -1100, Math.pow(t, 0.7)), rx: TRX, ry: TRY * Math.cos(t * Math.PI * 3), rot: t * 50, vis: true };
  }
  // coming back down flat, around him, onto the floor
  const t = seg(f, DOWN0, RINGER);
  if (f < RINGER) return { x: GX, y: lerp(-700, GY + 52, E.in(t)), rx: TRX, ry: TRY, rot: 0, vis: true };
  const b = f - RINGER;
  const bounce = b < 10 ? Math.abs(Math.sin((b / 10) * Math.PI)) * 30 * (1 - b / 10) : 0;
  const sq = b < 4 ? 1 - Math.sin((b / 4) * Math.PI) * 0.16 : 1;
  return { x: GX, y: GY + 52 - bounce, rx: TRX * (2 - sq), ry: TRY * sq, rot: wobble(f, RINGER, 0.4, 0.15, 2), vis: true };
};

/** Dropped hammer: falls to the floor on his right and lies there. */
const droppedHammer = (f: number): { g: Pt; a: number } => {
  const t = seg(f, SLAM2 + 3, SLAM2 + 13);
  const from = toStage(slamA.g);
  const to: Pt = [GX + 330, GY + 40];
  return { g: [lerp(from[0], to[0], t), lerp(from[1], to[1], E.in(t)) - Math.sin(t * Math.PI) * 60], a: lerp(slamA.a, -4, E.out(t)) };
};

/* ------------------------------- scene ------------------------------- */
export const HammerTimeScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const bicepL = toStage(r.W(r.aL.upper, -40, 70));
  const bicepR = toStage(r.W(r.aR.upper, -40, 70));
  const ty = tyreAt(f);
  const aroundHim = f >= DOWN0 && ty.y + ty.ry + TTH > head[1] - 20; // the tyre has reached his body: split front/back

  const cam: Cam = {
    cx: kf(f, [[0, 610], [SLAM2, 600], [SLAM2 + 10, 560, E.out], [RINGER, GX + 20, E.inOut], [CARD + 6, GX + 40, E.inOut]]),
    cy: kf(f, [[0, 1260], [10, 1200, E.out], [SLAM2, 1200], [SLAM2 + 8, 1040, E.out], [DOWN0, 1000, E.inOut], [RINGER, 1180, E.inOut], [FLEX, 1140], [CARD + 6, 1080, E.inOut], [140, 1070]]),
    z: kf(f, [[0, 1.08], [10, 0.95, E.out], [SLAM2 - 4, 1.0], [SLAM2, 0.92, E.out], [DOWN0, 0.9], [RINGER, 1.04, E.out], [FLEX, 1.06], [CARD + 6, 1.0, E.inOut]]),
    r: kf(f, [[SLAM2 - 1, 0], [SLAM2 + 1, 2.5, E.out], [SLAM2 + 12, 0, E.inOut]]),
  };
  const s1 = shake(f, SLAM1, 10, 14, 1);
  const s2 = shake(f, SLAM2, 18, 34, 2);
  const s3 = shake(f, RINGER, 12, 16, 3);
  const s4 = shake(f, FLEX, 12, 12, 4);
  const sh = { x: s1.x + s2.x + s3.x + s4.x, y: s1.y + s2.y + s3.y + s4.y, r: s2.r + s3.r };

  const ham = holding(f) ? hamAt(f) : null;
  const hamG = ham ? toStage(ham.g) : null;
  const behindHead = ham ? ham.a < -95 && ham.a > -175 : false;
  const hamTrail: Pt[] = [];
  if (ham && f >= SLAM2 - 5 && f <= SLAM2 + 1) {
    for (let i = 0; i < 7; i++) {
      const h = hamAt(f - i * 0.8);
      const g = toStage(h.g);
      const d = dir(h.a);
      hamTrail.push([g[0] + d[0] * HAM_L * SC, g[1] + d[1] * HAM_L * SC]);
    }
  }
  const dh = droppedHammer(f);
  const crack = f >= SLAM2;

  const tyreBack = ty.vis ? <Tyre x={ty.x} y={ty.y} rx={ty.rx} ry={Math.abs(ty.ry)} th={TTH * (ty.ry / TRY)} part="back" rot={ty.rot} f={f} /> : null;
  const tyreFront = ty.vis ? <Tyre x={ty.x} y={ty.y} rx={ty.rx} ry={Math.abs(ty.ry)} th={TTH * Math.abs(ty.ry / TRY)} part="front" rot={ty.rot} f={f} /> : null;
  const tyreAll = ty.vis ? <Tyre x={ty.x} y={ty.y} rx={ty.rx} ry={Math.abs(ty.ry)} th={TTH * Math.abs(ty.ry / TRY)} part="all" rot={ty.rot} f={f} /> : null;

  return (
    <Stage impact={f === SLAM2} overlay={<EndCard f={f} start={CARD} lines={['HAMMER TIME']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymRoomBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <FloorShadow x={GX} y={GY + 6} w={240} />
        {f < LAUNCH + 6 ? <FloorShadow x={TYRE0[0]} y={TYRE0[1] + TTH * 0.6} w={TRX + 20} o={0.3 * (1 - seg(f, LAUNCH, LAUNCH + 6))} /> : null}
        {f >= DOWN0 ? <FloorShadow x={GX} y={GY + 52 + TTH * 0.6} w={(TRX + 20) * seg(f, DOWN0, RINGER)} o={0.3} /> : null}
        {/* floor cracks where the second slam landed */}
        {crack ? (
          <g opacity={1 - seg(f, 110, 130)} transform={`translate(${TYRE0[0] - 20} ${TYRE0[1] + 30})`}>
            <path d="M0 0 L-120 -10 L-190 24 M0 0 L80 -34 L170 -24 M0 0 L-30 50 L-90 70 M0 0 L60 40 L150 66" fill="none" stroke="#2B2340" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
        <Glow x={GX} y={chest[1]} r={kf(f, [[FLEX - 1, 0], [FLEX + 3, 540, E.out], [FLEX + 24, 380]])} id="glowY" o={seg(f, FLEX - 1, FLEX + 1) * (1 - seg(f, 112, 130) * 0.5)} />
        <Burst x={GX} y={chest[1]} r={440} t={seg(f, FLEX, FLEX + 17)} seed={18} />
        <Burst x={TYRE0[0] - 20} y={TYRE0[1] - 20} r={330} t={seg(f, SLAM2, SLAM2 + 14)} seed={19} />
        {f >= FLEX && f < FLEX + 14 ? <FocusLines f={f} cx={GX} cy={chest[1]} r0={470} opacity={0.6 * (1 - seg(f, FLEX + 6, FLEX + 14))} /> : null}
        {/* tyre: whole while it's beside him / above him, split around his body once it drops over him */}
        {!aroundHim ? null : tyreBack}
        {f < LAUNCH ? tyreAll : null}
        {f >= SLAM2 + 3 ? <SledgeS g={dh.g} a={dh.a} /> : null}
        {ham && hamG && behindHead ? <SledgeS g={hamG} a={ham.a} /> : null}
        {hamTrail.length > 2 ? <Swoosh pts={hamTrail} width={110} opacity={0.6} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} />
        {ham && hamG && !behindHead ? <SledgeS g={hamG} a={ham.a} /> : null}
        {aroundHim ? tyreFront : f >= LAUNCH ? tyreAll : null}
        <Dust f={f} start={SLAM1} x={TYRE0[0] - 20} y={TYRE0[1] + 20} n={5} spread={280} size={46} seed={4} />
        <Dust f={f} start={SLAM2} x={TYRE0[0] - 20} y={TYRE0[1] + 20} n={9} spread={460} size={66} seed={5} />
        <Dust f={f} start={RINGER} x={GX} y={GY + 70} n={9} spread={520} size={60} seed={6} />
        <Dust f={f} start={SLAM2 + 13} x={GX + 520} y={GY + 50} n={4} spread={200} size={40} seed={7} />
        <Ring x={GX} y={GY + 60} t={seg(f, RINGER, RINGER + 16)} r={460} sy={0.24} w={24} />
        <Sparks f={f} start={SLAM2} seed={20} n={16} x={TYRE0[0] - 20} y={TYRE0[1] - 20} speed={[14, 32]} g={1} size={[14, 24]} />
        <Sparks f={f} start={FLEX} seed={21} n={22} x={GX} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={bicepL[0] - 10} y={bicepL[1] - 40} s={1.2} t={seg(f, FLEX + 3, FLEX + 17)} />
        <Glint x={bicepR[0] + 10} y={bicepR[1] - 40} s={1.2} t={seg(f, FLEX + 7, FLEX + 21)} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 92, 106)} />
        <Sfx f={f} start={SLAM1} text="BONK!" x={900} y={1440} size={130} rot={10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={SLAM2} text="BWANG!" x={760} y={1300} size={190} rot={-8} fill="#FFD064" dur={18} />
        <Sfx f={f} start={SLAM2 + 13} text="CLUNK" x={GX + 560} y={GY - 120} size={90} rot={8} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={DOWN0 - 4} text="UH OH" x={GX + 260} y={head[1] - 140} size={100} rot={6} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={RINGER} text="RINGER!" x={GX + 10} y={GY + 270} size={150} rot={-5} fill="#FFD064" dur={22} />
        <Sfx f={f} start={FLEX} text="POW!" x={GX + 330} y={head[1] + 20} size={160} rot={8} fill="#FFFFFF" dur={20} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={22} />
    </Stage>
  );
};
