ALTER TABLE posts ADD COLUMN pace_seconds INTEGER CHECK (pace_seconds IS NULL OR pace_seconds > 0);
--> statement-breakpoint
CREATE TABLE injury_reports (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  weeks_out INTEGER NOT NULL CHECK (weeks_out BETWEEN 1 AND 26),
  closing_note TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE feed_messages (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'injury')),
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  CHECK ((kind = 'text' AND member_id IS NOT NULL) OR (kind = 'injury' AND title IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX feed_messages_member_time ON feed_messages(member_id, at);
--> statement-breakpoint
CREATE TABLE feed_comments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  CHECK ((activity_id IS NOT NULL) + (message_id IS NOT NULL) + (event_id IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE INDEX feed_comments_activity ON feed_comments(activity_id);
--> statement-breakpoint
CREATE INDEX feed_comments_message ON feed_comments(message_id);
--> statement-breakpoint
CREATE INDEX feed_comments_event ON feed_comments(event_id);
--> statement-breakpoint
CREATE TRIGGER revision_feed_message_insert AFTER INSERT ON feed_messages
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_comment_insert AFTER INSERT ON feed_comments
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
