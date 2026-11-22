// Shared set for run #6-#10: running down the middle of a city street (and over the bridge).
// The camera dollies backwards in front of him, so the street rushes away behind him into the
// vanishing point: depth of a world object = S + D (D = distance run so far).
import React from 'react';
import { camP, Cam } from '../fx/Stage';
import { Cloud, Sun } from '../fx/fx';
import { TITLE_FONT } from '../fonts';
import { rng } from '../lib/shape';
import { INK, Shake } from './kit';
import { HY, K, FX, ZH } from './RunKit';

export { HY, K, FX, ZH };
export const ZMIN = 0.28;
export const ZFAR = 70;
/** Project world point (X across, depth z, height h) to the 1080×1920 design area. */
export const P = (X: number, z: number, h = 0) => ({ x: 540 + (FX * X) / z, y: HY + (K - FX * h) / z });

export type CityTheme = {
  sky: [string, string, string];
  sun: { x: number; y: number; r: number; color: string; rays: boolean } | null;
  road: string;
  lane: string;
  walk: string;
  walkLine: string;
  curb: string;
  bldg: string[];
  trim: string;
  win: string;
  winHi: string;
  skyline: [string, string];
  cloud: { fill: string; shade: string; line: string } | null;
  haze: string;
  water?: string;
};

export const CITY: Record<'dawn' | 'morning' | 'day' | 'golden', CityTheme> = {
  dawn: {
    sky: ['#7A78DA', '#F2A2B8', '#FFD9A0'], sun: { x: 540, y: 772, r: 150, color: '#FFB25C', rays: true },
    road: '#8B84A8', lane: '#FFF4E6', walk: '#D8CBE6', walkLine: '#B7A8CC', curb: '#EFE6F7',
    bldg: ['#B28BC0', '#C99AAE', '#9C8DC8', '#D4A5A1'], trim: '#7C5F96', win: '#5E5A9C', winHi: '#FFD59A',
    skyline: ['#C8A6D6', '#AE8CC8'], cloud: { fill: '#FFE3E6', shade: '#F6B8C6', line: '#9A6A8E' }, haze: '#F7B9B9', water: '#9C9AE0',
  },
  morning: {
    sky: ['#8EBEFF', '#CFE4FF', '#FFEBCB'], sun: { x: 860, y: 300, r: 90, color: '#FFD064', rays: true },
    road: '#8C8AA6', lane: '#FFFFFF', walk: '#E7E1F0', walkLine: '#C7BFD8', curb: '#F6F2FA',
    bldg: ['#E9A37E', '#F2DDBB', '#A9C9A4', '#C7B8F2', '#A9C5EE', '#F2B6B6'], trim: '#8E6E8C', win: '#6F86C9', winHi: '#DDEBFF',
    skyline: ['#CFDDF7', '#B6C8EE'], cloud: null, haze: '#FFF1DC',
  },
  day: {
    sky: ['#79AEFF', '#ACD6FF', '#EEF5FF'], sun: { x: 230, y: 260, r: 84, color: '#FFD064', rays: true },
    road: '#86849F', lane: '#FFFFFF', walk: '#E5E1EE', walkLine: '#C4BDD5', curb: '#F7F4FB',
    bldg: ['#D98A6A', '#F3E2C4', '#A9C9A4', '#C7B8F2', '#A9C5EE', '#E9B07E'], trim: '#6E5A7E', win: '#5F7BC4', winHi: '#D7E6FF',
    skyline: ['#C3D6F5', '#A7BDE8'], cloud: { fill: '#FFFFFF', shade: '#DCE6FF', line: '#8E9BD6' }, haze: '#EEF5FF',
  },
  golden: {
    sky: ['#8E86E8', '#F6B79C', '#FFE2B0'], sun: { x: 760, y: 610, r: 120, color: '#FFC46B', rays: false },
    road: '#8E7F9A', lane: '#FFF2DC', walk: '#EAD7D2', walkLine: '#CDB3AE', curb: '#F8ECE6',
    bldg: ['#D98A6A', '#F0CFA6', '#B9A2D6', '#E7A48F', '#A8B9D9'], trim: '#7A5A6E', win: '#6A6AAE', winHi: '#FFE0A8',
    skyline: ['#D9B6C8', '#C29DBA'], cloud: { fill: '#FFE6D6', shade: '#F3B8A6', line: '#9A6A8E' }, haze: '#FFD9B0',
  },
};

