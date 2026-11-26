#!/usr/bin/env node
/* The crew's characters, rendered from the rig (src/hero: Hero.tsx + heads.tsx + looks.ts):
     characters/<username>.png   one character sheet each (CharacterSheet in src/sheets/CharacterSheet.tsx)
     characters/crew.png         everyone side by side (CrewLineup)
     <app>/assets/mascot/<username>/<pose>.webp   his character on his Home screen, in the app's six mascot poses

     node scripts/render-characters.mjs                 everything
     node scripts/render-characters.mjs sheets          just the sheets
     node scripts/render-characters.mjs home osim dean  just these members' Home stills
   Bundles the Remotion project once, then renders each still. CHROME=/path/to/chrome if it isn't /usr/bin/google-chrome. */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANIM = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = existsSync(resolve(ANIM, '../app/assets')) ? resolve(ANIM, '../app/assets') : resolve(ANIM, '../assets');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
/** usernames with a look in src/hero/looks.ts (LOOKS) */
const MEMBERS = ['osim', 'phil', 'dylan', 'connor', 'gaurav', 'dean', 'amaan', 'jake', 'ayaad'];
/** the Home poses (src/app/poses.ts; js/app.js mascotState picks one) */
const HOME = ['wave', 'flex', 'thumbs', 'cheer', 'shrug', 'point'];

const [what = 'all', ...only] = process.argv.slice(2);
const who = only.length ? only : MEMBERS;
mkdirSync(join(ANIM, 'characters'), { recursive: true });
mkdirSync(join(ANIM, 'out', 'frames'), { recursive: true });

console.log('bundling…');
const serveUrl = await bundle({ entryPoint: join(ANIM, 'src', 'index.ts') });
const still = async (id, inputProps, output, scale = 1) => {
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable: CHROME });
  await renderStill({ composition, serveUrl, output, inputProps, browserExecutable: CHROME, scale, imageFormat: 'png' });
};

if (what === 'all' || what === 'sheets') {
  for (const id of who) {
    await still('CharacterSheet', { id }, join(ANIM, 'characters', `${id}.png`), 0.75);
    console.log('sheet', id);
  }
  if (!only.length) {
    await still('CrewLineup', {}, join(ANIM, 'characters', 'crew.png'), 0.75);
    console.log('sheet crew');
  }
}
if (what === 'all' || what === 'home') {
  for (const id of who) {
    for (const pose of HOME) await still('Mascot', { pose, who: id }, join(ANIM, 'out', 'frames', `mascot-${id}-${pose}.png`));
    console.log('home', id);
  }
  execFileSync('python3', [join(ANIM, 'scripts', 'pack_stills.py'), APP, '--members', who.join(',')], { stdio: 'inherit', cwd: ANIM });
}
