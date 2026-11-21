// Inside joke: "DYLAN STARTS FIGHTS" - someone ties Dylan for first place. That's not allowed.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant, C } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Cloud, Dust, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE } from './jokekit';
import { TITLE_FONT } from '../fonts';
import { rng, softStar, cloudPath } from '../lib/shape';

export const FIGHT_FRAMES = 165;
const TOP = 1400;            // top of the #1 block
const DX = 410;               // Dylan
const RX = 680;               // the other guy
const SC = 0.6;
const LAND = 24;
const MAD = 34;
const CLOUD = 54;
const CLEAR = 98;
const CARD = 122;
const [TEAL, TEAL_D] = PEOPLE.dylan;

/* ------------------------------- props ------------------------------- */
const Podium: React.FC = () => (
  <g>
    {[
      { x: 20, w: 270, top: 1580, n: '2', c: '#D9D5E6', d: '#B9B3CC' },
      { x: 790, w: 270, top: 1640, n: '3', c: '#E8C7A0', d: '#C9A27E' },
      { x: 270, w: 540, top: TOP, n: '1', c: C.gold, d: C.goldSh },
    ].map((b) => (
      <g key={b.n}>
        <rect x={b.x} y={b.top} width={b.w} height={1920 - b.top + 200} fill={b.c} stroke={INK} strokeWidth={10} />
        <rect x={b.x} y={b.top} width={b.w} height={26} fill="#FFFFFF" opacity={0.35} />
        <rect x={b.x + b.w - 40} y={b.top + 10} width={30} height={1920 - b.top} fill={b.d} opacity={0.5} />
        <text x={b.x + b.w / 2} y={b.top + 170} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={b.n === '1' ? 220 : 150} fill="#FFFFFF" stroke={INK} strokeWidth={14} paintOrder="stroke">
          {b.n}
        </text>
      </g>
    ))}
  </g>
);

