/* Flexander for HyperFrames.
   Renders the mascot rig (src/hero/Hero.tsx) into still SVG poses that the HyperFrames clips in
   animations/hyperframes move around as whole pieces. Every pose shares one canvas (viewBox
   -640 -1340 1280 1440, feet at 0,0), so poses stacked at the same spot line up and can be swapped.
   A member's version swaps the violet sash and trim for his app colour (ROSTER in js/config.js).

   Run: ./scripts/export-cast.sh   →  hyperframes/assets/cast/flex-<pose>[-<member>].svg + flex.json */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'fs';
import { C, Hero, Pose, pose, rig } from '../hero/Hero';
import { POSES, Look } from './cast-poses';

const OUT = process.argv[2] || 'hyperframes/assets/cast';
mkdirSync(OUT, { recursive: true });

const VB = { x: -640, y: -1340, w: 1280, h: 1440 };

/* Member colours from js/config.js ROSTER: [main, light, dark]. */
export const MEMBERS: Record<string, [string, string, string]> = {
  osim: ['#7254DC', '#BCABFF', '#4F35B0'],
  amaan: ['#F2853A', '#FFC79E', '#B4521C'],
  ayaad: ['#2FA36B', '#9EE3BF', '#1D6E48'],
  connor: ['#2F66E6', '#A9C2FF', '#1C46A8'],
  dean: ['#EE5982', '#FFB3C8', '#A83560'],
  dylan: ['#1FA3A0', '#93E3E0', '#136E6C'],
  gaurav: ['#B45AC8', '#E2B5EE', '#7A3590'],
  jake: ['#E39A2E', '#FFD79C', '#A8661A'],
  phil: ['#D9644F', '#FFB5A6', '#963B2C'],
  // the crew in anonymous clips (GTA, holidays): neutral slate, and a second one for a partner
  anon: ['#5B6478', '#B9C1D3', '#394052'],
  anon2: ['#C2873A', '#F2D3A2', '#875A20'],
};

const markup = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} width={VB.w} height={VB.h}>
      {el}
    </svg>,
  );

const recolor = (svg: string, [main, hi, sh]: [string, string, string]) =>
  svg.split(C.violet).join(main).split(C.violetHi).join(hi).split(C.violetSh).join(sh);

const manifest: Record<string, unknown> = { viewBox: VB, poses: {} };
const pt = (q: [number, number]) => [Math.round(q[0] - VB.x), Math.round(q[1] - VB.y)];

for (const look of POSES as Look[]) {
  const p: Pose = pose(look.p);
  const r = rig(p);
  const svg = markup(
    <g>
      {look.back}
      <Hero
        p={p}
        x={0}
        y={0}
        scale={1}
        shadow={look.shadow ?? false}
        itemL={look.itemL}
        itemR={look.itemR}
        itemBehindL={look.itemBehindL}
        itemBehindR={look.itemBehindR}
        headExtra={look.headExtra}
        behind={look.behind}
        front={look.front}
      />
      {look.over}
    </g>,
  );
  (manifest.poses as Record<string, unknown>)[look.id] = {
    handL: pt(r.handL() as [number, number]),
    handR: pt(r.handR() as [number, number]),
    headTop: pt(r.headTop() as [number, number]),
    eyes: pt(r.eyes() as [number, number]),
    mouth: pt(r.mouth() as [number, number]),
    members: look.members ?? [],
  };
  writeFileSync(`${OUT}/flex-${look.id}.svg`, svg);
  for (const m of look.members ?? []) writeFileSync(`${OUT}/flex-${look.id}-${m}.svg`, recolor(svg, MEMBERS[m]));
}
writeFileSync(`${OUT}/flex.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${(POSES as Look[]).length} poses → ${OUT}`);
