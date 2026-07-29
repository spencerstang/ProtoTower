# ADR: Provider-neutral optional integrations

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

AI, analytics, email, payment, and notification providers are optional adapters. The core application must operate when they are missing or unavailable.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
