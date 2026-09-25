-- Free-tier reading usage counters. No prompts, replies, raw IPs, or any
-- reading content are ever stored here — only opaque identifiers and daily
-- counts, so the free tier keeps the same "we don't retain your reading"
-- promise as the bring-your-own-key relay.

-- Per anonymous visitor (opaque UUID kept in an HttpOnly cookie), per UTC day.
CREATE TABLE IF NOT EXISTS anon_usage (
  anon_id TEXT NOT NULL,
  day     TEXT NOT NULL,          -- YYYY-MM-DD (UTC)
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anon_id, day)
);

-- Per client IP, stored only as a salted SHA-256 hash (never the raw IP),
-- per UTC day. Backstop for visitors who clear cookies or use incognito.
CREATE TABLE IF NOT EXISTS ip_usage (
  ip_hash TEXT NOT NULL,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);

-- Site-wide daily total — the hard ceiling on what the free tier can spend,
-- whatever happens to the per-visitor and per-IP limits.
CREATE TABLE IF NOT EXISTS global_usage (
  day   TEXT NOT NULL PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
