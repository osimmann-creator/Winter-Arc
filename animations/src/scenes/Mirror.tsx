// Gym #5. Three exposures in the dressing-room mirror, followed by the actual final print.
import React from 'react';
import { Freeze, useCurrentFrame } from 'remotion';
import { BASE, Hero, plant, Pose, rig } from '../hero/Hero';
import { Cam, camP, Stage, TOP, BOT, FULL_H } from '../fx/Stage';
import { E, Key, kf, lerp, poseAt, seg } from '../lib/anim';
import { TITLE_FONT } from '../fonts';
import { GymTheatre, GymVictory } from './GymTheatre';
import { reach } from './ik';

const SHOTS = [31, 51, 73];
const LAST_SHOT = SHOTS[2];
const CONTACT = 105;
const GX = 550;
const GY = 1698;
const SIZE = 1.08;
const STILL = { x: 0, y: 0, r: 0 };

const ACTING: Key<Pose>[] = [
  { f: 0, p: { torso: -6, head: 7, turn: -0.24, lookX: -0.7, lookY: 0.75, lid: 0.16, mouthSkew: 0.4, mouthOpen: 0.08, hipL: 12, hipR: 10, knL: -8, knR: -12, handL: 'grip', handR: 'open', armZR: 'top' } },
  { f: 12, p: { torso: 1, head: -6, turn: 0.12, lookX: 0.35, lookY: -0.72, lid: 0, brow: 0.85, mouthOpen: 0.12, shrugR: 14 } },
  { f: 18, p: { head: -4, lookX: -0.5, lookY: -0.15, handR: 'fist', armZR: 'mid' } },
  { f: 22, p: { torso: 4, chestS: 0.98, shR: 48, elR: 60, handR: 'fist', brow: 0.25 } },
  { f: 29, p: { torso: -2, head: 4, turn: -0.12, shR: 95, elR: 111, wrR: 9, flexR: 1.75, chestS: 1.065, shrugR: 4, mouthOpen: 0.69, smile: 1, brow: 0.76 }, e: E.back },
  { f: 34, p: { head: 5, flexR: 1.62 } },
  { f: 42, p: { torso: 6, head: 1, lookX: -0.6, lookY: -0.04, chestS: 1.025, shR: 35, elR: 85, flexR: 0.64, handR: 'relax', hipR: 17, knR: -15, shrugR: 0 } },
  { f: 49, p: { torso: 8, head: -7, turn: 0.28, mouthOpen: 0.04, lid: 0.38, browTilt: 0.83, mouthSkew: 0.85, lookX: -0.72, brow: 0.46 }, e: E.out },
  { f: 54, p: { head: -6, handR: 'fist' } },
  { f: 62, p: { head: 8, turn: -0.15, torso: -4, lookX: -0.38, lookY: -0.1, lid: 0, shR: 22, elR: 116, wrR: -26, chestS: 1, mouthOpen: 0.28, browTilt: -0.22, hipR: 10, knR: -10 } },
  { f: 69, p: { head: -5, turn: -0.08, torso: -1, chestS: 1.036, mouthOpen: 0.76, mouthSkew: 0.18, lookX: -0.24, brow: 0.72, blush: 0.26, wink: 1, handR: 'thumb', shR: 33, elR: 144, wrR: -89, flexR: 0.95 }, e: E.back },
  { f: LAST_SHOT, p: { head: -4, chestS: 1.032, shR: 32, elR: 146 } },
];

