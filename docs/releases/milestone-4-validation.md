# Milestone 4 validation record

Status: Local automated gate passed; manual review and protected staging acceptance pending

## Accepted boundary

- Invite-only, synthetic-alpha private practice check-ins for an exact owned tower,
  protocol identity/version, and bounded calendar date.
- Idempotent record and undo, bounded recent history, retention after current block
  removal, and tower/Auth-user deletion cascades.
- No owner input, direct writes, notes, scores, streaks, outcomes, analytics,
  reminders, AI, public signup, real-user collection, or production launch.

## Local evidence collected

- Fresh local reset applied all four forward-only migrations, including
  `20260806000000_private_practice_checkins.sql`.
- Schema lint reported no errors.
- All 105 pgTAP assertions passed across foundation, catalog, tower, and private
  practice suites. The 42 Milestone 4 assertions cover fixed owner derivation,
  forced RLS, grants, direct-write and anonymous denial, cross-user isolation,
  bounded dates, exact current membership, unique concurrent retry protection,
  idempotency, removed-membership history/undo, and tower/Auth-user cascades.
- Generated TypeScript database types were refreshed from the applied local schema.
- Repository structure, dependency policy, secret scan, migration validation, and
  diff whitespace checks passed after the implementation changes.
- `CI=true pnpm install --frozen-lockfile` restored the exact lockfile with 653
  packages reused, zero downloaded, and all 811 lock entries passing the repository's
  supply-chain policy.
- `CI=true pnpm verify` passed formatting, structure, dependency policy, secret scan,
  migration validation, lint, strict type checking, all 73 unit tests, all 14 package
  builds, and the optimized Next.js production build. The existing non-failing Next
  middleware-convention deprecation warning remains.
- `pnpm audit --audit-level=high --prod` reported no known vulnerabilities.
- The focused authenticated journey passed both tests in 42.0 seconds. The final
  `CI=true pnpm test:browsers` run passed all 23 end-to-end, accessibility, security,
  and performance tests in 52.7 seconds with no retries or flakes.
- Browser coverage includes record/retry idempotency, reload, a new isolated browser
  sign-in, removed-block history, undo, tower separation, two-user denial, keyboard
  operation, serious/critical automated accessibility checks, private no-store cache
  controls, anonymous replay denial, narrow-layout overflow, and route budgets.

## Corrected gate findings

- The first full unit run found a test assertion that confused the structured log's
  operational timestamp with a private practice date. The assertion now verifies
  that no practice field, identifier, or provider message is logged; the final unit
  gate passes.
- The first full browser run passed 21 tests, failed one stateful second-sign-in
  harness assertion, and retried one unrelated header test. The renewed-sign-in flow
  now uses a clean browser context and a reviewed 90-second journey budget; its
  focused rerun and the final 23-test gate both pass cleanly.

## Remaining manual local review

- Complete a human visual and screen-reader review of date selection, record, removed
  history, undo, and generic errors at desktop and narrow widths.
- Inspect local network metadata, console output, and production artifacts for
  private activity or unexpected third-party requests.
- Confirm the documented application rollback and forward-only compensating-migration
  process before protected staging deployment.

## Protected staging gate

No Milestone 4 migration, application revision, feature enablement, or synthetic
practice acceptance has been run against protected staging yet. Follow
`docs/operations/milestone-4-gate.md`; record only non-sensitive command results,
accepted commit/workflow identifiers, cache controls, and rollback evidence here.

Milestone 4 does not authorize public signup, real-user practice data, production DNS
cutover, outcomes, analytics, notifications, AI, payments, or MCP.
