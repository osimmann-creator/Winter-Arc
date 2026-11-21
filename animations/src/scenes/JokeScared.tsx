// Inside joke: "SCARED OF GIRLS" - a month without a single date. Then she texts "hey :)". He hides under the table.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp, springAt } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, Bubble, HandPhone } from './jokekit';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { heartPath } from '../lib/shape';

export const SCARED_FRAMES = 165;
const SC = 0.78;
const GY = 1800;
const BUZZ = 18;
const FREEZE = 26;
const SCREAM = 32;
const HIDE = 46;
const CARD = 122;
const PINK = '#E2407E';
const PINK_D = '#A0255A';
const TABLE_Y = 1430;

/* ------------------------------- props ------------------------------- */
const Notification: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t < 0) return null;
  const k = clamp(springAt(t, 0, 10, 1.4, 5), 0, 1.15);
  return (
    <g transform={`translate(${x} ${y}) scale(${k}) rotate(-3)`}>
      <rect x={-260} y={-80} width={520} height={160} rx={36} fill={INK} transform="translate(0 12)" />
      <rect x={-260} y={-80} width={520} height={160} rx={36} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
      <rect x={-232} y={-52} width={104} height={104} rx={26} fill={PINK} stroke={INK} strokeWidth={6} />
      <path d={heartPath(-180, 2, 34)} fill="#FFFFFF" />
      <text x={-104} y={-24} dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill={INK}>NEW MESSAGE</text>
      <text x={-104} y={30} dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={56} fill={PINK} letterSpacing={1}>hey :)</text>
    </g>
  );
};

const Table: React.FC<{ f: number; shake: number }> = ({ f, shake: sk }) => (
  <g transform={`translate(${Math.sin(f * 3.1) * sk * 6} 0)`}>
    {/* candle */}
    <rect x={760} y={TABLE_Y - 130} width={36} height={120} rx={8} fill="#FFFDF6" stroke={INK} strokeWidth={6} />
    <path d={`M778 ${TABLE_Y - 136} q-18 -30 0 -60 q18 30 0 60 Z`} fill="#FFB347" stroke={INK} strokeWidth={5} />
    {/* rose in a vase */}
    <rect x={830} y={TABLE_Y - 110} width={60} height={100} rx={20} fill="#BCD3FF" stroke={INK} strokeWidth={6} opacity={0.9} />
    <line x1={860} y1={TABLE_Y - 110} x2={856} y2={TABLE_Y - 200} stroke="#2FA36B" strokeWidth={8} />
    <circle cx={856} cy={TABLE_Y - 214} r={24} fill="#E2384D" stroke={INK} strokeWidth={6} />
    {/* table + cloth */}
    <rect x={180} y={TABLE_Y} width={720} height={30} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
    <path d={`M180 ${TABLE_Y + 20} L900 ${TABLE_Y + 20} L930 1810 Q540 1840 150 1810 Z`} fill="#FFFFFF" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
    <path d={`M150 1810 Q540 1840 930 1810`} fill="none" stroke={PINK} strokeWidth={14} />
    {[260, 400, 540, 680, 820].map((x) => (
      <path key={x} d={`M${x} ${TABLE_Y + 40} Q${x - 10} 1650 ${x - 20} 1800`} fill="none" stroke="#F1E3EC" strokeWidth={10} />
    ))}
  </g>
);

const Calendar30: React.FC = () => (
  <g transform="translate(860 520) rotate(4)">
    <rect x={-150} y={-130} width={300} height={290} rx={16} fill={INK} transform="translate(6 10)" />
    <rect x={-150} y={-130} width={300} height={290} rx={16} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
    <rect x={-150} y={-130} width={300} height={60} rx={16} fill={PINK} stroke={INK} strokeWidth={8} />
    <text x={0} y={-98} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#FFFFFF">DATES: 0</text>
    {Array.from({ length: 30 }).map((_, i) => {
      const x = -125 + (i % 6) * 50;
      const y = -50 + Math.floor(i / 6) * 42;
      return <path key={i} d={`M${x} ${y} l26 26 M${x + 26} ${y} l-26 26`} stroke="#E2384D" strokeWidth={6} strokeLinecap="round" />;
    })}
  </g>
);

