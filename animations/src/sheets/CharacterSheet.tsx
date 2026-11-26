/* Character sheets: one per member, plus the whole crew in a line.
   Each sheet shows the full body, a head turnaround, six expressions, the four Home poses, the palette and the
   features that make him him. Same body and toga for everyone (src/hero/Hero.tsx); the faces are src/hero/heads.tsx
   and the looks src/hero/looks.ts.

   Render them all into ../characters with: node scripts/render-characters.mjs */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Hero, pose, plant, rig, Pose, C } from '../hero/Hero';
import { LOOKS, FLEXANDER, Look } from '../hero/looks';
import { APP_POSES } from '../app/poses';

const TITLE = 'Luckiest Guy';
const BODY = "'Baloo 2', sans-serif"; // quoted: a family name with a number in it isn't valid bare
const INK = C.ink;

/** Who's who: the signature face and what to keep when drawing him. */
export const CREW: Record<string, { notes: string[]; signature: [string, Partial<Pose>] }> = {
  osim: {
    notes: ['Rectangular glasses, thin dark frames', 'Thin, short beard along the jaw', 'Short sides, messy top pushed up', 'Light olive skin, dark brown hair'],
    signature: ['HOAT MODE', { wink: 1, turn: 0.2, lookX: 0.3, mouthSkew: 0.5, brow: 0.5 }],
  },
  phil: {
    notes: ['Middle part, curtain bangs that flick out', 'Thick black hair, flared over the ears', 'Narrow eyes that close when he smiles', 'Clean-shaven, wide smile'],
    signature: ['PHIL HAS SPOKEN', { eyes: 1, smile: 1.2, mouthOpen: 0.35, brow: 0.4 }],
  },
  dylan: {
    notes: ['Messy light-brown hair, lighter ends', 'The huge toothy grin', 'Slim, long face, blue-grey eyes', 'Clean-shaven'],
    signature: ['LA4', { smile: 1.4, mouthOpen: 0.15, lid: 0.25, brow: 0.6, turn: -0.15 }],
  },
  connor: {
    notes: ['Dark brown quiff, short sides', 'Long face, strong jaw', 'Big easy smile', 'Hair goes blue for the inside joke'],
    signature: ['BLUE HAIR', { hairBlue: 1, smile: 1.2, mouthOpen: 0.4, brow: 0.6 }],
  },
  gaurav: {
    notes: ['Messy black hair over the forehead', 'Trimmed beard, skin shows through', 'Heavy-lidded, unimpressed eyes', 'Deadpan mouth'],
    signature: ['UNIMPRESSED', { lid: 0.2, lookX: 0.5, smile: 0.1, mouthSkew: -0.4, browTilt: 0.2 }],
  },
  dean: {
    notes: ['Short scruffy brown hair', 'One eyebrow up, crooked smirk', 'Freckles, blue-grey eyes', 'Clean-shaven'],
    signature: ['SAYS WHO?', { mouthOpen: 0.32, mouthSkew: 0.9, smile: 0.2, brow: 0.3, turn: 0.15, lookX: 0.2 }],
  },
  amaan: {
    notes: ['Black curls piled on top, short sides', 'Trimmed beard, skin shows through', 'Thick brows, long face', 'Calm, closed-lip smile'],
    signature: ['FIGHT NIGHT', { mouthMode: 'grit', browTilt: -1, lid: 0.15, brow: -0.2 }],
  },
  jake: {
    notes: ['Red hair, combed up and over', 'Blue eyes, freckles, rosy cheeks', 'Wide grin', 'Clean-shaven'],
    signature: ['RADIATOR NAP', { eyes: 1, mouthMode: 'o', mouthOpen: 0.15, head: 8, blush: 0.6 }],
  },
  ayaad: {
    notes: ['Long, wavy black hair, middle part', 'Flows over his ears and flicks out', 'Thin moustache, light stubble', 'Slim face, easy smile'],
    signature: ['THE IRON', { mouthMode: 'grit', sweat: 1, browTilt: 1, brow: 0.4 }],
  },
};

