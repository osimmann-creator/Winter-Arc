// Shared set for gym #6-#10: the Winter Arc indoor gym. Big snowy windows, a rubber floor,
// pendant lamps, racks along the wall. Plus the props those five celebrations use.
import React from 'react';
import { C } from '../hero/Hero';
import { camP, Cam } from '../fx/Stage';
import { Cloud } from '../fx/fx';
import { TITLE_FONT } from '../fonts';
import { rng, rrPath, softStar } from '../lib/shape';
import { INK, Shake } from './kit';

export const FLOOR_Y = 1300;
const WALL = '#FFF4E6';
const WALL2 = '#F1E9FF';

/* ------------------------------- windows ------------------------------- */
const WIN = [
  { x: 92, w: 250 },
  { x: 415, w: 250 },
  { x: 738, w: 250 },
];
const WIN_Y = 300;
const WIN_H = 760;

/** The snowy view through the windows (window-local: x0..x0+w, WIN_Y..WIN_Y+WIN_H). */
const Outside: React.FC<{ f: number }> = ({ f }) => {
  const r = rng(31);
  return (
    <g>
      <rect x={-200} y={WIN_Y - 40} width={1480} height={WIN_H + 80} fill="url(#grOut)" />
      <circle cx={820} cy={470} r={70} fill="#FFF3C4" opacity={0.9} />
      <circle cx={820} cy={470} r={120} fill="#FFF3C4" opacity={0.25} />
      {[0, 1, 2].map((i) => (
        <Cloud key={i} x={((i * 420 + f * 0.7) % 1500) - 200} y={430 + (i % 2) * 120} w={260} h={100} seed={i + 21} fill="#FFFFFF" shade="#DCE6FF" line="#9AA6E0" lw={5} />
      ))}
      {/* far snowy hills */}
      <path d="M-200 820 Q120 700 420 790 Q700 690 1000 780 Q1180 730 1300 770 L1300 1100 L-200 1100 Z" fill="#E9EEFF" stroke="#B7C2EE" strokeWidth={6} />
      <path d="M-200 900 Q260 820 600 880 Q900 820 1300 880 L1300 1100 L-200 1100 Z" fill="#FFFFFF" stroke="#C6CFF2" strokeWidth={6} />
      {/* pines */}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = -40 + i * 112 + r() * 40;
        const y = 905 + r() * 50;
        const s = 0.55 + r() * 0.35;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x={-10} y={-30} width={20} height={34} fill="#8E5A36" stroke={INK} strokeWidth={6} />
            <path d="M-80 -20 L0 -150 L80 -20 Z" fill="#3E9A6A" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <path d="M-62 -90 L0 -210 L62 -90 Z" fill="#46A673" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <path d="M-34 -150 L0 -220 L34 -150 Q14 -138 0 -148 Q-14 -136 -34 -150 Z" fill="#FFFFFF" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* falling snow */}
      {Array.from({ length: 46 }).map((_, i) => {
        const x0 = r() * 1080;
        const sp = 2.2 + r() * 2.6;
        const s = 4 + r() * 7;
        const y = WIN_Y - 20 + ((r() * WIN_H + f * sp) % (WIN_H + 40));
        const x = x0 + Math.sin(f / 14 + i) * 14;
        return <circle key={i} cx={x} cy={y} r={s} fill="#FFFFFF" />;
      })}
    </g>
  );
};

