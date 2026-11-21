// Inside joke: "PUKED ON" - Amaan is in last place. Somebody on the balcony above is not feeling great.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, HEAD_D } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE, Bubble, Flecks } from './jokekit';
import { TITLE_FONT } from '../fonts';
import { rng } from '../lib/shape';

export const PUKE_FRAMES = 165;
const GX = 640;
const GY = 1820;
const SC = 0.78;
const toStage = stageOf(GX, GY, SC);
const PX = 300;   // the guy on the balcony
const PY = 1010;
const PSC = 0.5;
const toP = stageOf(PX, PY, PSC);
const HURK = 26;
const BLARG = 40;
const HIT = 46;
const CARD = 120;
const GREEN = '#8BC34A';
const GREEN_D = '#4D7A12';
const [ORANGE] = PEOPLE.amaan;

/* ------------------------------- props ------------------------------- */
const Slime: React.FC<{ k: number; drip: number }> = ({ k, drip }) => {
  if (k <= 0.01) return null;
  const d = Math.max(0, drip);
  const drips: [number, number][] = [[-132, 1], [-98, 0.6], [-14, 0.3], [96, 0.75], [130, 0.95]];
  return (
    <g opacity={k}>
      <path d="M-156 -224 C-176 -334 -60 -386 10 -378 C104 -372 176 -322 156 -216 C124 -196 92 -230 60 -210 C30 -192 0 -226 -30 -206 C-70 -186 -104 -230 -156 -224 Z" fill={GREEN} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-100 -322 C-60 -352 -10 -358 30 -352" fill="none" stroke="#D4F29B" strokeWidth={12} strokeLinecap="round" />
      {[[-60, -300], [40, -320], [100, -270], [-120, -260]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={10} fill="#C7A53A" stroke={INK} strokeWidth={4} />
      ))}
      {drips.map(([x, sp], i) => {
        const len = Math.min(170 * sp, d * 8 * sp);
        return (
          <g key={i}>
            <path d={`M${x - 14} -220 L${x - 12} ${-220 + len} A13 13 0 0 0 ${x + 12} ${-220 + len} L${x + 14} -220 Z`} fill={GREEN} stroke={INK} strokeWidth={5} />
            <circle cx={x - 3} cy={-220 + len - 4} r={4} fill="#D4F29B" />
          </g>
        );
      })}
    </g>
  );
};

const Sick: React.FC<{ k: number; puff: number }> = ({ k, puff }) => (
  <g>
    <path d={HEAD_D} fill={GREEN} opacity={0.5 * k} />
    {puff > 0 ? (
      <g opacity={puff}>
        <ellipse cx={-70} cy={-70} rx={34 * puff} ry={26 * puff} fill={GREEN} stroke={INK} strokeWidth={5} />
        <ellipse cx={70} cy={-70} rx={34 * puff} ry={26 * puff} fill={GREEN} stroke={INK} strokeWidth={5} />
      </g>
    ) : null}
  </g>
);

/** The stream, from mouth a to target b. grow/fade 0..1 along the path. */
const Stream: React.FC<{ a: [number, number]; b: [number, number]; grow: number; fade: number; f: number }> = ({ a, b, grow, fade, f }) => {
  if (grow <= 0 || fade >= 1) return null;
  const n = 26;
  const r = rng(Math.floor(f / 2) + 3);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (t > grow || t < fade) continue;
    const x = lerp(a[0], b[0], t) + Math.sin(t * 9 + f * 0.8) * 16 * (1 - t);
    const y = lerp(a[1], b[1], t * t * 0.6 + t * 0.4);
    pts.push([x, y]);
  }
  return (
    <g>
      {pts.map(([x, y], i) => (
        <circle key={'o' + i} cx={x} cy={y} r={42 + (i % 3) * 6} fill={INK} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={'i' + i} cx={x} cy={y} r={36 + (i % 3) * 6} fill={i % 4 === 0 ? '#9CCB5A' : GREEN} />
      ))}
      {pts.map(([x, y], i) => (i % 2 ? <circle key={'c' + i} cx={x + (r() - 0.5) * 50} cy={y + (r() - 0.5) * 30} r={8 + r() * 8} fill={i % 4 === 1 ? '#C7A53A' : GREEN_D} /> : null))}
    </g>
  );
};

const Balcony: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-200} y={1010} width={760} height={50} rx={10} fill="#5C4A7A" stroke={INK} strokeWidth={10} />
    {Array.from({ length: 12 }).map((_, i) => (
      <rect key={i} x={-180 + i * 60} y={850} width={14} height={164} fill="#2B2340" />
    ))}
    <rect x={-200} y={836} width={760} height={26} rx={8} fill="#2B2340" stroke={INK} strokeWidth={6} />
    {/* string lights */}
    <path d="M-200 760 Q180 840 560 760" fill="none" stroke={INK} strokeWidth={5} />
    {Array.from({ length: 9 }).map((_, i) => {
      const t = (i + 0.5) / 9;
      const x = -200 + t * 760;
      const y = 760 + Math.sin(t * Math.PI) * 58;
      return <circle key={i} cx={x} cy={y + 14} r={12} fill={['#FFD064', '#EE5982', '#9DD2FF'][i % 3]} stroke={INK} strokeWidth={4} opacity={0.6 + 0.4 * Math.sin(f / 4 + i)} />;
    })}
  </g>
);

