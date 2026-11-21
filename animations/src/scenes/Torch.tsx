// Run #3: "TORCH BEARER" - golden-hour run with a flaming torch; at the end the flame leaps to a giant cauldron. FWOOSH.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, poseAt, Key, springAt } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks, Dust, FocusLines, Burst } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, TrackWorld, THEMES, WheelLegs, HY, proj, WorldObj } from './RunKit';
import { INK } from './kit';
import { rng } from '../lib/shape';

const RUN = makeRun(
  [[0, 0.08], [36, 0.085], [42, 0.3, E.in], [70, 0.32], [80, 0.1, E.out], [90, 0, E.out]],
  [[0, 16], [36, 15], [42, 6, E.in], [70, 6], [82, 14, E.out]],
  [80, 88],
);
const IGNITE = 98;
const D_END = RUN.distAt(200);
const CZ = D_END + 2.1; // cauldron depth (world)
const CX = 1.6;

/* ------------------------------- props ------------------------------- */
const flameD = (h: number, w: number, lean: number) =>
  `M0 0 C${-w} ${-h * 0.18} ${-w * 0.9} ${-h * 0.62} ${lean * 0.6} ${-h} C${w * 0.15 + lean * 0.2} ${-h * 0.72} ${w * 1.05} ${-h * 0.5} ${w} ${-h * 0.2} C${w * 0.9} ${-h * 0.05} ${w * 0.4} 0 0 0 Z`;

export const Flame: React.FC<{ f: number; s?: number; seed?: number }> = ({ f, s = 1, seed = 0 }) => {
  const a = Math.sin(f * 0.9 + seed) * 0.5 + Math.sin(f * 1.7 + seed * 2) * 0.5;
  const h = 210 + a * 26;
  const lean = Math.sin(f * 0.6 + seed) * 30;
  return (
    <g transform={`scale(${s})`}>
      <path d={flameD(h, 92, lean)} fill="#FF7A3D" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={flameD(h * 0.74, 64, lean * 0.8)} fill="#FFB347" />
      <path d={flameD(h * 0.46, 38, lean * 0.6)} fill="#FFF0B7" />
      <circle cx={lean * 0.3} cy={-h * 0.16} r={16} fill="#FFFFFF" opacity={0.75} />
    </g>
  );
};

/** Torch in wrist space: handle runs along +y (up when the arm is raised). */
const TorchItem: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <path d="M-16 -20 L16 -20 L22 200 L-22 200 Z" fill="#A06343" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-8 -14 L2 -14 L4 190 L-8 190 Z" fill="#C98758" />
    <rect x={-26} y={100} width={52} height={22} rx={8} fill={C.gold} stroke={INK} strokeWidth={6} />
    <path d="M-64 200 L64 200 L40 260 L-40 260 Z" fill={C.gold} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-50 206 L-6 206 L-14 254 L-34 254 Z" fill={C.goldHi} opacity={0.8} />
    <g transform="translate(0 214) scale(1 -1)">
      <Flame f={f} s={0.9} />
    </g>
  </g>
);

const Cauldron: React.FC<{ x: number; y: number; s: number; f: number; lit: number }> = ({ x, y, s, f, lit }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {/* pedestal */}
    <path d="M-150 0 L150 0 L118 -60 L-118 -60 Z" fill="#FFFDF8" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
    <rect x={-70} y={-900} width={140} height={850} fill="#FFFDF8" stroke={INK} strokeWidth={10} />
    <rect x={10} y={-900} width={44} height={850} fill="#E7E1F3" />
    {[-36, 0, 36].map((k) => (
      <line key={k} x1={k} y1={-870} x2={k} y2={-90} stroke="#CFC6DE" strokeWidth={8} strokeLinecap="round" />
    ))}
    <rect x={-120} y={-960} width={240} height={70} rx={14} fill="#FFFDF8" stroke={INK} strokeWidth={10} />
    {/* bowl */}
    <path d="M-330 -1010 L330 -1010 Q300 -880 140 -870 L-140 -870 Q-300 -880 -330 -1010 Z" fill={C.gold} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    <path d="M-290 -990 Q-250 -910 -150 -896 L-100 -896 Q-210 -920 -240 -990 Z" fill={C.goldHi} opacity={0.85} />
    <path d="M-300 -970 H300" stroke={C.goldSh} strokeWidth={10} strokeDasharray="34 18" />
    <rect x={-350} y={-1040} width={700} height={44} rx={18} fill={C.gold} stroke={INK} strokeWidth={12} />
    {/* fire */}
    {lit > 0 ? (
      <g transform={`translate(0 -1030) scale(${lit})`}>
        <Glow x={0} y={-260} r={700} id="glowY" o={0.9} />
        <g transform="translate(-170 0) scale(1.2)">
          <Flame f={f} seed={1} />
        </g>
        <g transform="translate(170 0) scale(1.25)">
          <Flame f={f} seed={2.4} />
        </g>
        <g transform="translate(0 0) scale(2)">
          <Flame f={f} seed={4} />
        </g>
      </g>
    ) : null}
  </g>
);

