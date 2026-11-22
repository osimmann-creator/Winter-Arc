import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { ap } from '../lib/m2';
import { Stage, camP, Cam, TOP, FULL_H } from '../fx/Stage';
import { Cloud, Sfx, GlowDefs, Glow, Burst, Sparks, FocusLines, ConfettiRain, Ring } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { rng, rrPath } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1500;
const SC = 0.84;

/* ------------------------------- paddle ------------------------------- */
export const Paddle: React.FC = () => (
  <g>
    <rect x={-17} y={10} width={34} height={150} rx={12} fill="#412633" stroke={INK} strokeWidth={6} />
    {[40, 62, 84, 106].map((y) => (
      <line key={y} x1={-16} y1={y} x2={16} y2={y + 10} stroke="#5E5870" strokeWidth={4} />
    ))}
    <path d={rrPath(-104, 140, 208, 236, 92)} fill="#6AC47C" stroke={INK} strokeWidth={8} />
    <path d={rrPath(-92, 152, 184, 212, 82)} fill="none" stroke="#4C9259" strokeWidth={8} />
    <path d="M-60 210 Q0 180 60 210" fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.6} />
    <circle cx={0} cy={262} r={34} fill="#FFD064" stroke={INK} strokeWidth={6} />
    <path d="M-14 262 L0 246 L14 262 L0 278 Z" fill={INK} />
  </g>
);
export const PADDLE_FACE = [0, 262] as [number, number];

/* ------------------------------- ball ------------------------------- */
export const Ball: React.FC<{ x: number; y: number; r: number; rot?: number; fire?: number }> = ({ x, y, r, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <circle r={r} fill="#F9EE4E" stroke={INK} strokeWidth={Math.max(3, r * 0.14)} />
    {[
      [-0.35, -0.3], [0.32, -0.38], [0.05, 0.05], [-0.4, 0.32], [0.38, 0.3], [0.02, -0.62], [0, 0.6],
    ].map(([a, b], i) => (
      <circle key={i} cx={a * r} cy={b * r} r={r * 0.13} fill="#C7BF30" />
    ))}
    <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.28} ry={r * 0.16} fill="#FFFFFF" opacity={0.6} transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const READY: Partial<Pose> = {
  hipL: 16, hipR: 16, knL: -24, knR: -24, thL: 0.9, thR: 0.9, ftL: 4, ftR: 4, torsoSy: 0.96,
  shR: 34, elR: 118, wrR: -14, handR: 'fist', shL: 30, elL: -78, wrL: 20, handL: 'fist',
  lookY: -0.1, lid: 0.25, brow: 0.2, browTilt: -0.4, smile: 0.9, mouthOpen: 0, flexL: 0.5, flexR: 0.6,
  armZR: 'mid',
};
const WINDUP: Partial<Pose> = {
  hipL: 12, hipR: 18, knL: -10, knR: -20, thL: 1, thR: 0.95, torsoSy: 1.02, torso: -5, sy: 1.03,
  shR: 150, elR: 100, wrR: 25, uaR: 1.05, shL: 150, elL: -8, handL: 'point', uaL: 1.05,
  lookY: -0.9, lookX: 0.45, turn: 0.2, head: -6, lid: 0.45, browTilt: -1, brow: -0.2, mouthMode: 'grit', mouthOpen: 0,
  armZR: 'back',
};
const SMASH: Partial<Pose> = {
  hipL: 18, hipR: 10, knL: -26, knR: -8, thL: 0.88, thR: 1, torso: 10, torsoSy: 0.95, sy: 0.97,
  shR: -38, elR: -6, wrR: -18, uaR: 1, shL: 26, elL: -96, handL: 'fist', uaL: 1,
  lookY: 0.2, lookX: -0.2, turn: -0.1, head: 6, lid: 0.1, browTilt: -0.6, brow: 0.5, mouthMode: 'grin', mouthOpen: 1, smile: 0.7,
  armZR: 'top',
};
const BLOW: Partial<Pose> = {
  hipL: 8, hipR: 8, knL: -4, knR: -4, thL: 1, thR: 1, torso: 0, torsoSy: 1, sy: 1,
  shR: 22, elR: 150, wrR: -16, uaR: 0.92, shL: 42, elL: -104, wrL: 30, handL: 'fist',
  lookY: 0, lookX: 0.7, turn: 0.32, head: 4, lid: 0.45, brow: 0.3, browTilt: -0.4,
  mouthMode: 'o', mouthOpen: 0.05, smile: 0.5,
  armZR: 'mid',
};
const SMUG: Partial<Pose> = {
  lookX: -0.1, turn: 0.15, head: 0, lid: 0.3, mouthMode: 'grin', mouthOpen: 0.15, smile: 0.9, mouthSkew: 0.7, browTilt: -0.3,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: READY },
  { f: 6, p: { sy: 0.97, knL: -28, knR: -28 } },
  { f: 12, p: { sy: 1.0, knL: -22, knR: -22 } },
  { f: 18, p: { sy: 0.97, knL: -28, knR: -28 } },
  { f: 34, p: WINDUP, e: E.inOut },
  { f: 38, p: { sy: 1.05, shR: 160, elR: 115, torso: -7 }, e: E.out },
  { f: 41, p: SMASH, e: E.in },
  { f: 46, p: { sy: 0.95, shR: -46 }, e: E.out },
  { f: 58, p: { ...SMASH, mouthOpen: 0.4, lookY: -0.2, lookX: 0 }, e: E.inOut },
  { f: 70, p: BLOW, e: E.inOut },
  { f: 92, p: { ...BLOW, mouthOpen: 0.1 } },
  { f: 102, p: { ...BLOW, ...SMUG, shR: 30, elR: 140 }, e: E.inOut },
  { f: 150, p: {} },
];