function performance(f: number): Pose {
  const p = plant(poseAt(f, BASE, ACTING));
  const bones = rig(p);
  const eye = bones.eyes();
  const raised = E.inOut(seg(f, 0, 21));
  const wrist: [number, number] = [
    lerp(-230, eye[0] - 247, raised) - 4 * Math.sin(f / 13),
    lerp(-505, eye[1] + 124, raised) + 4 * Math.cos(f / 16),
  ];
  const phoneArm = reach(p, 'L', wrist, 1, 0);
  const tilt = kf(f, [[0, -15], [22, -4], [39, -7], [57, -2.5], [68, -5]]);
  const q = { ...p, ...phoneArm };
  q.wrL = 180 + tilt - q.shL - q.elL - q.torso - q.rot;

  // Brush the outer curls, then let the fingers fold as the elbow opens into the flex.
  const brush = E.out(seg(f, 0, 8)) * (1 - E.inOut(seg(f, 14, 21)));
  if (brush > 0) {
    const curl = bones.W(bones.head, lerp(109, 67, seg(f, 8, 17)), -270);
    const arm = reach(p, 'R', curl, -1, 72);
    q.shR = lerp(q.shR, arm.shR!, brush);
    q.elR = lerp(q.elR, arm.elR!, brush);
    q.wrR = lerp(q.wrR, -9, brush);
  }
  const hip = E.inOut(seg(f, 35, 43)) * (1 - E.inOut(seg(f, 54, 62)));
  if (hip > 0) {
    const arm = reach(p, 'R', bones.W(bones.torso, 125, -15), 1, 40);
    q.shR = lerp(q.shR, arm.shR!, hip);
    q.elR = lerp(q.elR, arm.elR!, hip);
  }
  return q;
}

function camera(f: number): Cam {
  return {
    cx: kf(f, [[0, 464], [22, 537, E.out], [43, 549], [66, 548]]),
    cy: kf(f, [[0, 880], [24, 1007, E.out], [43, 1020], [69, 997]]),
    z: kf(f, [[0, 1.5], [25, 1.13, E.out], [38, 1.16], [51, 1.19], [70, 1.14]]),
    r: kf(f, [[0, -2.5], [24, 0.2, E.out], [51, -0.45], [70, 0]]),
  };
}

function Materials() {
  return (
    <defs>
      <linearGradient id="mir-brass" x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#674444" /><stop offset=".16" stopColor="#BE895C" /><stop offset=".31" stopColor="#FADCA4" />
        <stop offset=".40" stopColor="#9C674F" /><stop offset=".73" stopColor="#CB9765" /><stop offset=".85" stopColor="#FFF1C4" /><stop offset="1" stopColor="#74503E" />
      </linearGradient>
      <linearGradient id="mir-case" x2=".84" y2="1">
        <stop stopColor="#EAC9FA" /><stop offset=".19" stopColor="#AD97D4" /><stop offset=".54" stopColor="#715A94" /><stop offset=".85" stopColor="#51416F" /><stop offset="1" stopColor="#AE94C1" />
      </linearGradient>
      <radialGradient id="mir-lens" cx=".32" cy=".28" r=".8">
        <stop stopColor="#78AFAE" /><stop offset=".22" stopColor="#40637C" /><stop offset=".60" stopColor="#241D35" /><stop offset="1" stopColor="#090C18" />
      </radialGradient>
      <radialGradient id="mir-flare">
        <stop stopColor="#FFFFEF" /><stop offset=".09" stopColor="#FFF5C9" stopOpacity=".92" />
        <stop offset=".30" stopColor="#FFE5BE" stopOpacity=".36" /><stop offset="1" stopColor="#FFDBBC" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="mir-glass" x2="1" y2="0">
        <stop stopColor="#EEEFFF" stopOpacity="0" /><stop offset=".48" stopColor="#FFFCF2" stopOpacity=".18" />
        <stop offset=".52" stopColor="#FFFCF2" stopOpacity=".11" /><stop offset="1" stopColor="#FFFCF2" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="mir-cloth" x2=".95" y2="1">
        <stop stopColor="#554654" /><stop offset=".36" stopColor="#302838" /><stop offset=".72" stopColor="#332C3E" /><stop offset="1" stopColor="#1D1A28" />
      </linearGradient>
      <pattern id="mir-cloth-weave" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
        <path d="M0 1H14 M0 8H14" stroke="#EED2C2" strokeWidth="1.1" opacity=".13" />
        <path d="M3 0V14 M11 0V14" stroke="#100F1B" strokeWidth="1.8" opacity=".3" />
      </pattern>
      <linearGradient id="mir-paper" x2=".8" y2="1">
        <stop stopColor="#FFFDF1" /><stop offset=".54" stopColor="#F6EED9" /><stop offset="1" stopColor="#E9D9C2" />
      </linearGradient>
      <pattern id="mir-paper-fibre" width="24" height="17" patternUnits="userSpaceOnUse">
        <path d="M1 3h4m9 7h3m-9 4h3" stroke="#A88F7E" strokeWidth=".85" opacity=".35" />
      </pattern>
      <linearGradient id="mir-stamphandle" x2=".83" y2="1">
        <stop stopColor="#896958" /><stop offset=".27" stopColor="#674654" /><stop offset=".7" stopColor="#362A3C" /><stop offset="1" stopColor="#211B24" />
      </linearGradient>
    </defs>
  );
}

