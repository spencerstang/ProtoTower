# Milestone 3 validation record

Status: Complete local gate passed; protected staging pending

## Accepted boundary

- Invite-only magic-link authentication; the email provider is enabled while new
  user signup remains disabled.
- Multiple private goal-specific towers, capped at 12 per owner and 20 distinct
  protocol identities per tower.
- No tracking, notes, profiles, social features, AI, payments, public registration,
  production DNS cutover, or Milestone 4 work.

## Local evidence collected

- Fresh local migration reset applied all three migrations.
- Schema lint reported no warnings.
- 63 pgTAP assertions passed across foundation, catalog, and authenticated-tower
  suites, including direct-write denial, cross-user isolation, stale revisions,
  limits, published-version checks, and Auth-user deletion cascades.
- `CI=true pnpm verify` passed formatting, repository structure, dependency policy,
  secret scan, migration validation, lint, strict type checking, all unit suites, and
  the optimized Next.js production build.
- Frozen installation succeeded and `pnpm audit --audit-level=high --prod` reported
  no known vulnerabilities.
- The focused Playwright authentication journey passed with real local Supabase Auth
  and Mailpit: generic unknown-address response, scanner-safe confirmation, server-only
  cookies, create/add/reorder/remove/rename/persist, stale-write rejection, destination
  selection, sign-out, replay rejection, stored-markup escaping, deletion, and two-user
  not-found isolation.
- The final production-mode Playwright gate passed all 20 tests across end-to-end,
  accessibility, security, and performance projects in 30.3 seconds.

Exact final command results, accepted commit, workflow run, and staging evidence are
recorded only after the complete gate actually succeeds.
