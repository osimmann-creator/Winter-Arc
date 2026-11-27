function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function pollInput({ question, choices }) {
  const prompt = typeof question === 'string' ? question.trim() : '';
  if (!prompt || prompt.length > 240) fail('Enter a question of 1–240 characters.');
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) fail('Enter two to four choices.');
  const labels = choices.map(choice => typeof choice === 'string' ? choice.trim() : '');
  if (labels.some(label => !label || label.length > 80)) fail('Each choice needs 1–80 characters.');
  if (new Set(labels.map(label => label.toLowerCase())).size !== labels.length) fail('Each choice must be different.');
  return { prompt, labels };
}

export async function listPolls(env, viewerId) {
  const [polls, totals, own] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM feed_polls ORDER BY at DESC, id DESC'),
    env.DB.prepare('SELECT poll_id, choice, count(*) AS votes FROM feed_poll_votes GROUP BY poll_id, choice'),
    env.DB.prepare('SELECT poll_id, choice FROM feed_poll_votes WHERE member_id = ?').bind(viewerId),
  ]);
  const choices = new Map();
  for (const row of totals.results) {
    if (!choices.has(row.poll_id)) choices.set(row.poll_id, []);
    choices.get(row.poll_id)[row.choice] = row.votes;
  }
  const myVotes = new Map(own.results.map(row => [row.poll_id, row.choice]));
  return polls.results.map(row => ({
    id: row.id, kind: 'poll', memberId: row.member_id, at: row.at, question: row.question,
    choices: JSON.parse(row.choices).map((label, index) => ({ label, votes: choices.get(row.id)?.[index] ?? 0 })),
    myChoice: myVotes.get(row.id) ?? null,
  }));
}

export async function createPoll(env, session, input) {
  const { prompt, labels } = pollInput(input);
  const row = await env.DB.prepare(`
    INSERT INTO feed_polls (id, member_id, question, choices, at)
    SELECT ?, id, ?, ?, ? FROM members WHERE id = ? AND role = 'commissioner'
    RETURNING id
  `).bind(`poll_${crypto.randomUUID()}`, prompt, JSON.stringify(labels), new Date().toISOString(), session.member_id).first();
  if (!row) fail('Only the commissioner can post polls.', 403);
  return row;
}

export async function votePoll(env, session, { id, choice }) {
  if (typeof id !== 'string' || !Number.isInteger(choice) || choice < 0 || choice > 3) fail('Choose one option.');
  const row = await env.DB.prepare(`
    INSERT INTO feed_poll_votes (poll_id, member_id, choice)
    SELECT p.id, m.id, ? FROM feed_polls p JOIN members m ON m.id = ?
    WHERE p.id = ? AND ? < json_array_length(p.choices)
    ON CONFLICT (poll_id, member_id) DO UPDATE SET choice = excluded.choice
    RETURNING choice
  `).bind(choice, session.member_id, id, choice).first();
  if (!row) fail('That poll option is unavailable.', 404);
  return row;
}
