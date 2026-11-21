// Inside joke: "CRASH OUT KNR" - Connor sees a post, calls cap on it... and completely crashes out.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, ConfettiRain, Sparks, FocusLines, Burst } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK, Steam } from './kit';
import { NameTag, PEOPLE, Room, HandPhone, Cap, PostCard } from './jokekit';

export const CRASH_FRAMES = 165;
const GX = 540;
const GY = 1790;
const SC = 0.84;
const toStage = stageOf(GX, GY, SC);
const CAP_AT = 36;   // thumb jab: cap called
const RAGE = 50;     // crash out begins
const THROW = 74;    // phone goes flying
const CARD = 120;
const [BLUE] = PEOPLE.connor;

/* ------------------------------- poses ------------------------------- */
const LOOK: Partial<Pose> = {
  shR: 34, elR: 128, wrR: -20, handR: 'grip', shL: 18, elL: 20, handL: 'fist',
  lookX: 0.4, lookY: -0.7, turn: 0.1, head: -6, smile: 0.4, mouthOpen: 0, brow: 0.2,
};
const KEYS: Key<Pose>[] = [
  { f: 0, p: { ...LOOK } },
  { f: 16, p: { lid: 0.5, browTilt: -0.9, brow: -0.2, smile: 0, mouthMode: 'grit', mouthOpen: 0.15, lookX: 0.2, lookY: -0.9 } },
  { f: CAP_AT - 6, p: { shL: 120, elL: 40, handL: 'point', head: -8 } },
  { f: CAP_AT, p: { shL: 158, elL: -6, handL: 'point', lid: 0.3, mouthMode: 'o', mouthOpen: 0.7, brow: 0.6, browTilt: -1 }, e: E.snap },
  { f: RAGE - 4, p: { shL: 40, elL: 70, handL: 'fist', red: 0.4, sy: 0.94, sx: 1.04 } },
  { f: RAGE, p: { red: 1, mouthMode: 'grit', mouthOpen: 1, lid: 0.35, brow: -0.6, browTilt: -1, sweat: 1, sy: 1.06, sx: 0.96, chestS: 1.06, lookX: 0, lookY: 0, turn: 0 }, e: E.back },
  { f: CARD, p: {} },
  { f: CRASH_FRAMES, p: { mouthOpen: 0.55, red: 0.85 } },
];

const solve = (f: number): Pose => {
  let p = poseAt(f, BASE, KEYS);
  const r = clamp(seg(f, RAGE, RAGE + 4));
  if (r > 0) {
    // flailing arms + stomping, faster than is healthy
    const s = Math.sin(f * 0.9), c = Math.cos(f * 0.9), st = Math.sin(f * 0.55);
    const thrown = f >= THROW;
    const shR = thrown ? 150 + 30 * s : p.shR + (120 - p.shR) * r + 30 * s;
    p = {
      ...p,
      shL: p.shL + ((150 + 35 * c) - p.shL) * r, elL: p.elL + ((-30 + 40 * s) - p.elL) * r, handL: 'fist',
      shR, elR: p.elR + ((thrown ? -30 + 40 * c : 20 + 30 * c) - p.elR) * r, wrR: 0, handR: thrown ? 'fist' : 'grip',
      hipL: 6 + Math.max(0, st) * 40 * r, knL: -4 - Math.max(0, st) * 70 * r,
      hipR: 6 + Math.max(0, -st) * 40 * r, knR: -4 - Math.max(0, -st) * 70 * r,
      torso: 4 * s * r, head: 6 * c * r,
    };
  }
  return plant(p);
};

/* phone flight after the throw (stage space) */
const phoneAt = (f: number) => {
  const t = f - THROW;
  return { x: 760 + t * 26, y: 980 - t * 30 + t * t * 1.1, rot: t * 34 };
};

