// Gym #5: "MIRROR CHECK" - hair fix, three mirror-selfie poses with flashes, then the proof photo gets stamped.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, seg, Key, springAt, lerp } from '../lib/anim';
import { Stage, camP, Cam, TOP, BOT, FULL_H } from '../fx/Stage';
import { Sparks, Sfx, GlowDefs, Glint, ConfettiRain, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { GymBG, Platform } from './Gym';
import { stageOf, INK } from './kit';
import { reach } from './ik';
import { TITLE_FONT } from '../fonts';
import { heartPath, softStar } from '../lib/shape';

const GX = 520;
const GY = 1720;
const SC = 0.9;
const toStage = stageOf(GX, GY, SC);
const SNAPS = [24, 44, 64];
const STAMP = 84;

/* ------------------------------- props ------------------------------- */
const Phone: React.FC = () => (
  <g transform="translate(0 64)">
    <rect x={-52} y={-30} width={104} height={196} rx={22} fill={INK} transform="translate(5 7)" opacity={0.35} />
    <rect x={-52} y={-30} width={104} height={196} rx={22} fill={C.violet} stroke={INK} strokeWidth={7} />
    <rect x={-40} y={-18} width={30} height={172} rx={12} fill={C.violetHi} opacity={0.45} />
    {/* camera bump at the far end */}
    <rect x={-34} y={100} width={58} height={56} rx={16} fill={C.violetSh} stroke={INK} strokeWidth={5} />
    <circle cx={-16} cy={116} r={11} fill="#2B2340" stroke={INK} strokeWidth={4} />
    <circle cx={-16} cy={141} r={11} fill="#2B2340" stroke={INK} strokeWidth={4} />
    <circle cx={8} cy={128} r={6} fill="#FFF0B7" stroke={INK} strokeWidth={3} />
    <circle cx={-19} cy={112} r={3.5} fill="#FFFFFF" />
    <circle cx={-19} cy={137} r={3.5} fill="#FFFFFF" />
    <path d={softStar(0, 30, 16, 6, 4, 0)} fill={C.gold} stroke={INK} strokeWidth={3} />
  </g>
);

const MirrorFrame: React.FC<{ f: number }> = ({ f }) => {
  const sweep = ((f * 9) % 2600) - 800;
  // The mirror fills the whole phone: its frame runs along the full-height edges.
  const t = TOP;
  const b = BOT;
  const h = b - t;
  return (
    <g>
      {/* glass streaks */}
      <g opacity={0.22}>
        <path d={`M${sweep} ${t - 100} L${sweep + 140} ${t - 100} L${sweep - 1080} ${b + 100} L${sweep - 1220} ${b + 100} Z`} fill="#FFFFFF" />
        <path d={`M${sweep + 220} ${t - 100} L${sweep + 270} ${t - 100} L${sweep - 950} ${b + 100} L${sweep - 1000} ${b + 100} Z`} fill="#FFFFFF" />
      </g>
      {/* gold frame */}
      <path d={`M0 ${t} H1080 V${b} H0 Z M58 ${t + 58} V${b - 58} H1022 V${t + 58} Z`} fill={C.gold} fillRule="evenodd" />
      <path d={`M0 ${t} H1080 V${b} H0 Z M58 ${t + 58} V${b - 58} H1022 V${t + 58} Z`} fill="none" stroke={INK} strokeWidth={8} fillRule="evenodd" />
      <rect x={58} y={t + 58} width={964} height={h - 116} rx={6} fill="none" stroke={INK} strokeWidth={10} />
      <rect x={20} y={t + 20} width={1040} height={h - 40} rx={10} fill="none" stroke={C.goldSh} strokeWidth={8} />
      <rect x={38} y={t + 38} width={1004} height={h - 76} rx={8} fill="none" stroke={C.goldHi} strokeWidth={5} opacity={0.9} />
      {[
        [58, t + 58],
        [1022, t + 58],
        [58, b - 58],
        [1022, b - 58],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={46} fill={C.gold} stroke={INK} strokeWidth={7} />
          <path d={softStar(0, 0, 32, 12, 4, 45)} fill={C.goldHi} stroke={C.goldSh} strokeWidth={4} />
        </g>
      ))}
      <g transform={`translate(540 ${t + 30})`}>
        <path d="M-150 -30 Q-75 -48 0 -30 Q75 -48 150 -30 L130 40 Q65 22 0 40 Q-65 22 -130 40 Z" fill={C.gold} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <path d={softStar(0, 4, 24, 9, 5)} fill={C.goldHi} stroke={C.goldSh} strokeWidth={4} />
      </g>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const LEGS: Partial<Pose> = { hipL: 8, hipR: 12, knL: -4, knR: -8, ftL: 0, ftR: 4 };
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...LEGS, lookX: 0.2, lookY: -0.3, smile: 1, mouthOpen: 0.2, brow: 0.5, handR: 'open', flexR: 0.4 } },
  { f: 14, p: { lookY: -0.2, mouthOpen: 0.1, brow: 0.8 } },
  { f: 18, p: { handR: 'fist' } },
  // pose 1: single bicep
  { f: 22, p: { shR: 96, elR: 112, wrR: 10, flexR: 1.9, chestS: 1.08, mouthMode: 'grin', mouthOpen: 0.9, eyeMode: 'star', brow: 1, lookX: 0, lookY: 0, turn: -0.05 }, e: E.back },
  { f: 34, p: { eyeMode: 'normal', chestS: 1.04 } },
  // pose 2: hand on hip, smoulder
  { f: 41, p: { turn: 0.32, torso: 4, head: 4, lid: 0.45, smile: 0.6, mouthOpen: 0, mouthSkew: 0.5, browTilt: 0.6, brow: 0.3, chestS: 1.1, hipR: 18, knR: -14, flexR: 0.9 }, e: E.inOut },
  { f: 52, p: { lid: 0.4 } },
  // pose 3: kissy face + finger up
  { f: 61, p: { turn: -0.2, torso: -3, head: -8, lid: 0, eyes: 1, mouthMode: 'o', mouthOpen: 0.22, mouthSkew: 0, smile: 0.4, blush: 1, handR: 'point', shR: 166, elR: 6, wrR: 0, flexR: 0.5, chestS: 1.05, hipR: 12, knR: -8 }, e: E.inOut },
  { f: 72, p: { blush: 0.6 } },
  // after: thumbs up + wink at the viewer
  { f: 80, p: { turn: 0.1, torso: 0, head: 2, eyes: 0, wink: 1, mouthMode: 'grin', mouthOpen: 0.7, smile: 1, mouthSkew: 0.4, blush: 0.2, handR: 'thumb', shR: 28, elR: 142, wrR: -64, flexR: 0.7 }, e: E.back },
  { f: 150, p: {} },
];

