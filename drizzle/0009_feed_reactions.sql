CREATE TABLE feed_reactions (
  message_id TEXT REFERENCES feed_messages(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '👏', '😂', '🧢')),
  CHECK ((message_id IS NOT NULL) + (event_id IS NOT NULL) = 1),
  UNIQUE (message_id, member_id, emoji),
  UNIQUE (event_id, member_id, emoji)
);
--> statement-breakpoint
CREATE INDEX feed_reactions_member ON feed_reactions(member_id);
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
