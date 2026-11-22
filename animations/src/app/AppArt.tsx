import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { Hero, pose, Pose, C, ArmG, armRig, plant, rig } from '../hero/Hero';
import { I } from '../lib/m2';
import { E, kf, seg, shake, springAt, clamp, lerp } from '../lib/anim';
import { Cloud, Sun, GlowDefs, Glow, Sparks, Glint, FocusLines, Twinkle } from '../fx/fx';
import { TITLE_FONT } from '../fonts';
import { FULL_H, PAD } from '../fx/Stage';
import { rng } from '../lib/shape';

/* ------------------------------------------------------------------ */
/* Mascot poses used in the app UI (rendered as transparent stills)    */
/* ------------------------------------------------------------------ */
export const APP_POSES: Record<string, Partial<Pose>> = {
  wave: {
    shR: 150, elR: 34, wrR: -10, handR: 'open', shL: 42, elL: -104, wrL: 30, handL: 'fist',
    turn: 0.15, lookX: 0.2, smile: 1, mouthOpen: 0.55, brow: 0.6, flexL: 0.5,
  },
  flex: {
    shL: 96, elL: 104, wrL: -14, flexL: 1, shR: 96, elR: 104, wrR: -14, flexR: 1, chestS: 1.04,
    hipL: 9, hipR: 9, knL: -8, knR: -8, brow: 0.5, mouthOpen: 0.15,
  },
  thumbs: {
    shR: 24, elR: 142, wrR: -64, handR: 'thumb', shL: 40, elL: -104, wrL: 30, lookX: 0.3, turn: 0.2, brow: 0.5, wink: 1, mouthSkew: 0.4,
  },
  cheer: {
    shL: 158, elL: -16, handL: 'open', shR: 158, elR: -16, handR: 'open', mouthOpen: 1, eyes: 1, hipL: 8, hipR: 8, brow: 0.8,
  },
  shrug: {
    shL: 52, elL: -96, wrL: -40, handL: 'open', shR: 52, elR: -96, wrR: -40, handR: 'open',
    browTilt: 1, brow: 0.6, smile: 0.25, mouthSkew: 0.6, mouthOpen: 0, lookX: -0.3, turn: -0.12, head: -6, sweat: 0.4,
  },
  point: {
    shR: 36, elR: 8, wrR: -6, handR: 'point', shL: 42, elL: -104, wrL: 30, handL: 'fist',
    turn: 0.18, lookX: 0.45, lookY: 0.55, smile: 1, mouthOpen: 0.35, brow: 0.7, head: 5,
  },
  head: {},
};

export const MascotStill: React.FC<{ pose: string }> = ({ pose: name }) => {
  const p = plant(pose(APP_POSES[name] || {}));
  return (
    <AbsoluteFill>
      <svg width={900} height={1200} viewBox="0 0 900 1200" style={{ position: 'absolute', inset: 0 }}>
        <Hero p={p} x={450} y={1130} scale={0.98} shadow={name !== 'head'} />
      </svg>
    </AbsoluteFill>
  );
};

/* App icon: head close-up on a sky disc. */
/** App icon: the marble thinker (public/thinker.png) on the sky-to-violet badge.
 *  safe = smaller art for the Android "maskable" icon, which crops to a circle. */
export const AppIcon: React.FC<{ safe?: boolean }> = ({ safe = false }) => {
  const size = safe ? 760 : 960; // rendered size of the 1254 px square art
  const left = (1024 - size) / 2 + (safe ? 6 : 10);
  const top = 1024 - size + (safe ? 10 : 34); // let the cut-off forearm run off the bottom edge
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #86CDF7 0%, #6A5BE0 100%)' }}>
      <svg width={1024} height={1024} viewBox="0 0 1024 1024" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <g opacity={0.25}>
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d="M470 470 L1500 340 L1500 600 Z" transform={`rotate(${i * 30} 470 470)`} fill="#FFFFFF" />
          ))}
        </g>
        <circle cx={470} cy={470} r={safe ? 300 : 380} fill="#FFFFFF" opacity={0.18} />
        <Cloud x={150} y={900} w={420} h={170} seed={3} line="#FFFFFF" />
        <Cloud x={880} y={930} w={420} h={170} seed={5} line="#FFFFFF" />
      </svg>
      <Img
        src={staticFile('thinker.png')}
        style={{ position: 'absolute', left, top, width: size, height: size, filter: 'drop-shadow(0 14px 0 rgba(52, 23, 32, 0.22))' }}
      />
    </AbsoluteFill>
  );
};
export const AppIconMaskable: React.FC = () => <AppIcon safe />;

