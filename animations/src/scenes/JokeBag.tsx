// Inside joke: "THE BAG" - Dean, Connor and Dylan are tied up in points. So they're tied up in The Bag.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Hero, Pose, BASE, plant, rig } from '../hero/Hero';
import { poseAt, E, kf, shake, seg, Key, clamp, springAt, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Dust, Sparks } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { stageOf, INK } from './kit';
import { NameTag, PEOPLE } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const BAG_FRAMES = 165;
const DROP = 22;
const POP = [38, 46, 54];
const TIE = 80;
const CARD = 120;
const BAG_TOP = 1010;
const KRAFT = '#D9A066';
const KRAFT_D = '#A8733F';
const SC = 0.58;
const GUYS: { name: string; x: number; c: string }[] = [
  { name: 'DEAN', x: 330, c: PEOPLE.dean[0] },
  { name: 'CONNOR', x: 540, c: PEOPLE.connor[0] },
  { name: 'DYLAN', x: 750, c: PEOPLE.dylan[0] },
];

/* ------------------------------- props ------------------------------- */
const BagBack: React.FC = () => (
  <g>
    <path d={`M190 ${BAG_TOP} L890 ${BAG_TOP} L860 1780 L220 1780 Z`} fill={KRAFT_D} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
  </g>
);
const BagFront: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <path d={`M170 ${BAG_TOP + 60} L910 ${BAG_TOP + 60} L880 1800 L200 1800 Z`} fill={KRAFT} stroke={INK} strokeWidth={11} strokeLinejoin="round" />
    <path d={`M170 ${BAG_TOP + 60} L910 ${BAG_TOP + 60} L906 ${BAG_TOP + 120} L174 ${BAG_TOP + 120} Z`} fill="#E8B27A" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d={`M810 ${BAG_TOP + 130} L790 1780`} stroke={KRAFT_D} strokeWidth={30} opacity={0.6} />
    <path d={`M240 ${BAG_TOP + 140} L230 1760`} stroke="#F0C38E" strokeWidth={16} opacity={0.7} />
    {/* THE BAG */}
    <g transform={`translate(540 1420) rotate(-4) scale(${1 + Math.sin(f / 8) * 0.01})`}>
      <text x={0} y={-60} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={150} fill="#FFFFFF" stroke={INK} strokeWidth={22} paintOrder="stroke" strokeLinejoin="round">THE</text>
      <text x={0} y={100} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={210} fill="#FFD064" stroke={INK} strokeWidth={26} paintOrder="stroke" strokeLinejoin="round">BAG</text>
    </g>
    {/* $ stamp */}
    <g transform="translate(760 1680) rotate(12)">
      <circle r={56} fill="#45B87A" stroke={INK} strokeWidth={8} />
      <text x={0} y={6} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={70} fill="#FFFFFF">$</text>
    </g>
  </g>
);

/** Rope handles: tie 0 = loose arcs, 1 = pulled together over the heads with a bow. */
const Handles: React.FC<{ tie: number }> = ({ tie }) => {
  const midY = lerp(780, 690, tie);
  const pull = lerp(0, 150, tie);
  const l = `M300 ${BAG_TOP + 70} C300 ${midY - 140} ${420 + pull} ${midY - 180} ${470 + pull * 0.4} ${midY}`;
  const r = `M780 ${BAG_TOP + 70} C780 ${midY - 140} ${660 - pull} ${midY - 180} ${610 - pull * 0.4} ${midY}`;
  const l0 = `M300 ${BAG_TOP + 70} C300 760 470 760 470 ${BAG_TOP + 70}`;
  const r0 = `M610 ${BAG_TOP + 70} C610 760 780 760 780 ${BAG_TOP + 70}`;
  return (
    <g fill="none" strokeLinecap="round">
      {tie <= 0.01 ? (
        <g>
          <path d={l0} stroke={INK} strokeWidth={30} />
          <path d={l0} stroke="#C27C5E" strokeWidth={16} />
          <path d={r0} stroke={INK} strokeWidth={30} />
          <path d={r0} stroke="#C27C5E" strokeWidth={16} />
        </g>
      ) : (
        <g>
          <path d={l} stroke={INK} strokeWidth={30} />
          <path d={l} stroke="#C27C5E" strokeWidth={16} />
          <path d={r} stroke={INK} strokeWidth={30} />
          <path d={r} stroke="#C27C5E" strokeWidth={16} />
          <g transform={`translate(540 ${midY - 20}) scale(${tie})`}>
            <path d="M0 0 C-60 -70 -150 -40 -120 20 C-100 60 -40 30 0 0 Z M0 0 C60 -70 150 -40 120 20 C100 60 40 30 0 0 Z" fill="#E2384D" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            <path d="M-10 6 L-60 110 L-30 96 L-14 126 Z M10 6 L60 110 L30 96 L14 126 Z" fill="#E2384D" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
            <circle r={26} fill="#E2384D" stroke={INK} strokeWidth={9} />
          </g>
        </g>
      )}
    </g>
  );
};