/** Little flies circling a point. */
const Flies: React.FC<{ x: number; y: number; f: number; o: number }> = ({ x, y, f, o }) => (
  <g opacity={o}>
    {[0, 1, 2].map((i) => {
      const a = f * 0.35 + i * 2.1;
      const fx = x + Math.cos(a) * (110 + i * 20);
      const fy = y + Math.sin(a * 1.3) * 50 - i * 30;
      return (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <ellipse cx={-8} cy={-10} rx={10} ry={6} fill="#FFFFFF" opacity={0.8} transform={`rotate(${f * 40} -8 -10)`} />
          <ellipse cx={8} cy={-10} rx={10} ry={6} fill="#FFFFFF" opacity={0.8} transform={`rotate(${-f * 40} 8 -10)`} />
          <circle r={9} fill={INK} />
        </g>
      );
    })}
  </g>
);

/* ------------------------------- poses ------------------------------- */
const PROUD: Partial<Pose> = {
  shL: 30, elL: 120, handL: 'fist', shR: 20, elR: 20, handR: 'relax', hipL: 8, hipR: 8, knL: -4, knR: -4,
  lookX: -0.2, lookY: 0.5, lid: 0.3, smile: 1, mouthMode: 'grin', mouthOpen: 0.2, brow: 0.6,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...PROUD } },
  { f: 20, p: { lookY: 0.6, head: 4 } },
  { f: HURK + 6, p: { lookX: -0.6, lookY: -0.9, turn: -0.3, head: -8, mouthMode: 'o', mouthOpen: 0.3, lid: 0, brow: 1, pupil: 0.7 } },
  { f: HIT - 1, p: { mouthOpen: 0.9, brow: 1.4 } },
  { f: HIT + 3, p: { sy: 0.88, sx: 1.08, shL: 60, elL: 40, shR: 60, elR: 40, handL: 'open', handR: 'open', eyes: 1, mouthMode: 'o', mouthOpen: 0.6 }, e: E.out },
  { f: HIT + 14, p: { sy: 1, sx: 1, shL: 14, elL: 10, shR: 14, elR: 10, eyes: 0, lid: 0.62, smile: 0, mouthMode: 'grit', mouthOpen: 0, brow: 0, browTilt: 0.4, lookX: 0, lookY: 0, turn: 0, head: 0, pupil: 1 }, e: E.inOut },
  { f: 100, p: { head: -4 } },
  { f: PUKE_FRAMES, p: { head: 2 } },
];
const solve = (f: number): Pose => plant(poseAt(f, BASE, KEYS));

const P_KEYS: Key<Pose>[] = [
  { f: 0, p: { rot: 8, shL: 40, elL: 90, shR: 30, elR: 100, handL: 'open', handR: 'open', eyes: 1, smile: 0.3, mouthMode: 'o', mouthOpen: 0.1, brow: 0.6, browTilt: 1, lookY: 0.5 } },
  { f: HURK, p: { rot: 22, eyes: 0, eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.1, sweat: 1, sy: 1.05 } },
  { f: BLARG - 2, p: { rot: 28, sy: 0.95 } },
  { f: BLARG, p: { rot: 34, mouthOpen: 1, sy: 1.08 }, e: E.snap },
  { f: 70, p: { rot: 30 } },
  { f: 86, p: { rot: 14, eyeMode: 'normal', eyes: 0, lid: 0.4, mouthMode: 'grin', mouthOpen: 0.1, smile: 0.4, shR: 100, elR: 50, handR: 'thumb' }, e: E.inOut },
  { f: PUKE_FRAMES, p: {} },
];