/* ------------------------------- layout ------------------------------- */
type Bldg = { side: -1 | 1; S0: number; S1: number; h: number; col: string; shop: boolean; awn: string; seed: number };
const FACADE = 2.4;
const WALK_IN = 1.5;

const makeBuildings = (theme: CityTheme, seed: number): Bldg[] => {
  const out: Bldg[] = [];
  const awnings = ['#F15F75', '#5C7CF0', '#45B87A', '#F2853A', '#7254DC'];
  for (const side of [-1, 1] as const) {
    const r = rng(seed + (side === 1 ? 101 : 0));
    let s = -60;
    while (s < 95) {
      const len = 2.6 + r() * 2.8;
      out.push({
        side, S0: s, S1: s + len, h: 4.5 + r() * 6.5, col: theme.bldg[Math.floor(r() * theme.bldg.length)],
        shop: r() < 0.55, awn: awnings[Math.floor(r() * awnings.length)], seed: Math.floor(r() * 1000),
      });
      s += len + (r() < 0.15 ? 0.6 : 0);
    }
  }
  return out;
};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

const quad = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) =>
  `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}L${c.x.toFixed(1)} ${c.y.toFixed(1)}L${d.x.toFixed(1)} ${d.y.toFixed(1)}Z`;

/** One building: near end wall + facade with windows, cornice and (maybe) a shop + awning. */
const Building: React.FC<{ b: Bldg; D: number; theme: CityTheme }> = ({ b, D, theme }) => {
  const X = b.side * FACADE;
  const zn = Math.max(ZMIN, b.S0 + D);
  const zf = b.S1 + D;
  if (zf <= ZMIN || zn > ZFAR) return null;
  const n0 = P(X, zn);
  const f0 = P(X, zf);
  const n1 = P(X, zn, b.h);
  const f1 = P(X, zf, b.h);
  const items: React.ReactNode[] = [];
  // near end wall (facing the camera), only seen where the nearer neighbour is shorter
  if (b.S0 + D > ZMIN) {
    const out = P(b.side * 9, zn);
    const top = P(b.side * 9, zn, b.h);
    items.push(<path key="end" d={quad(n0, out, top, n1)} fill={shade(b.col, 0.82)} stroke={INK} strokeWidth={Math.min(8, 30 / zn)} strokeLinejoin="round" />);
  }
  items.push(<path key="fac" d={quad(n0, f0, f1, n1)} fill={b.col} stroke={INK} strokeWidth={Math.min(8, 30 / zn)} strokeLinejoin="round" />);
  const detail = zf < 28;
  if (detail) {
    const r = rng(b.seed);
    const lit = r() < 0.5;
    // windows
    const floors: number[] = [];
    for (let h = 1.55; h + 0.75 < b.h - 0.35; h += 1.12) floors.push(h);
    const cols: number[] = [];
    for (let s = b.S0 + 0.38; s + 0.5 < b.S1 - 0.2; s += 0.95) cols.push(s);
    for (const h of floors) {
      for (const s of cols) {
        const za = s + D;
        const zb = s + 0.5 + D;
        if (za < ZMIN) continue;
        const a = P(X, za, h);
        const bb = P(X, zb, h);
        const c = P(X, zb, h + 0.72);
        const d = P(X, za, h + 0.72);
        items.push(<path key={`w${h}${s}`} d={quad(a, bb, c, d)} fill={theme.win} stroke={INK} strokeWidth={Math.min(5, 18 / za)} />);
        // glass glint: upper half lighter
        const m1 = P(X, za, h + 0.4);
        const m2 = P(X, zb, h + 0.4);
        items.push(<path key={`g${h}${s}`} d={quad(m1, m2, c, d)} fill={lit && (Math.round(s * 7 + h * 3) % 3 === 0) ? '#FFE7A6' : theme.winHi} opacity={0.75} />);
        // sill
        const s1 = P(X, za - 0.04, h - 0.02);
        const s2 = P(X, zb + 0.04, h - 0.02);
        const s3 = P(X, zb + 0.04, h - 0.1);
        const s4 = P(X, za - 0.04, h - 0.1);
        items.push(<path key={`s${h}${s}`} d={quad(s1, s2, s3, s4)} fill={theme.trim} opacity={0.8} />);
      }
    }
    // cornice
    const c1 = P(X, zn, b.h - 0.3);
    const c2 = P(X, zf, b.h - 0.3);
    items.push(<path key="corn" d={quad(c1, c2, f1, n1)} fill={theme.trim} stroke={INK} strokeWidth={Math.min(6, 22 / zn)} strokeLinejoin="round" />);
    if (b.shop) {
      // shop window + awning
      const g1 = P(X, Math.max(ZMIN, b.S0 + 0.3 + D), 0.15);
      const g2 = P(X, b.S1 - 0.3 + D, 0.15);
      const g3 = P(X, b.S1 - 0.3 + D, 1.05);
      const g4 = P(X, Math.max(ZMIN, b.S0 + 0.3 + D), 1.05);
      items.push(<path key="shop" d={quad(g1, g2, g3, g4)} fill={theme.win} stroke={INK} strokeWidth={Math.min(6, 22 / zn)} />);
      const hx = b.side * (FACADE - 0.5);
      const za = Math.max(ZMIN, b.S0 + 0.15 + D);
      const zb = b.S1 - 0.15 + D;
      const N = 5;
      for (let i = 0; i < N; i++) {
        const sa = za + ((zb - za) * i) / N;
        const sb = za + ((zb - za) * (i + 1)) / N;
        if (sb < ZMIN) continue;
        const a1 = P(X, Math.max(ZMIN, sa), 1.42);
        const a2 = P(X, sb, 1.42);
        const a3 = P(hx, sb, 1.1);
        const a4 = P(hx, Math.max(ZMIN, sa), 1.1);
        items.push(<path key={`a${i}`} d={quad(a1, a2, a3, a4)} fill={i % 2 ? '#FFFFFF' : b.awn} stroke={INK} strokeWidth={Math.min(5, 18 / zn)} strokeLinejoin="round" />);
      }
    }
  } else {
    // far away: a simple window band texture
    for (let h = 1.6; h < b.h - 0.6; h += 1.12) {
      const a = P(X, zn, h);
      const bb = P(X, zf, h);
      const c = P(X, zf, h + 0.6);
      const d = P(X, zn, h + 0.6);
      items.push(<path key={`band${h}`} d={quad(a, bb, c, d)} fill={theme.win} opacity={0.7} />);
    }
  }
  return <g>{items}</g>;
};

