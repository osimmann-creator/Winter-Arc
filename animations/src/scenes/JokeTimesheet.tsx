// Inside joke: "THE TIME SHEET" - Jake hits 7 points on a weekend, so he's out. And his work time sheet
// is due at 11:59. He pulls a laptop out at the club and files it with seconds to spare.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { LOOKS } from '../hero/looks';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp, springAt } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Sparks, Burst, Twinkle } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE, Bubble, WallClock, HandPhone } from './jokekit';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { rng, softStar } from '../lib/shape';

export const TIMESHEET_FRAMES = 165;
const GX = 540;
const GY = 1800;
const SC = 0.8;
const toStage = stageOf(GX, GY, SC);
const BEAT = 14;
const BUZZ = 16;
const READ = 24;
const POP = 31;
const SLAM = 36;
const TYPE = 42;
const FILLS = [48, 54, 60, 66, 72];
const PRESS = 92;
const VICTORY = 102;
const CARD = 122;
const TABLE_Y = 1450;
const SHEET_Y = 370;
const [ORANGE, ORANGE_D, ORANGE_L] = PEOPLE.jake;
const NEON = ['#FF4FA3', '#3DE0FF', '#FFE15C', '#8C6CFF'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const beatPh = (f: number) => (f / BEAT) * Math.PI * 2;
const hit = (f: number) => Math.pow(Math.max(0, Math.cos(beatPh(f))), 6);

/* ------------------------------- the club ------------------------------- */
const DiscoBall: React.FC<{ f: number }> = ({ f }) => {
  const rot = (f * 4) % 60;
  return (
    <g transform="translate(540 90)">
      <line x1={0} y1={-900} x2={0} y2={-74} stroke={INK} strokeWidth={6} />
      <circle r={76} fill="#B9C0D6" stroke={INK} strokeWidth={8} />
      <clipPath id="ballclip">
        <circle r={72} />
      </clipPath>
      <g clipPath="url(#ballclip)">
        {Array.from({ length: 9 }).map((_, row) =>
          Array.from({ length: 9 }).map((__, col) => {
            const x = -80 + col * 20 + ((rot + row * 7) % 20);
            const y = -80 + row * 20;
            const lit = (row * 3 + col + Math.floor(f / 3)) % 7 === 0;
            return <rect key={`${row}-${col}`} x={x} y={y} width={17} height={17} rx={3} fill={lit ? '#FFFFFF' : (row + col) % 2 ? '#D9DEEC' : '#9AA2BE'} />;
          }),
        )}
      </g>
      <circle r={76} fill="none" stroke={INK} strokeWidth={8} />
      <Twinkle x={-30} y={-30} s={1.1} t={0.5 + 0.4 * Math.sin(f / 4)} />
    </g>
  );
};

const Beams: React.FC<{ f: number }> = ({ f }) => (
  <g style={{ mixBlendMode: 'screen' }}>
    {[
      { x: 120, a: -24, sp: 21, c: NEON[0] },
      { x: 540, a: 0, sp: 17, c: NEON[1] },
      { x: 960, a: 24, sp: 25, c: NEON[2] },
      { x: 330, a: -8, sp: 13, c: NEON[3] },
    ].map((b, i) => {
      const ang = b.a + Math.sin(f / b.sp + i * 1.7) * 26;
      return (
        <g key={i} transform={`translate(${b.x} -420) rotate(${ang})`}>
          <path d="M-26 0 L26 0 L300 2900 L-300 2900 Z" fill={b.c} opacity={0.13 + 0.07 * hit(f + i * 3)} />
          <path d="M-12 0 L12 0 L110 2900 L-110 2900 Z" fill="#FFFFFF" opacity={0.06} />
        </g>
      );
    })}
  </g>
);

const Speaker: React.FC<{ x: number; f: number; flip?: boolean }> = ({ x, f, flip }) => {
  const k = 1 + 0.07 * hit(f);
  return (
    <g transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`}>
      {[700, 1130].map((y, i) => (
        <g key={y}>
          <rect x={-130} y={y} width={260} height={i ? 520 : 420} rx={20} fill="#1A1530" stroke={INK} strokeWidth={9} />
          <circle cx={0} cy={y + (i ? 300 : 230)} r={(i ? 100 : 86) * k} fill="#2E2752" stroke={INK} strokeWidth={8} />
          <circle cx={0} cy={y + (i ? 300 : 230)} r={(i ? 44 : 36) * k} fill="#463C78" stroke={INK} strokeWidth={6} />
          <circle cx={0} cy={y + (i ? 96 : 84)} r={34} fill="#2E2752" stroke={INK} strokeWidth={6} />
        </g>
      ))}
    </g>
  );
};

const Dancer: React.FC<{ x: number; y: number; s: number; f: number; ph: number; c: string; rim: string }> = ({ x, y, s, f, ph, c, rim }) => {
  const b = Math.sin(beatPh(f) + ph);
  const lift = Math.abs(b) * 14;
  const up = Math.sin(beatPh(f) / 2 + ph) > 0;
  const armL = up ? `M-62 -250 L-130 -400 L-120 -520` : `M-62 -250 L-140 -160 L-90 -60`;
  const armR = up ? `M62 -250 L150 -380 L160 -500` : `M62 -250 L150 -170 L120 -70`;
  return (
    <g transform={`translate(${x} ${y - lift}) rotate(${b * 4}) scale(${s})`}>
      <path d="M-46 -10 L-40 220 M46 -10 L40 220" stroke={c} strokeWidth={54} strokeLinecap="round" />
      <path d={armL} fill="none" stroke={c} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
      <path d={armR} fill="none" stroke={c} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={-84} y={-290} width={168} height={300} rx={60} fill={c} />
      <circle cx={0} cy={-350} r={66} fill={c} />
      <path d="M-56 -384 A66 66 0 0 1 40 -404" fill="none" stroke={rim} strokeWidth={8} strokeLinecap="round" opacity={0.8} />
      <path d="M-74 -250 Q-80 -120 -70 -10" fill="none" stroke={rim} strokeWidth={8} strokeLinecap="round" opacity={0.6} />
    </g>
  );
};

const DanceFloor: React.FC<{ f: number }> = ({ f }) => {
  const step = Math.floor(f / BEAT);
  return (
    <g>
      <rect x={-600} y={1620} width={2280} height={1400} fill="#191330" />
      {Array.from({ length: 11 }).map((_, row) =>
        Array.from({ length: 14 }).map((__, col) => {
          const lit = (row * 5 + col * 3 + step) % 4 === 0;
          const c = NEON[(row + col + step) % 4];
          return (
            <rect
              key={`${row}-${col}`}
              x={-600 + col * 170 + 8}
              y={1640 + row * 130 + 8}
              width={154}
              height={114}
              rx={12}
              fill={lit ? c : '#2A2148'}
              opacity={lit ? 0.75 + 0.25 * hit(f) : 1}
            />
          );
        }),
      )}
      <rect x={-600} y={1620} width={2280} height={20} fill="#0F0B1F" />
    </g>
  );
};

/* ------------------------------- props ------------------------------- */
const Notification: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t < 0) return null;
  const k = clamp(springAt(t, 0, 10, 1.4, 5), 0, 1.15);
  return (
    <g transform={`translate(${x} ${y}) scale(${k}) rotate(-3)`}>
      <rect x={-270} y={-80} width={540} height={160} rx={36} fill={INK} transform="translate(0 12)" />
      <rect x={-270} y={-80} width={540} height={160} rx={36} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
      <rect x={-242} y={-52} width={104} height={104} rx={26} fill="#E2384D" stroke={INK} strokeWidth={6} />
      <circle cx={-190} cy={0} r={32} fill="#FFFFFF" />
      <path d="M-190 -20 V0 L-174 10" fill="none" stroke="#E2384D" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <text x={-114} y={-24} dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={42} fill={INK}>TIME SHEET DUE</text>
      <text x={-114} y={30} dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={50} fill="#E2384D" letterSpacing={1}>tonight 11:59 PM</text>
    </g>
  );
};

/** Laptop on the bar table, seen from behind: the lid's back faces us. open: 0 = shut, 1 = upright. */
const Laptop: React.FC<{ open: number; pop: number }> = ({ open, pop }) => {
  if (pop <= 0.01) return null;
  const lidH = 176 * open;
  return (
    <g transform={`translate(${GX} ${TABLE_Y - 6}) scale(${pop})`}>
      {/* base */}
      <rect x={-176} y={-26} width={352} height={30} rx={10} fill="#8C93AD" stroke={INK} strokeWidth={8} />
      {lidH > 4 ? (
        <g>
          {/* screen light spilling over the top edge */}
          <rect x={-158} y={-lidH - 26} width={316} height={18} rx={9} fill="#BFE6FF" opacity={0.9 * open} />
          <rect x={-166} y={-lidH - 18} width={332} height={lidH} rx={18} fill="#4A5068" stroke={INK} strokeWidth={9} />
          <rect x={-148} y={-lidH} width={296} height={Math.max(0, lidH - 32)} rx={12} fill="#565D78" />
          {open > 0.6 ? (
            <g opacity={seg(open, 0.6, 0.9)}>
              {/* stickers */}
              <g transform={`translate(-84 ${-lidH * 0.6}) rotate(-12) scale(0.8)`}>
                <circle r={40} fill={ORANGE} stroke={INK} strokeWidth={6} />
                <path d="M-40 0 H40 M0 -40 V40 M-28 -28 Q0 0 -28 28 M28 -28 Q0 0 28 28" fill="none" stroke={INK} strokeWidth={5} />
              </g>
              <g transform={`translate(64 ${-lidH * 0.36}) rotate(10) scale(0.8)`}>
                <path d={softStar(0, 0, 44, 20, 5)} fill="#FFD064" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
              </g>
              <g transform={`translate(70 ${-lidH * 0.78}) rotate(6) scale(0.8)`}>
                <rect x={-58} y={-24} width={116} height={48} rx={12} fill="#FFFFFF" stroke={INK} strokeWidth={5} />
                <text x={0} y={3} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={30} fill={ORANGE_D}>9 TO 5</text>
              </g>
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

const Table: React.FC = () => (
  <g>
    <rect x={GX - 22} y={TABLE_Y + 30} width={44} height={GY - TABLE_Y - 30} fill="#2B2340" stroke={INK} strokeWidth={8} />
    <ellipse cx={GX} cy={GY} rx={130} ry={24} fill="#2B2340" stroke={INK} strokeWidth={8} />
    <ellipse cx={GX} cy={TABLE_Y + 20} rx={340} ry={50} fill="#1E1836" stroke={INK} strokeWidth={9} />
    <ellipse cx={GX} cy={TABLE_Y + 8} rx={340} ry={46} fill="#3D3360" stroke={INK} strokeWidth={9} />
    <path d={`M${GX - 300} ${TABLE_Y - 4} Q${GX} ${TABLE_Y - 40} ${GX + 300} ${TABLE_Y - 4}`} fill="none" stroke="#6E62A6" strokeWidth={8} strokeLinecap="round" opacity={0.7} />
  </g>
);

const Drink: React.FC<{ hop: number; tilt: number }> = ({ hop, tilt }) => (
  <g transform={`translate(${GX + 250} ${TABLE_Y + 6 - hop}) rotate(${tilt})`}>
    <line x1={14} y1={-150} x2={44} y2={-230} stroke="#FF4FA3" strokeWidth={10} strokeLinecap="round" />
    <path d="M-46 -170 L46 -170 L38 0 L-38 0 Z" fill="#DDF6FF" stroke={INK} strokeWidth={7} strokeLinejoin="round" opacity={0.95} />
    <path d="M-42 -120 L42 -120 L37 -6 L-37 -6 Z" fill="#3DE0FF" opacity={0.85} />
    <rect x={-26} y={-112} width={30} height={30} rx={6} fill="#FFFFFF" stroke="#8FD3EA" strokeWidth={4} transform="rotate(-12 -11 -97)" />
    <rect x={2} y={-84} width={28} height={28} rx={6} fill="#FFFFFF" stroke="#8FD3EA" strokeWidth={4} transform="rotate(14 16 -70)" />
    <path d="M-64 -176 A30 30 0 0 1 -14 -176 Z" fill="#7BD34A" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <rect x={-32} y={-160} width={10} height={140} rx={5} fill="#FFFFFF" opacity={0.5} />
  </g>
);

/** The time sheet, as a big pop-up window (screen space). */
const Sheet: React.FC<{ f: number }> = ({ f }) => {
  const t = f - (TYPE - 2);
  if (t < 0) return null;
  const k = clamp(springAt(t, 0, 12, 1.4, 5), 0, 1.15) * (1 - E.in(seg(f, VICTORY - 4, VICTORY + 2)));
  if (k <= 0.01) return null;
  const secs = Math.min(59, Math.floor(lerp(14, 59.99, seg(f, TYPE, PRESS))));
  const filled = FILLS.filter((x) => f >= x).length;
  const ready = f >= FILLS[4] + 4;
  const pressed = f >= PRESS;
  const pulse = ready && !pressed ? 1 + 0.07 * Math.sin(f * 0.9) : 1;
  const st = f - (PRESS + 2);
  const stampK = st < 0 ? 0 : lerp(2.4, 1, E.out(seg(st, 0, 5)));
  const crunch = !pressed && secs >= 45;
  return (
    <g transform={`translate(540 ${SHEET_Y}) rotate(-2) scale(${k})`}>
      <rect x={-410} y={-220} width={820} height={440} rx={34} fill={INK} transform="translate(0 16)" />
      <rect x={-410} y={-220} width={820} height={440} rx={34} fill="#FFFDF8" stroke={INK} strokeWidth={10} />
      <path d="M-405 -150 V-186 Q-405 -215 -376 -215 H376 Q405 -215 405 -186 V-150 Z" fill={ORANGE} />
      <line x1={-405} y1={-150} x2={405} y2={-150} stroke={INK} strokeWidth={8} />
      <rect x={-380} y={-206} width={760} height={12} rx={6} fill="#FFFFFF" opacity={0.3} />
      <text x={-372} y={-178} dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={52} fill="#FFFFFF" stroke={INK} strokeWidth={9} paintOrder="stroke">
        TIME SHEET
      </text>
      <text
        x={374}
        y={-178}
        textAnchor="end"
        dominantBaseline="middle"
        fontFamily={TITLE_FONT}
        fontSize={44}
        fill={crunch ? (Math.floor(f / 3) % 2 ? '#FFE15C' : '#FFFFFF') : '#FFFFFF'}
        stroke={INK}
        strokeWidth={8}
        paintOrder="stroke"
      >
        {`11:59:${String(secs).padStart(2, '0')} PM`}
      </text>
      <g transform="translate(-372 -104)">
        <rect x={0} y={-26} width={292} height={52} rx={26} fill="#E2384D" stroke={INK} strokeWidth={6} />
        <text x={146} y={3} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={34} fill="#FFFFFF">
          DUE 11:59 PM
        </text>
      </g>
      {DAYS.map((d, i) => {
        const ft = f - FILLS[i];
        const fk = ft < 0 ? 0 : clamp(springAt(ft, 0, 8, 1.5, 5), 0, 1.25);
        return (
          <g key={d} transform={`translate(${-300 + i * 150} 0)`}>
            <text x={0} y={-34} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={34} fill="#7A6E8F">
              {d}
            </text>
            <rect x={-58} y={-6} width={116} height={96} rx={18} fill={ft >= 0 ? ORANGE_L : '#FFFFFF'} stroke={INK} strokeWidth={7} />
            {ft >= 0 ? (
              <g transform={`translate(0 46) scale(${fk})`}>
                <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={72} fill={ORANGE} stroke={INK} strokeWidth={8} paintOrder="stroke">
                  8
                </text>
              </g>
            ) : (
              <rect x={-4} y={22} width={8} height={50} rx={4} fill={INK} opacity={i === filled && Math.floor(f / 4) % 2 ? 0.8 : 0} />
            )}
          </g>
        );
      })}
      <text x={-372} y={160} dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={42} fill={INK}>
        {`TOTAL: ${filled * 8} HRS`}
      </text>
      <g transform={`translate(250 160) scale(${pressed && f < PRESS + 4 ? 0.88 : pulse})`}>
        <rect x={-122} y={-38} width={244} height={76} rx={38} fill={INK} transform="translate(0 8)" />
        <rect x={-122} y={-38} width={244} height={76} rx={38} fill={ready ? '#45B87A' : '#C9C3D6'} stroke={INK} strokeWidth={7} />
        <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFFFF" stroke={INK} strokeWidth={7} paintOrder="stroke">
          SUBMIT
        </text>
      </g>
      {stampK > 0 ? (
        <g transform={`translate(0 36) rotate(-9) scale(${stampK})`} opacity={seg(st, 0, 2)}>
          <rect x={-330} y={-74} width={660} height={148} rx={26} fill="#FFFFFF" opacity={0.85} />
          <rect x={-330} y={-74} width={660} height={148} rx={26} fill="none" stroke="#2FA36B" strokeWidth={14} />
          <text x={0} y={8} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={100} fill="#2FA36B" letterSpacing={2}>
            SUBMITTED
          </text>
        </g>
      ) : null}
    </g>
  );
};

/* ------------------------------- poses ------------------------------- */
const IDLE: Partial<Pose> = { hipL: 8, hipR: 8, knL: -6, knR: -6 };
const PARTY: Partial<Pose> = {
  ...IDLE, shL: 150, elL: -20, handL: 'fist', shR: 60, elR: 100, handR: 'fist', eyes: 1, smile: 1, mouthMode: 'grin', mouthOpen: 0.6, brow: 0.6, head: 4, chestS: 1.04,
};
const PHONE: Partial<Pose> = {
  shL: 18, elL: 18, handL: 'relax', shR: 22, elR: 120, wrR: -10, handR: 'grip', eyes: 0, lookX: 0.55, lookY: 0.2, turn: 0.15, smile: 0.7,
  mouthMode: 'o', mouthOpen: 0.15, brow: 0.5, head: 6, chestS: 1,
};
const SHOCK: Partial<Pose> = { pupil: 0.35, brow: 1.6, browTilt: 1.2, mouthMode: 'o', mouthOpen: 0.7, sweat: 1, sy: 1.05, sx: 0.97, lookX: 0.45, lookY: 0.1 };
const SLAMP: Partial<Pose> = {
  shL: 34, elL: -46, shR: 34, elR: -46, wrR: 0, handL: 'open', handR: 'open', sy: 0.95, sx: 1.03, pupil: 0.6, brow: 1.4, browTilt: -0.6,
  mouthMode: 'grit', mouthOpen: 0.5, lookX: 0, lookY: 0.4, turn: 0, head: 0,
};
const TYPEP: Partial<Pose> = {
  shL: 14, elL: -64, shR: 14, elR: -64, handL: 'open', handR: 'open', sy: 1, sx: 1, pupil: 0.7, brow: 1.3, browTilt: -0.8, mouthMode: 'grit',
  mouthOpen: 0.35, lookY: 0.55, lookX: 0, lid: 0.15, sweat: 1, head: 0,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...PARTY } },
  { f: BUZZ - 2, p: {} },
  { f: BUZZ + 4, p: { ...PHONE }, e: E.out },
  { f: READ, p: { ...SHOCK }, e: E.snap },
  { f: POP, p: { shL: 40, elL: 30, handL: 'open', lookX: 0.1, lookY: 0.4 } },
  { f: SLAM, p: { ...SLAMP }, e: E.snap },
  { f: TYPE, p: { ...TYPEP }, e: E.out },
  { f: PRESS - 12, p: {} },
  { f: PRESS - 7, p: { shR: 150, elR: 24, handR: 'point', lookX: 0.15, brow: 1.6, mouthOpen: 0.8 }, e: E.out },
  { f: PRESS, p: { shR: 30, elR: -72, sy: 0.96, sx: 1.03 }, e: E.snap },
  { f: PRESS + 5, p: { sy: 1, sx: 1, pupil: 1, mouthMode: 'o', mouthOpen: 0.5, brow: 1.1, browTilt: 0.4, lookY: 0.3, lid: 0 } },
  {
    f: VICTORY,
    p: {
      shL: 160, elL: -10, shR: 160, elR: -10, handL: 'fist', handR: 'fist', eyes: 1, sweat: 0, mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1,
      browTilt: 0, lookY: 0, lookX: 0, pupil: 1, sy: 1.06, sx: 0.96,
    },
    e: E.back,
  },
  { f: VICTORY + 8, p: { sy: 1, sx: 1 } },
  { f: TIMESHEET_FRAMES, p: {} },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  const ph = beatPh(f);
  // dancing before the buzz and after he submits
  const party = 1 - seg(f, BUZZ - 4, BUZZ);
  const party2 = seg(f, VICTORY + 6, VICTORY + 14);
  const pump = Math.sin(ph);
  p = {
    ...p,
    shR: p.shR + pump * 45 * party - pump * 18 * party2,
    elR: p.elR - pump * 40 * party,
    shL: p.shL + Math.sin(ph + 1) * 10 * party + pump * 18 * party2,
    head: p.head + Math.sin(ph) * 6 * (party + party2),
    sy: p.sy * (1 - 0.03 * hit(f) * (party + party2)),
  };
  // frantic typing
  const typing = seg(f, TYPE, TYPE + 3) * (1 - seg(f, PRESS - 10, PRESS - 7));
  const typingL = seg(f, TYPE, TYPE + 3) * (1 - seg(f, VICTORY - 4, VICTORY));
  if (typing > 0 || typingL > 0) {
    p = {
      ...p,
      elL: p.elL + Math.sin(f * 1.9) * 14 * typingL,
      shL: p.shL + Math.sin(f * 1.3) * 6 * typingL,
      elR: p.elR + Math.sin(f * 1.9 + Math.PI) * 14 * typing,
      shR: p.shR + Math.sin(f * 1.3 + 2) * 6 * typing,
      head: p.head + Math.sin(f * 0.9) * 2 * typing,
    };
  }
  const leap = f >= VICTORY && f < VICTORY + 12 ? Math.sin(((f - VICTORY) / 12) * Math.PI) * 80 : 0;
  return plant(p, leap);
};

export const JokeTimesheetScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const phone = toStage(r.handR());
  const open = f < SLAM ? 0 : f < VICTORY ? clamp(springAt(f, SLAM, 8, 1.4, 5), 0, 1.08) : 1 - E.in(seg(f, VICTORY, VICTORY + 4));
  const pop = f < POP ? 0 : clamp(springAt(f, POP, 10, 1.5, 5), 0, 1.15);
  const minutes = kf(f, [[0, 23 * 60 + 58], [READ, 23 * 60 + 58.6], [TYPE, 23 * 60 + 59.2, E.inOut], [PRESS, 23 * 60 + 59.98], [VICTORY, 24 * 60, E.out]]);
  const due = seg(f, READ, READ + 6) * (1 - seg(f, PRESS, PRESS + 6));
  const hop = Math.max(0, Math.sin(seg(f, SLAM, SLAM + 9) * Math.PI)) * 50 + Math.max(0, Math.sin(seg(f, PRESS, PRESS + 8) * Math.PI)) * 34;
  const tilt = Math.sin(seg(f, SLAM, SLAM + 12) * Math.PI * 2) * 10 + Math.sin(seg(f, PRESS, PRESS + 10) * Math.PI * 2) * 7;
  const cam: Cam = {
    cx: kf(f, [[0, 540], [BUZZ, 540], [READ, 590, E.out], [SLAM, 540, E.inOut], [PRESS, 540], [CARD, 540]]),
    cy: kf(f, [[0, 1160], [BUZZ, 1160], [READ, 1080, E.out], [SLAM, 1200, E.inOut], [PRESS - 8, 1210], [PRESS, 1190, E.snap], [VICTORY, 1160, E.inOut], [CARD, 1160], [CARD + 12, 1060, E.inOut]]),
    z: kf(f, [[0, 1.0], [BUZZ, 1.0], [READ, 1.28, E.out], [SLAM, 1.04, E.inOut], [PRESS - 8, 1.07], [PRESS, 1.15, E.snap], [VICTORY, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const s1 = shake(f, SLAM, 12, 16, 3);
  const s2 = shake(f, PRESS, 10, 14, 5);
  const sh = { x: s1.x + s2.x, y: s1.y + s2.y, r: s1.r + s2.r };
  const rr = rng(9);
  const lights = Array.from({ length: 26 }).map(() => [rr() * 1600 - 260, rr() * 1500 - 200, NEON[Math.floor(rr() * 4)]] as const);
  const shouts: [number, string, number, number, 1 | -1][] = [
    [50, 'JAKE COME DANCE', 236, 1180, -1],
    [64, 'is that a LAPTOP', 836, 1140, 1],
    [78, "bro it's 11:59", 236, 1276, -1],
  ];

  return (
    <Stage
      bg="#140F28"
      overlay={<EndCard f={f} start={CARD} lines={['THE TIME SHEET']} pts="DUE" unit="11:59" sub="SUBMITTED FROM THE CLUB" color={ORANGE} dark={ORANGE_D} light={ORANGE_L} y={80} />}
    >
      <GlowDefs />
      <defs>
        <radialGradient id="glowB">
          <stop offset="0" stopColor="#DFF3FF" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#8CCBFF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#5AA8FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* back wall, sign, clock, disco ball */}
      <g transform={camP(cam, 0.6, { x: sh.x * 0.3, y: sh.y * 0.3, r: 0 })}>
        <rect x={-600} y={-1200} width={2280} height={4200} fill="#1E1640" />
        {Array.from({ length: 20 }).map((_, i) => (
          <rect key={i} x={-600 + i * 120} y={-1200} width={60} height={4200} fill="#241B4E" />
        ))}
        {lights.map(([x, y, c], i) => (
          <circle key={i} cx={((x + f * (i % 2 ? 9 : -7)) % 1700 + 1700) % 1700 - 300} cy={y} r={10 + (i % 3) * 5} fill={c} opacity={0.55} />
        ))}
        <g opacity={1 - 0.7 * seg(f, CARD - 4, CARD + 6)}>
        <g transform="translate(300 330) rotate(-4)">
          <Glow x={0} y={0} r={330} id="glowP" o={0.5 + 0.25 * hit(f)} />
          <rect x={-250} y={-82} width={500} height={164} rx={34} fill="#1A1233" stroke={INK} strokeWidth={10} />
          <text x={0} y={10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={100} fill="#FFD3E2" stroke="#FF4FA3" strokeWidth={4}>
            LAST CALL
          </text>
        </g>
        <WallClock x={850} y={330} m={minutes} late={due} tag="DUE" r={104} wob={due * Math.sin(f * 1.3) * 3} />
        </g>
        <DiscoBall f={f} />
      </g>
      <g transform={camP(cam, 0.7, { x: sh.x * 0.5, y: sh.y * 0.5, r: 0 })}>
        <Speaker x={-20} f={f} />
        <Speaker x={1100} f={f} flip />
        <DanceFloor f={f} />
      </g>
      <g transform={camP(cam, 0.8, { x: sh.x * 0.6, y: sh.y * 0.6, r: 0 })}>
        <Beams f={f} />
        <Dancer x={120} y={1640} s={0.92} f={f} ph={0.4} c="#33275F" rim={NEON[0]} />
        <Dancer x={300} y={1700} s={0.8} f={f} ph={2.2} c="#2B2153" rim={NEON[3]} />
        <Dancer x={800} y={1690} s={0.84} f={f} ph={1.3} c="#2B2153" rim={NEON[1]} />
        <Dancer x={980} y={1650} s={0.95} f={f} ph={3.1} c="#33275F" rim={NEON[2]} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Hero look={LOOKS.jake} p={p} x={GX} y={GY} scale={SC} shadow={false} itemR={f >= BUZZ - 2 && f < POP ? <HandPhone color={ORANGE} dark={ORANGE_D} glow={f >= BUZZ ? 1 : 0} /> : undefined} />
        {/* the screen lights his face */}
        {open > 0.05 ? <Glow x={GX} y={TABLE_Y - 330} r={330} id="glowB" o={0.55 * Math.min(1, open)} /> : null}
        <Table />
        <Drink hop={hop} tilt={tilt} />
        <Sparks f={f} start={SLAM} seed={6} n={10} x={GX + 250} y={TABLE_Y - 180} speed={[8, 18]} g={0.9} size={[10, 16]} colors={['#3DE0FF', '#BFF6FF']} shape="drop" />
        <Laptop open={open} pop={pop} />
        <Burst x={GX} y={TABLE_Y - 10} r={190} t={seg(f, SLAM, SLAM + 10)} fill="#FFE15C" seed={4} />
        <Burst x={GX + 150} y={TABLE_Y - 40} r={150} t={seg(f, PRESS, PRESS + 9)} fill="#7BE3A0" seed={7} />
        {/* sweat while he types */}
        {[0, 1, 2].map((i) => (
          <Sparks key={i} f={f} start={TYPE + 6 + i * 16} seed={20 + i} n={5} x={head[0] + (i % 2 ? 90 : -90)} y={head[1] + 90} speed={[8, 14]} g={0.9} size={[10, 15]} colors={['#A6DCFF', '#FFFFFF']} shape="drop" />
        ))}
        <Notification x={620} y={head[1] - 250} t={f < POP - 1 ? f - BUZZ : -1} />
        <g opacity={1 - seg(f, VICTORY - 4, VICTORY)}>
          {shouts.map(([t, text, x, y, side]) => (
            <Bubble key={t} x={x} y={y} text={text} t={f - t} side={side} size={36} />
          ))}
        </g>
        <NameTag x={head[0]} y={head[1] - 60} name="JAKE" color={ORANGE} t={f - 4} out={seg(f, CARD - 8, CARD)} />
        {[0, 1, 2].map((i) => (
          <Twinkle key={i} x={head[0] + [-170, 170, 0][i]} y={head[1] + [40, 10, -90][i]} s={1.3} t={seg(f, VICTORY + i * 3, VICTORY + 14 + i * 3)} color="#FFD064" />
        ))}
      </g>
      <Sheet f={f} />
      <Sfx f={f} start={2} text="UNTZ UNTZ" x={790} y={560} size={110} rot={8} fill="#3DE0FF" dur={13} />
      <Sfx f={f} start={BUZZ} text="BZZT" x={860} y={1180} size={100} rot={8} fill={ORANGE_L} dur={10} />
      <Sfx f={f} start={READ} text="!!!" x={190} y={1000} size={170} rot={-8} fill="#FFFFFF" dur={9} />
      <Sfx f={f} start={SLAM} text="SLAM!" x={260} y={1330} size={130} rot={-8} fill={ORANGE} dur={14} />
      <Sfx f={f} start={47} text="tap tap tap" x={230} y={1330} size={74} rot={-6} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={61} text="tap tap tap" x={860} y={1380} size={74} rot={6} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={75} text="TAP TAP TAP" x={250} y={1300} size={84} rot={-4} fill="#FFE15C" dur={14} />
      <Sfx f={f} start={PRESS} text="CLICK!" x={820} y={1230} size={120} rot={8} fill="#7BE3A0" dur={14} />
      <Sfx f={f} start={VICTORY + 4} text="MADE IT!" x={540} y={470} size={170} rot={-5} fill="#FFD064" dur={18} />
      <Sfx f={f} start={VICTORY + 8} text="UNTZ UNTZ" x={800} y={1000} size={100} rot={8} fill="#FF4FA3" dur={12} />
      <ConfettiRain f={f} start={CARD + 2} n={44} seed={57} colors={[ORANGE, ORANGE_L, '#FFFFFF', '#3DE0FF', '#FF4FA3']} />
    </Stage>
  );
};
