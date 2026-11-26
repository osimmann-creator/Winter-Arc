import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import { M, I, T, R, S, chain, mul, svgM, localLight, ap } from '../lib/m2';
import { smooth, limbPts, capsule, circlePath, ellPath, rrPath, heartPath, softStar, scallopPts, P } from '../lib/shape';
import { Look, LookCtx, useLook, HairPal } from './looks';
import { MemberHead } from './heads';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */
export const C = {
  // Refined "Olympus" palette (from the user's refined parts kit)
  ink: '#341720',       // espresso outline
  line: '#783B2B',      // soft detail lines: creases, chin, knees
  skin: '#FFB784',
  skinLimb: '#FFC08A',  // lit side of the arms
  skinFace: '#FFBC88',
  skinSh: '#D87D50',
  skinHi: '#FFE3B7',
  skinMid: '#EA8B59',
  skinDeep: '#CA6C46',
  skinWarm: '#ED9567',
  cheek: '#E77960',
  stub: '#EE9A73',
  hair: '#462728',
  hairHi: '#9C5C4A',
  hairMid: '#623735',
  hairCurl: '#A3614F',
  hairLite: '#C27C5E',
  hairDark: '#844D45',
  cloth: '#FFFAF0',
  clothSh: '#D9CCE0',
  clothMid: '#DED2E9',
  fold: '#B6A0C2',
  violet: '#7254DC',
  violetHi: '#BCABFF',
  violetSh: '#4F35B0',
  blue: '#2D7BF0',
  blueSh: '#1C55B4',
  gold: '#FFD064',
  goldSh: '#C77928',
  goldHi: '#FFF0B7',
  goldMid: '#DE8C35',
  goldKey: '#A65B2D',
  goldLine: '#FFEBAC',
  leaf: '#CF812F',
  leafLine: '#4D2525',
  sandal: '#A06343',
  sandalSh: '#6E3B2A',
  mouth: '#76223D',
  tongue: '#F78BA1',
  teeth: '#FFFFFF',
  teethLine: '#CDBAE7',
  teethEdge: '#B18798',
  white: '#FFFFFF',
  eyeSh: '#DDD9F4',
  iris: '#8F513D',
  glint: '#FFE6D4',
  blush: '#E87869',
  heart: '#EE5982',
  sweat: '#A6DCFF',
};
export const LW = 7.25;
export const LW2 = 4.5;

const BLUE_HAIR = { hair: '#1F47C2', hairMid: '#2F66E6', hairLite: '#9FD0FF', hairCurl: '#5E9BFF', hairDark: '#173A9E' };
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mixHex = (a: string, b: string, t: number) => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
export const hairCols = (h: HairPal, t: number) => ({
  hair: mixHex(h.hair, BLUE_HAIR.hair, t),
  hairMid: mixHex(h.mid, BLUE_HAIR.hairMid, t),
  hairLite: mixHex(h.lite, BLUE_HAIR.hairLite, t),
  hairCurl: mixHex(h.curl, BLUE_HAIR.hairCurl, t),
  hairDark: mixHex(h.dark, BLUE_HAIR.hairDark, t),
});

/* ------------------------------------------------------------------ */
/* Pose                                                                */
/* ------------------------------------------------------------------ */
export type Hand = 'fist' | 'open' | 'thumb' | 'point' | 'relax' | 'grip';
export type EyeMode = 'normal' | 'heart' | 'star' | 'spiral';
export type MouthMode = 'grin' | 'o' | 'grit';
/** Which layer an arm is drawn on: behind the body ('back'), between the body and the head ('mid'), in front of the
    head ('top'), or 'auto' (the default): 'mid' while the arm is down and 'top' once the hand or elbow comes up past
    the chin, so a raised arm is never hidden behind the head. The switch happens below the chin, where the arm
    can't overlap the head, so it never pops. */
export type ArmZ = 'back' | 'mid' | 'top' | 'auto';

export type Pose = {
  x: number; y: number; rot: number; sx: number; sy: number;
  torso: number; chestS: number; torsoSy: number; shrugL: number; shrugR: number;
  head: number; turn: number; headS: number;
  shL: number; elL: number; wrL: number; uaL: number; faL: number; flexL: number;
  shR: number; elR: number; wrR: number; uaR: number; faR: number; flexR: number;
  hipL: number; knL: number; ftL: number; thL: number; shinL: number;
  hipR: number; knR: number; ftR: number; thR: number; shinR: number;
  lookX: number; lookY: number; lid: number; brow: number; browTilt: number;
  mouthOpen: number; smile: number; mouthSkew: number; eyes: number;
  blush: number; sweat: number; pupil: number; wink: number; red: number; kneel: number;
  /** 0 = brown hair, 1 = electric blue (inside joke) */
  hairBlue: number;
  handL: Hand; handR: Hand; eyeMode: EyeMode; mouthMode: MouthMode;
  armZL: ArmZ; armZR: ArmZ;
};

export const BASE: Pose = {
  x: 0, y: 0, rot: 0, sx: 1, sy: 1,
  torso: 0, chestS: 1, torsoSy: 1, shrugL: 0, shrugR: 0,
  head: 0, turn: 0, headS: 1,
  shL: 14, elL: 16, wrL: 0, uaL: 1, faL: 1, flexL: 0.2,
  shR: 14, elR: 16, wrR: 0, uaR: 1, faR: 1, flexR: 0.2,
  hipL: 5, knL: -4, ftL: 0, thL: 1, shinL: 1,
  hipR: 5, knR: -4, ftR: 0, thR: 1, shinR: 1,
  lookX: 0, lookY: 0, lid: 0, brow: 0, browTilt: 0,
  mouthOpen: 0, smile: 1, mouthSkew: 0, eyes: 0,
  blush: 0, sweat: 0, pupil: 1, wink: 0, red: 0, kneel: 0, hairBlue: 0,
  handL: 'fist', handR: 'fist', eyeMode: 'normal', mouthMode: 'grin',
  armZL: 'auto', armZR: 'auto',
};

export const pose = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */
export const DIM = {
  LEG: 344,
  hipX: 42, hipY: 22,
  TH: 150, SH: 148,
  shX: 146, shY: -246,
  UA: 146, FA: 132,
  neckY: -334, PIV: 30,
};

export type Rig = ReturnType<typeof rig>;

export function rig(p: Pose) {
  const root = chain(T(p.x, p.y), S(p.sx, p.sy), T(0, -DIM.LEG), R(p.rot));
  const torso = chain(T(0, -6), R(p.torso), S(p.chestS, p.chestS * p.torsoSy), T(0, 6));
  const head = chain(torso, T(0, DIM.neckY), R(p.head), S(p.headS), T(0, DIM.PIV));
  const arm = (side: -1 | 1, sh: number, el: number, wr: number, ua: number, fa: number, shrug: number) => {
    const shoulder = chain(torso, T(side * DIM.shX, DIM.shY - shrug), side === 1 ? S(-1, 1) : I, R(sh));
    const upper = mul(shoulder, S(1, ua));
    const elbow = chain(shoulder, T(0, DIM.UA * ua), R(el));
    const fore = mul(elbow, S(1, fa));
    const wrist = chain(elbow, T(0, DIM.FA * fa), R(wr));
    return { shoulder, upper, elbow, fore, wrist };
  };
  const leg = (side: -1 | 1, hip: number, kn: number, ft: number, th: number, sh: number) => {
    const hipM = chain(T(side * DIM.hipX, DIM.hipY), side === 1 ? S(-1, 1) : I, R(hip));
    const thigh = mul(hipM, S(1, th));
    const knee = chain(hipM, T(0, DIM.TH * th), R(kn));
    const shin = mul(knee, S(1, sh));
    const ankle = chain(knee, T(0, DIM.SH * sh), R(ft));
    return { hip: hipM, thigh, knee, shin, ankle };
  };
  const aL = arm(-1, p.shL, p.elL, p.wrL, p.uaL, p.faL, p.shrugL);
  const aR = arm(1, p.shR, p.elR, p.wrR, p.uaR, p.faR, p.shrugR);
  const lL = leg(-1, p.hipL, p.knL, p.ftL, p.thL, p.shinL);
  const lR = leg(1, p.hipR, p.knR, p.ftR, p.thR, p.shinR);
  // world helpers (hero space: ground point = 0,0)
  const W = (m: M, x = 0, y = 0) => ap(mul(root, m), x, y);
  return {
    root, torso, head, aL, aR, lL, lR, W,
    handL: () => W(aL.wrist, 0, 40),
    handR: () => W(aR.wrist, 0, 40),
    mouth: () => W(head, p.turn * 16, -60),
    eyes: () => W(head, p.turn * 18, -172),
    headTop: () => W(head, 0, -330),
    chest: () => W(torso, 0, -200),
  };
}

