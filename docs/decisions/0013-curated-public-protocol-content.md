# ADR 0013: Curated public protocol content

- Status: Accepted
- Date: 2026-08-23

## Context

ProtoTower's catalog originally contained synthetic demonstration routines only. The
product now needs reviewed, source-backed educational protocols while preserving the
existing synthetic-only boundary for development seeds and all user-related data.

## Decision

- Store reviewed public catalog content in forward-only migrations so production and
  non-production schemas receive the same immutable published versions without loading
  seed fixtures.
- Keep development seeds synthetic. Curated content must contain no account, customer,
  patient, tracking, or other user data.
- Attribute expert recommendations explicitly and keep them separate from an
  independent evidence tier and evidence summary.
- Require HTTPS source links, explicit uncertainty, cautions, tracking suggestions,
  and a verification date in each curated version.
- Correct published content only by adding a higher immutable version. Never mutate a
  published row.

## Consequences

Public catalog content is intentionally world-readable and may be copied. Its presence
does not create a medical-content approval system or prove clinical efficacy. Content
review and production deployment remain separate approval gates.
