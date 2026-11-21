/* Exports every body part of Flexander, the intro biceps and the clouds as
   standalone SVG fragments (part-local units, pivot at 0,0) plus joint data.
   Run: node scripts/export-parts.mjs  →  out/parts-kit/_raw.json            */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'fs';
import {
  C, LW, BASE, pose, Pose, DIM, rig, armRig, plant, ArmG, Hero,
  Part, Line, HandG, Cuff, TorsoG, SkirtG, BeltG, SashTail, Eye, Mouth, Hand,
  upperArmD, foreArmD, thighD, shinD, footD, soleD, headPath, LEAVES, LEAF_D,
  UPPER_ACCENT, FORE_ACCENT, LEG_ACCENT,
} from '../hero/Hero';
import { I, ap, localLight } from '../lib/m2';
import { scallopPts, softStar, cloudPath } from '../lib/shape';

type Joint = { name: string; x: number; y: number };
type Item = {
  sheet: 'body' | 'biceps' | 'clouds';
  section: string;
  id: string;
  label: string;
  sub?: string;
  kind?: 'part' | 'reference';
  pivot: string;
  joints?: Joint[];
  anchor?: string;
  bg?: string;
  svg: string;
};

const items: Item[] = [];
// Render inside <svg> so React treats the children as SVG, then drop the wrapper.
const markup = (el: React.ReactElement) => renderToStaticMarkup(<svg>{el}</svg>).replace(/^<svg>/, '').replace(/<\/svg>$/, '');
const add = (it: Omit<Item, 'svg'> & { el: React.ReactElement }) => {
  const { el, ...rest } = it;
  items.push({ kind: 'part', ...rest, svg: markup(el) });
};

/* ------------------------------------------------------------ head pieces */
// Head art is drawn in head space (chin ≈ y 4). The neck joint it rotates
// around is head (0,-30), so shifting by +30 puts the pivot at 0,0.
const H = (children: React.ReactNode) => <g transform="translate(0 30)">{children}</g>;
const HEAD_PIVOT = 'neck (head rotates here)';
const headSpace = (x: number, y: number) => `head-space (${x}, ${y}) · ${x} , ${y + 30} from the neck pivot`;

const backHair = scallopPts(0, -250, 140, 102, 160, 380, 11, 24) + ' L120 -176 L-120 -176 Z';
const fringeD = (() => {
  const hl: [number, number][] = [];
  for (let i = 0; i <= 9; i++) {
    const x = 114 - (228 * i) / 9;
    hl.push([x, -252 + 0.0036 * x * x]);
  }
  let d = scallopPts(0, -256, 126, 92, 180, 360, 9, 20) + ' L122 -204';
  hl.forEach(([x, y], i) => {
    if (i === 0) d += ` L${x} ${y}`;
    else {
      const [px, py] = hl[i - 1];
      d += ` Q${(px + x) / 2} ${Math.max(py, y) + 16} ${x} ${y}`;
    }
  });
  return d + ' L-122 -204 Z';
})();