const Plates: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {GUYS.map((g, i) => {
      const k = clamp(springAt(f - 4 - i * 5, 0, 12, 1.4, 5), 0, 1.15);
      const x = 190 + i * 350;
      const w = 64 + g.name.length * 38;
      return (
        <g key={g.name} transform={`translate(${x} 260) rotate(${(i - 1) * 4}) scale(${k})`}>
          <rect x={-w / 2} y={-50} width={w} height={100} rx={24} fill={INK} transform="translate(0 10)" />
          <rect x={-w / 2} y={-50} width={w} height={100} rx={24} fill={g.c} stroke={INK} strokeWidth={8} />
          <text x={0} y={8} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={64} fill="#FFFFFF" stroke={INK} strokeWidth={10} paintOrder="stroke">{g.name}</text>
        </g>
      );
    })}
    {[0, 1].map((i) => (
      <text key={i} x={365 + i * 350} y={270} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={90} fill="#FFFFFF" stroke={INK} strokeWidth={12} paintOrder="stroke" opacity={seg(f, 14 + i * 5, 18 + i * 5)}>=</text>
    ))}
  </g>
);

/* ------------------------------- poses ------------------------------- */
const pk = (i: number): Key<Pose>[] => [
  { f: 0, p: { shL: 150, elL: -10, shR: 150, elR: -10, handL: 'open', handR: 'open', eyes: 1, smile: 1, mouthMode: 'grin', mouthOpen: 0.9, brow: 1 } },
  { f: POP[i] + 8, p: {} },
  { f: TIE - 4, p: { lookX: [0.8, 0, -0.8][i], turn: [0.3, 0, -0.3][i] } },
  { f: TIE + 4, p: { shL: 40, elL: 140, shR: 40, elR: 140, handL: 'open', handR: 'open', eyes: 0, pupil: 0.5, mouthMode: 'o', mouthOpen: 0.5, smile: 0, brow: 1.4, browTilt: 1, sweat: 1, sx: 0.9, sy: 1.04, lookX: [1, 0.6, -1][i], turn: [0.3, 0.1, -0.3][i] }, e: E.back },
  { f: 100, p: { eyes: 1, smile: 1, mouthMode: 'grin', mouthOpen: 0.6, pupil: 1, browTilt: 0, brow: 0.8, lookX: 0, turn: 0, shL: 150, shR: 150, elL: -10, elR: -10 } },
  { f: BAG_FRAMES, p: {} },
];
const KEYS = [pk(0), pk(1), pk(2)];

