# Milestone 3 validation record

Status: Code, database, and public protected-staging gates passed; hosted
authenticated email acceptance pending

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

## Hosted pull-request evidence

- Accepted implementation commit: `c80c3359c85ad309e80c9692d659d9f8158cb706`
  (`Implement authenticated personal towers`).
- Pull request `#10` merged to `main` as
  `0d51cbf1980b1a80cbeae91119d788ca170c2ce5`.
- GitHub Actions passed at that commit: Continuous Integration quality (1m30s),
  Continuous Integration browser (4m14s), Database Validation (2m47s), Secret Scan
  (13s), and Dependency Review (10s).
- Dependency Review initially reported that the repository Dependency Graph was
  disabled. It passed after that GitHub repository security setting was enabled and
  the check was rerun; no application code or dependency policy exception was added.

## Staging compatibility and security corrections

- The first post-merge deployment exposed a Next.js 16/OpenNext compatibility issue:
  OpenNext rejected Node-runtime `proxy.ts`. Pull request `#11` restored the supported
  Edge Middleware convention and merged as
  `e2a44c50a5ac42800e8c86a32cdaa12b48053837`.
- Protected deployment run `30683382708` then passed its validation, migration,
  Worker deployment, build-metadata, health, and catalog checks. An independent
  response-header inspection found that the hosted Content Security Policy still
  allowed the local Supabase origin.
- Pull request `#12` removed that hosted localhost allowance and added a regression
  assertion. Its local gate passed `CI=true pnpm verify`, schema lint, all 63 pgTAP
  assertions, the OpenNext production build, and all 20 Playwright tests. Hosted
  quality, browser, secret-scan, and review checks also passed before it merged as
  `880f6834ab2dc689fa52f12bc3c494e23a870044`.

## Protected staging evidence

- Protected deployment run `30684031700` deployed the exact merge commit
  `880f6834ab2dc689fa52f12bc3c494e23a870044`.
- The workflow's full validation gate passed in 1m27s, the committed migrations and
  synthetic seed applied idempotently in 13s, and the Worker build, secret upload,
  deployment, and hosted endpoint verification passed in 1m12s.
- An independent public check on 2026-08-01 observed `/api/health` at HTTP 200,
  `/protocols` at HTTP 200, unauthenticated `/towers` at HTTP 307 with location
  `/sign-in`, and `/sign-in` at HTTP 200.
- The protected responses used `private, no-store` and `no-referrer`; framing,
  MIME-sniffing, permissions, opener, and nonce-based CSP protections were present.
  The deployed `connect-src` was limited to the application origin and
  `https://*.supabase.co`; `http://127.0.0.1:54321` was absent.
- Hosted Supabase Auth was configured with the staging Worker as the site URL, the
  exact `/auth/confirm` redirect allowlist entry, global public signup disabled,
  manual account linking disabled, anonymous sign-in disabled, and email confirmation
  enabled.

## Remaining hosted acceptance

The scanner-resistant hosted magic-link template cannot be installed until a custom
SMTP provider, sender domain, and credentials are configured. Two designated
synthetic alpha mailboxes are also required to exercise the full hosted flow without
using personal or production data. Until those human-controlled prerequisites exist,
the hosted magic-link request and explicit confirmation, session-cookie inspection,
two-user isolation, tower CRUD/reorder/reload, and sign-out denial checks remain
pending.

This remaining acceptance does not authorize public signup, production DNS cutover,
or Milestone 4 work.
