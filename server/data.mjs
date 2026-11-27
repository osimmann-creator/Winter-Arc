import { CATS, CONFIG, HOAT, INSIDE_JOKES, Jokes, Logic } from './shared.mjs';
import { createPoll, votePoll } from './polls.mjs';
import { addFeedComment, addTextPost, createInjuryReport, injuryPeriods, injuryReportQuery, listSocial, resolveInjuryReport, setCommentHeart, setFeedReaction } from './social.mjs';

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
const YEAR = '20[0-9]{2}';
const EVENT_KEYS = {
  coin: `${WEEK}:${POINTS}`, bluehair: WEEK, iron: WEEK, liquor: WEEK,
  bag: `${WEEK}:${POINTS}`, fight: `${WEEK}(?::${POINTS})?`,
  crashout: POST_ID, satellite: POST_ID, puke: `${WEEK}:${COUNT}`, mma: WEEK,
  radiator: POST_ID, mom: WEEK, nets: WEEK, phil: POST_ID,
  scared: `[0-9]{4}-[0-9]{2}-[0-9]{2}:${COUNT}`, timesheet: WEEK, hoat: WEEK,
  roast: '[0-9]{4}-[0-9]{2}-[0-9]{2}',
  // round 2 (animations/hyperframes)
  crossing: WEEK, mycar: WEEK, finalcall: WEEK, worthit: WEEK, basement: POST_ID, nomap: `${POST_ID}:${POST_ID}`,
  grandtheft: WEEK, wanted: POST_ID, busted: POST_ID, wasted: POST_ID, parole: POST_ID,
  partners: `${WEEK}:${POST_ID}:${POST_ID}`,
  thanksgiving: YEAR, xmas: YEAR, nye: YEAR, groundhog: YEAR, valentine: YEAR,
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

const extraPhotoKeys = row => JSON.parse(row.extra_photo_keys || '[]');
const postPhotoKeys = row => [row.photo_key, ...extraPhotoKeys(row)].filter(Boolean);
const hasPhotoKey = key => `(posts.photo_key = ${key} OR EXISTS (
  SELECT 1 FROM json_each(posts.extra_photo_keys) WHERE value = ${key}
))`;

function postShape(row) {
  return {
    id: row.id, memberId: row.member_id, cat: row.cat, at: row.at,
    minutes: row.minutes ?? undefined, miles: row.miles ?? undefined,
    paceSeconds: row.pace_seconds ?? undefined,
    caption: row.caption ?? undefined, photo: photoUrl(row.photo_key),
    photos: postPhotoKeys(row).map(photoUrl),
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
      AND NOT EXISTS (SELECT 1 FROM posts WHERE ${hasPhotoKey('uploads.key')})
      AND NOT EXISTS (SELECT 1 FROM members WHERE photo_key = ?)
    RETURNING key
  `, key, key).first();
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
      EXISTS (SELECT 1 FROM posts WHERE ${hasPhotoKey('uploads.key')})
      OR EXISTS (SELECT 1 FROM members WHERE photo_key = ?)
    )
  `, key, key).first();
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

function postFields(input, session, before) {
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
  // Older clients still submit a single cover photo. Keep the additional photos on those edits.
  const photos = Object.hasOwn(input, 'photos') ? input.photos : [
    ...(input.photo ? [input.photo] : []), ...(before ? extraPhotoKeys(before).map(photoUrl) : []),
  ];
  if (!Array.isArray(photos) || photos.length > CONFIG.maxPostPhotos) fail(`Choose up to ${CONFIG.maxPostPhotos} photos.`);
  if (photos.some(photo => typeof photo !== 'string' || !photo.startsWith('/') || !PHOTO_KEY.test(photo.slice(1)))) {
    fail('Upload each proof photo first.');
  }
  const keys = [...new Set(photos.map(photo => photo.slice(1)))];
  if (!keys.length && !witnesses.length) fail('Add a photo or tag a witness. No proof means no points.');
  return { cat, minutes, miles, paceSeconds, caption, witnessIds, keys };
}

const WEEKLY_POSTS = 'SELECT 1 FROM posts WHERE member_id = ? AND cat = ? AND voided = 0 AND at >= ? AND at < ? AND id <> ?';
const VALID_WITNESSES = `NOT EXISTS (
  SELECT 1 FROM json_each(?) AS witness
  WHERE NOT EXISTS (SELECT 1 FROM members WHERE id = witness.value)
)`;
const VALID_PROOF = `NOT EXISTS (
  SELECT 1 FROM json_each(?) AS proof
  WHERE NOT EXISTS (SELECT 1 FROM posts WHERE id = ? AND ${hasPhotoKey('proof.value')})
    AND (
      NOT EXISTS (SELECT 1 FROM uploads WHERE key = proof.value AND member_id = ?
        AND discarded_at IS NULL AND created_at >= datetime('now', '-1 day'))
      OR EXISTS (SELECT 1 FROM posts WHERE ${hasPhotoKey('proof.value')})
      OR EXISTS (SELECT 1 FROM members WHERE photo_key = proof.value)
    )
)`;

async function checkPostFailure(env, limit, scope, cat) {
  if (limit && await statement(env, WEEKLY_POSTS, ...scope).first()) {
    fail(`You’ve already logged ${CATS[cat].short || CATS[cat].label} that week.`, 409);
  }
  fail('Use your own uploaded photos and choose witnesses who are in the group.');
}

async function addPost(env, session, input, ctx) {
  const { id = `p_${crypto.randomUUID()}` } = input;
  requireId(id, 'a post');
  const { cat, minutes, miles, paceSeconds, caption, witnessIds, keys } = postFields(input, session);
  const now = new Date();
  const group = await getGroup(env);
  const week = currentWeek(group, now);
  if (week.status !== 'live') fail('Logging is only available during the Winter Arc.');
  const at = postTime(input.at, week.start, week.end, now, 'Pick a time in the current week.');

  const oncePerWeek = Number(Boolean(CATS[cat].oncePerWeek));
  const weeklyScope = [session.member_id, cat, week.start.toISOString(), week.end.toISOString(), id];
  const [inserted] = await env.DB.batch([
    statement(env, `
      INSERT INTO posts (id, member_id, cat, at, minutes, miles, pace_seconds, caption, photo_key, extra_photo_keys, voided, fraud)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0
      WHERE EXISTS (SELECT 1 FROM members WHERE id = ?)
        AND EXISTS (SELECT 1 FROM group_settings WHERE season_start = ? AND season_weeks = ? AND timezone = ?)
        AND (? = 0 OR NOT EXISTS (${WEEKLY_POSTS}))
        AND ${VALID_WITNESSES}
        AND ${VALID_PROOF}
      ON CONFLICT (id) DO NOTHING
    `, id, session.member_id, cat, at, minutes, miles, paceSeconds, caption, keys[0] ?? null, JSON.stringify(keys.slice(1)),
    session.member_id, group.seasonStart, group.seasonWeeks, group.timezone, oncePerWeek, ...weeklyScope,
    witnessIds, JSON.stringify(keys), null, session.member_id),
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

  const { cat, minutes, miles, paceSeconds, caption, witnessIds, keys } = postFields(input, session, before);
  const { timezone } = await getGroup(env);
  const start = Logic.mondayOf(before.at, timezone), end = Logic.addDays(start, 7, timezone);
  const at = postTime(input.at, start, end, new Date(), 'Pick a date in the original game week.');
  const oncePerWeek = Number(Boolean(CATS[cat].oncePerWeek && cat !== before.cat));
  const scope = [session.member_id, cat, start.toISOString(), end.toISOString(), id];
  const nextVersion = crypto.randomUUID();
  const savedEdit = 'EXISTS (SELECT 1 FROM posts WHERE id = ? AND edit_version = ?)';
  const [updated] = await env.DB.batch([
    statement(env, `
      UPDATE posts SET cat = ?, at = ?, minutes = ?, miles = ?, pace_seconds = ?, caption = ?, photo_key = ?, extra_photo_keys = ?, edit_version = ?
      WHERE id = ? AND member_id = ? AND edit_version IS ? AND voided = 0 AND fraud = 0
        AND EXISTS (SELECT 1 FROM group_settings WHERE id = 1 AND timezone = ?)
        AND (? = 0 OR NOT EXISTS (${WEEKLY_POSTS}))
        AND ${VALID_WITNESSES}
        AND ${VALID_PROOF}
      RETURNING id
    `, cat, at, minutes, miles, paceSeconds, caption, keys[0] ?? null, JSON.stringify(keys.slice(1)), nextVersion, id, session.member_id, editVersion, timezone,
    oncePerWeek, ...scope, witnessIds, JSON.stringify(keys), id, session.member_id),
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
  const removed = postPhotoKeys(before).filter(key => !keys.includes(key));
  await runInBackground(ctx, Promise.all(removed.map(key => deleteUnusedPhoto(env, key))));
  await runInBackground(ctx, runEvents(env));
  const [post] = await listPosts(env, id);
  return post;
}

async function deletePost(env, session, id, ctx) {
  requireId(id, 'a post');
  const row = await statement(env, 'DELETE FROM posts WHERE id = ? AND member_id = ? RETURNING photo_key, extra_photo_keys',
    id, session.member_id).first();
  if (!row) fail('Only the author can delete this post.', 403);
  await runInBackground(ctx, Promise.all(postPhotoKeys(row).map(key => deleteUnusedPhoto(env, key))));
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
  requireId(id, 'a post');
  const update = statement(env, `
    UPDATE posts SET voided = 1, fraud = CASE WHEN member_id = ? THEN 0 ELSE 1 END
    WHERE id = ? AND voided = 0
      AND EXISTS (SELECT 1 FROM members WHERE id = ? AND (id = posts.member_id OR role = 'commissioner'))
  `, session.member_id, id, session.member_id);
  const group = await getGroup(env);
  const now = new Date();
  const week = currentWeek(group, now);
  const statements = [update];
  if (week.status === 'live' && Logic.insideJokesStarted(now, group.timezone)) {
    const event = validatedEvent({
      type: 'busted', key: `busted:${id}`,
      data: { who: session.member_id, post: id, week: week.idx, selfVoided: true },
    }, now);
    statements.push(eventInsert(env, event, group.timezone, { postId: id, ownerId: session.member_id }));
  }
  const [result] = await env.DB.batch(statements);
  if (result.meta.changes) await runInBackground(ctx, runEvents(env));
  else {
    const allowed = await statement(env, `SELECT 1 FROM posts JOIN members AS actor ON actor.id = ?
      WHERE posts.id = ? AND (actor.id = posts.member_id OR actor.role = 'commissioner')`, session.member_id, id).first();
    if (!allowed) fail('You can only void your own posts.', 403);
  }
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

function eventInsert(env, event, timezone, selfVoid = null) {
  const cooldownStart = Logic.jokeCooldownStart(event.at, timezone).toISOString();
  // Check history inside the insert so simultaneous triggers share one cooldown.
  // Self-voids also require the immediately preceding batch statement to have voided the owner's post.
  const eligibility = selfVoid ? `changes() = 1 AND EXISTS (
      SELECT 1 FROM posts WHERE id = ? AND member_id = ? AND voided = 1 AND fraud = 0
    ) AND ` : '';
  return statement(env, `
    INSERT INTO events (id, type, key, at, data)
    SELECT ?, ?, ?, ?, ?
    WHERE ${eligibility}(? = 'hoat' OR NOT EXISTS (
      SELECT 1 FROM events WHERE type = ? AND at >= ?
    ))
    ON CONFLICT (key) DO NOTHING
  `, event.id, event.type, event.key, event.at, event.json,
    ...(selfVoid ? [selfVoid.postId, selfVoid.ownerId] : []), event.type, event.type, cooldownStart);
}

async function listEvents(env, session) {
  const [events, roasts] = await env.DB.batch([
    statement(env, `
      SELECT events.*, event_seen.user_id IS NOT NULL AS seen
      FROM events LEFT JOIN event_seen ON event_seen.event_id = events.id AND event_seen.user_id = ?
      ORDER BY events.at, events.id
    `, session.id),
    statement(env, 'SELECT * FROM roasts ORDER BY day'),
  ]);
  return [...events.results.map(eventShape), ...roasts.results.map(roastEvent)];
}

async function recordEvent(env, input) {
  const claimed = validatedEvent(input);
  if (claimed.type === 'roast') {   // the server picks the roast itself and ignores the phone's data; only today's
    const roast = await saveRoast(env);
    return roast && roast.key === claimed.key ? roast : null;
  }
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
  const [groupRows, memberRows, injuryRows, ...postRows] = await env.DB.batch([
    statement(env, 'SELECT * FROM group_settings WHERE id = 1'),
    statement(env, 'SELECT * FROM members'),
    injuryReportQuery(env, now),
    ...postQueries(env),
  ]);
  if (!groupRows.results.length) return { events: [] };
  const group = groupShape(groupRows.results[0]);
  const members = memberRows.results.map(memberShape);
  const posts = assembledPosts(postRows);
  const cfg = { ...CONFIG, ...group, injuryPeriods: injuryPeriods(injuryRows.results) };
  const calc = Logic.compute(members, posts, cfg, now);
  const guarantee = HOAT.feed !== false ? { username: HOAT.username, min: group.weeklyMin } : null;
  return { events: Logic.jokes(members, calc, INSIDE_JOKES, now, group.timezone, guarantee), timezone: group.timezone };
}

/* Roast of the Day (js/jokes.js): one per day in the group's timezone, picked from the points as they
   stood at midnight and saved in the roasts table, so everyone sees the same one. The saved roasts are
   the history that keeps them from repeating. Members on an open injury report are left out. The app
   sees each one as an event of type 'roast' with the key roast:YYYY-MM-DD. */
function roastEvent(row) {
  return { id: `roast:${row.day}`, type: 'roast', key: `roast:${row.day}`, at: row.at, data: JSON.parse(row.data), seen: true };
}

async function saveRoast(env, now = new Date()) {
  const group = await statement(env, 'SELECT timezone FROM group_settings WHERE id = 1').first();
  if (!group) return null;
  const day = Logic.dayKey(now, group.timezone);
  const done = await statement(env, 'SELECT * FROM roasts WHERE day = ?', day).first();
  if (done) return roastEvent(done);
  const [groupRows, memberRows, injuryRows, roastRows, ...postRows] = await env.DB.batch([
    statement(env, 'SELECT * FROM group_settings WHERE id = 1'),
    statement(env, 'SELECT * FROM members'),
    injuryReportQuery(env, now),
    statement(env, 'SELECT day, data FROM roasts WHERE day < ? ORDER BY day', day),
    ...postQueries(env),
  ]);
  const cfg = { ...CONFIG, ...groupShape(groupRows.results[0]), injuryPeriods: injuryPeriods(injuryRows.results) };
  const history = roastRows.results.map(row => ({ ...JSON.parse(row.data), day: row.day }));
  const excluded = new Set(injuryRows.results.filter(row => !row.resolved_at).map(row => row.member_id));
  const roast = Jokes.today(memberRows.results.map(memberShape), assembledPosts(postRows), cfg, now, history, excluded);
  if (!roast || roast.day !== day) return null;
  const { joke, key, who, text, bold, n, rerun } = roast;
  const data = JSON.stringify({ joke, key, who, text, bold, n, ...(rerun ? { rerun } : {}) });
  const [, saved] = await env.DB.batch([
    statement(env, 'INSERT INTO roasts (day, at, data) VALUES (?, ?, ?) ON CONFLICT (day) DO NOTHING', day, now.toISOString(), data),
    statement(env, 'SELECT * FROM roasts WHERE day = ?', day),
  ]);
  return saved.results.length ? roastEvent(saved.results[0]) : null;
}

/* Christmas: Naughty or Nice (XMAS in js/config.js). Votes are taken on Dec 24 in the group's timezone, from
   signed-in members, for anyone else in the group; each voter can change his vote until midnight. Nobody sees a
   tally before Dec 25. Before that the server only says how many have voted and who hasn't; after, it gives each
   member's nice and naughty totals and the verdicts, never who voted what. */
const XMAS_CHOICES = new Set(['nice', 'naughty']);

async function xmasState(env, now) {
  const group = await statement(env, 'SELECT timezone FROM group_settings WHERE id = 1').first();
  if (!group) return null;
  const { phase, year } = Logic.xmasPhase(now, group.timezone);
  return { phase, year, timezone: group.timezone };
}

async function xmasVotes(env, year) {
  const [memberRows, voteRows] = await env.DB.batch([
    statement(env, 'SELECT id FROM members ORDER BY created_at, id'),
    statement(env, 'SELECT voter_id, target_id, choice FROM xmas_votes WHERE year = ?', year),
  ]);
  const ids = memberRows.results.map(row => row.id), current = new Set(ids);
  const votes = voteRows.results
    .filter(row => current.has(row.voter_id) && current.has(row.target_id))
    .map(row => ({ voter: row.voter_id, target: row.target_id, choice: row.choice }));
  return { ids, votes };
}

async function getXmas(env, session, now = new Date()) {
  const state = await xmasState(env, now);
  if (!state || !state.year) return { phase: 'closed', year: null };
  const { ids, votes } = await xmasVotes(env, state.year);
  const out = {
    phase: state.phase,
    year: state.year,
    members: ids.length,
    voted: [...new Set(votes.map(vote => vote.voter))],
    mine: Object.fromEntries(votes.filter(vote => vote.voter === session.member_id).map(vote => [vote.target, vote.choice])),
  };
  if (state.phase === 'reveal') {
    out.results = Logic.xmasResults(ids, votes);
    await ensureXmasEvent(env, now, state, { ids, votes }).catch(() => {});
  }
  return out;
}

async function castXmasVote(env, session, input, now = new Date()) {
  const state = await xmasState(env, now);
  if (!state || state.phase !== 'voting') fail('Naughty or Nice voting is only open on December 24.', 403);
  const { target, choice } = input || {};
  requireId(target, 'a member');
  if (!XMAS_CHOICES.has(choice)) fail('Pick nice or naughty.');
  if (target === session.member_id) fail('You can’t vote on yourself.');
  const member = await statement(env, 'SELECT id FROM members WHERE id = ?', target).first();
  if (!member) fail('That member isn’t in the group.', 404);
  await statement(env, `
    INSERT INTO xmas_votes (year, voter_id, target_id, choice, at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (year, voter_id, target_id) DO UPDATE SET choice = excluded.choice, at = excluded.at
  `, state.year, session.member_id, target, choice, now.toISOString()).run();
  return getXmas(env, session, now);
}

/* On Dec 25 the results become the xmas event, so each person's phone plays the reveal once. */
async function ensureXmasEvent(env, now = new Date(), state, ballots) {
  state ||= await xmasState(env, now);
  if (!state || state.phase !== 'reveal' || !INSIDE_JOKES.xmas) return null;
  const key = `xmas:${state.year}`;
  if (await statement(env, 'SELECT 1 FROM events WHERE key = ?', key).first()) return null;
  const { ids, votes } = ballots || await xmasVotes(env, state.year);
  if (!votes.length) return null;   // nobody voted: nothing to reveal
  const { rows, voters } = Logic.xmasResults(ids, votes);
  const event = validatedEvent({ type: 'xmas', key, at: now.toISOString(), data: { year: state.year, voters, rows } }, now);
  return eventInsert(env, event, state.timezone).run();
}

export async function runEvents(env, now = new Date()) {
  // The roast stands alone: if it can't be picked, the inside jokes still run.
  try { await saveRoast(env, now); } catch { console.warn('Winter Arc couldn’t pick the roast of the day.'); }
  try { await ensureXmasEvent(env, now); } catch { console.warn('Winter Arc couldn’t record the Naughty or Nice results.'); }
  const { events, timezone } = await findEvents(env, now);
  if (!events.length) return;
  const rows = events.map(input => validatedEvent(input, now));
  try {
    await env.DB.batch(rows.map(event => eventInsert(env, event, timezone)));
  } catch (err) {
    // A batch is all or nothing: one row the database refuses (say a joke type whose migration hasn't been
    // applied yet) mustn't hold back the others, so record them one at a time.
    for (const event of rows) {
      try { await eventInsert(env, event, timezone).run(); } catch (e) { console.warn('Winter Arc couldn’t record', event.key, e?.message || e); }
    }
  }
}

export async function sweepPhotos(env) {
  const { results } = await statement(env, `
    SELECT key FROM uploads WHERE (discarded_at IS NOT NULL OR created_at < datetime('now', '-1 day'))
      AND NOT EXISTS (SELECT 1 FROM posts WHERE ${hasPhotoKey('uploads.key')})
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
    case 'createPoll': data = await createPoll(env, session, payload); break;
    case 'votePoll': data = await votePoll(env, session, payload); break;
    case 'addFeedComment': data = await addFeedComment(env, session, payload); break;
    case 'setCommentHeart': data = await setCommentHeart(env, session, payload); break;
    case 'setFeedReaction':
      if (!REACTIONS.has(payload.emoji)) fail('Choose one of the available reactions.');
      data = await setFeedReaction(env, session, payload);
      break;
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
    case 'getXmas': data = await getXmas(env, session); break;
    case 'castXmasVote': data = await castXmasVote(env, session, payload); break;
    default: return undefined;
  }
  return { data };
}
