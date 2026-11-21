import React from 'react';
import { rng, softStar, starPath, heartPath, cloudPath, circlePath } from '../lib/shape';
import { clamp, seg, E, springy, lerp } from '../lib/anim';
import { SFX_FONT, TITLE_FONT } from '../fonts';
import { C } from '../hero/Hero';

export const INK = C.ink;

/* ---------------- Speed / focus lines ---------------- */
export const FocusLines: React.FC<{
  f: number; cx: number; cy: number; r0?: number; r1?: number; n?: number; seed?: number; color?: string; opacity?: number; width?: number;
}> = ({ f, cx, cy, r0 = 380, r1 = 1500, n = 56, seed = 3, color = '#FFFFFF', opacity = 0.85, width = 26 }) => {
  const r = rng(seed * 997 + Math.floor(f / 2) * 31);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.08;
    const w = (0.25 + r() * 0.75) * width;
    const inner = r0 * (0.75 + r() * 0.6);
    const aw = w / inner;
    const x0 = cx + Math.cos(a) * inner;
    const y0 = cy + Math.sin(a) * inner;
    const x1 = cx + Math.cos(a - aw * 6) * r1;
    const y1 = cy + Math.sin(a - aw * 6) * r1;
    const x2 = cx + Math.cos(a + aw * 6) * r1;
    const y2 = cy + Math.sin(a + aw * 6) * r1;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}Z`;
  }
  return <path d={d} fill={color} opacity={opacity} />;
};

/** Horizontal/vertical streak lines (motion), drifting. */
export const Streaks: React.FC<{
  f: number; x0: number; y0: number; w: number; h: number; angle?: number; n?: number; seed?: number; color?: string; speed?: number; len?: number; opacity?: number; thick?: number;
}> = ({ f, x0, y0, w, h, angle = 90, n = 18, seed = 7, color = '#FFFFFF', speed = 60, len = 260, opacity = 0.8, thick = 10 }) => {
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < n; i++) {
    const lx = r() * w;
    const off = r() * (h + len);
    const l = len * (0.5 + r() * 0.8);
    const th = thick * (0.4 + r() * 0.8);
    const y = ((off + f * speed * (0.7 + r() * 0.6)) % (h + len)) - len;
    items.push(
      <rect key={i} x={lx} y={y} width={th} height={l} rx={th / 2} fill={color} />,
    );
  }
  return (
    <g transform={`translate(${x0} ${y0}) rotate(${angle - 90} ${w / 2} ${h / 2})`} opacity={opacity}>
      {items}
    </g>
  );
};

/* ---------------- Burst / impact ---------------- */
export const Burst: React.FC<{
  x: number; y: number; r: number; t: number; spikes?: number; fill?: string; fill2?: string; seed?: number; rot?: number; stroke?: boolean;
}> = ({ x, y, r, t, spikes = 14, fill = '#FFD064', fill2 = '#FFFFFF', seed = 1, rot = 0, stroke = true }) => {
  if (t <= 0 || t >= 1) return null;
  const grow = E.out(clamp(t / 0.35));
  const fade = 1 - seg(t, 0.55, 1);
  const rr = rng(seed);
  const pts: string[] = [];
  const pts2: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = ((i / (spikes * 2)) * 360 + rot) * (Math.PI / 180);
    const k = i % 2 === 0 ? 1 * (0.75 + rr() * 0.5) : 0.48;
    pts.push(`${(Math.cos(a) * r * k).toFixed(1)} ${(Math.sin(a) * r * k).toFixed(1)}`);
    pts2.push(`${(Math.cos(a) * r * k * 0.62).toFixed(1)} ${(Math.sin(a) * r * k * 0.62).toFixed(1)}`);
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${grow})`} opacity={fade}>
      <path d={`M${pts.join('L')}Z`} fill={fill} stroke={stroke ? INK : 'none'} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M${pts2.join('L')}Z`} fill={fill2} />
    </g>
  );
};

export const Ring: React.FC<{ x: number; y: number; t: number; r: number; color?: string; w?: number; sy?: number }> = ({ x, y, t, r, color = '#FFFFFF', w = 26, sy = 1 }) => {
  if (t <= 0 || t >= 1) return null;
  const k = E.out(t);
  return (
    <ellipse cx={x} cy={y} rx={r * k} ry={r * k * sy} fill="none" stroke={color} strokeWidth={w * (1 - t)} opacity={1 - t * 0.6} />
  );
};

/* ---------------- Sparkles ---------------- */
export const Twinkle: React.FC<{ x: number; y: number; s: number; t: number; color?: string; rot?: number }> = ({ x, y, s, t, color = '#FFFFFF', rot = 0 }) => {
  if (t <= 0 || t >= 1) return null;
  const k = Math.sin(Math.PI * t);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + t * 90}) scale(${k * s})`}>
      <path d={softStar(0, 0, 40, 9, 4, -90)} fill={color} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    </g>
  );
};

