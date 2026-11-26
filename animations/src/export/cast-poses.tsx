/* The poses Flexander strikes in the HyperFrames clips. Each one is a still: the clips move
   whole pieces (slide, hop, shake, pop, squash) and swap poses, rather than animating limbs.
   members: the member colours this pose is also exported in (see MEMBERS in cast.tsx).
   plant: true puts the lowest sole on the ground line (walks and runs). */
import React from 'react';
import { Pose } from '../hero/Hero';

export type Look = {
  id: string;
  p: Partial<Pose>;
  members?: string[];
  plant?: boolean;
  itemL?: React.ReactNode;
  itemR?: React.ReactNode;
  itemBehindL?: boolean;
  itemBehindR?: boolean;
  headExtra?: React.ReactNode;
  behind?: React.ReactNode;
  front?: React.ReactNode;
  back?: React.ReactNode;
  over?: React.ReactNode;
  shadow?: boolean;
};

const INK = '#341720';

/* Copies of a few scene pieces (the scene kits pull in Remotion, which this Node export can't load). */
/** Run-cycle pose, as gait() in src/scenes/RunKit.tsx. turbo 0..1 = all-out sprint face/lean. */
const gait = (ph: number, turbo: number): Partial<Pose> => {
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
/** The phone in a fist, as HandPhone in src/scenes/jokekit.tsx. */
const HandPhone: React.FC<{ glow?: number }> = ({ glow = 0 }) => (
  <g transform="translate(0 70)">
    <rect x={-56} y={-90} width={112} height={200} rx={22} fill={INK} transform="translate(5 7)" opacity={0.35} />
    <rect x={-56} y={-90} width={112} height={200} rx={22} fill="#2B2340" stroke={INK} strokeWidth={7} />
    <rect x={-44} y={-76} width={88} height={168} rx={12} fill={glow > 0 ? '#BCD3FF' : '#3B3456'} />
    <rect x={-44} y={-76} width={88} height={168} rx={12} fill="#FFFFFF" opacity={glow * 0.6} />
    <rect x={-20} y={-84} width={40} height={6} rx={3} fill="#15111F" />
  </g>
);
/** The cap emoji as a drawing, as Cap in src/scenes/jokekit.tsx. */
const Cap: React.FC = () => (
  <g>
    <path d="M-120 20 C-130 -70 -60 -120 10 -118 C90 -116 130 -60 120 20 Z" fill={INK} transform="translate(6 10)" />
    <path d="M40 4 C100 -6 190 0 210 30 C190 52 110 50 30 40 Z" fill="#1F47C2" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M60 14 C110 8 170 14 190 30" fill="none" stroke="#5E9BFF" strokeWidth={7} strokeLinecap="round" />
    <path d="M-120 20 C-130 -70 -60 -120 10 -118 C90 -116 130 -60 120 20 Z" fill="#2F66E6" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M-4 -116 C-20 -70 -24 -20 -20 18" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <path d="M-70 -84 C-80 -50 -84 -20 -84 16" fill="none" stroke="#1F47C2" strokeWidth={6} strokeLinecap="round" />
    <path d="M-90 -50 C-70 -96 -20 -110 20 -104" fill="none" stroke="#9FC2FF" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
    <ellipse cx={4} cy={-118} rx={18} ry={9} fill="#1F47C2" stroke={INK} strokeWidth={6} />
    <path d="M-124 18 L124 18" stroke={INK} strokeWidth={9} strokeLinecap="round" />
  </g>
);

/* ------------------------------------------------------------ props (drawn in wrist space: the fist is near 0,70) */
/** A dinner fork gripped across the fist like a barbell. */
export const Fork: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <g transform={`translate(0 72) scale(${flip ? -1 : 1} 1)`}>
    <path d="M-70 -9 L120 -11 Q134 -12 140 -20 L148 -20 L150 20 L142 20 Q134 12 120 11 L-70 9 Q-82 0 -70 -9 Z" fill="#D9DFEA" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M146 -26 L232 -26 M146 -9 L232 -9 M146 9 L232 9 M146 26 L232 26" stroke={INK} strokeWidth={17} strokeLinecap="round" />
    <path d="M146 -26 L232 -26 M146 -9 L232 -9 M146 9 L232 9 M146 26 L232 26" stroke="#D9DFEA" strokeWidth={7} strokeLinecap="round" />
    <path d="M138 -30 Q152 -34 160 -26 L160 26 Q152 34 138 30 Z" fill="#D9DFEA" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-56 -3 L110 -5" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
  </g>
);