const Windows: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <defs>
      <linearGradient id="grOut" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8FB6FF" />
        <stop offset="0.6" stopColor="#C9DDFF" />
        <stop offset="1" stopColor="#EEF3FF" />
      </linearGradient>
      <clipPath id="grWinClip">
        {WIN.map((w) => (
          <path key={w.x} d={`M${w.x} ${WIN_Y + WIN_H} V${WIN_Y + w.w / 2} A${w.w / 2} ${w.w / 2} 0 0 1 ${w.x + w.w} ${WIN_Y + w.w / 2} V${WIN_Y + WIN_H} Z`} />
        ))}
      </clipPath>
    </defs>
    <g clipPath="url(#grWinClip)">
      <Outside f={f} />
      {/* soft reflection streaks on the glass */}
      {WIN.map((w) => (
        <path key={w.x} d={`M${w.x + 40} ${WIN_Y + 520} L${w.x + 150} ${WIN_Y + 140} L${w.x + 190} ${WIN_Y + 140} L${w.x + 80} ${WIN_Y + 520} Z`} fill="#FFFFFF" opacity={0.22} />
      ))}
    </g>
    {WIN.map((w) => {
      const arch = `M${w.x} ${WIN_Y + WIN_H} V${WIN_Y + w.w / 2} A${w.w / 2} ${w.w / 2} 0 0 1 ${w.x + w.w} ${WIN_Y + w.w / 2} V${WIN_Y + WIN_H} Z`;
      const cx = w.x + w.w / 2;
      return (
        <g key={w.x}>
          {/* mullions */}
          <line x1={cx} y1={WIN_Y} x2={cx} y2={WIN_Y + WIN_H} stroke="#FFFFFF" strokeWidth={14} />
          {[WIN_Y + 300, WIN_Y + 530].map((y) => (
            <line key={y} x1={w.x} y1={y} x2={w.x + w.w} y2={y} stroke="#FFFFFF" strokeWidth={14} />
          ))}
          <path d={arch} fill="none" stroke="#FFFFFF" strokeWidth={26} />
          <path d={arch} fill="none" stroke={INK} strokeWidth={7} />
          {/* sill */}
          <rect x={w.x - 26} y={WIN_Y + WIN_H - 4} width={w.w + 52} height={34} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={7} />
          <rect x={w.x - 10} y={WIN_Y + WIN_H + 30} width={w.w + 20} height={14} rx={6} fill="#E4DAF4" />
        </g>
      );
    })}
  </g>
);

/* ------------------------------- equipment ------------------------------- */
export const PendantLamp: React.FC<{ x: number; y: number; cord?: number; on?: number; swing?: number; s?: number }> = ({ x, y, cord = 420, on = 1, swing = 0, s = 1 }) => (
  <g transform={`rotate(${swing} ${x} ${y - cord})`}>
    <line x1={x} y1={y - cord} x2={x} y2={y} stroke={INK} strokeWidth={6} />
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
    {on > 0 ? <path d={`M${x - 46} ${y + 50} L${x - 260} ${y + 900} L${x + 260} ${y + 900} L${x + 46} ${y + 50} Z`} fill="#FFF6D6" opacity={0.16 * on} /> : null}
    <path d={`M${x - 74} ${y + 56} Q${x - 70} ${y} ${x} ${y - 4} Q${x + 70} ${y} ${x + 74} ${y + 56} Z`} fill="#7254DC" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d={`M${x - 52} ${y + 30} Q${x - 40} ${y + 8} ${x - 10} ${y + 6}`} fill="none" stroke="#BCABFF" strokeWidth={7} strokeLinecap="round" />
    <ellipse cx={x} cy={y + 58} rx={36} ry={14} fill="#FFF0B7" stroke={INK} strokeWidth={6} />
    </g>
  </g>
);

const DumbbellRack: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const cols = ['#F15F75', '#7E7EF3', '#FFD064', '#6ACC86', '#F88F4D'];
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 1].map((row) => (
        <g key={row}>
          <rect x={-170} y={-150 + row * 80} width={340} height={14} rx={7} fill="#8C87A6" stroke={INK} strokeWidth={6} transform={`rotate(${row ? 4 : 4})`} />
          {cols.map((c, i) => (
            <g key={i} transform={`translate(${-136 + i * 68} ${-170 + row * 80})`}>
              <rect x={-20} y={-5} width={40} height={10} fill="#B5B1C8" stroke={INK} strokeWidth={3} />
              <rect x={-30} y={-17} width={14} height={34} rx={5} fill={c} stroke={INK} strokeWidth={4} />
              <rect x={16} y={-17} width={14} height={34} rx={5} fill={c} stroke={INK} strokeWidth={4} />
            </g>
          ))}
        </g>
      ))}
      <rect x={-160} y={-140} width={14} height={140} fill="#8C87A6" stroke={INK} strokeWidth={6} />
      <rect x={146} y={-140} width={14} height={140} fill="#8C87A6" stroke={INK} strokeWidth={6} />
    </g>
  );
};

