// Inside joke: "THE COIN" - Dean and Jake are tied, Flexander flips a $1 coin to settle it... it lands on its edge.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, springAt, clamp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, Glint, ConfettiRain, Sparks, Ring, FocusLines } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { TITLE_FONT } from '../fonts';
import { softStar } from '../lib/shape';

export const COIN_FRAMES = 165;
const GX = 540;
const GY = 1730;
const SC = 0.78;
const toStage = stageOf(GX, GY, SC);
const FLICK = 26;
const HIT = 70;
const EDGE = 80;
const STAMP = 98;
const CARD = 118;
const CR = 92; // coin radius (px)
const FLOOR = 1850;

/* ------------------------------- $1 coin ------------------------------- */
const rimText = 'IN GAINS WE TRUST • WINTER ARC • ';
export const DollarCoin: React.FC<{ r: number; flip?: number; back?: boolean; id: string }> = ({ r, flip = 1, back = false, id }) => {
  const sy = Math.max(0.06, Math.abs(flip));
  return (
    <g>
      {/* coin thickness */}
      <g transform={`translate(0 ${Math.min(14, 14 * sy)}) scale(1 ${sy})`}>
        <circle r={r} fill={C.goldSh} stroke={INK} strokeWidth={8} />
      </g>
      <g transform={`scale(1 ${sy})`}>
        <defs>
          <path id={id} d={`M ${-r * 0.74} 0 A ${r * 0.74} ${r * 0.74} 0 1 1 ${r * 0.74} 0 A ${r * 0.74} ${r * 0.74} 0 1 1 ${-r * 0.74} 0`} />
        </defs>
        <circle r={r} fill={C.gold} stroke={INK} strokeWidth={8} />
        <circle r={r * 0.9} fill="none" stroke={C.goldSh} strokeWidth={r * 0.05} strokeDasharray={`${r * 0.03} ${r * 0.07}`} />
        <circle r={r * 0.6} fill="#FFDA7E" stroke={C.goldSh} strokeWidth={r * 0.04} />
        <ellipse cx={-r * 0.35} cy={-r * 0.42} rx={r * 0.32} ry={r * 0.16} fill="#FFFFFF" opacity={0.55} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.42})`} />
        {back ? (
          <g>
            <path d={softStar(0, 0, r * 0.42, r * 0.18, 5)} fill={C.goldHi} stroke={C.goldSh} strokeWidth={r * 0.04} />
            <text y={r * 0.5} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={r * 0.17} fill={C.goldKey}>ONE DOLLAR</text>
          </g>
        ) : (
          <g>
            <text x={0} y={r * 0.08} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={r * 0.66} fill={C.goldKey} stroke={INK} strokeWidth={r * 0.02}>
              $1
            </text>
            <text fontFamily={TITLE_FONT} fontSize={r * 0.15} fill={C.goldKey} letterSpacing={r * 0.01}>
              <textPath href={`#${id}`} startOffset="0">{rimText}</textPath>
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