add({
  sheet: 'body', section: 'Head', id: 'head-hair-back', label: 'Hair (back)', pivot: HEAD_PIVOT,
  el: H(<path d={backHair} fill={C.hair} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />),
});
add({
  sheet: 'body', section: 'Head', id: 'head-ear', label: 'Ear', sub: 'left · right is mirrored', pivot: HEAD_PIVOT,
  el: H(
    <g>
      <path d="M-114 -196 C-152 -206 -158 -136 -118 -128 Z" fill={C.skin} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      <Line d="M-124 -182 C-140 -178 -140 -152 -126 -146" w={4} />
    </g>,
  ),
});
const HeadBase: React.FC = () => {
  const HD = headPath(0);
  const [lx, ly] = localLight(I);
  return (
    <g>
      <defs>
        <clipPath id="hb">
          <path d={HD} />
        </clipPath>
      </defs>
      <path d={HD} fill={C.skinSh} />
      <g clipPath="url(#hb)">
        <path d={HD} fill={C.skinFace} transform={`translate(${lx * 26} ${ly * 26})`} />
        <path d="M-135 -95 C-113 -103 -92 -93 -82 -77 Q-104 -63 -123 -79 Z M135 -95 C113 -103 92 -93 82 -77 Q104 -63 123 -79 Z" fill={C.cheek} opacity={0.44} />
        <path d="M-130 -8 Q0 14 130 -8 L130 20 L-130 20 Z" fill={C.skinSh} opacity={0.6} />
        <path d="M-119 -108 Q-107 -114 -97 -108 Q-103 -103 -113 -103Z" fill={C.skinHi} />
        <path d="M96 -108 Q108 -115 118 -109 Q114 -103 103 -102Z" fill={C.skinHi} />
      </g>
      <path d={HD} fill="none" stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      <Line d="M-32 -42 Q0 -30 32 -42" w={4} c={C.line} o={0.85} />
      <Line d="M-7 -24 Q0 -16 0 -6 M7 -24 Q0 -16 0 -6" w={4} />
      <ellipse cx={-34} cy={-18} rx={12} ry={4.5} fill={C.skinHi} opacity={0.86} transform="rotate(-12 -34 -18)" />
    </g>
  );
};
add({
  sheet: 'body', section: 'Head', id: 'head-face', label: 'Head', sub: 'face shape, stubble, chin', pivot: HEAD_PIVOT,
  joints: [{ name: 'eyes', x: 0, y: -146 }, { name: 'mouth', x: 0, y: -40 }],
  el: H(<HeadBase />),
});
add({
  sheet: 'body', section: 'Head', id: 'head-hair-front', label: 'Hair (front)', sub: 'with sideburns', pivot: HEAD_PIVOT,
  el: H(
    <g>
      <path d={fringeD} fill={C.hair} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-113 -276 Q-102 -299 -85 -299 Q-90 -322 -61 -318 Q-51 -342 -32 -333 Q-13 -351 2 -337 Q22 -349 35 -335 Q59 -343 69 -323 Q54 -330 38 -318 Q20 -333 5 -316 Q-14 -332 -29 -314 Q-52 -328 -61 -303 Q-87 -304 -98 -282Z" fill={C.hairMid} />
        <path d="M-104 -278 Q-99 -299 -78 -305 M-62 -315 Q-52 -335 -33 -329 M-12 -332 Q1 -345 16 -335" stroke={C.hairLite} strokeWidth={5.5} />
        <path d="M-70 -291 C-69 -309 -47 -310 -44 -295 Q-46 -285 -53 -287 M-31 -300 C-24 -321 -1 -317 -3 -303 Q-4 -294 -13 -295 M16 -310 C22 -330 47 -327 48 -309 Q48 -301 41 -299 M65 -295 C70 -311 92 -301 92 -288" stroke={C.hairCurl} strokeWidth={6} />
        <path d="M-93 -268 Q-90 -280 -80 -278 M-24 -275 Q-13 -290 -1 -281 M56 -278 Q65 -292 79 -279 M97 -267 Q108 -272 115 -260" stroke={C.hairDark} strokeWidth={5} />
      </g>
      {[-1, 1].map((s) => (
        <path key={s} transform={`scale(${s} 1)`} d="M-122 -214 L-108 -214 L-110 -186 L-121 -180 Z" fill={C.hair} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      ))}
    </g>,
  ),
});
add({
  sheet: 'body', section: 'Head', id: 'head-laurel', label: 'Laurel wreath', pivot: HEAD_PIVOT,
  el: H(
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
    </g>,
  ),
});

/* ------------------------------------------------------------ face pieces */
const P = (q: Partial<Pose>) => pose(q);
const eye = (id: string, label: string, q: Partial<Pose>) =>
  add({
    sheet: 'body', section: 'Face', id, label, pivot: 'eye centre', anchor: 'left eye ' + headSpace(-39, -176) + ' · right eye at x +39',
    el: <Eye cx={0} cy={0} rx={40} ry={52} p={P(q)} side={-1} />,
  });
