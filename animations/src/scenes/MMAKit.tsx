// Shared set for MMA #2-#4 (Amaan's): fight-night arena with the cage, a packed crowd,
// sweeping spotlights and a jumbotron that knows his name.
import React from 'react';
import { camP, Cam } from '../fx/Stage';
import { Glow } from '../fx/fx';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { rng, softStar } from '../lib/shape';
import { INK, Shake } from './kit';

export const RED = '#D9434A';
export const RED_D = '#962830';
export const MAT_Y = 1520; // where the back fence meets the mat

/** Crowd rows with camera flashes. */
const Crowd: React.FC<{ f: number; hype: number }> = ({ f, hype }) => {
  const r = rng(91);
  const rows: React.ReactNode[] = [];
  for (let row = 0; row < 5; row++) {
    const y = 380 + row * 150;
    const col = ['#2A2550', '#302A5C', '#372F68', '#3D3474', '#433A80'][row];
    for (let i = 0; i < 15; i++) {
      const x = -380 + i * 130 + (row % 2) * 65 + r() * 20;
      const up = hype > 0.3 && r() < 0.45;
      const jump = up ? Math.abs(Math.sin(f / 4 + i + row)) * 16 * hype : 0;
      rows.push(
        <g key={`${row}-${i}`} transform={`translate(${x} ${y - jump})`}>
          {up ? <path d={`M-30 30 L${-46 + Math.sin(f / 3 + i) * 8} -80 M30 30 L${46 + Math.cos(f / 3 + i) * 8} -80`} stroke={col} strokeWidth={22} strokeLinecap="round" /> : null}
          <path d="M-62 120 Q-60 30 0 30 Q60 30 62 120 Z" fill={col} />
          <circle cx={0} cy={0} r={38} fill={col} />
        </g>,
      );
    }
  }
  // flashes
  const flashes: React.ReactNode[] = [];
  const n = Math.round(4 + hype * 10);
  for (let i = 0; i < n; i++) {
    const fr = rng(Math.floor(f / 2) * 13 + i * 7);
    const x = -300 + fr() * 1700;
    const y = 360 + fr() * 700;
    if (fr() < 0.5) continue;
    flashes.push(
      <g key={`fl${i}`}>
        <circle cx={x} cy={y} r={40} fill="#FFFFFF" opacity={0.35} />
        <path d={softStar(x, y, 34, 8, 4, 0)} fill="#FFFFFF" />
      </g>,
    );
  }
  return (
    <g>
      {rows}
      {flashes}
    </g>
  );
};

/** Hanging jumbotron. text = big line, sub = small line. flicker 0..1 for a refresh effect. */
export const Jumbotron: React.FC<{ text: string; sub?: string; color?: string; flash?: number }> = ({ text, sub, color = '#FFD064', flash = 0 }) => (
  <g transform="translate(540 120)">
    {[-300, 300].map((dx) => (
      <line key={dx} x1={dx} y1={-900} x2={dx} y2={-160} stroke={INK} strokeWidth={14} />
    ))}
    <rect x={-470} y={-180} width={940} height={380} rx={40} fill="#14122A" stroke={INK} strokeWidth={14} />
    <rect x={-440} y={-150} width={880} height={320} rx={24} fill="#1F1B44" />
    {flash > 0 ? <rect x={-440} y={-150} width={880} height={320} rx={24} fill="#FFFFFF" opacity={flash * 0.6} /> : null}
    {/* LED dots */}
    <g opacity={0.18}>
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={i} x1={-440} y1={-150 + i * 15} x2={440} y2={-150 + i * 15} stroke="#000000" strokeWidth={4} />
      ))}
    </g>
    {sub ? (
      <text x={0} y={-80} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={60} fill="#FFFFFF" letterSpacing={6}>
        {sub}
      </text>
    ) : null}
    <text x={0} y={sub ? 50 : 10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={text.length > 8 ? 120 : 160} fill={color} stroke="#FFFFFF" strokeWidth={4} letterSpacing={6}>
      {text}
    </text>
    <rect x={-470} y={-180} width={940} height={380} rx={40} fill="none" stroke="#3B3570" strokeWidth={10} />
  </g>
);