/* ------------------------------- poses ------------------------------- */
const COOL: Partial<Pose> = {
  shL: 30, elL: 120, handL: 'fist', shR: 22, elR: 120, wrR: -10, handR: 'grip', hipL: 8, hipR: 8, knL: -4, knR: -4,
  eyes: 0, wink: 1, smile: 1, mouthMode: 'grin', mouthOpen: 0.4, mouthSkew: 0.6, brow: 0.9, lookX: 0, lookY: 0, chestS: 1.04,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...COOL } },
  { f: BUZZ - 2, p: {} },
  { f: BUZZ + 4, p: { wink: 0, eyes: 0, lookX: 0.6, lookY: 0.5, turn: 0.2, smile: 0.6, mouthMode: 'o', mouthOpen: 0.2, mouthSkew: 0, brow: 0.6 } },
  { f: FREEZE, p: { eyeMode: 'normal', pupil: 0.35, brow: 1.6, browTilt: 1.2, mouthMode: 'o', mouthOpen: 0.5, sweat: 1, sy: 1.04, sx: 0.97, chestS: 1 }, e: E.snap },
  { f: SCREAM, p: { shL: 160, elL: -10, shR: 160, elR: -10, handL: 'open', handR: 'open', mouthOpen: 1, pupil: 0.3, hipL: 30, knL: -60, hipR: 20, knR: -40 }, e: E.back },
  { f: HIDE - 4, p: { shL: 150, shR: 150 } },
  // crouched behind the table, trembling
  { f: HIDE + 4, p: { hipL: 80, knL: -140, hipR: 80, knR: -140, thL: 0.9, thR: 0.9, shL: 40, elL: 150, shR: 40, elR: 150, handL: 'open', handR: 'open', torsoSy: 0.92, head: 0, lookX: 0.8, turn: 0.2, pupil: 0.5, mouthMode: 'grit', mouthOpen: 0.4, sweat: 1, sy: 1, sx: 1 }, e: E.out },
  { f: 70, p: { lookX: 0.9, pupil: 0.4 } },
  { f: 84, p: { head: -6, lookX: 0.2, lookY: 0.2, mouthMode: 'o', mouthOpen: 0.3 } },
  { f: SCARED_FRAMES, p: {} },
];