eye('eye-open', 'Eye · open', {});
eye('eye-look', 'Eye · looking', { lookX: 0.8, lookY: -0.3 });
eye('eye-half', 'Eye · half lid', { lid: 0.45 });
eye('eye-happy', 'Eye · happy shut', { eyes: 1 });
eye('eye-heart', 'Eye · heart', { eyeMode: 'heart' });
eye('eye-star', 'Eye · star', { eyeMode: 'star' });
eye('eye-spiral', 'Eye · dizzy', { eyeMode: 'spiral' });

const browD = (brow: number, tilt: number) => {
  const by = -238 - 14 * brow;
  const x0 = -90, x1 = -20;
  const y0 = by + 8 + 6 * tilt, y1 = by - 6 - 14 * tilt;
  return `M${x0} ${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) - 12} ${x1} ${y1}`;
};
const brow = (id: string, label: string, b: number, t: number) =>
  add({
    sheet: 'body', section: 'Face', id, label, sub: 'left · right is mirrored', pivot: 'brow centre (resting)', anchor: headSpace(-55, -238),
    el: <g transform="translate(55 238)"><Line d={browD(b, t)} w={16} /></g>,
  });
brow('brow-rest', 'Brow · resting', 0, 0);
brow('brow-up', 'Brow · raised', 1, 0);
brow('brow-worried', 'Brow · worried', 0.4, 1);
brow('brow-mad', 'Brow · determined', -0.3, -0.8);

add({
  sheet: 'body', section: 'Face', id: 'nose', label: 'Nose', pivot: 'nose centre', anchor: headSpace(0, -133),
  el: (
    <g transform="translate(0 133)">
      <path d="M-9 -166 C-12 -150 -31 -134 -30 -118 C-29 -104 -15 -100 0 -100 C15 -100 29 -104 30 -118 C31 -134 12 -150 9 -166 Z" fill={C.skin} />
      <path d="M8 -150 C14 -132 28 -122 26 -112 C24 -104 14 -102 6 -102 Z" fill={C.skinSh} opacity={0.8} />
      <path d="M-9 -160 C-12 -150 -31 -134 -30 -118 C-29 -104 -15 -100 0 -100 C15 -100 29 -104 30 -118 C31 -134 12 -150 9 -160" fill="none" stroke={C.ink} strokeWidth={6.25} strokeLinecap="round" strokeLinejoin="round" />
      <Line d="M-19 -110 Q-12 -104 -6 -109" w={4} />
      <Line d="M19 -110 Q12 -104 6 -109" w={4} />
    </g>
  ),
});

const mouth = (id: string, label: string, q: Partial<Pose>) =>
  add({
    sheet: 'body', section: 'Face', id, label, pivot: 'mouth centre', anchor: headSpace(0, -70),
    el: <g transform="translate(0 70)"><Mouth p={P(q)} /></g>,
  });
mouth('mouth-grin', 'Mouth · grin', {});
mouth('mouth-smirk', 'Mouth · smirk', { smile: 0.8, mouthSkew: 0.6 });
mouth('mouth-open', 'Mouth · open', { mouthOpen: 0.55 });
mouth('mouth-shout', 'Mouth · shout', { mouthOpen: 1 });
mouth('mouth-o', 'Mouth · O', { mouthMode: 'o', mouthOpen: 0.5 });
mouth('mouth-grit', 'Mouth · gritted', { mouthMode: 'grit' });

add({
  sheet: 'body', section: 'Face', id: 'blush', label: 'Blush', sub: 'one per cheek', pivot: 'centre', anchor: 'left ' + headSpace(-80, -112) + ' · right at x +80',
  el: <ellipse cx={0} cy={0} rx={30} ry={16} fill={C.blush} opacity={0.7} />,
});
add({
  sheet: 'body', section: 'Face', id: 'sweat', label: 'Sweat drop', pivot: 'centre', anchor: 'falls from the temples',
  el: (
    <g>
      <path d="M0 -22 C10 -6 14 2 14 8 A14 14 0 0 1 -14 8 C-14 2 -10 -6 0 -22 Z" fill={C.sweat} stroke={C.ink} strokeWidth={4.5} strokeLinejoin="round" />
      <ellipse cx={-4} cy={6} rx={3.5} ry={5} fill={C.white} />
    </g>
  ),
});