const PowerRack: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    {[-110, 110].map((dx) => (
      <g key={dx}>
        <rect x={dx - 14} y={-640} width={28} height={640} fill="#433C4F" stroke={INK} strokeWidth={6} />
        {Array.from({ length: 12 }).map((_, i) => (
          <circle key={i} cx={dx} cy={-600 + i * 46} r={4} fill="#9B95B5" />
        ))}
      </g>
    ))}
    <rect x={-130} y={-652} width={260} height={24} rx={6} fill="#433C4F" stroke={INK} strokeWidth={6} />
    {/* racked bar */}
    <rect x={-190} y={-372} width={380} height={12} rx={6} fill="#D3CEDE" stroke={INK} strokeWidth={5} />
    {[-1, 1].map((s) => (
      <g key={s}>
        <rect x={s * 150 - 14} y={-430} width={28} height={128} rx={10} fill="#4F35B0" stroke={INK} strokeWidth={5} />
        <rect x={s * 176 - 10} y={-410} width={20} height={88} rx={8} fill="#FFD064" stroke={INK} strokeWidth={5} />
      </g>
    ))}
  </g>
);

const Kettle: React.FC<{ x: number; y: number; s?: number; c?: string }> = ({ x, y, s = 1, c = '#65607B' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-22 -50 Q0 -88 22 -50" fill="none" stroke={INK} strokeWidth={18} />
    <path d="M-22 -50 Q0 -88 22 -50" fill="none" stroke={c} strokeWidth={9} />
    <circle cx={0} cy={-20} r={34} fill={c} stroke={INK} strokeWidth={6} />
    <circle cx={-10} cy={-30} r={9} fill="#FFFFFF" opacity={0.35} />
  </g>
);

const MedBall: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx={0} cy={-44} r={44} fill="#F2853A" stroke={INK} strokeWidth={6} />
    <path d="M-44 -44 Q0 -20 44 -44 M0 -88 Q-18 -44 0 0" fill="none" stroke="#B4521C" strokeWidth={5} />
    <circle cx={-16} cy={-60} r={10} fill="#FFFFFF" opacity={0.4} />
  </g>
);

export const PRBoard: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(-2)`}>
    <rect x={-120} y={-90} width={240} height={180} rx={12} fill={INK} transform="translate(5 8)" opacity={0.3} />
    <rect x={-120} y={-90} width={240} height={180} rx={12} fill="#3E5C52" stroke="#A06343" strokeWidth={12} />
    <text x={0} y={-48} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#FFFFFF">PR BOARD</text>
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(-80 ${-6 + i * 34})`}>
        <line x1={0} y1={0} x2={80 + ((i * 47) % 60)} y2={0} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        <path d={softStar(130 + ((i * 47) % 30), 0, 13, 6, 5)} fill="#FFD064" />
      </g>
    ))}
  </g>
);

