-- STAGING ONLY: apply to sg-family-find-staging-db, never production.
-- Unix timestamps in seconds. Coordinates are nullable until explicit sharing.
CREATE TABLE IF NOT EXISTS family_shares (
 id TEXT PRIMARY KEY NOT NULL,
 viewer_uid TEXT NOT NULL,
 invite_token_hash TEXT NOT NULL UNIQUE,
 device_token_hash TEXT UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('pending','active','revoked','expired')),
 consent_mode TEXT,
 created_at INTEGER NOT NULL,
 consented_at INTEGER,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 last_lat REAL CHECK(last_lat IS NULL OR (last_lat >= -90 AND last_lat <= 90)),
 last_lng REAL CHECK(last_lng IS NULL OR (last_lng >= -180 AND last_lng <= 180)),
 last_seen_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_family_shares_viewer_created ON family_shares(viewer_uid,created_at);
CREATE INDEX IF NOT EXISTS idx_family_shares_expiry ON family_shares(expires_at);
