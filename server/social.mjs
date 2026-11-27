import { Logic } from './shared.mjs';
import { listPolls } from './polls.mjs';

const targets = {
  activity: { table: 'posts', column: 'activity_id' },
  message: { table: 'feed_messages', column: 'message_id' },
  event: { table: 'events', column: 'event_id' },
};

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function text(value, max, label, optional = false) {
  const clean = typeof value === 'string' ? value.trim() : '';
  if ((!clean && !optional) || clean.length > max) fail(`${label} must be ${optional ? 'at most' : 'between 1 and'} ${max} characters.`);
  return clean;
}

function messageShape(row) {
  return { id: row.id, kind: row.kind, memberId: row.member_id, title: row.title, body: row.body, at: row.at };
}

const commentHeartColumns = `
  (SELECT count(*) FROM feed_comment_hearts WHERE comment_id = c.id) AS heart_count,
  EXISTS (SELECT 1 FROM feed_comment_hearts WHERE comment_id = c.id AND member_id = ?) AS hearted
`;
const heartState = row => ({ heartCount: row.heart_count, hearted: Boolean(row.hearted) });

async function publishInjuryReports(env, timezone, now = new Date()) {
  const [reports, posted] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM injury_reports'),
    env.DB.prepare("SELECT id FROM feed_messages WHERE kind = 'injury'"),
  ]);
  const existing = new Set(posted.results.map(row => row.id));
  const pending = [];
  for (const report of reports.results) {
    const day = Logic.parseDay(Logic.dayKey(report.started_at, timezone), timezone);
    const estimate = `${report.weeks_out} ${report.weeks_out === 1 ? 'week' : 'weeks'}`;
    for (let week = 0; week <= report.weeks_out; week++) {
      const at = week === 0 ? new Date(report.started_at) : Logic.addDays(day, week * 7, timezone);
      if (at > now) break;
      const id = `${report.id}_${week}`;
      if (existing.has(id)) continue;
      const final = week === report.weeks_out;
      const recovered = report.resolved_at && Date.parse(report.resolved_at) <= +at;
      if (week > 0 && !final && recovered) continue;
      const title = `Injury Report · ${report.name}`;
      const body = week === 0 ? `OUT · Estimated ${estimate}\n\n${report.summary}`
        : final ? `STATUS UPDATE · End of the ${estimate} estimate\n\n${recovered ? 'Return to play confirmed.' : 'Return to play is awaiting confirmation.'}${report.closing_note ? '\n\n' + report.closing_note : ''}`
        : `OUT · Recovery update ${week} of ${report.weeks_out - 1}\n\nInitial report: ${report.summary}\n\nThe original estimate was ${estimate} out. Return status is awaiting an update.`;
      pending.push(env.DB.prepare(`
        INSERT INTO feed_messages (id, kind, title, body, at)
        VALUES (?, 'injury', ?, ?, ?) ON CONFLICT (id) DO NOTHING
      `).bind(id, title, body, at.toISOString()));
    }
  }
  for (let i = 0; i < pending.length; i += 50) await env.DB.batch(pending.slice(i, i + 50));
}

export function injuryReportQuery(env, now) {
  return env.DB.prepare(`SELECT id, member_id, name, started_at, resolved_at FROM injury_reports
    WHERE member_id IS NOT NULL AND started_at <= ? ORDER BY name, id`).bind(now.toISOString());
}

export const injuryPeriods = rows => rows.map(row => ({
  memberId: row.member_id, startedAt: row.started_at, resolvedAt: row.resolved_at,
}));

