// Gym #8: "ROPE STORM" - battle ropes. The waves get bigger, faster, stormier... then one double
// slam sends a monster wave straight at the camera. Drops the ropes, hands on hips.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, clamp } from '../lib/anim';
import { Stage, camP, Cam, TOP, FULL_H } from '../fx/Stage';
import { Sparks, Sfx, GlowDefs, Glow, Glint, ConfettiRain, FocusLines, Dust, Streaks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { reach } from './ik';
import { stageOf, INK, Pt } from './kit';
import { GymRoomBG, FloorShadow } from './GymRoom';
import { smooth } from '../lib/shape';

const GX = 540;
const GY = 1640;
const SC = 0.86;
const toStage = stageOf(GX, GY, SC);
const STORM = 46;
const SLAM = 62;
const HIT = 70; // the big wave reaches the camera
const DROP = 74;
const PROUD = 82;
const CARD = 94;

/* ------------------------------- poses ------------------------------- */
const STANCE: Partial<Pose> = {
  hipL: 26, hipR: 26, knL: -36, knR: -36, thL: 0.8, thR: 0.8, ftL: 8, ftR: 8, torsoSy: 0.94, sy: 0.96, chestS: 1.04,
  handL: 'fist', handR: 'fist', flexL: 1.1, flexR: 1.1, mouthMode: 'grin', mouthOpen: 0.3, smile: 1, lid: 0.15, brow: 0.4, browTilt: -0.3, lookY: 0.3,
};
const STORMFACE: Partial<Pose> = { mouthMode: 'grit', mouthOpen: 0.3, lid: 0.45, browTilt: -1, brow: -0.1, red: 0.5, sweat: 1, flexL: 1.6, flexR: 1.6, lookY: 0.1 };
const PROUD_P: Partial<Pose> = {
  hipL: 12, hipR: 12, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 2, ftR: 2, torsoSy: 1.02, sy: 1, chestS: 1.12,
  mouthMode: 'grin', mouthOpen: 0.6, smile: 1, lid: 0, browTilt: 0, brow: 0.8, red: 0, sweat: 0.6, lookY: 0, lookX: 0.2, turn: 0.1, flexL: 1.3, flexR: 1.3,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: STANCE },
  { f: 18, p: { ...STANCE, mouthOpen: 0.5, lid: 0.25 } },
  { f: STORM, p: STORMFACE, e: E.inOut },
  { f: SLAM - 6, p: { ...STORMFACE, sy: 1.04, hipL: 18, hipR: 18, knL: -18, knR: -18, thL: 0.92, thR: 0.92, mouthOpen: 0.8 } },
  { f: SLAM, p: { ...STORMFACE, sy: 0.9, sx: 1.06, hipL: 34, hipR: 34, knL: -52, knR: -52, thL: 0.66, thR: 0.66, mouthMode: 'grin', mouthOpen: 1, eyeMode: 'star' }, e: E.in },
  { f: HIT, p: { sy: 0.94, sx: 1.03, eyeMode: 'normal', mouthMode: 'o', mouthOpen: 0.6, lookY: 0.4, brow: 1, browTilt: 0.4 } },
  { f: DROP + 4, p: { ...PROUD_P, chestS: 1.06 }, e: E.inOut },
  { f: PROUD, p: PROUD_P, e: E.back },
  { f: 90, p: { wink: 1, mouthSkew: 0.5 }, e: E.out },
  { f: 102, p: { wink: 0, mouthSkew: 0 } },
  { f: 140, p: {} },
];

/** wave energy 0..1 */
const energy = (f: number) => kf(f, [[0, 0.35], [20, 0.55], [STORM, 0.8], [SLAM - 6, 1], [SLAM, 0.6], [DROP, 0.3], [DROP + 10, 0]]);
/** arm pump: ~-1..1 for each hand, alternating */
const period = (f: number) => kf(f, [[0, 11], [STORM, 7], [SLAM - 8, 5.5]]);
const phaseAt = (() => {
  const ph: number[] = [0];
  for (let i = 1; i < 200; i++) ph.push(ph[i - 1] + (Math.PI * 2) / period(i));
  return (f: number) => {
    const i = Math.max(0, Math.min(198, Math.floor(f)));
    return lerp(ph[i], ph[i + 1], f - i);
  };
})();