/* ------------------------------- name plates ------------------------------- */
const Plate: React.FC<{ x: number; y: number; name: string; color: string; dark: string; t: number; stamp: number; side: -1 | 1 }> = ({ x, y, name, color, dark, t, stamp, side }) => {
  const k = Math.max(0, springAt(t, 0, 14, 1.4, 5));
  const sk = stamp > 0 ? Math.min(1, springAt(stamp, 0, 8, 1.5, 6)) : 0;
  return (
    <g transform={`translate(${x + side * (1 - Math.min(1, k)) * 500} ${y}) rotate(${side * -4})`}>
      <rect x={-210} y={-92} width={420} height={184} rx={36} fill={INK} transform="translate(0 14)" />
      <rect x={-210} y={-92} width={420} height={184} rx={36} fill={color} stroke={INK} strokeWidth={10} />
      <rect x={-188} y={-74} width={376} height={22} rx={11} fill="#FFFFFF" opacity={0.3} />
      <text x={0} y={10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={110} fill="#FFFFFF" stroke={INK} strokeWidth={16} paintOrder="stroke" strokeLinejoin="round">
        {name}
      </text>
      <g transform="translate(0 130)">
        <rect x={-120} y={-34} width={240} height={68} rx={34} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
        <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={46} fill={dark}>
          SAME PTS
        </text>
      </g>
      {stamp > 0 ? (
        <g transform={`translate(0 6) rotate(${side * 10}) scale(${lerp(2.2, 1, sk)})`} opacity={Math.min(1, stamp / 2)}>
          <rect x={-200} y={-58} width={400} height={116} rx={18} fill="#FFFFFF" opacity={0.85} />
          <rect x={-200} y={-58} width={400} height={116} rx={18} fill="none" stroke="#E2384D" strokeWidth={12} />
          <text x={0} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={74} fill="#E2384D">
            STILL TIED
          </text>
        </g>
      ) : null}
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const HOLD: Partial<Pose> = { shR: 26, elR: 142, wrR: -64, handR: 'thumb', shL: 30, elL: -96, wrL: 0, handL: 'fist', hipL: 10, hipR: 10, knL: -5, knR: -5 };
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...HOLD, lookX: 0.4, lookY: -0.2, smile: 1, mouthOpen: 0.2, brow: 0.4 } },
  { f: 14, p: { lookX: 0.6, lookY: -0.3, turn: 0.2, mouthSkew: 0.5, browTilt: 0.8, brow: 0.9, lid: 0.2 } },
  { f: FLICK - 3, p: { sy: 0.97, sx: 1.02, wrR: -50 } },
  { f: FLICK, p: { sy: 1.02, sx: 0.99, wrR: -90, elR: 150, mouthSkew: 0, lid: 0, lookX: 0, lookY: -1, turn: 0, mouthMode: 'o', mouthOpen: 0.4, brow: 1 }, e: E.out },
  { f: 46, p: { lookY: -1, head: -6, mouthOpen: 0.5, sy: 1, sx: 1 } },
  { f: 62, p: { lookY: 0.6, head: 4, mouthOpen: 0.3, shR: 30, elR: 70, wrR: 0, handR: 'open' }, e: E.inOut },
  { f: EDGE + 2, p: { lookY: 0.9, eyeMode: 'normal', pupil: 0.35, mouthMode: 'o', mouthOpen: 1, brow: 1.5, browTilt: 1, sweat: 1, shR: 50, elR: 40, shL: 50, elL: 40, handL: 'open', handR: 'open', sy: 1.05, sx: 0.97 }, e: E.back },
  { f: 96, p: { sy: 1, sx: 1, pupil: 0.4 } },
  { f: STAMP + 6, p: { lookY: 0, lookX: 0, pupil: 1, mouthMode: 'grin', mouthOpen: 0.9, smile: 1, brow: 1, browTilt: 0.4, shL: 28, elL: 150, wrL: -64, handL: 'thumb', shR: 28, elR: 150, wrR: -64, handR: 'thumb', sweat: 0.5 }, e: E.back },
  { f: COIN_FRAMES, p: {} },
];
const poseF = (f: number): Pose => plant(poseAt(f, BASE, KEYS));

/* coin flight (stage space) */
const thumbAt = (f: number): [number, number] => {
  const p = poseF(f);
  const r = rig(p);
  return toStage(r.W(r.aR.wrist, -84, 6));
};
const T0 = thumbAt(FLICK);
const G = 3.1;
const coinAt = (f: number) => {
  if (f < FLICK) {
    const t = thumbAt(f);
    return { x: t[0] - 6, y: t[1] - CR * 0.42, flip: 0.42, back: false, rot: -16, landed: false };
  }
  if (f < HIT) {
    const t = (f - FLICK) / (HIT - FLICK);
    const T = f - FLICK;
    const tl = HIT - FLICK;
    // solve so the coin reaches the floor exactly at HIT
    const y0 = T0[1];
    const yEnd = FLOOR - CR;
    const vy = (yEnd - y0 - 0.5 * G * tl * tl) / tl;
    const y = y0 + vy * T + 0.5 * G * T * T;
    const x = lerp(T0[0], 540, E.inOut(t));
    const ang = T * 0.85;
    return { x, y, flip: Math.cos(ang), back: Math.cos(ang) < 0, rot: Math.sin(T / 5) * 20, landed: false };
  }
  // small bounce, then it pops up onto its edge and wobbles
  const tb = f - HIT;
  const bounce = Math.max(0, 15 * tb - 1.9 * tb * tb);
  const flip = f < EDGE ? Math.cos(tb * 0.55 + 0.4) : 1;
  const wob = f >= EDGE ? Math.sin((f - EDGE) * 0.9) * 16 * Math.exp(-(f - EDGE) * 0.12) : (1 - tb / (EDGE - HIT)) * 30;
  return { x: 540, y: FLOOR - CR - bounce, flip, back: flip < 0, rot: wob, landed: true };
};

