ALTER TABLE posts ADD COLUMN extra_photo_keys TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(extra_photo_keys) AND json_type(extra_photo_keys) = 'array' AND json_array_length(extra_photo_keys) <= 5);
