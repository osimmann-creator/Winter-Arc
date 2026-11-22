// MMA #3 (Amaan): "FLYING KNEE" - squared up in the cage, two shuffle steps, then a flying knee
// straight at the lens. The screen cracks: K.O.! Cut wide - he drops back onto the mat, the big
// screen reads AMAAN WINS, pyro, and he waves the viewer "night night".
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, LegG } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, lerp, clamp } from '../lib/anim';
import { Stage, camP, Cam, W, H } from '../fx/Stage';
import { Burst, Sparks, Sfx, GlowDefs, Glow, ConfettiRain, Ring, FocusLines, Dust, Glint } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { rng } from '../lib/shape';
import { INK } from './kit';
import { NameTag, PEOPLE } from './jokekit';
import { Glove, Headband } from './JokeMMA';
import { Arena, Jumbotron, HeroSpot, Pyro, RED, RED_D } from './MMAKit';

const STEP0 = 10;
const CROUCH = 28;
const TAKE = 32;
const HIT = 44;
const CUT = 60;
const LAND = 65;
const RAISE = 71;
const HOP = 80;
const WAVE = 91;
const CARD = 100;
const [ORANGE] = PEOPLE.amaan;
/** where the knee meets the lens (screen space) */
const KO: [number, number] = [540, 1290];

const GUARD: Partial<Pose> = {
  shL: 50, elL: 130, shR: 46, elR: 126, uaL: 1, uaR: 1, faL: 1, faR: 1, wrL: 0, wrR: 0,
  hipL: 14, hipR: 14, knL: -14, knR: -14, thL: 0.94, thR: 0.94, ftL: 0, ftR: 0, shinL: 1, shinR: 1, torsoSy: 0.98, chestS: 1.06,
  handL: 'fist', handR: 'fist', flexL: 1.3, flexR: 1.3, mouthMode: 'grin', smile: 0.6, mouthSkew: 0.5, mouthOpen: 0, lid: 0.3, brow: -0.2, browTilt: -0.6,
};
const CROUCHED: Partial<Pose> = {
  ...GUARD, hipL: 22, hipR: 22, knL: -46, knR: -46, thL: 0.8, thR: 0.8, torsoSy: 0.93, sy: 0.95,
  shL: 30, elL: 80, shR: 30, elR: 80, mouthMode: 'grit', mouthOpen: 0.15, smile: 0.2, brow: -0.6, browTilt: -1.1, lid: 0.4,
};
const KNEE: Partial<Pose> = {
  hipL: 6, knL: -34, thL: 0.92, shinL: 0.86, ftL: 38,
  hipR: 192, knR: -204, thR: 0.5, shinR: 0.78, ftR: 24,
  shL: 140, elL: 34, shR: 140, elR: 34, uaL: 0.8, uaR: 0.8, faL: 0.86, faR: 0.86,
  torsoSy: 1.02, chestS: 1.1, sy: 1, sx: 1, flexL: 1.6, flexR: 1.6,
  mouthMode: 'grit', mouthOpen: 0.8, smile: 0.3, mouthSkew: 0, brow: -0.7, browTilt: -1.2, lid: 0.1, pupil: 0.8,
};
const TUCK: Partial<Pose> = {
  hipL: 34, knL: -80, thL: 0.84, hipR: 34, knR: -80, thR: 0.84, ftL: 20, ftR: 20, shinL: 1, shinR: 1,
  shL: 150, elL: -10, shR: 150, elR: -10, uaL: 1, uaR: 1, faL: 1, faR: 1, torsoSy: 1, chestS: 1.06,
  mouthMode: 'grin', mouthOpen: 0.7, smile: 1, brow: 0.6, browTilt: 0, lid: 0, pupil: 1,
};
const RAISED: Partial<Pose> = {
  hipL: 13, hipR: 13, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 0, ftR: 0, shL: 150, shR: 150, elL: -16, elR: -16,
  handL: 'fist', handR: 'fist', chestS: 1.1, flexL: 1.6, flexR: 1.6, mouthMode: 'grin', mouthOpen: 1, smile: 1, mouthSkew: 0,
  lid: 0, brow: 0.9, browTilt: 0, eyeMode: 'star', turn: 0, lookX: 0,
};
const WAVING: Partial<Pose> = {
  ...RAISED, shL: 40, elL: 120, shR: 128, elR: 36, eyeMode: 'normal', wink: 1, mouthOpen: 0.5, mouthSkew: 0.7, brow: 0.5, browTilt: -0.4, turn: 0.15, lookX: 0.2,
};