/* ------------------------------- sprites ------------------------------- */
export type CityObj = { X: number; S: number; key: string; draw: (x: number, y: number, s: number, z: number) => React.ReactNode };

/** Street lamp: x,y = base on the ground, s = 1/z. Arm reaches toward the street (dir). */
export const Lamp: React.FC<{ x: number; y: number; s: number; dir: 1 | -1 }> = ({ x, y, s, dir }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-22} y={-3300} width={44} height={3300} fill="#4F4A6A" stroke={INK} strokeWidth={12} />
    <rect x={-40} y={-260} width={80} height={260} rx={14} fill="#4F4A6A" stroke={INK} strokeWidth={12} />
    <path d={`M0 -3300 Q0 -3560 ${dir * 380} -3560 L${dir * 560} -3560`} fill="none" stroke={INK} strokeWidth={56} strokeLinecap="round" />
    <path d={`M0 -3300 Q0 -3560 ${dir * 380} -3560 L${dir * 560} -3560`} fill="none" stroke="#4F4A6A" strokeWidth={30} strokeLinecap="round" />
    <path d={`M${dir * 470} -3560 L${dir * 650} -3560 L${dir * 610} -3460 L${dir * 510} -3460 Z`} fill="#4F4A6A" stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    <ellipse cx={dir * 560} cy={-3450} rx={60} ry={22} fill="#FFF0B7" stroke={INK} strokeWidth={10} />
  </g>
);