/** Matrices for a single arm with its shoulder at (x, y); mirror=true flips it like the hero's right arm. */
export function armRig(x: number, y: number, mirror: boolean, sh: number, el: number, wr = 0, ua = 1, fa = 1) {
  const shoulder = chain(T(x, y), mirror ? S(-1, 1) : I, R(sh));
  const upper = mul(shoulder, S(1, ua));
  const elbow = chain(shoulder, T(0, DIM.UA * ua), R(el));
  const fore = mul(elbow, S(1, fa));
  const wrist = chain(elbow, T(0, DIM.FA * fa), R(wr));
  return { shoulder, upper, elbow, fore, wrist };
}

/** Shift pose vertically so the lowest sole touches the ground (y=0), then lift. */
export function plant(p: Pose, lift = 0): Pose {
  const q = { ...p, y: 0 };
  const r = rig(q);
  const ys =
    p.kneel > 0.5
      ? [r.W(r.lL.knee, 0, 24)[1], r.W(r.lR.knee, 0, 24)[1]]
      : [r.W(r.lL.ankle, -60, 32)[1], r.W(r.lL.ankle, 20, 30)[1], r.W(r.lR.ankle, -60, 32)[1], r.W(r.lR.ankle, 20, 30)[1]];
  return { ...p, y: -Math.max(...ys) - lift };
}

