// Run #8: "PIGEON PANIC" - a flock of city pigeons scurries along in front of him, then explodes
// into the air. One lands on his head and rides along. They both flex at the end.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';
import { makeRun, gait, runLift, STOP } from './RunKit';
import { CityWorld, CITY, P, CityObj } from './CityKit';
import { INK } from './kit';

const GX = 540;
const SCATTER = 28;
const LAND = 46;
const SKID = 72;
const POSE = 80;
const CARD = 94;
const RUN = makeRun(
  [[0, 0.15], [SKID - 4, 0.17], [SKID + 6, 0.02, E.out], [SKID + 10, 0, E.out]],
  [[0, 12], [SKID, 11], [SKID + 6, 14, E.out]],
  [SKID + 2, SKID + 8],
);

/* ------------------------------- pigeon ------------------------------- */
type PMode = 'walk' | 'fly' | 'sit' | 'flex';
/** City pigeon, side view facing right (flip = -1 faces left). Units: px at z = 1. */
export const Pigeon: React.FC<{ x: number; y: number; s: number; f: number; mode: PMode; flip?: number; seed?: number; rot?: number; k?: number }> = ({
  x, y, s, f, mode, flip = 1, seed = 0, rot = 0, k = 1,
}) => {
  const ph = f * (mode === 'fly' ? 1.4 : 0.9) + seed * 1.7;
  const bob = mode === 'walk' ? Math.abs(Math.sin(ph)) * 10 : 0;
  const head = mode === 'walk' ? Math.sin(ph) * 14 : 0;
  const flap = mode === 'fly' ? Math.sin(ph) : 0;
  const wing = (up: number, back: boolean) => (
    <g transform={`translate(${back ? 10 : 0} -110) rotate(${-20 - up * 70}) scale(1 ${back ? 0.9 : 1})`}>
      <path d="M0 0 Q60 -40 170 -70 Q200 -60 186 -36 Q150 -20 160 0 Q120 4 130 22 Q80 30 0 20 Z" fill={back ? '#6F7BAA' : '#8E9AC4'} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      <path d="M60 -10 L130 -28 M70 8 L140 -4" stroke="#3E4670" strokeWidth={9} strokeLinecap="round" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y - bob * s}) rotate(${rot}) scale(${s * k * flip} ${s * k})`}>
      {mode !== 'fly' && mode !== 'sit' ? <ellipse cx={0} cy={4} rx={90} ry={16} fill="#1E1A2E" opacity={0.2} /> : null}
      {mode === 'fly' ? wing(flap, true) : null}
      {mode === 'flex' ? (
        <g>
          <g transform="translate(-10 -120) rotate(-110)">
            <path d="M0 0 Q50 -50 120 -40 Q150 -10 120 10 Q60 30 0 20 Z" fill="#6F7BAA" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
          </g>
          <g transform="translate(40 -120) rotate(-70)">
            <path d="M0 0 Q50 -50 120 -40 Q150 -10 120 10 Q60 30 0 20 Z" fill="#8E9AC4" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
          </g>
        </g>
      ) : null}
      {/* legs */}
      {mode === 'walk' || mode === 'flex' || mode === 'sit' ? (
        <g stroke="#F07E7E" strokeWidth={10} strokeLinecap="round" fill="none">
          <path d={`M-10 -40 L${-20 + Math.sin(ph) * 22} -2 M${-34 + Math.sin(ph) * 22} -2 L${-4 + Math.sin(ph) * 22} -2`} />
          <path d={`M20 -40 L${18 - Math.sin(ph) * 22} -2 M${4 - Math.sin(ph) * 22} -2 L${34 - Math.sin(ph) * 22} -2`} />
        </g>
      ) : (
        <path d="M-30 -40 L-70 -20 M10 -40 L-30 -18" stroke="#F07E7E" strokeWidth={10} strokeLinecap="round" />
      )}
      {/* tail */}
      <path d="M-70 -80 L-170 -66 Q-180 -40 -160 -36 L-66 -50 Z" fill="#4E5784" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      {/* body */}
      <path d="M-90 -76 Q-80 -150 10 -150 Q80 -150 96 -96 Q100 -40 40 -34 Q-40 -26 -90 -76 Z" fill="#9AA6CF" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
      <path d="M-20 -48 Q40 -40 80 -70" fill="none" stroke="#C4CBE6" strokeWidth={14} strokeLinecap="round" />
      {/* neck + head */}
      <g transform={`translate(${head} ${-Math.abs(head) * 0.2})`}>
        <path d="M40 -130 Q66 -170 70 -196 L112 -190 Q118 -150 96 -112 Z" fill="#7CC7A0" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
        <path d="M58 -150 Q80 -140 104 -150" fill="none" stroke="#A07FE0" strokeWidth={12} strokeLinecap="round" />
        <circle cx={92} cy={-214} r={44} fill="#8994C4" stroke={INK} strokeWidth={9} />
        <path d="M130 -222 L170 -210 L130 -200 Z" fill="#F2B48A" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <ellipse cx={126} cy={-224} rx={8} ry={6} fill="#FFFFFF" />
        <circle cx={104} cy={-222} r={14} fill="#FF9A4D" stroke={INK} strokeWidth={5} />
        <circle cx={106} cy={-222} r={6} fill={INK} />
      </g>
      {mode === 'fly' ? wing(flap, false) : mode === 'walk' || mode === 'sit' ? (
        <g transform="translate(-40 -120)">
          <path d="M0 0 Q70 -14 120 10 Q90 36 10 34 Z" fill="#7E8AB8" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
          <path d="M40 6 L100 14 M40 22 L90 26" stroke="#3E4670" strokeWidth={8} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

/** A single drifting feather. */
const Feather: React.FC<{ x: number; y: number; rot: number; s: number; o: number }> = ({ x, y, rot, s, o }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <path d="M0 -40 Q22 -10 0 40 Q-22 -10 0 -40 Z" fill="#C4CBE6" stroke={INK} strokeWidth={5} />
    <line x1={0} y1={-36} x2={0} y2={52} stroke={INK} strokeWidth={4} />
  </g>
);

/* ------------------------------- flock ------------------------------- */
type Bird = { X0: number; z0: number; seed: number; dir: number; to: 'cam' | 'back' | 'rider'; dx: number; h: number };
const FLOCK: Bird[] = (() => {
  const r = rng(77);
  const out: Bird[] = [];
  for (let i = 0; i < 9; i++) {
    out.push({
      X0: -0.72 + (i / 8) * 1.44 + (r() - 0.5) * 0.12,
      z0: 0.9 + r() * 0.26,
      seed: i,
      dir: r() < 0.5 ? 1 : -1,
      to: i === 4 ? 'rider' : i % 2 ? 'cam' : 'back',
      dx: (i < 4 ? -1 : 1) * (0.6 + r() * 1.2),
      h: 1.6 + r() * 1.8,
    });
  }
  return out;
})();
/** world position (X, depth z, height h) of a flock bird */
const birdAt = (b: Bird, f: number) => {
  const gain = 0.006 * f; // he is slowly catching up with them
  const jit = Math.sin(f * 0.6 + b.seed) * 0.03;
  const z = b.z0 + gain + jit;
  if (f < SCATTER + b.seed % 3) return { X: b.X0 + Math.sin(f * 0.3 + b.seed) * 0.03, z, h: 0, flying: false };
  const t = (f - SCATTER - (b.seed % 3)) / 20;
  const tz = b.to === 'cam' ? lerp(z, 0.32, Math.min(1, t * 1.2)) : lerp(z, 4 + b.seed * 0.4, Math.min(1, t));
  return { X: b.X0 + b.dx * t, z: tz, h: b.h * Math.min(1, t * 1.4) - 0.3 * t * t, flying: true };
};

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const g = gait(ph, 0);
  const startle = seg(f, SCATTER, SCATTER + 3) * (1 - seg(f, SCATTER + 12, SCATTER + 18));
  if (f < SKID) {
    return plant(
      {
        ...BASE,
        ...g,
        lookY: f < SCATTER ? 0.8 : lerp(0.2, -0.8, startle),
        mouthMode: startle > 0.4 ? 'o' : 'grin',
        mouthOpen: startle > 0.4 ? 0.8 : g.mouthOpen ?? 0.4,
        brow: startle > 0.2 ? 1 : 0.4,
        browTilt: startle > 0.2 ? 0.7 : 0,
        sweat: 0.3,
        smile: 1,
        eyeMode: 'normal',
      },
      runLift(ph),
    );
  }
  const keys: Key<Pose>[] = [
    { f: SKID, p: { ...BASE, ...g } },
    { f: SKID + 5, p: STOP, e: E.out },
    { f: POSE - 2, p: { sy: 0.9, sx: 1.07 }, e: E.inOut },
    {
      f: POSE + 2,
      p: {
        shL: 96, shR: 96, elL: 112, elR: 112, uaL: 1, uaR: 1, faL: 0.96, faR: 0.96, wrL: 10, wrR: 10, flexL: 1.9, flexR: 1.9,
        shrugL: 14, shrugR: 14, chestS: 1.1, hipL: 14, hipR: 14, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, handL: 'fist', handR: 'fist',
        mouthMode: 'grin', mouthOpen: 0.95, smile: 1, lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', sy: 1.06, sx: 0.96, torsoSy: 1,
      },
      e: E.out,
    },
    { f: POSE + 6, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
    { f: POSE + 10, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 96, p: { eyeMode: 'normal', wink: 1, mouthSkew: 0.5, turn: 0.2, lookX: 0.5, lookY: -0.5 }, e: E.inOut },
    { f: 108, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0, lookY: -0.3 } },
    { f: 150, p: {} },
  ];
  return plant(poseAt(f, BASE, keys));
};

export const PigeonPanicScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const scale = kf(f, [[0, 0.9], [SKID, 0.9], [POSE + 6, 0.98, E.out]]);
  const GY = kf(f, [[0, 1640], [SKID, 1640], [POSE + 6, 1700, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1180], [SCATTER - 4, 1160], [SCATTER + 4, 1020, E.out], [LAND, 960, E.inOut], [SKID, 980], [POSE + 6, 980, E.inOut], [CARD + 6, 860, E.inOut]]),
    z: kf(f, [[0, 1.0], [SCATTER - 4, 1.02], [SCATTER + 4, 0.9, E.out], [LAND, 1.04, E.inOut], [SKID, 1.0], [POSE + 6, 1.04, E.out], [CARD + 6, 1.0, E.inOut]]),
  };
  const s1 = shake(f, SCATTER, 10, 10, 1);
  const s2 = shake(f, SKID, 10, 12, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: 0 };

  // flock as city objects (so the ones in front of him draw in front)
  const birds: CityObj[] = FLOCK.filter((b) => !(b.to === 'rider' && f >= SCATTER - 2)).map((b) => {
    const w = birdAt(b, f);
    return {
      X: w.X, S: w.z - D, key: `b${b.seed}`,
      draw: (x, y, s) => {
        const yy = y - (700 * w.h) / w.z;
        return <Pigeon key={`b${b.seed}`} x={x} y={yy} s={s * 0.95} f={f} mode={w.flying ? 'fly' : 'walk'} flip={w.flying ? (b.dx > 0 ? 1 : -1) : b.dir} seed={b.seed} rot={w.flying ? (b.dx > 0 ? -12 : 12) : 0} />;
      },
    };
  });
  // the rider: flies up from the flock and lands on his head
  const rb = FLOCK[4];
  const rStart = (() => {
    const w = birdAt(rb, SCATTER - 2);
    const pp = P(w.X, w.z);
    return { x: pp.x, y: pp.y, s: 1 / w.z };
  })();
  const riderT = seg(f, SCATTER - 2, LAND);
  const riding = f >= LAND;
  const riderPos = { x: lerp(rStart.x, head[0] + 10, E.inOut(riderT)), y: lerp(rStart.y, head[1] + 10, E.out(riderT)) - Math.sin(riderT * Math.PI) * 420 };
  const riderS = lerp(rStart.s * 0.95, scale * 0.85, riderT);
  const flexing = f >= POSE + 1;
  const riderHead = riding ? (
    <g transform="translate(0 -318)">
      <Pigeon x={0} y={0} s={0.85} f={f} mode={flexing ? 'flex' : 'sit'} flip={-1} seed={4} rot={Math.sin(f * 0.5) * 4} />
    </g>
  ) : null;

  const feathers = Array.from({ length: 10 }).map((_, i) => {
    const r0 = rng(300 + i);
    const t = f - SCATTER - 2;
    if (t < 0 || t > 60) return null;
    const x = 200 + r0() * 680 + Math.sin(t / 6 + i) * 40;
    const y = 1500 - r0() * 500 + t * (3 + r0() * 3);
    return <Feather key={i} x={x} y={y} rot={Math.sin(t / 5 + i) * 50} s={0.8 + r0() * 0.6} o={1 - seg(t, 40, 60)} />;
  });

  return (
    <Stage impact={false} overlay={<EndCard f={f} start={CARD} lines={['PIGEON PANIC']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.day} seed={29} extra={birds} crosswalks={[6, 22]} />
      <g transform={camP(cam, 1, sh)}>
        <Burst x={540} y={chest[1]} r={420} t={seg(f, POSE, POSE + 17)} seed={36} />
        <Glow x={540} y={chest[1]} r={kf(f, [[POSE - 1, 0], [POSE + 3, 520, E.out], [POSE + 24, 360]])} id="glowY" o={seg(f, POSE - 1, POSE + 1) * 0.8} />
        <Hero p={p} x={GX} y={GY} scale={scale} headExtra={riderHead} />
      </g>
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={CITY.day} seed={29} layer="front" extra={birds} />
      <g transform={camP(cam, 1, sh)}>
        {!riding && f >= SCATTER - 2 ? <Pigeon x={riderPos.x} y={riderPos.y} s={riderS} f={f} mode="fly" flip={-1} seed={4} rot={10} /> : null}
        {feathers}
        <Dust f={f} start={SKID} x={540} y={GY} n={8} spread={380} size={60} seed={61} />
        <Sparks f={f} start={POSE} seed={62} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 98, 112)} />
        <Sfx f={f} start={8} text="coo coo" x={250} y={1420} size={80} rot={-8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={SCATTER} text="FLAP FLAP FLAP!" x={540} y={head[1] - 130} size={120} rot={-5} fill="#FFD064" dur={18} />
        <Sfx f={f} start={LAND} text="...hi" x={head[0] + 240} y={head[1] - 40} size={80} rot={8} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={SKID} text="SKRRT!" x={820} y={GY - 160} size={120} rot={10} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={POSE} text="COO!" x={head[0] + 250} y={head[1] - 60} size={150} rot={8} fill="#FFD064" dur={22} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={37} />
    </Stage>
  );
};