/** The cartoon fight: a rolling dust ball with fists, feet and stars poking out. */
const FightCloud: React.FC<{ f: number; k: number; x: number; y: number }> = ({ f, k, x, y }) => {
  if (k <= 0.01) return null;
  const r = rng(Math.floor(f / 3) + 11);
  const bits = Array.from({ length: 6 }).map((_, i) => {
    const a = r() * Math.PI * 2;
    const kind = Math.floor(r() * 3);
    return { a, kind, d: 300 + r() * 60, rot: (a * 180) / Math.PI + 90, i };
  });
  return (
    <g transform={`translate(${x + Math.sin(f * 1.7) * 14} ${y + Math.cos(f * 1.3) * 10}) scale(${k})`}>
      {bits.map((b) => (
        <g key={b.i} transform={`translate(${Math.cos(b.a) * b.d} ${Math.sin(b.a) * b.d}) rotate(${b.rot})`}>
          {b.kind === 0 ? (
            <g>
              <rect x={-26} y={20} width={52} height={120} rx={20} fill={C.skinLimb} stroke={INK} strokeWidth={8} />
              <circle cx={0} cy={0} r={46} fill={C.skin} stroke={INK} strokeWidth={8} />
              <path d="M-26 -14 Q0 -30 26 -14" fill="none" stroke={C.line} strokeWidth={5} />
            </g>
          ) : b.kind === 1 ? (
            <g>
              <rect x={-24} y={30} width={48} height={120} rx={20} fill={C.skin} stroke={INK} strokeWidth={8} />
              <path d="M-40 30 Q-44 -30 0 -40 Q50 -40 46 30 Z" fill={C.sandal} stroke={INK} strokeWidth={8} />
            </g>
          ) : (
            <path d={softStar(0, 0, 54, 22, 5)} fill="#FFD064" stroke={INK} strokeWidth={7} />
          )}
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (i / 7) * Math.PI * 2 + f * 0.2;
        return <path key={i} d={cloudPath(Math.cos(a) * 150, Math.sin(a) * 110, 260, 200, i + 2)} fill="#FFFFFF" stroke={INK} strokeWidth={10} />;
      })}
      <path d={cloudPath(0, 0, 420, 320, 9)} fill="#FFFFFF" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${-120 + i * 110} ${-40 + (i % 2) * 70} q30 -30 60 0`} fill="none" stroke="#D9D5E6" strokeWidth={12} strokeLinecap="round" />
      ))}
    </g>
  );
};

const Bruised: React.FC<{ k: number }> = ({ k }) =>
  k <= 0.01 ? null : (
    <g opacity={k}>
      <ellipse cx={58} cy={-172} rx={46} ry={38} fill="#7254DC" opacity={0.45} />
      <g transform="translate(-74 -96) rotate(-20)">
        <rect x={-40} y={-14} width={80} height={28} rx={8} fill="#FFE1AD" stroke={INK} strokeWidth={5} />
        <rect x={-14} y={-40} width={28} height={80} rx={8} fill="#FFE1AD" stroke={INK} strokeWidth={5} />
      </g>
    </g>
  );

/* ------------------------------- poses ------------------------------- */
const D_KEYS: Key<Pose>[] = [
  { f: 0, p: { shL: 96, elL: 112, shR: 96, elR: 112, flexL: 1.4, flexR: 1.4, chestS: 1.06, eyes: 1, smile: 1, mouthMode: 'grin', mouthOpen: 0.7, brow: 1, lookX: 0.3 } },
  { f: LAND - 2, p: {} },
  { f: LAND + 4, p: { shL: 30, elL: 40, shR: 40, elR: 30, flexL: 0.4, flexR: 0.4, eyes: 0, lookX: 1, turn: 0.4, mouthMode: 'o', mouthOpen: 0.5, brow: 1.2, sx: 0.94, sy: 1.04 }, e: E.back },
  { f: MAD, p: { lid: 0.5, browTilt: -1, brow: -0.4, red: 0.9, mouthMode: 'grit', mouthOpen: 0.6, smile: 0, shL: 70, elL: 120, shR: 60, elR: 128, sx: 1, sy: 1 }, e: E.out },
  { f: 42, p: { shL: 100, elL: 100, shR: 30, elR: 80, handR: 'open' } },
  { f: 48, p: { shR: 96, elR: 0, rot: 8, mouthOpen: 1 }, e: E.snap },
  { f: CLEAR, p: { rot: 0, shR: 160, elR: -6, handR: 'point', shL: 20, elL: 20, handL: 'fist', red: 0, lid: 0.3, browTilt: -0.4, brow: 0.6, mouthMode: 'grin', mouthOpen: 0.6, smile: 1, lookX: 0, turn: 0, head: 10, eyes: 0 } },
  { f: FIGHT_FRAMES, p: { head: 8 } },
];
const R_KEYS: Key<Pose>[] = [
  { f: 0, p: { shL: 140, shR: 140, elL: -10, elR: -10, handL: 'open', handR: 'open', hipL: 40, knL: -80, hipR: 40, knR: -80, mouthMode: 'grin', mouthOpen: 1, eyes: 1 } },
  { f: LAND, p: { shL: 120, shR: 120, hipL: 20, knL: -30, hipR: 20, knR: -30, sy: 0.9, sx: 1.08 }, e: E.in },
  { f: LAND + 6, p: { shL: 150, shR: 150, elL: -10, elR: -10, hipL: 6, knL: -4, hipR: 6, knR: -4, sy: 1, sx: 1, lookX: -1, turn: -0.4, mouthMode: 'grin', mouthOpen: 0.8 }, e: E.back },
  { f: 44, p: { shL: 20, elL: 20, shR: 20, elR: 20, lookX: -1, eyes: 0, mouthMode: 'o', mouthOpen: 0.8, brow: 1.4, sweat: 1, pupil: 0.5 } },
  { f: FIGHT_FRAMES, p: {} },
];

export const JokeFightScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = plant(poseAt(f, BASE, D_KEYS));
  const rv = plant(poseAt(f, BASE, R_KEYS), f < LAND ? Math.max(0, (LAND - f) * 34 - ((LAND - f) ** 2) * 0.3) : 0);
  const rX = f < LAND ? lerp(1100, RX, E.out(seg(f, 0, LAND))) : RX;
  const dHead = stageOf(DX, TOP, SC)(rig(d).headTop());
  const rHead = stageOf(rX, TOP, SC)(rig(rv).headTop());
  const cloudK = clamp(seg(f, CLOUD - 4, CLOUD + 4)) * (1 - seg(f, CLEAR - 4, CLEAR + 2));
  const fighting = f >= CLOUD && f < CLEAR;
  const cam: Cam = {
    cx: kf(f, [[0, 540], [MAD - 4, 540], [MAD + 2, 470, E.out], [CLOUD, 540, E.inOut], [CARD, 540], [CARD + 12, 540]]),
    cy: kf(f, [[0, 1180], [MAD - 4, 1180], [MAD + 2, 1080, E.out], [CLOUD, 1160, E.inOut], [CARD, 1160], [CARD + 12, 1000, E.inOut]]),
    z: kf(f, [[0, 1.0], [MAD - 4, 1.0], [MAD + 2, 1.35, E.out], [CLOUD, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = fighting ? shake(f, CLOUD, CLEAR - CLOUD, 14, 4) : shake(f, LAND, 10, 10, 2);
  const sandal = f - CLEAR;

  return (
    <Stage
      bg="#BFE3F7"
      overlay={<EndCard f={f} start={CARD} lines={['DYLAN STARTS', 'FIGHTS']} pts="1ST" unit="TIED" sub="TIED FOR FIRST? NOT FOR LONG" color={TEAL} dark={TEAL_D} light="#BFF2EF" y={70} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.4)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#BFE3F7" />
        <g transform={`translate(540 700) rotate(${f * 0.3})`} opacity={0.35}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d="M0 0 L1600 -160 L1600 160 Z" fill="#FFFFFF" transform={`rotate(${i * (360 / 14)})`} />
          ))}
        </g>
        <Cloud x={200} y={420} w={300} h={110} seed={2} />
        <Cloud x={880} y={560} w={340} h={120} seed={5} />
        <Cloud x={520} y={240} w={260} h={90} seed={8} />
      </g>
      <g transform={camP(cam, 1, sh)}>
        <Podium />
        {!fighting ? (
          <g>
            {f < CLEAR ? <Hero p={rv} x={rX} y={TOP} scale={SC} /> : null}
            <Hero p={d} x={DX} y={TOP} scale={SC} headExtra={<Bruised k={seg(f, CLEAR - 2, CLEAR + 2)} />} />
          </g>
        ) : null}
        <FightCloud f={f} k={cloudK * 1.35} x={540} y={1120} />
        <Dust f={f} start={LAND} x={rX} y={TOP - 10} n={6} seed={3} spread={200} size={50} color="#FFFFFF" line="#B9B3CC" />
        <Dust f={f} start={CLEAR - 2} x={540} y={TOP - 120} n={10} seed={8} spread={420} size={90} color="#FFFFFF" line="#B9B3CC" />
        {/* the other guy's sandal comes down later */}
        {sandal >= 0 && sandal < 40 ? (
          <g transform={`translate(${860 - sandal * 2} ${Math.min(TOP - 30, 300 + sandal * sandal * 1.6)}) rotate(${sandal * 24})`}>
            <path d="M-60 0 Q-70 -50 0 -60 Q70 -56 64 0 Q60 30 0 30 Q-56 30 -60 0 Z" fill={C.sandal} stroke={INK} strokeWidth={8} />
            <path d="M-40 -20 L40 -36 M-34 6 L44 -6" stroke={C.sandalSh} strokeWidth={8} strokeLinecap="round" />
          </g>
        ) : null}
        {!fighting && f < CLEAR ? <NameTag x={rHead[0] + 60} y={rHead[1] - 50} name="ALSO 1ST" color="#8A8597" t={f - LAND} s={0.8} rot={4} /> : null}
        {!fighting ? <NameTag x={dHead[0] - 50} y={dHead[1] - 50} name="DYLAN" color={TEAL} t={f - 2} s={0.95} out={seg(f, CARD - 8, CARD)} /> : null}
        <Sparks f={f} start={CLEAR} seed={5} n={16} x={dHead[0]} y={dHead[1] + 60} speed={[12, 26]} g={0.5} size={[12, 20]} colors={['#FFFFFF', '#FFF0B7', '#BFF2EF']} shape="star" />
      </g>
      <Sfx f={f} start={LAND} text="TIED." x={790} y={760} size={140} rot={8} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={MAD + 2} text="OH IT'S ON" x={360} y={640} size={120} rot={-8} fill="#FF8A5C" dur={18} />
      <Sfx f={f} start={CLOUD + 2} text="POW!" x={250} y={760} size={150} rot={-12} fill="#FFD064" dur={14} />
      <Sfx f={f} start={CLOUD + 14} text="BAM!" x={830} y={720} size={150} rot={10} fill="#FF8AB0" dur={14} />
      <Sfx f={f} start={CLOUD + 26} text="WHACK!" x={300} y={1540} size={140} rot={-6} fill="#9DD2FF" dur={14} />
      <Sfx f={f} start={CLOUD + 36} text="BONK" x={820} y={1520} size={130} rot={8} fill="#BFF2EF" dur={12} />
      <Sfx f={f} start={CLEAR + 4} text="STILL #1" x={540} y={640} size={130} rot={-5} fill="#FFD064" dur={18} />
      <ConfettiRain f={f} start={CARD + 2} n={44} seed={9} colors={[TEAL, '#BFF2EF', '#FFFFFF', '#FFD064', '#EE5982']} />
    </Stage>
  );
};
