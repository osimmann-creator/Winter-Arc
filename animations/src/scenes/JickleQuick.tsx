// Jickle #5: "QUICK HANDS" - night court under the lights. A hands battle at the kitchen line that
// keeps getting faster - whap, whap, whapwhapwhap - until his last flick is so fast the lights
// blow out. One spotlight clunks on: paddle twirl, paddle to the heart, little bow.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { E, kf, seg, shake, lerp, poseAt, Key } from '../lib/anim';
import { Stage, Cam, camP, W, H, TOP, FULL_H } from '../fx/Stage';
import { Sfx, GlowDefs, Sparks, Ring, Burst } from '../fx/fx';
import { Swoosh, trail } from '../fx/motion';
import { EndCard } from '../fx/EndCard';
import { Paddle, PADDLE_FACE, Ball } from './Jickle';
import { JCourt, JNet, jP, jS, jR, jUn, JGREEN, JGREEN_D } from './JickleKit';

const XH = 0.2;
const ZH = 7.4;
const [GX, GY] = jP(XH, ZH);
const SC = jS(ZH);
/** his contacts; the opponent (at the camera) hits halfway between */
const HITS = [16, 25, 33, 40, 46, 51, 55];
const POP = 59;
const DARK = 62;
const SPOT = 67;
const TWIRL = 71;
const BOW = 84;
const CARD = 98;

const READY: Partial<Pose> = {
  hipL: 20, hipR: 20, knL: -36, knR: -36, thL: 0.88, thR: 0.88, ftL: 4, ftR: 4, torsoSy: 0.95,
  shR: 30, elR: -96, wrR: 20, uaR: 1, faR: 0.9, handR: 'fist', shL: 34, elL: -60, wrL: 10, handL: 'open',
  lid: 0.35, mouthMode: 'grit', mouthOpen: 0, smile: 0.4, brow: -0.4, browTilt: -1, lookX: 0, lookY: 0.4,
};
const FH: Partial<Pose> = { shR: 32, elR: 114, wrR: -20, faR: 1, lookX: 0.45, lookY: 0.2 };
const BH: Partial<Pose> = { shR: 22, elR: -116, wrR: 34, faR: 0.9, lookX: -0.4, lookY: 0.2 };
const SPOTLIT: Partial<Pose> = {
  hipL: 10, hipR: 10, knL: -6, knR: -6, thL: 1, thR: 1, ftL: 0, ftR: 0, torsoSy: 1, sy: 1, sx: 1,
  shR: 40, elR: 100, wrR: -20, faR: 1, shL: 24, elL: 20, handL: 'fist', lid: 0.1, mouthMode: 'grin', mouthOpen: 0.2, smile: 1, mouthSkew: 0.6,
  brow: 0.6, browTilt: -0.3, lookX: 0, lookY: 0, pupil: 1.1,
};
const BOWED: Partial<Pose> = {
  ...SPOTLIT, shR: 20, elR: -128, wrR: 60, shL: 16, elL: 10, head: 8, lid: 1, mouthSkew: 0.3, mouthOpen: 0.1, brow: 0.4, browTilt: 0, sy: 0.98, torsoSy: 0.97,
};

const KEYS: Key<Pose>[] = (() => {
  const k: Key<Pose>[] = [{ f: 0, p: READY }, { f: HITS[0] - 5, p: READY }];
  HITS.forEach((h, i) => {
    const side = i % 2 === 0 ? FH : BH;
    k.push({ f: h - 1, p: { ...READY, ...side } as Partial<Pose>, e: E.out });
    k.push({ f: h + 1, p: { ...READY, ...side, wrR: (side.wrR ?? 0) + (i % 2 ? -18 : 18) } as Partial<Pose>, e: E.out });
  });
  k.push({ f: POP + 1, p: { ...READY, ...FH, wrR: -60, shR: 70, elR: 70, mouthMode: 'grin', mouthOpen: 0.6, smile: 1, lid: 0, brow: 0.6, browTilt: 0 }, e: E.out });
  k.push({ f: DARK + 1, p: { ...READY, ...FH, mouthMode: 'o', mouthOpen: 0.5, lid: 0, pupil: 1.3, brow: 1, browTilt: 0.4, lookX: -0.4, lookY: -0.6 } });
  k.push({ f: SPOT + 2, p: SPOTLIT, e: E.back });
  k.push({ f: BOW - 3, p: SPOTLIT });
  k.push({ f: BOW + 3, p: BOWED, e: E.inOut });
  k.push({ f: 140, p: BOWED });
  return k;
})();

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  const twirl = f >= TWIRL && f < TWIRL + 10 ? E.inOut(seg(f, TWIRL, TWIRL + 10)) * 720 : 0;
  p = { ...p, wrR: p.wrR + twirl };
  const sway = f < POP ? Math.sin(f / 4) * 4 : 0;
  return plant({ ...p, torso: p.torso + sway * 0.3 }, f < POP ? Math.max(0, Math.sin(f / 2.6)) * 5 : 0);
};

