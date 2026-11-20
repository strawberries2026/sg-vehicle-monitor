# Family Find staging deployment gate

**Status: not approved for production.** The GitHub test suite uses simulated database and browser dependencies. A passing run does not prove Cloudflare D1 integration or real-device behavior.

## Isolated staging prerequisites

1. Create a separate Cloudflare Worker named `sg-family-find-staging` and a separate D1 database named `sg-family-find-staging-db`. Do not bind the existing production `sg-family-find-db`.
2. Apply the `family_shares` schema in staging only, using the existing D1 table definition. Verify that all columns, indexes and constraints match the Worker queries.
3. Restrict the Worker to the exact intended GitHub Pages origin. The existing Worker source currently allows `https://strawberries2026.github.io`; never use a wildcard origin.
4. Configure the Firebase project ID used by the staging Worker and verify cryptographic ID-token validation. Do not put Firebase ID tokens or invitation/device capabilities in logs, query strings or analytics.
5. Host the staging UI separately from the production entry page. Explicitly label it staging and require consent before any GPS request.
6. Check CORS preflight, unauthenticated denial, invalid/expired invitation denial, single redemption, authenticated viewer-only reads, position upload throttling, expiry, revocation and post-revocation denial against **real D1**.
7. Confirm consented iPhone Safari foreground sharing, Android viewer sign-in, stop sharing, browser-close behavior and stale-location warnings. Background GPS is not guaranteed on iOS.
8. Establish cleanup for expired location rows and a tested incident/rollback process before inviting real participants.
9. Keep PR #3 as draft and production unchanged until these gates are independently verified and release is explicitly approved.

## Important release blocker

The current `worker.mjs` contains a comment saying location endpoints are disabled, but the route handlers are present and can operate if the Worker is deployed with a compatible D1 binding. **Do not deploy this Worker to the existing production endpoint.** Before staging deployment, add and test an explicit environment-controlled enablement gate and confirm that staging configuration cannot point at production D1.

## Verification record

- GitHub Actions Run #82: 69 automated tests passed; zero failures.
- No staging D1 integration or physical Android/iPhone end-to-end test has been verified.
- No production merge or deployment has been performed as part of this work.
