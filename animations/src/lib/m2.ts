// Tiny 2D affine helpers (same layout as SVG matrix(a b c d e f)).
export type M = [number, number, number, number, number, number];

export const I: M = [1, 0, 0, 1, 0, 0];

export const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

export const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
export const R = (deg: number): M => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};
export const S = (x: number, y = x): M => [x, 0, 0, y, 0, 0];

export const chain = (...ms: M[]): M => ms.reduce(mul, I);

export const ap = (m: M, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

export const svgM = (m: M) =>
  `matrix(${m.map((v) => Math.round(v * 10000) / 10000).join(' ')})`;

/** World light direction (unit vector pointing TOWARD the light): upper-left. */
export const LIGHT: [number, number] = [-0.55, -0.835];

/** Light direction expressed in the local frame of matrix m (normalised). */
export const localLight = (m: M, L: [number, number] = LIGHT): [number, number] => {
  const det = m[0] * m[3] - m[1] * m[2];
  const x = (m[3] * L[0] - m[2] * L[1]) / det;
  const y = (-m[1] * L[0] + m[0] * L[1]) / det;
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
};
