// Bike #2: "SEND IT" - bombing down an autumn mountain road at golden hour, tucked over the bars,
// leaves streaming past, the speedo climbing into the red. He hits the crest, flies - arms out
// like a plane - lands it, sits up, fist pump and a point at you.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, clamp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glint, ConfettiRain, FocusLines, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { makeRun } from './RunKit';
import { TITLE_FONT, SFX_FONT } from '../fonts';
import { rng } from '../lib/shape';
import { INK } from './kit';
import { RoadWorld, RoadObj, Bicycle, InHeroSpace, Helmet, RIDE, pedalLegs, gripBars, solesOf, P, ZH, HY, BIKE_C, BIKE_D, RoadSign } from './BikeKit';

const GX = 540;
const SC = 0.8;
const WHEE = 16;
const TAKE = 40;
const LAND = 58;
const PUMP = 68;
const POINT = 80;
const CARD = 98;
const RUN = makeRun(
  [[0, 0.22], [TAKE, 0.44, E.in], [LAND, 0.44], [LAND + 16, 0.2, E.out], [140, 0.16]],
  [[0, 12], [TAKE, 9], [LAND + 10, 16]],
  [TAKE - 2, TAKE + 2],
);
const kmh = (f: number) => kf(f, [[0, 48], [TAKE, 94, E.in], [LAND, 99], [LAND + 16, 62, E.out], [140, 55]]);
const airT = (f: number) => (f > TAKE && f < LAND ? (f - TAKE) / (LAND - TAKE) : -1);

const TUCK: Partial<Pose> = {
  ...RIDE, torsoSy: 0.74, chestS: 1.0, lid: 0.35, brow: -0.2, browTilt: -0.6, mouthMode: 'grin', mouthOpen: 0.25, smile: 0.9, mouthSkew: 0.4,
};
const WHEEE: Partial<Pose> = { ...TUCK, lid: 0, pupil: 0.8, brow: 0.9, browTilt: 0.2, mouthOpen: 1, smile: 1, mouthSkew: 0 };
const PLANE: Partial<Pose> = {
  ...WHEEE, torsoSy: 0.98, chestS: 1.1, shL: 92, elL: -4, shR: 92, elR: -4, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0,
  handL: 'open', handR: 'open', flexL: 1, flexR: 1, eyeMode: 'star', brow: 1, rot: 0,
};
const UPRIGHT: Partial<Pose> = { ...RIDE, mouthMode: 'grin', mouthOpen: 0.7, smile: 1, lid: 0, brow: 0.8, browTilt: 0, eyeMode: 'normal', pupil: 1 };
const FIST: Partial<Pose> = { ...UPRIGHT, shR: 156, elR: 22, uaR: 1, faR: 1, handR: 'fist', flexR: 1.5 };
const POINTING: Partial<Pose> = {
  ...UPRIGHT, shR: 54, elR: -18, uaR: 0.55, faR: 0.5, wrR: -10, handR: 'point', wink: 1, mouthSkew: 0.7, mouthOpen: 0.4, turn: 0.15, lookX: 0.1,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: TUCK },
  { f: WHEE - 3, p: TUCK },
  { f: WHEE, p: WHEEE, e: E.out },
  { f: TAKE - 3, p: { ...WHEEE, torsoSy: 0.8 } },
  { f: TAKE + 3, p: { ...WHEEE, torsoSy: 0.9, lid: 0 }, e: E.out },
  { f: TAKE + 7, p: PLANE, e: E.back },
  { f: LAND - 4, p: PLANE },
  { f: LAND, p: { ...UPRIGHT, torsoSy: 0.8, sy: 0.92 }, e: E.in },
  { f: LAND + 5, p: UPRIGHT, e: E.out },
  { f: PUMP - 3, p: UPRIGHT },
  { f: PUMP + 2, p: FIST, e: E.back },
  { f: POINT - 4, p: FIST },
  { f: POINT + 1, p: POINTING, e: E.back },
  { f: 140, p: POINTING },
];

