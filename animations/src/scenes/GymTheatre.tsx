import React from 'react';
import { Img, staticFile } from 'remotion';
import { Cam, camP, TOP, FULL_H } from '../fx/Stage';
import { SFX_FONT } from '../fonts';
import { E, lerp, seg } from '../lib/anim';
import { rng } from '../lib/shape';
import { C } from '../hero/Hero';

type Theme = 'beast' | 'atlas' | 'mirror';
type Shake = {x: number; y: number; r: number};

const colors = {
  beast: { enamel: '#682E23', dark: '#311A22', foil: '#FFC77C', gleam: '#FFEDD0' },
  atlas: { enamel: '#244860', dark: '#101D36', foil: '#ECD08D', gleam: '#E9FAFE' },
  mirror: { enamel: '#734056', dark: '#391F34', foil: '#EEBA92', gleam: '#FFF2E3' },
};

const seeded = rng(789);
const dust = Array.from({length: 34}, () => ({
  x: seeded() * 1340 - 130, y: seeded() * 2020 - 160, phase: seeded() * 6.28,
  radius: 1.2 + seeded() * 2.1, speed: 0.35 + seeded() * 0.7,
}));

// Keep the model sheet's ink, highlights and contours. Give its existing
// painted surfaces the key light and reflected color of each new location.
const reflectedLight = {
  beast: { skin: '#C47351', hair: '#42272D', linen: '#CFB8B5', metal: '#A06236' },
  atlas: { skin: '#BB8190', hair: '#322D47', linen: '#B3BED8', metal: '#9C8388' },
  mirror: { skin: '#C37D78', hair: '#482D3B', linen: '#D9BFCE', metal: '#B6786E' },
};

function CharacterPaint({theme}: {theme: Theme}) {
  const light = reflectedLight[theme];
  const materials = [
    ['skin', [C.skin, C.skinLimb, C.skinFace], '#FFDCAD', '#FBB581', light.skin],
    ['shade', [C.skinSh], '#E7A074', '#D38664', light.skin],
    ['hair', [C.hair], '#805246', '#593638', light.hair],
    ['linen', [C.cloth], '#FFFEED', '#FFF3E1', light.linen],
    ['border', [C.violet], '#AF8EEC', '#7958CB', '#4C387B'],
    ['gold', [C.gold], '#FFF3B8', '#E9B456', light.metal],
    ['leather', [C.sandal], '#C18C64', '#A87051', '#704736'],
  ] as const;
  const prefix = 'gym-paint-' + theme + '-';
  return <defs>
    <style>{materials.map(([name, fills]) => fills.map(fill =>
      `.gym-actor [fill="${fill}" i]{fill:url(#${prefix}${name})}`
    ).join('\n')).join('\n')}</style>
    {materials.map(([name, , highlight, base, shade]) => (
      <radialGradient key={name} id={prefix + name} cx=".34" cy=".3" r=".82">
        <stop stopColor={highlight} /><stop offset=".54" stopColor={base} /><stop offset="1" stopColor={shade} />
      </radialGradient>
    ))}
  </defs>;
}

/** The backplate has overscan so a camera recoil never uncovers its edges. */
export const GymTheatre: React.FC<{theme: Theme; f: number; cam: Cam; sh?: Shake}> = ({theme, f, cam, sh}) => (
  <g>
    <CharacterPaint theme={theme} />
    <rect x={-2000} y={-2000} width={5000} height={6100} fill={colors[theme].dark} />
    <g transform={camP(cam, 0.44, sh ? { x: sh.x * 0.2, y: sh.y * 0.2, r: sh.r * 0.16 } : undefined)}>
      <foreignObject x={-150} y={TOP - 165} width={1380} height={FULL_H + 330}>
        <Img src={staticFile(`gym/${theme}.webp`)} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
      </foreignObject>
      {theme !== 'mirror' && <g fill={theme === 'beast' ? '#FFF0CF' : '#D7F8FF'}>
        {dust.map((p, i) => {
          const phase = p.phase + f * 0.037 * p.speed;
          if (theme === 'atlas' && p.y > 1020) return null;
          return <circle key={i}
            cx={p.x + (theme === 'beast' ? f * p.speed * 0.36 + Math.sin(phase) * 8 : 0)}
            cy={p.y - (theme === 'beast' ? f * p.speed * 0.31 : 0)}
            r={p.radius} opacity={(theme === 'beast' ? 0.24 : 0.36) + Math.sin(phase) * 0.19} />;
        })}
      </g>}
    </g>
  </g>
);

