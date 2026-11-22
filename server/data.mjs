import { CATS, CONFIG, HOAT, INSIDE_JOKES, Jokes, Logic } from './shared.mjs';
import { addFeedComment, addTextPost, createInjuryReport, listSocial, resolveInjuryReport, setCommentHeart } from './social.mjs';

const COLORS = new Set(['#7254DC', '#F2853A', '#2FA36B', '#2F66E6', '#EE5982', '#1FA3A0', '#B45AC8', '#E39A2E', '#D9644F']);
const REACTIONS = new Set(['🔥', '💪', '👏', '😂', '🧢']);
const ID = /^[a-z0-9_-]{1,80}$/i;
const PHOTO_KEY = /^photos\/[a-z0-9_-]{1,80}\/[a-f0-9-]{36}$/i;
const MAX_PHOTO_BYTES = 1_600_000;
const MAX_EVENT_BYTES = 2_048;
const POST_ID = '[a-zA-Z0-9_-]{1,80}';
const WEEK = '(?:0|[1-9][0-9]?)';
const POINTS = '(?:0|[1-9][0-9]*)(?:\\.5)?';
const COUNT = '[1-9][0-9]*';
const EVENT_KEYS = {
  coin: `${WEEK}:${POINTS}`, bluehair: WEEK, iron: WEEK, liquor: WEEK,
  bag: `${WEEK}:${POINTS}`, fight: `${WEEK}(?::${POINTS})?`,
  crashout: POST_ID, satellite: POST_ID, puke: `${WEEK}:${COUNT}`, mma: WEEK,
  radiator: POST_ID, mom: WEEK, nets: WEEK, phil: POST_ID,
  scared: `[0-9]{4}-[0-9]{2}-[0-9]{2}:${COUNT}`, timesheet: WEEK, hoat: WEEK,
  roast: '[0-9]{4}-[0-9]{2}-[0-9]{2}',
};

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function statement(env, sql, ...values) {
  const query = env.DB.prepare(sql);
  return values.length ? query.bind(...values) : query;
}

function requireId(id, label) {
  if (typeof id !== 'string' || !ID.test(id)) fail(`Choose ${label}.`);
}

function photoUrl(key) {
  return key ? `/${key}` : undefined;
}

function memberShape(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, username: row.username, name: row.name,
    color: row.color, photo: photoUrl(row.photo_key), joinedWeek: row.joined_week, role: row.role,
  };
}

function groupShape(row) {
  return {
    name: row.name, seasonStart: row.season_start, seasonWeeks: row.season_weeks,
    weeklyMin: row.weekly_min, strikesOut: row.strikes_out, timezone: row.timezone,
  };
}

function eventShape(row) {
  return {
    id: row.id, type: row.type, key: row.key, at: row.at, data: JSON.parse(row.data),
    ...(row.seen == null ? {} : { seen: Boolean(row.seen) }),
  };
}

function prefsShape(row) {
  return { sundayReminder: row ? Boolean(row.sunday_reminder) : true, capAlerts: row ? Boolean(row.cap_alerts) : true };
}

function postShape(row) {
  return {
    id: row.id, memberId: row.member_id, cat: row.cat, at: row.at,
    minutes: row.minutes ?? undefined, miles: row.miles ?? undefined,
    paceSeconds: row.pace_seconds ?? undefined,
    caption: row.caption ?? undefined, photo: photoUrl(row.photo_key),
    editVersion: row.edit_version ?? null,
    witnesses: [], reactions: {}, voided: Boolean(row.voided), fraud: Boolean(row.fraud),
  };
}

export async function getGroup(env) {
  const row = await statement(env, 'SELECT * FROM group_settings WHERE id = 1').first();
  if (!row) fail('Winter Arc setup is still in progress.', 503);
  return groupShape(row);
}

export function currentWeek(group, now = new Date()) {
  const season = Logic.season({ ...CONFIG, ...group }, now);
  return { idx: season.idx, start: season.wkStart, end: season.wkEnd, status: season.status };
}

async function listMembers(env) {
  const { results } = await statement(env, 'SELECT * FROM members ORDER BY created_at, id').all();
  return results.map(memberShape);
}