export const Glint: React.FC<{ x: number; y: number; s: number; t: number }> = ({ x, y, s, t }) => {
  if (t <= 0 || t >= 1) return null;
  const k = Math.sin(Math.PI * t);
  return (
    <g transform={`translate(${x} ${y}) rotate(${t * 120}) scale(${k * s})`}>
      <path d={softStar(0, 0, 46, 7, 4, -90)} fill="#FFFFFF" />
      <circle r={9} fill="#FFFFFF" />
    </g>
  );
};

/* ---------------- Particles ---------------- */
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; rot: number; vr: number; k: number; c: number };

export function emit(seed: number, n: number, o: {
  x: number; y: number; spread?: number; angle?: number; speed?: [number, number]; life?: [number, number]; size?: [number, number]; jitter?: number;
}): Particle[] {
  const r = rng(seed);
  const out: Particle[] = [];
  const a0 = o.angle ?? -90;
  const sp = o.spread ?? 360;
  for (let i = 0; i < n; i++) {
    const a = ((a0 + (r() - 0.5) * sp) * Math.PI) / 180;
    const v = lerp(o.speed?.[0] ?? 10, o.speed?.[1] ?? 30, r());
    out.push({
      x: o.x + (r() - 0.5) * (o.jitter ?? 0),
      y: o.y + (r() - 0.5) * (o.jitter ?? 0),
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: lerp(o.life?.[0] ?? 20, o.life?.[1] ?? 40, r()),
      size: lerp(o.size?.[0] ?? 8, o.size?.[1] ?? 20, r()),
      rot: r() * 360,
      vr: (r() - 0.5) * 30,
      k: r(),
      c: Math.floor(r() * 1000),
    });
  }
  return out;
}

/** Position of particle at age t (frames). */
export const pAt = (p: Particle, t: number, g = 1.2, drag = 0.04) => {
  const dk = drag > 0 ? (1 - Math.exp(-drag * t)) / drag : t;
  return {
    x: p.x + p.vx * dk,
    y: p.y + p.vy * dk + 0.5 * g * t * t,
    rot: p.rot + p.vr * t,
    a: clamp(1 - t / p.life),
  };
};

export const Sparks: React.FC<{ f: number; start: number; seed: number; n: number; x: number; y: number; colors?: string[]; speed?: [number, number]; g?: number; size?: [number, number]; angle?: number; spread?: number; shape?: 'star' | 'dot' | 'drop' | 'heart' | 'confetti' | 'foam' | 'sand' | 'grass' }> = ({
  f, start, seed, n, x, y, colors = ['#FFD064', '#FFFFFF', '#F9A246'], speed = [14, 34], g = 1.1, size = [10, 24], angle = -90, spread = 360, shape = 'star',
}) => {
  const t = f - start;
  if (t < 0) return null;
  const ps = emit(seed, n, { x, y, speed, size, angle, spread, life: [18, 36] });
  return (
    <g>
      {ps.map((p, i) => {
        const q = pAt(p, t, g, 0.06);
        if (q.a <= 0) return null;
        const col = colors[p.c % colors.length];
        const s = p.size * (0.4 + 0.6 * q.a);
        if (shape === 'dot' || shape === 'foam')
          return <circle key={i} cx={q.x} cy={q.y} r={s * 0.6} fill={col} stroke={shape === 'foam' ? '#E9D8BC' : INK} strokeWidth={shape === 'foam' ? 3 : 4} opacity={Math.min(1, q.a * 2)} />;
        if (shape === 'sand' || shape === 'grass')
          return <circle key={i} cx={q.x} cy={q.y} r={s * 0.5} fill={col} opacity={Math.min(1, q.a * 2)} />;
        if (shape === 'drop')
          return (
            <g key={i} transform={`translate(${q.x} ${q.y}) rotate(${(Math.atan2(p.vy + g * t, p.vx) * 180) / Math.PI + 90}) scale(${s / 20})`} opacity={Math.min(1, q.a * 2)}>
              <path d="M0 -22 C10 -6 14 2 14 8 A14 14 0 0 1 -14 8 C-14 2 -10 -6 0 -22 Z" fill={col} stroke={INK} strokeWidth={5} />
            </g>
          );
        if (shape === 'heart')
          return <path key={i} d={heartPath(0, 0, s)} transform={`translate(${q.x} ${q.y}) rotate(${q.rot * 0.2})`} fill={col} stroke={INK} strokeWidth={4} opacity={Math.min(1, q.a * 2)} />;
        if (shape === 'confetti')
          return (
            <rect key={i} x={-s / 2} y={-s / 4} width={s} height={s / 2} rx={3} fill={col} transform={`translate(${q.x} ${q.y}) rotate(${q.rot}) scale(1 ${Math.cos((q.rot * Math.PI) / 90)})`} opacity={Math.min(1, q.a * 2)} />
          );
        return <path key={i} d={softStar(0, 0, s, s * 0.42, 4)} transform={`translate(${q.x} ${q.y}) rotate(${q.rot})`} fill={col} stroke={INK} strokeWidth={3.5} opacity={Math.min(1, q.a * 2)} />;
      })}
    </g>
  );
};

