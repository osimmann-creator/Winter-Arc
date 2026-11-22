CREATE TABLE group_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  season_start TEXT NOT NULL,
  season_weeks INTEGER NOT NULL CHECK (season_weeks BETWEEN 1 AND 52),
  weekly_min REAL NOT NULL CHECK (weekly_min BETWEEN 1 AND 50),
  strikes_out INTEGER NOT NULL CHECK (strikes_out BETWEEN 1 AND 10),
  timezone TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  setup_required INTEGER NOT NULL DEFAULT 0 CHECK (setup_required IN (0, 1)),
  credential_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  photo_key TEXT,
  role TEXT NOT NULL CHECK (role IN ('member', 'commissioner')),
  joined_week INTEGER NOT NULL CHECK (joined_week >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX one_commissioner ON members(role) WHERE role = 'commissioner';
--> statement-breakpoint
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX sessions_user ON sessions(user_id);
--> statement-breakpoint
CREATE INDEX sessions_expiry ON sessions(expires_at);
--> statement-breakpoint
CREATE TABLE attempts (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0)
);
--> statement-breakpoint
CREATE INDEX attempts_window ON attempts(window_start);
--> statement-breakpoint
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cat TEXT NOT NULL CHECK (cat IN ('gym', 'run', 'mma', 'jickle', 'volo', 'soccer', 'date', 'beers', 'reading')),
  at TEXT NOT NULL,
  minutes REAL,
  miles REAL,
  caption TEXT,
  photo_key TEXT,
  voided INTEGER NOT NULL DEFAULT 0 CHECK (voided IN (0, 1)),
  fraud INTEGER NOT NULL DEFAULT 0 CHECK (fraud IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX posts_member ON posts(member_id);
--> statement-breakpoint
CREATE INDEX posts_at ON posts(at);
--> statement-breakpoint
CREATE TABLE witnesses (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, member_id)
);
--> statement-breakpoint
CREATE INDEX witnesses_member ON witnesses(member_id);
--> statement-breakpoint
CREATE TABLE reactions (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '💪', '👏', '😂', '🧢')),
  PRIMARY KEY (post_id, member_id, emoji)
);
--> statement-breakpoint
CREATE INDEX reactions_member ON reactions(member_id);
--> statement-breakpoint
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'coin', 'bluehair', 'iron', 'liquor', 'bag', 'fight', 'crashout', 'satellite',
    'puke', 'mma', 'radiator', 'mom', 'nets', 'phil', 'scared', 'hoat'
  )),
  key TEXT NOT NULL UNIQUE,
  at TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX events_at ON events(at);
--> statement-breakpoint
CREATE TABLE event_seen (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_id)
);
--> statement-breakpoint
CREATE INDEX event_seen_event ON event_seen(event_id);
--> statement-breakpoint
CREATE TABLE prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sunday_reminder INTEGER NOT NULL DEFAULT 1 CHECK (sunday_reminder IN (0, 1)),
  cap_alerts INTEGER NOT NULL DEFAULT 1 CHECK (cap_alerts IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE uploads (
  key TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discarded_at TEXT
);
--> statement-breakpoint
CREATE INDEX uploads_member_created ON uploads(member_id, created_at);
--> statement-breakpoint
CREATE TABLE removed_member_photos (
  member_id TEXT PRIMARY KEY
);
--> statement-breakpoint
CREATE TRIGGER removed_member_photo_cleanup AFTER DELETE ON members
BEGIN
  INSERT OR IGNORE INTO removed_member_photos (member_id) VALUES (OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER revision_settings AFTER UPDATE OF name, season_start, season_weeks, weekly_min, strikes_out, timezone ON group_settings
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_member_insert AFTER INSERT ON members
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_member_update AFTER UPDATE ON members
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
--> statement-breakpoint
CREATE TRIGGER revision_member_delete AFTER DELETE ON members
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
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
CREATE TRIGGER revision_event_insert AFTER INSERT ON events
BEGIN
  UPDATE group_settings SET revision = revision + 1 WHERE id = 1;
END;
