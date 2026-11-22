CREATE TABLE archived_joke_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type <> 'hoat'),
  key TEXT NOT NULL,
  at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at TEXT NOT NULL,
  seen_user_ids TEXT NOT NULL CHECK (json_valid(seen_user_ids) AND json_type(seen_user_ids) = 'array'),
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
