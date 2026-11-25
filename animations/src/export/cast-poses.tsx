/* The poses Flexander strikes in the HyperFrames clips. Each one is a still: the clips move
   whole pieces (slide, hop, shake, pop, squash) and swap poses, rather than animating limbs.
   members: the member colours this pose is also exported in (see MEMBERS in cast.tsx). */
import React from 'react';
import { Pose } from '../hero/Hero';

export type Look = {
  id: string;
  p: Partial<Pose>;
  members?: string[];
  itemL?: React.ReactNode;
  itemR?: React.ReactNode;
  itemBehindL?: boolean;
  itemBehindR?: boolean;
  headExtra?: React.ReactNode;
  behind?: React.ReactNode;
  front?: React.ReactNode;
  back?: React.ReactNode;
  over?: React.ReactNode;
  shadow?: boolean;
};

const INK = '#341720';

/* ------------------------------------------------------------ props (drawn in wrist space: the fist is near 0,70) */
/** A dinner fork gripped across the fist like a barbell. */
export const Fork: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <g transform={`translate(0 72) scale(${flip ? -1 : 1} 1)`}>
    <path d="M-70 -9 L120 -11 Q134 -12 140 -20 L148 -20 L150 20 L142 20 Q134 12 120 11 L-70 9 Q-82 0 -70 -9 Z" fill="#D9DFEA" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M146 -26 L232 -26 M146 -9 L232 -9 M146 9 L232 9 M146 26 L232 26" stroke={INK} strokeWidth={17} strokeLinecap="round" />
    <path d="M146 -26 L232 -26 M146 -9 L232 -9 M146 9 L232 9 M146 26 L232 26" stroke="#D9DFEA" strokeWidth={7} strokeLinecap="round" />
    <path d="M138 -30 Q152 -34 160 -26 L160 26 Q152 34 138 30 Z" fill="#D9DFEA" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-56 -3 L110 -5" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
  </g>
);

/* ------------------------------------------------------------ faces */
const STRAIN: Partial<Pose> = {
  red: 1, mouthMode: 'grit', mouthOpen: 0.75, smile: 0.2, brow: 1.6, browTilt: -0.9, lid: 0.72, sweat: 1, pupil: 0.8,
};
const JOY: Partial<Pose> = { eyes: 1, mouthMode: 'grin', mouthOpen: 1, smile: 1, brow: 1, browTilt: 0.2, red: 0.25, blush: 0.6 };

export const POSES: Look[] = [
  /* ---- Thanksgiving: the max-effort fork lift ---- */
  {
    id: 'tg-strain',
    p: { ...STRAIN, shL: 8, elL: -118, wrL: -10, handL: 'fist', shR: 8, elR: -118, wrR: 78, handR: 'fist', shrugL: 22, shrugR: 22, sy: 0.97, sx: 1.02, head: -3 },
    itemR: <Fork />,
  },
  {
    id: 'tg-mid',
    p: { ...STRAIN, mouthOpen: 0.95, lid: 0.9, shL: 6, elL: -126, handL: 'fist', shR: 34, elR: 150, wrR: -40, handR: 'fist', shrugL: 16, shrugR: 26, head: 5, torso: -2 },
    itemR: <Fork />,
  },
  {
    id: 'tg-press',
    p: { ...JOY, shL: 152, elL: 38, handL: 'fist', shR: 172, elR: -6, wrR: 0, handR: 'fist', sy: 1.03, sx: 0.98, sweat: 0.4 },
    itemR: <Fork />,
  },
];
