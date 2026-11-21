// Celebration for MMA (+1.5): jab, cross, head kick. The heavy bag does not survive.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, wobble } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks, Burst, FocusLines, Ring } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { Glove } from './JokeMMA';
import { TITLE_FONT } from '../fonts';

export const MMA_CEL_FRAMES = 135;
const GX = 430;
const GY = 1760;
const SC = 0.86;
const toStage = stageOf(GX, GY, SC);
const JAB = 18;
const CROSS = 30;
const KICK = 46;
const WIN = 62;
const CARD = 84;
const BAG_X = 830;
const BAG_TOP = 520;

/* ------------------------------- props ------------------------------- */
const HeavyBag: React.FC<{ rot: number; fly: number; f: number }> = ({ rot, fly, f }) => {
  const t = Math.max(0, f - KICK);
  return (
    <g>
      {/* chain (stays) */}
      <line x1={BAG_X} y1={-200} x2={BAG_X} y2={BAG_TOP} stroke={INK} strokeWidth={12} />
      <line x1={BAG_X} y1={-200} x2={BAG_X} y2={BAG_TOP} stroke="#B9B3CC" strokeWidth={5} strokeDasharray="16 10" />
      <g transform={fly > 0 ? `translate(${t * 34} ${-t * 10 + t * t * 0.8}) rotate(${t * 14} ${BAG_X} ${BAG_TOP + 400})` : `rotate(${rot} ${BAG_X} ${BAG_TOP})`}>
        <path d={`M${BAG_X - 40} ${BAG_TOP} L${BAG_X - 110} ${BAG_TOP + 70} M${BAG_X + 40} ${BAG_TOP} L${BAG_X + 110} ${BAG_TOP + 70}`} stroke={INK} strokeWidth={8} />
        <rect x={BAG_X - 130} y={BAG_TOP + 60} width={260} height={720} rx={90} fill="#D9434A" stroke={INK} strokeWidth={11} />
        <rect x={BAG_X - 100} y={BAG_TOP + 90} width={40} height={640} rx={20} fill="#FF8C8C" opacity={0.6} />
        <rect x={BAG_X - 130} y={BAG_TOP + 300} width={260} height={90} fill="#2B2340" stroke={INK} strokeWidth={9} />
        <text x={BAG_X} y={BAG_TOP + 350} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={60} fill="#FFFFFF">MMA</text>
      </g>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const GUARD: Partial<Pose> = {
  shL: 50, elL: 130, shR: 46, elR: 126, handL: 'fist', handR: 'fist', hipL: 20, knL: -20, hipR: 14, knR: -14,
  lookX: 0.8, turn: 0.3, lid: 0.35, brow: 0.2, browTilt: -0.8, mouthMode: 'grit', mouthOpen: 0.2, smile: 0.3, torso: 4,
};
const PUNCH = (k: number): Partial<Pose> => ({ shR: 92, elR: 4, uaR: 1.05, faR: 1.08, torso: 10 + k * 4, rot: 4, mouthOpen: 0.6, lid: 0.25 });
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...GUARD } },
  { f: JAB - 4, p: { shR: 40, elR: 130 } },
  { f: JAB, p: { ...PUNCH(0) }, e: E.snap },
  { f: JAB + 6, p: { ...GUARD } },
  { f: CROSS - 3, p: { shR: 36, elR: 134, torso: -4 } },
  { f: CROSS, p: { ...PUNCH(1), chestS: 1.05 }, e: E.snap },
  { f: CROSS + 7, p: { ...GUARD } },
  { f: KICK - 6, p: { hipR: 40, knR: -90, rot: -6 } },
  { f: KICK, p: { hipR: 100, knR: 4, ftR: 20, hipL: 12, knL: -10, rot: -16, shL: 120, elL: 30, shR: 20, elR: 90, mouthMode: 'grit', mouthOpen: 0.9, lid: 0.4 }, e: E.snap },
  { f: KICK + 8, p: { hipR: 76, rot: -10 } },
  { f: WIN, p: { hipR: 12, knR: -6, hipL: 12, knL: -6, ftR: 0, rot: 0, shL: 152, elL: -14, shR: 152, elR: -14, torso: 0, chestS: 1.05, lookX: 0, turn: 0, lid: 0, eyes: 1, mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 0.8, browTilt: 0 }, e: E.back },
  { f: MMA_CEL_FRAMES, p: {} },
];

