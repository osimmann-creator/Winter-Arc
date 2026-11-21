// Path helpers for organic cartoon shapes.
export type P = [number, number];

const f = (v: number) => Math.round(v * 100) / 100;

/** Catmull-Rom spline through points, as cubic Bezier SVG path. */
export function smooth(pts: P[], closed = true, k = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const at = (i: number): P =>
    closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * k;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * k;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * k;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * k;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Limb outline points. prof rows: [t (0..1 along length), halfWidth -x side, halfWidth +x side]. */
export function limbPts(len: number, prof: [number, number, number][], capTop: number, capBot: number): P[] {
  const left: P[] = prof.map(([t, wn]) => [-wn, t * len]);
  const right: P[] = prof.map(([t, , wp]) => [wp, t * len] as P).reverse();
  return [[0, -capTop], ...left, [0, len + capBot], ...right];
}

/** Tapered capsule from (x1,y1) radius r1 to (x2,y2) radius r2 (round ends). */
export function capsule(x1: number, y1: number, x2: number, y2: number, r1: number, r2 = r1): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const p1 = [x1 + nx * r1, y1 + ny * r1];
  const p2 = [x2 + nx * r2, y2 + ny * r2];
  const p3 = [x2 - nx * r2, y2 - ny * r2];
  const p4 = [x1 - nx * r1, y1 - ny * r1];
  return `M${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}A${f(r2)} ${f(r2)} 0 0 0 ${f(p3[0])} ${f(p3[1])}L${f(p4[0])} ${f(p4[1])}A${f(r1)} ${f(r1)} 0 0 0 ${f(p1[0])} ${f(p1[1])}Z`;
}

/** Scalloped (bumpy) arc along an ellipse, from angle a0 to a1 (deg, SVG angles), n bumps. */
export function scallopPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, bump: number): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    if (i === 0) {
      d += `M${f(x)} ${f(y)}`;
    } else {
      const am = ((a0 + ((a1 - a0) * (i - 0.5)) / n) * Math.PI) / 180;
      const qx = cx + (rx + bump) * Math.cos(am);
      const qy = cy + (ry + bump) * Math.sin(am);
      d += `Q${f(qx)} ${f(qy)} ${f(x)} ${f(y)}`;
    }
  }
  return d;
}

export function starPath(cx: number, cy: number, r1: number, r2: number, n = 5, rot = -90): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    d += `${i === 0 ? 'M' : 'L'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return d + 'Z';
}

/** Rounded star (softer, cartoony). */
export function softStar(cx: number, cy: number, r1: number, r2: number, n = 5, rot = -90): string {
  const pts: P[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return smooth(pts, true, 0.35);
}

export function heartPath(cx: number, cy: number, s: number): string {
  // s = half width
  const k = s / 50;
  const p = (x: number, y: number) => `${f(cx + x * k)} ${f(cy + y * k)}`;
  return `M${p(0, 42)}C${p(-18, 28)} ${p(-52, 6)} ${p(-50, -18)}C${p(-48, -42)} ${p(-20, -50)} ${p(0, -28)}C${p(20, -50)} ${p(48, -42)} ${p(50, -18)}C${p(52, 6)} ${p(18, 28)} ${p(0, 42)}Z`;
}

export function circlePath(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
}

export function ellPath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

export function rrPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}

/** Cloud: bumpy blob with flat-ish bottom. */
export function cloudPath(cx: number, cy: number, w: number, h: number, seed = 1): string {
  const r = rng(seed);
  const pts: P[] = [];
  const n = 9;
  // top bumps
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx - w / 2 + w * t;
    const arch = Math.sin(Math.PI * t);
    const y = cy - h * 0.15 - h * 0.75 * arch * (0.75 + 0.35 * r());
    pts.push([x, y]);
  }
  let d = `M${f(cx - w / 2)} ${f(cy + h * 0.25)}`;
  d += `Q${f(cx - w / 2 - h * 0.25)} ${f(cy)} ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    const my = Math.min(y0, y1) - (w / n) * 0.55;
    d += `Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`;
  }
  d += `Q${f(cx + w / 2 + h * 0.25)} ${f(cy)} ${f(cx + w / 2)} ${f(cy + h * 0.25)}`;
  d += `Q${f(cx)} ${f(cy + h * 0.38)} ${f(cx - w / 2)} ${f(cy + h * 0.25)}Z`;
  return d;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