/* ---------------- Dust puffs ---------------- */
export const Dust: React.FC<{ f: number; start: number; x: number; y: number; n?: number; seed?: number; spread?: number; size?: number; color?: string; dir?: number; rise?: number; line?: string }> = ({
  f, start, x, y, n = 7, seed = 2, spread = 260, size = 60, color = '#FFFFFF', dir = 0, rise = 0.6, line = '#B9B0D1',
}) => {
  const t = f - start;
  if (t < 0 || t > 44) return null;
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const k = r();
    const vx = (side * (0.35 + k) * spread) / 26 + dir;
    const vy = -(0.25 + r() * rise) * 2.4;
    const life = 24 + r() * 18;
    const tt = Math.min(1, t / life);
    const s = size * (0.55 + r() * 0.6) * (0.35 + E.out(tt) * 0.95);
    const ph = r() * 6.28;
    if (tt >= 1) continue;
    const ease = 1 - Math.pow(1 - tt, 2);
    const px = x + vx * life * ease * 0.55;
    const py = y + vy * t * 0.9 - s * 0.3;
    const blob = [0, 1, 2].map((j) => {
      const a = ph + j * 2.1;
      return { cx: px + Math.cos(a) * s * 0.45, cy: py + Math.sin(a) * s * 0.3, rr: s * (0.62 + 0.12 * j) };
    });
    items.push(
      <g key={i} opacity={(1 - tt) * 0.95}>
        {blob.map((b, j) => (
          <circle key={j} cx={b.cx} cy={b.cy} r={b.rr} fill="none" stroke={line} strokeWidth={8} />
        ))}
        {blob.map((b, j) => (
          <circle key={'f' + j} cx={b.cx} cy={b.cy} r={b.rr} fill={color} />
        ))}
        <circle cx={blob[0].cx - s * 0.2} cy={blob[0].cy - s * 0.25} r={s * 0.28} fill="#FFFFFF" opacity={0.7} />
      </g>,
    );
  }
  return <g>{items}</g>;
};

/* ---------------- Clouds ---------------- */
export const Cloud: React.FC<{ x: number; y: number; w: number; h: number; seed?: number; line?: string; shade?: string; fill?: string; lw?: number; opacity?: number }> = ({
  x, y, w, h, seed = 1, line = '#6866AD', shade = '#AFB3ED', fill = '#E8E6FF', lw = 6, opacity = 1,
}) => {
  const d = cloudPath(x, y, w, h, seed);
  const id = `cl${seed}${Math.round(x)}${Math.round(y)}${Math.round(w)}`;
  return (
    <g opacity={opacity}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={shade} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={fill} transform={`translate(${-w * 0.02} ${-h * 0.18})`} />
      </g>
      <path d={d} fill="none" stroke={line} strokeWidth={lw} strokeLinejoin="round" />
    </g>
  );
};

/* ---------------- Comic SFX text ---------------- */
export const Sfx: React.FC<{
  f: number; start: number; text: string; x: number; y: number; size?: number; rot?: number; fill?: string; dur?: number; shake?: boolean; font?: string; inner?: string;
}> = ({ f, start, text, x, y, size = 150, rot = -8, fill = '#FFD064', dur = 26, shake = true, font = SFX_FONT, inner = '#FFFFFF' }) => {
  const t = f - start;
  if (t < 0 || t > dur) return null;
  const s = springy(t / 14, 1.4, 5.5);
  const out = seg(t, dur - 6, dur);
  const jx = shake ? Math.sin(t * 7.3) * 3 * (1 - out) : 0;
  const jy = shake ? Math.cos(t * 6.1) * 3 * (1 - out) : 0;
  return (
    <g transform={`translate(${x + jx} ${y + jy}) rotate(${rot}) scale(${Math.max(0, s) * (1 + out * 0.3)})`} opacity={1 - out}>
      <text textAnchor="middle" dominantBaseline="middle" fontFamily={font} fontSize={size} fill={INK} stroke={INK} strokeWidth={size * 0.26} strokeLinejoin="round" letterSpacing={size * 0.02} transform={`translate(${size * 0.04} ${size * 0.07})`}>
        {text}
      </text>
      <text textAnchor="middle" dominantBaseline="middle" fontFamily={font} fontSize={size} fill={fill} stroke={inner} strokeWidth={size * 0.1} paintOrder="stroke" strokeLinejoin="round" letterSpacing={size * 0.02}>
        {text}
      </text>
      <text textAnchor="middle" dominantBaseline="middle" fontFamily={font} fontSize={size} fill={fill} stroke={INK} strokeWidth={size * 0.05} strokeLinejoin="round" letterSpacing={size * 0.02}>
        {text}
      </text>
    </g>
  );
};