function Phone() {
  return (
    <g transform="rotate(180) translate(-8 -64)">
      <rect x="-48" y="-91" width="96" height="177" rx="18" fill="#34243E" stroke="#39283B" strokeWidth="6" />
      <rect x="-46" y="-92" width="89" height="172" rx="17" fill="url(#mir-case)" stroke="#D1B8C8" strokeWidth="2.4" />
      <path d="M-39 -23v76q0 17 14 18" fill="none" stroke="#F9D8E7" strokeWidth="3.1" opacity=".69" />
      <path d="M43 -29v19m0 9v10" fill="none" stroke="#33253F" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="-37" y="-82" width="48" height="49" rx="12" fill="#665572" stroke="#D8BED4" strokeWidth="2.5" />
      {[[ -24, -69 ], [ -4, -47 ]].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <circle r="10.7" fill="#2F2A39" stroke="#E0C8B7" strokeWidth="2" />
          <circle r="7.4" fill="url(#mir-lens)" /><circle r="3.2" fill="#171A2A" />
          <circle cx="-2.5" cy="-3.4" r="1.9" fill="#D5F9F5" />
        </g>
      ))}
      <circle cx="-3" cy="-69" r="4.1" fill="#F6E1AF" stroke="#E6D4C1" strokeWidth="1.3" />
      <circle cx="-24" cy="-48" r="2.2" fill="#302940" />
      <g transform="translate(0 6)" fill="none" stroke="#EAD3BE" strokeWidth="1.8">
        <circle r="13" /><path d="M-10 7l7-15 3 9 4-5 5 11" />
      </g>
    </g>
  );
}