/* ------------------------------------------------------------ body */
// Torso art is in torso space; it bends around the waist at (0,-6).
add({
  sheet: 'body', section: 'Body', id: 'torso', label: 'Torso', sub: 'neck, chest, sash, brooch', pivot: 'waist (torso bends here)',
  joints: [
    { name: 'neck', x: 0, y: -328 },
    { name: 'shoulder L', x: -DIM.shX, y: DIM.shY + 6 },
    { name: 'shoulder R', x: DIM.shX, y: DIM.shY + 6 },
  ],
  el: <g transform="translate(0 6)"><TorsoG m={I} lm={I} f={0} /></g>,
});
add({
  sheet: 'body', section: 'Body', id: 'belt', label: 'Belt', pivot: 'waist', anchor: 'body-space (0, 0)',
  el: <BeltG m={I} />,
});
const rest = rig(BASE);
add({
  sheet: 'body', section: 'Body', id: 'skirt', label: 'Toga skirt', sub: 'standing pose · stretches with the legs', pivot: 'hips', anchor: 'body-space (0, 0)',
  joints: [
    { name: 'hip L', x: -DIM.hipX, y: DIM.hipY },
    { name: 'hip R', x: DIM.hipX, y: DIM.hipY },
  ],
  el: <SkirtG r={rest} root={I} f={0} />,
});
add({
  sheet: 'body', section: 'Body', id: 'sash-tail', label: 'Sash tail', sub: 'behind the back, sways', pivot: 'top (hangs from the right shoulder)', anchor: 'torso-space (118, -276)',
  el: <g transform="translate(-118 276)"><SashTail m={I} f={0} /></g>,
});

/* ------------------------------------------------------------ arm */
const deltoid = <Line d="M-42 42 C-25 42 -6 34 8 20" w={4.5} c={C.line} />;
const peak = <Line d="M-40 110 Q-26 124 -4 120" w={4.25} c={C.line} />;
const UpperArm: React.FC<{ flex: number }> = ({ flex }) => (
  <Part m={I} lm={I} d={upperArmD(flex)} fill={C.skinLimb} shade={C.skinSh} off={16} inner={UPPER_ACCENT} over={<g>{deltoid}{flex > 0.45 ? peak : null}</g>} />
);
const ForeArm: React.FC = () => (
  <g>
    <Part m={I} lm={I} d={foreArmD} fill={C.skinLimb} shade={C.skinSh} off={14} inner={FORE_ACCENT} over={<Cuff />} />
    <Line d="M-20 -6 Q-8 2 4 -4" w={4} c={C.line} o={0.72} />
  </g>
);
const armJ = (n: string, y: number) => [{ name: n, x: 0, y }];
const ARM_SUB = 'left · right is mirrored';
add({ sheet: 'body', section: 'Arm', id: 'arm-upper', label: 'Upper arm', sub: ARM_SUB, pivot: 'shoulder', joints: armJ('elbow', DIM.UA), el: <UpperArm flex={0.2} /> });
add({ sheet: 'body', section: 'Arm', id: 'arm-upper-flexed', label: 'Upper arm · flexed', sub: 'bicep bulges as it bends', pivot: 'shoulder', joints: armJ('elbow', DIM.UA), el: <UpperArm flex={1} /> });
add({ sheet: 'body', section: 'Arm', id: 'arm-forearm', label: 'Forearm', sub: 'gold cuff', pivot: 'elbow', joints: armJ('wrist', DIM.FA), el: <ForeArm /> });
const hands: [Hand, string][] = [['fist', 'Fist'], ['open', 'Open'], ['thumb', 'Thumbs up'], ['point', 'Point'], ['relax', 'Relaxed']];
for (const [h, name] of hands) {
  add({ sheet: 'body', section: 'Arm', id: `hand-${h}`, label: `Hand · ${name}`, pivot: 'wrist', el: <HandG m={I} lm={I} type={h} /> });
}

