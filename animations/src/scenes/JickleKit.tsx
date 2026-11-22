// Shared set for Jickle #2-#5: a pickleball court in real perspective, seen from our side of the
// net (the viewer is the opponent). Three looks: day at the club, sunset on the beach, night under
// the lights. Plus the props: chef's hat, pickles, a flip scoreboard.
import React from 'react';
import { camP, Cam } from '../fx/Stage';
import { Cloud, Glow, Sun, Stars } from '../fx/fx';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { rng, cloudPath } from '../lib/shape';
import { INK, Shake } from './kit';

/* ------------------------------ projection ------------------------------ */
/** Camera 8 ft up, 7 ft behind the net. X = feet right of centre, Z = feet past the net, h = height. */
export const J = { HY: 400, F: 1300, D: 7, HC: 8 };
export const jK = (Z: number) => J.F / (Z + J.D);
export const jP = (X: number, Z: number, h = 0): [number, number] => [540 + jK(Z) * X, J.HY + jK(Z) * (J.HC - h)];
/** hero scale for someone standing at depth Z (the rig is ~163 units to the foot) */
export const jS = (Z: number) => jK(Z) / 163;
/** stage point -> world X and height, on the plane at depth Z */
export const jUn = (sx: number, sy: number, Z: number) => ({ X: (sx - 540) / jK(Z), h: J.HC - (sy - J.HY) / jK(Z) });
/** cartoon ball radius at depth Z */
export const jR = (Z: number) => jK(Z) * 0.3;
export const JGREEN = '#45B87A';
export const JGREEN_D = '#2A7D52';

export type JTheme = 'day' | 'sunset' | 'night';
const TH: Record<JTheme, { sky0: string; sky1: string; ground: string; court: string; kitchen: string; line: string; wind: string; windText: string; shade: number }> = {
  day: { sky0: '#7DB0FA', sky1: '#D8EFFC', ground: '#67B877', court: '#6967CF', kitchen: '#5553BF', line: '#FFFFFF', wind: '#2F6B49', windText: '#FFFFFF', shade: 0 },
  sunset: { sky0: '#6A4CC4', sky1: '#FFB27A', ground: '#F1C88E', court: '#3E7FD0', kitchen: '#2F68B6', line: '#FFF6EA', wind: '#2A3F70', windText: '#FFD49A', shade: 0.12 },
  night: { sky0: '#0A0F2E', sky1: '#26306A', ground: '#2C664C', court: '#4543A9', kitchen: '#363490', line: '#F2F0FF', wind: '#18372B', windText: '#BDF5CF', shade: 0.25 },
};
export const jTheme = (t: JTheme) => TH[t];

const quad = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) =>
  `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}L${c[0].toFixed(1)} ${c[1].toFixed(1)}L${d[0].toFixed(1)} ${d[1].toFixed(1)}Z`;
const LW = 0.32; // painted line width, feet (fattened for the cartoon)
const lineZ = (Z: number, x0: number, x1: number) => quad(jP(x0, Z - LW / 2), jP(x1, Z - LW / 2), jP(x1, Z + LW / 2), jP(x0, Z + LW / 2));
const lineX = (X: number, z0: number, z1: number) => quad(jP(X - LW / 2, z0), jP(X + LW / 2, z0), jP(X + LW / 2, z1), jP(X - LW / 2, z1));