// Slim mirrored brass rails, recessed fluting, and the frosted dressing-room lights.
function LookingGlass({ f }: { f: number }) {
  return (
    <g>
      <path d={`M${-290 + f * 4} ${TOP}l220 0 -710 ${FULL_H}h-200Z`} fill="url(#mir-glass)" opacity=".65" />
      <path d={`M1010 ${TOP}h120L635 ${BOT}h-54Z`} fill="url(#mir-glass)" opacity=".47" />
      {[0, 1080].map((x) => (
        <g key={x} transform={`translate(${x} 0) scale(${x ? -1 : 1} 1)`}>
          <rect x="-12" y={TOP} width="50" height={FULL_H} fill="#342B39" />
          <rect x="1" y={TOP} width="24" height={FULL_H} fill="url(#mir-brass)" />
          <path d={`M30 ${TOP}v${FULL_H}m9 0V${TOP}`} stroke="#F6DBBD" fill="none" strokeWidth="2.6" opacity=".8" />
          {[125, 425, 725, 1025, 1325, 1625, 1925].map((y) => (
            <g key={y} transform={`translate(16 ${y})`}>
              <ellipse rx="11" ry="33" fill="#483242" />
              <rect x="-7" y="-27" width="14" height="49" rx="7" fill="#FCDFBA" />
              <path d="M-2 -21v32" fill="none" stroke="#FFFFE5" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function Reflection({ f }: { f: number }) {
  const p = performance(f);
  const cam = camera(f);
  return (
    <g>
      <GymTheatre theme="mirror" f={f} cam={cam} sh={STILL} />
      <g transform={camP(cam, 1)} className="gym-actor">
        <Hero p={p} x={GX} y={GY} scale={SIZE} itemL={<Phone />} itemBehindL />
      </g>
      <LookingGlass f={f} />
    </g>
  );
}

function Exposure({ f }: { f: number }) {
  const shutter = SHOTS.reduce((last, shot) => shot <= f ? shot : last, -30);
  const age = f - shutter;
  if (age > 7) return null;
  const p = performance(shutter);
  const r = rig(p);
  // Phone is authored in upright drawing coordinates, rotated back into the wrist.
  const emitter = r.W(r.aL.wrist, 11, 133);
  const x = GX + emitter[0] * SIZE;
  const y = GY + emitter[1] * SIZE;
  const t = seg(age, 0, 7);
  const power = (1 - t) ** 2;
  const radius = 126 + 220 * t;
  return (
    <g>
      <g transform={camP(camera(shutter), 1)}>
        <g transform={`translate(${x} ${y}) rotate(-10)`} opacity={power}>
          <circle r={radius} fill="url(#mir-flare)" />
          <path d="M-113 0L-9 -5L0 -70L7 -6L110 0L8 5L0 76L-7 6Z" fill="#FFFFF2" />
          <circle r="11" fill="white" />
        </g>
      </g>
      <rect x="0" y={TOP} width="1080" height={FULL_H} fill="#FFF3D9" opacity={power * (shutter === LAST_SHOT ? 0.85 : 0.36)} />
    </g>
  );
}

function Album() {
  const corner = 'M0 100V0h100M14 73V14h59 M0 52l52-52';
  return (
    <g>
      <rect x="0" y={TOP} width="1080" height={FULL_H} fill="url(#mir-cloth)" />
      <rect x="0" y={TOP} width="1080" height={FULL_H} fill="url(#mir-cloth-weave)" />
      <path d={`M0 ${TOP}H47Q23 810 56 ${BOT}H0Z`} fill="#1B1926" opacity=".62" />
      <path d={`M53 ${TOP}q-19 1120 7 ${FULL_H}`} stroke="#A59496" strokeWidth="2" fill="none" opacity=".38" />
      <g stroke="#B39171" fill="none" opacity=".51">
        <rect x="80" y={TOP + 40} width="964" height={FULL_H - 80} rx="3" strokeWidth="2.4" />
        {[[91, TOP + 51, 1, 1], [1033, TOP + 51, -1, 1], [91, BOT - 51, 1, -1], [1033, BOT - 51, -1, -1]].map(([x, y, sx, sy]) => (
          <path key={`${x}-${y}`} d={corner} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} strokeWidth="2.8" />
        ))}
      </g>
      <path d="M86 1740Q302 1804 578 1775T1060 1820L1080 1940Q880 1850 560 1853T86 1810Z" fill="url(#mir-glass)" opacity=".19" />
    </g>
  );
}

function ProofMark() {
  const teeth = Array.from({ length: 112 }, (_, i) => {
    const a = Math.PI * i / 56;
    const radius = i % 2 ? 98 : 102;
    return `${i ? 'L' : 'M'}${(radius * Math.cos(a)).toFixed(2)} ${(radius * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';
  return (
    <g transform="translate(853 1506) rotate(-11)">
      <path d={teeth} fill="#195448" opacity=".96" />
      <circle r="87" fill="none" stroke="#E6E4BE" strokeWidth="3" />
      <circle r="80" fill="none" stroke="#E6E4BE" strokeWidth="1.7" strokeDasharray="1.5 7" />
      <path d="M-26 -16l17 15 34-37" fill="none" stroke="#EDE9BE" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <text x="0" y="31" textAnchor="middle" fontFamily={TITLE_FONT} fontSize="35" fill="#F3EFCD" letterSpacing="1.2">PROOF</text>
      <path d="M-19 47h38" stroke="#E7D99E" strokeWidth="2" />
    </g>
  );
}

// A brass-and-walnut desk stamp crosses the paper, makes contact, then clears the impression.
function StampTool({ f }: { f: number }) {
  if (f < 94 || f > 118) return null;
  const lift = kf(f, [[94, 1], [101, 0.29, E.out], [CONTACT, 0, E.in], [108, 0], [118, 1, E.in]]);
  const sc = 1 + lift * 0.28;
  return (
    <g transform={`translate(${853 + lift * 630} ${1506 + lift * 430}) rotate(${-11 - lift * 24}) scale(${sc})`}>
      <ellipse cx={15 + lift * 68} cy={35 + lift * 32} rx="115" ry="75" fill="#231D29" opacity={0.22 * (1 - lift)} />
      <ellipse rx="100" ry="83" fill="#282531" stroke="#221A26" strokeWidth="5" />
      <path d="M-99 -15a99 73 0 1 0 198 0v-17h-198Z" fill="url(#mir-brass)" stroke="#533844" strokeWidth="3" />
      <ellipse cy="-32" rx="99" ry="72" fill="url(#mir-brass)" stroke="#8E6753" strokeWidth="4" />
      <path d="M-63 0q59 42 125 0" fill="none" stroke="#FFF1C2" strokeWidth="4" />
      <path d="M-43 -42q7-25 17-42c8-13 8-29 2-42-13-18-6-45 18-54 26-10 49 8 48 32-1 18-11 26-18 36-10 15-5 32 3 49l15 28q-2 22-43 23-34 1-42-17Z" fill="url(#mir-stamphandle)" stroke="#302332" strokeWidth="6" />
      <path d="M-10 -152q-5-11 8-18M-18 -55q11-16 13-34" stroke="#BA9781" strokeWidth="5.5" fill="none" opacity=".85" strokeLinecap="round" />
      <ellipse cy="-37" rx="40" ry="12" stroke="#AC8A64" strokeWidth="3" fill="none" />
    </g>
  );
}

export const MirrorScene: React.FC = () => {
  const f = useCurrentFrame();
  const exposureFrame = Math.min(f, LAST_SHOT);
  const reveal = E.inOut(seg(f, 75, 97));
  const left = lerp(0, 52, reveal);
  const top = lerp(TOP, 298, reveal);
  const bottom = lerp(BOT, 1450, reveal);
  const margin = 34 * reveal;
  const paperX = left - margin;
  const paperY = top - margin;
  const paperW = 1080 - 2 * paperX;
  const paperH = bottom + 200 * reveal - paperY;
  const angle = kf(f, [[75, 0], [90, -5.4, E.inOut], [100, -3.0, E.out], [134, -3.0]]);
  const scale = kf(f, [[75, 1], [93, 0.814, E.inOut], [102, 0.831, E.out], [134, 0.831]]);
  const paperKick = kf(f, [[104, 0], [105, 8, E.out], [110, 0, E.out]]);
  const drop = kf(f, [[75, 0], [91, 138, E.inOut], [101, 110, E.out]]);
  return (
    <Stage bg="#332C3E" overlay={<GymVictory f={f} start={105} title="MIRROR CHECK" theme="mirror" />}>
      <Materials />
      <defs>
        <clipPath id="mir-exposure-area">
          <rect x={left} y={top} width={1080 - left * 2} height={bottom - top} />
        </clipPath>
      </defs>
      {f > 75 ? <Album /> : null}
      <g transform={`translate(540 ${960 + drop + paperKick}) rotate(${angle}) scale(${scale}) translate(-540 -960)`}>
        {f > 75 ? (
          <g>
            <rect x={paperX + 12} y={paperY + 27} width={paperW} height={paperH} rx="6" fill="#16141D" opacity=".24" />
            <rect x={paperX + 5} y={paperY + 15} width={paperW} height={paperH} rx="5" fill="#100E17" opacity=".38" />
            <rect x={paperX} y={paperY + 4} width={paperW} height={paperH} rx="5" fill="#B2A18F" />
            <rect x={paperX} y={paperY} width={paperW} height={paperH} rx="5" fill="url(#mir-paper)" />
            <rect x={paperX} y={paperY} width={paperW} height={paperH} rx="5" fill="url(#mir-paper-fibre)" />
          </g>
        ) : null}
        <g clipPath="url(#mir-exposure-area)">
          <Freeze frame={exposureFrame}><Reflection f={exposureFrame} /></Freeze>
          <Exposure f={f} />
        </g>
        <g opacity={reveal}>
          <rect x={left} y={top} width={1080 - left * 2} height={bottom - top} fill="none" stroke="#544742" strokeWidth="2.5" />
          <g transform={`translate(0 ${bottom - 1450})`} opacity={E.out(seg(f, 91, 99))}>
            <path d="M62 1584H558" stroke="#A38B76" strokeWidth="1.8" />
            <text x="64" y="1565" fontFamily="Georgia, serif" fontStyle="italic" fontSize="70" fill="#473D4C">Gym session</text>
          </g>
          {f >= CONTACT ? <ProofMark /> : null}
          <StampTool f={f} />
        </g>
      </g>
    </Stage>
  );
};