const solve = (f: number): Pose => {
  const p0 = plant(poseAt(f, BASE, KEYS));
  const r = rig(p0);
  // phone hand beside the face, phone held upright
  const head = r.W(r.head, 0, -150);
  const tgt: [number, number] = [head[0] - 250, head[1] + 70 + Math.sin(f / 9) * 4];
  let q: Pose = { ...p0, ...reach(p0, 'L', tgt, 1, 34), handL: 'fist', flexL: 0.6 };
  const tot = q.shL + q.elL + q.torso + q.rot;
  q = { ...q, wrL: 180 - tot };
  // right hand fixes the hair at the start
  const hair = seg(f, 0, 3) * (1 - seg(f, 14, 20));
  if (hair > 0) {
    const top = r.W(r.head, 60 + Math.sin(f / 1.6) * 30, -300);
    const h = reach(q, 'R', top, -1, 70);
    q = { ...q, shR: lerp(q.shR, h.shR ?? q.shR, hair), elR: lerp(q.elR, h.elR ?? q.elR, hair), wrR: lerp(q.wrR, -10, hair) };
  }
  // hand on hip for pose 2
  const hip = seg(f, 36, 41) * (1 - seg(f, 54, 59));
  if (hip > 0) {
    const pt = r.W(r.torso, 120, -30);
    const h = reach(q, 'R', pt, 1, 34);
    q = { ...q, shR: lerp(q.shR, h.shR ?? q.shR, hip), elR: lerp(q.elR, h.elR ?? q.elR, hip) };
  }
  return q;
};