/** Octagon fence behind him: back panel + two angled side panels, padded posts. */
const Fence: React.FC = () => {
  const top = 640;
  const panels: [number, number, number, number][] = [
    [-420, top + 120, 120, top],
    [120, top, 960, top],
    [960, top, 1500, top + 120],
  ];
  return (
    <g>
      <defs>
        {panels.map(([x0, y0, x1, y1], i) => (
          <clipPath key={i} id={`fenceClip${i}`}>
            <path d={`M${x0} ${y0} L${x1} ${y1} L${x1} ${MAT_Y} L${x0} ${MAT_Y} Z`} />
          </clipPath>
        ))}
      </defs>
      {panels.map(([x0, y0, x1, y1], i) => (
        <g key={i}>
          <path d={`M${x0} ${y0} L${x1} ${y1} L${x1} ${MAT_Y} L${x0} ${MAT_Y} Z`} fill="#2A2F4E" opacity={0.3} />
          {/* chain link */}
          <g opacity={0.55} clipPath={`url(#fenceClip${i})`}>
            {Array.from({ length: Math.ceil((x1 - x0) / 46) + 20 }).map((_, k) => {
              const xa = x0 + k * 46 - 20 * 46;
              return (
                <g key={k}>
                  <line x1={xa} y1={MAT_Y} x2={xa + (MAT_Y - top)} y2={top} stroke="#8A93B8" strokeWidth={4} />
                  <line x1={xa + (MAT_Y - top)} y1={MAT_Y} x2={xa} y2={top} stroke="#8A93B8" strokeWidth={4} />
                </g>
              );
            })}
          </g>
        </g>
      ))}
      <rect x={-600} y={MAT_Y - 30} width={2280} height={40} fill="#262A45" />
      {/* top rail + posts */}
      <path d={`M-600 ${top + 160} L120 ${top} L960 ${top} L1680 ${top + 160}`} fill="none" stroke={INK} strokeWidth={30} strokeLinejoin="round" />
      <path d={`M-600 ${top + 160} L120 ${top} L960 ${top} L1680 ${top + 160}`} fill="none" stroke="#3B3F63" strokeWidth={16} strokeLinejoin="round" />
      {[
        [120, top],
        [960, top],
        [-420, top + 120],
        [1500, top + 120],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 26} y={y - 20} width={52} height={MAT_Y - y + 30} rx={16} fill={i % 2 ? '#3E7BFA' : RED} stroke={INK} strokeWidth={9} />
          <rect x={x - 14} y={y} width={12} height={MAT_Y - y - 20} rx={6} fill="#FFFFFF" opacity={0.25} />
        </g>
      ))}
    </g>
  );
};

