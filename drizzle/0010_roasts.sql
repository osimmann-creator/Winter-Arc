-- Roast of the Day: one saved roast per day (js/jokes.js picks it, server/data.mjs saves it).
CREATE TABLE IF NOT EXISTS roasts (
  day TEXT PRIMARY KEY CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data) AND length(data) <= 2048)
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS revision_roast_insert AFTER INSERT ON roasts
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
