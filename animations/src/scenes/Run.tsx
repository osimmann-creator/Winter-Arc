import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Cloud, Sfx, Sun, GlowDefs, ConfettiRain, Sparks, Dust, FocusLines, Burst } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';

const INK = C.ink;
const HY = 800; // horizon
const K = 1100; // ground projection
const FX = 700; // lateral projection
const ZH = 1.3; // hero depth

/* speed (world units / frame) and accumulated distance */
const speedAt = (f: number) => kf(f, [[0, 0.075], [36, 0.085], [42, 0.3, E.in], [74, 0.32], [84, 0.12, E.out], [98, 0, E.out]]);
const DIST: number[] = [];
(() => {
  let d = 0;
  for (let i = 0; i < 400; i++) {
    DIST.push(d);
    d += speedAt(i);
  }
})();
const distAt = (f: number) => {
  const i = Math.max(0, Math.min(DIST.length - 2, Math.floor(f)));
  return lerp(DIST[i], DIST[i + 1], f - i);
};
/* run-cycle phase */
const PH: number[] = [];
(() => {
  let ph = 0;
  for (let i = 0; i < 400; i++) {
    PH.push(ph);
    const period = kf(i, [[0, 16], [38, 15], [44, 6, E.in], [76, 6], [86, 14, E.out]]);
    const stop = 1 - seg(i, 84, 92);
    ph += ((Math.PI * 2) / period) * stop;
  }
})();

const proj = (X: number, Z: number) => ({ x: 540 + (X * FX) / Z, y: HY + K / Z, s: 1 / Z });

/* ------------------------------- poses ------------------------------- */
const runPose = (f: number): Partial<Pose> => {
  const ph = PH[Math.max(0, Math.min(PH.length - 1, Math.floor(f)))];
  const s = Math.sin(ph);
  const uL = Math.max(0, s) ** 0.8;
  const uR = Math.max(0, -s) ** 0.8;
  const turbo = seg(f, 40, 46) * (1 - seg(f, 80, 86));
  const kL = -s; // arm L forward when leg R forward
  const arm = (k: number) => {
    const fw = Math.max(0, k);
    const bk = Math.max(0, -k);
    return {
      sh: 16 - 6 * fw + 14 * bk,
      el: -(70 + 80 * fw - 30 * bk),
      ua: 1 - 0.32 * fw,
      fa: 1 - 0.1 * fw - 0.2 * bk,
      wr: -20 * fw,
    };
  };
  const aL = arm(kL);
  const aR = arm(-kL);
  const bob = Math.abs(Math.cos(ph));
  const leg = (u: number) => ({ hip: 4 + 10 * u, th: 1 - 0.68 * u, kn: -4 + 22 * u, ft: 14 * u, sh: 1 - 0.22 * u });
  const lL = leg(uL);
  const lR = leg(uR);
  return {
    hipL: lL.hip, thL: lL.th, knL: lL.kn, ftL: lL.ft, shinL: lL.sh,
    hipR: lR.hip, thR: lR.th, knR: lR.kn, ftR: lR.ft, shinR: lR.sh,
    shL: aL.sh, elL: aL.el, uaL: aL.ua, faL: aL.fa, wrL: aL.wr,
    shR: aR.sh, elR: aR.el, uaR: aR.ua, faR: aR.fa, wrR: aR.wr,
    torso: 4 * s, head: -3 * s, torsoSy: 0.95 - 0.04 * turbo,
    sy: 1 + 0.03 * bob, sx: 1 - 0.02 * bob,
    flexL: 0.6, flexR: 0.6,
    mouthOpen: 0.35 + 0.15 * Math.abs(s) + 0.2 * turbo, smile: 1 - 0.3 * turbo, mouthMode: 'grin',
    lid: 0.15 + 0.3 * turbo, browTilt: -0.3 - 0.7 * turbo, brow: 0.2, sweat: 0.7,
  };
};