export async function listSocial(env, now = new Date(), viewerId = null) {
  const group = await env.DB.prepare('SELECT timezone FROM group_settings WHERE id = 1').first();
  if (!group) return { messages: [], comments: [], activeInjuries: [], feedReactions: {} };
  await publishInjuryReports(env, group.timezone, now);
  const [[messages, comments, injuries, reactions], polls] = await Promise.all([env.DB.batch([
    env.DB.prepare('SELECT * FROM feed_messages ORDER BY at DESC, id DESC'),
    env.DB.prepare(`SELECT c.*, ${commentHeartColumns} FROM feed_comments AS c ORDER BY c.at, c.id`).bind(viewerId),
    injuryReportQuery(env, now),
    env.DB.prepare('SELECT message_id, event_id, member_id, emoji FROM feed_reactions ORDER BY member_id'),
  ]), listPolls(env, viewerId)]);
  const feedReactions = {};
  for (const row of reactions.results) {
    const key = row.message_id ? `message:${row.message_id}` : `event:${row.event_id}`;
    const byEmoji = feedReactions[key] ??= {};
    (byEmoji[row.emoji] ??= []).push(row.member_id);
  }
  return {
    messages: messages.results.map(messageShape),
    polls,
    feedReactions,
    activeInjuries: injuries.results.filter(row => !row.resolved_at).map(row => ({ id: row.id, memberId: row.member_id, name: row.name })),
    injuryPeriods: injuryPeriods(injuries.results),
    comments: comments.results.map(row => ({
      id: row.id, memberId: row.member_id, at: row.at, body: row.body,
      kind: row.activity_id ? 'activity' : row.message_id ? 'message' : 'event',
      target: row.activity_id || row.message_id || row.event_id,
      ...heartState(row),
    })),
  };
}

export async function addTextPost(env, session, input, now = new Date()) {
  const body = text(input.body, 600, 'Post');
  const timezone = await env.DB.prepare('SELECT timezone FROM group_settings WHERE id = 1').first('timezone');
  if (!timezone) fail('Winter Arc is still being set up.', 503);
  const start = Logic.parseDay(Logic.dayKey(now, timezone), timezone);
  const end = Logic.addDays(start, 1, timezone);
  const row = await env.DB.prepare(`
    INSERT INTO feed_messages (id, kind, member_id, body, at)
    SELECT ?, 'text', ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM members WHERE id = ?)
      AND EXISTS (SELECT 1 FROM group_settings WHERE id = 1 AND timezone = ?)
      AND NOT EXISTS (
        SELECT 1 FROM feed_messages WHERE kind = 'text' AND member_id = ? AND at >= ? AND at < ?
      )
    RETURNING *
  `).bind(`text_${crypto.randomUUID()}`, session.member_id, body, now.toISOString(), session.member_id,
    timezone, session.member_id, start.toISOString(), end.toISOString()).first();
  if (!row) fail('You can post one text update per day.', 409);
  return messageShape(row);
}

export async function addFeedComment(env, session, input) {
  const body = text(input.body, 300, 'Comment');
  if (!Object.hasOwn(targets, input.kind) || typeof input.target !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(input.target)) {
    fail('Choose a feed post.');
  }
  const { table, column } = targets[input.kind];
  const row = await env.DB.prepare(`
    INSERT INTO feed_comments (id, member_id, ${column}, body, at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
      AND EXISTS (SELECT 1 FROM members WHERE id = ?)
    RETURNING id
  `).bind(`c_${crypto.randomUUID()}`, session.member_id, input.target, body, new Date().toISOString(), input.target, session.member_id).first();
  if (!row) fail('That feed post is no longer available.', 404);
  return row;
}

export async function setCommentHeart(env, session, input) {
  const { commentId, hearted } = input;
  if (typeof commentId !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(commentId) || typeof hearted !== 'boolean') {
    fail('Choose a comment reaction.');
  }
  const memberId = session.member_id;
  const change = hearted
    ? env.DB.prepare(`
        INSERT INTO feed_comment_hearts (comment_id, member_id)
        SELECT ?, ? WHERE EXISTS (SELECT 1 FROM feed_comments WHERE id = ?)
          AND EXISTS (SELECT 1 FROM members WHERE id = ?)
        ON CONFLICT (comment_id, member_id) DO NOTHING
      `).bind(commentId, memberId, commentId, memberId)
    : env.DB.prepare('DELETE FROM feed_comment_hearts WHERE comment_id = ? AND member_id = ?').bind(commentId, memberId);
  const [, saved] = await env.DB.batch([
    change,
    env.DB.prepare(`SELECT ${commentHeartColumns} FROM feed_comments AS c WHERE c.id = ?`).bind(memberId, commentId),
  ]);
  if (!saved.results.length) fail('That comment is no longer available.', 404);
  return heartState(saved.results[0]);
}

