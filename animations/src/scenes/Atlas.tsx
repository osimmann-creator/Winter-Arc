// Atlas Mode: a stone celestial atlas becomes a new star in the observatory.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ArmG, BASE, Hero, Pose, plant, rig } from '../hero/Hero';
import { Cam, camP, Stage } from '../fx/Stage';
import { E, kf, Key, lerp, poseAt, seg, wobble } from '../lib/anim';
import { svgM } from '../lib/m2';
import { Pt, stageOf } from './kit';
import { reach, reach2 } from './ik';
import { GymTheatre, GymVictory } from './GymTheatre';
import { AtlasGlobe } from './AtlasGlobe';

const GX = 475;
const GY = 1700;
const SC = 1.06;
const RADIUS = 211;
const PRESS = 51;
const RELEASE = 89;
const ARRIVE = 106;
const STAR: Pt = [792, 375];
const toStage = stageOf(GX, GY, SC);
const mixPoint = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const angleMix = (a: number, b: number, t: number) => a + ((b - a + 540) % 360 - 180) * t;
const straight: Partial<Pose> = {
  hipL: 13, hipR: 15, knL: -12, knR: -10, ftL: -1, ftR: -4, thL: 1, thR: 1,
  torsoSy: 1, sy: 1, sx: 1,
};
const keys: Key<Pose>[] = [
  { f: 0, p: {
    hipL: 54, hipR: 47, knL: -83, knR: -75, ftL: 25, ftR: 26, thL: .83, thR: .88,
    chestS: 1.01, torsoSy: .90, torso: 4, head: 7, x: -8, turn: -.12,
    handL: 'open', handR: 'open', flexL: .74, flexR: .7, mouthOpen: .16, mouthMode: 'o',
    lookX: -.1, lookY: .78, brow: .4, armZL: 'top', armZR: 'top',
  } },
  { f: 9, p: { chestS: 1.045, head: 4, shrugL: 5, shrugR: 7, mouthOpen: .2 } },
  { f: 17, p: { hipL: 61, knL: -89, hipR: 54, knR: -83, torsoSy: .84, x: -11,
    eyes: .2, browTilt: -.7, mouthMode: 'grit', mouthOpen: 0, sweat: .22, red: .16 } },
  { f: 31, p: { ...straight, hipL: 28, hipR: 23, knL: -36, knR: -31, thL: .91, thR: .94,
    torso: -3, head: -3, turn: .09, chestS: 1.075, x: 1, lookY: .34, red: .58,
    sweat: .72, eyes: 0, lid: .36, browTilt: -.88, flexL: 1.36, flexR: 1.42 } },
  { f: 37, p: { ...straight, torso: -5, chestS: 1.10, head: -1, lookX: .45, lookY: 0,
    lid: .24, red: .44, shrugR: 12 } },
  { f: 42, p: { hipL: 36, knL: -45, hipR: 30, knR: -37, ftL: 9, ftR: 7,
    head: -5, chestS: 1.04, torsoSy: .92, lookY: -.42 } },
  { f: PRESS, p: { ...straight, chestS: 1.075, x: -5, torso: -5, head: -8, turn: .22,
    mouthMode: 'o', mouthOpen: .45, lookX: .62, lookY: -.76, lid: 0,
    brow: .9, browTilt: -.1, red: .18, flexL: 1.35, flexR: 1.35, sy: 1.025 }, e: E.sine },
  { f: 57, p: { sy: 1, mouthOpen: .34, sweat: .32, shrugL: 3, shrugR: 8, chestS: 1.035 } },
  { f: 68, p: { x: -12, turn: .31, head: -11, torso: -6, hipL: 16, hipR: 20,
    knL: -15, knR: -17, ftR: -2, red: 0, sweat: 0, mouthMode: 'grin',
    mouthOpen: .58, smile: 1, brow: .66, lookY: -.8, lookX: .98,
    handL: 'fist', handR: 'point', shR: 139, elR: 19, wrR: 16, flexR: 1.12, flexL: .9 } },
  { f: 79, p: { shR: 135, elR: 21, wrR: 20, head: -7, chestS: 1.055, mouthSkew: .42,
    lid: .28, browTilt: .3, mouthOpen: .28, shrugR: 0 } },
  { f: 85, p: { torso: -7, head: -8, shR: 127, elR: 26, wrR: 17, chestS: 1.02, lid: .12 } },
  { f: RELEASE, p: { x: -17, torso: -8, head: -12, shR: 140, elR: 21, wrR: 23,
    chestS: 1.065, brow: 1.06, lid: 0, smile: 1, mouthOpen: .7 }, e: E.in },
  { f: 94, p: { shR: 150, elR: 13, wrR: 19, lookY: -1, mouthOpen: .5 }, e: E.out },
  { f: 106, p: { x: -6, shR: 103, elR: 38, wrR: 11, chestS: 1.045, head: -9,
    torso: -3, brow: .66, mouthOpen: .17, mouthMode: 'o' } },
  { f: 118, p: { shR: 110, elR: 34, wrR: 8, chestS: 1.055, turn: .25, head: -4,
    mouthMode: 'grin', mouthOpen: .57, mouthSkew: .17, lid: .12, brow: .74 } },
  { f: 134, p: { head: -6, chestS: 1.035, lookX: .78, lookY: -.86, mouthOpen: .5, wrR: 10 } },
];

