import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Cloud, Sfx, Sun, GlowDefs, Glow, Burst, Sparks, Dust, ConfettiRain, Ring, Streaks } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1560;
const SC = 0.8;
const IMPACT: [number, number] = [650, 1835];

/* ------------------------------- ball ------------------------------- */
const VBall: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const id = `vb${Math.round(r)}`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <defs>
        <clipPath id={id}>
          <circle r={r} />
        </clipPath>
      </defs>
      <circle r={r} fill="#FFFFFF" />
      <g clipPath={`url(#${id})`}>
        <path d={`M${-r} ${-r * 0.2} Q0 ${-r * 0.75} ${r} ${-r * 0.2} L${r} ${-r * 0.55} Q0 ${-r * 1.15} ${-r} ${-r * 0.55} Z`} fill="#6A5BE0" />
        <path d={`M${-r * 0.3} ${r} Q${-r * 0.55} 0 ${-r} ${-r * 0.1} L${-r} ${r * 0.4} Q${-r * 0.8} ${r * 0.6} ${-r * 0.65} ${r} Z`} fill="#FFD064" />
        <path d={`M${r * 0.25} ${r} Q${r * 0.45} ${r * 0.1} ${r} ${0}`} fill="none" stroke={INK} strokeWidth={r * 0.06} />
        <path d={`M${-r} ${-r * 0.2} Q0 ${-r * 0.75} ${r} ${-r * 0.2}`} fill="none" stroke={INK} strokeWidth={r * 0.06} />
        <path d={`M${-r * 0.3} ${r} Q${-r * 0.55} 0 ${-r} ${-r * 0.1}`} fill="none" stroke={INK} strokeWidth={r * 0.06} />
        <circle cx={r * 0.25} cy={r * 0.3} r={r} fill="#000" opacity={0.08} />
      </g>
      <circle r={r} fill="none" stroke={INK} strokeWidth={r * 0.12} />
      <ellipse cx={-r * 0.38} cy={-r * 0.42} rx={r * 0.24} ry={r * 0.14} fill="#FFFFFF" opacity={0.9} transform={`rotate(-35 ${-r * 0.38} ${-r * 0.42})`} />
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const CROUCH: Partial<Pose> = {
  hipL: 22, hipR: 22, knL: -42, knR: -42, thL: 0.74, thR: 0.74, ftL: 6, ftR: 6, torsoSy: 0.9, sy: 0.92, sx: 1.04,
  shL: 18, shR: 18, elL: -20, elR: -20, handL: 'fist', handR: 'fist',
  lookY: -0.8, lid: 0.3, brow: 0.2, browTilt: -0.6, smile: 0.9, mouthOpen: 0,
};
const LAUNCH: Partial<Pose> = {
  hipL: 6, hipR: 6, knL: -2, knR: -2, thL: 1, thR: 1, ftL: 26, ftR: 26, torsoSy: 1.04, sy: 1.16, sx: 0.92,
  shL: 165, shR: 165, elL: -6, elR: -6, handL: 'open', handR: 'open', lookY: -0.9, mouthOpen: 0.6, lid: 0,
};
const AIR: Partial<Pose> = {
  hipL: 14, hipR: 14, knL: -22, knR: -22, thL: 0.84, thR: 0.84, shinL: 0.82, shinR: 0.82, ftL: 26, ftR: 26, torsoSy: 1.02, sy: 1, sx: 1, torso: -4,
  shR: 152, elR: 118, wrR: 20, handR: 'open', uaR: 1.05,
  shL: 158, elL: -10, handL: 'point', uaL: 1.05,
  lookY: -0.9, lookX: 0.35, turn: 0.15, head: -4, lid: 0.4, browTilt: -1, mouthMode: 'grit', mouthOpen: 0,
  armZR: 'back',
};
const SPIKE: Partial<Pose> = {
  hipL: 10, hipR: 10, knL: 10, knR: 10, thL: 0.92, thR: 0.92, ftL: 14, ftR: 14, torso: 9, torsoSy: 0.93,
  shR: 36, elR: -24, wrR: -10, handR: 'open', uaR: 1,
  shL: 44, elL: -100, handL: 'fist',
  lookY: 0.6, lookX: -0.1, turn: -0.1, head: 8, lid: 0.1, browTilt: -0.4, brow: 0.6, mouthMode: 'grin', mouthOpen: 1, smile: 0.8,
  armZR: 'top',
};
const FALL: Partial<Pose> = {
  hipL: 16, hipR: 16, knL: -18, knR: -18, thL: 0.95, thR: 0.95, shinL: 1, shinR: 1, ftL: 10, ftR: 10, torso: 0, torsoSy: 1,
  shL: 150, shR: 150, elL: -24, elR: -24, handL: 'open', handR: 'open',
  lookY: -0.2, lookX: 0, turn: 0, head: 0, lid: 0, eyes: 1, browTilt: 0, brow: 1, mouthMode: 'grin', mouthOpen: 1, smile: 1,
  armZR: 'mid',
};
const LAND: Partial<Pose> = {
  hipL: 30, hipR: 30, knL: -46, knR: -46, thL: 0.72, thR: 0.72, ftL: 8, ftR: 8, torsoSy: 0.88, sy: 0.84, sx: 1.12,
  shL: 76, shR: 76, elL: 30, elR: 30, eyes: 0, lid: 0.5, mouthOpen: 0.5, mouthMode: 'grin',
};
const WIN: Partial<Pose> = {
  hipL: 10, hipR: 10, knL: -4, knR: -4, thL: 1, thR: 1, ftL: 2, ftR: 2, torsoSy: 1, sy: 1, sx: 1, chestS: 1.04,
  shR: 168, elR: -4, wrR: 0, handR: 'point', shL: 42, elL: -104, wrL: 30, handL: 'fist',
  lid: 0, eyes: 0, turn: 0.18, lookX: 0.25, lookY: -0.2, mouthMode: 'grin', mouthOpen: 0.55, smile: 1, brow: 0.6,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...CROUCH, sy: 0.97, knL: -30, knR: -30, thL: 0.85, thR: 0.85 } },
  { f: 12, p: CROUCH, e: E.inOut },
  { f: 16, p: LAUNCH, e: E.out },
  { f: 26, p: AIR, e: E.inOut },
  { f: 34, p: { shR: 160, elR: 130, torso: -7 }, e: E.inOut },
  { f: 37, p: SPIKE, e: E.in },
  { f: 42, p: { shR: 26, torso: 11 }, e: E.out },
  { f: 52, p: FALL, e: E.inOut },
  { f: 64, p: FALL },
  { f: 67, p: LAND, e: E.out },
  { f: 73, p: { ...WIN, sy: 1.06, sx: 0.96 }, e: E.out },
  { f: 77, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
  { f: 81, p: { sy: 1, sx: 1 }, e: E.inOut },
  { f: 92, p: { wink: 1, mouthSkew: 0.5 }, e: E.out },
  { f: 104, p: { wink: 1 } },
  { f: 108, p: { wink: 0, mouthSkew: 0 }, e: E.out },
  { f: 150, p: {} },
];