export const JokePukeScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const q = plant(poseAt(f, BASE, P_KEYS));
  const rq = rig(q);
  const head = toStage(r.headTop());
  const top = toStage(r.W(r.head, 0, -300));
  const mouth = toP(rq.mouth());
  const sick = seg(f, 6, HURK);
  const puff = seg(f, HURK, HURK + 6) * (1 - seg(f, BLARG - 1, BLARG + 1));
  const grow = seg(f, BLARG, HIT);
  const fade = seg(f, 66, 80);
  const slime = seg(f, HIT, HIT + 3);
  const cam: Cam = {
    cx: kf(f, [[0, 560], [HURK - 4, 560], [HURK + 4, 440, E.inOut], [BLARG + 2, 500], [HIT + 4, 600, E.out], [CARD, 600], [CARD + 12, 560, E.inOut]]),
    cy: kf(f, [[0, 1200], [HURK - 4, 1200], [HURK + 4, 1000, E.inOut], [BLARG + 2, 1060], [HIT + 4, 1240, E.out], [CARD, 1260], [CARD + 12, 1060, E.inOut]]),
    z: kf(f, [[0, 0.95], [HURK - 4, 0.95], [HURK + 4, 1.15, E.inOut], [BLARG + 2, 1.0], [HIT + 4, 1.1, E.out], [CARD, 1.05], [CARD + 12, 0.88, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, HIT, 16, 22, 2);

  return (
    <Stage
      bg="#1E2340"
      overlay={<EndCard f={f} start={CARD} lines={['PUKED ON']} pts="9TH" unit="PLACE" sub="AMAAN IS IN LAST" color="#6BA51E" dark="#3F6A0E" light="#DDF5B8" y={80} />}
    >
      <GlowDefs />
      {/* night street */}
      <g transform={camP(cam, 0.6, { x: sh.x * 0.3, y: sh.y * 0.3, r: 0 })}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#262B4F" />
        {Array.from({ length: 18 }).map((_, row) =>
          Array.from({ length: 10 }).map((__, col) => (
            <rect key={`${row}-${col}`} x={-600 + col * 240 + (row % 2) * 120} y={-200 + row * 110} width={228} height={98} rx={6} fill="#5C3B4B" stroke="#3E2734" strokeWidth={6} />
          )),
        )}
        <circle cx={900} cy={200} r={90} fill="#FFF0B7" />
        <rect x={-600} y={1700} width={2280} height={1200} fill="#3B3F5C" />
        <rect x={-600} y={1700} width={2280} height={22} fill="#55597A" />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Balcony f={f} />
        {/* the guy upstairs (behind the railing) */}
        <g>
          <Hero p={q} x={PX} y={PY} scale={PSC} shadow={false} headExtra={<Sick k={sick} puff={puff} />} />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={-180 + i * 60} y={850} width={14} height={164} fill="#2B2340" opacity={0.85} />
          ))}
        </g>
        <Stream a={mouth} b={top} grow={grow} fade={fade} f={f} />
        {/* lamp post */}
        <rect x={980} y={980} width={28} height={840} fill="#2B2340" stroke={INK} strokeWidth={6} />
        <Glow x={994} y={980} r={260} id="glowY" o={0.6} />
        <circle cx={994} cy={980} r={38} fill="#FFF0B7" stroke={INK} strokeWidth={7} />
        <ellipse cx={GX} cy={GY + 4} rx={220} ry={24} fill="#000" opacity={0.2} />
        {/* puddle */}
        <ellipse cx={GX + 20} cy={GY + 6} rx={260 * seg(f, HIT + 4, HIT + 24)} ry={36 * seg(f, HIT + 4, HIT + 24)} fill={GREEN} stroke={INK} strokeWidth={6} opacity={0.9} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} headExtra={<Slime k={slime} drip={f - HIT} />} />
        <Flecks f={f} start={HIT} x={top[0]} y={top[1]} n={16} seed={4} color={GREEN} speed={24} g={1.5} size={16} life={30} />
        <Flies x={head[0]} y={head[1] + 80} f={f} o={seg(f, 70, 80) * (1 - seg(f, CARD + 20, CARD + 30))} />
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={300} y={560} text="sorry bro" t={f - 88} size={48} me color={GREEN_D} side={-1} />
        </g>
        <NameTag x={head[0]} y={head[1] - 70} name="AMAAN" color={ORANGE} t={f - 4} out={seg(f, CARD - 8, CARD)} />
        <g transform={`translate(${GX - 190} ${GY - 40})`} opacity={seg(f, 8, 14)}>
          <rect x={-90} y={-46} width={180} height={92} rx={14} fill="#E2384D" stroke={INK} strokeWidth={7} />
          <text x={0} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={52} fill="#FFFFFF">LAST</text>
        </g>
      </g>
      <Sfx f={f} start={HURK} text="HURK" x={560} y={720} size={110} rot={-6} fill={'#D4F29B'} dur={14} />
      <Sfx f={f} start={BLARG} text="BLAAARGH!" x={600} y={520} size={170} rot={-8} fill={GREEN} dur={24} />
      <Sfx f={f} start={HIT + 2} text="SPLAT" x={720} y={1260} size={130} rot={6} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={84} text="...again." x={760} y={760} size={96} rot={-4} fill="#FFFFFF" dur={26} shake={false} />
      <ConfettiRain f={f} start={CARD + 2} n={36} seed={31} colors={['#6BA51E', '#DDF5B8', '#FFFFFF', '#F2853A', '#FFD064']} />
      <Sparks f={f} start={HIT} seed={12} n={0} x={0} y={0} />
    </Stage>
  );
};
