// Run #2: "FROST MILES" - snowy run, he slowly freezes, HEAT CHECK melts it all, steaming sprint and finish.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, poseAt, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks, Dust, FocusLines, Burst, Ring } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { cloudPath } from '../lib/shape';
import { makeRun, gait, runLift, STOP, VICTORY, TrackWorld, THEMES, WheelLegs, HY } from './RunKit';
import { Snow, Steam, INK } from './kit';

const HEAT = 44;
const RUN = makeRun(
  [[0, 0.07], [HEAT, 0.06], [HEAT + 4, 0.3, E.in], [78, 0.32], [86, 0.1, E.out], [98, 0, E.out]],
  [[0, 17], [HEAT - 6, 20], [HEAT + 4, 6, E.in], [78, 6], [88, 14, E.out]],
  [86, 94],
);
const frostAt = (f: number) => kf(f, [[0, 0.1], [HEAT - 4, 1, E.in], [HEAT + 3, 0, E.out]]);
const turboAt = (f: number) => seg(f, HEAT + 2, HEAT + 6) * (1 - seg(f, 82, 88));

const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const fr = frostAt(f);
  const turbo = turboAt(f);
  const g = gait(ph, turbo);
  const chatter = fr > 0.4 ? Math.sin(f * 2.6) : 0;
  const run: Pose = {
    ...BASE,
    ...g,
    mouthMode: fr > 0.4 ? 'grit' : 'grin',
    mouthOpen: fr > 0.4 ? 0.15 + 0.15 * chatter : g.mouthOpen ?? 0.4,
    lid: lerp(g.lid ?? 0, 0.35, fr),
    browTilt: lerp(g.browTilt ?? 0, 0.7, fr * (1 - turbo)),
    smile: lerp(g.smile ?? 1, 0.2, fr),
    sweat: fr > 0.3 ? 0 : g.sweat ?? 0,
    // arms hug in as he freezes
    elL: lerp(g.elL ?? 0, -128, fr * 0.7),
    elR: lerp(g.elR ?? 0, -128, fr * 0.7),
    shL: lerp(g.shL ?? 0, 6, fr * 0.7),
    shR: lerp(g.shR ?? 0, 6, fr * 0.7),
    x: Math.sin(f * 2.2) * 4 * fr,
  };
  if (f < HEAT && f > HEAT - 6) {
    // clench + roar
    const t = seg(f, HEAT - 6, HEAT);
    return plant({ ...run, mouthMode: 'grit', mouthOpen: lerp(0.2, 1, t), lid: 0.6, browTilt: -1, red: t, chestS: 1 + 0.1 * t, shL: lerp(run.shL, 40, t), shR: lerp(run.shR, 40, t), elL: lerp(run.elL, 120, t), elR: lerp(run.elR, 120, t), flexL: 1.6, flexR: 1.6, sy: 0.96 }, 0);
  }
  if (f < 84) return plant({ ...run, red: Math.max(0, 1 - seg(f, HEAT, HEAT + 14)) * 0.8 }, runLift(ph));
  const keys: Key<Pose>[] = [
    { f: 84, p: run },
    { f: 88, p: STOP, e: E.out },
    { f: 95, p: { sy: 0.88, sx: 1.08 }, e: E.inOut },
    { f: 99, p: { ...VICTORY, sy: 1.08, sx: 0.95 }, e: E.out },
    { f: 103, p: { sy: 0.97, sx: 1.02 }, e: E.inOut },
    { f: 107, p: { sy: 1, sx: 1 }, e: E.inOut },
    { f: 150, p: {} },
  ];
  const p = poseAt(f, BASE, keys);
  return plant({ ...p, chestS: p.chestS + (f > 107 ? Math.sin((f - 107) / 4) * 0.02 : 0) });
};