const EXPRESSIONS: [string, Partial<Pose>][] = [
  ['RESTING', {}],
  ['HYPED', { mouthOpen: 1, eyes: 1, brow: 0.7 }],
  ['SMUG', { turn: 0.3, lookX: 0.6, lid: 0.3, mouthSkew: 0.8, smile: 0.7, brow: 0.3, browTilt: -0.3 }],
  ['WHOA', { mouthMode: 'o', mouthOpen: 0.6, brow: 1, pupil: 0.75 }],
  ['STRAIN', { mouthMode: 'grit', lid: 0.3, browTilt: -1, sweat: 1, brow: -0.3, red: 0.4 }],
];

/** The Home poses: the app's mascot poses (src/app/poses.ts). */
export const HOME_POSES = APP_POSES;

const card = (x: number, y: number, w: number, h: number, fill = '#FFFFFF', r = 34) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={INK} strokeWidth={6} />
);
const label = (x: number, y: number, text: string, size = 30, anchor: 'start' | 'middle' = 'middle', fill = INK) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={TITLE} fontSize={size} fill={fill} letterSpacing={1}>{text}</text>
);

/** A head in a card: the hero placed so his head sits in the middle of the box. */
const HeadCard: React.FC<{ look: Look; p: Partial<Pose>; x: number; y: number; w: number; h: number; scale: number; bg: string; name: string; id: string }> = ({ look, p, x, y, w, h, scale, bg, name, id }) => {
  const q = pose(p);
  const top = rig(q).headTop()[1];
  const hairTop = top - 70; // hair rises above the skull
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={w} height={h} rx={30} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={30} fill={bg} />
      <g clipPath={`url(#${id})`}>
        <Hero look={look} p={q} x={x + w / 2} y={y + 26 - hairTop * scale} scale={scale} shadow={false} />
      </g>
      <rect x={x} y={y} width={w} height={h} rx={30} fill="none" stroke={INK} strokeWidth={6} />
      <rect x={x + w / 2 - 110} y={y + h - 26} width={220} height={46} rx={23} fill={INK} />
      {label(x + w / 2, y + h + 8, name, 26, 'middle', '#FFFFFF')}
    </g>
  );
};

const Swatch: React.FC<{ x: number; y: number; color: string; name: string }> = ({ x, y, color, name }) => (
  <g>
    <circle cx={x} cy={y} r={30} fill={color} stroke={INK} strokeWidth={5} />
    <text x={x + 46} y={y - 2} fontFamily={BODY} fontWeight={800} fontSize={24} fill={INK}>{name}</text>
    <text x={x + 46} y={y + 24} fontFamily={BODY} fontWeight={700} fontSize={20} fill="#7A6A80">{color.toUpperCase()}</text>
  </g>
);

