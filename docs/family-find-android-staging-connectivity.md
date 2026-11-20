# Android-only staging connectivity runbook (no production changes)

## Verified baseline
- Separate Worker: `sg-family-find-staging`; staging URL: `https://sg-family-find-staging.songkhengleong.workers.dev`.
- Separate D1: `sg-family-find-staging-db`, with `family_shares` table and indexes shown in user screenshots. Verify live binding before any API deployment.
- Staging Worker binding variable name: `DB`; it must point to `sg-family-find-staging-db`, **never** `sg-family-find-db`.
- Runtime variables: `FAMILY_FIND_ENABLED=false` and `FAMILY_FIND_ENV=staging`.
- Current staging Worker was created from a Hello World starter; a Hello World response does **not** validate the API or D1 connection.
- Automated tests verify source behavior with mocks, not real Cloudflare D1.

## Deployment caution
The API source `family-find-worker/worker.mjs` imports multiple sibling `.mjs` modules. Pasting only `worker.mjs` into the Cloudflare dashboard editor is not a valid complete deployment: imports will fail. Use a complete module-aware Wrangler deployment package after review; do not replace the starter with a partial file. Keep the Worker isolated from the existing production API and app. Do not connect GitHub auto-deploy to the production branch.

## Safe first live checks after complete staging deployment
1. Confirm Cloudflare Settings > Bindings: `DB` resolves to the staging D1 database.
2. Confirm Settings > Variables: `FAMILY_FIND_ENABLED=false` and `FAMILY_FIND_ENV=staging`. Note Cloudflare's 'Production' label in a Worker settings page refers to the Worker deployment environment; it does not mean this Worker is the SG app's production service.
3. Open `https://sg-family-find-staging.songkhengleong.workers.dev/health` on Android. Expect HTTP 200 with JSON `database: Connected` and a staging baseline status. HTTP 503 or a Hello World page means connectivity is **not verified**.
4. Test a sharing route without enabling sharing. It must return HTTP 503 `Family sharing is disabled`. Do not send a real invitation, Firebase token, device token or GPS coordinates for this check.
5. Record screenshots/results without credentials or personal coordinates. If anything differs, stop; do not turn on sharing.

## Gates before any family invitation
- Real D1 checks for schema, constraints, consent, expiry, revocation, throttling and cleanup.
- Verify Firebase ID-token validation and precise CORS behavior.
- Explicit opt-in on iPhone Safari and authenticated Android viewer test.
- Rollback procedure and manual approval. iPhone Safari foreground-only GPS expectations must be explained.
- Do not merge draft PR #3 or change production until separately approved.
