// Shared set for the bike celebrations: a bicycle seen head-on that the hero actually pedals, a
// helmet, and a road world in perspective (the camera rides backwards in front of him, so the road
// streams away behind him). Three looks: alpine climb, autumn descent, town finish straight.
import React from 'react';
import { Pose, rig } from '../hero/Hero';
import { lerp } from '../lib/anim';
import { svgM, R as Rot, mul, T } from '../lib/m2';
import { camP, Cam } from '../fx/Stage';
import { Cloud, Sun } from '../fx/fx';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { rng, cloudPath } from '../lib/shape';
import { INK, Shake } from './kit';
import { inv, reach } from './ik';
import { HY, K, FX, ZH } from './RunKit';

export { HY, K, FX, ZH };
export const BIKE_C = '#24A6AF';
export const BIKE_D = '#16616B';
export const ZMIN = 0.28;
export const ZFAR = 70;
/** Project world point (X across, depth z, height h) to the 1080×1920 design area. */
export const P = (X: number, z: number, h = 0) => ({ x: 540 + (FX * X) / z, y: HY + (K - FX * h) / z });

/* ------------------------------ the bike ------------------------------ */
/** Bike geometry in hero space (ground = 0, up = negative). */
export const BK = { R: 172, HUB: -172, BB: -150, HIP: -378, BAR_Y: -556, BAR_X: 116, PY: -56 };

/** Leg pose for crank angle th (radians); 0 = left foot level going down. stand = out of the saddle. */
export const pedalLegs = (th: number, stand = 0): Partial<Pose> => {
  const uL = (1 + Math.sin(th)) / 2;
  const uR = 1 - uL;
  const leg = (u: number) => ({
    th: lerp(lerp(0.24, 0.5, stand), lerp(0.78, 0.98, stand), u),
    sh: lerp(0.8, 1, u),
    hip: lerp(14, 5, u),
    kn: lerp(-12, -2, u),
    ft: lerp(2, 22, u),
  });
  const a = leg(uL);
  const b = leg(uR);
  return {
    hipL: a.hip, thL: a.th, shinL: a.sh, knL: a.kn, ftL: a.ft,
    hipR: b.hip, thR: b.th, shinR: b.sh, knR: b.kn, ftR: b.ft,
    y: BK.PY - stand * 70,
  };
};

/** Riding upper body: leaned over the bars (seen head-on that shortens the torso). */
export const RIDE: Partial<Pose> = {
  torsoSy: 0.86, chestS: 1.04, uaL: 0.62, uaR: 0.62, faL: 0.62, faR: 0.62, wrL: 0, wrR: 0, handL: 'grip', handR: 'grip', flexL: 0.7, flexR: 0.7,
  x: 0, sx: 1, sy: 1, kneel: 0,
};