export const StreetTree: React.FC<{ x: number; y: number; s: number; seed: number; cols?: string[] }> = ({ x, y, s, seed, cols = ['#6DBE6C', '#5FAC5E', '#80C97B'] }) => {
  const r = rng(seed);
  const col = cols[Math.floor(r() * cols.length)];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-260 0 L260 0 L230 -90 L-230 -90 Z" fill="#B9A6CF" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
      <rect x={-40} y={-1300} width={80} height={1220} rx={20} fill="#9C6238" stroke={INK} strokeWidth={14} />
      <circle cx={0} cy={-1750} r={560} fill={col} stroke={INK} strokeWidth={14} />
      <circle cx={-300} cy={-1450} r={320} fill={col} stroke={INK} strokeWidth={14} />
      <circle cx={320} cy={-1480} r={330} fill={col} stroke={INK} strokeWidth={14} />
      <circle cx={0} cy={-1700} r={520} fill={col} />
      <circle cx={-180} cy={-1980} r={170} fill="#FFFFFF" opacity={0.25} />
    </g>
  );
};

const Hydrant: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-120} y={-460} width={240} height={460} rx={70} fill="#F15F75" stroke={INK} strokeWidth={16} />
    <rect x={-170} y={-330} width={340} height={90} rx={40} fill="#F15F75" stroke={INK} strokeWidth={16} />
    <ellipse cx={0} cy={-470} rx={130} ry={60} fill="#F98CA0" stroke={INK} strokeWidth={16} />
    <rect x={-80} y={-420} width={40} height={300} rx={20} fill="#FFFFFF" opacity={0.35} />
  </g>
);

const Bin: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-210 -620 L210 -620 L180 0 L-180 0 Z" fill="#45B87A" stroke={INK} strokeWidth={16} strokeLinejoin="round" />
    <rect x={-240} y={-680} width={480} height={80} rx={30} fill="#2A7D52" stroke={INK} strokeWidth={16} />
    {[-100, 0, 100].map((dx) => (
      <line key={dx} x1={dx} y1={-560} x2={dx * 0.9} y2={-60} stroke="#2A7D52" strokeWidth={18} strokeLinecap="round" />
    ))}
  </g>
);

const makeProps = (seed: number): CityObj[] => {
  const out: CityObj[] = [];
  const r = rng(seed + 7);
  for (let s = -58; s < 92; s += 7.5) {
    for (const side of [-1, 1] as const) {
      const S = s + (side === 1 ? 3.7 : 0);
      out.push({ X: side * 1.72, S, key: `l${S}${side}`, draw: (x, y, sc) => <Lamp key={`l${S}${side}`} x={x} y={y} s={sc} dir={side === 1 ? -1 : 1} /> });
    }
  }
  for (let s = -57; s < 92; s += 5) {
    for (const side of [-1, 1] as const) {
      if (r() < 0.3) continue;
      const S = s + r() * 1.5;
      const sd = Math.floor(r() * 99);
      out.push({ X: side * 2.02, S, key: `t${S}${side}`, draw: (x, y, sc) => <StreetTree key={`t${S}${side}`} x={x} y={y} s={sc * 0.95} seed={sd} /> });
    }
  }
  for (let s = -55; s < 92; s += 11) {
    const side = r() < 0.5 ? -1 : 1;
    const S = s + r() * 4;
    const kind = r();
    out.push({
      X: side * 1.62, S, key: `p${S}`,
      draw: (x, y, sc) => (kind < 0.5 ? <Hydrant key={`p${S}`} x={x} y={y} s={sc * 0.9} /> : <Bin key={`p${S}`} x={x} y={y} s={sc * 0.9} />),
    });
  }
  return out;
};

