import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig, C } from '../hero/Hero';
import { E, kf, seg, shake, clamp, lerp, poseAt, Key } from '../lib/anim';
import { ap } from '../lib/m2';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, Burst, Sparks, ConfettiRain, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng, rrPath, capsule, smooth, P } from '../lib/shape';

const INK = C.ink;
const GX = 540;
const GY = 1890;
const SC = 1.0;

/* ------------------------------- mug ------------------------------- */
/** origin = handle grip; body extends to -x. level 0..1 */
export const Mug: React.FC<{ level?: number; foam?: number; s?: number; flip?: boolean; seed?: number; f?: number }> = ({ level = 1, foam = 1, s = 1, flip, seed = 1, f = 0 }) => {
  const id = `mug${seed}`;
  const x0 = -196;
  const x1 = -36;
  const y0 = -112;
  const y1 = 108;
  const top = lerp(y1 - 20, y0 + 26, level);
  const r = rng(seed);
  return (
    <g transform={`scale(${flip ? -s : s} ${s})`}>
      <defs>
        <clipPath id={id}>
          <path d={rrPath(x0, y0, x1 - x0, y1 - y0, 26)} />
        </clipPath>
      </defs>
      {/* handle */}
      <path d={`M${x1 - 6} -64 Q${x1 + 70} -70 ${x1 + 66} 0 Q${x1 + 62} 66 ${x1 - 6} 62`} fill="none" stroke={INK} strokeWidth={42} strokeLinecap="round" />
      <path d={`M${x1 - 6} -64 Q${x1 + 70} -70 ${x1 + 66} 0 Q${x1 + 62} 66 ${x1 - 6} 62`} fill="none" stroke="#F3EEFE" strokeWidth={26} strokeLinecap="round" />
      {/* glass */}
      <path d={rrPath(x0, y0, x1 - x0, y1 - y0, 26)} fill="#F3EEFE" />
      <g clipPath={`url(#${id})`}>
        <rect x={x0} y={top} width={x1 - x0} height={y1 - top + 10} fill="#FFB359" />
        <rect x={x1 - 46} y={top} width={46} height={y1 - top + 10} fill="#EA9332" />
        {level > 0.05
          ? Array.from({ length: 9 }).map((_, i) => {
              const bx = x0 + 20 + r() * (x1 - x0 - 40);
              const by = y1 - (((f * (2 + r() * 2) + r() * 300) % 1) * 0 + ((f * 3 + i * 37) % Math.max(10, y1 - top)));
              return <circle key={i} cx={bx} cy={by} r={4 + r() * 4} fill="#FFE1AD" opacity={0.85} />;
            })
          : null}
        <rect x={x0 + 18} y={y0 + 10} width={18} height={y1 - y0 - 30} rx={9} fill="#FFFFFF" opacity={0.55} />
      </g>
      <path d={rrPath(x0, y0, x1 - x0, y1 - y0, 26)} fill="none" stroke={INK} strokeWidth={9} />
      <line x1={x0 + 50} y1={y0 + 20} x2={x0 + 50} y2={y1 - 20} stroke="#FFFFFF" strokeWidth={5} opacity={0.4} />
      <line x1={x0 + 110} y1={y0 + 20} x2={x0 + 110} y2={y1 - 20} stroke="#FFFFFF" strokeWidth={5} opacity={0.4} />
      {/* foam */}
      {foam > 0.02 ? (
        <g transform={`translate(${(x0 + x1) / 2} ${top}) scale(${foam})`}>
          <path d={smooth([[-96, 10], [-100, -20], [-70, -46], [-36, -38], [-10, -60], [26, -44], [56, -56], [92, -30], [98, 6], [60, 20], [0, 16], [-60, 22]] as P[])} fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <circle cx={-40} cy={-24} r={10} fill="#EEE9F9" />
          <circle cx={30} cy={-30} r={8} fill="#EEE9F9" />
          <path d="M84 4 Q96 40 84 60" fill="none" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

/* ------------------------------- fella arm ------------------------------- */
const FellaArm: React.FC<{ base: [number, number]; tip: [number, number]; sleeve: string; stripe: string; skin: string; flip?: boolean; seed: number; f: number }> = ({ base, tip, sleeve, stripe, skin, flip, seed, f }) => {
  const a = Math.atan2(tip[1] - base[1], tip[0] - base[0]);
  const cuffX = tip[0] - Math.cos(a) * 70;
  const cuffY = tip[1] - Math.sin(a) * 70;
  return (
    <g>
      <path d={capsule(base[0], base[1], cuffX, cuffY, 62, 54)} fill={sleeve} stroke={INK} strokeWidth={9} />
      <g opacity={0.5}>
        {[0.25, 0.5, 0.75].map((k) => {
          const x = lerp(base[0], cuffX, k);
          const y = lerp(base[1], cuffY, k);
          return <line key={k} x1={x - Math.sin(a) * 52} y1={y + Math.cos(a) * 52} x2={x + Math.sin(a) * 52} y2={y - Math.cos(a) * 52} stroke={stripe} strokeWidth={14} />;
        })}
      </g>
      <path d={capsule(cuffX, cuffY, cuffX - Math.cos(a) * 26, cuffY - Math.sin(a) * 26, 56, 56)} fill={stripe} stroke={INK} strokeWidth={8} />
      <g transform={`translate(${tip[0]} ${tip[1]})`}>
        <g transform={`translate(${flip ? 60 : -60} -10)`}>
          <Mug flip={flip} s={0.92} seed={seed} f={f} />
        </g>
        <circle r={46} fill={skin} stroke={INK} strokeWidth={8} />
        {[-24, 0, 24].map((y) => (
          <path key={y} d={`M${flip ? 30 : -30} ${y - 10} Q${flip ? 52 : -52} ${y} ${flip ? 30 : -30} ${y + 12}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const HOLD: Partial<Pose> = {
  shR: 36, elR: 104, wrR: -6, uaR: 0.9, handR: 'fist', shL: 40, elL: -104, wrL: 30, handL: 'fist',
  turn: 0.15, lookX: 0.3, brow: 0.9, smile: 1, mouthOpen: 0.3, flexL: 0.6, flexR: 0.9, chestS: 1.02,
};
const TOAST: Partial<Pose> = {
  shR: 150, elR: 18, wrR: -4, uaR: 1.24, faR: 1.24, shrugR: 36, handR: 'fist', shL: 40, elL: -104,
  turn: 0.1, lookX: 0.5, lookY: -0.8, brow: 1, mouthOpen: 0.85, smile: 1, sy: 1.03,
};
const CHUG: Partial<Pose> = {
  shR: 108, elR: 96, wrR: 0, uaR: 1, faR: 1, shrugR: 10, handR: 'fist', armZR: 'top',
  shL: 40, elL: -104, head: -16, turn: 0, lookY: -0.8, eyes: 1, mouthOpen: 0.3, smile: 0.6, brow: 0.8, torsoSy: 1.02,
};
const AHH: Partial<Pose> = {
  shR: 46, elR: 34, wrR: 0, uaR: 1, faR: 1, shrugR: 0, handR: 'fist', armZR: 'mid',
  shL: 92, elL: 102, wrL: -14, flexL: 1, handL: 'fist',
  head: 6, turn: -0.1, lookY: 0, eyes: 1, mouthOpen: 1, smile: 1, brow: 1, torsoSy: 0.98, chestS: 1.06, blush: 0.5,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: HOLD },
  { f: 12, p: { brow: 1.2 }, e: E.inOut },
  { f: 24, p: TOAST, e: E.inOut },
  { f: 30, p: { sy: 0.98 }, e: E.out },
  { f: 34, p: { sy: 1 }, e: E.out },
  { f: 44, p: { ...CHUG, sy: 1 }, e: E.inOut },
  { f: 74, p: { head: -22 } },
  { f: 78, p: { ...AHH, sy: 0.94 }, e: E.out },
  { f: 83, p: { sy: 1.03 }, e: E.out },
  { f: 88, p: { sy: 1 }, e: E.inOut },
  { f: 106, p: { eyes: 0, lid: 0.2, mouthOpen: 0.4, turn: 0.15, lookX: 0.3 }, e: E.inOut },
  { f: 116, p: { wink: 1 }, e: E.out },
  { f: 128, p: { wink: 0 }, e: E.out },
  { f: 150, p: {} },
];

const poseF = (f: number): Pose => {
  const p = poseAt(f, BASE, KEYS);
  const gulp = f > 46 && f < 74 ? Math.sin((f - 46) / 2.2) * 0.012 : 0;
  return plant({ ...p, chestS: p.chestS + gulp, head: p.head + (f > 46 && f < 74 ? Math.sin((f - 46) / 2.2) * 1.5 : 0) });
};

/* ------------------------------- background ------------------------------- */
const Pub: React.FC<{ f: number; cam: Cam; sh: { x: number; y: number; r: number } }> = ({ f, cam, sh }) => {
  const r = rng(31);
  const bottleCols = ['#569850', '#763E23', '#6A5BE0', '#FFB359', '#D23C58', '#B0DEF9', '#7254DC'];
  const shelf = (y: number, k: number) => (
    <g key={k}>
      {Array.from({ length: 13 }).map((_, i) => {
        const x = -30 + i * 88 + r() * 20;
        const h = 120 + r() * 70;
        const w = 40 + r() * 20;
        const col = bottleCols[Math.floor(r() * bottleCols.length)];
        return (
          <g key={i}>
            <path d={`M${x - w / 2} ${y} V${y - h * 0.62} Q${x - w / 2} ${y - h * 0.75} ${x - 8} ${y - h * 0.82} V${y - h} H${x + 8} V${y - h * 0.82} Q${x + w / 2} ${y - h * 0.75} ${x + w / 2} ${y - h * 0.62} V${y} Z`} fill={col} stroke={INK} strokeWidth={6} />
            <rect x={x - w / 2 + 6} y={y - h * 0.5} width={w - 12} height={h * 0.28} rx={4} fill="#F8F5FF" opacity={0.85} />
            <rect x={x - w / 2 + 6} y={y - h * 0.6} width={8} height={h * 0.5} rx={4} fill="#FFFFFF" opacity={0.35} />
          </g>
        );
      })}
      <rect x={-200} y={y} width={1480} height={26} fill="#865436" stroke={INK} strokeWidth={7} />
    </g>
  );
  const neonOn = f % 46 < 2 ? 0.3 : 1;
  return (
    <>
      <g transform={camP(cam, 0.6, sh)}>
        <rect x={-500} y={-500} width={2080} height={2800} fill="#573021" />
        {/* brick wall */}
        <g opacity={0.35}>
          {Array.from({ length: 24 }).map((_, row) =>
            Array.from({ length: 14 }).map((__, i) => (
              <rect key={`${row}-${i}`} x={-300 + i * 120 + (row % 2) * 60} y={-200 + row * 56} width={112} height={48} rx={6} fill="#76402B" />
            )),
          )}
        </g>
        {/* neon sign */}
        <g opacity={neonOn}>
          <Glow x={540} y={420} r={420} id="glowP" o={0.55} />
          <rect x={200} y={300} width={680} height={230} rx={40} fill="none" stroke="#F47AAF" strokeWidth={14} />
          <rect x={200} y={300} width={680} height={230} rx={40} fill="none" stroke="#FCE2EF" strokeWidth={5} />
          <text x={540} y={392} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={84} fill="none" stroke="#80EDFD" strokeWidth={10}>
            THE FELLAS
          </text>
          <text x={540} y={392} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={84} fill="#FAF8FF">
            THE FELLAS
          </text>
          <text x={540} y={478} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={44} fill="#FCE2EF" letterSpacing={6}>
            EST. WINTER ARC
          </text>
        </g>
        {shelf(860, 0)}
        {shelf(1110, 1)}
        {shelf(1360, 2)}
      </g>
      <g transform={camP(cam, 0.85, sh)}>
        {/* pendant lamps */}
        {[150, 540, 930].map((x, i) => (
          <g key={x} transform={`rotate(${Math.sin(f / 20 + i) * 2} ${x} -100)`}>
            <line x1={x} y1={-200} x2={x} y2={150} stroke={INK} strokeWidth={6} />
            <path d={`M${x} ${150} l120 260 l-240 0 Z`} fill="#FEE6BB" opacity={0.12} />
            <path d={`M${x - 70} 200 Q${x} 110 ${x + 70} 200 Z`} fill="#385839" stroke={INK} strokeWidth={7} />
            <Glow x={x} y={214} r={110} id="glowY" o={0.9} />
            <circle cx={x} cy={206} r={18} fill="#FFF0B7" stroke={INK} strokeWidth={5} />
          </g>
        ))}
      </g>
    </>
  );
};

const Counter: React.FC = () => (
  <g>
    <rect x={-100} y={1640} width={1280} height={60} fill="#AB6D43" stroke={INK} strokeWidth={9} />
    <rect x={-100} y={1640} width={1280} height={18} fill="#D08D5B" />
    <rect x={-100} y={1700} width={1280} height={400} fill="#77462A" stroke={INK} strokeWidth={9} />
    {Array.from({ length: 8 }).map((_, i) => (
      <rect key={i} x={-60 + i * 160} y={1740} width={120} height={300} rx={14} fill="none" stroke="#5B341F" strokeWidth={8} />
    ))}
    <rect x={-100} y={1860} width={1280} height={22} rx={11} fill="#ECB25E" stroke={INK} strokeWidth={7} />
  </g>
);

/* ------------------------------- scene ------------------------------- */
export const BeersScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const grip = ap(r.aR.wrist, 0, 40);
  const clinkPose = rig(poseF(30));
  const g30 = toStage(clinkPose.W(clinkPose.aR.wrist, 0, 40));
  const CL: [number, number] = [g30[0] - 116 * SC, g30[1] - 60 * SC];
  const CLINK = 30;

  // fellas' arms
  const inOut = (start: number, end: number) => E.out(seg(f, start, start + 12)) * (1 - E.in(seg(f, end, end + 10)));
  const k1 = inOut(14, 38);
  const k2 = inOut(16, 40);
  const k3 = inOut(18, 42);
  const wob = (k: number) => (f > CLINK ? Math.sin((f - CLINK) * 1.3) * 12 * Math.exp(-(f - CLINK) * 0.2) : 0) * k;
  const arm1Tip: [number, number] = [lerp(-300, CL[0] - 395, k1), lerp(300, CL[1] - 20, k1) + wob(k1)];
  const arm2Tip: [number, number] = [lerp(1400, CL[0] + 395, k2), lerp(1100, CL[1] + 30, k2) - wob(k2)];
  const arm3Tip: [number, number] = [lerp(1200, CL[0] + 300, k3), lerp(-300, CL[1] - 210, k3) + wob(k3)];

  const level = 1 - seg(f, 50, 74);
  const foam = level > 0.1 ? 1 : 0;

  const mugRot = kf(f, [[0, 0], [24, -8], [36, -4], [44, 0], [76, 0], [80, 0]]);
  const mouthP = ap(r.head, p.turn * 16, -66);
  const chugK = E.inOut(seg(f, 40, 48)) * (1 - E.out(seg(f, 74, 78)));
  const mugNode =
    chugK > 0.02 ? (
      <g transform={`translate(${lerp(grip[0], mouthP[0] - 34, chugK)} ${lerp(grip[1], mouthP[1] + 6, chugK)}) rotate(${lerp(mugRot, -138, chugK)}) translate(${116 * chugK} ${112 * chugK})`}>
        <Mug level={level} foam={foam} seed={9} f={f} />
      </g>
    ) : (
      <g transform={`translate(${grip[0]} ${grip[1] - 20 * seg(f, 10, 24) * (1 - seg(f, 34, 44))}) rotate(${mugRot})`}>
        <Mug level={level} foam={foam} seed={9} f={f} />
      </g>
    );
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1080], [24, 1000, E.inOut], [44, 1060, E.inOut], [76, 1080], [150, 1060]]),
    z: kf(f, [[0, 1.04], [24, 1.0, E.inOut], [28, 1.06], [32, 1.0, E.out], [44, 1.12, E.inOut], [74, 1.16], [78, 1.0, E.out], [150, 1.03]]),
    r: kf(f, [[44, 0], [60, -1.5], [74, 1.5], [78, 0]]),
  };
  const s1 = shake(f, CLINK, 16, 22, 5);
  const s2 = shake(f, 77, 10, 16, 2);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const mouth = toStage(r.mouth());

  return (
    <Stage overlay={<EndCard f={f} start={88} lines={['CHEERS FELLAS']} pts="+1" color="#E39A2E" dark="#A8661A" y={96} />}>
      <GlowDefs />
      <Pub f={f} cam={cam} sh={sh} />
      <g transform={camP(cam, 1, sh)}>
        <Hero
          p={p}
          x={GX}
          y={GY}
          scale={SC}
          front={mugNode}
          headExtra={
            f >= 76 ? (
              <g transform={`translate(${p.turn * 16} -96)`}>
                <path d={smooth([[-74, 4], [-70, -14], [-40, -18], [-14, -10], [0, -16], [16, -10], [40, -18], [70, -14], [76, 4], [50, 14], [20, 8], [0, 14], [-20, 8], [-50, 14]] as P[])} fill="#FFFFFF" stroke={INK} strokeWidth={6} />
                <circle cx={-70} cy={14} r={7} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
              </g>
            ) : undefined
          }
        />
        {/* the fellas */}
        {k3 > 0 ? <FellaArm base={[1300, -320]} tip={arm3Tip} sleeve="#6ACC86" stripe="#FFFFFF" skin="#875C3F" seed={3} f={f} /> : null}
        {k1 > 0 ? <FellaArm base={[-360, 420]} tip={arm1Tip} sleeve="#D23C58" stripe="#2F1622" skin="#FCD4B5" flip seed={1} f={f} /> : null}
        {k2 > 0 ? <FellaArm base={[1420, 1200]} tip={arm2Tip} sleeve="#6A5BE0" stripe="#C6DFF9" skin="#C58C65" seed={2} f={f} /> : null}
        <Burst x={CL[0]} y={CL[1] - 30} r={250} t={seg(f, CLINK, CLINK + 14)} seed={15} fill="#FFD064" />
        <Sparks f={f} start={CLINK} seed={77} n={34} x={CL[0]} y={CL[1] - 40} speed={[14, 34]} g={1.3} size={[16, 30]} shape="foam" colors={['#FFFFFF', '#F8F5FF']} />
        <Sparks f={f} start={CLINK} seed={78} n={14} x={CL[0]} y={CL[1] - 40} speed={[10, 26]} g={1.1} size={[14, 26]} shape="drop" colors={['#FFB359', '#FFC770']} />
        {/* glug bubbles */}
        {[0, 1, 2].map((i) => (
          <Sfx key={i} f={f} start={50 + i * 8} text="GLUG" x={mouth[0] + (i % 2 ? 250 : -250)} y={mouth[1] - 150 - i * 60} size={86} rot={i % 2 ? 10 : -10} fill="#FFE1AD" dur={12} />
        ))}
        <Twinkle x={CL[0] + 120} y={CL[1] - 160} s={1} t={seg(f, CLINK + 2, CLINK + 16)} color="#FFD064" />
      </g>
      <Counter />
      <g transform={`translate(${sh.x} ${sh.y})`}>
        <Sfx f={f} start={CLINK} text="CHEERS!" x={540} y={560} size={180} rot={-5} fill="#FFD064" dur={28} />
        <Sfx f={f} start={78} text="AHHH!" x={540} y={1240} size={150} rot={4} fill="#FFFFFF" dur={20} />
      </g>
      <ConfettiRain f={f} start={90} n={55} seed={41} colors={['#FFB359', '#FFFFFF', '#D23C58', '#6A5BE0', '#6ACC86']} />
    </Stage>
  );
};

void clamp;