const STOP: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -24, knR: -24, thL: 0.9, thR: 0.9, ftL: 4, ftR: 4,
  shL: 60, shR: 60, elL: 40, elR: 40, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, handL: 'open', handR: 'open',
  torso: 0, head: 0, torsoSy: 0.92, sy: 0.92, sx: 1.06,
  mouthMode: 'o', mouthOpen: 0.7, lid: 0, browTilt: 0, brow: 1, sweat: 1, pupil: 0.7,
};
const VICTORY: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2,
  shL: 152, shR: 152, elL: -14, elR: -14, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, handL: 'open', handR: 'open',
  torsoSy: 1, sy: 1, sx: 1, chestS: 1.05,
  mouthMode: 'grin', mouthOpen: 1, smile: 1, eyes: 1, brow: 0.8, sweat: 0, pupil: 1,
};

const poseF = (f: number): Pose => {
  const run = { ...BASE, ...runPose(f) } as Pose;
  if (f < 82) return plant(run, Math.max(0, Math.cos(PH[Math.floor(Math.max(0, f))] * 2)) * 14 * (f < 82 ? 1 : 0));
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
  const bounce = f > 105 ? Math.sin((f - 105) / 4) * 0.02 : 0;
  return plant({ ...p, chestS: p.chestS + bounce });
};

/* ------------------------------- world ------------------------------- */
const Tree: React.FC<{ x: number; y: number; s: number; seed: number }> = ({ x, y, s, seed }) => {
  const r = rng(seed);
  const col = ['#6DBE6C', '#5FAC5E', '#80C97B'][Math.floor(r() * 3)];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={-140} width={28} height={140} rx={8} fill="#9C6238" stroke={INK} strokeWidth={8} />
      <circle cx={0} cy={-200} r={100} fill={col} stroke={INK} strokeWidth={8} />
      <circle cx={-40} cy={-160} r={58} fill={col} stroke={INK} strokeWidth={8} />
      <circle cx={46} cy={-166} r={60} fill={col} stroke={INK} strokeWidth={8} />
      <circle cx={0} cy={-190} r={92} fill={col} />
      <circle cx={-30} cy={-230} r={34} fill="#FFFFFF" opacity={0.25} />
    </g>
  );
};

const Sign: React.FC<{ x: number; y: number; s: number; text: string }> = ({ x, y, s, text }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-10} y={-260} width={20} height={260} fill="#A3A2B9" stroke={INK} strokeWidth={8} />
    <rect x={-120} y={-380} width={240} height={140} rx={22} fill="#6A5BE0" stroke={INK} strokeWidth={10} />
    <rect x={-104} y={-364} width={208} height={108} rx={14} fill="none" stroke="#FFFFFF" strokeWidth={6} />
    <text x={0} y={-292} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={80} fill="#FFFFFF">
      {text}
    </text>
  </g>
);

const Gantry: React.FC<{ Z: number; f: number }> = ({ Z }) => {
  const a = proj(-1.15, Z);
  const b = proj(1.15, Z);
  const s = a.s;
  const top = a.y - 900 * s;
  return (
    <g>
      <rect x={a.x - 16 * s} y={top} width={32 * s} height={a.y - top} fill="#FFFFFF" stroke={INK} strokeWidth={8 * s} />
      <rect x={b.x - 16 * s} y={top} width={32 * s} height={b.y - top} fill="#FFFFFF" stroke={INK} strokeWidth={8 * s} />
      <rect x={a.x - 10 * s} y={top - 30 * s} width={b.x - a.x + 20 * s} height={190 * s} rx={20 * s} fill="#F15F75" stroke={INK} strokeWidth={10 * s} />
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x={a.x + ((b.x - a.x) / 16) * i} y={top - 30 * s} width={(b.x - a.x) / 32} height={24 * s} fill={i % 2 ? '#FFFFFF' : INK} />
      ))}
      <text x={(a.x + b.x) / 2} y={top + 76 * s} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={110 * s} fill="#FFFFFF" stroke={INK} strokeWidth={14 * s} paintOrder="stroke">
        FINISH
      </text>
    </g>
  );
};