/* ------------------------------------------------------------------ */
/* Opening: six biceps rise from both sides, mascot pops, title slams. */
/* The app splits the last frame open like doors to reveal Home.       */
/* ------------------------------------------------------------------ */
const ARMS = [
  { x: 10, y: 1700, s: 1.85, mirror: true, d: 0 },
  { x: 1070, y: 1700, s: 1.85, mirror: false, d: 3 },
  { x: 40, y: 1040, s: 1.5, mirror: true, d: 6 },
  { x: 1040, y: 1040, s: 1.5, mirror: false, d: 9 },
];

const Arm: React.FC<{ f: number; a: (typeof ARMS)[number]; i: number }> = ({ f, a, i }) => {
  const t = f - a.d;
  const rise = springAt(t, 0, 16, 1.2, 5.5);
  const flexK = E.back(clamp((t - 9) / 8));
  const pump = f > 26 && f < 60 ? Math.max(0, Math.sin(((f - 26) / 17) * Math.PI * 2)) : 0;
  const out = E.inOut(seg(f, 66, 80));
  const el = lerp(14, 112, flexK) + pump * 10;
  const sh = 82 + pump * 4 - out * 10;
  const r = armRig(0, 0, a.mirror, sh, el, -10);
  const dir = a.mirror ? -1 : 1;
  const ox = dir * out * 110;
  const oy = (1 - rise) * 1300;
  return (
    <g transform={`translate(${a.x + ox} ${a.y + oy}) scale(${a.s * (1 + pump * 0.04)})`}>
      <ArmG a={r} root={I} flex={0.15 + 0.85 * flexK + pump * 0.15} hand="fist" el={el} />
      {pump > 0.85 && i % 2 === 0 ? null : null}
    </g>
  );
};