/** Bars in hero space, after the bike leans by `lean` degrees about the tyre contact. */
export const barsAt = (lean: number): { L: [number, number]; R: [number, number] } => {
  const a = (lean * Math.PI) / 180;
  const rot = (x: number, y: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  return { L: rot(-BK.BAR_X, BK.BAR_Y + 6), R: rot(BK.BAR_X, BK.BAR_Y + 6) };
};

/** Put both hands on the bars (blend k). */
export const gripBars = (p: Pose, lean: number, k = 1, only?: 'L' | 'R'): Pose => {
  if (k <= 0) return p;
  const b = barsAt(lean);
  let q = p;
  if (only !== 'R') {
    const s = reach(q, 'L', b.L, 1, 30);
    q = { ...q, shL: lerp(p.shL, s.shL ?? p.shL, k), elL: lerp(p.elL, s.elL ?? p.elL, k) };
  }
  if (only !== 'L') {
    const s = reach(q, 'R', b.R, 1, 30);
    q = { ...q, shR: lerp(p.shR, s.shR ?? p.shR, k), elR: lerp(p.elR, s.elR ?? p.elR, k) };
  }
  return q;
};

/** Sole points of both feet (hero space), for the pedals. */
export const solesOf = (p: Pose): { L: [number, number]; R: [number, number] } => {
  const r = rig(p);
  return { L: r.W(r.lL.ankle, -8, 30), R: r.W(r.lR.ankle, -8, 30) };
};

/**
 * Head-on bicycle, in hero space. Put it in the Hero's `between` layer wrapped in
 * `<g transform={svgM(inv(rig(p).root))}>` so it sits in front of the legs and behind the arms.
 */
export const Bicycle: React.FC<{ lean?: number; soles: { L: [number, number]; R: [number, number] }; color?: string; dark?: string; f?: number; speed?: number; mtb?: boolean }> = ({
  lean = 0, soles, color = BIKE_C, dark = BIKE_D, f = 0, speed = 0, mtb = false,
}) => {
  const w = mtb ? 46 : 34;
  const barX = mtb ? 170 : BK.BAR_X;
  // cranks sit with the bike; the soles come from the rider's feet (already in hero space)
  const inner = (
    <g>
      {/* tyre + rim */}
      <rect x={-w / 2} y={-BK.R * 2} width={w} height={BK.R * 2} rx={w / 2} fill="#2B2840" stroke={INK} strokeWidth={7} />
      <rect x={-w / 2 + 9} y={-BK.R * 2 + 12} width={w - 18} height={BK.R * 2 - 24} rx={(w - 18) / 2} fill="none" stroke="#8D8AA6" strokeWidth={4} />
      {/* tread blips scroll with speed */}
      {speed > 0
        ? [0, 1, 2, 3].map((i) => {
            const y = -((f * speed * 40 + i * 86) % (BK.R * 2 - 30)) - 15;
            return <line key={i} x1={-w / 2 + 6} y1={y} x2={w / 2 - 6} y2={y} stroke="#4A4663" strokeWidth={6} />;
          })
        : null}
      {/* hub + fork */}
      <rect x={-34} y={BK.HUB - 8} width={68} height={16} rx={8} fill="#B9B5CC" stroke={INK} strokeWidth={5} />
      {[-1, 1].map((s) => (
        <path key={s} d={`M${s * 26} ${BK.HUB} L${s * 30} -388`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
      ))}
      {[-1, 1].map((s) => (
        <path key={`c${s}`} d={`M${s * 26} ${BK.HUB} L${s * 30} -388`} stroke={color} strokeWidth={12} strokeLinecap="round" />
      ))}
      <rect x={-40} y={-410} width={80} height={30} rx={12} fill={color} stroke={INK} strokeWidth={6} />
      {/* head tube, stem */}
      <rect x={-20} y={-512} width={40} height={110} rx={10} fill={color} stroke={INK} strokeWidth={6} />
      <rect x={-12} y={-500} width={8} height={84} rx={4} fill="#FFFFFF" opacity={0.45} />
      <rect x={-16} y={-546} width={32} height={40} rx={8} fill="#3A3650" stroke={INK} strokeWidth={5} />
      {/* bars */}
      <path d={`M${-barX} ${BK.BAR_Y} L${barX} ${BK.BAR_Y}`} stroke={INK} strokeWidth={24} strokeLinecap="round" />
      <path d={`M${-barX} ${BK.BAR_Y} L${barX} ${BK.BAR_Y}`} stroke="#3A3650" strokeWidth={13} strokeLinecap="round" />
      {!mtb
        ? [-1, 1].map((s) => (
            <g key={`d${s}`}>
              <path d={`M${s * barX} ${BK.BAR_Y} Q${s * (barX + 26)} ${BK.BAR_Y} ${s * (barX + 24)} ${BK.BAR_Y + 34} Q${s * (barX + 22)} ${BK.BAR_Y + 62} ${s * (barX - 4)} ${BK.BAR_Y + 64}`} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
              <path d={`M${s * barX} ${BK.BAR_Y} Q${s * (barX + 26)} ${BK.BAR_Y} ${s * (barX + 24)} ${BK.BAR_Y + 34} Q${s * (barX + 22)} ${BK.BAR_Y + 62} ${s * (barX - 4)} ${BK.BAR_Y + 64}`} fill="none" stroke="#3A3650" strokeWidth={12} strokeLinecap="round" />
              <rect x={s * barX - 14} y={BK.BAR_Y - 22} width={28} height={30} rx={10} fill="#2B2840" stroke={INK} strokeWidth={5} />
            </g>
          ))
        : [-1, 1].map((s) => <rect key={`g${s}`} x={s * barX - 26} y={BK.BAR_Y - 14} width={52} height={28} rx={12} fill="#2B2840" stroke={INK} strokeWidth={5} />)}
      {/* little front light */}
      <rect x={-16} y={-470} width={32} height={22} rx={8} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
    </g>
  );
  const a = lean;
  const [lx, ly] = soles.L;
  const [rx, ry] = soles.R;
  return (
    <g>
      {/* chainring (edge-on, rider's right) + cranks + pedals: these follow the feet */}
      <g transform={`rotate(${a})`}>
        <ellipse cx={36} cy={BK.BB} rx={8} ry={60} fill="#CFCBE0" stroke={INK} strokeWidth={5} />
        <rect x={-48} y={BK.BB - 9} width={96} height={18} rx={9} fill="#8D8AA6" stroke={INK} strokeWidth={5} />
      </g>
      <path d={`M${lx + 6} ${ly} L${-46} ${BK.BB}`} stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={`M${lx + 6} ${ly} L${-46} ${BK.BB}`} stroke="#9C99B4" strokeWidth={9} strokeLinecap="round" />
      <path d={`M${rx - 6} ${ry} L${46} ${BK.BB}`} stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={`M${rx - 6} ${ry} L${46} ${BK.BB}`} stroke="#9C99B4" strokeWidth={9} strokeLinecap="round" />
      <rect x={lx - 34} y={ly - 6} width={62} height={16} rx={6} fill="#2B2840" stroke={INK} strokeWidth={5} />
      <rect x={rx - 28} y={ry - 6} width={62} height={16} rx={6} fill="#2B2840" stroke={INK} strokeWidth={5} />
      <g transform={`rotate(${a})`}>{inner}</g>
    </g>
  );
};

/** Wraps bike art so it can go in the Hero's `between` layer (undo the root transform). */
export const InHeroSpace: React.FC<{ p: Pose; children: React.ReactNode }> = ({ p, children }) => (
  <g transform={svgM(inv(rig(p).root))}>{children}</g>
);

/** Cycling helmet (head space). */
export const Helmet: React.FC<{ color?: string; dark?: string }> = ({ color = BIKE_C, dark = BIKE_D }) => (
  <g>
    <path d="M-166 -214 C-180 -330 -90 -404 0 -404 C92 -404 182 -330 166 -214 C110 -236 -110 -236 -166 -214 Z" fill={color} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M-120 -330 C-70 -376 70 -376 120 -330" fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" opacity={0.5} />
    {[-70, 0, 70].map((x, i) => (
      <path key={i} d={`M${x - 22} ${-300 - (i === 1 ? 20 : 0)} Q${x} ${-326 - (i === 1 ? 20 : 0)} ${x + 22} ${-300 - (i === 1 ? 20 : 0)} L${x + 16} -262 Q${x} -270 ${x - 16} -262 Z`} fill={dark} stroke={INK} strokeWidth={4} />
    ))}
    <path d="M-166 -214 C-110 -236 110 -236 166 -214" fill="none" stroke={dark} strokeWidth={10} />
    {[-1, 1].map((s) => (
      <path key={s} d={`M${s * 160} -222 L${s * 128} -70`} stroke="#2B2840" strokeWidth={7} strokeLinecap="round" />
    ))}
  </g>
);

/* ------------------------------ the road ------------------------------ */
export type RoadObj = { X: number; S: number; key: string; draw: (x: number, y: number, s: number, z: number) => React.ReactNode };
export type RoadTheme = 'alpine' | 'forest' | 'town';

const quad = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) =>
  `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}L${c.x.toFixed(1)} ${c.y.toFixed(1)}L${d.x.toFixed(1)} ${d.y.toFixed(1)}Z`;

const LOOK: Record<RoadTheme, { sky: [string, string, string]; ground: string; ground2: string; road: string; lane: string; edge: string; shoulder: string; haze: string }> = {
  alpine: { sky: ['#5EA3F5', '#A8D4FF', '#E9F6FF'], ground: '#7CC46E', ground2: '#69B35C', road: '#7E7C94', lane: '#FFD064', edge: '#FFFFFF', shoulder: '#B9B19A', haze: '#E9F6FF' },
  forest: { sky: ['#8C7BE0', '#F7B18F', '#FFE0A8'], ground: '#B8843F', ground2: '#A87536', road: '#77708C', lane: '#FFD064', edge: '#FFF2DC', shoulder: '#A88A6A', haze: '#FFD9B0' },
  town: { sky: ['#79AEFF', '#ACD6FF', '#EEF5FF'], ground: '#9FD08A', ground2: '#8EC27A', road: '#86849F', lane: '#FFFFFF', edge: '#FFFFFF', shoulder: '#D8D2E6', haze: '#EEF5FF' },
};

export const Pine: React.FC<{ x: number; y: number; s: number; snow?: boolean; c?: string }> = ({ x, y, s, snow, c = '#2F7A55' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-14} y={-90} width={28} height={92} fill="#6E4A3A" stroke={INK} strokeWidth={6} />
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${-130 + i * 26} ${-70 - i * 120} L0 ${-250 - i * 120} L${130 - i * 26} ${-70 - i * 120} Z`} fill={c} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    ))}
    {snow ? <path d="M-30 -462 L0 -490 L30 -462 L14 -450 L0 -462 L-14 -450 Z" fill="#FFFFFF" /> : null}
  </g>
);

export const LeafTree: React.FC<{ x: number; y: number; s: number; c: string; seed: number }> = ({ x, y, s, c, seed }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 0 L-10 -200 L10 -200 L16 0 Z" fill="#6E4A3A" stroke={INK} strokeWidth={6} />
    <path d={cloudPath(0, -300, 300, 240, seed)} fill={c} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d={cloudPath(-40, -340, 120, 90, seed + 3)} fill="#FFFFFF" opacity={0.18} />
  </g>
);

const Mountains: React.FC<{ theme: RoadTheme; seed: number }> = ({ theme, seed }) => {
  const r = rng(seed);
  if (theme === 'alpine') {
    const peaks: React.ReactNode[] = [];
    let x = -500;
    let i = 0;
    while (x < 1600) {
      const w = 340 + r() * 260;
      const h = 380 + r() * 360;
      const px = x + w / 2;
      peaks.push(
        <g key={i++}>
          <path d={`M${x} ${HY + 20} L${px} ${HY - h} L${x + w} ${HY + 20} Z`} fill={i % 2 ? '#8FA2D9' : '#7F93CE'} stroke="#6276B8" strokeWidth={5} strokeLinejoin="round" />
          <path d={`M${px - w * 0.18} ${HY - h + h * 0.36} L${px} ${HY - h} L${px + w * 0.18} ${HY - h + h * 0.36} L${px + w * 0.08} ${HY - h + h * 0.3} L${px} ${HY - h + h * 0.4} L${px - w * 0.08} ${HY - h + h * 0.3} Z`} fill="#FFFFFF" />
        </g>,
      );
      x += w * (0.55 + r() * 0.25);
    }
    return <g>{peaks}</g>;
  }
  if (theme === 'forest') {
    return (
      <g>
        {[0, 1, 2].map((k) => (
          <path
            key={k}
            d={`M-700 ${HY + 20} ${Array.from({ length: 12 }).map((_, i) => `Q${-700 + i * 240 + 120} ${HY - 160 - k * 60 - r() * 120} ${-700 + (i + 1) * 240} ${HY - 60 - k * 40}`).join(' ')} L2300 ${HY + 20} Z`}
            fill={['#C96F6B', '#B85F70', '#A65074'][k]}
            opacity={0.85}
          />
        ))}
      </g>
    );
  }
  // town: rooftops + a church spire
  const roofs: React.ReactNode[] = [];
  let x = -400;
  let i = 0;
  while (x < 1500) {
    const w = 80 + r() * 100;
    const h = 60 + r() * 120;
    roofs.push(<path key={i++} d={`M${x} ${HY + 10} L${x} ${HY - h} L${x + w / 2} ${HY - h - 50} L${x + w} ${HY - h} L${x + w} ${HY + 10} Z`} fill={i % 2 ? '#C3D6F5' : '#B2C6EE'} />);
    x += w + 6;
  }
  roofs.push(<path key="spire" d={`M700 ${HY} L700 ${HY - 260} L730 ${HY - 380} L760 ${HY - 260} L760 ${HY} Z`} fill="#A7BDE8" />);
  return <g>{roofs}</g>;
};

/** Default scenery along the road for a theme (built once per seed). */
const scenery = (theme: RoadTheme, seed: number): RoadObj[] => {
  const out: RoadObj[] = [];
  const r = rng(seed + 9);
  if (theme === 'alpine') {
    for (let s = -40; s < 70; s += 2.6) {
      for (const side of [-1, 1] as const) {
        if (r() < 0.35) continue;
        const S = s + r() * 2;
        const X = side * (2.2 + r() * 2.2);
        const sc = 0.8 + r() * 0.5;
        out.push({ X, S, key: `p${S.toFixed(2)}${side}`, draw: (x, y, k) => <Pine key={`p${S.toFixed(2)}${side}`} x={x} y={y} s={k * sc} snow /> });
      }
    }
    for (let s = -40; s < 70; s += 1.4) {
      for (const side of [-1, 1] as const) {
        const S = s;
        out.push({
          X: side * 1.6, S, key: `f${S.toFixed(2)}${side}`,
          draw: (x, y, k) => (
            <g key={`f${S.toFixed(2)}${side}`}>
              <rect x={x - 10 * k} y={y - 150 * k} width={20 * k} height={150 * k} fill="#8A5A3C" stroke={INK} strokeWidth={Math.max(2, 5 * k)} />
            </g>
          ),
        });
      }
    }
  }
  if (theme === 'forest') {
    const cols = ['#E8743B', '#F2A23A', '#D9534F', '#F5C445', '#C8602F'];
    for (let s = -40; s < 70; s += 1.1) {
      for (const side of [-1, 1] as const) {
        if (r() < 0.15) continue;
        const S = s + r() * 0.9;
        const X = side * (1.75 + r() * 2.6);
        const c = cols[Math.floor(r() * cols.length)];
        const sd = Math.floor(r() * 99);
        const sc = 1.2 + r() * 0.8;
        out.push({ X, S, key: `t${S.toFixed(2)}${side}`, draw: (x, y, k) => <LeafTree key={`t${S.toFixed(2)}${side}`} x={x} y={y} s={k * sc} c={c} seed={sd} /> });
      }
    }
  }
  if (theme === 'town') {
    // crowd barriers + fans on both sides
    for (let s = -40; s < 70; s += 0.62) {
      for (const side of [-1, 1] as const) {
        const S = s + (side > 0 ? 0.3 : 0);
        const sd = Math.floor(r() * 999);
        out.push({
          X: side * 1.75, S, key: `c${S.toFixed(2)}${side}`,
          draw: (x, y, k, z) => <Fans key={`c${S.toFixed(2)}${side}`} x={x} y={y} s={k} seed={sd} z={z} side={side} />,
        });
      }
    }
  }
  return out;
};

/** A section of barrier with fans behind it (stage space at the barrier foot). */
export const Fans: React.FC<{ x: number; y: number; s: number; seed: number; z: number; side: -1 | 1 }> = ({ x, y, s, seed }) => {
  const r = rng(seed);
  const cols = ['#F15F75', '#5C7CF0', '#45B87A', '#F2853A', '#7254DC', '#FFD064', '#19A7C4'];
  const skin = ['#FFB784', '#E9A06E', '#C98458', '#8E5A3C', '#FFD3B0'];
  const n = 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * 1.15})`}>
      {Array.from({ length: n }).map((_, i) => {
        const fx = -130 + i * 120 + r() * 30;
        const hop = r() < 0.5 ? 1 : 0;
        const c = cols[Math.floor(r() * cols.length)];
        const sk = skin[Math.floor(r() * skin.length)];
        return (
          <g key={i} transform={`translate(${fx} ${-150 - hop * 10})`}>
            <path d="M-46 30 L-60 -60" stroke={sk} strokeWidth={22} strokeLinecap="round" />
            <path d="M46 30 L62 -56" stroke={sk} strokeWidth={22} strokeLinecap="round" />
            <path d="M-50 120 Q-50 10 0 10 Q50 10 50 120 Z" fill={c} stroke={INK} strokeWidth={6} />
            <circle cx={0} cy={-22} r={34} fill={sk} stroke={INK} strokeWidth={6} />
          </g>
        );
      })}
      <rect x={-170} y={-120} width={340} height={120} rx={8} fill="#FFFFFF" stroke={INK} strokeWidth={6} />
      <rect x={-170} y={-120} width={340} height={30} fill={cols[seed % cols.length]} />
      <text x={0} y={-48} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={46} fill={INK} opacity={0.8}>
        {['WINTER ARC', 'GO GO GO', 'ALLEZ!', 'RIDE ON'][seed % 4]}
      </text>
      <rect x={-176} y={-4} width={14} height={6} fill={INK} />
      <rect x={162} y={-4} width={14} height={6} fill={INK} />
    </g>
  );
};