async function getMe(env, session) {
  return memberShape(await statement(env, 'SELECT * FROM members WHERE id = ?', session.member_id).first());
}

function postQueries(env, postId) {
  return postId ? [
    statement(env, 'SELECT * FROM posts WHERE id = ?', postId),
    statement(env, 'SELECT * FROM witnesses WHERE post_id = ? ORDER BY member_id', postId),
    statement(env, 'SELECT * FROM reactions WHERE post_id = ? ORDER BY member_id', postId),
  ] : [
    statement(env, 'SELECT * FROM posts ORDER BY at, id'),
    statement(env, 'SELECT * FROM witnesses ORDER BY post_id, member_id'),
    statement(env, 'SELECT * FROM reactions ORDER BY post_id, member_id'),
  ];
}

function assembledPosts([posts, witnesses, reactions]) {
  const byId = new Map(posts.results.map(post => [post.id, postShape(post)]));
  for (const witness of witnesses.results) byId.get(witness.post_id)?.witnesses.push(witness.member_id);
  for (const reaction of reactions.results) {
    const post = byId.get(reaction.post_id);
    if (post) (post.reactions[reaction.emoji] ??= []).push(reaction.member_id);
  }
  return [...byId.values()];
}

async function listPosts(env, postId) {
  return assembledPosts(await env.DB.batch(postQueries(env, postId)));
}

function imageBytes(dataUrl) {
  if (typeof dataUrl !== 'string') fail('Choose a photo.');
  if (dataUrl.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 32) {
    fail('That photo is too large. Try a smaller photo or screenshot.', 413);
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) fail('Choose a JPG, PNG, or WebP photo.');

  let binary;
  try {
    binary = atob(match[2]);
  } catch {
    fail('That photo couldn’t be opened.');
  }
  if (binary.length > MAX_PHOTO_BYTES) fail('That photo is too large. Try a smaller photo or screenshot.', 413);

  const type = match[1];
  const valid = {
    'image/jpeg': binary.startsWith('\xFF\xD8\xFF'),
    'image/png': binary.startsWith('\x89PNG\r\n\x1A\n'),
    'image/webp': binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP',
  };
  if (!valid[type]) fail('That photo couldn’t be opened.');
  return { bytes: Uint8Array.from(binary, char => char.charCodeAt(0)), type };
}

async function uploadPhoto(env, session, dataUrl) {
  const { bytes, type } = imageBytes(dataUrl);
  const key = `photos/${session.member_id}/${crypto.randomUUID()}`;
  const result = await statement(env, `
    INSERT INTO uploads (key, member_id)
    SELECT ?, ? WHERE EXISTS (SELECT 1 FROM members WHERE id = ?)
      AND (SELECT count(*) FROM uploads WHERE member_id = ? AND created_at >= datetime('now', '-1 hour')) < 45
  `, key, session.member_id, session.member_id, session.member_id).run();
  if (!result.meta.changes) fail('Too many photos uploaded. Try again in a little while.', 429);

  try {
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
    if (!await statement(env, 'SELECT key FROM uploads WHERE key = ?', key).first()) {
      await env.BUCKET.delete(key);
      fail('Sign in first.', 401);
    }
  } catch (error) {
    await statement(env, 'DELETE FROM uploads WHERE key = ?', key).run();
    throw error;
  }
  return key;
}

async function deleteUnusedPhoto(env, key) {
  if (!key) return;
  const discarded = await statement(env, `
    UPDATE uploads SET discarded_at = coalesce(discarded_at, CURRENT_TIMESTAMP) WHERE key = ?
      AND NOT EXISTS (SELECT 1 FROM posts WHERE photo_key = ?)
      AND NOT EXISTS (SELECT 1 FROM members WHERE photo_key = ?)
    RETURNING key
  `, key, key, key).first();
  if (!discarded) return;
  await env.BUCKET.delete(key);
  await statement(env, 'DELETE FROM uploads WHERE key = ? AND discarded_at IS NOT NULL', key).run();
}

function runInBackground(ctx, operation) {
  const work = operation.catch(() => console.warn('Winter Arc background operation failed.'));
  if (ctx?.waitUntil) ctx.waitUntil(work);
  else return work;
}