const liftCenter = (f: number): Pt => [
  kf(f, [[0, -18], [15, -18], [34, 8], [42, 21], [PRESS, 117, E.sine]]),
  kf(f, [[0, -RADIUS - 1], [15, -RADIUS - 1], [20, -RADIUS - 11, E.in],
    [34, -547, E.sine], [38, -565], [42, -542], [PRESS, -1020, E.sine]]),
];

function solve(f: number) {
  const effort = seg(f, 15, 19) * (1 - seg(f, 28, 34));
  const keyed = poseAt(f, BASE, keys);
  const body = plant({ ...keyed, torso: keyed.torso + Math.sin(f * 1.4) * effort * .71 });
  const center = liftCenter(f);
  const under = E.sine(seg(f, 32, PRESS));
  const angle = lerp(75, 41, under) * Math.PI / 180;
  const dx = Math.sin(angle) * (RADIUS - 9);
  const dy = Math.cos(angle) * (RADIUS - 9);
  const hold = reach2(body, [center[0] - dx, center[1] + dy], [center[0] + dx, center[1] + dy], 1, 1, 54);
  if (f < PRESS) return { actor: hold, center };
  const t = E.sine(seg(f, PRESS, 67));
  const { torso, W } = rig(body);
  const hip = W(torso, -137, -66);
  const rest = { ...body, ...reach(body, 'L', hip, 1, 44) };
  const actor: Pose = {
    ...body,
    shL: angleMix(hold.shL, rest.shL, t), elL: angleMix(hold.elL, rest.elL, t),
    wrL: lerp(0, -10, t), shR: angleMix(hold.shR, rest.shR, t),
    elR: angleMix(hold.elR, rest.elR, t), wrR: lerp(0, rest.wrR, t),
    handR: f < 61 ? 'open' : 'point', handL: f < 61 ? 'open' : 'fist',
  };
  // Anchor the near edge to the palm during the handover, then to the index
  // tip. The globe remains a rigid circle as the arm straightens beneath it.
  const r = rig(actor);
  const grip = r.W(r.aR.wrist, 22 * t, lerp(54, 138, t));
  const contactAngle = angle * (1 - t);
  const distance = lerp(RADIUS - 9, RADIUS - 3, t);
  return {
    actor,
    center: [grip[0] - Math.sin(contactAngle) * distance, grip[1] - Math.cos(contactAngle) * distance] as Pt,
  };
}

