// Inside joke: "PUNXSUTAWNEY PHIL" - Phil finally logs something after days underground. He pops out of his burrow,
// sees his shadow and dives back in: six more weeks. (Phil plays the groundhog; the Groundhog drawing is kept for reuse.)
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, Hero, Pose, pose, plant, rig } from '../hero/Hero';
import { LOOKS } from '../hero/looks';
import { E, kf, shake, seg, clamp, springAt, lerp } from '../lib/anim';
import { Stage, camP, Cam } from '../fx/Stage';
import { Sfx, GlowDefs, Glow, ConfettiRain, Cloud, Sun, Dust } from '../fx/fx';
import { EndCard } from '../fx/EndCard';
import { INK, Snow } from './kit';
import { Pine } from './RunKit';
import { NameTag, PEOPLE } from './jokekit';
import { TITLE_FONT } from '../fonts';

export const PHIL_FRAMES = 165;
const RUMBLE = 8;
const POP = 22;
const SUN = 48;
const SPOT = 58;
const DIVE = 68;
const BANNER = 82;
const CARD = 122;
const HX = 540;
const HY = 1640;   // hole
const [RED] = PEOPLE.philip;

/* ------------------------------- the groundhog ------------------------------- */
const FUR = '#A8692E';
const FUR_D = '#7A4A22';
const BELLY = '#E8C79A';
export const Groundhog: React.FC<{ look: number; shock: number; blink: number; sniff: number; f: number }> = ({ look, shock, blink, sniff, f }) => {
  const eh = 30 * (1 + shock * 0.5) * (1 - blink * 0.9);
  const ew = 26 * (1 + shock * 0.4);
  return (
    <g>
      {/* body */}
      <ellipse cx={0} cy={-170} rx={128} ry={176} fill={FUR} stroke={INK} strokeWidth={10} />
      <ellipse cx={30} cy={-150} rx={86} ry={140} fill={FUR_D} opacity={0.35} />
      <ellipse cx={0} cy={-130} rx={78} ry={112} fill={BELLY} />
      {/* ears */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={s * 76} cy={-418} r={28} fill={FUR} stroke={INK} strokeWidth={8} />
          <circle cx={s * 76} cy={-418} r={13} fill="#E79A8A" />
        </g>
      ))}
      {/* head */}
      <circle cx={0} cy={-330} r={110} fill={FUR} stroke={INK} strokeWidth={10} />
      <ellipse cx={-34} cy={-372} rx={40} ry={22} fill="#C9884A" opacity={0.7} transform="rotate(-20 -34 -372)" />
      {/* cheeks + muzzle */}
      <ellipse cx={-42} cy={-292} rx={46} ry={34} fill={BELLY} />
      <ellipse cx={42} cy={-292} rx={46} ry={34} fill={BELLY} />
      {/* eyes */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 42} cy={-352} rx={ew} ry={Math.max(3, eh)} fill="#FFFFFF" stroke={INK} strokeWidth={6} />
          {blink < 0.7 ? <circle cx={s * 42 + look * 12} cy={-350} r={13 * (1 - shock * 0.35)} fill={INK} /> : null}
          {blink < 0.7 ? <circle cx={s * 42 + look * 12 - 4} cy={-356} r={4} fill="#FFFFFF" /> : null}
          {shock > 0.3 ? <path d={`M${s * 42 - 28} ${-402 - shock * 10} Q${s * 42} ${-418 - shock * 12} ${s * 42 + 28} ${-402 - shock * 10}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" /> : null}
        </g>
      ))}
      {/* nose (twitches when he sniffs) */}
      <ellipse cx={0} cy={-306 + Math.sin(f * 2.2) * 3 * sniff} rx={24 + sniff * 3} ry={16} fill="#3B1F22" stroke={INK} strokeWidth={4} />
      <ellipse cx={-7} cy={-311} rx={7} ry={4} fill="#FFFFFF" opacity={0.6} />
      {/* mouth + teeth */}
      {shock > 0.3 ? (
        <ellipse cx={0} cy={-262} rx={22} ry={26 * shock} fill={C.mouth} stroke={INK} strokeWidth={6} />
      ) : (
        <path d="M-24 -284 Q-12 -274 0 -284 Q12 -274 24 -284" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      )}
      <rect x={-16} y={-282} width={15} height={26} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      <rect x={1} y={-282} width={15} height={26} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      {/* whiskers */}
      {[-1, 1].map((s) => (
        <g key={s} stroke={INK} strokeWidth={4} strokeLinecap="round">
          <line x1={s * 62} y1={-300} x2={s * 128} y2={-316} />
          <line x1={s * 62} y1={-290} x2={s * 130} y2={-288} />
        </g>
      ))}
      {/* paws */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 52} cy={-196} rx={30} ry={24} fill={FUR_D} stroke={INK} strokeWidth={7} />
          <path d={`M${s * 52 - 14} -180 l0 10 M${s * 52} -178 l0 10 M${s * 52 + 14} -180 l0 10`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
};

/* ------------------------------- Phil in the burrow ------------------------------- */
const PSC = 0.7; // Phil's scale
const RIM = HY - 30; // everything below this line is down the hole
const PAWS: Partial<Pose> = { shL: 22, elL: -118, wrL: 30, handL: 'relax', shR: 22, elR: -118, wrR: 30, handR: 'relax' };
const philPose = (look: number, shock: number, blink: number): Pose =>
  plant(
    pose({
      ...PAWS,
      lookX: look, turn: look * 0.3, head: look * 4,
      smile: 1 - shock, mouthMode: shock > 0.3 ? 'o' : 'grin', mouthOpen: lerp(0.3, 1, shock),
      brow: lerp(0.5, 1.5, shock), browTilt: shock, pupil: lerp(1, 0.35, shock), sweat: shock, eyes: blink,
    }),
  );
/** how far below the rim his feet are when he's all the way up: the rim crosses him at the belly */
const PHIL_DROP = (() => {
  const r = rig(philPose(0, 0, 0));
  return -r.W(r.torso, 0, 40)[1] * PSC;
})();
const HIDE = 540; // how far he sinks to be out of sight

/* ------------------------------- set ------------------------------- */
const Mound: React.FC<{ front?: boolean; shake: number }> = ({ front, shake: sk }) => (
  <g transform={`translate(${HX + sk * Math.sin(sk * 40)} ${HY})`}>
    {front ? (
      <g>
        <path d="M-330 40 Q-300 -60 -170 -40 Q0 -10 170 -40 Q300 -60 330 40 Z" fill="#FFFFFF" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        <path d="M-260 0 Q-140 -24 -40 -16" fill="none" stroke="#D9E6FF" strokeWidth={14} strokeLinecap="round" />
      </g>
    ) : (
      <g>
        <path d="M-340 40 Q-320 -220 0 -230 Q320 -220 340 40 Z" fill="#FFFFFF" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        <path d="M-280 -60 Q-200 -180 -40 -196" fill="none" stroke="#D9E6FF" strokeWidth={18} strokeLinecap="round" />
        {/* the hole */}
        <ellipse cx={0} cy={-46} rx={170} ry={62} fill="#3B2A22" stroke={INK} strokeWidth={9} />
        <ellipse cx={0} cy={-36} rx={140} ry={44} fill="#1E1411" />
      </g>
    )}
  </g>
);

const BigBanner: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0) return null;
  const k = clamp(springAt(t, 0, 14, 1.3, 5), 0, 1.2);
  return (
    <g transform={`translate(540 ${lerp(-300, 1010, Math.min(1, k))}) rotate(${-4 + (1 - Math.min(1, k)) * 10})`}>
      <line x1={-300} y1={-500} x2={-300} y2={-120} stroke={INK} strokeWidth={8} />
      <line x1={300} y1={-500} x2={300} y2={-120} stroke={INK} strokeWidth={8} />
      <rect x={-460} y={-150} width={920} height={300} rx={30} fill={INK} transform="translate(0 16)" />
      <rect x={-460} y={-150} width={920} height={300} rx={30} fill="#FFFDF6" stroke={INK} strokeWidth={12} />
      <rect x={-460} y={-150} width={920} height={90} rx={30} fill="#5C7CF0" stroke={INK} strokeWidth={12} />
      <text x={0} y={-102} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={60} fill="#FFFFFF">FORECAST</text>
      <text x={0} y={4} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={88} fill={INK}>6 MORE WEEKS</text>
      <text x={0} y={92} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={70} fill="#5C7CF0">OF WINTER ARC</text>
    </g>
  );
};

export const JokePhilScene: React.FC = () => {
  const f = useCurrentFrame();
  const rumble = f >= RUMBLE && f < POP ? (1 - seg(f, RUMBLE, POP)) * 6 + 2 : 0;
  // rise out of the hole, then dive back in
  const up = f < POP ? 0 : f < DIVE ? Math.min(1.08, springAt(f - POP, 0, 12, 1.4, 5)) : Math.max(0, 1 - E.in(seg(f, DIVE, DIVE + 6)));
  const gy = HY - 40 + (1 - up) * 460;
  const py = RIM + PHIL_DROP + (1 - up) * HIDE; // Phil's feet (far down the hole)
  const pp = philPose(0, 0, 0);
  const look = kf(f, [[0, 0], [30, -1], [38, 1], [46, 0], [SPOT - 2, 0], [SPOT + 2, -1, E.snap], [DIVE, -1]]);
  const shock = seg(f, SPOT, SPOT + 3);
  const blink = f >= 44 && f < 47 ? 1 : 0;
  const sniff = f >= 28 && f < 50 ? 1 : 0;
  const sun = E.out(seg(f, SUN - 6, SUN + 6));
  const shadow = seg(f, SUN, SUN + 6) * up;
  const cam: Cam = {
    cx: 540,
    cy: kf(f, [[0, 1080], [POP, 1080], [POP + 8, 1180, E.out], [SPOT - 2, 1180], [SPOT + 4, 1260, E.out], [DIVE + 6, 1120, E.inOut], [CARD, 1120], [CARD + 12, 1000, E.inOut]]),
    z: kf(f, [[0, 1.0], [POP, 1.0], [POP + 8, 1.2, E.out], [SPOT - 2, 1.2], [SPOT + 4, 1.45, E.out], [DIVE + 6, 1.0, E.inOut], [CARD, 1.0], [CARD + 12, 0.9, E.inOut]]),
    r: 0,
  };
  const sh = shake(f, POP, 10, 10, 2);
  const sh2 = shake(f, DIVE + 4, 12, 14, 5);
  const S = { x: sh.x + sh2.x, y: sh.y + sh2.y, r: 0 };

  return (
    <Stage
      bg="#CFE8FF"
      overlay={<EndCard f={f} start={CARD} lines={['PUNXSUTAWNEY', 'PHIL']} pts="6" unit="WEEKS" sub="PHIL HAS EMERGED" color={FUR} dark={FUR_D} light="#F3DEC3" y={80} />}
    >
      <GlowDefs />
      <g transform={camP(cam, 0.3)}>
        <rect x={-600} y={-600} width={2280} height={3200} fill="#CFE8FF" />
        <g transform={`translate(${lerp(1100, 820, sun)} ${lerp(500, 300, sun)})`}>
          <Sun x={0} y={0} r={110} f={f} rays={sun > 0.5} />
        </g>
        <Cloud x={lerp(800, 500, sun)} y={320} w={420} h={150} seed={4} fill="#FFFFFF" shade="#DDE6FA" line="#8A93B8" />
        <Cloud x={220} y={520} w={340} h={120} seed={7} fill="#FFFFFF" shade="#DDE6FA" line="#8A93B8" />
      </g>
      <g transform={camP(cam, 0.6)}>
        <path d="M-600 1300 Q-200 1100 300 1250 Q700 1360 1100 1180 Q1500 1050 1700 1250 L1700 2600 L-600 2600 Z" fill="#EEF4FF" stroke="#B9C4EE" strokeWidth={8} />
        {[[-40, 1260, 0.9, 1], [140, 1240, 0.7, 2], [880, 1200, 1.0, 3], [1060, 1240, 0.8, 4]].map(([x, y, s, seed]) => (
          <Pine key={seed} x={x} y={y} s={s} seed={seed} snow />
        ))}
        {/* sign */}
        <g transform="translate(860 1420) rotate(4)">
          <rect x={-12} y={0} width={24} height={240} fill="#A06343" stroke={INK} strokeWidth={6} />
          <rect x={-170} y={-110} width={340} height={130} rx={14} fill="#C27C5E" stroke={INK} strokeWidth={8} />
          <text x={0} y={-62} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFDF6">PHIL'S</text>
          <text x={0} y={-14} textAnchor="middle" dominantBaseline="middle" fontFamily={TITLE_FONT} fontSize={44} fill="#FFFDF6">BURROW</text>
        </g>
      </g>
      <g transform={camP(cam, 1, S)}>
        <rect x={-600} y={1600} width={2280} height={1200} fill="#F7FAFF" />
        <Mound shake={rumble} />
        {/* his shadow on the snow */}
        <g opacity={shadow * 0.55} transform={`translate(${HX - 150} ${HY - 30}) skewX(30) scale(1 0.5)`}>
          <path d="M-150 0 L-150 -96 Q-150 -150 -96 -156 L96 -156 Q150 -150 150 -96 L150 0 Z" fill="#5A6A9A" />
          <ellipse cx={0} cy={-292} rx={104} ry={134} fill="#5A6A9A" />
          <path d="M-104 -300 L-122 -250 L-90 -262 Z M104 -300 L122 -250 L90 -262 Z" fill="#5A6A9A" />
        </g>
        <g clipPath="url(#holeClip)">
          {up > 0.01 ? (
            <g transform={`translate(${HX} ${RIM}) scale(${1 + (f >= SPOT && f < SPOT + 6 ? 0.06 : 0)}) translate(${-HX} ${-RIM})`}>
              <Hero look={LOOKS.phil} p={philPose(look, shock, blink)} x={HX} y={py} scale={PSC} shadow={false} />
            </g>
          ) : null}
        </g>
        <defs>
          <clipPath id="holeClip">
            <rect x={HX - 400} y={0} width={800} height={HY - 30} />
          </clipPath>
        </defs>
        <Mound front shake={rumble} />
        <Dust f={f} start={POP} x={HX} y={HY - 60} n={8} seed={3} spread={300} size={70} color="#FFFFFF" line="#B9C4EE" />
        <Dust f={f} start={DIVE + 4} x={HX} y={HY - 60} n={10} seed={8} spread={340} size={80} color="#FFFFFF" line="#B9C4EE" />
        {up > 0.5 && f < DIVE ? <NameTag x={HX} y={py + rig(pp).headTop()[1] * PSC - 50} name="PHIL" color={RED} t={f - POP - 6} /> : null}
      </g>
      <Snow f={f} n={f > BANNER ? 90 : 50} seed={6} speed={f > BANNER ? 8 : 4} />
      <BigBanner t={f - BANNER} />
      <Sfx f={f} start={RUMBLE} text="rumble" x={300} y={1300} size={90} rot={-6} fill="#FFFFFF" dur={12} />
      <Sfx f={f} start={POP} text="POP!" x={800} y={820} size={150} rot={8} fill="#FFD064" dur={14} />
      <Sfx f={f} start={SPOT + 1} text="GASP!" x={300} y={700} size={150} rot={-8} fill="#FFFFFF" dur={14} />
      <Sfx f={f} start={DIVE + 4} text="FWOOP" x={760} y={1300} size={130} rot={6} fill="#CFE8FF" dur={14} />
      <ConfettiRain f={f} start={CARD + 2} n={36} seed={43} colors={[FUR, '#F3DEC3', '#FFFFFF', '#5C7CF0', '#CFE8FF']} />
    </Stage>
  );
};
