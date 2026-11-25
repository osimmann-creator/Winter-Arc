#!/usr/bin/env node
/* Renders the HyperFrames clips into the app, the same steps scripts/build_app_assets.sh runs for the Remotion ones:
   1080x2348 master (../out/videos) -> 720x1566 app copy (assets/celebrations) -> soundtrack (scripts/sound.py mix,
   cues in sound/cues.py) -> 360x782 webp poster.

     node render.mjs                        every clip below
     node render.mjs joke-thanksgiving      just these
     DRAFT=1 node render.mjs joke-wanted    quick draft master only (../out/videos/<id>.draft.mp4), app untouched

   Chrome: set PUPPETEER_EXECUTABLE_PATH (or CHROME) to a Chrome / chrome-headless-shell binary if HyperFrames
   can't find one; the headless shell is much faster than full Chrome here. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ANIM = resolve(HERE, '..');
const APP = existsSync(resolve(ANIM, '../app/assets')) ? resolve(ANIM, '../app/assets') : resolve(ANIM, '../assets');
const OUT = join(ANIM, 'out', 'videos');

/** clip id (= <id>.html here = the app's video id) : poster time in seconds */
export const CLIPS = {
  'joke-thanksgiving': 3.2,
  'joke-crossing': 3.05,
  'joke-mycar': 2.7,
  'joke-finalcall': 3.0,
  'joke-worthit': 1.9,
  'joke-basement': 1.7,
  'joke-nomap': 3.4,
  'joke-grandtheft': 1.15,
  'joke-wanted': 2.4,
  'joke-busted': 2.1,
  'joke-wasted': 2.9,
  'joke-parole': 2.4,
  'joke-partners': 2.8,
  'joke-xmas': 3.0,
  'joke-nye': 2.55,
  'joke-groundhog': 2.9,
  'joke-valentine': 1.6,
};

const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
if (!env.PUPPETEER_EXECUTABLE_PATH && env.CHROME) env.PUPPETEER_EXECUTABLE_PATH = env.CHROME;
const run = (cmd, args, opt = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, ...opt });

const want = process.argv.slice(2);
const ids = want.length ? want : Object.keys(CLIPS);
const unknown = ids.filter((id) => !(id in CLIPS));
if (unknown.length) {
  console.error('Not in CLIPS: ' + unknown.join(', '));
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(join(APP, 'celebrations'), { recursive: true });

for (const id of ids) {
  const draft = !!process.env.DRAFT;
  const master = join(OUT, id + (draft ? '.draft.mp4' : '.mp4'));
  run('npx', ['hyperframes', 'render', '-c', id + '.html', '-o', master, '--quiet',
    ...(draft ? ['--quality', 'draft'] : ['--crf', '18'])], { cwd: HERE });
  if (draft) { console.log('draft ' + master); continue; }
  const mp4 = join(APP, 'celebrations', id + '.mp4');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vf', 'scale=720:1566', '-c:v', 'libx264', '-crf', '26',
    '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  run('python3', [join(ANIM, 'scripts', 'sound.py'), 'mix', id]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(CLIPS[id]), '-i', master, '-frames:v', '1', '-vf', 'scale=360:782',
    '-c:v', 'libwebp', '-quality', '80', join(APP, 'celebrations', id + '.webp')]);
  console.log('done ' + id);
}