const releasePoint = toStage(solve(RELEASE).center);
const flightPoint = (f: number): Pt => {
  const t = E.out(seg(f, RELEASE, ARRIVE));
  const u = 1 - t;
  const c1: Pt = [releasePoint[0] + 116, releasePoint[1] - 130];
  const c2: Pt = [STAR[0] + 75, STAR[1] + 3];
  return [0, 1].map(i => u ** 3 * releasePoint[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t ** 3 * STAR[i]) as Pt;
};

const DialPlatform: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="atlas-dial-edge"><stop stopColor="#414A5C" /><stop offset=".22" stopColor="#746665" />
        <stop offset=".47" stopColor="#AE8B6F" /><stop offset=".7" stopColor="#6B5D5D" /><stop offset="1" stopColor="#3F4356" /></linearGradient>
      <radialGradient id="atlas-dial-stone" cx="40%" cy="34%" r="85%"><stop stopColor="#9D9C9B" /><stop offset=".57" stopColor="#768392" /><stop offset="1" stopColor="#50596F" /></radialGradient>
    </defs>
    <ellipse cx={530} cy={1764} rx={477} ry={74} fill="#22283B" opacity={.27} />
    <path d="M70 1705A460 76 0 0 1 990 1705V1738A460 76 0 0 1 70 1738Z" fill="url(#atlas-dial-edge)" stroke="#333241" strokeWidth={6} />
    <path d="M72 1724A458 76 0 0 0 988 1724M72 1732A458 76 0 0 0 988 1732" fill="none" stroke="#D6AC79" strokeWidth={2.7} />
    <ellipse cx={530} cy={1705} rx={460} ry={76} fill="url(#atlas-dial-stone)" stroke="#434054" strokeWidth={4.5} />
    <g transform="translate(530 1705) scale(1 .165)" fill="none" stroke="#DACA9E">
      <circle r={446} strokeWidth={6} /><circle r={414} strokeWidth={6} /><circle r={303} strokeWidth={5} />
      {Array.from({ length: 72 }, (_, i) => <path key={i} transform={`rotate(${i * 5})`} d={`M0 -443V${i % 6 ? -426 : -407}`} strokeWidth={i % 6 ? 3 : 6} />)}
      <g opacity={.7}>
        {[0, 45, 90, 135].map(a => <path key={a} transform={`rotate(${a})`} d="M0 -397L39 -39L0 0L-39 39L0 397L-11 32L-39 0L11 -31Z" fill="#A4ADAB" strokeWidth={4} />)}
      </g>
    </g>
  </g>
);

const CROWN: Pt[] = [[-140, -47], [-105, -14], [-64, 2], [0, 0], [47, -26], [79, -63], [94, -95]];
const StarCrown: React.FC<{ f: number }> = ({ f }) => {
  if (f < ARRIVE - 2) return null;
  const progress = E.sine(seg(f, ARRIVE - 2, ARRIVE + 14));
  const rays = 1 + 1.35 * Math.sin(seg(f, ARRIVE - 2, ARRIVE + 8) * Math.PI);
  return (
    <g transform={`translate(${STAR[0]} ${STAR[1]})`}>
      {CROWN.map(([x, y], i) => {
        if (i === 3) return null;
        const previous = CROWN[i < 3 ? i + 1 : i - 1];
        const step = Math.abs(i - 3) - 1;
        const q = seg(progress * 3, step, step + 1);
        const end = mixPoint(previous, [x, y], q);
        return <g key={i} opacity={Math.min(1, q * 4)}>
          <path d={`M${previous.join(' ')}L${end.join(' ')}`} fill="none" stroke="#F7D89D" strokeWidth={2.6} />
          <circle cx={x} cy={y} r={i % 2 ? 4.8 : 6} fill="#FFF0BD" opacity={q} />
        </g>;
      })}
      <circle r={34 * rays} fill="#FFDB8A" opacity={.085} />
      <path d="M0 -31Q3 -5 20 0Q3 4 0 31Q-3 5 -20 0Q-3 -4 0 -31Z" transform={`rotate(12) scale(${rays})`} fill="#FFEFBB" />
      <circle r={6} fill="#FFF9E1" />
    </g>
  );
};

const LaunchTrail: React.FC<{ f: number }> = ({ f }) => {
  if (f <= RELEASE || f > ARRIVE + 7) return null;
  const pts = Array.from({ length: 11 }, (_, i) => flightPoint(Math.max(RELEASE, f - i * .85)));
  const fade = 1 - seg(f, ARRIVE - 3, ARRIVE + 7);
  return <g opacity={fade}>
    {pts.slice(1).map((pt, i) => <path key={i} d={`M${pts[i].join(' ')}L${pt.join(' ')}`}
      fill="none" stroke={i % 3 ? '#FFCF85' : '#F8E8B8'} strokeWidth={(12 - i) * 2}
      opacity={(11 - i) / 18} strokeLinecap="round" />)}
  </g>;
};