export const JokeCrashOutScene: React.FC = () => {
  const f = useCurrentFrame();
  const p = solve(f);
  const r = rig(p);
  const head = toStage(r.headTop());
  const ears = [toStage(r.W(r.head, -150, -150)), toStage(r.W(r.head, 150, -150))];
  const rage = seg(f, RAGE - 2, RAGE + 4);
  const flick = rage > 0 && f % 6 < 3 ? 1 : 0;
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1000], [CAP_AT - 8, 1000], [CAP_AT, 900, E.out], [RAGE - 4, 920], [RAGE + 4, 1060, E.out], [CARD, 1060], [CARD + 12, 880, E.inOut]]),
    z: kf(f, [[0, 1], [CAP_AT - 8, 1], [CAP_AT, 1.08, E.out], [RAGE - 4, 1.06], [RAGE + 4, 1.0, E.out], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, RAGE, 70, 16, 2);
  const sh2 = shake(f, CAP_AT, 10, 10, 5);
  const S = { x: sh.x + sh2.x, y: sh.y + sh2.y, r: sh.r + sh2.r };
  const capT = f - CAP_AT;
  const capFly = clamp(capT / 10);
  const capPos = { x: 790 - (1 - capFly) * 200, y: 430 - Math.sin(capFly * Math.PI) * 120 + (1 - capFly) * 140 };
  const phone = phoneAt(f);
  const phone0 = toStage(r.W(r.aR.wrist, 0, 70));
  const cardK = clamp(E.out(seg(f, 4, 16)));
  const steamO = rage * (0.7 + 0.3 * Math.sin(f));

  return (
    <Stage
      bg="#F4EEFF"
      overlay={<EndCard f={f} start={CARD} lines={['CRASH OUT', 'KNR']} pts="CAP" unit="" sub="CONNOR CALLED CAP" color="#E2384D" dark="#9E1F30" light="#FFC2C8" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.6, { x: S.x * 0.4, y: S.y * 0.4, r: 0 })}>
        <Room wall="#EFE8FF" stripe="#E6DDFB" floor="#D9C2A8" floorLine="#B99A7A" floorY={1640} />
      </g>
      {/* rage takes over the whole room */}
      {rage > 0 ? (
        <g opacity={rage}>
          <rect x={-100} y={-100} width={1280} height={2120} fill={flick ? '#FF5A4E' : '#E2384D'} />
          <FocusLines f={f} cx={540} cy={1000} r0={420} color={flick ? '#FFB13D' : '#FF8A5C'} opacity={0.75} n={46} width={30} />
        </g>
      ) : null}
      <g transform={camP(cam, 1, S)}>
        <ellipse cx={GX} cy={GY + 6} rx={260} ry={28} fill="#000" opacity={0.14} />
        <Hero p={p} x={GX} y={GY} scale={SC} shadow={false} itemR={f < THROW ? <HandPhone color="#2F66E6" dark="#1F47C2" glow={1 - rage} /> : undefined} />
        {/* steam out of both ears */}
        <Steam x={ears[0][0] - 20} y={ears[0][1]} f={f} h={170} o={steamO} w={22} seed={2} />
        <Steam x={ears[1][0] + 20} y={ears[1][1]} f={f + 5} h={170} o={steamO} w={22} seed={7} />
        {[0, 1, 2, 3].map((i) => (
          <Burst key={i} x={head[0] + [-260, 250, -200, 230][i]} y={head[1] + [80, 40, 360, 330][i]} r={110} t={seg(f, RAGE + 4 + i * 11, RAGE + 18 + i * 11)} fill="#FFD064" fill2="#FFFFFF" seed={i + 3} />
        ))}
      </g>
      {/* the post he's looking at, then the thrown phone (screen space) */}
      <g opacity={1 - seg(f, RAGE + 6, RAGE + 14)}>
        <PostCard
          x={lerp(phone0[0], 560, cardK) + sh2.x}
          y={lerp(phone0[1], 470, cardK) + sh2.y}
          s={0.92}
          rot={-3 + (capT > 0 && capT < 10 ? Math.sin(capT * 2) * 4 : 0)}
          name="SOMEONE"
          color="#F2853A"
          cat="RUN"
          pts="+1.5"
          caption="RAN 9 MILES. NOT TIRED."
          capOn={seg(f, CAP_AT, CAP_AT + 3)}
          t={f - 4}
        />
      </g>
      {capT >= 0 && f < RAGE + 14 ? (
        <g transform={`translate(${capPos.x} ${capPos.y}) rotate(${-20 + capFly * 14}) scale(${0.5 + capFly * 0.9})`} opacity={1 - seg(f, RAGE + 6, RAGE + 14)}>
          <Cap />
        </g>
      ) : null}
      {f >= THROW && f < THROW + 30 ? (
        <g transform={`translate(${phone.x} ${phone.y}) rotate(${phone.rot}) scale(1.6)`}>
          <HandPhone color="#2F66E6" dark="#1F47C2" />
        </g>
      ) : null}
      <Sparks f={f} start={CAP_AT} seed={4} n={16} x={760} y={430} speed={[12, 26]} g={0.6} size={[10, 18]} colors={['#FFFFFF', '#9FC2FF', '#2F66E6']} shape="star" />
      <g transform={camP(cam, 1, S)}>
        <NameTag x={head[0]} y={head[1] - 70} name="CONNOR" color={BLUE} t={f - 6} out={seg(f, CARD - 8, CARD)} />
      </g>
      <Sfx f={f} start={14} text="hmm." x={250} y={760} size={96} rot={-6} fill="#FFFFFF" dur={18} shake={false} />
      <Sfx f={f} start={CAP_AT} text="CAP!" x={820} y={250} size={170} rot={8} fill="#5E9BFF" dur={16} />
      <Sfx f={f} start={RAGE + 2} text="CRASH OUT!" x={540} y={330} size={150} rot={-6} fill="#FFD064" dur={26} />
      <Sfx f={f} start={THROW + 6} text="THAT'S CAP!!" x={560} y={1520} size={120} rot={5} fill="#FFFFFF" dur={22} />
      <Sfx f={f} start={98} text="AAARGH" x={300} y={520} size={120} rot={-12} fill="#FF8A5C" dur={20} />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={21} colors={['#E2384D', '#FFC2C8', '#FFFFFF', '#2F66E6', '#FFD064']} />
    </Stage>
  );
};