/**
 * The road. layer 'back' = sky, scenery and everything at least as far as the hero;
 * layer 'front' = objects nearer than him (draw after the hero).
 */
export const RoadWorld: React.FC<{
  f: number; D: number; cam: Cam; sh: Shake; theme: RoadTheme; seed?: number; layer?: 'back' | 'front'; extra?: RoadObj[]; marks?: React.ReactNode; skyExtra?: React.ReactNode; blur?: number;
}> = ({ f, D, cam, sh, theme, seed = 3, layer = 'back', extra = [], marks, skyExtra, blur = 0 }) => {
  const L = LOOK[theme];
  const all = [...scenery(theme, seed), ...extra].map((o) => ({ ...o, z: o.S + D })).filter((o) => o.z > ZMIN && o.z < ZFAR);
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
  const id = `bsky${theme}${seed}`;
  const dashes: React.ReactNode[] = [];
  const dashP = 2.2;
  for (let i = -2; i < 30; i++) {
    const z0 = i * dashP + (D % dashP);
    const z1 = z0 + 1.0;
    if (z1 < ZMIN || z0 > ZFAR) continue;
    const a = P(-0.05, Math.max(ZMIN, z0));
    const b = P(0.05, Math.max(ZMIN, z0));
    const c = P(0.05, z1);
    const d = P(-0.05, z1);
    dashes.push(<path key={`d${i}`} d={quad(a, b, c, d)} fill={L.lane} />);
  }
  const stripes: React.ReactNode[] = [];
  for (let i = -2; i < 40; i++) {
    const z0 = i * 1.6 + (D % 1.6);
    const z1 = z0 + 0.8;
    if (z1 < ZMIN || z0 > 40) continue;
    for (const side of [-1, 1]) {
      stripes.push(<path key={`g${i}${side}`} d={quad(P(side * 1.5, Math.max(ZMIN, z0)), P(side * 9, Math.max(ZMIN, z0)), P(side * 9, z1), P(side * 1.5, z1))} fill={L.ground2} />);
    }
  }
  const road = [P(-1.3, ZMIN), P(1.3, ZMIN), P(1.3, ZFAR), P(-1.3, ZFAR)];
  const shoulder = [P(-1.5, ZMIN), P(1.5, ZMIN), P(1.5, ZFAR), P(-1.5, ZFAR)];
  const edge = (s: number) => [P(s * 1.18, ZMIN), P(s * 1.24, ZMIN), P(s * 1.24, ZFAR), P(s * 1.18, ZFAR)];
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.sky[0]} />
          <stop offset="0.62" stopColor={L.sky[1]} />
          <stop offset="1" stopColor={L.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.haze} stopOpacity={0} />
          <stop offset="1" stopColor={L.haze} stopOpacity={0.8} />
        </linearGradient>
        <filter id={`${id}b`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${blur * 2} ${blur * 9}`} />
        </filter>
      </defs>
      <g transform={camP(cam, 0.2, sh)}>
        <rect x={-700} y={-1000} width={2480} height={HY + 1100} fill={`url(#${id})`} />
        {theme === 'forest' ? <Sun x={760} y={HY - 140} r={130} f={f} rays={false} color="#FFD08A" /> : null}
        {theme === 'alpine' ? <Sun x={850} y={220} r={80} f={f} rays color="#FFE08A" /> : null}
        {theme !== 'forest'
          ? [0, 1, 2].map((i) => <Cloud key={i} x={((i * 430 + f * 0.6) % 1500) - 240} y={160 + (i % 2) * 170} w={280 + i * 40} h={120} seed={i + 31} />)
          : null}
        {skyExtra}
      </g>
      <g transform={camP(cam, 0.35, sh)}>
        <Mountains theme={theme} seed={seed} />
        <rect x={-700} y={HY - 160} width={2480} height={180} fill={`url(#${id}h)`} />
      </g>
      <g transform={camP(cam, 1, sh)} filter={blur > 0.3 ? `url(#${id}b)` : undefined}>
        <rect x={-1200} y={HY} width={3480} height={2600} fill={L.ground} />
        {stripes}
        <path d={quad(shoulder[0], shoulder[1], shoulder[2], shoulder[3])} fill={L.shoulder} />
        <path d={quad(road[0], road[1], road[2], road[3])} fill={L.road} />
        {[-1, 1].map((sd) => {
          const e = edge(sd);
          return <path key={sd} d={quad(e[0], e[1], e[2], e[3])} fill={L.edge} />;
        })}
        {dashes}
        {marks}
        {far.map((o) => {
          const p = P(o.X, o.z);
          return <React.Fragment key={o.key}>{o.draw(p.x, p.y, 1 / o.z, o.z)}</React.Fragment>;
        })}
      </g>
    </>
  );
};

