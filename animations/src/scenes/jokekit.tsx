// Shared props for the second batch of inside jokes: name tags, text bubbles, rooms, phones, clocks.
import React from 'react';
import { C } from '../hero/Hero';
import { springAt, clamp, seg, lerp } from '../lib/anim';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { INK } from './kit';
import { rrPath, softStar, heartPath, rng } from '../lib/shape';

/** Each person's app colour (js/config.js ROSTER) and a darker shade. */
export const PEOPLE: Record<string, [string, string, string]> = {
  osim: ['#7254DC', '#4F35B0', '#DCD0FF'],
  amaan: ['#F2853A', '#B4521C', '#FFE0C7'],
  ayaad: ['#2FA36B', '#1D6E48', '#C8F0DA'],
  connor: ['#2F66E6', '#1F47C2', '#CFE0FF'],
  dean: ['#EE5982', '#A83560', '#FFD3E2'],
  dylan: ['#1FA3A0', '#157A77', '#BFF2EF'],
  gaurav: ['#B45AC8', '#7A3B9E', '#F0D4FA'],
  jake: ['#E39A2E', '#A8661A', '#FFE7C2'],
  philip: ['#D9644F', '#9A3B2B', '#FFD6CC'],
};

/** Name tag that floats above someone (stage space). t = frames since it appears. */
export const NameTag: React.FC<{ x: number; y: number; name: string; color: string; t: number; s?: number; rot?: number; out?: number; pointer?: boolean }> = ({
  x, y, name, color, t, s = 1, rot = -3, out = 0, pointer = true,
}) => {
  if (t < 0) return null;
  const k = clamp(springAt(t, 0, 12, 1.4, 5), 0, 1.15) * (1 - out);
  if (k <= 0.01) return null;
  const w = 76 + name.length * 41;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + Math.sin(t / 9) * 1.5}) scale(${k * s})`}>
      <rect x={-w / 2} y={-46} width={w} height={92} rx={46} fill={INK} transform="translate(0 10)" />
      {pointer ? <path d="M-22 36 L0 72 L22 36 Z" fill={color} stroke={INK} strokeWidth={8} strokeLinejoin="round" /> : null}
      <rect x={-w / 2} y={-46} width={w} height={92} rx={46} fill={color} stroke={INK} strokeWidth={8} />
      {pointer ? <rect x={-17} y={30} width={34} height={14} fill={color} /> : null}
      <rect x={-w / 2 + 22} y={-34} width={w - 44} height={16} rx={8} fill="#FFFFFF" opacity={0.3} />
      <text x={0} y={7} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={66} fill="#FFFFFF" stroke={INK} strokeWidth={11} paintOrder="stroke" strokeLinejoin="round" letterSpacing={1}>
        {name}
      </text>
    </g>
  );
};

/** Text-message bubble (as in The Iron). side: which side the tail is on. */
export const Bubble: React.FC<{ x: number; y: number; text: string; t: number; me?: boolean; side?: 1 | -1; size?: number; color?: string; ink?: string }> = ({
  x, y, text, t, me, side = 1, size = 38, color, ink,
}) => {
  if (t < 0) return null;
  const k = Math.max(0, Math.min(1.15, springAt(t, 0, 9, 1.5, 5)));
  const w = 44 + text.length * size * 0.5;
  const fill = color ?? (me ? '#7254DC' : '#FFFFFF');
  const fg = ink ?? (me ? '#FFFFFF' : INK);
  const h = size * 1.7;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <g transform={`scale(${side} 1)`}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.4} fill={fill} stroke={INK} strokeWidth={6} />
        <path d={`M${w / 2 - 30} ${h / 2 - 4} l16 22 l-34 -18 Z`} fill={fill} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <rect x={w / 2 - 56} y={h / 2 - 10} width={30} height={12} fill={fill} />
      </g>
      <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={size} letterSpacing={1} fill={fg}>
        {text}
      </text>
    </g>
  );
};

/** Wall clock. m = minutes since midnight. late > 0 tints it and shows a tag. */
export const WallClock: React.FC<{ x: number; y: number; m: number; late?: number; tag?: string; r?: number; wob?: number }> = ({ x, y, m, late = 0, tag = 'LATE', r = 130, wob = 0 }) => {
  const mA = (m % 60) * 6;
  const hA = (m / 60) * 30;
  const k = r / 130;
  return (
    <g transform={`translate(${x} ${y}) rotate(${wob}) scale(${k})`}>
      <circle r={130} fill={INK} transform="translate(0 10)" />
      <circle r={130} fill={late > 0.5 ? '#FFB3B3' : '#FFFDF8'} stroke={INK} strokeWidth={12} />
      <circle r={112} fill="none" stroke={C.gold} strokeWidth={10} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={0} y1={-92} x2={0} y2={i % 3 ? -80 : -70} stroke={INK} strokeWidth={i % 3 ? 6 : 10} strokeLinecap="round" transform={`rotate(${i * 30})`} />
      ))}
      <line x1={0} y1={0} x2={0} y2={-56} stroke={INK} strokeWidth={14} strokeLinecap="round" transform={`rotate(${hA})`} />
      <line x1={0} y1={0} x2={0} y2={-84} stroke={late > 0.5 ? '#E2384D' : INK} strokeWidth={9} strokeLinecap="round" transform={`rotate(${mA})`} />
      <circle r={12} fill={C.gold} stroke={INK} strokeWidth={5} />
      {late > 0 ? (
        <g transform={`translate(0 60) scale(${late})`}>
          <rect x={-90} y={-28} width={180} height={56} rx={14} fill="#E2384D" stroke={INK} strokeWidth={6} />
          <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={42} fill="#FFFFFF">{tag}</text>
        </g>
      ) : null}
    </g>
  );
};

/** Tear-off calendar. */
export const Calendar: React.FC<{ x: number; y: number; top: string; big: string; rot?: number; color?: string; s?: number; bigSize?: number }> = ({
  x, y, top, big, rot = -4, color = '#E2384D', s = 1, bigSize = 86,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-90} y={-60} width={180} height={190} rx={12} fill={INK} transform="translate(5 8)" />
    <rect x={-90} y={-60} width={180} height={190} rx={12} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
    <rect x={-90} y={-60} width={180} height={56} rx={12} fill={color} stroke={INK} strokeWidth={8} />
    <text x={0} y={-30} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#FFFFFF">{top}</text>
    <text x={0} y={66} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={bigSize} fill={INK}>{big}</text>
  </g>
);

/** Striped wallpaper + floor, drawn in world space (camera applies). */
export const Room: React.FC<{ wall: string; stripe: string; floor: string; floorLine: string; floorY?: number; stripeW?: number }> = ({
  wall, stripe, floor, floorLine, floorY = 1640, stripeW = 56,
}) => (
  <g>
    <rect x={-600} y={-600} width={2280} height={3200} fill={wall} />
    {Array.from({ length: 20 }).map((_, i) => (
      <rect key={i} x={-600 + i * 120} y={-600} width={stripeW} height={3200} fill={stripe} />
    ))}
    <rect x={-600} y={floorY} width={2280} height={1200} fill={floor} />
    <rect x={-600} y={floorY} width={2280} height={18} fill={floorLine} />
  </g>
);

/** Phone held in a hand (wrist space, like the Mirror scene's), screen facing the viewer. */
export const HandPhone: React.FC<{ color?: string; dark?: string; glow?: number; rot?: number }> = ({ color = '#2B2340', dark = '#15111F', glow = 0, rot = 0 }) => (
  <g transform={`translate(0 70) rotate(${rot})`}>
    <rect x={-56} y={-90} width={112} height={200} rx={22} fill={INK} transform="translate(5 7)" opacity={0.35} />
    <rect x={-56} y={-90} width={112} height={200} rx={22} fill={color} stroke={INK} strokeWidth={7} />
    <rect x={-44} y={-76} width={88} height={168} rx={12} fill={glow > 0 ? '#BCD3FF' : '#3B3456'} />
    <rect x={-44} y={-76} width={88} height={168} rx={12} fill="#FFFFFF" opacity={glow * 0.6} />
    <rect x={-20} y={-84} width={40} height={6} rx={3} fill={dark} />
  </g>
);

/** The cap emoji, as a drawing: a blue ball cap. */
export const Cap: React.FC<{ s?: number; rot?: number }> = ({ s = 1, rot = 0 }) => (
  <g transform={`rotate(${rot}) scale(${s})`}>
    <path d="M-120 20 C-130 -70 -60 -120 10 -118 C90 -116 130 -60 120 20 Z" fill={INK} transform="translate(6 10)" />
    {/* bill */}
    <path d="M40 4 C100 -6 190 0 210 30 C190 52 110 50 30 40 Z" fill="#1F47C2" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M60 14 C110 8 170 14 190 30" fill="none" stroke="#5E9BFF" strokeWidth={7} strokeLinecap="round" />
    {/* crown */}
    <path d="M-120 20 C-130 -70 -60 -120 10 -118 C90 -116 130 -60 120 20 Z" fill="#2F66E6" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-4 -116 C-20 -70 -24 -20 -20 18" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <path d="M-70 -84 C-80 -50 -84 -20 -84 16" fill="none" stroke="#1F47C2" strokeWidth={6} strokeLinecap="round" />
    <path d="M-90 -50 C-70 -96 -20 -110 20 -104" fill="none" stroke="#9FC2FF" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
    <ellipse cx={4} cy={-118} rx={18} ry={9} fill="#1F47C2" stroke={INK} strokeWidth={6} />
    <path d="M-124 18 L124 18" stroke={INK} strokeWidth={9} strokeLinecap="round" />
  </g>
);

/** A feed post card as on the app (stage space). caps = how lit the cap button is. */
export const PostCard: React.FC<{ x: number; y: number; s?: number; rot?: number; name: string; color: string; cat: string; pts: string; caption: string; capOn?: number; t?: number }> = ({
  x, y, s = 1, rot = 0, name, color, cat, pts, caption, capOn = 0, t = 99,
}) => {
  const k = clamp(springAt(t, 0, 12, 1.4, 5), 0, 1.15);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * k})`}>
      <rect x={-300} y={-170} width={600} height={340} rx={34} fill={INK} transform="translate(0 14)" />
      <rect x={-300} y={-170} width={600} height={340} rx={34} fill="#FFFFFF" stroke={INK} strokeWidth={9} />
      <circle cx={-226} cy={-100} r={42} fill={color} stroke={INK} strokeWidth={7} />
      <text x={-226} y={-94} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFFFF">{name[0]}</text>
      <text x={-166} y={-112} dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={46} fill={INK}>{name}</text>
      <g transform="translate(-166 -66)">
        <rect x={0} y={-22} width={30 + cat.length * 22} height={44} rx={22} fill="#FFF3D6" stroke={INK} strokeWidth={5} />
        <text x={15 + cat.length * 11} y={3} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={30} fill={INK}>{cat}</text>
      </g>
      <g transform="translate(212 -96)">
        <rect x={-62} y={-34} width={124} height={68} rx={34} fill={C.gold} stroke={INK} strokeWidth={7} />
        <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill={INK}>{pts}</text>
      </g>
      <text x={-262} y={14} dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={50} fill={INK} letterSpacing={1}>{caption}</text>
      {/* reaction row */}
      {[0, 1, 2, 3, 4].map((i) => {
        const cap = i === 4;
        const on = cap ? capOn : 0;
        return (
          <g key={i} transform={`translate(${-210 + i * 106} 112) scale(${1 + on * 0.25})`}>
            <rect x={-44} y={-34} width={88} height={68} rx={34} fill={on > 0.5 ? '#CFE0FF' : '#FFFFFF'} stroke={on > 0.5 ? '#2F66E6' : INK} strokeWidth={on > 0.5 ? 8 : 6} />
            {cap ? (
              <g transform="translate(-4 6) scale(0.2)"><Cap /></g>
            ) : (
              <path d={[softStar(0, 0, 22, 9, 5), heartPath(0, -2, 20), softStar(0, 0, 22, 12, 8), 'M-20 0 A20 20 0 1 0 20 0 A20 20 0 1 0 -20 0'][i]} fill={['#FFB13D', '#EE5982', '#FFD064', '#FFD064'][i]} stroke={INK} strokeWidth={4} />
            )}
          </g>
        );
      })}
    </g>
  );
};

/** Little bits that fly off (stage space): chunks, sweat, sparks. */
export const Flecks: React.FC<{ f: number; start: number; x: number; y: number; n?: number; seed?: number; color?: string; speed?: number; g?: number; size?: number; life?: number }> = ({
  f, start, x, y, n = 10, seed = 1, color = '#FFFFFF', speed = 22, g = 1.4, size = 14, life = 26,
}) => {
  const t = f - start;
  if (t < 0 || t > life) return null;
  const r = rng(seed);
  return (
    <g opacity={1 - seg(t, life * 0.6, life)}>
      {Array.from({ length: n }).map((_, i) => {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
        const v = speed * (0.5 + r() * 0.7);
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 0.5 * g * t * t;
        const sz = size * (0.6 + r() * 0.8);
        return <circle key={i} cx={px} cy={py} r={sz} fill={color} stroke={INK} strokeWidth={4} />;
      })}
    </g>
  );
};

/** Ease helper: 0 → 1 → 0 bump inside [a, b]. */
export const bump = (f: number, a: number, b: number) => {
  const t = seg(f, a, b);
  return Math.sin(t * Math.PI);
};

export const mixPt = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Rounded-rect path helper re-export for scenes. */
export { rrPath };
