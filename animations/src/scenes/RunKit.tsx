// Shared pieces for the extra run celebrations: speed/phase tables, the run-cycle pose and a themeable track world.
import React from 'react';
import { Pose } from '../hero/Hero';
import { kf, seg, lerp, EaseFn } from '../lib/anim';
import { camP, Cam } from '../fx/Stage';
import { Cloud, Sun } from '../fx/fx';
import { rng } from '../lib/shape';
import { INK, Shake } from './kit';

export const HY = 800;
export const K = 1100;
export const FX = 700;
export const ZH = 1.3;
export const proj = (X: number, Z: number) => ({ x: 540 + (X * FX) / Z, y: HY + K / Z, s: 1 / Z });

type KF = [number, number, EaseFn?][];

/** Pre-integrates distance and stride phase for a speed profile (world units / frame) and a stride period profile. */
export function makeRun(speed: KF, period: KF, stop: [number, number] = [999, 1000]) {
  const D: number[] = [];
  const PH: number[] = [];
  let d = 0;
  let ph = 0;
  for (let i = 0; i < 400; i++) {
    D.push(d);
    PH.push(ph);
    d += kf(i, speed);
    ph += ((Math.PI * 2) / kf(i, period)) * (1 - seg(i, stop[0], stop[1]));
  }
  const at = (arr: number[], f: number) => {
    const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)));
    return lerp(arr[i], arr[i + 1], f - i);
  };
  return { distAt: (f: number) => at(D, f), phAt: (f: number) => at(PH, f), speedAt: (f: number) => kf(f, speed) };
}

/** Run-cycle pose. turbo 0..1 = all-out sprint face/lean. */
export const gait = (ph: number, turbo: number): Partial<Pose> => {
  const s = Math.sin(ph);
  const uL = Math.max(0, s) ** 0.8;
  const uR = Math.max(0, -s) ** 0.8;
  const kL = -s;
  const arm = (k: number) => {
    const fw = Math.max(0, k);
    const bk = Math.max(0, -k);
    return { sh: 16 - 6 * fw + 14 * bk, el: -(70 + 80 * fw - 30 * bk), ua: 1 - 0.32 * fw, fa: 1 - 0.1 * fw - 0.2 * bk, wr: -20 * fw };
  };
  const aL = arm(kL);
  const aR = arm(-kL);
  const bob = Math.abs(Math.cos(ph));
  const leg = (u: number) => ({ hip: 4 + 10 * u, th: 1 - 0.68 * u, kn: -4 + 22 * u, ft: 14 * u, sh: 1 - 0.22 * u });
  const lL = leg(uL);
  const lR = leg(uR);
  return {
    hipL: lL.hip, thL: lL.th, knL: lL.kn, ftL: lL.ft, shinL: lL.sh,
    hipR: lR.hip, thR: lR.th, knR: lR.kn, ftR: lR.ft, shinR: lR.sh,
    shL: aL.sh, elL: aL.el, uaL: aL.ua, faL: aL.fa, wrL: aL.wr,
    shR: aR.sh, elR: aR.el, uaR: aR.ua, faR: aR.fa, wrR: aR.wr,
    torso: 4 * s, head: -3 * s, torsoSy: 0.95 - 0.04 * turbo,
    sy: 1 + 0.03 * bob, sx: 1 - 0.02 * bob,
    flexL: 0.6, flexR: 0.6,
    mouthOpen: 0.35 + 0.15 * Math.abs(s) + 0.2 * turbo, smile: 1 - 0.3 * turbo, mouthMode: 'grin',
    lid: 0.15 + 0.3 * turbo, browTilt: -0.3 - 0.7 * turbo, brow: 0.2, sweat: 0.7,
  };
};
/** Foot-bounce lift for plant() while running. */
export const runLift = (ph: number) => Math.max(0, Math.cos(ph * 2)) * 14;

export const STOP: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -24, knR: -24, thL: 0.9, thR: 0.9, ftL: 4, ftR: 4, shinL: 1, shinR: 1,
  shL: 60, shR: 60, elL: 40, elR: 40, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, handL: 'open', handR: 'open',
  torso: 0, head: 0, torsoSy: 0.92, sy: 0.92, sx: 1.06,
  mouthMode: 'o', mouthOpen: 0.7, lid: 0, browTilt: 0, brow: 1, sweat: 1, pupil: 0.7,
};
export const VICTORY: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, shinL: 1, shinR: 1,
  shL: 152, shR: 152, elL: -14, elR: -14, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0, handL: 'open', handR: 'open',
  torsoSy: 1, sy: 1, sx: 1, chestS: 1.05, torso: 0, head: 0,
  mouthMode: 'grin', mouthOpen: 1, smile: 1, eyes: 1, brow: 0.8, sweat: 0, pupil: 1, lid: 0, browTilt: 0,
};

