-- Round 3 inside jokes (animations/hyperframes, NEW-ANIMATIONS-3).
--
-- The events table's type CHECK gains the round 3 jokes. As in 0011, SQLite can't change a CHECK in place, so
-- the table is rebuilt the same safe way: every table that points at events (event_seen, feed_comments,
-- feed_reactions) or at feed_comments (feed_comment_hearts) is copied first, the old tables are dropped
-- leaves-first so ON DELETE CASCADE never finds a row, and the copies are renamed back (SQLite rewrites their
-- REFERENCES to the new names). Indexes and triggers are recreated as they were. Nothing is lost.
-- Built now: signal, besties, lockedout, volcano, bestof40, la4 (Retire the Number), diet, pullout, jailbreak,
-- fridge, cleared, spring, warhero. Also in the list, so they can be added later without another rebuild:
-- the round 3 clips not made yet (shoes, sleptin, refund, pressed, umbrella, wrongguy, appedition, nexttrain)
-- and recap (The Monday Report, once the app records it). Nothing records those yet.
CREATE TABLE events_r3 (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'coin', 'bluehair', 'iron', 'liquor', 'bag', 'fight', 'crashout', 'satellite',
    'puke', 'mma', 'radiator', 'mom', 'nets', 'phil', 'scared', 'timesheet', 'hoat',
    'crossing', 'mycar', 'finalcall', 'worthit', 'basement', 'nomap',
    'grandtheft', 'wanted', 'busted', 'wasted', 'parole', 'partners', 'leonida',
    'thanksgiving', 'xmas', 'nye', 'groundhog', 'valentine',
    'signal', 'besties', 'lockedout', 'volcano', 'bestof40', 'la4', 'diet', 'pullout',
    'jailbreak', 'fridge', 'cleared', 'spring', 'warhero',
    'shoes', 'sleptin', 'refund', 'pressed', 'umbrella', 'wrongguy', 'appedition', 'nexttrain', 'recap'
  )),
  key TEXT NOT NULL UNIQUE,
  at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO events_r3 (id, type, key, at, data, created_at)
SELECT id, type, key, at, data, created_at FROM events;
--> statement-breakpoint
CREATE TABLE event_seen_r3 (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events_r3(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_id)
);
--> statement-breakpoint
INSERT INTO event_seen_r3 (user_id, event_id)
SELECT user_id, event_id FROM event_seen;
--> statement-breakpoint
CREATE TABLE feed_comments_r3 (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events_r3(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  CHECK ((activity_id IS NOT NULL) + (message_id IS NOT NULL) + (event_id IS NOT NULL) = 1)
);
--> statement-breakpoint
INSERT INTO feed_comments_r3 (id, member_id, activity_id, message_id, event_id, body, at)
SELECT id, member_id, activity_id, message_id, event_id, body, at FROM feed_comments;
--> statement-breakpoint
CREATE TABLE feed_comment_hearts_r3 (
  comment_id TEXT NOT NULL REFERENCES feed_comments_r3(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, member_id)
);
--> statement-breakpoint
INSERT INTO feed_comment_hearts_r3 (comment_id, member_id)
SELECT comment_id, member_id FROM feed_comment_hearts;
--> statement-breakpoint
CREATE TABLE feed_reactions_r3 (
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events_r3(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '👏', '😂', '🧢')),
  CHECK ((message_id IS NOT NULL) + (event_id IS NOT NULL) = 1),
  UNIQUE (message_id, member_id, emoji),
  UNIQUE (event_id, member_id, emoji)
);
--> statement-breakpoint
INSERT INTO feed_reactions_r3 (message_id, event_id, member_id, emoji)
SELECT message_id, event_id, member_id, emoji FROM feed_reactions;
--> statement-breakpoint
DROP TABLE feed_comment_hearts;
--> statement-breakpoint
DROP TABLE feed_reactions;
--> statement-breakpoint
DROP TABLE event_seen;
--> statement-breakpoint
DROP TABLE feed_comments;
--> statement-breakpoint
DROP TABLE events;
--> statement-breakpoint
ALTER TABLE events_r3 RENAME TO events;
--> statement-breakpoint
ALTER TABLE event_seen_r3 RENAME TO event_seen;
--> statement-breakpoint
ALTER TABLE feed_comments_r3 RENAME TO feed_comments;
--> statement-breakpoint
ALTER TABLE feed_comment_hearts_r3 RENAME TO feed_comment_hearts;
--> statement-breakpoint
ALTER TABLE feed_reactions_r3 RENAME TO feed_reactions;
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
CREATE INDEX feed_comment_hearts_member ON feed_comment_hearts(member_id);
--> statement-breakpoint
CREATE INDEX feed_reactions_member ON feed_reactions(member_id);
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
--> statement-breakpoint
CREATE TRIGGER revision_feed_comment_heart_insert AFTER INSERT ON feed_comment_hearts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_comment_heart_delete AFTER DELETE ON feed_comment_hearts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_reaction_insert AFTER INSERT ON feed_reactions
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_feed_reaction_delete AFTER DELETE ON feed_reactions
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