type V3 = [number, number, number];
const faceWorld = (f: number): V3 => {
  const p = solve(f);
  const r = rig(p);
  const w = r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]);
  const u = jUn(GX + w[0] * SC, GY + w[1] * SC, ZH - 0.4);
  return [u.X, ZH - 0.4, u.h];
};
const OPP = (i: number): V3 => [i % 2 ? 0.9 : -0.7, -4.4, 3.4 + (i % 3) * 0.3];

const ballAt = (f: number): V3 | null => {
  // first feed comes in from the opponent
  const legs: { f0: number; f1: number; a: V3; b: V3 }[] = [{ f0: 8, f1: HITS[0], a: OPP(0), b: faceWorld(HITS[0]) }];
  HITS.forEach((h, i) => {
    const next = HITS[i + 1];
    if (next !== undefined) {
      const mid = (h + next) / 2;
      legs.push({ f0: h, f1: mid, a: faceWorld(h), b: OPP(i + 1) });
      legs.push({ f0: mid, f1: next, a: OPP(i + 1), b: faceWorld(next) });
    } else {
      legs.push({ f0: h, f1: h + 4, a: faceWorld(h), b: [-1.4, -6.6, 5.6] });
    }
  });
  for (const l of legs) {
    if (f >= l.f0 && f < l.f1) {
      const t = (f - l.f0) / (l.f1 - l.f0);
      return [lerp(l.a[0], l.b[0], t), lerp(l.a[1], l.b[1], t), lerp(l.a[2], l.b[2], t) + 0.5 * Math.sin(Math.PI * t)];
    }
  }
  return null;
};