export const MMAScene: React.FC = () => {
  const f = useCurrentFrame();
  const bob = f < JAB - 4 ? Math.abs(Math.sin(f * 0.5)) * 24 : 0;
  const p = plant(poseAt(f, BASE, KEYS), bob);
  const r = rig(p);
  const glove = toStage(r.handR());
  const rot = wobble(f, JAB + 1, 0.4, 0.1, 9) + wobble(f, CROSS + 1, 0.4, 0.1, 14);
  const fly = f >= KICK ? 1 : 0;
  const cam: Cam = {
    cx: kf(f, [[0, 560], [KICK - 2, 600], [KICK + 4, 640, E.out], [WIN, 540, E.inOut], [CARD + 12, 540]]),
    cy: kf(f, [[0, 1100], [KICK - 2, 1100], [KICK + 4, 1060, E.out], [WIN, 1080, E.inOut], [CARD, 1080], [CARD + 12, 1000, E.inOut]]),
    z: kf(f, [[0, 1.08], [KICK - 2, 1.1], [KICK + 4, 1.25, E.out], [WIN, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.96, E.inOut]]),
    r: kf(f, [[0, 0], [KICK, 0], [KICK + 2, 2, E.out], [KICK + 10, 0]]),
  };
  const s1 = shake(f, JAB, 8, 8, 1);
  const s2 = shake(f, CROSS, 8, 12, 2);
  const s3 = shake(f, KICK, 18, 30, 3);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s3.r };
  const impact = f === KICK || f === KICK + 1;
  const hitPt: [number, number] = [BAG_X - 120, 1000];

  return (
    <Stage impact={impact} bg="#20243B" overlay={<EndCard f={f} start={CARD} lines={['KNOCKOUT']} pts="+1.5" color="#D9434A" dark="#962830" y={96} />}>
      <GlowDefs />
      <g transform={camP(cam, 0.6, { x: sh.x * 0.4, y: sh.y * 0.4, r: 0 })}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#262B47" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <Glow x={-100 + i * 320} y={140} r={260} id="glowY" o={0.5} />
            <circle cx={-100 + i * 320} cy={140} r={34} fill="#FFF0B7" stroke={INK} strokeWidth={6} />
          </g>
        ))}
        <g opacity={0.5}>
          {Array.from({ length: 40 }).map((_, i) => (
            <g key={i}>
              <line x1={-600 + i * 60} y1={560} x2={-600 + i * 60 + 900} y2={1640} stroke="#8A93B8" strokeWidth={4} />
              <line x1={-600 + i * 60} y1={1640} x2={-600 + i * 60 + 900} y2={560} stroke="#8A93B8" strokeWidth={4} />
            </g>
          ))}
        </g>
        <rect x={-600} y={1640} width={2280} height={1200} fill="#3E7BFA" />
        <rect x={-600} y={1640} width={2280} height={20} fill="#2D5FC4" />
        <text x={540} y={1860} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={150} fill="#5E9BFF">WINTER ARC</text>
      </g>
      <g transform={camP(cam, 1, sh)}>
        <HeavyBag rot={rot} fly={fly} f={f} />
        {f >= KICK && f < KICK + 14 ? <FocusLines f={f} cx={hitPt[0]} cy={hitPt[1]} r0={360} opacity={0.7 * (1 - seg(f, KICK + 6, KICK + 14))} /> : null}
        <Burst x={glove[0] + 40} y={glove[1]} r={120} t={seg(f, JAB, JAB + 12)} fill="#FFD064" seed={2} />
        <Burst x={glove[0] + 40} y={glove[1]} r={150} t={seg(f, CROSS, CROSS + 12)} fill="#FF8C8C" seed={4} />
        <Burst x={hitPt[0]} y={hitPt[1]} r={300} t={seg(f, KICK, KICK + 16)} fill="#FFD064" seed={7} />
        <Ring x={hitPt[0]} y={hitPt[1]} t={seg(f, KICK, KICK + 14)} r={320} />
        <ellipse cx={GX} cy={GY + 6} rx={240} ry={26} fill="#000" opacity={0.25} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemL={<Glove />} itemR={<Glove />} />
        <Sparks f={f} start={KICK} seed={6} n={24} x={hitPt[0]} y={hitPt[1]} speed={[16, 38]} g={0.9} size={[14, 26]} colors={['#FFFFFF', '#FFD064', '#FF8C8C']} shape="star" />
      </g>
      <Sfx f={f} start={JAB} text="POW!" x={820} y={720} size={150} rot={8} fill="#FFD064" dur={14} />
      <Sfx f={f} start={CROSS} text="BAM!" x={300} y={640} size={160} rot={-8} fill="#FF8C8C" dur={14} />
      <Sfx f={f} start={KICK} text="K.O.!" x={720} y={520} size={220} rot={-6} fill="#FFD064" dur={26} />
      <ConfettiRain f={f} start={CARD + 4} n={60} seed={5} colors={['#D9434A', '#FFD064', '#FFFFFF', '#3E7BFA', '#FF8C8C']} />
    </Stage>
  );
};