/** jump lift in hero units */
const liftAt = (f: number) => kf(f, [[0, 0], [14, 0], [34, 1900, E.out], [38, 1930, E.out], [64, 0, E.in], [150, 0]]);

const poseF = (f: number): Pose => plant(poseAt(f, BASE, KEYS), liftAt(f));

/* ------------------------------- background ------------------------------- */
const Palm: React.FC<{ x: number; y: number; s: number; flip?: boolean; f: number }> = ({ x, y, s, flip, f }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <path d="M0 0 Q30 -260 -10 -560" fill="none" stroke={INK} strokeWidth={60} strokeLinecap="round" />
    <path d="M0 0 Q30 -260 -10 -560" fill="none" stroke="#C58C55" strokeWidth={44} strokeLinecap="round" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path key={i} d={`M-12 ${-60 - i * 70} q20 10 40 0`} fill="none" stroke="#96673A" strokeWidth={6} />
    ))}
    {[-160, -110, -60, -10, 40, 100].map((a, i) => (
      <g key={i} transform={`translate(-10 -560) rotate(${a + Math.sin(f / 12 + i) * 3})`}>
        <path d="M0 0 Q120 -60 250 30 Q120 -10 0 0 Z" fill="#64B66A" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <path d="M10 -4 Q120 -40 230 26" fill="none" stroke="#4C9050" strokeWidth={5} />
      </g>
    ))}
    <circle cx={-26} cy={-540} r={22} fill="#774C2C" stroke={INK} strokeWidth={6} />
    <circle cx={6} cy={-534} r={22} fill="#774C2C" stroke={INK} strokeWidth={6} />
  </g>
);