/* ------------------------------- poses ------------------------------- */
const TORCH_UP: Partial<Pose> = { shR: 166, elR: -10, wrR: 0, uaR: 1, faR: 1, flexR: 1, handR: 'fist' };
const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = seg(f, 40, 46) * (1 - seg(f, 76, 82));
  const run = { ...BASE, ...gait(ph, turbo), ...TORCH_UP, torso: Math.sin(ph) * 3 } as Pose;
  if (f < 80) return plant(run, runLift(ph));
  const keys: Key<Pose>[] = [
    { f: 80, p: run },
    { f: 84, p: { ...STOP, ...TORCH_UP, handL: 'fist' }, e: E.out },
    { f: 88, p: { sy: 1, sx: 1, torsoSy: 1, hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, mouthMode: 'grin', mouthOpen: 0.4, pupil: 1 }, e: E.inOut },
    // aim the torch at the cauldron
    { f: 92, p: { turn: 0.45, lookX: 1, lookY: -0.4, torso: 6, head: 4, shR: 128, elR: -14, wrR: -10, shL: 30, elL: -80, smile: 1, mouthSkew: 0.4, brow: 0.6, lid: 0.2 }, e: E.inOut },
    { f: IGNITE - 1, p: { lid: 0.3 } },
    { f: IGNITE + 4, p: { turn: 0, lookX: 0, lookY: 0, torso: 0, head: 0, ...TORCH_UP, shL: 150, elL: -20, wrL: 0, handL: 'fist', flexL: 1.4, eyes: 1, mouthOpen: 1, smile: 1, mouthSkew: 0, chestS: 1.08, sy: 1.04, sx: 0.98 }, e: E.back },
    { f: IGNITE + 9, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 150, p: {} },
  ];
  const p = poseAt(f, BASE, keys);
  const pump = f > IGNITE + 8 ? Math.sin((f - IGNITE - 8) / 4) : 0;
  return plant({ ...p, shL: p.shL + pump * 8, chestS: p.chestS + pump * 0.01 });
};

