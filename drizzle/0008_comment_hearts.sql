CREATE TABLE feed_comment_hearts (
  comment_id TEXT NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, member_id)
);
--> statement-breakpoint
CREATE INDEX feed_comment_hearts_member ON feed_comment_hearts(member_id);
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
