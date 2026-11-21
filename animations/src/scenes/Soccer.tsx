import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Cloud, Sfx, GlowDefs, Burst, Sparks, Dust, ConfettiRain, Ring, FocusLines } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';

const INK = C.ink;
const GOAL = { x0: 640, x1: 1010, top: 700, bot: 900 };
const NETHIT: [number, number] = [860, 790];

/* ------------------------------- ball ------------------------------- */
const SoccerBall: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const pent = (cx: number, cy: number, s: number) => {
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = ((i * 72 - 90) * Math.PI) / 180;
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * s).toFixed(1)} ${(cy + Math.sin(a) * s).toFixed(1)}`;
    }
    return d + 'Z';
  };
  const id = `sb${Math.round(r * 10)}`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <defs>
        <clipPath id={id}>
          <circle r={r} />
        </clipPath>
      </defs>
      <circle r={r} fill="#FFFFFF" />
      <g clipPath={`url(#${id})`}>
        <path d={pent(0, 0, r * 0.36)} fill={INK} />
        {[0, 72, 144, 216, 288].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return <path key={a} d={pent(Math.cos(rad) * r * 0.95, Math.sin(rad) * r * 0.95, r * 0.3)} fill={INK} />;
        })}
        {[0, 72, 144, 216, 288].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return <line key={'l' + a} x1={Math.cos(rad) * r * 0.36} y1={Math.sin(rad) * r * 0.36} x2={Math.cos(rad) * r * 0.66} y2={Math.sin(rad) * r * 0.66} stroke={INK} strokeWidth={r * 0.06} />;
        })}
        <circle cx={r * 0.3} cy={r * 0.35} r={r} fill="#000" opacity={0.1} />
      </g>
      <circle r={r} fill="none" stroke={INK} strokeWidth={r * 0.12} />
      <ellipse cx={-r * 0.4} cy={-r * 0.42} rx={r * 0.22} ry={r * 0.13} fill="#FFFFFF" opacity={0.9} transform={`rotate(-35 ${-r * 0.4} ${-r * 0.42})`} />
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const TRACK: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -16, knR: -16, thL: 0.94, thR: 0.94, ftL: 4, ftR: 4,
  shL: 40, elL: 30, shR: 30, elR: 20, handL: 'open', handR: 'open',
  lookY: -0.7, lookX: -0.7, turn: -0.25, head: -6, lid: 0.2, brow: 0.4, browTilt: -0.4, smile: 0.9,
};
const CROUCH: Partial<Pose> = {
  hipL: 20, hipR: 20, knL: -40, knR: -40, thL: 0.78, thR: 0.78, torsoSy: 0.92, sy: 0.92, sx: 1.04,
  shL: 60, elL: 20, shR: 60, elR: 20, lookY: -0.9, lookX: -0.2, turn: -0.1, lid: 0.4, browTilt: -1, mouthMode: 'grit',
};
const FLIP: Partial<Pose> = {
  hipL: 34, knL: -96, thL: 0.8, hipR: -4, knR: 0, thR: 1.06, shinR: 1.06, ftL: 20, ftR: 30,
  shL: 110, elL: 40, shR: 96, elR: -30, torsoSy: 1, sy: 1, sx: 1,
  lookY: -0.3, lookX: 0.8, turn: 0.2, lid: 0.3, browTilt: -0.8, mouthMode: 'grin', mouthOpen: 0.5, smile: 0.6,
};
const LANDING: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -40, knR: -40, thL: 0.8, thR: 0.8, shinR: 1, ftL: 6, ftR: 6, torsoSy: 0.9, sy: 0.86, sx: 1.1,
  shL: 80, shR: 80, elL: 20, elR: 20, lookY: 0, lookX: 0, turn: 0, lid: 0, mouthOpen: 0.4,
};
const SLIDE: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -20, knR: -20, thL: 0.62, thR: 0.62, shinL: 1, shinR: 1, ftL: 30, ftR: 30, kneel: 1,
  torsoSy: 1.02, sy: 1, sx: 1, chestS: 1.06,
  shL: 118, shR: 118, elL: -6, elR: -6, handL: 'fist', handR: 'fist', flexL: 0.9, flexR: 0.9,
  head: 0, lookY: -0.5, lookX: 0, turn: 0, eyes: 1, mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1,
};

const rotAt = (f: number) => kf(f, [[0, 0], [17, 0], [26, -150, E.out], [36, -250, E.inOut], [44, -360, E.in], [150, -360]]);
const liftAt = (f: number) => kf(f, [[0, 0], [17, 0], [24, 420, E.out], [30, 440], [44, 0, E.in], [150, 0]]);

