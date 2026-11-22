// A gilt celestial atlas. Surface markings use longitude and latitude so they
// foreshorten at the limb and disappear around the back as the stone spins.
import React from 'react';
import { rng } from '../lib/shape';
import { Pt } from './kit';

const RAD = Math.PI / 180;
const RADIUS = 200;
const TILT = 11 * RAD;
const random = rng(179);
const specks = Array.from({ length: 124 }, () => ({
  longitude: random() * 360 - 180,
  latitude: Math.asin(random() * 2 - 1) / RAD,
  size: 0.8 + random() * 1.8,
}));

const crown: Pt[] = [[-37, 20], [-24, 6], [-12, 2], [1, -2], [17, 6], [30, 15], [40, 31]];
const swan: Pt[] = [[-19, -4], [-5, 10], [10, 16], [19, 27], [25, 19]];
const constellations = [
  { lon: 0, lat: 12, stars: crown }, { lon: 89, lat: -28, stars: swan },
  { lon: 148, lat: 20, stars: crown }, { lon: -94, lat: 6, stars: swan },
  { lon: -42, lat: -46, stars: swan }, { lon: -157, lat: -38, stars: swan },
];

const project = (lon: number, lat: number, spin: number) => {
  const a = (lon + spin) * RAD;
  const b = lat * RAD;
  const s = Math.sin(b), c = Math.cos(b);
  return {
    x: RADIUS * c * Math.sin(a),
    y: RADIUS * (-s * Math.cos(TILT) + c * Math.cos(a) * Math.sin(TILT)),
    z: s * Math.sin(TILT) + c * Math.cos(a) * Math.cos(TILT),
  };
};

type SurfacePoint = ReturnType<typeof project>;
const pathOf = (points: SurfacePoint[]) => {
  let visible = false;
  return points.map(({ x, y, z }) => {
    if (z < 0) { visible = false; return ''; }
    const tag = visible ? 'L' : 'M';
    visible = true;
    return tag + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join('');
};
const samples = (count: number, fn: (t: number) => SurfacePoint) =>
  pathOf(Array.from({ length: count + 1 }, (_, i) => fn(i / count)));

const veinPaths = Array.from({ length: 10 }, (_, band) => {
  const points: Pt[] = [];
  for (let longitude = -180; longitude <= 180; longitude += 3) {
    const u = longitude * RAD;
    const latitude = -65 + band * 14 + 7.4 * Math.sin(u * 2 + band * 0.5)
      + 3.5 * Math.sin(u * 5 + band * 0.7) + 1.3 * Math.sin(u * 13 - band * 0.2);
    points.push([longitude, latitude]);
  }
  return points;
});

const enamelStar = 'M0 -7L1.9 -1.9L7 0L1.9 1.9L0 7L-1.9 1.9L-7 0L-1.9 -1.9Z';

export const AtlasGlobe: React.FC<{ r: number; spin: number }> = ({ r, spin }) => {
  const parallel = (latitude: number) => samples(94, t => project(-180 + 360 * t, latitude, spin));
  const meridian = (longitude: number) => samples(42, t => project(longitude, -90 + t * 180, spin));
  return (
    <g transform={`scale(${r / RADIUS})`}>
      <defs>
        <radialGradient id="atlas-stone" cx="28%" cy="21%" r="88%">
          <stop stopColor="#9ABCCC" /><stop offset=".22" stopColor="#6F9FAB" />
          <stop offset=".48" stopColor="#47758A" /><stop offset=".73" stopColor="#344C70" />
          <stop offset=".92" stopColor="#252F50" /><stop offset="1" stopColor="#516779" />
        </radialGradient>
        <linearGradient id="atlas-brass" x1="0%" y1="0%" x2="84%" y2="100%">
          <stop stopColor="#A1663C" /><stop offset=".26" stopColor="#FFE7A6" />
          <stop offset=".48" stopColor="#D6A25C" /><stop offset=".76" stopColor="#BD7140" /><stop offset="1" stopColor="#FDD893" />
        </linearGradient>
        <clipPath id="atlas-limb"><circle r={200} /></clipPath>
      </defs>
      <circle r={200} fill="url(#atlas-stone)" stroke="#242334" strokeWidth={6} />
      <g clipPath="url(#atlas-limb)">
        <g transform="rotate(-18)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {veinPaths.map((line, i) => {
            const d = pathOf(line.map(([lon, lat]) => project(lon, lat, spin)));
            return <g key={i}>
              <path d={d} stroke={i % 2 ? '#9AC8BD' : '#203F5C'} strokeWidth={i % 3 ? 3.4 : 9} opacity={i % 2 ? .28 : .22} />
              {i % 3 === 0 && <path d={d} stroke="#B4CFC1" strokeWidth={1.8} opacity={.36} />}
            </g>;
          })}
          {[-64, -32, 32, 64].map(lat => <path key={lat} d={parallel(lat)} stroke="#D4C49A" strokeWidth={1.45} opacity={.62} />)}
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={meridian(i * 30)} stroke="#C1C4A8" strokeWidth={1.45} opacity={.54} />)}
          {specks.map(({ longitude, latitude, size }, i) => {
            const p = project(longitude, latitude, spin);
            return p.z > 0 && <ellipse key={i} cx={p.x} cy={p.y} rx={size * (.25 + p.z)} ry={size} fill={i % 3 ? '#E4E6CD' : '#FFCA72'} opacity={i % 3 ? .52 : .96} />;
          })}
          {constellations.map(({ lon, lat, stars }, i) => {
            const pts = stars.map(([dx, dy]) => project(lon + dx, lat + dy, spin));
            return <g key={i}>
              <path d={pathOf(pts)} stroke="#142F4A" strokeWidth={5.6} />
              <path d={pathOf(pts)} stroke="#F7CD77" strokeWidth={2.6} />
              {pts.map((p, j) => p.z > 0 && <g key={j} transform={`translate(${p.x} ${p.y}) scale(${.5 + p.z * .5} 1)`}>
                {j === 3 || j === 0
                  ? <path d={enamelStar} transform={j === 3 ? 'scale(1.45)' : undefined} fill="#FFF0B2" stroke="#B17E4B" strokeWidth={1.2} />
                  : <circle r={3.7} fill="#FFDEA1" stroke="#774B36" strokeWidth={1.25} />}
              </g>)}
            </g>;
          })}
          <path d={parallel(-12)} stroke="#293947" strokeWidth={13} />
          <path d={parallel(-12)} stroke="url(#atlas-brass)" strokeWidth={8} />
          <path d={parallel(-12)} stroke="#97603F" strokeWidth={1.5} />
          {Array.from({ length: 60 }, (_, i) => {
            const lon = i * 6;
            const a = project(lon, -13.3, spin);
            const b = project(lon, i % 5 ? -12.3 : -10.6, spin);
            return a.z > .01 && <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#634839" strokeWidth={2} />;
          })}
        </g>
        <path d="M-189 -60A198 198 0 0 1 -69 -187" fill="none" stroke="#F4EBCA" strokeWidth={5} opacity={.88} />
        <path d="M70 182A198 198 0 0 0 190 53" fill="none" stroke="#8CABBA" strokeWidth={3.5} opacity={.85} />
      </g>
    </g>
  );
};