/* snow cap on the head (head-local coordinates) */
const SnowCap: React.FC<{ k: number; f: number }> = ({ k, f }) => {
  if (k <= 0.02) return null;
  const w = 150 + 150 * k;
  const h = 60 + 90 * k;
  return (
    <g transform={`translate(${Math.sin(f / 3) * 2} 0)`}>
      <path d={cloudPath(0, -300 - h * 0.25, w, h, 9)} fill="#FFFFFF" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d={cloudPath(-w * 0.12, -300 - h * 0.35, w * 0.5, h * 0.4, 4)} fill="#E4EAFF" />
      {/* icicles off the fringe */}
      {k > 0.45
        ? [-90, -40, 20, 70].map((x, i) => (
            <path key={i} d={`M${x - 12} -232 L${x + 12} -232 L${x} ${-232 + (34 + (i % 2) * 18) * (k - 0.4) * 1.6} Z`} fill="#DFF3FF" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          ))
        : null}
    </g>
  );
};

export const FrostMilesScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const fr = frostAt(f);
  const turbo = turboAt(f);
  const D = RUN.distAt(f);
  const scale = kf(f, [[0, 0.92], [84, 0.92], [98, 1.0, E.out]]);
  const GX = 540;
  const GY = kf(f, [[0, 1640], [84, 1640], [98, 1720, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const cam: Cam = {
    cx: 540 + Math.sin(f / 9) * 6 * (1 - seg(f, 84, 92)),
    cy: kf(f, [[0, 1000], [14, 960, E.out], [HEAT - 6, 960], [HEAT, 1000, E.out], [HEAT + 6, 990], [82, 990], [98, 960, E.out]]),
    z: kf(f, [[0, 1.3], [14, 1, E.out], [HEAT - 6, 1.0], [HEAT, 1.18, E.out], [HEAT + 5, 1.02, E.out], [82, 1.06], [92, 1.0, E.out], [135, 1.03]]),
    r: Math.sin(f / 7) * 0.6 * (1 - seg(f, 84, 92)),
  };
  const s0 = shake(f, 4, HEAT - 6, 3 * fr, 1);
  const s1 = shake(f, HEAT, 22, 30, 2);
  const s2 = shake(f, 82, 14, 18, 5);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r + s2.r };
  const mouth = toStage(r.mouth());
  const knees: [number, number][] = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];
  const shoulderL = toStage(r.W(r.torso, -120, -270));
  const shoulderR = toStage(r.W(r.torso, 120, -270));
  const head = toStage(r.headTop());
  // frost colour matrix
  const k = fr * 0.85;
  const frost = `${1 - 0.35 * k} ${0.1 * k} ${0.15 * k} 0 ${0.12 * k}  ${0.05 * k} ${1 - 0.2 * k} ${0.15 * k} 0 ${0.14 * k}  0 ${0.1 * k} ${1 - 0.05 * k} 0 ${0.2 * k}  0 0 0 1 0`;
  const steamO = seg(f, HEAT, HEAT + 4) * (f < 84 ? 0.8 : 0.9);
  // breath puffs each stride while cold
  const breaths = [8, 18, 28, 38].filter((b) => f >= b && f < b + 16);

  return (
    <Stage impact={f === HEAT} overlay={<EndCard f={f} start={102} lines={['FROST MILES']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <defs>
        <filter id="frostF">
          <feColorMatrix type="matrix" values={frost} />
        </filter>
      </defs>
      <TrackWorld f={f} D={D} cam={cam} sh={sh} theme={THEMES.snow} blur={turbo} signs={[['1 MI', RUN.distAt(30) + 0.6], ['2 MI', RUN.distAt(64) + 0.6]]} seed={7} />
      <g transform={camP(cam, 1, sh)}>
        {/* melt ring on the track */}
        <Ring x={540} y={GY} t={seg(f, HEAT, HEAT + 20)} r={620} sy={0.24} color="#FFB36B" w={36} />
        <Glow x={540} y={GY - 500} r={kf(f, [[HEAT - 1, 0], [HEAT + 3, 760, E.out], [HEAT + 20, 380], [HEAT + 30, 0]])} id="glowY" o={0.9} />
        <Burst x={540} y={GY - 520} r={460} t={seg(f, HEAT, HEAT + 16)} seed={6} fill="#FFB36B" fill2="#FFF0B7" />
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1800} n={40} opacity={0.5 * turbo} width={7} /> : null}
        {/* steam trail behind */}
        {f >= HEAT
          ? [0, 1, 2, 3, 4].map((i) => (
              <Steam key={i} x={360 + i * 90} y={GY - 300 - (i % 2) * 120} f={f + i * 7} h={360} o={steamO * 0.55 * (f < 90 ? 1 : 1 - seg(f, 100, 120))} w={26} seed={i + 2} />
            ))
          : null}
        {Array.from({ length: 6 }).map((_, i) => {
          const start = HEAT + 4 + i * 6;
          return f < 86 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={50} seed={i + 30} rise={1.2} color="#FFFFFF" line="#B9C4EE" /> : null;
        })}
        <g filter={fr > 0.02 ? 'url(#frostF)' : undefined}>
          <Hero p={p} x={GX} y={GY} scale={scale} headExtra={<SnowCap k={fr} f={f} />} />
        </g>
        <WheelLegs knees={knees} f={f} o={turbo} />
        {/* breath */}
        {breaths.map((b) => {
          const t = (f - b) / 16;
          return (
            <g key={b} opacity={1 - t} transform={`translate(${mouth[0] + 30 + t * 70} ${mouth[1] - t * 40}) scale(${0.4 + t * 0.9})`}>
              <path d={cloudPath(0, 0, 120, 70, b)} fill="#FFFFFF" stroke="#B9C4EE" strokeWidth={6} />
            </g>
          );
        })}
        {/* shoulder steam after the heat check */}
        {[shoulderL, shoulderR, head].map(([x, y], i) => (
          <Steam key={i} x={x} y={y - (i === 2 ? 20 : 0)} f={f + i * 11} h={180} o={steamO} w={18} seed={i + 9} />
        ))}
        {/* the snow cap blasting off */}
        {f >= HEAT && f < HEAT + 26
          ? [0, 1, 2, 3, 4, 5].map((i) => {
              const t = f - HEAT;
              const a = (-150 + i * 24) * (Math.PI / 180);
              const x = head[0] + Math.cos(a) * t * 22;
              const y = head[1] + Math.sin(a) * t * 22 + t * t * 0.9;
              return (
                <g key={i} transform={`translate(${x} ${y}) rotate(${t * 20 + i * 40})`} opacity={1 - seg(t, 16, 26)}>
                  <path d={cloudPath(0, 0, 70, 46, i + 2)} fill="#FFFFFF" stroke={INK} strokeWidth={5} />
                </g>
              );
            })
          : null}
        <Sparks f={f} start={HEAT} seed={14} n={26} x={540} y={GY - 520} speed={[18, 40]} g={0.8} size={[14, 26]} colors={['#FFB36B', '#FFD064', '#FFFFFF']} />
        <Sparks f={f} start={86} seed={15} n={16} x={540} y={GY} speed={[10, 26]} g={1} shape="drop" colors={['#A6DCFF']} size={[12, 22]} />
        <Sfx f={f} start={14} text="BRRR!" x={260} y={760} size={140} rot={-10} fill="#DFF3FF" dur={22} />
        <Sfx f={f} start={30} text="*chatter*" x={800} y={900} size={80} rot={8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={HEAT} text="HEAT CHECK!" x={540} y={620} size={150} rot={-6} fill="#FFB36B" dur={30} />
        <Sfx f={f} start={88} text="TSSSS..." x={790} y={1380} size={100} rot={8} fill="#FFFFFF" dur={20} />
      </g>
      <g transform={camP(cam, 0, sh)}>
        <Snow f={f} n={70} speed={f > HEAT ? 3 : 6} wind={turbo > 0.3 ? -1 : -3} o={f > HEAT ? 0.75 : 1} />
      </g>
      <ConfettiRain f={f} start={100} n={50} seed={5} colors={['#FFFFFF', '#A6DCFF', '#5C7CF0', '#FFD064', '#BCABFF']} />
    </Stage>
  );
};

