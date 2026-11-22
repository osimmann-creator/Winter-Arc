import { currentWeek, getGroup } from './data.mjs';
import { CONFIG, ROSTER } from './shared.mjs';

const USERNAME = /^[a-z0-9._-]{2,20}$/;
const COOKIE = '__Host-wa_session';
const SESSION_SECONDS = 180 * 24 * 60 * 60;
const TEMP_SESSION_SECONDS = 30 * 60;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const SIGN_IN_ERROR = 'That username and password don’t match.';
const RETRY_ERROR = 'Too many tries. Wait a few minutes or ask Osim.';
const ENCODER = new TextEncoder();
const ZERO_SALT = '0'.repeat(32);
const ZERO_HASH = '0'.repeat(64);

const ACTIVE_COMMISSIONER = `EXISTS (
  SELECT 1 FROM users AS actor
  JOIN members AS manager ON manager.user_id = actor.id
  JOIN sessions AS active ON active.user_id = actor.id AND active.credential_version = actor.credential_version
  WHERE actor.id = ? AND active.token_hash = ? AND active.expires_at > ?
    AND actor.must_change_password = 0 AND manager.role = 'commissioner'
)`;

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function randomUrlToken(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const toHex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));

async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', ENCODER.encode(text)));
}

function equalFixedLength(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derivePassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', ENCODER.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations: 100_000,
  }, material, 256);
  return toHex(hash);
}

async function hashPassword(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return salt + ':' + await derivePassword(password, salt);
}

async function passwordMatches(password, stored) {
  const [salt, expected] = stored?.split(':') || [ZERO_SALT, ZERO_HASH];
  return equalFixedLength(await derivePassword(password, salt), expected);
}

async function setupToken(env, username) {
  if (typeof env.INVITE_SECRET !== 'string' || env.INVITE_SECRET.length < 32) {
    fail(503, 'Winter Arc setup is unavailable.');
  }
  const key = await crypto.subtle.importKey('raw', ENCODER.encode(env.INVITE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, ENCODER.encode('winter-arc-initial-setup:' + username)));
}

function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

function cookieHash(request) {
  const token = (request.headers.get('cookie') || '').split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? sha256(token) : null;
}

async function makeSession(mustChangePassword) {
  const token = randomUrlToken(32);
  const seconds = mustChangePassword ? TEMP_SESSION_SECONDS : SESSION_SECONDS;
  return {
    hash: await sha256(token),
    expires: Date.now() + seconds * 1000,
    headers: { 'Set-Cookie': sessionCookie(token, seconds) },
  };
}

export async function readSession(request, env) {
  const hash = await cookieHash(request);
  if (!hash) return null;
  return env.DB.prepare(`
    SELECT users.id, users.username, users.must_change_password, users.credential_version,
      members.id AS member_id, members.role, members.name, sessions.token_hash
    FROM sessions
    JOIN users ON users.id = sessions.user_id AND users.credential_version = sessions.credential_version
    JOIN members ON members.user_id = users.id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(hash, Date.now()).first();
}

async function reserveAttempt(db, key, now, limit) {
  const expired = now - ATTEMPT_WINDOW;
  return db.prepare(`
    INSERT INTO attempts (key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
      window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
    WHERE window_start <= ? OR count < ?
    RETURNING count
  `).bind(key, now, expired, expired, expired, limit).first();
}

async function signIn(request, env, payload) {
  const candidate = normalizeUsername(payload.username);
  const username = USERNAME.test(candidate) ? candidate : '';
  const password = typeof payload.password === 'string' && payload.password.length <= 256 ? payload.password : '';
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip');
  if (ip && !(await reserveAttempt(env.DB, 'ip:' + await sha256(ip), now, 80))) fail(429, RETRY_ERROR);
  const key = 'user:' + username;
  if (!(await reserveAttempt(env.DB, key, now, 5))) fail(429, RETRY_ERROR);

  const user = await env.DB.prepare('SELECT id, password_hash, must_change_password, setup_required, credential_version FROM users WHERE username = ?')
    .bind(username).first();
  const matches = await passwordMatches(password || ' ', user?.password_hash);
  if (!username || !password || !user || !matches) fail(401, SIGN_IN_ERROR);
  if (user.setup_required) {
    const provided = typeof payload.setupToken === 'string' ? payload.setupToken : '';
    if (!equalFixedLength(provided, await setupToken(env, username))) fail(401, SIGN_IN_ERROR);
  }

  const next = await makeSession(user.must_change_password);
  const previous = await cookieHash(request);
  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO sessions (token_hash, user_id, credential_version, expires_at)
      SELECT ?, id, credential_version, ? FROM users WHERE id = ? AND credential_version = ?
    `).bind(next.hash, next.expires, user.id, user.credential_version),
    env.DB.prepare('DELETE FROM sessions WHERE token_hash = ? OR expires_at <= ?').bind(previous, now),
    env.DB.prepare('DELETE FROM attempts WHERE key = ? OR window_start <= ?').bind(key, now - ATTEMPT_WINDOW),
  ]);
  if (!results[0].meta.changes) fail(401, SIGN_IN_ERROR);
  return { data: null, headers: next.headers };
}