const KEYS: Key<Pose>[] = [
  { f: 0, p: GUARD },
  { f: CROUCH - 7, p: GUARD },
  { f: CROUCH, p: CROUCHED, e: E.inOut },
  { f: TAKE, p: { ...CROUCHED, sy: 1.05, torsoSy: 1.02, hipL: 10, hipR: 10, knL: -14, knR: -14, thL: 0.95, thR: 0.95 }, e: E.in },
  { f: TAKE + 5, p: KNEE, e: E.out },
  { f: HIT, p: { ...KNEE, mouthOpen: 1, chestS: 1.12 } },
  { f: CUT - 1, p: { ...KNEE, mouthOpen: 1, chestS: 1.12 } },
  // second shot: drops back into the cage
  { f: CUT, p: TUCK, e: E.hold },
  { f: LAND - 1, p: { ...TUCK, hipL: 20, hipR: 20, knL: -30, knR: -30, thL: 0.94, thR: 0.94 } },
  { f: LAND, p: { ...RAISED, hipL: 24, hipR: 24, knL: -50, knR: -50, thL: 0.78, thR: 0.78, sy: 0.9, sx: 1.05, shL: 120, shR: 120, elL: 20, elR: 20, eyeMode: 'normal', mouthOpen: 0.6 }, e: E.in },
  { f: RAISE, p: RAISED, e: E.back },
  { f: RAISE + 6, p: { chestS: 1.14 } },
  { f: WAVE - 4, p: { ...RAISED, chestS: 1.12, eyeMode: 'normal' } },
  { f: WAVE, p: WAVING, e: E.back },
  { f: 140, p: WAVING },
];

const SC0 = 0.72;
const SC1 = 0.84;
const SC_HIT = 2.05;
const GY0 = 1690;
const GY1 = 1770;
const SC2 = 0.78;
const GY2 = 1730;

const camAt = (f: number): Cam =>
  f < CUT
    ? {
        cx: 540,
        cy: kf(f, [[0, 1110], [CROUCH, 1150, E.inOut], [HIT, 1120, E.out]]),
        z: kf(f, [[0, 0.98], [CROUCH, 1.04, E.inOut], [TAKE, 1.02], [HIT, 1.06, E.in], [CUT, 1.1, E.out]]),
        r: kf(f, [[TAKE, 0], [HIT, -2.5, E.in]]),
      }
    : {
        cx: 540,
        cy: kf(f, [[CUT, 1060], [LAND, 1110, E.in], [RAISE, 1080, E.out], [CARD + 10, 1050, E.inOut]]),
        z: kf(f, [[CUT, 0.88], [LAND, 0.94, E.in], [LAND + 4, 0.9, E.out], [RAISE, 0.93], [CARD + 10, 0.96, E.inOut]]),
      };

/** screen point -> stage point under camera c */
const fromScreen = (c: Cam, sx: number, sy: number): [number, number] => [c.cx + (sx - W / 2) / c.z, c.cy + (sy - H / 2) / c.z];

