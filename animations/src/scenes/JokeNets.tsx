// Inside joke: "THE NETS GAME" - Jake and Gaurav sprint for the train to the Nets game. The doors close. It leaves without them.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, rig, plant } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Streaks, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { gait, runLift } from './RunKit';
import { NameTag, PEOPLE } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const NETS_FRAMES = 165;
const GY = 1800;
const SC = 0.62;
const CHIME = 30;
const SHUT = 40;
const ARRIVE = 50;
const GO = 58;
const SLUMP = 92;
const CARD = 122;
const [ORANGE] = PEOPLE.jake;
const [PURPLE] = PEOPLE.gaurav;

/* ------------------------------- props ------------------------------- */
const DOORS = [300, 780];
const Train: React.FC<{ x: number; shut: number; f: number; blur: number }> = ({ x, shut, f, blur }) => (
  <g transform={`translate(${x} 0)`}>
    {/* body */}
    <rect x={-60} y={760} width={1300} height={820} rx={60} fill="#D9DDE5" stroke={INK} strokeWidth={12} />
    <rect x={-60} y={1380} width={1300} height={40} fill="#B8BECB" />
    <rect x={-60} y={830} width={1300} height={26} fill="#F26B2A" />
    {/* windows with fans inside */}
    {[60, 520, 1000].map((wx, i) => (
      <g key={wx}>
        <rect x={wx} y={900} width={160} height={200} rx={20} fill="#2D3A63" stroke={INK} strokeWidth={9} />
        {[0, 1].map((j) => (
          <g key={j} transform={`translate(${wx + 50 + j * 60} ${1060 + Math.sin(f / 3 + i + j) * 4})`}>
            <circle r={30} fill={j ? '#FFFFFF' : '#1A1A1A'} stroke={INK} strokeWidth={5} />
            <rect x={-30} y={22} width={60} height={60} rx={14} fill={j ? '#1A1A1A' : '#FFFFFF'} stroke={INK} strokeWidth={5} />
          </g>
        ))}
        <path d={`M${wx + 20} 920 L${wx + 70} 920 L${wx + 30} 1080 Z`} fill="#FFFFFF" opacity={0.25} />
      </g>
    ))}
    {/* doors */}
    {DOORS.map((dx) => {
      const gap = 110 * (1 - shut);
      return (
        <g key={dx}>
          <rect x={dx - 120} y={880} width={240} height={640} fill="#2B2340" />
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(${dx + s * (60 + gap / 2)} 0)`}>
              <rect x={-60} y={880} width={120} height={640} fill="#C9CED9" stroke={INK} strokeWidth={8} />
              <rect x={-40} y={930} width={80} height={220} rx={14} fill="#2D3A63" stroke={INK} strokeWidth={6} />
            </g>
          ))}
        </g>
      );
    })}
    {/* destination sign */}
    <g transform="translate(540 790)">
      <rect x={-250} y={-60} width={500} height={110} rx={16} fill="#111111" stroke={INK} strokeWidth={10} />
      <text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={76} fill="#FF9A3D" letterSpacing={4}>NETS GAME</text>
    </g>
    {blur > 0 ? <rect x={-60} y={760} width={1300} height={820} rx={60} fill="#FFFFFF" opacity={blur * 0.25} /> : null}
  </g>
);

const Station: React.FC = () => (
  <g>
    <rect x={-600} y={-600} width={2280} height={3200} fill="#EDEFF3" />
    {Array.from({ length: 30 }).map((_, row) =>
      Array.from({ length: 24 }).map((__, col) => (
        <rect key={`${row}-${col}`} x={-600 + col * 100 + (row % 2) * 50} y={-200 + row * 56} width={92} height={48} rx={6} fill="#F7F8FB" stroke="#D5D9E2" strokeWidth={4} />
      )),
    )}
    <rect x={-600} y={420} width={2280} height={130} fill="#2D7A3E" stroke={INK} strokeWidth={10} />
    <text x={540} y={490} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={96} fill="#FFFFFF" letterSpacing={8}>BROOKLYN</text>
    {/* tunnel dark behind the train */}
    <rect x={-600} y={720} width={2280} height={880} fill="#2B2E38" />
    <rect x={-600} y={720} width={2280} height={30} fill="#1B1D22" />
  </g>
);

const NextBoard: React.FC<{ k: number }> = ({ k }) =>
  k <= 0.01 ? null : (
    <g transform={`translate(540 960) scale(${k})`}>
      <line x1={-200} y1={-260} x2={-200} y2={-80} stroke={INK} strokeWidth={10} />
      <line x1={200} y1={-260} x2={200} y2={-80} stroke={INK} strokeWidth={10} />
      <rect x={-380} y={-90} width={760} height={220} rx={24} fill="#111111" stroke={INK} strokeWidth={12} />
      <text x={0} y={-22} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={62} fill="#FF9A3D" letterSpacing={3}>NEXT TRAIN</text>
      <text x={0} y={68} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={86} fill="#FF9A3D" letterSpacing={3}>47 MIN</text>
    </g>
  );

/* ------------------------------- poses ------------------------------- */
const SLAP: Partial<Pose> = {
  shL: 120, elL: 20, shR: 120, elR: 20, handL: 'open', handR: 'open', hipL: 10, hipR: 10, knL: -10, knR: -10,
  mouthMode: 'o', mouthOpen: 1, eyes: 0, lid: 0, brow: 1.4, browTilt: 1, sweat: 1, pupil: 0.5, lookY: -0.3,
};
const SAD_J: Partial<Pose> = {
  kneel: 1, hipL: -70, knL: 90, hipR: -70, knR: 90, shL: 10, elL: 10, shR: 10, elR: 10, handL: 'open', handR: 'open',
  mouthMode: 'o', mouthOpen: 0.4, eyes: 0, lid: 0.3, brow: 1.2, browTilt: 1.2, sweat: 1, pupil: 1, lookY: 0.3, head: 10, torsoSy: 0.95,
};
const SAD_G: Partial<Pose> = {
  shL: 150, elL: 150, shR: 150, elR: 150, handL: 'open', handR: 'open', hipL: 8, hipR: 8, knL: -6, knR: -6,
  mouthMode: 'o', mouthOpen: 0.8, eyes: 0, lid: 0, brow: 1.6, browTilt: 1.2, sweat: 1, pupil: 0.6, lookX: 0.8, turn: 0.3,
};
const runner = (f: number, ph0: number, sad: Partial<Pose>): Pose => {
  const ph = f * 0.7 + ph0;
  if (f < ARRIVE) {
    const g = gait(ph, 1);
    return plant({ ...BASE, ...g, handL: 'fist', handR: 'fist', mouthMode: 'o', mouthOpen: 0.8, browTilt: 1, brow: 1.2, sweat: 1 }, runLift(ph));
  }
  const keys: Key<Pose>[] = [
    { f: ARRIVE - 1, p: { ...gait(ARRIVE * 0.7 + ph0, 1) } },
    { f: ARRIVE + 4, p: { ...SLAP }, e: E.out },
    { f: GO, p: { ...SLAP, shL: 100, shR: 140 } },
    { f: GO + 10, p: { ...SLAP, lookX: 1, turn: 0.4, shL: 60, elL: 80, shR: 60, elR: 80 } },
    { f: SLUMP, p: { ...sad }, e: E.inOut },
    { f: NETS_FRAMES, p: { ...sad, head: (sad.head ?? 0) + 4 } },
  ];
  return plant(poseAt(f, BASE, keys));
};

export const JokeNetsScene: React.FC = () => {
  const f = useCurrentFrame();
  const jx = f < ARRIVE ? lerp(-260, 420, E.out(seg(f, 0, ARRIVE))) : 420;
  const gx = f < ARRIVE + 4 ? lerp(-560, 700, E.out(seg(f, 4, ARRIVE + 4))) : 700;
  const pj = runner(f, 0, SAD_J);
  const pg = runner(f - 4, 1.4, SAD_G);
  const jHead = stageOf(jx, GY, SC)(rig(pj).headTop());
  const gHead = stageOf(gx, GY, SC)(rig(pg).headTop());
  const shut = E.inOut(seg(f, SHUT, SHUT + 6));
  const trainX = f < GO ? 0 : Math.pow(f - GO, 2) * 0.9 + (f - GO) * 4;
  const blur = seg(f, GO + 8, GO + 20);
  const cam: Cam = {
    cx: kf(f, [[0, 400], [ARRIVE, 540, E.inOut], [CARD, 540], [CARD + 12, 540]]),
    cy: kf(f, [[0, 1180], [ARRIVE, 1180], [ARRIVE + 6, 1220, E.out], [SLUMP, 1180], [CARD, 1180], [CARD + 12, 1000, E.inOut]]),
    z: kf(f, [[0, 1.05], [ARRIVE, 1.05], [ARRIVE + 6, 1.18, E.out], [GO + 10, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.88, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, SHUT + 4, 10, 8, 2);

  return (
    <Stage
      bg="#EDEFF3"
      overlay={<EndCard f={f} start={CARD} lines={['THE NETS GAME']} pts="7" unit="MISSED" sub="MISSED 7 = MISSED THE TRAIN" color="#2A2A2A" dark="#111111" light="#E0E0E0" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.8, { x: sh.x * 0.3, y: sh.y * 0.3, r: 0 })}>
        <Station />
        <NextBoard k={clamp(seg(f, SLUMP - 10, SLUMP))} />
        {trainX < 1700 ? <Train x={trainX} shut={shut} f={f} blur={blur} /> : null}
        {f >= GO + 6 && trainX < 1700 ? <Streaks f={f} x0={-200} y0={800} w={1500} h={700} angle={0} n={16} color="#FFFFFF" speed={60} len={300} opacity={0.5} thick={12} /> : null}
      </g>
      <g transform={camP(cam, 1, sh)}>
        {/* platform */}
        <rect x={-600} y={1600} width={2280} height={1200} fill="#9AA0AE" />
        <rect x={-600} y={1600} width={2280} height={50} fill="#FFD064" stroke={INK} strokeWidth={8} />
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={-580 + i * 60} cy={1625} r={7} fill="#C77928" />
        ))}
        <ellipse cx={jx} cy={GY + 4} rx={150} ry={18} fill="#000" opacity={0.18} />
        <ellipse cx={gx} cy={GY + 4} rx={150} ry={18} fill="#000" opacity={0.18} />
        <Hero p={pg} x={gx} y={GY} scale={SC} shadow={false} />
        <Hero p={pj} x={jx} y={GY} scale={SC} shadow={false} />
        {f < ARRIVE ? <Dust f={f} start={Math.floor(f / 8) * 8} x={jx - 80} y={GY - 10} n={3} seed={Math.floor(f / 8)} spread={120} size={40} color="#FFFFFF" line="#9AA0AE" dir={-4} /> : null}
        <NameTag x={jHead[0] - 30} y={jHead[1] - 40} name="JAKE" color={ORANGE} t={f - 6} s={0.8} out={seg(f, CARD - 8, CARD)} rot={-6} />
        <NameTag x={gHead[0] + 30} y={gHead[1] - 40} name="GAURAV" color={PURPLE} t={f - 10} s={0.8} out={seg(f, CARD - 8, CARD)} rot={5} />
      </g>
      <Sfx f={f} start={CHIME} text="DING DONG" x={720} y={620} size={110} rot={6} fill="#FFFFFF" dur={16} />
      <Sfx f={f} start={SHUT + 4} text="NOOO!" x={330} y={700} size={150} rot={-8} fill="#FF9A3D" dur={18} />
      <Sfx f={f} start={GO + 6} text="WHOOSH" x={760} y={1180} size={150} rot={-4} fill="#FFFFFF" dur={20} />
      <Sfx f={f} start={SLUMP + 4} text="...the nets." x={540} y={1520} size={90} rot={-3} fill="#FFFFFF" dur={24} shake={false} />
      <ConfettiRain f={f} start={CARD + 2} n={40} seed={37} colors={['#2A2A2A', '#FFFFFF', '#FF9A3D', ORANGE, PURPLE]} />
    </Stage>
  );
};
