// Run #5: "GOOSE CHASE" - chill jog, HONK, flailing sprint from an angry goose that ends up sitting on his head.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, poseAt, Key, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, ConfettiRain, Dust, FocusLines, Sparks, Glint } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun, gait, runLift, STOP, TrackWorld, THEMES, WheelLegs, HY, proj, WorldObj } from './RunKit';
import { INK } from './kit';
import { TITLE_FONT } from '../fonts';

const HONK1 = 22;
const PANIC = 32;
const STOPF = 80;
const HOP = 86;
const LAND = 95;
const RUN = makeRun(
  [[0, 0.07], [PANIC - 2, 0.07], [PANIC + 3, 0.31, E.in], [STOPF - 4, 0.32], [STOPF + 4, 0.1, E.out], [STOPF + 14, 0, E.out]],
  [[0, 17], [PANIC - 2, 17], [PANIC + 3, 6, E.in], [STOPF - 4, 6], [STOPF + 6, 14, E.out]],
  [STOPF + 4, STOPF + 10],
);
const turboAt = (f: number) => seg(f, PANIC, PANIC + 4) * (1 - seg(f, STOPF, STOPF + 5));
const GX0 = 0.7;

/* ------------------------------- goose ------------------------------- */
export const Goose: React.FC<{ x: number; y: number; s: number; f: number; honk?: number; sit?: boolean; flap?: number; rot?: number }> = ({
  x, y, s, f, honk = 0, sit = false, flap = 1, rot = 0,
}) => {
  const w = Math.sin(f * 1.3) * flap;
  const run = Math.sin(f * 1.1);
  const wing = (side: -1 | 1) =>
    sit ? (
      <path transform={`scale(${side} 1)`} d="M40 -60 C110 -70 130 -10 100 30 C80 40 60 30 50 10 Z" fill="#F1EEF8" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    ) : (
      <g transform={`translate(${side * 60} -60) rotate(${side * (-30 + w * 40)}) scale(${side} 1)`}>
        <path d="M0 0 C50 -90 170 -110 220 -60 C190 -50 200 -20 170 -14 C170 10 130 20 110 10 C90 34 40 30 0 20 Z" fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <path d="M60 -30 C110 -60 160 -66 196 -50 M70 0 C110 -20 150 -24 170 -16" fill="none" stroke="#CFC8DF" strokeWidth={7} strokeLinecap="round" />
      </g>
    );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {/* legs */}
      {!sit
        ? [-1, 1].map((side) => {
            const lift = Math.max(0, side * run) * 34;
            return (
              <g key={side} transform={`translate(${side * 40} ${-40 - lift})`}>
                <line x1={0} y1={-30} x2={0} y2={36} stroke={INK} strokeWidth={22} strokeLinecap="round" />
                <line x1={0} y1={-30} x2={0} y2={36} stroke="#F7A23A" strokeWidth={12} strokeLinecap="round" />
                <path d="M0 30 L-34 54 L-12 50 L0 60 L12 50 L34 54 Z" fill="#F7A23A" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
              </g>
            );
          })
        : null}
      {wing(-1)}
      {wing(1)}
      {/* body */}
      <ellipse cx={0} cy={sit ? -40 : -110} rx={118} ry={sit ? 70 : 92} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
      <path d={sit ? 'M-80 -30 Q0 10 80 -30' : 'M-84 -90 Q0 -40 84 -90'} fill="none" stroke="#DCD6EA" strokeWidth={8} strokeLinecap="round" />
      {/* neck + head */}
      <g transform={`translate(0 ${sit ? -90 : -170}) rotate(${Math.sin(f * 0.5) * 4 * (sit ? 1 : 0.4)})`}>
        <path d="M-34 10 C-40 -60 -30 -120 -8 -170 L34 -168 C20 -120 22 -60 30 10 Z" fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <circle cx={10} cy={-200} r={58} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
        {/* angry brows + eyes */}
        <path d="M-30 -236 L2 -222 M48 -236 L18 -222" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <circle cx={-12} cy={-206} r={9} fill={INK} />
        <circle cx={32} cy={-206} r={9} fill={INK} />
        {/* beak (open when honking) */}
        <g transform={`translate(10 -178)`}>
          <path d={`M-30 -6 Q0 -14 30 -6 L0 ${26 - honk * 6} Z`} fill="#F7A23A" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          {honk > 0.1 ? <path d={`M-22 6 L22 6 L0 ${26 + honk * 26} Z`} fill="#F7A23A" stroke={INK} strokeWidth={6} strokeLinejoin="round" /> : null}
          {honk > 0.1 ? <path d={`M-14 8 L14 8 L0 ${14 + honk * 14} Z`} fill="#76223D" /> : null}
        </g>
      </g>
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const poseF = (f: number): Pose => {
  const ph = RUN.phAt(f);
  const turbo = turboAt(f);
  const g = gait(ph, turbo);
  const chill = 1 - seg(f, HONK1, HONK1 + 2);
  const alarm = seg(f, HONK1, HONK1 + 2);
  const glance = seg(f, 25, 28) * (1 - seg(f, PANIC - 1, PANIC + 1));
  let run: Pose = {
    ...BASE,
    ...g,
    eyes: chill > 0.5 ? 1 : 0,
    mouthMode: chill > 0.5 ? 'o' : turbo > 0.3 ? 'o' : 'o',
    mouthOpen: chill > 0.5 ? 0.18 : 0.6 + 0.3 * turbo,
    smile: chill > 0.5 ? 0.8 : 0.2,
    pupil: alarm ? 0.45 : 1,
    brow: lerp(0.4, 1.3, alarm),
    browTilt: lerp(0, 1, alarm),
    lid: 0,
    sweat: alarm,
    turn: 0.5 * glance,
    lookX: glance,
    torso: (g.torso ?? 0) * (1 - glance),
  };
  if (turbo > 0) {
    // arms flailing overhead
    const a = Math.sin(f * 1.1);
    run = {
      ...run,
      shL: lerp(run.shL, 150 + a * 22, turbo), elL: lerp(run.elL, -40 - a * 30, turbo),
      shR: lerp(run.shR, 150 - a * 22, turbo), elR: lerp(run.elR, -40 + a * 30, turbo),
      uaL: lerp(run.uaL, 1, turbo), uaR: lerp(run.uaR, 1, turbo), faL: lerp(run.faL, 1, turbo), faR: lerp(run.faR, 1, turbo),
      handL: 'open', handR: 'open', wrL: a * 20, wrR: -a * 20,
    };
  }
  if (f < STOPF + 2) return plant({ ...run, x: f > HONK1 && f < HONK1 + 4 ? Math.sin(f * 4) * 6 : 0 }, runLift(ph));
  const keys: Key<Pose>[] = [
    { f: STOPF + 2, p: run },
    { f: STOPF + 6, p: { ...STOP, eyes: 0 }, e: E.out },
    { f: HOP + 4, p: { sy: 1, sx: 1, torsoSy: 1, hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, lookY: -0.4, mouthMode: 'o', mouthOpen: 0.5, pupil: 0.6 }, e: E.inOut },
    // goose lands: squash + look up
    { f: LAND, p: { sy: 0.9, sx: 1.06, lookY: -1, lookX: 0.2, brow: 1.3, browTilt: 1, shL: 30, shR: 30, elL: 40, elR: 40, handL: 'open', handR: 'open' }, e: E.in },
    { f: LAND + 5, p: { sy: 1, sx: 1 }, e: E.out },
    // shrug + grin, then thumbs up
    { f: 108, p: { lookY: -0.6, mouthMode: 'grin', mouthOpen: 0.7, smile: 1, brow: 0.9, browTilt: 0.5, pupil: 1, shR: 26, elR: 142, wrR: -64, handR: 'thumb', shL: 46, elL: 70, handL: 'open', sweat: 0.6 }, e: E.back },
    { f: 150, p: {} },
  ];
  const p = poseAt(f, BASE, keys);
  return plant(p);
};

export const GooseChaseScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = poseF(f);
  const r = rig(p);
  const turbo = turboAt(f);
  const D = RUN.distAt(f);
  const scale = kf(f, [[0, 0.92], [STOPF, 0.92], [STOPF + 12, 0.98, E.out]]);
  const GX = 540;
  const GY = kf(f, [[0, 1640], [STOPF, 1640], [STOPF + 12, 1700, E.out]]);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * scale, GY + pt[1] * scale];
  const cam: Cam = {
    cx: 540 + Math.sin(f / 9) * 6 * (1 - seg(f, STOPF, STOPF + 8)),
    cy: kf(f, [[0, 1000], [14, 960, E.out], [HONK1, 960], [HONK1 + 2, 900, E.out], [PANIC, 920], [PANIC + 6, 990, E.out], [STOPF, 990], [LAND, 900, E.inOut], [112, 830, E.inOut]]),
    z: kf(f, [[0, 1.3], [14, 1, E.out], [HONK1, 1.0], [HONK1 + 2, 1.22, E.out], [PANIC, 1.18], [PANIC + 6, 1.0, E.out], [STOPF, 1.04], [LAND, 1.12, E.inOut], [112, 0.9, E.inOut]]),
    r: Math.sin(f / 7) * 0.6 * (1 - seg(f, STOPF, STOPF + 8)),
  };
  const s1 = shake(f, PANIC, 46, 8, 2);
  const s0 = shake(f, HONK1, 10, 12, 4);
  const s2 = shake(f, LAND, 12, 16, 5);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r + s2.r };
  const knees: [number, number][] = [toStage(r.W(r.lL.knee)), toStage(r.W(r.lR.knee))];
  const headTop = toStage(r.headTop());

  // goose depth: far behind -> right on his heels
  const gz = kf(f, [[0, 9], [10, 7.5], [HONK1, 3.8, E.inOut], [PANIC, 2.3, E.inOut], [PANIC + 6, 2.05], [STOPF, 1.9], [HOP, 1.85]]);
  const gp = proj(GX0 + Math.sin(f / 6) * 0.05, gz);
  const gs = gp.s * 2.0;
  const honk = Math.max(
    ...[HONK1, PANIC, 46, 58, 70].map((h) => (f >= h && f < h + 8 ? Math.sin(((f - h) / 8) * Math.PI) : 0)),
  );
  // hop onto the head
  const ht = seg(f, HOP, LAND);
  const onHead = f >= LAND;
  const hx = lerp(gp.x, headTop[0] + 6, E.inOut(ht));
  const hy = lerp(gp.y, headTop[1] + 34, ht) - Math.sin(ht * Math.PI) * 340;
  const goose =
    f < HOP ? (
      <Goose x={gp.x} y={gp.y} s={gs} f={f} honk={honk} flap={f > PANIC - 2 ? 1 : 0.4} rot={Math.sin(f * 0.55) * 4} />
    ) : !onHead ? (
      <Goose x={hx} y={hy} s={lerp(gs, 0.95, ht)} f={f} flap={1.2} honk={0.3} rot={lerp(0, -10, ht)} />
    ) : (
      <Goose x={headTop[0] + 6 + Math.sin((f - LAND) / 6) * 3} y={headTop[1] + 52} s={0.95} f={f} sit honk={f > 104 && f < 112 ? Math.sin(((f - 104) / 8) * Math.PI) : 0} />
    );
  const pond: WorldObj = {
    X: -2.6,
    Z: 3.2,
    draw: (x, y, s) => (
      <g key="pond" transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx={0} cy={-30} rx={560} ry={130} fill="#7CC6F2" stroke={INK} strokeWidth={9} />
        <ellipse cx={-80} cy={-50} rx={300} ry={50} fill="#A9DCF8" />
        {[
          [-260, -20],
          [180, -60],
          [320, -10],
        ].map(([lx, ly], i) => (
          <path key={i} d={`M${lx} ${ly} m-46 0 a46 22 0 1 0 92 0 l-46 -6 Z`} fill="#6ACC86" stroke={INK} strokeWidth={6} />
        ))}
      </g>
    ),
  };
  // whistle notes
  const notes = [4, 10, 16].map((n, i) => {
    const t = f - n;
    if (t < 0 || t > 14 || f > HONK1) return null;
    const m = toStage(r.mouth());
    return (
      <text key={i} x={m[0] + 50 + t * 4} y={m[1] - 30 - t * 6} fontFamily={TITLE_FONT} fontSize={64} fill="#7254DC" stroke={INK} strokeWidth={4} opacity={1 - seg(t, 9, 14)}>
        ♪
      </text>
    );
  });

  return (
    <Stage overlay={<EndCard f={f} start={104} lines={['GOOSE CHASE']} pts="+1.5" color="#5C7CF0" dark="#3550B8" y={96} />}>
      <GlowDefs />
      <TrackWorld f={f} D={D} cam={cam} sh={sh} theme={THEMES.day} blur={turbo} extra={[pond]} seed={13} signs={[['1 MI', RUN.distAt(40) + 0.6], ['2 MI', RUN.distAt(66) + 0.6]]} />
      <g transform={camP(cam, 1, sh)}>
        {turbo > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={640} r1={1800} n={40} opacity={0.5 * turbo} width={7} /> : null}
        {Array.from({ length: 7 }).map((_, i) => {
          const start = PANIC + 2 + i * 6;
          return f < STOPF + 2 ? <Dust key={i} f={f} start={start} x={540 + (i % 2 ? 60 : -60)} y={GY - 10} n={4} spread={160} size={50} seed={i + 30} rise={1.2} color="#F8F5FF" line="#DBC8AA" /> : null;
        })}
        {/* feathers flying off the goose */}
        {f > PANIC && f < HOP
          ? [0, 1, 2].map((i) => {
              const t = (f - PANIC + i * 9) % 26;
              return (
                <path key={i} d="M0 0 C10 -20 30 -24 40 -14 C30 -4 14 4 0 0 Z" fill="#FFFFFF" stroke={INK} strokeWidth={4} transform={`translate(${gp.x + 80 + t * 9 - i * 60} ${gp.y - 260 * gs - t * 4 + Math.sin(t / 3) * 20}) rotate(${t * 18 + i * 60})`} opacity={1 - t / 26} />
              );
            })
          : null}
        {!onHead ? goose : null}
        <Hero p={p} x={GX} y={GY} scale={scale} />
        {onHead ? goose : null}
        <WheelLegs knees={knees} f={f} o={turbo} />
        {notes}
        <Sparks f={f} start={LAND} seed={44} n={14} x={headTop[0]} y={headTop[1]} speed={[10, 22]} g={0.6} size={[12, 22]} colors={['#FFFFFF', '#FFF0B7']} />
        <Glint x={headTop[0] + 150} y={headTop[1] - 40} s={1} t={seg(f, 112, 126)} />
        <Sfx f={f} start={HONK1} text="HONK!" x={780} y={900} size={160} rot={8} fill="#FFFFFF" dur={14} />
        <Sfx f={f} start={PANIC} text="HONK HONK!" x={800} y={640} size={130} rot={-8} fill="#FFFFFF" dur={22} />
        <Sfx f={f} start={PANIC + 2} text="AAAAH!" x={290} y={1050} size={150} rot={-12} fill="#FFD064" dur={28} />
        <Sfx f={f} start={58} text="HONK!" x={800} y={1080} size={110} rot={10} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={LAND} text="PLOP." x={290} y={760} size={120} rot={-8} fill="#FFFFFF" dur={18} />
      </g>
      <ConfettiRain f={f} start={104} n={50} seed={5} />
    </Stage>
  );
};
