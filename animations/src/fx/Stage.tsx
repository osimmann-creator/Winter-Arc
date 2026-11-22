import React from 'react';
import { AbsoluteFill } from 'remotion';

/** Every scene is drawn for this 1080×1920 design frame… */
export const W = 1080;
export const H = 1920;

/**
 * …and rendered taller, to the iPhone 18 Pro's shape (2622×1206 → 1080×2348),
 * so a video fills the phone edge to edge. The extra PAD above and below is
 * just more sky and more ground: the viewBox shows world y from -PAD to H+PAD,
 * and the camera still centres on the design frame.
 */
export const FULL_H = 2348;
export const PAD = (FULL_H - H) / 2;
/** The visible screen-space band, for anything drawn fixed to the screen. */
export const TOP = -PAD;
export const BOT = H + PAD;

export type Cam = { cx: number; cy: number; z: number; r?: number };

export const camT = (cam: Cam, sh?: { x: number; y: number; r: number }) =>
  `translate(${W / 2 + (sh?.x ?? 0)} ${H / 2 + (sh?.y ?? 0)}) rotate(${(cam.r ?? 0) + (sh?.r ?? 0)}) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})`;

/** Parallax camera: depth 0 = fixed to screen, 1 = moves with world. */
export const camP = (cam: Cam, depth: number, sh?: { x: number; y: number; r: number }) => {
  const z = 1 + (cam.z - 1) * depth;
  const cx = W / 2 + (cam.cx - W / 2) * depth;
  const cy = H / 2 + (cam.cy - H / 2) * depth;
  return camT({ cx, cy, z, r: (cam.r ?? 0) * depth }, sh);
};

export const Stage: React.FC<{
  children: React.ReactNode;
  impact?: boolean;
  bg?: string;
  overlay?: React.ReactNode;
}> = ({ children, impact, bg = '#C7E7FB', overlay }) => (
  <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
    <svg
      width={W}
      height={FULL_H}
      viewBox={`0 ${TOP} ${W} ${FULL_H}`}
      style={{
        position: 'absolute',
        inset: 0,
        filter: impact ? 'invert(1) saturate(0) contrast(2.2)' : undefined,
      }}
    >
      {children}
    </svg>
    {overlay ? <div style={{ position: 'absolute', left: 0, top: PAD, width: W, height: H }}>{overlay}</div> : null}
  </AbsoluteFill>
);