/** A giant burger held in front of the fist. */
export const Burger: React.FC<{ rot?: number; s?: number }> = ({ rot = 0, s = 1 }) => (
  <g transform={`translate(0 60) rotate(${rot}) scale(${s})`}>
    <path d="M-150 -6 Q-150 -128 0 -132 Q150 -128 150 -6 Z" fill="#E7A24B" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    {[[-80, -80], [-30, -104], [30, -96], [84, -70], [0, -60], [-60, -44]].map(([x, y], i) => (
      <ellipse key={i} cx={x} cy={y} rx={9} ry={5} fill="#FFF3D1" transform={`rotate(${i * 30} ${x} ${y})`} />
    ))}
    <path d="M-110 -104 Q-60 -124 -10 -122" stroke="#FFD08A" strokeWidth={12} fill="none" strokeLinecap="round" />
    <path d="M-166 4 Q-120 30 -80 6 Q-40 32 0 6 Q40 32 80 6 Q120 30 166 4 L160 -10 L-160 -10 Z" fill="#7BC24A" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-150 14 L150 14 L140 34 L-140 34 Z" fill="#F2C230" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-158} y={30} width={316} height={46} rx={22} fill="#7A3B22" stroke={INK} strokeWidth={8} />
    <path d="M-150 76 Q-150 120 -100 122 L100 122 Q150 120 150 76 Z" fill="#E09A45" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
  </g>
);

/** A hard-shell suitcase carried by its handle. */
export const Suitcase: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <g transform="translate(0 70)">
    <path d="M-34 -10 L-34 -34 Q-34 -46 -22 -46 L22 -46 Q34 -46 34 -34 L34 -10" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
    <rect x={-120} y={-12} width={240} height={250} rx={26} fill="#2FA3C8" stroke={INK} strokeWidth={9} />
    <path d="M-60 0 L-60 226 M0 0 L0 226 M60 0 L60 226" stroke="#1E7896" strokeWidth={10} />
    <rect x={-120} y={-12} width={240} height={250} rx={26} fill="none" stroke={INK} strokeWidth={9} />
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <rect x={-70} y={90} width={140} height={60} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={6} transform="rotate(-6)" />
      <text x={0} y={132} textAnchor="middle" fontFamily="Luckiest Guy" fontSize={40} fill="#E05A47" transform="rotate(-6)">GYM</text>
    </g>
  </g>
);

/** A duffel bag marked PTS, carried by its straps. */
export const Duffel: React.FC<{ color?: string; flip?: boolean }> = ({ color = '#2B2236', flip }) => (
  <g transform="translate(0 70) scale(0.85)">
    <path d="M-50 10 Q0 -60 50 10" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" />
    <path d="M-150 30 Q-150 0 -110 0 L110 0 Q150 0 150 30 L150 150 Q150 186 110 186 L-110 186 Q-150 186 -150 150 Z" fill={color} stroke={INK} strokeWidth={9} />
    <path d="M-140 40 L140 40" stroke="#4A3D5C" strokeWidth={8} />
    <ellipse cx={-150} cy={94} rx={22} ry={60} fill="#3A2E4A" stroke={INK} strokeWidth={7} />
    <ellipse cx={150} cy={94} rx={22} ry={60} fill="#3A2E4A" stroke={INK} strokeWidth={7} />
    <text x={0} y={146} textAnchor="middle" fontFamily="Luckiest Guy" fontSize={78} fill="#FFD064" stroke={INK} strokeWidth={10} paintOrder="stroke" transform={flip ? 'scale(-1 1)' : undefined}>PTS</text>
  </g>
);


/* ------------------------------------------------------------ round 3 props (wrist space: the fist is near 0,70) */
/** One french fry held up out of the fist. */
export const Fry: React.FC<{ a?: number }> = ({ a = -108 }) => (
  <g transform={`translate(0 70) rotate(${a})`}>
    <rect x={-11} y={-10} width={22} height={170} rx={6} fill="#F7C94B" stroke={INK} strokeWidth={7} />
    <rect x={-4} y={4} width={6} height={140} rx={3} fill="#FFE9A3" />
  </g>
);
/** A soda cup with a lid and a straw, held upright in the fist when the arm is up. */
export const Cup: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <g transform={`translate(0 70) rotate(180) scale(${flip ? -1 : 1} 1)`}>
    <path d="M-52 -60 L52 -60 L42 110 Q40 124 26 124 L-26 124 Q-40 124 -42 110 Z" fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" transform="scale(1 -1) translate(0 -64)" />
    <path d="M-48 -10 L48 -10 L44 40 L-44 40 Z" fill="#E2384D" transform="scale(1 -1) translate(0 -64)" />
    <rect x={-60} y={-130} width={120} height={22} rx={10} fill="#E9E4F2" stroke={INK} strokeWidth={7} />
    <path d="M10 -130 L28 -200 L60 -206" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 -130 L28 -200 L60 -206" fill="none" stroke="#FFD064" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
