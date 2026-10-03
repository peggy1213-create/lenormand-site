-- Cross-device reading history for signed-in users.
-- One row per (user, reading). `data` is the JSON blob of the client Reading
-- (minus id). `updatedAt`/`deleted` drive last-write-wins sync with tombstones.
CREATE TABLE IF NOT EXISTS reading (
  userId    TEXT    NOT NULL,
  id        TEXT    NOT NULL,
  data      TEXT    NOT NULL DEFAULT '',
  updatedAt INTEGER NOT NULL,
  deleted   INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (userId, id)
);

CREATE INDEX IF NOT EXISTS reading_userId_idx ON reading (userId);
