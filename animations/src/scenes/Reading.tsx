import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key, springAt } from '../lib/anim';
import { ap } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Cloud, Sfx, GlowDefs, Glow, Burst, Sparks, Dust, ConfettiRain, Twinkle, Glint, FocusLines } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng, rrPath } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1720;
const SC = 0.98;

/* ------------------------------- book ------------------------------- */
const OpenBook: React.FC<{ f: number; flip: number }> = ({ f, flip }) => {
  const W = 165;
  const H = 200;
  const lines = (x0: number, x1: number) =>
    Array.from({ length: 9 }).map((_, i) => (
      <line key={i} x1={x0} y1={-H + 34 + i * 18} x2={x1 - (i === 8 ? 50 : (i * 37) % 34)} y2={-H + 34 + i * 18} stroke="#B9AFC7" strokeWidth={6} strokeLinecap="round" />
    ));
  // flipping pages: n pages, each 5 frames
  const pages = [];
  if (flip > 0) {
    for (let i = 0; i < 8; i++) {
      const t = clamp((f - 10 - i * 3.6) / 5);
      if (t <= 0 || t >= 1) continue;
      const a = Math.PI * t;
      const x = Math.cos(a) * W;
      const lift = Math.sin(a) * 40;
      pages.push(
        <path key={i} d={`M0 ${-H} Q${x * 0.5} ${-H - lift} ${x} ${-H - lift * 0.6} L${x} ${-lift * 0.4} Q${x * 0.5} ${-lift * 0.3} 0 0 Z`} fill={t < 0.5 ? '#FFFDF6' : '#EDE7F9'} stroke={INK} strokeWidth={6} strokeLinejoin="round" />,
      );
    }
  }
  return (
    <g>
      {/* cover */}
      <path d={`M${-W - 18} ${-H - 14} Q0 ${-H + 10} ${W + 18} ${-H - 14} L${W + 18} 14 Q0 34 ${-W - 18} 14 Z`} fill="#7254DC" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      {/* pages */}
      <path d={`M${-W} ${-H} Q${-W / 2} ${-H - 20} 0 ${-H + 6} L0 4 Q${-W / 2} -14 ${-W} 0 Z`} fill="#FFFDF6" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d={`M${W} ${-H} Q${W / 2} ${-H - 20} 0 ${-H + 6} L0 4 Q${W / 2} -14 ${W} 0 Z`} fill="#FFFDF6" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <g>{lines(-W + 30, -24)}</g>
      <g>{lines(24, W - 30)}</g>
      <path d={`M0 ${-H + 6} L0 4`} stroke="#D7D0E7" strokeWidth={10} />
      {pages}
    </g>
  );
};

const ClosedBook: React.FC = () => (
  <g transform="rotate(90) translate(0 -60)">
    <rect x={-150} y={-46} width={300} height={92} rx={14} fill="#FFFDF6" stroke={INK} strokeWidth={7} />
    {[-28, -10, 8, 26].map((y) => (
      <line key={y} x1={-130} y1={y} x2={130} y2={y} stroke="#D7D0E7" strokeWidth={4} />
    ))}
    <path d="M-160 -56 H160 Q172 -56 172 -44 V-30 H-172 V-44 Q-172 -56 -160 -56 Z" fill="#7254DC" stroke={INK} strokeWidth={7} />
    <path d="M-160 56 H160 Q172 56 172 44 V30 H-172 V44 Q-172 56 -160 56 Z" fill="#7254DC" stroke={INK} strokeWidth={7} />
    <rect x={-172} y={-56} width={34} height={112} rx={10} fill="#5D39B0" stroke={INK} strokeWidth={7} />
    <circle cx={0} cy={-43} r={0} />
  </g>
);

const Glasses: React.FC<{ turn: number; glint: number }> = ({ turn, glint }) => {
  const ex = turn * 18;
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={s * 41 + ex} cy={-176} r={52} fill="#C7E6FB" opacity={0.22} />
          <circle cx={s * 41 + ex} cy={-176} r={52} fill="none" stroke={INK} strokeWidth={13} />
          <circle cx={s * 41 + ex} cy={-176} r={52} fill="none" stroke={C.gold} strokeWidth={6} />
          <path d={`M${s * 41 + ex - 30} -196 Q${s * 41 + ex - 18} -214 ${s * 41 + ex} -218`} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
        </g>
      ))}
      <path d={`M${-8 + ex} -186 Q${ex} -196 ${8 + ex} -186`} fill="none" stroke={INK} strokeWidth={8} />
      <line x1={-93 + ex} y1={-182} x2={-120} y2={-190} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <line x1={93 + ex} y1={-182} x2={120} y2={-190} stroke={INK} strokeWidth={8} strokeLinecap="round" />
      {glint > 0 && glint < 1 ? (
        <rect x={-100 + ex + glint * 200} y={-240} width={22} height={130} fill="#FFFFFF" opacity={0.85} transform={`rotate(25 ${-100 + ex + glint * 200} -176)`} />
      ) : null}
    </g>
  );
};