function requireSession(session) {
  if (!session) fail(401, 'Sign in first.');
}

function commissionerParams(session) {
  requireSession(session);
  if (session.must_change_password) fail(403, 'Choose your own password first.');
  if (session.role !== 'commissioner') fail(403, 'Only the commissioner can do that.');
  return [session.id, session.token_hash, Date.now()];
}

async function setPassword(env, payload, session) {
  requireSession(session);
  const password = payload.password;
  if (typeof password !== 'string' || password.length < 8) fail(400, 'Use at least 8 characters for your password.');
  if (password.length > 256) fail(400, 'Use 256 characters or fewer for your password.');
  if (session.must_change_password) {
    const previous = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ? AND credential_version = ?')
      .bind(session.id, session.credential_version).first();
    if (!previous) fail(401, 'Sign in again to continue.');
    if (await passwordMatches(password, previous.password_hash)) fail(400, 'Pick your own password, not the temporary one.');
  }

  const hash = await hashPassword(password);
  const next = await makeSession(false);
  const db = env.DB;
  const results = await db.batch([
    db.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 0, setup_required = 0,
        credential_version = credential_version + 1
      WHERE id = ? AND credential_version = ? AND EXISTS (
        SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ?
      )
    `).bind(hash, session.id, session.credential_version, session.token_hash, Date.now()),
    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, credential_version, expires_at)
      SELECT ?, id, credential_version, ? FROM users WHERE id = ? AND password_hash = ?
    `).bind(next.hash, next.expires, session.id, hash),
    db.prepare(`
      DELETE FROM sessions WHERE user_id = ? AND credential_version < (
        SELECT credential_version FROM users WHERE id = ?
      )
    `).bind(session.id, session.id),
  ]);
  if (!results[0].meta.changes) fail(401, 'Sign in again to continue.');
  return { data: null, headers: next.headers };
}

async function addFriend(env, payload, session) {
  const guard = commissionerParams(session);
  const name = typeof payload.name === 'string' ? payload.name.trim().replace(/\s+/g, ' ').slice(0, 24) : '';
  const username = normalizeUsername(payload.username || name);
  if (!name) fail(400, 'Add a name first.');
  if (!USERNAME.test(username)) fail(400, 'Usernames are 2–20 letters or numbers, no spaces.');

  const db = env.DB;
  const group = await getGroup(env);
  const week = currentWeek(group);
  const joinedWeek = week.status === 'live' ? week.idx : 0;
  const count = await db.prepare('SELECT count(*) AS count FROM members').first();
  const color = ROSTER[count.count % ROSTER.length].color;
  const tempPassword = randomUrlToken(12);
  const hash = await hashPassword(tempPassword);
  const userId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`
      INSERT INTO users (id, username, password_hash)
      SELECT ?, ?, ? WHERE ${ACTIVE_COMMISSIONER}
      ON CONFLICT (username) DO NOTHING
    `).bind(userId, username, hash, ...guard),
    db.prepare(`
      INSERT INTO members (id, user_id, username, name, color, role, joined_week)
      SELECT ?, id, username, ?, ?, 'member', ? FROM users WHERE id = ?
    `).bind(crypto.randomUUID(), name, color, joinedWeek, userId),
  ]);
  if (!results[0].meta.changes) {
    if (await db.prepare(`SELECT 1 FROM users WHERE username = ? AND ${ACTIVE_COMMISSIONER}`).bind(username, ...guard).first()) {
      fail(409, 'Someone already has that username.');
    }
    fail(403, 'Only the commissioner can do that.');
  }
  return { data: { username, tempPassword } };
}

