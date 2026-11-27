# SG Family Find: Android-only staging deployment setup

**Status:** preparation only. This document does not authorize a deployment or PR merge.

## Isolation and prerequisites
- Feature branch: `feature/family-find-secure-api`; draft PR #3 remains unmerged.
- Target Cloudflare Worker: `sg-family-find-staging` only. **Never** use `sg-family-find-api`.
- Target D1: `sg-family-find-staging-db` only. Never use the production D1 UUID.
- Keep `FAMILY_FIND_ENABLED=false` and `FAMILY_FIND_ENV=staging`.
- The workflow uses the existing Cloudflare account; do not purchase services or rotate production credentials.
- Cloudflare deployment credential should be a **new narrowly scoped API token** with Worker Scripts edit permissions and appropriate account permissions for the staging deployment. Never use the global API key. Cloudflare permissions may not restrict a token to a single Worker; inspect the token's scope and avoid deploying until acceptable.
- Do not post token, IDs or account details in screenshots or chat.

## GitHub environment (Android browser)
1. Open repository **Settings → Environments** (you may need Chrome desktop-site mode).
2. Create `family-find-staging` if absent. Configure required reviewers if available on your repository plan; GitHub availability varies by visibility and plan. Never rely solely on reviewers as the security boundary.
3. Under the environment **Secrets**, add `FAMILY_FIND_STAGING_CF_API_TOKEN` with the scoped Cloudflare API token.
4. Under environment **Variables**, add `FAMILY_FIND_STAGING_CF_ACCOUNT_ID` (Cloudflare account ID) and `FAMILY_FIND_STAGING_D1_ID` (UUID of **staging** D1).
5. Verify the names, not the values. Never expose secret values in screenshots.

## Important GitHub workflow visibility limitation
GitHub's manual `workflow_dispatch` workflow generally must exist on the repository **default branch** to be dispatchable from the Actions UI/API. The deployment workflow currently exists **only on the feature branch**, so the **Run workflow** button may not appear. **Do not merge PR #3 to fix this.** A separately reviewed minimal workflow bootstrap on the default branch would require explicit approval and should preserve all production code. Until then, the feature-branch workflow is staged for review, **not an executable deployment path**.

## Safety and validation
1. Select the feature branch and type `DEPLOY-STAGING-ONLY` only after the manual trigger is properly available and credentials are configured.
2. The workflow runs tests, bundles the Worker, deploys only to `sg-family-find-staging`, checks `/health` for `database: Connected`, and checks that POST `/v1/invitations` returns HTTP 503 while disabled.
3. A green security-test run is **not** proof of Cloudflare deployment.
4. Do not enable location sharing or invite family members until real staging consent, revocation, expiration, and phone testing are complete.
5. If deployment fails, leave production untouched and inspect the staging workflow logs without exposing secrets.
