import { readFile, readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const origin = new URL(process.argv[2]);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Pass the HTTPS origin of the Winter Arc site.');
}
const mediaFile = /^(celebrations|intro)\/[a-z0-9-]+\.(mp4|webp)$/;
const requested = process.argv.slice(3);
const directories = ['celebrations', 'intro'];
const files = requested.length ? requested : (
  await Promise.all(directories.map(async directory =>
    (await readdir(`assets/${directory}`)).map(name => `${directory}/${name}`)
  ))
).flat().filter(file => mediaFile.test(file));
if (files.some(file => !mediaFile.test(file))) throw new Error('Use paths relative to assets/, such as celebrations/joke-timesheet.mp4.');

let secret = process.env.MEDIA_UPLOAD_SECRET;
if (!secret && !process.stdin.isTTY) {
  const input = createInterface({ input: process.stdin, terminal: false });
  for await (const line of input) {
    secret = line.trim();
    break;
  }
}
if (!secret) throw new Error('Supply MEDIA_UPLOAD_SECRET through the environment or standard input.');

let failed = 0;
for (let i = 0; i < files.length; i += 4) {
  await Promise.all(files.slice(i, i + 4).map(async file => {
    try {
      const body = await readFile(`assets/${file}`);
      const response = await fetch(new URL('/api/uploadMedia', origin), {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Winter-Arc-Media-Secret': secret,
          'X-Winter-Arc-Media': `media/${file}`,
        },
        body,
      });
      if (!response.ok || (await response.json()).data?.size !== body.length) {
        throw new Error(`upload could not be verified (HTTP ${response.status})`);
      }
    } catch (error) {
      failed++;
      console.error(`${file}: ${error.message}`);
    }
  }));
}
console.log(`Uploaded ${files.length - failed} of ${files.length} media files.`);
if (failed) process.exitCode = 1;
