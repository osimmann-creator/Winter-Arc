-- SQLite cannot alter the activity CHECK in place. Copy the activity and its
-- dependent tables together so dropping the old table cannot cascade to live data.
CREATE TABLE posts_bike (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cat TEXT NOT NULL CHECK (cat IN ('gym', 'run', 'bike', 'mma', 'jickle', 'volo', 'soccer', 'date', 'beers', 'reading')),
  at TEXT NOT NULL,
  minutes REAL,
  miles REAL,
  caption TEXT,
  photo_key TEXT,
  voided INTEGER NOT NULL DEFAULT 0 CHECK (voided IN (0, 1)),
  fraud INTEGER NOT NULL DEFAULT 0 CHECK (fraud IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edit_version TEXT,
  pace_seconds INTEGER CHECK (pace_seconds IS NULL OR pace_seconds > 0),
  CHECK (cat <> 'bike' OR (typeof(miles) = 'real' AND miles > 0))
);
--> statement-breakpoint
INSERT INTO posts_bike (id, member_id, cat, at, minutes, miles, caption, photo_key, voided, fraud, created_at, edit_version, pace_seconds)
SELECT id, member_id, cat, at, minutes, miles, caption, photo_key, voided, fraud, created_at, edit_version, pace_seconds FROM posts;
--> statement-breakpoint
CREATE TABLE witnesses_bike (
  post_id TEXT NOT NULL REFERENCES posts_bike(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, member_id)
);
--> statement-breakpoint
INSERT INTO witnesses_bike (post_id, member_id)
SELECT post_id, member_id FROM witnesses;
--> statement-breakpoint
CREATE TABLE reactions_bike (
  post_id TEXT NOT NULL REFERENCES posts_bike(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '👏', '😂', '🧢')),
  PRIMARY KEY (post_id, member_id, emoji)
);
--> statement-breakpoint
INSERT INTO reactions_bike (post_id, member_id, emoji)
SELECT post_id, member_id, emoji FROM reactions;
--> statement-breakpoint
CREATE TABLE feed_comments_bike (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES posts_bike(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  CHECK ((activity_id IS NOT NULL) + (message_id IS NOT NULL) + (event_id IS NOT NULL) = 1)
);
--> statement-breakpoint
INSERT INTO feed_comments_bike (id, member_id, activity_id, message_id, event_id, body, at)
SELECT id, member_id, activity_id, message_id, event_id, body, at FROM feed_comments;
--> statement-breakpoint
DROP TABLE feed_comments;
--> statement-breakpoint
DROP TABLE reactions;
--> statement-breakpoint
DROP TABLE witnesses;
--> statement-breakpoint
DROP TABLE posts;
--> statement-breakpoint
ALTER TABLE posts_bike RENAME TO posts;
--> statement-breakpoint
ALTER TABLE witnesses_bike RENAME TO witnesses;
--> statement-breakpoint
ALTER TABLE reactions_bike RENAME TO reactions;
--> statement-breakpoint
ALTER TABLE feed_comments_bike RENAME TO feed_comments;
--> statement-breakpoint
CREATE INDEX posts_member ON posts(member_id);
--> statement-breakpoint
CREATE INDEX posts_at ON posts(at);
--> statement-breakpoint
CREATE INDEX witnesses_member ON witnesses(member_id);
--> statement-breakpoint
CREATE INDEX reactions_member ON reactions(member_id);
--> statement-breakpoint
CREATE INDEX feed_comments_activity ON feed_comments(activity_id);
--> statement-breakpoint
CREATE INDEX feed_comments_message ON feed_comments(message_id);
--> statement-breakpoint
CREATE INDEX feed_comments_event ON feed_comments(event_id);
--> statement-breakpoint
CREATE TRIGGER revision_post_insert AFTER INSERT ON posts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_post_update AFTER UPDATE ON posts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_post_delete AFTER DELETE ON posts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_reaction_insert AFTER INSERT ON reactions
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_reaction_delete AFTER DELETE ON reactions
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_comment_insert AFTER INSERT ON feed_comments
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