/* ------------------------------- the room ------------------------------- */
/** Everything behind the hero. `lamps` can be turned off when a scene draws its own (e.g. to bonk one). */
export const GymRoomBG: React.FC<{ f: number; cam: Cam; sh: Shake; lamps?: boolean; dim?: number; rack?: boolean }> = ({ f, cam, sh, lamps = true, dim = 0, rack = true }) => {
  const r = rng(12);
  return (
    <>
      <defs>
        <linearGradient id="grWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WALL2} />
          <stop offset="0.55" stopColor={WALL} />
          <stop offset="1" stopColor="#FFEBD6" />
        </linearGradient>
        <linearGradient id="grFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5D5878" />
          <stop offset="1" stopColor="#77729A" />
        </linearGradient>
      </defs>
      {/* back wall */}
      <g transform={camP(cam, 0.3, sh)}>
        <rect x={-900} y={-1400} width={2880} height={2700} fill="url(#grWall)" />
        {/* far floor: keeps the floor continuous when the camera cranes up (the near floor has more parallax) */}
        <rect x={-900} y={FLOOR_Y - 10} width={2880} height={2400} fill="#5D5878" />
        {/* ceiling + beams */}
        <rect x={-900} y={-1400} width={2880} height={1360} fill="#E6DDF6" />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={-760 + i * 320} y={-1400} width={44} height={1360} fill="#D6CAEC" />
        ))}
        <rect x={-900} y={-70} width={2880} height={34} fill="#CFC2E8" stroke={INK} strokeWidth={6} />
        {/* accent stripes */}
        <rect x={-900} y={170} width={2880} height={30} fill={C.violet} />
        <rect x={-900} y={206} width={2880} height={12} fill={C.gold} />
        <Windows f={f} />
        {/* sign */}
        <g transform="translate(540 92)">
          <rect x={-330} y={-58} width={660} height={116} rx={30} fill={INK} transform="translate(0 10)" />
          <rect x={-330} y={-58} width={660} height={116} rx={30} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
          <rect x={-308} y={-44} width={616} height={16} rx={8} fill={C.violetHi} opacity={0.45} />
          <text x={0} y={8} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={74} fill={C.violet} stroke={INK} strokeWidth={4} letterSpacing={3}>
            WINTER ARC GYM
          </text>
          <path d={softStar(-370, 0, 30, 12, 5)} fill={C.gold} stroke={INK} strokeWidth={5} />
          <path d={softStar(370, 0, 30, 12, 5)} fill={C.gold} stroke={INK} strokeWidth={5} />
        </g>
        {/* baseboard */}
        <rect x={-900} y={FLOOR_Y - 46} width={2880} height={46} fill="#E4D6F7" stroke={INK} strokeWidth={6} />
      </g>
      {/* lamps + equipment along the wall */}
      <g transform={camP(cam, 0.65, sh)}>
        {lamps
          ? [70, 1010].map((x, i) => <PendantLamp key={x} x={x} y={-150} cord={700} swing={Math.sin(f / 30 + i) * 1.2} on={1 - dim} />)
          : null}
        <DumbbellRack x={150} y={FLOOR_Y - 10} />
        {rack ? <PowerRack x={960} y={FLOOR_Y - 10} /> : null}
        <Kettle x={340} y={FLOOR_Y - 6} s={0.9} c="#7254DC" />
        <Kettle x={404} y={FLOOR_Y - 6} s={0.75} />
        <MedBall x={760} y={FLOOR_Y - 8} />
        {/* bottle */}
        <g transform={`translate(${680} ${FLOOR_Y - 8})`}>
          <rect x={-18} y={-80} width={36} height={80} rx={12} fill="#7FD0F5" stroke={INK} strokeWidth={5} />
          <rect x={-12} y={-98} width={24} height={22} rx={6} fill="#4F35B0" stroke={INK} strokeWidth={5} />
        </g>
      </g>
      {/* rubber floor */}
      <g transform={camP(cam, 1, sh)}>
        <rect x={-900} y={FLOOR_Y} width={2880} height={2400} fill="url(#grFloor)" />
        <line x1={-900} y1={FLOOR_Y} x2={1980} y2={FLOOR_Y} stroke={INK} strokeWidth={7} />
        {Array.from({ length: 19 }).map((_, i) => {
          const k = i - 9;
          return <line key={i} x1={540 + k * 120} y1={FLOOR_Y} x2={540 + k * 560} y2={FLOOR_Y + 1600} stroke="#4C4766" strokeWidth={5} />;
        })}
        {[1360, 1440, 1550, 1700, 1900, 2170, 2520].map((y) => (
          <line key={y} x1={-900} y1={y} x2={1980} y2={y} stroke="#4C4766" strokeWidth={5} />
        ))}
        {/* speckles */}
        {Array.from({ length: 120 }).map((_, i) => {
          const y = FLOOR_Y + 10 + Math.pow(r(), 1.6) * 1300;
          const x = -300 + r() * 1680;
          const s = 1.5 + ((y - FLOOR_Y) / 1300) * 4;
          return <circle key={i} cx={x} cy={y} r={s} fill={i % 3 ? '#8E89B0' : '#B9B4D6'} opacity={0.7} />;
        })}
        {/* window light pooling on the floor */}
        {WIN.map((w, i) => (
          <path key={i} d={`M${w.x + 10} ${FLOOR_Y + 4} L${w.x + w.w - 10} ${FLOOR_Y + 4} L${w.x + w.w + 120 + (i - 1) * 260} ${FLOOR_Y + 330} L${w.x - 60 + (i - 1) * 260} ${FLOOR_Y + 330} Z`} fill="#FFFFFF" opacity={0.07} />
        ))}
      </g>
    </>
  );
};

