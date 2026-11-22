// Run #10: "COFFEE RUN" - drive-thru at the corner coffee cart without breaking stride (much).
// One sip... ZING. He turbo-sprints off, coffee steaming, and toasts the camera at the end.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { TITLE_FONT } from '../fonts';
import { reach } from './ik';
import { Steam, INK, Pt } from './kit';
import { makeRun, gait, runLift, STOP, WheelLegs } from './RunKit';
import { CityWorld, CITY, P, HY, CityObj } from './CityKit';

const GX = 540;
const ARRIVE = 14;
const GRAB = 22;
const SIP0 = 27;
const ZING = 36;
const BOOST = 40;
const SKID = 74;
const POSE = 82;
const CARD = 96;
const RUN = makeRun(
  [[0, 0.12], [ARRIVE - 2, 0.1], [ARRIVE + 2, 0.004, E.out], [BOOST - 1, 0.004], [BOOST + 3, 0.46, E.in], [SKID - 4, 0.44], [SKID + 6, 0.03, E.out], [SKID + 10, 0, E.out]],
  [[0, 13], [ARRIVE, 12], [BOOST - 1, 11], [BOOST + 3, 6.2, E.in], [SKID, 6.2], [SKID + 6, 14, E.out]],
  [SKID + 2, SKID + 8],
);
const turboAt = (f: number) => seg(f, BOOST, BOOST + 4) * (1 - seg(f, SKID - 2, SKID + 4));
const CART_X = 1.0;
const CART_S = 1.36 - RUN.distAt(ARRIVE + 4); // the cart sits right beside him while he grabs the cup
const CUP_DX = -0.6; // vendor's cup, relative to the cart centre (world units)
const CUP_H = 1.05;

/* ------------------------------- props ------------------------------- */
/** Paper coffee cup, centred at (0,0) (px at z = 1, or hero units). */
const Cup: React.FC<{ s?: number; rot?: number; full?: boolean }> = ({ s = 1, rot = 0 }) => (
  <g transform={`rotate(${rot}) scale(${s})`}>
    <path d="M-62 -90 L62 -90 L48 96 Q0 108 -48 96 Z" fill="#FFFFFF" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-58 -30 L58 -30 L52 46 L-52 46 Z" fill="#B07A4E" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M0 -14 L8 2 L26 4 L12 14 L16 32 L0 22 L-16 32 L-12 14 L-26 4 L-8 2 Z" fill="#FFD064" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <rect x={-72} y={-122} width={144} height={36} rx={14} fill="#F2853A" stroke={INK} strokeWidth={9} />
    <rect x={-40} y={-136} width={80} height={20} rx={8} fill="#F2853A" stroke={INK} strokeWidth={7} />
  </g>
);

