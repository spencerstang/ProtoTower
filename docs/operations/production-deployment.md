# Invite-only production deployment

Production is a separate protected environment. This runbook does not authorize DNS
cutover or real-user invitations by itself.

## Required external configuration

Create a GitHub environment named `production` with required reviewers and prevent
self-approval where the account plan supports it. Configure these environment
secrets without copying values into chat, documentation, or logs:

- `CLOUDFLARE_API_TOKEN` scoped to Workers Scripts Write for the production Worker
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` for the separate production project
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ADMIN_DIAGNOSTICS_TOKEN` with at least 32 random characters

Configure these non-secret environment variables:

- `PUBLIC_APP_URL=https://prototower.ai`
- `PUBLIC_SUPPORT_EMAIL` using a monitored `@prototower.ai` mailbox
- `DEPLOYMENT_HEALTH_URL=https://protostack-web-production.spencer-4e6.workers.dev`
  before cutover and `https://prototower.ai` afterward

In production Supabase:

1. Disable open user creation and create only approved invited accounts.
2. Set the Site URL to `https://prototower.ai` and allow only the exact
   `https://prototower.ai/auth/confirm` redirect.
3. Install the committed scanner-resistant magic-link template.
4. Configure Resend custom SMTP on the ProtoTower domain with link/open tracking
   disabled and review Auth email rate limits.
5. Enable the provider backup policy, record its retention, and restrict dashboard
   access.

At Cloudflare, add a deny-by-default rate-limiting rule for repeated POST requests to
`/sign-in`, document the threshold, and verify a normal invited sign-in is unaffected.
Do not attach the custom domain yet.

## Pre-DNS deployment

Run **Deploy Production** from the accepted `main` commit. Paste the exact commit SHA,
type `DEPLOY INVITE-ONLY PRODUCTION`, and enable the database input for the first
deployment. Approve migration and web jobs separately.

The workflow validates the repository, applies forward-only migrations plus the
reviewed synthetic catalog seed, builds with production settings, uploads only the
required runtime secrets, deploys the production Worker, and verifies health, exact
build identity, catalog visibility, CSP, privacy, deletion, and invite-only sign-in.

Do not attempt authenticated acceptance on the Workers hostname. Production magic
links and private-route redirects intentionally use the canonical origin, which is
not available until the separately approved DNS cutover.

## Backup and restore gate

Observe a successful production backup, then restore it only into a disposable,
access-restricted project. Verify migration presence and aggregate row counts without
printing identifiers or content. Confirm Auth and application cascades remain intact,
record timestamps and provider job identifiers only, and destroy the disposable
project after approval. A configured backup is not considered tested until this
restore is observed.

## Final cutover

After the pre-DNS, provider, backup/restore, and policy gates pass, request the
owner's explicit DNS go/no-go. Use a separate short-lived, least-privilege
domain-management credential to attach `prototower.ai` as the production Worker
custom domain, enforce HTTPS, and configure `www.prototower.ai` as a permanent
redirect to the root origin. Do not add DNS permissions to the routine deployment
token.
Immediately verify health, accepted build SHA, public pages, privacy/deletion pages,
security headers, exact Auth redirect, and rollback access.

Then complete the full synthetic two-account invitation, scanner-safe confirmation,
owner isolation, private caching, record/undo, cascade, and cleanup acceptance on the
canonical domain. Complete the human screen-reader flow there as well. Remove every
temporary Auth user, tower, and practice row without retaining identifiers or private
values in the validation record.

Only after those checks pass should the owner be asked for a separate real-user
admission go/no-go. Provision and invite no real account before that approval.

If any check fails, remove or disable the custom-domain route, leave invitations
disabled, and follow the rollback runbook. Never reverse a database migration during
application rollback.
