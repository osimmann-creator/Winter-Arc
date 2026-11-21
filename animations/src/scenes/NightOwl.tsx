// Run #4: "NIGHT OWL" - moonlit run with a headlamp, an owl races alongside, he smirks and leaves it in the dust.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, poseAt, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Dust, FocusLines, Stars, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, VICTORY, TrackWorld, THEMES, WheelLegs, HY } from './RunKit';
import { INK } from './kit';
import { rng, softStar } from '../lib/shape';

const TURBO = 44;
const RUN = makeRun(
  [[0, 0.08], [TURBO - 4, 0.085], [TURBO + 2, 0.31, E.in], [76, 0.32], [86, 0.1, E.out], [98, 0, E.out]],
  [[0, 16], [TURBO - 4, 15], [TURBO + 2, 6, E.in], [76, 6], [88, 14, E.out]],
  [86, 94],
);
const turboAt = (f: number) => seg(f, TURBO, TURBO + 5) * (1 - seg(f, 80, 86));

/* ------------------------------- owl ------------------------------- */
export const Owl: React.FC<{ x: number; y: number; s: number; f: number; shock?: number; rot?: number }> = ({ x, y, s, f, shock = 0, rot = 0 }) => {
  const flap = Math.sin(f * 0.9);
  const wing = (side: -1 | 1) => (
    <g transform={`translate(${side * 70} -40) rotate(${side * (20 + flap * 38)}) scale(${side} 1)`}>
      <path d="M0 0 C40 -60 150 -70 190 -20 C160 -10 150 20 120 16 C110 40 80 50 60 40 C40 60 10 50 0 30 Z" fill="#7E6597" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d="M40 -10 C80 -40 140 -44 170 -18" fill="none" stroke="#B49CCB" strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  const eye = (side: -1 | 1) => (
    <g transform={`translate(${side * 40} -66)`}>
      <circle r={36} fill="#FFFFFF" stroke={INK} strokeWidth={6} />
      <circle r={26} fill="#FFC94A" />
      <circle r={lerp(15, 7, shock)} fill={INK} />
      <circle cx={-6} cy={-8} r={5} fill="#FFFFFF" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {wing(-1)}
      {wing(1)}
      <ellipse cx={0} cy={0} rx={92} ry={112} fill="#8E73A8" stroke={INK} strokeWidth={8} />
      <ellipse cx={0} cy={30} rx={58} ry={66} fill="#E9D9C9" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${-30 + i * 30} ${20 + (i % 2) * 18} q8 10 16 0`} fill="none" stroke="#B89C86" strokeWidth={5} strokeLinecap="round" />
      ))}
      <path d="M-86 -110 L-60 -150 L-40 -104 Z M86 -110 L60 -150 L40 -104 Z" fill="#8E73A8" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <ellipse cx={0} cy={-70} rx={84} ry={52} fill="#F4E6D6" stroke={INK} strokeWidth={6} />
      {eye(-1)}
      {eye(1)}
      <path d={`M-12 -40 L12 -40 L0 ${-14 + shock * 6} Z`} fill="#F7A23A" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      {shock > 0.5 ? <ellipse cx={0} cy={-8} rx={10} ry={8} fill={INK} /> : null}
      <path d="M-30 108 l-8 20 M-20 110 l0 22 M20 110 l0 22 M30 108 l8 20" stroke="#F7A23A" strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

/* headlamp (head-local) */
const Headlamp: React.FC = () => (
  <g>
    <path d="M-128 -214 Q-70 -262 0 -266 Q70 -262 128 -214" fill="none" stroke="#2B2340" strokeWidth={22} strokeLinecap="round" />
    <path d="M-128 -214 Q-70 -262 0 -266 Q70 -262 128 -214" fill="none" stroke="#4E4670" strokeWidth={8} strokeLinecap="round" />
    <rect x={-40} y={-300} width={80} height={58} rx={16} fill="#3B3456" stroke={INK} strokeWidth={6} />
    <circle cx={0} cy={-271} r={20} fill="#FFF6C9" stroke={INK} strokeWidth={5} />
    <circle cx={-6} cy={-277} r={6} fill="#FFFFFF" />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = turboAt(f);
  const g = gait(ph, turbo);
  // side-eye at the owl, then a smirk
  const look = seg(f, 26, 30) * (1 - seg(f, TURBO - 2, TURBO + 1));
  const run: Pose = {
    ...BASE,
    ...g,
    turn: -0.35 * look,
    lookX: -1 * look,
    mouthSkew: 0.6 * seg(f, 32, 36) * look,
    brow: lerp(g.brow ?? 0, 1, look),
    browTilt: lerp(g.browTilt ?? 0, 0.6, look),
    lid: lerp(g.lid ?? 0, 0.3, look),
    smile: lerp(g.smile ?? 1, 1, look),
    mouthOpen: lerp(g.mouthOpen ?? 0.4, 0.1, look),
  };
  if (f < 82) return plant(run, runLift(ph));
  const keys: Key<Pose>[] = [
    { f: 82, p: run },
    { f: 86, p: STOP, e: E.out },
    { f: 93, p: { sy: 0.88, sx: 1.08 }, e: E.inOut },
    { f: 97, p: { ...VICTORY, sy: 1.08, sx: 0.95 }, e: E.out },
    { f: 101, p: { sy: 0.97, sx: 1.02 }, e: E.inOut },
    { f: 105, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 150, p: {} },
  ];
  const p = poseAt(f, BASE, keys);
  return plant({ ...p, chestS: p.chestS + (f > 105 ? Math.sin((f - 105) / 4) * 0.02 : 0) });
};

export const NightOwlScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const turbo = turboAt(f);
  const D = RUN.distAt(f);
  const scale = kf(f, [[0, 0.92], [82, 0.92], [96, 1.0, E.out]]);
  const GX = 540;
  const GY = kf(f, [[0, 1640], [82, 1640], [96, 1720, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const cam: Cam = {
    cx: 540 + Math.sin(f / 9) * 6 * (1 - seg(f, 82, 90)),
    cy: kf(f, [[0, 1100], [14, 960, E.out], [TURBO - 2, 960], [TURBO + 4, 990], [80, 990], [96, 960, E.out]]),
    z: kf(f, [[0, 1.45], [14, 1, E.out], [26, 1.0], [32, 1.12, E.inOut], [TURBO - 2, 1.12], [TURBO + 4, 1.04, E.out], [80, 1.06], [90, 1.0, E.out], [135, 1.03]]),
    r: Math.sin(f / 7) * 0.6 * (1 - seg(f, 82, 90)),
  };
  const s1 = shake(f, TURBO, 40, 7, 2);
  const s2 = shake(f, 82, 14, 18, 5);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const knees: [number, number][] = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];
  const lamp = toStage(r.W(r.head, 0, -271));

  // owl: alongside, then left behind toward the horizon
  const back = E.in(seg(f, TURBO + 2, 66));
  const owlX = lerp(250 + Math.sin(f / 7) * 14, 470, back);
  const owlY = lerp(980 + Math.sin(f * 0.9) * 18, HY - 40, back);
  const owlS = lerp(1.15, 0.08, back);
  const shock = seg(f, TURBO + 4, TURBO + 8);
  const fr = rng(6);
  const fireflies = Array.from({ length: 12 }).map((_, i) => {
    const x = fr() < 0.5 ? fr() * 260 : 820 + fr() * 260;
    const y = 900 + fr() * 700;
    const tw = 0.5 + 0.5 * Math.sin(f / (4 + fr() * 4) + i);
    return <circle key={i} cx={x + Math.sin(f / 10 + i) * 18} cy={y + Math.cos(f / 12 + i) * 14} r={6 + tw * 4} fill="#FFE98A" opacity={0.35 + tw * 0.6} />;
  });
  const shoot = seg(f, 96, 108);

  return (
    <Stage bg="#1A1D4C" overlay={<EndCard f={f} start={102} lines={['NIGHT OWL']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <defs>
        <filter id="nightF">
          <feColorMatrix type="matrix" values="0.8 0 0.04 0 0.02  0 0.8 0.06 0 0.03  0.02 0.03 0.95 0 0.08  0 0 0 1 0" />
        </filter>
      </defs>
      <TrackWorld
        f={f}
        D={D}
        cam={cam}
        sh={sh}
        theme={THEMES.night}
        blur={turbo}
        seed={5}
        signs={[['1 MI', RUN.distAt(24) + 0.6], ['2 MI', RUN.distAt(62) + 0.6]]}
        skyExtra={
          <g>
            <Stars f={f} n={60} seed={9} area={[-200, -200, 1500, 900]} />
            {shoot > 0 && shoot < 1 ? (
              <g opacity={1 - seg(shoot, 0.7, 1)}>
                <line x1={lerp(-100, 600, shoot)} y1={lerp(120, 420, shoot)} x2={lerp(-100, 600, shoot) - 220} y2={lerp(120, 420, shoot) - 95} stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.7} />
                <path d={softStar(lerp(-100, 600, shoot), lerp(120, 420, shoot), 26, 8, 4)} fill="#FFFFFF" />
              </g>
            ) : null}
          </g>
        }
      />
      <g transform={camP(cam, 1, sh)}>
        {fireflies}
        {/* soft pool of headlamp light on the track */}
        <ellipse cx={540} cy={GY - 10} rx={330} ry={70} fill="#FFF3C4" opacity={0.18} />
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1800} n={40} opacity={0.35 * turbo} width={7} color="#D9D4FF" /> : null}
        {Array.from({ length: 6 }).map((_, i) => {
          const start = TURBO + 2 + i * 6;
          return f < 82 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={50} seed={i + 30} rise={1.2} color="#CFC8F2" line="#7E77B8" /> : null;
        })}
        {owlS > 0.1 ? <Owl x={owlX} y={owlY} s={owlS} f={f} shock={shock} rot={lerp(-6, 20, back)} /> : null}
        <g filter="url(#nightF)">
          <Hero p={p} x={GX} y={GY} scale={scale} headExtra={<Headlamp />} />
        </g>
        <WheelLegs knees={knees} f={f} o={turbo} />
        {/* lens flare from the headlamp */}
        <Glow x={lamp[0]} y={lamp[1]} r={kf(f, [[0, 150], [TURBO, 150], [TURBO + 4, 240, E.out], [80, 210]])} id="glowY" o={0.9} />
        <g transform={`translate(${lamp[0]} ${lamp[1]}) rotate(${f * 0.6})`} opacity={0.75}>
          <path d={softStar(0, 0, 150, 10, 4, 0)} fill="#FFF6C9" />
          <path d={softStar(0, 0, 80, 8, 4, 45)} fill="#FFFFFF" opacity={0.8} />
        </g>
        <circle cx={lamp[0]} cy={lamp[1]} r={16} fill="#FFFFFF" />
        <Twinkle x={540} y={420} s={1.4} t={seg(f, 100, 118)} color="#FFF6C9" />
        <Sfx f={f} start={10} text="HOO HOO!" x={290} y={740} size={110} rot={-10} fill="#E9D9C9" dur={20} />
        <Sfx f={f} start={33} text="oh, it's ON." x={770} y={760} size={96} rot={6} fill="#FFFFFF" dur={18} />
        <Sfx f={f} start={TURBO + 6} text="HOO?!" x={430} y={760} size={110} rot={-6} fill="#E9D9C9" dur={18} />
        <Sfx f={f} start={TURBO} text="ZOOOM!" x={760} y={1040} size={150} rot={10} fill="#FFD064" dur={26} />
      </g>
      <ConfettiRain f={f} start={100} n={50} seed={5} colors={['#FFF6C9', '#BCABFF', '#5C7CF0', '#FFD064', '#FFFFFF']} />
    </Stage>
  );
};