/** Coffee cart, front view, with the vendor holding a cup out toward the street. */
const Cart: React.FC<{ x: number; y: number; s: number; f: number; holding: boolean; wave: number; hatOff: number }> = ({ x, y, s, f, holding, wave, hatOff }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={6} rx={520} ry={60} fill="#1E1A2E" opacity={0.2} />
    {/* umbrella */}
    <rect x={-14} y={-1500} width={28} height={900} fill="#4F4A6A" stroke={INK} strokeWidth={10} />
    <path d="M-560 -1340 Q0 -1620 560 -1340 Z" fill="#F15F75" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
    {[-1, 0, 1].map((i) => (
      <path key={i} d={`M${i * 190 - 60} ${-1340 - (i === 0 ? 140 : 100)} Q${i * 190} -1370 ${i * 190 + 60} ${-1340 - (i === 0 ? 140 : 100)} L${i * 190 + 90} -1340 L${i * 190 - 90} -1340 Z`} fill="#FFFFFF" />
    ))}
    <path d="M-560 -1340 Q0 -1620 560 -1340" fill="none" stroke={INK} strokeWidth={14} />
    {[-560, -280, 0, 280, 560].map((dx) => (
      <path key={dx} d={`M${dx - 140} -1340 Q${dx} -1290 ${dx + 140} -1340`} fill="#F15F75" stroke={INK} strokeWidth={10} />
    ))}
    {/* vendor */}
    <g transform="translate(120 -860)">
      <path d="M-150 260 Q-150 60 0 60 Q150 60 150 260 Z" fill="#7FD0F5" stroke={INK} strokeWidth={12} />
      <path d="M-80 70 L80 70 L60 260 L-60 260 Z" fill="#FFFFFF" stroke={INK} strokeWidth={10} />
      <circle cx={0} cy={-40} r={100} fill="#F2B48A" stroke={INK} strokeWidth={12} />
      <circle cx={-34} cy={-56} r={12} fill={INK} />
      <circle cx={34} cy={-56} r={12} fill={INK} />
      <path d="M-60 -6 Q0 30 60 -6 Q40 -20 0 -12 Q-40 -20 -60 -6 Z" fill="#6E4A2E" />
      <path d="M-30 20 Q0 44 30 20" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <g transform={`translate(${hatOff * 300} ${-hatOff * 420}) rotate(${hatOff * 120})`}>
        <path d="M-110 -100 Q-100 -190 0 -190 Q100 -190 110 -100 Z" fill="#5C7CF0" stroke={INK} strokeWidth={12} />
        <rect x={-130} y={-110} width={200} height={30} rx={14} fill="#3550B8" stroke={INK} strokeWidth={10} />
      </g>
      {/* arm toward the street (holding the cup), or waving after */}
      <g transform={`translate(-110 120) rotate(${holding ? 90 : 160 + Math.sin(f * 0.8) * 20 * wave})`}>
        <rect x={-34} y={-10} width={68} height={holding ? 420 : 300} rx={34} fill="#7FD0F5" stroke={INK} strokeWidth={12} />
        <circle cx={0} cy={holding ? 420 : 300} r={46} fill="#F2B48A" stroke={INK} strokeWidth={12} />
      </g>
    </g>
    {holding ? (
      <g transform={`translate(${CUP_DX * 700} ${-CUP_H * 700})`}>
        <Cup s={1.25} />
      </g>
    ) : null}
    {/* cart body */}
    <rect x={-480} y={-620} width={960} height={520} rx={30} fill="#45B87A" stroke={INK} strokeWidth={14} />
    <rect x={-520} y={-680} width={1040} height={80} rx={24} fill="#E9C994" stroke={INK} strokeWidth={14} />
    <rect x={-300} y={-560} width={600} height={160} rx={24} fill="#FFFFFF" stroke={INK} strokeWidth={12} />
    <text x={0} y={-474} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={110} fill="#2A7D52">COFFEE</text>
    {[-1, 1].map((sd) => (
      <g key={sd}>
        <circle cx={sd * 330} cy={-60} r={70} fill="#4F4A6A" stroke={INK} strokeWidth={14} />
        <circle cx={sd * 330} cy={-60} r={22} fill="#B9B4D0" />
      </g>
    ))}
    {/* cups on the counter */}
    {[300, 390].map((dx, i) => (
      <g key={dx} transform={`translate(${dx} ${-760 + i * 4})`}>
        <Cup s={0.8} />
      </g>
    ))}
    <Steam x={345} y={-860} f={f} h={200} o={0.6} w={14} seed={3} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const TOAST: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, shinL: 1, shinR: 1,
  uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, handL: 'fist', handR: 'grip',
  torso: 0, head: 0, torsoSy: 1, sy: 1, sx: 1, chestS: 1.08, flexL: 1.4, flexR: 1.4,
  mouthMode: 'grin', mouthOpen: 0.9, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'normal', sweat: 0.2, lookX: 0, lookY: 0, turn: 0,
};