/* ------------------------------ scenery ------------------------------ */
const Palm: React.FC<{ x: number; y: number; s: number; lean: number; f: number; c: string }> = ({ x, y, s, lean, f, c }) => {
  const sway = Math.sin(f / 22 + x) * 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${lean + sway * 0.3})`}>
      <path d="M-10 0 Q-30 -200 10 -420 L30 -420 Q-6 -200 14 0 Z" fill={c} />
      {[-150, -100, -40, 20, 80, 140].map((a, i) => (
        <path key={i} d="M20 -420 Q120 -470 220 -400 Q120 -440 20 -400 Z" fill={c} transform={`rotate(${a + sway} 20 -420)`} />
      ))}
    </g>
  );
};

const LightPole: React.FC<{ x: number; y0: number; y1: number; on: number; w: number }> = ({ x, y0, y1, on, w }) => (
  <g>
    <rect x={x - w * 0.5} y={y1} width={w} height={y0 - y1} fill="#3B4466" stroke={INK} strokeWidth={6} />
    <rect x={x - w * 3} y={y1 - w * 2.2} width={w * 6} height={w * 2.4} rx={w * 0.5} fill="#2B3150" stroke={INK} strokeWidth={6} />
    {[-2, -0.7, 0.7, 2].map((k) => (
      <circle key={k} cx={x + k * w} cy={y1 - w} r={w * 0.55} fill={on > 0 ? '#FFF6C9' : '#59607E'} stroke={INK} strokeWidth={4} />
    ))}
    {on > 0 ? <circle cx={x} cy={y1 - w} r={w * 5 * Math.max(1, on)} fill="#FFF6C9" opacity={Math.min(0.9, 0.25 * on)} /> : null}
  </g>
);

/** Everything behind the hero: sky, scenery, fence, court. */
export const JCourt: React.FC<{
  f: number; cam: Cam; sh: Shake; theme: JTheme; kitchen?: 'plain' | 'tiles'; lights?: number; banner?: string; children?: React.ReactNode; far?: React.ReactNode; sunX?: number;
  /** extra drawing at each light-pole lamp head (night only) */
  lampFx?: (x: number, y: number) => React.ReactNode;
}> = ({ f, cam, sh, theme, kitchen = 'plain', lights = 1, banner = 'JICKLE CLUB', children, far, sunX = 780, lampFx }) => {
  const t = TH[theme];
  const r = rng(17);
  const fenceY0 = jP(0, 30)[1];
  const fenceY1 = jP(0, 30, 10)[1];
  const windY = jP(0, 30, 6)[1];
  return (
    <>
      <defs>
        <linearGradient id={`jsky-${theme}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.sky0} />
          <stop offset="1" stopColor={t.sky1} />
        </linearGradient>
      </defs>
      <g transform={camP(cam, 0.25, sh)}>
        <rect x={-900} y={-1400} width={2880} height={2300} fill={`url(#jsky-${theme})`} />
        {theme === 'day'
          ? [0, 1, 2, 3].map((i) => <Cloud key={i} x={((i * 430 + f * 0.7) % 1700) - 300} y={-60 + i * 110} w={330} h={130} seed={i + 21} />)
          : null}
        {theme === 'sunset'
          ? [0, 1, 2].map((i) => (
              <path key={i} d={cloudPath(((i * 520 + f * 0.4) % 1700) - 200, -200 + i * 150, 380, 80, i + 3)} fill="#FF9F86" opacity={0.75} />
            ))
          : null}
        {theme === 'night' ? (
          <>
            <Stars f={f} n={60} seed={4} area={[-300, -1300, 1980, 1900]} />
            <circle cx={820} cy={60} r={70} fill="#FFF6D6" />
            <circle cx={848} cy={44} r={62} fill={t.sky0} opacity={0.9} />
          </>
        ) : null}
      </g>
      <g transform={camP(cam, 0.55, sh)}>
        {theme === 'day'
          ? Array.from({ length: 12 }).map((_, i) => {
              const x = -480 + i * 190 + r() * 50;
              const h = 150 + r() * 110;
              return <circle key={i} cx={x} cy={fenceY0 - h} r={110 + r() * 40} fill={i % 2 ? '#69B86C' : '#5DAA60'} stroke={INK} strokeWidth={7} />;
            })
          : null}
        {theme === 'night'
          ? Array.from({ length: 14 }).map((_, i) => {
              const x = -500 + i * 170;
              const h = 140 + ((i * 53) % 160);
              return (
                <g key={i}>
                  <rect x={x} y={fenceY0 - h - 120} width={150} height={h + 200} fill="#1B2148" />
                  {Array.from({ length: 6 }).map((__, k) => (
                    <rect key={k} x={x + 20 + (k % 3) * 40} y={fenceY0 - h - 90 + Math.floor(k / 3) * 60} width={22} height={30} fill="#FFE59A" opacity={(i + k) % 3 === 0 ? 0.8 : 0.15} />
                  ))}
                </g>
              );
            })
          : null}
        {far}
      </g>
      {theme === 'sunset' ? (
        <g transform={camP(cam, 1, sh)}>
          {/* the sea runs to the horizon, the sun sits on it, palms on the sand */}
          <Sun x={sunX} y={J.HY - 40} r={170} f={f} rays={false} color="#FFE08A" />
          <rect x={-1600} y={J.HY} width={4300} height={fenceY0 - J.HY + 10} fill="#5F7FD9" />
          <rect x={-1600} y={J.HY} width={4300} height={26} fill="#7E9BEA" />
          <path d={`M${sunX - 150} ${J.HY + 4} L${sunX + 150} ${J.HY + 4} L${sunX + 60} ${jP(0, 46)[1]} L${sunX - 60} ${jP(0, 46)[1]} Z`} fill="#FFD9A6" opacity={0.55} />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={((i * 260 + f * (i % 2 ? 0.6 : -0.4)) % 2400) - 600} y={J.HY + 30 + (i % 5) * 34} width={120 + (i % 3) * 70} height={7} rx={3.5} fill="#FFE3BC" opacity={0.7} />
          ))}
          <rect x={-1600} y={jP(0, 44)[1]} width={4300} height={600} fill={t.ground} />
          <path d={`M-1600 ${jP(0, 44)[1]} ${Array.from({ length: 30 }).map((_, i) => `Q${-1600 + i * 150 + 75} ${jP(0, 44)[1] - 10 - Math.sin(f / 9 + i) * 6} ${-1600 + (i + 1) * 150} ${jP(0, 44)[1]}`).join(' ')}`} fill="none" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" opacity={0.8} />
          <Palm x={jP(-26, 38)[0]} y={jP(-26, 38)[1]} s={jK(38) / 21} lean={-8} f={f} c="#3A2B5E" />
          <Palm x={jP(-19, 41)[0]} y={jP(-19, 41)[1]} s={jK(41) / 24} lean={6} f={f + 30} c="#3A2B5E" />
          <Palm x={jP(24, 37)[0]} y={jP(24, 37)[1]} s={jK(37) / 20} lean={10} f={f + 60} c="#3A2B5E" />
          {/* rope fence */}
          {Array.from({ length: 13 }).map((_, i) => {
            const [x, y] = jP(-30 + i * 5, 30);
            return <rect key={i} x={x - 7} y={y - jK(30) * 3} width={14} height={jK(30) * 3} rx={5} fill="#8A5A3C" stroke={INK} strokeWidth={4} />;
          })}
          <path d={`M${jP(-30, 30)[0]} ${jP(0, 30, 2.6)[1]} L${jP(30, 30)[0]} ${jP(0, 30, 2.6)[1]}`} stroke="#F7E3C0" strokeWidth={7} />
          <path d={`M${jP(-30, 30)[0]} ${jP(0, 30, 1.5)[1]} L${jP(30, 30)[0]} ${jP(0, 30, 1.5)[1]}`} stroke="#F7E3C0" strokeWidth={7} />
        </g>
      ) : null}
      <g transform={camP(cam, 0.92, sh)} opacity={theme === 'sunset' ? 0 : 1}>
        {/* fence + windscreen */}
        <rect x={-900} y={fenceY1} width={2880} height={fenceY0 - fenceY1} fill="#000" opacity={0.08} />
        <g opacity={0.45}>
          {Array.from({ length: 64 }).map((_, i) => (
            <line key={i} x1={-900 + i * 46} y1={fenceY1} x2={-900 + i * 46 + (fenceY0 - fenceY1)} y2={fenceY0} stroke={theme === 'night' ? '#8E9BC7' : '#FFFFFF'} strokeWidth={3} />
          ))}
        </g>
        <rect x={-900} y={windY} width={2880} height={fenceY0 - windY} fill={t.wind} stroke={INK} strokeWidth={6} />
        {[-500, 140, 780, 1420].map((x) => (
          <text key={x} x={x} y={(windY + fenceY0) / 2 + 4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={72} fill={t.windText} opacity={0.9}>
            {banner}
          </text>
        ))}
        <rect x={-900} y={fenceY1 - 8} width={2880} height={14} fill="#A3A2B9" stroke={INK} strokeWidth={5} />
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={-880 + i * 300} y={fenceY1 - 10} width={16} height={fenceY0 - fenceY1 + 10} fill="#A3A2B9" stroke={INK} strokeWidth={5} />
        ))}
        {theme === 'night' ? (
          <>
            <LightPole x={90} y0={fenceY0} y1={fenceY1 - 380} on={lights} w={26} />
            <LightPole x={990} y0={fenceY0} y1={fenceY1 - 380} on={lights} w={26} />
            {lampFx ? lampFx(90, fenceY1 - 380 - 26) : null}
            {lampFx ? lampFx(990, fenceY1 - 380 - 26) : null}
          </>
        ) : null}
      </g>
      <g transform={camP(cam, 1, sh)}>
        <rect x={-1600} y={theme === 'sunset' ? jP(0, 44)[1] : fenceY0 - 6} width={4300} height={4000} fill={t.ground} />
        {theme === 'sunset'
          ? Array.from({ length: 40 }).map((_, i) => {
              const rr = rng(i + 300);
              const X = -40 + rr() * 80;
              const Z = -2 + rr() * 30;
              const [x, y] = jP(X, Z);
              return <ellipse key={i} cx={x} cy={y} rx={jK(Z) * 0.5} ry={jK(Z) * 0.12} fill="#D9A86C" opacity={0.6} />;
            })
          : null}
        {/* court */}
        <path d={quad(jP(-10.6, 22.6), jP(10.6, 22.6), jP(10.6, -5.5), jP(-10.6, -5.5))} fill={INK} opacity={0.18} />
        <path d={quad(jP(-10, 22), jP(10, 22), jP(10, -5.5), jP(-10, -5.5))} fill={t.court} />
        {kitchen === 'tiles' ? (
          <g>
            {Array.from({ length: 8 * 7 }).map((_, i) => {
              const cx = i % 8;
              const cz = Math.floor(i / 8);
              const x0 = -10 + cx * 2.5;
              const z0 = -5.25 + cz * 1.75;
              if (z0 >= 7) return null;
              return <path key={i} d={quad(jP(x0, z0 + 1.75), jP(x0 + 2.5, z0 + 1.75), jP(x0 + 2.5, z0), jP(x0, z0))} fill={(cx + cz) % 2 ? '#F7F3FF' : '#E2504F'} />;
            })}
          </g>
        ) : (
          <path d={quad(jP(-10, 7), jP(10, 7), jP(10, -5.5), jP(-10, -5.5))} fill={t.kitchen} />
        )}
        <g fill={t.line}>
          <path d={lineZ(22, -10, 10)} />
          <path d={lineZ(7, -10, 10)} />
          <path d={lineX(-10, 22, -5.5)} />
          <path d={lineX(10, 22, -5.5)} />
          <path d={lineX(0, 22, 7)} />
        </g>
        {theme === 'night' && lights > 0 ? (
          <>
            <path d={`M${jP(-14, 28)[0]} ${jP(0, 28, 22)[1]} L${jP(-9, 2)[0]} ${jP(0, 2)[1]} L${jP(3, 2)[0]} ${jP(0, 2)[1]} Z`} fill="#FFF6C9" opacity={0.06 * lights} />
            <path d={`M${jP(14, 28)[0]} ${jP(0, 28, 22)[1]} L${jP(9, 2)[0]} ${jP(0, 2)[1]} L${jP(-3, 2)[0]} ${jP(0, 2)[1]} Z`} fill="#FFF6C9" opacity={0.06 * lights} />
          </>
        ) : null}
        {t.shade > 0 ? <rect x={-1600} y={-1400} width={4300} height={5400} fill={theme === 'night' ? '#0A0F2E' : '#6A4CC4'} opacity={t.shade} /> : null}
        {children}
      </g>
    </>
  );
};