const Bulb: React.FC<{ x: number; y: number; on: number; s: number }> = ({ x, y, on, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {on > 0
      ? Array.from({ length: 10 }).map((_, i) => (
          <line key={i} x1={0} y1={0} x2={0} y2={-150 - on * 30} transform={`rotate(${i * 36})`} stroke="#FFD064" strokeWidth={12} strokeLinecap="round" strokeDasharray="40 200" strokeDashoffset={-80} opacity={on} />
        ))
      : null}
    <Glow x={0} y={0} r={180 * on} id="glowY" o={on} />
    <path d="M0 -84 C50 -84 74 -46 70 -8 C66 26 40 40 34 64 L-34 64 C-40 40 -66 26 -70 -8 C-74 -46 -50 -84 0 -84 Z" fill={on > 0.5 ? '#FEEEB0' : '#F8F5FF'} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-16 60 L-10 10 Q0 -6 10 10 L16 60" fill="none" stroke={INK} strokeWidth={6} opacity={0.6} />
    <ellipse cx={-30} cy={-40} rx={14} ry={22} fill="#FFFFFF" opacity={0.8} transform="rotate(30 -30 -40)" />
    <rect x={-36} y={64} width={72} height={52} rx={10} fill="#C5C0D1" stroke={INK} strokeWidth={8} />
    <line x1={-36} y1={82} x2={36} y2={82} stroke={INK} strokeWidth={5} />
    <line x1={-36} y1={98} x2={36} y2={98} stroke={INK} strokeWidth={5} />
  </g>
);

/* ------------------------------- poses ------------------------------- */
const READ: Partial<Pose> = {
  shL: 30, elL: -84, wrL: 40, uaL: 0.9, handL: 'fist', shR: 30, elR: -84, wrR: 40, uaR: 0.9, handR: 'fist',
  armZL: 'mid', armZR: 'mid',
  head: 4, lookY: 0.5, lid: 0.1, brow: 0.5, smile: 0.7, mouthOpen: 0, flexL: 0.5, flexR: 0.5,
};
const CURL_DOWN: Partial<Pose> = {
  shR: 18, elR: 14, wrR: 0, uaR: 1, handR: 'fist', armZR: 'mid',
  shL: 42, elL: -104, wrL: 30, uaL: 1, handL: 'fist', armZL: 'mid',
  head: 0, lookY: 0, lookX: 0.4, turn: 0.2, lid: 0.25, brow: 0.7, smile: 1, mouthOpen: 0.2, mouthSkew: 0.6, flexR: 0.4,
};
const CURL_UP: Partial<Pose> = { shR: 22, elR: 142, wrR: -30, flexR: 1, chestS: 1.05 };

const KEYS: Key<Pose>[] = [
  { f: 0, p: READ },
  { f: 10, p: { lookY: 0.4, brow: 0.9, pupil: 0.8 } },
  { f: 26, p: { mouthMode: 'o', mouthOpen: 0.5, brow: 1.2, pupil: 0.6, lid: 0 }, e: E.inOut },
  { f: 40, p: { lookY: -0.6, mouthMode: 'grin', mouthOpen: 1, eyeMode: 'star', pupil: 1 }, e: E.out },
  { f: 54, p: { eyeMode: 'normal', mouthOpen: 0.6, lookY: 0 }, e: E.inOut },
  { f: 60, p: { shL: 22, elL: -100, shR: 22, elR: -100, sy: 0.96 }, e: E.in },
  { f: 63, p: { shL: 30, elL: -84, shR: 30, elR: -84, sy: 1.02 }, e: E.out },
  { f: 70, p: { ...CURL_DOWN }, e: E.inOut },
  { f: 77, p: CURL_UP, e: E.inOut },
  { f: 84, p: { shR: 18, elR: 14, wrR: 0, flexR: 0.4, chestS: 1 }, e: E.inOut },
  { f: 91, p: CURL_UP, e: E.inOut },
  { f: 104, p: { wink: 1 }, e: E.out },
  { f: 114, p: { wink: 0 }, e: E.out },
  { f: 150, p: {} },
];

const headScale = (f: number) => 1 + 0.36 * (springAt(f, 40, 16, 1.4, 5) - springAt(f, 54, 14, 1.6, 5));

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  const scan = f < 26 ? Math.sin(f / 2.2) * 0.6 : 0;
  return plant({ ...p, lookX: p.lookX + scan, headS: headScale(f) });
};