const KEYS: Key<Pose>[] = [
  { f: 0, p: TRACK },
  { f: 8, p: { lookX: -0.4, turn: -0.15 } },
  { f: 14, p: CROUCH, e: E.inOut },
  { f: 18, p: { ...FLIP, hipR: 30, knR: -30 }, e: E.out },
  { f: 26, p: FLIP, e: E.in },
  { f: 34, p: { hipR: 20, knR: -40, hipL: 20, knL: -40, thR: 0.8, shinR: 1, shL: 140, shR: 140 }, e: E.inOut },
  { f: 44, p: LANDING, e: E.in },
  { f: 50, p: { sy: 1.04, sx: 0.97, torsoSy: 1, knL: -10, knR: -10, thL: 0.95, thR: 0.95, mouthOpen: 0.8, eyes: 1, brow: 1 }, e: E.out },
  { f: 58, p: SLIDE, e: E.inOut },
  { f: 150, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  const rot = rotAt(f);
  if (f > 17 && f < 44) return { ...p, rot, y: -liftAt(f) };
  const q = plant({ ...p, rot: rot % 360 === 0 ? 0 : rot });
  const shout = f > 58 ? Math.sin((f - 58) / 3) * 0.04 : 0;
  return { ...q, mouthOpen: Math.min(1, q.mouthOpen + shout), head: q.head + (f > 58 ? Math.sin((f - 58) / 6) * 3 : 0) };
};

/* ------------------------------- background ------------------------------- */
const Stadium: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number }; cheer: number }> = ({ f, cam, sh, cheer }) => {
  const r = rng(23);
  const crowd = [];
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i < 22; i++) {
      const x = -60 + i * 56 + (row % 2) * 28 + r() * 8;
      const y = 480 + row * 58;
      const ph = r() * 6.28;
      const jump = (Math.max(0, Math.sin(f / 3 + ph)) * 8 + cheer * Math.max(0, Math.sin(f / 2.2 + ph)) * 22);
      const col = ['#F15F75', '#6A5BE0', '#FFD064', '#6ACC86', '#A98BFF', '#F88F4D', '#FFFFFF'][Math.floor(r() * 7)];
      const skin = ['#FFB784', '#C58C65', '#875C3F', '#FCD4B5'][Math.floor(r() * 4)];
      crowd.push(
        <g key={`${row}-${i}`} transform={`translate(${x} ${y - jump})`}>
          <rect x={-22} y={0} width={44} height={60} rx={14} fill={col} stroke={INK} strokeWidth={4} />
          <circle cx={0} cy={-8} r={16} fill={skin} stroke={INK} strokeWidth={4} />
          {cheer > 0.3 && (i + row) % 3 === 0 ? (
            <path d="M-20 8 L-30 -30 M20 8 L30 -30" stroke={skin} strokeWidth={9} strokeLinecap="round" />
          ) : null}
        </g>,
      );
    }
  }
  return (
    <>
      <defs>
        <linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#85B4FE" />
          <stop offset="1" stopColor="#CFECFC" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.3, sh)}>
        <rect x={-600} y={-600} width={2280} height={1300} fill="url(#sSky)" />
        {[0, 1, 2].map((i) => (
          <Cloud key={i} x={((i * 430 + f * 0.7) % 1500) - 200} y={170 + (i % 2) * 120} w={300} h={120} seed={i + 21} />
        ))}
      </g>
      <g transform={camP(cam, 0.75, sh)}>
        {/* light towers */}
        {[60, 1020].map((x) => (
          <g key={x}>
            <rect x={x - 8} y={180} width={16} height={300} fill="#A3A2B9" stroke={INK} strokeWidth={5} />
            <rect x={x - 70} y={130} width={140} height={70} rx={10} fill="#F0EBFB" stroke={INK} strokeWidth={6} />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={x - 40 + k * 40} cy={165} r={14} fill="#FFF0B7" stroke={INK} strokeWidth={4} />
            ))}
          </g>
        ))}
        <rect x={-400} y={440} width={1880} height={340} fill="#7254DC" stroke={INK} strokeWidth={8} />
        {crowd}
        <rect x={-400} y={740} width={1880} height={50} fill="#FFFFFF" stroke={INK} strokeWidth={7} />
        {['WINTER ARC', 'NO EXCUSES'].map((t, i) => (
          <text key={i} x={20 + i * 330} y={775} fontFamily="Luckiest Guy" fontSize={38} fill="#7254DC">{t}</text>
        ))}
      </g>
      <g transform={camP(cam, 1, sh)}>
        {/* field with mowed stripes in perspective */}
        <rect x={-500} y={790} width={2080} height={1500} fill="#69B661" />
        {Array.from({ length: 12 }).map((_, i) => {
          const y0 = 790 + Math.pow(i / 12, 1.6) * 1300;
          const y1 = 790 + Math.pow((i + 0.5) / 12, 1.6) * 1300;
          return <rect key={i} x={-500} y={y0} width={2080} height={y1 - y0} fill="#77C473" />;
        })}
        <path d="M-200 1050 L1280 1050" stroke="#FFFFFF" strokeWidth={10} />
        <path d="M200 790 L130 1050 M880 790 L950 1050" stroke="#FFFFFF" strokeWidth={10} />
        <ellipse cx={540} cy={1500} rx={300} ry={90} fill="none" stroke="#FFFFFF" strokeWidth={10} opacity={0.8} />
      </g>
    </>
  );
};