/** The whole arena behind the hero. */
export const Arena: React.FC<{
  f: number; cam: Cam; sh: Shake; hype?: number; screen?: React.ReactNode; spots?: number; dark?: number; logo?: string;
}> = ({ f, cam, sh, hype = 0.4, screen, spots = 1, dark = 0, logo = 'WINTER ARC' }) => (
  <>
    <defs>
      <linearGradient id="mmaBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#100E24" />
        <stop offset="1" stopColor="#1C1A3A" />
      </linearGradient>
      <linearGradient id="mmaMat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#CFCDE2" />
        <stop offset="1" stopColor="#ECEAF6" />
      </linearGradient>
    </defs>
    <g transform={camP(cam, 0.35, sh)}>
      <rect x={-900} y={-1600} width={2880} height={4400} fill="url(#mmaBack)" />
      <Glow x={540} y={700} r={900} id="glowW" o={0.12 + 0.1 * hype} />
      <Crowd f={f} hype={hype} />
    </g>
    <g transform={camP(cam, 0.5, sh)}>{screen}</g>
    <g transform={camP(cam, 0.8, sh)}>
      <Fence />
    </g>
    <g transform={camP(cam, 1, sh)}>
      {/* mat */}
      <rect x={-900} y={MAT_Y} width={2880} height={1600} fill="url(#mmaMat)" />
      <line x1={-900} y1={MAT_Y} x2={1980} y2={MAT_Y} stroke={INK} strokeWidth={8} />
      <ellipse cx={540} cy={MAT_Y + 330} rx={560} ry={150} fill="none" stroke={RED} strokeWidth={16} opacity={0.7} />
      <text x={540} y={MAT_Y + 350} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={150} fill={RED} opacity={0.55} transform={`translate(540 ${MAT_Y + 350}) scale(1 0.42) translate(-540 ${-(MAT_Y + 350)})`}>
        {logo}
      </text>
      {/* spotlights */}
      {spots > 0
        ? [0, 1, 2, 3].map((i) => {
            const x = 540 + Math.sin(f / 18 + i * 1.7) * 420;
            const top = -1200;
            return <path key={i} d={`M${200 + i * 230} ${top} L${x - 170} ${MAT_Y + 260} L${x + 170} ${MAT_Y + 260} Z`} fill="#FFFFFF" opacity={0.05 * spots} />;
          })
        : null}
      {dark > 0 ? <rect x={-900} y={-1600} width={2880} height={4400} fill="#0A0818" opacity={dark} /> : null}
    </g>
  </>
);

/** Spotlight pool + cone on the hero (stage space). */
export const HeroSpot: React.FC<{ x: number; y: number; o: number; w?: number }> = ({ x, y, o, w = 260 }) =>
  o > 0 ? (
    <g opacity={o}>
      <path d={`M${x - 60} -1400 L${x - w} ${y} L${x + w} ${y} L${x + 60} -1400 Z`} fill="#FFF6D6" opacity={0.16} />
      <ellipse cx={x} cy={y} rx={w * 1.1} ry={w * 0.24} fill="#FFF6D6" opacity={0.4} />
    </g>
  ) : null;

/** Pyro flame jet (stage space). x,y = nozzle on the floor. t = frames since ignition. */
export const Pyro: React.FC<{ x: number; y: number; t: number; h?: number }> = ({ x, y, t, h = 900 }) => {
  if (t < 0 || t > 26) return null;
  const k = Math.min(1, t / 4) * (1 - Math.max(0, (t - 14) / 12));
  const hh = h * k;
  const w = 90 + 40 * Math.sin(t * 1.7);
  return (
    <g>
      <rect x={x - 70} y={y - 30} width={140} height={40} rx={10} fill="#3B3F63" stroke={INK} strokeWidth={8} />
      <path d={`M${x - w} ${y - 20} Q${x - w * 0.6} ${y - hh * 0.6} ${x} ${y - hh} Q${x + w * 0.6} ${y - hh * 0.6} ${x + w} ${y - 20} Z`} fill="#F2853A" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M${x - w * 0.6} ${y - 20} Q${x - w * 0.3} ${y - hh * 0.45} ${x} ${y - hh * 0.75} Q${x + w * 0.3} ${y - hh * 0.45} ${x + w * 0.6} ${y - 20} Z`} fill="#FFD064" />
      <path d={`M${x - w * 0.25} ${y - 20} Q${x} ${y - hh * 0.4} ${x + w * 0.25} ${y - 20} Z`} fill="#FFFFFF" />
      <circle cx={x} cy={y - hh * 0.5} r={hh * 0.4} fill="#FFB36B" opacity={0.25} />
    </g>
  );
};

/** Championship belt. Centre plate reads `name`. (stage space; s = scale; spin squashes it). */
export const Belt: React.FC<{ x: number; y: number; s?: number; rot?: number; spin?: number; name?: string; curve?: number }> = ({
  x, y, s = 1, rot = 0, spin = 1, name = 'AMAAN', curve = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * spin} ${s})`}>
    {/* strap */}
    <path d={`M-520 ${-50 + curve} Q0 ${-70 - curve} 520 ${-50 + curve} L520 ${50 + curve} Q0 ${30 - curve} -520 ${50 + curve} Z`} fill={RED} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    {[-380, -270, 270, 380].map((dx) => (
      <g key={dx}>
        <circle cx={dx} cy={-4 + curve * 0.5} r={42} fill="#FFD064" stroke={INK} strokeWidth={9} />
        <path d={softStar(dx, -4 + curve * 0.5, 26, 11, 5)} fill="#FFF3C4" />
      </g>
    ))}
    {/* centre plate */}
    <path d="M-200 -150 Q0 -210 200 -150 L230 0 L200 150 Q0 210 -200 150 L-230 0 Z" fill="#FFD064" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
    <path d="M-160 -116 Q0 -164 160 -116 L184 0 L160 116 Q0 164 -160 116 L-184 0 Z" fill="#F5B731" stroke="#C98B1E" strokeWidth={8} />
    <path d={softStar(0, -80, 46, 20, 5)} fill="#FFF3C4" stroke={INK} strokeWidth={6} />
    <text x={0} y={20} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={84} fill={RED} stroke={INK} strokeWidth={5} paintOrder="stroke">
      {name}
    </text>
    <text x={0} y={86} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={40} fill={INK} letterSpacing={4}>
      CHAMP
    </text>
    <path d="M-150 -100 Q-80 -130 -20 -128" fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.7} />
  </g>
);