const Beach: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number } }> = ({ f, cam, sh }) => {
  const r = rng(17);
  const clouds = Array.from({ length: 16 }).map((_, i) => ({
    x: r() * 1300 - 110,
    y: 500 - i * 190 - r() * 60,
    w: 240 + r() * 260,
    s: i + 2,
  }));
  return (
    <>
      <defs>
        <linearGradient id="vSky" x1="0" y1="-2800" x2="0" y2="1100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5543BB" />
          <stop offset="0.55" stopColor="#7EA4FD" />
          <stop offset="1" stopColor="#C7E9FB" />
        </linearGradient>
        <linearGradient id="vSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6997E9" />
          <stop offset="1" stopColor="#7ACFEF" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 1, sh)}>
        <rect x={-800} y={-3200} width={2680} height={4400} fill="url(#vSky)" />
        <Sun x={830} y={520} r={80} f={f} />
        {clouds.map((c, i) => (
          <Cloud key={i} x={c.x + Math.sin(f / 30 + i) * 10} y={c.y} w={c.w} h={c.w * 0.42} seed={c.s} />
        ))}
        {/* seagulls */}
        {[[-260, 220], [-310, 660], [-1240, 380]].map(([yy, xx], i) => (
          <path key={i} d={`M${xx - 40} ${yy} q20 -24 40 0 q20 -24 40 0`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" transform={`translate(0 ${Math.sin(f / 5 + i) * 6})`} />
        ))}
        {/* sea */}
        <rect x={-800} y={1010} width={2680} height={190} fill="url(#vSea)" />
        {[1050, 1100, 1150].map((y, i) => (
          <path key={y} d={Array.from({ length: 14 }).map((_, k) => `M${-200 + k * 120 + ((f * (1 + i * 0.3)) % 120)} ${y} q30 -12 60 0`).join(' ')} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.75} />
        ))}
        <line x1={-800} y1={1010} x2={1880} y2={1010} stroke={INK} strokeWidth={6} opacity={0.5} />
        {/* sand */}
        <path d="M-800 1200 Q540 1150 1880 1200 L1880 2600 L-800 2600 Z" fill="#FED8A1" />
        <path d="M-800 1200 Q540 1150 1880 1200" fill="none" stroke="#FFFFFF" strokeWidth={22} opacity={0.7} />
        {Array.from({ length: 70 }).map((_, i) => (
          <circle key={i} cx={r() * 1300 - 110} cy={1230 + r() * 1300} r={3 + r() * 4} fill="#EBB674" />
        ))}
        <Palm x={40} y={1500} s={0.95} f={f} />
        <Palm x={1060} y={1480} s={0.85} flip f={f} />
      </g>
    </>
  );
};