/** The 24-hour spot's paper fries bag, hanging from the fist by its folded top. */
export const FriesBag: React.FC = () => (
  <g transform="translate(0 64)">
    <path d="M-72 20 L72 20 L84 230 Q84 244 70 244 L-70 244 Q-84 244 -84 230 Z" fill="#F4E3C3" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M-64 0 L64 0 L72 30 L-72 30 Z" fill="#E7CFA1" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-30 -6 L-20 -40 M0 -6 L4 -46 M28 -6 L22 -38" stroke={INK} strokeWidth={14} strokeLinecap="round" />
    <path d="M-30 -6 L-20 -40 M0 -6 L4 -46 M28 -6 L22 -38" stroke="#F7C94B" strokeWidth={6} strokeLinecap="round" />
    <circle cx={0} cy={140} r={46} fill="#E2384D" stroke={INK} strokeWidth={7} />
    <text x={0} y={156} textAnchor="middle" fontFamily="Luckiest Guy" fontSize={44} fill="#FFFFFF">24</text>
  </g>
);
/** A fork with a broccoli floret on it, pointing up out of the fist. */
export const BrocFork: React.FC<{ a?: number }> = ({ a = -116 }) => (
  <g transform={`translate(0 70) rotate(${a})`}>
    <rect x={-7} y={-10} width={14} height={120} rx={6} fill="#D9DFEA" stroke={INK} strokeWidth={6} />
    <path d="M-16 108 L-16 140 M0 108 L0 146 M16 108 L16 140" stroke={INK} strokeWidth={12} strokeLinecap="round" />
    <path d="M-16 108 L-16 140 M0 108 L0 146 M16 108 L16 140" stroke="#D9DFEA" strokeWidth={5} strokeLinecap="round" />
    <rect x={-8} y={136} width={16} height={34} rx={6} fill="#8FC85A" stroke={INK} strokeWidth={6} />
    <g stroke={INK} strokeWidth={6} fill="#4E9A3A">
      <circle cx={-22} cy={184} r={22} /><circle cx={20} cy={184} r={22} /><circle cx={0} cy={200} r={24} /><circle cx={-6} cy={176} r={18} />
    </g>
    <circle cx={-12} cy={196} r={7} fill="#7CC05A" />
  </g>
);
/** A beer mug, foam up, held up in the fist. */
export const BeerMug: React.FC = () => (
  <g transform="translate(0 70) rotate(180)">
    <path d="M58 -10 Q118 -14 116 50 Q114 110 58 104" fill="none" stroke={INK} strokeWidth={34} strokeLinecap="round" />
    <path d="M58 -10 Q118 -14 116 50 Q114 110 58 104" fill="none" stroke="#F3EEFE" strokeWidth={20} strokeLinecap="round" />
    <rect x={-66} y={-40} width={132} height={190} rx={20} fill="#FFB359" stroke={INK} strokeWidth={9} />
    <rect x={30} y={-30} width={22} height={170} rx={8} fill="#EA9332" />
    <rect x={-50} y={-24} width={16} height={150} rx={8} fill="#FFFFFF" opacity={0.6} />
    <path d="M-76 -40 Q-80 -86 -40 -82 Q-20 -112 12 -94 Q44 -112 64 -84 Q92 -86 82 -40 Z" fill="#FFFFFF" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <circle cx={-30} cy={30} r={6} fill="#FFFFFF" opacity={0.8} /><circle cx={6} cy={80} r={5} fill="#FFFFFF" opacity={0.8} />
  </g>
);
/** The cuff from The Radiator (scenes/JokeRadiator.tsx). */
export const Cuff: React.FC = () => (
  <g transform="translate(0 6)">
    <ellipse cx={0} cy={0} rx={44} ry={20} fill="none" stroke={INK} strokeWidth={16} />
    <ellipse cx={0} cy={0} rx={44} ry={20} fill="none" stroke="#B9B3CC" strokeWidth={7} />
  </g>
);
/** Mission-control headset (head space: eyes at y -176, x ±39, mouth near 0,-60). */
export const Headset: React.FC = () => (
  <g>
    <path d="M-150 -170 Q-160 -352 0 -356 Q160 -352 150 -170" fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
    <path d="M-150 -170 Q-160 -352 0 -356 Q160 -352 150 -170" fill="none" stroke="#3A3650" strokeWidth={10} strokeLinecap="round" />
    <rect x={-182} y={-214} width={52} height={92} rx={22} fill="#3A3650" stroke={INK} strokeWidth={8} />
    <rect x={130} y={-214} width={52} height={92} rx={22} fill="#3A3650" stroke={INK} strokeWidth={8} />
    <path d="M-150 -140 Q-150 -66 -56 -56" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
    <path d="M-150 -140 Q-150 -66 -56 -56" fill="none" stroke="#5B5675" strokeWidth={5} strokeLinecap="round" />
    <rect x={-66} y={-70} width={34} height={26} rx={12} fill="#2B2236" stroke={INK} strokeWidth={6} />
  </g>
);

