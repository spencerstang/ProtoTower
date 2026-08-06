# Milestone 4 scope: private practice check-ins

Status: Approved; implementation has not begun

## Outcome

Milestone 4 lets an invited ProtoTower alpha user record that they practiced one
exact protocol version in one private tower on a chosen calendar date, undo that
check-in, and review a bounded recent history for the tower.

This completes the first trustworthy product loop from browsing, understanding, and
choosing a protocol to privately recording practice. It does not measure health,
claim effectiveness, score adherence, or infer an outcome. Public catalog browsing,
authentication, personal towers, and application liveness continue to work when the
practice-history dependency is unavailable.

## Product boundary

### In scope

- Private practice check-ins for authenticated, invited alpha users
- One check-in for one tower, exact protocol identity and version, and calendar date
- Recording today or a recent past date within a reviewed bounded correction window
- Idempotent record and undo actions
- A bounded recent-history view inside each private tower
- Exact immutable protocol-version retention in historical check-ins
- History retention when a protocol block is removed from the current tower
- History deletion when its owning tower or Auth account is deleted
- Provider-neutral practice-date, check-in, query-bound, and mutation rules in
  `@protostack/tracking-engine`
- Forward-only schema, constraints, grants, forced RLS, indexes, and narrowly
  reviewed mutation RPCs
- Accessible empty, recorded, corrected, unavailable, stale-membership, and denied
  states
- Local and protected-staging acceptance with synthetic users and activity only
- Updated architecture, threat-model, operations, dependency, and release
  documentation

### Explicitly out of scope

- Symptoms, biometrics, measurements, diagnoses, treatments, or health outcomes
- Effectiveness, compliance, adherence percentage, readiness, or risk scores
- Streaks, badges, leaderboards, penalties, or other pressure mechanics
- Notes, journals, reasons, mood, free text, attachments, or user-defined metrics
- Automatic tracking, device data, wearables, HealthKit, Google Fit, or imports
- Reminders, scheduled notifications, or non-authentication email
- Aggregate analytics, cohort reporting, experimentation, or cross-user comparison
- AI recommendations, personalization, coaching, summarization, or model execution
- Protocol authoring, editing, moderation, or publishing UI
- Sharing, collaboration, public profiles, feeds, follows, or social discovery
- Public registration, production-domain cutover, payments, or MCP
- Self-service account export or deletion; the invite-only alpha retains the
  documented operator-assisted account lifecycle

## User journey

1. An invited user signs in and opens a private tower.
2. Each current protocol block offers an accessible `Practiced` action for an
   explicitly shown calendar date.
3. The server treats the tower, protocol, version, date, and action as untrusted,
   verifies the session, and delegates validation to the domain and data boundaries.
4. Recording is idempotent: retrying the same action does not create a duplicate.
5. The tower shows a bounded recent-history list with the protocol label, exact
   pinned version, and calendar date.
6. The user may undo their own check-in. Undo remains available even if the protocol
   block has since been removed from the current tower.
7. Removing a protocol block does not rewrite prior history. Deleting the tower or
   account deletes all owned practice history.

## Product, privacy, and safety rules

- A practice check-in means only that the user chose to record an action. It does
  not prove completion, technique, benefit, consistency, or medical suitability.
- Practice dates and membership are private behavioral data. Never place them in
  logs, analytics, screenshots, fixtures, prompts, email, or rendered content for a
  different user.
- Development, tests, seeds, and protected-staging evidence use synthetic users,
  dates, towers, and protocol content only.
- A new check-in is allowed only when the caller owns the tower and the exact
  protocol identity/version is a current member at mutation time.
- Historical rows retain the exact immutable protocol version even after current
  membership is removed. Retired catalog content renders through the existing
  content-free unavailable treatment.
- The correction window and recent-history range are constants owned by the domain
  package and bounded again in PostgreSQL. Dates outside the accepted range fail
  generically and do not disclose membership.
- Duplicate record requests are idempotent. Undoing a missing owned check-in is also
  idempotent.
- The caller never supplies or controls an owner identifier. Ownership derives from
  the verified session and `auth.uid()`.
- Direct writes remain denied. Mutations use authenticated, same-origin `POST`
  actions and fixed-search-path RPCs.
- Authenticated practice responses are private and non-cacheable. Public landing,
  health, and catalog routes remain independent from practice storage.

## Implementation slices

1. Replace the disabled generic tracking placeholder with exact provider-neutral
   practice-check-in values, repository contracts, bounds, and unit tests.
2. Add the forward-only check-in schema, composite ownership constraints, indexes,
   forced RLS, minimal grants, bounded RPCs, deletion cascades, generated types, and
   pgTAP proofs.
3. Add the user-scoped PostgREST adapter at the web edge with strict `unknown`
   response parsing, redaction, typed unavailable results, and no new provider SDK.
4. Add accessible record, undo, and recent-history experiences to the private tower
   route while keeping routes and React components thin.
5. Enable `protocolTracking` only after the implementation, privacy, and security
   review is complete; keep `outcomes`, notifications, analytics, AI, and MCP off.
6. Complete unit, migration, pgTAP, browser, accessibility, security, performance,
   outage, and protected-staging verification.

## Acceptance criteria

1. An authenticated synthetic user can record one current tower protocol version
   for an accepted date and see it after reload and a new sign-in.
2. Repeating a record or undo request is idempotent and cannot create duplicate or
   negative state.
3. New records outside the reviewed date window, for future dates, malformed dates,
   absent towers, removed membership, or mismatched versions fail without disclosing
   which protected value was invalid.
4. Removing a current block preserves its existing practice history and permits the
   owner to undo that history; it does not permit new check-ins for the removed block.
5. Deleting a tower or Auth user cascades all owned practice history. Deleting one
   tower cannot affect another tower's history.
6. Anonymous callers cannot read or mutate practice rows. User A cannot observe,
   count, target, record, or undo User B's check-ins through tables, RPCs, routes,
   identifiers, cache replay, or malformed input.
7. Direct authenticated table writes are denied. Reviewed RPCs derive ownership
   from `auth.uid()`, use no dynamic SQL, and return only bounded mutation results.
8. Every provider response is parsed from `unknown`; errors, logs, HTML, screenshots,
   traces, and build artifacts contain no private practice data or credentials.
9. Authenticated responses and responses that set cookies remain private no-store
   through the Cloudflare/OpenNext path.
10. A practice-storage outage produces a scoped private unavailable state without
    breaking `/`, `/api/health`, sign-in, `/protocols`, or protocol detail routes.
11. Keyboard and assistive-technology users can record, undo, navigate history, and
    understand errors without relying on color, drag-and-drop, or pointer-only UI.
12. `pnpm verify`, the production dependency audit, Supabase reset/lint/pgTAP, and
    every Playwright project pass from a clean checkout.
13. Protected staging deploys the exact accepted SHA and completes a two-user
    synthetic check-in, persistence, removal-history, undo, cascade, isolation,
    caching, rollback, and public-route verification without retaining private data.

## Later decisions

Milestone 4 does not authorize real-user tracking or a public production launch.
Before collecting practice history from real users, the owner must separately approve
the privacy notice, retention and deletion policy, account export/deletion behavior,
production backup/restore and incident response, abuse controls, and production
domain deployment. Outcomes, correlations, reminders, analytics, and AI each require
their own later scope and threat-model review.