export async function servePhoto(request, env, session, key) {
  const unavailable = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  if (!session || session.must_change_password || !PHOTO_KEY.test(key)) return unavailable();

  const visible = await statement(env, `
    SELECT 1 AS visible FROM uploads
    WHERE key = ? AND discarded_at IS NULL AND (
      EXISTS (SELECT 1 FROM posts WHERE photo_key = ?)
      OR EXISTS (SELECT 1 FROM members WHERE photo_key = ?)
    )
  `, key, key, key).first();
  if (!visible) return unavailable();

  const object = request.method === 'HEAD' ? await env.BUCKET.head(key) : await env.BUCKET.get(key);
  if (!object) return unavailable();
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length': String(object.size),
    'X-Content-Type-Options': 'nosniff',
  });
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

function cleanName(name, maxLength = 24) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

async function updateProfile(env, session, patch, ctx) {
  const name = Object.hasOwn(patch, 'name') ? cleanName(patch.name) : null;
  if (name === '') fail('Add a name first.');
  const color = COLORS.has(patch.color) ? patch.color : null;
  const changesPhoto = Object.hasOwn(patch, 'photo');
  const key = changesPhoto && patch.photo !== null ? await uploadPhoto(env, session, patch.photo) : null;

  try {
    const [before, after] = await env.DB.batch([
      statement(env, 'SELECT photo_key FROM members WHERE id = ?', session.member_id),
      statement(env, `
        UPDATE members SET name = coalesce(?, name), color = coalesce(?, color),
          photo_key = CASE WHEN ? THEN ? ELSE photo_key END
        WHERE id = ?
        RETURNING *
      `, name, color, Number(changesPhoto), key, session.member_id),
    ]);
    const member = memberShape(after.results[0]);
    if (!member) fail('Sign in first.', 401);
    if (changesPhoto && before.results[0]?.photo_key) {
      await runInBackground(ctx, deleteUnusedPhoto(env, before.results[0].photo_key));
    }
    return member;
  } catch (error) {
    await runInBackground(ctx, deleteUnusedPhoto(env, key));
    throw error;
  }
}

async function getPrefs(env, session) {
  return prefsShape(await statement(env, 'SELECT * FROM prefs WHERE user_id = ?', session.id).first());
}

async function updatePrefs(env, session, patch) {
  for (const key of ['sundayReminder', 'capAlerts']) {
    if (Object.hasOwn(patch, key) && typeof patch[key] !== 'boolean') fail('Invalid notification preference.');
  }
  const sunday = patch.sundayReminder == null ? null : Number(patch.sundayReminder);
  const cap = patch.capAlerts == null ? null : Number(patch.capAlerts);
  const row = await statement(env, `
    INSERT INTO prefs (user_id, sunday_reminder, cap_alerts)
    VALUES (?, coalesce(?, 1), coalesce(?, 1))
    ON CONFLICT (user_id) DO UPDATE SET
      sunday_reminder = coalesce(?, prefs.sunday_reminder),
      cap_alerts = coalesce(?, prefs.cap_alerts)
    RETURNING *
  `, session.id, sunday, cap, sunday, cap).first();
  return prefsShape(row);
}

function requireCommissioner(session) {
  if (session.role !== 'commissioner') fail('Only the commissioner can do that.', 403);
}

