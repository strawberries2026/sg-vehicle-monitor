import {seconds} from './lifecycle.mjs';

export const CLEANUP_CRON = '*/15 * * * *';
const RETENTION_SECONDS = 24 * 60 * 60;
const ROW_LIMIT = 250;

export async function cleanupExpiredShares(db, cutoff) {
  if (seconds(cutoff) === null) throw new TypeError('Invalid cleanup cutoff');

  // Bound each sweep. Expiry already blocks reads and writes while a backlog drains.
  // Keep terminal metadata for the invitation rate limit, then delete it in the same batch.
  await db.batch([
    db.prepare(`UPDATE family_shares
      SET status = 'expired', last_lat = NULL, last_lng = NULL,
          last_seen_at = NULL, device_token_hash = NULL
      WHERE id IN (
        SELECT id FROM family_shares
        WHERE status IN ('pending', 'active') AND expires_at <= ?
        ORDER BY expires_at LIMIT ?
      )`).bind(cutoff, ROW_LIMIT),
    db.prepare(`DELETE FROM family_shares
      WHERE id IN (
        SELECT id FROM family_shares
        WHERE (status = 'expired' AND expires_at <= ?)
           OR (status = 'revoked' AND revoked_at <= ?)
        ORDER BY COALESCE(revoked_at, expires_at) LIMIT ?
      )`).bind(cutoff - RETENTION_SECONDS, cutoff - RETENTION_SECONDS, ROW_LIMIT),
  ]);
}