const solve = (f: number): Pose => {
  const th = RUN.phAt(f);
  const at = airT(f);
  const stand = at >= 0 ? Math.sin(Math.PI * at) : 0;
  const base = poseAt(f, BASE, KEYS);
  const legs = pedalLegs(th, stand);
  let p: Pose = { ...base, ...legs, x: 0, rot: base.rot ?? 0, y: (legs.y ?? 0) } as Pose;
  const grip = kf(f, [[TAKE + 2, 1], [TAKE + 6, 0, E.in], [LAND - 5, 0], [LAND - 1, 1, E.out]]);
  const gripR = Math.min(grip, kf(f, [[PUMP - 3, 1], [PUMP + 1, 0, E.in]]));
  const fore = (k: number) => lerp(1, 0.62, k);
  p = { ...p, uaL: lerp(p.uaL, fore(grip), grip), faL: lerp(p.faL, fore(grip), grip), uaR: lerp(p.uaR, fore(gripR), gripR), faR: lerp(p.faR, fore(gripR), gripR) };
  p = gripBars(p, 0, grip, 'L');
  p = gripBars(p, 0, gripR, 'R');
  if (grip > 0.5) p = { ...p, handL: 'grip' };
  if (gripR > 0.5) p = { ...p, handR: 'grip' };
  return p;
};

/** Speedo HUD (screen space). */
const Speedo: React.FC<{ x: number; y: number; v: number; f: number; o: number }> = ({ x, y, v, f, o }) => {
  if (o <= 0) return null;
  const R = 118;
  const ang = (deg: number) => (deg * Math.PI) / 180;
  const needle = 135 + (clamp(v / 100) * 270) + (v > 95 ? Math.sin(f * 2.3) * 4 : 0);
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = ang(135 + i * 27);
    ticks.push(<line key={i} x1={Math.cos(a) * (R - 16)} y1={Math.sin(a) * (R - 16)} x2={Math.cos(a) * (R - 38)} y2={Math.sin(a) * (R - 38)} stroke={i >= 8 ? '#F15F75' : '#FFFFFF'} strokeWidth={8} strokeLinecap="round" />);
  }
  const red = (a0: number, a1: number) => `M${Math.cos(ang(a0)) * (R - 8)} ${Math.sin(ang(a0)) * (R - 8)} A${R - 8} ${R - 8} 0 0 1 ${Math.cos(ang(a1)) * (R - 8)} ${Math.sin(ang(a1)) * (R - 8)}`;
  const na = ang(needle);
  return (
    <g transform={`translate(${x} ${y})`} opacity={o}>
      <circle r={R + 14} fill={INK} transform="translate(6 10)" opacity={0.4} />
      <circle r={R + 10} fill="#2B2840" stroke={INK} strokeWidth={10} />
      <path d={red(351, 405)} fill="none" stroke="#F15F75" strokeWidth={14} />
      {ticks}
      <line x1={0} y1={0} x2={Math.cos(na) * (R - 30)} y2={Math.sin(na) * (R - 30)} stroke="#FFD064" strokeWidth={10} strokeLinecap="round" />
      <circle r={16} fill="#FFD064" stroke={INK} strokeWidth={5} />
      <text x={0} y={62} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={54} fill={v > 95 ? '#FF8C9A' : '#FFFFFF'}>
        {Math.round(v)}
      </text>
      <text x={0} y={98} textAnchor="middle" dominantBaseline="middle" fontFamily={SFX_FONT} fontSize={26} fill="#B9B5CC" letterSpacing={2}>
        KM/H
      </text>
    </g>
  );
};

