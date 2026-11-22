import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { ap } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, Glint, Stars, ConfettiRain, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng, heartPath } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1930;
const SC = 1.0;

/* ------------------------------- props ------------------------------- */
const Rose: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>
    <path d="M0 20 Q-8 120 4 230" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
    <path d="M0 20 Q-8 120 4 230" fill="none" stroke="#569850" strokeWidth={8} strokeLinecap="round" />
    <path d="M-4 120 Q-60 100 -66 140 Q-30 150 -4 130 Z" fill="#69B661" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <path d="M2 170 Q56 150 64 186 Q30 196 2 180 Z" fill="#69B661" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <g transform="translate(4 250)">
      <path d="M-46 -6 Q-50 40 0 52 Q50 40 46 -6 Q30 18 0 14 Q-30 18 -46 -6 Z" fill="#D23C58" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d="M-40 -10 Q-20 -46 0 -30 Q20 -46 40 -10 Q24 10 0 8 Q-24 10 -40 -10 Z" fill="#F15265" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d="M-18 -8 Q0 -26 18 -8 Q8 4 0 2 Q-8 4 -18 -8 Z" fill="#AD2C44" stroke={INK} strokeWidth={4} />
      <path d="M-30 6 Q-34 30 -10 40" fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      <path d="M-46 -6 Q-30 -10 -20 6" fill="none" stroke="#569850" strokeWidth={0} />
    </g>
  </g>
);

/** Rose held horizontally in the teeth (head space). */
const RoseInTeeth: React.FC<{ turn: number }> = ({ turn }) => (
  <g transform={`translate(${turn * 16 - 10} -66) rotate(-96)`}>
    <Rose s={0.78} />
  </g>
);

const Table: React.FC<{ f: number }> = ({ f }) => {
  const Y = 90;
  const fl = Math.sin(f * 0.9) * 3 + Math.sin(f * 2.3) * 2;
  return (
    <g transform={`translate(0 ${Y})`}>
      <path d="M-40 1450 L1120 1450 L1200 2080 L-120 2080 Z" fill="#FAF7FF" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      <path d="M-40 1450 L1120 1450 L1132 1500 L-52 1500 Z" fill="#EFEAFA" />
      <path d="M380 1450 L700 1450 L807 2080 L273 2080 Z" fill="#D23C58" />
      <path d="M380 1450 L700 1450 L706 1490 L374 1490 Z" fill="#AD2C44" />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d={`M${60 + i * 140} 1500 Q${50 + i * 150} 1700 ${30 + i * 160} 1920 L${15 + i * 167} 2080`} fill="none" stroke="#E4DEF2" strokeWidth={6} />
      ))}
      <line x1={-40} y1={1450} x2={1120} y2={1450} stroke={INK} strokeWidth={9} />
      {/* candle */}
      <g transform="translate(250 1450)">
        <rect x={-26} y={-150} width={52} height={150} rx={10} fill="#F8F5FF" stroke={INK} strokeWidth={7} />
        <path d="M-26 -150 Q0 -138 26 -150" fill="none" stroke="#DDD6EE" strokeWidth={6} />
        <line x1={0} y1={-150} x2={0} y2={-170} stroke={INK} strokeWidth={5} />
        <Glow x={0} y={-200} r={160} id="glowY" o={0.85} />
        <path d={`M0 ${-240 + fl} Q22 -194 0 -172 Q-22 -194 0 ${-240 + fl} Z`} fill="#F9B248" stroke={INK} strokeWidth={5} />
        <path d={`M0 ${-214 + fl * 0.5} Q10 -190 0 -178 Q-10 -190 0 ${-214 + fl * 0.5} Z`} fill="#FFF0B7" />
      </g>
      {/* wine glass */}
      <g transform="translate(860 1450)">
        <path d="M-50 -230 Q-54 -150 0 -132 Q54 -150 50 -230 Z" fill="#FFFFFF" fillOpacity={0.35} stroke={INK} strokeWidth={7} />
        <path d="M-46 -190 Q-48 -150 0 -138 Q48 -150 46 -190 Z" fill="#AD2C44" />
        <line x1={0} y1={-132} x2={0} y2={-20} stroke={INK} strokeWidth={9} />
        <ellipse cx={0} cy={-12} rx={40} ry={12} fill="#FFFFFF" stroke={INK} strokeWidth={7} />
        <path d="M-34 -220 Q-38 -180 -24 -160" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
      </g>
    </g>
  );
};