/** Referee's arm from off-screen right (stage space): shoulder at (x0,y0), hand at (hx,hy). */
export const RefArm: React.FC<{ x0: number; y0: number; hx: number; hy: number }> = ({ x0, y0, hx, hy }) => {
  const a = Math.atan2(hy - y0, hx - x0);
  const len = Math.hypot(hx - x0, hy - y0);
  return (
    <g transform={`translate(${x0} ${y0}) rotate(${(a * 180) / Math.PI})`}>
      <rect x={0} y={-46} width={len} height={92} rx={40} fill="#FFFFFF" stroke={INK} strokeWidth={10} />
      {Array.from({ length: Math.floor(len / 70) }).map((_, i) => (
        <rect key={i} x={20 + i * 70} y={-46} width={30} height={92} fill="#1E1A2E" />
      ))}
      <rect x={0} y={-46} width={len} height={92} rx={40} fill="none" stroke={INK} strokeWidth={10} />
      <circle cx={len} cy={0} r={48} fill="#E9B08A" stroke={INK} strokeWidth={10} />
    </g>
  );
};

/** The title belt worn at the waist, in torso space (draw it in Hero's `between` layer with the torso matrix). */
export const BeltOn: React.FC<{ name?: string; shine?: number }> = ({ name = 'AMAAN', shine = 0 }) => (
  <g>
    <path d="M-78 -36 Q0 -24 78 -36 L76 6 Q0 18 -76 6 Z" fill={RED} stroke={INK} strokeWidth={6.5} strokeLinejoin="round" />
    {[-60, 60].map((x) => (
      <circle key={x} cx={x} cy={-14} r={11} fill="#FFD064" stroke={INK} strokeWidth={4} />
    ))}
    <path d="M-62 -52 Q0 -74 62 -52 L72 -14 L62 24 Q0 46 -62 24 L-72 -14 Z" fill="#FFD064" stroke={INK} strokeWidth={6.5} strokeLinejoin="round" />
    <path d="M-50 -42 Q0 -60 50 -42 L58 -14 L50 14 Q0 32 -50 14 L-58 -14 Z" fill="#F5B731" stroke="#C98B1E" strokeWidth={3} />
    <path d={softStar(0, -36, 12, 5, 5)} fill="#FFF3C4" stroke={INK} strokeWidth={2.5} />
    <text x={0} y={-6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={27} fill={RED} stroke={INK} strokeWidth={2} paintOrder="stroke">
      {name}
    </text>
    <text x={0} y={14} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={13} fill={INK} letterSpacing={2}>
      CHAMP
    </text>
    {shine > 0 ? <path d={softStar(40, -40, 30 * shine, 6 * shine, 4, 0)} fill="#FFFFFF" /> : null}
  </g>
);
