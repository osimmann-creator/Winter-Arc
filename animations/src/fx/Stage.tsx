import React from 'react';
import { AbsoluteFill } from 'remotion';

export const W = 1080;
export const H = 1920;

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
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        position: 'absolute',
        inset: 0,
        filter: impact ? 'invert(1) saturate(0) contrast(2.2)' : undefined,
      }}
    >
      {children}
    </svg>
    {overlay}
  </AbsoluteFill>
);