/* ------------------------------- background ------------------------------- */
const Library: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number } }> = ({ f, cam, sh }) => {
  const r = rng(61);
  const cols = ['#D23C58', '#6A5BE0', '#FFD064', '#6ACC86', '#7254DC', '#F88F4D', '#479480', '#AD2C44', '#65607B'];
  const shelfRow = (x0: number, x1: number, y: number, k: number) => {
    const books = [];
    let x = x0 + 8;
    while (x < x1 - 30) {
      const w = 26 + r() * 22;
      const h = 110 + r() * 50;
      const tilt = r() < 0.08 ? 10 : 0;
      books.push(
        <g key={x} transform={`rotate(${tilt} ${x + w / 2} ${y})`}>
          <rect x={x} y={y - h} width={w} height={h} rx={5} fill={cols[Math.floor(r() * cols.length)]} stroke={INK} strokeWidth={5} />
          <rect x={x + 5} y={y - h + 16} width={w - 10} height={8} fill="#FFFFFF" opacity={0.5} />
          <rect x={x + 5} y={y - 30} width={w - 10} height={6} fill="#FFFFFF" opacity={0.4} />
        </g>,
      );
      x += w + 3;
    }
    return (
      <g key={k}>
        {books}
        <rect x={x0 - 10} y={y} width={x1 - x0 + 20} height={24} fill="#96673A" stroke={INK} strokeWidth={6} />
      </g>
    );
  };
  return (
    <>
      <defs>
        <linearGradient id="libSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#85B4FE" />
          <stop offset="1" stopColor="#D7F0FC" />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.7, sh)}>
        <rect x={-500} y={-500} width={2080} height={2800} fill="#F8E6CC" />
        {/* window */}
        <path d="M300 1300 V560 Q300 300 540 300 Q780 300 780 560 V1300 Z" fill="url(#libSky)" stroke={INK} strokeWidth={12} />
        <g>
          <Cloud x={((f * 0.8) % 600) + 260} y={560} w={260} h={110} seed={44} />
          <Cloud x={640 - ((f * 0.5) % 500)} y={820} w={220} h={90} seed={45} />
        </g>
        <path d="M540 300 V1300 M300 760 H780" stroke="#EBD6B5" strokeWidth={22} />
        <path d="M540 300 V1300 M300 760 H780" stroke={INK} strokeWidth={5} opacity={0.6} />
        <path d="M300 1300 V560 Q300 300 540 300 Q780 300 780 560 V1300 Z" fill="none" stroke="#C59B64" strokeWidth={26} />
        <path d="M300 1300 V560 Q300 300 540 300 Q780 300 780 560 V1300 Z" fill="none" stroke={INK} strokeWidth={6} />
        {/* bookcases */}
        <rect x={-120} y={160} width={400} height={1400} fill="#B47D4D" stroke={INK} strokeWidth={9} />
        <rect x={800} y={160} width={400} height={1400} fill="#B47D4D" stroke={INK} strokeWidth={9} />
        {[420, 640, 860, 1080, 1300].map((y, i) => shelfRow(-100, 260, y, i))}
        {[420, 640, 860, 1080, 1300].map((y, i) => shelfRow(820, 1180, y, 10 + i))}
        {/* globe on the right */}
        <g transform="translate(940 1250)">
          <circle r={0} />
        </g>
      </g>
      <g transform={camP(cam, 0.8, sh)}>
        {/* sunbeam */}
        <path d="M330 340 L760 340 L1000 1900 L120 1900 Z" fill="#FEF6CD" opacity={0.28} />
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 260 + ((i * 97 + f * (0.6 + (i % 3) * 0.3)) % 560);
          const y = 500 + ((i * 173 + f * 0.8) % 1200);
          return <circle key={i} cx={x} cy={y} r={3 + (i % 3) * 2} fill="#FFFFFF" opacity={0.75} />;
        })}
      </g>
      <g transform={camP(cam, 1, sh)}>
        <rect x={-400} y={1560} width={1880} height={600} fill="#C58C62" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={-400} y1={1580 + i * 34} x2={1480} y2={1580 + i * 34} stroke="#AC764B" strokeWidth={5} />
        ))}
        <ellipse cx={540} cy={1740} rx={480} ry={110} fill="#B53A44" stroke={INK} strokeWidth={8} />
        <ellipse cx={540} cy={1740} rx={400} ry={84} fill="none" stroke="#FFD064" strokeWidth={8} strokeDasharray="22 14" />
      </g>
    </>
  );
};

