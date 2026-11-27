import { cleanupRemovedPhotos, handleAuth, readSession, seedAccounts } from './auth.mjs';
import { handleData, runEvents, servePhoto, sweepPhotos } from './data.mjs';
import { listSocial } from './social.mjs';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function json(data, status = 200, extraHeaders) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'private, no-store');
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return Response.json(data, { status, headers });
}

function fail(status, message) {
  return json({ error: message }, status);
}

function equalSecret(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let differences = 0;
  for (let i = 0; i < right.length; i++) differences |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return differences === 0;
}

const PUBLIC_ACTIONS = new Set(['getAuth', 'signIn', 'signOut']);
const SETUP_ACTIONS = new Set(['getAuth', 'setPassword', 'signOut']);
const MEDIA_PATH = /^media\/(?:celebrations|intro)\/[a-z0-9-]+\.(?:mp4|webp)$/;
const mediaType = key => key.endsWith('.mp4') ? 'video/mp4' : 'image/webp';

async function uploadMedia(request, env) {
  const key = request.headers.get('X-Winter-Arc-Media') || '';
  if (!MEDIA_PATH.test(key)) return fail(400, 'Invalid media file.');
  const maxBytes = 25_000_000;
  if (Number(request.headers.get('Content-Length')) > maxBytes) return fail(413, 'Media file is too large.');
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > maxBytes) return fail(413, 'Media file is too large.');
  const object = await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mediaType(key) } });
  return json({ data: { size: object.size } });
}

async function api(request, env, ctx, action) {
  if (request.method !== 'POST') return fail(405, 'Use POST.');
  const origin = request.headers.get('Origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return fail(403, 'Open Winter Arc to continue.');
  }
  if (action === 'bootstrap' || action === 'uploadMedia') {
    const bootstrap = equalSecret(request.headers.get('X-Winter-Arc-Bootstrap'), env.BOOTSTRAP_SECRET);
    const suppliedMediaSecret = request.headers.get('X-Winter-Arc-Media-Secret');
    const releasesUntil = Number(env.MEDIA_RELEASE_SECRET?.split('.')[0]);
    const releaseUpload = Date.now() < releasesUntil && equalSecret(suppliedMediaSecret, env.MEDIA_RELEASE_SECRET);
    const mediaUpload = action === 'uploadMedia' && (equalSecret(suppliedMediaSecret, env.MEDIA_UPLOAD_SECRET) || releaseUpload);
    if (!bootstrap && !mediaUpload) {
      return fail(404, 'Page not found.');
    }
    return action === 'bootstrap' ? json({ data: await seedAccounts(env) }) : uploadMedia(request, env);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return fail(415, 'Use a JSON request.');
  }
  const session = PUBLIC_ACTIONS.has(action) && action === 'signIn' ? null : await readSession(request, env);
  if (!session && !PUBLIC_ACTIONS.has(action)) return fail(401, 'Sign in first.');
  if (session?.must_change_password && !SETUP_ACTIONS.has(action)) {
    return fail(403, 'Pick your own password first.');
  }
  const maxLength = action === 'uploadPhoto' || action === 'updateProfile' ? 2_100_000 : 16_384;
  if (Number(request.headers.get('Content-Length')) > maxLength) return fail(413, 'That request is too large.');
  const reader = request.body?.getReader();
  if (!reader) return fail(400, 'That request is invalid.');
  const decoder = new TextDecoder();
  let raw = '', size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxLength) {
      await reader.cancel();
      return fail(413, 'That request is too large.');
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  let payload;
  try { payload = JSON.parse(raw); } catch { return fail(400, 'That request is invalid.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail(400, 'That request is invalid.');

  const auth = await handleAuth(action, request, env, payload, session, ctx);
  const result = auth ?? await handleData(action, request, env, payload, session, ctx);
  return result ? json({ data: result.data ?? null }, 200, result.headers) : fail(404, 'Page not found.');
}

function videoRange(range, length) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]) || !length) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  return Number.isSafeInteger(start) && start <= end && start < length ? { start, end } : null;
}

async function media(request, env, key) {
  const session = await readSession(request, env);
  if (!session || session.must_change_password) return fail(401, 'Sign in to view this media.');
  if (!MEDIA_PATH.test(key)) return fail(404, 'Media not found.');
  const isVideo = key.endsWith('.mp4');
  const headers = new Headers(SECURITY_HEADERS);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Type', mediaType(key));
  if (isVideo) headers.set('Accept-Ranges', 'bytes');

  const range = isVideo && request.headers.get('Range');
  if (range) {
    const meta = await env.BUCKET.head(key);
    if (!meta) return fail(404, 'Media not found.');
    const section = videoRange(range, meta.size);
    if (!section) {
      headers.set('Content-Range', 'bytes */' + meta.size);
      return new Response(null, { status: 416, headers });
    }
    const { start, end } = section;
    const length = end - start + 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${meta.size}`);
    headers.set('Content-Length', String(length));
    if (request.method === 'HEAD') return new Response(null, { status: 206, headers });
    const object = await env.BUCKET.get(key, { range: { offset: start, length } });
    return object ? new Response(object.body, { status: 206, headers }) : fail(404, 'Media not found.');
  }

  const headOnly = request.method === 'HEAD';
  const object = headOnly ? await env.BUCKET.head(key) : await env.BUCKET.get(key);
  if (!object) return fail(404, 'Media not found.');
  headers.set('Content-Length', String(object.size));
  return new Response(headOnly ? null : object.body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    try {
      if (path.startsWith('/api/')) return await api(request, env, ctx, path.slice(5));
      if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Use GET or HEAD.');
      if (path.startsWith('/photos/')) return await servePhoto(request, env, await readSession(request, env), path.slice(1));
      if (path.startsWith('/media/')) return await media(request, env, path.slice(1));

      const isStatic = path === '/' || path === '/index.html' || path === '/manifest.webmanifest' ||
        /^\/(?:css|js|assets\/(?:icons|fonts|mascot|activities))\/[a-z0-9._/-]+$/i.test(path);
      if (!isStatic) return fail(404, 'Page not found.');
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
        return fail(error.status, error.message);
      }
      return fail(500, 'Winter Arc couldn’t complete that request. Try again.');
    }
  },
  async scheduled(_event, env) {
    await Promise.all([runEvents(env), sweepPhotos(env), cleanupRemovedPhotos(env), listSocial(env)]);
  },
};
