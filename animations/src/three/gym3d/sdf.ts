import * as THREE from 'three';

// Signed-distance sculpting: the torso and head are written as smooth unions of
// ellipsoids, then turned into a mesh once with surface nets. That gives soft,
// clay-like muscle forms (pecs, abs, cheeks) that primitives can't.

export type SDF = (x: number, y: number, z: number) => number;

/** Inigo Quilez's ellipsoid bound: cheap and smooth enough for sculpting. */
export const ellipsoid = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): SDF => (x, y, z) => {
  const px = (x - cx) / rx;
  const py = (y - cy) / ry;
  const pz = (z - cz) / rz;
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = (x - cx) / (rx * rx);
  const qy = (y - cy) / (ry * ry);
  const qz = (z - cz) / (rz * rz);
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
};

export const capsule = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): SDF => {
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const bb = bax * bax + bay * bay + baz * baz;
  return (x, y, z) => {
    const pax = x - ax;
    const pay = y - ay;
    const paz = z - az;
    const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / bb));
    const dx = pax - bax * h;
    const dy = pay - bay * h;
    const dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
};

export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/** Mirror a shape across x = 0 (both sides at once). */
export const mirrorX = (s: SDF): SDF => (x, y, z) => s(Math.abs(x), y, z);

/** Smooth union of several parts with one blend radius. */
export const union = (k: number, ...parts: SDF[]): SDF => (x, y, z) => {
  let d = parts[0](x, y, z);
  for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), k);
  return d;
};

/**
 * Surface nets: one vertex per surface-crossing cell (the mean of its edge
 * crossings), one quad per crossing grid edge. Normals come from the SDF
 * gradient, so the result shades smoothly.
 */
export const surfaceNets = (sdf: SDF, min: [number, number, number], max: [number, number, number], res: number): THREE.BufferGeometry => {
  const nx = Math.ceil((max[0] - min[0]) / res) + 1;
  const ny = Math.ceil((max[1] - min[1]) / res) + 1;
  const nz = Math.ceil((max[2] - min[2]) / res) + 1;
  const vals = new Float32Array(nx * ny * nz);
  const gi = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) vals[gi(i, j, k)] = sdf(min[0] + i * res, min[1] + j * res, min[2] + k * res);

  const cx = nx - 1;
  const cy = ny - 1;
  const cz = nz - 1;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const ci = (i: number, j: number, k: number) => i + cx * (j + cy * k);
  const pos: number[] = [];
  const corner = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const v = new Float32Array(8);
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = vals[gi(i + corner[c][0], j + corner[c][1], k + corner[c][2])];
          if (v[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
          sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
          sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
          n++;
        }
        cellVert[ci(i, j, k)] = pos.length / 3;
        pos.push(min[0] + (i + sx / n) * res, min[1] + (j + sy / n) * res, min[2] + (k + sz / n) * res);
      }

  const idx: number[] = [];
  const cell = (i: number, j: number, k: number) =>
    i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : cellVert[ci(i, j, k)];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  // For each grid edge that crosses the surface, join the four cells around
  // it. Winding is counter-clockwise seen from the outside.
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const inside = vals[gi(i, j, k)] < 0;
        if (i + 1 < nx && inside !== vals[gi(i + 1, j, k)] < 0)
          quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), !inside);
        if (j + 1 < ny && inside !== vals[gi(i, j + 1, k)] < 0)
          quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), !inside);
        if (k + 1 < nz && inside !== vals[gi(i, j, k + 1)] < 0)
          quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), !inside);
      }

  // Smooth normals straight from the field.
  const nrm = new Float32Array(pos.length);
  const e = res * 0.5;
  for (let p = 0; p < pos.length; p += 3) {
    const x = pos[p];
    const y = pos[p + 1];
    const z = pos[p + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    let gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    let gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    gx /= l;
    gy /= l;
    gz /= l;
    nrm[p] = gx;
    nrm[p + 1] = gy;
    nrm[p + 2] = gz;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
};
