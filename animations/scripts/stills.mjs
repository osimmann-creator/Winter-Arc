// Render several stills with one bundle. Usage: node scripts/stills.mjs out/dir Comp:frame Comp:frame ...
import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [outDir, ...jobs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), onProgress: () => {} });
const scale = Number(process.env.SCALE || 0.5);
for (const job of jobs) {
  const [id, frameS, propsJ] = job.split(':');
  const inputProps = propsJ ? JSON.parse(Buffer.from(propsJ, 'base64').toString()) : {};
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable: '/usr/bin/google-chrome' });
  const frame = Math.min(Number(frameS || 0), composition.durationInFrames - 1);
  const output = path.join(outDir, `${id}-${frame}.png`);
  await renderStill({ composition, serveUrl, output, frame, inputProps, scale, browserExecutable: '/usr/bin/google-chrome', imageFormat: 'png' });
  console.log(output);
}