/** Enamel and brass victory plaque, with a separate readable point award. */
export const GymVictory: React.FC<{theme: Theme; title: string; f: number; start: number}> = ({theme, title, f, start}) => {
  const t = f - start;
  if (t < 0) return null;
  const c = colors[theme];
  const enter = E.out(seg(t, 0, 11));
  const score = E.out(seg(t, 5, 15));
  const sheen = seg(t, 10, 31);
  const id = 'victory-' + theme;
  const perimeter = 'M-420 0 H-332 L-317 -17 H-73 L-55 -28 H55 L73 -17 H317 L332 0 H420 L397 32 L414 63 H336 L314 87 H-314 L-336 63 H-414 L-397 32 Z';
  return <svg width={1080} height={300} viewBox="0 0 1080 300" style={{ position: 'absolute', top: -60, overflow: 'visible' }}>
    <defs>
      <linearGradient id={id + '-foil'} x2="0.82" y2="1">
        <stop stopColor="#AA6E45" /><stop offset=".23" stopColor={c.foil} /><stop offset=".45" stopColor="#FFEDD0" />
        <stop offset=".61" stopColor="#B97A49" /><stop offset=".77" stopColor={c.foil} /><stop offset="1" stopColor="#976439" />
      </linearGradient>
      <linearGradient id={id + '-enamel'} x2=".22" y2="1">
        <stop stopColor={c.enamel} /><stop offset="1" stopColor={c.dark} />
      </linearGradient>
      <clipPath id={id + '-clip'}><path d={perimeter} /></clipPath>
    </defs>
    <g transform={`translate(540 ${80 + (1 - enter) * 39}) scale(${lerp(.88, 1, enter)})`} opacity={seg(t, 0, 5)}>
      <path d={perimeter} transform="translate(0 8)" fill={c.dark} stroke={c.dark} strokeWidth={8} />
      <path d={perimeter} fill={`url(#${id}-enamel)`} stroke={`url(#${id}-foil)`} strokeWidth={6} />
      <path d="M-308 -8 H-72 L-53 -19 H53 L72 -8 H308 M-309 76 H309" fill="none" stroke={c.foil} strokeWidth={1.8} opacity={.85} />
      {[-1, 1].map(side => <g key={side} transform={`scale(${side} 1)`} fill="none" stroke={c.foil}>
        <path d="M329 14 H393 M342 25 H379 M354 36 H367 M345 46 L352 53 L359 46 L352 39 Z" strokeWidth={3} />
      </g>)}
      {sheen > 0 && sheen < 1 && <g clipPath={`url(#${id}-clip)`}>
        <path d="M-40 -60 H30 L-48 140 H-118 Z" fill={c.gleam} opacity={0.08} transform={`translate(${lerp(-460, 540, sheen)} 0)`} />
      </g>}
      <text x={0} y={63} textAnchor="middle" fontFamily={SFX_FONT} fontSize={title === 'MIRROR CHECK' ? 86 : 98}
        letterSpacing={4.4} fill={c.gleam} stroke={c.dark} strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">{title}</text>
      <g transform={`translate(0 ${81 + (1 - score) * -10})`} opacity={score}>
        <path d="M-122 -2 H122 L135 16 L113 45 H-113 L-135 16 Z" fill={`url(#${id}-foil)`} stroke={c.dark} strokeWidth={4} />
        <path d="M-114 3 H114 M-107 38 H107" stroke={c.dark} strokeWidth={1.6} opacity={.65} />
        <text y={31} textAnchor="middle" fontFamily={SFX_FONT} letterSpacing={3} fontSize={34} fill={c.dark}>+1.5 PTS</text>
      </g>
    </g>
  </svg>;
};