const Goal: React.FC<{ f: number; hit: number }> = ({ f, hit }) => {
  // net ripple after hit
  const t = f - hit;
  const amp = t >= 0 ? 26 * Math.exp(-t * 0.12) : 0;
  const disp = (x: number, y: number): [number, number] => {
    if (amp <= 0) return [x, y];
    const dx = x - NETHIT[0];
    const dy = y - NETHIT[1];
    const d = Math.hypot(dx, dy);
    const k = Math.sin(d / 18 - t * 1.2) * amp * Math.exp(-d / 160);
    return [x + (dx / (d || 1)) * k, y + (dy / (d || 1)) * k];
  };
  const lines: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const x = GOAL.x0 + 14 + ((GOAL.x1 - GOAL.x0 - 28) * i) / 14;
    let d = '';
    for (let j = 0; j <= 10; j++) {
      const y = GOAL.top + 14 + ((GOAL.bot - GOAL.top - 14) * j) / 10;
      const [px, py] = disp(x, y);
      d += `${j ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    lines.push(d);
  }
  for (let j = 0; j <= 10; j++) {
    const y = GOAL.top + 14 + ((GOAL.bot - GOAL.top - 14) * j) / 10;
    let d = '';
    for (let i = 0; i <= 14; i++) {
      const x = GOAL.x0 + 14 + ((GOAL.x1 - GOAL.x0 - 28) * i) / 14;
      const [px, py] = disp(x, y);
      d += `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    lines.push(d);
  }
  return (
    <g>
      <rect x={GOAL.x0} y={GOAL.top} width={GOAL.x1 - GOAL.x0} height={GOAL.bot - GOAL.top} fill="#FFFFFF" opacity={0.25} />
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#FFFFFF" strokeWidth={3.5} opacity={0.85} />
      ))}
      <path d={`M${GOAL.x0} ${GOAL.bot} V${GOAL.top} H${GOAL.x1} V${GOAL.bot}`} fill="none" stroke={INK} strokeWidth={22} strokeLinejoin="round" />
      <path d={`M${GOAL.x0} ${GOAL.bot} V${GOAL.top} H${GOAL.x1} V${GOAL.bot}`} fill="none" stroke="#FFFFFF" strokeWidth={12} strokeLinejoin="round" />
    </g>
  );
};