const World: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number } }> = ({ f, cam, sh }) => {
  const D = distAt(f);
  const turbo = seg(f, 40, 46) * (1 - seg(f, 80, 88));
  // grass bands
  const bands = [];
  const period = 1.2;
  for (let i = 0; i < 40; i++) {
    const z0 = 0.4 + i * period * 0.5 - (D % period);
    const z1 = z0 + period * 0.5;
    if (z1 < 0.3) continue;
    const ya = HY + K / Math.max(0.3, z0);
    const yb = HY + K / z1;
    const dark = (i + Math.floor(D / period) * 2) % 2 === 0;
    bands.push(<rect key={i} x={-600} y={yb} width={2280} height={Math.max(0, ya - yb)} fill={dark ? '#71BC63' : '#80CB76'} />);
  }
  // track edges
  const e1 = proj(-1, 1000);
  const ny = 2600;
  const nz = K / (ny - HY);
  const L = proj(-1, nz);
  const Rr = proj(1, nz);
  const lines = [-1, -0.34, 0.34, 1];
  // dashes on track (lane numbers / hash marks)
  const marks = [];
  for (let i = 0; i < 30; i++) {
    const z = 0.5 + i * 0.9 - (D % 0.9);
    if (z < 0.35) continue;
    for (const X of [-0.67, 0.67]) {
      const a = proj(X - 0.1, z);
      const b = proj(X + 0.1, z);
      const c = proj(X + 0.1, z + 0.04);
      const d2 = proj(X - 0.1, z + 0.04);
      marks.push(<path key={`${i}${X}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}L${c.x} ${c.y}L${d2.x} ${d2.y}Z`} fill="#FFFFFF" opacity={0.7} />);
    }
  }
  // roadside objects
  const objs: { X: number; Z0: number; kind: 'tree' | 'sign1' | 'sign2' | 'cone'; seed: number }[] = [];
  const r = rng(3);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    objs.push({ X: side * (1.7 + r() * 1.6), Z0: 1 + i * 0.9 + r() * 0.4, kind: 'tree', seed: i });
  }
  for (let i = 0; i < 18; i++) {
    objs.push({ X: (i % 2 ? 1.18 : -1.18), Z0: 0.8 + i * 1.6, kind: 'cone', seed: i });
  }
  objs.push({ X: 1.5, Z0: distAt(26) + 0.6, kind: 'sign1', seed: 0 });
  objs.push({ X: -1.5, Z0: distAt(62) + 0.6, kind: 'sign2', seed: 0 });
  const vis = objs
    .map((o) => ({ ...o, Z: o.Z0 - D }))
    .filter((o) => o.Z > 0.32 && o.Z < 30)
    .sort((a, b) => b.Z - a.Z);
  const blur = turbo > 0.3;
  return (
    <>
      <defs>
        <linearGradient id="runSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#80ADFC" />
          <stop offset="0.7" stopColor="#ACDCF9" />
          <stop offset="1" stopColor="#F3EDFF" />
        </linearGradient>
        <filter id="vblur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${turbo * 2} ${turbo * 10}`} />
        </filter>
      </defs>
      <g transform={camP(cam, 0.2, sh)}>
        <rect x={-600} y={-600} width={2280} height={2000} fill="url(#runSky)" />
        <Sun x={860} y={330} r={90} f={f} />
        {[0, 1, 2, 3].map((i) => (
          <Cloud key={i} x={((i * 380 + f * 0.6) % 1500) - 240} y={230 + (i % 2) * 210} w={300 + i * 30} h={130} seed={i + 1} />
        ))}
      </g>
      <g transform={camP(cam, 0.6, sh)}>
        <path d={`M-600 ${HY + 4} Q-200 600 200 ${HY - 40} Q420 640 700 ${HY - 30} Q980 620 1300 ${HY - 10} L1700 ${HY + 4} Z`} fill="#A6CFBE" stroke="#7CAF9B" strokeWidth={6} />
        <path d={`M-600 ${HY + 4} Q-100 690 300 ${HY - 6} Q640 700 1000 ${HY - 4} Q1300 700 1700 ${HY + 4} Z`} fill="#91C99C" stroke="#73AE80" strokeWidth={6} />
      </g>
      <g transform={camP(cam, 1, sh)} filter={blur ? 'url(#vblur)' : undefined}>
        {bands}
        <path d={`M${e1.x} ${e1.y} L${proj(1, 1000).x} ${e1.y} L${Rr.x} ${Rr.y} L${L.x} ${L.y} Z`} fill="#DE6C59" />
        {lines.map((X) => {
          const far = proj(X, 1000);
          const near = proj(X, nz);
          return <line key={X} x1={far.x} y1={far.y} x2={near.x} y2={near.y} stroke="#FFFFFF" strokeWidth={10} />;
        })}
        {marks}
        <line x1={L.x} y1={L.y} x2={e1.x} y2={e1.y} stroke={INK} strokeWidth={6} opacity={0.4} />
        {vis.map((o, i) => {
          const pp = proj(o.X, o.Z);
          if (o.kind === 'tree') return <Tree key={i} x={pp.x} y={pp.y} s={pp.s * 0.9} seed={o.seed} />;
          if (o.kind === 'cone')
            return (
              <g key={i} transform={`translate(${pp.x} ${pp.y}) scale(${pp.s * 0.8})`}>
                <path d="M-40 0 L-12 -110 L12 -110 L40 0 Z" fill="#F88F4D" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
                <path d="M-28 -46 L28 -46 L22 -70 L-22 -70 Z" fill="#FFFFFF" />
                <rect x={-52} y={-8} width={104} height={16} rx={6} fill="#F88F4D" stroke={INK} strokeWidth={7} />
              </g>
            );
          return <Sign key={i} x={pp.x} y={pp.y} s={pp.s * 0.9} text={o.kind === 'sign1' ? '1 MI' : '2 MI'} />;
        })}
      </g>
    </>
  );
};