/* ------------------------------------------------------------ leg */
add({
  sheet: 'body', section: 'Leg', id: 'leg-thigh', label: 'Thigh', sub: 'left · right is mirrored', pivot: 'hip', joints: armJ('knee', DIM.TH),
  el: <Part m={I} lm={I} d={thighD} fill={C.skin} shade={C.skinSh} off={12} inner={LEG_ACCENT} />,
});
add({
  sheet: 'body', section: 'Leg', id: 'leg-shin', label: 'Shin', sub: 'sandal straps', pivot: 'knee', joints: armJ('ankle', DIM.SH),
  el: (
    <Part
      m={I} lm={I} d={shinD} fill={C.skin} shade={C.skinSh} off={11}
      inner={
        <g>
          {LEG_ACCENT}
          <Line d="M-30 100 L26 124" w={7} c={C.sandal} />
          <Line d="M26 100 L-30 124" w={7} c={C.sandal} />
          <Line d="M-32 88 L30 88" w={6} c={C.sandal} />
        </g>
      }
      over={<Line d="M-14 -2 Q-2 8 10 0" w={4} c={C.line} o={0.7} />}
    />
  ),
});
add({
  sheet: 'body', section: 'Leg', id: 'leg-foot', label: 'Foot', sub: 'sandal · toes point outward', pivot: 'ankle',
  el: (
    <g>
      <path d={soleD} fill={C.sandal} stroke={C.ink} strokeWidth={5.5} strokeLinejoin="round" />
      <Part m={I} lm={I} d={footD} fill={C.skin} shade={C.skinSh} off={8} lw={6.25} inner={<Line d="M-30 -12 L-38 28" w={9} c={C.sandal} />} over={<Line d="M-60 8 Q-56 14 -60 20" w={3.5} o={0.7} />} />
    </g>
  ),
});
add({
  sheet: 'body', section: 'Leg', id: 'leg-knee-kneel', label: 'Knee · kneeling', sub: 'replaces the shin + foot', pivot: 'knee',
  el: (
    <g>
      <ellipse cx={0} cy={4} rx={30} ry={20} fill={C.skin} stroke={C.ink} strokeWidth={LW} />
      <Line d="M-14 0 Q0 10 14 0" w={4} c={C.line} o={0.7} />
    </g>
  ),
});

/* ------------------------------------------------------------ assembled reference */
const standing = plant(pose({}));
const rr = rig(standing);
const W = (m: Parameters<typeof rr.W>[0], x = 0, y = 0) => {
  const [a, b] = rr.W(m, x, y);
  return { x: Math.round(a * 10) / 10, y: Math.round(b * 10) / 10 };
};
items.push({
  sheet: 'body', section: 'Assembled', id: 'assembled', label: 'Assembled', sub: 'standing pose', kind: 'reference', pivot: 'ground',
  joints: [
    { name: 'neck', ...W(rr.head, 0, -30) },
    { name: 'waist', ...W(rr.torso, 0, -6) },
    { name: 'shoulder', ...W(rr.aL.shoulder) }, { name: 'shoulder', ...W(rr.aR.shoulder) },
    { name: 'elbow', ...W(rr.aL.elbow) }, { name: 'elbow', ...W(rr.aR.elbow) },
    { name: 'wrist', ...W(rr.aL.wrist) }, { name: 'wrist', ...W(rr.aR.wrist) },
    { name: 'hip', ...W(rr.lL.hip) }, { name: 'hip', ...W(rr.lR.hip) },
    { name: 'knee', ...W(rr.lL.knee) }, { name: 'knee', ...W(rr.lR.knee) },
    { name: 'ankle', ...W(rr.lL.ankle) }, { name: 'ankle', ...W(rr.lR.ankle) },
  ],
  svg: markup(<Hero p={standing} x={0} y={0} scale={1} shadow={false} />),
});