export const TorchScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const turbo = seg(f, 40, 46) * (1 - seg(f, 76, 82));
  const D = RUN.distAt(f);
  const scale = kf(f, [[0, 0.92], [80, 0.92], [92, 0.96, E.out]]);
  const GX = 540;
  const GY = kf(f, [[0, 1640], [80, 1640], [92, 1700, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const cam: Cam = {
    cx: kf(f, [[0, 540], [84, 540], [96, 790, E.inOut], [IGNITE + 4, 770, E.out], [124, 740, E.inOut]]),
    cy: kf(f, [[0, 1100], [14, 960, E.out], [40, 960], [46, 990], [76, 990], [90, 960, E.out], [96, 900, E.inOut], [IGNITE + 6, 940, E.out], [120, 980, E.inOut]]),
    z: kf(f, [[0, 1.4], [14, 1, E.out], [40, 1.0], [46, 1.06, E.out], [76, 1.06], [88, 1.0, E.out], [96, 0.84, E.inOut], [IGNITE + 6, 0.88, E.out], [124, 0.86, E.inOut]]),
    r: Math.sin(f / 7) * 0.6 * (1 - seg(f, 80, 88)),
  };
  const s1 = shake(f, 42, 40, 7, 2);
  const s2 = shake(f, IGNITE, 24, 26, 5);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };

  const torchTip = toStage(r.W(r.aR.wrist, 0, 380));
  const lit = f < IGNITE ? 0 : Math.max(0, springAt(f, IGNITE, 16, 1.4, 4));
  const extra: WorldObj[] = [{ X: CX, Z: CZ, draw: (x, y, s) => <Cauldron key="cauldron" x={x} y={y} s={s * 1.05} f={f} lit={lit} /> }];
  const cz = CZ - D;
  const cpos = proj(CX, cz);
  const bowl: [number, number] = [cpos.x, cpos.y - 1050 * cpos.s * 1.05];
  const knees: [number, number][] = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];

  // fire arc from torch to bowl
  const at = seg(f, 91, IGNITE);
  const arc = (t: number): [number, number] => {
    const cx = (torchTip[0] + bowl[0]) / 2;
    const cy = Math.min(torchTip[1], bowl[1]) - 380;
    const u = 1 - t;
    return [u * u * torchTip[0] + 2 * u * t * cx + t * t * bowl[0], u * u * torchTip[1] + 2 * u * t * cy + t * t * bowl[1]];
  };
  const ball = at > 0 && at < 1 ? arc(E.inOut(at)) : null;

  // embers trailing off the torch
  const emb = rng(4);
  const embers = Array.from({ length: 14 }).map((_, i) => {
    const life = 14 + emb() * 10;
    const ph = emb() * life;
    const t = ((f + ph) % life) / life;
    const x = torchTip[0] + (emb() - 0.5) * 60 + Math.sin(t * 6 + i) * 20;
    const y = torchTip[1] - 40 - t * (160 + turbo * 260);
    return <circle key={i} cx={x} cy={y} r={(1 - t) * 9 + 2} fill={i % 3 ? '#FFB347' : '#FFF0B7'} opacity={(1 - t) * (f < IGNITE + 30 ? 1 : 0.6)} />;
  });

  const fireworks = [
    { t: IGNITE + 6, x: 250, y: 300, c: ['#FFD064', '#FFF0B7', '#FF7A3D'] },
    { t: IGNITE + 12, x: 860, y: 210, c: ['#BCABFF', '#FFFFFF', '#7254DC'] },
    { t: IGNITE + 19, x: 540, y: 120, c: ['#F15F75', '#FFD064', '#FFFFFF'] },
  ];

  return (
    <Stage impact={f === IGNITE} overlay={<EndCard f={f} start={106} lines={['TORCH BEARER']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <TrackWorld
        f={f}
        D={D}
        cam={cam}
        sh={sh}
        theme={THEMES.golden}
        blur={turbo}
        extra={extra}
        seed={11}
        signs={[['1 MI', RUN.distAt(26) + 0.6], ['2 MI', RUN.distAt(60) + 0.6]]}
        skyExtra={
          <g>
            {fireworks.map((w, i) => (
              <g key={i}>
                <Sparks f={f} start={w.t} seed={60 + i} n={28} x={w.x} y={w.y} speed={[14, 22]} g={0.25} size={[10, 18]} colors={w.c} shape="star" />
                <Glow x={w.x} y={w.y} r={kf(f, [[w.t, 0], [w.t + 3, 220, E.out], [w.t + 14, 0]])} id="glowY" o={0.7} />
              </g>
            ))}
          </g>
        }
      />
      <g transform={camP(cam, 1, sh)}>
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1800} n={40} opacity={0.5 * turbo} width={7} /> : null}
        {Array.from({ length: 6 }).map((_, i) => {
          const start = 44 + i * 6;
          return f < 80 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={50} seed={i + 30} rise={1.2} color="#FFF6E8" line="#DBC8AA" /> : null;
        })}
        <Glow x={torchTip[0]} y={torchTip[1] - 60} r={260} id="glowY" o={0.55} />
        <Hero p={p} x={GX} y={GY} scale={scale} itemR={<TorchItem f={f} />} itemBehindR />
        <WheelLegs knees={knees} f={f} o={turbo} />
        {embers}
        {/* travelling fireball */}
        {ball ? (
          <g>
            {[0.08, 0.16, 0.24].map((k, i) => {
              const tp = arc(E.inOut(Math.max(0, at - k)));
              return <circle key={i} cx={tp[0]} cy={tp[1]} r={34 - i * 8} fill="#FFB347" opacity={0.7 - i * 0.2} />;
            })}
            <Glow x={ball[0]} y={ball[1]} r={170} id="glowY" o={1} />
            <circle cx={ball[0]} cy={ball[1]} r={40} fill="#FF7A3D" stroke={INK} strokeWidth={7} />
            <circle cx={ball[0]} cy={ball[1]} r={22} fill="#FFF0B7" />
          </g>
        ) : null}
        <Burst x={bowl[0]} y={bowl[1] - 170} r={290} t={seg(f, IGNITE, IGNITE + 16)} seed={9} fill="#FFB347" fill2="#FFF0B7" />
        <Sparks f={f} start={IGNITE} seed={33} n={26} x={bowl[0]} y={bowl[1] - 80} speed={[16, 34]} g={0.6} size={[12, 24]} colors={['#FFB347', '#FFD064', '#FFF0B7']} />
        <Sfx f={f} start={42} text="ZOOOM!" x={300} y={760} size={160} rot={-12} fill="#FFD064" dur={28} />
        <Sfx f={f} start={IGNITE} text="FWOOSH!" x={560} y={500} size={170} rot={-8} fill="#FFB347" dur={28} />
      </g>
      <ConfettiRain f={f} start={IGNITE + 6} n={50} seed={9} colors={['#FFD064', '#FFB347', '#FFF0B7', '#7254DC', '#F15F75']} />
    </Stage>
  );
};

