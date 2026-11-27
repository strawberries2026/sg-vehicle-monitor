# SG Family Find — secure API implementation plan

Status: design/preflight only. No location collection, production API deployment, or frontend activation is authorised by this document.

## Existing infrastructure
- Cloudflare Worker: sg-family-find-api, currently serving a D1 connectivity test only.
- D1 binding: DB; database: sg-family-find-db; table: family_shares.
- Existing columns: id, viewer_uid, invite_token_hash, device_token_hash, status, consent_mode, created_at, consented_at, expires_at, revoked_at, last_lat, last_lng, last_seen_at.
- Table count verified as zero by owner on 2026-11-13.
- GitHub Pages frontend currently provides informational invitation/consent preview only.
- Firebase project: sg-vehicle-monitor-pro. Viewer authentication uses Firebase Auth.
- Unrelated PR #2 (PWA icons) remains open and must not be merged as part of this work.

## Security contract (must be implemented and tested before deployment)
1. Viewer authentication: verify Firebase ID token server-side using issuer, audience, signature via Google's published JWKS, expiration, and uid; never trust an email or uid sent by the browser as authentication.
2. Invite creation: authenticated viewer only; generate >=256 bits CSPRNG token; persist only SHA-256 hash; short invitation expiry (e.g. 15 minutes); bound to authenticated viewer uid; no GPS data in URL.
3. Consent: recipient sees identity of requested viewer and explicit data, duration, accuracy, and stop controls; no location collection until user affirmatively accepts and browser grants geolocation permission; no Google account required for recipient.
4. Device authorization: exchange valid one-time invitation for an independently generated high-entropy device credential; store only hash; enforce active consent, expiry, and revocation on every location write.
5. Viewer read: only verified viewer uid matching session; never return coordinates based solely on invitation token, email, or a public session id.
6. Revocation: consenting device can revoke using device credential; viewer can revoke using verified Firebase identity; delete last_lat/last_lng/last_seen_at on revoke and expiry cleanup. Expiry is enforced at read/write even if cleanup jobs have not run.
7. CORS: allow only https://strawberries2026.github.io; preflight must not bypass auth. Use HTTPS and no-store for sensitive responses.
8. Validate JSON size, latitude [-90,90], longitude [-180,180], timestamp freshness, content-type, HTTP methods; rate-limit invitations, token attempts and updates. Never log raw tokens, Firebase ID tokens or coordinates.
9. Avoid persistent tokens in localStorage where possible; evaluate session continuity and loss/revocation tradeoffs on iOS Safari. Do not claim always-on background GPS on iOS/Android browsers.
10. Add automated tests for unauthorized viewer reads, expired/used invitations, forged tokens, no-consent writes, revocation, cross-origin requests, malformed coordinates and repeated requests.

## Planned endpoints (not live)
- GET /health: public minimal health only, no user information.
- POST /v1/invitations: verified viewer creates short-lived invite.
- POST /v1/consent: recipient redeems invitation after affirmative consent; one-time use.
- POST /v1/positions: device credential writes latest position while active.
- GET /v1/positions/{id}: verified viewer reads own active share only.
- POST /v1/shares/{id}/revoke: authorized viewer or device revokes and clears coordinates.

## Release gate
- Review existing D1 constraints and indexes before any migrations.
- Implement Worker and tests on this branch; no secrets committed.
- Run security and integration tests against a nonproduction D1 database.
- Review GitHub Pages UI changes for accessibility, consent clarity and privacy.
- Deploy Worker only after explicit approval, then smoke-test; deploy frontend only after API verified.
- Keep rollback path to current Worker deployment d0bf22fb.