/** where the right hand holds the cup (hero space) + cup tilt; null = vendor still has it */
const cupHand = (f: number, p: Pose): { at: Pt; tilt: number } | null => {
  if (f < GRAB - 4) return null;
  const r = rig(p);
  const mouth = r.mouth();
  const vend = (() => {
    const z = CART_S + RUN.distAt(f);
    const cp = P(CART_X + CUP_DX, z, CUP_H);
    return [(cp.x - GX) / 0.9, (cp.y - 1640) / 0.9] as Pt;
  })();
  if (f < GRAB) return { at: vend, tilt: 0 };
  if (f < SIP0) {
    const t = E.inOut(seg(f, GRAB, SIP0 - 1));
    return { at: [lerp(vend[0], 240, t), lerp(vend[1], -640, t)], tilt: 0 };
  }
  const sipAt: Pt = [mouth[0] + 92, mouth[1] + 10];
  if (f < ZING) {
    const t = E.inOut(seg(f, SIP0, SIP0 + 4)) * (1 - E.inOut(seg(f, ZING - 3, ZING)));
    return { at: [lerp(240, sipAt[0], t), lerp(-640, sipAt[1], t)], tilt: -38 * t };
  }
  if (f < SKID) return { at: [236, -650 + Math.sin(f * 0.9) * 10], tilt: 0 };
  // toast: raise it high
  const t = E.back(seg(f, POSE - 2, POSE + 3));
  return { at: [lerp(236, 300, t), lerp(-650, -1060, t)], tilt: 0 };
};

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = turboAt(f);
  const g = gait(ph, turbo);
  let p: Pose;
  if (f < SKID) {
    const zing = seg(f, ZING, ZING + 2) * (1 - seg(f, BOOST + 6, BOOST + 10));
    const sipping = f >= SIP0 + 2 && f < ZING;
    p = plant(
      {
        ...BASE,
        ...g,
        eyeMode: zing > 0.5 ? 'star' : 'normal',
        pupil: zing > 0.5 ? 0.5 : 1,
        lid: sipping ? 0.8 : zing > 0.5 ? 0 : g.lid ?? 0.1,
        mouthMode: sipping ? 'o' : zing > 0.5 ? 'grin' : 'grin',
        mouthOpen: sipping ? 0.3 : zing > 0.5 ? 1 : g.mouthOpen ?? 0.4,
        brow: zing > 0.5 ? 1 : 0.4,
        browTilt: zing > 0.5 ? 0.8 : f >= GRAB - 6 && f < GRAB + 4 ? 0.4 : 0,
        lookX: f >= ARRIVE && f < GRAB + 2 ? 0.9 : 0,
        turn: f >= ARRIVE && f < GRAB + 2 ? 0.35 : 0,
        smile: 1,
        x: zing > 0.5 && f < BOOST ? Math.sin(f * 3.1) * 8 : 0,
      },
      runLift(ph) * (f >= ARRIVE && f < BOOST ? 0.4 : 1),
    );
  } else {
    const keys: Key<Pose>[] = [
      { f: SKID, p: { ...BASE, ...g } },
      { f: SKID + 5, p: { ...STOP, handR: 'grip' }, e: E.out },
      { f: POSE - 2, p: { sy: 0.9, sx: 1.07 }, e: E.inOut },
      { f: POSE + 2, p: { ...TOAST, sy: 1.06, sx: 0.96 }, e: E.out },
      { f: POSE + 6, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
      { f: POSE + 10, p: { sy: 1, sx: 1 }, e: E.inOut },
      { f: 98, p: { wink: 1, mouthSkew: 0.5, turn: 0.2, lookX: 0.5 }, e: E.inOut },
      { f: 110, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
      { f: 150, p: {} },
    ];
    p = plant(poseAt(f, BASE, keys));
    // left fist on the hip during the toast
    p = { ...p, ...reach(p, 'L', [-138, -374], 1) };
  }
  const c = cupHand(f, p);
  if (c) p = { ...p, ...reach(p, 'R', c.at, 1), wrR: 0, handR: 'grip' };
  return p;
};

export const CoffeeRunScene: React.FC = () => {
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
  const c = cupHand(f, p);
  const fist = toStage(r.W(r.aR.wrist, 0, 40));
  const vendorHas = f < GRAB;
  const cart: CityObj = {
    X: CART_X, S: CART_S, key: 'cart',
    draw: (x, y, s) => <Cart key="cart" x={x} y={y} s={s} f={f} holding={vendorHas} wave={seg(f, GRAB + 2, GRAB + 6)} hatOff={seg(f, BOOST, BOOST + 14)} />,
  };
  const cam: Cam = {
    cx: kf(f, [[0, 600], [ARRIVE, 690, E.inOut], [BOOST - 4, 680], [BOOST + 6, 540, E.inOut]]),
    cy: kf(f, [[0, 1040], [ARRIVE, 1000, E.inOut], [SIP0, 940, E.inOut], [ZING, 920], [BOOST + 4, 1020, E.out], [SKID, 1000], [POSE + 6, 1000, E.inOut], [CARD + 6, 930, E.inOut]]),
    z: kf(f, [[0, 0.86], [ARRIVE, 0.92, E.inOut], [SIP0, 1.2, E.inOut], [ZING, 1.3], [BOOST + 6, 0.94, E.out], [SKID, 0.96], [POSE + 6, 1.02, E.out], [CARD + 6, 0.98, E.inOut]]),
    r: kf(f, [[BOOST, 0], [BOOST + 3, -2, E.out], [BOOST + 14, 0, E.inOut]]),
  };
  const s0 = shake(f, ZING, BOOST - ZING, 10, 3);
  const s1 = shake(f, BOOST, 12, 22, 1);
  const s2 = shake(f, SKID, 10, 12, 2);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r };
  const cupStage: Pt = c ? [fist[0] + 4, fist[1] - 34 * scale] : [0, 0];
  const steamO = f >= GRAB ? (turbo > 0.3 ? 0.9 : 0.6) : 0;

  return (
    <Stage impact={f === BOOST} overlay={<EndCard f={f} start={CARD} lines={['COFFEE RUN']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.morning} seed={23} extra={[cart]} crosswalks={[14, 33]} blur={turbo} />
      <g transform={camP(cam, 1, sh)}>
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1900} n={40} opacity={0.5 * turbo} width={7} /> : null}
        <Glow x={540} y={chest[1]} r={kf(f, [[ZING - 1, 0], [ZING + 3, 520, E.out], [BOOST + 12, 0]])} id="glowY" o={0.8} />
        <Burst x={head[0]} y={head[1] + 140} r={360} t={seg(f, ZING, ZING + 12)} seed={44} />
        <Burst x={540} y={chest[1]} r={420} t={seg(f, POSE, POSE + 17)} seed={45} />
        <Hero p={p} x={GX} y={GY} scale={scale} />
        {c ? (
          <g transform={`translate(${cupStage[0]} ${cupStage[1]})`}>
            <Cup s={scale * 0.95} rot={c.tilt} />
          </g>
        ) : null}
        {c && f >= GRAB ? <Steam x={cupStage[0] + (turbo > 0.3 ? -20 : 0)} y={cupStage[1] - 120 * scale} f={f} h={turbo > 0.3 ? 320 : 200} o={steamO} w={turbo > 0.3 ? 22 : 16} seed={7} /> : null}
        <WheelLegs knees={knees} f={f} o={turbo} />
        {Array.from({ length: 7 }).map((_, i) => {
          const start = BOOST + 2 + i * 5;
          return f < SKID + 2 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={48} seed={i + 70} rise={1.2} /> : null;
        })}
        <Dust f={f} start={SKID} x={540} y={GY} n={8} spread={380} size={60} seed={77} />
        <Sparks f={f} start={ZING} seed={78} n={16} x={head[0]} y={head[1] + 60} speed={[12, 28]} g={0.4} size={[12, 22]} colors={['#FFD064', '#FFFFFF']} />
        <Sparks f={f} start={POSE} seed={79} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 100, 114)} />
        <Sfx f={f} start={ARRIVE + 2} text="one espresso?" x={860} y={720} size={84} rot={6} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={GRAB} text="SNATCH!" x={760} y={head[1] - 60} size={120} rot={8} fill="#FFD064" dur={12} />
        <Sfx f={f} start={SIP0 + 2} text="sip..." x={300} y={head[1] + 40} size={90} rot={-8} fill="#FFFFFF" dur={8} />
        <Sfx f={f} start={ZING} text="ZING!!" x={540} y={head[1] - 120} size={170} rot={-6} fill="#FFD064" dur={14} />
        <Sfx f={f} start={BOOST + 2} text="ZOOOM!" x={300} y={1180} size={150} rot={-8} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={SKID} text="SKRRT!" x={820} y={GY - 160} size={120} rot={10} fill="#FFFFFF" dur={14} />
      </g>
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.morning} seed={23} layer="front" extra={[cart]} />
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={46} />
    </Stage>
  );
};