const Firework: React.FC<{ f: number; start: number; x: number; y: number; color: string; s?: number }> = ({ f, start, x, y, color, s = 1 }) => {
  const t = f - start;
  if (t < -12 || t > 40) return null;
  if (t < 0) {
    // rocket rising
    const k = (t + 12) / 12;
    const ry = lerp(1500, y, E.out(k));
    return (
      <g>
        <line x1={x} y1={ry + 90} x2={x} y2={ry} stroke="#FEE6BB" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
        <circle cx={x} cy={ry} r={8} fill="#FFFFFF" />
      </g>
    );
  }
  const k = E.out(clamp(t / 18));
  const fade = 1 - seg(t, 18, 40);
  const n = 26;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // heart curve
    const hx = 16 * Math.pow(Math.sin(a), 3);
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    const px = x + hx * 11 * s * k;
    const py = y + hy * 11 * s * k + t * t * 0.06;
    pts.push(
      <g key={i}>
        <line x1={x + hx * 11 * s * k * 0.7} y1={y + hy * 11 * s * k * 0.7 + t * t * 0.05} x2={px} y2={py} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.6 * fade} />
        <circle cx={px} cy={py} r={9 * s} fill="#FFFFFF" opacity={fade} />
        <circle cx={px} cy={py} r={14 * s} fill={color} opacity={0.5 * fade} />
      </g>,
    );
  }
  return (
    <g>
      <Glow x={x} y={y} r={260 * s * k} id="glowP" o={0.6 * fade} />
      {pts}
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const HIDE: Partial<Pose> = {
  shL: 22, elL: -64, shR: 22, elR: -64, armZL: 'back', armZR: 'back', handL: 'fist', handR: 'fist',
  turn: 0.22, lookX: 0.35, lid: 0.35, smile: 0.8, mouthSkew: 0.7, brow: 0.6, browTilt: -0.2, torso: -2,
  hipL: 6, hipR: 6,
};
const PRESENT: Partial<Pose> = {
  shR: 30, elR: 108, wrR: 30, uaR: 0.84, handR: 'fist', armZR: 'mid',
  shL: 34, elL: -128, wrL: 10, handL: 'open', armZL: 'mid',
  turn: 0.1, lookX: 0, head: 6, lid: 0.15, smile: 1, mouthOpen: 0.2, mouthSkew: 0.3, brow: 0.9, browTilt: 0, torso: 3, chestS: 1.03,
};
const SWOON: Partial<Pose> = {
  shR: 26, elR: 124, wrR: 18, uaR: 0.9, shL: 30, elL: -130, wrL: 0,
  head: -10, turn: -0.1, eyeMode: 'heart', blush: 1, mouthOpen: 0.5, smile: 1, mouthSkew: 0, brow: 1, lid: 0, torso: -3,
};
const TANGO: Partial<Pose> = {
  shL: 96, elL: 104, wrL: -14, flexL: 1, shR: 96, elR: 104, wrR: -14, flexR: 1, handL: 'fist', handR: 'fist', uaR: 1,
  chestS: 1.08, head: 0, turn: 0.18, lookX: 0.5, eyeMode: 'normal', lid: 0.22, blush: 0.6,
  mouthMode: 'grit', mouthOpen: 0, smile: 0.6, brow: 0.9, browTilt: 0, torso: 0,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: HIDE },
  { f: 4, p: { brow: 1.1 }, e: E.out },
  { f: 7, p: { brow: 0.3 }, e: E.in },
  { f: 10, p: { brow: 1.1 }, e: E.out },
  { f: 13, p: { brow: 0.4 }, e: E.in },
  { f: 16, p: { ...PRESENT, sy: 1.04 }, e: E.out },
  { f: 22, p: { sy: 1 }, e: E.inOut },
  { f: 30, p: { wink: 1 }, e: E.out },
  { f: 36, p: { wink: 0 }, e: E.inOut },
  { f: 46, p: SWOON, e: E.inOut },
  { f: 66, p: { head: 8, turn: 0.1 }, e: E.inOut },
  { f: 72, p: { ...TANGO, sy: 0.95 }, e: E.out },
  { f: 77, p: { sy: 1.03 }, e: E.out },
  { f: 82, p: { sy: 1 }, e: E.inOut },
  { f: 104, p: { lid: 0.3, turn: 0.1, lookX: 0.1 }, e: E.inOut },
  { f: 116, p: { wink: 1 }, e: E.out },
  { f: 126, p: { wink: 1 } },
  { f: 130, p: { wink: 0 }, e: E.out },
  { f: 160, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  const sway = Math.sin(f / 14) * 2;
  // heartbeat chest pump between 28 and 66
  const beat = f > 26 && f < 70 ? heartbeat(f) : 0;
  return plant({ ...p, torso: p.torso + sway * 0.5, chestS: p.chestS + beat * 0.04 });
};

/** "ba-dum" double thump, period 16 frames */
const heartbeat = (f: number) => {
  const t = (f % 16) / 16;
  return Math.exp(-Math.pow((t - 0.1) / 0.05, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.32) / 0.05, 2));
};