export const JokeBagScene: React.FC = () => {
  const f = useCurrentFrame();
  const dropY = f < DROP ? -2150 * (1 - E.in(seg(f, 0, DROP))) : -Math.max(0, Math.sin(seg(f, DROP, DROP + 10) * Math.PI)) * 60;
  const squash = f >= DROP && f < DROP + 8 ? 1 - Math.sin(seg(f, DROP, DROP + 8) * Math.PI) * 0.06 : 1;
  const tie = E.out(seg(f, TIE, TIE + 8));
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1100], [TIE - 6, 1100], [TIE + 2, 1000, E.out], [100, 1080, E.inOut], [CARD, 1080], [CARD + 12, 920, E.inOut]]),
    z: kf(f, [[0, 1.0], [TIE - 6, 1.0], [TIE + 2, 1.15, E.out], [100, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.86, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, DROP, 14, 22, 3);
  const sh2 = shake(f, TIE, 10, 10, 6);
  const S = { x: sh.x + sh2.x, y: sh.y + sh2.y, r: sh.r + sh2.r };

  return (
    <Stage
      bg="#FFE7C2"
      overlay={<EndCard f={f} start={CARD} lines={['THE BAG']} pts="=" unit="TIED" sub="DEAN = CONNOR = DYLAN" color={KRAFT} dark={KRAFT_D} light="#FFE2B8" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.5)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#FFE7C2" />
        {GUYS.map((g, i) => (
          <path key={g.name} d={`M${-400 + i * 640} -600 L${240 + i * 640} -600 L${-200 + i * 640} 2600 L${-840 + i * 640} 2600 Z`} fill={g.c} opacity={0.35} />
        ))}
        <g transform={`translate(540 1000) rotate(${f * 0.25})`} opacity={0.3}>
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d="M0 0 L1700 -150 L1700 150 Z" fill="#FFFFFF" transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
        <rect x={-600} y={1760} width={2280} height={1200} fill="#E8C7A0" />
        <rect x={-600} y={1760} width={2280} height={18} fill="#C9A27E" />
      </g>
      <g transform={camP(cam, 0.85)} opacity={1 - seg(f, CARD - 6, CARD)}>
        <Plates f={f} />
      </g>
      <g transform={camP(cam, 1, S)}>
        <ellipse cx={540} cy={1800} rx={420} ry={40} fill="#000" opacity={0.16 * seg(f, DROP - 8, DROP)} />
        <g transform={`translate(540 ${1800 + dropY}) scale(${1 / squash} ${squash}) translate(-540 -1800)`}>
          <BagBack />
          {tie <= 0.01 ? <Handles tie={0} /> : null}
          {GUYS.map((g, i) => {
            const t = f - POP[i];
            const k = t < 0 ? 0 : Math.min(1.12, springAt(t, 0, 12, 1.4, 5));
            const gy = lerp(1840, 1330, k);
            if (k <= 0) return null;
            const p = plant(poseAt(f, BASE, KEYS[i]));
            const head = stageOf(g.x, gy, SC)(rig(p).headTop());
            return (
              <g key={g.name}>
                <Hero p={p} x={g.x} y={gy} scale={SC} shadow={false} />
                <NameTag x={head[0]} y={head[1] - 40} name={g.name} color={g.c} t={t - 4} s={0.7} out={seg(f, CARD - 8, CARD)} rot={(i - 1) * 6} />
              </g>
            );
          })}
          <BagFront f={f} />
          {tie > 0.01 ? <Handles tie={tie} /> : null}
        </g>
        <Dust f={f} start={DROP} x={240} y={1790} n={6} seed={2} spread={240} size={70} color="#FFFFFF" line="#C9A27E" />
        <Dust f={f} start={DROP} x={840} y={1790} n={6} seed={7} spread={240} size={70} color="#FFFFFF" line="#C9A27E" />
        <Sparks f={f} start={TIE + 2} seed={7} n={18} x={540} y={700} speed={[12, 26]} g={0.5} size={[12, 22]} colors={['#FFFFFF', '#FFD064', '#E2384D']} shape="star" />
      </g>
      <Sfx f={f} start={DROP} text="THUD" x={540} y={600} size={160} rot={-6} fill="#FFFFFF" dur={14} />
      {GUYS.map((g, i) => (
        <Sfx key={g.name} f={f} start={POP[i] + 2} text="POP!" x={g.x + (i - 1) * 60} y={780 - i * 20} size={90} rot={(i - 1) * 10} fill={g.c} inner="#FFFFFF" dur={10} />
      ))}
      <Sfx f={f} start={TIE + 2} text="TIED UP!" x={540} y={560} size={160} rot={-5} fill="#FFD064" dur={24} />
      <ConfettiRain f={f} start={CARD + 2} n={44} seed={33} colors={[PEOPLE.dean[0], PEOPLE.connor[0], PEOPLE.dylan[0], '#FFD064', '#FFFFFF']} />
    </Stage>
  );
};
