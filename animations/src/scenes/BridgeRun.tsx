// Run #9: "SUNRISE MILES" - crossing the big suspension bridge at dawn. The stone tower and the
// rising sun fall away behind him; he finishes with both arms up as the sun clears the arch.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, VICTORY } from './RunKit';
import { CityWorld, CITY, P, ZMIN, ZFAR } from './CityKit';
import { INK } from './kit';

const GX = 540;
const FIST = 56;
const SKID = 74;
const POSE = 82;
const CARD = 96;
const RUN = makeRun(
  [[0, 0.14], [SKID - 4, 0.16], [SKID + 6, 0.02, E.out], [SKID + 10, 0, E.out]],
  [[0, 12], [SKID, 11], [SKID + 6, 14, E.out]],
  [SKID + 2, SKID + 8],
);
const TOWER_S = 3.6;
const DECK = 1.62;
const CAB_X = 1.95;
const SPAN = 15;
const theme = CITY.dawn;

const quad = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`;
/** main cable height at depth z (tower at zt) */
const cableH = (z: number, zt: number) => {
  const d = Math.abs(z - zt);
  return 10.6 - 9.2 * (1 - Math.pow(1 - Math.min(1, d / SPAN), 2));
};

/** Everything on the bridge between depths za..zb (drawn twice: beyond the tower, then in front of it). */
const BridgePart: React.FC<{ za: number; zb: number; D: number; zt: number }> = ({ za, zb, D, zt }) => {
  const a = Math.max(ZMIN, za);
  const b = Math.min(ZFAR, zb);
  if (b <= a) return null;
  const items: React.ReactNode[] = [];
  // deck
  items.push(<path key="deck" d={quad([P(-DECK, a), P(DECK, a), P(DECK, b), P(-DECK, b)])} fill={theme.road} />);
  // walkway strips + barrier walls
  for (const sd of [-1, 1]) {
    items.push(<path key={`walk${sd}`} d={quad([P(sd * 1.2, a), P(sd * DECK, a), P(sd * DECK, b), P(sd * 1.2, b)])} fill={theme.walk} />);
    items.push(<path key={`wall${sd}`} d={quad([P(sd * DECK, a), P(sd * DECK, b), P(sd * DECK, b, 0.32), P(sd * DECK, a, 0.32)])} fill="#C9A7C0" stroke={INK} strokeWidth={4} />);
  }
  // lane dashes
  const dp = 2.4;
  for (let i = -2; i < 30; i++) {
    const z0 = i * dp + (D % dp);
    const z1 = z0 + 1.1;
    if (z1 < a || z0 > b) continue;
    const q0 = Math.max(a, z0);
    const q1 = Math.min(b, z1);
    items.push(<path key={`d${i}`} d={quad([P(-0.05, q0), P(0.05, q0), P(0.05, q1), P(-0.05, q1)])} fill={theme.lane} opacity={0.85} />);
  }
  // suspenders + railing posts
  const sp = 0.8;
  for (let i = -4; i < 60; i++) {
    const z = i * sp + (D % sp);
    if (z < a || z > b) continue;
    for (const sd of [-1, 1]) {
      const bot = P(sd * CAB_X, z, 0.32);
      const top = P(sd * CAB_X, z, cableH(z, zt));
      items.push(<line key={`s${i}${sd}`} x1={bot.x} y1={bot.y} x2={top.x} y2={top.y} stroke="#6D5A8E" strokeWidth={Math.min(9, 20 / z)} />);
      const pb = P(sd * 1.75, z, 0.32);
      const pt = P(sd * 1.75, z, 1.05);
      items.push(<line key={`p${i}${sd}`} x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y} stroke={INK} strokeWidth={Math.min(10, 26 / z)} />);
    }
  }
  // top rails
  for (const sd of [-1, 1]) {
    const r0 = P(sd * 1.75, a, 1.05);
    const r1 = P(sd * 1.75, b, 1.05);
    items.push(<line key={`rail${sd}`} x1={r0.x} y1={r0.y} x2={r1.x} y2={r1.y} stroke={INK} strokeWidth={Math.min(14, 30 / a)} strokeLinecap="round" />);
    items.push(<line key={`rail2${sd}`} x1={r0.x} y1={r0.y} x2={r1.x} y2={r1.y} stroke="#F2D9E6" strokeWidth={Math.min(7, 16 / a)} strokeLinecap="round" />);
    // main cable
    const pts: string[] = [];
    for (let k = 0; k <= 40; k++) {
      const z = a + ((b - a) * k) / 40;
      const p = P(sd * CAB_X, z, cableH(z, zt));
      pts.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    items.push(<path key={`cab${sd}`} d={`M${pts.join('L')}`} fill="none" stroke={INK} strokeWidth={Math.min(26, 60 / a)} strokeLinecap="round" />);
    items.push(<path key={`cab2${sd}`} d={`M${pts.join('L')}`} fill="none" stroke="#9B86C2" strokeWidth={Math.min(14, 34 / a)} strokeLinecap="round" />);
  }
  return <g>{items}</g>;
};

/** Gothic stone tower facing the camera at depth z (world px: 700 per unit). */
const Tower: React.FC<{ z: number; f: number }> = ({ z, f }) => {
  const g = P(0, z);
  const leg = (sd: number) => {
    const x0 = sd * 1.75 * 700;
    const x1 = sd * 3.0 * 700;
    return (
      <g key={sd}>
        <path d={`M${x0} 0 L${x1} 0 L${x1 * 0.97} -7700 L${x0} -7700 Z`} fill="#E7B9A8" stroke={INK} strokeWidth={34} strokeLinejoin="round" />
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={i} x1={x0} y1={-700 - i * 700} x2={x1 * (1 - i * 0.003)} y2={-700 - i * 700} stroke="#C9928A" strokeWidth={18} />
        ))}
        <path d={`M${sd * 2.1 * 700} -5200 L${sd * 2.1 * 700} -6200 Q${sd * 2.375 * 700} -6600 ${sd * 2.65 * 700} -6200 L${sd * 2.65 * 700} -5200 Z`} fill="#7C5F96" stroke={INK} strokeWidth={26} />
      </g>
    );
  };
  return (
    <g transform={`translate(${g.x} ${g.y}) scale(${1 / z})`}>
      {leg(-1)}
      {leg(1)}
      {/* upper span + gothic arch */}
      <path d={`M${-1.75 * 700} -4700 Q${-1.75 * 700} -6000 0 -6500 Q${1.75 * 700} -6000 ${1.75 * 700} -4700 L${1.75 * 700} -7700 L${-1.75 * 700} -7700 Z`} fill="#E7B9A8" stroke={INK} strokeWidth={34} strokeLinejoin="round" />
      <path d={`M${-3.1 * 700} -7700 L${3.1 * 700} -7700 L${3.0 * 700} -8000 L${-3.0 * 700} -8000 Z`} fill="#D59C93" stroke={INK} strokeWidth={34} strokeLinejoin="round" />
      <path d={`M${-1.75 * 700} -4700 Q${-1.75 * 700} -6000 0 -6500 Q${1.75 * 700} -6000 ${1.75 * 700} -4700`} fill="none" stroke="#C9928A" strokeWidth={60} />
      {/* banner on the tower */}
      <g transform="translate(0 -7150)">
        <rect x={-1100} y={-260} width={2200} height={520} rx={70} fill="#7254DC" stroke={INK} strokeWidth={30} />
        <text x={0} y={30} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={360} fill="#FFFFFF" stroke={INK} strokeWidth={20} paintOrder="stroke">
          MILE {Math.min(3, 1 + Math.floor(f / 50))}
        </text>
      </g>
    </g>
  );
};

const Gulls: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {[0, 1, 2, 3].map((i) => {
      const x = ((i * 300 + f * (3 + i)) % 1500) - 200;
      const y = 300 + i * 70 + Math.sin(f / 9 + i) * 20;
      const w = Math.sin(f / 3 + i) * 12;
      return <path key={i} d={`M${x - 40} ${y - w} Q${x - 20} ${y - 22} ${x} ${y} Q${x + 20} ${y - 22} ${x + 40} ${y - w}`} fill="none" stroke="#5B4A7A" strokeWidth={8} strokeLinecap="round" />;
    })}
  </g>
);

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const g = gait(ph, 0);
  if (f < SKID) {
    // fists up for a couple of strides when the sun clears the tower
    const up = seg(f, FIST, FIST + 4) * (1 - seg(f, SKID - 6, SKID - 2));
    return plant(
      {
        ...BASE,
        ...g,
        shL: (g.shL ?? 0) * (1 - up) + 150 * up,
        elL: (g.elL ?? 0) * (1 - up) - 20 * up,
        uaL: (g.uaL ?? 1) * (1 - up) + up,
        faL: (g.faL ?? 1) * (1 - up) + up,
        mouthMode: 'grin',
        mouthOpen: 0.4 + 0.5 * up,
        smile: 1,
        brow: 0.4 + 0.5 * up,
        browTilt: 0,
        lid: 0.1,
        eyeMode: up > 0.5 ? 'star' : 'normal',
        sweat: 0.3,
      },
      runLift(ph),
    );
  }
  const keys: Key<Pose>[] = [
    { f: SKID, p: { ...BASE, ...g } },
    { f: SKID + 5, p: STOP, e: E.out },
    { f: POSE - 2, p: { sy: 0.9, sx: 1.07 }, e: E.inOut },
    { f: POSE + 2, p: { ...VICTORY, sy: 1.07, sx: 0.95, handL: 'fist', handR: 'fist', eyeMode: 'star' }, e: E.out },
    { f: POSE + 6, p: { sy: 0.98, sx: 1.02 }, e: E.inOut },
    { f: POSE + 10, p: { sy: 1, sx: 1, eyeMode: 'normal' }, e: E.inOut },
    { f: 98, p: { wink: 1, mouthSkew: 0.5, turn: 0.2, lookX: 0.5 }, e: E.inOut },
    { f: 110, p: { wink: 0, mouthSkew: 0, turn: 0.05, lookX: 0 } },
    { f: 150, p: {} },
  ];
  return plant(poseAt(f, BASE, keys));
};

export const BridgeRunScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const zt = TOWER_S + D;
  const scale = kf(f, [[0, 0.9], [SKID, 0.9], [POSE + 6, 0.98, E.out]]);
  const GY = kf(f, [[0, 1640], [SKID, 1640], [POSE + 6, 1700, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 900], [40, 960, E.inOut], [SKID, 1000], [POSE + 6, 1040, E.inOut], [CARD + 6, 960, E.inOut]]),
    z: kf(f, [[0, 0.92], [40, 1.0, E.inOut], [SKID, 1.02], [POSE + 6, 1.04, E.out], [CARD + 6, 1.0, E.inOut]]),
  };
  const s2 = shake(f, SKID, 10, 12, 2);
  const sh = { x: s2.x, y: s2.y, r: 0 };
  const sunY = kf(f, [[0, 690], [140, 440, E.inOut]]);
  const sunGlow = kf(f, [[0, 0.5], [FIST, 0.8], [POSE, 1]]);

  const bridge = (
    <g>
      {/* the sun sits between the far city and the bridge so the skyline never hides it */}
      <circle cx={540} cy={sunY} r={380} fill="#FFE1A6" opacity={0.3 * sunGlow} />
      <circle cx={540} cy={sunY} r={220} fill="#FFD08A" opacity={0.55} />
      <circle cx={540} cy={sunY} r={140} fill="#FFB25C" stroke="#F28A3D" strokeWidth={8} />
      <BridgePart za={zt} zb={ZFAR} D={D} zt={zt} />
      <Tower z={zt} f={f} />
      <BridgePart za={ZMIN} zb={zt} D={D} zt={zt} />
    </g>
  );
  const sky = (
    <g>
      <Gulls f={f} />
    </g>
  );

  return (
    <Stage impact={false} overlay={<EndCard f={f} start={CARD} lines={['SUNRISE MILES']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <CityWorld f={f} D={D} cam={cam} sh={sh} theme={{ ...theme, sun: null }} seed={41} bridgeMode bridge={bridge} skyExtra={sky} />
      <g transform={camP(cam, 1, sh)}>
        <Glow x={540} y={chest[1]} r={kf(f, [[POSE - 1, 0], [POSE + 3, 560, E.out], [POSE + 24, 380]])} id="glowY" o={seg(f, POSE - 1, POSE + 1) * 0.8} />
        <Burst x={540} y={chest[1]} r={440} t={seg(f, POSE, POSE + 17)} seed={42} />
        <Hero p={p} x={GX} y={GY} scale={scale} />
        <Dust f={f} start={SKID} x={540} y={GY} n={8} spread={380} size={60} seed={63} />
        <Sparks f={f} start={POSE} seed={64} n={22} x={540} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 100, 114)} />
        <Sfx f={f} start={10} text="huff... puff..." x={280} y={1180} size={80} rot={-8} fill="#FFFFFF" dur={16} />
        <Sfx f={f} start={FIST} text="GOOD MORNING!" x={540} y={760} size={120} rot={-5} fill="#FFD064" dur={20} />
        <Sfx f={f} start={SKID} text="SKRRT!" x={820} y={GY - 160} size={120} rot={10} fill="#FFFFFF" dur={14} />
      </g>
      <ConfettiRain f={f} start={CARD + 2} n={56} seed={43} />
    </Stage>
  );
};