const poseF = (f: number) => {
  const p = poseAt(f, BASE, KEYS);
  const hop = f < 26 ? Math.max(0, Math.sin((f / 12) * Math.PI * 2)) * 10 : 0;
  return plant(p, hop);
};

/* ------------------------------- background ------------------------------- */
const Court: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number }; slowmo: number }> = ({ f, cam, sh, slowmo }) => {
  const r = rng(9);
  const vp = { x: 540, y: 760 };
  const pt = (X: number, Y: number) => ({ x: vp.x + X, y: Y });
  void pt;
  return (
    <>
      <defs>
        <linearGradient id="jSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8AB9FE" />
          <stop offset="1" stopColor="#D5EEFC" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.25, sh)}>
        <rect x={-600} y={-600} width={2280} height={1900} fill="url(#jSky)" />
        {[0, 1, 2].map((i) => (
          <Cloud key={i} x={((i * 470 + f * 0.8 * (1 - slowmo * 0.85)) % 1600) - 260} y={220 + i * 120} w={320} h={130} seed={i + 7} />
        ))}
      </g>
      <g transform={camP(cam, 0.7, sh)}>
        {/* trees behind fence */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = -120 + i * 160 + r() * 40;
          const h = 160 + r() * 80;
          return (
            <g key={i}>
              <circle cx={x} cy={760 - h} r={90 + r() * 30} fill={i % 2 ? '#69B86C' : '#60AD63'} stroke={INK} strokeWidth={7} />
            </g>
          );
        })}
        {/* fence */}
        <rect x={-500} y={620} width={2080} height={260} fill="#438257" stroke={INK} strokeWidth={7} />
        <g opacity={0.25}>
          {Array.from({ length: 60 }).map((_, i) => (
            <line key={i} x1={-500 + i * 40} y1={620} x2={-500 + i * 40 + 260} y2={880} stroke="#FFFFFF" strokeWidth={3} />
          ))}
        </g>
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={-480 + i * 260} y={600} width={18} height={290} fill="#A3A2B9" stroke={INK} strokeWidth={5} />
        ))}
        <rect x={14} y={680} width={330} height={84} rx={16} fill="#FFFFFF" stroke={INK} strokeWidth={7} />
        <text x={179} y={726} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={52} fill="#438257">
          JICKLE CLUB
        </text>
      </g>
      <g transform={camP(cam, 1, sh)}>
        {/* surround */}
        <rect x={-500} y={880} width={2080} height={1500} fill="#67B877" />
        {/* court */}
        <path d="M150 880 L930 880 L1260 2100 L-180 2100 Z" fill="#6967CF" stroke="#FFFFFF" strokeWidth={12} strokeLinejoin="round" />
        <line x1={540} y1={880} x2={540} y2={1220} stroke="#FFFFFF" strokeWidth={10} />
        <line x1={84} y1={1220} x2={996} y2={1220} stroke="#FFFFFF" strokeWidth={10} />
        <line x1={52} y1={1340} x2={1028} y2={1340} stroke="#FFFFFF" strokeWidth={10} opacity={0.6} />
        <path d="M150 880 L930 880 L1260 2100 L-180 2100 Z" fill="none" stroke={INK} strokeWidth={6} opacity={0.35} />
      </g>
    </>
  );
};