/** The net, at Z = 0 (draw it in front of the hero, in the camera's depth-1 group). */
export const JNet: React.FC<{ f?: number; wob?: number; theme?: JTheme; sign?: React.ReactNode }> = ({ f = 0, wob = 0, theme = 'day', sign }) => {
  const top = (X: number) => jP(X, 0, 2.86 + 0.14 * (X / 11) ** 2 + Math.sin(X * 0.6 + f * 0.9) * wob * 0.12)[1];
  const y0 = jP(0, 0)[1];
  const xs: number[] = [];
  for (let X = -13; X <= 13.01; X += 0.5) xs.push(X);
  const topD = xs.map((X, i) => `${i ? 'L' : 'M'}${jP(X, 0)[0].toFixed(1)} ${top(X).toFixed(1)}`).join('');
  const meshV: string[] = [];
  for (let X = -13; X <= 13; X += 0.32) {
    const x = jP(X, 0)[0];
    meshV.push(`M${x.toFixed(1)} ${top(X).toFixed(1)}L${x.toFixed(1)} ${y0}`);
  }
  const meshH: string[] = [];
  for (let h = 0.25; h < 2.86; h += 0.3) meshH.push(`M${jP(-13, 0)[0]} ${jP(0, 0, h)[1].toFixed(1)}L${jP(13, 0)[0]} ${jP(0, 0, h)[1].toFixed(1)}`);
  const c = theme === 'night' ? '#0D0A1E' : '#311724';
  return (
    <g>
      <path d={`${topD}L${jP(13, 0)[0]} ${y0}L${jP(-13, 0)[0]} ${y0}Z`} fill={c} opacity={0.16} />
      <path d={meshV.join('') + meshH.join('')} stroke={c} strokeWidth={3.5} opacity={0.5} fill="none" />
      <path d={topD} fill="none" stroke={INK} strokeWidth={34} strokeLinejoin="round" />
      <path d={topD} fill="none" stroke="#FFFFFF" strokeWidth={24} strokeLinejoin="round" />
      <path d={topD} fill="none" stroke="#D8D2EA" strokeWidth={6} strokeLinejoin="round" transform="translate(0 7)" />
      {sign}
    </g>
  );
};