function dateKeyValid(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

async function updateGroup(env, session, patch, ctx) {
  requireCommissioner(session);
  const name = Object.hasOwn(patch, 'name') ? cleanName(patch.name, 32) || CONFIG.name : null;
  let start = null;
  if (Object.hasOwn(patch, 'seasonStart')) {
    if (!dateKeyValid(patch.seasonStart)) fail('Pick the first Monday of the season.');
    const date = new Date(`${patch.seasonStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    start = date.toISOString().slice(0, 10);
    if (!dateKeyValid(start)) fail('Pick the first Monday of the season.');
  }
  const weeks = Object.hasOwn(patch, 'seasonWeeks') ? Math.round(Number(patch.seasonWeeks)) : null;
  const min = Object.hasOwn(patch, 'weeklyMin') ? Number(patch.weeklyMin) : null;
  const strikes = Object.hasOwn(patch, 'strikesOut') ? Math.round(Number(patch.strikesOut)) : null;
  if (weeks !== null && !(weeks >= 1 && weeks <= 52)) fail('The season can run 1 to 52 weeks.');
  if (min !== null && !(min >= 1 && min <= 50)) fail('The weekly minimum has to be between 1 and 50 points.');
  if (strikes !== null && !(strikes >= 1 && strikes <= 10)) fail('Strikes to be eliminated has to be between 1 and 10.');
  const timezone = Object.hasOwn(patch, 'timezone') ? patch.timezone : null;
  if (timezone !== null) {
    if (typeof timezone !== 'string' || timezone.length > 80 || !/^[a-z]/i.test(timezone)) fail('Choose a valid group time zone.');
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      fail('Choose a valid group time zone.');
    }
  }

  const row = await statement(env, `
    UPDATE group_settings
    SET name = coalesce(?, name), season_start = coalesce(?, season_start),
      season_weeks = coalesce(?, season_weeks), weekly_min = coalesce(?, weekly_min),
      strikes_out = coalesce(?, strikes_out), timezone = coalesce(?, timezone)
    WHERE id = 1 AND EXISTS (SELECT 1 FROM members WHERE id = ? AND role = 'commissioner')
    RETURNING *
  `, name, start, weeks, min, strikes, timezone, session.member_id).first();
  if (!row) fail('Only the commissioner can do that.', 403);

  await runInBackground(ctx, runEvents(env));
  return groupShape(row);
}

function postTime(input, start, end, now, message) {
  const time = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(input) ? Date.parse(input) : NaN;
  if (!Number.isFinite(time) || time < +start || time > +now + 5 * 60_000 || time >= +end) fail(message);
  return new Date(time).toISOString();
}

function postFields(input, session) {
  const { cat } = input;
  if (typeof cat !== 'string' || !Object.hasOwn(CATS, cat)) fail('Pick what you did.');
  const minutes = cat === 'gym' ? input.minutes : null;
  const miles = cat === 'run' || cat === 'bike' ? input.miles : null;
  const paceSeconds = cat === 'run' ? input.paceSeconds ?? null : null;
  if (cat === 'gym' && (!Number.isFinite(minutes) || minutes < 45)) fail('Gym needs at least 45 minutes.');
  if (cat === 'run' && (!Number.isFinite(miles) || miles < 2)) fail('Runs need at least 2 miles.');
  if (cat === 'bike' && (!Number.isFinite(miles) || miles < CATS.bike.minMiles)) fail(`Bike rides need at least ${CATS.bike.minMiles} miles.`);
  if (paceSeconds !== null && (!Number.isSafeInteger(paceSeconds) || paceSeconds <= 0 || paceSeconds > 59999)) {
    fail('Enter a pace in minutes and seconds per mile.');
  }
  if (input.caption != null && (typeof input.caption !== 'string' || input.caption.length > 140)) {
    fail('The caption can be up to 140 characters.');
  }
  const caption = input.caption?.trim() || null;
  const witnesses = input.witnesses ?? [];
  if (!Array.isArray(witnesses) || witnesses.length > 100 || witnesses.some(w => typeof w !== 'string' || !ID.test(w) || w === session.member_id)) {
    fail('Choose witnesses from the group.');
  }
  const witnessIds = JSON.stringify([...new Set(witnesses)]);
  const key = typeof input.photo === 'string' && input.photo.startsWith('/') ? input.photo.slice(1) : null;
  if (input.photo && (!key || !PHOTO_KEY.test(key))) fail('Upload a proof photo first.');
  if (!key && !witnesses.length) fail('Add a photo or tag a witness. No proof means no points.');
  return { cat, minutes, miles, paceSeconds, caption, witnessIds, key };
}

const WEEKLY_POSTS = 'SELECT 1 FROM posts WHERE member_id = ? AND cat = ? AND voided = 0 AND at >= ? AND at < ? AND id <> ?';
const VALID_WITNESSES = `NOT EXISTS (
  SELECT 1 FROM json_each(?) AS witness
  WHERE NOT EXISTS (SELECT 1 FROM members WHERE id = witness.value)
)`;
const AVAILABLE_PROOF = `
  EXISTS (SELECT 1 FROM uploads WHERE key = ? AND member_id = ?
    AND discarded_at IS NULL AND created_at >= datetime('now', '-1 day'))
  AND NOT EXISTS (SELECT 1 FROM posts WHERE photo_key = ?)
  AND NOT EXISTS (SELECT 1 FROM members WHERE photo_key = ?)
`;

async function checkPostFailure(env, limit, scope, cat) {
  if (limit && await statement(env, WEEKLY_POSTS, ...scope).first()) {
    fail(`You’ve already logged ${CATS[cat].short || CATS[cat].label} that week.`, 409);
  }
  fail('Use your own uploaded photo and choose witnesses who are in the group.');
}

async function addPost(env, session, input, ctx) {
  const { id = `p_${crypto.randomUUID()}` } = input;
  requireId(id, 'a post');
  const { cat, minutes, miles, paceSeconds, caption, witnessIds, key } = postFields(input, session);
  const now = new Date();
  const group = await getGroup(env);
  const week = currentWeek(group, now);
  if (week.status !== 'live') fail('Logging is only available during the Winter Arc.');
  const at = postTime(input.at, week.start, week.end, now, 'Pick a time in the current week.');

  const oncePerWeek = Number(Boolean(CATS[cat].oncePerWeek));
  const weeklyScope = [session.member_id, cat, week.start.toISOString(), week.end.toISOString(), id];
  const [inserted] = await env.DB.batch([
    statement(env, `
      INSERT INTO posts (id, member_id, cat, at, minutes, miles, pace_seconds, caption, photo_key, voided, fraud)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0
      WHERE EXISTS (SELECT 1 FROM members WHERE id = ?)
        AND EXISTS (SELECT 1 FROM group_settings WHERE season_start = ? AND season_weeks = ? AND timezone = ?)
        AND (? = 0 OR NOT EXISTS (${WEEKLY_POSTS}))
        AND ${VALID_WITNESSES}
        AND (? IS NULL OR (${AVAILABLE_PROOF}))
      ON CONFLICT (id) DO NOTHING
    `, id, session.member_id, cat, at, minutes, miles, paceSeconds, caption, key,
    session.member_id, group.seasonStart, group.seasonWeeks, group.timezone, oncePerWeek, ...weeklyScope,
    witnessIds, key, key, session.member_id, key, key),
    statement(env, `
      INSERT INTO witnesses (post_id, member_id)
      SELECT ?, value FROM json_each(?) WHERE changes() > 0
    `, id, witnessIds),
  ]);
  const [post] = await listPosts(env, id);
  if (!post || post.memberId !== session.member_id) await checkPostFailure(env, oncePerWeek, weeklyScope, cat);
  if (inserted.meta.changes) await runInBackground(ctx, runEvents(env));
  return post;
}

async function editPost(env, session, input, ctx) {
  const { id, editVersion = null } = input;
  requireId(id, 'a post');
  const before = await statement(env, 'SELECT * FROM posts WHERE id = ? AND member_id = ?', id, session.member_id).first();
  if (!before) fail('Only the author can edit this post.', 403);
  if (before.voided || before.fraud) fail('This post has been voided.', 409);
  if (before.edit_version !== editVersion) fail('This post changed. Reopen it to edit the latest version.', 409);

  const { cat, minutes, miles, paceSeconds, caption, witnessIds, key } = postFields(input, session);
  const { timezone } = await getGroup(env);
  const start = Logic.mondayOf(before.at, timezone), end = Logic.addDays(start, 7, timezone);
  const at = postTime(input.at, start, end, new Date(), 'Pick a date in the original game week.');
  const oncePerWeek = Number(Boolean(CATS[cat].oncePerWeek && cat !== before.cat));
  const scope = [session.member_id, cat, start.toISOString(), end.toISOString(), id];
  const nextVersion = crypto.randomUUID();
  const savedEdit = 'EXISTS (SELECT 1 FROM posts WHERE id = ? AND edit_version = ?)';
  const [updated] = await env.DB.batch([
    statement(env, `
      UPDATE posts SET cat = ?, at = ?, minutes = ?, miles = ?, pace_seconds = ?, caption = ?, photo_key = ?, edit_version = ?
      WHERE id = ? AND member_id = ? AND edit_version IS ? AND voided = 0 AND fraud = 0
        AND EXISTS (SELECT 1 FROM group_settings WHERE id = 1 AND timezone = ?)
        AND (? = 0 OR NOT EXISTS (${WEEKLY_POSTS}))
        AND ${VALID_WITNESSES}
        AND (? IS NULL OR ? = posts.photo_key OR (${AVAILABLE_PROOF}))
      RETURNING id
    `, cat, at, minutes, miles, paceSeconds, caption, key, nextVersion, id, session.member_id, editVersion, timezone,
    oncePerWeek, ...scope, witnessIds, key, key, key, session.member_id, key, key),
    statement(env, `DELETE FROM witnesses WHERE post_id = ? AND ${savedEdit}`, id, id, nextVersion),
    statement(env, `INSERT INTO witnesses (post_id, member_id)
      SELECT ?, value FROM json_each(?) WHERE ${savedEdit}`, id, witnessIds, id, nextVersion),
  ]);
  if (!updated.results.length) {
    const latest = await statement(env, 'SELECT edit_version, voided, fraud FROM posts WHERE id = ? AND member_id = ?', id, session.member_id).first();
    if (!latest || latest.edit_version !== editVersion || latest.voided || latest.fraud) {
      fail('This post changed. Reopen it to edit the latest version.', 409);
    }
    await checkPostFailure(env, oncePerWeek, scope, cat);
  }
  if (before.photo_key && before.photo_key !== key) await runInBackground(ctx, deleteUnusedPhoto(env, before.photo_key));
  await runInBackground(ctx, runEvents(env));
  const [post] = await listPosts(env, id);
  return post;
}

async function deletePost(env, session, id, ctx) {
  requireId(id, 'a post');
  const row = await statement(env, 'DELETE FROM posts WHERE id = ? AND member_id = ? RETURNING photo_key',
    id, session.member_id).first();
  if (!row) fail('Only the author can delete this post.', 403);
  await runInBackground(ctx, deleteUnusedPhoto(env, row.photo_key));
  await runInBackground(ctx, runEvents(env));
  return null;
}

async function toggleReaction(env, session, input, ctx) {
  const { postId, emoji } = input;
  requireId(postId, 'a post');
  if (!REACTIONS.has(emoji)) fail('Choose one of the available reactions.');

  await env.DB.batch([
    statement(env, 'DELETE FROM reactions WHERE post_id = ? AND member_id = ? AND emoji = ?', postId, session.member_id, emoji),
    statement(env, `
      INSERT INTO reactions (post_id, member_id, emoji)
      SELECT ?, ?, ? WHERE changes() = 0
        AND EXISTS (SELECT 1 FROM posts WHERE id = ?)
        AND EXISTS (SELECT 1 FROM members WHERE id = ?)
    `, postId, session.member_id, emoji, postId, session.member_id),
  ]);
  const [post] = await listPosts(env, postId);
  if (post) await runInBackground(ctx, runEvents(env));
  return post ?? null;
}

async function voidPost(env, session, id, ctx) {
  requireCommissioner(session);
  requireId(id, 'a post');
  const result = await statement(env, `
    UPDATE posts SET voided = 1, fraud = 1
    WHERE id = ? AND voided = 0
      AND EXISTS (SELECT 1 FROM members WHERE id = ? AND role = 'commissioner')
  `, id, session.member_id).run();
  if (result.meta.changes) await runInBackground(ctx, runEvents(env));
  else if ((await getMe(env, session))?.role !== 'commissioner') requireCommissioner({});
  return null;
}

function validatedEvent(input, now = new Date()) {
  const { type, key } = input;
  if (typeof type !== 'string' || !Object.hasOwn(EVENT_KEYS, type)) fail('Unknown event type.');
  if (typeof key !== 'string' || key.length > 100 || !new RegExp(`^${type}:${EVENT_KEYS[type]}$`).test(key)) {
    fail('Invalid event key.');
  }
  if ((type === 'scared' || type === 'roast') && !dateKeyValid(key.split(':')[1])) fail('Invalid event day.');
  const data = input.data ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) fail('Invalid event details.');
  const json = JSON.stringify(data);
  if (new TextEncoder().encode(json).length > MAX_EVENT_BYTES) fail('Event details are too large.');
  const at = input.at == null ? +now : Date.parse(input.at);
  if (!Number.isFinite(at) || at > +now + 5 * 60_000) fail('Invalid event time.');
  return { id: `e_${crypto.randomUUID()}`, type, key, at: new Date(at).toISOString(), json };
}

function eventInsert(env, event, timezone) {
  const cooldownStart = Logic.jokeCooldownStart(event.at, timezone).toISOString();
  // Check history inside the insert so simultaneous triggers share one cooldown.
  // The Hoat stamp and the daily roast have no cooldown: their keys already make them one per week / day.
  return statement(env, `
    INSERT INTO events (id, type, key, at, data)
    SELECT ?, ?, ?, ?, ?
    WHERE ? IN ('hoat', 'roast') OR NOT EXISTS (
      SELECT 1 FROM events WHERE type = ? AND at >= ?
    )
    ON CONFLICT (key) DO NOTHING
  `, event.id, event.type, event.key, event.at, event.json, event.type, event.type, cooldownStart);
}

async function listEvents(env, session) {
  const { results } = await statement(env, `
    SELECT events.*, event_seen.user_id IS NOT NULL AS seen
    FROM events LEFT JOIN event_seen ON event_seen.event_id = events.id AND event_seen.user_id = ?
    ORDER BY events.at, events.id
  `, session.id).all();
  return results.map(eventShape);
}

async function recordEvent(env, input) {
  const claimed = validatedEvent(input);
  const existing = await statement(env, 'SELECT * FROM events WHERE key = ?', claimed.key).first();
  if (existing) return eventShape(existing);

  const now = new Date();
  const { events, timezone } = await findEvents(env, now);
  const found = events.find(event => event.key === claimed.key);
  if (!found) return null;
  const event = validatedEvent(found, now);
  const [, saved] = await env.DB.batch([
    eventInsert(env, event, timezone),
    statement(env, 'SELECT * FROM events WHERE key = ?', event.key),
  ]);
  return saved.results.length ? eventShape(saved.results[0]) : null;
}

async function markSeen(env, session, id) {
  requireId(id, 'an event');
  await statement(env, `
    INSERT INTO event_seen (user_id, event_id)
    SELECT ?, ? WHERE EXISTS (SELECT 1 FROM events WHERE id = ?)
    ON CONFLICT (user_id, event_id) DO NOTHING
  `, session.id, id, id).run();
  return null;
}

async function findEvents(env, now) {
  const [groupRows, memberRows, injuryRows, roastRows, ...postRows] = await env.DB.batch([
    statement(env, 'SELECT * FROM group_settings WHERE id = 1'),
    statement(env, 'SELECT * FROM members'),
    statement(env, `SELECT member_id FROM injury_reports
      WHERE member_id IS NOT NULL AND started_at <= ? AND resolved_at IS NULL`, now.toISOString()),
    statement(env, "SELECT key, data FROM events WHERE type = 'roast' ORDER BY key"),
    ...postQueries(env),
  ]);
  if (!groupRows.results.length) return { events: [] };
  const group = groupShape(groupRows.results[0]);
  const members = memberRows.results.map(memberShape);
  const posts = assembledPosts(postRows);
  const cfg = { ...CONFIG, ...group };
  const calc = Logic.compute(members, posts, cfg, now);
  const guarantee = HOAT.feed !== false ? { username: HOAT.username, min: group.weeklyMin } : null;
  const events = Logic.jokes(members, calc, INSIDE_JOKES, now, group.timezone, guarantee);
  let roast = null;
  try { roast = roastOfTheDay(members, posts, cfg, now, injuryRows.results, roastRows.results); }
  catch { console.warn('Winter Arc couldn’t pick the roast of the day.'); }   // never let it block the inside jokes
  if (roast) events.push(roast);
  return { events, timezone: group.timezone };
}

/* Roast of the Day (js/jokes.js): picked once per day in the group's time zone, from the points as
   they stood at midnight, and saved so everyone sees the same one. Saved roasts are the history
   that keeps them from repeating. Members on an open injury report are left out. */
function roastOfTheDay(members, posts, cfg, now, injuries, saved) {
  const day = Logic.dayKey(now, cfg.timezone);
  if (saved.some(row => row.key === `roast:${day}`)) return null;
  const history = [];
  for (const row of saved) {
    try { history.push({ ...JSON.parse(row.data), day: row.key.slice('roast:'.length) }); } catch { /* skip a bad row */ }
  }
  const excluded = new Set(injuries.map(row => row.member_id));
  const roast = Jokes.today(members, posts, cfg, now, history, excluded);
  if (!roast || roast.day !== day) return null;
  const { joke, key, who, text, bold, n, rerun } = roast;
  return { type: 'roast', key: `roast:${day}`, at: now.toISOString(), data: { joke, key, who, text, bold, n, ...(rerun ? { rerun } : {}) } };
}

export async function runEvents(env, now = new Date()) {
  const { events, timezone } = await findEvents(env, now);
  if (events.length) await env.DB.batch(events.map(input => eventInsert(env, validatedEvent(input, now), timezone)));
}

export async function sweepPhotos(env) {
  const { results } = await statement(env, `
    SELECT key FROM uploads WHERE (discarded_at IS NOT NULL OR created_at < datetime('now', '-1 day'))
      AND NOT EXISTS (SELECT 1 FROM posts WHERE posts.photo_key = uploads.key)
      AND NOT EXISTS (SELECT 1 FROM members WHERE members.photo_key = uploads.key)
    LIMIT 100
  `).all();
  for (const { key } of results) await deleteUnusedPhoto(env, key);
}

export async function handleData(action, request, env, payload, session, ctx) {
  if (!session) fail('Sign in first.', 401);
  if (session.must_change_password) fail('Pick your own password first.', 403);
  let data;
  switch (action) {
    case 'getMe': data = await getMe(env, session); break;
    case 'getGroup': data = await getGroup(env); break;
    case 'getRevision': data = await statement(env, 'SELECT revision FROM group_settings WHERE id = 1').first('revision'); break;
    case 'listMembers': data = await listMembers(env); break;
    case 'listPosts':
      data = await listPosts(env);
      // Keep older app tabs working until they refresh and load the new activity catalog.
      if (!payload?.includeBike) data = data.filter(post => post.cat !== 'bike');
      break;
    case 'listSocial': data = await listSocial(env, new Date(), session.member_id); break;
    case 'addTextPost': data = await addTextPost(env, session, payload); break;
    case 'addFeedComment': data = await addFeedComment(env, session, payload); break;
    case 'setCommentHeart': data = await setCommentHeart(env, session, payload); break;
    case 'createInjuryReport': data = await createInjuryReport(env, session, payload); break;
    case 'resolveInjuryReport': data = await resolveInjuryReport(env, session, payload); break;
    case 'getPrefs': data = await getPrefs(env, session); break;
    case 'updatePrefs': data = await updatePrefs(env, session, payload); break;
    case 'updateProfile': data = await updateProfile(env, session, payload, ctx); break;
    case 'updateGroup': data = await updateGroup(env, session, payload, ctx); break;
    case 'uploadPhoto': data = photoUrl(await uploadPhoto(env, session, payload.dataUrl)); break;
    case 'addPost': data = await addPost(env, session, payload, ctx); break;
    case 'editPost': data = await editPost(env, session, payload, ctx); break;
    case 'deletePost': data = await deletePost(env, session, payload.id, ctx); break;
    case 'toggleReaction': data = await toggleReaction(env, session, payload, ctx); break;
    case 'voidPost': data = await voidPost(env, session, payload.id, ctx); break;
    case 'listEvents': data = await listEvents(env, session); break;
    case 'recordEvent': data = await recordEvent(env, payload); break;
    case 'markSeen': data = await markSeen(env, session, payload.id); break;
    default: return undefined;
  }
  return { data };
}
