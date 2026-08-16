# Milestone 5 validation record

Status: Implementation in progress; production is not deployed and DNS is not cut
over.

## Approved boundary

- Invite-only production beta on `https://prototower.ai`.
- Existing public synthetic catalog, private towers, and bounded practice check-ins.
- Public signup, outcomes, analytics, AI, notifications, payments, MCP, and broader
  real-user admission remain disabled.

## Evidence pending

- Support mailbox send/receive verification
- Hosted verification
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
- On 2026-08-08, hosted CI detected newly reviewed advisory
  `GHSA-2v37-7h3g-55p8` in transitive `nanoid@3.3.16`. The approved resolution pins
  patched `nanoid@3.3.17`; the refreshed production audit reported no known
  vulnerabilities and the full local verification gate passed.

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
- `PUBLIC_SUPPORT_EMAIL` is approved for configuration. At that point, every GitHub
  production environment secret remained unset. No Supabase project, production
  Worker deployment, DNS route, Auth user, or real-user record was created by that
  configuration step.
- On 2026-08-14, the separate `ProtoTower Production` Supabase project was created in
  East US (Ohio) under the renamed `ProtoTower` organization. Its non-secret project
  reference is `lqdyntgcwxtpprvhfrmk`; the existing staging project retained its
  stable reference and was renamed `ProtoTower Staging` for display only.
- The initial production database password was rotated before use and the replacement
  was stored outside the repository and chat. No application or migration had used
  the superseded credential.
- Production Auth now denies public signup, anonymous sign-in, and manual account
  linking; requires email confirmation; uses `https://prototower.ai` as its Site URL;
  and allowlists only `https://prototower.ai/auth/confirm` for redirects.
- Resend custom SMTP is enabled with a production-only credential, the verified
  `auth.prototower.ai` sending domain, owner-reported disabled link/open tracking,
  and `sign-in@auth.prototower.ai` as the sender. The committed scanner-resistant
  magic-link subject and body were installed. The reviewed default limits remain 30
  Auth emails per hour, 30 sign-in requests per five minutes per IP, and 30 token
  verifications per five minutes per IP. Send/receive acceptance remains pending.
- On 2026-08-16, all eight required GitHub `production` environment secrets were
  observed by name without reading their values: Cloudflare account and Worker token,
  Supabase access token, project reference, database password, URL and anonymous key,
  plus the application diagnostics token. The Cloudflare Worker token is limited to
  Workers Scripts Write with no DNS permission and expires on 2026-09-15. The
  Supabase deployment token expires on 2026-09-15. Both require rotation before
  expiry if the production workflow still needs them.

Do not change this status to accepted until the exact commands, workflow links,
accepted SHA, observed results, cleanup, rollback evidence, and remaining limitations
are recorded without credentials or private values.