/** Autumn leaves blowing past from the vanishing point (screen space). */
const Leaves: React.FC<{ f: number; amt: number; burstAt: number; vx: number; vy: number }> = ({ f, amt, burstAt, vx, vy }) => {
  const r = rng(77);
  const cols = ['#E8743B', '#F2A23A', '#D9534F', '#F5C445'];
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const per = 14 + r() * 10;
    const off = r() * per;
    const c = cols[i % 4];
    const spin = (r() - 0.5) * 40;
    const t = ((f + off) % per) / per;
    if (amt > 0) {
      const d = t * t * 1700;
      const x = vx + Math.cos(a) * d;
      const y = vy + Math.sin(a) * d * 1.2;
      const s = 0.3 + t * 1.4;
      out.push(
        <g key={i} transform={`translate(${x} ${y}) rotate(${f * spin + i * 40}) scale(${s})`} opacity={amt * Math.min(1, t * 4)}>
          <path d="M0 -26 C18 -14 18 14 0 26 C-18 14 -18 -14 0 -26 Z" fill={c} stroke={INK} strokeWidth={4} />
          <path d="M0 -20 L0 22" stroke={INK} strokeWidth={3} opacity={0.5} />
        </g>,
      );
    }
    const bt = f - burstAt;
    if (bt >= 0 && bt < 30 && i < 24) {
      const d = 60 + bt * (14 + r() * 10);
      const x = 540 + Math.cos(a) * d;
      const y = 1500 + Math.sin(a) * d * 0.6 + bt * bt * 0.4;
      out.push(
        <g key={`b${i}`} transform={`translate(${x} ${y}) rotate(${bt * spin + i * 30})`} opacity={1 - bt / 30}>
          <path d="M0 -26 C18 -14 18 14 0 26 C-18 14 -18 -14 0 -26 Z" fill={c} stroke={INK} strokeWidth={4} />
        </g>,
      );
    }
  }
  return <g>{out}</g>;
};