/* ------------------------------ props ------------------------------ */
/** Chef's toque (head space). */
export const ChefHat: React.FC<{ k?: number; wob?: number }> = ({ k = 1, wob = 0 }) =>
  k <= 0.01 ? null : (
    <g transform={`translate(0 -300) scale(${k}) rotate(${wob}) translate(0 300)`}>
      <path d={cloudPath(0, -470, 300, 210, 12)} fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={cloudPath(-40, -500, 120, 80, 5)} fill="#EEEAF8" />
      <path d="M-128 -388 L128 -388 L120 -276 Q0 -296 -120 -276 Z" fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      {[-70, -20, 30, 80].map((x) => (
        <path key={x} d={`M${x} -380 L${x - 4} -290`} stroke="#D9D2EC" strokeWidth={6} strokeLinecap="round" />
      ))}
    </g>
  );

/** A pickle (centred, long axis vertical; s = scale). */
export const Pickle: React.FC<{ s?: number; rot?: number; bite?: number }> = ({ s = 1, rot = 0, bite = 0 }) => (
  <g transform={`rotate(${rot}) scale(${s})`}>
    <defs>
      <clipPath id="pickleBite">
        <path d={`M-200 -200 L200 -200 L200 200 L-200 200 Z ${bite > 0 ? `M-40 ${-112 + bite * 60} a28 28 0 1 1 1 0 Z M14 ${-118 + bite * 60} a26 26 0 1 1 1 0 Z` : ''}`} clipRule="evenodd" />
      </clipPath>
    </defs>
    <g clipPath={bite > 0 ? 'url(#pickleBite)' : undefined}>
      <path d="M-34 -96 C-58 -60 -60 40 -36 92 C-20 120 22 120 36 92 C60 40 58 -60 34 -96 C18 -124 -18 -124 -34 -96 Z" fill="#6DB33F" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d="M-14 -90 C-30 -40 -30 40 -16 80" fill="none" stroke="#A6DB6A" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
      {[
        [-24, -50], [20, -70], [26, -10], [-30, 10], [18, 40], [-16, 64], [30, 76],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={7} fill="#4B8A2A" />
      ))}
      {bite > 0 ? <path d={`M-62 ${-104 + bite * 60} Q-20 ${-70 + bite * 60} 40 ${-108 + bite * 60}`} fill="none" stroke="#D7F2A8" strokeWidth={8} /> : null}
    </g>
  </g>
);