export const JokeScaredScene: React.FC = () => {
  const f = useCurrentFrame();
  let p = poseAt(f, BASE, KEYS);
  const hidden = f >= HIDE;
  const tremble = hidden ? Math.sin(f * 3.3) * 3 : 0;
  p = plant(p, f >= SCREAM && f < SCREAM + 14 ? Math.sin(((f - SCREAM) / 14) * Math.PI) * 170 : 0);
  const gx = (f < HIDE - 6 ? 330 : lerp(330, 560, E.inOut(seg(f, HIDE - 6, HIDE + 2)))) + tremble;
  const r = rig(p);
  const head = stageOf(gx, GY, SC)(r.headTop());
  const phone = stageOf(gx, GY, SC)(r.handR());
  const cam: Cam = {
    cx: kf(f, [[0, 480], [BUZZ, 480], [FREEZE, 420, E.out], [SCREAM + 6, 540, E.inOut], [CARD, 560], [CARD + 12, 540, E.inOut]]),
    cy: kf(f, [[0, 1180], [BUZZ, 1180], [FREEZE, 1080, E.out], [SCREAM + 6, 1160, E.inOut], [HIDE + 8, 1300, E.out], [CARD, 1300], [CARD + 12, 1060, E.inOut]]),
    z: kf(f, [[0, 1.0], [BUZZ, 1.0], [FREEZE, 1.3, E.out], [SCREAM + 6, 1.0, E.inOut], [HIDE + 8, 1.15, E.out], [CARD, 1.15], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, SCREAM, 18, 20, 2);
  const hearts = [58, 72, 90];

  return (
    <Stage
      bg="#3A1F5C"
      overlay={<EndCard f={f} start={CARD} lines={['SCARED OF', 'GIRLS']} pts="0" unit="DATES" sub="30 DAYS. ZERO DATES." color={PINK} dark={PINK_D} light="#FFD0E2" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.6, { x: sh.x * 0.3, y: sh.y * 0.3, r: 0 })}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#4B2A70" />
        {Array.from({ length: 20 }).map((_, i) => (
          <rect key={i} x={-600 + i * 120} y={-600} width={56} height={3200} fill="#54317C" />
        ))}
        {/* string lights */}
        <path d="M-300 300 Q540 460 1400 300" fill="none" stroke={INK} strokeWidth={6} />
        {Array.from({ length: 13 }).map((_, i) => {
          const t = (i + 0.5) / 13;
          const x = -300 + t * 1700;
          const y = 300 + Math.sin(t * Math.PI) * 120;
          return (
            <g key={i}>
              <Glow x={x} y={y + 20} r={70} id="glowY" o={0.5} />
              <circle cx={x} cy={y + 20} r={14} fill="#FFE08A" stroke={INK} strokeWidth={4} />
            </g>
          );
        })}
        <Calendar30 />
        <rect x={-600} y={1660} width={2280} height={1200} fill="#7A4A6E" />
        <rect x={-600} y={1660} width={2280} height={18} fill="#5E3757" />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <ellipse cx={gx} cy={GY + 4} rx={200} ry={22} fill="#000" opacity={0.2} />
        <Hero p={p} x={gx} y={GY} scale={SC} shadow={false} itemR={f < SCREAM + 2 ? <HandPhone color={PINK} dark={PINK_D} glow={f >= BUZZ ? 1 : 0} /> : undefined} />
        {/* the phone flies off when he screams */}
        {f >= SCREAM + 2 && f < SCREAM + 34 ? (
          <g transform={`translate(${phone[0] + (f - SCREAM) * 10} ${1100 - (f - SCREAM) * 30 + (f - SCREAM) ** 2 * 1.6}) rotate(${(f - SCREAM) * 28}) scale(1.4)`}>
            <HandPhone color={PINK} dark={PINK_D} glow={1} />
          </g>
        ) : null}
        <Table f={f} shake={hidden ? 1 : 0} />
        {/* hearts floating his way */}
        {hearts.map((h, i) => {
          const t = f - h;
          if (t < 0 || t > 30) return null;
          const x = lerp(1100, head[0] + 120, t / 30);
          const y = lerp(900 + i * 80, head[1] + 160, t / 30) + Math.sin(t / 3) * 20;
          return <path key={i} d={heartPath(x, y, 40 * (1 - seg(t, 24, 30) * 0.6))} fill={PINK} stroke={INK} strokeWidth={6} opacity={1 - seg(t, 26, 30)} />;
        })}
        <Notification x={Math.min(780, phone[0] + 120)} y={phone[1] - 300} t={f < SCREAM + 2 ? f - BUZZ : -1} />
        <g opacity={1 - seg(f, CARD - 6, CARD)}>
          <Bubble x={230} y={TABLE_Y - 320} text="not today" t={f - 84} size={56} me color={PINK} side={-1} />
        </g>
        {!hidden ? <NameTag x={head[0]} y={head[1] - 60} name="THE FELLAS" color={PINK} t={f - 4} s={0.9} /> : null}
        <Sparks f={f} start={FREEZE} seed={4} n={8} x={head[0]} y={head[1] + 80} speed={[10, 18]} g={0.8} size={[10, 16]} colors={['#A6DCFF', '#FFFFFF']} shape="drop" />
      </g>
      <Sfx f={f} start={BUZZ} text="BZZT" x={850} y={1260} size={100} rot={8} fill="#FFD0E2" dur={10} />
      <Sfx f={f} start={FREEZE} text="!!!" x={540} y={560} size={170} rot={-4} fill="#FFFFFF" dur={8} />
      <Sfx f={f} start={SCREAM} text="AAAAH!" x={560} y={520} size={190} rot={-6} fill={PINK} dur={20} />
      <Sfx f={f} start={70} text="*shaking*" x={760} y={1720} size={80} rot={-4} fill="#FFFFFF" dur={30} shake />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={47} colors={[PINK, '#FFD0E2', '#FFFFFF', '#7254DC', '#FFD064']} hearts />
    </Stage>
  );
};