/* ------------------------------- scene ------------------------------- */
export const RunScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const turbo = seg(f, 40, 46) * (1 - seg(f, 80, 88));
  const D = distAt(f);
  const scale = kf(f, [[0, 0.92], [82, 0.92], [96, 1.0, E.out]]);
  const GX = 540;
  const GY = kf(f, [[0, 1640], [82, 1640], [96, 1720, E.out]]);
  const cam: Cam = {
    cx: 540 + Math.sin(f / 9) * 6 * (1 - seg(f, 82, 90)),
    cy: kf(f, [[0, 1100], [14, 960, E.out], [40, 960], [46, 990], [80, 990], [96, 960, E.out]]),
    z: kf(f, [[0, 1.45], [14, 1, E.out], [40, 1.0], [46, 1.06, E.out], [80, 1.06], [90, 1.0, E.out], [135, 1.03]]),
    r: Math.sin(f / 7) * 0.6 * (1 - seg(f, 82, 90)),
  };
  const s1 = shake(f, 42, 40, 7, 2);
  const s2 = shake(f, 80, 14, 22, 5);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };

  // finish tape depth
  const tapeZ0 = distAt(80) + ZH;
  const tapeZ = tapeZ0 - D;
  const broke = f >= 80;
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const knees = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];
  const head = toStage(r.headTop());

  const tape = () => {
    if (broke) {
      const t = f - 80;
      const out = E.out(clamp(t / 16));
      const y = GY - 520 * scale;
      return (
        <g>
          {[-1, 1].map((sd) => (
            <path
              key={sd}
              d={`M${540 + sd * 20} ${y} Q${540 + sd * (200 + out * 300)} ${y - 60 * out + 140 * out * out} ${540 + sd * (520 + out * 400)} ${y + 260 * out}`}
              fill="none"
              stroke="#F15F75"
              strokeWidth={22}
              strokeLinecap="round"
              opacity={1 - seg(t, 14, 22)}
            />
          ))}
        </g>
      );
    }
    if (tapeZ < ZH || tapeZ > 40) return null;
    const a = proj(-1.15, tapeZ);
    const b = proj(1.15, tapeZ);
    const y = a.y - 600 * a.s * 0.95;
    return <path d={`M${a.x} ${y} Q540 ${y + 20 * a.s} ${b.x} ${y}`} fill="none" stroke="#F15F75" strokeWidth={22 * a.s} strokeLinecap="round" />;
  };

  return (
    <Stage overlay={<EndCard f={f} start={100} lines={['SPEED DEMON']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <World f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        {tapeZ0 - D > ZH && tapeZ0 - D < 40 ? <Gantry Z={tapeZ0 - D + 0.02} f={f} /> : null}
        {!broke ? tape() : null}
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1800} n={40} opacity={0.5 * turbo} width={7} /> : null}
        {/* dust trail behind feet */}
        {Array.from({ length: 6 }).map((_, i) => {
          const start = 44 + i * 6;
          return f < 84 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={50} seed={i + 30} rise={1.2} color="#F8F5FF" line="#DBC8AA" /> : null;
        })}
        <Burst x={540} y={GY - 640 * scale} r={380} t={seg(f, 80, 96)} seed={4} fill="#FFD064" />
        <Hero p={p} x={GX} y={GY} scale={scale} />
        {/* wheel-leg blur loops */}
        {turbo > 0.2
          ? knees.map(([kx, ky], i) => (
              <g key={i} transform={`translate(${kx + (i ? 10 : -10)} ${ky + 50}) rotate(${f * 47 + i * 120})`} opacity={0.9 * turbo}>
                <ellipse rx={70} ry={120} fill="none" stroke="#FFFFFF" strokeWidth={16} strokeDasharray="210 90" strokeLinecap="round" />
                <ellipse rx={70} ry={120} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="120 180" strokeDashoffset={-40} strokeLinecap="round" opacity={0.6} />
              </g>
            ))
          : null}
        {broke ? tape() : null}
        <Sparks f={f} start={80} seed={8} n={30} x={540} y={GY - 520 * scale} speed={[18, 42]} g={1} shape="confetti" colors={['#F15F75', '#FFD064', '#6A5BE0', '#6ACC86']} size={[16, 30]} />
        <Dust f={f} start={84} x={540} y={GY} n={10} spread={520} size={70} seed={12} color="#F8F5FF" line="#DBC8AA" />
        {/* laurel leaves blown off */}
        {[0, 1, 2].map((i) => {
          const t = f - (48 + i * 5);
          if (t < 0 || t > 30) return null;
          const k = t / 30;
          const x = lerp(head[0] + (i - 1) * 60, 540 + (i - 1) * 40, E.out(k));
          const y = lerp(head[1] + 40, HY - 40, E.out(k)) - Math.sin(k * Math.PI) * 160;
          const s = 1.2 * (1 - k * 0.85);
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${t * 30 + i * 70}) scale(${s})`}>
              <path d="M0 0 Q14 -12 38 -2 Q18 11 0 0 Z" fill={C.gold} stroke={INK} strokeWidth={4} />
            </g>
          );
        })}
        <Sfx f={f} start={42} text="ZOOOM!" x={300} y={760} size={170} rot={-12} fill="#FFD064" dur={30} />
        <Sfx f={f} start={84} text="SKRRT!" x={720} y={1440} size={130} rot={8} fill="#FFFFFF" dur={20} />
      </g>
      <ConfettiRain f={f} start={98} n={60} seed={5} />
    </Stage>
  );
};
