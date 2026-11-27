CREATE TABLE feed_polls (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  choices TEXT NOT NULL CHECK (json_valid(choices) AND json_type(choices) = 'array' AND json_array_length(choices) BETWEEN 2 AND 4),
  at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE feed_poll_votes (
  poll_id TEXT NOT NULL REFERENCES feed_polls(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  choice INTEGER NOT NULL CHECK (choice BETWEEN 0 AND 3),
  PRIMARY KEY (poll_id, member_id)
);
--> statement-breakpoint
CREATE TRIGGER revision_poll_insert AFTER INSERT ON feed_polls
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_poll_vote_insert AFTER INSERT ON feed_poll_votes
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_poll_vote_update AFTER UPDATE OF choice ON feed_poll_votes
WHEN OLD.choice <> NEW.choice
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_poll_vote_delete AFTER DELETE ON feed_poll_votes
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