/* ------------------------------- world ------------------------------- */
export type Theme = {
  sky: [string, string, string];
  grass: [string, string];
  track: string;
  lane: string;
  hillFar: [string, string];
  hillNear: [string, string];
  tree: 'round' | 'pine' | 'snow' | 'night';
  sun: 'sun' | 'moon' | 'low' | 'none';
  cloud?: { fill: string; shade: string; line: string } | null;
  edge?: string;
};

export const THEMES: Record<'day' | 'snow' | 'night' | 'golden', Theme> = {
  day: {
    sky: ['#80ADFC', '#ACDCF9', '#F3EDFF'], grass: ['#71BC63', '#80CB76'], track: '#DE6C59', lane: '#FFFFFF',
    hillFar: ['#A6CFBE', '#7CAF9B'], hillNear: ['#91C99C', '#73AE80'], tree: 'round', sun: 'sun',
  },
  snow: {
    sky: ['#93B1F0', '#C9DBFA', '#F5F1FF'], grass: ['#F3F5FF', '#E2E7FA'], track: '#C9665E', lane: '#FFFFFF',
    hillFar: ['#E6E9FB', '#B9C2EA'], hillNear: ['#F7F8FF', '#C5CDEF'], tree: 'snow', sun: 'low',
    edge: '#FFFFFF',
  },
  night: {
    sky: ['#1A1D4C', '#33357A', '#6B5CA6'], grass: ['#2D5759', '#356466'], track: '#8C4A5F', lane: '#D9D4FF',
    hillFar: ['#3A3F7C', '#2A2E63'], hillNear: ['#2F4F5E', '#243F4D'], tree: 'night', sun: 'moon', cloud: null,
  },
  golden: {
    sky: ['#8B95F2', '#F7BFA6', '#FFE7C7'], grass: ['#7BB95E', '#8AC66B'], track: '#D9644F', lane: '#FFF6E8',
    hillFar: ['#C9B9D8', '#A796C2'], hillNear: ['#A3C98F', '#7FAE73'], tree: 'round', sun: 'low',
    cloud: { fill: '#FFE6D6', shade: '#F3B8A6', line: '#9A6A8E' },
  },
};

const RoundTree: React.FC<{ x: number; y: number; s: number; seed: number; cols?: string[]; line?: string; trunk?: string }> = ({
  x, y, s, seed, cols = ['#6DBE6C', '#5FAC5E', '#80C97B'], line = INK, trunk = '#9C6238',
}) => {
  const r = rng(seed);
  const col = cols[Math.floor(r() * cols.length)];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={-140} width={28} height={140} rx={8} fill={trunk} stroke={line} strokeWidth={8} />
      <circle cx={0} cy={-200} r={100} fill={col} stroke={line} strokeWidth={8} />
      <circle cx={-40} cy={-160} r={58} fill={col} stroke={line} strokeWidth={8} />
      <circle cx={46} cy={-166} r={60} fill={col} stroke={line} strokeWidth={8} />
      <circle cx={0} cy={-190} r={92} fill={col} />
      <circle cx={-30} cy={-230} r={34} fill="#FFFFFF" opacity={0.25} />
    </g>
  );
};

export const Pine: React.FC<{ x: number; y: number; s: number; seed: number; snow?: boolean; night?: boolean }> = ({ x, y, s, seed, snow, night }) => {
  const r = rng(seed);
  const g = night ? ['#24305A', '#2B3866'][Math.floor(r() * 2)] : ['#3E9A6A', '#358C60', '#46A673'][Math.floor(r() * 3)];
  const line = night ? '#141633' : INK;
  const tiers = [
    [0, -110, 120],
    [0, -190, 96],
    [0, -262, 72],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={-90} width={28} height={90} rx={6} fill={night ? '#3A2C47' : '#8E5A36'} stroke={line} strokeWidth={8} />
      {tiers.map(([cx, cy, w], i) => (
        <g key={i}>
          <path d={`M${cx - w} ${cy + 40} L${cx} ${cy - 90} L${cx + w} ${cy + 40} Q${cx} ${cy + 58} ${cx - w} ${cy + 40} Z`} fill={g} stroke={line} strokeWidth={8} strokeLinejoin="round" />
          {snow ? (
            <path d={`M${cx - w * 0.62} ${cy - 2} L${cx} ${cy - 90} L${cx + w * 0.62} ${cy - 2} Q${cx + w * 0.3} ${cy + 16} ${cx + w * 0.1} ${cy} Q${cx - w * 0.2} ${cy + 20} ${cx - w * 0.62} ${cy - 2} Z`} fill="#FFFFFF" stroke={line} strokeWidth={6} strokeLinejoin="round" />
          ) : null}
          {night ? <path d={`M${cx + w * 0.2} ${cy + 30} L${cx} ${cy - 80} L${cx + w * 0.75} ${cy + 36}`} fill="none" stroke="#7E7BD6" strokeWidth={6} opacity={0.6} /> : null}
        </g>
      ))}
    </g>
  );
};

