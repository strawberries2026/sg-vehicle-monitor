# SG Family Find — isolated staging configuration

> **Not a deployment.** This configuration is for a future separately named Cloudflare Worker. Do not deploy it against the existing production Worker or D1 database.

## Proposed staging resources

- Worker name: `sg-family-find-staging`
- D1 binding: `DB`
- Separate D1 database name: `sg-family-find-staging-db`
- Production Worker `sg-family-find-api` and production D1 `sg-family-find-db` must remain untouched.
- Firebase project ID in current code: `sg-vehicle-monitor-pro`
- Allowed browser origin in current code: `https://strawberries2026.github.io`

## Staging configuration template

The following is a **template**, not an active Cloudflare configuration. Insert the actual staging D1 database UUID only after the separate database has been created and its identity verified.

```toml
name = "sg-family-find-staging"
main = "family-find-worker/worker.mjs"
compatibility_date = "2026-11-20"

[vars]
FAMILY_FIND_ENV = "staging"
FAMILY_FIND_ENABLED = "false"

[[d1_databases]]
binding = "DB"
database_name = "sg-family-find-staging-db"
database_id = "REPLACE_WITH_STAGING_D1_DATABASE_UUID"
```

Do not change `FAMILY_FIND_ENV = "staging"` or set `FAMILY_FIND_ENABLED = "true"` until isolated D1 migrations, authentication, consent and revocation checks pass. When true, all implemented sharing endpoints become reachable; this is an explicit activation gate, not a read-only test mode.

## Before any staging deployment

1. Verify that the D1 UUID is for the new staging database and **not** the production database.
2. Apply the schema to staging only; verify column types, indexes and constraints.
3. Deploy with sharing disabled and confirm `/health` and a 503 response from every sharing endpoint.
4. Only after approval and security checks, enable sharing for controlled device testing with informed consent.
5. Verify expiry cleanup and data minimisation; test stop sharing and post-revocation denial.
6. Record the staging Worker URL, test evidence and rollback steps. Do not merge PR #3 until approved.

## Current evidence

- GitHub Actions Run #101: 80 automated tests passed (before this documentation and validation update).
- No staging Worker or staging D1 database has been created by this PR.
- No physical Android/iPhone test has been completed.
