/* The members' heads. Same rig, same toga; the person changes: hairstyle, beard, glasses, eyes, brows, nose,
   mouth, head shape and colours, all read from the look (src/hero/looks.ts). Flexander keeps his own head in
   Hero.tsx; HeadG hands over to MemberHead for anyone whose look has face: 'person'.

   Head space is the same as Flexander's: chin at (0, 4), crown at (0, -304), ears at x ≈ ±114..158. */
import React, { useId } from 'react';
import { M, svgM, localLight } from '../lib/m2';
import { heartPath, softStar } from '../lib/shape';
import { Look, useLook, HairStyle } from './looks';
import { C, LW, Line, Mouth, Sweat, hairCols, Pose, LEAVES, LEAF_D } from './Hero';

type Pt = [number, number] | [number, number, 1];
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

/** A smooth path through points; a point with a third value 1 is a sharp corner (a lock tip). */
export function hairPath(pts: Pt[], closed = true, k = 1): string {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const s1 = p1[2] === 1, s2 = p2[2] === 1;
    const c1x = s1 ? p1[0] + (p2[0] - p1[0]) * 0.3 : p1[0] + ((p2[0] - p0[0]) / 6) * k;
    const c1y = s1 ? p1[1] + (p2[1] - p1[1]) * 0.3 : p1[1] + ((p2[1] - p0[1]) / 6) * k;
    const c2x = s2 ? p2[0] - (p2[0] - p1[0]) * 0.3 : p2[0] - ((p3[0] - p1[0]) / 6) * k;
    const c2y = s2 ? p2[1] - (p2[1] - p1[1]) * 0.3 : p2[1] - ((p3[1] - p1[1]) / 6) * k;
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/* ------------------------------------------------------------------ head shape */
/* The face, left half from the chin up to the crown: widest at the cheekbones, tapering to a rounded chin. */
const FACE_HALF: [number, number][] = [
  [0, 6], [-28, 4], [-54, -6], [-78, -24], [-97, -50], [-111, -80], [-120, -112], [-124, -144], [-124, -176],
  [-120, -206], [-112, -238], [-96, -268], [-70, -292], [-36, -305], [0, -309],
];
/** Reshape a head-space point for this look: jaw (wider/narrower lower face), chin (longer face), cheek (fuller). */
export function shapePt(look: Look, x: number, y: number): [number, number] {
  const H = look.head;
  const low = y > -150 ? Math.min(1, (y + 150) / 150) : 0;
  const cheekBump = Math.exp(-(((y + 105) / 38) ** 2));
  const chinZone = y > -70 ? Math.min(1, (y + 70) / 74) : 0;
  return [x * (1 + H.jaw * low) + Math.sign(x) * H.cheek * 12 * cheekBump, y + H.chin * chinZone];
}
/** shapePt, then the turn: the jaw swings toward the turn and the far side tucks in */
function turned(look: Look, x: number, y: number, t: number): Pt {
  const [sx, sy] = shapePt(look, x, y);
  const low = sy > -150 ? Math.min(1, (sy + 150) / 150) : 0;
  const high = sy < -150 ? Math.min(1, (-150 - sy) / 150) : 0;
  const side = Math.sign(sx) === Math.sign(t) ? 1 : 0.55;
  return [sx + t * (30 * low * side - 8 * high), sy];
}
function memberHeadPath(look: Look, t: number) {
  const left = FACE_HALF.map(([x, y]) => turned(look, x, y, t));
  const right = FACE_HALF.slice(1, -1).map(([x, y]) => turned(look, -x, y, t)).reverse();
  return hairPath([...left, ...right], true, 0.95);
}
/** x of the (unturned, unshaped) face edge at height y, left side */
const faceX = (y: number) => {
  for (let i = 0; i < FACE_HALF.length - 1; i++) {
    const [x0, y0] = FACE_HALF[i], [x1, y1] = FACE_HALF[i + 1];
    if (y <= y0 && y >= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return -120;
};

/* ------------------------------------------------------------------ hairstyles */
/* sil: the outer silhouette, left temple → over the top → right temple (drawn behind the head).
   edge: the hairline or fringe seen on the forehead, left → right (drawn over the head).
   lines: texture strokes. ears: the hair hangs over the tops of the ears. */
type Stroke = [string, 'mid' | 'lite' | 'curl' | 'dark', number];
type HairDef = {
  sil: Pt[]; edge: Pt[]; lines: Stroke[]; ears?: boolean; burn?: number;
  /** the front piece takes the silhouette points above this height (default: all of it with ears, else -206) */
  cut?: number;
};
const HAIR: Record<Exclude<HairStyle, 'flex'>, HairDef> = {
  // Osim: short sides, a messy top pushed up and a little to his left
  swept: {
    sil: [[-124, -196], [-134, -236], [-131, -276], [-116, -306], [-96, -330], [-74, -346], [-52, -354], [-30, -360], [-6, -366], [18, -362], [40, -366], [62, -356], [84, -348], [104, -326], [121, -300], [132, -266], [134, -232], [126, -196]],
    edge: [[-118, -212], [-117, -238], [-106, -258], [-86, -270], [-60, -276], [-36, -276], [-14, -272], [8, -276], [32, -278], [58, -278], [82, -272], [100, -262], [113, -244], [118, -212]],
    lines: [
      ['M-80 -278 C-84 -304 -70 -328 -50 -346', 'mid', 7], ['M-36 -280 C-34 -308 -20 -334 0 -356', 'mid', 7],
      ['M10 -282 C18 -310 32 -334 50 -350', 'mid', 6], ['M54 -280 C66 -302 80 -320 92 -332', 'mid', 6],
      ['M-104 -292 C-92 -318 -76 -334 -60 -342', 'lite', 5], ['M-16 -282 C-10 -304 2 -324 18 -340', 'dark', 4.5],
      ['M30 -282 C40 -302 52 -318 66 -330', 'dark', 4], ['M-58 -350 Q-44 -362 -26 -362', 'lite', 4],
    ],
  },
  // Phil: middle part, curtain bangs that sweep down and out to the temples and flick out, thick sides that flare
  // out and flick over the tops of the ears
  curtain: {
    sil: [[-122, -190], [-148, -184, 1], [-152, -204], [-160, -214, 1], [-154, -236], [-158, -266], [-146, -300], [-122, -330], [-86, -350], [-48, -360], [-18, -356], [0, -346, 1], [16, -358], [48, -364], [86, -354], [120, -332], [144, -302], [156, -268], [152, -240], [164, -218, 1], [154, -206], [152, -186, 1], [124, -190]],
    edge: [[-122, -192], [-130, -212], [-128, -236], [-124, -252], [-110, -232, 1], [-98, -250], [-78, -258], [-56, -266], [-36, -280], [-20, -298], [-6, -316, 1], [8, -298], [24, -280], [44, -268], [66, -260], [88, -252], [104, -234, 1], [116, -252], [128, -236], [130, -212], [124, -192]],
    lines: [
      ['M-8 -340 C-26 -322 -52 -298 -82 -284 C-98 -276 -106 -262 -110 -240', 'mid', 7], ['M-12 -320 C-30 -300 -56 -280 -90 -270', 'dark', 4.5],
      ['M6 -342 C26 -324 52 -302 82 -288 C98 -280 104 -264 106 -244', 'mid', 7], ['M10 -320 C30 -302 58 -282 92 -272', 'dark', 4.5],
      ['M-40 -350 C-82 -340 -118 -314 -134 -276 C-142 -256 -142 -236 -150 -214', 'lite', 5], ['M42 -352 C84 -342 120 -316 136 -280 C144 -260 144 -240 154 -220', 'lite', 4.5],
      ['M-30 -338 C-58 -322 -84 -304 -100 -282', 'dark', 4], ['M30 -338 C58 -322 84 -304 100 -282', 'dark', 4],
      ['M-138 -250 C-142 -230 -140 -210 -146 -196', 'dark', 4], ['M138 -250 C142 -230 140 -210 146 -196', 'dark', 4],
    ],
    cut: -180,
    burn: 0,
  },
  // Dylan: medium length and messy, swept up and over to his right, lighter at the ends
  fringe: {
    sil: [[-130, -192], [-142, -230], [-140, -270], [-128, -300, 1], [-112, -310], [-104, -332, 1], [-84, -340], [-70, -362, 1], [-48, -360], [-28, -378, 1], [-6, -368], [14, -380, 1], [34, -366], [58, -372, 1], [74, -356], [98, -350, 1], [108, -330], [126, -310], [138, -278], [140, -238], [130, -192]],
    edge: [[-128, -196], [-128, -220], [-122, -238, 1], [-108, -240], [-96, -252, 1], [-80, -254], [-66, -268, 1], [-48, -266], [-32, -272], [-10, -280], [14, -282], [40, -280], [64, -276], [88, -268], [106, -254], [118, -236], [124, -214], [128, -196]],
    lines: [
      ['M96 -300 C60 -306 20 -310 -24 -296', 'mid', 7], ['M110 -280 C70 -290 30 -292 -12 -282', 'dark', 4.5],
      ['M64 -340 C28 -340 -18 -332 -62 -300', 'mid', 7], ['M30 -362 C-10 -356 -54 -340 -92 -308', 'lite', 5],
      ['M-26 -330 C-64 -318 -96 -296 -116 -262', 'mid', 6], ['M4 -318 C-34 -306 -72 -288 -100 -256', 'lite', 4],
      ['M-60 -350 Q-80 -340 -96 -322', 'lite', 4],
    ],
  },
  // Connor: short sides, the front swept up and back into a tidy quiff
  quiff: {
    sil: [[-124, -196], [-133, -236], [-128, -274], [-110, -304], [-84, -330], [-50, -352], [-12, -372], [28, -378], [66, -366], [98, -340], [120, -302], [130, -260], [131, -228], [126, -196]],
    edge: [[-118, -212], [-117, -240], [-106, -260], [-88, -272], [-66, -278], [-46, -282], [-28, -286], [-10, -282], [12, -284], [38, -282], [64, -282], [90, -274], [108, -258], [116, -240], [118, -212]],
    lines: [
      ['M-50 -286 C-54 -320 -38 -352 -6 -368', 'mid', 7], ['M-4 -288 C2 -322 28 -350 64 -360', 'mid', 7],
      ['M44 -286 C58 -312 82 -330 108 -326', 'mid', 6], ['M-94 -298 C-82 -330 -54 -354 -20 -366', 'lite', 5],
      ['M-26 -288 C-18 -316 4 -342 36 -356', 'dark', 4.5], ['M-74 -282 Q-84 -302 -92 -314', 'dark', 4],
    ],
  },
  // Gaurav: messy, medium length, swept over to his right, locks over the forehead and the ears
  shaggy: {
    sil: [[-140, -166], [-152, -206], [-152, -252], [-138, -294], [-114, -326], [-80, -346], [-50, -362, 1], [-26, -354], [2, -370, 1], [28, -360], [58, -368, 1], [82, -350], [112, -332], [134, -300], [148, -258], [150, -214], [142, -172]],
    edge: [[-140, -168], [-134, -190], [-126, -206, 1], [-110, -214], [-98, -230, 1], [-82, -232], [-70, -246, 1], [-52, -248], [-38, -258, 1], [-18, -258], [-2, -268, 1], [20, -264], [42, -270], [66, -268], [90, -260], [108, -248], [122, -232], [132, -212], [140, -190], [142, -170]],
    lines: [
      ['M40 -350 C0 -340 -40 -312 -66 -258', 'mid', 7], ['M80 -336 C46 -324 10 -300 -16 -262', 'mid', 7],
      ['M-30 -340 C-70 -324 -100 -292 -114 -240', 'mid', 6], ['M-80 -340 C-112 -320 -134 -286 -142 -236', 'lite', 5],
      ['M10 -330 C-20 -314 -46 -290 -64 -256', 'dark', 4.5], ['M112 -318 C124 -290 128 -258 126 -232', 'dark', 4.5],
      ['M60 -330 C34 -314 12 -292 -2 -266', 'dark', 4],
    ],
    ears: true,
  },
  // Dean: short and scruffy, pushed forward and up at the front
  tousled: {
    sil: [[-124, -196], [-134, -236], [-130, -276], [-110, -306], [-86, -326], [-60, -340, 1], [-44, -334], [-24, -352, 1], [-6, -342], [14, -356, 1], [32, -344], [54, -352, 1], [74, -336], [98, -322], [118, -294], [130, -260], [132, -228], [126, -196]],
    edge: [[-118, -212], [-117, -240], [-106, -258], [-90, -266], [-72, -272, 1], [-60, -262], [-46, -280, 1], [-32, -268], [-16, -286, 1], [-2, -270], [14, -286, 1], [28, -272], [46, -284, 1], [62, -272], [82, -276, 1], [98, -262], [110, -248], [118, -212]],
    lines: [
      ['M-58 -278 C-62 -302 -54 -320 -38 -332', 'mid', 6], ['M-8 -284 C-4 -306 6 -326 22 -342', 'mid', 6],
      ['M40 -286 C50 -304 66 -318 86 -322', 'mid', 6], ['M-96 -294 C-82 -318 -62 -332 -40 -338', 'lite', 4.5],
      ['M-32 -280 Q-30 -300 -20 -316', 'dark', 4], ['M24 -288 Q30 -304 42 -316', 'dark', 4],
    ],
  },
  // Amaan: tight curls piled on top and falling onto the forehead, short faded sides
  curls: {
    sil: [[-124, -196], [-132, -232], [-134, -264, 1], [-146, -284], [-140, -312, 1], [-150, -334], [-128, -352, 1], [-120, -376], [-92, -380, 1], [-74, -398], [-46, -390, 1], [-24, -404], [2, -392, 1], [26, -404], [50, -390, 1], [76, -396], [94, -378, 1], [122, -374], [128, -350, 1], [150, -332], [140, -310, 1], [148, -284], [134, -264, 1], [132, -232], [126, -196]],
    edge: [[-120, -212], [-120, -236], [-114, -252], [-100, -262, 1], [-92, -246], [-76, -250], [-68, -266, 1], [-56, -252], [-40, -254], [-32, -238, 1], [-18, -252], [0, -254], [8, -270, 1], [22, -254], [40, -254], [50, -268, 1], [64, -254], [82, -258], [96, -266, 1], [108, -252], [116, -238], [120, -212]],
    lines: [
      ['M-96 -300 C-100 -318 -82 -326 -74 -312 C-68 -302 -80 -296 -84 -304', 'curl', 6], ['M-46 -330 C-50 -350 -30 -356 -22 -342 C-16 -332 -30 -326 -34 -334', 'curl', 6],
      ['M10 -352 C8 -372 30 -376 36 -362 C40 -350 26 -346 22 -354', 'curl', 6], ['M60 -316 C58 -334 78 -338 84 -324 C88 -314 74 -310 70 -318', 'curl', 6],
      ['M-28 -290 C-30 -306 -12 -310 -6 -298', 'curl', 5.5], ['M20 -296 C20 -312 38 -314 42 -302', 'curl', 5.5],
      ['M-118 -330 C-122 -346 -104 -352 -98 -340', 'curl', 5.5], ['M100 -340 C98 -356 116 -360 122 -348', 'curl', 5.5],
      ['M-76 -366 C-66 -380 -48 -386 -34 -380', 'lite', 4.5], ['M-62 -276 Q-54 -290 -40 -288', 'dark', 4], ['M56 -278 Q66 -292 80 -286', 'dark', 4],
      ['M-110 -246 Q-118 -226 -114 -206', 'mid', 4], ['M110 -246 Q118 -226 114 -206', 'mid', 4],
    ],
  },
  // Jake: short and a bit wavy, swept up and over to his right
  wave: {
    sil: [[-124, -196], [-134, -238], [-130, -280], [-110, -312], [-82, -334], [-56, -348, 1], [-30, -348], [-4, -362, 1], [22, -354], [48, -362, 1], [72, -346], [100, -326], [120, -292], [131, -250], [126, -196]],
    edge: [[-118, -212], [-117, -238], [-106, -258], [-88, -270], [-64, -276], [-40, -276], [-18, -282], [4, -288], [26, -284], [50, -280], [76, -282], [98, -270], [112, -250], [118, -212]],
    lines: [
      ['M60 -286 C30 -300 -4 -320 -36 -340', 'mid', 7], ['M10 -290 C-20 -302 -52 -318 -80 -330', 'mid', 7],
      ['M-30 -282 C-56 -292 -84 -306 -106 -300', 'mid', 6], ['M100 -296 C70 -316 34 -338 0 -352', 'lite', 5],
      ['M34 -288 C4 -300 -26 -316 -52 -332', 'dark', 4.5], ['M-6 -286 C-34 -296 -62 -310 -88 -316', 'dark', 4],
    ],
  },
  // Ayaad: longer and wavy, parted down the middle, swept back with locks falling onto the forehead, waves over the
  // ears that flick out at the ends
  flow: {
    sil: [[-128, -144], [-150, -128, 1], [-156, -152], [-168, -140, 1], [-162, -170], [-158, -198], [-170, -230], [-162, -268], [-146, -302], [-118, -334], [-80, -356], [-42, -366], [-14, -362], [0, -352, 1], [16, -364], [50, -368], [90, -354], [126, -330], [152, -294], [166, -258], [172, -222], [160, -192], [166, -164], [170, -138, 1], [158, -148], [154, -124, 1], [130, -144]],
    edge: [[-128, -146], [-138, -170], [-132, -196, 1], [-130, -220], [-118, -240], [-100, -228, 1], [-90, -250], [-70, -260], [-50, -268], [-34, -282], [-22, -266, 1], [-14, -294], [-4, -314, 1], [8, -296], [22, -280], [42, -270], [64, -262], [86, -254], [102, -234, 1], [114, -250], [128, -232], [136, -204, 1], [142, -178], [132, -146]],
    lines: [
      ['M-10 -342 C-30 -326 -46 -310 -54 -296 C-62 -280 -80 -270 -100 -262 C-116 -254 -124 -240 -128 -222', 'mid', 7], ['M-12 -320 C-24 -304 -30 -290 -30 -276', 'dark', 4.5],
      ['M8 -344 C30 -328 50 -312 62 -298 C74 -282 92 -274 108 -264 C122 -254 128 -238 132 -218', 'mid', 7], ['M12 -322 C30 -304 52 -288 76 -278', 'dark', 4.5],
      ['M-46 -356 C-90 -344 -126 -316 -144 -272 C-152 -246 -146 -222 -152 -196 C-156 -176 -150 -160 -160 -146', 'lite', 5], ['M46 -358 C92 -346 128 -318 148 -274 C158 -248 154 -222 158 -196 C162 -176 156 -160 166 -146', 'lite', 4.5],
      ['M-142 -238 C-152 -216 -146 -196 -150 -172', 'dark', 4.5], ['M142 -238 C152 -216 146 -196 150 -172', 'dark', 4.5],
      ['M-60 -338 C-92 -322 -116 -296 -126 -264', 'dark', 4], ['M60 -340 C92 -324 116 -298 126 -266', 'dark', 4],
    ],
    ears: true,
  },
};

/* ------------------------------------------------------------------ beards */
/* A short beard: a band along the jaw from the sideburns that widens toward the chin and wraps the chin under the
   mouth. It's drawn as a light wash of the beard colour with lots of small dots on top (denser low on the jaw,
   thinning out toward the cheeks), so the skin shows through. It's clipped to the face, so the head never gets
   bigger. Stubble is the same idea, lighter, over the lower cheeks. */
const rnd = (seed: number) => {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const inPoly = (x: number, y: number, poly: Pt[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const distTo = (x: number, y: number, line: Pt[]) => {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
};
const dotsPath = (pts: [number, number, number][]) =>
  pts.map(([x, y, r]) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`).join('');

/** The beard's edges in head space before the look's shaping and the turn (base), plus the mapper to place them. */
function beardBase(look: Look) {
  const b = look.beard!.band;
  const innerHalf: Pt[] = [
    [faceX(-186) + 8, -186], [faceX(-156) + b * 0.6, -156], [faceX(-126) + b * 0.8, -126], [faceX(-98) + b, -98],
    [faceX(-76) + b * 1.15, -76], [-54 - b * 0.25, -70], [-46, -70],
  ];
  const inner: Pt[] = [...innerHalf.map(([x, y]) => [-x, y] as Pt), ...[...innerHalf].reverse()];
  const outerHalf: Pt[] = [[-134, -190], [-140, -120], [-128, -50], [-90, -2], [-40, 16]];
  const outer: Pt[] = [...outerHalf, [0, 22], ...[...outerHalf].reverse().map(([x, y]) => [-x, y] as Pt)];
  const shadowHalf: Pt[] = [[-110, -188], [-104, -156], [-92, -128], [-76, -108], [-60, -94], [-48, -84]];
  const shadowTop: Pt[] = [...shadowHalf.map(([x, y]) => [-x, y] as Pt), ...[...shadowHalf].reverse()];
  return { inner, outer, shadowTop };
}

const Beard: React.FC<{ look: Look; tn: number; clip: string }> = ({ look, tn, clip }) => {
  const B = look.beard!;
  const base = beardBase(look);
  const sh = (p: Pt): Pt => turned(look, p[0], p[1], tn);
  const stubble = B.style === 'stubble';
  const top = stubble ? base.shadowTop : base.inner;
  const region: Pt[] = [...base.outer, ...top];
  const fill = hairPath(region.map(sh), true, 0.8);
  // dots, placed in base space so they stay put when he turns, thinning toward the top edge
  const R = rnd(look.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const step = stubble ? 9 : 7;
  const dots: [number, number, number][] = [];
  for (let y = -194; y <= 22; y += step) {
    for (let x = -142; x <= 142; x += step) {
      const px = x + (R() - 0.5) * step * 0.95, py = y + (R() - 0.5) * step * 0.95;
      if (!inPoly(px, py, region)) continue;
      const f = Math.min(1, distTo(px, py, top) / (stubble ? 22 : 15));
      if (R() > (stubble ? 0.15 + 0.45 * f : 0.25 + 0.75 * f)) continue;
      const r = stubble ? 1.2 + 0.7 * R() : 1.5 + (1.1 + 0.6 * R()) * f;
      const [qx, qy] = sh([px, py]);
      dots.push([qx, qy, r]);
    }
  }
  return (
    <g clipPath={`url(#${clip})`}>
      <path d={fill} fill={B.color} opacity={stubble ? B.shadow : (B.alpha ?? 0.4)} />
      <path d={dotsPath(dots)} fill={B.color} opacity={stubble ? 0.55 : 0.85} />
    </g>
  );
};

const Mustache: React.FC<{ look: Look; tn: number; top: number }> = ({ look, tn, top }) => {
  const B = look.beard!;
  const id = 'ms' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const x = tn * 22;
  const thin = B.mustache === 'thin';
  const w = thin ? 40 : 50;
  const h = thin ? 6 : B.band < 11 ? 8 : 10;
  const y0 = top - h - 1;
  // a band over the top lip; on a beard its ends run down past the mouth corners into the chin
  const droop = thin ? 3 : B.style === 'stubble' ? 5 : 12;
  const d = `M${x - w} ${y0 + h + droop} Q${x - w * 0.75} ${y0 - 1} ${x - 10} ${y0} Q${x} ${y0 + 4} ${x + 10} ${y0} Q${x + w * 0.75} ${y0 - 1} ${x + w} ${y0 + h + droop} ` +
    `Q${x + w * 0.9} ${y0 + h + 2} ${x + w * 0.62} ${y0 + h + 1} Q${x} ${y0 + h + 4} ${x - w * 0.62} ${y0 + h + 1} Q${x - w * 0.9} ${y0 + h + 2} ${x - w} ${y0 + h + droop}Z`;
  const R = rnd(7 + look.id.length * 101);
  const dots: [number, number, number][] = [];
  for (let yy = y0 - 2; yy <= y0 + h + droop + 2; yy += 4.5) {
    for (let xx = x - w - 2; xx <= x + w + 2; xx += 5) dots.push([xx + (R() - 0.5) * 3, yy + (R() - 0.5) * 3, thin ? 1.4 : 1.6 + R() * 0.8]);
  }
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={B.color} opacity={B.style === 'stubble' ? 0.45 : Math.min(0.75, (B.alpha ?? 0.4) + 0.25)} />
      <path d={dotsPath(dots)} fill={B.color} opacity={0.9} clipPath={`url(#${id})`} />
    </g>
  );
};

/* ------------------------------------------------------------------ face parts */
const almond = (cx: number, cy: number, rx: number, ry: number, tilt: number) =>
  `M${f1(cx - rx)} ${f1(cy + tilt)} C${f1(cx - rx * 0.55)} ${f1(cy - ry * 1.32)} ${f1(cx + rx * 0.55)} ${f1(cy - ry * 1.32)} ${f1(cx + rx)} ${f1(cy - tilt)} ` +
  `C${f1(cx + rx * 0.6)} ${f1(cy + ry * 0.98)} ${f1(cx - rx * 0.6)} ${f1(cy + ry * 0.98)} ${f1(cx - rx)} ${f1(cy + tilt)}Z`;

const PersonEye: React.FC<{ cx: number; cy: number; rx: number; ry: number; p: Pose; side: -1 | 1; look: Look }> = ({ cx, cy, rx, ry, p, side, look }) => {
  const id = 'pe' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const K = look.skin;
  const tilt = (look.eye.tilt ?? 0) * side;
  if (p.eyes >= 0.5 || (side === 1 && p.wink >= 0.5)) {
    return <Line d={`M${f1(cx - rx * 0.95)} ${f1(cy + 6)} Q${f1(cx)} ${f1(cy - ry * 1.25)} ${f1(cx + rx * 0.95)} ${f1(cy + 6)}`} w={7.5} />;
  }
  if (p.eyeMode === 'heart') {
    return <path d={heartPath(cx, cy, rx * 1.15)} fill={C.heart} stroke={C.ink} strokeWidth={5.5} strokeLinejoin="round" />;
  }
  const d = almond(cx, cy, rx, ry, tilt);
  const px = cx + p.lookX * rx * 0.4;
  const py = cy + p.lookY * ry * 0.35 + 1;
  const ir = ry * 0.86 * p.pupil;
  const lid = Math.max(0, Math.min(0.92, look.eye.lid + p.lid));
  const lidY = cy - ry * 1.05 + lid * ry * 2;
  const btilt = p.browTilt * -6 * side;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={C.white} />
      <g clipPath={`url(#${id})`}>
        <path d={`M${cx - rx - 4} ${cy - ry * 1.4} H${cx + rx + 4} V${cy - ry * 0.45} Q${cx} ${cy - ry * 0.75} ${cx - rx - 4} ${cy - ry * 0.45}Z`} fill={C.eyeSh} />
        {p.eyeMode === 'star' ? (
          <path d={softStar(px, py, ry * 1.05, ry * 0.45, 5)} fill={C.gold} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
        ) : p.eyeMode === 'spiral' ? (
          <path d={`M${cx} ${cy} m-3 0 a3 3 0 1 1 6 0 a6 6 0 1 1 -12 0 a9 9 0 1 1 18 0 a12 12 0 1 1 -24 0`} fill="none" stroke={C.ink} strokeWidth={3} />
        ) : (
          <>
            <circle cx={px} cy={py} r={ir} fill={look.eye.iris} stroke={C.ink} strokeWidth={2.5} />
            <circle cx={px} cy={py} r={ir * 0.52} fill={C.ink} />
            <circle cx={px - ir * 0.36} cy={py - ir * 0.4} r={ir * 0.3} fill={C.white} />
            <circle cx={px + ir * 0.35} cy={py + ir * 0.32} r={ir * 0.12} fill={C.white} opacity={0.85} />
          </>
        )}
        {lid > 0.01 ? (
          <path d={`M${cx - rx - 6} ${cy - ry * 1.6} H${cx + rx + 6} V${lidY - btilt} Q${cx} ${lidY + 5} ${cx - rx - 6} ${lidY + btilt}Z`} fill={K.face} stroke={C.ink} strokeWidth={5.5} />
        ) : null}
      </g>
      {/* lash line on top, a light line underneath */}
      <path d={`M${f1(cx - rx - 2)} ${f1(cy + tilt + 1)} C${f1(cx - rx * 0.55)} ${f1(cy - ry * 1.32)} ${f1(cx + rx * 0.55)} ${f1(cy - ry * 1.32)} ${f1(cx + rx + 3)} ${f1(cy - tilt - 1)}`} fill="none" stroke={C.ink} strokeWidth={6.5} strokeLinecap="round" />
      <path d={`M${f1(cx + rx)} ${f1(cy - tilt)} C${f1(cx + rx * 0.6)} ${f1(cy + ry * 0.98)} ${f1(cx - rx * 0.6)} ${f1(cy + ry * 0.98)} ${f1(cx - rx)} ${f1(cy + tilt)}`} fill="none" stroke={C.ink} strokeWidth={3.2} strokeLinecap="round" opacity={0.8} />
    </g>
  );
};

/** A brow: thick at the inner end, tapering out, in the brow colour with an ink edge. */
function browShape(xi: number, yi: number, xp: number, yp: number, xo: number, yo: number, w: number) {
  const N = 10;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * xi + 2 * (1 - t) * t * xp + t * t * xo;
    const y = (1 - t) * (1 - t) * yi + 2 * (1 - t) * t * yp + t * t * yo;
    const dx = 2 * (1 - t) * (xp - xi) + 2 * t * (xo - xp);
    const dy = 2 * (1 - t) * (yp - yi) + 2 * t * (yo - yp);
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const hw = (w / 2) * (1 - 0.68 * t ** 1.3) * (t < 0.08 ? 0.75 + 3 * t : 1);
    top.push([x + nx * hw, y + ny * hw]);
    bot.push([x - nx * hw, y - ny * hw]);
  }
  const pts = [...top, ...bot.reverse()];
  return 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L') + 'Z';
}

/* ------------------------------------------------------------------ the face */
export const MemberFace: React.FC<{ p: Pose; look: Look }> = ({ p, look }) => {
  const K = look.skin;
  const tn = p.turn;
  const ex = tn * 20;
  const E = look.eye;
  const rxL = E.rx * (1 - 0.22 * Math.max(0, -tn));
  const rxR = E.rx * (1 - 0.22 * Math.max(0, tn));
  const cxL = -E.gap + ex - 4 * Math.max(0, -tn);
  const cxR = E.gap + ex + 4 * Math.max(0, tn);
  const eyeL = <PersonEye key="l" cx={cxL} cy={E.y} rx={rxL} ry={E.ry} p={p} side={-1} look={look} />;
  const eyeR = <PersonEye key="r" cx={cxR} cy={E.y} rx={rxR} ry={E.ry} p={p} side={1} look={look} />;
  // brows
  const B = look.brow;
  const brow = (s: -1 | 1) => {
    const cx = s === -1 ? cxL : cxR;
    const lift = p.brow * 12 + B.raise[s === -1 ? 0 : 1] * 16;
    const tiltIn = (p.browTilt + B.tilt) * 10;
    const xi = cx - s * B.len * 0.48;
    const xo = cx + s * B.len * 0.52;
    const yi = B.y - lift - tiltIn + 2;
    const yo = B.y - lift + 6 + (p.browTilt + B.tilt) * 4;
    const xp = cx + s * B.len * 0.08;
    const yp = B.y - lift - B.arch - B.raise[s === -1 ? 0 : 1] * 6 - tiltIn * 0.4;
    return <path key={s} d={browShape(xi, yi, xp, yp, xo, yo, B.w)} fill={B.color} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />;
  };
  // nose
  const N = look.nose;
  const nx = tn * 26;
  const nose = (
    <g>
      <ellipse cx={nx + 3} cy={N.tip + 4} rx={N.w * 0.95} ry={9} fill={K.sh} opacity={0.45} />
      <path d={`M${nx + N.bridge} ${N.top} C${nx + N.bridge + 3} ${N.top + 22} ${nx + N.w * 0.62} ${N.tip - 30} ${nx + N.w * 0.82} ${N.tip - 12}`} fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
      <path d={`M${nx - N.w} ${N.tip - 9} Q${nx - N.w - 7} ${N.tip + 5} ${nx - N.w * 0.42} ${N.tip + 6} Q${nx} ${N.tip + 13} ${nx + N.w * 0.42} ${N.tip + 6} Q${nx + N.w + 7} ${N.tip + 5} ${nx + N.w} ${N.tip - 9}`} fill={K.face} stroke={C.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={nx - N.w * 0.4} cy={N.tip + 2} rx={5} ry={3.2} fill={K.line} />
      <ellipse cx={nx + N.w * 0.4} cy={N.tip + 2} rx={5} ry={3.2} fill={K.line} />
      <ellipse cx={nx - 5} cy={N.tip - 8} rx={7} ry={4} fill={K.hi} opacity={0.8} />
    </g>
  );
  // mouth
  const Mo = look.mouth;
  const closed = p.mouthMode === 'grin' && p.mouthOpen < 0.25;
  const mx = tn * 18;
  const my = -70 + Mo.y;
  const s = p.smile;
  const W = 50 * Mo.w;
  let mouth: React.ReactNode;
  let mouthTop = my - 8;
  if (closed && (Mo.rest === 'smile' || Mo.rest === 'flat' || Mo.rest === 'smirk')) {
    const sk = p.mouthSkew * 8;
    let d: string;
    if (Mo.rest === 'smile') d = `M${mx - W} ${my - 8 * s + sk} Q${mx} ${my + 12 + 4 * s} ${mx + W} ${my - 8 * s - sk}`;
    else if (Mo.rest === 'flat') d = `M${mx - W * 0.78} ${my + 1 + sk} Q${mx} ${my + 4 - 3 * s} ${mx + W * 0.78} ${my - 3 - sk}`;
    else d = `M${mx - W * 0.8} ${my + 4 + sk} Q${mx + W * 0.05} ${my + 8} ${mx + W * 0.86} ${my - 12 - 6 * s - sk}`;
    mouthTop = my - 4;
    mouth = (
      <g>
        <Line d={d} w={6.5} />
        {Mo.rest === 'smile' && s > 0.3 ? (
          <>
            <Line d={`M${mx - W - 6} ${my - 14 * s} Q${mx - W - 10} ${my - 4} ${mx - W - 4} ${my + 4}`} w={3.5} o={0.8} />
            <Line d={`M${mx + W + 6} ${my - 14 * s} Q${mx + W + 10} ${my - 4} ${mx + W + 4} ${my + 4}`} w={3.5} o={0.8} />
          </>
        ) : null}
        {Mo.rest === 'smirk' ? <Line d={`M${mx + W * 0.84} ${my - 22 - 6 * s} Q${mx + W + 6} ${my - 12} ${mx + W * 0.92} ${my - 2}`} w={3.5} o={0.8} /> : null}
        <Line d={`M${mx - 12} ${my + 18} Q${mx} ${my + 23} ${mx + 12} ${my + 18}`} w={3.5} c={K.line} o={0.55} />
      </g>
    );
  } else {
    const big = closed && Mo.rest === 'big';
    const q = big ? { ...p, smile: Math.max(p.smile, 1.3) } : p;
    const sx = Mo.w * 0.72 * (big ? 1.1 : 1);
    const sy = big ? 0.92 : 0.8;
    mouthTop = my - 14;
    mouth = (
      <g transform={`translate(${mx} ${my}) scale(${sx} ${sy}) translate(${-mx} 78)`}>
        <Mouth p={q} />
      </g>
    );
  }
  // freckles
  const fr = look.freckles;
  const FRK: [number, number][] = [[-70, -132], [-54, -140], [-82, -120], [-62, -118], [-44, -128], [70, -132], [54, -140], [82, -120], [62, -118], [44, -128], [-12, -150], [10, -146], [0, -158]];
  // glasses
  const G = look.glasses;
  const lens = (cx: number, rx: number) => {
    const w = (rx / E.rx) * G!.w;
    return `M${f1(cx - w / 2 + G!.r)} ${f1(E.y + G!.y - G!.h / 2)} H${f1(cx + w / 2 - G!.r)} Q${f1(cx + w / 2)} ${f1(E.y + G!.y - G!.h / 2)} ${f1(cx + w / 2)} ${f1(E.y + G!.y - G!.h / 2 + G!.r)} V${f1(E.y + G!.y + G!.h / 2 - G!.r)} Q${f1(cx + w / 2)} ${f1(E.y + G!.y + G!.h / 2)} ${f1(cx + w / 2 - G!.r * 1.4)} ${f1(E.y + G!.y + G!.h / 2)} H${f1(cx - w / 2 + G!.r * 1.4)} Q${f1(cx - w / 2)} ${f1(E.y + G!.y + G!.h / 2)} ${f1(cx - w / 2)} ${f1(E.y + G!.y + G!.h / 2 - G!.r)} V${f1(E.y + G!.y - G!.h / 2 + G!.r)} Q${f1(cx - w / 2)} ${f1(E.y + G!.y - G!.h / 2)} ${f1(cx - w / 2 + G!.r)} ${f1(E.y + G!.y - G!.h / 2)}Z`;
  };
  const glasses = G ? (() => {
    const wl = (rxL / E.rx) * G.w, wr = (rxR / E.rx) * G.w;
    const gy = E.y + G.y;
    const top = gy - G.h / 2;
    return (
      <g>
        {/* arms back to the ears */}
        <Line d={`M${cxL - wl / 2} ${top + 10} L${-124 + tn * 10} ${top + 4}`} w={6.5} c={G.frame} />
        <Line d={`M${cxR + wr / 2} ${top + 10} L${124 + tn * 10} ${top + 4}`} w={6.5} c={G.frame} />
        {[[cxL, rxL], [cxR, rxR]].map(([cx, rx], i) => (
          <g key={i}>
            <path d={lens(cx, rx)} fill={G.lens} opacity={0.22} />
            <path d={`M${cx - 12} ${top + 8} L${cx - 28} ${top + 30} M${cx + 2} ${top + 8} L${cx - 20} ${top + 38}`} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
            <path d={lens(cx, rx)} fill="none" stroke={G.frame} strokeWidth={7} strokeLinejoin="round" />
          </g>
        ))}
        {/* bridge */}
        <path d={`M${cxL + wl / 2} ${top + 16} Q${(cxL + cxR) / 2} ${top + 4} ${cxR - wr / 2} ${top + 16}`} fill="none" stroke={G.frame} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  })() : null;
  return (
    <g>
      {fr > 0 ? (
        <g fill={K.freckle} opacity={0.35 + fr * 0.4}>
          {FRK.map(([x, y], i) => <circle key={i} cx={x + ex} cy={y} r={i % 3 === 0 ? 3.2 : 2.5} />)}
        </g>
      ) : null}
      {tn > 0 ? [eyeR, eyeL] : [eyeL, eyeR]}
      {brow(-1)}
      {brow(1)}
      {nose}
      {mouth}
      {look.beard ? <Mustache look={look} tn={tn} top={mouthTop} /> : null}
      {glasses}
      {p.sweat > 0 ? <Sweat amt={p.sweat} /> : null}
    </g>
  );
};

/* ------------------------------------------------------------------ the whole head */
export const MemberHead: React.FC<{ p: Pose; m: M; lm: M; f: number; extra?: React.ReactNode }> = ({ p, m, lm, extra }) => {
  const look = useLook();
  const K = look.skin;
  const id = 'mh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [lx, ly] = localLight(lm);
  const tn = p.turn;
  const ex = tn * 18;
  const HD = memberHeadPath(look, tn);
  const hc = hairCols(look.hair, p.hairBlue ?? 0);
  const H = HAIR[look.hair.style as Exclude<HairStyle, 'flex'>];
  const sil = hairPath(H.sil, false) + ` L${H.sil[H.sil.length - 1][0]} -150 L${H.sil[0][0]} -150 Z`;
  // the front piece: the hairline edge, then back over the top along the silhouette
  const topSil = H.sil.filter(([, y]) => y <= (H.cut ?? (H.ears ? 0 : -206)));
  const front = hairPath([...H.edge, ...[...topSil].reverse()], true);
  const colors = { mid: hc.hairMid, lite: hc.hairLite, curl: hc.hairCurl, dark: hc.hairDark };
  const w = look.head.w;
  const burnY = look.beard && look.beard.style !== 'stubble' ? -150 : -180;
  return (
    <g transform={svgM(m)}>
      <g transform={w !== 1 ? `scale(${w} 1)` : undefined}>
        <defs>
          <clipPath id={id}>
            <path d={HD} />
          </clipPath>
          <clipPath id={id + 'f'}>
            <path d={front} />
          </clipPath>
        </defs>
        {/* back hair: dark base, the lit mass shifted toward the light (top left), then the outline */}
        <clipPath id={id + 's'}>
          <path d={sil} />
        </clipPath>
        <path d={sil} fill={hc.hair} />
        <path d={sil} fill={hc.hairMid} transform={`translate(${lx * 16} ${ly * 16})`} clipPath={`url(#${id}s)`} />
        <path d={sil} fill="none" stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
        {/* ears */}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${-tn * 8} 0) scale(${s} 1)`}>
            <path d="M-114 -196 C-152 -206 -158 -136 -118 -128 Z" fill={K.skin} stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
            <Line d="M-124 -182 C-140 -178 -140 -152 -126 -146" w={4} c={K.line} />
          </g>
        ))}
        {/* head */}
        <path d={HD} fill={K.sh} />
        <g clipPath={`url(#${id})`}>
          <path d={HD} fill={K.face} transform={`translate(${lx * 26} ${ly * 26})`} />
          <path
            transform={`translate(${ex} 0)`}
            d="M-135 -95 C-113 -103 -92 -93 -82 -77 Q-104 -63 -123 -79 Z M135 -95 C113 -103 92 -93 82 -77 Q104 -63 123 -79 Z"
            fill={K.cheek}
            opacity={0.3}
          />
          {p.red > 0 ? <path d="M-140 -330 H140 V30 H-140 Z" fill="#FF3B3B" opacity={p.red * 0.32} /> : null}
          <path d="M-90 -10 Q0 16 90 -10 L90 24 L-90 24 Z" fill={K.sh} opacity={0.55} />
          <g transform={`translate(${ex} 0)`}>
            <path d="M-119 -108 Q-107 -114 -97 -108 Q-103 -103 -113 -103Z" fill={K.hi} />
            <path d="M96 -108 Q108 -115 118 -109 Q114 -103 103 -102Z" fill={K.hi} />
          </g>
          {p.blush > 0 ? (
            <g opacity={p.blush * 0.7}>
              <ellipse cx={-76 + ex} cy={-112} rx={26} ry={13} fill={C.blush} />
              <ellipse cx={76 + ex} cy={-112} rx={26} ry={13} fill={C.blush} />
            </g>
          ) : null}
        </g>
        <path d={HD} fill="none" stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" />
        {/* chin */}
        {look.beard && look.beard.style !== 'stubble' ? null : (
          <>
            <Line d={`M${-26 + tn * 22} ${-40 + look.head.chin * 0.6} Q${tn * 22} ${-30 + look.head.chin * 0.6} ${26 + tn * 22} ${-40 + look.head.chin * 0.6}`} w={4} c={K.line} o={0.7} />
            <ellipse cx={-30 + tn * 26} cy={-16 + look.head.chin} rx={11} ry={4} fill={K.hi} opacity={0.8} transform={`rotate(-12 ${-30 + tn * 26} ${-16 + look.head.chin})`} />
          </>
        )}
        {look.beard ? <Beard look={look} tn={tn} clip={id} /> : null}
        {/* sideburns down to the ear (or the beard) */}
        {H.ears || H.burn === 0 ? null : [-1, 1].map((s) => (
          <path key={s} transform={`scale(${s} 1)`} d={`M-122 -216 L-108 -216 L-109 ${burnY} L-120 ${burnY + 6} Z`} fill={look.beard && look.beard.style !== 'stubble' ? look.beard.color : hc.hair} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        ))}
        {/* front hair and its texture (it follows the face a little when he turns) */}
        <g transform={tn ? `translate(${f1(tn * 8)} 0)` : undefined}>
        <path d={front} fill={hc.hair} />
        <g clipPath={`url(#${id}f)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={front} fill={hc.hairMid} stroke="none" transform={`translate(${lx * 16} ${ly * 16})`} />
          {/* shadow just above the hairline */}
          <path d={hairPath(H.edge, false)} stroke={hc.hair} strokeWidth={20} />
          {H.lines.map(([d, c, sw], i) => <path key={i} d={d} stroke={colors[c]} strokeWidth={sw} />)}
        </g>
        <path d={hairPath(H.edge, false)} fill="none" stroke={C.ink} strokeWidth={LW} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {look.laurel ? (
          <g>
            <path d="M-138 -232 Q-84 -290 -10 -290 M138 -232 Q84 -290 10 -290" fill="none" stroke={C.goldSh} strokeWidth={6} strokeLinecap="round" />
            {LEAVES.map((l, i) => (
              <g key={i} transform={`translate(${l.x} ${l.y - 20}) rotate(${l.a})`}>
                <path d={LEAF_D} fill={C.gold} stroke={C.leafLine} strokeWidth={3.2} strokeLinejoin="round" />
                <path d="M1 0 Q19 -3 36 -2 Q20 7 1 0Z" fill={C.leaf} />
              </g>
            ))}
          </g>
        ) : null}
        <MemberFace p={p} look={look} />
      </g>
      {extra}
    </g>
  );
};