/** Hero contact shadow on the rubber floor. */
export const FloorShadow: React.FC<{ x: number; y: number; w?: number; o?: number }> = ({ x, y, w = 240, o = 0.28 }) => (
  <ellipse cx={x} cy={y} rx={w} ry={w * 0.12} fill="#1E1A2E" opacity={o} />
);

/* ------------------------------- props ------------------------------- */
/** Wooden plyo box (front + top face). x,y = bottom-centre. */
export const PlyoBox: React.FC<{ x: number; y: number; w?: number; h?: number; label?: string; rot?: number; top?: number }> = ({ x, y, w = 380, h = 170, label, rot = 0, top = 36 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d={`M${-w / 2} ${-h} L${-w / 2 + 26} ${-h - top} L${w / 2 + 26} ${-h - top} L${w / 2} ${-h} Z`} fill="#F4D3A6" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d={`M${w / 2} 0 L${w / 2} ${-h} L${w / 2 + 26} ${-h - top} L${w / 2 + 26} ${-top} Z`} fill="#C48B57" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-w / 2} y={-h} width={w} height={h} fill="#E8B57C" stroke={INK} strokeWidth={7} />
    <rect x={-w / 2 + 14} y={-h + 14} width={w - 28} height={h - 28} rx={10} fill="none" stroke="#C48B57" strokeWidth={6} />
    <ellipse cx={0} cy={-h * 0.72} rx={60} ry={18} fill="#C48B57" stroke="#A9733F" strokeWidth={4} />
    {label ? (
      <text x={0} y={-h * 0.36} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={h * 0.3} fill="#FFFFFF" stroke={INK} strokeWidth={8} paintOrder="stroke">
        {label}
      </text>
    ) : null}
  </g>
);

/** Shaker bottle, held at the wrist (wrist space, pointing +y). level 0..1, capOn 0/1. */
export const Shaker: React.FC<{ level?: number; capOn?: boolean; rot?: number; s?: number; tilt?: number }> = ({ level = 0.8, capOn = true, rot = 0, s = 1, tilt = 0 }) => {
  const id = 'shk' + Math.round(level * 100) + (capOn ? 'c' : 'o') + Math.round(tilt);
  const top = -120;
  const bot = 110;
  // the drink stays level with the world: work out the surface in a frame rotated back by the tilt
  const tr = (tilt * Math.PI) / 180;
  const R = 0.5 * (230 * Math.abs(Math.cos(tr)) + 108 * Math.abs(Math.sin(tr)));
  const surf = lerpN(R, -R, level);
  return (
    <g transform={`translate(0 76) rotate(${rot}) scale(${s})`}>
      <defs>
        <clipPath id={id}>
          <path d={`M-54 ${top} L54 ${top} L46 ${bot} Q0 ${bot + 14} -46 ${bot} Z`} />
        </clipPath>
      </defs>
      <path d={`M-54 ${top} L54 ${top} L46 ${bot} Q0 ${bot + 14} -46 ${bot} Z`} fill="#EEF6FF" />
      <g clipPath={`url(#${id})`}>
        {level > 0.01 ? (
          <g transform={`translate(0 -5) rotate(${-tilt})`}>
            <rect x={-300} y={surf} width={600} height={600} fill="#9B5A3A" />
            <path d={`M-300 ${surf} Q-40 ${surf - 12} 0 ${surf} Q40 ${surf + 12} 300 ${surf} L300 ${surf + 14} L-300 ${surf + 14} Z`} fill="#C07B52" />
          </g>
        ) : null}
        <rect x={-40} y={top + 10} width={16} height={bot - top - 30} rx={8} fill="#FFFFFF" opacity={0.5} />
      </g>
      <path d={`M-54 ${top} L54 ${top} L46 ${bot} Q0 ${bot + 14} -46 ${bot} Z`} fill="none" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      {/* label */}
      <rect x={-46} y={-10} width={92} height={46} rx={8} fill="#7254DC" stroke={INK} strokeWidth={5} />
      <text x={0} y={14} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={24} fill="#FFFFFF">GAINS</text>
      {/* band + cap */}
      <rect x={-58} y={top - 18} width={116} height={24} rx={8} fill="#7254DC" stroke={INK} strokeWidth={6} />
      {capOn ? (
        <g>
          <path d={`M-48 ${top - 18} Q-44 ${top - 62} 0 ${top - 64} Q44 ${top - 62} 48 ${top - 18} Z`} fill="#7254DC" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-14} y={top - 82} width={28} height={22} rx={8} fill="#4F35B0" stroke={INK} strokeWidth={5} />
        </g>
      ) : null}
    </g>
  );
};