const VNet: React.FC = () => (
  <g>
    <rect x={18} y={1300} width={26} height={460} rx={8} fill="#F0EBFB" stroke={INK} strokeWidth={7} />
    <rect x={1036} y={1300} width={26} height={460} rx={8} fill="#F0EBFB" stroke={INK} strokeWidth={7} />
    <g opacity={0.6}>
      {Array.from({ length: 50 }).map((_, i) => (
        <line key={'v' + i} x1={40 + i * 20} y1={1440} x2={40 + i * 20} y2={1620} stroke={INK} strokeWidth={3} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={'h' + i} x1={40} y1={1440 + i * 20} x2={1040} y2={1440 + i * 20} stroke={INK} strokeWidth={3} />
      ))}
    </g>
    <rect x={36} y={1418} width={1008} height={30} rx={6} fill="#6A5BE0" stroke={INK} strokeWidth={7} />
    <rect x={36} y={1618} width={1008} height={16} rx={6} fill="#FFFFFF" stroke={INK} strokeWidth={5} />
  </g>
);

/* ------------------------------- scene ------------------------------- */
export const VoloScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const handAt = (ff: number) => {
    const rr = rig(poseF(ff));
    return toStage(rr.W(rr.aR.wrist, 0, 70));
  };
  const hit = handAt(37);
  const chestY = toStage(r.chest())[1];

  // ball
  let bx = 0;
  let by = 0;
  let br = 36;
  if (f < 37) {
    const t = clamp((f - 2) / 35);
    const tt = 1 - Math.pow(1 - t, 1.8);
    bx = lerp(260, hit[0] + 30, tt);
    by = lerp(1900, hit[1] - 50, tt);
  } else if (f < 46) {
    const t = (f - 37) / 9;
    bx = lerp(hit[0] + 30, IMPACT[0], E.in(t));
    by = lerp(hit[1] - 50, IMPACT[1], E.in(t));
    br = lerp(36, 54, t);
  } else {
    const t = f - 46;
    bx = IMPACT[0] + Math.min(t, 20) * 3;
    by = IMPACT[1] - 10 - Math.max(0, Math.sin(Math.min(1, t / 22) * Math.PI)) * 160;
    br = 54;
  }

  // camera follows hero up, whips down after spike
  const follow = Math.min(1080, chestY + 160);
  const cy =
    f < 14
      ? 1080
      : f < 37
        ? lerp(1080, follow, seg(f, 14, 20))
        : f < 46
          ? lerp(handAt(37)[1] + 160, 1200, E.in(seg(f, 37, 45)))
          : kf(f, [[46, 1200], [56, 1080, E.out]]);
  const cam: Cam = {
    cx: 540,
    cy,
    z: kf(f, [[0, 1], [14, 1], [24, 0.94], [34, 1.08, E.inOut], [37, 1.12], [44, 0.96, E.out], [56, 1, E.out], [135, 1.03]]),
    r: kf(f, [[30, 0], [36, -3], [40, 3, E.out], [46, 0]]),
  };
  const s1 = shake(f, 37, 10, 16, 2);
  const s2 = shake(f, 46, 26, 46, 7);
  const s3 = shake(f, 67, 10, 12, 4);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s1.r + s2.r + s3.r };
  const impact = f === 37 || f === 38;
  const whip = seg(f, 38, 40) * (1 - seg(f, 44, 46));
  const rising = seg(f, 16, 20) * (1 - seg(f, 30, 34));
  const handTrail = trail(handAt, f, 6);

  return (
    <Stage impact={impact} overlay={<EndCard f={f} start={84} lines={['SKY SPIKE']} pts="+0.5" color="#F5B23E" dark="#B87A1A" y={96} />}>
      <GlowDefs />
      <Beach f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        {/* crater */}
        {f >= 46 ? (
          <g>
            <ellipse cx={IMPACT[0]} cy={IMPACT[1] + 20} rx={kf(f, [[46, 40], [52, 230, E.out]])} ry={kf(f, [[46, 12], [52, 60, E.out]])} fill="#D5A665" stroke={INK} strokeWidth={7} />
            <ellipse cx={IMPACT[0]} cy={IMPACT[1] + 26} rx={kf(f, [[46, 20], [52, 160, E.out]])} ry={kf(f, [[46, 6], [52, 36, E.out]])} fill="#B5874A" />
          </g>
        ) : null}
        <Hero p={p} x={GX} y={GY} scale={SC} />
        {f >= 35 && f <= 40 ? <Swoosh pts={handTrail} width={150} /> : null}
        <Burst x={hit[0] + 30} y={hit[1] - 50} r={240} t={seg(f, 37, 50)} seed={2} fill="#FFD064" />
        <Ring x={hit[0] + 30} y={hit[1] - 50} t={seg(f, 37, 48)} r={280} />
        {f < 64 || f > 46 ? <VBall x={bx} y={by} r={br} rot={f * (f < 37 ? 8 : 30)} /> : null}
        {/* fire trail on the spiked ball */}
        {f >= 37 && f < 46
          ? [1, 2, 3, 4].map((k) => {
              const t = Math.max(0, (f - k * 0.9 - 37) / 9);
              const x = lerp(hit[0] + 30, IMPACT[0], E.in(t));
              const y = lerp(hit[1] - 50, IMPACT[1], E.in(t));
              return <circle key={k} cx={x} cy={y} r={br * (1.1 - k * 0.15)} fill={['#FFD064', '#F9B248', '#F2853A', '#F25E5B'][k - 1]} opacity={0.75 - k * 0.12} />;
            })
          : null}
      </g>
      <g transform={camP(cam, 1, sh)}>
        <VNet />
        {f >= 46 && f < 64 ? <Glow x={IMPACT[0]} y={IMPACT[1]} r={kf(f, [[46, 100], [50, 500]])} id="glowY" o={1 - seg(f, 50, 64)} /> : null}
        <Burst x={IMPACT[0]} y={IMPACT[1] - 40} r={300} t={seg(f, 46, 60)} seed={12} fill="#FFD064" />
        <Sparks f={f} start={46} seed={41} n={60} x={IMPACT[0]} y={IMPACT[1]} speed={[16, 48]} g={1.6} size={[10, 22]} shape="sand" colors={['#FED8A1', '#EBB674', '#F8C585']} angle={-90} spread={150} />
        <Dust f={f} start={46} x={IMPACT[0]} y={IMPACT[1]} n={10} spread={520} size={80} seed={6} color="#FFE6BE" line="#D5A665" rise={1} />
        <Dust f={f} start={66} x={GX} y={GY} n={6} spread={300} size={50} seed={9} color="#FFE6BE" line="#D5A665" />
        {/* ball smoke */}
        {f > 52
          ? [0, 1, 2].map((i) => {
              const t = ((f - 52 + i * 10) % 30) / 30;
              return <circle key={i} cx={bx + Math.sin(t * 5 + i) * 14} cy={by - br - t * 120} r={14 + t * 26} fill="#FFFFFF" stroke="#D2CDDE" strokeWidth={4} opacity={(1 - t) * 0.8 * (1 - seg(f, 100, 120))} />;
            })
          : null}
        <Sfx f={f} start={37} text="SPIKE!" x={hit[0] - 260} y={hit[1] + 40} size={160} rot={-12} fill="#FFD064" dur={20} />
        <Sfx f={f} start={46} text="BOOM!" x={420} y={IMPACT[1] - 330} size={210} rot={6} fill="#F88F4D" dur={30} />
      </g>
      {/* speed streaks while flying up / whipping down */}
      {rising > 0 ? <Streaks f={f} x0={0} y0={0} w={1080} h={1920} angle={90} n={22} speed={-90} len={340} opacity={0.6 * rising} thick={9} /> : null}
      {whip > 0 ? <Streaks f={f} x0={0} y0={0} w={1080} h={1920} angle={90} n={26} speed={120} len={420} opacity={0.75 * whip} thick={12} /> : null}
      <ConfettiRain f={f} start={86} n={55} seed={14} />
    </Stage>
  );
};