export const JickleQuickScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const toStage = (pt: [number, number]): [number, number] => [GX + pt[0] * SC, GY + pt[1] * SC];
  const face = toStage(r.W(r.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]));
  const b = ballAt(f);
  const cam: Cam = {
    cx: kf(f, [[0, 570], [HITS[6], 580], [POP, 540, E.inOut], [DARK, 540], [SPOT, 570, E.inOut], [CARD + 8, 570]]),
    cy: kf(f, [[0, 880], [HITS[0], 900, E.inOut], [HITS[6], 910, E.inOut], [POP, 760, E.inOut], [DARK + 1, 760], [SPOT, 880, E.inOut], [BOW, 860, E.inOut], [CARD + 8, 880, E.inOut]]),
    z: kf(f, [[0, 1.55], [HITS[0], 1.65, E.inOut], [HITS[6], 1.95, E.in], [POP, 1.05, E.inOut], [DARK + 1, 1.05], [SPOT, 1.9, E.inOut], [BOW, 2.1, E.inOut], [CARD + 8, 1.9, E.inOut]]),
  };
  let shx = 0;
  let shy = 0;
  HITS.forEach((h, i) => {
    const s = shake(f, h, 6, 4 + i * 1.6, i + 1);
    shx += s.x;
    shy += s.y;
  });
  const sp = shake(f, POP, 14, 18, 9);
  const sh = { x: shx + sp.x, y: shy + sp.y, r: sp.r };
  const lights = f < POP ? 1 : f < POP + 3 ? 2.4 : 0;
  const dark = seg(f, POP + 2, DARK);
  const spot = E.out(seg(f, SPOT, SPOT + 4));
  const ballNode = b ? (() => {
    const [x, y] = jP(b[0], b[1], b[2]);
    return <Ball x={x} y={y} r={jR(b[1])} rot={f * 20} />;
  })() : null;
  const ballTrail = trail((ff) => {
    const q = ballAt(ff);
    return q ? jP(q[0], q[1], q[2]) : b ? jP(b[0], b[1], b[2]) : [0, 0];
  }, f, 4, 0.5);
  const paddleTrail = trail((ff) => {
    const q = solve(ff);
    const rr = rig(q);
    const w = rr.W(rr.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]);
    return [GX + w[0] * SC, GY + w[1] * SC];
  }, f, 5, 0.6);
  const speedy = seg(f, HITS[2], HITS[5]);
  // hero centre on screen, for the spotlight hole
  const hx = W / 2 + (GX - cam.cx) * cam.z;
  const hy = H / 2 + (GY - 330 * SC - cam.cy) * cam.z;
  const lastHit = HITS[HITS.length - 1];

  return (
    <Stage bg="#0A0F2E" overlay={<EndCard f={f} start={CARD} lines={['QUICK HANDS']} pts="+0.5" color={JGREEN} dark={JGREEN_D} y={96} />}>
      <GlowDefs />
      <JCourt
        f={f}
        cam={cam}
        sh={sh}
        theme="night"
        lights={lights}
        banner="JICKLE CLUB"
        lampFx={(x, y) => (
          <>
            <Burst x={x} y={y} r={150} t={seg(f, POP, POP + 9)} seed={51} fill="#FFFFFF" fill2="#FFF6C9" />
            <Sparks f={f} start={POP + 1} seed={52 + Math.round(x)} n={14} x={x} y={y} speed={[8, 20]} g={0.9} size={[6, 12]} colors={['#FFF6C9', '#FFFFFF', '#FFD064']} />
          </>
        )}
      >
        <ellipse cx={GX} cy={GY + 4} rx={150 * SC} ry={22 * SC} fill="#000" opacity={0.3} />
        {f >= HITS[1] - 2 && f <= lastHit + 3 ? <Swoosh pts={paddleTrail} width={110} opacity={0.45 + speedy * 0.3} /> : null}
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemR={<Paddle />} />
        {b && b[1] > 0 ? (
          <>
            <Swoosh pts={ballTrail} width={jR(b[1]) * 1.7} color="#FFF3A0" opacity={0.5 + speedy * 0.3} />
            {ballNode}
          </>
        ) : null}
        {HITS.map((h, i) => {
          const rr = rig(solve(h));
          const at = toStage(rr.W(rr.aR.wrist, PADDLE_FACE[0], PADDLE_FACE[1]));
          return <Ring key={h} x={at[0]} y={at[1]} t={seg(f, h, h + 6)} r={70 + i * 8} w={12} />;
        })}
        <Sparks f={f} start={lastHit} seed={53} n={18} x={face[0]} y={face[1]} speed={[10, 24]} size={[8, 16]} colors={['#FFD064', '#FFFFFF', '#FF8C5A']} />
        <JNet f={f} theme="night" />
        {b && b[1] <= 0 ? (
          <>
            <Swoosh pts={ballTrail} width={jR(b[1]) * 1.7} color="#FFF3A0" opacity={0.6} />
            {ballNode}
          </>
        ) : null}
      </JCourt>
      {/* lights out: everything goes dark except a spotlight on him */}
      {dark > 0 ? (
        <g>
          <defs>
            <radialGradient id="qhSpotG">
              <stop offset="0.72" stopColor="#000000" />
              <stop offset="1" stopColor="#FFFFFF" />
            </radialGradient>
            <mask id="qhSpot" maskUnits="userSpaceOnUse" x={-100} y={TOP - 100} width={W + 200} height={FULL_H + 200}>
              <rect x={-100} y={TOP - 100} width={W + 200} height={FULL_H + 200} fill="#FFFFFF" />
              {spot > 0 ? <ellipse cx={hx} cy={hy} rx={430 * spot} ry={640 * spot} fill="url(#qhSpotG)" /> : null}
            </mask>
          </defs>
          <rect x={-100} y={TOP - 100} width={W + 200} height={FULL_H + 200} fill="#04040C" opacity={0.86 * dark} mask="url(#qhSpot)" />
          {spot > 0 ? <path d={`M${hx - 70} ${TOP} L${hx - 430 * spot} ${hy + 520} L${hx + 430 * spot} ${hy + 520} L${hx + 70} ${TOP} Z`} fill="#FFF6D6" opacity={0.1 * spot} /> : null}
        </g>
      ) : null}
      <g transform={camP(cam, 1, sh)}>
        {HITS.map((h, i) =>
          i < 4 ? (
            <Sfx key={h} f={f} start={h} text="WHAP!" x={(i % 2 ? GX - 230 : GX + 230) * 1} y={GY - 560 * SC - i * 30} size={60 + i * 6} rot={i % 2 ? -10 : 10} fill="#FFFFFF" dur={8} />
          ) : null,
        )}
      </g>
      <Sfx f={f} start={HITS[4]} text="WHAPWHAPWHAP!" x={540} y={420} size={110} rot={-4} fill="#FFD064" dur={14} />
      <Sfx f={f} start={POP} text="POP! POP!" x={540} y={300} size={150} rot={6} fill="#FFFFFF" dur={12} />
      <Sfx f={f} start={DARK} text="LIGHTS OUT." x={540} y={520} size={150} rot={-4} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={SPOT} text="CLUNK" x={820} y={260} size={80} rot={8} fill="#FFF6C9" dur={10} />
    </Stage>
  );
};