/** Pickles raining down (screen space). */
export const PickleRain: React.FC<{ f: number; start: number; n?: number; seed?: number; top: number; bot: number }> = ({ f, start, n = 26, seed = 5, top, bot }) => {
  const t = f - start;
  if (t < 0) return null;
  const r = rng(seed);
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = -60 + r() * 1200;
    const delay = r() * 40;
    const speed = 26 + r() * 22;
    const s = 0.45 + r() * 0.5;
    const spin = (r() - 0.5) * 16;
    const tt = t - delay;
    if (tt < 0) continue;
    const y = top - 140 + tt * speed;
    if (y > bot + 160) continue;
    items.push(
      <g key={i} transform={`translate(${x + Math.sin(tt / 6 + i) * 20} ${y})`}>
        <Pickle s={s} rot={r() * 360 + tt * spin} />
      </g>,
    );
  }
  return <g>{items}</g>;
};

/** Flip-card scoreboard on legs (stage space; x,y = top centre; s = scale). flip 0->1 turns the left card from `a` to `a2`. */
export const Scoreboard: React.FC<{ x: number; y: number; s: number; a: string; a2: string; b: string; flip: number; nameA?: string; nameB?: string }> = ({
  x, y, s, a, a2, b, flip, nameA = 'ME', nameB = 'YOU',
}) => {
  const card = (cx: number, txt: string, sy = 1, dark = 0) => (
    <g transform={`translate(${cx} 150) scale(1 ${sy})`}>
      <rect x={-110} y={-110} width={220} height={220} rx={18} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
      {dark > 0 ? <rect x={-110} y={-110} width={220} height={220} rx={18} fill={INK} opacity={dark * 0.35} /> : null}
      <text x={0} y={10} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={150} fill={INK}>
        {txt}
      </text>
      <line x1={-110} y1={0} x2={110} y2={0} stroke={INK} strokeWidth={5} opacity={0.35} />
    </g>
  );
  // the left card: first half folds the old number down, second half unfolds the new one
  const half = flip < 0.5;
  const k = half ? Math.cos(flip * Math.PI) : -Math.cos(flip * Math.PI);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-300} y={250} width={20} height={300} fill="#7E7A93" stroke={INK} strokeWidth={7} />
      <rect x={280} y={250} width={20} height={300} fill="#7E7A93" stroke={INK} strokeWidth={7} />
      <rect x={-320} y={-60} width={640} height={330} rx={30} fill={JGREEN} stroke={INK} strokeWidth={10} />
      <text x={-150} y={-18} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={56} fill="#FFFFFF" letterSpacing={3}>
        {nameA}
      </text>
      <text x={150} y={-18} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={56} fill="#FFFFFF" letterSpacing={3}>
        {nameB}
      </text>
      <text x={0} y={150} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={90} fill="#FFFFFF">
        -
      </text>
      {card(-150, half ? a : a2, Math.max(0.02, Math.abs(k)), half ? flip * 2 : 0)}
      {card(150, b)}
    </g>
  );
};

/** Little hanging sign for the net (stage space at x,y). */
export const NetSign: React.FC<{ x: number; y: number; s: number; text: string; rot?: number }> = ({ x, y, s, text, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-60 -60 L0 -110 L60 -60" fill="none" stroke={INK} strokeWidth={6} />
    <rect x={-170} y={-64} width={340} height={110} rx={18} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
    <text x={0} y={-6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={54} fill="#E2504F">
      {text}
    </text>
  </g>
);

export { Glow };
