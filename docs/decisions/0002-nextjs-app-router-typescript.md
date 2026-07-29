# ADR: Next.js App Router and strict TypeScript

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Use the App Router and strict compiler settings. External values begin as unknown and are validated before use.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
