# ADR: Private protocol practice check-ins

- Status: Accepted for Milestone 4
- Date: 2026-08-06

## Context

Milestone 3 lets an invited user arrange exact published protocol versions into
private goal towers, but the product stops before the user can record practice. A
generic tracking event stream would be flexible but would also invite unreviewed
payloads, accidental health-data collection, weak query bounds, and later semantic
drift. Outcomes, automatic sensing, analytics, and AI would multiply those risks
before ProtoTower has validated its basic practice loop.

Practice history is private behavioral data. It requires the same owner isolation,
redaction, cache control, and deletion discipline as towers, plus exact rules for
dates, duplicates, removed membership, and immutable protocol versions.

## Decision

- Implement only a narrowly typed private practice check-in, not a generic event
  platform.
- Represent one check-in as one owner-derived tower, exact protocol identity/version,
  and bounded calendar date. Store no note, score, measurement, outcome, or arbitrary
  payload.
- Put provider-neutral values, bounds, parsers, mutation results, and repository
  contracts in `@protostack/tracking-engine`.
- Reuse the existing user-scoped Supabase/PostgREST edge. Add no provider SDK, ORM,
  queue, analytics client, notification client, or AI dependency.
- Preserve historical check-ins when current tower membership is removed. Require
  current exact membership for a new record, but allow the owner to undo existing
  history after removal.
- Make record and undo idempotent. Enforce one row per owner, tower, protocol,
  version, and practice date.
- Derive ownership only from the verified session and `auth.uid()`. Deny direct
  writes and expose one fixed-search-path, authenticated mutation RPC with no owner
  parameter.
- Force RLS, bound reads and dates, cascade tower/account deletion, keep responses
  private no-store, and redact all practice data from operational output.
- Keep the milestone invite-only and synthetic in protected staging. Public signup,
  production launch, outcomes, analytics, notifications, AI, and MCP remain disabled.

## Consequences

The milestone completes a useful practice loop without claiming that a check-in is
adherence or health improvement. Exact version retention makes historical records
understandable after the catalog or current tower changes.

The deliberate shape is less flexible than a generic event store. Adding duration,
quantity, symptoms, outcomes, automatic device data, reminders, or aggregate analysis
requires a new decision and data review rather than silently extending an `unknown`
payload.

Retaining history after membership removal means the schema cannot depend on the
mutable tower-item row. It must instead prove owner/tower alignment and pin the
immutable protocol-version key. Forward-only migrations and deletion cascades become
part of the acceptance gate.

Operator-assisted account deletion remains acceptable only for this synthetic,
invite-only alpha. Real-user collection or production launch remains blocked on
separately approved privacy, retention, export/deletion, backup/restore, incident
response, abuse-control, and domain decisions.