async function resetPassword(env, memberId, session) {
  const guard = commissionerParams(session);
  const tempPassword = randomUrlToken(12);
  const hash = await hashPassword(tempPassword);
  const db = env.DB;
  const results = await db.batch([
    db.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 1, setup_required = 0,
        credential_version = credential_version + 1
      WHERE id = (SELECT user_id FROM members WHERE id = ?) AND ${ACTIVE_COMMISSIONER}
      RETURNING username
    `).bind(hash, memberId, ...guard),
    db.prepare(`
      DELETE FROM sessions WHERE user_id = (SELECT user_id FROM members WHERE id = ?)
        AND credential_version < (SELECT credential_version FROM users WHERE id = sessions.user_id)
    `).bind(memberId),
  ]);
  const user = results[0].results[0];
  if (!user) fail(404, 'They’re not in the group, or you can’t manage their account.');
  return { data: { username: user.username, tempPassword } };
}

async function makeCommissioner(env, memberId, session) {
  const guard = commissionerParams(session);
  if (memberId === session.member_id) return { data: null };
  const db = env.DB;
  const results = await db.batch([
    db.prepare(`
      UPDATE members SET role = 'member'
      WHERE id = ? AND EXISTS (SELECT 1 FROM members WHERE id = ?) AND ${ACTIVE_COMMISSIONER}
    `).bind(session.member_id, memberId, ...guard),
    db.prepare(`
      UPDATE members SET role = 'commissioner'
      WHERE id = ? AND NOT EXISTS (SELECT 1 FROM members WHERE role = 'commissioner')
    `).bind(memberId),
  ]);
  if (!results[0].meta.changes) fail(404, 'They’re not in the group, or you can’t hand over the role.');
  return { data: null };
}

export async function cleanupRemovedPhotos(env, onlyMemberId) {
  const db = env.DB;
  const select = onlyMemberId
    ? db.prepare('SELECT member_id FROM removed_member_photos WHERE member_id = ?').bind(onlyMemberId)
    : db.prepare('SELECT member_id FROM removed_member_photos LIMIT 5');
  const { results } = await select.all();
  for (const { member_id } of results) {
    let cursor;
    do {
      const page = await env.BUCKET.list({ prefix: 'photos/' + member_id + '/', cursor });
      if (page.objects.length) await env.BUCKET.delete(page.objects.map(object => object.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    await db.prepare('DELETE FROM removed_member_photos WHERE member_id = ?').bind(member_id).run();
  }
}

async function removeMember(env, memberId, session, ctx) {
  const guard = commissionerParams(session);
  if (memberId === session.member_id) fail(400, 'Hand the commissioner role to someone first.');
  const deleted = await env.DB.prepare(`
    DELETE FROM users WHERE id = (SELECT user_id FROM members WHERE id = ?) AND ${ACTIVE_COMMISSIONER}
  `).bind(memberId, ...guard).run();
  if (!deleted.meta.changes) fail(404, 'They’re not in the group, or you can’t manage their account.');

  const cleanup = cleanupRemovedPhotos(env, memberId).catch(() => {
    // The durable cleanup entry stays queued on a storage failure.
  });
  if (ctx) ctx.waitUntil(cleanup);
  else await cleanup;
  return { data: null };
}

export async function handleAuth(action, request, env, payload, session, ctx) {
  const requestedMember = payload.memberId ?? payload.id;
  const memberId = typeof requestedMember === 'string' ? requestedMember : '';
  switch (action) {
    case 'getAuth':
      return { data: {
        signedIn: Boolean(session),
        user: session ? { id: session.id, username: session.username } : null,
        mustChangePassword: Boolean(session?.must_change_password),
      } };
    case 'signIn': return signIn(request, env, payload);
    case 'setPassword': return setPassword(env, payload, session);
    case 'signOut':
      if (session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.token_hash).run();
      return { data: null, headers: { 'Set-Cookie': sessionCookie('', 0) } };
    case 'addFriend': return addFriend(env, payload, session);
    case 'resetPassword': return resetPassword(env, memberId, session);
    case 'removeMember': return removeMember(env, memberId, session, ctx);
    case 'makeCommissioner': return makeCommissioner(env, memberId, session);
  }
}

export async function seedAccounts(env) {
  const db = env.DB;
  if (await db.prepare('SELECT id FROM group_settings WHERE id = 1').first()) {
    fail(409, 'Winter Arc accounts have already been created.');
  }
  const password = env.INITIAL_PASSWORD;
  if (typeof password !== 'string' || !password || password.length > 256) fail(503, 'Winter Arc setup is unavailable.');
  const accounts = await Promise.all(ROSTER.map(async ({ username, name, color, role = 'member' }) => ({
    username, name, color, role,
    userId: crypto.randomUUID(),
    memberId: crypto.randomUUID(),
    hash: await hashPassword(password),
    setupToken: await setupToken(env, username),
  })));

  await db.batch([
    db.prepare(`
      INSERT INTO group_settings (id, name, season_start, season_weeks, weekly_min, strikes_out, timezone)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).bind(CONFIG.name, CONFIG.seasonStart, CONFIG.seasonWeeks, CONFIG.weeklyMin, CONFIG.strikesOut, CONFIG.timezone || 'America/New_York'),
    ...accounts.flatMap(account => [
      db.prepare('INSERT INTO users (id, username, password_hash, setup_required) VALUES (?, ?, ?, 1)')
        .bind(account.userId, account.username, account.hash),
      db.prepare('INSERT INTO members (id, user_id, username, name, color, role, joined_week) VALUES (?, ?, ?, ?, ?, ?, 0)')
        .bind(account.memberId, account.userId, account.username, account.name, account.color, account.role),
    ]),
  ]);
  return { accounts: accounts.map(({ username, setupToken }) => ({ username, setupToken })) };
}