/** A banner/arch across the road at depth S (an object; `text` on the banner). */
export const archObj = (S: number, text: string, color: string, sub?: string, checker = false): RoadObj => ({
  X: 0, S, key: `arch${S}`,
  draw: (x, y, s) => (
    <g key={`arch${S}`} transform={`translate(${x} ${y}) scale(${s})`}>
      {[-1, 1].map((k) => (
        <rect key={k} x={k * 1000 - 30} y={-1500} width={60} height={1500} fill="#D8D2E6" stroke={INK} strokeWidth={10} />
      ))}
      <rect x={-1060} y={-1640} width={2120} height={260} rx={30} fill={color} stroke={INK} strokeWidth={14} />
      {checker
        ? Array.from({ length: 2 * 30 }).map((_, i) => (
            <rect key={i} x={-1060 + (i % 30) * (2120 / 30)} y={-1640 + Math.floor(i / 30) * 36} width={2120 / 30} height={36} fill={(i + Math.floor(i / 30)) % 2 ? '#FFFFFF' : INK} opacity={0.9} />
          ))
        : null}
      <text x={0} y={checker ? -1480 : -1505} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={170} fill="#FFFFFF" stroke={INK} strokeWidth={8} paintOrder="stroke">
        {text}
      </text>
      {sub ? (
        <text x={0} y={-1680} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={90} fill={INK}>
          {sub}
        </text>
      ) : null}
    </g>
  ),
});

