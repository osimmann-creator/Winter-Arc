-- Rebuild the event type constraint while preserving seen states and comments.
CREATE TABLE events_timesheet (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'coin', 'bluehair', 'iron', 'liquor', 'bag', 'fight', 'crashout', 'satellite',
    'puke', 'mma', 'radiator', 'mom', 'nets', 'phil', 'scared', 'timesheet', 'hoat'
  )),
  key TEXT NOT NULL UNIQUE,
  at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO events_timesheet (id, type, key, at, data, created_at)
SELECT id, type, key, at, data, created_at FROM events;
--> statement-breakpoint
CREATE TABLE event_seen_timesheet (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events_timesheet(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_id)
);
--> statement-breakpoint
INSERT INTO event_seen_timesheet (user_id, event_id)
SELECT user_id, event_id FROM event_seen;
--> statement-breakpoint
CREATE TABLE feed_comments_timesheet (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events_timesheet(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  CHECK ((activity_id IS NOT NULL) + (message_id IS NOT NULL) + (event_id IS NOT NULL) = 1)
);
--> statement-breakpoint
INSERT INTO feed_comments_timesheet (id, member_id, activity_id, message_id, event_id, body, at)
SELECT id, member_id, activity_id, message_id, event_id, body, at FROM feed_comments;
--> statement-breakpoint
DROP TABLE feed_comments;
--> statement-breakpoint
DROP TABLE event_seen;
--> statement-breakpoint
DROP TABLE events;
--> statement-breakpoint
ALTER TABLE events_timesheet RENAME TO events;
--> statement-breakpoint
ALTER TABLE event_seen_timesheet RENAME TO event_seen;
--> statement-breakpoint
ALTER TABLE feed_comments_timesheet RENAME TO feed_comments;
--> statement-breakpoint
CREATE INDEX events_at ON events(at);
--> statement-breakpoint
CREATE INDEX event_seen_event ON event_seen(event_id);
--> statement-breakpoint
CREATE INDEX feed_comments_activity ON feed_comments(activity_id);
--> statement-breakpoint
CREATE INDEX feed_comments_message ON feed_comments(message_id);
--> statement-breakpoint
CREATE INDEX feed_comments_event ON feed_comments(event_id);
--> statement-breakpoint
CREATE TRIGGER revision_event_insert AFTER INSERT ON events
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_comment_insert AFTER INSERT ON feed_comments
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
