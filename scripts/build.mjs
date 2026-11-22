import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await Promise.all(['dist/client', 'dist/server', 'dist/.openai'].map(file => mkdir(file, { recursive: true })));
for (const entry of ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets/icons', 'assets/fonts', 'assets/mascot']) {
  await cp(entry, 'dist/client/' + entry, { recursive: true });
}
for (const name of await readdir('server')) {
  if (name.endsWith('.mjs')) await cp('server/' + name, 'dist/server/' + (name === 'index.mjs' ? 'index.js' : name));
}
const [config, logic] = await Promise.all(['config', 'logic'].map(name => readFile('js/' + name + '.js', 'utf8')));
await writeFile('dist/server/shared.mjs', config + '\n' + logic + '\nexport { CONFIG, CATS, INSIDE_JOKES, HOAT, Logic, ROSTER };\n');
await writeFile('dist/client/js/config.js', config.replace(/const ROSTER = \[[\s\S]*?\n\];/, 'const ROSTER = [];'));
const html = await readFile('index.html', 'utf8');
const paths = [...html.matchAll(/(?:href|src)="((?:css|js)\/[^"?]+)"/g)].map(([, path]) => path);
const revisions = new Map(await Promise.all(paths.map(async path => {
  const bytes = await readFile('dist/client/' + path);
  return [path, createHash('sha256').update(bytes).digest('hex').slice(0, 12)];
})));
await writeFile('dist/client/index.html', html.replace(/((?:href|src)=")((?:css|js)\/[^"?]+)"/g,
  (_, prefix, path) => `${prefix}${path}?v=${revisions.get(path)}"`));
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await writeFile('dist/server/wrangler.json', JSON.stringify({
  main: 'index.js',
  compatibility_date: '2026-11-21',
  assets: { directory: '../client', binding: 'ASSETS' },
}, null, 2) + '\n');