const HIPS: [Pt, Pt] = [[-136, -372], [136, -372]];
const handTargets = (f: number): [Pt, Pt] => {
  if (f >= DROP) {
    // let go of the ropes and plant the fists on the hips
    const from = handTargets(DROP - 0.001);
    const t = E.inOut(seg(f, DROP, DROP + 7));
    return [
      [lerp(from[0][0], HIPS[0][0], t), lerp(from[0][1], HIPS[0][1], t) - Math.sin(t * Math.PI) * 60],
      [lerp(from[1][0], HIPS[1][0], t), lerp(from[1][1], HIPS[1][1], t) - Math.sin(t * Math.PI) * 60],
    ];
  }
  const ph = phaseAt(f);
  const e = energy(f);
  const amp = 80 + 90 * e;
  let yl = -430 + Math.sin(ph) * amp;
  let yr = -430 - Math.sin(ph) * amp;
  if (f >= SLAM - 8 && f < DROP) {
    // both up together, then a double slam
    const k = kf(f, [[SLAM - 8, 0], [SLAM - 3, -1, E.out], [SLAM, 1, E.in], [DROP, 0.4]]);
    yl = lerp(yl, -430 - 200 * -k, clamp((f - (SLAM - 8)) / 3));
    yr = yl;
  }
  return [[-176, yl], [176, yr]];
};

const solve = (f: number): Pose => {
  let p = plant(poseAt(f, BASE, KEYS));
  p = { ...p, torso: Math.sin(phaseAt(f)) * 3 * energy(f) };
  const t = handTargets(f);
  return { ...p, ...reach(p, 'L', t[0], 1), ...reach(p, 'R', t[1], 1), wrL: 0, wrR: 0 };
};

/* ------------------------------- rope ------------------------------- */
/** Thick rope from the fist toward the camera with travelling waves. side -1 = left, 1 = right. */
const Rope: React.FC<{ f: number; p: Pose; side: -1 | 1; slack: number }> = ({ f, p, side, slack }) => {
  const r = rig(p);
  const a = side === -1 ? r.aL : r.aR;
  const held = toStage(r.W(a.wrist, 0, 70));
  const dropped: Pt = [540 + side * 150, GY + 40];
  const fist: Pt = slack > 0 ? [lerp(held[0], dropped[0], E.in(slack)), lerp(held[1], dropped[1], E.in(slack))] : held;
  const N = 46;
  const e = energy(f);
  const ph = phaseAt(f);
  // base curve: fist -> floor in front of him -> off the bottom of the screen
  const floorPt: Pt = [540 + side * 250, GY + 60];
  const end: Pt = [540 + side * 470, 2420];
  const ctrl: Pt = [lerp(fist[0], floorPt[0], 0.5) + side * 20, lerp(fist[1], floorPt[1], 0.85 + 0.1 * slack)];
  const base = (s: number): Pt => {
    if (s < 0.3) {
      const t = s / 0.3;
      return [(1 - t) * (1 - t) * fist[0] + 2 * (1 - t) * t * ctrl[0] + t * t * floorPt[0], (1 - t) * (1 - t) * fist[1] + 2 * (1 - t) * t * ctrl[1] + t * t * floorPt[1]];
    }
    const t = (s - 0.3) / 0.7;
    return [lerp(floorPt[0], end[0], t), lerp(floorPt[1], end[1], Math.pow(t, 1.15))];
  };
  const pulse = (s: number) => {
    // the double-slam wave: a single big pulse running from the fist to the camera
    if (f < SLAM || f > HIT + 4) return 0;
    const pos = seg(f, SLAM, HIT);
    return Math.exp(-Math.pow((s - pos) / 0.11, 2)) * (1 + pos);
  };
  const pts: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    const [bx, by] = base(s);
    const [nx0, ny0] = base(Math.min(1, s + 0.01));
    let tx = nx0 - bx;
    let ty = ny0 - by;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const persp = 0.35 + 1.9 * Math.pow(s, 1.5);
    const wave = Math.sin(s * 2 * Math.PI * 2.2 - ph * 1.0 + (side === 1 ? Math.PI : 0)) * (36 + 70 * e) * persp * (1 - slack) * Math.min(1, s * 6);
    const big = pulse(s) * 300 * persp * side;
    const d = wave + big;
    pts.push([bx - ty * d, by + tx * d]);
    widths.push(lerp(26, 150, Math.pow(s, 1.7)));
  }
  // outline polygon
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a0 = pts[Math.max(0, i - 1)];
    const b0 = pts[Math.min(N - 1, i + 1)];
    let nx = -(b0[1] - a0[1]);
    let ny = b0[0] - a0[0];
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const w = widths[i] / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const body = smooth([...L, ...R.reverse()], true, 0.6);
  const center = smooth(pts, false, 0.8);
  return (
    <g>
      <path d={body} fill="#E9C994" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      {/* twist texture */}
      <path d={center} fill="none" stroke="#B98552" strokeWidth={12} strokeDasharray="10 26" strokeLinecap="round" opacity={0.8} />
      <path d={center} fill="none" stroke="#FFF1D6" strokeWidth={5} strokeDasharray="8 28" strokeDashoffset={18} strokeLinecap="round" opacity={0.7} />
      {/* black grip tape at the fist */}
      <circle cx={pts[1][0]} cy={pts[1][1]} r={20} fill="#2B2340" stroke={INK} strokeWidth={6} />
    </g>
  );
};