/* ------------------------------- the street ------------------------------- */
const Skyline: React.FC<{ theme: CityTheme; seed: number }> = ({ theme, seed }) => {
  const r = rng(seed + 55);
  const far: React.ReactNode[] = [];
  const near: React.ReactNode[] = [];
  let x = -200;
  while (x < 1280) {
    const w = 60 + r() * 90;
    const h = 120 + r() * 360 * (1 - Math.abs(x + w / 2 - 540) / 1100);
    far.push(<rect key={`f${x}`} x={x} y={HY - h} width={w} height={h + 20} fill={theme.skyline[0]} />);
    if (r() < 0.35) far.push(<rect key={`a${x}`} x={x + w / 2 - 3} y={HY - h - 50} width={6} height={50} fill={theme.skyline[0]} />);
    x += w + r() * 10;
  }
  x = -160;
  while (x < 1260) {
    const w = 70 + r() * 110;
    const h = 60 + r() * 220 * (1 - Math.abs(x + w / 2 - 540) / 1200);
    near.push(<rect key={`n${x}`} x={x} y={HY - h} width={w} height={h + 20} fill={theme.skyline[1]} />);
    for (let yy = HY - h + 20; yy < HY - 10; yy += 34) {
      for (let xx = x + 12; xx < x + w - 14; xx += 26) {
        if (r() < 0.3) near.push(<rect key={`d${xx}${yy}`} x={xx} y={yy} width={9} height={14} fill="#FFFFFF" opacity={0.45} />);
      }
    }
    x += w + r() * 20;
  }
  return (
    <g>
      {far}
      {near}
    </g>
  );
};

/**
 * The city street. layer 'back' = sky, buildings, road and everything at least as far away as the
 * hero; layer 'front' = scene objects nearer than him (draw it after the hero).
 */
