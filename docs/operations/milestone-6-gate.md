# Milestone 6 systems beta validation gate

Status: Accepted by the owner on 2026-08-28; implementation in progress

Staging compatibility note: on 2026-08-29, the owner approved deleting practice
check-ins tied exclusively to the four retired synthetic catalog identifiers. Migration
`20260816000000_retire_synthetic_practice_data.sql` records only the aggregate deletion
count before removing those obsolete references. It does not target production content,
accounts, towers, pseudonyms, or curated protocols.

## Scope and evidence

- [x] Owner accepts `docs/product/milestone-6-systems-beta-validation.md`.
- [x] Cohort definitions and metric thresholds are frozen before recruitment.
- [ ] Every included feature maps to the primary product hypothesis.
- [ ] Explicit exclusions remain disabled.
- [ ] Validation uses synthetic technical evidence and redacted aggregate product data.

## Product and trust design

- [ ] Systems-over-goals language and four-domain model are reviewed.
- [ ] Pseudonym normalization, suggestions, reserved names, editing, and privacy are approved.
- [ ] Original and modified protocol provenance plus revision behavior are approved.
- [ ] Success definition, timeframe, tracking, review, and optional-goal semantics are approved.
- [ ] Agent grants, scopes, proposals, approval, revocation, cursors, and audit traces are approved.
- [ ] Product-event allowlist, retention, deletion, and disable procedures are approved.
- [ ] Subscription price, checkout, cancellation, refunds, and support flow are approved.
- [ ] Sensitive-domain, FTC health-data, payment, privacy, export, and deletion review is complete.

## Automated verification

- [x] Fresh database reset applies the account-profile migration and generated types match.
- [x] Account-profile RLS, direct-write denial, concurrency, revisions, cascades, and
      two-user isolation pass locally.
- [ ] Agent scope, idempotency, approval, replay, revocation, and audit contract tests pass.
- [ ] Product-event tests prove private content and identifiers are never emitted.
- [ ] Payment tests prove subscription state cannot authorize access to another user's data.
- [x] Formatting, repository, dependency, secret, lint, strict type, unit, and build gates
      pass for the account-navigation and pseudonym slice.
- [ ] Browser, accessibility, security-header, cache, outage, and performance gates pass.

## Protected staging acceptance

- [ ] Signed-in navigation shows pseudonymous account control and no sign-in action.
- [ ] Pseudonym accept, regenerate, custom entry, edit, export, and deletion paths pass.
- [ ] A system can be created without a goal, deadline, score, or tracking requirement.
- [ ] Four-question setup, base protocol, added stack, original protocol, private
      modification, review, and revision pass.
- [ ] Catalog source identities and exact published versions remain unchanged.
- [ ] A scoped agent reads one system, proposes a change, and cannot mutate before approval.
- [ ] Approval applies once, retries are safe, stale revisions fail, and revocation blocks access.
- [ ] Product measurement contains only allowlisted redacted events.
- [ ] Founding-plan checkout and cancellation work without exposing private system content.
- [ ] Two isolated accounts cannot observe or affect one another through any new route or feed.

## Commercial validation

- [ ] 20–30 target-user interviews are completed and summarized without private content.
- [ ] At least 10 design partners report a recurring problem ProtoTower addresses.
- [ ] At least 50 accounts activate in the defined cohort.
- [ ] Activation, time-to-value, week-four retention, review, agent/export, conversion,
      paid retention, support cost, and managed-AI cost are calculated from frozen definitions.
- [ ] At least 10 users pay without bundled individual consulting during the milestone.
- [ ] A six-month follow-up records whether at least 50 paying users were reached.
- [ ] Churned, retained, paying, and agent-connected users are interviewed separately.

## Decision and release

- [ ] No unresolved trust, isolation, deletion, agent-authorization, or payment defect remains.
- [ ] Exact accepted commit deploys through protected staging and production gates.
- [ ] Redacted validation record reports exact results, costs, incidents, and limitations.
- [ ] Owner records a continue, revise, or stop decision before the next milestone begins.
