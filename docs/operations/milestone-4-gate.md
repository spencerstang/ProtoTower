# Milestone 4 acceptance gate

Status: Planned; implementation has not begun

Run from a clean checkout with the repository-supported Node.js and pnpm versions.
Use synthetic local identities, dates, towers, catalog content, and activity only.
Committed tests may use deterministic reserved synthetic values. Do not record the
designated staging mailboxes, email contents, tokens, cookies, external Auth
identifiers, staging tower identifiers or titles, staging practice dates, protocol
membership, or administrative secrets in the repository, screenshots, logs, prompts,
or chat.

## Planning gate

- The approved scope, ADR, architecture, and threat model agree on one narrowly typed
  check-in and explicitly reject generic event payloads, outcomes, and public launch.
- The correction window, recent-history range, local/UTC boundary behavior, query row
  cap, and mutation result types are exact constants before migration review.
- No new runtime dependency or provider SDK is introduced without a revised ADR and
  dependency rationale.
- `protocolTracking` remains false until the full gate passes.

## Automated local gate

```bash
CI=true pnpm install --frozen-lockfile
CI=true pnpm verify
pnpm audit --audit-level=high --prod
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm playwright:install
pnpm test:browsers
```

The implementation must add automated coverage for:

- exact practice-date grammar, correction/history bounds, branded IDs, positive
  immutable versions, provider parsing, and typed mutation results;
- record/undo idempotency, duplicates, current exact membership, removed membership,
  version changes, concurrency, and hard query bounds;
- anonymous denial, owner-only select, direct-write denial, RPC execution grants,
  fixed owner derivation, malformed payload denial, cross-user isolation, and generic
  absent/non-owner behavior in pgTAP;
- composite ownership/version foreign keys, history retention after item removal,
  and tower/Auth-user deletion cascades;
- private no-store responses, same-origin mutations, nonce CSP, secret/privacy scans,
  and no activity data in HTML outside the owner session or in logs/artifacts;
- record, reload, new sign-in, undo, removal-history, multi-tower separation, and
  two-browser-user isolation;
- scoped practice-unavailable behavior while tower editing, landing, health, sign-in,
  and public catalog routes remain available; and
- authenticated-page accessibility, narrow/desktop layout, and performance budgets.

## Manual local review

- Use keyboard-only and screen-reader flows to choose a date, record, undo, navigate
  history, remove a current block, and understand generic errors.
- Confirm the UI never describes a check-in as adherence, success, efficacy, outcome,
  medical advice, or proof of completion.
- Confirm current membership and historical rows remain visually distinguishable
  without exposing retired content.
- Inspect browser console and network metadata for dates, identifiers, membership,
  provider bodies, public caching, or unexpected third-party requests.
- Confirm responsive layouts have no horizontal overflow and do not rely on color.
- Inspect production build artifacts for service-role keys, secrets, private activity,
  or an accidentally enabled provider/feature flag.

## Protected staging prerequisites

- Milestone 3 Auth, SMTP, scanner-resistant confirmation, session-cookie, CSP, and
  private-cache acceptance remains valid.
- Public signup, anonymous sign-in, manual account linking, outcomes, analytics,
  notifications, AI, payments, MCP, and production DNS remain disabled.
- Only designated synthetic external test accounts are used. Their mailboxes and all
  Auth/SMTP configuration remain outside repository and workflow logs.
- The staging migration requires protected approval and an observed backup/rollback
  review before application deployment.
- The exact implementation SHA has passed the frozen local and hosted gates.

## Protected staging verification

1. Run the complete frozen verification job.
2. Apply only the committed forward-only migration and regenerate checked-in types.
3. Deploy the exact accepted Git SHA behind the disabled feature flag and verify
   health, catalog, sign-in, tower, and protected build metadata.
4. Enable the reviewed flag in the accepted application revision only after schema
   and rollback checks pass.
5. With the first synthetic account, record current check-ins in two separate towers
   at different exact protocol versions, retry one record, reload, and sign in again.
6. Record and undo an allowed recent date; prove malformed, future, and out-of-window
   dates fail generically without creating rows.
7. Remove a practiced current block, prove its history remains and new recording is
   denied, then undo the retained historical check-in.
8. With the second synthetic account, prove it cannot observe, count, target, record,
   or undo either first-account tower's history through routes or destination state.
9. Delete one synthetic tower and prove only its practice history cascades. Use local
   pgTAP, not a retained staging identifier, as the Auth-user cascade evidence unless
   the approved account-deletion operation is deliberately being exercised.
10. Verify authenticated, mutation, and `Set-Cookie` responses are private no-store
    through the public Cloudflare hostname and contain no private activity in logs or
    third-party requests.
11. Recheck `/`, `/api/health`, `/sign-in`, `/protocols`, protocol detail, anonymous
    tower denial, and accepted build metadata after the flow.

## Rollback review

- Application rollback disables the practice UI only to a revision that understands
  the forward-only schema and then verifies public plus private non-practice routes.
- Database changes use a reviewed compensating migration; do not drop or rewrite
  accepted practice rows as an application rollback shortcut.
- If the practice adapter is unavailable, existing towers and catalog use remain
  available through the scoped unavailable state.
- Preserve operational incident evidence without retaining private dates, IDs,
  membership, titles, tokens, cookies, email addresses, or provider bodies.

## Completion record

Record exact commands, pass counts, dependency versions, migration and pgTAP results,
browser projects, accepted commit, workflow and deployment URLs, feature-flag state,
two-user isolation evidence, cache/privacy verification, responsive review, rollback
review, and limitations in `docs/releases/milestone-4-validation.md` without copying
private activity or credentials.

Do not begin outcomes, analytics, notifications, AI, public signup, production DNS,
payments, MCP, or Milestone 5 as part of this gate.
