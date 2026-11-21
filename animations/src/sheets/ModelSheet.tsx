import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Hero, pose, Pose, C } from '../hero/Hero';
import { TITLE_FONT } from '../fonts';

export const POSES: Record<string, Partial<Pose>> = {
  idle: {},
  flex: {
    shL: 96, elL: 104, wrL: -14, flexL: 1, shR: 96, elR: 104, wrR: -14, flexR: 1, chestS: 1.03,
    hipL: 9, hipR: 9, knL: -8, knR: -8, brow: 0.4,
  },
  cheer: {
    shL: 160, elL: -16, handL: 'open', shR: 160, elR: -16, handR: 'open', mouthOpen: 1, eyes: 1, hipL: 8, hipR: 8,
  },
  hips: {
    shL: 42, elL: -104, wrL: 30, shR: 42, elR: -104, wrR: 30, turn: 0.25, lookX: 0.4, mouthSkew: 0.6, smile: 0.8,
  },
  thumbs: {
    shR: 24, elR: 142, wrR: -64, handR: 'thumb', shL: 40, elL: -104, wrL: 30, lookX: 0.3, turn: 0.2, brow: 0.5, wink: 1, mouthSkew: 0.4,
  },
};

const Sheet: React.FC<{ items: [string, Partial<Pose>][]; title: string; cols: number; scale: number; w: number; h: number }> = ({ items, title, cols, scale, w, h }) => {
  const rows = Math.ceil(items.length / cols);
  const cw = w / cols;
  const ch = (h - 140) / rows;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#F2EDFE, #FFFFFF)' }}>
      <div style={{ position: 'absolute', top: 30, width: '100%', textAlign: 'center', fontFamily: TITLE_FONT, fontSize: 70, color: '#341720' }}>{title}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        {items.map(([name, p], i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const cx = cw * (c + 0.5);
          const gy = 140 + ch * (r + 1) - 60;
          return (
            <g key={name}>
              <Hero p={pose(p)} x={cx} y={gy} scale={scale} />
              <text x={cx} y={gy + 48} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={34} fill="#5A4F69">
                {name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const ModelSheet: React.FC = () => (
  <Sheet items={Object.entries(POSES)} title="FLEXANDER — MODEL SHEET" cols={5} scale={0.52} w={2400} h={1000} />
);

export const HeroBig: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(#C7E7FB, #FFFFFF)' }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
      <Hero p={pose(POSES.flex)} x={540} y={1700} scale={1.28} />
    </svg>
  </AbsoluteFill>
);

export const FaceSheet: React.FC = () => {
  const faces: [string, Partial<Pose>][] = [
    ['grin', {}],
    ['cheer', { mouthOpen: 1, eyes: 1, brow: 0.6 }],
    ['strain', { mouthMode: 'grit', lid: 0.35, browTilt: -1, sweat: 1, brow: -0.3 }],
    ['wow', { mouthMode: 'o', mouthOpen: 0.6, brow: 1, pupil: 0.7 }],
    ['smug', { turn: 0.3, lookX: 0.6, lid: 0.3, mouthSkew: 0.8, smile: 0.7, brow: 0.3, browTilt: -0.3 }],
    ['love', { eyeMode: 'heart', blush: 1, mouthOpen: 0.4 }],
    ['star', { eyeMode: 'star', mouthOpen: 0.7 }],
    ['dizzy', { eyeMode: 'spiral', mouthMode: 'o', mouthOpen: 0.2, turn: -0.2 }],
  ];
  return (
    <AbsoluteFill style={{ background: '#FAF9FF' }}>
      <svg width={2400} height={1300} viewBox="0 0 2400 1300" style={{ position: 'absolute', inset: 0 }}>
        {faces.map(([name, p], i) => {
          const cx = 300 * (i % 4) + 450 + (i >= 4 ? 0 : 0);
          const cy = i < 4 ? 1020 : 1020;
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 300 + col * 600;
          const y = 760 + row * 560;
          void cx; void cy;
          return (
            <g key={name}>
              <Hero p={pose(p)} x={x} y={y + 900} scale={1.2} shadow={false} />
              <text x={x} y={y - 80} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={40} fill="#5A4F69">{name.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};


const FACES: [string, Partial<Pose>][] = [
  ['GRIN', {}],
  ['HYPED', { mouthOpen: 1, eyes: 1, brow: 0.6 }],
  ['STRAIN', { mouthMode: 'grit', lid: 0.35, browTilt: -1, sweat: 1, brow: -0.3, red: 0.5 }],
  ['WHOA', { mouthMode: 'o', mouthOpen: 0.6, brow: 1, pupil: 0.7 }],
  ['SMUG', { turn: 0.3, lookX: 0.6, lid: 0.3, mouthSkew: 0.8, smile: 0.7, brow: 0.3, browTilt: -0.3 }],
  ['IN LOVE', { eyeMode: 'heart', blush: 1, mouthOpen: 0.4 }],
  ['STARSTRUCK', { eyeMode: 'star', mouthOpen: 0.7 }],
  ['WINK', { wink: 1, turn: 0.2, mouthSkew: 0.5, lookX: 0.3 }],
];

export const StyleSheet: React.FC = () => {
  const bodies: [string, Partial<Pose>][] = [
    ['', POSES.hips],
    ['', POSES.flex],
    ['', POSES.thumbs],
  ];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #9FD5F8 0%, #F2ECFF 46%, #FFFFFF 100%)' }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {FACES.map((_, i) => (
            <clipPath key={i} id={`fc${i}`}>
              <rect x={(i % 4) * 255 + 30} y={1190 + Math.floor(i / 4) * 330} width={240} height={300} rx={36} />
            </clipPath>
          ))}
        </defs>
        <text x={540} y={120} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={96} fill="#FFFFFF" stroke={C.ink} strokeWidth={20} paintOrder="stroke" strokeLinejoin="round">FLEXANDER</text>
        <text x={540} y={182} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={34} fill={C.ink}>WINTER ARC MASCOT · STYLE TEST</text>
        <ellipse cx={540} cy={1080} rx={520} ry={40} fill="#000" opacity={0.06} />
        {[0, 2, 1].map((i) => (
          <Hero key={i} p={pose(bodies[i][1])} x={[190, 540, 862][i]} y={i === 1 ? 1100 : 1060} scale={i === 1 ? 0.7 : 0.6} />
        ))}
        {FACES.map(([name, p], i) => {
          const x = (i % 4) * 255 + 30;
          const y = 1190 + Math.floor(i / 4) * 330;
          return (
            <g key={name}>
              <rect x={x} y={y} width={240} height={300} rx={36} fill="#FFFFFF" stroke={C.ink} strokeWidth={6} />
              <g clipPath={`url(#fc${i})`}>
                <rect x={x} y={y} width={240} height={300} fill={['#FFF0B7', '#D0EEFC', '#FBD8D8', '#E2DAFD', '#D9F6E0', '#FBD8E9', '#FFF0CC', '#ECE5FD'][i]} />
                <Hero p={pose(p)} x={x + 120} y={y + 712} scale={0.72} shadow={false} />
              </g>
              <rect x={x} y={y} width={240} height={300} rx={36} fill="none" stroke={C.ink} strokeWidth={6} />
              <rect x={x + 30} y={y + 252} width={180} height={36} rx={18} fill={C.ink} />
              <text x={x + 120} y={y + 279} textAnchor="middle" fontFamily={TITLE_FONT} fontSize={24} fill="#FFFFFF">{name}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