export async function setFeedReaction(env, session, input) {
  const { kind, target, emoji, active } = input;
  if ((kind !== 'message' && kind !== 'event') || typeof target !== 'string'
      || !/^[a-z0-9_-]{1,100}$/i.test(target) || typeof active !== 'boolean') fail('Choose a post reaction.');

  const { table, column } = targets[kind], memberId = session.member_id;
  const change = active
    ? env.DB.prepare(`
        INSERT INTO feed_reactions (${column}, member_id, emoji)
        SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
          AND EXISTS (SELECT 1 FROM members WHERE id = ?)
        ON CONFLICT (${column}, member_id, emoji) DO NOTHING
      `).bind(target, memberId, emoji, target, memberId)
    : env.DB.prepare(`DELETE FROM feed_reactions WHERE ${column} = ? AND member_id = ? AND emoji = ?`)
      .bind(target, memberId, emoji);
  const [, saved] = await env.DB.batch([
    change,
    env.DB.prepare(`SELECT r.member_id FROM ${table} AS t
      LEFT JOIN feed_reactions AS r ON r.${column} = t.id AND r.emoji = ?
      WHERE t.id = ? ORDER BY r.member_id`).bind(emoji, target),
  ]);
  if (!saved.results.length) fail('That feed post is no longer available.', 404);
  return saved.results.map(row => row.member_id).filter(Boolean);
}

export async function createInjuryReport(env, session, input, now = new Date()) {
  if (session.role !== 'commissioner') fail('Only the commissioner can file an injury report.', 403);
  const summary = text(input.summary, 600, 'Report');
  const closingNote = text(input.closingNote, 280, 'Closing note', true);
  const weeksOut = Number(input.weeksOut);
  if (!Number.isInteger(weeksOut) || weeksOut < 1 || weeksOut > 26) fail('Enter an estimate from 1 to 26 weeks.');
  const id = `injury_${crypto.randomUUID()}`;
  const row = await env.DB.prepare(`
    INSERT INTO injury_reports (id, member_id, name, summary, weeks_out, closing_note, started_at)
    SELECT ?, id, name, ?, ?, ?, ? FROM members
    WHERE id = ? AND EXISTS (SELECT 1 FROM members WHERE id = ? AND role = 'commissioner')
    RETURNING id
  `).bind(id, summary, weeksOut, closingNote, now.toISOString(), typeof input.memberId === 'string' ? input.memberId : '', session.member_id).first();
  if (!row) fail('Choose a group member for the report.');
  const timezone = await env.DB.prepare('SELECT timezone FROM group_settings WHERE id = 1').first('timezone');
  await publishInjuryReports(env, timezone, now);
  return { id };
}

export async function resolveInjuryReport(env, session, input) {
  if (session.role !== 'commissioner') fail('Only the commissioner can close an injury report.', 403);
  if (typeof input.id !== 'string' || !/^injury_[a-z0-9_-]{1,80}$/i.test(input.id)) fail('Choose an injury report.');
  const row = await env.DB.prepare(`
    UPDATE injury_reports SET resolved_at = ?
    WHERE id = ? AND resolved_at IS NULL
      AND EXISTS (SELECT 1 FROM members WHERE id = ? AND role = 'commissioner')
    RETURNING id
  `).bind(new Date().toISOString(), input.id, session.member_id).first();
  if (!row) fail('That injury report is no longer open.', 409);
  return row;
}