/** Ground-shot pose + placement (frames before take-off and the whole second shot). */
const groundPose = (f: number) => {
  let p = poseAt(f, BASE, KEYS);
  if (f < CUT) {
    // bounce on the toes, then two shuffle steps forward
    const bounce = f < STEP0 ? Math.abs(Math.sin((f / 7) * Math.PI)) * 14 : 0;
    const s1 = Math.sin(seg(f, STEP0, STEP0 + 8) * Math.PI) * 26;
    const s2 = Math.sin(seg(f, STEP0 + 8, STEP0 + 16) * Math.PI) * 26;
    p = { ...p, hipL: p.hipL + s1 * 0.5, knL: p.knL - s1, hipR: p.hipR + s2 * 0.5, knR: p.knR - s2 };
    p = plant(p, bounce + s1 * 0.3 + s2 * 0.3);
    const walk = E.inOut(seg(f, STEP0, STEP0 + 16));
    return { p, x: 540, y: lerp(GY0, GY1, walk), sc: lerp(SC0, SC1, walk) };
  }
  // shot 2: falls in from above, lands, celebrates
  const fall = E.in(seg(f, CUT, LAND));
  const hop = f >= HOP && f < HOP + 12 ? Math.sin(seg(f, HOP, HOP + 12) * Math.PI) * 150 : 0;
  p = plant(p, lerp(1100, 0, fall) + hop);
  if (f >= WAVE) p = { ...p, elR: p.elR + Math.sin((f - WAVE) / 2.6) * 26 * seg(f, WAVE, WAVE + 4), wrR: Math.sin((f - WAVE) / 2.6 - 0.8) * 16 };
  return { p, x: 540, y: GY2, sc: SC2 };
};

const solve = (f: number) => {
  if (f < TAKE || f >= CUT) return groundPose(f);
  // in the air: the hips ride a perspective rush at the lens, the knee lands on KO at HIT
  const g0 = groundPose(TAKE);
  const p = { ...poseAt(Math.min(f, HIT), BASE, KEYS), y: g0.p.y };
  const kp = { ...BASE, ...KNEE, y: g0.p.y } as Pose;
  const kr = rig(kp);
  const K1 = kr.W(kr.lR.knee);
  const t = seg(f, TAKE, HIT);
  const dist = 1 - (1 - g0.sc / SC_HIT) * t;
  const sc = g0.sc / dist;
  const u = (sc - g0.sc) / (SC_HIT - g0.sc);
  const k0: [number, number] = [g0.x + K1[0] * g0.sc, g0.y + K1[1] * g0.sc];
  const tgt = fromScreen(camAt(HIT), KO[0], KO[1]);
  const kx = lerp(k0[0], tgt[0], u);
  const ky = lerp(k0[1], tgt[1], u) - Math.sin(Math.PI * t) * 170;
  return { p, x: kx - K1[0] * sc, y: ky - K1[1] * sc, sc };
};