/* ------------------------------------------------------------ intro biceps */
const BI_SUB = 'intro arm · drawn 1.5–1.85× in the video';
for (const [fx, name] of [[0.15, 'rest'], [0.6, 'half flex'], [1, 'full flex'], [1.15, 'pump']] as [number, string][]) {
  add({
    sheet: 'biceps', section: 'Arm parts', id: `bicep-upper-${String(fx).replace('.', '_')}`, label: `Bicep · ${name}`, sub: `upper arm · flex ${fx}`,
    pivot: 'shoulder', joints: armJ('elbow', DIM.UA), el: <UpperArm flex={fx} />,
  });
}
add({ sheet: 'biceps', section: 'Arm parts', id: 'bicep-forearm', label: 'Forearm', sub: 'gold cuff', pivot: 'elbow', joints: armJ('wrist', DIM.FA), el: <ForeArm /> });
add({ sheet: 'biceps', section: 'Arm parts', id: 'bicep-fist', label: 'Fist', pivot: 'wrist', el: <HandG m={I} lm={I} type="fist" /> });
const flexPose = (id: string, label: string, sub: string, sh: number, el: number, flex: number) => {
  const a = armRig(0, 0, false, sh, el, -10);
  const j = (m: (typeof a)['elbow']) => {
    const [x, y] = ap(m, 0, 0);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };
  items.push({
    sheet: 'biceps', section: 'Intro keyframes', id, label, sub, kind: 'reference', pivot: 'shoulder',
    joints: [{ name: 'elbow', ...j(a.elbow) }, { name: 'wrist', ...j(a.wrist) }],
    svg: markup(<ArmG a={a} root={I} flex={flex} hand="fist" el={el} />),
  });
};
flexPose('bicep-pose-rise', '1 · Rise', 'arm swings up from below', 82, 14, 0.15);
flexPose('bicep-pose-curl', '2 · Curl', 'elbow bending', 82, 63, 0.6);
flexPose('bicep-pose-flex', '3 · Flex', 'full flex, then pumps', 82, 112, 1);
flexPose('bicep-pose-pump', '4 · Pump', 'peak of each pump', 86, 122, 1.15);

/* ------------------------------------------------------------ clouds */
const CloudArt: React.FC<{ w: number; h: number; seed: number; line?: string; uid: string }> = ({ w, h, seed, line = '#7FB8E6', uid }) => {
  const d = cloudPath(0, 0, w, h, seed);
  return (
    <g>
      <defs>
        <clipPath id={uid}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill="#D7ECFF" />
      <g clipPath={`url(#${uid})`}>
        <path d={d} fill="#FFFFFF" transform={`translate(${-w * 0.02} ${-h * 0.18})`} />
      </g>
      <path d={d} fill="none" stroke={line} strokeWidth={6} strokeLinejoin="round" />
    </g>
  );
};
const SKY = '#BFE9FF';
const clouds: [number, number, number, string][] = [
  [1, 360, 150, 'Puffy'], [3, 420, 170, 'Wide'], [5, 300, 130, 'Small'], [7, 360, 150, 'Bumpy'], [21, 300, 120, 'Flat'], [44, 260, 110, 'Little'],
];
for (const [seed, w, h, name] of clouds) {
  add({
    sheet: 'clouds', section: 'Video clouds', id: `cloud-${seed}`, label: `Cloud · ${name}`, sub: `${w}×${h}`, pivot: 'centre', bg: SKY,
    el: <CloudArt w={w} h={h} seed={seed} uid={`c${seed}`} />,
  });
}
add({
  sheet: 'clouds', section: 'Intro + app', id: 'cloud-intro', label: 'Intro cloud', sub: 'white outline', pivot: 'centre', bg: '#7FD0FF',
  el: <CloudArt w={420} h={170} seed={3} line="#FFFFFF" uid="ci" />,
});
add({
  sheet: 'clouds', section: 'Intro + app', id: 'cloud-app', label: 'App background cloud', sub: 'drifts behind every screen', pivot: 'centre', bg: '#A9E4FF',
  el: (
    <g transform="scale(1.6) translate(-110 -45)">
      <path d="M20 70C5 70 5 48 22 46 20 28 44 20 58 32 66 12 100 8 112 28 124 10 160 14 162 36 182 30 200 44 194 60 208 64 204 80 188 80H28C18 80 14 72 20 70Z" fill="white" stroke="#93CDF2" strokeWidth={4} />
    </g>
  ),
});

const out = process.argv[2] || 'out/parts-kit';
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/_raw.json`, JSON.stringify({ palette: C, lineWidth: LW, dims: DIM, items }, null, 1));
console.log(`${items.length} items → ${out}/_raw.json`);