/* polaroid with a mini Flexander inside */
const SNAP_POSE = solve(30);
const Polaroid: React.FC<{ f: number; x: number; y: number; rot: number; s: number }> = ({ f, x, y, rot, s }) => {
  const st = f - STAMP;
  const k = st < 0 ? 0 : springAt(st, 0, 10, 1.4, 5);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <defs>
        <clipPath id="photoWin">
          <rect x={-190} y={-250} width={380} height={380} />
        </clipPath>
        <linearGradient id="photoSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8BBAFE" />
          <stop offset="1" stopColor="#F7F3FF" />
        </linearGradient>
      </defs>
      <rect x={-224} y={-284} width={448} height={560} rx={10} fill={INK} transform="translate(10 16)" opacity={0.3} />
      <rect x={-224} y={-284} width={448} height={560} rx={10} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
      <g clipPath="url(#photoWin)">
        <rect x={-190} y={-250} width={380} height={380} fill="url(#photoSky)" />
        <rect x={-190} y={60} width={380} height={80} fill="#EDE7F8" />
        <Hero p={SNAP_POSE} x={0} y={150} scale={0.4} />
      </g>
      <rect x={-190} y={-250} width={380} height={380} fill="none" stroke={INK} strokeWidth={6} />
      <text x={0} y={202} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill={C.violet}>
        GYM • 47 MIN
      </text>
      {/* stamp */}
      {st >= 0 ? (
        <g transform={`translate(96 64) rotate(-14) scale(${lerp(2.4, 1, Math.min(1, k)) * Math.max(0, k > 1.15 ? 1 : k)})`} opacity={Math.min(1, st / 2)}>
          <circle r={104} fill="#E6F7EC" opacity={0.9} />
          <circle r={104} fill="none" stroke="#2E9E5B" strokeWidth={12} />
          <circle r={86} fill="none" stroke="#2E9E5B" strokeWidth={5} />
          <text x={0} y={-22} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={56} fill="#2E9E5B">
            PROOF
          </text>
          <path d="M-36 24 L-10 50 L42 -6" fill="none" stroke="#2E9E5B" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};

export const MirrorScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const cam: Cam = {
    cx: kf(f, [[0, 560], [12, 540, E.out]]),
    cy: kf(f, [[0, 900], [12, 1040, E.out], [74, 1040], [86, 1080, E.inOut]]),
    z: kf(f, [[0, 1.5], [12, 1.0, E.out], [SNAPS[0], 1.0], [SNAPS[0] + 2, 1.05, E.out], [SNAPS[1], 1.03], [SNAPS[1] + 2, 1.08, E.out], [SNAPS[2], 1.06], [SNAPS[2] + 2, 1.11, E.out], [74, 1.1], [86, 1.0, E.inOut]]),
    r: 0,
  };
  const sh = { x: 0, y: 0, r: 0 };
  const flash = Math.max(0, ...SNAPS.map((s) => (f >= s && f < s + 8 ? 1 - (f - s) / 8 : 0)));
  const phone = toStage(r.W(r.aL.wrist, 0, 150));
  const head = toStage(r.headTop());
  // polaroid flight
  const pt = seg(f, 70, 82);
  const polX = lerp(1250, 790, E.out(pt));
  const polY = lerp(2200, 1430, E.out(pt));
  const polR = lerp(-30, 8, E.back(pt));

  return (
    <Stage overlay={<EndCard f={f} start={96} lines={['MIRROR CHECK']} pts="+1.5" color="#F2853A" dark="#B4521C" y={110} />}>
      <GlowDefs />
      <GymBG f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Platform />
        <Hero p={p} x={GX} y={GY} scale={SC} itemL={<Phone />} itemBehindL />
        {SNAPS.map((s, i) => (
          <g key={i}>
            <Sparks f={f} start={s} seed={30 + i} n={12} x={phone[0]} y={phone[1]} speed={[10, 24]} g={0.2} size={[10, 18]} colors={['#FFFFFF', '#FFF0B7']} />
            <Sfx f={f} start={s} text={['SNAP!', 'CLICK!', 'FLASH!'][i]} x={[820, 250, 820][i]} y={[720, 760, 720][i]} size={120} rot={i % 2 ? -10 : 9} fill="#FFFFFF" dur={16} />
          </g>
        ))}
        <Glint x={head[0] + 140} y={head[1] + 60} s={1.1} t={seg(f, 80, 94)} />
      </g>
      {/* flash glow from the phone */}
      {flash > 0 ? (
        <g>
          <circle cx={phone[0]} cy={phone[1]} r={260 + 500 * flash} fill="#FFFFFF" opacity={0.65 * flash} />
          <rect x={0} y={TOP} width={1080} height={FULL_H} fill="#FFFFFF" opacity={0.55 * flash} />
          <Twinkle x={phone[0]} y={phone[1]} s={2.6} t={0.5 - flash * 0.4} />
        </g>
      ) : null}
      <MirrorFrame f={f} />
      {pt > 0 ? <Polaroid f={f} x={polX} y={polY} rot={polR} s={0.95} /> : null}
      {/* likes floating off the photo */}
      {[0, 1, 2, 3].map((i) => {
        const t = f - (STAMP + 6 + i * 6);
        if (t < 0 || t > 30) return null;
        return (
          <g key={i} transform={`translate(${720 + i * 40 + Math.sin(t / 4 + i) * 20} ${1180 - t * 9}) scale(${Math.min(1, t / 5) * 0.9})`} opacity={1 - seg(t, 20, 30)}>
            <path d={heartPath(0, 0, 34)} fill={C.heart} stroke={INK} strokeWidth={6} />
          </g>
        );
      })}
      <Sfx f={f} start={STAMP} text="VERIFIED!" x={300} y={1500} size={120} rot={-8} fill="#9BE7B4" dur={24} />
      <ConfettiRain f={f} start={98} n={44} seed={17} />
    </Stage>
  );
};