export const AtlasScene: React.FC = () => {
  const f = useCurrentFrame();
  const { actor, center } = solve(f);
  const inFlight = f > RELEASE;
  const ball = inFlight ? flightPoint(f) : toStage(center);
  const flyT = seg(f, RELEASE, ARRIVE);
  const radius = RADIUS * SC * (inFlight ? lerp(1, .021, E.out(flyT)) : 1);
  const spin = kf(f, [[0, -7], [17, -7], [36, -2], [PRESS, 7], [56, 9], [68, 45, E.in],
    [82, 185, E.linear], [RELEASE, 242, E.linear], [ARRIVE, 478, E.linear]]);
  const camera: Cam = {
    cx: kf(f, [[0, 467], [16, 467], [39, 485], [PRESS + 4, 537], [RELEASE, 548], [ARRIVE, 549]]),
    cy: kf(f, [[0, 1295], [15, 1282], [36, 1157], [PRESS + 5, 990, E.sine], [RELEASE, 959], [ARRIVE, 915], [128, 965]]),
    z: kf(f, [[0, 1.39], [16, 1.32], [38, 1.12], [PRESS + 5, 1.01, E.sine], [81, 1.035], [ARRIVE, .985], [131, 1.06]]),
    r: kf(f, [[0, -2.1], [35, -.8], [PRESS + 5, .6], [75, 0]]),
  };
  const sh = { x: wobble(f, PRESS, .35, .23, 4), y: wobble(f, PRESS, .4, .26, 8), r: 0 };
  const r = rig(actor);
  const glow = seg(f, 53, 68) * (1 - seg(f, RELEASE + 1, ARRIVE));
  const chalk = seg(f, 15, 20) * (1 - seg(f, 22, 36));
  return (
    <Stage bg="#252D46" overlay={<GymVictory f={f} start={105} title="ATLAS MODE" theme="atlas" />}>
      <GymTheatre theme="atlas" f={f} cam={camera} sh={sh} />
      <g transform={camP(camera, 1, sh)} className="gym-actor">
        <DialPlatform />
        <ellipse cx={ball[0]} cy={GY - 1} rx={90 + 32 * (1 - seg(f, 16, 33))} ry={14} fill="#222436" opacity={.42 * (1 - seg(f, 16, 33))} />
        {chalk > 0 && [0, 1, 2, 3, 4, 5, 6].map(i => {
          const d = Math.max(0, f - 15);
          return <path key={i} d="M-5 1L-2 -4L5 -3L3 3Z" fill="#E2CE9F" opacity={chalk * .8}
            transform={`translate(${GX + (i % 2 ? 1 : -1) * (39 + i * 9 + d * (1.2 + i * .2))} ${GY - Math.max(0, d * (2.8 + i * .35) - d * d * .2)}) rotate(${i * 59 + d * 3})`} />;
        })}
        <Hero p={actor} x={GX} y={GY} scale={SC} />
        <LaunchTrail f={f} />
        {f < ARRIVE && <g transform={`translate(${ball[0]} ${ball[1]})`}>
          {glow > 0 && <circle r={radius + 7} fill="none" stroke="#FFE8A4" strokeWidth={2.8} opacity={glow * .58} />}
          <AtlasGlobe r={radius} spin={spin} />
        </g>}
        {/* Redraw only the parts meeting the solid globe. His face stays
            behind the stone during the seven-frame clean past the shoulders. */}
        {f <= RELEASE && <g>
          <defs><clipPath id="atlas-arm-contact"><circle cx={ball[0]} cy={ball[1]} r={radius + 3} /></clipPath></defs>
          <g clipPath="url(#atlas-arm-contact)">
            <g transform={`translate(${GX} ${GY}) scale(${SC}) ${svgM(r.root)}`}>
              <ArmG a={r.aR} root={r.root} flex={actor.flexR} hand={actor.handR} el={actor.elR} />
              {f <= 62 && <ArmG a={r.aL} root={r.root} flex={actor.flexL} hand={actor.handL} el={actor.elL} />}
            </g>
          </g>
        </g>}
        <StarCrown f={f} />
      </g>
    </Stage>
  );
};