/** Checkered line painted across the road at depth z (stage path, for RoadWorld's `marks`). */
export const checkerLine = (z: number, w = 0.32) => {
  if (z < ZMIN) return null;
  const cells: React.ReactNode[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      const X0 = -1.3 + (i * 2.6) / n;
      const X1 = X0 + 2.6 / n;
      const z0 = z + (j * w) / 2;
      const z1 = z0 + w / 2;
      if (z0 < ZMIN) continue;
      cells.push(<path key={`${i}-${j}`} d={quad(P(X0, z0), P(X1, z0), P(X1, z1), P(X0, z1))} fill={(i + j) % 2 ? '#FFFFFF' : INK} />);
    }
  }
  return <g>{cells}</g>;
};

export { mul, T, Rot };

/** Roadside sign on a post (stage space at the post foot). */
export const RoadSign: React.FC<{ x: number; y: number; s: number; text: string; color?: string }> = ({ x, y, s, text, color = '#FFD064' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-12} y={-520} width={24} height={520} fill="#B9B5CC" stroke={INK} strokeWidth={8} />
    <path d="M0 -760 L170 -470 L-170 -470 Z" fill={color} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    <path d="M0 -720 L136 -490 L-136 -490 Z" fill="none" stroke="#D9434A" strokeWidth={16} strokeLinejoin="round" />
    <text x={0} y={-548} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={86} fill={INK}>
      {text}
    </text>
  </g>
);