/** Cracked-glass overlay in screen space. t = frames since impact. */
const Crack: React.FC<{ x: number; y: number; t: number; seed?: number }> = ({ x, y, t, seed = 71 }) => {
  if (t < 0) return null;
  const grow = E.out(clamp(t / 3.5));
  const r = rng(seed);
  const N = 13;
  const rays: { pts: [number, number][]; ds: number[] }[] = [];
  for (let i = 0; i < N; i++) {
    let a = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const len = 900 + r() * 900;
    const pts: [number, number][] = [[x, y]];
    const ds = [0];
    let d = 0;
    let px = x;
    let py = y;
    while (d < len) {
      const step = 70 + r() * 130;
      d += step;
      a += (r() - 0.5) * 0.4;
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      pts.push([px, py]);
      ds.push(d);
    }
    rays.push({ pts, ds });
  }
  const at = (ray: { pts: [number, number][]; ds: number[] }, R: number): [number, number] => {
    for (let i = 1; i < ray.ds.length; i++) {
      if (ray.ds[i] >= R) {
        const k = (R - ray.ds[i - 1]) / (ray.ds[i] - ray.ds[i - 1]);
        return [lerp(ray.pts[i - 1][0], ray.pts[i][0], k), lerp(ray.pts[i - 1][1], ray.pts[i][1], k)];
      }
    }
    return ray.pts[ray.pts.length - 1];
  };
  const pd = (pts: [number, number][]) => 'M' + pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join('L');
  let d = '';
  rays.forEach((ray) => (d += pd(ray.pts)));
  const rings = [90, 200, 360, 580];
  const shards: React.ReactNode[] = [];
  rings.forEach((R, ri) => {
    for (let i = 0; i < N; i++) {
      if (r() < 0.25 + ri * 0.12) continue;
      const a = at(rays[i], R * (0.85 + r() * 0.3));
      const b = at(rays[(i + 1) % N], R * (0.85 + r() * 0.3));
      const mx = (a[0] + b[0]) / 2 + (x - (a[0] + b[0]) / 2) * 0.12;
      const my = (a[1] + b[1]) / 2 + (y - (a[1] + b[1]) / 2) * 0.12;
      d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${mx.toFixed(1)} ${my.toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      if (ri < 2 && r() < 0.45) {
        const c = at(rays[i], R * 0.45);
        shards.push(<path key={`${ri}-${i}`} d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}Z`} fill="#FFFFFF" opacity={0.22} />);
      }
    }
  });
  const fade = 1 - seg(t, CUT - HIT - 3, CUT - HIT);
  return (
    <g opacity={fade}>
      <defs>
        <clipPath id="koCrack">
          <circle cx={x} cy={y} r={grow * 2300} />
        </clipPath>
      </defs>
      <g clipPath="url(#koCrack)">
        {shards}
        <path d={d} fill="none" stroke={INK} strokeWidth={11} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
        <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
      </g>
      <circle cx={x} cy={y} r={46 * grow} fill="#FFFFFF" opacity={0.85} />
      <circle cx={x} cy={y} r={46 * grow} fill="none" stroke={INK} strokeWidth={8} />
    </g>
  );
};

export const MMAFlyingKneeScene: React.FC = () => {
  const f = useCurrentFrame();
  const { p, x: GX, y: GY, sc: SC } = solve(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const head = toStage(r.headTop());
  const chest = toStage(r.chest());
  const knee = toStage(r.W(r.lR.knee));
  const mouth = toStage(r.mouth());
  const shot2 = f >= CUT;
  const cam = camAt(f);
  const s1 = shake(f, HIT, 12, 34, 1);
  const s2 = shake(f, LAND, 10, 14, 2);
  const s3 = shake(f, RAISE, 10, 10, 3);
  const sh = { x: s1.x + s2.x + s3.x, y: s1.y + s2.y + s3.y, r: s1.r };
  const hype = shot2 ? 1 : kf(f, [[0, 0.35], [TAKE, 0.7], [HIT, 1]]);
  const screen = !shot2 ? (
    <Jumbotron text="AMAAN" sub="ROUND 3" color={ORANGE} />
  ) : (
    <Jumbotron text="K.O." sub="AMAAN WINS" color="#FFD064" flash={1 - seg(f, LAND, LAND + 8)} />
  );
  const air = f >= TAKE && f < CUT;
  const frontLeg = p.hipR > 100 ? <LegG l={r.lR} root={r.root} /> : null;
  const rush = seg(f, TAKE + 3, HIT) * (1 - seg(f, HIT + 2, HIT + 8));
  const flash = shot2 ? 1 - seg(f, CUT, CUT + 5) : seg(f, CUT - 3, CUT);

  return (
    <Stage bg="#100E24" impact={f === HIT} overlay={<EndCard f={f} start={CARD} lines={['FLYING KNEE']} pts="+1.5" color={RED} dark={RED_D} y={96} />}>
      <GlowDefs />
      <Arena f={f} cam={cam} sh={sh} hype={hype} screen={screen} spots={1} />
      {rush > 0 ? <FocusLines f={f} cx={KO[0]} cy={KO[1] - 80} r0={420} r1={1700} n={60} opacity={0.5 * rush} /> : null}
      <g transform={camP(cam, 1, sh)}>
        <HeroSpot x={shot2 ? 540 : 540} y={(shot2 ? GY2 : lerp(GY0, GY1, seg(f, STEP0, STEP0 + 16))) + 6} o={1} w={shot2 ? 270 : 250} />
        {!air ? (
          <ellipse cx={GX} cy={GY + 4} rx={230 * SC * (shot2 ? clamp(0.4 + seg(f, CUT, LAND) * 0.6) : 1)} ry={26 * SC} fill="#000" opacity={0.3} />
        ) : (
          <ellipse cx={540} cy={GY1 + 4} rx={190 * (1 - seg(f, TAKE, TAKE + 8))} ry={22} fill="#000" opacity={0.25} />
        )}
        {shot2 ? (
          <>
            <Pyro x={150} y={GY2 - 40} t={f - LAND} />
            <Pyro x={930} y={GY2 - 40} t={f - LAND} />
            <Pyro x={150} y={GY2 - 40} t={f - HOP - 6} h={700} />
            <Pyro x={930} y={GY2 - 40} t={f - HOP - 6} h={700} />
            <Dust f={f} start={LAND} x={GX} y={GY2} n={9} seed={61} spread={420} size={70} color="#ECEAF6" line="#9A95C0" />
            <Glow x={chest[0]} y={chest[1]} r={kf(f, [[RAISE - 1, 0], [RAISE + 3, 520, E.out], [RAISE + 24, 360]])} id="glowY" o={seg(f, RAISE - 1, RAISE + 1) * 0.7} />
            <Burst x={chest[0]} y={chest[1]} r={420} t={seg(f, RAISE, RAISE + 16)} seed={62} />
          </>
        ) : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} headExtra={<Headband />} itemL={<Glove />} itemR={<Glove />} front={frontLeg} />
        {!shot2 ? (
          <>
            <Burst x={knee[0]} y={knee[1]} r={620} t={seg(f, HIT, HIT + 12)} seed={63} fill="#FFFFFF" fill2="#FFD064" />
            <Sparks f={f} start={HIT} seed={64} n={26} x={knee[0]} y={knee[1]} speed={[22, 50]} g={0.6} size={[16, 30]} colors={['#FFFFFF', '#FFD064', '#F2853A']} />
            <NameTag x={head[0]} y={head[1] - 70} name="AMAAN" color={ORANGE} t={f - 4} out={seg(f, CROUCH - 6, CROUCH - 2)} s={0.9} />
          </>
        ) : (
          <>
            <Sparks f={f} start={RAISE} seed={65} n={24} x={chest[0]} y={chest[1]} speed={[16, 38]} g={0.8} size={[14, 26]} colors={['#FFD064', '#FFFFFF', '#F2853A']} />
            <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.1} t={seg(f, WAVE + 2, WAVE + 16)} />
          </>
        )}
      </g>
      {!shot2 ? (
        <>
          <Ring x={KO[0]} y={KO[1]} t={seg(f, HIT, HIT + 10)} r={700} w={34} />
          <Crack x={KO[0]} y={KO[1]} t={f - HIT} />
        </>
      ) : null}
      {flash > 0 ? <rect x={-40} y={-400} width={1160} height={2800} fill="#FFFFFF" opacity={flash} /> : null}
      <Sfx f={f} start={TAKE} text="HAAA!" x={300} y={250} size={130} rot={-8} fill="#FFFFFF" dur={11} />
      <Sfx f={f} start={HIT + 1} text="K.O.!" x={540} y={840} size={300} rot={-6} fill={RED} dur={CUT - HIT - 1} />
      <Sfx f={f} start={WAVE} text="NIGHT NIGHT!" x={540} y={760} size={120} rot={-5} fill="#FFD064" dur={22} />
      <ConfettiRain f={f} start={RAISE} n={56} seed={66} colors={[RED, '#FFC9C9', '#FFFFFF', '#FFD064', '#F2853A']} />
    </Stage>
  );
};