/* ------------------------------- scene ------------------------------- */
export const ReadingScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const holding = f < 63;
  const hL = ap(r.aL.wrist, 0, 40);
  const hR = ap(r.aR.wrist, 0, 40);
  const bookPos: [number, number] = [(hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2 + 12];
  const closeK = seg(f, 58, 63);
  const headTop = toStage(r.headTop());
  const bulbOn = seg(f, 44, 47) * (1 - seg(f, 84, 92));
  const bulbIn = E.back(seg(f, 38, 46)) * (1 - E.in(seg(f, 84, 92)));
  const flipping = seg(f, 10, 12) * (1 - seg(f, 40, 42));
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1180], [10, 1140], [38, 1080, E.inOut], [46, 960, E.out], [60, 1040, E.inOut], [70, 1080], [150, 1060]]),
    z: kf(f, [[0, 1.18], [10, 1.16], [38, 1.26, E.inOut], [46, 1.02, E.out], [60, 1.06], [64, 1.0, E.out], [150, 1.03]]),
  };
  const s1 = shake(f, 62, 12, 16, 3);
  const s2 = shake(f, 45, 8, 8, 1);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const glint = seg(f, 64, 72);
  const bookStage = toStage(r.W(I_, bookPos[0], bookPos[1] - 120));

  return (
    <Stage overlay={<EndCard f={f} start={92} lines={['BIG BRAIN']} pts="+1" color="#7254DC" dark="#4F35B0" light="#E6DCFD" y={96} />}>
      <GlowDefs />
      <Library f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        {flipping > 0 ? <FocusLines f={f} cx={bookStage[0]} cy={bookStage[1]} r0={380} r1={1400} n={30} color="#FFFFFF" opacity={0.3 * flipping} width={10} /> : null}
        <Glow x={headTop[0]} y={headTop[1] + 200} r={kf(f, [[40, 0], [46, 520, E.out], [60, 300]])} id="glowY" o={seg(f, 40, 44) * (1 - seg(f, 56, 70))} />
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          between={
            holding ? (
              <g transform={`translate(${bookPos[0]} ${bookPos[1]}) scale(${1 - closeK * 0.55} 1)`}>
                <OpenBook f={f} flip={flipping} />
              </g>
            ) : undefined
          }
          itemR={!holding ? <g transform="translate(0 40)"><ClosedBook /></g> : undefined}
          itemBehindR
          headExtra={<Glasses turn={p.turn} glint={glint} />}
        />
        <Dust f={f} start={62} x={bookPos[0] * SC + GX} y={toStage(r.W(I_, bookPos[0], bookPos[1]))[1] - 60} n={7} spread={300} size={46} seed={5} color="#F8F5FF" line="#DBC8AA" />
        <Sparks f={f} start={45} seed={91} n={22} x={headTop[0]} y={headTop[1] - 120} speed={[14, 30]} g={0.6} size={[14, 26]} colors={['#FFD064', '#FFFFFF', '#A98BFF']} />
        <Bulb x={headTop[0]} y={headTop[1] - 160 - Math.sin(f / 6) * 6} on={bulbOn} s={bulbIn} />
        <Glint x={toStage(r.eyes())[0] + 60} y={toStage(r.eyes())[1] - 30} s={1.2} t={seg(f, 66, 78)} />
        <Twinkle x={headTop[0] - 200} y={headTop[1] - 40} s={0.9} t={seg(f, 46, 60)} color="#FFD064" />
        <Twinkle x={headTop[0] + 210} y={headTop[1] + 20} s={0.7} t={seg(f, 50, 64)} color="#FFD064" />
        <Sfx f={f} start={12} text="FWIP!" x={230} y={1150} size={110} rot={-12} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={20} text="FWIP!" x={850} y={1080} size={110} rot={10} fill="#FFFFFF" dur={10} />
        <Sfx f={f} start={28} text="FWIP!" x={260} y={980} size={120} rot={-8} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={45} text="DING!" x={headTop[0] + 260} y={headTop[1] - 230} size={150} rot={10} fill="#FFD064" dur={24} />
        <Sfx f={f} start={62} text="THUD!" x={260} y={1300} size={130} rot={-10} fill="#FFFFFF" dur={18} />
        <Sfx f={f} start={78} text="+100 IQ" x={760} y={980} size={110} rot={8} fill="#A98BFF" inner="#FFFFFF" dur={22} />
      </g>
      <ConfettiRain f={f} start={94} n={55} seed={52} colors={['#7254DC', '#FFD064', '#FFFFFF', '#6A5BE0', '#F88F4D']} />
    </Stage>
  );
};

const I_: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
void lerp;
void Burst;