export const CityWorld: React.FC<{
  f: number; D: number; cam: Cam; sh: Shake; theme: CityTheme; seed?: number; layer?: 'back' | 'front';
  extra?: CityObj[]; crosswalks?: number[]; bridge?: React.ReactNode; bridgeMode?: boolean; skyExtra?: React.ReactNode; blur?: number;
}> = ({ f, D, cam, sh, theme, seed = 5, layer = 'back', extra = [], crosswalks = [], bridgeMode = false, bridge, skyExtra, blur = 0 }) => {
  const all = [...(bridgeMode ? [] : makeProps(seed)), ...extra]
    .map((o) => ({ ...o, z: o.S + D }))
    .filter((o) => o.z > ZMIN && o.z < ZFAR);
  if (layer === 'front') {
    const near = all.filter((o) => o.z < ZH).sort((a, b) => b.z - a.z);
    return (
      <g transform={camP(cam, 1, sh)}>
        {near.map((o) => {
          const p = P(o.X, o.z);
          return <React.Fragment key={o.key}>{o.draw(p.x, p.y, 1 / o.z, o.z)}</React.Fragment>;
        })}
      </g>
    );
  }
  const far = all.filter((o) => o.z >= ZH).sort((a, b) => b.z - a.z);
  const bld = bridgeMode ? [] : makeBuildings(theme, seed);
  const id = `csky${seed}${theme.road.slice(1)}`;
  // lane dashes + sidewalk joints scroll away from the camera
  const dashes: React.ReactNode[] = [];
  const dashP = 2.4;
  for (let i = -2; i < 26; i++) {
    const z0 = i * dashP + (D % dashP);
    const z1 = z0 + 1.1;
    if (z1 < ZMIN || z0 > ZFAR) continue;
    for (const X of [-0.55, 0.55]) {
      const a = P(X - 0.05, Math.max(ZMIN, z0));
      const b = P(X + 0.05, Math.max(ZMIN, z0));
      const c = P(X + 0.05, z1);
      const d = P(X - 0.05, z1);
      dashes.push(<path key={`d${i}${X}`} d={quad(a, b, c, d)} fill={theme.lane} opacity={0.85} />);
    }
  }
  const joints: React.ReactNode[] = [];
  if (!bridgeMode) {
    for (let i = -2; i < 60; i++) {
      const z = i * 0.9 + (D % 0.9);
      if (z < ZMIN || z > 40) continue;
      for (const side of [-1, 1]) {
        const a = P(side * WALK_IN, z);
        const b = P(side * FACADE, z);
        joints.push(<line key={`j${i}${side}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={theme.walkLine} strokeWidth={Math.min(6, 14 / z)} />);
      }
    }
  }
  const cw: React.ReactNode[] = [];
  for (const Sc of crosswalks) {
    const z0 = Sc + D;
    const z1 = z0 + 1.1;
    if (z1 < ZMIN || z0 > ZFAR) continue;
    for (let X = -1.3; X < 1.3; X += 0.34) {
      const a = P(X, Math.max(ZMIN, z0));
      const b = P(X + 0.2, Math.max(ZMIN, z0));
      const c = P(X + 0.2, z1);
      const d = P(X, z1);
      cw.push(<path key={`cw${Sc}${X}`} d={quad(a, b, c, d)} fill="#FFFFFF" opacity={0.92} />);
    }
  }
  const far0 = P(0, ZFAR);
  const sideL = [P(-WALK_IN, ZMIN), P(-FACADE, ZMIN), P(-FACADE, ZFAR), P(-WALK_IN, ZFAR)];
  const sideR = [P(WALK_IN, ZMIN), P(FACADE, ZMIN), P(FACADE, ZFAR), P(WALK_IN, ZFAR)];
  const curbL = [P(-WALK_IN, ZMIN), P(-WALK_IN, ZFAR), P(-WALK_IN, ZFAR, 0.14), P(-WALK_IN, ZMIN, 0.14)];
  const curbR = [P(WALK_IN, ZMIN), P(WALK_IN, ZFAR), P(WALK_IN, ZFAR, 0.14), P(WALK_IN, ZMIN, 0.14)];
  const sorted = [...bld].sort((a, b) => b.S1 - a.S1);
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.sky[0]} />
          <stop offset="0.62" stopColor={theme.sky[1]} />
          <stop offset="1" stopColor={theme.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.haze} stopOpacity={0} />
          <stop offset="1" stopColor={theme.haze} stopOpacity={0.85} />
        </linearGradient>
        <filter id="cblur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${blur * 2} ${blur * 9}`} />
        </filter>
      </defs>
      <g transform={camP(cam, 0.2, sh)}>
        <rect x={-700} y={-1000} width={2480} height={HY + 1100} fill={`url(#${id})`} />
        {theme.sun ? <Sun x={theme.sun.x} y={theme.sun.y} r={theme.sun.r} f={f} rays={theme.sun.rays} color={theme.sun.color} /> : null}
        {skyExtra}
        {theme.cloud
          ? [0, 1, 2].map((i) => (
              <Cloud key={i} x={((i * 420 + f * 0.5) % 1500) - 240} y={180 + (i % 2) * 170} w={280 + i * 40} h={120} seed={i + 11} {...theme.cloud!} />
            ))
          : null}
      </g>
      <g transform={camP(cam, 0.45, sh)}>
        <Skyline theme={theme} seed={seed} />
        <rect x={-700} y={HY - 160} width={2480} height={170} fill={`url(#${id}h)`} />
      </g>
      <g transform={camP(cam, 1, sh)} filter={blur > 0.3 ? 'url(#cblur)' : undefined}>
        <rect x={-900} y={HY} width={2880} height={2400} fill={bridgeMode && theme.water ? theme.water : theme.road} />
        {bridgeMode ? bridge : null}
        {!bridgeMode ? (
          <>
            <path d={quad(sideL[0], sideL[1], sideL[2], sideL[3])} fill={theme.walk} />
            <path d={quad(sideR[0], sideR[1], sideR[2], sideR[3])} fill={theme.walk} />
            {joints}
            <path d={quad(curbL[0], curbL[1], curbL[2], curbL[3])} fill={theme.curb} stroke={INK} strokeWidth={4} />
            <path d={quad(curbR[0], curbR[1], curbR[2], curbR[3])} fill={theme.curb} stroke={INK} strokeWidth={4} />
          </>
        ) : null}
        {bridgeMode ? null : dashes}
        {cw}
        <circle cx={far0.x} cy={far0.y} r={2} fill={theme.road} />
        {sorted.map((b) => (
          <Building key={`${b.side}${b.S0}`} b={b} D={D} theme={theme} />
        ))}
        {far.map((o) => {
          const p = P(o.X, o.z);
          return <React.Fragment key={o.key}>{o.draw(p.x, p.y, 1 / o.z, o.z)}</React.Fragment>;
        })}
      </g>
    </>
  );
};

/* ------------------------------- shared props ------------------------------- */
/** Overhead banner across the street (finish line etc.), drawn as a CityObj at X = 0. */
export const streetBanner = (S: number, text: string, color = '#7254DC'): CityObj => ({
  X: 0, S, key: `banner${S}`,
  draw: (x, y, s) => (
    <g key={`banner${S}`} transform={`translate(${x} ${y}) scale(${s})`}>
      {[-1, 1].map((sd) => (
        <rect key={sd} x={sd * 1180 - 24} y={-3000} width={48} height={3000} fill="#4F4A6A" stroke={INK} strokeWidth={12} />
      ))}
      <rect x={-1160} y={-3000} width={2320} height={420} rx={40} fill={color} stroke={INK} strokeWidth={16} />
      <rect x={-1120} y={-2960} width={2240} height={80} rx={30} fill="#FFFFFF" opacity={0.25} />
      <text x={0} y={-2770} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={300} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke">
        {text}
      </text>
    </g>
  ),
});

/** Yellow cab, front view. x,y = ground point under its centre, s = 1/z. mood: driver's face. */
export const Taxi: React.FC<{ x: number; y: number; s: number; f: number; mood?: 'grin' | 'shock' | 'honk'; lights?: number; plate?: string }> = ({
  x, y, s, f, mood = 'grin', lights = 0, plate = 'WNTR ARC',
}) => (
  <g transform={`translate(${x} ${y + Math.sin(f * 1.7) * 2}) scale(${s})`}>
    <ellipse cx={0} cy={6} rx={470} ry={60} fill="#1E1A2E" opacity={0.22} />
    {/* tyres */}
    {[-1, 1].map((sd) => (
      <rect key={sd} x={sd * 300 - 70} y={-170} width={140} height={175} rx={40} fill="#2B2340" stroke={INK} strokeWidth={14} />
    ))}
    {/* cabin */}
    <path d="M-300 -430 L-250 -700 Q-240 -730 -200 -730 L200 -730 Q240 -730 250 -700 L300 -430 Z" fill="#FFC93C" stroke={INK} strokeWidth={16} strokeLinejoin="round" />
    <path d="M-252 -450 L-212 -680 L212 -680 L252 -450 Z" fill="#9CC7F5" stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    {/* driver */}
    <g transform="translate(0 -520)">
      <path d="M-120 70 Q-120 -10 0 -10 Q120 -10 120 70 Z" fill="#5C7CF0" stroke={INK} strokeWidth={10} />
      <circle cx={0} cy={-80} r={78} fill="#F2B48A" stroke={INK} strokeWidth={10} />
      <path d="M-84 -110 Q0 -190 84 -110 L96 -96 L-96 -96 Z" fill="#45B87A" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
      <rect x={-110} y={-104} width={220} height={22} rx={10} fill="#2A7D52" stroke={INK} strokeWidth={8} />
      <circle cx={-28} cy={-80} r={mood === 'shock' ? 14 : 10} fill={INK} />
      <circle cx={28} cy={-80} r={mood === 'shock' ? 14 : 10} fill={INK} />
      <path d={mood === 'honk' ? 'M-50 -116 L-10 -100 M50 -116 L10 -100' : 'M-48 -108 L-12 -110 M48 -108 L12 -110'} stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M-46 -42 Q0 -26 46 -42 Q30 -56 0 -50 Q-30 -56 -46 -42 Z" fill="#6E4A2E" />
      {mood === 'shock' ? <ellipse cx={0} cy={-20} rx={20} ry={26} fill="#7A2E3A" stroke={INK} strokeWidth={6} /> : <path d="M-26 -24 Q0 -8 26 -24" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />}
    </g>
    <path d="M-200 -700 L-110 -700 L-170 -470 L-220 -470 Z" fill="#FFFFFF" opacity={0.35} />
    {/* roof sign */}
    <rect x={-120} y={-810} width={240} height={86} rx={20} fill="#FFF6D0" stroke={INK} strokeWidth={12} />
    <text x={0} y={-764} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={62} fill={INK}>TAXI</text>
    {/* body */}
    <path d="M-390 -150 L-390 -360 Q-388 -440 -300 -440 L300 -440 Q388 -440 390 -360 L390 -150 Q390 -110 350 -110 L-350 -110 Q-390 -110 -390 -150 Z" fill="#FFC93C" stroke={INK} strokeWidth={16} strokeLinejoin="round" />
    <path d="M-360 -420 L360 -420" stroke="#FFE38A" strokeWidth={14} strokeLinecap="round" />
    {/* checker stripe */}
    {Array.from({ length: 12 }).map((_, i) => (
      <rect key={i} x={-360 + i * 60} y={(i % 2) * 26 - 392} width={60} height={26} fill={INK} opacity={0.85} />
    ))}
    {/* grille + lights */}
    <rect x={-150} y={-310} width={300} height={110} rx={22} fill="#3A3550" stroke={INK} strokeWidth={12} />
    {[0, 1, 2].map((i) => (
      <line key={i} x1={-130} y1={-284 + i * 30} x2={130} y2={-284 + i * 30} stroke="#6E6A86" strokeWidth={10} />
    ))}
    {[-1, 1].map((sd) => (
      <g key={sd}>
        {lights > 0 ? <circle cx={sd * 275} cy={-268} r={150} fill="#FFF3B0" opacity={0.35 * lights} /> : null}
        <circle cx={sd * 275} cy={-268} r={62} fill="#FFFBE6" stroke={INK} strokeWidth={12} />
        <circle cx={sd * 290} cy={-282} r={20} fill="#FFFFFF" />
        <rect x={sd * 410 - (sd > 0 ? 0 : 60)} y={-470} width={60} height={46} rx={14} fill="#FFC93C" stroke={INK} strokeWidth={10} />
      </g>
    ))}
    {/* bumper + plate */}
    <rect x={-400} y={-150} width={800} height={60} rx={26} fill="#B9B4D0" stroke={INK} strokeWidth={14} />
    <rect x={-120} y={-200} width={240} height={70} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={10} />
    <text x={0} y={-164} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#5C7CF0">{plate}</text>
  </g>
);

/** Pedestrian signal on a pole (front view). walk: 0 = orange hand, 1 = white walking figure. */
export const WalkSignal: React.FC<{ x: number; y: number; s: number; walk: number; blink?: boolean; count?: string }> = ({ x, y, s, walk, blink = false, count }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-34} y={-1760} width={68} height={1760} fill="#4F4A6A" stroke={INK} strokeWidth={14} />
    <rect x={-60} y={-180} width={120} height={180} rx={20} fill="#4F4A6A" stroke={INK} strokeWidth={14} />
    <rect x={-250} y={-2260} width={500} height={540} rx={50} fill="#3A3550" stroke={INK} strokeWidth={16} />
    <rect x={-210} y={-2220} width={420} height={460} rx={34} fill="#1E1A2E" />
    {walk < 0.5 ? (
      blink ? null : (
        <g transform="translate(0 -1990)">
          <circle r={190} fill="#FF8A3D" opacity={0.25} />
          <path d="M-60 120 L-60 -30 L-100 -70 Q-112 -94 -86 -100 L-50 -60 L-50 -150 Q-40 -170 -26 -150 L-26 -80 L-10 -80 L-10 -170 Q0 -190 14 -170 L14 -80 L30 -80 L30 -150 Q40 -170 54 -150 L54 -70 L70 -70 L70 -120 Q80 -140 94 -120 L94 40 Q90 120 20 130 Z" fill="#FF9A4D" stroke="#FFD3A6" strokeWidth={8} strokeLinejoin="round" />
        </g>
      )
    ) : (
      <g transform="translate(0 -1990)">
        <circle r={190} fill="#FFFFFF" opacity={0.25} />
        <circle cx={10} cy={-120} r={34} fill="#FFFFFF" />
        <path d="M0 -76 L-40 30 M-6 -40 L-70 -10 M-4 -40 L60 -60 M-30 10 L-80 130 M-30 10 L30 70 L50 140" fill="none" stroke="#FFFFFF" strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}
    {count ? (
      <text x={0} y={-1830} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={90} fill="#FF9A4D">{count}</text>
    ) : null}
  </g>
);