export const BikeSendItScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const D = RUN.distAt(f);
  const at = airT(f);
  const air = at >= 0 ? Math.sin(Math.PI * at) * 300 : 0;
  const tilt = at >= 0 ? kf(f, [[TAKE, 0], [TAKE + 5, -7, E.out], [LAND - 6, 5, E.inOut], [LAND, 0, E.in]]) : 0;
  const GY = P(0, ZH).y;
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY - air + pt[1] * SC];
  const mouth = toStage(r.mouth());
  const chest = toStage(r.chest());
  const eyes = toStage(r.eyes());
  const speed = seg(f, 6, TAKE - 6) * (1 - seg(f, LAND + 4, LAND + 16));
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1100], [TAKE, 1060, E.inOut], [TAKE + 9, 900, E.out], [LAND, 1040, E.in], [LAND + 10, 1020, E.out], [POINT, 1000, E.inOut], [CARD + 10, 960, E.inOut]]),
    z: kf(f, [[0, 1.08], [TAKE - 2, 1.14, E.inOut], [TAKE + 9, 0.92, E.out], [LAND, 1.02, E.in], [LAND + 10, 1.0], [POINT, 1.1, E.inOut], [CARD + 10, 0.98, E.inOut]]),
    r: kf(f, [[0, 0], [20, -2], [TAKE, 2], [LAND, -1], [LAND + 12, 0]]),
  };
  const shk = Math.sin(f * 2.1) * 3 * speed;
  const s1 = shake(f, LAND, 14, 20, 1);
  const sh = { x: s1.x + shk, y: s1.y + Math.cos(f * 2.7) * 3 * speed, r: s1.r };
  const extra: RoadObj[] = [
    { X: 1.9, S: 4, key: 'sign1', draw: (x, y, s) => <RoadSign key="sign1" x={x} y={y} s={s} text="18%" /> },
    { X: -1.9, S: 14, key: 'sign2', draw: (x, y, s) => <RoadSign key="sign2" x={x} y={y} s={s} text="!!" color="#FFB04A" /> },
  ];
  const bike = (
    <InHeroSpace p={p}>
      <Bicycle soles={solesOf(p)} f={f} speed={RUN.speedAt(f) * 3} />
    </InHeroSpace>
  );
  // vanishing point on screen (for the streaks + leaves)
  const vpx = 540 + (540 - cam.cx) * cam.z;
  const vpy = 960 + (HY - cam.cy) * cam.z;

  return (
    <Stage bg="#8C7BE0" impact={f === LAND} overlay={<EndCard f={f} start={CARD} lines={['SEND IT']} pts="+1.5" color={BIKE_C} dark={BIKE_D} y={96} />}>
      <GlowDefs />
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="forest" seed={8} extra={extra} blur={speed * 0.8} />
      <g transform={camP(cam, 1, sh)}>
        {speed > 0.05 ? <FocusLines f={f} cx={540} cy={HY - 20} r0={560} r1={1900} n={44} opacity={0.45 * speed} width={7} /> : null}
        <ellipse cx={GX} cy={GY + 4} rx={140 * SC * (1 - air / 600)} ry={20 * SC * (1 - air / 600)} fill="#000" opacity={0.25} />
        <Dust f={f} start={TAKE - 1} x={GX} y={GY} n={6} seed={71} spread={260} size={50} color="#F2D3A6" line="#B98A5E" />
        <Dust f={f} start={LAND} x={GX} y={GY} n={10} seed={72} spread={420} size={64} color="#F2D3A6" line="#B98A5E" />
        <Burst x={chest[0]} y={chest[1]} r={420} t={seg(f, TAKE + 6, TAKE + 20)} seed={73} />
        <g transform={`rotate(${tilt} ${GX} ${GY - air})`}>
          <Hero p={p} x={GX} y={GY - air} scale={SC} shadow={false} headExtra={<Helmet />} between={bike} />
        </g>
        <Sparks f={f} start={LAND} seed={74} n={18} x={GX} y={GY} speed={[12, 26]} g={0.9} size={[10, 18]} colors={['#FFD064', '#FFFFFF']} />
        {/* tears streaming back off his eyes at speed */}
        {speed > 0.2 && f >= WHEE && f < TAKE + 4
          ? [0, 1, 2, 3].map((i) => {
              const t = ((f + i * 3) % 12) / 12;
              return (
                <g key={i}>
                  <ellipse cx={eyes[0] - 60 - t * 160} cy={eyes[1] + 4 + t * 30} rx={10 - t * 5} ry={7 - t * 3} fill="#A6DCFF" stroke={INK} strokeWidth={3} opacity={1 - t} />
                  <ellipse cx={eyes[0] + 60 + t * 160} cy={eyes[1] + 4 + t * 30} rx={10 - t * 5} ry={7 - t * 3} fill="#A6DCFF" stroke={INK} strokeWidth={3} opacity={1 - t} />
                </g>
              );
            })
          : null}
        <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, POINT + 1, POINT + 14)} />
      </g>
      <RoadWorld f={f} D={D} cam={cam} sh={sh} theme="forest" seed={8} layer="front" extra={extra} />
      <Leaves f={f} amt={speed} burstAt={LAND} vx={vpx} vy={vpy} />
      <Speedo x={190} y={1770} v={kmh(f)} f={f} o={1 - seg(f, CARD - 6, CARD)} />
      <Sfx f={f} start={WHEE} text="WHEEEEE!" x={420} y={620} size={140} rot={-6} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={TAKE} text="SEND IT!" x={540} y={330} size={190} rot={-6} fill="#FFD064" dur={22} />
      <Sfx f={f} start={LAND} text="STUCK IT!" x={540} y={1380} size={140} rot={5} fill="#FFFFFF" dur={16} />
      <ConfettiRain f={f} start={LAND + 2} n={50} seed={75} colors={['#E8743B', '#F5C445', '#FFFFFF', BIKE_C, '#D9534F']} />
    </Stage>
  );
};