/* ---------------- Confetti rain ---------------- */
export const ConfettiRain: React.FC<{ f: number; start: number; n?: number; seed?: number; colors?: string[]; hearts?: boolean }> = ({
  f, start, n = 70, seed = 11, colors = ['#EE5982', '#FFD064', '#6A5BE0', '#6ACC86', '#A98BFF', '#F88F4D'], hearts,
}) => {
  const t = f - start;
  if (t < 0) return null;
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const x0 = r() * 1080;
        const delay = r() * 26;
        const sp = 9 + r() * 10;
        const sw = 30 + r() * 50;
        const ph = r() * 6.28;
        const tt = t - delay;
        if (tt < 0) return null;
        const y = -60 + tt * sp;
        const x = x0 + Math.sin(tt / 8 + ph) * sw;
        const col = colors[i % colors.length];
        const rot = tt * (6 + r() * 8) + ph * 50;
        const flip = Math.cos(tt / 4 + ph);
        if (hearts && i % 3 === 0)
          return <path key={i} d={heartPath(0, 0, 18)} transform={`translate(${x} ${y}) rotate(${Math.sin(tt / 6) * 20}) scale(${0.6 + 0.4 * Math.abs(flip)} 1)`} fill="#EE5982" stroke={INK} strokeWidth={4} />;
        return <rect key={i} x={-14} y={-7} width={28} height={14} rx={4} fill={col} transform={`translate(${x} ${y}) rotate(${rot}) scale(1 ${flip})`} />;
      })}
    </g>
  );
};

/* ---------------- Glow ---------------- */
export const GlowDefs: React.FC = () => (
  <defs>
    <radialGradient id="glowW">
      <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
      <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.35" />
      <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowY">
      <stop offset="0" stopColor="#FFF0B7" stopOpacity="1" />
      <stop offset="0.4" stopColor="#FED67D" stopOpacity="0.45" />
      <stop offset="1" stopColor="#FFAE4C" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowP">
      <stop offset="0" stopColor="#FBD3E0" stopOpacity="1" />
      <stop offset="0.45" stopColor="#F47A9F" stopOpacity="0.4" />
      <stop offset="1" stopColor="#F14A7C" stopOpacity="0" />
    </radialGradient>
  </defs>
);

export const Glow: React.FC<{ x: number; y: number; r: number; id?: string; o?: number }> = ({ x, y, r, id = 'glowW', o = 1 }) => (
  <circle cx={x} cy={y} r={r} fill={`url(#${id})`} opacity={o} />
);

/* ---------------- Sun with rotating rays ---------------- */
export const Sun: React.FC<{ x: number; y: number; r: number; f: number; rays?: boolean; color?: string }> = ({ x, y, r, f, rays = true, color = '#FFD064' }) => (
  <g>
    {rays ? (
      <g transform={`translate(${x} ${y}) rotate(${f * 0.4})`} opacity={0.35}>
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d={`M0 0 L${r * 5} ${-r * 0.55} L${r * 5} ${r * 0.55} Z`} transform={`rotate(${i * 30})`} fill="#FFFFFF" />
        ))}
      </g>
    ) : null}
    <Glow x={x} y={y} r={r * 2.6} id="glowY" o={0.8} />
    <circle cx={x} cy={y} r={r} fill={color} stroke="#C77928" strokeWidth={8} />
    <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#FFFFFF" opacity={0.55} />
  </g>
);

export const Stars: React.FC<{ f: number; n: number; seed: number; area: [number, number, number, number] }> = ({ f, n, seed, area }) => {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const x = area[0] + r() * area[2];
        const y = area[1] + r() * area[3];
        const s = 0.3 + r() * 0.5;
        const tw = 0.5 + 0.5 * Math.sin(f / (5 + r() * 6) + r() * 6);
        return <path key={i} d={softStar(x, y, 16 * s, 5 * s, 4)} fill="#FFFFFF" opacity={0.4 + tw * 0.6} />;
      })}
    </g>
  );
};

export { starPath, circlePath, TITLE_FONT };