/* ------------------------------------------------------------ head extras (head space: eyes at y -176, x ±39) */
/** A fry hanging out of the corner of the mouth. */
export const MouthFry: React.FC = () => (
  <g transform="translate(-34 -58) rotate(58)">
    <rect x={-10} y={-6} width={20} height={126} rx={6} fill="#F7C94B" stroke={INK} strokeWidth={7} />
    <rect x={-3} y={8} width={6} height={96} rx={3} fill="#FFE9A3" />
  </g>
);
export const Shades: React.FC = () => (
  <g>
    <path d="M-128 -200 L128 -200" stroke={INK} strokeWidth={12} strokeLinecap="round" />
    <path d="M-120 -204 L-16 -204 L-22 -150 Q-30 -132 -60 -132 L-88 -132 Q-116 -132 -118 -160 Z" fill="#1B1726" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M120 -204 L16 -204 L22 -150 Q30 -132 60 -132 L88 -132 Q116 -132 118 -160 Z" fill="#1B1726" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M-100 -190 L-70 -160 M44 -190 L70 -166" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" opacity={0.6} />
  </g>
);

/* ------------------------------------------------------------ faces */
const STRAIN: Partial<Pose> = {
  red: 1, mouthMode: 'grit', mouthOpen: 0.75, smile: 0.2, brow: 1.6, browTilt: -0.9, lid: 0.72, sweat: 1, pupil: 0.8,
};
const JOY: Partial<Pose> = { eyes: 1, mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1, browTilt: 0.2, red: 0.25, blush: 0.6 };
const SCARED: Partial<Pose> = { eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 1, smile: 0, brow: 1.9, browTilt: 1.2, pupil: 0.4, sweat: 1 };
const NERVOUS: Partial<Pose> = { eyes: 0, lid: 0.1, mouthMode: 'grit', mouthOpen: 0.35, smile: 0.1, brow: 1.3, browTilt: 1.1, pupil: 0.6, sweat: 1, lookX: 0.7 };
const SMUG: Partial<Pose> = { eyes: 0, lid: 0.45, mouthMode: 'grin', mouthOpen: 0.25, smile: 1, brow: 0.6, browTilt: -0.5, mouthSkew: 0.3 };
const BLISS: Partial<Pose> = { eyes: 1, mouthMode: 'grin', mouthOpen: 0.15, smile: 1, blush: 0.9, brow: 0.8, browTilt: 0.4 };
const DAZED: Partial<Pose> = { eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.5, smile: 0, brow: 0.6, browTilt: 0.6 };
const CONFUSED: Partial<Pose> = { eyes: 0, lid: 0.15, mouthMode: 'o', mouthOpen: 0.3, smile: 0.2, brow: 1.4, browTilt: 0.7, mouthSkew: 0.7, pupil: 0.8 };
const SAD: Partial<Pose> = { eyes: 0, lid: 0.35, mouthMode: 'o', mouthOpen: 0.25, smile: 0, brow: 1.2, browTilt: 1.3, lookY: 0.4, pupil: 0.9 };

/* ------------------------------------------------------------ bodies */
const SIT: Partial<Pose> = { hipL: 26, thL: 0.42, knL: -26, hipR: 26, thR: 0.42, knR: -26, ftL: 4, ftR: 4 };
const walk = (ph: number, extra: Partial<Pose> = {}): Partial<Pose> => {
  const g = gait(ph, 0);
  // a walk is a gentler run: smaller arm swing, no sprint lean
  return { ...g, elL: (g.elL ?? 0) * 0.45, elR: (g.elR ?? 0) * 0.45, mouthOpen: 0.4, ...extra };
};
const run = (ph: number, extra: Partial<Pose> = {}): Partial<Pose> => ({ ...gait(ph, 1), ...extra });
const HANDS_UP: Partial<Pose> = { shL: 158, elL: -14, shR: 158, elR: -14, handL: 'open', handR: 'open', shrugL: 18, shrugR: 18 };
const BY_FACE: Partial<Pose> = { shL: 52, elL: 128, shR: 52, elR: 128, handL: 'open', handR: 'open', shrugL: 16, shrugR: 16 };
const SHRUG: Partial<Pose> = { shL: 34, elL: 108, shR: 34, elR: 108, handL: 'open', handR: 'open', shrugL: 34, shrugR: 34, head: 7 };
const A = Math.PI / 2, B = (3 * Math.PI) / 2;
/** Every member's colourway, for poses The Monday Report shows each of them in. */
const CREW = ['osim', 'amaan', 'ayaad', 'connor', 'dean', 'dylan', 'gaurav', 'jake', 'phil'];

