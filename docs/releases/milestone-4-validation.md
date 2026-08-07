# Milestone 4 validation record

Status: Protected staging deployment and synthetic acceptance passed; final human
screen-reader spot-check remains

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
- The staging-evidence pull request exposed a retry-state race in the same synthetic
  tower journey: the first attempt navigated away before the second create action was
  proven complete, and retries inherited the first attempt's owned towers. The test
  now removes only its designated account's synthetic towers at the start of every
  attempt and waits for the second tower detail before navigating onward.

## Manual review evidence

- The deployed public landing, catalog, private tower list, tower detail, practice
  controls, recent history, removed-history state, and generic cross-owner not-found
  state were inspected through the public Cloudflare hostname without retaining
  private staging values.
- A 390-by-844 private-tower viewport reported matching content and viewport widths
  with no horizontal overflow. The private page produced no browser console warnings
  or errors during the acceptance flow.
- Accessible names and landmark structure were present for date selection, record,
  history, undo, tower membership, and navigation. The hosted automated keyboard and
  serious/critical accessibility gate remained green. A final human screen-reader
  spot-check remains because scripted Enter activation did not submit the hosted
  form in the browser-control session.
- Production and hosted verification retained the existing secret, log-redaction,
  dependency, CSP, private-cache, and no-unexpected-provider-request automated gates.

## Protected staging evidence

- Pull request [#17](https://github.com/spencerstang/Protostack/pull/17) merged into
  `main` as `43580101c22e4857329cd41c0e1682f2c2680111` after quality, browser,
  database validation, dependency review, and secret scan all passed.
- Protected workflow
  [31197069440](https://github.com/spencerstang/Protostack/actions/runs/31197069440)
  ran from 2026-08-07T16:20:14Z through 2026-08-07T16:24:36Z against that exact
  merge commit. The protected `staging` environment was approved separately for the
  migration and web deployment jobs.
- `validate / verify` passed in 1 minute 35 seconds. `migrate` linked the dedicated
  synthetic staging project and passed `supabase db push --include-all
--include-seed` in 20 seconds. `deploy-web` passed input validation, OpenNext
  build, secret upload, Cloudflare deployment, and endpoint verification in 1 minute
  10 seconds.
- The accepted deployment URL is
  <https://protostack-web-staging.spencer-4e6.workers.dev>. Workflow verification
  passed health, protected build identity, published catalog visibility, stale
  catalog rejection, protocol detail, and educational-disclaimer checks.
- With the first designated synthetic account, two separate towers recorded
  check-ins at different pinned protocol versions. Duplicate retry remained one row,
  reload preserved the row, and each tower exposed only its own history.
- An allowed recent date recorded and undid successfully. Malformed, future, and
  out-of-window enforcement remains covered by the green hosted browser and pgTAP
  gates; the native hosted date control prevented the browser-control session from
  transmitting those invalid values.
- Removing a practiced current block retained and clearly marked its history, removed
  the current record control, allowed the retained row to be undone, and allowed the
  protocol membership to be restored with clean history.
- The second designated synthetic account did not list the first account's private
  tower. Direct navigation to the first-account destination returned the generic
  not-found state without tower-editor or practice controls.
- A disposable synthetic tower with practice history was deleted. Its destination
  disappeared while a separate tower's practice history remained, proving the tower
  cascade was scoped. The surviving acceptance record was then undone, leaving no
  practice rows created by this acceptance run.
- Public, sign-in, and anonymous private-route responses through Cloudflare returned
  private no-store cache controls, nonce CSP, frame denial, permission restrictions,
  and no-referrer or strict-origin referrer policy as appropriate. Anonymous
  `/towers` redirected to `/sign-in`; `/api/health` returned `status: ok` after the
  acceptance flow.
- Direct authenticated mutation and `Set-Cookie` header capture was not exposed by
  the browser-control surface. The green hosted security suite remains the evidence
  for authenticated and mutation no-store behavior; no private values were copied
  out to work around that limitation.

## Rollback review

- The application rollback target must understand the forward-only practice schema
  and disable only the practice UI while public catalog and private non-practice
  routes remain available.
- Any database reversal requires a reviewed forward-only compensating migration.
  Accepted rows must not be dropped or rewritten as an application rollback shortcut.
- The deployed adapter's scoped-unavailable behavior and existing public/private
  route coverage remain the verified fallback if practice storage is unavailable.

Milestone 4 does not authorize public signup, real-user practice data, production DNS
cutover, outcomes, analytics, notifications, AI, payments, or MCP.