/* ------------------------------- scene ------------------------------- */
export const DateScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const roseInHand = f >= 14 && f < 70;
  const roseInMouth = f >= 70;
  const mouth = toStage(r.mouth());
  const beat = f > 26 && f < 70 ? heartbeat(f) : 0;
  const heartGrow = seg(f, 26, 32) * (1 - seg(f, 66, 72));
  const heartPos = ap(r.torso, 62, -206);
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1180], [16, 1120, E.out], [46, 1080, E.inOut], [72, 1040, E.out], [150, 1020]]),
    z: kf(f, [[0, 1.12], [16, 1.05, E.out], [46, 1.1, E.inOut], [70, 1.1], [74, 0.98, E.out], [150, 1.02]]),
    r: kf(f, [[40, 0], [56, -2, E.inOut], [72, 0, E.inOut]]),
  };
  const s1 = shake(f, 72, 14, 12, 3);
  const sh = { x: s1.x, y: s1.y, r: s1.r };
  const rr = rng(4);

  return (
    <Stage bg="#2B215A" overlay={<EndCard f={f} start={96} lines={['DATE NIGHT']} pts="+4" color="#EE5982" dark="#A83560" light="#FBD3E2" y={96} />}>
      <GlowDefs />
      <defs>
        <linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B215A" />
          <stop offset="0.45" stopColor="#773388" />
          <stop offset="0.75" stopColor="#D55D8E" />
          <stop offset="1" stopColor="#F99E6C" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.3, sh)}>
        <rect x={-600} y={-500} width={2280} height={2600} fill="url(#dSky)" />
        <Stars f={f} n={60} seed={7} area={[-200, -100, 1480, 800]} />
        <Glow x={820} y={360} r={260} id="glowW" o={0.5} />
        <circle cx={820} cy={360} r={90} fill="#FEF4D9" stroke="#FEE6BB" strokeWidth={8} />
        <circle cx={858} cy={336} r={86} fill="#582E7D" opacity={0.92} />
      </g>
      <g transform={camP(cam, 0.6, sh)}>
        {/* city skyline */}
        {Array.from({ length: 14 }).map((_, i) => {
          const w = 70 + rr() * 60;
          const h = 160 + rr() * 260;
          const x = -120 + i * 95;
          return (
            <g key={i}>
              <rect x={x} y={1300 - h} width={w} height={h + 200} fill="#39276C" stroke="#241847" strokeWidth={5} />
              {Array.from({ length: Math.floor(h / 50) }).map((_, j) =>
                rr() > 0.45 ? <rect key={j} x={x + 14 + (j % 2) * 26} y={1300 - h + 20 + j * 44} width={16} height={22} fill="#FED18B" opacity={0.85} /> : null,
              )}
            </g>
          );
        })}
      </g>
      <g transform={camP(cam, 0.85, sh)}>
        <Firework f={f} start={76} x={300} y={520} color="#EE5982" s={1.1} />
        <Firework f={f} start={86} x={800} y={640} color="#F9B248" s={0.9} />
        <Firework f={f} start={100} x={520} y={420} color="#A98BFF" s={1.2} />
        {/* string lights */}
        {[0, 1].map((k) => {
          const y0 = 620 + k * 120;
          const sag = 140 + Math.sin(f / 18 + k) * 10;
          const pts = Array.from({ length: 12 }).map((_, i) => {
            const t = i / 11;
            return [-80 + t * 1240, y0 + sag * 4 * t * (1 - t) - k * 40] as [number, number];
          });
          return (
            <g key={k}>
              <path d={`M${pts.map((q) => q.join(' ')).join(' L')}`} fill="none" stroke="#241847" strokeWidth={5} />
              {pts.map(([x, y], i) => {
                const on = 0.7 + 0.3 * Math.sin(f / 4 + i * 1.7 + k);
                return (
                  <g key={i}>
                    <Glow x={x} y={y + 18} r={44} id="glowY" o={0.6 * on} />
                    <ellipse cx={x} cy={y + 18} rx={11} ry={15} fill="#FFDE9A" stroke="#241847" strokeWidth={4} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Glow x={GX} y={1200} r={600} id="glowP" o={seg(f, 40, 60) * 0.5} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          itemR={roseInHand ? <g transform={`translate(0 30) scale(${f < 20 ? E.back(seg(f, 14, 20)) : 1})`}><Rose /></g> : undefined}
          itemBehindR
          headExtra={roseInMouth ? <RoseInTeeth turn={p.turn} /> : undefined}
          between={
            heartGrow > 0 ? (
              <g transform={`translate(${heartPos[0]} ${heartPos[1]}) scale(${heartGrow * (0.9 + beat * 0.55)})`}>
                <path d={heartPath(0, 0, 70)} fill={C.heart} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
                <ellipse cx={-26} cy={-20} rx={16} ry={10} fill="#FFFFFF" opacity={0.7} transform="rotate(-30 -26 -20)" />
                {beat > 0.4
                  ? [-1, 1].map((sd) => (
                      <g key={sd} stroke={INK} strokeWidth={7} strokeLinecap="round">
                        <line x1={sd * 92} y1={-40} x2={sd * 122} y2={-60} />
                        <line x1={sd * 98} y1={0} x2={sd * 134} y2={0} />
                        <line x1={sd * 92} y1={40} x2={sd * 122} y2={60} />
                      </g>
                    ))
                  : null}
              </g>
            ) : undefined
          }
        />
        {/* floating hearts */}
        {f > 40
          ? Array.from({ length: 10 }).map((_, i) => {
              const t = ((f - 40 + i * 9) % 60) / 60;
              const x = 160 + ((i * 97) % 760) + Math.sin(t * 6 + i) * 30;
              const y = 1420 - t * 900;
              const s = 0.6 + ((i * 37) % 10) / 20;
              return <path key={i} d={heartPath(x, y, 30 * s)} fill={i % 2 ? '#EE5982' : '#F484A9'} stroke={INK} strokeWidth={5} opacity={Math.sin(Math.PI * t) * (1 - seg(f, 120, 140))} />;
            })
          : null}
        <Glint x={mouth[0] + 50} y={mouth[1] - 6} s={1.2} t={seg(f, 22, 34)} />
        <Twinkle x={toStage(r.W(r.aR.wrist, 0, 280))[0]} y={toStage(r.W(r.aR.wrist, 0, 280))[1]} s={1.1} t={seg(f, 15, 27)} color="#FFD064" />
        <Sfx f={f} start={28} text="BA-DUM!" x={250} y={1000} size={110} rot={-10} fill="#F484A9" dur={18} />
        <Sfx f={f} start={44} text="BA-DUM!" x={820} y={940} size={120} rot={8} fill="#F484A9" dur={18} />
        <Sfx f={f} start={22} text="ting!" x={mouth[0] + 180} y={mouth[1] - 100} size={80} rot={-6} fill="#FFFFFF" dur={16} />
      </g>
      <Table f={f} />
      <ConfettiRain f={f} start={98} n={70} seed={21} hearts colors={['#EE5982', '#F9B248', '#FFFFFF', '#A98BFF', '#F484A9']} />
    </Stage>
  );
};