const IntroTitle: React.FC<{ f: number }> = ({ f }) => {
  const t = f - 22;
  if (t < 0) return null;
  const k = springAt(t, 0, 13, 1.3, 5);
  const out = E.in(seg(f, 68, 80));
  const words = ['WINTER', 'ARC'];
  let idx = 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: 150 + PAD,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${Math.max(0, k) * (1 + out * 0.6)}) rotate(${-4 + (1 - Math.min(1, k)) * -8}deg)`,
        opacity: 1 - out,
      }}
    >
      {words.map((w, li) => (
        <div key={w} style={{ display: 'flex', marginTop: li ? -20 : 0 }}>
          {w.split('').map((ch) => {
            const i = idx++;
            const lk = springAt(t, 3 + i * 1.4, 10, 1.5, 5.2);
            return (
              <span
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontFamily: TITLE_FONT,
                  fontSize: 190,
                  lineHeight: 1,
                  transform: `translateY(${(1 - Math.min(1, lk)) * -60}px) scale(${Math.max(0, lk)})`,
                }}
              >
                <span style={{ position: 'absolute', left: 0, top: 0, color: C.ink, WebkitTextStroke: `40px ${C.ink}`, filter: `drop-shadow(0 16px 0 ${C.ink})` }}>{ch}</span>
                <span
                  style={{
                    position: 'relative',
                    backgroundImage: li === 0 ? 'linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 50%,#C7E7FB 52%,#C7E7FB 100%)' : 'linear-gradient(180deg,#FFF0B7 0%,#FFD064 50%,#F5B23E 52%,#F5B23E 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {ch}
                </span>
              </span>
            );
          })}
        </div>
      ))}
      <div
        style={{
          marginTop: 30,
          background: C.ink,
          color: '#FFFFFF',
          fontFamily: TITLE_FONT,
          fontSize: 46,
          letterSpacing: 2,
          padding: '14px 34px 8px',
          borderRadius: 999,
          transform: `scale(${Math.max(0, springAt(t, 14, 12, 1.4, 5))})`,
          boxShadow: '0 10px 0 rgba(0,0,0,0.18)',
        }}
      >
        7 POINTS A WEEK · NO EXCUSES
      </div>
    </div>
  );
};

export const IntroScene: React.FC = () => {
  const f = useCurrentFrame();
  // mascot pops up, flexes, then leaps out
  const popK = springAt(f, 20, 14, 1.3, 5);
  const leap = E.in(seg(f, 62, 74));
  const mp = plant(
    pose({
      shL: 96, elL: 104, wrL: -14, flexL: 1, shR: 96, elR: 104, wrR: -14, flexR: 1, chestS: 1.05,
      hipL: 9, hipR: 9, knL: -8, knR: -8, brow: 0.6, mouthOpen: 0.3 + 0.4 * Math.max(0, Math.sin(f / 4)) * seg(f, 30, 40),
      eyeMode: f > 34 && f < 46 ? 'star' : 'normal', sy: 1 + (1 - Math.min(1, popK)) * 0.2 + leap * 0.15, sx: 1 - leap * 0.08,
    }),
  );
  const heroY = 1870 + (1 - Math.min(1.2, popK)) * 1760 - leap * 2400;
  const r = rig(mp);
  const mouth = [540 + r.mouth()[0], heroY + r.mouth()[1]];
  const sh = shake(f, 30, 12, 18, 3);
  const rr = rng(8);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #82ADFC 0%, #ABDDF9 55%, #F6F2FF 100%)', overflow: 'hidden' }}>
      <svg width={1080} height={FULL_H} viewBox={`0 ${-PAD} 1080 ${FULL_H}`} style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <g transform={`translate(${sh.x} ${sh.y})`}>
          <g opacity={0.3} transform={`rotate(${f * 0.6} 540 980)`}>
            {Array.from({ length: 14 }).map((_, i) => (
              <path key={i} d="M540 980 L2200 830 L2200 1130 Z" transform={`rotate(${(i * 360) / 14} 540 980)`} fill="#FFFFFF" />
            ))}
          </g>
          <Sun x={860} y={300} r={80} f={f} rays={false} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Cloud key={i} x={((rr() * 1300 + f * (1 + i * 0.4)) % 1500) - 200} y={260 + i * 300} w={300 + rr() * 160} h={130} seed={i + 2} opacity={0.95} />
          ))}
          <Glow x={540} y={1000} r={kf(f, [[18, 0], [30, 700, E.out], [60, 600]])} id="glowW" o={0.8} />
          {f >= 28 && f < 40 ? <FocusLines f={f} cx={540} cy={1050} r0={430} r1={1800} n={46} opacity={0.5} width={16} /> : null}
          <Sparks f={f} start={30} seed={12} n={22} x={540} y={1150} speed={[18, 44]} g={0.7} size={[16, 30]} colors={['#FFD064', '#FFFFFF', '#F5B23E']} />
          {[2, 3].map((i) => (
            <Arm key={i} f={f} a={ARMS[i]} i={i} />
          ))}
          <Hero p={mp} x={540} y={heroY} scale={1.0} shadow={false} />
          {[0, 1].map((i) => (
            <Arm key={i} f={f} a={ARMS[i]} i={i} />
          ))}
          <Glint x={mouth[0] + 50} y={mouth[1] - 10} s={1.4} t={seg(f, 38, 52)} />
          <Twinkle x={200} y={900} s={1} t={seg(f, 34, 50)} color="#FFD064" />
          <Twinkle x={900} y={1250} s={0.8} t={seg(f, 40, 56)} color="#FFD064" />
        </g>
      </svg>
      <IntroTitle f={f} />
    </AbsoluteFill>
  );
};