export const Moon: React.FC<{ x: number; y: number; r: number; f: number }> = ({ x, y, r, f }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.4} fill="#FFF3C4" opacity={0.08 + 0.02 * Math.sin(f / 10)} />
    <circle cx={x} cy={y} r={r * 1.6} fill="#FFF3C4" opacity={0.12} />
    <circle cx={x} cy={y} r={r} fill="#FFF1C2" stroke="#C9A75E" strokeWidth={7} />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.2} fill="#EBD69A" />
    <circle cx={x + r * 0.3} cy={y + r * 0.25} r={r * 0.14} fill="#EBD69A" />
    <circle cx={x + r * 0.15} cy={y - r * 0.4} r={r * 0.09} fill="#EBD69A" />
  </g>
);

export type WorldObj = { X: number; Z: number; draw: (x: number, y: number, s: number) => React.ReactNode };

/** Perspective track. D = distance run so far. extra = objects placed at absolute world Z (they scroll with D). */
export const TrackWorld: React.FC<{
  f: number; D: number; cam: Cam; sh: Shake; theme: Theme; blur?: number; extra?: WorldObj[]; seed?: number; signs?: [string, number][]; skyExtra?: React.ReactNode;
}> = ({ f, D, cam, sh, theme, blur = 0, extra = [], seed = 3, signs = [], skyExtra }) => {
  const bands = [];
  const period = 1.2;
  for (let i = 0; i < 40; i++) {
    const z0 = 0.4 + i * period * 0.5 - (D % period);
    const z1 = z0 + period * 0.5;
    if (z1 < 0.3) continue;
    const ya = HY + K / Math.max(0.3, z0);
    const yb = HY + K / z1;
    const dark = (i + Math.floor(D / period) * 2) % 2 === 0;
    bands.push(<rect key={i} x={-600} y={yb} width={2280} height={Math.max(0, ya - yb)} fill={dark ? theme.grass[0] : theme.grass[1]} />);
  }
  const e1 = proj(-1, 1000);
  const nz = K / (2600 - HY);
  const L = proj(-1, nz);
  const Rr = proj(1, nz);
  const marks = [];
  for (let i = 0; i < 30; i++) {
    const z = 0.5 + i * 0.9 - (D % 0.9);
    if (z < 0.35) continue;
    for (const X of [-0.67, 0.67]) {
      const a = proj(X - 0.1, z);
      const b = proj(X + 0.1, z);
      const c = proj(X + 0.1, z + 0.04);
      const d2 = proj(X - 0.1, z + 0.04);
      marks.push(<path key={`${i}${X}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}L${c.x} ${c.y}L${d2.x} ${d2.y}Z`} fill={theme.lane} opacity={0.7} />);
    }
  }
  const objs: WorldObj[] = [];
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const X = side * (1.7 + r() * 1.6);
    const Z = 1 + i * 0.9 + r() * 0.4;
    const sd = i;
    objs.push({
      X, Z,
      draw: (x, y, s) =>
        theme.tree === 'round' ? <RoundTree key={`t${sd}`} x={x} y={y} s={s * 0.9} seed={sd} /> : <Pine key={`t${sd}`} x={x} y={y} s={s * 0.95} seed={sd} snow={theme.tree === 'snow'} night={theme.tree === 'night'} />,
    });
  }
  for (let i = 0; i < 18; i++) {
    const sd = i;
    objs.push({
      X: i % 2 ? 1.18 : -1.18,
      Z: 0.8 + i * 1.6,
      draw: (x, y, s) => (
        <g key={`c${sd}`} transform={`translate(${x} ${y}) scale(${s * 0.8})`}>
          <path d="M-40 0 L-12 -110 L12 -110 L40 0 Z" fill="#F88F4D" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <path d="M-28 -46 L28 -46 L22 -70 L-22 -70 Z" fill="#FFFFFF" />
          <rect x={-52} y={-8} width={104} height={16} rx={6} fill="#F88F4D" stroke={INK} strokeWidth={7} />
          {theme.tree === 'snow' ? <path d="M-14 -110 Q0 -128 14 -110 Z" fill="#FFFFFF" stroke={INK} strokeWidth={5} /> : null}
        </g>
      ),
    });
  }
  signs.forEach(([text, Z], i) =>
    objs.push({
      X: i % 2 ? -1.5 : 1.5,
      Z,
      draw: (x, y, s) => (
        <g key={`s${i}`} transform={`translate(${x} ${y}) scale(${s * 0.9})`}>
          <rect x={-10} y={-260} width={20} height={260} fill="#A3A2B9" stroke={INK} strokeWidth={8} />
          <rect x={-120} y={-380} width={240} height={140} rx={22} fill="#6A5BE0" stroke={INK} strokeWidth={10} />
          <rect x={-104} y={-364} width={208} height={108} rx={14} fill="none" stroke="#FFFFFF" strokeWidth={6} />
          <text x={0} y={-292} textAnchor="middle" dominantBaseline="middle" fontFamily="Luckiest Guy" fontSize={80} fill="#FFFFFF">
            {text}
          </text>
        </g>
      ),
    }),
  );
  const vis = [...objs, ...extra]
    .map((o) => ({ ...o, z: o.Z - D }))
    .filter((o) => o.z > 0.32 && o.z < 30)
    .sort((a, b) => b.z - a.z);
  const cloud: Partial<{ fill: string; shade: string; line: string }> | null = theme.cloud === null ? null : theme.cloud ?? {};
  const id = `sky${theme.track.slice(1)}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.sky[0]} />
          <stop offset="0.7" stopColor={theme.sky[1]} />
          <stop offset="1" stopColor={theme.sky[2]} />
        </linearGradient>
        <filter id="vblur2" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${blur * 2} ${blur * 10}`} />
        </filter>
      </defs>
      <g transform={camP(cam, 0.2, sh)}>
        <rect x={-600} y={-600} width={2280} height={2000} fill={`url(#${id})`} />
        {theme.sun === 'sun' ? <Sun x={860} y={330} r={90} f={f} /> : null}
        {theme.sun === 'low' ? <Sun x={800} y={640} r={120} f={f} rays={false} color="#FFD98A" /> : null}
        {theme.sun === 'moon' ? <Moon x={800} y={330} r={110} f={f} /> : null}
        {skyExtra}
        {cloud
          ? [0, 1, 2, 3].map((i) => (
              <Cloud key={i} x={((i * 380 + f * 0.6) % 1500) - 240} y={230 + (i % 2) * 210} w={300 + i * 30} h={130} seed={i + 1} {...cloud} />
            ))
          : null}
      </g>
      <g transform={camP(cam, 0.6, sh)}>
        <path d={`M-600 ${HY + 4} Q-200 600 200 ${HY - 40} Q420 640 700 ${HY - 30} Q980 620 1300 ${HY - 10} L1700 ${HY + 4} Z`} fill={theme.hillFar[0]} stroke={theme.hillFar[1]} strokeWidth={6} />
        <path d={`M-600 ${HY + 4} Q-100 690 300 ${HY - 6} Q640 700 1000 ${HY - 4} Q1300 700 1700 ${HY + 4} Z`} fill={theme.hillNear[0]} stroke={theme.hillNear[1]} strokeWidth={6} />
      </g>
      <g transform={camP(cam, 1, sh)} filter={blur > 0.3 ? 'url(#vblur2)' : undefined}>
        {bands}
        <path d={`M${e1.x} ${e1.y} L${proj(1, 1000).x} ${e1.y} L${Rr.x} ${Rr.y} L${L.x} ${L.y} Z`} fill={theme.track} />
        {theme.edge
          ? [-1.04, 1.04].map((X) => {
              const far = proj(X, 1000);
              const near = proj(X, nz);
              return <line key={X} x1={far.x} y1={far.y} x2={near.x} y2={near.y} stroke={theme.edge} strokeWidth={40} />;
            })
          : null}
        {[-1, -0.34, 0.34, 1].map((X) => {
          const far = proj(X, 1000);
          const near = proj(X, nz);
          return <line key={X} x1={far.x} y1={far.y} x2={near.x} y2={near.y} stroke={theme.lane} strokeWidth={10} />;
        })}
        {marks}
        {vis.map((o) => {
          const pp = proj(o.X, o.z);
          return <React.Fragment key={`${o.X}:${o.Z}`}>{o.draw(pp.x, pp.y, pp.s)}</React.Fragment>;
        })}
      </g>
    </>
  );
};

/** Spinning "wheel legs" loops drawn at the knees during a sprint. */
export const WheelLegs: React.FC<{ knees: [number, number][]; f: number; o: number }> = ({ knees, f, o }) =>
  o > 0.2 ? (
    <>
      {knees.map(([kx, ky], i) => (
        <g key={i} transform={`translate(${kx + (i ? 10 : -10)} ${ky + 50}) rotate(${f * 47 + i * 120})`} opacity={0.9 * o}>
          <ellipse rx={70} ry={120} fill="none" stroke="#FFFFFF" strokeWidth={16} strokeDasharray="210 90" strokeLinecap="round" />
          <ellipse rx={70} ry={120} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="120 180" strokeDashoffset={-40} strokeLinecap="round" opacity={0.6} />
        </g>
      ))}
    </>
  ) : null;