const Bolt: React.FC<{ x: number; y: number; s: number; rot: number; o: number }> = ({ x, y, s, rot, o }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
      <path d="M-10 -80 L30 -80 L4 -14 L34 -14 L-26 84 L-8 10 L-36 10 Z" fill="#FFD064" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M2 -70 L20 -70 L0 -20" fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
    </g>
  ) : null;

/* ------------------------------- scene ------------------------------- */
export const RopeStormScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const slack = seg(f, DROP, DROP + 8);
  const e = energy(f);
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1240], [12, 1160, E.out], [STORM, 1140], [SLAM, 1180, E.in], [HIT, 1260, E.out], [PROUD, 1120, E.inOut], [CARD + 6, 1060, E.inOut], [140, 1050]]),
    z: kf(f, [[0, 1.2], [12, 1.0, E.out], [STORM, 1.04], [SLAM - 4, 1.1, E.inOut], [SLAM, 1.0, E.out], [HIT, 0.94, E.out], [PROUD, 1.04, E.inOut], [CARD + 6, 0.98, E.inOut]]),
    r: kf(f, [[STORM, 0], [SLAM, -1.5], [HIT, 2, E.out], [HIT + 10, 0, E.inOut]]),
  };
  const s0 = shake(f, STORM, SLAM - STORM, 6, 1);
  const s1 = shake(f, SLAM, 10, 16, 2);
  const s2 = shake(f, HIT, 20, 44, 3);
  const sh = { x: s0.x + s1.x + s2.x, y: s0.y + s1.y + s2.y, r: s1.r + s2.r };
  const stormO = seg(f, STORM - 6, STORM) * (1 - seg(f, SLAM, SLAM + 4));
  const flash = f >= HIT && f < HIT + 8 ? 1 - (f - HIT) / 8 : 0;
  // slams on the floor (every half period)
  const slamFrames: number[] = [];
  for (let i = 4; i < DROP; i++) if (Math.floor(phaseAt(i) / Math.PI) !== Math.floor(phaseAt(i - 1) / Math.PI)) slamFrames.push(i);

  return (
    <Stage impact={f === SLAM} overlay={<EndCard f={f} start={CARD} lines={['ROPE STORM']} pts="+1.5" color="#F2853A" dark="#B4521C" y={96} />}>
      <GlowDefs />
      <GymRoomBG f={f} cam={cam} sh={sh} dim={stormO * 0.6} />
      <g transform={camP(cam, 1, sh)}>
        {stormO > 0 ? <rect x={-900} y={-1600} width={2880} height={4400} fill="#2B2340" opacity={0.28 * stormO} /> : null}
        <FloorShadow x={540} y={GY + 6} w={250} />
        <Glow x={540} y={chest[1]} r={kf(f, [[STORM - 2, 0], [STORM + 6, 520, E.out], [SLAM, 600], [SLAM + 10, 0]])} id="glowY" o={0.6 * stormO} />
        {f >= STORM && f < SLAM ? <FocusLines f={f} cx={540} cy={chest[1]} r0={520} opacity={0.35} width={14} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} />
        {/* ropes in front of his legs */}
        <Rope f={f} p={p} side={-1} slack={slack} />
        <Rope f={f} p={p} side={1} slack={slack} />
        {slamFrames.map((sf, i) => (
          <Dust key={sf} f={f} start={sf} x={540 + (i % 2 ? 1 : -1) * 290} y={GY + 80} n={3} spread={140} size={36 + 30 * e} seed={i + 5} />
        ))}
        <Bolt x={180} y={1010} s={1.1} rot={-14} o={stormO * (Math.floor(f / 2) % 3 !== 0 ? 1 : 0)} />
        <Bolt x={900} y={940} s={1.25} rot={12} o={stormO * (Math.floor(f / 2) % 3 !== 1 ? 1 : 0)} />
        <Bolt x={820} y={1520} s={0.8} rot={30} o={stormO * (Math.floor(f / 2) % 3 !== 2 ? 1 : 0)} />
        <Sparks f={f} start={SLAM} seed={11} n={18} x={540} y={GY + 40} speed={[14, 34]} g={1} shape="drop" colors={['#A6DCFF']} size={[12, 22]} />
        <Sparks f={f} start={STORM} seed={12} n={10} x={head[0]} y={head[1] + 120} speed={[10, 22]} g={1.2} shape="drop" colors={['#A6DCFF']} size={[10, 18]} />
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, 90, 104)} />
        <Sfx f={f} start={8} text="WHAP!" x={200} y={1380} size={110} rot={-10} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={22} text="WHAP!" x={880} y={1300} size={120} rot={10} fill="#FFFFFF" dur={12} />
        <Sfx f={f} start={34} text="WHAP WHAP!" x={300} y={760} size={110} rot={-8} fill="#FFD064" dur={12} />
        <Sfx f={f} start={STORM} text="STORM MODE" x={540} y={head[1] - 110} size={130} rot={-4} fill="#FFD064" dur={SLAM - STORM - 2} />
        <Sfx f={f} start={SLAM} text="KA-WHOOM!" x={540} y={1900} size={170} rot={-6} fill="#FFFFFF" dur={14} />
      </g>
      {/* the wave reaching the camera */}
      {f >= HIT - 2 && f < HIT + 14 ? (
        <g opacity={1 - seg(f, HIT + 6, HIT + 14)}>
          <Streaks f={f} x0={-100} y0={-300} w={1280} h={2500} angle={20} n={30} speed={150} len={500} opacity={0.75} thick={16} />
        </g>
      ) : null}
      {flash > 0 ? <rect x={-40} y={TOP - 40} width={1160} height={FULL_H + 80} fill="#FFFFFF" opacity={flash * 0.85} /> : null}
      <g transform={camP(cam, 0.2, sh)}>
        <Sfx f={f} start={HIT} text="WHOOSH!" x={540} y={600} size={210} rot={6} fill="#FFD064" dur={22} />
      </g>
      <ConfettiRain f={f} start={CARD} n={56} seed={21} />
    </Stage>
  );
};