/* ------------------------------------------------------------------ */
/* Shaded part                                                         */
/* ------------------------------------------------------------------ */
type PartProps = {
  m: M; lm: M; d: string; fill: string; shade?: string; off?: number; lw?: number;
  inner?: React.ReactNode; over?: React.ReactNode; strokeD?: string; noStroke?: boolean; stroke?: string;
};
const Part: React.FC<PartProps> = ({ m, lm, d, fill, shade, off = 15, lw = LW, inner, over, strokeD, noStroke, stroke = C.ink }) => {
  const id = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [lx, ly] = localLight(lm);
  return (
    <g transform={svgM(m)}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={shade ?? fill} />
      <g clipPath={`url(#${id})`}>
        {shade ? <path d={d} fill={fill} transform={`translate(${(lx * off).toFixed(2)} ${(ly * off).toFixed(2)})`} /> : null}
        {inner}
      </g>
      {noStroke ? null : (
        <path d={strokeD ?? d} fill="none" stroke={stroke} strokeWidth={lw} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {over}
    </g>
  );
};

const Line: React.FC<{ d: string; w?: number; c?: string; o?: number }> = ({ d, w = LW2, c = C.ink, o = 1 }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={o} />
);

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */
const upperArmD = (flex: number) =>
  smooth(
    limbPts(DIM.UA, [
      [0, 53, 47],
      [0.12, 54, 47],
      [0.3, 43 + 2 * flex, 45],
      [0.56, 46 + 26 * flex, 45],
      [0.82, 38 + 10 * flex, 38],
      [1, 32, 33],
    ], 52, 30),
  );
const foreArmD = smooth(
  limbPts(DIM.FA, [
    [0, 34, 34],
    [0.22, 46, 40],
    [0.55, 36, 32],
    [0.85, 29, 28],
    [1, 28, 28],
  ], 30, 12),
);
const thighD = smooth(
  limbPts(DIM.TH, [
    [0, 42, 36],
    [0.4, 40, 33],
    [0.8, 31, 27],
    [1, 27, 25],
  ], 26, 20),
);
const shinD = smooth(
  limbPts(DIM.SH, [
    [0, 27, 25],
    [0.28, 37, 29],
    [0.62, 26, 22],
    [0.95, 18, 17],
  ], 18, 10),
);
const footD = smooth([
  [14, -10], [20, 10], [2, 22], [-30, 24], [-58, 24], [-74, 16], [-70, 0], [-46, -6], [-18, -12],
] as P[]);
const soleD = 'M24 16 Q-30 22 -78 18 Q-86 26 -76 33 Q-26 34 20 30 Q32 26 24 16 Z';

const TORSO_D = smooth([
  [0, 6], [-56, 4], [-64, -36], [-80, -96], [-106, -156], [-134, -200], [-144, -236], [-126, -270],
  [-90, -290], [-50, -302], [50, -302], [90, -290], [126, -270], [144, -236], [134, -200],
  [106, -156], [80, -96], [64, -36], [56, 4],
] as P[]);
const NECK_D = 'M-54 -292 L-48 -356 L48 -356 L54 -292 Z';

type Cmd = [string, ...number[]];
const HEAD_CMDS: Cmd[] = [
  ['M', 0, 4], ['C', 40, 4, 76, 2, 94, -14], ['C', 108, -28, 116, -52, 124, -78], ['C', 129, -94, 130, -110, 128, -126],
  ['L', 119, -190], ['C', 114, -262, 66, -302, 0, -304], ['C', -66, -302, -114, -262, -119, -190], ['L', -128, -126],
  ['C', -130, -110, -129, -94, -124, -78], ['C', -116, -52, -108, -28, -94, -14], ['C', -76, 2, -40, 4, 0, 4], ['Z'],
];
const headShift = (x: number, y: number, t: number) => {
  const low = y > -150 ? Math.min(1, (y + 150) / 150) : 0;
  const high = y < -150 ? Math.min(1, (-150 - y) / 150) : 0;
  // jaw juts toward the turn; far side of jaw tucks in a bit
  const side = Math.sign(x) === Math.sign(t) ? 1 : 0.55;
  return x + t * (30 * low * side - 8 * high);
};
const headPath = (t: number) =>
  HEAD_CMDS.map(([c, ...v]) => {
    const out: number[] = [];
    for (let i = 0; i < v.length; i += 2) out.push(Math.round(headShift(v[i], v[i + 1], t) * 10) / 10, v[i + 1]);
    return c + out.join(' ');
  }).join(' ');
export const HEAD_D = headPath(0);

// hand shapes, wrist at (0,0), pointing +y
const HAND = {
  fistBody: smooth([[-26, 2], [26, 2], [38, 20], [40, 50], [32, 74], [0, 82], [-32, 74], [-40, 50], [-38, 20]] as P[]),
  knuckles: [rrPath(-39, 38, 27, 44, 13), rrPath(-13, 41, 27, 44, 13), rrPath(13, 38, 26, 42, 13)],
  fistThumb: capsule(-34, 28, 4, 46, 13.5, 12),
  palm: smooth([[-24, 2], [24, 2], [35, 28], [33, 58], [17, 68], [-17, 68], [-33, 58], [-35, 28]] as P[]),
  fingers: [capsule(-20, 54, -33, 110, 12.5, 11.5), capsule(2, 58, 4, 120, 13, 12), capsule(22, 54, 35, 106, 12.5, 11.5)],
  thumbOpen: capsule(-27, 26, -66, 50, 13.5, 12.5),
  relaxFingers: [capsule(-20, 54, -27, 98, 12.5, 11.5), capsule(2, 58, 2, 104, 13, 12), capsule(22, 54, 28, 96, 12.5, 11.5)],
  thumbRelax: capsule(-27, 26, -50, 58, 13.5, 12.5),
  thumbUp: capsule(-30, 34, -82, 26, 15, 13.5),
  index: capsule(18, 56, 22, 128, 12.5, 11.5),
};

/* ------------------------------------------------------------------ */
/* Hand                                                                */
/* ------------------------------------------------------------------ */
const FistAccent: React.FC = () => {
  const K = useLook().skin;
  return (
    <g>
      <path d="M-26 8 C-14 4 5 5 15 11 Q2 9 -16 14 Q-29 19 -26 8Z" fill={K.hi} />
      <path d="M16 14 Q36 22 33 43 L27 50 Q27 30 16 14Z" fill={K.fistSh} />
    </g>
  );
};
const FIST_ACCENT = <FistAccent />;
const HandG: React.FC<{ m: M; lm: M; type: Hand }> = ({ m, lm, type }) => {
  const K = useLook().skin;
  const sk = { fill: K.skin, shade: K.sh, off: 9 };
  if (type === 'open' || type === 'relax') {
    const fingers = type === 'open' ? HAND.fingers : HAND.relaxFingers;
    const thumb = type === 'open' ? HAND.thumbOpen : HAND.thumbRelax;
    return (
      <g>
        {fingers.map((d, i) => (
          <Part key={i} m={m} lm={lm} d={d} {...sk} lw={6.25} />
        ))}
        <Part m={m} lm={lm} d={HAND.palm} {...sk} lw={6.25} />
        <Part m={m} lm={lm} d={thumb} {...sk} lw={6.25} />
        <g transform={svgM(m)}>
          <Line d="M-14 44 Q0 50 14 44" w={3.5} o={0.55} />
        </g>
      </g>
    );
  }
  return (
    <g>
      {type === 'point' ? <Part m={m} lm={lm} d={HAND.index} {...sk} lw={6.25} /> : null}
      <Part m={m} lm={lm} d={HAND.fistBody} {...sk} lw={6.25} inner={FIST_ACCENT} />
      {HAND.knuckles.map((d, i) =>
        type === 'point' && i === 2 ? null : <Part key={i} m={m} lm={lm} d={d} {...sk} lw={5.5} />,
      )}
      {type === 'thumb' ? (
        <Part m={m} lm={lm} d={HAND.thumbUp} {...sk} lw={6.25} />
      ) : (
        <Part m={m} lm={lm} d={HAND.fistThumb} {...sk} lw={6.25} />
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Arm / leg                                                           */
/* ------------------------------------------------------------------ */
const Cuff: React.FC = () => {
  const y0 = DIM.FA * 0.6;
  const h = DIM.FA * 0.34;
  return (
    <g>
      <path d={rrPath(-33, y0, 66, h, 12)} fill={C.gold} stroke={C.ink} strokeWidth={5.5} />
      <path d="M-29 106 Q0 114 29 106 V113 Q29 120 20 122 H-20 Q-29 122 -29 113Z" fill={C.goldMid} />
      <path d={rrPath(-27, y0 + 5, 18, h - 10, 7)} fill={C.goldHi} opacity={0.75} />
      <path d={`M22 ${y0 + 4} V${y0 + h - 4}`} stroke={C.goldSh} strokeWidth={8} strokeLinecap="round" />
      {/* greek-key engraving + rim highlights */}
      <Line d="M-26 100 H-10 V94 H0 V105 H10 V99 H26" w={2.6} c={C.goldKey} />
      <path d="M-24 85 H24 M-24 116 H24" fill="none" stroke={C.goldLine} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/* cel-shading accents from the refined kit (part-local coordinates) */
const UpperAccent: React.FC = () => {
  const K = useLook().skin;
  return (
    <g>
      <path d="M-48 3 C-33 -38 -8 -51 13 -36 C-15 -37 -34 -15 -48 3Z" fill={K.hi} />
      <path d="M-63 76 C-54 59 -45 53 -30 53 C-37 64 -46 76 -57 84 Q-65 91 -63 76Z" fill={K.hi} />
      <path d="M-34 104 C-18 117 0 120 22 109 C7 127 -20 136 -36 117Z" fill={K.mid} />
      <path d="M-22 145 Q18 151 40 124 Q36 154 13 169 Q-9 173 -22 145Z" fill={K.deep} />
    </g>
  );
};
const ForeAccent: React.FC = () => {
  const K = useLook().skin;
  return (
    <g>
      <path d="M-32 12 C-24 -3 -16 -9 -9 -8 Q-20 11 -23 31 C-27 43 -34 28 -32 12Z" fill={K.hi} />
      <path d="M12 3 C34 20 30 47 17 71 Q23 49 15 30 Q9 17 12 3Z" fill={K.warm} />
    </g>
  );
};
const LegAccent: React.FC = () => <path d="M-25 11 Q-14 -10 -4 -6 Q-15 12 -16 39 Q-23 53 -25 33Z" fill={useLook().skin.hi} />;
const UPPER_ACCENT = <UpperAccent />;
const FORE_ACCENT = <ForeAccent />;
const LEG_ACCENT = <LegAccent />;

/** Outline pass: thick ink silhouette behind fills so joined segments read as one shape. */
const Ol: React.FC<{ m: M; d: string; w?: number }> = ({ m, d, w = LW }) => (
  <path d={d} transform={svgM(m)} fill={C.ink} stroke={C.ink} strokeWidth={w * 2} strokeLinejoin="round" />
);

export const ArmG: React.FC<{ a: Rig['aL']; root: M; flex: number; hand: Hand; el: number; item?: React.ReactNode; itemBehind?: boolean }> = ({
  a, root, flex, hand, el, item, itemBehind,
}) => {
  const L = (m: M) => mul(root, m);
  const K = useLook().skin;
  const ua = upperArmD(flex);
  const folded = Math.abs(el) > 58;
  const deltoid = <Line d="M-42 42 C-25 42 -6 34 8 20" w={4.5} c={K.line} />;
  const peak = flex > 0.45 ? <Line d="M-40 110 Q-26 124 -4 120" w={4.25} c={K.line} /> : null;
  const upper = (stroke: boolean) => (
    <Part m={a.upper} lm={L(a.upper)} d={ua} fill={K.limb} shade={K.sh} off={16} noStroke={!stroke} inner={UPPER_ACCENT} over={<g>{deltoid}{peak}</g>} />
  );
  const fore = (stroke: boolean) => (
    <Part m={a.fore} lm={L(a.fore)} d={foreArmD} fill={K.limb} shade={K.sh} off={14} noStroke={!stroke} inner={FORE_ACCENT} over={<Cuff />} />
  );
  return (
    <g>
      {folded ? (
        <>
          {upper(true)}
          {fore(true)}
        </>
      ) : (
        <>
          <Ol m={a.upper} d={ua} />
          <Ol m={a.fore} d={foreArmD} />
          {fore(false)}
          {upper(false)}
          <g transform={svgM(a.elbow)}>
            <Line d="M-20 -6 Q-8 2 4 -4" w={4} c={K.line} o={0.72} />
          </g>
        </>
      )}
      {itemBehind && item ? <g transform={svgM(a.wrist)}>{item}</g> : null}
      <HandG m={a.wrist} lm={L(a.wrist)} type={hand} />
      {!itemBehind && item ? <g transform={svgM(a.wrist)}>{item}</g> : null}
    </g>
  );
};

const LegG: React.FC<{ l: Rig['lL']; root: M; kneel?: boolean }> = ({ l, root, kneel }) => {
  const L = (m: M) => mul(root, m);
  const K = useLook().skin;
  if (kneel) {
    return (
      <g>
        <Ol m={l.thigh} d={thighD} />
        <Part m={l.thigh} lm={L(l.thigh)} d={thighD} fill={K.skin} shade={K.sh} off={12} noStroke inner={LEG_ACCENT} />
        <g transform={svgM(l.knee)}>
          <ellipse cx={0} cy={4} rx={30} ry={20} fill={K.skin} stroke={C.ink} strokeWidth={LW} />
          <Line d="M-14 0 Q0 10 14 0" w={4} c={K.line} o={0.7} />
        </g>
      </g>
    );
  }
  return (
    <g>
      <Ol m={l.thigh} d={thighD} />
      <Ol m={l.shin} d={shinD} />
      <Part m={l.thigh} lm={L(l.thigh)} d={thighD} fill={K.skin} shade={K.sh} off={12} noStroke inner={LEG_ACCENT} />
      <Part
        m={l.shin}
        lm={L(l.shin)}
        d={shinD}
        fill={K.skin}
        shade={K.sh}
        off={11}
        noStroke
        inner={
          <g>
            {LEG_ACCENT}
            <Line d="M-30 100 L26 124" w={7} c={C.sandal} />
            <Line d="M26 100 L-30 124" w={7} c={C.sandal} />
            <Line d="M-32 88 L30 88" w={6} c={C.sandal} />
          </g>
        }
        over={<Line d="M-14 -2 Q-2 8 10 0" w={4} c={K.line} o={0.7} />}
      />
      <g transform={svgM(l.ankle)}>
        <path d={soleD} fill={C.sandal} stroke={C.ink} strokeWidth={5.5} strokeLinejoin="round" />
      </g>
      <Part
        m={l.ankle}
        lm={L(l.ankle)}
        d={footD}
        fill={K.skin}
        shade={K.sh}
        off={8}
        lw={6.25}
        inner={<Line d="M-30 -12 L-38 28" w={9} c={C.sandal} />}
        over={<Line d="M-60 8 Q-56 14 -60 20" w={3.5} o={0.7} />}
      />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Torso                                                               */
/* ------------------------------------------------------------------ */
const meander = (x0: number, x1: number, y: number, u = 20) => {
  let d = `M${x0} ${y + 12}H${x1}`;
  for (let x = x0 + 3; x < x1 - u + 4; x += u) {
    d += `M${x} ${y + 12}V${y}H${x + 13}V${y + 8}H${x + 6}V${y + 4}`;
  }
  return d;
};

const SashTail: React.FC<{ m: M; f: number }> = ({ m, f }) => {
  const w = Math.sin(f / 5) * 10;
  const w2 = Math.sin(f / 5 + 1.4) * 14;
  const d = smooth([
    [118, -276], [160, -262], [182 + w * 0.4, -200], [196 + w, -130], [214 + w2, -60], [178 + w2, -58], [160 + w, -128], [136 + w * 0.3, -196], [112, -244],
  ] as P[]);
  return (
    <g transform={svgM(m)}>
      <path d={d} fill={C.clothSh} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      <Line d={`M150 -230 Q${172 + w * 0.6} -160 ${190 + w2 * 0.8} -80`} w={3.5} c={C.fold} />
    </g>
  );
};

const TorsoG: React.FC<{ m: M; lm: M; f: number }> = ({ m, lm }) => {
  const K = useLook().skin;
  const sashD = 'M58 -306 Q12 -170 -68 -38 L-28 -12 Q64 -140 132 -272 Q108 -302 58 -306 Z';
  return (
    <>
      <Ol m={m} d={NECK_D} />
      <Ol m={m} d={TORSO_D} />
      <Part m={m} lm={lm} d={NECK_D} fill={K.skin} shade={K.sh} off={18} noStroke inner={<g><path d="M-41 -324 Q-30 -306 -11 -301 L-41 -302Z" fill={K.neckHi} /><path d="M-60 -362 H60 V-326 Q0 -306 -60 -326 Z" fill={K.sh} /></g>} />
      <Part
        m={m}
        lm={lm}
        d={TORSO_D}
        fill={K.skin}
        shade={K.sh}
        off={24}
        noStroke
        inner={
          <g>
            <path d="M-127 -233 Q-88 -262 -36 -248 Q-75 -243 -110 -225 Q-122 -220 -127 -233Z" fill={K.hi} />
            <path d="M-77 -220 Q-60 -230 -45 -224 Q-59 -213 -74 -214Z" fill={K.chestHi} />
            {/* trap / collar shade under the chin */}
            <path d="M-70 -310 Q0 -276 70 -310 L70 -330 L-70 -330 Z" fill={K.sh} opacity={0.7} />
            {/* under-pec shade */}
            <path d="M-6 -226 C-12 -186 -40 -162 -80 -164 C-112 -166 -134 -184 -150 -206 L-150 -188 C-128 -160 -100 -150 -76 -150 C-36 -148 -10 -170 -2 -206 Z" fill={K.sh} opacity={0.9} />
            <path d="M6 -226 C12 -186 40 -162 80 -164 C112 -166 134 -184 150 -206 L150 -188 C128 -160 100 -150 76 -150 C36 -148 10 -170 2 -206 Z" fill={K.sh} opacity={0.9} />
            {/* pecs */}
            <Line d="M-2 -236 C-8 -190 -40 -164 -80 -166 C-112 -168 -132 -186 -144 -206" w={5} />
            <Line d="M2 -236 C8 -190 40 -164 80 -166 C112 -168 132 -186 144 -206" w={5} />
            {/* abs */}
            <Line d="M0 -150 L0 -56" w={4} />
            {[-128, -100, -74].map((y, i) => (
              <g key={y}>
                <Line d={`M-6 ${y} Q-26 ${y - 6} ${-46 + i * 3} ${y + 2}`} w={4} />
                <Line d={`M6 ${y} Q26 ${y - 6} ${46 - i * 3} ${y + 2}`} w={4} />
              </g>
            ))}
            <Line d="M-72 -128 Q-60 -88 -62 -50" w={4} c={K.line} o={0.7} />
            <Line d="M72 -128 Q60 -88 62 -50" w={4} c={K.line} o={0.7} />
            <Line d="M-5 -50 Q0 -44 5 -50" w={4} c={K.line} />
            {/* cast shadow of the sash on the skin */}
            <path d="M-28 -12 Q64 -140 132 -272 L150 -262 Q84 -128 -6 2 Z" fill={K.sh} />
            {/* sash */}
            <path d={sashD} fill={C.cloth} />
            <path d="M-10 -40 Q54 -150 112 -266 L132 -272 Q64 -140 -28 -12 Z" fill={C.clothSh} />
            <Line d="M44 -290 Q-2 -160 -56 -46" w={10} c={C.violet} />
            <Line d="M118 -276 Q58 -140 -16 -18" w={10} c={C.violet} />
            <Line d="M80 -272 Q38 -160 -30 -42" w={3.5} c={C.fold} />
            <Line d="M58 -230 Q30 -150 -16 -60" w={3.5} c={C.fold} />
            <Line d="M58 -306 Q12 -170 -68 -38" w={LW2} />
            <Line d="M-28 -12 Q64 -140 132 -272" w={LW2} />
          </g>
        }
        over={
          <g>
            {/* brooch */}
            <circle cx={104} cy={-278} r={20} fill={C.gold} stroke={C.ink} strokeWidth={5} />
            <circle cx={104} cy={-278} r={9} fill={C.violet} stroke={C.ink} strokeWidth={3.5} />
            <circle cx={100} cy={-282} r={3} fill={C.white} />
          </g>
        }
      />
    </>
  );
};

/** Knee-length toga skirt that flares with the thighs so the legs' tops stay covered in any pose.
    Refined look: the hem is 9% wider, easing in from y 22 (no change) to y 110 (full),
    with violet trim, soft pleat panels and a lilac highlight on the band. */
const SKIRT_FLARE = 0.09;
const flareS = (y: number) => {
  const t = Math.max(0, Math.min(1, (y - 22) / (110 - 22)));
  return 1 + SKIRT_FLARE * t * t * (3 - 2 * t);
};
const SkirtG: React.FC<{ r: Rig; root: M; f: number }> = ({ r, root, f }) => {
  const HEM = 150;
  const BASE = 124;
  const pL = ap(r.lL.thigh, -50, DIM.TH * 0.8);
  const pR = ap(r.lR.thigh, -50, DIM.TH * 0.8);
  const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const xL = Math.min(-BASE, pL[0] - 28);
  const xR = Math.max(BASE, pR[0] + 28);
  const yL = clampN(Math.max(HEM, pL[1] + 14), HEM, HEM + 70);
  const yR = clampN(Math.max(HEM, pR[1] + 14), HEM, HEM + 70);
  const wv = (i: number) => Math.sin(f / 4.5 + i * 1.3) * 5;
  const N = 8;
  const fl = (x: number, y: number): P => [x * flareS(y), y];
  const n1 = (v: number) => v.toFixed(1);
  const hemRaw: P[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    hemRaw.push([xR + (xL - xR) * t, yR + (yL - yR) * t + Math.sin(Math.PI * t) * 14 + wv(i)]);
  }
  const hem = hemRaw.map(([x, y]) => fl(x, y));
  // side edges: straight in the original, now easing out between y 22 and y 110
  const side = (sx: number, end: P) => {
    const top: P = [sx, -12];
    const at = (y: number): P => {
      const k = (y - top[1]) / (end[1] - top[1]);
      return [top[0] + (end[0] - top[0]) * k, y];
    };
    const a = at(22), c1 = at(51.33), c2 = fl(...at(80.67)), b = fl(...at(110));
    return { a, c1, c2, b };
  };
  const R0 = side(68, hemRaw[0]);
  const L0 = side(-68, hemRaw[N]);
  let d = `M-68 -12 L68 -12 L${n1(R0.a[0])} ${n1(R0.a[1])} C${n1(R0.c1[0])} ${n1(R0.c1[1])} ${n1(R0.c2[0])} ${n1(R0.c2[1])} ${n1(R0.b[0])} ${n1(R0.b[1])} L${n1(hem[0][0])} ${n1(hem[0][1])}`;
  for (let i = 1; i < hem.length; i++) {
    const [x0, y0] = hem[i - 1];
    const [x1, y1] = hem[i];
    d += ` Q${n1((x0 + x1) / 2)} ${n1(Math.max(y0, y1) + 9)} ${n1(x1)} ${n1(y1)}`;
  }
  d += ` L${n1(L0.b[0])} ${n1(L0.b[1])} C${n1(L0.c2[0])} ${n1(L0.c2[1])} ${n1(L0.c1[0])} ${n1(L0.c1[1])} ${n1(L0.a[0])} ${n1(L0.a[1])} L-68 -12 Z`;
  // band = hem strip
  const BW = 30;
  const band = `M${hem.map(([x, y]) => `${n1(x)} ${n1(y + 12)}`).join(' L')} L${[...hem]
    .reverse()
    .map(([x, y]) => `${n1(x)} ${n1(y - BW)}`)
    .join(' L')} Z`;
  const bandTop = `M${hem.map(([x, y]) => `${n1(x)} ${n1(y - BW)}`).join(' L')}`;
  // lilac highlight just under the band's top edge, inset at both ends
  const hiPts = hem.map(([x, y]): P => [x, y - BW + 6]);
  const inset = (a: P, b: P): P => [a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25];
  hiPts[0] = inset(hiPts[0], hiPts[1]);
  hiPts[N] = inset(hiPts[N], hiPts[N - 1]);
  const bandHi = `M${hiPts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(' L')}`;
  // greek-key marks along the band
  const keys: React.ReactNode[] = [];
  for (let i = 0; i < hemRaw.length - 1; i++) {
    for (const k of [0.25, 0.75]) {
      const x = hemRaw[i][0] + (hemRaw[i + 1][0] - hemRaw[i][0]) * k;
      const y = hemRaw[i][1] + (hemRaw[i + 1][1] - hemRaw[i][1]) * k - BW / 2 + 2;
      const a = (Math.atan2(hemRaw[i + 1][1] - hemRaw[i][1], hemRaw[i + 1][0] - hemRaw[i][0]) * 180) / Math.PI + 180;
      const sx = flareS(y);
      keys.push(
        <path key={`${i}-${k}`} d="M-7 6 V-6 H7 V3 H0 V-1" transform={`translate(${(x * sx).toFixed(3)} ${n1(y)}) scale(${sx.toFixed(3)} 1) rotate(${n1(a)})`} fill="none" stroke={C.white} strokeWidth={3} strokeLinejoin="miter" />,
      );
    }
  }
  const PANEL_W = [24, 18, 16, 15];
  const pleatData = [0.18, 0.38, 0.62, 0.82].map((t, i) => {
    const top = -66 + 132 * t;
    const idx = Math.round((1 - t) * N);
    const [hx, hy] = hemRaw[idx];
    const by = hy - BW - 2;
    const [bx] = fl(hx * 0.92, by);
    return { top, bx, by, w: PANEL_W[i] };
  });
  const panels = pleatData.map(({ top, bx, by, w }) => {
    const tx = top - 0.8;
    const c1x = tx + (bx - tx) * 0.24 - 2, c1y = -8 + (by + 10) * 0.42;
    const c2x = tx + (bx + w - tx) * 0.33, c2y = -8 + (by + 13) * 0.5;
    return <path key={top} d={`M${n1(tx)} -8 Q${n1(c1x)} ${n1(c1y)} ${n1(bx - 2.3)} ${n1(by + 2)} L${n1(bx + w)} ${n1(by + 5)} Q${n1(c2x)} ${n1(c2y)} ${n1(tx)} -8Z`} fill={C.clothMid} />;
  });
  const pleats = pleatData.map(({ top, bx, by }) => <Line key={top} d={`M${n1(top)} -6 L${n1(bx)} ${n1(by)}`} w={3.5} c={C.fold} />);
  return (
    <Part
      m={I}
      lm={root}
      d={d}
      fill={C.cloth}
      shade={C.clothSh}
      off={18}
      inner={
        <g>
          {panels}
          {pleats}
          <path d={band} fill={C.violet} />
          {keys}
          <Line d={bandTop} w={4} />
          <path d={bandHi} fill="none" stroke={C.violetHi} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      }
    />
  );
};

const BeltG: React.FC<{ m: M }> = ({ m }) => (
  <g transform={svgM(m)}>
    <path d="M-70 -30 Q0 -20 70 -30 L68 0 Q0 10 -68 0 Z" fill={C.gold} stroke={C.ink} strokeWidth={6.25} strokeLinejoin="round" />
    <path d="M-66 -6 Q0 4 66 -6 L68 0 Q0 10 -68 0 Z" fill={C.goldSh} />
    {[-52, -38, -24, 24, 38, 52].map((x) => (
      <Line key={x} d={`M${x - 4} -24 L${x + 4} 2`} w={3} c={C.goldSh} />
    ))}
    <path d="M-70 -30 Q0 -20 70 -30 L68 0 Q0 10 -68 0 Z" fill="none" stroke={C.ink} strokeWidth={6.25} strokeLinejoin="round" />
    <circle cx={0} cy={-14} r={21} fill={C.gold} stroke={C.ink} strokeWidth={5.5} />
    <circle cx={0} cy={-14} r={15} fill="none" stroke="#A85834" strokeWidth={1.6} />
    <path d="M-12 -17 Q-10 -25 0 -27" fill="none" stroke={C.goldHi} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 -28 L-8 -12 L1 -12 L-4 2 L9 -17 L0 -17 Z" fill={C.white} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
  </g>
);

/* ------------------------------------------------------------------ */
/* Head + face                                                         */
/* ------------------------------------------------------------------ */
const laurel = () => {
  const leaves: { x: number; y: number; a: number }[] = [];
  // quadratic stem from (-136,-214) via (-70,-262) to (0,-268) etc.
  const q = (t: number, p0: P, p1: P, p2: P): P => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  const sides: [P, P, P][] = [
    [[-138, -212], [-84, -270], [-10, -270]],
    [[138, -212], [84, -270], [10, -270]],
  ];
  sides.forEach(([p0, p1, p2], si) => {
    for (let i = 0; i < 6; i++) {
      const t = 0.08 + i * 0.165;
      const [x, y] = q(t, p0, p1, p2);
      const [x2, y2] = q(t + 0.02, p0, p1, p2);
      const tan = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      const flip = i % 2 === 0 ? -1 : 1;
      leaves.push({ x, y, a: tan + flip * 34 * (si === 0 ? 1 : -1) * -1 });
    }
  });
  return leaves;
};
const LEAVES = laurel();
const LEAF_D = 'M0 0 Q14 -12 38 -2 Q18 11 0 0 Z';

const HeadG: React.FC<{ p: Pose; m: M; lm: M; f: number; extra?: React.ReactNode }> = ({ p, m, lm, f, extra }) => {
  const look = useLook();
  const id = 'h' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (look.face !== 'flex') return <MemberHead p={p} m={m} lm={lm} f={f} extra={extra} />;
  const K = look.skin;
  const [lx, ly] = localLight(lm);
  const tn = p.turn;
  const HD = headPath(tn);
  const ex = tn * 18;
  const eyeY = -172;
  const hc = hairCols(look.hair, p.hairBlue ?? 0);
  // hair
  const backHair = scallopPts(0, -250, 140, 102, 160, 380, 11, 24) + ' L120 -176 L-120 -176 Z';
  const hl: P[] = [];
  for (let i = 0; i <= 9; i++) {
    const x = 114 - (228 * i) / 9;
    hl.push([x, -252 + 0.0036 * x * x]);
  }
  let fringe = scallopPts(0, -256, 126, 92, 180, 360, 9, 20);
  fringe += ` L122 -204`;
  for (let i = 0; i < hl.length; i++) {
    const [x, y] = hl[i];
    if (i === 0) fringe += ` L${x} ${y}`;
    else {
      const [px, py] = hl[i - 1];
      fringe += ` Q${(px + x) / 2} ${Math.max(py, y) + 16} ${x} ${y}`;
    }
  }
  fringe += ' L-122 -204 Z';

  return (
    <g transform={svgM(m)}>
      <defs>
        <clipPath id={id}>
          <path d={HD} />
        </clipPath>
      </defs>
      {/* back hair */}
      <path d={backHair} fill={hc.hair} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      {/* ears */}
      {[-1, 1].map((s) => (
        <g key={s} transform={`translate(${-tn * 8} 0) scale(${s} 1)`}>
          <path d="M-114 -196 C-152 -206 -158 -136 -118 -128 Z" fill={K.skin} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
          <Line d="M-124 -182 C-140 -178 -140 -152 -126 -146" w={4} />
        </g>
      ))}
      {/* head base */}
      <path d={HD} fill={K.sh} />
      <g clipPath={`url(#${id})`}>
        <path d={HD} fill={K.face} transform={`translate(${lx * 26} ${ly * 26})`} />
        {/* warm cheeks */}
        <path
          transform={`translate(${ex} 0)`}
          d="M-135 -95 C-113 -103 -92 -93 -82 -77 Q-104 -63 -123 -79 Z M135 -95 C113 -103 92 -93 82 -77 Q104 -63 123 -79 Z"
          fill={K.cheek}
          opacity={0.44}
        />
        {p.red > 0 ? <path d="M-140 -330 H140 V30 H-140 Z" fill="#FF3B3B" opacity={p.red * 0.32} /> : null}
        {/* under-chin / jaw shade on right */}
        <path d="M-130 -8 Q0 14 130 -8 L130 20 L-130 20 Z" fill={K.sh} opacity={0.6} />
        {/* cheekbone glints */}
        <g transform={`translate(${ex} 0)`}>
          <path d="M-119 -108 Q-107 -114 -97 -108 Q-103 -103 -113 -103Z" fill={K.hi} />
          <path d="M96 -108 Q108 -115 118 -109 Q114 -103 103 -102Z" fill={K.hi} />
        </g>
        {/* blush */}
        {p.blush > 0 ? (
          <g opacity={p.blush * 0.7}>
            <ellipse cx={-80 + ex} cy={-112} rx={30} ry={16} fill={C.blush} />
            <ellipse cx={80 + ex} cy={-112} rx={30} ry={16} fill={C.blush} />
          </g>
        ) : null}
      </g>
      <path d={HD} fill="none" stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      {/* chin */}
      <Line d={`M${-32 + tn * 22} -42 Q${tn * 22} -30 ${32 + tn * 22} -42`} w={4} c={K.line} o={0.85} />
      <Line d={`M${tn * 28 - 7} -24 Q${tn * 28} -16 ${tn * 28} -6 M${tn * 28 + 7} -24 Q${tn * 28} -16 ${tn * 28} -6`} w={4} />
      <ellipse cx={-34 + tn * 26} cy={-18} rx={12} ry={4.5} fill={K.hi} opacity={0.86} transform={`rotate(-12 ${-34 + tn * 26} -18)`} />
      {/* front hair */}
      <path d={fringe} fill={hc.hair} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-113 -276 Q-102 -299 -85 -299 Q-90 -322 -61 -318 Q-51 -342 -32 -333 Q-13 -351 2 -337 Q22 -349 35 -335 Q59 -343 69 -323 Q54 -330 38 -318 Q20 -333 5 -316 Q-14 -332 -29 -314 Q-52 -328 -61 -303 Q-87 -304 -98 -282Z" fill={hc.hairMid} />
        <path d="M-104 -278 Q-99 -299 -78 -305 M-62 -315 Q-52 -335 -33 -329 M-12 -332 Q1 -345 16 -335" stroke={hc.hairLite} strokeWidth={5.5} />
        <path d="M-70 -291 C-69 -309 -47 -310 -44 -295 Q-46 -285 -53 -287 M-31 -300 C-24 -321 -1 -317 -3 -303 Q-4 -294 -13 -295 M16 -310 C22 -330 47 -327 48 -309 Q48 -301 41 -299 M65 -295 C70 -311 92 -301 92 -288" stroke={hc.hairCurl} strokeWidth={6} />
        <path d="M-93 -268 Q-90 -280 -80 -278 M-24 -275 Q-13 -290 -1 -281 M56 -278 Q65 -292 79 -279 M97 -267 Q108 -272 115 -260" stroke={hc.hairDark} strokeWidth={5} />
      </g>
      {/* sideburns */}
      {[-1, 1].map((s) => (
        <path key={s} transform={`scale(${s} 1)`} d="M-122 -214 L-108 -214 L-110 -186 L-121 -180 Z" fill={hc.hair} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      ))}
      {/* laurel */}
      <g>
        <path d="M-138 -212 Q-84 -270 -10 -270 M138 -212 Q84 -270 10 -270" fill="none" stroke={C.goldSh} strokeWidth={6} strokeLinecap="round" />
        {LEAVES.map((l, i) => (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}>
            <path d={LEAF_D} fill={C.gold} stroke={C.leafLine} strokeWidth={3.2} strokeLinejoin="round" />
            <path d="M1 0 Q19 -3 36 -2 Q20 7 1 0Z" fill={C.leaf} />
            <path d="M5 -1.3 Q17 -5.3 30 -3" fill="none" stroke={C.goldHi} strokeWidth={1.5} strokeLinecap="round" />
          </g>
        ))}
        <path d={softStar(-96, -258, 9, 3, 4, 0)} fill={C.white} opacity={0.9} />
      </g>
      <Face p={p} />
      {extra}
    </g>
  );
};

const Eye: React.FC<{ cx: number; cy: number; rx: number; ry: number; p: Pose; side: -1 | 1 }> = ({ cx, cy, rx, ry, p, side }) => {
  const id = 'e' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (p.eyes >= 0.5 || (side === 1 && p.wink >= 0.5)) {
    return <Line d={`M${cx - 30} ${cy + 8} Q${cx} ${cy - 28} ${cx + 30} ${cy + 8}`} w={9} />;
  }
  if (p.eyeMode === 'heart') {
    return (
      <g>
        <path d={heartPath(cx, cy, 40)} fill={C.heart} stroke={C.ink} strokeWidth={6.25} strokeLinejoin="round" />
        <ellipse cx={cx - 14} cy={cy - 12} rx={8} ry={5} fill={C.white} opacity={0.8} transform={`rotate(-30 ${cx - 14} ${cy - 12})`} />
      </g>
    );
  }
  if (p.eyeMode === 'star') {
    return (
      <g>
        <path d={ellPath(cx, cy, rx, ry)} fill={C.white} stroke={C.ink} strokeWidth={LW} />
        <path d={softStar(cx + p.lookX * 10, cy + p.lookY * 12, 30, 13, 5)} fill={C.gold} stroke={C.ink} strokeWidth={4.5} strokeLinejoin="round" />
      </g>
    );
  }
  const px = cx + p.lookX * 14;
  const py = cy + p.lookY * 18 + 4;
  const pr = 12 * p.pupil;
  const lidY = cy - ry + p.lid * ry * 2;
  const tilt = p.browTilt * -8 * side;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={ellPath(cx, cy, rx, ry)} />
        </clipPath>
      </defs>
      <path d={ellPath(cx, cy, rx, ry)} fill={C.white} />
      <g clipPath={`url(#${id})`}>
        <ellipse cx={cx + 8} cy={cy + 10} rx={rx} ry={ry} fill="none" stroke={C.eyeSh} strokeWidth={10} />
        {p.eyeMode === 'spiral' ? (
          <path
            d={`M${cx} ${cy} m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0`}
            fill="none"
            stroke={C.ink}
            strokeWidth={4}
          />
        ) : (
          <>
            <circle cx={px} cy={py} r={pr} fill={C.ink} />
            <circle cx={px} cy={py} r={pr * 0.76} fill={C.iris} />
            <circle cx={px + 0.5} cy={py - 0.5} r={pr * 0.53} fill={C.ink} />
            <circle cx={px + pr * 0.34} cy={py + pr * 0.36} r={pr * 0.12} fill={C.glint} />
            <circle cx={px - pr * 0.35} cy={py - pr * 0.4} r={pr * 0.32} fill={C.white} />
          </>
        )}
        {p.lid > 0.01 ? (
          <path
            d={`M${cx - rx - 4} ${cy - ry - 10} H${cx + rx + 4} V${lidY - tilt} Q${cx} ${lidY + 6} ${cx - rx - 4} ${lidY + tilt} Z`}
            fill={C.skin}
            stroke={C.ink}
            strokeWidth={5}
          />
        ) : null}
      </g>
      <path d={ellPath(cx, cy, rx, ry)} fill="none" stroke={C.ink} strokeWidth={LW} />
    </g>
  );
};

const Face: React.FC<{ p: Pose }> = ({ p }) => {
  const tn = p.turn;
  const ex = tn * 18;
  const eyeY = -176;
  const rxL = 40 * (1 - 0.22 * Math.max(0, -tn));
  const rxR = 40 * (1 - 0.22 * Math.max(0, tn));
  const eyeL = <Eye key="l" cx={-39 + ex - 4 * Math.max(0, -tn)} cy={eyeY} rx={rxL} ry={52} p={p} side={-1} />;
  const eyeR = <Eye key="r" cx={39 + ex + 4 * Math.max(0, tn)} cy={eyeY} rx={rxR} ry={52} p={p} side={1} />;
  // brows
  const by = -238 - 14 * p.brow;
  const brow = (s: -1 | 1) => {
    const x0 = s * 90 + ex;
    const x1 = s * 20 + ex;
    const y0 = by + 8 + 6 * p.browTilt;
    const y1 = by - 6 - 14 * p.browTilt;
    return <Line key={s} d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) - 12} ${x1} ${y1}`} w={16} />;
  };
  // nose
  const nx = tn * 28;
  const noseFill = `M${nx - 9} -166 C${nx - 12} -150 ${nx - 31} -134 ${nx - 30} -118 C${nx - 29} -104 ${nx - 15} -100 ${nx} -100 C${nx + 15} -100 ${nx + 29} -104 ${nx + 30} -118 C${nx + 31} -134 ${nx + 12} -150 ${nx + 9} -166 Z`;
  const noseLine = `M${nx - 9} -160 C${nx - 12} -150 ${nx - 31} -134 ${nx - 30} -118 C${nx - 29} -104 ${nx - 15} -100 ${nx} -100 C${nx + 15} -100 ${nx + 29} -104 ${nx + 30} -118 C${nx + 31} -134 ${nx + 12} -150 ${nx + 9} -160`;
  return (
    <g>
      {tn > 0 ? [eyeR, eyeL] : [eyeL, eyeR]}
      {brow(-1)}
      {brow(1)}
      {/* nose */}
      <path d={noseFill} fill={C.skin} />
      <path d={`M${nx + 8} -150 C${nx + 14} -132 ${nx + 28} -122 ${nx + 26} -112 C${nx + 24} -104 ${nx + 14} -102 ${nx + 6} -102 Z`} fill={C.skinSh} opacity={0.8} />
      <path d={noseLine} fill="none" stroke={C.ink} strokeWidth={6.25} strokeLinecap="round" strokeLinejoin="round" />
      <Line d={`M${nx - 19} -110 Q${nx - 12} -104 ${nx - 6} -109`} w={4} />
      <Line d={`M${nx + 19} -110 Q${nx + 12} -104 ${nx + 6} -109`} w={4} />
      <Mouth p={p} />
      {p.sweat > 0 ? <Sweat amt={p.sweat} /> : null}
    </g>
  );
};

const Mouth: React.FC<{ p: Pose }> = ({ p }) => {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const mx = p.turn * 16;
  const s = p.smile;
  const o = p.mouthOpen;
  if (p.mouthMode === 'o') {
    const r = 14 + o * 22;
    return (
      <g>
        <ellipse cx={mx} cy={-62} rx={r * 0.85} ry={r} fill={C.mouth} stroke={C.ink} strokeWidth={6.25} />
        <ellipse cx={mx} cy={-62 + r * 0.45} rx={r * 0.5} ry={r * 0.35} fill={C.tongue} />
      </g>
    );
  }
  if (p.mouthMode === 'grit') {
    const W = 64;
    const top = -84;
    const h = 34 + o * 10;
    const d = `M${mx - W} ${top + 6} Q${mx} ${top - 4} ${mx + W} ${top + 6} L${mx + W - 6} ${top + h} Q${mx} ${top + h + 8} ${mx - W + 6} ${top + h} Z`;
    return (
      <g>
        <path d={d} fill={C.teeth} stroke={C.ink} strokeWidth={6.25} strokeLinejoin="round" />
        <Line d={`M${mx - W + 4} ${top + h / 2 + 2} Q${mx} ${top + h / 2 + 4} ${mx + W - 4} ${top + h / 2 + 2}`} w={4} />
        {[-40, -14, 14, 40].map((x) => (
          <Line key={x} d={`M${mx + x} ${top + 2} V${top + h + 2}`} w={3.5} />
        ))}
      </g>
    );
  }
  const W = 66 + 14 * Math.max(0, s);
  const top = -78;
  const cyL = top - 12 * s + p.mouthSkew * 10;
  const cyR = top - 12 * s - p.mouthSkew * 10;
  const depth = 22 + 46 * o + 8 * Math.max(0, s);
  const bot = top + depth;
  const topEdge = `M${mx - W} ${cyL} C${mx - W * 0.45} ${top + 6} ${mx + W * 0.45} ${top + 6} ${mx + W} ${cyR}`;
  const d = `${topEdge} C${mx + W * 0.85} ${bot} ${mx - W * 0.85} ${bot} ${mx - W} ${cyL} Z`;
  const tH = o < 0.25 ? depth * 0.55 : 15;
  const teethUp = `M${mx - W} ${cyL} C${mx - W * 0.45} ${top + 6} ${mx + W * 0.45} ${top + 6} ${mx + W} ${cyR} L${mx + W} ${cyR + tH} C${mx + W * 0.45} ${top + 6 + tH} ${mx - W * 0.45} ${top + 6 + tH} ${mx - W} ${cyL + tH} Z`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={o < 0.25 ? C.teeth : C.mouth} />
      <g clipPath={`url(#${id})`}>
        {o >= 0.25 ? (
          <>
            <ellipse cx={mx} cy={bot - 6} rx={W * 0.5} ry={22} fill={C.tongue} />
            <path d={teethUp} fill={C.teeth} />
            <path d={`M${mx - W} ${bot + 4} C${mx - W * 0.4} ${bot - 14} ${mx + W * 0.4} ${bot - 14} ${mx + W} ${bot + 4} Z`} fill={C.teeth} opacity={o > 0.6 ? 1 : 0} />
          </>
        ) : (
          <>
            <Line d={`M${mx - W} ${cyL + tH * 0.9} C${mx - W * 0.45} ${top + 6 + tH} ${mx + W * 0.45} ${top + 6 + tH} ${mx + W} ${cyR + tH * 0.9}`} w={2.25} c={C.teethEdge} />
            {[-38, -13, 13, 38].map((x) => (
              <Line key={x} d={`M${mx + x * (W / 72)} ${top - 4} V${top + tH + 6}`} w={2.6} c={C.teethLine} />
            ))}
          </>
        )}
      </g>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={6.25} strokeLinejoin="round" />
      {s > 0.3 ? (
        <>
          <Line d={`M${mx - W - 2} ${cyL - 14} Q${mx - W - 14} ${cyL + 2} ${mx - W - 2} ${cyL + 16}`} w={4.5} />
          <Line d={`M${mx + W + 2} ${cyR - 14} Q${mx + W + 14} ${cyR + 2} ${mx + W + 2} ${cyR + 16}`} w={4.5} />
        </>
      ) : null}
    </g>
  );
};

const Sweat: React.FC<{ amt: number }> = ({ amt }) => {
  const f = useCurrentFrame();
  const drops = [
    { x: -118, y: -232, s: 1 },
    { x: 122, y: -214, s: 0.85 },
    { x: -96, y: -252, s: 0.7 },
  ].slice(0, Math.ceil(amt * 3));
  return (
    <g>
      {drops.map((d, i) => {
        const t = ((f + i * 9) % 26) / 26;
        const y = d.y + t * 46;
        const op = t < 0.8 ? 1 : (1 - t) * 5;
        return (
          <g key={i} transform={`translate(${d.x} ${y}) scale(${d.s})`} opacity={op}>
            <path d="M0 -22 C10 -6 14 2 14 8 A14 14 0 0 1 -14 8 C-14 2 -10 -6 0 -22 Z" fill={C.sweat} stroke={C.ink} strokeWidth={4.5} strokeLinejoin="round" />
            <ellipse cx={-4} cy={6} rx={3.5} ry={5} fill={C.white} />
          </g>
        );
      })}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
export type HeroProps = {
  p: Pose;
  x: number;
  y: number;
  scale: number;
  behind?: React.ReactNode;
  between?: React.ReactNode;
  front?: React.ReactNode;
  itemL?: React.ReactNode;
  itemR?: React.ReactNode;
  itemBehindL?: boolean;
  itemBehindR?: boolean;
  headExtra?: React.ReactNode;
  shadow?: boolean;
  groundY?: number;
  /** who to draw (src/hero/looks.ts). Default: the look from LookCtx, which is Flexander unless a scene sets one. */
  look?: Look;
  /** For a group whose arms reach across each other's faces: draw everyone with layer="body" first, then everyone
      with layer="head". Heads then sit on top of every arm in the group, while each guy's own raised arm still
      shows in front of his own face. Default: the whole hero in one go. */
  layer?: 'body' | 'head';
};

export const Hero: React.FC<HeroProps> = (props) => {
  const ctx = useLook();
  const look = props.look ?? ctx;
  return look === ctx ? <HeroBody {...props} /> : <LookCtx.Provider value={look}><HeroBody {...props} /></LookCtx.Provider>;
};

const HeroBody: React.FC<HeroProps> = ({
  p, x, y, scale, behind, between, front, itemL, itemR, itemBehindL, itemBehindR, headExtra, shadow = true, layer,
}) => {
  const f = useCurrentFrame();
  const r = rig(p);
  const L = (m: M) => mul(r.root, m);
  const arm = (side: 'L' | 'R') => {
    const a = side === 'L' ? r.aL : r.aR;
    return (
      <ArmG
        key={side}
        a={a}
        root={r.root}
        flex={side === 'L' ? p.flexL : p.flexR}
        el={side === 'L' ? p.elL : p.elR}
        hand={side === 'L' ? p.handL : p.handR}
        item={side === 'L' ? itemL : itemR}
        itemBehind={side === 'L' ? itemBehindL : itemBehindR}
      />
    );
  };
  const chinY = r.W(r.head, 0, 4)[1];
  const armLayer = (zz: ArmZ, a: typeof r.aL): ArmZ => {
    if (zz !== 'auto') return zz;
    const handTop = r.W(a.wrist, 0, 40)[1] - 44;
    const elbowTop = r.W(a.elbow)[1] - 36;
    return Math.min(handTop, elbowTop) < chinY ? 'top' : 'mid';
  };
  const zL = armLayer(p.armZL, r.aL), zR = armLayer(p.armZR, r.aR);
  const z = (zz: ArmZ) => [zL === zz ? arm('L') : null, zR === zz ? arm('R') : null];
  const lift = Math.max(0, -p.y);
  const shS = Math.max(0.35, 1 - lift / 600);
  if (layer === 'head') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <g transform={svgM(r.root)}>
          <HeroHead m={r.head} tops={z('top')}>
            <HeadG p={p} m={r.head} lm={L(r.head)} f={f} extra={headExtra} />
          </HeroHead>
        </g>
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {shadow ? (
        <ellipse cx={p.x} cy={6} rx={170 * shS} ry={26 * shS} fill="#000" opacity={0.16 * shS} />
      ) : null}
      <g transform={svgM(r.root)}>
        {behind}
        <SashTail m={r.torso} f={f} />
        {z('back')}
        <LegG l={r.lL} root={r.root} kneel={p.kneel > 0.5} />
        <LegG l={r.lR} root={r.root} kneel={p.kneel > 0.5} />
        <SkirtG r={r} root={r.root} f={f} />
        <TorsoG m={r.torso} lm={L(r.torso)} f={f} />
        <BeltG m={mul(r.torso, R(-p.torso * 0.5))} />
        {between}
        {z('mid')}
        {layer === 'body' ? null : <HeadG p={p} m={r.head} lm={L(r.head)} f={f} extra={headExtra} />}
        {z('top')}
        {front}
      </g>
    </g>
  );
};

/** layer="head": the head, then his own raised arms again, only where they cross his own head */
const HeroHead: React.FC<{ m: M; tops: React.ReactNode[]; children: React.ReactNode }> = ({ m, tops, children }) => {
  const id = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <>
      {children}
      {tops.some(Boolean) ? (
        <>
          <clipPath id={id}>
            <ellipse cx={0} cy={-170} rx={176} ry={218} transform={svgM(m)} />
          </clipPath>
          <g clipPath={`url(#${id})`}>{tops}</g>
        </>
      ) : null}
    </>
  );
};

/* Internals, exported for the body-part sheet exporter (src/export). */
export {
  Part, Line, HandG, Cuff, Ol, LegG, TorsoG, SkirtG, BeltG, SashTail, HeadG, Eye, Face, Mouth, Sweat,
  upperArmD, foreArmD, thighD, shinD, footD, soleD, TORSO_D, NECK_D, HAND, headPath, LEAVES, LEAF_D,
  UPPER_ACCENT, FORE_ACCENT, LEG_ACCENT, FIST_ACCENT,
};