export const POSES: Look[] = [
  /* ---- Thanksgiving: the max-effort fork lift ---- */
  {
    id: 'tg-strain',
    p: { ...STRAIN, shL: 8, elL: -118, wrL: -10, handL: 'fist', shR: 8, elR: -118, wrR: 78, handR: 'fist', shrugL: 22, shrugR: 22, sy: 0.97, sx: 1.02, head: -3 },
    itemR: <Fork />,
  },
  {
    id: 'tg-mid',
    p: { ...STRAIN, mouthOpen: 0.95, lid: 0.9, shL: 6, elL: -126, handL: 'fist', shR: 34, elR: 150, wrR: -40, handR: 'fist', shrugL: 16, shrugR: 26, head: 5, torso: -2 },
    itemR: <Fork />,
  },
  {
    id: 'tg-press',
    p: { ...JOY, shL: 152, elL: 38, handL: 'fist', shR: 172, elR: -6, wrR: 0, handR: 'fist', sy: 1.03, sx: 0.98, sweat: 0.4 },
    itemR: <Fork />,
  },

  /* ---- shared standing poses ---- */
  { id: 'grin', p: { ...JOY, eyes: 0, mouthOpen: 0.8, shL: 20, elL: 30, shR: 20, elR: 30, handL: 'relax', handR: 'relax' }, members: CREW },
  { id: 'nervous', p: { ...NERVOUS, shL: 8, elL: -70, shR: 8, elR: -70, handL: 'fist', handR: 'fist', shrugL: 20, shrugR: 20 }, members: CREW },
  { id: 'scared', p: { ...SCARED, ...BY_FACE }, members: CREW },
  { id: 'handsup', p: { ...SCARED, mouthOpen: 0.8, ...HANDS_UP } },
  { id: 'shrug', p: { ...SMUG, lid: 0.2, ...SHRUG } },
  { id: 'smug', p: { ...SMUG, shL: 14, elL: -150, shR: 14, elR: -150, handL: 'relax', handR: 'relax' } },
  { id: 'annoyed', p: { eyes: 0, lid: 0.5, mouthMode: 'grit', mouthOpen: 0.2, smile: 0.1, brow: 1.4, browTilt: -0.8, red: 0.5, shL: 14, elL: -150, shR: 14, elR: -150, lookY: -0.6 }, members: ['dean', 'jake'] },
  { id: 'phone', p: { ...SMUG, lid: 0.3, lookY: 0.5, shR: 22, elR: -118, handR: 'grip', wrR: -10, handL: 'relax' }, itemR: <HandPhone glow={1} /> },
  { id: 'thumbs', p: { ...JOY, shR: 70, elR: 100, handR: 'thumb', handL: 'relax' }, members: CREW },

  /* ---- walks and runs (two frames each, alternated in the clip) ---- */
  { id: 'walk-a', p: walk(A, { turn: 0.45, lookX: 0.6 }), plant: true, members: ['dylan', 'connor', 'dean'] },
  { id: 'walk-b', p: walk(B, { turn: 0.45, lookX: 0.6 }), plant: true, members: ['dylan', 'connor', 'dean'] },
  { id: 'proud-a', p: walk(A, { ...JOY, eyes: 0, turn: 0.45, lookX: 0.6, mouthOpen: 0.7 }), plant: true },
  { id: 'proud-b', p: walk(B, { ...JOY, eyes: 0, turn: 0.45, lookX: 0.6, mouthOpen: 0.7 }), plant: true },
  { id: 'run-a', p: run(A, { turn: 0.5, lookX: 0.8 }), plant: true },
  { id: 'run-b', p: run(B, { turn: 0.5, lookX: 0.8 }), plant: true },
  { id: 'luggage-a', p: run(A, { ...STRAIN, red: 0.4, turn: 0.5, lookX: 0.8, shR: 30, elR: -10, handR: 'grip' }), plant: true, itemR: <Suitcase flip /> },
  { id: 'luggage-b', p: run(B, { ...STRAIN, red: 0.4, turn: 0.5, lookX: 0.8, shR: 30, elR: -10, handR: 'grip' }), plant: true, itemR: <Suitcase flip /> },
  { id: 'dive', p: { ...STRAIN, red: 0.3, mouthOpen: 1, shL: 176, elL: 0, shR: 150, elR: -10, handL: 'open', handR: 'grip', hipL: 2, hipR: 14, knL: 0, knR: -6, ftL: 30, ftR: 30, sy: 1.02 }, itemR: <Suitcase flip /> },
  { id: 'love-a', p: run(A, { eyeMode: 'heart', mouthMode: 'grin', mouthOpen: 1, smile: 1, blush: 1, turn: -0.5, lookX: -0.8 }), plant: true },
  { id: 'love-b', p: run(B, { eyeMode: 'heart', mouthMode: 'grin', mouthOpen: 1, smile: 1, blush: 1, turn: -0.5, lookX: -0.8 }), plant: true },

  /* ---- confused pointing (No Map) ---- */
  { id: 'point-l', p: { ...CONFUSED, lookX: -1, turn: -0.35, shL: 96, elL: 0, handL: 'point', shR: 150, elR: 128, handR: 'open', head: -6 }, members: ['dylan'] },
  { id: 'point-r', p: { ...CONFUSED, lookX: 1, turn: 0.35, shR: 96, elR: 0, handR: 'point', shL: 150, elL: 128, handL: 'open', head: 6 }, members: ['connor'] },

  /* ---- sneaking (Operation Basement) ---- */
  { id: 'stuck', p: { ...STRAIN, red: 0.7, shL: 74, elL: 66, shR: 74, elR: 66, handL: 'open', handR: 'open', shrugL: 30, shrugR: 30, head: 4 }, members: ['dean'] },
  {
    id: 'tiptoe-a',
    p: { eyes: 0, lid: 0.25, lookX: 1, turn: 0.4, mouthMode: 'grin', mouthOpen: 0.1, smile: 0.6, brow: 1, browTilt: -0.3, shL: 60, elL: -100, handL: 'relax', shR: 18, elR: -152, handR: 'point', hipL: 30, knL: -50, hipR: 4, knR: -10, ftL: 20, torso: 6 },
    plant: true, members: ['dean'],
  },
  {
    id: 'tiptoe-b',
    p: { eyes: 0, lid: 0.25, lookX: 1, turn: 0.4, mouthMode: 'grin', mouthOpen: 0.1, smile: 0.6, brow: 1, browTilt: -0.3, shL: 60, elL: -100, handL: 'relax', shR: 18, elR: -152, handR: 'point', hipL: 4, knL: -10, hipR: 30, knR: -50, ftR: 20, torso: 6 },
    plant: true, members: ['dean'],
  },

  /* ---- sitting (the burger stand, the couch) ---- */
  { id: 'bite', p: { ...SIT, ...BLISS, shL: 40, elL: -150, handL: 'grip', shR: 40, elR: -150, handR: 'grip', head: -2 }, itemR: <Burger s={0.8} rot={-90} /> },
  { id: 'look-up', p: { ...SIT, eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.45, smile: 0.3, brow: 1.3, browTilt: 0.4, lookY: -1, lookX: 0.6, head: -8, shL: 14, elL: -100, handL: 'grip', shR: 14, elR: -100, handR: 'grip' }, itemR: <Burger s={0.8} rot={90} /> },
  { id: 'sit-shrug', p: { ...SIT, ...SMUG, lid: 0.1, ...SHRUG, shR: 14, elR: -100, handR: 'grip' }, itemR: <Burger s={0.8} rot={90} /> },
  { id: 'couch', p: { ...SIT, ...SMUG, lid: 0.55, lookY: 0.6, smile: 0.4, mouthOpen: 0.1, shR: 34, elR: -138, handR: 'grip', shL: 18, elL: -40, handL: 'relax', head: 4 }, itemR: <HandPhone glow={1} /> },
  { id: 'startle', p: { ...SIT, ...SCARED, ...BY_FACE, lookX: -0.8 } },

  /* ---- the car (only the top half shows) ---- */
  { id: 'drive', p: { ...SMUG, shL: 40, elL: -96, handL: 'grip', shR: 40, elR: -96, handR: 'grip' }, headExtra: <Shades /> },
  { id: 'dazed', p: { ...DAZED, shL: 30, elL: 30, shR: 30, elR: 30, handL: 'open', handR: 'open', head: 8 }, members: CREW },

  /* ---- wasted, parole ---- */
  { id: 'slip', p: { ...SCARED, shL: 140, elL: 40, shR: 110, elR: -40, handL: 'open', handR: 'open', hipL: 2, hipR: 70, knR: -20, ftR: 30, torso: -8, head: -10 } },
  { id: 'flat', p: { ...DAZED, shL: 96, elL: 20, shR: 96, elR: 20, handL: 'open', handR: 'open', hipL: 14, hipR: 14 }, members: CREW },
  { id: 'bars', p: { ...SAD, shL: 104, elL: 44, handL: 'grip', shR: 104, elR: 44, handR: 'grip' } },
  { id: 'free-a', p: walk(A, { ...JOY, eyes: 1, turn: 0.4 }), plant: true },
  { id: 'free-b', p: walk(B, { ...JOY, eyes: 1, turn: 0.4 }), plant: true },

  /* ---- partners in crime: slow-motion strut with the bags ---- */
  { id: 'heist-a', p: walk(A, { ...SMUG, shL: 22, elL: -4, handL: 'grip', shR: 22, elR: -4, handR: 'grip', turn: 0 }), plant: true, itemL: <Duffel />, itemR: <Duffel flip />, headExtra: <Shades />, members: ['anon2'] },
  { id: 'heist-b', p: walk(B, { ...SMUG, shL: 22, elL: -4, handL: 'grip', shR: 22, elR: -4, handR: 'grip', turn: 0 }), plant: true, itemL: <Duffel />, itemR: <Duffel flip />, headExtra: <Shades />, members: ['anon2'] },

  /* ---- The Monday Report (recap-*.html): the anchor, the champ, the sad sit ---- */
  { id: 'present', p: { ...JOY, eyes: 0, mouthOpen: 0.75, shR: 96, elR: 6, handR: 'open', shL: 20, elL: 30, handL: 'relax', head: 4, lookX: 0.5 } },
  { id: 'champ', p: { ...JOY, eyes: 1, shL: 152, elL: -24, shR: 152, elR: -24, handL: 'fist', handR: 'fist', shrugL: 12, shrugR: 12 }, members: CREW },
  { id: 'slump', p: { ...SIT, ...SAD, lookY: 0.9, head: 8, shL: 6, elL: -58, shR: 6, elR: -58, handL: 'relax', handR: 'relax', shrugL: 14, shrugR: 14 }, members: CREW },
  { id: 'slump-look', p: { ...SIT, ...SAD, lid: 0.45, lookX: -1, lookY: 0.8, mouthMode: 'o', mouthOpen: 0.3, head: -5, shL: 6, elL: -58, shR: 6, elR: -58, handL: 'relax', handR: 'relax', shrugL: 14, shrugR: 14 }, members: CREW },

  /* ---- round 3 (NEW-ANIMATIONS-3.md) ---- */
  // Signal Lost: Flexander at mission control, headset on, looking up-left at the big screen
  { id: 'console', p: { eyes: 0, lid: 0.1, mouthMode: 'grin', mouthOpen: 0.25, smile: 0.8, brow: 0.6, lookX: -0.7, lookY: -0.9, turn: -0.25, head: -5, shL: 20, elL: -96, handL: 'relax', shR: 20, elR: -96, handR: 'relax' }, headExtra: <Headset />, members: ['anon'] },
  { id: 'console-panic', p: { ...SCARED, lookX: -0.7, lookY: -0.9, turn: -0.25, shL: 58, elL: 118, handL: 'open', shR: 58, elR: 118, handR: 'open', shrugL: 18, shrugR: 18 }, headExtra: <Headset />, members: ['anon'] },
  { id: 'console-call', p: { eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.7, smile: 0.2, brow: 1.4, browTilt: 1, sweat: 0.8, lookX: -0.4, lookY: -0.4, turn: -0.15, shR: 34, elR: -150, wrR: -10, handR: 'open', shL: 20, elL: -96, handL: 'relax' }, headExtra: <Headset />, members: ['anon'] },
  // 3 AM Besties: Connor in the booth (forearms on the table, a fry, a toast with his left hand towards his friend)
  { id: 'booth', p: { ...SIT, ...JOY, eyes: 0, mouthOpen: 0.6, shL: 22, elL: -104, handL: 'relax', shR: 22, elR: -104, handR: 'relax' }, members: ['connor'] },
  { id: 'booth-fry', p: { ...SIT, ...BLISS, shL: 22, elL: -104, handL: 'relax', shR: 36, elR: -152, wrR: 14, handR: 'grip', head: -3 }, itemR: <Fry />, headExtra: <MouthFry />, members: ['connor'] },
  { id: 'booth-cheers', p: { ...SIT, ...JOY, eyes: 1, shL: 22, elL: -104, handL: 'relax', shR: 124, elR: 40, wrR: -10, handR: 'grip', lookX: 0.6 }, itemR: <Cup />, members: ['connor'] },
  // Locked Out: Connor with his fries bag (screen left hand), tossing pebbles at the window up to the screen right
  { id: 'bag-look', p: { eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.25, smile: 0.5, brow: 1.2, browTilt: 0.4, lookX: 0.6, lookY: -1, turn: 0.2, head: -6, shL: 12, elL: 8, handL: 'grip', shR: 22, elR: -60, handR: 'fist' }, itemL: <FriesBag />, members: ['connor'] },
  { id: 'bag-windup', p: { eyes: 0, lid: 0.25, mouthMode: 'grit', mouthOpen: 0.2, smile: 0.5, brow: 0.8, browTilt: -0.5, lookX: 0.6, lookY: -1, turn: 0.2, head: -4, shL: 12, elL: 8, handL: 'grip', shR: 140, elR: 70, wrR: 10, handR: 'fist', torso: 3 }, itemL: <FriesBag />, members: ['connor'] },
  { id: 'bag-throw', p: { eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.45, smile: 0.6, brow: 1.3, browTilt: 0.3, lookX: 0.6, lookY: -1, turn: 0.2, head: -7, shL: 12, elL: 8, handL: 'grip', shR: 150, elR: -14, handR: 'open', torso: -3 }, itemL: <FriesBag />, members: ['connor'] },
  // Best of 40: rock paper scissors. Arm sides here are screen sides (L = viewer's left); the throwing hand is R,
  // facing right, so the one on the left stands as is and the one on the right is flipped
  { id: 'rps-up', p: { eyes: 0, lid: 0.35, mouthMode: 'grit', mouthOpen: 0.3, smile: 0.3, brow: 1, browTilt: -1, red: 0.2, turn: 0.3, lookX: 0.8, shR: 60, elR: -150, handR: 'fist', shL: 16, elL: 24, handL: 'relax' }, members: ['dean', 'jake'] },
  { id: 'rps-down', p: { eyes: 0, lid: 0.35, mouthMode: 'grit', mouthOpen: 0.3, smile: 0.3, brow: 1, browTilt: -1, red: 0.2, turn: 0.3, lookX: 0.8, shR: 50, elR: -64, handR: 'fist', shL: 16, elL: 24, handL: 'relax', sy: 0.98 }, members: ['dean', 'jake'] },
  { id: 'toss', p: { ...SMUG, lid: 0.2, lookX: 0.7, lookY: -1, head: -6, shR: 150, elR: 12, wrR: -10, handR: 'open', shL: 20, elL: 30, handL: 'relax' } },
  // Retire the Number: Dylan watching it go up, hand on heart
  { id: 'salute', p: { eyes: 0, lid: 0.15, mouthMode: 'grin', mouthOpen: 0.15, smile: 0.9, brow: 1, browTilt: 0.6, blush: 0.5, head: -6, lookY: -1, shR: 154, elR: 54, wrR: 40, handR: 'open', shL: 14, elL: 16, handL: 'relax' }, members: ['dylan'] },
  // Balanced Diet: Jake at the table (broccoli, the phone buzzes to his left, the fling, the beer)
  { id: 'table-chew', p: { ...SIT, ...SAD, lid: 0.55, mouthMode: 'grit', mouthOpen: 0.12, smile: 0, lookY: 0.6, head: 4, shR: 34, elR: -148, wrR: 20, handR: 'grip', shL: 20, elL: -108, handL: 'relax' }, itemR: <BrocFork />, members: ['jake'] },
  { id: 'table-buzz', p: { ...SIT, eyes: 0, lid: 0, mouthMode: 'o', mouthOpen: 0.4, smile: 0.5, brow: 1.5, browTilt: 0.4, lookX: 0.8, lookY: 0.7, turn: 0.2, shR: 34, elR: -148, wrR: 20, handR: 'grip', shL: 20, elL: -108, handL: 'relax' }, itemR: <BrocFork />, members: ['jake'] },
  { id: 'table-fling', p: { ...SIT, ...JOY, eyes: 0, mouthOpen: 0.9, shR: 170, elR: -10, wrR: 10, handR: 'open', shL: 20, elL: -108, handL: 'relax', lookX: 0.6, lookY: 0.3 }, members: ['jake'] },
  { id: 'table-beer', p: { ...SIT, ...JOY, eyes: 1, shL: 128, elL: 40, wrL: -6, handL: 'grip', shR: 20, elR: -108, handR: 'relax' }, itemL: <BeerMug />, members: ['jake'] },
  // Jailbreak: Jake shuffling right, still cuffed (screen-left wrist, as in The Radiator) to the radiator behind him
  { id: 'chain-a', p: walk(A, { ...STRAIN, red: 0.3, mouthOpen: 0.5, smile: 0.5, turn: 0.45, lookX: 0.6, shL: 34, elL: -8, wrL: 0, handL: 'fist' }), plant: true, itemL: <Cuff />, members: ['jake'] },
  { id: 'chain-b', p: walk(B, { ...STRAIN, red: 0.3, mouthOpen: 0.5, smile: 0.5, turn: 0.45, lookX: 0.6, shL: 34, elL: -8, wrL: 0, handL: 'fist' }), plant: true, itemL: <Cuff />, members: ['jake'] },
  { id: 'chain-thumbs', p: { ...JOY, eyes: 0, shR: 70, elR: 100, handR: 'thumb', shL: 34, elL: -8, handL: 'fist', sweat: 0.6 }, itemL: <Cuff />, members: ['jake'] },
  // Early Spring: Phil checks for his shadow, then shades on in the beach chair
  { id: 'look-down', p: { ...CONFUSED, lookY: 1, lookX: 0.3, head: 9, shL: 26, elL: -100, handL: 'relax', shR: 26, elR: -100, handR: 'relax' }, members: ['phil'] },
  { id: 'shades', p: { ...SMUG, lid: 0, mouthOpen: 0.5, shR: 70, elR: 100, handR: 'thumb', handL: 'relax' }, headExtra: <Shades />, members: ['phil'] },
  { id: 'beach', p: { ...SIT, ...SMUG, lid: 0.1, mouthOpen: 0.3, head: -4, shL: 156, elL: 150, handL: 'relax', shR: 156, elR: 150, handR: 'relax', armZL: 'back', armZR: 'back' }, headExtra: <Shades />, members: ['phil'] },
  // War Hero: the crew carrying him (anonymous colourways), and him up top with his fists in the air
  { id: 'carry-a', p: walk(A, { ...JOY, eyes: 0, mouthOpen: 0.8, turn: 0.3, lookX: 0.4, lookY: -0.6, shL: 166, elL: -12, handL: 'open', shR: 166, elR: -12, handR: 'open' }), plant: true, members: ['anon', 'anon2'] },
  { id: 'carry-b', p: walk(B, { ...JOY, eyes: 0, mouthOpen: 0.8, turn: 0.3, lookX: 0.4, lookY: -0.6, shL: 166, elL: -12, handL: 'open', shR: 166, elR: -12, handR: 'open' }), plant: true, members: ['anon', 'anon2'] },
  { id: 'champ-sit', p: { ...SIT, ...JOY, eyes: 1, shL: 152, elL: -24, shR: 152, elR: -24, handL: 'fist', handR: 'fist', shrugL: 12, shrugR: 12 } },
];

/** Props the clips place on their own: exported as prop-<id>.svg on a 600x600 canvas centred at 0,0. */
export const PROPS: { id: string; el: React.ReactNode }[] = [
  { id: 'cap', el: <Cap /> },
  { id: 'burger', el: <g transform="translate(0 -60)"><Burger /></g> },
];
