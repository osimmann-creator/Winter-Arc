import React from 'react';
import { smooth, P } from '../lib/shape';
import { C } from '../hero/Hero';

/** Tapered motion smear along trail points (newest first). */
export const Swoosh: React.FC<{ pts: [number, number][]; width: number; color?: string; outline?: boolean; opacity?: number }> = ({
  pts, width, color = '#FFFFFF', outline = false, opacity = 0.75,
}) => {
  if (pts.length < 2) return null;
  // drop near-duplicate points
  const q: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = q[q.length - 1];
    if (Math.hypot(x - px, y - py) > 4) q.push(pts[i]);
  }
  if (q.length < 2) return null;
  const total = q.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - q[i - 1][0], p[1] - q[i - 1][1]) : 0), 0);
  if (total < 30) return null;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)];
    const b = q[Math.min(q.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1;
    nx /= n;
    ny /= n;
    const k = 1 - i / (q.length - 1);
    const w = (width / 2) * Math.pow(k, 1.4);
    left.push([q[i][0] + nx * w, q[i][1] + ny * w]);
    right.push([q[i][0] - nx * w, q[i][1] - ny * w]);
  }
  const d = smooth([...left, ...right.reverse()], true, 0.9);
  return (
    <g opacity={opacity}>
      {outline ? <path d={d} fill="none" stroke={C.ink} strokeWidth={10} strokeLinejoin="round" opacity={0.6} /> : null}
      <path d={d} fill={color} />
    </g>
  );
};

/** Sample a point function over previous frames. */
export const trail = (fn: (f: number) => [number, number], f: number, n = 6, step = 1): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) out.push(fn(f - i * step));
  return out;
};