/* ------------------------------- scene ------------------------------- */
export const SoccerScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const GX = kf(f, [[0, 430], [50, 430], [64, 540, E.out]]);
  const GY = kf(f, [[0, 1560], [50, 1560], [64, 1760, E.out]]);
  const SC = kf(f, [[0, 0.8], [50, 0.8], [64, 1.0, E.out]]);
  const toStageF = (ff: number, pt: [number, number]): [number, number] => {
    const gx = kf(ff, [[0, 430], [50, 430], [64, 540, E.out]]);
    const gy = kf(ff, [[0, 1560], [50, 1560], [64, 1760, E.out]]);
    const sc = kf(ff, [[0, 0.8], [50, 0.8], [64, 1.0, E.out]]);
    return [gx + pt[0] * sc, gy + pt[1] * sc];
  };
  const footAt = (ff: number) => {
    const rr = rig(poseF(ff));
    return toStageF(ff, rr.W(rr.lR.ankle, -30, 10));
  };
  const contact = footAt(26);
  const HIT = 34;

  // ball path
  let ball: React.ReactNode = null;
  if (f < 26) {
    const t = clamp(f / 26);
    const x = lerp(-80, contact[0], t);
    const y = lerp(820, contact[1], t) - Math.sin(Math.PI * t) * 380;
    ball = <SoccerBall x={x} y={y} r={46} rot={f * 14} />;
  } else if (f < HIT) {
    const t = (f - 26) / (HIT - 26);
    const x = lerp(contact[0], NETHIT[0], E.out(t));
    const y = lerp(contact[1], NETHIT[1], E.out(t)) - Math.sin(Math.PI * t) * 60;
    ball = <SoccerBall x={x} y={y} r={lerp(46, 22, t)} rot={f * 40} />;
  } else {
    const t = f - HIT;
    const k = Math.exp(-t * 0.15);
    ball = <SoccerBall x={NETHIT[0] + Math.sin(t) * 6 * k} y={Math.min(GOAL.bot - 22, NETHIT[1] + t * t * 0.4)} r={22} rot={f * 6 * k} />;
  }
  const ballTrail =
    f >= 26 && f < HIT
      ? trail((ff) => {
          const t = clamp((ff - 26) / (HIT - 26));
          return [lerp(contact[0], NETHIT[0], E.out(t)), lerp(contact[1], NETHIT[1], E.out(t)) - Math.sin(Math.PI * t) * 60];
        }, f, 5)
      : [];
  const legTrail = trail(footAt, f, 6);

  const cam: Cam = {
    cx: kf(f, [[0, 540], [20, 520], [30, 600, E.inOut], [40, 560], [64, 540, E.out]]),
    cy: kf(f, [[0, 1000], [18, 920, E.inOut], [30, 900], [44, 980, E.inOut], [64, 1000, E.out]]),
    z: kf(f, [[0, 1], [18, 1.08, E.inOut], [26, 1.16], [34, 1.0, E.out], [64, 1.0], [135, 1.04]]),
    r: kf(f, [[18, 0], [26, -4, E.out], [34, 2], [44, 0]]),
  };
  const s1 = shake(f, 26, 10, 18, 3);
  const s2 = shake(f, HIT, 18, 24, 6);
  const s3 = shake(f, 44, 8, 10, 2);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s1.r + s2.r + s3.r };
  const impact = f === 26 || f === 27;
  const cheer = seg(f, HIT, HIT + 6);
  const knee = toStageF(f, r.W(r.lL.knee));
  const kneeR = toStageF(f, r.W(r.lR.knee));

  return (
    <Stage impact={impact} overlay={<EndCard f={f} start={80} lines={['GOLAZO!']} pts="+0.5" color="#2FA36B" dark="#1D6E48" y={96} />}>
      <GlowDefs />
      <Stadium f={f} cam={cam} sh={sh} cheer={cheer} />
      <g transform={camP(cam, 1, sh)}>
        <Goal f={f} hit={HIT} />
        {f >= HIT ? <Burst x={NETHIT[0]} y={NETHIT[1]} r={200} t={seg(f, HIT, HIT + 14)} seed={5} fill="#FFFFFF" fill2="#FFD064" /> : null}
        {f >= 24 && f <= 30 ? <Swoosh pts={legTrail} width={120} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} />
        {ballTrail.length ? <Swoosh pts={ballTrail} width={70} color="#FFFFFF" /> : null}
        {ball}
        <Burst x={contact[0]} y={contact[1]} r={210} t={seg(f, 26, 38)} seed={11} fill="#FFD064" />
        <Ring x={contact[0]} y={contact[1]} t={seg(f, 26, 36)} r={220} />
        <Sparks f={f} start={26} seed={4} n={18} x={contact[0]} y={contact[1]} speed={[12, 30]} size={[12, 22]} />
        <Dust f={f} start={44} x={GX} y={GY} n={6} spread={260} size={46} seed={3} color="#FFFFFF" line="#A7CCA4" />
        {/* grass spray during knee slide */}
        {f >= 50 && f < 70
          ? [0, 1, 2, 3].map((i) => (
              <Sparks key={i} f={f} start={50 + i * 4} seed={60 + i} n={12} x={(i % 2 ? kneeR : knee)[0]} y={GY - 10} speed={[10, 22]} g={1.2} size={[10, 18]} shape="grass" colors={['#69B661', '#569850', '#96D48F', '#875C3F']} angle={-90} spread={120} />
            ))
          : null}
        <Dust f={f} start={52} x={GX} y={GY} n={8} spread={360} size={56} seed={8} color="#FFFFFF" line="#A7CCA4" />
        <Sfx f={f} start={26} text="WHAM!" x={contact[0] - 260} y={contact[1] - 40} size={150} rot={-14} fill="#FFD064" dur={18} />
      </g>
      {f >= HIT && f < HIT + 8 ? <FocusLines f={f} cx={540} cy={800} r0={420} r1={1600} n={50} opacity={0.32} width={14} /> : null}
      <Sfx f={f} start={HIT} text="GOOOOAL!" x={540} y={600} size={190} rot={-6} fill="#FFD064" dur={44} />
      <ConfettiRain f={f} start={HIT + 2} n={80} seed={33} colors={['#2FA36B', '#FFFFFF', '#FFD064', '#6A5BE0', '#F15F75']} />
    </Stage>
  );
};
