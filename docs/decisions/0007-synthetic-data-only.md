# ADR: Synthetic development data only

- Status: Accepted
- Date: 2026-07-28

## Context

ProtoStack needs a production foundation that remains maintainable, portable, and safe before product features are introduced.

## Decision

Development, tests, seeds, screenshots, and prompts may use only synthetic data. Production data is never copied into lower environments.

## Consequences

Future changes that conflict with this decision require a superseding ADR and migration plan.