export const JokeCoinScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const coin = coinAt(f);
  const r = rig(p);
  const plateFade = 1 - seg(f, CARD - 4, CARD + 2);

  const cam: Cam = {
    cx: kf(f, [[0, 540], [HIT, 540], [EDGE + 4, 540], [EDGE + 8, 540]]),
    cy: kf(f, [[0, 960], [FLICK, 1010, E.inOut], [44, 760, E.out], [HIT - 4, 1120, E.in], [HIT, 1160, E.out], [EDGE + 4, 1160], [EDGE + 10, 1640, E.inOut], [STAMP - 6, 1660], [STAMP, 1060, E.inOut], [CARD, 1060], [CARD + 10, 1180, E.inOut]]),
    z: kf(f, [[0, 1.0], [FLICK, 1.06, E.inOut], [44, 0.92, E.out], [HIT, 1.0, E.inOut], [EDGE + 4, 1.0], [EDGE + 10, 2.1, E.inOut], [STAMP - 6, 2.2], [STAMP, 1.0, E.inOut], [CARD, 1.0], [CARD + 10, 0.96, E.inOut]]),
    r: kf(f, [[0, 0], [EDGE + 10, -2], [STAMP - 6, -3], [STAMP, 0]]),
  };
  const s1 = shake(f, HIT, 10, 12, 3);
  const s2 = shake(f, EDGE, 8, 6, 5);
  const s3 = shake(f, STAMP, 12, 16, 2);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s1.r };
  const zoomed = seg(f, EDGE + 6, EDGE + 10) * (1 - seg(f, STAMP - 4, STAMP));
  const head = toStage(r.headTop());

  return (
    <Stage
      bg="#1E1846"
      overlay={<EndCard f={f} start={CARD} lines={['THE COIN']} pts="$1" unit="" sub="DEAN = JAKE" color="#FFD064" dark="#C77928" light="#FFF0B7" y={90} />}
    >
      <GlowDefs />
      <defs>
        <linearGradient id="vsL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B44C9" />
          <stop offset="1" stopColor="#8E78EC" />
        </linearGradient>
        <linearGradient id="vsR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E26A25" />
          <stop offset="1" stopColor="#FFB067" />
        </linearGradient>
      </defs>
      {/* split versus background */}
      <g transform={camP(cam, 0.25, sh)}>
        <rect x={-800} y={-800} width={1500} height={3600} fill="url(#vsL)" transform="rotate(12 540 960)" />
        <rect x={540} y={-800} width={1500} height={3600} fill="url(#vsR)" transform="rotate(12 540 960)" />
        <g transform={`translate(540 960) rotate(${f * 0.3})`} opacity={0.14}>
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d="M0 0 L1800 -140 L1800 140 Z" fill="#FFFFFF" transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
        {/* lightning seam */}
        <path d="M640 -400 L520 500 L610 520 L470 1300 L560 1320 L420 2400" fill="none" stroke="#FFFFFF" strokeWidth={26} strokeLinejoin="round" transform="rotate(0)" />
        <path d="M640 -400 L520 500 L610 520 L470 1300 L560 1320 L420 2400" fill="none" stroke="#FFF0B7" strokeWidth={10} strokeLinejoin="round" />
      </g>
      <g transform={camP(cam, 1, sh)}>
        {/* stage floor */}
        <ellipse cx={540} cy={1930} rx={760} ry={190} fill="#3A2F6E" />
        <ellipse cx={540} cy={1880} rx={760} ry={170} fill="#E9E3F7" stroke={INK} strokeWidth={10} />
        <ellipse cx={540} cy={1880} rx={600} ry={120} fill="none" stroke="#CFC6DE" strokeWidth={8} />
        {/* spotlight once it stands */}
        <g opacity={seg(f, EDGE, EDGE + 6)}>
          <path d={`M440 -200 L640 -200 L${540 + 260} ${FLOOR} L${540 - 260} ${FLOOR} Z`} fill="#FFF6C9" opacity={0.18} />
          <ellipse cx={540} cy={FLOOR - 4} rx={240} ry={40} fill="#FFF6C9" opacity={0.45} />
        </g>
        <Hero p={p} x={GX} y={GY} scale={SC} />
        {/* coin shadow */}
        <ellipse cx={coin.x} cy={FLOOR + 4} rx={CR * (coin.landed ? 1 : clamp(1 - (FLOOR - coin.y) / 1400, 0.2, 1))} ry={16} fill="#000" opacity={0.2} />
        <Ring x={540} y={FLOOR} t={seg(f, HIT, HIT + 14)} r={260} sy={0.25} w={18} />
        <Ring x={540} y={FLOOR} t={seg(f, EDGE, EDGE + 14)} r={200} sy={0.25} w={14} color="#FFF0B7" />
        {zoomed > 0.5 ? <FocusLines f={f} cx={540} cy={FLOOR - CR} r0={180} r1={900} n={36} opacity={0.6} width={10} /> : null}
        <Glow x={coin.x} y={coin.y} r={170} id="glowY" o={f < FLICK ? 0.5 : seg(f, EDGE, EDGE + 4) * 0.9} />
        <g transform={`translate(${coin.x} ${coin.y + (coin.landed ? CR : 0)}) rotate(${coin.rot}) translate(0 ${coin.landed ? -CR : 0})`}>
          <DollarCoin r={CR} flip={coin.flip} back={coin.back} id="coinRim" />
        </g>
        <Glint x={coin.x + 40} y={coin.y - 50} s={0.9} t={seg(f, 8, 22)} />
        <Glint x={540 + 60} y={FLOOR - CR * 1.6} s={1.1} t={seg(f, EDGE + 12, EDGE + 26)} />
        <Sparks f={f} start={HIT} seed={5} n={12} x={540} y={FLOOR} speed={[8, 20]} g={1} size={[10, 18]} colors={['#FFF0B7', '#FFD064']} />
        <Sfx f={f} start={6} text="TIED." x={540} y={760} size={130} rot={-4} fill="#FFF0B7" dur={18} />
        <Sfx f={f} start={FLICK} text="FLICK!" x={790} y={1130} size={110} rot={10} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={HIT} text="TING!" x={300} y={1700} size={110} rot={-8} fill="#FFF0B7" dur={12} />
        <Sfx f={f} start={EDGE + 10} text="...ON ITS EDGE?!" x={540} y={1450} size={70} rot={-3} fill="#FFFFFF" dur={STAMP - EDGE - 12} shake={false} />
        <Sfx f={f} start={STAMP + 6} text="DEAD EVEN!" x={540} y={head[1] - 90} size={120} rot={-5} fill="#FFD064" dur={18} />
      </g>
      {/* name plates */}
      <g transform={camP(cam, 0.35, sh)} opacity={plateFade}>
        <Plate x={250} y={330} name="DEAN" color="#7254DC" dark="#4F35B0" t={f - 2} stamp={f - STAMP} side={-1} />
        <Plate x={830} y={330} name="JAKE" color="#F2853A" dark="#B4521C" t={f - 5} stamp={f - STAMP - 4} side={1} />
        <g transform={`translate(540 340) scale(${Math.max(0, springAt(f, 8, 12, 1.5, 5))}) rotate(-8)`}>
          <path d={softStar(0, 0, 108, 70, 12, 0)} fill="#FFD064" stroke={INK} strokeWidth={9} />
          <text x={0} y={8} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={84} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke">
            VS
          </text>
        </g>
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={50} seed={31} colors={['#FFD064', '#FFF0B7', '#7254DC', '#F2853A', '#FFFFFF']} />
    </Stage>
  );
};
