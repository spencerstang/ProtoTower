# Milestone 5 validation record

Status: Implementation in progress; production is not deployed and DNS is not cut
over.

## Approved boundary

- Invite-only production beta on `https://prototower.ai`.
- Existing public synthetic catalog, private towers, and bounded practice check-ins.
- Public signup, outcomes, analytics, AI, notifications, payments, MCP, and broader
  real-user admission remain disabled.

## Evidence pending

- Owner policy/mailbox approval
- Hosted verification
- Protected production environment configuration
- Pre-DNS Worker deployment and synthetic acceptance
- Backup/restore drill and incident/rollback rehearsal
- Human screen-reader review
- DNS go/no-go and cutover acceptance
- Separate real-user admission go/no-go

## Local evidence collected

- Repository formatting, structure, dependency policy, secret scan, migration
  validation, and whitespace gates passed.
- Strict TypeScript completed all 21 package and dependency tasks. All 75 unit tests
  passed.
- A fresh local Supabase reset applied all four forward-only migrations and the
  deterministic synthetic catalog seeds. Schema lint reported no errors and all 105
  pgTAP assertions passed.
- The complete Playwright gate passed all 25 end-to-end, accessibility, security, and
  performance tests without a retry. This includes the new privacy/deletion routes.
- `CI=true pnpm verify` passed lint, strict types, unit tests, and all 14 optimized
  builds. Existing non-failing framework convention and package ESLint notices remain.
- A production-configured OpenNext Cloudflare build succeeded with the exact
  canonical origin and a synthetic domain support address. The generated Worker
  contained neither the synthetic diagnostics token nor privileged provider key
  names.
- The live production dependency advisory query reported no known vulnerabilities.

No production provider resource was created, migrated, deployed, or connected during
local validation.

## External configuration evidence

- On 2026-08-07, the owner approved the published privacy/deletion wording, the
  seven-calendar-day verified deletion commitment, and `privacy@prototower.ai` as the
  public production contact. Mailbox send/receive verification remains pending.
- GitHub environment `production` was created on 2026-08-07 with protected-branch
  deployment policy and `@spencerstang` as the required reviewer.
- Non-secret environment variables were set to the canonical
  `PUBLIC_APP_URL=https://prototower.ai` and the reviewed pre-DNS production Workers
  hostname for `DEPLOYMENT_HEALTH_URL`.
- `PUBLIC_SUPPORT_EMAIL` is approved for configuration. Every production secret
  remains unset. No Supabase project, production Worker deployment, DNS route, Auth
  user, or real-user record was created by this configuration step.

Do not change this status to accepted until the exact commands, workflow links,
accepted SHA, observed results, cleanup, rollback evidence, and remaining limitations
are recorded without credentials or private values.
