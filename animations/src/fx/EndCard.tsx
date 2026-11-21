import React from 'react';
import { TITLE_FONT } from '../fonts';
import { springy, seg, clamp, E } from '../lib/anim';
import { softStar } from '../lib/shape';
import { C } from '../hero/Hero';

const INK = C.ink;

const Letter: React.FC<{ ch: string; size: number; t: number; i: number; light: string }> = ({ ch, size, t, i, light }) => {
  const t0 = 5 + i * 1.6;
  const k = springy((t - t0) / 11, 1.5, 5.2);
  const bob = t > t0 + 12 ? Math.sin((t + i * 3.2) / 5.5) * 3.5 : 0;
  const common: React.CSSProperties = {
    fontFamily: TITLE_FONT,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: 0,
    whiteSpace: 'pre',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        transform: `translateY(${(1 - Math.min(1, k)) * -50 + bob}px) scale(${Math.max(0, k)}) rotate(${(1 - Math.min(1, k)) * (i % 2 ? 14 : -14)}deg)`,
        transformOrigin: '50% 80%',
      }}
    >
      <span
        style={{
          ...common,
          position: 'absolute',
          left: 0,
          top: 0,
          color: INK,
          WebkitTextStroke: `${size * 0.2}px ${INK}`,
          filter: `drop-shadow(0 ${size * 0.07}px 0 ${INK})`,
        }}
      >
        {ch}
      </span>
      <span
        style={{
          ...common,
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 48%, ${light} 52%, ${light} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {ch}
      </span>
    </span>
  );
};

const Tail: React.FC<{ side: -1 | 1; color: string; dark: string }> = ({ side, color, dark }) => (
  <svg
    width={150}
    height={130}
    viewBox="0 0 150 130"
    style={{
      position: 'absolute',
      top: 34,
      [side === -1 ? 'left' : 'right']: -96,
      transform: side === 1 ? 'scaleX(-1)' : undefined,
      zIndex: -1,
      overflow: 'visible',
    }}
  >
    <path d="M150 10 L20 10 L52 62 L20 114 L150 114 Z" fill={color} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M150 10 L102 10 L102 -22 Z" fill={dark} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M118 30 L60 30" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" opacity={0.35} />
  </svg>
);

export const EndCard: React.FC<{
  f: number;
  start: number;
  lines: string[];
  pts: string;
  color: string;
  dark: string;
  light?: string;
  y?: number;
  size?: number;
  /** word under the number on the coin ('' hides it) */
  unit?: string;
  /** small caption plate under the ribbon */
  sub?: string;
}> = ({ f, start, lines, pts, color, dark, light = '#FFF0B7', y = 210, size, unit = 'PTS', sub }) => {
  const t = f - start;
  if (t < 0) return null;
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fs = size ?? Math.min(132, 800 / (maxLen * 0.64));
  const k = springy(t / 13, 1.3, 5);
  const rot = -4 + (1 - Math.min(1, k)) * -10 + Math.sin(t / 14) * 0.8;
  // coin
  const ct = t - 10;
  const ck = springy(ct / 15, 1.4, 5);
  const ang = 3 * Math.PI * (1 - E.out(seg(ct, 0, 26)));
  const coinSX = ct < 0 ? 0 : Math.max(0.06, Math.abs(Math.cos(ang))) * Math.max(0, ck);
  const shine = seg(ct, 26, 40);
  const coinR = 108;
  let idx = 0;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', transform: `scale(${Math.max(0, k)}) rotate(${rot}deg)`, transformOrigin: '50% 60%' }}>
        <Tail side={-1} color={color} dark={dark} />
        <Tail side={1} color={color} dark={dark} />
        <div
          style={{
            position: 'relative',
            background: `linear-gradient(180deg, ${color} 0%, ${color} 60%, ${dark} 100%)`,
            border: `10px solid ${INK}`,
            borderRadius: 34,
            padding: `${fs * 0.22}px ${fs * 0.42}px ${fs * 0.12}px`,
            boxShadow: `0 16px 0 ${INK}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'absolute', left: 22, right: 22, top: 12, height: 14, borderRadius: 10, background: '#FFFFFF', opacity: 0.35 }} />
          {lines.map((line, li) => (
            <div key={li} style={{ display: 'flex', lineHeight: 1, marginTop: li ? fs * 0.06 : 0 }}>
              {line.split('').map((ch) => {
                const i = idx++;
                return <Letter key={i} ch={ch} size={fs} t={t} i={i} light={light} />;
              })}
            </div>
          ))}
        </div>
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 30,
            transform: `scale(${Math.max(0, springy((t - 8) / 12, 1.4, 5))}) rotate(${2 + Math.sin(t / 16) * 0.6}deg)`,
            background: '#FFFFFF',
            border: `8px solid ${INK}`,
            borderRadius: 999,
            boxShadow: `0 10px 0 ${INK}`,
            padding: '10px 34px 4px',
            fontFamily: TITLE_FONT,
            fontSize: 52,
            lineHeight: 1.1,
            color: dark,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </div>
      ) : null}
      <div style={{ marginTop: 36, position: 'relative', width: coinR * 2 + 40, height: coinR * 2 + 40 }}>
        <svg width={coinR * 2 + 40} height={coinR * 2 + 40} viewBox={`${-coinR - 20} ${-coinR - 20} ${coinR * 2 + 40} ${coinR * 2 + 40}`} style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="coinclip">
              <circle r={coinR - 14} />
            </clipPath>
          </defs>
          <g transform={`scale(${coinSX} ${Math.max(0, ck)}) rotate(${(1 - Math.min(1, Math.max(0, ck))) * 40})`}>
            <circle r={coinR + 6} fill={INK} transform="translate(0 12)" />
            <path d={softStar(0, 0, coinR + 8, coinR - 6, 24, 0)} fill={C.goldSh} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            <circle r={coinR - 14} fill={C.gold} stroke={INK} strokeWidth={7} />
            <g clipPath="url(#coinclip)">
              <circle r={coinR - 14} cx={10} cy={14} fill={C.goldSh} opacity={0.5} />
              <circle r={coinR - 14} fill={C.gold} transform="translate(-8 -10)" />
              <rect x={-30} y={-200} width={36} height={400} fill="#FFFFFF" opacity={0.55} transform={`rotate(25) translate(${-180 + shine * 360} 0)`} />
            </g>
            <circle r={coinR - 30} fill="none" stroke={C.goldSh} strokeWidth={5} strokeDasharray="2 14" strokeLinecap="round" />
            <text y={unit ? -2 : 8} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={pts.length > 3 ? 70 : unit ? 84 : 100} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
              {pts}
            </text>
            {unit ? (
              <text y={56} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={32} fill={C.ink} letterSpacing={3}>
                {unit}
              </text>
            ) : null}
          </g>
          {[0, 1, 2].map((i) => {
            const tt = clamp((ct - 16 - i * 7) / 16);
            if (tt <= 0 || tt >= 1) return null;
            const a = [-40, 200, 120][i] * (Math.PI / 180);
            const x = Math.cos(a) * (coinR + 30);
            const yy = Math.sin(a) * (coinR + 30);
            const s = Math.sin(Math.PI * tt);
            return <path key={i} d={softStar(x, yy, 30 * s, 7 * s, 4)} fill="#FFFFFF" stroke={INK} strokeWidth={4} transform={`rotate(${E.out(tt) * 45} ${x} ${yy})`} />;
          })}
        </svg>
      </div>
    </div>
  );
};