export const CharacterSheet: React.FC<{ id: string }> = ({ id }) => {
  const look = LOOKS[id] ?? FLEXANDER;
  const crew = CREW[id] ?? { notes: [], signature: ['GRIN', {}] as [string, Partial<Pose>] };
  const W = 2400;
  const H = 1500;
  const tint = '#E9F4FD';
  const swatches: [string, string][] = [
    ['Skin', look.skin.skin], ['Shadow', look.skin.sh], ['Hair', look.hair.hair], ['Shine', look.hair.mid],
    ...(look.beard ? [['Beard', look.beard.color] as [string, string]] : []),
    ['Eyes', look.eye.iris],
    ...(look.glasses ? [['Glasses', look.glasses.frame] as [string, string]] : []),
    ['App colour', look.tag],
  ];
  const exprs: [string, Partial<Pose>][] = [...EXPRESSIONS, crew.signature];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #C7E7FB 0%, #EAF5FD 52%, #FFFFFF 100%)' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        {/* header */}
        <text x={70} y={150} fontFamily={TITLE} fontSize={124} fill="#FFFFFF" stroke={INK} strokeWidth={22} paintOrder="stroke" strokeLinejoin="round" letterSpacing={3}>
          {look.name.toUpperCase()}
        </text>
        {label(76, 200, 'WINTER ARC · CHARACTER SHEET', 34, 'start')}
        <rect x={W - 470} y={70} width={400} height={84} rx={42} fill={look.tag} stroke={INK} strokeWidth={6} />
        {label(W - 270, 128, `@${id}`, 40, 'middle', '#FFFFFF')}

        {/* full body */}
        {card(40, 240, 700, 1220)}
        <ellipse cx={390} cy={1356} rx={190} ry={26} fill="#000" opacity={0.08} />
        <Hero look={look} p={plant(pose({}))} x={390} y={1352} scale={1.0} shadow={false} />
        {label(390, 1432, 'FULL BODY · SAME FOR EVERYONE', 28)}

        {/* turnaround */}
        {label(790, 278, 'TURNAROUND', 34, 'start')}
        {([['3/4 LEFT', { turn: -0.55, lookX: -0.5 }], ['FRONT', {}], ['3/4 RIGHT', { turn: 0.55, lookX: 0.5 }]] as [string, Partial<Pose>][]).map(([n, p], i) => (
          <HeadCard key={n} id={`t${i}`} look={look} p={p} x={790 + i * 380} y={300} w={350} h={420} scale={0.82} bg={tint} name={n} />
        ))}

        {/* palette */}
        {card(1940, 300, 420, 420)}
        {label(1964, 278, 'PALETTE', 34, 'start')}
        {swatches.slice(0, 8).map(([n, c], i) => (
          <Swatch key={n} x={1986 + (i % 2) * 196} y={354 + Math.floor(i / 2) * 92} color={c} name={n} />
        ))}

        {/* expressions */}
        {label(790, 800, 'EXPRESSIONS', 34, 'start')}
        {exprs.map(([n, p], i) => (
          <HeadCard key={n} id={`e${i}`} look={look} p={p} x={790 + i * 262} y={822} w={242} h={290} scale={0.56} bg={i === 5 ? '#FFF0C7' : '#FFFFFF'} name={n} />
        ))}

        {/* home poses */}
        {label(790, 1196, 'ON HIS HOME SCREEN', 34, 'start')}
        {card(790, 1218, 980, 242, '#FFFFFF')}
        {(['wave', 'flex', 'point', 'thumbs'] as const).map((k, i) => (
          <g key={k}>
            <Hero look={look} p={plant(pose(HOME_POSES[k]))} x={910 + i * 245} y={1442} scale={0.2} shadow={false} />
          </g>
        ))}

        {/* key features */}
        {label(1800, 1196, 'KEEP IT HIM', 34, 'start')}
        {card(1800, 1218, 560, 242)}
        {crew.notes.map((n, i) => (
          <g key={n}>
            <circle cx={1834} cy={1262 + i * 52} r={8} fill={look.tag} stroke={INK} strokeWidth={3} />
            <text x={1854} y={1271 + i * 52} fontFamily={BODY} fontWeight={800} fontSize={26} fill={INK}>{n}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Everyone side by side, in the same pose. */
export const CrewLineup: React.FC = () => {
  const ids = Object.keys(LOOKS);
  const W = 2400;
  const H = 1100;
  const step = W / ids.length;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #C7E7FB 0%, #EAF5FD 60%, #FFFFFF 100%)' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <text x={W / 2} y={120} textAnchor="middle" fontFamily={TITLE} fontSize={96} fill="#FFFFFF" stroke={INK} strokeWidth={18} paintOrder="stroke" strokeLinejoin="round" letterSpacing={3}>THE WINTER ARC CREW</text>
        <ellipse cx={W / 2} cy={960} rx={W / 2 - 40} ry={30} fill="#000" opacity={0.06} />
        {ids.map((id, i) => {
          const x = step * (i + 0.5);
          const p = plant(pose({ turn: (i - (ids.length - 1) / 2) * -0.04, lookX: (i - (ids.length - 1) / 2) * -0.06 }));
          return (
            <g key={id}>
              <Hero look={LOOKS[id]} p={p} x={x} y={955} scale={0.62} shadow />
              <rect x={x - 104} y={985} width={208} height={64} rx={32} fill={LOOKS[id].tag} stroke={INK} strokeWidth={5} />
              <text x={x} y={1030} textAnchor="middle" fontFamily={TITLE} fontSize={40} fill="#FFFFFF" letterSpacing={1}>{LOOKS[id].name.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