const Net: React.FC = () => (
  <g>
    <rect x={-60} y={1560} width={24} height={240} fill="#433C4F" stroke={INK} strokeWidth={6} />
    <rect x={1116} y={1560} width={24} height={240} fill="#433C4F" stroke={INK} strokeWidth={6} />
    <rect x={-40} y={1580} width={1160} height={200} fill="#311724" opacity={0.28} />
    <g opacity={0.55}>
      {Array.from({ length: 60 }).map((_, i) => (
        <line key={'v' + i} x1={-40 + i * 20} y1={1580} x2={-40 + i * 20} y2={1780} stroke="#311724" strokeWidth={3} />
      ))}
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={'h' + i} x1={-40} y1={1580 + i * 20} x2={1120} y2={1580 + i * 20} stroke="#311724" strokeWidth={3} />
      ))}
    </g>
    <rect x={-44} y={1556} width={1168} height={30} rx={8} fill="#FFFFFF" stroke={INK} strokeWidth={7} />
  </g>
);

/* glass crack overlay (screen space) */
const Crack: React.FC<{ f: number; start: number; x: number; y: number }> = ({ f, start, x, y }) => {
  const t = f - start;
  if (t < 0) return null;
  const g = E.out(clamp(t / 4));
  const r = rng(51);
  const paths: string[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + r() * 0.4;
    let px = x;
    let py = y;
    let d = `M${px} ${py}`;
    const segs = 5 + Math.floor(r() * 3);
    for (let j = 0; j < segs; j++) {
      a += (r() - 0.5) * 0.5;
      const len = (60 + r() * 140) * g;
      px += Math.cos(a) * len;
      py += Math.sin(a) * len;
      d += `L${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    paths.push(d);
  }
  const rings = [90, 190, 320].map((rr, k) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      if ((i + k) % 3 === 0) continue;
      const a1 = (i / n) * Math.PI * 2 + 0.1;
      const a2 = ((i + 1) / n) * Math.PI * 2 - 0.1;
      const r1 = rr * g * (0.9 + r() * 0.2);
      d += `M${(x + Math.cos(a1) * r1).toFixed(1)} ${(y + Math.sin(a1) * r1).toFixed(1)}L${(x + Math.cos(a2) * r1 * 1.05).toFixed(1)} ${(y + Math.sin(a2) * r1 * 1.05).toFixed(1)}`;
    }
    return d;
  });
  const flash = 1 - clamp(t / 6);
  return (
    <g>
      <circle cx={x} cy={y} r={70 * g} fill="#FFFFFF" opacity={0.5} />
      {[...paths, ...rings].map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={INK} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
          <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      <rect x={0} y={TOP} width={1080} height={FULL_H} fill="#FFFFFF" opacity={flash * 0.8} />
    </g>
  );
};

/* ------------------------------- scene ------------------------------- */
export const JickleScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const faceAt = (ff: number) => {
    const q = poseF(ff);
    const rr = rig(q);
    return toStage(rr.W(rr.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]));
  };
  const contact = faceAt(40);
  const slowmo = seg(f, 24, 30) * (1 - seg(f, 38, 41));
  // ball: incoming 8 -> 40, outgoing 40 -> 50
  let ball: React.ReactNode = null;
  if (f >= 8 && f < 40) {
    const t = (f - 8) / 32;
    const tt = 1 - Math.pow(1 - t, 2.2);
    const x = lerp(170, contact[0], tt);
    const y = lerp(1820, contact[1], tt) - Math.sin(Math.PI * tt) * 420;
    const rr = lerp(120, 30, Math.pow(tt, 0.6));
    ball = <Ball x={x} y={y} r={rr} rot={f * 12} />;
  }
  const outT = clamp((f - 40) / 10);
  const outX = lerp(contact[0], 520, E.in(outT));
  const outY = lerp(contact[1], 1020, E.in(outT));
  const outR = lerp(30, 520, Math.pow(outT, 3));
  const cam: Cam = {
    cx: 540 + kf(f, [[24, 0], [34, (contact[0] - 540) * 0.35, E.inOut], [42, 0, E.out]]),
    cy: kf(f, [[0, 1040], [24, 1040], [34, 900, E.inOut], [42, 1000, E.out], [60, 1000], [135, 990]]),
    z: kf(f, [[0, 1.0], [24, 1.0], [36, 1.22, E.inOut], [41, 0.98, E.out], [52, 1.0], [135, 1.04]]),
    r: kf(f, [[24, 0], [36, -3, E.inOut], [41, 2, E.out], [50, 0]]),
  };
  const s1 = shake(f, 40, 10, 14, 4);
  const s2 = shake(f, 50, 24, 40, 9);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const impact = f === 40 || f === 41;
  const paddleTrail = trail(faceAt, f, 6);
  const tip = toStage(r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1] + 40));
  const mouth = toStage(r.mouth());

  return (
    <Stage impact={impact} overlay={<EndCard f={f} start={84} lines={['JICKLE KING']} pts="+0.5" color="#45B87A" dark="#2A7D52" y={96} />}>
      <GlowDefs />
      <Court f={f} cam={cam} sh={sh} slowmo={slowmo} />
      <g transform={camP(cam, 1, sh)}>
        <Ring x={contact[0]} y={contact[1]} t={seg(f, 40, 52)} r={260} color="#FFFFFF" w={24} />
        <Burst x={contact[0]} y={contact[1]} r={220} t={seg(f, 40, 52)} seed={6} fill="#FFD064" />
        {f >= 38 && f <= 44 ? <Swoosh pts={paddleTrail} width={180} opacity={0.7} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} itemR={<Paddle />} itemBehindR />
        {ball}
        {/* smoke from hot paddle */}
        {f > 60
          ? [0, 1, 2, 3].map((i) => {
              const t = ((f - 60 + i * 9) % 36) / 36;
              const x = tip[0] + Math.sin(t * 6 + i) * 20 * t;
              const y = tip[1] - t * 220;
              return <circle key={i} cx={x} cy={y} r={18 + t * 40} fill="#FFFFFF" stroke="#CAC3D9" strokeWidth={5} opacity={(1 - t) * 0.85 * (1 - seg(f, 110, 125))} />;
            })
          : null}
        {f >= 72 && f < 92
          ? [0, 1, 2].map((i) => {
              const t = clamp((f - 72 - i * 4) / 14);
              if (t <= 0 || t >= 1) return null;
              return <path key={i} d={`M${mouth[0] + 40 + t * 120} ${mouth[1] - 10 - i * 18 + Math.sin(t * 8) * 8} q20 -10 40 0`} fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" opacity={1 - t} />;
            })
          : null}
        <Sparks f={f} start={40} seed={13} n={20} x={contact[0]} y={contact[1]} speed={[14, 30]} size={[12, 24]} />
        <Sfx f={f} start={40} text="POP!" x={contact[0] - 220} y={contact[1] - 60} size={150} rot={-10} fill="#FFD064" dur={22} />
      </g>
      <Net />
      {/* slow-mo vignette */}
      {slowmo > 0 ? (
        <g opacity={slowmo}>
          <FocusLines f={f} cx={contact[0]} cy={contact[1]} r0={360} r1={1700} n={48} color={INK} opacity={0.35} width={14} />
        </g>
      ) : null}
      {/* outgoing fireball (screen space, grows toward camera) */}
      {f >= 40 && f < 50 ? (
        <g>
          {[0.25, 0.5, 0.75].map((k, i) => {
            const kk = clamp(outT - k * 0.35);
            return <circle key={i} cx={lerp(contact[0], outX, kk / Math.max(0.01, outT))} cy={lerp(contact[1], outY, kk / Math.max(0.01, outT))} r={outR * (0.5 + k * 0.4)} fill={['#FFD064', '#F9A246', '#F36659'][i]} opacity={0.55} />;
          })}
          <Glow x={outX} y={outY} r={outR * 2.2} id="glowY" o={0.9} />
          <Ball x={outX} y={outY} r={outR} rot={f * 30} />
        </g>
      ) : null}
      <g opacity={1 - seg(f, 98, 110)}>
        <Crack f={f} start={50} x={520} y={1020} />
      </g>
      <g transform={`translate(${s2.x} ${s2.y})`}>
        <Sfx f={f} start={50} text="CRACK!" x={560} y={520} size={200} rot={-6} fill="#FFFFFF" dur={30} />
      </g>
      <ConfettiRain f={f} start={88} n={50} seed={8} colors={['#45B87A', '#FFD064', '#6967CF', '#FFFFFF', '#F88F4D']} />
    </Stage>
  );
};
