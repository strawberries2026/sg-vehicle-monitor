-- STAGING ONLY. Run manually after confirming the staging D1 database identity.
-- Erase expired GPS and device capability immediately; retain metadata briefly
-- for abuse throttling, then delete all expired/revoked records after 24 hours.
UPDATE family_shares SET status='expired',last_lat=NULL,last_lng=NULL,last_seen_at=NULL,
 device_token_hash=NULL
 WHERE expires_at <= CAST(strftime('%s','now') AS INTEGER)
 AND status IN ('pending','active');
DELETE FROM family_shares
 WHERE (status IN ('expired','revoked') OR expires_at <= CAST(strftime('%s','now') AS INTEGER))
 AND COALESCE(revoked_at,expires_at) <= CAST(strftime('%s','now') AS INTEGER)-86400;