/** Flying shaker cap (stage space). */
export const ShakerCap: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-48 18 Q-44 -26 0 -28 Q44 -26 48 18 Z" fill="#7254DC" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-14} y={-46} width={28} height={22} rx={8} fill="#4F35B0" stroke={INK} strokeWidth={5} />
  </g>
);

/** Sledgehammer: grip at the wrist, head at the far end (wrist space, pointing +y). */
export const Sledge: React.FC<{ len?: number; grip?: number }> = ({ len = 380, grip = 40 }) => (
  <g transform={`translate(0 ${grip})`}>
    <rect x={-13} y={-120} width={26} height={len + 120} rx={12} fill="#C98B4E" stroke={INK} strokeWidth={7} />
    <rect x={-7} y={-100} width={6} height={len + 70} rx={3} fill="#E9B57E" />
    <g transform={`translate(0 ${len})`}>
      <rect x={-92} y={-40} width={184} height={84} rx={18} fill="#5D5878" stroke={INK} strokeWidth={8} />
      <rect x={-80} y={-30} width={150} height={20} rx={8} fill="#9B95B5" />
      <rect x={-104} y={-46} width={20} height={96} rx={8} fill="#433C4F" stroke={INK} strokeWidth={6} />
      <rect x={84} y={-46} width={20} height={96} rx={8} fill="#433C4F" stroke={INK} strokeWidth={6} />
    </g>
  </g>
);

/** Big tractor tyre seen a little from above. part: 'all' | 'back' | 'front'. squash scales it flat. */
export const Tyre: React.FC<{ x: number; y: number; rx?: number; ry?: number; th?: number; part?: 'all' | 'back' | 'front'; rot?: number; f?: number }> = ({
  x, y, rx = 300, ry = 104, th = 96, part = 'all', rot = 0, f = 0,
}) => {
  const outer = (dy: number) => `M${-rx} ${dy} A${rx} ${ry} 0 0 1 ${rx} ${dy}`;
  const outerB = (dy: number) => `M${rx} ${dy} A${rx} ${ry} 0 0 1 ${-rx} ${dy}`;
  const irx = rx * 0.6;
  const iry = ry * 0.56;
  const treads = Array.from({ length: 14 }).map((_, i) => {
    const a = (i / 14) * Math.PI + ((f * 0.05) % (Math.PI / 14));
    const px = Math.cos(a) * rx;
    return <line key={i} x1={px} y1={Math.sin(a) * ry + 6} x2={px * 0.96} y2={Math.sin(a) * ry + th - 10} stroke="#232030" strokeWidth={10} strokeLinecap="round" />;
  });
  const back = (
    <g>
      {/* far half: top of the tyre wall + inside */}
      <path d={`${outer(0)} L${irx} 0 A${irx} ${iry} 0 0 0 ${-irx} 0 Z`} fill="#4A4560" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M${-irx} 0 A${irx} ${iry} 0 0 1 ${irx} 0 L${irx} ${th * 0.55} A${irx} ${iry} 0 0 0 ${-irx} ${th * 0.55} Z`} fill="#2E2A3E" />
    </g>
  );
  const front = (
    <g>
      <path d={`${outerB(0)} L${-rx} ${th} A${rx} ${ry} 0 0 0 ${rx} ${th} Z`} fill="#3A3550" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      {treads}
      <path d={`M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0 L${irx} 0 A${irx} ${iry} 0 0 1 ${-irx} 0 Z`} fill="#5D5878" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M${-rx * 0.8} ${ry * 0.38} A${rx * 0.8} ${ry * 0.62} 0 0 0 ${-rx * 0.2} ${ry * 0.82}`} fill="none" stroke="#8E89B0" strokeWidth={8} strokeLinecap="round" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {part !== 'front' ? back : null}
      {part !== 'back' ? front : null}
    </g>
  );
};

export { rrPath };
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
