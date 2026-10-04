# Milestone 5 validation record

Status: Quiet-launch production is live. Public email signup is enabled. The current
account-foundation release and October 2026 security refresh are pending the protected
production deployment recorded below.

## Approved boundary

- Quiet-launch open beta on `https://prototower.ai`, as accepted by ADR 0014.
- Self-service email signup and confirmation without operator provisioning.
- Existing public catalog, private towers, bounded practice check-ins, account
  pseudonyms, privacy controls, and account deletion.
- Outcomes, analytics, AI, notifications, payments, MCP, and broader Milestone 6 work
  remain outside this release.

## Production evidence

- Production deployment run 6 completed successfully on 2026-08-23 for commit
  `d31d06f3497e263ea844b550a76f9b0e1210e9ee`:
  <https://github.com/spencerstang/ProtoTower/actions/runs/32654283504>.
- `https://prototower.ai` and `/api/health` returned HTTP 200 on 2026-10-03.
- `https://www.prototower.ai` permanently redirects to the canonical root.
- The production sign-in page advertises open beta and provides self-service email
  account creation and sign-in.
- Production responses were observed with private/no-store caching, nonce-based CSP,
  frame denial, cross-origin opener policy, and a restrictive permissions policy.
- An unauthenticated request to `/api/admin/build-info` returned HTTP 404.
- The most recent staging deployment for the current base commit
  `2f7969183b87b84eb0acaa8b579d46bafc96fa7e` completed successfully on 2026-08-29:
  <https://github.com/spencerstang/ProtoTower/actions/runs/33263204988>.

## Release-candidate evidence collected on 2026-10-03

- The production dependency audit initially found critical Next.js advisories and a
  high-severity `sharp` advisory. The release candidate updates Next.js and
  `eslint-config-next` from 16.2.12 to 16.3.6 and the `sharp` override from 0.35.2 to
  0.35.4. `pnpm audit --audit-level=high --prod` then reported no known
  vulnerabilities.
- `CI=true pnpm verify` passed repository formatting and structure, dependency policy,
  secret scanning, all eight migration checks, lint, strict TypeScript, unit tests,
  and all 14 optimized builds.
- A fresh local Supabase reset applied all eight forward-only migrations. Database
  lint reported no schema errors and all 133 pgTAP assertions in six files passed.
- The complete Playwright gate passed all 25 end-to-end, accessibility, security, and
  performance tests in 38.1 seconds.
- The only non-failing framework notice is Next.js's middleware-to-proxy deprecation.
  Existing ESLint 10 peer-compatibility notices do not affect the passing lint and
  build gates.

## External configuration evidence

- The owner approved the published privacy/deletion wording, the seven-calendar-day
  verified deletion commitment, and `privacy@prototower.ai` as the public production
  contact on 2026-08-07. Mailbox send/receive verification remains pending.
- The protected GitHub `production` environment uses protected-branch deployment
  policy and `@spencerstang` as the required reviewer.
- Production uses the canonical `PUBLIC_APP_URL=https://prototower.ai`.
- The separate `ProtoTower Production` Supabase project is ACTIVE_HEALTHY in East US
  (Ohio). Its non-secret project reference is `lqdyntgcwxtpprvhfrmk`; staging remains
  a separate project.
- Production Auth requires email confirmation and disables anonymous sign-in and
  manual account linking. Self-service email signup is enabled for the open beta.
- Resend custom SMTP uses the verified `auth.prototower.ai` sending domain with
  `sign-in@auth.prototower.ai` as the sender. A live send/receive acceptance test with
  a newly entered address remains pending.
- Daily physical production backups were observed as completed. Point-in-time
  recovery is not enabled. A restore to a disposable project remains pending because
  it creates a billable project and requires an owner-approved maintenance window.
- GitHub production secrets were observed by name without reading their values. The
  Cloudflare and Supabase command-line sessions were authenticated on 2026-10-03.
  The protected workflow remains the authoritative proof that deployment credentials
  are valid.

## Remaining acceptance evidence

The following checks do not block deploying the verified security and account
foundation update. They must remain visible launch-hardening work and must not be
recorded as complete until observed:

- Receive and send a test message through the monitored support mailbox.
- Create and confirm one synthetic account using a newly entered external email
  address, then verify deletion and cleanup.
- Perform a human screen-reader pass on the canonical production flow.
- Restore a production backup to a disposable project, verify it, and remove the
  billable project.
- Exercise and record the production signup-disable, Worker rollback, and
  forward-only database recovery procedures.

## Deployment acceptance

Record the protected production workflow link, exact deployed commit, migration and
Worker results, post-deploy route checks, and rollback reference here before marking
this release accepted.
